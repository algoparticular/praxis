<script setup>
    // Dana (generosity): two friends on a small green island, one handing the other a little flame, under a sky of
    // real particles. The pair, the flame and the island are separate layers (public/assets/share); the stars are a
    // three.js field (useStardust), and a second tiny one lets sparks rise from the flame.
    import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { createParallax, enterLayers } from '../../composables/useParallax.js';
    import { startStardust } from '../../composables/useStardust.js';

    const props = defineProps({
        card: { type: Object, default: () => ({}) },
        active: Boolean
    });

    const root = ref(null);
    const skyCanvas = ref(null);
    const sparkCanvas = ref(null);
    const pair = ref(null);
    const flame = ref(null);
    const island = ref(null);
    let parallax = null;
    let sky = null;
    let sparks = null;
    let entered = false;

    const enter = () => {
        if (entered || !props.active) return;
        entered = true;
        enterLayers([
            { el: island.value, y: 150, duration: 1700 },
            { el: pair.value, y: 80, delay: 350, duration: 1900 },
            { el: flame.value, y: 30, scale: 0.4, delay: 900, duration: 1800 },
        ]);
    };

    onMounted(() => {
        parallax = createParallax(root.value, ({ x, y, scroll, t, ramp }) => {
            const s = scroll;
            // The friends breathe, a little out of step with the flame between them
            // The island floats, and everything standing on it floats with it
            const bob = Math.sin(t * 0.55) * 9 * ramp;
            pair.value.style.translate = `${-x * 20}px ${-y * 8 + bob - s * 50}px`;
            pair.value.style.scale = `1 ${(1 + Math.sin(t * 0.9) * 0.006 * ramp).toFixed(4)}`;
            pair.value.style.rotate = `${(Math.sin(t * 0.35) * 0.35 * ramp).toFixed(3)}deg`;
            // The flame bobs, and sways a touch with the breeze of the pointer
            const flicker = 0.5 + 0.5 * Math.sin(t * 5.1) * Math.sin(t * 3.3 + 1);
            flame.value.style.translate = `${-x * 28}px ${-y * 10 + bob + Math.sin(t * 1.3) * 6 * ramp - s * 60}px`;
            flame.value.style.rotate = `${(Math.sin(t * 1.7) * 3 * ramp - x * 4).toFixed(3)}deg`;
            flame.value.style.filter = `brightness(${(1 + flicker * 0.18).toFixed(3)}) drop-shadow(0 0 ${(8 + flicker * 12).toFixed(1)}px rgba(255, 150, 110, 0.55))`;
            island.value.style.translate = `${-x * 12}px ${-y * 4 + bob + s * 18}px`;
            island.value.style.rotate = `${(Math.sin(t * 0.4) * 0.5 * ramp).toFixed(3)}deg`;
        });
        sky = startStardust(skyCanvas.value, {
            count: 380, colors: [0xf6e27c, 0xf6e27c, 0xee6a82, 0xfaf3d4], size: [2.2, 6.5],
            drift: 7, twinkle: 0.55, reach: 130, push: 34, parallax: 14,
        });
        sparks = startStardust(sparkCanvas.value, {
            count: 36, colors: [0xff9d78, 0xffd2a8, 0xf6e27c], size: [2, 5], look: 'soft',
            flow: [0, -30], drift: 8, twinkle: 0.7, reach: 0, parallax: 4,
        });
        enter();
    });
    watch(() => props.active, enter);
    onBeforeUnmount(() => {
        parallax?.destroy();
        sky?.destroy();
        sparks?.destroy();
    });
</script>

<template>
    <div class="scene" ref="root">
        <canvas class="sky" ref="skyCanvas"></canvas>

        <!-- A square frame, bottom-aligned; every layer is placed as a fraction of it, as in the illustration -->
        <div class="frame">
            <img class="layer island" ref="island" src="/assets/share/island.webp" alt="" draggable="false">
            <img class="layer pair" ref="pair" src="/assets/share/particles.webp" alt="" draggable="false">
            <img class="layer flame" ref="flame" src="/assets/share/fire.webp" alt="" draggable="false">
            <canvas class="sparks" ref="sparkCanvas"></canvas>
        </div>
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

    .frame {
        --s: min(max(100vw, 62svh), 85svh, 135vw);
        position: absolute;
        width: var(--s);
        height: var(--s);
        left: calc(50% - var(--s) / 2);
        bottom: 0;
        pointer-events: none;
    }

    .layer {
        position: absolute;
        display: block;
        height: auto;
        max-width: none;
        translate: 0 0;
        user-select: none;
        pointer-events: none;
    }

    /* Left and top as fractions of the frame, measured from the illustration */
    .pair {
        left: 31.25%;
        top: 11%;
        width: 37.5%;
        transform-origin: 50% 100%;
    }

    .flame {
        left: 47.4%;
        top: 34.6%;
        width: 5%;
    }

    /* A small floating island, whole, with the friends standing on it */
    .island {
        left: 15.5%;
        top: 58.3%;
        width: 69%;
    }

    .sparks {
        position: absolute;
        left: 43.4%;
        top: 24.1%;
        width: 13%;
        height: 13%;
        pointer-events: none;
    }
</style>
