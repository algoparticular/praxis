<script setup>
    // Hogar: a living cell-planet crowned with mushrooms, a little larva inside it, in a quiet grey sky.
    // The layers come from the artwork (public/assets/hogar, cropped from sheets of 3240px: PIECES gives each
    // one's box as a percentage of that square). The crown of mushrooms turns slowly. The inside is a watery system
    // (useCellWater): every organelle bobs about where it was drawn, and the larva floats slowly, bumping into them
    // and into the wall of the cell instead of going through, and giving them a nudge. The colour is code: the
    // interior and the nucleus are plain discs, the nucleus's stipple and the spore dust around the planet are
    // three.js particles (useStardust), and so are the faint dots of the sky. As in Pañña, the orange dust is a
    // density map of the original stipple (hogarDust.json) drawn back as particles behind the crown; only
    // the thin fringe hugging the mushrooms stays in the picture. Touching a mushroom throws spores (useSparks).
    import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { createParallax, enterLayers } from '../../composables/useParallax.js';
    import { startStardust } from '../../composables/useStardust.js';
    import { createCellWater } from '../../composables/useCellWater.js';
    import { createSparks } from '../../composables/useSparks.js';
    import { play } from '../../composables/useSound.js';
    import dustCloud from '../../composables/hogarDust.json';
    import CAPS from '../../composables/hogarCaps.json';

    const props = defineProps({
        card: { type: Object, default: () => ({}) },
        active: Boolean
    });

    const root = ref(null);
    const frame = ref(null);
    const skyCanvas = ref(null);
    const dustCanvas = ref(null);      // behind the planet
    const frontCanvas = ref(null);     // in front of it: a few motes and the nucleus's stipple
    const planet = ref(null);
    const crown = ref(null);        // the crown and its touchable mushrooms, turning together
    const larva = ref(null);
    const nucleus = ref(null);
    const els = {};                    // the floating pieces by id, filled by the template
    const setEl = (id) => (el) => { els[id] = el; };
    let parallax = null;
    let sky = null;
    let dust = null;
    let front = null;
    let water = null;
    let last = null;
    let tilt = 0;
    let entered = false;

    // Where each layer sits, in % of the 3240px square it was drawn in (left, top, width, height)
    const CROWN = { left: 16.574, top: 22.654, w: 65.895, h: 64.506 };
    const LARVA = { left: 42.037, top: 39.167, w: 5.031, h: 9.66 };
    const boxOf = (l) => ({ left: `${l.left}%`, top: `${l.top}%`, width: `${l.w}%`, height: `${l.h}%` });
    const crownBox = boxOf(CROWN);
    // The mushrooms that can be touched: a circle on each cap, in % of the frame
    const caps = CAPS.map(([x, y, r]) => ({ left: `${(x - r).toFixed(3)}%`, top: `${(y - r).toFixed(3)}%`, width: `${(2 * r).toFixed(3)}%`, height: `${(2 * r).toFixed(3)}%` }));
    const larvaBox = boxOf(LARVA);
    // The pieces that float in the water. `circles` (frame fractions) are what the larva bumps into, `turn` how far
    // each rocks, in degrees, `sway` how far it wanders, in frame fractions
    const PIECES = [
        { id: 'motas', file: 'motas', box: { left: 34.66, top: 33.704, w: 32.407, h: 32.778 }, sway: 0.004, turn: 1 },
        { id: 'golgi', file: 'golgi', box: { left: 45.093, top: 53.981, w: 16.698, h: 12.963 }, sway: 0.005, turn: 1.5, mass: 8,
            circles: [[0.541, 0.6225, 0.0155], [0.5423, 0.5926, 0.0137], [0.4991, 0.6336, 0.0108], [0.5225, 0.5988, 0.0103], [0.5454, 0.6543, 0.0103], [0.5148, 0.6265, 0.0101], [0.5083, 0.6049, 0.0099]] },
        { id: 'bucle', file: 'bucle', box: { left: 34.938, top: 41.142, w: 5.772, h: 13.395 }, sway: 0.006, turn: 3, mass: 3,
            circles: [[0.3494, 0.4926, 0.0083], [0.3855, 0.4287, 0.0058], [0.3759, 0.5025, 0.005], [0.362, 0.5404, 0.0047], [0.3534, 0.5046, 0.0046], [0.3543, 0.4775, 0.0044], [0.3994, 0.4546, 0.0043]] },
        { id: 'garabato', file: 'garabato', box: { left: 60.093, top: 39.475, w: 2.5, h: 5.278 }, sway: 0.007, turn: 6, mass: 1.5,
            circles: [[0.6157, 0.4235, 0.0062], [0.6247, 0.4336, 0.0056], [0.6028, 0.4068, 0.0049], [0.6114, 0.4151, 0.0046]] },
        { id: 'rulo', file: 'rulo', box: { left: 46.42, top: 52.901, w: 1.914, h: 5.34 }, sway: 0.007, turn: 6, mass: 1.5,
            circles: [[0.4738, 0.5593, 0.0072], [0.4787, 0.5694, 0.0041], [0.4759, 0.5759, 0.0037], [0.479, 0.5432, 0.0035]] },
        { id: 'vesiculas', file: 'vesiculas', box: { left: 38.148, top: 53.704, w: 5.525, h: 6.79 }, sway: 0.007, turn: 4, mass: 2,
            circles: [[0.4091, 0.5704, 0.0235]] },
        { id: 'mitocondria', file: 'mitocondria', box: { left: 61.698, top: 45.772, w: 4.321, h: 7.84 }, sway: 0.006, turn: 8, mass: 3,
            circles: [[0.6386, 0.4905, 0.0195], [0.6386, 0.5255, 0.0195]] },
        { id: 'puntos', file: 'puntos', box: { left: 48.765, top: 35.525, w: 3.426, h: 3.519 }, sway: 0.008, turn: 5 },
    ].map((p) => ({ ...p, style: boxOf(p.box) }));

    // The planet's centre and radius in frame fractions: the interior disc's middle, and where the mushrooms start
    const PLANET = { x: 0.5096, y: 0.5049, r: 0.24 };
    // The nucleus, a disc inside it
    const NUCLEUS = { x: 0.5359, y: 0.4694, r: 0.0585 };
    const CELL = { x: 0.5096, y: 0.5049, r: 0.18 };           // the interior disc
    const LARVA_AT = { x: 0.4454, y: 0.452, r: 0.02 };        // where the larva was drawn, and its body
    const frameBox = (canvas = frontCanvas) => {
        const f = frame.value.getBoundingClientRect();
        const c = canvas.value.getBoundingClientRect();
        return { x: f.left - c.left, y: f.top - c.top, size: f.width };
    };
    // Stipple on the nucleus: thicker on its right, like the artwork
    const nucleusStipple = () => {
        const f = frameBox();
        for (;;) {
            const a = Math.random() * Math.PI * 2;
            const d = Math.sqrt(Math.random()) * NUCLEUS.r;
            const u = Math.cos(a) * d / NUCLEUS.r;             // -1 (left) .. 1 (right)
            if (Math.random() > 0.08 + 0.92 * Math.max(0, (u + 0.35) / 1.35) ** 2) continue;
            return [f.x + (NUCLEUS.x + Math.cos(a) * d) * f.size, f.y + (NUCLEUS.y + Math.sin(a) * d) * f.size];
        }
    };
    const aroundOn = (canvas) => () => {
        const f = frameBox(canvas);
        const cx = f.x + PLANET.x * f.size;
        const cy = f.y + PLANET.y * f.size;
        const radius = PLANET.r * f.size * (1.02 + Math.abs((Math.random() + Math.random() + Math.random()) / 3 - 0.5) * 2.6);
        const angle = Math.random() * Math.PI * 2;
        return [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius];
    };

    const around = aroundOn(frontCanvas);
    const aroundBack = aroundOn(dustCanvas);

    // The dust of the original, back as particles: where the density map says there is stipple, as many dots as it covered
    const grid = { ...dustCloud, bytes: Uint8Array.from(atob(dustCloud.data), (c) => c.charCodeAt(0)) };
    const DUST_COLORS = [0xf8a275, 0xffb069, 0xf5976a, 0xffc08a];
    const dustPoints = () => {
        const f = frameBox(dustCanvas);
        const k = f.size / 3240;
        const dot = Math.max(1.8, 9 * k);
        const out = [];
        for (let row = 0; row < grid.rows; row++) {
            for (let col = 0; col < grid.cols; col++) {
                const v = grid.bytes[row * grid.cols + col] / 255 * grid.max;
                if (v < 0.02) continue;
                const wanted = v * (grid.cell * k) ** 2 / (Math.PI / 4 * dot * dot) * 2.6;
                let n = Math.floor(wanted);
                if (Math.random() < wanted - n) n++;
                for (let i = 0; i < n; i++) {
                    out.push([
                        f.x + (grid.x + (col + Math.random()) * grid.cell) * k,
                        f.y + (grid.y + (row + Math.random()) * grid.cell) * k,
                        dot * (0.7 + Math.random() * 0.7),
                        DUST_COLORS[Math.floor(Math.random() * DUST_COLORS.length)],
                    ]);
                }
            }
        }
        return out;
    };

    // Touching a mushroom: spores fly out of it and the dust around the planet flares
    const sparks = createSparks(480);
    const spores = (event) => {
        const box = event.currentTarget.getBoundingClientRect();
        const canvas = frontCanvas.value.getBoundingClientRect();
        sparks.burst(box.left + box.width / 2 - canvas.left, box.top + box.height / 2 - canvas.top, {
            n: 26, colors: [0xffb069, 0xff9a5c, 0xffd29a, 0xf08a8a], speed: 120, life: 2.8, size: 4.6, spread: 8,
        });
        dust?.boost(0, 1.4);
        dust?.boost(1, 1);
        front?.boost(0, 1);
        play('tap');
    };
    const warm = () => dust?.boost(0, 0.4);
    const onKey = (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        spores(event);
    };

    const enter = () => {
        if (entered || !props.active) return;
        entered = true;
        enterLayers([
            { el: planet.value, y: 60, scale: 0.7, duration: 2200 },
            { el: larva.value, y: 0, scale: 0.4, delay: 1200, duration: 1600 },
        ]);
    };

    onMounted(() => {
        water = createCellWater({
            bounds: CELL,
            swimmer: LARVA_AT,
            bodies: [
                { id: 'nucleus', circles: [[NUCLEUS.x, NUCLEUS.y, NUCLEUS.r]], mass: 12, sway: 0.004 },
                ...PIECES.map(({ id, circles = [], mass, sway }) => ({ id, circles, mass, sway })),
            ],
        });
        parallax = createParallax(root.value, ({ x, y, scroll, t, ramp }) => {
            const s = scroll;
            // The planet hangs, breathing, and follows the pointer a little; the crown turns above the interior
            planet.value.style.translate = `${-x * 18}px ${-y * 10 + Math.sin(t * 0.5) * 6 * ramp - s * 50}px`;
            planet.value.style.scale = 1 + Math.sin(t * 0.7) * 0.012 * ramp;
            crown.value.style.rotate = `${(t * 1.8 * ramp).toFixed(3)}deg`;
            // The water: everything inside floats, and the larva bumps into it
            const dt = last === null ? 0 : t - last;
            last = t;
            water.step(dt * ramp, t);
            const size = frame.value.offsetWidth;
            PIECES.forEach((p) => {
                const o = water.offset(p.id);
                els[p.id].style.translate = `${(o.x * 100).toFixed(3)}cqw ${(o.y * 100).toFixed(3)}cqw`;
                els[p.id].style.rotate = `${(Math.sin(t * 0.15 + p.sway * 900) * p.turn * ramp + o.x * 120).toFixed(2)}deg`;
            });
            const n = water.offset('nucleus');
            nucleus.value.style.translate = `${(n.x * 100).toFixed(3)}cqw ${(n.y * 100).toFixed(3)}cqw`;
            // What is drawn in particles follows the planet: the halo of dust, and the nucleus's stipple with its own sway
            const px = -x * 18;
            const py = -y * 10 + Math.sin(t * 0.5) * 6 * ramp - s * 50;
            dust?.shift(0, px, py);
            front?.shift(1, px + n.x * size, py + n.y * size);
            // The larva floats, leaning into its way and bobbing; a knock makes it squash a little
            const me = water.swimmer;
            tilt += (Math.max(-1, Math.min(1, me.vx / 0.012)) * 16 - tilt) * Math.min(1, dt * 1.5);
            larva.value.style.translate = `${((me.x - LARVA_AT.x) * 100).toFixed(3)}cqw ${((me.y - LARVA_AT.y) * 100 + Math.sin(t * 0.9) * 0.25).toFixed(3)}cqw`;
            larva.value.style.rotate = `${(tilt + Math.sin(t * 0.6) * 4 * ramp).toFixed(2)}deg`;
            larva.value.style.scale = 1 + Math.min(me.hit, 0.3) * 0.12;
        });
        sky = startStardust(skyCanvas.value, {
            count: 150, colors: [0x7c4a6e, 0x8e4f72, 0xa95b78], size: [2, 5],
            drift: 6, twinkle: 0.4, reach: 120, push: 30, parallax: 10, opacity: 0.8,
        });
        // Behind the planet: the animated dust that the baked dust of the crown's picture sits in front of
        dust = startStardust(dustCanvas.value, {
            groups: [
                // The halo of the original stipple (group 0, which follows the planet by hand)
                { points: dustPoints, look: 'hard', drift: 7, jitter: 0.9, twinkle: 0.5, reach: 120, push: 36, parallax: 0 },
                {
                    count: 300, colors: [0xffb069, 0xff9a5c, 0xffd29a, 0xf08a8a], size: [2.5, 6.5], look: 'hard', spawn: aroundBack,
                    drift: 30, jitter: 0.5, twinkle: 0.8, reach: 150, push: 46, parallax: 18,
                },
            ],
        });
        // In front: a few motes drifting across, and the nucleus's stipple (group 1, which follows the planet by hand)
        front = startStardust(frontCanvas.value, {
            groups: [
                {
                    count: 80, colors: [0xffb069, 0xffd29a, 0xf08a8a], size: [2.2, 5.5], look: 'hard', spawn: around,
                    drift: 34, jitter: 0.5, twinkle: 0.8, reach: 150, push: 46, parallax: 26,
                },
                {
                    count: 240, colors: [0x86667e, 0x93718a, 0x7d5d75], size: [1.4, 3.4], look: 'hard', spawn: nucleusStipple,
                    drift: 2, jitter: 0.4, twinkle: 0.15, reach: 0, parallax: 0, opacity: 0.8,
                },
                // Spores thrown from the mushrooms that are touched
                sparks.group(),
            ],
        });
        enter();
    });
    watch(() => props.active, enter);
    onBeforeUnmount(() => {
        parallax?.destroy();
        sky?.destroy();
        dust?.destroy();
        front?.destroy();
    });
