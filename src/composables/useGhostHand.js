// The ghost hand: how a scene shows, without words, the gesture its game asks for. It is a fingertip of light (dots, as
// every particle of the scenes: no picture), drawn by the scene's stage over everything, that comes in, does the gesture
// on the real place (touch, hold, rub, pull back and let go, drag, slide along, tap in time) and goes. It goes at once
// when the person touches anything, so it never gets in the way; each scene decides when to call it (left alone a while).
//
// A gesture is a script of steps, played in order:
//   { go: P, dur }        move to P (eased); while down it leaves a trail
//   { path: (u) => P, dur }  follow a path from u = 0 to 1
//   { down: true }        press (a ripple goes out)       { up: true }  lift
//   { ring: dur }         while pressed, a ring of dots fills round the tip (holding)
//   { wait: dur }
// P is a point in the stage canvas's CSS px ([x, y]), a function returning one (so it follows what moves) or a DOM
// element (its centre: the scenes keep their touch targets over what they belong to).
// The helpers in `gesture` write the scripts for the verbs: tap, hold, rub, sling, drag, slide, taps.
// The hand keeps the count of how long the scene has been left alone: a scene asks `due(HINT_AFTER, wanted)` each frame
// and, when it is, calls play().
import { createStardust } from './useStardust.js';

const TAU = Math.PI * 2;
const ease = (u) => u * u * (3 - 2 * u);
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

const TIP = 72;         // dots of the fingertip
const RING = 44;        // dots of the ring that fills while holding
const TRAIL = 56;       // dots left behind while it moves pressed
const RIPPLE = 28;      // dots of the ripple when it presses
const SHADE = 12;       // a faint dark halo under the tip, so it reads on light skies too
const CORE = 7;         // the soft light of the tip

// Seconds left alone before the hand shows the gesture, in every scene (and again after a game is won)
export const HINT_AFTER = 7;

const hex = (v) => [(v >> 16) & 255, (v >> 8) & 255, v & 255].map((c) => c / 255);

// The scripts for each verb's gesture
export const gesture = {
    // A touch on P
    tap: (P) => [{ go: P, dur: 0.7 }, { wait: 0.15 }, { down: true }, { wait: 0.2 }, { up: true }, { wait: 0.45 }],
    // Seconds from the start of tap() to the moment it presses (to land a tap on a beat)
    TAP_LEAD: 0.85,
    // Touches on several points, one after the other
    taps: (list, gap = 0.35) => list.flatMap((P, i) => [{ go: P, dur: i ? 0.45 : 0.7 }, { wait: 0.1 }, { down: true }, { wait: 0.16 }, { up: true }, { wait: gap }]),
    // Pressing P and staying: the ring fills
    hold: (P, dur = 1.8) => [{ go: P, dur: 0.7 }, { wait: 0.15 }, { down: true }, { ring: dur }, { up: true }, { wait: 0.4 }],
    // Rubbing back and forth over P (span in px)
    rub: (P, span = 44, dur = 1.8) => [
        { go: P, dur: 0.7 }, { down: true },
        { path: (u, at) => [at[0] + Math.sin(u * TAU * 4) * span, at[1] + Math.sin(u * TAU * 8) * span * 0.18], dur, from: P },
        { up: true }, { wait: 0.3 },
    ],
    // Pressing P, pulling back away from `toward` and letting go, as a sling
    sling: (P, toward, pull = 90) => {
        const back = () => {
            const a = at(P), b = at(toward);
            const dx = a[0] - b[0], dy = a[1] - b[1], d = Math.hypot(dx, dy) || 1;
            return [a[0] + dx / d * pull, a[1] + dy / d * pull];
        };
        return [{ go: P, dur: 0.7 }, { wait: 0.15 }, { down: true }, { wait: 0.2 }, { go: back, dur: 0.75, slow: true }, { wait: 0.3 }, { up: true, fling: toward }, { wait: 0.6 }];
    },
    // Pressing A, dragging to B, letting go
    drag: (A, B, dur = 1.1) => [{ go: A, dur: 0.7 }, { wait: 0.12 }, { down: true }, { wait: 0.15 }, { go: B, dur }, { wait: 0.12 }, { up: true }, { wait: 0.45 }],
    // Pressing at the start of a path and sliding along it
    slide: (path, dur = 2.4) => [{ go: () => path(0), dur: 0.7 }, { down: true }, { path, dur }, { up: true }, { wait: 0.4 }],
};

// A point: [x, y], a function returning one, or an element (its centre, in the canvas's px)
let canvasEl = null;
function at(P) {
    if (!P) return [0, 0];
    if (typeof P === 'function') return P();
    if (P instanceof Element) {
        const b = P.getBoundingClientRect();
        const c = canvasEl?.getBoundingClientRect() ?? { left: 0, top: 0 };
        return [b.left + b.width / 2 - c.left, b.top + b.height / 2 - c.top];
    }
    return P;
}

