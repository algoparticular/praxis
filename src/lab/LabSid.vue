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

const ui = reactive({ limbs: 'code', bones: false, slow: false, sitting: false, touch: false, menu: false });
const canvas = ref(null);

// --- The rig, in px of the source drawing (258 x 686): he faces +x (his eyes are on that side) ---
const PIVOT = { x: 130, y: 518 };             // the middle of his bottom, where his hips are: the body bends about it
const TALL = 512;                             // from his bottom to the top of his head
const INK = `rgb(${rig.ink.join(',')})`;
// His proportions: head 1, torso 0.8, legs 1. His head (to the pinch of his waist, v 300) is about 294 px of the
// source and his torso (to his bottom) 218, so his legs are as long as his head. Limbs as thick as his outline.
const HEAD = PIVOT.y - 218 - 6;
const LEG = { thigh: HEAD / 2 + 4, shin: HEAD / 2 + 4, foot: 32, width: 22 };
const ARM = { upper: 108, fore: 102, width: 18 };        // long, as in Upekkha (they reach his crossed legs)
const STAND = HEAD - 6;                       // his hips over the ground, standing (the legs a little bent, alive)
const SIT = 64;                               // his hips over the ground, sitting with his legs crossed
const HIP = { far: { u: 103, v: 516 }, near: { u: 157, v: 514 } };
const SHOULDER = { far: { u: 76, v: 322 }, near: { u: 152, v: 322 } };
const REST_HAND = { far: { u: 62, v: 486 }, near: { u: 176, v: 486 } };
const EYES = rig.eyes;
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
};
const hands = {                    // where his hands go, in his own px (they follow his body), or in the world
    far: { u: spring(REST_HAND.far.u, 70, 12), v: spring(REST_HAND.far.v, 70, 12) },
    near: { u: spring(REST_HAND.near.u, 70, 12), v: spring(REST_HAND.near.v, 70, 12) },
};

const state = {
    x: 0, ground: 0,               // his hips over the ground, in world px (= px of the source, scaled k to the screen)
    d: 0,                          // how far back on the floor he is (0..DEPTH)
    keys: { left: false, right: false, up: false, down: false },
    lift: 0, vy: 0, air: false,    // a jump
    target: null, speed: 0, phase: 0,
    action: null,                  // { name, t, dur, ... }
    breath: 0, blink: 0, nextBlink: 2,
    pointer: null, pointerAt: 0,   // the pointer on the screen (px / k)
    glance: null, nextGlance: 3,
    feet: [null, null], steps: [null, null],
    reach: null,                   // a world point his near hand goes to
    reached: null,                 // the last one (his hand comes back from it)
    queue: null,
};

