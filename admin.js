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
  doc,
  get,
  update,
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

const adminSubmissionsBody = document.getElementById("adminSubmissionsBody");

const ADMIN_EMAILS = [
  "admin@pennoble.com"
];

let isAdmin = false;
let dataListenersSetUp = false;
let lastAwardAction = null;

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

  if (adminSubmissionsBody) {
    setupSubmissionsListener();
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

function renderAdminSubmissions(submissionsMap) {
  if (!adminSubmissionsBody) return;
  adminSubmissionsBody.innerHTML = "";

  const rows = [];
  Object.entries(submissionsMap || {}).forEach(([uid, subs]) => {
    Object.entries(subs || {}).forEach(([id, s]) => {
      rows.push({ uid, id, ...s });
    });
  });

  rows.sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));

  if (!rows.length) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="6">No submissions yet.</td>`;
    adminSubmissionsBody.appendChild(tr);
    return;
  }

  rows.forEach((row) => {
    const tr = document.createElement("tr");
    const previewText = (row.text || "").slice(0, 120).replace(/\n/g, " ");
    const submittedAt = row.submittedAt ? new Date(row.submittedAt).toLocaleString() : "-";
    tr.innerHTML = `
      <td>${row.displayName || row.uid}</td>
      <td>${row.type || "-"}</td>
      <td><span class="submission-preview" data-uid="${row.uid}" data-id="${row.id}" style="cursor:pointer;text-decoration:underline;">${previewText}${(row.text || "").length > 120 ? "…" : ""}</span></td>
      <td>${submittedAt}</td>
      <td>${row.reviewed ? "Yes" : "No"}</td>
      <td>
        <button class="admin-sub-review" data-uid="${row.uid}" data-id="${row.id}">Quick award</button>
      </td>
    `;
    adminSubmissionsBody.appendChild(tr);
  });
}

function createModal() {
  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.left = "0";
  overlay.style.top = "0";
  overlay.style.right = "0";
  overlay.style.bottom = "0";
  overlay.style.background = "rgba(0,0,0,0.5)";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.zIndex = "9999";

  const box = document.createElement("div");
  box.style.width = "720px";
  box.style.maxWidth = "95%";
  box.style.maxHeight = "85%";
  box.style.overflow = "auto";
  box.style.background = "#fff";
  box.style.borderRadius = "10px";
  box.style.padding = "18px";
  box.style.boxShadow = "0 10px 30px rgba(0,0,0,0.25)";
  overlay.appendChild(box);

  return { overlay, box };
}

function showToastWithUndo(message, undoCallback, timeout = 8000) {
  const toast = document.createElement("div");
  toast.style.position = "fixed";
  toast.style.right = "20px";
  toast.style.bottom = "20px";
  toast.style.background = "#222";
  toast.style.color = "#fff";
  toast.style.padding = "12px 16px";
  toast.style.borderRadius = "8px";
  toast.style.boxShadow = "0 6px 18px rgba(0,0,0,0.3)";
  toast.style.zIndex = "10000";
  toast.style.display = "flex";
  toast.style.alignItems = "center";
  toast.style.gap = "12px";

  const txt = document.createElement("div");
  txt.textContent = message;
  txt.style.maxWidth = "420px";
  txt.style.overflow = "hidden";
  txt.style.textOverflow = "ellipsis";
  txt.style.whiteSpace = "nowrap";

  const undoBtn = document.createElement("button");
  undoBtn.textContent = "Undo";
  undoBtn.style.background = "#fff";
  undoBtn.style.border = "none";
  undoBtn.style.padding = "6px 10px";
  undoBtn.style.borderRadius = "6px";
  undoBtn.style.cursor = "pointer";

  toast.appendChild(txt);
  toast.appendChild(undoBtn);
  document.body.appendChild(toast);

  const timer = setTimeout(() => {
    try { document.body.removeChild(toast); } catch (e) {}
    lastAwardAction = null;
  }, timeout);

  undoBtn.addEventListener("click", () => {
    clearTimeout(timer);
    try { document.body.removeChild(toast); } catch (e) {}
    if (typeof undoCallback === "function") undoCallback();
    lastAwardAction = null;
  });
}

function openReviewModal(uid, id, submissionData) {
  const mapping = {
    sentence: { xp: 5, coins: 2 },
    paragraph: { xp: 18, coins: 8 },
    essay: { xp: 50, coins: 25 }
  };

  const defaults = mapping[submissionData.type] || { xp: 5, coins: 2 };

  const { overlay, box } = createModal();

  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.justifyContent = "space-between";
  header.style.alignItems = "center";
  header.style.marginBottom = "12px";

  const title = document.createElement("h3");
  title.textContent = `Review submission — ${submissionData.displayName || uid}`;
  title.style.margin = "0";
  title.style.fontSize = "1.05rem";

  const closeX = document.createElement("button");
  closeX.textContent = "✕";
  closeX.style.border = "none";
  closeX.style.background = "transparent";
  closeX.style.fontSize = "1.1rem";
  closeX.style.cursor = "pointer";

  header.appendChild(title);
  header.appendChild(closeX);

  const textLabel = document.createElement("div");
  textLabel.textContent = "Submission text";
  textLabel.style.fontWeight = "600";
  textLabel.style.marginBottom = "6px";

  const textArea = document.createElement("textarea");
  textArea.readOnly = true;
  textArea.rows = 8;
  textArea.style.width = "100%";
  textArea.style.padding = "10px";
  textArea.style.borderRadius = "8px";
  textArea.style.resize = "vertical";
  textArea.value = submissionData.text || "";
  box.style.background = "rgba(10,15,35,0.95)";
  textArea.style.background = "rgba(255,255,255,0.95)";



  const formRow = document.createElement("div");
  formRow.style.display = "flex";
  formRow.style.gap = "12px";
  formRow.style.marginTop = "12px";
  formRow.style.flexWrap = "wrap";

  const xpWrap = document.createElement("div");
  xpWrap.style.display = "flex";
  xpWrap.style.flexDirection = "column";
  xpWrap.style.minWidth = "120px";
  const xpLabel = document.createElement("label");
  xpLabel.textContent = "XP to award";
  const xpInput = document.createElement("input");
  xpInput.type = "number";
  xpInput.value = String(defaults.xp);
  xpInput.min = "0";
  xpInput.style.padding = "8px";
  xpInput.style.borderRadius = "6px";
  xpWrap.appendChild(xpLabel);
  xpWrap.appendChild(xpInput);

  const coinsWrap = document.createElement("div");
  coinsWrap.style.display = "flex";
  coinsWrap.style.flexDirection = "column";
  coinsWrap.style.minWidth = "120px";
  const coinsLabel = document.createElement("label");
  coinsLabel.textContent = "Coins to award";
  const coinsInput = document.createElement("input");
  coinsInput.type = "number";
  coinsInput.value = String(defaults.coins);
  coinsInput.min = "0";
  coinsInput.style.padding = "8px";
  coinsInput.style.borderRadius = "6px";
  coinsWrap.appendChild(coinsLabel);
  coinsWrap.appendChild(coinsInput);

  const commentWrap = document.createElement("div");
  commentWrap.style.flex = "1 1 100%";
  commentWrap.style.display = "flex";
  commentWrap.style.flexDirection = "column";
  const commentLabel = document.createElement("label");
  commentLabel.textContent = "Private comment (optional)";
  const commentInput = document.createElement("textarea");
  commentInput.rows = 3;
  commentInput.placeholder = "Write a private note to the student...";
  commentInput.style.padding = "8px";
  commentInput.style.borderRadius = "6px";

  commentWrap.appendChild(commentLabel);
  commentWrap.appendChild(commentInput);

  formRow.appendChild(xpWrap);
  formRow.appendChild(coinsWrap);
  formRow.appendChild(commentWrap);

  const actions = document.createElement("div");
  actions.style.display = "flex";
  actions.style.justifyContent = "flex-end";
  actions.style.gap = "10px";
  actions.style.marginTop = "14px";

  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "Cancel";
  cancelBtn.style.padding = "8px 12px";
  cancelBtn.style.border = "1px solid #ccc";
  cancelBtn.style.borderRadius = "6px";
  cancelBtn.style.background = "#fff";
  cancelBtn.style.cursor = "pointer";

  const confirmBtn = document.createElement("button");
  confirmBtn.textContent = "Confirm & Award";
  confirmBtn.style.padding = "8px 12px";
  confirmBtn.style.border = "none";
  confirmBtn.style.borderRadius = "6px";
  confirmBtn.style.cursor = "pointer";
  confirmBtn.style.background = "#2b7cff";
  confirmBtn.style.color = "#fff";

  actions.appendChild(cancelBtn);
  actions.appendChild(confirmBtn);

  box.appendChild(header);
  box.appendChild(textLabel);
  box.appendChild(textArea);
  box.appendChild(formRow);
  box.appendChild(actions);

  document.body.appendChild(overlay);

  function closeModal() {
    try { document.body.removeChild(overlay); } catch (e) {}
  }

  closeX.addEventListener("click", closeModal);
  cancelBtn.addEventListener("click", closeModal);

  confirmBtn.addEventListener("click", async () => {
    const xpToAward = Math.max(0, parseInt(xpInput.value || "0", 10));
    const coinsToAward = Math.max(0, parseInt(coinsInput.value || "0", 10));
    const privateComment = commentInput.value || "";

    confirmBtn.disabled = true;
    confirmBtn.textContent = "Awarding...";

    try {
      const userRef = ref(db, `winterMagic2025/users/${uid}`);
      const userSnap = await get(userRef);
      const user = userSnap.exists() ? userSnap.val() : null;

      const newUserValues = {};
      if (user) {
        newUserValues.seasonXp = (user.seasonXp || 0) + xpToAward;
        newUserValues.elfCoins = (user.elfCoins || 0) + coinsToAward;
      } else {
        newUserValues.seasonXp = xpToAward;
        newUserValues.elfCoins = coinsToAward;
      }

      await update(userRef, newUserValues);

      const reviewPatch = {
        reviewed: true,
        awardedPoints: xpToAward,
        awardedCoins: coinsToAward,
        reviewedBy: (auth && auth.currentUser && auth.currentUser.email) ? auth.currentUser.email : "admin",
        reviewedAt: Date.now(),
        reviewerComment: privateComment || ""
      };

      await update(ref(db, `winterMagic2025/submissions/${uid}/${id}`), reviewPatch);

      const notifId = `${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
      const notifPayload = {
        id: notifId,
        type: "submission_awarded",
        title: "Your submission was reviewed",
        body: `You were awarded ${xpToAward} XP and ${coinsToAward} coins.`,
        xp: xpToAward,
        coins: coinsToAward,
        comment: privateComment || "",
        createdAt: Date.now(),
        read: false
      };

      const notifPath = `winterMagic2025/notifications/${uid}/${notifId}`;
      const notifPatch = {};
      notifPatch[notifPath] = notifPayload;
      await update(ref(db), notifPatch);

      try {
        const emailDoc = {
          to: submissionData.email || submissionData.userEmail || null,
          subject: `Submission reviewed — ${submissionData.displayName || ""}`,
          body: `Hi ${submissionData.displayName || ""},\n\nYour submission has been reviewed and you were awarded ${xpToAward} XP and ${coinsToAward} coins.\n\nComment from teacher: ${privateComment || "(none)"}\n\nBest,\nAdmin`,
          createdAt: Date.now(),
          submissionUid: uid,
          submissionId: id
        };
        await addDoc(collection(fs, "outboundEmails"), emailDoc);
      } catch (e) {}

      lastAwardAction = {
        uid,
        id,
        xp: xpToAward,
        coins: coinsToAward,
        notificationId: notifId,
        userPriorSnapshot: user || null
      };

      closeModal();
      showToastWithUndo(`Awarded ${xpToAward} XP & ${coinsToAward} coins to ${submissionData.displayName || uid}`, async () => {
        if (!lastAwardAction) return;
        try {
          const undo = lastAwardAction;
          const userRef2 = ref(db, `winterMagic2025/users/${undo.uid}`);
          const userSnap2 = await get(userRef2);
          const user2 = userSnap2.exists() ? userSnap2.val() : null;
          const revertUserValues = {};
          if (user2) {
            revertUserValues.seasonXp = Math.max(0, (user2.seasonXp || 0) - undo.xp);
            revertUserValues.elfCoins = Math.max(0, (user2.elfCoins || 0) - undo.coins);
          } else if (undo.userPriorSnapshot) {
            revertUserValues.seasonXp = undo.userPriorSnapshot.seasonXp || 0;
            revertUserValues.elfCoins = undo.userPriorSnapshot.elfCoins || 0;
          }
          await update(userRef2, revertUserValues);

          await update(ref(db, `winterMagic2025/submissions/${undo.uid}/${undo.id}`), {
            reviewed: false,
            awardedPoints: 0,
            awardedCoins: 0,
            reviewedBy: null,
            reviewedAt: null,
            reviewerComment: null
          });

          const notifPathToRemove = `winterMagic2025/notifications/${undo.uid}/${undo.notificationId}`;
          const removePatch = {};
          removePatch[notifPathToRemove] = null;
          await update(ref(db), removePatch);

          lastAwardAction = null;
          alert("Undo successful — award reverted.");
        } catch (err) {
          console.error("Undo failed:", err);
          alert("Undo failed — check console.");
        }
      }, 10000);

    } catch (err) {
      console.error("Awarding failed:", err);
      alert("Failed to award points — check console.");
      confirmBtn.disabled = false;
      confirmBtn.textContent = "Confirm & Award";
    }
  });
}

