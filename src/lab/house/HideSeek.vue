<script setup>
// Hide and seek in Gratitud's house: Sid against another Sid, on one phone, by turns. Entered by the door of the house in
// Sid's world (LabSid.vue opens it over the world, its own chunk); `/sid?casa` opens it straight away (to try it).
//
// A round: one Sid comes in and hides (HIDE_TIME s: a touch on a thing of the room, the wardrobe, the curtain, the bed,
// the sofa, the table, the chest or the screen, walks him there and he goes into it; a touch on the floor only walks
// him); then the screen is covered and the phone is passed (nothing of the room shows); the other comes in and looks
// for him, against the clock: a touch on a thing walks him there and he looks in it (empty: a ring of dots stays on the
// floor where he looked). Now and then the one hiding moves a little (his place trembles, HINTS). Found, he comes out
// with a hop; not found in SEEK_TIME s he comes out by himself, and the time counts as SEEK_TIME. The next round is
// the other way round; the one who found faster wins.
//
// The room is drawn in code (house/room.js) and seen as Sid's world is seen (a floor in perspective, the camera high,
// following whoever is playing across); the two Sids are the same puppet (puppet.js) in their own colours.
import { computed, getCurrentInstance, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { createPuppet, SID_TALL } from '../puppet.js';
import { BOUNDS, ENTRY, createSpots, drawRoom, drawThings, obstacles, spotAt, ROOM } from './room.js';
import { play, vibrate } from '../../composables/useSound.js';

const emit = defineEmits(['close']);
const vm = getCurrentInstance().proxy;
const t = (es, en) => (vm.$i18n.locale === 'en' ? en : es);

// The two players: Sid in the ink and white of Gratitud (as he is in its zone of the world), and Sad, a Sid in the
// purple of the house
const PLAYERS = [
    { es: 'Sid', en: 'Sid', ink: '#102A34', white: '#FBF4E4' },
    { es: 'Sad', en: 'Sad', ink: '#4E2F7A', white: '#E9DDFB' },
];
const HIDE_TIME = 20, SEEK_TIME = 60, HINTS = [20, 40], LOOK = 0.75;
const nameOf = (i) => t(PLAYERS[i].es, PLAYERS[i].en);

const game = reactive({
    phase: 'intro',     // intro, cover (before hiding: the seeker looks away), hide, pass (the phone is passed), count, seek, found, result
    round: 0, clock: 0, count: 3, times: [null, null], timedOut: [false, false], busy: false, hidden: null, starter: 0, hints: 0,
});
const hider = computed(() => (game.starter + game.round) % 2);
const seeker = computed(() => 1 - hider.value);
const clockText = computed(() => {
    if (game.phase === 'hide') return String(Math.max(0, Math.ceil(HIDE_TIME - game.clock)));
    return Math.min(SEEK_TIME, game.clock).toFixed(1).replace('.', t(',', '.'));
});
const fmt = (s) => s.toFixed(1).replace('.', t(',', '.'));
const winner = computed(() => {
    const [a, b] = game.times;
    if (a == null || b == null || Math.abs(a - b) < 0.05) return null;
    return a < b ? 0 : 1;
});

const puppets = PLAYERS.map((p) => createPuppet({ ink: p.ink, white: p.white, x: ENTRY.from.x, d: ENTRY.from.d }));
const inRoom = [false, false];
const entering = [false, false];
let spots = createSpots();
const blocking = obstacles();

const canvas = ref(null);
const view = { w: 1, h: 1, k: 1, dpr: 1, W: 1, H: 1, ground: 0, floor: 1 };
const DEPTH = 2200, FAR = 0.5;
const CAM_D = ROOM.d0 - 150;
const cam = {
    x0: 0, cam: 0, perDepth: 1, far: CAM_D + DEPTH,
    scaleAt: (d) => 1 - (1 - FAR) * (d - CAM_D) / DEPTH,
    groundAt: (d) => view.ground - (d - CAM_D) / DEPTH * view.floor,
};
function resize() {
    const el = canvas.value;
    if (!el) return;
    view.dpr = Math.min(window.devicePixelRatio || 1, 2);
    view.w = el.clientWidth; view.h = el.clientHeight;
    el.width = view.w * view.dpr; el.height = view.h * view.dpr;
    const touch = matchMedia('(pointer: coarse)').matches;
    // (Sid as big as in the world: about half the screen's height, times 0.48)
    view.k = 0.48 * Math.min((touch ? view.h * 0.55 : view.h * 0.62) / SID_TALL, view.w * 0.9 / 420);
    view.W = view.w / view.k; view.H = view.h / view.k;
    // the front of the room near the bottom of the screen and the foot of its back wall a third of the way down
    view.ground = view.H * 0.92;
    view.floor = view.H * 0.56 * DEPTH / (ROOM.d1 - CAM_D);
    cam.x0 = view.W / 2; cam.perDepth = view.floor / DEPTH;
}

// --- The game ---
function startRound() {
    spots = createSpots();
    game.hidden = null; game.clock = 0; game.busy = false;
    inRoom[0] = inRoom[1] = false;
    for (const p of puppets) { p.place(ENTRY.from.x, ENTRY.from.d, 0); p.state.hidden = false; p.state.show = 1; p.lookAt(null); p.faceTo(null); }
}
function begin() {
    game.round = 0; game.times = [null, null]; game.timedOut = [false, false];
    startRound();
    game.phase = 'cover';
}
function comeIn(i) {
    const p = puppets[i];
    p.place(ENTRY.from.x, ENTRY.from.d, 0);
    inRoom[i] = true; entering[i] = true;
    p.walkTo(ENTRY.to.x, ENTRY.to.d, () => { entering[i] = false; });
    cam.cam = ENTRY.to.x + 300;
}
function startHiding() {
    startRound();
    game.phase = 'hide';
    comeIn(hider.value);
    play('flip');
}
function hideIn(sp) {
    const p = puppets[hider.value];
    game.busy = true;
    p.state.hurry = game.clock > HIDE_TIME - 6;
    p.walkTo(sp.spot.x, sp.spot.d, () => {
        p.faceTo(Math.PI / 2);
        sp.openTo = 1;
        p.reachFor({ x: sp.x, y: -sp.h * 0.4 }, 0.5);
        setTimeout(() => {
            if (game.phase !== 'hide') return;
            p.hide(() => {
                game.hidden = sp.id;
                sp.openTo = 0; sp.shake = 0.4;
                play('release');
                setTimeout(() => { if (game.phase === 'hide') { game.phase = 'pass'; inRoom[hider.value] = false; } }, 900);
            });
        }, 420);
    });
}
// (time up while hiding: he runs into the nearest thing)
function hideNow() {
    const p = puppets[hider.value];
    const near = [...spots].sort((a, b) => Math.hypot(a.spot.x - p.state.x, a.spot.d - p.state.d) - Math.hypot(b.spot.x - p.state.x, b.spot.d - p.state.d))[0];
    hideIn(near);
}
function startCount() {
    game.phase = 'count'; game.count = 3; game.busy = false;
    inRoom[hider.value] = false;
    puppets[hider.value].state.hidden = true; puppets[hider.value].state.show = 0;
    comeIn(seeker.value);
    play('tap');
    const tick = () => {
        if (game.phase !== 'count') return;
        game.count -= 1;
        if (game.count > 0) { play('tap'); setTimeout(tick, 800); }
        else { play('star'); game.phase = 'seek'; game.clock = 0; game.hints = 0; }
    };
    setTimeout(tick, 800);
}
function lookIn(sp) {
    const p = puppets[seeker.value];
    game.busy = true;
    sp.lit = 1;
    play('pick');
    p.walkTo(sp.spot.x, sp.spot.d, () => {
        if (game.phase !== 'seek') return;
        p.faceTo(Math.PI / 2);
        p.reachFor({ x: sp.x, y: -sp.h * 0.4 }, LOOK);
        sp.openTo = 1;
        setTimeout(() => {
            if (game.phase !== 'seek') return;
            if (sp.id === game.hidden) { found(sp, false); return; }
            sp.seen = true;
            play('miss');
            setTimeout(() => { sp.openTo = 0; game.busy = false; }, 350);
        }, LOOK * 1000);
    });
}
function found(sp, timedOut) {
    const s = seeker.value, h = hider.value;
    game.times[s] = timedOut ? SEEK_TIME : game.clock;
    game.timedOut[s] = timedOut;
    game.phase = 'found';
    sp.openTo = 1;
    // he comes out beside his place, on the side away from the one looking (if the room has room there)
    const ps = puppets[s], ph = puppets[h];
    const way = ps.state.x < sp.spot.x ? 1 : -1, side = (w) => sp.spot.x + w * 260;
    const ex = side(way) > BOUNDS.x0 && side(way) < BOUNDS.x1 ? side(way) : side(-way);
    ph.place(ex, sp.spot.d + 30, -Math.PI / 2);
    inRoom[h] = true;
    ph.emerge();
    setTimeout(() => ph.hop(0.8), 350);
    if (timedOut) {
        play('open');
        setTimeout(() => ph.wave(), 1100);
    } else {
        play('open');
        vibrate?.(30);
        setTimeout(() => ps.cheer(1.6), 200);
    }
    setTimeout(() => { sp.openTo = 0; }, 900);
    // (they look at each other)
    ps.faceTo(null); ph.faceTo(null);
    setTimeout(() => { if (game.phase !== 'found') return; game.round === 0 ? (game.phase = 'cover2') : finish(); }, 3200);
}
function finish() {
    game.phase = 'result';
    play('converge');
    // both in the room, the winner cheering
    const w = winner.value;
    puppets.forEach((p, i) => { inRoom[i] = true; p.state.hidden = false; p.state.show = 1; p.walkTo(-260 + i * 520, 560, () => { p.faceTo(null); if (w === i) p.cheer(2.2); else if (w == null) p.wave(); }); });
}
function nextRound() {
    game.round = 1;
    startHiding();
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
// a point of the screen on the floor
function floorAt(p) {
    const d = CAM_D + (view.ground - p.y) / view.floor * DEPTH;
    const x = cam.cam + (p.x - cam.x0) / cam.scaleAt(d);
    return { x, d };
}
function onDown(e) {
    const who = game.phase === 'hide' ? hider.value : game.phase === 'seek' ? seeker.value : null;
    if (who == null || game.busy || entering[who]) return;
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
    }
    if (game.phase === 'seek') {
        game.clock += dt;
        // the one hiding moves a little now and then: his place trembles
        if (game.hints < HINTS.length && game.clock >= HINTS[game.hints]) {
            game.hints += 1;
            const sp = spots.find((s) => s.id === game.hidden);
            if (sp) { sp.shake = 0.7; play('tap'); }
        }
        if (game.clock >= SEEK_TIME) found(spots.find((s) => s.id === game.hidden), true);
    }
    for (const sp of spots) {
        sp.open += (sp.openTo - sp.open) * Math.min(1, dt * 9);
        sp.shake = Math.max(0, sp.shake - dt);
        sp.lit = Math.max(0, sp.lit - dt * 1.5);
    }
    puppets.forEach((p, i) => {
        if (!inRoom[i]) return;
        p.update(dt, now, { obstacles: blocking, bounds: entering[i] ? null : BOUNDS });
    });
    // they look at each other once he is found, and at the end
    if (game.phase === 'found' || game.phase === 'result') {
        puppets.forEach((p, i) => { const o = puppets[1 - i]; p.lookAt({ x: o.state.x, y: -420 }); });
    }
    // the camera follows whoever plays (both, once he is found)
    const active = game.phase === 'hide' ? [hider.value] : ['count', 'seek'].includes(game.phase) ? [seeker.value] : [0, 1].filter((i) => inRoom[i]);
    if (active.length) {
        const x = active.reduce((a, i) => a + puppets[i].state.x, 0) / active.length;
        const most = Math.max(0, (ROOM.x1 - ROOM.x0) * cam.scaleAt(ROOM.d1) / 2 - view.W * 0.42) / cam.scaleAt(ROOM.d1);
        const to = Math.max(-most, Math.min(most, x));
        cam.cam += (to - cam.cam) * Math.min(1, dt * 2.2);
    }
}
function draw(now) {
    const el = canvas.value, c = el.getContext('2d'), k = view.k * view.dpr;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, el.width, el.height);
    c.setTransform(k, 0, 0, k, 0, 0);
    const tt = now / 1000;
    drawRoom(c, cam, view, tt);
    // (who stands where, drawn among the things at their depth)
    const order = puppets.map((p, i) => ({ p, i })).filter(({ i }) => inRoom[i]);
    drawThings(c, cam, spots, tt, (d0, d1) => {
        for (const { p } of order) if (p.state.d >= d0 && p.state.d < d1) p.draw(c, cam);
    });
}
function loop(now) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    update(dt, now);
    draw(now);
}

