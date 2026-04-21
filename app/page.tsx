/*
 * Markets home page showing active markets, top navigation, and realtime refresh wiring.
 */
import { MarketCard } from "@/components/market-card";
import { AdvancedModeToggle } from "@/components/advanced-mode-toggle";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { TopNav } from "@/components/top-nav";
import { requireUser } from "@/lib/auth";
import { getMarkets } from "@/lib/data";

// Loads authenticated user context and renders active market cards.
export default async function Home() {
  const user = await requireUser();
  const markets = await getMarkets(true);

  const activeMarkets = markets.filter((market) => !market.resolved);
  const resolvedMarkets = markets.filter((market) => market.resolved);

  return (
    <main className="min-h-screen bg-[#f8faff] text-[#0a0a0a]">
      <TopNav user={user} />
      <RealtimeRefresh userId={user.id} />

      <section className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        <div className="mb-6 rounded-2xl border-2 border-[#6c3bff] bg-gradient-to-br from-[#6c3bff] to-[#f700ff] p-5 text-white shadow-[0_10px_32px_rgba(108,59,255,0.42)] sm:p-6">
          <h1 className="text-3xl font-black text-white sm:text-4xl">Eugene & Caiying Wedding Prediction Game</h1>
          <p className="mt-2 text-sm font-semibold text-white/95 sm:text-base">
            Trade with ECY Bucks. Odds update in realtime as guests buy and sell.
          </p>
        </div>

        {markets.length === 0 ? (
          <div className="rounded-2xl border-2 border-[#d1d5db] bg-white p-6 text-[#374151] shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
            No active markets found. Seed your Supabase database with the schema SQL first.
          </div>
        ) : (
          <div className="space-y-8">
            <div>
              <h2 className="mb-3 text-[30px] font-black text-[#0a0a0a]">Active Markets</h2>
              {activeMarkets.length === 0 ? (
                <div className="rounded-2xl border-2 border-[#d1d5db] bg-white p-4 text-sm font-semibold text-[#374151]">
                  No active markets right now.
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {activeMarkets.map((market) => (
                    <MarketCard key={market.id} market={market} />
                  ))}
                </div>
              )}
            </div>

            <div>
              <h2 className="mb-3 text-[30px] font-black text-[#0a0a0a]">Resolved Markets</h2>
              {resolvedMarkets.length === 0 ? (
                <div className="rounded-2xl border-2 border-[#d1d5db] bg-white p-4 text-sm font-semibold text-[#374151]">
                  No resolved markets yet.
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {resolvedMarkets.map((market) => (
                    <MarketCard key={market.id} market={market} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-10 flex justify-center sm:justify-end">
          <AdvancedModeToggle />
        </div>
      </section>
    </main>
  );
}
