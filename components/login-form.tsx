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

// Collects username and optional table number, then submits auth action.
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
        <label htmlFor="username" className="mb-2 block text-sm font-semibold text-[#374151]">
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
          className="w-full rounded-xl border-2 border-[#d1d5db] bg-white px-4 py-3 text-[#0a0a0a] outline-none"
        />
      </div>

      <div>
        <label htmlFor="tableNumber" className="mb-2 block text-sm font-semibold text-[#374151]">
          Table number
        </label>
        <input
          id="tableNumber"
          name="tableNumber"
          type="number"
          min="1"
          max="20"
          required
          placeholder="e.g. 1, 2, 3..."
          className="w-full rounded-xl border-2 border-[#d1d5db] bg-white px-4 py-3 text-[#0a0a0a] outline-none"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-xl bg-[#6c3bff] px-4 py-3 text-sm font-bold text-white shadow-[0_4px_14px_rgba(108,59,255,0.5)] transition hover:bg-[#7c52ff] hover:shadow-[0_8px_20px_rgba(108,59,255,0.55)] disabled:cursor-not-allowed disabled:bg-[#e5e7eb] disabled:text-[#9ca3af] disabled:shadow-none"
      >
        <span className="inline-flex items-center justify-center gap-2">
          {isPending ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-900/30 border-t-slate-950" /> : null}
          {isPending ? "Joining..." : "Join the Game"}
        </span>
      </button>
    </form>
  );
}
