"use client";

/*
 * Global advanced trading mode toggle persisted in localStorage.
 */

import { useEffect, useState } from "react";

const STORAGE_KEY = "advancedTradingMode";

export function AdvancedModeToggle() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    setEnabled(saved === "1");
  }, []);

  const onToggle = () => {
    const next = !enabled;
    setEnabled(next);
    window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    window.dispatchEvent(new CustomEvent("advanced-mode-change"));
  };

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={enabled}
      className="flex items-center gap-2 rounded-full border-2 border-[#6c3bff] bg-white px-3 py-2 text-xs font-bold text-[#6c3bff] shadow-[0_4px_14px_rgba(108,59,255,0.22)] transition hover:bg-[#6c3bff] hover:text-white"
    >
      <span>Advanced Mode</span>
      <span className={`inline-flex h-5 w-10 items-center rounded-full p-0.5 transition ${enabled ? "bg-[#00c853]" : "bg-[#d1d5db]"}`}>
        <span className={`h-4 w-4 rounded-full bg-white transition ${enabled ? "translate-x-5" : "translate-x-0"}`} />
      </span>
    </button>
  );
}