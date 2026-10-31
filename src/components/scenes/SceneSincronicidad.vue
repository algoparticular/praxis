<script setup>
    // Sincronicidad: two atoms that evolve and find each other, and where they meet a fire is lit. On a quiet night over a
    // strip of teal land, four bubbles float in a sequence: the smallest egg, a second egg, the meeting (two larvae that
    // have just found each other) and the embracing pair; by the stones on the right a camp fire burns.
    // Its verb is Resonar (be there at the right moment): a glow runs along the four bubbles on a steady beat, bubble after
    // bubble, and on the beat after the pair sparks come out of the fire. Touching a bubble just when the glow reaches it
    // makes it resonate (its note of the card's chord) and it stays lit; a touch out of time only sounds muted, and that
    // bubble waits for its next beat. With the four lit the fire leaps, the gold rulito is born out of the pair's bubble
    // and the card's name lights up; then the lights fade and it can be played again. While someone is playing, the glow
    // sounds softly on every bubble, so the beat is heard.
    // What is drawn in code: the sky (the card's flat night colour, a little deeper at the top), its stars (every dot of
    // the card, as particles, and the sky goes on past the frame with them), silent shooting stars, the soft salmon light
    // inside every bubble (a disc in code with its stippled rim as live particles), the warm light round the fire and the
    // fire's living tongues and sparks. The pictures: the land with its stones and the hearth, the drawn flame (it sways
    // and the air trembles over it), every bubble's skin (it shimmers) and the larvae in it, apart so they breathe, turn
    // in their eggs and look at each other. From sincronicidadScene.json and public/assets/sincronicidad (made by
    // scripts/convert-sincronicidad.mjs).
    // It is drawn in WebGL (useLayerStage): every bubble and the land is a plane at its own depth (the pair nearest, the
    // smallest egg farthest), the camera slides with the pointer or the tilt. On a wide screen the land goes on past the
    // frame (mirrored), on a phone upright the frame is as big as the four bubbles and the fire allow across. The touch
    // targets are DOM elements kept over the bubbles.
    import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { floorFor } from '../../data/stageFloor.js';
    import { createParallax } from '../../composables/useParallax.js';
    import { createLayerStage } from '../../composables/useLayerStage.js';
    import { startStardust } from '../../composables/useStardust.js';
    import { createFlame } from '../../composables/useFlame.js';
    import { createSparks } from '../../composables/useSparks.js';
    import { play } from '../../composables/useSound.js';
    import { sceneMilestone } from '../../analytics.js';
    import Rulito from '../Rulito.vue';
    import art from '../../composables/sincronicidadScene.json';

    const props = defineProps({
        card: { type: Object, default: () => ({}) },
        active: Boolean
    });

    const root = ref(null);
    const canvas = ref(null);
    const hits = ref([]);
    const rulito = ref(null);
    let stageEl = null;                     // the card's stage, where the name is lit from (--name-glow)
    let stage = null;
    let parallax = null;
    let dust = null;
    let entered = false;
    let gone = false;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ---- Layout: the illustration is a 2160 square resting on the bottom of the screen. On a phone upright it is as big
    // as the four bubbles and the fire allow across (SPAN art px, centred on FOCUS); on a wide screen the land goes on
    // past the frame on both sides. Never so big that the smallest egg goes under the card's name
    const SIZE = art.size;
    const B = art.boxes;
    let F = { x: 0, y: 0, size: 1 };
    let W = 1, H = 1;
    const k = () => F.size / SIZE;
    const sx = (x) => F.x + x * k();
    const sy = (y) => F.y + y * k();
    const rectOf = ([left, top, w, h]) => ({ left: sx(left), top: sy(top), w: w * k(), h: h * k() });
    const SPAN = 1800, FOCUS = 1060;
    const TOP = 60;                         // art px over the smallest egg that must stay under the name
    const layout = (w, h) => {
        W = w; H = h;
        const phone = w < h;
        const room = (h - titleBottom(h) - 8) / (1 - TOP / SIZE);
        let size = phone ? Math.min(0.8 * h, w * SIZE / SPAN) : Math.min(Math.max(0.62 * w, 0.55 * h), 0.94 * h);
        size = Math.max(Math.min(size, room), Math.min(w, h) * 0.5);
        let x = w / 2 - size / 2;
        if (size > w) x = Math.min(0, Math.max(w - size, w / 2 - FOCUS * size / SIZE));
        F = { x, y: h - floorFor(w, h) - size, size };
    };
    // Where the card's name ends (the stage's h1, over the scene)
    const titleBottom = (h) => {
        const title = stageEl?.querySelector('h1');
        if (!title || !root.value) return 0.16 * h;
        return title.getBoundingClientRect().bottom - root.value.getBoundingClientRect().top;
    };

    // The camera slides SLIDE px at the edge of a swipe; each layer moves as far as it did (its `depth` px), and 0.6 of
    // that up and down
    const SLIDE = 50;
    const SLIDE_Y = 30;
    const zFor = (amp) => amp / (SLIDE + amp);
    const LAND_DEPTH = 24;

    // The colours of the card: the night, the land, the stars, the light inside the bubbles
    const SKY = '#36848e';
    const SKY_TOP = '#2b707b';
    const LAND = '#3fbaad';
    const STARS = [0xde759d, 0xfbf2a1];

    // The bubbles, from the smallest egg to the pair: their skin, the larvae in them, the light inside (art.hearts);
    // `depth` is how far each moves with the pointer, `speed`, `lift`, `turn`, `phase` its float
    const BUBBLES = [
        { name: 'egg1', larvae: ['egg1Larva'], depth: 12, speed: 0.8, lift: 6, turn: 3, phase: 0 },
        { name: 'egg2', larvae: ['egg2Larva'], depth: 16, speed: 0.65, lift: 7, turn: 3, phase: 2 },
        { name: 'meeting', larvae: ['meetingA', 'meetingB'], depth: 26, speed: 0.5, lift: 9, turn: 1.6, phase: 4 },
        { name: 'pair', larvae: ['pairA', 'pairB'], depth: 36, speed: 0.42, lift: 11, turn: 1.4, phase: 1 },
    ];
    const PAIR = BUBBLES.length - 1;          // the embracing pair, the biggest bubble: the rulito comes out of it

    // The ground on past the frame: copies of its left part (CROP of it, which has no hearth), mirrored one after the
    // other so each meets the next; on the right they are lifted by the difference of the ground's two edges
    const CROP = 0.62;
    const COPIES = 3;

    // The fire: the drawn flame (art px), the living tongues rise from its base
    const FLAME = { x: B.flame[0] + B.flame[2] * 0.47, base: B.flame[1] + B.flame[3] * 0.93, radius: 95, height: 430 };

    const L = { bubbles: [], groups: [], skins: [], hearts: [], halos: [], larvae: [] };

    // Living flame: tongues from the base of the drawn flame, yellow at the base and pink at the tip
    const anchor = () => {
        if (!L.land) return null;
        const p = L.land.toScreen(sx(FLAME.x), sy(FLAME.base));
        return { x: p.x, y: p.y, radius: FLAME.radius * k(), height: FLAME.height * k(), unit: F.size / 520 };
    };
    const fire = createFlame({ count: 190, palette: [0xfbf09e, 0xf49f92, 0xe0749c, 0xe0749c], anchor, size: 5.4, rise: 1.3 });
    const sparks = createSparks(360);

    // ---- The sequence: on a steady beat a glow runs bubble after bubble, then sparks come out of the fire, then a rest
    const BEAT = 1.3;                 // seconds from one bubble to the next
    const PERIOD = 6 * BEAT;          // four bubbles, the fire, a rest
    const STEPS = [
        { at: 0, colors: [0xfbf09e, 0xf49f92], halo: 0xfbf09e },
        { at: BEAT, colors: [0xfbf09e, 0xf49f92], halo: 0xfbf09e },
        { at: 2 * BEAT, colors: [0xf49f92, 0xe0749c, 0xfbf09e], halo: 0xf49f92 },
        { at: 3 * BEAT, colors: [0xf49f92, 0xe0749c, 0xfbf09e, 0xffffff], halo: 0xf49f92 },
    ];
    const IGNITE = 4 * BEAT;
    const SPAN_GLOW = 1.7;            // seconds a bubble glows, brightest on its beat
    const IN_TIME = 0.28;             // a touch this close to a bubble's beat (s, either side) is in time
    const bump = (d) => (Math.abs(d) >= SPAN_GLOW / 2 ? 0 : Math.cos(Math.PI * d / SPAN_GLOW) ** 2);
    // How far the sequence is from a bubble's beat, in seconds, between -PERIOD/2 and PERIOD/2
    const offBeat = (cycle, at) => ((cycle - at + PERIOD * 1.5) % PERIOD) - PERIOD / 2;
    let lastCycle = -1;
    let lastT = 0;

    const centreOf = (i) => {
        const b = L.groups[i].boxOnScreen(rectOf(B[BUBBLES[i].name]));
        return [b.left + b.width / 2, b.top + b.height / 2, b.width];
    };
    const spark = (i, more = 1) => {
        if (reduced) return;
        const [x, y, w] = centreOf(i);
        sparks.burst(x, y, { n: Math.round((i === STEPS.length - 1 ? 18 : 9) * more), colors: STEPS[i].colors, speed: (60 + w * 0.25) * Math.sqrt(more), size: 4.4, spread: w * 0.3, life: 1.8 });
    };
    // When the glow reaches the pair, a few sparks come out of the fire
    const ignite = (n = 24, speed = 120) => {
        const a = anchor();
        if (a && !reduced) sparks.burst(a.x, a.y - a.height * 0.5, { n, colors: [0xfbf09e, 0xf49f92, 0xe0749c, 0xffffff], speed, size: 5, spread: a.radius });
    };

    // ---- The game: touch each bubble on its beat; what is lit stays lit until the four are
    const on = BUBBLES.map(() => false);      // lit by a touch in time
    const lit = BUBBLES.map(() => 0);         // how lit each one looks (eases towards `on`)
    const ring = BUBBLES.map(() => 0);        // a flash on each touch in time, that settles
    const missed = BUBBLES.map(() => null);   // the beat a touch out of time made a bubble wait for: so tapping and
                                              // tapping is not a way to catch it, it has to be listened to
    let playing = -Infinity;                  // when the last bubble was touched: while someone plays, the beat sounds
    let wins = 0;
    let win = null;                           // the rulito, while it lives
    let glyph = { left: 0, top: 0, w: 1, h: 1 };
    let flare = 0;                            // the fire's warm light leaping, settles by itself
    const DELAY = 0.6, GROW = 2.2, LINGER = 2.6, EAT = 3.4;    // the rulito: after the fire leaps, born, kept, gone

    const touch = (index) => {
        playing = lastT;
        const cycle = (((lastT % PERIOD) + PERIOD) % PERIOD);
        const height = index / (STEPS.length - 1);
        const beat = Math.round((lastT - STEPS[index].at) / PERIOD);    // the nearest beat of this bubble
        if (win || missed[index] === beat || Math.abs(offBeat(cycle, STEPS[index].at)) > IN_TIME) {
            // Out of time (or while the rulito lives): a muted drop, a few sparks, nothing lost; this beat is gone for
            // this bubble, the next time the glow comes round it can be caught
            if (!win) missed[index] = beat;
            play(win ? 'tap' : 'miss');
            spark(index, 0.4);
            return;
        }
        ring[index] = 1;
        spark(index, 1.6);
        dust?.boost(2 + index, 0.8);
        play('resonate', { step: height });
        if (on[index]) return;
        on[index] = true;
        if (on.every(Boolean)) setTimeout(synchronised, BEAT * 1000 * 0.6);
    };

    // The four rang in time: the fire leaps and the rulito is born out of the pair's bubble
    const synchronised = () => {
        if (win || gone) return;
        wins += 1;
        win = { age: 0, head: 0, tail: 0, full: false, fullAt: 0, back: false, pop: 0 };
        rulito.value?.reshape();
        fire.flare(1);
        flare = 1;
        ignite(60, 190);
        ring[PAIR] = 1;
        spark(PAIR, 3);
        // The fire is heard as it leaps (a rush of air rising over a low bowl), with the chord gathering over it
        play('ignite', 1);
        play('converge');
        sceneMilestone('in_time', { times: wins });
    };
    const onKey = (event, action) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        action();
    };

    const build = (s) => {
        // The land, with the fire behind its stones: the warm light round it, the drawn flame (its living tongues are
        // drawn just behind it, as particles) and the ground going on past the frame
        const land = s.depth(zFor(LAND_DEPTH));
        L.landNode = land;
        L.land = land.group();
        L.fireGlow = L.land.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: 0xf7b48a, stops: [[0, 0.5], [0.3, 0.22], [0.66, 0]], bloom: true });
        L.flame = L.land.image('/assets/sincronicidad/flame.webp', { wind: { amp: 7, speed: 1.7, root: 'bottom' }, shimmer: 0.25, bloom: true });
        L.ground = L.land.image('/assets/sincronicidad/ground.webp');
        L.copies = [];
        for (const side of [-1, 1]) {
            for (let n = 1; n <= COPIES; n++) {
                const node = L.land.image('/assets/sincronicidad/ground.webp', { crop: [0, 0, CROP, 1] });
                // Left: the first one mirrored; right: the first one as drawn
                if ((side < 0) === (n % 2 === 1)) node.sx = -1;
                L.copies.push({ node, side, n });
            }
        }
        land.enter({ y: 60, delay: 200, duration: 1700 });

        // The bubbles, from the far egg to the near pair: each its glow on the beat behind it, its skin, the light inside
        // (a disc; its stippled rim are particles drawn just over it) and its larvae
        BUBBLES.forEach((b, i) => {
            const node = s.depth(zFor(b.depth));
            const group = node.group();
            L.bubbles.push(node);
            L.groups.push(group);
            const halo = group.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: STEPS[i].halo, stops: [[0, 0.6], [0.3, 0.3], [0.62, 0]], bloom: true });
            halo.opacity = 0;
            L.halos.push(halo);
            L.skins.push(group.image(`/assets/sincronicidad/${b.name}.webp`, { shimmer: 0.35 }));
            L.hearts.push(group.disc({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: art.hearts[b.name].color }));
            L.larvae.push(b.larvae.map((name) => group.image(`/assets/sincronicidad/${name}.webp`)));
        });
        // The rulito comes out of the pair's bubble, at its depth, and is drawn over everything
        L.rulito = L.bubbles[PAIR].canvas(rulito.value.canvas, { bloom: true });
        L.bubbles[0].enter({ y: -40, scale: 0.6, delay: 100, duration: 1800 });
        L.bubbles[1].enter({ y: -30, scale: 0.6, delay: 250, duration: 1800 });
        L.bubbles[2].enter({ y: 60, scale: 0.8, delay: 400, duration: 1900 });
        L.bubbles[3].enter({ y: 90, scale: 0.85, delay: 600, duration: 2000 });
    };

    // The sky: the card's flat night, a little deeper at the top; at the very bottom the land's colour, under the copies
    // of the ground lifted on the right
    const paintSky = () => {
        const line = ((sy(SIZE) - (art.edge[0] - art.edge[1]) * k() - 2) / H * 100).toFixed(1);
        root.value.style.background = `linear-gradient(to bottom, ${SKY_TOP} 0%, ${SKY} 45%, ${SKY} ${line}%, ${LAND} ${line}%)`;
    };

    const place = (w, h) => {
        layout(w, h);
        paintSky();

        const ground = rectOf(B.ground);
        L.ground.place(ground);
        const cw = ground.w * CROP;
        const lift = (art.edge[0] - art.edge[1]) * k();
        L.copies.forEach(({ node, side, n }) => {
            const left = side < 0 ? ground.left - n * cw : ground.left + ground.w + (n - 1) * cw;
            node.place({ left, top: ground.top - (side > 0 ? lift : 0), w: cw, h: ground.h });
        });
        const flame = rectOf(B.flame);
        L.flame.place(flame, { x: flame.left + flame.w / 2, y: flame.top + flame.h });
        const fg = flame.w * 3.2;
        L.fireGlow.place({ left: flame.left + flame.w / 2 - fg / 2, top: flame.top + flame.h * 0.62 - fg / 2, w: fg, h: fg });

        BUBBLES.forEach((b, i) => {
            const r = rectOf(B[b.name]);
            const centre = { x: r.left + r.w / 2, y: r.top + r.h / 2 };
            L.groups[i].pivot = centre;
            L.skins[i].place(r);
            const [hx, hy, rx, ry, angle] = art.hearts[b.name].ellipse;
            L.hearts[i].place({ left: sx(hx - rx), top: sy(hy - ry), w: 2 * rx * k(), h: 2 * ry * k() });
            L.hearts[i].rotate = angle;
            b.larvae.forEach((name, j) => {
                const lr = rectOf(B[name]);
                L.larvae[i][j].place(lr, { x: lr.left + lr.w / 2, y: lr.top + lr.h * 0.85 });
            });
            const d = Math.max(r.w, r.h) * 1.7;
            L.halos[i].place({ left: centre.x - d / 2, top: centre.y - d / 2, w: d, h: d });
        });
        // The rulito stands on the top of the pair's bubble, as if it came out of it (its canvas is bigger than the glyph,
        // for the glow, as in Paciencia)
        const pair = rectOf(B.pair);
        const rw = 0.065 * F.size, rh = rw * 86 / 32;
        glyph = { left: pair.left + pair.w / 2 - rw / 2, top: pair.top + 0.04 * pair.h - rh, w: rw, h: rh };
        L.rulito.place({ left: glyph.left - 0.4375 * glyph.w, top: glyph.top - 0.1628 * glyph.h, w: glyph.w * 1.875, h: glyph.h * 1.3256 },
            { x: glyph.left + glyph.w / 2, y: glyph.top + glyph.h });
    };

    const placeHits = () => {
        hits.value.forEach((el, i) => {
            if (!el) return;
            const b = L.groups[i].boxOnScreen(rectOf(B[BUBBLES[i].name]));
            const bw = Math.max(48, b.width), bh = Math.max(48, b.height);
            el.style.translate = `${(b.left + b.width / 2 - bw / 2).toFixed(1)}px ${(b.top + b.height / 2 - bh / 2).toFixed(1)}px`;
            el.style.width = `${bw.toFixed(1)}px`;
            el.style.height = `${bh.toFixed(1)}px`;
        });
    };

    const enter = () => {
        if (entered || !props.active || !stage) return;
        entered = true;
        stage.ready().then(() => { if (!gone) { stage.start(); dust?.reveal(); } });
    };

    // Silent shooting stars, in the card's yellow: now and then one crosses the sky over the bubbles, with a tail of dots
    const TAIL = 22;
    const shooter = { at: 3, T: 1, x: 0, y: 0, dx: 0, dy: 0 };
    const shooting = {
        count: TAIL,
        update(t, data) {
            if (!stage) return;
            if (t > shooter.at + shooter.T) {
                const side = Math.random() < 0.5 ? -1 : 1, speed = (0.3 + Math.random() * 0.25) * Math.max(W, H);
                Object.assign(shooter, {
                    at: t + 5 + Math.random() * 9, T: 0.8 + Math.random() * 0.5,
                    x: W * (0.15 + Math.random() * 0.7), y: Math.max(0, F.y) * 0.4 + H * Math.random() * 0.3,
                    dx: side * speed, dy: speed * (0.2 + Math.random() * 0.25),
                });
            }
            const u = (t - shooter.at) / shooter.T;
            for (let j = 0; j < TAIL; j++) {
                if (u < 0 || u > 1) { data.alphas[j] = 0; continue; }
                const life = Math.max(0, u - j * 0.006);
                data.positions[j * 3] = shooter.x + shooter.dx * life * shooter.T;
                data.positions[j * 3 + 1] = shooter.y + shooter.dy * life * shooter.T;
                data.sizes[j] = j ? Math.max(1.6, 5.5 - j * 0.2) : 8;
                data.alphas[j] = Math.min(1, Math.sin(u * Math.PI) * 1.4) * (1 - j / TAIL) ** 0.7;
                data.tints.set(j < 3 ? [1, 0.98, 0.9] : [0.98, 0.95, 0.63], j * 3);
            }
        },
    };

    // The stars of the card, and on past the frame: the square of sky repeated, mirrored, wherever the screen goes on
    const starPoints = () => {
        const out = [];
        const S = SIZE;
        const sizeOf = (r) => Math.max(1.4, 2 * r / 10 * k());
        for (let iy = -4; iy <= 0; iy++) {
            for (let ix = -3; ix <= 3; ix++) {
                for (let i = 0; i < art.stars.length; i += 4) {
                    const ax = ix % 2 ? S - art.stars[i] : art.stars[i];
                    const ay = iy % 2 ? S - art.stars[i + 1] : art.stars[i + 1];
                    const x = sx(ax + ix * S), y = sy(ay + iy * S);
                    if (x < -20 || x > W + 20 || y < -20 || y > H + 20) continue;
                    out.push([x, y, sizeOf(art.stars[i + 2]), STARS[art.stars[i + 3]]]);
                }
            }
        }
        return out;
    };
    // The stippled rim of the light inside a bubble
    const rimPoints = (name) => () => {
        const d = art.hearts[name].dots;
        const out = [];
        for (let i = 0; i < d.length; i += 3) out.push([sx(d[i]), sy(d[i + 1]), Math.max(1.2, 2 * d[i + 2] / 10 * k())]);
        return out;
    };

    // Every LOOK s the two larvae of the meeting turn to each other for a moment (0..1, eased in and out)
    const LOOK = 9;
    const glance = (t) => {
        const p = (Math.max(0, t) % LOOK) / 2.6;
        return p < 1 ? Math.sin(p * Math.PI) ** 2 : 0;
    };
    const heartColour = [];
    const mixColour = (node, base, toward, u) => {
        const c = node.uniforms.uColor.value;
        const ch = (v, s) => ((v >> s) & 255) / 255;
        c.setRGB(ch(base, 16) + (ch(toward, 16) - ch(base, 16)) * u, ch(base, 8) + (ch(toward, 8) - ch(base, 8)) * u, ch(base, 0) + (ch(toward, 0) - ch(base, 0)) * u);
    };

    let frames = 0;
    const frame = ({ x, y, scroll, t, ramp }) => {
        if (!stage || !L.land) return;
        const s = scroll;
        const dt = Math.min(0.1, Math.max(0, t - lastT));
        lastT = t;
        stage.look(x * SLIDE, y * SLIDE_Y);

        // Where the sequence is now; each time it crosses a beat, that bubble throws its sparks (and, while someone is
        // playing, sounds softly: the beat to follow)
        const cycle = ((t % PERIOD) + PERIOD) % PERIOD;
        const listening = t - playing < 2 * PERIOD && !win;
        // (the first beat is at 0, so a crossing can also be the cycle starting again)
        const crossed = (at) => (cycle >= lastCycle ? lastCycle < at && cycle >= at : lastCycle < at || cycle >= at);
        if (ramp > 0.9) {
            STEPS.forEach((step, i) => {
                if (!crossed(step.at)) return;
                spark(i);
                dust?.boost(2 + i, 0.5);
                if (listening) play('pulse', { step: i / (STEPS.length - 1) });
            });
            if (crossed(IGNITE)) { ignite(); flare = Math.max(flare, 0.45); }
        }
        lastCycle = cycle;

        // The rulito: born after the fire leaps, kept a while, then its tail catches its head and the lights go out
        let named = 0;
        if (win && rulito.value) {
            win.age += dt;
            win.pop = Math.max(0, win.pop - dt * 2.2);
            win.head = 1 - (1 - Math.min(1, Math.max(0, (win.age - DELAY) / GROW))) ** 1.6;
            if (win.head >= 1 && !win.full) { win.full = true; win.fullAt = win.age; win.pop = 1; play('rulito'); fire.flare(0.8); flare = 1; }
            if (win.full && !win.back && win.age - win.fullAt > LINGER) { win.back = true; on.fill(false); }
            if (win.back) win.tail = Math.min(1, win.tail + dt / EAT);
            const whole = Math.min(1, Math.max(0, (win.head - win.tail - 0.6) / 0.4));
            named = Math.max(win.pop, 0.8 * whole * whole * (3 - 2 * whole));
            const glint = win.full && win.head - win.tail > 0.9 ? Math.max(win.pop, Math.sin(t * 4) * 0.5 + 0.5) : 0;
            rulito.value.frame({ head: win.head, tail: win.tail, flare: glint, t, fade: Math.min(1, (win.head - win.tail) * 14), width: glyph.w });
            L.rulito.refresh();
            L.rulito.scale = 1 + 0.2 * win.pop * win.pop;
            if (win.back && win.tail >= 1) {
                win = null;
                rulito.value.frame({ width: glyph.w });
                L.rulito.refresh();
            }
        }
        stageEl?.style.setProperty('--name-glow', named.toFixed(3));
        const together = on.filter(Boolean).length / BUBBLES.length;
        stage.bloom = Math.max(named, win ? 0.5 : 0, 0.25 * together * together);

        // Each bubble floats on its own slow wave and glows when the sequence passes through it; a lit one stays brighter,
        // with its glow behind it breathing on the beat. The larvae breathe and turn a little in their eggs
        BUBBLES.forEach((b, i) => {
            const node = L.groups[i];
            const halo = L.halos[i];
            const p = bump(offBeat(cycle, STEPS[i].at));
            lit[i] += ((on[i] ? 1 : 0) - lit[i]) * Math.min(1, dt * (on[i] ? 6 : 0.8));
            ring[i] = Math.max(0, ring[i] - dt * 2.4);
            node.y = Math.sin(t * b.speed + b.phase) * b.lift * ramp - s * b.depth * 2.2;
            node.rotate = Math.sin(t * b.speed * 0.7 + b.phase) * b.turn * ramp;
            node.scale = 1 + Math.sin(t * b.speed * 0.5 + b.phase + 1) * 0.018 * ramp + 0.07 * p + 0.04 * lit[i] + 0.08 * ring[i] * ring[i];
            const bright = 1 + 0.3 * p + 0.2 * lit[i] + 0.25 * ring[i];
            const saturate = 1 + 0.4 * p + 0.25 * lit[i];
            [L.skins[i], ...L.larvae[i]].forEach((layer) => {
                layer.uniforms.uBright.value = bright;
                layer.uniforms.uSaturate.value = saturate;
            });
            const warm = Math.min(1, 0.35 * p + 0.25 * lit[i] + 0.3 * ring[i]);
            if (heartColour[i] !== warm) { heartColour[i] = warm; mixColour(L.hearts[i], art.hearts[b.name].color, 0xfbe6a6, warm); }
            halo.scale = 1 + 0.12 * p + 0.25 * ring[i];
            halo.opacity = Math.min(1, lit[i] * (0.65 + 0.35 * p) + 0.7 * ring[i]);
            halo.mesh.visible = halo.opacity > 0.01;
            // The larvae: they breathe from their feet; in the eggs they turn slowly, in the meeting they look at each
            // other now and then, the pair hold each other closer as they breathe
            const breath = Math.sin(t * (1.1 + 0.13 * i) + b.phase);
            L.larvae[i].forEach((larva, j) => {
                const own = Math.sin(t * (1.05 + 0.2 * j) + b.phase + j * 1.7);
                larva.sy = 1 + 0.025 * (j ? own : breath) * ramp;
                larva.sx = 1 - 0.01 * (j ? own : breath) * ramp;
                if (b.name === 'meeting') larva.rotate = (j ? -1 : 1) * 6 * glance(t) * ramp + Math.sin(t * 0.6 + j * 2) * 1.5 * ramp;
                else if (b.name === 'pair') larva.rotate = (j ? -1 : 1) * 1.2 * (0.5 + 0.5 * breath) * ramp;
                else larva.rotate = Math.sin(t * 0.45 + b.phase) * 7 * ramp;
            });
            // The rim of the light inside follows its bubble
            const drift = stage.drift(L.bubbles[i].z);
            dust?.grow(2 + i, node.scale - 1, node.pivot.x, node.pivot.y);
            dust?.turn(2 + i, node.rotate, node.pivot.x, node.pivot.y);
            dust?.shift(2 + i, drift.x + node.x, drift.y + node.y);
        });

        // The rulito floats with the pair's bubble it came out of
        L.rulito.y = L.groups[PAIR].y;
        L.rulito.rotate = Math.sin(t * 1.6) * 3 * ramp;

        // The fire: its light breathes and leaps with it
        flare = Math.max(0, flare - dt * 0.6);
        L.fireGlow.opacity = 0.55 + 0.12 * Math.sin(t * 2.3) + 0.06 * Math.sin(t * 5.1) + 0.45 * flare;
        L.fireGlow.scale = 1 + 0.05 * Math.sin(t * 1.7) + 0.3 * flare;
        L.flame.sy = 1 + (0.03 * Math.sin(t * 3.1) + 0.02 * Math.sin(t * 7.3)) * ramp + 0.12 * flare;
        L.flame.uniforms.uBright.value = 1 + 0.25 * flare;
        L.landNode.y = s * 20;
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
        const over = (node) => node.mesh.renderOrder + 0.5;
        dust = startStardust(null, {
            stage,
            manual: true,
            groups: [
                // 0: the stars of the card, behind everything
                { colors: STARS, look: 'hard', parallax: 6, drift: 1.4, twinkle: 0.4, reach: 110, push: 18, order: -20, points: starPoints },
                // 1: the shooting stars
                { colors: [0xffffff], dynamic: shooting, parallax: 0, drift: 0, twinkle: 0, reach: 0, look: 'soft', order: -19 },
                // 2-5: the stippled rim of the light inside each bubble, just over its disc
                ...BUBBLES.map((b, i) => ({ colors: [art.hearts[b.name].color], look: 'hard', parallax: 0, drift: 0.8, jitter: 0.3, twinkle: 0.2, reach: 0, order: over(L.hearts[i]), points: rimPoints(b.name) })),
                // 6: the fire's living tongues, just behind the drawn flame; 7: the sparks, behind the drawings
                { ...fire.group(), order: L.flame.mesh.renderOrder - 0.5 },
                { ...sparks.group(), order: -17 },
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
    <div class="scene" ref="root">
        <canvas class="stageCanvas" ref="canvas"></canvas>
        <!-- The rulito is drawn on its own canvas, which the stage shows as a texture over the pair's bubble -->
        <Rulito ref="rulito" class="offstage" color="#f2b036" />
        <!-- The sequence, from the smallest egg to the pair that lights the fire: touch each one when the glow reaches it -->
        <div v-for="(b, i) in BUBBLES" :key="b.name" :ref="(el) => { hits[i] = el; }" class="bubble" role="button" tabindex="0"
            :aria-label="$i18n.locale === 'en' ? 'Bubble: touch it when the glow reaches it' : 'Burbuja: tocala cuando el brillo llegue a ella'"
            @pointerdown.prevent="touch(i)" @keydown="onKey($event, () => touch(i))"></div>
    </div>
</template>

<style scoped>
    .scene {
        position: absolute;
        inset: 0;
        overflow: hidden;
        background: #36848e;
    }

    .stageCanvas {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        display: block;
        pointer-events: none;
    }

    .bubble {
        position: absolute;
        left: 0;
        top: 0;
        width: 0;
        height: 0;
        border-radius: 50%;
        pointer-events: auto;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
        touch-action: manipulation;
        outline: none;
    }

    .offstage {
        position: absolute;
        left: -9999px;
        top: 0;
        width: 40px;
        visibility: hidden;
    }

    .bubble:focus-visible {
        outline: 2px solid rgba(255, 244, 150, 0.9);
        outline-offset: 4px;
    }
</style>
