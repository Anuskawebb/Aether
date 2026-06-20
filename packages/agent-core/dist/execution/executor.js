/**
 * Executor abstraction — the only interface ExecutionEngine depends on for swap execution.
 *
 * Phase 8A: implemented by MockExecutor (no blockchain dependency).
 * Phase 8B: implemented by TwakExecutor (real BSC swaps via TWAK SDK).
 *
 * ExecutionEngine must never be modified when switching executor implementations.
 */
export {};
//# sourceMappingURL=executor.js.map