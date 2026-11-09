<script setup>
// The puppet lab: Sid (who is also Particular) as a puppet, to try how much more he can move than breathe. Only in
// development (/lab/sid, see the router), never in the build. He is all drawn in code: his body from his silhouette
// traced off Nekkhamma's Sid (scripts/make-sid-lab.mjs -> sid.json), bent, squashed and stretched as a soft body; his
// eyes (they look, blink and close); his arms and legs, strokes with his ink and line that bend freely. Canvas 2D on purpose: it shows the movement;
// if it is what we want, the same rig goes into the WebGL stage (useLayerStage.js). Plan: docs/sid-en-piezas.md.
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import Header from '../components/Header.vue';
import rig from './sid/sid.json';
import { CICLOS, createWorld } from './sidWorld.js';
import { createStarField } from '../composables/useStarField.js';
import Rulito from '../components/Rulito.vue';
import { play } from '../composables/useSound.js';

const ui = reactive({ bones: false, sitting: false, touch: false });
const canvas = ref(null);
const nightSky = ref(null), starCanvas = ref(null);   // the cards' starry night, behind the drawing (useStarField.js)
let stars = null;
// Sitting in lotus under the crown of her tree, after a moment (RULITO_AFTER) the rulito is born over his head, as in the
// cards (Rulito.vue, in the red of Ciclos's), and stays while he sits; when he gets up its tail catches up with it
const rulito = ref(null);
const RULITO_AFTER = 3, RULITO_GROW = 2.2, RULITO_GO = 3.4;

// --- The rig, in px of the source drawing (258 x 686): he faces +x (his eyes are on that side) ---
const PIVOT = { x: 130, y: 518 };             // the middle of his bottom, where his hips are: the body bends about it
const TALL = 512;                             // from his bottom to the top of his head
const INK = CICLOS.ink;                          // his line and his white: Ciclos's (sidWorld.js)
// His proportions as Nekkhamma's Sid standing (the drawing he is cut from): head 306 px of the source (to the pinch of
// his waist), torso 181, legs 187 from his body to the floor: his legs as long as his torso, about 0.6 of his head
// (Viriya's walker has them a little longer, 0.8). Limbs as thick as his outline.
const SMALL = 0.84;
const LEG = { thigh: 97, shin: 97, foot: 40, width: 16 };
const ARM = { upper: 116, fore: 110, width: 13.5 };        // long, as in Upekkha (they reach his crossed legs)
const STAND = 196;                            // his hips over the ground, standing: his legs all but straight
const SIT = 12;                               // his hips over the ground, sitting with his legs crossed: his bottom on the floor
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
const PACE = 150, TROT = 230;                 // his easy, unhurried pace and a trot (world px a second)
const ZOOM = 0.22;
const STILLNESS = 0.05;                       // the world's pace while he meditates                            // how much closer the camera comes when he is at the back   // the gathering (s), the spring up and the fall (px/s, px/s²)

