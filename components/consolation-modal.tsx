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
      className={`fixed inset-0 z-50 flex items-center justify-center bg-[#2d0f7a]/35 p-2 transition-opacity duration-150 ${
        isClosing ? "opacity-0" : "opacity-100"
      }`}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="consolation-title"
        className={`w-full max-w-sm rounded-2xl border-2 border-[#ff1744] bg-white p-6 shadow-[0_10px_32px_rgba(0,0,0,0.2)] transition-transform duration-150 ${
          isClosing ? "scale-95" : "scale-100"
        }`}
      >
        <div className="mb-4 text-center">
          <div className="mb-2 text-4xl">🥀</div>
          <h3 id="consolation-title" className="text-xl font-black text-[#ff1744]">
            Better Luck Next Time
          </h3>
        </div>

        <div className="mb-4 space-y-2 text-center">
          <p className="text-sm font-semibold text-[#374151]">This market resolved against your position:</p>
          <p className="font-bold text-[#0a0a0a]">{marketQuestion}</p>
          <p className="text-xs font-semibold text-[#374151]">
            Winning outcome: <span className="text-[#0a0a0a]">{winningOutcome}</span>
          </p>
        </div>

        <div className="mb-6 rounded-lg border-2 border-[#ff1744] bg-[#fff1f2] p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#374151]">Realized P/L</p>
          <p className={`text-lg font-extrabold ${realizedPnL >= 0 ? "text-[#00c853]" : "text-[#ff1744]"}`}>
            {formatECY(realizedPnL)}
          </p>
        </div>

        <button
          onClick={handleClose}
          className="w-full rounded-lg bg-[#ff1744] px-4 py-2 font-bold text-white shadow-[0_4px_14px_rgba(255,23,68,0.45)] transition hover:scale-[1.03] hover:bg-[#ff3d63]"
        >
          Close
        </button>
      </div>
    </div>
  );
}
