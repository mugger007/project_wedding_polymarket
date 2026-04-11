/*
 * Shared authenticated navigation bar with balance display and logout action.
 */
import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";
import { formatECY } from "@/lib/format";
import type { User } from "@/types";

interface TopNavProps {
  user: User;
  canAccessAdmin?: boolean;
}

// Shows cross-page navigation links and current user balance context.
// Mobile-responsive layout: buttons stack on single row, metadata on secondary row below.
export function TopNav({ user, canAccessAdmin = false }: TopNavProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl flex-col px-4 py-3 sm:px-6">
        {/* Navigation buttons and balance - responsive wrapping */}
        <nav className="flex flex-wrap items-center justify-center gap-2 sm:justify-start sm:gap-3">
          <Link
            href="/"
            className="rounded-full border border-white/10 px-3 py-2 text-sm text-slate-200 transition hover:border-emerald-400/50 hover:text-white"
          >
            Markets
          </Link>
          <Link
            href="/portfolio"
            className="rounded-full border border-white/10 px-3 py-2 text-sm text-slate-200 transition hover:border-emerald-400/50 hover:text-white"
          >
            Portfolio
          </Link>
          <Link
            href="/leaderboard"
            className="rounded-full border border-white/10 px-3 py-2 text-sm text-slate-200 transition hover:border-emerald-400/50 hover:text-white"
          >
            Leaderboard
          </Link>
          {canAccessAdmin ? (
            <Link
              href="/admin"
              className="rounded-full border border-white/10 px-3 py-2 text-sm text-slate-200 transition hover:border-violet-400/50 hover:text-white"
            >
              Admin
            </Link>
          ) : null}
          <div className="rounded-full border border-emerald-300/30 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-200">
            {formatECY(user.balance)}
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-full border border-white/10 px-3 py-2 text-sm text-slate-300 transition hover:border-red-400/50 hover:text-red-200"
            >
              Logout
            </button>
          </form>
        </nav>

        {/* User metadata - displayed below buttons */}
        <div className="mt-2 text-center sm:mt-2 sm:text-left">
          <p className="text-sm text-slate-400">Eugene & Caiying Wedding Prediction Game</p>
          <p className="text-lg font-semibold text-white">Hi, {user.username}</p>
        </div>
      </div>
    </header>
  );
}
