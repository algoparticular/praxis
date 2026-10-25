<script setup>
    // Pañña (wisdom): the little one meditating under a stippled sun, in a forest of dark branches, with fireflies
    // and glowing mushrooms. Every layer comes from the artwork (public/assets/panna), all the same 2160px square, so
    // they register by simply stacking. Two scales give depth: the centre (sun, character) lives in a square frame;
    // the surroundings (vignette, branches, leaves, fireflies, mushrooms) are a bigger square, with its left and right
    // halves anchored to the sides of the screen, so on a wide screen the forest still hugs the edges.
    // The golden thread from the sun to the character and the dots of the sky are real particles (useStardust).
    import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { createParallax, enterLayers } from '../../composables/useParallax.js';
    import { startStardust } from '../../composables/useStardust.js';

    const props = defineProps({
        card: { type: Object, default: () => ({}) },
        active: Boolean
    });

    const root = ref(null);
    const skyCanvas = ref(null);
    const threadCanvas = ref(null);
    const backSheets = ref([]);
    const frontSheets = ref([]);
    const sun = ref(null);
    const thread = ref(null);
    const being = ref(null);
    const mushrooms = ref(null);
    const shown = ref(false);
    let parallax = null;
    let sky = null;
    let stream = null;
    let entered = false;

    const IMG = (name) => `/assets/panna/${name}.webp`;

    // The two sides of the forest. Leaves hang from the edge at the height of their stalk (fraction of the picture).
    const LEAF_Y = [0.2115, 0.2955, 0.6995, 0.7835];
    const sides = ['left', 'right'].map((side) => {
        const letter = side === 'left' ? 'l' : 'r';
        const edge = side === 'left' ? '0%' : '100%';
        return {
            side, letter,
            leaves: LEAF_Y.map((y, i) => ({ src: IMG(`leaf-${letter}${i + 1}`), origin: `${edge} ${(y * 100).toFixed(1)}%`, amp: 3 + i * 0.8, dur: 5.2 + i * 0.9, delay: -i * 1.7 })),
            // The fireflies hang from the corner branches; their centres, as fractions of the picture
            flies: [
                { row: 'top', at: side === 'left' ? '27.0% 20.4%' : '77.9% 24.4%', corner: `${edge} 0%`, delay: side === 'left' ? 0 : -2.3 },
                { row: 'bottom', at: side === 'left' ? '25.6% 71.2%' : '72.6% 78.1%', corner: `${edge} 100%`, delay: side === 'left' ? -1.4 : -3.6 },
            ],
        };
    });

    const enter = () => {
        if (entered || !props.active) return;
        entered = true;
        requestAnimationFrame(() => requestAnimationFrame(() => { shown.value = true; }));
        enterLayers([
            { el: sun.value, y: -50, scale: 0.7, duration: 2200 },
            { el: thread.value, y: -20, delay: 900, duration: 2000 },
            { el: being.value, y: 70, delay: 500, duration: 2000 },
            { el: mushrooms.value, y: 150, delay: 200, duration: 1800 },
        ]);
    };

    // The thread: a double helix of golden particles flowing down from the sun to the character's head
    const helix = (w, h) => {
        const turns = 3;                     // whole turns, so the pattern is seamless where particles wrap
        const strand = Math.random() < 0.5 ? 0 : 1;
        const y = Math.random() * h;
        return [w / 2 + Math.sin((y / h) * Math.PI * 2 * turns + strand * Math.PI) * w * 0.3, y];
    };

    onMounted(() => {
        parallax = createParallax(root.value, ({ x, y, scroll, t, ramp }) => {
            const s = scroll;
            // The forest at the sides: the nearer, the more it moves against the pointer
            backSheets.value.forEach((el) => { el.style.translate = `${-x * 6}px ${-y * 3 - s * 14}px`; });
            frontSheets.value.forEach((el) => { el.style.translate = `${-x * 16}px ${-y * 8 - s * 40}px`; });
            mushrooms.value.style.translate = `${-x * 10}px ${-y * 3 - s * 10}px`;
            // The centre: the sun is far, the character nearer
            const pulse = Math.sin(t * 0.8) * 0.5 + 0.5;
            sun.value.style.translate = `${-x * 5}px ${-y * 3 - s * 10}px`;
            sun.value.style.scale = 1 + 0.035 * pulse * ramp;
            thread.value.style.translate = `${-x * 9}px ${-y * 5 - s * 22}px`;
            being.value.style.translate = `${-x * 12}px ${-y * 6 - s * 30}px`;
        });
        sky = startStardust(skyCanvas.value, {
            count: 240, colors: [0x007a70, 0x00706a, 0x006b66], size: [2.5, 7],
            drift: 6, twinkle: 0.3, reach: 110, push: 26, parallax: 8, opacity: 0.9,
        });
        stream = startStardust(threadCanvas.value, {
            count: 95, colors: [0xffe47d, 0xffe47d, 0xfff3b8], size: [1.4, 3.6], look: 'hard', spawn: helix,
            flow: [0, 16], steady: true, drift: 1.5, twinkle: 0.5, reach: 0, parallax: 0, edgeFade: 0.16,
        });
        enter();
    });
    watch(() => props.active, enter);
    onBeforeUnmount(() => {
        parallax?.destroy();
        sky?.destroy();
        stream?.destroy();
    });
