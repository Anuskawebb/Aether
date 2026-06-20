import { type TradeRecommendationRow } from '@toro/db';
import { type ExecutionPlan } from '../decision/trade-recommendation-types.js';
import { type Executor } from './executor.js';
export interface ExecutionEngineConfig {
    /** Stable agent identity — survives wallet rotations. */
    agentId: string;
    agentWallet: string;
}
export interface ExecutionCycleResult {
    ordersProcessed: number;
    ordersFilled: number;
    ordersFailed: number;
    positionsOpened: number;
    positionsClosed: number;
    durationMs: number;
}
/**
 * ExecutionEngine — orchestrates the order lifecycle between Decision and Execution.
 *
 * Flow:
 *   createOrders(plans, recommendations)  — called by orchestrator after DecisionEngine.run()
 *   processOrders()                        — called by orchestrator to execute pending orders
 *
 * The engine never knows whether execution is mock or real.
 * It depends only on the Executor interface.
 *
 * Phase 8A: paired with MockExecutor.
 * Phase 8B: paired with TwakExecutor — no changes to this file.
 */
export declare class ExecutionEngine {
    private readonly agentId;
    private readonly agentWallet;
    private readonly executor;
    private readonly positionRegistry;
    constructor(config: ExecutionEngineConfig, executor: Executor);
    /**
     * Creates PENDING execution orders from the given ExecutionPlans.
     *
     * Each plan is joined with its matching recommendation (by recommendationId)
     * to retrieve risk parameters needed for position lifecycle.
     *
     * Idempotent: if an order already exists for a given recommendationId
     * (unique index), it is silently skipped — not duplicated.
     *
     * @returns number of orders actually created (skipped duplicates = 0 contribution)
     */
    createOrders(plans: ExecutionPlan[], recommendations: TradeRecommendationRow[], decisionTraceId?: string): Promise<number>;
    /**
     * Processes all PENDING orders for this agent.
     *
     * Per order:
     *   1. Mark PROCESSING (status guard prevents concurrent double-execution)
     *   2. Execute through Executor (mock or real)
     *   3. Record execution_transaction
     *   4. On success: open/close position → mark FILLED → mark recommendation EXECUTED
     *   5. On failure: mark FAILED with reason
     *
     * Returns structured metrics for observability.
     */
    processOrders(now?: Date): Promise<ExecutionCycleResult>;
}
//# sourceMappingURL=execution-engine.d.ts.map