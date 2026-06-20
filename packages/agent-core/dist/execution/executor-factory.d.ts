import { type Executor } from './executor.js';
/**
 * Returns the appropriate Executor implementation based on runtime environment.
 *
 * TWAK_AGENT=true  → TwakExecutor (live BSC swaps via TWAK sidecar)
 * otherwise        → MockExecutor (deterministic, no blockchain dependency)
 *
 * ExecutionEngine is never modified when switching between executors.
 */
export declare function createExecutor(): Executor;
//# sourceMappingURL=executor-factory.d.ts.map