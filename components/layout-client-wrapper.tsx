"use client";

import { useMarketResolutionNotifications } from "@/lib/use-market-resolution";
import { CongratsModal } from "@/components/congrats-modal";
import { ConsolationModal } from "@/components/consolation-modal";

/**
 * Layout client wrapper that manages global UI state including congrats modal.
 * Shows modal when market is resolved and current user won.
 */
export function LayoutClientWrapper({
  children,
  userId,
}: {
  children: React.ReactNode;
  userId: string | null;
}) {
  const { pendingNotice, clearNotice } = useMarketResolutionNotifications(userId);

  return (
    <>
      {children}
      {pendingNotice?.kind === "win" && (
        <CongratsModal
          isOpen={!!pendingNotice}
          marketQuestion={pendingNotice.marketQuestion}
          winningOutcome={pendingNotice.winningOutcome}
          realizedPnL={pendingNotice.realizedPnL}
          onClose={clearNotice}
        />
      )}
      {pendingNotice?.kind === "loss" && (
        <ConsolationModal
          isOpen={!!pendingNotice}
          marketQuestion={pendingNotice.marketQuestion}
          winningOutcome={pendingNotice.winningOutcome}
          realizedPnL={pendingNotice.realizedPnL}
          onClose={clearNotice}
        />
      )}
    </>
  );
}
