<script setup>
    // Paciencia: the little larvae in their boat, drifting over a field of coral and mushrooms under a stippled sun.
    // The layers come from the artwork itself (public/assets/collaborate) and move with different depth:
    // the ground (mushrooms with the grass behind them) travels most with the pointer, the sun least. The air
    // above the mushrooms is a spore system drawn on a canvas (useSpores), not a picture.
    import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { createParallax, enterLayers } from '../../composables/useParallax.js';
    import { createSpores } from '../../composables/useSpores.js';
    import { play } from '../../composables/useSound.js';
    import cone from '../../composables/pineCone.json';

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
    const sparkCanvas = ref(null);
    const coneHit = ref(null);
    const lit = ref(false);                 // the pine cone is being pressed
    const hot = ref(false);                 // the pointer is over it
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

    // Pressing the pine cone makes it shine: it lights up while held, fades slowly once let go, and throws sparks
    const shine = () => {
        lit.value = true;
        play('star');
        if (!reduced) {
            const box = coneHit.value.getBoundingClientRect();
            spores?.burst(box.left + box.width / 2, box.top + box.height / 2, 22);
        }
        window.addEventListener('pointerup', dim, { once: true });
        window.addEventListener('pointercancel', dim, { once: true });
    };
    const dim = () => { lit.value = false; };
    const onKey = (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        shine();
        setTimeout(dim, 700);
    };
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
        spores = createSpores(sporeCanvas.value, { source: mushrooms.value, front: sparkCanvas.value, animate: !window.matchMedia('(prefers-reduced-motion: reduce)').matches });
        enter();
    });
    watch(() => props.active, enter);
    onBeforeUnmount(() => {
        parallax?.destroy();
        spores?.destroy();
        window.removeEventListener('pointerup', dim);
        window.removeEventListener('pointercancel', dim);
    });
</script>

<template>
    <div class="scene" ref="root" :class="{ lit, hot }">
        <img class="layer sun" ref="sun" src="/assets/collaborate/sun.webp" alt="" draggable="false">
        <img class="layer boat" ref="boat" src="/assets/collaborate/boat.webp" alt="" draggable="false">
        <!-- The spore cloud hangs in the air behind the mushrooms -->
        <canvas class="spores" ref="sporeCanvas"></canvas>
        <!-- One piece: the grass sits behind the mushrooms at the same scale, so their stems line up -->
        <div class="ground" ref="ground">
            <img class="grass" src="/assets/collaborate/plants.webp" alt="" draggable="false">
            <img class="mushrooms" ref="mushrooms" src="/assets/collaborate/mushrooms.webp" alt="" draggable="false">
            <!-- The pine cone: its own sprite over the same spot, a glow behind it, and a touch target over both -->
            <div class="coneGlow" :style="{ '--bx': cone.x, '--by': cone.y, '--bw': cone.w, '--bh': cone.h }"></div>
            <img class="cone" src="/assets/collaborate/cone.webp" alt="" draggable="false" :style="{ '--bx': cone.x, '--by': cone.y, '--bw': cone.w }">
            <div class="coneHit" ref="coneHit" role="button" tabindex="0" :aria-label="$i18n.locale === 'en' ? 'Pine cone' : 'Piña'"
                :style="{ '--bx': cone.x, '--by': cone.y, '--bw': cone.w, '--bh': cone.h }"
                @pointerdown.prevent="shine" @pointerenter="hot = true" @pointerleave="hot = false" @keydown="onKey"></div>
        </div>
        <canvas class="spores sparks" ref="sparkCanvas"></canvas>
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

    /* The pine cone sits exactly on its place in the mushrooms picture (positions are fractions of it) */
    .ground .cone {
        position: absolute;
        left: calc(var(--bx) * 100%);
        top: calc(var(--by) * 100%);
        width: calc(var(--bw) * 100%);
        pointer-events: none;
        transition: filter 1.1s ease-out;
    }

    /* A faint warmth around the cone, no more than a hint */
    .coneGlow {
        position: absolute;
        left: calc((var(--bx) + var(--bw) / 2) * 100%);
        top: calc((var(--by) + var(--bh) / 2) * 100%);
        width: calc(var(--bw) * 100% * 3.4);
        aspect-ratio: 1;
        translate: -50% -50%;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(255, 240, 140, 0.5) 0%, rgba(255, 232, 110, 0.18) 38%, rgba(255, 226, 90, 0) 70%);
        opacity: 0;
        pointer-events: none;
        transition: opacity 1.2s ease-out;
    }

    .coneHit {
        position: absolute;
        left: calc((var(--bx) - var(--bw) * 0.35) * 100%);
        top: calc((var(--by) - var(--bh) * 0.08) * 100%);
        width: calc(var(--bw) * 100% * 1.7);
        height: calc(var(--bh) * 100% * 1.2);
        border-radius: 50%;
        cursor: pointer;
        pointer-events: auto;
        -webkit-tap-highlight-color: transparent;
        touch-action: manipulation;
        outline: none;
    }

    .coneHit:focus-visible {
        outline: 2px solid rgba(255, 244, 150, 0.9);
        outline-offset: 2px;
    }

    /* Hovered: a faint glow, as if it noticed. Held: it shines more, the way the hero's character does, and breathes. */
    .hot .cone {
        filter: brightness(1.08) drop-shadow(0 0 4px rgba(255, 244, 150, 0.6)) drop-shadow(0 0 10px rgba(255, 236, 110, 0.3));
        transition-duration: 0.35s;
    }

    .hot .coneGlow {
        opacity: 0.5;
        transition-duration: 0.35s;
    }

    .lit .cone {
        filter: brightness(1.3) saturate(1.2) drop-shadow(0 0 7px rgba(255, 244, 150, 1)) drop-shadow(0 0 22px rgba(255, 236, 110, 0.75));
        animation: conePulse 2.8s ease-in-out infinite;
        transition-duration: 0.25s;
    }

    .lit .coneGlow {
        opacity: 1;
        transition-duration: 0.25s;
    }

    @keyframes conePulse {
        0%, 100% { filter: brightness(1.22) saturate(1.14) drop-shadow(0 0 6px rgba(255, 244, 150, 0.85)) drop-shadow(0 0 16px rgba(255, 236, 110, 0.55)); }
        50% { filter: brightness(1.38) saturate(1.24) drop-shadow(0 0 9px rgba(255, 244, 150, 1)) drop-shadow(0 0 28px rgba(255, 236, 110, 0.85)); }
    }

    @media (prefers-reduced-motion: reduce) {
        .ground .cone,
        .coneGlow {
            transition: none;
            animation: none;
        }
    }

    .spores {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
    }
</style>
