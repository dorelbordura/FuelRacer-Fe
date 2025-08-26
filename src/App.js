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
sounds.soundtrack.volume = 0.4;

function App() {
  const currentRunRef = useRef(null);
  const [finalTime, setFinalTime] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
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

        // 2. Fetch initial Firestore data
        const racesSnap = await getDocs(collection(db, "races"));
        const racesData = racesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setRaces(racesData);


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
    <LandingPage
      {...{currentRunRef, registerToken, finalTime, setFinalTime}}
    />
  )
}

export default App;
