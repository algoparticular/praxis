<script setup>
    // The default stage: the card's illustration, feathered into the card color, drifting slowly and with a hint of depth.
    // Until a card gets its own scene it is still alive, all in code: a glow that breathes behind the picture, and motes of
    // light in the colours of the card's chord (each note a chakra) rising slowly, moving out of a finger's way. A touch
    // strums the chord (`star`) and the motes flare.
    import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
    import { createParallax } from '../../composables/useParallax.js';
    import { startStardust } from '../../composables/useStardust.js';
    import { play } from '../../composables/useSound.js';
    import { pictureUrl } from '../../data/cards.js';
    import { chordFor } from '../../data/cardChords.js';
    import { chordColors } from '../../data/chordColors.js';

    const props = defineProps({
        card: { type: Object, default: () => ({}) },
        active: Boolean
    });

    const root = ref(null);
    const art = ref(null);
    const glow = ref(null);
    const canvas = ref(null);
    let parallax = null;
    let motes = null;

    const picture = computed(() => {
        const full = props.card.image ? `url(${pictureUrl(props.card)})` : '';
        const thumb = props.card.image ? `url(/cards/thumb/${props.card.id}.webp)` : '';
        return [full, thumb].filter(Boolean).join(',');
    });

    const toHex = (color) => parseInt(color.slice(1), 16);

    const strum = () => {
        play('star');
        motes?.boost(0, 0.8);
        motes?.boost(1, 0.8);
    };

    onMounted(() => {
        parallax = createParallax(root.value, ({ x, y, scroll, t, ramp }) => {
            art.value.style.translate = `${-x * 14}px ${-y * 10 - scroll * 40}px`;
            art.value.style.scale = 1.04 + (Math.sin(t * 0.2) * 0.5 + 0.5) * 0.05 * ramp;
            // The glow breathes slower than the picture drifts, and leans the other way: it seems to be behind it
            glow.value.style.translate = `${x * 8}px ${y * 6 - scroll * 20}px`;
            glow.value.style.opacity = 0.55 + (Math.sin(t * 0.45) * 0.5 + 0.5) * 0.35 * ramp;
        });
        const colors = chordColors(chordFor(props.card.id)).map(toHex);
        const common = { colors, flow: [0, -9], twinkle: 0.7, reach: 110, push: 34, edgeFade: 0.18 };
        motes = startStardust(canvas.value, {
            groups: [
                // Crisp dots, like the stipple of the illustrations
                { ...common, count: 80, size: [2.5, 5], look: 'hard', drift: 14, parallax: 16, opacity: 0.9 },
                // A few soft halos, nearer and slower
                { ...common, count: 26, size: [10, 22], look: 'soft', drift: 22, parallax: 26, opacity: 0.55, flow: [0, -6] },
            ],
        });
    });
    onBeforeUnmount(() => {
        parallax?.destroy();
        motes?.destroy();
    });
</script>

<template>
    <div class="scene flat" ref="root" @click="strum">
        <div class="glow" ref="glow"></div>
        <div class="art" ref="art" :style="{ backgroundImage: picture }"></div>
        <canvas class="motes" ref="canvas" aria-hidden="true"></canvas>
    </div>
</template>

<style scoped>
    .scene {
        position: absolute;
        inset: 0;
        overflow: hidden;
    }

    /* A square the size of the screen's short side (or a bit more), melting into the card color at its edges */
    .art {
        --size: min(100vw, 120svh);
        position: absolute;
        width: var(--size);
        height: var(--size);
        left: calc(50% - var(--size) / 2);
        top: calc(50% - var(--size) / 2);
        background-size: cover;
        background-position: center;
        -webkit-mask-image: linear-gradient(to right, transparent, #000 9%, #000 91%, transparent),
                            linear-gradient(to bottom, transparent, #000 9%, #000 91%, transparent);
        -webkit-mask-composite: source-in;
        mask-image: linear-gradient(to right, transparent, #000 9%, #000 91%, transparent),
                    linear-gradient(to bottom, transparent, #000 9%, #000 91%, transparent);
        mask-composite: intersect;
    }

    /* Behind the picture, reaching past it into the empty card colour above and below: the card's light colour */
    .glow {
        --size: min(150vw, 150svh);
        position: absolute;
        width: var(--size);
        height: var(--size);
        left: calc(50% - var(--size) / 2);
        top: calc(50% - var(--size) / 2);
        background: radial-gradient(closest-side, color-mix(in srgb, v-bind('card.colorAlt ?? "#F7F8F1"') 30%, transparent), transparent);
        opacity: 0.7;
        pointer-events: none;
    }

    .motes {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
    }
</style>
