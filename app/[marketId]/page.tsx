/*
 * Market detail page with outcome probabilities, user holdings snapshot, and trade ticket UI.
 */
import { notFound } from "next/navigation";
import { AdvancedModeToggle } from "@/components/advanced-mode-toggle";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { TopNav } from "@/components/top-nav";
import { TradePanel } from "@/components/trade-panel";
import { requireUser } from "@/lib/auth";
import { getMarketById, getUserHoldings } from "@/lib/data";

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
    <main className="min-h-screen bg-[#f8faff] text-[#0a0a0a]">
      <TopNav user={user} />
      <RealtimeRefresh marketId={market.id} userId={user.id} />

      <section className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 sm:grid-cols-[1.35fr_1fr] sm:px-6">
        <div className="space-y-4">
          <div className="rounded-2xl border-2 border-[#d1d5db] bg-white p-4 shadow-[0_4px_20px_rgba(0,0,0,0.1)] sm:p-5">
            <h1 className="text-2xl font-black text-[#0a0a0a]">{market.question}</h1>
            <p className="mt-2 text-sm font-semibold text-[#374151]">
              Current odds auto-update in realtime as guests trade.
            </p>
          </div>
        </div>

        <TradePanel market={market} holdings={userMarketHoldings} userBalance={user.balance} />
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-8 sm:px-6">
        <div className="flex justify-center sm:justify-end">
          <AdvancedModeToggle />
        </div>
      </section>
    </main>
  );
}
