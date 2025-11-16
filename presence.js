// presence.js
import { db, ref, set, onDisconnect } from "./firebase.js";
import { serverTimestamp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-database.js";

export async function enterPresence(uid) {
  if (!uid) return;

  const userStatusRef = ref(db, `winterMagic2025/presence/${uid}`);

  
  await set(userStatusRef, {
    online: true,
    lastSeen: serverTimestamp(),
  });

  
  onDisconnect(userStatusRef).set({
    online: false,
    lastSeen: serverTimestamp(),
  });
}

export async function leavePresence(uid) {
  if (!uid) return;

  const userStatusRef = ref(db, `winterMagic2025/presence/${uid}`);

  await set(userStatusRef, {
    online: false,
    lastSeen: serverTimestamp(),
  });
}
