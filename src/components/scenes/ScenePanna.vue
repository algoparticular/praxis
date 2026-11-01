<script setup>
    // Pañña (wisdom): Sid meditating under a stippled sun, in a forest of dark branches, with fireflies and
    // glowing mushrooms. The line work (character, branches, leaves, mushroom outlines, the walls of the forest) comes
    // from the artwork in public/assets/panna, each layer cropped to its own box (pannaLayers.json).
    // Everything else is alive and drawn by code (useStardust), behind the line work: the sun, the cyan aura, the
    // fireflies' halos, the blue mushrooms, the pink glow and the stippled edge of the floor are particles whose shapes
    // come from density maps of the original stipple (pannaClouds.json); the floor itself is a drawn silhouette. The
    // spiral from the sun to Sid's forehead is a moving group of particles, and a last group throws sparks when the
    // fireflies, the blue mushrooms or Sid are touched.
    // Its verb is Ver (see): the nine lights of the scene (the sun, Sid's third eye, the big pink mushroom, the four
    // fireflies and the two blue mushrooms) are joined by dragging from one to another with threads of dots. The pattern
    // to see is a star, every light joined to the third eye: then the rulito is born over Sid's head (see
    // docs/verbos-y-dinamicas.md), and the scene blooms (the rulito, the third eye and the threads glow).
    // Two scales give depth: the centre lives in a square frame; the surroundings are a slightly bigger square whose
    // left and right halves are anchored to the sides of the screen (each half cut to its side), so on a wide screen the
    // forest still hugs the edges; above them the same halves, mirrored, carry the forest up.
    // It is drawn in WebGL (useLayerStage): each part is a group of planes at its own depth (the walls far, Sid in the
    // middle, the leaves and branches near) and the camera slides with the pointer or the tilt; the leaves bend a little
    // in the wind as they sway. The touch targets are DOM elements kept over what they belong to.
    import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { createParallax } from '../../composables/useParallax.js';
    import { createLayerStage } from '../../composables/useLayerStage.js';
    import { startStardust } from '../../composables/useStardust.js';
    import { decodeCloud, sampleCloud } from '../../composables/stippleCloud.js';
    import { createThreads, rgbOf, smooth } from '../../composables/useThreads.js';
    import { createGhostHand, gesture, HINT_AFTER } from '../../composables/useGhostHand.js';
    import { play } from '../../composables/useSound.js';
    import { sceneMilestone } from '../../analytics.js';
    import Rulito from '../Rulito.vue';
    import boxes from '../../composables/pannaLayers.json';
    import clouds from '../../composables/pannaClouds.json';

    const props = defineProps({
        card: { type: Object, default: () => ({}) },
        active: Boolean
    });

    const root = ref(null);
    const canvas = ref(null);
    const rulito = ref(null);
    const hitSid = ref(null);
    const hitEye = ref(null);
    const hitField = ref(null);
    const hitSun = ref(null);
    const hitTargets = {};                  // the fireflies' and blue mushrooms' touch targets, by key
    const setTarget = (key) => (el) => { hitTargets[key] = el; };
    let stage = null;
    let hand = null;                               // the ghost hand, showing the gesture
    let parallax = null;
    let back = null;
    let front = null;
    let entered = false;
    let gone = false;
    let stageEl = null;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const N_ = {};                          // the layers and groups (stage nodes)

    // The camera slides SLIDE px at the edge of a swipe; each part moves as far as it did (its px), and half that up and down
    const SLIDE = 50;
    const SLIDE_Y = 25;
    const zFor = (amp) => amp / (SLIDE + amp);
    const Z = { walls: zFor(6), sun: zFor(5), mush: zFor(10), sid: zFor(12), threads: zFor(9), near: zFor(16) };

    // The groups of the particles behind the line work, in drawing order
    const G = { floor: 0, sky: 1, sun: 2, aura: 3, pink: 4, fly: { tl: 5, tr: 6, bl: 7, br: 8 }, blue: { l: 9, r: 10 } };

    const IMG = (name) => `/assets/panna/${name}.webp`;

    // ---- The clouds: density maps of the original's stipple, turned back into particles at whatever size we draw them
    const grids = Object.fromEntries(Object.entries(clouds).map(([name, cloud]) => [name, decodeCloud(cloud)]));
    const hexOf = ([r, g, b]) => (r << 16) | (g << 8) | b;

    // The middle of a cloud and its half size, in the 2160px units
    const centreOf = (name) => {
        const grid = grids[name];
        let sum = 0, cx = 0, cy = 0;
        grid.bytes.forEach((byte, i) => { sum += byte; cx += byte * (i % grid.cols); cy += byte * Math.floor(i / grid.cols); });
        return { u: grid.x + (cx / sum + 0.5) * grid.cell, v: grid.y + (cy / sum + 0.5) * grid.cell, half: Math.max(grid.cols, grid.rows) * grid.cell / 2 };
    };

    // map(u, v) turns a spot of the 2160 square into canvas pixels; k is canvas pixels per unit
    const sample = (name, map, k, boost = 1) => sampleCloud(grids[name], map, k, boost);

    // ---- Where everything is at rest, in px of the screen (the CSS of the DOM version, computed). The centre's square
    // (s) and the bigger one of the surroundings (sn); on a tall screen everything but the sun is lifted off the bottom,
    // so Sid sits nearer the middle and the mushrooms are seen whole; below them is the floor
    let geo = null;
    const measure = (W, H) => {
        const tall = W / H <= 3 / 4;
        const s = Math.min(Math.max(W, (tall ? 0.7 : 0.62) * H), 0.85 * H);
        const sn = Math.min(s * 1.1, W * 1.25);
        const lift = Math.max(0, (H - s * 1.2) * 0.5);
        const sheetTop = H - (sn * -0.04 + lift) - sn;
        const half = Math.min(sn / 2, W / 2);
        const upTop = H - (sn * 0.96 - 1 + lift) - sn;
        const frame = { left: (W - s) / 2, top: H - lift - s, w: s, h: s };
        const gw = 0.065 * s, gh = gw * 86 / 32;
        const glyph = { left: frame.left + 0.5 * s - gw / 2, top: frame.top + 0.08 * s, w: gw, h: gh };
        geo = { W, H, s, sn, lift, sheetTop, upTop, half, frame, glyph };
    };

    // The same as the DOM version measured: canvas px of the 2160 squares
    const layout = () => {
        const { W, s, sn, sheetTop, frame } = geo;
        const kn = sn / 2160;
        return {
            S: s, sn, kn, kf: s / 2160, fx0: frame.left, fy0: frame.top, sheetTop,
            // The big square's left half: its right edge stays put while it grows 4% to the left (scale 1.04, origin right)
            left: (u, v) => [sn - (1 - u / 2160) * sn * 1.04, sheetTop + v * kn],
            right: (u, v) => [W - sn + (u / 2160) * sn * 1.04, sheetTop + v * kn],
            centred: (u, v) => [(W - sn) / 2 + u * kn, sheetTop + v * kn],
        };
    };

    // The sun sits at the very top, above the card's name, and the top edge cuts it
    const sunSpot = () => ({ k: (geo.s * 0.95) / 2160, x: geo.W / 2, y: geo.H * 0.012 });

    // Where a point at rest is on screen now: carried by Sid, by the mushrooms, by a side of the forest
    const sidAt = (x, y) => { const p = N_.sid.toScreen(x, y); return [p.x, p.y]; };
    const mushAt = (x, y) => { const p = N_.mush.toScreen(x, y); return [p.x, p.y]; };

    // ---- The floor: a drawn silhouette, with a stippled edge of particles that tremble
    // Height of the hill's top edge across the big square (x and y as fractions of it), as in the illustration
    const HILL = [[-2, 0.79], [0.12, 0.79], [0.3, 0.792], [0.5, 0.8], [0.66, 0.828], [0.82, 0.845], [3, 0.845]];
    const floorTop = (x, L, w) => {
        const u = (x - (w - L.sn) / 2) / L.sn;
        let i = 0;
        while (i < HILL.length - 2 && u > HILL[i + 1][0]) i++;
        const [u0, f0] = HILL[i], [u1, f1] = HILL[i + 1];
        const m = Math.min(1, Math.max(0, (u - u0) / (u1 - u0)));
        const f = f0 + (f1 - f0) * (0.5 - 0.5 * Math.cos(Math.PI * m));
        return L.sheetTop + (f + Math.sin(x / 61) * 0.0022 + Math.sin(x / 23 + 1) * 0.0011) * L.sn;
    };
    // The floor's silhouette, drawn on a canvas the size of the screen (a flat fill: no need for the screen's density)
    const floorCanvas = document.createElement('canvas');
    const drawFloor = () => {
        const { W, H } = geo;
        floorCanvas.width = Math.ceil(W);
        floorCanvas.height = Math.ceil(H);
        const ctx = floorCanvas.getContext('2d');
        const L = layout();
        const path = new Path2D();
        path.moveTo(-10, H + 40);
        for (let x = -10; x <= W + 10; x += 8) path.lineTo(x, floorTop(x, L, W));
        path.lineTo(W + 10, H + 40);
        path.closePath();
        const gradient = ctx.createLinearGradient(0, Math.min(...[0.2, 0.5, 0.8].map((f) => floorTop(f * W, L, W))), 0, H);
        gradient.addColorStop(0, '#00625e');
        gradient.addColorStop(1, '#004f4c');
        ctx.clearRect(0, 0, floorCanvas.width, floorCanvas.height);
        ctx.fillStyle = gradient;
        ctx.fill(path);
        N_.floor?.refresh();
    };
    // The ground in front, on a tall screen: as high as the bottom edge of the lifted drawings (plus a fade), in the
    // floor's colour, so the bottom edge of the drawings never shows
    const groundCanvas = document.createElement('canvas');
    const drawGround = () => {
        const height = Math.max(0, geo.lift - geo.sn * 0.04 + 30);
        groundCanvas.width = 2;
        groundCanvas.height = Math.max(2, Math.ceil(height));
        const ctx = groundCanvas.getContext('2d');
        const gradient = ctx.createLinearGradient(0, groundCanvas.height, 0, 0);
        gradient.addColorStop(0, '#004f4c');
        gradient.addColorStop(Math.max(0, 1 - 30 / groundCanvas.height), '#005653');
        gradient.addColorStop(1, 'rgba(0, 86, 83, 0)');
        ctx.clearRect(0, 0, 2, groundCanvas.height);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 2, groundCanvas.height);
        N_.ground?.refresh();
        return height;
    };

    // ---- The threads: spirals of dots that join one light to another (useThreads.js, shared with Esperanza). A thread
    // starts as a point at the light it leaves, swells into a double helix and closes into a point at the light it
    // reaches, and its dots take the colours of the two lights as they flow from one to the other (see "Ver" below)
    const MAX_LINKS = 6;                           // the most threads a figure has
    const GHOST_SLOT = 1 + MAX_LINKS;              // the ghost of the figure has a slot for each of its threads
    const SLOTS = 1 + 2 * MAX_LINKS;               // slot 0 is the thread that follows the finger
    const threads = createThreads({ slots: SLOTS });  // its `surge` is 1 when Sid has just been touched: the threads rush
    let bob = 0;               // Sid floats; the aura and the third eye float with him
    let lastT = 0;
    let linksFade = 1;         // the threads go out together when the rulito leaves
    let flowBoost = 0;         // 1 while the threads carry their light to the third eye: they flow fast, towards it
    let eyeFlare = 0;          // 1 when the third eye opens
    let opening = 0;           // 0..1: the threads part around the rulito while it is over Sid's head (threads.hole)

    let threadShift = [0, 0];  // how far the threads are moved by the camera (the lights are not)
    const thread = {
        count: threads.count + 1,
        update(t, data) {
            if (!geo) return;
            const dt = Math.min(0.1, Math.max(0, t - lastT));
            lastT = t;
            threads.surge = Math.max(0, threads.surge - dt * 0.35);
            threads.tick(dt, 1 + threads.surge * 3 + flowBoost * 5);
            eyeFlare = Math.max(0, eyeFlare - dt * 0.7);
            // The threads open as the rulito is born and close again as it goes
            opening += ((win && win.opened && !win.back ? 1 : 0) - opening) * Math.min(1, dt * 2.2);
            threads.hole = null;
            if (opening > 0.001 && N_.rulito) {
                const r = N_.rulito.boxOnScreen(geo.glyph);
                if (r.width) threads.hole = { x: r.left + r.width / 2 - threadShift[0], y: r.top + r.height / 2 - threadShift[1], r: 0.62 * Math.max(r.width, r.height), opening };
            }
            linksFade += ((linksOut ? 0 : 1) - linksFade) * Math.min(1, dt * 2);

            const L = layout();
            const unit = Math.max(1, L.S / 765);
            const spots = lightSpots().map(([x, y]) => [x - threadShift[0], y - threadShift[1]]);
            threads.begin();
            // As wide as 2.8% of the card at the middle (a tenth of its length at most)
            const draw = (slot, from, to, colours, strength, grow = 1, dir = 1) =>
                threads.draw(slot, data, t, from, to, colours, { unit, widest: 0.028 * L.S / unit, strength, grow, dir });
            // The threads the person has joined, each growing out of the light it left
            links.forEach((link, k) => {
                const grow = smooth(0, 1, smooth(0, 0.9, t - link.born));
                draw(1 + k, spots[link.a], spots[link.b], [TINTS[link.a], TINTS[link.b]], (inFigure(link) ? 0.95 : 0.4) * linksFade, grow, link.dir);
            });
            // The threads undone, going back into their light, in the slots left free
            for (let k = cut.length - 1; k >= 0; k--) if (t - cut[k].at > CUT_LEN) cut.splice(k, 1);
            cut.slice(0, MAX_LINKS - links.length).forEach((link, k) => {
                const grow = 1 - smooth(0, CUT_LEN, t - link.at);
                draw(1 + links.length + k, spots[link.a], spots[link.b], [TINTS[link.a], TINTS[link.b]], (inFigure(link) ? 0.95 : 0.4) * grow, grow, link.dir);
            });
            for (let k = links.length + Math.min(cut.length, MAX_LINKS - links.length); k < MAX_LINKS; k++) threads.hide(1 + k, data);
            // The ghost of the figure: its threads that are not joined yet draw themselves one after another, faint, and go
            const ghosts = ghost ? figure.links.filter(([a, b]) => !joined(a, b)) : [];
            ghosts.forEach(([a, b], k) => {
                const fade = smooth(0, 0.6, ghost.age) * smooth(0, 0.8, GHOST_LEN - ghost.age);
                draw(GHOST_SLOT + k, spots[a], spots[b], [TINTS[a], TINTS[b]], 0.5 * fade, smooth(0, 1, smooth(0, 0.9, ghost.age - k * 0.2)));
            });
            for (let k = ghosts.length; k < MAX_LINKS; k++) threads.hide(GHOST_SLOT + k, data);
            // The thread that follows the finger, locking on to a light that is near enough
            if (drag && drag.moved) {
                const snapped = drag.snap >= 0;
                draw(0, spots[drag.from], snapped ? spots[drag.snap] : [drag.x - threadShift[0], drag.y - threadShift[1]],
                    [TINTS[drag.from], TINTS[snapped ? drag.snap : drag.from]], snapped ? 0.9 : 0.6);
            } else threads.hide(0, data);
            // The dot on Sid's forehead: his third eye
            const eye = threads.count;
            data.positions[eye * 3] = spots[EYE][0];
            data.positions[eye * 3 + 1] = spots[EYE][1];
            data.sizes[eye] = (4.2 + 3.6 * threads.surge + 30 * eyeFlare * eyeFlare) * unit;
            data.alphas[eye] = Math.min(1, 0.6 + 0.35 * Math.sin(t * 1.6) + 0.5 * eyeFlare);
            data.tints.set(TINTS[EYE], eye * 3);
        },
    };

    // ---- Sparks, thrown when something is touched
    const SPARKS = 640;
    const sparks = {
        life: new Float32Array(SPARKS), span: new Float32Array(SPARKS).fill(1), size: new Float32Array(SPARKS),
        x: new Float32Array(SPARKS), y: new Float32Array(SPARKS), vx: new Float32Array(SPARKS), vy: new Float32Array(SPARKS),
        rgb: new Float32Array(SPARKS * 3), head: 0, lastT: 0,
    };
    const burst = (x, y, { n = 24, colors = [0xffe47d], speed = 110, life = 2.4, size = 5, spread = 6 } = {}) => {
        for (let k = 0; k < n; k++) {
            const i = sparks.head;
            sparks.head = (sparks.head + 1) % SPARKS;
            const angle = Math.random() * Math.PI * 2;
            const v = speed * (0.35 + Math.random() * 0.75);
            const c = colors[Math.floor(Math.random() * colors.length)];
            sparks.x[i] = x + Math.cos(angle) * spread * Math.random();
            sparks.y[i] = y + Math.sin(angle) * spread * Math.random();
            sparks.vx[i] = Math.cos(angle) * v;
            sparks.vy[i] = Math.sin(angle) * v - 18;               // they drift up a little, like embers
            sparks.span[i] = sparks.life[i] = life * (0.6 + Math.random() * 0.6);
            sparks.size[i] = size * (0.7 + Math.random() * 0.8);
            sparks.rgb.set([(c >> 16 & 255) / 255, (c >> 8 & 255) / 255, (c & 255) / 255], i * 3);
        }
    };
    const sparkGroup = {
        count: SPARKS,
        update(t, data) {
            const dt = Math.min(0.1, Math.max(0, t - sparks.lastT));
            sparks.lastT = t;
            const drag = Math.exp(-dt * 1.1);
            for (let i = 0; i < SPARKS; i++) {
                if (sparks.life[i] <= 0) { data.alphas[i] = 0; continue; }
                sparks.life[i] -= dt;
                sparks.vx[i] *= drag;
                sparks.vy[i] *= drag;
                sparks.x[i] += sparks.vx[i] * dt;
                sparks.y[i] += sparks.vy[i] * dt;
                const age = Math.max(0, sparks.life[i]) / sparks.span[i];
                data.positions[i * 3] = sparks.x[i];
                data.positions[i * 3 + 1] = sparks.y[i];
                data.sizes[i] = sparks.size[i] * (0.5 + 0.5 * age);
                data.alphas[i] = Math.min(1, age * 2.2);
                data.tints.set(sparks.rgb.subarray(i * 3, i * 3 + 3), i * 3);
            }
        },
    };

    // ---- The two sides of the forest, with what can be touched in them
    const LEAF_Y = [0.2115, 0.2955, 0.6995, 0.7835];
    const LABELS = { fly: ['Luciérnaga', 'Firefly'], blue: ['Hongos', 'Mushrooms'] };
    const sides = ['left', 'right'].map((side) => {
        const letter = side === 'left' ? 'l' : 'r';
        const edge = side === 'left' ? 0 : 1;
        // Each leaf sways from where it hangs on the edge of the picture
        const leaf = (i) => ({ name: `leaf-${letter}${i + 1}`, origin: [edge, LEAF_Y[i]], amp: 3 + i * 0.8, dur: 5.2 + i * 0.9, delay: -i * 1.7 });
        // Each corner: a branch and the stem of a firefly hanging from it, swaying together from the corner
        const corner = (row, delay) => {
            const q = (row === 'top' ? 't' : 'b') + letter;
            return { row, key: 'fly-' + q, branch: 'corner-' + q, stem: 'stem-' + q, origin: [edge, row === 'top' ? 0 : 1], amp: 1.3, dur: 6.5, delay };
        };
        // A target over a cloud: its centre and radius in the 2160 units of the side's square
        const target = (key, kind, group, scale = 1) => {
            const c = centreOf(key);
            return { key, kind, group, u: c.u, v: c.v, r: Math.max(150, c.half * scale + 30) };
        };
        const corners = [corner('top', side === 'left' ? 0 : -2.3), corner('bottom', side === 'left' ? -1.4 : -3.6)];
        return {
            side, letter, edge,
            leaves: [0, 1, 2, 3].map(leaf),
            upLeaves: [0, 1].map(leaf),
            corners,
            targets: [
                ...corners.map((c) => target(c.key, 'fly', G.fly[c.key.slice(4)])),
                target('blue-' + letter, 'blue', G.blue[letter], 0.9),
            ],
            sway: { origin: [edge, 0.5], amp: 0.7, dur: 9, delay: side === 'left' ? 0 : -4 },
        };
    });
    const label = (kind, locale) => LABELS[kind][locale === 'en' ? 1 : 0];
    const allTargets = sides.flatMap((s) => s.targets.map((target) => ({ target, side: s.side })));

    // A point of a side's square (2160 units) at rest on screen, before its 4% stretch (the node stretches it)
    const sheetLeft = (side) => (side === 'left' ? 0 : geo.W - geo.sn);
    const onSheet = (side, u, v, top = geo.sheetTop) => [sheetLeft(side) + u / 2160 * geo.sn, top + v / 2160 * geo.sn];
    // Where a target is on the canvas now, wherever its side has been moved by the camera
    const spotOf = (key, side) => {
        const c = centreOf(key);
        const p = N_.sides[side].toScreen(...onSheet(side, c.u, c.v));
        return [p.x, p.y];
    };

    const touch = (target, side, quiet = false) => {
        const [x, y] = spotOf(target.key, side);
        if (target.kind === 'fly') {
            back?.boost(target.group, 1.5);
            burst(x, y, { n: 30, colors: [0xffe47d, 0xfff3b8, 0xffffff], speed: 130, size: 5.4 });
            if (!quiet) play('star');
        } else {
            back?.boost(target.group, 1.4);
            burst(x, y, { n: 22, colors: [0x00b4d7, 0x7be3f5, 0xffffff], speed: 110, size: 5.2 });
            if (!quiet) play('tap');
        }
    };
    const warm = (target) => back?.boost(target.group, 0.5);
    const onKey = (event, action) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        action();
    };

    // Touching Sid wakes him: the aura and the sun flare, the spiral rushes, he glows and sparks fly from his forehead
    let awake = 0;
    const wake = (quiet = false) => {
        awake = 1;
        threads.surge = 1;
        back?.boost(G.aura, 1.6);
        back?.boost(G.sun, 1);
        const L = layout();
        const sun = sunSpot();
        const cx = L.fx0 + 0.5 * L.S;
        burst(...sidAt(cx, L.fy0 + 0.436 * L.S), { n: 50, colors: [0xffe47d, 0xfff3b8, 0xffffff], speed: 160, size: 5.6, spread: 4 });
        burst(...sidAt(cx, L.fy0 + 0.52 * L.S), { n: 40, colors: [0x00a9bc, 0x7be3f5], speed: 190, size: 5.4, spread: 40 });
        burst(sun.x, sun.y + 60 * sun.k, { n: 18, colors: [0xffe47d], speed: 70, size: 5.6 });
        if (!quiet) play('star');
    };
    const warmSid = () => back?.boost(G.aura, 0.6);

    // Touching the sun sends a light through everything alive: it flares, and then, nearest first, the fireflies, the
    // blue mushrooms, Sid and the field of mushrooms answer with their own sparks
    const timers = [];
    const shine = () => {
        const { H } = geo;
        const L = layout();
        const sun = sunSpot();
        back?.boost(G.sun, 1.5);
        burst(sun.x, sun.y + 40 * sun.k, { n: 36, colors: [0xffe47d, 0xfff3b8, 0xffffff], speed: 150, size: 5.6, spread: 40 });
        play('star');

        const answers = [];
        sides.forEach((s) => s.targets.forEach((target) => {
            const [x, y] = spotOf(target.key, s.side);
            answers.push({ distance: Math.hypot(x - sun.x, y - sun.y), act: () => touch(target, s.side, true) });
        }));
        answers.push({ distance: Math.hypot(L.fx0 + L.S * 0.5 - sun.x, L.fy0 + L.S * 0.52 - sun.y), act: () => wake(true) });
        // The field of mushrooms: pink sparks along it
        answers.push({ distance: Math.hypot(0, H - sun.y), act: fieldSparks });
        const farthest = Math.max(...answers.map((a) => a.distance));
        answers.forEach(({ distance, act }) => timers.push(setTimeout(act, 150 + (distance / farthest) * 1100)));
    };
    const warmSun = () => back?.boost(G.sun, 0.5);

    // ---- Ver: joining the lights
    // The nine lights are the sun, Sid's third eye, the mushrooms of the field, and the fireflies and blue mushrooms of
    // both sides. Nothing is joined at the start. Dragging from one light to another joins them with a thread. There is
    // one pattern, a star: every light joined to the third eye, which takes eight threads. The threads that touch the eye
    // are firm and bright and the others dim, so the pattern can be learned. At the eighth thread the try is judged: if
    // it is the star the pattern is seen (the rulito is drawn over Sid's head, stays a moment and goes with the threads),
    // and if it is not the threads go out softly and it starts again.
    const SUN = 0, EYE = 1, FIELD = 2;
    const LIGHTS = [
        { key: 'sun', tint: 0xffe47d },
        { key: 'eye', tint: 0x9deaf7 },
        { key: 'field', tint: 0xff9fcb },
        ...sides.flatMap((s) => s.targets.map((target) => ({ key: target.key, target, side: s.side, tint: target.kind === 'fly' ? 0xffe47d : 0x7be3f5 }))),
    ];
    // How high each light sounds (0..1) in the chord of the card: the sun on top, the field of mushrooms at the bottom
    const PITCH = { sun: 1, 'fly-tr': 0.88, 'fly-tl': 0.78, eye: 0.62, 'fly-br': 0.45, 'fly-bl': 0.35, 'blue-r': 0.2, 'blue-l': 0.12, field: 0 };
    LIGHTS.forEach((light) => { light.pitch = PITCH[light.key]; });
    LIGHTS.forEach((light, i) => { if (light.target) light.target.light = i; });
    const TINTS = LIGHTS.map((light) => rgbOf(light.tint));
    const links = [];                              // { a, b, born }: the threads the person has joined
    const cut = [];                                // { a, b, at, dir }: threads undone, drawing themselves back into their light
    const CUT_LEN = 0.9;
    let sunShift = [0, 0];
    let parting = false;                           // the threads of a try that was not the pattern are going out
    let win = null;                                // the rulito: { age, head, tail, full, fullAt, back, pop }, until it is gone
    let wins = 0;
    let drag = null;                               // { from, x, y, startX, startY, moved, snap, tap }
    let kbFrom = -1;                               // the light picked with the keyboard, waiting for the one to join it to
    let idle = 0;                                  // seconds since the last touch
    let ghost = null;                              // { age }: the figure drawing itself, faint, when nothing has been touched for a while
    let ghostIn = 0;

    // Where each light is on the canvas now
    const lightSpots = () => {
        const L = layout();
        const sun = sunSpot();
        const field = L.centred(1080, 1900);                  // the top of the big mushroom in the middle
        return [
            [sun.x + sunShift[0], sun.y + 150 * sun.k + sunShift[1]],
            sidAt(L.fx0 + 0.5 * L.S, L.fy0 + 0.436 * L.S),
            mushAt(field[0], field[1]),
            ...LIGHTS.slice(3).map((light) => spotOf(light.target.key, light.side)),
        ];
    };

    // The pink sparks along the field of mushrooms, when it is touched or answers the sun
    const fieldSparks = () => {
        const L = layout();
        back?.boost(G.pink, 1.3);
        [450, 800, 1080, 1360, 1700].forEach((u) => {
            const [x, y] = mushAt(...L.centred(u, 1930));
            burst(x, y + 10, { n: 12, colors: [0xcb5e95, 0xff9fcb, 0xffd1e6], speed: 100, size: 5, spread: 14 });
        });
    };
    const touchField = () => { fieldSparks(); play('tap'); };

    // The groups of particles that flare when a light is touched or told apart
    const groupOf = (i) => (i === SUN ? G.sun : i === EYE ? G.aura : i === FIELD ? G.pink : LIGHTS[i].target.group);
    const warmLight = (i, amount = 0.5) => back?.boost(groupOf(i), amount);
    const flare = (i) => {
        const light = LIGHTS[i];
        if (light.target) return touch(light.target, light.side, true);
        if (i === FIELD) return fieldSparks();
        const [x, y] = lightSpots()[i];
        back?.boost(groupOf(i), 1.2);
        burst(x, y, { n: 18, colors: [0xffe47d, 0xfff3b8, 0xffffff], speed: 110, size: 5.4 });
    };

    // The figures to see, each a set of threads. One is drawn at random for a try and stays until it is seen, and then another
    // comes. Not every light is in every figure: the others are decoys
    const at = (key) => LIGHTS.findIndex((light) => light.key === key);
    const loop = (keys) => keys.map((key, i) => [at(key), at(keys[(i + 1) % keys.length])]);
    const FIGURES = [
        { name: 'cross', links: ['sun', 'field', 'blue-l', 'blue-r'].map((key) => [EYE, at(key)]) },
        { name: 'diamond', links: loop(['sun', 'blue-r', 'field', 'blue-l']) },
        { name: 'hexagon', links: loop(['sun', 'fly-tr', 'fly-br', 'field', 'fly-bl', 'fly-tl']) },
        { name: 'triangles', links: [...loop(['sun', 'fly-bl', 'fly-br']), ...loop(['field', 'fly-tl', 'fly-tr'])] },
    ];
    let figure = null;
    let lastFigure = -1;
    const nextFigure = () => {
        let i;
        do { i = Math.floor(Math.random() * FIGURES.length); } while (i === lastFigure);
        lastFigure = i;
        figure = FIGURES[i];
    };
    nextFigure();
    const inFigure = (link) => figure.links.some(([a, b]) => (a === link.a && b === link.b) || (a === link.b && b === link.a));
    const joined = (a, b) => links.some((l) => (l.a === a && l.b === b) || (l.a === b && l.b === a));

    const join = (a, b) => {
        if (win || parting || reducedMotion || a === b) return;
        if (joined(a, b)) return undo(a, b);
        if (links.length >= MAX_LINKS) return;
        links.push({ a, b, born: lastT });
        idle = 0;
        threads.surge = Math.max(threads.surge, 0.5);
        flare(a);
        flare(b);
        play('link', { from: LIGHTS[a].pitch, to: LIGHTS[b].pitch, level: inFigure(links[links.length - 1]) ? 1 : 0.45 });
        if (links.length === figure.links.length) {
            if (figure.links.every(([x, y]) => joined(x, y))) seen();
            else unravel();
        }
    };

    // Joining two lights that are already joined undoes that thread: it draws itself back into the light it left, with
    // the two notes going the other way, quietly
    const undo = (a, b) => {
        const k = links.findIndex((l) => (l.a === a && l.b === b) || (l.a === b && l.b === a));
        const [link] = links.splice(k, 1);
        cut.push({ ...link, at: lastT });
        idle = 0;
        warmLight(a, 0.3);
        warmLight(b, 0.3);
        play('link', { from: LIGHTS[link.b].pitch, to: LIGHTS[link.a].pitch, level: 0.3 });
    };

    // The threads were as many as the figure has but not the figure: after a moment to see it they go out softly and it
    // starts again, with the same figure
    const unravel = () => {
        parting = true;
        sceneMilestone('pattern_reset', { figure: figure.name });
        timers.push(setTimeout(() => { linksOut = true; play('unravel'); }, 1100));
        timers.push(setTimeout(() => { links.length = 0; linksOut = false; parting = false; idle = 0; }, 3200));
    };

    // The pattern is seen: every light answers, nearest to the eye first, and the rulito is drawn over Sid's head (GROW
    // seconds), shines for a moment (LINGER) and goes as its tail catches up with its head (EAT), taking the threads with it
    const GROW = 2.6, LINGER = 2.2, EAT = 3.4, CONVERGE = 1.7;
    const seen = () => {
        wins += 1;
        win = { age: 0, head: 0, tail: 0, full: false, fullAt: 0, back: false, pop: 0, opened: false };
        rulito.value?.reshape();
        sceneMilestone('pattern_seen', { times: wins, figure: figure.name });
        // The threads carry their light to the third eye: each one flows from its end farther from it to the nearer one
        const spots = lightSpots();
        const far = (i) => Math.hypot(spots[i][0] - spots[EYE][0], spots[i][1] - spots[EYE][1]);
        links.forEach((l) => { l.dir = far(l.b) > far(l.a) ? -1 : 1; });
        play('converge');
        spots.map(([x, y], i) => ({ i, d: Math.hypot(x - spots[EYE][0], y - spots[EYE][1]) }))
            .sort((a, b) => a.d - b.d)
            .forEach(({ i }, k) => timers.push(setTimeout(() => flare(i), 150 + k * 120)));
    };
    // The third eye opens: a flare, a ring of sparks and a low bowl, and then the rulito is born
    const openEye = () => {
        win.opened = true;
        eyeFlare = 1;
        threads.surge = 1;
        awake = 1;
        back?.boost(G.aura, 2.2);
        back?.boost(G.sun, 1.2);
        const [x, y] = lightSpots()[EYE];
        burst(x, y, { n: 70, colors: [0x9deaf7, 0xffffff, 0xffe47d], speed: 230, size: 6, spread: 3 });
        play('open');
    };
    const winTick = (t, dt) => {
        flowBoost += ((win && !win.opened ? 1 : 0) - flowBoost) * Math.min(1, dt * 3);
        if (!win || !rulito.value) { if (stage) stage.bloom = 0; return; }
        win.age += dt;
        if (!win.opened && win.age > CONVERGE) openEye();
        win.pop = Math.max(0, win.pop - dt * 2.2);
        // It starts once the lights have answered, quickly, and eases in as it gets there
        if (win.opened && win.age > CONVERGE + 0.4 && win.head < 1) win.head = 1 - (1 - Math.min(1, (win.age - CONVERGE - 0.4) / GROW)) ** 1.6;
        if (win.head >= 1 && !win.full) {
            win.full = true;
            win.fullAt = win.age;
            win.pop = 1;
            threads.surge = 1;
            back?.boost(G.aura, 1.6);
            back?.boost(G.sun, 1.2);
            play('rulito');
        }
        if (win.full && !win.back && win.age - win.fullAt > LINGER) { win.back = true; linksOut = true; }
        if (win.back) win.tail = Math.min(win.head, win.tail + dt / EAT);
        const whole = Math.min(1, Math.max(0, (win.head - win.tail - 0.6) / 0.4));
        const named = Math.max(win.pop, 0.8 * whole * whole * (3 - 2 * whole));
        stageEl?.style.setProperty('--name-glow', named.toFixed(3));
        // The scene blooms with it: the rulito, the third eye and the threads glow (the only moment the stage blooms)
        if (stage) stage.bloom = named;
        const glow = win.full && win.head - win.tail > 0.9 ? Math.max(win.pop, Math.sin(t * 4) * 0.5 + 0.5) : 0;
        rulito.value.frame({ head: win.head, tail: win.tail, flare: glow, t, fade: Math.min(1, (win.head - win.tail) * 14), width: geo.glyph.w });
        N_.rulito?.refresh();
        if (N_.rulito) {
            N_.rulito.rotate = Math.sin(t * 1.8) * 3;
            N_.rulito.scale = 1 + 0.2 * win.pop * win.pop;
        }
        if (win.back && win.tail >= win.head) {
            win = null;
            rulito.value.frame({ width: geo.glyph.w });
            N_.rulito?.refresh();
            if (stage) stage.bloom = 0;
            stageEl?.style.setProperty('--name-glow', '0');
            links.length = 0;
            linksOut = false;
            nextFigure();
        }
    };
    let auraGoal = 0;                              // 0..1, how much of the network is joined
    let aura = 0;                                  // the aura's swelling, easing towards it
    let linksOut = false;                          // the threads fade out while the rulito goes

    // The lights that are joined stay lit, so the network is seen growing: the ones joined by the figure's threads fully, the
    // others less. Sid's aura grows with the threads that are right
    const keepLit = () => {
        if (win) return;
        let right = 0;
        links.forEach((l) => {
            const good = inFigure(l);
            warmLight(l.a, good ? 0.5 : 0.25);
            warmLight(l.b, good ? 0.5 : 0.25);
            if (good) right += 1;
        });
        const level = right / figure.links.length;
        back?.boost(G.aura, 0.15 + 1.1 * level);
        awake = Math.max(awake, 0.45 * level);
        auraGoal = level;
    };

    // The aura swells outwards from Sid as the network is joined (a little: 14% when it is whole) and goes back as the
    // threads go out
    const swellAura = (dt) => {
        if (!geo) return;
        aura += ((win && !win.back ? 1 : auraGoal) - aura) * Math.min(1, dt * 2);
        auraGoal = 0;
        const L = layout();
        back?.grow(G.aura, 0.14 * aura, L.fx0 + 1072 * L.kf, L.fy0 + 1123 * L.kf);
    };

    // No words: after a while without touching anything the figure draws itself, faint, and goes (GHOST_LEN seconds); to
    // see it is to notice what was there. Touching again makes it go quickly
    const GHOST_LEN = 3.6;
    const hint = (dt) => {
        if (ghost) {
            ghost.age += dt;
            if (ghost.age > GHOST_LEN) ghost = null;
        }
        // While it is played or won the count starts again: the hint waits its whole 7 s after
        if (win || parting || drag || reducedMotion || !entered) { idle = 0; return; }
        idle += dt;
        ghostIn -= dt;
        // After 7 s alone, and again 7 s after it has gone
        if (!ghost && idle > HINT_AFTER && ghostIn <= 0) {
            ghost = { age: 0 };
            ghostIn = GHOST_LEN + 7;
            // and the ghost hand drags from one light to the other along the first thread that is missing
            const missing = figure.links.find(([a, b]) => !joined(a, b));
            if (missing) hand?.play(gesture.drag(() => lightSpots()[missing[0]], () => lightSpots()[missing[1]]), { loops: 1 });
        }
    };

    // Dragging: the light is grabbed where the finger goes down, and the thread follows until it is let go
    const toCanvas = (event) => {
        const box = canvas.value.getBoundingClientRect();
        return [event.clientX - box.left, event.clientY - box.top];
    };
    const lightNear = (x, y, skip) => {
        let best = -1;
        let bestDistance = Math.max(50, 0.1 * geo.s);                        // near enough to join
        lightSpots().forEach(([sx, sy], i) => {
            const distance = Math.hypot(sx - x, sy - y);
            if (i !== skip && distance < bestDistance) { best = i; bestDistance = distance; }
        });
        return best;
    };
    const dragMove = (event) => {
        if (!drag) return;
        [drag.x, drag.y] = toCanvas(event);
        if (!drag.moved && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 10) drag.moved = true;
        if (!drag.moved) return;
        const snap = lightNear(drag.x, drag.y, drag.from);
        if (snap >= 0 && snap !== drag.snap) warmLight(snap, 0.8);
        drag.snap = snap;
    };
    const stopDrag = () => {
        window.removeEventListener('pointermove', dragMove);
        window.removeEventListener('pointerup', dragUp);
        window.removeEventListener('pointercancel', dragCancel);
    };
    const dragUp = () => {
        const done = drag;
        drag = null;
        stopDrag();
        if (!done) return;
        if (!done.moved) done.tap?.();                          // a tap: the light answers as it always did
        else if (done.snap >= 0) join(done.from, done.snap);
    };
    const dragCancel = () => { drag = null; stopDrag(); };

    // What a tap does on the lights that answer on release (the fireflies and the mushrooms answer as they are pressed)
    const taps = { [SUN]: () => shine(), [EYE]: () => wake(), [FIELD]: () => touchField() };
    const press = (i, event) => {
        const light = LIGHTS[i];
        if (light.target) touch(light.target, light.side);
        idle = 0;
        if (ghost) ghost.age = Math.max(ghost.age, GHOST_LEN - 0.5);
        if (reducedMotion) { taps[i]?.(); return; }
        const [x, y] = toCanvas(event);
        drag = { from: i, x, y, startX: event.clientX, startY: event.clientY, moved: false, snap: -1, tap: taps[i] };
        window.addEventListener('pointermove', dragMove);
        window.addEventListener('pointerup', dragUp);
        window.addEventListener('pointercancel', dragCancel);
    };
    // With the keyboard: Enter on a light picks it, Enter on another one joins them
    const pressKey = (i, event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        idle = 0;
        if (kbFrom >= 0 && kbFrom !== i) { join(kbFrom, i); kbFrom = -1; return; }
        kbFrom = kbFrom === i ? -1 : i;
        const light = LIGHTS[i];
        if (light.target) touch(light.target, light.side);
        else taps[i]();
    };

    // ---- The layers
    // A part that sways: a group turning about a point of a side's square, back and forth (CSS alternate ease-in-out)
    const swayers = [];
    const swayer = (parent, side, top, { origin, amp, dur, delay }) => {
        const node = parent.group();
        swayers.push({ node, side, top, origin, amp, dur, delay });
        return node;
    };
    const piece = (parent, name, options) => {
        const node = parent.image(IMG(name), options);
        node.box = name;
        return node;
    };

    // One side of the forest: the wall behind, or the leaves, branches and fireflies' stems in front; `up` is its
    // mirror above the big square
    const sideParts = [];
    const buildSide = (s, depthNode, front, up) => {
        const group = depthNode.group();
        const part = { group, side: s.side, up, pieces: [] };
        sideParts.push(part);
        const top = () => (up ? geo.upTop : geo.sheetTop);
        const add = (parent, name, options) => { const node = piece(parent, name, options); part.pieces.push(node); return node; };
        if (!front) add(group, 'wall-' + s.letter);
        else {
            (up ? s.upLeaves : s.leaves).forEach((leaf) => add(swayer(group, s.side, top, leaf), leaf.name, { wind: { amp: 2, speed: 0.8, root: 'top' } }));
            const branch = swayer(group, s.side, top, s.sway);
            add(branch, 'branch-' + s.letter);
            if (!up) add(branch, 'hooks-' + s.letter);
            (up ? [s.corners[0]] : s.corners).forEach((c) => {
                const corner = swayer(group, s.side, top, c);
                add(corner, c.branch);
                if (!up) add(corner, c.stem);
            });
            if (s.side === 'right' && !up) add(group, 'mark');
        }
        return part;
    };

    const build = (st) => {
        N_.floor = st.depth(0).canvas(floorCanvas);
        // (the particles behind the line work are drawn here, order 1.5..)
        const walls = st.depth(Z.walls);
        sides.forEach((s) => { buildSide(s, walls, false, false); buildSide(s, walls, false, true); });
        N_.sid = st.depth(Z.sid).group();
        N_.body = piece(N_.sid, 'character');
        N_.rulito = N_.sid.canvas(rulito.value.canvas, { bloom: true });
        N_.mush = st.depth(Z.mush).group();
        ['mush-stems', 'mush-caps', 'mush-shade', 'mush-outline'].forEach((name) => piece(N_.mush, name));
        const near = st.depth(Z.near);
        N_.sides = {};
        sides.forEach((s) => { N_.sides[s.side] = buildSide(s, near, true, false).group; buildSide(s, near, true, true); });
        N_.ground = st.depth(0).canvas(groundCanvas);
        // Everything at the sides and the floor fades in; Sid and the mushrooms rise into place
        sideParts.forEach((p) => p.group.enter({ y: 0, duration: 1800 }));
        N_.floor.enter({ y: 0, duration: 1800 });
        N_.ground.enter({ y: 0, duration: 1800 });
        N_.sid.enter({ y: 70, delay: 500, duration: 2000 });
        N_.mush.enter({ y: 150, delay: 200, duration: 1800 });
    };

    // A box of a 2160 square (pannaLayers.json) at rest on screen
    const boxOn = (name, left, top, size) => {
        const b = boxes[name];
        return { left: left + b.x * size, top: top + b.y * size, w: b.w * size, h: b.h * size };
    };

    const place = (W, H) => {
        measure(W, H);
        const { s, sn, frame, sheetTop, half } = geo;
        drawFloor();
        N_.floor.place({ left: 0, top: 0, w: Math.ceil(W), h: Math.ceil(H) });
        const groundH = drawGround();
        N_.ground.place({ left: 0, top: H - groundH, w: W, h: groundH });
        // Each side: its pieces on its square, stretched 4% from its inner edge, cut to its half of the screen; the
        // mirror above flipped over about its own middle
        sideParts.forEach(({ group, side, up, pieces }) => {
            const top = up ? geo.upTop : sheetTop;
            const left = sheetLeft(side);
            group.pivot = { x: side === 'left' ? left + sn : left, y: top + sn / 2 };
            group.sx = 1.04;
            group.sy = up ? -1 : 1;
            group.clip = { left: side === 'left' ? 0 : W - half, top, w: half, h: sn };
            pieces.forEach((node) => node.place(boxOn(node.box, left, top, sn)));
        });
        swayers.forEach((w) => {
            const left = sheetLeft(w.side);
            w.node.pivot = { x: left + w.origin[0] * sn, y: w.top() + w.origin[1] * sn };
        });
        // Sid in his frame, turning and swelling about a point 62% down it
        N_.sid.pivot = { x: frame.left + s / 2, y: frame.top + 0.62 * s };
        N_.body.place(boxOn('character', frame.left, frame.top, s));
        const g = geo.glyph;
        N_.rulito.place({ left: g.left - 0.4375 * g.w, top: g.top - 0.1628 * g.h, w: g.w * 1.875, h: g.h * 1.3256 }, { x: g.left + g.w / 2, y: g.top + g.h });
        ['mush-stems', 'mush-caps', 'mush-shade', 'mush-outline'].forEach((name, i) => N_.mush.children[i].place(boxOn(name, (W - sn) / 2, sheetTop, sn)));
        rulito.value.frame({ width: g.w });
        N_.rulito.refresh();
    };

    // The touch targets follow what they belong to
    const putHit = (el, box) => {
        if (!el) return;
        el.style.translate = `${box.left.toFixed(1)}px ${box.top.toFixed(1)}px`;
        el.style.width = `${box.width.toFixed(1)}px`;
        el.style.height = `${box.height.toFixed(1)}px`;
    };
    const square = (x, y, size) => ({ left: x - size / 2, top: y - size / 2, width: size, height: size });
    const placeHits = () => {
        const { s, sn, frame, sheetTop, W } = geo;
        putHit(hitSid.value, N_.body.boxOnScreen(boxOn('character', frame.left, frame.top, s)));
        const eye = sidAt(frame.left + 0.5 * s, frame.top + 0.436 * s);
        putHit(hitEye.value, square(eye[0], eye[1], 0.13 * s));
        const field = mushAt((W - sn) / 2 + 0.5 * sn, sheetTop + 0.88 * sn);
        putHit(hitField.value, square(field[0], field[1], 0.185 * sn));
        const sun = sunSpot();
        putHit(hitSun.value, square(W / 2, geo.H * 0.012, 560 * sun.k));
        allTargets.forEach(({ target, side }) => {
            const [x, y] = spotOf(target.key, side);
            const size = 2 * target.r / 2160 * sn * 1.04;
            putHit(hitTargets[target.key], square(x, y, size));
        });
    };

    const enter = () => {
        if (entered || !props.active || !stage) return;
        entered = true;
        // The line work is decoded before anything is shown, so the particles never arrive on their own
        stage.ready().then(() => {
            if (gone) return;
            stage.start();
            back?.reveal();
            front?.reveal();
        });
    };

    let lastFrame = 0;
    let frames = 0;
    const frame = ({ x, y, scroll, t, ramp }) => {
        if (!stage || !geo) return;
        const s = scroll;
        const dt = Math.min(0.1, Math.max(0, t - lastFrame));
        lastFrame = t;
        stage.look(x * SLIDE, y * SLIDE_Y);
        // The forest at the sides sways; the scroll lifts each part as before
        swayers.forEach((w) => { w.node.rotate = -w.amp * Math.cos(Math.PI * (t - w.delay) / w.dur) * ramp; });
        sideParts.forEach((p) => { p.group.y = p.group.z === Z.walls ? -s * 14 : -s * 40; });
        N_.mush.y = -s * 10;
        // Sid, with his aura; when woken he glows a little, swells and settles
        awake = Math.max(0, awake - dt * 0.4);
        bob = Math.sin(t * 0.75) * 0.009 * geo.s * ramp;
        N_.sid.y = bob - s * 30;
        // he breathes from his middle (taller as he breathes in, a little narrower)
        const breath = reducedMotion ? 0 : Math.sin(t * 0.8) * ramp;
        N_.sid.scale = 1 + 0.035 * awake * awake;
        N_.sid.sy = 1 + 0.012 * breath;
        N_.sid.sx = 1 - 0.004 * breath;
        N_.body.uniforms.uBright.value = 1 + 0.3 * awake;
        N_.body.uniforms.uSaturate.value = 1 + 0.4 * awake;
        // The coloured particles follow the parts they belong to
        const d = (z) => stage.drift(z);
        const ds = d(Z.sun);
        sunShift = [ds.x, ds.y - s * 10];
        back?.shift(G.sun, sunShift[0], sunShift[1]);
        const dsid = d(Z.sid);
        back?.shift(G.aura, dsid.x, dsid.y + bob - s * 30);
        const dm = d(Z.mush);
        back?.shift(G.pink, dm.x, dm.y - s * 10);
        const dn = d(Z.near);
        [...Object.values(G.fly), ...Object.values(G.blue)].forEach((g) => back?.shift(g, dn.x, dn.y - s * 40));
        const dt9 = d(Z.threads);
        threadShift = [dt9.x, dt9.y - s * 22];
        front?.shift(0, threadShift[0], threadShift[1]);        // the glow under the threads
        front?.shift(1, threadShift[0], threadShift[1]);        // the threads
        winTick(t, dt);
        keepLit();
        swellAura(dt);
        hint(dt);
        stage.render(t);
        if (frames++ % 2 === 0) placeHits();
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
        stageEl = root.value.closest('.stage');
        build(stage);
        stage.onResize((W, H) => place(W, H));
        hand = createGhostHand(stage);
        const tone = (name) => [hexOf(clouds[name].color)];
        back = startStardust(null, {
            stage,
            manual: true,
            groups: [
                // 0: the stippled edge of the floor, trembling
                { colors: [0x00625e, 0x00625e, 0x00524f, 0x0a7a72], size: [2, 4.6], parallax: 0, drift: 2.2, jitter: 0.5, twinkle: 0.25, reach: 80, push: 9, order: 1.5, points: (w) => {
                    const L = layout();
                    return Array.from({ length: Math.round(w * 2.4) }, () => {
                        const x = Math.random() * w;
                        return [x, floorTop(x, L, w) - (-Math.log(Math.random() + 0.001)) * 0.011 * L.sn + 0.002 * L.sn, (2 + Math.random() * 2.6) * Math.max(1, L.S / 765)];
                    });
                } },
                // 1: the faint dots of the sky
                { count: 200, colors: [0x007a70, 0x00706a, 0x006b66], size: [2.5, 7], drift: 6, twinkle: 0.3, reach: 100, push: 24, parallax: 8, opacity: 0.9, order: 1.51,
                    spawn: (w, h) => [w * (0.1 + Math.random() * 0.8), h * Math.random() * 0.74] },
                // 2: the sun
                { colors: tone('sun'), parallax: 0, drift: 2.2, jitter: 0.9, twinkle: 0.12, reach: 0, order: 1.52, points: () => {
                    const s = sunSpot();
                    return sample('sun', (u, v) => [s.x + (u - 1075) * s.k, s.y + (v - 425) * s.k], s.k, 1.6);
                } },
                // 3: the cyan aura around Sid
                { colors: tone('aura'), parallax: 0, drift: 3.4, jitter: 1.1, twinkle: 0.3, reach: 0, order: 1.53, points: () => {
                    const L = layout();
                    return sample('aura', (u, v) => [L.fx0 + u * L.kf, L.fy0 + v * L.kf], L.kf, 1.2);
                } },
                // 4: the pink glow of the mushrooms
                { colors: tone('pink'), parallax: 0, drift: 2.6, jitter: 1, twinkle: 0.22, reach: 90, push: 12, order: 1.54, points: () => {
                    const L = layout();
                    return sample('pink', L.centred, L.kn);
                } },
                // 5-8: the fireflies' halos, one group each so each can flare on its own
                ...['tl', 'tr', 'bl', 'br'].map((q, i) => ({ colors: tone('fly-' + q), parallax: 0, drift: 2.6, jitter: 1.2, twinkle: 0.3, reach: 0, order: 1.55 + i * 0.001, points: () => {
                    const L = layout();
                    return sample('fly-' + q, q.endsWith('l') ? L.left : L.right, L.kn * 1.04);
                } })),
                // 9-10: the blue mushrooms
                ...['l', 'r'].map((q, i) => ({ colors: tone('blue-' + q), parallax: 0, drift: 2.2, jitter: 1, twinkle: 0.24, reach: 0, order: 1.56 + i * 0.001, points: () => {
                    const L = layout();
                    return sample('blue-' + q, q === 'l' ? L.left : L.right, L.kn * 1.04);
                } })),
            ],
        });
        front = startStardust(null, {
            stage,
            manual: true,
            groups: [
                { colors: [0xffe47d], dynamic: threads.glow, parallax: 0, drift: 0, twinkle: 0, reach: 0, look: 'soft', order: 1e6, bloom: true },
                { colors: [0xffe47d, 0xffe47d, 0xfff3b8], dynamic: thread, parallax: 0, drift: 0, twinkle: 0, reach: 140, push: 26, look: 'hard', order: 1e6 + 1, bloom: true },
                { colors: [0xffffff], dynamic: sparkGroup, parallax: 0, drift: 0, twinkle: 0, reach: 0, look: 'hard', order: 1e6 + 2 },
            ],
        });
        parallax = createParallax(root.value, frame);
        enter();
    };

    onMounted(begin);
    watch(() => props.active, enter);
    onBeforeUnmount(() => {
        gone = true;
        parallax?.destroy();
        back?.destroy();
        front?.destroy();
        hand?.destroy();
        stage?.destroy();
        timers.forEach(clearTimeout);
        stopDrag();
        stageEl?.style.removeProperty('--name-glow');
    });
