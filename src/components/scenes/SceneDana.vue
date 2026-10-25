<script setup>
    // Dana (generosity): two friends standing on a small green island, one handing the other a little flame, under a sky
    // of real particles. The pair, the flame and the island are separate layers (public/assets/share) that move together
    // as one group, so the friends stay planted on the island. All the particles live on one canvas behind the drawings
    // (useStardust), so they never cover them: the stars, and the little flame's living embers (red and yellow, rising
    // from it and circling it), which show around its edges; a touch makes it flare.
    import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { createParallax, enterLayers } from '../../composables/useParallax.js';
    import { startStardust } from '../../composables/useStardust.js';
    import { createFlame } from '../../composables/useFlame.js';
    import { createSparks } from '../../composables/useSparks.js';
    import { play } from '../../composables/useSound.js';

    const props = defineProps({
        card: { type: Object, default: () => ({}) },
        active: Boolean
    });

    const root = ref(null);
    const skyCanvas = ref(null);
    const group = ref(null);
    const pair = ref(null);
    const flame = ref(null);
    const island = ref(null);
    let parallax = null;
    let sky = null;
    let entered = false;

    // The fire-ball picture: where its glass ball is, as fractions of the picture (0.5 across, 0.75 down, 0.285 wide)
    const BALL = { x: 0.5, y: 0.75, r: 0.285 };

    // Where the little flame is on the canvas now
    const anchor = () => {
        const el = flame.value, canvas = skyCanvas.value;
        if (!el || !canvas) return null;
        const box = el.getBoundingClientRect(), page = canvas.getBoundingClientRect();
        if (!box.width) return null;
        const cx = box.left - page.left + BALL.x * box.width;
        const cy = box.top - page.top + BALL.y * box.height;
        const r = BALL.r * box.width;
        return {
            x: cx, y: cy - r * 0.55, radius: r * 0.7, height: box.height * 0.78, unit: box.width / 44,
            halo: { x: cx, y: cy, r },
        };
    };

    const fire = createFlame({ count: 260, halo: 120, palette: [0xffe47d, 0xffb454, 0xf0643c, 0xd93a4a], anchor, size: 6.2 });
    const sparks = createSparks(360);

    // Touching the little flame: it leaps, and sparks fly
    const touch = () => {
        const at = anchor();
        if (!at) return;
        fire.flare(1);
        sparks.burst(at.halo.x, at.halo.y, { n: 34, colors: [0xffe47d, 0xffb454, 0xf0643c, 0xfff3b8], speed: 130, size: 5.2, spread: at.halo.r * 0.5 });
        play('star');
    };
    const onKey = (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        touch();
    };

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
            // The island floats, and everything standing on it floats with it: one group, so the friends never lift off it
            const bob = Math.sin(t * 0.55) * 9 * ramp;
            group.value.style.translate = `${-x * 14}px ${-y * 6 + bob - s * 30}px`;
            // The friends breathe from their feet, and the flame between them bobs a little on its own
            pair.value.style.scale = `1 ${(1 + Math.sin(t * 0.9) * 0.006 * ramp).toFixed(4)}`;
            flame.value.style.translate = `${-x * 6}px ${Math.sin(t * 1.3) * 4 * ramp - y * 4}px`;
            flame.value.style.rotate = `${(Math.sin(t * 1.7) * 3 * ramp - x * 4).toFixed(3)}deg`;
        });
        sky = startStardust(skyCanvas.value, {
            groups: [
                { count: 380, colors: [0xf6e27c, 0xf6e27c, 0xee6a82, 0xfaf3d4], size: [2.2, 6.5], drift: 7, twinkle: 0.55, reach: 130, push: 34, parallax: 14 },
                fire.group(),
                sparks.group(),
            ],
        });
        enter();
    });
    watch(() => props.active, enter);
    onBeforeUnmount(() => {
        parallax?.destroy();
        sky?.destroy();
    });
</script>

<template>
    <div class="scene" ref="root">
        <canvas class="field" ref="skyCanvas"></canvas>

        <!-- A square frame, bottom-aligned; every layer is placed as a fraction of it, as in the illustration -->
        <div class="frame">
            <div class="group" ref="group">
                <img class="layer island" ref="island" src="/assets/share/island.webp" alt="" draggable="false">
                <img class="layer pair" ref="pair" src="/assets/share/particles.webp" alt="" draggable="false">
                <img class="layer flame" ref="flame" src="/assets/share/fire.webp" alt="" draggable="false">
                <div class="hit" role="button" tabindex="0" :aria-label="$i18n.locale === 'en' ? 'Little flame' : 'Llamita'"
                    @pointerdown.prevent="touch" @keydown="onKey"></div>
            </div>
        </div>
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

    .frame {
        --s: min(max(100vw, 62svh), 85svh, 135vw);
        position: absolute;
        width: var(--s);
        height: var(--s);
        left: calc(50% - var(--s) / 2);
        bottom: 0;
        pointer-events: none;
    }

    .group {
        position: absolute;
        inset: 0;
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

    /* Left and top as fractions of the frame, measured from the illustration. The friends' feet end a hair below the
       grass line of the island, so they stand on it. */
    .pair {
        left: 31.25%;
        top: 21.6%;
        width: 37.5%;
        transform-origin: 50% 100%;
    }

    .flame {
        left: 47.4%;
        top: 45.3%;
        width: 5%;
    }

    /* A small floating island, whole */
    .island {
        left: 15.5%;
        top: 58.3%;
        width: 69%;
    }

    /* Over the little flame */
    .hit {
        position: absolute;
        left: 45.2%;
        top: 45.6%;
        width: 9.6%;
        aspect-ratio: 1 / 1.7;
        border-radius: 50%;
        cursor: pointer;
        pointer-events: auto;
        -webkit-tap-highlight-color: transparent;
        touch-action: manipulation;
        outline: none;
    }

    .hit:focus-visible {
        outline: 2px solid rgba(255, 244, 150, 0.9);
        outline-offset: 2px;
    }
</style>
