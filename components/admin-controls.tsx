"use client";

/*
 * Admin control surface for selecting markets, picking winners, and running resolution payouts.
 */

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { resolveMarketAction } from "@/app/actions/admin";
import type { MarketWithStats } from "@/types";

interface AdminControlsProps {
  unresolvedMarkets: MarketWithStats[];
}

// Manages market resolution form state and dispatches the resolve server action.
export function AdminControls({ unresolvedMarkets }: AdminControlsProps) {
  const [selectedMarketId, setSelectedMarketId] = useState<string>(unresolvedMarkets[0]?.id ?? "");
  const [selectedOutcomeId, setSelectedOutcomeId] = useState<string>(
    unresolvedMarkets[0]?.outcomes[0]?.id ?? "",
  );
  const [isPending, startTransition] = useTransition();

  const selectedMarket = useMemo(
    () => unresolvedMarkets.find((m) => m.id === selectedMarketId),
    [selectedMarketId, unresolvedMarkets],
  );

  // Keeps winning outcome selection in sync when admin switches to another market.
  const onMarketChange = (marketId: string) => {
    setSelectedMarketId(marketId);
    const market = unresolvedMarkets.find((m) => m.id === marketId);
    setSelectedOutcomeId(market?.outcomes[0]?.id ?? "");
  };

  // Validates the current form and executes market resolution.
  const onResolve = () => {
    if (!selectedMarketId || !selectedOutcomeId) {
      toast.error("Select market and winning outcome.");
      return;
    }

    startTransition(async () => {
      const result = await resolveMarketAction({
        marketId: selectedMarketId,
        winningOutcomeId: selectedOutcomeId,
      });

      if (result.ok) {
        toast.success(result.message);
        return;
      }

      toast.error(result.message);
    });
  };

  if (unresolvedMarkets.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-slate-300">
        All markets are already resolved.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
      <h2 className="mb-3 text-lg font-semibold text-white">Resolve Market</h2>

      <label htmlFor="admin-market" className="mb-1 block text-sm uppercase tracking-wide text-slate-300">
        Market
      </label>
      <select
        id="admin-market"
        value={selectedMarketId}
        onChange={(e) => onMarketChange(e.target.value)}
        className="mb-3 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white"
      >
        {unresolvedMarkets.map((market) => (
          <option key={market.id} value={market.id}>
            {market.question}
          </option>
        ))}
      </select>

      <label htmlFor="admin-winning-outcome" className="mb-1 block text-sm uppercase tracking-wide text-slate-300">
        Winning outcome
      </label>
      <select
        id="admin-winning-outcome"
        value={selectedOutcomeId}
        onChange={(e) => setSelectedOutcomeId(e.target.value)}
        className="mb-3 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white"
      >
        {(selectedMarket?.outcomes ?? []).map((outcome) => (
          <option key={outcome.id} value={outcome.id}>
            {outcome.label}
          </option>
        ))}
      </select>

      <button
        type="button"
        disabled={isPending}
        onClick={onResolve}
        className="w-full rounded-xl bg-gradient-to-r from-violet-400 to-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Resolving..." : "Resolve and Payout"}
      </button>
    </div>
  );
}
