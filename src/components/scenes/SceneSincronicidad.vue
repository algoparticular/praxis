<script setup>
    // Sincronicidad: bubbles of larvae floating over a camp fire, under a night sky of real particles.
    // The bubbles (public/assets/cocreate) bob and breathe at their own pace; the camp fire sits on a small
    // floating island that drifts on its own. The stars are a three.js particle field (useStardust) instead of a
    // picture, and a second, tiny one lets embers rise from the flame.
    import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { createParallax, enterLayers } from '../../composables/useParallax.js';
    import { startStardust } from '../../composables/useStardust.js';

    const props = defineProps({
        card: { type: Object, default: () => ({}) },
        active: Boolean
    });

    const root = ref(null);
    const skyCanvas = ref(null);
    const emberCanvas = ref(null);
    const hug = ref(null);
    const meet = ref(null);
    const small = ref(null);
    const smaller = ref(null);
    const island = ref(null);
    let parallax = null;
    let sky = null;
    let embers = null;
    let entered = false;

    const enter = () => {
        if (entered || !props.active) return;
        entered = true;
        enterLayers([
            { el: smaller.value, y: -40, scale: 0.6, delay: 100, duration: 1800 },
            { el: small.value, y: -30, scale: 0.6, delay: 250, duration: 1800 },
            { el: meet.value, y: 60, scale: 0.8, delay: 400, duration: 1900 },
            { el: hug.value, y: 90, scale: 0.85, delay: 600, duration: 2000 },
            { el: island.value, y: 160, delay: 300, duration: 1700 },
        ]);
    };

    onMounted(() => {
        parallax = createParallax(root.value, ({ x, y, scroll, t, ramp }) => {
            const s = scroll;
            // Each bubble floats on its own slow wave; the nearer, the more it follows the pointer
            const float = (el, depth, speed, lift, turn, phase) => {
                const bob = Math.sin(t * speed + phase) * lift * ramp;
                el.style.translate = `${-x * depth}px ${-y * depth * 0.6 + bob - s * depth * 2.2}px`;
                el.style.rotate = `${(Math.sin(t * speed * 0.7 + phase) * turn * ramp).toFixed(3)}deg`;
                el.style.scale = 1 + Math.sin(t * speed * 0.5 + phase + 1) * 0.018 * ramp;
            };
            float(smaller.value, 12, 0.8, 6, 3, 0);
            float(small.value, 16, 0.65, 7, 3, 2);
            float(meet.value, 26, 0.5, 9, 1.6, 4);
            float(hug.value, 36, 0.42, 11, 1.4, 1);
            island.value.style.translate = `${-x * 18}px ${-y * 6 + Math.sin(t * 0.5 + 2) * 9 * ramp + s * 20}px`;
            island.value.style.rotate = `${(Math.sin(t * 0.37) * 0.5 * ramp).toFixed(3)}deg`;
        });
        sky = startStardust(skyCanvas.value, {
            count: 380, colors: [0xf6e27c, 0xf6e27c, 0xee6a82, 0xfaf3d4], size: [2.2, 6.5],
            drift: 7, twinkle: 0.55, reach: 130, push: 34, parallax: 14,
        });
        embers = startStardust(emberCanvas.value, {
            count: 46, colors: [0xff8f6a, 0xffc0a0, 0xf6e27c], size: [2, 5], look: 'soft',
            flow: [0, -34], drift: 9, twinkle: 0.7, reach: 0, parallax: 4,
        });
        enter();
    });
    watch(() => props.active, enter);
    onBeforeUnmount(() => {
        parallax?.destroy();
        sky?.destroy();
        embers?.destroy();
    });
</script>

<template>
    <div class="scene" ref="root">
        <canvas class="sky" ref="skyCanvas"></canvas>

        <!-- A square frame, bottom-aligned; every layer is placed as a fraction of it, as in the illustration -->
        <div class="frame">
            <img class="layer island" ref="island" src="/assets/cocreate/isla.webp" alt="" draggable="false">
            <img class="layer smaller" ref="smaller" src="/assets/cocreate/larva1.webp" alt="" draggable="false">
            <img class="layer small" ref="small" src="/assets/cocreate/larva2.webp" alt="" draggable="false">
            <img class="layer meet" ref="meet" src="/assets/cocreate/encuentro.webp" alt="" draggable="false">
            <img class="layer hug" ref="hug" src="/assets/cocreate/sincronicidad.webp" alt="" draggable="false">
            <canvas class="embers" ref="emberCanvas"></canvas>
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
        --s: min(max(100vw, 55svh), 85svh, 118vw);
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
    .hug     { left: 9.5%;  top: 46.5%; width: 39%; }
    .meet    { left: 36%;   top: 18%;  width: 32%; }
    .smaller { left: 31.5%; top: 4%;   width: 7.7%; }
    .small   { left: 15.5%; top: 12.5%; width: 9.3%; }

    /* The floating island with the fire at its right, whole, with its crystal underneath */
    .island {
        left: 36%;
        top: 50%;
        width: 58%;
    }

    /* Embers rise from the flame */
    .embers {
        position: absolute;
        left: 70%;
        top: 38.5%;
        width: 16%;
        height: 15%;
        pointer-events: none;
    }
</style>
