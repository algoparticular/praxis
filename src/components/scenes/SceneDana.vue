<script setup>
    // Dana (generosity): two friends standing on a small green island, and a little flame between them, under a deep
    // night sky of real particles. The friends, the flame and the island are separate layers that move together as one
    // group, so the friends stay planted on the island. The sky has depth: it darkens towards the top, its stars are in
    // three planes that shift apart with the pointer (faint far ones, the stars of the card, and a few big out-of-focus
    // ones close to the eye).
    // The island is alive: water and light drip from its moss and from the tips of its crystal, the crystal glints, and
    // fireflies wander round it, some behind the friends and some in front.
    // The particles live on two canvases (useStardust): the one behind the drawings holds the sky, the little flame's
    // living embers (red and yellow, rising from it and circling it) and the glow of the friend on the left; the one in
    // front holds what is given, so it is seen over the drawings: the glow of the little creatures of the island, the
    // lights in the air and the sparks, and the drops, the nearest fireflies and the out-of-focus stars.
    // Its verb is Dar y recibir (give and receive), played by sharing the light: the friend on the right (the one with
    // the glow, holding out his hand) has the flame. A touch on anyone of the island (the other friend, the little stone
    // creatures, the mushrooms: GIFTS) gives him a light of it: a spark flies from the flame to him in an arc and lights
    // him up. Giving does not make the flame smaller: it grows with every light it gives. When everyone has been given
    // one, they all send a light back to it at once, without being asked (the card: blessings come back multiplied), and
    // a rulito is born over each friend's head and the card's name lights up. Then the lights fade, slowly, and it can
    // be played again. Nothing is lost and there is no order: touching one already lit only makes it glow.
    // The two friends come from one picture of the Collaborate page (public/assets/share/particles.webp), split into
    // public/assets/dana/left.webp and right.webp, with the rulito that was drawn over the right one taken out.
    import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { createParallax, enterLayers } from '../../composables/useParallax.js';
    import { startStardust } from '../../composables/useStardust.js';
    import { createFlame } from '../../composables/useFlame.js';
    import { createSparks } from '../../composables/useSparks.js';
    import { play } from '../../composables/useSound.js';
    import { sceneMilestone } from '../../analytics.js';
    import Rulito from '../Rulito.vue';
    import AURA from '../../composables/danaAura.json';
    import GIVER_AURA from '../../composables/danaGiverAura.json';

    const props = defineProps({
        card: { type: Object, default: () => ({}) },
        active: Boolean
    });

    const root = ref(null);
    const skyCanvas = ref(null);
    const frontCanvas = ref(null);
    const group = ref(null);
    const left = ref(null);
    const right = ref(null);
    const flame = ref(null);
    const island = ref(null);
    const rulitoL = ref(null);
    const rulitoR = ref(null);
    let parallax = null;
    let sky = null;
    let front = null;
    let entered = false;
    let stageEl = null;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // The fire-ball picture: where its glass ball is, as fractions of the picture (0.5 across, 0.75 down, 0.285 wide)
    const BALL = { x: 0.5, y: 0.75, r: 0.285 };

    // Where the ball of the flame sits in the right one's hand, in % of the frame (where its layer is placed in the CSS)
    const HOME = { x: 54.89, y: 53.42 };
    const GIVER = 0.62;                            // the note of the one who gives, for the sound of giving

    // The ones who can be given a light, in % of the frame: where the light lands (x, y), how far their glow reaches (r,
    // 0 for the friend, whose glow is his aura), their note in the card's chord (0..1, low to high) and the box that can
    // be touched (hit: centre, width and height)
    const GIFTS = [
        { id: 'friend', es: 'Amigo', en: 'Friend', x: 33, y: 50, r: 0, pitch: 0.38, hit: { x: 31.2, y: 52, w: 12, h: 38 } },
        { id: 'stone', es: 'Piedrita', en: 'Little stone', x: 42.9, y: 64.1, r: 3.6, pitch: 0.5, hit: { x: 42.9, y: 64.1, w: 7, h: 6 } },
        { id: 'mushroom', es: 'Hongo', en: 'Mushroom', x: 52.6, y: 61.6, r: 4.2, pitch: 0.75, hit: { x: 52.6, y: 61.5, w: 6, h: 8 } },
        { id: 'stack', es: 'Piedritas', en: 'Little stones', x: 72.7, y: 64.4, r: 3.6, pitch: 0.45, hit: { x: 72.7, y: 64, w: 7, h: 7 } },
        { id: 'shore', es: 'Hongo y piedrita', en: 'Mushroom and stone', x: 25.9, y: 73.4, r: 4.2, pitch: 0.2, hit: { x: 25.9, y: 73.3, w: 8, h: 6 } },
        { id: 'pair', es: 'Piedritas', en: 'Little stones', x: 54.7, y: 76.4, r: 4.6, pitch: 0.1, hit: { x: 54.7, y: 76.5, w: 10, h: 6 } },
    ];
    const DOTS = 50;                               // particles in the glow of each of the little ones

    // Where the island drips, in % of the frame (measured on island.webp): the tips of its moss, and the three lowest
    // corners of its crystal
    const DRIPS = [
        { x: 46.2, y: 87.4, moss: true }, { x: 40, y: 83.7, moss: true }, { x: 51.7, y: 83.5, moss: true },
        { x: 75.2, y: 82, moss: true }, { x: 81.7, y: 82.6, moss: true }, { x: 16.9, y: 84.7, moss: true },
        { x: 27.2, y: 88.9 }, { x: 51.4, y: 91.8 }, { x: 72.8, y: 87 },
    ];
    // Spots on the faces of the crystal that glint now and then, in % of the frame
    const GLINTS = [[58.6, 84.2], [36, 82.7], [64.7, 85.8], [45.9, 88.4], [34.9, 87.8], [50.1, 83.9], [29.9, 85.5],
        [71.1, 83], [40.8, 84.1], [62.5, 81.6], [54.3, 86.1], [78.1, 78.5], [26.5, 83.4], [61.3, 88.2], [73, 79.2], [21.2, 79.8]];
    const FIREFLIES = 7;                           // on each canvas: behind the friends and in front of them

    // The island is drawn bigger than in the illustration (ISLAND times), so the scene is fuller and its little ones are
    // bigger and easier to touch. It grows from the line where the friends stand (PIVOT, % of the frame), so they stay
    // on the grass at their own size. Everything above that is on the island (the little ones but the friend, their
    // touch boxes, the drips, the glints) is measured on the illustration and moved here with it
    const PIVOT = { x: 50, y: 68 };
    const ISLAND = 1.22;
    const onIsland = (x, y) => [PIVOT.x + (x - PIVOT.x) * ISLAND, PIVOT.y + (y - PIVOT.y) * ISLAND];
    GIFTS.forEach((g) => {
        if (g.id === 'friend') return;
        [g.x, g.y] = onIsland(g.x, g.y);
        g.r *= ISLAND;
        const [x, y] = onIsland(g.hit.x, g.hit.y);
        g.hit = { x, y, w: g.hit.w * ISLAND, h: g.hit.h * ISLAND };
    });
    DRIPS.forEach((d) => { [d.x, d.y] = onIsland(d.x, d.y); });
    GLINTS.forEach((p, i) => { GLINTS[i] = onIsland(p[0], p[1]); });

    // Where the little flame is on the canvas now
    const anchor = () => {
        const el = flame.value, canvas = skyCanvas.value;
        if (!el || !canvas) return null;
        const box = el.getBoundingClientRect(), page = canvas.getBoundingClientRect();
        if (!box.width) return null;
        const cx = box.left - page.left + BALL.x * box.width;
        const cy = box.top - page.top + BALL.y * box.height;
        const r = BALL.r * box.width;
        return {
            x: cx, y: cy - r * 0.55, radius: r * 0.7, height: box.height * 0.78, unit: box.width / 44,
            halo: { x: cx, y: cy, r },
        };
    };

    const fire = createFlame({ count: 260, halo: 120, palette: [0xffe47d, 0xffb454, 0xf0643c, 0xd93a4a], anchor, size: 6.2 });
    const sparks = createSparks(360);
    const EMBERS = [0xffe47d, 0xffb454, 0xf0643c, 0xfff3b8];
    const GLOWS = [0xf37b85, 0xffa48c, 0xffd2a8, 0xff8a7a];

    /* ---------- The game's state ---------- */

    // Each one: lit (0..1, easing towards goal), whether a light is on its way to him, and a flash when touched or hinted
    const state = GIFTS.map(() => ({ lit: 0, goal: 0, coming: false, given: false, flash: 0 }));
    const lights = [];                             // lights in the air: { from, c, end, age, T, delay, arrive, colors }
    let size = 1;                                  // the flame grows with every light it gives (size eases to sizeGoal)
    let sizeGoal = 1;
    let boost = 0;                                 // a flare of every glow when the lights come back
    let shine = 0;                                 // the giver's own aura: it shines more with every light he gives
    let shineGoal = 0;
    let shineFlash = 0;
    let returning = false;                         // everyone has his light and it is on its way back
    let idle = 0;
    let trail = 0;
    let win = null;                                // the two rulitos: { age, head, tail, full, fullAt, back, pop }
    let wins = 0;
    let lastT = 0;

    const ease = (u) => u * u * (3 - 2 * u);
    const unit = () => (group.value?.clientWidth || 1) / 100;      // px per % of the frame

    // A point in % of the frame, on the canvas of the particles
    const toCanvas = (x, y) => {
        const box = group.value.getBoundingClientRect(), page = skyCanvas.value.getBoundingClientRect();
        return { x: box.left - page.left + x / 100 * box.width, y: box.top - page.top + y / 100 * box.height };
    };
    const burstAt = (x, y, n, colors, speed = 120) => {
        const at = toCanvas(x, y);
        sparks.burst(at.x, at.y, { n, colors, speed, size: 5, spread: unit() * 1.2 });
    };

    // The old touch: the little flame leaps, and sparks fly
    const touch = () => {
        const at = anchor();
        if (!at) return;
        fire.flare(1);
        sparks.burst(at.halo.x, at.halo.y, { n: 34, colors: EMBERS, speed: 130, size: 5.2, spread: at.halo.r * 0.5 });
        play('star');
    };

    // A light flying in an arc from one point to another (in % of the frame), higher the further it goes
    const send = (from, end, { T, delay = 0, colors = EMBERS, arrive }) => {
        const peak = 5 + Math.hypot(end.x - from.x, end.y - from.y) * 0.3;
        const c = { x: (from.x + end.x) / 2, y: Math.min(from.y, end.y) - peak };
        lights.push({ from, c, end, x: from.x, y: from.y, age: -delay, T, colors, arrive });
    };

    // Giving one a light: a spark leaves the flame and flies to him. Touching one who has his already only makes him glow
    const give = (i) => {
        idle = 0;
        const s = state[i], g = GIFTS[i];
        if (reducedMotion) { touch(); return; }
        if (s.given || s.coming || win || returning) {
            s.flash = 1;
            burstAt(g.x, g.y, 14, s.given ? GLOWS : EMBERS, 80);
            play('tap');
            return;
        }
        s.coming = true;
        fire.flare(0.7);
        shineFlash = 0.6;
        play('give', { from: GIVER });
        send(HOME, { x: g.x, y: g.y }, { T: 0.55 + Math.hypot(g.x - HOME.x, g.y - HOME.y) * 0.012, arrive: () => receive(i) });
    };

    // The light reaches him: he lights up, and the flame that gave it is bigger, not smaller
    const receive = (i) => {
        const s = state[i], g = GIFTS[i];
        s.coming = false;
        s.given = true;
        s.goal = 1;
        s.flash = 1;
        const count = state.filter((o) => o.given).length;
        sizeGoal = 1 + 0.09 * count;
        shineGoal = count / GIFTS.length;
        fire.flare(0.5);
        burstAt(g.x, g.y, 26, GLOWS, 110);
        play('link', { from: GIVER, to: g.pitch, level: 1 });
        if (count === GIFTS.length) setTimeout(giveBack, 600);
    };

    // Everyone has his light: they all send one back to the flame at once, without being asked
    const giveBack = () => {
        if (returning || win) return;
        returning = true;
        play('converge');
        GIFTS.forEach((g, i) => {
            state[i].flash = 1;
            send({ x: g.x, y: g.y }, HOME, { T: 1.1, delay: i * 0.04, colors: GLOWS, arrive: () => fire.flare(0.6) });
        });
        setTimeout(balance, 1300);
    };

    // The lights are back, multiplied: the flame swells, and a rulito is born over each head
    const balance = () => {
        returning = false;
        if (win) return;
        wins += 1;
        win = { age: 0, head: 0, tail: 0, full: false, fullAt: 0, back: false, pop: 0 };
        rulitoL.value?.reshape();
        rulitoR.value?.reshape();
        boost = 1;
        sizeGoal = 1.75;
        shineGoal = 1.3;
        fire.flare(1);
        burstAt(HOME.x, HOME.y, 60, [...EMBERS, ...GLOWS], 190);
        play('star');
        sceneMilestone('light_shared', { times: wins });
    };

    const GROW = 2.6, LINGER = 2.2, EAT = 3.4, DELAY = 0.5, STAGGER = 0.18;
    const winTick = (t, dt) => {
        if (!win || !rulitoL.value || !rulitoR.value) return;
        win.age += dt;
        win.pop = Math.max(0, win.pop - dt * 2.2);
        const grown = (lag) => 1 - (1 - Math.min(1, Math.max(0, (win.age - DELAY - lag) / GROW))) ** 1.6;
        win.head = grown(0);
        if (win.head >= 1 && grown(STAGGER) >= 1 && !win.full) {
            win.full = true;
            win.fullAt = win.age;
            win.pop = 1;
            boost = 1;
            play('rulito');
        }
        if (win.full && !win.back && win.age - win.fullAt > LINGER) {
            win.back = true;
            // The lights fade slowly (the friend keeps a little of his) and the flame goes back to its size
            state.forEach((s, i) => { s.given = false; s.goal = GIFTS[i].id === 'friend' ? 0.35 : 0; });
            sizeGoal = 1;
            shineGoal = 0;
        }
        if (win.back) win.tail = Math.min(1, win.tail + dt / EAT);
        const whole = Math.min(1, Math.max(0, (win.head - win.tail - 0.6) / 0.4));
        stageEl?.style.setProperty('--name-glow', Math.max(win.pop, 0.8 * ease(whole)).toFixed(3));
        const glow = win.full && win.head - win.tail > 0.9 ? Math.max(win.pop, Math.sin(t * 4) * 0.5 + 0.5) : 0;
        [[rulitoL.value, win.head, 0.7], [rulitoR.value, grown(STAGGER), 0]].forEach(([r, head, phaseOff]) => {
            const tail = Math.min(head, win.tail);
            r.frame({ head, tail, flare: glow, t, fade: Math.min(1, (head - tail) * 14) });
            r.$el.style.rotate = `${(Math.sin(t * 1.8 + phaseOff) * 3).toFixed(2)}deg`;
            r.$el.style.scale = (1 + 0.2 * win.pop * win.pop).toFixed(3);
        });
        if (win.back && win.tail >= 1) {
            win = null;
            rulitoL.value.frame({});
            rulitoR.value.frame({});
            stageEl?.style.setProperty('--name-glow', '0');
        }
    };

    const onKey = (event, i) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        if (i === undefined) touch();
        else give(i);
    };

    /* ---------- Every frame ---------- */

    const step = (t) => {
        const dt = Math.min(0.05, Math.max(0, t - lastT));
        lastT = t;
        idle += dt;
        trail += dt;
        const puff = trail > 0.05;
        if (puff) trail = 0;
        for (let k = lights.length - 1; k >= 0; k--) {
            const l = lights[k];
            l.age += dt;
            if (l.age < 0) continue;
            const u = Math.min(1, l.age / l.T);
            const e = 1 - (1 - u) ** 2;              // it slows as it gets there
            const q = 1 - e;
            l.x = q * q * l.from.x + 2 * q * e * l.c.x + e * e * l.end.x;
            l.y = q * q * l.from.y + 2 * q * e * l.c.y + e * e * l.end.y;
            if (puff) burstAt(l.x, l.y, 2, l.colors, 40);
            if (u >= 1) {
                lights.splice(k, 1);
                l.arrive?.();
            }
        }
        // Left alone a while, one who has no light yet glimmers now and then, and the flame answers
        if (!win && !returning && idle > 7) {
            idle = 3;
            const waiting = state.map((s, i) => (s.given || s.coming ? -1 : i)).filter((i) => i >= 0);
            if (waiting.length) {
                const i = waiting[Math.floor(Math.random() * waiting.length)];
                state[i].flash = 0.6;
                fire.flare(0.35);
                burstAt(GIFTS[i].x, GIFTS[i].y, 6, EMBERS, 40);
            }
        }
        state.forEach((s) => {
            s.lit += (s.goal - s.lit) * Math.min(1, dt * (s.goal < s.lit ? 0.35 : 2.2));
            s.flash = Math.max(0, s.flash - dt * 1.4);
        });
        shine += (shineGoal - shine) * Math.min(1, dt * (shineGoal < shine ? 0.35 : 1.6));
        shineFlash = Math.max(0, shineFlash - dt * 1.2);
        size += (sizeGoal - size) * Math.min(1, dt * (sizeGoal < size ? 0.8 : 4));
        boost = Math.max(0, boost - dt * 0.5);
        winTick(t, dt);
    };

    const fill = (data, i, x, y, size, alpha, color) => {
        data.positions[i * 3] = x;
        data.positions[i * 3 + 1] = y;
        data.sizes[i] = size;
        data.alphas[i] = alpha;
        data.tints[i * 3] = (color >> 16 & 255) / 255;
        data.tints[i * 3 + 1] = (color >> 8 & 255) / 255;
        data.tints[i * 3 + 2] = (color & 255) / 255;
    };

    // The glow of the one on the left: dots along his outline, a little out from it, like the stippled glow drawn round
    // the one on the right. It swells with the light he is given
    const FRIEND = GIFTS.findIndex((g) => g.id === 'friend');
    const aura = {
        count: AURA.length * 3,
        update(t, data) {
            const el = left.value, canvas = skyCanvas.value;
            if (!el || !canvas) return;
            const box = el.getBoundingClientRect(), page = canvas.getBoundingClientRect();
            const w = box.width, h = box.height, x0 = box.left - page.left, y0 = box.top - page.top;
            const s = state[FRIEND];
            const level = Math.min(1.4, s.lit + s.flash * 0.3 + boost * 0.6);
            const reach = w * 0.075 * (0.6 + 0.4 * Math.min(1, level));
            for (let i = 0; i < data.count; i++) {
                const [px, py, nx, ny] = AURA[Math.floor(i / 3)];
                const a = Math.sin(i * 91.7) * 0.5 + 0.5, r = Math.sin(i * 37.3 + 1) * 0.5 + 0.5;
                const life = (a + t * (0.05 + 0.08 * r)) % 1;
                const off = reach * (0.15 + 0.85 * life);
                fill(data, i,
                    x0 + px * w + nx * off + Math.sin(t * 1.3 + i) * w * 0.004, y0 + py * h + ny * off,
                    w * (0.05 + 0.06 * r) * (1 + boost * 0.4),
                    Math.min(1, level * 1.3) * Math.sin(life * Math.PI) ** 0.7 * (0.7 + 0.3 * Math.sin(t * 3 + i * 2.1)),
                    GLOWS[i % GLOWS.length]);
            }
        },
    };

    // The aura of the one on the right, who gives: his drawn glow is always there, and over it a glow of dots along its
    // edge (danaGiverAura.json, the outline of his picture) that is faint at first and shines more and reaches further
    // with every light he gives, and most when they all come back
    const giverAura = {
        count: GIVER_AURA.length * 3,
        update(t, data) {
            const el = right.value, canvas = skyCanvas.value;
            if (!el || !canvas) return;
            const box = el.getBoundingClientRect(), page = canvas.getBoundingClientRect();
            const w = box.width, h = box.height, x0 = box.left - page.left, y0 = box.top - page.top;
            const level = Math.min(1.6, 0.12 + shine * 1.15 + shineFlash * 0.4 + boost * 0.5);
            const reach = w * 0.08 * (0.35 + 0.65 * Math.min(1.3, level));
            for (let i = 0; i < data.count; i++) {
                const [px, py, nx, ny] = GIVER_AURA[Math.floor(i / 3)];
                const a = Math.sin(i * 53.1) * 0.5 + 0.5, r = Math.sin(i * 17.9 + 2) * 0.5 + 0.5;
                const life = (a + t * (0.06 + 0.1 * r)) % 1;
                const off = reach * (0.1 + 0.9 * life);
                fill(data, i,
                    x0 + px * w + nx * off + Math.sin(t * 1.1 + i) * w * 0.004, y0 + py * h + ny * off,
                    w * (0.035 + 0.05 * r) * (1 + 0.4 * Math.min(1, level)),
                    Math.min(1, level) * Math.sin(life * Math.PI) ** 0.7 * (0.7 + 0.3 * Math.sin(t * 2.6 + i * 1.7)),
                    (i % 3 ? GLOWS : EMBERS)[i % 4]);
            }
        },
    };

    // The glow of the little stone creatures and the mushrooms: a soft cloud of dots round each, rising slowly like
    // embers, as bright as the light they have been given
    const SMALL = GIFTS.map((g, i) => i).filter((i) => GIFTS[i].r > 0);
    const glows = {
        count: SMALL.length * DOTS,
        update(t, data) {
            if (!group.value || !skyCanvas.value) return;
            const u = unit();
            for (let i = 0; i < data.count; i++) {
                const k = SMALL[Math.floor(i / DOTS)], g = GIFTS[k], s = state[k];
                const a = Math.sin(i * 12.9898) * 0.5 + 0.5, b = Math.sin(i * 78.233 + 2) * 0.5 + 0.5;
                const life = (a + t * (0.08 + 0.1 * b)) % 1;
                const angle = i * 2.399 + t * 0.15;
                const reach = g.r * u * (0.7 + 0.9 * b) * (1 + boost * 0.3);
                const at = toCanvas(g.x, g.y);
                const level = Math.min(1.2, s.lit + s.flash * 0.7 + boost * s.lit * 0.5);
                fill(data, i,
                    at.x + Math.cos(angle) * reach, at.y + Math.sin(angle) * reach * 0.65 - life * g.r * u * 1.1,
                    u * (0.6 + 1 * b),
                    0.75 * level * Math.sin(life * Math.PI) ** 0.8 * (0.75 + 0.25 * Math.sin(t * 3 + i)),
                    (i % 3 ? GLOWS : EMBERS)[i % 4]);
            }
        },
    };

    // The lights in the air: a small bright ball of dots each, with a trail of sparks (the bursts in step)
    const MOTES = 12, FLYING = GIFTS.length + 2;
    const motes = {
        count: FLYING * MOTES,
        update(t, data) {
            if (!group.value || !skyCanvas.value) return;
            const u = unit();
            for (let i = 0; i < data.count; i++) {
                const l = lights[Math.floor(i / MOTES)];
                if (!l || l.age < 0) { data.alphas[i] = 0; continue; }
                const at = toCanvas(l.x, l.y);
                const j = i % MOTES, angle = j * 2.399 + t * 5, reach = u * 0.7 * (j / MOTES);
                fill(data, i, at.x + Math.cos(angle) * reach, at.y + Math.sin(angle) * reach,
                    u * (j < 2 ? 1.8 : 1), j < 2 ? 0.9 : 0.8, l.colors[j % l.colors.length]);
            }
        },
    };

    // The island drips: a drop swells at the tip of the moss or the crystal, lets go and falls, fading, into the sky
    // below, with a short trail (the other two of its three dots). The moss drips water and a little light, the crystal
    // clear light. They shine more while the lights are back
    const DROPS = 3;
    const WATER = [0xdff8ff, 0xbff3ff, 0xffffff], MOSS = [0xc9f7c9, 0xe6fff4, 0xfff3b8];
    const drops = {
        count: DRIPS.length * DROPS,
        update(t, data) {
            if (!group.value || !skyCanvas.value) return;
            const u = unit();
            for (let i = 0; i < data.count; i++) {
                const k = i % DRIPS.length, d = DRIPS[k], j = Math.floor(i / DRIPS.length);
                const a = Math.sin(k * 12.9898) * 0.5 + 0.5, period = 3.5 + 4 * (Math.sin(k * 78.233) * 0.5 + 0.5);
                const life = (t / period + a) % 1;
                const at = toCanvas(d.x, d.y);
                const swell = Math.min(1, life / 0.45);
                const fall = Math.max(0, (life - 0.45) / 0.55 - j * 0.035);
                const trail = j ? (fall > 0 ? 0.55 / j : 0) : 1;
                fill(data, i, at.x, at.y + u * (0.5 * swell + 20 * fall * fall),
                    u * (j ? 0.75 - j * 0.15 : 0.55 + 0.6 * swell) * (1 - 0.35 * fall),
                    trail * (0.45 + 0.55 * swell) * (1 - fall) ** 1.3 * (1 + boost * 0.6),
                    (d.moss ? MOSS : WATER)[(k + j) % 3]);
            }
        },
    };

    // Glints on the faces of the crystal: a quick bright twinkle each, at its own pace
    const glints = {
        count: GLINTS.length,
        update(t, data) {
            if (!group.value || !skyCanvas.value) return;
            const u = unit();
            for (let i = 0; i < data.count; i++) {
                const at = toCanvas(GLINTS[i][0], GLINTS[i][1]);
                const shine = Math.max(0, Math.sin(t * (0.5 + (i % 5) * 0.13) + i * 2.3)) ** 12;
                fill(data, i, at.x, at.y, u * (1.4 + 3 * shine), Math.min(1, shine + boost * 0.4), i % 3 ? 0xe6fbff : 0xfff3b8);
            }
        },
    };

    // Fireflies wandering round the island, each with a bright core and a soft halo, lighting and going out slowly.
    // `side` 0 are behind the friends, 1 in front of them
    const fireflies = (side) => ({
        count: FIREFLIES * 2,
        update(t, data) {
            if (!group.value || !skyCanvas.value) return;
            const u = unit();
            for (let i = 0; i < data.count; i++) {
                const k = Math.floor(i / 2) + side * FIREFLIES, core = i % 2 === 0;
                const a = Math.sin(k * 12.9898 + 1) * 0.5 + 0.5, b = Math.sin(k * 78.233 + 3) * 0.5 + 0.5;
                const x = 22 + 56 * a + Math.sin(t * (0.13 + 0.07 * b) + k * 1.7) * 7 + Math.sin(t * 0.41 + k) * 1.5;
                const y = 44 + 26 * b + Math.cos(t * (0.11 + 0.06 * a) + k * 2.3) * 6 + Math.sin(t * 0.53 + k * 3) * 1.2;
                const at = toCanvas(x, y);
                const pulse = Math.max(0, Math.sin(t * (0.35 + 0.2 * b) + k * 4.1)) ** 2;
                fill(data, i, at.x, at.y, u * (core ? 1 : 4.5), (0.15 + 0.85 * pulse) * (core ? 1 : 0.45) * (1 + boost * 0.5),
                    core ? 0xfaffd8 : (k % 2 ? 0xe9ff9e : 0xffe47d));
            }
        },
    });

    // The out-of-focus stars close to the eye stay off the middle, where the friends are
    // Where the pointer has the sky now (-1..1), for the groups that move by themselves
    const sway = { x: 0, y: 0 };

    // A little spiral galaxy in a corner of the sky: a warm core and two arms of stars that turn slowly, the inner ones
    // faster than the outer ones, tilted as if seen a little from the side. Its stars are flat dots like the card's;
    // a soft glow (the other group) lies under its core and along its arms
    const ARM_STARS = 620, ARM_GLOW = 90, TILT = -0.4, FLAT = 0.5;
    const galaxyStar = (i, glow) => {
        const a = Math.sin(i * 12.9898 + (glow ? 7 : 0)) * 0.5 + 0.5, b = Math.sin(i * 78.233 + 1) * 0.5 + 0.5;
        const c = Math.sin(i * 39.425 + 3) * 0.5 + 0.5;
        // A fifth of the stars are the bulge round the core, a fifth the faint disc between the arms, the rest the arms
        const core = !glow && i % 5 === 0, disc = !glow && i % 5 === 1;
        const r = core ? 0.25 * a * a : 0.06 + 0.94 * a ** 0.75;
        const arm = i % 2 ? Math.PI : 0;
        const angle = core || disc ? b * Math.PI * 2 : arm + Math.log(r / 0.06 + 1) * 3.1 + (b - 0.5) * (1.5 - 0.8 * r);
        return { r: r + (c - 0.5) * 0.06, angle, c };
    };
    const STARS_OF = Array.from({ length: ARM_STARS }, (_, i) => galaxyStar(i, false));
    const GLOW_OF = Array.from({ length: ARM_GLOW }, (_, i) => galaxyStar(i, true));
    const GALAXY = [0xfff3b8, 0xf6e27c, 0xffb454, 0xee6a82, 0xf0605d, 0xfaf3d4, 0xd8f4f2];
    const galaxyAt = (w, h) => {
        const wide = w > h;
        return { x: w * (wide ? 0.8 : 0.26) - sway.x * 6, y: h * (wide ? 0.24 : 0.25) - sway.y * 3, R: Math.min(w * (wide ? 0.12 : 0.22), h * 0.14) };
    };
    const place = (g, t, w, h) => {
        const at = galaxyAt(w, h);
        const angle = g.angle + t * 0.05 / (0.3 + g.r);
        const x = Math.cos(angle) * g.r, y = Math.sin(angle) * g.r * FLAT;
        return [at.x + (x * Math.cos(TILT) - y * Math.sin(TILT)) * at.R, at.y + (x * Math.sin(TILT) + y * Math.cos(TILT)) * at.R, at.R];
    };
    const galaxy = {
        count: ARM_STARS,
        update(t, data) {
            const canvas = skyCanvas.value;
            if (!canvas) return;
            const w = canvas.clientWidth, h = canvas.clientHeight;
            for (let i = 0; i < data.count; i++) {
                const g = STARS_OF[i];
                const [x, y] = place(g, t, w, h);
                const near = 1 - Math.min(1, g.r);
                fill(data, i, x, y, 1 + 2.2 * g.c * (0.5 + near),
                    (0.35 + 0.65 * near) * (0.7 + 0.3 * Math.sin(t * (1 + g.c * 2) + i)),
                    g.r < 0.15 ? GALAXY[i % 2] : GALAXY[i % GALAXY.length]);
            }
        },
    };
    const galaxyGlow = {
        count: ARM_GLOW + 6,
        update(t, data) {
            const canvas = skyCanvas.value;
            if (!canvas) return;
            const w = canvas.clientWidth, h = canvas.clientHeight;
            for (let i = 0; i < data.count; i++) {
                if (i >= ARM_GLOW) {
                    // The core: a few big warm glows on top of each other
                    const at = galaxyAt(w, h);
                    fill(data, i, at.x, at.y, at.R * (0.25 + 0.15 * (i - ARM_GLOW)), 0.22, i % 2 ? 0xfff3b8 : 0xffb454);
                    continue;
                }
                const g = GLOW_OF[i];
                const [x, y, R] = place(g, t, w, h);
                fill(data, i, x, y, R * (0.35 + 0.3 * g.c), 0.07 + 0.08 * (1 - Math.min(1, g.r)), i % 3 ? 0xee6a82 : 0xf6e27c);
            }
        },
    };

    // Shooting stars, silent: now and then one crosses the upper sky and is gone, with a tail of dots
    const TAIL = 24, SHOOTERS = 2;
    const shooters = Array.from({ length: SHOOTERS }, (_, k) => ({ at: -1 - k * 4, x: 0, y: 0, dx: 0, dy: 0, T: 1 }));
    const shooting = {
        count: SHOOTERS * TAIL,
        update(t, data) {
            const canvas = skyCanvas.value;
            if (!canvas) return;
            const w = canvas.clientWidth, h = canvas.clientHeight;
            for (let k = 0; k < SHOOTERS; k++) {
                const f = shooters[k];
                if (t > f.at + f.T) {
                    // The next one: somewhere else, some seconds from now, falling left or right
                    const side = Math.random() < 0.5 ? -1 : 1, speed = (0.35 + Math.random() * 0.3) * Math.max(w, h);
                    f.at = t + 2 + Math.random() * 7;
                    f.T = 0.7 + Math.random() * 0.5;
                    f.x = w * (0.15 + Math.random() * 0.7);
                    f.y = h * (0.04 + Math.random() * 0.3);
                    f.dx = side * speed;
                    f.dy = speed * (0.35 + Math.random() * 0.3);
                }
                const u = (t - f.at) / f.T;
                for (let j = 0; j < TAIL; j++) {
                    const i = k * TAIL + j;
                    if (u < 0 || u > 1) { data.alphas[i] = 0; continue; }
                    const back = j * 0.006;
                    const life = Math.max(0, u - back);
                    fill(data, i, f.x + f.dx * life * f.T, f.y + f.dy * life * f.T, (j ? Math.max(2, 7 - j * 0.22) : 11),
                        Math.min(1, Math.sin(u * Math.PI) * 1.4) * (1 - j / TAIL) ** 0.7, j < 3 ? 0xfffbe6 : (j % 2 ? 0xf6e27c : 0xee6a82));
                }
            }
        },
    };

    const nearSpot = (w, h) => {
        for (;;) {
            const x = Math.random() * w, y = Math.random() * h;
            if (Math.abs(x / w - 0.5) > 0.24 || y / h < 0.22) return [x, y];
        }
    };

    const enter = () => {
        if (entered || !props.active) return;
        entered = true;
        enterLayers([
            { el: island.value, y: 150, duration: 1700 },
            { el: left.value, y: 80, delay: 350, duration: 1900 },
            { el: right.value, y: 80, delay: 420, duration: 1900 },
            { el: flame.value, y: 30, scale: 0.4, delay: 900, duration: 1800 },
        ]);
    };

    onMounted(() => {
        stageEl = root.value.closest('.stage');
        parallax = createParallax(root.value, ({ x, y, scroll, t, ramp }) => {
            const s = scroll;
            step(t);
            sway.x = x;
            sway.y = y;
            // The island floats, and everything standing on it floats with it: one group, so the friends never lift off it
            const bob = Math.sin(t * 0.55) * 9 * ramp;
            group.value.style.translate = `${-x * 14}px ${-y * 6 + bob - s * 30}px`;
            // The friends breathe from their feet
            left.value.style.scale = `1 ${(1 + Math.sin(t * 0.9 + 0.8) * 0.006 * ramp).toFixed(4)}`;
            right.value.style.scale = `1 ${(1 + Math.sin(t * 0.9) * 0.006 * ramp).toFixed(4)}`;
            // The flame stays in his hand, bobbing a little on its own, and grows with what it gives
            flame.value.style.translate = `${(-x * 6).toFixed(1)}px ${(Math.sin(t * 1.3) * 4 * ramp - y * 4).toFixed(1)}px`;
            flame.value.style.rotate = `${(Math.sin(t * 1.7) * 3 * ramp - x * 4).toFixed(3)}deg`;
            flame.value.style.scale = size.toFixed(3);
        });
        sky = startStardust(skyCanvas.value, {
            groups: [
                // The far stars: many, tiny and faint, they hardly move with the pointer
                { count: 520, colors: [0xfaf3d4, 0xd8f4f2, 0xf6e27c], size: [1, 2.6], drift: 2, twinkle: 0.75, reach: 0, parallax: 4, opacity: 0.7 },
                // The stars of the card
                { colors: [0xffffff], dynamic: galaxyGlow, parallax: 0, drift: 0, twinkle: 0, reach: 0, look: 'soft' },
                { colors: [0xffffff], dynamic: galaxy, parallax: 0, drift: 0, twinkle: 0, reach: 0 },
                { colors: [0xffffff], dynamic: shooting, parallax: 0, drift: 0, twinkle: 0, reach: 0, look: 'soft' },
                // The stars of the card, yellow and red the most
                { count: 640, colors: [0xf6e27c, 0xf6e27c, 0xffd36b, 0xee6a82, 0xf0605d, 0xf0605d, 0xfaf3d4], size: [2.2, 6.5], drift: 7, twinkle: 0.55, reach: 130, push: 34, parallax: 14 },
                { colors: [0xffffff], dynamic: aura, parallax: 0, drift: 0, twinkle: 0, reach: 0, look: 'soft' },
                { colors: [0xffffff], dynamic: giverAura, parallax: 0, drift: 0, twinkle: 0, reach: 0, look: 'soft' },
                { colors: [0xffffff], dynamic: fireflies(0), parallax: 0, drift: 0, twinkle: 0, reach: 0, look: 'soft' },
                fire.group(),
            ],
        });
        front = startStardust(frontCanvas.value, {
            groups: [
                { colors: [0xffffff], dynamic: glints, parallax: 0, drift: 0, twinkle: 0, reach: 0, look: 'soft' },
                // Flat, crisp drops, like the stars of the card
                { colors: [0xffffff], dynamic: drops, parallax: 0, drift: 0, twinkle: 0, reach: 0, look: 'hard' },
                { colors: [0xffffff], dynamic: glows, parallax: 0, drift: 0, twinkle: 0, reach: 0, look: 'soft' },
                { colors: [0xffffff], dynamic: fireflies(1), parallax: 0, drift: 0, twinkle: 0, reach: 0, look: 'soft' },
                { colors: [0xffffff], dynamic: motes, parallax: 0, drift: 0, twinkle: 0, reach: 0, look: 'soft' },
                sparks.group(),
                // A few big out-of-focus stars, close to the eye: they shift the most
                { count: 16, colors: [0xfaf3d4, 0xf6e27c, 0xee6a82], size: [26, 70], look: 'soft', spawn: nearSpot, drift: 10, twinkle: 0.3, reach: 0, parallax: 46, opacity: 0.16 },
            ],
        });
        enter();
    });
    watch(() => props.active, enter);
    onBeforeUnmount(() => {
        parallax?.destroy();
        sky?.destroy();
        front?.destroy();
        stageEl?.style.removeProperty('--name-glow');
    });
