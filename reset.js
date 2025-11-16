// reset.js


const MYANMAR_OFFSET = 6.5 * 60 * 60 * 1000;


const DAILY_LOCATIONS = ["iceRink", "cafe", "stage", "market"];

let todayLocation = null;


export function getTodayQuestLocation() {
  return todayLocation;
}

export function setTodayQuestLocation(loc) {
  todayLocation = loc;
  localStorage.setItem("wm_last_reset_loc", loc);
}


export function dailyResetCheck() {
  const storedDate = localStorage.getItem("wm_last_reset");
  const storedLoc = localStorage.getItem("wm_last_reset_loc");

  const today = new Date(Date.now() + MYANMAR_OFFSET).toDateString();

  
  if (storedDate !== today) {
    const loc = DAILY_LOCATIONS[Math.floor(Math.random() * DAILY_LOCATIONS.length)];

    todayLocation = loc;

    
    localStorage.setItem("wm_last_reset", today);
    localStorage.setItem("wm_last_reset_loc", loc);

    return;
  }

  
  if (storedLoc) {
    todayLocation = storedLoc;
  } else {
   
    todayLocation = DAILY_LOCATIONS[0];
    localStorage.setItem("wm_last_reset_loc", todayLocation);
  }
}
