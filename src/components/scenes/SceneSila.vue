<script setup>
    // Sila: "I find peace in doing good in resonance with the voice of my soul". Under a great moon on a quiet night,
    // a heart (drawn as a little being, Fa, the heart chakra) stands on a box at a pink lectern, about to speak; Sid sits
    // beside it on the grass, listening, and the mushrooms glow in the grass round them.
    // Its verb is Resonar on time (be there at the right moment): Sid's heart beats on a steady pulse, the voice of the
    // heart ("the guide against the distractions that appear before our senses and the chatter of the mind"), while
    // little glints flash in the sky out of time. Touching the heart at the lectern (the heart, the lectern or its box: one
    // place to play) on a heartbeat makes it speak: a
    // note of the card's chord, Sol7, climbing Sol, Si, Re, Fa; and a small light leaves the lectern low over the grass,
    // in secret (the card's invitation: "in secret, do something good for others"), and lights a mushroom far from him.
    // In time, the heart and the lectern flash together and the light is seen going; a touch out of time sounds muted, the
    // heart shrinks and trembles a moment with no light (it stumbled) and on the next heartbeat Sid's heart beats bright
    // (that is where the beat is); nothing lit is lost, and that heartbeat is gone: it has to be listened to.
    // With the six mushrooms lit the card's G7 resolves to C major (as in Sacca: the root, the good done takes root),
    // their light gathers over the heart and the rulito is born there, where the card draws it, in its pink.
    // Before the first touch the heart beats in light only; from then on it is heard while someone plays. Left alone 7 s,
    // Sid's heart sends its beat to the lectern a few times (the hint, with no words). Sid is not played: a touch on him
    // only makes his heart glow a little, silent, so it does not compete with the lectern.
    // While it waits the scene is alive: the heart at the lectern breathes, sways on its feet and now and then turns to
    // Sid; Sid breathes and leans towards it when it speaks; four tufts of grass sway with the wind of the glow.
    // It is drawn in WebGL (useLayerStage): the clouds (cut out of the illustration into one atlas, drifting), the moon,
    // the grass and the figures are planes; the stipple of the moon, the stars and the orange glow of the mushrooms are
    // particles (useStardust), from silaScene.json (made by scripts/convert-sila.mjs): the glow is alive, every mote of
    // it moved by the wind and stirred by a finger. The touch targets are DOM elements kept over the lectern and Sid.
    import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { createParallax } from '../../composables/useParallax.js';
    import { createLayerStage } from '../../composables/useLayerStage.js';
    import { startStardust } from '../../composables/useStardust.js';
    import { createSparks } from '../../composables/useSparks.js';
    import { play } from '../../composables/useSound.js';
    import { sceneMilestone } from '../../analytics.js';
    import Rulito from '../Rulito.vue';
    import art from '../../composables/silaScene.json';

    const props = defineProps({
        card: { type: Object, default: () => ({}) },
        active: Boolean
    });

    const root = ref(null);
    const canvas = ref(null);
    const rulito = ref(null);
    const speakerHit = ref(null);
    const sidHit = ref(null);
    let stageEl = null;
    let stage = null;
    let parallax = null;
    let dust = null;
    let entered = false;
    let gone = false;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ---- Layout: the illustration is a 2160 square, a frame resting on the bottom of the screen; on a phone upright as
    // big as the two figures allow across. The grass reaches both sides; the clouds and the stars fill the whole sky
    const SIZE = art.size;
    const B = art.boxes;
    let F = { x: 0, y: 0, size: 1 };
    let W = 1, H = 1;
    const k = () => F.size / SIZE;
    const sx = (x) => F.x + x * k();
    const sy = (y) => F.y + y * k();
    const rectOf = ([left, top, w, h]) => ({ left: sx(left), top: sy(top), w: w * k(), h: h * k() });
    const SPAN = 1150;                      // art px the two figures need across, centred
    const layout = (w, h) => {
        W = w; H = h;
        const size = w < h ? Math.min(0.66 * h, w * SIZE / SPAN) : Math.min(Math.max(w, 0.55 * h), 0.85 * h);
        F = { x: w / 2 - size / 2, y: h - size, size };
    };

    const SLIDE = 50;
    const SLIDE_Y = 30;
    const zFor = (amp) => amp / (SLIDE + amp);
    const DEPTH = { stars: 6, moon: 9, clouds: [13, 11], ground: 24, figures: 27 };

    const CREAM = 0xfff4c8;                 // the moon
    const ORANGE = 0xffd39c;                // the glow of the mushrooms
    const PINK = 0xf38baa;                  // the lectern and the rulito
    const HEART = 0x62c37a;                 // the heart chakra (Fa): Sid's heart
    const rgb = (c) => [((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255];
    const ease = (p) => p * p * (3 - 2 * p);
    const SID_HEART = [1322, 1668];         // art px: the middle of his lower body
    const LECTERN_TOP = [944, 1382];        // art px: the star on the lectern
    const TUFTS = art.tufts;                // the tufts of grass that sway, [x, y, w, h] art px

    // ---- The clouds: each one cut out of the illustration (one atlas), resting where the card draws it and drifting
    const [AW, AH] = art.atlas;
    const clouds = art.clouds.map(([c, x, y, w, h, ax, ay], i) => ({
        c, i, art: { x: x + w / 2, y: y + h / 2, w, h }, crop: [ax / AW, ay / AH, w / AW, h / AH],
        rest: { left: 0, top: 0, w: 1, h: 1 }, x0: 0, phase: Math.random() * 6.28,
    }));
    const CLOUD_SPEED = [8, 5.5];
    let span = { left: 0, width: 1 };

    // ---- The mushrooms: where each glows (art px) and how far; every mote of their glow belongs to one
    const MUSHROOMS = art.mushrooms.map(([x, y, reach]) => ({ x, y, reach }));
    const DIM = 0.3;                        // how a mushroom glows before it is lit
    const on = MUSHROOMS.map(() => false);
    const claimed = MUSHROOMS.map(() => false);  // a light is on its way to it
    const lit = MUSHROOMS.map(() => (reduced ? 1 : DIM));
    const flash = MUSHROOMS.map(() => 0);
    const GLOW = art.glow.map(([x, y, r, m]) => {
        const M = MUSHROOMS[m];
        const out = Math.min(1, Math.hypot(x - M.x, y - M.y) / Math.max(1, M.reach));
        return { x, y, r, m, out, seed: Math.random() * 6.28 };
    });
    // The wind: a slow wave that crosses the grass from left to right, in gusts; the outer motes of a glow go farthest
    let gust = 0;
    const windAt = (t, x, seed) => (Math.sin(t * 0.9 - x * 0.0035) * 0.7 + Math.sin(t * 2.1 - x * 0.006 + seed) * 0.3);
    const glowGroup = {
        count: GLOW.length,
        update(t, data) {
            const s = k();
            const amp = (6 + 10 * gust) * Math.max(0.6, s * 2.2);
            for (let i = 0; i < GLOW.length; i++) {
                const d = GLOW[i];
                const w = reduced ? 0 : windAt(t, d.x, d.seed) * amp * (0.25 + d.out * d.out);
                const l = lit[d.m];
                data.positions[i * 3] = sx(d.x) + w;
                data.positions[i * 3 + 1] = sy(d.y) - Math.abs(w) * 0.3 - d.out * 6 * flash[d.m] * s * 4;
                data.sizes[i] = Math.max(1.2, 2 * d.r * s) * (0.8 + 0.6 * l + 0.25 * flash[d.m]);
                data.alphas[i] = Math.min(1, (0.15 + 0.85 * l) * (1 - 0.35 * d.out * (1 - l)) + 0.4 * flash[d.m]);
                const white = 0.45 * flash[d.m];
                data.tints[i * 3] = 1;
                data.tints[i * 3 + 1] = 0.827 + (1 - 0.827) * white;
                data.tints[i * 3 + 2] = 0.612 + (0.95 - 0.612) * white;
            }
        },
    };

    // ---- The beat: Sid's heart, steady and calm; lub on the beat, dub a little after
    const BEAT = 1.15;                      // s from one heartbeat to the next
    const DUB = 0.19;
    // A touch from EARLY s before a heartbeat to LATE s after it is in time: more room after, since a finger tends to
    // land just after the beat it heard or saw
    const EARLY = 0.22, LATE = 0.34;
    const AGAIN = 7;                        // s alone before the hint
    const LISTEN = 9;                       // s after the last touch the heart is still heard
    const beatOf = (t) => Math.round((t - (LATE - EARLY) / 2) / BEAT);
    let lastBeat = -1;
    let heard = false;
    let lastTouch = -Infinity;
    let hintUntil = -Infinity;
    let hintAt = AGAIN + 3;
    let missed = null;                      // the heartbeat a touch out of time used up
    let spoken = null;                      // the heartbeat a touch in time already answered
    let said = 0;                           // notes said in time: they climb the chord
    let voice = 0;                          // the heart at the lectern speaking
    let lost = 0;                           // the heart at the lectern, lost for a moment after a touch out of time
    let callAt = null;                      // then, on the next heartbeat, Sid's heart beats bright: there is the beat
    let call = 0;
    let lean = 0;                           // Sid leaning towards the heart while it speaks
    // Every LOOK s the heart at the lectern turns to Sid for a moment (0..1, eased in and out)
    const LOOK = 9;
    const turnTo = (t) => {
        const p = (Math.max(0, t) % LOOK) / 1.8;
        return p < 1 ? Math.sin(p * Math.PI) ** 2 : 0;
    };
    let heart = 0;                          // Sid's heart, now
    let wins = 0;
    let win = null;
    let glyph = { left: 0, top: 0, w: 1, h: 1 };
    const DELAY = 1.1, GROW = 2.2, KEEP = 2.8, EAT = 3.4;    // the rulito: born after the light gathers, kept, gone

    // ---- What flies (the secret lights, the beat sent in the hint, the light gathering): slots of a dynamic group
    const FLYERS = 200;
    const fly = Array.from({ length: FLYERS }, () => ({ on: false }));
    let flyNext = 0;
    const send = (from, to, { at = lastT, dur = 1.2, size = 6, c0 = CREAM, c1 = null, arc = 0.3, alpha = 1 } = {}) => {
        if (reduced) return;
        const f = fly[flyNext];
        flyNext = (flyNext + 1) % FLYERS;
        const d = Math.hypot(to.x - from.x, to.y - from.y);
        Object.assign(f, {
            on: true, at, dur, size, alpha, x0: from.x, y0: from.y, x1: to.x, y1: to.y,
            cx: (from.x + to.x) / 2 + (Math.random() - 0.5) * d * 0.2, cy: (from.y + to.y) / 2 - d * arc * (0.5 + Math.random() * 0.5),
            c0: rgb(c0), c1: rgb(c1 ?? c0),
        });
    };
    const flyers = {
        count: FLYERS,
        update(t, data) {
            for (let i = 0; i < FLYERS; i++) {
                const f = fly[i];
                let p = f.on ? (t - f.at) / f.dur : -1;
                if (f.on && p >= 1) { f.on = false; p = -1; }
                if (p < 0) { data.alphas[i] = 0; data.sizes[i] = 0; continue; }
                const e = ease(p);
                const a = 1 - e;
                data.positions[i * 3] = a * a * f.x0 + 2 * a * e * f.cx + e * e * f.x1;
                data.positions[i * 3 + 1] = a * a * f.y0 + 2 * a * e * f.cy + e * e * f.y1;
                data.sizes[i] = f.size;
                data.alphas[i] = f.alpha * Math.min(1, p * 8) * Math.min(1, (1 - p) * 4);
                for (let c = 0; c < 3; c++) data.tints[i * 3 + c] = f.c0[c] + (f.c1[c] - f.c0[c]) * e;
            }
        },
    };

    // ---- The chatter of the mind: glints that flash in the sky, never on the beat
    const GLINTS = 10;
    const glints = Array.from({ length: GLINTS }, () => ({ at: -9, x: 0, y: 0, size: 6 }));
    let glintNext = 0;
    let glintAt = 2;
    let sparkle = 0;
    const glintGroup = {
        count: GLINTS,
        update(t, data) {
            for (let i = 0; i < GLINTS; i++) {
                const g = glints[i];
                const p = (t - g.at) / 0.55;
                if (p < 0 || p > 1) { data.alphas[i] = 0; data.sizes[i] = 0; continue; }
                const v = Math.sin(Math.PI * p);
                data.positions[i * 3] = g.x;
                data.positions[i * 3 + 1] = g.y;
                data.sizes[i] = g.size * (0.6 + 0.8 * v);
                data.alphas[i] = v;
            }
        },
    };

    const sparks = createSparks(220);
    const L = {};
    let lastT = 0;

    // Where things are on screen now
    const onFigures = (x, y) => L.figures.toScreen(sx(x), sy(y));
    const lecternTop = () => onFigures(...LECTERN_TOP);
    const heartAt = () => onFigures(...SID_HEART);
    const mushroomAt = (m) => {
        const drift = stage.drift(L.groundNode.z);
        return { x: sx(MUSHROOMS[m].x) + drift.x, y: sy(MUSHROOMS[m].y) + drift.y + L.groundNode.y };
    };
    const rulitoAt = () => L.figures.toScreen(glyph.left + glyph.w / 2, glyph.top + glyph.h * 0.5);

    // ---- Touching the heart at the lectern: in time with Sid's heart, it speaks and a light goes, low, to a mushroom
    const touchSpeaker = () => {
        lastTouch = lastT;
        hintAt = lastT + AGAIN;
        if (reduced || win) { play('tap'); voice = Math.max(voice, 0.4); return; }
        const first = !heard;
        heard = true;
        const beat = beatOf(lastT);
        const off = lastT - beat * BEAT;
        const from = lecternTop();
        // Touched again on a heartbeat it already answered: nothing, it is not a stumble
        if (spoken === beat) return;
        if (off < -EARLY || off > LATE || missed === beat) {
            // The first touch, before the heart was heard, is not a stumble: it starts the heartbeat, and Sid's heart
            // beats bright on the next one, to show where it is
            if (first) { callAt = (Math.floor(lastT / BEAT) + 1) * BEAT; return; }
            // Out of time: a muted drop, nothing lost; this heartbeat is gone, the next one can be caught
            missed = beat;
            play('miss');
            lost = 1;
            voice = 0;
            callAt = (Math.floor(lastT / BEAT) + 1) * BEAT;     // on the next heartbeat
            return;
        }
        spoken = beat;
        play('resonate', { step: (said % 4) / 4 });
        said += 1;
        voice = 1;
        lost = 0;
        sparks.burst(from.x, from.y, { n: 16, colors: [PINK, CREAM, ORANGE], speed: 90, size: 4.6, spread: 12, life: 1.4 });
        // The light goes to a mushroom not yet lit, one of the farthest: low over the grass, seen going all the way
        const free = MUSHROOMS.map((_, m) => m).filter((m) => !claimed[m]);
        if (!free.length) return;
        const far = free.sort((a, b) => Math.abs(MUSHROOMS[b].x - LECTERN_TOP[0]) - Math.abs(MUSHROOMS[a].x - LECTERN_TOP[0]));
        const m = far[Math.floor(Math.random() * Math.min(2, far.length))];
        claimed[m] = true;
        const to = mushroomAt(m);
        const dur = 1.3 + Math.abs(to.x - from.x) / Math.max(W, 1) * 0.8;
        for (let j = 0; j < 4; j++) send(from, to, { dur, size: 9 - 1.5 * j, c0: CREAM, c1: ORANGE, arc: 0.12, alpha: 1 - j * 0.18, at: lastT + j * 0.06 });
        arrivals.push({ at: lastT + dur + 0.1, m });
    };
    const arrivals = [];
    const arrive = (m) => {
        on[m] = true;
        flash[m] = 1;
        if (!reduced) {
            const p = mushroomAt(m);
            sparks.burst(p.x, p.y, { n: 12, colors: [ORANGE, CREAM], speed: 60, size: 4, spread: MUSHROOMS[m].reach * k() * 0.5, life: 1.6 });
        }
        if (on.every(Boolean)) setTimeout(() => { if (!gone) complete(); }, 500);
    };
    // Sid is not played: his heart only glows a little, silent (the lectern is where the game is)
    const touchSid = () => {
        heart = Math.max(heart, 0.5);
    };
    const onKey = (event, action) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        action();
    };

    // The six lit: G7 resolves to C major, the light of every mushroom gathers over the heart at the lectern and the rulito is born there
    const complete = () => {
        if (win) return;
        wins += 1;
        win = { age: 0, head: 0, tail: 0, full: false, fullAt: 0, back: false, pop: 0 };
        rulito.value?.reshape();
        play('resolve');
        sceneMilestone('in_time', { times: wins });
        const to = rulitoAt();
        MUSHROOMS.forEach((_, m) => {
            flash[m] = 1;
            const p = mushroomAt(m);
            for (let j = 0; j < 4; j++) send(p, to, { dur: 1.1 + Math.random() * 0.6, size: 7, c0: ORANGE, c1: PINK, at: lastT + 0.3 + Math.random() * 0.5, arc: 0.35 });
        });
        heart = 1;
    };

    const build = (s) => {
        const sky = s.depth(zFor(DEPTH.stars));
        L.skyNode = sky;
        const moon = s.depth(zFor(DEPTH.moon));
        L.moonNode = moon;
        L.moonGlow = moon.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: CREAM, stops: [[0, 0.45], [0.32, 0.2], [0.62, 0]] });
        L.moon = moon.image('/assets/sila/moon.webp');
        moon.enter({ y: 30, delay: 200, duration: 2200 });
        // The clouds pass in front of the moon, as in the card
        L.clouds = [];
        [1, 0].forEach((c) => {
            const node = s.depth(zFor(DEPTH.clouds[c]));
            L[`clouds${c}`] = node;
            clouds.filter((cl) => cl.c === c).forEach((cl) => { L.clouds[cl.i] = node.image('/assets/sila/clouds.webp', { crop: cl.crop }); });
            node.enter({ y: -20 - 10 * c, delay: 150 + 120 * c, duration: 2000 });
        });
        // The grass reaches both sides: the picture with a mirrored copy on each side; the rocks and mushrooms on it
        const ground = s.depth(zFor(DEPTH.ground));
        L.groundNode = ground;
        L.ground = [-1, 0, 1].map((side) => {
            const node = ground.image('/assets/sila/ground.webp');
            if (side) node.sx = -1;
            return { node, side };
        });
        L.glows = MUSHROOMS.map(() => {
            const g = ground.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: ORANGE, stops: [[0, 0.5], [0.4, 0.2], [0.75, 0]], bloom: true });
            g.opacity = 0;
            return g;
        });
        L.rocks = ground.image('/assets/sila/rocks.webp');
        L.lines = ground.image('/assets/sila/lines.webp');
        // The four big tufts of grass, cut out of the line work (scripts/split-sila-grass.mjs), sway with the same wind as
        // the glow: its wave crosses them from left to right (the phase), in gusts (the amplitude, set every frame)
        const [, , GW, GH] = B.grass;
        L.tufts = TUFTS.map(([x, y, w, h]) => {
            const tuft = ground.image('/assets/sila/grass.webp', { crop: [(x - B.grass[0]) / GW, (y - B.grass[1]) / GH, w / GW, h / GH], wind: { amp: 4, speed: 0.9 } });
            tuft.uniforms.uWind.value.w = -(x + w / 2) * 0.0035;
            return tuft;
        });
        L.sparkle = ground.image('/assets/sila/sparkle.webp');
        ground.enter({ y: 50, delay: 100, duration: 1600 });
        // The figures: Sid with the light of his heart, the box, the heart at its lectern, and the rulito over it
        const figures = s.depth(zFor(DEPTH.figures));
        L.figuresNode = figures;
        L.figures = figures.group();
        L.heart = L.figures.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: HEART, stops: [[0, 0.55], [0.3, 0.25], [0.65, 0]], bloom: true });
        L.sid = L.figures.image('/assets/sila/sid.webp');
        L.heartCore = L.figures.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: 0xd9ffd0, stops: [[0, 0.5], [0.4, 0.15], [0.8, 0]], bloom: true });
        L.box = L.figures.image('/assets/sila/box.webp');
        L.voice = L.figures.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: PINK, stops: [[0, 0.5], [0.3, 0.22], [0.66, 0]], bloom: true });
        L.voice.opacity = 0;
        L.particular = L.figures.image('/assets/sila/particular.webp');
        L.lectern = L.figures.image('/assets/sila/lectern.webp');
        L.lecternGlow = L.figures.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: 0xffd6e2, stops: [[0, 0.7], [0.3, 0.3], [0.7, 0]], bloom: true });
        L.lecternGlow.opacity = 0;
        L.rulito = L.figures.canvas(rulito.value.canvas, { bloom: true });
        figures.enter({ y: 70, delay: 350, duration: 1900 });
    };

    const place = (w, h) => {
        layout(w, h);
        const phone = w < h;
        // The night sky of the card, a little deeper above
        const at = (y) => `${Math.max(0, Math.min(100, sy(y) / h * 100)).toFixed(1)}%`;
        root.value.style.background = `linear-gradient(to bottom, #6597b6 0%, #72a3c0 ${at(200)}, #77a7c3 ${at(1100)}, #82afc8 ${at(1740)}, #82afc8 100%)`;

        // The clouds where the card draws them, spread a little over a wide sky and never over the card's name; they
        // drift and wrap round
        const scale = k() * (phone ? 1.15 : 1);
        const wide = Math.max(w, F.size);
        let widest = 0;
        clouds.forEach((cl) => {
            const cw = cl.art.w * scale, ch = cl.art.h * scale;
            const x = w / 2 + (cl.art.x - 1080) / SIZE * wide;
            const y = Math.max(titleBottom(h) + 16 + ch / 2, sy(cl.art.y));
            cl.x0 = x;
            cl.rest = { left: x - cw / 2, top: y - ch / 2, w: cw, h: ch };
            widest = Math.max(widest, cw);
            L.clouds[cl.i].place(cl.rest);
        });
        span = { left: -SLIDE * 2 - widest / 2, width: w + SLIDE * 4 + widest };

        const moon = rectOf(B.moon);
        L.moon.place(moon);
        const md = moon.w * 1.45;
        L.moonGlow.place({ left: moon.left + moon.w / 2 - md / 2, top: moon.top + moon.h / 2 - md / 2, w: md, h: md });

        const ground = rectOf(B.ground);
        L.ground.forEach(({ node, side }) => node.place({ ...ground, left: ground.left + side * ground.w }));
        L.rocks.place(rectOf(B.rocks));
        L.lines.place(rectOf(B.lines));
        TUFTS.forEach((t, i) => L.tufts[i].place(rectOf(t)));
        const sp = rectOf(B.sparkle);
        L.sparkle.place(sp, { x: sp.left + sp.w / 2, y: sp.top + sp.h / 2 });
        MUSHROOMS.forEach((M, m) => {
            const d = M.reach * 2.6 * k();
            L.glows[m].place({ left: sx(M.x) - d / 2, top: sy(M.y) - d / 2, w: d, h: d });
        });

        const sid = rectOf(B.sid);
        L.sid.place(sid, { x: sid.left + sid.w / 2, y: sid.top + sid.h * 0.75 });
        const hd = 520 * k(), hc = 190 * k();
        L.heart.place({ left: sx(SID_HEART[0]) - hd / 2, top: sy(SID_HEART[1]) - hd / 2, w: hd, h: hd });
        L.heartCore.place({ left: sx(SID_HEART[0]) - hc / 2, top: sy(SID_HEART[1]) - hc / 2, w: hc, h: hc });
        L.box.place(rectOf(B.box));
        const pr = rectOf(B.particular);
        // He speaks from the box: he stretches up from his feet
        L.particular.place(pr, { x: pr.left + pr.w / 2, y: sy(1690) });
        const vd = pr.w * 1.6;
        L.voice.place({ left: sx(800) - vd / 2, top: sy(1300) - vd / 2, w: vd, h: vd });
        L.lectern.place(rectOf(B.lectern));
        const ld = 260 * k();
        L.lecternGlow.place({ left: sx(LECTERN_TOP[0]) - ld / 2, top: sy(LECTERN_TOP[1]) - ld / 2, w: ld, h: ld });
        L.figures.pivot = { x: sx(1080), y: sy(1900) };
        // The rulito where the card draws it (its canvas is bigger than the glyph, for the glow)
        const r = rectOf(art.rulito);
        const rh = r.h, rw = rh * 32 / 86;
        glyph = { left: r.left + r.w / 2 - rw / 2, top: r.top, w: rw, h: rh };
        L.rulito.place({ left: glyph.left - 0.4375 * glyph.w, top: glyph.top - 0.1628 * glyph.h, w: glyph.w * 1.875, h: glyph.h * 1.3256 },
            { x: glyph.left + glyph.w / 2, y: glyph.top + glyph.h });
    };

    // Where the card's name ends (the stage's h1, over the scene), so the clouds keep under it
    const titleBottom = (h) => {
        const title = stageEl?.querySelector('h1');
        if (!title || !root.value) return 0.05 * h;
        return title.getBoundingClientRect().bottom - root.value.getBoundingClientRect().top;
    };

    // The touch targets: one place to play, the heart with its lectern and its box; and Sid
    const placeHits = () => {
        if (!L.figures) return;
        const put = (el, b, min = 48) => {
            const bw = Math.max(min, b.width), bh = Math.max(min, b.height);
            el.style.translate = `${(b.left + b.width / 2 - bw / 2).toFixed(1)}px ${(b.top + b.height / 2 - bh / 2).toFixed(1)}px`;
            el.style.width = `${bw.toFixed(1)}px`;
            el.style.height = `${bh.toFixed(1)}px`;
        };
        if (speakerHit.value) put(speakerHit.value, L.figures.boxOnScreen(rectOf([610, 1140, 480, 785])));
        if (sidHit.value) put(sidHit.value, L.figures.boxOnScreen(rectOf([1170, 1220, 380, 600])));
    };

    // On a phone, a finger put down on the lectern, on Sid or on the glow of a mushroom must not move the page: otherwise
    // the browser takes a drag (stirring the glow, or a tap that slides a little) for a scroll and cancels it. Anywhere
    // else the page scrolls as usual
    const TOUCH_MIN = 44;                   // px: how near a small mushroom a finger may land and still stir it
    const onTouchStart = (event) => {
        const touch = event.touches[0];
        if (!touch || !event.cancelable || !stage || !root.value) return;
        const box = root.value.getBoundingClientRect();
        const x = touch.clientX - box.left, y = touch.clientY - box.top;
        const onMushroom = MUSHROOMS.some((M, m) => {
            const p = mushroomAt(m);
            return Math.hypot(p.x - x, p.y - y) < Math.max(TOUCH_MIN, M.reach * k());
        });
        if (onMushroom) event.preventDefault();
    };

    const enter = () => {
        if (entered || !props.active || !stage) return;
        entered = true;
        stage.ready().then(() => { if (!gone) { stage.start(); dust?.reveal(); } });
    };

    // A glint in the sky, out of time (the chatter): somewhere in the sky, away from the figures
    const glint = () => {
        const g = glints[glintNext];
        glintNext = (glintNext + 1) % GLINTS;
        g.at = lastT;
        g.x = Math.random() * W;
        g.y = Math.random() * Math.min(sy(1300), H * 0.7);
        g.size = 5 + Math.random() * 6;
        if (Math.random() < 0.25) sparkle = 1;
    };

    let frames = 0;
    const frame = ({ x, y, scroll, t, ramp }) => {
        if (!stage || !L.figures) return;
        const dt = Math.min(0.1, Math.max(0, t - lastT));
        lastT = t;
        stage.look(x * SLIDE, y * SLIDE_Y);

        // ---- The heart: lub on each beat, dub after it; heard while someone plays
        const beat = beatOf(t);
        const sinceBeat = t - Math.floor(t / BEAT) * BEAT;
        const lub = Math.exp(-sinceBeat * 7);
        const dub = sinceBeat > DUB ? 0.6 * Math.exp(-(sinceBeat - DUB) * 7) : 0;
        const pulse = reduced ? 0 : Math.max(lub, dub) * ramp;
        const crossed = Math.floor(t / BEAT) !== lastBeat;
        if (crossed && ramp > 0.9 && !reduced) {
            lastBeat = Math.floor(t / BEAT);
            if (heard && t - lastTouch < LISTEN && !win) play('heartbeat', 0.8);
            // The hint: the heart sends its beat to the lectern
            if (t < hintUntil) {
                const from = heartAt(), to = lecternTop();
                for (let j = 0; j < 4; j++) send(from, to, { dur: BEAT * 0.95, size: 5, c0: 0xd9ffd0, c1: PINK, arc: 0.25, alpha: 0.8, at: t + j * 0.04 });
            }
        }
        if (!win && !reduced && ramp > 0.9 && t > hintAt) { hintUntil = t + 3 * BEAT; hintAt = t + AGAIN + 3 * BEAT; }
        // The lectern answers on the beat while the hint lasts (just as the light sent the beat before arrives)
        const hinting = t < hintUntil + BEAT;
        L.lecternGlow.opacity = Math.max(hinting ? 0.8 * lub : 0, ease(voice));
        L.lecternGlow.mesh.visible = L.lecternGlow.opacity > 0.01;
        missed = missed !== null && missed < beat - 1 ? null : missed;

        // ---- The chatter: glints in the sky out of time
        if (!reduced && t > glintAt && ramp > 0.9) {
            const off = t - beatOf(t) * BEAT;
            if (off < -EARLY - 0.1 || off > LATE + 0.1) { glint(); glintAt = t + 0.6 + Math.random() * 1.8; }
        }
        sparkle = Math.max(0, sparkle - dt * 2.2);
        L.sparkle.scale = 1 + 0.6 * ease(sparkle);
        L.sparkle.rotate = 40 * sparkle;
        L.sparkle.uniforms.uBright.value = 1 + 0.4 * sparkle;

        // ---- The secret lights arriving at their mushrooms
        for (let i = arrivals.length - 1; i >= 0; i--) if (t >= arrivals[i].at) { arrive(arrivals[i].m); arrivals.splice(i, 1); }

        // ---- The win: the rulito is born over the heart at the lectern, kept, gone; then the mushrooms go back to waiting
        let named = 0;
        if (win && rulito.value) {
            win.age += dt;
            win.pop = Math.max(0, win.pop - dt * 2.2);
            win.head = 1 - (1 - Math.min(1, Math.max(0, (win.age - DELAY) / GROW))) ** 1.6;
            if (win.head >= 1 && !win.full) { win.full = true; win.fullAt = win.age; win.pop = 1; play('rulito'); heart = 1; }
            if (win.full && !win.back && win.age - win.fullAt > KEEP) { win.back = true; on.fill(false); claimed.fill(false); said = 0; }
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
                hintAt = t + AGAIN;
            }
        }
        stageEl?.style.setProperty('--name-glow', named.toFixed(3));
        const together = on.filter(Boolean).length / MUSHROOMS.length;
        stage.bloom = Math.max(named, 0.2 * together * together);

        // ---- The mushrooms: a lit one glows full and breathes with the heart; the others wait, dim
        gust = 0.5 + 0.5 * Math.sin(t * 0.21) * Math.sin(t * 0.13 + 1);
        L.tufts.forEach((tuft) => { tuft.uniforms.uWind.value.x = reduced ? 0 : (2.5 + 5 * gust) * ramp; });
        MUSHROOMS.forEach((_, m) => {
            const goal = reduced ? 1 : on[m] ? 1 : DIM;
            lit[m] += (goal - lit[m]) * Math.min(1, dt * (on[m] ? 3 : 0.5));
            flash[m] = Math.max(0, flash[m] - dt * 0.9);
            const g = L.glows[m];
            g.opacity = Math.min(1, 0.15 + 0.6 * (lit[m] - DIM) / (1 - DIM) + 0.2 * pulse * (on[m] ? 1 : 0) + 0.5 * flash[m]);
            g.scale = 1 + 0.15 * flash[m] + 0.04 * pulse * (on[m] ? 1 : 0);
            g.mesh.visible = g.opacity > 0.01;
        });

        // ---- The clouds drift, rise and fall and billow as they go; the moon breathes
        clouds.forEach((cl) => {
            const node = L.clouds[cl.i];
            const moved = cl.x0 - CLOUD_SPEED[cl.c] * t;
            const wrapped = span.left + ((((moved - span.left) % span.width) + span.width) % span.width);
            node.x = wrapped - cl.x0;
            const billow = Math.sin(t * 0.8 + cl.phase);
            node.y = Math.sin(t * 0.35 + cl.phase) * 7 * ramp;
            node.rotate = Math.sin(t * 0.25 + cl.phase * 2) * 1.5 * ramp;
            node.sx = 1 + 0.05 * billow * ramp;
            node.sy = 1 - 0.035 * billow * ramp;
        });
        L.moonGlow.opacity = 0.45 + 0.08 * Math.sin(t * 0.5) + 0.2 * named;
        L.moonNode.y = Math.sin(t * 0.2) * 3 * ramp + scroll * 12;
        L.groundNode.y = scroll * 24;
        L.figuresNode.y = scroll * 28;

        // ---- Sid's heart beats; the heart at the lectern stretches up as it speaks, and shrinks and trembles when lost
        heart = Math.max(0, heart - dt * 0.8);
        const h = Math.min(1, pulse + 0.6 * heart);
        // After a touch out of time, Sid's heart beats bright on the next heartbeat: there is the beat
        if (callAt !== null && t >= callAt) { callAt = null; call = 1; }
        call = Math.max(0, call - dt * 1.3);
        const c = ease(call);
        L.heart.opacity = Math.min(1, 0.18 + 0.55 * h + 0.25 * together + 0.5 * c);
        L.heart.scale = 1 + 0.12 * h + 0.45 * c;
        L.heartCore.opacity = Math.min(1, 0.1 + 0.7 * h + 0.4 * c);
        L.heartCore.scale = 1 + 0.2 * h + 0.5 * c;
        // Sid listens: he breathes slowly and, when the heart speaks, leans a little towards it
        voice = Math.max(0, voice - dt * 2);
        const v = ease(voice);
        lean += ((voice > 0.3 && !reduced ? 1 : 0) - lean) * Math.min(1, dt * (voice > 0.3 ? 4 : 0.9));
        const sidBreath = Math.sin(t * 0.75) * ramp;
        L.sid.sy = 1 + 0.008 * pulse + 0.014 * sidBreath;
        L.sid.sx = 1 + 0.008 * pulse - 0.005 * sidBreath;
        L.sid.rotate = -2.5 * ease(lean);
        L.sid.y = Math.sin(t * 0.7) * 1.5 * ramp;
        // The heart at the lectern, alive while it waits: it breathes, sways a little on its feet and now and then turns
        // to Sid (to the right) for a moment
        const turn = reduced ? 0 : turnTo(t);
        // Lost (a touch out of time): it shrinks and trembles a moment, as if it stumbled
        lost = Math.max(0, lost - dt * 1.6);
        const lo = ease(lost);
        L.particular.sy = (1 + 0.06 * v + 0.014 * Math.sin(t * 0.9) * ramp) * (1 - 0.1 * lo);
        L.particular.sx = (1 - 0.025 * v - 0.006 * Math.sin(t * 0.9) * ramp) * (1 - 0.06 * lo);
        L.particular.uniforms.uBright.value = 1 + 0.25 * v + 0.15 * named;
        L.particular.rotate = Math.sin(t * 26) * 3 * lo + (Math.sin(t * 0.55) * 1.2 * ramp + 3.5 * turn) * (1 - lo);
        L.voice.opacity = Math.min(1, v + 0.55 * named);
        L.voice.scale = 1 + 0.25 * v;
        L.voice.mesh.visible = L.voice.opacity > 0.01;

        // The particles that belong to a layer follow it
        const skyDrift = stage.drift(L.skyNode.z), moonDrift = stage.drift(L.moonNode.z), groundDrift = stage.drift(L.groundNode.z);
        dust?.shift(0, skyDrift.x, skyDrift.y);
        dust?.shift(1, moonDrift.x, moonDrift.y + L.moonNode.y);
        dust?.shift(2, groundDrift.x, groundDrift.y + L.groundNode.y);
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
        const fromArt = (list) => list.map(([x, y, r, c]) => [sx(x), sy(y), Math.max(1.2, 2 * r * k()), art.colors[c]]);
        // The stars of the card, and as many again over the sky the frame does not cover
        const stars = () => {
            const own = fromArt(art.dots.stars);
            const density = art.dots.stars.length / (F.size * F.size * 0.75);
            const more = [];
            const want = Math.min(260, Math.round(density * Math.max(0, W * H - F.size * F.size)));
            for (let tries = 0; more.length < want && tries < want * 6; tries++) {
                const px = Math.random() * W, py = Math.random() * Math.min(H, sy(1650));
                if (px > F.x && px < F.x + F.size && py > F.y) continue;
                more.push([px, py, (1.6 + Math.random() ** 2 * 3) * Math.max(0.7, k() * 2.5), ORANGE]);
            }
            return [...own, ...more];
        };
        dust = startStardust(null, {
            stage,
            manual: true,
            groups: [
                // 0: the stars, behind the clouds and the moon
                { colors: [ORANGE], parallax: 0, drift: 1, twinkle: 0.45, reach: 0, order: -20, points: stars },
                // 1: the stipple round the moon
                { colors: [CREAM], parallax: 0, drift: 1.6, jitter: 0.2, twinkle: 0.3, reach: 0, order: after(L.moon), points: () => fromArt(art.dots.moon) },
                // 2: the glow of the mushrooms, over the rocks and under the line work, alive: the wind moves it and a finger stirs it
                { dynamic: glowGroup, parallax: 0, drift: 1.2, jitter: 0.35, twinkle: 0.2, reach: 80, push: 18, bloom: true, order: after(L.rocks) },
                // 3: the glints in the sky (the chatter)
                { colors: [0xfff6d8], dynamic: glintGroup, look: 'soft', parallax: 0, drift: 0, twinkle: 0, reach: 0, order: after(L.moon) + 0.1 },
                // 4: the secret lights, the hint and the light gathering
                { dynamic: flyers, look: 'soft', parallax: 0, drift: 1.2, twinkle: 0.2, reach: 0, bloom: true, order: after(L.lectern) + 1 },
                // 5: sparks
                { ...sparks.group(), order: after(L.lectern) + 2 },
            ],
        });
        if (reduced) dust.reveal();
        root.value.addEventListener('touchstart', onTouchStart, { passive: false });
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
        root.value?.removeEventListener('touchstart', onTouchStart);
        stageEl?.style.removeProperty('--name-glow');
    });
