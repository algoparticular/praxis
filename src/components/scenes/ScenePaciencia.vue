<script setup>
    // Paciencia: the little larvae in their boat, drifting over a field of coral and mushrooms under a stippled sun.
    // Its verb is Arraigar (take root): the pine cone is held, not tapped. While it is held, the rulito over the
    // central Sama's head (a stroke drawn in code, Rulito.vue) is born as a dot, stretches into a line and curls into
    // its loop, taking GROW seconds to be whole (quick at first, easing as it gets there); when it is, it flares, throws sparks and the blue spores multiply
    // (they swell for a few seconds and settle back). Let go and its tail starts
    // to catch up with its head (EAT seconds for the whole stroke) until it shrinks back into a dot and is gone, so
    // no hold is wasted. The next one has another shape.
    // The layers come from the artwork itself (public/assets/collaborate) and move with different depth:
    // the ground (mushrooms with the grass behind them) travels most with the pointer, the sun least. The air
    // above the mushrooms is a spore system drawn on a canvas (useSpores), not a picture.
    import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { createParallax, enterLayers } from '../../composables/useParallax.js';
    import { createSpores } from '../../composables/useSpores.js';
    import { createRoots } from '../../composables/useRoots.js';
    import { play } from '../../composables/useSound.js';
    import Rulito from '../Rulito.vue';
    import cone from '../../composables/pineCone.json';
    import rulitoAt from '../../composables/pacienciaRulito.json';

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
    const rootsCanvas = ref(null);
    const rulito = ref(null);
    const lit = ref(false);                 // the pine cone is being pressed
    const hot = ref(false);                 // the pointer is over it
    let parallax = null;
    let spores = null;
    let roots = null;
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

    const ROOT_TIME = 2.4;                  // seconds of holding for the roots to spread all the way
    const PULSE_TIME = 1.8;                 // seconds the wave of light takes to run along them
    const GROW = 2.6;                       // seconds of holding to draw it whole
    const LINGER = 0.9;                     // seconds a whole rulito stays before its tail starts to go
    const EAT = 3.4;                        // seconds for the tail to go all the way along it
    let held = false;
    let head = 0;                           // how far along its stroke the front of the rulito is (0..1)
    let tail = 0;                           // and the back of it
    let idle = 0;                           // seconds since the cone was let go
    let grown = 0;                          // 0..1, how long it has been held, on its way to GROW
    let rootGrow = 0;                       // 0..1, how far the roots have spread: they stay once grown
    let level = 0;                          // 0..3, times it has been completed: the roots shine more each time
    let wave = -1;                          // where the wave of light is along the roots (0..1), or -1
    let pop = 0;                            // 1 when it completes, down to 0: a little bump in its size
    let full = false;                       // the flare has gone off for this rulito
    let lastT = null;

    // Pressing the pine cone: it lights up while held (and the charge starts to fill)
    const hold = () => {
        if (held) return;
        held = true;
        lit.value = true;
        play('tap');
        // Pressing again while the rulito is still whole celebrates again: the cloud swells anew
        if (head >= 1) { pop = 1; bloom(); }
        if (!reduced) {
            const box = coneHit.value.getBoundingClientRect();
            spores?.burst(box.left + box.width / 2, box.top + box.height / 2, 12);
        }
        window.addEventListener('pointerup', release);
        window.addEventListener('pointercancel', release);
    };
    const release = () => {
        held = false;
        lit.value = false;
        window.removeEventListener('pointerup', release);
        window.removeEventListener('pointercancel', release);
    };
    // With the keyboard the key is the finger: held down it charges, let go it releases
    const onKeyDown = (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        if (!event.repeat) hold();
    };
    const onKeyUp = (event) => {
        if (event.key === 'Enter' || event.key === ' ') release();
    };
    // The charge is full: the rulito flares and throws sparks
    const bloom = () => {
        play('star');
        level = Math.min(3, level + 1);
        wave = 0;
        // The wave runs out of the cone along the roots; each cap lets go of its spores as the light gets to it
        const cone = coneHit.value.getBoundingClientRect();
        spores?.swell(14, cone.left + cone.width / 2, (ground.value.offsetWidth * 0.45) / PULSE_TIME);
        if (reduced || !rulito.value) return;
        const box = rulito.value.$el.getBoundingClientRect();
        spores?.burst(box.left + box.width / 2, box.top + box.height / 2, 36);
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
            // Held, the head of the rulito moves on (and its tail comes back if it had started to go); let go, after a
            // moment the tail catches up with the head. When it has, the rulito is gone and the next one has another shape.
            const dt = lastT === null ? 0 : Math.min(t - lastT, 0.1);
            lastT = t;
            pop = Math.max(0, pop - dt * 2.2);
            if (wave >= 0) { wave += dt / PULSE_TIME; if (wave > 1.4) wave = -1; }
            if (held) {
                idle = 0;
                // First the roots take hold; once they have (a third of the way), the rulito is born. When the roots
                // are already there, from an earlier time, it is born at once.
                rootGrow = Math.min(1, rootGrow + dt / ROOT_TIME);
                if (rootGrow >= 0.3) {
                    // It starts quickly and eases in as it gets there: the dot is out at once, the stroke runs, the loop is a flick
                    grown = Math.min(1, grown + dt / GROW);
                    head = Math.max(head, 1 - (1 - grown) ** 1.6);
                }
                tail = Math.max(0, tail - dt / 0.8);
            } else if (head > 0) {
                idle += dt;
                if (idle > (head >= 1 ? LINGER : 0.2)) tail = Math.min(head, tail + dt / EAT);
            }
            if (head >= 1 && !full) { full = true; pop = 1; bloom(); }
            if (head > 0 && head - tail < 0.0005) { head = 0; tail = 0; grown = 0; full = false; rulito.value.reshape(); }
            const flare = full && head - tail > 0.9 ? Math.max(pop, Math.sin(t * 4) * 0.5 + 0.5) : 0;
            root.value.style.setProperty('--charge', Math.max(head - tail, rootGrow * 0.6).toFixed(3));
            roots.frame({ grow: rootGrow, pulse: wave, level, t });
            rulito.value.frame({ head, tail, flare, t, fade: Math.min(1, (head - tail) * 14) });
            rulito.value.$el.style.rotate = `${(Math.sin(t * 1.8) * 3 * ramp).toFixed(2)}deg`;
            rulito.value.$el.style.scale = (1 + 0.2 * pop * pop).toFixed(3);
        });
        roots = createRoots(rootsCanvas.value);
        spores = createSpores(sporeCanvas.value, { source: mushrooms.value, front: sparkCanvas.value, animate: !window.matchMedia('(prefers-reduced-motion: reduce)').matches });
        enter();
    });
    watch(() => props.active, enter);
    onBeforeUnmount(() => {
        parallax?.destroy();
        spores?.destroy();
        window.removeEventListener('pointerup', release);
        window.removeEventListener('pointercancel', release);
    });
