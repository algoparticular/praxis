// Fluir, carrying the current (docs/verbos-y-dinamicas.md): the engine of the verb, shared by its four cards (Khanti,
// Aceptación, Celebración and Transformación).
// There is no route to follow: the current (a spark, a light) goes wherever the finger goes, anywhere in the scene, with
// a little lag so it always curves; it never stops (alone, it drifts home and waits there, breathing). Moving with
// others: what it passes by gently (`knots`: the beings round the fire) joins it, and from then on goes behind it as a
// train of lights. Rushing is what does not work: a finger going fast scatters the train and the current passes by
// without anyone joining; nothing is lost, it only does not gather. With everyone joined it goes home on its own with
// them all (`onAll`), and once there, `onEnd`. Only the logic lives here; each scene draws it its own way.
//  - Places (home, knots, bounds) are in the scene's own units (the art px of its 2160 square). How near, how fast and
//    how far apart are in px of the screen, so the game feels the same on a phone and on a computer, on every card
//    (until November 2026 each card gave them in its own units, and on a phone they came out small and slow): the scene
//    tells the engine where its units are on the screen every frame (`view(map, w, h)`).
//  - What falls off the screen, or on its very edge, is not waited for (`waits(name)`): the game is what is seen.
//  - Who is left calls: with two or fewer left all of them, and when the finger has gone a while without gathering
//    anyone, the nearest one (`calling(name)`, 0..1, for the scene to draw).
//  - Passing by someone too fast, it shrinks back (`shy(name)`, 0..1) and `onRush(knot)` sounds: rushing is what stops it.
//  - pointer: { u, v, down, lead } in the scene's units; `lead` says the finger is leading the current.
//  - key: Enter held goes by itself, gently, to the nearest one still to join (the keyboard's way to play).
//  - While it goes accompanied and calm it sounds: `onNote(step, level)` every half a second or so, quicker when quicker.
// `createStreamInput` (below) is the finger, the mouse, the keyboard and the ghost hand's hint, the same for the four.
import { gesture } from './useGhostHand.js';

