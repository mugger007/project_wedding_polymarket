# Performance Implementation Plan For 200 Concurrent Users

## Goal
Move from full-page refresh based realtime behavior to targeted updates, reduce database work per request, and harden write paths for concurrency and abuse resistance.

## Assumptions
- Stack: Next.js App Router, Supabase Postgres, Supabase Realtime, Server Actions.
- Current pain points: frequent `router.refresh`, heavy market payloads, repeated auth lookups, race-prone post-resolution notifications.

## Success Metrics
- P95 interaction latency for buy or sell under 200 concurrent users: below 900 ms.
- Home page payload size reduction: at least 40%.
- Realtime-triggered full route refresh count: reduced by at least 80%.
- Failed trade rate from contention or timeout under load: below 1%.

## Rollout Strategy
1. Ship low-risk read optimizations and indexes first.
2. Ship realtime refactor behind a feature flag.
3. Ship transactional notification rewrite and action rate limiting.
4. Run concurrency test pass after each phase.

## Phase 1 Status (Implemented)
Completed in codebase:
- Composite indexes added to [supabase/schema.sql](supabase/schema.sql).
- Auth lookup dedupe implemented with request-scoped cache in [lib/auth.ts](lib/auth.ts).
- Realtime subscription filtering implemented in [components/realtime-refresh.tsx](components/realtime-refresh.tsx) and [lib/use-market-resolution.ts](lib/use-market-resolution.ts).

Behavior changes shipped:
- Reduced duplicate authenticated user fetches per request.
- Realtime channels now listen to explicit events instead of wildcard events.
- Market resolution notification channel is filtered by `user_id` at subscription level.

## Supabase Actions Required
Code has been updated, but for existing environments you still need to apply DB indexes in Supabase.

Run this SQL in Supabase SQL Editor (production-safe version with `CONCURRENTLY`):

```sql
create index concurrently if not exists idx_transactions_user_market_time
   on public.transactions (user_id, market_id, timestamp desc);

create index concurrently if not exists idx_resolution_notifications_market_kind_user
   on public.market_resolution_notifications (market_id, kind, user_id);

create index concurrently if not exists idx_user_holdings_market_user_positive_shares
   on public.user_holdings (market_id, user_id)
   where shares > 0;
```

Then verify usage:
```sql
explain analyze
select id, user_id, market_id, outcome_id, type, amount_ecy, shares, price, timestamp
from public.transactions
where user_id = '<user-uuid>' and market_id = '<market-uuid>'
order by timestamp desc
limit 50;

explain analyze
select market_id, user_id, kind
from public.market_resolution_notifications
where market_id = '<market-uuid>' and kind = 'win';
```

Notes:
- `CONCURRENTLY` cannot run inside an explicit transaction block.
- If you use migration files instead of SQL Editor, either remove `CONCURRENTLY` or run these as standalone statements.

## Change Set

### 1) Replace Broad Realtime Route Refresh With Targeted Store Updates
Priority: Critical

Target files:
- components/realtime-refresh.tsx
- app/page.tsx
- app/[marketId]/page.tsx
- components/market-card.tsx
- lib/use-market-resolution.ts

Patch-ready steps:
1. Add a client-side market store keyed by market id (React context or Zustand) with update methods for:
   - market resolution status
   - top outcomes odds
   - guest bet count and guest win count
2. In realtime subscription callback, update only affected market entries in the store.
3. Keep a guarded fallback path that calls `router.refresh` only when payload shape is incompatible.
4. Add feature flag `NEXT_PUBLIC_REALTIME_GRANULAR_UPDATES=true`.
5. Add logging counters for:
   - realtime events received
   - granular updates applied
   - fallback full refresh count

Acceptance checks:
- No visual regressions on market cards after live updates.
- Full refresh count drops sharply during active trading.
- Market detail view remains consistent after resolution events.

Estimated impact:
- App rerenders: 50% to 80% fewer full rerenders on active sessions.
- Browser CPU on busy page: 20% to 45% lower.
- P95 UI stutter events: materially reduced.

