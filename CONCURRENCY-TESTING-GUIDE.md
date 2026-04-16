# Concurrency Testing Guide: 200 Users

## Pre-Test Setup

### 1. Monitor Database During Tests
**Before starting any k6 test**, open a second terminal and monitor the database:

```sql
-- Terminal 1: Monitor query performance
SELECT 
  query,
  calls,
  mean_exec_time,
  stddev_exec_time,
  max_exec_time
FROM pg_stat_statements
WHERE query LIKE '%execute_buy%' 
   OR query LIKE '%execute_sell%'
   OR query LIKE '%get_leaderboard%'
ORDER BY mean_exec_time DESC;

-- Terminal 2: Monitor lock contention
SELECT 
  relation::regclass as table_name,
  count(*) as lock_count,
  string_agg(mode, ', ') as lock_types
FROM pg_locks
WHERE NOT granted
GROUP BY relation
ORDER BY lock_count DESC;

-- Terminal 3: Monitor connections
SELECT 
  datname,
  count(*) as connection_count,
  max(EXTRACT(epoch FROM (now() - state_change))) as oldest_age_sec
FROM pg_stat_activity
GROUP BY datname;
```

---

## Test Progression

### Test 0: Baseline (Single User)
**Goal**: Establish baseline metrics

```bash
k6 run k6_load_test.js --vus 1 --duration 2m
```

**Expected Results**:
- p50 latency: ~80ms
- p95 latency: ~120ms
- Error rate: 0%

**Save this output** for comparison.

---

### Test 1: Linear Ramp (1→50→200 users over 7 min)
**Goal**: Simulate gradual user load increase

```bash
k6 run k6_load_test.js \
  --out json=results_ramp.json \
  --duration 7m
```

**Expected Results** (after quick wins):
- p50: ~100ms (stable)
- p95: ~300ms at 50u, ~400ms at 100u, ~450ms at 200u
- p99: <1s
- Error rate: <0.5%

**Failure Indicators**:
- p95 > 600ms at 200u → Need Phase 2 optimizations
- Error rate > 2% → RLS or connection issue
- Query times increasing > 500ms → Lock contention

---

### Test 2: Spike Test (50→200 in 30 seconds)
**Goal**: Verify system recovers from traffic surge

```javascript
// k6_spike_test.js
export let options = {
  stages: [
    { duration: '30s', target: 200 },   // Spike from 0 to 200 instantly
    { duration: '5m', target: 200 },    // Hold
    { duration: '1m', target: 0 },      // Drop
  ],
};
```

```bash
k6 run k6_spike_test.js --out json=results_spike.json
```

**Expected Results**:
- Spike relief time: <2 seconds (system absorbs spike quickly)
- After 30s, p95 < 600ms
- No cascading failures

**Failure Indicators**:
- p95 remains >1s after spike
- Connection timeouts
- Database unresponsive

---

### Test 3: Hot Market Stress (50 users on single market)
**Goal**: Verify market-level locking doesn't bottleneck

```javascript
// k6_hot_market_test.js
const MARKET_ID = 'single-market-uuid';

export let options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '2m', target: 50 },
    { duration: '2m', target: 50 },
  ],
};

export default function () {
  // All trades on same market/outcome
  http.post('https://your-domain/api/buy', {
    marketId: MARKET_ID,
    outcomeId: 'yes',
    amountECY: 50,
  });
}
```

**Expected Results** (before Phase 2):
- p95: ~400-600ms (trades serialize per market)

**Expected Results** (after advisory lock phase 2):
- p95: ~250-350ms (outcome-level parallelism)

---

### Test 4: Multiple Markets Distributed (50 users on 5 markets)
**Goal**: Verify no global contention

```javascript
// k6_distributed_test.js
const MARKET_IDS = [
  'market-1', 'market-2', 'market-3', 'market-4', 'market-5'
];

export default function () {
  const marketId = MARKET_IDS[__VU % MARKET_IDS.length];
  http.post('https://your-domain/api/buy', {
    marketId: marketId,
    outcomeId: 'yes',
    amountECY: 50,
  });
}
```

**Expected Results**:
- p95: <300ms
- Error rate: <0.5%
- Should be much better than hot market

---

### Test 5: Concurrent Trades Per User (1 user, 5 simultaneous trades)
**Goal**: Verify user balance sharding isn't needed yet

```javascript
// k6_user_parallelism_test.js
export default function () {
  const promises = [];
  
  // 5 concurrent trades on different markets
  for (let i = 0; i < 5; i++) {
    const marketId = `market-${i}`;
    promises.push(
      http.asyncRequest('POST', 'https://your-domain/api/buy', {
        marketId: marketId,
        outcomeId: 'yes',
        amountECY: 20,
      })
    );
  }
  
  // Wait for all to complete
  const responses = http.batch(promises);
  
  check(responses[0], { 'trade succeeds': (r) => r.status === 200 });
}
```

**Expected Results** (before sharding):
- p95: ~200ms (trades serialize on user row)

