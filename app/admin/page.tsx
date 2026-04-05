/*
 * Admin dashboard for market resolution controls plus a live guest leaderboard.
 */
import { AdminControls } from "@/components/admin-controls";
import { AdminLoginForm } from "@/components/admin-login-form";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { TopNav } from "@/components/top-nav";
import { requireUser } from "@/lib/auth";
import { getLeaderboard, getMarkets } from "@/lib/data";
import { formatECY } from "@/lib/format";
import { hasAdminSession } from "@/lib/session";

// Loads admin data and conditionally renders unlock form or market resolution controls.
export default async function AdminPage() {
  const user = await requireUser();
  const [markets, leaderboard, adminEnabled] = await Promise.all([
    getMarkets(true),
    getLeaderboard(),
    hasAdminSession(),
  ]);

  const unresolvedMarkets = markets.filter((market) => !market.resolved);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <TopNav user={user} />
      <RealtimeRefresh userId={user.id} />

      <section className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 sm:grid-cols-[1fr_1fr] sm:px-6">
        {adminEnabled ? <AdminControls unresolvedMarkets={unresolvedMarkets} hasAdminSession={adminEnabled} /> : <AdminLoginForm />}
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-10 sm:px-6">
        <div className="rounded-2xl border border-white/10 bg-slate-900/70">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Leaderboard</h2>
            <span className="text-xs text-slate-500">Ranked by Total P&amp;L</span>
          </div>

          <div className="divide-y divide-white/5">
            {leaderboard.map((row, idx) => (
              <div key={row.userId} className="flex items-start justify-between gap-3 px-4 py-3 sm:items-center">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-100 sm:text-base">
                    {idx + 1}. {row.username}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <span className={`text-sm font-semibold sm:text-base ${row.totalPnL >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                    {formatECY(row.totalPnL)}
                  </span>

                  <details className="group relative">
                    <summary
                      className="flex h-6 w-6 cursor-pointer list-none items-center justify-center rounded-full border border-white/20 text-xs font-semibold text-slate-300 transition hover:border-white/40 hover:text-white"
                      aria-label={`Show details for ${row.username}`}
                    >
                      i
                    </summary>
                    <div className="absolute right-0 z-10 mt-2 w-44 rounded-xl border border-white/10 bg-slate-950/95 p-3 text-xs shadow-2xl">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Balance</span>
                        <span className="text-slate-200">{formatECY(row.balance)}</span>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-slate-400">Unrealized</span>
                        <span className="text-slate-200">{formatECY(row.unrealizedValue)}</span>
                      </div>
                    </div>
                  </details>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