</script>

<template>
    <div class="scene" ref="root" :class="{ shown }">
        <canvas class="sky" ref="skyCanvas"></canvas>
        <!-- On a wide screen the vignette's halves do not meet: its own bottom, stretched, fills the gap -->
        <img class="hillFill" :src="IMG('vignette')" alt="" draggable="false">

        <!-- Behind: the dark vignette of the forest, one half on each side of the screen, and its mirror above it -->
        <template v-for="s in sides" :key="'back' + s.side">
            <div class="half back" :class="s.side">
                <div class="sheet" ref="backSheets">
                    <img class="layer" :src="IMG('vignette')" alt="" draggable="false">
                </div>
            </div>
            <div class="half back up" :class="s.side">
                <div class="sheet" ref="backSheets">
                    <img class="layer" :src="IMG('vignette')" alt="" draggable="false">
                </div>
            </div>
        </template>

        <!-- The centre: a square frame at the bottom of the screen -->
        <div class="frame">
            <div class="depth" ref="sun">
                <img class="layer sunLayer" :src="IMG('sun')" alt="" draggable="false">
            </div>
            <div class="depth" ref="being">
                <div class="float">
                    <img class="layer aura" :src="IMG('aura')" alt="" draggable="false">
                    <img class="layer" :src="IMG('character')" alt="" draggable="false">
                </div>
            </div>
            <!-- The golden thread runs in front of the character's head, down to the dot on its forehead -->
            <div class="depth" ref="thread">
                <canvas class="thread" ref="threadCanvas"></canvas>
            </div>
        </div>

        <!-- The mushrooms, stacked in the order of the illustration -->
        <div class="mushrooms" ref="mushrooms">
            <img class="layer glow" :src="IMG('mush-glow')" alt="" draggable="false">
            <img class="layer" :src="IMG('mush-stems')" alt="" draggable="false">
            <img class="layer" :src="IMG('mush-caps')" alt="" draggable="false">
            <img class="layer" :src="IMG('mush-shade')" alt="" draggable="false">
            <img class="layer" :src="IMG('mush-outline')" alt="" draggable="false">
        </div>

        <!-- In front: leaves, branches, fireflies and the blue mushrooms, anchored to the sides -->
        <template v-for="s in sides" :key="'front' + s.side">
            <div class="half front" :class="s.side">
                <div class="sheet" ref="frontSheets">
                    <img v-for="(leaf, i) in s.leaves" :key="i" class="layer sway leaf" :src="leaf.src" alt="" draggable="false"
                        :style="{ '--origin': leaf.origin, '--amp': leaf.amp + 'deg', '--dur': leaf.dur + 's', '--delay': leaf.delay + 's' }">

                    <div class="layer sway side" :style="{ '--origin': s.side === 'left' ? '0% 50%' : '100% 50%', '--amp': '0.7deg', '--dur': '9s', '--delay': s.side === 'left' ? '0s' : '-4s' }">
                        <img class="layer" :src="IMG('branch-' + s.letter)" alt="" draggable="false">
                        <img class="layer hooks" :src="IMG('hooks-' + s.letter)" alt="" draggable="false">
                        <img class="layer shine" :src="IMG('blue-' + s.letter)" alt="" draggable="false">
                    </div>

                    <div v-for="fly in s.flies" :key="fly.row" class="layer part" :class="fly.row">
                        <div class="layer sway" :style="{ '--origin': fly.corner, '--amp': '1.3deg', '--dur': '6.5s', '--delay': fly.delay + 's' }">
                            <img class="layer" :src="IMG('corners')" alt="" draggable="false">
                            <img class="layer" :src="IMG('fly-stem')" alt="" draggable="false">
                            <img class="layer halo" :src="IMG('fly-halo')" alt="" draggable="false" :style="{ '--origin': fly.at, '--delay': fly.delay + 's' }">
                            <img class="layer core" :src="IMG('fly-core')" alt="" draggable="false">
                        </div>
                    </div>

                    <img v-if="s.side === 'right'" class="layer" :src="IMG('mark')" alt="" draggable="false">
                </div>
            </div>

            <!-- Above the big square the forest goes on: the same picture, flipped, so the branches meet at the seam -->
            <div class="half front up" :class="s.side">
                <div class="sheet" ref="frontSheets">
                    <img v-for="(leaf, i) in s.leaves" :key="i" class="layer sway leaf" :src="leaf.src" alt="" draggable="false"
                        :style="{ '--origin': leaf.origin, '--amp': leaf.amp + 'deg', '--dur': leaf.dur + 's', '--delay': leaf.delay + 's' }">
                    <div class="layer sway side" :style="{ '--origin': s.side === 'left' ? '0% 50%' : '100% 50%', '--amp': '0.7deg', '--dur': '9s', '--delay': s.side === 'left' ? '0s' : '-4s' }">
                        <img class="layer" :src="IMG('branch-' + s.letter)" alt="" draggable="false">
                    </div>
                    <img class="layer" :src="IMG('corners')" alt="" draggable="false">
                </div>
            </div>
        </template>
    </div>
