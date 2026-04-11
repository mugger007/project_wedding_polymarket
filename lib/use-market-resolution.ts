"use client";

import { useEffect, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { Market } from "@/types";

export interface ResolutionNotification {
  kind: "win" | "loss";
  marketId: string;
  marketQuestion: string;
  winningOutcome: string;
  realizedPnL: number;
}

function isSeen(userId: string, marketId: string) {
  if (typeof window === "undefined") {
    return false;
  }
  return window.localStorage.getItem(`congrats_seen:${userId}:${marketId}`) === "1";
}

function markSeen(userId: string, marketId: string) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(`congrats_seen:${userId}:${marketId}`, "1");
}

/**
 * Hook to detect market resolution and trigger congrats modal.
 * Subscribes to market realtime changes and checks if current user won.
 * Returns pending congrats data for modal display.
 */
export function useMarketResolutionNotifications(userId: string | null) {
  const [notificationQueue, setNotificationQueue] = useState<ResolutionNotification[]>([]);
  const holdingsCache = useRef<Record<string, Record<string, number>>>({});

  const enqueueNotification = (next: ResolutionNotification) => {
    setNotificationQueue((prev) => {
      if (prev.some((item) => item.marketId === next.marketId)) {
        return prev;
      }
      return [...prev, next];
    });
  };

  useEffect(() => {
    if (!userId) {
      return;
    }

    try {
      const supabase = getSupabaseBrowserClient();

      const maybeShowResolutionNotice = async (
        marketId: string,
        winningShares: number,
        totalOpenShares: number,
        marketFromEvent?: Partial<Market>,
      ) => {
        if ((winningShares <= 0 && totalOpenShares <= 0) || isSeen(userId, marketId)) {
          return;
        }

        let marketQuestion = marketFromEvent?.question;
        let winningOutcomeIds = Array.isArray(marketFromEvent?.winning_outcome_ids)
          ? (marketFromEvent?.winning_outcome_ids ?? [])
          : [];
        let outcomes = Array.isArray(marketFromEvent?.outcomes)
          ? (marketFromEvent?.outcomes as Array<{ id: string; label: string }>)
          : [];

        if (!marketQuestion || winningOutcomeIds.length === 0 || outcomes.length === 0) {
          const { data: marketData } = await supabase
            .from("markets")
            .select("id, question, outcomes, winning_outcome_ids")
            .eq("id", marketId)
            .single();

          const typedMarketData = marketData as {
            id: string;
            question: string;
            outcomes: Array<{ id: string; label: string }>;
            winning_outcome_ids: string[] | null;
          } | null;

          if (!typedMarketData || !typedMarketData.winning_outcome_ids || typedMarketData.winning_outcome_ids.length === 0) {
            return;
          }

          marketQuestion = typedMarketData.question;
          winningOutcomeIds = typedMarketData.winning_outcome_ids;
          outcomes = typedMarketData.outcomes || [];
        }

        // Get labels for all winning outcomes
        const winningOutcomeLabel = winningOutcomeIds
          .map((id) => outcomes.find((o) => o.id === id)?.label || id)
          .join(", ");

        const { data: txRows } = await supabase
          .from("transactions")
          .select("type, amount_ecy")
          .eq("user_id", userId)
          .eq("market_id", marketId);

        const typedTxRows = (txRows ?? []) as Array<{
          type: "buy" | "sell";
          amount_ecy: number;
        }>;
        const spent = typedTxRows
          .filter((tx) => tx.type === "buy")
          .reduce((sum, tx) => sum + Number(tx.amount_ecy), 0);
        const receivedFromSells = typedTxRows
          .filter((tx) => tx.type === "sell")
          .reduce((sum, tx) => sum + Number(tx.amount_ecy), 0);
        // Use the computed winning shares passed into this function.
        // holdingsCache can be cleared right after resolution, which would undercount payout.
        const realizedPnL = receivedFromSells + Number(winningShares) - spent;

        markSeen(userId, marketId);
        if (winningShares > 0) {
          enqueueNotification({
            kind: "win",
            marketId,
            marketQuestion: marketQuestion || "Resolved Market",
            winningOutcome: winningOutcomeLabel,
            realizedPnL,
          });
          return;
        }

        enqueueNotification({
          kind: "loss",
          marketId,
          marketQuestion: marketQuestion || "Resolved Market",
          winningOutcome: winningOutcomeLabel,
          realizedPnL,
        });
      };

      const bootstrap = async () => {
        const { data: holdingsData } = await supabase
          .from("user_holdings")
          .select("market_id, outcome_id, shares")
          .eq("user_id", userId)
          .gt("shares", 0);

        const typedHoldings = (holdingsData ?? []) as Array<{
          market_id: string;
          outcome_id: string;
          shares: number;
        }>;

        for (const row of typedHoldings) {
          const marketId = row.market_id;
          const outcomeId = row.outcome_id;
          const shares = Number(row.shares);
          if (!holdingsCache.current[marketId]) {
            holdingsCache.current[marketId] = {};
          }
          holdingsCache.current[marketId][outcomeId] = shares;
        }

        const { data: resolvedMarkets } = await supabase
          .from("markets")
          .select("id, question, outcomes, winning_outcome_ids, created_at")
          .eq("resolved", true)
          .not("winning_outcome_ids", "is", null)
          .order("created_at", { ascending: false })
          .limit(25);

        const typedResolvedMarkets = (resolvedMarkets ?? []) as Array<{
          id: string;
          question: string;
          outcomes: Array<{ id: string; label: string }>;
          winning_outcome_ids: string[] | null;
          created_at: string;
        }>;

        const marketIds = typedResolvedMarkets.map((m) => m.id);
        if (marketIds.length === 0) {
          return;
        }

        const { data: txData } = await supabase
          .from("transactions")
          .select("market_id, outcome_id, type, shares")
          .eq("user_id", userId)
          .in("market_id", marketIds);

        const typedTxData = (txData ?? []) as Array<{
          market_id: string;
          outcome_id: string;
          type: "buy" | "sell";
          shares: number;
        }>;

        const netSharesByMarket = new Map<string, Map<string, number>>();
        for (const tx of typedTxData) {
          const marketId = tx.market_id;
          const outcomeId = tx.outcome_id;
          const signedShares = (tx.type === "buy" ? 1 : -1) * Number(tx.shares);
          const byOutcome = netSharesByMarket.get(marketId) ?? new Map<string, number>();
          byOutcome.set(outcomeId, (byOutcome.get(outcomeId) ?? 0) + signedShares);
          netSharesByMarket.set(marketId, byOutcome);
        }

        for (const market of typedResolvedMarkets) {
          const marketId = market.id;
          const winningOutcomeIds = market.winning_outcome_ids || [];
          const exposureByOutcome = netSharesByMarket.get(marketId) ?? new Map<string, number>();
          const winningShares = Math.max(
            0,
            winningOutcomeIds.reduce((sum, id) => sum + (exposureByOutcome.get(id) ?? 0), 0),
          );
          const totalOpenShares = Array.from(exposureByOutcome.values()).reduce(
            (sum, shares) => sum + Math.max(0, shares),
            0,
          );

          if ((winningShares > 0 || totalOpenShares > 0) && !isSeen(userId, marketId)) {
            await maybeShowResolutionNotice(marketId, winningShares, totalOpenShares, {
              question: market.question,
              outcomes: market.outcomes || [],
              winning_outcome_ids: winningOutcomeIds,
            });
          }
        }
      };

      void bootstrap();

      // Subscribe to user_holdings changes to cache current holdings
      const holdingsSubscription = supabase
        .channel("user_holdings_cache")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "user_holdings", filter: `user_id=eq.${userId}` },
          (payload) => {
            if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
              const data = payload.new as { market_id: string; outcome_id: string; shares: number };
              if (!holdingsCache.current[data.market_id]) {
                holdingsCache.current[data.market_id] = {};
              }
              holdingsCache.current[data.market_id][data.outcome_id] = Number(data.shares);
            } else if (payload.eventType === "DELETE") {
              const data = payload.old as { market_id: string; outcome_id: string; shares: number };
              if (holdingsCache.current[data.market_id]) {
                delete holdingsCache.current[data.market_id][data.outcome_id];
              }
            }
          }
        )
        .subscribe();

      // Subscribe to market changes to detect resolution
      const marketsSubscription = supabase
        .channel("markets_resolution")
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "markets" },
          async (payload) => {
            const market = payload.new as Market;

            // Check if market was just resolved
            if (market.resolved && market.winning_outcome_ids && market.winning_outcome_ids.length > 0) {
              const userHoldings = holdingsCache.current[market.id] || {};
              const winningShares = market.winning_outcome_ids.reduce(
                (sum, id) => sum + (userHoldings[id] ?? 0),
                0,
              );
              const totalOpenShares = Object.values(userHoldings).reduce(
                (sum, shares) => sum + Math.max(0, Number(shares)),
                0,
              );

              // If user had open shares in this market, show result modal.
              if (totalOpenShares > 0) {
                await maybeShowResolutionNotice(
                  market.id,
                  winningShares,
                  totalOpenShares,
                  market,
                );
                delete holdingsCache.current[market.id];
              }
            }
          }
        )
        .subscribe();

      return () => {
        holdingsSubscription.unsubscribe();
        marketsSubscription.unsubscribe();
      };
    } catch (error) {
      console.error("Failed to set up realtime subscriptions:", error);
      return undefined;
    }
  }, [userId]);

  const clearCongrats = () => {
    setNotificationQueue((prev) => prev.slice(1));
  };

  const pendingNotice = notificationQueue[0] ?? null;

  return { pendingNotice, clearNotice: clearCongrats };
}
