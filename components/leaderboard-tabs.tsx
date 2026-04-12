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
            <table className="w-full min-w-[340px] table-fixed">
              <colgroup>
                <col style={{ width: "36%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "34%" }} />
                <col style={{ width: "16%" }} />
              </colgroup>
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-2 py-3 text-left text-xs font-medium text-slate-500 sm:px-4">Guest</th>
                  <th className="px-2 py-3 text-right text-xs font-medium text-slate-500 sm:px-4">Table</th>
                  <th className="px-2 py-3 text-right text-xs font-medium text-slate-500 sm:px-4">Total P&L</th>
                  <th className="px-2 py-3 text-right text-xs font-medium text-slate-500 sm:px-4">Trades</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((row, idx) => (
                  <tr key={row.userId} className="border-b border-white/5 last:border-0">
                    <td className="px-2 py-3 sm:px-4">
                      <p className="truncate text-sm font-medium text-slate-100 sm:text-base">
                        {idx + 1}. {row.username}
                      </p>
                    </td>
                    <td className="px-2 py-3 text-right text-sm font-medium text-slate-400 sm:px-4">
                      {row.tableNumber ?? "-"}
                    </td>
                    <td className="px-2 py-3 text-right sm:px-4">
                      <div className="flex flex-col items-end gap-0.5">
                        <span className={`text-sm font-semibold sm:text-base ${row.totalPnL >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                          {formatECY(row.totalPnL)}
                        </span>
                        <span className={`text-xs font-medium ${row.pnlPercentage >= 0 ? "text-emerald-400/70" : "text-rose-400/70"}`}>
                          ({row.pnlPercentage >= 0 ? "+" : ""}{row.pnlPercentage.toFixed(1)}%)
                        </span>
                      </div>
                    </td>
                    <td className="px-2 py-3 text-right text-sm font-medium text-slate-400 sm:px-4">
                      {row.tradeCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Table Leaderboard */}
      {tab === "tables" && (
        <div className="rounded-2xl border border-white/10 bg-slate-900/70">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[360px] table-fixed">
              <colgroup>
                <col style={{ width: "34%" }} />
                <col style={{ width: "28%" }} />
                <col style={{ width: "24%" }} />
                <col style={{ width: "14%" }} />
              </colgroup>
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-2 py-3 text-left text-xs font-medium text-slate-500 sm:px-4">Table</th>
                  <th className="px-2 py-3 text-right text-xs font-medium text-slate-500 sm:px-4">Avg P&L</th>
                  <th className="px-2 py-3 text-right text-xs font-medium text-slate-500 sm:px-4">Total P&L</th>
                  <th className="px-2 py-3 text-right text-xs font-medium text-slate-500 sm:px-4">Players</th>
                </tr>
              </thead>
              <tbody>
                {tableLeaderboard.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-400">
                      No tables assigned yet. Add a table number during login to join a table group.
                    </td>
                  </tr>
                ) : (
                  tableLeaderboard.map((row, idx) => (
                    <tr key={row.tableNumber} className="border-b border-white/5 last:border-0">
                      <td className="px-2 py-3 sm:px-4">
                        <p className="truncate text-sm font-medium text-slate-100 sm:text-base">
                          {idx + 1}. Table {row.tableNumber}
                        </p>
                      </td>
                      <td className="px-2 py-3 text-right sm:px-4">
                        <div className="flex flex-col items-end gap-0.5">
                          <span className={`text-sm font-semibold sm:text-base ${row.avgPnL >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                            {formatECY(row.avgPnL)}
                          </span>
                          <span className={`text-xs font-medium ${row.avgPnLPercentage >= 0 ? "text-emerald-400/70" : "text-rose-400/70"}`}>
                            ({row.avgPnLPercentage >= 0 ? "+" : ""}{row.avgPnLPercentage.toFixed(1)}%)
                          </span>
                        </div>
                      </td>
                      <td className={`px-2 py-3 text-right text-sm font-semibold sm:px-4 sm:text-base ${row.totalUsersPnL >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                        {formatECY(row.totalUsersPnL)}
                      </td>
                      <td className="px-2 py-3 text-right text-sm font-medium text-slate-400 sm:px-4">
                        {row.userCount}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
