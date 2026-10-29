<script setup>
    // Evolución espiritual: a cell-planet crowned with ferns, eight glowing bulbs on stalks and four pink mushrooms, with a
    // little being curled up inside it. Built like Creatividad and Hogar: the layers of the artwork (public/assets/evolucion,
    // cropped from sheets of 3240px; evolucionScene.json gives each one's box in % of that square) lie on a square frame.
    // The crown turns slowly; the stalks and the mushrooms sway from where they hang. The glows are particles that turn
    // with the crown, behind everything: the stippled purple and pink rings of the original (density maps in
    // evolucionHalo.json) and a cloud of dots around each bulb and each mushroom, which flares when it is touched. The
    // colour is code: the interior is the drawn silhouette of the original disc (with the light of the water rippling
    // across it), the nucleus a disc with a fuzzy particle rim, the little blue buds plain discs. Inside, the watery
    // system (useCellWater): the organelles bob about and the being floats, bumping into them and into the wall of the cell.
    // It is drawn in WebGL (useLayerStage), like Hogar: the planet is a group of planes at one depth and the camera
    // slides with the pointer or the tilt; the fern fronds sway a little in the water. The touch targets are DOM
    // elements kept over the bulbs and mushrooms as the crown turns.
    // Its verb is Encender (ignite: charge and let go). Pressing and holding inside the cell charges the being with fire:
    // it glows, the water warms, and every CHARGE / 8 s one more of the unlit bulbs is ready (a note of the chord climbs
    // and that bulb glimmers). Let go and a ring of fire leaves the being, reaches the wall and lights the bulbs that were
    // ready; they stay lit, so short charges add up and one full charge lights the whole crown. With all eight lit the
    // crown is a beacon: the chord (B7) resolves to the one a fifth below (E, Kätus's note), the being stands a little
    // and the rulito is born over its head. Then the lights fade slowly and it can be played again.
    import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { createParallax } from '../../composables/useParallax.js';
    import { createLayerStage } from '../../composables/useLayerStage.js';
    import { startStardust } from '../../composables/useStardust.js';
    import { createCellWater } from '../../composables/useCellWater.js';
    import { createSparks } from '../../composables/useSparks.js';
    import { play } from '../../composables/useSound.js';
    import { sceneMilestone } from '../../analytics.js';
    import Rulito from '../Rulito.vue';
    import halos from '../../composables/evolucionHalo.json';
    import scene from '../../composables/evolucionScene.json';

    const props = defineProps({
        card: { type: Object, default: () => ({}) },
        active: Boolean
    });

    const root = ref(null);
    const canvas = ref(null);
    const hits = ref([]);
    const cellHit = ref(null);
    const rulito = ref(null);
    let stageEl = null;                     // the card's stage, where the name is lit from (--name-glow)
    let stage = null;
    let parallax = null;
    let sky = null;
    let glow = null;
    let front = null;
    let water = null;
    let last = null;
    let tilt = 0;
    let entered = false;
    let gone = false;
    const L = {};
    const els = {};
    const squashes = {};
    let F = { x: 0, y: 0, size: 1 };

    // The camera slides SLIDE px at the edge of a swipe; the planet moves 18px across and 10 up and down, as before
    const SLIDE = 50;
    const SLIDE_Y = 28;
    const PLANET_Z = 18 / (SLIDE + 18);

    const { cell: CELL, nucleus: NUC, swimmer: BEING, interior, fern, specks } = scene;
    const hex = (s) => parseInt(s, 16);

    // Glow groups: 0 and 1 the rings, then one for each bulb, then one for each mushroom
    const STALKS = scene.stalks.map((p, i) => ({ ...p, group: 2 + i, phase: i * 1.7, kind: 'bulb' }));
    const MUSHROOMS = scene.mushrooms.map((p, i) => ({ ...p, group: 2 + STALKS.length + i, phase: 3 + i * 2.3, kind: 'mushroom' }));
    const SWAYING = [...STALKS, ...MUSHROOMS].map((p) => ({ ...p, hitR: Math.max(p.glow.sigma * (p.kind === 'bulb' ? 260 : 220), 2.6) }));

    // The pieces that float in the water
    const FLOAT = [
        { id: 'motas', file: specks.file, box: specks.box, sway: 0.004, turn: 1 },
        ...scene.organelles.map((o) => ({ ...o, sway: 0.005, turn: 2, mass: o.circles.length > 3 ? 6 : 2 })),
    ];
    const BLUE = hex(scene.blue_color);

    // The planet's square (3240px in the artwork); on a wide screen smaller and lower, so the long fronds stay under the name
    const layout = (W, H) => {
        const wide = W >= H;
        const size = wide ? Math.min(1.06 * H, 1.28 * W) : Math.min(Math.max(1.55 * W, 0.7 * H), 1.7 * H);
        F = { x: W / 2 - size / 2, y: H / 2 - size / 2 + (wide ? 0.08 : 0.06) * H, size };
    };
    const inFrame = ([left, top, w, h]) => ({ left: F.x + left / 100 * F.size, top: F.y + top / 100 * F.size, w: w / 100 * F.size, h: h / 100 * F.size });
    const at = (fx, fy) => ({ x: F.x + fx * F.size, y: F.y + fy * F.size });

    // Density maps of the original stipple, back as particles (the grid's cells are in 3240px units)
    const decode = (cloud) => ({ ...cloud, bytes: Uint8Array.from(atob(cloud.data), (c) => c.charCodeAt(0)) });
    const cloudPoints = (grid, { dotUnits, floor, more, colors }) => () => {
        const k = F.size / 3240;
        const dot = Math.max(floor, dotUnits * k);
        const out = [];
        for (let row = 0; row < grid.rows; row++) {
            for (let col = 0; col < grid.cols; col++) {
                const v = grid.bytes[row * grid.cols + col] / 255 * grid.max;
                if (v < 0.02) continue;
                const wanted = v * (grid.cell * k) ** 2 / (Math.PI / 4 * dot * dot) * more;
                let n = Math.floor(wanted);
                if (Math.random() < wanted - n) n++;
                for (let i = 0; i < n; i++) {
                    out.push([F.x + (grid.x + (col + Math.random()) * grid.cell) * k, F.y + (grid.y + (row + Math.random()) * grid.cell) * k, dot * (0.7 + Math.random() * 0.7), colors[Math.floor(Math.random() * colors.length)]]);
                }
            }
        }
        return out;
    };
    // A cloud of dots thickest at its middle, as the glow of a bulb: as many as the original blob covered
    const glowPoints = (g) => () => {
        const w = F.size;
        const k = w / 3240;
        const dot = Math.max(1.6, 7 * k);
        const n = Math.min(900, Math.round(g.mass * k * k / (Math.PI / 4 * dot * dot) * 1.5));
        const gauss = () => Math.sqrt(-2 * Math.log(Math.random() + 1e-9)) * Math.cos(Math.random() * Math.PI * 2);
        return Array.from({ length: n }, () => [F.x + g.x * w + gauss() * g.sigma * w, F.y + g.y * w + gauss() * g.sigma * w, dot * (0.7 + Math.random() * 0.8)]);
    };
    const rimPoints = cloudPoints(decode(NUC.rim), { dotUnits: 6, floor: 1.3, more: 1.8, colors: [hex(NUC.color)] });

    // The interior: the silhouette of the original disc, drawn once (per size) on a canvas shown as a texture
    const interiorCanvas = document.createElement('canvas');
    const INTERIOR = [CELL.x - CELL.r - 0.012, CELL.y - CELL.r - 0.012, 2 * CELL.r + 0.024];
    const drawInterior = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const px = Math.round(INTERIOR[2] * F.size * dpr);
        interiorCanvas.width = interiorCanvas.height = px;
        const ctx = interiorCanvas.getContext('2d');
        const k = px / (INTERIOR[2] * 3240);
        ctx.setTransform(k, 0, 0, k, -INTERIOR[0] * 3240 * k, -INTERIOR[1] * 3240 * k);
        ctx.fillStyle = '#' + interior.color;
        ctx.fill(new Path2D(interior.path));
    };

    // Touching a bulb or a mushroom: its glow flares, it squashes a little and sparks fly out
    const sparks = createSparks(480);
    const touch = (p) => (event) => {
        const box = event.currentTarget.getBoundingClientRect();
        const area = canvas.value.getBoundingClientRect();
        const bulb = p.kind === 'bulb';
        sparks.burst(box.left + box.width / 2 - area.left, box.top + box.height / 2 - area.top, {
            n: 28, colors: bulb ? [0xffb069, 0xff9a5c, 0xffd29a, 0xfff3d6] : [0xe94b7d, 0xff7aa5, 0xffb3cb, 0xffffff], speed: 120, life: 2.6, size: 4.8, spread: 8,
        });
        squashes[p.id] = last ?? 0;
        glow?.boost(p.group, 1.6);
        play(bulb ? 'star' : 'tap');
    };
    const warm = (p) => () => glow?.boost(p.group, 0.5);
    const onKey = (p) => (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        touch(p)(event);
    };
    // The squash of a touched piece over 0.7s: wider and lower, then taller, then itself
    const SQUASH = [[0, 1, 1], [1 / 3, 1.16, 0.88], [2 / 3, 0.96, 1.08], [1, 1, 1]];
    const squashAt = (p) => {
        const k = Math.min(1, Math.max(0, p));
        for (let i = 1; i < SQUASH.length; i++) {
            if (k <= SQUASH[i][0]) {
                const [a0, ax, ay] = SQUASH[i - 1], [b0, bx, by] = SQUASH[i];
                const f = 1 - (1 - (k - a0) / (b0 - a0)) ** 2;
                return [ax + (bx - ax) * f, ay + (by - ay) * f];
            }
        }
        return [1, 1];
    };

    /* ---------- Encender: charge the being with fire and let it go to light the crown ---------- */

    const CHARGE = 2.6;                     // seconds of holding for the whole crown
    const PER = CHARGE / STALKS.length;     // and for each bulb
    const RING = 0.6;                       // seconds the ring of fire takes from the being to the wall
    const STEP = 0.09;                      // seconds between one bulb catching and the next
    const DELAY = 1.1, GROW = 2.2, LINGER = 2.4, EAT = 3.4;     // the rulito: after the chord resolves, born, kept, gone
    const FIRE = [0xffb069, 0xff9a5c, 0xffd29a, 0xfff3d6, 0xf2b036];
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const on = STALKS.map(() => false);     // lit for good, until the crown is done
    const lit = STALKS.map(() => 0);        // the light of each bulb, eased
    const pre = STALKS.map(() => 0);        // a glimmer: this one is ready to catch
    let glyph = null;
    let held = false;
    let heldFor = 0;
    let order = [];                         // the unlit bulbs at the moment of pressing, nearest to the being first
    let ready = 0;                          // how many of them the charge will light
    let charge = 0;                         // the being's fire, eased
    let ring = null;                        // the fire on its way: { age, level, targets, done }
    let win = null;                         // the crown is lit: { age, head, tail, full, fullAt, back, pop }
    let wins = 0;
    let beacon = 0;
    let stand = 0;                          // the being uncurls a little while the crown is lit
    let idle = 0;
    let hint = 0;
    let embers = 0;                         // seconds since the last ember left the being while charging
    const geo = { cx: 0, cy: 0, R: 1, sx: 0, sy: 0 };   // on the canvas: the cell's centre and radius, the being

    const centreOf = (p) => L.crown.toScreen(F.x + p.glow.x * F.size, F.y + p.glow.y * F.size);
    const measure = () => {
        const c = L.planet.toScreen(F.x + CELL.x * F.size, F.y + CELL.y * F.size);
        const e = L.planet.toScreen(F.x + (CELL.x + CELL.r) * F.size, F.y + CELL.y * F.size);
        const b = at(BEING.x, BEING.y);
        const me = L.being.toScreen(b.x, b.y);
        Object.assign(geo, { cx: c.x, cy: c.y, R: Math.hypot(e.x - c.x, e.y - c.y), sx: me.x, sy: me.y });
    };

    // Pressing inside the cell: the being starts to gather fire
    const press = () => {
        if (held) return;
        idle = 0;
        window.addEventListener('pointerup', letGo);
        window.addEventListener('pointercancel', letGo);
        held = true;
        heldFor = 0;
        ready = 0;
        if (win || ring) { order = []; return; }
        measure();
        order = STALKS.map((p, i) => i).filter((i) => !on[i])
            .sort((a, b) => { const A = centreOf(STALKS[a]), B = centreOf(STALKS[b]); return Math.hypot(A.x - geo.sx, A.y - geo.sy) - Math.hypot(B.x - geo.sx, B.y - geo.sy); });
        play('tap');
    };
    // Letting go: the fire leaves the being as a ring, and the bulbs that were ready catch when it reaches the wall
    const letGo = () => {
        if (!held) return;
        held = false;
        window.removeEventListener('pointerup', letGo);
        window.removeEventListener('pointercancel', letGo);
        if (!order.length) { glow?.boost(0, 0.6); return; }
        const level = Math.min(1, heldFor / (order.length * PER));
        ring = { age: 0, level, targets: order.slice(0, ready), done: 0 };
        order = [];
        play('ignite', level);
        if (!reduced) sparks.burst(geo.sx, geo.sy, { n: Math.round(10 + 30 * level), colors: FIRE, speed: 90 + 90 * level, life: 1.6, size: 4.5, spread: 6 });
    };
    const onKeyDown = (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        if (!event.repeat) press();
    };
    const onKeyUp = (event) => {
        if (event.key === 'Enter' || event.key === ' ') letGo();
    };

    // A bulb catches the fire
    const catchFire = (i) => {
        on[i] = true;
        pre[i] = 0;
        const n = on.filter(Boolean).length;
        const c = centreOf(STALKS[i]);
        sparks.burst(c.x, c.y, { n: 26, colors: FIRE, speed: 110, life: 2.2, size: 4.8, spread: 6 });
        glow?.boost(STALKS[i].group, 1.4);
        squashes[STALKS[i].id] = last ?? 0;
        play('link', { from: (n - 1) / STALKS.length, to: n / STALKS.length, level: 0.9 });
    };

    // Every bulb is lit: the crown is a beacon, the chord resolves, and the rulito is born over the being's head
    const crown = () => {
        wins += 1;
        win = { age: 0, head: 0, tail: 0, full: false, fullAt: 0, back: false, pop: 0 };
        rulito.value?.reshape();
        glow?.boost(0, 1.6);
        glow?.boost(1, 1.6);
        sparks.burst(geo.sx, geo.sy, { n: 50, colors: FIRE, speed: 160, life: 2.4, size: 5, spread: 8 });
        play('resolve');
        sceneMilestone('crown_lit', { times: wins });
    };

    // The ring of fire, as particles: it widens from the being and, where it meets the wall of the cell, it stays on it
    const RING_N = 160;
    const ringAngle = Float32Array.from({ length: RING_N }, (_, i) => (i + Math.random() * 0.7) / RING_N * Math.PI * 2);
    const ringSize = Float32Array.from({ length: RING_N }, () => 0.7 + Math.random() * 0.7);
    const ringTint = new Float32Array(RING_N * 3);
    ringAngle.forEach((_, i) => { const c = FIRE[i % FIRE.length]; ringTint.set([(c >> 16 & 255) / 255, (c >> 8 & 255) / 255, (c & 255) / 255], i * 3); });
    const ringGroup = {
        colors: [0xffffff], parallax: 0, drift: 0, twinkle: 0, reach: 0, look: 'hard',
        dynamic: {
            count: RING_N,
            update(t, data) {
                if (!ring || ring.age >= RING + 0.6) { data.alphas.fill(0); return; }
                const k = Math.min(1, ring.age / RING);
                const far = Math.hypot(geo.sx - geo.cx, geo.sy - geo.cy) + geo.R;
                const r = (1 - (1 - k) ** 2) * far;
                const fade = (0.45 + 0.55 * ring.level) * (k < 1 ? Math.min(1, ring.age / 0.08) : 1 - (ring.age - RING) / 0.6);
                for (let i = 0; i < RING_N; i++) {
                    let x = geo.sx + Math.cos(ringAngle[i]) * r, y = geo.sy + Math.sin(ringAngle[i]) * r;
                    const d = Math.hypot(x - geo.cx, y - geo.cy);
                    if (d > geo.R) { x = geo.cx + (x - geo.cx) / d * geo.R; y = geo.cy + (y - geo.cy) / d * geo.R; }
                    data.positions[i * 3] = x;
                    data.positions[i * 3 + 1] = y;
                    data.sizes[i] = (3 + 3 * ring.level) * ringSize[i];
                    data.alphas[i] = Math.max(0, fade);
                }
                data.tints.set(ringTint);
            },
        },
    };

    // Every frame: the charge, the ring, the lights, the beacon and the rulito
    const play_ = (t, dt) => {
        measure();
        idle += dt;
        if (held && order.length) {
            heldFor += dt;
            const n = Math.min(order.length, Math.floor(heldFor / PER));
            while (ready < n) {
                pre[order[ready]] = 1;
                ready += 1;
                play('kindle', { step: (STALKS.length - order.length + ready) / STALKS.length });
            }
        }
        const fill = held && order.length ? Math.min(1, 0.2 + heldFor / (order.length * PER)) : 0;
        charge += (fill - charge) * Math.min(1, dt * (fill > charge ? 8 : 5));
        // While it gathers, embers rise from the being, more and bigger as the charge grows
        embers += dt;
        if (fill > 0 && !reduced && embers > 0.12 - 0.08 * charge) {
            embers = 0;
            sparks.burst(geo.sx, geo.sy, { n: 2, colors: FIRE, speed: 25 + 40 * charge, life: 1.1, size: 3 + 2.5 * charge, spread: 14 });
        }
        // The bulbs that are ready keep glimmering while the charge is held
        for (let i = 0; i < ready; i++) if (held && order[i] !== undefined) pre[order[i]] = Math.max(pre[order[i]], 0.6 + 0.4 * Math.sin(t * 9 + i));
        if (ring) {
            ring.age += dt;
            while (ring.done < ring.targets.length && ring.age >= RING + ring.done * STEP) catchFire(ring.targets[ring.done++]);
            if (ring.age >= RING + 0.6 && ring.done >= ring.targets.length) {
                ring = null;
                if (on.every(Boolean) && !win) crown();
            }
        }
        // The hint, without words: after a while with nothing touched, the being's fire beats once
        if (!held && !win && !ring && idle > 8) { idle = 0; hint = 1; glow?.boost(0, 0.4); }
        hint = Math.max(0, hint - dt * 1.4);
        // The rulito: born after the chord has resolved, kept a while, then its tail catches its head and the lights fade
        let named = 0;
        if (win && rulito.value) {
            win.age += dt;
            win.pop = Math.max(0, win.pop - dt * 2.2);
            win.head = 1 - (1 - Math.min(1, Math.max(0, (win.age - DELAY) / GROW))) ** 1.6;
            if (win.head >= 1 && !win.full) { win.full = true; win.fullAt = win.age; win.pop = 1; play('rulito'); }
            if (win.full && !win.back && win.age - win.fullAt > LINGER) { win.back = true; on.fill(false); }
            if (win.back) win.tail = Math.min(1, win.tail + dt / EAT);
            const whole = Math.min(1, Math.max(0, (win.head - win.tail - 0.6) / 0.4));
            named = Math.max(win.pop, 0.8 * whole * whole * (3 - 2 * whole));
            const flare = win.full && win.head - win.tail > 0.9 ? Math.max(win.pop, Math.sin(t * 4) * 0.5 + 0.5) : 0;
            rulito.value.frame({ head: win.head, tail: win.tail, flare, t, fade: Math.min(1, (win.head - win.tail) * 14), width: glyph.w });
            L.rulito.refresh();
            L.rulito.scale = 1 + 0.2 * win.pop * win.pop;
            if (win.back && win.tail >= 1) {
                win = null;
                rulito.value.frame({ width: glyph.w });
                L.rulito.refresh();
            }
        }
        beacon += ((win && !win.back ? 1 : 0) - beacon) * Math.min(1, dt * (win && !win.back ? 2 : 0.8));
        stand += ((win && !win.back ? 1 : 0) - stand) * Math.min(1, dt * 1.5);
        stageEl?.style.setProperty('--name-glow', named.toFixed(3));
        stage.bloom = Math.max(named, 0.45 * charge, 0.5 * beacon);
        // The bulbs: lit they glow warm (and their dots flare a little), ready they glimmer
        STALKS.forEach((p, i) => {
            lit[i] += ((on[i] ? 1 : 0) - lit[i]) * Math.min(1, dt * (on[i] ? 6 : 0.7 + i * 0.08));
            if (!held || !order.includes(i)) pre[i] = Math.max(0, pre[i] - dt * 3);
            const breath = 0.8 + 0.2 * Math.sin(t * 2.2 + p.phase);
            L['lit-' + p.id].opacity = Math.min(1, lit[i] * breath * (1 + 0.3 * beacon) + pre[i] * 0.45);
            els[p.id].uniforms.uBright.value = 1 + 0.32 * lit[i] + 0.25 * pre[i];
            if (lit[i] > 0.05) glow?.boost(p.group, 0.5 * lit[i]);
        });
        // The being's fire and the warmth of the water
        L.fire.opacity = Math.min(1, 1.3 * charge * (0.85 + 0.15 * Math.sin(t * 7)) + hint * 0.6 + beacon * 0.55);
        L.fire.scale = 0.7 + 0.7 * charge + 0.3 * hint + 0.25 * beacon;
        L.being.uniforms.uBright.value = 1 + 0.45 * charge + 0.15 * beacon;
        L.interior.uniforms.uTintAmount.value = 0.16 * charge + 0.12 * beacon;
        L.beacon.opacity = beacon * (0.75 + 0.25 * Math.sin(t * 1.6));
        if (beacon > 0.05) { glow?.boost(0, 0.7 * beacon); glow?.boost(1, 0.7 * beacon); }
        L.beacon.scale = 0.92 + 0.08 * beacon + 0.03 * Math.sin(t * 1.6);
    };

    const build = (s) => {
        const planetDepth = s.depth(PLANET_Z);
        L.planet = planetDepth.group();
        // Behind the cell: the beacon, the light of the whole crown when every bulb is lit
        L.beacon = L.planet.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: [1, 0.78, 0.42], stops: [[0, 0.7], [0.3, 0.45], [0.66, 0]], bloom: true });
        L.beacon.opacity = 0;
        L.interior = L.planet.canvas(interiorCanvas, { water: 1 });
        L.nucleus = L.planet.disc({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: hex(NUC.color) });
        FLOAT.forEach((p) => { els[p.id] = L.planet.image(`/assets/evolucion/${p.file}.webp`, { shimmer: 0.6 }); });
        // The being's fire, behind it, and the rulito over its head
        L.fire = L.planet.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: [1, 0.74, 0.35], stops: [[0, 0.75], [0.3, 0.32], [0.62, 0]], bloom: true });
        L.fire.opacity = 0;
        L.being = L.planet.image('/assets/evolucion/bebe.webp', { bloom: true });
        L.rulito = L.planet.canvas(rulito.value.canvas, { bloom: true });
        L.crown = L.planet.group();
        L.buds = scene.blue.map(() => L.crown.disc({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: BLUE }));
        // A warm light behind each bulb, seen when it is lit (it turns with the crown)
        STALKS.forEach((p) => {
            L['lit-' + p.id] = L.crown.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: [1, 0.72, 0.38], stops: [[0, 0.8], [0.3, 0.35], [0.62, 0]], bloom: true });
            L['lit-' + p.id].opacity = 0;
        });
        SWAYING.forEach((p) => { els[p.id] = L.crown.image(`/assets/evolucion/${p.file}.webp`, { bloom: p.kind === 'bulb' }); });
        L.fern = L.crown.image('/assets/evolucion/fronda.webp', { wind: { amp: 3, speed: 0.7, root: 'top' }, segments: [20, 20] });
        L.planet.enter({ y: 60, scale: 0.7, duration: 2200 });
        L.being.enter({ y: 0, scale: 0.4, delay: 1200, duration: 1600 });
    };

    const place = (W, H) => {
        layout(W, H);
        drawInterior();
        L.interior.refresh();
        L.planet.pivot = at(CELL.x, CELL.y);
        L.interior.place({ left: F.x + INTERIOR[0] * F.size, top: F.y + INTERIOR[1] * F.size, w: INTERIOR[2] * F.size, h: INTERIOR[2] * F.size });
        L.nucleus.place({ left: F.x + (NUC.x - NUC.r) * F.size, top: F.y + (NUC.y - NUC.r) * F.size, w: 2 * NUC.r * F.size, h: 2 * NUC.r * F.size });
        FLOAT.forEach((p) => els[p.id].place(inFrame(p.box)));
        L.being.place(inFrame(BEING.box));
        const beacon = 2 * CELL.r * 3;
        L.beacon.place(inFrame([(CELL.x - beacon / 2) * 100, (CELL.y - beacon / 2) * 100, beacon * 100, beacon * 100]));
        const fire = BEING.r * 9;
        L.fire.place(inFrame([(BEING.x - fire / 2) * 100, (BEING.y - fire / 2) * 100, fire * 100, fire * 100]));
        // The rulito over the being's head (its canvas is bigger than the glyph, for the glow, as in Paciencia)
        const [bx, by, bw] = BEING.box;
        const rw = bw * 0.5, rh = rw * 86 / 32;
        glyph = inFrame([bx + bw * 0.5 - rw / 2, by - 1.6 - rh, rw, rh]);
        L.rulito.place({ left: glyph.left - 0.4375 * glyph.w, top: glyph.top - 0.1628 * glyph.h, w: glyph.w * 1.875, h: glyph.h * 1.3256 },
            { x: glyph.left + glyph.w / 2, y: glyph.top + glyph.h });
        STALKS.forEach((p) => {
            const d = p.glow.sigma * 11;
            L['lit-' + p.id].place(inFrame([(p.glow.x - d / 2) * 100, (p.glow.y - d / 2) * 100, d * 100, d * 100]));
        });
        L.crown.pivot = at(CELL.x, CELL.y);
        scene.blue.forEach(([x, y, r], i) => L.buds[i].place(inFrame([x - r, y - r, 2 * r, 2 * r])));
        SWAYING.forEach((p) => {
            const box = inFrame(p.box);
            els[p.id].place(box, { x: box.left + p.origin[0] / 100 * box.w, y: box.top + p.origin[1] / 100 * box.h });
        });
        L.fern.place(inFrame(fern.box));
    };

    const placeHits = () => {
        if (cellHit.value) {
            const d = 2 * geo.R * 0.9;
            cellHit.value.style.translate = `${(geo.cx - d / 2).toFixed(1)}px ${(geo.cy - d / 2).toFixed(1)}px`;
            cellHit.value.style.width = cellHit.value.style.height = `${d.toFixed(1)}px`;
        }
        hits.value.forEach((el, i) => {
            if (!el) return;
            const p = SWAYING[i];
            const c = L.crown.toScreen(F.x + p.glow.x * F.size, F.y + p.glow.y * F.size);
            const d = 2 * p.hitR / 100 * F.size * L.planet.scale;
            el.style.translate = `${(c.x - d / 2).toFixed(1)}px ${(c.y - d / 2).toFixed(1)}px`;
            el.style.width = el.style.height = `${d.toFixed(1)}px`;
        });
    };

    const enter = () => {
        if (entered || !props.active || !stage) return;
        entered = true;
        stage.ready().then(() => { if (!gone) stage.start(); });
    };

    let frames = 0;
    const frame = ({ x, y, scroll, t, ramp }) => {
        if (!stage) return;
        const s = scroll;
        stage.look(x * SLIDE, y * SLIDE_Y);
        // The planet hangs, breathing; the crown and its glows turn together
        const py = Math.sin(t * 0.5) * 6 * ramp - s * 50;
        L.planet.y = py;
        L.planet.scale = 1 + Math.sin(t * 0.7) * 0.012 * ramp;
        const turn = t * 1.4 * ramp;
        L.crown.rotate = turn;
        // Each stalk sways from where it hangs, the mushrooms less; a touched one squashes
        SWAYING.forEach((p) => {
            const node = els[p.id];
            node.rotate = Math.sin(t * (p.kind === 'bulb' ? 0.9 : 0.6) + p.phase) * (p.kind === 'bulb' ? 3.4 : 2) * ramp;
            if (squashes[p.id] === undefined) return;
            [node.sx, node.sy] = squashAt((t - squashes[p.id]) / 0.7);
            if (t - squashes[p.id] > 0.7) delete squashes[p.id];
        });
        // The water: everything inside floats, and the being bumps into it
        const dt = last === null ? 0 : t - last;
        last = t;
        water.step(dt * ramp, t);
        FLOAT.forEach((p) => {
            const o = water.offset(p.id);
            const node = els[p.id];
            node.x = o.x * F.size;
            node.y = o.y * F.size;
            node.rotate = Math.sin(t * 0.15 + p.sway * 900) * p.turn * ramp + o.x * 120;
        });
        const n = water.offset('nucleus');
        L.nucleus.x = n.x * F.size;
        L.nucleus.y = n.y * F.size;
        // The particles follow the planet: the glows turn with the crown, the nucleus's rim sways with it
        const drift = stage.drift(PLANET_Z);
        const centre = at(CELL.x, CELL.y);
        for (let i = 0; i < 2 + SWAYING.length; i++) {
            glow?.turn(i, turn, centre.x, centre.y);
            glow?.shift(i, drift.x, drift.y + py);
        }
        front?.shift(0, drift.x + n.x * F.size, drift.y + py + n.y * F.size);
        // The being floats, curled up, leaning into its way; a knock makes it squash a little
        const me = water.swimmer;
        tilt += (Math.max(-1, Math.min(1, me.vx / 0.012)) * 12 - tilt) * Math.min(1, dt * 1.5);
        L.being.x = (me.x - BEING.x) * F.size;
        L.being.y = ((me.y - BEING.y) + Math.sin(t * 0.9) * 0.0025) * F.size;
        L.being.rotate = tilt + Math.sin(t * 0.6) * 3 * ramp;
        const squash = 1 + Math.min(me.hit, 0.3) * 0.12;
        L.being.sx = (1 + Math.sin(t * 1.3) * 0.012 * ramp) * squash * (1 - 0.03 * stand);
        L.being.sy = (1 - Math.sin(t * 1.3) * 0.015 * ramp) / squash * (1 + 0.09 * stand);
        L.being.rotate *= 1 - 0.7 * stand;
        // Its fire and its rulito go with it
        L.fire.x = L.rulito.x = L.being.x;
        L.fire.y = L.rulito.y = L.being.y;
        L.rulito.rotate = L.being.rotate * 0.5 + Math.sin(t * 1.8) * 3 * ramp;
        play_(t, Math.min(dt, 0.1));
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
        water = createCellWater({
            bounds: { x: CELL.x, y: CELL.y, r: CELL.r - 0.004 },
            swimmer: { x: BEING.x, y: BEING.y, r: BEING.r },
            bodies: [
                { id: 'nucleus', circles: [[NUC.x, NUC.y, NUC.r]], mass: 12, sway: 0.004 },
                ...FLOAT.map(({ id, circles = [], mass, sway }) => ({ id, circles, mass, sway })),
            ],
        });
        // The layers and their layout first, so the particles measured on them are made again after them on a resize
        build(stage);
        L.interior.uniforms.uTint.value.setRGB(0.96, 0.6, 0.32);
        stage.onResize((W, H) => place(W, H));
        sky = startStardust(null, {
            stage,
            groups: [{
                count: 170, colors: [0x72546e, 0x7d5e75, 0x5a243d], size: [2, 5.5],
                drift: 6, twinkle: 0.4, reach: 120, push: 30, parallax: 10, opacity: 0.8, order: -20,
            }],
        });
        // Behind the planet, turning with the crown: the rings and the glows of the bulbs and mushrooms
        const still = { look: 'hard', parallax: 0, reach: 0 };
        glow = startStardust(null, {
            stage,
            groups: [
                { ...still, points: cloudPoints(decode(halos.purple), { dotUnits: 8, floor: 1.5, more: 2.2, colors: [hex(halos.purple.color)] }), drift: 5, jitter: 0.8, twinkle: 0.35, order: -10 },
                { ...still, points: cloudPoints(decode(halos.pink), { dotUnits: 8, floor: 1.5, more: 2.2, colors: [hex(halos.pink.color)] }), drift: 5, jitter: 0.8, twinkle: 0.35, order: -9 },
                ...SWAYING.map((p, i) => ({ ...still, points: glowPoints(p.glow), colors: [hex(p.glow.color)], drift: 3, jitter: 1.1, twinkle: 0.3, order: -8 + i * 0.01 })),
            ],
        });
        front = startStardust(null, {
            stage,
            groups: [
                { points: rimPoints, look: 'hard', drift: 2, jitter: 0.5, twinkle: 0.1, reach: 0, parallax: 0, order: L.nucleus.mesh.renderOrder + 0.5 },
                { ...ringGroup, order: 1e6 - 1 },
                { ...sparks.group(), order: 1e6 },
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
        sky?.destroy();
        glow?.destroy();
        front?.destroy();
        stage?.destroy();
        stageEl?.style.removeProperty('--name-glow');
        window.removeEventListener('pointerup', letGo);
        window.removeEventListener('pointercancel', letGo);
    });
</script>

<template>
    <div class="scene" ref="root">
        <canvas class="stageCanvas" ref="canvas"></canvas>
        <!-- The rulito is drawn on its own canvas, which the stage shows as a texture over the being's head -->
        <Rulito ref="rulito" class="offstage" color="#f2b036" />
        <div ref="cellHit" class="hit cell" role="button" tabindex="0"
            :aria-label="$i18n.locale === 'en' ? 'Hold to gather fire, let go to light the crown' : 'Mantené para juntar fuego, soltá para encender la corona'"
            @pointerdown.prevent="press" @keydown="onKeyDown" @keyup="onKeyUp" @blur="letGo"></div>
        <div v-for="(p, i) in SWAYING" :key="'hit' + p.id" :ref="(el) => { hits[i] = el; }" class="hit" role="button" tabindex="-1"
            :aria-label="p.kind === 'bulb' ? ($i18n.locale === 'en' ? 'Glowing bulb' : 'Bulbo luminoso') : ($i18n.locale === 'en' ? 'Mushroom' : 'Hongo')"
            @pointerdown.prevent="touch(p)($event)" @pointerenter="warm(p)()" @keydown="onKey(p)($event)"></div>
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

    .hit {
        position: absolute;
        left: 0;
        top: 0;
        width: 0;
        height: 0;
        border-radius: 50%;
        cursor: pointer;
        pointer-events: auto;
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;
        outline: none;
    }

    .hit.cell {
        -webkit-touch-callout: none;
        user-select: none;
        -webkit-user-select: none;
    }

    .offstage {
        position: absolute;
        left: -9999px;
        top: 0;
        width: 40px;
        visibility: hidden;
    }

    .hit:focus-visible {
        outline: 2px solid rgba(255, 255, 255, 0.85);
        outline-offset: 2px;
    }
</style>