Effort and risk:
- Effort: Medium to High (1.5 to 3 days)
- Risk: Medium (state consistency bugs if partial update mapping is wrong)

---

### 2) Remove Trade-Triggered Full Refresh And Apply Optimistic Local Reconciliation
Priority: High

Target files:
- components/trade-panel.tsx
- app/actions/trade.ts
- lib/cpmm.ts

Patch-ready steps:
1. Return a compact action response payload from buy and sell actions:
   - new wallet balance
   - updated outcome pools or implied probabilities
   - transaction id
2. In trade panel success path, update local market store and wallet state directly.
3. Keep a delayed background validation refresh (for example 5 to 10 seconds, idle only).
4. Add reconciliation check for mismatches greater than a threshold and only then trigger refresh.

Acceptance checks:
- Success toast appears without waiting for full route refresh.
- Wallet and odds update instantly and match server values.
- No stale state persists after delayed validation pass.

Estimated impact:
- Per-trade UI completion time: 200 to 500 ms faster.
- Route refresh pressure during bursts: 60% to 90% lower.

Effort and risk:
- Effort: Medium (1 to 2 days)
- Risk: Medium (temporary mismatch handling must be robust)

---

### 3) Move Heavy Market Aggregations To SQL RPC And Reduce Payload Shape
Priority: High

Target files:
- lib/data.ts
- supabase/schema.sql
- types.ts

Patch-ready steps:
1. Create SQL RPC function for home market summaries that returns only needed fields:
   - market metadata
   - top 2 outcomes
   - user position summary
   - guest counts
2. Replace JS-side aggregation loops in `getMarkets` with one RPC call.
3. Add pagination parameters (`limit`, `cursor` or `offset`) to market list loading.
4. Narrow all select lists to explicit columns. Remove unused nested relations from baseline view.
5. Keep old query path behind temporary feature flag for rollback.

Acceptance checks:
- Identical market ordering and displayed values before and after switch.
- Lower response payload and DB CPU in Supabase metrics.
- No N+1 query behavior in logs.

Estimated impact:
- DB read CPU on market list path: 30% to 60% lower.
- Home payload bytes: 40% to 70% lower.
- Time to first meaningful market paint: 150 to 400 ms faster.

Effort and risk:
- Effort: Medium (1 to 2 days)
- Risk: Medium-Low

---

### 4) Make Resolution + Notification Creation Fully Transactional In DB
Priority: High

Target files:
- supabase/schema.sql
- app/actions/admin.ts

Patch-ready steps:
1. Extend existing resolution RPC to also insert all notification records inside the same transaction.
2. Return inserted notification ids and payout summary from RPC result.
3. Remove app-layer post-resolution notification assembly loops.
4. Add idempotency guard key on resolution to prevent accidental double processing.

Acceptance checks:
- No missing or duplicated notifications in repeated resolve attempts.
- Market resolution state, payouts, and notifications are always consistent.

Estimated impact:
- Data integrity risk: sharply reduced for concurrent admin actions.
- Admin resolve latency: potentially 10% to 30% faster due to fewer round trips.

Effort and risk:
- Effort: Medium (1 to 1.5 days)
- Risk: Low-Medium

---

### 5) Add Missing Composite Indexes For Hot Queries
Priority: High

Target files:
- supabase/schema.sql

Patch-ready steps:
1. Add and backfill indexes (names are examples):
   - `idx_transactions_user_market_created_at` on transactions(user_id, market_id, created_at desc)
   - `idx_notifications_user_read_created_at` on notifications(user_id, read, created_at desc)
   - `idx_market_outcomes_market_prob` on market_outcomes(market_id, probability desc)
2. Validate index usage with `EXPLAIN ANALYZE` for key queries.
3. Remove any redundant single-column indexes made obsolete by composites.

Acceptance checks:
- Query plans for dashboard and notifications show index scans.
- P95 query durations for those paths drop measurably.

