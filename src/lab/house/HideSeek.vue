<script setup>
// Hide and seek in Gratitud's house: Sid against another Sid (Sad), by turns. Entered by the door of the house in Sid's
// world (LabSid.vue opens it over the world, its own chunk); `/sid?casa` opens it straight away (to try it).
//
// A turn: one comes in by the door and hides (HIDE_TIME s: a touch on a thing of the room walks him there and he goes
// into it; a touch on the floor only walks him), and his feet are dusty: every step leaves a footprint (but on the rug),
// so he can go straight to his place or wander by others to mislead. Then the other looks for him, in as few looks as he
// can: a touch on a thing walks him there and he looks in it (empty: a ring of dots stays where he looked). What tells
// him where: the footprints, which fade within PRINT_FADE s of his coming in (read them quickly); a giggle as he passes
// near (GIGGLE, now and then); a foot showing if he hid in a hurry (in the last SLOPPY s); and, after SAFETY s, his place
// trembles. Found, he comes out with a hop; not found in SEEK_TIME s he comes out by himself. Each hides ROUNDS times;
// whoever needed fewer looks in all finds best (the time breaks a tie). No one loses: both celebrate at the end, and in
// Sid's world it gives a seed of Gratitud (`played`).
//
// With a friend the phone is passed between turns (the screen covered so nothing shows); with the machine the person is
// Sid and Sad plays by himself (MACHINE): he hides while the screen is covered (really walking, so he leaves footprints
// too, by one or two other places first), and looks by reading the footprints still there, or the giggle, else the
// nearest places he has not looked in.
//
// The room is drawn in code (house/room.js) and seen as Sid's world is seen; the two Sids are the same puppet (puppet.js).
import { computed, getCurrentInstance, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { createPuppet, SID_TALL } from '../puppet.js';
import { BOUNDS, ENTRY, ROOM, SPOTS, beginFrame, createSpots, drawPrints, drawRoom, drawThings, obstacles, onRug, spotAt } from './room.js';
import { play, vibrate } from '../../composables/useSound.js';

const emit = defineEmits(['close', 'played']);
const vm = getCurrentInstance().proxy;
const t = (es, en) => (vm.$i18n.locale === 'en' ? en : es);

const PLAYERS = [
    { es: 'Sid', en: 'Sid', ink: '#102A34', white: '#FBF4E4' },
    { es: 'Sad', en: 'Sad', ink: '#4E2F7A', white: '#E9DDFB' },
];
const HIDE_TIME = 20, SEEK_TIME = 60, SAFETY = 40, LOOK = 0.75, ROUNDS = 2;
const PRINT_FADE = 14, PRINT_STEP = 105, SLOPPY = 5;
const GIGGLE = { near: 450, odds: 0.6, rest: 5 };
const MACHINE = { who: 1, hide: 2.4, think: [0.4, 1.2], reads: 0.75, hear: 0.6, near: 3 };
const nameOf = (i) => t(PLAYERS[i].es, PLAYERS[i].en);

const game = reactive({
    phase: 'intro',     // intro, cover (the seeker looks away), hide, machineHide, pass (the phone is passed), count, seek, found, result
    turn: 0, clock: 0, count: 3, busy: false, hidden: null, starter: 0, mode: 'friend', ready: false, heard: false,
    looks: 0, safety: false, giggleAt: -99,
    score: [{ looks: 0, time: 0, turns: [] }, { looks: 0, time: 0, turns: [] }],
});
const hider = computed(() => (game.starter + game.turn) % 2);
const seeker = computed(() => 1 - hider.value);
const isMachine = (i) => game.mode === 'machine' && i === MACHINE.who;
const lastTurn = computed(() => game.turn === ROUNDS * 2 - 1);
const looksText = (n) => (n === 1 ? t('1 mirada', '1 look') : t(`${n} miradas`, `${n} looks`));
// who found best: fewer looks in all, then less time
const best = computed(() => {
    const [a, b] = game.score;
    if (a.looks !== b.looks) return a.looks < b.looks ? 0 : 1;
    if (Math.abs(a.time - b.time) > 0.05) return a.time < b.time ? 0 : 1;
    return null;
});
// what the line at the bottom says, in few words
const hintText = computed(() => {
    const me = game.mode === 'machine';
    if (game.phase === 'hide') return me && isMachine(seeker.value) ? t(`Escondete de ${nameOf(seeker.value)}`, `Hide from ${nameOf(seeker.value)}`) : t('Escondete', 'Hide');
    if (game.phase === 'found') {
        const turn = game.score[seeker.value].turns.at(-1);
        if (!turn) return '';
        if (turn.out) return t('Salió solo', 'He came out');
        return me && isMachine(seeker.value) ? t('Te encontró', 'Found you') : t('¡Encontrado!', 'Found!');
    }
    return me && isMachine(seeker.value) ? t(`${nameOf(seeker.value)} te busca`, `${nameOf(seeker.value)} is looking`) : t(`Buscá a ${nameOf(hider.value)}`, `Find ${nameOf(hider.value)}`);
});

const puppets = PLAYERS.map((p) => createPuppet({ ink: p.ink, white: p.white, x: ENTRY.from.x, d: ENTRY.from.d }));
const inRoom = [false, false];
const entering = [false, false];
let spots = createSpots();
const blocking = obstacles();
// the footprints of the one hiding: { x, d, a, alpha }, and how far he has walked since the last one
let prints = [], walked = 0, lastAt = null, foot = 1;

// Timers that die with the game: cleared on leaving the house and at every turn
const timers = new Set();
function later(fn, ms) { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); return id; }
const clearTimers = () => { for (const id of timers) clearTimeout(id); timers.clear(); };

