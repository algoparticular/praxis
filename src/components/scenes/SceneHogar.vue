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
    // Its verb is Arraigar (take root), as in Paciencia, but turned inwards: the home is inside, the "Divine spark" is
    // the nucleus. Holding the nucleus stops time: the crown stops turning, the water calms and the organelles stay
    // where they are, and the larva swims home and curls up against it. From the foot of every mushroom a root of light
    // grows across the water to the nucleus (useCellRoots), one by one; when a root gets there, a bead of light runs back
    // up it and that mushroom's cap lights with the spark's warmth, and the spark grows. Meanwhile the rulito is born
    // over the larva's head; it is whole when the last mushroom is lit: it flares, a wave of light runs out of the
    // nucleus along every root and each mushroom throws its spores as it gets there. Let go and time runs again: the
    // crown turns, the larva wanders off and the rulito's tail catches up with its head. The roots stay, dimmer, and the
    // lit caps keep a glow, brighter each time it is completed (up to three), so the next time the rulito is born at once.
    import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { createParallax } from '../../composables/useParallax.js';
    import { createLayerStage } from '../../composables/useLayerStage.js';
    import { startStardust } from '../../composables/useStardust.js';
    import { createCellWater } from '../../composables/useCellWater.js';
    import { createSparks } from '../../composables/useSparks.js';
    import { createCellRoots } from '../../composables/useCellRoots.js';
    import { play } from '../../composables/useSound.js';
    import { sceneMilestone } from '../../analytics.js';
    import Rulito from '../Rulito.vue';
    import dustCloud from '../../composables/hogarDust.json';
    import CAPS from '../../composables/hogarCaps.json';

    const props = defineProps({
        card: { type: Object, default: () => ({}) },
        active: Boolean
    });

    const root = ref(null);
    const canvas = ref(null);
    const hits = ref([]);                   // the mushrooms' touch targets
    const coreHit = ref(null);              // the nucleus's
    const rulito = ref(null);
    let stageEl = null;                     // the card's stage, where the name is lit from (--name-glow)
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
    // Home: where the larva curls up, against the nucleus's left side (from the nucleus's centre)
    const HOME = { x: -0.083, y: 0.02 };
    // The roots' canvas covers the inside of the planet; their feet are on the wall of the cell, under each mushroom
    const ROOT_AREA = { left: CELL.x - 0.2, top: CELL.y - 0.2, w: 0.4, h: 0.4 };
    const FOOT = CELL.r * 0.97;
    const SPARK = [1, 0.72, 0.44];                            // the warm light of the spark, and of the lit caps
    const NUCLEUS_COLOR = [0x72 / 255, 0x55 / 255, 0x6f / 255];
    const EMBER = [0xe0 / 255, 0x8e / 255, 0x6c / 255];       // the nucleus lit
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

    /* ---------- Arraigar: hold the nucleus, time stops, the roots reach it and every mushroom lights ---------- */

    const HOLD = 3.6;                       // seconds of holding for the roots to reach the nucleus from every mushroom
    const BORN = 0.25;                      // how far the roots have to have grown for the rulito to be born
    const GROW = 2.8;                       // seconds of holding to draw the rulito whole (it waits for the last mushroom)
    const LINGER = 0.9, EAT = 3.4;          // a whole rulito stays, then its tail goes all the way along it
    const BEAD = 0.45;                      // seconds the light takes to run back up a root to its mushroom
    const PULSE_TIME = 1.4;                 // and the wave out of the nucleus, along all of them
    const WALL_CROWNED = 0.12;              // how far the larva keeps from the wall while the rulito is over its head
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const rootsCanvas = document.createElement('canvas');
    const roots = createCellRoots(rootsCanvas, { sizes: CAPS.map(([, , r]) => r), area: ROOT_AREA });
    const feet = CAPS.map(() => ({ x: 0, y: 0 }));
    const lit = CAPS.map(() => -1);         // seconds since each mushroom was reached by its root, or -1
    const capGlow = CAPS.map(() => 0);
    const back = CAPS.map(() => -1);
    let litCount = 0;
    let held = false;
    let hot = false;                        // the pointer is over the nucleus
    let touched = false;                    // it has been held once (till then the spark breathes, a hint)
    let still = 0;                          // 0..1, how stopped time is
    let nest = 0;                           // 0..1, the larva curled up at home
    let turnNow = 0;                        // how far the crown has turned (degrees)
    let grow = 0;                           // 0..1, how far the roots have grown: they stay once grown
    let grown = 0;                          // 0..1, how long it has been held, on its way to GROW
    let head = 0;                           // how far along its stroke the front of the rulito is (0..1)
    let tail = 0;                           // and the back of it
    let idle = 0;                           // seconds since the nucleus was let go
    let full = false;                       // the flare has gone off for this rulito
    let pop = 0;                            // 1 when it completes, down to 0
    let level = 0;                          // 0..3, times it has been completed
    let wave = -1;                          // where the wave of light is along the roots (0..1), or -1
    let spark = 0;                          // the nucleus's light, eased
    let lastNote = -1;
    let glyph = null;

    // Pressing the nucleus: time stops while it is held
    const hold = () => {
        if (held) return;
        held = true;
        touched = true;
        play('tap');
        // Pressing again while the rulito is still whole celebrates again
        if (head >= 1) { pop = 1; bloom(); }
        window.addEventListener('pointerup', release);
        window.addEventListener('pointercancel', release);
    };
    const hover = (on) => { hot = on; };
    const release = () => {
        held = false;
        window.removeEventListener('pointerup', release);
        window.removeEventListener('pointercancel', release);
    };
    // With the keyboard the key is the finger: held down it holds, let go it releases
    const onCoreKeyDown = (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        if (!event.repeat) hold();
    };
    const onCoreKeyUp = (event) => {
        if (event.key === 'Enter' || event.key === ' ') release();
    };
    // Every mushroom is lit: the rulito flares, the spark throws sparks and a wave runs out along the roots
    const bloom = () => {
        play('rulito');
        play('bloom');
        level = Math.min(3, level + 1);
        sceneMilestone('rulito_completed', { times: level });
        wave = 0;
        dust?.boost(0, 1.6);
        dust?.boost(1, 1.2);
        if (reduced || !stage) return;
        const c = L.nucleus.toScreen(F.x + NUCLEUS.x * F.size, F.y + NUCLEUS.y * F.size);
        sparks.burst(c.x, c.y, { n: 40, colors: [0xffd29a, 0xffb069, 0xfff3d6, 0xff9a5c], speed: 130, life: 2.4, size: 4.6, spread: 6 });
    };
    // The wave has got to the mushrooms: each throws its spores
    const sporesAll = () => {
        if (reduced || !stage) return;
        CAPS.forEach(([x, y]) => {
            const c = L.crown.toScreen(F.x + x / 100 * F.size, F.y + y / 100 * F.size);
            sparks.burst(c.x, c.y, { n: 4, colors: [0xffb069, 0xff9a5c, 0xffd29a, 0xf08a8a], speed: 90, life: 2.2, size: 4, spread: 6 });
        });
        front?.boost(0, 1.4);
    };

    // Every frame: time, the larva's way home, the roots, the lit caps, the spark and the rulito
    const play_ = (t, dt, ramp) => {
        still += ((held ? 1 : 0) - still) * Math.min(1, dt * (held ? 2.5 : 0.7));
        turnNow += dt * 1.8 * ramp * (1 - still);
        water.calm = still;
        const n = water.offset('nucleus');
        water.home = held ? { x: NUCLEUS.x + n.x + HOME.x, y: NUCLEUS.y + n.y + HOME.y } : null;
        const me = water.swimmer;
        const athome = held ? Math.max(0, 1 - Math.hypot(me.x - water.home.x, me.y - water.home.y) / 0.03) : 0;
        nest += (athome - nest) * Math.min(1, dt * 2);
        pop = Math.max(0, pop - dt * 2.2);
        if (wave >= 0) {
            const was = wave;
            wave += dt / PULSE_TIME;
            if (was < 1 && wave >= 1) sporesAll();
            if (wave > 1.4) wave = -1;
        }
        // Held, the roots grow; once they are a quarter of the way, the rulito is born, and it is whole only when the
        // last mushroom is lit. Let go, after a moment its tail catches up with its head; the roots stay.
        if (held) {
            idle = 0;
            grow = Math.min(1, grow + dt / HOLD);
            if (grow >= BORN) {
                grown = Math.min(1, grown + dt / GROW);
                head = Math.max(head, Math.min(grow >= 1 ? 1 : 0.94, 1 - (1 - grown) ** 1.6));
            }
            tail = Math.max(0, tail - dt / 0.8);
        } else if (head > 0) {
            idle += dt;
            if (idle > (head >= 1 ? LINGER : 0.2)) tail = Math.min(head, tail + dt / EAT);
        }
        if (head >= 1 && !full) { full = true; pop = 1; bloom(); }
        if (head > 0 && head - tail < 0.0005) { head = 0; tail = 0; grown = 0; full = false; rulito.value.reshape(); play('release'); }
        // A root that reaches the nucleus sends a bead of light back up to its mushroom, which lights
        const whole = Math.min(1, Math.max(0, (head - tail - 0.6) / 0.4));
        const rest = 0.22 + 0.1 * level;
        CAPS.forEach((cap, i) => {
            if (lit[i] < 0 && grow >= roots.arrival(i)) {
                lit[i] = 0;
                litCount++;
                // Their notes climb the chord, not all of them, or it would be a rattle
                if (t - lastNote > 0.09) { lastNote = t; play('pulse', { step: litCount / CAPS.length }); }
            }
            if (lit[i] >= 0) lit[i] += dt;
            back[i] = lit[i] >= 0 && lit[i] < BEAD ? lit[i] / BEAD : -1;
            const want = lit[i] < BEAD ? 0 : held || whole > 0 ? 1 : rest;
            capGlow[i] += (want - capGlow[i]) * Math.min(1, dt * (want > capGlow[i] ? 5 : 1));
            const flash = wave >= 1 ? Math.exp(-(wave - 1) * 6) : 0;
            L.caps[i].opacity = Math.min(1, capGlow[i] + (lit[i] >= 0 ? flash : 0));
        });
        // The spark: it grows with the lit mushrooms; before the first hold it breathes, faintly, so it is noticed
        const hint = touched || reduced ? 0 : 0.25 * (0.5 + 0.5 * Math.sin(t * 1.3));
        const sparkWant = litCount / CAPS.length * (held ? 1 : 0.45) + (held ? 0.25 : hot ? 0.15 : 0) + hint;
        spark += (Math.min(1, sparkWant) - spark) * Math.min(1, dt * (sparkWant > spark ? 3 : 0.8));
        const e = Math.min(1, spark * 0.8 + pop * 0.2);
        L.nucleus.uniforms.uColor.value.setRGB(...NUCLEUS_COLOR.map((c, k) => c + (EMBER[k] - c) * e));
        L.spark.opacity = Math.min(1, spark + pop * 0.5);
        L.spark.scale = 1 + 0.12 * Math.sin(t * 1.6) * spark + 0.25 * pop;
        L.spark.x = n.x * F.size;
        L.spark.y = n.y * F.size;
        // The roots, drawn again every frame: their ends move with the crown and the nucleus
        if (grow > 0) {
            const a = turnNow * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
            CAPS.forEach(([x, y], i) => {
                const dx = x / 100 - CELL.x, dy = y / 100 - CELL.y, d = Math.hypot(dx, dy) || 1e-6;
                const ux = dx / d * FOOT, uy = dy / d * FOOT;
                feet[i].x = CELL.x + ux * ca - uy * sa;
                feet[i].y = CELL.y + ux * sa + uy * ca;
            });
            roots.frame({
                grow, feet, core: { x: NUCLEUS.x + n.x, y: NUCLEUS.y + n.y, r: NUCLEUS.r }, back,
                pulse: wave, level, quiet: 1 - Math.max(still, whole), t, size: ROOT_AREA.w * F.size,
            });
            L.roots.refresh();
        }
        // The card's name lights up when the rulito is completed, and the stage blooms with it
        const glow = Math.max(pop, 0.8 * whole * whole * (3 - 2 * whole));
        stageEl?.style.setProperty('--name-glow', glow.toFixed(3));
        stage.bloom = Math.max(glow, 0.3 * spark * still);
        const flare = full && head - tail > 0.9 ? Math.max(pop, Math.sin(t * 4) * 0.5 + 0.5) : 0;
        rulito.value.frame({ head, tail, flare, t, fade: Math.min(1, (head - tail) * 14), width: glyph.w });
        L.rulito.refresh();
        water.wall += ((head > 0 ? WALL_CROWNED : LARVA_AT.r) - water.wall) * Math.min(1, dt * 1.5);
    };

    const build = (s) => {
        const planetDepth = s.depth(PLANET_Z);
        L.planet = planetDepth.group();
        L.interior = L.planet.disc({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: 0x7e5e76, water: 1 });
        // The spark's light, round the nucleus (seen when it is held). Not in the bloom: that pass would draw it without
        // the nucleus in front of it, a white-hot dot in the middle
        L.spark = L.planet.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: SPARK, stops: [[0, 0.6], [0.3, 0.32], [0.62, 0]] });
        L.spark.opacity = 0;
        L.nucleus = L.planet.disc({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: 0x72556f });
        PIECES.forEach((p) => { els[p.id] = L.planet.image(`/assets/hogar/${p.file}.webp`, { shimmer: 0.6 }); });
        // The roots, over the organelles and under the larva
        L.roots = L.planet.canvas(rootsCanvas, { blending: 'add', bloom: true });
        L.larva = L.planet.image('/assets/hogar/larva.webp');
        L.rulito = L.planet.canvas(rulito.value.canvas, { bloom: true });
        L.crown = L.planet.group();
        L.crownPic = L.crown.image('/assets/hogar/crown.webp');
        // A light on every cap, seen when its root has reached the nucleus (it turns with the crown)
        L.caps = CAPS.map(() => {
            const node = L.crown.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: SPARK, stops: [[0, 0.75], [0.32, 0.32], [0.64, 0]], bloom: true });
            node.opacity = 0;
            return node;
        });
        L.planet.enter({ y: 60, scale: 0.7, duration: 2200 });
        L.larva.enter({ y: 0, scale: 0.4, delay: 1200, duration: 1600 });
    };
    const square = (cx, cy, d) => ({ left: F.x + (cx - d / 2) * F.size, top: F.y + (cy - d / 2) * F.size, w: d * F.size, h: d * F.size });

    const place = (W, H) => {
        layout(W, H);
        const centre = at(PLANET.x, PLANET.y);
        L.planet.pivot = centre;
        L.interior.place(discBox(CELL));
        L.nucleus.place(discBox(NUCLEUS));
        L.spark.place(square(NUCLEUS.x, NUCLEUS.y, NUCLEUS.r * 6));
        L.roots.place(inFrame({ left: ROOT_AREA.left * 100, top: ROOT_AREA.top * 100, w: ROOT_AREA.w * 100, h: ROOT_AREA.h * 100 }));
        PIECES.forEach((p) => els[p.id].place(inFrame(p.box)));
        // The larva walks about on its feet
        const larva = inFrame(LARVA);
        L.larva.place(larva, { x: larva.left + larva.w / 2, y: larva.top + larva.h * 0.8 });
        // The rulito over its head (its canvas is bigger than the glyph, for the glow, as in Paciencia), going with it
        const rh = LARVA.h * 0.7, rw = rh * 32 / 86;
        glyph = inFrame({ left: LARVA.left + LARVA.w / 2 - rw / 2, top: LARVA.top - 0.6 - rh, w: rw, h: rh });
        L.rulito.place({ left: glyph.left - 0.4375 * glyph.w, top: glyph.top - 0.1628 * glyph.h, w: glyph.w * 1.875, h: glyph.h * 1.3256 },
            { x: glyph.left + glyph.w / 2, y: glyph.top + glyph.h });
        // The crown turns about the middle of the interior (the disc's centre)
        L.crown.pivot = at(0.5096, 0.5049);
        L.crownPic.place(inFrame(CROWN));
        CAPS.forEach(([x, y, r], i) => L.caps[i].place(square(x / 100, y / 100, Math.max(r * 3.4, 4.5) / 100)));
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
        // The nucleus's, bigger than it so a finger finds it
        const el = coreHit.value;
        if (!el) return;
        const c = L.nucleus.toScreen(F.x + NUCLEUS.x * F.size, F.y + NUCLEUS.y * F.size);
        const d = Math.max(64, 2.6 * NUCLEUS.r * F.size * L.planet.scale);
        el.style.translate = `${(c.x - d / 2).toFixed(1)}px ${(c.y - d / 2).toFixed(1)}px`;
        el.style.width = el.style.height = `${d.toFixed(1)}px`;
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
        // The water: everything inside floats, and the larva bumps into it (while the nucleus is held, time stops)
        const dt = last === null ? 0 : t - last;
        last = t;
        play_(t, Math.min(dt, 0.1), ramp);
        L.crown.rotate = turnNow;
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
        L.larva.rotate = (tilt + Math.sin(t * 0.6) * 4 * ramp) * (1 - 0.6 * nest) + 6 * nest;
        L.larva.scale = 1 + Math.min(me.hit, 0.3) * 0.12;
        // At home it curls up against the nucleus, breathing slowly
        L.larva.sx = 1 + nest * (0.05 + 0.015 * Math.sin(t * 1.2));
        L.larva.sy = 1 - nest * (0.08 + 0.02 * Math.sin(t * 1.2));
        // The rulito goes with it
        L.rulito.x = L.larva.x;
        L.rulito.y = L.larva.y;
        L.rulito.rotate = L.larva.rotate * 0.5 + Math.sin(t * 1.8) * 3 * ramp;
        L.rulito.scale = 1 + 0.2 * pop * pop;
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
        stageEl = root.value.closest('.stage');
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
        stageEl?.style.removeProperty('--name-glow');
        window.removeEventListener('pointerup', release);
        window.removeEventListener('pointercancel', release);
    });
