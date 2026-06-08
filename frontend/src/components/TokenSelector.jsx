// src/components/TokenSelector.jsx
import React, { useState } from "react";
import { getTokenMetadata } from "../utils/web3";

/*
 Props:
 - provider: ethers provider (BrowserProvider or JsonRpcProvider)
 - value: token address string (controlled)
 - onChange: fn(tokenAddress, metadata|null)
 - label: string
 - defaultTokens: optional array [{address, label}] to show shortcuts
*/

export default function TokenSelector({ provider, value, onChange, label = "Token", defaultTokens = [] }) {
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState(null);
  const [addr, setAddr] = useState(value || "");

  // load metadata for current address
  async function loadMeta(tokenAddress) {
    setLoading(true);
    try {
      const m = await getTokenMetadata(tokenAddress, provider);
      setMeta(m);
      onChange?.(tokenAddress, m);
    } catch (err) {
      setMeta(null);
      onChange?.(tokenAddress, null);
      console.error("Token metadata error", err);
      alert("Failed to read token metadata. Is the address correct for this network?");
    } finally {
      setLoading(false);
    }
  }

  function onTokenInput(e) {
    const v = e.target.value.trim();
    setAddr(v);
  }

  async function onLoadClick() {
    if (!addr) {
      alert("Enter token contract address");
      return;
    }
    await loadMeta(addr);
  }

  return (
    <div>
      <label className="block text-slate-300 text-sm mb-1">{label}</label>

      <div className="flex gap-2 mb-2">
        <input className="input" value={addr} onChange={onTokenInput} placeholder="0x..." />
        <button className="px-3 py-1 rounded-md bg-violet-600 text-white" onClick={onLoadClick}>
          {loading ? "Loading..." : "Load"}
        </button>
      </div>

      {defaultTokens.length > 0 && (
        <div className="flex gap-2 mb-2">
          {defaultTokens.map((t) => (
            <button
              key={t.address}
              className="px-2 py-1 text-xs rounded bg-slate-700 text-slate-200"
              onClick={() => { setAddr(t.address); loadMeta(t.address); }}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {meta ? (
        <div className="text-sm text-slate-300">
          <div><strong>{meta.symbol}</strong> — {meta.name}</div>
          <div className="text-xs text-slate-400">Decimals: {meta.decimals}</div>
        </div>
      ) : (
        <div className="text-xs text-slate-500">No token loaded</div>
      )}
    </div>
  );
}
