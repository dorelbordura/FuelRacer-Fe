import React, { useEffect, useMemo, useState } from "react";
import config from '../config.json';
import useAuthHeader from "../utils/useAuthHeader";

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

export function useRaceCountdown(startDate, endDate) {
  const startCountdown = useCountdown(startDate);
  const endCountdown = useCountdown(endDate);

  return useMemo(() => {
    const now = Date.now();
    const start = startDate?.getTime() ?? 0;
    const end = endDate?.getTime() ?? 0;

    if (now < start) {
      // Race hasn't started yet
      return {
        active: false,
        timeToStart: startCountdown.label,
        timeToEnd: null
      };
    } else if (now >= start && now < end) {
      // Race is running
      return {
        active: true,
        timeToStart: null,
        timeToEnd: endCountdown.label
      };
    } else {
      // Race already finished
      return {
        active: false,
        timeToStart: null,
        timeToEnd: null
      };
    }
  }, [startDate, endDate, startCountdown, endCountdown]);
}


export function useFuelRacerCountdown(raceData) {
  const activeStart = raceData.active ? toDate(raceData.active.startAt) : null;
  const activeEnd = raceData.active ? toDate(raceData.active.endAt) : null;
  const nextStart = raceData.upcoming?.length > 0 ? toDate(raceData.upcoming[0].startAt) : null;
  const nextEnd = raceData.upcoming?.length > 0 ? toDate(raceData.upcoming[0].endAt) : null;


  // Always call the hooks, even if dates are null
  const activeCountdown = useRaceCountdown(activeStart, activeEnd);
  const nextCountdown = useRaceCountdown(nextStart, nextEnd);

  if (raceData.active) {
    return activeCountdown;
  } else if (raceData.upcoming?.length > 0) {
    return nextCountdown;
  } else {
    return { active: false, timeToStart: null, timeToEnd: null };
  }
}


export async function api(path, opts = {}) {
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

export function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}