// --- The camera: the whole room on the screen ---
const canvas = ref(null);
const view = { w: 1, h: 1, k: 1, dpr: 1, W: 1, H: 1, ground: 0 };
// (less perspective than the world: the room is long, and its back should not be too small)
const DEPTH = 3600, FAR = 0.55;
const CAM_D = ROOM.d0 - 150, SPAN = ROOM.d1 - CAM_D;
const cam = {
    x0: 0, cam: 0, perDepth: 1, far: CAM_D + DEPTH,
    scaleAt: (d) => 1 - (1 - FAR) * (d - CAM_D) / DEPTH,
    groundAt: (d) => view.ground - (d - CAM_D) * cam.perDepth,
};
function resize() {
    const el = canvas.value;
    if (!el) return;
    view.dpr = Math.min(window.devicePixelRatio || 1, 2);
    view.w = el.clientWidth; view.h = el.clientHeight;
    el.width = view.w * view.dpr; el.height = view.h * view.dpr;
    const touch = matchMedia('(pointer: coarse)').matches;
    // as big as Sid is in the world, unless the room would not fit: across (with a little room at its sides) or down
    const wallTop = (ROOM.wall + 70) * cam.scaleAt(ROOM.d1);
    const kWorld = 0.48 * Math.min((touch ? view.h * 0.55 : view.h * 0.62) / SID_TALL, view.w * 0.9 / 420);
    const kWide = view.w / ((ROOM.x1 - ROOM.x0 + 160) * cam.scaleAt(ROOM.d0));
    const kTall = view.h * 0.8 / (0.62 * SPAN + wallTop);
    view.k = Math.min(kWorld, kWide, kTall);
    view.W = view.w / view.k; view.H = view.h / view.k;
    // how far back the floor goes up the screen: the room fills what is left under the header and over the line at the
    // bottom (on a tall phone the camera looks from higher up)
    const top = 92 / view.k, bottom = 70 / view.k;
    cam.perDepth = Math.max(0.55, Math.min(1.05, (view.H - top - bottom - wallTop) / SPAN));
    const total = SPAN * cam.perDepth + wallTop;
    view.ground = top + Math.max(0, (view.H - top - bottom - total) / 2) + total;
    cam.x0 = view.W / 2;
}

