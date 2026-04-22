# Wedding Prediction Game

A fun prediction market game for wedding guests — think of it as a friendly betting pool where you predict outcomes from the big day using play money called **ECY Bucks**.

## What Is This?

Guests log in with their name, receive **1,000 ECY Bucks** to start, and use them to bet on questions about Eugene & Caiying's wedding — things like "Who will cry first?" or "What time will the first dance start?". Prices shift as more people bet, so the odds reflect what guests collectively believe. After the wedding, markets resolve and whoever predicted correctly walks away with the most ECY.

There's a live leaderboard so everyone can see how they're doing throughout the event.

## How Guests Play

1. Go to the app URL and enter your name to log in (no password needed).
2. You start with **1,000 ECY Bucks**.
3. Browse the markets on the home page and click any one to see the question and current odds.
4. Pick an outcome and enter how many ECY to spend. You'll see a preview of your potential winnings before confirming.
5. You can sell your position at any time before the market closes — useful if you change your mind or want to lock in a profit.
6. Check the **Portfolio** page to track all your positions and your running P/L.
7. The **Leaderboard** shows where you rank against other guests.

## Setup Guide

### 1. Set Up the Database

1. Create a project on [Supabase](https://supabase.com).
2. Open the **SQL Editor** in your Supabase dashboard.
3. Copy and run the contents of [supabase/schema.sql](supabase/schema.sql).
   - This creates all the tables, security rules, and logic the app needs.
   - It also seeds the initial prediction markets.

To customise the markets (questions and outcomes), edit the seed section at the bottom of `supabase/schema.sql` before running it.

### 2. Configure Environment Variables

Create a file called `.env.local` in the project root with the following values (find them in your Supabase project settings):

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SESSION_SECRET=a-long-random-string-of-your-choice
```

`SESSION_SECRET` can be any long random string — it's used to sign login cookies.

### 3. Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 4. Deploy to Vercel

1. Push this repo to GitHub (or any Git provider).
2. Import the project in [Vercel](https://vercel.com).
3. Add the same environment variables from `.env.local` in the Vercel project settings.
4. Deploy — Vercel handles everything else.

## Admin Panel

Admins can access `/admin` after logging in and entering the admin password. From there you can:

- Resolve markets and trigger payouts to winning guests
- Reply to questions posted by guests

When a market resolves, winners are paid out automatically based on their share of the winning outcome.

## Advanced Mode

Guests can enable **Advanced Mode** from the Portfolio page to see extra trading details — outstanding share counts, current market value, unrealized and realized P/L. It's hidden by default to keep the experience simple for casual players.

## Tech Stack

Built with Next.js 15, TypeScript, Tailwind CSS, and Supabase. Trades are executed server-side to ensure fairness — the odds you see are always accurate, and no one can game the system through the browser.
