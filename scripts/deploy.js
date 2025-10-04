const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Network:", hre.network.name);

  // Use Uniswap v3 Router on Sepolia
  const SWAP_ROUTER_ADDRESS = "0xE592427A0AEce92De3Edee1F18E0157C05861564";

  const SwapExecutor = await hre.ethers.getContractFactory("SwapExecutor");
  const swapExecutor = await SwapExecutor.deploy(SWAP_ROUTER_ADDRESS);
  await swapExecutor.waitForDeployment();

  console.log("SwapExecutor deployed to:", swapExecutor.target || swapExecutor.address);

  // Optionally output the token addresses for WETH / USDC that you’ll use
  console.log("Using token addresses:");
  console.log("WETH:", "0xfff9976782d46cc05630d1f6ebab18b2324d6b14");
  console.log("USDC:", "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
