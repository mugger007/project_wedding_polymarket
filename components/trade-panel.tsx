"use client";

/*
 * Trading widget with outcome cards and modal ticket for ECY-based buy/sell execution.
 */

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { buySharesAction, sellSharesAction } from "@/app/actions/trade";
import {
  estimateSharesFromBuyECY,
  estimateSharesFromSellECY,
  probabilityForOutcome,
  type CpmmPoolInput,
} from "@/lib/cpmm";
import { formatECY, formatPct } from "@/lib/format";
import type { MarketWithStats, UserHolding } from "@/types";

type TradeMode = "buy" | "sell";

interface TradePanelProps {
  market: MarketWithStats;
  holdings: UserHolding[];
}

const barColors = ["bg-emerald-400", "bg-violet-400", "bg-cyan-400", "bg-amber-400"];

// Computes client-side trade previews and calls server actions for final execution.
export function TradePanel({ market, holdings }: TradePanelProps) {
  const router = useRouter();
  const [mode, setMode] = useState<TradeMode>("buy");
  const [selectedOutcomeId, setSelectedOutcomeId] = useState<string>(market.outcomes[0]?.id ?? "");
  const [amount, setAmount] = useState<string>("20");
  const [slippage, setSlippage] = useState<string>("2");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const cpmmPools = useMemo<CpmmPoolInput[]>(
    () =>
      market.pools.map((pool) => ({
        outcomeId: pool.outcome_id,
        shares: Number(pool.shares_outstanding),
        liquidity: Number(pool.liquidity_parameter),
      })),
    [market.pools],
  );

  const holdingsMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const h of holdings) {
      map.set(h.outcome_id, Number(h.shares));
    }
    return map;
  }, [holdings]);

  const amountNumber = Number(amount);
  const slippageNumber = Number(slippage);
  const currentProb = probabilityForOutcome(cpmmPools, selectedOutcomeId);

  const previewShares =
    mode === "buy"
      ? estimateSharesFromBuyECY(cpmmPools, selectedOutcomeId, amountNumber)
      : estimateSharesFromSellECY(
          cpmmPools,
          selectedOutcomeId,
          amountNumber,
          holdingsMap.get(selectedOutcomeId) ?? 0,
        );

  const avgPrice = previewShares > 0 ? amountNumber / previewShares : 0;
  const slippageImpact = currentProb > 0 ? ((avgPrice - currentProb) / currentProb) * 100 : 0;

  const selectedOutcome = market.outcomes.find((outcome) => outcome.id === selectedOutcomeId);

  // Opens the modal ticket for a chosen outcome and side.
  const openTicket = (outcomeId: string, nextMode: TradeMode) => {
    setSelectedOutcomeId(outcomeId);
    setMode(nextMode);
    setIsModalOpen(true);
  };

  // Submits the trade with slippage bounds derived from the client-side estimate.
  const onSubmit = () => {
    if (!selectedOutcomeId || amountNumber <= 0 || !Number.isFinite(amountNumber)) {
      toast.error("Enter a valid amount.");
      return;
    }

    startTransition(async () => {
      if (mode === "buy") {
        const minShares = Math.max(0, previewShares * (1 - slippageNumber / 100));
        const result = await buySharesAction({
          marketId: market.id,
          outcomeId: selectedOutcomeId,
          amountECY: amountNumber,
          expectedMinShares: minShares,
          slippagePct: slippageNumber,
        });

        if (result.ok) {
          toast.success(result.message);
          setIsModalOpen(false);
          router.refresh();
        } else {
          toast.error(result.message);
        }
        return;
      }

      const maxShares = previewShares * (1 + slippageNumber / 100);
      const result = await sellSharesAction({
        marketId: market.id,
        outcomeId: selectedOutcomeId,
        amountECY: amountNumber,
        expectedMaxShares: maxShares,
        slippagePct: slippageNumber,
      });

      if (result.ok) {
        toast.success(result.message);
        setIsModalOpen(false);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <>
      <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4">
        <h2 className="mb-3 text-lg font-semibold text-white">Buy or Sell</h2>
        <div className="space-y-3">
          {market.outcomes.map((outcome, idx) => {
            const prob = market.probabilities[outcome.id] ?? 0;
            const heldShares = holdingsMap.get(outcome.id) ?? 0;
            return (
              <div key={outcome.id} className="rounded-xl border border-white/10 bg-slate-950/70 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-100">{outcome.label}</p>
                  <span className="text-sm font-semibold text-white">{formatPct(prob)}</span>
                </div>
                <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className={`h-full ${barColors[idx % barColors.length]}`}
                    style={{ width: `${Math.max(2, prob * 100)}%` }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => openTicket(outcome.id, "buy")}
                    className="rounded-lg bg-emerald-400 px-3 py-2 text-sm font-semibold text-slate-900 transition hover:brightness-110"
                  >
                    Buy
                  </button>
                  <button
                    type="button"
                    onClick={() => openTicket(outcome.id, "sell")}
                    className="rounded-lg bg-violet-400 px-3 py-2 text-sm font-semibold text-slate-900 transition hover:brightness-110"
                  >
                    Sell
                  </button>
                </div>
                <p className="mt-2 text-xs text-slate-400">You hold {heldShares.toFixed(3)} shares</p>
              </div>
            );
          })}
        </div>
      </div>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 p-2 sm:items-center sm:p-3">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 p-3 shadow-2xl sm:max-w-md sm:p-4">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-base font-semibold text-white sm:text-lg">
                {mode === "buy" ? "Buy" : "Sell"} {selectedOutcome?.label}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="self-end rounded-md border border-white/10 px-2 py-1 text-xs text-slate-300"
              >
                Close
              </button>
            </div>

            <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Amount (ECY)</label>
            <input
              type="number"
              min="1"
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mb-3 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white"
            />

            <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Slippage tolerance %</label>
            <input
              type="number"
              min="0"
              max="50"
              step="0.5"
              value={slippage}
              onChange={(e) => setSlippage(e.target.value)}
              className="mb-4 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white"
            />

            <div className="mb-4 space-y-1 rounded-xl border border-white/10 bg-slate-950/80 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Current probability</span>
                <span className="font-medium text-slate-100">{formatPct(currentProb)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Estimated shares</span>
                <span className="font-medium text-slate-100">{previewShares.toFixed(3)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Avg entry/exit price</span>
                <span className="font-medium text-slate-100">{formatECY(avgPrice)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">You currently hold</span>
                <span className="font-medium text-slate-100">
                  {(holdingsMap.get(selectedOutcomeId) ?? 0).toFixed(3)} shares
                </span>
              </div>
            </div>

            {Math.abs(slippageImpact) > 5 ? (
              <p className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                Warning: this trade has notable price impact ({slippageImpact.toFixed(2)}%).
              </p>
            ) : null}

            <button
              type="button"
              disabled={isPending || previewShares <= 0 || !Number.isFinite(previewShares)}
              onClick={onSubmit}
              className="w-full rounded-xl bg-gradient-to-r from-emerald-400 to-violet-500 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending
                ? "Placing trade..."
                : `${mode === "buy" ? "Buy" : "Sell"} for ${formatECY(amountNumber)}`}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
