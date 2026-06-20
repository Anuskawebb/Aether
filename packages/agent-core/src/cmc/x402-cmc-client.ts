/**
 * CMC Agent Hub client with x402 micropayment support.
 *
 * The x402 protocol (HTTP 402 Payment Required) lets the agent wallet pay
 * for CMC market data directly on-chain — no human API subscription needed.
 *
 * Flow per request:
 *   1. Send request to CMC x402 endpoint (no API key)
 *   2. If 402 → parse X-Payment-Required details (amount, asset, payTo, network)
 *   3. TWAK sends BNB micropayment from agent wallet to CMC's payment address
 *   4. Retry request with X-Payment proof header (contains tx hash)
 *   5. CMC returns data
 *
 * Falls back to standard API key if:
 *   - CMC_X402=false env var
 *   - No TWAK sidecar available
 *   - x402 payment or retry fails
 */

import { TwakClient } from '../execution/twak/twak-client.js';

// CMC Agent Hub x402 base URL — override via CMC_X402_URL env var
const CMC_X402_BASE = process.env.CMC_X402_URL ?? 'https://agents.coinmarketcap.com';
const CMC_API_BASE  = 'https://pro-api.coinmarketcap.com';

// ── x402 protocol types ──────────────────────────────────────────────────────

interface X402Accept {
  scheme:             string;   // "exact"
  network:            string;   // "bsc-mainnet" | "base-mainnet" | ...
  maxAmountRequired:  string;   // smallest unit (wei for BNB, μUSDC for USDC)
  payTo:              string;   // CMC payment address
  asset:              string;   // "native" | ERC-20 contract address
  resource:           string;   // the original URL being purchased
  description?:       string;
  maxTimeoutSeconds?: number;
}

interface X402PaymentRequired {
  x402Version: number;
  accepts:     X402Accept[];
  error?:      string;
}

interface X402PaymentProof {
  x402Version: number;
  scheme:      string;
  network:     string;
  payload: {
    from:   string;   // agent wallet address
    to:     string;   // CMC payment address
    txHash: string;   // on-chain payment tx
    amount: string;   // amount in smallest unit
    asset:  string;
  };
}

// ── helpers ──────────────────────────────────────────────────────────────────

function networkToTwakChain(network: string): string {
  if (network.startsWith('bsc'))  return 'smartchain';
  if (network.startsWith('base')) return 'base';
  if (network.startsWith('eth'))  return 'ethereum';
  return 'smartchain'; // default: BSC (our trading chain)
}

// Convert smallest-unit amount to human-readable for TWAK.
// CMC x402 payments are typically tiny: ~$0.001 expressed in wei or μUSDC.
function toHumanAmount(raw: string, asset: string): string {
  const n = BigInt(raw);
  if (asset === 'native') {
    // BNB: 18 decimals
    const bnb = Number(n) / 1e18;
    return bnb.toFixed(8);
  }
  // USDC: 6 decimals
  const usdc = Number(n) / 1e6;
  return usdc.toFixed(6);
}

// ── core x402 fetch ──────────────────────────────────────────────────────────

export async function fetchWithX402(
  path:          string,
  agentWallet:   string,
  twakClient:    TwakClient,
): Promise<unknown | null> {
  const url = `${CMC_X402_BASE}${path}`;

  // Step 1 — initial request (no credentials)
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });
  } catch (e) {
    console.warn(`[x402] Fetch failed for ${path}:`, e instanceof Error ? e.message : e);
    return null;
  }

  if (res.status !== 402) {
    // Either the endpoint returned data (no payment required) or an error
    if (res.ok) return res.json();
    console.warn(`[x402] Unexpected status ${res.status} for ${path}`);
    return null;
  }

  // Step 2 — parse payment requirements
  let paymentRequired: X402PaymentRequired;
  try {
    paymentRequired = await res.json() as X402PaymentRequired;
  } catch {
    console.warn('[x402] Could not parse 402 response body');
    return null;
  }

  const accept = paymentRequired.accepts?.[0];
  if (!accept) {
    console.warn('[x402] No payment scheme in 402 response');
    return null;
  }

  const chain     = networkToTwakChain(accept.network);
  const token     = accept.asset === 'native' ? 'BNB' : accept.asset;
  const amount    = toHumanAmount(accept.maxAmountRequired, accept.asset);

  console.log(
    `[x402] Payment required: ${amount} ${token} on ${chain}` +
    ` → ${accept.payTo.slice(0, 10)}...`
  );

  // Step 3 — pay from agent wallet via TWAK
  let txHash: string;
  try {
    const payment = await twakClient.transfer({
      token,
      to:     accept.payTo,
      amount,
      chain,
    });

    if (!payment.success || !payment.hash) {
      console.warn('[x402] Payment tx failed:', payment.message ?? 'no hash returned');
      return null;
    }

    txHash = payment.hash;
    console.log(`[x402] Payment confirmed: ${txHash}`);
  } catch (e) {
    console.warn('[x402] Payment error:', e instanceof Error ? e.message : e);
    return null;
  }

  // Step 4 — build payment proof and retry
  const proof: X402PaymentProof = {
    x402Version: 1,
    scheme:      accept.scheme,
    network:     accept.network,
    payload: {
      from:   agentWallet,
      to:     accept.payTo,
      txHash,
      amount: accept.maxAmountRequired,
      asset:  accept.asset,
    },
  };

  const proofHeader = Buffer.from(JSON.stringify(proof)).toString('base64');

  try {
    const retryRes = await fetch(url, {
      headers: {
        'Accept':     'application/json',
        'X-Payment':  proofHeader,
      },
    });

    if (!retryRes.ok) {
      console.warn(`[x402] Retry failed: HTTP ${retryRes.status}`);
      return null;
    }

    console.log(`[x402] Data received after payment (tx: ${txHash})`);
    return retryRes.json();
  } catch (e) {
    console.warn('[x402] Retry error:', e instanceof Error ? e.message : e);
    return null;
  }
}

