import { ethers } from 'hardhat';

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deploying FollowerRegistry with:', deployer.address);

  const Registry = await ethers.getContractFactory('FollowerRegistry');
  const registry = await Registry.deploy();
  await registry.waitForDeployment();

  const address = await registry.getAddress();
  console.log('FollowerRegistry deployed to:', address);
  console.log('Add to watcher/.env:');
  console.log('  FOLLOWER_REGISTRY_ADDRESS=' + address);
}

main().catch((e) => { console.error(e); process.exit(1); });
