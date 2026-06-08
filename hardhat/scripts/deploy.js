const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // --- CONFIGURATION ---
  const SWAP_ROUTER_ADDRESS = "0x3bfa4769fb09eefc5a80d6e87c3b9c650f7ae48e";
  const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

  // --- DEPLOYMENT ---
  const SwapExecutor = await hre.ethers.getContractFactory("SwapExecutor");
  // Pass BOTH router and WETH addresses to the constructor
  const swapExecutor = await SwapExecutor.deploy(SWAP_ROUTER_ADDRESS, WETH_ADDRESS);
  await swapExecutor.waitForDeployment();

  const deployedAddress = swapExecutor.target;
  console.log("✅ SwapExecutor deployed to:", deployedAddress);

  // --- UPDATE .env FILE ---
  try {
    // Resolve path to the .env file (one level up)
    const envPath = path.resolve(__dirname, "../.env");
    console.log(`📝 Updating ${envPath}`);

    // Read the existing .env content (if any)
    let envContent = "";
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, "utf8");
    }

    // Check if SWAP_EXECUTOR_ADDRESS already exists — replace it, else add new
    const newLine = `SWAP_EXECUTOR=${deployedAddress}`;
    if (envContent.includes("SWAP_EXECUTOR=")) {
      envContent = envContent.replace(/SWAP_EXECUTOR=.*/g, newLine);
    } else {
      if (envContent.length && !envContent.endsWith("\n")) envContent += "\n";
      envContent += newLine + "\n";
    }

    // Write updated content back to file
    fs.writeFileSync(envPath, envContent);
    console.log(`📝 Updated .env with SWAP_EXECUTOR=${deployedAddress}`);
  } catch (err) {
    console.error("⚠️ Failed to update .env file:", err);
  }

  console.log("➡️ Next step: Copy this address to frontend config if needed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});