import "server-only";

/*
 * Server-side data access and aggregation helpers for markets, holdings, and leaderboard views.
 */

import { unstable_cache } from "next/cache";
import { createSupabaseAdmin } from "@/lib/supabase";
import { holdingsTag, leaderboardTag, marketTag, marketsListTag } from "@/lib/cache-tags";
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

export interface ResolvedMarketResult {
  marketId: string;
  marketQuestion: string;
  winningOutcomeLabel: string;
  spent: number;
  receivedFromSells: number;
  payout: number;
  realizedPnL: number;
}

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
  const run = unstable_cache(
    async () => {
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
    },
    ["markets-list", includeResolved ? "all" : "active"],
    {
      tags: [marketsListTag(includeResolved)],
      revalidate: 30,
    },
  );

  return run();
}

// Fetches one market by id from the cached market list projection.
export async function getMarketById(marketId: string): Promise<MarketWithStats | null> {
  const run = unstable_cache(
    async () => {
      const supabase = createSupabaseAdmin();
      const { data: marketData, error: marketError } = await supabase
        .from("markets")
        .select("id, question, type, outcomes, resolved, winning_outcome_id, created_at")
        .eq("id", marketId)
        .maybeSingle();

      if (marketError) {
        throw new Error(marketError.message);
      }

      if (!marketData) {
        return null;
      }

      const market: Market = {
        ...marketData,
        outcomes: parseOutcomes(marketData.outcomes),
      } as Market;

      const [{ data: poolsData, error: poolsError }, { data: txData, error: txError }] =
        await Promise.all([
          supabase
            .from("market_pools")
            .select("market_id, outcome_id, shares_outstanding, liquidity_parameter")
            .eq("market_id", marketId),
          supabase
            .from("transactions")
            .select("amount_ecy")
            .eq("market_id", marketId),
        ]);

      if (poolsError) {
        throw new Error(poolsError.message);
      }
      if (txError) {
        throw new Error(txError.message);
      }

      const pools: MarketPool[] = (poolsData ?? []).map((row) => ({
        market_id: row.market_id,
        outcome_id: row.outcome_id,
        shares_outstanding: Number(row.shares_outstanding),
        liquidity_parameter: Number(row.liquidity_parameter),
      }));

      const cpmmPools: CpmmPoolInput[] = pools.map((pool) => ({
        outcomeId: pool.outcome_id,
        shares: pool.shares_outstanding,
        liquidity: pool.liquidity_parameter,
      }));

      const totalVolume = (txData ?? []).reduce(
        (sum, tx) => sum + Number((tx as { amount_ecy: number }).amount_ecy),
        0,
      );

      return {
        ...market,
        pools,
        probabilities: getProbabilityMap(cpmmPools),
        totalVolume,
      };
    },
    ["market-by-id", marketId],
    {
      tags: [marketTag(marketId)],
      revalidate: 30,
    },
  );

  return run();
}

// Returns non-zero holdings for a specific user.
export async function getUserHoldings(userId: string): Promise<UserHolding[]> {
  const run = unstable_cache(
    async () => {
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
    },
    ["user-holdings", userId],
    {
      tags: [holdingsTag(userId)],
      revalidate: 15,
    },
  );

  return run();
}

