// Sayagyi’s Winter Magic 2025
// Firebase Auth login gate + local game logic
// (this version does NOT save levels to the DB yet)

// ---------- FIREBASE IMPORTS ----------
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

// ---------- FIREBASE CONFIG (your project) ----------
const firebaseConfig = {
  apiKey: "AIzaSyANrwevKjRqwdhPAzABbXhpXcUe6hUkMmc",
  authDomain: "sayagyi-winter-magic.firebaseapp.com",
  databaseURL: "https://sayagyi-winter-magic-default-rtdb.firebaseio.com/",
  projectId: "sayagyi-winter-magic",
  storageBucket: "sayagyi-winter-magic.firebasestorage.app",
  messagingSenderId: "786387143177",
  appId: "1:786387143177:web:0e2bb4a3066e673cbac6d8",
  measurementId: "G-RW8YRDQ950"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// ---------- LOGIN / AUTH DOM ELEMENTS ----------
const loginOverlay = document.getElementById("loginOverlay");
const authForm = document.getElementById("authForm");
const authEmailInput = document.getElementById("authEmail");
const authPasswordInput = document.getElementById("authPassword");
const authMessage = document.getElementById("authMessage");
const authLoggedInBox = document.getElementById("authLoggedIn");
const userNameDisplay = document.getElementById("userNameDisplay");
const logoutBtn = document.getElementById("logoutBtn");

// ---------- AUTH: LOGIN FORM ----------
if (authForm) {
  authForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = authEmailInput.value.trim();
    const password = authPasswordInput.value.trim();
    if (authMessage) authMessage.textContent = "";

    if (!email || !password) {
      if (authMessage) authMessage.textContent = "Enter email and password.";
      return;
    }

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);

      // If Firebase accepts login, immediately hide overlay
      if (loginOverlay) loginOverlay.style.display = "none";
      if (authLoggedInBox) authLoggedInBox.style.display = "flex";

      const name =
        cred.user.displayName ||
        (cred.user.email ? cred.user.email.split("@")[0] : "Winter Player");
      if (userNameDisplay) userNameDisplay.textContent = name;

      if (authMessage) authMessage.textContent = "Logged in successfully.";
      console.log("Logged in as:", cred.user.uid);
    } catch (err) {
      console.error("Login error:", err);
      if (authMessage) {
        authMessage.textContent = `Login failed: ${err.code || err.message}`;
      }
    }
  });
}

// ---------- AUTH: LOGOUT ----------
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
  });
}

// ---------- AUTH STATE LISTENER ----------
onAuthStateChanged(auth, (user) => {
  if (user) {
    // Logged IN
    if (loginOverlay) loginOverlay.style.display = "none";
    if (authLoggedInBox) authLoggedInBox.style.display = "flex";

    const name =
      user.displayName ||
      (user.email ? user.email.split("@")[0] : "Winter Player");
    if (userNameDisplay) userNameDisplay.textContent = name;

    if (authMessage) authMessage.textContent = "";
  } else {
    // Logged OUT
    if (loginOverlay) loginOverlay.style.display = "flex";
    if (authLoggedInBox) authLoggedInBox.style.display = "none";
    if (authMessage) authMessage.textContent = "";
  }
});

// ======================================================
// =============== GAME LOGIC (FRONT-END) ===============
// ======================================================

// ---------- EVENT NAVIGATION ----------
const navButtons = document.querySelectorAll(".nav-btn");
const panels = document.querySelectorAll(".panel");

navButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const panelId = btn.dataset.panel;
    navButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    panels.forEach((p) => {
      p.classList.remove("active");
      if (p.id === `panel-${panelId}`) {
        p.classList.add("active");
      }
    });
  });
});

// ---------- OVERVIEW: PERSONAL PROGRESS ----------
let seasonLevel = 1;
let seasonXp = 120;
let seasonXpMax = 600;
let elfCoins = 120;

function updateOverviewUI() {
  const seasonLevelEl = document.getElementById("seasonLevel");
  const seasonXpFill = document.getElementById("seasonXpFill");
  const seasonXpText = document.getElementById("seasonXpText");
  const elfCoinsValue = document.getElementById("elfCoinsValue");
  const elfCoinsFill = document.getElementById("elfCoinsFill");

  seasonLevelEl.textContent = seasonLevel;
  const xpPercent = Math.min(100, (seasonXp / seasonXpMax) * 100);
  seasonXpFill.style.width = `${xpPercent}%`;
  seasonXpText.textContent = `${seasonXp} / ${seasonXpMax} XP`;

  elfCoinsValue.textContent = elfCoins;
  const coinsPercent = Math.min(100, elfCoins / 400) * 100;
  elfCoinsFill.style.width = `${coinsPercent}%`;
}

// Dummy team scores under Overview (just text for now)
document.getElementById("teamSnowScore").textContent = "1320";
document.getElementById("teamReinScore").textContent = "1680";

updateOverviewUI();

