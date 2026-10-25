<script setup>
    // Creatividad: a living cell-planet crowned with mushrooms, a little larva inside it, in a quiet grey sky.
    // The layers come from the artwork (public/assets/inmind): the crown of mushrooms turns slowly over the interior,
    // and the larva wanders inside. The spore dust around the planet is a three.js particle field (useStardust),
    // not a picture, and so are the faint dots of the sky.
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
    const dustCanvas = ref(null);
    const planet = ref(null);
    const crown = ref(null);
    const inside = ref(null);
    const larva = ref(null);
    let parallax = null;
    let sky = null;
    let dust = null;
    let entered = false;

    // The planet's centre and radius in the dust canvas's own pixels, wherever the frame ends up
    const PLANET = { x: 0.512, y: 0.5, r: 0.265 };      // in frame fractions: the mushroom crown's middle
    const around = (w, h) => {
        const box = frame.value.getBoundingClientRect();
        const canvasBox = dustCanvas.value.getBoundingClientRect();
        const cx = box.left - canvasBox.left + PLANET.x * box.width;
        const cy = box.top - canvasBox.top + PLANET.y * box.height;
        const radius = PLANET.r * box.width * (1.02 + Math.abs((Math.random() + Math.random() + Math.random()) / 3 - 0.5) * 2.6);
        const angle = Math.random() * Math.PI * 2;
        return [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius];
    };

    const enter = () => {
        if (entered || !props.active) return;
        entered = true;
        enterLayers([
            { el: planet.value, y: 60, scale: 0.7, duration: 2200 },
            { el: larva.value, y: 0, scale: 0.4, delay: 1200, duration: 1600 },
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
        dust = startStardust(dustCanvas.value, {
            count: 420, colors: [0xffb069, 0xff9a5c, 0xffd29a, 0xf08a8a], size: [1.6, 4.6], look: 'soft', spawn: around,
            drift: 14, twinkle: 0.7, reach: 150, push: 46, parallax: 18,
        });
        enter();
    });
    watch(() => props.active, enter);
    onBeforeUnmount(() => {
        parallax?.destroy();
        sky?.destroy();
        dust?.destroy();
    });
</script>

<template>
    <div class="scene" ref="root">
        <canvas class="sky" ref="skyCanvas"></canvas>

        <!-- The planet's layers share one square, so the interior, the crown and the larva line up -->
        <div class="frame" ref="frame">
            <div class="planet" ref="planet">
                <img class="layer crown" ref="crown" src="/assets/inmind/celula.webp" alt="" draggable="false">
                <img class="layer inside" ref="inside" src="/assets/inmind/interiorfull.webp" alt="" draggable="false">
                <img class="layer larva" ref="larva" src="/assets/inmind/samita.webp" alt="" draggable="false">
            </div>
        </div>
        <canvas class="sky dust" ref="dustCanvas"></canvas>
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

    /* The planet's square (1500px in the artwork), centred, big enough that the crown fills the middle of the screen */
    .frame {
        --s: min(max(120vw, 84svh), 150svh);
        position: absolute;
        width: var(--s);
        height: var(--s);
        left: calc(50% - var(--s) / 2);
        top: calc(50% - var(--s) / 2 + 6svh);
        container-type: size;
        pointer-events: none;
    }

    .planet {
        position: absolute;
        inset: 0;
    }

    .layer {
        position: absolute;
        inset: 0;
        display: block;
        width: 100%;
        height: 100%;
        max-width: none;
        user-select: none;
        pointer-events: none;
    }

    /* The crown turns about the middle of its own picture, which is not the middle of the square */
    .crown {
        transform-origin: 48.8% 49.65%;
    }

    /* The larva: its own small sprite, placed where it sits inside the planet (centre-left) */
    .larva {
        inset: auto;
        left: 41%;
        top: 40%;
        width: 5.2%;
        height: auto;
        transform-origin: 50% 80%;
    }
</style>
