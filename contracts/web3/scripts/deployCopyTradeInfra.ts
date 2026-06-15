import { ethers } from 'hardhat';

// ─────────────────────────────────────────────────────────────────────────────
//  Deploys the full on-chain copy-trading stack on Mantle Sepolia (5003):
//
//   - MockWETH / MockMETH (new shadow tokens; MockWMNT is reused)
//   - MultiPairAMM(aUSD)  — replaces SimpleAMM, supports aUSD<->WMNT/WETH/mETH
//   - VaultManager(aUSD)  — fresh deploy, wired to the new dex + tokenMap
//
//  Seeds all 3 pairs at roughly real Mantle Mainnet prices so P&L on copied
//  positions looks plausible, sets oracle = the watcher's keeper wallet (the
//  actual tx sender for executeCopyTrade/closePosition/setPrice), and maps
//  each Mantle-Mainnet token identity (used for allowlist/positions/UI) to
//  its Sepolia shadow token (used for the actual DEX swap).
//
//  Run:  npx hardhat run scripts/deployCopyTradeInfra.ts --network mantleSepolia
//  Needs in .env:  PRIVATE_KEY, AUSD_ADDRESS, MWMNT_ADDRESS
// ─────────────────────────────────────────────────────────────────────────────

const AUSD_ADDRESS  = process.env.AUSD_ADDRESS  ?? '';
const MWMNT_ADDRESS = process.env.MWMNT_ADDRESS ?? '';

// The watcher's signing wallet (KEEPER_PRIVATE_KEY in watcher/.env) — set as
// `oracle` so executeCopyTrade/closePosition/setPrice pass onlyOracle /
// onlyAuthorizedFor directly for this address.
const KEEPER_ADDRESS = process.env.KEEPER_ADDRESS ?? '0x842056bb847BCe24bEb6D0d08703024DBa94CCE9';

// Mantle Mainnet token identities (watcher/src/config.ts TOKENS) — used as
// allowlist/positions/latestPrice keys and as tokenMap keys.
const MAINNET_WMNT = '0x78c1b0c915c4faa5fffa6cabf0219da63d7f4cb8';
const MAINNET_WETH = '0xdEAddEaDdeadDEadDEADDEAddEADDEAddead1111';
const MAINNET_METH = '0xcDA86A272531e8640cD7F1a92c01839911B90bb0';

// Roughly real prices (USD per token) — sanity-checked against live Mantle
// Mainnet pools this session.
const PRICE_WMNT = 0.57;
const PRICE_WETH = 1727;
const PRICE_METH = 1750;

// How much MNT to send the keeper wallet for gas (deployer has ~3 MNT testnet).
const KEEPER_GAS_TOPUP = ethers.parseEther('0.3');

const POOL_AUSD_NUM = 50000;
const POOL_AUSD     = ethers.parseUnits(String(POOL_AUSD_NUM), 6); // per pair

