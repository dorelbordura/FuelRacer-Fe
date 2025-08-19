import React, { useRef, useState } from "react";
import WalletGate from "./components/WalletGate";
import "./components/styles.css";
import { useGame } from './store';
import CanvasGame from "./components/CanvasGame";
import useAuthHeader from "./utils/useAuthHeader";
import MainMenu from './components/MainMenu';
import config from './config.json';
import registerToken from "./utils/registerToken";
import Races from './components/Races';
import LandingPage from "./components/LandingPage";
const {BACKEND_URL} = config;
import './output.css';

function App() {
  const { wallet, hasAccess, setFuel, setStatus, setRacing, racing, setResult, setHasAccess, setWallet } = useGame()
  const headers = useAuthHeader()
  const currentRunRef = useRef(null);
  const [finalTime, setFinalTime] = useState(null);

  const finishRace = async () => {
    setStatus('Finishing...')
    const curr = currentRunRef.current;
    if (!curr) return setStatus("No run started");

    try {
      const res = await fetch(`${BACKEND_URL}/runs/finish`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(curr)
      })
      const data = await res.json()

      if (data.elapsedMs) setFinalTime(data.elapsedMs / 1000);

      if (data.fuel) setFuel(data.fuel);
      if (data.message) setStatus(data.message);
      setResult(data)
      setTimeout(() => setRacing(false), 3000);
    } catch (e) {
      setStatus(e.message);

    }
  }

  const onEnter = async (address) => {
    setWallet(address);
    setHasAccess(true);
  }

  return (
    <LandingPage
      {...{currentRunRef, registerToken, finalTime, finishRace, setFinalTime}}
    />
  )

  return (
    <div className="scene">
      <div className="neon-road" />
      <div className="stars" />
      {!wallet || !hasAccess ? (
        <WalletGate onEnter={onEnter} registerToken={registerToken} />
      ) : (
        <>
          <div className="logo">⛽ Fuel Racer</div>
          <MainMenu address={wallet} setFuel={setFuel} />
          {!racing && <Races currentRunRef={currentRunRef} />}
          {racing  && <CanvasGame onFinish={finishRace} finalTime={finalTime} />}
        </>
      )}
    </div>
  );
}

export default App;
