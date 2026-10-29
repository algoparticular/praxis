<script setup>
    // Sincronicidad: two atoms that evolve and find each other, and where they meet a fire is lit. Four bubbles of larvae
    // float in a sequence, from the smallest egg to the embracing pair; every few seconds a glow runs along them, bubble
    // after bubble, and when it reaches the pair sparks come out of the camp fire. Touch a bubble and the sequence starts from it.
    // The fire sits on a small floating island, drawn as it is. Around it, behind the drawings so they never cover them,
    // a halo of particles taken from the flame's own shape (sincroClouds.json) and living flame particles rising from it
    // (useFlame); the night sky is a field of particles too (useStardust).
    // It is drawn in WebGL (useLayerStage): every bubble and the island is a plane at its own depth (the pair nearest,
    // the smallest egg farthest), the camera slides with the pointer or the tilt, and the bubbles' skins shimmer a little.
    // The touch targets are DOM elements kept over the bubbles.
    import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { createParallax } from '../../composables/useParallax.js';
    import { createLayerStage } from '../../composables/useLayerStage.js';
    import { startStardust } from '../../composables/useStardust.js';
    import { createFlame } from '../../composables/useFlame.js';
    import { createSparks } from '../../composables/useSparks.js';
    import { decodeClouds, sampleCloud } from '../../composables/useClouds.js';
    import { play } from '../../composables/useSound.js';
    import clouds from '../../composables/sincroClouds.json';

    const props = defineProps({
        card: { type: Object, default: () => ({}) },
        active: Boolean
    });

    const root = ref(null);
    const canvas = ref(null);
    const hits = ref([]);
    let stage = null;
    let parallax = null;
    let sky = null;
    let entered = false;
    let gone = false;
    let F = { x: 0, y: 0, size: 1 };        // the square frame on screen at rest (px)

    // The camera slides SLIDE px at the edge of a swipe; each layer moves as far as it did (its `depth` px), and 0.6 of
    // that up and down
    const SLIDE = 50;
    const SLIDE_Y = 30;
    const zFor = (amp) => amp / (SLIDE + amp);

    // The island's picture is 1115x847; its flame sits at the right, rising from behind the stones, from the seam below
    const ISLAND = { w: 1115, h: 847, left: 0.36, top: 0.5, width: 0.58 };
    const SEAM = { x: 0.733, y: 0.5455 };
    const glow = decodeClouds(clouds)['flame-glow'];

    // The bubbles, a little smaller than in the card (left, top and width as fractions of the frame), from the smallest
    // egg to the pair; `depth` is how far each moves with the pointer, `speed`, `lift`, `turn`, `phase` its float
    const BUBBLES = [
        { file: 'larva1', size: [97, 121], left: 0.326, top: 0.064, width: 0.058, depth: 12, speed: 0.8, lift: 6, turn: 3, phase: 0 },
        { file: 'larva2', size: [114, 143], left: 0.165, top: 0.096, width: 0.07, depth: 16, speed: 0.65, lift: 7, turn: 3, phase: 2 },
        { file: 'encuentro', size: [372, 327], left: 0.399, top: 0.172, width: 0.242, depth: 26, speed: 0.5, lift: 9, turn: 1.6, phase: 4 },
        { file: 'sincronicidad', size: [454, 431], left: 0.155, top: 0.432, width: 0.27, depth: 36, speed: 0.42, lift: 11, turn: 1.4, phase: 1 },
    ];
    const ISLAND_DEPTH = 18;

    // A square frame, bottom-aligned; on a tall screen lifted towards the middle so the sky is not empty above it
    const layout = (W, H) => {
        const size = Math.min(Math.max(W, 0.55 * H), 0.85 * H, 1.18 * W);
        const bottom = W <= H ? (H - size) * 0.4 : 0;
        F = { x: W / 2 - size / 2, y: H - size - bottom, size };
    };
    const islandRect = () => {
        const w = ISLAND.width * F.size;
        return { left: F.x + ISLAND.left * F.size, top: F.y + ISLAND.top * F.size, w, h: w * ISLAND.h / ISLAND.w };
    };
    const bubbleRect = (b) => {
        const w = b.width * F.size;
        return { left: F.x + b.left * F.size, top: F.y + b.top * F.size, w, h: w * b.size[1] / b.size[0] };
    };

    const L = { bubbles: [] };

    // Living flame: tongues from the base of the picture's flame up to its tip, yellow at the base and pink at the tip
    const anchor = () => {
        if (!L.island) return null;
        const b = L.island.boxOnScreen(islandRect());
        if (!b.width) return null;
        return { x: b.left + SEAM.x * b.width, y: b.top + (SEAM.y + 0.02) * b.height, radius: 0.075 * b.width, height: SEAM.y * b.height * 1.0, unit: b.width / 300 };
    };
    const fire = createFlame({ count: 190, palette: [0xfbf09e, 0xf49f92, 0xe0749c, 0xe0749c], anchor, size: 5.4, rise: 1.3 });
    const sparks = createSparks(360);

    // ---- The sequence: a glow runs bubble after bubble, then sparks come out of the fire
    const PERIOD = 11;
    const STEPS = [
        { start: 0, colors: [0xfbf09e, 0xf49f92] },
        { start: 1.5, colors: [0xfbf09e, 0xf49f92] },
        { start: 3, colors: [0xf49f92, 0xe0749c, 0xfbf09e] },
        { start: 4.6, colors: [0xf49f92, 0xe0749c, 0xfbf09e, 0xffffff] },
    ];
    const IGNITE = 5.6;
    const SPAN = 2.4;                 // seconds a bubble glows
    const bump = (d) => (d <= 0 || d >= SPAN ? 0 : Math.sin(Math.PI * d / SPAN) ** 2);
    let origin = 0;                   // the clock of the sequence starts here; touching a bubble moves it
    let lastCycle = -1;

    const centreOf = (i) => {
        const b = L.bubbles[i].boxOnScreen(bubbleRect(BUBBLES[i]));
        return [b.left + b.width / 2, b.top + b.height / 2, b.width];
    };
    const spark = (i) => {
        const [x, y, w] = centreOf(i);
        sparks.burst(x, y, { n: i === STEPS.length - 1 ? 18 : 9, colors: STEPS[i].colors, speed: 60 + w * 0.25, size: 4.4, spread: w * 0.3, life: 1.8 });
    };
    // When the glow reaches the pair, a few sparks come out of the fire (it is drawn as it is: it does not leap)
    const ignite = () => {
        const a = anchor();
        if (a) sparks.burst(a.x, a.y - a.height * 0.3, { n: 24, colors: [0xfbf09e, 0xf49f92, 0xe0749c, 0xffffff], speed: 120, size: 5, spread: a.radius });
    };

    // Touching a bubble starts the sequence from it
    const evolveFrom = (index) => {
        origin = lastT - STEPS[index].start;
        lastCycle = STEPS[index].start - 0.001;
        spark(index);
        play('tap');
    };
    const onKey = (event, action) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        action();
    };

    const build = (s) => {
        L.island = s.depth(zFor(ISLAND_DEPTH)).image('/assets/cocreate/isla.webp');
        BUBBLES.forEach((b) => L.bubbles.push(s.depth(zFor(b.depth)).image(`/assets/cocreate/${b.file}.webp`, { shimmer: 0.35 })));
        // From the far egg to the near pair (the pair is drawn last, over the island)
        const order = [0, 1, 2, 3];
        order.forEach((i, k) => { L.bubbles[i].mesh.renderOrder = L.island.mesh.renderOrder + 1 + k; });
        L.bubbles[0].enter({ y: -40, scale: 0.6, delay: 100, duration: 1800 });
        L.bubbles[1].enter({ y: -30, scale: 0.6, delay: 250, duration: 1800 });
        L.bubbles[2].enter({ y: 60, scale: 0.8, delay: 400, duration: 1900 });
        L.bubbles[3].enter({ y: 90, scale: 0.85, delay: 600, duration: 2000 });
        L.island.enter({ y: 160, delay: 300, duration: 1700 });
    };

    const place = (W, H) => {
        layout(W, H);
        L.island.place(islandRect());
        BUBBLES.forEach((b, i) => L.bubbles[i].place(bubbleRect(b)));
    };

    const placeHits = () => {
        hits.value.forEach((el, i) => {
            if (!el) return;
            const b = L.bubbles[i].boxOnScreen(bubbleRect(BUBBLES[i]));
            el.style.translate = `${b.left.toFixed(1)}px ${b.top.toFixed(1)}px`;
            el.style.width = `${b.width.toFixed(1)}px`;
            el.style.height = `${b.height.toFixed(1)}px`;
        });
    };

    const enter = () => {
        if (entered || !props.active || !stage) return;
        entered = true;
        stage.ready().then(() => { if (!gone) stage.start(); });
    };

    let lastT = 0;
    let frames = 0;
    const frame = ({ x, y, scroll, t, ramp }) => {
        if (!stage) return;
        const s = scroll;
        lastT = t;
        stage.look(x * SLIDE, y * SLIDE_Y);

        // Where the sequence is now; each time it crosses the start of a step, that step throws its sparks
        const cycle = (((t - origin) % PERIOD) + PERIOD) % PERIOD;
        if (ramp > 0.9) {
            STEPS.forEach((step, i) => { if (lastCycle < step.start && cycle >= step.start) spark(i); });
            if (lastCycle < IGNITE && cycle >= IGNITE) ignite();
        }
        lastCycle = cycle;

        // Each bubble floats on its own slow wave and glows when the sequence passes through it
        BUBBLES.forEach((b, i) => {
            const node = L.bubbles[i];
            const p = bump(cycle - STEPS[i].start);
            node.y = Math.sin(t * b.speed + b.phase) * b.lift * ramp - s * b.depth * 2.2;
            node.rotate = Math.sin(t * b.speed * 0.7 + b.phase) * b.turn * ramp;
            node.scale = 1 + Math.sin(t * b.speed * 0.5 + b.phase + 1) * 0.018 * ramp + 0.07 * p;
            node.uniforms.uBright.value = 1 + 0.3 * p;
            node.uniforms.uSaturate.value = 1 + 0.4 * p;
        });

        // The island floats a little, with the fire on it; the halo of the flame follows it
        L.island.y = Math.sin(t * 0.5 + 2) * 9 * ramp + s * 20;
        L.island.rotate = Math.sin(t * 0.37) * 0.5 * ramp;
        const drift = stage.drift(L.island.z);
        sky?.shift(1, drift.x, drift.y + L.island.y);
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
        stage.onResize((W, H) => place(W, H));
        // Behind every drawing: the night sky, the halo of the flame, the flame and the sparks
        sky = startStardust(null, {
            stage,
            groups: [
                // 0: the night sky
                { count: 380, colors: [0xf6e27c, 0xf6e27c, 0xee6a82, 0xfaf3d4], size: [2.2, 6.5], drift: 7, twinkle: 0.55, reach: 130, push: 34, parallax: 14, order: -20 },
                // 1: the halo of the flame, from its own shape
                { colors: [0xe0749c, 0xf49f92, 0xfbf09e], parallax: 0, drift: 2.4, jitter: 1.1, twinkle: 0.35, reach: 0, look: 'hard', order: -19, points: () => {
                    const r = islandRect();
                    return sampleCloud(glow, (u, v) => [r.left + u / ISLAND.w * r.w, r.top + v / ISLAND.h * r.h], r.w / ISLAND.w, 0.9);
                } },
                { ...fire.group(), order: -18 },
                { ...sparks.group(), order: -17 },
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
        sky?.destroy();
        stage?.destroy();
    });
</script>

<template>
    <div class="scene" ref="root">
        <canvas class="stageCanvas" ref="canvas"></canvas>
        <!-- The sequence, from the smallest egg to the pair that lights the fire -->
        <div v-for="(b, i) in BUBBLES" :key="b.file" :ref="(el) => { hits[i] = el; }" class="bubble" role="button" tabindex="0"
            :aria-label="$i18n.locale === 'en' ? 'Bubble' : 'Burbuja'"
            @pointerdown.prevent="evolveFrom(i)" @keydown="onKey($event, () => evolveFrom(i))"></div>
    </div>
</template>

<style scoped>
    .scene {
        position: absolute;
        inset: 0;
        overflow: hidden;
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

    .bubble:focus-visible {
        outline: 2px solid rgba(255, 244, 150, 0.9);
        outline-offset: 4px;
    }
</style>
