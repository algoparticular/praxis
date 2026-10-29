<script setup>
    // The default stage: the card's illustration, feathered into the card color, drifting slowly and with a hint of depth
    import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
    import { createParallax } from '../../composables/useParallax.js';
    import { pictureUrl } from '../../data/cards.js';

    const props = defineProps({
        card: { type: Object, default: () => ({}) },
        active: Boolean
    });

    const root = ref(null);
    const art = ref(null);
    let parallax = null;

    const picture = computed(() => {
        const full = props.card.image ? `url(${pictureUrl(props.card)})` : '';
        const thumb = props.card.image ? `url(/cards/thumb/${props.card.id}.webp)` : '';
        return [full, thumb].filter(Boolean).join(',');
    });

    onMounted(() => {
        parallax = createParallax(root.value, ({ x, y, scroll, t, ramp }) => {
            art.value.style.translate = `${-x * 14}px ${-y * 10 - scroll * 40}px`;
            art.value.style.scale = 1.04 + (Math.sin(t * 0.2) * 0.5 + 0.5) * 0.05 * ramp;
        });
    });
    onBeforeUnmount(() => parallax?.destroy());
</script>

<template>
    <div class="scene flat" ref="root">
        <div class="art" ref="art" :style="{ backgroundImage: picture }"></div>
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
</style>
