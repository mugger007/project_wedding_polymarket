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
        <label htmlFor={`answer-${faqId}`} className="mb-2 block text-sm font-semibold text-[#374151]">
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
          className="w-full rounded-xl border-2 border-[#d1d5db] bg-white px-4 py-3 text-sm text-[#0a0a0a] outline-none"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-xl bg-[#6c3bff] px-4 py-2 text-sm font-bold text-white shadow-[0_4px_14px_rgba(108,59,255,0.5)] transition hover:bg-[#7c52ff] hover:shadow-[0_8px_20px_rgba(108,59,255,0.55)] disabled:cursor-not-allowed disabled:bg-[#e5e7eb] disabled:text-[#9ca3af] disabled:shadow-none"
      >
        {isPending ? "Publishing..." : "Publish answer"}
      </button>
    </form>
  );
}