import { type TokenSignalBundle } from '@toro/db';
import { type RiskTier } from '../risk/risk-engine.js';
import { type PriceBundle } from '../valuation/price-types.js';
export type RecommendationAction = 'BUY' | 'SELL' | 'HOLD' | 'SKIP';
export type RecommendationStatus = 'PENDING' | 'EXECUTED' | 'EXPIRED' | 'CANCELLED';
export type PositionStatus = 'OPEN' | 'CLOSED';
export type CloseReason = 'STOP_LOSS' | 'TAKE_PROFIT' | 'SIGNAL_REVERSAL' | 'MANUAL';
export interface TradeRecommendation {
    id: string;
    agentWallet: string;
    tokenAddress: string;
    tokenSymbol: string;
    action: RecommendationAction;
    positionSizePct: number;
    estimatedUsd: number;
    entryPriceUsd: number;
    stopLossPct: number;
    takeProfitPct: number;
    slippageLimitPct: number;
    riskTier: RiskTier;
    signalTier: string;
    opportunityScore: number;
    convictionScore: number;
    expectedEdge: number;
    confidence: number;
    blockers: string[];
    reasons: string[];
    warnings: string[];
    expiresAt: Date;
    decidedAt: Date;
    status: RecommendationStatus;
}
export interface AgentPosition {
    id: string;
    agentWallet: string;
    tokenAddress: string;
    tokenSymbol: string;
    recommendationId: string | null;
    entryPriceUsd: number;
    currentPriceUsd: number;
    positionSizeUsd: number;
    positionSizePct: number;
    stopLossPct: number;
    takeProfitPct: number;
    unrealizedPnlPct: number;
    status: PositionStatus;
    closeReason: CloseReason | null;
    closePriceUsd: number | null;
    openedAt: Date;
    closedAt: Date | null;
    updatedAt: Date;
}
export interface RankedOpportunity {
    signal: TokenSignalBundle;
    priceBundle: PriceBundle;
    marketPriceUsd: number;
    convictionScore: number;
    expectedEdge: number;
    positionSizePct: number;
    stopLossPct: number;
    takeProfitPct: number;
    slippageLimitPct: number;
    riskTier: RiskTier;
}
export interface SkippedSignal {
    signal: TokenSignalBundle;
    reason: string;
}
export interface CapitalAllocation {
    approved: RankedOpportunity[];
    skipped: SkippedSignal[];
    /** Percentage of portfolio newly allocated this cycle (does not include pre-existing exposure). */
    newlyAllocatedPct: number;
}
export interface ExecutionPlan {
    action: 'BUY' | 'SELL';
    tokenIn: string;
    tokenOut: string;
    amountUsd: number;
    slippageLimitPct: number;
    recommendationId: string;
}
//# sourceMappingURL=trade-recommendation-types.d.ts.map