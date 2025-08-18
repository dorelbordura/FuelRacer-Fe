import React, { useState } from "react";
import { connectMetaMask } from "../utils/connectMetaMask";
import { hasEnoughFuelTokens } from "../utils/checkFuelTokenBalance";
import clsx from "clsx";
import "./styles.css";

export default function WalletGate({ onEnter, registerToken }) {
  const [address, setAddress] = useState(null);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [ok, setOk] = useState(false);

  const handleConnect = async () => {
    try {
      const {provider, signer, address} = await connectMetaMask();
      await registerToken(provider, signer, address);
      setAddress(address);
      setMessage("");

      setStatus("checking");
      const res = await hasEnoughFuelTokens(provider, address);
      if (res.ok) {
        setOk(true);
        setStatus("ready");
        setMessage("Access granted. Let's race!");
      } else {
        setOk(false);
        setStatus("denied");
        setMessage("Not enough Fuel Tokens (need ≥ 10,000,000).");
      }
    } catch (e) {
      setStatus("error");
      setMessage(e?.message || "Connection error");
    }
  }

  return (
    <div className="gate-shell">
      <div className="grid">
        <div className="holo-card">
          <div className="hud-title">FUEL RACER // ACCESS GATE</div>
          <div className="divider" />
          <div className="hud-text">Wallet: MetaMask</div>
          <div className="hud-text">Chain: Avalanche C-Chain</div>
          <div className="hud-text">Requirement: ≥ 10,000,000 FUEL</div>
          <button className="btn-primary" onClick={handleConnect} disabled={status==="connecting"}>
            {status === "connecting" ? "CONNECTING..." : "CONNECT METAMASK"}
          </button>
          {address && (
            <div className="hud-subtext">Connected: {address}</div>
          )}
          {message && (
            <div className={clsx("status", ok ? "ok" : status==="denied" ? "warn" : "err")}>
              {message}
            </div>
          )}
          {ok && (
            <button className="btn-ghost" onClick={() => onEnter(address)}>ENTER GARAGE</button>
          )}
        </div>
        <div className="scanlines" />
      </div>
    </div>
  );
}