onMounted(() => {
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('keydown', onKey);
    startRound();
    // (the room is seen from the start, empty, under the words that open it)
    cam.cam = 0;
    raf = requestAnimationFrame(loop);
});
onBeforeUnmount(() => {
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
    window.removeEventListener('keydown', onKey);
});
</script>

<template>
    <div class="house" @contextmenu.prevent>
        <canvas ref="canvas" @pointerdown="onDown"></canvas>

        <!-- the clock, and who plays -->
        <Transition name="fade">
            <div v-if="['hide', 'seek'].includes(game.phase)" class="clock glass" :class="{ late: game.phase === 'hide' && game.clock > HIDE_TIME - 5 }">
                <span class="who" :style="{ background: PLAYERS[game.phase === 'hide' ? hider : seeker].white, borderColor: PLAYERS[game.phase === 'hide' ? hider : seeker].ink }"></span>
                <span class="what">{{ game.phase === 'hide' ? t('Escondete', 'Hide') : t(`Buscá a ${nameOf(hider)}`, `Find ${nameOf(hider)}`) }}</span>
                <span class="time">{{ clockText }}</span>
            </div>
        </Transition>
        <Transition name="fade">
            <div v-if="game.phase === 'count'" :key="game.count" class="count">{{ game.count }}</div>
        </Transition>

        <!-- the words between the turns: over everything, so nothing of the room shows while the phone is passed -->
        <Transition name="fade">
            <div v-if="['intro', 'cover', 'pass', 'cover2', 'result'].includes(game.phase)" class="cover" :class="{ see: game.phase === 'intro' || game.phase === 'result' }">
                <div class="card">
                    <template v-if="game.phase === 'intro'">
                        <h2>{{ t('Escondidas', 'Hide and seek') }}</h2>
                        <p>{{ t('Uno se esconde y el otro lo busca. Después al revés. Gana el que encuentra más rápido.', 'One hides and the other seeks. Then the other way round. Whoever finds faster wins.') }}</p>
                        <p class="players">
                            <span v-for="(p, i) in PLAYERS" :key="i" class="player"><span class="who" :style="{ background: p.white, borderColor: p.ink }"></span>{{ nameOf(i) }}</span>
                        </p>
                        <button class="go glass" @click="begin">{{ t('Jugar', 'Play') }}</button>
                    </template>
                    <template v-else-if="game.phase === 'cover' || game.phase === 'cover2'">
                        <h2><span class="who big" :style="{ background: PLAYERS[game.phase === 'cover2' ? seeker : hider].white, borderColor: PLAYERS[game.phase === 'cover2' ? seeker : hider].ink }"></span></h2>
                        <p v-if="game.phase === 'cover2'" class="done">{{ game.timedOut[seeker] ? t(`${nameOf(seeker)} no lo encontró: ${SEEK_TIME} s.`, `${nameOf(seeker)} did not find him: ${SEEK_TIME} s.`) : t(`${nameOf(seeker)} lo encontró en ${fmt(game.times[seeker])} s.`, `${nameOf(seeker)} found him in ${fmt(game.times[seeker])} s.`) }}</p>
                        <p>{{ t(`Ahora se esconde ${nameOf(game.phase === 'cover2' ? seeker : hider)}.`, `Now ${nameOf(game.phase === 'cover2' ? seeker : hider)} hides.`) }}</p>
                        <p class="soft">{{ t(`${nameOf(game.phase === 'cover2' ? hider : seeker)}, no mires.`, `${nameOf(game.phase === 'cover2' ? hider : seeker)}, don't look.`) }} {{ t(`Hay ${HIDE_TIME} segundos.`, `There are ${HIDE_TIME} seconds.`) }}</p>
                        <button class="go glass" @click="game.phase === 'cover2' ? nextRound() : startHiding()">{{ t('Listo', 'Ready') }}</button>
                    </template>
                    <template v-else-if="game.phase === 'pass'">
                        <h2><span class="who big" :style="{ background: PLAYERS[seeker].white, borderColor: PLAYERS[seeker].ink }"></span></h2>
                        <p>{{ t(`Pasale el teléfono a ${nameOf(seeker)}.`, `Pass the phone to ${nameOf(seeker)}.`) }}</p>
                        <p class="soft">{{ t(`Buscá a ${nameOf(hider)}: tocá las cosas de la casa para mirar. El reloj corre.`, `Find ${nameOf(hider)}: touch the things in the house to look. The clock runs.`) }}</p>
                        <button class="go glass" @click="startCount">{{ t('A buscar', 'Go seek') }}</button>
                    </template>
                    <template v-else-if="game.phase === 'result'">
                        <h2>{{ winner == null ? t('Empate', 'A tie') : t(`¡Ganó ${nameOf(winner)}!`, `${nameOf(winner)} wins!`) }}</h2>
                        <p v-for="(p, i) in PLAYERS" :key="i" class="score" :class="{ won: winner === i }">
                            <span class="who" :style="{ background: p.white, borderColor: p.ink }"></span>{{ nameOf(i) }}:
                            {{ game.timedOut[i] ? t(`no lo encontró (${SEEK_TIME} s)`, `did not find him (${SEEK_TIME} s)`) : `${fmt(game.times[i])} s` }}
                        </p>
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
    width: 22px;
    height: 22px;
    border-radius: 50% 50% 46% 46% / 60% 60% 40% 40%;
    border: 4px solid;
    vertical-align: middle;
    margin-right: 8px;
}
.who.big { width: 54px; height: 64px; border-width: 7px; margin: 0; }
.clock {
    position: absolute;
    top: calc(74px + env(safe-area-inset-top, 0px));
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 20px;
    border-radius: 999px;
    background-color: rgba(251, 244, 228, 0.72);
    white-space: nowrap;
    pointer-events: none;
}
.clock .what { font-size: 17px; }
.clock .time { font-family: Caveat, cursive; font-size: 34px; line-height: 1; min-width: 2.4ch; text-align: right; }
.clock.late .time { color: #D85A5E; }
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
.card { max-width: 440px; text-align: center; }
.card h2 { color: #FBF4E4; font-family: Caveat, cursive; font-size: clamp(44px, 12vw, 64px); font-weight: 400; margin: 0 0 12px; }
.card p { font-size: 19px; line-height: 1.4; margin: 0 0 12px; }
.card p.soft { opacity: 0.8; font-size: 17px; }
.card p.done { font-family: Caveat, cursive; font-size: 30px; }
.players { display: flex; justify-content: center; gap: 24px; }
.score { font-family: Caveat, cursive; font-size: 30px !important; }
.score.won { color: #FBC390; }
.buttons { display: flex; flex-direction: column; align-items: center; gap: 10px; }
.go {
    margin-top: 14px;
    padding: 12px 34px;
    border: none;
    border-radius: 999px;
    background-color: rgba(251, 244, 228, 0.92);
    color: #102A34;
    font: 600 18px Nunito, sans-serif;
    cursor: pointer;
}
.go.soft { background-color: rgba(251, 244, 228, 0.35); color: #FBF4E4; margin-top: 0; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.35s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