// --- The game ---
const dist = (a, b) => Math.hypot(a.x - b.x, a.d - b.d);
function startTurn() {
    clearTimers();
    spots = createSpots();
    prints = []; walked = 0; lastAt = null;
    Object.assign(game, { hidden: null, clock: 0, busy: false, looks: 0, safety: false, heard: false, giggleAt: -99 });
    inRoom[0] = inRoom[1] = false;
    for (const p of puppets) { p.place(ENTRY.from.x, ENTRY.from.d, 0); p.state.hidden = false; p.state.show = 1; p.state.hurry = false; p.lookAt(null); p.faceTo(null); }
}
function begin(mode = game.mode) {
    game.mode = mode;
    game.turn = 0;
    game.score = [{ looks: 0, time: 0, turns: [] }, { looks: 0, time: 0, turns: [] }];
    toHiding();
}
// the turn's hiding: the seeker looks away (with a friend), or the machine hides while the screen is covered
function toHiding() {
    startTurn();
    if (isMachine(hider.value)) machineHides();
    else if (game.mode === 'machine') startHiding();
    else game.phase = 'cover';
}
function comeIn(i) {
    const p = puppets[i];
    p.place(ENTRY.from.x, ENTRY.from.d, 0);
    inRoom[i] = true; entering[i] = true;
    p.walkTo(ENTRY.to.x, ENTRY.to.d, () => { entering[i] = false; });
}
function startHiding() {
    game.phase = 'hide';
    comeIn(hider.value);
    play('flip');
}
// he leaves a footprint every step he walks while he hides, one foot then the other (none on the rug)
function track(p) {
    const s = p.state;
    if (lastAt) walked += Math.hypot(s.x - lastAt.x, s.d - lastAt.d);
    lastAt = { x: s.x, d: s.d };
    if (walked < PRINT_STEP || s.x < ROOM.x0 + 30) return;
    walked = 0; foot = -foot;
    const a = s.heading, x = s.x - Math.sin(a) * 18 * foot, d = s.d + Math.cos(a) * 18 * foot;
    if (!onRug(x, d)) prints.push({ x, d, a, alpha: 0.7 });
}
// into a hiding place: he walks there, opens it, goes in (in a hurry, a foot shows)
function hideIn(sp) {
    const p = puppets[hider.value];
    game.busy = true;
    p.state.hurry = game.clock > HIDE_TIME - 6;
    p.walkTo(sp.spot.x, sp.spot.d, () => {
        p.faceTo(Math.PI / 2);
        sp.openTo = 1;
        p.reachFor({ x: sp.x, y: -sp.h * 0.4 }, 0.5);
        later(() => {
            p.hide(() => {
                game.hidden = sp.id;
                sp.openTo = 0; sp.shake = 0.4;
                if (game.clock > HIDE_TIME - SLOPPY) sp.sloppy = true;
                play('release');
                later(() => {
                    if (game.phase !== 'hide') return;
                    inRoom[hider.value] = false;
                    // (the machine does not peek: it comes in and counts at once)
                    if (isMachine(seeker.value)) startCount(); else game.phase = 'pass';
                }, 900);
            });
        }, 420);
    });
}
// (time up while hiding: he runs into the nearest thing)
function hideNow() {
    const p = puppets[hider.value];
    hideIn([...spots].sort((a, b) => dist(a.spot, p.state) - dist(b.spot, p.state))[0]);
}
// The machine hides: really walking (all at once, unseen, while the screen is covered), by up to two other places
// first, so its footprints lead to more than one, and into a place at random
function machineHides() {
    game.phase = 'machineHide'; game.ready = false;
    play('flip');
    const p = puppets[hider.value], order = [...spots].sort(() => Math.random() - 0.5);
    const real = order[0], steps = [...order.slice(1, 1 + Math.floor(Math.random() * 3)), real];
    let entered = false, gone = false, stand = 0, time = 0;
    p.place(ENTRY.from.x, ENTRY.from.d, 0);
    p.walkTo(ENTRY.to.x, ENTRY.to.d, () => { entered = true; });
    const next = () => {
        const sp = steps.shift();
        p.faceTo(null);
        p.walkTo(sp.spot.x, sp.spot.d, () => {
            p.faceTo(Math.PI / 2);
            if (sp === real) p.hide(() => { gone = true; });
            else stand = 0.6;
        });
    };
    const dt = 1 / 30;
    for (; time < HIDE_TIME && !gone; time += dt) {
        p.update(dt, time * 1000, { obstacles: blocking, bounds: entered ? BOUNDS : null });
        if (entered) track(p);
        if (entered && !p.state.target && !p.state.action && steps.length) { if (stand > 0) stand -= dt; else next(); }
    }
    game.hidden = real.id;
    // (in a hurry, if it took him long: a foot shows)
    if (time > HIDE_TIME - SLOPPY) real.sloppy = true;
    p.state.hidden = true; p.state.show = 0;
    later(() => { if (game.phase === 'machineHide') { game.ready = true; play('release'); } }, MACHINE.hide * 1000);
}
function startCount() {
    game.phase = 'count'; game.count = 3; game.busy = false; game.clock = 0;
    inRoom[hider.value] = false;
    puppets[hider.value].state.hidden = true; puppets[hider.value].state.show = 0;
    comeIn(seeker.value);
    play('tap');
    const tick = () => {
        if (game.phase !== 'count') return;
        game.count -= 1;
        if (game.count > 0) { play('tap'); later(tick, 800); }
        else {
            play('star'); game.phase = 'seek'; game.clock = 0;
            if (isMachine(seeker.value)) later(machineSeek, 500);
        }
    };
    later(tick, 800);
}
// The machine looks for him: where it heard him, or (mostly) where the footprints it can still see lead (a place they
// reach), else one of the nearest it has not looked in
function machineSeek() {
    if (game.phase !== 'seek' || game.busy) return;
    const p = puppets[seeker.value], left = spots.filter((s) => !s.seen);
    let sp = game.heard ? spots.find((s) => s.id === game.hidden) : null;
    if (!sp && Math.random() < MACHINE.reads) {
        const led = left.filter((s) => prints.some((q) => q.alpha > 0.08 && dist(q, s.spot) < 220));
        if (led.length) sp = led.sort((a, b) => dist(a.spot, p.state) - dist(b.spot, p.state))[0];
    }
    if (!sp) {
        const near = left.sort((a, b) => dist(a.spot, p.state) - dist(b.spot, p.state)).slice(0, MACHINE.near);
        sp = near[Math.floor(Math.random() * near.length)];
    }
    if (sp) lookIn(sp, () => later(machineSeek, (MACHINE.think[0] + Math.random() * (MACHINE.think[1] - MACHINE.think[0])) * 1000));
}
function lookIn(sp, then = null) {
    const p = puppets[seeker.value];
    game.busy = true;
    sp.lit = 1;
    play('pick');
    p.walkTo(sp.spot.x, sp.spot.d, () => {
        if (game.phase !== 'seek') return;
        game.looks += 1;
        p.faceTo(Math.PI / 2);
        p.reachFor({ x: sp.x, y: -sp.h * 0.4 }, LOOK);
        sp.openTo = 1;
        later(() => {
            if (game.phase !== 'seek') return;
            if (sp.id === game.hidden) { found(sp, false); return; }
            sp.seen = true;
            play('miss');
            later(() => { sp.openTo = 0; game.busy = false; then?.(); }, 350);
        }, LOOK * 1000);
    });
}
function found(sp, out) {
    const s = seeker.value, h = hider.value;
    const looks = out ? SPOTS.length + 1 : game.looks, time = out ? SEEK_TIME : game.clock;
    const sc = game.score[s];
    sc.looks += looks; sc.time += time; sc.turns.push({ looks, time, out });
    game.phase = 'found';
    sp.openTo = 1; sp.sloppy = null;
    // he comes out beside his place, on the side away from the one looking (if the room has room there)
    const ps = puppets[s], ph = puppets[h];
    const way = ps.state.x < sp.spot.x ? 1 : -1, at = (w) => sp.spot.x + w * 260;
    const ex = at(way) > BOUNDS.x0 && at(way) < BOUNDS.x1 ? at(way) : at(-way);
    ph.place(ex, sp.spot.d + 30, -Math.PI / 2);
    inRoom[h] = true;
    ph.emerge();
    later(() => ph.hop(0.8), 350);
    play('open');
    if (out) later(() => ph.wave(), 1100);
    else { vibrate?.(30); later(() => { ps.cheer(1.6); ph.cheer(1.2); }, 400); }
    later(() => { sp.openTo = 0; }, 900);
    ps.faceTo(null); ph.faceTo(null);
    later(() => {
        if (game.phase !== 'found') return;
        if (lastTurn.value) { finish(); return; }
        game.turn += 1;
        toHiding();
    }, 3200);
}
function finish() {
    game.phase = 'result';
    play('converge');
    emit('played');
    // both in the room, together: both celebrate (the one who found best a little more)
    puppets.forEach((p, i) => {
        inRoom[i] = true; p.state.hidden = false; p.state.show = 1;
        p.walkTo(-170 + i * 340, 1150, () => { p.faceTo(null); p.cheer(best.value === i ? 2.4 : 1.6); later(() => p.hop(best.value === i ? 1 : 0.7), 600); });
    });
}
function again() {
    game.starter = 1 - game.starter;
    begin();
}