// The world round him (sidWorld.js): endless, in ink, taking its colour as he goes
const picture = (src) => (typeof Image !== 'undefined' ? Object.assign(new Image(), { src }) : null);
const world = createWorld({ depth: DEPTH, clouds: picture('/assets/ciclos/clouds.webp'), moon: picture('/assets/ciclos/moon.webp') });
// The floor goes back into the distance: his depth d (0 in front .. DEPTH at the back) lifts his feet towards the
// horizon and makes him smaller, towards the middle of the screen (a vanishing point)
const DEPTH = 600;
const FAR = 0.55;                             // his size at the back
const scaleAt = (d) => 1 - (1 - FAR) * d / DEPTH;


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
    walk: spring(0, 18, 9),        // how much he is walking (0..1)
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
    d: 0,                          // how far back on the floor he is (0..DEPTH)
    // where he faces on the floor, an angle: 0 to the right, PI to the left, -PI/2 towards us, PI/2 into the distance.
    // It turns smoothly (never jumps), and how he is drawn follows it: in profile, three quarters, from the front or
    // from behind
    heading: -Math.PI / 2,
    held: 0,                       // how long the keys have been held (held a while, he breaks into a trot)
    cam: 0, zoom: 1,
    pace: 1,
    shift: 0,                      // his body over the foot he stands on (seen from the front, his weight going side to side)
    gait: null,                    // walking: his legs in their poses this frame ({ legs, hd }), and how much he is lowered
    gaitDrop: 0,                       // how fast the world's time goes (all but still while he meditates)               // where the camera looks (it follows him, the world has no end) and how close
    keys: { left: false, right: false, up: false, down: false },
    lift: 0, vy: 0, air: false,    // a jump
    target: null, speed: 0, phase: 0, run: 0,
    action: null,                  // { name, t, dur, ... }
    breath: 0, blink: 0, nextBlink: 2,
    pointer: null, pointerAt: 0,   // the pointer on the screen (px / k)
    glance: null, nextGlance: 3,
    feet: [null, null],            // his feet on the floor: { x, d, y } (y: lifted), each at its own depth
    steps: [null, null], toes: [0, 0], legTuck: [0, 0],
    legSit: [0, 0], sitT: 9, rising: false, settled: true,
    underTree: 0, rul: null,                                 // seconds sitting under the tree, the rulito born there      // sitting down in lotus and getting up, leg by leg
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
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
// Turns his heading towards an angle, by at most `most`; turning right round he turns through facing us (as one does,
// and his face shows on the way)
function turnTo(aim, most) {
    let diff = wrap(aim - state.heading);
    if (Math.abs(diff) > Math.PI * 0.85) {
        const other = diff - Math.sign(diff) * Math.PI * 2, toUs = wrap(-Math.PI / 2 - state.heading);
        const through = (dk) => Math.sign(toUs) === Math.sign(dk) && Math.abs(toUs) <= Math.abs(dk);
        if (!through(diff) && through(other)) diff = other;
    }
    state.heading = wrap(state.heading + Math.max(-most, Math.min(most, diff)));
}
// What stands in the way (her tree's trunk, the big stones): circles on the floor
const blocking = () => world.obstacles(state.x, 900);
// Going towards (mx, mz), he bends his way round what is ahead of him, by the side nearer where he is going
function steer(mx, mz) {
    for (const o of blocking()) {
        const rx = state.x - o.x, rz = state.d - o.d, dist = Math.hypot(rx, rz) || 1, R = o.r + 26;
        if (dist > R + 130) continue;
        if (-(mx * rx + mz * rz) / dist <= 0) continue;                  // (moving away from it)
        const a = { x: -rz / dist, z: rx / dist }, b = { x: rz / dist, z: -rx / dist };
        const t = a.x * mx + a.z * mz >= b.x * mx + b.z * mz ? a : b;
        const kk = Math.max(0, Math.min(1, 1 - (dist - R) / 130));
        mx = mx * (1 - kk) + t.x * kk; mz = mz * (1 - kk) + t.z * kk;
        const l = Math.hypot(mx, mz) || 1; mx /= l; mz /= l;
    }
    return [mx, mz];
}
// and never walks into it (with the keys he slides along it)
function collide() {
    for (const o of blocking()) {
        const rx = state.x - o.x, rz = state.d - o.d, dist = Math.hypot(rx, rz) || 1;
        if (dist < o.r) { state.x = o.x + rx / dist * o.r; state.d = Math.max(0, Math.min(DEPTH, o.d + rz / dist * o.r)); }
    }
}

