/**
 * MockExecutor — validates the full execution lifecycle without any blockchain dependency.
 *
 * Always succeeds unless constructed with { shouldFail: true }.
 * tx_hash = 'mock_tx_<orderId>' — deterministic, traceable per order.
 *
 * Phase 8B: replace with TwakExecutor. ExecutionEngine requires no changes.
 */
export class MockExecutor {
    shouldFail;
    failureMessage;
    constructor(options = {}) {
        this.shouldFail = options.shouldFail ?? false;
        this.failureMessage = options.failureMessage ?? 'mock_executor_configured_to_fail';
    }
    async execute(order) {
        if (this.shouldFail) {
            return {
                success: false,
                txHash: '',
                errorMessage: this.failureMessage,
            };
        }
        return {
            success: true,
            txHash: `mock_tx_${order.id}`,
            errorMessage: null,
        };
    }
}
//# sourceMappingURL=mock-executor.js.map