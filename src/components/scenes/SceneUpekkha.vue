<script setup>
    // Upekkha: equanimity, "the only thing that is permanent is the impermanence of everything". Sid sits with his eyes
    // closed between two halves: on the left the past (the mint sky, the orange earth, the still pond), on the right the
    // future (the deep teal sky, the mushrooms and the crystals on a rugged ground). Seeking to live in the past is holding
    // tight to the anchor; thinking of what will come is missing the journey: "the chatter of your mind moves in these two
    // directions, past and future".
    // Its verb is Soltar. Thoughts come floating to him from both sides, bubbles of the other half's colour (the past's
    // carry the teal of the future, the future's the mint of the past, as the card's bubbles). One that reaches him clings
    // by his head and pulls him off the centre, towards its side; the more there are on one side, the more he leans. A
    // touch lets a thought go: it bursts into motes that rise and fade (`release`), and he swings back towards the centre.
    // Holding one is clinging to it (the demon of the crown is attachment): it grows, a thread of dots joins it to him and
    // pulls him hard to its side; letting go of it then is a breath out (`exhale`) and he swings back. Every thought let
    // go makes his aura a little brighter. With the eight of a round let go, he is still in the middle, his aura shines,
    // the name lights up and the rulito is born over his head, where the card draws it (`rulito`: E minor has no seventh
    // to resolve, it climbs to the octave). Then the thoughts start coming again: impermanence.
    // The flat colours behind the drawing are not pictures: their outlines were read from the card by the converter and
    // the stage draws them (field()) as water and oil: the edge between the two halves of the sky, and of the ground,
    // moves slowly, bulges, lets drops pinch off and takes them back, and they never mix; it churns more the more he is
    // pulled, and a thought let go leaves a drop of its colour that drifts home. The specks of the sky, the stipple round Sid and
    // the yellow light of the mushrooms are particles. It is drawn in WebGL (useLayerStage), with the land mirrored past
    // the frame on wide screens. From upekkhaScene.json and public/assets/upekkha (made by scripts/convert-upekkha.mjs).
    import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { createParallax } from '../../composables/useParallax.js';
    import { createLayerStage } from '../../composables/useLayerStage.js';
    import { startStardust } from '../../composables/useStardust.js';
    import { createSparks } from '../../composables/useSparks.js';
    import { play } from '../../composables/useSound.js';
    import { sceneMilestone } from '../../analytics.js';
    import Rulito from '../Rulito.vue';
    import art from '../../composables/upekkhaScene.json';

    const props = defineProps({
        card: { type: Object, default: () => ({}) },
        active: Boolean
    });

    const root = ref(null);
    const canvas = ref(null);
    const rulito = ref(null);
    const sidHit = ref(null);
    let stageEl = null;
    let stage = null;
    let parallax = null;
    let dust = null;
    let entered = false;
    let gone = false;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ---- Layout: the illustration is a 2160 square resting on the bottom of the screen. On a phone upright it is as big
    // as Sid and a bit of each half allow across; on a wide screen the land goes on past the frame, mirrored
    const SIZE = art.size;
    const B = art.boxes;
    const R = art.regions;
    let F = { x: 0, y: 0, size: 1 };
    let W = 1, H = 1;
    const k = () => F.size / SIZE;
    const sx = (x) => F.x + x * k();
    const sy = (y) => F.y + y * k();
    const rectOf = ([left, top, w, h]) => ({ left: sx(left), top: sy(top), w: w * k(), h: h * k() });
    const SPAN = 1500, FOCUS = 1075;        // art px across that must be seen on a phone, and their middle
    const DROP = 0.08;                      // how much of the frame goes under the bottom of a wide screen
    const layout = (w, h) => {
        W = w; H = h;
        const phone = w < h;
        const size = phone ? Math.min(0.78 * h, w * SIZE / SPAN) : Math.min(Math.max(0.6 * w, 0.55 * h), 0.92 * h);
        let x = w / 2 - size / 2;
        if (phone && size > w) x = Math.min(0, Math.max(w - size, w / 2 - FOCUS * size / SIZE));
        F = { x, y: h - size + (phone ? 0 : DROP * size), size };
    };

    const SLIDE = 46;
    const SLIDE_Y = 26;
    const zFor = (amp) => amp / (SLIDE + amp);
    const DEPTH = { sky: 6, land: 16, sid: 24 };

    const MINT = R.sky.color;
    const FUTURE = R.future.color;
    const AURA = 0xf7f8f1;
    const GLOW = art.glowColor;
    const HEAD = art.head;
    const BASE = [1083, 1530];              // where Sid sits: he leans about it
    const ease = (p) => p * p * (3 - 2 * p);

    // ---- Soltar: the thoughts
    const TOTAL = 8;                        // thoughts in a round, half from each side
    const MAX_ON = 3;                       // thoughts at once (floating or clinging)
    const EVERY = 2.6;                      // s between two new thoughts
    const TRAVEL = 7;                       // s a thought takes to cross to him, at most
    const HOLD = 0.4;                       // s held: it is clinging, not a touch
    const CLING = 1.6;                      // s held to cling with all its weight
    const LEAN = 0.32;                      // how far one clinging thought leans him (of the most he leans)
    const DELAY = 0.6, GROW = 2.2, LINGER = 2.8, EAT = 3.4;     // the rulito: born, kept, gone
    const thoughts = Array.from({ length: MAX_ON + 1 }, (_, i) => ({ i, state: 'off', x: 0, y: 0, vx: 0, vy: 0, side: 1, r: 1, age: 0, pop: 0, slot: 0, phase: Math.random() * 6.28, hint: 0, held: 0 }));
    let deck = [];
    let spawned = 0;
    let released = 0;
    let nextAt = 1.4;
    let held = null;                        // { thought, pointerId, at }
    let lean = 0, leanV = 0;                // Sid off the centre (-1 left .. 1 right), and how fast it changes
    let calm = 0;                           // his aura: a step brighter with each thought let go
    let idle = 0;
    let win = null;
    let wins = 0;
    let started = false;
    let glyph = { left: 0, top: 0, w: 1, h: 1 };
    let lastT = 0;
    const sparks = createSparks(360);
    const L = {};

    const shuffle = (list) => { for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; } return list; };
    const newDeck = () => shuffle([...Array(TOTAL).keys()].map((i) => (i % 2 ? 1 : -1)));
    deck = newDeck();
    const headAt = () => L.sid.toScreen(sx(HEAD[0]), sy(HEAD[1]));
    const alive = () => thoughts.filter((th) => th.state !== 'off' && th.state !== 'pop');
    const titleBottom = () => {
        const title = stageEl?.querySelector('h1');
        if (!title || !root.value) return 0.16 * H;
        return title.getBoundingClientRect().bottom - root.value.getBoundingClientRect().top;
    };

    // A new thought comes in from one side, somewhere in the sky between the card's name and the land
    const spawn = () => {
        const th = thoughts.find((each) => each.state === 'off');
        if (!th) return;
        const side = deck[spawned % TOTAL];
        spawned += 1;
        const r = Math.max(18, 70 * k());
        const top = titleBottom() + r * 1.4, bottom = Math.max(top + 1, sy(1150));
        const y = top + Math.random() * (bottom - top);
        const x = side < 0 ? -r * 1.6 : W + r * 1.6;
        const to = headAt();
        const d = Math.hypot(to.x - x, to.y - y) || 1;
        const speed = Math.max(F.size * 0.045, d / TRAVEL);
        Object.assign(th, { state: 'float', x, y, vx: (to.x - x) / d * speed, vy: (to.y - y) / d * speed, side, r, age: 0, pop: 0, hint: 0, held: 0, phase: Math.random() * 6.28 });
        const node = L.thoughts[th.i];
        // The past carries the future's teal, the future the past's mint, as the bubbles of the card
        const c = side < 0 ? FUTURE : MINT;
        node.parts.forEach((part) => part.uniforms.uColor.value.setRGB(((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255));
        if (!started) { started = true; sceneMilestone('thought_came'); }
    };

    // Let a thought go: it bursts into motes that rise and fade, and he swings back
    const letGoOf = (th, clung = false) => {
        if (th.state === 'off' || th.state === 'pop') return;
        th.state = 'pop';
        th.pop = 0;
        released += 1;
        idle = 0;
        const c = th.side < 0 ? FUTURE : MINT;
        sparks.burst(th.x, th.y, { n: Math.round(16 + 10 * th.held), colors: [c, AURA, c], speed: 70 + 40 * th.held, life: 1.8, size: 4.2, spread: th.r * 0.8 });
        play(clung ? 'exhale' : 'release');
        dropFrom(th);
        if (released >= TOTAL) setTimeout(() => { if (!gone) still(); }, DELAY * 1000);
    };

    // The eight let go: he is still in the middle and the rulito is born over him
    const still = () => {
        if (win) return;
        wins += 1;
        win = { age: 0, head: 0, tail: 0, full: false, fullAt: 0, back: false, pop: 0 };
        rulito.value?.reshape();
        play('converge');
        dust?.boost(AURA_GROUP, 1.4);
        sceneMilestone('equanimous', { times: wins });
    };

    // ---- Touch: a press on a thought takes it; letting go of it lets it go
    const onCanvas = (event) => {
        const area = root.value.getBoundingClientRect();
        return { x: event.clientX - area.left, y: event.clientY - area.top };
    };
    const thoughtAt = (p, reach = 1.5) => {
        let best = null, bestD = Infinity;
        alive().forEach((th) => {
            const d = Math.hypot(th.x - p.x, th.y - p.y);
            if (d < Math.max(30, th.r * reach) && d < bestD) { best = th; bestD = d; }
        });
        return best;
    };
    const press = (event) => {
        if (reduced || win || held) return;
        const th = thoughtAt(onCanvas(event));
        if (!th) return;
        idle = 0;
        held = { thought: th, pointerId: event.pointerId, at: lastT };
        th.state = 'held';
        window.addEventListener('pointerup', release);
        window.addEventListener('pointercancel', release);
    };
    const release = (event) => {
        if (!held || (event && event.pointerId !== held.pointerId)) return;
        window.removeEventListener('pointerup', release);
        window.removeEventListener('pointercancel', release);
        const { thought } = held;
        const clung = lastT - held.at > HOLD;
        held = null;
        if (clung) sceneMilestone('thought_clung', { held: +thought.held.toFixed(2) });
        letGoOf(thought, clung);
    };
    // On a phone, a finger put down on a thought must not move the page, or a held one is taken for a scroll and lost
    const onTouchStart = (event) => {
        const touch = event.touches[0];
        if (!touch || !event.cancelable || reduced || win) return;
        if (thoughtAt(onCanvas(touch), 1.7)) event.preventDefault();
    };
    // A touch on Sid: he breathes; with the keyboard, Enter on him lets go of the thought nearest to him
    const touchSid = (event) => {
        if (event?.clientX !== undefined && thoughtAt(onCanvas(event))) return;
        idle = 0;
        play('tap');
        dust?.boost(AURA_GROUP, 0.5);
    };
    const onKey = (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        idle = 0;
        const h = headAt();
        const list = alive().sort((a, b) => Math.hypot(a.x - h.x, a.y - h.y) - Math.hypot(b.x - h.x, b.y - h.y));
        if (list.length && !reduced && !win) letGoOf(list[0]);
        else touchSid(null);
    };

    // The thread from him to a thought held, as dots
    const THREAD_N = 28;
    const threadGroup = {
        count: THREAD_N,
        update(t, data) {
            data.alphas.fill(0);
            if (!held || held.thought.held < 0.05) return;
            const th = held.thought, h = headAt();
            for (let i = 0; i < THREAD_N; i++) {
                const u = (i + ((t * 1.5) % 1)) / THREAD_N;
                const sag = Math.sin(u * Math.PI) * th.r * 0.5 * (1 - th.held);
                data.positions[i * 3] = h.x + (th.x - h.x) * u;
                data.positions[i * 3 + 1] = h.y + (th.y - h.y) * u + sag;
                data.sizes[i] = 2.6 + 1.6 * th.held;
                data.alphas[i] = Math.min(1, th.held * 1.4) * (0.5 + 0.5 * Math.sin(u * Math.PI));
            }
        },
    };

    // Every frame: the thoughts, his balance, his aura and the rulito
    const game = (t, dt) => {
        idle += dt;
        if (!win && spawned < TOTAL && t > nextAt && alive().length < MAX_ON) {
            spawn();
            nextAt = t + EVERY * (0.8 + Math.random() * 0.4);
        }
        const h = headAt();
        const headR = 230 * k();
        let pull = 0;
        const slots = { '-1': 0, 1: 0 };
        thoughts.forEach((th) => {
            if (th.state === 'off') return;
            th.age += dt;
            th.hint = Math.max(0, th.hint - dt * 1.2);
            if (th.state === 'pop') {
                th.pop += dt / 0.45;
                if (th.pop >= 1) th.state = 'off';
                return;
            }
            if (th.state === 'float') {
                // It drifts to him, bobbing; close enough, it clings by his head
                th.x += th.vx * dt;
                th.y += (th.vy + Math.sin(th.age * 1.7 + th.phase) * th.r * 0.6) * dt;
                const reach = headR + th.r * 0.8;
                if (Math.hypot(th.x - h.x, th.y - h.y) < reach || (th.side < 0 ? th.x > h.x - headR : th.x < h.x + headR)) {
                    th.state = 'stuck';
                    play('tap');
                    sparks.burst(th.x, th.y, { n: 5, colors: [th.side < 0 ? FUTURE : MINT], speed: 30, life: 0.9, size: 3, spread: th.r * 0.5 });
                }
            }
            if (th.state === 'stuck') {
                // By his head, on its side, one over the other
                const slot = slots[th.side]++;
                const gx = h.x + th.side * (headR + th.r * (1 + 1.7 * slot)) * 0.82;
                const gy = h.y - headR * 0.55 + slot * th.r * 1.4 + Math.sin(th.age * 1.3 + th.phase) * th.r * 0.12;
                th.x += (gx - th.x) * Math.min(1, dt * 3);
                th.y += (gy - th.y) * Math.min(1, dt * 3);
                pull += th.side * LEAN;
            }
            if (th.state === 'held') {
                // Held: it clings, heavier the longer
                th.held = Math.min(1, Math.max(0, (t - held.at - HOLD * 0.5) / CLING));
                pull += th.side * (LEAN + (1.4 - LEAN) * th.held);
            }
        });
        // His balance: a spring, so he swings back and settles when he lets go
        const goal = win ? 0 : Math.max(-1, Math.min(1, pull));
        leanV += ((goal - lean) * 26 - leanV * 3.2) * dt;
        lean += leanV * dt;

        calm += ((released / TOTAL) - calm) * Math.min(1, dt * 2);
        // The hint, without words: still a while, the thought nearest to him shines (let it go)
        if (!held && !win && idle > 7) {
            const list = alive().sort((a, b) => Math.hypot(a.x - h.x, a.y - h.y) - Math.hypot(b.x - h.x, b.y - h.y));
            if (list.length) {
                idle = 0;
                list[0].hint = 1;
                sparks.burst(list[0].x, list[0].y, { n: 6, colors: [AURA], speed: 35, life: 1, size: 3, spread: list[0].r });
            }
        }

        // The rulito: born over his head, kept a while, then its tail catches its head and a new round begins
        let named = 0;
        if (win && rulito.value) {
            win.age += dt;
            win.pop = Math.max(0, win.pop - dt * 2.2);
            win.head = 1 - (1 - Math.min(1, Math.max(0, (win.age - DELAY) / GROW))) ** 1.6;
            if (win.head >= 1 && !win.full) { win.full = true; win.fullAt = win.age; win.pop = 1; play('rulito'); }
            if (win.full && !win.back && win.age - win.fullAt > LINGER) win.back = true;
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
                // Impermanence: everything passes, and the thoughts come again
                spawned = released = 0;
                deck = newDeck();
                nextAt = t + 3;
            }
        }
        stageEl?.style.setProperty('--name-glow', named.toFixed(3));
        stage.bloom = Math.max(named, win ? 0.5 : 0, 0.25 * calm);
        return named;
    };

    // ---- The two halves, as water and oil: the colours are drawn by the stage (field() in useLayerStage), which moves
    // the edge between them, lets drops pinch off and come back, and never mixes them. The scene only draws, small and
    // when the screen changes size, where each colour is: red, which of the two (softened round the edge, so the edge
    // can move within that band), green, where the ground is. Past the frame the land goes on mirrored
    const skyField = document.createElement('canvas');
    const groundField = document.createElement('canvas');
    const MARGIN = 120;                     // px drawn past each edge, for the camera's slide
    const FIELD = 0.35;                     // the fields' px per screen px: they are smooth, small is enough
    const SOFT = 3;                         // how soft the edge is (box blur radius, field px, three passes): how far it can move
    const fill = (ctx, loops) => {
        ctx.beginPath();
        loops.forEach((loop) => {
            ctx.moveTo(loop[0], loop[1]);
            for (let i = 2; i < loop.length; i += 2) ctx.lineTo(loop[i], loop[i + 1]);
            ctx.closePath();
        });
        ctx.fill('evenodd');
    };
    // In art px, for the frame and its mirrored copies on each side
    const copies = (ctx, area, draw) => {
        [-1, 0, 1].forEach((side) => {
            ctx.save();
            ctx.scale(FIELD, FIELD);
            ctx.translate(-area.left, -area.top);
            ctx.translate(sx(0), sy(0));
            ctx.scale(k(), k());
            if (side) { ctx.translate(side < 0 ? 0 : 2 * SIZE, 0); ctx.scale(-1, 1); }
            ctx.fillStyle = '#fff';
            draw(ctx);
            ctx.restore();
        });
    };
    // What a drawing covers (white on black), as 0..1 per field px
    const coverOf = (width, height, area, draw) => {
        const cv = document.createElement('canvas');
        cv.width = width;
        cv.height = height;
        const ctx = cv.getContext('2d', { willReadFrequently: true });
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, width, height);
        copies(ctx, area, draw);
        const px = ctx.getImageData(0, 0, width, height).data;
        const out = new Float32Array(width * height);
        for (let i = 0; i < out.length; i++) out[i] = px[i * 4] / 255;
        return out;
    };
    // A box blur, `passes` times each way (three come close to a gaussian)
    const blur = (values, width, height, radius, passes) => {
        let a = values, b = new Float32Array(values.length);
        const run = (from, to, n, stride, count, step) => {
            for (let line = 0; line < count; line++) {
                const base = line * step;
                let sum = 0;
                for (let i = -radius; i <= radius; i++) sum += from[base + Math.min(n - 1, Math.max(0, i)) * stride];
                for (let i = 0; i < n; i++) {
                    to[base + i * stride] = sum / (2 * radius + 1);
                    sum += from[base + Math.min(n - 1, i + radius + 1) * stride] - from[base + Math.max(0, i - radius) * stride];
                }
            }
        };
        for (let p = 0; p < passes; p++) {
            run(a, b, width, 1, height, width);
            run(b, a, height, width, width, 1);
        }
        return a;
    };
    const writeField = (canvas, width, height, which, shape) => {
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        const image = ctx.createImageData(width, height);
        for (let i = 0; i < width * height; i++) {
            image.data[i * 4] = Math.round(which[i] * 255);
            image.data[i * 4 + 1] = shape ? Math.round(shape[i] * 255) : 255;
            image.data[i * 4 + 3] = 255;
        }
        ctx.putImageData(image, 0, 0);
    };
    const paintRegions = (w, h) => {
        const area = { left: -MARGIN, top: -MARGIN, w: w + 2 * MARGIN, h: h + 2 * MARGIN };
        const width = Math.ceil(area.w * FIELD), height = Math.ceil(area.h * FIELD);
        // The sky: the future over the right side of the mint, and above the frame the colours of its top row
        const future = coverOf(width, height, area, (ctx) => {
            fill(ctx, R.future.loops);
            ctx.fillRect(R.futureTop, -SIZE, SIZE - R.futureTop, SIZE + 12);
        });
        const sky = blur(future, width, height, SOFT, 3);
        writeField(skyField, width, height, sky, null);
        fluids.sky.edge = edgeOf(sky, width, height, area);
        // The ground: the teal over the right side of the orange of the past; under the frame (a wide screen pushes it a
        // little under the bottom) it goes on
        const teal = coverOf(width, height, area, (ctx) => {
            fill(ctx, R.ground.loops);
            ctx.fillRect(SIZE / 2, SIZE - 2, SIZE / 2, SIZE);
        });
        const shape = coverOf(width, height, area, (ctx) => {
            fill(ctx, R.past.loops);
            ctx.fillRect(0, SIZE - 2, SIZE, SIZE);
        });
        const ground = blur(teal, width, height, SOFT, 3);
        const land = blur(shape, width, height, 1, 1);
        writeField(groundField, width, height, ground, land);
        // Only where the ground is, well under its top edge
        fluids.ground.edge = edgeOf(ground, width, height, area, (i) => land[i] > 0.99 && land[i - 12 * width] > 0.99);
        fluids.sky.drops.length = fluids.ground.drops.length = 0;
        return area;
    };

    // Drops of one colour let loose in the other. Now and then one swells out of the edge, pinches off, wanders a little
    // into the other colour and goes back to melt into its own (water and oil); a thought let go leaves one in the sky,
    // of its colour, which drifts home. `edge` holds points of each edge (where the field is half and half, in screen px
    // at rest) with the way into the second colour
    const fluids = { sky: { drops: [], edge: [], next: 1, most: 4 }, ground: { drops: [], edge: [], next: 2, most: 2 } };
    const edgeOf = (values, width, height, area, keep = () => true) => {
        const points = [];
        for (let tries = 0; points.length < 160 && tries < 60000; tries++) {
            const x = 1 + Math.floor(Math.random() * (width - 2)), y = 1 + Math.floor(Math.random() * (height - 2));
            const i = y * width + x;
            if (Math.abs(values[i] - 0.5) > 0.06 || !keep(i)) continue;
            const gx = values[i + 1] - values[i - 1], gy = values[i + width] - values[i - width];
            const g = Math.hypot(gx, gy);
            if (g < 1e-4) continue;
            const px = area.left + x / FIELD, py = area.top + y / FIELD;
            if (px < -40 || px > W + 40 || py < 0 || py > H) continue;
            points.push([px, py, gx / g, gy / g]);
        }
        return points;
    };
    const loose = (fluid, x, y, r, sign, out = null) => {
        if (fluid.drops.length >= 8) fluid.drops.shift();
        fluid.drops.push({ x, y, r, sign, out, age: 0, life: out ? 7 + Math.random() * 4 : 9 });
    };
    const dropFrom = (th) => {
        const drift = stage.drift(L.skyNode.z);
        // The past's thoughts carry the future's teal (the field's second colour)
        loose(fluids.sky, th.x - drift.x, th.y - drift.y - L.skyNode.y, th.r * 0.9, th.side < 0 ? 1 : -1);
    };
    const moveDrops = (t, dt) => {
        const home = sx(HEAD[0]);
        for (const [name, fluid] of Object.entries(fluids)) {
            // A new one swells out of the edge, into the other colour
            if (t > fluid.next && fluid.edge.length && fluid.drops.filter((d) => d.out).length < fluid.most) {
                fluid.next = t + 1.6 + Math.random() * 2.4;
                const [x, y, nx, ny] = fluid.edge[Math.floor(Math.random() * fluid.edge.length)];
                const sign = Math.random() < 0.5 ? 1 : -1;
                const r = (name === 'sky' ? 12 + Math.random() * 14 : 8 + Math.random() * 9) * Math.max(0.7, F.size / 900);
                // A drop of the second colour goes against the way into it, one of the first along it
                loose(fluid, x, y, r, sign, { x, y, nx: -sign * nx, ny: -sign * ny, far: r * (2.2 + Math.random() * 2.5), phase: Math.random() * 6.28 });
            }
            for (let i = fluid.drops.length - 1; i >= 0; i--) {
                const d = fluid.drops[i];
                d.age += dt;
                if (d.out) {
                    // Out, a while away, and back: it pinches off going and melts in coming back
                    const u = d.age / d.life;
                    const reach = Math.sin(Math.min(1, u) * Math.PI) ** 0.7;
                    const wander = Math.sin(d.age * 0.9 + d.out.phase) * d.r * 0.8 * reach;
                    d.x = d.out.x + d.out.nx * d.out.far * reach - d.out.ny * wander;
                    d.y = d.out.y + d.out.ny * d.out.far * reach + d.out.nx * wander;
                    if (u >= 1) fluid.drops.splice(i, 1);
                    continue;
                }
                // A thought's drop: towards its own half, rising a little; once there it melts into its colour
                const goal = home + d.sign * F.size * 0.35;
                d.x += (goal - d.x) * Math.min(1, dt * 0.25);
                d.y += (-F.size * 0.012 + Math.sin(d.age * 1.6) * 6) * dt;
                const there = d.sign > 0 ? d.x > home + F.size * 0.12 : d.x < home - F.size * 0.12;
                if (there || d.age > d.life) d.r *= Math.exp(-dt * 0.6);
                if (d.r < 3) fluid.drops.splice(i, 1);
            }
        }
        L.sky.drops = fluids.sky.drops.map((d) => [d.x, d.y, d.r, d.sign]);
        L.ground.drops = fluids.ground.drops.map((d) => [d.x, d.y, d.r, d.sign]);
    };

    const AURA_GROUP = 1;

    const build = (s) => {
        const sky = s.depth(zFor(DEPTH.sky));
        L.skyNode = sky;
        L.sky = sky.field({ source: skyField, colors: [MINT, FUTURE], flow: 1.5 });
        L.doodles = sky.image('/assets/upekkha/doodles.webp');
        sky.enter({ y: 20, delay: 0, duration: 1600 });

        const land = s.depth(zFor(DEPTH.land));
        L.landNode = land;
        L.ground = land.field({ source: groundField, colors: [R.past.color, R.ground.color], shaped: true, flow: 0.9 });
        L.water = [-1, 0, 1].map((side) => ({ side, node: land.image('/assets/upekkha/water.webp', { water: 0.7 }) }));
        L.fern = [-1, 0, 1].map((side) => ({ side, node: land.image('/assets/upekkha/fern.webp', { wind: { amp: 5, speed: 0.7, root: 'bottom' } }) }));
        L.land = [-1, 0, 1].map((side) => ({ side, node: land.image('/assets/upekkha/land.webp') }));
        L.flowers = art.flowers.map(() => {
            const g = land.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: 0xfff0a0, stops: [[0, 0.55], [0.3, 0.22], [0.65, 0]], bloom: true });
            return g;
        });
        land.enter({ y: 40, delay: 100, duration: 1700 });

        const sid = s.depth(zFor(DEPTH.sid));
        L.sidNode = sid;
        L.sid = sid.group();
        L.calm = L.sid.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: AURA, stops: [[0, 0.5], [0.35, 0.2], [0.7, 0]], bloom: true });
        L.calm.opacity = 0;
        L.body = L.sid.image('/assets/upekkha/sid.webp');
        L.rulito = L.sid.canvas(rulito.value.canvas, { bloom: true });
        sid.enter({ y: 60, delay: 300, duration: 1900 });

        // The thoughts, at the focal plane: a cluster of three ovals each, with a soft light
        const air = s.depth(0);
        L.thoughts = thoughts.map(() => {
            const group = air.group();
            const light = group.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: AURA, stops: [[0, 0.4], [0.4, 0.14], [0.7, 0]], bloom: true });
            const parts = [0, 1, 2].map(() => group.disc({ rect: { left: 0, top: 0, w: 1, h: 1 } }));
            group.opacity = 0;
            return { group, light, parts };
        });
    };

    // The cluster of a thought: one big oval and two small ones beside it, as the bubbles of the card
    const BUBBLES = [[0, 0, 1, 1.3, -14], [0.95, -0.55, 0.42, 0.56, 10], [1.0, 0.25, 0.3, 0.38, -6]];
    const placeThought = (th) => {
        const node = L.thoughts[th.i];
        const r = th.r;
        node.light.place({ left: -r * 2.4, top: -r * 2.4, w: r * 4.8, h: r * 4.8 });
        BUBBLES.forEach(([dx, dy, w, h, turn], j) => {
            const part = node.parts[j];
            const ox = dx * r * th.side * -1;
            part.place({ left: ox - w * r * 0.55, top: dy * r - h * r * 0.55, w: w * r * 1.1, h: h * r * 1.1 }, { x: ox, y: dy * r });
            part.rotate = turn * -th.side;
        });
        node.group.pivot = { x: 0, y: 0 };
    };

    let area = null;
    const place = (w, h) => {
        layout(w, h);
        area = paintRegions(w, h);
        L.sky.place(area);
        L.sky.refresh();
        L.ground.place(area);
        L.ground.refresh();
        L.doodles.place(rectOf(B.doodles));
        const water = rectOf(B.water), land = rectOf(B.land);
        // The mirrored copies: about the frame's left edge, and about its right one
        const mirror = (r, side) => (side < 0 ? { ...r, left: 2 * sx(0) - r.left - r.w } : side > 0 ? { ...r, left: 2 * sx(SIZE) - r.left - r.w } : r);
        L.water.forEach(({ side, node }) => { node.place(mirror(water, side)); node.sx = side ? -1 : 1; });
        L.land.forEach(({ side, node }) => { node.place(mirror(land, side)); node.sx = side ? -1 : 1; });
        L.fern.forEach(({ side, node }) => { node.place(mirror(rectOf(B.fern), side)); node.sx = side ? -1 : 1; });
        art.flowers.forEach(([x, y, r], i) => {
            const d = Math.max(40, r * 6 * k());
            L.flowers[i].place({ left: sx(x) - d / 2, top: sy(y) - d / 2, w: d, h: d });
        });

        L.body.place(rectOf(B.sid));
        L.sid.pivot = { x: sx(BASE[0]), y: sy(BASE[1]) };
        const cd = 1300 * k();
        L.calm.place({ left: sx(HEAD[0]) - cd / 2, top: sy(1060) - cd / 2, w: cd, h: cd });
        // The rulito where the card draws it (its canvas is bigger than the glyph, for the glow)
        const r = rectOf(art.rulito);
        const rh = r.h, rw = rh * 32 / 86;
        glyph = { left: r.left + r.w / 2 - rw / 2, top: r.top, w: rw, h: rh };
        L.rulito.place({ left: glyph.left - 0.4375 * glyph.w, top: glyph.top - 0.1628 * glyph.h, w: glyph.w * 1.875, h: glyph.h * 1.3256 },
            { x: glyph.left + glyph.w / 2, y: glyph.top + glyph.h });
        thoughts.forEach((th) => { if (th.state !== 'off') th.r = Math.max(18, 70 * k()); });
    };

    // The touch target for the keyboard and for a touch on Sid
    const placeHits = () => {
        if (!L.sid || !sidHit.value) return;
        const b = L.sid.boxOnScreen(rectOf([880, 600, 400, 900]));
        const bw = Math.max(56, b.width), bh = Math.max(56, b.height);
        sidHit.value.style.translate = `${(b.left + b.width / 2 - bw / 2).toFixed(1)}px ${(b.top + b.height / 2 - bh / 2).toFixed(1)}px`;
        sidHit.value.style.width = `${bw.toFixed(1)}px`;
        sidHit.value.style.height = `${bh.toFixed(1)}px`;
    };

    const enter = () => {
        if (entered || !props.active || !stage) return;
        entered = true;
        stage.ready().then(() => { if (!gone) { stage.start(); dust?.reveal(); } });
    };

    let frames = 0;
    const frame = ({ x, y, scroll, t, ramp }) => {
        if (!stage || !L.sid) return;
        const dt = Math.min(0.1, Math.max(0, t - lastT));
        lastT = t;
        stage.look(x * SLIDE, y * SLIDE_Y);
        const named = reduced ? 0 : game(t, dt);

        // ---- The two halves: the edge between them churns more the farther he is pulled, and rests (still apart) when
        // he is still
        moveDrops(t, dt);
        const unrest = Math.min(1, Math.abs(lean));
        L.sky.uniforms.uWobble.value = (1 + 0.6 * unrest) * (1 - 0.45 * named);
        L.ground.uniforms.uWobble.value = (0.75 + 0.3 * unrest) * (1 - 0.45 * named);

        // ---- The sky's doodles drift a little
        L.doodles.y = Math.sin(t * 0.4) * 6 * ramp;
        L.doodles.x = Math.sin(t * 0.23) * 8 * ramp;
        L.skyNode.y = scroll * 8;
        L.landNode.y = scroll * 18;

        // ---- The little flowers glow
        art.flowers.forEach((_, i) => {
            const g = L.flowers[i];
            g.opacity = 0.55 + 0.2 * Math.sin(t * 1.4 + i * 1.7) * ramp + 0.25 * named;
        });

        // ---- Sid: he breathes, leans to where he is pulled, and his aura grows calmer and brighter
        const lift = Math.sin(t * 0.7) * 2.5 * ramp;
        L.sid.x = lean * 0.05 * F.size;
        L.sid.y = lift;
        L.sid.rotate = lean * 5;
        L.body.sy = 1 + 0.01 * Math.sin(t * 0.7) * ramp;
        L.calm.opacity = Math.min(1, 0.15 + 0.45 * calm + 0.5 * named);
        L.calm.scale = 0.85 + 0.25 * calm + 0.15 * named + 0.03 * Math.sin(t * 0.7);
        L.body.uniforms.uBright.value = 1 + 0.06 * calm + 0.12 * named;
        L.sidNode.y = scroll * 26;
        dust?.fade(AURA_GROUP, 0.55 + 0.45 * Math.max(calm, named));

        // ---- The thoughts
        thoughts.forEach((th) => {
            const node = L.thoughts[th.i];
            if (th.state === 'off') { node.group.opacity = 0; return; }
            placeThought(th);
            node.group.x = th.x;
            node.group.y = th.y;
            const popping = th.state === 'pop' ? ease(Math.min(1, th.pop)) : 0;
            const born = Math.min(1, th.age / 0.6);
            node.group.opacity = born * (1 - popping);
            node.group.scale = (0.6 + 0.4 * born) * (1 + 0.45 * th.held + 0.5 * popping + 0.12 * th.hint) * (1 + 0.03 * Math.sin(t * 2 + th.phase));
            node.light.opacity = 0.4 + 0.6 * th.hint + 0.5 * th.held;
        });

        // The particles that belong to a layer follow it
        const skyDrift = stage.drift(L.skyNode.z), landDrift = stage.drift(L.landNode.z), sidDrift = stage.drift(L.sidNode.z);
        dust?.shift(0, skyDrift.x, skyDrift.y + L.skyNode.y);
        dust?.turn(AURA_GROUP, L.sid.rotate, sx(BASE[0]), sy(BASE[1]));
        dust?.shift(AURA_GROUP, sidDrift.x + L.sid.x, sidDrift.y + L.sidNode.y + L.sid.y);
        dust?.shift(2, landDrift.x, landDrift.y + L.landNode.y);
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
        dust = startStardust(null, {
            stage,
            manual: true,
            groups: [
                // 0: the specks of the sky
                { colors: [art.dots.color], parallax: 0, drift: 1.5, twinkle: 0.3, reach: 0, opacity: 0.75, order: after(L.doodles), points: () => fromArt(art.dots.list, art.dots.color) },
                // 1: the aura round Sid, brighter as he lets go
                { colors: [AURA], parallax: 0, drift: 1.4, jitter: 0.35, twinkle: 0.4, reach: 0, bloom: true, order: after(L.calm), points: () => fromArt(art.aura, AURA, 1.2) },
                // 2: the yellow light round the mushrooms, alive and stirred by a finger
                { colors: [GLOW], look: 'soft', parallax: 0, drift: 2, jitter: 0.4, twinkle: 0.45, reach: 70, push: 14, bloom: true, order: after(L.fern[2].node), points: () => fromArt(art.glow, GLOW, 1.3) },
                // 3: the thread to a thought held
                { colors: [AURA], dynamic: threadGroup, look: 'soft', parallax: 0, drift: 0, twinkle: 0, reach: 0, bloom: true, order: 1e6 - 1 },
                // 4: sparks
                { ...sparks.group(), order: 1e6 },
            ],
        });
        if (reduced) dust.reveal();
        root.value.addEventListener('pointerdown', press);
        // Only in development: lets a test look at the game
        if (import.meta.env.DEV) root.value.__game = { get thoughts() { return thoughts; }, get released() { return released; }, get win() { return win; }, get lean() { return lean; } };
        root.value.addEventListener('touchstart', onTouchStart, { passive: false });
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
        stageEl?.style.removeProperty('--name-glow');
        root.value?.removeEventListener('pointerdown', press);
        root.value?.removeEventListener('touchstart', onTouchStart);
        window.removeEventListener('pointerup', release);
        window.removeEventListener('pointercancel', release);
    });
