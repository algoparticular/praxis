// Which side of the screen the buttons of Sid's world sit on (the seed's and the notebook's): the right by default,
// the left for whoever prefers it (set in the menu, only inside the world; remembered on the device, localStorage).
// Kept out of the world's own chunk because the menu, in the app's, sets it.
import { ref } from 'vue';

const KEY = 'lab.sid.side';
let saved = 'right';
try { if (localStorage.getItem(KEY) === 'left') saved = 'left'; } catch { /* (no storage: the right) */ }

export const worldSide = ref(saved);

export function setWorldSide(side) {
    worldSide.value = side === 'left' ? 'left' : 'right';
    try { localStorage.setItem(KEY, worldSide.value); } catch { /* (not kept: this visit only) */ }
}
