// quests.js
import { db, ref, onValue, get, update } from "./firebase.js";
import { getTodayQuestLocation } from "./reset.js";
import { getUserSide, addXp, addCoins, saveUserData, applyAllUI } from "./ui.js";
import { gainTeamXp } from "./teams.js";


const DAILY_QUESTS = {
  iceRink: {
    name: "Write a paragraph.",
    description: "Use a Graphic Organizer: Descriptive."
  },
  cafe: {
    name: "Write a paragraph.",
    description: "Use a Graphic Organizer: Compare-and-contrast."
  },
  stage: {
    name: "Draw a sentence diagram.",
    description: "ပုံမှန် Assignment ထပ်နေကြအတိုင်း Video ရိုက်ပေးပြီးထပ်ရမှာပါ၊ စကားလုံး 30 အထက်။"
  },
  market: {
    name: "Write a paragraph.",
    description: "Use a Graphic Organizer: Expository."
  }
};


let currentLocation = "gate";


export function movePlayerToLocation(locationId) {
  currentLocation = locationId;

  const marker = document.getElementById("playerMarker");
  const btn = document.querySelector(`.map-location[data-location="${locationId}"]`);
  const mapHint = document.getElementById("mapHint");
  const questBox = document.getElementById("todayQuestBox");
  const today = getTodayQuestLocation();

  if (!marker || !btn) return;

  marker.style.left = btn.style.left;
  marker.style.top = btn.style.top;

  if (mapHint) {
    mapHint.textContent = "You are now at " + locationId;
  }

  if (!questBox) return;

  if (today && DAILY_QUESTS[today] && today === locationId) {
    questBox.innerHTML = `
      <p><strong>${DAILY_QUESTS[locationId].name}</strong></p>
      <p>${DAILY_QUESTS[locationId].description}</p>
    `;
    questBox.classList.remove("empty-box");
  } else if (today && DAILY_QUESTS[today]) {
    questBox.innerHTML = `<p class="tiny-note">No quest here today.</p>`;
    questBox.classList.add("empty-box");
  } else {
    questBox.innerHTML = `<p class="tiny-note">No quest loaded.</p>`;
    questBox.classList.add("empty-box");
  }
}



const TEAM_BONUS_COOLDOWN_MS = 24 * 60 * 60 * 1000; 
const TEAM_BONUS_XP = 150;
const TEAM_BONUS_COINS = 10;
const TEAM_BONUS_TEAM_XP = 20;

let presenceCache = {};
let usersByTeam = { nice: [], naughty: [] };
let teamBonusMeta = { nice: null, naughty: null };
let listenersStarted = false;


function startUsersListener() {
  const usersRef = ref(db, "winterMagic2025/users");
  onValue(usersRef, (snap) => {
    const all = snap.val() || {};
    const next = { nice: [], naughty: [] };

    Object.entries(all).forEach(([uid, data]) => {
      if (!data || !data.chosenSide) return;
      if (data.chosenSide === "nice") next.nice.push(uid);
      if (data.chosenSide === "naughty") next.naughty.push(uid);
    });

    usersByTeam = next;
    updateTeamBonusButtonState();
  });
}


function startPresenceListener() {
  const presenceRef = ref(db, "winterMagic2025/presence");
  onValue(presenceRef, (snap) => {
    presenceCache = snap.val() || {};
    updateTeamBonusButtonState();
  });
}


function startBonusMetaListener() {
  const bonusRef = ref(db, "winterMagic2025/teamBonuses");
  onValue(bonusRef, (snap) => {
    teamBonusMeta = snap.val() || {};
    updateTeamBonusButtonState();
  });
}


function startTeamBonusListeners() {
  if (listenersStarted) return;
  listenersStarted = true;

  startUsersListener();
  startPresenceListener();
  startBonusMetaListener();
}


function getTeamOnlineCounts(side) {
  const members = usersByTeam[side] || [];

  const total = members.length;
  const online = members.filter((uid) => {
    const p = presenceCache?.[uid];
    return p && p.online;
  }).length;

  return { total, online };
}


