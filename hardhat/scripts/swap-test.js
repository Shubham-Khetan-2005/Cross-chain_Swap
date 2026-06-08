require("dotenv").config();
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  const SWAP_EXECUTOR_ADDRESS = process.env.SWAP_EXECUTOR;
  const swapExecutor = await ethers.getContractAt("SwapExecutor", SWAP_EXECUTOR);

  // WETH (Sepolia) and USDC (Sepolia) addresses
  const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
  const USDC = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";

  const weth = await ethers.getContractAt("IERC20", WETH);
  const usdc = await ethers.getContractAt("IERC20", USDC);

  // Amount to swap
  const amountIn = ethers.parseEther("0.001");

  console.log("🔹 Deployer:", deployer.address);
  console.log("🔹 SwapExecutor:", SWAP_EXECUTOR_ADDRESS);
  console.log("🔹 WETH balance before:", await weth.balanceOf(deployer.address));
  console.log("🔹 USDC balance before:", await usdc.balanceOf(deployer.address));

  // Approve SwapExecutor to spend WETH (skip if already approved)
  const allowance = await weth.allowance(deployer.address, SWAP_EXECUTOR_ADDRESS);
  if (allowance < amountIn) {
    console.log("Approving SwapExecutor to spend WETH...");
    const approveTx = await weth.approve(SWAP_EXECUTOR_ADDRESS, amountIn);
    await approveTx.wait();
  }

  console.log(`Swapping ${ethers.formatEther(amountIn)} WETH for USDC...`);
  try {
    const tx = await swapExecutor.swapExactInputSingle(amountIn);
    const receipt = await tx.wait();
    console.log("✅ Swap Successful!");
    console.log("Transaction Hash:", receipt.hash);
  } catch (err) {
    console.error("❌ Swap Failed:", err);
  }

  console.log("🔹 WETH balance after:", await weth.balanceOf(deployer.address));
  console.log("🔹 USDC balance after:", await usdc.balanceOf(deployer.address));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
