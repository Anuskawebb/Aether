import { NextResponse }       from 'next/server';
import { prisma }             from '@/lib/prisma';
import { createPublicClient, http, defineChain, formatUnits } from 'viem';
import { Redis }              from '@upstash/redis';

// ── Chain ──────────────────────────────────────────────────────────────────

const mantleMainnet = defineChain({
  id: 5000,
  name: 'Mantle',
  nativeCurrency: { decimals: 18, name: 'MNT', symbol: 'MNT' },
  rpcUrls: { default: { http: ['https://rpc.mantle.xyz'] } },
});

// Agni Finance (Algebra fork) USDe/WMNT pool — verified active on-chain.
// token0 = USDe (18 dec, $1-pegged), token1 = WMNT (18 dec)
const POOL = '0xeAFC4d6D4c3391cd4fc10c85D2f5F972D58C0Dd5' as const;
const TOKEN0_DECIMALS = 18;
const TOKEN1_DECIMALS = 18;

// Agni's AlgebraPool Swap event (extends the standard Algebra Swap with
// protocol fee fields) — verified against mantlescan source for this pool.
const SWAP_ABI = [{
  anonymous: false,
  inputs: [
    { indexed: true,  name: 'sender',             type: 'address' },
    { indexed: true,  name: 'recipient',          type: 'address' },
    { indexed: false, name: 'amount0',             type: 'int256'  },
    { indexed: false, name: 'amount1',             type: 'int256'  },
    { indexed: false, name: 'sqrtPriceX96',        type: 'uint160' },
    { indexed: false, name: 'liquidity',           type: 'uint128' },
    { indexed: false, name: 'tick',                type: 'int24'   },
    { indexed: false, name: 'protocolFeesToken0',  type: 'uint128' },
    { indexed: false, name: 'protocolFeesToken1',  type: 'uint128' },
  ],
  name: 'Swap',
  type: 'event',
}] as const;

// ── Redis cache (10-min TTL) ───────────────────────────────────────────────

const redis = new Redis({
  url:   process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const CACHE_KEY = 'stellalpha:traders:v2';
const CACHE_TTL = 600; // seconds

// ── On-chain scan ──────────────────────────────────────────────────────────

async function scanTraders() {
  const client = createPublicClient({ chain: mantleMainnet, transport: http() });
  const latest = await client.getBlockNumber();
  // ~28 hours of history at ~2s/block
  const RANGE = 50_000n;
  const CHUNK = 10_000n;
  const fromBlock = latest > RANGE ? latest - RANGE : 0n;

  type Stats = {
    address: string;
    buys: number;
    sells: number;
    volumeUsde: number;
    netUsde: bigint;
    netWmnt: bigint;
  };
  const map = new Map<string, Stats>();

  for (let start = fromBlock; start < latest; start += CHUNK) {
    const end  = start + CHUNK - 1n < latest ? start + CHUNK - 1n : latest;
    const logs = await client.getContractEvents({
      address: POOL, abi: SWAP_ABI, eventName: 'Swap',
      fromBlock: start, toBlock: end,
    });

    for (const log of logs) {
      const recipient = (log.args.recipient as string).toLowerCase();
      const amount0   = log.args.amount0 as bigint;
      const amount1   = log.args.amount1 as bigint;
      const isBuy     = amount0 < 0n; // pool gave out token0 (USDe) -> recipient bought USDe
      const usdeValue = Math.abs(Number(formatUnits(amount0, TOKEN0_DECIMALS)));

      const s = map.get(recipient) ?? {
        address: recipient, buys: 0, sells: 0, volumeUsde: 0,
        netUsde: 0n, netWmnt: 0n,
      };
      map.set(recipient, {
        ...s,
        buys:       isBuy ? s.buys + 1 : s.buys,
        sells:      isBuy ? s.sells : s.sells + 1,
        volumeUsde: s.volumeUsde + usdeValue,
        // pool's balance change is amount0/amount1, so the recipient's
        // balance change is the negation of each
        netUsde:    s.netUsde - amount0,
        netWmnt:    s.netWmnt - amount1,
      });
    }
  }

  // USDe is a $1-pegged stablecoin, so its USD value ≈ its token amount.
  // WMNT needs a live MNT/USD price to value the trader's net WMNT flow.
  let mntUsd = 0;
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=mantle&vs_currencies=usd');
    const json = await res.json();
    mntUsd = json?.mantle?.usd ?? 0;
  } catch {
    mntUsd = 0;
  }

  return [...map.values()]
    .map((s) => {
      const netUsdeNum = Number(formatUnits(s.netUsde, TOKEN0_DECIMALS));
      const netWmntNum = Number(formatUnits(s.netWmnt, TOKEN1_DECIMALS));
      const pnlUsd = netUsdeNum + netWmntNum * mntUsd;
      return {
        address:     s.address,
        buys:        s.buys,
        sells:       s.sells,
        volumeUsde:  s.volumeUsde,
        totalTrades: s.buys + s.sells,
        pnlUsd,
      };
    })
    .sort((a, b) => b.volumeUsde - a.volumeUsde);
}

// ── Handler ────────────────────────────────────────────────────────────────

export async function GET() {
  // 1. Try Redis cache first
  const cached = await redis.get<any[]>(CACHE_KEY);
  let onChainTraders = cached ?? null;

  if (!onChainTraders) {
    onChainTraders = await scanTraders();
    await redis.set(CACHE_KEY, onChainTraders, { ex: CACHE_TTL });
  }

  // 2. Enrich with DB stats (paper-trade P&L, follower counts)
  const addresses = onChainTraders.map((t) => t.address);

  const [followerCounts, tradeStats] = await Promise.all([
    prisma.follow.groupBy({
      by:    ['leader'],
      where: { leader: { in: addresses } },
      _count: { follower: true },
    }),
    prisma.paperTrade.groupBy({
      by:    ['leader'],
      where: { leader: { in: addresses }, status: 'CLOSED' },
      _count: { id: true },
      _sum:   { pnl: true },
    }),
  ]);

  const followerMap = new Map(followerCounts.map((r) => [r.leader, r._count.follower]));
  const statsMap    = new Map(tradeStats.map((r) => [r.leader, r]));

  const data = onChainTraders.map((t) => ({
    address:        t.address,
    buys:           t.buys,
    sells:          t.sells,
    totalTrades:    t.totalTrades,
    volumeUsde:     t.volumeUsde,
    pnlUsd:         t.pnlUsd,
    followerCount:  followerMap.get(t.address) ?? 0,
    copyTradeCount: statsMap.get(t.address)?._count.id ?? 0,
    totalPnl:       Number(statsMap.get(t.address)?._sum.pnl ?? 0),
  }));

  return NextResponse.json(data);
}
