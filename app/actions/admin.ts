"use server";

/*
 * Server action for resolving a market and triggering winner payouts.
 */

import { revalidatePath } from "next/cache";
import { getEnv } from "@/lib/env";
import { hasAdminSession } from "@/lib/session";
import { createSupabaseAdmin } from "@/lib/supabase";
import { requireUser } from "@/lib/auth";

// Requires admin authentication and calls the payout RPC for a resolved market.
export async function resolveMarketAction(input: {
  marketId: string;
  winningOutcomeId: string;
  adminPassword: string;
}) {
  await requireUser();

  const isAdminSession = await hasAdminSession();
  if (!isAdminSession && input.adminPassword !== getEnv().adminPassword) {
    return {
      ok: false,
      message: "Admin authentication required.",
    };
  }

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase.rpc("resolve_market_and_payout", {
    p_market_id: input.marketId,
    p_winning_outcome_id: input.winningOutcomeId,
  });

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  revalidatePath("/");
  revalidatePath(`/`);
  revalidatePath("/admin");
  revalidatePath("/portfolio");

  const row = data?.[0] as { updated_users?: number; total_payout?: number } | undefined;

  return {
    ok: true,
    message: `Market resolved. Paid out ${Number(row?.total_payout ?? 0).toFixed(2)} ECY to ${Number(row?.updated_users ?? 0)} winners.`,
  };
}