</script>

<template>
    <div class="scene" ref="root">
        <canvas class="stageCanvas" ref="canvas"></canvas>
        <!-- The rulito is drawn on its own canvas, which the stage shows over Sid's head, in the gold of the thread -->
        <Rulito ref="rulito" class="offstage" color="#ffe47d" />

        <!-- What can be touched, kept over what it belongs to -->
        <div class="hit sid" ref="hitSid" role="button" tabindex="0" aria-label="Sid"
            @pointerdown.prevent="wake" @pointerenter="warmSid" @keydown="onKey($event, wake)"></div>
        <!-- His third eye, the end of the spiral: one of the lights to join -->
        <div class="hit" ref="hitEye" role="button" tabindex="0" :aria-label="$i18n.locale === 'en' ? 'Third eye' : 'Tercer ojo'"
            @pointerdown.prevent="press(EYE, $event)" @pointerenter="warmSid" @keydown="pressKey(EYE, $event)"></div>
        <!-- The big mushroom in the middle: one more light to join -->
        <div class="hit" ref="hitField" role="button" tabindex="0" :aria-label="$i18n.locale === 'en' ? 'Pink mushrooms' : 'Hongos rosados'"
            @pointerdown.prevent="press(FIELD, $event)" @pointerenter="warmLight(FIELD)" @keydown="pressKey(FIELD, $event)"></div>
        <!-- The fireflies and the blue mushrooms -->
        <div v-for="{ target } in allTargets" :key="target.key" :ref="setTarget(target.key)" class="hit" role="button" tabindex="0"
            :aria-label="label(target.kind, $i18n.locale)"
            @pointerdown.prevent="press(target.light, $event)" @pointerenter="warm(target)" @keydown="pressKey(target.light, $event)"></div>
        <!-- The sun: touch it and everything alive answers -->
        <div class="hit" ref="hitSun" role="button" tabindex="0" :aria-label="$i18n.locale === 'en' ? 'Sun' : 'Sol'"
            @pointerdown.prevent="press(SUN, $event)" @pointerenter="warmSun" @keydown="pressKey(SUN, $event)"></div>
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

    .offstage {
        position: absolute;
        left: -9999px;
        top: 0;
        width: 40px;
        visibility: hidden;
    }

    /* Something to touch: invisible, over the thing itself */
    .hit {
        position: absolute;
        left: 0;
        top: 0;
        width: 0;
        height: 0;
        border-radius: 50%;
        cursor: pointer;
        pointer-events: auto;
        -webkit-tap-highlight-color: transparent;
        touch-action: none;                    /* a light can be dragged from; Sid's body below still lets the page scroll */
        outline: none;
    }

    .hit:focus-visible {
        outline: 2px solid rgba(255, 244, 150, 0.9);
        outline-offset: 2px;
    }

    .hit.sid {
        border-radius: 46% 46% 40% 40%;
        touch-action: manipulation;
    }
</style>
