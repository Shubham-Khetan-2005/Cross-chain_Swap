import React, { useState } from "react";
import ConnectWallet from "./components/ConnectWallet";
import SwapForm from "./components/SwapForm";

export default function App() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [address, setAddress] = useState(null);
  const [chainId, setChainId] = useState(null);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Token Swap</h1>
          <p className="text-sm text-slate-400">Demo — Uniswap V3 wrapper</p>
        </div>

        <ConnectWallet
          onConnect={({ provider, signer, address, chainId }) => {
            setProvider(provider);
            setSigner(signer);
            setAddress(address);
            setChainId(chainId);
          }}
          onDisconnect={() => {
            setProvider(null);
            setSigner(null);
            setAddress(null);
            setChainId(null);
          }}
        />
      </header>

      <main className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="card">
          <h2 className="text-lg font-medium mb-3">Swap</h2>
          <SwapForm provider={provider} signer={signer} address={address} chainId={chainId} />
        </section>

        <section className="card">
          <h2 className="text-lg font-medium mb-3">Notes & Quick Actions</h2>
          <div className="text-sm text-slate-300 space-y-2">
            <p>- Frontend will call Quoter to get estimates and compute amountOutMin.</p>
            <p>- Approvals are required; we will later add Permit2 flow to avoid separate approve tx.</p>
            <p>- History will be read from SwapExecutor events (no DB required).</p>
          </div>
        </section>
      </main>
    </div>
  );
}
