<script setup>
    // Viriya: diligence, "I listen to my heart and follow its truth with determination". At dusk Particular stands at the
    // edge of a cliff with his backpack and a staff crowned by a spiral, looking down at a path that winds through the
    // hills towards the setting sun.
    // Its verb is Encender (useKindle.js, the engine of the verb: rub, then sling). Rubbing the staff warms its spiral: the walker's aura
    // brightens, sparks fly, a note of the chord climbs with each sixth of the heat; rubbing faster does not count more
    // and stopping cools it ("slowly but surely": diligence). Hot enough, the spiral catches fire like a torch. Then it is
    // a sling: press, pull back (a band to the finger, dots for where it goes) and let go: a flame flies over the valley,
    // falling a little and bouncing off the edges of the screen, and lights every cactus and flower it passes (they start
    // grey and get their colour and a light). After a few bounces, or slowed down, it goes out and the staff has to be
    // rubbed again. With the three cacti and the three flowers lit, the sun comes up full, the sky warms and the rulito is
    // born over Particular, where the card draws it, in its blue. Then everything fades back to grey.
    // The sky is not a picture: a gradient from the card's navy down through its sunset, worked out by the converter, and
    // the sun is a disc drawn in code with its stippled edge as live particles (so is the stipple of the walker's aura).
    // It is drawn in WebGL (useLayerStage): the wind's strokes, the valley, the cliff and the walker are planes at their
    // depths; beyond the frame the land goes on (the hills and the cliff mirrored on each side, as Sacca's dunes). From viriyaScene.json and
    // public/assets/viriya (made by scripts/convert-viriya.mjs). The touch target is a DOM element over the walker.
    import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { createParallax } from '../../composables/useParallax.js';
    import { createLayerStage } from '../../composables/useLayerStage.js';
    import { startStardust } from '../../composables/useStardust.js';
    import { createSparks } from '../../composables/useSparks.js';
    import { createKindle, FIRE } from '../../composables/useKindle.js';
    import { play } from '../../composables/useSound.js';
    import { sceneMilestone } from '../../analytics.js';
    import Rulito from '../Rulito.vue';
    import art from '../../composables/viriyaScene.json';

    const props = defineProps({
        card: { type: Object, default: () => ({}) },
        active: Boolean
    });

    const root = ref(null);
    const canvas = ref(null);
    const rulito = ref(null);
    const walkerHit = ref(null);
    let stageEl = null;
    let stage = null;
    let parallax = null;
    let dust = null;
    let entered = false;
    let gone = false;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ---- Layout: the illustration is a 2160 square resting on the bottom of the screen. On a phone upright it is as big
    // as the walker and the farthest cactus allow across, centred between them; on a wide screen the land goes on past
    // the frame on both sides
    const SIZE = art.size;
    const B = art.boxes;
    let F = { x: 0, y: 0, size: 1 };
    let W = 1, H = 1;
    const k = () => F.size / SIZE;
    const sx = (x) => F.x + x * k();
    const sy = (y) => F.y + y * k();
    const rectOf = ([left, top, w, h]) => ({ left: sx(left), top: sy(top), w: w * k(), h: h * k() });
    const SPAN = 1700, FOCUS = 1290;        // art px across that must be seen on a phone, and their middle
    const DROP = 0.1;                       // how much of the frame goes under the bottom of a wide screen
    const layout = (w, h) => {
        W = w; H = h;
        const phone = w < h;
        const size = phone ? Math.min(0.72 * h, w * SIZE / SPAN) : Math.min(Math.max(0.62 * w, 0.55 * h), 0.9 * h);
        let x = w / 2 - size / 2;
        if (phone && size > w) x = Math.min(0, Math.max(w - size, w / 2 - FOCUS * size / SIZE));
        // On a wide screen the scene sits a little lower (the foot of the cliff and of the path go under the edge), for
        // more sky over the walker
        F = { x, y: h - size + (phone ? 0 : DROP * size), size };
    };

    const SLIDE = 50;
    const SLIDE_Y = 30;
    const zFor = (amp) => amp / (SLIDE + amp);
    const DEPTH = { sun: 6, winds: [5, 7, 9], valley: 16, cliff: 26, walker: 28 };

    const SUN = art.sun;
    const SUN_YELLOW = SUN.color;
    const AURA = 0xe9edd8;
    const ease = (p) => p * p * (3 - 2 * p);
    const SUN_RISE = 180;                   // how far the sun comes up when the way is lit (art px)
    const centreOf = ([x, y, w, h]) => [x + w / 2, y + h / 2];
    const SPIRAL = centreOf(art.spiral);

    // ---- The wind's strokes: cut out of the illustration (one atlas), drifting slowly and wrapping round the sky
    const [AW, AH] = art.atlas;
    const winds = art.winds.map(([x, y, w, h, ax, ay], i) => ({
        i, art: { x: x + w / 2, y: y + h / 2, w, h }, crop: [ax / AW, ay / AH, w / AW, h / AH],
        rest: { left: 0, top: 0, w: 1, h: 1 }, x0: 0, phase: Math.random() * 6.28, speed: 14 + (i % 3) * 6, depth: i % 3,
    }));
    let span = { left: 0, width: 1 };

    // ---- What there is to light: the three cacti and the three flowers, with where each is (art px) and how far a flame
    // may pass from it and still light it
    const TARGETS = [
        ...art.cacti.map((name) => { const [x, y, w, h] = B[name]; return { name, kind: 'cactus', x: x + w / 2, y: y + h * 0.45, reach: Math.max(w, h) * 0.45, color: 0xff6fa8 }; }),
        ...art.plants.map(({ name, flower: [x, y, r] }) => ({ name, kind: 'flower', x, y, reach: Math.max(70, r * 6), color: 0xffd84a })),
    ];
    const on = TARGETS.map(() => false);
    const lit = TARGETS.map(() => (reduced ? 1 : 0));
    const flash = TARGETS.map(() => 0);

    // ---- Encender (useKindle.js): rub the staff until its spiral catches, then sling the flame over the valley. Its
    // numbers are the engine's own (they were Viriya's first): RUB 1.6 frame widths of rubbing for the spiral to catch,
    // STEADY 1.6 a second (rubbing faster does not count more: "sin prisa pero sin pausa"), COOL 0.25 of heat lost a
    // second while nobody rubs, FUEL 4 bounces, a pull shorter than 0.12 of the full one launches nothing
    const DELAY = 1.4, GROW = 2.2, LINGER = 2.6, EAT = 3.4;    // the rulito: after the sun comes up, born, kept, gone
    let hint = 0;
    let win = null;
    let wins = 0;
    let sunUp = 0;                          // the sun come up full
    let glyph = { left: 0, top: 0, w: 1, h: 1 };
    let lastT = 0;
    const sparks = createSparks(420);
    const L = {};

    const spiralAt = () => L.walker.toScreen(sx(SPIRAL[0]), sy(SPIRAL[1]));
    const targetAt = (i) => L.valley.toScreen(sx(TARGETS[i].x), sy(TARGETS[i].y));
    const kindler = createKindle({
        size: () => F.size,
        source: spiralAt,
        canvas: () => canvas.value,
        sparks,
        busy: () => !!win || reduced,
        // The flame flies: it falls a little, slows a little, bounces off the edges of the screen and lights every cactus
        // and flower it passes
        collide: (f) => {
            if (kindler.edges(W, H)) play('tap');
            TARGETS.forEach((T, i) => {
                if (on[i]) return;
                const p = targetAt(i);
                if (Math.hypot(p.x - f.x, p.y - f.y) < Math.max(34, T.reach * k())) catchFire(i);
            });
        },
        onKindle: (step) => play('kindle', { step }),
        onIgnite: () => { dust?.boost(1, 1.2); play('ignite', 1); play('star'); },
        onLaunch: (pull) => play('ignite', pull),
    });

    // Pressing on the walker: cold, it starts to rub the staff; on fire, it takes the sling
    const press = (event) => {
        if (!kindler.press(event)) play('tap');
        else if (kindler.aiming) play('tap');
    };
    // With the keyboard: Enter rubs (each press warms it a fifth) and, on fire, throws the flame at the nearest unlit one,
    // homing in on it until it is lit
    const nearestUnlit = () => {
        const s = spiralAt();
        const todo = TARGETS.map((_, i) => i).filter((i) => !on[i]);
        if (!todo.length) return null;
        const i = todo.reduce((best, j) => (Math.hypot(targetAt(j).x - s.x, targetAt(j).y - s.y) < Math.hypot(targetAt(best).x - s.x, targetAt(best).y - s.y) ? j : best), todo[0]);
        return () => (on[i] ? null : targetAt(i));
    };
    const onKey = (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        if (reduced || win) { kindler.idle = 0; play('tap'); return; }
        kindler.key(nearestUnlit);
    };

    // A cactus or a flower catches the fire: its colour, its light
    const catchFire = (i) => {
        if (on[i]) return;
        on[i] = true;
        flash[i] = 1;
        const n = on.filter(Boolean).length;
        const p = targetAt(i);
        const T = TARGETS[i];
        sparks.burst(p.x, p.y, { n: 26, colors: T.kind === 'flower' ? FIRE : [0xff6fa8, 0xff9ac4, 0xffd29a, 0xffffff], speed: 110, life: 2.2, size: 4.8, spread: 6 });
        play('link', { from: (n - 1) / TARGETS.length, to: n / TARGETS.length, level: 0.9 });
        if (n === TARGETS.length) setTimeout(() => { if (!gone) dawn(); }, 500);
    };
    // Everything on the way is lit: the sun comes up full and the rulito is born over Particular. Viriya's chord, E major,
    // has no seventh to resolve: the fire leaps and the chord gathers, and the rulito climbs it an octave up
    const dawn = () => {
        if (win) return;
        wins += 1;
        win = { age: 0, head: 0, tail: 0, full: false, fullAt: 0, back: false, pop: 0 };
        kindler.reset();
        rulito.value?.reshape();
        play('ignite', 1);
        play('converge');
        dust?.boost(0, 1.6);
        sceneMilestone('path_lit', { times: wins });
    };

    // Every LOOK s the walker leans out to look down the path for a moment (0..1, eased in and out)
    const LOOK = 11;
    const lookout = (t) => {
        const p = (Math.max(0, t) % LOOK) / 3;
        return p < 1 ? Math.sin(p * Math.PI) ** 2 : 0;
    };

    // Every frame: the heat, the flight, the lights, the sun and the rulito
    const game = (t, dt) => {
        kindler.update(t, dt);
        const charge = kindler.charge;
        // The spiral's fire: embers rising from it, more the hotter
        if (!reduced && charge > 0.15 && Math.random() < dt * (4 + 14 * charge)) {
            const s = spiralAt();
            sparks.burst(s.x, s.y, { n: 1, colors: FIRE, speed: 20 + 40 * charge, life: 1.1, size: 2.5 + 2.5 * charge, spread: 10 });
        }
        // The hint, without words: still a while, sparks crackle on the spiral (rub it), or on fire it beats (sling it)
        if (!kindler.rubbing && !kindler.aiming && !win && kindler.mode !== 'flying' && kindler.idle > 7) {
            kindler.idle = 0;
            hint = 1;
            const s = spiralAt();
            sparks.burst(s.x, s.y, { n: 8, colors: FIRE, speed: 50, life: 0.9, size: 3.5, spread: 8 });
        }
        hint = Math.max(0, hint - dt * 1.4);

        // The rulito: born once the sun is up, kept a while, then its tail catches its head and everything fades
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
        const up = win && !win.back ? 1 : 0;
        sunUp += (up - sunUp) * Math.min(1, dt * (up ? 1.2 : 0.5));
        stageEl?.style.setProperty('--name-glow', named.toFixed(3));
        stage.bloom = Math.max(named, 0.35 * charge, 0.45 * sunUp, kindler.mode === 'flying' ? 0.4 : 0);
        return named;
    };

    const build = (s) => {
        // The sun: a warm light round it, its disc (code) and, among the layers, its stippled edge as particles
        const sun = s.depth(zFor(DEPTH.sun));
        L.sunNode = sun;
        L.dusk = sun.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: 0xff9a6a, stops: [[0, 0.5], [0.35, 0.22], [0.7, 0]] });
        L.sunGlow = sun.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: 0xffe27a, stops: [[0, 0.55], [0.3, 0.25], [0.62, 0]], bloom: true });
        L.sun = sun.disc({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: SUN_YELLOW });
        sun.enter({ y: 60, delay: 150, duration: 2600 });
        // The wind's strokes, at three depths
        L.winds = [];
        DEPTH.winds.forEach((depth, d) => {
            const node = s.depth(zFor(depth));
            winds.filter((wd) => wd.depth === d).forEach((wd) => { L.winds[wd.i] = node.image('/assets/viriya/winds.webp', { crop: wd.crop }); });
            node.enter({ y: -20, delay: 200 + 150 * d, duration: 2000 });
        });
        // The valley, with the land going on past the frame; the cacti and plants on it
        const valley = s.depth(zFor(DEPTH.valley));
        L.valleyNode = valley;
        L.valley = valley.group();
        L.hills = [-1, 0, 1].map((side) => {
            const node = L.valley.image('/assets/viriya/hills.webp');
            if (side) node.sx = -1;
            return { node, side };
        });
        L.path = L.valley.image('/assets/viriya/path.webp');
        L.sparkle = L.valley.image('/assets/viriya/sparkle.webp');
        L.lights = TARGETS.map((T) => {
            const g = L.valley.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: T.color, stops: [[0, 0.65], [0.3, 0.3], [0.65, 0]], bloom: true });
            g.opacity = 0;
            return g;
        });
        L.targets = TARGETS.map((T) => L.valley.image(`/assets/viriya/${T.name}.webp`, { wind: T.kind === 'flower' ? { amp: 3, speed: 0.8, root: 'bottom' } : { amp: 1.6, speed: 0.6, root: 'bottom' } }));
        valley.enter({ y: 40, delay: 100, duration: 1700 });
        // The cliff, and on it the walker with his aura, his staff and the rulito
        const cliff = s.depth(zFor(DEPTH.cliff));
        L.cliffNode = cliff;
        L.cliffLeft = cliff.image('/assets/viriya/cliff.webp');
        L.cliffLeft.sx = -1;
        L.cliff = cliff.image('/assets/viriya/cliff.webp');
        cliff.enter({ y: 70, delay: 250, duration: 1800 });
        const walker = s.depth(zFor(DEPTH.walker));
        L.walkerNode = walker;
        L.walker = walker.group();
        L.warmth = L.walker.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: 0xffcf8a, stops: [[0, 0.45], [0.35, 0.18], [0.7, 0]], bloom: true });
        L.warmth.opacity = 0;
        L.body = L.walker.image('/assets/viriya/walker.webp');
        L.staff = L.walker.image('/assets/viriya/staff.webp');
        L.torch = L.walker.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: [1, 0.74, 0.35], stops: [[0, 0.75], [0.3, 0.32], [0.62, 0]], bloom: true });
        L.torch.opacity = 0;
        L.rulito = L.walker.canvas(rulito.value.canvas, { bloom: true });
        walker.enter({ y: 80, delay: 400, duration: 1900 });
        // The flame in flight, at the focal plane (it does not move with the camera)
        const air = s.depth(0);
        L.flame = air.glow({ rect: { left: -1, top: -1, w: 2, h: 2 }, color: [1, 0.7, 0.32], stops: [[0, 0.9], [0.25, 0.5], [0.62, 0]], bloom: true });
        L.flameCore = air.glow({ rect: { left: -1, top: -1, w: 2, h: 2 }, color: 0xfff6dc, stops: [[0, 1], [0.3, 0.6], [0.6, 0]], bloom: true });
        L.flame.opacity = L.flameCore.opacity = 0;
    };

    // The sky, from the card: the navy above, down through the sunset to the horizon. As the sun comes up (`up`, 0..1)
    // the sunset climbs with it and spreads, and the navy above lightens towards a dawn blue
    const DAWN = [0x4a, 0x80, 0xb8];
    let skyH = 1, skyUp = -1;
    const paintSky = (up) => {
        skyUp = up;
        const rise = SUN_RISE * k() * up;
        const stops = art.sky.map(([y, c]) => {
            const above = Math.max(0, Math.min(1, (900 - y) / 500));             // how far up the sky this stop is
            const mix = 0.45 * up * above;
            const rgb = [c >> 16, (c >> 8) & 255, c & 255].map((v, j) => Math.round(v + (DAWN[j] - v) * mix));
            const at = sy(y) - rise * (0.6 + 0.8 * above);
            return `rgb(${rgb.join(', ')}) ${Math.max(-50, Math.min(150, at / skyH * 100)).toFixed(1)}%`;
        });
        root.value.style.background = `linear-gradient(to bottom, ${stops.join(', ')})`;
    };

    const place = (w, h) => {
        layout(w, h);
        skyH = h;
        paintSky(skyUp);

        const sr = SUN.r * k();
        L.sun.place({ left: sx(SUN.x) - sr, top: sy(SUN.y) - sr, w: 2 * sr, h: 2 * sr });
        const sg = sr * 4.2, dg = sr * 9;
        L.sunGlow.place({ left: sx(SUN.x) - sg / 2, top: sy(SUN.y) - sg / 2, w: sg, h: sg });
        L.dusk.place({ left: sx(SUN.x) - dg / 2, top: sy(SUN.y) - dg * 0.45, w: dg, h: dg * 0.9 });

        const wide = Math.max(w, F.size);
        const below = titleBottom(h) + 16;
        let widest = 0;
        winds.forEach((wd) => {
            const ww = wd.art.w * k(), wh = wd.art.h * k();
            const x = w / 2 + (wd.art.x - 1080) / SIZE * wide;
            // Spread over the sky between the card's name and the land, however tall it is: never over the name
            const top = below + wh / 2 + 12, bottom = Math.max(top, sy(980));
            const y = top + (wd.art.y - 160) / 820 * (bottom - top);
            wd.x0 = x;
            wd.rest = { left: x - ww / 2, top: y - wh / 2, w: ww, h: wh };
            widest = Math.max(widest, ww);
            L.winds[wd.i].place(wd.rest);
        });
        span = { left: -SLIDE * 2 - widest / 2, width: w + SLIDE * 4 + widest };

        const hills = rectOf(B.hills);
        L.hills.forEach(({ node, side }) => node.place({ ...hills, left: hills.left + side * hills.w }));
        L.path.place(rectOf(B.path));
        L.sparkle.place(rectOf(B.sparkle));
        TARGETS.forEach((T, i) => {
            const r = rectOf(B[T.name]);
            L.targets[i].place(r, { x: r.left + r.w / 2, y: r.top + r.h });
            const d = (T.kind === 'flower' ? 260 : Math.max(B[T.name][2], B[T.name][3]) * 1.5) * k();
            L.lights[i].place({ left: sx(T.x) - d / 2, top: sy(T.y) - d / 2, w: d, h: d });
        });
        const c = rectOf(B.cliff);
        L.cliff.place(c);
        L.cliffLeft.place({ ...c, left: c.left - c.w });

        const body = rectOf(B.walker);
        L.body.place(body, { x: body.left + body.w / 2, y: body.top + body.h });
        L.staff.place(rectOf(B.staff), { x: sx(SPIRAL[0]), y: sy(1420) });
        const wd = 900 * k();
        L.warmth.place({ left: sx(700) - wd / 2, top: sy(820) - wd / 2, w: wd, h: wd });
        const td = 380 * k();
        L.torch.place({ left: sx(SPIRAL[0]) - td / 2, top: sy(SPIRAL[1]) - td / 2, w: td, h: td });
        L.walker.pivot = { x: sx(700), y: sy(1420) };
        // The rulito where the card draws it (its canvas is bigger than the glyph, for the glow)
        const r = rectOf(art.rulito);
        const rh = r.h, rw = rh * 32 / 86;
        glyph = { left: r.left + r.w / 2 - rw / 2, top: r.top, w: rw, h: rh };
        L.rulito.place({ left: glyph.left - 0.4375 * glyph.w, top: glyph.top - 0.1628 * glyph.h, w: glyph.w * 1.875, h: glyph.h * 1.3256 },
            { x: glyph.left + glyph.w / 2, y: glyph.top + glyph.h });
        const fd = Math.max(46, 150 * k());
        L.flame.place({ left: -fd / 2, top: -fd / 2, w: fd, h: fd });
        L.flameCore.place({ left: -fd / 5, top: -fd / 5, w: fd / 2.5, h: fd / 2.5 });
    };

    // Where the card's name ends (the stage's h1, over the scene), so the wind's strokes keep under it
    const titleBottom = (h) => {
        const title = stageEl?.querySelector('h1');
        if (!title || !root.value) return 0.16 * h;
        return title.getBoundingClientRect().bottom - root.value.getBoundingClientRect().top;
    };

    // The touch target: the walker and his staff
    const placeHits = () => {
        if (!L.walker || !walkerHit.value) return;
        const b = L.walker.boxOnScreen(rectOf([440, 440, 640, 1000]));
        const bw = Math.max(64, b.width), bh = Math.max(64, b.height);
        walkerHit.value.style.translate = `${(b.left + b.width / 2 - bw / 2).toFixed(1)}px ${(b.top + b.height / 2 - bh / 2).toFixed(1)}px`;
        walkerHit.value.style.width = `${bw.toFixed(1)}px`;
        walkerHit.value.style.height = `${bh.toFixed(1)}px`;
    };

    const enter = () => {
        if (entered || !props.active || !stage) return;
        entered = true;
        stage.ready().then(() => { if (!gone) { stage.start(); dust?.reveal(); } });
    };

    let frames = 0;
    const frame = ({ x, y, scroll, t, ramp }) => {
        if (!stage || !L.walker) return;
        const dt = Math.min(0.1, Math.max(0, t - lastT));
        lastT = t;
        stage.look(x * SLIDE, y * SLIDE_Y);
        const named = reduced ? 0 : game(t, dt);

        // ---- The sun breathes, low; it comes up full and warms the sky when the way is lit
        const breath = Math.sin(t * 0.6);
        L.sun.scale = 1 + 0.012 * breath * ramp + 0.06 * sunUp;
        L.sunGlow.opacity = 0.55 + 0.1 * breath + 0.4 * sunUp;
        L.sunGlow.scale = 1 + 0.04 * breath + 0.3 * sunUp;
        L.dusk.opacity = 0.25 + 0.55 * sunUp;
        L.sunNode.y = scroll * 10 - SUN_RISE * k() * ease(sunUp);
        if (Math.abs(ease(sunUp) - skyUp) > 0.004 || (sunUp === 0 && skyUp > 0)) paintSky(ease(sunUp));

        // ---- The wind's strokes are blown along, from left to right: they drift and wrap round, rise and fall, lean and stretch as they go
        winds.forEach((wd) => {
            const node = L.winds[wd.i];
            const moved = wd.x0 + wd.speed * t;               // from left to right
            const wrapped = span.left + ((((moved - span.left) % span.width) + span.width) % span.width);
            node.x = wrapped - wd.x0;
            const gust = Math.sin(t * 1.3 + wd.phase);
            node.y = Math.sin(t * 0.5 + wd.phase) * 9 * ramp;
            node.rotate = Math.sin(t * 0.7 + wd.phase * 2) * 4 * ramp;
            node.sx = 1 + 0.1 * gust * ramp;
            node.sy = 1 - 0.06 * gust * ramp;
        });

        // ---- The cacti and flowers: grey until they catch, then their colour and a light
        TARGETS.forEach((T, i) => {
            lit[i] += (((reduced || on[i]) ? 1 : 0) - lit[i]) * Math.min(1, dt * (on[i] ? 5 : 0.6 + i * 0.05));
            flash[i] = Math.max(0, flash[i] - dt * 1.2);
            const u = L.targets[i].uniforms;
            u.uSaturate.value = 0.12 + 0.88 * lit[i];
            u.uBright.value = 0.82 + 0.18 * lit[i] + 0.25 * flash[i] + 0.15 * lit[i] * sunUp;
            const g = L.lights[i];
            g.opacity = Math.min(1, lit[i] * (0.65 + 0.15 * Math.sin(t * 2 + i)) + 0.5 * flash[i]);
            g.mesh.visible = g.opacity > 0.01;
            if (T.kind === 'cactus') L.targets[i].scale = 1 + 0.06 * flash[i];
        });
        L.valleyNode.y = scroll * 20;

        const charge = kindler.charge;
        // ---- The walker: he breathes; the spiral is a torch; his aura warms as the staff is rubbed
        // and now and then he leans out a little to look down the path, then stands back
        L.walker.y = Math.sin(t * 0.8) * 2 * ramp;
        L.walker.rotate = reduced ? 0 : 2.5 * lookout(t) * (1 - charge);
        L.body.sy = 1 + 0.012 * Math.sin(t * 1.1) * ramp;
        L.body.sx = 1 - 0.004 * Math.sin(t * 1.1) * ramp;
        L.staff.rotate = Math.sin(t * 0.7) * 0.6 * ramp + (kindler.rubbing ? Math.sin(t * 30) * 0.8 : 0);
        L.torch.opacity = Math.min(1, 1.2 * charge * (0.85 + 0.15 * Math.sin(t * 7)) + hint * 0.5);
        L.torch.scale = 0.6 + 0.6 * charge + 0.3 * hint;
        L.warmth.opacity = Math.min(1, 0.6 * charge + 0.4 * sunUp);
        L.body.uniforms.uBright.value = 1 + 0.12 * charge + 0.15 * named;
        L.cliffNode.y = scroll * 26;
        L.walkerNode.y = scroll * 28;
        dust?.fade(1, 0.55 + 0.45 * Math.max(charge, sunUp));

        // ---- The flame
        const flying = kindler.mode === 'flying';
        L.flame.x = L.flameCore.x = kindler.flame.x;
        L.flame.y = L.flameCore.y = kindler.flame.y;
        L.flame.opacity = flying ? 0.95 : 0;
        L.flameCore.opacity = flying ? 1 : 0;
        L.flame.scale = 1 + 0.15 * Math.sin(t * 17);
        L.flame.mesh.visible = L.flameCore.mesh.visible = flying;

        // The particles that belong to a layer follow it
        const sunDrift = stage.drift(L.sunNode.z), walkerDrift = stage.drift(L.walkerNode.z);
        dust?.shift(0, sunDrift.x, sunDrift.y + L.sunNode.y);
        dust?.shift(1, walkerDrift.x, walkerDrift.y + L.walkerNode.y + L.walker.y);
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
        stage.onResize((w, h) => place(w, h));
        const after = (node) => node.mesh.renderOrder + 0.5;
        const fromArt = (list, colour, scale = 1) => list.map(([x, y, r]) => [sx(x), sy(y), Math.max(1.2, 2 * r * k() * scale), colour]);
        dust = startStardust(null, {
            stage,
            manual: true,
            groups: [
                // 0: the stippled edge of the sun, alive
                { colors: [SUN_YELLOW], parallax: 0, drift: 2.2, jitter: 0.5, twinkle: 0.3, reach: 0, order: after(L.sun), points: () => fromArt(SUN.dots, SUN_YELLOW) },
                // 1: the aura round the walker, warmer as the staff is rubbed
                { colors: [AURA], parallax: 0, drift: 1.6, jitter: 0.4, twinkle: 0.45, reach: 0, bloom: true, order: after(L.warmth), points: () => fromArt(art.aura, AURA, 1.3) },
                // 2: the sling
                { colors: [0xffffff], dynamic: kindler.aimGroup, parallax: 0, drift: 0, twinkle: 0, reach: 0, look: 'hard', order: 1e6 - 1 },
                // 3: sparks
                { ...sparks.group(), order: 1e6 },
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
        stageEl?.style.removeProperty('--name-glow');
        kindler.destroy();
    });
</script>

<template>
    <div class="scene" ref="root">
        <canvas class="stageCanvas" ref="canvas"></canvas>
        <!-- The rulito is drawn on its own canvas, which the stage shows as a texture over the walker -->
        <Rulito ref="rulito" class="offstage" color="#00b4d7" />
        <div ref="walkerHit" class="hit" role="button" tabindex="0"
            :aria-label="$i18n.locale === 'en' ? 'Rub the staff until its spiral catches fire, then pull back and let go to light the cacti and the flowers' : 'Frotá el báculo hasta que su espiral se encienda, después tirá hacia atrás y soltá para encender los cactus y las flores'"
            @pointerdown.prevent="press" @keydown="onKey"></div>
    </div>
</template>

<style scoped>
    .scene {
        position: absolute;
        inset: 0;
        overflow: hidden;
        background: #1f4888;
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

    /* Rubbing and pulling drag the finger: with manipulation the phone takes it for a scroll and cancels it */
    .hit {
        position: absolute;
        left: 0;
        top: 0;
        width: 0;
        height: 0;
        border-radius: 40%;
        cursor: pointer;
        pointer-events: auto;
        touch-action: none;
        -webkit-touch-callout: none;
        user-select: none;
        -webkit-user-select: none;
        -webkit-tap-highlight-color: transparent;
        outline: none;
    }

    .hit:focus-visible {
        outline: 2px solid rgba(255, 255, 255, 0.85);
        outline-offset: 2px;
    }
</style>
