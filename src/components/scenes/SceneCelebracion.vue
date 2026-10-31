<script setup>
    // Celebración: "I celebrate life, its transits and this particular moment". At night, in a clearing between two big
    // pink trees, the Samas and the little beings of the wood sit round a bonfire: one stands on the left with a fox curled
    // at his feet, one sits cross-legged with a kitten in his lap and a bowl in his hand, one stands on the right with his
    // staff and a fox beside him; cats, a pink family hugging by a cup, little hairy ones and mushrooms gather round, and
    // behind them a fern holds up five glowing lamp flowers.
    // Its verb is Fluir, with the engine shared by the cards of the verb (useFlow.js): a spark leaves the fire and goes
    // round the circle, by the feet of each of them, as a finger slides with it, at its own pace (never faster; alone
    // it does not move), beads of light running on ahead of it. Each one it comes to is a knot: reached accompanied, it
    // hops, lights up warm and the flame grows a little; and on goes the spark. Back in the fire with everyone lit, the
    // fire leaps, everyone hops at once and the rulito is born over the flame, the name lights up; then the spark is
    // born again in the fire. Besides, everything is alive. The fire flickers (the pink flame
    // and its yellow heart sway and stretch each on its own, in the shader's wind, about the logs) and throws embers that
    // rise and fade; its warm light breathes on the ground. The lamps sway on their stems with the fern and breathe their
    // light, their stippled halos are particles that go with them; the little mushrooms on the ground glow (particles
    // too) and the stars twinkle. The Samas breathe from their feet, the one sitting rocks gently as if humming, the one
    // on the left blinks now and then; the foxes, the cats and the little ones breathe, and the leaves on the heads and
    // the antennae sway in the wind. A tap on one of them makes it give a little hop (`tap`); a tap anywhere else strums
    // the card's chord (`star`): the fire flares, a burst of embers goes up and the lamps and the glows flare.
    // The sky is not a picture: the card's colour (no layer draws it), a little deeper at the top; nor is the flat blue
    // of the ground, filled in code under its top edge (worked out by the converter) and carried on past the frame. The
    // stars, the stipple of the lamps and of the glowing mushrooms and the embers are particles; the lamps' yellow
    // middles are discs and every light is a glow in code. Drawn in WebGL (useLayerStage): the land (the trees, the marks
    // of the ground, the fern and the lamps), the beings behind the fire, the fire and the beings in front are planes at
    // four depths; on a wide screen the ground goes on past the frame (its marks mirrored), and where the frame leaves
    // sky over the trees they end in crowns borrowed from Belleza (and the left one's branch goes on beside it). From
    // celebracionScene.json and public/assets/celebracion (made by scripts/convert-celebracion.mjs, then
    // scripts/make-celebracion-crowns.mjs).
    import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { createParallax } from '../../composables/useParallax.js';
    import { createLayerStage } from '../../composables/useLayerStage.js';
    import { startStardust } from '../../composables/useStardust.js';
    import { play } from '../../composables/useSound.js';
    import { createFlow, routeThrough } from '../../composables/useFlow.js';
    import { sceneMilestone } from '../../analytics.js';
    import Rulito from '../Rulito.vue';
    import art from '../../composables/celebracionScene.json';

    const props = defineProps({
        card: { type: Object, default: () => ({}) },
        active: Boolean
    });

    const root = ref(null);
    const canvas = ref(null);
    const groundCanvas = ref(null);
    const headHit = ref(null);              // where the spark is: Enter held on it goes with it
    const rulito = ref(null);
    let stageEl = null;                     // the card's stage, where the name is lit from (--name-glow)
    let stage = null;
    let parallax = null;
    let dust = null;
    let entered = false;
    let gone = false;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const asset = (name) => `/assets/celebracion/${name}.webp`;

    // ---- Layout: the illustration is a 2160 square resting on the bottom of the screen. On a phone upright it is as big
    // as the beings round the fire allow across (SPAN), centred on the fire; on a wide screen it fills the height (a
    // little of the ground goes under the bottom edge) and the land goes on past it on both sides
    const SIZE = art.size;
    const B = art.boxes;
    let F = { x: 0, y: 0, size: 1 };
    let W = 1;
    const k = () => F.size / SIZE;
    const sx = (x) => F.x + x * k();
    const sy = (y) => F.y + y * k();
    const rectOf = ([left, top, w, h]) => ({ left: sx(left), top: sy(top), w: w * k(), h: h * k() });
    const SPAN = 2100, FOCUS = 1115;        // art px across that must be seen on a phone (everyone round the fire whole, with a little air), and their middle
    const DROP = 0.06;                      // how much of the frame goes under the bottom of a wide screen
    const layout = (w, h) => {
        W = w;
        const phone = w < h;
        const size = phone ? Math.min(0.72 * h, w * SIZE / SPAN) : Math.max(0.62 * w, 1.02 * h);
        let x = w / 2 - size / 2;
        if (phone && size > w) x = Math.min(0, Math.max(w - size, w / 2 - FOCUS * size / SIZE));
        F = { x, y: h - size * (1 - (phone ? 0.02 : DROP)), size };
    };

    const SLIDE = 40;
    const SLIDE_Y = 24;
    const zFor = (amp) => amp / (SLIDE + amp);
    const DEPTH = { stars: 4, land: 12, behind: 17, fire: 20, front: 24 };
    const MARGIN = SLIDE * 2 + 40;          // how far past the screen what is drawn in code reaches, for the parallax

    // ---- The ground's top edge (art px, every few px across), mirrored past the frame
    const EDGE = art.ground.edge;
    const STEP = EDGE[1][0] - EDGE[0][0];
    const edgeAt = (ax) => {
        let m = ((ax % (2 * SIZE)) + 2 * SIZE) % (2 * SIZE);
        if (m > SIZE) m = 2 * SIZE - m;
        const i = Math.min(EDGE.length - 2, Math.floor(m / STEP));
        const [x0, y0] = EDGE[i], [x1, y1] = EDGE[i + 1];
        return y0 + (y1 - y0) * Math.min(1, Math.max(0, (m - x0) / Math.max(1, x1 - x0)));
    };
    const HORIZON = Math.max(...EDGE.map(([, y]) => y));

    // ---- The beings round the fire, each a picture, by the row they sit in (drawn in this order)
    const BEHIND = ['catBack', 'seated', 'jar', 'trio', 'cup', 'pink', 'spark', 'samaRight', 'foxRight'];
    const FRONT = ['catFront', 'mushrooms', 'hairy', 'foxLeft', 'samaLeft'];
    // How each one lives: breath (how much it swells), its pace, wind on its leaves and antennae, and whether a tap makes it hop
    const LIFE = {
        catBack: { breath: 0.02, pace: 1.6, hop: true },
        seated: { breath: 0.014, pace: 0.9, hop: true },
        jar: {},
        trio: { breath: 0.02, pace: 1.2, wind: 4, hop: true },
        cup: {},
        pink: { breath: 0.024, pace: 1.4, wind: 3, hop: true },
        spark: { breath: 0.02, pace: 1.7, wind: 2.5, hop: true },
        samaRight: { breath: 0.01, pace: 0.8, hop: true },
        foxRight: { breath: 0.016, pace: 1.1, hop: true },
        catFront: { breath: 0.022, pace: 1.5, hop: true },
        mushrooms: { breath: 0.03, pace: 0.7, hop: true },
        hairy: { breath: 0.02, pace: 1.9, wind: 3, hop: true },
        foxLeft: { breath: 0.018, pace: 1.0, hop: true },
        samaLeft: { breath: 0.012, pace: 0.85, hop: true },
    };
    const phaseOf = Object.fromEntries(Object.keys(LIFE).map((name, i) => [name, i * 1.7]));
    const hops = {};
    const litGlow = {};

    // ---- Fluir: the spark's way round the circle, in art px on the ground: out of the fire, by the feet of the cat
    // behind, behind the fire to the pink family and the trio, the Sama on the right and his fox, the cat in front,
    // round the front of the fire to the little hairy one, the Sama on the left (and the fox at his feet), the
    // mushrooms and the one sitting, and back into the fire. The little one at the right edge is left out: on a phone
    // it is off the screen, and the way keeps a little inside the ones at the edges of a phone. Each [x, y, name]
    // waypoint with a name is a knot at that one's feet
    const WAY = [
        [1079, 1640], [990, 1520], [828, 1384, 'catBack'], [940, 1395], [1080, 1418], [1210, 1432], [1318, 1446, 'pink'],
        [1440, 1556, 'trio'], [1620, 1574], [1790, 1574, 'samaRight'], [1860, 1630], [1872, 1712, 'foxRight'],
        [1800, 1770], [1666, 1790, 'catFront'], [1430, 1950], [1080, 1990], [820, 1930], [682, 1846, 'hairy'],
        [500, 1940], [372, 1934, 'samaLeft'], [440, 1830], [551, 1764, 'mushrooms'], [600, 1680], [626, 1604, 'seated'],
        [800, 1620], [960, 1680], [1079, 1720],
    ];
    const ROUND = routeThrough(WAY.map(([x, y]) => [x, y]), 8);
    const RX = (i) => ROUND.xs[i], RY = (i) => ROUND.ys[i];
    const KNOTS = WAY.map((w, i) => [w[2], ROUND.index(i)]).filter(([name]) => name)
        .map(([name, at]) => ({ name, enter: at - 3, exit: at + 3 }));
    const LIT = Object.fromEntries(KNOTS.map(({ name }) => [name, 0]));    // how lit each one is (0..1)
    const PAIRED = { samaLeft: 'foxLeft' };  // the fox at his feet hops and lights with him
    const cur = { alpha: 1, light: 0 };
    let keyHold = false;
    const pointer = { u: 0, v: 0, at: -99, down: false, touch: false };
    let slid = false;
    let win = null;
    let wins = 0;
    let grown = 0;                          // how much the flame has grown with the ones lit (0..1)
    const reached = new Set();
    const flow = createFlow({
        x: RX, y: RY, n: ROUND.n,
        stops: KNOTS,
        pace: 52,                           // about 20 s round the circle with a finger
        ahead: 50, behind: 12, lead: 6, press: 10, fill: 0.35,
        reach: 160, touchReach: 240,
        isOpen: (s) => reached.has(s.name),
        release: (s) => {
            if (reached.has(s.name)) return;
            reached.add(s.name);
            [s.name, PAIRED[s.name]].filter(Boolean).forEach((name) => { hops[name] = 0; });
            play('tap');
            flare = Math.max(flare, 0.4);
            for (let i = 0; i < 5; i++) spawnEmber(lastT, 0.6);
        },
        onPass: (s) => { LIT[s.name] = 1; },
        onEnd: () => finish(),
        onNote: (step, level) => play('flow', { step, level }),
        onFirst: () => sceneMilestone('current_accompanied'),
    });

    // ---- The fire
    const FIRE = art.fire;
    const EMBER_COLOURS = [[1, 0.886, 0.522], [0.878, 0.486, 0.678], [1, 0.95, 0.84], [1, 0.72, 0.6]];
    const flicker = (t, s = 0) => Math.sin(t * 7.1 + s) * 0.5 + Math.sin(t * 11.3 + 1 + s * 2) * 0.3 + Math.sin(t * 17.9 + 2 + s * 3) * 0.2;
    let flare = 0;
    let lastT = 0;
    const EMBERS = 46;
    const embers = Array.from({ length: EMBERS }, () => ({ born: -10, life: 1, x: 0, y: 0, vy: 0, wob: 0, size: 3, tint: EMBER_COLOURS[0] }));
    let nextEmber = 0;
    const spawnEmber = (t, fast = 0) => {
        const e = embers.reduce((oldest, each) => (each.born + each.life < oldest.born + oldest.life ? each : oldest), embers[0]);
        const [fx, , fw, fh] = B.flame;
        Object.assign(e, {
            born: t, life: 2.2 + Math.random() * 1.6 - fast * 0.6,
            x: fx + fw * (0.3 + Math.random() * 0.4), y: B.flame[1] + fh * (0.12 + Math.random() * 0.3),
            vy: 120 + Math.random() * 100 + fast * 160, vx: (Math.random() - 0.5) * (40 + fast * 220), wob: Math.random() * 6.28,
            size: 3 + Math.random() * 3, tint: EMBER_COLOURS[Math.floor(Math.random() * EMBER_COLOURS.length)],
        });
    };
    const emberGroup = {
        count: EMBERS,
        update(t, data) {
            embers.forEach((e, i) => {
                const age = t - e.born;
                if (reduced || age < 0 || age > e.life) { data.alphas[i] = 0; return; }
                const p = age / e.life;
                const ax = e.x + e.vx * age + Math.sin(age * 3 + e.wob) * 16;
                const ay = e.y - e.vy * age;
                data.positions[i * 3] = sx(ax);
                data.positions[i * 3 + 1] = sy(ay);
                data.sizes[i] = Math.max(1.2, e.size * Math.min(1.6, k() * 3) * (1 - p * 0.5));
                data.alphas[i] = Math.min(1, p * 6) * (1 - p) ** 0.8;
                data.tints.set(e.tint, i * 3);
            });
        },
    };

    // ---- The lamps: their stems sway in the wind of the shader; each yellow middle, its light and its halo go with the
    // top of its stem (the same wave, worked out here)
    const LAMPS = art.lamps;
    const STEM_WIND = { amp: 7, speed: 0.7, root: 'bottom' };
    const STEM_PHASE = 1.3;
    const lampOffset = (i, t) => {
        const r = L.stems?.rect;
        if (!r) return 0;
        const [bx, by, bw, bh] = B.stems;
        const u = (LAMPS[i].x - bx) / bw, v = 1 - (LAMPS[i].y - by) / bh;
        const along = u * r.w * 0.012 + STEM_PHASE;
        const s = Math.sin(t * STEM_WIND.speed + along) * 0.7 + Math.sin(t * STEM_WIND.speed * 2.3 + along * 1.9) * 0.3;
        return s * STEM_WIND.amp * v * v;
    };

    // ---- The roof of leaves over the frame, on a phone: its lower edge (art px), lumpy as a canopy seen from under it
    const ROOF = 120;
    const ROOF_COLOUR = '#2a7a82';          // Belleza's canopy teal, at night
    const roofCanvas = document.createElement('canvas');
    // The shelves across the trunks round where the card cuts them, three on each: [which of the canopy's leaves, its
    // middle (x, y) and how wide it is, in art px, and whether it is turned round]
    const SEAMS = [
        [0, 236, -18, 330, false], [4, 330, -95, 250, true], [10, 200, 40, 230, false],
        [2, 1695, -18, 470, false], [0, 1600, -105, 320, true], [4, 1800, 45, 300, false],
    ];
    // The roof's leaves: Belleza's, and as many again moved half the width across and a little lower, turned round
    const ROOF_LEAVES = [
        ...art.canopy.map(([x, y, w, h, ax, ay]) => ({ box: [x, y, w, h], at: [ax, ay], flip: false })),
        ...art.canopy.map(([x, y, w, h, ax, ay]) => ({ box: [(x + 1080) % 2160, y + 90, w, h], at: [ax, ay], flip: true })),
    ];
    const roofEdge = (ax) => ROOF + 38 * Math.sqrt(Math.abs(Math.sin(Math.PI * ax / 190 + Math.sin(ax / 530)))) + 30 * Math.sin(ax / 420 + 1);
    const drawRoof = (w, phone) => {
        L.roof.mesh.visible = phone;
        L.roofLeaves.forEach(({ node }) => { node.mesh.visible = phone; });
        L.seamLeaves.forEach((node) => { node.mesh.visible = phone; });
        if (!phone) return;
        const cw = Math.round(w + 2 * MARGIN), bottom = Math.max(...Array.from({ length: 40 }, (_, i) => sy(roofEdge((i / 39 * cw - MARGIN - F.x) / k()))));
        const ch = Math.max(2, Math.round(bottom + MARGIN + 4));
        if (roofCanvas.width !== cw || roofCanvas.height !== ch) { roofCanvas.width = cw; roofCanvas.height = ch; }
        const g = roofCanvas.getContext('2d');
        g.clearRect(0, 0, cw, ch);
        g.fillStyle = ROOF_COLOUR;
        g.beginPath();
        g.moveTo(0, 0);
        for (let x = 0; x <= cw; x += 2) g.lineTo(x, sy(roofEdge((x - MARGIN - F.x) / k())) + MARGIN);
        g.lineTo(cw, 0);
        g.closePath();
        g.fill();
        L.roof.place({ left: -MARGIN, top: -MARGIN, w: cw, h: ch });
        L.roof.refresh();
        L.roofLeaves.forEach(({ node, box }) => node.place(rectOf(box)));
        SEAMS.forEach(([leaf, cx, cy, sw], i) => {
            const [, , w, h] = art.canopy[leaf], sh = sw * h / w;
            L.seamLeaves[i].place(rectOf([cx - sw / 2, cy - sh / 2, sw, sh]));
        });
    };

    const L = {};
    // ---- The spark, on a canvas over everything round the fire (art box SPARK_BOX, in the front row's depth): a short
    // tail of embers behind it, the beads of light ahead of it, the way it goes, and the spark itself, a bright core that
    // beats while nobody is with it
    const SPARK_BOX = [180, 1260, 1860, 800];
    const sparkCanvas = document.createElement('canvas');
    const TAIL = 30;
    const drawSpark = (t) => {
        const res = k() * Math.min(window.devicePixelRatio || 1, 1.5);
        const pw = Math.max(2, Math.round(SPARK_BOX[2] * res)), ph = Math.max(2, Math.round(SPARK_BOX[3] * res));
        if (sparkCanvas.width !== pw || sparkCanvas.height !== ph) { sparkCanvas.width = pw; sparkCanvas.height = ph; }
        const ctx = sparkCanvas.getContext('2d');
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, pw, ph);
        if (win || cur.alpha < 0.01) { L.spark?.refresh(); return; }
        ctx.setTransform(res, 0, 0, res, -SPARK_BOX[0] * res, -SPARK_BOX[1] * res);
        const head = flow.head;
        const call = flow.touched ? Math.min(1, Math.max(0, (flow.idle - 3) / 2)) : 1;
        // its tail: embers left behind, fading and flickering
        for (let p = Math.max(0, head - TAIL); p < head; p += 1.5) {
            const i = Math.floor(p), f = 1 - (head - p) / TAIL;
            const jitter = Math.sin(t * 13 + p * 1.7) * 6;
            ctx.globalAlpha = cur.alpha * f * f * (0.5 + 0.4 * flow.acc);
            ctx.fillStyle = f > 0.6 ? '#fff0b8' : '#ffb07a';
            ctx.beginPath();
            ctx.arc(RX(i), RY(i) + jitter, 3 + 9 * f, 0, Math.PI * 2);
            ctx.fill();
        }
        // the way it goes
        const stop = flow.next();
        const limit = Math.min(ROUND.n - 1, stop && head < stop.enter ? stop.enter + 3 : ROUND.n - 1, head + 50);
        const show = cur.alpha * (0.45 + 0.3 * flow.acc + 0.25 * call) * (1 - 0.6 * flow.rush);
        const run = (t * (10 + 14 * flow.acc)) % 12;
        ctx.fillStyle = '#fff6d6';
        for (let p = head + 5 + run; p < limit; p += 12) {
            const i = Math.floor(p), fade = 1 - (p - head) / 50;
            ctx.globalAlpha = show * fade;
            ctx.beginPath();
            ctx.arc(RX(i), RY(i), 6 + 6 * fade, 0, Math.PI * 2);
            ctx.fill();
        }
        // the spark
        const i = Math.min(ROUND.n - 1, Math.floor(head));
        const beat = call * (0.5 + 0.5 * Math.sin(t * 3.2)) + flow.rush * (0.5 + 0.5 * Math.sin(t * 11));
        const r = 58 * (1 + 0.5 * flow.acc + 0.35 * beat) * (1 + 0.08 * Math.sin(t * 17));
        const g = ctx.createRadialGradient(RX(i), RY(i), 0, RX(i), RY(i), r);
        g.addColorStop(0, 'rgba(255,255,255,1)');
        g.addColorStop(0.2, 'rgba(255,240,190,0.95)');
        g.addColorStop(0.5, 'rgba(255,170,110,0.45)');
        g.addColorStop(1, 'rgba(255,170,110,0)');
        ctx.globalAlpha = cur.alpha * (0.8 + 0.2 * Math.max(flow.acc, beat));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(RX(i), RY(i), r, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        L.spark?.refresh();
    };

    // ---- Back in the fire with everyone lit: the fire leaps, everyone hops at once, the rulito is born over the flame
    // and the name lights up; then the ones lit cool down and the spark is born again in the fire
    const DELAY = 0.5, GROW = 2.2, LINGER = 3.5, EAT = 3.4;
    const RULITO = [1040, 520, 80, 215];    // art px: the glyph's box, over the tip of the flame
    let glyph = { left: 0, top: 0, w: 1, h: 1 };
    const finish = () => {
        if (win) return;
        wins += 1;
        win = { age: 0, head: 0, tail: 0, full: false, fullAt: 0, back: false, pop: 0 };
        rulito.value?.reshape();
        play('ignite');
        flare = 1;
        for (let i = 0; i < 24; i++) spawnEmber(lastT, 1);
        sceneMilestone('current_flowed', { times: wins });
    };
    const stepWin = (dt, t) => {
        let named = 0;
        if (win) {
            win.age += dt;
            win.pop = Math.max(0, win.pop - dt * 2.2);
            win.head = 1 - (1 - Math.min(1, Math.max(0, (win.age - DELAY) / GROW))) ** 1.6;
            if (win.head >= 1 && !win.full) {
                win.full = true; win.fullAt = win.age; win.pop = 1;
                play('rulito');
                Object.keys(LIFE).forEach((name) => { if (LIFE[name].hop) hops[name] = -Math.random() * 0.3; });
                flare = 1;
                LAMPS.forEach((_, i) => dust?.boost(3 + i, 1));
            }
            if (win.full && !win.back && win.age - win.fullAt > LINGER) win.back = true;
            if (win.back) win.tail = Math.min(1, win.tail + dt / EAT);
            const whole = Math.min(1, Math.max(0, (win.head - win.tail - 0.6) / 0.4));
            named = Math.max(win.pop, 0.8 * whole * whole * (3 - 2 * whole));
            const fl = win.full && win.head - win.tail > 0.9 ? Math.max(win.pop, Math.sin(t * 4) * 0.5 + 0.5) : 0;
            rulito.value?.frame({ head: win.head, tail: win.tail, flare: fl, t, fade: Math.min(1, (win.head - win.tail) * 14), width: glyph.w });
            L.rulito.refresh();
            L.rulito.scale = 1 + 0.2 * win.pop * win.pop;
            if (win.back) cur.alpha = Math.max(0, 1 - win.tail * 1.4);
            if (win.back && win.tail >= 1) {
                win = null;
                flow.reset();
                reached.clear();
                Object.keys(LIT).forEach((name) => { LIT[name] = 0; });
                rulito.value?.frame({ width: glyph.w });
                L.rulito.refresh();
            }
        }
        if (!win) cur.alpha = Math.min(1, cur.alpha + dt / 1.5);
        cur.light += ((win && !win.back ? 1 : 0) - cur.light) * Math.min(1, dt * 1.5);
        const lit = Object.values(LIT).reduce((a, b) => a + b, 0) / KNOTS.length;
        grown += (Math.max(lit, win && !win.back ? 1 : 0) - grown) * Math.min(1, dt * 1.2);
        stageEl?.style.setProperty('--name-glow', named.toFixed(3));
        return named;
    };

    // ---- The finger, in art px of the front row's depth (which slides with the camera and the scroll)
    let frontAt = { x: 0, y: 0, s: 1 };
    const measureFront = () => {
        const a = L.frontNode.toScreen(sx(0), sy(0)), b = L.frontNode.toScreen(sx(SIZE), sy(0));
        frontAt = { x: a.x, y: a.y, s: (b.x - a.x) / SIZE || 1 };
    };
    const toArt = (event) => {
        const box = root.value.getBoundingClientRect();
        return [(event.clientX - box.left - frontAt.x) / frontAt.s, (event.clientY - box.top - frontAt.y) / frontAt.s];
    };
    const track = (event) => {
        if (!root.value) return;
        [pointer.u, pointer.v] = toArt(event);
        pointer.touch = event.pointerType === 'touch';
        pointer.down = pointer.touch ? event.type !== 'pointerup' && event.type !== 'pointercancel' : event.buttons > 0;
        pointer.at = lastT;
        if (event.type === 'pointerdown') slid = false;
    };
    // On a phone, a finger put down on the spark or on the way ahead of it must not move the page; anywhere else it scrolls
    const onTouchStart = (event) => {
        const t0 = event.touches[0];
        if (!t0 || !event.cancelable || win || !root.value) return;
        const [u, v] = toArt(t0);
        if (flow.nearHead(u, v)) event.preventDefault();
    };
    const holdHead = (event) => { event.currentTarget.setPointerCapture?.(event.pointerId); track(event); };
    const onHeadKey = (down) => (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        keyHold = down;
    };
    const placeHead = () => {
        const el = headHit.value;
        if (!el) return;
        const i = Math.min(ROUND.n - 1, Math.floor(flow.head));
        const size = Math.max(56, 2 * 120 * frontAt.s);
        el.style.translate = `${(frontAt.x + RX(i) * frontAt.s - size / 2).toFixed(1)}px ${(frontAt.y + RY(i) * frontAt.s - size / 2).toFixed(1)}px`;
        el.style.width = el.style.height = `${size.toFixed(1)}px`;
        el.style.display = win ? 'none' : '';
    };

    const build = (s) => {
        // The land: the ground (code), the trees (and, on a phone, their roof of leaves and crowns over the frame),
        // the marks of the ground, the glow of the fire on it, the fern and the lamps
        const land = s.depth(zFor(DEPTH.land));
        L.landNode = land;
        L.ground = land.canvas(groundCanvas.value);
        // (the trees are not mirrored past the frame: twin trees would show the mirror. Over the frame each trunk ends
        // in a crown and each thin branch the frame cuts in a flat end with a shelf of leaves, as Belleza's trees do
        // (scripts/make-celebracion-crowns.mjs), drawn behind the tree and swaying a little; the branch that leaves
        // the frame on the left goes on as its edge column, stretched, up to the left)
        // On a phone, over the frame, a roof of leaves the trunks go up into, as Belleza's canopy: its mass is a canvas
        // drawn in code in a night teal, with Belleza's free leaves on it (recoloured, canopy.webp), each stirring in place
        L.roof = land.canvas(roofCanvas);
        const [AW, AH] = art.canopyAtlas;
        L.roofLeaves = ROOF_LEAVES.map(({ box: [x, y, w, h], at: [ax, ay], flip }) => {
            const node = land.image(asset('canopy'), { crop: [ax / AW, ay / AH, w / AW, h / AH] });
            if (flip) node.sx = -1;
            return { node, box: [x, y, w, h], phase: Math.random() * 6.28, speed: 0.3 + Math.random() * 0.25 };
        });
        L.trees = ['treeLeft', 'treeRight'].map((name) => {
            const [, , w] = B[name];
            const end = name === 'treeLeft' ? 'Left' : 'Right';
            return {
                name,
                crown: land.image(asset('crown' + end), { wind: { amp: 3, speed: 0.45, root: 'bottom' } }),
                tip: land.image(asset('tip' + end), { wind: { amp: 2.5, speed: 0.6, root: 'bottom' } }),
                side: name === 'treeLeft' ? land.image(asset(name), { crop: [0, 0, 3 / w, 1] }) : null,
                tree: land.image(asset(name)),
            };
        });
        // and a shelf of leaves across each trunk where the card cuts it, in front: it hides where the crown begins
        L.seamLeaves = SEAMS.map(([leaf, , , , flip]) => {
            const [, , w, h, ax, ay] = art.canopy[leaf];
            const node = land.image(asset('canopy'), { crop: [ax / AW, ay / AH, w / AW, h / AH] });
            if (flip) node.sx = -1;
            return node;
        });
        L.marks = [-1, 0, 1].map((side) => {
            const node = land.image(asset('marks'));
            if (side) node.sx = -1;
            return { node, side };
        });
        L.cairn = land.image(asset('cairn'));
        L.warmth = land.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: 0xffc98a, stops: [[0, 0.42], [0.35, 0.16], [0.72, 0]] });
        L.fern = land.image(asset('fern'), { wind: { amp: 5, speed: 0.55, root: 'bottom' } });
        L.lampGlows = LAMPS.map(() => land.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: 0xffe08a, stops: [[0, 0.5], [0.3, 0.2], [0.7, 0]], bloom: true }));
        L.lamps = LAMPS.map(() => land.disc({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: 0xffe285, bloom: true }));
        L.stems = land.image(asset('stems'), { wind: STEM_WIND });
        L.stems.uniforms.uWind.value.w = STEM_PHASE;
        land.enter({ y: 30, delay: 100, duration: 1700 });

        // The beings behind the fire
        const behind = s.depth(zFor(DEPTH.behind));
        L.behindNode = behind;
        L.beings = {};
        BEHIND.forEach((name) => {
            const life = LIFE[name];
            L.beings[name] = behind.image(asset(name), life.wind ? { wind: { amp: life.wind, speed: 1.1, root: 'bottom' } } : {});
        });
        behind.enter({ y: 50, delay: 250, duration: 1800 });

        // The fire: its light behind, the logs, the flame and its yellow heart, each flickering on its own
        const fire = s.depth(zFor(DEPTH.fire));
        L.fireNode = fire;
        L.fireGlow = fire.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: 0xffb78a, stops: [[0, 0.5], [0.3, 0.22], [0.65, 0]], bloom: true });
        L.logs = fire.image(asset('logs'));
        L.flame = fire.image(asset('flame'), { wind: { amp: 16, speed: 2.1, root: 'bottom' } });
        L.heart = fire.image(asset('heart'), { wind: { amp: 11, speed: 2.1, root: 'bottom' }, bloom: true });
        L.flame.uniforms.uWind.value.w = 0.4;
        L.heart.uniforms.uWind.value.w = 1.1;
        fire.enter({ y: 40, delay: 350, duration: 1900 });

        // The beings in front of the fire; the one on the left can blink
        const front = s.depth(zFor(DEPTH.front));
        L.frontNode = front;
        FRONT.forEach((name) => {
            const life = LIFE[name];
            if (name === 'samaLeft') {
                const group = front.group();
                group.body = group.image(asset(name));
                group.eyes = group.image(asset('eyesLeft'));
                L.beings[name] = group;
            } else L.beings[name] = front.image(asset(name), life.wind ? { wind: { amp: life.wind, speed: 1.1, root: 'bottom' } } : {});
        });
        L.spark = front.canvas(sparkCanvas, { bloom: true });
        L.rulito = fire.canvas(rulito.value.canvas, { bloom: true });
        front.enter({ y: 60, delay: 450, duration: 1900 });
    };

    // The sky: the card's colour, a little deeper at the top
    const paintSky = (h) => {
        const horizon = Math.max(0, Math.min(100, sy(HORIZON) / h * 100));
        root.value.style.background = `linear-gradient(to bottom, #163f78 0%, #1a4f90 ${(horizon * 0.45).toFixed(1)}%, #1e5da5 ${horizon.toFixed(1)}%, #1e5da5 100%)`;
    };

    // The flat blue of the ground, in code: under its top edge, from past the left of the screen to past its right
    const drawGround = (w, h) => {
        const el = groundCanvas.value;
        const cw = Math.round(w + 2 * MARGIN), ch = Math.round(h + 2 * MARGIN);
        if (el.width !== cw || el.height !== ch) { el.width = cw; el.height = ch; }
        const g = el.getContext('2d');
        g.clearRect(0, 0, cw, ch);
        g.fillStyle = `#${art.ground.color.toString(16).padStart(6, '0')}`;
        g.beginPath();
        g.moveTo(0, ch);
        for (let x = 0; x <= cw; x += 2) g.lineTo(x, sy(edgeAt((x - MARGIN - F.x) / k())) + MARGIN);
        g.lineTo(cw, ch);
        g.closePath();
        g.fill();
        L.ground.place({ left: -MARGIN, top: -MARGIN, w: cw, h: ch });
        L.ground.refresh();
    };

    const place = (w, h) => {
        layout(w, h);
        paintSky(h);
        drawGround(w, h);
        drawRoof(w, w < h);
        // The trees and, where the frame leaves sky over them or beside them, their trunks and branch going on
        const top = -MARGIN;
        L.trees.forEach(({ name, crown, tip, side, tree }) => {
            const r = rectOf(B[name]);
            tree.place(r);
            const end = name === 'treeLeft' ? 'Left' : 'Right';
            [[crown, 'crown'], [tip, 'tip']].forEach(([node, kind]) => {
                const c = rectOf(B[kind + end]);
                node.place(c, { x: c.left + c.w / 2, y: c.top + c.h });
                node.mesh.visible = w < h && c.top + c.h > top;            // on a phone only: a wide screen stays as it was
            });
            if (side && art.branch) {
                // The branch goes on the way it goes, up to the left (its edge column stretched, turned about where it
                // leaves the frame and narrowed to keep its thickness across)
                const [by, angle] = art.branch;
                const across = Math.max(0, r.left + MARGIN) / Math.cos(angle * Math.PI / 180) + 2;
                side.place({ left: r.left - across, top: r.top, w: across + 1, h: r.h }, { x: r.left + 0.5, y: sy(by) });
                side.rotate = angle;
                side.sy = Math.cos(angle * Math.PI / 180);
                side.mesh.visible = r.left > -MARGIN;
            }
        });
        L.marks.forEach(({ node, side }) => {
            const r = rectOf(B.marks);
            node.place({ ...r, left: r.left + side * r.w });
        });
        L.cairn.place(rectOf(B.cairn));
        const [fx, fy] = FIRE;
        const ww = 1500 * k(), wh = 760 * k();
        L.warmth.place({ left: sx(fx) - ww / 2, top: sy(fy - 120) - wh / 2, w: ww, h: wh });
        L.fern.place(rectOf(B.fern));
        L.stems.place(rectOf(B.stems));
        LAMPS.forEach((lamp, i) => {
            const r = lamp.r * k();
            L.lamps[i].place({ left: sx(lamp.x) - r, top: sy(lamp.y) - r, w: 2 * r, h: 2 * r });
            const g = lamp.r * 7 * k();
            L.lampGlows[i].place({ left: sx(lamp.x) - g / 2, top: sy(lamp.y) - g / 2, w: g, h: g });
        });
        Object.entries(L.beings).forEach(([name, node]) => {
            const r = rectOf(B[name]);
            const feet = { x: r.left + r.w / 2, y: r.top + r.h };
            if (node.body) {
                node.body.place(r);
                node.eyes.place(rectOf(B.eyesLeft));
                node.pivot = feet;
            } else node.place(r, feet);
        });
        const gd = 1100 * k();
        L.fireGlow.place({ left: sx(fx) - gd / 2, top: sy(fy - 420) - gd / 2, w: gd, h: gd }, { x: sx(fx), y: sy(fy) });
        L.logs.place(rectOf(B.logs));
        L.flame.place(rectOf(B.flame), { x: sx(fx), y: sy(fy) });
        L.heart.place(rectOf(B.heart), { x: sx(fx), y: sy(fy) });
        L.spark.place(rectOf(SPARK_BOX));
        glyph = rectOf(RULITO);
        L.rulito.place({ left: glyph.left - 0.4375 * glyph.w, top: glyph.top - 0.1628 * glyph.h, w: glyph.w * 1.875, h: glyph.h * 1.3256 },
            { x: glyph.left + glyph.w / 2, y: glyph.top + glyph.h });
        rulito.value?.frame({ width: glyph.w });
        L.rulito.refresh();
    };

    // ---- A touch: on one of them, it hops; anywhere else, the chord is strummed and the fire flares
    const onCanvas = (event) => {
        const area = canvas.value.getBoundingClientRect();
        return { x: event.clientX - area.left, y: event.clientY - area.top };
    };
    const touch = (event) => {
        if (slid) { slid = false; return; }
        if (!stage || !L.beings) return;
        const p = onCanvas(event);
        const order = [...FRONT].reverse().concat([...BEHIND].reverse());
        const hit = order.find((name) => {
            if (!LIFE[name].hop) return false;
            const node = L.beings[name];
            const box = node.boxOnScreen(rectOf(B[name]));
            const pad = Math.max(0, 36 - Math.min(box.width, box.height)) / 2;
            return p.x > box.left - pad && p.x < box.left + box.width + pad && p.y > box.top - pad && p.y < box.top + box.height + pad;
        });
        if (hit && !reduced) {
            hops[hit] = 0;
            play('tap');
            return;
        }
        play('star');
        if (reduced) return;
        flare = 1;
        for (let i = 0; i < 16; i++) spawnEmber(lastT, 1);
        dust?.boost(1, 0.8);
        LAMPS.forEach((_, i) => dust?.boost(3 + i, 0.9));
    };

    const enter = () => {
        if (entered || !props.active || !stage) return;
        entered = true;
        stage.ready().then(() => { if (!gone) { stage.start(); dust?.reveal(); } });
    };

    const frame = ({ x, y, scroll, t, ramp }) => {
        if (!stage || !L.flame) return;
        const dt = Math.min(0.1, Math.max(0, t - lastT));
        lastT = t;
        stage.look(x * SLIDE, y * SLIDE_Y);
        flare = Math.max(0, flare - dt * 0.7);
        // The leaves of the roof stir in place
        L.roofLeaves.forEach(({ node, phase, speed }) => {
            const a = t * speed + phase;
            node.x = Math.sin(a) * 5 * ramp;
            node.y = Math.sin(a * 0.7 + 1.3) * 2.5 * ramp;
            node.rotate = Math.sin(a * 1.3) * 1.4 * ramp;
        });

        // ---- The fire flickers, flares when the chord is strummed, and throws embers
        const f = flicker(t) * ramp, g = flicker(t * 0.8, 2.3) * ramp;
        // (and grows with each one the spark has lit)
        L.flame.sy = 1 + 0.035 * f + 0.12 * flare + 0.14 * grown;
        L.flame.sx = 1 - 0.02 * f + 0.06 * flare + 0.06 * grown;
        L.heart.sy = 1 + 0.05 * g + 0.14 * flare + 0.16 * grown;
        L.heart.sx = 1 - 0.03 * g + 0.05 * flare + 0.06 * grown;
        L.heart.uniforms.uBright.value = 1 + 0.06 * g + 0.15 * flare;
        L.fireGlow.opacity = 0.75 + 0.15 * f + 0.25 * flare;
        L.fireGlow.scale = 1 + 0.04 * g + 0.15 * flare;
        L.warmth.opacity = 0.7 + 0.12 * f + 0.3 * flare;
        if (!reduced) {
            // (by the clock, not by frames: a slow device throws as many)
            if (nextEmber < t - 1) nextEmber = t;
            while (nextEmber <= t) { spawnEmber(nextEmber); nextEmber += 0.12 + Math.random() * 0.22 - flare * 0.08; }
        }
        // ---- Fluir: the spark round the circle
        measureFront();
        if (!win) flow.step(dt, t, pointer, { key: keyHold });
        if (pointer.down && flow.acc > 0.3) slid = true;
        const named = stepWin(dt, t);
        drawSpark(t);
        placeHead();
        stage.bloom = Math.max(0.35 * flare, 0.55 * named);

        // ---- The lamps sway on their stems and breathe their light
        LAMPS.forEach((_, i) => {
            const off = lampOffset(i, t);
            const breath = Math.sin(t * 0.9 + i * 1.3) * ramp;
            L.lamps[i].x = off;
            L.lampGlows[i].x = off;
            L.lampGlows[i].opacity = 0.55 + 0.25 * breath + 0.3 * flare;
            L.lampGlows[i].scale = 1 + 0.08 * breath + 0.2 * flare;
            L.lamps[i].scale = 1 + 0.03 * breath;
        });

        // ---- The beings breathe; a tapped one hops; the one sitting rocks as if humming, the one on the left blinks
        Object.entries(L.beings).forEach(([name, node]) => {
            const life = LIFE[name];
            const ph = phaseOf[name];
            const b = life.breath ? Math.sin(t * life.pace + ph) * ramp : 0;
            node.sy = 1 + (life.breath ?? 0) * b;
            node.sx = 1 - (life.breath ?? 0) * 0.35 * b;
            let lift = 0;
            if (hops[name] !== undefined) {
                hops[name] += dt / 0.55;
                const p = Math.min(1, Math.max(0, hops[name]));
                lift = Math.sin(Math.PI * p) * 22 * Math.max(0.5, k() * 2);
                node.sy *= 1 + 0.06 * Math.sin(Math.PI * p);
                if (p >= 1) delete hops[name];
            }
            node.y = -lift;
            // A little warmth from the fire on them, flickering with it
            const u = node.body ? node.body.uniforms : node.uniforms;
            // and, once the spark has come by, a warm light of its own
            const warm = LIT[name] ?? LIT[Object.keys(PAIRED).find((key) => PAIRED[key] === name)] ?? 0;
            litGlow[name] = (litGlow[name] ?? 0) + (warm - (litGlow[name] ?? 0)) * Math.min(1, dt * 2);
            if (u) u.uBright.value = 1 + 0.035 * f + 0.08 * flare + 0.06 * litGlow[name];
        });
        L.beings.seated.rotate = Math.sin(t * 1.4) * 1.6 * ramp;
        L.beings.samaRight.rotate = Math.sin(t * 0.35 + 1) * 0.8 * ramp;
        L.beings.foxRight.rotate = Math.sin(t * 0.5) * 1.2 * ramp;
        const blink = (t % 5.3) < 0.14 || ((t + 2.1) % 11.7) < 0.12;
        L.beings.samaLeft.eyes.sy = blink && !reduced ? 0.12 : 1;

        // Each depth with the scroll, and the particles that belong to one follow it
        L.landNode.y = scroll * 14;
        L.behindNode.y = scroll * 20;
        L.fireNode.y = scroll * 22;
        L.frontNode.y = scroll * 26;
        const starDrift = stage.drift(zFor(DEPTH.stars)), landDrift = stage.drift(L.landNode.z), fireDrift = stage.drift(L.fireNode.z);
        dust?.shift(0, starDrift.x, starDrift.y + scroll * 6);
        dust?.shift(1, landDrift.x, landDrift.y + L.landNode.y);
        dust?.shift(2, fireDrift.x, fireDrift.y + L.fireNode.y);
        LAMPS.forEach((_, i) => dust?.shift(3 + i, landDrift.x + lampOffset(i, t), landDrift.y + L.landNode.y));
        stage.render(t);
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
        const fromArt = (list, scale = 1) => list.map(([x, y, r]) => [sx(x), sy(y), Math.max(1.2, 2 * r * k() * scale)]);
        // The stars of the card, and mirrored copies of them over the frame and past its sides, wherever there is sky
        const stars = () => {
            const out = [];
            const groundAt = (x) => sy(edgeAt((x - F.x) / k()));
            for (const side of [-1, 0, 1]) {
                for (const up of [0, 1]) {
                    art.stars.forEach(([ax, ay, r]) => {
                        const x = sx(side < 0 ? -ax : side > 0 ? 2 * SIZE - ax : ax), y = sy(up ? -ay : ay);
                        if (x < -MARGIN || x > W + MARGIN || y < -MARGIN || y > groundAt(x) - 6) return;
                        out.push([x, y, Math.max(1.6, 2 * r * k() * 1.2)]);
                    });
                }
            }
            return out;
        };
        dust = startStardust(null, {
            stage,
            manual: true,
            groups: [
                // 0: the stars, behind everything
                { colors: [0x42c7f4, 0x7fdcff, 0xbdeeff], look: 'hard', parallax: 0, drift: 0.6, twinkle: 0.55, reach: 0, order: 0.5, points: stars },
                // 1: the stippled light of the little glowing mushrooms on the ground
                { colors: [0xffe285, 0xfff0b8], look: 'hard', parallax: 0, drift: 1.2, jitter: 0.35, twinkle: 0.5, reach: 0, bloom: true, order: after(L.marks[2].node), points: () => fromArt(art.glows) },
                // 2: the embers of the fire, over the flame
                { colors: [0xffe285], look: 'hard', dynamic: emberGroup, parallax: 0, drift: 1.5, jitter: 0.5, twinkle: 0.2, reach: 0, bloom: true, order: after(L.heart) },
                // 3..7: the stippled halo of each lamp, which goes with it
                ...LAMPS.map((lamp) => ({ colors: [0xffe285, 0xfff3c4], look: 'hard', parallax: 0, drift: 1.4, jitter: 0.4, twinkle: 0.45, reach: 0, bloom: true, order: after(L.stems), points: () => fromArt(lamp.dots) })),
            ],
        });
        if (reduced) dust.reveal();
        ['pointerdown', 'pointermove', 'pointerup', 'pointercancel'].forEach((type) => root.value.addEventListener(type, track, { passive: true }));
        root.value.addEventListener('touchstart', onTouchStart, { passive: false });
        parallax = createParallax(root.value, frame);
        enter();
    };

    onMounted(begin);
    watch(() => props.active, enter);
    onBeforeUnmount(() => {
        gone = true;
        ['pointerdown', 'pointermove', 'pointerup', 'pointercancel'].forEach((type) => root.value?.removeEventListener(type, track));
        root.value?.removeEventListener('touchstart', onTouchStart);
        stageEl?.style.removeProperty('--name-glow');
        parallax?.destroy();
        dust?.destroy();
        stage?.destroy();
    });
