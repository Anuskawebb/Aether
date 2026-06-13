/**
 * Scans historical Swap events on the WSOMI/USDC.e QuickSwap pool (Somnia Mainnet)
 * and ranks wallets by trade frequency and estimated P&L.
 * Run: npx tsx scripts/find-traders.ts
 */
import 'dotenv/config';
import { createPublicClient, http, defineChain } from 'viem';
import { ALGEBRA_SWAP_ABI, sqrtPriceX96ToWsomiUsd } from '../src/price.js';
import { ADDRESSES } from '../src/config.js';

const somniaMainnet = defineChain({
  id: 5031,
  name: 'Somnia Mainnet',
  nativeCurrency: { decimals: 18, name: 'STT', symbol: 'STT' },
  rpcUrls: { default: { http: ['https://api.infra.mainnet.somnia.network/'] } },
});

const client = createPublicClient({
  chain:     somniaMainnet,
  transport: http(),
});

const WSOMI_DEC = 18;
const USDC_DEC  = 6;

async function main() {
  console.log('Fetching latest block…');
  const latest = await client.getBlockNumber();
  // Scan last ~10,000 blocks (~few days on Somnia)
  // Somnia blocks are ~0.4s each; 500_000 blocks ≈ 2.3 days of history
  const fromBlock = latest > 500_000n ? latest - 500_000n : 0n;

  const CHUNK = 900n; // stay under RPC 1000-block limit
  console.log(`Scanning blocks ${fromBlock} → ${latest} in ${CHUNK}-block chunks…\n`);

  const logs = [];
  for (let start = fromBlock; start < latest; start += CHUNK) {
    const end = start + CHUNK - 1n < latest ? start + CHUNK - 1n : latest;
    process.stdout.write(`  ${start}…${end}\r`);
    const chunk = await client.getContractEvents({
      address:   ADDRESSES.wsomiUsdcePool,
      abi:       ALGEBRA_SWAP_ABI,
      eventName: 'Swap',
      fromBlock: start,
      toBlock:   end,
    });
    logs.push(...chunk);
  }

  console.log(`\nFound ${logs.length} swaps.\n`);

  if (logs.length === 0) {
    console.log('No swaps found in this range. Try increasing the block range.');
    return;
  }

  // Aggregate per sender
  type Stats = {
    address:    string;
    buys:       number;
    sells:      number;
    volumeUsdc: number;
    lastSeen:   bigint;
  };

  const traders = new Map<string, Stats>();

  for (const log of logs) {
    // Use recipient (who received tokens), not sender (usually the router)
    const sender    = (log.args.recipient as string).toLowerCase();
    const amount0   = log.args.amount0 as bigint;  // WSOMI
    const amount1   = log.args.amount1 as bigint;  // USDC.e
    const price     = log.args.price   as bigint;
    const wsomiUsd  = sqrtPriceX96ToWsomiUsd(price);

    const usdcValue = Math.abs(Number(amount1)) / 10 ** USDC_DEC;
    const isBuy     = amount0 < 0n; // WSOMI leaving pool = user buying

    const existing = traders.get(sender) ?? {
      address: sender, buys: 0, sells: 0, volumeUsdc: 0, lastSeen: 0n,
    };

    traders.set(sender, {
      ...existing,
      buys:       isBuy ? existing.buys + 1 : existing.buys,
      sells:      isBuy ? existing.sells : existing.sells + 1,
      volumeUsdc: existing.volumeUsdc + usdcValue,
      lastSeen:   log.blockNumber ?? existing.lastSeen,
    });
  }

  // Sort by total trades (buys + sells)
  const ranked = [...traders.values()]
    .map((t) => ({ ...t, totalTrades: t.buys + t.sells }))
    .sort((a, b) => b.volumeUsdc - a.volumeUsdc)
    .slice(0, 20);

  console.log('═══════════════════════════════════════════════════════════════');
  console.log(' TOP TRADERS on WSOMI/USDC.e Pool (Somnia Mainnet)');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Address                                     Trades  Volume');
  console.log('───────────────────────────────────────────────────────────────');

  for (let i = 0; i < ranked.length; i++) {
    const t = ranked[i];
    console.log(
      `  ${(i + 1).toString().padStart(2)}. ${t.address}  ` +
      `${t.totalTrades.toString().padStart(4)} trades  ` +
      `$${t.volumeUsdc.toFixed(2).padStart(12)}`
    );
  }

  console.log('───────────────────────────────────────────────────────────────');
  console.log('\nTo add top traders to the seed script, copy their addresses.');
  console.log('Run: npx tsx scripts/seed.ts (edit TEST_LEADER first)\n');
}

main().catch(console.error);