</script>

<template>
    <div class="scene" ref="root">
        <canvas class="stageCanvas" ref="canvas"></canvas>
        <!-- The rulito is drawn on its own canvas, which the stage shows as a texture over the heart at the lectern -->
        <Rulito ref="rulito" class="offstage" color="#f38baa" />
        <div ref="sidHit" class="hit" role="button" tabindex="0"
            :aria-label="$i18n.locale === 'en' ? 'Sid, listening to his heart' : 'Sid, escuchando su corazón'"
            @pointerdown.prevent="touchSid" @keydown="onKey($event, touchSid)"></div>
        <div ref="speakerHit" class="hit" role="button" tabindex="0"
            :aria-label="$i18n.locale === 'en' ? 'The heart at the lectern: touch it on each heartbeat' : 'El corazón en el atril: tocalo con cada latido'"
            @pointerdown.prevent="touchSpeaker" @keydown="onKey($event, touchSpeaker)"></div>
    </div>
</template>

<style scoped>
    .scene {
        position: absolute;
        inset: 0;
        overflow: hidden;
        background: #77a7c3;
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

    /* A tap that slides a little must not be taken for a scroll (the beat would be lost): the page scrolls from
       anywhere else */
    .hit {
        position: absolute;
        left: 0;
        top: 0;
        width: 0;
        height: 0;
        border-radius: 45%;
        cursor: pointer;
        pointer-events: auto;
        -webkit-tap-highlight-color: transparent;
        touch-action: none;
        -webkit-touch-callout: none;
        user-select: none;
        -webkit-user-select: none;
        outline: none;
    }

    .hit:focus-visible {
        outline: 2px solid rgba(255, 244, 200, 0.95);
        outline-offset: 4px;
    }
</style>