</script>

<template>
    <div class="scene" ref="root">
        <canvas class="sky" ref="skyCanvas"></canvas>
        <canvas class="sky" ref="dustCanvas"></canvas>

        <!-- The planet's layers share one square, so the interior, the crown and the larva line up -->
        <div class="frame" ref="frame">
            <div class="planet" ref="planet">
                <div class="inside">
                    <div class="disc interior"></div>
                    <div class="disc nucleus" ref="nucleus"></div>
                    <img v-for="p in PIECES" :key="p.id" :ref="setEl(p.id)" class="piece" :style="p.style" :src="`/assets/hogar/${p.file}.webp`" alt="" draggable="false">
                    <img class="piece larva" ref="larva" :style="larvaBox" src="/assets/hogar/larva.webp" alt="" draggable="false">
                </div>
                <div class="spin" ref="crown">
                    <img class="piece" :style="crownBox" src="/assets/hogar/crown.webp" alt="" draggable="false">
                    <div v-for="(cap, i) in caps" :key="i" class="hit" role="button" tabindex="-1" :style="cap"
                        :aria-label="$i18n.locale === 'en' ? 'Mushroom' : 'Hongo'"
                        @pointerdown.prevent="spores" @pointerenter="warm" @keydown="onKey"></div>
                </div>
            </div>
        </div>
        <canvas class="sky front" ref="frontCanvas"></canvas>
    </div>
