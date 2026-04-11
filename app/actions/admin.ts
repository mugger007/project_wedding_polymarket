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
  
  for (const userId of winnerIds) {
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
