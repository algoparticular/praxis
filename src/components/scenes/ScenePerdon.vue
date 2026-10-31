<script setup>
    // Perdón: "I forgive myself and others". In a quiet sage sky full of little stars, a great planet of teal and cream
    // marble turns slowly inside its outline, with a ring of dark red dust round it; above, a balloon rises with a Sama in
    // it, carrying another Sama that hangs from its string, and a third little Sama floats by in its cup; below, Particular
    // sits in a leaf boat with a kitten, drifting.
    // No game yet (its verb, Soltar, comes later: the pictures it will obviously need are kept apart: the balloon, the Sama
    // hanging from it, Particular and his eyes, the kitten). The scene is alive: the marble of the planet turns and
    // shimmers, a soft light breathes behind it, its ring of dust flows round it in slow waves (every dot a particle, the
    // part behind the planet drawn under it and the part in front over it); the stars twinkle; the balloon bobs and leans,
    // the Sama hanging from it swings a little later; the cup rocks; the leaf rocks and bobs, Particular breathes, blinks
    // and now and then looks up at the balloon, the kitten breathes and its tail sways; the little ringed planet and the
    // dark strokes of the sky float. A touch strums the card's chord (`star`), the dust and the stars flare and whatever is
    // touched answers (the balloon gives a little leap, Particular blinks and the leaf dips, the cup spins, the planet's
    // marble hurries for a moment).
    // Nothing of the background is a picture: the sky is the card's colour (worked out by the converter), the planet's
    // disc and its outline are drawn in code, the stars and the ring are particles. On a wide screen the stars go on past
    // the frame (shifted copies of the card's stars, never a mirrored twin side by side); on a phone upright the frame is as
    // wide as the ring and the leaf allow, and the spare height is shared out between the sky above and below the planet.
    // It is drawn in WebGL (useLayerStage), from perdonScene.json and public/assets/perdon (made by
    // scripts/convert-perdon.mjs). The card's rulito over Particular is not drawn: its box is kept for the game.
    import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { createParallax } from '../../composables/useParallax.js';
    import { createLayerStage } from '../../composables/useLayerStage.js';
    import { startStardust } from '../../composables/useStardust.js';
    import { play } from '../../composables/useSound.js';
    import art from '../../composables/perdonScene.json';

    const props = defineProps({
        card: { type: Object, default: () => ({}) },
        active: Boolean
    });

    const root = ref(null);
    const canvas = ref(null);
    let stageEl = null;
    let stage = null;
    let parallax = null;
    let dust = null;
    let entered = false;
    let gone = false;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ---- Layout: the illustration is a 2160x2700 portrait. Its drawing goes from the top of the balloon to the bottom
    // of the leaf (TOP..BOTTOM), and it is kept under the card's name. On a phone upright it is as wide as the ring and
    // the leaf allow (SPAN, centred on FOCUS) and the height left over is shared out: what is above the planet goes up,
    // what is below it goes down (`spread`). On a wide screen the drawing fills the height and the stars go on past it
    const [SW] = art.size;
    const B = art.boxes;
    const TOP = 170, BOTTOM = 2350;
    const SPAN = 1900, FOCUS = 1110;
    let F = { x: 0, y: 0, size: 1 };
    let spread = 0;
    const k = () => F.size / SW;
    const sx = (x) => F.x + x * k();
    const sy = (y) => F.y + y * k();
    const rectOf = ([left, top, w, h], dy = 0) => ({ left: sx(left), top: sy(top) + dy, w: w * k(), h: h * k() });
    const layout = (w, h) => {
        const phone = w < h;
        const top = titleBottom(h) + 10, bottom = h - 16;
        const room = Math.max(1, bottom - top);
        let size = room / (BOTTOM - TOP) * SW;
        if (phone) size = Math.min(size, w * SW / SPAN);
        else size = Math.min(size, w * 0.95);
        const kk = size / SW;
        const x = phone ? w / 2 - FOCUS * kk : w / 2 - 1060 * kk;
        const spare = Math.max(0, room - (BOTTOM - TOP) * kk);
        spread = phone ? Math.min(spare * 0.3, 0.35 * SW * kk) : 0;
        F = { x, y: top + spare / 2 - TOP * kk, size };
    };

    // Where the card's name ends (the stage's h1, over the scene), so the balloon keeps under it
    const titleBottom = (h) => {
        const title = stageEl?.querySelector('h1');
        if (!title || !root.value) return 0.15 * h;
        return title.getBoundingClientRect().bottom - root.value.getBoundingClientRect().top;
    };

    const SLIDE = 50;
    const SLIDE_Y = 30;
    const zFor = (amp) => amp / (SLIDE + amp);
    const DEPTH = { far: 4, near: 8, doodles: 11, back: 15, planet: 17, front: 19, cup: 20, balloon: 23, leaf: 30 };

    const P = art.planet;
    const E = art.ring.ellipse;
    const DUST = P.line.color;
    const CREAM = 0xf7f8f1;
    const hexCss = (c) => `#${c.toString(16).padStart(6, '0')}`;
    const centreOf = ([x, y, w, h]) => [x + w / 2, y + h / 2];

    // ---- The doodles of the sky (the little ringed planet and the dark strokes), from one atlas; those above the planet
    // go up with the balloon on a phone, those below it go down with the leaf
    const [AW, AH] = art.atlas;
    const doodles = art.doodles.map(({ name, at: [x, y, w, h, ax, ay] }, i) => ({
        name, box: [x, y, w, h], crop: [ax / AW, ay / AH, w / AW, h / AH], upper: y < P.y, phase: i * 1.7 + 0.4,
    }));

    // ---- The ring of dust: every dot on the ellipse it lies on, as an angle and how far out it is, so it can flow round
    const tilt = E.tilt * Math.PI / 180;
    const ct = Math.cos(tilt), st = Math.sin(tilt);
    const onRing = (flat) => Array.from({ length: flat.length / 3 }, (_, i) => {
        const [x, y, r] = [flat[i * 3], flat[i * 3 + 1], flat[i * 3 + 2] / 2];
        const u = (x - E.x) * ct + (y - E.y) * st, v = -(x - E.x) * st + (y - E.y) * ct;
        return { a: Math.atan2(v / E.b, u / E.a), out: Math.hypot(u / E.a, v / E.b), r, phase: Math.random() * 0.8, x, y };
    });
    const ring = { back: onRing(art.ring.back), front: onRing(art.ring.front) };
    // A point of the stage is drawn a little smaller than its size, with a soft edge: so the dots look as big as drawn
    const DOT = 1.28;
    const FLOW = 0.03;                      // how far the waves carry a dot along the ring (radians)
    let flowT = 0;
    let rampNow = 0;
    const ringGroup = (dots) => ({
        count: dots.length,
        update(t, data) {
            const kk = k();
            for (let i = 0; i < dots.length; i++) {
                const d = dots[i];
                const a = d.a + FLOW * rampNow * Math.sin(flowT * 0.45 - 2 * d.a + d.phase);
                const u = Math.cos(a) * d.out * E.a, v = Math.sin(a) * d.out * E.b;
                data.positions[i * 3] = F.x + (E.x + u * ct - v * st) * kk;
                data.positions[i * 3 + 1] = F.y + (E.y + u * st + v * ct) * kk;
                data.sizes[i] = Math.max(1.2, 2 * d.r * kk * DOT);
                data.alphas[i] = 1;
            }
        },
    });

    // ---- The stars: the card's, and past the frame shifted copies of them (every other one mirrored and moved down by
    // a different part of the height, so no star has a twin beside it)
    const starsFor = (near) => (w, h) => {
        const kk = k(), [AWd, AHd] = art.size;
        const list = [];
        const tw = AWd * kk, th = AHd * kk;
        const nx = Math.ceil((F.x + 60) / tw), mx = Math.ceil((w - F.x - tw + 60) / tw);
        const ny = Math.ceil((F.y + 60) / th), my = Math.ceil((h - F.y - th + 60) / th);
        for (let tx = -nx; tx <= mx; tx++) {
            for (let ty = -ny; ty <= my; ty++) {
                const mirror = tx % 2 !== 0;
                const down = (tx * 0.41 + ty * 0.29) * AHd;
                art.dots.forEach(([x, y, r, c]) => {
                    if ((r >= 4) !== near) return;
                    const ax = mirror ? AWd - x : x;
                    const ay = tx || ty ? ((y + down) % AHd + AHd) % AHd : y;
                    const px = F.x + (tx * AWd + ax) * kk, py = F.y + (ty * AHd + ay) * kk;
                    if (px < -60 || px > w + 60 || py < -60 || py > h + 60) return;
                    list.push([px, py, Math.max(1.2, 2 * r * kk * DOT), art.colors[c]]);
                });
            }
        }
        return list;
    };

    // ---- A touch: the chord, a flare, and whatever is touched answers
    const kick = { balloon: 0, leaf: 0, cup: 0, marble: 0, tiny: 0 };
    let blinkAt = 2.5;
    let blinkNow = -1;
    let lastT = 0;
    let turned = 0;
    const L = {};
    const TOUCH = {
        balloon: [1350, 420], cup: [812, 642], leaf: [560, 2120], marble: [P.x, P.y], tiny: centreOf(art.doodles[0].at.slice(0, 4)),
    };
    const strum = (event) => {
        if (!stage || !L.leaf) return;
        play('star');
        dust?.boost(0, 0.7);
        dust?.boost(1, 0.9);
        dust?.boost(2, 0.8);
        dust?.boost(3, 0.8);
        if (reduced) return;
        const area = canvas.value.getBoundingClientRect();
        const at = { x: event.clientX - area.left, y: event.clientY - area.top };
        const nodes = { balloon: L.balloon, cup: L.cup, leaf: L.leafGroup, marble: L.marble, tiny: L.tiny };
        let best = null, near = Infinity;
        Object.entries(TOUCH).forEach(([name, [x, y]]) => {
            const node = nodes[name];
            const dy = name === 'leaf' ? spread : name === 'marble' ? 0 : -spread;
            const p = node.toScreen(sx(x), sy(y) + dy);
            const reach = name === 'marble' ? P.r * k() * 1.1 : Math.max(48, 260 * k());
            const d = Math.hypot(p.x - at.x, p.y - at.y);
            if (d < reach && d < near) { near = d; best = name; }
        });
        if (best) kick[best] = 1;
        if (best === 'leaf') blinkNow = lastT;
    };

    const build = (s) => {
        // Far stars, then the doodles, then the ring behind the planet, the planet, the ring in front of it
        L.far = s.depth(zFor(DEPTH.far));
        L.near = s.depth(zFor(DEPTH.near));
        const sky = s.depth(zFor(DEPTH.doodles));
        L.doodles = doodles.map((d) => {
            const node = sky.image('/assets/perdon/doodles.webp', { crop: d.crop });
            if (d.name === 'tiny') L.tiny = node;
            return node;
        });
        sky.enter({ y: -20, delay: 300, duration: 2000 });
        const planet = s.depth(zFor(DEPTH.planet));
        L.planetNode = planet;
        L.halo = planet.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: CREAM, stops: [[0, 0.5], [0.42, 0.2], [0.72, 0]] });
        L.disc = planet.disc({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: P.color });
        L.marble = planet.image('/assets/perdon/marble.webp', { shimmer: 0.25 });
        // The outline: a ring drawn once on a canvas
        const ringCanvas = document.createElement('canvas');
        ringCanvas.width = ringCanvas.height = 1024;
        const g = ringCanvas.getContext('2d');
        const outer = P.line.r + P.line.width;
        g.strokeStyle = hexCss(P.line.color);
        g.lineWidth = P.line.width / (2 * outer) * 1024;
        g.beginPath();
        g.arc(512, 512, P.line.r / outer * 512, 0, Math.PI * 2);
        g.stroke();
        L.line = planet.canvas(ringCanvas);
        L.line.refresh();
        planet.enter({ y: 30, scale: 0.94, delay: 100, duration: 2000 });
        L.backNode = s.depth(zFor(DEPTH.back));
        L.frontNode = s.depth(zFor(DEPTH.front));
        // The little Sama in its cup, the balloon (the Sama hanging from it behind it)
        const cup = s.depth(zFor(DEPTH.cup));
        L.cupNode = cup;
        L.cup = cup.image('/assets/perdon/cup.webp');
        cup.enter({ y: -30, delay: 500, duration: 2000 });
        const balloon = s.depth(zFor(DEPTH.balloon));
        L.balloonNode = balloon;
        L.balloon = balloon.group();
        L.hanger = L.balloon.image('/assets/perdon/hanger.webp');
        L.body = L.balloon.image('/assets/perdon/balloon.webp');
        balloon.enter({ y: 60, delay: 350, duration: 2400 });
        // The leaf: Particular (his eyes on their own) and the kitten sit in it, under its rim
        const leaf = s.depth(zFor(DEPTH.leaf));
        L.leafNode = leaf;
        L.leafGroup = leaf.group();
        L.particular = L.leafGroup.group();
        L.sid = L.particular.image('/assets/perdon/particular.webp');
        L.eyes = L.particular.image('/assets/perdon/eyes.webp');
        L.kitten = L.leafGroup.image('/assets/perdon/kitten.webp', { sway: true });
        L.leaf = L.leafGroup.image('/assets/perdon/leaf.webp');
        leaf.enter({ y: 70, delay: 200, duration: 2000 });
    };

    const place = (w, h) => {
        layout(w, h);
        const stops = art.sky.map(([y, c]) => `${hexCss(c)} ${(sy(y) / h * 100).toFixed(1)}%`);
        root.value.style.background = `linear-gradient(to bottom, ${hexCss(art.sky[0][1])}, ${stops.join(', ')}, ${hexCss(art.sky[art.sky.length - 1][1])})`;

        const up = -spread, down = spread;
        doodles.forEach((d, i) => L.doodles[i].place(rectOf(d.box, d.upper ? up : down)));

        const pr = P.r * k();
        L.disc.place({ left: sx(P.x) - pr, top: sy(P.y) - pr, w: 2 * pr, h: 2 * pr });
        const hr = pr * 2.5;
        L.halo.place({ left: sx(P.x) - hr / 2, top: sy(P.y) - hr / 2, w: hr, h: hr });
        L.marble.place(rectOf(B.marble), { x: sx(P.x), y: sy(P.y) });
        const lr = (P.line.r + P.line.width) * k();
        L.line.place({ left: sx(P.x) - lr, top: sy(P.y) - lr, w: 2 * lr, h: 2 * lr });

        const cup = rectOf(B.cup, up);
        L.cup.place(cup, { x: cup.left + cup.w / 2, y: cup.top + cup.h * 0.8 });
        const [kx, ky] = art.knot;
        const knot = { x: sx(kx), y: sy(ky) + up };
        L.balloon.pivot = knot;
        L.body.place(rectOf(B.balloon, up), knot);
        L.hanger.place(rectOf(B.hanger, up), knot);

        const leaf = rectOf(B.leaf, down);
        L.leafGroup.pivot = { x: leaf.left + leaf.w * 0.45, y: leaf.top + leaf.h * 0.8 };
        L.leaf.place(leaf);
        const body = rectOf(B.particular, down);
        L.particular.pivot = { x: body.left + body.w / 2, y: body.top + body.h };
        L.sid.place(body, L.particular.pivot);
        const eyes = rectOf(B.eyes, down);
        L.eyes.place(eyes);
        const kit = rectOf(B.kitten, down);
        L.kitten.place(kit, { x: kit.left + kit.w / 2, y: kit.top + kit.h });
    };

    const enter = () => {
        if (entered || !props.active || !stage) return;
        entered = true;
        stage.ready().then(() => { if (!gone) { stage.start(); dust?.reveal(); } });
    };

    const frame = ({ x, y, scroll, t, ramp }) => {
        if (!stage || !L.leaf) return;
        const dt = Math.min(0.1, Math.max(0, t - lastT));
        lastT = t;
        rampNow = ramp;
        stage.look(x * SLIDE, y * SLIDE_Y);
        Object.keys(kick).forEach((name) => { kick[name] = Math.max(0, kick[name] - dt * 0.7); });
        const kk = k();

        // ---- The planet: its marble turns slowly (faster for a moment when touched), a light breathes behind it
        flowT += dt * (1 + 2.5 * kick.marble);
        if (!reduced) turned += dt * (1.1 + 30 * kick.marble);
        L.marble.rotate = -turned;
        const breath = Math.sin(t * 0.5);
        L.halo.opacity = (0.55 + 0.25 * breath * ramp) + 0.3 * kick.marble;
        L.halo.scale = 1 + 0.05 * breath * ramp;
        L.planetNode.y = scroll * 18;

        // ---- The doodles float; the little ringed planet rocks
        doodles.forEach((d, i) => {
            const node = L.doodles[i];
            node.y = Math.sin(t * 0.4 + d.phase) * 10 * kk * 3 * ramp;
            node.x = Math.sin(t * 0.23 + d.phase * 2) * 6 * kk * 3 * ramp;
            node.rotate = Math.sin(t * 0.3 + d.phase) * (d.name === 'tiny' ? 9 : 5) * ramp + (d.name === 'tiny' ? 360 * (1 - (1 - kick.tiny) ** 2) : 0);
        });

        // ---- The balloon bobs and leans about its knot; the Sama hanging from it swings a little later
        const lift = Math.sin(t * 0.55) * 14 * kk * ramp - 60 * kk * Math.sin(kick.balloon * Math.PI);
        L.balloon.y = lift;
        L.balloon.rotate = Math.sin(t * 0.42) * 2.4 * ramp + Math.sin(kick.balloon * 9) * 3 * kick.balloon;
        L.body.rotate = Math.sin(t * 0.42 + 0.6) * 1.2 * ramp;
        L.body.sx = 1 + 0.012 * Math.sin(t * 0.9) * ramp;
        L.body.sy = 1 - 0.01 * Math.sin(t * 0.9) * ramp;
        L.hanger.rotate = -Math.sin(t * 0.42 - 0.9) * 5 * ramp - Math.sin(kick.balloon * 7) * 7 * kick.balloon;
        L.balloonNode.y = scroll * 24;

        // ---- The cup rocks and bobs (and spins round once when touched)
        L.cup.rotate = Math.sin(t * 0.7 + 1) * 6 * ramp + 360 * (1 - (1 - kick.cup) ** 2);
        L.cup.y = Math.sin(t * 0.5 + 2) * 10 * kk * ramp;
        L.cupNode.y = scroll * 20;

        // ---- The leaf rocks and bobs; Particular breathes, blinks and now and then looks up at the balloon; the kitten
        // breathes and its tail sways
        L.leafGroup.rotate = Math.sin(t * 0.5) * 1.6 * ramp + Math.sin(kick.leaf * 8) * 2.5 * kick.leaf;
        L.leafGroup.y = Math.sin(t * 0.37) * 12 * kk * ramp + 26 * kk * Math.sin(kick.leaf * Math.PI);
        L.particular.sy = 1 + 0.018 * Math.sin(t * 1.05) * ramp;
        L.particular.sx = 1 - 0.006 * Math.sin(t * 1.05) * ramp;
        if (!reduced && t > blinkAt) { blinkNow = t; blinkAt = t + 3 + Math.random() * 4; }
        const b = blinkNow >= 0 ? (t - blinkNow) / 0.16 : 2;
        L.eyes.sy = b < 1 ? 0.15 + 0.85 * Math.abs(1 - 2 * b) : 1;
        const look = reduced ? 0 : Math.max(0, Math.sin(t * 2 * Math.PI / 14) ** 9);       // a look up, every 14 s
        L.eyes.x = look * 7 * kk;
        L.eyes.y = -look * 5 * kk;
        L.particular.rotate = look * 2 * ramp;
        L.kitten.sy = 1 + 0.02 * Math.sin(t * 1.6 + 1) * ramp;
        L.kitten.sways = [[0.12, 0.72, 0.2, Math.sin(t * 0.9) * 10 * ramp, 1]];
        L.leafNode.y = scroll * 30;

        // The particles follow their layers
        const drift = (node, extra = 0) => { const d = stage.drift(node.z); return [d.x, d.y + extra]; };
        dust?.shift(0, ...drift(L.far, scroll * 6));
        dust?.shift(1, ...drift(L.near, scroll * 10));
        dust?.shift(2, ...drift(L.backNode, scroll * 18));
        dust?.shift(3, ...drift(L.frontNode, scroll * 18));
        stage.render(t);
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
        dust = startStardust(null, {
            stage,
            manual: true,
            groups: [
                // 0, 1: the stars, far and small, and nearer and bigger
                { colors: art.colors, look: 'hard', parallax: 0, drift: 1.5, jitter: 0, twinkle: 0.35, reach: 0, order: 0.5, points: starsFor(false) },
                { colors: art.colors, look: 'hard', parallax: 0, drift: 2.5, jitter: 0, twinkle: 0.25, reach: 0, order: 0.6, points: starsFor(true) },
                // 2, 3: the ring of dust, behind the planet and in front of it, flowing round it
                { colors: [DUST], look: 'hard', dynamic: ringGroup(ring.back), parallax: 0, drift: 1.2, jitter: 0.35, twinkle: 0, reach: 0, order: after(L.halo) },
                { colors: [DUST], look: 'hard', dynamic: ringGroup(ring.front), parallax: 0, drift: 1.2, jitter: 0.35, twinkle: 0, reach: 0, order: after(L.line) },
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
    </div>
</template>

<style scoped>
    .scene {
        position: absolute;
        inset: 0;
        overflow: hidden;
        background: #c0c0a4;
    }

    .stageCanvas {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        display: block;
        pointer-events: none;
    }
</style>
