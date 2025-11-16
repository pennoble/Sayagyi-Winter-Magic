import {
  auth,
  db,
  ref,
  onValue,
  onAuthStateChanged,
  fs,
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc
} from "./firebase.js";

const adminDashboard = document.getElementById("adminDashboard");
const adminToggleBtn = document.getElementById("adminToggleBtn");
const adminCloseBtn = document.getElementById("adminCloseBtn");
const adminTeamsSummary = document.getElementById("adminTeamsSummary");
const adminUsersBody = document.getElementById("adminUsersBody");

const adminRecipesBody = document.getElementById("adminRecipesBody");
const adminRecipeForm = document.getElementById("adminRecipeForm");
const recipeItemAInput = document.getElementById("recipeItemA");
const recipeItemBInput = document.getElementById("recipeItemB");
const recipeResultInput = document.getElementById("recipeResult");
const adminRecipeMessage = document.getElementById("adminRecipeMessage");

const ADMIN_EMAILS = [
  "admin@pennoble.com"
  // "another-admin@example.com"
];

let isAdmin = false;
let dataListenersSetUp = false;


function showAdminButton(show) {
  if (!adminToggleBtn) return;
  adminToggleBtn.style.display = show ? "inline-flex" : "none";
}

function hideAdminDashboard() {
  if (!adminDashboard) return;
  adminDashboard.classList.add("hidden");
}

function showAdminDashboard() {
  if (!adminDashboard) return;
  adminDashboard.classList.remove("hidden");
}

if (adminToggleBtn) {
  adminToggleBtn.addEventListener("click", () => {
    if (!isAdmin) return;
    if (adminDashboard.classList.contains("hidden")) {
      showAdminDashboard();
    } else {
      hideAdminDashboard();
    }
  });
}

if (adminCloseBtn) {
  adminCloseBtn.addEventListener("click", () => {
    hideAdminDashboard();
  });
}


function setupDataListenersOnce() {
  if (dataListenersSetUp) return;
  dataListenersSetUp = true;

  if (adminTeamsSummary) {
    const teamsRef = ref(db, "winterMagic2025/teams");
    onValue(teamsRef, (snap) => {
      const data = snap.val() || {};
      const nice = data.nice || {};
      const naughty = data.naughty || {};

      const niceLevel = nice.level ?? 1;
      const niceXp = nice.xp ?? 0;
      const niceXpMax = nice.xpMax ?? 300;

      const naughtyLevel = naughty.level ?? 1;
      const naughtyXp = naughty.xp ?? 0;
      const naughtyXpMax = naughty.xpMax ?? 300;

      adminTeamsSummary.innerHTML = `
        <div class="admin-team-summary">
          <div><strong>Team Nice</strong> – Lvl ${niceLevel} (${niceXp}/${niceXpMax} XP)</div>
          <div><strong>Team Naughty</strong> – Lvl ${naughtyLevel} (${naughtyXp}/${naughtyXpMax} XP)</div>
        </div>
      `;
    });
  }

  
  if (adminUsersBody) {
    const usersRef = ref(db, "winterMagic2025/users");
    onValue(usersRef, (snap) => {
      const data = snap.val() || {};
      adminUsersBody.innerHTML = "";

      Object.keys(data).forEach((uid) => {
        const u = data[uid] || {};
        const displayName = u.displayName || "(no name)";
        const email = u.email || "";
        const side = u.chosenSide || "-";
        const level = u.seasonLevel ?? 1;
        const xp = u.seasonXp ?? 0;
        const xpMax = u.seasonXpMax ?? 600;
        const coins = u.elfCoins ?? 0;
        const magicPass = u.magicPassActive ? "Yes" : "No";

        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${displayName}</td>
          <td>${email}</td>
          <td>${side}</td>
          <td>${level}</td>
          <td>${xp}/${xpMax}</td>
          <td>${coins}</td>
          <td>${magicPass}</td>
        `;
        adminUsersBody.appendChild(tr);
      });
    });
  }

  
  if (adminRecipesBody && adminRecipeForm) {
    setupRecipeAdmin();
  }
}



let adminRecipes = [];

async function loadRecipesForAdmin() {
  if (!isAdmin) return;
  if (!adminRecipesBody) return;

  try {
    const snap = await getDocs(collection(fs, "recipes"));
    const list = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data() || {};
      list.push({
        id: docSnap.id,
        itemA: data.itemA || "",
        itemB: data.itemB || "",
        result: data.result || ""
      });
    });

    adminRecipes = list;
    renderRecipeTable();
  } catch (err) {
    console.error("Failed to load recipes for admin:", err);
    if (adminRecipeMessage) {
      adminRecipeMessage.textContent = "Failed to load recipes. Check console for details.";
    }
  }
}

function renderRecipeTable() {
  if (!adminRecipesBody) return;

  adminRecipesBody.innerHTML = "";
  if (!adminRecipes.length) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="4">No recipes yet.</td>`;
    adminRecipesBody.appendChild(tr);
    return;
  }

  adminRecipes.forEach((r) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.itemA}</td>
      <td>${r.itemB}</td>
      <td>${r.result}</td>
      <td>
        <button type="button" class="admin-recipe-delete" data-id="${r.id}">Delete</button>
      </td>
    `;
    adminRecipesBody.appendChild(tr);
  });
}

function setupRecipeAdmin() {
  
  loadRecipesForAdmin();

  
  adminRecipeForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!isAdmin) return;

    const itemA = recipeItemAInput ? recipeItemAInput.value.trim() : "";
    const itemB = recipeItemBInput ? recipeItemBInput.value.trim() : "";
    const result = recipeResultInput ? recipeResultInput.value.trim() : "";

    if (!itemA || !itemB || !result) {
      if (adminRecipeMessage) {
        adminRecipeMessage.textContent = "Please fill in Item 1, Item 2, and Result.";
      }
      return;
    }

    try {
      await addDoc(collection(fs, "recipes"), {
        itemA,
        itemB,
        result
      });

      if (recipeItemAInput) recipeItemAInput.value = "";
      if (recipeItemBInput) recipeItemBInput.value = "";
      if (recipeResultInput) recipeResultInput.value = "";

      if (adminRecipeMessage) {
        adminRecipeMessage.textContent = "Recipe added!";
      }

      await loadRecipesForAdmin();
    } catch (err) {
      console.error("Failed to add recipe:", err);
      if (adminRecipeMessage) {
        adminRecipeMessage.textContent = "Failed to add recipe. Check console.";
      }
    }
  });

  
  adminRecipesBody.addEventListener("click", async (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;

    const btn = target.closest(".admin-recipe-delete");
    if (!btn) return;
    if (!isAdmin) return;

    const id = btn.getAttribute("data-id");
    if (!id) return;

    try {
      await deleteDoc(doc(fs, "recipes", id));
      if (adminRecipeMessage) {
        adminRecipeMessage.textContent = "Recipe deleted.";
      }
      await loadRecipesForAdmin();
    } catch (err) {
      console.error("Failed to delete recipe:", err);
      if (adminRecipeMessage) {
        adminRecipeMessage.textContent = "Failed to delete recipe. Check console.";
      }
    }
  });
}



onAuthStateChanged(auth, (user) => {
  const email = user?.email || "";
  isAdmin = !!user && ADMIN_EMAILS.includes(email);

  showAdminButton(isAdmin);

  if (!isAdmin) {
    hideAdminDashboard();
    return;
  }

  
  setupDataListenersOnce();
  
  loadRecipesForAdmin();
});
