// event-countdown.js


const EVENT_END_TIME = new Date(2025, 11, 25, 23, 59, 59).getTime(); 


function formatRemaining(ms) {
  if (ms <= 0) return "Event ended";

  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  const dPart = `${days}d`;
  const hPart = `${hours}h`;
  const mPart = `${minutes}m`;

  return `${dPart} ${hPart} ${mPart} left`;
}

function updateEventCountdown() {
  const el = document.getElementById("eventDaysLeft");
  if (!el) return;

  const now = Date.now();
  const remaining = EVENT_END_TIME - now;

  el.textContent = formatRemaining(remaining);
}

document.addEventListener("DOMContentLoaded", () => {
  
  updateEventCountdown();
  
  setInterval(updateEventCountdown, 30_000);
});