// --- Touches ---
function pointerTo(e) {
    const r = canvas.value.getBoundingClientRect();
    return { x: (e.clientX - r.left) / view.k, y: (e.clientY - r.top) / view.k };
}
function floorAt(p) {
    const d = CAM_D + (view.ground - p.y) / cam.perDepth;
    return { x: cam.cam + (p.x - cam.x0) / cam.scaleAt(d), d };
}
function onDown(e) {
    const who = game.phase === 'hide' ? hider.value : game.phase === 'seek' ? seeker.value : null;
    if (who == null || isMachine(who) || game.busy || entering[who]) return;
    const p = pointerTo(e), sp = spotAt(spots, p);
    if (sp) {
        if (game.phase === 'hide') hideIn(sp);
        else if (!sp.seen) lookIn(sp);
        else { sp.lit = 0.6; play('miss'); }
        return;
    }
    const at = floorAt(p);
    if (at.d > ROOM.d0 && at.d < ROOM.d1) puppets[who].walkTo(Math.max(BOUNDS.x0, Math.min(BOUNDS.x1, at.x)), Math.max(BOUNDS.d0, Math.min(BOUNDS.d1, at.d)));
}
function onKey(e) {
    if (e.key === 'Escape') emit('close');
}

// --- The loop ---
let raf = 0, last = 0;
function update(dt, now) {
    if (game.phase === 'hide' && !game.hidden) {
        game.clock += dt;
        if (game.clock >= HIDE_TIME && !game.busy) hideNow();
        if (!entering[hider.value]) track(puppets[hider.value]);
    }
    if (game.phase === 'seek') {
        game.clock += dt;
        const sp = spots.find((s) => s.id === game.hidden), p = puppets[seeker.value];
        // passing near him, now and then he cannot help a giggle: his place trembles a little
        if (sp && dist(p.state, sp.spot) < GIGGLE.near && game.clock - game.giggleAt > GIGGLE.rest) {
            game.giggleAt = game.clock;
            if (Math.random() < GIGGLE.odds) { sp.shake = 0.35; play('tap'); if (isMachine(seeker.value) && Math.random() < MACHINE.hear) game.heard = true; }
        }
        if (sp && !game.safety && game.clock >= SAFETY) { game.safety = true; sp.shake = 0.8; play('tap'); if (isMachine(seeker.value)) game.heard = true; }
        if (sp && game.clock >= SEEK_TIME) found(sp, true);
    }
    // the footprints fade once he is looking (read them quickly)
    const fade = game.phase === 'seek' ? Math.max(0, 1 - game.clock / PRINT_FADE) : ['hide', 'count'].includes(game.phase) ? 1 : 0;
    for (const q of prints) q.alpha = 0.7 * fade;
    for (const sp of spots) {
        sp.open += (sp.openTo - sp.open) * Math.min(1, dt * 9);
        sp.shake = Math.max(0, sp.shake - dt);
        sp.lit = Math.max(0, sp.lit - dt * 1.5);
    }
    puppets.forEach((p, i) => { if (inRoom[i]) p.update(dt, now, { obstacles: blocking, bounds: entering[i] ? null : BOUNDS }); });
    if (game.phase === 'found' || game.phase === 'result') puppets.forEach((p, i) => { const o = puppets[1 - i]; p.lookAt({ x: o.state.x, y: -420 }); });
    // (the room is all on the screen; were it not, the camera would follow whoever plays)
    const active = [0, 1].filter((i) => inRoom[i]);
    if (active.length) {
        const x = active.reduce((a, i) => a + puppets[i].state.x, 0) / active.length;
        const most = Math.max(0, ((ROOM.x1 - ROOM.x0) / 2 + 80) * cam.scaleAt(ROOM.d0) - view.W / 2) / cam.scaleAt(ROOM.d0);
        cam.cam += (Math.max(-most, Math.min(most, x)) - cam.cam) * Math.min(1, dt * 2.2);
    }
}
function draw(now) {
    const el = canvas.value, c = el.getContext('2d'), k = view.k * view.dpr;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, el.width, el.height);
    c.setTransform(k, 0, 0, k, 0, 0);
    beginFrame();
    const tt = now / 1000;
    drawRoom(c, cam, view, tt);
    drawPrints(c, cam, prints);
    const order = puppets.map((p, i) => ({ p, i })).filter(({ i }) => inRoom[i]);
    drawThings(c, cam, spots, tt, (d0, d1) => {
        for (const { p } of order) if (p.state.d >= d0 && p.state.d < d1) p.draw(c, cam);
    }, PLAYERS[hider.value]);
}
function loop(now) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    update(dt, now);
    draw(now);
}

