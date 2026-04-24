"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { getProbabilityMap, type CpmmPoolInput } from "@/lib/cpmm";
import type { MarketPool } from "@/types";

interface PoolStateContextValue {
  localPools: CpmmPoolInput[];
  localProbabilities: Record<string, number>;
  updatePool: (outcomeId: string, shares: number, liquidity: number) => void;
  setPools: (pools: CpmmPoolInput[]) => void;
}

const PoolStateContext = createContext<PoolStateContextValue | null>(null);

function toCpmmInput(p: MarketPool): CpmmPoolInput {
  return { outcomeId: p.outcome_id, shares: p.shares_outstanding, liquidity: p.liquidity_parameter };
}

interface PoolStateProviderProps {
  initialPools: MarketPool[];
  children: React.ReactNode;
}

export function PoolStateProvider({ initialPools, children }: PoolStateProviderProps) {
  const [localPools, setLocalPools] = useState<CpmmPoolInput[]>(() =>
    initialPools.map(toCpmmInput),
  );

  const localProbabilities = useMemo(() => getProbabilityMap(localPools), [localPools]);

  const updatePool = useCallback((outcomeId: string, shares: number, liquidity: number) => {
    setLocalPools((prev) =>
      prev.map((p) => (p.outcomeId === outcomeId ? { ...p, shares, liquidity } : p)),
    );
  }, []);

  const setPools = useCallback((pools: CpmmPoolInput[]) => {
    setLocalPools(pools);
  }, []);

  return (
    <PoolStateContext.Provider value={{ localPools, localProbabilities, updatePool, setPools }}>
      {children}
    </PoolStateContext.Provider>
  );
}

export function usePoolState(): PoolStateContextValue {
  const ctx = useContext(PoolStateContext);
  if (!ctx) throw new Error("usePoolState must be used within PoolStateProvider");
  return ctx;
}
