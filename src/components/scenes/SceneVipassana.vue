<script setup>
    // Vipassana: the character in the cell-filled water of the landing's hero, same life, same spiral.
    // Everything here is shared with the hero: the rays, the three.js cell field, the character picture,
    // the dotted spiral and the character's behaviour (useCharacterLife).
    import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { createCellField } from '../../composables/useCellField.js';
    import { createHeroSpiral } from '../../composables/useHeroSpiral.js';
    import { createCharacterLife } from '../../composables/useCharacterLife.js';
    import { createParallax, enterLayers } from '../../composables/useParallax.js';

    const props = defineProps({
        card: { type: Object, default: () => ({}) },
        active: Boolean
    });

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const root = ref(null);
    const rays = ref(null);
    const cellCanvas = ref(null);
    const character = ref(null);
    const spiralCanvas = ref(null);
    const cellsFallback = ref(false);

    let cellField = null;
    let spiral = null;
    let life = null;
    let parallax = null;
    let unmounted = false;
    let scrollLift = 0;
    let entered = false;

    const enter = () => {
        if (entered || !props.active) return;
        entered = true;
        enterLayers([{ el: character.value, y: 60, scale: 0.88, delay: 250, duration: 1700 }]);
        setTimeout(() => life?.start(), reducedMotion ? 0 : 1900);
    };

    onMounted(() => {
        spiral = createHeroSpiral(spiralCanvas.value, { animate: !reducedMotion });
        life = createCharacterLife(character.value, root.value, { spiral, getLift: () => scrollLift });

        createCellField(cellCanvas.value, root.value)
            .then((field) => { unmounted ? field.destroy() : (cellField = field); })
            .catch((error) => {
                console.warn('Cell field unavailable, using static cells', error);
                cellsFallback.value = true;
            });

        // The rays drift a hair with depth; the character also rises a little as the page scrolls
        parallax = createParallax(root.value, ({ x, y, scroll }) => {
            rays.value.style.translate = `${-x * 10}px ${-y * 8}px`;
            scrollLift = -scroll * 70;
        });
        enter();
    });
    watch(() => props.active, enter);

    onBeforeUnmount(() => {
        unmounted = true;
        parallax?.destroy();
        life?.destroy();
        spiral?.destroy();
        cellField?.destroy();
    });
</script>

<template>
    <div class="scene" ref="root">
        <div class="rays" ref="rays"></div>
        <canvas class="cell-field" ref="cellCanvas"></canvas>
        <template v-if="cellsFallback">
            <img class="cell one" src="/assets/hero/cell-one.webp" alt="" draggable="false">
            <img class="cell two" src="/assets/hero/cell-two.webp" alt="" draggable="false">
            <img class="cell three" src="/assets/hero/cell-three.webp" alt="" draggable="false">
        </template>
        <div class="character" ref="character">
            <img class="body" src="/assets/hero/character.webp" alt="" draggable="false">
            <canvas class="spiral" ref="spiralCanvas"></canvas>
        </div>
    </div>
</template>

<style scoped>
    .scene {
        position: absolute;
        inset: 0;
        overflow: hidden;
    }

    /* The light rays of the hero, a little larger than the screen so they can drift */
    .rays {
        position: absolute;
        inset: -24px;
        background-image: url('../../assets/hero/background.webp');
        background-size: cover;
        background-position: center;
    }

    .cell-field {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        opacity: 0;
        transition: opacity 1.4s ease-out;
    }

    .cell {
        position: absolute;
        height: auto;
        pointer-events: none;
    }

    .cell.one { width: 27vw; max-width: 220px; top: 62%; right: 9%; }
    .cell.two { width: 23vw; max-width: 190px; top: 12%; right: 18%; }
    .cell.three { width: 27vw; max-width: 220px; top: 80%; left: 9%; }

    .character {
        --w: min(80vw, 56svh * 0.845, 520px);
        position: absolute;
        width: var(--w);
        aspect-ratio: 868 / 1027;
        left: calc(50% - var(--w) / 2);
        top: calc(54% - var(--w) * 1027 / 868 / 2);
        pointer-events: none;
    }

    .character .body {
        display: block;
        width: 100%;
        height: auto;
        user-select: none;
    }

    .character .spiral {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
    }
</style>
