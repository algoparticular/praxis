<script setup>
    // Pañña (wisdom): Sid meditating under a stippled sun, in a forest of dark branches, with fireflies and
    // glowing mushrooms. The line work (character, branches, leaves, mushrooms) comes from the artwork in
    // public/assets/panna, each layer cropped to its own box (pannaLayers.json) so the browser keeps small pictures.
    // Everything that is colour is real particles (three.js, useStardust), drawn behind the line work: the sun, the
    // cyan aura, the fireflies' halos, the blue mushrooms and the pink glow of the mushroom field. Their shapes come
    // from density maps of the original stipple (pannaClouds.json). The spiral from the sun to Sid's forehead is a
    // moving group of particles in front, in the manner of the hero's spiral.
    // Two scales give depth: the centre lives in a square frame; the surroundings are a slightly bigger square whose
    // left and right halves are anchored to the sides of the screen, so on a wide screen the forest still hugs the edges.
    import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { createParallax, enterLayers } from '../../composables/useParallax.js';
    import { startStardust } from '../../composables/useStardust.js';
    import boxes from '../../composables/pannaLayers.json';
    import clouds from '../../composables/pannaClouds.json';

    const props = defineProps({
        card: { type: Object, default: () => ({}) },
        active: Boolean
    });

    const root = ref(null);
    const backCanvas = ref(null);
    const frontCanvas = ref(null);
    const frame = ref(null);
    const backSheets = ref([]);
    const frontSheets = ref([]);
    const being = ref(null);
    const mushrooms = ref(null);
    const shown = ref(false);
    let parallax = null;
    let back = null;
    let front = null;
    let entered = false;

    // ---- The layers: where each cropped picture sits in its 2160px square, as percentages of it
    const IMG = (name) => `/assets/panna/${name}.webp`;
    const pct = (n) => `${(n * 100).toFixed(3)}%`;
    const place = (name) => {
        const b = boxes[name];
        return { left: pct(b.x), top: pct(b.y), width: pct(b.w), height: pct(b.h) };
    };
    // The point of a layer (a fraction of the 2160 square) as a transform origin inside the layer's own box
    const originOf = (name, fx, fy) => {
        const b = boxes[name];
        return `${(((fx - b.x) / b.w) * 100).toFixed(1)}% ${(((fy - b.y) / b.h) * 100).toFixed(1)}%`;
    };

    // The two sides of the forest. Leaves hang from the edge at the height of their stalk.
    const LEAF_Y = [0.2115, 0.2955, 0.6995, 0.7835];
    const sides = ['left', 'right'].map((side) => {
        const letter = side === 'left' ? 'l' : 'r';
        const edge = side === 'left' ? 0 : 1;
        const leaf = (i) => {
            const name = `leaf-${letter}${i + 1}`;
            return { name, style: { ...place(name), '--origin': originOf(name, edge, LEAF_Y[i]), '--amp': `${3 + i * 0.8}deg`, '--dur': `${5.2 + i * 0.9}s`, '--delay': `${-i * 1.7}s` } };
        };
        // Each corner: a branch and the stem of a firefly hanging from it, swaying together from the corner
        const corner = (row, delay) => {
            const q = (row === 'top' ? 't' : 'b') + letter;
            return { row, branch: 'corner-' + q, stem: 'stem-' + q, style: { '--origin': `${edge * 100}% ${row === 'top' ? 0 : 100}%`, '--amp': '1.3deg', '--dur': '6.5s', '--delay': `${delay}s` } };
        };
        return {
            side, letter,
            leaves: [0, 1, 2, 3].map(leaf),
            upLeaves: [0, 1].map(leaf),
            corners: [corner('top', side === 'left' ? 0 : -2.3), corner('bottom', side === 'left' ? -1.4 : -3.6)],
            sideStyle: { '--origin': `${edge * 100}% 50%`, '--amp': '0.7deg', '--dur': '9s', '--delay': side === 'left' ? '0s' : '-4s' },
        };
    });

    // ---- The clouds: density maps of the original's stipple, turned back into particles at whatever size we draw them
    const grids = Object.fromEntries(Object.entries(clouds).map(([name, cloud]) => [name, { ...cloud, bytes: Uint8Array.from(atob(cloud.data), (c) => c.charCodeAt(0)) }]));
    const hexOf = ([r, g, b]) => (r << 16) | (g << 8) | b;
    const DENSITY = 4.8;        // how many dots' worth of area per area where the stipple is solid
    const DOT = 5.5;            // diameter of a dot of the original, in its 2160px units

    // map(u, v) turns a spot of the 2160 square into canvas pixels; k is canvas pixels per unit
    const sample = (name, map, k, boost = 1) => {
        const grid = grids[name];
        const out = [];
        const base = Math.max(1.5, DOT * k);
        for (let row = 0; row < grid.rows; row++) {
            for (let col = 0; col < grid.cols; col++) {
                const v = grid.bytes[row * grid.cols + col] / 255;
                if (v < 0.03) continue;
                const dot = base * (1 + 1.3 * v ** 4);                              // the solid core gets bigger dots
                const wanted = (grid.cell * k) ** 2 * DENSITY * boost * v ** 1.3 / (Math.PI / 4 * dot * dot);
                let n = Math.floor(wanted);
                if (Math.random() < wanted - n) n++;
                for (let i = 0; i < n; i++) {
                    const [x, y] = map(grid.x + (col + Math.random()) * grid.cell, grid.y + (row + Math.random()) * grid.cell);
                    out.push([x, y, dot * (0.8 + Math.random() * 0.4)]);
                }
            }
        }
        return out;
    };

    // Where things are on the stage right now, in canvas pixels
    const layout = (w, h) => {
        const S = frame.value.offsetWidth;
        const sn = mushrooms.value.offsetWidth;
        const kn = sn / 2160;
        const sheetTop = h + 0.04 * sn - sn;
        const inset = Math.min(0, w / 2 - sn / 2);            // the sheets are centred, not anchored, on a narrow screen
        return {
            S, sn, kn, kf: S / 2160, fx0: (w - S) / 2, fy0: h - S,
            // The big square's left half: its right edge stays put while it grows 4% to the left (CSS scale 1.04, origin right)
            left: (u, v) => [inset + sn - (1 - u / 2160) * sn * 1.04, sheetTop + v * kn],
            right: (u, v) => [w - inset - sn + (u / 2160) * sn * 1.04, sheetTop + v * kn],
            centred: (u, v) => [(w - sn) / 2 + u * kn, sheetTop + v * kn],
        };
    };

    // The sun sits at the very top, above the card's name, and the top edge may cut it
    const sunSpot = (w, h) => {
        const L = layout(w, h);
        return { k: (L.S * 0.95) / 2160, x: w / 2, y: h * 0.035 };
    };

    // ---- The spiral from the sun to Sid's forehead, as particles that flow down it
    const TURN = 180;          // px of the path per turn of the double helix
    const STRAND_DOTS = 64;
    const DUST = 56;
    const FLOW = 0.1;          // lengths of the path per second
    let bob = 0;               // Sid floats; the aura and the thread's end float with him
    const thread = {
        count: STRAND_DOTS * 2 + DUST + 1,
        update(t, data) {
            const canvas = frontCanvas.value;
            if (!canvas || !canvas.clientWidth || !frame.value) return;
            const w = canvas.clientWidth, h = canvas.clientHeight;
            const L = layout(w, h);
            const sun = sunSpot(w, h);
            const x0 = w / 2, y0 = sun.y + 150 * sun.k;            // inside the sun, so the thread seems to leave it
            const x1 = L.fx0 + 0.5 * L.S, y1 = L.fy0 + 0.436 * L.S + bob;
            const length = Math.max(1, y1 - y0);
            const turns = length / TURN;
            const amp = 0.034 * L.S;
            const unit = Math.max(1, L.S / 765);
            const smooth = (a, b, x) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
            const envelope = (f) => smooth(0, 0.14, f) * smooth(0, 0.07, 1 - f);

            let i = 0;
            for (let strand = 0; strand < 2; strand++) {
                for (let d = 0; d < STRAND_DOTS; d++, i++) {
                    const f = (d / STRAND_DOTS + t * FLOW) % 1;
                    const wave = Math.PI * 2 * turns * f + strand * Math.PI - t * 0.7;
                    const narrowing = 1 - 0.78 * smooth(0.25, 1, f);
                    const near = 0.5 + 0.5 * Math.cos(wave);                  // 1 when the dot passes in front
                    const pulse = Math.max(0, Math.sin(f * 15 - t * 2.1)) ** 3;
                    data.positions[i * 3] = x0 + (x1 - x0) * f + Math.sin(wave) * amp * narrowing;
                    data.positions[i * 3 + 1] = y0 + length * f;
                    data.sizes[i] = (2.2 + 2.4 * near + 2 * pulse) * unit;
                    data.alphas[i] = envelope(f) * (0.4 + 0.6 * near);
                }
            }
            // Dust: tinier and quicker, loosely following the helix
            for (let d = 0; d < DUST; d++, i++) {
                const seed = d * 12.9898;
                const r = (n) => { const v = Math.sin(seed + n * 78.233) * 43758.5453; return v - Math.floor(v); };
                const f = (r(1) + t * FLOW * (1.6 + r(2) * 1.6)) % 1;
                const wave = Math.PI * 2 * turns * f + r(3) * 6.28;
                const spread = (r(4) - 0.5) * 2 * amp * 1.5 * (1 - 0.7 * smooth(0.25, 1, f));
                data.positions[i * 3] = x0 + (x1 - x0) * f + spread + Math.sin(wave + t) * 4;
                data.positions[i * 3 + 1] = y0 + length * f;
                data.sizes[i] = (1 + r(5) * 1.4) * unit;
                data.alphas[i] = envelope(f) * (0.3 + 0.5 * r(6)) * (0.6 + 0.4 * Math.sin(t * 2 + d));
            }
            // The dot on Sid's forehead where the thread ends
            data.positions[i * 3] = x1;
            data.positions[i * 3 + 1] = y1;
            data.sizes[i] = 4.5 * unit;
            data.alphas[i] = 0.55 + 0.35 * Math.sin(t * 1.6);
        },
    };

    const enter = () => {
        if (entered || !props.active) return;
        entered = true;
        requestAnimationFrame(() => requestAnimationFrame(() => { shown.value = true; }));
        enterLayers([
            { el: being.value, y: 70, delay: 500, duration: 2000 },
            { el: mushrooms.value, y: 150, delay: 200, duration: 1800 },
        ]);
    };

    onMounted(() => {
        parallax = createParallax(root.value, ({ x, y, scroll, t, ramp }) => {
            const s = scroll;
            // The forest at the sides: the nearer, the more it moves against the pointer
            backSheets.value.forEach((el) => { el.style.translate = `${-x * 6}px ${-y * 3 - s * 14}px`; });
            const frontShift = [-x * 16, -y * 8 - s * 40];
            frontSheets.value.forEach((el) => { el.style.translate = `${frontShift[0]}px ${frontShift[1]}px`; });
            mushrooms.value.style.translate = `${-x * 10}px ${-y * 3 - s * 10}px`;
            // Sid, with his aura
            bob = Math.sin(t * 0.75) * 0.009 * frame.value.offsetWidth * ramp;
            const sidShift = [-x * 12, -y * 6 + bob - s * 30];
            being.value.style.translate = `${sidShift[0]}px ${sidShift[1]}px`;
            // The coloured particles follow the layers they belong to
            back?.shift(1, -x * 5, -y * 3 - s * 10);                // sun
            back?.shift(2, sidShift[0], sidShift[1]);              // aura
            back?.shift(3, -x * 10, -y * 3 - s * 10);              // pink glow
            back?.shift(4, frontShift[0], frontShift[1]);          // fireflies
            back?.shift(5, frontShift[0], frontShift[1]);          // blue mushrooms
            front?.shift(0, -x * 9, -y * 5 - s * 22);              // the thread
        });

        const tone = (name) => [hexOf(clouds[name].color)];
        back = startStardust(backCanvas.value, {
            groups: [
                // 0: the faint dots of the sky
                { count: 200, colors: [0x007a70, 0x00706a, 0x006b66], size: [2.5, 7], drift: 6, twinkle: 0.3, reach: 100, push: 24, parallax: 8, opacity: 0.9,
                    spawn: (w, h) => [w * (0.1 + Math.random() * 0.8), h * Math.random() * 0.78] },
                // 1: the sun
                { colors: tone('sun'), parallax: 0, drift: 1.2, twinkle: 0.1, reach: 0, points: (w, h) => {
                    const s = sunSpot(w, h);
                    return sample('sun', (u, v) => [s.x + (u - 1075) * s.k, s.y + (v - 425) * s.k], s.k, 1.6);
                } },
                // 2: the cyan aura around Sid
                { colors: tone('aura'), parallax: 0, drift: 1.4, twinkle: 0.12, reach: 0, points: (w, h) => {
                    const L = layout(w, h);
                    return sample('aura', (u, v) => [L.fx0 + u * L.kf, L.fy0 + v * L.kf], L.kf);
                } },
                // 3: the pink glow of the mushrooms
                { colors: tone('pink'), parallax: 0, drift: 1.6, twinkle: 0.14, reach: 90, push: 12, points: (w, h) => {
                    const L = layout(w, h);
                    return sample('pink', L.centred, L.kn);
                } },
                // 4: the fireflies' halos
                { colors: tone('fly-tl'), parallax: 0, drift: 1.4, twinkle: 0.2, reach: 0, points: (w, h) => {
                    const L = layout(w, h);
                    return ['fly-tl', 'fly-bl'].flatMap((name) => sample(name, L.left, L.kn * 1.04))
                        .concat(['fly-tr', 'fly-br'].flatMap((name) => sample(name, L.right, L.kn * 1.04)));
                } },
                // 5: the blue mushrooms
                { colors: tone('blue-l'), parallax: 0, drift: 1.2, twinkle: 0.16, reach: 0, points: (w, h) => {
                    const L = layout(w, h);
                    return sample('blue-l', L.left, L.kn * 1.04).concat(sample('blue-r', L.right, L.kn * 1.04));
                } },
            ],
        });
        front = startStardust(frontCanvas.value, {
            groups: [{ colors: [0xffe47d, 0xffe47d, 0xfff3b8], dynamic: thread, parallax: 0, drift: 0, twinkle: 0, reach: 140, push: 26, look: 'hard' }],
        });
        enter();
    });
    watch(() => props.active, enter);
    onBeforeUnmount(() => {
        parallax?.destroy();
        back?.destroy();
        front?.destroy();
    });
