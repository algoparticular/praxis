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
    // Its verb is Encender (ignite), on the engine of the verb (useKindle.js), with the being itself as the flame. The bulbs and the mushrooms start grey. Rubbing inside the cell (the finger going
    // back and forth) warms the being: sparks fly from the finger, it glows, a note of the chord climbs with each sixth of
    // the heat, and it cools slowly if nobody rubs. Hot enough, it catches fire. Then it is a sling: press, pull it back
    // (a band to the finger, and dots for where it will go) and let go: it shoots off on fire and bounces about the water,
    // and every knock on the wall lights the bulb or mushroom on that side (its colour, a light behind it, its dots). After
    // FUEL knocks, or slowed down, its fire goes out and it has to be rubbed again. With all twelve lit the crown is a
    // beacon: the chord (B7) resolves to the one a fifth below (E, Kätus's note), the being stands a little and the rulito
    // is born over its head. Then everything fades back to grey and it can be played again.
    import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { createParallax } from '../../composables/useParallax.js';
    import { createLayerStage } from '../../composables/useLayerStage.js';
    import { startStardust } from '../../composables/useStardust.js';
    import { createCellWater } from '../../composables/useCellWater.js';
    import { createSparks } from '../../composables/useSparks.js';
    import { createKindle, FIRE } from '../../composables/useKindle.js';
    import { createGhostHand, gesture, HINT_AFTER } from '../../composables/useGhostHand.js';
    import { play } from '../../composables/useSound.js';
    import { sceneMilestone } from '../../analytics.js';
    import Rulito from '../Rulito.vue';
    import halos from '../../composables/evolucionHalo.json';
    import scene from '../../composables/evolucionScene.json';

    const props = defineProps({
        card: { type: Object, default: () => ({}) },
        active: Boolean
    });

    const root = ref(null);
    const canvas = ref(null);
    const hits = ref([]);
    const cellHit = ref(null);
    const rulito = ref(null);
    let stageEl = null;                     // the card's stage, where the name is lit from (--name-glow)
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

    /* ---------- Encender: rub the being until it catches fire, then sling it against the wall to light the crown ---------- */

    const RUB = 11;                         // px of rubbing, in radii of the cell, for the being to catch fire (it counts however fast)
    const COOL = 0.22;                      // heat lost per second while nobody rubs (until it has caught)
    const WALL = 0.075;                     // how far the being's centre keeps from the wall: its head never goes through it
    const WALL_CROWNED = 0.14;              // and while the rulito is over its head, so that stays inside too
    const FUEL = 3;                         // hits on the wall a launched fire lasts
    const AIM_MIN = 0.12;                   // a pull shorter than this (of the full pull) launches nothing
    const REACH = 0.5;                      // radians either side of a hit on the wall where a bulb or a mushroom catches
    const DELAY = 1.1, GROW = 2.2, LINGER = 2.4, EAT = 3.4;     // the rulito: after the chord resolves, born, kept, gone
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const on = SWAYING.map(() => false);    // lit, until the crown is done
    const lit = SWAYING.map(() => 0);       // the colour and light of each one, eased
    let glyph = null;
    let lastHit = 0;
    let turnNow = 0;                        // how far the crown has turned (degrees)
    let win = null;                         // the crown is lit: { age, head, tail, full, fullAt, back, pop }
    let wins = 0;
    let beacon = 0;
    let stand = 0;                          // the being uncurls a little while the crown is lit
    let hint = 0;
    let hand = null;                        // the ghost hand, showing the gesture
    let embers = 0;
    let anchor = null;                      // where the being was in the water when the sling was taken
    const geo = { cx: 0, cy: 0, R: 1, sx: 0, sy: 0 };   // on the canvas: the cell's centre and radius, the being

    // Where each bulb and mushroom stands round the cell now (the crown turns), as an angle from its centre
    const REST = SWAYING.map((p) => Math.atan2(p.glow.y - CELL.y, p.glow.x - CELL.x));
    // Each little blue bud belongs to the bulb nearest to it, and gets its colour with it
    const BUD_OF = scene.blue.map(([bx, by]) => [bx / 100, by / 100]).map(([x, y]) => STALKS.reduce((best, p, i) => (Math.hypot(p.glow.x - x, p.glow.y - y) < Math.hypot(STALKS[best].glow.x - x, STALKS[best].glow.y - y) ? i : best), 0));
    const BLUE_RGB = [(BLUE >> 16 & 255) / 255, (BLUE >> 8 & 255) / 255, (BLUE & 255) / 255];
    const BLUE_GREY = 0.299 * BLUE_RGB[0] + 0.587 * BLUE_RGB[1] + 0.114 * BLUE_RGB[2];
    const angleOf = (i) => REST[i] + turnNow * Math.PI / 180;
    const apart = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
    const centreOf = (p) => L.crown.toScreen(F.x + p.glow.x * F.size, F.y + p.glow.y * F.size);
    const measure = () => {
        const c = L.planet.toScreen(F.x + CELL.x * F.size, F.y + CELL.y * F.size);
        const e = L.planet.toScreen(F.x + (CELL.x + CELL.r) * F.size, F.y + CELL.y * F.size);
        const b = at(BEING.x, BEING.y);
        const me = L.being.toScreen(b.x, b.y);
        Object.assign(geo, { cx: c.x, cy: c.y, R: Math.hypot(e.x - c.x, e.y - c.y), sx: me.x, sy: me.y });
    };
    // The engine (useKindle.js): the being is both the source and the flame. Its distances are in radii of the cell:
    // rubbing 11 of them sets it on fire (however fast), and the full pull is 0.9 of one
    const kindler = createKindle({
        size: () => geo.R,
        source: () => ({ x: geo.sx, y: geo.sy }),
        canvas: () => canvas.value,
        sparks,
        busy: () => !!win,
        rub: RUB, steady: Infinity, cool: COOL, fuel: FUEL, maxPull: 0.9, aimMin: AIM_MIN,
        aimFrom: 'source', aimReach: [0.5, 1.2], rubSparks: 'finger', flightCharge: 1, still: reduced,
        // Let go of the sling: the being shoots off, on fire, and bounces about the cell
        body: {
            launch: (dx, dy, k) => {
                const me = water.swimmer;
                const speed = 0.3 + 0.6 * k;          // frame fractions per second
                me.vx = dx * speed;
                me.vy = dy * speed;
                me.heading = Math.atan2(dy, dx);
                lastHit = me.hit;
            },
        },
        // Flying (on fire, it goes past the organelles): every new knock on the wall lights what is on that side; slowed
        // down, its fire goes out
        collide: () => {
            const me = water.swimmer;
            if (me.hit > lastHit + 0.01) hitWall(me.x, me.y);
            if (Math.hypot(me.vx, me.vy) < 0.05) kindler.goOut();
        },
        onKindle: (step) => play('kindle', { step }),
        onIgnite: () => { play('ignite', 1); play('star'); },
        onLaunch: (k) => play('ignite', k),
    });

    // Pressing inside the cell: cold, it starts to rub; on fire, it takes the being to sling it
    const press = (event) => {
        if (!kindler.press(event)) { glow?.boost(0, 0.6); return; }
        if (kindler.aiming) {
            anchor = { mx: water.swimmer.x, my: water.swimmer.y };
            play('tap');
        }
    };
    // With the keyboard: Enter rubs (each press warms it) and, once it is on fire, throws it at the nearest unlit one
    const onCellKey = (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        if (kindler.mode !== 'lit' || win) { kindler.key(); return; }
        kindler.idle = 0;
        const me = water.swimmer;
        const todo = SWAYING.map((p, i) => i).filter((i) => !on[i]);
        if (!todo.length) return;
        const i = todo.reduce((best, j) => (apart(angleOf(j), Math.atan2(me.y - CELL.y, me.x - CELL.x)) < apart(angleOf(best), Math.atan2(me.y - CELL.y, me.x - CELL.x)) ? j : best), todo[0]);
        const tx = CELL.x + Math.cos(angleOf(i)) * CELL.r - me.x, ty = CELL.y + Math.sin(angleOf(i)) * CELL.r - me.y;
        kindler.launch(tx / Math.hypot(tx, ty), ty / Math.hypot(tx, ty), 0.8);
    };

    // The unlit one nearest in angle to where the being is (the one a sling there would light), and a point on the wall
    const nearestUnlit = () => {
        const me = water.swimmer;
        const a = Math.atan2(me.y - CELL.y, me.x - CELL.x);
        const todo = SWAYING.map((p, i) => i).filter((i) => !on[i]);
        return todo.length ? todo.reduce((best, j) => (apart(angleOf(j), a) < apart(angleOf(best), a) ? j : best)) : null;
    };
    const wallAt = (a) => {
        const w = L.planet.toScreen(F.x + (CELL.x + Math.cos(a) * CELL.r) * F.size, F.y + (CELL.y + Math.sin(a) * CELL.r) * F.size);
        return [w.x, w.y];
    };

    // It hits the wall of the cell: the bulb or mushroom on that side, if it is still unlit, catches
    const hitWall = (x, y) => {
        const a = Math.atan2(y - CELL.y, x - CELL.x);
        const wall = L.planet.toScreen(F.x + (CELL.x + Math.cos(a) * CELL.r) * F.size, F.y + (CELL.y + Math.sin(a) * CELL.r) * F.size);
        sparks.burst(wall.x, wall.y, { n: 16, colors: FIRE, speed: 90, life: 1.2, size: 4, spread: 4 });
        const near = SWAYING.map((p, i) => i).filter((i) => !on[i] && apart(angleOf(i), a) < REACH)
            .sort((i, j) => apart(angleOf(i), a) - apart(angleOf(j), a));
        near.slice(0, 2).forEach((i, k) => setTimeout(() => catchFire(i), 120 + k * 140));
        if (!near.length) play('tap');
        kindler.flame.fuel -= 1;
        if (kindler.flame.fuel <= 0) setTimeout(() => { if (kindler.mode === 'flying') kindler.goOut(); }, 250);
    };

    // A bulb or a mushroom catches the fire: it gets its colour and its light
    const catchFire = (i) => {
        if (on[i] || !L.crown) return;
        on[i] = true;
        const p = SWAYING[i];
        const n = on.filter(Boolean).length;
        const c = centreOf(p);
        sparks.burst(c.x, c.y, { n: 26, colors: p.kind === 'bulb' ? FIRE : [0xe94b7d, 0xff7aa5, 0xffb3cb, 0xffffff], speed: 110, life: 2.2, size: 4.8, spread: 6 });
        glow?.boost(p.group, 1.4);
        squashes[p.id] = last ?? 0;
        play('link', { from: (n - 1) / SWAYING.length, to: n / SWAYING.length, level: 0.9 });
        if (n === SWAYING.length) setTimeout(crown, 500);
    };

    // Everything is lit: the crown is a beacon, the chord resolves, and the rulito is born over the being's head
    const crown = () => {
        if (win) return;
        wins += 1;
        win = { age: 0, head: 0, tail: 0, full: false, fullAt: 0, back: false, pop: 0 };
        kindler.reset();
        rulito.value?.reshape();
        glow?.boost(0, 1.6);
        glow?.boost(1, 1.6);
        sparks.burst(geo.sx, geo.sy, { n: 50, colors: FIRE, speed: 160, life: 2.4, size: 5, spread: 8 });
        play('resolve');
        sceneMilestone('crown_lit', { times: wins });
    };

    // The sling, as particles: a band from the being to the finger and, the other way, where it will go
    const aimGroup = { colors: [0xffffff], parallax: 0, drift: 0, twinkle: 0, reach: 0, look: 'hard', dynamic: kindler.aimGroup };

    // Every frame: the heat, the sling, the flight, the lights, the beacon and the rulito
    const play_ = (t, dt) => {
        measure();
        const me = water.swimmer;
        water.ghost = kindler.mode === 'flying';
        kindler.update(t, dt);
        // Pulled back, the being follows the finger a little and waits still in the water
        if (kindler.aiming && anchor) {
            const p = kindler.pull();
            const k = CELL.r / geo.R * 0.25;
            me.vx = me.vy = 0;
            let x = anchor.mx + p.x * k - CELL.x, y = anchor.my + p.y * k - CELL.y;
            const d = Math.hypot(x, y), room = CELL.r - 0.004 - water.wall;
            if (d > room) { x *= room / d; y *= room / d; }
            me.x = CELL.x + x;
            me.y = CELL.y + y;
        }
        lastHit = me.hit;
        const { charge, mode } = kindler;
        // Its fire: a glow behind it, embers rising from it (a trail while it flies)
        embers += dt;
        if (!reduced && charge > 0.15 && embers > (mode === 'flying' ? 0.025 : 0.14 - 0.08 * charge)) {
            embers = 0;
            sparks.burst(geo.sx, geo.sy, { n: mode === 'flying' ? 3 : 2, colors: FIRE, speed: 20 + 40 * charge, life: mode === 'flying' ? 0.7 : 1.1, size: 2.5 + 2.5 * charge, spread: 10 });
        }
        // The hint, without words: still for a while, a spark crackles on the being (rub it), or on fire it beats (sling it)
        const quiet = !kindler.rubbing && !kindler.aiming && !win && mode !== 'flying';
        if (hand ? hand.due(HINT_AFTER, quiet) : quiet && kindler.idle > HINT_AFTER) {
            kindler.idle = 0;
            hint = 1;
            if (!reduced) sparks.burst(geo.sx, geo.sy, { n: 8, colors: FIRE, speed: 50, life: 0.9, size: 3.5, spread: 8 });
            // and the ghost hand shows the gesture: cold, rubbing on the being (anywhere in the cell rubs); on fire,
            // pulling it back away from the wall by the nearest unlit one and letting go
            const being = () => [geo.sx, geo.sy];
            if (mode === 'cold') hand?.play(gesture.rub(being, Math.min(40, geo.R * 0.3)));
            else {
                const to = nearestUnlit();
                if (to != null) hand?.play(gesture.sling(being, () => wallAt(angleOf(to)), Math.min(90, geo.R * 0.5)));
            }
        }
        hint = Math.max(0, hint - dt * 1.4);
        // The rulito: born after the chord has resolved, kept a while, then its tail catches its head and everything fades
        let named = 0;
        if (win && rulito.value) {
            win.age += dt;
            win.pop = Math.max(0, win.pop - dt * 2.2);
            win.head = 1 - (1 - Math.min(1, Math.max(0, (win.age - DELAY) / GROW))) ** 1.6;
            if (win.head >= 1 && !win.full) { win.full = true; win.fullAt = win.age; win.pop = 1; play('rulito'); }
            if (win.full && !win.back && win.age - win.fullAt > LINGER) { win.back = true; on.fill(false); }
            if (win.back) win.tail = Math.min(1, win.tail + dt / EAT);
            const whole = Math.min(1, Math.max(0, (win.head - win.tail - 0.6) / 0.4));
            named = Math.max(win.pop, 0.8 * whole * whole * (3 - 2 * whole));
            const flare = win.full && win.head - win.tail > 0.9 ? Math.max(win.pop, Math.sin(t * 4) * 0.5 + 0.5) : 0;
            rulito.value.frame({ head: win.head, tail: win.tail, flare, t, fade: Math.min(1, (win.head - win.tail) * 14), width: glyph.w });
            L.rulito.refresh();
            L.rulito.scale = 1 + 0.2 * win.pop * win.pop;
            if (win.back && win.tail >= 1) {
                win = null;
                rulito.value.frame({ width: glyph.w });
                L.rulito.refresh();
            }
        }
        water.wall += ((win ? WALL_CROWNED : WALL) - water.wall) * Math.min(1, dt * 1.5);
        beacon += ((win && !win.back ? 1 : 0) - beacon) * Math.min(1, dt * (win && !win.back ? 2 : 0.8));
        stand += ((win && !win.back ? 1 : 0) - stand) * Math.min(1, dt * 1.5);
        stageEl?.style.setProperty('--name-glow', named.toFixed(3));
        stage.bloom = Math.max(named, 0.4 * charge, 0.5 * beacon);
        // The bulbs and the mushrooms: grey until they catch, then their colour, a warm light and their dots
        SWAYING.forEach((p, i) => {
            lit[i] += ((on[i] ? 1 : 0) - lit[i]) * Math.min(1, dt * (on[i] ? 5 : 0.6 + i * 0.06));
            const breath = 0.8 + 0.2 * Math.sin(t * 2.2 + p.phase);
            L['lit-' + p.id].opacity = Math.min(1, lit[i] * breath * (0.8 + 0.3 * beacon));
            const u = els[p.id].uniforms;
            u.uSaturate.value = 0.12 + 0.88 * lit[i];
            u.uBright.value = 0.82 + 0.18 * lit[i] + 0.25 * lit[i] * beacon;
            glow?.fade(p.group, lit[i]);
        });
        L.buds.forEach((bud, j) => {
            const k = 0.12 + 0.88 * lit[BUD_OF[j]];
            bud.uniforms.uColor.value.setRGB(...BLUE_RGB.map((c) => (BLUE_GREY + (c - BLUE_GREY) * k) * (0.82 + 0.18 * k)));
        });
        // The being's fire and the warmth of the water
        L.fire.opacity = Math.min(1, 1.2 * charge * (0.85 + 0.15 * Math.sin(t * 7)) + hint * 0.4 + beacon * 0.55);
        L.fire.scale = 0.7 + 0.6 * charge + 0.3 * hint + 0.25 * beacon;
        L.being.uniforms.uBright.value = 1 + 0.4 * charge + 0.15 * beacon;
        L.interior.uniforms.uTintAmount.value = 0.1 * charge + 0.12 * beacon;
        L.beacon.opacity = beacon * (0.75 + 0.25 * Math.sin(t * 1.6));
        L.beacon.scale = 0.92 + 0.08 * beacon + 0.03 * Math.sin(t * 1.6);
        if (beacon > 0.05) { glow?.boost(0, 0.7 * beacon); glow?.boost(1, 0.7 * beacon); }
    };

    const build = (s) => {
        const planetDepth = s.depth(PLANET_Z);
        L.planet = planetDepth.group();
        // Behind the cell: the beacon, the light of the whole crown when every bulb is lit
        L.beacon = L.planet.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: [1, 0.78, 0.42], stops: [[0, 0.7], [0.3, 0.45], [0.66, 0]], bloom: true });
        L.beacon.opacity = 0;
        L.interior = L.planet.canvas(interiorCanvas, { water: 1 });
        L.nucleus = L.planet.disc({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: hex(NUC.color) });
        FLOAT.forEach((p) => { els[p.id] = L.planet.image(`/assets/evolucion/${p.file}.webp`, { shimmer: 0.6 }); });
        // The being's fire, behind it, and the rulito over its head
        L.fire = L.planet.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: [1, 0.74, 0.35], stops: [[0, 0.75], [0.3, 0.32], [0.62, 0]], bloom: true });
        L.fire.opacity = 0;
        L.being = L.planet.image('/assets/evolucion/bebe.webp', { bloom: true });
        L.rulito = L.planet.canvas(rulito.value.canvas, { bloom: true });
        L.crown = L.planet.group();
        L.buds = scene.blue.map(() => L.crown.disc({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: BLUE }));
        // A light behind each bulb and mushroom, seen when it is lit (it turns with the crown)
        SWAYING.forEach((p) => {
            L['lit-' + p.id] = L.crown.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: p.kind === 'bulb' ? [1, 0.72, 0.38] : [1, 0.42, 0.62], stops: [[0, 0.8], [0.3, 0.35], [0.62, 0]], bloom: true });
            L['lit-' + p.id].opacity = 0;
        });
        SWAYING.forEach((p) => { els[p.id] = L.crown.image(`/assets/evolucion/${p.file}.webp`, { bloom: p.kind === 'bulb' }); });
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
        const beacon = 2 * CELL.r * 3;
        L.beacon.place(inFrame([(CELL.x - beacon / 2) * 100, (CELL.y - beacon / 2) * 100, beacon * 100, beacon * 100]));
        const fire = BEING.r * 9;
        L.fire.place(inFrame([(BEING.x - fire / 2) * 100, (BEING.y - fire / 2) * 100, fire * 100, fire * 100]));
        // The rulito over the being's head (its canvas is bigger than the glyph, for the glow, as in Paciencia)
        const [bx, by, bw] = BEING.box;
        const rw = bw * 0.5, rh = rw * 86 / 32;
        glyph = inFrame([bx + bw * 0.5 - rw / 2, by - 1.6 - rh, rw, rh]);
        L.rulito.place({ left: glyph.left - 0.4375 * glyph.w, top: glyph.top - 0.1628 * glyph.h, w: glyph.w * 1.875, h: glyph.h * 1.3256 },
            { x: glyph.left + glyph.w / 2, y: glyph.top + glyph.h });
        SWAYING.forEach((p) => {
            const d = p.glow.sigma * (p.kind === 'bulb' ? 11 : 8);
            L['lit-' + p.id].place(inFrame([(p.glow.x - d / 2) * 100, (p.glow.y - d / 2) * 100, d * 100, d * 100]));
        });
        L.crown.pivot = at(CELL.x, CELL.y);
        scene.blue.forEach(([x, y, r], i) => L.buds[i].place(inFrame([x - r, y - r, 2 * r, 2 * r])));
        SWAYING.forEach((p) => {
            const box = inFrame(p.box);
            els[p.id].place(box, { x: box.left + p.origin[0] / 100 * box.w, y: box.top + p.origin[1] / 100 * box.h });
        });
        L.fern.place(inFrame(fern.box));
    };

    const placeHits = () => {
        if (cellHit.value) {
            const d = 2 * geo.R * 0.9;
            cellHit.value.style.translate = `${(geo.cx - d / 2).toFixed(1)}px ${(geo.cy - d / 2).toFixed(1)}px`;
            cellHit.value.style.width = cellHit.value.style.height = `${d.toFixed(1)}px`;
        }
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
        turnNow = turn;
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
        L.being.sx = (1 + Math.sin(t * 1.3) * 0.012 * ramp) * squash * (1 - 0.03 * stand);
        L.being.sy = (1 - Math.sin(t * 1.3) * 0.015 * ramp) / squash * (1 + 0.09 * stand);
        L.being.rotate *= 1 - 0.7 * stand;
        // Its fire and its rulito go with it
        L.fire.x = L.rulito.x = L.being.x;
        L.fire.y = L.rulito.y = L.being.y;
        L.rulito.rotate = L.being.rotate * 0.5 + Math.sin(t * 1.8) * 3 * ramp;
        play_(t, Math.min(dt, 0.1));
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
            swimmer: { x: BEING.x, y: BEING.y, r: BEING.r, wall: WALL },
            bodies: [
                { id: 'nucleus', circles: [[NUC.x, NUC.y, NUC.r]], mass: 12, sway: 0.004 },
                ...FLOAT.map(({ id, circles = [], mass, sway }) => ({ id, circles, mass, sway })),
            ],
        });
        // The layers and their layout first, so the particles measured on them are made again after them on a resize
        build(stage);
        L.interior.uniforms.uTint.value.setRGB(0.96, 0.6, 0.32);
        stage.onResize((W, H) => place(W, H));
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
        front = startStardust(null, {
            stage,
            groups: [
                { points: rimPoints, look: 'hard', drift: 2, jitter: 0.5, twinkle: 0.1, reach: 0, parallax: 0, order: L.nucleus.mesh.renderOrder + 0.5 },
                { ...aimGroup, order: 1e6 - 1 },
                { ...sparks.group(), order: 1e6 },
            ],
        });
        hand = createGhostHand(stage);
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
        hand?.destroy();
        stage?.destroy();
        stageEl?.style.removeProperty('--name-glow');
        kindler.destroy();
    });
</script>

<template>
    <div class="scene" ref="root">
        <canvas class="stageCanvas" ref="canvas"></canvas>
        <!-- The rulito is drawn on its own canvas, which the stage shows as a texture over the being's head -->
        <Rulito ref="rulito" class="offstage" color="#f2b036" />
        <div ref="cellHit" class="hit cell" role="button" tabindex="0"
            :aria-label="$i18n.locale === 'en' ? 'Rub to light the being, then pull it back and let go to light the crown' : 'Frotá para encender al ser, después tirá de él y soltá para encender la corona'"
            @pointerdown.prevent="press" @keydown="onCellKey"></div>
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

    .hit.cell {
        touch-action: none;                    /* rubbing and pulling drag the finger: with manipulation the phone takes it for a scroll and cancels it; the crown and below still let the page scroll */
        -webkit-touch-callout: none;
        user-select: none;
        -webkit-user-select: none;
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