</template>

<style scoped>
    .scene {
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

    /* The planet's square (3240px in the artwork), centred, big enough that the crown fills the middle of the screen */
    .frame {
        --s: min(max(128vw, 89svh), 160svh);
        position: absolute;
        width: var(--s);
        height: var(--s);
        left: calc(50% - var(--s) / 2);
        top: calc(50% - var(--s) / 2 + 6svh);
        container-type: size;
        pointer-events: none;
    }

    .planet,
    .inside {
        position: absolute;
        inset: 0;
    }

    .piece {
        position: absolute;
        display: block;
        max-width: none;
        user-select: none;
        pointer-events: none;
    }

    /* The colour is code: the cell's interior and the nucleus are plain discs (fractions of the 3240px square) */
    .disc {
        position: absolute;
        border-radius: 50%;
    }

    .interior {
        left: 32.96%;
        top: 32.5%;
        width: 35.99%;
        height: 35.99%;
        background: #7e5e76;
    }

    .nucleus {
        left: 47.75%;
        top: 41.1%;
        width: 11.69%;
        height: 11.69%;
        background: #72556f;
    }

    /* The crown turns about the middle of the interior (the disc's centre, in % of the square) */
    .spin {
        position: absolute;
        inset: 0;
        transform-origin: 50.96% 50.49%;
    }

    /* A touchable mushroom: a circle on its cap, invisible */
    .hit {
        position: absolute;
        border-radius: 50%;
        cursor: pointer;
        pointer-events: auto;
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;
    }

    /* The larva walks about on its feet */
    .larva {
        transform-origin: 50% 80%;
    }

    .front {
        z-index: 1;
    }
</style>