// --- What he does ---
const act = (name, dur, extra = {}) => { state.action = { name, t: 0, dur, ...extra }; };
function walkTo(x, d = state.d) {
    for (const o of world.obstacles(x, 0)) {
        const rx = state.x - o.x, rz = state.d - o.d, dist = Math.hypot(rx, rz) || 1;
        if (Math.hypot(x - o.x, d - o.d) < o.r + 10) { x = o.x + rx / dist * (o.r + 12); d = Math.max(0, Math.min(DEPTH, o.d + rz / dist * (o.r + 12))); }
    }
    state.target = { x, d }; state.reach = null; if (ui.sitting) sit(false);
}
function wave() { if (!ui.sitting) act('wave', 2.6, { arm: 'near' }); }
function jump() { if (!ui.sitting && !state.air) { state.jumped = false; act('jump', 1.7); } }
function stretch() { if (!ui.sitting) act('stretch', 2.6); }
function sit(on = !ui.sitting) {
    if (on === ui.sitting) return;
    // getting up is its own little movement while his legs are still crossed
    state.rising = !on && Math.max(...state.legSit) > 0.1;
    ui.sitting = on; state.sitT = 0; state.settled = false; state.target = null; state.action = null;
}
function walkAcross() { walkTo(state.x + (Math.sign(Math.cos(state.heading)) || Math.sign(springs.face.x) || 1) * 520); }

// Where a point of the screen is in his own world, at his depth (his world is scaled about the vanishing point)
const groundAt = (d) => state.ground - d / DEPTH * view.floor;
function toSid(p, d = state.d) {
    const s = scaleAt(d), x0 = view.w / view.k / 2;
    return { x: state.cam + (p.x - x0) / s, y: state.ground + (p.y - groundAt(d)) / s };
}

const view = { w: 1, h: 1, k: 1, dpr: 1, floor: 1 };
let raf = 0, last = 0;

function resize() {
    const el = canvas.value;
    view.dpr = Math.min(window.devicePixelRatio || 1, 2);
    view.w = el.clientWidth; view.h = el.clientHeight;
    el.width = view.w * view.dpr; el.height = view.h * view.dpr;
    // He is about half the height of the screen
    // (on a phone the floor ends higher, so his feet are never under the buttons, the pad and the lotus)
    // (SMALL: he is a little smaller than at first, so the world, and her tree, are big round him)
    view.k = SMALL * Math.min((ui.touch ? Math.min(view.h * 0.47, view.h - 330) : view.h * 0.62) / (TALL + STAND), view.w * 0.9 / 420);
    const was = state.ground;
    state.ground = (ui.touch ? Math.min(view.h * 0.63, view.h - 252) : view.h * 0.83) / view.k;   // (252: the row of buttons, the pad)
    view.floor = (view.h * (ui.touch ? 0.18 : 0.26)) / view.k;     // from the front of the floor to the horizon
    if (!was) { state.x = view.w / view.k / 2; state.cam = state.x; }
    // the starry night fills the sky, down to the horizon
    skyHeight();
}
// The camera comes a little closer when he is at the back (state.zoom), about his feet (below the horizon, so coming
// closer lifts the horizon). The starry night behind the drawing keeps one height, down to the horizon as it is with
// no zoom (the lowest it gets): what is under the horizon is hidden by the ground, and changing its size every frame
// would sow its stars again
const focus = () => ({ x: view.w / view.k / 2, y: groundAt(state.d) });
function skyHeight() {
    if (nightSky.value) nightSky.value.style.height = `${Math.ceil(groundAt(DEPTH) * view.k) + 2}px`;
}

function pointerTo(e) {
    const r = canvas.value.getBoundingClientRect(), F = focus();
    const x = (e.clientX - r.left) / view.k, y = (e.clientY - r.top) / view.k;
    return { x: F.x + (x - F.x) / state.zoom, y: F.y + (y - F.y) / state.zoom };
}
function onMove(e) { state.pointer = pointerTo(e); state.pointerAt = performance.now(); }
function onDown(e) {
    const screen = pointerTo(e);
    state.pointer = screen; state.pointerAt = performance.now();
    // On him: he does not walk (it would be to a point just behind him); he greets us
    const me = toSid(screen), top = frame().root.y - TALL * springs.sy.x;
    if (Math.abs(me.x - state.x) < 120 && me.y > top && me.y < state.ground + 10) {
        state.target = null;
        if (!ui.sitting && !state.action) wave();
        return;
    }
    // On the floor: he walks there, to that depth too
    if (screen.y > groundAt(DEPTH) + 10) {
        const d = Math.max(0, Math.min(DEPTH, (state.ground - screen.y) / view.floor * DEPTH));
        walkTo(toSid(screen, d).x, d);
        return;
    }
    // In the air: he walks that way, where he is in depth; only a touch close to him, as high as his head or higher,
    // is something he reaches for with his hand
    const p = toSid(screen), head = map(frame(), PIVOT.x, 260);
    if (Math.abs(p.x - state.x) < 170 && p.y < head.y) { if (ui.sitting) sit(false); state.target = null; reachFor(p); }
    else walkTo(p.x);
}

