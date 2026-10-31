<script setup>
    // Belleza: "I recognise my beauty and the beauty of others". In a clearing of a forest of pink trees, under a teal
    // canopy of wavy leaves, two beings sit on the grass in an embrace, eyes closed, wrapped in a glow of yellow dust;
    // by the big tree on the right a ring of little mushrooms glows, and loose motes of light float through the wood.
    // Its verb is Ver: "being able to see beauty even in the most challenging appearance", "today, find 3 beautiful
    // aspects in yourself". Three plain things of the wood (a far bush, a stone, the bark of a tree, a sprout, a bare
    // mound...) hide a beauty that only shows to someone who looks closely: holding a finger still on one gathers a ring
    // of attention and, if something beautiful is hidden there, it blooms into a flower of light in the card's colours
    // (`resonate`, a note higher with each). Now and then a hidden one glints, for whoever is looking. With the three
    // found, their lights fly to the two, who hold each other closer, and a light goes out from them through the whole
    // wood as a breeze (`converge`); the rulito is born over them, and then three other things hide a beauty. See
    // docs/verbos-y-dinamicas.md.
    // It is also alive: the two breathe, each at its own pace, and every HUG s they hold each other a little closer (they lean together,
    // their glow brightens); the trees sway in a soft breeze (the near ones more), the bush stirs, the free leaves of the
    // canopy drift and turn in place, the mushrooms lean and breathe on their stems and glow, and the motes, the dust
    // round the two and round the mushrooms are live particles that a finger stirs. A touch anywhere is a breath of the
    // breeze (the trees and the leaves sway more for a moment), strums the card's chord (`star`) and the motes flare; a
    // touch on the two makes them hold each other closer at once.
    // The sky and the meadow are not pictures: a gradient in code from the card's teal and green (the line where they
    // meet hides under the band of the far woods), deeper towards the top of the screen. It is drawn in WebGL
    // (useLayerStage): the far woods, three planes of trees with the ground drawn round them, the bush, the cairn, the
    // mushrooms and the two are planes at their depths; past the frame the woods and the trees go on, mirrored, on both
    // sides. From bellezaScene.json and public/assets/belleza (made by scripts/convert-belleza.mjs). The touch target of
    // the two is a DOM element over them.
    import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { createParallax } from '../../composables/useParallax.js';
    import { createLayerStage } from '../../composables/useLayerStage.js';
    import { startStardust } from '../../composables/useStardust.js';
    import { play } from '../../composables/useSound.js';
    import { sceneMilestone } from '../../analytics.js';
    import { chordFor } from '../../data/cardChords.js';
    import { chordColors } from '../../data/chordColors.js';
    import Rulito from '../Rulito.vue';
    import art from '../../composables/bellezaScene.json';

    const props = defineProps({
        card: { type: Object, default: () => ({}) },
        active: Boolean
    });

    const root = ref(null);
    const canvas = ref(null);
    const pairHit = ref(null);
    const rulito = ref(null);
    const spotHits = [];
    const setSpotHit = (i) => (el) => { spotHits[i] = el; };
    let stageEl = null;
    let stage = null;
    let parallax = null;
    let dust = null;
    let game = null;
    let entered = false;
    let gone = false;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ASSETS = '/assets/belleza/';

    // ---- Layout: the illustration is a 2160 square resting on the bottom of the screen. On a phone upright it is as big
    // as the two big trees allow across, centred on the two beings; on a wide screen a little of the meadow goes under
    // the bottom edge, for more of the canopy, and the woods go on past the frame on both sides
    const SIZE = art.size;
    const B = art.boxes;
    let F = { x: 0, y: 0, size: 1 };
    let H = 1;
    const k = () => F.size / SIZE;
    const sx = (x) => F.x + x * k();
    const sy = (y) => F.y + y * k();
    const rectOf = ([left, top, w, h]) => ({ left: sx(left), top: sy(top), w: w * k(), h: h * k() });
    const SPAN = 1400, FOCUS = 1140;        // art px across that must be seen on a phone, and their middle (the two)
    const DROP = 0.07;                      // how much of the frame goes under the bottom of a wide screen
    const layout = (w, h) => {
        H = h;
        const phone = w < h;
        const size = phone ? Math.min(0.74 * h, w * SIZE / SPAN) : Math.min(Math.max(0.62 * w, 0.55 * h), 0.95 * h);
        let x = w / 2 - size / 2;
        if (phone && size > w) x = Math.min(0, Math.max(w - size, w / 2 - FOCUS * size / SIZE));
        F = { x, y: h - size + (phone ? 0 : DROP * size), size };
    };

    // ---- Depth: px each plane slides at the edge of a swipe
    const SLIDE = 40;
    const SLIDE_Y = 24;
    const zFor = (amp) => amp / (SLIDE + amp);
    const DEPTH = { horizon: 3, far: 7, mid: 15, pair: 24, near: 30, leaves: [9, 14, 20] };
    const PLANES = ['Far', 'Mid', 'Near'];
    const WIND = { Far: [0.8, 0.5], Mid: [1.8, 0.45], Near: [3.2, 0.4] };     // px at the top, speed
    const SIDES = [-1, 0, 1];

    const SKY = art.sky.sky, GROUND = art.sky.ground;
    const DEEP = 0x0f6995;                  // the card's colorAlt: the top of the sky leans towards it
    const GLOW = 0xe6e973;                  // the yellow of the dust round the two and the mushrooms
    const ease = (p) => p * p * (3 - 2 * p);
    const mix = (a, b, u) => [16, 8, 0].map((s) => Math.round(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * u));

    // ---- The free leaves of the canopy: cut out of the illustration (one atlas), each stirring in place
    const [AW, AH] = art.atlas;
    const leafTop = Math.min(...art.canopy.map(([, y]) => y)), leafBottom = Math.max(...art.canopy.map(([, y, , h]) => y + h));
    const leaves = art.canopy.map(([x, y, w, h, ax, ay], i) => ({
        i, art: { x: x + w / 2, y: y + h / 2, w, h }, crop: [ax / AW, ay / AH, w / AW, h / AH],
        depth: y + h / 2 < 380 ? 2 : y + h / 2 < 620 ? 1 : 0, phase: Math.random() * 6.28, speed: 0.3 + Math.random() * 0.25,
    }));

    // ---- The mushrooms lean and breathe on their stems; each its own pace
    const ROOM = 0.35;                      // room over the mushrooms' picture (a fraction of its height) for the caps
    const caps = art.caps.map(() => ({ phase: Math.random() * 6.28, speed: 0.55 + Math.random() * 0.4 }));

    // ---- The two: they breathe, and every HUG s they hold each other closer for a moment (0..1, eased in and out)
    const HUG = 9, HOLD = 2.6;
    let hugAt = -1;                         // a touch on them: a hug now
    const hugOf = (t) => {
        const touched = hugAt >= 0 && t - hugAt < HOLD ? Math.sin((t - hugAt) / HOLD * Math.PI) : 0;
        const p = (Math.max(0, t - 3) % HUG) / HOLD;
        return Math.max(touched, p < 1 ? Math.sin(p * Math.PI) ** 2 : 0);
    };

    // A breath of the breeze (a touch): the trees and the leaves sway more, and it settles
    let gust = 0;
    let lastT = 0;
    let time = 0;
    const L = {};


    // ---- Ver: the beauty hidden in plain things
    // The plain things of the wood that can hide a beauty: where they are (art px), how far round them a look finds it,
    // and the plane they stand on (1 the middle trees, 2 the near ones), so the light stays with them
    const SPOTS = [
        { key: 'farBush', es: 'El arbusto lejano', en: 'The far bush', at: [1430, 995], r: 85, plane: 1 },
        { key: 'farTrunk', es: 'El tronco lejano', en: 'The far trunk', at: [880, 930], r: 75, plane: 1 },
        { key: 'stones', es: 'Las piedras', en: 'The stones', at: [490, 1205], r: 70, plane: 1 },
        { key: 'sprout', es: 'El brote', en: 'The sprout', at: [530, 1545], r: 70, plane: 2 },
        { key: 'bark', es: 'La corteza', en: 'The bark', at: [1770, 1290], r: 105, plane: 2 },
        { key: 'grass', es: 'La hierba', en: 'The grass', at: [1610, 1735], r: 70, plane: 2 },
        { key: 'mound', es: 'El montículo', en: 'The mound', at: [1650, 1985], r: 115, plane: 2 },
        { key: 'stone', es: 'La piedra', en: 'The stone', at: [520, 1835], r: 80, plane: 2 },
        { key: 'cairn', es: 'La pila de piedras', en: 'The cairn', at: [2015, 1405], r: 90, plane: 2 },
        { key: 'bush', es: 'El arbusto', en: 'The bush', at: [300, 1775], r: 110, plane: 2 },
    ];
    const TO_FIND = 3;
    const HOLD_FOR = 1.1;                   // s a finger has to stay still to look closely
    const COLOURS = chordColors(chordFor(13)).map((c) => parseInt(c.slice(1), 16));
    const rgb = (hex) => [(hex >> 16 & 255) / 255, (hex >> 8 & 255) / 255, (hex & 255) / 255];
    const RGBS = COLOURS.map(rgb), GLOW_RGB = rgb(GLOW), WHITE = [1, 1, 1];
    const PAIR_AT = [1140, 1380];           // art px: the middle of the two
    const RULITO_AT = [1150, 1050];         // art px: the bottom of the rulito, over their heads

    let hidden = [];                        // the spots hiding a beauty this round
    const found = [];                       // { spot, at, fly: when it flies to the two (or -1) }
    let hold = null;                        // { x, y, t0, id, done, miss }
    let heldAt = 0;
    let rings = [];                         // looks that found nothing, dissolving: { x, y, at }
    let glint = null;                       // { spot, at }: a hidden one shows itself for a moment
    let glintIn = 6;
    let idle = 0;
    let gathering = null;                   // { at }: the three fly to the two
    let wave = null;                        // { at }: the light going out from them through the wood
    let win = null;                         // the rulito: { head, tail, full, fullAt, back, pop, age }
    let seenTimes = 0;
    let glyph = { left: 0, top: 0, w: 1, h: 1 };
    let Wd = 1;
    const timers = [];

    // Where a spot is on screen now (its plane carries it)
    const spotOnScreen = (spot) => {
        const p = L.planes[spot.plane].node.toScreen(sx(spot.at[0]), sy(spot.at[1]));
        return [p.x, p.y];
    };
    const pairOnScreen = () => { const p = L.pair.toScreen(sx(PAIR_AT[0]), sy(PAIR_AT[1])); return [p.x, p.y]; };
    const radiusOf = (spot) => Math.max(26, spot.r * k());

    // A new round: three plain things that are on screen hide a beauty, not two side by side
    const hide = () => {
        const seen = SPOTS.filter((spot) => {
            const [x, y] = [sx(spot.at[0]), sy(spot.at[1])];
            return x > 20 && x < Wd - 20 && y > 0 && y < H - 30;
        });
        const pool = [...seen].sort(() => Math.random() - 0.5);
        hidden = [];
        pool.forEach((spot) => {
            if (hidden.length < TO_FIND && hidden.every((h) => Math.hypot(h.at[0] - spot.at[0], h.at[1] - spot.at[1]) > 260)) hidden.push(spot);
        });
        pool.forEach((spot) => { if (hidden.length < TO_FIND && !hidden.includes(spot)) hidden.push(spot); });
        glintIn = 5 + Math.random() * 3;
    };
    const playing = () => !reduced && entered && !gathering && !win && hidden.length > 0;

    // Holding still: a ring of attention gathers at the finger; a quick touch is still a breath of the breeze
    const toCanvas = (event) => {
        const box = canvas.value.getBoundingClientRect();
        return [event.clientX - box.left, event.clientY - box.top];
    };
    const holdStart = (event) => {
        if (!playing() || event.target === pairHit.value || (event.button ?? 0) !== 0) return;
        const [x, y] = toCanvas(event);
        hold = { x, y, cx: event.clientX, cy: event.clientY, t0: time, id: event.pointerId, done: false };
        window.addEventListener('pointermove', holdMove);
        window.addEventListener('pointerup', holdEnd);
        window.addEventListener('pointercancel', holdEnd);
    };
    const holdMove = (event) => {
        if (!hold || event.pointerId !== hold.id) return;
        if (Math.hypot(event.clientX - hold.cx, event.clientY - hold.cy) > 14) holdEnd();
    };
    const holdEnd = () => {
        if (hold && !hold.done && time - hold.t0 > 0.35) rings.push({ x: hold.x, y: hold.y, at: time, p: Math.min(1, (time - hold.t0) / HOLD_FOR) });
        if (hold?.done) heldAt = performance.now();
        hold = null;
        window.removeEventListener('pointermove', holdMove);
        window.removeEventListener('pointerup', holdEnd);
        window.removeEventListener('pointercancel', holdEnd);
    };
    // The look is long enough: if a beauty hides near, it blooms; if not, the ring dissolves quietly
    const look = (x, y) => {
        idle = 0;
        const spot = hidden.find((h) => !found.some((f) => f.spot === h) && Math.hypot(...spotOnScreen(h).map((v, i) => v - [x, y][i])) < radiusOf(h) * 1.25 + 34);
        if (!spot) { rings.push({ x, y, at: time, p: 1 }); return; }
        reveal(spot);
    };
    const reveal = (spot) => {
        found.push({ spot, at: time, fly: -1 });
        if (glint?.spot === spot) glint = null;
        play('resonate', { step: found.length / TO_FIND });
        dust?.boost(0, 0.8);
        if (spot.key === 'farBush' || spot.key === 'bush') gust = Math.max(gust, 0.5);
        if (found.length === TO_FIND) timers.push(setTimeout(gather, 1500));
    };
    // With the keyboard: Enter on a plain thing looks at it closely
    const keySpot = (i, event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        if (!playing()) return;
        const [x, y] = spotOnScreen(SPOTS[i]);
        hold = null;
        look(x, y);
    };

    // The three fly to the two, who hold each other closer; a light goes out from them through the wood, as a breeze,
    // and the rulito is born over them
    const FLY = 1.4, GROW = 2.6, LINGER = 2.4, EAT = 3.4;
    const gather = () => {
        if (gone) return;
        gathering = { at: time };
        found.forEach((f, i) => { f.fly = time + i * 0.25; });
        play('converge');
        timers.push(setTimeout(() => {
            if (gone) return;
            hugAt = time;
            wave = { at: time };
            gust = 1;
            dust?.boost(0, 1.6);
            dust?.boost(1, 1.6);
            dust?.boost(2, 1.2);
            seenTimes += 1;
            sceneMilestone('beauty_seen', { times: seenTimes });
            win = { head: 0, tail: 0, full: false, fullAt: 0, back: false, pop: 0, age: 0 };
            rulito.value?.reshape();
        }, (FLY + 0.5) * 1000));
    };
    const winTick = (t, dt) => {
        if (!win || !rulito.value) return;
        win.age += dt;
        win.pop = Math.max(0, win.pop - dt * 2.2);
        if (win.age > 0.5 && win.head < 1) win.head = 1 - (1 - Math.min(1, (win.age - 0.5) / GROW)) ** 1.6;
        if (win.head >= 1 && !win.full) {
            win.full = true;
            win.fullAt = win.age;
            win.pop = 1;
            hugAt = t;
            dust?.boost(1, 1.2);
            play('rulito');
        }
        if (win.full && !win.back && win.age - win.fullAt > LINGER) win.back = true;
        if (win.back) win.tail = Math.min(win.head, win.tail + dt / EAT);
        const whole = Math.min(1, Math.max(0, (win.head - win.tail - 0.6) / 0.4));
        const named = Math.max(win.pop, 0.8 * ease(whole));
        stageEl?.style.setProperty('--name-glow', named.toFixed(3));
        stage.bloom = named;
        const flare = win.full && win.head - win.tail > 0.9 ? Math.max(win.pop, Math.sin(t * 4) * 0.5 + 0.5) : 0;
        rulito.value.frame({ head: win.head, tail: win.tail, flare, t, fade: Math.min(1, (win.head - win.tail) * 14), width: glyph.w });
        L.rulito.refresh();
        L.rulito.rotate = Math.sin(t * 1.8) * 3;
        L.rulito.scale = 1 + 0.2 * win.pop * win.pop;
        if (win.back && win.tail >= win.head) {
            win = null;
            gathering = null;
            wave = null;
            found.length = 0;
            rulito.value.frame({ width: glyph.w });
            L.rulito.refresh();
            stage.bloom = 0;
            stageEl?.style.setProperty('--name-glow', '0');
            idle = 0;
            hide();
        }
    };

    // No words: now and then a hidden one glints for a moment (more often after a while without finding anything)
    const hint = (dt) => {
        if (glint && time - glint.at > 1.6) glint = null;
        if (!playing()) return;
        idle += dt;
        glintIn -= dt;
        if (glintIn > 0 || hold) return;
        const left = hidden.filter((h) => !found.some((f) => f.spot === h));
        if (left.length) glint = { spot: left[Math.floor(Math.random() * left.length)], at: time };
        glintIn = idle > 12 ? 3.5 + Math.random() * 1.5 : 6 + Math.random() * 3;
    };

    // The particles of the game, all in px of the screen: the ring of attention, the glint, the flowers of light (and
    // their flight to the two) and the light going out from them
    const RING = 36, GLINT = 12, PETALS = 54, WAVE = 96;
    const FLOWERS = RING * 2 + GLINT;
    const beauty = {
        count: FLOWERS + TO_FIND * PETALS + WAVE,
        update(t, data) {
            data.alphas.fill(0);
            if (!L.pair || reduced) return;
            let i = 0;
            const put = (x, y, size, alpha, tint) => {
                data.positions[i * 3] = x;
                data.positions[i * 3 + 1] = y;
                data.sizes[i] = size;
                data.alphas[i] = alpha;
                data.tints.set(tint, i * 3);
                i += 1;
            };
            const u = Math.max(1, F.size / 900);
            // The ring of attention: motes closing in on the finger as the look lasts
            if (hold) {
                const p = Math.min(1, (t - hold.t0) / HOLD_FOR);
                if (p >= 1 && !hold.done) { hold.done = true; look(hold.x, hold.y); }
                const r = (1.7 - 0.9 * ease(p)) * 30 * u;
                for (let j = 0; j < RING; j++) {
                    const a = j / RING * Math.PI * 2 + t * 0.6;
                    put(hold.x + Math.cos(a) * r, hold.y + Math.sin(a) * r, (3 + 2 * p) * u, (0.15 + 0.7 * p) * (hold.done ? 0 : 1), GLOW_RGB);
                }
            } else i += RING;
            // A look that found nothing: its ring opens and fades
            rings = rings.filter((ring) => t - ring.at < 0.8);
            const ring = rings[rings.length - 1];
            for (let j = 0; j < RING; j++) {
                if (!ring) { i += 1; continue; }
                const q = (t - ring.at) / 0.8;
                const a = j / RING * Math.PI * 2 + t * 0.6;
                const r = (0.8 + 0.9 * ring.p + q * 1.2) * 30 * u;
                put(ring.x + Math.cos(a) * r, ring.y + Math.sin(a) * r, 2.6 * u, 0.8 * ring.p * (1 - q), GLOW_RGB);
            }
            // The glint: a few small sparkles round a hidden one, in and out
            for (let j = 0; j < GLINT; j++) {
                if (!glint) { i += 1; continue; }
                const q = (t - glint.at) / 1.6;
                const [x, y] = spotOnScreen(glint.spot);
                const r = radiusOf(glint.spot) * 0.55;
                const a = j * 2.39996;
                const twinkle = Math.max(0, Math.sin(q * Math.PI * 2 + j)) * Math.sin(q * Math.PI);
                put(x + Math.cos(a) * r * Math.sqrt((j + 0.5) / GLINT), y + Math.sin(a) * r * Math.sqrt((j + 0.5) / GLINT),
                    (2.5 + 3 * twinkle) * u, 0.85 * twinkle, j % 3 ? GLOW_RGB : WHITE);
            }
            // The flowers of light: petals of dots in the chord's colours, opening and turning slowly; when the three
            // are found they fly to the two in an arc and go into them
            const [px, py] = pairOnScreen();
            for (let f = 0; f < TO_FIND; f++) {
                const one = found[f];
                if (!one) { i += PETALS; continue; }
                const [x, y] = spotOnScreen(one.spot);
                const open = ease(Math.min(1, (t - one.at) / 0.9));
                const fly = one.fly >= 0 ? Math.min(1, Math.max(0, (t - one.fly) / FLY)) : 0;
                const R = Math.max(34 * u, radiusOf(one.spot)) * open;
                for (let j = 0; j < PETALS; j++) {
                    const a = j / PETALS * Math.PI * 2 + t * 0.25 + f;
                    const r = R * (0.25 + 0.75 * Math.abs(Math.cos(2.5 * a))) * (1 + 0.06 * Math.sin(t * 1.6 + j));
                    let fx = x + Math.cos(a) * r, fy = y + Math.sin(a) * r;
                    if (fly > 0) {
                        const e = ease(Math.min(1, fly * (1 + (j % 7) * 0.05)));
                        const lift = Math.sin(e * Math.PI) * Math.max(60, Math.hypot(px - x, py - y) * 0.35);
                        fx += (px - fx) * e;
                        fy += (py - fy) * e - lift;
                    }
                    const tint = j % 9 === 0 ? WHITE : RGBS[Math.floor(j / 2) % RGBS.length];
                    put(fx, fy, (4 + 1.8 * Math.sin(t * 2 + j)) * u * (0.6 + 0.4 * open), open * (1 - ease(Math.max(0, fly - 0.75) * 4)), tint);
                }
            }
            // The light going out from the two through the whole wood
            if (wave) {
                const q = (t - wave.at) / 2.6;
                const r = ease(Math.min(1, q)) * Math.hypot(Wd, H);
                for (let j = 0; j < WAVE; j++) {
                    const a = j / WAVE * Math.PI * 2 + Math.sin(j * 7.1) * 0.05;
                    put(px + Math.cos(a) * r, py + Math.sin(a) * r * 0.8, (3 + 2 * Math.sin(j)) * u, 0.75 * Math.max(0, 1 - q), RGBS[j % RGBS.length]);
                }
            }
        },
    };

    const build = (s) => {
        // The far woods on the horizon, with the land going on past the frame
        const horizon = s.depth(zFor(DEPTH.horizon));
        L.horizonNode = horizon;
        L.horizon = SIDES.map((side) => ({ side, node: horizon.image(ASSETS + 'horizon.webp') }));
        horizon.enter({ y: 20, delay: 0, duration: 1600 });
        // The leaves of the canopy, at three depths
        L.leaves = [];
        L.leafNodes = DEPTH.leaves.map((depth, d) => {
            const node = s.depth(zFor(depth));
            leaves.filter((lf) => lf.depth === d).forEach((lf) => { L.leaves[lf.i] = node.image(ASSETS + 'canopy.webp', { crop: lf.crop }); });
            node.enter({ y: -24, delay: 250 + 150 * d, duration: 2000 });
            return node;
        });
        // The trees in three planes, each with the ground drawn round it; the near ones sway the most
        L.planes = PLANES.map((name, p) => {
            const node = s.depth(zFor([DEPTH.far, DEPTH.mid, DEPTH.near][p]));
            const make = (src, wind) => SIDES.map((side) => ({ side, node: node.image(ASSETS + src, wind ? { wind } : {}) }));
            const [amp, speed] = WIND[name];
            const plane = { node, name };
            // The ground of the near plane goes over its trees (the grass at their feet); the others under them
            if (p < 2) plane.ground = make(`ground${name}.webp`);
            plane.trees = make(`trees${name}.webp`, { amp, speed, root: 'bottom' });
            if (p === 2) plane.ground = make(`ground${name}.webp`);
            node.enter({ y: 20 + 20 * p, delay: 80 * p, duration: 1600 + 200 * p });
            return plane;
        });
        // On the near plane: the cairn, the bush (it sways) and the mushrooms (they lean and breathe) with their light
        const near = L.planes[2].node;
        L.cairn = near.image(ASSETS + 'cairn.webp');
        L.bush = near.image(ASSETS + 'bush.webp', { wind: { amp: 4, speed: 0.8, root: 'bottom' } });
        L.shine = near.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: GLOW, stops: [[0, 0.42], [0.35, 0.16], [0.7, 0]] });
        L.mushrooms = near.image(ASSETS + 'mushrooms.webp', { sway: true, crop: [0, -ROOM, 1, 1 + ROOM] });
        // The soft light a beauty found leaves round its plain thing, on its plane
        L.lights = SPOTS.map((spot) => {
            const node = L.planes[spot.plane].node.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: GLOW, stops: [[0, 0.5], [0.35, 0.2], [0.7, 0]], bloom: true });
            node.opacity = 0;
            return node;
        });
        // The two, with their glow behind them
        const pair = s.depth(zFor(DEPTH.pair));
        L.pairNode = pair;
        L.pair = pair.group();
        L.warmth = L.pair.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: GLOW, stops: [[0, 0.62], [0.38, 0.28], [0.72, 0]] });
        L.legs = L.pair.image(ASSETS + 'legs.webp');
        L.left = L.pair.image(ASSETS + 'left.webp');
        L.right = L.pair.image(ASSETS + 'right.webp');
        L.rulito = L.pair.canvas(rulito.value.canvas, { bloom: true });
        pair.enter({ y: 50, delay: 450, duration: 1900 });
    };

    // The sky and the meadow, from the card: the teal, deeper towards the top of the screen, down to the line of the far
    // woods, and the green from there, a little hazy where it meets the woods
    const paintSky = () => {
        const at = (y) => `${Math.max(-50, Math.min(150, y / H * 100)).toFixed(1)}%`;
        const rgb = (c) => `rgb(${(Array.isArray(c) ? c : mix(c, c, 0)).join(', ')})`;     // a 0xRRGGBB or [r, g, b]
        const line = sy(art.horizon - 70);
        root.value.style.background = `linear-gradient(to bottom, ${[
            `${rgb(mix(SKY, DEEP, 0.45))} 0%`, `${rgb(SKY)} ${at(Math.max(sy(380), 0.2 * H))}`, `${rgb(SKY)} ${at(line)}`,
            `${rgb(mix(GROUND, SKY, 0.25))} ${at(line)}`, `${rgb(GROUND)} ${at(sy(1300))}`, `${rgb(GROUND)} 100%`,
        ].join(', ')})`;
    };

    const place = (w, h) => {
        layout(w, h);
        paintSky();
        const sided = (list, box) => {
            const r = rectOf(box);
            list.forEach(({ side, node }) => {
                node.place({ ...r, left: side ? (side < 0 ? 2 * F.x - r.left - r.w : 2 * (F.x + F.size) - r.left - r.w) : r.left });
                node.sx = side ? -1 : 1;
            });
        };
        sided(L.horizon, B.horizon);
        L.planes.forEach((plane) => {
            sided(plane.ground, B[`ground${plane.name}`]);
            sided(plane.trees, B[`trees${plane.name}`]);
        });

        // The free leaves, spread across the screen; where the sky over the frame is tall (a phone upright) they go up
        // into it, never over the card's name
        const wide = Math.max(1.1 * w, F.size);
        const title = titleRect(h);
        const below = title.bottom + 12;
        leaves.forEach((lf) => {
            const lw = lf.art.w * k(), lh = lf.art.h * k();
            const x = sx(SIZE / 2) + (lf.art.x - SIZE / 2) / SIZE * wide;
            const top = Math.min(sy(leafTop), Math.max(below + lh / 2, sy(leafTop) - (sy(leafTop) - below) * 0.85));
            let y = top + (lf.art.y - leafTop) / (leafBottom - leafTop) * (sy(leafBottom) - top);
            if (x + lw / 2 > title.left - 16 && x - lw / 2 < title.right + 16) y = Math.max(y, below + lh / 2);
            lf.rest = { left: x - lw / 2, top: y - lh / 2, w: lw, h: lh };
            L.leaves[lf.i].place(lf.rest);
        });

        L.cairn.place(rectOf(B.cairn));
        const bush = rectOf(B.bush);
        L.bush.place(bush, { x: bush.left + bush.w / 2, y: bush.top + bush.h });
        const m = rectOf(B.mushrooms);
        L.mushrooms.place({ ...m, top: m.top - ROOM * m.h, h: m.h * (1 + ROOM) }, { x: m.left + m.w / 2, y: m.top + m.h });
        const sd = 520 * k();
        L.shine.place({ left: sx(1880) - sd / 2, top: sy(1700) - sd * 0.45, w: sd, h: sd * 0.8 });

        const left = rectOf(B.left), right = rectOf(B.right);
        L.legs.place(rectOf(B.legs));
        L.left.place(left, { x: left.left + left.w / 2, y: left.top + left.h });
        // The one in front breathes and leans about where it holds the other, low on its left
        L.right.place(right, { x: right.left + right.w * 0.3, y: right.top + right.h });
        const gd = 1200 * k();
        L.warmth.place({ left: sx(1140) - gd / 2, top: sy(1380) - gd / 2, w: gd, h: gd });
        L.pair.pivot = { x: sx(1140), y: sy(1760) };

        SPOTS.forEach((spot, i) => {
            const d = radiusOf(spot) * 3.2;
            L.lights[i].place({ left: sx(spot.at[0]) - d / 2, top: sy(spot.at[1]) - d / 2, w: d, h: d });
        });
        // The rulito over the two (as tall as the rulito's own shape is for its width)
        const gw = Math.max(18, 60 * k()), gh = gw * 86 / 32;
        glyph = { left: sx(RULITO_AT[0]) - gw / 2, top: sy(RULITO_AT[1]) - gh, w: gw, h: gh };
        rulito.value.frame({ width: glyph.w });
        L.rulito.place({ left: glyph.left - 0.4375 * glyph.w, top: glyph.top - 0.1628 * glyph.h, w: glyph.w * 1.875, h: glyph.h * 1.3256 },
            { x: glyph.left + glyph.w / 2, y: glyph.top + glyph.h });
        L.rulito.refresh();
        Wd = w;
        if (!hidden.length) hide();
    };

    // Where the card's name is (the stage's h1, over the scene), so the leaves keep under it
    const titleRect = (h) => {
        const title = stageEl?.querySelector('h1');
        if (!title || !root.value) return { left: 0, right: 0, bottom: 0.16 * h };
        const r = title.getBoundingClientRect(), area = root.value.getBoundingClientRect();
        return { left: r.left - area.left, right: r.right - area.left, bottom: r.bottom - area.top };
    };

    // The touch target: the two
    const placeHit = () => {
        if (!L.pair || !pairHit.value) return;
        const b = L.pair.boxOnScreen(rectOf([830, 1080, 640, 780]));
        const bw = Math.max(64, b.width), bh = Math.max(64, b.height);
        pairHit.value.style.translate = `${(b.left + b.width / 2 - bw / 2).toFixed(1)}px ${(b.top + b.height / 2 - bh / 2).toFixed(1)}px`;
        pairHit.value.style.width = `${bw.toFixed(1)}px`;
        pairHit.value.style.height = `${bh.toFixed(1)}px`;
        // The plain things, for the keyboard only (a finger looks by holding still anywhere)
        SPOTS.forEach((spot, i) => {
            const el = spotHits[i];
            if (!el) return;
            const [x, y] = spotOnScreen(spot);
            const r = radiusOf(spot);
            el.style.translate = `${(x - r).toFixed(1)}px ${(y - r).toFixed(1)}px`;
            el.style.width = el.style.height = `${(2 * r).toFixed(1)}px`;
        });
    };

    // A touch anywhere: a breath of the breeze, the chord strummed, the motes flare
    const strum = () => {
        if (performance.now() - heldAt < 500) return;      // the click that ends a long look is not a touch
        play('star');
        if (reduced) return;
        gust = 1;
        dust?.boost(0, 0.9);
        dust?.boost(2, 0.6);
    };
    // A touch on the two: they hold each other closer, and their glow flares
    const embrace = () => {
        play('star');
        if (reduced) return;
        if (hugAt < 0 || time - hugAt > HOLD * 0.7) hugAt = time;
        dust?.boost(1, 1);
        dust?.boost(0, 0.5);
    };
    const onKey = (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        embrace();
    };

    const enter = () => {
        if (entered || !props.active || !stage) return;
        entered = true;
        stage.ready().then(() => { if (!gone) { stage.start(); dust?.reveal(); } });
    };

    let frames = 0;
    const frame = ({ x, y, scroll, t, ramp }) => {
        if (!stage || !L.pair) return;
        const dt = Math.min(0.1, Math.max(0, t - lastT));
        lastT = t;
        time = t;
        stage.look(x * SLIDE, y * SLIDE_Y);
        gust = Math.max(0, gust - dt * 0.45);
        const breeze = ease(gust);

        // ---- The breeze: the trees sway (more for a moment after a touch), the leaves stir and turn in place
        L.planes.forEach((plane, p) => {
            const [amp] = WIND[plane.name];
            plane.trees.forEach(({ node }) => { node.uniforms.uWind.value.x = amp * (1 + 1.6 * breeze) * ramp; });
            plane.node.y = scroll * [10, 18, 30][p];
        });
        L.bush.uniforms.uWind.value.x = 4 * (1 + 1.4 * breeze) * ramp;
        leaves.forEach((lf) => {
            const node = L.leaves[lf.i];
            const a = t * lf.speed + lf.phase;
            node.x = (Math.sin(a) * 7 + Math.sin(t * 1.7 + lf.phase) * 5 * breeze) * ramp;
            node.y = Math.sin(a * 0.7 + 1.3) * 3.5 * ramp;
            node.rotate = (Math.sin(a * 1.3) * 1.6 + Math.sin(t * 2.3 + lf.phase) * 2.5 * breeze) * ramp;
            node.sx = 1 + 0.05 * Math.sin(a * 0.9) * ramp;
        });
        L.leafNodes.forEach((node, d) => { node.y = scroll * (8 + 6 * d); });

        // ---- The mushrooms lean and breathe, and their light with them
        L.mushrooms.sways = art.caps.map(([cx, cy, cw], i) => {
            const c = caps[i];
            const a = t * c.speed + c.phase;
            return [(cx - B.mushrooms[0]) / B.mushrooms[2], (cy - B.mushrooms[1]) / B.mushrooms[3], cw / B.mushrooms[2],
                (3 * Math.sin(a) + 2 * breeze * Math.sin(t * 3 + c.phase)) * ramp, 1 + 0.05 * Math.sin(a * 1.6 + 1) * ramp];
        });
        const glowing = Math.sin(t * 0.8) * 0.5 + 0.5;
        L.shine.opacity = 0.65 + 0.35 * glowing * ramp;
        L.mushrooms.uniforms.uBright.value = 1 + 0.08 * glowing * ramp;

        // ---- The two breathe, each at its own pace, and lean together when they hold each other closer
        const hug = reduced ? 0 : hugOf(t);
        L.left.sy = 1 + 0.014 * Math.sin(t * 0.9) * ramp;
        L.left.sx = 1 - 0.005 * Math.sin(t * 0.9) * ramp;
        L.right.sy = 1 + 0.012 * Math.sin(t * 0.83 + 2) * ramp;
        L.right.sx = 1 - 0.004 * Math.sin(t * 0.83 + 2) * ramp;
        L.left.rotate = 1.6 * hug;
        L.right.rotate = -1.4 * hug;
        L.right.x = -8 * k() * hug;
        L.warmth.opacity = 0.75 + 0.1 * Math.sin(t * 0.9) * ramp + 0.25 * hug;
        L.warmth.scale = 1 + 0.03 * Math.sin(t * 0.9) * ramp + 0.08 * hug;
        L.left.uniforms.uBright.value = L.right.uniforms.uBright.value = 1 + 0.06 * hug;
        L.pairNode.y = scroll * 24;
        L.horizonNode.y = scroll * 6;
        dust?.fade(1, Math.min(1, 0.8 + 0.2 * hug + (win ? 0.2 : 0)));

        // ---- The beauties found keep a soft light round their plain thing until they fly to the two
        SPOTS.forEach((spot, i) => {
            const one = found.find((f) => f.spot === spot);
            const on = one ? ease(Math.min(1, (t - one.at) / 0.9)) * (one.fly >= 0 ? 1 - ease(Math.min(1, (t - one.fly) / FLY)) : 1) : 0;
            const glinting = glint?.spot === spot ? 0.35 * Math.sin(Math.min(1, (t - glint.at) / 1.6) * Math.PI) : 0;
            L.lights[i].opacity = Math.max(on * (0.8 + 0.2 * Math.sin(t * 1.3 + i)), glinting);
            L.lights[i].scale = 1 + 0.08 * Math.sin(t * 0.9 + i);
        });
        winTick(t, dt);
        hint(dt);

        // The particles that belong to a layer follow it
        const mid = stage.drift(L.planes[1].node.z), pair = stage.drift(L.pairNode.z), near = stage.drift(L.planes[2].node.z);
        dust?.shift(0, mid.x, mid.y + L.planes[1].node.y);
        dust?.shift(1, pair.x, pair.y + L.pairNode.y);
        dust?.shift(2, near.x, near.y + L.planes[2].node.y);
        stage.render(t);
        if (frames++ % 2 === 0) placeHit();
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
        const fromArt = (list, scale = 1) => list.map(([x, y, r]) => [sx(x), sy(y), Math.max(1.2, 2 * r * k() * scale), GLOW]);
        dust = startStardust(null, {
            stage,
            manual: true,
            groups: [
                // 0: the loose motes of light through the wood, soft, wandering; a finger stirs them
                { colors: [GLOW], look: 'soft', parallax: 0, drift: 12, jitter: 0.6, twinkle: 0.7, reach: 90, push: 28, order: 1e6, points: () => fromArt(art.motes, 3) },
                // 1: the dust round the two, alive
                { colors: [GLOW], parallax: 0, drift: 1.8, jitter: 0.5, twinkle: 0.45, reach: 70, push: 10, order: after(L.warmth), points: () => fromArt(art.aura, 1.7) },
                // 2: the dust round the mushrooms
                { colors: [GLOW], parallax: 0, drift: 1.4, jitter: 0.4, twinkle: 0.5, reach: 60, push: 8, order: after(L.shine), points: () => fromArt(art.spores, 1.5) },
            ],
        });
        if (reduced) dust.reveal();
        // The game's particles, over everything, in px of the screen (they follow what they belong to themselves)
        game = startStardust(null, {
            stage,
            groups: [{ colors: [GLOW], dynamic: beauty, parallax: 0, drift: 0, twinkle: 0, reach: 0, look: 'hard', order: 2e6, bloom: true }],
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
        holdEnd();
        stageEl?.style.removeProperty('--name-glow');
    });
</script>

<template>
    <div class="scene" ref="root" @click="strum" @pointerdown="holdStart" @contextmenu.prevent>
        <canvas class="stageCanvas" ref="canvas"></canvas>
        <!-- The rulito is drawn on its own canvas, which the stage shows over the two -->
        <Rulito ref="rulito" class="offstage" color="#e6e973" />
        <div ref="pairHit" class="hit" role="button" tabindex="0"
            :aria-label="$i18n.locale === 'en' ? 'The two in their embrace' : 'Los dos en su abrazo'"
            @click.stop="embrace" @keydown="onKey"></div>
        <!-- The plain things that may hide a beauty, for the keyboard: Enter looks at one closely -->
        <div v-for="(spot, i) in SPOTS" :key="spot.key" :ref="setSpotHit(i)" class="hit spot" tabindex="0"
            :aria-label="$i18n.locale === 'en' ? `${spot.en}: look closely` : `${spot.es}: mirar de cerca`"
            @keydown="keySpot(i, $event)"></div>
    </div>
</template>

<style scoped>
    .scene {
        position: absolute;
        inset: 0;
        overflow: hidden;
        background: #49afb0;
        -webkit-touch-callout: none;           /* holding a finger still is looking, not a menu */
        -webkit-user-select: none;
        user-select: none;
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

    /* Only for the keyboard: a finger passes through to the scene */
    .hit.spot {
        border-radius: 50%;
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
