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
import { round6 } from "@/lib/cpmm";
import { formatECY, formatOddsMultiplier, formatSignedPct } from "@/lib/format";
import type { MarketWithStats, UserHolding } from "@/types";

type TradeMode = "buy" | "sell";

interface TradePanelProps {
  market: MarketWithStats;
  holdings: UserHolding[];
  userBalance: number;
}

// Computes client-side trade previews and calls server actions for final execution.
export function TradePanel({ market, holdings, userBalance }: TradePanelProps) {
  const router = useRouter();
  const [mode, setMode] = useState<TradeMode>("buy");
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
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
  const currentProb = probabilityForOutcome(cpmmPools, selectedOutcomeId);
  const selectedOutcome = market.outcomes.find((outcome) => outcome.id === selectedOutcomeId);

  useEffect(() => {
    const syncMode = () => {
      if (typeof window === "undefined") {
        return;
      }
      const saved = window.localStorage.getItem("advancedTradingMode") === "1";
      setIsAdvancedMode(saved);
      if (!saved) {
        setMode("buy");
      }
    };

    syncMode();
    window.addEventListener("storage", syncMode);
    window.addEventListener("advanced-mode-change", syncMode as EventListener);

    return () => {
      window.removeEventListener("storage", syncMode);
      window.removeEventListener("advanced-mode-change", syncMode as EventListener);
    };
  }, []);

  const visibleOutcomes = market.outcomes;

  const userSharesForOutcome = holdingsMap.get(selectedOutcomeId) ?? 0;
  const previewShares =
    mode === "buy"
      ? estimateSharesFromBuyECY(cpmmPools, selectedOutcomeId, amountNumber)
      : estimateSharesFromSellECY(cpmmPools, selectedOutcomeId, amountNumber, userSharesForOutcome);

  const avgPrice = previewShares > 0 ? amountNumber / previewShares : 0;
  const potentialPayout = mode === "buy" ? Math.max(0, previewShares) : Math.max(0, amountNumber);

  // Calculate max amount user can trade
  const maxAmount = useMemo(() => {
    if (mode === "buy") {
      // For buy: use user's current balance
      return Math.floor(userBalance * 100) / 100;
    } else {
      // For sell: calculate max ECY from selling all shares
      if (userSharesForOutcome <= 0) return 0;
      const target = cpmmPools.find((p) => p.outcomeId === selectedOutcomeId);
      if (!target) return 0;
      const totalShares = cpmmPools.reduce((sum, p) => sum + p.shares, 0);
      const n = cpmmPools.length;
      const A = target.shares + target.liquidity;
      const D0 = totalShares + n * target.liquidity;
      const sellProceeds = (d: number) => d + (A - D0) * Math.log(D0 / (D0 - d));
      return round6(sellProceeds(userSharesForOutcome));
    }
  }, [mode, cpmmPools, selectedOutcomeId, userSharesForOutcome, userBalance]);

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
        const result = await buySharesAction({
          marketId: market.id,
          outcomeId: selectedOutcomeId,
          amountECY: amountNumber,
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

      const result = await sellSharesAction({
        marketId: market.id,
        outcomeId: selectedOutcomeId,
        amountECY: amountNumber,
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
      <div className="rounded-2xl border-2 border-[#d1d5db] bg-white p-4 shadow-[0_4px_20px_rgba(0,0,0,0.1)]">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-black text-[#0a0a0a]">Trading</h2>
          {market.resolved && (
            <span className="inline-block rounded-full bg-[#f59e0b] px-3 py-1 text-xs font-extrabold text-[#0a0a0a]">
              Resolved
            </span>
          )}
        </div>

        <div className="space-y-3">
          {visibleOutcomes.map((outcome) => {
            // For resolved markets, winning outcome shows 100%, others show 0%
            const isWinner = market.resolved && (market.winning_outcome_ids?.includes(outcome.id) ?? false);
            const displayProb = market.resolved ? (isWinner ? 1 : 0) : (market.probabilities[outcome.id] ?? 0);
            const delta = probabilityChangeFromStart(cpmmPools, outcome.id);
            const heldShares = holdingsMap.get(outcome.id) ?? 0;
            const totalBuyers = market.outcomeBuyerCounts?.[outcome.id] ?? 0;
            const othersBought = Math.max(0, totalBuyers - (heldShares > 0 ? 1 : 0));
            
            return (
              <div key={outcome.id} className={`rounded-xl border-2 p-3 ${
                market.resolved 
                  ? isWinner ? "bg-[#dcfce7] border-[#00c853]" : "bg-[#fff1f2] border-[#ff1744]"
                    : "bg-[#f0f4ff] border-[#d1d5db]"
              }`}>
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-[#0a0a0a]">{outcome.label}</p>
                    {market.resolved && isWinner && (
                      <span className="text-sm">✓</span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className={`block text-sm font-semibold ${
                      market.resolved
                        ? isWinner ? "text-[#00c853]" : "text-[#ff1744]"
                        : "text-[#0a0a0a]"
                    }`}>
                      <span className={`rounded-full px-2 py-1 text-base font-extrabold text-white ${displayProb >= 0.5 ? "bg-[#00c853]" : "bg-[#ff1744]"}`}>
                        {formatOddsMultiplier(displayProb)}
                      </span>
                    </span>
                    {!market.resolved && (
                      <span className={`text-[11px] font-semibold ${delta > 0 ? "text-[#00c853]" : delta < 0 ? "text-[#ff1744]" : "text-[#374151]"}`}>
                        {delta > 0 ? "▲" : delta < 0 ? "▼" : "•"} {formatSignedPct(delta)}
                      </span>
                    )}
                  </div>
                </div>
                {market.resolved ? (
                  <p className={`text-xs font-semibold ${heldShares > 0 ? "text-[#00c853]" : "text-[#374151]"}`}>
                    {heldShares > 0 
                      ? `✓ You held ${heldShares.toFixed(3)} shares${isWinner ? " (winner)" : ""}` 
                      : "You did not hold shares in this outcome"}
                  </p>
                ) : (
                  <>
                    <div className={`grid gap-2 ${isAdvancedMode ? "grid-cols-2" : "grid-cols-1"}`}>
                      <button
                        type="button"
                        onClick={(e) => openTicket(outcome.id, "buy", e.currentTarget)}
                        className="rounded-xl bg-[#00c853] px-3 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(0,200,83,0.45)] transition hover:scale-[1.03] hover:bg-[#1fd868]"
                      >
                        Buy
                      </button>
                      {isAdvancedMode ? (
                        <button
                          type="button"
                          onClick={(e) => openTicket(outcome.id, "sell", e.currentTarget)}
                          className="rounded-xl bg-[#ff1744] px-3 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(255,23,68,0.45)] transition hover:scale-[1.03] hover:bg-[#ff3d63]"
                        >
                          Sell
                        </button>
                      ) : null}
                    </div>
                    <p className="mt-2 text-xs font-semibold text-[#374151]">
                      {othersBought} others have bought {outcome.label.toUpperCase()}
                    </p>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {isModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#2d0f7a]/35 px-2 py-2 sm:items-center sm:p-3"
        >
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="trade-modal-title"
            onKeyDown={onModalKeyDown}
            className="mt-2 w-full max-w-sm max-h-[calc(100dvh-1rem)] overflow-y-auto rounded-2xl border-2 border-[#d1d5db] bg-white p-3 shadow-[0_8px_30px_rgba(0,0,0,0.18)] sm:mt-0 sm:max-w-md sm:p-4"
          >
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h3 id="trade-modal-title" className="text-base font-black text-[#0a0a0a] sm:text-lg">
                {mode === "buy" ? "Buy" : "Sell"} {selectedOutcome?.label}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                aria-label="Close trade modal"
                className="self-end rounded-md border-2 border-[#6c3bff] px-3 py-2 text-sm font-semibold text-[#6c3bff] hover:bg-[#6c3bff] hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="mb-3 flex items-baseline justify-between gap-2">
              <label htmlFor="trade-amount" className="text-xs font-semibold uppercase tracking-wide text-[#374151]">
                Amount (ECY)
              </label>
              {maxAmount > 0 && (
                <button
                  type="button"
                  onClick={() => setAmount(String(Math.floor(maxAmount * 100) / 100))}
                  className="text-xs font-semibold text-[#6c3bff] hover:underline"
                >
                  Max: {formatECY(maxAmount)}
                </button>
              )}
            </div>
            <input
              id="trade-amount"
              ref={amountInputRef}
              type="number"
              min="1"
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mb-3 w-full rounded-xl border-2 border-[#d1d5db] bg-white px-3 py-2 text-sm text-[#0a0a0a]"
            />

            <div className="mb-4 space-y-1 rounded-xl border-2 border-[#d1d5db] bg-[#f0f4ff] p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#374151]">Current multiplier</span>
                <span className="text-base font-extrabold text-[#6c3bff]">{formatOddsMultiplier(currentProb)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#374151]">To Win</span>
                <span className="font-extrabold text-[#00c853]">{formatECY(potentialPayout)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#374151]">Avg. Price</span>
                <span className="font-semibold text-[#0a0a0a]">{formatECY(avgPrice)}</span>
              </div>
            </div>

            <button
              type="button"
              disabled={isPending || previewShares <= 0 || !Number.isFinite(previewShares)}
              onClick={onSubmit}
              className={`w-full rounded-xl px-4 py-3 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:bg-[#e5e7eb] disabled:text-[#9ca3af] disabled:shadow-none ${mode === "buy" ? "bg-[#00c853] shadow-[0_4px_14px_rgba(0,200,83,0.45)] hover:scale-[1.03] hover:bg-[#1fd868]" : "bg-[#ff1744] shadow-[0_4px_14px_rgba(255,23,68,0.45)] hover:scale-[1.03] hover:bg-[#ff3d63]"}`}
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
