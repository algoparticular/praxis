<script setup>
    // Pañña (wisdom): Sid meditating under a stippled sun, in a forest of dark branches, with fireflies and
    // glowing mushrooms. The line work (character, branches, leaves, mushroom outlines, the walls of the forest) comes
    // from the artwork in public/assets/panna, each layer cropped to its own box (pannaLayers.json).
    // Everything else is alive and drawn by code (three.js, useStardust), behind the line work: the sun, the cyan
    // aura, the fireflies' halos, the blue mushrooms, the pink glow and the stippled edge of the floor are particles
    // whose shapes come from density maps of the original stipple (pannaClouds.json); the floor itself is a drawn
    // silhouette. The spiral from the sun to Sid's forehead is a moving group of particles, and a last group throws
    // sparks when the fireflies, the blue mushrooms or Sid are touched.
    // Two scales give depth: the centre lives in a square frame; the surroundings are a slightly bigger square whose
    // left and right halves are anchored to the sides of the screen, so on a wide screen the forest still hugs the edges.
    import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { createParallax, enterLayers } from '../../composables/useParallax.js';
    import { startStardust } from '../../composables/useStardust.js';
    import { play } from '../../composables/useSound.js';
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
    const floorPath = ref('');
    const shown = ref(false);
    let parallax = null;
    let back = null;
    let front = null;
    let resizeWatch = null;
    let entered = false;

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
        const inset = Math.min(0, w / 2 - sn / 2);            // the sheets are centred, not anchored, on a narrow screen
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

    // ---- The spiral from the sun to Sid's forehead, as particles that flow down it
    const TURN = 180;          // px of the path per turn of the double helix
    const STRAND_DOTS = 26;
    const DUST = 20;
    const FLOW = 0.1;          // lengths of the path per second
    let bob = 0;               // Sid floats; the aura and the thread's end float with him
    let surge = 0;             // 1 when Sid has just been touched: the spiral rushes
    let flowPhase = 0;
    let lastT = 0;
    const smooth = (a, b, x) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
    const thread = {
        count: STRAND_DOTS * 2 + DUST + 1,
        update(t, data) {
            const canvas = frontCanvas.value;
            if (!canvas || !canvas.clientWidth || !frame.value) return;
            const dt = Math.min(0.1, Math.max(0, t - lastT));
            lastT = t;
            surge = Math.max(0, surge - dt * 0.35);
            flowPhase += dt * FLOW * (1 + surge * 3);

            const w = canvas.clientWidth, h = canvas.clientHeight;
            const L = layout(w, h);
            const sun = sunSpot(w, h);
            const x0 = w / 2, y0 = sun.y + 150 * sun.k;            // inside the sun, so the thread seems to leave it
            const x1 = L.fx0 + 0.5 * L.S, y1 = L.fy0 + 0.436 * L.S + bob;
            const length = Math.max(1, y1 - y0);
            const turns = length / TURN;
            const amp = 0.034 * L.S;
            const unit = Math.max(1, L.S / 765);
            const envelope = (f) => smooth(0, 0.14, f) * smooth(0, 0.07, 1 - f);

            let i = 0;
            for (let strand = 0; strand < 2; strand++) {
                for (let d = 0; d < STRAND_DOTS; d++, i++) {
                    const f = (d / STRAND_DOTS + flowPhase) % 1;
                    const wave = Math.PI * 2 * turns * f + strand * Math.PI - t * 0.7;
                    const narrowing = 1 - 0.78 * smooth(0.25, 1, f);
                    const near = 0.5 + 0.5 * Math.cos(wave);                  // 1 when the dot passes in front
                    const pulse = Math.max(0, Math.sin(f * 15 - t * 2.1)) ** 3;
                    data.positions[i * 3] = x0 + (x1 - x0) * f + Math.sin(wave) * amp * narrowing;
                    data.positions[i * 3 + 1] = y0 + length * f;
                    data.sizes[i] = (3.6 + 3.4 * near + 3 * pulse + 2.5 * surge) * unit;
                    data.alphas[i] = envelope(f) * (0.45 + 0.55 * near);
                }
            }
            // Dust: tinier and quicker, loosely following the helix
            for (let d = 0; d < DUST; d++, i++) {
                const seed = d * 12.9898;
                const r = (n) => { const v = Math.sin(seed + n * 78.233) * 43758.5453; return v - Math.floor(v); };
                const f = (r(1) + flowPhase * (1.6 + r(2) * 1.6)) % 1;
                const wave = Math.PI * 2 * turns * f + r(3) * 6.28;
                const spread = (r(4) - 0.5) * 2 * amp * 1.5 * (1 - 0.7 * smooth(0.25, 1, f));
                data.positions[i * 3] = x0 + (x1 - x0) * f + spread + Math.sin(wave + t) * 4;
                data.positions[i * 3 + 1] = y0 + length * f;
                data.sizes[i] = (1.6 + r(5) * 1.8) * unit;
                data.alphas[i] = envelope(f) * (0.35 + 0.5 * r(6)) * (0.6 + 0.4 * Math.sin(t * 2 + d));
            }
            // The dot on Sid's forehead where the thread ends
            data.positions[i * 3] = x1;
            data.positions[i * 3 + 1] = y1;
            data.sizes[i] = (5 + 4 * surge) * unit;
            data.alphas[i] = 0.6 + 0.35 * Math.sin(t * 1.6);
        },
    };

    // ---- Sparks, thrown when something is touched
    const SPARKS = 360;
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

    const touch = (target, side) => {
        const [x, y] = spotOf(target.key, side);
        if (target.kind === 'fly') {
            back?.boost(target.group, 1.5);
            burst(x, y, { n: 30, colors: [0xffe47d, 0xfff3b8, 0xffffff], speed: 130, size: 5.4 });
            play('star');
        } else {
            back?.boost(target.group, 1.4);
            burst(x, y, { n: 22, colors: [0x00b4d7, 0x7be3f5, 0xffffff], speed: 110, size: 5.2 });
            play('tap');
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
    const wake = () => {
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
        play('star');
    };
    const warmSid = () => back?.boost(G.aura, 0.6);

    const enter = () => {
        if (entered || !props.active) return;
        entered = true;
        requestAnimationFrame(() => requestAnimationFrame(() => { shown.value = true; }));
        enterLayers([
            { el: being.value, y: 70, delay: 500, duration: 2000 },
            { el: mushrooms.value, y: 150, delay: 200, duration: 1800 },
        ]);
    };

    onMounted(() => {
        let lastFrame = 0;
        parallax = createParallax(root.value, ({ x, y, scroll, t, ramp }) => {
            const s = scroll;
            const dt = Math.min(0.1, Math.max(0, t - lastFrame));
            lastFrame = t;
            // The forest at the sides: the nearer, the more it moves against the pointer
            backSheets.value.forEach((el) => { el.style.translate = `${-x * 6}px ${-y * 3 - s * 14}px`; });
            frontShift = [-x * 16, -y * 8 - s * 40];
            frontSheets.value.forEach((el) => { el.style.translate = `${frontShift[0]}px ${frontShift[1]}px`; });
            mushrooms.value.style.translate = `${-x * 10}px ${-y * 3 - s * 10}px`;
            // Sid, with his aura; when woken he glows a little, swells and settles
            awake = Math.max(0, awake - dt * 0.4);
            bob = Math.sin(t * 0.75) * 0.009 * frame.value.offsetWidth * ramp;
            sidShift = [-x * 12, -y * 6 + bob - s * 30];
            being.value.style.translate = `${sidShift[0]}px ${sidShift[1]}px`;
            being.value.style.scale = (1 + 0.035 * awake * awake + Math.sin(t * 0.9) * 0.004 * ramp).toFixed(4);
            body.value.style.filter = awake > 0.01 ? `brightness(${(1 + 0.3 * awake).toFixed(3)}) saturate(${(1 + 0.4 * awake).toFixed(3)})` : '';
            // The coloured particles follow the layers they belong to
            back?.shift(G.sun, -x * 5, -y * 3 - s * 10);
            back?.shift(G.aura, sidShift[0], sidShift[1]);
            back?.shift(G.pink, -x * 10, -y * 3 - s * 10);
            [...Object.values(G.fly), ...Object.values(G.blue)].forEach((g) => back?.shift(g, frontShift[0], frontShift[1]));
            front?.shift(0, -x * 9, -y * 5 - s * 22);              // the thread
        });

        const tone = (name) => [hexOf(clouds[name].color)];
        back = startStardust(backCanvas.value, {
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
            groups: [
                { colors: [0xffe47d, 0xffe47d, 0xfff3b8], dynamic: thread, parallax: 0, drift: 0, twinkle: 0, reach: 140, push: 26, look: 'hard' },
                { colors: [0xffffff], dynamic: sparkGroup, parallax: 0, drift: 0, twinkle: 0, reach: 0, look: 'hard' },
            ],
        });

        buildFloor();
        resizeWatch = new ResizeObserver(buildFloor);
        resizeWatch.observe(root.value);
        enter();
    });
    watch(() => props.active, enter);
    onBeforeUnmount(() => {
        parallax?.destroy();
        back?.destroy();
        front?.destroy();
        resizeWatch?.disconnect();
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
            </div>
        </div>

        <!-- The mushrooms, stacked in the order of the illustration (the pink glow is particles, behind) -->
        <div class="mushrooms" ref="mushrooms">
            <img class="piece" :src="IMG('mush-stems')" :style="place('mush-stems')" alt="" draggable="false">
            <img class="piece" :src="IMG('mush-caps')" :style="place('mush-caps')" alt="" draggable="false">
            <img class="piece" :src="IMG('mush-shade')" :style="place('mush-shade')" alt="" draggable="false">
            <img class="piece" :src="IMG('mush-outline')" :style="place('mush-outline')" alt="" draggable="false">
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
                        @pointerdown.prevent="touch(target, s.side)" @pointerenter="warm(target)" @keydown="onKey($event, () => touch(target, s.side))"></div>
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
        touch-action: manipulation;
        outline: none;
    }

    .hit:focus-visible {
        outline: 2px solid rgba(255, 244, 150, 0.9);
        outline-offset: 2px;
    }

    .hit.sid {
        border-radius: 46% 46% 40% 40%;
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

    /* A little wider than the screen, so the pointer can shift it sideways without a gap at the edge. When the screen
       is narrower than the square, the picture is centred instead and its sides are cropped. */
    .sheet {
        position: absolute;
        bottom: 0;
        width: var(--sn);
        height: var(--sn);
        scale: 1.04 1;
    }

    .left .sheet { left: min(0px, calc(50vw - var(--sn) / 2)); transform-origin: 100% 50%; }
    .right .sheet { right: min(0px, calc(50vw - var(--sn) / 2)); transform-origin: 0% 50%; }

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
