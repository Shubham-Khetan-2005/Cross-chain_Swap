import { ethers } from "ethers";
import { Pool, TickListDataProvider } from "@uniswap/v3-sdk";
import { CurrencyAmount, Token } from "@uniswap/sdk-core";
import IUniswapV3PoolABI from "@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json";
import IUniswapV3FactoryABI from "../abis/uniswapV3Factory.json";
import erc20abi from "../abis/erc20.json";
import swapExecutorAbi from "../abis/swapExecutor.json";
import chainManifest from "../chainManifest.json";

// --- HELPER CLASS FOR ON-CHAIN TICK DATA ---
class OnChainTickDataProvider {
  constructor(poolContract) {
    this.poolContract = poolContract;
  }

  async getTick(tick) {
    const tickData = await this.poolContract.ticks(tick);
    return {
      liquidityNet: tickData.liquidityNet.toString(),
      liquidityGross: tickData.liquidityGross.toString(),
    };
  }

  // eslint-disable-next-line no-unused-vars
  async nextInitializedTickWithinOneWord(tick, lte, tickSpacing) {
    // This is a simplified version for simple quotes. A production app might need a more complex implementation.
    return [tick, true];
  }
}

/* -------------------------
   (Other functions remain the same)
   ------------------------- */
export function getErc20Contract(tokenAddress, signerOrProvider) {
  return new ethers.Contract(tokenAddress, erc20abi, signerOrProvider);
}
export function getSwapExecutor(signerOrProvider, swapExecutorAddress) {
  return new ethers.Contract(
    swapExecutorAddress,
    swapExecutorAbi,
    signerOrProvider
  );
}
export async function getTokenMetadata(tokenAddress, provider) {
  const tokenContract = getErc20Contract(tokenAddress, provider);
  const safeCall = async (func, fallback) => {
    try {
      return await func();
    } catch {
      return fallback;
    }
  };
  const [decimals, symbol, name] = await Promise.all([
    safeCall(() => tokenContract.decimals(), 18),
    safeCall(() => tokenContract.symbol(), "UNKNOWN"),
    safeCall(() => tokenContract.name(), "Unknown Token"),
  ]);
  return {
    address: tokenAddress,
    decimals: Number(decimals),
    symbol: String(symbol),
    name: String(name),
  };
}

/* -------------------------
   FINAL QUOTE HELPER (With On-Chain Tick Provider)
   ------------------------- */