</script>

<template>
    <div class="scene" ref="root" :class="{ shown }">
        <!-- On a wide screen the vignette's halves do not meet: its own bottom, stretched, fills the gap -->
        <img class="hillFill" :src="IMG('vignette')" alt="" draggable="false">

        <!-- Behind: the dark vignette of the forest, one half on each side of the screen, and its mirror above it -->
        <template v-for="s in sides" :key="'back' + s.side">
            <div class="half back" :class="s.side">
                <div class="sheet" ref="backSheets">
                    <img class="piece" :src="IMG('vignette')" :style="place('vignette')" alt="" draggable="false">
                </div>
            </div>
            <div class="half back up" :class="s.side">
                <div class="sheet" ref="backSheets">
                    <img class="piece" :src="IMG('vignette')" :style="place('vignette')" alt="" draggable="false">
                </div>
            </div>
        </template>

        <!-- Everything coloured, as particles: above the dark vignette, behind all the line work -->
        <canvas class="field" ref="backCanvas"></canvas>

        <!-- Sid, in a square frame at the bottom of the screen -->
        <div class="frame" ref="frame">
            <div class="depth" ref="being">
                <img class="piece" :src="IMG('character')" :style="place('character')" alt="" draggable="false">
            </div>
        </div>

        <!-- The golden spiral, in front of Sid's head -->
        <canvas class="field" ref="frontCanvas"></canvas>

        <!-- The mushrooms, stacked in the order of the illustration (the pink glow is particles, behind) -->
        <div class="mushrooms" ref="mushrooms">
            <img class="piece" :src="IMG('mush-stems')" :style="place('mush-stems')" alt="" draggable="false">
            <img class="piece" :src="IMG('mush-caps')" :style="place('mush-caps')" alt="" draggable="false">
            <img class="piece" :src="IMG('mush-shade')" :style="place('mush-shade')" alt="" draggable="false">
            <img class="piece" :src="IMG('mush-outline')" :style="place('mush-outline')" alt="" draggable="false">
        </div>

        <!-- In front: leaves, branches and the fireflies' stems, anchored to the sides -->
        <template v-for="s in sides" :key="'front' + s.side">
            <div class="half front" :class="s.side">
                <div class="sheet" ref="frontSheets">
                    <img v-for="leaf in s.leaves" :key="leaf.name" class="piece sway" :src="IMG(leaf.name)" :style="leaf.style" alt="" draggable="false">

                    <div class="layer sway" :style="s.sideStyle">
                        <img class="piece" :src="IMG('branch-' + s.letter)" :style="place('branch-' + s.letter)" alt="" draggable="false">
                        <img class="piece" :src="IMG('hooks-' + s.letter)" :style="place('hooks-' + s.letter)" alt="" draggable="false">
                    </div>

                    <div v-for="c in s.corners" :key="c.row" class="layer sway" :style="c.style">
                        <img class="piece" :src="IMG(c.branch)" :style="place(c.branch)" alt="" draggable="false">
                        <img class="piece" :src="IMG(c.stem)" :style="place(c.stem)" alt="" draggable="false">
                    </div>

                    <img v-if="s.side === 'right'" class="piece" :src="IMG('mark')" :style="place('mark')" alt="" draggable="false">
                </div>
            </div>

            <!-- Above the big square the forest goes on: the same picture, flipped, so the branches meet at the seam -->
            <div class="half front up" :class="s.side">
                <div class="sheet" ref="frontSheets">
                    <img v-for="leaf in s.upLeaves" :key="leaf.name" class="piece sway" :src="IMG(leaf.name)" :style="leaf.style" alt="" draggable="false">
                    <div class="layer sway" :style="s.sideStyle">
                        <img class="piece" :src="IMG('branch-' + s.letter)" :style="place('branch-' + s.letter)" alt="" draggable="false">
                    </div>
                    <div class="layer sway" :style="s.corners[0].style">
                        <img class="piece" :src="IMG(s.corners[0].branch)" :style="place(s.corners[0].branch)" alt="" draggable="false">
                    </div>
                </div>
            </div>
        </template>
    </div>
