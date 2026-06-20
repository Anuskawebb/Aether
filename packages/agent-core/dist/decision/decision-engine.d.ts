import { type PortfolioStateConfig } from '../portfolio/portfolio-state-service.js';
import { type PortfolioStateSnapshot } from '../portfolio/portfolio-types.js';
import { type TradeRecommendation, type ExecutionPlan } from './trade-recommendation-types.js';
export interface DecisionEngineConfig extends PortfolioStateConfig {
    maxSignalsPerCycle?: number;
}
export interface DecisionCycleResult {
    cycleAt: Date;
    recommendations: TradeRecommendation[];
    executionPlans: ExecutionPlan[];
    portfolioSnapshot: PortfolioStateSnapshot;
    skipped: number;
    blocked: number;
}
/**
 * DecisionEngine — orchestrates the full autonomous decision cycle.
 *
 * Flow per cycle:
 *   1. Refresh portfolio state (MTM + drawdown + rolling loss)
 *   2. Load top smart-money signals
 *   3. Fetch live price bundles
 *   4. Evaluate each signal through the Risk Engine
 *   5. Rank approved signals by conviction score
 *   6. Allocate capital across ranked opportunities (exposure-aware)
 *   7. Generate BUY recommendations for approved allocations
 *   8. Evaluate open positions for exit conditions (stop-loss / take-profit / reversal)
 *   9. Persist all recommendations to trade_recommendations
 *  10. Build and return execution plans
 *
 * Phase 7: No on-chain execution. Plans are produced but not submitted.
 */
export declare class DecisionEngine {
    private readonly agentWallet;
    private readonly portfolioService;
    private readonly positionRegistry;
    private readonly maxSignals;
    constructor(config: DecisionEngineConfig);
    run(now?: Date): Promise<DecisionCycleResult>;
    private evaluateExits;
    private isSignalReversal;
    private buildBuyRecommendation;
    private buildSellRecommendation;
    private persistRecommendations;
}
//# sourceMappingURL=decision-engine.d.ts.map