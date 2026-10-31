<script setup>
    // Honestidad: honesty, "I am honest with myself and the truth guides my steps". Deep in a teal sea a jellyfish
    // meditates with its eyes closed, a blue aura round its bell, and from the light at the surface two strands of golden
    // dots come down, twisting round each other, to the point of light on its forehead: the truth heard inside. Bubbles
    // hang in the water; on the floor, between two dark seaweeds, two teal corals, two yellow anemones in blue pots and a
    // pink coral in the middle.
    // No game yet (its verb will be Resonar as an echo). It is alive: the jellyfish swims in place, its bell squeezing
    // now and then and its tentacles trailing and swaying (wind, from the top), rising a little with each stroke and
    // sinking back; its aura breathes with it; a light runs down the thread from the surface to its third eye every few
    // seconds and the eye glows as it arrives. The bubbles bob and wobble, the seaweeds, corals and anemones sway in the
    // current, the specks of the water rise slowly and move out of a finger's way. A touch strums the chord (`star`), the
    // stipple flares and the bubbles near it wobble; a touch on the jellyfish makes it swim a stroke and sends a light down
    // the thread.
    // The water is not a picture: its colour read from the card by the converter, with the light of the water (caustics)
    // drifting across it; nor is the light at the surface, a disc drawn in code with a glow, its stippled edge live
    // particles. The thread, the aura, the specks of the water and the stipple round the seaweeds and anemones are
    // particles too. Drawn in WebGL (useLayerStage): the bubbles (one atlas), the jellyfish and the floor are planes at
    // their depths; on a wide screen the floor goes on past the frame with more seaweed and coral, smaller and farther
    // back. From honestidadScene.json and public/assets/honestidad (made by scripts/convert-honestidad.mjs).
    import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { floorFor } from '../../data/stageFloor.js';
    import { createParallax } from '../../composables/useParallax.js';
    import { createLayerStage } from '../../composables/useLayerStage.js';
    import { startStardust } from '../../composables/useStardust.js';
    import { play } from '../../composables/useSound.js';
    import art from '../../composables/honestidadScene.json';

    const props = defineProps({
        card: { type: Object, default: () => ({}) },
        active: Boolean
    });

    const root = ref(null);
    const canvas = ref(null);
    const jellyHit = ref(null);
    let stageEl = null;
    let stage = null;
    let parallax = null;
    let dust = null;
    let entered = false;
    let gone = false;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ---- Layout: the illustration is a 2160 square resting on the bottom of the screen (a little of it under the
    // edge, so the floor never shows a gap as the camera moves). On a phone upright it is as big as the corals allow
    // across; on a wide screen the light at the surface keeps under the card's name (both are yellow), and the floor goes
    // on past the frame on both sides
    const SIZE = art.size;
    const B = art.boxes;
    const SUN = art.sun;
    const EYE = art.eye;
    let F = { x: 0, y: 0, size: 1 };
    const k = () => F.size / SIZE;
    const sx = (x) => F.x + x * k();
    const sy = (y) => F.y + y * k();
    const rectOf = ([left, top, w, h]) => ({ left: sx(left), top: sy(top), w: w * k(), h: h * k() });
    const SPAN = 1500;                      // art px across that must be seen on a phone (most of the two teal corals)
    const DROP = 0.02;                      // how much of the frame goes under the bottom of the screen
    const SUN_TOP = SUN.r + 70;             // how far above the sun's centre its stipple and glow reach (art px)
    const layout = (w, h) => {
        const phone = w < h;
        let size;
        if (phone) size = Math.min(0.72 * h, w * SIZE / SPAN);
        else {
            // As big as fits between the name (with the whole sun under it) and the bottom
            const room = h - titleBottom(h) - 10;
            size = Math.min(Math.max(0.62 * w, 0.55 * h), 0.9 * h, room / (1 - DROP + (SUN_TOP - SUN.y) / SIZE));
        }
        F = { x: w / 2 - size / 2, y: h - floorFor(w, h) - size * (1 - DROP), size };
    };

    // Where the card's name ends (the stage's h1, over the scene)
    const titleBottom = (h) => {
        const title = stageEl?.querySelector('h1');
        if (!title || !root.value) return 0.19 * h;
        return title.getBoundingClientRect().bottom - root.value.getBoundingClientRect().top;
    };

    const SLIDE = 50;
    const SLIDE_Y = 14;
    const zFor = (amp) => amp / (SLIDE + amp);
    const DEPTH = { water: 1, sun: 4, bubbles: [7, 11, 15], jelly: 13, beyond: 18, seaweed: 22, corals: 26, anemones: 30, coral: 33 };

    const SUN_YELLOW = SUN.color;
    const THREAD = 0xffe47c;
    const AURA = 0x00b4d7;
    const DUST = 0x0a9a8a;
    const INK = 0x132c3d;
    const WATER = art.water[Math.floor(art.water.length / 2)][1];
    const ease = (p) => p * p * (3 - 2 * p);

    // ---- The bubbles: cut out of the illustration (one atlas), each at its own depth, bobbing and wobbling
    const [AW, AH] = art.atlas;
    const bubbles = art.bubbles.map(([x, y, w, h, ax, ay], i) => ({
        i, box: [x, y, w, h], crop: [ax / AW, ay / AH, w / AW, h / AH], depth: i % 3, phase: i * 1.7 + 0.4, wobble: 0,
    }));

    // ---- The floor beyond the frame on a wide screen: more seaweed and teal coral, smaller and farther back, so it
    // does not read as the frame mirrored. [picture, mirrored, scale, overlap with the previous one (fraction of its width)]
    const BEYOND = [['coralR', false, 0.8, 0.3], ['seaweed', true, 0.8, 0.45], ['coralL', true, 0.66, 0.2], ['seaweed', false, 0.68, 0.45],
        ['coralR', true, 0.74, 0.2], ['seaweed', true, 0.76, 0.45]];

    // ---- The jellyfish swims in place: a stroke every STROKE s (its bell squeezes, it rises a little and sinks back)
    const STROKE = 5.2;
    const THREAD_EVERY = 7;                 // a light runs down the thread this often (s)
    const RUN = 2.4;                        // how long it takes to come down (s)
    let strokeAt = 0.8;                     // when the last stroke began
    let runAt = 2.5;                        // when the last light began to come down
    let eyeFlash = 0;
    let lastT = 0;
    let now = 0;
    const L = {};

    const stroke = (t) => {
        const p = Math.max(0, t - strokeAt) / STROKE;
        if (p >= 1) return 0;
        // Quick to squeeze, slow to open again
        return p < 0.16 ? Math.sin(p / 0.16 * Math.PI / 2) : 1 - ease((p - 0.16) / 0.84);
    };
    const rise = (t) => {
        const p = Math.max(0, t - strokeAt) / STROKE;
        return p >= 1 ? 0 : Math.sin(Math.min(1, p * 1.3) * Math.PI) ** 2;
    };

    // A touch on the water: the chord, the stipple flares and the bubbles near the finger wobble
    const strum = (event) => {
        play('star');
        dust?.boost(0, 0.7);
        dust?.boost(3, 0.6);
        dust?.boost(4, 0.8);
        if (!L.bubbles || !canvas.value) return;
        const area = canvas.value.getBoundingClientRect();
        const fx = event.clientX - area.left, fy = event.clientY - area.top;
        bubbles.forEach((b) => {
            const [x, y, w, h] = b.box;
            const c = L.bubbles[b.i].toScreen(sx(x + w / 2), sy(y + h / 2));
            const d = Math.hypot(c.x - fx, c.y - fy);
            if (d < Math.max(90, w * k() * 3)) b.wobble = 1 - d / Math.max(90, w * k() * 3) * 0.5;
        });
    };
    // A touch on the jellyfish: a stroke and a light down the thread
    const swim = () => {
        play('star');
        if (reduced) return;
        if (now - strokeAt > STROKE * 0.45) strokeAt = now;
        if (now - runAt > RUN * 0.6) runAt = now;
        dust?.boost(1, 0.8);
        dust?.boost(2, 0.9);
    };
    const onKey = (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        swim();
    };

    // The thread of light, as a group of its own: each dot where the card draws it, carried from the sun at the top to
    // the jellyfish at the bottom, swaying a little, with a light that runs down it now and then
    const THREAD_N = art.thread.length + 1;
    const sunY = art.thread[0][1], eyeY = EYE[1];
    const threadGroup = {
        count: THREAD_N,
        update(t, data) {
            // Where the sun and the eye are now against where they rest (the camera, the strokes)
            const top = L.sunNode.toScreen(sx(SUN.x), sy(SUN.y)), eye = L.jelly.toScreen(sx(EYE[0]), sy(EYE[1]));
            const sunOff = { x: top.x - sx(SUN.x), y: top.y - sy(SUN.y) }, jellyOff = { x: eye.x - sx(EYE[0]), y: eye.y - sy(EYE[1]) };
            const run = (t - runAt) / RUN;
            for (let i = 0; i < THREAD_N; i++) {
                const [ax, ay, r] = i < THREAD_N - 1 ? art.thread[i] : EYE;
                const u = Math.min(1, Math.max(0, (ay - sunY) / (eyeY - sunY)));
                const sway = reduced ? 0 : Math.sin(t * 0.9 + ay * 0.012) * 6 * k() * Math.sin(u * Math.PI);
                data.positions[i * 3] = sx(ax) + sway + sunOff.x + (jellyOff.x - sunOff.x) * u;
                data.positions[i * 3 + 1] = sy(ay) + sunOff.y + (jellyOff.y - sunOff.y) * u;
                const light = run >= 0 && run < 1.2 ? Math.exp(-(((u - run) / 0.09) ** 2)) : 0;
                const eye = i === THREAD_N - 1;
                data.sizes[i] = Math.max(1.8, 2.3 * r * k()) * (1 + 0.6 * light + (eye ? 0.5 * eyeFlash : 0));
                data.alphas[i] = Math.min(1, 0.82 + 0.1 * Math.sin(t * 2 + i) + 0.4 * light);
                data.tints.set([1, 0.89 + 0.1 * light, 0.49 + 0.45 * light], i * 3);
            }
        },
    };

    const build = (s) => {
        // The water: its colour from the card, with the light of the water drifting across it
        const water = s.depth(zFor(DEPTH.water));
        const paint = document.createElement('canvas');
        paint.width = paint.height = 4;
        const g = paint.getContext('2d');
        g.fillStyle = `#${WATER.toString(16).padStart(6, '0')}`;
        g.fillRect(0, 0, 4, 4);
        L.water = water.canvas(paint, { water: 0.9 });
        // The light at the surface: a soft light, its disc (code) and, among the layers, its stippled edge as particles
        const sun = s.depth(zFor(DEPTH.sun));
        L.sunNode = sun;
        L.shaft = sun.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: 0xfff0a8, stops: [[0, 0.16], [0.4, 0.06], [0.7, 0]] });
        L.sunGlow = sun.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: 0xffe47c, stops: [[0, 0.5], [0.3, 0.2], [0.62, 0]], bloom: true });
        L.sun = sun.disc({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: SUN_YELLOW, bloom: true });
        sun.enter({ y: -40, delay: 150, duration: 2400 });
        // The bubbles, at three depths
        L.bubbles = [];
        DEPTH.bubbles.forEach((depth, d) => {
            const node = s.depth(zFor(depth));
            bubbles.filter((b) => b.depth === d).forEach((b) => { L.bubbles[b.i] = node.image('/assets/honestidad/bubbles.webp', { crop: b.crop }); });
            node.enter({ y: 30, delay: 500 + 200 * d, duration: 2200 });
        });
        // The jellyfish: its glow, its eye's light, its tentacles under its bell
        const jelly = s.depth(zFor(DEPTH.jelly));
        L.jellyNode = jelly;
        L.jelly = jelly.group();
        L.halo = L.jelly.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: AURA, stops: [[0, 0.28], [0.35, 0.12], [0.7, 0]], bloom: true });
        L.tentacles = L.jelly.image('/assets/honestidad/tentacles.webp', { wind: { amp: 16, speed: 0.7, root: 'top' } });
        L.bell = L.jelly.image('/assets/honestidad/bell.webp');
        L.eye = L.jelly.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: 0xfff3b0, stops: [[0, 0.8], [0.3, 0.3], [0.62, 0]], bloom: true });
        jelly.enter({ y: 50, scale: 0.92, delay: 350, duration: 2400 });
        // The floor: beyond the frame (wide screens), the seaweed, the teal corals, the anemones in their pots, the pink coral
        const beyond = s.depth(zFor(DEPTH.beyond));
        L.beyond = [-1, 1].flatMap((side) => BEYOND.map(([name, mirror, scale]) => {
            const node = beyond.image(`/assets/honestidad/${name}.webp`, { wind: { amp: name === 'seaweed' ? 7 : 3, speed: 0.45, root: 'bottom' }, blur: 0.8 });
            node.uniforms.uBright.value = 0.72;
            node.uniforms.uSaturate.value = 0.8;
            return { node, name, mirror: side < 0 ? mirror : !mirror, scale, side };
        }));
        beyond.enter({ y: 50, delay: 100, duration: 1800 });
        const seaweed = s.depth(zFor(DEPTH.seaweed));
        L.seaweedNode = seaweed;
        L.seaweed = [-1, 1].map((side) => {
            const node = seaweed.image('/assets/honestidad/seaweed.webp', { wind: { amp: 9, speed: 0.5, root: 'bottom' } });
            if (side > 0) node.sx = -1;
            return node;
        });
        seaweed.enter({ y: 60, delay: 150, duration: 1800 });
        const corals = s.depth(zFor(DEPTH.corals));
        L.coralsNode = corals;
        L.coralL = corals.image('/assets/honestidad/coralL.webp', { wind: { amp: 4, speed: 0.6, root: 'bottom' } });
        L.coralR = corals.image('/assets/honestidad/coralR.webp', { wind: { amp: 4, speed: 0.6, root: 'bottom' } });
        corals.enter({ y: 60, delay: 220, duration: 1800 });
        const anemones = s.depth(zFor(DEPTH.anemones));
        L.anemonesNode = anemones;
        L.anemoneGlow = ['L', 'R'].map(() => anemones.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: 0xffe47d, stops: [[0, 0.3], [0.35, 0.12], [0.7, 0]] }));
        L.anemones = ['L', 'R'].map((s2) => anemones.image(`/assets/honestidad/anemone${s2}.webp`, { wind: { amp: 3, speed: 0.9, root: 'bottom' } }));
        L.pots = ['L', 'R'].map((s2) => anemones.image(`/assets/honestidad/pot${s2}.webp`));
        anemones.enter({ y: 60, delay: 300, duration: 1800 });
        const coral = s.depth(zFor(DEPTH.coral));
        L.coralNode = coral;
        L.coral = coral.image('/assets/honestidad/coral.webp');
        coral.enter({ y: 70, delay: 380, duration: 1800 });
    };

    const place = (w, h) => {
        layout(w, h);
        root.value.style.background = `#${WATER.toString(16).padStart(6, '0')}`;
        // The water: a square (so the light on it keeps its shape), past every edge the camera can show
        const side = Math.max(w, h) * 1.3;
        L.water.place({ left: w / 2 - side / 2, top: h / 2 - side / 2, w: side, h: side });

        const sr = SUN.r * k();
        L.sun.place({ left: sx(SUN.x) - sr, top: sy(SUN.y) - sr, w: 2 * sr, h: 2 * sr });
        const sg = sr * 4.4;
        L.sunGlow.place({ left: sx(SUN.x) - sg / 2, top: sy(SUN.y) - sg / 2, w: sg, h: sg });
        const sh = sr * 9;
        L.shaft.place({ left: sx(SUN.x) - sh / 2, top: sy(SUN.y) - sh * 0.3, w: sh, h: sh * 1.3 });

        bubbles.forEach((b) => {
            const r = rectOf(b.box);
            L.bubbles[b.i].place(r);
        });

        const bell = rectOf(B.bell);
        L.bell.place(bell, { x: bell.left + bell.w / 2, y: bell.top + bell.h * 0.15 });
        const tent = rectOf(B.tentacles);
        L.tentacles.place(tent, { x: tent.left + tent.w / 2, y: tent.top });
        const hd = 900 * k();
        L.halo.place({ left: sx(1080) - hd / 2, top: sy(980) - hd / 2, w: hd, h: hd });
        const ed = 120 * k();
        L.eye.place({ left: sx(EYE[0]) - ed / 2, top: sy(EYE[1]) - ed / 2, w: ed, h: ed });
        L.jelly.pivot = { x: sx(1080), y: sy(1000) };

        const weed = rectOf(B.seaweed);
        L.seaweed[0].place(weed);
        L.seaweed[1].place({ ...weed, left: sx(SIZE - B.seaweed[0] - B.seaweed[2]) });
        L.coralL.place(rectOf(B.coralL));
        L.coralR.place(rectOf(B.coralR));
        ['L', 'R'].forEach((s2, i) => {
            const a = rectOf(B[`anemone${s2}`]);
            L.anemones[i].place(a, { x: a.left + a.w / 2, y: a.top + a.h });
            L.pots[i].place(rectOf(B[`pot${s2}`]));
            const gd = 520 * k();
            L.anemoneGlow[i].place({ left: a.left + a.w / 2 - gd / 2, top: a.top + a.h * 0.35 - gd / 2, w: gd, h: gd });
        });
        const c = rectOf(B.coral);
        L.coral.place(c, { x: c.left + c.w / 2, y: c.top + c.h });

        // Beyond the frame: outwards from the seaweed at each side, as far as the screen (and the camera) goes
        const bottom = sy(SIZE);
        [-1, 1].forEach((sd) => {
            let edge = sd < 0 ? weed.left + weed.w * 0.25 : sx(SIZE) - weed.w * 0.25;
            L.beyond.filter((b) => b.side === sd).forEach((b, j) => {
                const [, , bw, bh] = B[b.name];
                const ww = bw * k() * b.scale, hh = bh * k() * b.scale;
                const left = sd < 0 ? edge - ww : edge;
                const seen = sd < 0 ? edge > -SLIDE : edge < w + SLIDE;
                b.node.mesh.visible = seen;
                b.node.sx = b.mirror ? -1 : 1;
                b.node.place({ left, top: bottom - hh, w: ww, h: hh });
                edge += sd * ww * (1 - BEYOND[j][3]);
            });
        });
    };

    // The touch target: the jellyfish's bell and the top of its tentacles
    const placeHits = () => {
        if (!L.jelly || !jellyHit.value) return;
        const b = L.jelly.boxOnScreen(rectOf([860, 640, 440, 760]));
        const bw = Math.max(64, b.width), bh = Math.max(64, b.height);
        jellyHit.value.style.translate = `${(b.left + b.width / 2 - bw / 2).toFixed(1)}px ${(b.top + b.height / 2 - bh / 2).toFixed(1)}px`;
        jellyHit.value.style.width = `${bw.toFixed(1)}px`;
        jellyHit.value.style.height = `${bh.toFixed(1)}px`;
    };

    const enter = () => {
        if (entered || !props.active || !stage) return;
        entered = true;
        stage.ready().then(() => { if (!gone) { stage.start(); dust?.reveal(); } });
    };

    let frames = 0;
    const frame = ({ x, y, scroll, t, ramp }) => {
        if (!stage || !L.jelly) return;
        const dt = Math.min(0.1, Math.max(0, t - lastT));
        lastT = t;
        now = t;
        stage.look(x * SLIDE, y * SLIDE_Y);

        // ---- The light at the surface breathes
        const breath = Math.sin(t * 0.5);
        L.sun.scale = 1 + 0.015 * breath * ramp;
        L.sunGlow.opacity = 0.75 + 0.15 * breath;
        L.sunGlow.scale = 1 + 0.05 * breath * ramp;
        L.shaft.opacity = 0.8 + 0.2 * Math.sin(t * 0.31);
        L.sunNode.y = scroll * 8;

        // ---- The jellyfish: a stroke now and then, the light running down to its eye
        if (!reduced && t - strokeAt > STROKE + 0.6 + Math.sin(strokeAt) * 0.8) strokeAt = t;
        if (!reduced && t - runAt > THREAD_EVERY) runAt = t;
        const c = reduced ? 0 : stroke(t);
        const up = reduced ? 0 : rise(t);
        L.bell.sx = 1 - 0.06 * c;
        L.bell.sy = 1 + 0.035 * c;
        L.tentacles.sx = 1 - 0.05 * c + 0.03 * up;
        L.tentacles.sy = 1 + 0.05 * up - 0.02 * c;
        L.jelly.y = (-26 * up + Math.sin(t * 0.37) * 6) * k() * ramp;
        L.jelly.rotate = Math.sin(t * 0.23) * 1.5 * ramp;
        const arrived = (t - runAt) / RUN;
        if (!reduced && arrived > 0.95 && arrived < 1.05) eyeFlash = 1;
        eyeFlash = Math.max(0, eyeFlash - dt * 0.9);
        L.eye.opacity = 0.35 + 0.65 * eyeFlash + 0.15 * c;
        L.eye.scale = 1 + 0.8 * eyeFlash;
        L.halo.opacity = 0.7 + 0.3 * c + 0.3 * eyeFlash;
        L.bell.uniforms.uBright.value = 1 + 0.08 * eyeFlash;
        L.jellyNode.y = scroll * 14;
        const heart = L.jelly.toScreen(sx(1080), sy(900));
        dust?.grow(1, 0.05 * c + 0.03 * eyeFlash, heart.x, heart.y);

        // ---- The bubbles bob and wobble
        bubbles.forEach((b) => {
            const node = L.bubbles[b.i];
            b.wobble = Math.max(0, b.wobble - dt * 0.7);
            const wob = Math.sin(t * 1.3 + b.phase) * 0.025 * ramp + Math.sin(t * 9 + b.phase) * 0.12 * b.wobble;
            node.y = Math.sin(t * 0.42 + b.phase) * 10 * k() * ramp - 14 * b.wobble * k();
            node.x = Math.sin(t * 0.27 + b.phase * 2) * 6 * k() * ramp;
            node.sx = 1 + wob;
            node.sy = 1 - wob;
        });

        // ---- The floor sways in the current (shader); the pink coral breathes
        L.coral.sy = 1 + 0.008 * Math.sin(t * 0.8) * ramp;
        L.coral.sx = 1 - 0.004 * Math.sin(t * 0.8) * ramp;
        L.anemoneGlow.forEach((gl, i) => { gl.opacity = 0.75 + 0.25 * Math.sin(t * 0.9 + i * 2); });
        [L.seaweedNode, L.coralsNode, L.anemonesNode, L.coralNode].forEach((node) => { node.y = scroll * 30; });

        // The particles that belong to a layer follow it
        const drift = (node) => { const d = stage.drift(node.z); return { x: d.x, y: d.y + node.y }; };
        const sd = drift(L.sunNode);
        const jd = drift(L.jellyNode);
        dust?.shift(0, sd.x, sd.y);
        dust?.shift(1, jd.x, jd.y + L.jelly.y);
        const wd = drift(L.seaweedNode);
        dust?.shift(3, wd.x, wd.y);
        const ad = drift(L.anemonesNode);
        dust?.shift(4, ad.x, ad.y);
        const md = stage.drift(zFor(9));
        dust?.shift(5, md.x, md.y);
        stage.render(t);
        if (frames++ % 2 === 0) placeHits();
    };

    // The specks of the water, from the card, repeated (mirrored every other time) over the whole screen
    const waterSpecks = (w, h) => {
        const out = [];
        const step = F.size;
        for (let j = Math.floor(-F.y / step) - 1; F.y + j * step < h + 40; j++) {
            for (let i = Math.floor(-F.x / step) - 1; F.x + i * step < w + 40; i++) {
                const flip = (i + j) % 2 !== 0;
                art.dust.forEach(([ax, ay, r]) => {
                    const x = F.x + i * step + (flip ? SIZE - ax : ax) * k(), y = F.y + j * step + ay * k();
                    if (x < -60 || x > w + 60 || y < -60 || y > h + 60) return;
                    out.push([x, y, Math.max(1.4, 2 * r * k() * 1.1), DUST]);
                });
            }
        }
        return out;
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
        stage.onResize((w, h) => place(w, h));
        const after = (node) => node.mesh.renderOrder + 0.5;
        const fromArt = (list, colour, scale = 1) => list.map(([x, y, r]) => [sx(x), sy(y), Math.max(1.2, 2 * r * k() * scale), colour]);
        dust = startStardust(null, {
            stage,
            manual: true,
            groups: [
                // 0: the stippled edge of the light at the surface, alive
                { colors: [SUN_YELLOW], parallax: 0, drift: 2.4, jitter: 0.5, twinkle: 0.3, reach: 0, order: after(L.sun), points: () => fromArt(SUN.dots, SUN_YELLOW) },
                // 1: the jellyfish's aura, breathing with it
                { colors: [AURA], parallax: 0, drift: 1.8, jitter: 0.4, twinkle: 0.4, reach: 0, bloom: true, order: after(L.halo), points: () => fromArt(art.aura, AURA, 1.15) },
                // 2: the thread of light from the surface to its third eye
                { colors: [THREAD], dynamic: threadGroup, parallax: 0, drift: 0, twinkle: 0, reach: 0, look: 'hard', bloom: true, order: after(L.bell) + 0.2 },
                // 3: the dark specks round the seaweeds
                { colors: [INK], parallax: 0, drift: 3, twinkle: 0.15, reach: 70, push: 14, order: after(L.seaweed[1]), points: () => fromArt(art.stipple, INK) },
                // 4: the yellow stipple round the anemones
                { colors: [0xffe47d], parallax: 0, drift: 3, jitter: 0.4, twinkle: 0.45, reach: 70, push: 16, order: after(L.anemoneGlow[1]), points: () => fromArt(art.glow, 0xffe47d) },
                // 5: the specks of the water, rising slowly, moving out of a finger's way
                { colors: [DUST], parallax: 0, drift: 8, twinkle: 0.5, reach: 110, push: 30, flow: [0, -5], order: after(L.sunGlow), points: waterSpecks },
            ],
        });
        if (reduced) dust.reveal();
        parallax = createParallax(root.value, frame);
        enter();
    };

    onMounted(begin);
    watch(() => props.active, enter);
    onBeforeUnmount(() => {
        gone = true;
        parallax?.destroy();
        dust?.destroy();
        stage?.destroy();
    });
</script>

<template>
    <div class="scene" ref="root" @click="strum">
        <canvas class="stageCanvas" ref="canvas"></canvas>
        <div ref="jellyHit" class="hit" role="button" tabindex="0"
            :aria-label="$i18n.locale === 'en' ? 'The jellyfish: touch it and it swims' : 'La medusa: tocala y nada'"
            @click.stop="swim" @keydown="onKey"></div>
    </div>
</template>

<style scoped>
    .scene {
        position: absolute;
        inset: 0;
        overflow: hidden;
        background: #026862;
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
        border-radius: 40%;
        cursor: pointer;
        pointer-events: auto;
        -webkit-tap-highlight-color: transparent;
        outline: none;
    }

    .hit:focus-visible {
        outline: 2px solid rgba(255, 255, 255, 0.85);
        outline-offset: 2px;
    }
</style>
