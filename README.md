# Wedding Prediction Game

A prediction market game for wedding guests — guests predict outcomes from the big day using play money called **ECY Bucks**.

## What Is This?

Guests log in with their name, receive **1,000 ECY Bucks** to start, and trade on questions about Eugene & Caiying's wedding — things like "Who will cry first?" or "What time will the first dance start?". Prices shift as more people trade, so the odds reflect what guests collectively believe. After the wedding, markets resolve and whoever predicted correctly walks away with the most ECY.

A live leaderboard lets everyone see how they rank throughout the event, both individually and by table.

## How Guests Play

1. Go to the app URL and enter your name to log in (no password needed).
2. You start with **1,000 ECY Bucks**.
3. Browse the markets on the home page and click any one to see the question and current odds.
4. Pick an outcome and enter how many ECY to spend. You'll see a preview of your potential winnings before confirming.
5. You can sell your position at any time before the market closes — useful if you change your mind or want to lock in a profit.
6. Check the **Portfolio** page to track all your open positions and running P/L.
7. The **Leaderboard** shows individual rankings and table team rankings.
8. Visit **How to Play** to read the rules or submit questions — admins answer them live.

## Setup Guide

### 1. Set Up the Database

1. Create a project on [Supabase](https://supabase.com).
2. Open the **SQL Editor** in your Supabase dashboard.
3. Copy and run the contents of [supabase/schema.sql](supabase/schema.sql).
   - This creates all the tables, RLS policies, RPC functions, and seeds the initial prediction markets.

To customise the markets (questions and outcomes), edit the seed section at the bottom of `supabase/schema.sql` before running it.

### 2. Configure Environment Variables

Create `.env.local` in the project root:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SESSION_SECRET=a-long-random-string-of-your-choice
```

- `SESSION_SECRET` — long random string used to sign HMAC-SHA256 login cookies

### 3. Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 4. Deploy to Vercel

1. Push this repo to GitHub (or any Git provider).
2. Import the project in [Vercel](https://vercel.com).
3. Add the same environment variables in the Vercel project settings.
4. Deploy.

## Admin Panel

Admins access `/admin` after logging in with an allowed username and entering the admin password. From there you can:

- Resolve markets and trigger automatic payouts to winning guests
- Moderate the FAQ queue — answer guest questions that appear publicly on the How to Play page

When a market resolves, the RPC function pays out winning shareholders proportionally and clears all holdings for that market.

## Advanced Mode

Guests can enable **Advanced Mode** via the toggle on any page to see extra trading details — outstanding share counts, current market value, unrealized and realized P/L, and the Sell button on individual positions. Hidden by default to keep the experience simple for casual players.

Advanced mode state is stored in `localStorage` and syncs across components on the same page via a custom `advanced-mode-change` window event.

## Tech Stack

Built with Next.js 15, React 19, TypeScript, Tailwind CSS, and Supabase. All trades execute server-side via Supabase RPC functions to enforce the CPMM invariant atomically — the browser never writes to the database directly.
