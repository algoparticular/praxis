<script setup>
    // Hogar (home): a cell-planet crowned with corals and sea grass, a little jellyfish swimming inside it. It is built
    // like Creatividad: the layers of the artwork (public/assets/hogar, cropped from sheets of 3240px; hogarScene.json
    // gives each one's box in % of that square) are laid on a square frame. The crown of corals and weeds turns slowly,
    // and every piece sways from the spot where it hangs; touching one makes it squash and throw orange spores. The
    // inside is a watery system (useCellWater): the organelles bob about, the jellyfish floats and pulses, bumping into
    // them and into the wall of the cell. The colour is code: the interior is the drawn silhouette of the original disc,
    // the nucleus a disc whose fuzzy rim is particles, and the orange halo of dust a density map of the original stipple
    // (hogarDust.json) drawn back as particles behind the crown, like the dots of the sky (useStardust).
    import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { createParallax, enterLayers } from '../../composables/useParallax.js';
    import { startStardust } from '../../composables/useStardust.js';
    import { createCellWater } from '../../composables/useCellWater.js';
    import { createSparks } from '../../composables/useSparks.js';
    import { play } from '../../composables/useSound.js';
    import dustCloud from '../../composables/hogarDust.json';
    import scene from '../../composables/hogarScene.json';

    const props = defineProps({
        card: { type: Object, default: () => ({}) },
        active: Boolean
    });

    const root = ref(null);
    const frame = ref(null);
    const skyCanvas = ref(null);
    const dustCanvas = ref(null);      // behind the planet
    const frontCanvas = ref(null);     // in front of it: a few motes, the nucleus's rim and the spores
    const planet = ref(null);
    const crown = ref(null);           // the crown and its touchable pieces, turning together
    const jelly = ref(null);
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

    const { cell: CELL, nucleus: NUC, jelly: JELLY, interior, outline, specks } = scene;
    const pct = (v) => `${v}%`;
    const boxStyle = ([left, top, w, h]) => ({ left: pct(left), top: pct(top), width: pct(w), height: pct(h) });
    const frac = (v) => `${(v * 100).toFixed(3)}%`;

    // The crown: weeds behind, then the dashes of the cell's edge, then the corals; each hangs from the point of it
    // nearest the cell, and sways about it
    const CROWN = [...scene.pieces.filter((p) => p.kind === 'algae'), ...scene.pieces.filter((p) => p.kind === 'coral')]
        .map((p, i) => ({
            ...p, phase: i * 1.9, style: { ...boxStyle(p.box), transformOrigin: `${p.origin[0]}% ${p.origin[1]}%` },
            hit: { left: pct((p.cx - Math.max(p.r, 1.8)).toFixed(3)), top: pct((p.cy - Math.max(p.r, 1.8)).toFixed(3)), width: pct((2 * Math.max(p.r, 1.8)).toFixed(3)), height: pct((2 * Math.max(p.r, 1.8)).toFixed(3)) },
        }));
    const WEEDS = CROWN.filter((p) => p.kind === 'algae');
    const CORALS = CROWN.filter((p) => p.kind === 'coral');

    // The pieces that float in the water; `circles` (frame fractions) are what the jellyfish bumps into
    const FLOAT = [
        { id: 'motas', file: specks.file, box: specks.box, sway: 0.004, turn: 1 },
        ...scene.organelles.map((o) => ({ ...o, sway: 0.005, turn: 2, mass: o.circles.length > 3 ? 6 : 2 })),
    ].map((p) => ({ ...p, style: boxStyle(p.box) }));
    const jellyBox = boxStyle(JELLY.box);
    const outlineBox = boxStyle(outline.box);

    const frameBox = (canvas = frontCanvas) => {
        const f = frame.value.getBoundingClientRect();
        const c = canvas.value.getBoundingClientRect();
        return { x: f.left - c.left, y: f.top - c.top, size: f.width };
    };
    const aroundOn = (canvas) => () => {
        const f = frameBox(canvas);
        const radius = (CELL.r + 0.04) * f.size * (1.02 + Math.abs((Math.random() + Math.random() + Math.random()) / 3 - 0.5) * 2.8);
        const angle = Math.random() * Math.PI * 2;
        return [f.x + CELL.x * f.size + Math.cos(angle) * radius, f.y + CELL.y * f.size + Math.sin(angle) * radius];
    };
    const around = aroundOn(frontCanvas);
    const aroundBack = aroundOn(dustCanvas);

    // A cloud of particles from a density map of the original (the grid's cells are 3240px units): as many dots as it covered
    const decode = (cloud) => ({ ...cloud, bytes: Uint8Array.from(atob(cloud.data), (c) => c.charCodeAt(0)) });
    const dustGrid = decode(dustCloud);
    const rimGrid = decode(NUC.rim);
    const cloudPoints = (grid, canvas, { dotUnits, floor, more, colors }) => () => {
        const f = frameBox(canvas);
        const k = f.size / 3240;
        const dot = Math.max(floor, dotUnits * k);
        const out = [];
        for (let row = 0; row < grid.rows; row++) {
            for (let col = 0; col < grid.cols; col++) {
                const v = grid.bytes[row * grid.cols + col] / 255 * grid.max;
                if (v < 0.02) continue;
                const wanted = v * (grid.cell * k) ** 2 / (Math.PI / 4 * dot * dot) * more;
                let n = Math.floor(wanted);
                if (Math.random() < wanted - n) n++;
                for (let i = 0; i < n; i++) {
                    out.push([
                        f.x + (grid.x + (col + Math.random()) * grid.cell) * k,
                        f.y + (grid.y + (row + Math.random()) * grid.cell) * k,
                        dot * (0.7 + Math.random() * 0.7),
                        colors[Math.floor(Math.random() * colors.length)],
                    ]);
                }
            }
        }
        return out;
    };
    const dustPoints = cloudPoints(dustGrid, dustCanvas, { dotUnits: 9, floor: 1.8, more: 2.6, colors: [0xf8a275, 0xffb069, 0xf5976a, 0xffc08a] });
    const rimPoints = cloudPoints(rimGrid, frontCanvas, { dotUnits: 6, floor: 1.3, more: 1.8, colors: [parseInt(NUC.color, 16)] });

    // Touching a coral or a weed: it squashes, spores fly out of it and the dust around the planet flares
    const sparks = createSparks(480);
    const spores = (piece) => (event) => {
        const box = event.currentTarget.getBoundingClientRect();
        const canvas = frontCanvas.value.getBoundingClientRect();
        const c = piece.color;
        sparks.burst(box.left + box.width / 2 - canvas.left, box.top + box.height / 2 - canvas.top, {
            n: 26, colors: [0xffb069, 0xff9a5c, 0xffd29a, c], speed: 120, life: 2.8, size: 4.6, spread: 8,
        });
        els[piece.id]?.animate({ scale: ['1 1', '1.14 0.88', '0.96 1.08', '1 1'] }, { duration: 700, easing: 'ease-out' });
        dust?.boost(0, 1.4);
        dust?.boost(1, 1);
        front?.boost(0, 1);
        play('tap');
    };
    const warm = () => dust?.boost(0, 0.4);
    const onKey = (piece) => (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        spores(piece)(event);
    };

    const enter = () => {
        if (entered || !props.active) return;
        entered = true;
        enterLayers([
            { el: planet.value, y: 60, scale: 0.7, duration: 2200 },
            { el: jelly.value, y: 0, scale: 0.4, delay: 1200, duration: 1600 },
        ]);
    };

    onMounted(() => {
        water = createCellWater({
            bounds: { x: CELL.x, y: CELL.y, r: CELL.r - 0.004 },
            swimmer: { x: JELLY.x, y: JELLY.y, r: JELLY.r },
            bodies: [
                { id: 'nucleus', circles: [[NUC.x, NUC.y, NUC.r]], mass: 12, sway: 0.004 },
                ...FLOAT.map(({ id, circles = [], mass, sway }) => ({ id, circles, mass, sway })),
            ],
        });
        parallax = createParallax(root.value, ({ x, y, scroll, t, ramp }) => {
            const s = scroll;
            // The planet hangs, breathing, and follows the pointer a little; the crown turns above the interior
            planet.value.style.translate = `${-x * 18}px ${-y * 10 + Math.sin(t * 0.5) * 6 * ramp - s * 50}px`;
            planet.value.style.scale = 1 + Math.sin(t * 0.7) * 0.012 * ramp;
            crown.value.style.rotate = `${(t * 1.4 * ramp).toFixed(3)}deg`;
            // Each coral sways a little from where it hangs, the weeds more, and faster
            WEEDS.forEach((p) => {
                els[p.id].style.rotate = `${(Math.sin(t * 1.1 + p.phase) * 6 * ramp).toFixed(2)}deg`;
            });
            CORALS.forEach((p) => {
                els[p.id].style.rotate = `${(Math.sin(t * 0.55 + p.phase) * 2.2 * ramp).toFixed(2)}deg`;
            });
            // The water: everything inside floats, and the jellyfish bumps into it
            const dt = last === null ? 0 : t - last;
            last = t;
            water.step(dt * ramp, t);
            const size = frame.value.offsetWidth;
            FLOAT.forEach((p) => {
                const o = water.offset(p.id);
                els[p.id].style.translate = `${(o.x * 100).toFixed(3)}cqw ${(o.y * 100).toFixed(3)}cqw`;
                els[p.id].style.rotate = `${(Math.sin(t * 0.15 + p.sway * 900) * p.turn * ramp + o.x * 120).toFixed(2)}deg`;
            });
            const n = water.offset('nucleus');
            nucleus.value.style.translate = `${(n.x * 100).toFixed(3)}cqw ${(n.y * 100).toFixed(3)}cqw`;
            // What is drawn in particles follows the planet: the halo of dust, and the nucleus's rim with its own sway
            const px = -x * 18;
            const py = -y * 10 + Math.sin(t * 0.5) * 6 * ramp - s * 50;
            dust?.shift(0, px, py);
            front?.shift(1, px + n.x * size, py + n.y * size);
            // The jellyfish swims: it pulses, leans into its way, and a knock makes it squash a little
            const me = water.swimmer;
            tilt += (Math.max(-1, Math.min(1, me.vx / 0.012)) * 14 - tilt) * Math.min(1, dt * 1.5);
            const pulse = Math.sin(t * 2.2);
            jelly.value.style.translate = `${((me.x - JELLY.x) * 100).toFixed(3)}cqw ${((me.y - JELLY.y) * 100 - pulse * 0.1).toFixed(3)}cqw`;
            jelly.value.style.rotate = `${(tilt + Math.sin(t * 0.6) * 3 * ramp).toFixed(2)}deg`;
            const squash = 1 + Math.min(me.hit, 0.3) * 0.12;
            jelly.value.style.scale = `${((1 - pulse * 0.025 * ramp) * squash).toFixed(4)} ${((1 + pulse * 0.045 * ramp) / squash).toFixed(4)}`;
        });
        sky = startStardust(skyCanvas.value, {
            count: 150, colors: [0x7d5e75, 0x8a6a82, 0x6f5169], size: [2, 5],
            drift: 6, twinkle: 0.4, reach: 120, push: 30, parallax: 10, opacity: 0.8,
        });
        // Behind the planet: the halo of the original stipple (group 0, which follows the planet by hand) and loose dust
        dust = startStardust(dustCanvas.value, {
            groups: [
                { points: dustPoints, look: 'hard', drift: 7, jitter: 0.9, twinkle: 0.5, reach: 120, push: 36, parallax: 0 },
                {
                    count: 300, colors: [0xffb069, 0xff9a5c, 0xffd29a, 0xf08a8a], size: [2.5, 6.5], look: 'hard', spawn: aroundBack,
                    drift: 30, jitter: 0.5, twinkle: 0.8, reach: 150, push: 46, parallax: 18,
                },
            ],
        });
        // In front: a few motes, the nucleus's fuzzy rim (group 1, which follows the planet by hand) and the spores
        front = startStardust(frontCanvas.value, {
            groups: [
                {
                    count: 80, colors: [0xffb069, 0xffd29a, 0xf08a8a], size: [2.2, 5.5], look: 'hard', spawn: around,
                    drift: 34, jitter: 0.5, twinkle: 0.8, reach: 150, push: 46, parallax: 26,
                },
                { points: rimPoints, look: 'hard', drift: 2, jitter: 0.5, twinkle: 0.1, reach: 0, parallax: 0 },
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

        <!-- The planet's layers share one square, so the interior, the crown and the jellyfish line up -->
        <div class="frame" ref="frame">
            <div class="planet" ref="planet">
                <div class="inside">
                    <svg class="fill" viewBox="0 0 3240 3240" aria-hidden="true"><path :d="interior.path" :fill="'#' + interior.color" /></svg>
                    <div class="disc" ref="nucleus" :style="{ left: frac(NUC.x - NUC.r), top: frac(NUC.y - NUC.r), width: frac(2 * NUC.r), height: frac(2 * NUC.r), background: '#' + NUC.color }"></div>
                    <img v-for="p in FLOAT" :key="p.id" :ref="setEl(p.id)" class="piece" :style="p.style" :src="`/assets/hogar/${p.file}.webp`" alt="" draggable="false">
                    <img class="piece" ref="jelly" :style="jellyBox" src="/assets/hogar/medusa.webp" alt="" draggable="false">
                </div>
                <div class="spin" ref="crown">
                    <img v-for="p in WEEDS" :key="p.id" :ref="setEl(p.id)" class="piece" :style="p.style" :src="`/assets/hogar/${p.id}.webp`" alt="" draggable="false">
                    <img class="piece" :style="outlineBox" src="/assets/hogar/borde.webp" alt="" draggable="false">
                    <img v-for="p in CORALS" :key="p.id" :ref="setEl(p.id)" class="piece" :style="p.style" :src="`/assets/hogar/${p.id}.webp`" alt="" draggable="false">
                    <div v-for="p in CROWN" :key="'hit' + p.id" class="hit" role="button" tabindex="-1" :style="p.hit"
                        :aria-label="p.kind === 'coral' ? ($i18n.locale === 'en' ? 'Coral' : 'Coral') : ($i18n.locale === 'en' ? 'Sea grass' : 'Alga')"
                        @pointerdown.prevent="spores(p)($event)" @pointerenter="warm" @keydown="onKey(p)($event)"></div>
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

    .fill {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
    }

    .piece {
        position: absolute;
        display: block;
        max-width: none;
        user-select: none;
        pointer-events: none;
    }

    /* The nucleus: a plain disc, its fuzzy rim is particles */
    .disc {
        position: absolute;
        border-radius: 50%;
    }

    /* The crown turns about the middle of the interior */
    .spin {
        position: absolute;
        inset: 0;
        transform-origin: v-bind('(CELL.x * 100).toFixed(2) + "% " + (CELL.y * 100).toFixed(2) + "%"');
    }

    /* A touchable coral or weed: a circle on it, invisible */
    .hit {
        position: absolute;
        border-radius: 50%;
        cursor: pointer;
        pointer-events: auto;
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;
        outline: none;
    }

    .hit:focus-visible {
        outline: 2px solid rgba(255, 255, 255, 0.85);
        outline-offset: 2px;
    }

    .front {
        z-index: 1;
    }
</style>
