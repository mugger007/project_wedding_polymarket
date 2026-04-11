"use client";

/*
 * Client login form bound to the server login action with toast feedback.
 */

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { loginAction } from "@/app/actions/auth";

const initialState = {
  ok: false,
  message: "",
};

// Collects username input and submits auth action.
export function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, initialState);

  useEffect(() => {
    if (!state.message) {
      return;
    }

    if (!state.ok) {
      toast.error(state.message);
    }
  }, [state]);

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label htmlFor="username" className="mb-2 block text-sm text-slate-300">
          Pick your username
        </label>
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="off"
          required
          maxLength={32}
          placeholder="e.g. John Tan"
          className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none ring-emerald-400/40 transition focus:ring"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-xl bg-gradient-to-r from-emerald-400 to-violet-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
      >
        <span className="inline-flex items-center justify-center gap-2">
          {isPending ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-900/30 border-t-slate-950" /> : null}
          {isPending ? "Joining..." : "Join the Game"}
        </span>
      </button>
    </form>
  );
}
