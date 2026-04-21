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

  const rankBadgeClass = (rank: number) => {
    if (rank === 1) {
      return "bg-[#f59e0b] text-[#0a0a0a]";
    }
    if (rank === 2) {
      return "bg-[#94a3b8] text-[#0a0a0a]";
    }
    if (rank === 3) {
      return "bg-[#b45309] text-white";
    }
    return "bg-[#eef2ff] text-[#374151]";
  };

  return (
    <>
      {/* Tab Navigation */}
      <div className="mb-4 flex items-center gap-3 border-b-2 border-[#e5e7eb] pb-4">
        <button
          onClick={() => setTab("individual")}
          className={`rounded-xl border-2 px-4 py-2 text-sm font-bold transition ${
            tab === "individual"
              ? "border-[#6c3bff] bg-[#6c3bff] text-white shadow-[0_4px_14px_rgba(108,59,255,0.5)]"
              : "border-[#d1d5db] text-[#374151] hover:border-[#6c3bff] hover:text-[#6c3bff]"
          }`}
        >
          Guests
        </button>
        <button
          onClick={() => setTab("tables")}
          className={`rounded-xl border-2 px-4 py-2 text-sm font-bold transition ${
            tab === "tables"
              ? "border-[#6c3bff] bg-[#6c3bff] text-white shadow-[0_4px_14px_rgba(108,59,255,0.5)]"
              : "border-[#d1d5db] text-[#374151] hover:border-[#6c3bff] hover:text-[#6c3bff]"
          }`}
        >
          Tables
        </button>
      </div>

      {/* Individual Leaderboard */}
      {tab === "individual" && (
        <div className="rounded-2xl border-2 border-[#d1d5db] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.1)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[340px] table-fixed">
              <colgroup>
                <col style={{ width: "36%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "34%" }} />
                <col style={{ width: "16%" }} />
              </colgroup>
              <thead>
                <tr className="border-b border-[#d1d5db] bg-[#eef2ff]">
                  <th className="px-2 py-3 text-left text-xs font-semibold text-[#374151] sm:px-4">Guest</th>
                  <th className="px-2 py-3 text-right text-xs font-semibold text-[#374151] sm:px-4">Table</th>
                  <th className="px-2 py-3 text-right text-xs font-semibold text-[#374151] sm:px-4">Total P&L</th>
                  <th className="px-2 py-3 text-right text-xs font-semibold text-[#374151] sm:px-4">Trades</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((row, idx) => (
                  <tr key={row.userId} className="border-b border-[#e5e7eb] last:border-0 odd:bg-white even:bg-[#f8faff]">
                    <td className="px-2 py-3 sm:px-4">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-xs font-extrabold ${rankBadgeClass(idx + 1)}`}>
                          #{idx + 1}
                        </span>
                        <p className="truncate text-sm font-bold text-[#0a0a0a] sm:text-[18px]">{row.username}</p>
                      </div>
                    </td>
                    <td className="px-2 py-3 text-right text-sm font-semibold text-[#374151] sm:px-4">
                      {row.tableNumber ?? "-"}
                    </td>
                    <td className="px-2 py-3 text-right sm:px-4">
                      <div className="flex flex-col items-end gap-0.5">
                        <span className={`text-base font-extrabold sm:text-[20px] ${row.totalPnL >= 0 ? "text-[#00c853]" : "text-[#ff1744]"}`}>
                          {formatECY(row.totalPnL)}
                        </span>
                        <span className={`text-xs font-semibold ${row.pnlPercentage >= 0 ? "text-[#16a34a]" : "text-[#dc2626]"}`}>
                          ({row.pnlPercentage >= 0 ? "+" : ""}{row.pnlPercentage.toFixed(1)}%)
                        </span>
                      </div>
                    </td>
                    <td className="px-2 py-3 text-right text-sm font-semibold text-[#374151] sm:px-4">
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
        <div className="rounded-2xl border-2 border-[#d1d5db] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.1)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[360px] table-fixed">
              <colgroup>
                <col style={{ width: "34%" }} />
                <col style={{ width: "28%" }} />
                <col style={{ width: "24%" }} />
                <col style={{ width: "14%" }} />
              </colgroup>
              <thead>
                <tr className="border-b border-[#d1d5db] bg-[#eef2ff]">
                  <th className="px-2 py-3 text-left text-xs font-semibold text-[#374151] sm:px-4">Table</th>
                  <th className="px-2 py-3 text-right text-xs font-semibold text-[#374151] sm:px-4">Avg P&L</th>
                  <th className="px-2 py-3 text-right text-xs font-semibold text-[#374151] sm:px-4">Total P&L</th>
                  <th className="px-2 py-3 text-right text-xs font-semibold text-[#374151] sm:px-4">Players</th>
                </tr>
              </thead>
              <tbody>
                {tableLeaderboard.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-sm font-semibold text-[#374151]">
                      No tables assigned yet. Add a table number during login to join a table group.
                    </td>
                  </tr>
                ) : (
                  tableLeaderboard.map((row, idx) => (
                    <tr key={row.tableNumber} className="border-b border-[#e5e7eb] last:border-0 odd:bg-white even:bg-[#f8faff]">
                      <td className="px-2 py-3 sm:px-4">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-xs font-extrabold ${rankBadgeClass(idx + 1)}`}>
                            #{idx + 1}
                          </span>
                          <p className="truncate text-sm font-bold text-[#0a0a0a] sm:text-[18px]">Table {row.tableNumber}</p>
                        </div>
                      </td>
                      <td className="px-2 py-3 text-right sm:px-4">
                        <div className="flex flex-col items-end gap-0.5">
                          <span className={`text-base font-extrabold sm:text-[20px] ${row.avgPnL >= 0 ? "text-[#00c853]" : "text-[#ff1744]"}`}>
                            {formatECY(row.avgPnL)}
                          </span>
                          <span className={`text-xs font-semibold ${row.avgPnLPercentage >= 0 ? "text-[#16a34a]" : "text-[#dc2626]"}`}>
                            ({row.avgPnLPercentage >= 0 ? "+" : ""}{row.avgPnLPercentage.toFixed(1)}%)
                          </span>
                        </div>
                      </td>
                      <td className={`px-2 py-3 text-right text-base font-extrabold sm:px-4 sm:text-[20px] ${row.totalUsersPnL >= 0 ? "text-[#00c853]" : "text-[#ff1744]"}`}>
                        {formatECY(row.totalUsersPnL)}
                      </td>
                      <td className="px-2 py-3 text-right text-sm font-semibold text-[#374151] sm:px-4">
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
