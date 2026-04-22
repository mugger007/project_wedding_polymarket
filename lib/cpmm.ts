/*
 * CPMM helper math for probability snapshots and ECY-to-shares trade previews.
 */
export interface CpmmPoolInput {
  outcomeId: string;
  shares: number;
  liquidity: number;
}

// Rounds to 6 decimals to match backend trade precision.
export function round6(value: number) {
  return Math.round(value * 1_000_000) / 1_000_000;
}

// Calculates one outcome probability from liquidity-adjusted pool shares.
export function probabilityForOutcome(
  pools: CpmmPoolInput[],
  outcomeId: string,
): number {
  const target = pools.find((p) => p.outcomeId === outcomeId);
  if (!target || pools.length === 0) {
    return 0;
  }

  const liquidity = target.liquidity;
  const totalShares = pools.reduce((sum, p) => sum + p.shares, 0);
  const denominator = totalShares + pools.length * liquidity;

  if (denominator <= 0) {
    return 0;
  }

  return (target.shares + liquidity) / denominator;
}

// Builds a full outcomeId-to-probability map for market rendering.
export function getProbabilityMap(pools: CpmmPoolInput[]): Record<string, number> {
  return pools.reduce<Record<string, number>>((acc, pool) => {
    acc[pool.outcomeId] = probabilityForOutcome(pools, pool.outcomeId);
    return acc;
  }, {});
}

// Calculates change from the market start baseline, assumed equal-weighted at launch.
export function probabilityChangeFromStart(
  pools: CpmmPoolInput[],
  outcomeId: string,
): number {
  if (pools.length === 0) {
    return 0;
  }

  const current = probabilityForOutcome(pools, outcomeId);
  const start = 1 / pools.length;
  return current - start;
}

// Estimates shares received for a buy order specified in ECY using binary search.
export function estimateSharesFromBuyECY(
  pools: CpmmPoolInput[],
  outcomeId: string,
  amount: number,
): number {
  const target = pools.find((p) => p.outcomeId === outcomeId);
  if (!target || amount <= 0) {
    return 0;
  }

  const totalShares = pools.reduce((sum, p) => sum + p.shares, 0);
  const n = pools.length;
  const A = target.shares + target.liquidity;
  const D0 = totalShares + n * target.liquidity;

  let lo = 0;
  let hi = Math.max(1, amount * 2);

  const buyCost = (d: number) => d + (A - D0) * Math.log((D0 + d) / D0);

  while (buyCost(hi) < amount && hi < 100_000_000) {
    hi *= 2;
  }

  for (let i = 0; i < 60; i += 1) {
    const mid = (lo + hi) / 2;
    if (buyCost(mid) > amount) {
      hi = mid;
    } else {
      lo = mid;
    }
  }

  return round6(lo);
}

// Estimates shares sold to receive a target ECY amount using binary search.
export function estimateSharesFromSellECY(
  pools: CpmmPoolInput[],
  outcomeId: string,
  amount: number,
  maxShares: number,
): number {
  const target = pools.find((p) => p.outcomeId === outcomeId);
  if (!target || amount <= 0 || maxShares <= 0) {
    return 0;
  }

  const totalShares = pools.reduce((sum, p) => sum + p.shares, 0);
  const n = pools.length;
  const A = target.shares + target.liquidity;
  const D0 = totalShares + n * target.liquidity;

  const sellProceeds = (d: number) => d + (A - D0) * Math.log(D0 / (D0 - d));

  const maxProceed = sellProceeds(maxShares);
  if (amount > maxProceed) {
    return maxShares;
  }

  let lo = 0;
  let hi = maxShares;

  for (let i = 0; i < 60; i += 1) {
    const mid = (lo + hi) / 2;
    if (sellProceeds(mid) > amount) {
      hi = mid;
    } else {
      lo = mid;
    }
  }

  return round6(lo);
}
