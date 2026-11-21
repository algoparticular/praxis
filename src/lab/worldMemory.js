// What the lab's world remembers on this device, with no account (localStorage): how many visits, the seeds Sid
// carries (the card of each, in the order he found them), what he has planted (where, in the zone of which card,
// so it is found again in its world however the worlds are shuffled; see `plant` in sidWorld.js). If the browser keeps
// nothing (a private window, storage blocked), the world works the same and simply does not remember. `learned`: what
// the person has already done once, so its hint never shows again (sat in lotus, planted a seed, opened a place's card,
// read the words that open the world and the ones at a place: see the hints in LabSid.vue). `marks`: the marks of the
// story found (each once ever; the fragments are read in that order, story.js); `thoughts`: how many of each place's
// thoughts have been shown (the next visit shows the next one, thoughts.js).
const KEY = 'lab.sid.world';
const MAX_PLANTED = 300;

export function loadMemory() {
    const fresh = { v: 1, visits: 0, seeds: [], planted: [], learned: {}, marks: [], thoughts: {} };
    try {
        const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
        if (!saved || saved.v !== 1) return fresh;
        return {
            v: 1,
            visits: Number(saved.visits) || 0,
            seeds: Array.isArray(saved.seeds) ? saved.seeds.filter((s) => typeof s === 'string') : [],
            planted: Array.isArray(saved.planted) ? saved.planted.filter((p) => p && typeof p.name === 'string') : [],
            learned: saved.learned && typeof saved.learned === 'object' ? { ...saved.learned } : {},
            marks: Array.isArray(saved.marks) ? saved.marks.filter((m) => typeof m === 'string') : [],
            thoughts: saved.thoughts && typeof saved.thoughts === 'object' ? { ...saved.thoughts } : {},
        };
    } catch {
        return fresh;
    }
}

export function saveMemory(memory) {
    if (memory.planted.length > MAX_PLANTED) memory.planted.splice(0, memory.planted.length - MAX_PLANTED);
    try { localStorage.setItem(KEY, JSON.stringify(memory)); } catch { /* (nothing kept: the world works the same) */ }
}
