/*
 * Compact market summary card used on the home page grid.
 */
import Link from "next/link";
import { formatOddsMultiplier, oddsMultiplierColorClass } from "@/lib/format";
import type { MarketWithStats } from "@/types";

interface MarketCardProps {
  market: MarketWithStats;
}

// Renders market metadata, per-outcome probabilities, and rolling traded volume.
export function MarketCard({ market }: MarketCardProps) {
  const accent = market.resolved ? "#f59e0b" : "#6c3bff";

  const cardClasses = market.resolved
    ? "block h-full cursor-default rounded-2xl border-2 border-[#d1d5db] bg-white p-4 shadow-[0_4px_20px_rgba(0,0,0,0.1)]"
    : "group block h-full rounded-2xl border-2 border-[#d1d5db] bg-white p-4 shadow-[0_4px_20px_rgba(0,0,0,0.1)] transition hover:shadow-[0_8px_30px_rgba(0,0,0,0.15)]";

  const topOutcomes = [...market.outcomes]
    .sort((a, b) => {
      const multiplierA = 1 / Math.max(0.000001, market.probabilities[a.id] ?? 0.000001);
      const multiplierB = 1 / Math.max(0.000001, market.probabilities[b.id] ?? 0.000001);
      return multiplierB - multiplierA;
    })
    .slice(0, 2);

  const winningOutcome = market.resolved
    ? market.outcomes.find((outcome) => market.winning_outcome_ids?.includes(outcome.id))
    : null;

  const content = (
    <div className="flex h-full flex-col border-l-4 pl-3" style={{ borderLeftColor: accent }}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <h2 className="text-base font-bold text-[#0a0a0a] sm:text-lg">{market.question}</h2>
        {market.resolved && (
          <span className="whitespace-nowrap rounded-full bg-[#f59e0b] px-2 py-1 text-xs font-extrabold text-[#0a0a0a]">
            Resolved
          </span>
        )}
      </div>

      <div className="flex-1 space-y-2">
        {market.resolved ? (
          <div className="space-y-2">
            <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-[#0a0a0a]">✓ {winningOutcome?.label ?? "Winning outcome"}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="min-h-[126px] space-y-2">
            {topOutcomes.map((outcome) => (
              <div key={outcome.id} className="min-h-[52px] rounded-xl border-2 border-[#d1d5db] bg-[#f0f4ff] px-3 py-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-[#374151]">{outcome.label}</span>
                  <span className={`rounded-full px-2 py-1 text-base font-extrabold text-white ${oddsMultiplierColorClass(market.probabilities[outcome.id] ?? 0)}`}>
                    {formatOddsMultiplier(market.probabilities[outcome.id] ?? 0)}
                  </span>
                </div>
              </div>
            ))}
            {market.outcomes.length > 2 ? (
              <p className="px-1 text-xs font-semibold text-[#374151]">click to see all options</p>
            ) : null}
          </div>
        )}
      </div>

      <div className="mt-auto px-1 pt-4">
        {market.resolved ? (
          <p className="text-left text-xs font-semibold text-[#374151]">
            {(market.guestWinCount ?? 0)} guests have won
          </p>
        ) : (
          <p className="text-left text-xs font-semibold text-[#374151]">
            {(market.guestBetCount ?? 0)} guests have placed a bet
          </p>
        )}
      </div>
    </div>
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
