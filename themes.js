// themes.js
import { getUserData, saveUserData, applyAllUI } from "./ui.js";

const THEMES = [
  {
    id: "default",
    name: "Snowfall Classic",
    tag: "Default",
    description: "Original Winter Magic look.",
    preview: "linear-gradient(135deg, #355cff, #8b5dff)",
    price: 0
  },
  {
    id: "frost",
    name: "Frozen Lake",
    tag: "Theme",
    description: "Cool icy blues and silver highlights.",
    preview: "linear-gradient(135deg, #3ac8ff, #4f7dff)",
    price: 1000
  },
  {
    id: "aurora",
    name: "Aurora Sky",
    tag: "Theme",
    description: "Purple and teal aurora glow.",
    preview: "linear-gradient(135deg, #6a5dff, #36f5c7)",
    price: 1000
  },
  {
    id: "gingerbread",
    name: "Gingerbread House",
    tag: "Theme",
    description: "Warm cocoa-and-cookie vibes.",
    preview: "linear-gradient(135deg, #c97a3d, #f1b25b)",
    price: 1000
  }
];

function getGrid() {
  return document.getElementById("rewardGrid");
}

function ensureThemeState(user) {
  if (!user.ownedThemes || typeof user.ownedThemes !== "object") {
    user.ownedThemes = { default: true };
  } else if (user.ownedThemes.default !== true) {
    user.ownedThemes.default = true;
  }

  if (!user.activeTheme) {
    user.activeTheme = "default";
  }
}

function renderThemeRewards() {
  const grid = getGrid();
  if (!grid) return;

  const user = getUserData();
  ensureThemeState(user);

  grid.innerHTML = "";

  THEMES.forEach((theme) => {
    const isOwned = !!user.ownedThemes[theme.id];
    const isActive = user.activeTheme === theme.id;

    const card = document.createElement("div");
    card.className = "reward-card";
    if (isActive) {
      
      card.classList.add("reward-type-pass");
    }

    const preview = document.createElement("div");
    preview.className = "theme-preview";
    preview.style.background = theme.preview;

    const name = document.createElement("div");
    name.className = "reward-name";
    name.textContent = theme.name;

    const tag = document.createElement("span");
    tag.className = "reward-tag";
    
    tag.textContent = isActive
      ? "Equipped"
      : isOwned
      ? "Owned"
      : theme.price && theme.price > 0
      ? `${theme.price} 🪙`
      : theme.tag || "Theme";

    const desc = document.createElement("div");
    desc.className = "reward-cost";
    if (!isOwned && theme.price && theme.price > 0) {
      desc.textContent = `Costs ${theme.price} Elf Coins. ${theme.description}`;
    } else {
      desc.textContent = theme.description;
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
        theme.price && theme.price > 0
          ? `Buy (${theme.price} 🪙)`
          : "Claim + Equip";
    }

    btn.addEventListener("click", async () => {
      const u = getUserData();
      ensureThemeState(u);

      
      if (!u.ownedThemes[theme.id]) {
        const price = theme.price || 0;

        if (price > 0) {
          if (typeof u.elfCoins !== "number") {
            u.elfCoins = 0;
          }

          if (u.elfCoins < price) {
            alert(`You need ${price} Elf Coins to buy this theme!`);
            return;
          }

          const confirmed = window.confirm(
            `Buy "${theme.name}" for ${price} Elf Coins?`
          );
          if (!confirmed) {
            return;
          }

          
          u.elfCoins -= price;
        }

        
        u.ownedThemes[theme.id] = true;
      }

      
      u.activeTheme = theme.id;

      try {
        await saveUserData();
      } catch (err) {
        console.error("[Themes] Failed to save theme choice:", err);
      }

      applyAllUI();
      renderThemeRewards();
    });

    card.appendChild(preview);
    card.appendChild(name);
    card.appendChild(tag);
    card.appendChild(desc);
    card.appendChild(btn);

    grid.appendChild(card);
  });
}

function setupThemes() {
  const grid = getGrid();
  if (!grid) return;

  
  renderThemeRewards();

  
  const navBtn = document.querySelector('.nav-btn[data-panel="rewards"]');
  if (navBtn) {
    navBtn.addEventListener("click", () => {
      renderThemeRewards();
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  setupThemes();
});
