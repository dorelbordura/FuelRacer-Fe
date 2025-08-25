// GateOverlay.jsx
import React, { useEffect, useState } from "react";

const gateClose = new Audio("/gates.mp3");

export default function GateOverlay({ state, onFinish }) {
    const [animate, setAnimate] = useState(false);
    // console.log({state});
    useEffect(() => {
        if (state === "gateClosing") {
            requestAnimationFrame(() => setAnimate(true));
            const timer = setTimeout(() => onFinish("closed"), 1500); // closing duration
            gateClose.currentTime = 0;
            gateClose.play();
            return () => clearTimeout(timer);
        }
        if (state === "gateOpening") {
            setAnimate(true);
            const timer = setTimeout(() => onFinish("opened"), 1500);
            return () => clearTimeout(timer);
        }
    }, [state]);

    return (
        <div className="fixed inset-0 flex z-50 pointer-events-none overflow-hidden">
        <div
            className={`absolute top-0 left-0 w-1/2 h-full transition-transform duration-1000 ease-in-out
            ${state === "gateClosing" && animate ? "translate-x-0" : "-translate-x-full"}
            ${state === "gateOpening" ? "-translate-x-full" : ""}
            `}
        >
            <img src="/gate_left.png" className="w-full h-full object-cover" />
        </div>
        <div
            className={`absolute top-0 right-0 w-1/2 h-full transition-transform duration-1000 ease-in-out
                ${state === "gateClosing" && animate ? "translate-x-0" : "translate-x-full"}
                ${state === "gateOpening" ? "translate-x-full" : ""}
            `}
        >
            <img src="/gate_right.png" className="w-full h-full object-cover" />
        </div>
        </div>
    );
}

