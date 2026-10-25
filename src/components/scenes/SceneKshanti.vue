<script setup>
    // Khanti (patience): a network of glass flasks joined by pink tubes, a little creature living in each one, over a field
    // of blue dots. The layers come from the artwork (public/assets/kshanti, each cropped to its box: kshantiLayers.json
    // gives left, top, width, height in % of the 2160px square, the area and the main colour of each). The network, the
    // creatures in the flasks, the glass over them and the line of lavender thread float as one group, and each creature
    // has its own small life (breathing, floating, wiggling...).
    //  - The lavender thread is a single long brush stroke (kshantiLine.json: a line traced from the artwork, with the
    //    thickness the brush had at each point) that winds between the pink tubes without crossing a bubble, going over
    //    one tube and under the next: it is drawn twice, once under the pink and once over it, and the copy over it only
    //    shows where the line crosses in front (a mask). Nothing of it stays still: several short strokes, each tapering
    //    at both ends, travel along the route at their own pace, one after another.
    //  - Nine flasks have a cork (kshantiFlasks.json: each flask's pink is its own picture). Pressing a cork pops it and
    //    the flask empties as if it evaporated: the pink level sinks, the creature fades up and vapour rises. Pressing the
    //    central sign fills everything back.
    //  - The blue dots of the sky and the lavender specks are particles; touching a creature makes it flash and throw
    //    sparks of its colour, from a canvas in front.
    import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { createParallax, enterLayers } from '../../composables/useParallax.js';
    import { startStardust } from '../../composables/useStardust.js';
    import { createSparks } from '../../composables/useSparks.js';
    import { play } from '../../composables/useSound.js';
    import layers from '../../composables/kshantiLayers.json';
    import flaskData from '../../composables/kshantiFlasks.json';
    import LINE from '../../composables/kshantiLine.json';

    const props = defineProps({
        card: { type: Object, default: () => ({}) },
        active: Boolean
    });

    const root = ref(null);
    const skyCanvas = ref(null);
    const frontCanvas = ref(null);
    const network = ref(null);
    const els = {};
    const setEl = (n) => (el) => { els[n] = el; };
    let parallax = null;
    let sky = null;
    let front = null;
    let entered = false;
    let last = null;
    let tick = 0;

    const pct = (v) => `${v}%`;
    const place = ([left, top, w, h]) => ({ left: pct(left), top: pct(top), width: pct(w), height: pct(h) });

    // The big drawings, from back to front, and the creatures and little things between them (the numbers are the
    // artwork's layers: 3 pink bodies, 33 the central sign, 34 glass reflections, 35 outlines, 36-44 the corks)
    const big = { body: 3, shine: 34, lines: 35 };
    const SIGN = 33;
    const CORKS = [36, 37, 38, 39, 40, 41, 42, 43, 44];
    const things = Object.keys(layers).map(Number).filter((n) => n !== 2 && !Object.values(big).includes(n)).sort((a, b) => a - b)
        .map((n) => ({ n, style: place(layers[n]), area: layers[n][4], color: layers[n][5] }));
    const under = things.filter((t) => t.n < big.shine);        // inside the flasks, under the glass
    const over = things.filter((t) => t.n > big.lines);         // on top of the outlines
    const hitBox = (n, min = 5, grow = 1) => {
        const [left, top, w, h] = layers[n];
        const size = Math.max(min, w, h) + grow;
        return { left: pct((left + w / 2 - size / 2).toFixed(3)), top: pct((top + h / 2 - size / 2).toFixed(3)), width: pct(size.toFixed(3)), height: pct(size.toFixed(3)) };
    };

    // The flasks with a cork: how empty each is (level 0 full .. 1 empty, easing towards the target), how far its cork
    // has popped, and which creature lives in it
    const FLASKS = flaskData.map((f) => ({ ...f, style: place(f.box), level: 0, target: 0, pop: 0, life: 1, glow: 0, awake: false, shown: -1 }));
    const flaskOfCreature = {};
    const flaskOfCork = {};
    FLASKS.forEach((f) => { f.creatures.forEach((n) => { flaskOfCreature[n] = f; }); flaskOfCork[f.cork] = f; });
    // Each cork pops away from its flask, along the line from the flask's middle through the cork
    FLASKS.forEach((f) => {
        const [left, top, w, h] = layers[f.cork];
        const dx = left + w / 2 - f.cx, dy = top + h / 2 - f.cy, n = Math.hypot(dx, dy) || 1;
        f.away = { x: dx / n, y: dy / n };
        // near the left or right edge of the picture (the edge of a phone's screen) it pops up or down instead
        if (left + w / 2 > 88 || left + w / 2 < 12) f.away = { x: 0, y: f.away.y >= 0 ? 1 : -1 };
        f.corkAt = { x: left + w / 2, y: top + h / 2, size: Math.max(w, h) };
    });
    // A cork's hit covers the cork and the place it pops to, so it can be pressed again to fill the flask
    const corkHits = FLASKS.map((f) => {
        const size = Math.max(5.2, f.corkAt.size + 1.5) + 3.4;
        const x = f.corkAt.x + f.away.x * 1.7, y = f.corkAt.y + f.away.y * 1.7;
        return { flask: f, hit: { left: pct((x - size / 2).toFixed(3)), top: pct((y - size / 2).toFixed(3)), width: pct(size.toFixed(3)), height: pct(size.toFixed(3)) } };
    });
    const signHit = hitBox(SIGN, 8, 1);
    const touchable = things.filter((t) => t.area > 3500 && t.n !== SIGN && !CORKS.includes(t.n)).map((t) => ({ ...t, hit: hitBox(t.n) }));

    // Each creature's own small life, from its feet or its middle: [kind, origin, speed, amount]
    const LIFE = {
        29: ['breathe', '50% 100%', 0.8, 1],     // the one meditating
        30: ['float', '50% 20%', 0.6, 1],         // the jellyfish
        31: ['tilt', '50% 100%', 0.7, 1], 32: ['tilt', '50% 100%', 0.55, 1],
        28: ['wiggle', '50% 60%', 1.5, 1],        // the little larva
        33: ['pulse', '50% 50%', 0.7, 1],         // the central sign
        25: ['flicker', '50% 100%', 3.1, 1],      // the fire
        27: ['wave', '50% 60%', 0.9, 1],          // the water
        23: ['drift', '50% 50%', 0.35, 1],        // the cloud
        22: ['sway', '50% 100%', 0.6, 1], 26: ['sway', '50% 100%', 0.5, 1],
        11: ['spin', '50% 50%', 0.25, 1], 17: ['spin', '50% 50%', -0.2, 1],
    };
    const smooth = (v) => v * v * (3 - 2 * v);

    // ---- The thread: samples of x, y and half the thickness of the stroke, every few pixels of the 2160px square
    const N = LINE.pts.length / 3;
    const X = (i) => LINE.pts[3 * i];
    const Y = (i) => LINE.pts[3 * i + 1];
    const W = (i) => LINE.pts[3 * i + 2];
    // A ribbon along samples a..b: the line pushed out by its thickness (times widthAt) on both sides
    // `bend(i)` may pull a sample off the route: [dx, dy]. Both ends are rounded off with a half circle, so a stroke
    // never ends in a flat cut
    const ribbon = (a, b, widthAt, bend) => {
        const left = [], right = [];
        const at = bend ? (i) => { const d = bend(i); return [X(i) + d[0], Y(i) + d[1]]; } : (i) => [X(i), Y(i)];
        const f = (v) => v.toFixed(1);
        let first = null, last = null;
        for (let i = a; i <= b; i++) {
            const i0 = Math.max(0, i - 1), i1 = Math.min(N - 1, i + 1);
            const [x, y] = at(i), [xa, ya] = at(i0), [xb, yb] = at(i1);
            let tx = xb - xa, ty = yb - ya;
            const n = Math.hypot(tx, ty) || 1;
            tx /= n; ty /= n;
            const w = W(i) * widthAt(i);
            left.push(`${f(x - ty * w)} ${f(y + tx * w)}`);
            right.push(`${f(x + ty * w)} ${f(y - tx * w)}`);
            if (i === a) first = { x, y, tx, ty, w };
            last = { x, y, tx, ty, w };
        }
        const cap = (c, sign) => Array.from({ length: 5 }, (_, k) => {
            const th = Math.PI * (k + 1) / 6;
            return `${f(c.x - c.ty * c.w * Math.cos(th) + sign * c.tx * c.w * Math.sin(th))} ${f(c.y + c.tx * c.w * Math.cos(th) + sign * c.ty * c.w * Math.sin(th))}`;
        });
        return `M${left.join('L')}L${cap(last, 1).join('L')}L${right.reverse().join('L')}L${cap(first, -1).reverse().join('L')}Z`;
    };
    const FRONT_D = LINE.front.map(([a, b]) => `M${Array.from({ length: b - a + 1 }, (_, k) => `${X(a + k)} ${Y(a + k)}`).join('L')}`);
    // The strokes: the route passes behind the pink at certain places (HIDE: the middle of each such stretch). A stroke
    // lives between two neighbouring ones: it comes out of the first (its tail still hidden there) growing along the
    // route, reaches the second and goes into it (its head hidden there), tail following, so it never begins or ends in
    // the open air. Then it rests, and takes the next stretch of the route. Each has its own pace.
    const HIDE = LINE.behind.map(([a, b]) => Math.round((a + b) / 2));
    // 14 strokes; every third one is long (it goes through two stretches of the route, between three hiding places)
    const STROKES = Array.from({ length: 14 }, (_, i) => {
        const hops = i % 3 === 0 ? 2 : 1;
        return {
            hops, at: Math.floor(i * (HIDE.length - 2) / 14), p: (i * 0.37) % 1.2, dur: (4.4 + (i % 4) * 1.1) * (hops === 2 ? 1.5 : 1), rest: 0.03 + (i % 3) * 0.05,
            tail: 0, head: 0, grab: 0,
        };
    });
    const ease = (v) => v * v * (3 - 2 * v);
    const clamp01 = (v) => Math.min(1, Math.max(0, v));
    const placeStroke = (k) => {
        const a = HIDE[k.at], b = HIDE[Math.min(k.at + k.hops, HIDE.length - 1)];
        k.head = a + (b - a) * ease(clamp01(k.p / 0.55));
        k.tail = a + (b - a) * ease(clamp01((k.p - 0.45) / 0.55));
    };
    STROKES.forEach(placeStroke);

    // The finger (or the mouse): where it is on the thread's square, when it last moved, and whether it is pressing
    const pointer = { u: 0, v: 0, at: -99, down: false };
    let nowT = 0;
    const track = (event) => {
        const box = els.thread?.getBoundingClientRect();
        if (!box || !box.width) return;
        pointer.u = (event.clientX - box.left) / box.width * 2160;
        pointer.v = (event.clientY - box.top) / box.height * 2160;
        pointer.down = event.pointerType === 'touch' || event.buttons > 0;
        pointer.at = nowT;
    };
    const release = (event) => { track(event); pointer.down = false; };
    const GRAB = 300;                      // how near (in the 2160 units) a stroke has to be for the finger to reach it
    const REACH = 240;                     // how far round the finger the stroke is pulled
    // The strokes answer the finger. A mouse passing over only makes the two nearest strokes lean a little towards it;
    // pressing (or a finger dragging) pulls the nearest one right up to it, stretching it. They keep travelling, and
    // let go when the finger stops.
    const moveStrokes = (dt, t) => {
        const active = t - pointer.at < 1.1;
        const found = [];
        STROKES.forEach((k) => {
            k.p += dt / k.dur;
            if (k.p >= 1 + k.rest) { k.p = 0; k.at += k.hops; if (k.at + k.hops > HIDE.length - 1) k.at = 0; }
            placeStroke(k);
            if (!active || k.head - k.tail < 3) return;
            let bestD = Infinity;
            for (let i = Math.floor(k.tail); i <= k.head; i += 4) bestD = Math.min(bestD, (X(i) - pointer.u) ** 2 + (Y(i) - pointer.v) ** 2);
            if (bestD < GRAB * GRAB) found.push({ k, bestD });
        });
        found.sort((a, b) => a.bestD - b.bestD);
        const taken = new Set(found.slice(0, pointer.down ? 1 : 2).map((f) => f.k));
        STROKES.forEach((k) => {
            const want = taken.has(k) ? (pointer.down ? 1 : 0.4) : 0;
            k.grab += (want - k.grab) * Math.min(1, dt * (want ? 4 : 2.2));
        });
    };
    const bendOf = (k) => k.grab < 0.02 ? null : (i) => {
        const dx = pointer.u - X(i), dy = pointer.v - Y(i);
        const f = k.grab * 0.55 * Math.exp(-(dx * dx + dy * dy) / (REACH * REACH));
        return [dx * f, dy * f];
    };
    // The stretch [from, to] (fractions of the stroke) of a stroke, narrowest at its two ends
    const strokeD = (k, from, to, bend) => {
        const tail = Math.floor(k.tail), len = k.head - k.tail;
        if (len < 3) return '';
        const taper = (i) => 0.3 + 0.34 * Math.pow(Math.sin(Math.PI * clamp01((i - tail) / len)), 0.7);
        return ribbon(tail + Math.floor(from * len), tail + Math.floor(to * len), taper, bend);
    };
    // Nested ribbons, so each stroke fades in and out along its length instead of ending abruptly
    const FADES = [[0, 1], [0.12, 0.88], [0.24, 0.76], [0.36, 0.64], [0.48, 0.52]];
    const strokesD = () => {
        const bends = STROKES.map(bendOf);
        return FADES.map(([from, to]) => STROKES.map((k, n) => strokeD(k, from, to, bends[n])).join(''));
    };

    const live = (t, ramp) => {
        things.forEach(({ n }) => {
            const el = els[n];
            if (!el) return;
            const [kind = 'bob', origin = '50% 50%', speed = 0.5 + (n % 5) * 0.12, amount = 1] = LIFE[n] ?? [];
            const p = t * speed + n * 1.3;
            const s = el.style;
            s.transformOrigin = origin;
            let tx = 0, ty = 0, rot = 0, sx = 1, sy = 1;
            switch (kind) {
                case 'breathe': sy = 1 + Math.sin(p * 1.6) * 0.012; ty = Math.sin(p * 0.8) * 0.18; break;
                case 'float': ty = Math.sin(p * 1.1) * 0.45; rot = Math.sin(p * 0.7) * 3; sy = 1 + Math.sin(p * 1.1 + 1) * 0.02; break;
                case 'tilt': rot = Math.sin(p * 1.3) * 2.6; break;
                case 'wiggle': rot = Math.sin(p * 2.2) * 7; tx = Math.sin(p * 0.9) * 0.15; break;
                case 'pulse': sx = sy = 1 + Math.sin(p * 1.8) * 0.018; break;
                case 'flicker': sy = 1 + Math.sin(p * 3) * 0.035 + Math.sin(p * 5.3) * 0.02; sx = 1 - Math.sin(p * 3) * 0.015; rot = Math.sin(p * 2.1) * 2; break;
                case 'wave': rot = Math.sin(p * 1.5) * 4; ty = Math.sin(p * 1.5 + 1) * 0.12; break;
                case 'drift': tx = Math.sin(p) * 0.5; ty = Math.sin(p * 0.6) * 0.15; break;
                case 'sway': rot = Math.sin(p * 1.4) * 3.5; break;
                case 'spin': rot = (p * 40) % 360; break;
                default: ty = Math.sin(p * 1.4) * 0.22; tx = Math.cos(p * 0.9) * 0.12; rot = Math.sin(p * 1.1) * 3;
            }
            const k = ramp * amount;
            tx *= k; ty *= k; rot *= k; sx = 1 + (sx - 1) * k; sy = 1 + (sy - 1) * k;
            // A creature whose flask is evaporating fades up and away; a popped cork jumps off its flask
            const home = flaskOfCreature[n];
            if (home) {
                const gone = 1 - smooth(home.life);
                ty -= gone * 1.6; sx *= 1 - gone * 0.14; sy *= 1 - gone * 0.14;
                s.opacity = home.life >= 0.999 ? '1' : (1 - gone).toFixed(3);
                // lit by a stroke going by
                if (home.glow > 0.01) { s.filter = `brightness(${(1 + home.glow * 0.2).toFixed(3)}) saturate(${(1 + home.glow * 0.15).toFixed(3)})`; home.lit = true; sx *= 1 + home.glow * 0.03; sy *= 1 + home.glow * 0.03; }
                else if (home.lit) { s.filter = ''; home.lit = false; }
                // an empty flask's creature is not there to be touched, and must not catch the touch meant for the cork
                const catcher = els['chit' + n];
                if (catcher) catcher.style.pointerEvents = home.life < 0.6 ? 'none' : '';
            }
            const flask = flaskOfCork[n];
            if (flask) {
                tx += flask.away.x * flask.pop * 3.4; ty += flask.away.y * flask.pop * 3.4; rot += (flask.away.x >= 0 ? 1 : -1) * flask.pop * 34;
            }
            s.translate = `${tx.toFixed(3)}cqw ${ty.toFixed(3)}cqw`;
            s.rotate = `${rot.toFixed(2)}deg`;
            s.scale = `${sx.toFixed(4)} ${sy.toFixed(4)}`;
        });
    };

    // The flasks: each one's pink sinks as it evaporates, and vapour rises from its surface
    const sparks = createSparks(640);
    const stepFlasks = (dt) => {
        const canvas = frontCanvas.value?.getBoundingClientRect();
        FLASKS.forEach((f) => {
            const rate = f.target > f.level ? dt / 3.4 : dt / 1.6;
            f.level = f.target > f.level ? Math.min(f.target, f.level + rate) : Math.max(f.target, f.level - rate);
            f.pop += ((f.target > 0 ? 1 : 0) - f.pop) * Math.min(1, dt * 7);
            // The creature fades away early while the pink sinks, and comes back as soon as the flask is filled again
            f.life = f.target > 0 ? Math.max(0, f.life - dt / 1.1) : Math.min(1, f.life + dt / 0.9);
            const el = els[f.id];
            if (el && Math.abs(f.level - f.shown) > 0.0005) {
                f.shown = f.level;
                const pos = `0 ${((1 - f.level) * 100).toFixed(2)}%`;
                el.style.maskPosition = pos;
                el.style.webkitMaskPosition = pos;
                el.style.opacity = f.level >= 0.999 ? '0' : '1';
            }
            // Vapour from the surface while it is emptying
            if (el && canvas && f.target > f.level && f.level < 0.98) {
                const box = el.getBoundingClientRect();
                const n = Math.round(dt * 120 * (0.5 + f.level)) + (Math.random() < dt * 120 % 1 ? 1 : 0);
                for (let i = 0; i < n; i++) {
                    sparks.burst(box.left + box.width * (0.22 + Math.random() * 0.56) - canvas.left, box.top + box.height * (0.05 + f.level * 0.9) - canvas.top, {
                        n: 1, colors: [0xffffff, 0xffe3e8, 0xfbc4cf], speed: 16, life: 2.6, size: 4.6, spread: 4,
                    });
                }
            }
        });
    };
    // A cork: the first press empties the flask, the next one fills it again
    const empty = (f, event) => {
        if (f.target > 0) {
            f.target = 0;
            play('tap');
            return;
        }
        f.target = 1;
        const canvas = frontCanvas.value.getBoundingClientRect();
        const box = event.currentTarget.getBoundingClientRect();
        sparks.burst(box.left + box.width / 2 - canvas.left, box.top + box.height / 2 - canvas.top, { n: 14, colors: [0xffc470, 0xffe3a8, 0xffffff], speed: 90, size: 4.4, spread: 5 });
        play('tap');
    };
    // The central sign: everything is filled again
    const refill = (event) => {
        FLASKS.forEach((f) => { f.target = 0; });
        const canvas = frontCanvas.value.getBoundingClientRect();
        const box = event.currentTarget.getBoundingClientRect();
        sparks.burst(box.left + box.width / 2 - canvas.left, box.top + box.height / 2 - canvas.top, { n: 40, colors: [0xffffff, 0xcfeff0, 0xffd1dc], speed: 150, size: 5.2, spread: 10 });
        els[SIGN]?.animate({ filter: ['brightness(1)', 'brightness(1.6)', 'brightness(1)'], scale: ['1', '1.16', '1'] }, { duration: 900, easing: 'ease-out' });
        play('star');
    };

    // A stroke passing by a flask lights the creature in it for a moment, with a few lavender sparks as it comes on
    const wakeCreatures = (dt) => {
        const canvas = frontCanvas.value?.getBoundingClientRect();
        FLASKS.forEach((f) => {
            let near = false;
            if (f.life > 0.9) {
                for (const k of STROKES) {
                    if (k.head - k.tail < 3) continue;
                    const c = Math.floor((k.tail + k.head) / 2);
                    const dx = X(c) - f.cx * 21.6, dy = Y(c) - f.cy * 21.6, reach = f.r * 21.6 + 38;
                    if (dx * dx + dy * dy < reach * reach) { near = true; break; }
                }
            }
            if (near && !f.awake && canvas) {
                const el = els[f.creatures[0]];
                const box = el?.getBoundingClientRect();
                if (box) sparks.burst(box.left + box.width / 2 - canvas.left, box.top + box.height / 2 - canvas.top, { n: 8, colors: [0xcfcdf2, 0xb9b6ea, 0xffffff], speed: 55, life: 1.8, size: 4, spread: 12 });
            }
            f.awake = near;
            f.glow += ((near ? 1 : 0) - f.glow) * Math.min(1, dt * (near ? 5 : 1.3));
        });
    };

    // Touching a creature: it flashes and throws sparks of its own colour (nothing happens if its flask is empty)
    const touch = (thing, event) => {
        const home = flaskOfCreature[thing.n];
        if (home && home.level > 0.25) return;
        const box = event.currentTarget.getBoundingClientRect();
        const canvas = frontCanvas.value.getBoundingClientRect();
        const c = thing.color;
        const own = [c, ((c >> 16 & 255) * 0.5 + 127) << 16 | ((c >> 8 & 255) * 0.5 + 127) << 8 | ((c & 255) * 0.5 + 127), 0xffffff];
        sparks.burst(box.left + box.width / 2 - canvas.left, box.top + box.height / 2 - canvas.top, { n: 26, colors: own, speed: 120, size: 5, spread: 8 });
        els[thing.n]?.animate({ filter: ['brightness(1)', 'brightness(1.5) saturate(1.3)', 'brightness(1)'] }, { duration: 700, easing: 'ease-out' });
        play(thing.area > 15000 ? 'star' : 'tap');
    };
    const onKey = (action) => (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        action(event);
    };

    const enter = () => {
        if (entered || !props.active) return;
        entered = true;
        enterLayers([{ el: network.value, y: 70, scale: 0.88, duration: 2000 }]);
    };

    onMounted(() => {
        root.value.addEventListener('pointermove', track, { passive: true });
        root.value.addEventListener('pointerdown', track, { passive: true });
        root.value.addEventListener('pointerup', release, { passive: true });
        parallax = createParallax(root.value, ({ x, y, scroll, t, ramp }) => {
            // The network floats, its creatures floating in it, and the thread with it
            network.value.style.translate = `${-x * 14}px ${-y * 7 + Math.sin(t * 0.5) * 7 * ramp - scroll * 40}px`;
            network.value.style.rotate = `${(Math.sin(t * 0.27) * 0.35 * ramp).toFixed(3)}deg`;
            const dt = last === null ? 0 : Math.min(0.1, t - last);
            last = t;
            nowT = t;
            moveStrokes(dt, t);
            live(t, ramp);
            stepFlasks(dt);
            wakeCreatures(dt);
            // The strokes of the thread, travelling (every other frame is enough)
            if (tick++ % 2 === 0 && els.wb0) {
                strokesD().forEach((d, k) => {
                    els['wb' + k].setAttribute('d', d);
                    els['wf' + k].setAttribute('d', d);
                });
            }
        });
        sky = startStardust(skyCanvas.value, {
            groups: [
                { count: 300, colors: [0x007096, 0x007096, 0x1b86a8, 0x006f96], size: [2, 7], drift: 5, twinkle: 0.3, reach: 130, push: 32, parallax: 12 },
                { count: 26, colors: [0xaaa8d2, 0xb9b7e0], size: [2, 5], drift: 16, twinkle: 0.6, reach: 130, push: 32, parallax: 20 },
            ],
        });
        front = startStardust(frontCanvas.value, { groups: [sparks.group()] });
        enter();
    });
    watch(() => props.active, enter);
    onBeforeUnmount(() => {
        root.value?.removeEventListener('pointermove', track);
        root.value?.removeEventListener('pointerdown', track);
        root.value?.removeEventListener('pointerup', release);
        parallax?.destroy();
        sky?.destroy();
        front?.destroy();
    });
