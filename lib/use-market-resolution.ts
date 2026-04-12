"use client";

import { useEffect, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export interface ResolutionNotification {
  notificationId: string;
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
  const supabaseRef = useRef<ReturnType<typeof getSupabaseBrowserClient> | null>(null);
  const userIdRef = useRef<string | null>(null);

  const enqueueNotification = (next: ResolutionNotification) => {
    setNotificationQueue((prev) => {
      if (prev.some((item) => item.notificationId === next.notificationId)) {
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
      const currentUserId = userId;
      supabaseRef.current = supabase;
      userIdRef.current = currentUserId;

      const toNotification = (row: {
        id: string;
        market_id: string;
        kind: "win" | "loss";
        market_question: string;
        winning_outcome: string;
        realized_pnl: number;
      }): ResolutionNotification => ({
        notificationId: row.id,
        kind: row.kind,
        marketId: row.market_id,
        marketQuestion: row.market_question,
        winningOutcome: row.winning_outcome,
        realizedPnL: Number(row.realized_pnl),
      });

      const hydrateNotifications = async () => {
        const { data } = await supabase
          .from("market_resolution_notifications")
          .select("id, market_id, kind, market_question, winning_outcome, realized_pnl, created_at")
          .eq("user_id", currentUserId)
          .order("created_at", { ascending: true })
          .limit(50);

        for (const row of (data ?? []) as Array<{
          id: string;
          market_id: string;
          kind: "win" | "loss";
          market_question: string;
          winning_outcome: string;
          realized_pnl: number;
        }>) {
          if (isSeen(currentUserId, row.market_id)) {
            continue;
          }
          enqueueNotification(toNotification(row));
        }
      };

      void hydrateNotifications();

      const notificationsSubscription = supabase
        .channel(`market_resolution_notifications:${currentUserId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "market_resolution_notifications",
          },
          (payload) => {
            const row = payload.new as {
              id: string;
              user_id: string;
              market_id: string;
              kind: "win" | "loss";
              market_question: string;
              winning_outcome: string;
              realized_pnl: number;
            };

            // Filter client-side by user_id
            if (row.user_id !== currentUserId) {
              console.log("[useMarketResolution] Skipping notification for different user:", row.user_id);
              return;
            }

            if (isSeen(currentUserId, row.market_id)) {
              console.log("[useMarketResolution] Notification already seen:", row.market_id);
              return;
            }

            console.log("[useMarketResolution] Enqueuing notification:", row);
            enqueueNotification(toNotification(row));
          },
        )
        .subscribe((status, err) => {
          console.log("[useMarketResolution] Subscription status:", status);
          if (err) {
            console.error("[useMarketResolution] Subscription error:", err);
          }
        });

      // Re-subscribe when page comes to foreground (mobile)
      const handleVisibilityChange = () => {
        if (document.hidden) {
          console.log("[useMarketResolution] Page hidden");
          return;
        }
        console.log("[useMarketResolution] Page visible, re-subscribing");
        notificationsSubscription.subscribe((status, err) => {
          console.log("[useMarketResolution] Re-subscription status:", status);
          if (err) {
            console.error("[useMarketResolution] Re-subscription error:", err);
          }
        });
      };

      document.addEventListener("visibilitychange", handleVisibilityChange);

      return () => {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        notificationsSubscription.unsubscribe();
      };
    } catch (error) {
      console.error("Failed to set up realtime subscriptions:", error);
      return undefined;
    }
  }, [userId]);

  const clearCongrats = () => {
    setNotificationQueue((prev) => {
      const next = [...prev];
      const first = next.shift();
      if (first && userIdRef.current) {
        markSeen(userIdRef.current, first.marketId);
      }
      return next;
    });
  };

  const pendingNotice = notificationQueue[0] ?? null;

  return { pendingNotice, clearNotice: clearCongrats };
}
