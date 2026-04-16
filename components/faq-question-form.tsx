"use client";

/*
 * Public FAQ submission form for unanswered How to Play questions.
 */

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { submitFaqQuestionAction, type FaqActionState } from "@/app/actions/help";

const initialState: FaqActionState = {
  ok: false,
  message: "",
};

export function FaqQuestionForm() {
  const [state, formAction, isPending] = useActionState(submitFaqQuestionAction, initialState);

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
    <form action={formAction} className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/70 p-4 sm:p-5">
      <div>
        <h3 className="text-lg font-semibold text-white">Still have a question?</h3>
        <p className="mt-1 text-sm text-slate-300">
          Send it here if the FAQs do not cover it. If we answer it, it will appear in the FAQ section for everyone.
        </p>
      </div>

      <div>
        <label htmlFor="faq-question" className="mb-2 block text-sm text-slate-300">
          Your question
        </label>
        <textarea
          id="faq-question"
          name="question"
          rows={5}
          maxLength={500}
          required
          placeholder="Ask anything about trading, balances, market resolution, or tables..."
          className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none ring-emerald-400/40 transition focus:ring"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? "Sending..." : "Submit question"}
      </button>
    </form>
  );
}
