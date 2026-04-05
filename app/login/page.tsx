/*
 * Public login page for username-only onboarding into the wedding prediction game.
 */
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getCurrentUser } from "@/lib/auth";

// Redirects authenticated users away from login and renders the login form card.
export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/");
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.25),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(139,92,246,0.22),transparent_30%),radial-gradient(circle_at_50%_80%,rgba(6,182,212,0.14),transparent_38%)]" />
      <div className="relative z-10 w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-violet-900/20 backdrop-blur-xl sm:p-8">
        <p className="mb-2 text-sm uppercase tracking-[0.22em] text-emerald-300/80">Prediction Market</p>
        <h1 className="mb-2 text-3xl font-bold text-white">Eugene & Caiying Wedding Prediction Game</h1>
        <p className="mb-6 text-sm text-slate-300">Start with 1,000 ECY Bucks and trade wedding predictions live.</p>
        <LoginForm />
      </div>
    </main>
  );
}
