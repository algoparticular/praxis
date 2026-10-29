<script setup>
    // Evolución espiritual: a cell-planet crowned with ferns, eight glowing bulbs on stalks and four pink mushrooms, with a
    // little being curled up inside it. Built like Creatividad and Hogar: the layers of the artwork (public/assets/evolucion,
    // cropped from sheets of 3240px; evolucionScene.json gives each one's box in % of that square) lie on a square frame.
    // The crown turns slowly; the stalks and the mushrooms sway from where they hang. The glows are particles that turn
    // with the crown, behind everything: the stippled purple and pink rings of the original (density maps in
    // evolucionHalo.json) and a cloud of dots around each bulb and each mushroom, which flares when it is touched. The
    // colour is code: the interior is the drawn silhouette of the original disc (with the light of the water rippling
    // across it), the nucleus a disc with a fuzzy particle rim, the little blue buds plain discs. Inside, the watery
    // system (useCellWater): the organelles bob about and the being floats, bumping into them and into the wall of the cell.
    // It is drawn in WebGL (useLayerStage), like Hogar: the planet is a group of planes at one depth and the camera
    // slides with the pointer or the tilt; the fern fronds sway a little in the water. The touch targets are DOM
    // elements kept over the bulbs and mushrooms as the crown turns.
    import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { createParallax } from '../../composables/useParallax.js';
    import { createLayerStage } from '../../composables/useLayerStage.js';
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
    const canvas = ref(null);
    const hits = ref([]);
    let stage = null;
    let parallax = null;
    let sky = null;
    let glow = null;
    let front = null;
    let water = null;
    let last = null;
    let tilt = 0;
    let entered = false;
    let gone = false;
    const L = {};
    const els = {};
    const squashes = {};
    let F = { x: 0, y: 0, size: 1 };

    // The camera slides SLIDE px at the edge of a swipe; the planet moves 18px across and 10 up and down, as before
    const SLIDE = 50;
    const SLIDE_Y = 28;
    const PLANET_Z = 18 / (SLIDE + 18);

    const { cell: CELL, nucleus: NUC, swimmer: BEING, interior, fern, specks } = scene;
    const hex = (s) => parseInt(s, 16);

    // Glow groups: 0 and 1 the rings, then one for each bulb, then one for each mushroom
    const STALKS = scene.stalks.map((p, i) => ({ ...p, group: 2 + i, phase: i * 1.7, kind: 'bulb' }));
    const MUSHROOMS = scene.mushrooms.map((p, i) => ({ ...p, group: 2 + STALKS.length + i, phase: 3 + i * 2.3, kind: 'mushroom' }));
    const SWAYING = [...STALKS, ...MUSHROOMS].map((p) => ({ ...p, hitR: Math.max(p.glow.sigma * (p.kind === 'bulb' ? 260 : 220), 2.6) }));

    // The pieces that float in the water
    const FLOAT = [
        { id: 'motas', file: specks.file, box: specks.box, sway: 0.004, turn: 1 },
        ...scene.organelles.map((o) => ({ ...o, sway: 0.005, turn: 2, mass: o.circles.length > 3 ? 6 : 2 })),
    ];
    const BLUE = hex(scene.blue_color);

    // The planet's square (3240px in the artwork); on a wide screen smaller and lower, so the long fronds stay under the name
    const layout = (W, H) => {
        const wide = W >= H;
        const size = wide ? Math.min(1.06 * H, 1.28 * W) : Math.min(Math.max(1.55 * W, 0.7 * H), 1.7 * H);
        F = { x: W / 2 - size / 2, y: H / 2 - size / 2 + (wide ? 0.08 : 0.06) * H, size };
    };
    const inFrame = ([left, top, w, h]) => ({ left: F.x + left / 100 * F.size, top: F.y + top / 100 * F.size, w: w / 100 * F.size, h: h / 100 * F.size });
    const at = (fx, fy) => ({ x: F.x + fx * F.size, y: F.y + fy * F.size });

    // Density maps of the original stipple, back as particles (the grid's cells are in 3240px units)
    const decode = (cloud) => ({ ...cloud, bytes: Uint8Array.from(atob(cloud.data), (c) => c.charCodeAt(0)) });
    const cloudPoints = (grid, { dotUnits, floor, more, colors }) => () => {
        const k = F.size / 3240;
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
                    out.push([F.x + (grid.x + (col + Math.random()) * grid.cell) * k, F.y + (grid.y + (row + Math.random()) * grid.cell) * k, dot * (0.7 + Math.random() * 0.7), colors[Math.floor(Math.random() * colors.length)]]);
                }
            }
        }
        return out;
    };
    // A cloud of dots thickest at its middle, as the glow of a bulb: as many as the original blob covered
    const glowPoints = (g) => () => {
        const w = F.size;
        const k = w / 3240;
        const dot = Math.max(1.6, 7 * k);
        const n = Math.min(900, Math.round(g.mass * k * k / (Math.PI / 4 * dot * dot) * 1.5));
        const gauss = () => Math.sqrt(-2 * Math.log(Math.random() + 1e-9)) * Math.cos(Math.random() * Math.PI * 2);
        return Array.from({ length: n }, () => [F.x + g.x * w + gauss() * g.sigma * w, F.y + g.y * w + gauss() * g.sigma * w, dot * (0.7 + Math.random() * 0.8)]);
    };
    const rimPoints = cloudPoints(decode(NUC.rim), { dotUnits: 6, floor: 1.3, more: 1.8, colors: [hex(NUC.color)] });

    // The interior: the silhouette of the original disc, drawn once (per size) on a canvas shown as a texture
    const interiorCanvas = document.createElement('canvas');
    const INTERIOR = [CELL.x - CELL.r - 0.012, CELL.y - CELL.r - 0.012, 2 * CELL.r + 0.024];
    const drawInterior = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const px = Math.round(INTERIOR[2] * F.size * dpr);
        interiorCanvas.width = interiorCanvas.height = px;
        const ctx = interiorCanvas.getContext('2d');
        const k = px / (INTERIOR[2] * 3240);
        ctx.setTransform(k, 0, 0, k, -INTERIOR[0] * 3240 * k, -INTERIOR[1] * 3240 * k);
        ctx.fillStyle = '#' + interior.color;
        ctx.fill(new Path2D(interior.path));
    };

    // Touching a bulb or a mushroom: its glow flares, it squashes a little and sparks fly out
    const sparks = createSparks(480);
    const touch = (p) => (event) => {
        const box = event.currentTarget.getBoundingClientRect();
        const area = canvas.value.getBoundingClientRect();
        const bulb = p.kind === 'bulb';
        sparks.burst(box.left + box.width / 2 - area.left, box.top + box.height / 2 - area.top, {
            n: 28, colors: bulb ? [0xffb069, 0xff9a5c, 0xffd29a, 0xfff3d6] : [0xe94b7d, 0xff7aa5, 0xffb3cb, 0xffffff], speed: 120, life: 2.6, size: 4.8, spread: 8,
        });
        squashes[p.id] = last ?? 0;
        glow?.boost(p.group, 1.6);
        play(bulb ? 'star' : 'tap');
    };
    const warm = (p) => () => glow?.boost(p.group, 0.5);
    const onKey = (p) => (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        touch(p)(event);
    };
    // The squash of a touched piece over 0.7s: wider and lower, then taller, then itself
    const SQUASH = [[0, 1, 1], [1 / 3, 1.16, 0.88], [2 / 3, 0.96, 1.08], [1, 1, 1]];
    const squashAt = (p) => {
        const k = Math.min(1, Math.max(0, p));
        for (let i = 1; i < SQUASH.length; i++) {
            if (k <= SQUASH[i][0]) {
                const [a0, ax, ay] = SQUASH[i - 1], [b0, bx, by] = SQUASH[i];
                const f = 1 - (1 - (k - a0) / (b0 - a0)) ** 2;
                return [ax + (bx - ax) * f, ay + (by - ay) * f];
            }
        }
        return [1, 1];
    };

    const build = (s) => {
        const planetDepth = s.depth(PLANET_Z);
        L.planet = planetDepth.group();
        L.interior = L.planet.canvas(interiorCanvas, { water: 1 });
        L.nucleus = L.planet.disc({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: hex(NUC.color) });
        FLOAT.forEach((p) => { els[p.id] = L.planet.image(`/assets/evolucion/${p.file}.webp`, { shimmer: 0.6 }); });
        L.being = L.planet.image('/assets/evolucion/bebe.webp');
        L.crown = L.planet.group();
        L.buds = scene.blue.map(() => L.crown.disc({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: BLUE }));
        SWAYING.forEach((p) => { els[p.id] = L.crown.image(`/assets/evolucion/${p.file}.webp`); });
        L.fern = L.crown.image('/assets/evolucion/fronda.webp', { wind: { amp: 3, speed: 0.7, root: 'top' }, segments: [20, 20] });
        L.planet.enter({ y: 60, scale: 0.7, duration: 2200 });
        L.being.enter({ y: 0, scale: 0.4, delay: 1200, duration: 1600 });
    };

    const place = (W, H) => {
        layout(W, H);
        drawInterior();
        L.interior.refresh();
        L.planet.pivot = at(CELL.x, CELL.y);
        L.interior.place({ left: F.x + INTERIOR[0] * F.size, top: F.y + INTERIOR[1] * F.size, w: INTERIOR[2] * F.size, h: INTERIOR[2] * F.size });
        L.nucleus.place({ left: F.x + (NUC.x - NUC.r) * F.size, top: F.y + (NUC.y - NUC.r) * F.size, w: 2 * NUC.r * F.size, h: 2 * NUC.r * F.size });
        FLOAT.forEach((p) => els[p.id].place(inFrame(p.box)));
        L.being.place(inFrame(BEING.box));
        L.crown.pivot = at(CELL.x, CELL.y);
        scene.blue.forEach(([x, y, r], i) => L.buds[i].place(inFrame([x - r, y - r, 2 * r, 2 * r])));
        SWAYING.forEach((p) => {
            const box = inFrame(p.box);
            els[p.id].place(box, { x: box.left + p.origin[0] / 100 * box.w, y: box.top + p.origin[1] / 100 * box.h });
        });
        L.fern.place(inFrame(fern.box));
    };

    const placeHits = () => {
        hits.value.forEach((el, i) => {
            if (!el) return;
            const p = SWAYING[i];
            const c = L.crown.toScreen(F.x + p.glow.x * F.size, F.y + p.glow.y * F.size);
            const d = 2 * p.hitR / 100 * F.size * L.planet.scale;
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
        // The planet hangs, breathing; the crown and its glows turn together
        const py = Math.sin(t * 0.5) * 6 * ramp - s * 50;
        L.planet.y = py;
        L.planet.scale = 1 + Math.sin(t * 0.7) * 0.012 * ramp;
        const turn = t * 1.4 * ramp;
        L.crown.rotate = turn;
        // Each stalk sways from where it hangs, the mushrooms less; a touched one squashes
        SWAYING.forEach((p) => {
            const node = els[p.id];
            node.rotate = Math.sin(t * (p.kind === 'bulb' ? 0.9 : 0.6) + p.phase) * (p.kind === 'bulb' ? 3.4 : 2) * ramp;
            if (squashes[p.id] === undefined) return;
            [node.sx, node.sy] = squashAt((t - squashes[p.id]) / 0.7);
            if (t - squashes[p.id] > 0.7) delete squashes[p.id];
        });
        // The water: everything inside floats, and the being bumps into it
        const dt = last === null ? 0 : t - last;
        last = t;
        water.step(dt * ramp, t);
        FLOAT.forEach((p) => {
            const o = water.offset(p.id);
            const node = els[p.id];
            node.x = o.x * F.size;
            node.y = o.y * F.size;
            node.rotate = Math.sin(t * 0.15 + p.sway * 900) * p.turn * ramp + o.x * 120;
        });
        const n = water.offset('nucleus');
        L.nucleus.x = n.x * F.size;
        L.nucleus.y = n.y * F.size;
        // The particles follow the planet: the glows turn with the crown, the nucleus's rim sways with it
        const drift = stage.drift(PLANET_Z);
        const centre = at(CELL.x, CELL.y);
        for (let i = 0; i < 2 + SWAYING.length; i++) {
            glow?.turn(i, turn, centre.x, centre.y);
            glow?.shift(i, drift.x, drift.y + py);
        }
        front?.shift(0, drift.x + n.x * F.size, drift.y + py + n.y * F.size);
        // The being floats, curled up, leaning into its way; a knock makes it squash a little
        const me = water.swimmer;
        tilt += (Math.max(-1, Math.min(1, me.vx / 0.012)) * 12 - tilt) * Math.min(1, dt * 1.5);
        L.being.x = (me.x - BEING.x) * F.size;
        L.being.y = ((me.y - BEING.y) + Math.sin(t * 0.9) * 0.0025) * F.size;
        L.being.rotate = tilt + Math.sin(t * 0.6) * 3 * ramp;
        const squash = 1 + Math.min(me.hit, 0.3) * 0.12;
        L.being.sx = (1 + Math.sin(t * 1.3) * 0.012 * ramp) * squash;
        L.being.sy = (1 - Math.sin(t * 1.3) * 0.015 * ramp) / squash;
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
            bounds: { x: CELL.x, y: CELL.y, r: CELL.r - 0.004 },
            swimmer: { x: BEING.x, y: BEING.y, r: BEING.r },
            bodies: [
                { id: 'nucleus', circles: [[NUC.x, NUC.y, NUC.r]], mass: 12, sway: 0.004 },
                ...FLOAT.map(({ id, circles = [], mass, sway }) => ({ id, circles, mass, sway })),
            ],
        });
        sky = startStardust(null, {
            stage,
            groups: [{
                count: 170, colors: [0x72546e, 0x7d5e75, 0x5a243d], size: [2, 5.5],
                drift: 6, twinkle: 0.4, reach: 120, push: 30, parallax: 10, opacity: 0.8, order: -20,
            }],
        });
        // Behind the planet, turning with the crown: the rings and the glows of the bulbs and mushrooms
        const still = { look: 'hard', parallax: 0, reach: 0 };
        glow = startStardust(null, {
            stage,
            groups: [
                { ...still, points: cloudPoints(decode(halos.purple), { dotUnits: 8, floor: 1.5, more: 2.2, colors: [hex(halos.purple.color)] }), drift: 5, jitter: 0.8, twinkle: 0.35, order: -10 },
                { ...still, points: cloudPoints(decode(halos.pink), { dotUnits: 8, floor: 1.5, more: 2.2, colors: [hex(halos.pink.color)] }), drift: 5, jitter: 0.8, twinkle: 0.35, order: -9 },
                ...SWAYING.map((p, i) => ({ ...still, points: glowPoints(p.glow), colors: [hex(p.glow.color)], drift: 3, jitter: 1.1, twinkle: 0.3, order: -8 + i * 0.01 })),
            ],
        });
        build(stage);
        stage.onResize((W, H) => place(W, H));
        front = startStardust(null, {
            stage,
            groups: [
                { points: rimPoints, look: 'hard', drift: 2, jitter: 0.5, twinkle: 0.1, reach: 0, parallax: 0, order: L.nucleus.mesh.renderOrder + 0.5 },
                { ...sparks.group(), order: 1e6 },
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
        glow?.destroy();
        front?.destroy();
        stage?.destroy();
    });
</script>

<template>
    <div class="scene" ref="root">
        <canvas class="stageCanvas" ref="canvas"></canvas>
        <div v-for="(p, i) in SWAYING" :key="'hit' + p.id" :ref="(el) => { hits[i] = el; }" class="hit" role="button" tabindex="-1"
            :aria-label="p.kind === 'bulb' ? ($i18n.locale === 'en' ? 'Glowing bulb' : 'Bulbo luminoso') : ($i18n.locale === 'en' ? 'Mushroom' : 'Hongo')"
            @pointerdown.prevent="touch(p)($event)" @pointerenter="warm(p)()" @keydown="onKey(p)($event)"></div>
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
        outline: none;
    }

    .hit:focus-visible {
        outline: 2px solid rgba(255, 255, 255, 0.85);
        outline-offset: 2px;
    }
</style>
