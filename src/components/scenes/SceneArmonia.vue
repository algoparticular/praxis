<script setup>
    // Armonía: "I vibrate in harmony and in my here and now". Two jellyfish float side by side in a green sea, eyes closed,
    // their long tentacles crossing below them, over a sandy floor with seaweeds, corals and two clusters of anemones,
    // under the teal currents of the water.
    // There is no game yet (its verb will be Resonar, on time: "the variety and proportion of sounds and pauses"), but the
    // scene is alive. The two jellyfish breathe together, a little apart in time: every few seconds each bell contracts and
    // lets go, as a jellyfish swims, and rises a little with it; their tentacles trail in the water (wind in the shader,
    // from the bell down); every LEAN s they lean towards each other for a moment, and now and then one squeezes its closed
    // eyes, content. The yellow stipple round their bells is particles that tremble and breathe with them. The anemones'
    // crowns lean and stretch on their pots (sway), with their glow as particles; the seaweeds and corals sway (wind); the
    // light of the water ripples across the sand (water); the currents breathe (their tongues reach down and draw back); the yellow specks
    // in the water are particles that drift and move out of a finger's way.
    // A touch on a jellyfish makes it pulse and shine, and the other one answers it a moment later (each with a note of the
    // card's chord, `tap`); a touch anywhere else strums the chord (`star`) and the specks and glows flare.
    // The water is not a picture: a gradient from the card's colours (worked out by the converter, teal above the currents,
    // green below), nor the glows behind the bells and the crowns (code). Drawn in WebGL (useLayerStage): every picture a
    // plane at its depth; past the frame the currents and the sand are mirrored on both sides. From armoniaScene.json and
    // public/assets/armonia (made by scripts/convert-armonia.mjs). The touch targets are DOM elements over the jellyfish.
    import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { createParallax } from '../../composables/useParallax.js';
    import { createLayerStage } from '../../composables/useLayerStage.js';
    import { startStardust } from '../../composables/useStardust.js';
    import { play } from '../../composables/useSound.js';
    import art from '../../composables/armoniaScene.json';

    const props = defineProps({
        card: { type: Object, default: () => ({}) },
        active: Boolean
    });

    const root = ref(null);
    const canvas = ref(null);
    const hits = ref([]);
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

    // ---- The jellyfish. PULSE s between two strokes of a bell; the right one a little after the left, as two voices
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
        deep.enter({ y: 60, delay: 350, duration: 2400 });
        // In front: the corals, the other seaweed and the anemones, with a glow over each crown (code)
        const front = s.depth(zFor(DEPTH.front));
        L.frontNode = front;
        L.beyondFront = BEYOND.filter((b) => !b.back).map((b) => ({ ...b, node: front.image(`/assets/armonia/${b.name}.webp`, { wind: b.wind }) }));
        L.coralR = front.image('/assets/armonia/coralR.webp', { wind: { amp: 2.4, speed: 0.6, root: 'bottom' } });
        L.tubeR = front.image('/assets/armonia/tubeR.webp', { wind: { amp: 1.6, speed: 0.55, root: 'bottom' } });
        anemones.forEach((A) => {
            A.glows = A.sways.map(() => front.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: 0xf3f59a, stops: [[0, 0.45], [0.38, 0.18], [0.7, 0]] }));
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
        placeHits();
    };

    // ---- Touches: on a jellyfish it pulses and the other answers; anywhere else the chord is strummed
    const pulse = (J, t, strength = 1) => {
        J.extra = strength;
        J.extraAt = t;
        J.shine = 1;
        dust?.boost(1 + J.i, 1.1 * strength);
    };
    const touchJelly = (i) => {
        if (!stage) return;
        const J = jellies[i];
        play('tap');
        if (reduced) return;
        pulse(J, lastT);
        const other = jellies[1 - i];
        pending.push({ at: lastT + 0.55, run: () => { pulse(other, lastT, 0.8); play('tap'); } });
    };
    const strum = () => {
        play('star');
        if (reduced) return;
        dust?.boost(0, 0.9);
        [3, 4, 5, 6].forEach((g) => dust?.boost(g, 0.7));
        jellies.forEach((J) => { J.shine = Math.max(J.shine, 0.5); });
    };
    const onKey = (event, i) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        touchJelly(i);
    };
    // The touch targets follow the bells (and the top of the tentacles)
    const placeHits = () => {
        jellies.forEach((J, i) => {
            const el = hits.value[i];
            if (!el || !J.group) return;
            const [x, y, w, h] = B[`bell${J.side}`];
            const b = J.group.boxOnScreen(rectOf([x, y, w, h * 1.25]));
            el.style.translate = `${b.left.toFixed(1)}px ${b.top.toFixed(1)}px`;
            el.style.width = `${Math.max(56, b.width).toFixed(1)}px`;
            el.style.height = `${Math.max(56, b.height).toFixed(1)}px`;
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
        // ---- The jellyfish: a stroke of the bell every PULSE s (and when touched), rising with it; leaning together
        const lean = reduced ? 0 : ease(leanOf(t));
        jellies.forEach((J) => {
            const p = ((t / PULSE + J.phase) % 1 + 1) % 1;
            const since = (t - J.extraAt) / 1.6;
            const c = Math.max(stroke(p) * m, since >= 0 && since < 1 ? J.extra * stroke(since) : 0);
            J.shine = Math.max(0, J.shine - dt * 0.9);
            J.bell.sx = 1 - 0.045 * c;
            J.bell.sy = 1 + 0.03 * c;
            J.tent.sx = 1 - 0.03 * c;
            J.tent.sy = 1 - 0.015 * c;
            // Rising after each stroke and sinking slowly, plus a slow float, the two together
            J.rise += (c * F.size * 0.02 - J.rise) * Math.min(1, dt * 0.9);
            J.group.y = Math.sin(t * 0.38 + J.i * 0.5) * F.size * 0.01 * m - J.rise;
            J.group.rotate = (J.i ? -1 : 1) * 2.6 * lean + Math.sin(t * 0.3 + J.i * 2) * 0.8 * m;
            J.glow.opacity = 0.55 + 0.2 * c + 0.45 * J.shine;
            J.glow.scale = 1 + 0.06 * c + 0.12 * J.shine;
            J.bell.uniforms.uBright.value = 1 + 0.08 * J.shine;
            // Now and then it squeezes its closed eyes, content
            if (!reduced && t > J.blinkAt + 0.5) J.blinkAt = t + 5 + Math.random() * 7;
            const b = t - J.blinkAt;
            J.eyes.sy = b > 0 && b < 0.5 ? 1 - 0.45 * Math.sin(b / 0.5 * Math.PI) : 1;
            J.eyes.y = b > 0 && b < 0.5 ? -F.size * 0.002 * Math.sin(b / 0.5 * Math.PI) : 0;
            const drift = stage.drift(L.jelliesNode.z);
            dust?.shift(1 + J.i, drift.x + J.group.x, drift.y + J.group.y + L.jelliesNode.y);
            dust?.fade(1 + J.i, 0.8 + 0.2 * c + 0.3 * J.shine);
        });
        // ---- The anemones: each crown leans and stretches on its pot, its glow breathing
        anemones.forEach((A) => {
            A.node.sways = A.sways.map((c) => [c.u, c.v, c.w, Math.sin(t * 0.8 + c.phase) * 5 * m, 1 + 0.05 * Math.sin(t * 1.25 + c.phase * 1.3) * m]);
            A.glows.forEach((g, j) => { g.opacity = 0.5 + 0.25 * Math.sin(t * 0.9 + A.sways[j].phase); });
        });
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
    <div class="scene" ref="root" @click="strum">
        <canvas class="stageCanvas" ref="canvas"></canvas>
        <div v-for="(J, i) in jellies" :key="J.side" :ref="(el) => { hits[i] = el; }" class="hit" role="button" tabindex="0"
            :aria-label="$i18n.locale === 'en' ? (i ? 'The jellyfish on the right' : 'The jellyfish on the left') : (i ? 'La medusa de la derecha' : 'La medusa de la izquierda')"
            @click.stop="touchJelly(i)" @keydown="onKey($event, i)"></div>
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
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;
        outline: none;
    }
    .hit:focus-visible {
        outline: 2px solid rgba(57, 80, 158, 0.85);
        outline-offset: 2px;
    }
</style>
