<script setup>
    // Creatividad: a living cell-planet crowned with mushrooms, a little larva inside it, in a quiet grey sky.
    // The layers come from the artwork (public/assets/creatividad, cropped from sheets of 3240px: LAYERS gives each
    // one's box as a percentage of that square): the crown of mushrooms turns slowly over the interior, the organelles
    // drift and the larva wanders inside. The colour is code: the interior and the nucleus are plain discs, the
    // nucleus's stipple and the spore dust around the planet are three.js particles (useStardust), and so are the
    // faint dots of the sky. Some orange dust is still baked into the crown's picture; the animated dust lives behind it.
    import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { createParallax, enterLayers } from '../../composables/useParallax.js';
    import { startStardust } from '../../composables/useStardust.js';

    const props = defineProps({
        card: { type: Object, default: () => ({}) },
        active: Boolean
    });

    const root = ref(null);
    const frame = ref(null);
    const skyCanvas = ref(null);
    const dustCanvas = ref(null);      // behind the planet
    const frontCanvas = ref(null);     // in front of it: a few motes and the nucleus's stipple
    const planet = ref(null);
    const crown = ref(null);
    const inside = ref(null);
    const larva = ref(null);
    const organelles = ref(null);
    const vesicles = ref(null);
    const mitochondrion = ref(null);
    const dots = ref(null);
    let parallax = null;
    let sky = null;
    let dust = null;
    let front = null;
    let entered = false;

    // Where each layer sits, in % of the 3240px square it was drawn in (left, top, width, height)
    const LAYERS = {
        crown: { left: 9.475, top: 11.852, w: 78.58, h: 75.71 },
        organelles: { left: 34.66, top: 33.704, w: 32.407, h: 33.241 },
        vesicles: { left: 38.148, top: 53.704, w: 5.525, h: 6.79 },
        mitochondrion: { left: 61.698, top: 45.772, w: 4.321, h: 7.84 },
        dots: { left: 48.765, top: 35.525, w: 3.426, h: 3.519 },
        larva: { left: 42.037, top: 39.167, w: 5.031, h: 9.66 },
    };
    const boxOf = (l) => ({ left: `${l.left}%`, top: `${l.top}%`, width: `${l.w}%`, height: `${l.h}%` });
    const box = Object.fromEntries(Object.entries(LAYERS).map(([name, l]) => [name, boxOf(l)]));

    // The planet's centre and radius in frame fractions: the interior disc's middle, and where the mushrooms start
    const PLANET = { x: 0.5096, y: 0.5049, r: 0.24 };
    // The nucleus, a disc inside it
    const NUCLEUS = { x: 0.5359, y: 0.4694, r: 0.0585 };
    const frameBox = () => {
        const f = frame.value.getBoundingClientRect();
        const c = frontCanvas.value.getBoundingClientRect();
        return { x: f.left - c.left, y: f.top - c.top, size: f.width };
    };
    // Stipple on the nucleus: thicker on its right, like the artwork
    const nucleusStipple = () => {
        const f = frameBox();
        for (;;) {
            const a = Math.random() * Math.PI * 2;
            const d = Math.sqrt(Math.random()) * NUCLEUS.r;
            const u = Math.cos(a) * d / NUCLEUS.r;             // -1 (left) .. 1 (right)
            if (Math.random() > 0.08 + 0.92 * Math.max(0, (u + 0.35) / 1.35) ** 2) continue;
            return [f.x + (NUCLEUS.x + Math.cos(a) * d) * f.size, f.y + (NUCLEUS.y + Math.sin(a) * d) * f.size];
        }
    };
    const around = (w, h) => {
        const f = frameBox();
        const cx = f.x + PLANET.x * f.size;
        const cy = f.y + PLANET.y * f.size;
        const radius = PLANET.r * f.size * (1.02 + Math.abs((Math.random() + Math.random() + Math.random()) / 3 - 0.5) * 2.6);
        const angle = Math.random() * Math.PI * 2;
        return [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius];
    };

    const enter = () => {
        if (entered || !props.active) return;
        entered = true;
        enterLayers([
            { el: planet.value, y: 60, scale: 0.7, duration: 2200 },
            { el: larva.value, y: 0, scale: 0.4, delay: 1200, duration: 1600 },
            { el: organelles.value, y: 0, scale: 0.9, delay: 600, duration: 2000 },
        ]);
    };

    onMounted(() => {
        parallax = createParallax(root.value, ({ x, y, scroll, t, ramp }) => {
            const s = scroll;
            // The planet hangs, breathing, and follows the pointer a little; the crown turns above the interior
            planet.value.style.translate = `${-x * 18}px ${-y * 10 + Math.sin(t * 0.5) * 6 * ramp - s * 50}px`;
            planet.value.style.scale = 1 + Math.sin(t * 0.7) * 0.012 * ramp;
            crown.value.style.rotate = `${(t * 1.8 * ramp).toFixed(3)}deg`;
            inside.value.style.translate = `${-x * 6}px ${-y * 4}px`;
            // The organelles float at their own pace, each a little different
            organelles.value.style.translate = `${(Math.sin(t * 0.13) * 0.8).toFixed(2)}cqw ${(Math.cos(t * 0.11) * 0.7).toFixed(2)}cqw`;
            organelles.value.style.rotate = `${(Math.sin(t * 0.09) * 2.5 * ramp).toFixed(2)}deg`;
            vesicles.value.style.translate = `${(Math.sin(t * 0.23 + 1) * 1.2).toFixed(2)}cqw ${(Math.cos(t * 0.19) * 1.4).toFixed(2)}cqw`;
            mitochondrion.value.style.translate = `${(Math.cos(t * 0.17) * 1.1).toFixed(2)}cqw ${(Math.sin(t * 0.15 + 2) * 1.5).toFixed(2)}cqw`;
            mitochondrion.value.style.rotate = `${(Math.sin(t * 0.21) * 14 * ramp).toFixed(2)}deg`;
            dots.value.style.translate = `${(Math.sin(t * 0.31) * 0.9).toFixed(2)}cqw ${(Math.cos(t * 0.27 + 1) * 0.9).toFixed(2)}cqw`;
            // The nucleus's stipple follows the planet and the interior it sits on
            front?.shift(1, -x * 18 - x * 6, -y * 10 + Math.sin(t * 0.5) * 6 * ramp - s * 50 - y * 4);
            // The larva wanders about inside, unhurried, looking now one way and now the other
            const wx = Math.sin(t * 0.21) * 5.2 + Math.sin(t * 0.47) * 1.6;
            const wy = Math.cos(t * 0.17) * 4.2 + Math.sin(t * 0.39) * 1.4;
            larva.value.style.translate = `${wx.toFixed(2)}cqw ${wy.toFixed(2)}cqw`;
            larva.value.style.rotate = `${(Math.sin(t * 0.6) * 7 * ramp).toFixed(2)}deg`;
        });
        sky = startStardust(skyCanvas.value, {
            count: 150, colors: [0x7c4a6e, 0x8e4f72, 0xa95b78], size: [2, 5],
            drift: 6, twinkle: 0.4, reach: 120, push: 30, parallax: 10, opacity: 0.8,
        });
        // Behind the planet: the animated dust that the baked dust of the crown's picture sits in front of
        dust = startStardust(dustCanvas.value, {
            count: 360, colors: [0xffb069, 0xff9a5c, 0xffd29a, 0xf08a8a], size: [1.6, 4.6], look: 'soft', spawn: around,
            drift: 14, twinkle: 0.7, reach: 150, push: 46, parallax: 18,
        });
        // In front: a few motes drifting across, and the nucleus's stipple (group 1, which follows the planet by hand)
        front = startStardust(frontCanvas.value, {
            groups: [
                {
                    count: 70, colors: [0xffb069, 0xffd29a, 0xf08a8a], size: [1.4, 3.6], look: 'soft', spawn: around,
                    drift: 22, twinkle: 0.7, reach: 150, push: 46, parallax: 26,
                },
                {
                    count: 240, colors: [0x86667e, 0x93718a, 0x7d5d75], size: [1.4, 3.4], look: 'hard', spawn: nucleusStipple,
                    drift: 2, jitter: 0.4, twinkle: 0.15, reach: 0, parallax: 0, opacity: 0.8,
                },
            ],
        });
        enter();
    });
    watch(() => props.active, enter);
    onBeforeUnmount(() => {
        parallax?.destroy();
        sky?.destroy();
        dust?.destroy();
        front?.destroy();
    });
