// submissions.js
import { db, ref, set, get, update } from "./firebase.js";
import { currentUser } from "./auth.js";
import { getUserData, addXp, addCoins, saveUserData, applyAllUI } from "./ui.js";
import { onAuthStateChanged } from "./firebase.js";

const SUBMISSIONS_PATH = "winterMagic2025/submissions";


const POINTS_BY_TYPE = {
  sentence: { xp: 5, coins: 2 },
  paragraph: { xp: 18, coins: 8 },
  essay: { xp: 50, coins: 25 }
};

function el(id) {
  return document.getElementById(id);
}

async function writeSubmissionToDb(uid, payload) {
 
  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const path = `${SUBMISSIONS_PATH}/${uid}/${id}`;
  const r = ref(db, path);
  await set(r, payload);
  return { id, path };
}

function createSubmissionElement(sub) {
  const wrap = document.createElement("div");
  wrap.className = "submission-item";
  wrap.style.padding = "8px";
  wrap.style.borderRadius = "8px";
  wrap.style.border = "1px dashed rgba(170,207,255,0.3)";
  wrap.style.marginBottom = "8px";

  const meta = document.createElement("div");
  meta.style.fontSize = "0.85rem";
  meta.style.marginBottom = "6px";
  meta.innerHTML = `<strong>${sub.type}</strong> • ${new Date(sub.submittedAt).toLocaleString()}`;

  const text = document.createElement("div");
  text.style.whiteSpace = "pre-wrap";
  text.style.marginBottom = "6px";
  text.textContent = sub.text;

  const status = document.createElement("div");
  status.className = "status-message";
  status.style.fontSize = "0.82rem";
  if (sub.reviewed) {
    status.textContent = `Reviewed ✓ — awarded ${sub.awardedPoints ?? 0} XP`;
  } else {
    status.textContent = "Pending review";
  }

  wrap.appendChild(meta);
  wrap.appendChild(text);
  wrap.appendChild(status);

  return wrap;
}

async function refreshMySubmissionsList() {
  const listRoot = el("mySubmissionsList");
  if (!listRoot) return;
  listRoot.innerHTML = "<em>Loading...</em>";

  const user = currentUser;
  if (!user || !user.uid) {
    listRoot.innerHTML = "<em>Log in to see your submissions.</em>";
    return;
  }

  try {
    const snap = await get(ref(db, `${SUBMISSIONS_PATH}/${user.uid}`));
    const data = snap.exists() ? snap.val() : {};
    const items = Object.entries(data)
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.submittedAt - a.submittedAt);

    if (!items.length) {
      listRoot.innerHTML = "<em>No submissions yet.</em>";
      return;
    }

    listRoot.innerHTML = "";
    items.forEach((it) => listRoot.appendChild(createSubmissionElement(it)));
  } catch (err) {
    console.error("[Submissions] failed to read my submissions", err);
    listRoot.innerHTML = "<em>Failed to load submissions.</em>";
  }
}

function setupSubmitButton() {
  const btn = el("submitWriteBtn");
  const textarea = el("writeText");
  const select = el("writeType");
  const msg = el("writeMessage");

  if (!btn || !textarea || !select || !msg) return;

  btn.addEventListener("click", async () => {
    msg.textContent = "";
    const user = currentUser;
    if (!user || !user.uid) {
      msg.textContent = "You must be logged in to submit.";
      return;
    }

    const text = (textarea.value || "").trim();
    if (!text) {
      msg.textContent = "Write something before submitting.";
      return;
    }

    const type = select.value || "sentence";
    const payload = {
      uid: user.uid,
      displayName: (getUserData().displayName || "").toString(),
      type,
      text,
      submittedAt: Date.now(),
      reviewed: false,
      awardedPoints: 0
    };

    try {
      await writeSubmissionToDb(user.uid, payload);
      msg.textContent = "Submitted — your teacher will review it soon.";
      textarea.value = "";
      await refreshMySubmissionsList();
    } catch (err) {
      console.error("[Submissions] write failed", err);
      msg.textContent = "Submission failed — try again.";
    }
  });
}

function wireNavBehavior() {
  
  document.addEventListener("click", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    if (t.classList.contains("nav-btn") && t.dataset.panel === "write") {
      
      setTimeout(refreshMySubmissionsList, 120);
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setupSubmitButton();
  wireNavBehavior();
 
  onAuthStateChanged((user) => {
    setTimeout(refreshMySubmissionsList, 150);
  });
});
