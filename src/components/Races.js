import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import config from '../config.json';
import useAuthHeader from "../utils/useAuthHeader";
import { useGame } from "../store";

/**
 * FuelRacer UI — Races & Leaderboards
 * -----------------------------------
 * Single-file React component you can drop into your app.
 *
 * Features
 *  - Active race + countdown
 *  - Next (upcoming) races + countdowns
 *  - Past races list (click → leaderboard)
 *  - Per-race Top 10 auto-refreshing (5s)
 *  - Start/Finish run buttons (optional hooks)
 *
 * Assumes your backend from the canvas is running and exposes:
 *  GET    /races/summary
 *  GET    /races/past?limit=20
 *  GET    /races/:id/leaderboard?top=10
 *  POST   /runs/start { raceId } (auth handled externally; include Bearer)
 *  POST   /runs/finish { raceId, runId } (auth handled externally)
 */

const {BACKEND_URL} = config;

// --------------------- Utilities ---------------------
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

function msToTime(ms) {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const cs = Math.floor((ms % 1000) / 10); // centiseconds
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

function useCountdown(targetDate) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);
  const diff = useMemo(() => (targetDate ? targetDate.getTime() - now : 0), [targetDate, now]);
  const clamped = Math.max(diff, 0);
  const d = Math.floor(clamped / 86400000);
  const h = Math.floor((clamped % 86400000) / 3600000);
  const m = Math.floor((clamped % 3600000) / 60000);
  const s = Math.floor((clamped % 60000) / 1000);
  return {
    diff,
    label: `${d > 0 ? d + "d " : ""}${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  };
}

async function api(path, opts = {}) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), 10000);
  const headers = useAuthHeader();
  try {
    const res = await fetch(`${BACKEND_URL}${path}`, { ...opts, signal: ctrl.signal, headers: { "Content-Type": "application/json", ...(headers || {}) } });
    if (!res.ok) throw new Error(await res.text());
    return await res.json();
  } finally {
    clearTimeout(id);
  }
}

// --------------------- UI Components ---------------------
function Card({ children, className = "" }) {
  return (
    <div className={`rounded-2xl shadow-md p-5 bg-white/80 dark:bg-zinc-900/70 backdrop-blur border border-zinc-200 dark:border-zinc-800 ${className}`}>
      {children}
    </div>
  );
}

function SectionTitle({ children }) {
  return <h2 className="text-xl font-semibold mb-3">{children}</h2>;
}

function Dot({ state }) {
  const color = state === "active" ? "bg-green-500" : state === "upcoming" ? "bg-yellow-500" : "bg-zinc-400";
  return <span className={`inline-block w-2 h-2 rounded-full ${color} mr-2 align-middle`} />;
}

function LeaderboardModal({ race, open, onClose }) {
  const [rows, setRows] = useState([]);

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
  const start = toDate(race.startAt);
  const end = toDate(race.endAt);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Leaderboard — {formatTime(start)} UTC</h3>
            <button className="px-3 py-1 rounded-xl border text-sm" onClick={onClose}>Close</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-zinc-200 dark:border-zinc-800">
                  <th className="py-2 pr-2">#</th>
                  <th className="py-2 pr-2">Player</th>
                  <th className="py-2 pr-2">Best Time</th>
                  <th className="py-2 pr-2">Attempts</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-zinc-500">No results yet.</td>
                  </tr>
                )}
                {rows.map((r, i) => (
                  <tr key={r.id || i} className="border-b border-zinc-100 dark:border-zinc-800/50">
                    <td className="py-2 pr-2 font-medium">{r.rank || i + 1}</td>
                    <td className="py-2 pr-2 font-mono text-xs break-all">{r.id || r.playerId || r.playerAddress}</td>
                    <td className="py-2 pr-2">{msToTime(r.bestTime)}</td>
                    <td className="py-2 pr-2">{r.attempts ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

function RaceCard({ race, highlight = false, onOpenLeaderboard, onStartRun }) {
  const start = toDate(race.startAt);
  const end = toDate(race.endAt);
  const { label: untilStart } = useCountdown(start);
  const { label: untilEnd } = useCountdown(end);

  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className={highlight ? "ring-2 ring-indigo-500" : ""}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="text-lg font-semibold">
              <Dot state={race.state} />
              {race.state === "active" ? "Active Race" : race.state === "upcoming" ? "Upcoming Race" : "Finished Race"}
            </div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400">
              {formatTime(start)} – {formatTime(end)} UTC
            </div>
          </div>
          <div className="flex items-center gap-3">
            {race.state === "upcoming" && (
              <div className="text-sm">Starts in: <span className="font-mono">{untilStart}</span></div>
            )}
            {race.state === "active" && (
              <div className="text-sm">Ends in: <span className="font-mono">{untilEnd}</span></div>
            )}
            <button className="px-3 py-1 rounded-xl border text-sm" onClick={() => onOpenLeaderboard(race)}>Leaderboard</button>
            {race.state === "active" && (
              <>
                <button className="px-3 py-1 rounded-xl border text-sm" onClick={async () => await onStartRun?.(race)}>Start Run</button>
              </>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

function PastList({ onOpenLeaderboard }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let t;
    async function load() {
      try {
        const data = await api(`/races/past?limit=20`);
        setItems(data.items || data.races || []);
      } catch (e) {
        // ignore
      } finally { setLoading(false); }
    }
    load();
    t = setInterval(load, 15000); // refresh every 15s
    return () => clearInterval(t);
  }, []);

  return (
    <Card>
      <SectionTitle>Past Races</SectionTitle>
      {loading && <div className="text-sm text-zinc-500">Loading…</div>}
      <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {items.map((r) => {
          const start = toDate(r.startAt);
          const end = toDate(r.endAt);
          return (
            <li key={r.id} className="py-3 flex items-center justify-between">
              <div>
                <div className="font-medium">{formatTime(start)} – {formatTime(end)} UTC</div>
                <div className="text-xs text-zinc-500">{r.state}</div>
              </div>
              <button className="px-3 py-1 rounded-xl border text-sm" onClick={() => onOpenLeaderboard(r)}>Leaderboard</button>
            </li>
          );
        })}
        {items.length === 0 && !loading && (
          <li className="py-6 text-center text-zinc-500">No past races yet.</li>
        )}
      </ul>
    </Card>
  );
}

// --------------------- Main Component ---------------------
export default function Races({currentRunRef}) {
  const [summary, setSummary] = useState({ active: null, upcoming: [] });
  const [openLB, setOpenLB] = useState(false);
  const [raceForLB, setRaceForLB] = useState(null);
  const {setFuel, setStatus, setRacing} = useGame();

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
      } catch (e) {
        // ignore
      }
    }
    load();
    t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  function openLeaderboard(race) {
    setRaceForLB(race);
    setOpenLB(true);
  }

  async function startRun(race) {
    try {
      setStatus('Starting race...')
      const data = await api(`/runs/start`, { method: "POST", body: JSON.stringify({ raceId: race.id }) });
      currentRunRef.current = { raceId: race.id, runId: data.runId };

      if (!data.ok) return setStatus(data.message || 'Not enough fuel')

      setFuel(data.fuel)
      setRacing(true)


    } catch (e) {
      setStatus(e.message || 'Not enough fuel')
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">🏁 FuelRacer — Daily Races</h1>
        <div className="text-sm text-zinc-600 dark:text-zinc-400">Times shown in your local timezone; races scheduled in UTC.</div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {summary.active && (
          <RaceCard
            key={summary.active.id}
            race={summary.active}
            highlight
            onOpenLeaderboard={openLeaderboard}
            onStartRun={startRun}
          />
        )}

        {summary.upcoming?.length > 0 && (
          <Card>
            <SectionTitle>Upcoming</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {summary.upcoming.map((r) => (
                <RaceCard key={r.id} race={r} onOpenLeaderboard={openLeaderboard} />
              ))}
            </div>
          </Card>
        )}

        <PastList onOpenLeaderboard={openLeaderboard} />
      </div>

      <LeaderboardModal race={raceForLB} open={openLB} onClose={() => setOpenLB(false)} />
    </div>
  );
}