// Reconstructs realized P/L for resolved markets from historical transactions.
export async function getUserResolvedMarketResults(
  userId: string,
): Promise<ResolvedMarketResult[]> {
  const run = unstable_cache(
    async () => {
      const supabase = createSupabaseAdmin();
      const { data: txData, error: txError } = await supabase
        .from("transactions")
        .select("market_id, outcome_id, type, amount_ecy, shares")
        .eq("user_id", userId);

      if (txError) {
        throw new Error(txError.message);
      }

      const transactions = (txData ?? []) as Array<{
        market_id: string;
        outcome_id: string;
        type: "buy" | "sell";
        amount_ecy: number;
        shares: number;
      }>;

      if (transactions.length === 0) {
        return [];
      }

      const marketIds = Array.from(new Set(transactions.map((tx) => tx.market_id)));
      const { data: marketsData, error: marketsError } = await supabase
        .from("markets")
        .select("id, question, outcomes, winning_outcome_id, created_at")
        .in("id", marketIds)
        .eq("resolved", true)
        .not("winning_outcome_id", "is", null);

      if (marketsError) {
        throw new Error(marketsError.message);
      }

      const resolvedMarkets =
        (marketsData ?? []).map((m) => ({
          id: m.id,
          question: m.question,
          outcomes: parseOutcomes(m.outcomes),
          winning_outcome_id: String(m.winning_outcome_id ?? ""),
          created_at: m.created_at,
        })) ?? [];

      if (resolvedMarkets.length === 0) {
        return [];
      }

      const resolvedMap = new Map(resolvedMarkets.map((market) => [market.id, market]));
      const grouped = new Map<
        string,
        {
          spent: number;
          receivedFromSells: number;
          netSharesByOutcome: Map<string, number>;
        }
      >();

      for (const tx of transactions) {
        if (!resolvedMap.has(tx.market_id)) {
          continue;
        }

        const current = grouped.get(tx.market_id) ?? {
          spent: 0,
          receivedFromSells: 0,
          netSharesByOutcome: new Map<string, number>(),
        };

        const currentShares = current.netSharesByOutcome.get(tx.outcome_id) ?? 0;
        if (tx.type === "buy") {
          current.spent += Number(tx.amount_ecy);
          current.netSharesByOutcome.set(tx.outcome_id, currentShares + Number(tx.shares));
        } else {
          current.receivedFromSells += Number(tx.amount_ecy);
          current.netSharesByOutcome.set(tx.outcome_id, currentShares - Number(tx.shares));
        }

        grouped.set(tx.market_id, current);
      }

      return Array.from(grouped.entries())
        .map(([marketId, value]) => {
          const market = resolvedMap.get(marketId);
          if (!market || !market.winning_outcome_id) {
            return null;
          }

          const payout = Math.max(0, value.netSharesByOutcome.get(market.winning_outcome_id) ?? 0);
          const realizedPnL = value.receivedFromSells + payout - value.spent;
          const winningOutcomeLabel =
            market.outcomes.find((outcome) => outcome.id === market.winning_outcome_id)?.label ??
            market.winning_outcome_id;

          return {
            marketId,
            marketQuestion: market.question,
            winningOutcomeLabel,
            spent: value.spent,
            receivedFromSells: value.receivedFromSells,
            payout,
            realizedPnL,
            createdAt: market.created_at,
          };
        })
        .filter(
          (item): item is ResolvedMarketResult & { createdAt: string } => item !== null,
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map(({ createdAt, ...row }) => {
          void createdAt;
          return row;
        });
    },
    ["user-resolved-market-results", userId],
    {
      tags: [holdingsTag(userId), marketsListTag(true)],
      revalidate: 15,
    },
  );

  return run();
}

// Builds a sorted leaderboard from balances plus unrealized market value.
export async function getLeaderboard(): Promise<LeaderboardRow[]> {
  const run = unstable_cache(
    async () => {
      const supabase = createSupabaseAdmin();
      const { data, error } = await supabase.rpc("get_leaderboard_snapshot");

      if (error) {
        throw new Error(error.message);
      }

      return (data ?? []).map((row: unknown) => {
        const typed = row as {
          user_id: string;
          username: string;
          balance: number;
          unrealized_value: number;
          total_pnl: number;
        };

        return {
          userId: typed.user_id,
          username: typed.username,
          balance: Number(typed.balance),
          unrealizedValue: Number(typed.unrealized_value),
          totalPnL: Number(typed.total_pnl),
        };
      });
    },
    ["leaderboard"],
    {
      tags: [leaderboardTag],
      revalidate: 10,
    },
  );

  return run();
}
