// What the lab's world remembers on this device, with no account (localStorage): how many visits, the seeds Sid
// carries (the card of each, in the order he found them) and what he has planted (where, in the zone of which card,
// so it is found again in its world however the worlds are shuffled; see `plant` in sidWorld.js). If the browser keeps
// nothing (a private window, storage blocked), the world works the same and simply does not remember.
const KEY = 'lab.sid.world';
const MAX_PLANTED = 300;

export function loadMemory() {
    const fresh = { v: 1, visits: 0, seeds: [], planted: [] };
    try {
        const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
        if (!saved || saved.v !== 1) return fresh;
        return {
            v: 1,
            visits: Number(saved.visits) || 0,
            seeds: Array.isArray(saved.seeds) ? saved.seeds.filter((s) => typeof s === 'string') : [],
            planted: Array.isArray(saved.planted) ? saved.planted.filter((p) => p && typeof p.name === 'string') : [],
        };
    } catch {
        return fresh;
    }
}

export function saveMemory(memory) {
    if (memory.planted.length > MAX_PLANTED) memory.planted.splice(0, memory.planted.length - MAX_PLANTED);
    try { localStorage.setItem(KEY, JSON.stringify(memory)); } catch { /* (nothing kept: the world works the same) */ }
}