// --- His body as he is now: a point of the drawing (u, v) -> the world ---
function frame() {
    const breath = state.breath;
    return {
        root: { x: state.x, y: state.ground - STAND + springs.drop.x - state.lift },
        rot: springs.rot.x, face: Math.sign(springs.face.x || 1) * Math.max(0.12, Math.abs(springs.face.x)),
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
function walkAcross() { const w = view.w / view.k; walkTo(state.x < w / 2 ? w * 0.78 : w * 0.22); }

// Where a point of the screen is in his own world, at his depth (his world is scaled about the vanishing point)
const groundAt = (d) => state.ground - d / DEPTH * view.floor;
function toSid(p, d = state.d) {
    const s = scaleAt(d), x0 = view.w / view.k / 2;
    return { x: x0 + (p.x - x0) / s, y: state.ground + (p.y - groundAt(d)) / s };
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
    if (!was) state.x = view.w / view.k / 2;
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
    if (length > 0 && !state.air) {
        mx /= length; mz /= length;
        if (Math.abs(mx) > 0.15) S.face.to = Math.sign(mx);
        if (Math.abs(mx) <= 0.15 || Math.abs(S.face.x - Math.sign(mx)) < 0.3) {
            walking = 1;
            state.speed = Math.min(state.speed + 380 * dt, 185, left * 3 + 20);
            state.x += mx * state.speed * dt;
            state.d = Math.max(0, Math.min(DEPTH, state.d + mz * state.speed * dt));
        }
    }
    if (!walking) state.speed = 0;
    state.side = Math.abs(mx);                                            // how much of his walk is sideways
    // He stays on the screen
    const half = (view.w / view.k / 2 - 60) / scaleAt(state.d), x0 = view.w / view.k / 2;
    state.x = Math.max(x0 - half, Math.min(x0 + half, state.x));
    S.walk.to = walking;
    const STRIDE = 118;
    if (state.speed > 0) state.phase = (state.phase + state.speed * dt / (2 * STRIDE)) % 1;
    const w = Math.max(0, Math.min(1, S.walk.x)), p = state.phase, face = Math.sign(S.face.to) || 1;

    // Breathing (slower and deeper sitting), blinking, looking
    const rate = ui.sitting ? 0.16 : 0.26;
    state.breath = Math.sin(now / 1000 * Math.PI * 2 * rate) * (ui.sitting ? 1.3 : 1);
    state.nextBlink -= dt;
    if (state.nextBlink <= 0) { state.blink = 0.16; state.nextBlink = 2 + Math.random() * 3.5; }
    state.blink = Math.max(0, state.blink - dt);

    // Targets, by what he is doing
    let lean = w * 0.045 * face, sy = 1, rot = w * 0.03 * Math.sin(p * Math.PI * 4) * 0.5, drop = 0, closed = 0;
    let near = { ...REST_HAND.near }, far = { ...REST_HAND.far };
    const swing = Math.sin(p * Math.PI * 2) * 30 * w;
    near.u += swing; far.u -= swing;
    drop += w * (7 + 7 * Math.cos(p * Math.PI * 4));                   // the bob of each step

    if (ui.sitting) {
        drop = STAND - SIT; closed = 1; lean = 0;
        near = { u: 280, v: 500 }; far = { u: -20, v: 500 };                // his hands on his knees
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
        if (t < 0.24) { sy = 0.86; drop = 64; near = { u: 200, v: 470 }; far = { u: 40, v: 470 }; lean = 0.05 * face; }
        else if (!state.air && t < 0.3) { state.air = true; state.vy = 600; S.sy.v += 4; }
    }
    if (state.air) {
        state.lift += state.vy * dt; state.vy -= 1700 * dt;
        sy = state.vy > 0 ? 1.13 : 1.04; near = { u: 205, v: 170 }; far = { u: 55, v: 170 };
        if (state.lift <= 0) { state.lift = 0; state.air = false; S.sy.x = 0.76; S.drop.x = 58; S.sy.v = 0; }
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
    [HIP.far, HIP.near].forEach((hip, i) => {
        const h = map(f, hip.u, hip.v);
        let rest = { x: h.x + face * (i ? 4 : -4), y: state.ground };
        if (ui.sitting) rest = { x: f.root.x + face * (i ? -46 : 46), y: state.ground - 8 };   // crossed
        const q = (p + i * 0.5) % 1;
        // (going back or forth, his steps are in place: only the sideways part of his walk carries his feet along)
        const along = (q < 0.5 ? STRIDE / 2 - STRIDE * (q / 0.5) : -STRIDE / 2 + STRIDE * ((q - 0.5) / 0.5)) * (state.side ?? 1);
        const gait = { x: f.root.x + (h.x - f.root.x) + face * along, y: state.ground - (q >= 0.5 ? Math.sin((q - 0.5) / 0.5 * Math.PI) * 38 : 0) };
        let foot = state.feet[i] ?? rest;
        if (state.air) foot = { x: h.x + face * 14, y: h.y + STAND * 0.8 };
        else if (w > 0.02) {
            foot = { x: foot.x + (gait.x - foot.x) * Math.min(1, w * 1.2), y: foot.y + (gait.y - foot.y) * Math.min(1, w * 1.2) };
            state.steps[i] = null;
        } else {
            // a step of its own when it is far from where it rests (one foot at a time)
            const st = state.steps[i];
            if (st) {
                st.t += dt / 0.24;
                const e = Math.min(1, st.t), s = e * e * (3 - 2 * e);
                foot = { x: st.from.x + (rest.x - st.from.x) * s, y: st.from.y + (rest.y - st.from.y) * s - Math.sin(e * Math.PI) * 28 };
                if (e >= 1) state.steps[i] = null;
            } else if (Math.hypot(rest.x - foot.x, rest.y - foot.y) > 6 && !state.steps[1 - i]) state.steps[i] = { from: foot, t: 0 };
            else if (!state.steps[i]) foot = { x: foot.x + (rest.x - foot.x) * Math.min(1, dt * 6), y: rest.y };
        }
        state.feet[i] = foot;
    });
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
    const depth = scaleAt(state.d), x0 = W / 2;
    c.translate(x0, groundAt(state.d)); c.scale(depth, depth); c.translate(-x0, -state.ground);
    c.fillStyle = 'rgba(20, 50, 70, 0.10)';
    c.beginPath();
    c.ellipse(f.root.x, state.ground + 4, 70 * (1 - Math.min(0.5, state.lift / 400)), 9, 0, 0, Math.PI * 2);
    c.fill();

    const limb = (points, width) => {
        c.strokeStyle = INK; c.lineWidth = width; c.lineCap = 'round'; c.lineJoin = 'round';
        c.beginPath(); c.moveTo(points[0].x, points[0].y);
        for (const q of points.slice(1)) c.lineTo(q.x, q.y);
        c.stroke();
    };
    // A drawn piece turned stiff about its joint (and, for the legs, drawn longer: stretched down, not thickened)
    const piece = (img, anchor, from, restVec, nowVec, long = 1) => {
        const angle = Math.atan2(nowVec.y, nowVec.x * face) - Math.atan2(restVec.y * long, restVec.x);
        c.save(); c.translate(anchor.x, anchor.y); c.scale(face, 1); c.rotate(angle); c.scale(1, long);
        c.drawImage(img, from.x, from.y); c.restore();
    };

    // Legs
    const legs = [HIP.far, HIP.near].map((hip, i) => {
        const h = map(f, hip.u, hip.v), foot = state.feet[i] ?? { x: h.x, y: state.ground };
        const toward = ui.sitting ? { x: (i ? 1 : -1) * face, y: -0.5 } : { x: face, y: 0 };      // sitting: knees out
        const ankle = { x: foot.x, y: foot.y - 6 };
        let { joint, end } = bend(h, ankle, LEG.thigh, LEG.shin, toward);
        if (ui.sitting) {
            // Crossed in front of him, as she draws them: each knee well out to its side, its foot under the other
            const side = Math.sign(h.x - f.root.x) || (i ? face : -face), m = Math.min(1, springs.drop.x / (STAND - SIT));
            const knee = { x: f.root.x + side * 150, y: state.ground - 76 }, under = { x: f.root.x - side * 46, y: state.ground - 8 };
            joint = { x: joint.x + (knee.x - joint.x) * m, y: joint.y + (knee.y - joint.y) * m };
            end = { x: end.x + (under.x - end.x) * m, y: end.y + (under.y - end.y) * m };
        }
        const toes = ui.sitting ? Math.sign(end.x - joint.x) : face;
        return { h, joint, end, toe: { x: end.x + toes * LEG.foot, y: end.y + 2 } };
    });
    // Arms (in the world: shoulders on his body, hands where they are going, or reaching)
    const arms = ['far', 'near'].map((side) => {
        const s = map(f, SHOULDER[side].u, SHOULDER[side].v);
        let hand = map(f, hands[side].u.x, hands[side].v.x);
        const r = springs.reach.x;
        if (side === 'near' && state.reached && r > 0.001) hand = { x: hand.x + (state.reached.x - hand.x) * r, y: hand.y + (state.reached.y - hand.y) * r };
        const raised = hand.y < s.y;
        const toward = raised ? { x: face * 0.4, y: 1 } : { x: -face, y: 0.3 };
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

    // His body, row by row: bent, squashed or stretched, breathing
    c.save();
    c.translate(f.root.x, f.root.y); c.rotate(f.rot); c.scale(f.face, 1);
    const img = images.body, ROW = 2;
    for (let v = 0; v < PIVOT.y + 12; v += ROW) {
        const t = Math.max(0, (PIVOT.y - v) / TALL), wx = widthAt(f, t);
        c.drawImage(img, 0, v, img.width, ROW, -PIVOT.x * wx + bendAt(f, t), -(PIVOT.y - v) * f.sy, img.width * wx, ROW * f.sy + 0.8);
    }
    // His eyes: looking, blinking, closed
    const closed = Math.max(springs.closed.x, state.blink > 0 ? 1 : 0);
    for (const [u, v, r] of EYES) {
        const at = local(f, u + springs.lookX.x * 7, v + springs.lookY.x * 6);
        c.fillStyle = INK; c.strokeStyle = INK;
        if (closed > 0.6 && springs.closed.x > 0.5) {         // closed, as she draws them: a little arc
            c.lineWidth = 5; c.lineCap = 'round';
            c.beginPath(); c.arc(at.x, at.y - 4, r * 1.1, Math.PI * 0.15, Math.PI * 0.85); c.stroke();
        } else {
            c.beginPath(); c.ellipse(at.x, at.y, r * 0.95, r * (closed > 0.6 ? 0.18 : 0.95), 0, 0, Math.PI * 2); c.fill();
        }
    }
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
}

function loop(now) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - (last || now)) / 1000) * (ui.slow ? 0.25 : 1);
    last = now;
    update(dt, now);
    draw();
}

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
        <p v-if="ui.touch" class="hint">Muévelo con las flechas (o toca el suelo). Loto lo sienta. Toca el aire y lo alcanza con la mano.</p>
        <p v-else class="hint">Flechas o WASD: camina por el espacio. Barra espaciadora: se sienta en loto. Toca el suelo o el aire.</p>
        <button v-if="ui.touch" class="more" :class="{ on: ui.menu }" @click="ui.menu = !ui.menu">Pruebas</button>
        <div v-if="!ui.touch || ui.menu" class="panel">
            <button @click="walkAcross">Caminar</button>
            <button @click="wave">Saludar</button>
            <button @click="jump">Saltar</button>
            <button @click="stretch">Estirarse</button>
            <button :class="{ on: ui.sitting }" @click="sit()">Loto</button>
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
