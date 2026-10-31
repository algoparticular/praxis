<script setup>
    // Desafío: "I respond to my challenges with confidence and I discover new talents". Vulpes sits at the door of a
    // great round labyrinth of pink walls, looking in; at its heart, far away over the rings, a white light shines. Two
    // stones lie on one side of him and two little mushrooms glow pink on the other, under a mint sky with a few dark
    // stars and one small stroke of a shooting star.
    // It has no game yet (its verb will be Encender, the engine of Evolución and Viriya: a fire that bounces off the
    // walls of the maze to the light at its heart), so it is only alive: the light breathes, its stipple trembles and
    // motes of light rise from it; Vulpes breathes, blinks and now and then turns his head to the light; the mushroom caps
    // sway and their pink spores drift; the stroke in the sky glides slowly along. A touch on Vulpes strums the card's
    // chord: he looks up at the light and it flares; a touch on the mushrooms makes them pop and their spores flare.
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
    import { play } from '../../composables/useSound.js';
    import art from '../../composables/desafioScene.json';

    const props = defineProps({
        card: { type: Object, default: () => ({}) },
        active: Boolean
    });

    const root = ref(null);
    const canvas = ref(null);
    const foxHit = ref(null);
    const mushroomsHit = ref(null);
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
    let W = 1;
    const k = () => F.size / SIZE;
    const sx = (x) => F.x + x * k();
    const sy = (y) => F.y + y * k();
    const rectOf = ([left, top, w, h]) => ({ left: sx(left), top: sy(top), w: w * k(), h: h * k() });
    const SPAN = 1480, FOCUS = 1190;        // art px across that must be seen on a phone, and their middle
    const DROP = 0.03;                      // how much of the frame goes under the bottom of a wide screen
    const TOP = 330;                        // the art px that must be under the card's name (just over the maze)
    const layout = (w, h) => {
        W = w;
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
        fox.enter({ y: 70, delay: 450, duration: 1900 });
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
        stage.bloom = reduced ? 0 : 0.5 * life.flare;

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
    });
</script>

<template>
    <div class="scene" ref="root">
        <canvas class="stageCanvas" ref="canvas"></canvas>
        <div ref="foxHit" class="hit" role="button" tabindex="0"
            :aria-label="$i18n.locale === 'en' ? 'Vulpes looks at the light at the heart of the labyrinth' : 'Vulpes mira la luz en el centro del laberinto'"
            @pointerdown="touchFox" @keydown="onKey(touchFox)($event)"></div>
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
</style>