</script>

<template>
    <div class="scene" ref="root">
        <canvas class="stageCanvas" ref="canvas"></canvas>
        <div v-for="(cap, i) in CAPS" :key="i" :ref="(el) => { hits[i] = el; }" class="hit" role="button" tabindex="-1"
            :aria-label="$i18n.locale === 'en' ? 'Mushroom' : 'Hongo'"
            @pointerdown.prevent="spores" @pointerenter="warm" @keydown="onKey"></div>
        <!-- The nucleus is held, not tapped -->
        <div class="hit core" ref="coreHit" role="button" tabindex="0" :aria-label="$i18n.locale === 'en' ? 'Nucleus' : 'Núcleo'"
            @pointerdown.prevent="hold" @pointerenter="hover(true)" @pointerleave="hover(false)"
            @keydown="onCoreKeyDown" @keyup="onCoreKeyUp" @blur="release"></div>
        <!-- The rulito is drawn on its own canvas, which the stage shows as a texture over the larva's head -->
        <Rulito ref="rulito" class="offstage" color="#ffd29a" />
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

    .core {
        touch-action: none;                    /* a finger holding it drifts a little: with manipulation the phone takes that for a scroll and lets go of the hold */
        outline: none;
    }

    .core:focus-visible {
        outline: 2px solid rgba(255, 210, 154, 0.9);
        outline-offset: 2px;
    }

    .offstage {
        position: absolute;
        left: -9999px;
        top: 0;
        width: 40px;
        visibility: hidden;
    }
</style>
