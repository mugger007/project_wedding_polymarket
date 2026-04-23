# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Approach
Read existing files before writing. Don't re-read unless changed.
Thorough in reasoning, concise in output.
Skip files over 100KB unless required.
No sycophantic openers or closing fluff.
No emojis or em-dashes.
Do not guess APIs, versions, flags, commit SHAs, or package names. Verify by reading code or docs before asserting.

## Next.js Version Warning

This project uses **Next.js 15 with React 19** — APIs, conventions, and file structure have breaking changes from prior versions. Before writing any code, read the relevant guide in `node_modules/next/dist/docs/`. Heed all deprecation notices.

## Commands

```bash
npm run dev      # Start dev server (http://localhost:3000)
npm run build    # Production build
npm run lint     # ESLint check
```

No test suite exists. Validate behavior manually via the dev server.

## Architecture Overview

This is a **wedding prediction market game** ("Eugene & Caiying Wedding Prediction Game") built with Next.js 15 App Router + Supabase. Guests log in with a username, receive 1,000 ECY Bucks, and trade on binary/multi/scalar prediction markets about the wedding.

### Data Flow

All mutations go through **Next.js Server Actions** (`app/actions/`) which call Supabase RPC functions. The browser client (`lib/supabase-browser.ts`) is only used for **realtime subscriptions** — it never mutates data. The admin Supabase client (`lib/supabase.ts`, service role key) is server-only.

```
Browser → Server Action → Supabase RPC (atomic SQL) → revalidateTag()
Browser → supabase-browser.ts → Realtime subscription → router.refresh()
```

### Authentication

Username-only login creates or retrieves a user. Session state is stored in a **signed HMAC-SHA256 cookie** (`ecy_session`, 7-day TTL) — not a Supabase session. Admin access uses a separate `ecy_admin` cookie unlocked by a hardcoded password. `getCurrentUser()` in `lib/auth.ts` is wrapped in React `cache()` to deduplicate per-request DB lookups.

Middleware (`middleware.ts`) blocks all routes except `/login`, `/_next`, `/api`, and `/favicon`.

### CPMM Trading Math

Trade preview is computed **client-side** in `lib/cpmm.ts` using binary search to estimate shares received. The authoritative execution happens server-side in Supabase RPC functions (`execute_buy`, `execute_sell`) which enforce the CPMM invariant atomically and validate balance/share constraints. Never trust client-side share estimates for settlement.

### Realtime Updates

`components/realtime-refresh.tsx` subscribes to Supabase Realtime channels filtered by `market_id` and `user_id`. On any event, it calls `router.refresh()` to re-fetch server components. This is the only realtime mechanism — there is no client-side state for market probabilities.

### Cache Invalidation

ISR cache tags are defined in `lib/cache-tags.ts`. Server actions call `revalidateTag()` after mutations. If UI doesn't update after a trade, check that the action revalidates the correct tag.

### Key RPC Functions (supabase/schema.sql)

| Function | Purpose |
|---|---|
| `execute_buy` | Atomic buy: validates balance, updates CPMM pools, records transaction |
| `execute_sell` | Atomic sell: validates share holdings, updates pools, credits balance |
| `resolve_market_and_payout` | Marks market resolved, pays winning shareholders proportionally |
| `get_leaderboard_snapshot` | Aggregated PnL ranking across all users |
| `get_table_leaderboard` | Team rankings grouped by `table_number` |

### Environment Variables

Required in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` — anon/public key (browser realtime only)
- `SUPABASE_SERVICE_ROLE_KEY` — service role key (server actions only, never expose to client)
- `SESSION_SECRET` — long random string for HMAC cookie signing
- `ADMIN_ALLOWED_USERNAMES` — comma-separated list of admin-eligible usernames

### Advanced Mode (localStorage pattern)

`AdvancedModeToggle` writes `advancedTradingMode=1` to `localStorage` and fires a custom `advanced-mode-change` window event. `TradePanel` and `PortfolioOpenPositions` listen to both `storage` and `advanced-mode-change` to sync across components on the same page. Advanced mode reveals the Sell button and extra portfolio columns.

### outcomeBuyerCounts availability

`getMarkets()` does **not** populate `outcomeBuyerCounts`. Only `getMarketById()` returns per-outcome buyer headcounts. Don't expect it on the home page market list.

### server-only guard

`lib/auth.ts`, `lib/session.ts`, `lib/supabase.ts`, and `lib/data.ts` all start with `import "server-only"` — importing them in a client component is a build error by design, to prevent the service role key from leaking.

### Database Schema Notes

All monetary amounts and share quantities use `NUMERIC(18,6)`. Row-level security is enabled on all tables with public read access and service-role-only writes. Schema and RPC functions live in `supabase/schema.sql` — this is the source of truth for the DB, not any ORM or migration tool.
