// Fluir, carrying the current (docs/verbos-y-dinamicas.md): the second engine of the verb, being tried in Celebración.
// There is no route to follow: the current (a spark, a light) goes wherever the finger goes, anywhere in the scene, with
// a little lag so it always curves; it never stops (alone, it drifts home and waits there, breathing). Moving with
// others: what it passes by gently (`knots`: the beings round the fire) joins it, and from then on goes behind it as a
// train of lights. Rushing is what does not work: a finger going fast (over `gentle`, units a second) scatters the train
// and the current passes by without anyone joining; nothing is lost, it only does not gather. With everyone joined it
// goes home on its own with them all (`onAll`), and once there, `onEnd`. Only the logic lives here; each scene draws it
// its own way, in its own units (Celebración's art px of the 2160 square).
//  - pointer: { u, v, down, lead } in the scene's units; `lead` says the finger is leading the current (the scene sets
//    it when the finger went down where the current can go, `bounds`).
//  - key: Enter held goes by itself, gently, to the nearest one still to join (the keyboard's way to play).
//  - While it goes accompanied and calm it sounds: `onNote(step, level)` every half a second or so, quicker when quicker.
export const createStream = ({
    home,                       // [x, y]: where it is born and goes back to
    knots = [],                 // [{ name, x, y, box?: [left, top, w, h] }]: passing by one gently joins it
    bounds,                     // [left, top, right, bottom]: where it can go
    reach = 190,                // how near a knot's point (or its box) it has to pass to join it
    follow = 7,                 // how quickly it goes to the finger (1/s)
    gentle = 1700,              // finger speed (units/s) up to which it is calm
    rush = 3800,                // and from which it is rushing
    calmToJoin = 0.55,          // how calm it has to be to gather someone
    autoSpeed = 700,            // units/s, going by itself (the keyboard, home)
    spacing = 90,               // units along where it has been between one in the train and the next (s.spacing:
                                // the scene can change it with the screen, up to 3 times this)
    onJoin = () => {},
    onAll = () => {},
    onEnd = () => {},
    onNote = () => {},
    onFirst = () => {},
} = {}) => {
    const H = 1 / 60, KEEP = 40;      // its last 0.66 s, by time, for a tail
    const hx = new Float32Array(KEEP), hy = new Float32Array(KEEP);
    let hAt = 0, hClock = 0;
    // and where it has been by distance, a point every TRAIL_STEP units, for the train (spaced, even when it stops)
    const TRAIL_STEP = 10, TRAIL = Math.ceil((knots.length + 2) * spacing * 3 * 1.8 / TRAIL_STEP) + 2;
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
        spacing,
    };
    const fill = () => { hx.fill(s.x); hy.fill(s.y); tx.fill(s.x); ty.fill(s.y); };
    fill();
    let prev = null, fingerSpeed = 0, noteAt = 0, orbit = 0;
    const clampTo = (x, y) => [Math.min(bounds[2], Math.max(bounds[0], x)), Math.min(bounds[3], Math.max(bounds[1], y))];
    const left = () => knots.filter((k) => !s.joined.includes(k.name));
    // How far (u, v) is from a knot: from its point, or from its box when it has one
    const away = (k, u, v) => {
        let d = Math.hypot(u - k.x, v - k.y);
        if (k.box) {
            const [l, t, w, h] = k.box;
            const dx = Math.max(l - u, 0, u - (l + w)), dy = Math.max(t - v, 0, v - (t + h));
            d = Math.min(d, Math.hypot(dx, dy) + reach * 0.35);
        }
        return d;
    };
    const nearest = (u = s.x, v = s.y, list = left()) => list.reduce((best, k) => (!best || away(k, u, v) < away(best, u, v) ? k : best), null);
    s.inBounds = (u, v) => u >= bounds[0] && u <= bounds[2] && v >= bounds[1] && v <= bounds[3];
    // 0..1: how near the current is to a knot still to join (to let it lean in, waiting)
    s.nearness = (name) => {
        const k = knots.find((each) => each.name === name);
        if (!k || s.joined.includes(name)) return 0;
        return Math.max(0, 1 - away(k, s.x, s.y) / (reach * 2.2));
    };
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
        const back = Math.min(TRAIL - 2, (j + 1) * Math.min(3 * spacing, s.spacing) * (1 + 0.6 * (1 - s.calm)) / TRAIL_STEP);
        const i = Math.floor(back), f = back - i;
        const a = (tAt - 1 - i + TRAIL * 4) % TRAIL, b = (a - 1 + TRAIL) % TRAIL;
        const x = tx[a] + (tx[b] - tx[a]) * f, y = ty[a] + (ty[b] - ty[a]) * f;
        const loose = 10 + 70 * (1 - s.calm);
        return [x + Math.sin(t * 2.3 + j * 1.9) * loose, y + Math.cos(t * 1.7 + j * 2.6) * loose * 0.6];
    };
    s.step = (dt, t, pointer, { key = false } = {}) => {
        if (s.done || dt <= 0) return;
        const finger = !!(pointer && pointer.down && pointer.lead) && !s.homing;
        const keyed = key && !finger && !s.homing;
        // How fast the finger goes
        if (finger) {
            if (prev) {
                const v = Math.hypot(pointer.u - prev[0], pointer.v - prev[1]) / dt;
                // (quick to rise, slow to settle: a dash and a stop is a rush too)
                fingerSpeed += (v - fingerSpeed) * Math.min(1, dt / (v > fingerSpeed ? 0.05 : 0.35));
            }
            prev = [pointer.u, pointer.v];
        } else { prev = null; fingerSpeed += (0 - fingerSpeed) * Math.min(1, dt * 6); }
        const want = finger ? Math.min(1, Math.max(0, (rush - fingerSpeed) / (rush - gentle))) : 1;
        s.calm += (want - s.calm) * Math.min(1, dt * (want < s.calm ? 8 : 1.6));
        s.led += ((finger || keyed ? 1 : 0) - s.led) * Math.min(1, dt * (finger || keyed ? 6 : 1.5));
        s.idle = finger || keyed ? 0 : s.idle + dt;
        if ((finger || keyed) && !s.touched) { s.touched = true; onFirst(); }
        // Where it goes, and how
        const x0 = s.x, y0 = s.y;
        const toward = ([tx, ty], speed) => {
            const dx = tx - s.x, dy = ty - s.y, d = Math.hypot(dx, dy);
            const go = Math.min(d, speed * dt * Math.min(1, 0.25 + d / 220));
            if (d > 1e-3) { s.x += dx / d * go; s.y += dy / d * go; }
            return d;
        };
        if (s.homing) {
            if (toward(home, autoSpeed * 1.2) < 24) { s.done = true; onEnd(); }
        } else if (finger) {
            const [tx, ty] = clampTo(pointer.u, pointer.v), e = 1 - Math.exp(-follow * dt);
            s.x += (tx - s.x) * e; s.y += (ty - s.y) * e;
        } else if (keyed) {
            const k = nearest();
            if (k) toward([k.x, k.y], autoSpeed);
        } else {
            // alone: it drifts back to the fire and circles there, breathing
            orbit += dt * 0.9;
            const [tx, ty] = [home[0] + Math.cos(orbit) * 70, home[1] + Math.sin(orbit * 1.3) * 26];
            const e = 1 - Math.exp(-1.1 * dt);
            s.x += (tx - s.x) * e; s.y += (ty - s.y) * e;
        }
        const moved = Math.hypot(s.x - x0, s.y - y0) / dt;
        s.speed += (Math.min(1.5, moved / gentle) - s.speed) * Math.min(1, dt * 6);
        // Its trace, for the train
        hClock += dt;
        while (hClock >= H) { hClock -= H; hx[hAt] = s.x; hy[hAt] = s.y; hAt = (hAt + 1) % KEEP; }
        for (;;) {
            const l = (tAt - 1 + TRAIL) % TRAIL, dx = s.x - tx[l], dy = s.y - ty[l], d = Math.hypot(dx, dy);
            if (d < TRAIL_STEP) break;
            tx[tAt] = tx[l] + dx / d * TRAIL_STEP; ty[tAt] = ty[l] + dy / d * TRAIL_STEP; tAt = (tAt + 1) % TRAIL;
        }
        // Passing by gently, they join it
        if ((finger || keyed) && s.calm >= calmToJoin) {
            left().forEach((k) => {
                if (away(k, s.x, s.y) > reach) return;
                s.joined.push(k.name);
                s.joinedAt[k.name] = t;
                onJoin(k, s.joined.length - 1);
            });
            if (s.joined.length === knots.length && !s.homing) { s.homing = true; onAll(); }
        }
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
        path.dur = Math.min(4.5, Math.max(1.2, length / (gentle * 0.35)));
        return path;
    };
    // Born again at home, everyone free again
    s.reset = () => {
        s.x = home[0]; s.y = home[1];
        s.joined = []; s.joinedAt = {};
        s.homing = false; s.done = false; s.led = 0; s.calm = 1; s.speed = 0;
        fill();
    };
    return s;
};
