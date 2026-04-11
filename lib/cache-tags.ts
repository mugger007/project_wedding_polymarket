/*
 * Shared cache tag helpers for targeted revalidation after market and holding updates.
 */

export const leaderboardTag = "leaderboard";

export function marketsListTag(includeResolved: boolean) {
  return includeResolved ? "markets:all" : "markets:active";
}

export function marketTag(marketId: string) {
  return `market:${marketId}`;
}

export function holdingsTag(userId: string) {
  return `holdings:${userId}`;
}