// The keys: arrows or WASD walk him over the floor, the space bar sits him in lotus (and stands him up)
const KEYS = { ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right', ArrowUp: 'up', w: 'up', ArrowDown: 'down', s: 'down' };
function press(key, on) {
    state.keys[key] = on;
    if (on) { state.target = null; if (ui.sitting) sit(false); }
}
function onKey(e) {
    if (e.target?.closest?.('button') && e.key === ' ') e.target.blur();
    const key = KEYS[e.key.length === 1 ? e.key.toLowerCase() : e.key];
    if (key) { e.preventDefault(); if (e.type === 'keydown' && !e.repeat) press(key, true); if (e.type === 'keyup') press(key, false); return; }
    if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); if (e.type === 'keydown' && !e.repeat) sit(); }
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

    // Walking over the floor: with the keys (or the pad), or towards a target (going round what stands in the way). He
    // walks the way he faces and turns as he goes, in a curve, his eyes first: he only stops to turn when the way is
    // well behind him. Still a moment, or sitting, he turns to us; reaching, to that side
    let mx = 0, mz = 0, left = Infinity;
    const k = state.keys, keyed = k.left || k.right || k.up || k.down;
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
    if (aim !== null && !state.air) turnTo(aim, dt * (length > 0 ? 4.6 + 2 * state.run : 3.2));
    const off = aim === null ? 0 : Math.abs(wrap(aim - state.heading));
    // his pace: easy; held a while (or far to go), a trot. Setting off he gathers speed (the first steps are shorter),
    // and stopping he slows down over a step or two
    const trot = keyed && state.held > 3;    // (only when the keys are held a good while: a touch is always a calm walk)
    const top = trot ? TROT : PACE;
    const want = length > 0 && !state.air && !ui.sitting ? Math.min(top, left * 3 + 20) * Math.max(0, Math.cos(Math.min(Math.PI / 2, off * 1.15))) : 0;
    const was = state.speed;
    state.speed = want > state.speed ? Math.min(want, state.speed + (trot ? 260 : 220) * dt) : Math.max(want, state.speed - 380 * dt);
    // His legs walk him: on his feet (not jumping, sitting or getting up) the cycle goes on at his pace and he goes
    // exactly as far as the foot on the ground goes back under him (unevenly, as the book says: quicker through the
    // contact, cushioned into the down)
    const onFeet = !state.air && !ui.sitting && !state.rising && Math.max(...state.legSit) < 0.01 && name !== 'jump';
    const amp = 1 + 0.25 * state.run, kWalk = Math.max(0, Math.min(1, springs.walk.x));
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
    if (!onFeet && state.speed > 0.5 && !state.air) go = state.speed * dt;
    if (go > 0) {
        state.x += Math.cos(state.heading) * go;
        state.d = Math.max(0, Math.min(DEPTH, state.d + Math.sin(state.heading) * go));
        collide();
    }
    state.run = Math.max(0, Math.min(1, (state.speed - PACE) / (TROT - PACE)));
    const walking = state.speed > 3 ? 1 : 0;
    // when he stops, his body goes on a little and settles back (the weight he was carrying)
    if (was > 40 && state.speed <= 40 && want === 0) { springs.lean.v += 0.22 * (Math.sign(springs.face.x) || 1) * (1 - frame().front) * (was / PACE); springs.sy.v -= 0.7; }
    // The camera follows him with a little weight (late as he sets off), a little ahead of where he goes, and closer
    // as he goes into the distance (so he never gets tiny)
    const lead = Math.cos(state.heading) * state.speed * 0.9;
    state.cam += (state.x + lead - state.cam) * Math.min(1, dt * 1.3);
    state.zoom += (1 + ZOOM * state.d / DEPTH - state.zoom) * Math.min(1, dt * 1.2);
    // sitting in lotus, the world's time all but stops (softly, as he settles; and comes back as he gets up)
    const meditating = ui.sitting && springs.drop.x > (STAND - SIT) * 0.8;
    state.pace += ((meditating ? STILLNESS : 1) - state.pace) * Math.min(1, dt * (meditating ? 0.9 : 1.6));
    world.update(dt, { x: state.x, d: state.d, sitting: meditating, pace: state.pace });
    // the rulito under the tree: born after a moment of sitting there, kept while he sits, gone when he gets up
    const seated = ui.sitting && Math.min(...state.legSit) > 0.9;
    state.underTree = seated && world.underCrown(state.x, state.d) ? state.underTree + dt : 0;
    if (state.underTree >= RULITO_AFTER && !state.rul) { state.rul = { age: 0, head: 0, tail: 0, pop: 0, full: false }; rulito.value?.reshape(); }
    if (state.rul) {
        const r = state.rul;
        r.age += dt; r.pop = Math.max(0, r.pop - dt * 2.2);
        r.head = 1 - (1 - Math.min(1, r.age / RULITO_GROW)) ** 1.6;
        if (r.head >= 1 && !r.full) { r.full = true; r.pop = 1; play('rulito'); }
        if (!ui.sitting) r.tail = Math.min(1, r.tail + dt / RULITO_GO);
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
    state.breath = Math.sin(now / 1000 * Math.PI * 2 * rate) * (ui.sitting ? 1.3 : 1);
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
const LINE_W = 15, FILL = CICLOS.white;     // (about as thick as the line of her tree beside him)
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
    const F = focus();
    c.translate(F.x, F.y); c.scale(state.zoom, state.zoom); c.translate(-F.x, -F.y);
    const f = frame(), face = Math.sign(f.face);
    const W = view.w / view.k;

    // The floor, back to the horizon, and him on it at his depth (smaller and nearer the middle the farther back)
    world.drawSky(c, { width: W, cam: state.cam }, 0, groundAt(DEPTH));
    nightSky.value.style.opacity = world.night().toFixed(3);
    c.fillStyle = world.ground();
    c.fillRect(0, groundAt(DEPTH) - 4, W, view.h / view.k);
    world.drawGround(c, { x0: W / 2, cam: state.cam, groundAt, scaleAt, width: W });
    const x0 = W / 2, place = { x0, cam: state.cam, groundAt, scaleAt, width: W };
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
            const knee = { x: f.root.x + side * 104, y: state.ground - 40 }, under = { x: f.root.x - side * 36, y: state.ground - 9 - Math.sin(Math.PI * m) * 34 };
            joint = { x: joint.x + (knee.x - joint.x) * m, y: joint.y + (knee.y - joint.y) * m };
            end = { x: end.x + (under.x - end.x) * m, y: end.y + (under.y - end.y) * m };
        }
        // his toes: ahead in profile; turned to us, each a little out to its own side (crossed, along the leg)
        // (along the way he faces: pointing into the distance a foot shows a little up, towards us a little down)
        const toes = crossed > 0.5 ? Math.sign(end.x - joint.x) : hx * (1 - f.front) + outward * 0.75 * f.front;
        const tilt = crossed > 0.5 ? 0 : -hz * LEG.foot * 0.3;
        return { h, joint, end, toe: { x: end.x + toes * LEG.foot, y: end.y + 2 + tilt + (crossed > 0.5 ? 0 : state.toes[i]) } };
    });
    // Arms (in the world: shoulders on his body, hands where they are going, or reaching)
    const arms = ['far', 'near'].map((which, i) => {
        const s = map(f, mix(SHOULDER[which].u, side(FRONT_SHOULDER[which].u), spread(f.front)), mix(SHOULDER[which].v, FRONT_SHOULDER[which].v, f.front));
        let hand = map(f, hands[which].u.x, hands[which].v.x);
        const r = springs.reach.x;
        if (which === 'near' && state.reached && r > 0.001) hand = { x: hand.x + (state.reached.x - hand.x) * r, y: hand.y + (state.reached.y - hand.y) * r };
        // in lotus, as a Buddha meditating: the shoulders loose, each arm falls by his side, the elbow opening a little
        // outwards, and the forearm comes in to his lap, where the two hands meet in the middle, in front of his pelvis
        // (the mudra of meditation)
        const knees = Math.min(...state.legSit), own = Math.sign(s.x - f.root.x) || (i ? 1 : -1);
        if (knees > 0.001) {
            const k = knees * knees * (3 - 2 * knees), lap = map(f, PIVOT.x + own * 13 / Math.max(0.3, Math.abs(f.face)), PIVOT.y - 50);
            hand = { x: hand.x + (lap.x - hand.x) * k, y: hand.y + (lap.y - hand.y) * k };
        }
        const raised = hand.y < s.y;
        // elbows back in profile, out to their own side turned to us; down when the hand is up
        const out = (i ? -1 : 1) * face * lateral(), back = mix(-face * 0.7, out, f.front);
        // (sitting, the elbow goes out to its own side and a little down: the arm rounds softly by his side)
        if (Math.min(...state.legSit) > 0.5 && !raised) return { s, ...bend(s, hand, ARM.upper, ARM.fore, { x: own, y: 0.1 }) };
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
}

function loop(now) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    update(dt, now);
    draw();
}

