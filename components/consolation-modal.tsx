"use client";

import { useState } from "react";
import { formatECY } from "@/lib/format";

interface ConsolationModalProps {
  isOpen: boolean;
  marketQuestion: string;
  winningOutcome: string;
  realizedPnL: number;
  onClose: () => void;
}

/**
 * Modal shown when user had exposure in a resolved market but did not win.
 */
export function ConsolationModal({
  isOpen,
  marketQuestion,
  winningOutcome,
  realizedPnL,
  onClose,
}: ConsolationModalProps) {
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
        aria-labelledby="consolation-title"
        className={`w-full max-w-sm rounded-2xl border border-slate-400/30 bg-gradient-to-br from-slate-900 to-slate-800 p-6 shadow-2xl transition-transform duration-150 ${
          isClosing ? "scale-95" : "scale-100"
        }`}
      >
        <div className="mb-4 text-center">
          <div className="mb-2 text-4xl">🥀</div>
          <h3 id="consolation-title" className="text-xl font-bold text-slate-200">
            Better Luck Next Time
          </h3>
        </div>

        <div className="mb-4 space-y-2 text-center">
          <p className="text-sm text-slate-300">This market resolved against your position:</p>
          <p className="font-semibold text-white">{marketQuestion}</p>
          <p className="text-xs text-slate-400">
            Winning outcome: <span className="text-slate-200">{winningOutcome}</span>
          </p>
        </div>

        <div className="mb-6 rounded-lg border border-slate-400/20 bg-slate-900/60 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-400">Realized P/L</p>
          <p className={`text-lg font-bold ${realizedPnL >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
            {formatECY(realizedPnL)}
          </p>
        </div>

        <button
          onClick={handleClose}
          className="w-full rounded-lg border border-slate-400/30 bg-slate-500/10 px-4 py-2 font-medium text-slate-200 transition hover:border-slate-300 hover:bg-slate-400/20"
        >
          Close
        </button>
      </div>
    </div>
  );
}
