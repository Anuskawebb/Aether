import { createPublicClient, http, parseAbiItem } from 'viem';
import { mantleSepolia, VAULT_MANAGER_ADDRESS }  from './config.js';
import { log, warn, error }                       from './logger.js';
import { consumeStopLoss }                        from './stop-loss-registry.js';
import { writeHeartbeat }                         from './heartbeat.js';
import type { Db }                                from './db.js';

const VAULT_MANAGER = VAULT_MANAGER_ADDRESS;

const EVENTS = [
  parseAbiItem('event PositionOpened(bytes32 indexed positionId, bytes32 indexed vaultId, address token, uint256 ausdAllocated, uint256 entryPrice)'),
  parseAbiItem('event PositionClosed(bytes32 indexed positionId, bytes32 indexed vaultId, int256 pnl, uint256 exitPrice)'),
] as const;

// On-chain token addresses (Mantle Mainnet — VaultManager uses these as
// price-oracle/allowlist keys, see frontend/config/tokens.ts MAINNET_TOKENS)
const ADDRESS_TO_SYMBOL: Record<string, string> = {
  '0x5d3a1ff2b6bab83b63cd9ad0787074081a52ef34': 'USDe',
  '0x78c1b0c915c4faa5fffa6cabf0219da63d7f4cb8': 'WMNT',
  '0x09bc4e0d864854c6afb6eb9a9cdf58ac190d0df9': 'USDC',
  '0x201eba5cc46d216ce6dc03f6a759e8e766e956ae': 'USDT',
};

const client = createPublicClient({
  chain:     mantleSepolia,
  transport: http('https://rpc.sepolia.mantle.xyz'),
});

async function handleLog(logEntry: any, db: Db): Promise<void> {
  const { eventName, args, transactionHash, blockNumber } = logEntry;

  if (eventName === 'PositionOpened') {
    const { positionId, vaultId, token, ausdAllocated, entryPrice } = args;

    const vault = await db.findVaultByOnChainId(vaultId.toLowerCase()).catch(() => null);
    if (!vault) {
      warn('vault-listener', `no UserVault for onChainVaultId=${(vaultId as string).slice(0, 10)}… — skipping`);
      return;
    }

    // Use block timestamp for openedAt
    let openedAt = new Date();
    try {
      const block = await client.getBlock({ blockNumber });
      openedAt    = new Date(Number(block.timestamp) * 1000);
    } catch { /* fallback to now */ }

    const symbol = ADDRESS_TO_SYMBOL[(token as string).toLowerCase()] ?? (token as string);

    // Latency = time between the leader's source trade and our position open
    let latencyMs: number | undefined;
    try {
      const lastSwap = await db.getLatestLeaderSwap(vault.leader);
      if (lastSwap && lastSwap.timestamp <= openedAt.getTime()) {
        latencyMs = openedAt.getTime() - lastSwap.timestamp;
      }
    } catch { /* non-critical */ }

    await db.upsertOnChainPosition({
      onChainPositionId: (positionId as string).toLowerCase(),
      follower:          vault.follower,
      leader:            vault.leader,
      vaultId:           vault.id,
      token:             symbol,
      ausdcAllocated:    Number(ausdAllocated as bigint) / 1e6,
      entryPrice:        Number(entryPrice as bigint) / 1e10,
      status:            'OPEN',
      openedAt,
      txHashOpen:        transactionHash,
      latencyMs,
    });

    log(
      'vault-listener',
      `PositionOpened  posId=${(positionId as string).slice(0, 10)}…  ` +
      `token=${symbol}  alloc=${(Number(ausdAllocated as bigint) / 1e6).toFixed(2)} aUSD  ` +
      `entry=$${(Number(entryPrice as bigint) / 1e10).toFixed(4)}`
    );

  } else if (eventName === 'PositionClosed') {
    const { positionId, pnl, exitPrice } = args;
    const posId       = (positionId as string).toLowerCase();
    const isStopLoss  = consumeStopLoss(posId);

    await db.closeOnChainPosition({
      onChainPositionId: posId,
      pnl:               Number(pnl as bigint) / 1e6,
      exitPrice:         Number(exitPrice as bigint) / 1e10,
      closedAt:          new Date(),
      txHashClose:       transactionHash,
      closeReason:       isStopLoss ? 'STOP_LOSS' : undefined,
    });

    const pnlSign = Number(pnl as bigint) >= 0 ? '+' : '';
    log(
      'vault-listener',
      `PositionClosed  posId=${(positionId as string).slice(0, 10)}…  ` +
      `pnl=${pnlSign}${(Number(pnl as bigint) / 1e6).toFixed(4)} aUSD`
    );
  }
}

/** Polls VaultManager for PositionOpened/PositionClosed events and writes
 *  them to the `positions` table so the frontend can read from DB instead of RPC. */
export function startVaultListener(db: Db): () => void {
  if (!VAULT_MANAGER) {
    warn('vault-listener', 'VAULT_MANAGER_ADDRESS not set — skipping');
    return () => {};
  }

  let lastBlock: bigint | null = null;

  const poll = async () => {
    try {
      writeHeartbeat(); // fire-and-forget; non-blocking
      const latest = await client.getBlockNumber();

      if (lastBlock === null) {
        // First run: start from DEPLOY_BLOCK to backfill historical positions.
        // TODO: set to the actual VaultManager deployment block on Mantle Sepolia.
        lastBlock = 0n;
        log('vault-listener', `starting backfill from block ${lastBlock} to ${latest}…`);
      }

      if (latest <= lastBlock) return;

      let newLogs: any[] = [];
      for (let from = lastBlock; from <= latest; from += 1000n) {
        const to    = from + 999n > latest ? latest : from + 999n;
        const chunk = await client.getLogs({
          address:   VAULT_MANAGER,
          events:    EVENTS,
          fromBlock: from,
          toBlock:   to,
        });
        newLogs = newLogs.concat(chunk);
      }

      lastBlock = latest;

      if (newLogs.length > 0) {
        log('vault-listener', `processing ${newLogs.length} event(s) up to block ${latest}`);
        for (const l of newLogs) await handleLog(l, db);
      }
    } catch (e) {
      error('vault-listener', 'poll failed', e);
    }
  };

  // Run immediately (backfill), then every 15 seconds
  poll();
  const timer = setInterval(poll, 15_000);
  log('vault-listener', 'started (15s poll interval)');
  return () => clearInterval(timer);
}
