<script setup>
    // Comunicación: "I listen to my truth and through her, I communicate with clarity and honesty". Lying on the ground
    // and looking up, through a ring of pink trees whose trunks all lean in towards the middle, at a round opening of
    // teal sky where three beings float in silence, each in its pink aura: a small one with long tentacles on the left,
    // the big one in the middle and a little one on the right with its eyes open. Yellow pollen hangs in the air and
    // glints on the bark ("the truth attracts bees like pollen").
    // Its verb is Resonar as an echo (listen first, then answer), and listening comes first of all: "the first step to
    // communicate honestly is to listen to yourself... to stop in the stillness, tempering the chatter of the mind, and
    // let the ear of the soul hear answers in the silence". The light in the middle of the sky only sings when the
    // person is still: left alone it gathers (it brightens and grows, the motes in the opening draw in to it) and after
    // a few seconds of stillness it sings a short phrase; each note flies from it to the being that holds it, which rings
    // with it (it swells, its aura flares). The card's chord is Gm and each being holds one of its notes: the big one in
    // the middle Sol (the root, the throat), the one on the left Si flat and the little one on the right Re. The person
    // repeats the phrase by touching the beings in the same order. A touch while it sings cuts it off (the light fades
    // and has to be waited for again: the chatter of the mind); a wrong being sounds muted and, after the stillness, the
    // phrase is sung again, slower. The phrase grows, as a Simon: two notes, then the same phrase with a third, then a
    // fourth. Repeated whole with four, the pollen flies to the beings like bees to pollen, the rulito is born among
    // them, in the light, and the name glows; then a new phrase starts again from two notes. On the person's turn, left
    // alone a while, the being that comes next breathes (a hint), and later the light gathers and sings it again. A touch
    // on the light itself does not cut it: it asks to listen (on the person's turn, it sings again after the stillness
    // instead of waiting longer).
    // Alive besides: the beings float, each at its own pace, breathe like jellyfish (they swell and draw in from the top
    // of the head, the tentacles swaying under them), now and then turn their heads to one side and back, and the little
    // one blinks and looks about. The canopy breathes: the far leaves, the trunks and the ring of leaves turn very
    // slightly about the middle, each at its own pace, and the crowns round the opening sway on their own as a gust goes
    // round the ring. The pollen trembles and moves out of a finger's way, and a few motes drift in the opening. A touch
    // anywhere else strums the chord (`star`) and the pollen flares. Before the first touch the light sings with lights
    // only, in silence, as every scene. Reduced motion keeps it still and it is not played.
    // The sky is not a picture (the card has no layer for it): the card's teal, measured by the converter, with a softer
    // light in code in the middle. The pink auras, the pollen of the bark and the field of pollen behind the leaves are
    // particles from the card's dots. It is drawn in WebGL (useLayerStage): the far canopy, the trunks, the ring of
    // leaves and the beings are planes at their depths. The frame covers the screen (looking up, the trees close all
    // round), so it is as big as the screen's long side; on a very wide screen the canopy goes on past it mirrored.
    // The card has no rulito: it is drawn in the light, among the three.
    // From comunicacionScene.json and public/assets/comunicacion (made by scripts/convert-comunicacion.mjs).
    import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { createParallax } from '../../composables/useParallax.js';
    import { createLayerStage } from '../../composables/useLayerStage.js';
    import { startStardust } from '../../composables/useStardust.js';
    import { createSparks } from '../../composables/useSparks.js';
    import { play } from '../../composables/useSound.js';
    import { sceneMilestone } from '../../analytics.js';
    import Rulito from '../Rulito.vue';
    import art from '../../composables/comunicacionScene.json';

    const props = defineProps({
        card: { type: Object, default: () => ({}) },
        active: Boolean
    });

    const root = ref(null);
    const canvas = ref(null);
    const rulito = ref(null);
    const keyHits = ref([]);
    const lightHit = ref(null);
    let stageEl = null;
    let stage = null;
    let parallax = null;
    let dust = null;
    let entered = false;
    let gone = false;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ---- Layout: the illustration is a 2160 square centred on the screen, as big as its long side (and a margin, so the
    // parallax never shows its edges); on a very wide screen it stops growing and the canopy goes on past it, mirrored
    const SIZE = art.size;
    const B = art.boxes;
    const MARGIN = 70;                      // px past each edge of the screen
    const WIDEST = 2.1;                     // the frame grows with the width up to this many times the height
    let F = { x: 0, y: 0, size: 1 };
    let W = 1, H = 1;
    const RULITO_H = 190, RULITO_BOTTOM = 1315;  // art px: the rulito's height and where its foot is
    const k = () => F.size / SIZE;
    const sx = (x) => F.x + x * k();
    const sy = (y) => F.y + y * k();
    const rectOf = ([left, top, w, h]) => ({ left: sx(left), top: sy(top), w: w * k(), h: h * k() });
    const layout = (w, h) => {
        const size = Math.max(h, Math.min(w, WIDEST * h)) + 2 * MARGIN;
        F = { x: w / 2 - size / 2, y: h / 2 - size / 2, size };
    };

    const SLIDE = 36;
    const SLIDE_Y = 26;
    const zFor = (amp) => amp / (SLIDE + amp);
    const DEPTH = { light: 2, far: 4, beings: 7, back: 12, trunks: 20, front: 28 };

    const SKY = art.sky.length ? art.sky[1]?.[1] ?? art.sky[0][1] : 0x037296;
    const POLLEN = [0xf2c872, 0xf6d88c, 0xeebc5e];
    const LIGHT = 0x4fb3cf;                 // the softer light in the middle of the sky
    const CORE = 0xbfeef2;                  // its heart, the light that sings
    const CORE_AT = [1080, 1230];           // art px: in the middle of the three, under the big one
    const CORE_SIZE = 560;                  // art px across
    const CREAM = 0xfff6dc;
    const hexOf = (c) => `#${c.toString(16).padStart(6, '0')}`;
    const rgb = (c) => [((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255];

    // ---- The beings: where each one's head is (art px), its own pace, and how it rings when touched. Each holds one
    // note of the card's chord, Gm (`step` across the chord for `sing` and `resonate`: Sol, Si flat, Re): the big one in
    // the middle the root, the one on the left the third, the little one on the right the fifth
    const NOTES = [1 / 3, 0, 2 / 3];
    const NAMES = [
        { es: 'El ser de la izquierda (Si bemol)', en: 'The being on the left (B flat)' },
        { es: 'El ser grande del medio (Sol)', en: 'The big being in the middle (G)' },
        { es: 'El ser pequeño de la derecha (Re)', en: 'The little being on the right (D)' },
    ];
    const BEINGS = art.beings.map((b, i) => {
        const [x, y, w, h] = b.head;
        return { ...b, i, cx: x + w / 2, cy: y + h / 2, top: y, hw: w, hh: h, phase: i * 2.1 + 0.4, pace: [0.42, 0.34, 0.5][i] ?? 0.4, pop: 0, glow: 0, look: 9 + i * 3.7, step: NOTES[i] ?? 0 };
    });
    // The little one on the right has its eyes open: it blinks and looks about
    let blinkAt = 2.5;
    let eyeAim = 0, eyeAimTo = 0, eyeMoveAt = 4;
    const L = {};

    // Now and then a being turns its head to one side and back (0..1, eased in and out), every `every` s
    const turn = (t, every, offset) => {
        const p = ((Math.max(0, t) + offset) % every) / 3.2;
        return p < 1 ? Math.sin(p * Math.PI) ** 2 : 0;
    };

    // ---- The game: the light sings a phrase when the person is still; it is repeated by touching the beings in order
    const STILL = 3.5;                      // s of stillness before the light sings
    const GAP = 0.9;                        // s between the sung notes
    const SLOWER = 1.25, GAP_MAX = 1.6;     // each time it has to be sung again after a mistake
    const FLIGHT = 0.45;                    // s a sung note takes to fly from the light to its being
    const HINT = 3.5;                       // s alone on the person's turn before the being that comes next breathes
    const AGAIN = 8;                        // s alone on the person's turn before the light sings it again
    const LENGTHS = [2, 3, 4];              // the phrase grows: the same phrase, one note longer each time
    // Four notes, never the same being twice running, and all three in it
    const newPhrase = (last) => {
        let p;
        do {
            p = [Math.floor(Math.random() * 3)];
            while (p.length < 4) p.push((p[p.length - 1] + 1 + Math.floor(Math.random() * 2)) % 3);
        } while (new Set(p).size < 3 || (last && p.join() === last.join()));
        return p;
    };
    let phrase = newPhrase();
    let level = 0;                          // index into LENGTHS
    const len = () => LENGTHS[level];
    let mode = 'listen';                    // 'listen': waiting for stillness; 'answer': the person's turn; 'win'
    let since = 0;                          // when the stillness (or the person's turn) began, scene time
    let singing = null;                     // { at, played }: the phrase being sung
    const arrive = BEINGS.map(() => null);  // when the note sung reaches its being (scene time)
    let gap = GAP;
    let got = 0;                            // notes repeated right so far
    let sung = 0;                           // times the light sang in this round (all its lengths)
    let heard = false;                      // someone touched the scene: from then on it sings aloud
    let lastTouch = -Infinity;
    let gath = 0;                           // how gathered the light looks (0..1)
    let voice = 0;                          // the light singing a note
    let cut = 0;                            // the light fading when its song is cut off
    let yes = 0;                            // a phrase repeated right: the light flares
    let next = 0;                           // how much the being that comes next breathes (the hint)
    let lastHint = -1;
    let pollen = 0;                         // the pollen gone to the beings (0..1)
    let wins = 0;
    let win = null;
    let glyph = { left: 0, top: 0, w: 1, h: 1 };
    const DELAY = 1.9, GROW = 2.2, KEEP = 2.8, EAT = 3.4;    // the rulito: born once the pollen arrives, kept, gone
    const playing = () => !reduced && !!stage;

    // ---- What flies (the notes, the pollen going to the beings): slots of a dynamic group, in screen px
    const FLYERS = 280;
    const fly = Array.from({ length: FLYERS }, () => ({ on: false }));
    let flyNext = 0;
    const send = (from, to, { at = lastT, dur = 1.2, size = 6, c0 = CREAM, c1 = null, arc = 0.3, note = false } = {}) => {
        if (reduced) return;
        const f = fly[flyNext];
        flyNext = (flyNext + 1) % FLYERS;
        const d = Math.hypot(to.x - from.x, to.y - from.y);
        Object.assign(f, {
            on: true, at, dur, size, note, x0: from.x, y0: from.y, x1: to.x, y1: to.y,
            cx: (from.x + to.x) / 2 + (Math.random() - 0.5) * d * 0.4, cy: (from.y + to.y) / 2 - d * arc * (0.5 + Math.random() * 0.5),
            c0: rgb(c0), c1: rgb(c1 ?? c0),
        });
    };
    const ease = (p) => p * p * (3 - 2 * p);
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
                data.alphas[i] = Math.min(1, p * 8) * Math.min(1, (1 - p) * 4);
                for (let c = 0; c < 3; c++) data.tints[i * 3 + c] = f.c0[c] + (f.c1[c] - f.c0[c]) * e;
            }
        },
    };
    const sparks = createSparks(200);

    // Where things are on screen now
    const coreAt = () => L.lightNode.toScreen(sx(CORE_AT[0]), sy(CORE_AT[1]));
    const headAt = (i) => L.beings[i].group.toScreen(sx(BEINGS[i].cx), sy(BEINGS[i].cy));
    const rulitoAt = () => L.rulitoNode.toScreen(glyph.left + glyph.w / 2, glyph.top + glyph.h * 0.5);

    // ---- Singing: one note after another, each flying from the light to its being, which rings with it
    const singNow = () => {
        mode = 'listen';
        got = 0;
        arrive.fill(null);
        sung += 1;
        singing = { at: lastT, played: 0 };
    };
    const singNote = (i) => {
        voice = 1;
        arrive[i] = lastT + FLIGHT;
        const from = coreAt(), to = headAt(i);
        for (let j = 0; j < 3; j++) send(from, to, { dur: FLIGHT, size: 13 - 3 * j, c0: CREAM, c1: BEINGS[i].aura, at: lastT + j * 0.05, arc: 0.15, note: true });
    };
    const ring = (i, strong = 1) => {
        const b = BEINGS[i];
        b.pop = Math.max(b.pop, strong);
        b.glow = Math.max(b.glow, strong);
        dust?.boost(2 + i, 1.2 * strong);
    };
    // A touch while it sings cuts it off: the light fades and has to be waited for again
    const cutOff = () => {
        if (!singing) return;
        singing = null;
        arrive.fill(null);
        fly.forEach((f) => { if (f.note) f.on = false; });
        cut = 1;
        mode = 'listen';
        got = 0;
    };

    // ---- A touch on a being: on the person's turn it answers; otherwise it rings (and cuts the song off)
    const touchBeing = (i) => {
        const b = BEINGS[i];
        lastTouch = lastT;
        if (!playing() || mode === 'win' || mode === 'listen') {
            cutOff();
            heard = true;
            b.pop = 1;
            dust?.boost(2 + i, 1.2);
            play('tap');
            if (i === 2) blinkAt = Math.min(blinkAt, lastT + 0.15);
            return;
        }
        heard = true;
        const p = headAt(i);
        if (i === phrase[got]) {
            play('resonate', { step: b.step });
            ring(i);
            got += 1;
            sparks.burst(p.x, p.y, { n: 12, colors: [b.aura, CREAM, POLLEN[0]], speed: 80, size: 4, spread: b.hw * k() * 0.4, life: 1.5 });
            // Its light goes back to the light
            const to = coreAt();
            for (let j = 0; j < 3; j++) send(p, to, { dur: 0.9 + Math.random() * 0.4, size: 7, c0: b.aura, c1: CREAM, at: lastT + j * 0.06 });
            if (got === len()) {
                if (level === LENGTHS.length - 1) {
                    mode = 'win';
                    setTimeout(() => { if (!gone) complete(); }, 450);
                } else {
                    // Right: the light flares, and after the stillness it sings the same phrase with one more note
                    level += 1;
                    yes = 1;
                    mode = 'listen';
                    since = lastT;
                }
            }
            return;
        }
        // Not that one: a muted drop, and after the stillness it sings it again, slower
        play('miss');
        b.pop = Math.max(b.pop, 0.4);
        sparks.burst(p.x, p.y, { n: 4, colors: [b.aura], speed: 40, size: 3.4, spread: 6, life: 0.9 });
        got = 0;
        gap = Math.min(GAP_MAX, gap * SLOWER);
        mode = 'listen';
        since = lastT;
    };
    // The light: a touch does not cut it off, it asks to listen (on the person's turn, it sings again after the stillness)
    const touchLight = () => {
        lastTouch = lastT;
        if (!playing() || mode === 'win') { play('tap'); return; }
        heard = true;
        if (singing) return;
        voice = Math.max(voice, 0.5);
        play('tap');
        if (mode === 'answer') { mode = 'listen'; got = 0; since = lastT; }
    };
    const touchElsewhere = () => {
        lastTouch = lastT;
        cutOff();
        heard = true;
        play('star');
        dust?.boost(0, 0.9);
        dust?.boost(1, 0.9);
        dust?.boost(5, 1);
    };
    const onCanvas = (event) => {
        const area = canvas.value.getBoundingClientRect();
        return { x: event.clientX - area.left, y: event.clientY - area.top };
    };
    const beingAt = (p) => {
        let best = -1, bestD = Infinity;
        BEINGS.forEach((b, i) => {
            const at = L.beings[i].group.toScreen(sx(b.cx), sy(b.cy + b.hh * 0.6));
            const reach = Math.max(44, b.hh * 1.3 * k());
            const d = Math.hypot(p.x - at.x, p.y - at.y);
            if (d < reach && d < bestD) { best = i; bestD = d; }
        });
        return best;
    };
    const touch = (event) => {
        if (!stage || !L.beings) return;
        const p = onCanvas(event);
        const i = beingAt(p);
        if (i >= 0) { touchBeing(i); return; }
        const c = coreAt();
        if (Math.hypot(p.x - c.x, p.y - c.y) < Math.max(40, CORE_SIZE * 0.3 * k())) { touchLight(); return; }
        touchElsewhere();
    };
    const onKey = (event, action) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        action();
    };

    // Repeated whole with four notes: the pollen flies to the beings like bees, and the rulito is born among them, in the
    // light. Gm is minor, not a seventh: nothing resolves; the rulito climbs the chord an octave up
    const complete = () => {
        wins += 1;
        win = { age: 0, head: 0, tail: 0, full: false, fullAt: 0, back: false, pop: 0 };
        rulito.value?.reshape();
        sceneMilestone('echo_sung', { times: wins, tries: sung });
        // From the pollen in sight, to the auras
        const pts = [
            ...art.pollen.far.map(([x, y]) => ({ x: sx(x) + farShift.x, y: sy(y) + farShift.y })),
            ...art.pollen.near.map(([x, y]) => ({ x: sx(x) + nearShift.x, y: sy(y) + nearShift.y })),
        ].filter((p) => p.x > -20 && p.x < W + 20 && p.y > -20 && p.y < H + 20);
        for (let n = 0; n < 170 && pts.length; n++) {
            const from = pts.splice(Math.floor(Math.random() * pts.length), 1)[0];
            const i = Math.floor(Math.random() * BEINGS.length);
            const h = headAt(i);
            const r = Math.max(BEINGS[i].hw, BEINGS[i].hh) * 0.75 * k();
            const a = Math.random() * Math.PI * 2;
            const to = { x: h.x + Math.cos(a) * r * Math.random(), y: h.y + Math.sin(a) * r * Math.random() };
            send(from, to, { dur: 1.3 + Math.random() * 0.9, size: 4 + Math.random() * 3, c0: POLLEN[n % POLLEN.length], c1: CREAM, at: lastT + Math.random() * 0.6, arc: 0.1 });
        }
        // Once it has arrived, each being's light goes to the light, where the rulito is born
        const to = rulitoAt();
        BEINGS.forEach((b, i) => {
            setTimeout(() => { if (!gone) ring(i, 0.8); }, 1500 + i * 120);
            const h = headAt(i);
            for (let j = 0; j < 4; j++) send(h, to, { dur: 0.9 + Math.random() * 0.3, size: 7, c0: b.aura, c1: CREAM, at: lastT + 1.6 + i * 0.12 + j * 0.05, arc: 0.15 });
        });
    };

    const build = (s) => {
        // The sky's light, softer in the middle of the opening
        const light = s.depth(zFor(DEPTH.light));
        L.lightNode = light;
        L.light = light.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: LIGHT, stops: [[0, 0.24], [0.4, 0.1], [0.75, 0]] });
        // Its heart, which gathers in the stillness and sings
        L.core = light.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: CORE, stops: [[0, 0.75], [0.25, 0.32], [0.62, 0]], bloom: true });
        L.core.opacity = 0;
        // The beings, behind the canopy: each a group (its aura's light, the being, the little one's eyes)
        const beings = s.depth(zFor(DEPTH.beings));
        L.beingsNode = beings;
        L.beings = BEINGS.map((b) => {
            const group = beings.group();
            const aura = group.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: b.aura, stops: [[0, 0.6], [0.3, 0.3], [0.62, 0]] });
            const body = group.image(`/assets/comunicacion/${b.name}.webp`, { wind: { amp: 4, speed: 0.9 + 0.15 * b.i, root: 'top' } });
            const eyes = B[`eyes${b.i}`] ? group.image(`/assets/comunicacion/eyes${b.i}.webp`) : null;
            return { group, aura, body, eyes };
        });
        beings.enter({ y: 26, delay: 900, duration: 2400 });
        // The rulito, among the three, in the light (its own node at their depth, so it does not float with any of them)
        const among = s.depth(zFor(DEPTH.beings));
        L.rulitoNode = among;
        L.rulito = among.canvas(rulito.value.canvas, { bloom: true });
        // The canopy, looking up: the far leaves, the trunks, the ring of leaves round the opening. Each comes down into
        // place from a little bigger, as if the eyes were opening on it
        const canopy = (name, depth, enter, options = {}) => {
            const node = s.depth(zFor(depth));
            const group = node.group();
            const copies = [-1, 0, 1].map((side) => {
                const img = group.image(`/assets/comunicacion/${name}.webp`, options);
                if (side) img.sx = -1;
                return { img, side };
            });
            node.enter(enter);
            return { node, group, copies };
        };
        L.back = canopy('back', DEPTH.back, { y: 0, scale: 1.05, delay: 0, duration: 2600 });
        L.trunks = canopy('trunks', DEPTH.trunks, { y: 0, scale: 1.08, delay: 120, duration: 2600 });
        L.front = canopy('front', DEPTH.front, { y: 0, scale: 1.12, delay: 240, duration: 2600 }, { sway: true });
    };

    const place = (w, h) => {
        layout(w, h);
        W = w;
        H = h;
        const c = { x: sx(SIZE / 2), y: sy(SIZE / 2) };
        // The sky: the card's teal in rings from the middle of the frame (it barely changes)
        const stops = art.sky.map(([d, col]) => `${hexOf(col)} ${(d * k()).toFixed(0)}px`);
        root.value.style.background = stops.length > 1
            ? `radial-gradient(circle at ${c.x.toFixed(0)}px ${c.y.toFixed(0)}px, ${stops.join(', ')})`
            : hexOf(SKY);

        const ld = 1500 * k();
        L.light.place({ left: c.x - ld / 2, top: sy(1150) - ld / 2, w: ld, h: ld });
        const cd = CORE_SIZE * k();
        L.core.place({ left: sx(CORE_AT[0]) - cd / 2, top: sy(CORE_AT[1]) - cd / 2, w: cd, h: cd });
        // The rulito in the light, under the big one and between the other two (its canvas is bigger than the glyph, for
        // the glow)
        const rh = RULITO_H * k(), rw = rh * 32 / 86;
        glyph = { left: sx(CORE_AT[0]) - rw / 2, top: sy(RULITO_BOTTOM) - rh, w: rw, h: rh };
        L.rulito.place({ left: glyph.left - 0.4375 * glyph.w, top: glyph.top - 0.1628 * glyph.h, w: glyph.w * 1.875, h: glyph.h * 1.3256 },
            { x: glyph.left + glyph.w / 2, y: glyph.top + glyph.h });

        BEINGS.forEach((b, i) => {
            const being = L.beings[i];
            const pivot = { x: sx(b.cx), y: sy(b.cy) };
            being.group.pivot = pivot;
            const r = rectOf(B[b.name]);
            // It breathes from the top of its head: the tentacles stretch and draw in under it
            being.body.place(r, { x: sx(b.cx), y: sy(b.top) });
            const ad = Math.max(b.hw, b.hh) * 2.6 * k();
            being.aura.place({ left: pivot.x - ad / 2, top: pivot.y - ad / 2, w: ad, h: ad });
            if (being.eyes) being.eyes.place(rectOf(B[`eyes${i}`]));
        });

        [L.back, L.trunks, L.front].forEach((layer) => {
            layer.node.pivot = { x: w / 2, y: h / 2 };
            layer.group.pivot = { ...c };
        });
        const canopyAt = (layer, box) => {
            const r = rectOf(box);
            // The copies go on past the frame, mirrored about its sides, so they meet it without a seam
            layer.copies.forEach(({ img, side }) => {
                const left = side < 0 ? 2 * sx(0) - (r.left + r.w) : side > 0 ? 2 * sx(SIZE) - (r.left + r.w) : r.left;
                img.place({ ...r, left });
                img.mesh.visible = side === 0 || (side < 0 ? sx(0) > -SLIDE * 2 : sx(SIZE) < w + SLIDE * 2);
            });
        };
        canopyAt(L.back, B.back);
        canopyAt(L.trunks, B.trunks);
        canopyAt(L.front, B.front);
    };

    // The crowns round the opening sway on their own, a gust going round the ring now and then
    const [FX, FY, FW, FH] = B.front;
    const CROWNS = art.crowns.map(([x, y, w], i) => ({ u: (x - FX) / FW, v: (y - FY) / FH, w: w / FW, angle: Math.atan2(y - SIZE / 2, x - SIZE / 2), phase: i * 1.7 }));
    const crowns = (t, ramp) => CROWNS.map((c) => {
        const gust = Math.max(0, Math.sin(t * 0.21 - c.angle)) ** 3;
        const lean = (0.8 * Math.sin(t * 0.55 + c.phase) + 2.2 * gust * Math.sin(t * 1.6 + c.phase)) * ramp;
        return [c.u, c.v, c.w, lean, 1 + 0.012 * Math.sin(t * 0.8 + c.phase) * ramp];
    });

    // The keyboard's buttons: one over each being and one over the light
    const placeKeys = () => {
        const put = (el, b, min = 44) => {
            if (!el) return;
            const bw = Math.max(min, b.width), bh = Math.max(min, b.height);
            el.style.translate = `${(b.left + b.width / 2 - bw / 2).toFixed(1)}px ${(b.top + b.height / 2 - bh / 2).toFixed(1)}px`;
            el.style.width = `${bw.toFixed(1)}px`;
            el.style.height = `${bh.toFixed(1)}px`;
        };
        BEINGS.forEach((b, i) => put(keyHits.value[i], L.beings[i].group.boxOnScreen(rectOf(b.head))));
        const cd = CORE_SIZE * 0.3 * k();
        put(lightHit.value, L.lightNode.boxOnScreen({ left: sx(CORE_AT[0]) - cd / 2, top: sy(CORE_AT[1]) - cd / 2, w: cd, h: cd }));
    };

    const enter = () => {
        if (entered || !props.active || !stage) return;
        entered = true;
        stage.ready().then(() => { if (!gone) { stage.start(); dust?.reveal(); } });
    };

    let lastT = 0;
    let farShift = { x: 0, y: 0 }, nearShift = { x: 0, y: 0 };
    let frames = 0;
    const frame = ({ x, y, scroll, t, ramp }) => {
        if (!stage || !L.beings) return;
        const dt = Math.min(0.1, Math.max(0, t - lastT));
        lastT = t;
        stage.look(x * SLIDE, y * SLIDE_Y);

        // ---- The light sings when the person is still: in the stillness it gathers, and then it sings
        const quiet = t - Math.max(lastTouch, since);
        if (!reduced && !win && ramp > 0.9 && !singing) {
            if ((mode === 'listen' && quiet >= STILL) || (mode === 'answer' && quiet >= AGAIN)) singNow();
        }
        if (singing) {
            while (singing.played < len() && t >= singing.at + singing.played * gap) singNote(phrase[singing.played++]);
            if (singing.played >= len() && t >= singing.at + (len() - 1) * gap + FLIGHT + 0.35) {
                singing = null;
                mode = 'answer';
                since = t;
            }
        }
        BEINGS.forEach((b, i) => {
            if (arrive[i] === null || t < arrive[i]) return;
            arrive[i] = null;
            ring(i);
            if (heard) play('sing', { step: b.step, length: gap * 0.8 });
        });
        const goal = reduced || win ? 0
            : singing ? 1
                : mode === 'listen' ? Math.min(1, quiet / STILL)
                    : Math.min(1, Math.max(0, (quiet - (AGAIN - STILL)) / STILL));
        gath += (goal - gath) * Math.min(1, dt * (goal > gath ? 6 : 3));
        voice = Math.max(0, voice - dt * 2.2);
        cut = Math.max(0, cut - dt * 1.2);
        yes = Math.max(0, yes - dt * 0.9);
        const g = ease(gath);
        // The motes in the opening draw in to it as it gathers
        dust?.grow(5, -0.35 * g, sx(CORE_AT[0]), sy(CORE_AT[1]));

        // ---- The win: the pollen flies to the beings, the rulito is born in the light, kept, gone; then a new phrase
        let named = 0;
        if (win && rulito.value) {
            win.age += dt;
            win.pop = Math.max(0, win.pop - dt * 2.2);
            win.head = 1 - (1 - Math.min(1, Math.max(0, (win.age - DELAY) / GROW))) ** 1.6;
            if (win.head >= 1 && !win.full) {
                win.full = true; win.fullAt = win.age; win.pop = 1;
                play('rulito');
                BEINGS.forEach((_, i) => ring(i, 0.7));
            }
            if (win.full && !win.back && win.age - win.fullAt > KEEP) win.back = true;
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
                phrase = newPhrase(phrase);
                level = 0;
                gap = GAP;
                sung = 0;
                got = 0;
                mode = 'listen';
                since = t;
            }
        }
        const pollenGoal = win && !win.back ? 1 : 0;
        pollen += (pollenGoal - pollen) * Math.min(1, dt * (pollenGoal ? 1.2 : 0.5));
        dust?.fade(0, 1 - 0.7 * pollen);
        dust?.fade(1, 1 - 0.7 * pollen);
        stageEl?.style.setProperty('--name-glow', named.toFixed(3));
        stage.bloom = Math.max(named, 0.3 * voice);

        // On the person's turn, left alone HINT s, the being that comes next breathes
        const hintI = !reduced && mode === 'answer' && !singing && quiet > HINT ? phrase[got] : -1;
        next += ((hintI >= 0 ? 1 : 0) - next) * Math.min(1, dt * 3);
        const breathe = next * (0.5 + 0.5 * Math.sin((quiet - HINT) * 3.4 - Math.PI / 2));
        let hinted = hintI;
        if (hintI < 0 && next > 0.01) hinted = lastHint;
        lastHint = hinted;

        // ---- The sky's light breathes, slowly; its heart gathers in the stillness, flashes on each note and fades when cut
        L.light.opacity = 0.8 + 0.2 * Math.sin(t * 0.3) * ramp + 0.35 * g + 0.25 * yes;
        L.lightNode.y = scroll * 6;
        const rest = reduced ? 0.25 : 0.18 + 0.06 * Math.sin(t * 0.3);
        L.core.opacity = Math.min(1.2, (rest + 0.7 * g + 0.45 * voice + 0.6 * yes + 0.5 * named) * (1 - 0.8 * cut));
        L.core.scale = 0.8 + 0.3 * g + 0.15 * voice + 0.25 * yes + 0.04 * Math.sin(t * 1.3) * g;
        L.core.mesh.visible = L.core.opacity > 0.01;

        // ---- The beings float, breathe like jellyfish and now and then turn their heads
        const kk = k();
        BEINGS.forEach((b, i) => {
            const being = L.beings[i];
            b.pop = Math.max(0, b.pop - dt * 1.6);
            b.glow = Math.max(0, b.glow - dt / Math.max(0.6, gap));
            const gl = ease(b.glow) + (i === hinted ? 0.6 * breathe : 0);
            const pop = Math.sin(Math.min(1, 1 - b.pop) * Math.PI) * b.pop;
            const pulse = Math.sin(t * (1 + 0.12 * i) + b.phase) * ramp;
            being.group.x = Math.sin(t * b.pace * 0.6 + b.phase * 1.3) * 7 * kk * ramp;
            being.group.y = (Math.sin(t * b.pace + b.phase) * 12 - 18 * pop) * kk * ramp;
            const side = i === 1 ? -1 : 1;
            being.group.rotate = (Math.sin(t * b.pace * 0.8 + b.phase) * 2.5 + side * 7 * turn(t, b.look, b.phase)) * ramp;
            being.body.sy = 1 + 0.03 * pulse + 0.08 * pop;
            being.body.sx = 1 - 0.015 * pulse + 0.05 * pop;
            being.aura.opacity = Math.min(1.3, 0.55 + 0.15 * pulse + 0.45 * pop + 0.6 * gl + 0.4 * pollen);
            being.aura.scale = 1 + 0.05 * pulse + 0.2 * pop + 0.18 * gl + 0.1 * pollen;
            being.body.uniforms.uBright.value = 1 + 0.18 * pop + 0.22 * gl + 0.12 * pollen;
        });
        // The little one blinks (now and then twice) and looks about
        const eyes = L.beings[2]?.eyes;
        if (eyes && !reduced) {
            if (t > blinkAt + 0.16) blinkAt = t + (Math.random() < 0.2 ? 0.3 : 2.6 + Math.random() * 3.4);
            const b = t >= blinkAt ? Math.sin(Math.min(1, (t - blinkAt) / 0.16) * Math.PI) : 0;
            eyes.sy = 1 - 0.85 * b;
            if (t > eyeMoveAt) { eyeAimTo = Math.random() < 0.4 ? 0 : (Math.random() < 0.5 ? -1 : 1); eyeMoveAt = t + 2 + Math.random() * 4; }
            eyeAim += (eyeAimTo - eyeAim) * Math.min(1, dt * 6);
            eyes.x = eyeAim * 5 * kk;
        }

        // ---- The canopy breathes: each layer turns very slightly about the middle, at its own pace
        L.back.group.rotate = Math.sin(t * 0.11) * 0.25 * ramp;
        L.trunks.group.rotate = Math.sin(t * 0.09 + 1) * 0.35 * ramp;
        L.front.group.rotate = Math.sin(t * 0.13 + 2) * 0.5 * ramp;
        L.front.group.scale = 1 + 0.006 * Math.sin(t * 0.17) * ramp;
        const sways = crowns(t, ramp);
        L.front.copies.forEach(({ img }) => { img.sways = sways; });
        L.back.node.y = scroll * 14;
        L.trunks.node.y = scroll * 22;
        L.front.node.y = scroll * 30;
        L.beingsNode.y = scroll * 10;

        // The particles that belong to a layer follow it
        const c = { x: sx(SIZE / 2), y: sy(SIZE / 2) };
        const far = stage.drift(zFor(DEPTH.far)), tr = stage.drift(L.trunks.node.z), be = stage.drift(L.beingsNode.z);
        dust?.shift(0, far.x, far.y + scroll * 8);
        dust?.turn(1, L.trunks.group.rotate, c.x, c.y);
        dust?.shift(1, tr.x, tr.y + L.trunks.node.y);
        farShift = { x: far.x, y: far.y + scroll * 8 };
        nearShift = { x: tr.x, y: tr.y + L.trunks.node.y };
        BEINGS.forEach((b, i) => {
            const g = L.beings[i].group;
            dust?.turn(2 + i, g.rotate, g.pivot.x, g.pivot.y);
            dust?.shift(2 + i, be.x + g.x, be.y + g.y + L.beingsNode.y);
        });
        dust?.shift(5, be.x, be.y + L.beingsNode.y);
        L.rulitoNode.y = L.beingsNode.y;
        stage.render(t);
        if (frames++ % 2 === 0) placeKeys();
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
        const pick = (i) => POLLEN[i % POLLEN.length];
        dust = startStardust(null, {
            stage,
            manual: true,
            groups: [
                // 0: the pollen of the far field, seen through the leaves
                { colors: POLLEN, parallax: 0, drift: 2.5, jitter: 0.3, twinkle: 0.5, reach: 90, push: 14, look: 'hard', order: after(L.light),
                    points: () => art.pollen.far.map(([x, y, r], i) => [sx(x), sy(y), Math.max(1.4, 2 * r * k()), pick(i)]) },
                // 1: the pollen on the bark and the leaves
                { colors: POLLEN, parallax: 0, drift: 1.6, jitter: 0.3, twinkle: 0.55, reach: 110, push: 18, look: 'hard', order: after(L.trunks.copies[2].img),
                    points: () => art.pollen.near.map(([x, y, r], i) => [sx(x), sy(y), Math.max(1.4, 2 * r * k()), pick(i + 1)]) },
                // 2, 3, 4: the stipple of each being's aura, alive
                ...BEINGS.map((b, i) => ({
                    colors: [b.aura], parallax: 0, drift: 1.2, jitter: 0.5, twinkle: 0.35, reach: 0, look: 'hard',
                    order: after(L.beings[i].aura), points: () => fromArt(b.dots, b.aura, 1.15),
                })),
                // 5: a few motes of pollen drifting in the opening
                { colors: [0xf0c873, 0xfff1c4], count: 26, size: [3, 7], look: 'soft', drift: 26, parallax: 0, twinkle: 0.7, reach: 120, push: 30, opacity: 0.8,
                    order: after(L.beings[2].body),
                    spawn: () => {
                        const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * 430 * k();
                        return [sx(SIZE / 2) + Math.cos(a) * d * 1.15, sy(1120) + Math.sin(a) * d];
                    } },
                // 6: the notes in the air and the pollen going to the beings
                { dynamic: flyers, look: 'soft', parallax: 0, drift: 1.5, twinkle: 0.2, reach: 0, bloom: true, order: after(L.rulito) + 1 },
                // 7: sparks
                { ...sparks.group(), order: after(L.rulito) + 2 },
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
    <div class="scene" ref="root" @click="touch">
        <canvas class="stageCanvas" ref="canvas"></canvas>
        <!-- The rulito is drawn on its own canvas, which the stage shows as a texture in the light -->
        <Rulito ref="rulito" class="offstage" color="#f9a8b0" />
        <!-- For the keyboard, one button per being and one for the light; the pointer goes to the scene itself -->
        <div v-for="(b, i) in BEINGS" :key="'key' + i" :ref="(el) => { keyHits[i] = el; }" class="key" role="button" tabindex="0"
            :aria-label="$i18n.locale === 'en' ? `${NAMES[i].en}: repeat the light's song` : `${NAMES[i].es}: repetí el canto de la luz`"
            @keydown="onKey($event, () => touchBeing(i))"></div>
        <div ref="lightHit" class="key" role="button" tabindex="0"
            :aria-label="$i18n.locale === 'en' ? 'The light: stay still and it sings' : 'La luz: quedate quieto y canta'"
            @keydown="onKey($event, touchLight)"></div>
    </div>
</template>

<style scoped>
    .scene {
        position: absolute;
        inset: 0;
        overflow: hidden;
        background: #037296;
    }

    .offstage {
        position: absolute;
        left: -9999px;
        top: 0;
        width: 40px;
        visibility: hidden;
    }

    /* The keyboard's buttons sit over the beings and the light; the pointer goes to the scene itself */
    .key {
        position: absolute;
        left: 0;
        top: 0;
        width: 0;
        height: 0;
        border-radius: 45%;
        pointer-events: none;
        outline: none;
    }

    .key:focus-visible {
        outline: 2px solid rgba(255, 251, 214, 0.95);
        outline-offset: 4px;
    }

    .stageCanvas {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        display: block;
        pointer-events: none;
    }
</style>
