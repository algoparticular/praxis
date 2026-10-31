<script setup>
    // Fe: faith, trusting what cannot be seen yet. Sid sits on the grass by a river with a light on his chest, a yellow
    // stipple round him; behind the river two great mushrooms, one coral and one in the blue of the sky, stand among
    // ferns and white rocks, a teal trunk rises on the left, and on this side of the water a lotus holds up a glowing
    // green bud, two little mushrooms glow coral and a log sleeps by its rocks. Over the yellow of the card lie great
    // blue shapes, like water poured over the drawing: where they pass, everything under them takes their hue.
    // Its verb will be Arraigar (to hold until something grows); there is no game yet. Sid (and his heart), the lotus,
    // the two little mushrooms and the log are each their own picture, so the game can light them. For now a touch is
    // only answered: on Sid his heart flares and the chord is strummed (`star`); on the lotus its bud flares and it
    // rocks a little (`tap`).
    // The sky is not a picture: the card's yellow (the root's background) and the blue shapes, drawn in code from their
    // outlines (feScene.json `sky`), which the converter traced from layers 15 and 16. Those shapes are in Colour mode in
    // the illustration (their hue, the lightness of what is under them), which the stage cannot blend live: over the
    // pictures the converter worked it out into them. The loose coral stipple of the caps, the glow of the little
    // mushrooms and of the bud, Sid's aura and the light on his chest are particles; coral spores rise from the caps.
    // It is drawn in WebGL (useLayerStage): the clouds (one atlas, at three depths, drifting), the far bank with the
    // trunk and the mushrooms, the river with its little waves (one atlas, drifting with the current), the near bank and
    // Sid are planes at their depths. On a wide screen the land goes on past the frame, mirrored on both sides (the
    // sky's shapes too), and above the frame the sky and the trunk are mirrored upwards. The big mushrooms lean and
    // breathe, the ferns and tufts sway (`sway`), the lotus and the little mushrooms sway in the wind (`wind`), the
    // light of the water ripples on the river (`water`); Sid breathes, blinks and now and then looks to a side. From
    // feScene.json and public/assets/fe (made by scripts/convert-fe.mjs). The touch targets are DOM elements over Sid
    // and the lotus.
    import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { floorFor, floorUnder } from '../../data/stageFloor.js';
    import { createParallax } from '../../composables/useParallax.js';
    import { createLayerStage } from '../../composables/useLayerStage.js';
    import { startStardust } from '../../composables/useStardust.js';
    import { play } from '../../composables/useSound.js';
    import art from '../../composables/feScene.json';

    const props = defineProps({
        card: { type: Object, default: () => ({}) },
        active: Boolean
    });

    const root = ref(null);
    const canvas = ref(null);
    const sidHit = ref(null);
    const lotusHit = ref(null);
    let stageEl = null;
    let stage = null;
    let parallax = null;
    let dust = null;
    let entered = false;
    let gone = false;
    let lastT = 0;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ASSET = '/assets/fe/';

    // ---- Layout: the illustration is a 2160 square resting on the bottom of the screen. On a phone upright it is as big
    // as Sid and what is round him allow across, centred on him; on a wide screen the land goes on past the frame
    const SIZE = art.size;
    const B = art.boxes;
    let F = { x: 0, y: 0, size: 1 };
    let W = 1, H = 1;
    const k = () => F.size / SIZE;
    const sx = (x) => F.x + x * k();
    const sy = (y) => F.y + y * k();
    const rectOf = ([left, top, w, h]) => ({ left: sx(left), top: sy(top), w: w * k(), h: h * k() });
    const SPAN = 1500, FOCUS = 1080;        // art px across that must be seen on a phone, and their middle (Sid)
    const DROP = 0.05;                      // how much of the frame goes under the bottom of a wide screen
    const layout = (w, h) => {
        W = w; H = h;
        const phone = w < h;
        // (on a wide screen the frame reaches the top: the card's own sky is over Sid, and nothing has to be made up over it)
        const size = phone ? Math.min(0.72 * h, w * SIZE / SPAN) : Math.min(w, h / (1 - DROP));
        let x = w / 2 - size / 2;
        if (phone && size > w) x = Math.min(0, Math.max(w - size, w / 2 - FOCUS * size / SIZE));
        F = { x, y: h - floorFor(w, h) - size + (phone ? 0 : DROP * size), size };
    };

    const SLIDE = 50;
    const SLIDE_Y = 30;
    const zFor = (amp) => amp / (SLIDE + amp);
    const DEPTH = { clouds: [4, 6, 8], far: 12, river: 15, near: 19, sid: 24 };
    const SIDES = [-1, 0, 1];               // the land's copies: mirrored on the left, as drawn, mirrored on the right

    // ---- The clouds and the little waves: cut out of the illustration (one atlas each)
    const [CW, CH] = art.cloudAtlas;
    const clouds = art.clouds.map(([x, y, w, h, ax, ay], i) => ({
        i, art: { x: x + w / 2, y: y + h / 2, w, h }, crop: [ax / CW, ay / CH, w / CW, h / CH],
        rest: { left: 0, top: 0, w: 1, h: 1 }, x0: 0, phase: Math.random() * 6.28, speed: 7 + (i % 3) * 3, depth: i % 3,
    }));
    let span = { left: 0, width: 1 };
    const [VW, VH] = art.waveAtlas;
    const waves = art.waves.map(([x, y, w, h, ax, ay], i) => ({
        i, box: [x, y, w, h], crop: [ax / VW, ay / VH, w / VW, h / VH], phase: (i * 0.37) % 1, period: 7 + (i % 3) * 1.5,
    }));

    // ---- What sways, in art px: [x, y of the point it bends about, width, angle (deg), stretch, speed]. The big
    // mushrooms lean from their foot and breathe; the right one is cut by the frame and mirrored past it, so it only
    // breathes (a lean would tear it where it meets its mirror), and so does the bush on the left edge
    const FAR_SWAYS = [
        [960, 1040, 560, 1.1, 0.014, 0.42],     // the left mushroom
        [2160, 1160, 800, 0, 0.012, 0.36],      // the right one
        [800, 1078, 230, 4, 0.03, 0.9],         // the fern by the left stem, with its curled sprout
        [1725, 1010, 200, 5, 0.025, 0.8],       // the tuft by the right stem
        [142, 990, 70, 6, 0.03, 1.1],           // the little tufts by the rocks
        [1265, 984, 60, 6, 0.03, 1.2],
    ];
    const NEAR_SWAYS = [
        [60, 1310, 150, 0, 0.04, 0.8],          // the bush on the left edge
        [532, 1392, 60, 6, 0.03, 1.1],
        [2040, 1500, 75, 5, 0.03, 1],
        [326, 1792, 60, 6, 0.03, 1.15],
    ];
    const swaysOf = (list, [bx, by, bw, bh], t, ramp) => list.map(([x, y, w, angle, stretch, speed], i) => {
        const s = Math.sin(t * speed + i * 1.7) * 0.7 + Math.sin(t * speed * 2.3 + i) * 0.3;
        return [(x - bx) / bw, (y - by) / bh, w / bw, angle * s * ramp, 1 + stretch * Math.sin(t * speed * 0.8 + i * 2.1) * ramp];
    });

    // ---- Spores rising from the two caps, coral, slow
    const SPORES = 34;
    const spores = Array.from({ length: SPORES }, (_, i) => ({ seed: Math.random(), from: i % 2, life: 7 + Math.random() * 5, at: Math.random() }));
    const CAPS = [[650, 1280, 560], [1460, 2160, 600]];      // x0, x1 and the rim (y) of each cap, art px
    const sporeGroup = {
        count: SPORES,
        update(t, data) {
            spores.forEach((p, i) => {
                const age = ((t / p.life + p.at) % 1);
                if (age < 0.01) p.seed = Math.random();
                const [x0, x1, rim] = CAPS[p.from];
                const x = sx(x0 + (x1 - x0) * p.seed) + Math.sin(t * 0.6 + p.seed * 20) * 14 * k() * 3;
                const y = sy(rim - 120 * p.seed) - age * 420 * k();
                data.positions[i * 3] = x;
                data.positions[i * 3 + 1] = y;
                data.sizes[i] = 2.2 + 2 * p.seed;
                data.alphas[i] = reduced ? 0 : Math.sin(age * Math.PI) * 0.75;
                data.tints.set([1, 0.62 + 0.15 * p.seed, 0.6], i * 3);
            });
        },
    };

    // ---- Life: Sid breathes, blinks, now and then looks to a side; a touch flares his heart, or the lotus's bud
    let lookAt = 6, lookTo = 0, look = 0;
    let flare = 0, budFlare = 0;
    const L = {};

    const touchSid = () => {
        play('star');
        flare = 1;
        dust?.boost(5, 1.2);
        dust?.boost(4, 0.6);
    };
    const touchLotus = () => {
        play('tap');
        budFlare = 1;
        dust?.boost(3, 1.2);
    };
    const onKey = (fn) => (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        fn();
    };

    // ---- The sky, drawn in code: the card's yellow is the root's background; the blue shapes are drawn on a canvas,
    // with their copies past the frame (mirrored on both sides, and upwards over its top)
    const MARGIN = 90;
    const skyCanvas = document.createElement('canvas');
    const hexColour = (c) => `#${c.toString(16).padStart(6, '0')}`;
    const paintSky = () => {
        const res = Math.min(2, stage.dpr);
        const cw = Math.round((W + 2 * MARGIN) * res), ch = Math.round((H + 2 * MARGIN) * res);
        if (skyCanvas.width !== cw || skyCanvas.height !== ch) { skyCanvas.width = cw; skyCanvas.height = ch; }
        const ctx = skyCanvas.getContext('2d');
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, cw, ch);
        ctx.fillStyle = hexColour(art.sky.blue);
        const s = k();
        for (const side of SIDES) {
            for (const up of [0, 1]) {
                // The frame's copy: side -1 mirrored about its left edge, 1 about its right one; up mirrored about its top
                const left = side === 0 ? F.x : side < 0 ? F.x : F.x + F.size * 2;
                const ax = side === 0 ? s : -s;
                const ay = up ? -s : s;
                if (left + Math.min(0, ax * SIZE) > W || left + Math.max(0, ax * SIZE) < 0) continue;
                if (up && F.y <= -MARGIN) continue;
                ctx.setTransform(ax * res, 0, 0, ay * res, (left + MARGIN) * res, (F.y + MARGIN) * res);
                ctx.beginPath();
                for (const shape of art.sky.shapes) {
                    // Smooth: a curve through the middle of each pair of points
                    const n = shape.length / 2;
                    const px = (j) => shape[(j % n) * 2], py = (j) => shape[(j % n) * 2 + 1];
                    ctx.moveTo((px(0) + px(1)) / 2, (py(0) + py(1)) / 2);
                    for (let j = 1; j <= n; j++) ctx.quadraticCurveTo(px(j), py(j), (px(j) + px(j + 1)) / 2, (py(j) + py(j + 1)) / 2);
                    ctx.closePath();
                }
                ctx.fill();
            }
        }
        L.sky.refresh();
    };

    const build = (s) => {
        // The sky's blue shapes, at the depth of the far bank so they meet the land where the card has them meet
        const skyNode = s.depth(zFor(DEPTH.far));
        L.skyNode = skyNode;
        L.sky = skyNode.canvas(skyCanvas);
        // The clouds, at three depths
        L.clouds = [];
        L.cloudNodes = DEPTH.clouds.map((depth, d) => {
            const node = s.depth(zFor(depth));
            clouds.filter((c) => c.depth === d).forEach((c) => { L.clouds[c.i] = node.image(`${ASSET}clouds.webp`, { crop: c.crop }); });
            node.enter({ y: -20, delay: 200 + 150 * d, duration: 2000 });
            return node;
        });
        // The river and its little waves
        const river = s.depth(zFor(DEPTH.river));
        L.riverNode = river;
        L.river = SIDES.map((side) => {
            const node = river.image(`${ASSET}river.webp`, { water: 1 });
            if (side) node.sx = -1;
            return { node, side };
        });
        L.waves = waves.map((wv) => river.image(`${ASSET}waves.webp`, { crop: wv.crop }));
        river.enter({ y: 30, delay: 100, duration: 1700 });
        // The far bank, with the trunk (mirrored upwards over the frame) and the mushrooms
        const far = s.depth(zFor(DEPTH.far));
        L.farNode = far;
        L.far = SIDES.map((side) => {
            const node = far.image(`${ASSET}far.webp`, { sway: true });
            if (side) node.sx = -1;
            return { node, side };
        });
        L.trunk = [[0, 0], [-1, 0], [0, 1], [-1, 1]].map(([side, up]) => {
            const node = far.image(`${ASSET}trunk.webp`);
            if (side) node.sx = -1;
            if (up) node.sy = -1;
            return { node, side, up };
        });
        L.capDotsAt = far.group();
        far.enter({ y: 40, delay: 50, duration: 1700 });
        // The near bank, and on it the lotus, the log and the two little mushrooms with their lights
        const near = s.depth(zFor(DEPTH.near));
        L.nearNode = near;
        L.near = SIDES.map((side) => {
            const node = near.image(`${ASSET}near.webp`, { sway: true });
            if (side) node.sx = -1;
            return { node, side };
        });
        L.log = near.image(`${ASSET}log.webp`);
        L.budLight = near.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: art.colors.bud, stops: [[0, 0.5], [0.35, 0.18], [0.7, 0]] });
        L.lotus = near.image(`${ASSET}lotus.webp`, { wind: { amp: 4, speed: 0.7, root: 'bottom' } });
        L.sproutLights = [0, 1].map(() => near.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: art.colors.sprout, stops: [[0, 0.4], [0.35, 0.14], [0.7, 0]] }));
        L.sprouts = near.image(`${ASSET}sprouts.webp`, { wind: { amp: 3, speed: 1.1, root: 'bottom' } });
        near.enter({ y: 60, delay: 150, duration: 1800 });
        // Sid, with his aura and the light on his chest
        const sid = s.depth(zFor(DEPTH.sid));
        L.sidNode = sid;
        L.sidGroup = sid.group();
        L.warmth = L.sidGroup.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: 0xfff1b8, stops: [[0, 0.35], [0.4, 0.12], [0.72, 0]] });
        L.sid = L.sidGroup.image(`${ASSET}sid.webp`);
        L.eyes = L.sidGroup.image(`${ASSET}eyes.webp`);
        L.heart = L.sidGroup.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: art.colors.heart, stops: [[0, 0.75], [0.3, 0.32], [0.65, 0]], bloom: true });
        sid.enter({ y: 70, delay: 350, duration: 1900 });
    };

    // The ground along the card's bottom edge, for the band under the frame on a phone ([x in art px, colour], read off the card's bottom rows)
    const FLOOR_COLOURS = [[0, '#7592b3'], [384, '#63a67b'], [1392, '#7592b3']];
    const place = (w, h) => {
        layout(w, h);
        // under the frame on a phone, the ground along the card's bottom edge (stageFloor.js), over the yellow
        root.value.style.background = `${floorUnder(w, h, F, FLOOR_COLOURS)}${hexColour(art.sky.yellow)}`;
        const flip = (r, side, up = 0) => ({
            left: side === 0 ? r.left : side < 0 ? 2 * F.x - r.left - r.w : 2 * (F.x + F.size) - r.left - r.w,
            top: up ? 2 * F.y - r.top - r.h : r.top, w: r.w, h: r.h,
        });

        // The clouds, spread over the sky between the card's name and the land, over the whole width
        const wide = Math.max(w, F.size);
        const below = titleBottom(h) + 12;
        let widest = 0;
        clouds.forEach((c) => {
            const cw = c.art.w * k(), chh = c.art.h * k();
            const x = w / 2 + (c.art.x - 1080) / SIZE * wide;
            const top = below + chh / 2 + 8, bottom = Math.max(top, sy(640));
            const y = top + (c.art.y - 130) / 640 * (bottom - top);
            c.x0 = x;
            c.rest = { left: x - cw / 2, top: y - chh / 2, w: cw, h: chh };
            widest = Math.max(widest, cw);
            L.clouds[c.i].place(c.rest);
        });
        span = { left: -SLIDE * 2 - widest / 2, width: w + SLIDE * 4 + widest };

        const river = rectOf(B.river);
        L.river.forEach(({ node, side }) => node.place(flip(river, side)));
        waves.forEach((wv, i) => L.waves[i].place(rectOf(wv.box)));
        const far = rectOf(B.far);
        L.far.forEach(({ node, side }) => node.place(flip(far, side)));
        const trunk = rectOf(B.trunk);
        L.trunk.forEach(({ node, side, up }) => node.place(flip(trunk, side, up)));
        const near = rectOf(B.near);
        L.near.forEach(({ node, side }) => node.place(flip(near, side)));
        L.log.place(rectOf(B.log));
        const lotus = rectOf(B.lotus);
        L.lotus.place(lotus, { x: lotus.left + lotus.w * 0.45, y: lotus.top + lotus.h });
        const sprouts = rectOf(B.sprouts);
        L.sprouts.place(sprouts, { x: sprouts.left + sprouts.w / 2, y: sprouts.top + sprouts.h });
        const bud = BUD();
        const bd = 260 * k();
        L.budLight.place({ left: sx(bud[0]) - bd / 2, top: sy(bud[1]) - bd / 2, w: bd, h: bd });
        SPROUT_CAPS.forEach(([x, y], i) => {
            const d = 200 * k();
            L.sproutLights[i].place({ left: sx(x) - d / 2, top: sy(y) - d / 2, w: d, h: d });
        });

        const sid = rectOf(B.sid);
        L.sid.place(sid, { x: sid.left + sid.w / 2, y: sid.top + sid.h });
        const eyes = rectOf(B.eyes);
        L.eyes.place(eyes);
        const wd = 900 * k();
        L.warmth.place({ left: sx(1080) - wd / 2, top: sy(1420) - wd / 2, w: wd, h: wd });
        const hd = 420 * k();
        L.heart.place({ left: sx(HEART[0]) - hd / 2, top: sy(HEART[1]) - hd / 2, w: hd, h: hd });
        L.sidGroup.pivot = { x: sx(1080), y: sy(2060) };

        // The sky's canvas covers the screen and a margin round it, for the parallax
        L.sky.place({ left: -MARGIN, top: -MARGIN, w: w + 2 * MARGIN, h: h + 2 * MARGIN });
        paintSky();
    };

    // Where the light on Sid's chest is, the lotus's bud and the little mushrooms' caps (art px), from their dots
    const centre = (list) => list.length ? [list.reduce((s, p) => s + p[0], 0) / list.length, list.reduce((s, p) => s + p[1], 0) / list.length] : [0, 0];
    const HEART = centre(art.heart);
    const BUD = () => centre(art.budGlow);
    const SPROUT_CAPS = [art.sproutGlow.filter((p) => p[0] < 615), art.sproutGlow.filter((p) => p[0] >= 615)].map(centre);

    // Where the card's name ends (the stage's h1, over the scene), so the clouds keep under it
    const titleBottom = (h) => {
        const title = stageEl?.querySelector('h1');
        if (!title || !root.value) return 0.16 * h;
        return title.getBoundingClientRect().bottom - root.value.getBoundingClientRect().top;
    };

    // The touch targets: Sid, and the lotus
    const placeHit = (el, node, box, min = 64) => {
        if (!el || !node) return;
        const b = node.boxOnScreen(rectOf(box));
        const bw = Math.max(min, b.width), bh = Math.max(min, b.height);
        el.style.translate = `${(b.left + b.width / 2 - bw / 2).toFixed(1)}px ${(b.top + b.height / 2 - bh / 2).toFixed(1)}px`;
        el.style.width = `${bw.toFixed(1)}px`;
        el.style.height = `${bh.toFixed(1)}px`;
    };
    const placeHits = () => {
        placeHit(sidHit.value, L.sidGroup, [840, 1060, 480, 1000]);
        placeHit(lotusHit.value, L.lotus, [60, 1220, 520, 520]);
    };

    const enter = () => {
        if (entered || !props.active || !stage) return;
        entered = true;
        stage.ready().then(() => { if (!gone) { stage.start(); dust?.reveal(); } });
    };

    let frames = 0;
    const frame = ({ x, y, scroll, t, ramp }) => {
        if (!stage || !L.sid) return;
        const dt = Math.min(0.1, Math.max(0, t - lastT));
        lastT = t;
        stage.look(x * SLIDE, y * SLIDE_Y);

        // ---- The clouds drift from left to right, wrapping round, rising and falling a little
        clouds.forEach((c) => {
            const node = L.clouds[c.i];
            const moved = c.x0 + c.speed * t;
            const wrapped = span.left + ((((moved - span.left) % span.width) + span.width) % span.width);
            node.x = wrapped - c.x0;
            node.y = Math.sin(t * 0.3 + c.phase) * 6 * ramp;
            node.sx = 1 + 0.03 * Math.sin(t * 0.4 + c.phase) * ramp;
        });

        // ---- The little waves drift with the current and fade, then come back where they were
        waves.forEach((wv, i) => {
            const p = reduced ? 0.5 : ((t / wv.period + wv.phase) % 1);
            L.waves[i].x = (p - 0.5) * 60 * k();
            L.waves[i].opacity = reduced ? 1 : Math.min(1, Math.sin(p * Math.PI) * 1.6);
        });

        // ---- The far bank's mushrooms, ferns and tufts, and the near bank's bush and tufts
        if (!reduced) {
            const farSways = swaysOf(FAR_SWAYS, B.far, t, ramp);
            L.far.forEach(({ node }) => { node.sways = farSways; });
            const nearSways = swaysOf(NEAR_SWAYS, B.near, t, ramp);
            L.near.forEach(({ node }) => { node.sways = nearSways; });
        }

        // ---- The lotus and its bud, the little mushrooms' lights
        budFlare = Math.max(0, budFlare - dt * 0.8);
        flare = Math.max(0, flare - dt * 0.7);
        L.lotus.rotate = budFlare * Math.sin(t * 9) * 2.5;
        L.lotus.uniforms.uBright.value = 1 + 0.12 * budFlare;
        L.budLight.opacity = 0.55 + 0.2 * Math.sin(t * 1.3) + 0.45 * budFlare;
        L.budLight.scale = 1 + 0.6 * budFlare;
        L.sproutLights.forEach((g, i) => { g.opacity = 0.5 + 0.2 * Math.sin(t * 1.1 + i * 2.4); });

        // ---- Sid breathes (from his seat), blinks, and now and then looks to a side; the light on his chest beats slowly
        const breath = Math.sin(t * 1.05);
        L.sid.sy = 1 + 0.012 * breath * ramp + 0.03 * flare;
        L.sid.sx = 1 - 0.004 * breath * ramp;
        L.sidGroup.y = -6 * flare * k() * 3;
        if (!reduced) {
            if (t > lookAt) { lookTo = lookTo === 0 ? (Math.random() < 0.5 ? -1 : 1) : 0; lookAt = t + (lookTo === 0 ? 5 + Math.random() * 4 : 1.6 + Math.random()); }
            look += (lookTo - look) * Math.min(1, dt * 5);
        }
        L.eyes.sy = blink(t);
        L.eyes.x = look * 9 * k();
        L.eyes.y = -(L.sid.sy - 1) * (B.sid[1] + B.sid[3] - B.eyes[1] - B.eyes[3] / 2) * k();
        const beat = Math.max(0, Math.sin(t * 1.6)) ** 6;
        L.heart.opacity = 0.55 + 0.25 * beat + 0.5 * flare;
        L.heart.scale = 1 + 0.12 * beat + 0.5 * flare;
        L.warmth.opacity = 0.35 + 0.1 * breath + 0.5 * flare;
        L.sid.uniforms.uBright.value = 1 + 0.05 * flare;
        dust?.fade(5, Math.min(1, 0.75 + 0.25 * beat + flare));

        // ---- Scrolling away, the nearer planes go faster
        L.skyNode.y = L.farNode.y = scroll * 12;
        L.cloudNodes.forEach((n, d) => { n.y = scroll * (6 + 2 * d); });
        L.riverNode.y = scroll * 15;
        L.nearNode.y = scroll * 19;
        L.sidNode.y = scroll * 24;

        // The particles that belong to a layer follow it
        const farDrift = stage.drift(L.farNode.z), nearDrift = stage.drift(L.nearNode.z), sidDrift = stage.drift(L.sidNode.z);
        dust?.shift(0, farDrift.x, farDrift.y + L.farNode.y);
        dust?.shift(1, farDrift.x, farDrift.y + L.farNode.y);
        dust?.shift(2, nearDrift.x, nearDrift.y + L.nearNode.y);
        dust?.shift(3, nearDrift.x, nearDrift.y + L.nearNode.y);
        dust?.shift(4, sidDrift.x, sidDrift.y + L.sidNode.y + L.sidGroup.y);
        dust?.shift(5, sidDrift.x, sidDrift.y + L.sidNode.y + L.sidGroup.y);
        stage.bloom = 0.35 * flare;
        stage.render(t);
        if (frames++ % 2 === 0) placeHits();
    };

    // A blink every few seconds: the eyes close and open in a fifth of a second (sometimes twice)
    let blinks = [2.2];
    const blink = (t) => {
        if (reduced) return 1;
        if (t > blinks[blinks.length - 1] + 0.3) {
            const next = t + 2.8 + Math.random() * 3.5;
            blinks = Math.random() < 0.2 ? [next, next + 0.32] : [next];
        }
        let s = 1;
        blinks.forEach((at) => {
            const d = Math.abs(t - at);
            if (d < 0.1) s = Math.min(s, 0.12 + 0.88 * (d / 0.1));
        });
        return s;
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
        // The caps' stipple and the spores: on the far bank (and the right cap's mirrored past the frame)
        const capDots = () => {
            const list = fromArt(art.capDots, 0xff7777);
            const edge = sx(SIZE);
            return [...list, ...list.filter(([x]) => x > edge - 260 * k()).map(([x, y, r, c]) => [2 * edge - x, y, r, c])];
        };
        dust = startStardust(null, {
            stage,
            manual: true,
            groups: [
                // 0: the loose coral stipple round the caps
                { parallax: 0, drift: 1.6, jitter: 0.4, twinkle: 0.25, reach: 0, order: after(L.far[2].node), points: capDots },
                // 1: spores rising from the caps
                { colors: [0xffa8a0], dynamic: sporeGroup, parallax: 0, drift: 3, twinkle: 0.4, reach: 0, look: 'soft', order: after(L.far[2].node) + 0.1 },
                // 2: the glow of the two little mushrooms
                { colors: [art.colors.sprout], parallax: 0, drift: 1.4, jitter: 0.5, twinkle: 0.5, reach: 60, push: 8, order: after(L.sprouts), points: () => fromArt(art.sproutGlow, art.colors.sprout) },
                // 3: the glow of the lotus's bud
                { colors: [art.colors.bud], parallax: 0, drift: 1.6, jitter: 0.5, twinkle: 0.5, reach: 60, push: 8, order: after(L.lotus), points: () => fromArt(art.budGlow, art.colors.bud) },
                // 4: Sid's aura, behind him
                { colors: [art.colors.aura], parallax: 0, drift: 1.4, jitter: 0.4, twinkle: 0.45, reach: 0, order: after(L.warmth), points: () => fromArt(art.aura, art.colors.aura, 1.2) },
                // 5: the light on his chest
                { colors: [art.colors.heart], parallax: 0, drift: 1.8, jitter: 0.6, twinkle: 0.4, reach: 0, bloom: true, order: after(L.eyes), points: () => fromArt(art.heart, art.colors.heart, 1.2) },
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
    <div class="scene" ref="root">
        <canvas class="stageCanvas" ref="canvas"></canvas>
        <div ref="lotusHit" class="hit" role="button" tabindex="0"
            :aria-label="$i18n.locale === 'en' ? 'The lotus and its glowing bud' : 'El loto y su brote que brilla'"
            @pointerdown.prevent="touchLotus" @keydown="onKey(touchLotus)($event)"></div>
        <div ref="sidHit" class="hit" role="button" tabindex="0"
            :aria-label="$i18n.locale === 'en' ? 'Sid, with a light on his chest' : 'Sid, con una luz en el pecho'"
            @pointerdown.prevent="touchSid" @keydown="onKey(touchSid)($event)"></div>
    </div>
</template>

<style scoped>
    .scene {
        position: absolute;
        inset: 0;
        overflow: hidden;
        background: #fed989;
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
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;
        outline: none;
    }

    .hit:focus-visible {
        outline: 2px solid rgba(255, 255, 255, 0.85);
        outline-offset: 2px;
    }
</style>