</script>

<template>
    <div class="scene" ref="root">
        <canvas class="stageCanvas" ref="canvas"></canvas>
        <!-- The rulito is drawn on its own canvas, which the stage shows as a texture over Sid -->
        <Rulito ref="rulito" class="offstage" :color="art.rulitoColor" />
        <div ref="sidHit" class="hit" role="button" tabindex="0"
            :aria-label="$i18n.locale === 'en' ? 'Sid: let go of the thoughts that come to him from the past and the future' : 'Sid: soltá los pensamientos que le llegan del pasado y del futuro'"
            @pointerdown="touchSid" @keydown="onKey"></div>
    </div>
</template>

<style scoped>
    .scene {
        position: absolute;
        inset: 0;
        overflow: hidden;
        background: #b3dfd2;
    }

    .stageCanvas {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        display: block;
        pointer-events: none;
    }

    .offstage {
        position: absolute;
        left: -9999px;
        top: 0;
        width: 40px;
        visibility: hidden;
    }

    /* Taps only on Sid, so the page still scrolls from him */
    .hit {
        position: absolute;
        left: 0;
        top: 0;
        width: 0;
        height: 0;
        border-radius: 45%;
        cursor: pointer;
        pointer-events: auto;
        -webkit-tap-highlight-color: transparent;
        touch-action: manipulation;
        outline: none;
    }

    .hit:focus-visible {
        outline: 2px solid rgba(247, 248, 241, 0.95);
        outline-offset: 2px;
    }
</style>
