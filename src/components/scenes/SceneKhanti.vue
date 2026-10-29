<script setup>
    // Khanti (patience): a network of glass flasks joined by pink tubes, a little creature living in each one, over a field
    // of blue dots. The layers come from the artwork (public/assets/khanti, each cropped to its box: khantiLayers.json
    // gives left, top, width, height in % of the 2160px square, the area and the main colour of each). The network, the
    // creatures in the flasks, the glass over them and the line of lavender thread float as one group, and each creature
    // has its own small life (breathing, floating, wiggling...).
    //  - The lavender thread is a single long brush stroke (khantiLine.json: a line traced from the artwork, with the
    //    thickness the brush had at each point) that winds between the pink tubes without crossing a bubble, going over
    //    one tube and under the next: it is drawn twice, once under the pink and once over it, and the copy over it only
    //    shows where the line crosses in front (a mask). Nothing of it stays still: several short strokes, each tapering
    //    at both ends, travel along the route at their own pace, one after another.
    //  - Nine flasks have a cork (khantiFlasks.json: each flask's pink is its own picture). Pressing a cork pops it and
    //    the flask empties as if it evaporated: the pink level sinks, the creature fades up and vapour rises. Pressing the
    //    central sign fills everything back.
    //  - The blue dots of the sky and the lavender specks are particles; touching a creature makes it flash and throw
    //    sparks of its colour.
    // It is drawn in WebGL (useLayerStage): the network is a group of planes at one depth, the camera slides with the
    // pointer or the tilt; a band of light sweeps over the glass now and then, the pink inside the flasks has the light
    // of the liquid rippling in it and sinks in the shader. The thread is drawn on two canvases (under and over) shown
    // as textures. The touch targets are DOM elements in a square kept over the network.
    import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { createParallax } from '../../composables/useParallax.js';
    import { createLayerStage } from '../../composables/useLayerStage.js';
    import { startStardust } from '../../composables/useStardust.js';
    import { createSparks } from '../../composables/useSparks.js';
    import { play } from '../../composables/useSound.js';
    import { sceneMilestone } from '../../analytics.js';
    import layers from '../../composables/khantiLayers.json';
    import flaskData from '../../composables/khantiFlasks.json';
    import LINE from '../../composables/khantiLine.json';

    const props = defineProps({
        card: { type: Object, default: () => ({}) },
        active: Boolean
    });

    const root = ref(null);
    const canvas = ref(null);
    const overlay = ref(null);              // the square of the network, over the stage: the touch targets live in it
    const catchers = {};                    // the creatures' touch targets, by layer number
    const setCatcher = (n) => (el) => { catchers[n] = el; };
    const N_ = {};                          // the layers (stage nodes), by layer number or flask id
    let stage = null;
    let net = null;                         // the network's group
    let parallax = null;
    let sky = null;
    let front = null;
    let entered = false;
    let gone = false;
    let last = null;
    let tick = 0;
    let F = { x: 0, y: 0, size: 1 };        // the square frame on screen at rest (px)

    // The camera slides SLIDE px at the edge of a swipe; the network moves 14px across and 7 up and down, as before
    const SLIDE = 50;
    const SLIDE_Y = 25;
    const NET_Z = 14 / (SLIDE + 14);

    const pct = (v) => `${v}%`;

    // The big drawings, from back to front, and the creatures and little things between them (the numbers are the
    // artwork's layers: 3 pink bodies, 33 the central sign, 34 glass reflections, 35 outlines, 36-44 the corks)
    const big = { body: 3, shine: 34, lines: 35 };
    const SIGN = 33;
    const CORKS = [36, 37, 38, 39, 40, 41, 42, 43, 44];
    const things = Object.keys(layers).map(Number).filter((n) => n !== 2 && !Object.values(big).includes(n)).sort((a, b) => a - b)
        .map((n) => ({ n, area: layers[n][4], color: layers[n][5] }));
    const under = things.filter((t) => t.n < big.shine);        // inside the flasks, under the glass
    const over = things.filter((t) => t.n > big.lines);         // on top of the outlines
    const hitBox = (n, min = 5, grow = 1) => {
        const [left, top, w, h] = layers[n];
        const size = Math.max(min, w, h) + grow;
        return { left: pct((left + w / 2 - size / 2).toFixed(3)), top: pct((top + h / 2 - size / 2).toFixed(3)), width: pct(size.toFixed(3)), height: pct(size.toFixed(3)) };
    };

    // The flasks with a cork: how empty each is (level 0 full .. 1 empty, easing towards the target), how far its cork
    // has popped, and which creature lives in it
    const FLASKS = flaskData.map((f) => ({ ...f, level: 0, target: 0, pop: 0, life: 1, glow: 0, awake: false }));
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
    const FRONT_PATHS = FRONT_D.map((d) => new Path2D(d));
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
        const box = overlay.value?.getBoundingClientRect();
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

    // ---- The thread on two canvases (the square of the artwork): all of it under the pink, and over it only where it
    // crosses in front. Drawn at the frame's size (the stroke is soft: no need for the screen's full density).
    const threadUnder = document.createElement('canvas');
    const threadOver = document.createElement('canvas');
    const FADE_ALPHA = [0.7, 0.4, 0.4, 0.45, 0.5];
    const drawThread = () => {
        const px = Math.max(2, Math.round(F.size * Math.min(window.devicePixelRatio || 1, 1.5)));
        [threadUnder, threadOver].forEach((c) => { if (c.width !== px) { c.width = px; c.height = px; } });
        const k = px / 2160;
        const paths = strokesD().map((d) => (d ? new Path2D(d) : null));
        [threadUnder, threadOver].forEach((c, which) => {
            const ctx = c.getContext('2d');
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.globalCompositeOperation = 'source-over';
            ctx.clearRect(0, 0, px, px);
            ctx.setTransform(k, 0, 0, k, 0, 0);
            ctx.fillStyle = '#aeabd9';
            paths.forEach((path, i) => { if (path) { ctx.globalAlpha = FADE_ALPHA[i]; ctx.fill(path); } });
            ctx.globalAlpha = 1;
            if (which === 1) {
                // only where the line crosses in front of a tube or a flask
                ctx.globalCompositeOperation = 'destination-in';
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 80;
                ctx.lineCap = ctx.lineJoin = 'round';
                FRONT_PATHS.forEach((path) => ctx.stroke(path));
                ctx.globalCompositeOperation = 'source-over';
            }
        });
        N_.threadUnder?.refresh();
        N_.threadOver?.refresh();
    };

    // A box of the artwork ([left, top, w, h] in %), in px of the screen at rest
    const inFrame = ([left, top, w, h]) => ({ left: F.x + left / 100 * F.size, top: F.y + top / 100 * F.size, w: w / 100 * F.size, h: h / 100 * F.size });
    // Where a layer turns and scales about, from a CSS transform-origin ('50% 100%')
    const originOf = (box, origin) => {
        const [ox, oy] = origin.split(' ').map((v) => parseFloat(v) / 100);
        return { x: box.left + ox * box.w, y: box.top + oy * box.h };
    };
    const flashes = {};                     // when a creature was touched (it flashes)
    let signFlash = -9;

    const live = (t, ramp) => {
        things.forEach(({ n }) => {
            const node = N_[n];
            if (!node) return;
            const [kind = 'bob', , speed = 0.5 + (n % 5) * 0.12, amount = 1] = LIFE[n] ?? [];
            const p = t * speed + n * 1.3;
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
            let bright = 1, saturate = 1, opacity = 1;
            // A creature whose flask is evaporating fades up and away; a popped cork jumps off its flask
            const home = flaskOfCreature[n];
            if (home) {
                const goneBy = 1 - smooth(home.life);
                ty -= goneBy * 1.6; sx *= 1 - goneBy * 0.14; sy *= 1 - goneBy * 0.14;
                opacity = 1 - goneBy;
                // lit by a stroke going by
                if (home.glow > 0.01) { bright += home.glow * 0.2; saturate += home.glow * 0.15; sx *= 1 + home.glow * 0.03; sy *= 1 + home.glow * 0.03; }
                // an empty flask's creature is not there to be touched, and must not catch the touch meant for the cork
                const catcher = catchers[n];
                if (catcher) catcher.style.pointerEvents = home.life < 0.6 ? 'none' : '';
            }
            const flask = flaskOfCork[n];
            if (flask) {
                tx += flask.away.x * flask.pop * 3.4; ty += flask.away.y * flask.pop * 3.4; rot += (flask.away.x >= 0 ? 1 : -1) * flask.pop * 34;
            }
            // Touched: a flash of brightness over 0.7s
            if (flashes[n] !== undefined) {
                const f = (t - flashes[n]) / 0.7;
                if (f >= 1) delete flashes[n];
                else { const b = Math.sin(Math.PI * Math.min(1, f * 2)) * (f < 0.5 ? 1 : 1 - (f - 0.5) * 2); bright += 0.5 * Math.max(0, b); saturate += 0.3 * Math.max(0, b); }
            }
            if (n === SIGN) {
                const f = (t - signFlash) / 0.9;
                if (f >= 0 && f < 1) { const b = Math.sin(Math.PI * f); bright += 0.6 * b; sx *= 1 + 0.16 * b; sy *= 1 + 0.16 * b; }
            }
            node.x = tx / 100 * F.size;
            node.y = ty / 100 * F.size;
            node.rotate = rot;
            node.sx = sx;
            node.sy = sy;
            node.opacity = opacity;
            node.uniforms.uBright.value = bright;
            node.uniforms.uSaturate.value = saturate;
        });
    };

    // The flasks: each one's pink sinks as it evaporates, and vapour rises from its surface
    const sparks = createSparks(640);
    const stepFlasks = (dt) => {
        FLASKS.forEach((f) => {
            const rate = f.target > f.level ? dt / 3.4 : dt / 1.6;
            f.level = f.target > f.level ? Math.min(f.target, f.level + rate) : Math.max(f.target, f.level - rate);
            f.pop += ((f.target > 0 ? 1 : 0) - f.pop) * Math.min(1, dt * 7);
            // The creature fades away early while the pink sinks, and comes back as soon as the flask is filled again
            f.life = f.target > 0 ? Math.max(0, f.life - dt / 1.1) : Math.min(1, f.life + dt / 0.9);
            const node = N_[f.id];
            if (!node) return;
            node.uniforms.uSink.value.y = f.level;
            node.opacity = f.level >= 0.999 ? 0 : 1;
            // Vapour from the surface while it is emptying
            if (f.target > f.level && f.level < 0.98) {
                const box = node.boxOnScreen(inFrame(f.box));
                const n = Math.round(dt * 120 * (0.5 + f.level)) + (Math.random() < dt * 120 % 1 ? 1 : 0);
                for (let i = 0; i < n; i++) {
                    sparks.burst(box.left + box.width * (0.22 + Math.random() * 0.56), box.top + box.height * (0.05 + f.level * 0.9), {
                        n: 1, colors: [0xffffff, 0xffe3e8, 0xfbc4cf], speed: 16, life: 2.6, size: 4.6, spread: 4,
                    });
                }
            }
        });
    };
    const centreOn = (event) => {
        const box = event.currentTarget.getBoundingClientRect();
        const area = canvas.value.getBoundingClientRect();
        return [box.left + box.width / 2 - area.left, box.top + box.height / 2 - area.top];
    };
    // A cork: the first press empties the flask, the next one fills it again
    const empty = (f, event) => {
        if (f.target > 0) {
            f.target = 0;
            play('bloom');          // the flask fills again
            return;
        }
        f.target = 1;
        sceneMilestone('cork_popped');
        const [x, y] = centreOn(event);
        sparks.burst(x, y, { n: 14, colors: [0xffc470, 0xffe3a8, 0xffffff], speed: 90, size: 4.4, spread: 5 });
        play('release');            // the cork pops and the flask evaporates
    };
    // The central sign: everything is filled again
    const refill = (event) => {
        FLASKS.forEach((f) => { f.target = 0; });
        sceneMilestone('refill_all');
        const [x, y] = centreOn(event);
        sparks.burst(x, y, { n: 40, colors: [0xffffff, 0xcfeff0, 0xffd1dc], speed: 150, size: 5.2, spread: 10 });
        signFlash = last ?? 0;
        play('breath');
    };

    // A stroke passing by a flask lights the creature in it for a moment, with a few lavender sparks as it comes on
    const wakeCreatures = (dt) => {
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
            if (near && !f.awake) {
                const n = f.creatures[0];
                const node = N_[n];
                if (node) {
                    const box = node.boxOnScreen(inFrame(layers[n]));
                    sparks.burst(box.left + box.width / 2, box.top + box.height / 2, { n: 8, colors: [0xcfcdf2, 0xb9b6ea, 0xffffff], speed: 55, life: 1.8, size: 4, spread: 12 });
                }
            }
            f.awake = near;
            f.glow += ((near ? 1 : 0) - f.glow) * Math.min(1, dt * (near ? 5 : 1.3));
        });
    };

    // Touching a creature: it flashes and throws sparks of its own colour (nothing happens if its flask is empty)
    const touch = (thing, event) => {
        const home = flaskOfCreature[thing.n];
        if (home && home.level > 0.25) return;
        const [x, y] = centreOn(event);
        const c = thing.color;
        const own = [c, ((c >> 16 & 255) * 0.5 + 127) << 16 | ((c >> 8 & 255) * 0.5 + 127) << 8 | ((c & 255) * 0.5 + 127), 0xffffff];
        sparks.burst(x, y, { n: 26, colors: own, speed: 120, size: 5, spread: 8 });
        flashes[thing.n] = last ?? 0;
        play(thing.area > 15000 ? 'star' : 'tap');
    };
    const onKey = (action) => (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        action(event);
    };

    // A square frame, bottom-aligned; on a tall screen lifted towards the middle so the sky is not empty above it
    const layout = (W, H) => {
        const size = Math.min(Math.max(W, 0.62 * H), 0.85 * H, 1.15 * W);
        const bottom = W <= H ? (H - size) * 0.4 : 0;
        F = { x: W / 2 - size / 2, y: H - size - bottom, size };
    };

    const build = (s) => {
        net = s.depth(NET_Z).group();
        N_.threadUnder = net.canvas(threadUnder);
        N_.body = net.image('/assets/khanti/k3.webp', { water: 0.6 });
        FLASKS.forEach((f) => { N_[f.id] = net.image(`/assets/khanti/${f.id}.webp`, { sink: true, water: 1 }); });
        under.forEach((t) => { N_[t.n] = net.image(`/assets/khanti/k${t.n}.webp`); });
        N_.shine = net.image('/assets/khanti/k34.webp', { sheen: 1 });
        N_.lines = net.image('/assets/khanti/k35.webp');
        N_.threadOver = net.canvas(threadOver);
        over.forEach((t) => { N_[t.n] = net.image(`/assets/khanti/k${t.n}.webp`); });
        net.enter({ y: 70, scale: 0.88, duration: 2000 });
    };

    const place = (W, H) => {
        layout(W, H);
        net.pivot = { x: F.x + F.size / 2, y: F.y + F.size / 2 };
        const square = { left: F.x, top: F.y, w: F.size, h: F.size };
        N_.threadUnder.place(square);
        N_.threadOver.place(square);
        N_.body.place(inFrame(layers[big.body]));
        N_.shine.place(inFrame(layers[big.shine]));
        N_.lines.place(inFrame(layers[big.lines]));
        FLASKS.forEach((f) => N_[f.id].place(inFrame(f.box)));
        things.forEach(({ n }) => {
            const box = inFrame(layers[n]);
            N_[n].place(box, originOf(box, (LIFE[n] ?? [])[1] ?? '50% 50%'));
        });
        drawThread();
    };

    // The square of touch targets follows the network on screen
    const placeOverlay = () => {
        const el = overlay.value;
        if (!el) return;
        const c = net.toScreen(F.x + F.size / 2, F.y + F.size / 2);
        const e = net.toScreen(F.x + F.size, F.y + F.size / 2);
        const size = 2 * Math.hypot(e.x - c.x, e.y - c.y);
        el.style.width = el.style.height = `${size.toFixed(1)}px`;
        el.style.translate = `${(c.x - size / 2).toFixed(1)}px ${(c.y - size / 2).toFixed(1)}px`;
        el.style.rotate = `${net.rotate.toFixed(3)}deg`;
    };

    const enter = () => {
        if (entered || !props.active || !stage) return;
        entered = true;
        stage.ready().then(() => { if (!gone) stage.start(); });
    };

    const frame = ({ x, y, scroll, t, ramp }) => {
        if (!stage) return;
        stage.look(x * SLIDE, y * SLIDE_Y);
        // The network floats, its creatures floating in it, and the thread with it
        net.y = Math.sin(t * 0.5) * 7 * ramp - scroll * 40;
        net.rotate = Math.sin(t * 0.27) * 0.35 * ramp;
        const dt = last === null ? 0 : Math.min(0.1, t - last);
        last = t;
        nowT = t;
        moveStrokes(dt, t);
        live(t, ramp);
        stepFlasks(dt);
        wakeCreatures(dt);
        // The strokes of the thread, travelling (every other frame is enough)
        if (tick++ % 2 === 0) drawThread();
        stage.render(t);
        placeOverlay();
    };

    const begin = async () => {
        let made;
        try {
            made = await createLayerStage(canvas.value);
        } catch (e) {
            console.warn('The WebGL stage is not available', e);
            return;
        }
        if (gone) { made.destroy(); return; }
        stage = made;
        sky = startStardust(null, {
            stage,
            groups: [
                { count: 300, colors: [0x007096, 0x007096, 0x1b86a8, 0x006f96], size: [2, 7], drift: 5, twinkle: 0.3, reach: 130, push: 32, parallax: 12, order: -20 },
                { count: 26, colors: [0xaaa8d2, 0xb9b7e0], size: [2, 5], drift: 16, twinkle: 0.6, reach: 130, push: 32, parallax: 20, order: -19 },
            ],
        });
        build(stage);
        stage.onResize((W, H) => place(W, H));
        front = startStardust(null, { stage, groups: [{ ...sparks.group(), order: 1e6 }] });
        root.value.addEventListener('pointermove', track, { passive: true });
        root.value.addEventListener('pointerdown', track, { passive: true });
        root.value.addEventListener('pointerup', release, { passive: true });
        parallax = createParallax(root.value, frame);
        enter();
    };

    onMounted(begin);
    watch(() => props.active, enter);
    onBeforeUnmount(() => {
        gone = true;
        root.value?.removeEventListener('pointermove', track);
        root.value?.removeEventListener('pointerdown', track);
        root.value?.removeEventListener('pointerup', release);
        parallax?.destroy();
        sky?.destroy();
        front?.destroy();
        stage?.destroy();
    });
</script>

<template>
    <div class="scene" ref="root">
        <canvas class="stageCanvas" ref="canvas"></canvas>
        <!-- What can be touched, in a square kept over the network: the corks, the creatures and the central sign -->
        <div class="network" ref="overlay">
            <div v-for="t in touchable" :key="'hit' + t.n" :ref="setCatcher(t.n)" class="hit" role="button" tabindex="0" :style="t.hit"
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
</template>

<style scoped>
    .scene {
        position: absolute;
        inset: 0;
        overflow: hidden;
    }

    .stageCanvas {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        display: block;
        pointer-events: none;
    }

    .network {
        position: absolute;
        left: 0;
        top: 0;
        width: 0;
        height: 0;
        pointer-events: none;
    }

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
