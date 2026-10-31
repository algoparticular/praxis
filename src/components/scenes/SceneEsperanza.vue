<script setup>
    // Esperanza: hope, "I have hope in myself and in the assistance of the Universe". A starry night over the desert: a
    // big moon, half in shadow, hangs over sand dunes with white stones, tufts of grass, little mushrooms and two pink
    // ginkgos, and on the far ridge a little being (Vulpes, the heart) sits with its tail curled, wrapped in a pink aura,
    // looking up at the sky with its eyes closed.
    // Its verb is Ver: "the assistance of the universe with its invisible threads of light", "your ancestors are behind
    // you". Among the stars of the open sky some shine brighter: joining them with threads (dragging from one to another,
    // as in Pañña, with the threads of useThreads.js) shows an ancestor, a constellation in the shape of a being like the
    // little one on the dune (sitting, walking, resting). Not every bright star is in it: two are decoys. Seen, it
    // gathers itself, goes to stand behind the little one, smaller, and lets down a thread of light to it: the little one
    // looks up and its aura grows. With the three ancestors behind it, their threads shine together, its aura opens and
    // the rulito is born over its head; then they go back into the stars and it starts again (see
    // docs/verbos-y-dinamicas.md).
    // It is alive too: the stars twinkle and drift a little, the moon breathes in its own soft light, the grass,
    // the mushrooms and the ginkgos sway in the wind (each tuft on its own), grains of sand blow low over the dunes, the
    // being breathes (its curled tail swells) and now and then lifts its head to the moon and looks about, and its aura
    // breathes with it. A touch strums the chord (`star`) and the stars flare; a touch on the being makes it look up and
    // its aura flare.
    // The sky is not a picture: its flat teal, read from the card by the converter, is the background, with a light
    // round the moon drawn in code; every star is a particle (the card's, and as many again where the frame does not
    // reach), and so are the stipple of the moon's shadow and the being's aura. It is drawn in WebGL (useLayerStage): the
    // moon and the land are planes at their depths; beyond the frame the land goes on (mirrored on each side, without
    // its grass and plants). From esperanzaScene.json and public/assets/esperanza (made by scripts/convert-esperanza.mjs).
    // The card's rulito (the little squiggle in the sky) is not drawn: the game draws its own over the little one, so it
    // is seen on a phone too.
    import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { createParallax } from '../../composables/useParallax.js';
    import { createLayerStage } from '../../composables/useLayerStage.js';
    import { startStardust } from '../../composables/useStardust.js';
    import { createThreads, rgbOf, smooth } from '../../composables/useThreads.js';
    import { play } from '../../composables/useSound.js';
    import { sceneMilestone } from '../../analytics.js';
    import Rulito from '../Rulito.vue';
    import art from '../../composables/esperanzaScene.json';

    const props = defineProps({
        card: { type: Object, default: () => ({}) },
        active: Boolean
    });

    const root = ref(null);
    const canvas = ref(null);
    const beingHit = ref(null);
    const rulito = ref(null);
    const starHits = [];                    // the bright stars' touch targets, by index
    const setStarHit = (i) => (el) => { starHits[i] = el; };
    let stage = null;
    let stageEl = null;
    const NAME_GLOW = '0.8';
    let parallax = null;
    let dust = null;
    let game = null;
    let entered = false;
    let gone = false;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ---- Layout: the illustration is a 2160 square resting on the bottom of the screen. On a phone upright it is as big
    // as the left ginkgo and the stones by the being allow across, centred between them; on a wide screen the land goes
    // on past the frame on both sides
    const SIZE = art.size;
    const B = art.boxes;
    let F = { x: 0, y: 0, size: 1 };
    let W = 1, H = 1;
    const k = () => F.size / SIZE;
    const sx = (x) => F.x + x * k();
    const sy = (y) => F.y + y * k();
    const rectOf = ([left, top, w, h]) => ({ left: sx(left), top: sy(top), w: w * k(), h: h * k() });
    const SPAN = 1640, FOCUS = 900;         // art px across that must be seen on a phone, and their middle
    const DROP = 0.08;                      // how much of the frame goes under the bottom of a wide screen
    const layout = (w, h) => {
        W = w; H = h;
        const phone = w < h;
        const size = phone ? Math.min(0.72 * h, w * SIZE / SPAN) : Math.min(Math.max(0.62 * w, 0.55 * h), 0.92 * h);
        let x = w / 2 - size / 2;
        if (phone && size > w) x = Math.min(0, Math.max(w - size, w / 2 - FOCUS * size / SIZE));
        F = { x, y: h - size + (phone ? 0 : DROP * size), size };
    };

    const SLIDE = 50;
    const SLIDE_Y = 30;
    const zFor = (amp) => amp / (SLIDE + amp);
    const DEPTH = { stars: 4, moon: 9, land: 22 };

    const STAR = 0xfed989;
    const INK = 0x322e08;
    const PINK = 0xfb777b;
    const SAND = [0xfed989, 0xfff1c9, 0xe9c98a];
    const MOON = art.moon;

    // ---- The grass and the mushrooms: cut out of the illustration (one atlas), each swaying on its own
    const [AW, AH] = art.atlas;
    const EDGE_GAP = 360;                   // art px: tufts nearer the edge than this are not mirrored beyond it
    const SEAM_TUFT = 2;                    // the tall tuft (it is not cut by any line) that hides the V on the right edge
    const SEAM_Y = 1690;                    // art px: where the outline of the dune meets the right edge
    const tufts = art.tufts.map(([x, y, w, h, ax, ay]) => ({ box: [x, y, w, h], crop: [ax / AW, ay / AH, w / AW, h / AH], mushroom: w < 100 && h < 70 }));

    // ---- The being: its head leans about the middle of its face, its curled tail swells as it breathes (fractions of
    // its picture, from its top left)
    const HEAD = [0.36, 0.3, 0.42];
    const TAIL = [0.68, 0.74, 0.34];
    const LOOK = 13;                        // every LOOK s it lifts its head to the moon for a moment
    let lookUp = 0;                         // a touch makes it look up at once (0..1, fading)
    let lastT = 0;
    const L = {};

    const strum = () => {
        if (performance.now() - dragEnded < 400) return;      // the click that ends a thread is not a touch on the sky
        play('star');
        dust?.boost(0, 0.9);
        dust?.boost(2, 0.3);
    };

    // ---- Ver: the ancestors in the stars
    // Each ancestor is a constellation in the shape of a being like the little one: its stars (in a box of its own, x
    // across and y down, 0..1 of its width), the threads that draw it, and two decoys, bright stars that are not in it.
    // Where it goes to stand once seen is a spot behind the little one (art px, and its width there).
    const loop = (n) => Array.from({ length: n }, (_, i) => [i, (i + 1) % n]);
    const FIGURES = [
        // sitting as the little one does: snout to the left, two pointed ears, its tail curled under it
        { name: 'sitting', aspect: 1, stars: [[0, 0.3], [0.3, 0], [0.43, 0.2], [0.6, 0.02], [0.6, 0.56], [1, 0.84], [0.32, 1]],
            links: loop(7), decoys: [[0.92, 0.22], [0.08, 0.74]], rest: [1180, 1110, 170] },
        // walking: snout to the right, an ear up, its tail raised behind it
        { name: 'walking', aspect: 0.8, stars: [[0, 0], [0.26, 0.5], [0.5, 1], [0.78, 0.62], [1, 0.38], [0.84, 0]],
            links: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 1]], decoys: [[0.44, 0.08], [0.98, 0.96]], rest: [1630, 1110, 170] },
        // resting, the eldest: lying long, its head raised on the left and its tail along its back
        { name: 'resting', aspect: 0.62, stars: [[0, 0.42], [0.16, 0.02], [0.34, 0.3], [0.72, 0.36], [1, 0.08], [0.6, 0.94]],
            links: loop(6), decoys: [[0.52, 0], [0.16, 0.95]], rest: [1430, 910, 210] },
    ];
    const MAX_LINKS = 7;                    // the most threads (and stars) a figure has
    const GUIDES = 9;                       // the bright stars of a figure: its own and its decoys
    // The threads' slots: 0 follows the finger, then the threads joined, those being undone, the ghost of the figure,
    // the threads of the ancestors already seen and, last, the thread each lets down to the little one
    const S_LINK = 1, S_CUT = S_LINK + MAX_LINKS, S_GHOST = S_CUT + MAX_LINKS, S_SEEN = S_GHOST + MAX_LINKS;
    const S_DOWN = S_SEEN + FIGURES.length * MAX_LINKS;
    const SLOTS = S_DOWN + FIGURES.length;
    const threads = createThreads({ slots: SLOTS });
    const EXTRA = GUIDES + FIGURES.length * MAX_LINKS;    // points after the threads: the bright stars, and the seen ones'
    const STAR_RGB = rgbOf(0xfff1c9), GOLD_RGB = rgbOf(STAR), PINK_RGB = rgbOf(PINK);
    const HEAD_AT = [1306, 1268];           // art px: the top of the little one's head, where the threads come down
    const SEEN_AFTER = 1.4;                 // s from seeing an ancestor until it goes to stand behind the little one
    const MOVE = 2.4, DOWN = 1.3;           // s it takes to get there, and its thread to come down

    let current = 0;                        // the ancestor to see now
    let found = 0;                          // ancestors seen, for the analytics
    let gathered = 0;
    const seenOnes = [];                    // { fig, at, from: the stars where it was seen, arrived }
    const links = [];                       // { a, b, born }: the threads the person has joined (indices of the guides)
    const cut = [];                         // { a, b, at }: threads undone, drawing themselves back into their star
    const CUT_LEN = 0.9;
    let parting = false;                    // the threads of a try that was not the figure are going out
    let linksOut = false;
    let linksFade = 1;
    let drag = null;                        // { from, x, y, startX, startY, moved, snap }
    let dragEnded = 0;
    let kbFrom = -1;
    let idle = 0;
    let ghost = null;                       // { age }: the figure drawing itself, faint, after a while without touching
    let ghostIn = 0;
    const GHOST_LEN = 3.6;
    let guidesIn = 0;                       // 0..1: the bright stars of the figure to see, coming out
    let together = null;                    // { age, opened }: the three ancestors' threads shine together
    let win = null;                         // the rulito: { head, tail, full, fullAt, back, pop }
    let leaving = 0;                        // 0..1: the ancestors going back into the stars after the rulito
    let skyShift = [0, 0];                  // how far the stars (and so the threads) are moved by the camera
    let unit = 1;
    let auraGrow = 0;                       // how much the little one's aura has grown with the ancestors behind it
    const timers = [];

    // The sky where the ancestor to see is drawn, in px of the screen: on a phone upright, the open sky above the moon;
    // on a wide screen, the sky to the right of the moon, over the little one. Never under the card's name
    const titleRect = () => {
        const title = stageEl?.querySelector('h1');
        if (!title || !root.value) return { bottom: 0.14 * H };
        const r = title.getBoundingClientRect(), area = root.value.getBoundingClientRect();
        return { bottom: r.bottom - area.top };
    };
    let area = { left: 0, top: 0, w: 1, h: 1 };
    const measureArea = () => {
        const top = Math.max(titleRect().bottom + 24, 0.06 * H);
        if (W < H) {
            const bottom = Math.max(top + 120, sy(MOON.y - MOON.r) - 22);
            area = { left: 0.08 * W, top, w: 0.84 * W, h: bottom - top };
        } else {
            const left = sx(MOON.x + MOON.r) + 30, t = Math.max(top, sy(120)), bottom = Math.max(t + 120, sy(780));
            area = { left, top: t, w: Math.max(120, Math.min(W - 30 - left, 1.4 * (bottom - t))), h: bottom - t };
        }
    };
    // A figure's star (0..1 of its box) in the sky where it is seen, or where it stands once seen
    const inArea = (fig, [u, v]) => {
        const size = 0.88 * Math.min(area.w, area.h / fig.aspect);
        return [area.left + (area.w - size) / 2 + u * size, area.top + (area.h - size * fig.aspect) / 2 + v * size * fig.aspect];
    };
    const atRest = (fig, [u, v]) => {
        const [x, y, width] = fig.rest;
        const size = Math.max(54, width * k());
        return [sx(x) + (u - 0.5) * size, sy(y) + (v - 0.5) * size * fig.aspect];
    };
    // The bright stars of the figure to see (its own, then the decoys), each breathing a little in place
    const guideSpots = (t = lastT) => {
        const fig = FIGURES[current];
        return [...fig.stars, ...fig.decoys].map((p, i) => {
            const [x, y] = inArea(fig, p);
            return [x + Math.sin(t * 0.4 + i * 1.7) * 2.5, y + Math.cos(t * 0.33 + i * 2.3) * 2.5];
        });
    };
    // How high each bright star sounds (0..1) in the card's chord: the higher in the sky, the higher
    const pitchOf = (i) => {
        const fig = FIGURES[current];
        return 1 - [...fig.stars, ...fig.decoys][i][1];
    };
    const own = (i) => i < FIGURES[current].stars.length;
    const inFigure = ({ a, b }) => FIGURES[current].links.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
    const joined = (a, b) => links.some((l) => (l.a === a && l.b === b) || (l.a === b && l.b === a));
    const playing = () => !reduced && entered && !parting && !together && !win && leaving === 0 && guidesIn > 0.5
        && !seenOnes.some((s) => !s.arrived);

    // Where the little one's head is now, on the threads' canvas
    const headSpot = () => {
        const b = L.being.boxOnScreen(rectOf(B.being));
        const fx = (HEAD_AT[0] - B.being[0]) / B.being[2], fy = (HEAD_AT[1] - B.being[1]) / B.being[3];
        return [b.left + fx * b.width - skyShift[0], b.top + fy * b.height - skyShift[1]];
    };
    // The rulito is born over the little one's head (it goes with the land)
    let glyph = { left: 0, top: 0, w: 1, h: 1 };

    // A bright star flares: the stars round it and the little one's aura answer a little
    const flareStar = () => { dust?.boost(0, 0.35); };

    const join = (a, b) => {
        if (!playing() || a === b) return;
        if (joined(a, b)) return undo(a, b);
        if (links.length >= MAX_LINKS) return;
        const link = { a, b, born: lastT };
        links.push(link);
        idle = 0;
        threads.surge = Math.max(threads.surge, 0.5);
        flareStar();
        play('link', { from: pitchOf(a), to: pitchOf(b), level: inFigure(link) ? 1 : 0.45 });
        const fig = FIGURES[current];
        if (links.length === fig.links.length) {
            if (fig.links.every(([x, y]) => joined(x, y))) seen();
            else unravel();
        }
    };
    // Joining two stars that are already joined undoes that thread: it draws itself back into the star it left
    const undo = (a, b) => {
        const k2 = links.findIndex((l) => (l.a === a && l.b === b) || (l.a === b && l.b === a));
        const [link] = links.splice(k2, 1);
        cut.push({ ...link, at: lastT });
        idle = 0;
        play('link', { from: pitchOf(link.b), to: pitchOf(link.a), level: 0.3 });
    };
    // As many threads as the figure has, but not the figure: they go out softly and it starts again, the same ancestor
    const unravel = () => {
        parting = true;
        sceneMilestone('pattern_reset', { figure: FIGURES[current].name });
        timers.push(setTimeout(() => { linksOut = true; play('unravel'); }, 1100));
        timers.push(setTimeout(() => { links.length = 0; linksOut = false; parting = false; idle = 0; }, 3200));
    };
    // The ancestor is seen: its threads rush and shine, and after a moment it goes to stand behind the little one
    const seen = () => {
        const fig = FIGURES[current];
        found += 1;
        sceneMilestone('pattern_seen', { times: found, figure: fig.name });
        seenOnes.push({ fig, at: lastT, arrived: false, from: fig.stars.map((p) => inArea(fig, p)) });
        links.length = 0;
        cut.length = 0;
        ghost = null;
        threads.surge = 1;
        dust?.boost(0, 1.2);
        play('converge');
        current = (current + 1) % FIGURES.length;
        guidesIn = 0;
        idle = 0;
    };
    // Its thread has reached the little one: it looks up, its aura grows; with the three, they shine together
    const arrived = (one) => {
        one.arrived = true;
        lookUp = 1;
        dust?.boost(2, 1);
        play('link', { from: 0.85, to: 0.2, level: 0.8 });
        if (seenOnes.length === FIGURES.length) {
            together = { age: 0, opened: false };
            play('converge');
        }
    };
    // The three together: their threads flow fast to the little one, its aura opens and the rulito is born over its head
    const GROW = 2.6, LINGER = 2.4, EAT = 3.4, OPEN_AT = 1.6;
    const gather = (dt) => {
        if (together) {
            together.age += dt;
            if (!together.opened && together.age > OPEN_AT) {
                together.opened = true;
                gathered += 1;
                sceneMilestone('ancestors_gathered', { times: gathered });
                lookUp = 1;
                threads.surge = 1;
                dust?.boost(2, 2);
                dust?.boost(0, 1.4);
                play('open');
                win = { head: 0, tail: 0, full: false, fullAt: 0, back: false, pop: 0, age: 0 };
                rulito.value?.reshape();
            }
        }
        if (!win || !rulito.value) return;
        win.age += dt;
        win.pop = Math.max(0, win.pop - dt * 2.2);
        if (win.age > 0.4 && win.head < 1) win.head = 1 - (1 - Math.min(1, (win.age - 0.4) / GROW)) ** 1.6;
        if (win.head >= 1 && !win.full) {
            win.full = true;
            win.fullAt = win.age;
            win.pop = 1;
            lookUp = 1;
            dust?.boost(2, 1.4);
            play('rulito');
        }
        if (win.full && !win.back && win.age - win.fullAt > LINGER) { win.back = true; together = null; }
        if (win.back) {
            win.tail = Math.min(win.head, win.tail + dt / EAT);
            leaving = Math.min(1, leaving + dt / EAT);
        }
        const whole = Math.min(1, Math.max(0, (win.head - win.tail - 0.6) / 0.4));
        const named = Math.max(win.pop, 0.8 * whole * whole * (3 - 2 * whole));
        stageEl?.style.setProperty('--name-glow', Math.max(Number(NAME_GLOW), named).toFixed(3));
        if (stage) stage.bloom = named;
        const glow = win.full && win.head - win.tail > 0.9 ? Math.max(win.pop, Math.sin(lastT * 4) * 0.5 + 0.5) : 0;
        rulito.value.frame({ head: win.head, tail: win.tail, flare: glow, t: lastT, fade: Math.min(1, (win.head - win.tail) * 14), width: glyph.w });
        L.rulito.refresh();
        L.rulito.rotate = Math.sin(lastT * 1.8) * 3;
        L.rulito.scale = 1 + 0.2 * win.pop * win.pop;
        if (win.back && win.tail >= win.head) {
            // Gone: the ancestors go back into the stars and the first one shines again among them
            win = null;
            rulito.value.frame({ width: glyph.w });
            L.rulito.refresh();
            if (stage) stage.bloom = 0;
            stageEl?.style.setProperty('--name-glow', NAME_GLOW);
            seenOnes.length = 0;
            leaving = 0;
            current = 0;
            guidesIn = 0;
            idle = 0;
        }
    };

    // No words: after 7 s without touching anything the ancestor draws itself, faint, and goes; again 7 s after
    const hint = (dt) => {
        if (ghost) {
            ghost.age += dt;
            if (ghost.age > GHOST_LEN) ghost = null;
        }
        if (!playing() || drag) return;
        idle += dt;
        ghostIn -= dt;
        if (!ghost && idle > 7 && ghostIn <= 0) {
            ghost = { age: 0 };
            ghostIn = GHOST_LEN + 7;
        }
    };

    // The threads, the bright stars and the ancestors, all one group of particles in the sky
    const ease = (p) => p * p * (3 - 2 * p);
    const lerp = ([ax, ay], [bx, by], u) => [ax + (bx - ax) * u, ay + (by - ay) * u];
    const sky = {
        count: threads.count + EXTRA,
        update(t, data) {
            const dt = Math.min(0.1, Math.max(0, t - skyT));
            skyT = t;
            if (!L.being || reduced) { data.alphas.fill(0); return; }
            threads.surge = Math.max(0, threads.surge - dt * 0.35);
            threads.tick(dt, 1 + threads.surge * 3 + (together ? 4 : 0));
            linksFade += ((linksOut ? 0 : 1) - linksFade) * Math.min(1, dt * 2);
            const ready = !seenOnes.some((s) => !s.arrived) && !together && !win;
            guidesIn = Math.min(1, Math.max(0, guidesIn + (ready && entered ? dt / 1.6 : -dt * 2)));
            threads.begin();
            lights.length = 0;
            const spots = guideSpots(t);
            const fig = FIGURES[current];
            const tint = (i) => (own(i) ? GOLD_RGB : STAR_RGB);
            const opts = (extra = {}) => ({ unit, widest: 13, ...extra });

            // The threads the person has joined, each growing out of the star it left, and those being undone
            for (let s = 0; s < MAX_LINKS; s++) {
                const link = links[s];
                if (!link) { threads.hide(S_LINK + s, data); continue; }
                threads.draw(S_LINK + s, data, t, spots[link.a], spots[link.b], [tint(link.a), tint(link.b)],
                    opts({ strength: (inFigure(link) ? 0.95 : 0.4) * linksFade, grow: smooth(0, 1, smooth(0, 0.9, t - link.born)) }));
            }
            for (let k2 = cut.length - 1; k2 >= 0; k2--) if (t - cut[k2].at > CUT_LEN) cut.splice(k2, 1);
            for (let s = 0; s < MAX_LINKS; s++) {
                const link = cut[s];
                if (!link) { threads.hide(S_CUT + s, data); continue; }
                const grow = 1 - smooth(0, CUT_LEN, t - link.at);
                threads.draw(S_CUT + s, data, t, spots[link.a], spots[link.b], [tint(link.a), tint(link.b)],
                    opts({ strength: (inFigure(link) ? 0.95 : 0.4) * grow, grow }));
            }
            // The ghost of the ancestor: its threads not joined yet draw themselves one after another, faint, and go
            const ghosts = ghost ? fig.links.filter(([a, b]) => !joined(a, b)) : [];
            for (let s = 0; s < MAX_LINKS; s++) {
                const pair = ghosts[s];
                if (!pair) { threads.hide(S_GHOST + s, data); continue; }
                const fade = smooth(0, 0.6, ghost.age) * smooth(0, 0.8, GHOST_LEN - ghost.age);
                threads.draw(S_GHOST + s, data, t, spots[pair[0]], spots[pair[1]], [GOLD_RGB, GOLD_RGB],
                    opts({ strength: 0.5 * fade * guidesIn, grow: smooth(0, 1, smooth(0, 0.9, ghost.age - s * 0.2)) }));
            }
            // The thread that follows the finger, locking on to a star near enough
            if (drag && drag.moved) {
                const snapped = drag.snap >= 0;
                threads.draw(0, data, t, spots[drag.from], snapped ? spots[drag.snap] : [drag.x - skyShift[0], drag.y - skyShift[1]],
                    [tint(drag.from), tint(snapped ? drag.snap : drag.from)], opts({ strength: snapped ? 0.9 : 0.6 }));
            } else threads.hide(0, data);

            // The ancestors seen: they shine a moment where they were seen, then go to stand behind the little one,
            // smaller, and let a thread down to it; with the three it shines and flows fast; after the rulito they go
            const head = headSpot();
            const fadeOut = 1 - ease(leaving);
            let p = threads.count + GUIDES;
            for (let f = 0; f < FIGURES.length; f++) {
                const one = seenOnes[f];
                for (let s = 0; s < MAX_LINKS; s++) if (!one || !one.fig.links[s]) threads.hide(S_SEEN + f * MAX_LINKS + s, data);
                if (!one) {
                    threads.hide(S_DOWN + f, data);
                    data.alphas.fill(0, p, p + MAX_LINKS);
                    p += MAX_LINKS;
                    continue;
                }
                const age = t - one.at;
                const move = ease(Math.min(1, Math.max(0, (age - SEEN_AFTER) / MOVE)));
                const stars = one.fig.stars.map((q, i) => lerp(one.from[i], atRest(one.fig, q), move));
                const small = 1 - 0.45 * move;
                const bright = (age < SEEN_AFTER ? 1 : 0.55 + 0.45 * (1 - move)) + (together ? 0.35 : 0);
                one.fig.links.forEach(([a, b], s) => threads.draw(S_SEEN + f * MAX_LINKS + s, data, t, stars[a], stars[b], [GOLD_RGB, GOLD_RGB],
                    { unit: unit * small, widest: 11, strength: Math.min(1, bright) * fadeOut }));
                stars.forEach(([x, y], i) => {
                    data.positions[p * 3] = x;
                    data.positions[p * 3 + 1] = y;
                    data.sizes[p] = (7.5 + 1.5 * Math.sin(t * 1.4 + i)) * unit * small;
                    data.alphas[p] = fadeOut;
                    data.tints.set(STAR_RGB, p * 3);
                    lights.push([x, y, 26 * unit * small, 0.45 * fadeOut * Math.min(1, bright), GOLD_RGB]);
                    p += 1;
                });
                data.alphas.fill(0, p, p + MAX_LINKS - stars.length);
                p += MAX_LINKS - stars.length;
                // Its thread down to the little one, from its lowest star
                const down = Math.min(1, Math.max(0, (age - SEEN_AFTER - MOVE) / DOWN));
                if (down > 0) {
                    if (!one.arrived && down >= 1) arrived(one);
                    const from = stars.reduce((low, q) => (q[1] > low[1] ? q : low), stars[0]);
                    threads.draw(S_DOWN + f, data, t, from, head, [GOLD_RGB, PINK_RGB],
                        { unit: unit * 0.8, widest: 9, strength: (together ? 0.95 : 0.5) * fadeOut, grow: ease(down) });
                } else threads.hide(S_DOWN + f, data);
            }

            // The bright stars of the ancestor to see: its own a warm gold, the decoys a paler cream, the joined ones bigger
            const shown = guidesIn * (reduced ? 0 : 1);
            spots.forEach(([x, y], i) => {
                const g = threads.count + i;
                const lit = links.some((l) => l.a === i || l.b === i) || drag?.from === i || drag?.snap === i || kbFrom === i;
                data.positions[g * 3] = x;
                data.positions[g * 3 + 1] = y;
                data.sizes[g] = (8 + 2.2 * Math.sin(t * 1.7 + i * 2.1) + (lit ? 4 : 0) + 3 * threads.surge) * unit;
                data.alphas[g] = shown * (0.85 + 0.15 * Math.sin(t * 2.3 + i));
                data.tints.set(own(i) ? GOLD_RGB : STAR_RGB, g * 3);
                lights.push([x, y, (34 + 6 * Math.sin(t * 1.1 + i * 1.3) + (lit ? 14 : 0)) * unit, shown * (lit ? 0.6 : 0.42), own(i) ? GOLD_RGB : STAR_RGB]);
            });
            for (let i = spots.length; i < GUIDES; i++) data.alphas[threads.count + i] = 0;
        },
    };
    let skyT = 0;
    // A soft halo round every bright star and every star of an ancestor, so they stand out from the sky's own
    const lights = [];
    const halos = {
        count: GUIDES + FIGURES.length * MAX_LINKS,
        update(t, data) {
            data.alphas.fill(0);
            lights.forEach(([x, y, size, alpha, rgb], i) => {
                data.positions[i * 3] = x;
                data.positions[i * 3 + 1] = y;
                data.sizes[i] = size;
                data.alphas[i] = alpha;
                data.tints.set(rgb, i * 3);
            });
        },
    };

    // Dragging from a bright star: the thread follows the finger until it is let go near another one
    const toCanvas = (event) => {
        const box = canvas.value.getBoundingClientRect();
        return [event.clientX - box.left, event.clientY - box.top];
    };
    const starNear = (x, y, skip) => {
        let best = -1;
        let bestDistance = Math.max(36, 0.09 * Math.min(area.w, area.h));
        guideSpots().forEach(([gx, gy], i) => {
            const distance = Math.hypot(gx + skyShift[0] - x, gy + skyShift[1] - y);
            if (i !== skip && distance < bestDistance) { best = i; bestDistance = distance; }
        });
        return best;
    };
    const dragMove = (event) => {
        if (!drag) return;
        [drag.x, drag.y] = toCanvas(event);
        if (!drag.moved && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 10) drag.moved = true;
        if (drag.moved) drag.snap = starNear(drag.x, drag.y, drag.from);
    };
    const stopDrag = () => {
        window.removeEventListener('pointermove', dragMove);
        window.removeEventListener('pointerup', dragUp);
        window.removeEventListener('pointercancel', dragCancel);
    };
    const dragUp = () => {
        const done = drag;
        drag = null;
        stopDrag();
        dragEnded = performance.now();
        if (!done) return;
        if (!done.moved) { play('star'); dust?.boost(0, 0.5); }       // a tap on a bright star: it twinkles, as the sky does
        else if (done.snap >= 0) join(done.from, done.snap);
    };
    const dragCancel = () => { drag = null; stopDrag(); };
    const pressStar = (i, event) => {
        idle = 0;
        if (ghost) ghost.age = Math.max(ghost.age, GHOST_LEN - 0.5);
        if (!playing()) return;
        const [x, y] = toCanvas(event);
        drag = { from: i, x, y, startX: event.clientX, startY: event.clientY, moved: false, snap: -1 };
        window.addEventListener('pointermove', dragMove);
        window.addEventListener('pointerup', dragUp);
        window.addEventListener('pointercancel', dragCancel);
    };
    // With the keyboard: Enter on a star picks it, Enter on another joins them, Enter again on the same lets it go
    const keyStar = (i, event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        idle = 0;
        if (kbFrom >= 0 && kbFrom !== i) { join(kbFrom, i); kbFrom = -1; return; }
        kbFrom = kbFrom === i ? -1 : i;
        play('star');
    };
    const placeStarHits = () => {
        const on = playing();
        const spots = on ? guideSpots() : [];
        const size = Math.max(44, 0.12 * Math.min(area.w, area.h));
        for (let i = 0; i < GUIDES; i++) {
            const el = starHits[i];
            if (!el) continue;
            if (!spots[i]) { el.style.display = 'none'; continue; }
            el.style.display = '';
            el.style.translate = `${(spots[i][0] + skyShift[0] - size / 2).toFixed(1)}px ${(spots[i][1] + skyShift[1] - size / 2).toFixed(1)}px`;
            el.style.width = el.style.height = `${size.toFixed(1)}px`;
        }
    };
    const starLabel = (i, locale) => (locale === 'en' ? `Bright star ${i + 1}` : `Estrella brillante ${i + 1}`);
    const touchBeing = () => {
        lookUp = 1;
        play('star');
        dust?.boost(2, 0.45);
        dust?.boost(0, 0.5);
    };
    const onKey = (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        touchBeing();
    };

    const build = (s) => {
        // The moon: its light (code), its picture and, among the layers, the stipple of its shadow as particles
        const moon = s.depth(zFor(DEPTH.moon));
        L.moonNode = moon;
        L.moonGlow = moon.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: 0xfffbe8, stops: [[0, 0.32], [0.3, 0.14], [0.62, 0]], bloom: true });
        L.moon = moon.image('/assets/esperanza/moon.webp');
        moon.enter({ y: 50, delay: 150, duration: 2400 });
        // The land, going on past the frame (mirrored on each side), with its grass, its ginkgos and the being
        const land = s.depth(zFor(DEPTH.land));
        L.landNode = land;
        L.land = [-1, 0, 1].map((side) => {
            const node = land.image(side ? '/assets/esperanza/sides.webp' : '/assets/esperanza/land.webp');
            if (side) node.sx = -1;
            return { node, side };
        });
        // Every tuft in the frame and, mirrored, on the land beyond it (but those near the edge, which would be seen twice
        // side by side); and one tall tuft on the right edge, where the dune and its mirror meet in a V
        const tuft = (tf) => land.image('/assets/esperanza/tufts.webp', {
            crop: tf.crop, wind: tf.mushroom ? { amp: 0.8, speed: 0.7, root: 'bottom' } : { amp: 2.4, speed: 0.9, root: 'bottom' },
        });
        L.tufts = tufts.map(tuft);
        L.sideTufts = [-1, 1].flatMap((side) => tufts.map((tf, i) => ({ side, i, tf }))
            .filter(({ side: d, tf: { box: [x, , w] } }) => (d < 0 ? x : SIZE - x - w) > EDGE_GAP)
            .map(({ i }) => {
                const node = tuft(tufts[i]);
                node.sx = -1;
                return { node, side, i };
            }));
        L.seamTuft = tuft(tufts[SEAM_TUFT]);
        L.ginkgos = ['ginkgo0', 'ginkgo1'].map((name) => land.image(`/assets/esperanza/${name}.webp`, { wind: { amp: 3, speed: 0.6, root: 'bottom' } }));
        L.aura = land.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: PINK, stops: [[0, 0.45], [0.35, 0.2], [0.68, 0]], bloom: true });
        L.being = land.image('/assets/esperanza/being.webp', { sway: true });
        L.rulito = land.canvas(rulito.value.canvas, { bloom: true });
        land.enter({ y: 40, delay: 100, duration: 1700 });
    };

    const place = (w, h) => {
        layout(w, h);
        const mr = MOON.r * k();
        const mg = mr * 3.4;
        L.moonGlow.place({ left: sx(MOON.x) - mg / 2, top: sy(MOON.y) - mg / 2, w: mg, h: mg });
        L.moon.place(rectOf(B.moon), { x: sx(MOON.x), y: sy(MOON.y) });

        // The land, mirrored beyond the frame on each side (overlapping by a px, so no hair of sky shows between them)
        const land = rectOf(B.land);
        L.land.forEach(({ node, side }) => node.place({ ...land, left: land.left + side * (land.w - 1) }));
        tufts.forEach((tf, i) => {
            const r = rectOf(tf.box);
            L.tufts[i].place(r, { x: r.left + r.w / 2, y: r.top + r.h });
        });
        L.sideTufts.forEach(({ node, side, i }) => {
            const r = rectOf(tufts[i].box);
            const left = side < 0 ? 2 * land.left - r.left - r.w : 2 * (land.left + land.w) - r.left - r.w;
            node.place({ ...r, left }, { x: left + r.w / 2, y: r.top + r.h });
        });
        const st = rectOf(tufts[SEAM_TUFT].box);
        const seam = { left: land.left + land.w - st.w / 2, top: sy(SEAM_Y) - st.h, w: st.w, h: st.h };
        L.seamTuft.place(seam, { x: seam.left + seam.w / 2, y: seam.top + seam.h });
        ['ginkgo0', 'ginkgo1'].forEach((name, i) => {
            const r = rectOf(B[name]);
            L.ginkgos[i].place(r, { x: r.left + r.w / 2, y: r.top + r.h });
        });
        const b = rectOf(B.being);
        L.being.place(b, { x: b.left + b.w * 0.5, y: b.top + b.h * 0.85 });
        const ad = b.w * 1.9;
        L.aura.place({ left: b.left + b.w * 0.5 - ad / 2, top: b.top + b.h * 0.45 - ad / 2, w: ad, h: ad });

        // The rulito over its head (as tall as the rulito's own shape is for its width), and the sky of the game
        const gw = Math.max(16, 64 * k()), gh = gw * 86 / 32;
        glyph = { left: sx(HEAD_AT[0]) - gw / 2, top: sy(HEAD_AT[1] - 40) - gh, w: gw, h: gh };
        rulito.value.frame({ width: glyph.w });
        L.rulito.place({ left: glyph.left - 0.4375 * glyph.w, top: glyph.top - 0.1628 * glyph.h, w: glyph.w * 1.875, h: glyph.h * 1.3256 },
            { x: glyph.left + glyph.w / 2, y: glyph.top + glyph.h });
        L.rulito.refresh();
        measureArea();
        unit = Math.max(0.8, Math.min(1.3, Math.min(area.w, area.h) / 300));
    };

    // The touch target: the being
    const placeHits = () => {
        if (!L.being || !beingHit.value) return;
        const b = L.being.boxOnScreen(rectOf(B.being));
        const bw = Math.max(64, b.width), bh = Math.max(64, b.height);
        beingHit.value.style.translate = `${(b.left + b.width / 2 - bw / 2).toFixed(1)}px ${(b.top + b.height / 2 - bh / 2).toFixed(1)}px`;
        beingHit.value.style.width = `${bw.toFixed(1)}px`;
        beingHit.value.style.height = `${bh.toFixed(1)}px`;
    };

    const enter = () => {
        if (entered || !props.active || !stage) return;
        entered = true;
        stage.ready().then(() => { if (!gone) { stage.start(); dust?.reveal(); } });
    };

    // Now and then the being lifts its head to the moon (0..1, eased in and out), and looks about in between
    const gaze = (t) => {
        const p = (Math.max(0, t - 4) % LOOK) / 3.2;
        return p < 1 ? Math.sin(p * Math.PI) ** 2 : 0;
    };

    let frames = 0;
    const frame = ({ x, y, scroll, t, ramp }) => {
        if (!stage || !L.being) return;
        const dt = Math.min(0.1, Math.max(0, t - lastT));
        lastT = t;
        stage.look(x * SLIDE, y * SLIDE_Y);

        // ---- The moon breathes in its light
        const breath = Math.sin(t * 0.5);
        L.moonGlow.opacity = 0.8 + 0.2 * breath * ramp;
        L.moonGlow.scale = 1 + 0.05 * breath * ramp;
        L.moon.scale = 1 + 0.006 * breath * ramp;
        L.moonNode.y = scroll * 12 + Math.sin(t * 0.23) * 3 * ramp;
        L.landNode.y = scroll * 22;

        // ---- The being breathes; it lifts its head to the moon now and then (or when touched) and looks about
        lookUp = Math.max(0, lookUp - dt * 0.45);
        const up = reduced ? 0 : Math.max(gaze(t), Math.sin(Math.min(1, lookUp) * Math.PI / 2));
        const about = Math.sin(t * 0.31) * 0.6 + Math.sin(t * 0.53 + 1) * 0.4;
        const inhale = Math.sin(t * 1.1);
        L.being.sways = reduced ? [] : [
            [HEAD[0], HEAD[1], HEAD[2], (7 * up + 3 * about * (1 - up)) * ramp, 1 + 0.03 * up * ramp],
            [TAIL[0], TAIL[1], TAIL[2], 0, 1 + 0.035 * inhale * ramp],
        ];
        L.being.sy = 1 + 0.01 * inhale * ramp;
        // Its aura grows with every ancestor behind it, and opens when the three shine together
        const behind = seenOnes.filter((s) => s.arrived).length / FIGURES.length;
        auraGrow += ((together || win ? 1.4 : behind) * (1 - leaving) - auraGrow) * Math.min(1, dt * 1.5);
        const pulse = 0.5 + 0.5 * Math.sin(t * 1.1 - 0.6);
        L.aura.opacity = Math.min(1, 0.55 + 0.25 * pulse + 0.25 * lookUp + 0.2 * auraGrow);
        L.aura.scale = 1 + 0.06 * pulse * ramp + 0.1 * lookUp + 0.35 * auraGrow;
        dust?.fade(2, Math.min(1, 0.75 + 0.25 * pulse + 0.25 * lookUp + 0.2 * auraGrow));

        // The particles that belong to a layer follow it; the threads and the bright stars are in the sky
        const starDrift = stage.drift(zFor(DEPTH.stars)), moonDrift = stage.drift(L.moonNode.z), landDrift = stage.drift(L.landNode.z);
        dust?.shift(0, starDrift.x, starDrift.y + scroll * 6);
        dust?.shift(1, moonDrift.x, moonDrift.y + L.moonNode.y);
        dust?.shift(2, landDrift.x, landDrift.y + L.landNode.y);
        const b = rectOf(B.being);
        dust?.grow(2, 0.3 * auraGrow, b.left + b.w * 0.5, b.top + b.h * 0.45);
        skyShift = [starDrift.x, starDrift.y + scroll * 6];
        game?.shift(0, skyShift[0], skyShift[1]);
        game?.shift(1, skyShift[0], skyShift[1]);
        game?.shift(2, skyShift[0], skyShift[1]);
        gather(dt);
        hint(dt);
        stage.render(t);
        if (frames++ % 2 === 0) { placeHits(); placeStarHits(); }
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
        root.value.style.background = `#${art.sky.toString(16).padStart(6, '0')}`;
        // The card's name is written in the teal of its sky: lit a little, it reads as a light in the night
        stageEl = root.value.closest('.stage');
        stageEl?.style.setProperty('--name-glow', NAME_GLOW);
        build(stage);
        stage.onResize((w, h) => place(w, h));
        const after = (node) => node.mesh.renderOrder + 0.5;
        const fromArt = (list, colour, scale = 1, min = 1.2) => list.map(([x, y, r]) => [sx(x), sy(y), Math.max(min, 2 * r * k() * scale), colour]);
        // The stars of the card, and as many again over the sky the frame does not cover
        const stars = () => {
            const own = fromArt(art.stars, STAR, 1.25, 1.8);
            const density = art.stars.length / (F.size * F.size * 0.6);
            const more = [];
            const want = Math.min(300, Math.round(density * Math.max(0, W * Math.min(H, sy(1300)) - F.size * F.size * 0.6)));
            const sizes = art.stars.map(([, , r]) => r);
            for (let tries = 0; more.length < want && tries < want * 8; tries++) {
                const px = Math.random() * W, py = Math.random() * Math.min(H, sy(1300));
                if (px > F.x && px < F.x + F.size && py > F.y) continue;
                more.push([px, py, Math.max(1.8, 2.5 * sizes[Math.floor(Math.random() * sizes.length)] * k()), STAR]);
            }
            return [...own, ...more];
        };
        dust = startStardust(null, {
            stage,
            manual: true,
            groups: [
                // 0: the stars, behind everything
                { colors: [STAR], look: 'hard', parallax: 0, drift: 1.2, twinkle: 0.5, reach: 0, order: -20, points: stars },
                // 1: the stipple of the moon's shadow, alive
                { colors: [INK], look: 'hard', parallax: 0, drift: 0.8, jitter: 0.35, twinkle: 0.15, reach: 0, order: after(L.moon), points: () => fromArt(MOON.dots, INK, 1.5, 1.4) },
                // 2: the being's aura, between its light and its picture
                { colors: [PINK], look: 'hard', parallax: 0, drift: 1.8, jitter: 0.5, twinkle: 0.45, reach: 0, bloom: true, order: after(L.aura), points: () => fromArt(art.aura, PINK, 1.2) },
                // 3: grains of sand blown low over the dunes
                {
                    colors: SAND, count: 46, size: [2, 4.5], look: 'soft', drift: 10, flow: [16, 0], edgeFade: 0, twinkle: 0.6, reach: 90, push: 20, parallax: 18, opacity: 0.7,
                    order: 1e5, spawn: (w, h) => [Math.random() * w, sy(1340) + Math.random() * Math.max(10, h - sy(1340))],
                },
            ],
        });
        if (reduced) dust.reveal();
        // The game: the glow under the threads, and the threads with the bright stars, in front of the sky and the moon
        game = startStardust(null, {
            stage,
            groups: [
                { colors: [STAR], dynamic: threads.glow, parallax: 0, drift: 0, twinkle: 0, reach: 0, look: 'soft', order: after(L.moon) + 0.2, bloom: true },
                { colors: [STAR], dynamic: sky, parallax: 0, drift: 0, twinkle: 0, reach: 0, look: 'hard', order: after(L.moon) + 0.3, bloom: true },
                { colors: [STAR], dynamic: halos, parallax: 0, drift: 0, twinkle: 0, reach: 0, look: 'soft', order: after(L.moon) + 0.1 },
            ],
        });
        parallax = createParallax(root.value, frame);
        enter();
    };

    onMounted(begin);
    watch(() => props.active, enter);
    onBeforeUnmount(() => {
        gone = true;
        parallax?.destroy();
        dust?.destroy();
        game?.destroy();
        stage?.destroy();
        timers.forEach(clearTimeout);
        stopDrag();
        stageEl?.style.removeProperty('--name-glow');
    });
