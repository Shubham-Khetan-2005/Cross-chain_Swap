const { ethers } = require("hardhat");
const quoterAbi = require("../../frontend/src/abis/quoter.json");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Testing with account:", deployer.address);

  // --- CONFIGURATION ---
  const quoterAddress = "0xed1f65420402da62a54f75ce7be7091b7e17596c";
  const tokenIn = "0x7b79995e5f793a07bc00c21412e50ecae098e7f9";   // WETH (Sepolia)
  const tokenOut = "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984";  // UNI (Sepolia)
  
  // THE FINAL CHANGE: Targeting the 1% fee tier, which is highly liquid for this pair on Sepolia.
  const fee = 10000; 

  const amountIn = ethers.parseUnits("0.01", 18);
  const sqrtPriceLimitX96 = 0;

  // --- EXECUTION ---
  const quoterContract = new ethers.Contract(quoterAddress, quoterAbi, deployer);

  const params = {
    tokenIn: tokenIn,
    tokenOut: tokenOut,
    fee: fee,
    amountIn: amountIn,
    sqrtPriceLimitX96: sqrtPriceLimitX96,
  };

  console.log(`Calling quote for WETH -> UNI with ${fee / 10000}% fee...`);

  try {
    const quoteResult = await quoterContract.quoteExactInputSingle.staticCall(params);
    const amountOut = quoteResult.amountOut;

    console.log("\n✅ SUCCESS!");
    console.log("Amount Out (raw):", amountOut.toString());
    console.log("Amount Out (formatted UNI):", ethers.formatUnits(amountOut, 18));
  } catch (error) {
    console.log("\n❌ FAILED!");
    console.error("The exact error is:", error);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});