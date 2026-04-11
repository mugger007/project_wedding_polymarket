"use client";

import { useEffect, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { Market } from "@/types";

interface PendingCongrats {
  marketId: string;
  marketQuestion: string;
  winningOutcome: string;
  payout: number;
}

/**
 * Hook to detect market resolution and trigger congrats modal.
 * Subscribes to market realtime changes and checks if current user won.
 * Returns pending congrats data for modal display.
 */
export function useMarketResolutionNotifications() {
  const [pendingCongrats, setPendingCongrats] = useState<PendingCongrats | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const holdingsCache = useRef<Record<string, Record<string, number>>>({});

  // Initialize user session
  useEffect(() => {
    const initSession = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user?.id) {
          setUserId(session.user.id);
          setIsLoggedIn(true);
        } else {
          setIsLoggedIn(false);
        }
      } catch (error) {
        console.error("Failed to initialize session:", error);
        setIsLoggedIn(false);
      }
    };

    initSession();

    // Listen for auth state changes
    try {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, session) => {
        if (session?.user?.id) {
          setUserId(session.user.id);
          setIsLoggedIn(true);
        } else {
          setUserId(null);
          setIsLoggedIn(false);
        }
      });

      return () => {
        subscription?.unsubscribe();
      };
    } catch (error) {
      console.error("Failed to set up auth listener:", error);
      return undefined;
    }
  }, []);

  useEffect(() => {
    if (!userId) return;

    try {
      const supabase = getSupabaseBrowserClient();

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
            if (market.resolved && market.winning_outcome_id) {
              const userHoldings = holdingsCache.current[market.id] || {};
              const winningShares = userHoldings[market.winning_outcome_id] ?? 0;

              // If user had shares in the winning outcome, show congrats
              if (winningShares > 0) {
                // Fetch market details and winning outcome label
                const { data: marketData } = await supabase
                  .from("markets")
                  .select("question, outcomes")
                  .eq("id", market.id)
                  .single();

                if (marketData) {
                  const typedMarketData = marketData as { question: string; outcomes: Array<{ id: string; label: string }> };
                  const outcomes = typedMarketData.outcomes || [];
                  const winningOutcomeLabel =
                    outcomes.find((o) => o.id === market.winning_outcome_id)?.label || market.winning_outcome_id;

                  setPendingCongrats({
                    marketId: market.id,
                    marketQuestion: typedMarketData.question,
                    winningOutcome: winningOutcomeLabel,
                    payout: winningShares,
                  });

                  // Clear holdings cache for this market after showing congrats
                  delete holdingsCache.current[market.id];
                }
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
    setPendingCongrats(null);
  };

  return { pendingCongrats, clearCongrats, isLoggedIn };
}
