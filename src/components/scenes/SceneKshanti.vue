<script setup>
    // Khanti (patience): a network of glass flasks joined by pink tubes, a little creature living in each one, over a field
    // of blue dots. The layers come from the artwork (public/assets/kshanti, each cropped to its box: kshantiLayers.json
    // gives left, top, width, height in % of the 2160px square, the area and the main colour of each). The lavender
    // threads sit behind the network and drift against it; the network, the creatures in the flasks and the glass over
    // them float as one group, and each creature has its own small life (breathing, floating, wiggling...). The dots of
    // the sky and the lavender specks are particles (useStardust), behind the drawings; touching a creature makes it
    // flash and throw sparks of its colour, from a canvas in front.
    import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { createParallax, enterLayers } from '../../composables/useParallax.js';
    import { startStardust } from '../../composables/useStardust.js';
    import { createSparks } from '../../composables/useSparks.js';
    import { play } from '../../composables/useSound.js';
    import layers from '../../composables/kshantiLayers.json';

    const props = defineProps({
        card: { type: Object, default: () => ({}) },
        active: Boolean
    });

    const root = ref(null);
    const skyCanvas = ref(null);
    const frontCanvas = ref(null);
    const threads = ref(null);
    const network = ref(null);
    const els = {};
    const setEl = (n) => (el) => { els[n] = el; };
    let parallax = null;
    let sky = null;
    let front = null;
    let entered = false;

    const pct = (v) => `${v}%`;
    const place = ([left, top, w, h]) => ({ left: pct(left), top: pct(top), width: pct(w), height: pct(h) });

    // The big drawings, from back to front, and the creatures and little things between them (the numbers are the
    // artwork's layers: 3 pink bodies, 33 the central sign, 34 glass reflections, 35 outlines)
    const big = { threads: 2, body: 3, shine: 34, lines: 35 };
    const things = Object.keys(layers).map(Number).filter((n) => !Object.values(big).includes(n)).sort((a, b) => a - b)
        .map((n) => ({ n, style: place(layers[n]), area: layers[n][4], color: layers[n][5] }));
    const under = things.filter((t) => t.n < big.shine);        // inside the flasks, under the glass
    const over = things.filter((t) => t.n > big.lines);         // on top of the outlines
    const touchable = things.filter((t) => t.area > 3500).map((t) => {
        const [left, top, w, h] = layers[t.n];
        const size = Math.max(5, w, h) + 1;
        return { ...t, hit: { left: pct((left + w / 2 - size / 2).toFixed(3)), top: pct((top + h / 2 - size / 2).toFixed(3)), width: pct(size.toFixed(3)), height: pct(size.toFixed(3)) } };
    });

    // Each creature's own small life, from its feet or its middle: [kind, origin, speed, amount]
    const LIFE = {
        29: ['breathe', '50% 100%', 0.8, 1],     // the one meditating
        30: ['float', '50% 20%', 0.6, 1],         // the jellyfish
        31: ['tilt', '50% 100%', 0.7, 1], 32: ['tilt', '50% 100%', 0.55, 1],
        28: ['wiggle', '50% 60%', 1.5, 1],        // the little larva
        33: ['pulse', '50% 50%', 0.7, 1],         // the central sign
        25: ['flicker', '50% 100%', 3.1, 1],      // the fire
        27: ['wave', '50% 60%', 0.9, 1],          // the water
        23: ['drift', '50% 50%', 0.35, 1],        // the cloud
        22: ['sway', '50% 100%', 0.6, 1], 26: ['sway', '50% 100%', 0.5, 1],
        11: ['spin', '50% 50%', 0.25, 1], 17: ['spin', '50% 50%', -0.2, 1],
    };

    const live = (t, ramp) => {
        things.forEach(({ n }) => {
            const el = els[n];
            if (!el) return;
            const [kind = 'bob', origin = '50% 50%', speed = 0.5 + (n % 5) * 0.12, amount = 1] = LIFE[n] ?? [];
            const p = t * speed + n * 1.3;
            const s = el.style;
            s.transformOrigin = origin;
            let tx = 0, ty = 0, rot = 0, sx = 1, sy = 1;
            switch (kind) {
                case 'breathe': sy = 1 + Math.sin(p * 1.6) * 0.012; ty = Math.sin(p * 0.8) * 0.18; break;
                case 'float': ty = Math.sin(p * 1.1) * 0.45; rot = Math.sin(p * 0.7) * 3; sy = 1 + Math.sin(p * 1.1 + 1) * 0.02; break;
                case 'tilt': rot = Math.sin(p * 1.3) * 2.6; break;
                case 'wiggle': rot = Math.sin(p * 2.2) * 7; tx = Math.sin(p * 0.9) * 0.15; break;
                case 'pulse': sx = sy = 1 + Math.sin(p * 1.8) * 0.018; break;
                case 'flicker': sy = 1 + Math.sin(p * 3) * 0.035 + Math.sin(p * 5.3) * 0.02; sx = 1 - Math.sin(p * 3) * 0.015; rot = Math.sin(p * 2.1) * 2; break;
                case 'wave': rot = Math.sin(p * 1.5) * 4; ty = Math.sin(p * 1.5 + 1) * 0.12; break;
                case 'drift': tx = Math.sin(p) * 0.5; ty = Math.sin(p * 0.6) * 0.15; break;
                case 'sway': rot = Math.sin(p * 1.4) * 3.5; break;
                case 'spin': rot = (p * 40) % 360; break;
                default: ty = Math.sin(p * 1.4) * 0.22; tx = Math.cos(p * 0.9) * 0.12; rot = Math.sin(p * 1.1) * 3;
            }
            const k = ramp * amount;
            s.translate = `${(tx * k).toFixed(3)}cqw ${(ty * k).toFixed(3)}cqw`;
            s.rotate = `${(rot * k).toFixed(2)}deg`;
            s.scale = `${(1 + (sx - 1) * k).toFixed(4)} ${(1 + (sy - 1) * k).toFixed(4)}`;
        });
    };

    // Touching a creature: it flashes and throws sparks of its own colour
    const sparks = createSparks(360);
    const touch = (thing, event) => {
        const box = event.currentTarget.getBoundingClientRect();
        const canvas = frontCanvas.value.getBoundingClientRect();
        const c = thing.color;
        const own = [c, ((c >> 16 & 255) * 0.5 + 127) << 16 | ((c >> 8 & 255) * 0.5 + 127) << 8 | ((c & 255) * 0.5 + 127), 0xffffff];
        sparks.burst(box.left + box.width / 2 - canvas.left, box.top + box.height / 2 - canvas.top, { n: 26, colors: own, speed: 120, size: 5, spread: 8 });
        els[thing.n]?.animate({ filter: ['brightness(1)', 'brightness(1.5) saturate(1.3)', 'brightness(1)'] }, { duration: 700, easing: 'ease-out' });
        play(thing.area > 15000 ? 'star' : 'tap');
    };
    const onKey = (thing) => (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        touch(thing, event);
    };

    const enter = () => {
        if (entered || !props.active) return;
        entered = true;
        enterLayers([
            { el: threads.value, y: 40, scale: 0.9, duration: 2200 },
            { el: network.value, y: 70, scale: 0.88, delay: 250, duration: 2000 },
        ]);
    };

    onMounted(() => {
        parallax = createParallax(root.value, ({ x, y, scroll, t, ramp }) => {
            // The threads hang behind and drift against the network; the network floats, its creatures floating in it
            threads.value.style.translate = `${x * 22}px ${y * 12 + Math.sin(t * 0.35) * 8 * ramp - scroll * 20}px`;
            threads.value.style.rotate = `${(Math.sin(t * 0.2) * 0.8 * ramp).toFixed(3)}deg`;
            network.value.style.translate = `${-x * 14}px ${-y * 7 + Math.sin(t * 0.5) * 7 * ramp - scroll * 40}px`;
            network.value.style.rotate = `${(Math.sin(t * 0.27) * 0.35 * ramp).toFixed(3)}deg`;
            live(t, ramp);
        });
        sky = startStardust(skyCanvas.value, {
            groups: [
                { count: 300, colors: [0x007096, 0x007096, 0x1b86a8, 0x006f96], size: [2, 7], drift: 5, twinkle: 0.3, reach: 130, push: 32, parallax: 12 },
                { count: 26, colors: [0xaaa8d2, 0xb9b7e0], size: [2, 5], drift: 16, twinkle: 0.6, reach: 130, push: 32, parallax: 20 },
            ],
        });
        front = startStardust(frontCanvas.value, { groups: [sparks.group()] });
        enter();
    });
    watch(() => props.active, enter);
    onBeforeUnmount(() => {
        parallax?.destroy();
        sky?.destroy();
        front?.destroy();
    });
