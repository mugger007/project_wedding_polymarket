/*
 * Public leaderboard page with individual and table-grouped rankings.
 */
import { TopNav } from "@/components/top-nav";
import { AdvancedModeToggle } from "@/components/advanced-mode-toggle";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { requireUser } from "@/lib/auth";
import { getLeaderboard, getTableLeaderboard } from "@/lib/data";
import { LeaderboardTabs } from "@/components/leaderboard-tabs";
import type { LeaderboardRow, TableLeaderboardRow } from "@/types";

// Shows a live leaderboard that any authenticated user can view, with tabs for individual and table rankings.
export default async function LeaderboardPage() {
  const user = await requireUser();
  const leaderboard = await getLeaderboard() as LeaderboardRow[];
  const tableLeaderboard = await getTableLeaderboard() as TableLeaderboardRow[];

  return (
    <main className="min-h-screen bg-[#f8faff] text-[#0a0a0a]">
      <TopNav user={user} />
      <RealtimeRefresh userId={user.id} watchAllUsers />

      <section className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        <LeaderboardTabs leaderboard={leaderboard} tableLeaderboard={tableLeaderboard} />

        <div className="mt-10 flex justify-center sm:justify-end">
          <AdvancedModeToggle />
        </div>
      </section>
    </main>
  );
}