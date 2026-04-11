"use client";

import { useState } from "react";
import { formatECY } from "@/lib/format";

interface CongratsModalProps {
  isOpen: boolean;
  marketQuestion: string;
  winningOutcome: string;
  payout: number;
  onClose: () => void;
}

/**
 * Modal shown when user wins a resolved market.
 * Displays congratulations message, winning outcome, and payout amount.
 */
export function CongratsModal({
  isOpen,
  marketQuestion,
  winningOutcome,
  payout,
  onClose,
}: CongratsModalProps) {
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 150);
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-2 transition-opacity duration-150 ${
        isClosing ? "opacity-0" : "opacity-100"
      }`}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="congrats-title"
        className={`w-full max-w-sm rounded-2xl border border-emerald-400/30 bg-gradient-to-br from-slate-900 to-emerald-950/30 p-6 shadow-2xl transition-transform duration-150 ${
          isClosing ? "scale-95" : "scale-100"
        }`}
      >
        <div className="mb-4 text-center">
          <div className="mb-2 text-4xl">🎉</div>
          <h3 id="congrats-title" className="text-xl font-bold text-emerald-300">
            Congratulations!
          </h3>
        </div>

        <div className="mb-4 space-y-2 text-center">
          <p className="text-sm text-slate-300">You won the market:</p>
          <p className="font-semibold text-white">{marketQuestion}</p>
          <p className="text-xs text-slate-400">
            Winning outcome: <span className="text-emerald-300">{winningOutcome}</span>
          </p>
        </div>

        <div className="mb-6 rounded-lg border border-emerald-400/20 bg-emerald-950/30 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-400">Payout</p>
          <p className="text-lg font-bold text-emerald-300">{formatECY(payout)}</p>
        </div>

        <button
          onClick={handleClose}
          className="w-full rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 font-medium text-emerald-300 transition hover:border-emerald-400 hover:bg-emerald-400/20"
        >
          Close
        </button>
      </div>
    </div>
  );
}
