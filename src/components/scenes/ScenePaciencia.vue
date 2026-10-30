<script setup>
    // Paciencia: the little larvae in their boat, drifting over a field of coral and mushrooms under a stippled sun.
    // Its verb is Arraigar (take root): the pine cone is held, not tapped. While it is held, the rulito over the
    // central Sama's head (a stroke drawn in code, Rulito.vue) is born as a dot, stretches into a line and curls into
    // its loop, taking GROW seconds to be whole (quick at first, easing as it gets there); when it is, it flares, throws sparks and the blue spores multiply
    // (they swell for a few seconds and settle back). Let go and its tail starts
    // to catch up with its head (EAT seconds for the whole stroke) until it shrinks back into a dot and is gone, so
    // no hold is wasted. The next one has another shape. When it is completed the card's name lights up too, and the
    // scene blooms: the rulito, the cone, the roots and the sparks glow (the only moment the stage blooms).
    // It is drawn in WebGL (useLayerStage): the layers come from the artwork itself (public/assets/collaborate, and the
    // boat in public/assets/paciencia, made by scripts/convert-paciencia.mjs), each at its depth, and the camera slides
    // with the pointer or the tilt of the phone, so the ground (mushrooms with the grass behind them) moves most and the
    // sun least. The grass sways in the wind and the air trembles over the sun.
    // The crew of the boat is alive, each in its own way, their antennae swaying in the wind: the one at the left looks
    // around and blinks, the one in the middle rows, the little one beside him hops now and then, the one up on the
    // spiral hums to and fro and the sleepy one at the right end nods off and wakes with a start. The mushrooms lean and
    // breathe on their stems (sway in useLayerStage), and now and then one gathers itself and lets go of its spores.
    // The air above the mushrooms is a spore system (useSpores) drawn as particles among the layers, the roots and the
    // rulito are 2D canvases drawn into the stage as textures. The touch target of the pine cone is a DOM element kept
    // over it, so it can be pressed with a finger and with the keyboard.
    import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { createParallax } from '../../composables/useParallax.js';
    import { createLayerStage } from '../../composables/useLayerStage.js';
    import { createStardust } from '../../composables/useStardust.js';
    import { createSpores } from '../../composables/useSpores.js';
    import { createRoots } from '../../composables/useRoots.js';
    import { play } from '../../composables/useSound.js';
    import { sceneMilestone } from '../../analytics.js';
    import Rulito from '../Rulito.vue';
    import cone from '../../composables/pineCone.json';
    import rulitoAt from '../../composables/pacienciaRulito.json';
    import boatAt from '../../composables/pacienciaScene.json';
    import caps from '../../composables/mushroomCaps.json';

    const props = defineProps({
        card: { type: Object, default: () => ({}) },
        active: Boolean
    });

    const root = ref(null);
    const canvas = ref(null);
    const coneHit = ref(null);
    const rulito = ref(null);
    let stageEl = null;                     // the card's stage, where the name is lit from (--name-glow)
    const lit = ref(false);                 // the pine cone is being pressed
    const hot = ref(false);                 // the pointer is over it
    let stage = null;
    let parallax = null;
    let spores = null;
    let particles = null;
    let roots = null;
    let gone = false;
    let entered = false;
    const L = {};                           // the layers (stage nodes)
    let box = null;                         // where everything sits, from layout()

    // How far each depth goes with the camera: at the edge of a swipe the sun moves 8px, the boat 22 and the ground
    // 40 (z = amp / (SLIDE + amp)); the camera slides less up and down, so the ground never shows its bottom edge
    const SLIDE = 50;
    const SLIDE_Y = 18;
    const depthFor = (amp) => amp / (SLIDE + amp);

    const ASSETS = '/assets/collaborate/';
    const BOAT = '/assets/paciencia/boat.webp';
    const SIZES = { sun: [200, 191], boat: boatAt.box.slice(2), plants: [2400, 197], mushrooms: [2400, 225], cone: [100, 128] };
    const ROOM = 0.25;                      // room over the mushrooms picture (a fraction of its height) for the caps to lean into

    // The crew: the pieces of each being (from pacienciaScene.json), where its feet are (px of the artwork: it breathes
    // and leans about them), the wind in its antennae and its eyes, to blink (open ones) or not
    const CREW = {
        l: { feet: [930, 2040], wind: [4, 1.3], blinks: true },
        c: { feet: [1665, 2000], wind: [6, 0.9] },
        s: { feet: [1876, 1930], wind: [2.5, 2.1], blinks: true },
        t: { feet: [918, 930], wind: [3.5, 1.6] },
        r: { feet: [2700, 1636], wind: [3.5, 0.8] },
    };
    // The oar turns in the hands of the one who rows
    const OAR_GRIP = [1700, 1830];

    // The layout of the DOM version, in px of the screen: the sun at the top right, the boat over the strips of coral
    // and grass, the ground wider than the screen so it can slide without showing its ends
    const layout = (W, H) => {
        const strip = Math.min(170, Math.max(78, 0.15 * H));
        const narrow = W <= 600;
        const sunW = Math.min(150, Math.max(64, 0.17 * Math.min(W, H)));
        const sunH = sunW * SIZES.sun[1] / SIZES.sun[0];
        const sun = { left: W - (narrow ? 0.07 : 0.12) * W - sunW, top: (narrow ? 0.27 : 0.14) * H, w: sunW, h: sunH };
        const boatW = Math.min(0.88 * W, 0.54 * H, 560);
        const boatH = boatW * SIZES.boat[1] / SIZES.boat[0];
        const boat = { left: W / 2 - boatW / 2, top: H - (strip * 1.3 + 0.05 * H) - boatH, w: boatW, h: boatH };
        // On a phone the strip is bigger (its foot stays put), so the pine cone sits higher and is easier to reach
        const groundW = Math.max(1.3 * W, strip * 10.67 * 1.1 * (narrow ? 1.3 : 1));
        const groundH = groundW * SIZES.mushrooms[1] / SIZES.mushrooms[0];
        const ground = { left: W / 2 - groundW / 2, top: H + 0.2 * strip - groundH, w: groundW, h: groundH };
        // Inside the boat: the rulito on the central Sama's head (its canvas is bigger than the glyph, for the glow)
        const rw = rulitoAt.w * boatW, rh = rw * 86 / 32;
        const glyph = { left: boat.left + rulitoAt.x * boatW, top: boat.top + rulitoAt.y * boatH, w: rw, h: rh };
        const rulitoCanvas = { left: glyph.left - 0.4375 * rw, top: glyph.top - 0.1628 * rh, w: rw * 1.875, h: rh * 1.3256 };
        // Inside the ground (fractions of the mushrooms picture)
        const grassH = groundW * SIZES.plants[1] / SIZES.plants[0];
        const grass = { left: ground.left, top: ground.top + groundH * 1.07 - grassH, w: groundW, h: grassH };
        const coneW = cone.w * groundW;
        const coneRect = { left: ground.left + cone.x * groundW, top: ground.top + cone.y * groundH, w: coneW, h: coneW * SIZES.cone[1] / SIZES.cone[0] };
        const glowSize = cone.w * groundW * 3.4;
        const coneCentre = { x: ground.left + (cone.x + cone.w / 2) * groundW, y: ground.top + (cone.y + cone.h / 2) * groundH };
        const coneGlow = { left: coneCentre.x - glowSize / 2, top: coneCentre.y - glowSize / 2, w: glowSize, h: glowSize };
        const haloSize = coneW * 2.6;
        const coneHalo = { left: coneCentre.x - haloSize / 2, top: coneCentre.y - haloSize / 2, w: haloSize, h: haloSize };
        const hit = {
            left: ground.left + (cone.x - cone.w * 0.35) * groundW, top: ground.top + (cone.y - cone.h * 0.08) * groundH,
            w: cone.w * groundW * 1.7, h: cone.h * groundH * 1.2,
        };
        const sunGlow = { left: sun.left - sunW * 0.55, top: sun.top - sunH * 0.55, w: sunW * 2.1, h: sunH * 2.1 };
        return { W, H, sun, sunGlow, boat, glyph, rulitoCanvas, ground, grass, coneRect, coneGlow, coneHalo, coneCentre, hit };
    };

    // The sun, measured on its old picture (in fractions of its box): its solid middle and its colour; and its stippled
    // rim, made here, thinning outwards as the picture had it
    const SUN = { x: 0.516, y: 0.496, r: 0.36, color: 0xf3f4f5 };
    const SUN_RIM = Array.from({ length: 900 }, () => {
        const a = Math.random() * Math.PI * 2;
        const out = Math.random() ** 1.8;
        return { dx: Math.cos(a) * SUN.r * (0.96 + 0.44 * out), dy: Math.sin(a) * SUN.r * (0.96 + 0.44 * out), size: 1.4 + Math.random() * 1.6 * (1 - 0.5 * out), seed: Math.random() * 6.28 };
    });
    const sunRim = {
        count: SUN_RIM.length,
        update(t, data) {
            if (!box || !L.sun) return;
            const drift = stage.drift(L.back.z);
            const w = box.sun.w, k = w / 110;
            const cx = box.sun.left + SUN.x * w + drift.x, cy = box.sun.top + SUN.y * box.sun.h + L.sun.y + drift.y;
            const sc = L.sun.scale;
            SUN_RIM.forEach((d, i) => {
                const j = reduced ? 0 : 0.6 * Math.sin(t * 1.7 + d.seed);
                data.positions[i * 3] = cx + d.dx * w * sc + j;
                data.positions[i * 3 + 1] = cy + d.dy * w * sc + j * 0.7;
                data.sizes[i] = Math.max(1.1, d.size * k);
                data.alphas[i] = reduced ? 1 : 0.75 + 0.25 * Math.sin(t * 2.3 + d.seed * 3);
                data.tints[i * 3] = 0.953; data.tints[i * 3 + 1] = 0.957; data.tints[i * 3 + 2] = 0.961;
            });
        },
    };

    const build = (s) => {
        const back = s.depth(depthFor(8));
        L.sunGlow = back.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: 0xffffff, stops: [[0, 0.5], [0.3, 0.3], [0.62, 0]] });
        // The sun is not a picture: a disc in code, its stippled rim live particles (sunRim)
        L.back = back;
        L.sun = back.disc({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: SUN.color });
        const mid = s.depth(depthFor(22));
        L.boat = mid.group();
        // The boat in pieces, drawn back to front as the artwork was: the one at the left sits inside the hull, the
        // others stand on it and the oar crosses in front of it
        const piece = (node, name, options = {}) => (L[name] = node.image(BOAT, { crop: boatAt.pieces[name].crop, ...options }));
        const being = (k, extra = []) => {
            const g = (L[k] = L.boat.group());
            piece(g, k + 'Body');
            piece(g, k + 'Line');
            piece(g, k + 'Antennae', { wind: { amp: CREW[k].wind[0], speed: CREW[k].wind[1] } });
            L[k + 'Look'] = g.group();
            piece(L[k + 'Look'], k + 'Eyes');
            extra.forEach((name) => piece(g, name));
            return g;
        };
        being('l', ['lHands']);
        piece(L.boat, 'fill');
        piece(L.boat, 'line');
        being('c');
        // The oar is in the hands of the one in the middle: it goes with him, and turns in his grip
        L.oar = L.c.group();
        ['arms', 'oarFill', 'oarLine', 'oarSpot'].forEach((name) => piece(L.oar, name));
        being('s');
        being('t');
        being('r');
        // The rulito is on the head of the one in the middle, and goes with him
        L.rulito = L.c.canvas(rulito.value.canvas, { bloom: true });
        const near = s.depth(depthFor(40));
        L.ground = near.group();
        L.grass = L.ground.image(ASSETS + 'plants.webp', { wind: { amp: 5, speed: 0.9 } });
        const rootsCanvas = document.createElement('canvas');
        roots = createRoots(rootsCanvas);
        L.roots = L.ground.canvas(rootsCanvas, { bloom: true, blending: 'add' });
        // In a box taller than the picture, so the caps at its top can lean and stretch into the air
        L.mushrooms = L.ground.image(ASSETS + 'mushrooms.webp', { sway: true, crop: [0, -ROOM, 1, 1 + ROOM] });
        L.coneGlow = L.ground.glow({
            rect: { left: 0, top: 0, w: 1, h: 1 }, color: [1, 0.93, 0.5],
            stops: [[0, 0.5], [0.38 * 0.7071, 0.18], [0.7 * 0.7071, 0]],
        });
        L.coneHalo = L.ground.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: [1, 0.95, 0.6], stops: [[0, 0.7], [0.25, 0.35], [0.6, 0]], bloom: true });
        L.cone = L.ground.image('/assets/paciencia/cone.webp', { bloom: true });
        L.coneGlow.opacity = 0;
        L.coneHalo.opacity = 0;
        L.sun.enter({ y: -30, scale: 0.6, duration: 1800 });
        L.sunGlow.enter({ y: -30, scale: 0.6, duration: 1800 });
        L.boat.enter({ y: 90, delay: 250, duration: 1800 });
        L.ground.enter({ y: 170, delay: 450, duration: 1600 });
    };

    const place = (W, H) => {
        box = layout(W, H);
        const sr = SUN.r * box.sun.w;
        const sc = { x: box.sun.left + SUN.x * box.sun.w, y: box.sun.top + SUN.y * box.sun.h };
        L.sun.place({ left: sc.x - sr, top: sc.y - sr, w: 2 * sr, h: 2 * sr });
        L.sunGlow.place(box.sunGlow, { x: box.sun.left + box.sun.w / 2, y: box.sun.top + box.sun.h / 2 });
        // The boat rocks about a point near its keel (85% down), and carries the rulito
        const keel = { x: box.boat.left + box.boat.w / 2, y: box.boat.top + box.boat.h * 0.85 };
        L.boat.pivot = keel;
        const art = boatAt.box;
        const k = box.boat.w / art[2];
        const toBoat = (x, y) => ({ x: box.boat.left + (x - art[0]) * k, y: box.boat.top + (y - art[1]) * k });
        Object.entries(boatAt.pieces).forEach(([name, { rect }]) => {
            const at = toBoat(rect[0], rect[1]);
            L[name].place({ left: at.x, top: at.y, w: rect[2] * k, h: rect[3] * k });
        });
        Object.entries(CREW).forEach(([b, being]) => {
            L[b].pivot = toBoat(...being.feet);
            const eyes = boatAt.pieces[b + 'Eyes'].rect;
            L[b + 'Look'].pivot = toBoat(eyes[0] + eyes[2] / 2, eyes[1] + eyes[3] / 2);
        });
        L.oar.pivot = toBoat(...OAR_GRIP);
        L.rulito.place(box.rulitoCanvas, { x: box.glyph.left + box.glyph.w / 2, y: box.glyph.top + box.glyph.h });
        // The ground is one piece, so the grass behind the mushrooms always lines up with them; it turns about its foot
        L.ground.pivot = { x: W / 2, y: box.ground.top + box.ground.h };
        L.grass.place(box.grass);
        L.roots.place(box.ground);
        L.mushrooms.place({ ...box.ground, top: box.ground.top - ROOM * box.ground.h, h: box.ground.h * (1 + ROOM) });
        L.coneGlow.place(box.coneGlow);
        L.coneHalo.place(box.coneHalo);
        L.cone.place(box.coneRect);
    };

    // The touch target of the pine cone follows it on screen
    const placeHit = () => {
        if (!coneHit.value || !box) return;
        const b = L.cone.boxOnScreen(box.hit);
        const style = coneHit.value.style;
        style.left = `${b.left}px`;
        style.top = `${b.top}px`;
        style.width = `${b.width}px`;
        style.height = `${b.height}px`;
    };

    // Where the mushrooms picture is now, for the spores to leave from the real caps
    const mushroomsOnScreen = () => {
        const b = L.mushrooms.boxOnScreen(box.ground);
        return { left: b.left, top: b.top, width: b.width, height: b.height };
    };

    const enter = () => {
        if (entered || !props.active || !stage) return;
        entered = true;
        stage.ready().then(() => { if (!gone) stage.start(); });
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
    // The light of the pine cone, eased: hovered it notices, held it shines and breathes
    let shine = 0;
    let warmth = 0;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const centre = (el) => {
        const b = el.getBoundingClientRect();
        return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
    };

    // Pressing the pine cone: it lights up while held (and the charge starts to fill)
    const hold = () => {
        if (held) return;
        held = true;
        lit.value = true;
        play('tap');
        // Pressing again while the rulito is still whole celebrates again: the cloud swells anew
        if (head >= 1) { pop = 1; bloom(); }
        if (!reduced) {
            const c = centre(coneHit.value);
            spores?.burst(c.x, c.y, 12);
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
        play('rulito');
        play('bloom');
        level = Math.min(3, level + 1);
        sceneMilestone('rulito_completed', { times: level });
        wave = 0;
        // The wave runs out of the cone along the roots; each cap lets go of its spores as the light gets to it
        const c = centre(coneHit.value);
        const area = root.value.getBoundingClientRect();
        spores?.swell(14, c.x, (box.ground.w * 0.45) / PULSE_TIME);
        if (reduced || !stage) return;
        const r = L.rulito.toScreen(box.glyph.left + box.glyph.w / 2, box.glyph.top + box.glyph.h / 2);
        spores?.burst(area.left + r.x, area.top + r.y, 36);
    };

    // ---- The crew ----
    const ease = (p) => p * p * (3 - 2 * p);
    // Open eyes blink now and then: shut for a moment (eyes.sy)
    const BLINK = 0.16;
    const shut = (since) => (since >= 0 && since < BLINK ? 1 - 0.88 * Math.sin(since / BLINK * Math.PI) : 1);
    const life = {
        blink: { l: 2.2, s: 3.4 },          // when each one blinks next
        look: 0, lookTo: 0, nextLook: 2.5,  // where the one at the left is looking (-1 left .. 1 right)
        hop: 5,                             // when the little one hops (it takes HOP seconds)
        nod: 4,                             // when the sleepy one started to nod off
    };
    const HOP = 0.7;
    const NOD = 4.2;                        // seconds it takes to nod off, before it wakes with a start
    const rand = (a, b) => a + Math.random() * (b - a);

    const moveCrew = (t, dt, ramp) => {
        const k = box.boat.w / boatAt.box[2];   // px of the screen in a px of the artwork
        // Everyone breathes, each at their own pace (a squash about the feet)
        const breathe = (node, rate, amount, phase = 0) => {
            const b = Math.sin(t * rate + phase) * amount * ramp;
            node.sy = 1 + b;
            node.sx = 1 - b * 0.45;
        };
        // The one at the left looks around, now one way, now the other, and blinks as it turns
        if (t > life.nextLook) {
            life.lookTo = life.lookTo === 0 ? (Math.random() < 0.5 ? -1 : 1) : Math.random() < 0.6 ? 0 : -life.lookTo;
            life.nextLook = t + rand(1.8, 4.5);
            life.blink.l = t + 0.05;
        }
        life.look += (life.lookTo - life.look) * Math.min(1, dt * 5);
        breathe(L.l, 1.6, 0.016);
        L.l.rotate = life.look * 2 * ramp;
        L.lLook.x = life.look * 18 * k * ramp;
        // The one in the middle rows: a long pull and an easy return, leaning into it
        const row = t * Math.PI * 2 / 4.4;
        const stroke = Math.sin(row) + 0.25 * Math.sin(row * 2);
        L.oar.rotate = stroke * 3.2 * ramp;
        L.c.rotate = Math.sin(row - 0.6) * 1.4 * ramp;
        breathe(L.c, 1.1, 0.012, 1);
        // The little one hops now and then: it crouches, jumps and lands soft
        breathe(L.s, 2.3, 0.02, 2);
        const h = (t - life.hop) / HOP;
        if (h >= 0 && h < 1 && ramp > 0) {
            if (h < 0.25) { const q = ease(h / 0.25); L.s.sy = 1 - 0.16 * q; L.s.sx = 1 + 0.1 * q; L.s.y = 0; }
            else if (h < 0.75) { const q = (h - 0.25) / 0.5; L.s.y = -Math.sin(q * Math.PI) * 70 * k; L.s.sy = 1.08; L.s.sx = 0.95; }
            else { const q = (h - 0.75) / 0.25; L.s.y = 0; L.s.sy = 1 - 0.1 * Math.sin(q * Math.PI); L.s.sx = 1 + 0.06 * Math.sin(q * Math.PI); }
        } else {
            L.s.y = 0;
            if (h >= 1) { life.hop = t + rand(4, 8); life.blink.s = life.hop + HOP + 0.2; }
        }
        // The one up on the spiral hums to itself, rocking to and fro, with a little bounce on every swing
        L.t.rotate = Math.sin(t * 1.4) * 5 * ramp;
        L.t.sy = 1 + Math.abs(Math.sin(t * 1.4)) * 0.03 * ramp;
        L.t.sx = 1 - Math.abs(Math.sin(t * 1.4)) * 0.012 * ramp;
        // The sleepy one at the right end nods off little by little, wakes with a start, and starts again
        breathe(L.r, 0.9, 0.02, 3);
        const n = t - life.nod;
        let nod = 0;
        if (n < 0) nod = 0;
        else if (n < NOD) nod = -8 * ease(n / NOD);
        else if (n < NOD + 0.18) nod = -8 + 11 * ease((n - NOD) / 0.18);
        else if (n < NOD + 1) nod = 3 * (1 - ease((n - NOD - 0.18) / 0.82));
        else life.nod = t + rand(2.5, 5);
        L.r.rotate = nod * ramp;
        // Blinks
        ['l', 's'].forEach((b) => {
            const since = t - life.blink[b];
            L[b + 'Look'].sy = ramp > 0 ? shut(since) : 1;
            if (since > BLINK) life.blink[b] = t + rand(2.5, 5.5) + (Math.random() < 0.2 ? -2.3 : 0);
        });
    };

    // ---- The mushrooms ----
    // Each leans and breathes on its stem; told that it is about to let go of its spores (onPuff), it gathers itself
    // (it shrinks and trembles) and pops as they come out, springing back
    const shrooms = caps.map(() => ({ phase: Math.random() * 6.28, gather: -1, lead: 0, big: false, pop: 0, v: 0 }));
    const onPuff = (i, lead, big = false) => {
        const m = shrooms[i];
        if (!m) return;
        if (lead > 0) { m.gather = lastT ?? 0; m.lead = lead; m.big = big; }
        else { m.gather = -1; m.v += big ? 12 : 9; }
    };
    const moveMushrooms = (t, dt, ramp) => {
        L.mushrooms.sways = caps.map(([u, v, w], i) => {
            const m = shrooms[i];
            let angle = (2.4 * Math.sin(t * 0.7 + m.phase) + 1 * Math.sin(t * 1.9 + m.phase * 2)) * ramp;
            let stretch = 1 + 0.035 * Math.sin(t * 1.2 + m.phase) * ramp;
            if (m.gather >= 0) {
                const p = Math.min(1, (t - m.gather) / m.lead);
                stretch *= 1 - (m.big ? 0.18 : 0.1) * ease(p);
                angle += Math.sin(t * 38 + m.phase) * 1.4 * p;
                if (p >= 1) { m.gather = -1; m.v += m.big ? 12 : 9; }
            }
            // The pop: a spring
            m.v += (-90 * m.pop - 7 * m.v) * dt;
            m.pop += m.v * dt;
            return [u, v, w, angle, stretch * (1 + m.pop * 0.12)];
        });
    };

    const frame = ({ x, y, scroll, t, ramp }) => {
        if (!stage || !box) return;
        const s = scroll;
        stage.look(x * SLIDE, y * SLIDE_Y);
        // Far: the sun breathes and glows
        const pulse = Math.sin(t * 0.9) * 0.5 + 0.5;
        L.sun.y = -s * 30;
        L.sun.scale = 1 + 0.05 * pulse * ramp;
        L.sunGlow.y = L.sun.y;
        L.sunGlow.scale = (1 + 0.05 * pulse * ramp) * (0.85 + 0.3 * pulse);
        L.sunGlow.opacity = 0.55 + 0.45 * pulse;
        // The boat bobs and rocks on its own
        L.boat.y = Math.sin(t * 1.0) * 7 * ramp - s * 70;
        L.boat.rotate = Math.sin(t * 0.75) * 2 * ramp - x * 1.4;
        L.ground.y = s * 25;
        L.ground.rotate = Math.sin(t * 0.9) * 0.4 * ramp;
        // Held, the head of the rulito moves on (and its tail comes back if it had started to go); let go, after a
        // moment the tail catches up with the head. When it has, the rulito is gone and the next one has another shape.
        const dt = lastT === null ? 0 : Math.min(t - lastT, 0.1);
        lastT = t;
        moveCrew(t, dt, ramp);
        moveMushrooms(t, dt, ramp);
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
        if (head > 0 && head - tail < 0.0005) { head = 0; tail = 0; grown = 0; full = false; rulito.value.reshape(); play('release'); }
        const flare = full && head - tail > 0.9 ? Math.max(pop, Math.sin(t * 4) * 0.5 + 0.5) : 0;
        const charge = Math.max(head - tail, rootGrow * 0.6);
        roots.frame({ grow: rootGrow, pulse: wave, level, t, size: box.ground.w });
        L.roots.refresh();
        // The card's name lights up when the rulito is completed: a flash, and it stays lit while the rulito is
        // nearly whole, going out with it. The stage blooms with it.
        const whole = Math.min(1, Math.max(0, (head - tail - 0.6) / 0.4));
        const glow = Math.max(pop, 0.8 * whole * whole * (3 - 2 * whole));
        stageEl?.style.setProperty('--name-glow', glow.toFixed(3));
        stage.bloom = glow;
        rulito.value.frame({ head, tail, flare, t, fade: Math.min(1, (head - tail) * 14), width: box.glyph.w });
        L.rulito.refresh();
        L.rulito.rotate = Math.sin(t * 1.8) * 3 * ramp;
        L.rulito.scale = 1 + 0.2 * pop * pop;
        // The pine cone: hovered it notices, held it shines (and breathes), let go it fades slowly
        const want = lit.value ? 1 : hot.value ? 0.3 : 0;
        shine += (want - shine) * Math.min(1, dt * (want > shine ? 9 : 2.6));
        warmth += ((lit.value ? 1 : hot.value ? 0.5 : 0) - warmth) * Math.min(1, dt * (lit.value || hot.value ? 6 : 2));
        const breath = lit.value && !reduced ? 0.5 + 0.5 * Math.sin(t * Math.PI * 2 / 2.8) : 0.5;
        const u = L.cone.uniforms;
        u.uBright.value = 1 + shine * (0.22 + 0.16 * breath);
        u.uSaturate.value = 1 + shine * (0.14 + 0.1 * breath);
        L.coneHalo.opacity = shine * (0.6 + 0.4 * breath);
        L.coneGlow.opacity = warmth;
        L.coneGlow.scale = 1 + charge * 0.8;
        stage.render(t);
        placeHit();
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
        build(stage);
        stage.onResize((W, H) => place(W, H));
        // The spores need the layout (where the caps are) before they seed the air
        spores = createSpores(canvas.value, { points: true, locate: mushroomsOnScreen, animate: !reduced, onPuff });
        // The spore cloud hangs in the air behind the mushrooms (drawn just before the grass), the cone's sparks in front
        const behindGround = L.grass.mesh.renderOrder - 0.5;
        const back = await createStardust(null, { stage, groups: spores.groups.back.map((g, i) => ({ ...g, order: behindGround + i * 0.01 })) });
        const front = await createStardust(null, { stage, groups: spores.groups.front.map((g, i) => ({ ...g, order: 1e6 + i })) });
        const rim = await createStardust(null, { stage, groups: [{ dynamic: sunRim, look: 'hard', parallax: 0, drift: 0, jitter: 0, twinkle: 0, reach: 0, order: L.sun.mesh.renderOrder + 0.5 }] });
        particles = { back, front, rim };
        if (gone) return;
        parallax = createParallax(root.value, frame);
        enter();
    };
    onMounted(begin);
    watch(() => props.active, enter);
    onBeforeUnmount(() => {
        gone = true;
        parallax?.destroy();
        spores?.destroy();
        particles?.back?.destroy();
        particles?.front?.destroy();
        particles?.rim?.destroy();
        stage?.destroy();
        stageEl?.style.removeProperty('--name-glow');
        window.removeEventListener('pointerup', release);
        window.removeEventListener('pointercancel', release);
    });
</script>

<template>
    <div class="scene" ref="root">
        <canvas class="stageCanvas" ref="canvas"></canvas>
        <!-- The rulito is drawn on its own canvas, which the stage shows as a texture over the central Sama's head -->
        <Rulito ref="rulito" class="offstage" />
        <div class="coneHit" ref="coneHit" role="button" tabindex="0" :aria-label="$i18n.locale === 'en' ? 'Pine cone' : 'Piña'"
            @pointerdown.prevent="hold" @pointerenter="hot = true" @pointerleave="hot = false"
            @keydown="onKeyDown" @keyup="onKeyUp" @blur="release"></div>
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

    .offstage {
        position: absolute;
        left: -9999px;
        top: 0;
        width: 40px;
        visibility: hidden;
    }

    .coneHit {
        position: absolute;
        left: 0;
        top: 0;
        width: 0;
        height: 0;
        border-radius: 50%;
        cursor: pointer;
        pointer-events: auto;
        -webkit-tap-highlight-color: transparent;
        touch-action: none;                    /* a finger holding it drifts a little: with manipulation the phone takes that for a scroll and lets go of the hold */
        outline: none;
    }

    .coneHit:focus-visible {
        outline: 2px solid rgba(255, 244, 150, 0.9);
        outline-offset: 2px;
    }
</style>
