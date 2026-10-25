<script setup>
    // Evolución espiritual: a cell-planet crowned with ferns, eight glowing bulbs on stalks and four pink mushrooms, with a
    // little being curled up inside it. Built like Creatividad and Hogar: the layers of the artwork (public/assets/evolucion,
    // cropped from sheets of 3240px; evolucionScene.json gives each one's box in % of that square) lie on a square frame.
    // The crown turns slowly; the stalks and the mushrooms sway from where they hang. The glows are particles on a canvas
    // that turns with the crown, behind everything: the stippled purple and pink rings of the original (density maps in
    // evolucionHalo.json) and a cloud of dots around each bulb and each mushroom, which flares when it is touched. The
    // colour is code: the interior is the drawn silhouette of the original disc, the nucleus a disc with a fuzzy particle
    // rim, the little blue buds plain discs. Inside, the watery system (useCellWater): the organelles bob about and the
    // being floats, bumping into them and into the wall of the cell.
    import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { createParallax, enterLayers } from '../../composables/useParallax.js';
    import { startStardust } from '../../composables/useStardust.js';
    import { createCellWater } from '../../composables/useCellWater.js';
    import { createSparks } from '../../composables/useSparks.js';
    import { play } from '../../composables/useSound.js';
    import halos from '../../composables/evolucionHalo.json';
    import scene from '../../composables/evolucionScene.json';

    const props = defineProps({
        card: { type: Object, default: () => ({}) },
        active: Boolean
    });

    const root = ref(null);
    const frame = ref(null);
    const skyCanvas = ref(null);
    const glowCanvas = ref(null);      // inside the turning layer behind the planet: the glows
    const frontCanvas = ref(null);     // in front: the nucleus's rim and the sparks
    const planet = ref(null);
    const glowSpin = ref(null);
    const crown = ref(null);
    const being = ref(null);
    const nucleus = ref(null);
    const els = {};
    const setEl = (id) => (el) => { els[id] = el; };
    let parallax = null;
    let sky = null;
    let glow = null;
    let front = null;
    let water = null;
    let last = null;
    let tilt = 0;
    let entered = false;

    const { cell: CELL, nucleus: NUC, swimmer: BEING, interior, fern, specks } = scene;
    const pct = (v) => `${v}%`;
    const boxStyle = ([left, top, w, h]) => ({ left: pct(left), top: pct(top), width: pct(w), height: pct(h) });
    const frac = (v) => `${(v * 100).toFixed(3)}%`;
    const hex = (s) => parseInt(s, 16);

    // Glow groups on the glow canvas: 0 and 1 the rings, then one for each bulb, then one for each mushroom
    const STALKS = scene.stalks.map((p, i) => ({ ...p, group: 2 + i, phase: i * 1.7, kind: 'bulb' }));
    const MUSHROOMS = scene.mushrooms.map((p, i) => ({ ...p, group: 2 + STALKS.length + i, phase: 3 + i * 2.3, kind: 'mushroom' }));
    const SWAYING = [...STALKS, ...MUSHROOMS].map((p) => ({
        ...p, style: { ...boxStyle(p.box), transformOrigin: `${p.origin[0]}% ${p.origin[1]}%` },
        hit: (() => {
            const r = Math.max(p.glow.sigma * (p.kind === 'bulb' ? 260 : 220), 2.6);
            return { left: pct((p.glow.x * 100 - r).toFixed(3)), top: pct((p.glow.y * 100 - r).toFixed(3)), width: pct((2 * r).toFixed(3)), height: pct((2 * r).toFixed(3)) };
        })(),
    }));
    const blueBuds = scene.blue.map(([x, y, r]) => ({ left: pct((x - r).toFixed(3)), top: pct((y - r).toFixed(3)), width: pct((2 * r).toFixed(3)), height: pct((2 * r).toFixed(3)) }));

    // The pieces that float in the water
    const FLOAT = [
        { id: 'motas', file: specks.file, box: specks.box, sway: 0.004, turn: 1 },
        ...scene.organelles.map((o) => ({ ...o, sway: 0.005, turn: 2, mass: o.circles.length > 3 ? 6 : 2 })),
    ].map((p) => ({ ...p, style: boxStyle(p.box) }));
    const BLUE = scene.blue_color;
    const beingBox = boxStyle(BEING.box);
    const fernBox = boxStyle(fern.box);

    const frameBox = (canvas = frontCanvas) => {
        const f = frame.value.getBoundingClientRect();
        const c = canvas.value.getBoundingClientRect();
        return { x: f.left - c.left, y: f.top - c.top, size: f.width };
    };

    // Density maps of the original stipple, back as particles (the grid's cells are in 3240px units; the glow canvas is the
    // frame itself, so a unit is w / 3240 pixels there)
    const decode = (cloud) => ({ ...cloud, bytes: Uint8Array.from(atob(cloud.data), (c) => c.charCodeAt(0)) });
    const cloudPoints = (grid, { dotUnits, floor, more, colors, origin }) => (w) => {
        const o = origin ? origin() : { x: 0, y: 0, size: w };
        const k = o.size / 3240;
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
                    out.push([o.x + (grid.x + (col + Math.random()) * grid.cell) * k, o.y + (grid.y + (row + Math.random()) * grid.cell) * k, dot * (0.7 + Math.random() * 0.7), colors[Math.floor(Math.random() * colors.length)]]);
                }
            }
        }
        return out;
    };
    // A cloud of dots thickest at its middle, as the glow of a bulb: as many as the original blob covered
    const glowPoints = (g) => (w) => {
        const k = w / 3240;
        const dot = Math.max(1.6, 7 * k);
        const n = Math.min(900, Math.round(g.mass * k * k / (Math.PI / 4 * dot * dot) * 1.5));
        const gauss = () => Math.sqrt(-2 * Math.log(Math.random() + 1e-9)) * Math.cos(Math.random() * Math.PI * 2);
        return Array.from({ length: n }, () => [g.x * w + gauss() * g.sigma * w, g.y * w + gauss() * g.sigma * w, dot * (0.7 + Math.random() * 0.8)]);
    };
    const rimPoints = cloudPoints(decode(NUC.rim), { dotUnits: 6, floor: 1.3, more: 1.8, colors: [hex(NUC.color)], origin: () => frameBox(frontCanvas) });

    // Touching a bulb or a mushroom: its glow flares, it squashes a little and sparks fly out
    const sparks = createSparks(480);
    const touch = (p) => (event) => {
        const box = event.currentTarget.getBoundingClientRect();
        const canvas = frontCanvas.value.getBoundingClientRect();
        const bulb = p.kind === 'bulb';
        sparks.burst(box.left + box.width / 2 - canvas.left, box.top + box.height / 2 - canvas.top, {
            n: 28, colors: bulb ? [0xffb069, 0xff9a5c, 0xffd29a, 0xfff3d6] : [0xe94b7d, 0xff7aa5, 0xffb3cb, 0xffffff], speed: 120, life: 2.6, size: 4.8, spread: 8,
        });
        els[p.id]?.animate({ scale: ['1 1', '1.16 0.88', '0.96 1.08', '1 1'] }, { duration: 700, easing: 'ease-out' });
        glow?.boost(p.group, 1.6);
        play(bulb ? 'star' : 'tap');
    };
    const warm = (p) => () => glow?.boost(p.group, 0.5);
    const onKey = (p) => (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        touch(p)(event);
    };

    const enter = () => {
        if (entered || !props.active) return;
        entered = true;
        enterLayers([
            { el: planet.value, y: 60, scale: 0.7, duration: 2200 },
            { el: being.value, y: 0, scale: 0.4, delay: 1200, duration: 1600 },
        ]);
    };

    onMounted(() => {
        water = createCellWater({
            bounds: { x: CELL.x, y: CELL.y, r: CELL.r - 0.004 },
            swimmer: { x: BEING.x, y: BEING.y, r: BEING.r },
            bodies: [
                { id: 'nucleus', circles: [[NUC.x, NUC.y, NUC.r]], mass: 12, sway: 0.004 },
                ...FLOAT.map(({ id, circles = [], mass, sway }) => ({ id, circles, mass, sway })),
            ],
        });
        parallax = createParallax(root.value, ({ x, y, scroll, t, ramp }) => {
            const s = scroll;
            // The planet hangs, breathing, and follows the pointer a little; the crown and its glows turn together
            planet.value.style.translate = `${-x * 18}px ${-y * 10 + Math.sin(t * 0.5) * 6 * ramp - s * 50}px`;
            planet.value.style.scale = 1 + Math.sin(t * 0.7) * 0.012 * ramp;
            const turn = `${(t * 1.4 * ramp).toFixed(3)}deg`;
            crown.value.style.rotate = turn;
            glowSpin.value.style.rotate = turn;
            // Each stalk sways from where it hangs, the mushrooms less
            SWAYING.forEach((p) => {
                els[p.id].style.rotate = `${(Math.sin(t * (p.kind === 'bulb' ? 0.9 : 0.6) + p.phase) * (p.kind === 'bulb' ? 3.4 : 2) * ramp).toFixed(2)}deg`;
            });
            // The water: everything inside floats, and the being bumps into it
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
            front?.shift(0, -x * 18 + n.x * size, -y * 10 + Math.sin(t * 0.5) * 6 * ramp - s * 50 + n.y * size);
            // The being floats, curled up, leaning into its way; a knock makes it squash a little
            const me = water.swimmer;
            tilt += (Math.max(-1, Math.min(1, me.vx / 0.012)) * 12 - tilt) * Math.min(1, dt * 1.5);
            being.value.style.translate = `${((me.x - BEING.x) * 100).toFixed(3)}cqw ${((me.y - BEING.y) * 100 + Math.sin(t * 0.9) * 0.25).toFixed(3)}cqw`;
            being.value.style.rotate = `${(tilt + Math.sin(t * 0.6) * 3 * ramp).toFixed(2)}deg`;
            const squash = 1 + Math.min(me.hit, 0.3) * 0.12;
            being.value.style.scale = `${((1 + Math.sin(t * 1.3) * 0.012 * ramp) * squash).toFixed(4)} ${((1 - Math.sin(t * 1.3) * 0.015 * ramp) / squash).toFixed(4)}`;
        });
        sky = startStardust(skyCanvas.value, {
            count: 170, colors: [0x72546e, 0x7d5e75, 0x5a243d], size: [2, 5.5],
            drift: 6, twinkle: 0.4, reach: 120, push: 30, parallax: 10, opacity: 0.8,
        });
        const still = { look: 'hard', parallax: 0, reach: 0 };
        glow = startStardust(glowCanvas.value, {
            groups: [
                { ...still, points: cloudPoints(decode(halos.purple), { dotUnits: 8, floor: 1.5, more: 2.2, colors: [hex(halos.purple.color)] }), drift: 5, jitter: 0.8, twinkle: 0.35 },
                { ...still, points: cloudPoints(decode(halos.pink), { dotUnits: 8, floor: 1.5, more: 2.2, colors: [hex(halos.pink.color)] }), drift: 5, jitter: 0.8, twinkle: 0.35 },
                ...[...STALKS, ...MUSHROOMS].map((p) => ({ ...still, points: glowPoints(p.glow), colors: [hex(p.glow.color)], drift: 3, jitter: 1.1, twinkle: 0.3 })),
            ],
        });
        front = startStardust(frontCanvas.value, {
            groups: [
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
        glow?.destroy();
        front?.destroy();
    });
</script>

<template>
    <div class="scene" ref="root">
        <canvas class="sky" ref="skyCanvas"></canvas>

        <!-- The planet's layers share one square, so the interior, the crown and the being line up -->
        <div class="frame" ref="frame">
            <div class="planet" ref="planet">
                <div class="spin" ref="glowSpin"><canvas class="sky" ref="glowCanvas"></canvas></div>
                <div class="inside">
                    <svg class="fill" viewBox="0 0 3240 3240" aria-hidden="true"><path :d="interior.path" :fill="'#' + interior.color" /></svg>
                    <div class="disc" ref="nucleus" :style="{ left: frac(NUC.x - NUC.r), top: frac(NUC.y - NUC.r), width: frac(2 * NUC.r), height: frac(2 * NUC.r), background: '#' + NUC.color }"></div>
                    <img v-for="p in FLOAT" :key="p.id" :ref="setEl(p.id)" class="piece" :style="p.style" :src="`/assets/evolucion/${p.file}.webp`" alt="" draggable="false">
                    <img class="piece" ref="being" :style="beingBox" src="/assets/evolucion/bebe.webp" alt="" draggable="false">
                </div>
                <div class="spin" ref="crown">
                    <div v-for="(b, i) in blueBuds" :key="'bud' + i" class="disc" :style="{ ...b, background: '#' + BLUE }"></div>
                    <img v-for="p in SWAYING" :key="p.id" :ref="setEl(p.id)" class="piece" :style="p.style" :src="`/assets/evolucion/${p.file}.webp`" alt="" draggable="false">
                    <img class="piece" :style="fernBox" src="/assets/evolucion/fronda.webp" alt="" draggable="false">
                    <div v-for="p in SWAYING" :key="'hit' + p.id" class="hit" role="button" tabindex="-1" :style="p.hit"
                        :aria-label="p.kind === 'bulb' ? ($i18n.locale === 'en' ? 'Glowing bulb' : 'Bulbo luminoso') : ($i18n.locale === 'en' ? 'Mushroom' : 'Hongo')"
                        @pointerdown.prevent="touch(p)($event)" @pointerenter="warm(p)()" @keydown="onKey(p)($event)"></div>
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

    /* The planet's square (3240px in the artwork) */
    .frame {
        --s: min(max(155vw, 70svh), 170svh);
        position: absolute;
        width: var(--s);
        height: var(--s);
        left: calc(50% - var(--s) / 2);
        top: calc(50% - var(--s) / 2 + 6svh);
        container-type: size;
        pointer-events: none;
    }

    /* On a wide screen the long fronds would reach up into the card's name: keep the crown smaller and lower, under it */
    @media (min-aspect-ratio: 1/1) {
        .frame {
            --s: min(106svh, 128vw);
            top: calc(50% - var(--s) / 2 + 8svh);
        }
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

    .disc {
        position: absolute;
        border-radius: 50%;
    }

    /* The crown, and the glows behind, turn about the middle of the interior */
    .spin {
        position: absolute;
        inset: 0;
        pointer-events: none;
        transform-origin: v-bind('(CELL.x * 100).toFixed(2) + "% " + (CELL.y * 100).toFixed(2) + "%"');
    }

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
