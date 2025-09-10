import React, { useEffect, useRef, useState } from "react";
import Confetti from "react-confetti";

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
]; 

const playerCars = [
  "/cars/fuelTruck.png",
  "/cars/miniCart.png",
  "/cars/car2.webp",
  "/cars/van.png",
  "/cars/bus.png"
];

const spikeImg = new Image();
spikeImg.src = "/spikes.png";

const crashImg = new Image();
crashImg.src = "/crash.png";

const crashSound = new Audio("/sounds/car_crash.mp3");
const fartSound = new Audio("/sounds/fart.mp3");

carSources.forEach(src => {
  const img = new Image();
  img.src = src;
  obstacleImages.push(img);
});

// 🎨 Map themes
const mapThemes = {
  sunny: {
    background: "#4ec0ff", // sky blue
    road: "#333",
    laneColor: "white",
    effect: null
  },
  snowy: {
    background: "#e6f7ff",
    road: "#aaa",
    laneColor: "#fff",
    effect: "snow"
  },
  rainy: {
    background: "#1a1a1a",
    road: "#222",
    laneColor: "#bbb",
    effect: "rain"
  },
  desert: {
    background: "#f4e2b3",
    road: "#704214",
    laneColor: "#fff8dc",
    effect: "dust"
  }
};

