<script setup>
    // Belleza: "I recognise my beauty and the beauty of others". In a clearing of a forest of pink trees, under a teal
    // canopy of wavy leaves, two beings sit on the grass in an embrace, eyes closed, wrapped in a glow of yellow dust;
    // by the big tree on the right a ring of little mushrooms glows, and loose motes of light float through the wood.
    // There is no game yet (its verb is Ver: seeing the beauty hidden in the forest). Until then the scene is only alive:
    // the two breathe, each at its own pace, and every HUG s they hold each other a little closer (they lean together,
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
    import { floorFor } from '../../data/stageFloor.js';
    import { createParallax } from '../../composables/useParallax.js';
    import { createLayerStage } from '../../composables/useLayerStage.js';
    import { startStardust } from '../../composables/useStardust.js';
    import { play } from '../../composables/useSound.js';
    import art from '../../composables/bellezaScene.json';

    const props = defineProps({
        card: { type: Object, default: () => ({}) },
        active: Boolean
    });

    const root = ref(null);
    const canvas = ref(null);
    const pairHit = ref(null);
    let stageEl = null;
    let stage = null;
    let parallax = null;
    let dust = null;
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
        F = { x, y: h - floorFor(w, h) - size + (phone ? 0 : DROP * size), size };
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
        // The two, with their glow behind them
        const pair = s.depth(zFor(DEPTH.pair));
        L.pairNode = pair;
        L.pair = pair.group();
        L.warmth = L.pair.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: GLOW, stops: [[0, 0.62], [0.38, 0.28], [0.72, 0]] });
        L.legs = L.pair.image(ASSETS + 'legs.webp');
        L.left = L.pair.image(ASSETS + 'left.webp');
        L.right = L.pair.image(ASSETS + 'right.webp');
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
    };

    // A touch anywhere: a breath of the breeze, the chord strummed, the motes flare
    const strum = () => {
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
        dust?.fade(1, 0.8 + 0.2 * hug);

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
        <div ref="pairHit" class="hit" role="button" tabindex="0"
            :aria-label="$i18n.locale === 'en' ? 'The two in their embrace' : 'Los dos en su abrazo'"
            @click.stop="embrace" @keydown="onKey"></div>
    </div>
</template>

<style scoped>
    .scene {
        position: absolute;
        inset: 0;
        overflow: hidden;
        background: #49afb0;
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
