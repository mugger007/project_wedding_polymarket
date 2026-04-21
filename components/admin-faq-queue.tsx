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
    <section className="rounded-2xl border-2 border-[#d1d5db] bg-white p-4 shadow-[0_4px_20px_rgba(0,0,0,0.1)] sm:p-5">
      <div className="mb-4">
        <h2 className="text-lg font-black text-[#0a0a0a]">FAQ moderation</h2>
        <p className="mt-1 text-sm font-semibold text-[#374151]">
          Answer user-submitted questions here. Once saved, they are published into the How to Play FAQ section.
        </p>
      </div>

      {openFaqs.length === 0 ? (
        <div className="rounded-xl border-2 border-[#d1d5db] bg-[#f0f4ff] p-4 text-sm font-semibold text-[#374151]">
          There are no open questions right now.
        </div>
      ) : (
        <div className="space-y-4">
          {openFaqs.map((faq) => (
            <div key={faq.id} className="rounded-2xl border-2 border-[#d1d5db] bg-[#f8faff] p-4">
              <div className="mb-3 space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#374151]">
                  <span className="rounded-full border border-[#ec4899] bg-[#fce7f3] px-2 py-0.5 text-[#ec4899]">
                    Open question
                  </span>
                  <span>
                    Asked by {faq.askedByUsername ?? "anonymous user"}
                  </span>
                </div>
                <p className="text-base font-bold text-[#0a0a0a]">{faq.question}</p>
              </div>

              <AdminFaqAnswerForm faqId={faq.id} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
