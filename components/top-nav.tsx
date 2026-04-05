/*
 * Shared authenticated navigation bar with balance display and logout action.
 */
import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";
import { formatECY } from "@/lib/format";
import type { User } from "@/types";

interface TopNavProps {
  user: User;
}

// Shows cross-page navigation links and current user balance context.
export function TopNav({ user }: TopNavProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div>
          <p className="text-sm text-slate-400">Eugene & CY Wedding Prediction Game</p>
          <p className="text-lg font-semibold text-white">Hi, {user.username}</p>
        </div>

        <nav className="flex items-center gap-2 sm:gap-3">
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
            href="/admin"
            className="rounded-full border border-white/10 px-3 py-2 text-sm text-slate-200 transition hover:border-violet-400/50 hover:text-white"
          >
            Admin
          </Link>
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
      </div>
    </header>
  );
}
