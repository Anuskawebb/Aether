import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

// Top traders discovered from find-traders.ts scan
const STAR_TRADERS = [
  '0x419c85497a91f6ac708b4ddaed21578dd9154e9f', // #1 — 65 trades, $4912 volume
  '0x6daf055c99883d920849d7022f2efabb13e2af57', // #2 — 54 trades, $3307 volume
  '0xc77426171aa40c682e6b512a8f2fe87f2d396f9a', // #3 — 31 trades,   $45 volume
  '0x291b36ad78c50cebd075806146c5d0e50ed290f5', // #4 — 24 trades,   $58 volume
  '0xe2105228a62eb5cdb2231463a669cbca47dc3d36', // #5 — 49 trades,  $160 volume
];

// Test follower — your deployer address
const TEST_FOLLOWER  = '0x7DcF628f79676ec5755Da9EF1fb312460E1599E4';
const VIRTUAL_USDC_6 = 1_000_000_000; // $1000 (6 decimals)

const prisma = new PrismaClient();

await prisma.$connect();

// 1. Create vault for the test follower
await prisma.vault.upsert({
  where:  { address: TEST_FOLLOWER.toLowerCase() },
  update: {},
  create: {
    address:         TEST_FOLLOWER.toLowerCase(),
    virtualUsdc:     VIRTUAL_USDC_6,
    startingCapital: VIRTUAL_USDC_6,
    copyModelKey:    'fixed_available_pct',
    copyModelConfig: { buyPct: 20 },
  },
});
console.log(`Vault: ${TEST_FOLLOWER} — $1000 virtual USDC`);

// 2. Follow all star traders
for (const leader of STAR_TRADERS) {
  await prisma.follow.upsert({
    where:  { follower_leader: { follower: TEST_FOLLOWER.toLowerCase(), leader: leader.toLowerCase() } },
    update: {},
    create: { follower: TEST_FOLLOWER.toLowerCase(), leader: leader.toLowerCase() },
  });
  console.log(`  Following ${leader}`);
}

await prisma.$disconnect();
console.log(`\nDone — watcher will now track ${STAR_TRADERS.length} leaders.`);
console.log('Restart the watcher: npm run dev');
