"use server";

/*
 * Server actions for buy/sell execution backed by Supabase RPC and cache revalidation.
 */

import { revalidateTag } from "next/cache";
import { holdingsTag, leaderboardTag, marketTag, marketsListTag } from "@/lib/cache-tags";
import { requireUser } from "@/lib/auth";
import { createSupabaseAdmin } from "@/lib/supabase";
import type { TradeResult } from "@/types";

// Validates ECY amount input.
function validateAmount(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) {
    return "Amount must be a positive number.";
  }
  return null;
}

// Executes a buy trade server-side.
export async function buySharesAction(input: {
  marketId: string;
  outcomeId: string;
  amountECY: number;
}): Promise<TradeResult> {
  const user = await requireUser();
  const validationError = validateAmount(input.amountECY);
  if (validationError) {
    return { ok: false, message: validationError };
  }

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase.rpc("execute_buy", {
    p_user_id: user.id,
    p_market_id: input.marketId,
    p_outcome_id: input.outcomeId,
    p_amount_ecy: input.amountECY,
  });

  if (error || !data?.[0]) {
    return {
      ok: false,
      message: error?.message ?? "Trade failed.",
    };
  }

  const row = data[0];
  const shares = Number(row.shares_bought);

  revalidateTag(marketTag(input.marketId));
  revalidateTag(marketsListTag(false));
  revalidateTag(marketsListTag(true));
  revalidateTag(holdingsTag(user.id));
  revalidateTag(leaderboardTag);

  return {
    ok: true,
    message: `Bought for ${input.amountECY.toFixed(3)} ECY successfully.`,
    shares,
    avgPrice: Number(row.avg_price),
    newBalance: Number(row.new_balance),
    newProbability: Number(row.new_probability),
  };
}

// Executes a sell trade server-side.
export async function sellSharesAction(input: {
  marketId: string;
  outcomeId: string;
  amountECY: number;
}): Promise<TradeResult> {
  const user = await requireUser();
  const validationError = validateAmount(input.amountECY);
  if (validationError) {
    return { ok: false, message: validationError };
  }

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase.rpc("execute_sell", {
    p_user_id: user.id,
    p_market_id: input.marketId,
    p_outcome_id: input.outcomeId,
    p_amount_ecy: input.amountECY,
  });

  if (error || !data?.[0]) {
    return {
      ok: false,
      message: error?.message ?? "Trade failed.",
    };
  }

  const row = data[0];
  const shares = Number(row.shares_sold);

  revalidateTag(marketTag(input.marketId));
  revalidateTag(marketsListTag(false));
  revalidateTag(marketsListTag(true));
  revalidateTag(holdingsTag(user.id));
  revalidateTag(leaderboardTag);

  return {
    ok: true,
    message: `Sold for ${input.amountECY.toFixed(3)} ECY successfully.`,
    shares,
    avgPrice: Number(row.avg_price),
    newBalance: Number(row.new_balance),
    newProbability: Number(row.new_probability),
  };
}
