"use server";

/*
 * Server action for resolving a market and triggering winner payouts.
 */

import { revalidateTag } from "next/cache";
import { createSupabaseAdmin } from "@/lib/supabase";
import { requireUser } from "@/lib/auth";
import { leaderboardTag, marketTag, marketsListTag, holdingsTag } from "@/lib/cache-tags";

// Requires admin authentication and calls the payout RPC for a resolved market.
// Supports resolving with one or more winning outcomes (for multi-outcome markets).
export async function resolveMarketAction(input: {
  marketId: string;
  winningOutcomeIds: string[];
}) {
  await requireUser();

  if (!input.winningOutcomeIds || input.winningOutcomeIds.length === 0) {
    return {
      ok: false,
      message: "At least one winning outcome must be selected.",
    };
  }

  const supabase = createSupabaseAdmin();
  const [{ data: marketData }, { data: exposureData }, { data: txData }] = await Promise.all([
    supabase
      .from("markets")
      .select("question, outcomes")
      .eq("id", input.marketId)
      .maybeSingle(),
    supabase
      .from("user_holdings")
      .select("user_id, outcome_id, shares")
      .eq("market_id", input.marketId)
      .gt("shares", 0),
    supabase
      .from("transactions")
      .select("user_id, type, amount_ecy")
      .eq("market_id", input.marketId),
  ]);

  const { data, error } = await supabase.rpc("resolve_market_and_payout", {
    p_market_id: input.marketId,
    p_winning_outcome_ids: input.winningOutcomeIds,
  });

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  // Targeted cache invalidation per winner
  const row = data?.[0] as { updated_users?: number; total_payout?: number; winner_user_ids?: string[] } | undefined;
  const winnerIds = (row?.winner_user_ids || []) as string[];

  const outcomes = Array.isArray(marketData?.outcomes)
    ? (marketData?.outcomes as Array<{ id: string; label: string }>)
    : [];
  const winningOutcomeLabel = input.winningOutcomeIds
    .map((id) => outcomes.find((outcome) => outcome.id === id)?.label ?? id)
    .join(", ");

  const txByUser = new Map<string, { spent: number; receivedFromSells: number }>();
  for (const tx of (txData ?? []) as Array<{ user_id: string; type: "buy" | "sell"; amount_ecy: number }>) {
    const current = txByUser.get(tx.user_id) ?? { spent: 0, receivedFromSells: 0 };
    if (tx.type === "buy") {
      current.spent += Number(tx.amount_ecy);
    } else {
      current.receivedFromSells += Number(tx.amount_ecy);
    }
    txByUser.set(tx.user_id, current);
  }

  const exposureByUser = new Map<string, { totalOpenShares: number; winningShares: number }>();
  for (const holding of (exposureData ?? []) as Array<{ user_id: string; outcome_id: string; shares: number }>) {
    const current = exposureByUser.get(holding.user_id) ?? { totalOpenShares: 0, winningShares: 0 };
    const shares = Number(holding.shares);
    current.totalOpenShares += Math.max(0, shares);
    if (input.winningOutcomeIds.includes(holding.outcome_id)) {
      current.winningShares += Math.max(0, shares);
    }
    exposureByUser.set(holding.user_id, current);
  }

  const notifications = Array.from(exposureByUser.entries())
    .filter(([, value]) => value.totalOpenShares > 0)
    .map(([userId, value]) => {
      const tx = txByUser.get(userId) ?? { spent: 0, receivedFromSells: 0 };
      return {
        user_id: userId,
        market_id: input.marketId,
        kind: value.winningShares > 0 ? "win" : "loss",
        market_question: String(marketData?.question ?? "Resolved Market"),
        winning_outcome: winningOutcomeLabel,
        realized_pnl: tx.receivedFromSells + value.winningShares - tx.spent,
      };
    });

  if (notifications.length > 0) {
    await supabase
      .from("market_resolution_notifications")
      .upsert(notifications, { onConflict: "user_id,market_id" });
  }

  const impactedUserIds = new Set<string>([
    ...winnerIds,
    ...notifications.map((item) => item.user_id),
  ]);

  for (const userId of impactedUserIds) {
    revalidateTag(holdingsTag(userId));
  }

  revalidateTag(marketTag(input.marketId));
  revalidateTag(marketsListTag(false));
  revalidateTag(marketsListTag(true));
  revalidateTag(leaderboardTag);

  return {
    ok: true,
    message: `Market resolved. Paid out ${Number(row?.total_payout ?? 0).toFixed(2)} ECY to ${Number(row?.updated_users ?? 0)} winners.`,
    winnerUserIds: winnerIds,
  };
}