// ── CMC-specific x402 endpoints ──────────────────────────────────────────────

export interface CmcFearAndGreed {
  value:          number;
  classification: string;
  txHash?:        string;  // set when paid via x402 — on-chain proof
}

export interface CmcGainer {
  symbol:        string;
  name:          string;
  percentChange: number;
  price:         number;
}

export interface CmcGlobalMetrics {
  totalMarketCapUsd:   number;
  btcDominancePct:     number;
  defiMarketCapUsd:    number;
  totalVolume24hUsd:   number;
}

/**
 * Fetches Fear & Greed index via x402 (agent wallet pays), falls back to API key.
 * Returns the data plus the tx hash if x402 was used — for on-chain proof.
 */
export async function getFearAndGreedX402(
  agentWallet: string,
  twakClient:  TwakClient,
): Promise<CmcFearAndGreed | null> {
  if (process.env.CMC_X402 !== 'false') {
    try {
      const data = await fetchWithX402('/v3/fear-and-greed/latest', agentWallet, twakClient) as any;
      if (data?.data?.value !== undefined) {
        return {
          value:          data.data.value,
          classification: data.data.value_classification,
        };
      }
    } catch { /* fall through to API key */ }
  }

  // Fallback: standard API key
  const key = process.env.CMC_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(`${CMC_API_BASE}/v3/fear-and-greed/latest`, {
      headers: { 'X-CMC_PRO_API_KEY': key, 'Accept': 'application/json' },
    });
    if (!res.ok) return null;
    const json = await res.json() as any;
    return { value: json.data.value, classification: json.data.value_classification };
  } catch { return null; }
}

/**
 * Fetches top gainers/losers via x402, falls back to API key.
 * Used to find momentum tokens that also have smart-money accumulation.
 */
export async function getTopGainersX402(
  agentWallet: string,
  twakClient:  TwakClient,
  limit = 10,
): Promise<CmcGainer[]> {
  if (process.env.CMC_X402 !== 'false') {
    try {
      const data = await fetchWithX402(
        `/v1/cryptocurrency/trending/gainers-losers?limit=${limit}&time_period=24h`,
        agentWallet,
        twakClient,
      ) as any;
      if (Array.isArray(data?.data)) {
        return data.data.map((t: any) => ({
          symbol:        t.symbol as string,
          name:          t.name as string,
          percentChange: t.quote?.USD?.percent_change_24h ?? 0,
          price:         t.quote?.USD?.price ?? 0,
        }));
      }
    } catch { /* fall through */ }
  }

  const key = process.env.CMC_API_KEY;
  if (!key) return [];
  try {
    const res = await fetch(
      `${CMC_API_BASE}/v1/cryptocurrency/trending/gainers-losers?limit=${limit}&time_period=24h`,
      { headers: { 'X-CMC_PRO_API_KEY': key, 'Accept': 'application/json' } },
    );
    if (!res.ok) return [];
    const json = await res.json() as any;
    return (json.data ?? []).map((t: any) => ({
      symbol:        t.symbol as string,
      name:          t.name as string,
      percentChange: t.quote?.USD?.percent_change_24h ?? 0,
      price:         t.quote?.USD?.price ?? 0,
    }));
  } catch { return []; }
}

/**
 * Fetches global market metrics via x402, falls back to API key.
 * BTC dominance + DeFi market cap inform macro position sizing.
 */
export async function getGlobalMetricsX402(
  agentWallet: string,
  twakClient:  TwakClient,
): Promise<CmcGlobalMetrics | null> {
  if (process.env.CMC_X402 !== 'false') {
    try {
      const data = await fetchWithX402('/v1/global-metrics/quotes/latest', agentWallet, twakClient) as any;
      if (data?.data?.total_market_cap) {
        const d = data.data;
        return {
          totalMarketCapUsd: d.quote?.USD?.total_market_cap ?? 0,
          btcDominancePct:   d.btc_dominance ?? 0,
          defiMarketCapUsd:  d.defi_market_cap ?? d.quote?.USD?.defi_market_cap ?? 0,
          totalVolume24hUsd: d.quote?.USD?.total_volume_24h ?? 0,
        };
      }
    } catch { /* fall through */ }
  }

  const key = process.env.CMC_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(`${CMC_API_BASE}/v1/global-metrics/quotes/latest`, {
      headers: { 'X-CMC_PRO_API_KEY': key, 'Accept': 'application/json' },
    });
    if (!res.ok) return null;
    const json = await res.json() as any;
    const d = json.data;
    return {
      totalMarketCapUsd: d.quote?.USD?.total_market_cap ?? 0,
      btcDominancePct:   d.btc_dominance ?? 0,
      defiMarketCapUsd:  d.defi_market_cap ?? 0,
      totalVolume24hUsd: d.quote?.USD?.total_volume_24h ?? 0,
    };
  } catch { return null; }
}
