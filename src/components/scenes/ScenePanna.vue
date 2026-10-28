<script setup>
    // Pañña (wisdom): Sid meditating under a stippled sun, in a forest of dark branches, with fireflies and
    // glowing mushrooms. The line work (character, branches, leaves, mushroom outlines, the walls of the forest) comes
    // from the artwork in public/assets/panna, each layer cropped to its own box (pannaLayers.json).
    // Everything else is alive and drawn by code (three.js, useStardust), behind the line work: the sun, the cyan
    // aura, the fireflies' halos, the blue mushrooms, the pink glow and the stippled edge of the floor are particles
    // whose shapes come from density maps of the original stipple (pannaClouds.json); the floor itself is a drawn
    // silhouette. The spiral from the sun to Sid's forehead is a moving group of particles, and a last group throws
    // sparks when the fireflies, the blue mushrooms or Sid are touched.
    // Its verb is Ver (see): the eight lights of the scene (the sun, Sid's third eye, the four fireflies and the two blue
    // mushrooms) are joined by dragging from one to another. Each thread is a spiral like the one from the sun to the third
    // eye, which is already the first of them. When every light is part of one network the pattern is seen: the rulito is
    // born over Sid's head (see docs/dinamicas-de-juego.md).
    // Two scales give depth: the centre lives in a square frame; the surroundings are a slightly bigger square whose
    // left and right halves are anchored to the sides of the screen, so on a wide screen the forest still hugs the edges.
    import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { createParallax, enterLayers } from '../../composables/useParallax.js';
    import { startStardust } from '../../composables/useStardust.js';
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
    const backCanvas = ref(null);
    const frontCanvas = ref(null);
    const frame = ref(null);
    const backSheets = ref([]);
    const frontSheets = ref([]);
    const being = ref(null);
    const body = ref(null);
    const mushrooms = ref(null);
    const rulito = ref(null);
    const floorPath = ref('');
    const shown = ref(false);
    let parallax = null;
    let back = null;
    let front = null;
    let resizeWatch = null;
    let entered = false;
    let drawingsReady = false;
    let stageEl = null;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // The groups of the particle canvas behind the line work, in drawing order
    const G = { floor: 0, sky: 1, sun: 2, aura: 3, pink: 4, fly: { tl: 5, tr: 6, bl: 7, br: 8 }, blue: { l: 9, r: 10 } };

    // ---- The layers: where each cropped picture sits in its 2160px square, as percentages of it
    const IMG = (name) => `/assets/panna/${name}.webp`;
    const pct = (n) => `${(n * 100).toFixed(3)}%`;
    const place = (name) => {
        const b = boxes[name];
        return { left: pct(b.x), top: pct(b.y), width: pct(b.w), height: pct(b.h) };
    };
    // The point of a layer (a fraction of the 2160 square) as a transform origin inside the layer's own box
    const originOf = (name, fx, fy) => {
        const b = boxes[name];
        return `${(((fx - b.x) / b.w) * 100).toFixed(1)}% ${(((fy - b.y) / b.h) * 100).toFixed(1)}%`;
    };

    // ---- The clouds: density maps of the original's stipple, turned back into particles at whatever size we draw them
    const grids = Object.fromEntries(Object.entries(clouds).map(([name, cloud]) => [name, { ...cloud, bytes: Uint8Array.from(atob(cloud.data), (c) => c.charCodeAt(0)) }]));
    const hexOf = ([r, g, b]) => (r << 16) | (g << 8) | b;
    const DENSITY = 4.8;        // how many dots' worth of area per area where the stipple is solid
    const DOT = 5.5;            // diameter of a dot of the original, in its 2160px units

    // The middle of a cloud and its half size, in the 2160px units
    const centreOf = (name) => {
        const grid = grids[name];
        let sum = 0, cx = 0, cy = 0;
        grid.bytes.forEach((byte, i) => { sum += byte; cx += byte * (i % grid.cols); cy += byte * Math.floor(i / grid.cols); });
        return { u: grid.x + (cx / sum + 0.5) * grid.cell, v: grid.y + (cy / sum + 0.5) * grid.cell, half: Math.max(grid.cols, grid.rows) * grid.cell / 2 };
    };

    // map(u, v) turns a spot of the 2160 square into canvas pixels; k is canvas pixels per unit
    const sample = (name, map, k, boost = 1) => {
        const grid = grids[name];
        const out = [];
        const base = Math.max(1.5, DOT * k);
        for (let row = 0; row < grid.rows; row++) {
            for (let col = 0; col < grid.cols; col++) {
                const v = grid.bytes[row * grid.cols + col] / 255;
                if (v < 0.03) continue;
                const dot = base * (1 + 1.3 * v ** 4);                              // the solid core gets bigger dots
                const wanted = (grid.cell * k) ** 2 * DENSITY * boost * v ** 1.3 / (Math.PI / 4 * dot * dot);
                let n = Math.floor(wanted);
                if (Math.random() < wanted - n) n++;
                for (let i = 0; i < n; i++) {
                    const [x, y] = map(grid.x + (col + Math.random()) * grid.cell, grid.y + (row + Math.random()) * grid.cell);
                    out.push([x, y, dot * (0.8 + Math.random() * 0.4)]);
                }
            }
        }
        return out;
    };

    // Where things are on the stage right now, in canvas pixels
    const layout = (w, h) => {
        const S = frame.value.offsetWidth;
        const sn = mushrooms.value.offsetWidth;
        const kn = sn / 2160;
        const sheetTop = h + 0.04 * sn - sn;
        const inset = 0;                                       // the sheets hang from the sides of the screen, on a narrow one too
        return {
            S, sn, kn, kf: S / 2160, fx0: (w - S) / 2, fy0: h - S, sheetTop,
            // The big square's left half: its right edge stays put while it grows 4% to the left (CSS scale 1.04, origin right)
            left: (u, v) => [inset + sn - (1 - u / 2160) * sn * 1.04, sheetTop + v * kn],
            right: (u, v) => [w - inset - sn + (u / 2160) * sn * 1.04, sheetTop + v * kn],
            centred: (u, v) => [(w - sn) / 2 + u * kn, sheetTop + v * kn],
        };
    };

    // The sun sits at the very top, above the card's name, and the top edge cuts it
    const sunSpot = (w, h) => {
        const L = layout(w, h);
        return { k: (L.S * 0.95) / 2160, x: w / 2, y: h * 0.012 };
    };

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
    const buildFloor = () => {
        if (!root.value || !frame.value || !mushrooms.value) return;
        const w = root.value.clientWidth, h = root.value.clientHeight;
        if (!w) return;
        const L = layout(w, h);
        let d = `M -10 ${h + 40}`;
        for (let x = -10; x <= w + 10; x += 8) d += ` L ${x} ${floorTop(x, L, w).toFixed(1)}`;
        floorPath.value = `${d} L ${w + 10} ${h + 40} Z`;
    };

    // ---- The threads: spirals of dots that join one light to another. A thread starts as a point at the light it leaves,
    // swells into a double helix and closes into a point at the light it reaches, and its dots take the colours of the
    // two lights as they flow from one to the other (see "Ver" below)
    const TURN = 100;          // px of a thread per turn of the helix
    const DOTS = 72;           // dots in each strand of a thread (the shorter ones use fewer)
    const DUST = 20;
    const PER = DOTS * 2 + DUST;                   // the particles of one thread
    const MAX_LINKS = 36;                          // as many as there are pairs of lights
    const SLOTS = 1 + MAX_LINKS;                   // slot 0 is the thread that follows the finger
    const FLOW = 0.05;         // lengths of a thread per second
    let bob = 0;               // Sid floats; the aura and the third eye float with him
    let surge = 0;             // 1 when Sid has just been touched: the threads rush
    let flowPhase = 0;
    let lastT = 0;
    let linksFade = 1;         // the threads go out together when the rulito leaves
    let flowBoost = 0;         // 1 while the threads carry their light to the third eye: they flow fast, towards it
    let eyeFlare = 0;          // 1 when the third eye opens
    const drawn = [];          // the threads drawn in the last frame, for the glow under them
    const smooth = (a, b, x) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
    const wrap = (v) => v - Math.floor(v);
    const rgbOf = (hex) => [(hex >> 16 & 255) / 255, (hex >> 8 & 255) / 255, (hex & 255) / 255];

    // One thread from one point to another (group coordinates), written into its slot of the particle buffers: a double
    // helix of dots flowing from the first point to the second, as wide as it is at the middle (`amp`) and a point at
    // both ends. `colours` are the tints of the two ends, `strength` its brightness
    const helix = (slot, data, t, [x0, y0], [x1, y1], [ca, cb], { unit, amp, strength = 1, strands = DOTS, dust = DUST, dir = 1 }) => {
        const dx = x1 - x0, dy = y1 - y0;
        const length = Math.max(1, Math.hypot(dx, dy));
        const nx = dy / length, ny = -dx / length;          // sideways
        const turns = length / TURN;
        let i = slot * PER;
        const place = (f, side, size, alpha) => {
            data.positions[i * 3] = x0 + dx * f + nx * side;
            data.positions[i * 3 + 1] = y0 + dy * f + ny * side;
            data.sizes[i] = size;
            data.alphas[i] = alpha;
            for (let c = 0; c < 3; c++) data.tints[i * 3 + c] = ca[c] + (cb[c] - ca[c]) * f;
        };
        for (let strand = 0; strand < 2; strand++) {
            for (let d = 0; d < DOTS; d++, i++) {
                if (d >= strands) { data.alphas[i] = 0; continue; }
                const f = wrap(d / strands + dir * flowPhase);
                const lens = Math.sin(Math.PI * f) ** 0.7;                // 0 at both ends: a point
                const wave = Math.PI * 2 * turns * f + strand * Math.PI - t * 0.4;
                const near = 0.5 + 0.5 * Math.cos(wave);                  // 1 when the dot passes in front
                const pulse = Math.max(0, Math.sin(f * 15 - t * 2.1)) ** 3;
                place(f, Math.sin(wave) * amp * lens, (3.8 + 3 * near + 2.4 * pulse + 2.2 * surge) * unit * (0.4 + 0.6 * lens),
                    smooth(0, 0.08, f) * smooth(0, 0.08, 1 - f) * strength * (0.7 + 0.3 * near));
            }
        }
        // Dust: tinier and quicker, loosely following the helix
        for (let d = 0; d < DUST; d++, i++) {
            if (d >= dust) { data.alphas[i] = 0; continue; }
            const seed = d * 12.9898;
            const r = (n) => { const v = Math.sin(seed + n * 78.233) * 43758.5453; return v - Math.floor(v); };
            const f = wrap(r(1) + dir * flowPhase * (1.6 + r(2) * 1.6));
            const lens = Math.sin(Math.PI * f) ** 0.7;
            const wave = Math.PI * 2 * turns * f + r(3) * 6.28;
            place(f, (r(4) - 0.5) * 2 * amp * 1.5 * lens + Math.sin(wave + t) * 4 * lens, (1.4 + r(5) * 1.5) * unit,
                smooth(0, 0.08, f) * smooth(0, 0.08, 1 - f) * strength * (0.35 + 0.5 * r(6)) * (0.6 + 0.4 * Math.sin(t * 2 + d)));
        }
    };
    const hide = (slot, data) => { data.alphas.fill(0, slot * PER, (slot + 1) * PER); };

    let threadShift = [0, 0];  // how far the threads' canvas is shifted by the pointer (the lights are not)
    const thread = {
        count: SLOTS * PER + 1,
        update(t, data) {
            const canvas = frontCanvas.value;
            if (!canvas || !canvas.clientWidth || !frame.value) return;
            const dt = Math.min(0.1, Math.max(0, t - lastT));
            lastT = t;
            surge = Math.max(0, surge - dt * 0.35);
            flowPhase += dt * FLOW * (1 + surge * 3 + flowBoost * 5);
            eyeFlare = Math.max(0, eyeFlare - dt * 0.7);
            linksFade += ((linksOut ? 0 : 1) - linksFade) * Math.min(1, dt * 2);

            const L = layout(canvas.clientWidth, canvas.clientHeight);
            const unit = Math.max(1, L.S / 765);
            const spots = lightSpots().map(([x, y]) => [x - threadShift[0], y - threadShift[1]]);
            drawn.length = 0;
            const draw = (slot, from, to, colours, strength, grow = 1, dir = 1) => {
                const length = Math.hypot(to[0] - from[0], to[1] - from[1]) * grow;
                const end = [from[0] + (to[0] - from[0]) * grow, from[1] + (to[1] - from[1]) * grow];
                helix(slot, data, t, from, end, colours, {
                    unit, amp: Math.min(0.028 * L.S, length * 0.1), strength, dir,
                    strands: Math.min(DOTS, Math.max(8, Math.round(length / 6))), dust: Math.min(DUST, Math.max(3, Math.round(length / 24))),
                });
                drawn.push({ slot, from, to: end, colours, strength, length });
            };
            // The threads the person has joined, each growing out of the light it left
            links.forEach((link, k) => {
                const grow = smooth(0, 1, smooth(0, 0.9, t - link.born));
                draw(1 + k, spots[link.a], spots[link.b], [TINTS[link.a], TINTS[link.b]], 0.9 * linksFade, grow, link.dir);
            });
            for (let k = links.length; k < MAX_LINKS; k++) hide(1 + k, data);
            // The thread that follows the finger, locking on to a light that is near enough
            if (drag && drag.moved) {
                const snapped = drag.snap >= 0;
                draw(0, spots[drag.from], snapped ? spots[drag.snap] : [drag.x - threadShift[0], drag.y - threadShift[1]],
                    [TINTS[drag.from], TINTS[snapped ? drag.snap : drag.from]], snapped ? 0.9 : 0.6);
            } else hide(0, data);
            // The dot on Sid's forehead: his third eye
            const eye = SLOTS * PER;
            data.positions[eye * 3] = spots[EYE][0];
            data.positions[eye * 3 + 1] = spots[EYE][1];
            data.sizes[eye] = (4.2 + 3.6 * surge + 30 * eyeFlare * eyeFlare) * unit;
            data.alphas[eye] = Math.min(1, 0.6 + 0.35 * Math.sin(t * 1.6) + 0.5 * eyeFlare);
            data.tints.set(TINTS[EYE], eye * 3);
        },
    };

    // A soft glow under every thread, so it reads as a line of light: big faint motes along its middle, a little brighter
    // where it is wide and gone at both ends
    const GLOW_DOTS = 30;
    const glow = {
        count: SLOTS * GLOW_DOTS,
        update(t, data) {
            data.alphas.fill(0);
            if (!frame.value) return;
            const unit = Math.max(1, frame.value.offsetWidth / 765);
            drawn.forEach(({ slot, from, to, colours: [ca, cb], strength, length }) => {
                for (let k = 0; k < GLOW_DOTS; k++) {
                    const f = (k + 0.5) / GLOW_DOTS;
                    const i = slot * GLOW_DOTS + k;
                    const lens = Math.sin(Math.PI * f) ** 0.7;
                    data.positions[i * 3] = from[0] + (to[0] - from[0]) * f;
                    data.positions[i * 3 + 1] = from[1] + (to[1] - from[1]) * f;
                    data.sizes[i] = (24 + 8 * Math.sin(t * 1.3 + k * 0.5 + slot)) * unit * (0.25 + 0.75 * lens);
                    data.alphas[i] = 0.16 * strength * smooth(0, 0.12, f) * smooth(0, 0.12, 1 - f) * Math.min(1, length / GLOW_DOTS / 10);
                    for (let c = 0; c < 3; c++) data.tints[i * 3 + c] = ca[c] + (cb[c] - ca[c]) * f;
                }
            });
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
        const leaf = (i) => {
            const name = `leaf-${letter}${i + 1}`;
            return { name, style: { ...place(name), '--origin': originOf(name, edge, LEAF_Y[i]), '--amp': `${3 + i * 0.8}deg`, '--dur': `${5.2 + i * 0.9}s`, '--delay': `${-i * 1.7}s` } };
        };
        // Each corner: a branch and the stem of a firefly hanging from it, swaying together from the corner
        const corner = (row, delay) => {
            const q = (row === 'top' ? 't' : 'b') + letter;
            return { row, key: 'fly-' + q, branch: 'corner-' + q, stem: 'stem-' + q, style: { '--origin': `${edge * 100}% ${row === 'top' ? 0 : 100}%`, '--amp': '1.3deg', '--dur': '6.5s', '--delay': `${delay}s` } };
        };
        // A target over a cloud: its place in the side's square, as percentages
        const target = (key, kind, group, scale = 1) => {
            const c = centreOf(key);
            const r = Math.max(150, c.half * scale + 30);
            return { key, kind, group, style: { left: pct((c.u - r) / 2160), top: pct((c.v - r) / 2160), width: pct(2 * r / 2160), height: pct(2 * r / 2160) } };
        };
        const corners = [corner('top', side === 'left' ? 0 : -2.3), corner('bottom', side === 'left' ? -1.4 : -3.6)];
        return {
            side, letter,
            leaves: [0, 1, 2, 3].map(leaf),
            upLeaves: [0, 1].map(leaf),
            corners,
            targets: [
                ...corners.map((c) => target(c.key, 'fly', G.fly[c.key.slice(4)])),
                target('blue-' + letter, 'blue', G.blue[letter], 0.9),
            ],
            sideStyle: { '--origin': `${edge * 100}% 50%`, '--amp': '0.7deg', '--dur': '9s', '--delay': side === 'left' ? '0s' : '-4s' },
        };
    });
    const label = (kind, locale) => LABELS[kind][locale === 'en' ? 1 : 0];

    // Where a target is on the canvas now, wherever its side has been shifted by the pointer
    let frontShift = [0, 0];
    let sidShift = [0, 0];
    const spotOf = (key, side) => {
        const canvas = frontCanvas.value;
        const L = layout(canvas.clientWidth, canvas.clientHeight);
        const c = centreOf(key);
        const [x, y] = L[side](c.u, c.v);
        return [x + frontShift[0], y + frontShift[1]];
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
        surge = 1;
        back?.boost(G.aura, 1.6);
        back?.boost(G.sun, 1);
        const canvas = frontCanvas.value;
        const w = canvas.clientWidth, h = canvas.clientHeight;
        const L = layout(w, h);
        const sun = sunSpot(w, h);
        const cx = L.fx0 + 0.5 * L.S + sidShift[0];
        burst(cx, L.fy0 + 0.436 * L.S + bob + sidShift[1], { n: 50, colors: [0xffe47d, 0xfff3b8, 0xffffff], speed: 160, size: 5.6, spread: 4 });
        burst(cx, L.fy0 + 0.52 * L.S + bob + sidShift[1], { n: 40, colors: [0x00a9bc, 0x7be3f5], speed: 190, size: 5.4, spread: 40 });
        burst(sun.x, sun.y + 60 * sun.k, { n: 18, colors: [0xffe47d], speed: 70, size: 5.6 });
        if (!quiet) play('star');
    };
    const warmSid = () => back?.boost(G.aura, 0.6);

    // Touching the sun sends a light through everything alive: it flares, and then, nearest first, the fireflies, the
    // blue mushrooms, Sid and the field of mushrooms answer with their own sparks
    const timers = [];
    const shine = () => {
        const canvas = frontCanvas.value;
        const w = canvas.clientWidth, h = canvas.clientHeight;
        const L = layout(w, h);
        const sun = sunSpot(w, h);
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
        answers.push({ distance: Math.hypot(0, h - sun.y), act: fieldSparks });
        const farthest = Math.max(...answers.map((a) => a.distance));
        answers.forEach(({ distance, act }) => timers.push(setTimeout(act, 150 + (distance / farthest) * 1100)));
    };
    const warmSun = () => back?.boost(G.sun, 0.5);

    // ---- Ver: joining the lights
    // The nine lights are the sun, Sid's third eye, the mushrooms of the field, and the fireflies and blue mushrooms of
    // both sides. Nothing is joined at the start. Dragging from one light to another joins them with a thread; when every
    // light is part of one network the pattern is seen: the rulito is drawn over Sid's head, stays a moment and goes,
    // the threads go out with it, and everything can be joined again.
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
    let sunShift = [0, 0];
    let mushShift = [0, 0];
    let win = null;                                // the rulito: { age, head, tail, full, fullAt, back, pop }, until it is gone
    let wins = 0;
    let drag = null;                               // { from, x, y, startX, startY, moved, snap, tap }
    let kbFrom = -1;                               // the light picked with the keyboard, waiting for the one to join it to
    let idle = 0;                                  // seconds since the last touch
    let hintIn = 0;
    let hintTurn = 0;

    // Where each light is on the canvas now
    const lightSpots = () => {
        const canvas = frontCanvas.value;
        const w = canvas.clientWidth, h = canvas.clientHeight;
        const L = layout(w, h);
        const sun = sunSpot(w, h);
        const field = L.centred(1080, 1900);                  // the top of the big mushroom in the middle
        return [
            [sun.x + sunShift[0], sun.y + 150 * sun.k + sunShift[1]],
            [L.fx0 + 0.5 * L.S + sidShift[0], L.fy0 + 0.436 * L.S + sidShift[1]],
            [field[0] + mushShift[0], field[1] + mushShift[1]],
            ...LIGHTS.slice(3).map((light) => spotOf(light.target.key, light.side)),
        ];
    };

    // The pink sparks along the field of mushrooms, when it is touched or answers the sun
    const fieldSparks = () => {
        const canvas = frontCanvas.value;
        const L = layout(canvas.clientWidth, canvas.clientHeight);
        back?.boost(G.pink, 1.3);
        [450, 800, 1080, 1360, 1700].forEach((u) => {
            const [x, y] = L.centred(u, 1930);
            burst(x + mushShift[0], y + 10 + mushShift[1], { n: 12, colors: [0xcb5e95, 0xff9fcb, 0xffd1e6], speed: 100, size: 5, spread: 14 });
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

    // Which lights are joined to which
    const network = () => {
        const group = LIGHTS.map((_, i) => i);
        const root = (i) => (group[i] === i ? i : (group[i] = root(group[i])));
        links.forEach((l) => { group[root(l.a)] = root(l.b); });
        return root;
    };
    const joined = (a, b) => links.some((l) => (l.a === a && l.b === b) || (l.a === b && l.b === a));

    const join = (a, b) => {
        if (win || reducedMotion || a === b || joined(a, b) || links.length >= MAX_LINKS) return;
        links.push({ a, b, born: lastT });
        idle = 0;
        surge = Math.max(surge, 0.5);
        flare(a);
        flare(b);
        play('link', { from: LIGHTS[a].pitch, to: LIGHTS[b].pitch });
        const root = network();
        if (LIGHTS.every((_, i) => root(i) === root(SUN))) seen();
    };

    // The pattern is seen: every light answers, nearest to the eye first, and the rulito is drawn over Sid's head (GROW
    // seconds), shines for a moment (LINGER) and goes as its tail catches up with its head (EAT), taking the threads with it
    const GROW = 2.6, LINGER = 2.2, EAT = 3.4, CONVERGE = 1.7;
    const seen = () => {
        wins += 1;
        win = { age: 0, head: 0, tail: 0, full: false, fullAt: 0, back: false, pop: 0, opened: false };
        rulito.value?.reshape();
        sceneMilestone('pattern_seen', { times: wins });
        // The threads carry their light to the third eye: each one flows from the light farther from it to the nearer one
        const depth = LIGHTS.map(() => Infinity);
        depth[EYE] = 0;
        const queue = [EYE];
        while (queue.length) {
            const here = queue.shift();
            links.forEach((l) => {
                const other = l.a === here ? l.b : l.b === here ? l.a : -1;
                if (other >= 0 && depth[other] === Infinity) { depth[other] = depth[here] + 1; queue.push(other); }
            });
        }
        links.forEach((l) => { l.dir = depth[l.b] > depth[l.a] ? -1 : 1; });
        play('converge');
        const spots = lightSpots();
        spots.map(([x, y], i) => ({ i, d: Math.hypot(x - spots[EYE][0], y - spots[EYE][1]) }))
            .sort((a, b) => a.d - b.d)
            .forEach(({ i }, k) => timers.push(setTimeout(() => flare(i), 150 + k * 120)));
    };
    // The third eye opens: a flare, a ring of sparks and a low bowl, and then the rulito is born
    const openEye = () => {
        win.opened = true;
        eyeFlare = 1;
        surge = 1;
        awake = 1;
        back?.boost(G.aura, 2.2);
        back?.boost(G.sun, 1.2);
        const [x, y] = lightSpots()[EYE];
        burst(x, y, { n: 70, colors: [0x9deaf7, 0xffffff, 0xffe47d], speed: 230, size: 6, spread: 3 });
        play('open');
    };
    const winTick = (t, dt) => {
        flowBoost += ((win && !win.opened ? 1 : 0) - flowBoost) * Math.min(1, dt * 3);
        if (!win || !rulito.value) return;
        win.age += dt;
        if (!win.opened && win.age > CONVERGE) openEye();
        win.pop = Math.max(0, win.pop - dt * 2.2);
        // It starts once the lights have answered, quickly, and eases in as it gets there
        if (win.opened && win.age > CONVERGE + 0.4 && win.head < 1) win.head = 1 - (1 - Math.min(1, (win.age - CONVERGE - 0.4) / GROW)) ** 1.6;
        if (win.head >= 1 && !win.full) {
            win.full = true;
            win.fullAt = win.age;
            win.pop = 1;
            surge = 1;
            back?.boost(G.aura, 1.6);
            back?.boost(G.sun, 1.2);
            play('star');
        }
        if (win.full && !win.back && win.age - win.fullAt > LINGER) { win.back = true; linksOut = true; }
        if (win.back) win.tail = Math.min(win.head, win.tail + dt / EAT);
        const whole = Math.min(1, Math.max(0, (win.head - win.tail - 0.6) / 0.4));
        stageEl?.style.setProperty('--name-glow', Math.max(win.pop, 0.8 * whole * whole * (3 - 2 * whole)).toFixed(3));
        const glow = win.full && win.head - win.tail > 0.9 ? Math.max(win.pop, Math.sin(t * 4) * 0.5 + 0.5) : 0;
        rulito.value.frame({ head: win.head, tail: win.tail, flare: glow, t, fade: Math.min(1, (win.head - win.tail) * 14) });
        rulito.value.$el.style.rotate = `${(Math.sin(t * 1.8) * 3).toFixed(2)}deg`;
        rulito.value.$el.style.scale = (1 + 0.2 * win.pop * win.pop).toFixed(3);
        if (win.back && win.tail >= win.head) {
            win = null;
            rulito.value.frame({});
            stageEl?.style.setProperty('--name-glow', '0');
            links.length = 0;
            linksOut = false;
        }
    };
    let auraGoal = 0;                              // 0..1, how much of the network is joined
    let aura = 0;                                  // the aura's swelling, easing towards it
    let linksOut = false;                          // the threads fade out while the rulito goes

    // The lights that are joined stay lit, so the network is seen growing
    const keepLit = () => {
        if (win) return;
        const lit = new Set();
        links.forEach((l) => { lit.add(l.a); lit.add(l.b); });
        lit.forEach((i) => warmLight(i, 0.5));
        // Sid's aura grows with the lights that are joined, and he glows a little more
        const level = lit.size / LIGHTS.length;
        back?.boost(G.aura, 0.15 + 1.1 * level);
        awake = Math.max(awake, 0.45 * level);
        auraGoal = level;
    };

    // The aura swells outwards from Sid as the network is joined (a little: 14% when it is whole) and goes back as the
    // threads go out
    const swellAura = (dt) => {
        const canvas = backCanvas.value;
        if (!canvas || !canvas.clientWidth) return;
        aura += ((win && !win.back ? 1 : auraGoal) - aura) * Math.min(1, dt * 2);
        auraGoal = 0;
        const L = layout(canvas.clientWidth, canvas.clientHeight);
        back?.grow(G.aura, 0.14 * aura, L.fx0 + 1072 * L.kf, L.fy0 + 1123 * L.kf);
    };

    // No words: after a while without touching anything a light that is not joined yet glows now and then, first the sun
    // and the eye, which are the ones to join first
    const hint = (dt) => {
        if (win || drag || reducedMotion || !entered) return;
        idle += dt;
        hintIn -= dt;
        if (idle < 8 || hintIn > 0) return;
        hintIn = 3.5;
        if (!links.length) { warmLight(hintTurn++ % 2 ? EYE : SUN, 1); return; }
        const root = network();
        const size = {};
        LIGHTS.forEach((_, i) => { size[root(i)] = (size[root(i)] ?? 0) + 1; });
        const main = Object.keys(size).sort((a, b) => size[b] - size[a])[0];
        const apart = LIGHTS.map((_, i) => i).filter((i) => String(root(i)) !== main);
        if (apart.length) warmLight(apart[Math.floor(Math.random() * apart.length)], 1);
    };

    // Dragging: the light is grabbed where the finger goes down, and the thread follows until it is let go
    const toCanvas = (event) => {
        const box = frontCanvas.value.getBoundingClientRect();
        return [event.clientX - box.left, event.clientY - box.top];
    };
    const lightNear = (x, y, skip) => {
        let best = -1;
        let bestDistance = Math.max(50, 0.1 * frame.value.offsetWidth);     // near enough to join
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

    // The line work is decoded before anything is shown, so the particles never arrive on their own
    const waitForDrawings = () => Promise.race([
        Promise.all([...root.value.querySelectorAll('img')].map((img) => img.decode().catch(() => {}))),
        new Promise((resolve) => setTimeout(resolve, 8000)),
    ]);

    const enter = () => {
        if (entered || !props.active || !drawingsReady) return;
        entered = true;
        back?.reveal();
        front?.reveal();
        requestAnimationFrame(() => requestAnimationFrame(() => { shown.value = true; }));
        enterLayers([
            { el: being.value, y: 70, delay: 500, duration: 2000 },
            { el: mushrooms.value, y: 150, delay: 200, duration: 1800 },
        ]);
    };

    onMounted(() => {
        stageEl = root.value.closest('.stage');
        let lastFrame = 0;
        parallax = createParallax(root.value, ({ x, y, scroll, t, ramp }) => {
            const s = scroll;
            const dt = Math.min(0.1, Math.max(0, t - lastFrame));
            lastFrame = t;
            // The forest at the sides: the nearer, the more it moves against the pointer
            backSheets.value.forEach((el) => { el.style.translate = `${-x * 6}px ${-y * 3 - s * 14}px`; });
            frontShift = [-x * 16, -y * 8 - s * 40];
            frontSheets.value.forEach((el) => { el.style.translate = `${frontShift[0]}px ${frontShift[1]}px`; });
            mushShift = [-x * 10, -y * 3 - s * 10];
            mushrooms.value.style.translate = `${mushShift[0]}px ${mushShift[1]}px`;
            // Sid, with his aura; when woken he glows a little, swells and settles
            awake = Math.max(0, awake - dt * 0.4);
            bob = Math.sin(t * 0.75) * 0.009 * frame.value.offsetWidth * ramp;
            sidShift = [-x * 12, -y * 6 + bob - s * 30];
            being.value.style.translate = `${sidShift[0]}px ${sidShift[1]}px`;
            being.value.style.scale = (1 + 0.035 * awake * awake + Math.sin(t * 0.9) * 0.004 * ramp).toFixed(4);
            body.value.style.filter = awake > 0.01 ? `brightness(${(1 + 0.3 * awake).toFixed(3)}) saturate(${(1 + 0.4 * awake).toFixed(3)})` : '';
            // The coloured particles follow the layers they belong to
            sunShift = [-x * 5, -y * 3 - s * 10];
            back?.shift(G.sun, sunShift[0], sunShift[1]);
            back?.shift(G.aura, sidShift[0], sidShift[1]);
            back?.shift(G.pink, -x * 10, -y * 3 - s * 10);
            [...Object.values(G.fly), ...Object.values(G.blue)].forEach((g) => back?.shift(g, frontShift[0], frontShift[1]));
            threadShift = [-x * 9, -y * 5 - s * 22];
            front?.shift(0, threadShift[0], threadShift[1]);        // the glow under the threads
            front?.shift(1, threadShift[0], threadShift[1]);        // the threads
            winTick(t, dt);
            keepLit();
            swellAura(dt);
            hint(dt);
        });

        const tone = (name) => [hexOf(clouds[name].color)];
        back = startStardust(backCanvas.value, {
            manual: true,
            groups: [
                // 0: the stippled edge of the floor, trembling
                { colors: [0x00625e, 0x00625e, 0x00524f, 0x0a7a72], size: [2, 4.6], parallax: 0, drift: 2.2, jitter: 0.5, twinkle: 0.25, reach: 80, push: 9, points: (w, h) => {
                    const L = layout(w, h);
                    return Array.from({ length: Math.round(w * 2.4) }, () => {
                        const x = Math.random() * w;
                        return [x, floorTop(x, L, w) - (-Math.log(Math.random() + 0.001)) * 0.011 * L.sn + 0.002 * L.sn, (2 + Math.random() * 2.6) * Math.max(1, L.S / 765)];
                    });
                } },
                // 1: the faint dots of the sky
                { count: 200, colors: [0x007a70, 0x00706a, 0x006b66], size: [2.5, 7], drift: 6, twinkle: 0.3, reach: 100, push: 24, parallax: 8, opacity: 0.9,
                    spawn: (w, h) => [w * (0.1 + Math.random() * 0.8), h * Math.random() * 0.74] },
                // 2: the sun
                { colors: tone('sun'), parallax: 0, drift: 2.2, jitter: 0.9, twinkle: 0.12, reach: 0, points: (w, h) => {
                    const s = sunSpot(w, h);
                    return sample('sun', (u, v) => [s.x + (u - 1075) * s.k, s.y + (v - 425) * s.k], s.k, 1.6);
                } },
                // 3: the cyan aura around Sid
                { colors: tone('aura'), parallax: 0, drift: 3.4, jitter: 1.1, twinkle: 0.3, reach: 0, points: (w, h) => {
                    const L = layout(w, h);
                    return sample('aura', (u, v) => [L.fx0 + u * L.kf, L.fy0 + v * L.kf], L.kf, 1.2);
                } },
                // 4: the pink glow of the mushrooms
                { colors: tone('pink'), parallax: 0, drift: 2.6, jitter: 1, twinkle: 0.22, reach: 90, push: 12, points: (w, h) => {
                    const L = layout(w, h);
                    return sample('pink', L.centred, L.kn);
                } },
                // 5-8: the fireflies' halos, one group each so each can flare on its own
                ...['tl', 'tr', 'bl', 'br'].map((q) => ({ colors: tone('fly-' + q), parallax: 0, drift: 2.6, jitter: 1.2, twinkle: 0.3, reach: 0, points: (w, h) => {
                    const L = layout(w, h);
                    return sample('fly-' + q, q.endsWith('l') ? L.left : L.right, L.kn * 1.04);
                } })),
                // 9-10: the blue mushrooms
                ...['l', 'r'].map((q) => ({ colors: tone('blue-' + q), parallax: 0, drift: 2.2, jitter: 1, twinkle: 0.24, reach: 0, points: (w, h) => {
                    const L = layout(w, h);
                    return sample('blue-' + q, q === 'l' ? L.left : L.right, L.kn * 1.04);
                } })),
            ],
        });
        front = startStardust(frontCanvas.value, {
            manual: true,
            groups: [
                { colors: [0xffe47d], dynamic: glow, parallax: 0, drift: 0, twinkle: 0, reach: 0, look: 'soft' },
                { colors: [0xffe47d, 0xffe47d, 0xfff3b8], dynamic: thread, parallax: 0, drift: 0, twinkle: 0, reach: 140, push: 26, look: 'hard' },
                { colors: [0xffffff], dynamic: sparkGroup, parallax: 0, drift: 0, twinkle: 0, reach: 0, look: 'hard' },
            ],
        });

        buildFloor();
        resizeWatch = new ResizeObserver(buildFloor);
        resizeWatch.observe(root.value);
        waitForDrawings().then(() => { drawingsReady = true; enter(); });
    });
    watch(() => props.active, enter);
    onBeforeUnmount(() => {
        parallax?.destroy();
        back?.destroy();
        front?.destroy();
        resizeWatch?.disconnect();
        timers.forEach(clearTimeout);
        stopDrag();
        stageEl?.style.removeProperty('--name-glow');
    });
</script>

<template>
    <div class="scene" ref="root" :class="{ shown }">
        <!-- The floor: a drawn silhouette (its stippled edge is particles) -->
        <svg class="floor" aria-hidden="true">
            <defs>
                <linearGradient id="pannaFloor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stop-color="#00625e"/>
                    <stop offset="1" stop-color="#004f4c"/>
                </linearGradient>
            </defs>
            <path :d="floorPath" fill="url(#pannaFloor)"/>
        </svg>

        <!-- Everything coloured, as particles: above the floor, behind all the line work -->
        <canvas class="field" ref="backCanvas"></canvas>

        <!-- Behind: the dark walls of the forest, one on each side of the screen, and their mirror above -->
        <template v-for="s in sides" :key="'back' + s.side">
            <div class="half back" :class="s.side">
                <div class="sheet" ref="backSheets">
                    <img class="piece" :src="IMG('wall-' + s.letter)" :style="place('wall-' + s.letter)" alt="" draggable="false">
                </div>
            </div>
            <div class="half back up" :class="s.side">
                <div class="sheet" ref="backSheets">
                    <img class="piece" :src="IMG('wall-' + s.letter)" :style="place('wall-' + s.letter)" alt="" draggable="false">
                </div>
            </div>
        </template>

        <!-- Sid, in a square frame at the bottom of the screen -->
        <div class="frame" ref="frame">
            <div class="depth" ref="being">
                <img class="piece" ref="body" :src="IMG('character')" :style="place('character')" alt="" draggable="false">
                <div class="hit sid" role="button" tabindex="0" :style="place('character')" aria-label="Sid"
                    @pointerdown.prevent="wake" @pointerenter="warmSid" @keydown="onKey($event, wake)"></div>
                <!-- His third eye, the end of the spiral: one of the lights to join -->
                <div class="hit eye" role="button" tabindex="0" :aria-label="$i18n.locale === 'en' ? 'Third eye' : 'Tercer ojo'"
                    @pointerdown.prevent="press(EYE, $event)" @pointerenter="warmSid" @keydown="pressKey(EYE, $event)"></div>
                <!-- The rulito over his head, in the gold of the thread -->
                <Rulito ref="rulito" class="rulito" color="#ffe47d" />
            </div>
        </div>

        <!-- The mushrooms, stacked in the order of the illustration (the pink glow is particles, behind) -->
        <div class="mushrooms" ref="mushrooms">
            <img class="piece" :src="IMG('mush-stems')" :style="place('mush-stems')" alt="" draggable="false">
            <img class="piece" :src="IMG('mush-caps')" :style="place('mush-caps')" alt="" draggable="false">
            <img class="piece" :src="IMG('mush-shade')" :style="place('mush-shade')" alt="" draggable="false">
            <img class="piece" :src="IMG('mush-outline')" :style="place('mush-outline')" alt="" draggable="false">
            <!-- The big mushroom in the middle: one more light to join -->
            <div class="hit field" role="button" tabindex="0" :aria-label="$i18n.locale === 'en' ? 'Pink mushrooms' : 'Hongos rosados'"
                @pointerdown.prevent="press(FIELD, $event)" @pointerenter="warmLight(FIELD)" @keydown="pressKey(FIELD, $event)"></div>
        </div>

        <!-- In front: leaves, branches and the fireflies' stems, anchored to the sides -->
        <template v-for="s in sides" :key="'front' + s.side">
            <div class="half front" :class="s.side">
                <div class="sheet" ref="frontSheets">
                    <img v-for="leaf in s.leaves" :key="leaf.name" class="piece sway" :src="IMG(leaf.name)" :style="leaf.style" alt="" draggable="false">

                    <div class="layer sway" :style="s.sideStyle">
                        <img class="piece" :src="IMG('branch-' + s.letter)" :style="place('branch-' + s.letter)" alt="" draggable="false">
                        <img class="piece" :src="IMG('hooks-' + s.letter)" :style="place('hooks-' + s.letter)" alt="" draggable="false">
                    </div>

                    <div v-for="c in s.corners" :key="c.row" class="layer sway" :style="c.style">
                        <img class="piece" :src="IMG(c.branch)" :style="place(c.branch)" alt="" draggable="false">
                        <img class="piece" :src="IMG(c.stem)" :style="place(c.stem)" alt="" draggable="false">
                    </div>

                    <img v-if="s.side === 'right'" class="piece" :src="IMG('mark')" :style="place('mark')" alt="" draggable="false">

                    <!-- What can be touched: the fireflies and the blue mushrooms -->
                    <div v-for="target in s.targets" :key="target.key" class="hit" role="button" tabindex="0" :style="target.style"
                        :aria-label="label(target.kind, $i18n.locale)"
                        @pointerdown.prevent="press(target.light, $event)" @pointerenter="warm(target)" @keydown="pressKey(target.light, $event)"></div>
                </div>
            </div>

            <!-- Above the big square the forest goes on: the same picture, flipped, so the branches meet at the seam -->
            <div class="half front up" :class="s.side">
                <div class="sheet" ref="frontSheets">
                    <img v-for="leaf in s.upLeaves" :key="leaf.name" class="piece sway" :src="IMG(leaf.name)" :style="leaf.style" alt="" draggable="false">
                    <div class="layer sway" :style="s.sideStyle">
                        <img class="piece" :src="IMG('branch-' + s.letter)" :style="place('branch-' + s.letter)" alt="" draggable="false">
                    </div>
                    <div class="layer sway" :style="s.corners[0].style">
                        <img class="piece" :src="IMG(s.corners[0].branch)" :style="place(s.corners[0].branch)" alt="" draggable="false">
                    </div>
                </div>
            </div>
        </template>

        <!-- The sun: touch it and everything alive answers -->
        <div class="hit sun" role="button" tabindex="0" :aria-label="$i18n.locale === 'en' ? 'Sun' : 'Sol'"
            @pointerdown.prevent="press(SUN, $event)" @pointerenter="warmSun" @keydown="pressKey(SUN, $event)"></div>

        <!-- The spiral and the sparks, in front of everything -->
        <canvas class="field" ref="frontCanvas"></canvas>
    </div>
</template>

<style scoped>
    .scene {
        /* The centre's square, and the bigger one of the surroundings */
        --s: min(max(100vw, 62svh), 85svh);
        --sn: min(calc(var(--s) * 1.1), calc(100vw * 1.25));
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

    .floor {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        opacity: 0;
        transition: opacity 1.8s ease-out;
        pointer-events: none;
    }

    .shown .floor {
        opacity: 1;
    }

    /* A whole 2160px square (no pixels of its own) holding cropped pictures */
    .layer {
        position: absolute;
        inset: 0;
        pointer-events: none;
    }

    /* A cropped picture, placed by its inline percentages */
    .piece {
        position: absolute;
        display: block;
        max-width: none;
        user-select: none;
        pointer-events: none;
    }

    /* Something to touch: invisible, over the thing itself */
    .hit {
        position: absolute;
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

    /* Over the dot on his forehead (43.6% of the frame), where the spiral ends */
    .hit.eye {
        left: 50%;
        top: 43.6%;
        width: 13%;
        height: 13%;
        translate: -50% -50%;
    }

    /* Over the top of the big pink mushroom: 88% down the square of the mushrooms, in the middle */
    .hit.field {
        left: 50%;
        top: 88%;
        width: 18.5%;
        height: 18.5%;
        translate: -50% -50%;
    }

    /* The rulito floats clear of his head (the top of it is at 29% of the frame) */
    .depth .rulito {
        position: absolute;
        left: 50%;
        top: 8%;
        width: 6.5%;
        translate: -50% 0;
        transform-origin: 50% 100%;
        pointer-events: none;
    }

    /* Over the sun: 1.2% from the top, as big as its stipple (about 300 of the 2160px units each way) */
    .hit.sun {
        --u: calc(var(--s) * 0.95 / 2160);
        left: 50%;
        top: 1.2%;
        width: calc(var(--u) * 560);
        height: calc(var(--u) * 560);
        translate: -50% -50%;
    }

    /* ---- The sides: each half shows half of the big square, from the edge of the screen inwards. It hangs a little
       below the screen, so the pointer and the scroll can lift it without showing a gap at the bottom. ---- */
    .half {
        position: absolute;
        bottom: calc(var(--sn) * -0.04);
        width: min(calc(var(--sn) / 2), 50%);
        height: var(--sn);
        overflow: hidden;
        opacity: 0;
        transition: opacity 1.8s ease-out;
        pointer-events: none;
    }

    .shown .half {
        opacity: 1;
    }

    .half.left { left: 0; }
    .half.right { right: 0; }

    /* A little wider than the screen, so the pointer can shift it sideways without a gap at the edge. Its outer edge
       always sits on the edge of the screen, so on a narrow one the branches and leaves are not cropped away. */
    .sheet {
        position: absolute;
        bottom: 0;
        width: var(--sn);
        height: var(--sn);
        scale: 1.04 1;
    }

    .left .sheet { left: 0; transform-origin: 100% 50%; }
    .right .sheet { right: 0; transform-origin: 0% 50%; }

    /* The mirror above: sits right on top of the big square and is flipped over, so the seam is the picture's own top edge */
    .half.up {
        bottom: calc(var(--sn) * 0.96 - 1px);
    }

    .up .sheet {
        scale: 1.04 -1;
    }

    /* ---- The centre ---- */
    .frame {
        position: absolute;
        width: var(--s);
        height: var(--s);
        left: calc(50% - var(--s) / 2);
        bottom: 0;
        pointer-events: none;
    }

    .depth {
        position: absolute;
        inset: 0;
        transform-origin: 50% 62%;
    }

    /* ---- The mushrooms ---- */
    .mushrooms {
        position: absolute;
        bottom: calc(var(--sn) * -0.04);
        width: var(--sn);
        height: var(--sn);
        left: calc(50% - var(--sn) / 2);
        pointer-events: none;
    }

    /* ---- Idle motion: foliage sways from where it hangs ---- */
    .sway {
        transform-origin: var(--origin, 50% 50%);
        animation: sway var(--dur, 7s) ease-in-out var(--delay, 0s) infinite alternate;
    }

    @keyframes sway {
        from { rotate: calc(var(--amp, 1deg) * -1); }
        to { rotate: var(--amp, 1deg); }
    }

    @media (prefers-reduced-motion: reduce) {
        .half, .floor { opacity: 1; transition: none; }
        .sway { animation: none; }
    }
</style>
