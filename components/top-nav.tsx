"use client";

/*
 * Shared authenticated navigation bar with balance display.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AdvancedModeToggle } from "@/components/advanced-mode-toggle";
import { formatECY } from "@/lib/format";
import type { User } from "@/types";

interface TopNavProps {
  user: User;
}

// Shows cross-page navigation links and current user balance context.
// Mobile-responsive layout: buttons stack on single row, metadata on secondary row below.
export function TopNav({ user }: TopNavProps) {
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "Markets" },
    { href: "/portfolio", label: "Portfolio" },
    { href: "/leaderboard", label: "Leaderboard" },
    { href: "/how-to-play", label: "How to Play" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b-[3px] border-[#6c3bff] bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl flex-col px-4 py-3 sm:px-6">
        {/* Navigation buttons and balance - responsive wrapping */}
        <nav className="flex flex-wrap items-center justify-center gap-2 sm:justify-start sm:gap-3">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full border-2 px-3 py-2 text-sm font-semibold transition ${
                  isActive
                    ? "border-[#6c3bff] text-[#0a0a0a] underline decoration-[#f700ff] decoration-[3px] underline-offset-4"
                    : "border-[#d1d5db] text-[#0a0a0a] hover:border-[#6c3bff] hover:text-[#6c3bff]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <div className="rounded-full border-2 border-[#00c853] bg-[#dcfce7] px-3 py-2 text-sm font-extrabold text-[#0a0a0a]">
            {formatECY(user.balance)}
          </div>
          <AdvancedModeToggle />
        </nav>

        {/* User metadata - displayed below buttons */}
        <div className="mt-2 text-center sm:mt-2 sm:text-left">
          <p className="text-lg font-black text-[#0a0a0a]">Hi, {user.username}</p>
        </div>
      </div>
    </header>
  );
}
