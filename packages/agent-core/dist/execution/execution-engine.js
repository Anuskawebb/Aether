import { ExecutionOrdersRepository, ExecutionTransactionsRepository, TradeRecommendationsRepository, } from '@toro/db';
import { PositionRegistryService } from '../position/position-registry-service.js';
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
export class ExecutionEngine {
    agentId;
    agentWallet;
    executor;
    positionRegistry;
    constructor(config, executor) {
        this.agentId = config.agentId;
        this.agentWallet = config.agentWallet.toLowerCase();
        this.executor = executor;
        this.positionRegistry = new PositionRegistryService(config.agentWallet);
    }
    // ── Public API ─────────────────────────────────────────────────────────────
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
    async createOrders(plans, recommendations, decisionTraceId) {
        const recMap = new Map(recommendations.map(r => [r.id, r]));
        let created = 0;
        for (const plan of plans) {
            const rec = recMap.get(plan.recommendationId);
            if (!rec)
                continue;
            // Derive tokenAddress from plan routing:
            //   BUY:  USDT → token  → tokenOut is the token
            //   SELL: token → USDT  → tokenIn is the token
            const tokenAddress = plan.action === 'BUY' ? plan.tokenOut : plan.tokenIn;
            const row = await ExecutionOrdersRepository.createOrder({
                agentId: this.agentId,
                agentWallet: this.agentWallet,
                decisionTraceId,
                recommendationId: plan.recommendationId,
                tokenAddress,
                tokenSymbol: rec.tokenSymbol,
                action: plan.action,
                amountUsd: plan.amountUsd,
                slippageLimitPct: plan.slippageLimitPct,
                positionSizePct: rec.positionSizePct,
                entryPriceUsd: rec.entryPriceUsd,
                stopLossPct: rec.stopLossPct,
                takeProfitPct: rec.takeProfitPct,
            });
            if (row)
                created++;
        }
        return created;
    }
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
    async processOrders(now = new Date()) {
        const start = Date.now();
        const orders = await ExecutionOrdersRepository.getPendingOrders(this.agentId);
        let ordersFilled = 0;
        let ordersFailed = 0;
        let positionsOpened = 0;
        let positionsClosed = 0;
        for (const order of orders) {
            await ExecutionOrdersRepository.markProcessing(order.id, now);
            const execOrder = {
                id: order.id,
                agentId: order.agentId,
                agentWallet: order.agentWallet,
                recommendationId: order.recommendationId,
                tokenAddress: order.tokenAddress,
                tokenSymbol: order.tokenSymbol,
                action: order.action,
                amountUsd: order.amountUsd,
                positionSizePct: order.positionSizePct,
                entryPriceUsd: order.entryPriceUsd,
                stopLossPct: order.stopLossPct,
                takeProfitPct: order.takeProfitPct,
                slippageLimitPct: order.slippageLimitPct,
            };
            let result;
            try {
                result = await this.executor.execute(execOrder);
            }
            catch (e) {
                const msg = e instanceof Error ? e.message : String(e);
                await ExecutionOrdersRepository.markFailed(order.id, `executor_threw: ${msg}`, now);
                await ExecutionTransactionsRepository.createTransaction({
                    agentId: order.agentId,
                    agentWallet: order.agentWallet,
                    orderId: order.id,
                    txHash: '',
                    chain: 'mock',
                    status: 'FAILED',
                    errorMessage: msg,
                    executedAt: now,
                });
                ordersFailed++;
                continue;
            }
            // Record the transaction outcome regardless of success/failure
            await ExecutionTransactionsRepository.createTransaction({
                agentId: order.agentId,
                agentWallet: order.agentWallet,
                orderId: order.id,
                txHash: result.txHash,
                chain: 'mock',
                status: result.success ? 'SUCCESS' : 'FAILED',
                errorMessage: result.errorMessage,
                executedAt: now,
            });
            if (!result.success) {
                await ExecutionOrdersRepository.markFailed(order.id, result.errorMessage ?? 'executor_returned_failure', now);
                ordersFailed++;
                continue;
            }
            // ── Successful execution: position lifecycle ───────────────────────────
            if (order.action === 'BUY') {
                try {
                    await this.positionRegistry.openPosition({
                        tokenAddress: order.tokenAddress,
                        tokenSymbol: order.tokenSymbol,
                        recommendationId: order.recommendationId,
                        entryPriceUsd: order.entryPriceUsd,
                        positionSizeUsd: order.amountUsd,
                        positionSizePct: order.positionSizePct,
                        stopLossPct: order.stopLossPct,
                        takeProfitPct: order.takeProfitPct,
                        openedAt: now,
                    });
                    positionsOpened++;
                }
                catch (e) {
                    // 23505 = position_already_open (DecisionEngine or concurrent fill)
                    const msg = e instanceof Error ? e.message : String(e);
                    await ExecutionOrdersRepository.markFailed(order.id, `position_open_failed: ${msg}`, now);
                    ordersFailed++;
                    continue;
                }
            }
            else {
                // SELL: attempt close. If null (already closed by DecisionEngine exit engine),
                // the fill is still valid — the position was closed before SELL rec was generated.
                const closed = await this.positionRegistry.closePosition(order.tokenAddress, order.entryPriceUsd, // entryPriceUsd in SELL rec = current market price at decision time
                'MANUAL', now);
                if (closed)
                    positionsClosed++;
            }
            await ExecutionOrdersRepository.markFilled(order.id, now);
            await TradeRecommendationsRepository.markExecuted(order.recommendationId);
            ordersFilled++;
        }
        return {
            ordersProcessed: orders.length,
            ordersFilled,
            ordersFailed,
            positionsOpened,
            positionsClosed,
            durationMs: Date.now() - start,
        };
    }
}
//# sourceMappingURL=execution-engine.js.map