function updateTeamBonusButtonState() {
  const btn = document.getElementById("completeQuestBtn");
  const status = document.getElementById("questStatusMessage");
  if (!btn || !status) return;

  const side = getUserSide();

  if (!side) {
  
  if (getUserData().email) {
    
    btn.disabled = true;
    btn.classList.add("disabled");
    status.textContent = "Loading your team... please wait.";
  } else {
    
    btn.disabled = true;
    btn.classList.add("disabled");
    status.textContent =
      "Choose your team in the Nice & Naughty panel to unlock this bonus.";
  }
  return;
}

  const { total, online } = getTeamOnlineCounts(side);

  if (!total) {
    btn.disabled = true;
    btn.classList.add("disabled");
    status.textContent = "No teammates found yet. Once your team is formed, come back here.";
    return;
  }

  const bonusInfo = teamBonusMeta?.[side] || {};
  const lastClaim = bonusInfo.lastClaimedAt || 0;
  const now = Date.now();
  const cooledDown = now - lastClaim >= TEAM_BONUS_COOLDOWN_MS;

  
  if (online < total) {
    btn.disabled = true;
    btn.classList.add("disabled");
    status.textContent = `Your entire ${side === "nice" ? "Nice" : "Naughty"} team must be online at the same time. Currently ${online}/${total} are online.`;
    return;
  }

  
  if (!cooledDown) {
    btn.disabled = true;
    btn.classList.add("disabled");
    const remainingMs = TEAM_BONUS_COOLDOWN_MS - (now - lastClaim);
    const remainingHours = Math.ceil(remainingMs / (60 * 60 * 1000));
    status.textContent = `Your ${side === "nice" ? "Nice" : "Naughty"} team already claimed this bonus. Try again in about ${remainingHours} hour(s).`;
    return;
  }

 
  btn.disabled = false;
  btn.classList.remove("disabled");
  status.textContent = `Your entire ${side === "nice" ? "Nice" : "Naughty"} team is online! Any one of you can press the button now to claim bonus points for everyone.`;
}


function setupTeamBonusClickHandler() {
  const btn = document.getElementById("completeQuestBtn");
  const status = document.getElementById("questStatusMessage");
  if (!btn || !status) return;

  btn.addEventListener("click", async () => {
    const side = getUserSide();
    if (side !== "nice" && side !== "naughty") return;

    const bonusRef = ref(db, `winterMagic2025/teamBonuses/${side}`);
    const snap = await get(bonusRef);
    const data = snap.exists() ? snap.val() : {};
    const lastClaim = data.lastClaimedAt || 0;
    const now = Date.now();

    
    if (now - lastClaim < TEAM_BONUS_COOLDOWN_MS) {
      status.textContent = "Someone on your team has already claimed the bonus. Try again later.";
      updateTeamBonusButtonState();
      return;
    }

    
    addXp(TEAM_BONUS_XP);
    addCoins(TEAM_BONUS_COINS);
    gainTeamXp(side, TEAM_BONUS_TEAM_XP);
    await saveUserData();
    applyAllUI();

    
    await update(bonusRef, {
      lastClaimedAt: now
    });

    status.textContent = `Bonus claimed for Team ${side === "nice" ? "Nice" : "Naughty"}! You earned +${TEAM_BONUS_XP} XP, +${TEAM_BONUS_COINS} Elf Coins and your team earned extra XP.`;
    btn.disabled = true;
    btn.classList.add("disabled");
  });
}


export function initQuestUI() {
  
  const quest = getTodayQuestLocation();
  const questBox = document.getElementById("todayQuestBox");

  if (questBox) {
    if (!quest || !DAILY_QUESTS[quest]) {
      questBox.innerHTML = `<p class='tiny-note'>No quest loaded.</p>`;
      questBox.classList.add("empty-box");
    } else {
      questBox.innerHTML = `
        <p><strong>${DAILY_QUESTS[quest].name}</strong></p>
        <p>${DAILY_QUESTS[quest].description}</p>
      `;
      questBox.classList.remove("empty-box");
    }
  }

  
  const btn = document.getElementById("completeQuestBtn");
  const status = document.getElementById("questStatusMessage");
  if (btn && status) {
    btn.disabled = true;
    btn.classList.add("disabled");
    status.textContent = "Waiting for your whole team to come online...";
  }

  
  startTeamBonusListeners();
  setupTeamBonusClickHandler();
}

