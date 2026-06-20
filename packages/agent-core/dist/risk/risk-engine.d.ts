import { type TokenSignalBundle } from '@toro/db';
export type RiskTier = 'LOW' | 'MEDIUM' | 'HIGH' | 'SPECULATIVE';
export interface RiskPortfolioState {
    currentDrawdownPct: number;
    dailyLossPct: number;
    cashReservePct: number;
    totalExposurePct: number;
    openRiskPct: number;
    openPositions: number;
}
export interface RiskInput {
    signal: TokenSignalBundle;
    portfolio?: RiskPortfolioState;
    marketPrice: number;
    smartMoneyVWAP: number;
    poolLiquidityUsd: number;
    simulatedValueRetentionPct: number;
    currentTime?: Date;
}
export interface RiskDecision {
    allowed: boolean;
    riskTier: RiskTier;
    positionSizePct: number;
    stopLossPct: number;
    takeProfitPct: number;
    slippageLimitPct: number;
    reasons: string[];
    warnings: string[];
    blockers: string[];
}
export declare class RiskEngine {
    /**
     * Evaluates a token signal bundle under competition risk guardrails.
     * Fully deterministic, unit-testable, and type-safe.
     */
    static evaluate(input: RiskInput): RiskDecision;
}
//# sourceMappingURL=risk-engine.d.ts.map