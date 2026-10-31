<script setup>
    // Desafío: "I respond to my challenges with confidence and I discover new talents". Vulpes sits at the door of a
    // great round labyrinth of pink walls, looking in; at its heart, far away over the rings, a white light shines. Two
    // stones lie on one side of him and two little mushrooms glow pink on the other, under a mint sky with a few dark
    // stars and one small stroke of a shooting star.
    // Its verb is Encender (useKindle.js, the engine of Evolución, Viriya and Coraje): rubbing Vulpes warms his tail until
    // it catches; then it is a sling, and the flame has to go in through the door (the walls in front of the maze bounce
    // it back). Inside, it runs along the corridors from the outside in, half a turn round each ring, and every wall it
    // crosses catches fire (a ring of fire dots along it), as many as the pull was strong (one to three); walls already
    // lit it runs past quickly. With the four rings lit it reaches the light at the heart: it blazes, D7 resolves to G
    // (`resolve`) and the rulito is born over it ("at the end of the way, a better version of you"); then the rings go
    // out. See docs/verbos-y-dinamicas.md.
    // It is also alive: the light breathes, its stipple trembles and
    // motes of light rise from it; Vulpes breathes, blinks and now and then turns his head to the light; the mushroom caps
    // sway and their pink spores drift; the stroke in the sky glides slowly along. A touch on the mushrooms makes them pop
    // and their spores flare.
    // Nothing is a picture that need not be: the mint of the sky and the ground (the card's colour, which no layer has)
    // is painted in code, the stars, the spores and the light's stipple are particles, and the light's glow is drawn in
    // code. The maze, Vulpes (his eye on its own, to blink), the stones, the mushrooms, the marks on the ground and the
    // stroke in the sky are pictures, planes at their depths on the WebGL stage (useLayerStage); on a wide screen the maze
    // goes on past the card until it closes (its two ends, made by the converter), the marks on the ground and the stars
    // go on too. From desafioScene.json and public/assets/desafio (made by scripts/convert-desafio.mjs). The touch
    // targets are DOM elements over Vulpes and the mushrooms.
    import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { createParallax } from '../../composables/useParallax.js';
    import { createLayerStage } from '../../composables/useLayerStage.js';
    import { startStardust } from '../../composables/useStardust.js';
    import { createSparks } from '../../composables/useSparks.js';
    import { createKindle, FIRE } from '../../composables/useKindle.js';
    import { play } from '../../composables/useSound.js';
    import { sceneMilestone } from '../../analytics.js';
    import Rulito from '../Rulito.vue';
    import art from '../../composables/desafioScene.json';

    const props = defineProps({
        card: { type: Object, default: () => ({}) },
        active: Boolean
    });

    const root = ref(null);
    const canvas = ref(null);
    const foxHit = ref(null);
    const mushroomsHit = ref(null);
    const rulito = ref(null);
    let stageEl = null;
    let stage = null;
    let parallax = null;
    let dust = null;
    let entered = false;
    let gone = false;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ---- Layout: the illustration is a 2160 square resting on the bottom of the screen. On a phone upright it is as big
    // as the door of the maze, Vulpes and the mushrooms allow across, centred on them; on a wide screen as big as the
    // height allows with the maze under the card's name, and the land goes on past the frame on both sides
    const SIZE = art.size;
    const B = art.boxes;
    let F = { x: 0, y: 0, size: 1 };
    let W = 1, H = 1;
    const k = () => F.size / SIZE;
    const sx = (x) => F.x + x * k();
    const sy = (y) => F.y + y * k();
    const rectOf = ([left, top, w, h]) => ({ left: sx(left), top: sy(top), w: w * k(), h: h * k() });
    const SPAN = 1480, FOCUS = 1190;        // art px across that must be seen on a phone, and their middle
    const DROP = 0.03;                      // how much of the frame goes under the bottom of a wide screen
    const TOP = 330;                        // the art px that must be under the card's name (just over the maze)
    const layout = (w, h) => {
        W = w; H = h;
        const phone = w < h;
        const room = h - titleBottom(h) - 10;
        let size;
        if (phone) size = Math.min(0.75 * h, w * SIZE / SPAN, room * SIZE / (SIZE - TOP));
        else size = Math.min(0.98 * h, room * SIZE / (SIZE * (1 - DROP) - TOP), 1.2 * w);
        let x = w / 2 - size / 2;
        if (phone && size > w) x = Math.min(0, Math.max(w - size, w / 2 - FOCUS * size / SIZE));
        F = { x, y: h - size + (phone ? 0 : DROP * size), size };
    };

    const SLIDE = 46;
    const SLIDE_Y = 28;
    const zFor = (amp) => amp / (SLIDE + amp);
    const DEPTH = { stars: 3, comet: 6, maze: 12, ground: 20, fox: 24 };

    const GROUND = art.ground;
    const LIGHT = art.light;
    const INK = 0x047494;                   // the card's line colour: its stars are dots of it
    const SPORE = art.sporeColor;
    const rand = (a, b) => a + Math.random() * (b - a);

    // ---- Vulpes: he breathes, blinks, and now and then turns his head to the light (a lean of his head about his
    // neck, in the shader; his eye, its own picture, goes with it)
    const NECK = [1050, 1500];
    const HEAD_W = 0.42;                    // the width of his head as a part that leans (a fraction of the picture)
    const TAIL = [1420, 1960];
    const BLINK = 0.16;
    const shut = (since) => (since >= 0 && since < BLINK ? 1 - 0.88 * Math.sin(since / BLINK * Math.PI) : 1);
    const life = { blink: 2.4, look: 0, lookTo: 0, nextLook: 5, flare: 0, pop: 0, popV: 0, caps: art.caps.map(() => Math.random() * 6.28) };
    const LOOK_TO = 6;                      // deg: his head turned up to the light (his nose lifts)

    // ---- The stroke in the sky glides along and wraps round, under the card's name
    const comet = { x0: 0, rest: { left: 0, top: 0, w: 1, h: 1 } };
    let span = { left: 0, width: 1 };

    // ---- Motes of light rising from the heart of the maze, as particles (they move every frame)
    const MOTES = 26;
    const motes = Array.from({ length: MOTES }, () => ({ born: -rand(0, 6), life: rand(3.5, 6), dx: rand(-1, 1), sway: rand(0, 6.28), size: rand(2.4, 4.6) }));
    const moteGroup = {
        count: MOTES,
        update(t, data) {
            const [bx0, by0, bx1] = LIGHT.box;
            const width = (bx1 - bx0) * k();
            motes.forEach((m, i) => {
                let age = t - m.born;
                if (age > m.life) { m.born = t; m.dx = rand(-1, 1); m.life = rand(3.5, 6); age = 0; }
                const p = age / m.life;
                data.positions[i * 3] = sx(LIGHT.x) + m.dx * width * 0.42 + Math.sin(t * 0.9 + m.sway) * 24 * k();
                data.positions[i * 3 + 1] = sy(by0 + 40) - p * 420 * k();
                data.sizes[i] = m.size * (1 - 0.5 * p) * (1 + 0.6 * life.flare);
                data.alphas[i] = reduced ? 0 : Math.sin(p * Math.PI) * (0.55 + 0.45 * life.flare);
            });
        },
    };

    const L = {};


    // ---- Encender: the rings of the maze, lit from the outside in
    // Each wall of the maze is an ellipse (art px, measured on the card): its middle across, the y of its back and its
    // front over the light's column, and its half width; 0 is the innermost, round the light, 3 the outer wall, whose
    // front is where the door opens
    const WALLS = [[800, 500, 596, 316], [800, 456, 660, 640], [800, 424, 720, 980], [800, 384, 830, 1380]]
        .map(([x, back, front, a]) => ({ x, y: (back + front) / 2, a, b: (front - back) / 2, on: false, lit: 0, flash: 0 }));
    const DOOR = { left: 600, right: 1160, top: 830, bottom: 1760 };   // art px: the gap between the walls in front
    const TAIL_TIP = [1430, 1955];                                   // art px: the curl of his tail, where the fire is
    const HEART = [796, 548];
    const DELAY = 1.3, GROW = 2.2, LINGER = 2.6, EAT = 3.4;
    let win = null;
    let wins = 0;
    let run = null;                         // the flame inside the maze: { steps, i, at, power }
    let hint = 0;
    let glyph = { left: 0, top: 0, w: 1, h: 1 };
    let last = null;                        // where the flame was a step ago
    const sparks = createSparks(420);

    // From art px of the maze's picture to the canvas now (the maze only slides and scales with the camera)
    let mz = { ox: 0, oy: 0, s: 1 };
    const measureMaze = () => {
        const o = L.maze.toScreen(sx(0), sy(0)), e = L.maze.toScreen(sx(1000), sy(1000));
        mz = { ox: o.x, oy: o.y, s: (e.x - o.x) / 1000 };
    };
    const onMaze = (x, y) => ({ x: mz.ox + x * mz.s, y: mz.oy + y * mz.s });
    // A point of a ring's band (between wall i and the one inside it; -1 the heart) at angle a (0 right, PI/2 the front)
    const band = (i, a) => {
        const out = WALLS[i], inner = i > 0 ? WALLS[i - 1] : { x: HEART[0], y: HEART[1], a: 0, b: 0 };
        return onMaze((out.x + inner.x) / 2 + Math.cos(a) * (out.a + inner.a) / 2, (out.y + inner.y) / 2 + Math.sin(a) * (out.b + inner.b) / 2);
    };
    const tailAt = () => L.fox.toScreen(sx(TAIL_TIP[0]), sy(TAIL_TIP[1]));

    // Before the door: off the edges of the screen, and off the walls in front of the maze (only the door lets it in)
    const collide = (f) => {
        const prev = last ?? { x: f.x, y: f.y };
        last = { x: f.x, y: f.y };
        if (kindler.edges(W, H)) play('tap');
        const d = { l: onMaze(DOOR.left, 0).x, r: onMaze(DOOR.right, 0).x, t: onMaze(0, DOOR.top).y, b: onMaze(0, DOOR.bottom).y };
        const inDoor = f.x > d.l && f.x < d.r;
        if (f.y < d.b && !inDoor) {
            // a wall in front: from the corridor it bounces sideways, from below or above it bounces back
            if (prev.x > d.l && prev.x < d.r && prev.y < d.b) { f.vx = -f.vx * 0.8; f.x = Math.min(d.r - 1, Math.max(d.l + 1, f.x)); }
            else { f.vy = Math.abs(f.vy) * (prev.y >= d.b ? 0.7 : 1) * (prev.y >= d.b ? 1 : -1); f.y = prev.y >= d.b ? d.b + 1 : Math.min(f.y, d.t - 1); }
            kindler.bounce();
            play('tap');
            return;
        }
        if (inDoor && f.y <= d.t) goIn(f);
    };
    const kindler = createKindle({
        size: () => F.size,
        source: tailAt,
        canvas: () => canvas.value,
        sparks,
        busy: () => !!win || !!run || reduced,
        gravity: 0.25,
        speed: [1, 1.8],
        collide,
        onKindle: (step) => play('kindle', { step }),
        onIgnite: () => { play('ignite', 1); play('star'); life.lookTo = 1; life.nextLook = lastT + 2; },
        onLaunch: (pull) => { play('ignite', pull); power = pull < 0.5 ? 1 : pull < 0.85 ? 2 : 3; last = null; },
    });
    let power = 1;

    // In through the door: the flame runs on along the corridors by itself. Its way: through the door (the outer wall),
    // half a turn round each band, crossing the next wall in; a wall already lit it runs past quickly, one not lit it
    // lights while it has power, and without power it goes out there
    const goIn = (f) => {
        kindler.mode = 'maze';
        const steps = [];
        let a = Math.PI / 2;
        for (let i = 3; i >= 0; i--) {
            steps.push({ wall: i, a });                          // cross wall i at angle a
            const turn = (i % 2 ? -1 : 1) * Math.PI;
            steps.push({ band: i, from: a, to: a + turn });      // half a turn round the band inside it
            a += turn;
        }
        run = { steps, i: 0, at: lastT, from: { x: f.x, y: f.y }, power };
    };
    const runTick = (t) => {
        if (!run) return;
        const f = kindler.flame;
        const step = run.steps[run.i];
        if (!step) {
            // at the heart, with every wall lit
            run = null;
            reach();
            return;
        }
        if (step.wall !== undefined) {
            const wall = WALLS[step.wall];
            if (!wall.on) {
                if (run.power <= 0) { run = null; kindler.goOut(); play('miss'); return; }
                run.power -= 1;
                catchFire(step.wall);
            }
            run.i += 1;
            run.at = t;
            run.from = { x: f.x, y: f.y };
            return;
        }
        const quick = WALLS[step.band].on && (step.band === 0 || WALLS[step.band - 1].on);
        const T = quick ? 0.45 : 0.95;
        const u = Math.min(1, (t - run.at) / T);
        const e = u * u * (3 - 2 * u);
        const p = band(step.band, step.from + (step.to - step.from) * e);
        // the first moment it glides from where it came in to the band
        const join = Math.min(1, (t - run.at) / 0.18);
        f.x = run.from.x + (p.x - run.from.x) * (run.i === 1 ? join : 1);
        f.y = run.from.y + (p.y - run.from.y) * (run.i === 1 ? join : 1);
        if (step.band === 0) {
            // the last band leads into the heart
            const h = onMaze(HEART[0], HEART[1]);
            f.x += (h.x - f.x) * e;
            f.y += (h.y - f.y) * e;
        }
        if (Math.random() < 0.6) sparks.burst(f.x, f.y, { n: 2, colors: FIRE, speed: 30, life: 0.7, size: 3.5, spread: 4 });
        if (u >= 1) { run.i += 1; run.at = t; run.from = { x: f.x, y: f.y }; }
    };

    // A wall catches fire: a ring of fire dots along it, its note
    const catchFire = (i) => {
        const wall = WALLS[i];
        wall.on = true;
        wall.flash = 1;
        const n = WALLS.filter((w) => w.on).length;
        const f = kindler.flame;
        sparks.burst(f.x, f.y, { n: 26, colors: FIRE, speed: 120, life: 1.8, size: 4.6, spread: 6 });
        play('link', { from: (n - 1) / WALLS.length, to: n / WALLS.length, level: 0.9 });
    };
    // The heart: the light blazes, D7 resolves to G and the rulito is born over it
    const reach = () => {
        kindler.reset();
        if (win) return;
        wins += 1;
        win = { age: 0, head: 0, tail: 0, full: false, fullAt: 0, back: false, pop: 0 };
        rulito.value?.reshape();
        life.flare = 1;
        life.lookTo = 1;
        life.nextLook = lastT + 4;
        const h = onMaze(HEART[0], HEART[1]);
        sparks.burst(h.x, h.y, { n: 60, colors: [...FIRE, 0xffffff], speed: 200, life: 2.4, size: 5.5, spread: 10 });
        play('ignite', 1);
        play('resolve');
        dust?.boost(1, 1.6);
        dust?.boost(3, 1.6);
        sceneMilestone('maze_lit', { times: wins });
    };
    const winTick = (t, dt) => {
        let named = 0;
        if (win && rulito.value) {
            win.age += dt;
            win.pop = Math.max(0, win.pop - dt * 2.2);
            life.flare = Math.max(life.flare, win.back ? 0 : 0.7);
            win.head = 1 - (1 - Math.min(1, Math.max(0, (win.age - DELAY) / GROW))) ** 1.6;
            if (win.head >= 1 && !win.full) { win.full = true; win.fullAt = win.age; win.pop = 1; play('rulito'); }
            if (win.full && !win.back && win.age - win.fullAt > LINGER) { win.back = true; WALLS.forEach((w) => { w.on = false; }); }
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
        stageEl?.style.setProperty('--name-glow', named.toFixed(3));
        return named;
    };

    // Pressing Vulpes: cold, rub him (his tail warms); on fire, take the sling. With the keyboard: Enter rubs, and on fire
    // throws the flame through the door
    const pressFox = (event) => {
        if (reduced || win) { touchFox(); return; }
        kindler.press(event);
    };
    const keyFox = (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        if (reduced || win) { touchFox(); return; }
        kindler.key(() => onMaze((DOOR.left + DOOR.right) / 2, DOOR.top - 40));
    };

    // The rings that are lit, as fire dots along their walls, and the flame's trail
    const RING_DOTS = [80, 130, 180, 240];
    const RING_FIRE = [0xff8a3d, 0xffa64d, 0xffc05c, 0xff7a45, 0xfff0c8];
    const ringGroup = {
        count: RING_DOTS.reduce((s, n) => s + n, 0),
        update(t, data) {
            data.alphas.fill(0);
            if (!L.maze || reduced) return;
            let j = 0;
            WALLS.forEach((wall, i) => {
                for (let d = 0; d < RING_DOTS[i]; d++, j++) {
                    if (wall.lit < 0.01) continue;
                    const a = d / RING_DOTS[i] * Math.PI * 2 + t * 0.05 * (i % 2 ? 1 : -1);
                    const p = onMaze(wall.x + Math.cos(a) * wall.a, wall.y + Math.sin(a) * wall.b - 18);
                    data.positions[j * 3] = p.x;
                    data.positions[j * 3 + 1] = p.y;
                    const flicker = 0.6 + 0.4 * Math.sin(t * 6 + d * 1.7 + i);
                    data.sizes[j] = (4.5 + 3 * flicker + 5 * wall.flash) * Math.max(0.8, mz.s * 2.2);
                    data.alphas[j] = Math.min(1, wall.lit * (0.7 + 0.3 * flicker) + 0.5 * wall.flash);
                    const c = RING_FIRE[(d + i) % RING_FIRE.length];
                    data.tints[j * 3] = (c >> 16 & 255) / 255;
                    data.tints[j * 3 + 1] = (c >> 8 & 255) / 255;
                    data.tints[j * 3 + 2] = (c & 255) / 255;
                }
            });
        },
    };

    // Every frame: the heat, the flight (or the run through the maze), the rings, the rulito
    const game = (t, dt) => {
        measureMaze();
        kindler.update(t, dt);
        runTick(t);
        WALLS.forEach((wall) => {
            wall.lit += ((wall.on ? 1 : 0) - wall.lit) * Math.min(1, dt * (wall.on ? 4 : 0.5));
            wall.flash = Math.max(0, wall.flash - dt * 1.2);
        });
        const charge = kindler.charge;
        if (charge > 0.15 && Math.random() < dt * (4 + 14 * charge)) {
            const s = tailAt();
            sparks.burst(s.x, s.y, { n: 1, colors: FIRE, speed: 20 + 40 * charge, life: 1.1, size: 2.5 + 2.5 * charge, spread: 10 });
        }
        if (!kindler.rubbing && !kindler.aiming && !win && kindler.mode !== 'flying' && !run && kindler.idle > 7) {
            kindler.idle = 0;
            hint = 1;
            const s = tailAt();
            sparks.burst(s.x, s.y, { n: 8, colors: FIRE, speed: 50, life: 0.9, size: 3.5, spread: 8 });
        }
        hint = Math.max(0, hint - dt * 1.4);
        const out = kindler.mode === 'flying' || kindler.mode === 'maze';
        L.flame.x = L.flameCore.x = kindler.flame.x;
        L.flame.y = L.flameCore.y = kindler.flame.y;
        L.flame.opacity = out ? 0.95 : 0;
        L.flameCore.opacity = out ? 1 : 0;
        L.flame.scale = 1 + 0.15 * Math.sin(t * 17);
        L.flame.mesh.visible = L.flameCore.mesh.visible = out;
        L.torch.opacity = Math.min(1, 1.1 * charge * (0.85 + 0.15 * Math.sin(t * 7)) + hint * 0.5);
        L.torch.scale = 0.6 + 0.6 * charge + 0.3 * hint;
        const lit = WALLS.reduce((s2, w) => s2 + w.lit, 0) / WALLS.length;
        L.maze.uniforms.uBright.value = 1 + 0.08 * lit;
        const named = winTick(t, dt);
        return Math.max(named, 0.35 * charge, out ? 0.4 : 0, 0.3 * lit);
    };

    const build = (s) => {
        // The far sky: the stroke of the shooting star (the stars are particles, drawn with it)
        const far = s.depth(zFor(DEPTH.comet));
        L.cometNode = far;
        L.comet = far.image('/assets/desafio/comet.webp');
        far.enter({ y: -20, delay: 300, duration: 2000 });
        // The maze, with its two ends past the card; the light at its heart: a glow in code, its solid middle
        const maze = s.depth(zFor(DEPTH.maze));
        L.mazeNode = maze;
        L.mazeEnds = ['mazeLeft', 'mazeRight'].map((name) => ({ name, node: maze.image(`/assets/desafio/${name}.webp`) }));
        L.maze = maze.image('/assets/desafio/maze.webp');
        L.halo = maze.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: 0xfff6ee, stops: [[0, 0.55], [0.3, 0.22], [0.66, 0]], bloom: true });
        L.core = maze.image('/assets/desafio/lightCore.webp', { bloom: true });
        L.rulito = maze.canvas(rulito.value.canvas, { bloom: true });
        maze.enter({ y: 40, delay: 100, duration: 1800 });
        // The ground: its marks (going on past the card), the stones and the mushrooms
        const ground = s.depth(zFor(DEPTH.ground));
        L.groundNode = ground;
        L.ticks = [-1, 0, 1].map((side) => ({ side, node: ground.image('/assets/desafio/ticks.webp') }));
        L.stones = ground.image('/assets/desafio/stones.webp');
        L.mushrooms = ground.image('/assets/desafio/mushrooms.webp', { sway: true });
        ground.enter({ y: 50, delay: 250, duration: 1700 });
        // Vulpes, and his eye
        const fox = s.depth(zFor(DEPTH.fox));
        L.foxNode = fox;
        L.fox = fox.group();
        L.body = L.fox.image('/assets/desafio/fox.webp', { sway: true });
        L.eye = L.fox.image('/assets/desafio/eye.webp');
        L.torch = L.fox.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: [1, 0.74, 0.35], stops: [[0, 0.75], [0.3, 0.32], [0.62, 0]], bloom: true });
        L.torch.opacity = 0;
        fox.enter({ y: 70, delay: 450, duration: 1900 });
        // The flame in flight, at the focal plane (it does not move with the camera)
        const air = s.depth(0);
        L.flame = air.glow({ rect: { left: -1, top: -1, w: 2, h: 2 }, color: [1, 0.7, 0.32], stops: [[0, 0.9], [0.25, 0.5], [0.62, 0]], bloom: true });
        L.flameCore = air.glow({ rect: { left: -1, top: -1, w: 2, h: 2 }, color: 0xfff6dc, stops: [[0, 1], [0.3, 0.6], [0.6, 0]], bloom: true });
        L.flame.opacity = L.flameCore.opacity = 0;
    };

    // Where a point of Vulpes' picture goes when his head leans by `angle` (deg) about his neck: as the shader moves it
    const leaned = ([x, y], angle) => {
        const a = angle * Math.PI / 180;
        const dx = x - NECK[0], dy = y - NECK[1];
        return [NECK[0] + dx * Math.cos(a) - dy * Math.sin(a), NECK[1] + dx * Math.sin(a) + dy * Math.cos(a)];
    };

    const place = (w, h) => {
        layout(w, h);
        root.value.style.background = `#${GROUND.toString(16).padStart(6, '0')}`;

        // The stroke in the sky: under the card's name, however tall the screen
        const c = rectOf(B.comet);
        const below = titleBottom(h) + 20;
        comet.rest = { ...c, top: Math.max(c.top, below) };
        comet.x0 = c.left;
        L.comet.place(comet.rest);
        span = { left: -SLIDE * 2 - c.w, width: w + SLIDE * 4 + c.w * 2 };

        L.maze.place(rectOf(B.maze));
        L.mazeEnds.forEach(({ name, node }) => node.place(rectOf(B[name])));
        const hw = (LIGHT.box[2] - LIGHT.box[0]) * 2.4 * k();
        L.halo.place({ left: sx(LIGHT.x) - hw / 2, top: sy(LIGHT.y) - hw * 0.42, w: hw, h: hw * 0.75 });
        L.core.place(rectOf(B.lightCore));

        const ticks = rectOf(B.ticks);
        L.ticks.forEach(({ side, node }) => node.place({ ...ticks, left: ticks.left + side * F.size }));
        L.stones.place(rectOf(B.stones));
        const m = rectOf(B.mushrooms);
        L.mushrooms.place(m, { x: m.left + m.w / 2, y: m.top + m.h });

        const f = rectOf(B.fox);
        L.body.place(f);
        L.eye.place(rectOf(B.eye));
        L.fox.pivot = { x: sx(1180), y: sy(2070) };
        const td = 320 * k();
        L.torch.place({ left: sx(TAIL_TIP[0]) - td / 2, top: sy(TAIL_TIP[1]) - td / 2, w: td, h: td });
        // The rulito over the light at the heart (its canvas is bigger than the glyph, for the glow)
        const gw = Math.max(16, 54 * k()), gh = gw * 86 / 32;
        glyph = { left: sx(LIGHT.x) - gw / 2, top: sy(LIGHT.box[1] - 10) - gh, w: gw, h: gh };
        rulito.value.frame({ width: glyph.w });
        L.rulito.place({ left: glyph.left - 0.4375 * glyph.w, top: glyph.top - 0.1628 * glyph.h, w: glyph.w * 1.875, h: glyph.h * 1.3256 },
            { x: glyph.left + glyph.w / 2, y: glyph.top + glyph.h });
        L.rulito.refresh();
        const fd = Math.max(40, 130 * k());
        L.flame.place({ left: -fd / 2, top: -fd / 2, w: fd, h: fd });
        L.flameCore.place({ left: -fd / 5, top: -fd / 5, w: fd / 2.5, h: fd / 2.5 });
    };

    // Where the card's name ends (the stage's h1, over the scene), so the maze and the sky's stroke keep under it
    const titleBottom = (h) => {
        const title = stageEl?.querySelector('h1');
        if (!title || !root.value) return 0.16 * h;
        return title.getBoundingClientRect().bottom - root.value.getBoundingClientRect().top;
    };

    // The particles: the stars of the card (and on a screen wider or taller than the card, the same band again round
    // it, each copy moved along so they do not line up), the light's stipple, the spores, the rising motes
    const starPoints = () => {
        const out = [];
        const band = 330;
        const tiers = Math.max(0, Math.ceil(F.y / (band * k())));
        for (let ty = 0; ty <= tiers; ty++) {
            for (let tx = -2; tx <= 2; tx++) {
                art.stars.forEach(([x, y, r]) => {
                    const px = sx(x + tx * SIZE + ((ty * 737) % SIZE)), py = sy(y - ty * band);
                    if (px < -60 || px > W + 60 || py < -20) return;
                    out.push([px, py, Math.max(1.4, 2 * r * k()), INK]);
                });
            }
        }
        return out;
    };

    // ---- Touch: on Vulpes he looks up at the light and it flares (the card's chord); on the mushrooms they pop
    const touchFox = () => {
        play('star');
        if (reduced) return;
        life.lookTo = 1;
        life.nextLook = lastT + 2.6;
        life.blink = lastT + 0.05;
        life.flare = 1;
        dust?.boost(1, 1);
        dust?.boost(3, 1);
    };
    const touchMushrooms = () => {
        play('tap');
        if (reduced) return;
        life.popV += 9;
        dust?.boost(2, 1.2);
    };
    const onKey = (fn) => (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        fn();
    };

    const placeHit = (el, node, rect) => {
        if (!node || !el) return;
        const b = node.boxOnScreen(rect);
        const bw = Math.max(56, b.width), bh = Math.max(56, b.height);
        el.style.translate = `${(b.left + b.width / 2 - bw / 2).toFixed(1)}px ${(b.top + b.height / 2 - bh / 2).toFixed(1)}px`;
        el.style.width = `${bw.toFixed(1)}px`;
        el.style.height = `${bh.toFixed(1)}px`;
    };
    const placeHits = () => {
        placeHit(foxHit.value, L.fox, rectOf([840, 1270, 700, 800]));
        placeHit(mushroomsHit.value, L.mushrooms, rectOf(B.mushrooms));
    };

    const enter = () => {
        if (entered || !props.active || !stage) return;
        entered = true;
        stage.ready().then(() => { if (!gone) { stage.start(); dust?.reveal(); } });
    };

    let frames = 0;
    let lastT = 0;
    const frame = ({ x, y, scroll, t, ramp }) => {
        if (!stage || !L.fox) return;
        const dt = Math.min(0.1, Math.max(0, t - lastT));
        lastT = t;
        stage.look(x * SLIDE, y * SLIDE_Y);
        life.flare = Math.max(0, life.flare - dt * 0.7);

        // ---- The sky's stroke glides from left to right and wraps round, bobbing a little
        const moved = comet.x0 + 9 * t;
        const wrapped = span.left + ((((moved - span.left) % span.width) + span.width) % span.width);
        L.comet.x = reduced ? 0 : wrapped - comet.x0;
        L.comet.y = Math.sin(t * 0.5) * 6 * ramp;
        L.comet.rotate = Math.sin(t * 0.7) * 4 * ramp;
        L.cometNode.y = scroll * 6;

        // ---- The light at the heart of the maze breathes; touched, it flares
        const breath = Math.sin(t * 0.8) * 0.5 + 0.5;
        L.halo.opacity = 0.6 + 0.25 * breath * ramp + 0.4 * life.flare;
        L.halo.scale = 1 + 0.06 * breath * ramp + 0.25 * life.flare;
        L.core.uniforms.uBright.value = 1 + 0.04 * breath * ramp + 0.08 * life.flare;
        L.mazeNode.y = scroll * 14;
        const glow = reduced ? 0 : game(t, dt);
        stage.bloom = reduced ? 0 : Math.max(0.5 * life.flare, glow);

        // ---- The mushrooms: each cap leans and breathes on its stem; touched, they pop (a spring)
        life.popV += (-90 * life.pop - 7 * life.popV) * dt;
        life.pop += life.popV * dt;
        L.mushrooms.sways = art.caps.map(([u, v, w], i) => [u, v, w,
            (3 * Math.sin(t * 0.8 + life.caps[i]) + 1.2 * Math.sin(t * 2.1 + life.caps[i] * 2)) * ramp + (i ? 5 : -5) * life.pop,
            1 + 0.04 * Math.sin(t * 1.3 + life.caps[i]) * ramp + 0.12 * life.pop]);
        L.groundNode.y = scroll * 20;

        // ---- Vulpes breathes, blinks, and now and then turns his head to the light, then back
        if (!reduced && t > life.nextLook) {
            life.lookTo = life.lookTo ? 0 : 1;
            life.nextLook = t + (life.lookTo ? rand(2, 3.5) : rand(6, 11));
            life.blink = t + 0.1;
        }
        life.look += (life.lookTo - life.look) * Math.min(1, dt * 2.2);
        const head = (LOOK_TO * life.look + 0.8 * Math.sin(t * 0.45)) * ramp;
        const tail = 2.2 * Math.sin(t * 0.6 + 1) * ramp;
        const fw = B.fox[2], fh = B.fox[3];
        L.body.sways = [
            [(NECK[0] - B.fox[0]) / fw, (NECK[1] - B.fox[1]) / fh, HEAD_W, head, 1],
            [(TAIL[0] - B.fox[0]) / fw, (TAIL[1] - B.fox[1]) / fh, 0.3, tail, 1 + 0.03 * Math.sin(t * 0.6 + 1) * ramp],
        ];
        const b = Math.sin(t * 1.1) * 0.012 * ramp;
        L.fox.sy = 1 + b;
        L.fox.sx = 1 - b * 0.4;
        const [ex, ey] = leaned(art.fox.eye, head);
        L.eye.x = (ex - art.fox.eye[0]) * k();
        L.eye.y = (ey - art.fox.eye[1]) * k();
        const since = t - life.blink;
        L.eye.sy = ramp > 0 ? shut(since) : 1;
        if (since > BLINK && life.blink < t) life.blink = t + rand(2.5, 5.5) + (Math.random() < 0.2 ? -2.2 : 0);
        L.foxNode.y = scroll * 24;

        // The particles that belong to a layer follow it
        const far = stage.drift(zFor(DEPTH.stars)), mazeDrift = stage.drift(L.mazeNode.z), groundDrift = stage.drift(L.groundNode.z);
        dust?.shift(0, far.x, far.y + scroll * 4);
        dust?.shift(1, mazeDrift.x, mazeDrift.y + L.mazeNode.y);
        dust?.shift(2, groundDrift.x, groundDrift.y + L.groundNode.y);
        dust?.shift(3, mazeDrift.x, mazeDrift.y + L.mazeNode.y);
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
        build(stage);
        stage.onResize((w, h) => place(w, h));
        const after = (node) => node.mesh.renderOrder + 0.5;
        const fromArt = (list, colour, scale = 1) => list.map(([x, y, r]) => [sx(x), sy(y), Math.max(1.2, 2 * r * k() * scale), colour]);
        // The stars go before everything (the first layer is the sky's stroke)
        const first = L.comet.mesh.renderOrder - 0.5;
        dust = startStardust(null, {
            stage,
            manual: true,
            groups: [
                // 0: the stars of the card, flat dark dots
                { colors: [INK], look: 'hard', parallax: 0, drift: 1.2, twinkle: 0.35, reach: 0, order: first, points: starPoints },
                // 1: the stipple of the light at the heart of the maze, alive
                { colors: [LIGHT.color], parallax: 0, drift: 1.6, jitter: 0.5, twinkle: 0.4, reach: 0, bloom: true, order: after(L.core), points: () => fromArt(LIGHT.dots, LIGHT.color, 1.15) },
                // 2: the spores round the mushrooms, stirred by a finger
                { colors: [SPORE], look: 'hard', parallax: 0, drift: 3, jitter: 0.6, twinkle: 0.3, reach: 70, push: 14, order: after(L.mushrooms), points: () => fromArt(art.spores, SPORE) },
                // 3: motes of light rising from it
                { colors: [0xfff6ee], dynamic: moteGroup, parallax: 0, drift: 0, twinkle: 0.2, reach: 0, bloom: true, order: after(L.core) + 0.1 },
                // 4: the rings of the maze that are lit (in px of the canvas: they follow the maze themselves)
                { colors: [0xffb069], dynamic: ringGroup, parallax: 0, drift: 0, twinkle: 0, reach: 0, look: 'hard', bloom: true, order: after(L.core) + 0.05 },
                // 5: the sling; 6: sparks
                { colors: [0xffffff], dynamic: kindler.aimGroup, parallax: 0, drift: 0, twinkle: 0, reach: 0, look: 'hard', order: 1e6 - 1 },
                { ...sparks.group(), order: 1e6 },
            ],
        });
        if (reduced) dust.reveal();
        parallax = createParallax(root.value, frame);
        enter();
    };

    onMounted(begin);
    watch(() => props.active, enter);
    onBeforeUnmount(() => {
        gone = true;
        parallax?.destroy();
        dust?.destroy();
        stage?.destroy();
        kindler.destroy();
        stageEl?.style.removeProperty('--name-glow');
    });
