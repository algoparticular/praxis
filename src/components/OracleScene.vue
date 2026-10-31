<script setup>
    // The illustration of the oracle block of the landing, alive: Sid meditating on his rug, with his deck spread in
    // front of him, a bowl where a hand lets fall grains of light, a candle and, floating behind him, a bonsai in its pot.
    // It is drawn in WebGL on the common stage of the card scenes (useLayerStage): the rug, Sid, the bonsai and the things
    // on the rug are planes at their own depths, moved by the pointer or the tilt (useParallax). Sid breathes in a soft
    // light; the bonsai floats and its crown sways; a band of light runs over the cards now and then; the candle's
    // stippled flame is particles that tremble and flicker in a warm glow drawn in code, and the grains rising from the
    // bowl are particles too, some where the drawing has them and more that keep rising and fading. The sky is not part
    // of it: the block has its own live stars (useStarField.js). From oracleScene.json and public/assets/oracle (made by
    // scripts/convert-oracle.mjs). Without WebGL it is the flat drawing (still.webp); with reduced motion it is still.
    import { onBeforeUnmount, onMounted, ref } from 'vue';
    import art from '../composables/oracleScene.json';

    // Checked here, so the landing does not load the stage's code unless it is used
    const hasWebGL = () => {
        try {
            const test = document.createElement('canvas');
            return !!(test.getContext('webgl2') || test.getContext('webgl'));
        } catch (e) {
            return false;
        }
    };

    const root = ref(null);
    const canvas = ref(null);
    const flat = ref(!hasWebGL());
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let stage = null;
    let parallax = null;
    let dust = null;
    let seen = null;
    let gone = false;
    let started = false;
    const L = {};

    // ---- Layout: the drawing (its box without the sky) fitted in the block's frame, with room round it on the canvas
    // for the bonsai's float, the glows and the parallax
    const B = art.boxes;
    const [AX, AY, AW, AH] = B.still;
    const ROOM = 0.14;                      // the canvas is this much bigger than the frame on every side (see the style)
    let F = { x: 0, y: 0, k: 1 };
    const sx = (x) => F.x + x * F.k;
    const sy = (y) => F.y + y * F.k;
    const rectOf = ([left, top, w, h]) => ({ left: sx(left), top: sy(top), w: w * F.k, h: h * F.k });
    const layout = (w, h) => {
        const iw = w / (1 + 2 * ROOM), ih = h / (1 + 2 * ROOM);
        const k = Math.min(iw / AW, ih / AH);
        F = { k, x: w / 2 - (AX + AW / 2) * k, y: h / 2 + ih / 2 - (AY + AH) * k };
    };

    const SLIDE = 26;
    const zFor = (amp) => amp / (SLIDE + amp);
    const DEPTH = { tree: 4, rug: 12, sid: 14, front: 20 };
    const GOLD = 0xe6e973;
    const FLAME = art.flame;
    const BOWL = [630, 1392];               // where the grains leave the bowl (art px)

    // The grains that keep rising from the bowl: each its own cycle, drifting apart as they rise and fading at the top
    const GRAINS = 46;
    const grains = Array.from({ length: GRAINS }, () => ({ phase: Math.random(), speed: 0.12 + Math.random() * 0.1, side: Math.random() * 2 - 1, wave: Math.random() * 6.28, size: 1.6 + Math.random() * 1.8 }));
    const grainGroup = {
        count: GRAINS,
        update(t, data) {
            const drift = stage.drift(L.front.z);
            grains.forEach((g, i) => {
                const p = (t * g.speed + g.phase) % 1;
                const x = BOWL[0] + g.side * (8 + 50 * p) + Math.sin(t * 1.3 + g.wave + p * 5) * 10 * p;
                const y = BOWL[1] - 20 - p * 330;
                data.positions[i * 3] = sx(x) + drift.x;
                data.positions[i * 3 + 1] = sy(y) + drift.y + L.front.y;
                data.sizes[i] = Math.max(1.2, g.size * F.k * 2.4);
                data.alphas[i] = Math.min(1, p * 8) * (1 - p) ** 1.4 * 0.9;
            });
        },
    };

    const build = (s) => {
        // Behind Sid, floating: the bonsai in its pot
        const back = s.depth(zFor(DEPTH.tree));
        L.backNode = back;
        L.bonsai = back.group();
        L.tree = L.bonsai.image('/assets/oracle/tree.webp', { wind: { amp: 5, speed: 0.7, root: 'bottom' } });
        L.pot = L.bonsai.image('/assets/oracle/pot.webp');
        back.enter({ y: 20, scale: 0.55, delay: 600, duration: 1400 });
        // The rug, and Sid on it in his light
        const rug = s.depth(zFor(DEPTH.rug));
        L.rug = rug.image('/assets/oracle/rug.webp');
        rug.enter({ y: 48, scale: 0.94, duration: 1200 });
        const sid = s.depth(zFor(DEPTH.sid));
        L.sidNode = sid;
        L.aura = sid.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: 0xeef5c8, stops: [[0, 0.4], [0.4, 0.14], [0.72, 0]] });
        L.sid = sid.image('/assets/oracle/sid.webp');
        sid.enter({ y: 48, scale: 0.94, delay: 80, duration: 1200 });
        // On the rug, in front of him: the bowl, the deck and the candle with its warm light
        const front = s.depth(zFor(DEPTH.front));
        L.front = front;
        L.warm = front.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: 0xffe9a0, stops: [[0, 0.5], [0.3, 0.2], [0.65, 0]], bloom: true });
        L.bowl = front.image('/assets/oracle/bowl.webp');
        L.cards = front.image('/assets/oracle/cards.webp', { sheen: 0.7 });
        L.candle = front.image('/assets/oracle/candle.webp');
        front.enter({ y: 30, delay: 250, duration: 1200 });
    };

    const place = (w, h) => {
        layout(w, h);
        const tree = rectOf(B.tree), pot = rectOf(B.pot);
        L.tree.place(tree, { x: tree.left + tree.w / 2, y: tree.top + tree.h });
        L.pot.place(pot);
        L.bonsai.pivot = { x: pot.left + pot.w / 2, y: pot.top + pot.h / 2 };
        L.rug.place(rectOf(B.rug));
        const sid = rectOf(B.sid);
        L.sid.place(sid, { x: sid.left + sid.w / 2, y: sid.top + sid.h * 0.92 });
        const ad = sid.h * 1.15;
        L.aura.place({ left: sid.left + sid.w / 2 - ad / 2, top: sid.top + sid.h * 0.42 - ad / 2, w: ad, h: ad });
        L.bowl.place(rectOf(B.bowl));
        L.cards.place(rectOf(B.cards));
        L.candle.place(rectOf(B.candle));
        const wd = FLAME.h * 4.5 * F.k;
        L.warm.place({ left: sx(FLAME.x) - wd / 2, top: sy(FLAME.y) - wd / 2, w: wd, h: wd });
    };

    const frame = ({ x, y, t, ramp }) => {
        if (!stage) return;
        stage.look(x * SLIDE, y * SLIDE * 0.6);
        // Sid breathes, slowly; his light with him
        const breath = Math.sin(t * 0.9);
        L.sid.sy = 1 + 0.014 * breath * ramp;
        L.sid.sx = 1 - 0.005 * breath * ramp;
        L.aura.opacity = 0.75 + 0.25 * breath;
        L.aura.scale = 1 + 0.04 * breath;
        // The bonsai floats
        L.bonsai.y = Math.sin(t * 0.75) * 7 * ramp;
        L.bonsai.rotate = Math.sin(t * 0.5) * 2 * ramp;
        // The candle's light flickers with its flame
        const flicker = 0.5 * Math.sin(t * 9.3) + 0.3 * Math.sin(t * 13.7 + 1) + 0.2 * Math.sin(t * 4.1);
        L.warm.opacity = 0.8 + 0.12 * flicker;
        L.warm.scale = 1 + 0.04 * flicker;
        const front = stage.drift(L.front.z);
        dust?.shift(0, front.x, front.y + L.front.y);
        dust?.shift(1, front.x, front.y + L.front.y);
        stage.render(t);
    };

    // The entrances begin once the drawing is in view, and the particles with them
    const begin = () => {
        if (started || !stage) return;
        started = true;
        stage.ready().then(() => { if (!gone) { stage.start(); dust?.reveal(); } });
    };

    onMounted(async () => {
        if (flat.value) return;
        let made;
        try {
            const { createLayerStage } = await import('../composables/useLayerStage.js');
            made = await createLayerStage(canvas.value);
        } catch (e) {
            console.warn('The WebGL stage is not available', e);
            flat.value = true;
            return;
        }
        if (gone) { made.destroy(); return; }
        stage = made;
        build(stage);
        stage.onResize((w, h) => place(w, h));
        const { startStardust } = await import('../composables/useStardust.js');
        const { createParallax } = await import('../composables/useParallax.js');
        if (gone) return;
        const after = (node) => node.mesh.renderOrder + 0.5;
        dust = startStardust(null, {
            stage,
            manual: true,
            groups: [
                // 0: the flame, stippled: it trembles and flickers
                { colors: [GOLD, 0xfff6c0], parallax: 0, drift: 1.2, jitter: 0.8, twinkle: 0.6, reach: 0, bloom: true, order: after(L.candle),
                    points: () => FLAME.dots.map(([x, y, r]) => [sx(x), sy(y), Math.max(1.2, 2 * r * F.k * 1.6), GOLD]) },
                // 1: the grains over the bowl, where the drawing has them
                { colors: [GOLD], parallax: 0, drift: 2.5, jitter: 0.3, twinkle: 0.5, reach: 40, push: 10, order: after(L.bowl),
                    points: () => art.sand.map(([x, y, r]) => [sx(x), sy(y), Math.max(1.2, 2 * r * F.k * 1.3), GOLD]) },
                // 2: and the ones that keep rising
                { colors: [GOLD], dynamic: grainGroup, parallax: 0, drift: 0, twinkle: 0.3, reach: 0, order: after(L.bowl) + 0.1 },
            ],
        });
        if (reduced) { stage.start(); dust?.reveal(); }
        parallax = createParallax(root.value, frame);
        seen = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { begin(); seen?.disconnect(); } }, { threshold: 0.3 });
        seen.observe(root.value);
    });

    onBeforeUnmount(() => {
        gone = true;
        seen?.disconnect();
        parallax?.destroy();
        dust?.destroy();
        stage?.destroy();
    });
</script>

<template>
    <div class="oracleScene" ref="root">
        <img v-if="flat" class="still" src="/assets/oracle/still.webp" alt="" loading="lazy" draggable="false">
        <canvas v-else ref="canvas"></canvas>
    </div>
</template>

<style scoped>
    .oracleScene {
        position: absolute;
        inset: 0;
        pointer-events: none;
    }

    /* Bigger than the frame by ROOM on every side (14% of the frame's size, so 14 / 128 of the canvas) */
    canvas {
        position: absolute;
        left: -14%;
        top: -14%;
        width: 128%;
        height: 128%;
        display: block;
    }

    .still {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: contain;
        object-position: center bottom;
    }
</style>
