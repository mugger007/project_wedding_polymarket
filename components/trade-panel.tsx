"use client";

/*
 * Trading widget with outcome cards and modal ticket for ECY-based buy/sell execution.
 */

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { buySharesAction, sellSharesAction } from "@/app/actions/trade";
import {
  estimateSharesFromBuyECY,
  estimateSharesFromSellECY,
  probabilityChangeFromStart,
  probabilityForOutcome,
  type CpmmPoolInput,
} from "@/lib/cpmm";
import { formatECY, formatPct, formatSignedPct } from "@/lib/format";
import type { MarketWithStats, UserHolding } from "@/types";

type TradeMode = "buy" | "sell";

interface TradePanelProps {
  market: MarketWithStats;
  holdings: UserHolding[];
}

const barColors = ["bg-emerald-400", "bg-rose-400", "bg-cyan-400", "bg-amber-400"];
const DEFAULT_SLIPPAGE_PCT = 2;

// Computes client-side trade previews and calls server actions for final execution.
export function TradePanel({ market, holdings }: TradePanelProps) {
  const router = useRouter();
  const [mode, setMode] = useState<TradeMode>("buy");
  const [selectedOutcomeId, setSelectedOutcomeId] = useState<string>(market.outcomes[0]?.id ?? "");
  const [amount, setAmount] = useState<string>("20");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [liveMessage, setLiveMessage] = useState("");
  const amountInputRef = useRef<HTMLInputElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const lastTriggerRef = useRef<HTMLButtonElement | null>(null);

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
  const slippageNumber = DEFAULT_SLIPPAGE_PCT;
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

  useEffect(() => {
    if (!isModalOpen) {
      lastTriggerRef.current?.focus();
      return;
    }
    amountInputRef.current?.focus();
  }, [isModalOpen]);

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const onModalKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      closeModal();
      return;
    }

    if (e.key !== "Tab") {
      return;
    }

    const container = modalRef.current;
    if (!container) {
      return;
    }

    const focusables = container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
    );
    if (focusables.length === 0) {
      return;
    }

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;

    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
      return;
    }

    if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  // Opens the modal ticket for a chosen outcome and side.
  const openTicket = (outcomeId: string, nextMode: TradeMode, trigger: HTMLButtonElement) => {
    lastTriggerRef.current = trigger;
    setSelectedOutcomeId(outcomeId);
    setMode(nextMode);
    setIsModalOpen(true);
  };

  // Submits the trade with slippage bounds derived from the client-side estimate.
  const onSubmit = () => {
    if (!selectedOutcomeId || amountNumber <= 0 || !Number.isFinite(amountNumber)) {
      toast.error("Enter a valid amount.");
      setLiveMessage("Error: Enter a valid amount.");
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
          setLiveMessage(`Success: ${result.message}`);
          setIsModalOpen(false);
          router.refresh();
        } else {
          toast.error(result.message);
          setLiveMessage(`Error: ${result.message}`);
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
        setLiveMessage(`Success: ${result.message}`);
        setIsModalOpen(false);
        router.refresh();
      } else {
        toast.error(result.message);
        setLiveMessage(`Error: ${result.message}`);
      }
    });
  };

  return (
    <>
      <p className="sr-only" role="status" aria-live="polite">
        {liveMessage}
      </p>
      <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Buy or Sell</h2>
          {market.resolved && (
            <span className="inline-block rounded-full bg-amber-400/20 px-3 py-1 text-xs font-semibold text-amber-300">
              Resolved
            </span>
          )}
        </div>
        <div className="space-y-3">
          {market.outcomes.map((outcome, idx) => {
            // For resolved markets, winning outcome shows 100%, others show 0%
            const isWinner = market.winning_outcome_id === outcome.id;
            const displayProb = market.resolved ? (isWinner ? 1 : 0) : (market.probabilities[outcome.id] ?? 0);
            const delta = probabilityChangeFromStart(cpmmPools, outcome.id);
            const heldShares = holdingsMap.get(outcome.id) ?? 0;
            
            return (
              <div key={outcome.id} className={`rounded-xl border border-white/10 p-3 ${
                market.resolved 
                  ? isWinner ? "bg-emerald-950/40 border-emerald-400/30" : "bg-slate-950/70 border-slate-700"
                  : "bg-slate-950/70"
              }`}>
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-100">{outcome.label}</p>
                    {market.resolved && isWinner && (
                      <span className="text-sm">✓</span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className={`block text-sm font-semibold ${
                      market.resolved
                        ? isWinner ? "text-emerald-300" : "text-slate-400"
                        : "text-white"
                    }`}>
                      {formatPct(displayProb)}
                    </span>
                    {!market.resolved && (
                      <span className={`text-[11px] font-medium ${delta > 0 ? "text-emerald-300" : delta < 0 ? "text-rose-300" : "text-slate-400"}`}>
                        {delta > 0 ? "▲" : delta < 0 ? "▼" : "•"} {formatSignedPct(delta)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className={`h-full transition-all duration-300 ${
                      market.resolved
                        ? isWinner ? "bg-emerald-400" : "bg-slate-700"
                        : barColors[idx % barColors.length]
                    }`}
                    style={{ width: `${Math.max(2, displayProb * 100)}%` }}
                  />
                </div>
                {market.resolved ? (
                  <p className={`text-xs ${heldShares > 0 ? "text-emerald-300" : "text-slate-400"}`}>
                    {heldShares > 0 
                      ? `✓ You held ${heldShares.toFixed(3)} shares${isWinner ? " (winner)" : ""}` 
                      : "You did not hold shares in this outcome"}
                  </p>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={(e) => openTicket(outcome.id, "buy", e.currentTarget)}
                        className="rounded-lg bg-emerald-400 px-3 py-2.5 text-sm font-semibold text-slate-900 transition hover:brightness-110"
                      >
                        Buy
                      </button>
                      <button
                        type="button"
                        onClick={(e) => openTicket(outcome.id, "sell", e.currentTarget)}
                        className="rounded-lg bg-rose-400 px-3 py-2.5 text-sm font-semibold text-slate-900 transition hover:brightness-110"
                      >
                        Sell
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">You hold {heldShares.toFixed(3)} shares</p>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {isModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 p-2 sm:items-center sm:p-3"
        >
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="trade-modal-title"
            onKeyDown={onModalKeyDown}
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 p-3 shadow-2xl sm:max-w-md sm:p-4"
          >
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h3 id="trade-modal-title" className="text-base font-semibold text-white sm:text-lg">
                {mode === "buy" ? "Buy" : "Sell"} {selectedOutcome?.label}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                aria-label="Close trade modal"
                className="self-end rounded-md border border-white/10 px-3 py-2 text-sm text-slate-200"
              >
                Close
              </button>
            </div>

            <label htmlFor="trade-amount" className="mb-1 block text-xs uppercase tracking-wide text-slate-400">
              Amount (ECY)
            </label>
            <input
              id="trade-amount"
              ref={amountInputRef}
              type="number"
              min="1"
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mb-3 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white"
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
              <p className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200" role="alert">
                Warning: this trade has notable price impact ({slippageImpact.toFixed(2)}%).
              </p>
            ) : null}

            <button
              type="button"
              disabled={isPending || previewShares <= 0 || !Number.isFinite(previewShares)}
              onClick={onSubmit}
              className={`w-full rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 ${mode === "buy" ? "bg-emerald-400" : "bg-rose-400"}`}
            >
              <span className="inline-flex items-center justify-center gap-2">
                {isPending ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-900/30 border-t-slate-950" /> : null}
                {isPending
                  ? "Placing trade..."
                  : `${mode === "buy" ? "Buy" : "Sell"} for ${formatECY(amountNumber)}`}
              </span>
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