</script>

<template>
    <div class="scene" ref="root">
        <canvas class="field" ref="skyCanvas"></canvas>

        <!-- A square frame; every layer is placed as a fraction of it, as in the illustration -->
        <div class="frame">
            <img class="layer" ref="threads" :style="place(layers[big.threads])" src="/assets/kshanti/k2.webp" alt="" draggable="false">

            <div class="network" ref="network">
                <img class="layer" :style="place(layers[big.body])" src="/assets/kshanti/k3.webp" alt="" draggable="false">
                <img v-for="t in under" :key="t.n" class="layer" :ref="setEl(t.n)" :style="t.style" :src="`/assets/kshanti/k${t.n}.webp`" alt="" draggable="false">
                <img class="layer" :style="place(layers[big.shine])" src="/assets/kshanti/k34.webp" alt="" draggable="false">
                <img class="layer" :style="place(layers[big.lines])" src="/assets/kshanti/k35.webp" alt="" draggable="false">
                <img v-for="t in over" :key="t.n" class="layer" :ref="setEl(t.n)" :style="t.style" :src="`/assets/kshanti/k${t.n}.webp`" alt="" draggable="false">
                <div v-for="t in touchable" :key="'hit' + t.n" class="hit" role="button" tabindex="0" :style="t.hit"
                    :aria-label="$i18n.locale === 'en' ? 'Creature' : 'Criatura'"
                    @pointerdown.prevent="touch(t, $event)" @keydown="onKey(t)($event)"></div>
            </div>
        </div>
        <canvas class="field front" ref="frontCanvas"></canvas>
    </div>
</template>

<style scoped>
    .scene {
        position: absolute;
        inset: 0;
        overflow: hidden;
    }

    .field {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
    }

    .front {
        z-index: 1;
    }

    .frame {
        --s: min(max(100vw, 62svh), 85svh, 115vw);
        position: absolute;
        width: var(--s);
        height: var(--s);
        left: calc(50% - var(--s) / 2);
        bottom: 0;
        container-type: size;
        pointer-events: none;
    }

    /* On a tall screen the picture would sit at the bottom with the sky empty above it: lift it towards the middle */
    @media (max-aspect-ratio: 1/1) {
        .frame { bottom: calc((100svh - var(--s)) * 0.4); }
    }

    .network {
        position: absolute;
        inset: 0;
    }

    .layer {
        position: absolute;
        display: block;
        max-width: none;
        user-select: none;
        pointer-events: none;
    }

    .hit {
        position: absolute;
        border-radius: 50%;
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
