/*
 * Admin dashboard for market resolution controls.
 */
import { AdminControls } from "@/components/admin-controls";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { TopNav } from "@/components/top-nav";
import { requireUser } from "@/lib/auth";
import { getMarkets } from "@/lib/data";
import { canAccessAdmin } from "@/lib/env";
import { notFound } from "next/navigation";

// Loads admin data and conditionally renders unlock form or market resolution controls.
export default async function AdminPage() {
  const user = await requireUser();
  if (!canAccessAdmin(user.username)) {
    notFound();
  }

  const markets = await getMarkets(true);

  const unresolvedMarkets = markets.filter((market) => !market.resolved);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <TopNav user={user} canAccessAdmin />
      <RealtimeRefresh userId={user.id} />

      <section className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        <AdminControls unresolvedMarkets={unresolvedMarkets} />
      </section>
    </main>
  );
}
