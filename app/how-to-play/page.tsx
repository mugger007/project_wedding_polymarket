/*
 * Detailed How to Play page with live FAQ submission and public answers.
 */

import { FaqQuestionForm } from "@/components/faq-question-form";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { TopNav } from "@/components/top-nav";
import { requireUser } from "@/lib/auth";
import { getPublicFaqs } from "@/lib/faqs";

const howToPlaySteps = [
    {
        title: "1. Look at the market card",
        body:
            "Each card shows the fun question, the possible answers (like Yes or No), and the current prices. The price shows how likely people think that outcome is right now.",
    },
    {
        title: "2. Buy shares on what you think will happen",
        body:
            "Pick the outcome you believe in, enter how much ECY you want to bet, and buy shares.\n\n" +
            "Example: If you buy 10 shares of “YES” at 0.50 ECY each, it costs you 5 ECY.\n" +
            "If “YES” wins, you get 1 ECY per share — so you receive 10 ECY back and make a profit!",
    },
    {
        title: "3. Sell anytime before the result is announced",
        body:
            "You can sell your shares back to the market at any time before the event ends. This lets you lock in profit, cut losses, or change your mind if the situation changes.",
    },
    {
        title: "4. When the event ends, winners get paid automatically",
        body:
            "When an event finishes and the result is announced, winning bets are paid out automatically and your balance updates right away.",
    },
    {
        title: "5. Check your portfolio and the leaderboard",
        body:
            "Your portfolio shows what you own and how much you've made or lost so far. The leaderboard shows who is doing best overall — perfect for some friendly table bragging rights!",
    },
];

const tradingTips = [
    "Prices change live as more people buy and sell. The more guests are talking about it, the faster the price can move!",
    "Be careful with big bets — the price might move a little when you place your bet (this is called slippage). Always check the preview before you confirm.",
    "The events are listed in the exact order they will happen during the wedding. We recommend betting on them in that same order!"
];

export default async function HowToPlayPage() {
    const user = await requireUser();
    const faqs = await getPublicFaqs();

    return (
        <main className="min-h-screen bg-slate-950 text-slate-100">
            <TopNav user={user} />
            <RealtimeRefresh userId={user.id} watchFaqs />

            <section className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
                <div className="grid gap-4 lg:grid-cols-3">
                    <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 sm:p-5">
                        <p className="text-sm uppercase tracking-wide text-emerald-300">What you get</p>
                        <p className="mt-2 text-2xl font-semibold text-white">1,000 ECY Bucks</p>
                        <p className="mt-2 text-sm leading-6 text-slate-300">
                            Your balance is virtual. The game is about forecasting wedding outcomes better than everyone else.
                        </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 sm:p-5">
                        <p className="text-sm uppercase tracking-wide text-cyan-300">How odds move</p>
                        <p className="mt-2 text-2xl font-semibold text-white">Buy pressure changes price</p>
                        <p className="mt-2 text-sm leading-6 text-slate-300">
                            When people buy a side, the price usually rises. When they sell, the market can move back.
                        </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 sm:p-5">
                        <p className="text-sm uppercase tracking-wide text-violet-300">How you win</p>
                        <p className="mt-2 text-2xl font-semibold text-white">Finish with the best P/L</p>
                        <p className="mt-2 text-sm leading-6 text-slate-300">
                            Your total performance comes from trading well and being right when markets resolve.
                        </p>
                    </div>
                </div>

                <section className="mt-8 rounded-3xl border border-white/10 bg-slate-900/70 p-5 sm:p-6">
                    <h2 className="text-xl font-semibold text-white">How the game works</h2>
                    <div className="mt-5 grid gap-4">
                        {howToPlaySteps.map((step) => (
                            <div key={step.title} className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                                <h3 className="text-base font-semibold text-white">{step.title}</h3>
                                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-300">{step.body}</p>
                            </div>
                        ))}
                    </div>

                    <div className="mt-6">
                        <h3 className="text-lg font-semibold text-white">Trading tips</h3>
                        <ul className="mt-3 space-y-3 text-sm leading-6 text-slate-300">
                            {tradingTips.map((tip) => (
                                <li key={tip} className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                                    {tip}
                                </li>
                            ))}
                        </ul>
                    </div>
                </section>

                <section className="mt-8 rounded-3xl border border-white/10 bg-slate-900/70 p-5 sm:p-6">
                    <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <h2 className="text-xl font-semibold text-white">Frequently Asked Questions</h2>
                            <p className="mt-1 text-sm text-slate-300">
                                Answers published here stay in sync with the admin queue. If you need more help, submit a new question below.
                            </p>
                        </div>
                    </div>

                    {faqs.length === 0 ? (
                        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm text-slate-300">
                            No FAQs have been published yet.
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {faqs.map((faq) => (
                                <details
                                    key={faq.id}
                                    className="group rounded-2xl border border-white/10 bg-slate-950/70 p-4 transition open:border-emerald-400/30"
                                >
                                    <summary className="cursor-pointer list-none text-base font-semibold text-white outline-none">
                                        <div className="flex items-start justify-between gap-4">
                                            <span>{faq.question}</span>
                                            <span className="mt-1 text-slate-400 transition group-open:rotate-180">⌄</span>
                                        </div>
                                    </summary>
                                    <div className="mt-3 border-t border-white/10 pt-3 text-sm leading-6 text-slate-300 whitespace-pre-line">
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
            </section>
        </main>
    );
}
