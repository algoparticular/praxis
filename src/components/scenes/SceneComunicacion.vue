<script setup>
    // Comunicación: "I listen to my truth and through her, I communicate with clarity and honesty". Lying on the ground
    // and looking up, through a ring of pink trees whose trunks all lean in towards the middle, at a round opening of
    // teal sky where three beings float in silence, each in its pink aura: a small one with long tentacles on the left,
    // the big one in the middle and a little one on the right with its eyes open. Yellow pollen hangs in the air and
    // glints on the bark ("the truth attracts bees like pollen").
    // There is no game yet (its verb will be Resonar as an echo: the beings sing, the person answers), so it is only alive:
    // the beings float, each at its own pace, breathe like jellyfish (they swell and draw in from the top of the head, the
    // tentacles swaying under them), now and then turn their heads to one side and back, and the little one blinks and
    // looks about. The canopy breathes: the far leaves, the trunks and the ring of leaves turn very slightly about the
    // middle, each at its own pace, and the crowns round the opening sway on their own as a gust goes round the ring.
    // The pollen trembles and moves out of a finger's way, and a few motes drift in the opening. A touch on a being makes
    // it ring (it swells, its aura flares, a note of the chord); anywhere else the chord is strummed (`star`) and the
    // pollen flares. Reduced motion keeps it still.
    // The sky is not a picture (the card has no layer for it): the card's teal, measured by the converter, with a softer
    // light in code in the middle. The pink auras, the pollen of the bark and the field of pollen behind the leaves are
    // particles from the card's dots. It is drawn in WebGL (useLayerStage): the far canopy, the trunks, the ring of
    // leaves and the beings are planes at their depths. The frame covers the screen (looking up, the trees close all
    // round), so it is as big as the screen's long side; on a very wide screen the canopy goes on past it mirrored.
    // From comunicacionScene.json and public/assets/comunicacion (made by scripts/convert-comunicacion.mjs).
    import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { createParallax } from '../../composables/useParallax.js';
    import { createLayerStage } from '../../composables/useLayerStage.js';
    import { startStardust } from '../../composables/useStardust.js';
    import { play } from '../../composables/useSound.js';
    import art from '../../composables/comunicacionScene.json';

    const props = defineProps({
        card: { type: Object, default: () => ({}) },
        active: Boolean
    });

    const root = ref(null);
    const canvas = ref(null);
    let stage = null;
    let parallax = null;
    let dust = null;
    let entered = false;
    let gone = false;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ---- Layout: the illustration is a 2160 square centred on the screen, as big as its long side (and a margin, so the
    // parallax never shows its edges); on a very wide screen it stops growing and the canopy goes on past it, mirrored
    const SIZE = art.size;
    const B = art.boxes;
    const MARGIN = 70;                      // px past each edge of the screen
    const WIDEST = 2.1;                     // the frame grows with the width up to this many times the height
    let F = { x: 0, y: 0, size: 1 };
    const k = () => F.size / SIZE;
    const sx = (x) => F.x + x * k();
    const sy = (y) => F.y + y * k();
    const rectOf = ([left, top, w, h]) => ({ left: sx(left), top: sy(top), w: w * k(), h: h * k() });
    const layout = (w, h) => {
        const size = Math.max(h, Math.min(w, WIDEST * h)) + 2 * MARGIN;
        F = { x: w / 2 - size / 2, y: h / 2 - size / 2, size };
    };

    const SLIDE = 36;
    const SLIDE_Y = 26;
    const zFor = (amp) => amp / (SLIDE + amp);
    const DEPTH = { light: 2, far: 4, beings: 7, back: 12, trunks: 20, front: 28 };

    const SKY = art.sky.length ? art.sky[1]?.[1] ?? art.sky[0][1] : 0x037296;
    const POLLEN = [0xf2c872, 0xf6d88c, 0xeebc5e];
    const LIGHT = 0x4fb3cf;                 // the softer light in the middle of the sky
    const hexOf = (c) => `#${c.toString(16).padStart(6, '0')}`;

    // ---- The beings: where each one's head is (art px), its own pace, and how it rings when touched
    const BEINGS = art.beings.map((b, i) => {
        const [x, y, w, h] = b.head;
        return { ...b, i, cx: x + w / 2, cy: y + h / 2, top: y, hw: w, hh: h, phase: i * 2.1 + 0.4, pace: [0.42, 0.34, 0.5][i] ?? 0.4, pop: 0, look: 9 + i * 3.7 };
    });
    // The little one on the right has its eyes open: it blinks and looks about
    let blinkAt = 2.5;
    let eyeAim = 0, eyeAimTo = 0, eyeMoveAt = 4;
    const L = {};

    // Now and then a being turns its head to one side and back (0..1, eased in and out), every `every` s
    const turn = (t, every, offset) => {
        const p = ((Math.max(0, t) + offset) % every) / 3.2;
        return p < 1 ? Math.sin(p * Math.PI) ** 2 : 0;
    };

    // ---- A touch: on a being it rings; anywhere else the chord is strummed and the pollen flares
    const onCanvas = (event) => {
        const area = canvas.value.getBoundingClientRect();
        return { x: event.clientX - area.left, y: event.clientY - area.top };
    };
    const beingAt = (p) => {
        let best = -1, bestD = Infinity;
        BEINGS.forEach((b, i) => {
            const at = L.beings[i].group.toScreen(sx(b.cx), sy(b.cy + b.hh * 0.6));
            const reach = Math.max(44, b.hh * 1.3 * k());
            const d = Math.hypot(p.x - at.x, p.y - at.y);
            if (d < reach && d < bestD) { best = i; bestD = d; }
        });
        return best;
    };
    const touch = (event) => {
        if (!stage || !L.beings) return;
        const i = beingAt(onCanvas(event));
        if (i >= 0) {
            BEINGS[i].pop = 1;
            dust?.boost(2 + i, 1.2);
            play('tap');
            if (i === 2) blinkAt = Math.min(blinkAt, lastT + 0.15);
        } else {
            play('star');
            dust?.boost(0, 0.9);
            dust?.boost(1, 0.9);
            dust?.boost(5, 1);
        }
    };

    const build = (s) => {
        // The sky's light, softer in the middle of the opening
        const light = s.depth(zFor(DEPTH.light));
        L.lightNode = light;
        L.light = light.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: LIGHT, stops: [[0, 0.24], [0.4, 0.1], [0.75, 0]] });
        // The beings, behind the canopy: each a group (its aura's light, the being, the little one's eyes)
        const beings = s.depth(zFor(DEPTH.beings));
        L.beingsNode = beings;
        L.beings = BEINGS.map((b) => {
            const group = beings.group();
            const aura = group.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: b.aura, stops: [[0, 0.6], [0.3, 0.3], [0.62, 0]] });
            const body = group.image(`/assets/comunicacion/${b.name}.webp`, { wind: { amp: 4, speed: 0.9 + 0.15 * b.i, root: 'top' } });
            const eyes = B[`eyes${b.i}`] ? group.image(`/assets/comunicacion/eyes${b.i}.webp`) : null;
            return { group, aura, body, eyes };
        });
        beings.enter({ y: 26, delay: 900, duration: 2400 });
        // The canopy, looking up: the far leaves, the trunks, the ring of leaves round the opening. Each comes down into
        // place from a little bigger, as if the eyes were opening on it
        const canopy = (name, depth, enter, options = {}) => {
            const node = s.depth(zFor(depth));
            const group = node.group();
            const copies = [-1, 0, 1].map((side) => {
                const img = group.image(`/assets/comunicacion/${name}.webp`, options);
                if (side) img.sx = -1;
                return { img, side };
            });
            node.enter(enter);
            return { node, group, copies };
        };
        L.back = canopy('back', DEPTH.back, { y: 0, scale: 1.05, delay: 0, duration: 2600 });
        L.trunks = canopy('trunks', DEPTH.trunks, { y: 0, scale: 1.08, delay: 120, duration: 2600 });
        L.front = canopy('front', DEPTH.front, { y: 0, scale: 1.12, delay: 240, duration: 2600 }, { sway: true });
    };

    const place = (w, h) => {
        layout(w, h);
        const c = { x: sx(SIZE / 2), y: sy(SIZE / 2) };
        // The sky: the card's teal in rings from the middle of the frame (it barely changes)
        const stops = art.sky.map(([d, col]) => `${hexOf(col)} ${(d * k()).toFixed(0)}px`);
        root.value.style.background = stops.length > 1
            ? `radial-gradient(circle at ${c.x.toFixed(0)}px ${c.y.toFixed(0)}px, ${stops.join(', ')})`
            : hexOf(SKY);

        const ld = 1500 * k();
        L.light.place({ left: c.x - ld / 2, top: sy(1150) - ld / 2, w: ld, h: ld });

        BEINGS.forEach((b, i) => {
            const being = L.beings[i];
            const pivot = { x: sx(b.cx), y: sy(b.cy) };
            being.group.pivot = pivot;
            const r = rectOf(B[b.name]);
            // It breathes from the top of its head: the tentacles stretch and draw in under it
            being.body.place(r, { x: sx(b.cx), y: sy(b.top) });
            const ad = Math.max(b.hw, b.hh) * 2.6 * k();
            being.aura.place({ left: pivot.x - ad / 2, top: pivot.y - ad / 2, w: ad, h: ad });
            if (being.eyes) being.eyes.place(rectOf(B[`eyes${i}`]));
        });

        [L.back, L.trunks, L.front].forEach((layer) => {
            layer.node.pivot = { x: w / 2, y: h / 2 };
            layer.group.pivot = { ...c };
        });
        const canopyAt = (layer, box) => {
            const r = rectOf(box);
            // The copies go on past the frame, mirrored about its sides, so they meet it without a seam
            layer.copies.forEach(({ img, side }) => {
                const left = side < 0 ? 2 * sx(0) - (r.left + r.w) : side > 0 ? 2 * sx(SIZE) - (r.left + r.w) : r.left;
                img.place({ ...r, left });
                img.mesh.visible = side === 0 || (side < 0 ? sx(0) > -SLIDE * 2 : sx(SIZE) < w + SLIDE * 2);
            });
        };
        canopyAt(L.back, B.back);
        canopyAt(L.trunks, B.trunks);
        canopyAt(L.front, B.front);
    };

    // The crowns round the opening sway on their own, a gust going round the ring now and then
    const [FX, FY, FW, FH] = B.front;
    const CROWNS = art.crowns.map(([x, y, w], i) => ({ u: (x - FX) / FW, v: (y - FY) / FH, w: w / FW, angle: Math.atan2(y - SIZE / 2, x - SIZE / 2), phase: i * 1.7 }));
    const crowns = (t, ramp) => CROWNS.map((c) => {
        const gust = Math.max(0, Math.sin(t * 0.21 - c.angle)) ** 3;
        const lean = (0.8 * Math.sin(t * 0.55 + c.phase) + 2.2 * gust * Math.sin(t * 1.6 + c.phase)) * ramp;
        return [c.u, c.v, c.w, lean, 1 + 0.012 * Math.sin(t * 0.8 + c.phase) * ramp];
    });

    const enter = () => {
        if (entered || !props.active || !stage) return;
        entered = true;
        stage.ready().then(() => { if (!gone) { stage.start(); dust?.reveal(); } });
    };

    let lastT = 0;
    const frame = ({ x, y, scroll, t, ramp }) => {
        if (!stage || !L.beings) return;
        const dt = Math.min(0.1, Math.max(0, t - lastT));
        lastT = t;
        stage.look(x * SLIDE, y * SLIDE_Y);

        // ---- The sky's light breathes, slowly
        L.light.opacity = 0.8 + 0.2 * Math.sin(t * 0.3) * ramp;
        L.lightNode.y = scroll * 6;

        // ---- The beings float, breathe like jellyfish and now and then turn their heads
        const kk = k();
        BEINGS.forEach((b, i) => {
            const being = L.beings[i];
            b.pop = Math.max(0, b.pop - dt * 1.6);
            const pop = Math.sin(Math.min(1, 1 - b.pop) * Math.PI) * b.pop;
            const pulse = Math.sin(t * (1 + 0.12 * i) + b.phase) * ramp;
            being.group.x = Math.sin(t * b.pace * 0.6 + b.phase * 1.3) * 7 * kk * ramp;
            being.group.y = (Math.sin(t * b.pace + b.phase) * 12 - 18 * pop) * kk * ramp;
            const side = i === 1 ? -1 : 1;
            being.group.rotate = (Math.sin(t * b.pace * 0.8 + b.phase) * 2.5 + side * 7 * turn(t, b.look, b.phase)) * ramp;
            being.body.sy = 1 + 0.03 * pulse + 0.08 * pop;
            being.body.sx = 1 - 0.015 * pulse + 0.05 * pop;
            being.aura.opacity = 0.55 + 0.15 * pulse + 0.45 * pop;
            being.aura.scale = 1 + 0.05 * pulse + 0.2 * pop;
            being.body.uniforms.uBright.value = 1 + 0.18 * pop;
        });
        // The little one blinks (now and then twice) and looks about
        const eyes = L.beings[2]?.eyes;
        if (eyes && !reduced) {
            if (t > blinkAt + 0.16) blinkAt = t + (Math.random() < 0.2 ? 0.3 : 2.6 + Math.random() * 3.4);
            const b = t >= blinkAt ? Math.sin(Math.min(1, (t - blinkAt) / 0.16) * Math.PI) : 0;
            eyes.sy = 1 - 0.85 * b;
            if (t > eyeMoveAt) { eyeAimTo = Math.random() < 0.4 ? 0 : (Math.random() < 0.5 ? -1 : 1); eyeMoveAt = t + 2 + Math.random() * 4; }
            eyeAim += (eyeAimTo - eyeAim) * Math.min(1, dt * 6);
            eyes.x = eyeAim * 5 * kk;
        }

        // ---- The canopy breathes: each layer turns very slightly about the middle, at its own pace
        L.back.group.rotate = Math.sin(t * 0.11) * 0.25 * ramp;
        L.trunks.group.rotate = Math.sin(t * 0.09 + 1) * 0.35 * ramp;
        L.front.group.rotate = Math.sin(t * 0.13 + 2) * 0.5 * ramp;
        L.front.group.scale = 1 + 0.006 * Math.sin(t * 0.17) * ramp;
        const sways = crowns(t, ramp);
        L.front.copies.forEach(({ img }) => { img.sways = sways; });
        L.back.node.y = scroll * 14;
        L.trunks.node.y = scroll * 22;
        L.front.node.y = scroll * 30;
        L.beingsNode.y = scroll * 10;

        // The particles that belong to a layer follow it
        const c = { x: sx(SIZE / 2), y: sy(SIZE / 2) };
        const far = stage.drift(zFor(DEPTH.far)), tr = stage.drift(L.trunks.node.z), be = stage.drift(L.beingsNode.z);
        dust?.shift(0, far.x, far.y + scroll * 8);
        dust?.turn(1, L.trunks.group.rotate, c.x, c.y);
        dust?.shift(1, tr.x, tr.y + L.trunks.node.y);
        BEINGS.forEach((b, i) => {
            const g = L.beings[i].group;
            dust?.turn(2 + i, g.rotate, g.pivot.x, g.pivot.y);
            dust?.shift(2 + i, be.x + g.x, be.y + g.y + L.beingsNode.y);
        });
        dust?.shift(5, be.x, be.y + L.beingsNode.y);
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
        build(stage);
        stage.onResize((w, h) => place(w, h));
        const after = (node) => node.mesh.renderOrder + 0.5;
        const fromArt = (list, colour, scale = 1) => list.map(([x, y, r]) => [sx(x), sy(y), Math.max(1.2, 2 * r * k() * scale), colour]);
        const pick = (i) => POLLEN[i % POLLEN.length];
        dust = startStardust(null, {
            stage,
            manual: true,
            groups: [
                // 0: the pollen of the far field, seen through the leaves
                { colors: POLLEN, parallax: 0, drift: 2.5, jitter: 0.3, twinkle: 0.5, reach: 90, push: 14, look: 'hard', order: after(L.light),
                    points: () => art.pollen.far.map(([x, y, r], i) => [sx(x), sy(y), Math.max(1.4, 2 * r * k()), pick(i)]) },
                // 1: the pollen on the bark and the leaves
                { colors: POLLEN, parallax: 0, drift: 1.6, jitter: 0.3, twinkle: 0.55, reach: 110, push: 18, look: 'hard', order: after(L.trunks.copies[2].img),
                    points: () => art.pollen.near.map(([x, y, r], i) => [sx(x), sy(y), Math.max(1.4, 2 * r * k()), pick(i + 1)]) },
                // 2, 3, 4: the stipple of each being's aura, alive
                ...BEINGS.map((b, i) => ({
                    colors: [b.aura], parallax: 0, drift: 1.2, jitter: 0.5, twinkle: 0.35, reach: 0, look: 'hard',
                    order: after(L.beings[i].aura), points: () => fromArt(b.dots, b.aura, 1.15),
                })),
                // 5: a few motes of pollen drifting in the opening
                { colors: [0xf0c873, 0xfff1c4], count: 26, size: [3, 7], look: 'soft', drift: 26, parallax: 0, twinkle: 0.7, reach: 120, push: 30, opacity: 0.8,
                    order: after(L.beings[2].body),
                    spawn: () => {
                        const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * 430 * k();
                        return [sx(SIZE / 2) + Math.cos(a) * d * 1.15, sy(1120) + Math.sin(a) * d];
                    } },
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
    <div class="scene" ref="root" @click="touch">
        <canvas class="stageCanvas" ref="canvas"></canvas>
    </div>
</template>

<style scoped>
    .scene {
        position: absolute;
        inset: 0;
        overflow: hidden;
        background: #037296;
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
