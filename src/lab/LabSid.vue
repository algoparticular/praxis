<script setup>
// The puppet lab: Sid (who is also Particular) as a puppet, to try how much more he can move than breathe. Only in
// development (/lab/sid, see the router), never in the build. His body is his drawing (cut out of Nekkhamma's Sid by
// scripts/make-sid-lab.mjs) bent, squashed and stretched in code as a soft body; his eyes are drawn in code (they look,
// blink and close); his arms and legs are either strokes drawn in code with his ink and line (they bend freely) or
// the pieces as drawn (they turn stiff at the joint), to compare the two. Canvas 2D on purpose: it shows the movement;
// if it is what we want, the same rig goes into the WebGL stage (useLayerStage.js). Plan: docs/sid-en-piezas.md.
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import rig from './sid/sid.json';
import bodyUrl from './sid/body.webp';
import leg0Url from './sid/leg0.webp';
import leg1Url from './sid/leg1.webp';
import armUrl from './sid/arm.webp';
import { createWorld } from './sidWorld.js';

const ui = reactive({ body: 'code', limbs: 'code', bones: false, slow: false, sitting: false, touch: false, menu: false });
const canvas = ref(null);

// --- The rig, in px of the source drawing (258 x 686): he faces +x (his eyes are on that side) ---
const PIVOT = { x: 130, y: 518 };             // the middle of his bottom, where his hips are: the body bends about it
const TALL = 512;                             // from his bottom to the top of his head
const INK = `rgb(${rig.ink.join(',')})`;
// His proportions as Nekkhamma's Sid standing (the drawing he is cut from): head 306 px of the source (to the pinch of
// his waist), torso 181, legs 187 from his body to the floor: his legs as long as his torso, about 0.6 of his head
// (Viriya's walker has them a little longer, 0.8). Limbs as thick as his outline.
const LEG = { thigh: 97, shin: 97, foot: 40, width: 22 };
const ARM = { upper: 108, fore: 102, width: 18 };        // long, as in Upekkha (they reach his crossed legs)
const STAND = 196;                            // his hips over the ground, standing: his legs all but straight
const SIT = 52;                               // his hips over the ground, sitting with his legs crossed
// In profile his hips are together in his middle (one leg behind the other), his arms come from the middle of him
// too, the near one hanging over his belly and the far one behind him (unseen until it swings out); turned to us, his
// hips, shoulders and hands are at each side of him (FRONT_ below)
const HIP = { far: { u: 124, v: 516 }, near: { u: 136, v: 515 } };
const FRONT_HIP = { far: { u: 103, v: 516 }, near: { u: 157, v: 514 } };
const SHOULDER = { far: { u: 100, v: 334 }, near: { u: 110, v: 334 } };   // towards his back, by the hatching
const REST_HAND = { far: { u: 92, v: 524 }, near: { u: 116, v: 524 } };
const hipsOf = (f) => ['far', 'near'].map((side) => ({ u: mix(HIP[side].u, FRONT_HIP[side].u, f.front), v: mix(HIP[side].v, FRONT_HIP[side].v, f.front) }));
const EYES = rig.eyes;
// Turned to us: his eyes in the middle of his face, a shoulder at each side of the pinch of his waist and his hands
// hanging at each side of his belly
const FRONT_EYES = [[PIVOT.x - 17, 211, rig.eyes[0][2]], [PIVOT.x + 17, 211, rig.eyes[1][2]]];
const FRONT_SHOULDER = { far: { u: PIVOT.x - 44, v: 320 }, near: { u: PIVOT.x + 44, v: 320 } };
const FRONT_HAND = { far: { u: PIVOT.x - 98, v: 522 }, near: { u: PIVOT.x + 98, v: 522 } };
const mix = (a, b, t) => a + (b - a) * t;

// The world round him (sidWorld.js): endless, in ink, taking its colour as he goes
const world = createWorld({ ink: '#' + rig.ink.map((v) => v.toString(16).padStart(2, '0')).join(''), cream: '#F7F8F1', depth: DEPTH });
// The floor goes back into the distance: his depth d (0 in front .. DEPTH at the back) lifts his feet towards the
// horizon and makes him smaller, towards the middle of the screen (a vanishing point)
const DEPTH = 600;
const FAR = 0.55;                             // his size at the back
const scaleAt = (d) => 1 - (1 - FAR) * d / DEPTH;

const load = (url) => new Promise((resolve) => { const i = new Image(); i.onload = () => resolve(i); i.src = url; });