export const createStream = ({
    home,                       // [x, y]: where it is born and goes back to (units)
    knots = [],                 // [{ name, x, y, box?: [left, top, w, h] }] (units): passing by one gently joins it
    bounds,                     // [left, top, right, bottom] (units): where it can go
    clamp = null,               // or (x, y) -> [x, y]: where it can go, when that is not a box (a river)
    area = null,                // [left, top, right, bottom] (units): where a finger put down leads it (default: bounds)
    reach = 46,                 // px of the screen: how near a knot's point (or its box) it has to pass to join it
                                // (a fingertip is about that wide)
    gentle = 0.8,               // up to this finger speed it is calm: px a second, or, under 10, screen-heights (of its
                                // shorter side) a second, so a big screen is not stricter than a phone
    rush = 2.3,                 // and from this many times `gentle` it is rushing
    edge = 18,                  // px: a knot nearer the screen's edge than this (or off it) is not waited for
    follow = 7,                 // how quickly it goes to the finger (1/s)
    calmToJoin = 0.55,          // how calm it has to be to gather someone
    autoSpeed = 700,            // units/s, going by itself (the keyboard, home)
    orbitR = [70, 26],          // units: how far it circles round home while alone
    spacing = 28,               // px of the screen along where it has been between one in the train and the next
    lonely = 6,                 // s led without gathering anyone before the nearest one left calls
    onJoin = () => {},
    onAll = () => {},
    onEnd = () => {},
    onNote = () => {},
    onFirst = () => {},
    onRush = () => {},
} = {}) => {
    const H = 1 / 60, KEEP = 40;      // its last 0.66 s, by time, for a tail
    const hx = new Float32Array(KEEP), hy = new Float32Array(KEEP);
    let hAt = 0, hClock = 0;
    // and where it has been by distance, a point every TRAIL_STEP units, for the train (spaced, even when it stops):
    // long enough for the whole train, rushing (1.6 times apart), with the scene shown as small as 0.1 px a unit
    const TRAIL_STEP = 10, TRAIL = Math.ceil((knots.length + 2) * spacing / 0.1 * 1.8 / TRAIL_STEP) + 2;
    const tx = new Float32Array(TRAIL), ty = new Float32Array(TRAIL);
    let tAt = 0;
    const s = {
        x: home[0], y: home[1],
        led: 0,                 // led by a finger (or the keyboard), smoothed 0..1
        calm: 1,                // 1 calm, 0 rushing, smoothed
        speed: 0,               // how fast it goes, of `gentle`, smoothed
        idle: 99,               // seconds since it was last led (99: never yet)
        touched: false,
        homing: false,          // everyone joined: on its way home
        done: false,
        joined: [],             // names, in the order they joined
        joinedAt: {},           // name -> clock when it joined
        knots,
        scale: 0.3,             // px of the screen a unit, from `view()`
        home: [...home],        // (a scene can move it: Aceptación's light goes home to the island at the end)
    };
    const fill = () => { hx.fill(s.x); hy.fill(s.y); tx.fill(s.x); ty.fill(s.y); };
    fill();
    let prev = null, fingerSpeed = 0, noteAt = 0, orbit = 0, short = 600, lonelyFor = 0;
    const seen = Object.fromEntries(knots.map((k) => [k.name, true]));      // on the screen, not on its edge
    const call = Object.fromEntries(knots.map((k) => [k.name, 0]));
    const shyness = Object.fromEntries(knots.map((k) => [k.name, 0]));
    const rushedAt = {};
    const clampTo = clamp ?? ((x, y) => [Math.min(bounds[2], Math.max(bounds[0], x)), Math.min(bounds[3], Math.max(bounds[1], y))]);
    const zone = area ?? bounds;
    // In units, from px of the screen
    const units = (px) => px / Math.max(0.02, s.scale);
    const gentlePx = () => (gentle < 10 ? gentle * short : gentle);
    const left = () => knots.filter((k) => seen[k.name] && !s.joined.includes(k.name));
    // How far (u, v) is from a knot: from its point, or from its box when it has one
    const away = (k, u, v) => {
        let d = Math.hypot(u - k.x, v - k.y);
        if (k.box) {
            const [l, t, w, h] = k.box;
            const dx = Math.max(l - u, 0, u - (l + w)), dy = Math.max(t - v, 0, v - (t + h));
            d = Math.min(d, Math.hypot(dx, dy) + units(reach) * 0.35);
        }
        return d;
    };
    const nearest = (u = s.x, v = s.y, list = left()) => list.reduce((best, k) => (!best || away(k, u, v) < away(best, u, v) ? k : best), null);
    s.inBounds = (u, v) => u >= zone[0] && u <= zone[2] && v >= zone[1] && v <= zone[3];
    s.units = units;
    // Where the scene's units are on the screen now: map(u, v) -> [x, y] in px of the stage, which is w x h. Called every
    // frame (the scene moves with the camera, the scroll and the screen's size)
    s.view = (map, w, h) => {
        const [ax, ay] = map(0, 0), [bx, by] = map(1000, 0);
        s.scale = Math.hypot(bx - ax, by - ay) / 1000 || s.scale;
        short = Math.max(240, Math.min(w, h));
        if (s.homing || s.done) return;
        knots.forEach((k) => {
            if (s.joined.includes(k.name)) return;
            const [x, y] = map(k.x, k.y);
            seen[k.name] = x >= edge && x <= w - edge && y >= edge && y <= h - edge;
        });
    };
    // Waiting to join: still to come, and on the screen
    s.waits = (name) => seen[name] !== false && !s.joined.includes(name);
    // 0..1: how near the current is to a knot still to join (to let it lean in, waiting)
    s.nearness = (name) => {
        const k = knots.find((each) => each.name === name);
        if (!k || !s.waits(name)) return 0;
        return Math.max(0, 1 - away(k, s.x, s.y) / (units(reach) * 2.2));
    };
    s.calling = (name) => (s.waits(name) ? call[name] : 0);
    s.shy = (name) => shyness[name] ?? 0;
    s.left = () => left().length;
    // Where it was `ago` seconds ago
    const past = (ago) => {
        const back = Math.min(KEEP - 2, Math.max(0, (ago - hClock) / H));
        const i = Math.floor(back), f = back - i;
        const a = (hAt - 1 - i + KEEP * 4) % KEEP, b = (a - 1 + KEEP) % KEEP;
        return [hx[a] + (hx[b] - hx[a]) * f, hy[a] + (hy[b] - hy[a]) * f];
    };
    s.past = past;
    // Where the j-th one in the train goes (0: the first that joined, right behind it): along where the current has
    // been, fluttering; rushing, they fall back and scatter
    s.train = (j, t) => {
        const back = Math.min(TRAIL - 2, (j + 1) * units(spacing) * (1 + 0.6 * (1 - s.calm)) / TRAIL_STEP);
        const i = Math.floor(back), f = back - i;
        const a = (tAt - 1 - i + TRAIL * 4) % TRAIL, b = (a - 1 + TRAIL) % TRAIL;
        const x = tx[a] + (tx[b] - tx[a]) * f, y = ty[a] + (ty[b] - ty[a]) * f;
        const loose = units(2.5 + 16 * (1 - s.calm));
        return [x + Math.sin(t * 2.3 + j * 1.9) * loose, y + Math.cos(t * 1.7 + j * 2.6) * loose * 0.6];
    };
    s.step = (dt, t, pointer, { key = false } = {}) => {
        if (s.done || dt <= 0) return;
        const finger = !!(pointer && pointer.down && pointer.lead) && !s.homing;
        const keyed = key && !finger && !s.homing;
        const gentleU = units(gentlePx()), rushU = gentleU * rush;
        // How fast the finger goes
        if (finger) {
            if (prev) {
                const v = Math.hypot(pointer.u - prev[0], pointer.v - prev[1]) / dt;
                // (quick to rise, slow to settle: a dash and a stop is a rush too)
                fingerSpeed += (v - fingerSpeed) * Math.min(1, dt / (v > fingerSpeed ? 0.05 : 0.35));
            }
            prev = [pointer.u, pointer.v];
        } else { prev = null; fingerSpeed += (0 - fingerSpeed) * Math.min(1, dt * 6); }
        const want = finger ? Math.min(1, Math.max(0, (rushU - fingerSpeed) / (rushU - gentleU))) : 1;
        s.calm += (want - s.calm) * Math.min(1, dt * (want < s.calm ? 8 : 1.6));
        s.led += ((finger || keyed ? 1 : 0) - s.led) * Math.min(1, dt * (finger || keyed ? 6 : 1.5));
        s.idle = finger || keyed ? 0 : s.idle + dt;
        if ((finger || keyed) && !s.touched) { s.touched = true; onFirst(); }
        // Where it goes, and how
        const x0 = s.x, y0 = s.y;
        const toward = ([gx, gy], speed) => {
            const dx = gx - s.x, dy = gy - s.y, d = Math.hypot(dx, dy);
            const go = Math.min(d, speed * dt * Math.min(1, 0.25 + d / 220));
            if (d > 1e-3) { s.x += dx / d * go; s.y += dy / d * go; }
            return d;
        };
        if (s.homing) {
            if (toward(s.home, autoSpeed * 1.2) < 24) { s.done = true; onEnd(); }
        } else if (finger) {
            const [gx, gy] = clampTo(pointer.u, pointer.v), e = 1 - Math.exp(-follow * dt);
            s.x += (gx - s.x) * e; s.y += (gy - s.y) * e;
        } else if (keyed) {
            const k = nearest();
            if (k) toward([k.x, k.y], autoSpeed);
        } else {
            // alone: it drifts back home and circles there, breathing
            orbit += dt * 0.9;
            const [gx, gy] = clampTo(s.home[0] + Math.cos(orbit) * orbitR[0], s.home[1] + Math.sin(orbit * 1.3) * orbitR[1]);
            const e = 1 - Math.exp(-1.1 * dt);
            s.x += (gx - s.x) * e; s.y += (gy - s.y) * e;
        }
        const moved = Math.hypot(s.x - x0, s.y - y0) / dt;
        s.speed += (Math.min(1.5, moved / gentleU) - s.speed) * Math.min(1, dt * 6);
        // Its trace, for the train
        hClock += dt;
        while (hClock >= H) { hClock -= H; hx[hAt] = s.x; hy[hAt] = s.y; hAt = (hAt + 1) % KEEP; }
        for (;;) {
            const l = (tAt - 1 + TRAIL) % TRAIL, dx = s.x - tx[l], dy = s.y - ty[l], d = Math.hypot(dx, dy);
            if (d < TRAIL_STEP) break;
            tx[tAt] = tx[l] + dx / d * TRAIL_STEP; ty[tAt] = ty[l] + dy / d * TRAIL_STEP; tAt = (tAt + 1) % TRAIL;
        }
        // Passing by gently, they join it; passing by in a rush, they shrink back
        const reachU = units(reach);
        if ((finger || keyed) && !s.homing) {
            const calmEnough = s.calm >= calmToJoin;
            left().forEach((k) => {
                const d = away(k, s.x, s.y);
                if (calmEnough && d <= reachU) {
                    s.joined.push(k.name);
                    s.joinedAt[k.name] = t;
                    lonelyFor = 0;
                    onJoin(k, s.joined.length - 1);
                } else if (!calmEnough && Math.min(d, finger ? away(k, pointer.u, pointer.v) : Infinity) <= reachU * 1.3
                    && !(t - (rushedAt[k.name] ?? -9) < 1.2)) {
                    // (the finger counts too: in a rush the current lags far behind it)
                    rushedAt[k.name] = t;
                    shyness[k.name] = 1;
                    onRush(k);
                }
            });
            if (s.joined.length && !left().length) { s.homing = true; onAll(); }
        }
        knots.forEach((k) => { shyness[k.name] = Math.max(0, shyness[k.name] - dt * 1.6); });
        // Who is left calls: all of them with two or fewer left (when there were more), and the nearest one when the
        // finger has gone a while without gathering anyone
        if (finger || keyed) lonelyFor += dt;
        const rest = left(), few = rest.length <= 2 && knots.filter((k) => seen[k.name]).length > 2;
        const lonelyOne = lonelyFor > lonely ? nearest() : null;
        knots.forEach((k) => {
            const want = !s.homing && s.waits(k.name) && (few || k === lonelyOne) ? 1 : 0;
            call[k.name] += (want - call[k.name]) * Math.min(1, dt * (want ? 1.2 : 3));
        });
        if ((finger || keyed) && s.speed > 0.04 && s.calm > 0.5 && t - noteAt > 0.55 - 0.2 * Math.min(1, s.speed)) {
            noteAt = t;
            onNote(Math.min(1, s.speed), s.calm);
        }
    };
    // The hint, for the ghost hand (gesture.slide): from where the current is, gently, by the nearest still to join and
    // on to the one nearest it (`count` of them), as path(u) for u 0..1 -> map(x, y) and path.dur, at a calm pace.
    // null when nobody is left. Only reads the state.
    s.hintPath = (map = (u, v) => [u, v], count = 2) => {
        if (s.done || s.homing) return null;
        const pts = [[s.x, s.y]];
        let list = left(), at = [s.x, s.y];
        for (let i = 0; i < count && list.length; i++) {
            const k = nearest(at[0], at[1], list);
            at = [k.x, k.y];
            pts.push(at);
            list = list.filter((each) => each !== k);
        }
        if (pts.length < 2) return null;
        // a gentle curve through them: each stretch bows a little to one side
        const segs = [];
        let length = 0;
        for (let i = 0; i < pts.length - 1; i++) {
            const [ax, ay] = pts[i], [bx, by] = pts[i + 1], d = Math.hypot(bx - ax, by - ay) || 1;
            const bow = 0.18 * d * (i % 2 ? -1 : 1);
            const c = [(ax + bx) / 2 - (by - ay) / d * bow, (ay + by) / 2 + (bx - ax) / d * bow];
            segs.push({ a: pts[i], b: pts[i + 1], c, from: length, d });
            length += d;
        }
        const path = (u) => {
            const at2 = Math.min(1, Math.max(0, u)) * length;
            const seg = segs.find((g) => at2 <= g.from + g.d) ?? segs[segs.length - 1];
            const q = Math.min(1, Math.max(0, (at2 - seg.from) / seg.d)), r = 1 - q;
            return map(r * r * seg.a[0] + 2 * r * q * seg.c[0] + q * q * seg.b[0], r * r * seg.a[1] + 2 * r * q * seg.c[1] + q * q * seg.b[1]);
        };
        path.dur = Math.min(4.5, Math.max(1.2, length / (units(gentlePx()) * 0.35)));
        return path;
    };
    // Born again at home, everyone free again
    s.reset = () => {
        s.x = s.home[0]; s.y = s.home[1];
        s.joined = []; s.joinedAt = {};
        s.homing = false; s.done = false; s.led = 0; s.calm = 1; s.speed = 0;
        lonelyFor = 0;
        knots.forEach((k) => { call[k.name] = 0; shyness[k.name] = 0; seen[k.name] = true; });
        fill();
    };
    return s;
};

