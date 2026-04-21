/*
 * Admin dashboard for market resolution controls.
 */
import { AdminControls } from "@/components/admin-controls";
import { AdminFaqQueue } from "@/components/admin-faq-queue";
import { AdminUnlockForm } from "@/components/admin-unlock-form";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { TopNav } from "@/components/top-nav";
import { requireUser } from "@/lib/auth";
import { getMarkets } from "@/lib/data";
import { getOpenFaqs } from "@/lib/faqs";
import { hasAdminSession } from "@/lib/session";

// Loads admin data and conditionally renders unlock form or market resolution controls.
export default async function AdminPage() {
  const user = await requireUser();
  const isAdminUnlocked = await hasAdminSession();

  if (!isAdminUnlocked) {
    return (
      <main className="min-h-screen bg-[#f8faff] text-[#0a0a0a]">
        <TopNav user={user} />
        <section className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6">
          <AdminUnlockForm />
        </section>
      </main>
    );
  }

  const unresolvedMarkets = await getMarkets(false);
  const openFaqs = await getOpenFaqs();

  return (
    <main className="min-h-screen bg-[#f8faff] text-[#0a0a0a]">
      <TopNav user={user} />
      <RealtimeRefresh userId={user.id} watchFaqs />

      <section className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        <div className="space-y-6">
          <AdminControls unresolvedMarkets={unresolvedMarkets} />
          <AdminFaqQueue openFaqs={openFaqs} />
        </div>
      </section>
    </main>
  );
}
