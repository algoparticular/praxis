<script setup>
    // Nekkhamma: renunciation, "a sacred being making a human experience". Sid walks on the ground of a night that ends,
    // on the right, in a cloud of the colours of everything (the dots of the illustration as real particles).
    // The illustration shows four Sids, each one more undone than the last: here they are one, who goes through those four
    // states as he lets go. Its verb is Soltar (let go): a touch on Sid lets go of a state: what he was flies off as dots
    // into the cloud and he walks on, lighter, to where the next one stands in the drawing. Holding him gathers his breath
    // (he shines and trembles) and letting go after a while undoes him all at once. When the last of him, all dots, lets go,
    // he becomes the cloud; then the cloud gives him back, whole, where he started, with the rulito over his head (as the
    // card draws it): letting go is not losing the body but living in it lightly. Left alone a while, he takes back what
    // he let go, one state at a time.
    // It is drawn in WebGL (useLayerStage): the sky, the planet, the cloud, the ground and Sid are planes at their depths;
    // the stars, the cloud, Sid's dots and what flies between him and the cloud are particles (useStardust), from the dots
    // of the illustration (nekkhammaScene.json, made by scripts/convert-nekkhamma.mjs). The touch target is a DOM element
    // kept over Sid.
    import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { createParallax } from '../../composables/useParallax.js';
    import { createLayerStage } from '../../composables/useLayerStage.js';
    import { startStardust } from '../../composables/useStardust.js';
    import { play } from '../../composables/useSound.js';
    import { sceneMilestone } from '../../analytics.js';
    import Rulito from '../Rulito.vue';
    import art from '../../composables/nekkhammaScene.json';

    const props = defineProps({
        card: { type: Object, default: () => ({}) },
        active: Boolean
    });

    const root = ref(null);
    const canvas = ref(null);
    const hit = ref(null);
    const rulito = ref(null);
    let stageEl = null;
    let stage = null;
    let parallax = null;
    let dust = null;
    let entered = false;
    let gone = false;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ---- Layout: the illustration is a 2160 square (`art.size`), placed as a frame on the screen
    const SIZE = art.size;
    let F = { x: 0, y: 0, size: 1 };
    let W = 1, H = 1;
    const k = () => F.size / SIZE;
    const rectOf = ([left, top, w, h], dx = 0) => ({ left: F.x + (left + dx) * k(), top: F.y + top * k(), w: w * k(), h: h * k() });
    // A square frame resting on the bottom of the screen. On a phone upright it is much wider than the screen, so Sid is
    // not too small, and the view follows him as he walks (`pan`, px), with the farther planes following less
    const layout = (w, h) => {
        W = w; H = h;
        const size = w < h ? Math.min(0.7 * h, 2.1 * w) : Math.min(Math.max(w, 0.55 * h), 0.85 * h);
        F = { x: w / 2 - size / 2, y: h - size, size };
    };
    let pan = 0;
    // Where the view wants to be: Sid near the left, or, while he is the cloud, the cloud in the middle (only when the
    // frame is wider than the screen, and never past its edges)
    const panFor = (focus, at) => {
        if (F.size <= W) return 0;
        return Math.min(-F.x, Math.max(W - F.size - F.x, at * W - F.x - focus * k()));
    };
    const PAN = { wind: 0.5, planet: 0.65, cloud: 0.85, ground: 1, sid: 1 };

    // The camera slides SLIDE px at the edge of a swipe; each layer moves as far as its depth (px)
    const SLIDE = 50;
    const SLIDE_Y = 30;
    const zFor = (amp) => amp / (SLIDE + amp);
    const DEPTH = { wind: 5, planet: 9, cloud: 15, ground: 26, sid: 26 };

    // ---- Sid's four states, as the illustration draws them from left to right: whole, his legs undone, only his head
    // left, all dots. X is where each one's head stands in the drawing (art px), so one Sid walks from one to the next
    const STATES = [
        { pictures: ['sid1'], dots: null },
        { pictures: ['sid2-fill', 'sid2-line', 'sid2-arm'], dots: 'sid2-dots' },
        { pictures: ['sid3-fill', 'sid3-line', 'sid3-arm'], dots: 'sid3-dots' },
        { pictures: ['sid4-eyes'], dots: 'sid4-dots' },
    ];
    const X = [354, 722, 1089, 1476];
    const TOP = 1060, FEET = 1772;                  // Sid's head and feet (art px)
    const LAST = STATES.length - 1;
    const RULITO = [294, 843, 77, 198];             // where the card draws the rulito, over the whole Sid (art px)
    const color = (i) => art.colors[i];
    const rgb = (c) => [((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255];
    const WHITE = 0xe0f0f0;
    const CYAN = 0x10c0d0;

    // ---- The game
    let level = 0;                      // the state he is in (0 whole .. LAST all dots)
    let pos = X[0];                     // where his head is now (art px): it walks towards X[level]
    let shown = true;                   // false while he is the cloud
    const look = STATES.map((_, i) => (i === 0 ? 1 : 0));      // how much each state's pictures are seen
    const dotsOn = STATES.map((_, i) => (i === 0 ? 1 : 0));    // and its dots (they go at once when they fly off)
    let lastT = 0;
    let lastTouch = -Infinity;
    let lastBack = 0;
    let pressAt = null;                 // when the finger (or the key) went down on him
    let breathing = false;              // the hold has become a breath (inhale played)
    let charge = 0;                     // 0..1 the breath gathered
    let rush = null;                    // letting go of everything at once: { next } the time of the next step
    let flash = 0;                      // a flare of Sid when he lets go or comes back
    let wins = 0;
    let win = null;                     // the cloud has him, then gives him back with the rulito
    let invite = 3;                     // when the next motes leave his feet while he is still whole
    let glyph = { left: 0, top: 0, w: 1, h: 1 };
    const HOLD = 0.45;                  // s pressed before a press becomes a breath
    const BREATH = 1.8;                 // s more to gather it whole
    const IDLE = 8;                     // s alone before he takes back a state
    const BACK = 4;                     // s between one taken back and the next
    const DELAY = 3.4, GROW = 2.2, LINGER = 2.8, EAT = 3.4;    // the rulito: after he is given back, born, kept, gone

    // ---- What flies between Sid and the cloud: slots of a dynamic particle group, in art px
    const FLYERS = 300;
    const fly = Array.from({ length: FLYERS }, () => ({ on: false }));
    let flyNext = 0;
    const cloudDots = art.dots.cloud;
    const send = (from, to, { at = lastT, dur = 1.6, size = 5, c0 = WHITE, c1 = null, arc = 0.25 } = {}) => {
        const f = fly[flyNext];
        flyNext = (flyNext + 1) % FLYERS;
        // A curve, bending up (and a little to one side) on the way
        const mx = (from[0] + to[0]) / 2, my = (from[1] + to[1]) / 2;
        const d = Math.hypot(to[0] - from[0], to[1] - from[1]);
        Object.assign(f, {
            on: true, at, dur, size, x0: from[0], y0: from[1], x1: to[0], y1: to[1],
            cx: mx + (Math.random() - 0.5) * d * 0.3, cy: my - d * arc * (0.5 + Math.random()),
            c0: rgb(c0), c1: rgb(c1 ?? c0),
        });
    };
    const someCloud = () => cloudDots[Math.floor(Math.random() * cloudDots.length)];
    // The dots of a state where they are now (art px), at Sid's place
    const dotsOf = (s, at = pos) => (STATES[s].dots ? art.dots[STATES[s].dots].map(([x, y, r]) => [x + at - X[s], y, r]) : []);
    // Some points of the whole Sid (state 0 has no dots: his legs are where the next state's dots will be)
    const bodyOf = (s, at = pos) => (s === 0 ? dotsOf(1, at) : dotsOf(s, at));

    // Letting go of one state: what he was flies off into the cloud and he walks on to the next
    const forward = (sound = true) => {
        if (level >= LAST) { dissolve(); return; }
        const from = bodyOf(level);
        dotsOn[level] = 0;
        from.forEach(([x, y, r], i) => {
            if (i % 2 && level === 0) return;
            const target = someCloud();
            send([x, y], [target[0], target[1]], { dur: 1.4 + Math.random() * 1.2, size: 2 * r * k(), c1: color(target[3]), at: lastT + Math.random() * 0.25 });
        });
        level += 1;
        flash = 1;
        if (sound) play('release');
    };

    // Taking a state back: the cloud gives back what he let go, and he steps back to where he stood
    const back = () => {
        if (level <= 0) return;
        level -= 1;
        const to = bodyOf(level, X[level]);
        to.forEach(([x, y, r], i) => {
            if (i % 2) return;
            const source = someCloud();
            send([source[0], source[1]], [x, y], { dur: 1.8 + Math.random() * 0.8, size: 2 * r * k(), c0: color(source[3]), c1: WHITE, arc: 0.15 });
        });
        play('bloom');
    };

    // The last of him lets go: all of him flies into the cloud, the cloud flares, and then it gives him back
    const dissolve = () => {
        if (win) return;
        wins += 1;
        win = { age: 0, head: 0, tail: 0, full: false, fullAt: 0, back: false, pop: 0, given: false, home: false };
        rulito.value?.reshape();
        dotsOf(LAST).forEach(([x, y, r]) => {
            const target = someCloud();
            send([x, y], [target[0], target[1]], { dur: 1.2 + Math.random() * 1.3, size: 2 * r * k(), c1: color(target[3]), at: lastT + Math.random() * 0.4 });
        });
        dotsOn[LAST] = 0;
        shown = false;
        flash = 1;
        play('converge');
        sceneMilestone('renounced', { times: wins, breath: rush !== null });
        rush = null;
    };

    // The cloud gives him back, whole, where he started
    const giveBack = () => {
        win.given = true;
        pos = X[0];
        level = 0;
        dotsOf(1, X[0]).concat(dotsOf(2, X[0]), dotsOf(1, X[0])).forEach(([x, y, r]) => {
            const source = someCloud();
            send([source[0], source[1]], [x + (Math.random() - 0.5) * 60, y - Math.random() * 300], { dur: 1.7 + Math.random() * 0.6, size: 2 * r * k(), c0: color(source[3]), c1: WHITE, arc: 0.12 });
        });
    };

    // ---- Pressing Sid: a tap lets go of one state; held, it becomes a breath, and let go after it is gathered, of all
    const press = () => {
        if (pressAt !== null || reduced) return;
        pressAt = lastT;
        lastTouch = lastT;
        window.addEventListener('pointerup', letGo);
        window.addEventListener('pointercancel', letGo);
    };
    const letGo = () => {
        window.removeEventListener('pointerup', letGo);
        window.removeEventListener('pointercancel', letGo);
        if (pressAt === null) return;
        pressAt = null;
        lastTouch = lastT;
        const gathered = charge >= 1;
        breathing = false;
        if (win) { play('tap'); return; }
        if (rush) return;
        if (gathered) {
            play('exhale');
            rush = { next: lastT };
        } else forward();
    };
    const onKeyDown = (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        if (!event.repeat) press();
    };
    const onKeyUp = (event) => {
        if (event.key === 'Enter' || event.key === ' ') letGo();
    };
    const L = { states: [] };

    const build = (s) => {
        const wind = s.depth(zFor(DEPTH.wind));
        L.wind = wind.image('/assets/nekkhamma/wind.webp', { blur: 1 });
        const far = s.depth(zFor(DEPTH.planet));
        L.planet = far.group();
        L.planetBody = L.planet.image('/assets/nekkhamma/planet.webp');
        L.ring = L.planet.image('/assets/nekkhamma/ring.webp');
        const cosmos = s.depth(zFor(DEPTH.cloud));
        L.cosmos = cosmos;
        L.galaxyA = cosmos.image('/assets/nekkhamma/galaxy-a.webp', { bloom: true });
        L.galaxyB = cosmos.image('/assets/nekkhamma/galaxy-b.webp', { bloom: true });
        L.cloudGlow = cosmos.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: 0x9fe8f0, stops: [[0, 0.22], [0.4, 0.1], [0.72, 0]], bloom: true });
        L.roots = { wind, planet: far, cloud: cosmos };
        const ground = s.depth(zFor(DEPTH.ground));
        L.groundNode = ground;
        L.ground = ground.image('/assets/nekkhamma/ground.webp');
        L.plants = ground.image('/assets/nekkhamma/plants.webp', { wind: { amp: 2.5, speed: 0.9 } });
        L.buds = ground.image('/assets/nekkhamma/buds.webp', { bloom: true });
        L.mark = ground.image('/assets/nekkhamma/mark.webp');
        const sid = s.depth(zFor(DEPTH.sid));
        L.sid = sid;
        Object.assign(L.roots, { ground, sid });
        // The breath gathered: a light behind him
        L.aura = sid.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: 0x9fe8f0, stops: [[0, 0.5], [0.35, 0.2], [0.7, 0]], bloom: true });
        STATES.forEach((state, i) => {
            const group = sid.group();
            const pictures = state.pictures.map((name) => group.image(`/assets/nekkhamma/${name}.webp`, { bloom: true }));
            L.states.push({ group, pictures, names: state.pictures });
            group.opacity = i === 0 ? 1 : 0;
        });
        L.rulito = L.states[0].group.canvas(rulito.value.canvas, { bloom: true });
        ground.enter({ y: 60, delay: 100, duration: 1600 });
        sid.enter({ y: 40, delay: 400, duration: 1700 });
        far.enter({ y: -30, delay: 300, duration: 2000 });
        wind.enter({ y: -20, delay: 200, duration: 2200 });
        cosmos.enter({ y: 30, scale: 0.94, delay: 500, duration: 2200 });
    };

    const place = (w, h) => {
        layout(w, h);
        pan = panFor(pos, 0.17);
        const B = art.boxes;
        L.wind.place(rectOf(B.wind));
        L.planetBody.place(rectOf(B.planet));
        L.ring.place(rectOf(B.ring));
        const planet = rectOf(B.planet);
        L.planet.pivot = { x: planet.left + planet.w / 2, y: planet.top + planet.h / 2 };
        L.galaxyA.place(rectOf(B['galaxy-a']));
        L.galaxyB.place(rectOf(B['galaxy-b']));
        L.cloudGlow.place(rectOf([1300, 0, 1000, 1700]));
        // The ground reaches both sides of the screen (and of the frame, which the view can pan along) and below the
        // frame (it moves with the pointer)
        const g = rectOf(B.ground);
        const left = Math.min(0, F.x) - SLIDE * 2, right = Math.max(W, F.x + F.size) + SLIDE * 2;
        L.ground.place({ left, top: g.top, w: right - left, h: Math.max(g.h, H - g.top) + SLIDE });
        L.plants.place(rectOf(B.plants));
        L.buds.place(rectOf(B.buds));
        L.mark.place(rectOf(B.mark));
        STATES.forEach((state, i) => {
            L.states[i].names.forEach((name, j) => L.states[i].pictures[j].place(rectOf(B[name])));
            L.states[i].group.pivot = { x: F.x + X[i] * k(), y: F.y + FEET * k() };
        });
        // The rulito over the whole Sid, where the card draws it (its canvas is bigger than the glyph, for the glow)
        const r = rectOf(RULITO);
        const rw = r.w, rh = rw * 86 / 32;
        glyph = { left: r.left + r.w / 2 - rw / 2, top: r.top + r.h - rh, w: rw, h: rh };
        L.rulito.place({ left: glyph.left - 0.4375 * glyph.w, top: glyph.top - 0.1628 * glyph.h, w: glyph.w * 1.875, h: glyph.h * 1.3256 },
            { x: glyph.left + glyph.w / 2, y: glyph.top + glyph.h });
    };

    // The box round Sid where he is now, for the finger (at least 44px wide)
    const placeHit = () => {
        const el = hit.value;
        if (!el || !L.sid) return;
        const half = 150;
        const b = L.sid.boxOnScreen(rectOf([pos - half, TOP, 2 * half, FEET - TOP]));
        const wide = Math.max(44, b.width);
        el.style.translate = `${(b.left + b.width / 2 - wide / 2).toFixed(1)}px ${b.top.toFixed(1)}px`;
        el.style.width = `${wide.toFixed(1)}px`;
        el.style.height = `${b.height.toFixed(1)}px`;
        el.style.display = shown ? '' : 'none';
    };

    const enter = () => {
        if (entered || !props.active || !stage) return;
        entered = true;
        stage.ready().then(() => { if (!gone) { stage.start(); dust?.reveal(); } });
    };

    // ---- Particles: map art px to the screen
    const toScreenX = (x) => F.x + x * k();     // (the pan is added with shift())
    const toScreenY = (y) => F.y + y * k();
    const fromArt = (list, scale = 1) => list.map(([x, y, r, c]) => [toScreenX(x), toScreenY(y), Math.max(1.2, 2 * r * k() * scale), color(c)]);

    // Sid's own dots (the states that have them), drawn where each state is now
    const bodyList = [];
    STATES.forEach((state, s) => { if (state.dots) art.dots[state.dots].forEach(([x, y, r, c]) => bodyList.push({ s, x, y, r, c: rgb(color(c)) })); });
    let bob = 0;
    const body = {
        count: bodyList.length,
        update(t, data) {
            bodyList.forEach((d, i) => {
                const dx = pos - X[d.s];
                data.positions[i * 3] = toScreenX(d.x + dx);
                data.positions[i * 3 + 1] = toScreenY(d.y) - bob;
                data.sizes[i] = Math.max(1.2, 2 * d.r * k()) * (1 + 0.25 * charge);
                data.alphas[i] = dotsOn[d.s] ? look[d.s] : 0;
                data.tints.set(d.c, i * 3);
            });
        },
    };
    const flyers = {
        count: FLYERS,
        update(t, data) {
            for (let i = 0; i < FLYERS; i++) {
                const f = fly[i];
                let p = f.on ? (t - f.at) / f.dur : -1;
                if (f.on && p >= 1) { f.on = false; p = -1; }
                if (p < 0) { data.alphas[i] = 0; data.sizes[i] = 0; continue; }
                const e = p * p * (3 - 2 * p);
                const a = 1 - e;
                const x = a * a * f.x0 + 2 * a * e * f.cx + e * e * f.x1;
                const y = a * a * f.y0 + 2 * a * e * f.cy + e * e * f.y1;
                data.positions[i * 3] = toScreenX(x);
                data.positions[i * 3 + 1] = toScreenY(y);
                data.sizes[i] = Math.max(1.2, f.size * (1 - 0.3 * Math.sin(Math.PI * p)));
                data.alphas[i] = Math.min(1, p * 8) * Math.min(1, (1 - p) * 5);
                for (let c = 0; c < 3; c++) data.tints[i * 3 + c] = f.c0[c] + (f.c1[c] - f.c0[c]) * e;
            }
        },
    };

    let frames = 0;
    const frame = ({ x, y, scroll, t, ramp }) => {
        if (!stage || !L.sid) return;
        const dt = Math.min(0.1, Math.max(0, t - lastT));
        lastT = t;
        stage.look(x * SLIDE, y * SLIDE_Y);

        // The press: past HOLD it is a breath, gathered over BREATH
        if (pressAt !== null && !win && !rush) {
            const held = t - pressAt;
            if (held > HOLD && !breathing) { breathing = true; play('inhale'); }
            charge = Math.min(1, Math.max(0, (held - HOLD) / BREATH));
            if (breathing && Math.random() < dt * 14 * charge) {
                // Motes leave him as the breath gathers
                const d = bodyOf(level)[Math.floor(Math.random() * Math.max(1, bodyOf(level).length))];
                if (d) send([d[0], d[1]], [d[0] + 40 + Math.random() * 120, d[1] - 80 - Math.random() * 200], { dur: 1.2, size: 3 * k() * 2, c1: CYAN, arc: 0.1 });
            }
            if (charge >= 1) dust?.boost(4, 0.6);
        } else charge = Math.max(0, charge - dt * 2.5);

        // The breath let go after it was gathered: every state goes, one quickly after the other
        if (rush && !win && t >= rush.next) { rush.next = t + 0.38; forward(false); }

        // Left alone a while, he takes back one state, then another
        if (!win && !rush && pressAt === null && level > 0 && t - lastTouch > IDLE && t - lastBack > BACK) { lastBack = t; back(); }

        // While he is still whole and nobody has touched him, a few motes leave his feet now and then: he could let go
        if (!win && level === 0 && t - lastTouch > 6 && t > invite && ramp > 0.9 && !reduced) {
            invite = t + 4 + Math.random() * 3;
            const feet = dotsOf(1, pos).filter(([, py]) => py > 1650);
            for (let i = 0; i < 5; i++) {
                const [fx, fy] = feet[Math.floor(Math.random() * feet.length)];
                send([fx, fy], [fx + 80 + Math.random() * 160, fy - 120 - Math.random() * 160], { dur: 2.2 + Math.random(), size: 4 * k() * 2, c1: [CYAN, 0xf06070, WHITE][i % 3], arc: 0.1, at: t + i * 0.18 });
            }
        }

        // He walks to where his state stands, bobbing a little as he goes
        const target = X[level];
        const step = target - pos;
        pos += Math.sign(step) * Math.min(Math.abs(step), dt * (60 + Math.abs(step) * 2.4));
        const walking = Math.min(1, Math.abs(step) / 40);
        bob = Math.abs(Math.sin(t * 7)) * 6 * k() * walking;
        flash = Math.max(0, flash - dt * 1.6);
        STATES.forEach((_, i) => {
            const want = shown && i === level ? 1 : 0;
            look[i] += (want - look[i]) * Math.min(1, dt * (want ? 2.6 : 3.4));
            if (want && look[i] > 0.05) dotsOn[i] = 1;
            const st = L.states[i];
            st.group.opacity = look[i];
            st.group.x = (pos - X[i]) * k();
            st.group.y = -bob + Math.sin(t * 1.1) * 2 * ramp;
            st.group.rotate = Math.sin(t * 7) * 1.6 * walking;
            st.pictures.forEach((p) => {
                p.uniforms.uBright.value = 1 + 0.35 * charge + 0.4 * flash;
            });
        });
        const ax = toScreenX(pos), ay = toScreenY((TOP + FEET) / 2);
        const ad = (FEET - TOP) * k() * (1.1 + 0.3 * charge);
        L.aura.place({ left: ax - ad / 2, top: ay - ad / 2, w: ad, h: ad });
        L.aura.opacity = Math.min(1, 0.9 * charge + 0.6 * flash) * (shown ? 1 : 0);

        // The win: the cloud has him; it gives him back; the rulito is born over him, kept, and goes
        let named = 0;
        if (win && rulito.value) {
            win.age += dt;
            if (!win.given && win.age > 1.6) giveBack();
            if (win.given && !win.home && win.age > DELAY - 0.6) { win.home = true; shown = true; flash = 1; play('bloom'); }
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
                lastTouch = t;
                rulito.value.frame({ width: glyph.w });
                L.rulito.refresh();
            }
        }
        stageEl?.style.setProperty('--name-glow', named.toFixed(3));
        const cosmic = win && !win.home ? Math.sin(Math.PI * Math.min(1, win.age / (DELAY - 0.6))) : 0;
        stage.bloom = Math.max(named, 0.6 * cosmic, 0.3 * charge);
        dust?.boost(2, cosmic * 0.8);

        // The sky: the wind drifts, the planet floats, the galaxies turn, the cloud breathes
        L.wind.x = Math.sin(t * 0.07) * 40 * ramp;
        L.planet.y = Math.sin(t * 0.4) * 8 * ramp;
        L.planet.rotate = Math.sin(t * 0.25) * 4 * ramp;
        L.galaxyA.rotate = t * 9 * (1 + 3 * cosmic);
        L.galaxyB.rotate = -t * 7 * (1 + 3 * cosmic);
        L.cloudGlow.opacity = 0.6 + 0.25 * Math.sin(t * 0.5) + 0.8 * cosmic;
        L.buds.uniforms.uBright.value = 1 + 0.18 * Math.sin(t * 1.3) + 0.5 * named;
        L.cosmos.y = Math.sin(t * 0.3) * 6 * ramp - scroll * 10;
        L.sid.y = scroll * 26;
        L.groundNode.y = scroll * 26;

        // The view follows Sid (on a phone upright)
        const view = win && !win.home ? panFor(1750, 0.55) : panFor(pos, 0.17);
        pan += (view - pan) * Math.min(1, dt * 1.4);
        Object.entries(L.roots).forEach(([name, node]) => { node.x = pan * PAN[name]; });

        const near = stage.drift(L.sid.z), mid = stage.drift(L.cosmos.z), far = stage.drift(zFor(4));
        dust?.shift(1, far.x + pan * PAN.wind, far.y);
        dust?.shift(2, mid.x + pan * PAN.cloud, mid.y + L.cosmos.y);
        dust?.shift(3, near.x + pan, near.y + L.groundNode.y);
        dust?.shift(4, near.x + pan, near.y + L.sid.y);
        dust?.shift(5, (near.x + mid.x) / 2 + pan, (near.y + mid.y) / 2 + L.sid.y);
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
        const after = (node) => node.mesh.renderOrder + 0.5;
        dust = startStardust(null, {
            stage,
            manual: true,
            groups: [
                // 0: the far night: faint dark dots and a few pale ones all over the sky
                { count: 170, colors: [0x202030, 0x202030, 0x2a2b48, 0xd9efed], size: [1.6, 4.2], twinkle: 0.45, drift: 3, reach: 0, parallax: 6, order: -20 },
                // 1: the stars of the card
                { colors: [0x202030], parallax: 0, drift: 1.5, twinkle: 0.3, reach: 0, order: -19, points: () => fromArt(art.dots.stars) },
                // 2: the cloud of the colours of everything; a finger stirs it
                { parallax: 0, drift: 3.5, jitter: 0.25, twinkle: 0.3, reach: 90, push: 22, bloom: true, order: after(L.galaxyB), points: () => fromArt(cloudDots) },
                // 3: the pink specks over the mushrooms
                { parallax: 0, drift: 2, twinkle: 0.85, reach: 0, order: after(L.mark), points: () => fromArt(art.dots.specks, 1.4) },
                // 4: Sid's own dots
                { dynamic: body, parallax: 0, drift: 1.2, jitter: 0.3, twinkle: 0.1, reach: 0, bloom: true, order: after(L.states[LAST].pictures[0]) },
                // 5: what flies between him and the cloud
                { dynamic: flyers, look: 'soft', parallax: 0, drift: 2, twinkle: 0.2, reach: 0, bloom: true, order: after(L.rulito) },
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
        window.removeEventListener('pointerup', letGo);
        window.removeEventListener('pointercancel', letGo);
        parallax?.destroy();
        dust?.destroy();
        stage?.destroy();
        stageEl?.style.removeProperty('--name-glow');
    });
</script>

<template>
    <div class="scene" ref="root">
        <canvas class="stageCanvas" ref="canvas"></canvas>
        <!-- The rulito is drawn on its own canvas, which the stage shows as a texture over Sid -->
        <Rulito ref="rulito" class="offstage" color="#0cbed3" />
        <!-- Sid: a touch lets go of one state, held and let go it lets go of everything -->
        <div ref="hit" class="sid" role="button" tabindex="0"
            :aria-label="$i18n.locale === 'en' ? 'Sid: touch him to let go, hold him to let go of everything' : 'Sid: tocalo para soltar, mantenelo para soltarlo todo'"
            @pointerdown.prevent="press" @keydown="onKeyDown" @keyup="onKeyUp" @blur="letGo"
            @contextmenu.prevent @dragstart.prevent @selectstart.prevent></div>
    </div>
</template>

<style scoped>
    /* The night is the card's colour, deeper towards the top */
    .scene {
        position: absolute;
        inset: 0;
        overflow: hidden;
        background: linear-gradient(to bottom, #222339 0%, #2e2f4a 35%, v-bind('card.color || "#3A3B57"') 75%);
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

    .sid {
        position: absolute;
        left: 0;
        top: 0;
        width: 0;
        height: 0;
        border-radius: 40%;
        cursor: pointer;
        pointer-events: auto;
        -webkit-tap-highlight-color: transparent;
        -webkit-touch-callout: none;
        user-select: none;
        touch-action: none;                    /* held, a finger drifts a little: the phone must not take it for a scroll */
        outline: none;
    }

    .sid:focus-visible {
        outline: 2px solid rgba(159, 232, 240, 0.9);
        outline-offset: 4px;
    }
</style>
