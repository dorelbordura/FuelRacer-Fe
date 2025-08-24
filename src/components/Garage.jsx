import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Garage({ cars = [], onSelect }) {
  const [current, setCurrent] = useState(0);

  const prevCar = () => setCurrent((c) => (c - 1 + cars.length) % cars.length);
  const nextCar = () => setCurrent((c) => (c + 1) % cars.length);

  return (
    <div className="relative flex flex-col items-center justify-center h-screen w-full overflow-hidden text-white"
      style={{
        background: "url('/garage.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        paddingTop: "40px"
      }}
    >
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
              className="max-h-full object-contain drop-shadow-[0_0_25px_rgba(0,255,255,0.6)] animate-float"
            />

            {/* Neon glowing podium */}
            {/* <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-72 h-10 bg-gradient-to-r from-cyan-500 via-blue-600 to-cyan-500 rounded-full shadow-[0_0_40px_15px_rgba(0,255,255,0.5)]" /> */}
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
        className="mt-12 px-10 py-4 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 font-bold text-xl tracking-wide shadow-[0_0_20px_rgba(0,255,255,0.7)] hover:scale-105 transition transform neon-glow"
        style={{zIndex: '9'}}
      >
        Select Car
      </button>
    </div>
  );
}
