"use client";

/*
 * Tabbed leaderboard component showing individual and table-grouped rankings.
 */

import { useState } from "react";
import { formatECY } from "@/lib/format";
import type { LeaderboardRow, TableLeaderboardRow } from "@/types";

interface LeaderboardTabsProps {
  leaderboard: LeaderboardRow[];
  tableLeaderboard: TableLeaderboardRow[];
}

export function LeaderboardTabs({ leaderboard, tableLeaderboard }: LeaderboardTabsProps) {
  const [tab, setTab] = useState<"individual" | "tables">("individual");

  return (
    <>
      {/* Tab Navigation */}
      <div className="mb-4 flex items-center gap-3 border-b border-white/10 pb-4">
        <button
          onClick={() => setTab("individual")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
            tab === "individual"
              ? "border-b-2 border-emerald-400 text-emerald-300"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Guests
        </button>
        <button
          onClick={() => setTab("tables")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
            tab === "tables"
              ? "border-b-2 border-emerald-400 text-emerald-300"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Tables
        </button>
      </div>

      {/* Individual Leaderboard */}
      {tab === "individual" && (
        <div className="rounded-2xl border border-white/10 bg-slate-900/70">
          <div className="overflow-x-auto">
            <div className="min-w-[520px]">
              <div className="grid grid-cols-[minmax(160px,1fr)_max-content_max-content_max-content] items-center gap-3 border-b border-white/10 px-4 py-3">
                <span className="text-xs text-slate-500">Guest</span>
                <span className="whitespace-nowrap text-right text-xs text-slate-500">Table</span>
                <span className="whitespace-nowrap text-right text-xs text-slate-500">Total P&L</span>
                <span className="whitespace-nowrap text-right text-xs text-slate-500">Trades</span>
              </div>

              <div className="divide-y divide-white/5">
                {leaderboard.map((row, idx) => (
                  <div key={row.userId} className="grid grid-cols-[minmax(160px,1fr)_max-content_max-content_max-content] items-center gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-100 sm:text-base">
                        {idx + 1}. {row.username}
                      </p>
                    </div>

                    <div className="text-right text-sm font-medium text-slate-400">{row.tableNumber ?? "-"}</div>

                    <div className="flex flex-col items-end gap-0.5">
                      <span className={`text-sm font-semibold sm:text-base ${row.totalPnL >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                        {formatECY(row.totalPnL)}
                      </span>
                      <span className={`text-xs font-medium ${row.pnlPercentage >= 0 ? "text-emerald-400/70" : "text-rose-400/70"}`}>
                        ({row.pnlPercentage >= 0 ? "+" : ""}{row.pnlPercentage.toFixed(1)}%)
                      </span>
                    </div>

                    <div className="text-right text-sm font-medium text-slate-400">{row.tradeCount}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table Leaderboard */}
      {tab === "tables" && (
        <div className="rounded-2xl border border-white/10 bg-slate-900/70">
          <div className="overflow-x-auto">
            <div className="min-w-[560px]">
              <div className="grid grid-cols-[minmax(180px,1fr)_max-content_max-content_max-content] items-center gap-3 border-b border-white/10 px-4 py-3">
                <span className="text-xs text-slate-500">Table</span>
                <span className="whitespace-nowrap text-right text-xs text-slate-500">Avg P&L</span>
                <span className="whitespace-nowrap text-right text-xs text-slate-500">Total P&L</span>
                <span className="whitespace-nowrap text-right text-xs text-slate-500">Players</span>
              </div>

              <div className="divide-y divide-white/5">
                {tableLeaderboard.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-slate-400">
                    No tables assigned yet. Add a table number during login to join a table group.
                  </div>
                ) : (
                  tableLeaderboard.map((row, idx) => (
                    <div key={row.tableNumber} className="grid grid-cols-[minmax(180px,1fr)_max-content_max-content_max-content] items-center gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-100 sm:text-base">
                          {idx + 1}. Table {row.tableNumber}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-0.5">
                        <span className={`text-sm font-semibold sm:text-base ${row.avgPnL >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                          {formatECY(row.avgPnL)}
                        </span>
                        <span className={`text-xs font-medium ${row.avgPnLPercentage >= 0 ? "text-emerald-400/70" : "text-rose-400/70"}`}>
                          ({row.avgPnLPercentage >= 0 ? "+" : ""}{row.avgPnLPercentage.toFixed(1)}%)
                        </span>
                      </div>

                      <div className={`text-right text-sm font-semibold sm:text-base ${row.totalUsersPnL >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                        {formatECY(row.totalUsersPnL)}
                      </div>

                      <div className="text-right text-sm font-medium text-slate-400">{row.userCount}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
