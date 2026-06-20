import { TwakConfigSchema } from './twak-config.js';
export class TwakClient {
    config;
    constructor(config = {}) {
        this.config = TwakConfigSchema.parse(config);
    }
    async request(action, body = {}) {
        const headers = {
            'Content-Type': 'application/json',
        };
        if (process.env.TWAK_HMAC_SECRET) {
            headers['Authorization'] = `Bearer ${process.env.TWAK_HMAC_SECRET}`;
        }
        if (this.config.password) {
            headers['x-wallet-password'] = this.config.password;
        }
        const url = `${this.config.apiUrl}/actions/${action}`;
        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
        });
        if (!response.ok) {
            let errorText = '';
            try {
                errorText = await response.text();
            }
            catch (e) {
                errorText = response.statusText;
            }
            throw new Error(`TWAK API Error (${response.status}): ${errorText}`);
        }
        return response.json();
    }
    /**
     * Health Check
     * Verifies if the sidecar is reachable and authenticated.
     */
    async healthCheck() {
        try {
            const res = await this.request('get_wallet_status');
            // If it doesn't throw, we assume it's reachable and configured
            return { status: res ? 'healthy' : 'unhealthy' };
        }
        catch (error) {
            console.error('HealthCheck Error:', error);
            return { status: 'unhealthy' };
        }
    }
    /**
     * Wallet Discovery
     * Fetches the current wallet status including chain support.
     */
    async getWalletStatus() {
        const res = await this.request('get_wallet_status');
        return {
            agentWallet: res.isConfigured ? 'configured' : 'not configured',
            chains: res.supportedChains?.length || 0,
            supportedChains: res.supportedChains?.length || 0,
        };
    }
    /**
     * Fetches derived addresses.
     */
    async getAddresses() {
        const res = await this.request('list_addresses');
        // Map response if it's not exactly the shape we expect
        return { addresses: res.addresses || res };
    }
    /**
     * Wallet Balance
     * Fetches the balance of the native token for a given chain.
     */
    async getBalance(chain) {
        const addrRes = await this.request('get_address', { chain });
        const res = await this.request('wallet_balance', { chain, address: addrRes.address });
        return {
            chain,
            symbol: res.symbol || 'NATIVE',
            balance: typeof res.balance === 'object' ? res.balance.amount || res.balance.value : res.balance || res.amount || '0',
            usdValue: res.usdValue || res.fiatValue,
        };
    }
    /**
     * Wallet Portfolio
     * Fetches the full portfolio of assets across chains.
     */
    async getPortfolio() {
        const chain = 'smartchain';
        const addrRes = await this.request('get_address', { chain });
        const res = await this.request('get_token_holdings', { chain, address: addrRes.address });
        return {
            totalUsdValue: res.totalUsdValue || res.totalFiatValue || '0',
            assets: res.holdings || res.tokens || [],
        };
    }
    /**
     * Execute a token swap on BSC via TWAK.
     * Returns TwakSwapResult — callers must check `result.success` before trusting `hash`.
     */
    async swap(params) {
        return this.request('swap', {
            fromChain: 'bsc',
            fromToken: params.fromToken,
            toChain: 'bsc',
            toToken: params.toToken,
            amount: params.amount,
            slippage: params.slippage ?? '1',
        });
    }
    /**
     * Get a swap quote without executing.
     * Use for pre-flight checks and validation scripts.
     */
    async getSwapQuote(params) {
        return this.request('get_swap_quote', {
            fromChain: 'bsc',
            fromToken: params.fromToken,
            toChain: 'bsc',
            toToken: params.toToken,
            amount: params.amount,
        });
    }
    /**
     * Get the current USD price for a token on BSC.
     * Returns null if the token is not found or TWAK cannot price it.
     */
    async getTokenPrice(token) {
        try {
            const res = await this.request('get_token_price', {
                chain: 'bsc',
                token,
            });
            if (res.success && typeof res.priceUsd === 'number' && res.priceUsd > 0) {
                return res.priceUsd;
            }
            return null;
        }
        catch {
            return null;
        }
    }
}
//# sourceMappingURL=twak-client.js.map