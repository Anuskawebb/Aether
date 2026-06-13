import { ethers } from "hardhat";

async function main() {
  console.log("Starting deployment of SomniaGreeting contract...");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const initialGreeting = "Hello Somnia Shannon Testnet!";
  const SomniaGreeting = await ethers.getContractFactory("SomniaGreeting");
  const contract = await SomniaGreeting.deploy(initialGreeting);

  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("SomniaGreeting contract deployed to:", address);
  console.log("Initial greeting set to:", initialGreeting);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
