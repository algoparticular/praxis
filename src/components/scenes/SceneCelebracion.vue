<script setup>
    // Celebración: "I celebrate life, its transits and this particular moment". At night, in a clearing between two big
    // pink trees, the Samas and the little beings of the wood sit round a bonfire: one stands on the left with a fox curled
    // at his feet, one sits cross-legged with a kitten in his lap and a bowl in his hand, one stands on the right with his
    // staff and a fox beside him; cats, a pink family hugging by a cup, little hairy ones and mushrooms gather round, and
    // behind them a fern holds up five glowing lamp flowers.
    // Everything is alive and nothing is a game yet (its verb, Fluir, comes later: a spark of the fire that goes round
    // each of them while the flame grows; every being is its own picture for that). The fire flickers (the pink flame
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
    // sky over or beside the trees their trunks and branch go on. From celebracionScene.json and public/assets/celebracion (made by
    // scripts/convert-celebracion.mjs).
    import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { createParallax } from '../../composables/useParallax.js';
    import { createLayerStage } from '../../composables/useLayerStage.js';
    import { startStardust } from '../../composables/useStardust.js';
    import { play } from '../../composables/useSound.js';
    import art from '../../composables/celebracionScene.json';

    const props = defineProps({
        card: { type: Object, default: () => ({}) },
        active: Boolean
    });

    const root = ref(null);
    const canvas = ref(null);
    const groundCanvas = ref(null);
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
    const SPAN = 1750, FOCUS = 1090;        // art px across that must be seen on a phone, and their middle
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

    const L = {};
    const build = (s) => {
        // The land: the ground (code), the trees (and, where there is sky over the frame, their trunks going on up),
        // the marks of the ground, the glow of the fire on it, the fern and the lamps
        const land = s.depth(zFor(DEPTH.land));
        L.landNode = land;
        L.ground = land.canvas(groundCanvas.value);
        // (the trunks are not mirrored past the frame: twin trees would show the mirror; what the frame cuts goes on
        // as the first rows or columns of the picture, stretched: up for the trunks, up to the left for the branch)
        L.trees = ['treeLeft', 'treeRight'].map((name) => {
            const [, , w, h] = B[name];
            return {
                name,
                up: land.image(asset(name), { crop: [0, 0, 1, 3 / h] }),
                side: name === 'treeLeft' ? land.image(asset(name), { crop: [0, 0, 3 / w, 1] }) : null,
                tree: land.image(asset(name)),
            };
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
        // The trees and, where the frame leaves sky over them or beside them, their trunks and branch going on
        const top = -MARGIN;
        L.trees.forEach(({ name, up, side, tree }) => {
            const r = rectOf(B[name]);
            tree.place(r);
            const reach = Math.max(0, r.top - top);
            up.place({ left: r.left, top, w: r.w, h: reach + 1 });
            up.mesh.visible = reach > 0;
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
    };

    // ---- A touch: on one of them, it hops; anywhere else, the chord is strummed and the fire flares
    const onCanvas = (event) => {
        const area = canvas.value.getBoundingClientRect();
        return { x: event.clientX - area.left, y: event.clientY - area.top };
    };
    const touch = (event) => {
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

        // ---- The fire flickers, flares when the chord is strummed, and throws embers
        const f = flicker(t) * ramp, g = flicker(t * 0.8, 2.3) * ramp;
        L.flame.sy = 1 + 0.035 * f + 0.12 * flare;
        L.flame.sx = 1 - 0.02 * f + 0.06 * flare;
        L.heart.sy = 1 + 0.05 * g + 0.14 * flare;
        L.heart.sx = 1 - 0.03 * g + 0.05 * flare;
        L.heart.uniforms.uBright.value = 1 + 0.06 * g + 0.15 * flare;
        L.fireGlow.opacity = 0.75 + 0.15 * f + 0.25 * flare;
        L.fireGlow.scale = 1 + 0.04 * g + 0.15 * flare;
        L.warmth.opacity = 0.7 + 0.12 * f + 0.3 * flare;
        if (!reduced) {
            // (by the clock, not by frames: a slow device throws as many)
            if (nextEmber < t - 1) nextEmber = t;
            while (nextEmber <= t) { spawnEmber(nextEmber); nextEmber += 0.12 + Math.random() * 0.22 - flare * 0.08; }
        }
        stage.bloom = 0.35 * flare;

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
                const p = Math.min(1, hops[name]);
                lift = Math.sin(Math.PI * p) * 22 * Math.max(0.5, k() * 2);
                node.sy *= 1 + 0.06 * Math.sin(Math.PI * p);
                if (p >= 1) delete hops[name];
            }
            node.y = -lift;
            // A little warmth from the fire on them, flickering with it
            const u = node.body ? node.body.uniforms : node.uniforms;
            if (u) u.uBright.value = 1 + 0.035 * f + 0.08 * flare;
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
    <div class="scene" ref="root" @click="touch">
        <canvas class="stageCanvas" ref="canvas" aria-hidden="true"></canvas>
        <!-- The flat blue of the ground, drawn in code; the stage shows it as a texture under the marks -->
        <canvas class="offstage" ref="groundCanvas" aria-hidden="true"></canvas>
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

    .offstage {
        position: absolute;
        left: -9999px;
        top: 0;
        width: 40px;
        visibility: hidden;
    }
</style>
