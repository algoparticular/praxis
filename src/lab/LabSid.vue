<script setup>
// The puppet lab: Sid (who is also Particular) as a puppet, to try how much more he can move than breathe; the
// world he walks is Sid's world, at /sid (see the router). He is all drawn in code: his body from his silhouette
// traced off Nekkhamma's Sid (scripts/make-sid-lab.mjs -> sid.json), bent, squashed and stretched as a soft body; his
// eyes (they look, blink and close); his arms and legs, strokes with his ink and line that bend freely. Canvas 2D on purpose: it shows the movement;
// if it is what we want, the same rig goes into the WebGL stage (useLayerStage.js). Plan: docs/sid-en-piezas.md.
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import Header from '../components/Header.vue';
import rig from './sid/sid.json';
import { CICLOS, createWorld, STAR_SEED, STAR_LIGHT, pieceUrl } from './sidWorld.js';
import { createStarField, CONSTELLATION_TIME } from '../composables/useStarField.js';
import { THOUGHTS } from './thoughts.js';
import { FRAGMENTS } from './story.js';
import { HERBARIUM, kindOf } from './herbarium.js';
import { CONSTELLATIONS } from './constellations.js';
import Rulito from '../components/Rulito.vue';
import { play, setCardChord, setHush, vibrate } from '../composables/useSound.js';
import { chordFor } from '../data/cardChords.js';
import { gardenNote } from '../audio/synth.js';
import { getCard } from '../data/cards.js';
import { loadMemory, saveMemory } from './worldMemory.js';
import CardTemplate from '../components/CardTemplate.vue';
import { hasWebGL } from '../composables/useLayerStage.js';
import { seedSvg } from './seedShape.js';
import { startWorldVisit } from '../analytics.js';

const ui = reactive({ bones: false, sitting: false, touch: false, hint: false, seeds: 0, seedPop: 0, choose: false, peek: false, guide: null, press: false, pop: 0, hover: null });

// The hints, with no words (as the ghost hand in the scenes): the seed button calls (it swells and glows and rings of
// light go out of it, twice), and what the person has done once (memory.learned) is never hinted again:
// - left a while without being pressed (HINT_FIRST on the first visit, when everything is new; HINT_AFTER later), until
//   he has sat once in this visit;
// - when the first seed he finds has flown into it (the seeds are kept in it, and sitting plants them), until one has
//   been planted;
// - standing at a place, where a ring of light under his feet says where to sit (always), every HINT_AT_PLACE s,
//   until he has sat at a place once.
// The first visit also opens with a few words written by hand, and the first seed with a few more (STORY)
const HINT_AFTER = 7000, HINT_FIRST = 4000, HINT_SHOW = 4400, HINT_AT_PLACE = 5;
let satThisVisit = false, hintTimer = 0, callTimer = 0, firstSeedCalled = false;
function callButton() {
    if (ui.sitting || portal.card != null) return;
    ui.hint = false;
    clearTimeout(callTimer);
    // (off and on again on the next frame, so the animation starts over)
    requestAnimationFrame(() => { ui.hint = true; callTimer = setTimeout(() => { ui.hint = false; }, HINT_SHOW); });
}
function scheduleHint() {
    clearTimeout(hintTimer);
    if (satThisVisit) return;
    hintTimer = setTimeout(() => {
        if (satThisVisit) return;
        // (on the first visit the seed near him calls first: the button waits until it is picked up)
        if (seedWaiting) { hintTimer = setTimeout(scheduleHint, HINT_SHOW); return; }
        callButton();
        hintTimer = setTimeout(scheduleHint, HINT_SHOW);
    }, memory.visits <= 1 ? HINT_FIRST : HINT_AFTER);
}
function learn(what) {
    if (memory.learned[what]) return;
    memory.learned[what] = true;
    saveMemory(memory);
}
// A few words written by hand on the teaching's card, once ever each (memory.learned): the story of the world, which
// is also how it is played. Opening the first visit, where it all comes from (everything started from a particle,
// docs/mundo.md); with the first seed in the button, what to do with it
const STORY = {
    intro: { es: 'Todo partió de una partícula.', en: 'Everything began with a particle.' },
    seed: { es: 'Lo que se siembra en calma, florece.', en: 'What is sown in calm, blooms.' },
};
const STORY_SHOW = 6500;
let storyTimer = 0, gone = false;
const told = new Set();                     // (said, or waiting to be said, in this visit)
function tell(what, after = 0) {
    if (memory.learned[`words_${what}`] || told.has(what)) return;
    told.add(what);
    setTimeout(function say() {
        if (gone) return;
        // (never over a card's affirmation or a card opened: it waits for them to go)
        if (teaching.on || portal.card != null) { setTimeout(say, 1500); return; }
        learn(`words_${what}`);
        Object.assign(teaching, { ...STORY[what], on: true, story: true });
        clearTimeout(storyTimer);
        storyTimer = setTimeout(() => { if (teaching.story) teaching.on = false; }, STORY_SHOW);
    }, after);
}

// The fragments of the story (story.js), each written when a mark of it is found, in order (waiting, as the words
// above, for what is written to go); a little longer on the card: they are read, not glanced at
function readFragment(i) {
    const f = FRAGMENTS[i];
    if (!f) return;
    play('star'); visit?.secret('fragment');
    refreshStory();
    setTimeout(function say() {
        if (gone) return;
        if ((teaching.on && !teaching.story) || portal.card != null) { setTimeout(say, 1500); return; }
        Object.assign(teaching, { es: f.es, en: f.en, on: true, story: true });
        clearTimeout(storyTimer);
        storyTimer = setTimeout(() => { if (teaching.story) teaching.on = false; }, STORY_SHOW * 1.4);
    }, 600);
}

// Sid's notebook, written in the sky (its icon, a notebook, over the seed button, shows once there is something in it and
// glows while there is something new to see; it opens on the page that has it; a touch anywhere, or Escape, closes it;
// the header's icons go cream over it, `body.lab-story`). Two pages:
// - Pensamientos: the fragments of the story found, in order, as one paragraph, those still hidden as faint stars the
//   length of their words; those found since it was last seen (memory.storySeen) are painted in, one after another, in
//   the order they were found (each mark gives one still hidden, at random);
// - Herbario: every plant a seed can grow into (herbarium.js) as a dark silhouette, and in its colours with its name
//   once one of its kind has been planted (those planted since it was last seen, memory.herbSeen, come in out of a
//   warm light)
const story = reactive({ open: false, tab: 'thoughts', found: 0, fresh: false, shown: false, have: new Set(), order: new Map(), herb: new Set(), herbNew: new Map() });
const herbPlanted = () => new Set(memory.planted.map((g) => kindOf(g.name)).filter(Boolean));
function storyNews() {
    const thoughts = memory.fragments.some((i) => !memory.storySeen.includes(i));
    const herb = [...herbPlanted()].some((h) => !memory.herbSeen.includes(h));
    return { thoughts, herb };
}
function refreshStory() {
    story.found = memory.fragments.length;
    story.shown = story.found > 0 || herbPlanted().size > 0;
    const news = storyNews();
    story.fresh = news.thoughts || news.herb;
}
function openStory() {
    if (!story.shown) return;
    const news = storyNews();
    showTab(news.thoughts ? 'thoughts' : news.herb ? 'herbarium' : story.found ? story.tab : 'herbarium');
    story.open = true; ui.choose = false;
    document.body.classList.add('lab-story');
    visit?.notebook(story.tab, news.thoughts || news.herb, memory.fragments.length, herbPlanted().size);
    play('tap');
}
function closeStory() { story.open = false; document.body.classList.remove('lab-story'); }
// (each page, as it is shown, paints in what is new on it and remembers it as seen)
function showTab(tab) {
    story.tab = tab;
    if (tab === 'thoughts') {
        const seen = new Set(memory.storySeen);
        story.have = new Set(memory.fragments);
        story.order = new Map(memory.fragments.filter((i) => !seen.has(i)).map((i, n) => [i, n]));
        if (story.order.size) { memory.storySeen = [...memory.fragments]; saveMemory(memory); }
    } else {
        const seen = new Set(memory.herbSeen), planted = herbPlanted();
        story.herb = planted;
        story.herbNew = new Map([...planted].filter((h) => !seen.has(h)).map((h, n) => [h, n]));
        if (story.herbNew.size) { memory.herbSeen = [...planted]; saveMemory(memory); }
    }
    refreshStory();
}

// What the places think, as the things of Everything do (thoughts.js): coming near one of the seven places, one of
// its card's own sentences is written by hand in the sky over it, softly, with no card under it, and goes as he walks
// away (or sits, or something else is written); the next time, the next sentence (memory.thoughts)
const THOUGHT_NEAR = 700, THOUGHT_KEEP = 1500, THOUGHT_SHOW = 9000;
const thought = reactive({ es: '', en: '', on: false });
const thoughtEl = ref(null);
let thinkKey = null, thinkAt = 0, thinkPlace = null, thinkIn = 0.5;
function think(dt) {
    thinkIn -= dt;
    if (thinkIn > 0) return;
    thinkIn = 0.25;
    // (never before the words that open the world have been read, nor on the first visit until its seed is planted)
    const waiting = firstVisit || [...told].some((w) => !memory.learned[`words_${w}`]);
    const near = portal.card == null && !waiting ? world.placeNear(state.x, state.d, THOUGHT_KEEP) : null;
    if (!near) { thinkKey = null; thought.on = false; return; }
    thinkPlace = near;
    const key = `${near.id}:${Math.round(near.x)}:${Math.round(near.d)}`, list = THOUGHTS[near.id];
    // (covered before it could be read, by words written on the card or by his sitting, it is written again later)
    if (thought.on && (ui.sitting || teaching.on)) {
        thought.on = false;
        if (performance.now() - thinkAt < THOUGHT_SHOW / 2) { thinkKey = null; memory.thoughts[near.id] = Math.max(0, (memory.thoughts[near.id] ?? 1) - 1); }
    }
    if (performance.now() - thinkAt > THOUGHT_SHOW) thought.on = false;
    if (key === thinkKey || !list || ui.sitting || teaching.on || near.dist > near.reach + THOUGHT_NEAR) return;
    thinkKey = key; thinkAt = performance.now();
    const n = memory.thoughts[near.id] ?? 0;
    Object.assign(thought, list[n % list.length], { on: true });
    memory.thoughts[near.id] = n + 1; saveMemory(memory);
}
// (over its place, in the sky, kept whole on the screen)
function placeThought() {
    const el = thoughtEl.value;
    if (!el || !thinkPlace) return;
    const half = Math.min(el.offsetWidth / 2, view.w / 2 - 16), x = Math.max(16 + half, Math.min(view.w - 16 - half, toScreen(thinkPlace.x, thinkPlace.d).x));
    const y = Math.max(84, horizon() * view.k * 0.42);
    el.style.transform = `translate(${(x - half).toFixed(1)}px, ${y.toFixed(1)}px)`;
}

// A meditation, for real, if one wants it: a long press on the seed (or M) opens a menu as an iPhone does with a long
// press (the seed sinks as it is held, pops with a tick of vibration, the world dims behind a veil and the menu grows
// out of the seed on a spring): 1, 3 and 5 minutes; one can slide the finger onto one and let go, or tap it. One of them
// sits him in lotus and a bowl sounds; he breathes slowly, BREATH_IN s in and BREATH_OUT s out; round the seed the time
// goes by as a line of light that closes; at the end the bowl again, and he stays sitting. Getting up ends it, with no
// bowl. While it lasts it is silence and the world lets him be (`ui.guide`): the music fades out (setHush), only a soft
// breath is heard, in and out with him (guideBreath in synth.js); nothing is planted or grows, the plants do not sing,
// no place's card opens and no rulito is born, the night keeps its secrets (no constellation, no star sent, no seed of
// light; a shooting star of the sky passes without a sound). It is offered once, wordless,
// to whoever sits a while without it (GUIDE_PEEK: the menu comes out of the seed for a moment), until one has been chosen
const BREATH_IN = 4, BREATH_OUT = 6, GUIDE_MINUTES = [1, 3, 5], GUIDE_PEEK = 25, LONG_PRESS = 450;
let pressTimer = 0, longPressed = false, peeked = false, peekTimer = 0;
const guideLeft = computed(() => (ui.guide ? Math.max(0, 1 - ui.guide.t / ui.guide.total) : 0));
function openChoose() { ui.choose = true; ui.peek = false; ui.hint = false; ui.press = false; ui.pop += 1; vibrate(10); }
function seedDown() {
    longPressed = false; ui.press = true; ui.hover = null;
    clearTimeout(pressTimer);
    pressTimer = setTimeout(() => { longPressed = true; openChoose(); }, LONG_PRESS);
}
// (still held after the menu opened: the finger slides over it, and letting go on a row chooses it)
function seedMove(e) {
    if (!ui.choose || !longPressed) return;
    const row = document.elementFromPoint(e.clientX, e.clientY)?.closest?.('[data-minutes]');
    const m = row ? Number(row.dataset.minutes) : null;
    if (m !== ui.hover && m) vibrate(4);
    ui.hover = m;
}
function seedUp(e) {
    clearTimeout(pressTimer); ui.press = false;
    // (only a finger lifted chooses: a cancelled touch never does)
    if (e?.type === 'pointerup' && ui.choose && longPressed && ui.hover) meditate(ui.hover);
    ui.hover = null;
}
function seedClick() {
    if (longPressed) { longPressed = false; return; }
    ui.choose = false;
    sit();
}
function meditate(minutes) {
    ui.choose = false; clearTimeout(peekTimer);
    learn('guided');
    if (!ui.sitting) sit(true, minutes);
    ui.guide = { minutes, total: minutes * 60, t: 0, started: false, breaths: 0 };
    setHush(true);
    visit?.guideChosen(minutes);
}
function endGuide(done) {
    if (!ui.guide) return;
    const g = ui.guide;
    if (g.started) visit?.guided(g.minutes, done, Math.round(g.t));
    if (done) play('bowl');
    ui.guide = null;
    setHush(false);
}
const breathAt = (t) => {
    const u = t % (BREATH_IN + BREATH_OUT), e = (k) => 0.5 - 0.5 * Math.cos(Math.PI * k);
    return u < BREATH_IN ? e(u / BREATH_IN) : 1 - e((u - BREATH_IN) / BREATH_OUT);
};

// The secrets of the night (nothing says they are there):
// - sitting in lotus by night a while (CONSTELLATION_AFTER s), now and then (CONSTELLATION_ODDS, at most once a visit)
//   the camera looks up to the sky (`state.look`: the horizon comes down, LOOK_HORIZON, and the sky fills much of the
//   screen over him) and, once it has, the stars come together into the constellation of the world he is in
//   (constellations.js: a figure of its card, in the colour of its rulito, with threads of dots, as the landing's sky
//   draws its icons), and it shines once whole; it goes, and the camera looks down again, when he gets up or the day comes;
// - sitting by night, now and then the sky sends a shooting star near (SHOOT_EVERY s, SHOOT_ODDS), and a near one
//   passing while he sits leaves a seed of light at his feet (STAR_SEED: of no card, it grows any card's plant, which
//   twinkles by night), once each time he sits
const CONSTELLATION_AFTER = 8, CONSTELLATION_ODDS = 0.5, SHOOT_EVERY = 18, SHOOT_ODDS = 0.45;
const LOOK_TIME = 2.6;          // (s the camera takes to look up, or down again)
let figureShown = false;        // (a constellation already seen on this visit)
// the figure of the card, in the sky over him, in the biggest stretch of sky nothing covers: by night the drawing's sky
// is all but clear, so whatever shows in it over the horizon (her tree's crown, a palm, the clouds, the moon) covers the
// stars; the world's canvas is read once, in cells (SKY_CELL px), and the biggest free square is taken (the nearest to
// him of the biggest), from under the header down to his head or the horizon. With no room for it anywhere
// (FIGURE_LEAST), it is over him all the same
const SKY_CELL = 10, FIGURE_LEAST = 110, FIGURE_MOST = 340;
function constellationFigure(card) {
    const strokes = CONSTELLATIONS[card] ?? CONSTELLATIONS[15];
    const top = 92, bottom = Math.min(horizon() * view.k, sidCrown.y) - 24;
    const fallback = () => {
        const size = Math.max(120, Math.min(bottom - top, view.w - 48, FIGURE_MOST));
        return place(strokes, Math.max(size / 2 + 20, Math.min(view.w - size / 2 - 20, sidOnScreen.x)), top + Math.max(0, bottom - top) / 2, size);
    };
    const free = freeSky(top, bottom);
    if (!free) return fallback();
    const { size, x, y } = free;
    const s = Math.min(size - SKY_CELL, FIGURE_MOST);
    return s >= FIGURE_LEAST ? place(strokes, x, y, s) : fallback();
}
function freeSky(top, bottom) {
    const el = canvas.value, d = view.dpr, cols = Math.floor((view.w - 32) / SKY_CELL), rows = Math.floor((bottom - top) / SKY_CELL);
    if (cols < 2 || rows < 2) return null;
    let px;
    try { px = el.getContext('2d').getImageData(Math.round(16 * d), Math.round(top * d), Math.round(cols * SKY_CELL * d), Math.round(rows * SKY_CELL * d)); } catch { return null; }
    const W = px.width, step = Math.max(1, Math.round(SKY_CELL * d / 3));
    // (the sky itself is drawn a little by dusk: only what is clearly more than it covers)
    const clear = Math.max(140, (1 - world.night()) * 255 + 50);
    const blocked = (r, c) => {
        const x0 = Math.round(c * SKY_CELL * d), y0 = Math.round(r * SKY_CELL * d), n = Math.round(SKY_CELL * d);
        for (let y = y0; y < y0 + n; y += step) for (let x = x0; x < x0 + n; x += step) if (px.data[((y * W) + x) * 4 + 3] > clear) return true;
        return false;
    };
    // the biggest free square: for each cell, how big a free square ends there (from the cells above and to its left)
    const dp = Array.from({ length: rows }, () => new Array(cols).fill(0));
    let best = null;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        if (blocked(r, c)) continue;
        dp[r][c] = r && c ? Math.min(dp[r - 1][c], dp[r][c - 1], dp[r - 1][c - 1]) + 1 : 1;
        const n = dp[r][c], x = 16 + (c + 1 - n / 2) * SKY_CELL, y = top + (r + 1 - n / 2) * SKY_CELL;
        const far = Math.abs(x - sidOnScreen.x);
        if (!best || n > best.n || (n === best.n && far < best.far)) best = { n, x, y, far };
    }
    return best && { size: best.n * SKY_CELL, x: best.x, y: best.y };
}
function place(strokes, cx, cy, size) {
    return strokes.map(({ points, closed }) => ({ closed, points: points.map(([x, y]) => [cx + x * size / 2, cy + y * size / 2]) }));
}
function nightSecrets(dt, seated) {
    const dark = world.night();
    const starry = seated && dark > 0.6 && portal.card == null && !ui.guide;
    const before = state.starT ?? 0;
    state.starT = starry ? before + dt : 0;
    // (once a sitting, a while into it: whether the sky shows its figure this time)
    if (starry && before <= CONSTELLATION_AFTER && state.starT > CONSTELLATION_AFTER && !figureShown && Math.random() < CONSTELLATION_ODDS) {
        figureShown = true; state.lookUp = true;
    }
    if (!starry || dark < 0.45) state.lookUp = false;
    state.look = Math.max(0, Math.min(1, (state.look ?? 0) + (state.lookUp ? dt : -dt) / LOOK_TIME));
    if (state.lookUp && !state.figure && state.look >= 1 && stars) {
        const card = world.placeCard(state.x, state.d) ?? world.zoneCard();
        stars.constellation(constellationFigure(card), { color: RULITO_COLOURS[card] ?? RULITO_COLOURS[15] });
        state.figure = setTimeout(() => { if (state.figure) play('star'); }, CONSTELLATION_TIME * 1000);
        if (!memory.learned.constellation) learn('constellation');
        visit?.secret('constellation', { card_id: card });
    }
    if (state.figure && !state.lookUp) { clearTimeout(state.figure); state.figure = null; stars?.constellation(null); }
    // (the sky answers his stillness with a shooting star near, now and then)
    if (starry && !state.starGiven) {
        state.shootT = (state.shootT ?? 0) + dt;
        if (state.shootT > SHOOT_EVERY) { state.shootT = 0; if (Math.random() < SHOOT_ODDS) stars?.shoot(true); }
    } else state.shootT = 0;
    if (!ui.sitting) state.starGiven = false;
}
// a near shooting star while he sits by night: a seed of light falls from it to his feet, and from there to the seed
function starFell() {
    if (!ui.sitting || ui.guide || state.starGiven || world.night() < 0.5 || portal.card != null) return;
    state.starGiven = true;
    state.planted = true;          // (it is not planted where it fell: it is kept, to be planted wherever he chooses)
    visit?.secret('star_seed');
    learn('starSeed');
    setTimeout(() => {
        if (gone || portal.card != null) return;
        const feet = toScreen(state.x, state.d - 60), from = { x: feet.x + (Math.random() - 0.5) * 240, y: Math.max(70, horizon() * view.k * 0.25) };
        fly(from, feet, STAR_LIGHT, () => { burstAt(feet, `rgb(${STAR_LIGHT.join(',')})`); addSeed(STAR_SEED, feet, STAR_LIGHT); }, 1500);
    }, 900);
}

