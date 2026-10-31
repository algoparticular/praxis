<script setup>
    // Armonía: "I vibrate in harmony and in my here and now". Two jellyfish float side by side in a green sea, eyes closed,
    // their long tentacles crossing below them, over a sandy floor with seaweeds, corals and two clusters of anemones,
    // under the teal currents of the water.
    // Its verb is Resonar, on time ("harmony in music is found in the balance between the variety and proportion of sounds
    // and pauses"; "a person in harmony can help you rediscover the balance within you"). The jellyfish on the left leads:
    // its bell beats a bar with a silence in it, beat, beat, rest, beat (BAR), over and over; each beat is seen (the bell
    // contracts, its glow swells) and, once someone plays, heard softly (`pulse`). The one on the right breathes on its own,
    // slower and out of step. Touching it exactly on a beat of the other makes it beat with it (`resonate`, a note of the
    // card's Cmaj7 climbing Do, Mi, Sol, Si, then Do, Mi), its breathing comes a little closer to the leader's, and a light
    // leaves it for one crown of the anemones, which lights up (six in all; where the crowns are out of the frame, a phone
    // upright, a row of six beads over the jellyfish fills instead). A touch between beats, or on the rest (respecting the
    // pause is part of the harmony), is a muted `miss`: the follower falters a moment, nothing lit is lost, that beat is
    // gone, and the leader beats bright on the next one, to show where it is. With the six lit the two beat as one, the
    // card's major seventh rings open (`converge`: it is a stable chord, nothing to resolve), their light gathers over them
    // and the rulito is born there, the card's name glowing; then it goes, the crowns go back to waiting and the follower
    // drifts slowly back to its own breathing. Left alone AGAIN s, the leader sends each beat of one bar to the follower,
    // which answers it, and nothing on the rest (the hint, with no words). The leader is not played: a touch on it only
    // makes it shine, silent.
    // The scene is alive around it: the jellyfish rise a little with each stroke; their tentacles trail in the water (wind
    // in the shader, from the bell down); every LEAN s they lean towards each other for a moment, and now and then one
    // squeezes its closed eyes, content. The yellow stipple round their bells is particles that tremble and breathe with
    // them. The anemones' crowns lean and stretch on their pots (sway), with their glow as particles; the seaweeds and
    // corals sway (wind); the light of the water ripples across the sand (water); the currents breathe (their tongues reach
    // down and draw back); the yellow specks in the water are particles that drift and move out of a finger's way.
    // A touch anywhere else strums the chord (`star`) and the specks and glows flare. Reduced motion keeps it still and
    // not played: a touch on a jellyfish is only a `tap`.
    // The water is not a picture: a gradient from the card's colours (worked out by the converter, teal above the currents,
    // green below), nor the glows behind the bells and the crowns (code). Drawn in WebGL (useLayerStage): every picture a
    // plane at its depth; past the frame the currents and the sand are mirrored on both sides. From armoniaScene.json and
    // public/assets/armonia (made by scripts/convert-armonia.mjs). The touch targets are DOM elements over the jellyfish.
    import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { createParallax } from '../../composables/useParallax.js';
    import { createLayerStage } from '../../composables/useLayerStage.js';
    import { startStardust } from '../../composables/useStardust.js';
    import { createSparks } from '../../composables/useSparks.js';
    import { play } from '../../composables/useSound.js';
    import { sceneMilestone } from '../../analytics.js';
    import Rulito from '../Rulito.vue';
    import art from '../../composables/armoniaScene.json';

    const props = defineProps({
        card: { type: Object, default: () => ({}) },
        active: Boolean
    });

    const root = ref(null);
    const canvas = ref(null);
    const hits = ref([]);
    const rulito = ref(null);
    let stageEl = null;
    let stage = null;
    let parallax = null;
    let dust = null;
    let entered = false;
    let gone = false;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ---- Layout: the illustration is a 2160 square resting on the bottom of the screen. On a phone upright it is as big
    // as the two jellyfish allow across (SPAN), centred on them (FOCUS); on a wide screen a little of the sand goes under
    // the edge (DROP) and the currents and the sand go on past the frame, mirrored
    const SIZE = art.size;
    const B = art.boxes;
    let F = { x: 0, y: 0, size: 1 };
    const k = () => F.size / SIZE;
    const sx = (x) => F.x + x * k();
    const sy = (y) => F.y + y * k();
    const rectOf = ([left, top, w, h]) => ({ left: sx(left), top: sy(top), w: w * k(), h: h * k() });
    const SPAN = 1250, FOCUS = 1085;
    const DROP = 0.06;
    const layout = (w, h) => {
        const phone = w < h;
        const size = phone ? Math.min(0.8 * h, w * SIZE / SPAN) : Math.min(Math.max(0.62 * w, 0.55 * h), 0.9 * h);
        let x = w / 2 - size / 2;
        if (phone && size > w) x = Math.min(0, Math.max(w - size, w / 2 - FOCUS * size / SIZE));
        F = { x, y: h - size + (phone ? 0 : DROP * size), size };
    };

    const SLIDE = 46;
    const SLIDE_Y = 26;
    const zFor = (amp) => amp / (SLIDE + amp);
    const DEPTH = { band: 5, currents: 8, back: 14, sand: 18, jellies: 21, front: 27 };

    const YELLOW = 0xe6e973;
    const SPECK = 0xe8eb74;
    const ease = (p) => p * p * (3 - 2 * p);

    // ---- The jellyfish. The follower, on its own, takes PULSE s between two strokes of its bell; the leader beats BAR
    const PULSE = 4.2;
    const LEAN = 13;                        // every LEAN s they lean towards each other for a moment
    const jellies = art.jellies.map((J, i) => ({
        ...J, i, phase: i * 0.38, extra: 0, extraAt: -10, shine: 0, rise: 0, blinkAt: 4 + i * 5.5,
    }));
    // A bell's stroke: a quick contraction, then a slow letting go (0..1)
    const stroke = (p) => (p < 0.18 ? Math.sin(p / 0.18 * Math.PI / 2) : Math.cos((p - 0.18) / 0.82 * Math.PI / 2) ** 2);
    const leanOf = (t) => {
        const p = (Math.max(0, t - 5) % LEAN) / 4;
        return p < 1 ? Math.sin(p * Math.PI) ** 2 : 0;
    };

    // ---- The anemones: each crown sways about where it leaves its pot. The picture is shown in a taller and wider box
    // (ROOM), so the crowns have room to lean
    const ROOM = { top: 0.14, side: 0.08 };
    const anemones = art.anemones.map((A) => {
        const [bx, by, bw, bh] = B[A.name];
        return {
            ...A,
            sways: A.crowns.map(([x, y, w], j) => ({ u: (x - bx) / bw, v: (y - by) / bh, w: w / bw, x, y, cw: w, phase: j * 1.9 + (A.name === 'anemR' ? 0.8 : 0) })),
        };
    });

    // ---- The game (Resonar, on time). The leader beats BAR (1 a beat, 0 a rest) every BEAT s; the follower is touched on
    // its beats. A touch from EARLY s before a beat to LATE s after it is in time (more room after: a finger lands just
    // after the beat it saw), as in Sila
    const LEADER = 0, FOLLOWER = 1;
    const BAR = [1, 1, 0, 1];               // beat, beat, rest, beat: the sounds and the pause
    const BEAT = 1.05;                      // s from one step of the bar to the next
    const STROKE = 0.95;                    // s a stroke of the leader's bell lasts (contracts quickly, lets go slowly)
    const EARLY = 0.22, LATE = 0.34;
    const AGAIN = 7;                        // s alone before the hint
    const LISTEN = 9;                       // s after the last touch the leader's beats are still heard
    const DIM = 0.3;                        // how a crown glows before it is lit
    const DELAY = 1.1, GROW = 2.2, KEEP = 2.8, EAT = 3.4;    // the rulito: born after the light gathers, kept, gone
    const RULITO = { x: 1070, top: 130, h: 310 };            // art px: between the two bells, over them
    const BEADS = { x: 1070, y: 405, gap: 52 };              // art px: the row of beads over the jellyfish, one for each crown
    const CREAM = 0xfdfbe0;
    const mod = (n) => ((n % BAR.length) + BAR.length) % BAR.length;
    const isBeat = (n) => BAR[mod(n)] === 1;
    const beatOf = (t) => Math.round((t - (LATE - EARLY) / 2) / BEAT);
    const lastBeatBefore = (t) => {
        let n = Math.floor(t / BEAT);
        while (!isBeat(n)) n -= 1;
        return n;
    };
    const nextBeat = (t) => {
        let n = Math.floor(t / BEAT) + 1;
        while (!isBeat(n)) n += 1;
        return n * BEAT;
    };
    // The leader's stroke now (0..1): only on the beats of the bar, still through the rest
    const leaderStroke = (t) => {
        const since = (t - lastBeatBefore(t) * BEAT) / STROKE;
        return since >= 0 && since < 1 ? stroke(since) : 0;
    };
    // The six crowns, in the order they light: the tallest of each cluster first, one side and then the other
    const CROWNS = [];
    const CLUSTERS = ['anemL', 'anemR'].map((name) => anemones.find((A) => A.name === name));
    [0, 1, 2].forEach((j) => CLUSTERS.forEach((A) => CROWNS.push({ A, j, c: A.sways[j] })));
    const on = CROWNS.map(() => false);
    const claimed = CROWNS.map(() => false);  // a light is on its way to it
    const lit = CROWNS.map(() => (reduced ? 1 : DIM));
    const flash = CROWNS.map(() => 0);
    let beadsShown = false;                 // the crowns are out of the frame: their lights go to the beads
    let beadsVis = 0;
    let heard = false;
    let lastTouch = -Infinity;
    let hintAt = AGAIN + 3;
    let hintFrom = Infinity, hintUntil = -Infinity;
    let missed = null;                      // the beat a touch out of time used up
    let spoken = null;                      // the beat a touch in time already answered
    let said = 0;                           // notes said in time: they climb the chord
    let falter = 0;                         // the follower, lost for a moment after a touch out of time
    let callAt = null;                      // then the leader beats bright on its next beat: there is the beat
    let together = 0;                       // how close the follower's breathing is to the leader's (0..1)
    let lastStep = -1;
    let wins = 0;
    let win = null;
    let glyph = { left: 0, top: 0, w: 1, h: 1 };
    let W = 1, H = 1;

    // ---- What flies (the lights to the crowns, the beat sent in the hint, the light gathering): slots of a dynamic group
    const FLYERS = 160;
    const fly = Array.from({ length: FLYERS }, () => ({ on: false }));
    let flyNext = 0;
    const rgb = (c) => [((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255];
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
    // The beads over the jellyfish: one for each crown, lit with it, so the count is seen wherever the crowns are (on a
    // phone upright they are out of the frame, and the lights go to the beads)
    const YEL = rgb(0xf6f78e), INK = rgb(0x39509e);
    const beads = {
        count: CROWNS.length,
        update(t, data) {
            for (let i = 0; i < CROWNS.length; i++) {
                const p = beadAt(i);
                const l = (lit[i] - DIM) / (1 - DIM);
                data.positions[i * 3] = p.x;
                data.positions[i * 3 + 1] = p.y;
                data.sizes[i] = (7 + 7 * l + 6 * flash[i]) * Math.max(0.9, Math.min(1.4, k() * 3.2));
                data.alphas[i] = beadsVis * (0.75 + 0.25 * l);
                for (let c = 0; c < 3; c++) data.tints[i * 3 + c] = INK[c] + (YEL[c] - INK[c]) * l;
            }
        },
    };
    const sparks = createSparks(200);

    // ---- Past the frame on a wide screen, so the floor does not end bare: the plants of the other side, mirrored, at x
    // (art px of the frame; outside it)
    const BEYOND = [
        { name: 'weedR', x: -330, back: true, wind: { amp: 9, speed: 0.66, root: 'bottom' } },
        { name: 'coralR', x: -600, wind: { amp: 2.4, speed: 0.58, root: 'bottom' } },
        { name: 'tubeR', x: -200, wind: { amp: 1.6, speed: 0.5, root: 'bottom' } },
        { name: 'weedL', x: 2480, back: true, wind: { amp: 9, speed: 0.72, root: 'bottom' } },
        { name: 'coralL', x: 2260, wind: { amp: 2.4, speed: 0.62, root: 'bottom' } },
        { name: 'coralL2', x: 2620, wind: { amp: 2, speed: 0.68, root: 'bottom' } },
    ];
    // Mirrored copies overlap their original by SEAM px, so the soft last column of a picture never shows as a line
    const SEAM = 1.5;

    const L = {};
    const pending = [];
    let lastT = 0;

    const build = (s) => {
        // The currents of the water: the band along the top (mirrored on both sides, its tongues breathing) and the two
        // that come in from the sides, each with its mirror past the frame, breathing
        const band = s.depth(zFor(DEPTH.band));
        L.bandNode = band;
        // (no wind in the shader: a picture and its mirror would sway apart at their seam)
        L.bandGroup = band.group();
        L.band = [-1, 0, 1].map((side) => {
            const node = L.bandGroup.image('/assets/armonia/current0.webp');
            if (side) node.sx = -1;
            return { node, side };
        });
        band.enter({ y: -24, delay: 100, duration: 2200 });
        const currents = s.depth(zFor(DEPTH.currents));
        L.currentsNode = currents;
        L.currents = art.currents.slice(1).map((C, i) => {
            const group = currents.group();
            const pictures = [0, 1].map((mirror) => {
                const node = group.image(`/assets/armonia/${C.name}.webp`);
                if (mirror) node.sx = -1;
                return node;
            });
            return { C, group, pictures, left: !!C.sides[0], phase: i * 2.1 };
        });
        currents.enter({ y: -16, delay: 250, duration: 2200 });
        // Behind the sand: a seaweed and a tube coral
        const back = s.depth(zFor(DEPTH.back));
        L.backNode = back;
        L.weedR = back.image('/assets/armonia/weedR.webp', { wind: { amp: 9, speed: 0.7, root: 'bottom' } });
        L.tubeL = back.image('/assets/armonia/tubeL.webp', { wind: { amp: 1.6, speed: 0.6, root: 'bottom' } });
        L.beyondBack = BEYOND.filter((b) => b.back).map((b) => ({ ...b, node: back.image(`/assets/armonia/${b.name}.webp`, { wind: b.wind }) }));
        back.enter({ y: 30, delay: 150, duration: 1800 });
        // The sand, going on past the frame, with the light of the water across it
        const sand = s.depth(zFor(DEPTH.sand));
        L.sandNode = sand;
        L.sand = [-1, 0, 1].map((side) => {
            const node = sand.image('/assets/armonia/sand.webp', { water: 0.9 });
            if (side) node.sx = -1;
            return { node, side };
        });
        sand.enter({ y: 40, delay: 100, duration: 1700 });
        // The jellyfish: a glow behind each bell (code), the tentacles trailing, the bell and its closed eyes
        const deep = s.depth(zFor(DEPTH.jellies));
        L.jelliesNode = deep;
        jellies.forEach((J) => {
            J.group = deep.group();
            J.glow = J.group.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: 0xf0f27e, stops: [[0, 0.5], [0.36, 0.24], [0.68, 0]] });
        });
        jellies.forEach((J) => {
            J.tent = J.group.image(`/assets/armonia/tent${J.side}.webp`, { wind: { amp: 16, speed: 0.55 + J.i * 0.07, root: 'top' } });
            J.bell = J.group.image(`/assets/armonia/bell${J.side}.webp`);
            J.eyes = J.group.image(`/assets/armonia/eyes${J.side}.webp`);
        });
        // The rulito, born between the two bells, over them
        L.rulito = deep.canvas(rulito.value.canvas, { bloom: true });
        deep.enter({ y: 60, delay: 350, duration: 2400 });
        // In front: the corals, the other seaweed and the anemones, with a glow over each crown (code)
        const front = s.depth(zFor(DEPTH.front));
        L.frontNode = front;
        L.beyondFront = BEYOND.filter((b) => !b.back).map((b) => ({ ...b, node: front.image(`/assets/armonia/${b.name}.webp`, { wind: b.wind }) }));
        L.coralR = front.image('/assets/armonia/coralR.webp', { wind: { amp: 2.4, speed: 0.6, root: 'bottom' } });
        L.tubeR = front.image('/assets/armonia/tubeR.webp', { wind: { amp: 1.6, speed: 0.55, root: 'bottom' } });
        anemones.forEach((A) => {
            A.glows = A.sways.map(() => front.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: 0xf3f59a, stops: [[0, 0.45], [0.38, 0.18], [0.7, 0]], bloom: true }));
            A.node = front.image(`/assets/armonia/${A.name}.webp`, { sway: true, crop: [-ROOM.side, -ROOM.top, 1 + 2 * ROOM.side, 1 + ROOM.top] });
            if (A.name === 'anemR') {
                L.coralL = front.image('/assets/armonia/coralL.webp', { wind: { amp: 2.4, speed: 0.65, root: 'bottom' } });
                L.weedL = front.image('/assets/armonia/weedL.webp', { wind: { amp: 9, speed: 0.75, root: 'bottom' } });
                L.coralL2 = front.image('/assets/armonia/coralL2.webp', { wind: { amp: 2, speed: 0.7, root: 'bottom' } });
            }
        });
        front.enter({ y: 50, delay: 200, duration: 1800 });
    };

    // The water, from the card: teal above the currents, then green
    const paintWater = (h) => {
        const stops = art.water.map(([y, c]) => `#${c.toString(16).padStart(6, '0')} ${(sy(y) / h * 100).toFixed(1)}%`);
        root.value.style.background = `linear-gradient(to bottom, ${stops.join(', ')})`;
    };

    const place = (w, h) => {
        W = w; H = h;
        layout(w, h);
        paintWater(h);
        const band = rectOf(B.current0);
        L.band.forEach(({ node, side }) => node.place({ ...band, left: band.left + side * (band.w - SEAM) }));
        L.bandGroup.pivot = { x: w / 2, y: band.top };
        L.currents.forEach((c) => {
            const r = rectOf(B[c.C.name]);
            const edge = c.left ? r.left : r.left + r.w;
            c.pictures[0].place(r);
            c.pictures[1].place({ ...r, left: c.left ? r.left - r.w + SEAM : r.left + r.w - SEAM });
            c.group.pivot = { x: edge, y: r.top + r.h / 2 };
        });
        L.weedR.place(rectOf(B.weedR));
        L.tubeL.place(rectOf(B.tubeL));
        const sand = rectOf(B.sand);
        L.sand.forEach(({ node, side }) => node.place({ ...sand, left: sand.left + side * (sand.w - SEAM) }));
        [...L.beyondBack, ...L.beyondFront].forEach((b) => {
            const r = rectOf(B[b.name]);
            b.node.sx = -1;
            b.node.place({ ...r, left: sx(b.x) });
            b.node.opacity = F.x > 8 || F.x + F.size < w - 8 ? 1 : 0;
        });
        jellies.forEach((J) => {
            const bell = rectOf(B[`bell${J.side}`]);
            const rim = { x: sx(J.rim[0]), y: sy(J.rim[1]) };
            J.group.pivot = rim;
            J.tent.place(rectOf(B[`tent${J.side}`]), { x: rim.x, y: rectOf(B[`tent${J.side}`]).top });
            J.bell.place(bell, { x: bell.left + bell.w / 2, y: bell.top + bell.h });
            const eyes = rectOf(B[`eyes${J.side}`]);
            J.eyes.place(eyes);
            const g = bell.w * 2.3;
            J.glow.place({ left: bell.left + bell.w / 2 - g / 2, top: bell.top + bell.h * 0.48 - g / 2, w: g, h: g });
        });
        L.coralR.place(rectOf(B.coralR));
        L.tubeR.place(rectOf(B.tubeR));
        L.coralL.place(rectOf(B.coralL));
        L.weedL.place(rectOf(B.weedL));
        L.coralL2.place(rectOf(B.coralL2));
        anemones.forEach((A) => {
            const r = rectOf(B[A.name]);
            A.node.place({ left: r.left - ROOM.side * r.w, top: r.top - ROOM.top * r.h, w: r.w * (1 + 2 * ROOM.side), h: r.h * (1 + ROOM.top) });
            A.sways.forEach((c, j) => {
                const d = c.cw * k() * 1.7;
                A.glows[j].place({ left: sx(c.x) - d / 2, top: sy(c.y) - d * 0.75, w: d, h: d });
            });
        });
        // Where the crowns are out of the frame (a phone upright), the lights go to the beads over the jellyfish instead
        beadsShown = CROWNS.some(({ c }) => sx(c.x) < 8 || sx(c.x) > w - 8 || sy(c.y) > h - 8);
        // The rulito between the two bells (its canvas is bigger than the glyph, for the glow)
        const rh = RULITO.h * k(), rw = rh * 32 / 86;
        glyph = { left: sx(RULITO.x) - rw / 2, top: sy(RULITO.top), w: rw, h: rh };
        L.rulito.place({ left: glyph.left - 0.4375 * glyph.w, top: glyph.top - 0.1628 * glyph.h, w: glyph.w * 1.875, h: glyph.h * 1.3256 },
            { x: glyph.left + glyph.w / 2, y: glyph.top + glyph.h });
        placeHits();
    };

    // ---- Where things are on screen now
    const bellAt = (J) => {
        const b = J.group.boxOnScreen(rectOf(B[`bell${J.side}`]));
        return { x: b.left + b.width / 2, y: b.top + b.height * 0.55 };
    };
    const crownAt = (i) => {
        const { c } = CROWNS[i];
        const drift = stage.drift(L.frontNode.z);
        return { x: sx(c.x) + drift.x, y: sy(c.y) - c.cw * k() * 0.15 + drift.y + L.frontNode.y };
    };
    const beadAt = (i) => {
        const gap = Math.max(18, BEADS.gap * k());
        const drift = stage ? stage.drift(L.jelliesNode.z) : { x: 0, y: 0 };
        return { x: sx(BEADS.x) + (i - (CROWNS.length - 1) / 2) * gap + drift.x, y: sy(BEADS.y) + drift.y + (L.jelliesNode?.y ?? 0) };
    };
    // Where the light of a crown goes: to the crown, or to its bead where the crowns are out of the frame
    const lightAt = (i) => (beadsShown ? beadAt(i) : crownAt(i));
    const rulitoAt = () => {
        const drift = stage.drift(L.jelliesNode.z);
        return { x: glyph.left + glyph.w / 2 + drift.x, y: glyph.top + glyph.h * 0.5 + drift.y + L.jelliesNode.y };
    };

    // ---- Touches
    const pulse = (J, t, strength = 1) => {
        J.extra = strength;
        J.extraAt = t;
        J.shine = Math.max(J.shine, strength);
        dust?.boost(1 + J.i, 1.1 * strength);
    };
    // The follower, touched on a beat of the leader: it beats with it, comes a little closer, and a crown lights up
    const touchFollower = () => {
        if (!stage) return;
        const J = jellies[FOLLOWER];
        lastTouch = lastT;
        hintAt = lastT + AGAIN;
        hintUntil = -Infinity;
        if (reduced || win) { play('tap'); if (!reduced) J.shine = Math.max(J.shine, 0.4); return; }
        const first = !heard;
        heard = true;
        const n = beatOf(lastT);
        const off = lastT - n * BEAT;
        // Touched again on a beat it already answered: nothing, it is not a stumble
        if (spoken === n) return;
        if (!isBeat(n) || off < -EARLY || off > LATE || missed === n) {
            // The first touch, before the beat was heard, is not a stumble: it starts the sound, and the leader beats
            // bright on its next beat, to show where it is
            if (first) { callAt = nextBeat(lastT); return; }
            // Out of time, or on the rest: a muted drop, nothing lost; this beat is gone, the next one can be caught
            missed = n;
            play('miss');
            falter = 1;
            callAt = nextBeat(lastT);
            return;
        }
        spoken = n;
        play('resonate', { step: (said % 4) / 4 });
        said += 1;
        pulse(J, lastT, 1);
        falter = 0;
        const from = bellAt(J);
        sparks.burst(from.x, from.y, { n: 14, colors: [0xf3f59a, CREAM], speed: 80, size: 4.4, spread: 18, life: 1.4 });
        // A light leaves it for the next crown still waiting
        const m = claimed.indexOf(false);
        if (m < 0) return;
        claimed[m] = true;
        const to = lightAt(m);
        const dur = 0.9 + Math.hypot(to.x - from.x, to.y - from.y) / Math.max(W, H, 1) * 0.9;
        for (let j = 0; j < 4; j++) send(from, to, { dur, size: 9 - 1.5 * j, c0: CREAM, c1: 0xf3f59a, arc: 0.18, alpha: 1 - j * 0.18, at: lastT + j * 0.06 });
        pending.push({ at: lastT + dur + 0.05, run: () => arrive(m) });
    };
    const arrive = (m) => {
        on[m] = true;
        flash[m] = 1;
        const p = lightAt(m);
        sparks.burst(p.x, p.y, { n: 12, colors: [0xf3f59a, CREAM], speed: 60, size: 4, spread: beadsShown ? 4 : CROWNS[m].c.cw * k() * 0.3, life: 1.5 });
        const g = CROWNS[m].A.name === 'anemR' ? 3 : 5;
        dust?.boost(g, 0.8);
        dust?.boost(g + 1, 0.8);
        if (on.every(Boolean)) pending.push({ at: lastT + 0.5, run: complete });
    };
    // The six lit: the two beat as one, the major seventh rings open, their light gathers over them and the rulito is born
    const complete = () => {
        if (win || gone) return;
        wins += 1;
        win = { age: 0, head: 0, tail: 0, full: false, fullAt: 0, back: false, pop: 0 };
        rulito.value?.reshape();
        play('converge');
        sceneMilestone('in_time', { times: wins });
        const to = rulitoAt();
        CROWNS.forEach((_, m) => {
            flash[m] = 1;
            const p = lightAt(m);
            for (let j = 0; j < 3; j++) send(p, to, { dur: 1.1 + Math.random() * 0.6, size: 7, c0: 0xf3f59a, c1: CREAM, at: lastT + 0.3 + Math.random() * 0.5, arc: 0.3 });
        });
        jellies.forEach((J) => pulse(J, lastT, 1));
    };
    // The leader is not played: it only shines a little, silent (the follower is where the game is)
    const touchLeader = () => {
        if (!stage) return;
        if (reduced) { play('tap'); return; }
        const J = jellies[LEADER];
        J.shine = Math.max(J.shine, 0.5);
        dust?.boost(1 + J.i, 0.6);
    };
    const strum = () => {
        play('star');
        if (reduced) return;
        dust?.boost(0, 0.9);
        [3, 4, 5, 6].forEach((g) => dust?.boost(g, 0.7));
        jellies.forEach((J) => { J.shine = Math.max(J.shine, 0.5); });
    };
    const onKey = (event, action) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        action();
    };
    // The touch targets follow the bells (and the top of the tentacles)
    const placeHits = () => {
        jellies.forEach((J, i) => {
            const el = hits.value[i];
            if (!el || !J.group) return;
            const [x, y, w, h] = B[`bell${J.side}`];
            const b = J.group.boxOnScreen(rectOf([x, y, w, h * 1.25]));
            // The follower is played: a little more room round it, so a finger that lands near it on the beat counts
            const grow = i === FOLLOWER ? 1.15 : 1;
            const bw = Math.max(56, b.width * grow), bh = Math.max(56, b.height * grow);
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

    let frames = 0;
    const frame = ({ x, y, scroll, t, ramp }) => {
        if (!stage || !L.sandNode) return;
        const dt = Math.min(0.1, Math.max(0, t - lastT));
        lastT = t;
        stage.look(x * SLIDE, y * SLIDE_Y);
        for (let i = pending.length - 1; i >= 0; i--) if (t >= pending[i].at) pending.splice(i, 1)[0].run();
        const m = reduced ? 0 : ramp;
        // ---- The currents breathe: the band's tongues reach down and draw back, the two from the sides come in and out
        L.bandGroup.sy = 1 + 0.025 * Math.sin(t * 0.35) * m;
        L.currents.forEach((c) => {
            const b = Math.sin(t * 0.32 + c.phase);
            c.group.sx = 1 + 0.035 * b * m;
            c.group.y = Math.sin(t * 0.27 + c.phase) * F.size * 0.006 * m;
        });
        L.bandNode.y = scroll * 6;
        L.currentsNode.y = scroll * 10;
        L.backNode.y = scroll * 16;
        L.sandNode.y = scroll * 18;
        L.jelliesNode.y = scroll * 24;
        L.frontNode.y = scroll * 30;
        // ---- The leader's bar: on each beat (not on the rest) it is heard while someone plays; in the hint it sends the
        // beat to the follower, which answers it
        const step = Math.floor(t / BEAT);
        if (step !== lastStep && ramp > 0.9 && !reduced) {
            lastStep = step;
            if (isBeat(step)) {
                if (heard && t - lastTouch < LISTEN && !win) play('pulse', { step: mod(step) === 0 ? 0 : 0.5 });
                if (t >= hintFrom && t < hintUntil) {
                    const from = bellAt(jellies[LEADER]), to = bellAt(jellies[FOLLOWER]);
                    for (let j = 0; j < 3; j++) send(from, to, { dur: 0.32, size: 6 - j, c0: CREAM, c1: 0xf3f59a, arc: 0.25, alpha: 0.85, at: t + j * 0.04 });
                    pending.push({ at: t + 0.34, run: () => pulse(jellies[FOLLOWER], lastT, 0.6) });
                }
            }
        }
        // The hint starts at the top of a bar and lasts one bar
        if (!win && !reduced && ramp > 0.9 && t > hintAt) {
            const bar = BAR.length * BEAT;
            hintFrom = Math.ceil(t / bar) * bar - 0.05;
            hintUntil = hintFrom + bar;
            hintAt = hintUntil + AGAIN;
        }
        missed = missed !== null && missed < beatOf(t) - 1 ? null : missed;
        // After a touch out of time, the leader beats bright on its next beat: there is the beat
        if (callAt !== null && t >= callAt) { callAt = null; pulse(jellies[LEADER], t, 1); }

        // ---- The win: the rulito is born over the two, kept, gone; then the crowns go back to waiting
        let named = 0;
        if (win && rulito.value) {
            win.age += dt;
            win.pop = Math.max(0, win.pop - dt * 2.2);
            win.head = 1 - (1 - Math.min(1, Math.max(0, (win.age - DELAY) / GROW))) ** 1.6;
            if (win.head >= 1 && !win.full) { win.full = true; win.fullAt = win.age; win.pop = 1; play('rulito'); jellies.forEach((J) => pulse(J, t, 0.8)); }
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
        L.rulito.y = Math.sin(t * 0.38) * F.size * 0.006 * m;
        stageEl?.style.setProperty('--name-glow', named.toFixed(3));
        const count = on.filter(Boolean).length;
        // The follower comes closer with each crown lit, and beats as one with the leader while the rulito lives; then
        // it drifts slowly back to its own breathing
        const goal = reduced ? 0 : win && !win.back ? 1 : count / CROWNS.length;
        together += (goal - together) * Math.min(1, dt * (goal > together ? 1.2 : 0.18));
        const g = ease(together);
        stage.bloom = Math.max(named, 0.25 * g * g);

        // ---- The jellyfish: the leader beats its bar; the follower its own slow stroke, nearer the leader's the closer
        // it has come (and a stroke of its own when touched), rising with it; leaning together
        const lean = reduced ? 0 : ease(leanOf(t));
        const led = leaderStroke(t);
        falter = Math.max(0, falter - dt * 1.6);
        const lo = ease(falter);
        jellies.forEach((J) => {
            const lead = J.i === LEADER;
            const p = ((t / PULSE + J.phase) % 1 + 1) % 1;
            const own = lead ? led : (1 - g) * stroke(p) + g * led;
            const since = (t - J.extraAt) / 1.6;
            const c = Math.max(own * m, since >= 0 && since < 1 ? J.extra * stroke(since) : 0);
            const lost = lead ? 0 : lo;
            J.shine = Math.max(0, J.shine - dt * 0.9);
            J.bell.sx = (1 - 0.045 * c) * (1 - 0.06 * lost);
            J.bell.sy = (1 + 0.03 * c) * (1 - 0.08 * lost);
            J.tent.sx = 1 - 0.03 * c;
            J.tent.sy = 1 - 0.015 * c;
            // Rising after each stroke and sinking slowly, plus a slow float, the two together (the follower's float
            // falls into step with the leader's as it comes closer)
            J.rise += (c * F.size * 0.02 - J.rise) * Math.min(1, dt * 0.9);
            const apart = lead ? 0 : 1 - g;
            J.group.y = Math.sin(t * 0.38 + 0.5 * apart) * F.size * 0.01 * m - J.rise;
            J.group.rotate = (J.i ? -1 : 1) * (2.6 * lean + 1.6 * g) * (reduced ? 0 : 1) + Math.sin(t * 0.3 + 2 * apart) * 0.8 * m
                + Math.sin(t * 26) * 3 * lost;
            J.glow.opacity = (0.55 + 0.25 * c + 0.45 * J.shine + 0.15 * g) * (1 - 0.4 * lost);
            J.glow.scale = 1 + 0.06 * c + 0.12 * J.shine;
            J.bell.uniforms.uBright.value = 1 + 0.08 * J.shine + 0.05 * named;
            // Now and then it squeezes its closed eyes, content
            if (!reduced && t > J.blinkAt + 0.5) J.blinkAt = t + 5 + Math.random() * 7;
            const b = t - J.blinkAt;
            J.eyes.sy = b > 0 && b < 0.5 ? 1 - 0.45 * Math.sin(b / 0.5 * Math.PI) : 1;
            J.eyes.y = b > 0 && b < 0.5 ? -F.size * 0.002 * Math.sin(b / 0.5 * Math.PI) : 0;
            const drift = stage.drift(L.jelliesNode.z);
            dust?.shift(1 + J.i, drift.x + J.group.x, drift.y + J.group.y + L.jelliesNode.y);
            dust?.fade(1 + J.i, 0.8 + 0.2 * c + 0.3 * J.shine);
        });
        // ---- The anemones: each crown leans and stretches on its pot; it waits dim, and once lit glows full and
        // breathes with the leader's beat
        CROWNS.forEach((C, i) => {
            const goal = reduced ? 1 : on[i] ? 1 : DIM;
            lit[i] += (goal - lit[i]) * Math.min(1, dt * (on[i] ? 3 : 0.5));
            flash[i] = Math.max(0, flash[i] - dt * 0.9);
            C.stretch = 0.06 * flash[i] + (on[i] ? 0.03 * led * m : 0);
            const l = (lit[i] - DIM) / (1 - DIM);
            const glow = C.A.glows[C.j];
            glow.opacity = reduced ? 0.6 : Math.min(1, 0.2 + 0.12 * Math.sin(t * 0.9 + C.c.phase) + 0.6 * l + 0.15 * l * led + 0.5 * flash[i]);
            glow.scale = 1 + 0.18 * flash[i] + 0.06 * l * led;
        });
        anemones.forEach((A) => {
            // A cluster waits a little dim, and brightens with each of its crowns lit
            const mine = CROWNS.map((C, i) => i).filter((i) => CROWNS[i].A === A);
            const shine = mine.reduce((sum, i) => sum + (lit[i] - DIM) / (1 - DIM) + 0.6 * flash[i], 0) / mine.length;
            A.node.uniforms.uBright.value = reduced ? 1 : 0.9 + 0.22 * shine;
            A.node.sways = A.sways.map((c, j) => {
                const C = CROWNS.find((x) => x.A === A && x.j === j);
                return [c.u, c.v, c.w, Math.sin(t * 0.8 + c.phase) * 5 * m, 1 + (0.05 * Math.sin(t * 1.25 + c.phase * 1.3) + C.stretch) * m];
            });
        });
        // The beads, gone while the rulito lives
        beadsVis += ((!reduced && !(win && win.age > 1) ? 1 : 0) - beadsVis) * Math.min(1, dt * 2);
        const front = stage.drift(L.frontNode.z), deep = stage.drift(L.jelliesNode.z);
        [3, 4, 5, 6].forEach((g) => dust?.shift(g, front.x, front.y + L.frontNode.y));
        dust?.shift(0, deep.x, deep.y + L.jelliesNode.y);
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
        const fromArt = (list, colour, scale = 1) => list.map(([x, y, r]) => [sx(x), sy(y), Math.max(1.2, 2 * r * k() * scale), colour]);
        // The specks of the card and, as dense, over the water the frame does not cover (above it, and on its sides)
        const specks = (w, h) => {
            const own = fromArt(art.motes, SPECK, 1.1);
            const top = sy(B.sand[1]);
            const inFrame = (xx, yy) => xx >= F.x && xx <= F.x + F.size && yy >= F.y;
            const density = art.motes.length / (F.size * B.sand[1] * k());
            const n = Math.min(900, Math.round(density * Math.max(0, w * top - Math.max(0, Math.min(w, F.x + F.size) - Math.max(0, F.x)) * (top - F.y))));
            const extra = [];
            for (let tries = 0; extra.length < n && tries < n * 6; tries++) {
                const xx = Math.random() * w, yy = Math.random() * top;
                if (!inFrame(xx, yy)) extra.push([xx, yy, 1.4 + Math.random() * 2.2, SPECK]);
            }
            return own.concat(extra).filter(([, yy]) => yy < h);
        };
        const lastOf = (A) => A.node;
        const anemR = anemones.find((A) => A.name === 'anemR'), anemL = anemones.find((A) => A.name === 'anemL');
        dust = startStardust(null, {
            stage,
            manual: true,
            groups: [
                // 0: the yellow specks in the water, over everything
                { colors: [SPECK], parallax: 0, drift: 9, jitter: 0.3, twinkle: 0.55, reach: 110, push: 26, look: 'hard', order: 1e6, points: specks },
                // 1, 2: the stipple round each bell, behind the tentacles
                ...jellies.map((J) => ({ colors: [YELLOW], parallax: 0, drift: 2, jitter: 0.5, twinkle: 0.4, reach: 0, look: 'hard', order: after(jellies[1].glow), points: () => fromArt(art.auras[J.i], YELLOW, 1.6) })),
                // 3, 4: the right anemones' glow, behind them and over the pots
                { colors: [YELLOW], parallax: 0, drift: 2, jitter: 0.5, twinkle: 0.45, reach: 70, push: 10, look: 'hard', order: anemR.node.mesh.renderOrder - 0.5, points: () => fromArt(anemR.back, YELLOW) },
                { colors: [YELLOW], parallax: 0, drift: 1.5, jitter: 0.4, twinkle: 0.45, reach: 0, look: 'hard', order: after(lastOf(anemR)), points: () => fromArt(anemR.front, YELLOW) },
                // 5, 6: the left ones
                { colors: [YELLOW], parallax: 0, drift: 2, jitter: 0.5, twinkle: 0.45, reach: 70, push: 10, look: 'hard', order: anemL.node.mesh.renderOrder - 0.5, points: () => fromArt(anemL.back, YELLOW) },
                { colors: [YELLOW], parallax: 0, drift: 1.5, jitter: 0.4, twinkle: 0.45, reach: 0, look: 'hard', order: after(lastOf(anemL)), points: () => fromArt(anemL.front, YELLOW) },
                // 7: the beads, one for each crown
                { dynamic: beads, look: 'hard', parallax: 0, drift: 0.6, twinkle: 0.15, reach: 0, bloom: true, order: after(L.rulito) },
                // 8: the lights to the crowns, the beat sent in the hint, the light gathering
                { dynamic: flyers, look: 'soft', parallax: 0, drift: 1.2, twinkle: 0.2, reach: 0, bloom: true, order: 1e6 + 1 },
                // 9: sparks
                { ...sparks.group(), order: 1e6 + 2 },
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
    <div class="scene" ref="root" @click="strum">
        <canvas class="stageCanvas" ref="canvas"></canvas>
        <!-- The rulito is drawn on its own canvas, which the stage shows as a texture between the two jellyfish -->
        <Rulito ref="rulito" class="offstage" color="#39509e" />
        <div v-for="(J, i) in jellies" :key="J.side" :ref="(el) => { hits[i] = el; }" class="hit" role="button" tabindex="0"
            :aria-label="$i18n.locale === 'en'
                ? (i ? 'The jellyfish on the right: touch it on each beat of the other one' : 'The jellyfish on the left, keeping the rhythm')
                : (i ? 'La medusa de la derecha: tocala con cada latido de la otra' : 'La medusa de la izquierda, que lleva el ritmo')"
            @pointerdown.prevent="i === FOLLOWER ? touchFollower() : touchLeader()" @click.stop
            @keydown="onKey($event, i === FOLLOWER ? touchFollower : touchLeader)"></div>
    </div>
</template>

<style scoped>
    .scene {
        position: absolute;
        inset: 0;
        overflow: hidden;
        background: #8ccca7;
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
        border-radius: 45%;
        cursor: pointer;
        pointer-events: auto;
        -webkit-tap-highlight-color: transparent;
        /* A tap that slides a little must not be taken for a scroll (the beat would be lost) */
        touch-action: none;
        -webkit-touch-callout: none;
        user-select: none;
        -webkit-user-select: none;
        outline: none;
    }
    .offstage {
        position: absolute;
        left: -9999px;
        top: 0;
        width: 40px;
        visibility: hidden;
    }
    .hit:focus-visible {
        outline: 2px solid rgba(57, 80, 158, 0.85);
        outline-offset: 2px;
    }
</style>
