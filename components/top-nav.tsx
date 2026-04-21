"use client";

/*
 * Shared authenticated navigation bar with balance display.
 */
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { formatECY } from "@/lib/format";
import type { User } from "@/types";

interface TopNavProps {
  user: User;
}

// Shows cross-page navigation links and current user balance context.
// Mobile uses a compact single-row nav with horizontal scroll to keep header height low.
export function TopNav({ user }: TopNavProps) {
  const pathname = usePathname();
  const [isHidden, setIsHidden] = useState(false);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    setIsHidden(false);
    lastScrollYRef.current = window.scrollY;
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => {
      const currentY = window.scrollY;
      const lastY = lastScrollYRef.current;

      if (currentY <= 10) {
        setIsHidden(false);
        lastScrollYRef.current = currentY;
        return;
      }

      const delta = currentY - lastY;
      if (delta > 6) {
        setIsHidden(true);
      } else if (delta < -6) {
        setIsHidden(false);
      }

      lastScrollYRef.current = currentY;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navItems = [
    { href: "/", label: "Markets" },
    { href: "/portfolio", label: "Portfolio" },
    { href: "/leaderboard", label: "Leaderboard" },
    { href: "/how-to-play", label: "How to Play" },
  ];

  return (
    <header className={`sticky top-0 z-40 border-b-[3px] border-[#6c3bff] bg-white/95 backdrop-blur-xl transition-transform duration-200 ${isHidden ? "-translate-y-full" : "translate-y-0"}`}>
      <div className="mx-auto flex w-full max-w-6xl flex-col px-3 py-2 sm:px-6 sm:py-3">
        <nav className="flex items-center gap-2 overflow-x-auto pb-1 sm:gap-3 sm:pb-0">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded-full border-2 px-2.5 py-1.5 text-xs font-semibold transition sm:px-3 sm:py-2 sm:text-sm ${
                  isActive
                    ? "border-[#6c3bff] text-[#0a0a0a] underline decoration-[#f700ff] decoration-[3px] underline-offset-4"
                    : "border-[#d1d5db] text-[#0a0a0a] hover:border-[#6c3bff] hover:text-[#6c3bff]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <div className="ml-auto whitespace-nowrap rounded-full border-2 border-[#00c853] bg-[#dcfce7] px-2.5 py-1.5 text-xs font-extrabold text-[#0a0a0a] sm:px-3 sm:py-2 sm:text-sm">
            {formatECY(user.balance)}
          </div>
        </nav>

        <div className="mt-1 hidden text-center sm:mt-2 sm:block sm:text-left">
          <p className="text-lg font-black text-[#0a0a0a]">Hi, {user.username}</p>
        </div>
      </div>
    </header>
  );
}
