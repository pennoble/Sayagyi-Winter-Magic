// magic-pass.js
import { db, ref, get } from "./firebase.js";
import { getUserData, saveUserData } from "./ui.js";

const PASSWORDS_PATH = "winterMagic2025/magicPass/passwords";


const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * ONE_DAY_MS;

const EVENT_MS = 30 * ONE_DAY_MS;

let cachedPasswords = null;
let passwordsLoadingPromise = null;

function getEls() {
  return {
    toggleBtn: document.getElementById("togglePassBtn"),
    statusText: document.getElementById("passStatusText"),
    badge: document.getElementById("passBadge"),
    timer: document.getElementById("magicPassTimer")
  };
}

async function loadPasswordsIfNeeded() {
  if (cachedPasswords) return cachedPasswords;
  if (passwordsLoadingPromise) return passwordsLoadingPromise;

  passwordsLoadingPromise = (async () => {
    try {
      const snap = await get(ref(db, PASSWORDS_PATH));
      cachedPasswords = snap.exists() ? snap.val() || {} : {};
      console.log("[MagicPass] Passwords loaded:", cachedPasswords);
    } catch (err) {
      console.error("[MagicPass] Failed to load passwords:", err);
      cachedPasswords = {};
    }
    return cachedPasswords;
  })();

  return passwordsLoadingPromise;
}

function formatRemaining(ms) {
  if (ms <= 0) return "expired";

  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (!parts.length) parts.push("less than 1m");

  return parts.join(" ");
}

function computeActiveAndRemaining() {
  const user = getUserData();
  const now = Date.now();

  if (typeof user.magicPassExpiresAt !== "number") {
    return { active: false, remainingMs: 0, expiresAt: null };
  }

  const remainingMs = user.magicPassExpiresAt - now;
  const active = remainingMs > 0;

  return { active, remainingMs, expiresAt: user.magicPassExpiresAt };
}

function refreshMagicPassUI() {
  const { toggleBtn, statusText, badge, timer } = getEls();
  if (!toggleBtn || !statusText) return;

  const { active, remainingMs } = computeActiveAndRemaining();

  
  if (timer) {
    if (active) {
      timer.textContent = `Expires in ${formatRemaining(remainingMs)}`;
    } else {
      timer.textContent = "";
    }
  }

  
  toggleBtn.textContent = active
    ? "✅ Magic Pass Active"
    : "🔒 Activate Magic Pass";

  
  if (active) {
    statusText.innerHTML =
      "Magic Pass is <strong>active</strong>. Enjoy double Elf Coins and extra perks!";
  } else {
    statusText.innerHTML =
      "Magic Pass is currently <strong>locked</strong>.";
  }

  
  if (badge) {
    if (active) {
      badge.classList.add("active");
    } else {
      badge.classList.remove("active");
    }
  }
}

async function handleActivateClick() {
  const { statusText } = getEls();
  const user = getUserData();

  if (!user || !user.email) {
    if (statusText) {
      statusText.textContent = "You must be logged in to use Magic Pass.";
    }
    return;
  }

  const { active, remainingMs } = computeActiveAndRemaining();

  if (active) {
    if (statusText) {
      statusText.textContent = `Magic Pass is already active. Remaining: ${formatRemaining(
        remainingMs
      )}.`;
    }
    return;
  }

  await loadPasswordsIfNeeded();
  const pw = cachedPasswords || {};
  const code = window.prompt("Enter Magic Pass password:");

  if (!code) {
    if (statusText) {
      statusText.textContent = "Magic Pass activation cancelled.";
    }
    return;
  }

  const trimmed = code.trim();

  let durationMs = null;
  let label = "";

  if (trimmed === pw.oneDay) {
    durationMs = ONE_DAY_MS;
    label = "1 day";
  } else if (trimmed === pw.sevenDay) {
    durationMs = SEVEN_DAYS_MS;
    label = "7 days";
  } else if (trimmed === pw.eventFull) {
    durationMs = EVENT_MS;
    label = "the entire event";
  }

  if (!durationMs) {
    if (statusText) {
      statusText.textContent = "Invalid Magic Pass password.";
    }
    return;
  }

  const now = Date.now();
  const base =
    typeof user.magicPassExpiresAt === "number" &&
    user.magicPassExpiresAt > now
      ? user.magicPassExpiresAt
      : now;

  const newExpiry = base + durationMs;

  user.magicPassActive = true;
  user.magicPassExpiresAt = newExpiry;

  try {
    await saveUserData();
    if (statusText) {
      statusText.textContent = `Magic Pass activated for ${label}!`;
    }
  } catch (err) {
    console.error("[MagicPass] Failed to save user data:", err);
    if (statusText) {
      statusText.textContent =
        "Failed to activate Magic Pass. Please try again.";
    }
    return;
  }

  refreshMagicPassUI();
}

function setupMagicPass() {
  const { toggleBtn } = getEls();
  if (!toggleBtn) return;

  toggleBtn.addEventListener("click", handleActivateClick);

  
  refreshMagicPassUI();

  
  setInterval(refreshMagicPassUI, 30000);
}

document.addEventListener("DOMContentLoaded", () => {
  setupMagicPass();
});