onMounted(() => {
    // (to look at from the console, and for the tests)
    if (typeof window !== 'undefined') window.__house = { game, prints: () => prints, puppets, spots: () => spots };
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('keydown', onKey);
    startTurn();
    raf = requestAnimationFrame(loop);
});
onBeforeUnmount(() => {
    clearTimers();
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
    window.removeEventListener('keydown', onKey);
});
</script>

<template>
    <div class="house" @contextmenu.prevent>
        <canvas ref="canvas" @pointerdown="onDown"></canvas>

        <!-- at the bottom: who plays, and how it goes (few words) -->
        <Transition name="fade">
            <div v-if="['hide', 'seek', 'found'].includes(game.phase)" class="line glass">
                <span class="who" :style="{ background: PLAYERS[game.phase === 'hide' ? hider : seeker].white, borderColor: PLAYERS[game.phase === 'hide' ? hider : seeker].ink }"></span>
                <span class="what">{{ hintText }}</span>
                <span v-if="game.phase === 'hide'" class="time">{{ Math.max(0, Math.ceil(HIDE_TIME - game.clock)) }}</span>
                <span v-else class="eyes" :aria-label="looksText(game.looks)">
                    <span v-for="n in SPOTS.length" :key="n" :class="{ on: n <= game.looks }"></span>
                </span>
            </div>
        </Transition>
        <Transition name="fade">
            <div v-if="game.phase === 'count'" :key="game.count" class="count">{{ game.count }}</div>
        </Transition>

        <!-- between the turns: over everything, so nothing of the room shows while the phone is passed -->
        <Transition name="fade">
            <div v-if="['intro', 'cover', 'pass', 'machineHide', 'result'].includes(game.phase)" class="cover" :class="{ see: game.phase === 'intro' || game.phase === 'result' }">
                <div class="card">
                    <template v-if="game.phase === 'intro'">
                        <h2>{{ t('Escondidas', 'Hide and seek') }}</h2>
                        <p class="players">
                            <span v-for="(p, i) in PLAYERS" :key="i" class="player"><span class="who" :style="{ background: p.white, borderColor: p.ink }"></span>{{ nameOf(i) }}</span>
                        </p>
                        <p class="soft">{{ t('Uno se esconde, el otro busca. Seguí sus huellas antes de que se borren.', 'One hides, the other seeks. Follow the footprints before they fade.') }}</p>
                        <div class="buttons">
                            <button class="go glass" @click="begin('friend')">{{ t('Con un amigo', 'With a friend') }}</button>
                            <button class="go glass" @click="begin('machine')">{{ t('Con la máquina', 'With the machine') }}</button>
                        </div>
                    </template>
                    <template v-else-if="game.phase === 'cover'">
                        <h2><span class="who big" :style="{ background: PLAYERS[hider].white, borderColor: PLAYERS[hider].ink }"></span></h2>
                        <p>{{ t(`Se esconde ${nameOf(hider)}.`, `${nameOf(hider)} hides.`) }}</p>
                        <p class="soft">{{ t(`${nameOf(seeker)}, no mires.`, `${nameOf(seeker)}, don't look.`) }}</p>
                        <button class="go glass" @click="startHiding">{{ t('Listo', 'Ready') }}</button>
                    </template>
                    <template v-else-if="game.phase === 'machineHide'">
                        <h2><span class="who big" :style="{ background: PLAYERS[hider].white, borderColor: PLAYERS[hider].ink }"></span></h2>
                        <p>{{ game.ready ? t(`${nameOf(hider)} ya se escondió.`, `${nameOf(hider)} has hidden.`) : t(`${nameOf(hider)} se está escondiendo…`, `${nameOf(hider)} is hiding…`) }}</p>
                        <button class="go glass" :disabled="!game.ready" :class="{ waiting: !game.ready }" @click="startCount">{{ t('A buscar', 'Go seek') }}</button>
                    </template>
                    <template v-else-if="game.phase === 'pass'">
                        <h2><span class="who big" :style="{ background: PLAYERS[seeker].white, borderColor: PLAYERS[seeker].ink }"></span></h2>
                        <p>{{ t(`Pasale el teléfono a ${nameOf(seeker)}.`, `Pass the phone to ${nameOf(seeker)}.`) }}</p>
                        <button class="go glass" @click="startCount">{{ t('A buscar', 'Go seek') }}</button>
                    </template>
                    <template v-else-if="game.phase === 'result'">
                        <h2>{{ t('¡Bien jugado!', 'Well played!') }}</h2>
                        <p v-for="(p, i) in PLAYERS" :key="i" class="score" :class="{ best: best === i }">
                            <span class="who" :style="{ background: p.white, borderColor: p.ink }"></span>{{ nameOf(i) }}: {{ looksText(game.score[i].looks) }}
                        </p>
                        <p class="soft">{{ best == null ? t('Los dos encontraron igual de bien.', 'Both found just as well.') : game.mode === 'machine' && best === 0 ? t('Encontraste mejor vos.', 'You found best.') : t(`${nameOf(best)} encontró mejor.`, `${nameOf(best)} found best.`) }}</p>
                        <div class="buttons">
                            <button class="go glass" @click="again">{{ t('Otra vez', 'Again') }}</button>
                            <button class="go glass soft" @click="emit('close')">{{ t('Volver al mundo', 'Back to the world') }}</button>
                        </div>
                    </template>
                </div>
            </div>
        </Transition>
    </div>
