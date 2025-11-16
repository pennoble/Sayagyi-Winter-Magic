// nice-naughty.js
import { getUserSide, setUserSideOnce, getUserData } from "./ui.js";
import { currentUser } from "./auth.js";
import { fs, collection, getDocs, db, ref, get, set } from "./firebase.js";

const SIDE_DESCRIPTIONS = {
  nice: "You are on <strong>Team Nice</strong> 🎁 – crafting heartwarming gifts that earn Nice Points.",
  naughty: "You are on <strong>Team Naughty</strong> 😈 – creating chaotic surprises that earn Naughty Points."
};



const MYANMAR_OFFSET = 6.5 * 60 * 60 * 1000; // ms
const CRAFTS_DB_BASE = "winterMagic2025/dailyCrafts";

function getMyanmarTodayString() {
  return new Date(Date.now() + MYANMAR_OFFSET).toDateString();
}

async function loadCraftStateForUser(uid) {
  const today = getMyanmarTodayString();
  const craftRef = ref(db, `${CRAFTS_DB_BASE}/${uid}`);

  try {
    const snap = await get(craftRef);
    if (snap.exists()) {
      const data = snap.val() || {};
      if (data.date === today && typeof data.count === "number") {
        return { date: today, count: data.count };
      }
    }
  } catch (err) {
    console.error("[Nice/Naughty] Failed to load craft state:", err);
  }

  
  const initState = { date: today, count: 0 };
  try {
    await set(craftRef, initState);
  } catch (err) {
    console.error("[Nice/Naughty] Failed to init craft state:", err);
  }
  return initState;
}

async function saveCraftStateForUser(uid, state) {
  const craftRef = ref(db, `${CRAFTS_DB_BASE}/${uid}`);
  try {
    await set(craftRef, state);
  } catch (err) {
    console.error("[Nice/Naughty] Failed to save craft state:", err);
  }
}

function getCraftLimitForToday() {
  const user = getUserData();
  
  if (user && user.magicPassActive) {
    return 4;
  }
  return 1;
}

function getElements() {
  const panel = document.getElementById("panel-nice-naughty");
  return {
    panel,
    sideTitle: panel ? panel.querySelector("h3") : null,
    sideToggle: panel ? panel.querySelector(".side-toggle") : null,
    sideButtons: panel ? panel.querySelectorAll(".side-btn") : null,
    sideDescription: document.getElementById("sideDescription"),
    craftBtn: document.getElementById("craftGiftBtn"),
    craftResult: document.getElementById("craftResult"),
    itemInputA: document.getElementById("itemInputA"),
    itemInputB: document.getElementById("itemInputB")
  };
}


function lockViewForSide(side) {
  const { sideTitle, sideToggle, sideButtons, sideDescription } = getElements();

  if (sideTitle) {
    sideTitle.textContent = side === "nice" ? "Team Nice" : "Team Naughty";
  }

  if (sideToggle) {
    sideToggle.classList.add("hidden"); 
  }

  if (sideButtons && sideButtons.length) {
    sideButtons.forEach((btn) => {
      btn.disabled = true;
      btn.classList.remove("active");
      if (btn.dataset.side === side) {
        btn.classList.add("active");
      }
    });
  }

  if (sideDescription) {
    sideDescription.innerHTML = SIDE_DESCRIPTIONS[side] || "";
  }
}


