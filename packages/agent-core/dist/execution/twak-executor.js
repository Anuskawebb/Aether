import { TwakClient } from './twak/twak-client.js';
import { PriceService } from '../valuation/price-service.js';
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
export class TwakExecutor {
    client;
    constructor(config = {}) {
        this.client = new TwakClient(config);
    }
    async execute(order) {
        try {
            return order.action === 'BUY'
                ? await this.executeBuy(order)
                : await this.executeSell(order);
        }
        catch (e) {
            return {
                success: false,
                txHash: '',
                errorMessage: e instanceof Error ? e.message : String(e),
            };
        }
    }
    /**
     * Optional pre-flight check. Call before wiring TwakExecutor into ExecutionEngine.
     */
    async healthCheck() {
        const health = await this.client.healthCheck();
        if (health.status !== 'healthy') {
            return { reachable: false, walletConfigured: false };
        }
        const status = await this.client.getWalletStatus();
        return { reachable: true, walletConfigured: status.agentWallet === 'configured' };
    }
    // ── Private ───────────────────────────────────────────────────────────────
    async executeBuy(order) {
        const bnbPrice = await this.resolveBnbPrice();
        const bnbAmount = (order.amountUsd / bnbPrice).toFixed(8);
        const res = await this.client.swap({
            fromToken: 'BNB',
            toToken: order.tokenAddress,
            amount: bnbAmount,
            slippage: order.slippageLimitPct.toString(),
        });
        return this.mapSwapResult(res);
    }
    async executeSell(order) {
        if (order.entryPriceUsd <= 0) {
            return {
                success: false,
                txHash: '',
                errorMessage: `sell_failed: entryPriceUsd is zero for ${order.tokenSymbol}`,
            };
        }
        // entryPriceUsd in a SELL order = current market price at decision time
        // (ExecutionEngine sets it to the market price when the SELL recommendation is generated).
        const tokenAmount = (order.amountUsd / order.entryPriceUsd).toFixed(8);
        const res = await this.client.swap({
            fromToken: order.tokenAddress,
            toToken: 'BNB',
            amount: tokenAmount,
            slippage: order.slippageLimitPct.toString(),
        });
        return this.mapSwapResult(res);
    }
    mapSwapResult(res) {
        if (!res.success) {
            return {
                success: false,
                txHash: '',
                errorMessage: res.message ?? res.code ?? 'swap_failed',
            };
        }
        if (res.hash) {
            console.info(`[TwakExecutor] swap ok | ${res.summary ?? ''} | provider=${res.provider ?? 'unknown'} | explorer=${res.explorer ?? 'n/a'}`);
        }
        return {
            success: true,
            txHash: res.hash ?? '',
            errorMessage: null,
        };
    }
    /**
     * Resolves the current BNB/USD price.
     *
     * 1. Price DB via PriceService.getBnbPrice() — populated by watcher when live.
     * 2. TWAK get_token_price action — live oracle from the sidecar.
     * 3. Throws — no silent hardcoded fallback (would produce wrong trade sizes).
     */
    async resolveBnbPrice() {
        const dbPrice = await PriceService.getBnbPrice();
        if (dbPrice > 0)
            return dbPrice;
        const livePrice = await this.client.getTokenPrice('BNB');
        if (livePrice !== null && livePrice > 0)
            return livePrice;
        throw new Error('BNB price unavailable: WBNB not in price DB and TWAK get_token_price returned null. ' +
            'Ensure watcher is running or TWAK sidecar is reachable.');
    }
}
//# sourceMappingURL=twak-executor.js.map