export default function RacingGame({ onFinish, finalTime, selectedCar, mapTheme, onLeaderboardClick }) {
  const ref = useRef(null);
  const [finished, setFinished] = useState(false);
  const [started, setStarted] = useState(true);

  const playerImg = new Image();
  playerImg.src = playerCars[selectedCar];

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

    const theme = mapThemes[mapTheme] || mapThemes.sunny;

    // Race settings
    const trackLength = 25000; // units
    let distance = 0;
    let speed = 0;
    const defaultMaxSpeed = 10; // keep this fixed value
    let maxSpeed = defaultMaxSpeed;
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
    let crashes = [];
    let spikePenalty = 0;

    // 🔥 Nitro state
    let nitroActive = false;
    let nitroUsed = false;
    let nitroEndTime = 0;
    let nitroTrail = [];
    let particles = [];

    function spawnObstacle() {
      const w = 100;
      const h = 150;
      const buffer = 20; // keep spacing from v1.10
      const laneWidth = 150; // must match lane drawing

      const numLanes = Math.floor(W / laneWidth);
      const roadWidth = numLanes * laneWidth;
      const margin = (W - roadWidth) / 2;

      let y = -h;
      let tries = 0;
      let valid = false;
      let x, chosenImg, type;

      while (!valid && tries < 30) {
        const laneIndex = Math.floor(Math.random() * numLanes);
        x = margin + laneIndex * laneWidth + (laneWidth - w) / 2;

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
        if (Math.random() < 0.7) {
          chosenImg = obstacleImages[Math.floor(Math.random() * obstacleImages.length)];
          type = "car";
        } else {
          chosenImg = spikeImg;
          type = "spike";
        }
        obstacles.push({ x, y, w, h, img: chosenImg, type, hit: false });
      }
    }

    function spawnParticles(type, W) {
      const count = type === "snow" ? 2 : type === "rain" ? 5 : 1;

      const maxParticles =
        type === "snow" ? 120 : type === "rain" ? 180 : 80;
      if (particles.length >= maxParticles) return;

      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * W,
          y: -10,
          size: type === "snow" ? 2 + Math.random() * 3 : 2,
          speedY:
            type === "snow"
              ? 2 + Math.random() * 2
              : type === "rain"
              ? 8 + Math.random() * 5
              : 2 + Math.random() * 2,
          type
        });
      }
    }

    function updateParticles(H, W) {
      particles.forEach(p => {
        p.y += p.speedY; // independent of car speed
        if (p.y > H) {
          // respawn at top
          p.y = -10;
          p.x = Math.random() * W;
        }
      });
    }

    function drawParticles(ctx) {
      particles.forEach(p => {
        if (p.type === "snow") {
          ctx.fillStyle = "white";
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.type === "rain") {
          ctx.strokeStyle = "rgba(173,216,230,0.8)";
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x, p.y + 10);
          ctx.stroke();
        } else if (p.type === "dust") {
          ctx.fillStyle = "rgba(210,180,140,0.6)";
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
      });
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
      ctx.fillStyle = theme.background;
      ctx.fillRect(0, 0, W, H);

      // lane markings with centered road + edges
      laneOffset += speed * 0.5;
      if (laneOffset > 60) laneOffset = 0;

      // 🛣 Road drawing (theme-specific)
      let roadGrad;
      const laneWidth = 150;
      const numLanes = Math.floor(W / laneWidth);
      const roadWidth = numLanes * laneWidth;
      const margin = (W - roadWidth) / 2;

      switch(mapTheme) {
        case "sunny":
          roadGrad = ctx.createLinearGradient(0, 0, 0, H);
          roadGrad.addColorStop(0, "#555"); // top (darker asphalt)
          roadGrad.addColorStop(1, "#222"); // bottom (lighter asphalt)
          break;

        case "snowy":
          roadGrad = ctx.createLinearGradient(0, 0, 0, H);
          roadGrad.addColorStop(0, "#888"); // top, slightly icy gray
          roadGrad.addColorStop(1, "#555"); // bottom, asphalt
          break;

        case "rainy":
          roadGrad = ctx.createLinearGradient(0, 0, 0, H);
          roadGrad.addColorStop(0, "#333"); // darker wet asphalt
          roadGrad.addColorStop(1, "#111"); // bottom
          break;

        case "desert":
          roadGrad = ctx.createLinearGradient(0, 0, 0, H);
          roadGrad.addColorStop(0, "#8B5A2B"); // top brown asphalt
          roadGrad.addColorStop(1, "#704214"); // bottom darker asphalt
          break;

        default:
          roadGrad = ctx.createLinearGradient(0, 0, 0, H);
          roadGrad.addColorStop(0, "#555");
          roadGrad.addColorStop(1, "#222");
      }

      ctx.fillStyle = roadGrad;
      ctx.fillRect(margin, 0, roadWidth, H);

      if (mapTheme === "sunny") {
        // left edge
        const leftEdge = ctx.createLinearGradient(0, 0, margin, 0);
        leftEdge.addColorStop(0, "#666"); // outer dirt
        leftEdge.addColorStop(1, "#444"); // near road
        ctx.fillStyle = leftEdge;
        ctx.fillRect(0, 0, margin, H);

        // right edge
        const rightEdge = ctx.createLinearGradient(W - margin, 0, W, 0);
        rightEdge.addColorStop(0, "#444"); // near road
        rightEdge.addColorStop(1, "#666"); // outer dirt
        ctx.fillStyle = rightEdge;
        ctx.fillRect(W - margin, 0, margin, H);
      }


      if (mapTheme === "snowy") {
        const leftEdge = ctx.createLinearGradient(0, 0, margin, 0);
        leftEdge.addColorStop(0, "#fff"); // snow
        leftEdge.addColorStop(1, "#eee"); // near road
        ctx.fillStyle = leftEdge;
        ctx.fillRect(0, 0, margin, H);

        const rightEdge = ctx.createLinearGradient(W - margin, 0, W, 0);
        rightEdge.addColorStop(0, "#eee");
        rightEdge.addColorStop(1, "#fff");
        ctx.fillStyle = rightEdge;
        ctx.fillRect(W - margin, 0, margin, H);
      }


      if (mapTheme === "rainy") {
        const leftEdge = ctx.createLinearGradient(0, 0, margin, 0);
        leftEdge.addColorStop(0, "#111"); // wet dirt
        leftEdge.addColorStop(1, "#222"); // wet asphalt
        ctx.fillStyle = leftEdge;
        ctx.fillRect(0, 0, margin, H);

        const rightEdge = ctx.createLinearGradient(W - margin, 0, W, 0);
        rightEdge.addColorStop(0, "#222");
        rightEdge.addColorStop(1, "#111");
        ctx.fillStyle = rightEdge;
        ctx.fillRect(W - margin, 0, margin, H);
      }


      if (mapTheme === "desert") {
        const leftEdge = ctx.createLinearGradient(0, 0, margin, 0);
        leftEdge.addColorStop(0, "#f4e2b3"); // sand
        leftEdge.addColorStop(1, "#704214"); // road
        ctx.fillStyle = leftEdge;
        ctx.fillRect(0, 0, margin, H);

        const rightEdge = ctx.createLinearGradient(W - margin, 0, W, 0);
        rightEdge.addColorStop(0, "#704214"); // road
        rightEdge.addColorStop(1, "#f4e2b3"); // sand
        ctx.fillStyle = rightEdge;
        ctx.fillRect(W - margin, 0, margin, H);
      }

      // draw internal dividers
      ctx.strokeStyle = theme.laneColor;
      ctx.lineWidth = 4;

      for (let i = 1; i < numLanes; i++) {
        const x = margin + i * laneWidth;
        for (let y = -60; y < H; y += 60) {
          ctx.beginPath();
          ctx.moveTo(x, y + laneOffset);
          ctx.lineTo(x, y + 40 + laneOffset);
          ctx.stroke();
        }
      }

      // spawn particles occasionally
      if (mapTheme === "snowy") {
        if (Math.random() < 0.15) spawnParticles("snow", W);
        updateParticles(H, W);
        drawParticles(ctx);
      } else if (mapTheme === "rainy") {
        if (Math.random() < 0.3) spawnParticles("rain", W);
        updateParticles(H, W);
        drawParticles(ctx);
      } else if (mapTheme === "desert") {
        if (Math.random() < 0.1) spawnParticles("dust", W);
        updateParticles(H, W);
        drawParticles(ctx);
      }

      // handle controls
      if (started) {
        const accelerating = !!keys["ArrowUp"];
        const braking = !!keys["ArrowDown"];

        if (nitroActive) {
          speed = 20;
          maxSpeed = 20;
        } else {
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
        }


        if (keys["ArrowLeft"]) carX -= 5;
        if (keys["ArrowRight"]) carX += 5;
        carX = Math.max(20, Math.min(W - carWidth - 20, carX));
  
        // update distance
        distance += speed;
      }

      // draw player car
      drawCar(carX, carY);

      // spawn nitro trail if active
      if (nitroActive) {
        for (let i = 0; i < 3; i++) { // spawn 3 particles per frame
          nitroTrail.push({
            x: carX + carWidth / 2 - 10 + Math.random() * 20, // around car center
            y: carY + carHeight - 10,
            life: 20 + Math.random() * 10,
            size: 10 + Math.random() * 10,
            alpha: 1
          });
        }
      }

      // draw nitro trail
      nitroTrail.forEach(p => {
        ctx.fillStyle = `rgba(0, 200, 255, ${p.alpha})`; // blue glow
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.size, p.size / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        p.life--;
        p.alpha -= 0.05;
        p.size *= 0.95; // shrink
      });
      nitroTrail = nitroTrail.filter(p => p.life > 0);

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

        if (!nitroActive) {
          if (
            carX < o.x + o.w &&
            carX + carWidth > o.x &&
            carY < o.y + o.h &&
            carY + carHeight > o.y
          ) {
  
            if (!o.hit) {   // only trigger once
              o.hit = true;
              if (o.type === "car") {
                speed = Math.max(speed * 0.3, 2); // slow down
    
                // play sound
                crashSound.currentTime = 0;
                crashSound.play();
    
                // add crash animation
                crashes.push({
                  x: carX + carWidth / 2,
                  y: carY,
                  life: 30 // frames
                });
              } else if (o.type === "spike") {
                speed = Math.max(speed * 0.2, 1); // heavy penalty
                maxSpeed = 5;              // penalty for 2s
                spikePenalty = 2000;
  
                fartSound.currentTime = 0;
                fartSound.play();
  
                // restore after 2 seconds
                setTimeout(() => {
                  maxSpeed = defaultMaxSpeed;
                  spikePenalty = 0;
                }, 2000);
              }
            }
          }
        }
      });
      obstacles = obstacles.filter((o) => o.y < H);

      // Nitro timer check
      if (nitroActive && ts > nitroEndTime) {
        nitroActive = false;
        maxSpeed = defaultMaxSpeed;
      }

      // HUD
      ctx.save(); // save canvas state
      ctx.resetTransform?.(); // reset transforms if supported
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillStyle = "white";
      ctx.font = "20px sans-serif";

      // draw crashes
      crashes.forEach((c) => {
        if (crashImg.complete) {
          ctx.drawImage(crashImg, c.x - 50, c.y - 50, 100, 100);
        } else {
          // fallback: draw red/orange circle
          ctx.fillStyle = "orange";
          ctx.beginPath();
          ctx.arc(c.x, c.y, 40, 0, Math.PI * 2);
          ctx.fill();
        }
        c.life--;
      });
      crashes = crashes.filter(c => c.life > 0);
      
      if (!started) {
        ctx.fillStyle = "yellow";
        ctx.font = "32px sans-serif";
        ctx.fillText("⬆️ Press UP arrow to start the race!", W / 2 - 220, H / 2);
      } else {
        if (!startTime) startTime = ts;
        const elapsed = (ts - startTime) / 1000;
        const lineY = H - (trackLength - distance); // vertical position
        const bannerHeight = 40;
        const squareSize = 20;
        const bandBottom = lineY + bannerHeight;
        const carNoseY = carY; // top edge of the car


        if (bandBottom < carNoseY) {
          ctx.fillText(`🏁 ${(trackLength - distance).toFixed(0)} m left`, 20, 40);
          ctx.fillText(`⏱ ${elapsed.toFixed(2)}s`, 20, 70);
          ctx.fillText(`🚗 Speed: ${speed.toFixed(1)}`, 20, 100);
        }

        if (spikePenalty > 0) {
          ctx.fillStyle = "red";
          ctx.font = "bold 28px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("⚠️ Spike hit! Speed reduced!", W / 2, 100);
        }

        if (nitroActive) {
          ctx.fillStyle = "cyan";
          ctx.font = "bold 28px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("🔥 NITRO BOOST ACTIVE!", W / 2, 60);
        } else if (!nitroUsed) {
          ctx.fillStyle = "cyan";
          ctx.fillText("Press SPACE for Nitro Boost!", 20, 130);
        }

        // draw finish line
        if (trackLength - distance < H) {
          const finishZ = trackLength; 
          const finishY = H - (finishZ - distance); // moves consistently with distance
          const finishH = 40;
          const bandBottom = finishY + finishH;

          // checkerboard pattern
          for (let y = 0; y < finishH; y += squareSize) {
            for (let x = 0; x < W; x += squareSize) {
              const isDark = ((x / squareSize) + (y / squareSize)) % 2 === 0;
              ctx.fillStyle = isDark ? "#000" : "#fff";
              ctx.globalAlpha = 0.9; // subtle transparency for nicer look
              ctx.fillRect(x, finishY + y, squareSize, squareSize);
            }
          }
          ctx.globalAlpha = 1.0;

          // gold border
          ctx.strokeStyle = "#FFD700";
          ctx.lineWidth = 4;
          ctx.strokeRect(0, finishY, W, finishH);

          // shadowed finish text
          ctx.font = "bold 40px sans-serif";
          ctx.textAlign = "center";
          ctx.lineJoin = "round";
          ctx.lineWidth = 6;
          ctx.strokeStyle = "#000"; // outline for contrast
          ctx.strokeText("🏁 FINISH 🏁", W / 2, finishY - 20);
          ctx.fillStyle = "#FFD700";
          ctx.fillText("🏁 FINISH 🏁", W / 2, finishY - 20);

          if (bandBottom >= carNoseY) {
            cancelAnimationFrame(raf);
            setFinished(true);
            onFinish(elapsed);
            return;
          }
        }
      }


      raf = requestAnimationFrame(loop);
    }

    function onKey(e) {
      keys[e.key] = true;

      // Prevent page scroll for Space
      if (e.key === " ") {
        e.preventDefault();  // ✅ this stops the scroll
      }

      if (e.key === "ArrowUp" && !started) {
        setStarted(true);
        startTime = performance.now();
        speed = 5;
      }

      if (e.key === " " && !nitroUsed && started) {
        nitroActive = true;
        nitroUsed = true;
        nitroEndTime = performance.now() + 3000;
        speed = 20;
        maxSpeed = 20;
        // nitroSound.currentTime = 0;
        // nitroSound.play();
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
        <>
          <Confetti numberOfPieces={300} recycle={false} />

          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              background: "rgba(0,0,0,0.85)", // dark overlay
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
            }}
          >
            <div
              style={{
                background: "linear-gradient(135deg, #220000, #440000)", // deep red gradient
                border: "4px solid #ff0000",
                borderRadius: "20px",
                padding: "50px 70px",
                textAlign: "center",
                color: "white",
                fontFamily: "Impact, sans-serif",
                animation: "popIn 0.6s ease-out",
                boxShadow: "0 0 40px rgba(255,0,0,0.7)",
              }}
            >
              <h1
                style={{
                  fontSize: "48px",
                  marginBottom: "20px",
                  color: "gold",
                  textShadow: "0 0 10px black",
                }}
              >
                🏁 FINISH! 🏁
              </h1>

              <p
                style={{
                  fontSize: "36px",
                  margin: "15px 0",
                  color: "#ff4444",
                  fontWeight: "bold",
                  textShadow: "0 0 10px black, 0 0 20px #ff0000",
                }}
              >
                🏆 Time: {finalTime}s
              </p>

              <div style={{ marginTop: "30px" }}>
                <button
                  style={{
                    margin: "0 15px",
                    padding: "14px 28px",
                    fontSize: "22px",
                    borderRadius: "12px",
                    border: "2px solid #ff3333",
                    cursor: "pointer",
                    background: "linear-gradient(180deg, #550000, #330000)", // subtle dark red
                    color: "white",
                    fontWeight: "bold",
                    textShadow: "0 0 5px black",
                    boxShadow: "0 0 10px rgba(255,0,0,0.4)",
                    transition: "all 0.25s ease-in-out",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = "linear-gradient(180deg, #770000, #440000)";
                    e.currentTarget.style.boxShadow = "0 0 18px rgba(255,0,0,0.7)";
                    e.currentTarget.style.transform = "scale(1.05)";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = "linear-gradient(180deg, #550000, #330000)";
                    e.currentTarget.style.boxShadow = "0 0 10px rgba(255,0,0,0.4)";
                    e.currentTarget.style.transform = "scale(1)";
                  }}
                  onClick={onLeaderboardClick}
                >
                  📊 Leaderboard
                </button>
              </div>
            </div>

            {/* CSS animation */}
            <style>
              {`
                @keyframes popIn {
                  from { transform: scale(0.5); opacity: 0; }
                  to { transform: scale(1); opacity: 1; }
                }
              `}
            </style>
          </div>
        </>
      )}
    </div>
  );
}
