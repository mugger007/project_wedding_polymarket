"use client";

/*
 * Admin control surface for selecting markets, picking winners, and running resolution payouts.
 * Supports single and multiple winning outcomes.
 */

import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { resolveMarketAction } from "@/app/actions/admin";
import type { MarketWithStats } from "@/types";

interface AdminControlsProps {
  unresolvedMarkets: MarketWithStats[];
}

// Manages market resolution form state and dispatches the resolve server action.
export function AdminControls({ unresolvedMarkets }: AdminControlsProps) {
  const [availableMarkets, setAvailableMarkets] = useState<MarketWithStats[]>(unresolvedMarkets);
  const [selectedMarketId, setSelectedMarketId] = useState<string>(unresolvedMarkets[0]?.id ?? "");
  const [selectedOutcomeIds, setSelectedOutcomeIds] = useState<Set<string>>(
    new Set([unresolvedMarkets[0]?.outcomes[0]?.id ?? ""]),
  );
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setAvailableMarkets(unresolvedMarkets);
  }, [unresolvedMarkets]);

  useEffect(() => {
    if (availableMarkets.length === 0) {
      setSelectedMarketId("");
      setSelectedOutcomeIds(new Set());
      return;
    }

    const selectedStillExists = availableMarkets.some((market) => market.id === selectedMarketId);
    if (!selectedStillExists) {
      const nextMarket = availableMarkets[0];
      setSelectedMarketId(nextMarket.id);
      setSelectedOutcomeIds(new Set([nextMarket.outcomes[0]?.id ?? ""]));
    }
  }, [availableMarkets, selectedMarketId]);

  const selectedMarket = useMemo(
    () => availableMarkets.find((m) => m.id === selectedMarketId),
    [selectedMarketId, availableMarkets],
  );

  // Keeps winning outcome selection in sync when admin switches to another market.
  const onMarketChange = (marketId: string) => {
    setSelectedMarketId(marketId);
    const market = availableMarkets.find((m) => m.id === marketId);
    setSelectedOutcomeIds(new Set([market?.outcomes[0]?.id ?? ""]));
  };

  // Toggle outcome selection (for multi-outcome resolution)
  const toggleOutcome = (outcomeId: string) => {
    const newSet = new Set(selectedOutcomeIds);
    if (newSet.has(outcomeId)) {
      newSet.delete(outcomeId);
    } else {
      newSet.add(outcomeId);
    }
    setSelectedOutcomeIds(newSet);
  };

  // Validates the current form and executes market resolution.
  const onResolve = () => {
    if (!selectedMarketId || selectedOutcomeIds.size === 0) {
      toast.error("Select market and at least one winning outcome.");
      return;
    }

    startTransition(async () => {
      const result = await resolveMarketAction({
        marketId: selectedMarketId,
        winningOutcomeIds: Array.from(selectedOutcomeIds),
      });

      if (result.ok) {
        setAvailableMarkets((prev) => prev.filter((market) => market.id !== selectedMarketId));
        toast.success(result.message);
        return;
      }

      toast.error(result.message);
    });
  };

  if (availableMarkets.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-slate-300">
        All markets are already resolved.
      </div>
    );
  }

  // Determine if this is a multi-outcome market (can have multiple winners)
  const isMultiOutcome = selectedMarket?.type === "multi";

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
        {availableMarkets.map((market) => (
          <option key={market.id} value={market.id}>
            {market.question}
          </option>
        ))}
      </select>

      <div className="mb-3">
        <label className="mb-2 block text-sm uppercase tracking-wide text-slate-300">
          {isMultiOutcome ? "Winning outcomes (select all that apply)" : "Winning outcome"}
        </label>

        {isMultiOutcome ? (
          // Checkboxes for multi-outcome markets
          <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-slate-950 p-3">
            {(selectedMarket?.outcomes ?? []).map((outcome) => (
              <label key={outcome.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedOutcomeIds.has(outcome.id)}
                  onChange={() => toggleOutcome(outcome.id)}
                  className="h-4 w-4 rounded border-white/30"
                />
                <span className="text-sm text-slate-100">{outcome.label}</span>
              </label>
            ))}
          </div>
        ) : (
          // Single select for binary/scalar markets
          <select
            value={Array.from(selectedOutcomeIds)[0] ?? ""}
            onChange={(e) => setSelectedOutcomeIds(new Set([e.target.value]))}
            className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white"
          >
            {(selectedMarket?.outcomes ?? []).map((outcome) => (
              <option key={outcome.id} value={outcome.id}>
                {outcome.label}
              </option>
            ))}
          </select>
        )}
      </div>

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
