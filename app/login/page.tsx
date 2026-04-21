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
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(108,59,255,0.22),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(247,0,255,0.18),transparent_30%),radial-gradient(circle_at_50%_80%,rgba(0,200,83,0.14),transparent_38%)]" />
      <div className="relative z-10 w-full max-w-md rounded-3xl border-2 border-[#d1d5db] bg-white p-6 shadow-[0_12px_34px_rgba(0,0,0,0.14)] sm:p-8">
        <p className="mb-2 text-sm font-bold uppercase tracking-[0.22em] text-[#6c3bff]">Prediction Market</p>
        <h1 className="mb-2 text-3xl font-black text-[#0a0a0a]">Eugene & Caiying Wedding Prediction Game</h1>
        <p className="mb-6 text-sm font-semibold text-[#374151]">Start with 1,000 ECY Bucks and trade wedding predictions live.</p>
        <LoginForm />
      </div>
    </main>
  );
}
