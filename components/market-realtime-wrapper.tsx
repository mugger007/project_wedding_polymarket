"use client";

import { RealtimeRefresh } from "@/components/realtime-refresh";
import { usePoolState } from "@/lib/pool-state-context";

interface MarketRealtimeWrapperProps {
  marketId: string;
  userId: string;
}

export function MarketRealtimeWrapper({ marketId, userId }: MarketRealtimeWrapperProps) {
  const { updatePool } = usePoolState();
  return <RealtimeRefresh marketId={marketId} userId={userId} onPoolUpdate={updatePool} />;
}
