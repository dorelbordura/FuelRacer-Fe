import React, { useRef, useState, useEffect } from "react";
import "./components/styles.css";
import registerToken from "./utils/registerToken";
import LandingPage from "./components/LandingPage";
import './output.css';

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
          '/logo.png'
        ];
        await Promise.all(images.map(preloadImage));

        // 2. Fetch initial Firestore data
        const racesSnap = await getDocs(collection(db, "races"));
        const racesData = racesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setRaces(racesData);

        // Example: preload user garage (optional)
        // const garageSnap = await getDocs(collection(db, "garage"));
        // setGarage(garageSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

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
      <div className="flex items-center justify-center h-screen w-screen bg-black text-white">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-green-500"></div>
          <p className="mt-4 text-lg font-bold">Loading Fuel Racer...</p>
        </div>
      </div>
    );
  }


  return (
    <LandingPage
      {...{currentRunRef, registerToken, finalTime, setFinalTime}}
    />
  )
}

export default App;
