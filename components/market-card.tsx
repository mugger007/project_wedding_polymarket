/*
 * Compact market summary card used on the home page grid.
 */
import Link from "next/link";
import { formatECY, formatPct, formatSignedPct } from "@/lib/format";
import { probabilityChangeFromStart } from "@/lib/cpmm";
import type { MarketWithStats } from "@/types";

interface MarketCardProps {
  market: MarketWithStats;
}

const barColors = ["bg-emerald-400", "bg-violet-400", "bg-cyan-400", "bg-amber-400"];

// Renders market metadata, per-outcome probabilities, and rolling traded volume.
export function MarketCard({ market }: MarketCardProps) {
  const cardClasses = market.resolved
    ? "block cursor-default rounded-2xl border border-white/10 bg-slate-900/70 p-4"
    : "group block rounded-2xl border border-white/10 bg-slate-900/70 p-4 transition hover:border-emerald-300/50 hover:bg-slate-900";

  const content = (
    <>
      <div className="mb-3 flex items-start justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-100 sm:text-lg">{market.question}</h2>
        {market.resolved && (
          <span className="whitespace-nowrap rounded-full bg-amber-400/20 px-2 py-1 text-xs font-semibold text-amber-300">
            Resolved
          </span>
        )}
      </div>

      <div className="space-y-3">
        {market.outcomes.map((outcome, idx) => {
          const isWinner = market.resolved && (market.winning_outcome_ids?.includes(outcome.id) ?? false);
          const displayProb = market.resolved ? (isWinner ? 1 : 0) : (market.probabilities[outcome.id] ?? 0);
          const delta = !market.resolved ? probabilityChangeFromStart(
            market.pools.map((pool) => ({
              outcomeId: pool.outcome_id,
              shares: pool.shares_outstanding,
              liquidity: pool.liquidity_parameter,
            })),
            outcome.id,
          ) : 0;
          const isUp = delta > 0;
          
          return (
            <div key={outcome.id}>
              <div className="mb-1 flex items-start justify-between gap-2 text-sm">
                <div className="flex items-center gap-1">
                  <span className="text-slate-300">{outcome.label}</span>
                  {market.resolved && isWinner && (
                    <span className="text-emerald-400">✓</span>
                  )}
                </div>
                <div className="text-right">
                  <span className={`block font-semibold ${
                    market.resolved
                      ? isWinner ? "text-emerald-300" : "text-slate-400"
                      : "text-white"
                  }`}>
                    {formatPct(displayProb)}
                  </span>
                  {!market.resolved && (
                    <span className={`text-[11px] font-medium ${isUp ? "text-emerald-300" : delta < 0 ? "text-rose-300" : "text-slate-400"}`}>
                      {isUp ? "▲" : delta < 0 ? "▼" : "•"} {formatSignedPct(delta)}
                    </span>
                  )}
                </div>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className={`h-full transition-all duration-300 ${
                    market.resolved
                      ? isWinner ? "bg-emerald-400" : "bg-slate-700"
                      : barColors[idx % barColors.length]
                  }`}
                  style={{ width: `${Math.max(2, displayProb * 100)}%` }}
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
    </>
  );

  if (market.resolved) {
    return <div className={cardClasses}>{content}</div>;
  }

  return (
    <Link href={`/${market.id}`} className={cardClasses}>
      {content}
    </Link>
  );
}
