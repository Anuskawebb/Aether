import { MockExecutor } from './mock-executor.js';
import { TwakExecutor } from './twak-executor.js';
/**
 * Returns the appropriate Executor implementation based on runtime environment.
 *
 * TWAK_AGENT=true  → TwakExecutor (live BSC swaps via TWAK sidecar)
 * otherwise        → MockExecutor (deterministic, no blockchain dependency)
 *
 * ExecutionEngine is never modified when switching between executors.
 */
export function createExecutor() {
    if (process.env.TWAK_AGENT === 'true') {
        return new TwakExecutor();
    }
    return new MockExecutor();
}
//# sourceMappingURL=executor-factory.js.map