// --- Springs: a value that follows its target with some give (soft, it overshoots a little) ---
function spring(x, stiff = 120, damp = 14) { return { x, v: 0, to: x, stiff, damp }; }
function step(s, dt) { s.v += ((s.to - s.x) * s.stiff - s.v * s.damp) * dt; s.x += s.v * dt; }
const springs = {
    lean: spring(0, 90, 9),        // the bend of his body, a fraction of his height at the top of his head
    sy: spring(1, 160, 9),         // squash and stretch (his width goes the other way, his volume stays)
    rot: spring(0, 120, 14),       // a turn of all of him about his hips
    face: spring(1, 260, 26),      // 1 facing right, -1 left (he goes thin through 0 as he turns)
    drop: spring(0, 140, 16),      // how far his hips are lowered (crouch, sit)
    closed: spring(0, 60, 14),     // his eyes closed (meditating, stretching)
    lookX: spring(0, 60, 12), lookY: spring(0, 60, 12),
    walk: spring(0, 18, 9),        // how much he is walking (0..1)
    reach: spring(0, 40, 11),      // how much his near hand goes to what he reaches for
    front: spring(1, 45, 12),      // turned to us (still, or sitting) 1, or in profile (walking) 0
};
const hands = {                    // where his hands go, in his own px (they follow his body), or in the world
    far: { u: spring(REST_HAND.far.u, 70, 12), v: spring(REST_HAND.far.v, 70, 12) },
    near: { u: spring(REST_HAND.near.u, 70, 12), v: spring(REST_HAND.near.v, 70, 12) },
};

const state = {
    x: 0, ground: 0,               // his hips over the ground, in world px (= px of the source, scaled k to the screen)
    d: 0,                          // how far back on the floor he is (0..DEPTH)
    cam: 0,                        // where the camera looks (it follows him, the world has no end)
    keys: { left: false, right: false, up: false, down: false },
    lift: 0, vy: 0, air: false,    // a jump
    target: null, speed: 0, phase: 0,
    action: null,                  // { name, t, dur, ... }
    breath: 0, blink: 0, nextBlink: 2,
    pointer: null, pointerAt: 0,   // the pointer on the screen (px / k)
    glance: null, nextGlance: 3,
    feet: [null, null], steps: [null, null], toes: [0, 0],
    reach: null,                   // a world point his near hand goes to
    reached: null,                 // the last one (his hand comes back from it)
    queue: null,
};