</script>

<template>
    <div class="scene" ref="root">
        <canvas class="sky" ref="skyCanvas"></canvas>
        <canvas class="sky" ref="dustCanvas"></canvas>

        <!-- The planet's layers share one square, so the interior, the crown and the larva line up -->
        <div class="frame" ref="frame">
            <div class="planet" ref="planet">
                <div class="inside" ref="inside">
                    <div class="disc interior"></div>
                    <div class="disc nucleus"></div>
                    <img class="piece" ref="organelles" :style="box.organelles" src="/assets/creatividad/organelos.webp" alt="" draggable="false">
                    <img class="piece" ref="vesicles" :style="box.vesicles" src="/assets/creatividad/vesiculas.webp" alt="" draggable="false">
                    <img class="piece" ref="mitochondrion" :style="box.mitochondrion" src="/assets/creatividad/mitocondria.webp" alt="" draggable="false">
                    <img class="piece" ref="dots" :style="box.dots" src="/assets/creatividad/puntos.webp" alt="" draggable="false">
                    <img class="piece larva" ref="larva" :style="box.larva" src="/assets/creatividad/larva.webp" alt="" draggable="false">
                </div>
                <img class="piece crown" ref="crown" :style="box.crown" src="/assets/creatividad/crown.webp" alt="" draggable="false">
            </div>
        </div>
        <canvas class="sky front" ref="frontCanvas"></canvas>
    </div>
</template>

<style scoped>
    .scene {
        position: absolute;
        inset: 0;
        overflow: hidden;
    }

    .sky {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
    }

    /* The planet's square (3240px in the artwork), centred, big enough that the crown fills the middle of the screen */
    .frame {
        --s: min(max(128vw, 89svh), 160svh);
        position: absolute;
        width: var(--s);
        height: var(--s);
        left: calc(50% - var(--s) / 2);
        top: calc(50% - var(--s) / 2 + 6svh);
        container-type: size;
        pointer-events: none;
    }

    .planet,
    .inside {
        position: absolute;
        inset: 0;
    }

    .piece {
        position: absolute;
        display: block;
        max-width: none;
        user-select: none;
        pointer-events: none;
    }

    /* The colour is code: the cell's interior and the nucleus are plain discs (fractions of the 3240px square) */
    .disc {
        position: absolute;
        border-radius: 50%;
    }

    .interior {
        left: 32.96%;
        top: 32.5%;
        width: 35.99%;
        height: 35.99%;
        background: #7e5e76;
    }

    .nucleus {
        left: 47.75%;
        top: 41.1%;
        width: 11.69%;
        height: 11.69%;
        background: #72556f;
    }

    /* The crown turns about the middle of the interior, which is not the middle of its own picture */
    .crown {
        transform-origin: 52.79% 51.04%;
    }

    /* The larva walks about on its feet */
    .larva {
        transform-origin: 50% 80%;
    }

    .front {
        z-index: 1;
    }
</style>
