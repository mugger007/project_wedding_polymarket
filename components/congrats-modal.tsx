"use client";

import { useState } from "react";
import { formatECY } from "@/lib/format";

interface CongratsModalProps {
  isOpen: boolean;
  marketQuestion: string;
  winningOutcome: string;
  realizedPnL: number;
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
  realizedPnL,
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
      className={`fixed inset-0 z-50 flex items-center justify-center bg-[#2d0f7a]/35 p-2 transition-opacity duration-150 ${
        isClosing ? "opacity-0" : "opacity-100"
      }`}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="congrats-title"
        className={`w-full max-w-sm rounded-2xl border-2 border-[#00c853] bg-white p-6 shadow-[0_10px_32px_rgba(0,0,0,0.2)] transition-transform duration-150 ${
          isClosing ? "scale-95" : "scale-100"
        }`}
      >
        <div className="mb-4 text-center">
          <div className="mb-2 text-4xl">🎉</div>
          <h3 id="congrats-title" className="text-xl font-black text-[#00c853]">
            Congratulations!
          </h3>
        </div>

        <div className="mb-4 space-y-2 text-center">
          <p className="text-sm font-semibold text-[#374151]">You won the market:</p>
          <p className="font-bold text-[#0a0a0a]">{marketQuestion}</p>
          <p className="text-xs font-semibold text-[#374151]">
            Winning outcome: <span className="text-[#00c853]">{winningOutcome}</span>
          </p>
        </div>

        <div className="mb-6 rounded-lg border-2 border-[#00c853] bg-[#dcfce7] p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#374151]">Realized P/L</p>
          <p className={`text-lg font-extrabold ${realizedPnL >= 0 ? "text-[#00c853]" : "text-[#ff1744]"}`}>
            {formatECY(realizedPnL)}
          </p>
        </div>

        <button
          onClick={handleClose}
          className="w-full rounded-lg bg-[#00c853] px-4 py-2 font-bold text-white shadow-[0_4px_14px_rgba(0,200,83,0.45)] transition hover:scale-[1.03] hover:bg-[#1fd868]"
        >
          Close
        </button>
      </div>
    </div>
  );
}