// (for trying him out from the browser's console)
if (typeof window !== 'undefined') window.__sid = { state, springs, hands, ui, world };

onMounted(() => {
    document.body.classList.add('lab-page');
    ui.touch = window.matchMedia?.('(pointer: coarse)').matches ?? false;
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    window.addEventListener('blur', release);
    resize();
    window.addEventListener('resize', resize);
    stars = createStarField(starCanvas.value, nightSky.value, { pace: () => state.pace });
    raf = requestAnimationFrame(loop);
});
onBeforeUnmount(() => {
    document.body.classList.remove('lab-page');
    cancelAnimationFrame(raf);
    stars?.destroy();
    window.removeEventListener('resize', resize);
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('keyup', onKey);
    window.removeEventListener('blur', release);
});
</script>

<template>
    <div class="lab">
        <div ref="nightSky" class="night-sky"><canvas ref="starCanvas"></canvas></div>
        <!-- the rulito draws itself on its own canvas, which this scene lays over his head -->
        <Rulito ref="rulito" class="offstage" color="#fc747c" />
        <canvas ref="canvas" @pointermove="onMove" @pointerdown="onDown"></canvas>
        <!-- the app's own header: back on the left, the sound and the menu on the right -->
        <Header :hasBack="true" :hasMenu="true" />
        <!-- the buttons, at the bottom; on a phone in one row over the pad and the lotus -->
        <div class="panel" :class="{ bottom: ui.touch }">
            <button @click="walkAcross">Caminar</button>
            <button @click="wave">Saludar</button>
            <button @click="jump">Saltar</button>
            <button @click="stretch">Estirarse</button>
            <button v-if="!ui.touch" :class="{ on: ui.sitting }" @click="sit()">Loto</button>

            <span class="sep"></span>
            <button :class="{ on: ui.bones }" @click="ui.bones = !ui.bones">Esqueleto</button>
        </div>
        <!-- On a phone: a pad to walk him (held down) and a button for the lotus -->
        <div v-if="ui.touch" class="pad">
            <button v-for="key in ['up', 'left', 'right', 'down']" :key="key" :class="key" :aria-label="key"
                @pointerdown.prevent="press(key, true)" @pointerup="press(key, false)" @pointercancel="press(key, false)"
                @pointerleave="press(key, false)" @contextmenu.prevent>
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 15l6-6 6 6"/></svg>
            </button>
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
    position: relative;
    width: 100%;
    height: 100%;
    display: block;
    touch-action: none;
}
/* The cards' starry night (useStarField.js) behind the drawing, in Ciclos's teal: it shows as the yellow clears */
.offstage {
    position: absolute;
    left: -9999px;
    top: 0;
    width: 40px;
    visibility: hidden;
}
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
.panel {
    position: absolute;
    left: 16px;
    right: 16px;
    bottom: calc(20px + env(safe-area-inset-bottom, 0px));
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    justify-content: center;
}
/* As the app's buttons (style.scss): the cream, no border, its soft warm shadow, the coral when touched or on */
.panel button, .pad button, .lotus {
    font-family: 'Nunito', helvetica, sans-serif;
    font-size: 16px;
    margin: 0;
    height: 44px;
    padding: 0 18px;
    border: none;
    border-radius: 13px;
    background: #F7F8F1;
    color: #143246;
    filter: drop-shadow(0px 2px 3px rgba(20, 50, 70, 0.28));
    cursor: pointer;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
    transition: background 200ms ease-out, color 200ms ease-out;
}
.panel button:hover, .pad button:hover, .lotus:hover { background: #FF6F61; color: #F7F8F1; }
.panel button.on, .pad button:active, .lotus.on { background: #FF6F61; color: #F7F8F1; }
.panel button:focus, .pad button:focus, .lotus:focus { box-shadow: none; outline: none; }
.panel button:focus-visible, .pad button:focus-visible, .lotus:focus-visible { box-shadow: rgba(255, 111, 97, 0.35) 0 0 0 4px; }
.sep {
    width: 12px;
}
.panel.bottom {
    bottom: calc(196px + env(safe-area-inset-bottom, 0px));
    flex-wrap: nowrap;
    justify-content: flex-start;
    overflow-x: auto;
    scrollbar-width: none;
    padding: 4px 2px 6px;
}
.panel.bottom .sep { display: none; }
.panel.bottom button { flex: none; }
.pad {
    position: absolute;
    left: 16px;
    bottom: calc(16px + env(safe-area-inset-bottom, 0px));
    display: grid;
    grid-template-columns: repeat(3, 52px);
    grid-template-rows: repeat(3, 52px);
    gap: 6px;
    user-select: none;
    -webkit-user-select: none;
    touch-action: none;
}
.pad button {
    width: 52px;
    height: 52px;
    padding: 0;
    border-radius: 50%;
    display: grid;
    place-items: center;
    color: #FF6F61;
    touch-action: none;
}
.pad button:active { color: #F7F8F1; }
.pad .up { grid-area: 1 / 2; }
.pad .left { grid-area: 2 / 1; }
.pad .left svg { transform: rotate(-90deg); }
.pad .right { grid-area: 2 / 3; }
.pad .right svg { transform: rotate(90deg); }
.pad .down { grid-area: 3 / 2; }
.pad .down svg { transform: rotate(180deg); }
.lotus {
    position: absolute;
    right: 20px;
    bottom: calc(44px + env(safe-area-inset-bottom, 0px));
    width: 84px;
    height: 84px;
    padding: 0;
    border-radius: 50%;
    font-size: 17px;
}
@media (max-width: 600px) {
    .panel { gap: 8px; }
    .panel button { font-size: 14px; height: 40px; padding: 0 14px; }
    .sep { display: none; }
}
</style>

<style>
/* The app's header over his light sky: its cream icons in the ink of his line (the header is teleported into <body>,
   so this is not scoped; body.lab-page only while the lab is open) */
body.lab-page header .navContainer button,
body.lab-page header #soundButton,
body.lab-page header #menuButton {
    filter: brightness(0) opacity(0.78);
}
body.lab-page header #menuButton.active { filter: none; }
</style>
