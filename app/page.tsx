/*
 * Markets home page showing active markets, top navigation, and realtime refresh wiring.
 */
import { MarketCard } from "@/components/market-card";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { TopNav } from "@/components/top-nav";
import { requireUser } from "@/lib/auth";
import { getMarkets } from "@/lib/data";

// Loads authenticated user context and renders active market cards.
export default async function Home() {
  const user = await requireUser();
  const markets = await getMarkets(false);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <TopNav user={user} />
      <RealtimeRefresh userId={user.id} />

      <section className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        <div className="mb-6 rounded-2xl border border-white/10 bg-slate-900/70 p-4 sm:p-5">
          <p className="mt-2 text-sm text-slate-300">
            Trade live odds with ECY Bucks. Prices update in realtime as guests buy and sell.
          </p>
        </div>

        {markets.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-6 text-slate-300">
            No active markets found. Seed your Supabase database with the schema SQL first.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {markets.map((market) => (
              <MarketCard key={market.id} market={market} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
