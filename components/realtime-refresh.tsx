"use client";

/*
 * Realtime bridge that subscribes to Supabase table changes and refreshes the route.
 */

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

interface RealtimeRefreshProps {
  marketId?: string;
  userId?: string;
  watchAllUsers?: boolean;
  watchFaqs?: boolean;
}

// Batches multiple realtime events into a single router refresh burst.
export function RealtimeRefresh({ marketId, userId, watchAllUsers = false, watchFaqs = false }: RealtimeRefreshProps) {
  const router = useRouter();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const refreshDelayMs = 400;

  useEffect(() => {
    router.refresh();
    // Fallback: re-fetch every 15s so odds stay fresh even when realtime events are missed.
    const interval = setInterval(() => router.refresh(), 15_000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

    const channels: RealtimeChannel[] = [];

    const marketsChannel = supabase
      .channel("markets-live")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "markets",
          ...(marketId ? { filter: `id=eq.${marketId}` } : {}),
        },
        queueRefresh,
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "markets",
        },
        queueRefresh,
      )
      .subscribe();
    channels.push(marketsChannel);

    const poolsChannel = supabase
      .channel("market-pools-live")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "market_pools",
          ...(marketId ? { filter: `market_id=eq.${marketId}` } : {}),
        },
        queueRefresh,
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "market_pools",
          ...(marketId ? { filter: `market_id=eq.${marketId}` } : {}),
        },
        queueRefresh,
      )
      .subscribe();
    channels.push(poolsChannel);

    if (userId) {
      const holdingsChannel = supabase
        .channel("holdings-live")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "user_holdings",
            filter: `user_id=eq.${userId}`,
          },
          queueRefresh,
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "user_holdings",
            filter: `user_id=eq.${userId}`,
          },
          queueRefresh,
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "user_holdings",
            filter: `user_id=eq.${userId}`,
          },
          queueRefresh,
        )
        .subscribe();
      channels.push(holdingsChannel);
    }

    if (watchAllUsers || userId) {
      const usersChannel = supabase
        .channel("users-live")
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "users",
            ...(watchAllUsers ? {} : { filter: `id=eq.${userId}` }),
          },
          queueRefresh,
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "users",
            ...(watchAllUsers ? {} : { filter: `id=eq.${userId}` }),
          },
          queueRefresh,
        )
        .subscribe();
      channels.push(usersChannel);
    }

    if (watchFaqs) {
      const faqChannel = supabase
        .channel("faq-entries-live")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "how_to_play_faqs",
          },
          queueRefresh,
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "how_to_play_faqs",
          },
          queueRefresh,
        )
        .subscribe();
      channels.push(faqChannel);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      for (const channel of channels) {
        supabase.removeChannel(channel);
      }
    };
  }, [marketId, refreshDelayMs, router, userId, watchAllUsers, watchFaqs]);

  return null;
}
