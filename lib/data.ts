import "server-only";

/*
 * Server-side data access and aggregation helpers for markets, holdings, and leaderboard views.
 */

import { createSupabaseAdmin } from "@/lib/supabase";
import { getProbabilityMap, type CpmmPoolInput } from "@/lib/cpmm";
import type {
  LeaderboardRow,
  Market,
  MarketPool,
  MarketWithStats,
  Outcome,
  Transaction,
  UserHolding,
} from "@/types";

// Parses JSON outcomes into strict {id,label} objects and drops malformed entries.
function parseOutcomes(raw: unknown): Outcome[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }
      const id = String((item as { id?: unknown }).id ?? "");
      const label = String((item as { label?: unknown }).label ?? "");
      if (!id || !label) {
        return null;
      }
      return { id, label };
    })
    .filter((item): item is Outcome => item !== null);
}

  // Loads markets and composes pools, probabilities, and traded volume statistics.
export async function getMarkets(includeResolved = false): Promise<MarketWithStats[]> {
  const supabase = createSupabaseAdmin();
  let query = supabase
    .from("markets")
    .select("id, question, type, outcomes, resolved, winning_outcome_id, created_at")
    .order("created_at", { ascending: false });

  if (!includeResolved) {
    query = query.eq("resolved", false);
  }

  const { data: marketsData, error: marketsError } = await query;
  if (marketsError) {
    throw new Error(marketsError.message);
  }

  const markets = (marketsData ?? []).map((m) => ({
    ...m,
    outcomes: parseOutcomes(m.outcomes),
  })) as Market[];

  if (markets.length === 0) {
    return [];
  }

  const marketIds = markets.map((m) => m.id);

  const [{ data: poolsData, error: poolsError }, { data: txData, error: txError }] =
    await Promise.all([
      supabase
        .from("market_pools")
        .select("market_id, outcome_id, shares_outstanding, liquidity_parameter")
        .in("market_id", marketIds),
      supabase
        .from("transactions")
        .select("id, user_id, market_id, outcome_id, type, amount_ecy, shares, price, timestamp")
        .in("market_id", marketIds),
    ]);

  if (poolsError) {
    throw new Error(poolsError.message);
  }
  if (txError) {
    throw new Error(txError.message);
  }

  const poolsByMarket = new Map<string, MarketPool[]>();
  for (const row of poolsData ?? []) {
    const parsed: MarketPool = {
      market_id: row.market_id,
      outcome_id: row.outcome_id,
      shares_outstanding: Number(row.shares_outstanding),
      liquidity_parameter: Number(row.liquidity_parameter),
    };

    const existing = poolsByMarket.get(parsed.market_id) || [];
    existing.push(parsed);
    poolsByMarket.set(parsed.market_id, existing);
  }

  const volumeByMarket = new Map<string, number>();
  for (const tx of (txData ?? []) as Transaction[]) {
    const current = volumeByMarket.get(tx.market_id) || 0;
    volumeByMarket.set(tx.market_id, current + Number(tx.amount_ecy));
  }

  return markets.map((market) => {
    const pools = poolsByMarket.get(market.id) || [];
    const cpmmPools: CpmmPoolInput[] = pools.map((pool) => ({
      outcomeId: pool.outcome_id,
      shares: pool.shares_outstanding,
      liquidity: pool.liquidity_parameter,
    }));

    return {
      ...market,
      pools,
      probabilities: getProbabilityMap(cpmmPools),
      totalVolume: volumeByMarket.get(market.id) || 0,
    };
  });
}

// Fetches one market by id from the cached market list projection.
export async function getMarketById(marketId: string): Promise<MarketWithStats | null> {
  const all = await getMarkets(true);
  return all.find((m) => m.id === marketId) || null;
}

// Returns non-zero holdings for a specific user.
export async function getUserHoldings(userId: string): Promise<UserHolding[]> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("user_holdings")
    .select("user_id, market_id, outcome_id, shares")
    .eq("user_id", userId)
    .gt("shares", 0);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    user_id: row.user_id,
    market_id: row.market_id,
    outcome_id: row.outcome_id,
    shares: Number(row.shares),
  }));
}

// Builds a sorted leaderboard from balances plus unrealized market value.
export async function getLeaderboard(): Promise<LeaderboardRow[]> {
  const supabase = createSupabaseAdmin();
  const [{ data: usersData, error: usersError }, markets, holdings] = await Promise.all([
    supabase.from("users").select("id, username, balance"),
    getMarkets(true),
    supabase.from("user_holdings").select("user_id, market_id, outcome_id, shares").gt("shares", 0),
  ]);

  if (usersError) {
    throw new Error(usersError.message);
  }
  if (holdings.error) {
    throw new Error(holdings.error.message);
  }

  const marketMap = new Map(markets.map((m) => [m.id, m]));

  const unrealizedByUser = new Map<string, number>();
  for (const holding of holdings.data ?? []) {
    const market = marketMap.get(holding.market_id);
    if (!market || market.resolved) {
      continue;
    }

    const prob = market.probabilities[holding.outcome_id] ?? 0;
    const currentValue = Number(holding.shares) * prob;
    const prev = unrealizedByUser.get(holding.user_id) || 0;
    unrealizedByUser.set(holding.user_id, prev + currentValue);
  }

  return (usersData ?? [])
    .map((row) => {
      const balance = Number(row.balance);
      const unrealizedValue = unrealizedByUser.get(row.id) || 0;
      return {
        userId: row.id,
        username: row.username,
        balance,
        unrealizedValue,
        totalPnL: balance + unrealizedValue - 1000,
      };
    })
    .sort((a, b) => b.balance + b.unrealizedValue - (a.balance + a.unrealizedValue));
}
