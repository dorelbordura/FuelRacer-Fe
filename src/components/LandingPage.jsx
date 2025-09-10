import React, { useState, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { api, useFuelRacerCountdown, parseJwt } from "./Races";
import { useGame } from "../store";
import { connectMetaMask } from "../utils/connectMetaMask";
import Notification from "./Notification";
import { hasEnoughFuelTokens, checkTokenBalance } from "../utils/checkFuelTokenBalance";
import CanvasGame from './CanvasGame';
import GateOverlay from './GateOverlay';
import Garage from "./Garage";
import AdminPage from "./AdminPage";
import FuelPopup from "./FuelShop";
import MapSelect from "./MapSelect";

const cars = [
    {
        name: 'Fuel Truck',
        image: '/cars/fuelTruck_preview.png',
        requiredLevel: 1
    },
    {
        name: 'Mini Cart',
        image: '/cars/miniCart_preview.png',
        requiredLevel: 2
    },
    {
        name: 'Tractor',
        image: '/cars/preview_car2.webp',
        requiredLevel: 3
    },
    {
        name: 'Fuel Van',
        image: '/cars/van_preview.png',
        requiredLevel: 4
    },
    {
        name: 'Fuel Bus',
        image: '/cars/bus_preview.png',
        requiredLevel: 5
    }
];

const maps = [
    {
        name: 'Sunny',
        image: '/maps/sunny.png',
        requiredLevel: 1
    },
    {
        name: 'Snowy',
        image: '/maps/snowy.png',
        requiredLevel: 10
    },
    {
        name: 'Rainy',
        image: '/maps/rainy.png',
        requiredLevel: 10
    },
    {
        name: 'Desert',
        image: '/maps/desert.png',
        requiredLevel: 10
    }
]

const themeNames = ["sunny", "snowy", "rainy", "desert"];

const soundtrack = new Audio("/sounds/backgroundMusic.mp3");
soundtrack.loop = true;
soundtrack.volume = 0.2;

const Button = ({ children, onClick, className }) => (
    <button
        onClick={onClick}
        className={`px-4 py-2 rounded-xl font-semibold transition ${className}`}
        style={{cursor: 'pointer'}}
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

  // auto-refresh leaderboard every 1m while open
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
      timer = setInterval(load, 60000);
    }
    return () => timer && clearInterval(timer);
  }, [open, race?.id]);

  if (!open || !race) return null;

  return (
    <div className="bg-gray-800 px-6 py-4" style={{height: '100%'}}>
        <h3 className="font-semibold mb-2" style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>🏆 Top 10 Scores</h3>
        <ol className="space-y-1 text-sm" style={{width: '100%', height: '100%'}}>
        {rows.map((entry, i) => {
            const isCurrentUser =
              wallet &&
              entry.playerAddress?.toLowerCase() === wallet.toLowerCase();
              const playerAddress = entry.playerAddress.slice(0, 6) + "..." + entry.playerAddress.slice(-4)
            return (
                <li key={i} className={`flex justify-between py-2`}>
                <span>
                    <span className={`${isCurrentUser ? "text-yellow-400" : "text-gray-200"}`}>{isCurrentUser ? `#${i + 1} You` : `#${i + 1} ${playerAddress}`}</span>
                </span>
                
                <span className="text-green-400">
                    {msToTime(entry.bestTime)}
                </span>
                </li>
            );
        })}
        {!rows.length ? <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%'}}>No score registered</div> : ""}
        </ol>
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
  setFinalTime
}) {
    const [expandedRace, setExpandedRace] = useState(null);
    const [summary, setSummary] = useState({ active: null, upcoming: [] });
    const [races, setRaces] = useState([]);
    const countdown = useFuelRacerCountdown(summary);
    const {setFuel, setStatus, setRacing, setWallet, wallet, racing, fuel, setResult, setLevel, setXp, setCredentials} = useGame();
    const [notification, setNotification] = useState(null);
    const [transitionState, setTransitionState] = useState("idle");
    const [showGarage, setShowGarage] = useState(false);
    const [selectedCar, setSelectedCar] = useState(0);
    const [pastPage, setPastPage] = useState(1);
    const [pastPerPage] = useState(5);
    const [showAdmin, setShowAdmin] = useState(false);
    const [showShopPopup, setShowShopPopup] = useState(false);
    const token = localStorage.getItem("fr_jwt");
    const tokenPayload = parseJwt(token);
    const [currentTheme, setCurrentTheme] = useState(themeNames[0]);
    const [showMaps, setShowMaps] = useState(false);

    const paginatedRaces = races.slice(
        (pastPage - 1) * pastPerPage,
        pastPage * pastPerPage
    );
    const totalPages = Math.ceil(races.length / pastPerPage);

    // Auto-refresh summary every 1m
    useEffect(() => {
        let t;
        async function load() {
            try {
                const data = await api(`/races/summary`);

                if (data.active || data.upcoming) {
                    setSummary({ active: data.active || null, upcoming: data.upcoming || [] });
                }

                const pastRaces = await api(`/races/past?limit=20`);
                setRaces(pastRaces.items || []);
            } catch (e) {
                // ignore
            }
        }
        load();
        t = setInterval(load, 60000);
        return () => clearInterval(t);
    }, []);

    useEffect(() => {
        if (wallet) {
            getPlayerData(wallet);
        }
    }, [wallet]);

    const getPlayerData = async (address) => {
        const data = await api(`/player/me`, { method: "GET", user: JSON.stringify({ address }) });
        setFuel(data.fuel);
        setLevel(data.level);
        setXp(data.xp);
    };

    const handleConnect = async () => {
        try {
          const {provider, signer, address} = await connectMetaMask(setCredentials);
          await registerToken(provider, signer, address);
          setWallet(address);
    
          setStatus("checking");
          const res = await hasEnoughFuelTokens(provider, address);
          if (res.ok) {
            setStatus("ready");
            showNotification({message: "Access granted. Let's race!", type: 'success'})
          } else {
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
            const res = await checkTokenBalance(wallet);

            if (res.ok) {
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
                soundtrack.currentTime = 0;
                soundtrack.play();
            } else {
                throw new Error("Not enough Fuel Tokens (need ≥ 10,000,000).")
            }
        } catch (e) {
            showNotification({message: e.message || 'Not enough fuel', type: 'error'});
            setStatus(e.message || 'Not enough fuel')
        }
    }

    const finishRace = async () => {
        setStatus('Finishing...')
        const curr = currentRunRef.current;
        if (!curr) return setStatus("No run started");

        try {
            const data = await api(`/runs/finish`, { method: "POST", body: JSON.stringify(curr) });

            if (data.elapsedMs) setFinalTime(data.elapsedMs / 1000);

            if (data.fuel) setFuel(data.fuel);
            if (data.message) setStatus(data.message);
            if (data.level) setLevel(data.level);
            if (data.xp) setXp(data.xp);

            setResult(data)
            soundtrack.pause();
            soundtrack.currentTime = 0;
        } catch (e) {
            showNotification({message: e.message, type: 'error'});
            setStatus(e.message);
        }
    }

    const showNotification = (message) => {
        setNotification(message);

        // Hide after 2.5 seconds
        setTimeout(() => setNotification(null), 2500);
    };

    const claimWeekly = async () => {
        setStatus('Claiming weekly...')
        const data = await api(`/fuel/claimWeekly`, { method: "POST" });
        setFuel(data.fuel)
        showNotification({message: data.message || 'Claimed'})
    }

    // Optional UX enhancement: do token transfer via contract call and send txHash here.
    const buyFuel = async (amount = 1, txHash = '') => {
        setStatus('Verifying purchase...')
        const data = await api(`/fuel/purchase`, { method: "POST", body: JSON.stringify({ amount, txHash }), user: { address: wallet }});
        if (data.error) { setStatus(data.error); return }
        setFuel(data.fuel)
        setStatus('Purchased fuel')
    }

    const onStartRaceClick = () => {
        if (!wallet) {
            showNotification({message: 'Wallet not connected', type: 'warning'});
        } else {
            setTransitionState("gateClosing");
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-[#0d0d0d] text-gray-200 font-sans">
            {showShopPopup ? (
                <FuelPopup
                    onClose={() => setShowShopPopup(false)}
                    buyFuel={buyFuel}
                    showNotification={showNotification}
                />
            ) : null}
            {/* Header */}
            <header className="w-full flex items-center justify-between px-6 py-4 border-b border-gray-800">
                <div className="text-xl font-bold tracking-wide text-white" style={{cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px'}} onClick={() => {
                    setShowGarage(false);
                    setRacing(false);
                    setShowAdmin(false);
                    setShowMaps(false);
                    soundtrack.pause();
                    soundtrack.currentTime = 0;
                }}>
                    <img src="/logo.png" alt="Fuel Racer Logo" style={{width: '50px'}} />
                    Fuel Racer
                </div>
                <div style={{display: 'flex', alignItems: 'center', gap: '30px'}}>
                    {wallet && (
                        <>
                            {tokenPayload?.isAdmin && (
                                <WrappedButton
                                    onClick={() => {
                                        setShowGarage(false);
                                        setRacing(false);
                                        setShowMaps(false);
                                        setShowAdmin(true);
                                    }}
                                    className="bg-red-500 hover:bg-red-600 text-white shadow-md px-4 py-2 rounded"
                                    label="Admin"
                                />
                            )}
                            <WrappedButton
                                onClick={claimWeekly}
                                className="btn ghost text-white shadow-md px-4 py-2 rounded hover:bg-gray-700 transition-colors"
                                label="Claim Weekly Fuel"
                            />
                            <WrappedButton
                                onClick={() => setShowShopPopup(true)}
                                className="btn ghost text-white shadow-md px-4 py-2 rounded hover:bg-gray-700 transition-colors"
                                label="Buy Fuel"
                            />
                            <div className="fuel-gauge"><span className="fuel-dot" /> Fuel Units: {fuel}</div>
                        </>
                    )}
                    <WrappedButton
                        onClick={!wallet ? handleConnect : () => null}
                        className="bg-red-500 hover:bg-red-600 text-white shadow-md px-4 py-2 rounded"
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
            {racing && (
                <CanvasGame
                    onFinish={finishRace}
                    finalTime={finalTime}
                    selectedCar={selectedCar}
                    mapTheme={currentTheme}
                    onLeaderboardClick={() => {
                        setRacing(false);
                        setShowGarage(false);
                        setShowMaps(false);
                    }}
                />
            )}
            {!racing && !showGarage && !showAdmin && !showMaps && (
                <main className="flex-1 flex flex-col items-center p-6 space-y-8">
                    {/* Countdown / Race Status */}
                    {
                        countdown.active ? (
                            <div className="active-race-container bg-gray-900 rounded-2xl shadow-lg" style={{overflow: 'hidden'}}>
                                <div className="countdown-container">
                                    <div className="text-lg font-semibold text-gray-300 timeToEnd">
                                        ⏳ Time left:{" "}
                                        <span className="text-white">{countdown.timeToEnd}</span>
                                    </div>
                                    <WrappedButton
                                        onClick={onStartRaceClick}
                                        className="bg-red-600 text-white text-lg shadow-md px-4 py-2 rounded startRaceButton"
                                        label="Start Race"
                                    />
                                </div>
                                <div className="leaderboard-container">
                                    <LeaderboardModal race={summary.active} open isActiveRace />
                                </div>
                            </div>
                        ) : (
                            <div className="text-lg font-semibold text-gray-300">
                                {countdown.timeToStart ? (
                                    <>
                                        ⏳ Next race in:{" "}
                                        <span className="text-white">{countdown.timeToStart}</span>
                                    </>
                                ) : (
                                    <>
                                        ⏳ Next race:{" "}
                                        <span className="text-white">{"Tomorrow at 13:00 UTC"}</span>
                                    </>
                                )}
                                
                            </div>
                        )
                    }

                    {/* Past Races */}
                    <div style={{width: '100vh'}}>
                        <h2 className="text-lg font-semibold mb-3">Past Races</h2>
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-lg overflow-hidden">
                            {
                                paginatedRaces.map((race, idx) => {
                                    const isExpanded = expandedRace === idx + (pastPage - 1) * pastPerPage;
                                    return (
                                        <div key={idx} className="border-b border-gray-800">
                                            <button
                                                onClick={() =>
                                                    setExpandedRace(isExpanded ? null : idx + (pastPage - 1) * pastPerPage)
                                                }
                                                className="flex justify-between items-center w-full px-4 py-3 text-left hover:bg-gray-800 transition"
                                            >
                                                <span>
                                                    Race #{race.id} - {race.date}
                                                </span>
                                                {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                            </button>
                                            {isExpanded && <LeaderboardModal race={race} open={isExpanded} />}
                                        </div>
                                    );
                                })
                            }
                            <div className="flex justify-between px-4 py-2 text-sm text-gray-400">
                                <button
                                    disabled={pastPage === 1}
                                    onClick={() => setPastPage(p => p - 1)}
                                    className="px-2 py-1 rounded hover:bg-gray-700 disabled:opacity-50"
                                >
                                    Previous
                                </button>
                                <span>Page {pastPage} of {totalPages}</span>
                                <button
                                    disabled={pastPage === totalPages}
                                    onClick={() => setPastPage(p => p + 1)}
                                    className="px-2 py-1 rounded hover:bg-gray-700 disabled:opacity-50"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </div>
                    {/* How to Play Section */}
                    <section className="mt-12 p-6 bg-gray-900 rounded-2xl shadow-lg" style={{width: '100vh'}}>
                        <h2 className="text-2xl font-bold mb-6 text-center text-white">How to Play</h2>
                        <ol className="space-y-4 text-gray-200 list-decimal list-inside mx-auto">
                            <li>
                                <span className="font-semibold">Buy $Fuel on Avalanche</span> – 
                                Token address: 0x29fbb1569364ac8cc48851bd5e144faa2a78f528.
                                You need to hold at least 10.000.000 $Fuel tokens in order to compete.
                            </li>
                            <li>
                                <span className="font-semibold">Connect your wallet</span> – 
                                Use MetaMask to connect your wallet to the game.
                            </li>
                            <li>
                                <span className="font-semibold">Get Fuel</span> – 
                                Buy Fuel with our token or claim your free daily fuel.
                            </li>
                            <li>
                                <span className="font-semibold">Join a race</span> – 
                                Wait for the countdown, then enter the track when the race opens.
                            </li>
                            <li>
                                <span className="font-semibold">Choose your car</span> – 
                                Go to the Garage and pick your car before racing.
                            </li>
                            <li>
                                <span className="font-semibold">Compete & Win</span> – 
                                Race against others, climb the leaderboard, and earn rewards.
                            </li>
                        </ol>
                    </section>
                </main>
            )}



            {!racing && !showMaps && showGarage && (
                <Garage
                    cars={cars}
                    onSelect={(car) => {
                        setSelectedCar(car);
                        setShowGarage(false);
                        setShowMaps(true);
                    }}
                />
            )}

            {!racing && !showGarage && !showMaps && showAdmin && (
                <AdminPage token={tokenPayload} />
            )}

            {!racing && !showGarage && showMaps && (
                <MapSelect
                    maps={maps}
                    onSelect={(mapIndex) => {
                        setCurrentTheme(themeNames[mapIndex]);
                        startRun(summary.active);
                    }}
                />
            )}

            {transitionState !== "idle" && (
                <GateOverlay
                    state={transitionState}
                    onFinish={(phase) => {
                        if (phase === "closed") {
                            setTimeout(() => {
                                setShowGarage(true);
                                // switch UI behind the gate to garage
                                setTransitionState("gateOpening"); 
                            }, 500);
                        }
                        if (phase === "opened") setTransitionState("idle");
                    }}
                />
            )}

            {/* Footer */}
            <footer className="w-full text-center py-4 border-t border-gray-800 text-gray-500 text-sm">
                © 2025 Fuel Racer
            </footer>
        </div>
    );
}
