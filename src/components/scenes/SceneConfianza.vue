<script setup>
    // Confianza: trust, "I trust in myself and I let my wisdom guide my steps". A round labyrinth floats on the card's
    // aqua among scattered dots, with the chakana (the Andean cross) shining at its centre, the way home to oneself.
    // Three little beings wait at its three doors: Particular meditating at the top right, Aura (a jellyfish) on the left
    // and Vulpes at the bottom right; a little swimmer wanders among the dots.
    // No game yet: its verb will be Arraigar (hold the centre and something grows: the way through the corridors lit to
    // each door, as Paciencia's and Hogar's roots), so the corridors and the walls are separate pictures (a light can run
    // between them), the chakana is its own picture and each being its own. The card has no rulito layer.
    // What is alive: the light round the chakana breathes and its stippled edge trembles (particles), and now and then a
    // ring of light goes out from it through the labyrinth, as a call; the dots drift at two depths; Particular breathes
    // and rises a little on his breath, Aura floats and her tentacles sway (wind from the top), Vulpes breathes and every
    // `LOOK` s turns towards the centre; the swimmer swims in slow loops. A touch anywhere strums the chord (`star`), the
    // dots and the stipple flare, the centre shines and sends a ring; a touch on a being makes it hop.
    // The ground is not a picture: the card's aqua in code (read off the card by the converter); the dots and the stipple are particles, the light round the chakana a disc and a glow in code.
    // The dots of the card go on past the frame, mirrored, so on a wide screen there is no edge at all (nothing else
    // reaches the frame's sides). Drawn in WebGL (useLayerStage) from confianzaScene.json and public/assets/confianza (made
    // by scripts/convert-confianza.mjs). Reduced motion keeps it still, everything shown.
    import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { createParallax } from '../../composables/useParallax.js';
    import { createLayerStage } from '../../composables/useLayerStage.js';
    import { startStardust } from '../../composables/useStardust.js';
    import { play } from '../../composables/useSound.js';
    import { chordFor } from '../../data/cardChords.js';
    import { chordColors } from '../../data/chordColors.js';
    import art from '../../composables/confianzaScene.json';

    const props = defineProps({
        card: { type: Object, default: () => ({}) },
        active: Boolean
    });

    const root = ref(null);
    const canvas = ref(null);
    const centreHit = ref(null);
    let stageEl = null;
    let stage = null;
    let parallax = null;
    let dust = null;
    let entered = false;
    let gone = false;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ---- Layout: the illustration is a 2160 square. What must be seen is the labyrinth with the three beings at its
    // doors (REGION, art px); it is fitted between the card's name and the bottom of the screen (room for the share
    // button), as big as the width allows, and centred on it
    const SIZE = art.size;
    const B = art.boxes;
    const REGION = [250, 250, 1790, 1790];               // left, top, right, bottom
    const RX = (REGION[0] + REGION[2]) / 2, RY = (REGION[1] + REGION[3]) / 2;
    let F = { x: 0, y: 0, size: 1 };
    let W = 1, H = 1;
    const k = () => F.size / SIZE;
    const sx = (x) => F.x + x * k();
    const sy = (y) => F.y + y * k();
    const rectOf = ([left, top, w, h]) => ({ left: sx(left), top: sy(top), w: w * k(), h: h * k() });
    let title = null;                                    // the card's name, on the scene: { left, top, right, bottom }
    const layout = (w, h) => {
        W = w; H = h;
        title = titleBox(h);
        const top = title.bottom + 14;
        const bottom = h - (w < h ? 92 : 56);
        const room = Math.max(120, bottom - top);
        const size = Math.min(room / (REGION[3] - REGION[1]), 0.94 * w / (REGION[2] - REGION[0])) * SIZE;
        F = { x: w / 2 - RX * size / SIZE, y: (top + bottom) / 2 - RY * size / SIZE, size };
    };

    const SLIDE = 40;
    const SLIDE_Y = 26;
    const zFor = (amp) => amp / (SLIDE + amp);
    const DEPTH = { far: 3, near: 8, maze: 14, beings: 20 };

    const GROUND = art.ground;
    const INK = art.ink;
    const HEART = art.heart;
    const WARM = 0xffe6b0;
    const LOOK = 9;                                      // every LOOK s Vulpes turns towards the centre
    const RING = 7;                                      // a ring of light leaves the centre every RING s

    // ---- The beings: where each one's feet are (art px), how it moves
    const BEINGS = art.beings.map(({ name, box }) => ({ name, box, feet: [box[0] + box[2] / 2, box[1] + box[3]], hop: 1, phase: Math.random() * 6.28 }));
    const L = {};
    let lastT = 0;
    let flare = 0;
    const rings = [];                                    // { age } of every ring of light on its way out
    let nextRing = 3;

    const sendRing = () => {
        const free = L.rings.findIndex((_, i) => !rings.some((r) => r.i === i));
        if (free >= 0) rings.push({ i: free, age: 0 });
    };

    // A touch: the chord is strummed, the dots and the stipple flare, the centre shines and calls; a being touched hops
    const strum = (event) => {
        play('star');
        dust?.boost(0, 0.6);
        dust?.boost(1, 0.8);
        dust?.boost(2, 1);
        dust?.boost(3, 0.9);
        if (reduced || !stage) return;
        flare = 1;
        sendRing();
        if (!event || !L.beings) return;
        const area = canvas.value.getBoundingClientRect();
        const x = event.clientX - area.left, y = event.clientY - area.top;
        BEINGS.forEach((b, i) => {
            const box = L.beings[i].boxOnScreen(rectOf(b.box));
            const pad = Math.max(14, 28 - box.width / 4);
            if (x > box.left - pad && x < box.left + box.width + pad && y > box.top - pad && y < box.top + box.height + pad) b.hop = 0;
        });
    };
    const onKey = (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        strum(null);
    };

    const build = (s) => {
        // The far dots' plane (they are particles: the node is only their depth)
        L.farNode = s.depth(zFor(DEPTH.far));
        // The swimmer, among the near dots
        const near = s.depth(zFor(DEPTH.near));
        L.nearNode = near;
        L.squiggle = near.image('/assets/confianza/squiggle.webp');
        near.enter({ y: 20, delay: 600, duration: 2000 });
        // The labyrinth: the light at its centre (a glow, a disc, and its stipple among the layers as particles), the
        // corridors, the rings of light that go out from it, the walls and the chakana
        const maze = s.depth(zFor(DEPTH.maze));
        L.mazeNode = maze;
        L.heartGlow = maze.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: WARM, stops: [[0, 0.7], [0.3, 0.35], [0.62, 0]], bloom: true });
        L.heart = maze.disc({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: HEART.color });
        L.fill = maze.image('/assets/confianza/mazeFill.webp');
        // (the rings run along the corridors, under the walls)
        L.rings = [0, 1].map(() => {
            const g = maze.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: 0xfff8e8, stops: [[0.5, 0], [0.62, 0.6], [0.68, 0.28], [0.7, 0]] });
            g.opacity = 0;
            return g;
        });
        L.walls = maze.image('/assets/confianza/mazeLines.webp');
        L.chakana = maze.image('/assets/confianza/chakana.webp');
        maze.enter({ y: 30, scale: 0.96, delay: 100, duration: 1900 });
        // The three beings at the doors, a little in front
        const beings = s.depth(zFor(DEPTH.beings));
        L.beingsNode = beings;
        L.beings = BEINGS.map((b) => {
            const g = beings.group();
            g.body = g.image(`/assets/confianza/${b.name}.webp`, b.name === 'aura' ? { wind: { amp: 5, speed: 1.1, root: 'top' } } : {});
            return g;
        });
        beings.enter({ y: 50, delay: 500, duration: 1800 });
    };

    const place = (w, h) => {
        layout(w, h);
        root.value.style.background = `#${GROUND.toString(16).padStart(6, '0')}`;
        const cx = sx(HEART.x), cy = sy(HEART.y);
        L.squiggle.place(rectOf(B.squiggle));
        const r = HEART.r * k();
        L.heart.place({ left: cx - r, top: cy - r, w: 2 * r, h: 2 * r });
        const gd = r * 4.5;
        L.heartGlow.place({ left: cx - gd / 2, top: cy - gd / 2, w: gd, h: gd });
        L.fill.place(rectOf(B.mazeFill));
        L.walls.place(rectOf(B.mazeLines));
        // A ring's light sits at 0.62 of the farthest corner: at full size it reaches the labyrinth's rim
        const rd = (B.mazeLines[2] / 2) / (0.62 * Math.SQRT1_2) * k();
        L.rings.forEach((g) => g.place({ left: cx - rd / 2, top: cy - rd / 2, w: rd, h: rd }));
        L.chakana.place(rectOf(B.chakana));
        BEINGS.forEach((b, i) => {
            const g = L.beings[i];
            const feet = { x: sx(b.feet[0]), y: sy(b.feet[1]) };
            g.place({ left: 0, top: 0, w: 1, h: 1 }, feet);
            g.pivot = feet;
            g.body.place(rectOf(b.box), feet);
        });
        placeHit();
    };

    // Where the card's name is (the stage's h1, over the scene): the labyrinth keeps under it and no dot is drawn on it
    const titleBox = (h) => {
        const el = stageEl?.querySelector('h1');
        if (!el || !root.value) return { left: 0, right: 0, top: 0, bottom: 0.16 * h };
        const a = el.getBoundingClientRect(), o = root.value.getBoundingClientRect();
        // The text itself, not the full-width block
        const range = document.createRange();
        range.selectNodeContents(el);
        const t = range.getBoundingClientRect();
        const left = t.width ? t.left : a.left, right = t.width ? t.right : a.right;
        return { left: left - o.left, right: right - o.left, top: a.top - o.top, bottom: a.bottom - o.top };
    };

    // The dots of the card, mirrored tile by tile past the frame so they cover the whole screen
    const tiled = (list, colour, scale = 1) => {
        const out = [];
        const kk = k(), M = 30;
        const tx0 = Math.floor(-F.x / F.size) - 1, tx1 = Math.ceil((W - F.x) / F.size);
        const ty0 = Math.floor(-F.y / F.size) - 1, ty1 = Math.ceil((H - F.y) / F.size);
        for (let ty = ty0; ty <= ty1; ty++) {
            for (let tx = tx0; tx <= tx1; tx++) {
                list.forEach(([x, y, r]) => {
                    const ax = tx * SIZE + (tx % 2 ? SIZE - x : x), ay = ty * SIZE + (ty % 2 ? SIZE - y : y);
                    const px = F.x + ax * kk, py = F.y + ay * kk;
                    if (px < -M || px > W + M || py < -M || py > H + M) return;
                    if (title && px > title.left - 12 && px < title.right + 12 && py > title.top - 8 && py < title.bottom + 8) return;
                    out.push([px, py, Math.max(1.6, 2 * r * kk * scale), colour]);
                });
            }
        }
        return out;
    };

    const placeHit = () => {
        if (!L.mazeNode || !centreHit.value) return;
        const b = L.chakana.boxOnScreen(rectOf(B.chakana));
        const s = Math.max(56, b.width * 1.3);
        centreHit.value.style.translate = `${(b.left + b.width / 2 - s / 2).toFixed(1)}px ${(b.top + b.height / 2 - s / 2).toFixed(1)}px`;
        centreHit.value.style.width = centreHit.value.style.height = `${s.toFixed(1)}px`;
    };

    const enter = () => {
        if (entered || !props.active || !stage) return;
        entered = true;
        stage.ready().then(() => { if (!gone) { stage.start(); dust?.reveal(); } });
    };

    const ease = (p) => p * p * (3 - 2 * p);
    const turn = (t) => {
        const p = (Math.max(0, t - 4) % LOOK) / 2.6;
        return p < 1 ? Math.sin(p * Math.PI) ** 2 : 0;
    };

    let frames = 0;
    const frame = ({ x, y, scroll, t, ramp }) => {
        if (!stage || !L.mazeNode) return;
        const dt = Math.min(0.1, Math.max(0, t - lastT));
        lastT = t;
        stage.look(x * SLIDE, y * SLIDE_Y);
        const kk = k();

        // ---- The centre breathes; a touch makes it shine; now and then a ring of light goes out through the labyrinth
        flare = Math.max(0, flare - dt * 0.9);
        const breath = Math.sin(t * 0.7);
        L.heartGlow.opacity = 0.75 + 0.15 * breath * ramp + 0.25 * flare;
        L.heartGlow.scale = 1 + 0.06 * breath * ramp + 0.35 * flare;
        L.heart.scale = 1 + 0.015 * breath * ramp;
        L.chakana.scale = 1 + 0.02 * Math.sin(t * 0.7 + 0.6) * ramp + 0.08 * flare * flare;
        L.chakana.uniforms.uBright.value = 1 + 0.08 * (breath * 0.5 + 0.5) * ramp + 0.25 * flare;
        if (!reduced && t > nextRing) { nextRing = t + RING; sendRing(); }
        for (let i = rings.length - 1; i >= 0; i--) {
            const ring = rings[i];
            ring.age += dt / 4.2;
            const g = L.rings[ring.i];
            g.scale = 0.18 + 0.86 * ease(Math.min(1, ring.age));
            g.opacity = Math.sin(Math.min(1, ring.age) * Math.PI) * 0.75;
            if (ring.age >= 1) { g.opacity = 0; rings.splice(i, 1); }
        }
        L.rings.forEach((g) => { g.mesh.visible = g.opacity > 0.01; });
        stage.bloom = 0.35 * flare;

        // ---- The beings
        BEINGS.forEach((b, i) => {
            const g = L.beings[i];
            b.hop = Math.min(1, b.hop + dt / 0.7);
            const hop = b.hop < 1 ? Math.sin(b.hop * Math.PI) : 0;
            const squash = b.hop < 1 ? Math.sin(b.hop * Math.PI * 2) * (1 - b.hop) : 0;
            const lift = -hop * Math.max(10, 40 * kk);
            const br = Math.sin(t * 1.1 + b.phase) * ramp;
            if (b.name === 'particular') {
                // He breathes and, on his breath, rises a little off the ground
                g.y = lift - (Math.sin(t * 0.55 + b.phase) * 0.5 + 0.5) * 5 * kk * ramp;
                g.body.sy = 1 + 0.018 * br + 0.1 * squash;
                g.body.sx = 1 - 0.008 * br - 0.06 * squash;
            } else if (b.name === 'aura') {
                // She floats, bobbing, her tentacles in the water
                g.y = lift + Math.sin(t * 0.9 + b.phase) * 14 * kk * ramp;
                g.rotate = Math.sin(t * 0.6 + b.phase) * 3 * ramp;
                g.body.sy = 1 + 0.03 * Math.sin(t * 1.8 + b.phase) * ramp + 0.1 * squash;
                g.body.sx = 1 - 0.015 * Math.sin(t * 1.8 + b.phase) * ramp - 0.06 * squash;
            } else {
                // Vulpes breathes and now and then turns towards the centre
                g.y = lift;
                g.rotate = (reduced ? 0 : -7 * turn(t + b.phase));
                g.body.sy = 1 + 0.015 * br + 0.1 * squash;
                g.body.sx = 1 - 0.006 * br - 0.06 * squash;
            }
        });

        // ---- The swimmer swims in slow loops
        L.squiggle.x = Math.sin(t * 0.21) * 40 * kk * ramp;
        L.squiggle.y = Math.sin(t * 0.33 + 1) * 26 * kk * ramp;
        L.squiggle.rotate = Math.sin(t * 0.5) * 14 * ramp;
        L.squiggle.sx = 1 + 0.08 * Math.sin(t * 2.4) * ramp;

        // ---- Scrolling away, the nearer layers go faster
        L.farNode.y = scroll * 6;
        L.nearNode.y = scroll * 14;
        L.mazeNode.y = scroll * 20;
        L.beingsNode.y = scroll * 28;

        // The particles that belong to a layer follow it
        const farDrift = stage.drift(L.farNode.z), nearDrift = stage.drift(L.nearNode.z), mazeDrift = stage.drift(L.mazeNode.z);
        dust?.shift(0, farDrift.x, farDrift.y + L.farNode.y);
        dust?.shift(1, nearDrift.x, nearDrift.y + L.nearNode.y);
        dust?.shift(2, mazeDrift.x, mazeDrift.y + L.mazeNode.y);
        dust?.shift(3, nearDrift.x, nearDrift.y + L.nearNode.y);
        stage.render(t);
        if (frames++ % 3 === 0) placeHit();
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
        const chord = chordColors(chordFor(props.card.id ?? 18)).map((c) => parseInt(c.slice(1), 16));
        dust = startStardust(null, {
            stage,
            manual: true,
            groups: [
                // 0, 1: the card's dots, at two depths, over the whole screen
                { colors: [INK], look: 'hard', parallax: 0, drift: 2.5, twinkle: 0.12, reach: 70, push: 10, order: -1, points: () => tiled(art.far, INK, 0.95) },
                { colors: [INK], look: 'hard', parallax: 0, drift: 3.5, twinkle: 0.12, reach: 80, push: 14, order: after(L.squiggle), points: () => tiled(art.near, INK) },
                // 2: the stippled edge of the light at the centre, alive (under the corridors, as in the card)
                { colors: [HEART.color], look: 'hard', parallax: 0, drift: 1.2, jitter: 0.5, twinkle: 0.3, reach: 0, order: after(L.heart),
                    points: () => HEART.dots.map(([x, y, r]) => [sx(x), sy(y), Math.max(1.1, 2 * r * k()), HEART.color]) },
                // 3: a few motes in the colours of the chord (Am: third eye, root, solar plexus), rising slowly
                { colors: chord, look: 'soft', count: 26, size: [4, 9], flow: [0, -7], drift: 16, twinkle: 0.7, reach: 100, push: 26, edgeFade: 0.2, opacity: 0.5, parallax: 0, order: 1e6 },
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
    <div class="scene" ref="root" @click="strum">
        <canvas class="stageCanvas" ref="canvas"></canvas>
        <div ref="centreHit" class="hit" role="button" tabindex="0"
            :aria-label="$i18n.locale === 'en' ? 'The centre of the labyrinth: touch it to hear the card' : 'El centro del laberinto: tocalo para escuchar la carta'"
            @keydown="onKey"></div>
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
        border-radius: 50%;
        cursor: pointer;
        pointer-events: auto;
        -webkit-tap-highlight-color: transparent;
        outline: none;
    }

    .hit:focus-visible {
        outline: 2px solid rgba(0, 112, 154, 0.85);
        outline-offset: 2px;
    }
</style>
