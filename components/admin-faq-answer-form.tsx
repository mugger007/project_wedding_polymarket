"use client";

/*
 * Client-side FAQ answer form used inside the admin moderation queue.
 */

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { answerFaqQuestionAction, type FaqActionState } from "@/app/actions/help";

const initialState: FaqActionState = {
  ok: false,
  message: "",
};

interface AdminFaqAnswerFormProps {
  faqId: string;
}

export function AdminFaqAnswerForm({ faqId }: AdminFaqAnswerFormProps) {
  const [state, formAction, isPending] = useActionState(answerFaqQuestionAction, initialState);

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
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="faqId" value={faqId} />

      <div>
        <label htmlFor={`answer-${faqId}`} className="mb-2 block text-sm text-slate-300">
          Answer
        </label>
        <textarea
          id={`answer-${faqId}`}
          name="answer"
          rows={5}
          required
          minLength={5}
          maxLength={1000}
          placeholder="Write the answer that should appear publicly in How to Play..."
          className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none ring-emerald-400/40 transition focus:ring"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-xl bg-gradient-to-r from-violet-400 to-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? "Publishing..." : "Publish answer"}
      </button>
    </form>
  );
}