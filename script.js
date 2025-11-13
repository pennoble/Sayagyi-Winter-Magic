// Sayagyi’s Winter Magic 2025
// Firebase Auth login gate + Realtime Database
// - Team Nice / Team Naughty Season Levels (global)
// - Per-player XP & Elf Coins (per-user)

// ---------- FIREBASE IMPORTS ----------
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import {
  getDatabase,
  ref,
  get,
  set,
  update,
  onValue,
  runTransaction,
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-database.js";

// ---------- FIREBASE CONFIG (your project) ----------
const firebaseConfig = {
  apiKey: "AIzaSyANrwevKjRqwdhPAzABbXhpXcUe6hUkMmc",
  authDomain: "sayagyi-winter-magic.firebaseapp.com",
  databaseURL: "https://sayagyi-winter-magic-default-rtdb.firebaseio.com/",
  projectId: "sayagyi-winter-magic",
  storageBucket: "sayagyi-winter-magic.firebasestorage.app",
  messagingSenderId: "786387143177",
  appId: "1:786387143177:web:0e2bb4a3066e673cbac6d8",
  measurementId: "G-RW8YRDQ950",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// ---------- LOGIN / AUTH DOM ELEMENTS ----------
const loginOverlay = document.getElementById("loginOverlay");
const authForm = document.getElementById("authForm");
const authEmailInput = document.getElementById("authEmail");
const authPasswordInput = document.getElementById("authPassword");
const authMessage = document.getElementById("authMessage");
const authLoggedInBox = document.getElementById("authLoggedIn");
const userNameDisplay = document.getElementById("userNameDisplay");
const logoutBtn = document.getElementById("logoutBtn");

// ---------- GLOBAL STATE ----------
let currentUser = null;

// Per-user data (personal)
const defaultUserData = () => ({
  displayName: "",
  seasonLevel: 1,
  seasonXp: 0,
  seasonXpMax: 600,
  elfCoins: 0,
  completedQuestIds: [],
  chosenSide: null, // "nice" or "naughty", locked for whole event
  magicPassActive: false,
});

let userData = defaultUserData();

// Team Season Levels (public)
let teamNice = { level: 1, xp: 0, xpMax: 300 };
let teamNaughty = { level: 1, xp: 0, xpMax: 300 };

// ---------- REFS ----------
const userRef = (uid) => ref(db, `winterMagic2025/users/${uid}`);
const teamsRef = ref(db, "winterMagic2025/teams");

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

      // Hide overlay on success
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

// ---------- LOAD / SAVE USER DATA ----------
async function loadUserData(user) {
  const uRef = userRef(user.uid);
  const snap = await get(uRef);

  const defaultName =
    user.displayName ||
    (user.email ? user.email.split("@")[0] : "Winter Player");

  let data = defaultUserData();

  if (snap.exists()) {
    data = { ...data, ...snap.val() };
  }
  if (!data.displayName) data.displayName = defaultName;

  userData = data;
  if (userNameDisplay) userNameDisplay.textContent = data.displayName;

  applyAllUI();
}

async function saveUserData() {
  if (!currentUser) return;
  const uRef = userRef(currentUser.uid);
  const toSave = {
    displayName: userData.displayName,
    seasonLevel: userData.seasonLevel,
    seasonXp: userData.seasonXp,
    seasonXpMax: userData.seasonXpMax,
    elfCoins: userData.elfCoins,
    completedQuestIds: userData.completedQuestIds || [],
    chosenSide: userData.chosenSide || null,
    magicPassActive: !!userData.magicPassActive,
  };
  await update(uRef, toSave);
}

// ---------- TEAM DATA: SUBSCRIBE ----------
onValue(teamsRef, async (snap) => {
  if (!snap.exists()) {
    // Initialize default teams if not present
    await set(teamsRef, {
      nice: { level: 1, xp: 0, xpMax: 300 },
      naughty: { level: 1, xp: 0, xpMax: 300 },
    });
    teamNice = { level: 1, xp: 0, xpMax: 300 };
    teamNaughty = { level: 1, xp: 0, xpMax: 300 };
  } else {
    const val = snap.val();
    if (val.nice) teamNice = val.nice;
    if (val.naughty) teamNaughty = val.naughty;
  }
  updateTeamSeasonUI();
});

// ---------- GAIN TEAM XP (GLOBAL, TRANSACTION) ----------
function gainTeamXp(side, amount) {
  if (!side || amount <= 0) return;
  const sideKey = side === "nice" ? "nice" : "naughty";
  const sideRef = ref(db, `winterMagic2025/teams/${sideKey}`);

  runTransaction(sideRef, (current) => {
    if (!current) {
      current = { level: 1, xp: 0, xpMax: 300 };
    }
    let { level, xp, xpMax } = current;

    xp += amount;
    while (xp >= xpMax) {
      xp -= xpMax;
      level++;
      xpMax += 200; // Each level requires more XP
    }

    return { level, xp, xpMax };
  }).catch((err) => console.error("Team XP transaction error:", err));
}

// ---------- AUTH STATE LISTENER ----------
onAuthStateChanged(auth, async (user) => {
  currentUser = user;

  if (user) {
    // Logged IN
    if (loginOverlay) loginOverlay.style.display = "none";
    if (authLoggedInBox) authLoggedInBox.style.display = "flex";

    try {
      await loadUserData(user);
    } catch (e) {
      console.error("Error loading user data:", e);
      userData = defaultUserData();
      applyAllUI();
    }

    if (authMessage) authMessage.textContent = "";
  } else {
    // Logged OUT
    if (loginOverlay) loginOverlay.style.display = "flex";
    if (authLoggedInBox) authLoggedInBox.style.display = "none";
    userData = defaultUserData();
    applyAllUI();
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
function checkPersonalLevelUp() {
  while (userData.seasonXp >= userData.seasonXpMax) {
    userData.seasonXp -= userData.seasonXpMax;
    userData.seasonLevel++;
    userData.seasonXpMax += 200; // each level harder
  }
}

function updateOverviewUI() {
  const seasonLevelEl = document.getElementById("seasonLevel");
  const seasonXpFill = document.getElementById("seasonXpFill");
  const seasonXpText = document.getElementById("seasonXpText");
  const elfCoinsValue = document.getElementById("elfCoinsValue");
  const elfCoinsFill = document.getElementById("elfCoinsFill");

  const lvl = userData.seasonLevel;
  const xp = userData.seasonXp;
  const xpMax = userData.seasonXpMax;
  const coins = userData.elfCoins;

  if (seasonLevelEl) seasonLevelEl.textContent = lvl;
  if (seasonXpFill) {
    const xpPercent = Math.min(100, (xp / xpMax) * 100);
    seasonXpFill.style.width = `${xpPercent}%`;
  }
  if (seasonXpText) {
    seasonXpText.textContent = `${xp} / ${xpMax} XP`;
  }

  if (elfCoinsValue) elfCoinsValue.textContent = coins;
  if (elfCoinsFill) {
    const coinsPercent = Math.min(100, (coins / 400) * 100);
    elfCoinsFill.style.width = `${coinsPercent}%`;
  }
}

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

const todayQuestBox = document.getElementById("todayQuestBox");
const questListEl = document.getElementById("questList");
const completeQuestBtn = document.getElementById("completeQuestBtn");
const questStatusMessage = document.getElementById("questStatusMessage");

function renderTodayQuest() {
  if (!todayQuestBox) return;
  const quest = quests[todayQuestIndex];
  todayQuestBox.innerHTML = `
    <p><strong>${quest.name}</strong></p>
    <p>${quest.description}</p>
  `;
}

function renderQuestList() {
  if (!questListEl) return;
  questListEl.innerHTML = "";
  quests.forEach((q, index) => {
    const li = document.createElement("li");
    li.className = "quest-item";

    const nameDiv = document.createElement("div");
    nameDiv.className = "quest-name";
    nameDiv.textContent = `${index + 1}. ${q.name}`;

    const statusSpan = document.createElement("span");
    statusSpan.className = "quest-status";

    const completed = (userData.completedQuestIds || []).includes(q.id);

    if (completed) {
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
const teamNiceLevelEl = document.getElementById("nicePointsValue");
const teamNiceXpFill = document.getElementById("nicePointsFill");
const teamNaughtyLevelEl = document.getElementById("naughtyPointsValue");
const teamNaughtyXpFill = document.getElementById("naughtyPointsFill");

function updateTeamSeasonUI() {
  if (teamNiceLevelEl) teamNiceLevelEl.textContent = teamNice.level;
  if (teamNaughtyLevelEl) teamNaughtyLevelEl.textContent = teamNaughty.level;

  if (teamNiceXpFill) {
    const pct = Math.min(100, (teamNice.xp / teamNice.xpMax) * 100);
    teamNiceXpFill.style.width = `${pct}%`;
  }
  if (teamNaughtyXpFill) {
    const pct = Math.min(100, (teamNaughty.xp / teamNaughty.xpMax) * 100);
    teamNaughtyXpFill.style.width = `${pct}%`;
  }
}

// ---------- PLAYER SIDE SELECTION (ONE SIDE ONLY) ----------
let selectedSide = "nice"; // for the buttons

const sideButtons = document.querySelectorAll(".side-btn");
const sideDescription = document.getElementById("sideDescription");
const craftGiftBtn = document.getElementById("craftGiftBtn");
const craftResult = document.getElementById("craftResult");

sideButtons.forEach((btn) => {
  btn.addEventListener("click", async () => {
    const clickedSide = btn.dataset.side; // "nice" or "naughty"

    // If user not logged in, ignore (overlay should block anyway)
    if (!currentUser) return;

    // Already chose a side in DB and trying to switch?
    if (userData.chosenSide && clickedSide !== userData.chosenSide) {
      alert(
        `You already chose Team ${
          userData.chosenSide === "nice" ? "Nice" : "Naughty"
        } for this event.`
      );
      return;
    }

    // Lock in their side the first time they click
    if (!userData.chosenSide) {
      userData.chosenSide = clickedSide;
      await saveUserData();
    }

    selectedSide = clickedSide;

    sideButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    if (!sideDescription) return;
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
if (completeQuestBtn) {
  completeQuestBtn.addEventListener("click", async () => {
    if (!currentUser) {
      if (questStatusMessage) {
        questStatusMessage.textContent =
          "Please log in first so we can save your quest progress.";
      }
      return;
    }

    const quest = quests[todayQuestIndex];
    const completedList = userData.completedQuestIds || [];

    if (completedList.includes(quest.id)) {
      if (questStatusMessage) {
        questStatusMessage.textContent =
          "You already completed today’s quest!";
      }
      return;
    }

    completedList.push(quest.id);
    userData.completedQuestIds = completedList;

    // Personal rewards
    userData.seasonXp += 80;
    userData.elfCoins += 40;
    checkPersonalLevelUp();
    updateOverviewUI();
    renderQuestList();

    // Team XP bonus based on their chosen side (or fallback to selectedSide)
    const teamSide = userData.chosenSide || selectedSide;
    gainTeamXp(teamSide, 40);

    if (questStatusMessage) {
      questStatusMessage.textContent =
        "Great job! You completed today’s quest and helped your team’s Season Level.";
    }

    await saveUserData();
  });
}

// ---------- CRAFT GIFTS (AFFECTS TEAM SEASON LEVELS) ----------
if (craftGiftBtn) {
  craftGiftBtn.addEventListener("click", async () => {
    if (!currentUser) {
      if (craftResult) {
        craftResult.textContent =
          "Please log in first so we can save your progress.";
      }
      return;
    }

    // If they never explicitly chose a side, lock them to the current selected side on first craft
    if (!userData.chosenSide) {
      userData.chosenSide = selectedSide;
      await saveUserData();
    }

    const side = userData.chosenSide;
    const baseTeamXp = 30;

    if (craftResult) {
      if (side === "nice") {
        craftResult.textContent =
          "You crafted a sparkling Nice gift! 🎁 You helped Team Nice gain Season XP.";
      } else {
        craftResult.textContent =
          "You crafted a mischievous Naughty gift! 😈 You helped Team Naughty gain Season XP.";
      }
    }

    // Personal progress
    userData.seasonXp += 30;
    userData.elfCoins += 15;
    checkPersonalLevelUp();
    updateOverviewUI();

    // Team progress
    gainTeamXp(side, baseTeamXp);

    await saveUserData();
  });
}

// ---------- MAGIC PASS ----------
let magicPassActive = false; // local mirror if you want to do more later
const togglePassBtn = document.getElementById("togglePassBtn");
const passStatusText = document.getElementById("passStatusText");
const passBadge = document.getElementById("passBadge");

function updateMagicPassUI() {
  const active = !!userData.magicPassActive;
  magicPassActive = active;

  if (!togglePassBtn || !passStatusText || !passBadge) return;

  if (active) {
    togglePassBtn.textContent = "✅ Magic Pass Activated";
    passStatusText.innerHTML =
      'Magic Pass is <strong>active</strong>. (Future: extra coins & XP).';
    passBadge.textContent = "MAGIC PASS · ACTIVE";
  } else {
    togglePassBtn.textContent = "🔒 Activate Magic Pass";
    passStatusText.innerHTML =
      "Magic Pass is currently <strong>locked</strong>.";
    passBadge.textContent = "MAGIC PASS";
  }
}

if (togglePassBtn) {
  togglePassBtn.addEventListener("click", async () => {
    if (!currentUser) {
      if (passStatusText) {
        passStatusText.textContent =
          "Please log in first to activate Magic Pass.";
      }
      return;
    }
    userData.magicPassActive = !userData.magicPassActive;
    updateMagicPassUI();
    await saveUserData();
  });
}

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
    cost: "Nice Team Season Level 3",
    tag: "Badge",
  },
  {
    name: "Chimney Sneak Boots",
    type: "naughty",
    cost: "Naughty Team Season Level 3",
    tag: "Outfit",
  },
  {
    name: "Frostbound Husky Decoration",
    type: "nice",
    cost: "Nice Team Season Level 4",
    tag: "Decor",
  },
  {
    name: "Mischief Sparkle Trail",
    type: "naughty",
    cost: "Naughty Team Season Level 4",
    tag: "Effect",
  },
  {
    name: "Winter Magic Frame",
    type: "pass",
    cost: "Personal Season Level 5 + Magic Pass",
    tag: "Profile",
  },
];

const rewardGrid = document.getElementById("rewardGrid");

function renderRewards() {
  if (!rewardGrid) return;
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

// ---------- APPLY ALL UI ----------
function applyAllUI() {
  updateOverviewUI();
  updateTeamSeasonUI();
  updateMagicPassUI();
  renderQuestList();
  renderTodayQuest();
}

// ---------- EVENT DAYS LEFT (DEMO TEXT ONLY) ----------
const eventDaysLeftEl = document.getElementById("eventDaysLeft");
if (eventDaysLeftEl) eventDaysLeftEl.textContent = "12 days left";

// ---------- INITIAL RENDER ----------
renderTodayQuest();
renderQuestList();
renderRewards();
applyAllUI();
