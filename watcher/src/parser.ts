import { sqrtPriceX96ToWmntUsd } from './price.js';
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
  leader:    `0x${string}`;
  side:      TradeSide;
  tokenIn:   string;
  tokenOut:  string;
  usdValue:  number;
  wmntPrice: number;
  txHash:    `0x${string}`;
  timestamp: number;  // unix ms
  isStale:   boolean;
}

/**
 * Parse a Swap log for the USDe/WMNT pool.
 *
 * amount0 < 0 → token0 (USDe) leaving pool → user BUYing USDe (selling WMNT)
 * amount0 > 0 → token0 (USDe) entering pool → user SELLing USDe (buying WMNT)
 */
export function parseSwapLog(
  log:  SwapLog,
  pool: PoolDef,
): TradeIntent {
  const { token0, token1 } = pool;

  const ageMs = Date.now() - log.blockTime * 1000;

  // WMNT price derived directly from this event's post-swap price.
  const wmntPrice = sqrtPriceX96ToWmntUsd(log.price);

  // side: BUY = user receives token0 (USDe), amount0 negative
  const isBuy = log.amount0 < 0n;
  const side: TradeSide = isBuy ? 'BUY' : 'SELL';
  const tokenIn  = isBuy ? token1.address : token0.address;
  const tokenOut = isBuy ? token0.address : token1.address;

  // token0=USDe is $1-pegged stable — use it directly as the USD value of the swap.
  const usdValue = Math.abs(Number(log.amount0)) / 10 ** token0.decimals;

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
  };
}
