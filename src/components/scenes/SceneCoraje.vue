<script setup>
    // Coraje: "I recognise my bravery and my inner strength guides my steps". At night Kätus, a little being of fire,
    // sits at the very edge of a grassy cliff of blue crystals, wrapped in his own light, facing a great pale moon with an
    // open mouth, half in the shadow of its stipple; behind him on the grass, a cairn of blue stones and three little pink
    // mushrooms glowing; round them a quiet sky of warm stars and one little spiral galaxy.
    // There is no game yet (its verb is Encender: Kätus rubs up his courage at the edge and throws himself towards the
    // moon). Until then the scene is only alive: Kätus breathes and his light flickers as a flame does, he blinks now and
    // then and every LOOK s he leans out a little to look up at the moon; his tail stirs on the grass; the mushrooms'
    // light breathes; a sheen crosses the crystals of the cliff now and then; the stars twinkle and a silent shooting star
    // crosses the sky now and then; the galaxy turns slowly; the stipple of the moon trembles and a finger stirs it. A
    // touch anywhere strums the card's chord (`star`) and the stars flare; a touch on Kätus makes his light leap up (he
    // stands a little taller, his light flares).
    // The sky is not a picture: the card's navy (read by the converter where no layer covers the card), a little deeper
    // towards the top of the screen. Nor is the moon's body: a disc in code, with its rim, the lip of its mouth, its
    // outline and its craters as one picture over it, and its stipple, the stars, Kätus's light and the mushrooms' glow
    // are particles (the mushrooms' caps are pink only with their glow, a light in code). It is drawn in WebGL
    // (useLayerStage): the stars, the moon and the cliff (rock, crystals, grass and stones, line work, Kätus) are planes at
    // their depths. The cliff goes off the right of the card, so the frame rests on the bottom right corner of the screen
    // and the rest is sky: nothing is mirrored. From corajeScene.json and public/assets/coraje (made by
    // scripts/convert-coraje.mjs). The touch target of Kätus is a DOM element over him.
    import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { floorFor } from '../../data/stageFloor.js';
    import { createParallax } from '../../composables/useParallax.js';
    import { createLayerStage } from '../../composables/useLayerStage.js';
    import { startStardust } from '../../composables/useStardust.js';
    import { play } from '../../composables/useSound.js';
    import art from '../../composables/corajeScene.json';

    const props = defineProps({
        card: { type: Object, default: () => ({}) },
        active: Boolean
    });

    const root = ref(null);
    const canvas = ref(null);
    const katusHit = ref(null);
    let stageEl = null;
    let stage = null;
    let parallax = null;
    let dust = null;
    let entered = false;
    let gone = false;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ASSETS = '/assets/coraje/';

    // ---- Layout: the illustration is a 2160 square resting on the bottom right corner of the screen (the cliff goes off
    // the card on the right and at the bottom, so a little of it goes under those edges). On a phone upright it is as big
    // as the moon and the cliff allow across; on a wide screen as big as keeps the moon under the card's name
    const SIZE = art.size;
    const B = art.boxes;
    const MOON = art.moon;
    let F = { x: 0, y: 0, size: 1 };
    const k = () => F.size / SIZE;
    const sx = (x) => F.x + x * k();
    const sy = (y) => F.y + y * k();
    const rectOf = ([left, top, w, h]) => ({ left: sx(left), top: sy(top), w: w * k(), h: h * k() });
    const SPAN = 1960;                      // art px across that must be seen on a phone (the moon to the right edge)
    const OVER = 0.025;                     // how much of the frame goes past the right edge (parallax never shows its end)
    const DROP = 0.07;                      // and under the bottom of a wide screen
    const MOON_TOP = B.moon[1];             // the top of the lip of the moon's mouth
    const frameFor = (w, h, size, phone) => ({ x: w - size * (1 - OVER), y: h - floorFor(w, h) - size + (phone ? 0.02 : DROP) * size, size });
    // On a wide screen, the biggest frame (up to MAX_H of the height) whose moon keeps clear of the card's name (and of the
    // top of the screen): the moon is a circle with its lip on top, kept GAP px from the name's box
    const MAX_H = 1.3, GAP = 18;
    const LIP = [MOON.x - 395, B.moon[1], 290, 170];      // the lip of its mouth, over the circle (art px)
    const clearOf = (f, title) => {
        const kk = f.size / SIZE;
        const cx = f.x + MOON.x * kk, cy = f.y + MOON.y * kk, r = (MOON.r + 14) * kk;
        if (f.y + MOON_TOP * kk < 8) return false;
        const nx = Math.max(title.left - GAP, Math.min(cx, title.right + GAP)), ny = Math.min(cy, title.bottom + GAP);
        const lip = { left: f.x + LIP[0] * kk, right: f.x + (LIP[0] + LIP[2]) * kk, top: f.y + LIP[1] * kk };
        const lipClear = lip.top > title.bottom + GAP || lip.right < title.left - GAP || lip.left > title.right + GAP;
        return Math.hypot(cx - nx, cy - ny) > r && lipClear;
    };
    const layout = (w, h, title) => {
        const phone = w < h;
        if (phone) {
            F = frameFor(w, h, Math.min(0.8 * h, w * SIZE / SPAN / (1 - OVER)), true);
            return;
        }
        let size = Math.min(MAX_H * h, 0.95 * w);
        while (size > 0.5 * h && !clearOf(frameFor(w, h, size, false), title)) size *= 0.98;
        F = frameFor(w, h, size, false);
    };

    // ---- Depth: px each plane slides at the edge of a swipe
    const SLIDE = 40;
    const SLIDE_Y = 24;
    const zFor = (amp) => amp / (SLIDE + amp);
    const DEPTH = { stars: 3, moon: 8, land: 22 };

    const SKY = art.sky;
    const PALE = 0xcee8e5;                  // the card's colorAlt, the moon's light
    const AURA = art.auraColor, PINK = art.pink;
    const INK = 0x1d1b16;                   // the ink of the moon's stipple
    const ease = (p) => p * p * (3 - 2 * p);
    const mix = (a, b, u) => [16, 8, 0].map((s) => Math.round(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * u));

    // ---- Kätus: his feet (the pivot he breathes and leans about), his tail's root
    const FEET = { x: B.katus[0] + B.katus[2] * 0.52, y: B.katus[1] + B.katus[3] - 6 };
    const TAIL_ROOT = { x: B.tail[0] + 8, y: B.tail[1] + B.tail[3] * 0.62 };
    const LOOK = 11, GAZE = 3.4;            // every LOOK s he leans to look up at the moon, for GAZE s
    let blinkAt = 2.5;
    let leapAt = -10;                       // a touch on him: his light leaps up
    const LEAP = 1.6;

    let time = 0;
    const L = {};

    const build = (s) => {
        // The galaxy among the stars
        const far = s.depth(zFor(DEPTH.stars));
        L.far = far;
        L.galaxy = far.image(ASSETS + 'galaxy.webp');
        far.enter({ y: 10, delay: 0, duration: 1600 });
        // The moon: its light, its body (a disc), its stipple (particles, drawn between) and its rim and lines
        const moon = s.depth(zFor(DEPTH.moon));
        L.moonNode = moon;
        L.halo = moon.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: PALE, stops: [[0.3, 0.1], [0.42, 0.04], [0.62, 0]] });
        L.disc = moon.disc({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: MOON.color });
        L.moon = moon.image(ASSETS + 'moon.webp');
        moon.enter({ y: 24, delay: 150, duration: 1800 });
        // The cliff: the rock, the light of its crystals, the grass and the stones, the mushrooms' glow (their caps), the
        // line work, and Kätus with his light
        const land = s.depth(zFor(DEPTH.land));
        L.land = land;
        L.rock = land.image(ASSETS + 'rock.webp');
        L.crystals = land.image(ASSETS + 'crystals.webp', { sheen: 0.8 });
        L.grass = land.image(ASSETS + 'grass.webp');
        L.caps = art.mushrooms.map(() => land.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: PINK, stops: [[0, 1], [0.3, 0.9], [0.48, 0.35], [0.7, 0]] }));
        L.lines = land.image(ASSETS + 'lines.webp');
        L.katus = land.group();
        L.warmth = L.katus.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: AURA, stops: [[0, 0.75], [0.34, 0.5], [0.66, 0]] });
        L.tail = L.katus.image(ASSETS + 'tail.webp');
        L.body = L.katus.image(ASSETS + 'katus.webp');
        L.eye = L.katus.image(ASSETS + 'eye.webp');
        land.enter({ y: 50, delay: 300, duration: 1900 });
    };

    // The sky, from the card: its navy, a little deeper towards the top of the screen
    const paintSky = () => {
        const rgb = (c) => `rgb(${c.join(', ')})`;
        const sky = mix(SKY, SKY, 0);
        root.value.style.background = `linear-gradient(to bottom, ${rgb(mix(SKY, 0x0b1a2c, 0.38))} 0%, ${rgb(sky)} 55%, ${rgb(sky)} 100%)`;
    };

    const place = (w, h) => {
        layout(w, h, titleRect(h));
        paintSky();
        const g = rectOf(B.galaxy);
        L.galaxy.place(g, { x: g.left + g.w / 2, y: g.top + g.h / 2 });
        const r = MOON.r * k(), cx = sx(MOON.x), cy = sy(MOON.y);
        L.disc.place({ left: cx - r, top: cy - r, w: 2 * r, h: 2 * r });
        const hr = r * 2.2;
        L.halo.place({ left: cx - hr, top: cy - hr, w: 2 * hr, h: 2 * hr }, { x: cx, y: cy });
        L.moon.place(rectOf(B.moon));
        L.rock.place(rectOf(B.rock));
        L.crystals.place(rectOf(B.crystals));
        L.grass.place(rectOf(B.grass));
        art.mushrooms.forEach(([x, y, mr], i) => {
            const d = mr * 2.3 * k();
            L.caps[i].place({ left: sx(x) - d / 2, top: sy(y) - d / 2, w: d, h: d }, { x: sx(x), y: sy(y) });
        });
        L.lines.place(rectOf(B.lines));
        L.katus.pivot = { x: sx(FEET.x), y: sy(FEET.y) };
        const ww = B.katus[2] * 2.1 * k(), wh = B.katus[3] * 1.45 * k();
        L.warmth.place({ left: sx(FEET.x) - ww / 2, top: sy(B.katus[1] + B.katus[3] * 0.5) - wh / 2, w: ww, h: wh }, { x: sx(FEET.x), y: sy(FEET.y) });
        L.tail.place(rectOf(B.tail), { x: sx(TAIL_ROOT.x), y: sy(TAIL_ROOT.y) });
        L.body.place(rectOf(B.katus), { x: sx(FEET.x), y: sy(FEET.y) });
        const e = rectOf(B.eye);
        L.eye.place(e, { x: e.left + e.w / 2, y: e.top + e.h / 2 });
    };

    // Where the card's name is (the stage's h1, over the scene), so the moon keeps under it
    const titleRect = (h) => {
        const title = stageEl?.querySelector('h1');
        if (!title || !root.value) return { left: 0, right: 0, bottom: 0.16 * h };
        const r = title.getBoundingClientRect(), area = root.value.getBoundingClientRect();
        return { left: r.left - area.left, right: r.right - area.left, bottom: r.bottom - area.top };
    };

    // The touch target: Kätus
    const placeHit = () => {
        if (!L.katus || !katusHit.value) return;
        const b = L.katus.boxOnScreen(rectOf([B.katus[0] - 30, B.katus[1] - 20, B.katus[2] + 60, B.katus[3] + 30]));
        const bw = Math.max(56, b.width), bh = Math.max(64, b.height);
        katusHit.value.style.translate = `${(b.left + b.width / 2 - bw / 2).toFixed(1)}px ${(b.top + b.height / 2 - bh / 2).toFixed(1)}px`;
        katusHit.value.style.width = `${bw.toFixed(1)}px`;
        katusHit.value.style.height = `${bh.toFixed(1)}px`;
    };

    // A touch anywhere: the chord strummed, the stars flare
    const strum = () => {
        play('star');
        if (reduced) return;
        dust?.boost(1, 0.9);
        dust?.boost(0, 0.5);
    };
    // A touch on Kätus: his light leaps up
    const kindle = () => {
        play('star');
        if (reduced) return;
        if (time - leapAt > LEAP * 0.6) leapAt = time;
        dust?.boost(3, 1);
    };
    const onKey = (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        kindle();
    };

    // Shooting stars, silent: now and then one crosses the sky over the moon and is gone, with a tail of dots
    const TAIL = 22;
    const shooter = { at: 6, x: 0, y: 0, dx: 0, dy: 0, T: 1 };
    const shooting = {
        count: TAIL,
        update(t, data) {
            if (!stage) return;
            const w = stage.width, h = stage.height, f = shooter;
            if (t > f.at + f.T) {
                const side = Math.random() < 0.5 ? -1 : 1, speed = (0.32 + Math.random() * 0.25) * Math.max(w, h);
                f.at = t + 6 + Math.random() * 10;
                f.T = 0.7 + Math.random() * 0.5;
                f.x = w * (0.15 + Math.random() * 0.7);
                f.y = Math.max(titleRect(h).bottom, h * 0.05) + Math.random() * h * 0.22;
                f.dx = side * speed;
                f.dy = speed * (0.3 + Math.random() * 0.3);
            }
            const u = (t - f.at) / f.T;
            for (let j = 0; j < TAIL; j++) {
                if (u < 0 || u > 1) { data.alphas[j] = 0; continue; }
                const life = Math.max(0, u - j * 0.006);
                data.positions[j * 3] = f.x + f.dx * life * f.T;
                data.positions[j * 3 + 1] = f.y + f.dy * life * f.T;
                data.sizes[j] = j ? Math.max(2, 6.5 - j * 0.22) : 10;
                data.alphas[j] = Math.min(1, Math.sin(u * Math.PI) * 1.4) * (1 - j / TAIL) ** 0.7;
                const c = j < 3 ? 0xfff6e6 : 0xf6d48a;
                data.tints[j * 3] = (c >> 16 & 255) / 255;
                data.tints[j * 3 + 1] = (c >> 8 & 255) / 255;
                data.tints[j * 3 + 2] = (c & 255) / 255;
            }
        },
    };

    // The card's stars over the whole screen: in the frame where the card has them, and round it the same field again,
    // mirrored, wherever the screen goes on past the frame (off the frame only)
    const starPoints = (w, h) => {
        const out = [];
        const S = F.size;
        for (let i = -Math.ceil(F.x / S) - 1; i <= 1; i++) {
            for (let j = -Math.ceil(F.y / S) - 1; j <= 0; j++) {
                for (const [x, y, r, c] of art.stars) {
                    const ax = i % 2 ? SIZE - x : x, ay = j % 2 ? SIZE - y : y;
                    const px = F.x + i * S + ax * k(), py = F.y + j * S + ay * k();
                    if ((i || j) && px > F.x && py > F.y) continue;
                    if (px < -20 || px > w + 20 || py < -20 || py > h + 20) continue;
                    out.push([px, py, Math.max(1.8, 2 * r * k() * 1.1), c]);
                }
            }
        }
        return out;
    };

    const enter = () => {
        if (entered || !props.active || !stage) return;
        entered = true;
        stage.ready().then(() => { if (!gone) { stage.start(); dust?.reveal(); } });
    };

    let frames = 0;
    const frame = ({ x, y, scroll, t, ramp }) => {
        if (!stage || !L.katus) return;
        time = t;
        stage.look(x * SLIDE, y * SLIDE_Y);

        // ---- The sky: the galaxy turns, the moon's light breathes
        L.galaxy.rotate = -t * 4 * ramp;
        L.halo.opacity = 0.85 + 0.15 * Math.sin(t * 0.4) * ramp;
        L.far.y = scroll * 6;
        L.moonNode.y = scroll * 12;
        L.land.y = scroll * 30;

        // ---- The mushrooms' light breathes, each at its own pace
        L.caps.forEach((cap, i) => {
            const b = Math.sin(t * (0.9 + 0.23 * i) + i * 2) * 0.5 + 0.5;
            cap.opacity = 0.8 + 0.2 * b * ramp;
            cap.scale = 1 + 0.08 * b * ramp;
        });

        // ---- Kätus: he breathes, his light flickers as a flame, he blinks, and now and then looks up at the moon
        const leap = reduced ? 0 : Math.max(0, 1 - (t - leapAt) / LEAP);
        const up = leap > 0 ? Math.sin((1 - leap) * Math.PI) : 0;
        const p = (Math.max(0, t - 4) % LOOK) / GAZE;
        const gaze = p < 1 ? ease(Math.min(1, p * 3)) * ease(Math.min(1, (1 - p) * 3)) : 0;
        const breath = Math.sin(t * 1.1);
        L.body.sy = 1 + (0.018 * breath + 0.06 * up) * ramp;
        L.body.sx = 1 - (0.008 * breath + 0.02 * up) * ramp;
        L.katus.rotate = -3.5 * gaze * ramp;
        L.katus.x = -4 * k() * gaze * ramp;
        // The eye goes with the head (the top of him, as he stretches) and blinks
        if (t > blinkAt + 0.16) blinkAt = t + 2.5 + Math.random() * 4.5;
        const blink = t > blinkAt && t < blinkAt + 0.16 ? Math.sin((t - blinkAt) / 0.16 * Math.PI) : 0;
        L.eye.sy = 1 - 0.85 * blink * ramp;
        L.eye.y = -(L.body.sy - 1) * (FEET.y - (B.eye[1] + B.eye[3] / 2)) * k();
        L.eye.x = -1.5 * k() * gaze * ramp;
        const flicker = (Math.sin(t * 7.3) * 0.5 + Math.sin(t * 11.1 + 1) * 0.3 + Math.sin(t * 3.1) * 0.2);
        L.warmth.opacity = 0.8 + 0.12 * flicker * ramp + 0.4 * up;
        L.warmth.scale = 1 + (0.03 * flicker + 0.18 * up) * ramp;
        L.warmth.sy = 1 + 0.12 * up;
        L.body.uniforms.uBright.value = 1 + 0.08 * up;
        dust?.fade(3, Math.min(1, 0.85 + 0.1 * flicker + 0.3 * up));
        // His tail stirs on the grass
        L.tail.rotate = (2.2 * Math.sin(t * 0.7) + 1.2 * Math.sin(t * 1.9 + 1)) * ramp;

        // The particles that belong to a layer follow it
        const far = stage.drift(L.far.z), moon = stage.drift(L.moonNode.z), land = stage.drift(L.land.z);
        dust?.shift(0, far.x * 0.6, far.y * 0.6 + L.far.y);
        dust?.shift(1, far.x, far.y + L.far.y);
        dust?.shift(2, moon.x, moon.y + L.moonNode.y);
        // Kätus's light goes with him as he leans
        const kx = land.x + L.katus.x, ky = land.y + L.land.y;
        dust?.turn(3, L.katus.rotate, sx(FEET.x), sy(FEET.y));
        dust?.shift(3, kx, ky);
        dust?.shift(4, land.x, land.y + L.land.y);
        stage.render(t);
        if (frames++ % 2 === 0) placeHit();
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
        const before = (node) => node.mesh.renderOrder - 0.5;
        const after = (node) => node.mesh.renderOrder + 0.5;
        const fromArt = (list, color, scale = 1) => list.map(([x, y, r]) => [sx(x), sy(y), Math.max(1.2, 2 * r * k() * scale), color]);
        dust = startStardust(null, {
            stage,
            manual: true,
            groups: [
                // 0: far tiny stars, faint, hardly moving with the pointer
                { count: 260, colors: [0xfaf0dc, 0xf6d9a8, 0xd8ecea], size: [1, 2.4], drift: 1.5, twinkle: 0.8, reach: 0, parallax: 0, opacity: 0.6, order: 0.1 },
                // 1: the card's stars, warm, twinkling; a finger stirs them
                { colors: [0xfec88a], look: 'hard', parallax: 0, drift: 2, twinkle: 0.5, reach: 110, push: 22, order: 0.12, points: starPoints },
                // 2: the moon's stipple, trembling a little; a finger stirs it
                { colors: [INK], look: 'hard', parallax: 0, drift: 0.8, jitter: 0.35, twinkle: 0, reach: 80, push: 12, order: before(L.moon), points: () => fromArt(art.stipple, INK, 1.75) },
                // 3: Kätus's light, alive as a flame
                { colors: [AURA], parallax: 0, drift: 2.2, jitter: 0.7, twinkle: 0.5, reach: 50, push: 8, order: after(L.warmth), points: () => fromArt(art.aura, AURA, 2) },
                // 4: the mushrooms' glow
                { colors: [PINK], parallax: 0, drift: 1.2, jitter: 0.4, twinkle: 0.45, reach: 50, push: 6, order: before(L.lines), points: () => fromArt(art.spores, PINK, 1.8) },
                // 5: a shooting star now and then
                { colors: [0xffffff], dynamic: shooting, parallax: 0, drift: 0, twinkle: 0, reach: 0, look: 'soft', order: 0.13 },
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
        <div ref="katusHit" class="hit" role="button" tabindex="0"
            :aria-label="$i18n.locale === 'en' ? 'Kätus at the edge of the cliff' : 'Kätus al borde del acantilado'"
            @click.stop="kindle" @keydown="onKey"></div>
    </div>
</template>

<style scoped>
    .scene {
        position: absolute;
        inset: 0;
        overflow: hidden;
        background: #22486d;
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
        outline: 2px solid rgba(255, 255, 255, 0.85);
        outline-offset: 2px;
    }
</style>
