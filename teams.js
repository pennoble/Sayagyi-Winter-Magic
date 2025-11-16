// teams.js
import { db, ref, onValue, runTransaction, set } from "./firebase.js";

export let teamNice = { level: 1, xp: 0, xpMax: 300 };
export let teamNaughty = { level: 1, xp: 0, xpMax: 300 };

export const teamsRef = ref(db, "winterMagic2025/teams");

onValue(teamsRef, async (snap) => {
  if (!snap.exists()) {
    await set(teamsRef, {
      nice: { level: 1, xp: 0, xpMax: 300 },
      naughty: { level: 1, xp: 0, xpMax: 300 }
    });
    return;
  }

  const data = snap.val();
  teamNice = data.nice || teamNice;
  teamNaughty = data.naughty || teamNaughty;
});

export function gainTeamXp(side, amount) {
  const key = side === "nice" ? "nice" : "naughty";
  const refTeam = ref(db, `winterMagic2025/teams/${key}`);

  runTransaction(refTeam, (t) => {
    if (!t) t = { level: 1, xp: 0, xpMax: 300 };
    t.xp += amount;

    while (t.xp >= t.xpMax) {
      t.xp -= t.xpMax;
      t.level++;
      t.xpMax += 200;
    }
    return t;
  });
}
