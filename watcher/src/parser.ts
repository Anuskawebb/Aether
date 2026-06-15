import { sqrtPriceX96ToTokenUsd } from './price.js';
import { STALE_BUY_MS, type PoolDef } from './config.js';

export type TradeSide = 'BUY' | 'SELL';

export interface SwapLog {
  sender:    `0x${string}`;
  recipient: `0x${string}`;
  amount0:   bigint;
  amount1:   bigint;
  price:     bigint;   // sqrtPriceX96 after swap
  liquidity: bigint;
  tick:      number;
  txHash:    `0x${string}`;
  blockTime: number;   // unix seconds
}

export interface TradeIntent {
  leader:      `0x${string}`;
  side:        TradeSide;
  tokenIn:     string;
  tokenOut:    string;
  usdValue:    number;
  wmntPrice:   number;
  txHash:      `0x${string}`;
  timestamp:   number;  // unix ms
  isStale:     boolean;
  dex:         string;
  poolAddress: `0x${string}`;
}

/**
 * Parse a Swap log for a tracked pool.
 *
 * token0 is always the "anchor" side — either a $1-pegged stable (USDe/USDT/USDC)
 * or WMNT (priced via `wmntPriceUsd`, a live oracle reading). token1 is the
 * asset of interest (WMNT/WETH/mETH/...).
 *
 * amount0 < 0 → token0 leaving pool → user BUYing token0 (selling token1)
 * amount0 > 0 → token0 entering pool → user SELLing token0 (buying token1)
 */
export function parseSwapLog(
  log:  SwapLog,
  pool: PoolDef,
  wmntPriceUsd: number,
): TradeIntent {
  const { token0, token1 } = pool;

  const ageMs = Date.now() - log.blockTime * 1000;

  // USD price of token0 — $1 for stables, or the live WMNT oracle price otherwise.
  const token0UsdPrice = token0.isStable ? 1 : wmntPriceUsd;

  // token1 (volatile asset) price derived from this event's post-swap price.
  const wmntPrice = sqrtPriceX96ToTokenUsd(log.price, pool, token0UsdPrice);

  // side: BUY = user receives token0, amount0 negative
  const isBuy = log.amount0 < 0n;
  const side: TradeSide = isBuy ? 'BUY' : 'SELL';
  const tokenIn  = isBuy ? token1.address : token0.address;
  const tokenOut = isBuy ? token0.address : token1.address;

  const usdValue = (Math.abs(Number(log.amount0)) / 10 ** token0.decimals) * token0UsdPrice;

  return {
    leader:    log.recipient,
    side,
    tokenIn,
    tokenOut,
    usdValue:  Math.abs(usdValue),
    wmntPrice,
    txHash:    log.txHash,
    timestamp: log.blockTime * 1000,
    isStale:   side === 'BUY' && ageMs > STALE_BUY_MS,
    dex:         pool.dex,
    poolAddress: pool.address,
  };
}
