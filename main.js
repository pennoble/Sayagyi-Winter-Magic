// main.js


import "./auth.js";
import "./teams.js";
import "./quests.js";
import "./presence.js";
import "./admin.js";
import "./nice-naughty.js";
import "./magic-pass.js";
import "./themes.js";
import "./event-countdown.js";
import "./effects.js";
import "./submissions.js";


import { dailyResetCheck } from "./reset.js";
import { initQuestUI, movePlayerToLocation } from "./quests.js";


document.addEventListener("DOMContentLoaded", () => {
  
  dailyResetCheck();
  initQuestUI();

  
  document.querySelectorAll(".map-location").forEach((btn) => {
    btn.addEventListener("click", () => {
      movePlayerToLocation(btn.dataset.location);
    });
  });
});


document.addEventListener("click", (e) => {
  if (!e.target.classList.contains("nav-btn")) return;

  const id = e.target.dataset.panel;

  
  document.querySelectorAll(".nav-btn").forEach((btn) =>
    btn.classList.remove("active")
  );
  e.target.classList.add("active");

 
  document.querySelectorAll(".panel").forEach((panel) => {
    panel.classList.remove("active");
    if (panel.id === `panel-${id}`) {
      panel.classList.add("active");
    }
  });
});
