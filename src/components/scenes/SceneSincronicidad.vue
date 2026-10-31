<script setup>
    // Sincronicidad: two atoms that evolve and find each other, and where they meet a fire is lit. Four bubbles of larvae
    // float in a sequence, from the smallest egg to the embracing pair; a glow runs along them on a steady beat, bubble
    // after bubble, and on the beat after the pair sparks come out of the camp fire.
    // Its verb is Resonar (be there at the right moment): touching a bubble just when the glow reaches it makes it resonate
    // (its note of the card's chord) and it stays lit; a touch out of time only sounds muted, and nothing lit is lost.
    // With the four lit the fire leaps, the gold rulito is born out of the pair's bubble and the card's name lights up; then the lights
    // fade and it can be played again. While someone is playing, the glow sounds softly on every bubble, so the beat is heard.
    // The fire sits on a small floating island, drawn as it is. Around it, behind the drawings so they never cover them,
    // a halo of particles taken from the flame's own shape (sincroClouds.json) and living flame particles rising from it
    // (useFlame); the night sky is a field of particles too (useStardust).
    // It is drawn in WebGL (useLayerStage): every bubble and the island is a plane at its own depth (the pair nearest,
    // the smallest egg farthest), the camera slides with the pointer or the tilt, and the bubbles' skins shimmer a little.
    // The touch targets are DOM elements kept over the bubbles.
    import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { createParallax } from '../../composables/useParallax.js';
    import { createLayerStage } from '../../composables/useLayerStage.js';
    import { startStardust } from '../../composables/useStardust.js';
    import { createFlame } from '../../composables/useFlame.js';
    import { createSparks } from '../../composables/useSparks.js';
    import { decodeClouds, sampleCloud } from '../../composables/useClouds.js';
    import { play } from '../../composables/useSound.js';
    import { sceneMilestone } from '../../analytics.js';
    import Rulito from '../Rulito.vue';
    import clouds from '../../composables/sincroClouds.json';

    const props = defineProps({
        card: { type: Object, default: () => ({}) },
        active: Boolean
    });

    const root = ref(null);
    const canvas = ref(null);
    const hits = ref([]);
    const rulito = ref(null);
    let stageEl = null;                     // the card's stage, where the name is lit from (--name-glow)
    let stage = null;
    let parallax = null;
    let sky = null;
    let entered = false;
    let gone = false;
    let F = { x: 0, y: 0, size: 1 };        // the square frame on screen at rest (px)

    // The camera slides SLIDE px at the edge of a swipe; each layer moves as far as it did (its `depth` px), and 0.6 of
    // that up and down
    const SLIDE = 50;
    const SLIDE_Y = 30;
    const zFor = (amp) => amp / (SLIDE + amp);

    // The island's picture is 1115x847; its flame sits at the right, rising from behind the stones, from the seam below
    const ISLAND = { w: 1115, h: 847, left: 0.36, top: 0.5, width: 0.58 };
    const SEAM = { x: 0.733, y: 0.5455 };
    const glow = decodeClouds(clouds)['flame-glow'];

    // The bubbles, a little smaller than in the card (left, top and width as fractions of the frame), from the smallest
    // egg to the pair; `depth` is how far each moves with the pointer, `speed`, `lift`, `turn`, `phase` its float
    const BUBBLES = [
        { file: 'larva1', size: [97, 121], left: 0.326, top: 0.064, width: 0.058, depth: 12, speed: 0.8, lift: 6, turn: 3, phase: 0 },
        { file: 'larva2', size: [114, 143], left: 0.165, top: 0.096, width: 0.07, depth: 16, speed: 0.65, lift: 7, turn: 3, phase: 2 },
        { file: 'encuentro', size: [372, 327], left: 0.399, top: 0.172, width: 0.242, depth: 26, speed: 0.5, lift: 9, turn: 1.6, phase: 4 },
        { file: 'sincronicidad', size: [454, 431], left: 0.155, top: 0.432, width: 0.27, depth: 36, speed: 0.42, lift: 11, turn: 1.4, phase: 1 },
    ];
    const ISLAND_DEPTH = 18;

    // A square frame, bottom-aligned; on a tall screen lifted towards the middle so the sky is not empty above it
    const layout = (W, H) => {
        const size = Math.min(Math.max(W, 0.55 * H), 0.85 * H, 1.18 * W);
        const bottom = W <= H ? (H - size) * 0.4 : 0;
        F = { x: W / 2 - size / 2, y: H - size - bottom, size };
    };
    const islandRect = () => {
        const w = ISLAND.width * F.size;
        return { left: F.x + ISLAND.left * F.size, top: F.y + ISLAND.top * F.size, w, h: w * ISLAND.h / ISLAND.w };
    };
    const bubbleRect = (b) => {
        const w = b.width * F.size;
        return { left: F.x + b.left * F.size, top: F.y + b.top * F.size, w, h: w * b.size[1] / b.size[0] };
    };

    const L = { bubbles: [], halos: [] };

    // Living flame: tongues from the base of the picture's flame up to its tip, yellow at the base and pink at the tip
    const anchor = () => {
        if (!L.island) return null;
        const b = L.island.boxOnScreen(islandRect());
        if (!b.width) return null;
        return { x: b.left + SEAM.x * b.width, y: b.top + (SEAM.y + 0.02) * b.height, radius: 0.075 * b.width, height: SEAM.y * b.height * 1.0, unit: b.width / 300 };
    };
    const fire = createFlame({ count: 190, palette: [0xfbf09e, 0xf49f92, 0xe0749c, 0xe0749c], anchor, size: 5.4, rise: 1.3 });
    const sparks = createSparks(360);

    // ---- The sequence: on a steady beat a glow runs bubble after bubble, then sparks come out of the fire, then a rest
    const BEAT = 1.3;                 // seconds from one bubble to the next
    const PERIOD = 6 * BEAT;          // four bubbles, the fire, a rest
    const STEPS = [
        { at: 0, colors: [0xfbf09e, 0xf49f92], halo: 0xfbf09e },
        { at: BEAT, colors: [0xfbf09e, 0xf49f92], halo: 0xfbf09e },
        { at: 2 * BEAT, colors: [0xf49f92, 0xe0749c, 0xfbf09e], halo: 0xf49f92 },
        { at: 3 * BEAT, colors: [0xf49f92, 0xe0749c, 0xfbf09e, 0xffffff], halo: 0xf49f92 },
    ];
    const IGNITE = 4 * BEAT;
    const SPAN = 1.7;                 // seconds a bubble glows, brightest on its beat
    const IN_TIME = 0.28;             // a touch this close to a bubble's beat (s, either side) is in time
    const bump = (d) => (Math.abs(d) >= SPAN / 2 ? 0 : Math.cos(Math.PI * d / SPAN) ** 2);
    // How far the sequence is from a bubble's beat, in seconds, between -PERIOD/2 and PERIOD/2
    const offBeat = (cycle, at) => ((cycle - at + PERIOD * 1.5) % PERIOD) - PERIOD / 2;
    let lastCycle = -1;
    let lastT = 0;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const centreOf = (i) => {
        const b = L.bubbles[i].boxOnScreen(bubbleRect(BUBBLES[i]));
        return [b.left + b.width / 2, b.top + b.height / 2, b.width];
    };
    const spark = (i, more = 1) => {
        if (reduced) return;
        const [x, y, w] = centreOf(i);
        sparks.burst(x, y, { n: Math.round((i === STEPS.length - 1 ? 18 : 9) * more), colors: STEPS[i].colors, speed: (60 + w * 0.25) * Math.sqrt(more), size: 4.4, spread: w * 0.3, life: 1.8 });
    };
    // When the glow reaches the pair, a few sparks come out of the fire (it is drawn as it is: it does not leap)
    const ignite = (n = 24, speed = 120) => {
        const a = anchor();
        if (a && !reduced) sparks.burst(a.x, a.y - a.height * 0.3, { n, colors: [0xfbf09e, 0xf49f92, 0xe0749c, 0xffffff], speed, size: 5, spread: a.radius });
    };

    // ---- The game: touch each bubble on its beat; what is lit stays lit until the four are
    const on = BUBBLES.map(() => false);      // lit by a touch in time
    const lit = BUBBLES.map(() => 0);         // how lit each one looks (eases towards `on`)
    const ring = BUBBLES.map(() => 0);        // a flash on each touch in time, that settles
    const missed = BUBBLES.map(() => null);   // the beat a touch out of time made a bubble wait for: so tapping and
                                              // tapping is not a way to catch it, it has to be listened to
    let playing = -Infinity;                  // when the last bubble was touched: while someone plays, the beat sounds
    let wins = 0;
    let win = null;                           // the rulito, while it lives
    let glyph = { left: 0, top: 0, w: 1, h: 1 };
    const PAIR = BUBBLES.length - 1;          // the embracing pair, the biggest bubble: the rulito comes out of it
    const DELAY = 0.6, GROW = 2.2, LINGER = 2.6, EAT = 3.4;    // the rulito: after the fire leaps, born, kept, gone

    const touch = (index) => {
        playing = lastT;
        const cycle = (((lastT % PERIOD) + PERIOD) % PERIOD);
        const height = index / (STEPS.length - 1);
        const beat = Math.round((lastT - STEPS[index].at) / PERIOD);    // the nearest beat of this bubble
        if (win || missed[index] === beat || Math.abs(offBeat(cycle, STEPS[index].at)) > IN_TIME) {
            // Out of time (or while the rulito lives): a muted drop, a few sparks, nothing lost; this beat is gone for
            // this bubble, the next time the glow comes round it can be caught
            if (!win) missed[index] = beat;
            play(win ? 'tap' : 'miss');
            spark(index, 0.4);
            return;
        }
        ring[index] = 1;
        spark(index, 1.6);
        play('resonate', { step: height });
        if (on[index]) return;
        on[index] = true;
        if (on.every(Boolean)) setTimeout(synchronised, BEAT * 1000 * 0.6);
    };

    // The four rang in time: the fire leaps and the rulito is born out of the pair's bubble
    const synchronised = () => {
        if (win || gone) return;
        wins += 1;
        win = { age: 0, head: 0, tail: 0, full: false, fullAt: 0, back: false, pop: 0 };
        rulito.value?.reshape();
        fire.flare(1);
        ignite(60, 190);
        ring[PAIR] = 1;
        spark(PAIR, 3);
        // The fire is heard as it leaps (a rush of air rising over a low bowl), with the chord gathering over it
        play('ignite', 1);
        play('converge');
        sceneMilestone('in_time', { times: wins });
    };
    const onKey = (event, action) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        action();
    };

    const build = (s) => {
        L.island = s.depth(zFor(ISLAND_DEPTH)).image('/assets/sincronicidad/isla.webp');
        // The rulito comes out of the pair's bubble, at its depth, and is drawn over everything
        L.rulito = s.depth(zFor(BUBBLES[BUBBLES.length - 1].depth)).canvas(rulito.value.canvas, { bloom: true });
        BUBBLES.forEach((b, i) => {
            // A lit bubble glows from behind, at its own depth
            L.halos.push(s.depth(zFor(b.depth)).glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: STEPS[i].halo, stops: [[0, 0.6], [0.3, 0.3], [0.62, 0]], bloom: true }));
            L.bubbles.push(s.depth(zFor(b.depth)).image(`/assets/sincronicidad/${b.file}.webp`, { shimmer: 0.35 }));
        });
        // From the far egg to the near pair (the pair is drawn last, over the island), each with its glow just behind it
        const order = [0, 1, 2, 3];
        order.forEach((i, k) => {
            L.halos[i].mesh.renderOrder = L.island.mesh.renderOrder + 0.5 + 2 * k;
            L.bubbles[i].mesh.renderOrder = L.island.mesh.renderOrder + 1 + 2 * k;
            L.halos[i].opacity = 0;
        });
        L.rulito.mesh.renderOrder = L.island.mesh.renderOrder + 20;
        L.bubbles[0].enter({ y: -40, scale: 0.6, delay: 100, duration: 1800 });
        L.bubbles[1].enter({ y: -30, scale: 0.6, delay: 250, duration: 1800 });
        L.bubbles[2].enter({ y: 60, scale: 0.8, delay: 400, duration: 1900 });
        L.bubbles[3].enter({ y: 90, scale: 0.85, delay: 600, duration: 2000 });
        L.island.enter({ y: 160, delay: 300, duration: 1700 });
    };

    const place = (W, H) => {
        layout(W, H);
        L.island.place(islandRect());
        BUBBLES.forEach((b, i) => {
            const r = bubbleRect(b);
            L.bubbles[i].place(r);
            const d = Math.max(r.w, r.h) * 1.7;
            L.halos[i].place({ left: r.left + r.w / 2 - d / 2, top: r.top + r.h / 2 - d / 2, w: d, h: d });
        });
        // The rulito stands on the top of the pair's bubble, as if it came out of it (its canvas is bigger than the glyph,
        // for the glow, as in Paciencia)
        const pair = bubbleRect(BUBBLES[BUBBLES.length - 1]);
        const rw = 0.06 * F.size, rh = rw * 86 / 32;
        glyph = { left: pair.left + pair.w / 2 - rw / 2, top: pair.top + 0.04 * pair.h - rh, w: rw, h: rh };
        L.rulito.place({ left: glyph.left - 0.4375 * glyph.w, top: glyph.top - 0.1628 * glyph.h, w: glyph.w * 1.875, h: glyph.h * 1.3256 },
            { x: glyph.left + glyph.w / 2, y: glyph.top + glyph.h });
    };

    const placeHits = () => {
        hits.value.forEach((el, i) => {
            if (!el) return;
            const b = L.bubbles[i].boxOnScreen(bubbleRect(BUBBLES[i]));
            el.style.translate = `${b.left.toFixed(1)}px ${b.top.toFixed(1)}px`;
            el.style.width = `${b.width.toFixed(1)}px`;
            el.style.height = `${b.height.toFixed(1)}px`;
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
        const dt = Math.min(0.1, Math.max(0, t - lastT));
        lastT = t;
        stage.look(x * SLIDE, y * SLIDE_Y);

        // Where the sequence is now; each time it crosses a beat, that bubble throws its sparks (and, while someone is
        // playing, sounds softly: the beat to follow)
        const cycle = ((t % PERIOD) + PERIOD) % PERIOD;
        const listening = t - playing < 2 * PERIOD && !win;
        // (the first beat is at 0, so a crossing can also be the cycle starting again)
        const crossed = (at) => (cycle >= lastCycle ? lastCycle < at && cycle >= at : lastCycle < at || cycle >= at);
        if (ramp > 0.9) {
            STEPS.forEach((step, i) => {
                if (!crossed(step.at)) return;
                spark(i);
                if (listening) play('pulse', { step: i / (STEPS.length - 1) });
            });
            if (crossed(IGNITE)) ignite();
        }
        lastCycle = cycle;

        // The rulito: born after the fire leaps, kept a while, then its tail catches its head and the lights go out
        let named = 0;
        if (win && rulito.value) {
            win.age += dt;
            win.pop = Math.max(0, win.pop - dt * 2.2);
            win.head = 1 - (1 - Math.min(1, Math.max(0, (win.age - DELAY) / GROW))) ** 1.6;
            if (win.head >= 1 && !win.full) { win.full = true; win.fullAt = win.age; win.pop = 1; play('rulito'); fire.flare(0.8); }
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
        stageEl?.style.setProperty('--name-glow', named.toFixed(3));
        const together = on.filter(Boolean).length / BUBBLES.length;
        stage.bloom = Math.max(named, win ? 0.5 : 0, 0.25 * together * together);

        // Each bubble floats on its own slow wave and glows when the sequence passes through it; a lit one stays brighter,
        // with its glow behind it breathing on the beat
        BUBBLES.forEach((b, i) => {
            const node = L.bubbles[i];
            const halo = L.halos[i];
            const p = bump(offBeat(cycle, STEPS[i].at));
            lit[i] += ((on[i] ? 1 : 0) - lit[i]) * Math.min(1, dt * (on[i] ? 6 : 0.8));
            ring[i] = Math.max(0, ring[i] - dt * 2.4);
            node.y = Math.sin(t * b.speed + b.phase) * b.lift * ramp - s * b.depth * 2.2;
            node.rotate = Math.sin(t * b.speed * 0.7 + b.phase) * b.turn * ramp;
            node.scale = 1 + Math.sin(t * b.speed * 0.5 + b.phase + 1) * 0.018 * ramp + 0.07 * p + 0.04 * lit[i] + 0.08 * ring[i] * ring[i];
            node.uniforms.uBright.value = 1 + 0.3 * p + 0.2 * lit[i] + 0.25 * ring[i];
            node.uniforms.uSaturate.value = 1 + 0.4 * p + 0.25 * lit[i];
            halo.x = node.x;
            halo.y = node.y;
            halo.scale = node.scale * (1 + 0.12 * p + 0.25 * ring[i]);
            halo.opacity = Math.min(1, lit[i] * (0.65 + 0.35 * p) + 0.7 * ring[i]);
        });

        // The rulito floats with the pair's bubble it came out of
        L.rulito.y = L.bubbles[PAIR].y;
        L.rulito.rotate = Math.sin(t * 1.6) * 3 * ramp;

        // The island floats a little, with the fire on it; the halo of the flame follows it
        L.island.y = Math.sin(t * 0.5 + 2) * 9 * ramp + s * 20;
        L.island.rotate = Math.sin(t * 0.37) * 0.5 * ramp;
        const drift = stage.drift(L.island.z);
        sky?.shift(1, drift.x, drift.y + L.island.y);
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
        stage.onResize((W, H) => place(W, H));
        // Behind every drawing: the night sky, the halo of the flame, the flame and the sparks
        sky = startStardust(null, {
            stage,
            groups: [
                // 0: the night sky
                { count: 380, colors: [0xf6e27c, 0xf6e27c, 0xee6a82, 0xfaf3d4], size: [2.2, 6.5], drift: 7, twinkle: 0.55, reach: 130, push: 34, parallax: 14, order: -20 },
                // 1: the halo of the flame, from its own shape
                { colors: [0xe0749c, 0xf49f92, 0xfbf09e], parallax: 0, drift: 2.4, jitter: 1.1, twinkle: 0.35, reach: 0, look: 'hard', order: -19, points: () => {
                    const r = islandRect();
                    return sampleCloud(glow, (u, v) => [r.left + u / ISLAND.w * r.w, r.top + v / ISLAND.h * r.h], r.w / ISLAND.w, 0.9);
                } },
                { ...fire.group(), order: -18 },
                { ...sparks.group(), order: -17 },
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
        stage?.destroy();
        stageEl?.style.removeProperty('--name-glow');
    });
</script>

<template>
    <div class="scene" ref="root">
        <canvas class="stageCanvas" ref="canvas"></canvas>
        <!-- The rulito is drawn on its own canvas, which the stage shows as a texture over the pair's bubble -->
        <Rulito ref="rulito" class="offstage" color="#f2b036" />
        <!-- The sequence, from the smallest egg to the pair that lights the fire: touch each one when the glow reaches it -->
        <div v-for="(b, i) in BUBBLES" :key="b.file" :ref="(el) => { hits[i] = el; }" class="bubble" role="button" tabindex="0"
            :aria-label="$i18n.locale === 'en' ? 'Bubble: touch it when the glow reaches it' : 'Burbuja: tocala cuando el brillo llegue a ella'"
            @pointerdown.prevent="touch(i)" @keydown="onKey($event, () => touch(i))"></div>
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

    .bubble {
        position: absolute;
        left: 0;
        top: 0;
        width: 0;
        height: 0;
        border-radius: 50%;
        pointer-events: auto;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
        touch-action: manipulation;
        outline: none;
    }

    .offstage {
        position: absolute;
        left: -9999px;
        top: 0;
        width: 40px;
        visibility: hidden;
    }

    .bubble:focus-visible {
        outline: 2px solid rgba(255, 244, 150, 0.9);
        outline-offset: 4px;
    }
</style>
