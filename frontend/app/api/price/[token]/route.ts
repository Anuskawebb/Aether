import { NextResponse }  from 'next/server';
import { prisma }        from '@/lib/prisma';
import { getWmntPrice }  from '@/lib/price';

// Stablecoins always return 1.0 — no lookup needed.
const STABLECOINS = new Set(['USDC', 'USDC.E', 'USDT', 'DAI', 'AUSD', 'USDE']);

// VaultManager.updatePrice() builds its fetch URL from the token's hex
// address (`_toHexString(token)`) — Solidity has no symbol lookup. Map the
// known pool tokens (Mantle Mainnet) back to symbols so the existing
// symbol-keyed lookups below still work regardless of whether the caller
// passes an address or a symbol.
const ADDRESS_TO_SYMBOL: Record<string, string> = {
  '0x78c1b0c915c4faa5fffa6cabf0219da63d7f4cb8': 'WMNT',
  '0x5d3a1ff2b6bab83b63cd9ad0787074081a52ef34': 'USDe',
  '0x09bc4e0d864854c6afb6eb9a9cdf58ac190d0df9': 'USDC',
  '0x201eba5cc46d216ce6dc03f6a759e8e766e956ae': 'USDT',
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token: rawToken } = await params;
  const symbol = ADDRESS_TO_SYMBOL[rawToken.toLowerCase()] ?? rawToken;
  const token  = symbol.toUpperCase();

  if (STABLECOINS.has(token)) {
    return NextResponse.json({ token, price: '1.0', source: 'stable' });
  }

  // 1. Try DB first (watcher keeps this fresh)
  const row = await prisma.tokenPrice.findUnique({ where: { token } });

  if (row) {
    return NextResponse.json({
      token,
      price:     row.price.toString(),
      updatedAt: row.updatedAt,
      source:    'db',
    });
  }

  // 2. Fall back to live on-chain fetch for WMNT
  if (token === 'WMNT') {
    try {
      const price = await getWmntPrice();
      return NextResponse.json({ token, price: price.toString(), source: 'live' });
    } catch {
      return NextResponse.json({ error: 'price unavailable' }, { status: 503 });
    }
  }

  return NextResponse.json({ error: `no price for ${token}` }, { status: 404 });
}