// ---------- ELF QUESTS ----------
const quests = [
  {
    id: 1,
    name: "Find Sprout in the Ice Rink",
    description:
      "Talk to Merry in Snowfall Village, then find Sprout hiding near the ice rink and collect his dropped tools.",
  },
  {
    id: 2,
    name: "Wake Ivy with Hot Cocoa",
    description:
      "Merry sends you to the Frozen Falls café. Bring Ivy a hot cocoa so she'll return to toy wrapping duty.",
  },
  {
    id: 3,
    name: "Make Cole Laugh with a Dance",
    description:
      "Head to the North Pole stage and perform your brightest dance to cheer up Cole.",
  },
  {
    id: 4,
    name: "Gather Lost Candy Canes",
    description:
      "Search around the Winter Fair stalls and gather candy canes that the elves dropped.",
  },
];

let todayQuestIndex = 0;
let completedQuestIds = [];

const todayQuestBox = document.getElementById("todayQuestBox");
const questListEl = document.getElementById("questList");
const completeQuestBtn = document.getElementById("completeQuestBtn");
const questStatusMessage = document.getElementById("questStatusMessage");

function renderTodayQuest() {
  const quest = quests[todayQuestIndex];
  todayQuestBox.innerHTML = `
    <p><strong>${quest.name}</strong></p>
    <p>${quest.description}</p>
  `;
}

function renderQuestList() {
  questListEl.innerHTML = "";
  quests.forEach((q, index) => {
    const li = document.createElement("li");
    li.className = "quest-item";

    const nameDiv = document.createElement("div");
    nameDiv.className = "quest-name";
    nameDiv.textContent = `${index + 1}. ${q.name}`;

    const statusSpan = document.createElement("span");
    statusSpan.className = "quest-status";

    if (completedQuestIds.includes(q.id)) {
      statusSpan.textContent = "Completed";
      statusSpan.classList.add("completed");
    } else if (index === todayQuestIndex) {
      statusSpan.textContent = "Today";
      statusSpan.classList.add("active");
    } else {
      statusSpan.textContent = "Locked";
      statusSpan.classList.add("locked");
    }

    li.appendChild(nameDiv);
    li.appendChild(statusSpan);
    questListEl.appendChild(li);
  });
}

// ---------- TEAM SEASON LEVELS (PUBLIC) ----------
let teamNiceLevel = 1;
let teamNiceXp = 0;
let teamNiceXpMax = 300;

let teamNaughtyLevel = 1;
let teamNaughtyXp = 0;
let teamNaughtyXpMax = 300;

// We re-use these elements for team levels
const teamNiceLevelEl = document.getElementById("nicePointsValue");
const teamNiceXpFill = document.getElementById("nicePointsFill");
const teamNaughtyLevelEl = document.getElementById("naughtyPointsValue");
const teamNaughtyXpFill = document.getElementById("naughtyPointsFill");

function updateTeamSeasonUI() {
  // Display team levels as numbers
  if (teamNiceLevelEl) teamNiceLevelEl.textContent = teamNiceLevel;
  if (teamNaughtyLevelEl) teamNaughtyLevelEl.textContent = teamNaughtyLevel;

  // XP bars for each team
  if (teamNiceXpFill) {
    const pct = Math.min(100, (teamNiceXp / teamNiceXpMax) * 100);
    teamNiceXpFill.style.width = `${pct}%`;
  }
  if (teamNaughtyXpFill) {
    const pct = Math.min(100, (teamNaughtyXp / teamNaughtyXpMax) * 100);
    teamNaughtyXpFill.style.width = `${pct}%`;
  }
}

function gainTeamXp(side, amount) {
  if (side === "nice") {
    teamNiceXp += amount;
    while (teamNiceXp >= teamNiceXpMax) {
      teamNiceXp -= teamNiceXpMax;
      teamNiceLevel++;
      teamNiceXpMax += 200; // each level a bit harder
    }
  } else if (side === "naughty") {
    teamNaughtyXp += amount;
    while (teamNaughtyXp >= teamNaughtyXpMax) {
      teamNaughtyXp -= teamNaughtyXpMax;
      teamNaughtyLevel++;
      teamNaughtyXpMax += 200;
    }
  }
  updateTeamSeasonUI();
}

// ---------- PLAYER SIDE SELECTION (ONE SIDE ONLY) ----------
let chosenSide = null;      // locked side for the whole event
let selectedSide = "nice";  // UI highlight

const sideButtons = document.querySelectorAll(".side-btn");
const sideDescription = document.getElementById("sideDescription");
const craftGiftBtn = document.getElementById("craftGiftBtn");
const craftResult = document.getElementById("craftResult");

sideButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const clickedSide = btn.dataset.side; // "nice" or "naughty"

    // Already chose a side and trying to switch?
    if (chosenSide && clickedSide !== chosenSide) {
      alert(`You already chose Team ${chosenSide === "nice" ? "Nice" : "Naughty"} for this event.`);
      return;
    }

    // Lock in their side the first time they click
    if (!chosenSide) {
      chosenSide = clickedSide;
    }

    selectedSide = clickedSide;

    sideButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    if (selectedSide === "nice") {
      sideDescription.textContent =
        "You are on Team Nice. Craft heartwarming gifts that earn XP for your team’s Season Level.";
    } else {
      sideDescription.textContent =
        "You are on Team Naughty. Craft cheeky gifts that earn XP for your team’s Season Level.";
    }
  });
});