**Expected Results** (after sharding phase 3):
- p95: ~100ms (shards allow parallelism)

---

### Test 6: Stress Test (200→500 users, find breaking point)
**Goal**: Identify infrastructure limits

```javascript
// k6_stress_test.js
export let options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '2m', target: 200 },
    { duration: '2m', target: 300 },
    { duration: '2m', target: 400 },
    { duration: '2m', target: 500 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500'],  // Still try to hit target
    'http_req_failed': ['rate<0.05'],
  },
};
```

```bash
k6 run k6_stress_test.js --out json=results_stress.json
```

**Analysis**:
- Note p95 latency vs VU count
- Note error rate vs VU count
- Graph breaking point (where p95 > 2s or errors > 10%)

**Example output**:
```
VU: 100 → p95: 250ms, errors: 0%
VU: 200 → p95: 450ms, errors: 0%
VU: 300 → p95: 800ms, errors: 1%
VU: 400 → p95: 1500ms, errors: 5%  ← Breaking point
VU: 500 → p95: 2500ms, errors: 15%
```

Breaking point = max sustainable load (would be 300-350 VU above).

---

## Analyzing k6 Output

### Option 1: View in Terminal (Quick)
```bash
k6 run k6_load_test.js --vus 10 --duration 1m
```

**Output interpretation**:
```
http_reqs........................: 1200  20.0/s
http_req_duration................: avg=45.2ms  p(50)=40ms  p(95)=120ms  p(99)=250ms
http_req_failed..................: 0%
vus...............................: 10
vus_max...........................: 10
```

- **http_reqs**: Total requests completed (1200) at rate (20/sec)
- **p(95)**: 95th percentile of all requests took 120ms
- **p(99)**: 99th percentile took 250ms

---

### Option 2: Export to JSON and Analyze
```bash
k6 run k6_load_test.js --out json=results.json

# Then analyze in Python:
python3 << 'EOF'
import json
import statistics

with open('results.json') as f:
    lines = [json.loads(line) for line in f if line.strip()]

# Filter for HTTP requests
http_reqs = [
    l['data']['value'] for l in lines 
    if l.get('type') == 'Point' 
    and l.get('metric') == 'http_req_duration'
]

print(f"Total requests: {len(http_reqs)}")
print(f"Avg: {statistics.mean(http_reqs):.1f}ms")
print(f"Median: {statistics.median(http_reqs):.1f}ms")
print(f"p95: {sorted(http_reqs)[int(len(http_reqs)*0.95)]:.1f}ms")
print(f"p99: {sorted(http_reqs)[int(len(http_reqs)*0.99)]:.1f}ms")
print(f"Max: {max(http_reqs):.1f}ms")
EOF
```

---

### Option 3: Generate HTML Report
```bash
k6 run k6_load_test.js --out html=results.html
# Open in browser: open results.html
```

---

## Interpreting Results by Phase

| Phase | Load | p50 | p95 | p99 | Error Rate | Status |
|-------|------|-----|-----|-----|-----------|--------|
| Before Optimizations | 50u | 100ms | 250ms | 500ms | <0.5% | ✓ Baseline |
| After Quick Wins | 100u | 120ms | 300ms | 600ms | <0.5% | ✓ Improved |
| | 200u | 150ms | 400ms | 900ms | <1% | ⚠️ Marginal |
| After Phase 2 | 200u | 110ms | 280ms | 600ms | <0.5% | ✓ Good |
| After Phase 3 | 200u | 85ms | 200ms | 400ms | <0.5% | ✓ Excellent |

---

## Troubleshooting Test Issues

### "Connection refused" / "socket: too many open files"
```bash
# Increase file descriptors
ulimit -n 65536

# Then retry test
k6 run k6_load_test.js
```

---

### "Error 429: Too Many Requests"
- Your Supabase project has rate limiting enabled
- Cloud settings: increase rate limit or use local PostgreSQL

---

### "Timeout after 30s" / "Connection reset"
- Database becoming unresponsive
- Check `pg_stat_activity` for hanging queries
- Restart database if hung

---

### Test gets out of memory
```bash
# k6 is running out of RAM (too many VUs at once)
# Split into smaller tests:
k6 run k6_load_test.js --vus 50 --duration 2m
k6 run k6_load_test.js --vus 50 --duration 2m  # Run again
# Instead of --vus 100
```

---

## Continuous Testing (CI/CD)

After implementing optimizations, add to your CI pipeline:

```yaml
# .github/workflows/load-test.yml
name: Load Test
on: [push, pull_request]

jobs:
  performance:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres

    steps:
      - uses: actions/checkout@v3
      - uses: grafana/setup-k6-action@v1

      - name: Run k6 baseline
        run: |
          k6 run k6_load_test.js \
            --vus 50 \
            --duration 2m \
            --out json=results.json

      - name: Check thresholds
        run: |
          # Fail if p95 > 500ms
          python3 check_thresholds.py results.json
```

This ensures performance doesn't regress on future code changes.

