import { ExecutionAccountsRepository } from '@toro/db';
import { TwakClient } from './twak-client.js';
const DEFAULT_CHAIN = 'smartchain'; // BSC in TWAK naming
export class WalletService {
    client;
    constructor(client) {
        this.client = client ?? new TwakClient();
    }
    /**
     * Ensures an execution_accounts row exists for the given agentId.
     * Creates one by fetching the wallet address from TWAK if missing.
     * Idempotent — safe to call on every startup.
     */
    async ensureWallet(agentId) {
        const existing = await ExecutionAccountsRepository.getByAgentId(agentId);
        if (existing)
            return existing;
        // Fetch the BSC address from TWAK
        const { addresses } = await this.client.getAddresses();
        const bscAddress = addresses.find((a) => a.chainId === DEFAULT_CHAIN || a.chainId === 'bsc' || a.chainId === '56');
        if (!bscAddress) {
            throw new Error(`TWAK returned no BSC address for agentId=${agentId}`);
        }
        return ExecutionAccountsRepository.create({
            agentId,
            accountType: 'TWAK_AGENT',
            walletAddress: bscAddress.address,
            status: 'ACTIVE',
            metadata: {
                chain: DEFAULT_CHAIN,
                createdBy: 'wallet-service',
            },
        });
    }
    /**
     * Returns the on-chain identity of the agent's wallet.
     */
    async getWallet(agentId) {
        const account = await ExecutionAccountsRepository.getByAgentId(agentId);
        if (!account)
            return null;
        return {
            address: account.walletAddress,
            status: account.status,
            accountType: account.accountType,
        };
    }
    /**
     * Returns native BNB balance plus any token holdings.
     */
    async getBalance(agentId) {
        const account = await ExecutionAccountsRepository.getActive(agentId);
        if (!account)
            throw new Error(`No active execution account for agentId=${agentId}`);
        const bnb = await this.client.getBalance(DEFAULT_CHAIN);
        return {
            nativeBalance: bnb.balance,
            nativeSymbol: bnb.symbol,
            usdValue: bnb.usdValue,
            tokens: [], // Populated by getPortfolio — balance is BNB only
        };
    }
    /**
     * Returns full token portfolio via TWAK get_token_holdings.
     */
    async getPortfolio(agentId) {
        const account = await ExecutionAccountsRepository.getActive(agentId);
        if (!account)
            throw new Error(`No active execution account for agentId=${agentId}`);
        const portfolio = await this.client.getPortfolio();
        return {
            totalValueUsd: portfolio.totalUsdValue ?? '0',
            assets: portfolio.assets,
        };
    }
}
//# sourceMappingURL=wallet-service.js.map