const { ethers } = require("hardhat");
const erc20abi = require("../abis/erc20.json");

async function main() {
  const [deployer] = await ethers.getSigners();

  const swapExecutorAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // Replace with your deployed SwapExecutor address
  const tokenIn = "0xfff9976782d46cc05630d1f6ebab18b2324d6b14"; // WETH
  const tokenOut = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"; // USDC

  const amountIn = ethers.parseUnits("0.01", 18); // 0.01 WETH

  // Attach to deployed contracts
  const swapExecutor = await ethers.getContractAt("SwapExecutor", swapExecutorAddress);
  const tokenInContract = new ethers.Contract(tokenIn, erc20abi, deployer);

  // Approve SwapExecutor to spend tokenIn
  const tx1 = await tokenInContract.approve(swapExecutorAddress, amountIn);
  await tx1.wait();

  const deadline = Math.floor(Date.now() / 1000) + 600;

  const tx2 = await swapExecutor.swapExactInputSingle(
    tokenIn,
    tokenOut,
    3000, // Pool fee (e.g., 0.3%)
    amountIn,
    0, // Set a minimum amount out (slippage tolerance)
    deadline,
    0, // No price limit
    "0x" // No extra data
  );

  const receipt = await tx2.wait();
  console.log("Swap executed, tx hash:", receipt.hash);
}

main().catch(console.error);