// createGhostHand(stage, { color, order }): the hand of one scene, drawn by its stage. play(script, { loops }) shows a
// gesture (a new one replaces the one playing), stop() sends it away, `playing` says whether it is out.
export function createGhostHand(stage, { color = 0xf7f8f1, shade = 0x143246, order = 1e7 } = {}) {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const tint = hex(color), dark = hex(shade);

    // The tip's dots, in a disc (golden angle), bigger and brighter at the centre
    const tipDots = Array.from({ length: TIP }, (_, i) => {
        const r = Math.sqrt((i + 0.5) / TIP), a = i * 2.39996;
        return { r, a, seed: Math.random() * TAU };
    });
    const trail = Array.from({ length: TRAIL }, () => ({ x: 0, y: 0, born: -9 }));
    let trailNext = 0, trailClock = 0;

    // The state
    let script = null, stepAt = 0, stepStart = 0, from = [0, 0];
    let loopsLeft = 0;
    let pos = [0, 0];
    let show = 0, want = 0;           // presence
    let down = 0, pressed = false;    // how pressed (eased) and whether it is
    let ring = 0, ringFor = 0;        // the ring's fill and how long it takes
    let rippleAt = -9, flingAt = -9, flingDir = [0, 0];
    let lastT = null, now = 0;
    let idle = 0;                     // seconds since the person last touched anything (not counting while it plays)
    let field = null, gone = false;

    const size = () => {
        const c = stage.canvas;
        return Math.min(c.clientWidth, c.clientHeight);
    };

    const startStep = () => {
        const step = script[stepAt];
        stepStart = now;
        from = [...pos];
        if (!step) return;
        if (step.down) { pressed = true; rippleAt = now; ring = 0; }
        if (step.up) {
            pressed = false;
            if (step.fling) {
                const b = at(step.fling);
                const dx = b[0] - pos[0], dy = b[1] - pos[1], d = Math.hypot(dx, dy) || 1;
                flingAt = now; flingDir = [dx / d, dy / d];
            }
        }
        if (step.ring) ringFor = step.ring;
    };

    const next = () => {
        stepAt += 1;
        if (stepAt >= script.length) {
            if (loopsLeft > 1) { loopsLeft -= 1; stepAt = 0; }
            else { script = null; want = 0; pressed = false; return; }
        }
        startStep();
    };

    const advance = () => {
        if (!script) return;
        // Instant steps run through at once
        for (let guard = 0; script && guard < 8; guard++) {
            const step = script[stepAt];
            const dur = step.dur ?? step.wait ?? step.ring ?? 0;
            const u = dur > 0 ? clamp((now - stepStart) / dur) : 1;
            if (step.go) {
                const to = at(step.go);
                const e = step.slow ? 1 - (1 - u) ** 3 : ease(u);
                pos = [from[0] + (to[0] - from[0]) * e, from[1] + (to[1] - from[1]) * e];
            } else if (step.path) {
                const e = ease(u);
                pos = step.from ? step.path(e, at(step.from)) : step.path(e);
            }
            if (step.ring) ring = u;
            if (u < 1) break;
            next();
        }
    };

    // The state moves on once per frame (both groups are drawn from it)
    let stepped = null;
    const step = (t) => {
        if (stepped === t) return;
        stepped = t;
        const raw = lastT === null ? 0 : Math.max(0, t - lastT);
        const dt = Math.min(0.1, raw);
        lastT = t;
        now += dt;
        if (!script) idle += raw;           // by the clock, so a slow phone does not wait longer
        advance();
        show += (want - show) * Math.min(1, dt * (want > show ? 5 : 7));
        down += ((pressed ? 1 : 0) - down) * Math.min(1, dt * 14);
        if (!pressed && ring > 0) ring = Math.max(0, ring - dt * 3);
        // The trail it leaves while it moves pressed
        if (pressed && show > 0.5) {
            trailClock += dt;
            while (trailClock > 0.02) {
                trailClock -= 0.02;
                const d = trail[trailNext];
                d.x = pos[0]; d.y = pos[1]; d.born = now;
                trailNext = (trailNext + 1) % TRAIL;
            }
        }
    };
    const writer = (data) => {
        const P = data.positions, S = data.sizes, A = data.alphas, T = data.tints;
        let i = 0;
        return (x, y, s, a, c) => {
            P[i * 3] = x; P[i * 3 + 1] = y; P[i * 3 + 2] = 0;
            S[i] = s; A[i] = a;
            T[i * 3] = c[0]; T[i * 3 + 1] = c[1]; T[i * 3 + 2] = c[2];
            i += 1;
        };
    };
    const radius = () => clamp(size() * 0.03, 13, 24);

    // The glow (soft): a faint dark halo so it reads on light skies, the light of the tip, and the trail
    const glow = (t, data) => {
        step(t);
        const put = writer(data);
        const R = radius(), [px, py] = pos;
        for (let j = 0; j < SHADE; j++) {
            const a = j / SHADE * TAU;
            put(px + Math.cos(a) * R * 0.5, py + Math.sin(a) * R * 0.5 + R * 0.15, R * 2.6, 0.13 * show, dark);
        }
        for (let j = 0; j < CORE; j++) {
            const a = j / CORE * TAU + now * 0.7;
            const r = j ? R * 0.45 : 0;
            put(px + Math.cos(a) * r, py + Math.sin(a) * r, R * (j ? 1.6 : 2.4) * (1 + 0.25 * down), show * (j ? 0.35 : 0.6) * (1 + 0.4 * down), tint);
        }
        for (const d of trail) {
            const a = clamp(1 - (now - d.born) / 0.7);
            put(d.x, d.y, R * 0.9 * (0.4 + 0.6 * a), show * a * a * 0.45, tint);
        }
    };

    // The dots (hard, as the stipple of the drawings): the tip, the ring that fills while held, the ripple and the burst
    const dots = (t, data) => {
        step(t);
        const put = writer(data);
        const R = radius(), [px, py] = pos;
        const breathe = 1 + 0.06 * Math.sin(now * 3.1);
        const squeeze = 1 - 0.2 * down;             // pressed, the tip gathers a little
        for (const d of tipDots) {
            const r = d.r * R * breathe * squeeze;
            const x = px + Math.cos(d.a) * r + 0.6 * Math.sin(now * 5 + d.seed);
            const y = py + Math.sin(d.a) * r + 0.6 * Math.cos(now * 4.3 + d.seed);
            const core = 1 - d.r;
            put(x, y, 2 + 2.6 * core + 0.8 * down, show * (0.55 + 0.45 * core), tint);
        }
        const ringOn = show * (ringFor > 0 && (pressed || ring > 0) ? 1 : 0);
        for (let j = 0; j < RING; j++) {
            const q = j / RING;
            const a = -Math.PI / 2 + q * TAU;
            const lit = q <= ring;
            put(px + Math.cos(a) * R * 2, py + Math.sin(a) * R * 2, lit ? 4 : 2.6, ringOn * (lit ? 1 : 0.3), tint);
        }
        const rAge = now - rippleAt, fAge = now - flingAt;
        for (let j = 0; j < RIPPLE; j++) {
            const a = j / RIPPLE * TAU;
            if (fAge < 0.6) {
                // The burst: dots flying off towards where the sling aims
                const u = fAge / 0.6, spread = (j / RIPPLE - 0.5) * 0.7;
                const dx = flingDir[0] * Math.cos(spread) - flingDir[1] * Math.sin(spread);
                const dy = flingDir[0] * Math.sin(spread) + flingDir[1] * Math.cos(spread);
                const dist = R * (1 + 5 * ease(u)) * (0.7 + 0.3 * ((j * 7) % 5) / 5);
                put(px + dx * dist, py + dy * dist, 4 * (1 - u) + 1.5, show * (1 - u), tint);
            } else {
                const u = clamp(rAge / 0.55);
                const rr = R * (1 + 1.6 * ease(u));
                put(px + Math.cos(a) * rr, py + Math.sin(a) * rr, 3.4, rAge < 0.55 ? show * (1 - u) : 0, tint);
            }
        }
    };

    const still = { parallax: 0, drift: 0, jitter: 0, twinkle: 0, reach: 0 };
    createStardust(null, {
        stage,
        groups: [
            { dynamic: { count: SHADE + CORE + TRAIL, update: glow }, look: 'soft', ...still, order },
            { dynamic: { count: TIP + RING + RIPPLE, update: dots }, look: 'hard', ...still, order: order + 1 },
        ],
    }).then((made) => { if (gone) made?.destroy(); else field = made; }).catch(() => {});
    canvasEl = stage.canvas;

    // Any touch or key sends it away
    const away = () => { idle = 0; if (script || want) { script = null; want = 0; pressed = false; } };
    window.addEventListener('pointerdown', away, true);
    window.addEventListener('keydown', away, true);

    return {
        // Shows a gesture (loops: how many times it does it)
        play(steps, { loops = 2 } = {}) {
            if (reduced || !steps?.length) return;
            canvasEl = stage.canvas;
            script = steps;
            loopsLeft = loops;
            stepAt = 0;
            // It comes in from a little away from where it starts, already there if it was out
            const first = steps.find((s) => s.go || s.path);
            const target = first?.go ? at(first.go) : first?.path ? (first.from ? first.path(0, at(first.from)) : first.path(0)) : pos;
            if (show < 0.1) pos = [target[0] + 26, target[1] + 34];
            want = 1;
            idle = 0;
            startStep();
        },
        // Whether it is time to show the gesture: left alone `after` seconds (7 in every scene) and not already showing
        // it. `wanted` says whether the game wants showing now (not while it is played, nor while a rulito lives): while
        // it does not, the count starts again, so after a game is won it also waits the whole 7 s
        due(after = HINT_AFTER, wanted = true) {
            if (!wanted) { idle = 0; return false; }
            return !reduced && !script && idle > after;
        },
        // Counts as a touch (for touches the scene takes by keyboard, or to wait again)
        wait() { idle = 0; },
        stop: away,
        get playing() { return !!script; },
        destroy() {
            gone = true;
            window.removeEventListener('pointerdown', away, true);
            window.removeEventListener('keydown', away, true);
            field?.destroy();
        },
    };
}
