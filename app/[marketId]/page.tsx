/*
 * Market detail page with outcome probabilities, user holdings snapshot, and trade ticket UI.
 */
import { notFound } from "next/navigation";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { TopNav } from "@/components/top-nav";
import { TradePanel } from "@/components/trade-panel";
import { requireUser } from "@/lib/auth";
import { getMarketById, getUserHoldings } from "@/lib/data";
import { canAccessAdmin } from "@/lib/env";

interface MarketDetailPageProps {
  params: Promise<{ marketId: string }>;
}

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
      <TopNav user={user} canAccessAdmin={canAccessAdmin(user.username)} />
      <RealtimeRefresh marketId={market.id} userId={user.id} />

      <section className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 sm:grid-cols-[1.35fr_1fr] sm:px-6">
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 sm:p-5">
            <h1 className="text-2xl font-bold text-white">{market.question}</h1>
            <p className="mt-2 text-sm text-slate-300">
              Current probabilities auto-update in realtime as guests trade.
            </p>
          </div>
        </div>

        <TradePanel market={market} holdings={userMarketHoldings} />
      </section>
    </main>
  );
}