</script>

<template>
    <div class="scene" ref="root">
        <canvas class="field" ref="skyCanvas"></canvas>

        <!-- A square frame; every layer is placed as a fraction of it, as in the illustration -->
        <div class="frame">
            <div class="network" ref="network">
                <!-- The lavender thread, under the pink: the whole line, and a bright stretch travelling along it -->
                <svg class="thread" :ref="setEl('thread')" viewBox="0 0 2160 2160" aria-hidden="true">
                    <path v-for="k in 5" :key="k" class="worm" :class="`w${k - 1}`" :ref="setEl(`wb${k - 1}`)" />
                </svg>

                <img class="layer" :style="place(layers[big.body])" src="/assets/kshanti/k3.webp" alt="" draggable="false">
                <img v-for="f in FLASKS" :key="f.id" class="layer flask" :ref="setEl(f.id)" :style="f.style" :src="`/assets/kshanti/${f.id}.webp`" alt="" draggable="false">
                <img v-for="t in under" :key="t.n" class="layer" :ref="setEl(t.n)" :style="t.style" :src="`/assets/kshanti/k${t.n}.webp`" alt="" draggable="false">
                <img class="layer" :style="place(layers[big.shine])" src="/assets/kshanti/k34.webp" alt="" draggable="false">
                <img class="layer" :style="place(layers[big.lines])" src="/assets/kshanti/k35.webp" alt="" draggable="false">

                <!-- ...and over it, only where the thread crosses in front of a tube or a flask -->
                <svg class="thread" viewBox="0 0 2160 2160" aria-hidden="true">
                    <defs>
                        <mask id="kshanti-front" maskUnits="userSpaceOnUse" x="0" y="0" width="2160" height="2160">
                            <path v-for="(d, i) in FRONT_D" :key="i" :d="d" fill="none" stroke="#fff" stroke-width="80" stroke-linecap="round" stroke-linejoin="round" />
                        </mask>
                    </defs>
                    <g mask="url(#kshanti-front)">
                        <path v-for="k in 5" :key="k" class="worm" :class="`w${k - 1}`" :ref="setEl(`wf${k - 1}`)" />
                    </g>
                </svg>

                <img v-for="t in over" :key="t.n" class="layer" :ref="setEl(t.n)" :style="t.style" :src="`/assets/kshanti/k${t.n}.webp`" alt="" draggable="false">

                <!-- What can be touched: the corks, the creatures and the central sign -->
                <div v-for="t in touchable" :key="'hit' + t.n" :ref="setEl('chit' + t.n)" class="hit" role="button" tabindex="0" :style="t.hit"
                    :aria-label="$i18n.locale === 'en' ? 'Creature' : 'Criatura'"
                    @pointerdown.prevent="touch(t, $event)" @keydown="onKey((e) => touch(t, e))($event)"></div>
                <div v-for="c in corkHits" :key="'cork' + c.flask.id" class="hit" role="button" tabindex="0" :style="c.hit"
                    :aria-label="$i18n.locale === 'en' ? 'Cork' : 'Tapón'"
                    @pointerdown.prevent="empty(c.flask, $event)" @keydown="onKey((e) => empty(c.flask, e))($event)"></div>
                <div class="hit" role="button" tabindex="0" :style="signHit"
                    :aria-label="$i18n.locale === 'en' ? 'Fill everything again' : 'Volver a llenar todo'"
                    @pointerdown.prevent="refill" @keydown="onKey(refill)($event)"></div>
            </div>
        </div>
        <canvas class="field front" ref="frontCanvas"></canvas>
    </div>
