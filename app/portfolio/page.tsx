/*
 * Portfolio page summarizing a user's open holdings, implied values, and total unrealized value.
 */
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getMarkets, getUserHoldings, getUserResolvedMarketResults } from "@/lib/data";
import { formatECY, formatPct } from "@/lib/format";
import { TopNav } from "@/components/top-nav";
import { RealtimeRefresh } from "@/components/realtime-refresh";

// Combines holdings and market probabilities into user-facing portfolio rows.
export default async function PortfolioPage() {
  const user = await requireUser();
  const [holdings, markets, resolvedResults] = await Promise.all([
    getUserHoldings(user.id),
    getMarkets(true),
    getUserResolvedMarketResults(user.id),
  ]);

  const marketMap = new Map(markets.map((m) => [m.id, m]));

  const rows = holdings.map((holding) => {
    const market = marketMap.get(holding.market_id);
    const prob = market?.probabilities[holding.outcome_id] ?? 0;
    const unrealized = holding.shares * prob;
    const outcomeLabel = market?.outcomes.find((o) => o.id === holding.outcome_id)?.label ?? holding.outcome_id;
    return {
      ...holding,
      marketQuestion: market?.question ?? "Unknown market",
      outcomeLabel,
      probability: prob,
      unrealized,
      resolved: market?.resolved ?? false,
    };
  });

  const totalUnrealized = rows.reduce((sum, row) => sum + row.unrealized, 0);
  const totalRealizedPnL = resolvedResults.reduce((sum, row) => sum + row.realizedPnL, 0);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <TopNav user={user} />
      <RealtimeRefresh userId={user.id} />

      <section className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        <div className="mb-6 rounded-2xl border border-white/10 bg-slate-900/70 p-4 sm:p-5">
          <h1 className="text-xl font-bold text-white sm:text-2xl">Your Portfolio</h1>
          <p className="mt-1 text-sm leading-5 text-slate-300 sm:text-base">
            <span className="block sm:inline">Balance: {formatECY(user.balance)}</span>
            <span className="mx-0 hidden text-slate-500 sm:inline"> | </span>
            <span className="block sm:inline">Unrealized value: {formatECY(totalUnrealized)}</span>
            <span className="mx-0 hidden text-slate-500 sm:inline"> | </span>
            <span className="block sm:inline">
              Realized P/L: {" "}
              <span className={totalRealizedPnL >= 0 ? "text-emerald-300" : "text-rose-300"}>
                {formatECY(totalRealizedPnL)}
              </span>
            </span>
          </p>
        </div>

        {rows.length === 0 && resolvedResults.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-6 text-slate-300">
            No holdings yet. Start trading from the <Link href="/" className="text-emerald-300 underline">markets page</Link>.
          </div>
        ) : (
          <>
            {rows.length > 0 && (
              <h2 className="mb-3 text-lg font-semibold text-white">Open Positions</h2>
            )}
            {rows.length > 0 && (
              <>
                {/* Mobile: Card layout */}
                <div className="space-y-3 sm:hidden">
                  {rows.map((row) => (
                    <div key={`${row.market_id}-${row.outcome_id}`} className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                      <p className="mb-3 font-semibold text-white">{row.marketQuestion}</p>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Outcome</span>
                          <span className="text-slate-100">{row.outcomeLabel}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Shares</span>
                          <span className="text-slate-100">{row.shares.toFixed(3)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Probability</span>
                          <span className="text-slate-100">{formatPct(row.probability)}</span>
                        </div>
                        <div className="flex items-center justify-between border-t border-white/5 pt-2">
                          <span className="text-slate-400">Unrealized Value</span>
                          <span className="font-medium text-emerald-300">{formatECY(row.unrealized)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop: Grid table */}
                <div className="hidden overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 sm:block">
                  <div className="grid grid-cols-12 border-b border-white/10 px-4 py-3 text-xs uppercase tracking-wide text-slate-400">
                    <div className="col-span-5">Market</div>
                    <div className="col-span-2">Outcome</div>
                    <div className="col-span-1 text-right">Shares</div>
                    <div className="col-span-2 text-right">Prob.</div>
                    <div className="col-span-2 text-right">Unrealized</div>
                  </div>
                  {rows.map((row) => (
                    <div key={`${row.market_id}-${row.outcome_id}`} className="grid grid-cols-12 items-center border-b border-white/5 px-4 py-3 text-sm">
                      <div className="col-span-5 pr-3 text-slate-200">{row.marketQuestion}</div>
                      <div className="col-span-2 text-slate-300">{row.outcomeLabel}</div>
                      <div className="col-span-1 text-right text-slate-100">{row.shares.toFixed(3)}</div>
                      <div className="col-span-2 text-right text-slate-100">{formatPct(row.probability)}</div>
                      <div className="col-span-2 text-right font-medium text-emerald-300">{formatECY(row.unrealized)}</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {resolvedResults.length > 0 && (
              <>
                <h2 className="mt-8 mb-3 text-lg font-semibold text-white">Resolved Results</h2>

                <div className="space-y-3 sm:hidden">
                  {resolvedResults.map((row) => (
                    <div key={row.marketId} className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                      <p className="mb-3 font-semibold text-white">{row.marketQuestion}</p>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Winning outcome</span>
                          <span className="text-slate-100">{row.winningOutcomeLabel}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Spent</span>
                          <span className="text-slate-100">{formatECY(row.spent)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Sold before resolve</span>
                          <span className="text-slate-100">{formatECY(row.receivedFromSells)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Payout at resolution</span>
                          <span className="text-slate-100">{formatECY(row.payout)}</span>
                        </div>
                        <div className="flex items-center justify-between border-t border-white/5 pt-2">
                          <span className="text-slate-400">Realized P/L</span>
                          <span className={`font-medium ${row.realizedPnL >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                            {formatECY(row.realizedPnL)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="hidden overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 sm:block">
                  <div className="grid grid-cols-12 border-b border-white/10 px-4 py-3 text-xs uppercase tracking-wide text-slate-400">
                    <div className="col-span-4">Market</div>
                    <div className="col-span-2">Winning outcome</div>
                    <div className="col-span-2 text-right">Spent</div>
                    <div className="col-span-2 text-right">Payout</div>
                    <div className="col-span-2 text-right">Realized P/L</div>
                  </div>
                  {resolvedResults.map((row) => (
                    <div key={row.marketId} className="grid grid-cols-12 items-center border-b border-white/5 px-4 py-3 text-sm">
                      <div className="col-span-4 pr-3 text-slate-200">{row.marketQuestion}</div>
                      <div className="col-span-2 text-slate-300">{row.winningOutcomeLabel}</div>
                      <div className="col-span-2 text-right text-slate-100">{formatECY(row.spent)}</div>
                      <div className="col-span-2 text-right text-slate-100">{formatECY(row.payout)}</div>
                      <div className={`col-span-2 text-right font-medium ${row.realizedPnL >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                        {formatECY(row.realizedPnL)}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </section>
    </main>
  );
}