</script>

<template>
    <div class="scene" ref="root">
        <canvas class="field" ref="skyCanvas"></canvas>

        <!-- A square frame, bottom-aligned; every layer is placed as a fraction of it, as in the illustration -->
        <div class="frame">
            <div class="group" ref="group">
                <img class="layer island" ref="island" src="/assets/share/island.webp" alt="" draggable="false">
                <img class="layer friend left" ref="left" src="/assets/dana/left.webp" alt="" draggable="false">
                <img class="layer friend right" ref="right" src="/assets/dana/right.webp" alt="" draggable="false">
                <!-- A rulito over each head, in the cream of the one that was drawn -->
                <Rulito ref="rulitoL" class="rulito left" color="#f7f8f1" />
                <Rulito ref="rulitoR" class="rulito right" color="#f7f8f1" />
                <img class="layer flame" ref="flame" src="/assets/share/fire.webp" alt="" draggable="false">
                <!-- Everyone who can be given a light, and the flame itself -->
                <div v-for="(g, i) in GIFTS" :key="g.id" class="hit gift" role="button" tabindex="0"
                    :aria-label="$i18n.locale === 'en' ? g.en : g.es"
                    :style="{ left: `${g.hit.x}%`, top: `${g.hit.y}%`, width: `max(${g.hit.w}%, 44px)`, height: `max(${g.hit.h}%, 44px)` }"
                    @pointerdown="give(i)" @keydown="onKey($event, i)"></div>
                <div class="hit flame-hit" role="button" tabindex="0" :aria-label="$i18n.locale === 'en' ? 'Little flame' : 'Llamita'"
                    @pointerdown="touch" @keydown="onKey($event)"></div>
            </div>
        </div>

        <canvas class="field" ref="frontCanvas"></canvas>
    </div>