</script>

<template>
    <div class="scene" ref="root">
        <canvas class="stageCanvas" ref="canvas"></canvas>
        <!-- The rulito is drawn on its own canvas, which the stage shows over the light at the heart of the maze -->
        <Rulito ref="rulito" class="offstage" color="#ffb44a" />
        <div ref="foxHit" class="hit fox" role="button" tabindex="0"
            :aria-label="$i18n.locale === 'en' ? 'Vulpes: rub him until his tail catches fire, then pull back and let go to throw the flame through the door' : 'Vulpes: frotalo hasta que su cola se encienda, después tirá hacia atrás y soltá para lanzar la llama por la puerta'"
            @pointerdown.prevent="pressFox" @keydown="keyFox"></div>
        <div ref="mushroomsHit" class="hit" role="button" tabindex="0"
            :aria-label="$i18n.locale === 'en' ? 'The mushrooms' : 'Los hongos'"
            @pointerdown="touchMushrooms" @keydown="onKey(touchMushrooms)($event)"></div>
    </div>
</template>

<style scoped>
    .scene {
        position: absolute;
        inset: 0;
        overflow: hidden;
        background: #abdcd9;
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
        border-radius: 40%;
        cursor: pointer;
        pointer-events: auto;
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;
        outline: none;
    }

    .hit:focus-visible {
        outline: 2px solid rgba(20, 50, 70, 0.7);
        outline-offset: 2px;
    }

    /* Rubbing and pulling drag the finger: not a scroll */
    .hit.fox {
        touch-action: none;
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
</style>
