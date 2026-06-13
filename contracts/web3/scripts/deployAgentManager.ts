import { ethers } from 'hardhat';

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deploying AionisAgentManager with:', deployer.address);

  const AgentManager = await ethers.getContractFactory('AionisAgentManager');
  const manager      = await AgentManager.deploy();
  await manager.waitForDeployment();

  const address = await manager.getAddress();
  console.log('AionisAgentManager deployed to:', address);
  console.log('\nVerify constants on-chain:');
  console.log('  Agent Platform:', await manager.AGENT_PLATFORM());
  console.log('  QuickSwap Router:', await manager.QUICKSWAP_ROUTER());
  console.log('  WSOMI:', await manager.WSOMI());
  console.log('  USDC.e:', await manager.USDCE());

  console.log('\nAdd to .env.local:');
  console.log('  NEXT_PUBLIC_AGENT_MANAGER_ADDRESS=' + address);
}

main().catch((e) => { console.error(e); process.exit(1); });