</template>

<style scoped>
    .scene {
        position: absolute;
        inset: 0;
        overflow: hidden;
    }

    .field {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
    }

    .front {
        z-index: 1;
    }

    .frame {
        --s: min(max(100vw, 62svh), 85svh, 115vw);
        position: absolute;
        width: var(--s);
        height: var(--s);
        left: calc(50% - var(--s) / 2);
        bottom: 0;
        container-type: size;
        pointer-events: none;
    }

    /* On a tall screen the picture would sit at the bottom with the sky empty above it: lift it towards the middle */
    @media (max-aspect-ratio: 1/1) {
        .frame { bottom: calc((100svh - var(--s)) * 0.4); }
    }

    .network {
        position: absolute;
        inset: 0;
    }

    .layer {
        position: absolute;
        display: block;
        max-width: none;
        user-select: none;
        pointer-events: none;
    }

    /* A flask's pink: a soft edge that sinks as the mask slides (see stepFlasks) */
    .flask {
        -webkit-mask-image: linear-gradient(to bottom, transparent 44%, #000 56%);
        mask-image: linear-gradient(to bottom, transparent 44%, #000 56%);
        -webkit-mask-size: 100% 200%;
        mask-size: 100% 200%;
        -webkit-mask-repeat: no-repeat;
        mask-repeat: no-repeat;
        -webkit-mask-position: 0 100%;
        mask-position: 0 100%;
    }

    .thread {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        overflow: visible;
        pointer-events: none;
    }

    .worm {
        fill: #aeabd9;
    }

    .w0 { fill-opacity: 0.7; }
    .w1 { fill-opacity: 0.4; }
    .w2 { fill-opacity: 0.4; }
    .w3 { fill-opacity: 0.45; }
    .w4 { fill-opacity: 0.5; }

    .hit {
        position: absolute;
        border-radius: 50%;
        cursor: pointer;
        pointer-events: auto;
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;
        outline: none;
    }

    .hit:focus-visible {
        outline: 2px solid rgba(255, 255, 255, 0.85);
        outline-offset: 2px;
    }
</style>
