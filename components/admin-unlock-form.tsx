"use client";

/*
 * Password gate for the admin page.
 */

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { unlockAdminAction, type AdminUnlockState } from "@/app/actions/auth";

const initialState: AdminUnlockState = {
  ok: false,
  message: "",
};

export function AdminUnlockForm() {
  const [state, formAction, isPending] = useActionState(unlockAdminAction, initialState);

  useEffect(() => {
    if (!state.message) {
      return;
    }

    if (state.ok) {
      toast.success(state.message);
      return;
    }

    toast.error(state.message);
  }, [state]);

  return (
    <div className="rounded-2xl border-2 border-[#d1d5db] bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.1)] sm:p-6">
      <h2 className="text-xl font-black text-[#0a0a0a]">Admin access required</h2>
      <p className="mt-2 text-sm font-semibold text-[#374151]">
        Enter the admin password to open market resolution and FAQ moderation tools.
      </p>

      <form action={formAction} className="mt-4 space-y-3">
        <div>
          <label htmlFor="admin-password" className="mb-2 block text-sm font-semibold text-[#374151]">
            Admin password
          </label>
          <input
            id="admin-password"
            name="password"
            type="password"
            required
            autoComplete="off"
            className="w-full rounded-xl border-2 border-[#d1d5db] bg-white px-4 py-3 text-sm text-[#0a0a0a] outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-xl bg-[#6c3bff] px-4 py-3 text-sm font-bold text-white shadow-[0_4px_14px_rgba(108,59,255,0.5)] transition hover:bg-[#7c52ff] hover:shadow-[0_8px_20px_rgba(108,59,255,0.55)] disabled:cursor-not-allowed disabled:bg-[#e5e7eb] disabled:text-[#9ca3af] disabled:shadow-none"
        >
          {isPending ? "Unlocking..." : "Unlock Admin"}
        </button>
      </form>
    </div>
  );
}
