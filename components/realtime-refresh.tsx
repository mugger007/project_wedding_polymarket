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
}

// Batches multiple realtime events into a single router refresh burst.
export function RealtimeRefresh({ marketId, userId }: RealtimeRefreshProps) {
  const router = useRouter();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowser();

    const queueRefresh = () => {
      if (timerRef.current) {
        return;
      }
      timerRef.current = setTimeout(() => {
        router.refresh();
        timerRef.current = null;
      }, 250);
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
    ];

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      for (const channel of channels) {
        supabase.removeChannel(channel);
      }
    };
  }, [marketId, router, userId]);

  return null;
}
