/**
 * Executor abstraction — the only interface ExecutionEngine depends on for swap execution.
 *
 * Phase 8A: implemented by MockExecutor (no blockchain dependency).
 * Phase 8B: implemented by TwakExecutor (real BSC swaps via TWAK SDK).
 *
 * ExecutionEngine must never be modified when switching executor implementations.
 */
export interface ExecutionOrder {
    id: string;
    agentId: string;
    agentWallet: string;
    recommendationId: string;
    tokenAddress: string;
    tokenSymbol: string;
    action: 'BUY' | 'SELL';
    amountUsd: number;
    positionSizePct: number;
    entryPriceUsd: number;
    stopLossPct: number;
    takeProfitPct: number;
    slippageLimitPct: number;
}
export interface ExecutionResult {
    success: boolean;
    txHash: string;
    errorMessage: string | null;
}
export interface Executor {
    execute(order: ExecutionOrder): Promise<ExecutionResult>;
}
//# sourceMappingURL=executor.d.ts.map