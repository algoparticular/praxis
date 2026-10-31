<script setup>
    // Esperanza: hope, "I have hope in myself and in the assistance of the Universe". A starry night over the desert: a
    // big moon, half in shadow, hangs over sand dunes with white stones, tufts of grass, little mushrooms and two pink
    // ginkgos, and on the far ridge a little being (Vulpes, the heart) sits with its tail curled, wrapped in a pink aura,
    // looking up at the sky with its eyes closed.
    // No game yet: its verb is Ver ("the invisible threads of light" of the text, under the starry sky), played later.
    // Meanwhile it is alive: the stars twinkle and drift a little, the moon breathes in its own soft light, the grass,
    // the mushrooms and the ginkgos sway in the wind (each tuft on its own), grains of sand blow low over the dunes, the
    // being breathes (its curled tail swells) and now and then lifts its head to the moon and looks about, and its aura
    // breathes with it. A touch strums the chord (`star`) and the stars flare; a touch on the being makes it look up and
    // its aura flare.
    // The sky is not a picture: its flat teal, read from the card by the converter, is the background, with a light
    // round the moon drawn in code; every star is a particle (the card's, and as many again where the frame does not
    // reach), and so are the stipple of the moon's shadow and the being's aura. It is drawn in WebGL (useLayerStage): the
    // moon and the land are planes at their depths; beyond the frame the land goes on (mirrored on each side, without
    // its grass and plants). From esperanzaScene.json and public/assets/esperanza (made by scripts/convert-esperanza.mjs).
    // The card's rulito (the little squiggle in the sky) is not drawn: its box is kept for the game.
    import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { floorFor, floorLayer } from '../../data/stageFloor.js';
    import { createParallax } from '../../composables/useParallax.js';
    import { createLayerStage } from '../../composables/useLayerStage.js';
    import { startStardust } from '../../composables/useStardust.js';
    import { play } from '../../composables/useSound.js';
    import art from '../../composables/esperanzaScene.json';

    const props = defineProps({
        card: { type: Object, default: () => ({}) },
        active: Boolean
    });

    const root = ref(null);
    const canvas = ref(null);
    const beingHit = ref(null);
    let stage = null;
    let stageEl = null;
    const NAME_GLOW = '0.8';
    let parallax = null;
    let dust = null;
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
        F = { x, y: h - floorFor(w, h) - size + (phone ? 0 : DROP * size), size };
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
        play('star');
        dust?.boost(0, 0.9);
        dust?.boost(2, 0.3);
    };
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
        land.enter({ y: 40, delay: 100, duration: 1700 });
    };

    // The ground along the card's bottom edge, for the band under the frame on a phone ([x in art px, colour], read off the card's bottom rows)
    const FLOOR_COLOURS = [[0, '#c4a872']];
    const place = (w, h) => {
        layout(w, h);
        // under the frame on a phone, its sand (stageFloor.js), over the sky
        root.value.style.background = `${floorLayer(F.y + F.size - 30, F, FLOOR_COLOURS)}, #${art.sky.toString(16).padStart(6, '0')}`;
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
        const pulse = 0.5 + 0.5 * Math.sin(t * 1.1 - 0.6);
        L.aura.opacity = Math.min(1, 0.55 + 0.25 * pulse + 0.25 * lookUp);
        L.aura.scale = 1 + 0.06 * pulse * ramp + 0.1 * lookUp;
        dust?.fade(2, 0.75 + 0.25 * pulse + 0.25 * lookUp);

        // The particles that belong to a layer follow it
        const starDrift = stage.drift(zFor(DEPTH.stars)), moonDrift = stage.drift(L.moonNode.z), landDrift = stage.drift(L.landNode.z);
        dust?.shift(0, starDrift.x, starDrift.y + scroll * 6);
        dust?.shift(1, moonDrift.x, moonDrift.y + L.moonNode.y);
        dust?.shift(2, landDrift.x, landDrift.y + L.landNode.y);
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
        <div ref="beingHit" class="hit" role="button" tabindex="0"
            :aria-label="$i18n.locale === 'en' ? 'The little being on the dune' : 'El pequeño ser sobre la duna'"
            @click.stop="touchBeing" @keydown="onKey"></div>
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
</style>
