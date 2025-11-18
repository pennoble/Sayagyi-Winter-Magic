// effects.js
import { getUserData, saveUserData, applyAllUI } from "./ui.js";

const EFFECTS = [
  {
    id: "none",
    name: "No Special Effect",
    tag: "Effect",
    description: "Turn off all special effects.",
    preview: "✨",
    price: 0
  },
  {
    id: "snowfall",
    name: "Falling Snow",
    tag: "Effect",
    description: "Magical snowflakes drift across the whole village.",
    preview: "❄️",
    price: 800
  },
  {
    id: "starlight",
    name: "Starlight Skies",
    tag: "Effect",
    description: "Soft twinkling stars shimmer behind the village.",
    preview: "🌟",
    price: 1200
  },
  {
    id: "aurora",
    name: "Aurora Glow",
    tag: "Effect",
    description: "A gentle aurora dances across the top of the screen.",
    preview: "🌈",
    price: 1500
  },
  {
    id: "sparkles",
    name: "Sparkle Trail",
    tag: "Effect",
    description: "Shimmering sparkles drift down like tiny bits of magic.",
    preview: "💫",
    price: 1000
  }
];

function getGrid() {
  return document.getElementById("effectGrid");
}

function ensureEffectState(user) {
  if (!user.ownedEffects || typeof user.ownedEffects !== "object") {
    user.ownedEffects = { none: true };
  } else if (user.ownedEffects.none !== true) {
    user.ownedEffects.none = true;
  }

  if (!user.activeEffect) {
    user.activeEffect = "none";
  }
}

function renderEffectRewards() {
  const grid = getGrid();
  if (!grid) return;

  const user = getUserData();
  ensureEffectState(user);

  grid.innerHTML = "";

  EFFECTS.forEach((effect) => {
    const isOwned = !!user.ownedEffects[effect.id];
    const isActive = user.activeEffect === effect.id;

    const card = document.createElement("div");
    card.className = "reward-card";

    const preview = document.createElement("div");
    preview.className = "theme-preview";
    preview.style.display = "flex";
    preview.style.alignItems = "center";
    preview.style.justifyContent = "center";
    preview.style.fontSize = "1.2rem";
    preview.textContent = effect.preview || "✨";

    const name = document.createElement("div");
    name.className = "reward-name";
    name.textContent = effect.name;

    const tag = document.createElement("span");
    tag.className = "reward-tag";
    tag.textContent = isActive
      ? "Equipped"
      : isOwned
      ? "Owned"
      : effect.price && effect.price > 0
      ? `${effect.price} 🪙`
      : effect.tag || "Effect";

    const desc = document.createElement("div");
    desc.className = "reward-cost";
    if (!isOwned && effect.price && effect.price > 0) {
      desc.textContent = `Costs ${effect.price} Elf Coins. ${effect.description}`;
    } else {
      desc.textContent = effect.description;
    }

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "primary-btn";
    btn.style.marginTop = "6px";

    if (isActive) {
      btn.textContent = "Equipped";
      btn.disabled = true;
    } else if (isOwned) {
      btn.textContent = "Equip";
    } else {
      btn.textContent =
        effect.price && effect.price > 0
          ? `Buy (${effect.price} 🪙)`
          : "Claim + Equip";
    }

    btn.addEventListener("click", async () => {
      const u = getUserData();
      ensureEffectState(u);

      if (!u.ownedEffects[effect.id]) {
        const price = effect.price || 0;

        if (price > 0) {
          if (typeof u.elfCoins !== "number") {
            u.elfCoins = 0;
          }

          if (u.elfCoins < price) {
            alert(`You need ${price} Elf Coins to buy this effect!`);
            return;
          }

          const confirmed = window.confirm(
            `Buy "${effect.name}" for ${price} Elf Coins?`
          );
          if (!confirmed) return;

          u.elfCoins -= price;
        }

        u.ownedEffects[effect.id] = true;
      }

      u.activeEffect = effect.id;

      try {
        await saveUserData();
      } catch (err) {
        console.error("[Effects] Failed to save effect choice:", err);
      }

      applyAllUI();
      renderEffectRewards();
    });

    card.appendChild(preview);
    card.appendChild(name);
    card.appendChild(tag);
    card.appendChild(desc);
    card.appendChild(btn);

    grid.appendChild(card);
  });
}

function setupEffects() {
  const grid = getGrid();
  if (!grid) return;

  renderEffectRewards();

  const navBtn = document.querySelector('.nav-btn[data-panel="rewards"]');
  if (navBtn) {
    navBtn.addEventListener("click", () => {
      renderEffectRewards();
    });
  }
}

// --- Real snow animation (canvas-based) ---

let snowInitialized = false;

function initRealSnow() {
  if (snowInitialized) return;
  snowInitialized = true;

  const layer = document.querySelector(".fx-layer.fx-snowfall");
  if (!layer) return;

  const canvas = document.createElement("canvas");
  canvas.id = "snowCanvas";
  layer.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  window.addEventListener("resize", resize);
  resize();

  const flakes = [];
  const FLAKE_COUNT = 130;

  function createFlake() {
    return {
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: 1 + Math.random() * 3,
      speedY: 0.5 + Math.random() * 1.5,
      speedX: -0.5 + Math.random(), // slight horizontal drift
      opacity: 0.4 + Math.random() * 0.6
    };
  }

  for (let i = 0; i < FLAKE_COUNT; i++) {
    flakes.push(createFlake());
  }

  function update() {
    for (const f of flakes) {
      f.y += f.speedY;
      f.x += f.speedX;

      // wrap vertically
      if (f.y > canvas.height + 10) {
        f.y = -10;
        f.x = Math.random() * canvas.width;
      }
      // wrap horizontally
      if (f.x < -10) f.x = canvas.width + 10;
      if (f.x > canvas.width + 10) f.x = -10;
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.fillStyle = "#FFFFFF";

    for (const f of flakes) {
      ctx.globalAlpha = f.opacity;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
  }

  loop();
}

document.addEventListener("DOMContentLoaded", () => {
  setupEffects();
  initRealSnow();
});