function showChooserView() {
  const { sideTitle, sideToggle, sideButtons, sideDescription } = getElements();

  if (sideTitle) {
    sideTitle.textContent = "Choose Your Side";
  }

  if (sideToggle) {
    sideToggle.classList.remove("hidden");
  }

  if (sideButtons && sideButtons.length) {
    sideButtons.forEach((btn) => {
      btn.disabled = false;
      if (btn.dataset.side === "nice") {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });
  }

  if (sideDescription) {
    sideDescription.innerHTML =
      'Craft heartwarming gifts that earn <strong>Nice Points</strong> – or embrace chaos with <strong>Naughty Points</strong>.';
  }
}

function refreshNiceNaughtyUI() {
  const side = getUserSide();

  if (side === "nice" || side === "naughty") {
    
    lockViewForSide(side);
  } else {
    
    showChooserView();
  }
}


function setupSideChoice() {
  const { sideButtons, craftResult } = getElements();
  if (!sideButtons || !sideButtons.length) return;

  sideButtons.forEach((btn) => {
    btn.addEventListener("click", async () => {
      const alreadySide = getUserSide();

      if (alreadySide === "nice" || alreadySide === "naughty") {
       
        if (craftResult) {
          craftResult.textContent =
            `You are already locked into Team ${alreadySide === "nice" ? "Nice" : "Naughty"} for this event.`;
        }
        refreshNiceNaughtyUI();
        return;
      }

      const side = btn.dataset.side;
      if (side !== "nice" && side !== "naughty") return;

      await setUserSideOnce(side);

      if (craftResult) {
        craftResult.textContent =
          `You have chosen Team ${side === "nice" ? "Nice 🎁" : "Naughty 😈"} for the whole event!`;
      }

      refreshNiceNaughtyUI();
    });
  });
}



let recipesLoaded = false;
let recipesLoadingPromise = null;

let combinations = {};

function normalizeItems(a, b) {
  return [a.toLowerCase().trim(), b.toLowerCase().trim()].sort().join(" + ");
}


function loadRecipesIfNeeded() {
  if (recipesLoaded) return Promise.resolve();
  if (recipesLoadingPromise) return recipesLoadingPromise;

  recipesLoadingPromise = (async () => {
    try {
    
      const snap = await getDocs(collection(fs, "recipes"));
      const next = {};

      snap.forEach((doc) => {
        const data = doc.data();
        const itemA = data.itemA;
        const itemB = data.itemB;
        const result = data.result;

        if (!itemA || !itemB || !result) return;

        const key = normalizeItems(itemA, itemB);
        next[key] = result;
      });

      combinations = next;
      recipesLoaded = true;
      console.log("[Nice/Naughty] Recipes loaded from Firestore:", combinations);
    } catch (err) {
      console.error("Failed to load recipes from Firestore", err);
     
    }
  })();

  return recipesLoadingPromise;
}

function getCombinationResult(side, rawA, rawB) {
  const key = normalizeItems(rawA, rawB);
  const match = combinations[key];

  if (match) {
    return `${rawA} + ${rawB} → ${match}`;
  }

  
  if (side === "nice") {
    return `${rawA} + ${rawB} → The workshop elves stare in silence... that combo totally flopped 💔 Try something more Christmassy!`;
  }

  
  return `${rawA} + ${rawB} → Even Team Naughty thinks this was a fail 😬 Try a different mischief combo!`;
}


function setupCraftButton() {
  const { craftBtn, craftResult, itemInputA, itemInputB } = getElements();
  if (!craftBtn || !craftResult) return;

  craftBtn.addEventListener("click", async () => {
    const side = getUserSide();

    if (side !== "nice" && side !== "naughty") {
      craftResult.textContent = "Choose your team first before crafting gifts.";
      return;
    }

    if (!currentUser || !currentUser.uid) {
      craftResult.textContent = "You must be logged in to craft gifts.";
      return;
    }

    const uid = currentUser.uid;

    const itemA = itemInputA ? itemInputA.value.trim() : "";
    const itemB = itemInputB ? itemInputB.value.trim() : "";

    if (!itemA || !itemB) {
      craftResult.textContent = "Type two items to combine first!";
      return;
    }


    let state = await loadCraftStateForUser(uid);
    const limit = getCraftLimitForToday();

    if (state.count >= limit) {
      if (limit === 1) {
        craftResult.textContent =
          "You’ve used your 1 craft for today. Activate Magic Pass to craft 4 times per day!";
      } else {
        craftResult.textContent =
          "You’ve used all 4 Magic Pass crafts for today. Come back tomorrow!";
      }
      return;
    }

    await loadRecipesIfNeeded();

    craftResult.textContent = getCombinationResult(side, itemA, itemB);

  
    state.count += 1;
    await saveCraftStateForUser(uid, state);

    const remaining = limit - state.count;
    if (remaining > 0) {
      craftResult.textContent += ` (You have ${remaining} craft${remaining === 1 ? "" : "s"} left today.)`;
    }
  });
}


document.addEventListener("DOMContentLoaded", () => {
  
  refreshNiceNaughtyUI();
  setupSideChoice();
  setupCraftButton();

  
  const navBtn = document.querySelector('.nav-btn[data-panel="nice-naughty"]');
  if (navBtn) {
    navBtn.addEventListener("click", () => {
      refreshNiceNaughtyUI();
    });
  }
});
