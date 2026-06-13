import 'dotenv/config';
import { defineChain } from 'viem';

// ── Chains ────────────────────────────────────────────────────────────────────

// Mantle Mainnet — where leader activity is observed (Agni Finance pools)
export const mantleMainnet = defineChain({
  id: 5000,
  name: 'Mantle',
  nativeCurrency: { decimals: 18, name: 'MNT', symbol: 'MNT' },
  rpcUrls: {
    default: { http: ['https://rpc.mantle.xyz'] },
  },
});

// Mantle Sepolia Testnet — where VaultManager lives
export const mantleSepolia = defineChain({
  id: 5003,
  name: 'Mantle Sepolia Testnet',
  nativeCurrency: { decimals: 18, name: 'MNT', symbol: 'MNT' },
  rpcUrls: {
    default: { http: ['https://rpc.sepolia.mantle.xyz'] },
  },
});

// ── Tokens (Mantle Mainnet) ───────────────────────────────────────────────────
// Same addresses as frontend/config/tokens.ts MAINNET_TOKENS — VaultManager on
// Mantle Sepolia uses these as keys in its latestPrice mapping and allowlist.

export const TOKENS = {
  USDe: { address: '0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34' as `0x${string}`, symbol: 'USDe', decimals: 18, isStable: true  },
  WMNT: { address: '0x78c1b0C915c4FAA5FffA6CABf0219DA63d7f4cb8' as `0x${string}`, symbol: 'WMNT', decimals: 18, isStable: false },
  USDC: { address: '0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9' as `0x${string}`, symbol: 'USDC', decimals: 6,  isStable: true  },
  USDT: { address: '0x201EBa5CC46D216Ce6DC03F6a759e8E766e956aE' as `0x${string}`, symbol: 'USDT', decimals: 6,  isStable: true  },
} as const;

export type TokenDef = typeof TOKENS[keyof typeof TOKENS];

// ── Pool definitions ──────────────────────────────────────────────────────────

export interface PoolDef {
  address:  `0x${string}`;
  token0:   TokenDef;
  token1:   TokenDef;
  // Symbol of the non-stable "base" token for this pool (used for BUY/SELL labelling)
  baseSymbol: string;
}

// Agni Finance (Algebra fork) USDe/WMNT pool — verified active on-chain.
// token0=USDe (18 dec, $1-pegged stable), token1=WMNT (18 dec, volatile)
export const POOLS: PoolDef[] = [
  {
    address:    '0xeAFC4d6D4c3391cd4fc10c85D2f5F972D58C0Dd5',
    token0:     TOKENS.USDe,
    token1:     TOKENS.WMNT,
    baseSymbol: 'WMNT',
  },
];

// Kept for copy-engine — the single tracked pool's token pair
export const POOL = {
  token0: TOKENS.USDe,
  token1: TOKENS.WMNT,
} as const;

// ── On-chain keeper config ────────────────────────────────────────────────────

export const VAULT_MANAGER_ADDRESS = (process.env.VAULT_MANAGER_ADDRESS ?? '') as `0x${string}`;
export const KEEPER_PRIVATE_KEY    = (process.env.KEEPER_PRIVATE_KEY    ?? '') as `0x${string}`;

// ── Copy-trade config ─────────────────────────────────────────────────────────

export const DEFAULT_COPY_PCT = Number(process.env.DEFAULT_COPY_PCT ?? 20);
export const STALE_BUY_MS     = 10_000; // skip BUYs older than 10s