// The finger, the mouse, the keyboard and the hint of the four cards of Fluir, on a stream:
//  - toUnits(clientX, clientY) -> [u, v] in the scene's units (or null);
//  - canLead(u, v, touch): where a finger (touch) or the mouse put down leads the current (default: the stream's area);
//  - busy(): while the rulito lives, nothing is led.
// A finger put down where it leads takes the current until it lifts, and the page does not scroll from there; the
// mouse leads it while it is over that place. A press that moved more than 12 px is a slide, not a tap (`slid()`, for
// the scene's click: it does not strum or hop). Enter or space held on the current's own target (`holdHead`,
// `onKey`) takes it gently to the nearest one left.
export const createStreamInput = ({ stream, toUnits, canLead = null, busy = () => false }) => {
    const leads = canLead ?? ((u, v) => stream.inBounds(u, v));
    const p = { u: 0, v: 0, down: false, touch: false, lead: false, key: false };
    let downAt = null, moved = false;
    const track = (event) => {
        const at = toUnits(event.clientX, event.clientY);
        if (!at) return;
        [p.u, p.v] = at;
        p.touch = event.pointerType === 'touch';
        p.down = p.touch ? event.type !== 'pointerup' && event.type !== 'pointercancel' : event.buttons > 0;
        if (event.type === 'pointerdown') {
            moved = false;
            downAt = [event.clientX, event.clientY];
            p.lead = !busy() && leads(p.u, p.v, p.touch);
        } else if (!p.touch && !p.down) p.lead = event.type !== 'pointerleave' && !busy() && leads(p.u, p.v, false);
        if (p.down && downAt && Math.hypot(event.clientX - downAt[0], event.clientY - downAt[1]) > 12) moved = true;
        if (p.touch && !p.down) p.lead = false;
    };
    // On a phone, a finger put down where it leads must not move the page (the browser would take the drag for a
    // scroll and cancel it); anywhere else the page scrolls as usual
    const touchStart = (event) => {
        const t0 = event.touches[0];
        if (!t0 || !event.cancelable || busy()) return;
        const at = toUnits(t0.clientX, t0.clientY);
        if (at && leads(at[0], at[1], true)) event.preventDefault();
    };
    const TYPES = ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'pointerleave'];
    let el = null;
    return {
        pointer: p,
        attach(target) {
            el = target;
            TYPES.forEach((type) => el.addEventListener(type, track, { passive: true }));
            el.addEventListener('touchstart', touchStart, { passive: false });
        },
        detach() {
            if (!el) return;
            TYPES.forEach((type) => el.removeEventListener(type, track));
            el.removeEventListener('touchstart', touchStart);
            el = null;
        },
        // the press that just ended was a slide (and forget it)
        slid() { const was = moved; moved = false; return was; },
        holdHead(event) { event.currentTarget.setPointerCapture?.(event.pointerId); track(event); },
        onKey: (down) => (event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            p.key = down;
        },
        letGo() { p.key = false; },
        step(dt, t) {
            if (busy()) return;
            stream.step(dt, t, { u: p.u, v: p.v, down: p.lead && (p.down || !p.touch), lead: true }, { key: p.key });
        },
        // The hint, without words: left alone `after` s (not while it is led, nor while the rulito lives), the ghost hand
        // takes the current gently by the nearest one still waiting and on to the one nearest it. While busy, the
        // current's idle clock (its call) starts again, so after a win both wait from the start
        hint({ hand, after, ready = true, map }) {
            if (busy()) stream.idle = 0;
            const wanted = !busy() && ready && !stream.done && !stream.homing && !p.key && !p.down && stream.idle > 0.5;
            if (!hand?.due(after, wanted)) return;
            const path = stream.hintPath(map, 2);
            if (path) hand.play(gesture.slide(path, path.dur), { loops: 1 });
        },
    };
};

