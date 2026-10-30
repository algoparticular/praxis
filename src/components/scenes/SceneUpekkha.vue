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
    // The flat colours behind the drawing are not pictures: the edge between the two halves of the sky, and of the
    // ground, and the bubbles of one colour in the other were read from the card by the converter, and the stage draws
    // them (field()) as two liquids that never mix, with a thin light membrane between them: the edge keeps the card's S
    // and a slow wave runs along it, and the card's bubbles are alive: they fall back into their own colour and bud off
    // it again, slipping into the other; it stirs more the more he is pulled, and a thought let go leaves a small drop
    // of its colour that drifts home and falls into it. The specks of the sky, the stipple round Sid and
    // the yellow light of the mushrooms are particles. It is drawn in WebGL (useLayerStage), with the land mirrored past
    // the frame on wide screens. From upekkhaScene.json and public/assets/upekkha (made by scripts/convert-upekkha.mjs).
    import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { createParallax } from '../../composables/useParallax.js';
    import { createLayerStage, FIELD_RANGE, FIELD_BUBBLES } from '../../composables/useLayerStage.js';
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
    const BOTTOM = 1640, SID_TOP = 560;     // wide screens: the art row at the bottom, and the top of Sid's head
    const TOP = 130;                        // px left over him for the card's name
    const layout = (w, h) => {
        W = w; H = h;
        const phone = w < h;
        if (phone) {
            const size = Math.min(0.78 * h, w * SIZE / SPAN);
            let x = w / 2 - size / 2;
            if (size > w) x = Math.min(0, Math.max(w - size, w / 2 - FOCUS * size / SIZE));
            F = { x, y: h - size, size };
            return;
        }
        // On a wide screen the drawing fills the width (its mirrored copies stay out of sight) and goes on under the
        // bottom of the screen, as far as Sid and a strip of ground in front of him still show; only a screen too wide
        // for that leaves room at the sides
        const size = Math.min(w, Math.max(0.4 * w, (h - TOP) * SIZE / (BOTTOM - SID_TOP)));
        F = { x: w / 2 - size / 2, y: h - BOTTOM * size / SIZE, size };
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
    const thoughts = Array.from({ length: MAX_ON + 1 }, (_, i) => ({ i, state: 'off', x: 0, y: 0, vx: 0, vy: 0, side: 1, r: 1, age: 0, pop: 0, slot: 0, phase: Math.random() * 6.28, hint: 0, held: 0, shape: [], insist: 0 }));
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
        const r = Math.max(16, 70 * k() * (0.7 + Math.random() * 0.6));
        const top = titleBottom() + r * 1.4, bottom = Math.max(top + 1, sy(1150));
        const y = top + Math.random() * (bottom - top);
        const x = side < 0 ? -r * 1.6 : W + r * 1.6;
        const to = headAt();
        const d = Math.hypot(to.x - x, to.y - y) || 1;
        const speed = Math.max(F.size * 0.045, d / TRAVEL);
        Object.assign(th, { state: 'float', x, y, vx: (to.x - x) / d * speed, vy: (to.y - y) / d * speed, side, r, age: 0, pop: 0, hint: 0, held: 0, phase: Math.random() * 6.28, shape: newShape(), insist: Math.random() < 0.3 ? 1 : 0 });
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

    // ---- The sky, alive as Dana's: a far plane of tiny stars (on the mint of the past they are specks of its ink, on
    // the night of the future pale stars), shooting stars now and then over the night, a light dust floating up close
    // to the eye, and low over the night's ground, spores rising from the mushrooms and fading before they get high
    const put = (data, i, x, y, size, alpha, color) => {
        data.positions[i * 3] = x;
        data.positions[i * 3 + 1] = y;
        data.sizes[i] = size;
        data.alphas[i] = alpha;
        data.tints[i * 3] = ((color >> 16) & 255) / 255;
        data.tints[i * 3 + 1] = ((color >> 8) & 255) / 255;
        data.tints[i * 3 + 2] = (color & 255) / 255;
    };
    // Which half of the sky a point of the screen is on (true: the night of the future)
    const onNight = (x, y) => {
        let xa = (x - F.x) / k();
        const ya = (y - F.y) / k();
        if (xa < 0) xa = -xa;
        else if (xa > SIZE) xa = 2 * SIZE - xa;
        return xa > edgeAt(0, ya);
    };
    const STAR_INK = art.dots.color, STAR = [0xfaf3d4, 0xd8f4f2, 0xf6e27c];
    const farStars = (w, h) => {
        const bottom = sy(1250), list = [];
        const n = Math.round(Math.min(320, (w * h) / 2600));
        for (let i = 0; i < n; i++) {
            const x = -40 + Math.random() * (w + 80), y = -40 + Math.random() * (bottom + 40);
            const night = onNight(x, y);
            list.push([x, y, night ? 1.6 + Math.random() * 2.6 : 1 + Math.random() * 1.4, night ? STAR[i % 3] : STAR_INK]);
        }
        return list;
    };
    // Shooting stars, silent: over the night, away from the edge, a soft cream head and a yellow tail that fades
    const TAIL = 22, SHOOTERS = 2;
    const shooters = Array.from({ length: SHOOTERS }, (_, j) => ({ at: 3 + j * 5, x: 0, y: 0, dx: 0, dy: 0, T: 1 }));
    const shooting = {
        count: SHOOTERS * TAIL,
        update(t, data) {
            if (!stage) return;
            const w = stage.width, h = stage.height;
            shooters.forEach((f, j) => {
                if (t > f.at + f.T) {
                    f.at = t + 4 + Math.random() * 9;
                    f.T = 0.7 + Math.random() * 0.5;
                    const speed = (0.3 + Math.random() * 0.25) * Math.max(w, h);
                    // From near the edge, out into the night (to the right), falling
                    const y = titleBottom() + Math.random() * Math.max(10, sy(800) - titleBottom());
                    f.x = sx(edgeAt(0, (y - F.y) / k())) + 40 + Math.random() * 80;
                    f.y = y;
                    f.dx = speed;
                    f.dy = speed * (0.25 + Math.random() * 0.3);
                }
                const u = (t - f.at) / f.T;
                for (let n = 0; n < TAIL; n++) {
                    const i = j * TAIL + n;
                    const life = Math.max(0, u - n * 0.006);
                    const x = f.x + f.dx * life * f.T, y = f.y + f.dy * life * f.T;
                    if (u < 0 || u > 1 || !onNight(x, y)) { data.alphas[i] = 0; continue; }
                    put(data, i, x, y, n ? Math.max(1.6, 6 - n * 0.2) : 9, Math.min(1, Math.sin(u * Math.PI) * 1.4) * (1 - n / TAIL) ** 0.7, n < 3 ? 0xfffbe6 : 0xf6e27c);
                }
            });
        },
    };
    // Spores: born round the mushrooms of the night (where their yellow light is), they rise slowly, sway and fade low
    const SPORES = 60;
    let nightGlow = null;
    const spores = Array.from({ length: SPORES }, () => ({ at: -Math.random() * 8, T: 1, x: 0, y: 0, rise: 0, phase: 0, size: 2, color: GLOW }));
    const sporeGroup = {
        count: SPORES,
        update(t, data) {
            nightGlow ??= art.glow.filter(([x, y]) => x > edgeAt(1, y) + 60);
            if (!stage || !nightGlow.length) return;
            spores.forEach((p, i) => {
                if (t > p.at + p.T) {
                    const [x, y] = nightGlow[Math.floor(Math.random() * nightGlow.length)];
                    Object.assign(p, { at: t + Math.random() * 1.5, T: 5 + Math.random() * 5, x, y, rise: 60 + Math.random() * 140, phase: Math.random() * 6.28, size: 3.5 + Math.random() * 4, color: Math.random() < 0.7 ? GLOW : 0xe4ffb0 });
                }
                const u = (t - p.at) / p.T;
                if (u < 0) { data.alphas[i] = 0; return; }
                const ax = p.x + Math.sin(t * 0.8 + p.phase) * 18 + u * 30 * Math.sin(p.phase), ay = p.y - p.rise * u;
                put(data, i, sx(ax), sy(ay), p.size, Math.sin(Math.PI * Math.min(1, u)) * (0.75 + 0.25 * Math.sin(t * 3 + p.phase)), p.color);
            });
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
                pull += th.side * LEAN * (1 + 0.6 * th.insist);
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

    // ---- The two halves, as two liquids that never mix: the colours are drawn by the stage (field() in useLayerStage),
    // which moves the edge between them and draws the membrane. The scene only writes, small and when the screen
    // changes size, how far each px is from the edge (red; the edge is the curve the converter read from the card, a
    // smooth S, read on the slope so it is a true distance) and, for the ground, where it is (green). Past the frame the
    // land goes on mirrored, and above it the sky's edge goes on the way it comes in, so it never ends in a line
    const skyField = document.createElement('canvas');
    const groundField = document.createElement('canvas');
    const MARGIN = 120;                     // px drawn past each edge, for the camera's slide
    const FIELD = 0.5;                      // the fields' px per screen px: they are smooth, small is enough
    const fill = (ctx, loops) => {
        ctx.beginPath();
        loops.forEach((loop) => {
            ctx.moveTo(loop[0], loop[1]);
            for (let i = 2; i < loop.length; i += 2) ctx.lineTo(loop[i], loop[i + 1]);
            ctx.closePath();
        });
        ctx.fill('evenodd');
    };
    // What the ground covers (white on black), as 0..1 per field px, in the frame and its mirrored copies on each side
    const groundShape = (width, height, area) => {
        const cv = document.createElement('canvas');
        cv.width = width;
        cv.height = height;
        const ctx = cv.getContext('2d', { willReadFrequently: true });
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, width, height);
        [-1, 0, 1].forEach((side) => {
            ctx.save();
            ctx.scale(FIELD, FIELD);
            ctx.translate(-area.left, -area.top);
            ctx.translate(sx(0), sy(0));
            ctx.scale(k(), k());
            if (side) { ctx.translate(side < 0 ? 0 : 2 * SIZE, 0); ctx.scale(-1, 1); }
            ctx.fillStyle = '#fff';
            fill(ctx, R.past.loops);
            ctx.fillRect(0, SIZE - 2, SIZE, SIZE);
            ctx.restore();
        });
        const px = ctx.getImageData(0, 0, width, height).data;
        const out = new Uint8ClampedArray(width * height);
        for (let i = 0; i < out.length; i++) out[i] = px[i * 4];
        // Softened a little (one box blur each way) so the shader can draw its edge smooth
        const tmp = new Uint8ClampedArray(out.length);
        for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
            const i = y * width + x;
            tmp[i] = (out[i - (x > 0 ? 1 : 0)] + out[i] + out[i + (x < width - 1 ? 1 : 0)]) / 3;
        }
        for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
            const i = y * width + x;
            out[i] = (tmp[i - (y > 0 ? width : 0)] + tmp[i] + tmp[i + (y < height - 1 ? width : 0)]) / 3;
        }
        return out;
    };
    // The edge of a half (0 the sky, 1 the ground) at a height, art px. Above the sky's first row it goes on the way
    // it comes in (up and to the right, as the card's future sweeps in from the top corner), bending slowly upright
    const RISE = 320;                       // art px over which it bends upright above the frame
    const edgeAt = (plane, y) => {
        const e = R.edge[plane];
        if (plane === 0 && y < 0) {
            const slope = (e.x[3] - e.x[0]) / (3 * e.step);
            return e.x[0] - slope * RISE * (1 - Math.exp(y / RISE));
        }
        const f = Math.min(e.x.length - 1, Math.max(0, (y - e.y0) / e.step));
        const i = Math.min(e.x.length - 2, Math.floor(f));
        return e.x[i] + (e.x[i + 1] - e.x[i]) * (f - i);
    };
    const writeField = (canvas, width, height, area, plane, shape) => {
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        const image = ctx.createImageData(width, height);
        const scale = k();
        for (let fy = 0; fy < height; fy++) {
            const ya = (area.top + (fy + 0.5) / FIELD - F.y) / scale;
            const e = edgeAt(plane, ya);
            const slope = (edgeAt(plane, ya + 6) - edgeAt(plane, ya - 6)) / 12;
            const norm = scale / Math.sqrt(1 + slope * slope) / (2 * FIELD_RANGE);
            for (let fx = 0; fx < width; fx++) {
                let xa = (area.left + (fx + 0.5) / FIELD - F.x) / scale;
                if (xa < 0) xa = -xa;
                else if (xa > SIZE) xa = 2 * SIZE - xa;
                const i = fy * width + fx;
                image.data[i * 4] = Math.round(Math.min(1, Math.max(0, 0.5 + (xa - e) * norm)) * 255);
                image.data[i * 4 + 1] = shape ? shape[i] : 255;
                image.data[i * 4 + 3] = 255;
            }
        }
        ctx.putImageData(image, 0, 0);
    };
    const paintRegions = (w, h) => {
        const area = { left: -MARGIN, top: -MARGIN, w: w + 2 * MARGIN, h: h + 2 * MARGIN };
        const width = Math.ceil(area.w * FIELD), height = Math.ceil(area.h * FIELD);
        writeField(skyField, width, height, area, 0, null);
        writeField(groundField, width, height, area, 1, groundShape(width, height, area));
        drops.length = 0;
        return area;
    };

    // ---- The bubbles, alive: one colour slipping into the other without mixing. Those of the card that are close
    // together go as one cluster, as the card draws them. A cluster rests out in the other colour, swaying and roaming
    // a little, then floats back to the edge and falls into its own colour; a while later it buds off it again from
    // another place along the edge, the biggest first and the small ones after it, and floats out to somewhere near
    // where the card has it. Besides them, wanderers: small clusters that bud off anywhere along the edge, cross into
    // the other colour, drift there a while and come back to fall in somewhere else
    const clusters = [];
    R.bubbles.forEach(([x, y, rx, ry, angle, plane, colour]) => {
        const b = { x, y, rx, ry, angle, phase: Math.random() * 6.28 };
        const near = clusters.find((c) => c.plane === plane && c.colour === colour && c.members.some((m) => Math.hypot(m.x - x, m.y - y) < 170));
        if (near) near.members.push(b);
        else clusters.push({ plane, colour, members: [b], state: 'home', timer: 3 + Math.random() * 12, p: 1, dx: 0, dy: 0, ey: 0 });
    });
    const HOME = [8, 14], GO = 3.6, AWAY = [1.5, 4], COME = 5;      // s resting out, going in, gone, coming out
    const LAG = 0.14;                       // how far behind its cluster each smaller bubble goes
    const between = ([a, b]) => a + Math.random() * (b - a);

    const SPAN_Y = [[-150, 1150], [1420, 2120]];    // where along the edge of each half wanderers bud off (art px)
    const WANDERERS = [4, 4];               // at most at once, in the sky and in the ground
    const wanderers = [];
    let nextWanderer = 2;
    const newWanderer = () => {
        const counts = [0, 1].map((plane) => wanderers.filter((w) => w.plane === plane).length);
        const open = [0, 1].filter((plane) => counts[plane] < WANDERERS[plane]);
        if (!open.length) return;
        const plane = open[Math.floor(Math.random() * open.length)];
        const toward = Math.random() < 0.5 ? 1 : -1;
        const y = between(SPAN_Y[plane]);
        const size = between([16, 42]);
        const angle = 1.3 + (Math.random() - 0.5) * 0.8;
        const n = 1 + Math.floor(Math.random() * 3);
        const members = Array.from({ length: n }, (_, j) => {
            const r = size * Math.pow(0.55, j);
            return { rx: r * between([1.3, 1.9]), ry: r, angle: angle + (Math.random() - 0.5) * 0.4, phase: Math.random() * 6.28, off: [(Math.random() - 0.5) * size, j * size * 1.3] };
        });
        const reach = between([90, 260]);
        const rise = (Math.random() - 0.5) * 300;
        wanderers.push({
            plane, toward, members, age: 0,
            from: y, to: y + rise, back: y + rise + (Math.random() - 0.5) * 320, reach,
            out: between([5, 8]), stay: between([3, 9]), home: between([5, 7]),
            drift: (Math.random() - 0.5) * 14,
        });
    };
    // Where a wanderer is at a time (art px): out of its own colour, drifting, then back in somewhere else
    const wandererAt = (w, t) => {
        const inside = (y) => edgeAt(w.plane, y) + w.toward * 70;
        const outside = (y) => edgeAt(w.plane, y) - w.toward * w.reach;
        if (t < w.out) {
            const p = ease(Math.max(0, t / w.out));
            const y = w.from + (w.to - w.from) * p;
            return { x: inside(y) + (outside(y) - inside(y)) * p, y };
        }
        if (t < w.out + w.stay) {
            const y = w.to + w.drift * (t - w.out);
            return { x: outside(y), y };
        }
        const p = ease(Math.min(1, (t - w.out - w.stay) / w.home));
        const y0 = w.to + w.drift * w.stay, y = y0 + (w.back - y0) * p;
        return { x: outside(y) + (inside(y) + w.toward * 30 - outside(y)) * p, y };
    };

    const moveClusters = (dt, t) => {
        clusters.forEach((c) => {
            c.timer -= dt;
            if (c.state === 'home' && c.timer <= 0) { c.state = 'in'; c.ey = (Math.random() - 0.5) * 300; }
            else if (c.state === 'in') {
                c.p = Math.max(0, c.p - dt / GO);
                if (!c.p) { c.state = 'away'; c.timer = between(AWAY); }
            } else if (c.state === 'away' && c.timer <= 0) {
                c.state = 'out';
                c.ey = (Math.random() - 0.5) * 300;
                c.dx = (Math.random() - 0.5) * 120;
                c.dy = (Math.random() - 0.5) * 160;
            } else if (c.state === 'out') {
                c.p = Math.min(1, c.p + dt / COME);
                if (c.p === 1) { c.state = 'home'; c.timer = between(HOME); }
            }
        });
        if (dt) {
            nextWanderer -= dt;
            if (nextWanderer <= 0) { newWanderer(); nextWanderer = between([1.5, 4]); }
        }
        const list = [[], []];
        const scale = k();
        clusters.forEach((c) => {
            const toward = c.colour ? 1 : -1;               // where its own colour is: the second is on the right
            const n = c.members.length;
            c.members.forEach((m, j) => {
                const lag = j * LAG, most = (n - 1) * LAG;
                const p = ease(Math.min(1, Math.max(0, (c.p * (1 + most) - lag))));
                const breathe = 1 + 0.06 * Math.sin(t * 0.8 + m.phase);
                // Out, it roams slowly round its place
                const hx = m.x + c.dx + Math.sin(t * 0.21 + m.phase) * 22, hy = m.y + c.dy + Math.cos(t * 0.17 + m.phase) * 30;
                // Gone: well inside its own colour, past the edge, somewhere else along it
                const gy = hy + c.ey;
                const gx = edgeAt(c.plane, gy) + toward * (Math.max(m.rx, m.ry) + 40);
                const x = gx + (hx - gx) * p;
                const y = gy + (hy - gy) * p - Math.sin(Math.PI * p) * 24 * toward;
                const angle = m.angle + Math.sin(t * 0.27 + m.phase) * 0.25;
                list[c.plane].push([sx(x), sy(y), m.rx * breathe * scale, m.ry / breathe * scale, angle, toward]);
            });
        });
        for (let i = wanderers.length - 1; i >= 0; i--) {
            const w = wanderers[i];
            w.age += dt;
            if (w.age > w.out + w.stay + w.home + 1.5) { wanderers.splice(i, 1); continue; }
            w.members.forEach((m, j) => {
                // The smaller ones follow the first, a little behind it
                const at = wandererAt(w, Math.max(0, w.age - j * 0.5));
                const sway = Math.sin(t * 0.9 + m.phase) * 8;
                const breathe = 1 + 0.07 * Math.sin(t * 1.1 + m.phase);
                const angle = m.angle + Math.sin(t * 0.4 + m.phase) * 0.3;
                list[w.plane].push([sx(at.x + m.off[0] * 0.3 + sway), sy(at.y + m.off[1] * 0.4), m.rx * breathe * scale, m.ry / breathe * scale, angle, w.toward]);
            });
        }
        return list;
    };

    // A thought let go leaves a small drop of its colour in the sky, which drifts back to its own half and falls into it
    const drops = [];
    const dropFrom = (th) => {
        if (drops.length >= 8) drops.shift();
        const drift = stage.drift(L.skyNode.z);
        // The past's thoughts carry the future's teal (the field's second colour)
        drops.push({ x: th.x - drift.x, y: th.y - drift.y - L.skyNode.y, r: th.r * 0.45, sign: th.side < 0 ? 1 : -1, age: 0 });
    };
    const moveDrops = (dt) => {
        const home = sx(HEAD[0]);
        for (let i = drops.length - 1; i >= 0; i--) {
            const d = drops[i];
            d.age += dt;
            d.x += (home + d.sign * F.size * 0.35 - d.x) * Math.min(1, dt * 0.3);
            d.y += (-F.size * 0.01 + Math.sin(d.age * 1.6) * 5) * dt;
            if (d.age > 12) d.r *= Math.exp(-dt * 0.8);
            if (d.r < 2) drops.splice(i, 1);
        }
        return drops.map((d) => [d.x, d.y, d.r, d.r, 0, d.sign]);
    };

    const AURA_GROUP = 1;

    const build = (s) => {
        const sky = s.depth(zFor(DEPTH.sky));
        L.skyNode = sky;
        L.sky = sky.field({ source: skyField, colors: [MINT, FUTURE] });
        sky.enter({ y: 20, delay: 0, duration: 1600 });

        const land = s.depth(zFor(DEPTH.land));
        L.landNode = land;
        L.ground = land.field({ source: groundField, colors: [R.past.color, R.ground.color], shaped: true, flow: 0.7 });
        // In the order the card draws them, each in the frame and in its mirrored copies: the pond (its water rippling
        // with light, its outline, the white of its shine drifting and trembling), the little yellow plants (each on its
        // own, swaying from its foot), the fern, the land, the crystals (a light sweeps across them now and then) and
        // the rocks and line work over them
        const trio = (name, opts) => [-1, 0, 1].map((side) => ({ side, name, node: land.image(`/assets/upekkha/${name}.webp`, opts) }));
        L.water = trio('water');
        L.pond = trio('pond');
        // The little waves and the white shines of the pond, each on its own, drifting on the water
        const pieces = (name, boxes) => boxes.map((box) => {
            const [x, y, w, h] = box, P = B[name];
            return { box, phase: Math.random() * 6.28, copies: trio(name, { crop: [(x - P[0]) / P[2], (y - P[1]) / P[3], w / P[2], h / P[3]] }) };
        });
        L.floating = [...pieces('waves', art.waves), ...pieces('shine', art.shines)];
        L.plants = art.plants.map((box) => {
            const [x, y, w, h] = box, P = B.plants;
            const crop = [(x - P[0]) / P[2], (y - P[1]) / P[3], w / P[2], h / P[3]];
            // The taller, the more it sways
            return { box, copies: trio('plants', { crop, wind: { amp: Math.min(9, 2 + h / 60), speed: 0.8 + Math.random() * 0.5, root: 'bottom' } }) };
        });
        L.fern = trio('fern', { wind: { amp: 5, speed: 0.7, root: 'bottom' } });
        L.land = trio('land');
        L.crystals = trio('crystals', { sheen: 0.9 });
        L.rocks = trio('rocks');
        const light = (color, strength) => land.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color, stops: [[0, strength], [0.3, strength * 0.4], [0.65, 0]], bloom: true });
        L.flowers = art.flowers.map(() => light(0xfff0a0, 0.6));
        L.sprouts = art.sprouts.map(() => light(0xfff0a0, 0.5));
        // A crystal glints now and then: a quick light, as a facet catches the sun
        L.glints = art.crystals.map(() => ({ node: light(0xf4fbff, 0.9), at: 2 + Math.random() * 8 }));
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
            const parts = [0, 1, 2, 3].map(() => group.disc({ rect: { left: 0, top: 0, w: 1, h: 1 } }));
            group.opacity = 0;
            return { group, light, parts };
        });
    };

    // The shape of a thought: one big oval and none to three small drops round it, as the bubbles of the card, each
    // thought its own: [dx, dy, w, h, turn (deg), phase] in its radius, the big one first
    const newShape = () => {
        const shape = [[0, 0, 0.85 + Math.random() * 0.35, 1.1 + Math.random() * 0.45, (Math.random() - 0.5) * 30, 0]];
        const n = Math.floor(Math.random() * 4);
        let angle = -1.2 + Math.random() * 0.6;
        for (let j = 0; j < n; j++) {
            const size = 0.22 + Math.random() * 0.28;
            const dist = 0.85 + size * 0.6 + Math.random() * 0.2;
            shape.push([Math.cos(angle) * dist, Math.sin(angle) * dist, size, size * (1.1 + Math.random() * 0.4), (Math.random() - 0.5) * 40, Math.random() * 6.28]);
            angle += 0.7 + Math.random() * 0.6;
        }
        return shape;
    };
    // Each frame: the thought moves as a liquid. The big drop stretches along its way and trembles like jelly; the small
    // ones drift round it, close in until they touch it and part again. Clinging to him, it flattens a little against
    // his aura and quivers; an insistent one quivers more
    const placeThought = (th, t) => {
        const node = L.thoughts[th.i];
        const r = th.r;
        node.light.place({ left: -r * 2.4, top: -r * 2.4, w: r * 4.8, h: r * 4.8 });
        const speed = th.state === 'float' ? Math.hypot(th.vx, th.vy) / Math.max(1, F.size * 0.1) : 0;
        const stretch = Math.min(0.22, speed * 0.12);
        const clinging = th.state === 'stuck' || th.state === 'held' ? 1 : 0;
        const quiver = clinging * (0.04 + 0.05 * th.insist + 0.05 * th.held) * Math.sin(t * 17 + th.phase);
        const away = -th.side;           // the side away from him
        node.parts.forEach((part, j) => {
            const piece = th.shape[j];
            if (!piece) { part.opacity = 0; return; }
            part.opacity = 1;
            const [dx, dy, w, h, turn, phase] = piece;
            let ox = dx * r * away, oy = dy * r;
            if (j) {
                // The small drops breathe in and out round the big one: in, they touch it and seem to merge
                const breathe = 0.82 + 0.22 * Math.sin(t * (0.9 + 0.2 * j) + phase);
                ox *= breathe;
                oy = oy * breathe + Math.sin(t * 1.3 + phase) * r * 0.08;
            }
            const jelly = 0.07 * Math.sin(t * (2.6 + 0.4 * j) + th.phase + phase);
            const sx = 1 + jelly + (j ? 0 : stretch) - (j ? 0 : 0.1 * clinging) + quiver;
            const sy = 1 - jelly - (j ? 0 : stretch * 0.6) + (j ? 0 : 0.06 * clinging) - quiver;
            part.place({ left: ox - w * r * 0.55, top: oy - h * r * 0.55, w: w * r * 1.1, h: h * r * 1.1 }, { x: ox, y: oy });
            part.sx = sx;
            part.sy = sy;
            part.rotate = turn * away + (j ? Math.sin(t * 0.7 + phase) * 12 : 0);
        });
        node.group.pivot = { x: 0, y: 0 };
    };

    let area = null;
    const place = (w, h) => {
        layout(w, h);
        area = paintRegions(w, h);
        [L.sky, L.ground].forEach((field) => { field.place(area); field.refresh(); field.uniforms.uScale.value = k(); });
        // The mirrored copies: about the frame's left edge, and about its right one
        const mirror = (r, side) => (side < 0 ? { ...r, left: 2 * sx(0) - r.left - r.w } : side > 0 ? { ...r, left: 2 * sx(SIZE) - r.left - r.w } : r);
        const lay = (copies, rect) => copies.forEach(({ side, node }) => { node.place(mirror(rect, side)); node.sx = side ? -1 : 1; });
        L.floating.forEach(({ box, copies }) => lay(copies, rectOf(box)));
        [L.water, L.pond, L.fern, L.land, L.crystals, L.rocks].forEach((copies) => lay(copies, rectOf(B[copies[0].name])));
        L.plants.forEach(({ box, copies }) => lay(copies, rectOf(box)));
        const at = (node, [x, y, r], times, least) => {
            const d = Math.max(least, r * times * k());
            node.place({ left: sx(x) - d / 2, top: sy(y) - d / 2, w: d, h: d });
        };
        art.flowers.forEach((f, i) => at(L.flowers[i], f, 6, 40));
        art.sprouts.forEach((f, i) => at(L.sprouts[i], f, 6, 26));
        art.crystals.forEach((f, i) => at(L.glints[i].node, f, 3.4, 30));

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
        const [skyBubbles, groundBubbles] = moveClusters(reduced ? 0 : dt, reduced ? 0 : t);
        // As many as the stage draws (FIELD_BUBBLES): the drops of thoughts let go first, the wanderers last
        L.sky.bubbles = [...moveDrops(dt), ...skyBubbles].slice(0, FIELD_BUBBLES);
        L.ground.bubbles = groundBubbles.slice(0, FIELD_BUBBLES);
        const unrest = Math.min(1, Math.abs(lean));
        L.sky.uniforms.uWobble.value = (1 + 0.5 * unrest) * (1 - 0.45 * named);
        L.ground.uniforms.uWobble.value = (0.7 + 0.3 * unrest) * (1 - 0.45 * named);

        L.skyNode.y = scroll * 8;
        L.landNode.y = scroll * 18;

        // ---- The little flowers and the sprouts glow, each breathing at its own pace, and the crystals glint
        art.flowers.forEach((_, i) => {
            L.flowers[i].opacity = 0.55 + 0.35 * Math.sin(t * (0.9 + 0.13 * i) + i * 1.7) * ramp + 0.25 * named;
        });
        art.sprouts.forEach((_, i) => {
            L.sprouts[i].opacity = 0.45 + 0.4 * Math.sin(t * (1.1 + 0.17 * i) + i * 2.3) * ramp + 0.25 * named;
        });
        L.glints.forEach((g) => {
            if (!reduced && t > g.at + 1.2) g.at = t + 3 + Math.random() * 9;
            const p = (t - g.at) / 1.2;
            g.node.opacity = p > 0 && p < 1 ? Math.sin(Math.PI * p) ** 3 : 0;
            g.node.scale = 0.7 + 0.5 * Math.max(0, Math.min(1, p));
        });
        // ---- The little waves and the shines drift on the water, each at its own pace, and back
        L.floating.forEach(({ copies, phase }) => copies.forEach(({ node, side }) => {
            node.x = Math.sin(t * 0.3 + phase) * 0.01 * F.size * ramp * (side ? -1 : 1);
            node.y = Math.sin(t * 0.45 + phase * 1.7) * 0.0025 * F.size * ramp;
        }));

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
            placeThought(th, t);
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
        // The far stars move less than the sky, the dust close to the eye more: depth
        dust?.shift(5, skyDrift.x * 0.6, skyDrift.y * 0.6 + L.skyNode.y);
        dust?.shift(6, skyDrift.x * 0.6, skyDrift.y * 0.6 + L.skyNode.y);
        dust?.shift(7, landDrift.x, landDrift.y + L.landNode.y);
        dust?.shift(8, skyDrift.x * 2.2, skyDrift.y * 2.2);
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
        const after = (node, n = 0) => node.mesh.renderOrder + 0.5 + n * 0.01;
        const fromArt = (list, colour, scale = 1) => list.map(([x, y, r]) => [sx(x), sy(y), Math.max(1.2, 2 * r * k() * scale), colour]);
        dust = startStardust(null, {
            stage,
            manual: true,
            groups: [
                // 0: the specks of the sky
                { colors: [art.dots.color], parallax: 0, drift: 2.5, twinkle: 0.55, reach: 0, opacity: 0.75, order: after(L.sky, 2), points: () => fromArt(art.dots.list, art.dots.color) },
                // 1: the aura round Sid, brighter as he lets go
                { colors: [AURA], parallax: 0, drift: 1.4, jitter: 0.35, twinkle: 0.4, reach: 0, bloom: true, order: after(L.calm), points: () => fromArt(art.aura, AURA, 1.2) },
                // 2: the yellow light round the mushrooms, alive and stirred by a finger
                { colors: [GLOW], look: 'soft', parallax: 0, drift: 2, jitter: 0.4, twinkle: 0.45, reach: 70, push: 14, bloom: true, order: after(L.fern[2].node), points: () => fromArt(art.glow, GLOW, 1.3) },
                // 3: the thread to a thought held
                { colors: [AURA], dynamic: threadGroup, look: 'soft', parallax: 0, drift: 0, twinkle: 0, reach: 0, bloom: true, order: 1e6 - 1 },
                // 4: sparks
                { ...sparks.group(), order: 1e6 },
                // 5: the far stars, behind everything but the two halves; 6: shooting stars over the night
                { colors: [STAR_INK], parallax: 0, drift: 1.2, twinkle: 0.75, reach: 0, opacity: 0.9, order: after(L.sky), points: farStars },
                { colors: [0xffffff], dynamic: shooting, look: 'soft', parallax: 0, drift: 0, twinkle: 0, reach: 0, order: after(L.sky, 1) },
                // 7: spores over the night's ground, in front of it
                { colors: [GLOW], dynamic: sporeGroup, look: 'soft', parallax: 0, drift: 0, twinkle: 0, reach: 0, bloom: true, order: after(L.rocks[2].node) },
                // 8: a light dust floating up, close to the eye
                { count: 34, colors: [0xfffbe6, 0xf6f0c0, 0xd8f4f2], size: [2, 5.5], look: 'soft', parallax: 0, drift: 9, flow: [0, -6], twinkle: 0.6, reach: 90, push: 20, opacity: 0.45, bloom: true, order: 1e6 - 2 },
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
