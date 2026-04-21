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
    <form action={formAction} className="space-y-4 rounded-2xl border-2 border-[#d1d5db] bg-white p-4 shadow-[0_4px_20px_rgba(0,0,0,0.1)] sm:p-5">
      <div>
        <h3 className="text-lg font-black text-[#0a0a0a]">Still have a question?</h3>
        <p className="mt-1 text-sm font-semibold text-[#374151]">
          Send it here if the FAQs do not cover it. If we answer it, it will appear in the FAQ section for everyone.
        </p>
      </div>

      <div>
        <label htmlFor="faq-question" className="mb-2 block text-sm font-semibold text-[#374151]">
          Your question
        </label>
        <textarea
          id="faq-question"
          name="question"
          rows={5}
          maxLength={500}
          required
          placeholder="Ask anything about trading, balances, market resolution, or tables..."
          className="w-full rounded-xl border-2 border-[#d1d5db] bg-white px-4 py-3 text-sm text-[#0a0a0a] outline-none"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex w-full items-center justify-center rounded-xl bg-[#6c3bff] px-4 py-3 text-sm font-bold text-white shadow-[0_4px_14px_rgba(108,59,255,0.5)] transition hover:bg-[#7c52ff] hover:shadow-[0_8px_20px_rgba(108,59,255,0.55)] disabled:cursor-not-allowed disabled:bg-[#e5e7eb] disabled:text-[#9ca3af] disabled:shadow-none"
      >
        {isPending ? "Sending..." : "Submit question"}
      </button>
    </form>
  );
}
