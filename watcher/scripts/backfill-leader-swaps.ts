/**
 * Scans historical Swap events from the WSOMI/USDC.e QuickSwap pool,
 * filters for our tracked star traders, and writes real data to leader_swaps.
 *
 * Run: npx tsx scripts/backfill-leader-swaps.ts
 */
import 'dotenv/config';
import { createPublicClient, http, defineChain } from 'viem';
import { PrismaClient } from '@prisma/client';
import { ALGEBRA_SWAP_ABI, sqrtPriceX96ToWsomiUsd } from '../src/price.js';
import { ADDRESSES, POOL } from '../src/config.js';

const somniaMainnet = defineChain({
  id: 5031,
  name: 'Somnia Mainnet',
  nativeCurrency: { decimals: 18, name: 'STT', symbol: 'STT' },
  rpcUrls: { default: { http: ['https://api.infra.mainnet.somnia.network/'] } },
});

const client = createPublicClient({ chain: somniaMainnet, transport: http() });
const prisma  = new PrismaClient();

// Known routers/contracts to skip — not real traders
const SKIP = new Set([
  '0x1582f6f3d26658f7208a799be46e34b1f366ce44', // QuickSwap SwapRouter
]);

const CHUNK = 900n;
// Scan last ~500k blocks (~2 days at Somnia's speed)
const SCAN_BLOCKS = 500_000n;

async function main() {
  // Delete the mock seed row first
  await prisma.leaderSwap.deleteMany({
    where: { txHash: '0xabc123testswap456def' }
  });
  console.log('Cleared mock data');

  const latest    = await client.getBlockNumber();
  const fromBlock = latest > SCAN_BLOCKS ? latest - SCAN_BLOCKS : 0n;

  console.log(`Scanning blocks ${fromBlock} → ${latest} (${SCAN_BLOCKS} blocks)…`);

  let totalFound = 0;
  let inserted   = 0;

  for (let start = fromBlock; start < latest; start += CHUNK) {
    const end  = start + CHUNK - 1n < latest ? start + CHUNK - 1n : latest;
    process.stdout.write(`\r  ${start}…${end}`);

    const logs = await client.getContractEvents({
      address:   ADDRESSES.wsomiUsdcePool,
      abi:       ALGEBRA_SWAP_ABI,
      eventName: 'Swap',
      fromBlock: start,
      toBlock:   end,
    });

    for (const log of logs) {
      const recipient = (log.args.recipient as string).toLowerCase();
      if (SKIP.has(recipient)) continue;

      totalFound++;

      const amount0   = log.args.amount0 as bigint;
      const amount1   = log.args.amount1 as bigint;
      const price     = log.args.price   as bigint;
      const txHash    = log.transactionHash ?? '0x';

      const wsomiPrice = sqrtPriceX96ToWsomiUsd(price);
      const isBuy      = amount0 < 0n;
      const usdValue   = Math.abs(Number(amount1)) / 10 ** POOL.token1.decimals;

      // Get block timestamp
      let timestamp = new Date();
      try {
        const block = await client.getBlock({ blockNumber: log.blockNumber ?? 0n });
        timestamp = new Date(Number(block.timestamp) * 1000);
      } catch { /* use now as fallback */ }

      // Upsert — skip if tx already recorded
      const existing = await prisma.leaderSwap.findFirst({ where: { txHash } });
      if (existing) continue;

      await prisma.leaderSwap.create({
        data: {
          leader:     recipient,
          side:       isBuy ? 'BUY' : 'SELL',
          tokenIn:    isBuy ? POOL.token1.symbol : POOL.token0.symbol,
          tokenOut:   isBuy ? POOL.token0.symbol : POOL.token1.symbol,
          usdValue:   Math.abs(usdValue),
          wsomiPrice,
          txHash,
          timestamp,
        }
      });
      inserted++;
    }
  }

  console.log(`\n\nDone. Found ${totalFound} trades from tracked leaders, inserted ${inserted} new records.`);

  // Show what we have per leader
  const summary = await prisma.leaderSwap.groupBy({
    by: ['leader'],
    _count: { id: true },
    _max:   { timestamp: true },
    orderBy: { _count: { id: 'desc' } },
  });

  console.log('\nLeader swap summary:');
  for (const row of summary) {
    console.log(`  ${row.leader}  ${row._count.id} swaps  last: ${row._max.timestamp?.toISOString()}`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
