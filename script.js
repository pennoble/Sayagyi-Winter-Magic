// Simple front-end logic for Sayagyi’s Winter Magic 2025
// No backend yet – easy to connect to Firebase later.

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

// ---------- OVERVIEW: DUMMY PROGRESS ----------
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

// Dummy team scores
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

completeQuestBtn.addEventListener("click", () => {
  const quest = quests[todayQuestIndex];
  if (completedQuestIds.includes(quest.id)) {
    questStatusMessage.textContent = "You already completed today’s quest!";
    return;
  }

  completedQuestIds.push(quest.id);
  // Grant some XP and Elf Coins
  seasonXp += 80;
  elfCoins += 40;
  updateOverviewUI();
  renderQuestList();

  questStatusMessage.textContent =
    "Great job! You completed today’s quest and earned Elf Coins + XP.";
});

renderTodayQuest();
renderQuestList();

// ---------- NICE & NAUGHTY ----------
let selectedSide = "nice";
let nicePoints = 0;
let naughtyPoints = 0;

const sideButtons = document.querySelectorAll(".side-btn");
const sideDescription = document.getElementById("sideDescription");
const craftGiftBtn = document.getElementById("craftGiftBtn");
const craftResult = document.getElementById("craftResult");
const nicePointsValue = document.getElementById("nicePointsValue");
const naughtyPointsValue = document.getElementById("naughtyPointsValue");
const nicePointsFill = document.getElementById("nicePointsFill");
const naughtyPointsFill = document.getElementById("naughtyPointsFill");

sideButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    sideButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    selectedSide = btn.dataset.side;

    if (selectedSide === "nice") {
      sideDescription.textContent =
        "Craft heartwarming gifts that earn Nice Points and unlock cozy rewards.";
    } else {
      sideDescription.textContent =
        "Craft cheeky gifts that earn Naughty Points and unlock playful rewards.";
    }
  });
});

function updateNiceNaughtyUI() {
  nicePointsValue.textContent = nicePoints;
  naughtyPointsValue.textContent = naughtyPoints;

  nicePointsFill.style.width = `${Math.min(100, (nicePoints / 200) * 100)}%`;
  naughtyPointsFill.style.width = `${Math.min(
    100,
    (naughtyPoints / 200) * 100
  )}%`;
}

craftGiftBtn.addEventListener("click", () => {
  const basePoints = 20;
  if (selectedSide === "nice") {
    nicePoints += basePoints;
    craftResult.textContent =
      "You crafted a sparkling Nice gift! 🎁 +20 Nice Points";
  } else {
    naughtyPoints += basePoints;
    craftResult.textContent =
      "You crafted a mischievous Naughty gift! 😈 +20 Naughty Points";
  }

  seasonXp += 30;
  elfCoins += 15;

  updateNiceNaughtyUI();
  updateOverviewUI();
});

updateNiceNaughtyUI();

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
    cost: "120 Nice Points",
    tag: "Badge",
  },
  {
    name: "Chimney Sneak Boots",
    type: "naughty",
    cost: "120 Naughty Points",
    tag: "Outfit",
  },
  {
    name: "Frostbound Husky Decoration",
    type: "nice",
    cost: "200 Nice Points",
    tag: "Decor",
  },
  {
    name: "Mischief Sparkle Trail",
    type: "naughty",
    cost: "200 Naughty Points",
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