</script>

<template>
    <div class="scene" ref="root" :class="{ lit, hot }">
        <img class="layer sun" ref="sun" src="/assets/collaborate/sun.webp" alt="" draggable="false">
        <!-- The boat without its rulito (that one is drawn in code), and the rulito over the central Sama's head -->
        <div class="layer boat" ref="boat">
            <img class="hull" src="/assets/collaborate/boat-bare.webp" alt="" draggable="false">
            <Rulito ref="rulito" class="rulito" :style="{ '--rx': rulitoAt.x, '--ry': rulitoAt.y, '--rw': rulitoAt.w }" />
        </div>
        <!-- The spore cloud hangs in the air behind the mushrooms -->
        <canvas class="spores" ref="sporeCanvas"></canvas>
        <!-- One piece: the grass sits behind the mushrooms at the same scale, so their stems line up -->
        <div class="ground" ref="ground">
            <img class="grass" src="/assets/collaborate/plants.webp" alt="" draggable="false">
            <img class="mushrooms" ref="mushrooms" src="/assets/collaborate/mushrooms.webp" alt="" draggable="false">
            <!-- The roots: a glowing network over the field, drawn on a canvas of the same size as the mushrooms picture -->
            <canvas class="roots" ref="rootsCanvas"></canvas>
            <!-- The pine cone: its own sprite over the same spot, a glow behind it, and a touch target over both -->
            <div class="coneGlow" :style="{ '--bx': cone.x, '--by': cone.y, '--bw': cone.w, '--bh': cone.h }"></div>
            <img class="cone" src="/assets/collaborate/cone.webp" alt="" draggable="false" :style="{ '--bx': cone.x, '--by': cone.y, '--bw': cone.w }">
            <div class="coneHit" ref="coneHit" role="button" tabindex="0" :aria-label="$i18n.locale === 'en' ? 'Pine cone' : 'Piña'"
                :style="{ '--bx': cone.x, '--by': cone.y, '--bw': cone.w, '--bh': cone.h }"
                @pointerdown.prevent="hold" @pointerenter="hot = true" @pointerleave="hot = false"
                @keydown="onKeyDown" @keyup="onKeyUp" @blur="release"></div>
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
    .boat .hull {
        display: block;
        width: 100%;
        height: auto;
    }

    /* The rulito sits on the central Sama's head: positions are fractions of the boat picture */
    .boat .rulito {
        position: absolute;
        left: calc(var(--rx) * 100%);
        top: calc(var(--ry) * 100%);
        width: calc(var(--rw) * 100%);
        height: auto;
        transform-origin: 50% 100%;
    }

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

    .ground .roots {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        aspect-ratio: 2400 / 225;
        mix-blend-mode: screen;
        pointer-events: none;
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
        scale: calc(1 + var(--charge, 0) * 0.8);
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
