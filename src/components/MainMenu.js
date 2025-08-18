import React, {useEffect} from 'react';
import useAuthHeader from '../utils/useAuthHeader';
import { useGame } from '../store';
import config from '../config.json';

const {BACKEND_URL} = config;

function HUD() {
  const { fuel } = useGame()
  return (
    <div className="hud">
      <div className="fuel-gauge"><span className="fuel-dot" /> Fuel Units: {fuel}</div>
      {/* <div>Mode: Dark Sci‑Fi</div> */}
    </div>
  )
}

function RoadPreview() {
  return (
    <div className="road card">
      <div className="lines" />
      <div className="car" />
    </div>
  )
}

export default function MainMenu({address}) {
  const { setFuel, setStatus, result } = useGame()
  const headers = useAuthHeader();

  useEffect(() => {
    getUserFuel();
  }, [])

  const getUserFuel = async () => {
    const res = await fetch(`${BACKEND_URL}/player/me`, { method: 'GET', headers, user: {address}});
    const data = await res.json()
    setFuel(data.fuel)
  };
  

  const claimDaily = async () => {
    setStatus('Claiming daily...')
    const res = await fetch(`${BACKEND_URL}/fuel/claimDaily`, { method: 'POST', headers })
    const data = await res.json()
    setFuel(data.fuel)
    setStatus(data.message || 'Claimed')
  }

  // Optional UX enhancement: do token transfer via contract call and send txHash here.
  const buyFuel = async (amount = 1, txHash = '') => {
    setStatus('Verifying purchase...')
    const res = await fetch(`${BACKEND_URL}/fuel/purchase`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, txHash })
    })
    const data = await res.json()
    if (data.error) { setStatus(data.error); return }
    setFuel(data.fuel)
    setStatus('Purchased fuel')
  }

  return (
    <div className="grid">
      <div className="card">
        <HUD />
        <div style={{ display:'flex', gap:10, marginTop: 8 }}>
          <button className="btn" onClick={() => buyFuel(1)}>Buy 1 Fuel (verify tx)</button>
          <button className="btn ghost" onClick={claimDaily}>Claim Daily Fuel</button>
        </div>
      </div>
      <RoadPreview />
      {result && (
        <div className="card">
          <h3>Result</h3>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}