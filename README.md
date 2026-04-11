# Eugene & Caiying Wedding Prediction Game

Production-ready Next.js 15 App Router web app inspired by Polymarket, built with TypeScript, Tailwind CSS, and Supabase.

## Stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- Supabase (`@supabase/supabase-js`)

## Features

- Username-only login with cookie session (7 days)
- Auto-create user on first login with 1,000 ECY Bucks
- Protected app routes (`/`, `/[marketId]`, `/portfolio`, `/admin`)
- Public leaderboard page at `/leaderboard`
- CPMM-style server-side trading (buy/sell by ECY amount)
- Realtime price/holding updates through Supabase Realtime
- Admin panel with allowlisted access and market resolution payouts
- Portfolio tracking and live leaderboard

## 1. Create Database Schema First

1. Open Supabase SQL Editor.
2. Run [supabase/schema.sql](supabase/schema.sql).
3. This creates:
   - `users`
   - `markets`
   - `market_pools`
   - `user_holdings`
   - `transactions`
   - RLS policies
   - RPC functions:
     - `execute_buy`
     - `execute_sell`
     - `resolve_market_and_payout`
4. It also pre-populates 6 markets and initializes market pools.

You can edit seed outcomes later by changing the seed section in [supabase/schema.sql](supabase/schema.sql).

## 2. Configure Environment Variables

Use [.env.local](.env.local) directly and fill values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SESSION_SECRET`

## 3. Run Locally

```bash
npm install
npm run dev
```

Open http://localhost:3000

## 4. Build Validation

```bash
npm run lint
npm run build
```

## 5. Deploy (Vercel)

1. Push this repo to Git provider.
2. Import project in Vercel.
3. Add the same environment variables from `.env.local`.
4. Deploy.

## Notes

- Trade execution and market resolution happen server-side only.
- Client previews are informational; final calculations are enforced by SQL RPC functions.
- Admin resolution pays only winning shares: `shares * 1 ECY`.