// A seed flying, over the world, from where it lay into the button (picked up), or from the button to the ground in
// front of him (planted): the seed (seedShape.js) with its germ in the seed's light, along a soft arc (none with reduced
// motion); `burst`: landing, the seed opens in a little burst of particles of its light (everything started from a
// particle), and only then the plant sprouts
const labEl = ref(null), lotusEl = ref(null);
let pageTop = '';                                          // (the colour last given to the page's background)
const still = typeof window !== 'undefined' && (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
function fly(from, to, rgb, done, ms = 900, burst = false) {
    const root = labEl.value;
    if (!root || still) { done?.(); return; }
    const el = document.createElement('span'), colour = `rgb(${rgb.map(Math.round).join(',')})`;
    el.className = 'flyer';
    el.style.setProperty('--seed', colour);
    el.innerHTML = seedSvg({ fill: FILL, germ: colour, line: INK });
    root.appendChild(el);
    const lift = Math.min(180, 60 + Math.hypot(to.x - from.x, to.y - from.y) * 0.3);
    const mid = { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - lift };
    const t0 = performance.now();
    const step = (now) => {
        const u = Math.min(1, (now - t0) / ms), e = u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2, q = 1 - e;
        const x = q * q * from.x + 2 * q * e * mid.x + e * e * to.x, y = q * q * from.y + 2 * q * e * mid.y + e * e * to.y;
        el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%) scale(${1 + 0.35 * Math.sin(Math.PI * e) - 0.3 * e}) rotate(${e * 200}deg)`;
        el.style.opacity = String(Math.min(1, u * 8));
        if (u < 1) requestAnimationFrame(step); else { el.remove(); if (burst) burstAt(to, colour); done?.(); }
    };
    requestAnimationFrame(step);
}
function burstAt(at, colour) {
    const root = labEl.value;
    if (!root) return;
    for (let n = 0; n < 22; n++) {
        const dot = document.createElement('span'), a = Math.random() * Math.PI * 2, r = 30 + Math.random() * 70, size = 3 + Math.random() * 5;
        dot.className = 'mote';
        Object.assign(dot.style, { width: `${size}px`, height: `${size}px`, background: n % 3 ? colour : '#FFF8E2', left: `${at.x}px`, top: `${at.y}px` });
        root.appendChild(dot);
        const anim = dot.animate([
            { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
            { transform: `translate(calc(-50% + ${Math.cos(a) * r}px), calc(-50% + ${Math.sin(a) * r * 0.6 - 20}px)) scale(0.3)`, opacity: 0 },
        ], { duration: 700 + Math.random() * 500, easing: 'cubic-bezier(.2,.7,.3,1)' });
        anim.onfinish = () => dot.remove();
    }
}
// where a point of his world (x, depth, up over the floor) is on the screen, and the middle of the button
const toScreen = (x, d, up = 0) => ({ x: (view.w / view.k / 2 + (x - state.cam) * scaleAt(d)) * view.k, y: (groundAt(d) - up * scaleAt(d)) * view.k });
function buttonMiddle() {
    const r = lotusEl.value?.getBoundingClientRect();
    return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: view.w - 62, y: view.h - 86 };
}
// A seed he gets flies into the button, which counts it as it arrives (and, the first time, calls: sitting plants it).
// Seeds are found (a few on the ground, a spore of light caught on the wind: sidWorld.js) and, above all, won: the
// rulito born at a place (its card's game, or the place's own without WebGL) gives a seed of that card, which he can
// plant in another world
function addSeed(card, from, light) {
    memory.seeds.push(card); saveMemory(memory); play('pick');
    fly(from, buttonMiddle(), light ?? world.seedLight(card), () => {
        ui.seeds = memory.seeds.length; ui.seedPop += 1;
        if (seedWaiting) visit?.firstSeed('picked');
        seedWaiting = false;
        if (!firstSeedCalled && !memory.learned.planted) { firstSeedCalled = true; callButton(); tell('seed', 300); }
    });
}
const seedFound = ({ card, x, d, light, up = 90 }) => addSeed(card, toScreen(x, d, up), light);
// the card's name in the world (sidWorld.js PLACES) of each place's card id
const PLACE_SEED = { 15: 'ciclos', 8: 'metta', 9: 'upekkha', 14: 'celebracion', 27: 'paciencia', 24: 'gratitud', 32: 'transformacion' };
function winSeed(id) {
    const card = PLACE_SEED[id];
    if (card && !gone) addSeed(card, { x: sidOnScreen.x, y: sidOnScreen.y - 60 });
}
const canvas = ref(null);
const nightSky = ref(null), starCanvas = ref(null);   // the cards' starry night, behind the drawing (useStarField.js)
let stars = null;
// Sitting in lotus at a zone's special place (under the crown of her tree, by the two embracing, the pond, the
// the fire), after a moment (RULITO_AFTER) the rulito is born over his head, as in the cards (Rulito.vue, in
// the red of Ciclos's), and stays while he sits; when he gets up its tail catches up with it. Once it is whole the
// affirmation of that place's card is written in the sky, by hand (teaching), and goes when he gets up
const rulito = ref(null);
const RULITO_AFTER = 3, RULITO_GROW = 2.2, RULITO_GO = 3.4;
const teaching = reactive({ es: '', en: '', on: false, story: false, light: false, ink: CICLOS.ink });
// the rulito is born in the colour its card gives it (as in the card's own scene)
const RULITO_COLOURS = { 15: '#fc747c', 8: '#f595b6', 9: '#b3539a', 14: '#ffe285', 27: '#f37b85', 24: '#fff6c2', 32: '#f5d35a' };
const rulitoColour = ref(RULITO_COLOURS[15]);
const hexRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(',');
// A door to the card, at every place (her tree, Metta's nest, Upekkha's pond, Celebración's fire, Paciencia's boat,
// Gratitud's house, Transformación's seed): sitting in lotus at its place, after PORTAL_AFTER s (230 ms, once his
// legs are crossed) the world zooms in on him at his place (`zoom`, the world's canvases scaled about him) while it
// gives way to the card itself, as its page shows it (CardTemplate.vue: its scene and, below, its reading), over the world (the
// lab stays where it was, paused, under it). Its game is played there as on the card's page; nothing takes him back by
// itself (the reading is there to be read): the labyrinth in the header's corner (`hasWorld`, where a card's page has
// the deck) or Escape goes back into the world, where he is still sitting, and if its rulito was born (the scene's
// `rulito` event) it comes back with him, whole, over his head, with the card's affirmation. Without WebGL the scene
// would be flat (no game), so there the place keeps its own rulito.
const PORTALS = new Set([15, 8, 9, 14, 27, 24, 32]);
const PORTAL_AFTER = 0.23, PORTAL_FADE = 900, PORTAL_ZOOM = 2.6;
const portal = reactive({ card: null, won: false });
// where he is on the screen (in CSS px, drawn each frame) and the zoom of the world's canvases towards it
const sidOnScreen = { x: 0, y: 0 }, sidCrown = { x: 0, y: 0 };
const zoom = reactive({ on: false, x: 0, y: 0 });
const zoomStyle = computed(() => ({
    transformOrigin: `${zoom.x}px ${zoom.y}px`,
    transform: zoom.on ? `scale(${PORTAL_ZOOM})` : 'none',
    transition: `transform ${zoom.on ? PORTAL_FADE : 1400}ms ${zoom.on ? 'cubic-bezier(0.55, 0, 0.75, 0.2)' : 'ease-out'}`,
}));
const webgl = hasWebGL();
let portalTimer = 0;
// The visit, told to the analytics (startWorldVisit in analytics.js): started when the world is mounted
let visit = null;
function openPortal(card) {
    portal.card = card; portal.won = false;
    visit?.meditated(card); visit?.cardOpened(card);
    Object.assign(zoom, { on: true, x: sidOnScreen.x, y: sidOnScreen.y });
    release(); state.target = null; state.guide = null;
    document.body.classList.add('lab-portal');
    window.scrollTo(0, 0);
    // (once the card's colour covers the world, the world stops drawing)
    portalTimer = setTimeout(() => { if (portal.card === card) paused = true; }, PORTAL_FADE);
}
function portalWon() { portal.won = true; }
function closePortal() {
    if (portal.card == null) return;
    const card = portal.card, won = portal.won;
    visit?.cardClosed(won);
    if (won) visit?.rulito(card, 'card');
    clearTimeout(portalTimer);
    paused = false; last = 0;
    state.portalDone = true;      // (not again until he gets up)
    document.body.classList.remove('lab-portal');
    window.scrollTo(0, 0);
    zoom.on = false;            // (the world comes back out as the card fades)
    if (won) {
        // the rulito he won comes back with him, whole, and the card's affirmation is written over the world
        state.rul = { age: RULITO_GROW, head: 1, tail: 0, pop: 1, full: true, card };
        rulitoColour.value = RULITO_COLOURS[card] ?? RULITO_COLOURS[15];
        rulito.value?.reshape();
        const c = getCard(card);
        if (c) Object.assign(teaching, { es: c.affirmation_es.trim(), en: c.affirmation_en.trim(), on: true, story: false });
        // (and its seed, once the world is back round him)
        setTimeout(() => winSeed(card), 1600);
    }
    portal.card = null;
}

// --- The rig, in px of the source drawing (258 x 686): he faces +x (his eyes are on that side) ---
const PIVOT = { x: 130, y: 518 };             // the middle of his bottom, where his hips are: the body bends about it
const TALL = 512;                             // from his bottom to the top of his head
let INK = CICLOS.ink;                            // his line and his white: those of the zone he is in (sidWorld.js)
// His proportions as Nekkhamma's Sid standing (the drawing he is cut from): head 306 px of the source (to the pinch of
// his waist), torso 181, legs 187 from his body to the floor: his legs as long as his torso, about 0.6 of his head
// (Viriya's walker has them a little longer, 0.8). Limbs as thick as his outline.
const SMALL = 0.48;                            // (seen from further away, as from a high camera: the world big round him)
const LEG = { thigh: 97, shin: 97, foot: 40, width: 16 };
const ARM = { upper: 116, fore: 110, width: 13.5 };        // long, as in Upekkha (they reach his crossed legs)
// his legs crossed in lotus, as in Upekkha and Ciclos: the knees well out past his body, a little up off the floor,
// each foot under the other knee, the two shins crossing in front of him
const LOTUS = { knee: 132, kneeUp: 26, under: 70, hands: 15, open: 1.38, low: 16 };   // (hands: how far apart in his lap, low: how far under his pelvis they show; open: how far his elbows open)
const STAND = 196;                            // his hips over the ground, standing: his legs all but straight
const SIT = 48;                               // his hips over the ground, sitting with his legs crossed: his bottom on the floor
// In profile his hips are together in his middle (one leg behind the other), his arms come from the middle of him
// too, the near one hanging over his belly and the far one behind him (unseen until it swings out); turned to us, his
// hips, shoulders and hands are at each side of him (FRONT_ below). Which is near and which far is as when one really
// turns: facing us, to walk the way his face is (+u), he turns so that the side away from it comes to the front, so
// turned to us his near arm and leg are on the side away from the way he faces
const HIP = { far: { u: 134, v: 516 }, near: { u: 126, v: 515 } };
const FRONT_HIP = { far: { u: 157, v: 514 }, near: { u: 103, v: 516 } };
const SHOULDER = { far: { u: 100, v: 334 }, near: { u: 110, v: 334 } };   // towards his back, by the hatching
const REST_HAND = { far: { u: 94, v: 538 }, near: { u: 118, v: 538 } };   // (low: his arms hang loose, all but straight)
// (seen three quarters on, his hips, shoulders and hands are already well apart: they open out quickly as he turns
// from his profile, so his legs do not cross like scissors and his arms are not drawn over his belly)
const spread = (front) => Math.sqrt(Math.max(0, front));
// Turned to us his near side is the one away from where he faces; with his back to us it is the one on that side (as
// when one really turns: walking away three quarters on, the arm nearer us is on the side he goes to). `lateral()` is
// 1 facing us, -1 with his back to us (soft through his profile, where it does not show), and `side(u)` puts a point
// of the FRONT_ poses on its side
const lateral = () => Math.max(-1, Math.min(1, -Math.sin(state.heading) * 4));
const side = (u) => PIVOT.x + (u - PIVOT.x) * lateral();
const hipsOf = (f) => ['far', 'near'].map((s) => ({ u: mix(HIP[s].u, side(FRONT_HIP[s].u), spread(f.front)), v: mix(HIP[s].v, FRONT_HIP[s].v, f.front) }));
const EYES = rig.eyes;
// Turned to us: his eyes in the middle of his face, a shoulder at each side of the pinch of his waist and his hands
// hanging at each side of his belly
const FRONT_EYES = [[PIVOT.x - 17, 211, rig.eyes[0][2]], [PIVOT.x + 17, 211, rig.eyes[1][2]]];
const FRONT_SHOULDER = { far: { u: PIVOT.x + 48, v: 322 }, near: { u: PIVOT.x - 48, v: 322 } };
const FRONT_HAND = { far: { u: PIVOT.x + 132, v: 508 }, near: { u: PIVOT.x - 132, v: 508 } };   // a little away from his sides
const mix = (a, b, t) => a + (b - a) * t;
const JUMP = { crouch: 0.34, speed: 560, gravity: 1700 };
// (a cycle of his walk is about 390 px of his world: an easy pace is about two steps a second, as a short-legged
// little one walks, and the trot nearly three)
const PACE = 420, TROT = 680;                 // his easy pace and a trot (world px a second)
const STILLNESS = 0.05;                       // the world's pace while he meditates

// The world round him (sidWorld.js): endless, in ink, taking its colour as he goes
const picture = (src) => (typeof Image !== 'undefined' ? Object.assign(new Image(), { src }) : null);
// What the world remembers on this phone (worldMemory.js): the visits, the seeds he carries and what he has planted.
// A seed he walks over is picked up (counted on the seed button); sitting in lotus away from the places, after a moment
// (PLANT_AFTER) he plants the first he found in front of him, one each time he sits: it does not go straight there. It
// flies out of the button to his heart (fly(), SOW.fly), goes down through him as a light only (SOW.through), on under
// the ground to where it is planted, a glow under the earth (SOW.under; drawSowing), and is born out of the ground
// there with its burst (burstAt, world.plant). What he planted grows a step each time he comes back to it (onGrow)
const memory = loadMemory();
memory.visits += 1;
saveMemory(memory);
refreshStory();
ui.seeds = memory.seeds.length;
// The very first visit teaches the world's one thing, in order: the words that open it, then a seed lying near him that
// calls (rings of light on the ground; the button does not call meanwhile), then, picked up, the words of the seed and
// the button calling (sitting plants it). Until it is planted the places do not think aloud and the marks of the story
// stay hidden, so nothing comes before (`firstVisit`; the seed: firstSeed in sidWorld.js)
let firstVisit = memory.visits === 1 && !memory.learned.planted && !memory.seeds.length && !memory.planted.length;
let seedWaiting = firstVisit;
const FIRST_SEED = { x: 1420, d: -40 };     // (he starts at x 1000: a little ahead of him, nearer the front)
const PLANT_AFTER = 1.5;
const SOW = { fly: 0.9, through: 1.3, under: 0.8 };    // (seconds of each part of its way)
const world = createWorld({
    clouds: picture('/assets/ciclos/clouds.webp'), moon: picture('/assets/ciclos/moon.webp'),
    planted: memory.planted, visit: memory.visits,
    onSeed: (seed) => { visit?.seedPicked(); seedFound(seed); },
    // the marks of the story (story.js), while there is a fragment to read: found, the next one is written
    marks: { found: memory.marks, open: () => !firstVisit && memory.marks.length < FRAGMENTS.length },
    firstSeed: firstVisit ? FIRST_SEED : null,
    // (each mark gives a fragment still hidden, at random: the story is found out of order)
    onMark: () => {
        const left = FRAGMENTS.map((f, i) => i).filter((i) => !memory.fragments.includes(i));
        const i = left[Math.floor(Math.random() * left.length)];
        if (i == null) return;
        memory.fragments.push(i); saveMemory(memory); readFragment(i);
        visit?.fragment(memory.fragments.length);
    },
    onGrow: () => { saveMemory(memory); play('star'); },
    onSing: (p) => sing(p),
});
// The garden sings (as in Proteus): each plant his note, of its own card's chord, moved to the nearest that fits if it
// clashes with the world where it grows (gardenNote in synth.js); it sings as he passes near it (sidWorld.js) and, while
// he meditates among his plants (GARDEN.reach), they sing in turn from left to right, slowly, a rest after each round,
// each swaying as it sings
const GARDEN = { reach: 900, first: 2.6, step: 0.75, rest: 1.5 };
function sing(p, level = 1) {
    if (ui.guide) return;                           // (a meditation is silence)
    const midi = gardenNote(chordFor(world.cardIdOf(p.card)), chordFor(world.zoneCard()), p.pick, p.grown);
    play('garden', { midi, level });
}
// The floor goes back into the distance: his depth d (0 in front .. DEPTH at the back) lifts his feet towards the
// horizon and makes him smaller, towards the middle of the screen (a vanishing point)
// (deep: the camera is high and far, so most of the screen is floor and little is sky; a depth unit is still about
// 0.6 of a px of his world on the screen, as wide as it is deep seen from above at a slant)
const DEPTH = 2200;
const FAR = 0.5;                              // his size at the back (little smaller: the camera is high, as in a top-down game)
// (d - state.camD: the camera follows him into the distance too, so what is measured is from where it looks)
const scaleAt = (d) => 1 - (1 - FAR) * (d - state.camD) / DEPTH;


// --- The walk, as The Animator's Survival Kit draws a walk: pose by pose, each leg on its own ---
// One leg through a whole cycle (two steps), in eight poses from its contact in front: [thigh, knee, foot], in degrees
// (thigh from straight down, + forward; knee bent, + the shin going back; foot from flat, + toes up). The other leg
// does the same half a cycle later. In between, the poses flow smoothly (a curve through them, frame by frame).
const WALK = [
    [26, 3, 20],      // 1 contact, in front: straight, the heel down and the toes up
    [17, 20, 0],      // 2 down: the knee takes his weight, the foot flat
    [2, 7, 0],        // 3 passing: under him, all but straight
    [-14, 2, -3],     // 4 up: behind him, straight, pushing (the heel about to rise)
    [-23, 9, -30],    // 5 contact, behind: on its toes, the heel up
    [-15, 52, -55],   // 6 down: off the ground, the foot up behind him
    [11, 74, -40],    // 7 passing: the knee forward and up, the foot hanging under him
    [30, 26, 6],      // 8 up: reaching forward, the foot low, the toes coming up
];
const DEG = Math.PI / 180;
// the pose of a leg at q (0..1 of its cycle), `k` of the way from standing to walking, a trot's poses wider (amp)
function walkPose(q, k = 1, amp = 1) {
    const x = (((q % 1) + 1) % 1) * WALK.length, i = Math.floor(x), t = x - i, n = WALK.length;
    const P = [WALK[(i + n - 1) % n], WALK[i], WALK[(i + 1) % n], WALK[(i + 2) % n]];
    return [0, 1, 2].map((j) => {
        const [a, b, c, d] = P.map((pose) => pose[j]);
        const v = 0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (3 * b - a - 3 * c + d) * t * t * t);
        return v * k * (j === 1 ? 1 + (amp - 1) * 0.6 : amp);
    });
}
// A leg in that pose, from its hip: along the way he goes (a) and up (u), in px of his drawing: its knee, its ankle,
// its heel and the tip of its toes on the ground (the points it stands on), and its toes as they are drawn
function legShape([thigh, knee, foot]) {
    const T = thigh * DEG, S = (thigh - knee) * DEG, F = foot * DEG;
    const kn = { a: LEG.thigh * Math.sin(T), u: -LEG.thigh * Math.cos(T) };
    const an = { a: kn.a + LEG.shin * Math.sin(S), u: kn.u - LEG.shin * Math.cos(S) };
    const reach = LEG.foot * Math.cos(F), rise = LEG.foot * Math.sin(F);
    return { knee: kn, ankle: an, heel: { a: an.a, u: an.u - 6 }, tip: { a: an.a + reach, u: an.u - 6 + rise }, toe: { a: an.a + reach, u: an.u - 2 + rise } };
}
// which of its points a leg stands on (the lower: the heel, or the toes once the heel is up) and how high its hip is
const standsOn = (L) => (L.tip.u < L.heel.u - 0.3 ? 'tip' : 'heel');
const lowest = (L) => Math.min(L.heel.u, L.tip.u);
// both legs at the phase p of the cycle (the far leg's contact in front at 0, the near one's at 0.5)
const gaitLegs = (p, k, amp) => [0, 1].map((i) => legShape(walkPose(p + i * 0.5, k, amp)));
// How far he goes in a cycle, walking (worked out once per width of step): the foot on the ground goes back under
// him and he goes forward exactly as much, so a foot down never slides
const cycleLengths = new Map();
function cycleLength(amp) {
    const key = Math.round(amp * 50) / 50;
    if (!cycleLengths.has(key)) {
        let total = 0, prev = gaitLegs(0, 1, key);
        for (let n = 1; n <= 400; n++) {
            const p = n / 400, now = gaitLegs(p, 1, key), g = ((p - 1 / 800) % 1) < 0.5 ? 0 : 1, on = standsOn(now[g]);
            total += Math.max(0, prev[g][on].a - now[g][on].a);
            prev = now;
        }
        cycleLengths.set(key, total);
    }
    return cycleLengths.get(key);
}

// --- Springs: a value that follows its target with some give (soft, it overshoots a little) ---
function spring(x, stiff = 120, damp = 14) { return { x, v: 0, to: x, stiff, damp }; }
function step(s, dt) { s.v += ((s.to - s.x) * s.stiff - s.v * s.damp) * dt; s.x += s.v * dt; }
const springs = {
    lean: spring(0, 90, 9),        // the bend of his body, a fraction of his height at the top of his head
    sy: spring(1, 160, 9),         // squash and stretch (his width goes the other way, his volume stays)
    rot: spring(0, 120, 14),       // a turn of all of him about his hips
    face: spring(1, 260, 26),      // 1 facing right, -1 left (set from his heading, below)
    drop: spring(0, 140, 16),      // how far his hips are lowered (crouch, sit)
    closed: spring(0, 60, 14),     // his eyes closed (meditating, stretching)
    lookX: spring(0, 60, 12), lookY: spring(0, 60, 12),
    walk: spring(0, 55, 14),       // how much he is walking (0..1): his legs get going (and settle) within a step
    reach: spring(0, 40, 11),      // how much his near hand goes to what he reaches for
    front: spring(1, 45, 12),      // turned to us or away 1, in profile 0, three quarters between (from his heading)
    back: spring(0, 40, 12),       // his back to us (walking away into the distance) 1 (from his heading)
};
const hands = {                    // where his hands go, in his own px (they follow his body), or in the world
    far: { u: spring(REST_HAND.far.u, 70, 12), v: spring(REST_HAND.far.v, 70, 12) },
    near: { u: spring(REST_HAND.near.u, 70, 12), v: spring(REST_HAND.near.v, 70, 12) },
};

const state = {
    x: 0, ground: 0,               // his hips over the ground, in world px (= px of the source, scaled k to the screen)
    d: 0,                          // how far back on the floor he is (the floor is endless both ways)
    // where he faces on the floor, an angle: 0 to the right, PI to the left, -PI/2 towards us, PI/2 into the distance.
    // It turns smoothly (never jumps), and how he is drawn follows it: in profile, three quarters, from the front or
    // from behind
    heading: -Math.PI / 2,
    held: 0,                       // how long the keys have been held (held a while, he breaks into a trot)
    cam: 0, camD: 0,               // where the camera looks: across and into the distance (it follows him, the world has no end)
    pace: 1,                       // how fast the world's time goes (all but still while he meditates)
    shift: 0,                      // his body over the foot he stands on (seen from the front, his weight going side to side)
    ring: 0, ringCard: 15, placeCall: 0.5,   // the ring of light under his feet at a place (0..1), its card, and the button's next call there
    gait: null,                    // walking: his legs in their poses this frame ({ legs, hd }), and how much he is lowered
    gaitDrop: 0,
    keys: { left: false, right: false, up: false, down: false },
    lift: 0, vy: 0, air: false,    // a jump
    target: null, speed: 0, phase: 0, run: 0, turning: 0, turnWay: 0,
    guide: null,                   // a finger held down, guiding him ({ id, screen, t })
    mark: null,                    // where he was sent, on the floor ({ x, d, t }): a ring of dots there, fading
    action: null,                  // { name, t, dur, ... }
    breath: 0, blink: 0, nextBlink: 2,
    pointer: null, pointerAt: 0,   // the pointer on the screen (px / k)
    glance: null, nextGlance: 3,
    feet: [null, null],            // his feet on the floor: { x, d, y } (y: lifted), each at its own depth
    steps: [null, null], toes: [0, 0], legTuck: [0, 0],
    legSit: [0, 0], sitT: 9, rising: false, settled: true,
    plantT: 0, planted: false,                               // seconds sitting away from the places, and whether he planted this time
    sowing: null,                                            // the seed on its way to where it is born: { t, x, d, light }
    tending: null,                                           // the plant of his he sits by, if any (it grows or dances)
    roundT: 0, roundI: 0,                                    // meditating among his plants: when the next sings, and which
    underTree: 0, rul: null, portalDone: false,                                 // seconds sitting under the tree, the rulito born there      // sitting down in lotus and getting up, leg by leg
    reach: null,                   // a world point his near hand goes to
    reached: null,                 // the last one (his hand comes back from it)
};

// --- His body as he is now: a point of the drawing (u, v) -> the world ---
function frame() {
    const breath = state.breath;
    const front = Math.max(0, Math.min(1, springs.front.x));
    return {
        front,
        root: { x: state.x + state.shift, y: state.ground - STAND + springs.drop.x + state.gaitDrop - state.lift },
        rot: springs.rot.x, face: Math.sign(springs.face.x || 1),     // (he turns through the front: never thin)
        sy: springs.sy.x, sx: 1 / Math.sqrt(Math.max(0.5, springs.sy.x)), lean: springs.lean.x, breath,
    };
}
// How his body is bent at a height t (0 his bottom .. 1 the top of his head): the sideways shift and the width
const bendAt = (f, t) => f.lean * TALL * t * t;
const widthAt = (f, t) => f.sx * (1 + f.breath * 0.045 * Math.exp(-(((t - 0.24) / 0.16) ** 2)) + f.breath * 0.012 * Math.exp(-(((t - 0.75) / 0.2) ** 2)));
function local(f, u, v) {
    const t = Math.max(0, (PIVOT.y - v) / TALL);
    return { x: (u - PIVOT.x) * widthAt(f, t) + bendAt(f, t), y: -(PIVOT.y - v) * f.sy };
}
function toWorld(f, p) {
    const c = Math.cos(f.rot), s = Math.sin(f.rot), x = p.x * f.face;
    return { x: f.root.x + x * c - p.y * s, y: f.root.y + x * s + p.y * c };
}
const map = (f, u, v) => toWorld(f, local(f, u, v));

// Two bones from a to a target: where the joint goes, bending towards `toward` (a direction)
function bend(a, target, l1, l2, toward) {
    let dx = target.x - a.x, dy = target.y - a.y;
    const d = Math.min(Math.hypot(dx, dy), (l1 + l2) * 0.999), angle = Math.atan2(dy, dx);
    const end = { x: a.x + Math.cos(angle) * d, y: a.y + Math.sin(angle) * d };
    const open = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * Math.max(d, 1e-3)))));
    const joints = [angle + open, angle - open].map((g) => ({ x: a.x + Math.cos(g) * l1, y: a.y + Math.sin(g) * l1 }));
    const mid = { x: (a.x + end.x) / 2, y: (a.y + end.y) / 2 };
    const score = (j) => (j.x - mid.x) * toward.x + (j.y - mid.y) * toward.y;
    return { joint: score(joints[0]) >= score(joints[1]) ? joints[0] : joints[1], end };
}

// --- Turning, and the way round what stands in his way ---
// How much of his pace he keeps while he turns, by how far he still has to turn: he never stops to turn, he walks it
// in a tight curve (slowing a little for a sharp one, never below a third), so going the other way is one swing round
const turnPace = (off) => Math.max(0.35, Math.cos(Math.min(Math.PI / 2, off * 0.75)));
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
// Turns his heading towards an angle, by at most `most`; turning right round he turns through facing us (as one does,
// and his face shows on the way)
function turnTo(aim, most) {
    let diff = wrap(aim - state.heading);
    if (Math.abs(diff) > Math.PI * 0.85) {
        const other = diff - Math.sign(diff) * Math.PI * 2, toUs = wrap(-Math.PI / 2 - state.heading);
        const through = (dk) => Math.sign(toUs) === Math.sign(dk) && Math.abs(toUs) <= Math.abs(dk);
        // (the way is chosen as the turn starts and kept until it is done: chosen again on the way, facing us it would
        // flip every frame and never turn)
        if (!state.turnWay) state.turnWay = !through(diff) && through(other) ? Math.sign(other) : Math.sign(diff);
        if (Math.sign(diff) !== state.turnWay) diff = other;
    } else state.turnWay = 0;
    state.heading = wrap(state.heading + Math.max(-most, Math.min(most, diff)));
}
// What stands in the way (her tree's trunk and roots, the big stones): ellipses on the floor, { x, d, r, rd } (rd its
// reach in depth, r if it has none). Each is worked in its own space, stretched in depth so it is a circle of radius r
const blocking = () => world.obstacles(state.x, state.d, 900);
const squash = (o) => o.r / (o.rd ?? o.r);
// Going towards (mx, mz), he bends his way round what is ahead of him, by the side nearer where he is going: round the
// nearest thing ahead only (what is in his way can be made of many, as the pond's water), and not round what is
// beyond where he is going (a touch by the water's edge: he walks to it)
function steer(mx, mz) {
    const goal = state.target ? Math.hypot(state.target.x - state.x, state.target.d - state.d) : Infinity;
    let best = null;
    for (const o of blocking()) {
        if (o.low && inside(o, state)) continue;                         // (on the roots: he walks on them)
        const q = squash(o), rx = state.x - o.x, rz = (state.d - o.d) * q, dist = Math.hypot(rx, rz) || 1, R = o.r + 26;
        if (dist > R + 130 || dist - o.r > goal) continue;
        if (-(mx * rx + mz * q * rz) / dist <= 0) continue;              // (moving away from it)
        if (!best || dist - R < best.gap) best = { q, rx, rz, dist, R, gap: dist - R };
    }
    if (!best) return [mx, mz];
    const { q, rx, rz, dist, R } = best;
    let mzq = mz * q;
    const a = { x: -rz / dist, z: rx / dist }, b = { x: rz / dist, z: -rx / dist };
    const t = a.x * mx + a.z * mzq >= b.x * mx + b.z * mzq ? a : b;
    const kk = Math.max(0, Math.min(1, 1 - (dist - R) / 130));
    mx = mx * (1 - kk) + t.x * kk; mzq = mzq * (1 - kk) + t.z * kk;
    mz = mzq / q;
    const l = Math.hypot(mx, mz) || 1;
    return [mx / l, mz / l];
}
// and never walks into it (with the keys he slides along it). What is low (her tree's roots) can be jumped onto: in the
// air he goes over its edge, and once on it he walks on it and steps off where he likes; walking, it stops him
const inside = (o, p) => Math.hypot(p.x - o.x, (p.d - o.d) * squash(o)) < o.r;
function collide(from = null) {
    for (const o of blocking()) {
        if (o.low && (state.air || (from && inside(o, from)))) continue;
        const q = squash(o), rx = state.x - o.x, rz = (state.d - o.d) * q, dist = Math.hypot(rx, rz) || 1;
        if (dist < o.r) { state.x = o.x + rx / dist * o.r; state.d = o.d + rz / dist * o.r / q; }
    }
}

// --- What he does ---
const act = (name, dur, extra = {}) => { state.action = { name, t: 0, dur, ...extra }; };
function walkTo(x, d = state.d) {
    // (a touch on something that stands in the way: he walks to its edge, on the side the touch was)
    // (the nearest place out of it, looking all round, and of those as near, the one on his side: what is in his way
    // can be made of many, as the pond's water)
    const blocked = (px, pd) => world.obstacles(px, pd, 0).some((o) => Math.hypot(px - o.x, (pd - o.d) * squash(o)) < o.r + 12);
    if (blocked(x, d)) {
        // (from the first ring with a way out to 150 beyond it: the one nearest him)
        let first = null, best = null;
        for (let far = 20; far < 1600 && (first === null || far <= first + 150); far += 20) {
            for (let n = 0; n < 24; n++) {
                const a = n / 24 * Math.PI * 2, px = x + Math.cos(a) * far, pd = d + Math.sin(a) * far;
                if (blocked(px, pd)) continue;
                first ??= far;
                const him = Math.hypot(px - state.x, pd - state.d);
                if (!best || him < best.him) best = { px, pd, him };
            }
        }
        // (and back towards the touch, to the edge)
        if (best) {
            const len = Math.hypot(x - best.px, d - best.pd), ux = (x - best.px) / len, ud = (d - best.pd) / len;
            let t = 0;
            while (t + 10 < len && !blocked(best.px + ux * (t + 10), best.pd + ud * (t + 10))) t += 10;
            x = best.px + ux * t; d = best.pd + ud * t;
        }
    }
    // (sitting, he gets up first and only then sets off: the place is kept for when he is on his feet)
    if (ui.sitting) sit(false);
    state.target = { x, d }; state.reach = null;
}
function wave() { if (!ui.sitting) act('wave', 2.6, { arm: 'near' }); }
function jump() { if (!ui.sitting && !state.air) { state.jumped = false; act('jump', 1.7); } }
function sit(on = !ui.sitting, minutes = null) {
    if (on === ui.sitting) return;
    if (on) { satThisVisit = true; clearTimeout(hintTimer); learn('sat'); }
    ui.hint = false;
    // getting up is its own little movement while his legs are still crossed
    state.rising = !on && Math.max(...state.legSit) > 0.1;
    // (where: the card of the place he sits at, or none; whether by night; and the meditation chosen, if one was)
    if (on) visit?.sat({ place: world.placeCard(state.x, state.d) ?? null, zone: world.zoneCard(), night: world.night() > 0.5, minutes });
    if (!on) endGuide(false);
    ui.sitting = on; state.sitT = 0; state.settled = false; state.target = null; state.action = null;
}

// Where a point of the screen is in his own world, at his depth (his world is scaled about the vanishing point)
const groundAt = (d) => state.ground - (d - state.camD) / DEPTH * view.floor;
const horizon = () => state.ground - view.floor;
// What he planted under a touch on the screen (the nearest to us, if two overlap)
function plantAt(screen) {
    let best = null;
    for (const p of world.plantsNear(state.cam, state.camD + DEPTH / 2, 3000)) {
        const s = scaleAt(p.d), x = view.w / view.k / 2 + (p.x - state.cam) * s, y = groundAt(p.d);
        if (Math.abs(screen.x - x) < Math.max(36, p.w * s / 2) && screen.y < y + 14 && screen.y > y - Math.max(50, p.h * s) && (!best || p.d < best.d)) best = p;
    }
    return best;
}
function toSid(p, d = state.d) {
    const s = scaleAt(d), x0 = view.w / view.k / 2;
    return { x: state.cam + (p.x - x0) / s, y: state.ground + (p.y - groundAt(d)) / s };
}

const view = { w: 1, h: 1, k: 1, dpr: 1, floor: 1 };
let raf = 0, last = 0, paused = false;

function resize() {
    const el = canvas.value;
    view.dpr = Math.min(window.devicePixelRatio || 1, 2);
    view.w = el.clientWidth; view.h = el.clientHeight;
    el.width = view.w * view.dpr; el.height = view.h * view.dpr;
    // He is about half the height of the screen
    // (SMALL: he is a little smaller than at first, so the world, and her tree, are big round him)
    view.k = SMALL * Math.min((ui.touch ? view.h * 0.55 : view.h * 0.62) / (TALL + STAND), view.w * 0.9 / 420);
    const was = state.ground;
    state.ground = (ui.touch ? view.h * 0.84 : view.h * 0.86) / view.k;
    view.horizon0 = ui.touch ? 0.2 : 0.24;     // where the horizon is on the screen (high: little sky), and looking up
    lookAt();
    if (!was) { state.x = 1000; state.cam = state.x; state.camD = -follow(); }     // (he starts a little before her tree, which is ahead on his way)
    // the starry night fills the sky, down to the horizon
    skyHeight();
}
// How far in front of him the camera stands (in depth): it keeps him a little below the middle of the screen. The starry night behind the drawing goes down to the horizon, which stays
// where it is on the screen as the camera follows him
const follow = () => DEPTH * 0.35;
// (the floor, from its front to the horizon: shorter as the camera looks up to the sky, state.look, so the horizon comes
// down the screen towards him and the sky fills more of it)
const LOOK_HORIZON = { touch: 0.6, wide: 0.52 };
function lookAt() {
    const e = state.look ?? 0, k = e * e * (3 - 2 * e);
    const at = view.horizon0 + ((ui.touch ? LOOK_HORIZON.touch : LOOK_HORIZON.wide) - view.horizon0) * k;
    view.floor = (state.ground * view.k - view.h * at) / view.k;
}
// (the starry night is as tall as the sky can be, looking up: the ground drawn over it hides what is under the horizon,
// and its stars are not made again as the camera moves)
function skyHeight() {
    if (nightSky.value) nightSky.value.style.height = `${Math.ceil(view.h * (ui.touch ? LOOK_HORIZON.touch : LOOK_HORIZON.wide)) + 2}px`;
}

function pointerTo(e) {
    const r = canvas.value.getBoundingClientRect();
    return { x: (e.clientX - r.left) / view.k, y: (e.clientY - r.top) / view.k };
}
// Where a touch sends him: on the floor, to that place (in depth too); in the air, that way, where he is in depth
function placeOf(screen) {
    if (screen.y > horizon() + 10) {
        const d = state.camD + (state.ground - screen.y) / view.floor * DEPTH;
        return { x: toSid(screen, d).x, d };
    }
    return { x: toSid(screen).x, d: state.d };
}
// A finger held down guides him: he goes on walking towards it as it moves (and as the world moves under it), and
// held far from him a while, he trots. Let go, he walks on to where it was. (On a phone this is how he walks: no pad)
function guideTo(screen) {
    const p = placeOf(screen);
    if (Math.hypot(p.x - state.x, p.d - state.d) > 40) walkTo(p.x, p.d);     // (under his feet he just stands)
    state.mark = { x: state.target?.x ?? p.x, d: state.target?.d ?? p.d, t: state.mark?.t ?? 0 };
}
function onMove(e) {
    state.pointer = pointerTo(e); state.pointerAt = performance.now();
    if (state.guide && e.pointerId === state.guide.id) state.guide.screen = state.pointer;
}
function onUp(e) {
    if (!state.guide || e.pointerId !== state.guide.id) return;
    state.guide = null;
    if (state.mark) state.mark.t = 0;          // (and its ring fades from now)
}
function onDown(e) {
    ui.choose = false;
    lastInput = e.pointerType === 'touch' ? 'touch' : 'pointer';
    const screen = pointerTo(e);
    state.pointer = screen; state.pointerAt = performance.now();
    // On him: he does not walk (it would be to a point just behind him); he greets us
    const me = toSid(screen), top = frame().root.y - TALL * springs.sy.x;
    if (Math.abs(me.x - state.x) < 120 && me.y > top && me.y < state.ground + 10) {
        state.target = null;
        if (!ui.sitting && !state.action) wave();
        return;
    }
    // On something he planted: it wiggles and sings its note (in tune with the world it grows in)
    const plant = plantAt(screen);
    if (plant) { world.touchPlant(plant.key); sing(plant); state.target = null; return; }
    // In the air, only a touch close to him, as high as his head or higher, is something he reaches for with his hand
    if (screen.y <= horizon() + 10) {
        const p = toSid(screen), head = map(frame(), PIVOT.x, 260);
        if (Math.abs(p.x - state.x) < 170 && p.y < head.y) { if (ui.sitting) sit(false); state.target = null; reachFor(p); return; }
    }
    // Anywhere else he walks there, and on while the finger is held (it guides him)
    state.guide = { id: e.pointerId, screen, t: 0 };
    walkTo(placeOf(screen).x, placeOf(screen).d);
    state.mark = { ...state.target, t: 0 };
}

// The keys: arrows or WASD walk him over the floor, the space bar sits him in lotus (and stands him up)
const KEYS = { ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right', ArrowUp: 'up', w: 'up', ArrowDown: 'down', s: 'down' };
let lastInput = 'pointer', wasAt = null;      // (how he was last moved: touch, pointer or keys, for the analytics)
function press(key, on) {
    if (on) lastInput = 'keys';
    state.keys[key] = on;
    if (on) { state.target = null; if (ui.sitting) sit(false); }
}
function onKey(e) {
    // (in a card's scene the keys are not his; Escape goes back to the world)
    if (portal.card != null) { if (e.key === 'Escape' && e.type === 'keydown') closePortal(); return; }
    if (story.open) { if (e.key === 'Escape' && e.type === 'keydown') closeStory(); return; }
    if (e.target?.closest?.('button') && e.key === ' ') e.target.blur();
    const key = KEYS[e.key.length === 1 ? e.key.toLowerCase() : e.key];
    if (key) { e.preventDefault(); if (e.type === 'keydown' && !e.repeat) press(key, true); if (e.type === 'keyup') press(key, false); return; }
    if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); if (e.type === 'keydown' && !e.repeat) sit(); }
    // (M: the three meditations, as a long press on the seed)
    if ((e.key === 'm' || e.key === 'M') && e.type === 'keydown' && !e.repeat) { if (ui.choose) ui.choose = false; else openChoose(); }
    // (jumping has no button for now: J jumps, on a computer)
    if ((e.key === 'j' || e.key === 'J') && e.type === 'keydown' && !e.repeat) jump();
}
function release() { for (const key of Object.keys(state.keys)) state.keys[key] = false; }
function reachFor(p) { state.reach = p; state.reached = p; act('reach', 2.6); }

function turnedRound() {
    const n = hands.near, f = hands.far;
    for (const k of ['u', 'v']) { [n[k].x, f[k].x] = [f[k].x, n[k].x]; [n[k].v, f[k].v] = [f[k].v, n[k].v]; }
    for (const h of [n, f]) { h.u.x = 2 * PIVOT.x - h.u.x; h.u.v = -h.u.v; }
    state.feet.reverse(); state.steps.reverse(); state.toes.reverse(); state.legTuck.reverse();
    state.phase = (state.phase + 0.5) % 1;                  // each foot keeps its step
    if (state.action?.arm) state.action.arm = state.action.arm === 'near' ? 'far' : 'near';
}

// --- The loop ---
function update(dt, now) {
    const S = springs, a = state.action;
    if (a) { a.t += dt; if (a.t >= a.dur) state.action = null; }
    const name = state.action?.name, t = state.action?.t ?? 0;

    // Walking over the floor: with the keys, or towards a target (a touch, or a finger held down guiding him; going
    // round what stands in the way). He walks the way he faces and turns as he goes, in a tight curve, his eyes first. Still a moment, or sitting, he turns to us; reaching, to that side
    let mx = 0, mz = 0, left = Infinity;
    const k = state.keys, keyed = k.left || k.right || k.up || k.down;
    if (state.guide) { state.guide.t += dt; guideTo(state.guide.screen); }
    if (state.mark) state.mark.t += dt;
    state.held = keyed ? state.held + dt : 0;
    if (keyed) { mx = (k.right ? 1 : 0) - (k.left ? 1 : 0); mz = (k.up ? 1 : 0) - (k.down ? 1 : 0); }
    else if (state.target) {
        const dx = state.target.x - state.x, dd = state.target.d - state.d;
        left = Math.hypot(dx, dd);
        // there (near enough: closer than he turns round in, or he would circle the point, stepping on the spot)
        if (left < 14 || (left < 50 && Math.abs(wrap(Math.atan2(dd, dx) - state.heading)) > Math.PI / 2)) state.target = null;
        else { mx = dx / left; mz = dd / left; }
    }
    let length = Math.hypot(mx, mz);
    // (going somewhere he was sent with a touch, he bends his way round what is in it; with the keys he goes just the
    // way they say, and only slides along what he bumps into)
    if (length > 0) { mx /= length; mz /= length; if (!keyed) [mx, mz] = steer(mx, mz); length = 1; }
    state.still = length > 0 || state.reach ? 0 : (state.still ?? 0) + dt;
    let aim = null;
    if (length > 0) aim = Math.atan2(mz, mx);
    else if (state.reach) aim = state.reach.x >= state.x ? 0 : Math.PI;
    else if (ui.sitting || state.still > 0.45) aim = -Math.PI / 2;
    // (quick on his feet: a turn right round takes him about a third of a second walking, a little more standing)
    const heading0 = state.heading;
    // (getting up from lotus he rises straight up where he sat; only on his feet does he turn and set off)
    if (aim !== null && !state.air && !state.rising) turnTo(aim, dt * (length > 0 ? 9 + 3 * state.run : 6));
    state.turning = dt > 0 ? wrap(state.heading - heading0) / dt : 0;
    const off = aim === null ? 0 : Math.abs(wrap(aim - state.heading));
    // his pace: easy; held a while (or far to go), a trot. Setting off he gathers speed (the first steps are shorter),
    // and stopping he slows down over a step or two
    // (only when the keys, or a finger guiding him, are held a good while, and the finger far from him: a touch is
    // always a calm walk)
    const trot = (keyed && state.held > 1.2) || (state.guide && state.guide.t > 1.2 && left > 420);
    const top = trot ? TROT : PACE;
    const want = length > 0 && !state.air && !ui.sitting && !state.rising ? Math.min(top, left * 3 + 20) * turnPace(off) : 0;
    const was = state.speed;
    // (in the air he keeps the speed he jumped with: a jump while walking carries him forward, over what is low)
    if (!state.air) state.speed = want > state.speed ? Math.min(want, state.speed + (trot ? 800 : 700) * dt) : Math.max(want, state.speed - 900 * dt);
    // His legs walk him: on his feet (not jumping, sitting or getting up) the cycle goes on at his pace and he goes
    // exactly as far as the foot on the ground goes back under him (unevenly, as the book says: quicker through the
    // contact, cushioned into the down)
    const onFeet = !state.air && !ui.sitting && !state.rising && Math.max(...state.legSit) < 0.01 && name !== 'jump';
    const amp = 1.2 + 0.25 * state.run, kWalk = Math.max(0, Math.min(1, springs.walk.x));
    let go = 0;
    if (onFeet && (state.speed > 0.5 || kWalk > 0.02)) {
        const before = gaitLegs(state.phase, kWalk, amp);
        const dp = state.speed * dt / cycleLength(amp);
        const after = state.phase + dp, g = (state.phase % 1) < 0.5 ? 0 : 1;
        state.phase = after % 1;
        const now = gaitLegs(state.phase, kWalk, amp);
        if (((after - 1e-9) % 1 < 0.5 ? 0 : 1) === g) { const on = standsOn(now[g]); go = Math.max(0, before[g][on].a - now[g][on].a); }
        state.gait = { legs: now, k: kWalk };
        // his hips as high as the lower foot lets them (lowest on the down, highest pushing off: the bob of the walk)
        state.gaitDrop = STAND + 2 + Math.min(lowest(now[0]), lowest(now[1]));
    } else { state.gait = null; state.gaitDrop += (0 - state.gaitDrop) * Math.min(1, dt * 10); }
    if (!onFeet && state.speed > 0.5) go = state.speed * dt;
    if (go > 0) {
        const from = { x: state.x, d: state.d };
        state.x += Math.cos(state.heading) * go;
        state.d += Math.sin(state.heading) * go;
        collide(from);
    }
    state.run = Math.max(0, Math.min(1, (state.speed - PACE) / (TROT - PACE)));
    const walking = state.speed > 3 ? 1 : 0;
    // when he stops, his body goes on a little and settles back (the weight he was carrying)
    if (was > 40 && state.speed <= 40 && want === 0) { springs.lean.v += 0.22 * (Math.sign(springs.face.x) || 1) * (1 - frame().front) * (was / PACE); springs.sy.v -= 0.7; }
    // The camera follows him with a little weight (late as he sets off), a little ahead of where he goes
    const lead = Math.cos(state.heading) * state.speed * 0.5;
    state.cam += (state.x + lead - state.cam) * Math.min(1, dt * 2);
    // and into the distance: it keeps him a little below the middle of the floor, wherever he goes
    state.camD += (state.d - follow() - state.camD) * Math.min(1, dt * 2);
    // sitting in lotus, the world's time all but stops (softly, as he settles; and comes back as he gets up)
    const meditating = ui.sitting && springs.drop.x > (STAND - SIT) * 0.8;
    state.pace += ((meditating ? STILLNESS : 1) - state.pace) * Math.min(1, dt * (meditating ? 0.9 : 1.6));
    world.update(dt, { x: state.x, d: state.d, sitting: meditating, pace: state.pace });
    // (how far he walked this frame, for the analytics)
    if (wasAt) visit?.moved(Math.hypot(state.x - wasAt.x, state.d - wasAt.d), lastInput);
    wasAt = { x: state.x, d: state.d };
    // the rulito under the tree: born after a moment of sitting there, kept while he sits, gone when he gets up
    const seated = ui.sitting && Math.min(...state.legSit) > 0.9;
    const card = seated ? world.placeCard(state.x, state.d) : null;
    state.underTree = card ? state.underTree + dt : 0;
    // away from the places, with seeds, he plants one in front of him (once each time he sits)
    // (the seed leaves the button SOW.fly s before PLANT_AFTER and flies to his heart; then, as a light, through him and
    // under the ground to where it is born)
    if (!ui.sitting) {
        if (state.sowing && !state.planted) ui.seeds = memory.seeds.length;   // (he got up before it was born: it stays his)
        state.plantT = 0; state.planted = false; state.sowing = null; state.portalDone = false; state.tending = null;
    } else if (ui.guide) {
        // (a meditation: nothing is planted and nothing grows)
    } else if (seated && !card && !state.planted && (state.tending ??= world.plantBy(state.x, state.d))) {
        // by a plant of his he plants nothing: after the same moment it grows a step, or, grown since he came, it dances
        state.plantT += dt;
        if (state.plantT >= PLANT_AFTER) {
            state.planted = true;
            const p = state.tending, how = world.tend(p.key);
            if (how === 'grow') {
                if (!still) burstAt(toScreen(p.x, p.d, p.h * 0.4), `rgb(${world.seedLight(p.card).map(Math.round).join(',')})`);
                saveMemory(memory);
                play('bloom');
            } else if (how === 'dance') sing(p);
        }
    } else if (seated && !card && !state.planted && memory.seeds.length) {
        state.plantT += dt;
        if (!state.sowing && state.plantT >= PLANT_AFTER - SOW.fly) {
            const light = world.seedLight(memory.seeds[0]);
            state.sowing = { t: 0, x: state.x, d: state.d - 110, light };
            ui.seeds = memory.seeds.length - 1;
            fly(buttonMiddle(), { ...sowAt.heart }, light, () => play('tap'), SOW.fly * 1000);
        }
        if (state.sowing) state.sowing.t += dt;
        if (state.sowing && state.sowing.t >= SOW.fly + SOW.through + SOW.under) {
            const w = state.sowing;
            state.sowing = null;
            state.planted = true;
            if (!still) burstAt(toScreen(w.x, w.d), `rgb(${w.light.map(Math.round).join(',')})`);
            const seed = memory.seeds.shift(), kinds = herbPlanted(), g = world.plant(seed, w.x, w.d), kind = kindOf(g.name);
            memory.planted.push(g);
            visit?.seedPlanted(seed, world.zoneCard(), kind);
            if (firstVisit) visit?.firstSeed('planted');
            if (kind && !kinds.has(kind)) visit?.plantDiscovered(kind, kinds.size + 1);
            ui.seeds = memory.seeds.length;
            learn('planted');
            firstVisit = false;
            refreshStory();
            saveMemory(memory);
            play('bloom');
        }
    }
    // meditating among his plants (away from the places), they sing in turn
    if (seated && card == null && portal.card == null && !ui.guide) {
        state.roundT -= dt;
        if (state.roundT <= 0) {
            const seen = new Set(), round = world.plantsNear(state.x, state.d, GARDEN.reach)
                .filter((p) => Math.hypot(p.x - state.x, (p.d - state.d) * 1.6) < GARDEN.reach && !seen.has(p.key) && seen.add(p.key))
                .sort((a, b) => a.x - b.x);
            if (round.length) {
                const i = state.roundI % round.length, p = round[i];
                world.singPlant(p.key); sing(p, 0.85);
                state.roundI = i + 1;
                state.roundT = i === round.length - 1 ? GARDEN.rest + GARDEN.step : GARDEN.step;
            } else state.roundT = 1;
        }
    } else { state.roundT = GARDEN.first; state.roundI = 0; }
    if (card != null) learn('place');
    // Standing at a place, a ring of light under his feet, in its rulito's colour: here, sitting, something happens;
    // and until he has sat at one once, the button calls while he stands there
    const at = !ui.sitting && !state.rising && portal.card == null ? world.placeCard(state.x, state.d) : null;
    state.ring += ((at != null ? 1 : 0) - state.ring) * Math.min(1, dt * (at != null ? 2.5 : 4));
    if (at != null) {
        state.ringCard = at;
        if (!memory.learned.place) { state.placeCall -= dt; if (state.placeCall <= 0) { callButton(); state.placeCall = HINT_AT_PLACE; } }
    } else state.placeCall = 0.5;
    // at a door to a card, the card's scene instead of the rulito here
    const door = card != null && PORTALS.has(card) && webgl && !ui.guide;
    if (door && !state.portalDone && portal.card == null && state.underTree >= PORTAL_AFTER) openPortal(card);
    if (state.underTree >= RULITO_AFTER && !state.rul && !door && !ui.guide) {
        state.rul = { age: 0, head: 0, tail: 0, pop: 0, full: false, card };
        rulitoColour.value = RULITO_COLOURS[card] ?? RULITO_COLOURS[15];
        rulito.value?.reshape();
    }
    // the music moves to the chord of the card of the zone he is in (src/data/cardChords.js), as on a card's page
    const zone = world.zoneCard();
    if (zone !== state.zone) { state.zone = zone; setCardChord(chordFor(zone)); visit?.zone(zone); }
    think(dt);
    nightSecrets(dt, seated);
    lookAt();
    // the meditation chosen (meditate): it starts as he has settled in lotus, and goes by in real time
    if (ui.guide && meditating) {
        const g = ui.guide;
        if (!g.started) { g.started = true; play('bowl'); }
        // (a soft breath to follow, at the start of each one, with him: breathAt)
        if (g.t >= g.breaths * (BREATH_IN + BREATH_OUT)) { g.breaths += 1; play('guideBreath'); }
        g.t += dt;
        if (g.t >= g.total) endGuide(true);
    }
    // (sitting a while without one, the three lights are offered once, for a moment)
    if (meditating && !ui.guide && !peeked && !memory.learned.guided && state.sitT > GUIDE_PEEK) {
        peeked = true; ui.choose = true; ui.peek = true;      // (offered, the world is not dimmed)
        peekTimer = setTimeout(() => { if (ui.peek) ui.choose = false; }, 4500);
    }
    if (state.rul) {
        const r = state.rul;
        r.age += dt; r.pop = Math.max(0, r.pop - dt * 2.2);
        r.head = 1 - (1 - Math.min(1, r.age / RULITO_GROW)) ** 1.6;
        if (r.head >= 1 && !r.full) {
            r.full = true; r.pop = 1; play('rulito');
            if (r.card != null) { visit?.meditated(r.card); visit?.rulito(r.card, 'place'); }
            setTimeout(() => winSeed(r.card), 900);
            const c = getCard(r.card);
            if (c) Object.assign(teaching, { es: c.affirmation_es.trim(), en: c.affirmation_en.trim(), on: true, story: false });
        }
        if (!ui.sitting) { r.tail = Math.min(1, r.tail + dt / RULITO_GO); teaching.on = false; }
        if (r.tail >= 1) { state.rul = null; rulito.value?.frame({ width: 40 }); }
    }
    S.walk.to = walking;
    // (the cycle goes on with his legs, above: about a step a second at his pace)
    const run = state.run;
    const w = Math.max(0, Math.min(1, S.walk.x)), p = state.phase, face = Math.sign(S.face.x) || 1;
    // seen from the front or the back, his weight goes over the foot on the ground, side to side (the far foot is down
    // for the first half of the cycle, and is on the side lateral() and his face say)
    state.shift = (Math.sign(lateral() * face) || 1) * Math.sin(Math.PI * 2 * p) * 9 * S.front.x * w;

    // Breathing (slower and deeper sitting), blinking, looking
    const rate = ui.sitting ? 0.16 : 0.26;
    state.breath = ui.guide?.started ? (breathAt(ui.guide.t) * 2 - 1) * 1.5 : Math.sin(now / 1000 * Math.PI * 2 * rate) * (ui.sitting ? 1.3 : 1);
    state.nextBlink -= dt;
    if (state.nextBlink <= 0) { state.blink = 0.16; state.nextBlink = 2 + Math.random() * 3.5; }
    state.blink = Math.max(0, state.blink - dt);

    // Targets, by what he is doing
    // walking: leaning a little into it, his soft body squashing a touch as each foot lands and stretching as he passes
    // over it, and swaying from side to side with his weight
    const fr = frame().front;
    // (at a trot: leaning in more, a bigger swing and a springier bob)
    // The walk as The Animator's Survival Kit draws it, step by step (st: 0 a foot's contact, 0.25 the down, 0.5 the
    // passing position, 0.75 the up, 1 the next contact): he is lowest on the down, just after the contact, as the
    // front knee takes his weight (squashing a touch), and highest on the up, pushing off the toes of the back foot
    const st = (p * 2) % 1, low = 0.5 + 0.5 * Math.cos(Math.PI * 2 * (st - 0.25));       // 1 on the down, 0 on the up
    let lean = w * (0.02 + 0.03 * run) * face * (1 - fr), sy = 1 - w * (0.012 + 0.025 * run) * (low - 0.5) * 2, rot = w * 0.006 * Math.sin(p * Math.PI * 2), drop = 0, closed = 0;
    // (swinging round he tilts a touch with the turn, as one's weight goes with it)
    rot += w * Math.max(-0.07, Math.min(0.07, state.turning * 0.012));   // (into the way he is turning to)
    let near = { ...REST_HAND.near }, far = { ...REST_HAND.far };
    // the arms swing against the legs (each arm forward as the other leg goes forward), a little behind them, rising a
    // touch as they go forward
    // (at their furthest on each contact, the arm opposite the front foot forward, a frame or so behind the legs: the
    // drag of a loose arm; they pass his body on the passing position)
    const swing = -Math.cos(Math.PI * 2 * (p - 0.06)) * (30 + 16 * run) * w;    // (relaxed: a small, loose swing)
    near.u -= swing; far.u += swing;
    near.v -= Math.max(0, -swing) * (0.15 + 0.5 * run); far.v -= Math.max(0, swing) * (0.15 + 0.5 * run);
    if (run > 0) { near.v -= 22 * run; far.v -= 22 * run; }             // trotting, his arms just a little bent (still loose)
    // turned to us, his hands hang at each side of him (walking towards us or away, an arm swinging forward shows as
    // that hand rising a little and coming in)
    near = { u: mix(near.u, side(FRONT_HAND.near.u), spread(fr)), v: mix(near.v, FRONT_HAND.near.v, fr) };
    far = { u: mix(far.u, side(FRONT_HAND.far.u), spread(fr)), v: mix(far.v, FRONT_HAND.far.v, fr) };
    near.v -= fr * Math.max(0, -swing) * 0.9; near.u += fr * Math.max(0, -swing) * 0.6;
    far.v -= fr * Math.max(0, swing) * 0.9; far.u -= fr * Math.max(0, swing) * 0.6;

    const restNear = near, restFar = far;                                    // (the poses below put new targets)
    // Sitting down in lotus: he leans in a little, lowers himself softly, crosses one leg and then the other, settles
    // with a small give, puts his hands on his knees and only then closes his eyes. Getting up: eyes open, he leans in
    // and gathers himself, uncrosses his legs (the last one crossed first) and rises, stretching a touch
    state.sitT += dt;
    const ease = (x) => { const c = Math.max(0, Math.min(1, x)); return c * c * (3 - 2 * c); }, T = state.sitT, DEEP = STAND - SIT;
    if (ui.sitting) {
        const down = ease((T - 0.25) / 0.95);
        drop = DEEP * down; lean = 0.035 * face * (T < 0.25 ? T / 0.25 : Math.max(0, 1 - (T - 0.25) / 0.7));
        if (down >= 1 && !state.settled) { state.settled = true; S.sy.v -= 1.3; }      // the little give as he lands
        closed = T > 1.45 ? 1 : 0;
        if ((state.legSit[0] + state.legSit[1]) / 2 > 0.6) { near = { u: 248, v: 506 }; far = { u: 12, v: 506 }; }   // hands on his knees
        state.legSit[0] += ((down > 0.15 ? 1 : 0) - state.legSit[0]) * Math.min(1, dt * 4);
        state.legSit[1] += ((state.legSit[0] > 0.45 ? 1 : 0) - state.legSit[1]) * Math.min(1, dt * 4);
    } else if (state.rising) {
        const up = ease((T - 0.3) / 0.75);
        drop = DEEP * (1 - up); lean = 0.045 * face * (T < 0.3 ? T / 0.3 : Math.max(0, 1 - (T - 0.3) / 0.6));
        sy = T < 0.3 ? 1 - 0.04 * (T / 0.3) : 1 + 0.03 * Math.sin(Math.PI * up);
        state.legSit[1] += (0 - state.legSit[1]) * Math.min(1, dt * 5);
        state.legSit[0] += ((state.legSit[1] < 0.55 ? 0 : 1) - state.legSit[0]) * Math.min(1, dt * 5);
        if (T > 1.15) { state.rising = false; state.legSit = [0, 0]; }
    }
    if (name === 'wave') {
        // with the arm he started with, even if he has turned round since (then it is his far one)
        const hand = { u: 250 + Math.sin(t * 12) * 34, v: 215 + Math.cos(t * 12) * 10 }, far_ = state.action.arm === 'far';
        // (the far arm waves ahead of him in profile, and on its own side turned to us, after the mirroring below)
        if (far_) far = { u: fr > 0.5 && lateral() > 0 ? 2 * PIVOT.x - hand.u : hand.u, v: hand.v }; else near = hand;
        lean = (far_ ? 0.035 : -0.035) * Math.min(1, t * 3); sy = 1.03;
    }
    if (name === 'stretch') {
        const up = Math.min(1, t / 0.6) * Math.min(1, (state.action.dur - t) / 0.5);
        near = { u: 176 + 130 * up, v: 486 - up * 480 }; far = { u: 62 - 130 * up, v: 486 - up * 480 };   // beside his head
        sy = 1 + 0.13 * up; closed = up; rot = -0.04 * up; drop = -6 * up;
    }
    // A jump, as one really jumps: he gathers himself (crouching little by little, leaning in, arms going back), springs
    // up stretching with his arms swinging up, is round at the top with his legs drawn up, reaches his legs down and
    // opens his arms a little to land, and his knees take the landing softly (the springs give it its give)
    if (name === 'jump' && !state.air && !state.jumped) {
        const e = Math.min(1, t / JUMP.crouch), ease_ = e * e * (3 - 2 * e);
        drop = 48 * ease_; sy = 1 - 0.09 * ease_; lean = 0.035 * face * ease_; rot = 0.022 * face * ease_;   // (one knee bends a little before the other)
        // arms going back to gather the spring: in profile behind him; turned to us, down and out, each on its own side
        // (`final`: already where they go, not to be mirrored below)
        if (fr > 0.5) {
            near = { u: mix(near.u, side(PIVOT.x - 150), ease_), v: mix(near.v, 470, ease_), final: true };
            far = { u: mix(far.u, side(PIVOT.x + 150), ease_), v: mix(far.v, 470, ease_), final: true };
        } else { near = { u: mix(near.u, 60, ease_), v: mix(near.v, 480, ease_) }; far = { u: mix(far.u, 40, ease_), v: mix(far.v, 470, ease_) }; }
        if (t >= JUMP.crouch) { state.air = true; state.jumped = true; state.vy = JUMP.speed; S.sy.v += 2.5; S.drop.v -= 260; }
    }
    if (state.air) {
        state.lift += state.vy * dt; state.vy -= JUMP.gravity * dt;
        const up = Math.max(-1, Math.min(1, state.vy / JUMP.speed));          // 1 springing up, 0 at the top, -1 coming down
        state.tuck = 1 - Math.abs(up);
        sy = 1 + 0.07 * Math.abs(up); lean = 0.015 * face * up;
        if (fr > 0.5) {
            // turned to us: up at his sides as he springs, out to each side for balance as he comes down
            const out = up > 0 ? 118 : mix(118, 180, -up), v = up > 0 ? mix(330, 170, up) : mix(330, 400, -up);
            near = { u: side(PIVOT.x - out), v, final: true }; far = { u: side(PIVOT.x + out), v, final: true };
        } else {
            near = up > 0 ? { u: 190, v: mix(330, 170, up) } : { u: mix(190, 236, -up), v: mix(330, 400, -up) };
            far = up > 0 ? { u: 70, v: mix(330, 180, up) } : { u: mix(70, 20, -up), v: mix(330, 400, -up) };
        }
        if (state.lift <= 0) {
            state.lift = 0; state.air = false; state.tuck = 0;
            S.sy.v -= 3.6; S.drop.v += 380;                                    // the landing, taken in the knees
            state.feet.forEach((foot) => { if (foot) { foot.y = 0; foot.d = state.d; } });
        }
    }
    if (name === 'reach' && state.reach) {
        const f = frame(), head = map(f, 150, 120), dx = state.reach.x - head.x, dy = state.reach.y - head.y;
        lean = Math.max(-0.12, Math.min(0.12, (dx * face) / 900)) * face;
        sy = 1 + Math.max(0, Math.min(0.12, -dy / 1500));
    }
    if (state.reach && name !== 'reach') state.reach = null;
    S.reach.to = state.reach ? 1 : 0;

    // The poses above are written as in profile (his near hand on the side he faces); turned to us his near arm is
    // on the other side, so they are mirrored (each hand to its own side)
    if (fr > 0.5 && lateral() > 0) {
        if (near !== restNear && !near.final) near = { u: 2 * PIVOT.x - near.u, v: near.v };
        if (far !== restFar && !far.final) far = { u: 2 * PIVOT.x - far.u, v: far.v };
        if (name === 'wave') lean = -lean;
    }
    S.lean.to = lean; S.sy.to = sy; S.rot.to = rot; S.drop.to = drop; S.closed.to = closed;

    // Where he looks: the finger if it moved lately, else a glance now and then, else ahead
    const f0 = frame(), head = map(f0, 150, 200);
    let look = null;
    if (state.reach) look = state.reach;
    else if (state.pointer && now - state.pointerAt < 2500) look = toSid(state.pointer);
    else if (aim !== null && off > 0.25 && !ui.sitting) look = { x: head.x + Math.cos(aim) * 500, y: head.y + 40 };   // his eyes first, where he turns
    else {
        state.nextGlance -= dt;
        if (state.nextGlance <= 0) { state.glance = Math.random() < 0.4 ? null : { x: head.x + (Math.random() - 0.5) * 600, y: head.y + (Math.random() - 0.6) * 300 }; state.nextGlance = 1.5 + Math.random() * 3; }
        look = state.glance;
    }
    if (look) {
        const dx = look.x - head.x, dy = look.y - head.y, d = Math.hypot(dx, dy) || 1, m = Math.min(1, d / 250);
        S.lookX.to = (dx / d) * m * f0.face; S.lookY.to = (dy / d) * m;    // in his own sides (it flips with him)
        if (!state.reach && !ui.sitting) S.lean.to += (dx / d) * m * 0.02;
    } else { S.lookX.to = 0.35; S.lookY.to = 0; }

    const before = Math.sign(S.face.x);
    for (const s of Object.values(S)) step(s, dt);
    // how he is drawn, from his heading: the side he faces, how much he is turned to us (or away), his back
    {
        const hx = Math.cos(state.heading), hz = Math.sin(state.heading);
        S.face.x = S.face.to = Math.abs(hx) > 1e-3 ? hx : (before || 1) * 1e-3; S.face.v = 0;
        S.front.x = S.front.to = Math.acos(Math.min(1, Math.abs(hx))) / (Math.PI / 2); S.front.v = 0;
        const b = Math.max(0, Math.min(1, (hz - 0.15) / 0.45));
        S.back.x = S.back.to = b * b * (3 - 2 * b); S.back.v = 0;
    }
    for (const h of Object.values(hands)) {
        step(h.u, dt); step(h.v, dt);
    }
    // As he turns round his drawing is mirrored, so what was his near side is now his far one: each arm and each leg
    // keeps where it is (the arm on the right of the screen stays on the right, the one waving keeps waving)
    if (before && Math.sign(S.face.x) && Math.sign(S.face.x) !== before) turnedRound();
    hands.near.u.to = near.u; hands.near.v.to = near.v; hands.far.u.to = far.u; hands.far.v.to = far.v;

    // His feet, on the floor (x, d) and lifted y. Walking, they are where his legs' poses put them (and the legs are
    // drawn from those poses); standing, each steps back under him when it is far from there; in the air they hang
    const f = frame(), hd = { x: Math.cos(state.heading), z: Math.sin(state.heading) };
    hipsOf(f).forEach((hip, i) => {
        const h = map(f, hip.u, hip.v);
        // where this foot is under him, from his hip at rest; seen side on, his far foot is a little further back on
        // the floor than his near one
        const under = f.root.x + (hip.u - PIVOT.x) * face, back = (i ? -1 : 1) * 9 * (1 - f.front);
        const rest = { x: under + face * (i ? 4 : -4), d: state.d + back, y: 0 };
        if (state.gait) {
            const L = state.gait.legs[i], H = STAND + 2 - state.gaitDrop;
            state.feet[i] = { x: under + hd.x * L.ankle.a, d: state.d + back + hd.z * L.ankle.a, y: Math.max(0, L.heel.u + H) };
            state.steps[i] = null; state.toes[i] = 0;
            return;
        }
        let foot = state.feet[i] ?? rest;
        // in the air his legs hang, drawn up at the top of the jump and reaching down again to land, each in its own
        // time: one goes and comes back first, the other a moment after it (not one stiff piece)
        state.legTuck[i] += ((state.air ? state.tuck ?? 0 : 0) - state.legTuck[i]) * Math.min(1, dt * (i ? 6 : 13));
        state.toes[i] += (0 - state.toes[i]) * Math.min(1, dt * 10);
        if (state.air && i === 1 && state.lift < 24 && state.vy > 0) foot = { ...foot, y: 0 };      // the last to leave the ground
        else if (state.air) foot = { x: h.x + face * (8 + 22 * state.legTuck[i]), d: state.d, y: state.ground - (h.y + STAND * (0.97 - 0.32 * state.legTuck[i])) };
        else {
            // a step of its own when it is far from where it rests (one foot at a time)
            const st = state.steps[i];
            if (st) {
                st.t += dt / 0.24;
                const e = Math.min(1, st.t), s = e * e * (3 - 2 * e);
                foot = { x: st.from.x + (rest.x - st.from.x) * s, d: st.from.d + (rest.d - st.from.d) * s, y: st.from.y * (1 - s) + Math.sin(e * Math.PI) * 20 };
                if (e >= 1) state.steps[i] = null;
            } else if (Math.hypot(rest.x - foot.x, rest.d - foot.d) > 6 && !state.steps[1 - i]) state.steps[i] = { from: foot, t: 0 };
            else if (!state.steps[i]) { const m = Math.min(1, dt * 6); foot = { x: foot.x + (rest.x - foot.x) * m, d: foot.d + (rest.d - foot.d) * m, y: foot.y * (1 - m) }; }
        }
        state.feet[i] = foot;
    });
}

// A point on the floor (x, d), lifted y, in his own drawing (which is drawn at his depth): a foot at another depth is
// higher or lower on the screen and a little smaller or bigger, as the floor goes back
function onFloor(p) {
    const s0 = scaleAt(state.d), s1 = scaleAt(p.d);
    return { x: state.cam + (p.x - state.cam) * s1 / s0, y: state.ground + (groundAt(p.d) - groundAt(state.d) - (p.y ?? 0) * s1) / s0 };
}

// His body drawn in code from his traced silhouette: the fill, his outline inside its edge (clean at any size and
// bent with him point by point), and a little stroke at each of her hatching marks
// Where he was sent: a ring of dots on the floor, in his ink, lying flat in perspective; it opens out and fades once
// tapped, and stays (breathing) while a finger guides him
function drawMark(c, x0) {
    const m = state.mark;
    if (!m) return;
    const held = !!state.guide, life = held ? 1 : 1 - m.t / 0.9;
    if (life <= 0 || m.d > state.camD + DEPTH) { if (!held) state.mark = null; return; }
    const s = scaleAt(m.d), x = x0 + (m.x - state.cam) * s, y = groundAt(m.d);
    const r = (held ? 46 + 4 * Math.sin(m.t * 5) : 40 + 30 * (1 - life)) * s;
    c.fillStyle = INK; c.globalAlpha = 0.7 * Math.min(1, life * 1.5);
    for (let i = 0; i < 12; i++) {
        const a = i / 12 * Math.PI * 2 + m.t * 0.6;
        c.beginPath(); c.arc(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.32, 7 * s, 0, Math.PI * 2); c.fill();
    }
    c.globalAlpha = 1;
}
const LINE_W = 15;          // (about as thick as the line of her tree beside him)
let FILL = CICLOS.white;
function codeBody(c, f) {
    // turned to us his silhouette is the same widths, row by row, set straight about his middle
    const S0 = rig.silhouette, fr = f.front;
    const S = { ...S0, left: S0.left.map((l, i) => mix(l, PIVOT.x - (S0.right[i] - l) / 2, fr)),
        right: S0.right.map((r, i) => mix(r, PIVOT.x + (r - S0.left[i]) / 2, fr)) };
    const at = (u, v) => local(f, u, v);
    const vOf = (i) => S.top + i * S.step;
    // (round at the crown and at the bottom: the path goes through a point just past each, not along a flat row)
    const last = S.left.length - 1;
    const crown = at(mix(S.crown[0], PIVOT.x, fr), S.crown[1]), base = at(mix(S.base[0], PIVOT.x, fr), S.base[1]);
    const ring = [crown];
    for (let i = 0; i <= last; i++) ring.push(at(S.right[i], vOf(i)));
    ring.push(base);
    for (let i = last; i >= 0; i--) ring.push(at(S.left[i], vOf(i)));
    // a smooth closed curve through the middles of its segments (each point a control point): no corners anywhere
    c.beginPath();
    const midOf = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
    let m = midOf(ring[ring.length - 1], ring[0]);
    c.moveTo(m.x, m.y);
    ring.forEach((p, i) => { m = midOf(p, ring[(i + 1) % ring.length]); c.quadraticCurveTo(p.x, p.y, m.x, m.y); });
    c.closePath();
    c.fillStyle = FILL; c.fill();
    c.save();
    c.clip();
    c.strokeStyle = INK; c.lineWidth = LINE_W * 2; c.lineJoin = 'round'; c.stroke();
    // the hatching: each of her marks as a brush stroke, round and full where it leaves his outline, thinning softly
    // as it bends a little downwards towards his middle and ending round, not sharp; each a touch different
    c.strokeStyle = INK; c.lineCap = 'round';
    rig.hatching.forEach(([v, long], k) => {
        const i = Math.max(0, Math.min(S.left.length - 1, Math.round((v - S.top) / S.step))), u = S.left[i];
        const vary = Math.sin(k * 2.39), base = u + LINE_W - 7, reach = long + 4 + vary * 2;
        const SEG = 7;
        let prev = at(base, v);
        for (let j = 1; j <= SEG; j++) {
            const t = j / SEG, sag = (2.2 + vary) * t * t;                  // the stroke bends down as it goes
            const next = at(base + reach * t, v + sag);
            c.lineWidth = mix(6.6 + vary * 0.5, 2, Math.pow((j - 0.5) / SEG, 0.8));
            c.beginPath(); c.moveTo(prev.x, prev.y); c.lineTo(next.x, next.y); c.stroke();
            prev = next;
        }
    });
    c.restore();
}

function draw() {
    const el = canvas.value, c = el.getContext('2d'), k = view.k * view.dpr;
    c.imageSmoothingQuality = 'high';                         // (her pictures, scaled: smooth, not pixelated)
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, el.width, el.height);
    c.setTransform(k, 0, 0, k, 0, 0);
    const f = frame(), face = Math.sign(f.face);
    const W = view.w / view.k;

    // The floor, back to the horizon, and him on it at his depth (smaller and nearer the middle the farther back)
    world.drawSky(c, { width: W, cam: state.cam, d: state.d }, 0, horizon());
    // the zone's colours: his line and body, the colour under the starry night, and the header's icons cream by night
    INK = world.ink(); FILL = world.white();
    const dark = world.night(), under = world.nightColour();
    nightSky.value.style.opacity = dark.toFixed(3);
    if (nightSky.value.style.backgroundColor !== under) nightSky.value.style.backgroundColor = under;
    document.body.classList.toggle('lab-night', dark > 0.55);
    // (the page under the drawing in the sky's colour at the top: the iPhone's status bar takes it, cream otherwise)
    const top = world.topColour();
    if (top !== pageTop) { pageTop = top; labEl.value.style.backgroundColor = top; document.body.style.backgroundColor = top; }
    teaching.light = dark > 0.55;
    if (teaching.ink !== INK) teaching.ink = INK;
    c.fillStyle = world.ground();
    c.fillRect(0, horizon() - 4, W, view.h / view.k);
    const x0 = W / 2, near = state.camD - (view.h / view.k - state.ground) / view.floor * DEPTH;
    const place = { x0, cam: state.cam, groundAt, scaleAt, width: W, near, far: state.camD + DEPTH };
    world.drawGround(c, place);
    drawMark(c, x0);
    world.draw(c, place, (d) => d > state.d);                         // what is behind him
    const depth = scaleAt(state.d);
    c.save();
    c.translate(x0, groundAt(state.d)); c.scale(depth, depth); c.translate(-state.cam, -state.ground);
    c.fillStyle = 'rgba(20, 50, 70, 0.10)';
    c.beginPath();
    c.ellipse(f.root.x, state.ground + 4, 70 * (1 - Math.min(0.5, state.lift / 400)), 9, 0, 0, Math.PI * 2);
    c.fill();
    // at a place, a ring of dots of light round his feet, turning slowly and breathing: sit here (cream dots, each in a
    // halo of its rulito's colour, so it reads over any ground, by day and by night)
    if (state.ring > 0.01) {
        const t = performance.now() / 1000, rgb = hexRgb(RULITO_COLOURS[state.ringCard] ?? RULITO_COLOURS[15]);
        const R = 175 + 10 * Math.sin(t * 2.2), a = state.ring, FLAT = 0.2;
        const glow = c.createRadialGradient(0, 0, R * 0.5, 0, 0, R * 1.25);
        glow.addColorStop(0, `rgba(${rgb},0)`); glow.addColorStop(0.6, `rgba(${rgb},${0.4 * a})`); glow.addColorStop(1, `rgba(${rgb},0)`);
        c.save(); c.translate(f.root.x, state.ground + 4); c.scale(1, FLAT);
        c.fillStyle = glow; c.beginPath(); c.arc(0, 0, R * 1.25, 0, Math.PI * 2); c.fill();
        for (let i = 0; i < 20; i++) {
            const q = i / 20 * Math.PI * 2 + t * 0.35, w = 0.6 + 0.4 * Math.sin(t * 3 - i * 0.9), x = Math.cos(q) * R, y = Math.sin(q) * R;
            c.fillStyle = `rgba(${rgb},${0.55 * a * w})`;
            c.beginPath(); c.ellipse(x, y, 16, 16 / FLAT, 0, 0, Math.PI * 2); c.fill();
            c.fillStyle = `rgba(255,248,226,${a * w})`;
            c.beginPath(); c.ellipse(x, y, 8, 8 / FLAT, 0, 0, Math.PI * 2); c.fill();
        }
        c.restore();
    }

    // An arm or a leg as one soft curve through its elbow or knee (never a sharp corner), and the foot after it
    const limb = ([a, joint, end, toe], width) => {
        c.strokeStyle = INK; c.lineWidth = width; c.lineCap = 'round'; c.lineJoin = 'round';
        const mid = { x: (a.x + end.x) / 2, y: (a.y + end.y) / 2 };
        const pull = { x: joint.x + (joint.x - mid.x) * 0.35, y: joint.y + (joint.y - mid.y) * 0.35 };
        c.beginPath(); c.moveTo(a.x, a.y);
        c.quadraticCurveTo(pull.x, pull.y, end.x, end.y);
        if (toe) c.quadraticCurveTo(end.x, toe.y, toe.x, toe.y);       // a rounded heel
        c.stroke();
    };

    // Legs
    // each foot stays on its own side of the other (as its hip is), so his legs never cross like scissors when one
    // passes the other seen three quarters on (pushed apart just enough, only while they would cross)
    const hips = hipsOf(f).map((hip) => map(f, hip.u, hip.v));
    const placed = state.feet.map((fl, i) => (fl ? onFloor(fl) : { x: hips[i].x, y: state.ground }));
    {
        const side = Math.sign(hips[1].x - hips[0].x), apart = (placed[1].x - placed[0].x) * side, GAP = 34 * f.front;
        if (side && !Math.max(...state.legSit) && apart < GAP) {
            const push = (GAP - apart) / 2 * side;
            placed[0] = { ...placed[0], x: placed[0].x - push }; placed[1] = { ...placed[1], x: placed[1].x + push };
        }
    }
    // walking: each leg from its pose, from the hip, along the way he goes (seen from the front or the back that way is
    // towards us or away, so a knee coming up shows as the foot rising); `back`: the far leg a little further back
    const G = state.gait, Kd = view.floor / DEPTH / scaleAt(state.d);
    const hx = Math.cos(state.heading), hz = Math.sin(state.heading);
    const seen = (h, pt, back) => ({ x: h.x + hx * pt.a, y: h.y - (hz * pt.a + back) * Kd - pt.u });
    const legs = hipsOf(f).map((hip, i) => {
        const h = hips[i], floor = state.feet[i], foot = placed[i];
        if (G) {
            const L = G.legs[i], back = (i ? -1 : 1) * 9 * (1 - f.front), outward = (i ? -1 : 1) * face * lateral();
            const toe = seen(h, L.toe, back);
            return { h, joint: seen(h, L.knee, back), end: seen(h, L.ankle, back), toe: { x: toe.x + outward * 0.75 * LEG.foot * f.front, y: toe.y } };
        }
        // knees forward in profile; turned to us, a little out to their own side
        const outward = (i ? -1 : 1) * face * lateral();              // (turned to us, the near leg is on the far side)
        const crossed = state.legSit[i];
        const toward = crossed > 0.5 ? { x: outward, y: -0.5 } : { x: mix(face, outward * 0.3, f.front), y: 0 };
        const ankle = { x: foot.x, y: foot.y - 6 };
        // a foot nearer us or further back on the floor is lower or higher on the screen than under him: the leg going
        // that way looks longer or shorter than it is (it is foreshortened), so it may reach a little further
        const lean3d = floor ? Math.abs(groundAt(floor.d) - groundAt(state.d)) / scaleAt(state.d) : 0;
        const longer = Math.hypot(LEG.thigh + LEG.shin, lean3d * 1.1) / (LEG.thigh + LEG.shin);
        let { joint, end } = bend(h, ankle, LEG.thigh * longer, LEG.shin * longer, toward);
        if (crossed > 0.001) {
            // Crossed in front of him, as she draws them: each knee well out to its side, its foot under the other; each
            // leg crosses on its own (lifting its foot a little over the way), the second after the first
            const side = Math.sign(h.x - f.root.x) || (i ? face : -face), m = crossed;
            const knee = { x: f.root.x + side * LOTUS.knee, y: state.ground - LOTUS.kneeUp }, under = { x: f.root.x - side * LOTUS.under, y: state.ground - 2 - Math.sin(Math.PI * m) * 34 };
            joint = { x: joint.x + (knee.x - joint.x) * m, y: joint.y + (knee.y - joint.y) * m };
            end = { x: end.x + (under.x - end.x) * m, y: end.y + (under.y - end.y) * m };
        }
        // his toes: ahead in profile; turned to us, each a little out to its own side (crossed, along the leg)
        // (along the way he faces: pointing into the distance a foot shows a little up, towards us a little down)
        const toes = crossed > 0.5 ? Math.sign(end.x - joint.x) : hx * (1 - f.front) + outward * 0.75 * f.front;
        const tilt = crossed > 0.5 ? 0 : -hz * LEG.foot * 0.3;
        // (crossed, only the tip of the foot shows past the other shin, turning up a little)
        if (crossed > 0.5) return { h, joint, end, toe: { x: end.x + toes * LEG.foot * 0.45, y: end.y - 7 } };
        return { h, joint, end, toe: { x: end.x + toes * LEG.foot, y: end.y + 2 + tilt + state.toes[i] } };
    });
    // Arms (in the world: shoulders on his body, hands where they are going, or reaching)
    const arms = ['far', 'near'].map((which, i) => {
        const s = map(f, mix(SHOULDER[which].u, side(FRONT_SHOULDER[which].u), spread(f.front)), mix(SHOULDER[which].v, FRONT_SHOULDER[which].v, f.front));
        let hand = map(f, hands[which].u.x, hands[which].v.x);
        const r = springs.reach.x;
        if (which === 'near' && state.reached && r > 0.001) hand = { x: hand.x + (state.reached.x - hand.x) * r, y: hand.y + (state.reached.y - hand.y) * r };
        // in lotus: the shoulders loose, each arm opens a little out by his side (the elbow out) and comes in again
        // low, so the two hands meet in his lap, showing a little under his pelvis, over his crossed legs
        const knees = Math.min(...state.legSit), own = Math.sign(s.x - f.root.x) || (i ? 1 : -1);
        if (knees > 0.001) {
            const k = knees * knees * (3 - 2 * knees), rest = { x: f.root.x + own * LOTUS.hands, y: f.root.y + LOTUS.low };
            hand = { x: hand.x + (rest.x - hand.x) * k, y: hand.y + (rest.y - hand.y) * k };
        }
        const raised = hand.y < s.y;
        // elbows back in profile, out to their own side turned to us; down when the hand is up
        const out = (i ? -1 : 1) * face * lateral(), back = mix(-face * 0.7, out, f.front);
        // (sitting, the elbow goes out to its own side and a little down: the arm rounds softly by his side)
        // (his arms are a little longer than shoulder to lap, so the elbows open out clear of his body)
        if (Math.min(...state.legSit) > 0.5 && !raised) return { s, ...bend(s, hand, ARM.upper * LOTUS.open, ARM.fore * LOTUS.open, { x: own, y: 0.1 }) };
        const toward = raised ? { x: out * 0.5, y: 1 } : { x: back, y: 0.15 };
        return { s, ...bend(s, hand, ARM.upper, ARM.fore, toward) };
    });

    const drawArm = (a) => limb([a.s, a.joint, a.end], ARM.width);
    const seated = Math.min(...state.legSit) > 0.5 && f.front > 0.5;   // (sitting turned to us both arms are in front of him)
    if (!seated) drawArm(arms[0]);
    // Legs: behind his body, or in front of it when he sits with them crossed (as in Upekkha)
    const drawLegs = () => legs.forEach((l) => limb([l.h, l.joint, l.end, l.toe], LEG.width));
    const inFront = Math.max(...state.legSit) > 0.3;                  // crossed, his legs are in front of him
    if (!inFront) drawLegs();

    // His body
    c.save();
    c.translate(f.root.x, f.root.y); c.rotate(f.rot); c.scale(f.face, 1);
    codeBody(c, f);
    // His eyes: looking, blinking, closed
    const closed = Math.max(springs.closed.x, state.blink > 0 ? 1 : 0);
    c.globalAlpha = 1 - springs.back.x;                         // (his back to us: no eyes)
    if (springs.back.x < 0.98) EYES.forEach(([pu, pv, r], e) => {
        const u = mix(pu, FRONT_EYES[e][0], f.front), v = mix(pv, FRONT_EYES[e][1], f.front);
        const at = local(f, u + springs.lookX.x * 7, v + springs.lookY.x * 6);
        c.fillStyle = INK; c.strokeStyle = INK;
        if (closed > 0.6 && springs.closed.x > 0.5) {         // closed, as she draws them: a little arc
            // wide, shallow arcs, a little apart, as she draws them (Upekkha)
            const R = r * 3, apart = (e ? 1 : -1) * 15;
            c.lineWidth = 11; c.lineCap = 'round';
            c.beginPath(); c.arc(at.x + apart, at.y - R * 0.8, R, Math.PI * 0.27, Math.PI * 0.73); c.stroke();
        } else {
            c.beginPath(); c.ellipse(at.x, at.y, r * 0.95, r * (closed > 0.6 ? 0.18 : 0.95), 0, 0, Math.PI * 2); c.fill();
        }
    });
    c.restore();

    if (inFront) drawLegs();
    if (seated) drawArm(arms[0]);
    drawArm(arms[1]);

    // where he is on the screen, for the zoom into a card (openPortal): a little below his crown
    const mid = map(f, PIVOT.x, (rig.silhouette.crown[1] + PIVOT.y) / 2);
    const onScreen = c.getTransform().transformPoint(mid);
    sidOnScreen.x = onScreen.x / view.dpr; sidOnScreen.y = onScreen.y / view.dpr;
    const crown = c.getTransform().transformPoint(map(f, PIVOT.x, rig.silhouette.crown[1]));
    sidCrown.x = crown.x / view.dpr; sidCrown.y = crown.y / view.dpr;
    // (and his heart and the ground under him, for the seed he plants: it goes into his heart and down through him)
    const heart = c.getTransform().transformPoint(map(f, PIVOT.x, rig.silhouette.crown[1] * 0.35 + PIVOT.y * 0.65));
    const base = c.getTransform().transformPoint({ x: f.root.x, y: state.ground });
    Object.assign(sowAt, { heart: { x: heart.x / view.dpr, y: heart.y / view.dpr }, base: { x: base.x / view.dpr, y: base.y / view.dpr }, size: depth * view.k });
    if (thought.on) placeThought();

    // The rulito over his head (its canvas is bigger than the glyph, 32 x 86, by 14 all round, for its glow)
    if (state.rul && rulito.value) {
        const r = state.rul, glyph = 92, u = glyph / 32, head = map(f, PIVOT.x, rig.silhouette.crown[1]);
        const flare = r.full && r.head - r.tail > 0.9 ? Math.max(r.pop, Math.sin(performance.now() / 250) * 0.5 + 0.5) : 0;
        rulito.value.frame({ head: r.head, tail: r.tail, flare, t: performance.now() / 1000, fade: Math.min(1, (r.head - r.tail) * 14), width: glyph * view.k * scaleAt(state.d) });
        const grow = 1 + 0.2 * r.pop * r.pop, w = (32 + 28) * u * grow, h = (86 + 28) * u * grow;
        c.drawImage(rulito.value.canvas, head.x - w / 2, head.y - 40 - h + 14 * u, w, h);
    }

    if (ui.bones) {
        c.lineWidth = 2; c.strokeStyle = '#FF6F61'; c.fillStyle = '#FF6F61';
        const dot = (q) => { c.beginPath(); c.arc(q.x, q.y, 4, 0, Math.PI * 2); c.fill(); };
        for (const l of legs) { c.beginPath(); c.moveTo(l.h.x, l.h.y); c.lineTo(l.joint.x, l.joint.y); c.lineTo(l.end.x, l.end.y); c.stroke(); [l.h, l.joint, l.end].forEach(dot); }
        for (const a of arms) { c.beginPath(); c.moveTo(a.s.x, a.s.y); c.lineTo(a.joint.x, a.joint.y); c.lineTo(a.end.x, a.end.y); c.stroke(); [a.s, a.joint, a.end].forEach(dot); }
        // the spine: how his body is bent
        c.beginPath();
        for (let i = 0; i <= 10; i++) { const q = map(f, PIVOT.x, PIVOT.y - TALL * i / 10); i ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y); }
        c.stroke();
    }
    c.restore();
    world.draw(c, place, (d) => d <= state.d, { x: state.x, d: state.d });   // and what is in front of him (faint close to him)
    if (state.sowing && state.sowing.t >= SOW.fly && !still) drawSowing(c, state.sowing, toScreen(state.sowing.x, state.sowing.d));
}

// The seed he plants, once it is in him (in px of the screen): only its light, going down through him from his heart
// to the ground (his body lit softly round it), and under the ground a glow running to where it is born
const sowAt = { heart: { x: 0, y: 0 }, base: { x: 0, y: 0 }, size: 1 };
function drawSowing(c, w, to) {
    const ease = (u) => u * u * (3 - 2 * u), lerp = (a, b, u) => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });
    const rgb = w.light.map(Math.round).join(','), size = sowAt.size, t = w.t - SOW.fly;
    const light = (p, r, a) => {
        const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
        g.addColorStop(0, `rgba(255,252,236,${a})`); g.addColorStop(0.3, `rgba(${rgb},${a * 0.7})`); g.addColorStop(1, `rgba(${rgb},0)`);
        c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y, r, 0, Math.PI * 2); c.fill();
    };
    c.save();
    c.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    c.globalCompositeOperation = 'lighter';
    if (t < SOW.through) {
        const u = t / SOW.through, p = lerp(sowAt.heart, sowAt.base, ease(u)), r = 150 * size, flash = Math.max(0, 1 - u * 4);
        light(lerp(sowAt.heart, sowAt.base, 0.45), r * 1.6, 0.18 * Math.sin(Math.PI * u));
        light(p, r * (0.5 + 0.6 * flash), 0.75);
        for (let n = 1; n <= 4; n++) light(lerp(sowAt.heart, sowAt.base, ease(Math.max(0, u - n * 0.06))), r * 0.35, 0.25 / n);
    } else {
        const u = Math.min(1, (t - SOW.through) / SOW.under), p = lerp(sowAt.base, to, ease(u)), r = 120 * size;
        c.translate(p.x, p.y); c.scale(1, 0.32);
        light({ x: 0, y: 0 }, r * (1 + 0.5 * u), 0.55);
    }
    c.restore();
}

function loop(now) {
    raf = requestAnimationFrame(loop);
    if (paused) return;           // (under a card's scene)
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    update(dt, now);
    draw();
}

// (for trying him out from the browser's console)
if (typeof window !== 'undefined') window.__sid = { story, openStory, state, springs, hands, ui, world, walkTo, sit, memory, portal, portalWon, closePortal, toScreen, meditate, shoot: () => stars?.shoot(true), freeSky: () => freeSky(92, Math.min(horizon() * view.k, sidCrown.y) - 24), figure: (card) => { state.lookUp = true; state.look = 1; clearTimeout(state.figure); state.figure = setTimeout(() => {}, 1e9); requestAnimationFrame(() => requestAnimationFrame(() => stars?.constellation(constellationFigure(card), { color: RULITO_COLOURS[card] }))); } };

onMounted(() => {
    document.body.classList.add('lab-page');
    ui.touch = window.matchMedia?.('(pointer: coarse)').matches ?? false;
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    window.addEventListener('blur', release);
    resize();
    window.addEventListener('resize', resize);
    // (a shooting star that passes near sounds, as in the app's other night skies; only when the night is out)
    stars = createStarField(starCanvas.value, nightSky.value, { pace: () => state.pace, onShoot: () => { if (world.night() > 0.5 && !ui.guide) play('star'); starFell(); } });
    raf = requestAnimationFrame(loop);
    scheduleHint();
    tell('intro', 1400);
    // where they came from: the page before this one in the app (the landing's labyrinth), or nothing (a link)
    const back = window.history.state?.back;
    const standalone = window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
    visit = startWorldVisit({ from: back ? (back === '/' ? 'landing' : back.split('?')[0]) : 'direct', touch: ui.touch, webgl, standalone, visit: memory.visits });
});
onBeforeUnmount(() => {
    visit?.cardClosed(portal.won);
    visit?.finish();
    document.body.classList.remove('lab-page', 'lab-night', 'lab-portal', 'lab-story');
    document.body.style.backgroundColor = '';
    setHush(false);
    clearTimeout(portalTimer);
    setCardChord(null);
    cancelAnimationFrame(raf);
    gone = true; clearTimeout(hintTimer); clearTimeout(callTimer); clearTimeout(storyTimer); clearTimeout(pressTimer); clearTimeout(peekTimer); clearTimeout(state.figure);
    endGuide(false);
    stars?.destroy();
    window.removeEventListener('resize', resize);
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('keyup', onKey);
    window.removeEventListener('blur', release);
});
</script>

<template>
    <!-- (one root, for the route's transition: the world, fixed, and over it, in the page's flow so the window scrolls
         it as on its own page, a card opened at its place) -->
    <div class="labRoot">
    <!-- (no menu on a long press: a finger held down only guides him) -->
    <div ref="labEl" class="lab" @contextmenu.prevent>
        <div class="page"></div>
        <div ref="nightSky" class="night-sky" :style="zoomStyle"><canvas ref="starCanvas"></canvas></div>
        <!-- the rulito draws itself on its own canvas, which this scene lays over his head -->
        <Rulito ref="rulito" class="offstage" :color="rulitoColour" />
        <canvas ref="canvas" :style="zoomStyle" @pointermove="onMove" @pointerdown="onDown" @pointerup="onUp" @pointercancel="onUp"></canvas>
        <!-- what a place thinks as he comes near (thoughts.js), over it in the sky -->
        <Transition name="thought">
            <p v-if="thought.on" ref="thoughtEl" class="thought glass" :class="{ light: teaching.light }" :style="{ color: teaching.light ? null : teaching.ink }">
                {{ $i18n.locale === 'en' ? thought.en : thought.es }}
            </p>
        </Transition>
        <!-- the affirmation of the card of the place where he meditates, written by hand in the sky -->
        <Transition name="teaching">
            <p v-if="teaching.on" class="teaching glass" :class="{ light: teaching.light }" :style="{ color: teaching.light ? null : teaching.ink }">
                {{ $i18n.locale === 'en' ? teaching.en : teaching.es }}
            </p>
        </Transition>
        <!-- the app's own header: back on the left, the sound and the menu on the right -->
        <!-- (in a card opened here, the labyrinth takes the corner of the back arrow: back into the world) -->
        <Header :hasBack="portal.card == null" :hasWorld="portal.card != null" :hasMenu="true" @world="closePortal()" />
        <!-- one button, on a phone and on a computer alike: the seed, Algo Particular's mark (as in the header), sits him
             in lotus and gets him up again; he walks with the arrows or WASD, or where a click or a touch on the floor
             sends him; a touch on him makes him wave (on a computer J jumps) -->
        <!-- the three meditations (a long press on the seed, or M): 1, 3 and 5 minutes -->
        <Transition name="veil">
            <div v-if="ui.choose && !ui.peek" class="veil" @pointerdown.stop="ui.choose = false"></div>
        </Transition>
        <Transition name="choose">
            <div v-if="ui.choose" class="choose" :class="{ light: teaching.light }" role="menu">
                <button v-for="m in GUIDE_MINUTES" :key="m" class="minutes" :class="{ hover: ui.hover === m }" role="menuitem" :data-minutes="m" @click="meditate(m)">
                    <span class="dot" aria-hidden="true"></span>{{ m }} min
                </button>
            </div>
        </Transition>
        <!-- Sid's notebook (openStory): its icon over the seed, once there is something in it -->
        <Transition name="teaching">
            <button v-if="story.shown && portal.card == null" class="story-icon" :class="{ light: teaching.light, fresh: story.fresh }"
                :aria-label="$i18n.locale === 'en' ? 'Notebook' : 'Libreta'" :title="$i18n.locale === 'en' ? 'Notebook' : 'Libreta'"
                @click="openStory"><span aria-hidden="true"></span></button>
        </Transition>
        <Transition name="veil">
            <div v-if="story.open" class="story" role="dialog" :aria-label="$i18n.locale === 'en' ? 'Notebook' : 'Libreta'" @pointerdown.stop @click="closeStory">
                <!-- its two pages, as two words written in the sky: the one open glows -->
                <div class="story-tabs" role="tablist" @click.stop>
                    <button role="tab" :aria-selected="story.tab === 'thoughts'" :class="{ on: story.tab === 'thoughts' }" @click="showTab('thoughts')">{{ $i18n.locale === 'en' ? 'Thoughts' : 'Pensamientos' }}</button>
                    <button role="tab" :aria-selected="story.tab === 'herbarium'" :class="{ on: story.tab === 'herbarium' }" @click="showTab('herbarium')">{{ $i18n.locale === 'en' ? 'Herbarium' : 'Herbario' }}</button>
                </div>
                <div v-if="story.tab === 'thoughts'" class="story-card">
                    <p class="story-text">
                        <template v-for="(f, i) in FRAGMENTS" :key="i">
                            <span class="frag" :class="{ locked: !story.have.has(i), fresh: story.order.has(i) }"
                                :style="{ animationDelay: `${400 + (story.order.get(i) ?? 0) * 1300}ms` }" :aria-hidden="!story.have.has(i)">{{ $i18n.locale === 'en' ? f.en : f.es }}</span>{{ ' ' }}
                        </template>
                    </p>
                    <!-- how many have been found: one dot each, as the world's dots -->
                    <p class="story-count" :aria-label="`${story.found} / ${FRAGMENTS.length}`">
                        <span v-for="(f, i) in FRAGMENTS" :key="i" :class="{ on: i < story.found }"></span>
                    </p>
                </div>
                <div v-else class="story-card">
                    <ul class="herbarium">
                        <li v-for="h in HERBARIUM" :key="h.id" :class="{ known: story.herb.has(h.id), fresh: story.herbNew.has(h.id) }"
                            :style="{ animationDelay: `${300 + (story.herbNew.get(h.id) ?? 0) * 900}ms` }">
                            <img :src="pieceUrl(h.show)" alt="" draggable="false">
                            <span class="name">{{ story.herb.has(h.id) ? ($i18n.locale === 'en' ? h.en : h.es) : '' }}</span>
                        </li>
                    </ul>
                    <p class="story-count" :aria-label="`${story.herb.size} / ${HERBARIUM.length}`">
                        <span v-for="h in HERBARIUM" :key="h.id" :class="{ on: story.herb.has(h.id) }"></span>
                    </p>
                </div>
            </div>
        </Transition>
        <button ref="lotusEl" class="lotus glass" :class="{ on: ui.sitting, hint: ui.hint, press: ui.press, popped: ui.pop && ui.choose }" :aria-pressed="ui.sitting" aria-label="Loto" title="Loto"
            @pointerdown="seedDown" @pointermove="seedMove" @pointerup="seedUp" @pointercancel="seedUp" @click="seedClick">
            <span class="seed" aria-hidden="true"></span>
            <!-- a meditation's time going by: a line of light round the seed that closes -->
            <svg v-if="ui.guide" class="time" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="47" pathLength="1" :style="{ strokeDashoffset: (1 - guideLeft).toFixed(4) }" /></svg>
            <!-- the seeds he carries (picked up walking, planted sitting in lotus away from the places) -->
            <span v-if="ui.seeds" :key="ui.seedPop" class="count">{{ ui.seeds }}</span>
        </button>
    </div>
    <!-- the card of the place where he meditates (openPortal), as its own page shows it -->
    <Transition name="portal">
        <div v-if="portal.card != null" class="portal content cardPage">
            <CardTemplate :id="String(portal.card)" entry="lab" @rulito="portalWon" />
        </div>
    </Transition>
    </div>
</template>

<style scoped>
.lab {
    position: fixed;
    inset: 0;
    background: #F7F8F1;
    color: #143246;
    font-family: Nunito, sans-serif;
    /* a finger held down only guides him: nothing is selected, no callout (copy, look up), no magnifier */
    -webkit-user-select: none;
    user-select: none;
    -webkit-touch-callout: none;
}
canvas {
    position: relative;
    width: 100%;
    height: 100%;
    display: block;
    touch-action: none;
}
/* The page's cream under everything: the .lab itself takes the sky's colour at the top for the iPhone's status bar */
.page {
    position: absolute;
    inset: 0;
    background: #F7F8F1;
    pointer-events: none;
}
/* The cards' starry night (useStarField.js) behind the drawing, in Ciclos's teal: it shows as the yellow clears */
.offstage {
    position: absolute;
    left: -9999px;
    top: 0;
    width: 40px;
    visibility: hidden;
}
.teaching {
    position: absolute;
    left: 16px;
    right: 16px;
    top: calc(84px + env(safe-area-inset-top, 0px));
    margin: 0 auto;
    text-align: center;
    font-family: 'Caveat', 'Nunito', helvetica, sans-serif;
    font-size: clamp(30px, 7.2vw, 44px);
    line-height: 1.15;
    pointer-events: none;
    /* on the app's frosted glass (its noise and its blur, .glass), as a soft cloud: an uneven round shape that breathes
       slowly and whose edge fades into the sky, so it reads over anything (a cloud, the sun, the moon) and is not a box */
    width: fit-content;
    max-width: min(520px, calc(100% - 24px));
    padding: 32px 52px 36px;
    border: none;
    background-color: rgba(247, 248, 241, 0.62);
    box-shadow: none;
    border-radius: 46% 54% 44% 56% / 56% 46% 54% 44%;
    -webkit-mask-image: radial-gradient(closest-side, #000 80%, transparent 100%);
    mask-image: radial-gradient(closest-side, #000 80%, transparent 100%);
    animation: teaching-breath 9s ease-in-out infinite alternate;
}
.teaching.light { color: #F7F8F1; background-color: rgba(16, 30, 52, 0.5); }
@keyframes teaching-breath {
    from { border-radius: 46% 54% 44% 56% / 56% 46% 54% 44%; }
    to { border-radius: 54% 46% 56% 44% / 46% 56% 44% 54%; }
}
@media (prefers-reduced-motion: reduce) { .teaching { animation: none; } }
.teaching-enter-active { transition: opacity 1.6s ease-out, transform 1.6s ease-out; }
.teaching-leave-active { transition: opacity 0.9s ease-in; }
.teaching-enter-from { opacity: 0; transform: translateY(8px); }
.teaching-leave-to { opacity: 0; }
/* a place's thought: written by hand in the sky over it, on the app's frosted glass as the teaching's card (a soft cloud
   that breathes, its edge fading into the sky), so it reads over anything */
.thought {
    position: absolute;
    left: 0;
    top: 0;
    margin: 0;
    max-width: min(440px, calc(100vw - 32px));
    width: max-content;
    box-sizing: border-box;
    padding: 24px 40px 28px;
    text-align: center;
    font-family: 'Caveat', 'Nunito', helvetica, sans-serif;
    font-size: clamp(24px, 5.6vw, 34px);
    line-height: 1.15;
    pointer-events: none;
    border: none;
    background-color: rgba(247, 248, 241, 0.62);
    box-shadow: none;
    border-radius: 46% 54% 44% 56% / 56% 46% 54% 44%;
    -webkit-mask-image: radial-gradient(closest-side, #000 80%, transparent 100%);
    mask-image: radial-gradient(closest-side, #000 80%, transparent 100%);
}
.thought.light { color: #F7F8F1; background-color: rgba(16, 30, 52, 0.5); }
.thought-enter-active { transition: opacity 2.2s ease-out; }
.thought-leave-active { transition: opacity 1.4s ease-in; }
.thought-enter-from, .thought-leave-to { opacity: 0; }
/* the meditations' menu, as an iPhone's long press: the world dims behind a veil and the menu grows out of the seed to
   its left on a spring, on the seed's own glass (.glass, darkened a little, a cream line round it): ethereal, as the
   button; the one under the finger lights up */
.veil {
    position: absolute;
    inset: 0;
    background: rgba(20, 50, 70, 0.18);
    -webkit-backdrop-filter: blur(5px);
    backdrop-filter: blur(5px);
}
.veil-enter-active { transition: opacity 320ms ease-out; }
.veil-leave-active { transition: opacity 240ms ease-in; }
.veil-enter-from, .veil-leave-to { opacity: 0; }
.choose {
    position: absolute;
    right: 116px;
    /* (its middle level with the seed's: the button is 84 high, the menu 68) */
    bottom: calc(52px + env(safe-area-inset-bottom, 0px));
    height: 68px;
    display: flex;
    flex-direction: row;
    border-radius: 34px;
    overflow: hidden;
    background-color: rgba(20, 50, 70, 0.32);
    background-image: url('../assets/noise.png');
    -webkit-backdrop-filter: blur(18px);
    backdrop-filter: blur(18px);
    border: 1px solid rgba(247, 248, 241, 0.35);
    box-shadow: 0 4px 24px rgba(20, 50, 70, 0.18);
    color: #F7F8F1;
    /* (it grows out of the seed: from the middle of the button, to its right) */
    transform-origin: calc(100% + 54px) 50%;
}
.choose.light { background-color: rgba(28, 44, 66, 0.4); }
.minutes {
    /* the light above, the minutes under it */
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 7px;
    padding: 0 18px;
    /* (the whole height of the menu, so the words sit in its middle: the app's buttons are 48 high, style.scss) */
    height: auto;
    align-self: stretch;
    line-height: 1;
    white-space: nowrap;
    margin: 0;
    border: none;
    border-radius: 0;
    box-shadow: none;
    background: transparent;
    color: inherit;
    font-family: Nunito, sans-serif;
    font-size: 14px;
    font-weight: 600;
    text-align: center;
    cursor: pointer;
    touch-action: none;
    -webkit-tap-highlight-color: transparent;
    transition: background-color 120ms ease-out;
}
.minutes + .minutes { border-left: 1px solid rgba(247, 248, 241, 0.2); }
.minutes.hover, .minutes:active { background-color: rgba(255, 240, 200, 0.22); }
@media (hover: hover) { .minutes:hover { background-color: rgba(255, 240, 200, 0.16); } }
.minutes:focus { outline: none; }
.minutes:focus-visible { box-shadow: inset 0 0 0 2px rgba(255, 111, 97, 0.7); }
/* a little light before each, bigger the longer the meditation */
.minutes .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #FFE9A8;
    box-shadow: 0 0 8px 2px rgba(255, 220, 140, 0.8);
}
.minutes .dot { margin: 3px 0; }      /* (each light in a box 16 high, so the three words line up) */
.minutes[data-minutes="3"] .dot { width: 13px; height: 13px; margin: 1.5px 0; }
.minutes[data-minutes="5"] .dot { width: 16px; height: 16px; margin: 0; }
.choose-enter-active { transition: transform 460ms cubic-bezier(0.3, 1.45, 0.55, 1), opacity 200ms ease-out; }
.choose-leave-active { transition: transform 220ms ease-in, opacity 200ms ease-in; }
.choose-enter-from, .choose-leave-to { transform: translateX(30px) scale(0.2); opacity: 0; }
.choose-enter-active .minutes { animation: row-in 360ms ease-out both; }
.choose-enter-active .minutes:nth-child(2) { animation-delay: 40ms; }
.choose-enter-active .minutes:nth-child(1) { animation-delay: 80ms; }
@keyframes row-in { from { opacity: 0; transform: translateX(8px); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) {
    .choose-enter-active, .choose-leave-active { transition: opacity 200ms; }
    .choose-enter-from, .choose-leave-to { transform: none; }
    .choose-enter-active .minutes { animation: none; }
}
/* held, the seed sinks slowly; as the menu opens it pops back up */
.lotus.press { transform: scale(0.9); transition: transform 450ms cubic-bezier(0.4, 0, 0.6, 1), box-shadow 400ms ease-out; }
.lotus.popped { animation: seed-pop 420ms cubic-bezier(0.3, 1.6, 0.5, 1); }
@keyframes seed-pop { from { transform: scale(0.9); } 50% { transform: scale(1.08); } to { transform: scale(1); } }
/* a meditation's time, round the seed */
.lotus .time {
    position: absolute;
    inset: -3px;
    width: calc(100% + 6px);
    height: calc(100% + 6px);
    transform: rotate(-90deg);
    pointer-events: none;
}
.lotus .time circle {
    fill: none;
    stroke: rgba(255, 248, 226, 0.95);
    stroke-width: 3;
    stroke-linecap: round;
    stroke-dasharray: 1;
    filter: drop-shadow(0 0 3px rgba(255, 240, 200, 0.9));
}
.portal {
    position: relative;
    z-index: 10;                  /* (over the world, under the app's header: z-index 11) */
    height: auto;
    min-height: 100vh;
}
.portal-enter-active { transition: opacity 0.9s ease-in-out; }
.portal-leave-active { transition: opacity 1.4s ease-in-out; }
.portal-enter-from, .portal-leave-to { opacity: 0; }
.night-sky {
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    opacity: 0;
    background: #039CA8;
    pointer-events: none;
}
.night-sky canvas {
    position: absolute;
    inset: 0;
}
.lotus {
    /* on the app's frosted glass (.glass: its noise and its blur), a little darkened so the cream seed reads over a light
       sky or ground; a touch lights it up, and while he meditates it keeps a soft glow that breathes */
    position: absolute;
    right: 20px;
    bottom: calc(44px + env(safe-area-inset-bottom, 0px));
    width: 84px;
    height: 84px;
    padding: 0;
    margin: 0;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #F7F8F1;
    background-color: rgba(20, 50, 70, 0.26);
    border: 1px solid rgba(247, 248, 241, 0.35);
    box-shadow: 0 4px 24px rgba(20, 50, 70, 0.18);
    cursor: pointer;
    touch-action: none;           /* (a finger held on it slides onto the menu: the page must not take it) */
    -webkit-tap-highlight-color: transparent;
    transition: box-shadow 400ms ease-out, background-color 400ms ease-out, transform 160ms ease-out;
}
.lotus:active { transform: scale(0.94); box-shadow: 0 0 34px 6px rgba(255, 240, 200, 0.75); }
.lotus:focus { outline: none; }
.lotus:focus-visible { box-shadow: 0 0 0 4px rgba(247, 248, 241, 0.6); }
.lotus.on {
    background-color: rgba(255, 240, 200, 0.22);
    animation: lotus-glow 3.2s ease-in-out infinite alternate;
}
@keyframes lotus-glow {
    from { box-shadow: 0 0 18px 2px rgba(255, 240, 200, 0.45); }
    to { box-shadow: 0 0 40px 10px rgba(255, 240, 200, 0.8); }
}
/* the seed, in cream (glowing too while he meditates) */
.lotus .seed {
    width: 44px;
    height: 44px;
    background-color: #F7F8F1;
    -webkit-mask: url('../assets/icon/Seed.svg') center / contain no-repeat;
    mask: url('../assets/icon/Seed.svg') center / contain no-repeat;
    transition: filter 400ms ease-out;
}
.lotus.on .seed { filter: drop-shadow(0 0 6px rgba(255, 244, 214, 0.95)); }
/* the seeds he carries, on the button's rim; it pops when one is picked up */
.lotus .count {
    position: absolute;
    top: -4px;
    right: -4px;
    min-width: 28px;
    height: 28px;
    padding: 0 7px;
    border-radius: 14px;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #F7F8F1;
    color: #143246;
    font-family: Nunito, sans-serif;
    font-weight: 700;
    font-size: 15px;
    line-height: 1;
    box-shadow: 0 2px 8px rgba(20, 50, 70, 0.3);
    animation: count-pop 600ms ease-out;
}
@keyframes count-pop {
    0% { transform: scale(0.4); }
    45% { transform: scale(1.35); box-shadow: 0 0 18px 6px rgba(255, 240, 200, 0.85); }
    100% { transform: scale(1); }
}
@media (prefers-reduced-motion: reduce) { .lotus .count { animation: none; } }
/* the hint (callButton): left a while without being pressed, when the first seed comes in, at a place, the seed calls (swells, glows, and a ring of light goes out of it), twice */
.lotus::before {
    content: '';
    position: absolute;
    inset: -1px;
    border-radius: 50%;
    border: 2px solid rgba(255, 244, 214, 0.9);
    opacity: 0;
    pointer-events: none;
}
.lotus.hint { animation: lotus-call 2.2s ease-in-out 2; }
.lotus.hint::before { animation: lotus-ring 2.2s ease-out 2; }
.lotus.hint .seed { animation: seed-call 2.2s ease-in-out 2; }
@keyframes lotus-call {
    0%, 100% { transform: scale(1); box-shadow: 0 4px 24px rgba(20, 50, 70, 0.18); }
    35% { transform: scale(1.1); box-shadow: 0 0 36px 8px rgba(255, 240, 200, 0.8); }
    60% { transform: scale(1.02); }
}
@keyframes lotus-ring {
    0%, 20% { transform: scale(1); opacity: 0; }
    30% { opacity: 0.9; }
    100% { transform: scale(1.9); opacity: 0; }
}
@keyframes seed-call {
    0%, 100% { filter: none; }
    35% { filter: drop-shadow(0 0 8px rgba(255, 244, 214, 1)); }
}
@media (prefers-reduced-motion: reduce) {
    .lotus.hint, .lotus.hint::before, .lotus.hint .seed { animation: none; }
    .lotus.hint { box-shadow: 0 0 30px 6px rgba(255, 240, 200, 0.65); }
}
@media (prefers-reduced-motion: reduce) { .lotus.on { animation: none; box-shadow: 0 0 30px 6px rgba(255, 240, 200, 0.65); } }
</style>

<style>
/* a seed flying into the button or out of it to be planted (fly() in the script, made outside Vue: not scoped) */
.lab .flyer {
    position: absolute;
    left: 0;
    top: 0;
    width: 38px;
    height: 48px;
    z-index: 3;
    pointer-events: none;
    filter: drop-shadow(0 0 8px var(--seed, #FFF4D6)) drop-shadow(0 0 3px rgba(255, 244, 214, 1));
    will-change: transform;
}
.lab .flyer svg { display: block; width: 100%; height: 100%; }
/* the little burst of particles of a seed planted, as it lands */
.lab .mote {
    position: absolute;
    z-index: 3;
    border-radius: 50%;
    pointer-events: none;
    box-shadow: 0 0 6px rgba(255, 244, 214, 0.9);
}
/* the story's icon: an atom, as the app's icons (a line, round, no button round it), over the seed and in line with it;
   in the ink of his line by day, cream by night (as the header's icons); while a fragment found waits to be seen it
   breathes a soft glow */
.story-icon {
    position: absolute;
    right: 40px;
    bottom: calc(146px + env(safe-area-inset-bottom, 0px));
    width: 44px;
    height: 44px;
    padding: 0;
    margin: 0;
    border: none;
    background: none;
    color: rgba(0, 0, 0, 0.78);
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition: transform 160ms ease-out, color 600ms ease-out;
}
.story-icon.light { color: #F7F8F1; }
.story-icon span {
    display: block;
    width: 100%;
    height: 100%;
    background-color: currentColor;
    -webkit-mask: url('../assets/icon/Notebook.svg') center / contain no-repeat;
    mask: url('../assets/icon/Notebook.svg') center / contain no-repeat;
}
.story-icon:active { transform: scale(0.9); }
.story-icon:focus { outline: none; }
.story-icon:focus-visible { filter: drop-shadow(0 0 6px rgba(255, 111, 97, 0.9)); }
.story-icon.fresh { animation: story-call 2.4s ease-in-out infinite alternate; }
@keyframes story-call {
    from { filter: drop-shadow(0 0 0 rgba(255, 240, 200, 0)); }
    to { filter: drop-shadow(0 0 8px rgba(255, 240, 200, 0.95)); }
}
/* the story's page: over the dimmed world, a card of frosted cream with the story as one paragraph, written by hand;
   what is still hidden, dark bars the length of its words; what was found since it was last seen is painted in */
.story {
    position: absolute;
    inset: 0;
    z-index: 20;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: calc(84px + env(safe-area-inset-top, 0px)) 16px calc(24px + env(safe-area-inset-bottom, 0px));
    background: rgba(10, 26, 40, 0.62);
    -webkit-backdrop-filter: blur(8px);
    backdrop-filter: blur(8px);
    cursor: pointer;
}
.story-card {
    width: 100%;
    max-width: 560px;
    max-height: 100%;
    min-height: 0;
    overflow-y: auto;
    padding: 6px 10px 12px;
    -webkit-user-select: text;
    user-select: text;
}
/* the two pages' names, written in the sky: the one open in cream with a glow, as the app's icons, the other faint */
.story-tabs {
    display: flex;
    gap: 26px;
    margin: 0 0 14px;
}
.story-tabs button {
    height: auto;
    padding: 2px 4px;
    margin: 0;
    border: none;
    border-radius: 0;
    background: none;
    box-shadow: none;
    font-family: Caveat, cursive;
    font-weight: 500;
    font-size: 34px;
    line-height: 1.1;
    color: rgba(247, 248, 241, 0.45);
    cursor: pointer;
    transition: color 300ms ease-out, text-shadow 300ms ease-out;
}
.story-tabs button.on {
    color: #F7F8F1;
    text-shadow: 0 0 14px rgba(255, 240, 200, 0.85), 0 0 4px rgba(255, 244, 214, 0.6), 0 2px 3px rgba(20, 51, 72, 0.45);
}
.story-tabs button:focus { outline: none; }
.story-tabs button:focus-visible { text-shadow: 0 0 10px rgba(255, 111, 97, 0.9); }
.story-text {
    margin: 0;
    color: #F7F8F1;
    font-family: Caveat, cursive;
    font-size: 23px;
    line-height: 1.5;
    text-shadow: 0 0 12px rgba(255, 240, 200, 0.4);
}
/* what is still hidden: a line of faint stars the length of its words, breathing softly */
.frag.locked {
    color: transparent;
    background-image: radial-gradient(circle, rgba(255, 244, 214, 0.6) 0 1.2px, transparent 1.8px);
    background-size: 12px 100%;
    background-repeat: repeat-x;
    background-position: 0 58%;
    -webkit-box-decoration-break: clone;
    box-decoration-break: clone;
    -webkit-user-select: none;
    user-select: none;
    animation: frag-breathe 3.6s ease-in-out infinite alternate;
}
.frag.locked:nth-child(3n) { animation-delay: -1.2s; }
.frag.locked:nth-child(3n + 1) { animation-delay: -2.4s; }
@keyframes frag-breathe { from { opacity: 0.55; } to { opacity: 1; } }
/* found since it was last seen: its stars light up warm and give way to the words, which come into focus */
.frag.fresh {
    -webkit-box-decoration-break: clone;
    box-decoration-break: clone;
    background-size: 12px 100%;
    background-repeat: repeat-x;
    background-position: 0 58%;
    animation: frag-appear 2s ease-out both;
}
@keyframes frag-appear {
    0% { color: transparent; text-shadow: none; background-image: radial-gradient(circle, rgba(255, 244, 214, 0.6) 0 1.2px, transparent 1.8px); }
    25% { color: transparent; text-shadow: 0 0 16px rgba(255, 210, 130, 1); background-image: radial-gradient(circle, rgba(255, 210, 130, 0.95) 0 1.7px, transparent 2.3px); }
    26% { background-image: none; }
    60% { color: transparent; text-shadow: 0 0 6px rgba(255, 244, 214, 0.8); background-image: none; }
    100% { color: #F7F8F1; text-shadow: 0 0 12px rgba(255, 240, 200, 0.4); background-image: none; }
}
/* the herbarium: every plant as a dark silhouette with a faint light round it; planted once, in its colours with its name */
.herbarium {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 18px 12px;
}
.herbarium li {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
}
.herbarium img {
    width: 100%;
    max-width: 150px;
    height: 104px;
    object-fit: contain;
    filter: brightness(0) opacity(0.5) drop-shadow(0 0 1px rgba(247, 248, 241, 0.45));
    -webkit-user-drag: none;
}
.herbarium li.known img { filter: drop-shadow(0 0 10px rgba(255, 240, 200, 0.35)); }
.herbarium .name {
    min-height: 1.3em;
    font-family: Caveat, cursive;
    font-size: 21px;
    line-height: 1.2;
    text-align: center;
    color: #F7F8F1;
    text-shadow: 0 0 10px rgba(255, 240, 200, 0.4);
}
.herbarium li:not(.known) .name {
    width: 60%;
    background-image: radial-gradient(circle, rgba(255, 244, 214, 0.5) 0 1.2px, transparent 1.8px);
    background-size: 12px 100%;
    background-repeat: repeat-x;
    background-position: center 58%;
}
.herbarium li.fresh img { animation: herb-appear 1.8s ease-out both; animation-delay: inherit; }
.herbarium li.fresh .name { animation: herb-name 1.8s ease-out both; animation-delay: inherit; }
@keyframes herb-appear {
    0% { filter: brightness(0) opacity(0.5) drop-shadow(0 0 1px rgba(247, 248, 241, 0.45)); }
    35% { filter: brightness(0) invert(0.9) sepia(1) saturate(3) opacity(0.9) drop-shadow(0 0 14px rgba(255, 210, 130, 1)); }
    100% { filter: drop-shadow(0 0 10px rgba(255, 240, 200, 0.35)); }
}
@keyframes herb-name { 0%, 40% { opacity: 0; } 100% { opacity: 1; } }
.story-count {
    display: flex;
    justify-content: center;
    gap: 7px;
    margin: 18px 0 2px;
}
.story-count span {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    box-shadow: inset 0 0 0 1.2px rgba(247, 248, 241, 0.5);
}
.story-count span.on { background: #F7F8F1; box-shadow: 0 0 6px rgba(255, 240, 200, 0.8); }
@media (prefers-reduced-motion: reduce) {
    .frag.fresh, .frag.locked, .herbarium li.fresh img, .herbarium li.fresh .name { animation: none; }
    .story-icon.fresh { animation: none; filter: drop-shadow(0 0 6px rgba(255, 240, 200, 0.9)); }
}
/* The app's header over his light sky: its cream icons in the ink of his line (the header is teleported into <body>,
   so this is not scoped; body.lab-page only while the lab is open) */
body.lab-page header .navContainer button,
body.lab-page header #soundButton,
body.lab-page header #menuButton {
    filter: brightness(0) opacity(0.78);
}
body.lab-page header #menuButton.active,
body.lab-page header #soundButton.active { filter: drop-shadow(0px 2px 3px rgba(20, 51, 72, 0.56)); }
/* the sound and menu buttons stay over the open menu, so it can be closed (elsewhere their drop shadow, a filter, puts
   them over it; here, without it while the menu is open or by night, they would be left under it) */
body.lab-page header .navContainer.right { position: relative; z-index: 1; }
/* by night (and in Celebración's clearing) the icons stay cream, over the dark sky */
body.lab-page.lab-night header .navContainer button,
body.lab-page.lab-night header #soundButton,
body.lab-page.lab-night header #menuButton,
body.lab-page.lab-story header .navContainer button,
body.lab-page.lab-story header #soundButton,
body.lab-page.lab-story header #menuButton,
body.lab-page.lab-portal header .navContainer button,
body.lab-page.lab-portal header #soundButton,
body.lab-page.lab-portal header #menuButton { filter: none; }
</style>
