import React, { useState, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { api, useFuelRacerCountdown } from "./Races";
import { useGame } from "../store";
import { connectMetaMask } from "../utils/connectMetaMask";
import Notification from "./Notification";
import { hasEnoughFuelTokens } from "../utils/checkFuelTokenBalance";
import CanvasGame from './CanvasGame';

function toDate(ts) {
  // supports Firestore Timestamp-like objects from backend { _seconds, _nanoseconds } OR { seconds, nanoseconds }
  if (!ts) return null;
  if (ts._seconds) return new Date(ts._seconds * 1000);
  if (ts.seconds) return new Date(ts.seconds * 1000);
  if (typeof ts === "string" || typeof ts === "number") return new Date(ts);
  return null;
}

function formatTime(dt) {
  if (!dt) return "—";
  return dt.toLocaleString(undefined, { hourCycle: "h23" });
}

const Button = ({ children, onClick, className }) => (
    <button
    onClick={onClick}
    className={`px-4 py-2 rounded-xl font-semibold transition ${className}`}
    >
    {children}
    </button>
);

function msToTime(ms) {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const cs = Math.floor((ms % 1000) / 10); // centiseconds
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

function LeaderboardModal({ race, open }) {
  const [rows, setRows] = useState([]);
  const {wallet} = useGame();

  // auto-refresh leaderboard every 5s while open
  useEffect(() => {
    let timer;
    async function load() {
      if (!race) return;
      try {
        const data = await api(`/races/${race.id}/leaderboard?top=10`);
        setRows(data.rows || data.leaderboard || []);
      } catch (e) {
        // ignore
      }
    }
    if (open) {
      load();
      timer = setInterval(load, 5000);
    }
    return () => timer && clearInterval(timer);
  }, [open, race?.id]);

  if (!open || !race) return null;
//   const start = toDate(race.startAt);
//   const end = toDate(race.endAt);

  return (
    <div className="bg-gray-800 px-6 py-4">
        <h3 className="font-semibold mb-2">🏆 Top 10 Scores</h3>
        <ol className="space-y-1 text-sm">
        {rows.map((entry, i) => {
            const isCurrentUser =
              wallet &&
              entry.playerAddress?.toLowerCase() === wallet.toLowerCase();
            return (
                <li key={i} className={`flex justify-between py-2`}>
                <span>
                    {entry.rank || i + 1}. <span className={`${isCurrentUser ? "text-yellow-400" : "text-gray-200"}`}>{isCurrentUser ? "You" : `#${i + 1} ${entry.playerAddress}`}</span>
                </span>
                
                <span className="text-green-400">
                    {msToTime(entry.bestTime)}
                </span>
                </li>
            );
        })}
        {!rows.length ? 'No score registered' : ""}
        </ol>
    </div>
  )

//   return (
//     <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
//       <div className="w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
//         <Card>
//           <div className="flex items-center justify-between mb-4">
//             <h3 className="text-lg font-semibold">Leaderboard — {formatTime(start)} UTC</h3>
//             <button className="px-3 py-1 rounded-xl border text-sm" onClick={onClose}>Close</button>
//           </div>
//           <div className="overflow-x-auto">
//             <table className="w-full text-sm">
//               <thead>
//                 <tr className="text-left border-b border-zinc-200 dark:border-zinc-800">
//                   <th className="py-2 pr-2">#</th>
//                   <th className="py-2 pr-2">Player</th>
//                   <th className="py-2 pr-2">Best Time</th>
//                   <th className="py-2 pr-2">Attempts</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {rows.length === 0 && (
//                   <tr>
//                     <td colSpan={4} className="py-6 text-center text-zinc-500">No results yet.</td>
//                   </tr>
//                 )}
//                 {rows.map((r, i) => (
//                   <tr key={r.id || i} className="border-b border-zinc-100 dark:border-zinc-800/50">
//                     <td className="py-2 pr-2 font-medium">{r.rank || i + 1}</td>
//                     <td className="py-2 pr-2 font-mono text-xs break-all">{r.id || r.playerId || r.playerAddress}</td>
//                     <td className="py-2 pr-2">{msToTime(r.bestTime)}</td>
//                     <td className="py-2 pr-2">{r.attempts ?? "—"}</td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         </Card>
//       </div>
//     </div>
//   );
}

function HUD() {
  const { fuel } = useGame()
  return (
    <div className="hud">
      <div className="fuel-gauge"><span className="fuel-dot" /> Fuel Units: {fuel}</div>
      {/* <div>Mode: Dark Sci‑Fi</div> */}
    </div>
  )
}

const WrappedButton = ({onClick, className, label}) => {
    return <Button
        onClick={onClick}
        className={className}
    >
        {label}
    </Button>
};

export default function LandingPage({
  currentRunRef,
  registerToken,
  finalTime,
  finishRace,
  setFinalTime
}) {
    const [expandedRace, setExpandedRace] = useState(null);
    const [summary, setSummary] = useState({ active: null, upcoming: [] });
    const [races, setRaces] = useState([]);
    const countdown = useFuelRacerCountdown(summary);
    const {setFuel, setStatus, setRacing, setWallet, wallet, racing, fuel} = useGame();
    const [notification, setNotification] = useState(null);
    const [ok, setOk] = useState(false);

    // Auto-refresh summary every 5s
    useEffect(() => {
        let t;
        async function load() {
            try {
                const data = await api(`/races/summary`);
                // backend may return {active, upcoming} OR {races: [...]} from older version
                if (data.races) {
                    const active = data.races.find(r => r.state === "active") || null;
                    const upcoming = data.races.filter(r => r.state === "upcoming").slice(0,2);
                    setSummary({ active, upcoming });
                } else {
                    setSummary({ active: data.active || null, upcoming: data.upcoming || [] });
                }

                const pastRaces = await api(`/races/past?limit=20`);
                setRaces(pastRaces.items || []);
            } catch (e) {
                // ignore
            }
        }
        load();
        t = setInterval(load, 5000);
        // getUserFuel();
        return () => clearInterval(t);
    }, []);

    useEffect(() => {
        getUserFuel(wallet);
    }, [wallet]);

    const getUserFuel = async (address) => {
        const data = await api(`/player/me`, { method: "GET", user: JSON.stringify({ address }) });
        setFuel(data.fuel)
    };

    const handleConnect = async () => {
        try {
          const {provider, signer, address} = await connectMetaMask();
          await registerToken(provider, signer, address);
          setWallet(address);
    
          setStatus("checking");
          const res = await hasEnoughFuelTokens(provider, address);
          if (res.ok) {
            setOk(true);
            setStatus("ready");
            showNotification({message: "Access granted. Let's race!", type: 'success'})
          } else {
            setOk(false);
            setStatus("denied");
            showNotification({message: "Not enough Fuel Tokens (need ≥ 10,000,000).", type: 'warning'})
          }
        } catch (e) {
          setStatus("error");
          showNotification({message: e?.message || "Connection error", type: 'error'})
        }
    }

    async function startRun(race) {
        try {
            setStatus('Starting race...')
            const data = await api(`/runs/start`, { method: "POST", body: JSON.stringify({ raceId: race.id }) });
            currentRunRef.current = { raceId: race.id, runId: data.runId };
        
            if (!data.ok) {
                showNotification({message: data.message || 'Not enough fuel', type: 'warning'});
                return setStatus(data.message || 'Not enough fuel')
            }
    
            setFuel(data.fuel)
            setRacing(true)
            setFinalTime(0);
        } catch (e) {
            showNotification({message: e.message || 'Not enough fuel', type: 'error'});
            setStatus(e.message || 'Not enough fuel')
        }
    }

    const showNotification = (message) => {
        setNotification(message);

        // Hide after 5 seconds
        setTimeout(() => setNotification(null), 5000);
    };

    return (
        <div className="min-h-screen flex flex-col bg-[#0d0d0d] text-gray-200 font-sans">
        {/* Header */}
        <header className="w-full flex items-center justify-between px-6 py-4 border-b border-gray-800">
            <div className="text-xl font-bold tracking-wide text-white">
            🚦 Fuel Racer
            </div>
            <div style={{display: 'flex', alignItems: 'center', gap: '30px'}}>
                <div className="fuel-gauge"><span className="fuel-dot" /> Fuel Units: {fuel}</div>
                <WrappedButton
                    onClick={handleConnect}
                    className="bg-green-600 text-white shadow-md px-4 py-2 rounded"
                    label={wallet
                        ? wallet.slice(0, 6) + "..." + wallet.slice(-4)
                        : "Connect Wallet"
                    }
                />
            </div>
        </header>

        {notification && (
            <Notification
            message={notification.message}
            type={notification.type}
            />
        )}

        {/* Main Body */}
        {racing && <CanvasGame onFinish={finishRace} finalTime={finalTime} />}
        {!racing && (
            <main className="flex-1 flex flex-col items-center p-6 space-y-8">
                {/* Countdown / Race Status */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-lg w-full max-w-xl p-6 text-center">
                {countdown.active ? (
                    <div className="space-y-4">
                        <WrappedButton
                            onClick={() => startRun(summary.active)}
                            className="bg-red-600 text-white text-lg shadow-md px-4 py-2 rounded"
                            label="Start Race 🏁"
                        />
                        <div className="text-lg font-semibold text-gray-300">
                            ⏳ Time left:{" "}
                            <span className="text-white">{countdown.timeToEnd}</span>
                        </div>
                        <LeaderboardModal race={summary.active} open />
                    </div>
                ) : (
                    <div className="text-lg font-semibold text-gray-300">
                    ⏳ Next race in:{" "}
                    <span className="text-white">{countdown.timeToStart || "Tomorrow at 13:00 UTC"}</span>
                    </div>
                )}
                </div>

                {/* Past Races */}
                <div className="w-full max-w-2xl">
                <h2 className="text-lg font-semibold mb-3">🏎 Past Races</h2>
                <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-lg overflow-hidden">
                    {races.map((race, idx) => {
                    const isExpanded = expandedRace === idx;
                    return (
                        <div key={idx} className="border-b border-gray-800">
                        <button
                            onClick={() =>
                            setExpandedRace(isExpanded ? null : idx)
                            }
                            className="flex justify-between items-center w-full px-4 py-3 text-left hover:bg-gray-800 transition"
                        >
                            <span>
                            Race #{race.id} - {race.date}
                            </span>
                            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>
                        {isExpanded && (
                            <LeaderboardModal race={race} open={isExpanded} />
                        )}
                        </div>
                    );
                    })}
                </div>
                </div>
            </main>

        )}


        {/* Footer */}
        <footer className="w-full text-center py-4 border-t border-gray-800 text-gray-500 text-sm">
            © 2025 Fuel Racer
        </footer>
        </div>
    );
}
