/*
 * Portfolio page summarizing a user's open holdings, implied values, and total unrealized value.
 */
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getMarkets, getUserHoldings, getUserResolvedMarketResults, getUserTransactions } from "@/lib/data";
import { formatECY, formatOddsMultiplier } from "@/lib/format";
import { AdvancedModeToggle } from "@/components/advanced-mode-toggle";
import { TopNav } from "@/components/top-nav";
import { RealtimeRefresh } from "@/components/realtime-refresh";

// Combines holdings and market probabilities into user-facing portfolio rows.
export default async function PortfolioPage() {
  const user = await requireUser();
  const [holdings, markets, resolvedResults, transactions] = await Promise.all([
    getUserHoldings(user.id),
    getMarkets(true),
    getUserResolvedMarketResults(user.id),
    getUserTransactions(user.id),
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

  const spendByPosition = new Map<string, number>();
  for (const tx of transactions) {
    const key = `${tx.market_id}:${tx.outcome_id}`;
    const current = spendByPosition.get(key) ?? 0;
    const next = tx.type === "buy" ? current + Number(tx.amount_ecy) : current - Number(tx.amount_ecy);
    spendByPosition.set(key, next);
  }

  const totalUnrealized = rows.reduce((sum, row) => sum + row.unrealized, 0);
  const totalRealizedPnL = resolvedResults.reduce((sum, row) => sum + row.realizedPnL, 0);

  return (
    <main className="min-h-screen bg-[#f8faff] text-[#0a0a0a]">
      <TopNav user={user} />
      <RealtimeRefresh userId={user.id} />

      <section className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        <div className="mb-6 rounded-2xl border-2 border-[#d1d5db] bg-white p-4 shadow-[0_4px_20px_rgba(0,0,0,0.1)] sm:p-5">
          <h1 className="text-xl font-black text-[#0a0a0a] sm:text-2xl">Your Portfolio</h1>
          <p className="mt-1 text-sm leading-5 text-slate-600 sm:text-base">
            <span className="block sm:inline">Balance: {formatECY(user.balance)}</span>
            <span className="mx-0 hidden text-slate-400 sm:inline"> | </span>
            <span className="block sm:inline">Unrealized value: {formatECY(totalUnrealized)}</span>
            <span className="mx-0 hidden text-slate-400 sm:inline"> | </span>
            <span className="block sm:inline">
              Realized P/L: {" "}
              <span className={totalRealizedPnL >= 0 ? "text-emerald-600" : "text-rose-600"}>
                {formatECY(totalRealizedPnL)}
              </span>
            </span>
          </p>
        </div>

        {rows.length === 0 && resolvedResults.length === 0 ? (
          <div className="rounded-2xl border-2 border-[#d1d5db] bg-white p-6 text-[#374151] shadow-[0_4px_20px_rgba(0,0,0,0.1)]">
            No holdings yet. Start trading from the <Link href="/" className="text-emerald-600 underline">markets page</Link>.
          </div>
        ) : (
          <>
            {rows.length > 0 && (
              <h2 className="mb-3 text-lg font-semibold text-slate-900">Open Positions</h2>
            )}
            {rows.length > 0 && (
              <>
                {/* Mobile: Card layout */}
                <div className="space-y-3 sm:hidden">
                  {rows.map((row) => (
                    <div key={`${row.market_id}-${row.outcome_id}`} className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm">
                      <p className="mb-3 font-semibold text-slate-900">{row.marketQuestion}</p>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Outcome</span>
                          <span className="text-slate-900">{row.outcomeLabel}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Spent</span>
                          <span className="text-slate-900">
                            {formatECY(Math.max(0, spendByPosition.get(`${row.market_id}:${row.outcome_id}`) ?? 0))}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Avg. Multiplier</span>
                          <span className="text-slate-900">
                            {formatOddsMultiplier(
                              Math.max(
                                0.000001,
                                (Math.max(0, spendByPosition.get(`${row.market_id}:${row.outcome_id}`) ?? 0) || 0.000001) /
                                  Math.max(0.000001, row.shares),
                              ),
                            )}
                          </span>
                        </div>
                        <div className="flex items-center justify-between border-t border-slate-200 pt-2">
                          <span className="text-slate-500">To Win</span>
                          <span className="font-medium text-emerald-600">{formatECY(row.shares)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop: Grid table */}
                <div className="hidden overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm sm:block">
                  <div className="grid grid-cols-12 border-b border-slate-200 px-4 py-3 text-xs uppercase tracking-wide text-slate-500">
                    <div className="col-span-4">Market</div>
                    <div className="col-span-2">Outcome</div>
                    <div className="col-span-2 text-right">Spent</div>
                    <div className="col-span-2 text-right">Avg. Multiplier</div>
                    <div className="col-span-2 text-right">To Win</div>
                  </div>
                  {rows.map((row) => (
                    <div key={`${row.market_id}-${row.outcome_id}`} className="grid grid-cols-12 items-center border-b border-slate-100 px-4 py-3 text-sm">
                      <div className="col-span-4 pr-3 text-slate-900">{row.marketQuestion}</div>
                      <div className="col-span-2 text-slate-700">{row.outcomeLabel}</div>
                      <div className="col-span-2 text-right text-slate-900">
                        {formatECY(Math.max(0, spendByPosition.get(`${row.market_id}:${row.outcome_id}`) ?? 0))}
                      </div>
                      <div className="col-span-2 text-right text-slate-900">
                        {formatOddsMultiplier(
                          Math.max(
                            0.000001,
                            (Math.max(0, spendByPosition.get(`${row.market_id}:${row.outcome_id}`) ?? 0) || 0.000001) /
                              Math.max(0.000001, row.shares),
                          ),
                        )}
                      </div>
                      <div className="col-span-2 text-right font-medium text-emerald-600">{formatECY(row.shares)}</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {resolvedResults.length > 0 && (
              <>
                <h2 className="mb-3 mt-8 text-lg font-semibold text-slate-900">Resolved Results</h2>

                <div className="space-y-3 sm:hidden">
                  {resolvedResults.map((row) => (
                    <div key={row.marketId} className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm">
                      <p className="mb-3 font-semibold text-slate-900">{row.marketQuestion}</p>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Winning outcome</span>
                          <span className="text-slate-900">{row.winningOutcomeLabel}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Spent</span>
                          <span className="text-slate-900">{formatECY(row.spent)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Payout</span>
                          <span className="text-slate-900">{formatECY(row.payout)}</span>
                        </div>
                        <div className="flex items-center justify-between border-t border-slate-200 pt-2">
                          <span className="text-slate-500">Realized P/L</span>
                          <span className={`font-medium ${row.realizedPnL >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                            {formatECY(row.realizedPnL)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="hidden overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm sm:block">
                  <div className="grid grid-cols-12 border-b border-slate-200 px-4 py-3 text-xs uppercase tracking-wide text-slate-500">
                    <div className="col-span-4">Market</div>
                    <div className="col-span-2">Winning outcome</div>
                    <div className="col-span-2 text-right">Spent</div>
                    <div className="col-span-2 text-right">Payout</div>
                    <div className="col-span-2 text-right">Realized P/L</div>
                  </div>
                  {resolvedResults.map((row) => (
                    <div key={row.marketId} className="grid grid-cols-12 items-center border-b border-slate-100 px-4 py-3 text-sm">
                      <div className="col-span-4 pr-3 text-slate-900">{row.marketQuestion}</div>
                      <div className="col-span-2 text-slate-700">{row.winningOutcomeLabel}</div>
                      <div className="col-span-2 text-right text-slate-900">{formatECY(row.spent)}</div>
                      <div className="col-span-2 text-right text-slate-900">{formatECY(row.payout)}</div>
                      <div className={`col-span-2 text-right font-medium ${row.realizedPnL >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        {formatECY(row.realizedPnL)}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        <div className="mt-10 flex justify-center sm:justify-end">
          <AdvancedModeToggle />
        </div>
      </section>
    </main>
  );
}
