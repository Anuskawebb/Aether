import { createPublicClient, http } from 'viem';
import { mantleMainnet, POOLS } from './config.js';

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

/**
 * Converts Algebra V3 sqrtPriceX96 → human-readable WMNT price in USD.
 * token0=USDe (18 dec, $1-pegged), token1=WMNT (18 dec)
 * price_raw = (sqrtPriceX96/2^96)^2 = WMNT per USDe; USDe ~$1, so WMNT/USD = 1/price_raw.
 */
export function sqrtPriceX96ToWmntUsd(sqrtPriceX96: bigint): number {
  const raw = Number(sqrtPriceX96) / 2 ** 96;
  return 1 / (raw * raw);
}

const httpClient = createPublicClient({
  chain:     mantleMainnet,
  transport: http('https://rpc.mantle.xyz'),
});

export async function getCurrentWmntPrice(): Promise<number> {
  const state = await httpClient.readContract({
    address:      POOLS[0].address,
    abi:          ALGEBRA_POOL_ABI,
    functionName: 'globalState',
  });
  return sqrtPriceX96ToWmntUsd(state[0]);
}
