"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatECY, formatOddsMultiplier } from "@/lib/format";

interface OpenPositionRow {
  marketId: string;
  outcomeId: string;
  marketQuestion: string;
  outcomeLabel: string;
  boughtECY: number;
  soldECY: number;
  outstandingShares: number;
  netBoughtECY: number;
  currentValueECY: number;
  avgMultiplier: number;
  toWinECY: number;
}

interface ClosedPositionRow {
  marketId: string;
  outcomeId: string;
  marketQuestion: string;
  outcomeLabel: string;
  boughtECY: number;
  soldECY: number;
  realizedPnL: number;
}

interface PortfolioOpenPositionsProps {
  rows: OpenPositionRow[];
  closedRows: ClosedPositionRow[];
}

export function PortfolioOpenPositions({ rows, closedRows }: PortfolioOpenPositionsProps) {
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);

  useEffect(() => {
    const syncMode = () => {
      const saved = window.localStorage.getItem("advancedTradingMode") === "1";
      setIsAdvancedMode(saved);
    };

    syncMode();
    window.addEventListener("storage", syncMode);
    window.addEventListener("advanced-mode-change", syncMode as EventListener);

    return () => {
      window.removeEventListener("storage", syncMode);
      window.removeEventListener("advanced-mode-change", syncMode as EventListener);
    };
  }, []);

  const hasOpen = rows.length > 0;
  const hasClosed = closedRows.length > 0;
  const showSubHeadings = hasOpen && hasClosed;

  return (
    <>
      <h2 className="mb-3 text-lg font-semibold text-slate-900">Your Positions</h2>

      {/* ── Active positions ─────────────────────────────────────── */}
      {hasOpen && (
        <>
          {showSubHeadings && (
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Active</p>
          )}

          {/* Mobile cards */}
          <div className="space-y-3 sm:hidden">
            {rows.map((row) => (
              <div key={`${row.marketId}-${row.outcomeId}`} className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm">
                <Link href={`/${row.marketId}`} className="mb-3 block font-semibold text-emerald-600 hover:underline">
                  {row.marketQuestion}
                </Link>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Outcome</span>
                    <span className="text-slate-900">{row.outcomeLabel}</span>
                  </div>

                  {isAdvancedMode ? (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Outstanding Shares</span>
                        <span className="text-slate-900">{row.outstandingShares.toFixed(3)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Spent</span>
                        <span className="text-slate-900">{formatECY(row.netBoughtECY)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Current Value</span>
                        <span className="text-slate-900">{formatECY(row.currentValueECY)}</span>
                      </div>
                      <div className="flex items-center justify-between border-t border-slate-200 pt-2">
                        <span className="text-slate-500">Unrealized P/L</span>
                        {(() => {
                          const pnl = row.currentValueECY - row.netBoughtECY;
                          return (
                            <span className={`font-medium ${pnl >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                              {pnl >= 0 ? "+" : ""}{formatECY(pnl)}
                            </span>
                          );
                        })()}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Spent</span>
                        <span className="text-slate-900">{formatECY(row.netBoughtECY)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Avg. Multiplier</span>
                        <span className="text-slate-900">{formatOddsMultiplier(row.avgMultiplier)}</span>
                      </div>
                      <div className="flex items-center justify-between border-t border-slate-200 pt-2">
                        <span className="text-slate-500">To Win</span>
                        <span className="font-medium text-emerald-600">{formatECY(row.toWinECY)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-2xl border border-slate-300 bg-white shadow-sm sm:block">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 text-left">Market</th>
                  <th className="px-4 py-3 text-left">Outcome</th>
                  {isAdvancedMode ? (
                    <>
                      <th className="px-4 py-3 text-right">Shares</th>
                      <th className="px-4 py-3 text-right">Spent</th>
                      <th className="px-4 py-3 text-right">Current Value</th>
                      <th className="px-4 py-3 text-right">Unrealized P/L</th>
                    </>
                  ) : (
                    <>
                      <th className="px-4 py-3 text-right">Spent</th>
                      <th className="px-4 py-3 text-right">Avg. Multiplier</th>
                      <th className="px-4 py-3 text-right">To Win</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={`${row.marketId}-${row.outcomeId}`} className="border-b border-slate-100">
                    <td className="px-4 py-3">
                      <Link href={`/${row.marketId}`} className="text-emerald-600 hover:underline">
                        {row.marketQuestion}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{row.outcomeLabel}</td>
                    {isAdvancedMode ? (
                      <>
                        <td className="px-4 py-3 text-right text-slate-900">{row.outstandingShares.toFixed(3)}</td>
                        <td className="px-4 py-3 text-right text-slate-900">{formatECY(row.netBoughtECY)}</td>
                        <td className="px-4 py-3 text-right text-slate-900">{formatECY(row.currentValueECY)}</td>
                        <td className={`px-4 py-3 text-right font-medium ${row.currentValueECY - row.netBoughtECY >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                          {row.currentValueECY - row.netBoughtECY >= 0 ? "+" : ""}{formatECY(row.currentValueECY - row.netBoughtECY)}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 text-right text-slate-900">{formatECY(row.netBoughtECY)}</td>
                        <td className="px-4 py-3 text-right text-slate-900">{formatOddsMultiplier(row.avgMultiplier)}</td>
                        <td className="px-4 py-3 text-right font-medium text-emerald-600">{formatECY(row.toWinECY)}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── Closed pre-resolution positions (advanced mode only) ─── */}
      {hasClosed && isAdvancedMode && (
        <div className={hasOpen ? "mt-6" : ""}>
          {showSubHeadings && (
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Sold</p>
          )}

          {/* Mobile cards */}
          <div className="space-y-3 sm:hidden">
            {closedRows.map((row) => (
              <div key={`${row.marketId}-${row.outcomeId}`} className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm">
                <Link href={`/${row.marketId}`} className="mb-3 block font-semibold text-emerald-600 hover:underline">
                  {row.marketQuestion}
                </Link>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Outcome</span>
                    <span className="text-slate-900">{row.outcomeLabel}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Spent</span>
                    <span className="text-slate-900">{formatECY(row.boughtECY)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Received</span>
                    <span className="text-slate-900">{formatECY(row.soldECY)}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-200 pt-2">
                    <span className="text-slate-500">Realized P/L</span>
                    <span className={`font-medium ${row.realizedPnL >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      {row.realizedPnL >= 0 ? "+" : ""}{formatECY(row.realizedPnL)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-2xl border border-slate-300 bg-white shadow-sm sm:block">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 text-left">Market</th>
                  <th className="px-4 py-3 text-left">Outcome</th>
                  <th className="px-4 py-3 text-right">Spent</th>
                  <th className="px-4 py-3 text-right">Received</th>
                  <th className="px-4 py-3 text-right">Realized P/L</th>
                </tr>
              </thead>
              <tbody>
                {closedRows.map((row) => (
                  <tr key={`${row.marketId}-${row.outcomeId}`} className="border-b border-slate-100">
                    <td className="px-4 py-3">
                      <Link href={`/${row.marketId}`} className="text-emerald-600 hover:underline">
                        {row.marketQuestion}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{row.outcomeLabel}</td>
                    <td className="px-4 py-3 text-right text-slate-900">{formatECY(row.boughtECY)}</td>
                    <td className="px-4 py-3 text-right text-slate-900">{formatECY(row.soldECY)}</td>
                    <td className={`px-4 py-3 text-right font-medium ${row.realizedPnL >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      {row.realizedPnL >= 0 ? "+" : ""}{formatECY(row.realizedPnL)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