</script>

<template>
    <div class="scene" ref="root" @click="touch">
        <canvas class="stageCanvas" ref="canvas" aria-hidden="true"></canvas>
        <!-- The flat blue of the ground, drawn in code; the stage shows it as a texture under the marks -->
        <canvas class="offstage" ref="groundCanvas" aria-hidden="true"></canvas>
        <!-- The rulito is drawn on its own canvas, which the stage shows as a texture over the flame -->
        <Rulito ref="rulito" class="offstage" color="#ffe285" />
        <!-- The spark: a finger slides from here round the circle with it, or Enter held on it goes with it -->
        <div ref="headHit" class="hit head" role="button" tabindex="0"
            :aria-label="$i18n.locale === 'en' ? 'The spark of the fire: slide your finger round the circle with it (or hold Enter)' : 'La chispa del fuego: deslizá el dedo junto a ella alrededor de la ronda (o mantené Enter)'"
            @pointerdown.prevent="holdHead" @click.stop @keydown="onHeadKey(true)($event)" @keyup="onHeadKey(false)($event)" @blur="keyHold = false"></div>
    </div>
</template>

<style scoped>
    .scene {
        position: absolute;
        inset: 0;
        overflow: hidden;
        background: #1e5da5;
    }

    .stageCanvas {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        display: block;
        pointer-events: none;
    }

    /* The spark: the finger slides from here with it, so the page must not scroll from here */
    .hit.head {
        position: absolute;
        left: 0;
        top: 0;
        border-radius: 50%;
        cursor: grab;
        pointer-events: auto;
        touch-action: none;
        -webkit-tap-highlight-color: transparent;
        outline: none;
    }

    .hit.head:focus-visible {
        outline: 2px solid rgba(255, 255, 255, 0.85);
        outline-offset: 2px;
    }

    .offstage {
        position: absolute;
        left: -9999px;
        top: 0;
        width: 40px;
        visibility: hidden;
    }
</style>
