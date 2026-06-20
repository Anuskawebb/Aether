import { type Executor, type ExecutionOrder, type ExecutionResult } from './executor.js';
/**
 * MockExecutor — validates the full execution lifecycle without any blockchain dependency.
 *
 * Always succeeds unless constructed with { shouldFail: true }.
 * tx_hash = 'mock_tx_<orderId>' — deterministic, traceable per order.
 *
 * Phase 8B: replace with TwakExecutor. ExecutionEngine requires no changes.
 */
export declare class MockExecutor implements Executor {
    private readonly shouldFail;
    private readonly failureMessage;
    constructor(options?: {
        shouldFail?: boolean;
        failureMessage?: string;
    });
    execute(order: ExecutionOrder): Promise<ExecutionResult>;
}
//# sourceMappingURL=mock-executor.d.ts.map