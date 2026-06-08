// src/components/SwapForm.jsx
import React, { useState, useEffect } from "react";
import TokenSelector from "./TokenSelector";
import {
  parseAmount,
  formatAmount,
  getQuote,
  computeAmountOutMin,
  getTokenBalance,
  getAllowance,
  approveToken,
  executeSwap
} from "../utils/web3";
import chainManifest from "../chainManifest.json";

const DEFAULT_FEE_TIERS = [
  { label: "0.05% (500)", value: 500 },
  { label: "0.30% (3000)", value: 3000 },
  { label: "1% (10000)", value: 10000 }
];

export default function SwapForm({ provider, signer, address, chainId }) {
  const [tokenInAddr, setTokenInAddr] = useState("");
  const [tokenInMeta, setTokenInMeta] = useState(null);
  const [tokenOutAddr, setTokenOutAddr] = useState("");
  const [tokenOutMeta, setTokenOutMeta] = useState(null);

  const [amountInHuman, setAmountInHuman] = useState("");
  const [tokenInBalance, setTokenInBalance] = useState(null);

  const [fee, setFee] = useState(3000);
  const [slippage, setSlippage] = useState(0.5); // percent
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  // Default tokens for Sepolia testnet
  const defaultTokens = [
    { address: "0x7b79995e5f793a07bc00c21412e50ecae098e7f9", label: "WETH (Sepolia)" },
    { address: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", label: "USDC (Sepolia)" }
  ];

  // Fetch user's balance for the selected input token
  useEffect(() => {
    async function fetchBalance() {
      if (!provider || !address || !tokenInAddr) {
        setTokenInBalance(null);
        return;
      }
      try {
        const balance = await getTokenBalance(tokenInAddr, address, provider);
        setTokenInBalance(balance);
      } catch (err) {
        console.error("Failed to fetch balance:", err);
        setTokenInBalance(null);
      }
    }
    fetchBalance();
  }, [provider, address, tokenInAddr]);


  async function onTokenInChange(addr, meta) {
    setTokenInAddr(addr || "");
    setTokenInMeta(meta || null);
    setQuote(null);
    setTokenInBalance(null); // Reset balance on token change
  }
  async function onTokenOutChange(addr, meta) {
    setTokenOutAddr(addr || "");
    setTokenOutMeta(meta || null);
    setQuote(null);
  }

  async function handleGetQuote() {
    if (!provider || !tokenInAddr || !tokenOutAddr || !tokenInMeta || !tokenOutMeta || !amountInHuman || Number(amountInHuman) <= 0) {
      return alert("Please fill all fields to get a quote.");
    }

    setLoading(true);
    setStatus("Getting quote...");

    try {
      const amountInBN = parseAmount(amountInHuman, tokenInMeta.decimals);

      // Call the new SDK-based getQuote function
      // It now needs the chainId and the full metadata objects
      const amountOutBN = await getQuote(provider, chainId, tokenInMeta, tokenOutMeta, fee, amountInBN);
      const amountOutMinBN = computeAmountOutMin(amountOutBN, slippage);

      setQuote({ amountInBN, amountOutBN, amountOutMinBN });
      setStatus("Quote received.");
    } catch (err) {
      console.error(err);
      setStatus("Quote failed: " + (err?.message || "Unknown error"));
      setQuote(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleSwap() {
    // --- 1. Validations ---
    if (!signer || !quote || !address || !chainId) return alert("Please connect your wallet and get a quote first.");
    const amountInBN = parseAmount(amountInHuman, tokenInMeta.decimals);
    if (amountInBN <= 0n) return alert("Amount must be greater than zero.");
    if (tokenInBalance !== null && amountInBN > tokenInBalance) return alert("Insufficient balance.");

    setLoading(true);
    try {
      const chainConfig = chainManifest[chainId];
      if (!chainConfig) throw new Error(`Unsupported chain: ${chainId}`);

      // --- 2. Check allowance ---
      setStatus("1/2: Checking allowance...");
      const allowance = await getAllowance(tokenInAddr, address, chainConfig.swapExecutor, signer);

      if (allowance < amountInBN) {
        setStatus("1/2: Awaiting approval...");
        const approveTx = await approveToken(tokenInAddr, chainConfig.swapExecutor, amountInBN, signer);
        await approveTx.wait(); // Wait for 1 confirmation
      }

      // --- 3. Execute the swap ---
      setStatus("2/2: Executing swap...");
      const deadline = Math.floor(Date.now() / 1000) + 600; // 10 minute deadline

      const swapParams = {
        swapExecutorAddress: chainConfig.swapExecutor,
        tokenIn: tokenInAddr,
        tokenOut: tokenOutAddr,
        fee: fee,
        amountInBN: amountInBN,
        amountOutMinBN: quote.amountOutMinBN,
        deadline: deadline,
      };

      const receipt = await executeSwap(signer, swapParams);
      setStatus(`Swap successful! Tx: ${receipt.hash.slice(0, 10)}...`);
      console.log("Swap receipt", receipt);

    } catch (err) {
      console.error(err);
      const errorMessage = err?.reason || err?.message || "An unknown error occurred.";
      setStatus(`Swap failed: ${errorMessage.slice(0, 50)}...`);
    } finally {
      setLoading(false);
    }
  }

  // Helper formatting function
  const fmtAmount = (rawBN, decimals) => formatAmount(rawBN, decimals, 6);

  // Determine button state
  const isBalanceInsufficient = tokenInBalance !== null && quote?.amountInBN > tokenInBalance;
  const swapButtonText = isBalanceInsufficient ? "Insufficient Balance" : "Swap";

  return (
    <div>
      <div className="mb-4 grid grid-cols-1 gap-3">
        <TokenSelector provider={provider} value={tokenInAddr} onChange={onTokenInChange} label="From (token)" defaultTokens={defaultTokens} />
        <TokenSelector provider={provider} value={tokenOutAddr} onChange={onTokenOutChange} label="To (token)" defaultTokens={defaultTokens} />
      </div>

      <div className="mb-4">
        <label className="block text-sm text-slate-300 mb-1">Amount</label>
        <div className="relative">
          <input className="input" value={amountInHuman} onChange={(e) => setAmountInHuman(e.target.value)} placeholder="0.01" />
          {tokenInBalance !== null && tokenInMeta && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
              Balance: {fmtAmount(tokenInBalance, tokenInMeta.decimals)}
            </div>
          )}
        </div>
      </div>

      <div className="mb-4 flex gap-3 items-center">
        <div>
          <label className="text-sm text-slate-300 block mb-1">Pool fee</label>
          <select className="input" value={fee} onChange={(e) => setFee(Number(e.target.value))}>
            {DEFAULT_FEE_TIERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm text-slate-300 block mb-1">Slippage %</label>
          <input className="input w-24" value={slippage} onChange={(e) => setSlippage(Number(e.target.value))} />
        </div>
        <div className="self-end flex-grow">
          <button onClick={handleGetQuote} className="w-full px-3 py-2 rounded-md bg-violet-600 text-white disabled:bg-slate-600" disabled={loading}>
            {loading && status.startsWith("Getting quote...") ? "Quoting..." : "Get Quote"}
          </button>
        </div>
      </div>

      {quote && (
        <div className="mb-4 p-3 rounded bg-slate-800 text-sm">
          <div>Estimated out: <strong>{fmtAmount(quote.amountOutBN, tokenOutMeta?.decimals ?? 18)}</strong> {tokenOutMeta?.symbol || ""}</div>
          <div className="text-slate-400">Minimum out (slippage applied): <strong>{fmtAmount(quote.amountOutMinBN, tokenOutMeta?.decimals ?? 18)}</strong></div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          className="w-full px-4 py-2 rounded-md bg-emerald-600 text-white disabled:bg-slate-600 disabled:text-slate-400"
          onClick={handleSwap}
          disabled={loading || !quote || isBalanceInsufficient}
        >
          {loading && !status.startsWith("Getting quote...") ? status : swapButtonText}
        </button>
      </div>
      {status && !loading && <div className="text-sm text-slate-400 mt-2">{status}</div>}
    </div>
  );
}