<script setup>
    // Dana (generosity): two friends standing on a small green island, and a little flame between them, under a sky of
    // real particles. The friends, the flame and the island are separate layers that move together as one group, so
    // the friends stay planted on the island. All the particles live on one canvas behind the drawings (useStardust), so
    // they never cover them: the stars, the little flame's living embers (red and yellow, rising from it and circling
    // it) and the glow of the friend on the left.
    // Its verb is Dar y recibir (give and receive), played by throwing and catching: the friend on the right (the one
    // with the glow, holding out his hand) has the flame. Grab it and throw it to the other one: it flies in an arc and
    // waits in front of him until it is caught (a touch on it, also in the air). Then he throws it back. Each time it is
    // caught it comes back bigger, and the one on the left lights up a little more with every one he receives. After
    // three goes there and back (ROUNDS) both glow alike: a rulito is born over each head and the card's name lights up.
    // A throw that goes nowhere near the other floats back to the hand it left; nothing is lost.
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

    const props = defineProps({
        card: { type: Object, default: () => ({}) },
        active: Boolean
    });

    const root = ref(null);
    const skyCanvas = ref(null);
    const group = ref(null);
    const left = ref(null);
    const right = ref(null);
    const flame = ref(null);
    const island = ref(null);
    const hit = ref(null);
    const rulitoL = ref(null);
    const rulitoR = ref(null);
    let parallax = null;
    let sky = null;
    let entered = false;
    let stageEl = null;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // The fire-ball picture: where its glass ball is, as fractions of the picture (0.5 across, 0.75 down, 0.285 wide)
    const BALL = { x: 0.5, y: 0.75, r: 0.285 };

    // Where the ball of the flame sits in each one's hand, in % of the frame. The right one holds it out (as drawn);
    // the left one's hand hangs by his side, so the flame floats just above it
    const HAND = { right: { x: 54.89, y: 53.42 }, left: { x: 37.47, y: 55.8 } };
    const HOME = HAND.right;                       // where the flame's layer is placed in the CSS
    // Where a flame thrown to someone waits for him to catch it: a little above his hand
    const OFFER = { right: { x: 53.6, y: 47.8 }, left: { x: 39.8, y: 50.4 } };
    const OTHER = { right: 'left', left: 'right' };
    const PITCH = { right: 0.62, left: 0.38 };     // the note of each, for the sound of giving and receiving
    const ROUNDS = 3;                              // goes there and back until the two are balanced

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

    let holder = 'right';                          // who has the flame
    let phase = 'rest';                            // rest | drag | fly | offer | miss | home
    const pos = { x: HOME.x, y: HOME.y };          // the ball of the flame, in % of the frame
    let fly = null;                                // { from, to, c, age, T, to: who receives } while it flies in an arc
    let tween = null;                              // { from, to, age, T } while it settles into a hand or floats back
    let vel = { x: 0, y: 0 };                      // a throw that went nowhere: it flies on for a moment
    let missAge = 0;
    let drag = null;                               // { id, dx, dy, startX, startY, moved, samples }
    let gifts = 0;                                 // how many times the flame has been caught in this try
    let size = 1;                                  // the flame grows each time it is caught (size eases to sizeGoal)
    let sizeGoal = 1;
    let glowL = 0;                                 // 0..1: the glow of the one on the left, easing towards glowGoal
    let glowGoal = 0;
    let glowRest = 0;                              // what is left of his glow after a balance (he keeps some)
    let boost = 0;                                 // a flare of his glow when the two are balanced
    let idle = 0;
    let trail = 0;
    let win = null;                                // the two rulitos: { age, head, tail, full, fullAt, back, pop }
    let wins = 0;
    let lastT = 0;

    const ease = (u) => u * u * (3 - 2 * u);
    const unit = () => (group.value?.clientWidth || 1) / 100;      // px per % of the frame

    // Where a pointer is, in % of the frame (the group moves with the island, and the flame moves with it)
    const toFrame = (event) => {
        const box = group.value.getBoundingClientRect();
        return { x: (event.clientX - box.left) / box.width * 100, y: (event.clientY - box.top) / box.height * 100 };
    };
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

    // Throwing it to the other one: an arc from where it was let go to where he will catch it, higher the harder it is thrown
    const throwTo = (speed = 0, up = 0) => {
        const to = OTHER[holder];
        const from = { x: pos.x, y: pos.y }, end = OFFER[to];
        const peak = Math.min(26, 7 + Math.max(0, up) * 0.05 + speed * 0.015);
        const c = { x: (from.x + end.x) / 2, y: Math.min(from.y, end.y) - peak * 2 };
        fly = { from, c, end, to, age: 0, T: 0.75 + peak * 0.018 };
        phase = 'fly';
        fire.flare(0.6);
        play('give', { from: PITCH[holder] });
    };
    // Handing it over gently (let go right next to him): a short hop
    const handTo = () => {
        const to = OTHER[holder];
        const from = { x: pos.x, y: pos.y }, end = OFFER[to];
        fly = { from, c: { x: (from.x + end.x) / 2, y: Math.min(from.y, end.y) - 3 }, end, to, age: 0, T: 0.45 };
        phase = 'fly';
        play('give', { from: PITCH[holder] });
    };
    const goHome = (T = 0.9) => {
        tween = { from: { x: pos.x, y: pos.y }, to: HAND[holder], age: 0, T };
        phase = 'home';
    };

    // Catching it: it settles into the hand of the one who receives it, a little bigger
    const receive = () => {
        const giver = holder, to = fly?.to ?? OTHER[holder];
        holder = to;
        fly = null;
        tween = { from: { x: pos.x, y: pos.y }, to: HAND[to], age: 0, T: 0.35 };
        phase = 'home';
        gifts += 1;
        sizeGoal = Math.min(1.75, 1 + 0.12 * gifts);
        if (to === 'left') glowGoal = Math.max(glowRest, Math.min(1, Math.ceil(gifts / 2) / ROUNDS));
        fire.flare(0.8);
        burstAt(pos.x, pos.y, 26, to === 'left' ? GLOWS : EMBERS, 110);
        play('link', { from: PITCH[giver], to: PITCH[to], level: 1 });
        if (gifts >= ROUNDS * 2) setTimeout(balance, 380);
    };

    // Three goes there and back: both glow alike, and a rulito is born over each head
    const balance = () => {
        if (win) return;
        wins += 1;
        win = { age: 0, head: 0, tail: 0, full: false, fullAt: 0, back: false, pop: 0 };
        rulitoL.value?.reshape();
        rulitoR.value?.reshape();
        boost = 1;
        fire.flare(1);
        burstAt(pos.x, pos.y, 60, [...EMBERS, ...GLOWS], 190);
        play('star');
        sceneMilestone('gift_balanced', { times: wins });
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
            // He keeps a little of what he received; the flame goes back to its size
            glowRest = 0.35;
            glowGoal = glowRest;
            gifts = 0;
            sizeGoal = 1;
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

    /* ---------- Touch ---------- */

    const onDown = (event) => {
        if (reducedMotion) { touch(); return; }
        idle = 0;
        // Catching it, in the air or where it waits
        if (phase === 'fly' || phase === 'offer') {
            receive();
            return;
        }
        if (win || phase !== 'rest') { touch(); return; }
        const p = toFrame(event);
        drag = { id: event.pointerId, dx: pos.x - p.x, dy: pos.y - p.y, startX: p.x, startY: p.y, moved: false, samples: [{ t: performance.now(), ...p }] };
        hit.value?.setPointerCapture?.(event.pointerId);
    };
    const onMove = (event) => {
        if (!drag || event.pointerId !== drag.id) return;
        const p = toFrame(event);
        if (!drag.moved && Math.hypot(p.x - drag.startX, p.y - drag.startY) > 1.2) {
            drag.moved = true;
            phase = 'drag';
            fire.flare(0.4);
        }
        drag.samples.push({ t: performance.now(), ...p });
        if (drag.samples.length > 8) drag.samples.shift();
        if (drag.moved) {
            pos.x = Math.min(96, Math.max(4, p.x + drag.dx));
            pos.y = Math.min(96, Math.max(4, p.y + drag.dy));
        }
    };
    const onUp = (event) => {
        if (!drag || event.pointerId !== drag.id) return;
        const d = drag;
        drag = null;
        if (!d.moved) { touch(); return; }
        // How fast it was going when it was let go (% of the frame per second), from the last tenth of a second
        const now = performance.now();
        const recent = d.samples.filter((s) => now - s.t < 110);
        const a = recent[0] ?? d.samples[0], b = d.samples[d.samples.length - 1];
        const dt = Math.max(0.016, (b.t - a.t) / 1000);
        const v = { x: (b.x - a.x) / dt, y: (b.y - a.y) / dt };
        const speed = Math.hypot(v.x, v.y);
        const to = OTHER[holder];
        const towards = Math.sign(HAND[to].x - HAND[holder].x);
        const offer = OFFER[to];
        if (event.type !== 'pointercancel' && speed > 35 && v.x * towards > 0.25 * speed) throwTo(speed, -v.y);
        else if (event.type !== 'pointercancel' && Math.hypot(pos.x - offer.x, pos.y - offer.y) < 9) handTo();
        else if (speed > 35) { vel = { x: v.x * 0.6, y: v.y * 0.6 }; missAge = 0; phase = 'miss'; }
        else goHome(0.6);
    };
    const onKey = (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        if (reducedMotion) { touch(); return; }
        idle = 0;
        if (phase === 'fly' || phase === 'offer') receive();
        else if (phase === 'rest' && !win) throwTo(60, 40);
    };

    /* ---------- Every frame ---------- */

    const step = (t) => {
        const dt = Math.min(0.05, Math.max(0, t - lastT));
        lastT = t;
        idle += dt;
        if (phase === 'fly') {
            fly.age += dt;
            const u = Math.min(1, fly.age / fly.T);
            const e = 1 - (1 - u) ** 2;              // it slows as it gets there
            const k = 1 - e;
            pos.x = k * k * fly.from.x + 2 * k * e * fly.c.x + e * e * fly.end.x;
            pos.y = k * k * fly.from.y + 2 * k * e * fly.c.y + e * e * fly.end.y;
            trail += dt;
            if (trail > 0.05) { trail = 0; burstAt(pos.x, pos.y, 3, EMBERS, 40); }
            if (u >= 1) { phase = 'offer'; idle = 0; }
        } else if (phase === 'offer') {
            // It waits in front of him, bobbing, and calls now and then
            const o = fly.end;
            pos.x = o.x + Math.sin(t * 1.6) * 0.4;
            pos.y = o.y + Math.sin(t * 2.3) * 0.7;
            if (idle > 2.5) { idle = 0.8; fire.flare(0.35); burstAt(pos.x, pos.y, 8, EMBERS, 60); }
        } else if (phase === 'miss') {
            missAge += dt;
            vel.y += 120 * dt;
            const damp = Math.exp(-2.4 * dt);
            vel.x *= damp;
            vel.y *= damp;
            pos.x = Math.min(96, Math.max(4, pos.x + vel.x * dt));
            pos.y = Math.min(96, Math.max(4, pos.y + vel.y * dt));
            if (missAge > 0.5) goHome(1.1);
        } else if (phase === 'home') {
            tween.age += dt;
            const u = ease(Math.min(1, tween.age / tween.T));
            pos.x = tween.from.x + (tween.to.x - tween.from.x) * u;
            pos.y = tween.from.y + (tween.to.y - tween.from.y) * u;
            if (tween.age >= tween.T) { tween = null; phase = 'rest'; idle = 0; }
        } else if (phase === 'rest') {
            const h = HAND[holder];
            pos.x = h.x;
            pos.y = h.y;
            // Left alone a while, the flame hops a little towards the other one, as if it wanted to go
            if (!win && idle > 7) {
                const u = Math.min(1, (idle - 7) / 0.9);
                const hop = Math.sin(u * Math.PI);
                const o = OFFER[OTHER[holder]];
                pos.x = h.x + (o.x - h.x) * 0.18 * hop;
                pos.y = h.y - 2.4 * hop;
                if (u >= 1) { idle = 2.5; fire.flare(0.35); }
            }
        }
        size += (sizeGoal - size) * Math.min(1, dt * (sizeGoal < size ? 0.8 : 5));
        glowL += (glowGoal - glowL) * Math.min(1, dt * 1.6);
        boost = Math.max(0, boost - dt * 0.5);
        winTick(t, dt);
    };

    // The glow of the one on the left: dots along his outline, a little out from it, like the stippled glow drawn round
    // the one on the right. It swells with each flame he receives
    const aura = {
        count: AURA.length * 3,
        update(t, data) {
            const el = left.value, canvas = skyCanvas.value;
            if (!el || !canvas) return;
            const box = el.getBoundingClientRect(), page = canvas.getBoundingClientRect();
            const w = box.width, h = box.height, x0 = box.left - page.left, y0 = box.top - page.top;
            const level = Math.min(1.4, glowL + boost * 0.6);
            const reach = w * 0.075 * (0.6 + 0.4 * Math.min(1, level));
            for (let i = 0; i < data.count; i++) {
                const [px, py, nx, ny] = AURA[Math.floor(i / 3)];
                const s = Math.sin(i * 91.7) * 0.5 + 0.5, r = Math.sin(i * 37.3 + 1) * 0.5 + 0.5;
                const off = reach * (0.15 + 0.85 * ((s + t * (0.05 + 0.08 * r)) % 1));
                data.positions[i * 3] = x0 + px * w + nx * off + Math.sin(t * 1.3 + i) * w * 0.004;
                data.positions[i * 3 + 1] = y0 + py * h + ny * off;
                data.sizes[i] = w * (0.05 + 0.06 * r) * (1 + boost * 0.4);
                const life = (s + t * (0.05 + 0.08 * r)) % 1;
                data.alphas[i] = Math.min(1, level * 1.3) * Math.sin(life * Math.PI) ** 0.7 * (0.7 + 0.3 * Math.sin(t * 3 + i * 2.1));
                const c = GLOWS[i % GLOWS.length];
                data.tints[i * 3] = (c >> 16 & 255) / 255;
                data.tints[i * 3 + 1] = (c >> 8 & 255) / 255;
                data.tints[i * 3 + 2] = (c & 255) / 255;
            }
        },
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
            // The island floats, and everything standing on it floats with it: one group, so the friends never lift off it
            const bob = Math.sin(t * 0.55) * 9 * ramp;
            group.value.style.translate = `${-x * 14}px ${-y * 6 + bob - s * 30}px`;
            // The friends breathe from their feet
            left.value.style.scale = `1 ${(1 + Math.sin(t * 0.9 + 0.8) * 0.006 * ramp).toFixed(4)}`;
            right.value.style.scale = `1 ${(1 + Math.sin(t * 0.9) * 0.006 * ramp).toFixed(4)}`;
            // The flame is where the game has it, and bobs a little on its own while it is held
            const u = unit();
            const held = phase === 'rest' ? 1 : 0;
            const fx = (pos.x - HOME.x) * u - x * 6;
            const fy = (pos.y - HOME.y) * u + (Math.sin(t * 1.3) * 4 * ramp - y * 4) * held;
            flame.value.style.translate = `${fx.toFixed(1)}px ${fy.toFixed(1)}px`;
            flame.value.style.rotate = `${(Math.sin(t * 1.7) * 3 * ramp - x * 4).toFixed(3)}deg`;
            flame.value.style.scale = size.toFixed(3);
            hit.value.style.left = `${pos.x.toFixed(2)}%`;
            hit.value.style.top = `${pos.y.toFixed(2)}%`;
        });
        sky = startStardust(skyCanvas.value, {
            groups: [
                { count: 380, colors: [0xf6e27c, 0xf6e27c, 0xee6a82, 0xfaf3d4], size: [2.2, 6.5], drift: 7, twinkle: 0.55, reach: 130, push: 34, parallax: 14 },
                { colors: [0xffffff], dynamic: aura, parallax: 0, drift: 0, twinkle: 0, reach: 0, look: 'soft' },
                fire.group(),
                sparks.group(),
            ],
        });
        enter();
    });
    watch(() => props.active, enter);
    onBeforeUnmount(() => {
        parallax?.destroy();
        sky?.destroy();
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
                <div class="hit" ref="hit" role="button" tabindex="0" :aria-label="$i18n.locale === 'en' ? 'Little flame' : 'Llamita'"
                    @pointerdown.prevent="onDown" @pointermove="onMove" @pointerup="onUp" @pointercancel="onUp"
                    @keydown="onKey"></div>
            </div>
        </div>
    </div>
</template>

<style scoped>
    .scene {
        position: absolute;
        inset: 0;
        overflow: hidden;
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

    /* A small floating island, whole */
    .island {
        left: 15.5%;
        top: 58.3%;
        width: 69%;
    }

    /* Over the ball of the little flame, wherever it is (left and top are set every frame); big enough for a finger */
    .hit {
        position: absolute;
        left: 54.89%;
        top: 53.42%;
        width: max(11%, 56px);
        aspect-ratio: 1 / 1.4;
        translate: -50% -60%;
        border-radius: 50%;
        cursor: grab;
        pointer-events: auto;
        -webkit-tap-highlight-color: transparent;
        touch-action: none;
        outline: none;
    }

    .hit:active {
        cursor: grabbing;
    }

    .hit:focus-visible {
        outline: 2px solid rgba(255, 244, 150, 0.9);
        outline-offset: 2px;
    }
</style>