</script>

<template>
    <div class="scene" ref="root" @click="strum">
        <canvas class="stageCanvas" ref="canvas"></canvas>
        <!-- The rulito is drawn on its own canvas, which the stage shows over the little one's head -->
        <Rulito ref="rulito" class="offstage" color="#fed989" />
        <div ref="beingHit" class="hit" role="button" tabindex="0"
            :aria-label="$i18n.locale === 'en' ? 'The little being on the dune' : 'El pequeño ser sobre la duna'"
            @click.stop="touchBeing" @keydown="onKey"></div>
        <!-- The bright stars of the ancestor to see: drag from one to another to join them -->
        <div v-for="i in GUIDES" :key="i" :ref="setStarHit(i - 1)" class="hit star" role="button" tabindex="0" style="display: none"
            :aria-label="starLabel(i - 1, $i18n.locale)"
            @click.stop @pointerdown.prevent="pressStar(i - 1, $event)" @keydown="keyStar(i - 1, $event)"></div>
    </div>
</template>

<style scoped>
    .scene {
        position: absolute;
        inset: 0;
        overflow: hidden;
        background: #039ca8;
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

    /* A bright star can be dragged from, so the page does not scroll from it */
    .hit.star {
        border-radius: 50%;
        touch-action: none;
    }

    .offstage {
        position: absolute;
        left: -9999px;
        top: 0;
        width: 40px;
        visibility: hidden;
    }
</style>
