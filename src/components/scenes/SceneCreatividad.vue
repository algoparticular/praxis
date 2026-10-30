<script setup>
    // Creatividad: a cell-planet crowned with corals and sea grass, a little jellyfish swimming inside it. It is built
    // like Hogar: the layers of the artwork (public/assets/creatividad, cropped from sheets of 3240px; creatividadScene.json
    // gives each one's box in % of that square) are laid on a square frame. The crown of corals and weeds turns slowly,
    // and every piece sways from the spot where it hangs; touching one makes it squash and throw orange spores. The
    // inside is a watery system (useCellWater): the organelles bob about, the jellyfish floats and pulses, bumping into
    // them and into the wall of the cell. The colour is code: the interior is the drawn silhouette of the original disc
    // (with the light of the water rippling across it), the nucleus a disc whose fuzzy rim is particles, and the orange
    // halo of dust a density map of the original stipple (creatividadDust.json) drawn back as particles behind the
    // crown, like the dots of the sky (useStardust).
    // It is drawn in WebGL (useLayerStage), like Hogar: the planet is a group of planes at one depth and the camera
    // slides with the pointer or the tilt. The touch targets of the corals and weeds are DOM elements kept over them.
    // Its verb is Resonar, as free composition: the crown is a music box. Touching a coral or a weed lights it and plays
    // its note of the card's chord (the higher it hangs, the higher the note; the weeds are the bass); the crown turns
    // faster and every lit piece plays again each time it passes the comb at the top, where the jellyfish swims up to
    // listen, so what was composed keeps sounding as a tune. Touching a lit one puts it out. With seven lit the tune is
    // complete: the chord resolves (C7 to F), the rulito is born over the jellyfish's head, the name lights up and the stage blooms; after one more
    // turn each piece goes out as it passes the comb for the last time and the crown slows down again.
    // Touching the jellyfish makes it dart off through the water, away from the finger.
    import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { createParallax } from '../../composables/useParallax.js';
    import { createLayerStage } from '../../composables/useLayerStage.js';
    import { startStardust } from '../../composables/useStardust.js';
    import { createCellWater } from '../../composables/useCellWater.js';
    import { createSparks } from '../../composables/useSparks.js';
    import { play } from '../../composables/useSound.js';
    import { sceneMilestone } from '../../analytics.js';
    import Rulito from '../Rulito.vue';
    import dustCloud from '../../composables/creatividadDust.json';
    import scene from '../../composables/creatividadScene.json';

    const props = defineProps({
        card: { type: Object, default: () => ({}) },
        active: Boolean
    });

    const root = ref(null);
    const canvas = ref(null);
    const hits = ref([]);                   // the touch targets of the crown's pieces
    const jellyHit = ref(null);             // the jellyfish's
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
    const els = {};                         // the pieces' nodes, by id
    const squashes = {};                    // when each piece was touched (it squashes)
    let F = { x: 0, y: 0, size: 1 };        // the planet's square on screen at rest (px)

    // The camera slides SLIDE px at the edge of a swipe; the planet moves 18px across and 10 up and down, as before
    const SLIDE = 50;
    const SLIDE_Y = 28;
    const PLANET_Z = 18 / (SLIDE + 18);

    const { cell: CELL, nucleus: NUC, jelly: JELLY, interior, outline, specks } = scene;

    // The crown: weeds behind, then the dashes of the cell's edge, then the corals; each hangs from the point of it
    // nearest the cell, and sways about it. `angle` is where it sits round the cell (deg, 0 to the right, clockwise) and
    // `height` how high it hangs at rest (0 at the bottom, 1 at the top): its note
    const CROWN = [...scene.pieces.filter((p) => p.kind === 'algae'), ...scene.pieces.filter((p) => p.kind === 'coral')]
        .map((p, i) => {
            const angle = Math.atan2(p.cy / 100 - CELL.y, p.cx / 100 - CELL.x) * 180 / Math.PI;
            return { ...p, phase: i * 1.9, hitR: Math.max(p.r, 1.8), angle, height: (1 - Math.sin(angle * Math.PI / 180)) / 2 };
        });
    const WEEDS = CROWN.filter((p) => p.kind === 'algae');
    const CORALS = CROWN.filter((p) => p.kind === 'coral');

    // The pieces that float in the water; `circles` (frame fractions) are what the jellyfish bumps into
    const FLOAT = [
        { id: 'motas', file: specks.file, box: specks.box, sway: 0.004, turn: 1 },
        ...scene.organelles.map((o) => ({ ...o, sway: 0.005, turn: 2, mass: o.circles.length > 3 ? 6 : 2 })),
    ];

    // The square of the artwork on screen (3240px in the artwork), centred, big enough that the crown fills the middle;
    // on a wide screen smaller and lower, so the crown does not reach up into the card's name
    const layout = (W, H) => {
        const wide = W >= H;
        const size = wide ? Math.min(1.5 * H, 1.28 * W) : Math.min(Math.max(1.28 * W, 0.89 * H), 1.6 * H);
        F = { x: W / 2 - size / 2, y: H / 2 - size / 2 + (wide ? 0.08 : 0.06) * H, size };
    };
    // A box given as [left, top, w, h] in % of the square, in px of the screen at rest
    const inFrame = ([left, top, w, h]) => ({ left: F.x + left / 100 * F.size, top: F.y + top / 100 * F.size, w: w / 100 * F.size, h: h / 100 * F.size });
    const at = (fx, fy) => ({ x: F.x + fx * F.size, y: F.y + fy * F.size });
    const frameBox = () => F;
    const around = () => {
        const radius = (CELL.r + 0.04) * F.size * (1.02 + Math.abs((Math.random() + Math.random() + Math.random()) / 3 - 0.5) * 2.8);
        const angle = Math.random() * Math.PI * 2;
        return [F.x + CELL.x * F.size + Math.cos(angle) * radius, F.y + CELL.y * F.size + Math.sin(angle) * radius];
    };

    // A cloud of particles from a density map of the original (the grid's cells are 3240px units): as many dots as it covered
    const decode = (cloud) => ({ ...cloud, bytes: Uint8Array.from(atob(cloud.data), (c) => c.charCodeAt(0)) });
    const dustGrid = decode(dustCloud);
    const rimGrid = decode(NUC.rim);
    const cloudPoints = (grid, { dotUnits, floor, more, colors }) => () => {
        const f = frameBox();
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
    const dustPoints = cloudPoints(dustGrid, { dotUnits: 9, floor: 1.8, more: 2.6, colors: [0xf8a275, 0xffb069, 0xf5976a, 0xffc08a] });
    const rimPoints = cloudPoints(rimGrid, { dotUnits: 6, floor: 1.3, more: 1.8, colors: [parseInt(NUC.color, 16)] });

    // The interior: the silhouette of the original disc, drawn once (per size) on a canvas that is shown as a texture
    const interiorCanvas = document.createElement('canvas');
    const INTERIOR = [CELL.x - CELL.r - 0.012, CELL.y - CELL.r - 0.012, 2 * CELL.r + 0.024];   // its box, frame fractions
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

    // Touching a coral or a weed: it squashes, spores fly out of it and the dust around the planet flares; and it is
    // lit into the music box, or put out if it was (while the rulito lives the tune is kept as it is)
    const sparks = createSparks(480);
    const spores = (piece) => (event) => {
        const box = event.currentTarget.getBoundingClientRect();
        const area = canvas.value.getBoundingClientRect();
        const c = piece.color;
        sparks.burst(box.left + box.width / 2 - area.left, box.top + box.height / 2 - area.top, {
            n: 26, colors: [0xffb069, 0xff9a5c, 0xffd29a, c], speed: 120, life: 2.8, size: 4.6, spread: 8,
        });
        squashes[piece.id] = last ?? 0;
        dust?.boost(0, 1.4);
        dust?.boost(1, 1);
        compose(CROWN.indexOf(piece));
    };
    const warm = () => dust?.boost(0, 0.4);
    // Touching the jellyfish: it darts off through the water, away from the finger
    const startle = (event) => {
        const box = event.currentTarget.getBoundingClientRect();
        const away = event.clientX === undefined ? [0, 0] : [box.left + box.width / 2 - event.clientX, box.top + box.height / 2 - event.clientY];
        water?.startle(...away);
        play('tap');
        if (reduced || !stage) return;
        const area = canvas.value.getBoundingClientRect();
        sparks.burst(box.left + box.width / 2 - area.left, box.top + box.height / 2 - area.top, {
            n: 8, colors: [0xffd29a, 0xffffff, 0xc9f0b0], speed: 60, life: 1.4, size: 3.4, spread: 6,
        });
    };
    const onJellyKey = (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        startle(event);
    };
    const onKey = (piece) => (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        spores(piece)(event);
    };
    // The squash of a touched piece over 0.7s: wider and lower, then taller, then itself (as the CSS keyframes did)
    const SQUASH = [[0, 1, 1], [1 / 3, 1.14, 0.88], [2 / 3, 0.96, 1.08], [1, 1, 1]];
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

    /* ---------- Resonar: the crown is a music box ---------- */

    const IDLE_TURN = 1.4;                  // deg/s the crown turns by itself
    const PLAY_TURN = 30;                   // and while a tune is in it: one turn in 12 s
    const COMB = -90;                       // where the pieces play: the top of the crown (deg, clockwise from the right)
    const TUNE = 7;                         // lit pieces that make a whole tune
    const IDLE_TURNS = 3;                   // turns with no touch after which an unfinished tune goes out
    const DELAY = 1.1, GROW = 2.4, EAT = 3.4;   // the rulito: after the chord has resolved, born, whole; then gone
    const HOME = { x: CELL.x - 0.01, y: 0.415 };   // where the jellyfish listens, under the comb
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const LIGHT = { coral: 0xffc08a, algae: 0xc9f0b0 };

    const on = CROWN.map(() => false);      // lit into the tune
    const lit = CROWN.map(() => 0);         // how lit each one looks (eases towards `on`)
    const ring = CROWN.map(() => 0);        // a flash each time it plays, that settles
    const final = CROWN.map(() => false);   // goes out after it plays once more (the tune is ending)
    let turn = 0;                           // how far the crown has turned (deg)
    let speed = IDLE_TURN;
    let touchedAt = -Infinity;              // the crown's turn at the last touch: an unfinished tune left alone ends
    let listen = 0;                         // the jellyfish's pulse with each note
    let comb = 0;                           // the comb's flash with each note
    let wins = 0;
    let win = null;                         // the rulito, while it lives
    let glyph = { left: 0, top: 0, w: 1, h: 1 };
    const count = () => on.filter(Boolean).length;

    const playNote = (i, level) => play('tine', { step: CROWN[i].height, low: CROWN[i].kind === 'algae', level });
    const combAt = () => L.planet.toScreen(F.x + (CELL.x + Math.cos(COMB * Math.PI / 180) * 0.213) * F.size, F.y + (CELL.y + Math.sin(COMB * Math.PI / 180) * 0.213) * F.size);

    const compose = (i) => {
        if (i < 0) return;
        touchedAt = turn;
        if (win) { play('tap'); return; }
        if (on[i]) {
            on[i] = false;
            final[i] = false;
            play('miss');
            return;
        }
        on[i] = true;
        final.fill(false);
        ring[i] = 1;
        playNote(i, 1);
        if (count() >= TUNE) complete();
    };

    // The tune is whole: every lit piece flashes once, the card's C7 resolves to F major (a dominant seventh asks for the
    // chord a fifth below: the heart, Vulpes's note; creativity "is not a solitary movement") and then the rulito is born
    // over the jellyfish's head
    const complete = () => {
        if (win || gone) return;
        wins += 1;
        win = { age: 0, head: 0, tail: 0, full: false, pop: 0, ending: false, endAt: turn + 360 };
        rulito.value?.reshape();
        on.forEach((v, i) => { if (v) ring[i] = 1; });
        play('resolve');
        sceneMilestone('tune_composed', { times: wins });
    };

    // A lit piece reaches the comb: it plays its note, flashes, the comb throws sparks and the jellyfish pulses
    const sound = (i) => {
        ring[i] = 1;
        comb = 1;
        listen = 1;
        playNote(i, 0.75);
        if (!reduced && stage) {
            const c = combAt();
            sparks.burst(c.x, c.y, { n: 10, colors: [LIGHT[CROWN[i].kind], 0xffd29a, 0xffffff], speed: 70, life: 1.4, size: 3.8, spread: 6 });
        }
        if (final[i]) { final[i] = false; on[i] = false; }
    };

    // Every frame: the crown turns (faster with a tune in it); each lit piece that crosses the comb plays
    const music = (dt, t, ramp) => {
        const n = count();
        const want = (n ? PLAY_TURN * (win ? 1.25 : 1) : IDLE_TURN) * ramp;
        speed += (want - speed) * Math.min(1, dt * 0.9);
        const before = turn;
        turn += speed * dt;
        CROWN.forEach((p, i) => {
            if (!on[i]) return;
            // How far past the comb it is, 0..360: a crossing is that going round
            const a = ((p.angle + before - COMB) % 360 + 360) % 360;
            const b = ((p.angle + turn - COMB) % 360 + 360) % 360;
            if (b < a) sound(i);
        });
        // An unfinished tune left alone for a few turns, or the turn after the rulito, ends: each piece goes out as
        // it passes the comb for the last time
        const ending = win ? !win.ending && turn > win.endAt : n && turn - touchedAt > IDLE_TURNS * 360 && !final.some(Boolean);
        if (ending) {
            if (win) win.ending = true;
            on.forEach((v, i) => { final[i] = v; });
        }
        listen = Math.max(0, listen - dt * 2.5);
        comb = Math.max(0, comb - dt * 2.2);
        CROWN.forEach((p, i) => {
            lit[i] += ((on[i] ? 1 : 0) - lit[i]) * Math.min(1, dt * (on[i] ? 6 : 1.2));
            ring[i] = Math.max(0, ring[i] - dt * 2.4);
        });
        // The jellyfish swims up under the comb to listen while there is a tune
        water.home = n || win ? HOME : null;

        // The rulito: born after the tune is whole, kept while it plays, and its tail catches its head once it has ended
        let named = 0;
        if (win && rulito.value) {
            win.age += dt;
            win.pop = Math.max(0, win.pop - dt * 2.2);
            win.head = 1 - (1 - Math.min(1, Math.max(0, (win.age - DELAY) / GROW))) ** 1.6;
            if (win.head >= 1 && !win.full) { win.full = true; win.pop = 1; play('rulito'); }
            if (win.ending && !count()) win.tail = Math.min(1, win.tail + dt / EAT);
            const whole = Math.min(1, Math.max(0, (win.head - win.tail - 0.6) / 0.4));
            named = Math.max(win.pop, 0.8 * whole * whole * (3 - 2 * whole));
            const flare = win.full && win.head - win.tail > 0.9 ? Math.max(win.pop, comb) : 0;
            rulito.value.frame({ head: win.head, tail: win.tail, flare, t, fade: Math.min(1, (win.head - win.tail) * 14), width: glyph.w });
            L.rulito.refresh();
            L.rulito.scale = 1 + 0.2 * win.pop * win.pop;
            if (win.ending && win.tail >= 1) {
                win = null;
                rulito.value.frame({ width: glyph.w });
                L.rulito.refresh();
            }
        }
        stageEl?.style.setProperty('--name-glow', named.toFixed(3));
        const filled = count() / TUNE;
        stage.bloom = Math.max(named, win ? 0.45 : 0, 0.2 * filled * filled);
    };

    const build = (s) => {
        const planetDepth = s.depth(PLANET_Z);
        L.planet = planetDepth.group();
        L.interior = L.planet.canvas(interiorCanvas, { water: 1 });
        L.nucleus = L.planet.disc({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: parseInt(NUC.color, 16) });
        FLOAT.forEach((p) => { els[p.id] = L.planet.image(`/assets/creatividad/${p.file}.webp`, { shimmer: 0.6 }); });
        // The jellyfish's light while it listens, behind it
        L.listen = L.planet.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: 0xffd29a, stops: [[0, 0.5], [0.3, 0.22], [0.62, 0]] });
        L.listen.opacity = 0;
        L.jelly = L.planet.image('/assets/creatividad/medusa.webp');
        L.rulito = L.planet.canvas(rulito.value.canvas, { bloom: true });
        L.crown = L.planet.group();
        // A light behind every piece, seen while it is lit into the tune (it turns with the crown)
        L.lights = CROWN.map((p) => {
            const node = L.crown.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: LIGHT[p.kind], stops: [[0, 0.7], [0.32, 0.3], [0.64, 0]], bloom: true });
            node.opacity = 0;
            return node;
        });
        WEEDS.forEach((p) => { els[p.id] = L.crown.image(`/assets/creatividad/${p.id}.webp`); });
        L.outline = L.crown.image(`/assets/creatividad/${outline.file}.webp`);
        CORALS.forEach((p) => { els[p.id] = L.crown.image(`/assets/creatividad/${p.id}.webp`); });
        // The comb: where the pieces play, at the top, over the crown (it does not turn)
        L.comb = L.planet.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: 0xffe2b8, stops: [[0, 0.75], [0.25, 0.3], [0.6, 0]], bloom: true });
        L.comb.opacity = 0;
        L.planet.enter({ y: 60, scale: 0.7, duration: 2200 });
        L.jelly.enter({ y: 0, scale: 0.4, delay: 1200, duration: 1600 });
    };

    const place = (W, H) => {
        layout(W, H);
        drawInterior();
        L.interior.refresh();
        L.planet.pivot = at(CELL.x, CELL.y);
        L.interior.place({ left: F.x + INTERIOR[0] * F.size, top: F.y + INTERIOR[1] * F.size, w: INTERIOR[2] * F.size, h: INTERIOR[2] * F.size });
        L.nucleus.place({ left: F.x + (NUC.x - NUC.r) * F.size, top: F.y + (NUC.y - NUC.r) * F.size, w: 2 * NUC.r * F.size, h: 2 * NUC.r * F.size });
        FLOAT.forEach((p) => els[p.id].place(inFrame(p.box)));
        L.jelly.place(inFrame(JELLY.box));
        const square = (cx, cy, d) => ({ left: F.x + (cx - d / 2) * F.size, top: F.y + (cy - d / 2) * F.size, w: d * F.size, h: d * F.size });
        L.listen.place(square(JELLY.x, JELLY.y, 0.13));
        // The rulito over the jellyfish's bell (its canvas is bigger than the glyph, for the glow, as in Paciencia)
        const rh = 0.05, rw = rh * 32 / 86;
        glyph = inFrame([(JELLY.box[0] / 100 + 0.33 * JELLY.box[2] / 100 - rw / 2) * 100, (JELLY.box[1] / 100 - 0.004 - rh) * 100, rw * 100, rh * 100]);
        L.rulito.place({ left: glyph.left - 0.4375 * glyph.w, top: glyph.top - 0.1628 * glyph.h, w: glyph.w * 1.875, h: glyph.h * 1.3256 },
            { x: glyph.left + glyph.w / 2, y: glyph.top + glyph.h });
        const top = { x: CELL.x + Math.cos(COMB * Math.PI / 180) * 0.213, y: CELL.y + Math.sin(COMB * Math.PI / 180) * 0.213 };
        L.comb.place(square(top.x, top.y, 0.1));
        // The crown turns about the middle of the interior; each piece sways about the point it hangs from
        L.crown.pivot = at(CELL.x, CELL.y);
        CROWN.forEach((p) => {
            const box = inFrame(p.box);
            els[p.id].place(box, { x: box.left + p.origin[0] / 100 * box.w, y: box.top + p.origin[1] / 100 * box.h });
        });
        L.outline.place(inFrame(outline.box));
        CROWN.forEach((p, i) => L.lights[i].place(square(p.cx / 100, p.cy / 100, Math.max(p.r * 3.2, 5) / 100)));
    };

    // The touch targets follow their pieces as the crown turns, and the jellyfish's goes with it
    const JELLY_MID = { x: (JELLY.box[0] + JELLY.box[2] / 2) / 100 - JELLY.x, y: (JELLY.box[1] + JELLY.box[3] / 2) / 100 - JELLY.y };
    const placeHits = () => {
        const me = water.swimmer;
        const jh = jellyHit.value;
        if (jh) {
            const c = L.planet.toScreen(F.x + (me.x + JELLY_MID.x * 0.5) * F.size, F.y + (me.y + JELLY_MID.y * 0.5) * F.size);
            const d = Math.max(52, 0.09 * F.size * L.planet.scale);
            jh.style.translate = `${(c.x - d / 2).toFixed(1)}px ${(c.y - d / 2).toFixed(1)}px`;
            jh.style.width = jh.style.height = `${d.toFixed(1)}px`;
        }
        hits.value.forEach((el, i) => {
            if (!el) return;
            const p = CROWN[i];
            const c = L.crown.toScreen(F.x + p.cx / 100 * F.size, F.y + p.cy / 100 * F.size);
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
        // The planet hangs, breathing; the crown turns above the interior
        const py = Math.sin(t * 0.5) * 6 * ramp - s * 50;
        L.planet.y = py;
        L.planet.scale = 1 + Math.sin(t * 0.7) * 0.012 * ramp;
        // The water: everything inside floats, and the jellyfish bumps into it
        const dt = last === null ? 0 : t - last;
        last = t;
        music(Math.min(dt, 0.1), t, ramp);
        L.crown.rotate = turn;
        // Each coral sways a little from where it hangs, the weeds more, and faster; a touched one squashes; a lit one
        // shines, with its light behind it, and flashes as it plays
        WEEDS.forEach((p) => { els[p.id].rotate = Math.sin(t * 1.1 + p.phase) * 6 * ramp; });
        CORALS.forEach((p) => { els[p.id].rotate = Math.sin(t * 0.55 + p.phase) * 2.2 * ramp; });
        CROWN.forEach((p, i) => {
            const node = els[p.id];
            node.scale = 1 + 0.08 * ring[i] * ring[i];
            node.uniforms.uBright.value = 1 + 0.3 * lit[i] + 0.35 * ring[i];
            node.uniforms.uSaturate.value = 1 + 0.25 * lit[i];
            L.lights[i].opacity = Math.min(1, 0.9 * lit[i] + 0.5 * ring[i]);
            if (squashes[p.id] === undefined) return;
            const [sx, sy] = squashAt((t - squashes[p.id]) / 0.7);
            node.sx = sx;
            node.sy = sy;
            if (t - squashes[p.id] > 0.7) delete squashes[p.id];
        });
        const playing = Math.min(1, speed / PLAY_TURN);
        L.comb.opacity = Math.min(1, 0.45 * playing + 0.6 * comb);
        L.comb.scale = 1 + 0.3 * comb;
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
        // What is drawn in particles follows the planet: the halo of dust, and the nucleus's rim with its own sway
        const drift = stage.drift(PLANET_Z);
        dust?.shift(0, drift.x, drift.y + py);
        front?.shift(0, drift.x + n.x * F.size, drift.y + py + n.y * F.size);
        // The jellyfish swims: it pulses, leans into its way, and a knock makes it squash a little
        const me = water.swimmer;
        tilt += (Math.max(-1, Math.min(1, me.vx / 0.012)) * 14 - tilt) * Math.min(1, dt * 1.5);
        const pulse = Math.sin(t * 2.2);
        L.jelly.x = (me.x - JELLY.x) * F.size;
        L.jelly.y = ((me.y - JELLY.y) - pulse * 0.001) * F.size;
        L.jelly.rotate = tilt + Math.sin(t * 0.6) * 3 * ramp;
        const squash = 1 + Math.min(me.hit, 0.3) * 0.12;
        L.jelly.sx = (1 - pulse * 0.025 * ramp - 0.06 * listen) * squash;
        L.jelly.sy = (1 + pulse * 0.045 * ramp + 0.08 * listen) / squash;
        L.listen.x = L.jelly.x;
        L.listen.y = L.jelly.y;
        L.listen.opacity = Math.min(1, 0.35 * playing + 0.6 * listen);
        // The rulito goes with it
        L.rulito.x = L.jelly.x;
        L.rulito.y = L.jelly.y;
        L.rulito.rotate = Math.sin(t * 1.6) * 3 * ramp;
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
            bounds: { x: CELL.x, y: CELL.y, r: CELL.r - 0.004 },
            swimmer: { x: JELLY.x, y: JELLY.y, r: JELLY.r },
            bodies: [
                { id: 'nucleus', circles: [[NUC.x, NUC.y, NUC.r]], mass: 12, sway: 0.004 },
                ...FLOAT.map(({ id, circles = [], mass, sway }) => ({ id, circles, mass, sway })),
            ],
        });
        // The layers and their layout first, so the particles measured on them are made again after them on a resize
        build(stage);
        stage.onResize((W, H) => place(W, H));
        sky = startStardust(null, {
            stage,
            groups: [{
                count: 150, colors: [0x7d5e75, 0x8a6a82, 0x6f5169], size: [2, 5],
                drift: 6, twinkle: 0.4, reach: 120, push: 30, parallax: 10, opacity: 0.8, order: -20,
            }],
        });
        // Behind the planet: the halo of the original stipple (group 0, which follows the planet by hand) and loose dust
        dust = startStardust(null, {
            stage,
            groups: [
                { points: dustPoints, look: 'hard', drift: 7, jitter: 0.9, twinkle: 0.5, reach: 120, push: 36, parallax: 0, order: -10 },
                {
                    count: 380, colors: [0xffb069, 0xff9a5c, 0xffd29a, 0xf08a8a], size: [2.5, 6.5], look: 'hard', spawn: around,
                    drift: 30, jitter: 0.5, twinkle: 0.8, reach: 150, push: 46, parallax: 18, order: -9,
                },
            ],
        });
        // In front, only the nucleus's fuzzy rim (group 0, which follows the planet by hand) and the spores: no dust ever covers a drawing
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
        dust?.destroy();
        front?.destroy();
        stage?.destroy();
        stageEl?.style.removeProperty('--name-glow');
    });
