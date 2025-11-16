// auth.js
import {
  auth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "./firebase.js";
import { loadUserData, applyAllUI } from "./ui.js";
import { enterPresence, leavePresence } from "./presence.js";

const loginOverlay = document.getElementById("loginOverlay");
const authForm = document.getElementById("authForm");
const authEmailInput = document.getElementById("authEmail");
const authPasswordInput = document.getElementById("authPassword");
const authMessage = document.getElementById("authMessage");
const authLoggedInBox = document.getElementById("authLoggedIn");
const userNameDisplay = document.getElementById("userNameDisplay");
const logoutBtn = document.getElementById("logoutBtn");

export let currentUser = null;
let lastUid = null;



function showLoginOverlay() {
  if (loginOverlay) loginOverlay.style.display = "flex";
  if (authLoggedInBox) authLoggedInBox.style.display = "none";
}

function showLoggedInUI(user) {
  if (loginOverlay) loginOverlay.style.display = "none";
  if (authLoggedInBox) authLoggedInBox.style.display = "flex";

  if (userNameDisplay) {
    userNameDisplay.textContent = user.displayName || user.email || "Elf";
  }
}

function setAuthMessage(text) {
  if (!authMessage) return;
  authMessage.textContent = text || "";
}


function resetToOverviewPanel() {
  const defaultId = "overview";

 
  const navButtons = document.querySelectorAll(".nav-btn");
  navButtons.forEach((btn) => {
    const isDefault = btn.dataset.panel === defaultId;
    btn.classList.toggle("active", isDefault);
  });

  
  const panels = document.querySelectorAll(".panel");
  panels.forEach((panel) => {
    const isDefault = panel.id === `panel-${defaultId}`;
    panel.classList.toggle("active", isDefault);
  });
}



if (authForm) {
  authForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!authEmailInput || !authPasswordInput) return;

    const email = authEmailInput.value.trim();
    const password = authPasswordInput.value;

    if (!email || !password) {
      setAuthMessage("Please enter your email and password.");
      return;
    }

    setAuthMessage("Signing you in...");

    try {
      await signInWithEmailAndPassword(auth, email, password);
      
    } catch (err) {
      console.error("Login error:", err);
      setAuthMessage("Login failed. Please check your email and password.");
    }
  });
}



if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      if (currentUser?.uid) {
        await leavePresence(currentUser.uid);
      }
      await signOut(auth);
      
    } catch (err) {
      console.error("Logout error:", err);
      setAuthMessage("Could not log out. Please try again.");
    }
  });
}



onAuthStateChanged(auth, async (user) => {
  currentUser = user || null;

  if (user) {
    lastUid = user.uid;

    try {
     
      await enterPresence(user.uid);

      
      await loadUserData(user);
      applyAllUI();
    } catch (err) {
      console.error("Error during post-login setup:", err);
    }

    showLoggedInUI(user);
    setAuthMessage("");

    
    resetToOverviewPanel();
  } else {
   
    if (lastUid) {
      try {
        await leavePresence(lastUid);
      } catch (err) {
        console.error("Error leaving presence:", err);
      }
    }

  
    resetToOverviewPanel();

    showLoginOverlay();
  }
});