// A route through waypoints ([x, y] in the scene's units), joined by a Catmull-Rom curve and sampled every `step`:
// { n, xs, ys, index(w) } (index: the sample at waypoint w), for a scene that draws along a fixed way (Transformación's sap up the trunk)
export const routeThrough = (way, step = 8) => {
    const dense = [], marks = [];
    let length = 0;
    const add = (x, y) => {
        const last = dense[dense.length - 1];
        if (last) length += Math.hypot(x - last[0], y - last[1]);
        dense.push([x, y, length]);
    };
    for (let i = 0; i < way.length - 1; i++) {
        const p0 = way[Math.max(0, i - 1)], p1 = way[i], p2 = way[i + 1], p3 = way[Math.min(way.length - 1, i + 2)];
        marks[i] = length;
        for (let j = i ? 1 : 0; j <= 24; j++) {
            const t = j / 24, t2 = t * t, t3 = t2 * t;
            const c = (a, b, c2, d) => 0.5 * (2 * b + (c2 - a) * t + (2 * a - 5 * b + 4 * c2 - d) * t2 + (3 * b - a - 3 * c2 + d) * t3);
            add(c(p0[0], p1[0], p2[0], p3[0]), c(p0[1], p1[1], p2[1], p3[1]));
        }
    }
    marks[way.length - 1] = length;
    const n = Math.floor(length / step) + 1, xs = new Float32Array(n), ys = new Float32Array(n);
    let j = 0;
    for (let i = 0; i < n; i++) {
        const at = i * step;
        while (j < dense.length - 2 && dense[j + 1][2] < at) j++;
        const a = dense[j], b = dense[j + 1] ?? a, f = Math.min(1, Math.max(0, (at - a[2]) / Math.max(1e-6, b[2] - a[2])));
        xs[i] = a[0] + (b[0] - a[0]) * f;
        ys[i] = a[1] + (b[1] - a[1]) * f;
    }
    return { n, xs, ys, index: (w) => Math.min(n - 1, Math.round(marks[w] / step)) };
};
