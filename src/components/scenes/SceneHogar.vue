<script setup>
    // Hogar: a living cell-planet crowned with mushrooms, a little larva inside it, in a quiet grey sky.
    // The layers come from the artwork (public/assets/hogar, cropped from sheets of 3240px: PIECES gives each
    // one's box as a percentage of that square). The crown of mushrooms turns slowly. The inside is a watery system
    // (useCellWater): every organelle bobs about where it was drawn, and the larva floats slowly, bumping into them
    // and into the wall of the cell instead of going through, and giving them a nudge. The colour is code: the
    // interior and the nucleus are plain discs (the interior with the light of the water rippling across it), the
    // nucleus's stipple and the spore dust around the planet are particles (useStardust), and so are the faint dots of
    // the sky. As in Pañña, the orange dust is a density map of the original stipple (hogarDust.json) drawn back as
    // particles behind the crown; only the thin fringe hugging the mushrooms stays in the picture. Touching a mushroom
    // throws spores (useSparks).
    // It is drawn in WebGL (useLayerStage): the planet is a group of planes at one depth, the camera slides with the
    // pointer or the tilt; the organelles tremble a little, as seen through water. The mushrooms' touch targets are DOM
    // elements kept over their caps as the crown turns.
    import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { createParallax } from '../../composables/useParallax.js';
    import { createLayerStage } from '../../composables/useLayerStage.js';
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
    const canvas = ref(null);
    const hits = ref([]);                   // the mushrooms' touch targets
    let stage = null;
    let parallax = null;
    let sky = null;
    let dust = null;
    let front = null;
    let water = null;
    let last = null;
    let tilt = 0;
    let entered = false;
    let gone = false;
    const L = {};                           // the layers (stage nodes)
    const els = {};                         // the floating pieces' nodes, by id
    let F = { x: 0, y: 0, size: 1 };        // the planet's square on screen at rest (px)

    // The camera slides SLIDE px at the edge of a swipe; the planet moves 18px across and 10 up and down, as before
    const SLIDE = 50;
    const SLIDE_Y = 28;
    const PLANET_Z = 18 / (SLIDE + 18);

    // Where each layer sits, in % of the 3240px square it was drawn in (left, top, width, height)
    const CROWN = { left: 16.574, top: 22.654, w: 65.895, h: 64.506 };
    const LARVA = { left: 42.037, top: 39.167, w: 5.031, h: 9.66 };
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
    ];

    // The planet's centre and radius in frame fractions: the interior disc's middle, and where the mushrooms start
    const PLANET = { x: 0.5096, y: 0.5049, r: 0.24 };
    // The nucleus, a disc inside it
    const NUCLEUS = { x: 0.5359, y: 0.4694, r: 0.0585 };
    const CELL = { x: 0.5096, y: 0.5049, r: 0.18 };           // the interior disc
    const LARVA_AT = { x: 0.4454, y: 0.452, r: 0.02 };        // where the larva was drawn, and its body
    // The dust of the original, back as particles: where the density map says there is stipple, as many dots as it covered
    const grid = { ...dustCloud, bytes: Uint8Array.from(atob(dustCloud.data), (c) => c.charCodeAt(0)) };
    const DUST_COLORS = [0xf8a275, 0xffb069, 0xf5976a, 0xffc08a];
    const dustPoints = () => {
        const f = frameBox();
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

    // The square of the artwork on screen (3240px in the artwork), centred, big enough that the crown fills the middle
    const layout = (W, H) => {
        const size = Math.min(Math.max(1.28 * W, 0.89 * H), 1.6 * H);
        F = { x: W / 2 - size / 2, y: H / 2 - size / 2 + 0.06 * H, size };
    };
    // A box given in % of the square, in px of the screen at rest
    const inFrame = (l) => ({ left: F.x + l.left / 100 * F.size, top: F.y + l.top / 100 * F.size, w: l.w / 100 * F.size, h: l.h / 100 * F.size });
    const at = (fx, fy) => ({ x: F.x + fx * F.size, y: F.y + fy * F.size });
    const frameBox = () => F;
    const discBox = (c) => ({ left: F.x + (c.x - c.r) * F.size, top: F.y + (c.y - c.r) * F.size, w: 2 * c.r * F.size, h: 2 * c.r * F.size });

    // Stipple on the nucleus: thicker on its right, like the artwork
    const nucleusStipple = () => {
        for (;;) {
            const a = Math.random() * Math.PI * 2;
            const d = Math.sqrt(Math.random()) * NUCLEUS.r;
            const u = Math.cos(a) * d / NUCLEUS.r;             // -1 (left) .. 1 (right)
            if (Math.random() > 0.08 + 0.92 * Math.max(0, (u + 0.35) / 1.35) ** 2) continue;
            return [F.x + (NUCLEUS.x + Math.cos(a) * d) * F.size, F.y + (NUCLEUS.y + Math.sin(a) * d) * F.size];
        }
    };
    const around = () => {
        const cx = F.x + PLANET.x * F.size;
        const cy = F.y + PLANET.y * F.size;
        const radius = PLANET.r * F.size * (1.02 + Math.abs((Math.random() + Math.random() + Math.random()) / 3 - 0.5) * 2.6);
        const angle = Math.random() * Math.PI * 2;
        return [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius];
    };

    // Touching a mushroom: spores fly out of it and the dust around the planet flares
    const sparks = createSparks(480);
    const spores = (event) => {
        const box = event.currentTarget.getBoundingClientRect();
        const area = canvas.value.getBoundingClientRect();
        sparks.burst(box.left + box.width / 2 - area.left, box.top + box.height / 2 - area.top, {
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

    const build = (s) => {
        const planetDepth = s.depth(PLANET_Z);
        L.planet = planetDepth.group();
        L.interior = L.planet.disc({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: 0x7e5e76, water: 1 });
        L.nucleus = L.planet.disc({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: 0x72556f });
        PIECES.forEach((p) => { els[p.id] = L.planet.image(`/assets/hogar/${p.file}.webp`, { shimmer: 0.6 }); });
        L.larva = L.planet.image('/assets/hogar/larva.webp');
        L.crown = L.planet.group();
        L.crownPic = L.crown.image('/assets/hogar/crown.webp');
        L.planet.enter({ y: 60, scale: 0.7, duration: 2200 });
        L.larva.enter({ y: 0, scale: 0.4, delay: 1200, duration: 1600 });
    };

    const place = (W, H) => {
        layout(W, H);
        const centre = at(PLANET.x, PLANET.y);
        L.planet.pivot = centre;
        L.interior.place(discBox(CELL));
        L.nucleus.place(discBox(NUCLEUS));
        PIECES.forEach((p) => els[p.id].place(inFrame(p.box)));
        // The larva walks about on its feet
        const larva = inFrame(LARVA);
        L.larva.place(larva, { x: larva.left + larva.w / 2, y: larva.top + larva.h * 0.8 });
        // The crown turns about the middle of the interior (the disc's centre)
        L.crown.pivot = at(0.5096, 0.5049);
        L.crownPic.place(inFrame(CROWN));
    };

    // The mushrooms' touch targets follow their caps as the crown turns
    const placeHits = () => {
        hits.value.forEach((el, i) => {
            if (!el) return;
            const [x, y, r] = CAPS[i];
            const c = L.crown.toScreen(F.x + x / 100 * F.size, F.y + y / 100 * F.size);
            const d = 2 * r / 100 * F.size * L.planet.scale;
            el.style.translate = `${(c.x - d / 2).toFixed(1)}px ${(c.y - d / 2).toFixed(1)}px`;
            el.style.width = el.style.height = `${d.toFixed(1)}px`;
        });
    };

    const enter = () => {
        if (entered || !props.active || !stage) return;
        entered = true;
        stage.ready().then(() => { if (!gone) stage.start(); });
    };

    let frames = 0;
    const frame = ({ x, y, scroll, t, ramp }) => {
        if (!stage) return;
        const s = scroll;
        stage.look(x * SLIDE, y * SLIDE_Y);
        // The planet hangs, breathing; the crown turns above the interior
        const py = Math.sin(t * 0.5) * 6 * ramp - s * 50;
        L.planet.y = py;
        L.planet.scale = 1 + Math.sin(t * 0.7) * 0.012 * ramp;
        L.crown.rotate = t * 1.8 * ramp;
        // The water: everything inside floats, and the larva bumps into it
        const dt = last === null ? 0 : t - last;
        last = t;
        water.step(dt * ramp, t);
        PIECES.forEach((p) => {
            const o = water.offset(p.id);
            const node = els[p.id];
            node.x = o.x * F.size;
            node.y = o.y * F.size;
            node.rotate = Math.sin(t * 0.15 + p.sway * 900) * p.turn * ramp + o.x * 120;
        });
        const n = water.offset('nucleus');
        L.nucleus.x = n.x * F.size;
        L.nucleus.y = n.y * F.size;
        // What is drawn in particles follows the planet: the halo of dust, and the nucleus's stipple with its own sway
        const drift = stage.drift(PLANET_Z);
        dust?.shift(0, drift.x, drift.y + py);
        front?.shift(1, drift.x + n.x * F.size, drift.y + py + n.y * F.size);
        // The larva floats, leaning into its way and bobbing; a knock makes it squash a little
        const me = water.swimmer;
        tilt += (Math.max(-1, Math.min(1, me.vx / 0.012)) * 16 - tilt) * Math.min(1, dt * 1.5);
        L.larva.x = (me.x - LARVA_AT.x) * F.size;
        L.larva.y = ((me.y - LARVA_AT.y) + Math.sin(t * 0.9) * 0.0025) * F.size;
        L.larva.rotate = tilt + Math.sin(t * 0.6) * 4 * ramp;
        L.larva.scale = 1 + Math.min(me.hit, 0.3) * 0.12;
        stage.render(t);
        if (frames++ % 2 === 0) placeHits();
    };

    const begin = async () => {
        let made;
        try {
            made = await createLayerStage(canvas.value);
        } catch (e) {
            console.warn('The WebGL stage is not available', e);
            return;
        }
        if (gone) { made.destroy(); return; }
        stage = made;
        water = createCellWater({
            bounds: CELL,
            swimmer: LARVA_AT,
            bodies: [
                { id: 'nucleus', circles: [[NUCLEUS.x, NUCLEUS.y, NUCLEUS.r]], mass: 12, sway: 0.004 },
                ...PIECES.map(({ id, circles = [], mass, sway }) => ({ id, circles, mass, sway })),
            ],
        });
        // The layers and their layout first, so the particles measured on them are made again after them on a resize
        build(stage);
        stage.onResize((W, H) => place(W, H));
        // The sky's faint dots, far behind
        sky = startStardust(null, {
            stage,
            groups: [{
                count: 150, colors: [0x7c4a6e, 0x8e4f72, 0xa95b78], size: [2, 5],
                drift: 6, twinkle: 0.4, reach: 120, push: 30, parallax: 10, opacity: 0.8, order: -20,
            }],
        });
        // Behind the planet: the animated dust that the baked dust of the crown's picture sits in front of
        dust = startStardust(null, {
            stage,
            groups: [
                // The halo of the original stipple (group 0, which follows the planet by hand)
                { points: dustPoints, look: 'hard', drift: 7, jitter: 0.9, twinkle: 0.5, reach: 120, push: 36, parallax: 0, order: -10 },
                {
                    count: 300, colors: [0xffb069, 0xff9a5c, 0xffd29a, 0xf08a8a], size: [2.5, 6.5], look: 'hard', spawn: around,
                    drift: 30, jitter: 0.5, twinkle: 0.8, reach: 150, push: 46, parallax: 18, order: -9,
                },
            ],
        });
        // In front: a few motes drifting across, and the nucleus's stipple (group 1, which follows the planet by hand)
        front = startStardust(null, {
            stage,
            groups: [
                {
                    count: 80, colors: [0xffb069, 0xffd29a, 0xf08a8a], size: [2.2, 5.5], look: 'hard', spawn: around,
                    drift: 34, jitter: 0.5, twinkle: 0.8, reach: 150, push: 46, parallax: 26, order: 1e6,
                },
                {
                    count: 240, colors: [0x86667e, 0x93718a, 0x7d5d75], size: [1.4, 3.4], look: 'hard', spawn: nucleusStipple,
                    drift: 2, jitter: 0.4, twinkle: 0.15, reach: 0, parallax: 0, opacity: 0.8,
                    // the stipple sits on the nucleus, under the organelles drawn over it
                    order: L.nucleus.mesh.renderOrder + 0.5,
                },
                // Spores thrown from the mushrooms that are touched
                { ...sparks.group(), order: 1e6 + 1 },
            ],
        });
        parallax = createParallax(root.value, frame);
        enter();
    };

    onMounted(begin);
    watch(() => props.active, enter);
    onBeforeUnmount(() => {
        gone = true;
        parallax?.destroy();
        sky?.destroy();
        dust?.destroy();
        front?.destroy();
        stage?.destroy();
    });
</script>

<template>
    <div class="scene" ref="root">
        <canvas class="stageCanvas" ref="canvas"></canvas>
        <div v-for="(cap, i) in CAPS" :key="i" :ref="(el) => { hits[i] = el; }" class="hit" role="button" tabindex="-1"
            :aria-label="$i18n.locale === 'en' ? 'Mushroom' : 'Hongo'"
            @pointerdown.prevent="spores" @pointerenter="warm" @keydown="onKey"></div>
    </div>
</template>

<style scoped>
    .scene {
        position: absolute;
        inset: 0;
        overflow: hidden;
    }

    .stageCanvas {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        display: block;
        pointer-events: none;
    }

    /* A touchable mushroom: a circle on its cap, invisible, moved over it as the crown turns */
    .hit {
        position: absolute;
        left: 0;
        top: 0;
        width: 0;
        height: 0;
        border-radius: 50%;
        cursor: pointer;
        pointer-events: auto;
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;
    }
</style>
