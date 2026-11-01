<script setup>
    // Transformación: "my heart flows with joy in the course of the change". Under a pink sky with stars, a tree grows out
    // of a dark pond: a wavy pink trunk, a palm crown holding a little sun on a stalk, and a teal seed at its side,
    // glowing. Golden dust rises from the light in the middle of the pond along the trunk; yellow signs float round it.
    // On the blue ground, between pink mountains, a little one with a rod watches it and an elder, eyes closed, holds a
    // bowl.
    // Its verb is Fluir (crossing the change), with the engine shared by the cards of the verb (useFlow.js): golden sap
    // is born in the light of the pond and rises up the root and the trunk as a finger slides up with it, at its own
    // pace (never faster; alone it does not move), beads of light running on ahead of it. The six yellow signs floating
    // round the tree are its knots: as the sap comes up to the height of one, accompanied, the sign lets go of its shape
    // and drifts into the trunk, melting into the sap, which goes on once it has taken it in. At the crown, the sun
    // lights up, the seed glows and swells, and the rulito is born out of it, the name lights up; then the sap fades and
    // the signs come back, for another time. A tap strums the card's chord (`star`): the dust, the motes and the seed's
    // aura flare and the seed swells; touching near the little one makes him hop and blink, near the elder makes him
    // bow his head.
    // The sky is not a picture: it is in no layer of the card, so the converter reads its colour from the finished card,
    // row by row, into stops for a gradient placed with the frame. Nor are the sun (a disc in code, with its stipple as
    // live particles), the pond (an ellipse in code with the light of the water across it, under its ring and pattern)
    // or the light in its middle (an ellipse and a glow). The stars, the seed's aura and the golden dust are particles;
    // more motes keep rising from the pond along the trunk. The signs and the two streaks of the sky are cut out into
    // one atlas so each floats on its own; the card's little cross mark in the sky (the logo) is not shipped, nor its
    // rulito (the spiral on the seed: its box is in the JSON for the game).
    // It is drawn in WebGL (useLayerStage): stars, streaks, mountains, the land (ground, pond, tree, seed), the two
    // beings and the floating signs are planes at their depths; the palm crown sways (`sway`) and the sun on its stalk
    // turns with it; the little one breathes, blinks and looks about, the elder breathes slowly and his bowl shines now
    // and then. Past the frame the mountains are mirrored on both sides and so is the plain ground (its fill with the
    // horizon traced again, without the stones, so they have no twins). From transformacionScene.json and
    // public/assets/transformacion (made by scripts/convert-transformacion.mjs).
    import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { createParallax } from '../../composables/useParallax.js';
    import { createLayerStage } from '../../composables/useLayerStage.js';
    import { startStardust } from '../../composables/useStardust.js';
    import { decodeCloud, sampleCloud } from '../../composables/stippleCloud.js';
    import { play } from '../../composables/useSound.js';
    import { createFlow, routeThrough } from '../../composables/useFlow.js';
    import { sceneMilestone } from '../../analytics.js';
    import Rulito from '../Rulito.vue';
    import art from '../../composables/transformacionScene.json';

    const props = defineProps({
        card: { type: Object, default: () => ({}) },
        active: Boolean
    });

    const root = ref(null);
    const canvas = ref(null);
    const seedHit = ref(null);
    const headHit = ref(null);              // where the sap's head is: Enter held on it goes with it
    const rulito = ref(null);
    let stageEl = null;                     // the card's stage, where the name is lit from (--name-glow)
    let stage = null;
    let parallax = null;
    let dust = null;
    let entered = false;
    let gone = false;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ---- Layout: the illustration is a 2160 square resting on the bottom of the screen. On a phone upright it is as big
    // as the two beings allow across, centred between them; on a wide screen the land goes on past the frame
    const SIZE = art.size;
    const B = art.boxes;
    const A = '/assets/transformacion';
    let F = { x: 0, y: 0, size: 1 };
    let W = 1, H = 1;
    const k = () => F.size / SIZE;
    const sx = (x) => F.x + x * k();
    const sy = (y) => F.y + y * k();
    const rectOf = ([left, top, w, h]) => ({ left: sx(left), top: sy(top), w: w * k(), h: h * k() });
    const SPAN = 1500, FOCUS = 1090;        // art px across that must be seen on a phone, and their middle
    const DROP = 0.02;                      // how much of the frame goes under the bottom of a wide screen (only grass)
    const layout = (w, h) => {
        W = w; H = h;
        const phone = w < h;
        const size = phone ? Math.min(0.72 * h, w * SIZE / SPAN) : Math.min(Math.max(0.62 * w, 0.55 * h), 0.88 * h);
        let x = w / 2 - size / 2;
        if (phone && size > w) x = Math.min(0, Math.max(w - size, w / 2 - FOCUS * size / SIZE));
        F = { x, y: h - size + (phone ? 0 : DROP * size), size };
    };

    const SLIDE = 50;
    const SLIDE_Y = 30;
    const zFor = (amp) => amp / (SLIDE + amp);
    const DEPTH = { stars: 3, streaks: 5, hills: 12, land: 20, beings: 23, signs: 27 };

    const SUN = art.sun;
    const SUN_CLOUD = decodeCloud(SUN.cloud);   // its yellow stipple, from the card (scripts/sun-cloud.mjs, as Pañña's sun)
    const POND = art.pond;
    const SPOT = art.spot;
    const TEAL = 0xa8d8d0;
    const GOLD = 0xf8e080;
    const ease = (p) => p * p * (3 - 2 * p);

    // ---- The palm crown sways about where it meets the trunk (the picture's `sway`); the sun on its stalk turns with
    // it, as much as the shader turns the stalk there
    const CROWN = { x: 915, y: 470, w: 0.55 };
    const swayAt = (x, y) => {
        const r = CROWN.w * B.tree[2] * 1.1;
        const dx = x - CROWN.x, dy = y - CROWN.y;
        const e = Math.hypot(dx, dy * (dy < 0 ? 0.8 : 1.6)) / r;
        if (e >= 1) return 0;
        const p = Math.min(1, Math.max(0, (e - 0.5) / 0.5));
        return 1 - p * p * (3 - 2 * p);
    };
    const SUN_SWAY = swayAt(SUN.x, SUN.y);

    // ---- The signs and the streaks: cut out of the illustration (one atlas), each floating on its own
    const [AW, AH] = art.atlas;
    const glyphs = art.glyphs.map(([x, y, w, h, ax, ay, kind], i) => ({
        i, kind, rect: [x, y, w, h], crop: [ax / AW, ay / AH, w / AW, h / AH], phase: i * 1.7 + Math.random(),
    }));
    const signs = glyphs.filter((g) => g.kind === 0);
    const streaks = glyphs.filter((g) => g.kind === 1);

    // ---- Fluir: the sap's way, in art px, along the middle of the root and the trunk (traced from tree.webp, row by
    // row) from the light of the pond up to where the crown meets the trunk
    const WAY = [
        [SPOT.x, SPOT.y - 6], [1046, 1934], [1004, 1906], [978, 1880], [960, 1856], [946, 1830], [939, 1800], [939, 1770], [942, 1730],
        [946, 1690], [949, 1650], [946, 1610], [932, 1570], [922, 1530], [920, 1490], [926, 1450], [938, 1410], [952, 1370],
        [966, 1330], [972, 1290], [968, 1250], [962, 1210], [961, 1170], [967, 1130], [981, 1090], [985, 1050], [981, 1010],
        [968, 970], [960, 930], [964, 890], [976, 850], [992, 810], [1006, 770], [1019, 730], [1020, 690], [1015, 650],
        [994, 610], [962, 566], [934, 524], [918, 488],
    ];
    const SAP = routeThrough(WAY, 8);
    const RX = (i) => SAP.xs[i], RY = (i) => SAP.ys[i];
    // The signs, from the lowest up: each is a knot where the sap comes level with it (a short stretch of the trunk)
    const sampleAt = (y) => { for (let i = 0; i < SAP.n; i++) if (SAP.ys[i] <= y) return i; return SAP.n - 1; };
    const KNOTS = signs.map((g, i) => ({ i, y: g.rect[1] + g.rect[3] / 2 })).sort((a, b) => b.y - a.y)
        .map(({ i, y }) => { const at = Math.min(SAP.n - 8, Math.max(8, sampleAt(y))); return { sign: i, enter: at, exit: at + 5 }; });
    // Each sign: still floating (p 0), drifting into the trunk and melting (p up to 1, once let go), taken in (gone)
    const SIGNS = signs.map(() => ({ letGo: false, p: 0, back: 1 }));
    const cur = { alpha: 1, light: 0 };
    let keyHold = false;
    const pointer = { u: 0, v: 0, at: -99, down: false, touch: false };
    let slid = false;
    let win = null;
    let wins = 0;
    let swell = 0;                          // the sap swells where it has just taken in a sign
    const flow = createFlow({
        x: RX, y: RY, n: SAP.n,
        stops: KNOTS,
        pace: 30,                           // about 10 s up the tree with a finger, and a moment at each sign
        ahead: 40, behind: 10, lead: 5, press: 14, fill: 0.5,
        reach: 150, touchReach: 230,
        isOpen: (s) => SIGNS[s.sign].letGo,
        release: (s) => { const g = SIGNS[s.sign]; if (g.letGo) return; g.letGo = true; play('release'); },
        ready: (s) => SIGNS[s.sign].p > 0.95,
        onEnter: () => { swell = 1; play('bloom'); dust?.boost(3, 0.8); },
        onEnd: () => finish(),
        onNote: (step, level) => play('flow', { step, level }),
        onFirst: () => sceneMilestone('current_accompanied'),
    });

    // ---- Touch: the chord is strummed, the light of the tree flares; a being near the finger answers
    let flare = 0;
    let hop = 0;
    let bow = 0;
    let blinkAt = 2.5;
    let lastT = 0;
    const L = {};
    const centreOf = ([x, y, w, h]) => [x + w / 2, y + h / 2];
    const touch = (event) => {
        if (slid) { slid = false; return; }
        play('star');
        flare = 1;
        dust?.boost(1, 0.6);
        dust?.boost(2, 0.8);
        dust?.boost(3, 1);
        dust?.boost(4, 1);
        if (!event || !L.small || !canvas.value) return;
        const area = canvas.value.getBoundingClientRect();
        const at = { x: event.clientX - area.left, y: event.clientY - area.top };
        const near = (node, box) => {
            const [cx, cy] = centreOf(box);
            const p = node.toScreen(sx(cx), sy(cy));
            return Math.hypot(p.x - at.x, p.y - at.y) < Math.max(70, box[3] * k() * 0.6);
        };
        if (near(L.small, B.small)) { hop = 1; blinkAt = lastT; }
        else if (near(L.elder, B.elder)) bow = 1;
    };
    const onKey = (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        touch(null);
    };

    // ---- The motes that keep rising from the light of the pond along the trunk, leaning as the dust of the card does
    const RISE_N = 40, RISE_LIFE = 7;
    const riseSeeds = Array.from({ length: RISE_N }, () => ({ at: Math.random(), wob: Math.random() * 6.28, size: 0.6 + Math.random() * 0.8, lean: 60 + Math.random() * 70 }));
    const riseGroup = {
        count: RISE_N,
        update(t, data) {
            riseSeeds.forEach((m, i) => {
                const u = (t / RISE_LIFE + m.at) % 1;
                const x = SPOT.x - m.lean * u + Math.sin(u * 9 + m.wob) * (14 + 36 * u);
                const y = SPOT.y - 8 - u * 560;
                data.positions[i * 3] = sx(x);
                data.positions[i * 3 + 1] = sy(y);
                data.sizes[i] = Math.max(1.5, 9 * k() * m.size * (1 - 0.4 * u)) * (1 + 0.6 * flare);
                data.alphas[i] = Math.sin(u * Math.PI) ** 1.5 * (0.75 + 0.25 * flare);
            });
        },
    };

    // ---- The sap, on a canvas over the trunk (art box SAP_BOX, in the tree's group): a golden line from the pond to its
    // head, thin along the root and wider up the trunk, with lights running up it; beads of light ahead of it, the way it
    // goes; and its head, a bright core that beats while nobody is with it
    const SAP_BOX = [860, 440, 240, 1560];
    const sapCanvas = document.createElement('canvas');
    let runPhase = 0;
    const widthAt = (i) => (RY(i) > 1600 ? 9 : 16);
    const stroke = (ctx, a, b, k2) => {
        a = Math.max(0, Math.floor(a));
        b = Math.min(SAP.n - 1, Math.floor(b));
        for (let i = a; i < b; i += 4) {
            const j = Math.min(b, i + 5);
            ctx.beginPath();
            ctx.moveTo(RX(i), RY(i));
            for (let m = i + 1; m <= j; m++) ctx.lineTo(RX(m), RY(m));
            ctx.lineWidth = widthAt(Math.floor((i + j) / 2)) * k2;
            ctx.stroke();
        }
    };
    const drawSap = (t) => {
        const res = k() * Math.min(window.devicePixelRatio || 1, 1.5);
        const pw = Math.max(2, Math.round(SAP_BOX[2] * res)), ph = Math.max(2, Math.round(SAP_BOX[3] * res));
        if (sapCanvas.width !== pw || sapCanvas.height !== ph) { sapCanvas.width = pw; sapCanvas.height = ph; }
        const ctx = sapCanvas.getContext('2d');
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, pw, ph);
        ctx.setTransform(res, 0, 0, res, -SAP_BOX[0] * res, -SAP_BOX[1] * res);
        ctx.lineCap = ctx.lineJoin = 'round';
        const head = flow.head, lit = Math.max(flow.acc, cur.light);
        if (cur.alpha > 0.01 && head > 0.5) {
            ctx.strokeStyle = '#ffd95e';
            ctx.globalAlpha = cur.alpha * (0.3 + 0.2 * lit);
            stroke(ctx, 0, head, 2.2);
            ctx.strokeStyle = '#fff1b0';
            ctx.globalAlpha = cur.alpha * (0.7 + 0.3 * lit);
            stroke(ctx, 0, head, 0.75);
            ctx.strokeStyle = '#ffffff';
            ctx.globalAlpha = cur.alpha * (0.4 + 0.35 * lit);
            const GAP = 20;
            for (let p = runPhase % GAP; p < head; p += GAP) stroke(ctx, Math.max(0, p - 5), Math.min(head, p), 0.35);
        }
        if (cur.alpha > 0.01 && !win) {
            const call = flow.touched ? Math.min(1, Math.max(0, (flow.idle - 3) / 2)) : 1;
            const stop = flow.next();
            const limit = Math.min(SAP.n - 1, stop && head < stop.enter ? stop.enter + 2 : SAP.n - 1, head + 40);
            const show = cur.alpha * (0.5 + 0.3 * flow.acc + 0.2 * call) * (1 - 0.6 * flow.rush);
            const run = (t * (10 + 14 * flow.acc)) % 10;
            ctx.fillStyle = '#fffbe8';
            for (let p = head + 4 + run; p < limit; p += 10) {
                const i = Math.floor(p), fade = 1 - (p - head) / 40;
                ctx.globalAlpha = show * fade;
                ctx.beginPath();
                ctx.arc(RX(i), RY(i), 7 + 6 * fade, 0, Math.PI * 2);
                ctx.fill();
            }
            const i = Math.min(SAP.n - 1, Math.floor(head));
            const beat = call * (0.5 + 0.5 * Math.sin(t * 3.2)) + flow.rush * (0.5 + 0.5 * Math.sin(t * 11));
            const r = 46 * (1 + 0.45 * flow.acc + 0.35 * beat + 0.6 * swell);
            const g = ctx.createRadialGradient(RX(i), RY(i), 0, RX(i), RY(i), r);
            g.addColorStop(0, 'rgba(255,255,255,1)');
            g.addColorStop(0.2, 'rgba(255,248,214,0.95)');
            g.addColorStop(0.5, 'rgba(255,214,96,0.45)');
            g.addColorStop(1, 'rgba(255,214,96,0)');
            ctx.globalAlpha = cur.alpha * (0.75 + 0.25 * Math.max(flow.acc, beat));
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(RX(i), RY(i), r, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        L.sap?.refresh();
    };

    // ---- At the crown: the sun lights up, the seed glows and swells, the rulito is born out of it and the name lights
    // up; then the sap fades and the signs come back
    const DELAY = 0.6, GROW = 2.2, LINGER = 3.5, EAT = 3.4;
    const RULITO = [1118, 360, 92, 250];   // art px: the glyph's box, over the seed, where the highest sign was
    let glyph = { left: 0, top: 0, w: 1, h: 1 };
    let bloomed = 0;                        // the sun and the seed, lit by the sap at the end (0..1)
    const finish = () => {
        if (win) return;
        wins += 1;
        win = { age: 0, head: 0, tail: 0, full: false, fullAt: 0, back: false, pop: 0 };
        rulito.value?.reshape();
        play('converge');
        flare = 1;
        dust?.boost(1, 1);
        dust?.boost(2, 1);
        sceneMilestone('current_flowed', { times: wins });
    };
    const stepWin = (dt, t) => {
        let named = 0;
        if (win) {
            win.age += dt;
            win.pop = Math.max(0, win.pop - dt * 2.2);
            win.head = 1 - (1 - Math.min(1, Math.max(0, (win.age - DELAY) / GROW))) ** 1.6;
            if (win.head >= 1 && !win.full) { win.full = true; win.fullAt = win.age; win.pop = 1; play('rulito'); hop = 1; bow = 1; }
            if (win.full && !win.back && win.age - win.fullAt > LINGER) win.back = true;
            if (win.back) win.tail = Math.min(1, win.tail + dt / EAT);
            const whole = Math.min(1, Math.max(0, (win.head - win.tail - 0.6) / 0.4));
            named = Math.max(win.pop, 0.8 * ease(whole));
            const fl = win.full && win.head - win.tail > 0.9 ? Math.max(win.pop, Math.sin(t * 4) * 0.5 + 0.5) : 0;
            rulito.value?.frame({ head: win.head, tail: win.tail, flare: fl, t, fade: Math.min(1, (win.head - win.tail) * 14), width: glyph.w });
            L.rulito.refresh();
            L.rulito.scale = 1 + 0.2 * win.pop * win.pop;
            if (win.back) cur.alpha = Math.max(0, 1 - win.tail * 1.4);
            if (win.back && win.tail >= 1) {
                win = null;
                flow.reset();
                SIGNS.forEach((g) => { g.letGo = false; g.p = 0; g.back = 0; });
                rulito.value?.frame({ width: glyph.w });
                L.rulito.refresh();
            }
        }
        if (!win) cur.alpha = Math.min(1, cur.alpha + dt / 1.5);
        cur.light += ((win && !win.back ? 1 : 0) - cur.light) * Math.min(1, dt * 1.5);
        bloomed += ((win && !win.back ? 1 : 0) - bloomed) * Math.min(1, dt * (win && !win.back ? 1.4 : 0.5));
        swell = Math.max(0, swell - dt * 1.8);
        stageEl?.style.setProperty('--name-glow', named.toFixed(3));
        return named;
    };

    // ---- The finger, in art px of the tree (which slides with the camera and the scroll)
    let treeAt = { x: 0, y: 0, s: 1 };
    const measureTree = () => {
        const a = L.tree.toScreen(sx(0), sy(0)), b = L.tree.toScreen(sx(SIZE), sy(0));
        treeAt = { x: a.x, y: a.y, s: (b.x - a.x) / SIZE || 1 };
    };
    const toArt = (event) => {
        const box = root.value.getBoundingClientRect();
        return [(event.clientX - box.left - treeAt.x) / treeAt.s, (event.clientY - box.top - treeAt.y) / treeAt.s];
    };
    const track = (event) => {
        if (!root.value) return;
        [pointer.u, pointer.v] = toArt(event);
        pointer.touch = event.pointerType === 'touch';
        pointer.down = pointer.touch ? event.type !== 'pointerup' && event.type !== 'pointercancel' : event.buttons > 0;
        pointer.at = lastT;
        if (event.type === 'pointerdown') slid = false;
    };
    // On a phone, a finger put down on the sap or on the way ahead of it must not move the page; anywhere else it scrolls
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
        const i = Math.min(SAP.n - 1, Math.floor(flow.head));
        const size = Math.max(56, 2 * 120 * treeAt.s);
        el.style.translate = `${(treeAt.x + RX(i) * treeAt.s - size / 2).toFixed(1)}px ${(treeAt.y + RY(i) * treeAt.s - size / 2).toFixed(1)}px`;
        el.style.width = el.style.height = `${size.toFixed(1)}px`;
        el.style.display = win ? 'none' : '';
    };

    const build = (s) => {
        // The two streaks of the sky, far
        const far = s.depth(zFor(DEPTH.streaks));
        L.streaksNode = far;
        L.streaks = streaks.map((g) => far.image(`${A}/sky.webp`, { crop: g.crop }));
        far.enter({ y: -15, delay: 300, duration: 2400 });
        // The mountains, going on past the frame on both sides
        const hills = s.depth(zFor(DEPTH.hills));
        L.hillsNode = hills;
        L.hills = [-1, 0, 1].map((side) => {
            const node = hills.image(`${A}/hills.webp`);
            if (side) node.sx = -1;
            return { node, side };
        });
        hills.enter({ y: 30, delay: 100, duration: 1900 });
        // The land: the plain ground past the frame, the ground, the pond, the tree with its sun and its seed
        const land = s.depth(zFor(DEPTH.land));
        L.landNode = land;
        L.plain = [-1, 1].map((side) => {
            const node = land.image(`${A}/plain.webp`);
            node.sx = -1;
            return { node, side };
        });
        L.ground = land.image(`${A}/ground.webp`);
        L.pond = land.disc({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: POND.color, water: 1 });
        L.spotGlow = land.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: GOLD, stops: [[0, 0.6], [0.3, 0.25], [0.7, 0]], bloom: true });
        L.spot = land.disc({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: SPOT.color });
        L.pondLines = land.image(`${A}/pond.webp`, { water: 0.6 });
        L.tree = land.group();
        L.crown = L.tree.group();
        L.sunGlow = L.crown.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: 0xffe9a0, stops: [[0, 0.55], [0.3, 0.22], [0.66, 0]], bloom: true });
        L.sun = L.crown.disc({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: SUN.color, bloom: true });
        L.seedGlow = L.tree.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: TEAL, stops: [[0, 0.5], [0.35, 0.22], [0.7, 0]], bloom: true });
        L.seed = L.tree.image(`${A}/seed.webp`, { sheen: 0.35 });
        L.trunk = L.tree.image(`${A}/tree.webp`, { sway: true });
        L.sap = L.tree.canvas(sapCanvas, { bloom: true });
        L.rulito = L.tree.canvas(rulito.value.canvas, { bloom: true });
        land.enter({ y: 40, delay: 150, duration: 1800 });
        // The two beings, in front
        const beings = s.depth(zFor(DEPTH.beings));
        L.beingsNode = beings;
        L.small = beings.group();
        L.smallBody = L.small.image(`${A}/small.webp`, { wind: { amp: 2.2, speed: 0.7, root: 'bottom' } });
        L.eyes = L.small.image(`${A}/smallEyes.webp`);
        L.elder = beings.group();
        L.elderBody = L.elder.image(`${A}/elder.webp`, { wind: { amp: 2.6, speed: 0.55, root: 'bottom' } });
        L.cup = L.elder.image(`${A}/cup.webp`, { sheen: 0.8 });
        beings.enter({ y: 60, delay: 350, duration: 1900 });
        // The signs floating round the tree, nearest
        const near = s.depth(zFor(DEPTH.signs));
        L.signsNode = near;
        L.signs = signs.map((g) => near.image(`${A}/sky.webp`, { crop: g.crop }));
        near.enter({ y: -25, scale: 0.9, delay: 700, duration: 2200 });
    };

    // The sky, from the card (flat pink, a little lighter low down where the card is); under the ground the blue of the
    // ground, so no pink shows under it when the land slides with the scroll or the screen rounds its edge (a pink line
    // at the bottom of the stage on an iPhone)
    const GROUND = '#69b8e2';
    const UNDER = 1880;                     // art px: well inside the ground's solid blue, below its horizon everywhere
    const paintSky = () => {
        const at = (y) => `${Math.max(-50, Math.min(150, sy(y) / Math.max(H, 1) * 100)).toFixed(1)}%`;
        const stops = art.sky.filter(([y]) => y < UNDER).map(([y, c]) => `#${c.toString(16).padStart(6, '0')} ${at(y)}`);
        const last = `#${art.sky[art.sky.length - 1][1].toString(16).padStart(6, '0')}`;
        root.value.style.background = `linear-gradient(to bottom, ${stops.join(', ')}, ${last} ${at(UNDER)}, ${GROUND} ${at(UNDER)}, ${GROUND} 100%)`;
    };

    const ellipse = ({ x, y, rx, ry }, grow = 1) => ({ left: sx(x - rx * grow), top: sy(y - ry * grow), w: 2 * rx * grow * k(), h: 2 * ry * grow * k() });

    const place = (w, h) => {
        layout(w, h);
        paintSky();
        streaks.forEach((g, i) => L.streaks[i].place(rectOf(g.rect)));
        const hills = rectOf(B.hills);
        L.hills.forEach(({ node, side }) => node.place({ ...hills, left: hills.left + side * hills.w }));
        const plain = rectOf(B.plain);
        L.plain.forEach(({ node, side }) => node.place({ ...plain, left: plain.left + side * plain.w }));
        L.ground.place(rectOf(B.ground));
        L.pond.place(ellipse(POND));
        L.spot.place(ellipse(SPOT));
        L.spotGlow.place(ellipse(SPOT, 4.5));
        L.pondLines.place(rectOf(B.pond));
        L.tree.pivot = { x: sx(POND.x), y: sy(POND.y) };
        L.crown.pivot = { x: sx(CROWN.x), y: sy(CROWN.y) };
        const sr = SUN.r * k();
        L.sun.place({ left: sx(SUN.x) - sr, top: sy(SUN.y) - sr, w: 2 * sr, h: 2 * sr });
        const sg = sr * 5;
        L.sunGlow.place({ left: sx(SUN.x) - sg / 2, top: sy(SUN.y) - sg / 2, w: sg, h: sg });
        const seed = rectOf(B.seed);
        L.seed.place(seed, { x: seed.left + seed.w * 0.45, y: seed.top + seed.h * 0.6 });
        const gd = Math.max(seed.w, seed.h) * 1.7;
        L.seedGlow.place({ left: seed.left + seed.w / 2 - gd / 2, top: seed.top + seed.h / 2 - gd / 2, w: gd, h: gd });
        L.trunk.place(rectOf(B.tree));
        L.sap.place(rectOf(SAP_BOX));
        glyph = rectOf(RULITO);
        L.rulito.place({ left: glyph.left - 0.4375 * glyph.w, top: glyph.top - 0.1628 * glyph.h, w: glyph.w * 1.875, h: glyph.h * 1.3256 },
            { x: glyph.left + glyph.w / 2, y: glyph.top + glyph.h });
        rulito.value?.frame({ width: glyph.w });
        L.rulito.refresh();
        const small = rectOf(B.small);
        L.small.pivot = { x: small.left + small.w * 0.6, y: small.top + small.h };
        L.smallBody.place(small, { x: small.left + small.w * 0.6, y: small.top + small.h });
        const eyes = rectOf(B.smallEyes);
        L.eyes.place(eyes);
        const elder = rectOf(B.elder);
        L.elder.pivot = { x: elder.left + elder.w * 0.5, y: elder.top + elder.h };
        L.elderBody.place(elder, { x: elder.left + elder.w * 0.5, y: elder.top + elder.h });
        L.cup.place(rectOf(B.cup));
        signs.forEach((g, i) => L.signs[i].place(rectOf(g.rect)));
    };

    // The touch target for the keyboard: the seed (a touch anywhere on the scene strums too)
    const placeHits = () => {
        if (!L.tree || !seedHit.value) return;
        const b = L.tree.boxOnScreen(rectOf(B.seed));
        const bw = Math.max(64, b.width), bh = Math.max(64, b.height);
        seedHit.value.style.translate = `${(b.left + b.width / 2 - bw / 2).toFixed(1)}px ${(b.top + b.height / 2 - bh / 2).toFixed(1)}px`;
        seedHit.value.style.width = `${bw.toFixed(1)}px`;
        seedHit.value.style.height = `${bh.toFixed(1)}px`;
    };

    const enter = () => {
        if (entered || !props.active || !stage) return;
        entered = true;
        stage.ready().then(() => { if (!gone) { stage.start(); dust?.reveal(); } });
    };

    let frames = 0;
    const frame = ({ x, y, scroll, t, ramp }) => {
        if (!stage || !L.tree) return;
        const dt = Math.min(0.1, Math.max(0, t - lastT));
        lastT = t;
        stage.look(x * SLIDE, y * SLIDE_Y);
        flare = Math.max(0, flare - dt * 0.9);
        hop = Math.max(0, hop - dt * 1.6);
        bow = Math.max(0, bow - dt * 0.5);

        // ---- The sky: the streaks drift a little along themselves and breathe
        streaks.forEach((g, i) => {
            const n = L.streaks[i];
            n.x = Math.sin(t * 0.15 + g.phase) * 14 * ramp;
            n.y = Math.sin(t * 0.15 + g.phase) * -5 * ramp;
            n.opacity = 0.75 + 0.25 * Math.sin(t * 0.5 + g.phase);
        });
        L.hillsNode.y = scroll * 14;

        // ---- The pond: its light breathes; the crown sways and the sun turns with it; the seed breathes and glows
        const breath = Math.sin(t * 0.7);
        L.spot.scale = 1 + 0.05 * breath * ramp + 0.15 * flare;
        L.spotGlow.opacity = 0.55 + 0.2 * breath + 0.4 * flare;
        L.spotGlow.scale = 1 + 0.1 * breath + 0.3 * flare;
        const angle = reduced ? 0 : (2.2 * Math.sin(t * 0.55) + 0.9 * Math.sin(t * 1.27 + 1)) * ramp;
        L.trunk.sways = [[(CROWN.x - B.tree[0]) / B.tree[2], (CROWN.y - B.tree[1]) / B.tree[3], CROWN.w, angle, 1]];
        L.crown.rotate = angle * SUN_SWAY;
        L.sun.scale = 1 + 0.03 * Math.sin(t * 1.1) * ramp + 0.12 * flare + 0.25 * bloomed;
        L.sunGlow.opacity = 0.6 + 0.15 * Math.sin(t * 1.1) + 0.3 * flare + 0.4 * bloomed;
        L.sunGlow.scale = 1 + 0.06 * Math.sin(t * 1.1) + 0.25 * flare + 0.6 * bloomed;
        const grown = ease(Math.min(1, flare * 1.4));
        L.seed.scale = 1 + 0.012 * Math.sin(t * 0.9) * ramp + 0.05 * grown + 0.07 * ease(bloomed);
        L.seed.uniforms.uBright.value = 1 + 0.12 * flare + 0.08 * bloomed;
        L.seedGlow.opacity = 0.55 + 0.2 * Math.sin(t * 0.9) + 0.45 * flare + 0.25 * bloomed;
        L.seedGlow.scale = 1 + 0.05 * Math.sin(t * 0.9) + 0.2 * flare + 0.35 * bloomed;
        L.landNode.y = scroll * 22;

        // ---- The little one breathes, blinks, looks about and, touched, hops; the elder breathes slowly and, touched, bows
        const smallP = L.smallBody.pivot;
        L.smallBody.sy = 1 + 0.015 * Math.sin(t * 1.6) * ramp;
        L.smallBody.sx = 1 - 0.006 * Math.sin(t * 1.6) * ramp;
        L.small.y = -Math.sin(hop * Math.PI) * 26 * k() * (hop > 0 ? 1 : 0);
        L.small.rotate = reduced ? 0 : Math.sin(t * 0.4) * 1.2 * ramp;
        if (!reduced && t > blinkAt + 0.2) blinkAt = t + 2.5 + Math.random() * 4;
        const since = t - blinkAt;
        L.eyes.sy = !reduced && since > 0 && since < 0.18 ? 0.1 + 0.9 * Math.abs(since / 0.09 - 1) : 1;
        const look = reduced ? 0 : lookFor(t);
        L.eyes.x = look * 4 * k() * 2.5;
        L.eyes.y = (L.smallBody.sy - 1) * -(smallP.y - L.eyes.pivot.y);
        L.elderBody.sy = 1 + 0.012 * Math.sin(t * 0.5) * ramp;
        L.elderBody.sx = 1 - 0.005 * Math.sin(t * 0.5) * ramp;
        L.elder.rotate = -4 * Math.sin(Math.min(1, bow) * Math.PI) * (bow > 0 ? 1 : 0);
        L.cup.y = (L.elderBody.sy - 1) * -(L.elderBody.pivot.y - L.cup.pivot.y);
        L.beingsNode.y = scroll * 26;

        // ---- Fluir: the sap, and the signs it takes in
        measureTree();
        if (!win) flow.step(dt, t, pointer, { key: keyHold });
        if (pointer.down && flow.acc > 0.3) slid = true;
        runPhase += dt * 30 * (1.4 + 1.2 * Math.max(flow.acc, cur.light));
        const named = stepWin(dt, t);
        if (frames % 2 === 0) drawSap(t);
        placeHead();

        // ---- The signs float, each on its own; one let go drifts into the trunk where the sap is, shrinking and
        // melting into it; taken in, it is gone until the sap has faded, and then it comes back where it was
        L.signsNode.y = scroll * 30;
        const treeDrift = stage.drift(L.landNode.z), signDrift = stage.drift(L.signsNode.z);
        signs.forEach((g, i) => {
            const n = L.signs[i], st = SIGNS[i];
            if (st.letGo) st.p = Math.min(1, st.p + dt / 0.9);
            st.back = Math.min(1, st.back + dt / 2);
            const knot = KNOTS.find((kn) => kn.sign === i);
            const [cx, cy] = centreOf(g.rect);
            const e = ease(st.p);
            const toX = (sx(RX(knot.enter)) - sx(cx)) + treeDrift.x - signDrift.x;
            const toY = (sy(RY(knot.enter)) - sy(cy)) + treeDrift.y + L.landNode.y - signDrift.y - L.signsNode.y;
            n.y = (Math.sin(t * 0.45 + g.phase) * 10 * ramp - 8 * flare) * (1 - e) + toY * e;
            n.x = Math.sin(t * 0.3 + g.phase * 2) * 5 * ramp * (1 - e) + toX * e;
            n.rotate = Math.sin(t * 0.5 + g.phase * 3) * 6 * ramp + 120 * e;
            n.scale = (1 + 0.06 * flare) * (1 - 0.8 * e) * (0.6 + 0.4 * ease(st.back));
            n.opacity = (1 - ease(Math.max(0, (st.p - 0.5) / 0.5))) * ease(st.back);
        });
        stage.bloom = reduced ? 0 : Math.max(0.25 + 0.35 * flare, 0.7 * named);

        // The particles that belong to a layer follow it
        const skyDrift = stage.drift(zFor(DEPTH.stars)), landDrift = stage.drift(L.landNode.z);
        dust?.shift(0, skyDrift.x, skyDrift.y);
        for (const i of [1, 2, 3, 4]) dust?.shift(i, landDrift.x, landDrift.y + L.landNode.y);
        dust?.turn(1, L.crown.rotate, sx(CROWN.x), sy(CROWN.y));
        stage.render(t);
        if (frames++ % 2 === 0) placeHits();
    };

    // Now and then the little one's eyes look aside, to one side and later to the other (-1..1)
    const lookFor = (t) => {
        const c = t % 17;
        if (c > 6 && c < 9) return Math.sin((c - 6) / 3 * Math.PI) ** 2;
        if (c > 12 && c < 14) return -(Math.sin((c - 12) / 2 * Math.PI) ** 2);
        return 0;
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
        const fromArt = (list, colour, scale = 1) => list.map(([x, y, r, c]) => [sx(x), sy(y), Math.max(1.2, 2 * r * k() * scale), c ?? colour]);
        // The stars of the card, and as many again over the sky the frame does not cover
        const stars = () => {
            const own = fromArt(art.stars, 0xf0d0e8);
            const density = art.stars.length / (F.size * F.size * 0.65);
            const more = [];
            const want = Math.min(260, Math.round(density * Math.max(0, W * H - F.size * F.size)));
            for (let tries = 0; more.length < want && tries < want * 6; tries++) {
                const px = Math.random() * W, py = Math.random() * Math.min(H, sy(1450));
                if (px > F.x && px < F.x + F.size && py > F.y) continue;
                more.push([px, py, (1.4 + Math.random() ** 2 * 3) * Math.max(0.7, k() * 2.5), 0xf0d0e8]);
            }
            return [...own, ...more];
        };
        dust = startStardust(null, {
            stage,
            manual: true,
            groups: [
                // 0: the stars, behind everything
                { colors: [0xf0d0e8], look: 'hard', parallax: 0, drift: 1, twinkle: 0.45, reach: 0, order: -20, points: stars },
                // 1: the stipple round the little sun, turning with the crown
                { colors: [SUN.color], parallax: 0, drift: 2, jitter: 0.5, twinkle: 0.2, reach: 0, order: after(L.sun),
                    points: () => sampleCloud(SUN_CLOUD, (u, v) => [sx(u), sy(v)], k(), 1.6).map(([x, y, size]) => [x, y, size, SUN.color]) },
                // 2: the seed's aura, behind it
                { colors: [TEAL], parallax: 0, drift: 1.6, jitter: 0.4, twinkle: 0.4, reach: 40, push: 6, order: after(L.seedGlow), points: () => fromArt(art.aura, TEAL, 1.2) },
                // 3: the golden dust of the card, rising from the pond along the trunk, stirred by a finger
                { colors: [GOLD], parallax: 0, drift: 3, jitter: 0.6, twinkle: 0.4, reach: 70, push: 14, bloom: true, order: after(L.trunk), points: () => fromArt(art.dust, GOLD, 1.1) },
                // 4: more motes keep rising from the light of the pond
                { colors: [0xffefb0], dynamic: riseGroup, look: 'soft', parallax: 0, drift: 1, twinkle: 0.2, reach: 0, bloom: true, order: after(L.trunk) + 0.1 },
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
        <canvas class="stageCanvas" ref="canvas"></canvas>
        <!-- The rulito is drawn on its own canvas, which the stage shows as a texture over the seed -->
        <Rulito ref="rulito" class="offstage" color="#f5d35a" />
        <!-- The sap's head: a finger slides from here up the tree with it, or Enter held on it goes with it -->
        <div ref="headHit" class="hit head" role="button" tabindex="0"
            :aria-label="$i18n.locale === 'en' ? 'The sap: slide your finger up the tree with it (or hold Enter)' : 'La savia: deslizá el dedo junto a ella árbol arriba (o mantené Enter)'"
            @pointerdown.prevent="holdHead" @click.stop @keydown="onHeadKey(true)($event)" @keyup="onHeadKey(false)($event)" @blur="keyHold = false"></div>
        <div ref="seedHit" class="hit" role="button" tabindex="0"
            :aria-label="$i18n.locale === 'en' ? 'The seed of the tree, glowing' : 'La semilla del árbol, brillando'"
            @keydown="onKey"></div>
    </div>
</template>

<style scoped>
    .scene {
        position: absolute;
        inset: 0;
        overflow: hidden;
        background: #efa0ac;
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

    /* The sap's head: the finger slides from here with it, so the page must not scroll from here */
    .hit.head {
        border-radius: 50%;
        touch-action: none;
        cursor: grab;
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
