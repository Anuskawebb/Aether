import { TwakConfig } from './twak-config.js';
import { TwakHealth, TwakWalletStatus, TwakAddress, TwakBalance, TwakPortfolio, TwakSwapResult, TwakSwapQuote } from './twak-types.js';
export declare class TwakClient {
    private config;
    constructor(config?: Partial<TwakConfig>);
    private request;
    /**
     * Health Check
     * Verifies if the sidecar is reachable and authenticated.
     */
    healthCheck(): Promise<TwakHealth>;
    /**
     * Wallet Discovery
     * Fetches the current wallet status including chain support.
     */
    getWalletStatus(): Promise<TwakWalletStatus>;
    /**
     * Fetches derived addresses.
     */
    getAddresses(): Promise<{
        addresses: TwakAddress[];
    }>;
    /**
     * Wallet Balance
     * Fetches the balance of the native token for a given chain.
     */
    getBalance(chain: string): Promise<TwakBalance>;
    /**
     * Wallet Portfolio
     * Fetches the full portfolio of assets across chains.
     */
    getPortfolio(): Promise<TwakPortfolio>;
    /**
     * Execute a token swap on BSC via TWAK.
     * Returns TwakSwapResult — callers must check `result.success` before trusting `hash`.
     */
    swap(params: {
        fromToken: string;
        toToken: string;
        amount: string;
        slippage?: string;
    }): Promise<TwakSwapResult>;
    /**
     * Get a swap quote without executing.
     * Use for pre-flight checks and validation scripts.
     */
    getSwapQuote(params: {
        fromToken: string;
        toToken: string;
        amount: string;
    }): Promise<TwakSwapQuote>;
    /**
     * Get the current USD price for a token on BSC.
     * Returns null if the token is not found or TWAK cannot price it.
     */
    getTokenPrice(token: string): Promise<number | null>;
}
//# sourceMappingURL=twak-client.d.ts.map