// --- His body as he is now: a point of the drawing (u, v) -> the world ---
function frame() {
    const breath = state.breath;
    // turned to us only with his body in code (the drawing is in profile)
    const front = ui.body === 'code' ? Math.max(0, Math.min(1, springs.front.x)) : 0;
    const turn = Math.abs(springs.face.x);
    return {
        front,
        root: { x: state.x, y: state.ground - STAND + springs.drop.x - state.lift },
        rot: springs.rot.x, face: Math.sign(springs.face.x || 1) * Math.max(0.12, turn + (1 - turn) * front),
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

// --- What he does ---
const act = (name, dur, extra = {}) => { state.action = { name, t: 0, dur, ...extra }; };
function walkTo(x, d = state.d) { state.target = { x, d }; state.reach = null; if (ui.sitting) sit(false); }
function wave() { if (!ui.sitting) act('wave', 2.6); }
function jump() { if (!ui.sitting && !state.air) act('jump', 1.4); }
function stretch() { if (!ui.sitting) act('stretch', 2.6); }
function sit(on = !ui.sitting) { ui.sitting = on; state.target = null; state.action = null; }
function walkAcross() { walkTo(state.x + (Math.sign(springs.face.to) || 1) * 520); }

// Where a point of the screen is in his own world, at his depth (his world is scaled about the vanishing point)
const groundAt = (d) => state.ground - d / DEPTH * view.floor;
function toSid(p, d = state.d) {
    const s = scaleAt(d), x0 = view.w / view.k / 2;
    return { x: state.cam + (p.x - x0) / s, y: state.ground + (p.y - groundAt(d)) / s };
}

const view = { w: 1, h: 1, k: 1, dpr: 1, floor: 1 };
const images = {};
let raf = 0, last = 0;

function resize() {
    const el = canvas.value;
    view.dpr = Math.min(window.devicePixelRatio || 1, 2);
    view.w = el.clientWidth; view.h = el.clientHeight;
    el.width = view.w * view.dpr; el.height = view.h * view.dpr;
    // He is about half the height of the screen
    // (on a phone the floor ends higher, so his feet are never under the pad)
    view.k = Math.min(view.h * (ui.touch ? 0.5 : 0.62) / (TALL + STAND), view.w * 0.9 / 420);
    const was = state.ground;
    state.ground = (view.h * (ui.touch ? 0.68 : 0.8)) / view.k;
    view.floor = (view.h * (ui.touch ? 0.2 : 0.26)) / view.k;     // from the front of the floor to the horizon
    if (!was) { state.x = view.w / view.k / 2; state.cam = state.x; }
}

function pointerTo(e) {
    const r = canvas.value.getBoundingClientRect();
    return { x: (e.clientX - r.left) / view.k, y: (e.clientY - r.top) / view.k };
}
function onMove(e) { state.pointer = pointerTo(e); state.pointerAt = performance.now(); }
function onDown(e) {
    const screen = pointerTo(e);
    state.pointer = screen; state.pointerAt = performance.now();
    // On the floor: he walks there, to that depth too
    if (screen.y > groundAt(DEPTH) + 10) {
        const d = Math.max(0, Math.min(DEPTH, (state.ground - screen.y) / view.floor * DEPTH));
        walkTo(toSid(screen, d).x, d);
        return;
    }
    // In the air: he reaches for it (walking near it first if it is far)
    if (ui.sitting) sit(false);
    const p = toSid(screen), dx = p.x - state.x;
    if (Math.abs(dx) > 150) { state.target = { x: p.x - Math.sign(dx) * 105, d: state.d }; state.queue = p; }
    else reachFor(p);
}

// The keys: arrows or WASD walk him over the floor, the space bar sits him in lotus (and stands him up)
const KEYS = { ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right', ArrowUp: 'up', w: 'up', ArrowDown: 'down', s: 'down' };
function press(key, on) {
    state.keys[key] = on;
    if (on) { state.target = null; state.queue = null; if (ui.sitting) sit(false); }
}
function onKey(e) {
    if (e.target?.closest?.('button') && e.key === ' ') e.target.blur();
    const key = KEYS[e.key.length === 1 ? e.key.toLowerCase() : e.key];
    if (key) { e.preventDefault(); if (e.type === 'keydown' && !e.repeat) press(key, true); if (e.type === 'keyup') press(key, false); return; }
    if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); if (e.type === 'keydown' && !e.repeat) sit(); }
}
function release() { for (const key of Object.keys(state.keys)) state.keys[key] = false; }
function reachFor(p) { springs.face.to = Math.sign(p.x - state.x) || springs.face.to; state.reach = p; state.reached = p; act('reach', 2.6); }

// --- The loop ---
function update(dt, now) {
    const S = springs, a = state.action;
    if (a) { a.t += dt; if (a.t >= a.dur) state.action = null; }
    const name = state.action?.name, t = state.action?.t ?? 0;

    // Walking over the floor: with the keys (or the pad), or towards a target; turning first when he goes sideways
    let walking = 0, mx = 0, mz = 0, left = Infinity;
    const k = state.keys;
    if (k.left || k.right || k.up || k.down) { mx = (k.right ? 1 : 0) - (k.left ? 1 : 0); mz = (k.up ? 1 : 0) - (k.down ? 1 : 0); }
    else if (state.target) {
        const dx = state.target.x - state.x, dd = state.target.d - state.d;
        left = Math.hypot(dx, dd);
        if (left < 4) {
            state.target = null;
            if (state.queue) { reachFor(state.queue); state.queue = null; }
        } else { mx = dx / left; mz = dd / left; }
    }
    const length = Math.hypot(mx, mz);
    // still a moment, he turns to us; to walk he turns back to his profile first
    state.still = length > 0 || state.reach ? 0 : (state.still ?? 0) + dt;
    S.front.to = ui.sitting || state.still > 0.45 ? 1 : 0;
    if (length > 0 && !state.air) {
        mx /= length; mz /= length;
        if (Math.abs(mx) > 0.15) S.face.to = Math.sign(mx);
        if ((Math.abs(mx) <= 0.15 || Math.abs(S.face.x - Math.sign(mx)) < 0.3) && frame().front < 0.3) {
            walking = 1;
            state.speed = Math.min(state.speed + 300 * dt, 165, left * 3 + 20);
            state.x += mx * state.speed * dt;
            state.d = Math.max(0, Math.min(DEPTH, state.d + mz * state.speed * dt));
        }
    }
    if (!walking) state.speed = 0;
    state.side = Math.abs(mx);                                            // how much of his walk is sideways
    // The camera follows him (softly, so he moves a little on the screen as he sets off and stops)
    state.cam += (state.x - state.cam) * Math.min(1, dt * 1.6);
    world.update(dt, { x: state.x, d: state.d, sitting: ui.sitting && springs.drop.x > (STAND - SIT) * 0.8 });
    S.walk.to = walking;
    const STRIDE = 116;                       // a relaxed step: about 1.4 steps a second at full speed
    if (state.speed > 0) state.phase = (state.phase + state.speed * dt / (2 * STRIDE)) % 1;
    const w = Math.max(0, Math.min(1, S.walk.x)), p = state.phase, face = Math.sign(S.face.to) || 1;

    // Breathing (slower and deeper sitting), blinking, looking
    const rate = ui.sitting ? 0.16 : 0.26;
    state.breath = Math.sin(now / 1000 * Math.PI * 2 * rate) * (ui.sitting ? 1.3 : 1);
    state.nextBlink -= dt;
    if (state.nextBlink <= 0) { state.blink = 0.16; state.nextBlink = 2 + Math.random() * 3.5; }
    state.blink = Math.max(0, state.blink - dt);

    // Targets, by what he is doing
    // walking: leaning a little into it, his soft body squashing a touch as each foot lands and stretching as he passes
    // over it, and swaying from side to side with his weight
    let lean = w * 0.03 * face, sy = 1 - w * 0.022 * Math.cos(p * Math.PI * 4), rot = w * 0.012 * Math.sin(p * Math.PI * 2), drop = 0, closed = 0;
    let near = { ...REST_HAND.near }, far = { ...REST_HAND.far };
    // the arms swing against the legs (each arm forward as the other leg goes forward), a little behind them, rising a
    // touch as they go forward
    const swing = Math.sin(p * Math.PI * 2 - 0.5) * 48 * w;
    near.u -= swing; far.u += swing;
    near.v -= Math.max(0, -swing) * 0.35; far.v -= Math.max(0, swing) * 0.35;
    drop += w * (5 + 5 * Math.cos(p * Math.PI * 4));                   // the bob of each step
    // turned to us, his hands hang at each side of him
    const fr = frame().front;
    near = { u: mix(near.u, FRONT_HAND.near.u, fr), v: mix(near.v, FRONT_HAND.near.v, fr) };
    far = { u: mix(far.u, FRONT_HAND.far.u, fr), v: mix(far.v, FRONT_HAND.far.v, fr) };

    if (ui.sitting) {
        drop = STAND - SIT; closed = 1; lean = 0;
        near = { u: 248, v: 506 }; far = { u: 12, v: 506 };                // his hands on his knees
    }
    if (name === 'wave') {
        near = { u: 250 + Math.sin(t * 12) * 34, v: 215 + Math.cos(t * 12) * 10 };
        lean = -0.035 * Math.min(1, t * 3); sy = 1.03;
    }
    if (name === 'stretch') {
        const up = Math.min(1, t / 0.6) * Math.min(1, (state.action.dur - t) / 0.5);
        near = { u: 176 + 130 * up, v: 486 - up * 480 }; far = { u: 62 - 130 * up, v: 486 - up * 480 };   // beside his head
        sy = 1 + 0.13 * up; closed = up; rot = -0.04 * up; drop = -6 * up;
    }
    if (name === 'jump') {
        if (t < 0.24) { sy = 0.86; drop = 46; near = { u: 200, v: 470 }; far = { u: 40, v: 470 }; lean = 0.05 * face; }
        else if (!state.air && t < 0.3) { state.air = true; state.vy = 560; S.sy.v += 4; }
    }
    if (state.air) {
        state.lift += state.vy * dt; state.vy -= 1700 * dt;
        sy = state.vy > 0 ? 1.13 : 1.04; near = { u: 205, v: 170 }; far = { u: 55, v: 170 };
        if (state.lift <= 0) { state.lift = 0; state.air = false; S.sy.x = 0.76; S.drop.x = 42; S.sy.v = 0; }
    }
    if (name === 'reach' && state.reach) {
        const f = frame(), head = map(f, 150, 120), dx = state.reach.x - head.x, dy = state.reach.y - head.y;
        lean = Math.max(-0.12, Math.min(0.12, (dx * face) / 900)) * face;
        sy = 1 + Math.max(0, Math.min(0.12, -dy / 1500));
    }
    if (state.reach && name !== 'reach') state.reach = null;
    S.reach.to = state.reach ? 1 : 0;

    S.lean.to = lean; S.sy.to = sy; S.rot.to = rot; S.drop.to = drop; S.closed.to = closed;

    // Where he looks: the finger if it moved lately, else a glance now and then, else ahead
    const f0 = frame(), head = map(f0, 150, 200);
    let look = null;
    if (state.reach) look = state.reach;
    else if (state.pointer && now - state.pointerAt < 2500) look = toSid(state.pointer);
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

    for (const s of Object.values(S)) step(s, dt);
    for (const h of Object.values(hands)) {
        step(h.u, dt); step(h.v, dt);
    }
    hands.near.u.to = near.u; hands.near.v.to = near.v; hands.far.u.to = far.u; hands.far.v.to = far.v;

    // His feet: planted while he walks (they never slide), stepping back under him when he stops
    const f = frame();
    hipsOf(f).forEach((hip, i) => {
        const h = map(f, hip.u, hip.v);
        // where this foot is under him, from his hip at rest (not from his body as it sways, or a planted foot slides)
        const under = f.root.x + (hip.u - PIVOT.x) * face;
        let rest = { x: under + face * (i ? 4 : -4), y: state.ground };
        if (ui.sitting) rest = { x: f.root.x + face * (i ? -38 : 38), y: state.ground - 8 };   // crossed
        const q = (p + i * 0.5) % 1;
        // (going back or forth, his steps are in place: only the sideways part of his walk carries his feet along)
        // On the ground (q < 0.5) the foot goes back at exactly his speed, so it stays put; in the air it swings forward
        // speeding up and slowing down, lifted most early in the swing
        const e = (q - 0.5) / 0.5, ease = e * e * (3 - 2 * e);
        const along = (q < 0.5 ? STRIDE / 2 - STRIDE * (q / 0.5) : -STRIDE / 2 + STRIDE * ease) * (state.side ?? 1);
        const lift = q >= 0.5 ? Math.sin(Math.PI * Math.pow(e, 0.8)) * 24 : 0;
        const gait = { x: under + face * along, y: state.ground - lift };
        // his toes: up as the heel lands, down as the foot leaves the ground and through the swing
        const toe = q < 0.12 ? -9 * (1 - q / 0.12) : q > 0.4 && q < 0.5 ? 6 * (q - 0.4) / 0.1 : q >= 0.5 ? 6 * (1 - ease) + lift * 0.25 : 0;
        state.toes[i] = (state.toes[i] ?? 0) + (toe * w - (state.toes[i] ?? 0)) * Math.min(1, dt * 20);
        let foot = state.feet[i] ?? rest;
        if (state.air) foot = { x: h.x + face * 14, y: h.y + STAND * 0.8 };
        else if (walking) {
            foot = { x: foot.x + (gait.x - foot.x) * Math.min(1, w * 1.2), y: foot.y + (gait.y - foot.y) * Math.min(1, w * 1.2) };
            state.steps[i] = null;
        } else {
            // a step of its own when it is far from where it rests (one foot at a time)
            const st = state.steps[i];
            if (st) {
                st.t += dt / 0.24;
                const e = Math.min(1, st.t), s = e * e * (3 - 2 * e);
                foot = { x: st.from.x + (rest.x - st.from.x) * s, y: st.from.y + (rest.y - st.from.y) * s - Math.sin(e * Math.PI) * 20 };
                if (e >= 1) state.steps[i] = null;
            } else if (Math.hypot(rest.x - foot.x, rest.y - foot.y) > 6 && !state.steps[1 - i]) state.steps[i] = { from: foot, t: 0 };
            else if (!state.steps[i]) foot = { x: foot.x + (rest.x - foot.x) * Math.min(1, dt * 6), y: rest.y };
        }
        state.feet[i] = foot;
    });
}

// The canvas his body is deformed on: room round the drawing for him to bend and stretch; his pivot at BODY
const BODY = { x: 0, y: 0 };
let bodyCanvasEl = null;
function bodyCanvas(f) {
    const img = images.body;
    if (!bodyCanvasEl) {
        bodyCanvasEl = document.createElement('canvas');
        bodyCanvasEl.width = img.width * 3; bodyCanvasEl.height = Math.ceil(PIVOT.y * 1.4) + 30;
        BODY.x = img.width * 1.5; BODY.y = Math.ceil(PIVOT.y * 1.4);
    }
    const b = bodyCanvasEl.getContext('2d');
    b.clearRect(0, 0, bodyCanvasEl.width, bodyCanvasEl.height);
    for (let v = 0; v < PIVOT.y + 12; v++) {
        const t = Math.max(0, (PIVOT.y - v) / TALL), wx = widthAt(f, t);
        const y0 = Math.round(BODY.y - (PIVOT.y - v) * f.sy), y1 = Math.round(BODY.y - (PIVOT.y - v - 1) * f.sy);
        if (y1 <= y0) continue;
        b.drawImage(img, 0, v, img.width, 1, BODY.x - PIVOT.x * wx + bendAt(f, t), y0, img.width * wx, y1 - y0);
    }
    return bodyCanvasEl;
}

// His body drawn in code from his traced silhouette: the fill, his outline inside its edge (clean at any size and
// bent with him point by point), and a little stroke at each of her hatching marks
const LINE_W = 19, FILL = `rgb(${rig.fill.join(',')})`;
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
            c.lineWidth = mix(7.6 + vary * 0.6, 2.2, Math.pow((j - 0.5) / SEG, 0.8));
            c.beginPath(); c.moveTo(prev.x, prev.y); c.lineTo(next.x, next.y); c.stroke();
            prev = next;
        }
    });
    c.restore();
}

