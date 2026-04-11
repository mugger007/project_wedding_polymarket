"use client";

import { useMarketResolutionNotifications } from "@/lib/use-market-resolution";
import { CongratsModal } from "@/components/congrats-modal";

/**
 * Layout client wrapper that manages global UI state including congrats modal.
 * Shows modal when market is resolved and current user won.
 */
export function LayoutClientWrapper({ children }: { children: React.ReactNode }) {
  const { pendingCongrats, clearCongrats, isLoggedIn } = useMarketResolutionNotifications();

  return (
    <>
      {children}
      {isLoggedIn && pendingCongrats && (
        <CongratsModal
          isOpen={!!pendingCongrats}
          marketQuestion={pendingCongrats.marketQuestion}
          winningOutcome={pendingCongrats.winningOutcome}
          payout={pendingCongrats.payout}
          onClose={clearCongrats}
        />
      )}
    </>
  );
}
