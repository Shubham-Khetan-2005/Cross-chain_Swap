const hre = require("hardhat");
async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  const SWAP_ROUTER_ADDRESS = "0x3bfa4769fb09eefc5a80d6e87c3b9c650f7ae48e";
  const WETH_ADDRESS = "0x7b79995e5f793a07bc00c21412e50ecae098e7f9";
  const SwapExecutor = await hre.ethers.getContractFactory("SwapExecutor");
  const swapExecutor = await SwapExecutor.deploy(SWAP_ROUTER_ADDRESS, WETH_ADDRESS);
  await swapExecutor.waitForDeployment();
  console.log("✅ SwapExecutor deployed to:", swapExecutor.target);
}
main().catch((e) => { console.error(e); process.exit(1); });