function setupSubmissionsListener() {
  if (!adminSubmissionsBody) return;
  const sRef = ref(db, "winterMagic2025/submissions");
  onValue(sRef, (snap) => {
    const data = snap.exists() ? snap.val() : {};
    renderAdminSubmissions(data);
  });

  adminSubmissionsBody.addEventListener("click", async (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;

    const preview = target.closest(".submission-preview");
    if (preview) {
      const uid = preview.getAttribute("data-uid");
      const id = preview.getAttribute("data-id");
      if (!uid || !id) return;
      try {
        const sSnap = await get(ref(db, `winterMagic2025/submissions/${uid}/${id}`));
        if (!sSnap.exists()) {
          alert("Submission not found.");
          return;
        }
        const data = sSnap.val();
        data.email = (data.email || data.userEmail || null);
        openReviewModal(uid, id, data);
      } catch (err) {
        console.error("Failed to load submission:", err);
        alert("Failed to load submission — check console.");
      }
      return;
    }

    const btn = target.closest(".admin-sub-review");
    if (btn) {
      const uid = btn.getAttribute("data-uid");
      const id = btn.getAttribute("data-id");
      if (!uid || !id) return;
      try {
        const sSnap = await get(ref(db, `winterMagic2025/submissions/${uid}/${id}`));
        if (!sSnap.exists()) {
          alert("Submission not found.");
          return;
        }
        const data = sSnap.val();
        data.email = (data.email || data.userEmail || null);
        openReviewModal(uid, id, data);
      } catch (err) {
        console.error("Failed to load submission:", err);
        alert("Failed to load submission — check console.");
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
