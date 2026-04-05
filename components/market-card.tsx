/*
 * Compact market summary card used on the home page grid.
 */
import Link from "next/link";
import { formatECY, formatPct } from "@/lib/format";
import type { MarketWithStats } from "@/types";

interface MarketCardProps {
  market: MarketWithStats;
}

const barColors = ["bg-emerald-400", "bg-violet-400", "bg-cyan-400", "bg-amber-400"];

// Renders market metadata, per-outcome probabilities, and rolling traded volume.
export function MarketCard({ market }: MarketCardProps) {
  return (
    <Link
      href={`/${market.id}`}
      className="group block rounded-2xl border border-white/10 bg-slate-900/70 p-4 transition hover:border-emerald-300/50 hover:bg-slate-900"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-100 sm:text-lg">{market.question}</h2>
      </div>

      <div className="space-y-3">
        {market.outcomes.map((outcome, idx) => {
          const prob = market.probabilities[outcome.id] ?? 0;
          return (
            <div key={outcome.id}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-slate-300">{outcome.label}</span>
                <span className="font-semibold text-white">{formatPct(prob)}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className={`h-full ${barColors[idx % barColors.length]} transition-all duration-300`}
                  style={{ width: `${Math.max(2, prob * 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
        <span>Volume</span>
        <span className="text-sm font-medium text-slate-200">{formatECY(market.totalVolume)}</span>
      </div>
    </Link>
  );
}