function draw() {
    const el = canvas.value, c = el.getContext('2d'), k = view.k * view.dpr;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, el.width, el.height);
    c.setTransform(k, 0, 0, k, 0, 0);
    const f = frame(), face = Math.sign(f.face);
    const W = view.w / view.k;

    // The floor, back to the horizon, and him on it at his depth (smaller and nearer the middle the farther back)
    c.fillStyle = '#E9EDD8';
    c.fillRect(0, groundAt(DEPTH) - 4, W, view.h / view.k);
    const x0 = W / 2, place = { x0, cam: state.cam, groundAt, scaleAt, width: W };
    world.drawSky(c, place, 0, groundAt(DEPTH) - 20);
    world.draw(c, place, (d) => d > state.d);                         // what is behind him
    const depth = scaleAt(state.d);
    c.save();
    c.translate(x0, groundAt(state.d)); c.scale(depth, depth); c.translate(-state.cam, -state.ground);
    c.fillStyle = 'rgba(20, 50, 70, 0.10)';
    c.beginPath();
    c.ellipse(f.root.x, state.ground + 4, 70 * (1 - Math.min(0.5, state.lift / 400)), 9, 0, 0, Math.PI * 2);
    c.fill();

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
    // A drawn piece turned stiff about its joint (and, for the legs, drawn longer: stretched down, not thickened)
    const piece = (img, anchor, from, restVec, nowVec, long = 1) => {
        const angle = Math.atan2(nowVec.y, nowVec.x * face) - Math.atan2(restVec.y * long, restVec.x);
        c.save(); c.translate(anchor.x, anchor.y); c.scale(face, 1); c.rotate(angle); c.scale(1, long);
        c.drawImage(img, from.x, from.y); c.restore();
    };

    // Legs
    const legs = hipsOf(f).map((hip, i) => {
        const h = map(f, hip.u, hip.v), foot = state.feet[i] ?? { x: h.x, y: state.ground };
        // knees forward in profile; turned to us, a little out to their own side
        const outward = (i ? 1 : -1) * face;
        const toward = ui.sitting ? { x: (i ? 1 : -1) * face, y: -0.5 } : { x: mix(face, outward * 0.3, f.front), y: 0 };
        const ankle = { x: foot.x, y: foot.y - 6 };
        let { joint, end } = bend(h, ankle, LEG.thigh, LEG.shin, toward);
        if (ui.sitting) {
            // Crossed in front of him, as she draws them: each knee well out to its side, its foot under the other
            const side = Math.sign(h.x - f.root.x) || (i ? face : -face), m = Math.min(1, springs.drop.x / (STAND - SIT));
            const knee = { x: f.root.x + side * 118, y: state.ground - 58 }, under = { x: f.root.x - side * 38, y: state.ground - 7 };
            joint = { x: joint.x + (knee.x - joint.x) * m, y: joint.y + (knee.y - joint.y) * m };
            end = { x: end.x + (under.x - end.x) * m, y: end.y + (under.y - end.y) * m };
        }
        // his toes: ahead in profile; turned to us, each a little out to its own side
        const toes = ui.sitting ? Math.sign(end.x - joint.x) : mix(face, outward * 0.75, f.front);
        return { h, joint, end, toe: { x: end.x + toes * LEG.foot, y: end.y + 2 + (ui.sitting ? 0 : state.toes[i]) } };
    });
    // Arms (in the world: shoulders on his body, hands where they are going, or reaching)
    const arms = ['far', 'near'].map((side, i) => {
        const s = map(f, mix(SHOULDER[side].u, FRONT_SHOULDER[side].u, f.front), mix(SHOULDER[side].v, FRONT_SHOULDER[side].v, f.front));
        let hand = map(f, hands[side].u.x, hands[side].v.x);
        const r = springs.reach.x;
        if (side === 'near' && state.reached && r > 0.001) hand = { x: hand.x + (state.reached.x - hand.x) * r, y: hand.y + (state.reached.y - hand.y) * r };
        const raised = hand.y < s.y;
        // each elbow to its own side (out from his body), or down when the hand is up
        // elbows back in profile, out to their own side turned to us; down when the hand is up
        const out = (i ? 1 : -1) * face, back = mix(-face * 0.7, out, f.front);
        const toward = raised ? { x: out * 0.5, y: 1 } : { x: back, y: 0.15 };
        return { s, ...bend(s, hand, ARM.upper, ARM.fore, toward) };
    });

    const drawArm = (a) => limb([a.s, a.joint, a.end], ARM.width);
    if (ui.limbs === 'code') drawArm(arms[0]);
    // Legs: behind his body, or in front of it when he sits with them crossed (as in Upekkha)
    const drawLegs = () => ui.limbs === 'code' ? legs.forEach((l) => limb([l.h, l.joint, l.end, l.toe], LEG.width)) : rig.legs.forEach((g, i) => {
        const l = legs[i];
        piece(images[`leg${i}`], l.h, { x: g.box[0] - g.hip[0], y: g.box[1] - g.hip[1] },
            { x: g.foot[0] - g.hip[0], y: g.foot[1] - g.hip[1] }, { x: l.end.x - l.h.x, y: l.end.y - l.h.y },
            STAND / (g.foot[1] - g.hip[1]));
    });
    if (!ui.sitting) drawLegs();

    // His body: bent, squashed or stretched and breathing row by row, first on a canvas of its own at the drawing's
    // size, each row on whole pixels (no seams, no overlaps), then laid on the scene in one piece
    c.save();
    c.translate(f.root.x, f.root.y); c.rotate(f.rot); c.scale(f.face, 1);
    if (ui.body === 'code') codeBody(c, f);
    else c.drawImage(bodyCanvas(f), -BODY.x, -BODY.y);
    // His eyes: looking, blinking, closed
    const closed = Math.max(springs.closed.x, state.blink > 0 ? 1 : 0);
    EYES.forEach(([pu, pv, r], e) => {
        const u = mix(pu, FRONT_EYES[e][0], f.front), v = mix(pv, FRONT_EYES[e][1], f.front);
        const at = local(f, u + springs.lookX.x * 7, v + springs.lookY.x * 6);
        c.fillStyle = INK; c.strokeStyle = INK;
        if (closed > 0.6 && springs.closed.x > 0.5) {         // closed, as she draws them: a little arc
            // wide, shallow arcs, a little apart, as she draws them (Upekkha)
            const R = r * 2.6, apart = (e ? 1 : -1) * 7.5;
            c.lineWidth = 6.5; c.lineCap = 'round';
            c.beginPath(); c.arc(at.x + apart, at.y - R * 0.86, R, Math.PI * 0.3, Math.PI * 0.7); c.stroke();
        } else {
            c.beginPath(); c.ellipse(at.x, at.y, r * 0.95, r * (closed > 0.6 ? 0.18 : 0.95), 0, 0, Math.PI * 2); c.fill();
        }
    });
    c.restore();

    if (ui.sitting) drawLegs();
    if (ui.limbs === 'code') drawArm(arms[1]);
    else {
        const a = arms[1], g = rig.arm, anchor = map(f, g.shoulder[0], g.shoulder[1]);
        piece(images.arm, anchor, { x: g.box[0] - g.shoulder[0], y: g.box[1] - g.shoulder[1] },
            { x: g.hand[0] - g.shoulder[0], y: g.hand[1] - g.shoulder[1] }, { x: a.end.x - anchor.x, y: a.end.y - anchor.y });
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
}

