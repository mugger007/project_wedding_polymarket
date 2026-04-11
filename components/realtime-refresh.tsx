"use client";

/*
 * Realtime bridge that subscribes to Supabase table changes and refreshes the route.
 */

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

interface RealtimeRefreshProps {
  marketId?: string;
  userId?: string;
  watchAllUsers?: boolean;
}

// Batches multiple realtime events into a single router refresh burst.
export function RealtimeRefresh({ marketId, userId, watchAllUsers = false }: RealtimeRefreshProps) {
  const router = useRouter();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const refreshDelayMs = 400;

  useEffect(() => {
    const supabase = createSupabaseBrowser();

    const queueRefresh = () => {
      if (timerRef.current) {
        return;
      }
      timerRef.current = setTimeout(() => {
        router.refresh();
        timerRef.current = null;
      }, refreshDelayMs);
    };

    const channels = [
      supabase
        .channel("markets-live")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "markets",
            ...(marketId ? { filter: `id=eq.${marketId}` } : {}),
          },
          queueRefresh,
        )
        .subscribe(),
      supabase
        .channel("market-pools-live")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "market_pools",
            ...(marketId ? { filter: `market_id=eq.${marketId}` } : {}),
          },
          queueRefresh,
        )
        .subscribe(),
      supabase
        .channel("holdings-live")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "user_holdings",
            ...(userId ? { filter: `user_id=eq.${userId}` } : {}),
          },
          queueRefresh,
        )
        .subscribe(),
      supabase
        .channel("users-live")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "users",
            ...(watchAllUsers ? {} : userId ? { filter: `id=eq.${userId}` } : {}),
          },
          queueRefresh,
        )
        .subscribe(),
    ];

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      for (const channel of channels) {
        supabase.removeChannel(channel);
      }
    };
  }, [marketId, refreshDelayMs, router, userId, watchAllUsers]);

  return null;
}
