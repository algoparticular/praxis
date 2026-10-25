<script setup>
    // Paciencia: the little larvae in their boat, drifting over a field of coral and mushrooms under a stippled sun.
    // The layers come from the artwork itself (public/assets/collaborate) and move with different depth:
    // the ground (mushrooms with the grass behind them) travels most with the pointer, the sun least. The air
    // above the mushrooms is a spore system drawn on a canvas (useSpores), not a picture.
    import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { createParallax, enterLayers } from '../../composables/useParallax.js';
    import { createSpores } from '../../composables/useSpores.js';

    const props = defineProps({
        card: { type: Object, default: () => ({}) },
        active: Boolean
    });

    const root = ref(null);
    const sun = ref(null);
    const boat = ref(null);
    const ground = ref(null);
    const mushrooms = ref(null);
    const sporeCanvas = ref(null);
    let parallax = null;
    let spores = null;
    let entered = false;

    const enter = () => {
        if (entered || !props.active) return;
        entered = true;
        enterLayers([
            { el: sun.value, y: -30, scale: 0.6, duration: 1800 },
            { el: boat.value, y: 90, delay: 250, duration: 1800 },
            { el: ground.value, y: 170, delay: 450, duration: 1600 },
            { el: sporeCanvas.value, y: 0, delay: 1200, duration: 2400 },
        ]);
    };

    onMounted(() => {
        parallax = createParallax(root.value, ({ x, y, scroll, t, ramp }) => {
            const s = scroll;
            // Far: the sun breathes and glows
            const pulse = Math.sin(t * 0.9) * 0.5 + 0.5;
            sun.value.style.translate = `${-x * 8}px ${-y * 5 - s * 30}px`;
            sun.value.style.scale = 1 + 0.05 * pulse * ramp;
            sun.value.style.filter = `drop-shadow(0 0 ${(14 + 20 * pulse).toFixed(1)}px rgba(255, 255, 255, ${(0.35 + 0.3 * pulse).toFixed(2)}))`;
            // The boat bobs and rocks on its own, and follows the pointer a little
            boat.value.style.translate = `${-x * 22}px ${-y * 12 + Math.sin(t * 1.0) * 7 * ramp - s * 70}px`;
            boat.value.style.rotate = `${(Math.sin(t * 0.75) * 2 * ramp - x * 1.4).toFixed(3)}deg`;
            // The ground is one piece, so the grass behind the mushrooms always lines up with them
            ground.value.style.translate = `${-x * 40}px ${-y * 5 + s * 25}px`;
            ground.value.style.rotate = `${(Math.sin(t * 0.9) * 0.4 * ramp).toFixed(3)}deg`;
        });
        spores = createSpores(sporeCanvas.value, { source: mushrooms.value, animate: !window.matchMedia('(prefers-reduced-motion: reduce)').matches });
        enter();
    });
    watch(() => props.active, enter);
    onBeforeUnmount(() => {
        parallax?.destroy();
        spores?.destroy();
    });
</script>

<template>
    <div class="scene" ref="root">
        <img class="layer sun" ref="sun" src="/assets/collaborate/sun.webp" alt="" draggable="false">
        <img class="layer boat" ref="boat" src="/assets/collaborate/boat.webp" alt="" draggable="false">
        <!-- One piece: the grass sits behind the mushrooms at the same scale, so their stems line up -->
        <div class="ground" ref="ground">
            <img class="grass" src="/assets/collaborate/plants.webp" alt="" draggable="false">
            <img class="mushrooms" ref="mushrooms" src="/assets/collaborate/mushrooms.webp" alt="" draggable="false">
        </div>
        <canvas class="spores" ref="sporeCanvas"></canvas>
    </div>
</template>

<style scoped>
    .scene {
        --strip: clamp(78px, 15svh, 170px);       /* height of the coral and grass strips */
        position: absolute;
        inset: 0;
        overflow: hidden;
    }

    .layer {
        position: absolute;
        display: block;
        height: auto;
        max-width: none;
        user-select: none;
        pointer-events: none;
    }

    .sun {
        top: 14%;
        right: 12%;
        width: clamp(64px, 17vmin, 150px);
    }

    /* On a narrow screen the title spans the width, so the sun steps down beside the boat's curl */
    @media (max-width: 600px) {
        .sun {
            top: 27%;
            right: 7%;
        }
    }

    .boat {
        --w: min(88vw, 54svh, 560px);
        width: var(--w);
        left: calc(50% - var(--w) / 2);
        bottom: calc(var(--strip) * 1.3 + 5svh);
        transform-origin: 50% 85%;
    }

    /* The mushrooms strip, with the grass behind it. Wider than the screen so it can slide without showing its ends;
       it runs past the bottom edge, so the stems are cut there, as in the illustration. */
    .ground {
        --w: max(130vw, calc(var(--strip) * 10.67 * 1.1));
        position: absolute;
        width: var(--w);
        left: calc(50% - var(--w) / 2);
        bottom: calc(var(--strip) * -0.2);
        transform-origin: 50% 100%;
        pointer-events: none;
    }

    .ground img {
        display: block;
        width: 100%;
        height: auto;
        max-width: none;
        user-select: none;
    }

    .ground .mushrooms {
        position: relative;
    }

    .ground .grass {
        position: absolute;
        left: 0;
        bottom: -7%;
    }

    .spores {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
    }
</style>
