<script setup>
    // Tu verdad (10): the silence, "I listen to my inner self and affirm my truth". There is nothing to read or say: the
    // card is the cream with only the little Algo Particular mark in the middle (a cross and four dots). Here the
    // illustration is gone and only the mark is left, on the card's own colour, beating like a heart: a slow, calm pulse
    // (lub and dub), in time with the heartbeat heard (`heart`, Fa, very soft, on the effects), while the music fades away
    // (App.vue hushes it on this card). On each beat the mark swells softly, its dots open out a little and a glow
    // breathes out from it; a few soft motes slowly settle. A touch makes a beat now, a little stronger. No game.
    // The mark is drawn in code from silencioScene.json (made by scripts/convert-silencio.mjs from the card): the two
    // strokes of the cross on a canvas, the dots as discs, in the cream of the paper (the card turned inside out: there
    // the mark is a shade darker than the cream, here a shade lighter than the card's colour). Drawn in WebGL
    // (useLayerStage); without it the card keeps its flat illustration (cardScenes.js). Reduced motion: still, and the
    // heart still beats in the sound.
    import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { createParallax } from '../../composables/useParallax.js';
    import { createLayerStage } from '../../composables/useLayerStage.js';
    import { startStardust } from '../../composables/useStardust.js';
    import { play } from '../../composables/useSound.js';
    import art from '../../composables/silencioScene.json';

    const props = defineProps({
        card: { type: Object, default: () => ({}) },
        active: Boolean
    });

    const root = ref(null);
    const canvas = ref(null);
    const hit = ref(null);
    let stage = null;
    let parallax = null;
    let dust = null;
    let entered = false;
    let gone = false;
    let still = null;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const PAPER = art.paper;
    const LIGHT = 0xffffff;
    const [BX, BY, BW, BH] = art.box;
    const [CX, CY] = art.centre;

    // ---- Layout: the mark in the middle of the screen, about a quarter of its short side
    let k = 1;
    let mid = { x: 0, y: 0 };
    const sx = (x) => mid.x + (x - CX) * k;
    const sy = (y) => mid.y + (y - CY) * k;
    const markSize = () => Math.max(BW, BH) * k;

    // ---- The heartbeat: a slow, calm pulse. Lub, and dub DUB s later, softer (as `heartbeat` sounds it)
    const BEAT = 1.5;                       // s from one heartbeat to the next
    const DUB = 0.19;
    const RING = 2.8;                       // s a glow takes to breathe out and fade
    const LEVEL = 0.5;                      // how loud the heart is: felt more than heard
    const STRONG = 1.6;                     // a beat made by a touch
    const beats = [];                       // the recent beats: { at, strength }
    let nextBeat = null;
    let clock = 0;
    const now = () => performance.now() / 1000;

    const thump = (p) => (p <= 0 ? 0 : (1 - Math.exp(-p / 0.035)) * Math.exp(-p / 0.24));
    const envelope = (p) => (thump(p) + 0.6 * thump(p - DUB)) / 0.62;

    const beat = (at, strength = 1) => {
        beats.push({ at, strength });
        if (beats.length > 4) beats.shift();
        play('heart', Math.min(1, LEVEL * strength));
        dust?.boost(0, 0.12 * strength);
    };

    // Called every frame (or, still, by a timer): plays the beats that are due. After a pause (the tab hidden) the missed
    // ones are skipped, not played in a burst
    const keepTime = (at) => {
        clock = at;
        if (nextBeat === null || gone) return;
        if (at - nextBeat > 0.5) nextBeat = at + 0.3;
        if (at >= nextBeat) {
            beat(nextBeat);
            nextBeat += BEAT;
        }
    };

    // A touch: a beat now, a little stronger, and the pulse goes on from it (or the one just heard grows, if it was close)
    const touch = () => {
        if (nextBeat === null) return;
        const at = now();
        const last = beats[beats.length - 1];
        if (last && at - last.at < 0.5) {
            last.strength = Math.max(last.strength, STRONG);
            return;
        }
        beat(at, STRONG);
        nextBeat = at + BEAT;
        if (reduced) draw(0);
    };
    const onKey = (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        touch();
    };

    // ---- The stage
    const L = {};
    const cross = document.createElement('canvas');
    const RES = 3;                          // canvas px per px of the card: sharp up to a mark ~650 px wide
    const PAD = 20;

    // The two strokes of the cross, as the brush went: a round-ended line from sample to sample, each its width
    const paintCross = () => {
        cross.width = Math.ceil((BW + 2 * PAD) * RES);
        cross.height = Math.ceil((BH + 2 * PAD) * RES);
        const g = cross.getContext('2d');
        g.clearRect(0, 0, cross.width, cross.height);
        g.fillStyle = g.strokeStyle = `#${PAPER.toString(16).padStart(6, '0')}`;
        g.lineCap = 'round';
        g.lineJoin = 'round';
        const at = (x, y) => [(x - BX + PAD) * RES, (y - BY + PAD) * RES];
        art.strokes.forEach((line) => {
            for (let i = 1; i < line.length; i++) {
                const [x0, y0, w0] = line[i - 1], [x1, y1, w1] = line[i];
                g.lineWidth = (w0 + w1) / 2 * RES;
                g.beginPath();
                g.moveTo(...at(x0, y0));
                g.lineTo(...at(x1, y1));
                g.stroke();
            }
        });
    };

    const build = (s) => {
        // Behind the mark: its light, breathing, and the glows each beat breathes out
        const back = s.depth(-0.12);
        L.back = back;
        L.aura = back.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: LIGHT, stops: [[0, 0.5], [0.22, 0.3], [0.48, 0.1], [0.75, 0]] });
        L.rings = [0, 1].map(() => back.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: LIGHT, stops: [[0, 0.5], [0.35, 0.2], [0.7, 0]] }));
        back.enter({ y: 0, scale: 0.7, delay: 200, duration: 2600 });
        // The mark, at the focal plane: the cross and its four dots, all turning and swelling about its middle
        const front = s.depth(0);
        L.front = front;
        L.mark = front.group();
        paintCross();
        L.cross = L.mark.canvas(cross);
        L.cross.refresh();
        L.dots = art.dots.map(() => L.mark.disc({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: PAPER }));
        // Over it, the light of each beat on the mark itself
        L.shine = front.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: LIGHT, stops: [[0, 0.5], [0.25, 0.18], [0.55, 0]] });
        L.shine.opacity = 0;
        front.enter({ y: 0, scale: 0.92, delay: 100, duration: 2200 });
    };

    const place = (w, h) => {
        k = Math.min(260, Math.max(96, 0.24 * Math.min(w, h))) / Math.max(BW, BH);
        mid = { x: w / 2, y: h / 2 };
        const m = markSize();
        const pivot = { x: mid.x, y: mid.y };
        L.mark.pivot = pivot;
        L.cross.place({ left: sx(BX - PAD), top: sy(BY - PAD), w: (BW + 2 * PAD) * k, h: (BH + 2 * PAD) * k });
        L.dots.forEach((node, i) => {
            const [x, y, rx, ry, angle] = art.dots[i];
            node.place({ left: sx(x) - rx * k, top: sy(y) - ry * k, w: 2 * rx * k, h: 2 * ry * k });
            node.rotate = angle;
        });
        const square = (size) => ({ left: mid.x - size / 2, top: mid.y - size / 2, w: size, h: size });
        L.aura.place(square(m * 3.4));
        L.rings.forEach((ring) => ring.place(square(m * 2.4)));
        L.shine.place(square(m * 1.9));
        L.back.pivot = L.front.pivot = pivot;
        if (hit.value) {
            const size = Math.max(120, m * 1.8);
            hit.value.style.width = hit.value.style.height = `${size.toFixed(1)}px`;
            hit.value.style.translate = `${(mid.x - size / 2).toFixed(1)}px ${(mid.y - size / 2).toFixed(1)}px`;
        }
    };

    const ease = (p) => p * p * (3 - 2 * p);

    // One frame: everything from the beats heard so far (the pulse) and the slow breath under it
    const draw = (t, ramp = 1) => {
        if (!stage || !L.mark) return;
        const at = clock;
        let pulse = 0;
        beats.forEach(({ at: when, strength }) => { pulse = Math.max(pulse, envelope(at - when) * strength); });
        const breath = reduced ? 0 : Math.sin(t * 0.42) * ramp;

        L.mark.scale = 1 + 0.05 * pulse + 0.008 * breath;
        // The dots open out a little from the middle on each beat, and come back
        L.dots.forEach((node, i) => {
            const [x, y] = art.dots[i];
            node.x = (x - CX) * k * 0.05 * pulse;
            node.y = (y - CY) * k * 0.05 * pulse;
        });
        L.shine.opacity = Math.min(1, 0.55 * pulse);
        L.shine.scale = 0.9 + 0.2 * pulse;
        L.aura.opacity = 0.55 + 0.12 * breath + 0.18 * Math.min(1, pulse);
        L.aura.scale = 1 + 0.03 * breath;
        // Each beat breathes a glow out from the mark, which widens and fades
        L.rings.forEach((ring, i) => {
            const b = beats[beats.length - 1 - i];
            const p = b ? (at - b.at) / RING : 1;
            const on = p >= 0 && p < 1;
            ring.mesh.visible = on;
            if (!on) return;
            ring.scale = 0.75 + 1.1 * ease(p);
            ring.opacity = 0.5 * Math.min(1, b.strength) * Math.min(1, p * 8) * (1 - p) ** 2;
        });
        stage.render(t);
    };

    const frame = ({ x, y, t, ramp }) => {
        if (!stage || !L.mark) return;
        stage.look(x * 22, y * 16);
        keepTime(now());
        draw(t, ramp);
    };

    const enter = () => {
        if (entered || !props.active || !stage) return;
        entered = true;
        stage.ready().then(() => {
            if (gone) return;
            stage.start();
            dust?.reveal();
            // The first heartbeat comes once the music has begun to go quiet
            nextBeat = now() + 1.4;
            if (reduced) {
                // Nothing moves, but the heart is still heard
                still = setInterval(() => keepTime(now()), 100);
                draw(0);
            }
        });
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
        stage.onResize((w, h) => { place(w, h); if (reduced) draw(0); });
        dust = startStardust(null, {
            stage,
            manual: true,
            groups: [
                // A few soft motes of light that slowly settle, out of a finger's way
                { colors: [LIGHT, PAPER], count: 34, size: [4, 12], look: 'soft', flow: [0, 5], drift: 16, twinkle: 0.6, reach: 100, push: 26, parallax: 14, edgeFade: 0.2, opacity: 0.6 },
            ],
        });
        if (reduced) dust?.reveal();
        parallax = createParallax(root.value, frame);
        enter();
    };

    onMounted(begin);
    watch(() => props.active, enter);
    onBeforeUnmount(() => {
        gone = true;
        clearInterval(still);
        parallax?.destroy();
        dust?.destroy();
        stage?.destroy();
    });
</script>

<template>
    <div class="scene" ref="root">
        <canvas class="stageCanvas" ref="canvas"></canvas>
        <div ref="hit" class="hit" role="button" tabindex="0"
            :aria-label="$i18n.locale === 'en' ? 'Listen to the heart' : 'Escuchá el corazón'"
            @pointerdown.prevent="touch" @keydown="onKey"></div>
    </div>
</template>

<style scoped>
    .scene {
        position: absolute;
        inset: 0;
        overflow: hidden;
        background: v-bind('card.color ?? "#E9EDD8"');
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
        outline: 2px solid rgba(20, 50, 70, 0.5);
        outline-offset: 2px;
    }
</style>