</template>

<style scoped>
    .scene {
        /* The centre's square, and the bigger one of the surroundings (always at least the height of the screen) */
        --s: min(max(100vw, 62svh), 85svh);
        --sn: min(calc(var(--s) * 1.1), calc(100vw * 1.25));
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

    /* The vignette stretched over the whole width, showing only its lowest part: the hill between the two halves */
    .hillFill {
        position: absolute;
        left: 0;
        bottom: calc(var(--sn) * -0.04);
        width: 100%;
        height: var(--sn);
        -webkit-mask-image: linear-gradient(to bottom, transparent 77%, #000 79%);
        mask-image: linear-gradient(to bottom, transparent 77%, #000 79%);
        user-select: none;
        pointer-events: none;
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

    /* ---- The sides: each half shows half of the big square, from the edge of the screen inwards. It hangs a little
       below the screen, so the pointer and the scroll can lift it without showing a gap at the bottom. ---- */
    .half {
        position: absolute;
        bottom: calc(var(--sn) * -0.04);
        width: min(calc(var(--sn) / 2), 50%);
        height: var(--sn);
        overflow: hidden;
        opacity: 0;
        transition: opacity 1.8s ease-out;
        pointer-events: none;
    }

    .shown .half {
        opacity: 1;
    }

    .half.left { left: 0; }
    .half.right { right: 0; }

    /* The inner edge of the vignette's halves melts into the stretched hill between them, so there is no step */
    .back.left {
        -webkit-mask-image: linear-gradient(to right, #000 80%, transparent);
        mask-image: linear-gradient(to right, #000 80%, transparent);
    }

    .back.right {
        -webkit-mask-image: linear-gradient(to left, #000 80%, transparent);
        mask-image: linear-gradient(to left, #000 80%, transparent);
    }

    /* A little wider than the screen, so the pointer can shift it sideways without a gap at the edge. When the screen
       is narrower than the square, the picture is centred instead and its sides are cropped. */
    .sheet {
        position: absolute;
        bottom: 0;
        width: var(--sn);
        height: var(--sn);
        scale: 1.04 1;
    }

    .left .sheet { left: min(0px, calc(50vw - var(--sn) / 2)); transform-origin: 100% 50%; }
    .right .sheet { right: min(0px, calc(50vw - var(--sn) / 2)); transform-origin: 0% 50%; }

    /* The mirror above: sits right on top of the big square and is flipped over, so the seam is the picture's own top edge */
    .half.up {
        bottom: calc(var(--sn) * 0.96 - 1px);
    }

    .up .sheet {
        scale: 1.04 -1;
    }

    /* Fireflies and corner branches come in one picture for the four corners: each part keeps its own half of it */
    .part.top { clip-path: inset(0 0 50% 0); }
    .part.bottom { clip-path: inset(50% 0 0 0); }

    /* ---- The centre ---- */
    .frame {
        position: absolute;
        width: var(--s);
        height: var(--s);
        left: calc(50% - var(--s) / 2);
        bottom: 0;
        pointer-events: none;
    }

    .depth {
        position: absolute;
        inset: 0;
    }

    .sunLayer {
        transform-origin: 49.7% 19.6%;
    }

    /* The thread's box: from under the sun to the character's head */
    .thread {
        position: absolute;
        left: 43%;
        top: 6.5%;
        width: 12.7%;
        height: 37.5%;
        pointer-events: none;
    }

    /* The character floats, and its aura breathes */
    .float {
        position: absolute;
        inset: 0;
        animation: float 6.5s ease-in-out infinite alternate;
    }

    .aura {
        transform-origin: 50% 51%;
        animation: breathe 5s ease-in-out infinite alternate;
    }

    /* ---- The mushrooms ---- */
    .mushrooms {
        position: absolute;
        bottom: calc(var(--sn) * -0.04);
        width: var(--sn);
        height: var(--sn);
        left: calc(50% - var(--sn) / 2);
        pointer-events: none;
    }

    .glow {
        transform-origin: 50% 100%;
        animation: breathe 7s ease-in-out infinite alternate;
    }

    /* ---- Idle motion ---- */
    .sway {
        transform-origin: var(--origin, 50% 50%);
        animation: sway var(--dur, 7s) ease-in-out var(--delay, 0s) infinite alternate;
    }

    /* The blue mushrooms and the fireflies' halos shine and fade */
    .shine {
        animation: shine 4.2s ease-in-out infinite alternate;
    }

    .halo {
        transform-origin: var(--origin, 50% 50%);
        animation: halo 3.6s ease-in-out var(--delay, 0s) infinite alternate;
    }

    @keyframes sway {
        from { rotate: calc(var(--amp, 1deg) * -1); }
        to { rotate: var(--amp, 1deg); }
    }

    @keyframes float {
        from { translate: 0 -0.7%; rotate: -0.3deg; }
        to { translate: 0 0.9%; rotate: 0.3deg; }
    }

    @keyframes breathe {
        from { opacity: 0.7; scale: 0.97; }
        to { opacity: 1; scale: 1.035; }
    }

    @keyframes shine {
        from { opacity: 0.8; filter: brightness(0.95); }
        to { opacity: 1; filter: brightness(1.25); }
    }

    @keyframes halo {
        from { opacity: 0.5; scale: 0.9; }
        to { opacity: 1; scale: 1.1; }
    }

    @media (prefers-reduced-motion: reduce) {
        .half { opacity: 1; transition: none; }
        .float, .aura, .glow, .sway, .shine, .halo { animation: none; }
    }
</style>