// ---------- COMPLETE QUEST BUTTON ----------
completeQuestBtn.addEventListener("click", () => {
  const quest = quests[todayQuestIndex];
  if (completedQuestIds.includes(quest.id)) {
    questStatusMessage.textContent = "You already completed today’s quest!";
    return;
  }

  completedQuestIds.push(quest.id);

  // Personal rewards
  seasonXp += 80;
  elfCoins += 40;
  updateOverviewUI();
  renderQuestList();

  // Team XP bonus based on their chosen side (or default Nice if not chosen yet)
  const teamSide = chosenSide || selectedSide;
  gainTeamXp(teamSide, 40);

  questStatusMessage.textContent =
    "Great job! You completed today’s quest and helped your team’s Season Level.";
});

renderTodayQuest();
renderQuestList();

// ---------- CRAFT GIFTS (AFFECTS TEAM SEASON LEVELS) ----------
craftGiftBtn.addEventListener("click", () => {
  // If they never explicitly chose a side, lock them to the current selected side on first craft
  if (!chosenSide) {
    chosenSide = selectedSide;
  }

  const side = chosenSide; // their locked team
  const baseTeamXp = 30;

  if (side === "nice") {
    craftResult.textContent =
      "You crafted a sparkling Nice gift! 🎁 You helped Team Nice gain Season XP.";
  } else {
    craftResult.textContent =
      "You crafted a mischievous Naughty gift! 😈 You helped Team Naughty gain Season XP.";
  }

  // Personal progress
  seasonXp += 30;
  elfCoins += 15;
  updateOverviewUI();

  // Team progress
  gainTeamXp(side, baseTeamXp);
});

// ---------- MAGIC PASS ----------
let magicPassActive = false;
const togglePassBtn = document.getElementById("togglePassBtn");
const passStatusText = document.getElementById("passStatusText");
const passBadge = document.getElementById("passBadge");

function updateMagicPassUI() {
  if (magicPassActive) {
    togglePassBtn.textContent = "✅ Magic Pass Activated";
    passStatusText.innerHTML =
      'Magic Pass is <strong>active</strong>. You now earn extra Elf Coins and bonuses.';
    passBadge.textContent = "MAGIC PASS · ACTIVE";
  } else {
    togglePassBtn.textContent = "🔒 Activate Magic Pass";
    passStatusText.innerHTML =
      "Magic Pass is currently <strong>locked</strong>.";
    passBadge.textContent = "MAGIC PASS";
  }
}

togglePassBtn.addEventListener("click", () => {
  magicPassActive = !magicPassActive;
  updateMagicPassUI();
});

updateMagicPassUI();

// ---------- REWARDS ----------
const rewardData = [
  {
    name: "Snowfall Halo",
    type: "pass",
    cost: "Magic Pass Exclusive",
    tag: "Cosmetic",
  },
  {
    name: "Elf Winter Badge",
    type: "nice",
    cost: "120 Nice Team XP",
    tag: "Badge",
  },
  {
    name: "Chimney Sneak Boots",
    type: "naughty",
    cost: "120 Naughty Team XP",
    tag: "Outfit",
  },
  {
    name: "Frostbound Husky Decoration",
    type: "nice",
    cost: "200 Nice Team XP",
    tag: "Decor",
  },
  {
    name: "Mischief Sparkle Trail",
    type: "naughty",
    cost: "200 Naughty Team XP",
    tag: "Effect",
  },
  {
    name: "Winter Magic Frame",
    type: "pass",
    cost: "Season Level 5 + Magic Pass",
    tag: "Profile",
  },
];

const rewardGrid = document.getElementById("rewardGrid");

function renderRewards() {
  rewardGrid.innerHTML = "";
  rewardData.forEach((r) => {
    const card = document.createElement("div");
    card.className = "reward-card";

    const name = document.createElement("div");
    name.className = "reward-name";
    name.textContent = r.name;

    const tag = document.createElement("div");
    tag.className = "reward-tag";
    tag.textContent = r.tag;

    if (r.type === "nice") tag.classList.add("reward-type-nice");
    if (r.type === "naughty") tag.classList.add("reward-type-naughty");
    if (r.type === "pass") tag.classList.add("reward-type-pass");

    const cost = document.createElement("div");
    cost.className = "reward-cost";
    cost.textContent = r.cost;

    card.appendChild(name);
    card.appendChild(tag);
    card.appendChild(cost);

    rewardGrid.appendChild(card);
  });
}

renderRewards();

// ---------- EVENT DAYS LEFT (DEMO TEXT ONLY) ----------
document.getElementById("eventDaysLeft").textContent = "12 days left";

// Initialize team season UI once at the end
updateTeamSeasonUI();
