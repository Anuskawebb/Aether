import { createPublicClient, http } from 'viem';
import { defineChain } from 'viem';

const mantleMainnet = defineChain({
  id: 5000,
  name: 'Mantle',
  nativeCurrency: { decimals: 18, name: 'MNT', symbol: 'MNT' },
  rpcUrls: {
    default: { http: ['https://rpc.mantle.xyz'] },
  },
});

const POOL_ADDRESS = (process.env.NEXT_PUBLIC_PRICE_POOL ??
  '0xeAFC4d6D4c3391cd4fc10c85D2f5F972D58C0Dd5') as `0x${string}`;

// Algebra V3 globalState — 6 fields, matches the Agni Finance (Algebra fork) pools
// on Mantle Mainnet, same shape verified for the watcher's pool decoding.
const GLOBAL_STATE_ABI = [{
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
}] as const;

const client = createPublicClient({
  chain:     mantleMainnet,
  transport: http(),
});

// USDe/WMNT pool — token0=USDe (18 dec), token1=WMNT (18 dec).
// price_raw = (sqrtPriceX96/2^96)^2 = WMNT per USDe; USDe ~$1, so WMNT/USD = 1/price_raw.
export async function getWmntPrice(): Promise<number> {
  const state = await client.readContract({
    address:      POOL_ADDRESS,
    abi:          GLOBAL_STATE_ABI,
    functionName: 'globalState',
  });
  const raw = Number(state[0]) / 2 ** 96;
  return 1 / (raw * raw);
}
