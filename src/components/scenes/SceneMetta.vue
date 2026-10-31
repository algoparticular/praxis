<script setup>
    // Metta: loving-kindness. In the middle of a starry night Sid sits in a nest of pink and yellow mushrooms on the top of a
    // hill, inside a turquoise light that is inside a great yellow one, and round him, close, the beings of the hill (six of
    // them, standing or sitting, two arm in arm), a fox and a kitten keep him company.
    // Its verb is Dar y recibir (Dana's engine, useGiving.js), and the card says where it starts: "comenzando por vos
    // mismo", "no podemos dar lo que no tenemos". Sid is the source, but his light is low at first: the first touch has to
    // be on him, and his own light fills (his turquoise light swells and his aura of dots opens). Only then can he give:
    // a touch on anyone round him sends a light from his heart to them in an arc, and they light up (a cloud of dots of
    // the card's colours round them, a hop and a look at him). Touching another before him is not a mistake: that one
    // looks at Sid, and his light calls. When everyone has been given one they all send a light back to him at once, his
    // light swells, the rulito is born over his head (in the pink of the one drawn on the card), the card's name lights
    // up and `rulito` sounds. Then the lights fade and he is back to the start: to give again, he loves himself first.
    // The sky is as our skies always are (Dana's): a far plane of tiny faint stars, the card's stars twinkling (mostly
    // yellow, a few cream and coral; a finger stirs them), now and then a silent shooting star with a cream head and a
    // yellow tail, and a few big out-of-focus stars close to the eye. Inside the turquoise light the white stars are a
    // small sky of their own, alive the same way, with its own shooting star now and then.
    // Everyone is alive, each in their own way (as the crew of Paciencia): the one standing at the left rocks from foot to
    // foot, the one with crossed arms nods to Sid now and then, the one sitting cross-legged nods off and wakes with a
    // start, the two arm in arm sway together, the one sitting at the right hums rocking to and fro, the fox sniffs the
    // air, the kitten hops now and then; all of them breathe at their own pace, blink and glance about (at Sid, often).
    // Nothing of the sky is a picture: the navy is a gradient worked out from the card (it is in no layer), the two lights
    // are discs drawn in code with their stippled edges as live particles, and so are the stars, the lights round the
    // glowing flowers and the spores over the little mushrooms. The hill is drawn in code too (the flat colour of its
    // top, row by row, from the converter), and on a wide screen it goes on past the frame, sloping down, with the line
    // along its top continued. Reduced motion keeps it still; the game still plays, without flights or sparks.
    // It is drawn in WebGL (useLayerStage), every group of layers at its own depth. From mettaScene.json and
    // public/assets/metta (made by scripts/convert-metta.mjs).
    import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { createParallax } from '../../composables/useParallax.js';
    import { createLayerStage } from '../../composables/useLayerStage.js';
    import { startStardust } from '../../composables/useStardust.js';
    import { createSparks } from '../../composables/useSparks.js';
    import { createGiving, fill, rulitoBox } from '../../composables/useGiving.js';
    import { play } from '../../composables/useSound.js';
    import { sceneMilestone } from '../../analytics.js';
    import Rulito from '../Rulito.vue';
    import art from '../../composables/mettaScene.json';

    const props = defineProps({
        card: { type: Object, default: () => ({}) },
        active: Boolean
    });

    const root = ref(null);
    const canvas = ref(null);
    const rulito = ref(null);
    const hits = ref([]);
    let stage = null;
    let stageEl = null;
    let parallax = null;
    let dust = null;
    let entered = false;
    let gone = false;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ---- Layout: the illustration is a 2160 square resting on the bottom of the screen. On a phone upright it is as big
    // as the beings round the nest allow across (the outer ones may be cut a little); on a wide screen the hill goes on
    // past the frame on both sides
    const SIZE = art.size;
    const B = art.boxes;
    let F = { x: 0, y: 0, size: 1 };
    let W = 1, H = 1;
    const k = () => F.size / SIZE;
    const sx = (x) => F.x + x * k();
    const sy = (y) => F.y + y * k();
    const rectOf = ([left, top, w, h]) => ({ left: sx(left), top: sy(top), w: w * k(), h: h * k() });
    const SPAN = 1720;                      // art px across that must be seen on a phone (centred)
    const DROP = 0.08;                      // how much of the frame goes under the bottom of a wide screen
    const layout = (w, h) => {
        W = w; H = h;
        const phone = w < h;
        const size = phone ? Math.min(0.75 * h, w * SIZE / SPAN) : Math.min(Math.max(0.62 * w, 0.55 * h), 0.92 * h);
        F = { x: w / 2 - size / 2, y: h - size + (phone ? 0 : DROP * size), size };
    };

    const SLIDE = 44;
    const SLIDE_Y = 26;
    const zFor = (amp) => amp / (SLIDE + amp);
    const DEPTH = { stars: 3, halo: 6, aura: 9, hill: 15, beings: 17, sid: 18, front: 20 };

    const HALO = art.halo, AURA = art.aura, HILL = art.hill;
    const TURQUOISE = AURA.color;
    // The colours of our skies (Dana's): yellow the most, cream and coral; inside the turquoise light, white and pale
    const SKY = [0xffe699, 0xffe699, 0xf6e27c, 0xffd36b, 0xfaf3d4, 0xee6a82];
    const FAR = [0xfaf3d4, 0xd8f4f2, 0xf6e27c];
    const INNER = [0xffffff, 0xffffff, 0xeafffd, 0xfffbe6];
    // The colours of the light that is given: the card's turquoise, the yellow of its great light and rulito, its pink
    const GIVEN = [0x9ff3f8, 0xfbe49e, 0xffffff, 0xf595b6];
    const RULITO = '#f595b6';
    const centreOf = ([x, y, w, h]) => [x + w / 2, y + h / 2];

    // ---- The small pieces of the atlas: eyes and squiggles
    const [AW, AH] = art.atlas;
    const BITS = Object.fromEntries(art.bits.map(([name, x, y, w, h, ax, ay]) => [name, { box: [x, y, w, h], crop: [ax / AW, ay / AH, w / AW, h / AH] }]));
    const SQUIGGLES = Object.keys(BITS).filter((name) => name.startsWith('squiggle')).map((name) => {
        const [x, y] = centreOf(BITS[name].box);
        // The one over the hill is in the sky; the others are inside the turquoise light
        return { name, inner: Math.hypot(x - AURA.x, y - AURA.y) < AURA.r + 40, phase: Math.random() * 6.28 };
    });

    // ---- Who is on the hill, left to right as drawn: the beings, the fox, the kitten and Sid.
    // Each breathes from its feet at its own pace, blinks, glances about and has a way of its own (`way`, see way());
    // `pitch` is their note in the card's chord when they are given a light (left low, right high)
    const CHARACTERS = [
        { name: 'being0', way: 'rock', pitch: 0.12, es: 'Ser de pie', en: 'Standing being' },
        { name: 'being1', way: 'nod', pitch: 0.3, es: 'Ser de brazos cruzados', en: 'Being with crossed arms' },
        { name: 'being2', way: 'doze', pitch: 0.45, es: 'Ser sentado', en: 'Sitting being' },
        { name: 'being3', way: 'pair', pitch: 0.62, es: 'Ser del brazo', en: 'Being arm in arm' },
        { name: 'being4', way: 'pair', pitch: 0.75, es: 'Ser del brazo', en: 'Being arm in arm' },
        { name: 'being5', way: 'hum', pitch: 0.9, es: 'Ser sentado', en: 'Sitting being' },
        { name: 'fox', way: 'sniff', depth: 'front', sway: [0.72, 0.85, 0.42], breath: 0.006, pitch: 1, eyes: null, es: 'Zorro', en: 'Fox' },
        { name: 'kitten', way: 'hop', depth: 'front', sway: [0.2, 0.55, 0.45], breath: 0.008, pitch: 0.2, eyes: null, es: 'Gatito', en: 'Kitten' },
        { name: 'sid', way: 'still', depth: 'sid', breath: 0.016, es: 'Sid', en: 'Sid' },
    ].map((c, i) => ({
        depth: 'beings', eyes: `eyes:${c.name}`, ...c, i, breath: c.breath ?? 0.011, pace: 0.7 + ((i * 0.37) % 0.5), phase: i * 1.7,
        blinkAt: 1.5 + Math.random() * 4, blink: 0, glance: 0, glanceTo: 0, glanceAt: 2 + Math.random() * 5, hop: 0,
        next: 2 + Math.random() * 4, since: -1,
    }));
    const SID = CHARACTERS.find((c) => c.name === 'sid');
    const OTHERS = CHARACTERS.filter((c) => c !== SID);
    const SID_PITCH = 0.55;
    const L = {};
    let lastT = 0;
    let swell = 0;                          // Sid's light, swelling when he is touched
    let self = 0, selfGoal = 0;             // how much Sid has loved himself (0..1): he can give only when it is full
    let boost = 0;                          // every glow flares when the lights come back

    const build = (s) => {
        // The far sky: the squiggle among the stars (the stars themselves are particles, drawn first)
        const sky = s.depth(zFor(DEPTH.stars));
        L.skyNode = sky;
        L.squiggles = {};
        SQUIGGLES.filter((q) => !q.inner).forEach((q) => { L.squiggles[q.name] = sky.image('/assets/metta/bits.webp', { crop: BITS[q.name].crop }); });
        sky.enter({ y: -20, delay: 100, duration: 2200 });
        // The great yellow light
        const halo = s.depth(zFor(DEPTH.halo));
        L.haloNode = halo;
        L.haloGlow = halo.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: 0xfff1c2, stops: [[0, 0.22], [0.45, 0.1], [0.7, 0]] });
        L.halo = halo.disc({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: HALO.color });
        halo.enter({ y: 50, scale: 0.94, delay: 150, duration: 2400 });
        // The turquoise light round Sid, with its white stars and squiggles
        const aura = s.depth(zFor(DEPTH.aura));
        L.auraNode = aura;
        L.auraGlow = aura.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: 0x7fe6ef, stops: [[0, 0.5], [0.4, 0.2], [0.7, 0]], bloom: true });
        L.aura = aura.disc({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: TURQUOISE });
        SQUIGGLES.filter((q) => q.inner).forEach((q) => { L.squiggles[q.name] = aura.image('/assets/metta/bits.webp', { crop: BITS[q.name].crop }); });
        aura.enter({ y: 40, scale: 0.9, delay: 350, duration: 2200 });
        // The hill: drawn in code, the line along its top, the ground, the lights of the flowers and the flowers
        const hill = s.depth(zFor(DEPTH.hill));
        L.hillNode = hill;
        L.hillCanvas = document.createElement('canvas');
        L.hill = hill.canvas(L.hillCanvas);
        L.line = hill.image('/assets/metta/line.webp');
        L.ground = hill.image('/assets/metta/ground.webp');
        L.lights = art.glows.map(() => hill.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: TURQUOISE, stops: [[0, 0.55], [0.3, 0.25], [0.62, 0]], bloom: true }));
        L.flowers = art.flowers.map((f) => hill.image(`/assets/metta/${f.name}.webp`, { wind: { amp: 3, speed: 0.7 + 0.1 * f.light, root: 'bottom' } }));
        hill.enter({ y: 40, delay: 50, duration: 1700 });
        // Everyone on it, in the card's order, each at the depth of their row
        const rows = { beings: s.depth(zFor(DEPTH.beings)), sid: s.depth(zFor(DEPTH.sid)), front: s.depth(zFor(DEPTH.front)) };
        L.rows = rows;
        CHARACTERS.forEach((c) => {
            const node = rows[c.depth];
            c.group = node.group();
            c.body = c.group.image(`/assets/metta/${c.name}.webp`, c.sway ? { sway: true } : {});
            if (c.eyes) c.eyeNode = c.group.image('/assets/metta/bits.webp', { crop: BITS[c.eyes].crop });
        });
        // The rulito over Sid's head (it goes with him), and the nest in front of him
        L.rulito = SID.group.canvas(rulito.value.canvas, { bloom: true });
        L.nest = rows.sid.image('/assets/metta/nest.webp');
        rows.beings.enter({ y: 60, delay: 300, duration: 1900 });
        rows.sid.enter({ y: 70, delay: 450, duration: 2000 });
        rows.front.enter({ y: 50, delay: 550, duration: 1800 });
    };

    // ---- The hill in code: its top (as the converter read it) inside the frame, and past the frame it goes on sloping
    // down as it does at the edges, curving a little more, with the line along its top continued
    const hillTop = (ax) => {
        const top = HILL.top, step = HILL.step, n = top.length - 1;
        const edge = 12;                                           // how many steps the slope at a side is read over
        if (ax < 0) {
            const slope = Math.max(0, (top[0] - top[edge]) / (edge * step));
            const d = -ax;
            return { y: top[0] + slope * d + 0.00012 * d * d, line: HILL.left[0] - top[0] };
        }
        if (ax > SIZE) {
            const slope = Math.max(0, (top[n] - top[n - edge]) / (edge * step));
            const d = ax - SIZE;
            return { y: top[n] + slope * d + 0.00012 * d * d, line: HILL.right[0] - top[n] };
        }
        const u = ax / step, i = Math.min(n - 1, Math.floor(u)), f = u - i;
        return { y: top[i] + (top[i + 1] - top[i]) * f, line: 0 };
    };
    const css = (c) => `#${c.toString(16).padStart(6, '0')}`;
    const MARGIN = 80;
    const paintHill = () => {
        const q = Math.min(stage.dpr, 1.5);
        const left = -MARGIN, right = W + MARGIN;
        let topMost = H;
        for (let x = left; x <= right; x += 8) topMost = Math.min(topMost, sy(hillTop((x - F.x) / k()).y));
        const top = Math.floor(topMost - 20);
        const rect = { left, top, w: right - left, h: H + MARGIN - top };
        const c = L.hillCanvas;
        c.width = Math.max(1, Math.round(rect.w * q));
        c.height = Math.max(1, Math.round(rect.h * q));
        const g = c.getContext('2d');
        g.setTransform(q, 0, 0, q, -left * q, -top * q);
        g.clearRect(left, top, rect.w, rect.h);
        g.fillStyle = css(HILL.color);
        g.beginPath();
        g.moveTo(left, H + MARGIN);
        for (let x = left; x <= right + 4; x += 4) g.lineTo(x, sy(hillTop((x - F.x) / k()).y));
        g.lineTo(right + 4, H + MARGIN);
        g.closePath();
        g.fill();
        // The line along the top, only where the frame does not draw it (past its sides)
        g.strokeStyle = css(HILL.line);
        g.lineCap = 'round';
        g.lineJoin = 'round';
        for (const [from, to, w] of [[left, F.x + 2 * k(), HILL.left[1]], [F.x + F.size - 2 * k(), right, HILL.right[1]]]) {
            if (to <= from) continue;
            g.lineWidth = Math.max(1.5, w * k());
            g.beginPath();
            for (let x = from; x <= to; x += 3) {
                const h = hillTop((x - F.x) / k());
                const y = sy(h.y + (h.line || (x < F.x + F.size / 2 ? HILL.left[0] - HILL.top[0] : HILL.right[0] - HILL.top[HILL.top.length - 1])));
                if (x === from) g.moveTo(x, y); else g.lineTo(x, y);
            }
            g.stroke();
        }
        L.hill.place(rect);
        L.hill.refresh();
    };

    let glyph = { left: 0, top: 0, w: 1, h: 1 };
    const place = (w, h) => {
        layout(w, h);
        // The night, from the card: the gradient down to the top of the hill, and its last colour below
        const stops = art.sky.map(([y, c]) => `${css(c)} ${Math.max(-50, Math.min(150, sy(y) / h * 100)).toFixed(1)}%`);
        root.value.style.background = `linear-gradient(to bottom, ${stops.join(', ')})`;

        const hr = HALO.r * k();
        L.halo.place({ left: sx(HALO.x) - hr, top: sy(HALO.y) - hr, w: 2 * hr, h: 2 * hr });
        const hg = hr * 2.9;
        L.haloGlow.place({ left: sx(HALO.x) - hg / 2, top: sy(HALO.y) - hg / 2, w: hg, h: hg });
        const ar = AURA.r * k();
        L.aura.place({ left: sx(AURA.x) - ar, top: sy(AURA.y) - ar, w: 2 * ar, h: 2 * ar });
        const ag = ar * 2.8;
        L.auraGlow.place({ left: sx(AURA.x) - ag / 2, top: sy(AURA.y) - ag / 2, w: ag, h: ag });
        SQUIGGLES.forEach((q) => L.squiggles[q.name].place(rectOf(BITS[q.name].box)));

        paintHill();
        L.line.place(rectOf(B.line));
        L.ground.place(rectOf(B.ground));
        art.glows.forEach((g, i) => {
            const d = g.r * 5 * k();
            L.lights[i].place({ left: sx(g.x) - d / 2, top: sy(g.y) - d / 2, w: d, h: d });
        });
        art.flowers.forEach((f, i) => {
            const r = rectOf(B[f.name]);
            L.flowers[i].place(r, { x: r.left + r.w / 2, y: r.top + r.h });
        });

        CHARACTERS.forEach((c) => {
            const r = rectOf(B[c.name]);
            c.rect = r;
            c.group.pivot = { x: r.left + r.w / 2, y: r.top + r.h };
            c.body.place(r, { x: r.left + r.w / 2, y: r.top + r.h });
            if (c.eyeNode) c.eyeNode.place(rectOf(BITS[c.eyes].box));
        });
        // Sid breathes from where he sits in the nest
        SID.group.pivot = { x: sx(1080), y: sy(1250) };
        L.nest.place(rectOf(B.nest));
        // The rulito stands where the card drew it (a little bigger), as tall as the rulito's own shape is for that width
        const [rx, ry, rw, rh] = art.rulito;
        const gw = rw * 1.3 * k(), gh = gw * 86 / 32;
        glyph = { left: sx(rx + rw / 2) - gw / 2, top: sy(ry + rh) - gh, w: gw, h: gh };
        rulito.value.frame({ width: glyph.w });
        L.rulito.place(rulitoBox(glyph), { x: glyph.left + glyph.w / 2, y: glyph.top + glyph.h });
        L.rulito.refresh();
        placeHits();
    };

    /* ---------- The game: Sid loves himself first, and then gives ---------- */

    // Where things are on the canvas now
    const heart = () => SID.group.toScreen(sx(1085), sy(1090));
    const chest = (c) => c.group.toScreen(c.rect.left + c.rect.w / 2, c.rect.top + c.rect.h * 0.4);
    const unit = () => F.size / 100;        // px of a % of the frame

    const sparks = createSparks(320);
    const burst = (at, n, colors, speed = 110) => {
        if (reduced) return;
        sparks.burst(at.x, at.y, { n, colors, speed, size: Math.max(5, unit() * 0.9), spread: unit() * 1.2 });
    };

    // Looking at Sid: a character turns its eyes to him for a while
    const lookAtSid = (c, hold = 2.5) => {
        c.glanceTo = Math.sign(SID.rect.left + SID.rect.w / 2 - (c.rect.left + c.rect.w / 2));
        c.glanceAt = lastT + hold;
    };

    const giving = createGiving({
        count: OTHERS.length,
        source: heart,
        target: (i) => chest(OTHERS[i]),
        can: () => selfGoal > 0,
        reduced,
        colors: GIVEN,
        on: {
            give: () => { swell = Math.max(swell, 0.5); play('give', { from: SID_PITCH }); },
            again: (i) => { const c = OTHERS[i]; c.hop = 1; burst(chest(c), 12, GIVEN, 70); play('tap'); },
            // Before he has loved himself: the one touched looks at Sid, and Sid's light calls
            wait: (i) => { const c = OTHERS[i]; c.hop = 0.6; lookAtSid(c); call(); play('tap'); },
            receive: (i) => {
                const c = OTHERS[i];
                c.hop = 1;
                lookAtSid(c, 3);
                burst(chest(c), 24, GIVEN, 100);
                play('link', { from: SID_PITCH, to: c.pitch, level: 1 });
            },
            back: () => { play('converge'); OTHERS.forEach((c) => lookAtSid(c, 3)); },
            balance: (wins) => {
                rulito.value?.reshape();
                boost = 1;
                swell = 1;
                burst(heart(), 60, GIVEN, 170);
                play('star');
                sceneMilestone('light_shared', { times: wins });
            },
            full: () => { boost = 1; play('rulito'); },
            // The lights fade, and he is back to the start: to give again, he loves himself first
            fade: () => { selfGoal = 0; },
            puff: (x, y, colors) => burst({ x, y }, 2, colors, 40),
            hint: () => { if (!selfGoal) call(); },
        },
    });

    // Sid's light calls, softly: it is where it starts
    const call = () => {
        swell = Math.max(swell, 0.45);
        dust?.boost(G.innerStars, 0.5);
        OTHERS.forEach((c) => { if (Math.random() < 0.5) lookAtSid(c, 1.5); });
    };

    // A touch on Sid: the first time, he loves himself (his light fills); afterwards, it only swells
    const touchSid = () => {
        giving.touched();
        SID.hop = 1;
        SID.blink = 0;
        swell = 1;
        if (!selfGoal && !giving.busy) {
            selfGoal = 1;
            play('give', { from: SID_PITCH });
            setTimeout(() => { if (!gone) play('link', { from: SID_PITCH, to: SID_PITCH, level: 1 }); }, reduced ? 0 : 450);
            burst(heart(), 30, GIVEN, 90);
            dust?.boost(G.innerStars, 1);
            dust?.boost(G.aura, 1);
            OTHERS.forEach((c) => lookAtSid(c, 2));
            return;
        }
        play('star');
        dust?.boost(G.innerStars, 0.8);
        dust?.boost(G.aura, 0.8);
    };

    const touchOne = (c, event) => {
        event?.stopPropagation();
        if (!stage) return;
        parallax?.wake(12);
        if (c === SID) touchSid();
        else giving.give(OTHERS.indexOf(c));
    };

    // A touch anywhere else: the chord strummed, and the lights flare
    const strum = () => {
        if (!stage) return;
        parallax?.wake(3);
        play('star');
        dust?.boost(G.halo, 0.6);
        dust?.boost(G.auraEdge, 0.9);
        dust?.boost(G.innerStars, 1);
        dust?.boost(G.flowers, 0.8);
        dust?.boost(G.stars, 0.8);
    };
    const onKey = (event, c) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        touchOne(c);
    };

    // The touch targets: one over each, never smaller than a finger (the kitten is small)
    const placeHits = () => {
        if (!L.rows) return;
        CHARACTERS.forEach((c, i) => {
            const el = hits.value[i];
            if (!el || !c.rect) return;
            const box = c === SID ? rectOf([900, 834, 370, 400]) : c.rect;
            const b = c.group.boxOnScreen(box);
            const w = Math.max(44, b.width), h = Math.max(44, b.height);
            el.style.translate = `${(b.left + b.width / 2 - w / 2).toFixed(1)}px ${(b.top + b.height / 2 - h / 2).toFixed(1)}px`;
            el.style.width = `${w.toFixed(1)}px`;
            el.style.height = `${h.toFixed(1)}px`;
        });
    };

    const enter = () => {
        if (entered || !props.active || !stage) return;
        entered = true;
        stage.ready().then(() => { if (!gone) { stage.start(); dust?.reveal(); } });
    };

    /* ---------- Life: each one in their own way ---------- */

    const ease = (p) => p * p * (3 - 2 * p);
    const rand = (a, b) => a + Math.random() * (b - a);
    const DOZE = 4.2, HOP = 0.7;
    // Returns { rotate (degrees, about the feet), y (px of art), sy } for one character's way, at time t
    const way = (c, t) => {
        const toSid = Math.sign(SID.rect.left + SID.rect.w / 2 - (c.rect.left + c.rect.w / 2));
        switch (c.way) {
            // Rocking from foot to foot, slowly
            case 'rock': return { rotate: Math.sin(t * 0.75 + c.phase) * 2.6, y: Math.abs(Math.sin(t * 0.75 + c.phase)) * -4, sy: 0 };
            // A nod to Sid now and then: it leans to him and comes back
            case 'nod': {
                if (t > c.next) { c.since = t; c.next = t + rand(4, 7); }
                const n = (t - c.since) / 1.1;
                const nod = c.since >= 0 && n < 1 ? Math.sin(n * Math.PI) * (n < 0.5 ? 1 : 0.8) : 0;
                return { rotate: toSid * 4.5 * nod, y: 0, sy: -0.02 * nod };
            }
            // Meditating cross-legged, it nods off little by little and wakes with a start
            case 'doze': {
                if (c.since < 0) c.since = t + rand(1, 3);
                const n = t - c.since;
                let r = 0;
                if (n < 0) r = 0;
                else if (n < DOZE) r = -6 * ease(n / DOZE);
                else if (n < DOZE + 0.18) r = -6 + 9 * ease((n - DOZE) / 0.18);
                else if (n < DOZE + 1) r = 3 * (1 - ease((n - DOZE - 0.18) / 0.82));
                else c.since = t + rand(2.5, 6);
                return { rotate: r * -toSid, y: 0, sy: 0 };
            }
            // The two arm in arm sway together, one a moment after the other, leaning in now and then
            case 'pair': {
                const lag = c.name === 'being4' ? 0.35 : 0;
                const lean = Math.max(0, Math.sin(t * 0.33 - lag)) ** 3;
                const inward = c.name === 'being3' ? 1 : -1;
                return { rotate: Math.sin(t * 0.9 - lag) * 2.4 + inward * 3 * lean, y: 0, sy: 0.01 * lean };
            }
            // Humming to itself, rocking to and fro with a little bounce on every swing
            case 'hum': return { rotate: Math.sin(t * 1.4) * 4, y: 0, sy: Math.abs(Math.sin(t * 1.4)) * 0.03 };
            // Sniffing the air: two quick lifts of the nose now and then
            case 'sniff': {
                if (t > c.next) { c.since = t; c.next = t + rand(3, 6); }
                const n = (t - c.since) / 0.7;
                const sniff = c.since >= 0 && n < 1 ? Math.abs(Math.sin(n * Math.PI * 2)) : 0;
                return { rotate: -2.5 * sniff + Math.sin(t * 0.5) * 1, y: -3 * sniff, sy: 0.015 * sniff };
            }
            // The kitten hops now and then: it crouches, jumps and lands soft
            case 'hop': {
                if (c.since < 0) c.since = t + rand(3, 6);
                const h = (t - c.since) / HOP;
                if (h >= 1) { c.since = t + rand(4, 8); return { rotate: 0, y: 0, sy: 0 }; }
                if (h < 0) return { rotate: 0, y: 0, sy: 0 };
                if (h < 0.25) return { rotate: 0, y: 0, sy: -0.14 * ease(h / 0.25) };
                if (h < 0.75) return { rotate: -4 * Math.sin((h - 0.25) / 0.5 * Math.PI), y: -Math.sin((h - 0.25) / 0.5 * Math.PI) * 50, sy: 0.08 };
                return { rotate: 0, y: 0, sy: -0.1 * Math.sin((h - 0.75) / 0.25 * Math.PI) };
            }
            default: return { rotate: 0, y: 0, sy: 0 };
        }
    };

    const frame = ({ x, y, scroll, t, ramp }) => {
        if (!stage || !L.rows) return;
        const dt = Math.min(0.1, Math.max(0, t - lastT));
        lastT = t;
        stage.look(x * SLIDE, y * SLIDE_Y);
        const live = reduced ? 0 : ramp;
        giving.step(dt);
        if (!giving.settled) parallax?.wake(3);      // a still scene (reduced motion) keeps drawing while it is played

        // ---- The lights: the yellow one barely breathes; the turquoise one breathes with Sid, swells when he is
        // touched, and is fuller once he has loved himself
        self += (selfGoal - self) * Math.min(1, dt * (selfGoal < self ? 0.4 : 1.8));
        swell = Math.max(0, swell - dt * 0.8);
        boost = Math.max(0, boost - dt * 0.5);
        const sidBreath = Math.sin(t * SID.pace + SID.phase);
        L.haloGlow.opacity = 0.7 + 0.2 * Math.sin(t * 0.35) * live + 0.3 * boost;
        L.auraGlow.opacity = 0.4 + 0.25 * self + 0.25 * sidBreath * live + 0.45 * swell + 0.3 * boost;
        L.auraGlow.scale = 1 + 0.04 * sidBreath * live + 0.12 * swell + 0.1 * self + 0.1 * boost;
        SQUIGGLES.forEach((q) => {
            const node = L.squiggles[q.name];
            node.y = Math.sin(t * 0.6 + q.phase) * 6 * live;
            node.rotate = Math.sin(t * 0.45 + q.phase * 2) * 8 * live;
        });
        L.haloNode.y = scroll * 8;
        L.auraNode.y = scroll * 12;
        L.skyNode.y = scroll * 4;

        // ---- The flowers' lights breathe, each at its own pace
        art.glows.forEach((_, i) => {
            L.lights[i].opacity = 0.75 + 0.25 * Math.sin(t * (0.8 + 0.13 * i) + i * 2) * live;
            L.lights[i].scale = 1 + 0.06 * Math.sin(t * (0.8 + 0.13 * i) + i * 2) * live;
        });
        L.hillNode.y = scroll * 18;

        // ---- Everyone breathes from their feet, has their own way, blinks, glances about (at Sid, often), and hops
        // when touched or given a light
        CHARACTERS.forEach((c) => {
            const b = Math.sin(t * c.pace + c.phase);
            c.hop = Math.max(0, c.hop - dt * 1.8);
            const hop = Math.sin((1 - c.hop) * Math.PI) * (c.hop > 0 ? 1 : 0);
            const own = reduced ? { rotate: 0, y: 0, sy: 0 } : way(c, t);
            c.group.sy = 1 + c.breath * b * live + 0.05 * hop + own.sy * live;
            c.group.sx = 1 - c.breath * 0.35 * b * live - 0.02 * hop - own.sy * 0.4 * live;
            c.group.y = (own.y * k() * live) - hop * 16 * k() * (c === SID ? 0.4 : 1);
            c.group.rotate = own.rotate * live;
            if (c.sway) {
                // The tail sways from its root
                c.body.sways[0] = [c.sway[0], c.sway[1], c.sway[2], Math.sin(t * 1.3 + c.phase) * 7 * live, 1];
            }
            if (!c.eyeNode || reduced) return;
            if (t > c.blinkAt) { c.blink = 1; c.blinkAt = t + 2.5 + Math.random() * 4.5; }
            c.blink = Math.max(0, c.blink - dt * 7);
            c.eyeNode.sy = 1 - 0.85 * Math.sin(c.blink * Math.PI);
            if (t > c.glanceAt) {
                // Half the time to Sid, otherwise anywhere, or back to the front
                const toSid = Math.sign(SID.rect.left + SID.rect.w / 2 - (c.rect.left + c.rect.w / 2));
                const r = Math.random();
                c.glanceTo = c === SID ? (r < 0.4 ? 0 : r < 0.7 ? -1 : 1) : r < 0.5 ? toSid : r < 0.75 ? 0 : -toSid;
                c.glanceAt = t + 2.5 + Math.random() * 5;
            }
            c.glance += (c.glanceTo - c.glance) * Math.min(1, dt * 5);
            c.eyeNode.x = c.glance * 7 * k() * live;
        });
        L.rows.beings.y = scroll * 20;
        L.rows.sid.y = scroll * 21;
        L.rows.front.y = scroll * 24;

        // ---- The rulito over Sid, while the lights are back
        const win = giving.win;
        if (win) {
            const whole = Math.min(1, Math.max(0, (win.head - win.tail - 0.6) / 0.4));
            const named = Math.max(win.pop, 0.8 * ease(whole));
            stageEl?.style.setProperty('--name-glow', named.toFixed(3));
            stage.bloom = Math.max(named, 0.35 * swell);
            const glow = win.full && win.head - win.tail > 0.9 ? Math.max(win.pop, Math.sin(t * 4) * 0.5 + 0.5) : 0;
            const tail = Math.min(win.head, win.tail);
            rulito.value.frame({ head: win.head, tail, flare: glow, t, fade: Math.min(1, (win.head - tail) * 14), width: glyph.w });
            L.rulito.refresh();
            L.rulito.rotate = Math.sin(t * 1.8) * 3;
            L.rulito.scale = 1 + 0.2 * win.pop * win.pop;
            L.rulito.shown = true;
        } else {
            if (L.rulito.shown) {
                L.rulito.shown = false;
                rulito.value.frame({ width: glyph.w });
                L.rulito.refresh();
                stageEl?.style.setProperty('--name-glow', '0');
            }
            stage.bloom = 0.35 * swell;
        }

        // The particles that belong to a layer follow it
        const at = (node) => { const d = stage.drift(node.z); return [d.x, d.y + node.y]; };
        dust?.shift(G.stars, ...at(L.skyNode));
        dust?.shift(G.halo, ...at(L.haloNode));
        dust?.shift(G.auraEdge, ...at(L.auraNode));
        dust?.shift(G.innerFar, ...at(L.auraNode));
        dust?.shift(G.innerStars, ...at(L.auraNode));
        dust?.shift(G.flowers, ...at(L.hillNode));
        dust?.shift(G.spores, ...at(L.hillNode));
        stage.render(t);
        placeHits();
    };

    // The spores over the little mushrooms: each sends up motes that rise a little, sway and fade, one after another
    const SPORE_MOTES = 3;
    const sporeGroup = {
        count: art.spores.length * SPORE_MOTES,
        update(t, data) {
            art.spores.forEach(([x, y, r], s) => {
                for (let m = 0; m < SPORE_MOTES; m++) {
                    const i = s * SPORE_MOTES + m;
                    const p = ((t * 0.16 + s * 0.31 + m / SPORE_MOTES) % 1);
                    const rise = reduced ? 0 : p * 70;
                    data.positions[i * 3] = sx(x + Math.sin(t * 0.9 + s + m * 2) * 6 * p);
                    data.positions[i * 3 + 1] = sy(y - rise);
                    data.sizes[i] = Math.max(1.5, 2 * r * k() * (1 - 0.4 * p));
                    data.alphas[i] = reduced ? (m === 0 ? 1 : 0) : Math.sin(p * Math.PI) ** 0.7;
                }
            });
        },
    };

    // Shooting stars, silent, as in our skies: a soft cream head and a yellow tail that narrows and fades. `area()` says
    // where they may cross ({ x, y, r } a disc, or { w, h } the sky); `size` scales them
    const shooting = ({ count: n, area, size = 1, every = [3, 9] }) => {
        const TAIL = 22;
        const shooters = Array.from({ length: n }, (_, j) => ({ at: 2 + j * 4 + Math.random() * 3, x: 0, y: 0, dx: 0, dy: 0, T: 1, c: null }));
        return {
            count: n * TAIL,
            update(t, data) {
                if (!stage) return;
                const a = area();
                shooters.forEach((f, j) => {
                    if (t > f.at + f.T) {
                        const side = Math.random() < 0.5 ? -1 : 1;
                        f.at = t + every[0] + Math.random() * (every[1] - every[0]);
                        f.T = 0.6 + Math.random() * 0.5;
                        if (a.r) {
                            // Inside the disc: from somewhere in its upper half, a short way across it
                            const ang = Math.random() * Math.PI * 2, d = Math.random() * 0.5 * a.r;
                            f.x = Math.cos(ang) * d - side * 0.3 * a.r;
                            f.y = Math.sin(ang) * d - 0.35 * a.r;
                            const speed = a.r * (0.7 + Math.random() * 0.4);
                            f.dx = side * speed;
                            f.dy = speed * (0.35 + Math.random() * 0.3);
                        } else {
                            const speed = (0.35 + Math.random() * 0.3) * Math.max(a.w, a.h);
                            f.x = a.w * (0.1 + Math.random() * 0.8);
                            f.y = a.h * (0.03 + Math.random() * 0.25);
                            f.dx = side * speed;
                            f.dy = speed * (0.35 + Math.random() * 0.3);
                        }
                    }
                    const u = (t - f.at) / f.T;
                    for (let q = 0; q < TAIL; q++) {
                        const i = j * TAIL + q;
                        if (u < 0 || u > 1 || reduced) { data.alphas[i] = 0; continue; }
                        const life = Math.max(0, u - q * 0.006);
                        let px = f.x + f.dx * life * f.T, py = f.y + f.dy * life * f.T;
                        let edge = 1;
                        if (a.r) {
                            // Fading out before the edge of the light
                            edge = Math.max(0, Math.min(1, (a.r * 0.92 - Math.hypot(px, py)) / (a.r * 0.15)));
                            px += a.x;
                            py += a.y;
                        }
                        fill(data, i, px, py, (q ? Math.max(1.5, 7 - q * 0.22) : 11) * size,
                            edge * Math.min(1, Math.sin(u * Math.PI) * 1.4) * (1 - q / TAIL) ** 0.7, q < 3 ? 0xfffbe6 : (q % 2 ? 0xf6e27c : 0xffe699));
                    }
                });
            },
        };
    };

    // The dots of the light that is given: a soft cloud round each one who has his light, rising like embers, and round
    // Sid an aura that opens when he loves himself and most when the lights come back
    const DOTS = 40;
    const givenGlow = {
        count: OTHERS.length * DOTS,
        update(t, data) {
            if (!SID.rect) return;
            for (let i = 0; i < data.count; i++) {
                const n = Math.floor(i / DOTS), c = OTHERS[n], s = giving.state[n];
                const a = Math.sin(i * 12.9898) * 0.5 + 0.5, b = Math.sin(i * 78.233 + 2) * 0.5 + 0.5;
                const life = (a + t * (0.08 + 0.1 * b)) % 1;
                const angle = i * 2.399 + t * 0.15;
                const centre = c.group.toScreen(c.rect.left + c.rect.w / 2, c.rect.top + c.rect.h * 0.5);
                const rx = c.rect.w * (0.5 + 0.3 * b) * (1 + boost * 0.3), ry = c.rect.h * (0.42 + 0.2 * b);
                const level = Math.min(1.2, s.lit + s.flash * 0.7 + boost * s.lit * 0.5);
                fill(data, i, centre.x + Math.cos(angle) * rx, centre.y + Math.sin(angle) * ry - life * c.rect.h * 0.2,
                    unit() * (1.3 + 1.4 * b), 0.85 * level * Math.sin(life * Math.PI) ** 0.8 * (0.75 + 0.25 * Math.sin(t * 3 + i)),
                    GIVEN[i % GIVEN.length]);
            }
        },
    };
    const SID_DOTS = 140;
    const sidAura = {
        count: SID_DOTS,
        update(t, data) {
            if (!SID.rect) return;
            const centre = SID.group.toScreen(sx(1085), sy(1030));
            const r = SID.rect.w * 0.42;
            const level = Math.min(1.4, 0.08 + 0.75 * self + 0.4 * swell + 0.8 * boost);
            for (let i = 0; i < data.count; i++) {
                const a = Math.sin(i * 53.1) * 0.5 + 0.5, b = Math.sin(i * 17.9 + 2) * 0.5 + 0.5;
                const life = (a + t * (0.06 + 0.1 * b)) % 1;
                const angle = i * 2.399 + t * 0.1;
                const reach = r * (0.75 + 0.55 * life) * (1 + 0.3 * Math.min(1, level));
                fill(data, i, centre.x + Math.cos(angle) * reach, centre.y + Math.sin(angle) * reach * 1.25,
                    unit() * (1.1 + 1.2 * b), Math.min(1, level) * Math.sin(life * Math.PI) ** 0.7 * (0.7 + 0.3 * Math.sin(t * 2.6 + i)),
                    GIVEN[i % 3]);
            }
        },
    };

    // The groups of particles, by name
    const G = { far: 0, stars: 1, shooters: 2, halo: 3, auraEdge: 4, innerFar: 5, innerStars: 6, innerShooter: 7, flowers: 8, spores: 9, aura: 10, given: 11, motes: 12, sparks: 13, near: 14 };

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
        const before = (node) => node.mesh.renderOrder - 0.5;
        const fromArt = (list, colour, scale = 1) => list.map(([x, y, r]) => [sx(x), sy(y), Math.max(1.2, 2 * r * k() * scale), colour]);
        const soft = (dynamic, extra = {}) => ({ colors: [0xffffff], dynamic, parallax: 0, drift: 0, twinkle: 0, reach: 0, look: 'soft', ...extra });
        // The stars of the card, and as many again over the sky the frame does not cover; a little bigger than drawn and
        // in the colours of our skies
        const seeded = (n) => { const v = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return v - Math.floor(v); };
        const stars = () => {
            const own = art.stars.map(([x, y, r], i) => [sx(x), sy(y), Math.max(1.6, 2 * r * k() * (1.1 + 0.9 * seeded(i))), SKY[i % SKY.length]]);
            const density = art.stars.length / (F.size * F.size * 0.7);
            const more = [];
            const want = Math.min(260, Math.round(density * Math.max(0, W * H - F.size * F.size)));
            for (let tries = 0; more.length < want && tries < want * 6; tries++) {
                const px = Math.random() * W, py = Math.random() * Math.min(H, sy(1600));
                if (px > F.x && px < F.x + F.size && py > F.y) continue;
                more.push([px, py, (2 + Math.random() ** 2 * 3.5) * Math.max(0.7, k() * 2.2), SKY[Math.floor(Math.random() * SKY.length)]]);
            }
            return [...own, ...more];
        };
        // Inside the turquoise light: a far plane of tiny faint stars, kept inside it
        const innerFar = () => {
            const out = [], r = AURA.r * k() * 0.93;
            for (let i = 0; i < 90; i++) {
                const ang = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * r;
                out.push([sx(AURA.x) + Math.cos(ang) * d, sy(AURA.y) + Math.sin(ang) * d, 0.9 + Math.random() * 1.4, FAR[i % 2 ? 1 : 0]]);
            }
            return out;
        };
        const nearSpot = (w, h) => {
            for (;;) {
                const x = Math.random() * w, y = Math.random() * h * 0.7;
                if (Math.abs(x / w - 0.5) > 0.24 || y / h < 0.2) return [x, y];
            }
        };
        const lastCharacter = OTHERS.reduce((m, c) => Math.max(m, c.body.mesh.renderOrder), 0);
        dust = startStardust(null, {
            stage,
            manual: true,
            groups: [
                // far: tiny faint stars, many, hardly moving with the pointer
                { count: 420, colors: FAR, size: [1, 2.4], drift: 1.5, twinkle: 0.8, reach: 0, parallax: 4, opacity: 0.6, order: -21 },
                // stars: the card's, twinkling; a finger stirs them
                { colors: SKY, parallax: 0, drift: 2, twinkle: 0.6, reach: 120, push: 26, order: -20, points: stars },
                // shooters: a shooting star now and then
                soft(shooting({ count: 2, area: () => ({ w: stage.width, h: stage.height }) }), { order: -19.5 }),
                // halo: the stippled edge of the yellow light
                { colors: [HALO.color], parallax: 0, drift: 2, jitter: 0.5, twinkle: 0.3, reach: 0, order: after(L.halo), points: () => fromArt(HALO.dots, HALO.color) },
                // auraEdge: the stippled edge of the turquoise light
                { colors: [TURQUOISE], parallax: 0, drift: 1.8, jitter: 0.45, twinkle: 0.3, reach: 0, order: after(L.aura), points: () => fromArt(AURA.dots, TURQUOISE) },
                // innerFar, innerStars: the sky inside it, its own far plane and the card's white stars, twinkling; a
                // finger stirs them
                { colors: FAR, parallax: 0, drift: 1, twinkle: 0.85, reach: 0, opacity: 0.55, order: after(L.aura) + 0.05, points: innerFar },
                { colors: INNER, parallax: 0, drift: 1.5, twinkle: 0.65, reach: 80, push: 14, bloom: true, order: after(L.aura) + 0.1,
                    points: () => art.inner.map(([x, y, r], i) => [sx(x), sy(y), Math.max(1.4, 2 * r * k() * (1 + 0.8 * seeded(i + 7))), INNER[i % INNER.length]]) },
                // innerShooter: and now and then a small shooting star of its own
                soft(shooting({ count: 1, size: 0.6, every: [5, 12], area: () => {
                    const c = L.auraNode.toScreen(sx(AURA.x), sy(AURA.y));
                    return { x: c.x, y: c.y, r: AURA.r * k() * stage.width / Math.max(1, W) };
                } }), { order: after(L.aura) + 0.15, bloom: true }),
                // flowers: the stipple of the flowers' lights
                { colors: [TURQUOISE], parallax: 0, drift: 1.4, jitter: 0.4, twinkle: 0.4, reach: 0, bloom: true, order: after(L.lights[L.lights.length - 1]),
                    points: () => art.glows.flatMap((g) => fromArt(g.dots, TURQUOISE)) },
                // spores: over the little mushrooms
                { colors: [0xffe699], dynamic: sporeGroup, look: 'soft', parallax: 0, drift: 0, twinkle: 0.2, reach: 0, bloom: true, order: after(L.ground) },
                // aura: Sid's, of dots, behind him
                soft(sidAura, { order: before(SID.body), bloom: true }),
                // given, motes, sparks: what is given, in front of everyone
                soft(givenGlow, { order: lastCharacter + 1e5, bloom: true }),
                soft(giving.motes(() => unit() * 1.6), { order: lastCharacter + 1e5 + 1, bloom: true }),
                { ...sparks.group(), order: lastCharacter + 1e5 + 2, bloom: true },
                // near: a few big out-of-focus stars, close to the eye: they shift the most
                { count: 12, colors: [0xfaf3d4, 0xf6e27c, 0xee6a82], size: [26, 64], look: 'soft', spawn: nearSpot, drift: 10, twinkle: 0.3, reach: 0, parallax: 46, opacity: 0.14, order: lastCharacter + 1e5 + 3 },
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
    });
</script>

<template>
    <div class="scene" ref="root" @pointerdown="strum">
        <canvas class="stageCanvas" ref="canvas"></canvas>
        <!-- The rulito is drawn on its own canvas, which the stage shows over Sid's head -->
        <Rulito ref="rulito" class="offstage" :color="RULITO" />
        <!-- Everyone on the hill: Sid first (he loves himself), then the others (placeHits keeps them over them) -->
        <div v-for="(c, i) in CHARACTERS" :key="c.name" :ref="(el) => { hits[i] = el; }" class="hit" role="button" tabindex="0"
            :aria-label="$i18n.locale === 'en' ? c.en : c.es"
            @pointerdown="touchOne(c, $event)" @keydown="onKey($event, c)"></div>
    </div>
</template>

<style scoped>
    .scene {
        position: absolute;
        inset: 0;
        overflow: hidden;
        background: #2d3a67;
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

    /* Everyone on the hill: a box round each, big enough for a finger. Taps only, so the page still scrolls from them */
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
        touch-action: manipulation;
        outline: none;
    }

    .hit:focus-visible {
        outline: 2px solid rgba(255, 255, 255, 0.85);
        outline-offset: 2px;
    }
</style>
