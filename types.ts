export type MarketType = "binary" | "multi" | "scalar";

export type TradeType = "buy" | "sell";

export interface Outcome {
  id: string;
  label: string;
}

export interface User {
  id: string;
  username: string;
  balance: number;
  table_number: number | null;
  created_at: string;
}

export interface Market {
  id: string;
  question: string;
  type: MarketType;
  outcomes: Outcome[];
  resolved: boolean;
  winning_outcome_ids: string[] | null;
  created_at: string;
}

export interface MarketPool {
  market_id: string;
  outcome_id: string;
  shares_outstanding: number;
  liquidity_parameter: number;
}

export interface UserHolding {
  user_id: string;
  market_id: string;
  outcome_id: string;
  shares: number;
}

export interface Transaction {
  id: string;
  user_id: string;
  market_id: string;
  outcome_id: string;
  type: TradeType;
  amount_ecy: number;
  shares: number;
  price: number;
  timestamp: string;
}

export interface MarketWithStats extends Market {
  pools: MarketPool[];
  probabilities: Record<string, number>;
  totalVolume: number;
}

export interface LeaderboardRow {
  userId: string;
  username: string;
  tableNumber: number | null;
  balance: number;
  unrealizedValue: number;
  totalPnL: number;
  pnlPercentage: number;
  tradeCount: number;
}

export interface TableLeaderboardRow {
  tableNumber: number;
  userCount: number;
  totalUsersPnL: number;
  avgPnL: number;
  avgPnLPercentage: number;
}

export interface TradeResult {
  ok: boolean;
  message: string;
  shares?: number;
  avgPrice?: number;
  newBalance?: number;
  newProbability?: number;
}
