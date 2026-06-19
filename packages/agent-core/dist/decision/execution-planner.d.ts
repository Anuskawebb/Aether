import { type TradeRecommendation, type ExecutionPlan } from './trade-recommendation-types.js';
/**
 * Converts a BUY or SELL recommendation into an execution-ready plan.
 *
 * Phase 7 scope: produces the plan struct only.
 * Phase 8 scope: submits the plan to the execution router for on-chain swap.
 *
 * Routing logic:
 *   BUY:  stablecoin → target token
 *   SELL: target token → stablecoin
 *
 * For stablecoin-to-stablecoin swaps (e.g. buying a stable): tokenIn = tokenOut = stable.
 * This should not happen in practice since BSC_STABLES are excluded from signals.
 */
export declare function buildExecutionPlan(recommendation: TradeRecommendation): ExecutionPlan;
/**
 * Batch-converts an array of approved recommendations into execution plans.
 * Only BUY and SELL actions produce plans — HOLD and SKIP are ignored.
 */
export declare function buildExecutionPlans(recommendations: TradeRecommendation[]): ExecutionPlan[];
//# sourceMappingURL=execution-planner.d.ts.map