/*
 * Market detail page with outcome probabilities, user holdings snapshot, and trade ticket UI.
 */
import { notFound } from "next/navigation";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { TopNav } from "@/components/top-nav";
import { TradePanel } from "@/components/trade-panel";
import { requireUser } from "@/lib/auth";
import { getMarketById, getUserHoldings } from "@/lib/data";
import { formatPct } from "@/lib/format";

interface MarketDetailPageProps {
  params: Promise<{ marketId: string }>;
}

const barColors = ["bg-emerald-400", "bg-violet-400", "bg-cyan-400", "bg-amber-400"];

// Fetches one market plus current user holdings and renders the trading surface.
export default async function MarketDetailPage({ params }: MarketDetailPageProps) {
  const user = await requireUser();
  const { marketId } = await params;
  const [market, holdings] = await Promise.all([getMarketById(marketId), getUserHoldings(user.id)]);

  if (!market) {
    notFound();
  }

  const userMarketHoldings = holdings.filter((h) => h.market_id === market.id);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <TopNav user={user} />
      <RealtimeRefresh marketId={market.id} userId={user.id} />

      <section className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 sm:grid-cols-[1.35fr_1fr] sm:px-6">
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 sm:p-5">
            <h1 className="text-2xl font-bold text-white">{market.question}</h1>
            <p className="mt-2 text-sm text-slate-300">
              Current probabilities auto-update in realtime as guests trade.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {market.outcomes.map((outcome, idx) => {
              const prob = market.probabilities[outcome.id] ?? 0;
              const heldShares = userMarketHoldings.find((h) => h.outcome_id === outcome.id)?.shares ?? 0;

              return (
                <div key={outcome.id} className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h2 className="text-sm font-semibold text-white">{outcome.label}</h2>
                    <span className="rounded-full border border-white/10 px-2 py-1 text-xs text-slate-300">
                      {formatPct(prob)}
                    </span>
                  </div>
                  <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className={`h-full ${barColors[idx % barColors.length]}`}
                      style={{ width: `${Math.max(2, prob * 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-400">You hold {heldShares.toFixed(3)} shares</p>
                </div>
              );
            })}
          </div>
        </div>

        <TradePanel market={market} holdings={userMarketHoldings} />
      </section>
    </main>
  );
}