async function main() {
  if (!AUSD_ADDRESS)  { console.error('ERROR: set AUSD_ADDRESS in .env');  process.exit(1); }
  if (!MWMNT_ADDRESS) { console.error('ERROR: set MWMNT_ADDRESS in .env'); process.exit(1); }

  const [deployer] = await ethers.getSigners();
  console.log('Deployer:', deployer.address);
  console.log('Balance: ', ethers.formatEther(await ethers.provider.getBalance(deployer.address)), 'MNT\n');

  const ausd  = await ethers.getContractAt('aUSD', AUSD_ADDRESS);
  const mwmnt = await ethers.getContractAt('MockWMNT', MWMNT_ADDRESS);

  // ── 1. Deploy shadow tokens ────────────────────────────────────────────────
  console.log('1) Deploying MockWETH / MockMETH...');
  const mweth = await (await ethers.getContractFactory('MockWETH')).deploy();
  await mweth.waitForDeployment();
  const mwethAddr = await mweth.getAddress();

  const mmeth = await (await ethers.getContractFactory('MockMETH')).deploy();
  await mmeth.waitForDeployment();
  const mmethAddr = await mmeth.getAddress();
  console.log('   MockWETH:', mwethAddr);
  console.log('   MockMETH:', mmethAddr);
  console.log('   MockWMNT:', MWMNT_ADDRESS, '(reused)');

  // ── 2. Deploy MultiPairAMM ──────────────────────────────────────────────────
  console.log('\n2) Deploying MultiPairAMM...');
  const amm = await (await ethers.getContractFactory('MultiPairAMM')).deploy(AUSD_ADDRESS);
  await amm.waitForDeployment();
  const ammAddr = await amm.getAddress();
  console.log('   MultiPairAMM:', ammAddr);

  // ── 3. Mint + seed liquidity for 3 pairs ────────────────────────────────────
  console.log('\n3) Seeding liquidity (50,000 aUSD per pair)...');
  const wmntAmt = ethers.parseUnits((POOL_AUSD_NUM / PRICE_WMNT).toFixed(18), 18);
  const wethAmt = ethers.parseUnits((POOL_AUSD_NUM / PRICE_WETH).toFixed(18), 18);
  const methAmt = ethers.parseUnits((POOL_AUSD_NUM / PRICE_METH).toFixed(18), 18);

  await (await ausd.mint(deployer.address, POOL_AUSD * 3n)).wait();
  await (await mwmnt.mint(deployer.address, wmntAmt)).wait();
  await (await mweth.mint(deployer.address, wethAmt)).wait();
  await (await mmeth.mint(deployer.address, methAmt)).wait();

  await (await ausd.approve(ammAddr, POOL_AUSD * 3n)).wait();
  await (await mwmnt.approve(ammAddr, wmntAmt)).wait();
  await (await mweth.approve(ammAddr, wethAmt)).wait();
  await (await mmeth.approve(ammAddr, methAmt)).wait();

  await (await amm.addLiquidity(MWMNT_ADDRESS, POOL_AUSD, wmntAmt)).wait();
  console.log(`   WMNT pair: 50,000 aUSD / ${ethers.formatUnits(wmntAmt, 18)} mWMNT (~$${PRICE_WMNT})`);
  await (await amm.addLiquidity(mwethAddr, POOL_AUSD, wethAmt)).wait();
  console.log(`   WETH pair: 50,000 aUSD / ${ethers.formatUnits(wethAmt, 18)} mWETH (~$${PRICE_WETH})`);
  await (await amm.addLiquidity(mmethAddr, POOL_AUSD, methAmt)).wait();
  console.log(`   mETH pair: 50,000 aUSD / ${ethers.formatUnits(methAmt, 18)} mmETH (~$${PRICE_METH})`);

  // ── 4. Deploy VaultManager ───────────────────────────────────────────────────
  console.log('\n4) Deploying VaultManager...');
  const vm = await (await ethers.getContractFactory('VaultManager')).deploy(AUSD_ADDRESS);
  await vm.waitForDeployment();
  const vmAddr = await vm.getAddress();
  console.log('   VaultManager:', vmAddr);

  console.log('\n5) Wiring VaultManager...');
  await (await ausd.addMinter(vmAddr)).wait();
  console.log('   aUSD minter added');

  await (await vm.setDex(ammAddr)).wait();
  console.log('   dex =', ammAddr);

  await (await vm.setOracle(KEEPER_ADDRESS)).wait();
  console.log('   oracle =', KEEPER_ADDRESS, '(watcher keeper wallet)');

  await (await vm.setTokenMap(MAINNET_WMNT, MWMNT_ADDRESS)).wait();
  await (await vm.setTokenMap(MAINNET_WETH, mwethAddr)).wait();
  await (await vm.setTokenMap(MAINNET_METH, mmethAddr)).wait();
  console.log('   tokenMap set: WMNT/WETH/mETH -> shadow tokens');

  // ── 6. Top up keeper gas ─────────────────────────────────────────────────────
  console.log('\n6) Funding keeper wallet for gas...');
  const keeperBal = await ethers.provider.getBalance(KEEPER_ADDRESS);
  if (keeperBal < KEEPER_GAS_TOPUP) {
    await (await deployer.sendTransaction({ to: KEEPER_ADDRESS, value: KEEPER_GAS_TOPUP })).wait();
    console.log(`   sent ${ethers.formatEther(KEEPER_GAS_TOPUP)} MNT to ${KEEPER_ADDRESS}`);
  } else {
    console.log('   keeper already funded:', ethers.formatEther(keeperBal), 'MNT');
  }

  console.log('\nDone. Update env files:');
  console.log('  watcher/.env            VAULT_MANAGER_ADDRESS=' + vmAddr);
  console.log('  frontend/.env.local     NEXT_PUBLIC_VAULT_MANAGER_ADDRESS=' + vmAddr);
  console.log('  contracts/web3/.env     VAULT_MANAGER_ADDRESS=' + vmAddr);
  console.log('                          DEX_ADDRESS=' + ammAddr);
  console.log('                          MWETH_ADDRESS=' + mwethAddr);
  console.log('                          MMETH_ADDRESS=' + mmethAddr);
}

main().catch((e) => { console.error(e); process.exit(1); });
