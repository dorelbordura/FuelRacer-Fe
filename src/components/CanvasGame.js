import React, { useEffect, useRef, useState } from "react";

// preload obstacle car images
const obstacleImages = [];
const carSources = [
  "/cars/car1.webp",
  "/cars/car2.webp",
  "/cars/car3.webp",
  "/cars/car4.webp",
  "/cars/car5.webp",
  "/cars/car6.webp",
  "/cars/car7.webp",
  "/cars/car8.webp",
  "/cars/car9.webp"
]; // put your car sprite filenames here (must be in public folder or same dir)

carSources.forEach(src => {
  const img = new Image();
  img.src = src;
  obstacleImages.push(img);
});

const playerImg = new Image();
playerImg.src = "/cars/car1.webp";

export default function RacingGame({ onFinish, finalTime }) {
  const ref = useRef(null);
  const [finished, setFinished] = useState(false);
  const [started, setStarted] = useState(true);

  useEffect(() => {
    let raf;
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    let W = canvas.width;
    let H = canvas.height;

    // Race settings
    const trackLength = 25000; // units
    let distance = 0;
    let speed = 0;
    let maxSpeed = 10;
    let acceleration = 0.3;
    let deceleration = 0.2;
    const baseSpeed = 5;

    let carWidth = 100;
    let carHeight = 150;
    let carX = W / 2 - carWidth / 2;
    let carY = H - carHeight - 175;

    let keys = {};
    let obstacles = [];
    let laneOffset = 0;
    let startTime;

    function spawnObstacle() {
      const w = 100;
      const h = 150;
      const buffer = 20; // keep spacing from v1.10
      const laneWidth = 150; // must match lane drawing
      let y = -h;
      let tries = 0;
      let valid = false;
      let x, chosenImg;

      while (!valid && tries < 30) {
        // pick a random lane index (0..N-1)
        const laneIndex = Math.floor(Math.random() * (W / laneWidth));
        // center obstacle in lane
        x = laneIndex * laneWidth + (laneWidth - w) / 2;

        valid = true;
        for (let o of obstacles) {
          if (o.y < 200) {
            const overlapX = x < o.x + o.w + buffer && x + w + buffer > o.x;
            const overlapY = y < o.y + o.h + buffer && y + h + buffer > o.y;
            if (overlapX && overlapY) {
              valid = false;
              break;
            }
          }
        }

        tries++;
      }

      if (valid) {
        chosenImg = obstacleImages[Math.floor(Math.random() * obstacleImages.length)];
        obstacles.push({ x, y, w, h, img: chosenImg });
      }
    }




    function drawCar(x, y) {
      if (playerImg.complete) {
        ctx.drawImage(playerImg, x, y, carWidth, carHeight);
      } else {
        ctx.fillStyle = "#00ff44";
        ctx.fillRect(x, y, carWidth, carHeight);
      }
    }

    function loop(ts) {
      ctx.clearRect(0, 0, W, H);

      // road background
      ctx.fillStyle = "#333";
      ctx.fillRect(0, 0, W, H);

      // lane markings
      laneOffset += speed * 0.5;
      if (laneOffset > 60) laneOffset = 0;

      const laneWidth = 150; // adjust for number of lanes
      ctx.strokeStyle = "white";
      ctx.lineWidth = 4;

      for (let x = laneWidth; x < W; x += laneWidth) {
        for (let y = -60; y < H; y += 60) {
          ctx.beginPath();
          ctx.moveTo(x, y + laneOffset);
          ctx.lineTo(x, y + 30 + laneOffset); // dashed segments
          ctx.stroke();
        }
      }

      // handle controls
      if (started) {
        const accelerating = !!keys["ArrowUp"];
        const braking = !!keys["ArrowDown"];

        // accelerate
        if (accelerating) {
          speed = Math.min(maxSpeed, speed + acceleration);
        }

        // brake (can go all the way to 0)
        if (braking) {
          speed = Math.max(2, speed - acceleration * 2);
        }

        // idle roll / friction: maintain at least baseSpeed ONLY when not braking
        if (!accelerating && !braking) {
          speed = Math.max(baseSpeed, speed - deceleration);
        }

        if (keys["ArrowLeft"]) carX -= 5;
        if (keys["ArrowRight"]) carX += 5;
        carX = Math.max(20, Math.min(W - carWidth - 20, carX));
  
        // update distance
        distance += speed;
      }

      // draw player car
      drawCar(carX, carY);

      // obstacles
      if (Math.random() < 0.05) spawnObstacle();
      ctx.fillStyle = "#ff4040";
      obstacles.forEach((o) => {
        o.y += speed * 0.8;
        if (o.img && o.img.complete) {
          ctx.drawImage(o.img, o.x, o.y, o.w, o.h);
        } else {
          ctx.fillRect(o.x, o.y, o.w, o.h); // fallback if image not loaded
        }

        // collision → slow down
        if (
          carX < o.x + o.w &&
          carX + carWidth > o.x &&
          carY < o.y + o.h &&
          carY + carHeight > o.y
        ) {
          speed = Math.max(speed * 0.5, 2); // penalty
        }
      });
      obstacles = obstacles.filter((o) => o.y < H);

      // HUD
      ctx.save(); // save canvas state
      ctx.resetTransform?.(); // reset transforms if supported
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillStyle = "white";
      ctx.font = "20px sans-serif";
      
      if (!started) {
        ctx.fillStyle = "yellow";
        ctx.font = "32px sans-serif";
        ctx.fillText("⬆️ Press UP arrow to start the race!", W / 2 - 220, H / 2);
      } else {
        if (!startTime) startTime = ts;
        const elapsed = (ts - startTime) / 1000;
        
        ctx.fillText(`🏁 ${(trackLength - distance).toFixed(0)} m left`, 20, 40);
        ctx.fillText(`⏱ ${elapsed.toFixed(2)}s`, 20, 70);
        ctx.fillText(`🚗 Speed: ${speed.toFixed(1)}`, 20, 100);

        // draw finish line
        if (trackLength - distance < H) {
          const lineY = H - (trackLength - distance); // vertical position
          const bannerHeight = 40;
          const squareSize = 20;

          // checkerboard pattern across full width
          for (let y = 0; y < bannerHeight; y += squareSize) {
            for (let x = 0; x < W; x += squareSize) {
              const isDark = ((x / squareSize) + (y / squareSize)) % 2 === 0;
              ctx.fillStyle = isDark ? "#000" : "#fff";
              ctx.fillRect(x, lineY + y, squareSize, squareSize);
            }
          }

          // banner outline
          ctx.strokeStyle = "#FFD700"; // gold border
          ctx.lineWidth = 4;
          ctx.strokeRect(0, lineY, W, bannerHeight);

          // text above the line
          ctx.fillStyle = "#FFD700";
          ctx.font = "bold 40px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("🏁 FINISH 🏁", W / 2, lineY - 20);
        }

        // Finish condition
        if (distance >= trackLength) {
          cancelAnimationFrame(raf);
          setFinished(true);
          onFinish(elapsed);
          return;
        }
      }


      raf = requestAnimationFrame(loop);
    }

    function onKey(e) {
      keys[e.key] = true;
      if (e.key === "ArrowUp" && !started) {
        setStarted(true);
        startTime = performance.now();
        speed = 5;
      }
    }
    function offKey(e) {
      keys[e.key] = false;
    }

    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", offKey);
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", offKey);
    };
  }, [started]);

  return (
    <div>
      <canvas
        ref={ref}
        style={{
          display: "block",
          width: "100vw",
          height: "100vh",
          background: "#111",
        }}
      />
      {finished && finalTime && (
        <div
          style={{
            position: "absolute",
            top: "40%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "#222",
            padding: "20px",
            borderRadius: "12px",
            color: "white",
            fontSize: "24px",
          }}
        >
          🏆 Finished in {finalTime}s
        </div>
      )}
    </div>
  );
}
