/*
 * Detailed How to Play page with live FAQ submission and public answers.
 */

import { FaqQuestionForm } from "@/components/faq-question-form";
import { AdvancedModeToggle } from "@/components/advanced-mode-toggle";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { TopNav } from "@/components/top-nav";
import { requireUser } from "@/lib/auth";
import { getPublicFaqs } from "@/lib/faqs";

const howToPlaySteps = [
    {
        title: "1. Pick a question",
        body:
            "Each market card is one simple wedding question. It is like making a tiny guess about what will happen.",
    },
    {
        title: "2. Place your bet",
        body:
            "Choose an outcome (for example, YES), type your ECY amount, then tap Buy.\n\n" +
            "Tiny example: You buy 10 ECY on YES at 2x multiplier. If YES is the correct outcome, you get back 20 ECY (a profit of 10 ECY).",
    },
    {
        title: "3. You can bet on many questions",
        body:
            "You can guess on more than one question at the same time. Put some ECY in one market and some in another if you want.",
    },
    {
        title: "4. Change your mind anytime",
        body:
            "If Advanced Mode is on, you can sell before the answer is known. That is helpful if you change your mind.",
    },
    {
        title: "5. Get paid automatically when resolved",
        body:
            "When the answer is known, the winning side gets paid automatically. Your Portfolio and Leaderboard update by themselves.",
    },
];

const tradingTips = [
    "Start small first. You can always add more later.",
    "Basic Mode is easier. Advanced Mode adds Sell.",
    "You can spread your ECY across more than one question."
];

export default async function HowToPlayPage() {
    const user = await requireUser();
    const faqs = await getPublicFaqs();

    return (
        <main className="min-h-screen bg-[#f8faff] text-[#0a0a0a]">
            <TopNav user={user} />
            <RealtimeRefresh userId={user.id} watchFaqs />

            <section className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
                <div className="grid gap-4 lg:grid-cols-3">
                    <div className="rounded-2xl border-2 border-[#d1d5db] bg-white p-4 shadow-[0_4px_20px_rgba(0,0,0,0.1)] sm:p-5">
                        <p className="text-sm uppercase tracking-wide text-emerald-700">What you get</p>
                        <p className="mt-2 text-2xl font-semibold text-slate-900">1,000 ECY Bucks</p>
                        <p className="mt-2 text-sm leading-6 text-slate-700">
                            Your balance is virtual. The game is about forecasting wedding outcomes better than everyone else.
                        </p>
                    </div>
                    <div className="rounded-2xl border-2 border-[#d1d5db] bg-white p-4 shadow-[0_4px_20px_rgba(0,0,0,0.1)] sm:p-5">
                        <p className="text-sm uppercase tracking-wide text-cyan-700">How odds move</p>
                        <p className="mt-2 text-2xl font-semibold text-slate-900">More buyers changes price</p>
                        <p className="mt-2 text-sm leading-6 text-slate-700">
                            When people buy a side, the price usually rises. When they sell, the market can move back.
                        </p>
                    </div>
                    <div className="rounded-2xl border-2 border-[#d1d5db] bg-white p-4 shadow-[0_4px_20px_rgba(0,0,0,0.1)] sm:p-5">
                        <p className="text-sm uppercase tracking-wide text-violet-700">How you win</p>
                        <p className="mt-2 text-2xl font-semibold text-slate-900">Finish with the best P/L</p>
                        <p className="mt-2 text-sm leading-6 text-slate-700">
                            Your total performance comes from trading well and being right when markets resolve.
                        </p>
                    </div>
                </div>

                <section className="mt-8 rounded-3xl border-2 border-[#d1d5db] bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.1)] sm:p-6">
                    <h2 className="text-xl font-semibold text-slate-900">How the game works</h2>
                    <div className="mt-5 grid gap-4">
                        {howToPlaySteps.map((step) => (
                            <div key={step.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <h3 className="text-base font-semibold text-slate-900">{step.title}</h3>
                                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">{step.body}</p>
                            </div>
                        ))}
                    </div>

                    <div className="mt-6">
                        <h3 className="text-lg font-semibold text-slate-900">Trading tips</h3>
                        <ul className="mt-3 space-y-3 text-sm leading-6 text-slate-700">
                            {tradingTips.map((tip) => (
                                <li key={tip} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    {tip}
                                </li>
                            ))}
                        </ul>
                    </div>
                </section>

                <section className="mt-8 rounded-3xl border-2 border-[#d1d5db] bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.1)] sm:p-6">
                    <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <h2 className="text-xl font-semibold text-slate-900">Frequently Asked Questions</h2>
                            <p className="mt-1 text-sm text-slate-600">
                                Answers published here stay in sync with the admin queue. If you need more help, submit a new question below.
                            </p>
                        </div>
                    </div>

                    {faqs.length === 0 ? (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                            No FAQs have been published yet.
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {faqs.map((faq) => (
                                <details
                                    key={faq.id}
                                    className="group rounded-2xl border border-slate-200 bg-slate-50 p-4 transition open:border-emerald-400"
                                >
                                    <summary className="cursor-pointer list-none text-base font-semibold text-slate-900 outline-none">
                                        <div className="flex items-start justify-between gap-4">
                                            <span>{faq.question}</span>
                                            <span className="mt-1 text-slate-500 transition group-open:rotate-180">⌄</span>
                                        </div>
                                    </summary>
                                    <div className="mt-3 whitespace-pre-line border-t border-slate-200 pt-3 text-sm leading-6 text-slate-700">
                                        {faq.answer}
                                    </div>
                                </details>
                            ))}
                        </div>
                    )}
                </section>

                <div className="mt-6">
                    <FaqQuestionForm />
                </div>

                <div className="mt-10 flex justify-center sm:justify-end">
                    <AdvancedModeToggle />
                </div>
            </section>
        </main>
    );
}
