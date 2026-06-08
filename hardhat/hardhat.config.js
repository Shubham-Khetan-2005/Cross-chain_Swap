// hardhat.config.js
require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");

/**
 * Local-first config:
 * - hardhat network: default local in-memory network (no forking)
 * - localhost: for 'npx hardhat node' (RPC at http://127.0.0.1:8545)
 * - sepolia: optional; only used when SEPOLIA_RPC_URL + DEPLOYER_PRIVATE_KEY are provided in .env
 *
 * Notes:
 * - This file intentionally avoids mainnet forking by default.
 * - To deploy to Sepolia you'll need a provider URL and a deployer private key in .env (see .env.example).
 */

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || "";
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || "";

module.exports = {
  solidity: "0.8.19",
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545"
    },
    hardhat: {
      // default in-memory network; no forking configured
    },
    // Sepolia config: only used when env vars are present
    sepolia: SEPOLIA_RPC_URL
      ? {
          url: SEPOLIA_RPC_URL,
          accounts: DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : []
        }
      : undefined
  },
  // optionally silence warnings about undefined networks
  // Note: Hardhat ignores undefined properties when running other networks
};
