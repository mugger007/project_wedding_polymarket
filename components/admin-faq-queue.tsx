/*
 * Admin moderation queue for unanswered How to Play questions.
 */

import type { FaqEntry } from "@/types";
import { AdminFaqAnswerForm } from "@/components/admin-faq-answer-form";

interface AdminFaqQueueProps {
  openFaqs: FaqEntry[];
}

export function AdminFaqQueue({ openFaqs }: AdminFaqQueueProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 sm:p-5">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white">FAQ moderation</h2>
        <p className="mt-1 text-sm text-slate-300">
          Answer user-submitted questions here. Once saved, they are published into the How to Play FAQ section.
        </p>
      </div>

      {openFaqs.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4 text-sm text-slate-300">
          There are no open questions right now.
        </div>
      ) : (
        <div className="space-y-4">
          {openFaqs.map((faq) => (
            <div key={faq.id} className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
              <div className="mb-3 space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide text-slate-400">
                  <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-amber-200">
                    Open question
                  </span>
                  <span>
                    Asked by {faq.askedByUsername ?? "anonymous user"}
                  </span>
                </div>
                <p className="text-base font-medium text-white">{faq.question}</p>
              </div>

              <AdminFaqAnswerForm faqId={faq.id} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