export async function getQuote(
  provider,
  chainId,
  tokenInMeta,
  tokenOutMeta,
  fee,
  amountIn
) {
  const numericChainId = Number(chainId);
  if (!numericChainId) throw new Error("Invalid chainId.");

  const { factory } = chainManifest[numericChainId];
  if (!factory) throw new Error("Factory address not found for this chain.");

  const factoryContract = new ethers.Contract(
    factory,
    IUniswapV3FactoryABI,
    provider
  );

  const tokenIn = new Token(
    numericChainId,
    tokenInMeta.address,
    tokenInMeta.decimals
  );
  const tokenOut = new Token(
    numericChainId,
    tokenOutMeta.address,
    tokenOutMeta.decimals
  );

  const poolAddress = await factoryContract.getPool(
    tokenIn.address,
    tokenOut.address,
    fee
  );

  if (poolAddress === ethers.ZeroAddress) {
    throw new Error(
      "Pool does not exist. Please try a different fee tier or token pair."
    );
  }

  const poolContract = new ethers.Contract(
    poolAddress,
    IUniswapV3PoolABI.abi,
    provider
  );

  try {
    const [liquidity, slot0, tickSpacingResult] = await Promise.all([
      poolContract.liquidity(),
      poolContract.slot0(),
      poolContract.tickSpacing(),
    ]);

    if (liquidity === 0n) {
      throw new Error("Pool exists but has zero liquidity.");
    }

    const { sqrtPriceX96, tick } = slot0;
    const numericTick = Number(tick);
    const tickSpacing = Number(tickSpacingResult);

    // --- THE FINAL FIX: Calculate the nearest usable tick ---
    const nearestUsableTick =
      Math.floor(numericTick / tickSpacing) * tickSpacing;

    // Fetch the data for the nearest usable tick, not the current tick
    const tickData = await poolContract.ticks(nearestUsableTick);
    // ---------------------------------------------------------

    const tickDataProvider = new TickListDataProvider(
      [
        {
          index: nearestUsableTick,
          liquidityGross: tickData.liquidityGross.toString(),
          liquidityNet: tickData.liquidityNet.toString(),
        },
      ],
      tickSpacing
    );

    console.log("Liquidity:", liquidity);
    console.log("Sqrt Price X96:", sqrtPriceX96);
    console.log("Tick:", tick);
    console.log("Tick Spacing:", tickSpacing);
    console.log("Tick Data Provider:", tickDataProvider);

    const pool = new Pool(
      tokenIn,
      tokenOut,
      fee,
      sqrtPriceX96.toString(),
      liquidity.toString(),
      numericTick,
      tickDataProvider
    );

    const inputAmount = CurrencyAmount.fromRawAmount(
      tokenIn,
      amountIn.toString()
    );

    console.log("Input Amount:", inputAmount);

    const [outputAmount] = await pool.getOutputAmount(inputAmount);

    const rawQuote = BigInt(outputAmount.quotient.toString());

    // --- DEBUGGING LOG ---
    // This log will show us the true calculated value before formatting.
    console.log(
      `Raw Quote: ${rawQuote.toString()} (using ${
        tokenOutMeta.decimals
      } decimals for output)`
    );
    // ---------------------

    return rawQuote;
  } catch (err) {
    console.error("SDK Quoting Error:", err);
    throw new Error(
      "Could not calculate quote for this pool. It may be out of range, or maybe pool exist but there is no liquidity choose different fee"
    );
  }
}

/* -------------------------
   (The rest of the file remains the same)
   ------------------------- */
export function parseAmount(amountHuman, decimals = 18) {
  if (!amountHuman) return BigInt(0);
  return ethers.parseUnits(String(amountHuman), decimals);
}
export function formatAmount(amountRaw, decimals = 18, significantDigits = 6) {
  if (!amountRaw || decimals === undefined) {
    return "0.0";
  }
  try {
    const formattedString = ethers.formatUnits(amountRaw, decimals);
    const number = parseFloat(formattedString);
    // Use toPrecision to handle very small numbers and show significant digits
    return number.toPrecision(significantDigits);
  } catch {
    return "0.0";
  }
}
export function computeAmountOutMin(amountOutBN, slippagePercent) {
  const slippageBps = Math.round(slippagePercent * 100);
  return (amountOutBN * BigInt(10000 - slippageBps)) / BigInt(10000);
}
export async function getAllowance(
  tokenAddress,
  ownerAddress,
  spenderAddress,
  signerOrProvider
) {
  const token = getErc20Contract(tokenAddress, signerOrProvider);
  return BigInt(
    (await token.allowance(ownerAddress, spenderAddress)).toString()
  );
}
export async function approveToken(
  tokenAddress,
  spenderAddress,
  amountBN,
  signer
) {
  const token = getErc20Contract(tokenAddress, signer);
  return token.approve(spenderAddress, amountBN);
}
export async function executeSwap(signer, params) {
  const {
    swapExecutorAddress,
    tokenIn,
    tokenOut,
    fee,
    amountInBN,
    amountOutMinBN,
    deadline,
  } = params;
  const swapContract = getSwapExecutor(signer, swapExecutorAddress);
  return swapContract.swapExactInputSingle(
    tokenIn,
    tokenOut,
    fee,
    amountInBN,
    amountOutMinBN,
    deadline,
    0,
    "0x"
  );
}
export async function getTokenBalance(
  tokenAddress,
  ownerAddress,
  signerOrProvider
) {
  const token = getErc20Contract(tokenAddress, signerOrProvider);
  return BigInt((await token.balanceOf(ownerAddress)).toString());
}