function loop(now) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - (last || now)) / 1000) * (ui.slow ? 0.25 : 1);
    last = now;
    update(dt, now);
    draw();
}

// (for trying him out from the browser's console)
if (typeof window !== 'undefined') window.__sid = { state, springs, ui };

onMounted(async () => {
    ui.touch = window.matchMedia?.('(pointer: coarse)').matches ?? false;
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    window.addEventListener('blur', release);
    const [body, leg0, leg1, arm] = await Promise.all([bodyUrl, leg0Url, leg1Url, armUrl].map(load));
    Object.assign(images, { body, leg0, leg1, arm });
    resize();
    window.addEventListener('resize', resize);
    raf = requestAnimationFrame(loop);
});
onBeforeUnmount(() => {
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('keyup', onKey);
    window.removeEventListener('blur', release);
});
</script>

<template>
    <div class="lab">
        <canvas ref="canvas" @pointermove="onMove" @pointerdown="onDown"></canvas>
        <p v-if="ui.touch" class="hint">Camínalo con las flechas: el mundo se colorea a su paso. Loto: todo alrededor.</p>
        <p v-else class="hint">Flechas o WASD: camina y el mundo se colorea a su paso. Barra espaciadora: loto, y se colorea todo alrededor.</p>
        <button v-if="ui.touch" class="more" :class="{ on: ui.menu }" @click="ui.menu = !ui.menu">Pruebas</button>
        <div v-if="!ui.touch || ui.menu" class="panel">
            <button @click="walkAcross">Caminar</button>
            <button @click="wave">Saludar</button>
            <button @click="jump">Saltar</button>
            <button @click="stretch">Estirarse</button>
            <button :class="{ on: ui.sitting }" @click="sit()">Loto</button>
            <span class="sep"></span>
            <button :class="{ on: ui.body === 'code' }" @click="ui.body = 'code'">Cuerpo en código</button>
            <button :class="{ on: ui.body === 'drawing' }" @click="ui.body = 'drawing'">Cuerpo dibujo</button>
            <span class="sep"></span>
            <button :class="{ on: ui.limbs === 'code' }" @click="ui.limbs = 'code'">Trazos en código</button>
            <button :class="{ on: ui.limbs === 'pieces' }" @click="ui.limbs = 'pieces'">Piezas dibujadas</button>
            <span class="sep"></span>
            <button :class="{ on: ui.bones }" @click="ui.bones = !ui.bones">Esqueleto</button>
            <button :class="{ on: ui.slow }" @click="ui.slow = !ui.slow">Lento</button>
        </div>
        <!-- On a phone: a pad to walk him (held down) and a button for the lotus -->
        <div v-if="ui.touch" class="pad">
            <button v-for="[key, arrow] in [['up', '▲'], ['left', '◀'], ['right', '▶'], ['down', '▼']]" :key="key" :class="key"
                @pointerdown.prevent="press(key, true)" @pointerup="press(key, false)" @pointercancel="press(key, false)"
                @pointerleave="press(key, false)" @contextmenu.prevent>{{ arrow }}</button>
        </div>
        <button v-if="ui.touch" class="lotus" :class="{ on: ui.sitting }" @click="sit()">Loto</button>
    </div>
