// ui.js
import { db, ref, get, update } from "./firebase.js";
import { teamNice, teamNaughty } from "./teams.js";

function createDefaultUserData(authUser) {
  return {
    displayName: authUser?.displayName || "",
    email: authUser?.email || "",
    seasonLevel: 1,
    seasonXp: 0,
    seasonXpMax: 600,
    elfCoins: 0,
    chosenSide: null,
    magicPassActive: false,
    magicPassExpiresAt: null,

    activeTheme: "default",
    ownedThemes: { default: true },

    // NEW: visual effects
    activeEffect: "none",
    ownedEffects: { none: true }
  };
}

let userData = createDefaultUserData(null);

let currentUserId = null;

export function getUserData() {
  return userData;
}

export function getUserSide() {
  return userData.chosenSide;
}

export async function loadUserData(authUser) {
  if (!authUser) {
    currentUserId = null;
    userData = createDefaultUserData(null);
    applyThemeToDocument();
    return;
  }

  currentUserId = authUser.uid;
  userData = createDefaultUserData(authUser);

  const uRef = ref(db, `winterMagic2025/users/${authUser.uid}`);

  try {
    const snap = await get(uRef);

    if (snap.exists()) {
      const data = snap.val() || {};

      userData = {
        ...userData,
        seasonLevel: data.seasonLevel ?? userData.seasonLevel,
        seasonXp: data.seasonXp ?? userData.seasonXp,
        seasonXpMax: data.seasonXpMax ?? userData.seasonXpMax,
        elfCoins: data.elfCoins ?? userData.elfCoins,
        chosenSide: data.chosenSide ?? userData.chosenSide,
        magicPassActive: data.magicPassActive ?? userData.magicPassActive,
        magicPassExpiresAt: data.magicPassExpiresAt ?? userData.magicPassExpiresAt,
        displayName: data.displayName ?? userData.displayName,
        email: data.email ?? userData.email,
        activeTheme: data.activeTheme ?? userData.activeTheme,
        ownedThemes: data.ownedThemes ?? userData.ownedThemes,

        // NEW: merge effect data
        activeEffect: data.activeEffect ?? userData.activeEffect,
        ownedEffects: data.ownedEffects ?? userData.ownedEffects
      };

      // Make sure effects always have at least "none"
      if (!userData.ownedEffects || typeof userData.ownedEffects !== "object") {
        userData.ownedEffects = { none: true };
      } else if (userData.ownedEffects.none !== true) {
        userData.ownedEffects.none = true;
      }
      if (!userData.activeEffect) {
        userData.activeEffect = "none";
      }

      if (typeof userData.magicPassExpiresAt === "number") {
        userData.magicPassActive = userData.magicPassExpiresAt > Date.now();
      } else if (!userData.magicPassExpiresAt) {
        userData.magicPassActive = false;
      }
    } else {
      await update(uRef, userData);
    }
  } catch (err) {
    console.error("loadUserData error:", err);
  }

  applyThemeToDocument();
}

function isMagicPassActiveNow() {
  if (typeof userData.magicPassExpiresAt !== "number") return false;
  return userData.magicPassExpiresAt > Date.now();
}

function applyThemeToDocument() {
  const themeId = userData.activeTheme || "default";
  const effectId = userData.activeEffect || "none";

  document.documentElement.setAttribute("data-theme", themeId);
  document.documentElement.setAttribute("data-effect", effectId);
}

export async function saveUserData() {
  if (!currentUserId) return;

  const uRef = ref(db, `winterMagic2025/users/${currentUserId}`);
  try {
    await update(uRef, userData);
  } catch (err) {
    console.error("saveUserData error:", err);
  }
}

export function addXp(amount) {
  userData.seasonXp += amount;

  while (userData.seasonXp >= userData.seasonXpMax) {
    userData.seasonXp -= userData.seasonXpMax;
    userData.seasonLevel++;
    userData.seasonXpMax += 1800;
  }
}

export function addCoins(amount) {
  let finalAmount = amount;

  if (isMagicPassActiveNow()) {
    finalAmount *= 2;
  }

  userData.elfCoins += finalAmount;
}

export async function setUserSideOnce(side) {
  if (!currentUserId) return;

  if (userData.chosenSide === "nice" || userData.chosenSide === "naughty") {
    return;
  }

  if (side !== "nice" && side !== "naughty") {
    return;
  }

  userData.chosenSide = side;
  await saveUserData();
  applyAllUI();
}

export function applyAllUI() {
  applyThemeToDocument();

  const lvl = document.getElementById("seasonLevel");
  const xpFill = document.getElementById("seasonXpFill");
  const xpText = document.getElementById("seasonXpText");
  const cValue = document.getElementById("elfCoinsValue");
  const cFill = document.getElementById("elfCoinsFill");

  if (lvl) {
    lvl.textContent = userData.seasonLevel;
  }

  if (xpText) {
    xpText.textContent = `${userData.seasonXp} / ${userData.seasonXpMax} XP`;
  }

  if (xpFill && userData.seasonXpMax > 0) {
    const pct = (userData.seasonXp / userData.seasonXpMax) * 100;
    xpFill.style.width = `${Math.min(Math.max(pct, 0), 100)}%`;
  }

  if (cValue) {
    cValue.textContent = `${userData.elfCoins} / 500,000`;
  }

  if (cFill) {
    const pctCoins = (userData.elfCoins / 500000) * 100;
    cFill.style.width = `${Math.min(Math.max(pctCoins, 0), 100)}%`;
  }

  const niceVal = document.getElementById("nicePointsValue");
  const niceFill = document.getElementById("nicePointsFill");
  const naughtyVal = document.getElementById("naughtyPointsValue");
  const naughtyFill = document.getElementById("naughtyPointsFill");

  if (niceVal && niceFill && teamNice) {
    const pctNice = (teamNice.xp / teamNice.xpMax) * 100;
    niceVal.textContent = `${teamNice.xp} / teamNice.xpMax`;
    niceFill.style.width = `${Math.min(Math.max(pctNice, 0), 100)}%`;
  }

  if (naughtyVal && naughtyFill && teamNaughty) {
    const pctNaughty = (teamNaughty.xp / teamNaughty.xpMax) * 100;
    naughtyVal.textContent = `${teamNaughty.xp} / ${teamNaughty.xpMax}`;
    naughtyFill.style.width = `${Math.min(Math.max(pctNaughty, 0), 100)}%`;
  }

  const niceLevelEl = document.getElementById("niceTeamLevel");
  if (niceLevelEl && typeof teamNice?.level === "number") {
    niceLevelEl.textContent = `Lvl ${teamNice.level}`;
  }

  const naughtyLevelEl = document.getElementById("naughtyTeamLevel");
  if (naughtyLevelEl && typeof teamNaughty?.level === "number") {
    naughtyLevelEl.textContent = `Lvl ${teamNaughty.level}`;
  }
}
