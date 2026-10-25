<script setup>
    // Sincronicidad: two atoms that evolve and find each other, and where they meet a fire is lit. Four bubbles of larvae
    // float in a sequence, from the smallest egg to the embracing pair; every few seconds a glow runs along them, bubble
    // after bubble, and when it reaches the pair the camp fire leaps. Touch a bubble and the sequence starts from it.
    // The fire sits on a small floating island: its flame is a second copy of the island's picture, clipped to the flame
    // and made to dance. Around it, behind the drawings so they never cover them, a halo of particles taken from the
    // flame's own shape (sincroClouds.json) and living flame particles rising from it (useFlame); the night sky is a
    // three.js field of particles too (useStardust), all on one canvas.
    import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { createParallax, enterLayers } from '../../composables/useParallax.js';
    import { startStardust } from '../../composables/useStardust.js';
    import { createFlame } from '../../composables/useFlame.js';
    import { createSparks } from '../../composables/useSparks.js';
    import { decodeClouds, sampleCloud } from '../../composables/useClouds.js';
    import { play } from '../../composables/useSound.js';
    import clouds from '../../composables/sincroClouds.json';

    const props = defineProps({
        card: { type: Object, default: () => ({}) },
        active: Boolean
    });

    const root = ref(null);
    const skyCanvas = ref(null);
    const frame = ref(null);
    const island = ref(null);
    const flameImg = ref(null);
    const hug = ref(null);
    const meet = ref(null);
    const small = ref(null);
    const smaller = ref(null);
    let parallax = null;
    let sky = null;
    let entered = false;

    // The island's picture is 1115x847; its flame sits at the right, rising from behind the stones. The flame copy is
    // clipped to the box [59.2%..87.4%] x [0..54.5%] (the base copy has that box cut out), and moves from the seam.
    const ISLAND = { w: 1115, h: 847, left: 0.36, top: 0.5, width: 0.58 };
    const SEAM = { x: 0.733, y: 0.5455 };
    const glow = decodeClouds(clouds)['flame-glow'];

    // The island at rest on the canvas (without the float), and where it is now
    const restBox = (canvas) => {
        const S = frame.value.offsetWidth;
        const f = frame.value.getBoundingClientRect(), page = canvas.getBoundingClientRect();
        const width = ISLAND.width * S;
        return { left: f.left - page.left + ISLAND.left * S, top: f.top - page.top + ISLAND.top * S, width, height: width * ISLAND.h / ISLAND.w };
    };
    const nowBox = (canvas) => {
        const b = island.value.getBoundingClientRect(), page = canvas.getBoundingClientRect();
        return { left: b.left - page.left, top: b.top - page.top, width: b.width, height: b.height };
    };

    // Living flame: tongues from the base of the picture's flame up to its tip, yellow at the base and pink at the tip
    const anchor = () => {
        const canvas = skyCanvas.value;
        if (!canvas || !island.value) return null;
        const b = nowBox(canvas);
        if (!b.width) return null;
        return { x: b.left + SEAM.x * b.width, y: b.top + (SEAM.y + 0.02) * b.height, radius: 0.075 * b.width, height: SEAM.y * b.height * 1.0, unit: b.width / 300 };
    };
    const fire = createFlame({ count: 190, palette: [0xfbf09e, 0xf49f92, 0xe0749c, 0xe0749c], anchor, size: 5.4, rise: 1.3 });
    const sparks = createSparks(360);

    // ---- The sequence: a glow runs bubble after bubble, then the fire leaps
    const PERIOD = 11;
    const STEPS = [
        { ref: smaller, start: 0, colors: [0xfbf09e, 0xf49f92] },
        { ref: small, start: 1.5, colors: [0xfbf09e, 0xf49f92] },
        { ref: meet, start: 3, colors: [0xf49f92, 0xe0749c, 0xfbf09e] },
        { ref: hug, start: 4.6, colors: [0xf49f92, 0xe0749c, 0xfbf09e, 0xffffff] },
    ];
    const IGNITE = 5.6;
    const SPAN = 2.4;                 // seconds a bubble glows
    const bump = (d) => (d <= 0 || d >= SPAN ? 0 : Math.sin(Math.PI * d / SPAN) ** 2);
    let origin = 0;                   // the clock of the sequence starts here; touching a bubble moves it
    let lastCycle = -1;
    let flare = 0;                    // how much the fire is leaping, 0..1

    const centreOf = (el) => {
        const b = el.getBoundingClientRect(), page = skyCanvas.value.getBoundingClientRect();
        return [b.left - page.left + b.width / 2, b.top - page.top + b.height / 2, b.width];
    };
    const spark = (step) => {
        const [x, y, w] = centreOf(step.ref.value);
        sparks.burst(x, y, { n: step.ref === hug ? 18 : 9, colors: step.colors, speed: 60 + w * 0.25, size: 4.4, spread: w * 0.3, life: 1.8 });
    };
    const ignite = () => {
        flare = 1;
        fire.flare(1);
        const a = anchor();
        if (a) sparks.burst(a.x, a.y - a.height * 0.3, { n: 30, colors: [0xfbf09e, 0xf49f92, 0xe0749c, 0xffffff], speed: 120, size: 5, spread: a.radius });
    };

    // Touching a bubble starts the sequence from it
    const evolveFrom = (index) => {
        const step = STEPS[index];
        origin = lastT - step.start;
        lastCycle = step.start - 0.001;
        spark(step);
        play('tap');
    };
    const onKey = (event, action) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        action();
    };
    // Touching the fire makes it leap
    const touchFire = () => {
        ignite();
        play('star');
    };

    let lastT = 0;
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
        let lastFrame = 0;
        parallax = createParallax(root.value, ({ x, y, scroll, t, ramp }) => {
            const s = scroll;
            const dt = Math.min(0.1, Math.max(0, t - lastFrame));
            lastFrame = t;
            lastT = t;
            flare = Math.max(0, flare - dt * 0.8);

            // Where the sequence is now; each time it crosses the start of a step, that step throws its sparks
            const cycle = (((t - origin) % PERIOD) + PERIOD) % PERIOD;
            if (ramp > 0.9) {
                STEPS.forEach((step) => { if (lastCycle < step.start && cycle >= step.start) spark(step); });
                if (lastCycle < IGNITE && cycle >= IGNITE) ignite();
            }
            lastCycle = cycle;

            // Each bubble floats on its own slow wave and glows when the sequence passes through it
            const float = (el, depth, speed, lift, turn, phase, glowAt) => {
                const p = bump(cycle - glowAt);
                const bob = Math.sin(t * speed + phase) * lift * ramp;
                el.style.translate = `${-x * depth}px ${-y * depth * 0.6 + bob - s * depth * 2.2}px`;
                el.style.rotate = `${(Math.sin(t * speed * 0.7 + phase) * turn * ramp).toFixed(3)}deg`;
                el.style.scale = (1 + Math.sin(t * speed * 0.5 + phase + 1) * 0.018 * ramp + 0.07 * p).toFixed(4);
                el.style.filter = p > 0.01 ? `brightness(${(1 + 0.3 * p).toFixed(3)}) saturate(${(1 + 0.4 * p).toFixed(3)})` : '';
            };
            float(smaller.value, 12, 0.8, 6, 3, 0, STEPS[0].start);
            float(small.value, 16, 0.65, 7, 3, 2, STEPS[1].start);
            float(meet.value, 26, 0.5, 9, 1.6, 4, STEPS[2].start);
            float(hug.value, 36, 0.42, 11, 1.4, 1, STEPS[3].start);

            // The island floats a little, with the fire on it
            const bob = Math.sin(t * 0.5 + 2) * 9 * ramp;
            const move = [-x * 18, -y * 6 + bob + s * 20];
            island.value.style.translate = `${move[0]}px ${move[1]}px`;
            island.value.style.rotate = `${(Math.sin(t * 0.37) * 0.5 * ramp).toFixed(3)}deg`;
            sky?.shift(1, move[0], move[1]);                         // the halo follows it

            // The flame itself dances: it stretches, narrows and leans, from the line where it meets the stones
            const flick = Math.sin(t * 7.3) * 0.5 + Math.sin(t * 11.1 + 1) * 0.3 + Math.sin(t * 3.1) * 0.2;
            const lean = Math.sin(t * 2.3) * 3 + Math.sin(t * 5.1 + 2) * 2 - x * 3;
            const tall = 1 + 0.045 * flick * ramp + 0.2 * flare;
            const wide = 1 - 0.02 * flick * ramp + 0.07 * flare;
            flameImg.value.style.transform = `skewX(${lean.toFixed(2)}deg)`;
            flameImg.value.style.scale = `${wide.toFixed(3)} ${tall.toFixed(3)}`;
            flameImg.value.style.filter = flare > 0.02 ? `brightness(${(1 + 0.25 * flare).toFixed(3)})` : '';
        });

        sky = startStardust(skyCanvas.value, {
            groups: [
                // 0: the night sky
                { count: 380, colors: [0xf6e27c, 0xf6e27c, 0xee6a82, 0xfaf3d4], size: [2.2, 6.5], drift: 7, twinkle: 0.55, reach: 130, push: 34, parallax: 14 },
                // 1: the halo of the flame, from its own shape
                { colors: [0xe0749c, 0xf49f92, 0xfbf09e], parallax: 0, drift: 2.4, jitter: 1.1, twinkle: 0.35, reach: 0, look: 'hard', points: () => {
                    const b = restBox(skyCanvas.value);
                    return sampleCloud(glow, (u, v) => [b.left + u / ISLAND.w * b.width, b.top + v / ISLAND.h * b.height], b.width / ISLAND.w, 0.9);
                } },
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
        <div class="frame" ref="frame">
            <!-- The island, drawn twice: the base without the flame, and the flame alone, which dances -->
            <div class="island" ref="island">
                <img class="copy base" src="/assets/cocreate/isla.webp" alt="" draggable="false">
                <img class="copy flame" ref="flameImg" src="/assets/cocreate/isla.webp" alt="" draggable="false">
                <div class="hit fire" role="button" tabindex="0" :aria-label="$i18n.locale === 'en' ? 'Fire' : 'Fuego'"
                    @pointerdown.prevent="touchFire" @keydown="onKey($event, touchFire)"></div>
            </div>

            <!-- The sequence, from the smallest egg to the pair that lights the fire -->
            <img class="layer bubble smaller" ref="smaller" src="/assets/cocreate/larva1.webp" alt="" draggable="false" role="button" tabindex="0"
                @pointerdown.prevent="evolveFrom(0)" @keydown="onKey($event, () => evolveFrom(0))">
            <img class="layer bubble small" ref="small" src="/assets/cocreate/larva2.webp" alt="" draggable="false" role="button" tabindex="0"
                @pointerdown.prevent="evolveFrom(1)" @keydown="onKey($event, () => evolveFrom(1))">
            <img class="layer bubble meet" ref="meet" src="/assets/cocreate/encuentro.webp" alt="" draggable="false" role="button" tabindex="0"
                @pointerdown.prevent="evolveFrom(2)" @keydown="onKey($event, () => evolveFrom(2))">
            <img class="layer bubble hug" ref="hug" src="/assets/cocreate/sincronicidad.webp" alt="" draggable="false" role="button" tabindex="0"
                @pointerdown.prevent="evolveFrom(3)" @keydown="onKey($event, () => evolveFrom(3))">
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

    .bubble {
        pointer-events: auto;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
        touch-action: manipulation;
        outline: none;
    }

    .bubble:focus-visible {
        outline: 2px solid rgba(255, 244, 150, 0.9);
        outline-offset: 4px;
        border-radius: 50%;
    }

    /* The bubbles, a little smaller than in the card, by their centres (left and top as fractions of the frame) */
    .hug     { left: 12%;   top: 48.9%; width: 34%; }
    .meet    { left: 38.3%; top: 19.9%; width: 27.5%; }
    .smaller { left: 32.2%; top: 4.4%;  width: 6.6%; }
    .small   { left: 16%;   top: 13%;   width: 8%; }

    /* The floating island with the fire at its right, whole, with its crystal underneath */
    .island {
        position: absolute;
        left: 36%;
        top: 50%;
        width: 58%;
        aspect-ratio: 1115 / 847;
        pointer-events: none;
    }

    .copy {
        position: absolute;
        inset: 0;
        display: block;
        width: 100%;
        height: 100%;
        max-width: none;
        user-select: none;
        pointer-events: none;
    }

    /* Everything but the flame's box */
    .base {
        clip-path: polygon(0 0, 59.2% 0, 59.2% 54.5%, 87.4% 54.5%, 87.4% 0, 100% 0, 100% 100%, 0 100%);
    }

    /* Only the flame's box, moving from the line where the flame meets the stones */
    .flame {
        clip-path: inset(0 12.6% 45% 59.2%);       /* a hair below the seam, so the two copies overlap */
        transform-origin: 73.3% 54.5%;
    }

    .hit {
        position: absolute;
        border-radius: 50%;
        cursor: pointer;
        pointer-events: auto;
        -webkit-tap-highlight-color: transparent;
        touch-action: manipulation;
        outline: none;
    }

    .hit.fire {
        left: 61%;
        top: 8%;
        width: 25%;
        height: 50%;
    }

    .hit:focus-visible {
        outline: 2px solid rgba(255, 244, 150, 0.9);
        outline-offset: 2px;
    }
</style>
