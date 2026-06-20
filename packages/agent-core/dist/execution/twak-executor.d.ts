import { type Executor, type ExecutionOrder, type ExecutionResult } from './executor.js';
import { type TwakConfig } from './twak/twak-config.js';
/**
 * TwakExecutor — live BSC swap execution via the TWAK sidecar.
 *
 * Drop-in replacement for MockExecutor. ExecutionEngine requires no changes.
 *
 * BUY:  converts amountUsd → BNB amount → swaps BNB → tokenAddress
 * SELL: uses entryPriceUsd (current market price at decision time per ExecutionEngine
 *       convention) to compute tokenAmount → swaps tokenAddress → BNB
 *
 * Pricing priority for BNB:
 *   1. Price DB (WBNB tracked by watcher when live data exists)
 *   2. TWAK live price oracle (get_token_price action)
 *   3. Error — never silently falls back to a hardcoded value
 */
export declare class TwakExecutor implements Executor {
    private readonly client;
    constructor(config?: Partial<TwakConfig>);
    execute(order: ExecutionOrder): Promise<ExecutionResult>;
    /**
     * Optional pre-flight check. Call before wiring TwakExecutor into ExecutionEngine.
     */
    healthCheck(): Promise<{
        reachable: boolean;
        walletConfigured: boolean;
    }>;
    private executeBuy;
    private executeSell;
    private mapSwapResult;
    /**
     * Resolves the current BNB/USD price.
     *
     * 1. Price DB via PriceService.getBnbPrice() — populated by watcher when live.
     * 2. TWAK get_token_price action — live oracle from the sidecar.
     * 3. Throws — no silent hardcoded fallback (would produce wrong trade sizes).
     */
    private resolveBnbPrice;
}
//# sourceMappingURL=twak-executor.d.ts.map