</template>

<style scoped>
.lab {
    position: fixed;
    inset: 0;
    background: #F7F8F1;
    color: #143246;
    font-family: Nunito, sans-serif;
}
canvas {
    width: 100%;
    height: 100%;
    display: block;
    touch-action: none;
}
.hint {
    position: absolute;
    top: 16px;
    left: 16px;
    right: 16px;
    margin: 0;
    font-size: 15px;
    color: #143246;
    opacity: 0.7;
    pointer-events: none;
}
.panel {
    position: absolute;
    left: 16px;
    right: 16px;
    top: 44px;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: center;
}
.panel button {
    font: inherit;
    font-size: 14px;
    padding: 8px 14px;
    border-radius: 999px;
    border: 1.5px solid #143246;
    background: #F7F8F1;
    color: #143246;
    cursor: pointer;
}
.panel button.on {
    background: #143246;
    color: #F7F8F1;
}
.sep {
    width: 12px;
}
.more {
    position: absolute;
    right: 16px;
    top: 44px;
    font: inherit;
    font-size: 12px;
    padding: 6px 12px;
    border-radius: 999px;
    border: 1.5px solid #143246;
    background: #F7F8F1;
    color: #143246;
}
.more.on { background: #143246; color: #F7F8F1; }
.pad {
    position: absolute;
    left: 16px;
    bottom: 16px;
    display: grid;
    grid-template-columns: repeat(3, 52px);
    grid-template-rows: repeat(3, 52px);
    gap: 4px;
    user-select: none;
    -webkit-user-select: none;
    touch-action: none;
}
.pad button, .lotus {
    font: inherit;
    border: 1.5px solid #143246;
    background: rgba(247, 248, 241, 0.85);
    color: #143246;
    border-radius: 14px;
    font-size: 18px;
    padding: 0;
    touch-action: none;
    -webkit-tap-highlight-color: transparent;
}
.pad button:active, .lotus.on {
    background: #143246;
    color: #F7F8F1;
}
.pad .up { grid-area: 1 / 2; }
.pad .left { grid-area: 2 / 1; }
.pad .right { grid-area: 2 / 3; }
.pad .down { grid-area: 3 / 2; }
.lotus {
    position: absolute;
    right: 16px;
    bottom: 40px;
    width: 84px;
    height: 84px;
    border-radius: 50%;
    font-size: 16px;
}
@media (max-width: 600px) {
    .hint { font-size: 13px; right: 110px; }
    .panel { gap: 6px; top: 80px; }
    .panel button { font-size: 12px; padding: 6px 10px; }
    .sep { display: none; }
}
</style>
