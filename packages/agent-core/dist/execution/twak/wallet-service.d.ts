import { type ExecutionAccountRow } from '@toro/db';
import { TwakClient } from './twak-client.js';
import { type TwakBalance, type TwakPortfolio } from './twak-types.js';
export interface WalletInfo {
    address: string;
    status: string;
    accountType: string;
}
export interface WalletBalance {
    nativeBalance: string;
    nativeSymbol: string;
    usdValue: string | undefined;
    tokens: TwakBalance[];
}
export interface WalletPortfolio {
    totalValueUsd: string;
    assets: TwakPortfolio['assets'];
}
export declare class WalletService {
    private readonly client;
    constructor(client?: TwakClient);
    /**
     * Ensures an execution_accounts row exists for the given agentId.
     * Creates one by fetching the wallet address from TWAK if missing.
     * Idempotent — safe to call on every startup.
     */
    ensureWallet(agentId: string): Promise<ExecutionAccountRow>;
    /**
     * Returns the on-chain identity of the agent's wallet.
     */
    getWallet(agentId: string): Promise<WalletInfo | null>;
    /**
     * Returns native BNB balance plus any token holdings.
     */
    getBalance(agentId: string): Promise<WalletBalance>;
    /**
     * Returns full token portfolio via TWAK get_token_holdings.
     */
    getPortfolio(agentId: string): Promise<WalletPortfolio>;
}
//# sourceMappingURL=wallet-service.d.ts.map