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

        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
          <h2 className="mb-3 text-lg font-semibold text-white">All Markets</h2>
          <div className="space-y-3">
            {markets.map((market) => (
              <div key={market.id} className="rounded-xl border border-white/10 bg-slate-950/70 p-3">
                <p className="text-sm text-slate-100">{market.question}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {market.resolved ? `Resolved: ${market.winning_outcome_id}` : "Active"}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-10 sm:px-6">
        <div className="space-y-3 sm:hidden">
          {leaderboard.map((row) => (
            <div key={row.userId} className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
              <p className="mb-3 font-semibold text-white">{row.username}</p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Balance</span>
                  <span className="text-slate-200">{formatECY(row.balance)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Unrealized</span>
                  <span className="text-slate-200">{formatECY(row.unrealizedValue)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-white/5 pt-2">
                  <span className="text-slate-400">Total P&amp;L</span>
                  <span className={`font-semibold ${row.totalPnL >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                    {formatECY(row.totalPnL)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 sm:block">
          <div className="grid grid-cols-12 border-b border-white/10 px-4 py-3 text-xs uppercase tracking-wide text-slate-400">
            <div className="col-span-5">Guest</div>
            <div className="col-span-2 text-right">Balance</div>
            <div className="col-span-2 text-right">Unrealized</div>
            <div className="col-span-3 text-right">Total P&amp;L</div>
          </div>
          {leaderboard.map((row) => (
            <div key={row.userId} className="grid grid-cols-12 border-b border-white/5 px-4 py-3 text-sm">
              <div className="col-span-5 text-slate-100">{row.username}</div>
              <div className="col-span-2 text-right text-slate-200">{formatECY(row.balance)}</div>
              <div className="col-span-2 text-right text-slate-200">{formatECY(row.unrealizedValue)}</div>
              <div className={`col-span-3 text-right font-semibold ${row.totalPnL >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                {formatECY(row.totalPnL)}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
