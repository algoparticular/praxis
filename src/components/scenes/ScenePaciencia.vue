<script setup>
    // Paciencia: the little larvae in their boat, drifting over a field of coral and mushrooms under a stippled sun.
    // The layers come from the artwork itself (public/assets/collaborate) and move with different depth:
    // near layers (plants, mushrooms) travel more with the pointer, far ones (sun, dots) less.
    import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { createParallax, enterLayers } from '../../composables/useParallax.js';

    const props = defineProps({
        card: { type: Object, default: () => ({}) },
        active: Boolean
    });

    const root = ref(null);
    const sun = ref(null);
    const dots = ref(null);
    const boat = ref(null);
    const mushrooms = ref(null);
    const plants = ref(null);
    let parallax = null;
    let entered = false;

    const enter = () => {
        if (entered || !props.active) return;
        entered = true;
        enterLayers([
            { el: sun.value, y: -30, scale: 0.6, duration: 1800 },
            { el: dots.value, y: 0, delay: 200, duration: 2200 },
            { el: boat.value, y: 90, delay: 250, duration: 1800 },
            { el: mushrooms.value, y: 140, delay: 450, duration: 1500 },
            { el: plants.value, y: 190, delay: 600, duration: 1500 },
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
            // The stippled dots drift across slowly
            dots.value.style.translate = `${-x * 16 + Math.sin(t * 0.18) * 28 * ramp}px ${-y * 8 - s * 50}px`;
            // The boat bobs and rocks on its own, and follows the pointer a little
            boat.value.style.translate = `${-x * 22}px ${-y * 12 + Math.sin(t * 1.0) * 7 * ramp - s * 70}px`;
            boat.value.style.rotate = `${(Math.sin(t * 0.75) * 2 * ramp - x * 1.4).toFixed(3)}deg`;
            // Near: the coral and the grass sway at the foot of the scene
            mushrooms.value.style.translate = `${-x * 36}px ${-y * 6 + s * 20}px`;
            mushrooms.value.style.rotate = `${(Math.sin(t * 0.9 + 1) * 0.35 * ramp).toFixed(3)}deg`;
            plants.value.style.translate = `${-x * 52}px ${-y * 4 + s * 30}px`;
            plants.value.style.rotate = `${(Math.sin(t * 1.1) * 0.45 * ramp).toFixed(3)}deg`;
        });
        enter();
    });
    watch(() => props.active, enter);
    onBeforeUnmount(() => parallax?.destroy());
</script>

<template>
    <div class="scene" ref="root">
        <img class="layer sun" ref="sun" src="/assets/collaborate/sun.webp" alt="" draggable="false">
        <img class="layer dots" ref="dots" src="/assets/collaborate/particles.webp" alt="" draggable="false">
        <img class="layer boat" ref="boat" src="/assets/collaborate/boat.webp" alt="" draggable="false">
        <img class="layer mushrooms" ref="mushrooms" src="/assets/collaborate/mushrooms.webp" alt="" draggable="false">
        <img class="layer plants" ref="plants" src="/assets/collaborate/plants.webp" alt="" draggable="false">
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

    /* The strips are wider than the screen so they can slide without showing their ends */
    .dots {
        --w: max(130vw, 1100px);
        width: var(--w);
        left: calc(50% - var(--w) / 2);
        top: 25%;
    }

    .boat {
        --w: min(88vw, 54svh, 560px);
        width: var(--w);
        left: calc(50% - var(--w) / 2);
        bottom: calc(var(--strip) * 1.3 + 5svh);
        transform-origin: 50% 85%;
    }

    .mushrooms {
        --w: max(130vw, calc(var(--strip) * 10.67 * 1.1));
        width: var(--w);
        left: calc(50% - var(--w) / 2);
        bottom: calc(var(--strip) * 0.35);
        transform-origin: 50% 100%;
    }

    .plants {
        --w: max(140vw, calc(var(--strip) * 12.2 * 1.1));
        width: var(--w);
        left: calc(50% - var(--w) / 2);
        bottom: -2px;
        transform-origin: 50% 100%;
    }
</style>
