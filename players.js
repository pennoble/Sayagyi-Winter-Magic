// players.js
import { db, ref, onValue } from "./firebase.js";

function el(id) { return document.getElementById(id); }

function ensureStatusStyles() {
  if (document.getElementById("player-status-styles")) return;
  const s = document.createElement("style");
  s.id = "player-status-styles";
  s.textContent = `
  /* Player status dot and alignment */
  .player-status {
    display: flex;
    align-items: center;
    gap: 8px;
    white-space: nowrap;
  }

  .status-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    flex: 0 0 12px;
    display: inline-block;
    vertical-align: middle;
    transition: transform 0.18s ease, box-shadow 0.18s ease;
  }

  .status-dot.online {
    background: #6CFF6C;
    box-shadow: 0 0 6px rgba(120,255,120,0.95);
  }

  .status-dot.offline {
    background: #999999;
    box-shadow: none;
    opacity: 0.9;
  }

  /* gentle pulse for online users */
  .status-dot.pulse {
    animation: playerDotPulse 1.6s ease-in-out infinite;
  }

  @keyframes playerDotPulse {
    0% {
      transform: scale(1);
      box-shadow: 0 0 6px rgba(120,255,120,0.95);
    }
    50% {
      transform: scale(1.25);
      box-shadow: 0 0 14px rgba(120,255,120,0.95);
    }
    100% {
      transform: scale(1);
      box-shadow: 0 0 6px rgba(120,255,120,0.95);
    }
  }

  /* small tweak to the status text to match your theme */
  .player-status .status-text {
    font-size: 0.82rem;
    opacity: 0.95;
    color: inherit;
  }
  `;
  document.head.appendChild(s);
}

function makePlayerRow(email, uid, online, displayName, userObj = {}) {
 
  ensureStatusStyles();

  const wrap = document.createElement("div");
  wrap.className = "player-row";
  wrap.style.alignItems = "center"; 
  wrap.style.justifyContent = "space-between";
  wrap.style.padding = "8px";
  wrap.style.borderRadius = "8px";
  wrap.style.marginBottom = "6px";
  wrap.style.background = "rgba(255,255,255,0.02)";
  wrap.style.border = "1px solid rgba(255,255,255,0.03)";

  const left = document.createElement("div");
  left.style.display = "flex";
  left.style.alignItems = "center";
  left.style.gap = "12px";

  const avatar = document.createElement("div");
  avatar.className = "player-avatar";

  if (userObj.photoURL) {
    const img = document.createElement("img");
    img.src = userObj.photoURL;
    img.alt = displayName || email || "avatar";
    avatar.appendChild(img);
  } else {
    const name = (displayName || email || "").trim();
    let initials = "";
    if (name) {
      const parts = name.split(/\s+/);
      initials = parts.length === 1
        ? parts[0].slice(0,2)
        : ((parts[0][0] || "") + (parts[1] ? parts[1][0] : "")).slice(0,2);
      initials = initials.toUpperCase();
    } else {
      initials = uid.slice(0,2).toUpperCase();
    }
    avatar.textContent = initials;
    
    const colorSeed = Array.from((displayName || email || uid)).reduce((s,c)=>s + c.charCodeAt(0), 0);
    const hue = colorSeed % 360;
    avatar.style.background = `linear-gradient(135deg, hsl(${hue} 45% 28%), hsl(${(hue+30)%360} 40% 22%))`;
  }

  if (userObj.badge || userObj.badgeImage) {
    const badge = document.createElement("div");
    badge.className = "avatar-badge";
    if (userObj.badgeImage) {
      const bimg = document.createElement("img");
      bimg.src = userObj.badgeImage;
      bimg.alt = "badge";
      badge.appendChild(bimg);
    } else {
      badge.classList.add("avatar-badge--smalltext");
      badge.textContent = userObj.badge;
    }
    avatar.appendChild(badge);
  }

  const nameWrap = document.createElement("div");
  nameWrap.style.display = "flex";
  nameWrap.style.flexDirection = "column";

  const nameLine = document.createElement("div");
  nameLine.textContent = displayName || email || "(no name)";
  nameLine.style.fontWeight = "600";
  nameLine.style.fontSize = "0.95rem";

  const emailLine = document.createElement("div");
  emailLine.textContent = email || "";
  emailLine.style.fontSize = "0.82rem";
  emailLine.style.opacity = "0.9";

  nameWrap.appendChild(nameLine);
  nameWrap.appendChild(emailLine);

  left.appendChild(avatar);
  left.appendChild(nameWrap);

  
  const statusWrap = document.createElement("div");
  statusWrap.className = "player-status";
 
  statusWrap.style.display = "flex";
  statusWrap.style.alignItems = "center";
  statusWrap.style.gap = "8px";

  const dot = document.createElement("div");
  dot.className = "status-dot " + (online ? "online pulse" : "offline");
  dot.setAttribute("aria-hidden", "true");
  dot.setAttribute("title", online ? "online" : "offline");

  const statusText = document.createElement("div");
  statusText.className = "status-text";
  statusText.textContent = online ? "online" : "offline";

  statusWrap.appendChild(dot);
  statusWrap.appendChild(statusText);

  wrap.appendChild(left);
  wrap.appendChild(statusWrap);

  return wrap;
}