</template>

<style scoped>
.house {
    position: fixed;
    inset: 0;
    z-index: 10;                  /* (over the world, under the app's header: z-index 11) */
    background: #73CBCF;
    color: #102A34;
    font-family: Nunito, sans-serif;
    -webkit-user-select: none;
    user-select: none;
    -webkit-touch-callout: none;
    touch-action: none;
}
canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.who {
    display: inline-block;
    width: 20px;
    height: 24px;
    border-radius: 50% 50% 46% 46% / 60% 60% 40% 40%;
    border: 4px solid;
    vertical-align: middle;
    margin-right: 8px;
}
.who.big { width: 54px; height: 64px; border-width: 7px; margin: 0; }
/* the line at the bottom: who plays, and the time to hide or the looks so far, one dot each */
.line {
    position: absolute;
    bottom: calc(18px + env(safe-area-inset-bottom, 0px));
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 18px;
    border-radius: 999px;
    background-color: rgba(251, 244, 228, 0.78);
    white-space: nowrap;
    pointer-events: none;
}
.line .what { font-size: 16px; }
.line .time { font-family: Caveat, cursive; font-size: 30px; line-height: 1; min-width: 1.4ch; text-align: right; }
.line .eyes { display: flex; gap: 5px; }
.line .eyes span { width: 9px; height: 9px; border-radius: 50%; border: 2px solid #102A34; opacity: 0.35; }
.line .eyes span.on { background: #102A34; opacity: 1; }
.count {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    font-family: Caveat, cursive;
    font-size: 160px;
    color: #FBF4E4;
    text-shadow: 0 0 24px rgba(16, 42, 52, 0.6);
    pointer-events: none;
}
/* between turns the room is covered (no peeking); at the start and at the end it shows, dimmed, behind the words */
.cover {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    padding: 90px 16px 40px;
    background: #0C666E;
    color: #FBF4E4;
}
.cover.see { background: rgba(12, 102, 110, 0.8); }
.card { max-width: 420px; text-align: center; }
.card h2 { color: #FBF4E4; font-family: Caveat, cursive; font-size: clamp(44px, 12vw, 64px); font-weight: 400; margin: 0 0 12px; }
.card p { font-size: 19px; line-height: 1.4; margin: 0 0 12px; }
.card p.soft { opacity: 0.85; font-size: 17px; }
.players { display: flex; justify-content: center; gap: 24px; }
.score { font-family: Caveat, cursive; font-size: 30px !important; }
.score.best { color: #FBC390; }
.buttons { display: flex; flex-direction: column; align-items: center; gap: 10px; margin-top: 8px; }
.go {
    padding: 12px 34px;
    border: none;
    border-radius: 999px;
    background-color: rgba(251, 244, 228, 0.92);
    color: #102A34;
    font: 600 18px Nunito, sans-serif;
    cursor: pointer;
}
.go.waiting { opacity: 0.4; cursor: default; }
.go.soft { background-color: rgba(251, 244, 228, 0.35); color: #FBF4E4; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.35s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