Estimated impact:
- Hot query latency: 20% to 50% lower.
- Lock wait and buffer churn: lower under load spikes.

Effort and risk:
- Effort: Low-Medium (0.5 to 1 day)
- Risk: Low

---

### 6) Reduce Duplicate Auth Lookups Per Request
Priority: Medium

Target files:
- lib/auth.ts
- app/layout.tsx
- app/page.tsx
- app/[marketId]/page.tsx

Patch-ready steps:
1. Add request-scoped cached helper for current user resolution.
2. Ensure layout and pages reuse this helper instead of re-querying user records.
3. Keep cookie verification as is, but avoid duplicate profile fetches.

Acceptance checks:
- Single user fetch per request in logs for authenticated routes.
- No auth regression across admin and normal user flows.

Estimated impact:
- Authenticated route DB read count: 15% to 35% lower.
- Initial page server processing time: modest improvement.

Effort and risk:
- Effort: Low (0.5 day)
- Risk: Low

---

### 7) Add Action-Level Rate Limiting For Trade and FAQ Endpoints
Priority: Medium

Target files:
- app/actions/trade.ts
- app/actions/help.ts
- lib/rate-limit.ts (new)

Patch-ready steps:
1. Add lightweight token-bucket limiter keyed by user id and IP fallback.
2. Apply limits to buy, sell, and FAQ submit actions.
3. Return typed retryable errors with retry-after seconds.
4. Add instrumentation counters for blocked requests.

Acceptance checks:
- Burst spam attempts are throttled without affecting normal users.
- UI receives and displays actionable retry messages.

Estimated impact:
- Abuse resilience: significantly improved.
- P95 stability during synthetic spam bursts: improved.

Effort and risk:
- Effort: Medium (1 day)
- Risk: Low-Medium

---

### 8) Trim Realtime Subscriptions To Needed Tables and Events Only
Priority: Medium

Target files:
- components/realtime-refresh.tsx
- lib/use-market-resolution.ts

Patch-ready steps:
1. Replace wildcard event subscriptions with explicit event filters per table.
2. Avoid duplicate channels for the same resource.
3. Add lifecycle diagnostics to confirm subscriptions cleanly unsubscribe.

Acceptance checks:
- Number of active channels per tab is stable over time.
- Realtime callback invocation count drops under active usage.

Estimated impact:
- Client callback volume: 20% to 50% lower.
- Reduced chance of memory leaks in long sessions.

Effort and risk:
- Effort: Low (0.5 day)
- Risk: Low

## Suggested Delivery Order
1. Change 5: indexes
2. Change 6: auth dedupe
3. Change 8: subscription filtering
4. Change 3: market RPC and payload trimming
5. Change 2: trade optimistic reconciliation
6. Change 1: granular realtime updates
7. Change 4: transactional notification rewrite
8. Change 7: rate limiting

## Validation Plan Per Milestone
1. Run build and typecheck.
2. Run concurrency script from CONCURRENCY-TESTING-GUIDE with 50 users smoke, then 200 users full.
3. Compare before and after metrics:
   - server action duration
   - Supabase query P95
   - route refresh count
   - browser memory and CPU on active page
4. Roll back by feature flag when metric regression exceeds 10%.

## Patch Checklist Template
Use this checklist for each PR:

- Scope:
  - files changed are limited to planned targets
  - feature flag added for risky behavior changes
- Correctness:
  - no stale state in market card, detail page, and wallet summary
  - no duplicate notifications or duplicate payouts
- Performance:
  - P95 and payload metrics captured before and after
  - no new N+1 patterns introduced
- Operability:
  - logs and counters added for new critical paths
  - rollback path documented in PR description

## Expected Net Outcome After Full Plan
- Support 200 concurrent users with materially lower rerender churn and DB pressure.
- Faster trade feedback loop with better perceived responsiveness.
- Stronger consistency guarantees for admin resolution and user notifications.