function renderLists(usersMap, presenceMap) {
  const niceRoot = el("playersNiceList");
  const naughtyRoot = el("playersNaughtyList");
  if (!niceRoot || !naughtyRoot) return;

  niceRoot.innerHTML = "";
  naughtyRoot.innerHTML = "";

  const nice = [];
  const naughty = [];

  Object.entries(usersMap || {}).forEach(([uid, u]) => {
    const side = u.chosenSide || "-";
    const email = u.email || "";
    const displayName = u.displayName || u.email || uid;
    const online = !!(presenceMap && presenceMap[uid] && presenceMap[uid].online);

    if (side === "nice") {
      nice.push({ uid, email, online, displayName, raw: u });
    } else if (side === "naughty") {
      naughty.push({ uid, email, online, displayName, raw: u });
    }
  });

  const sortFn = (a, b) => {
    if (a.online === b.online) {
      return (a.displayName || "").localeCompare(b.displayName || "");
    }
    return a.online ? -1 : 1;
  };

  nice.sort(sortFn);
  naughty.sort(sortFn);

  if (!nice.length) {
    const p = document.createElement("div");
    p.style.fontStyle = "italic";
    p.textContent = "No players in Team Nice yet.";
    niceRoot.appendChild(p);
  } else {
    nice.forEach((p) => niceRoot.appendChild(makePlayerRow(p.email, p.uid, p.online, p.displayName, p.raw)));
  }

  if (!naughty.length) {
    const p = document.createElement("div");
    p.style.fontStyle = "italic";
    p.textContent = "No players in Team Naughty yet.";
    naughtyRoot.appendChild(p);
  } else {
    naughty.forEach((p) => naughtyRoot.appendChild(makePlayerRow(p.email, p.uid, p.online, p.displayName, p.raw)));
  }
}

let latestUsers = {};
let latestPresence = {};

function setupListeners() {
  const usersRef = ref(db, "winterMagic2025/users");
  const presenceRef = ref(db, "winterMagic2025/presence");

  onValue(usersRef, (snap) => {
    latestUsers = snap.exists() ? (snap.val() || {}) : {};
    renderLists(latestUsers, latestPresence);
  });

  onValue(presenceRef, (snap) => {
    latestPresence = snap.exists() ? (snap.val() || {}) : {};
    renderLists(latestUsers, latestPresence);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setupListeners();

 
  document.addEventListener("click", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    if (t.classList.contains("nav-btn") && t.dataset.panel === "players") {
      renderLists(latestUsers, latestPresence);
    }
  });
});