</script>

<template>
    <div class="scene" ref="root">
        <canvas class="stageCanvas" ref="canvas"></canvas>
        <!-- The rulito is drawn on its own canvas, which the stage shows as a texture over the jellyfish's bell -->
        <Rulito ref="rulito" class="offstage" color="#f2b036" />
        <!-- The jellyfish darts off when touched -->
        <div class="hit" ref="jellyHit" role="button" tabindex="0" :aria-label="$i18n.locale === 'en' ? 'Jellyfish' : 'Medusa'"
            @pointerdown.prevent="startle" @keydown="onJellyKey"></div>
        <!-- The music box: each coral or weed lit plays its note every time it passes the top -->
        <div v-for="(p, i) in CROWN" :key="'hit' + p.id" :ref="(el) => { hits[i] = el; }" class="hit" role="button" tabindex="0"
            :aria-label="p.kind === 'coral' ? ($i18n.locale === 'en' ? 'Coral: a note of the tune' : 'Coral: una nota de la melodía') : ($i18n.locale === 'en' ? 'Sea grass: a low note of the tune' : 'Alga: una nota grave de la melodía')"
            @pointerdown.prevent="spores(p)($event)" @pointerenter="warm" @keydown="onKey(p)($event)"></div>
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

    /* A touchable coral or weed: a circle on it, invisible, moved over it as the crown turns */
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

    .offstage {
        position: absolute;
        left: -9999px;
        top: 0;
        width: 40px;
        visibility: hidden;
    }

    .hit:focus-visible {
        outline: 2px solid rgba(255, 255, 255, 0.85);
        outline-offset: 2px;
    }
</style>
