import React, { useEffect, useState } from "react";
import { ethers } from "ethers";

export default function ConnectWallet({ onConnect, onDisconnect }) {
  const [address, setAddress] = useState(null);
  const [chainId, setChainId] = useState(null);

  useEffect(() => {
    if (!window.ethereum) return;
    const handleAccounts = (accounts) => {
      if (!accounts || accounts.length === 0) {
        setAddress(null);
        onDisconnect?.();
      } else {
        try {
          setAddress(ethers.getAddress(accounts[0]));
        } catch {
          setAddress(accounts[0]);
        }
      }
    };
    const handleChain = (chainHex) => {
      try {
        const id = parseInt(chainHex, 16);
        setChainId(id);
      } catch {
        setChainId(null);
      }
    };

    window.ethereum.on("accountsChanged", handleAccounts);
    window.ethereum.on("chainChanged", handleChain);

    return () => {
      if (window.ethereum.removeListener) {
        window.ethereum.removeListener("accountsChanged", handleAccounts);
        window.ethereum.removeListener("chainChanged", handleChain);
      }
    };
  }, [onDisconnect]);

  async function connect() {
    if (!window.ethereum) {
      alert("Install MetaMask or another injected wallet.");
      return;
    }
    try {
      await window.ethereum.request({ method: "eth_requestAccounts" });
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const network = await provider.getNetwork();
      setAddress(address);
      setChainId(network.chainId);
      onConnect?.({ provider, signer, address, chainId: network.chainId });
    } catch (err) {
      console.error("Wallet connection error", err);
    }
  }

  function disconnect() {
    setAddress(null);
    setChainId(null);
    onDisconnect?.();
  }

  return (
    <div className="flex items-center gap-4">
      {address ? (
        <div className="flex items-center gap-3">
          <div className="text-sm">
            <div className="font-medium">{address.slice(0,6)}...{address.slice(-4)}</div>
            <div className="text-xs text-slate-400">Chain: {chainId}</div>
          </div>
          <button onClick={disconnect} className="px-3 py-1 rounded-md bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm">
            Disconnect
          </button>
        </div>
      ) : (
        <button onClick={connect} className="px-3 py-2 rounded-md bg-violet-600 text-white text-sm">
          Connect MetaMask
        </button>
      )}
    </div>
  );
}
