import { createPublicClient, http } from 'viem';
import { mantleMainnet, POOLS, type DexId, type PoolDef } from './config.js';

// Agni's pool exposes slot0 (Uniswap V3-style), not Algebra's globalState —
// used to read the current sqrtPriceX96 for the WMNT oracle pool.
export const SLOT0_ABI = [
  {
    inputs: [],
    name: 'slot0',
    outputs: [
      { name: 'sqrtPriceX96', type: 'uint160' },
      { name: 'tick', type: 'int24' },
      { name: 'observationIndex', type: 'uint16' },
      { name: 'observationCardinality', type: 'uint16' },
      { name: 'observationCardinalityNext', type: 'uint16' },
      { name: 'feeProtocol', type: 'uint8' },
      { name: 'unlocked', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const ALGEBRA_POOL_ABI = [
  {
    inputs: [],
    name: 'globalState',
    outputs: [
      { name: 'price',              type: 'uint160' },
      { name: 'tick',               type: 'int24'   },
      { name: 'fee',                type: 'uint16'  },
      { name: 'timepointIndex',     type: 'uint16'  },
      { name: 'communityFeeToken0', type: 'uint8'   },
      { name: 'communityFeeToken1', type: 'uint8'   },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Agni's AlgebraPool Swap event (extends the standard Algebra Swap with
// protocol fee fields) — verified against mantlescan source for the
// USDe/WMNT pool (matches frontend/app/api/traders/route.ts).
export const ALGEBRA_SWAP_ABI = [
  {
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
  },
] as const;

// Standard Uniswap V3 Swap event (FusionX V3 fork) — same core fields as
// Algebra's but without the trailing protocolFeesToken0/1.
export const UNIV3_SWAP_ABI = [
  {
    anonymous: false,
    inputs: [
      { indexed: true,  name: 'sender',      type: 'address' },
      { indexed: true,  name: 'recipient',   type: 'address' },
      { indexed: false, name: 'amount0',     type: 'int256'  },
      { indexed: false, name: 'amount1',     type: 'int256'  },
      { indexed: false, name: 'sqrtPriceX96', type: 'uint160' },
      { indexed: false, name: 'liquidity',   type: 'uint128' },
      { indexed: false, name: 'tick',        type: 'int24'   },
    ],
    name: 'Swap',
    type: 'event',
  },
] as const;

// Pick the right Swap event ABI for a pool's DEX/AMM.
export const SWAP_ABI_BY_DEX: Record<DexId, typeof ALGEBRA_SWAP_ABI | typeof UNIV3_SWAP_ABI> = {
  'agni-v3':    ALGEBRA_SWAP_ABI,
  'fusionx-v3': UNIV3_SWAP_ABI,
};

/**
 * Converts a pool's post-swap sqrtPriceX96 → token1-per-token0 in human units.
 * price_raw = (sqrtPriceX96/2^96)^2 = token1/token0 in smallest-unit terms;
 * adjust for each token's decimals to get the human-unit ratio.
 */
export function sqrtPriceX96ToHumanPrice(sqrtPriceX96: bigint, pool: PoolDef): number {
  const raw = Number(sqrtPriceX96) / 2 ** 96;
  const rawPrice = raw * raw;
  return rawPrice * 10 ** (pool.token0.decimals - pool.token1.decimals);
}

/**
 * Converts a pool's post-swap sqrtPriceX96 → USD price of token1, given the
 * USD price of token0 (1 for $1-pegged stables, or a live oracle price for
 * non-stable anchors like WMNT).
 */
export function sqrtPriceX96ToTokenUsd(sqrtPriceX96: bigint, pool: PoolDef, token0UsdPrice = 1): number {
  return token0UsdPrice / sqrtPriceX96ToHumanPrice(sqrtPriceX96, pool);
}

const httpClient = createPublicClient({
  chain:     mantleMainnet,
  transport: http('https://rpc.mantle.xyz'),
});

export async function getCurrentWmntPrice(): Promise<number> {
  const state = await httpClient.readContract({
    address:      POOLS[0].address,
    abi:          SLOT0_ABI,
    functionName: 'slot0',
  });
  return sqrtPriceX96ToTokenUsd(state[0], POOLS[0]);
}