</template>

<style scoped>
    /* The night deepens towards the top; at the bottom it is the card's colour, so it meets the reading below */
    .scene {
        position: absolute;
        inset: 0;
        overflow: hidden;
        background:
            radial-gradient(ellipse 70% 45% at 50% 72%, rgba(80, 214, 210, 0.28), transparent 70%),
            linear-gradient(to bottom, #0b3d52 0%, #0a5f73 38%, #0089a0 72%, v-bind('card.color || "#0099A6"') 100%);
    }

    .field {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
    }

    .frame {
        --s: min(max(100vw, 62svh), 85svh, 135vw);
        position: absolute;
        width: var(--s);
        height: var(--s);
        left: calc(50% - var(--s) / 2);
        bottom: 0;
        pointer-events: none;
    }

    /* On a wide screen the island, drawn bigger, would touch the bottom: a little room for its drops to fall */
    @media (min-aspect-ratio: 1/1) {
        .frame { bottom: min(6svh, calc(100svh - var(--s) - 70px)); }
    }

    /* On a tall screen the picture would sit at the bottom with the sky empty above it: lift it towards the middle */
    @media (max-aspect-ratio: 1/1) {
        .frame { bottom: calc((100svh - var(--s)) * 0.4); }
    }

    .group {
        position: absolute;
        inset: 0;
    }

    .layer {
        position: absolute;
        display: block;
        height: auto;
        max-width: none;
        translate: 0 0;
        user-select: none;
        pointer-events: none;
    }

    /* Left and top as fractions of the frame, measured from the illustration (the two were one picture 37.5% wide at
       31.25%, 21.6%), and then set apart (the left one 6% to the left, the right one 5% to the right) so the flame has
       room to fly between them. Their feet end a hair below the grass line of the island, so they stand on it. */
    .friend {
        transform-origin: 50% 100%;
    }

    .friend.left {
        left: 25.25%;
        top: 31.714%;
        width: 12.159%;
    }

    .friend.right {
        left: 53.068%;
        top: 30.52%;
        width: 20.682%;
    }

    /* Where the drawn rulito was over the right one (8% of the frame tall, moved with him), and the same over the left one's head */
    .rulito {
        position: absolute;
        width: 3%;
        transform-origin: 50% 100%;
        pointer-events: none;
    }

    .rulito.right {
        left: 65.4%;
        top: 21.9%;
    }

    .rulito.left {
        left: 30.2%;
        top: 23.1%;
    }

    /* Placed at the right one's hand; the game moves it from there. Its ball is the centre of everything it does */
    .flame {
        left: 52.39%;
        top: 45.27%;
        width: 5%;
        transform-origin: 50% 75%;
    }

    /* A small floating island, whole: in the illustration it is 69% wide at 15.5%, 58.3%; here it is drawn 1.22 times
       bigger (ISLAND) from where the friends stand (PIVOT: 50%, 68%) */
    .island {
        left: 7.91%;
        top: 56.17%;
        width: 84.18%;
    }

    /* Everyone who can be given a light: a box round him (left and top are its centre), big enough for a finger. Taps
       only, so the page still scrolls from them */
    .hit {
        position: absolute;
        translate: -50% -50%;
        border-radius: 50%;
        cursor: pointer;
        pointer-events: auto;
        -webkit-tap-highlight-color: transparent;
        touch-action: manipulation;
        outline: none;
    }

    /* Over the ball of the little flame */
    .flame-hit {
        left: 54.89%;
        top: 53.42%;
        width: max(11%, 56px);
        aspect-ratio: 1 / 1.4;
        translate: -50% -60%;
    }

    .hit:focus-visible {
        outline: 2px solid rgba(255, 244, 150, 0.9);
        outline-offset: 2px;
    }
</style>
