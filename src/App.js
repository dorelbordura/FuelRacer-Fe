import React, { useRef, useState, useEffect } from "react";
import "./components/styles.css";
import registerToken from "./utils/registerToken";
import LandingPage from "./components/LandingPage";
import './output.css';
import LoadingSpinner from "./components/LoadingSpinner";

const sounds = {
  crash: new Audio("/sounds/car_crash.mp3"),
  spike: new Audio("/sounds/fart.mp3"),
  soundtrack: new Audio("/sounds/backgroundMusic.mp3"),
  gates: new Audio("/sounds/gates.mp3"),
};

sounds.soundtrack.loop = true;
sounds.soundtrack.volume = 0.2;

function isMobile() {
  return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|Mobile/i.test(
    navigator.userAgent
  );
}

function App() {
  const currentRunRef = useRef(null);
  const [finalTime, setFinalTime] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    if (isMobile()) {
      setMobile(true);
      setIsLoading(false);
    }

    const preloadImage = (src) =>
      new Promise((resolve, reject) => {
        const img = new Image();
        img.src = src;
        img.onload = resolve;
        img.onerror = reject;
      });

    const loadResources = async () => {
      try {
        // 1. Preload images
        const images = [
          "/cars/car1.webp",
          "/cars/car2.webp",
          "/cars/car3.webp",
          "/cars/car4.webp",
          "/cars/car5.webp",
          "/cars/car6.webp",
          "/cars/car7.webp",
          "/cars/car8.webp",
          "/cars/car9.webp",
          "/cars/fuelTruck_preview.png",
          "/cars/fuelTruck.png",
          "/cars/miniCart_preview.png",
          "/cars/miniCart.png",
          "/cars/preview_car2.webp",
          "/garage.jpg",
          '/gate_left.png',
          '/gate_right.png',
          '/logo.png',
          '/cars/van.png',
          '/cars/van_preview.png',
          '/cars/bus.png',
          '/cars/bus_preview.png'
        ];
        await Promise.all(images.map(preloadImage));

        const promises = Object.values(sounds).map(
          (sound) =>
            new Promise((resolve) => {
              sound.addEventListener("canplaythrough", resolve, { once: true });
              sound.load(); // force preload
            })
        );

        await Promise.all(promises);


        // ✅ Everything ready
        setIsLoading(false);
      } catch (err) {
        console.error("Preload error:", err);
        setIsLoading(false); // fail gracefully
      }
    };

    loadResources();
  }, []);

  if (isLoading) {
    return (
      <LoadingSpinner />
    );
  }

  return (
    <>
      {mobile && (
        <div style={modalStyle}>
          <div style={modalContentStyle}>
            <h2>🚫 Mobile Not Supported</h2>
            <p>
              This application is only available on desktop. Please open it on
              a desktop browser to play.
            </p>
          </div>
        </div>
      )}
      {
        !mobile && (
          <LandingPage
            {...{currentRunRef, registerToken, finalTime, setFinalTime}}
          />
        )
      }
    </>
  )
}

// Full-screen modal style
const modalStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  backgroundColor: "rgba(0,0,0,0.85)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 9999,
};

// Modal content style
const modalContentStyle = {
  backgroundColor: "#222",
  color: "white",
  padding: "30px 40px",
  borderRadius: "12px",
  textAlign: "center",
  maxWidth: "400px",
};

export default App;