</template>

<style scoped>
    .scene {
        /* The centre's square, and the bigger one of the surroundings */
        --s: min(max(100vw, 62svh), 85svh);
        --sn: min(calc(var(--s) * 1.1), calc(100vw * 1.25));
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

    /* A whole 2160px square (no pixels of its own) holding cropped pictures */
    .layer {
        position: absolute;
        inset: 0;
        pointer-events: none;
    }

    /* A cropped picture, placed by its inline percentages */
    .piece {
        position: absolute;
        display: block;
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

    /* ---- The mushrooms ---- */
    .mushrooms {
        position: absolute;
        bottom: calc(var(--sn) * -0.04);
        width: var(--sn);
        height: var(--sn);
        left: calc(50% - var(--sn) / 2);
        pointer-events: none;
    }

    /* ---- Idle motion: foliage sways from where it hangs ---- */
    .sway {
        transform-origin: var(--origin, 50% 50%);
        animation: sway var(--dur, 7s) ease-in-out var(--delay, 0s) infinite alternate;
    }

    @keyframes sway {
        from { rotate: calc(var(--amp, 1deg) * -1); }
        to { rotate: var(--amp, 1deg); }
    }

    @media (prefers-reduced-motion: reduce) {
        .half { opacity: 1; transition: none; }
        .sway { animation: none; }
    }
</style>
