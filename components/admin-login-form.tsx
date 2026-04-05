"use client";

/*
 * Admin unlock form that sets an admin session via server action.
 */

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { adminLoginAction } from "@/app/actions/auth";

const initialState = { ok: false, message: "" };

// Submits admin password and refreshes the page when admin access is granted.
export function AdminLoginForm() {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(adminLoginAction, initialState);

  useEffect(() => {
    if (!state.message) {
      return;
    }

    if (state.ok) {
      toast.success(state.message);
      router.refresh();
      return;
    }

    toast.error(state.message);
  }, [router, state]);

  return (
    <form action={formAction} className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
      <h2 className="mb-3 text-lg font-semibold text-white">Admin Access</h2>
      <input
        type="password"
        name="password"
        placeholder="Enter admin password"
        className="mb-3 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white"
        required
      />
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-xl bg-gradient-to-r from-violet-400 to-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Unlocking..." : "Unlock Admin"}
      </button>
    </form>
  );
}
