import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Lock } from "lucide-react";
import { useGame } from "../store";

export default function Garage({ cars = [], onSelect }) {
  const [current, setCurrent] = useState(0);
  const {level = 1, xp = 0} = useGame();

  const prevCar = () => setCurrent((c) => (c - 1 + cars.length) % cars.length);
  const nextCar = () => setCurrent((c) => (c + 1) % cars.length);

  // XP system
  const xpForCurrent = 100 * Math.pow(2, level - 1);
  const xpProgress = Math.min(100, (xp / xpForCurrent) * 100);

  const car = cars[current];
  const locked = level < (car.requiredLevel || 1);

  return (
    <div className="relative flex flex-col items-center justify-center h-screen w-full overflow-hidden text-white"
      style={{
        background: "url('/garage.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        paddingTop: "40px"
      }}
    >
      {/* 🔹 Level / XP HUD */}
      <div className="absolute top-6 left-6 bg-black/40 backdrop-blur-md p-5 rounded-2xl border border-cyan-400/70 shadow-[0_0_25px_rgba(0,255,255,0.6)] w-72 animate-fadeIn">
        <div className="flex items-center space-x-4">
          {/* Level Badge */}
          <div className="relative w-14 h-14 flex items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-blue-700 shadow-[0_0_20px_rgba(0,255,255,0.7)]">
            <span className="text-xl font-bold text-white">{level}</span>
            <div className="absolute inset-0 rounded-full border-2 border-cyan-400 animate-spin-slow opacity-70" />
          </div>

          {/* XP Info */}
          <div className="flex flex-col flex-1">
            <span className="font-semibold text-cyan-300 text-lg tracking-wide">
              Racer Level
            </span>
            <span className="text-sm text-gray-300">
              {xp}/{xpForCurrent} XP
            </span>

            {/* XP Bar */}
            <div className="mt-2 w-full bg-gray-800/70 rounded-full h-3 overflow-hidden shadow-inner">
              <div
                className="h-3 rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 shadow-[0_0_20px_rgba(0,255,255,0.8)] animate-pulse"
                style={{ width: `${xpProgress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Title */}
      <h1 className="text-4xl font-bold mb-10 tracking-wider neon-glow" style={{zIndex: '9'}}>Select Your Car</h1>

      <div className="relative flex items-center justify-center w-full max-w-4xl">
        {/* Left arrow */}
        <button
          onClick={prevCar}
          className="absolute left-6 p-4 rounded-full bg-black/40 backdrop-blur-md border border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-black transition shadow-lg neon-glow"
        >
          <ChevronLeft size={36} />
        </button>

        {/* Car display */}
        <div className="flex flex-col items-center space-y-8">
          <div className="relative w-150 h-115 flex items-center justify-center">
            {/* Floating car */}
            <img
              src={cars[current].image}
              alt={cars[current].name}
              className={`max-h-full object-contain drop-shadow-[0_0_25px_rgba(0,255,255,0.6)] animate-float ${
                locked ? "opacity-40 grayscale" : ""
              }`}
            />

            {locked && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 rounded-xl">
                <Lock size={48} className="text-cyan-400 mb-2" />
                <span className="text-lg font-semibold text-cyan-300">
                  Requires Level {car.requiredLevel}
                </span>
              </div>
            )}

          </div>
          <div className="text-2xl font-semibold tracking-wide">{cars[current].name}</div>
        </div>

        {/* Right arrow */}
        <button
          onClick={nextCar}
          className="absolute right-6 p-4 rounded-full bg-black/40 backdrop-blur-md border border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-black transition shadow-lg neon-glow"
        >
          <ChevronRight size={36} />
        </button>
      </div>

      {/* Select button */}
      <button
        onClick={() => onSelect(current)}
        disabled={locked}
        className={`mt-12 px-10 py-4 rounded-xl font-bold text-xl tracking-wide shadow-[0_0_20px_rgba(0,255,255,0.7)] transition transform neon-glow ${
          locked
            ? "bg-gray-600 text-gray-300 cursor-not-allowed"
            : "bg-gradient-to-r from-cyan-400 to-blue-500 hover:scale-105"
        }`}
        style={{zIndex: '9'}}
      >
        {locked ? `Locked` : `Select Car`}
      </button>
    </div>
  );
}
