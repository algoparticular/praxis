<script setup>
    // Nekkhamma: renunciation, "a sacred being making a human experience". Sid stands on the ground of a quiet night,
    // tied by threads of dots to his things on the ground (stones, mushrooms, the cairn, glowing buds): his possessions.
    // Its verb is Soltar (let go): a touch on one of them (or on him) cuts its thread, which rises as motes, and he lets
    // go of a part of himself. He comes undone from the feet up along a ragged edge that glows (a shader on his picture),
    // the dots of his line stay a while where he was (as the illustration draws him undone) and what he lets go of
    // rises from that edge as motes, which gather over him into a cloud of the colours of everything (there is no cloud
    // before he lets go of anything). With every thread cut nothing of his body is left: his last dots rise too and he is
    // the cloud. Then the cloud comes down and gives him back, whole, with the rulito over his head (as the card draws
    // it): letting go is not losing the body but living in it lightly. Held, the press gathers a breath (he shines,
    // motes leave him) and let go after it is gathered every thread is cut at once. Left alone a moment, one thread
    // glows: that is one to cut; left alone a while, a thread grows back and he takes back a part, and the cloud thins.
    // It is drawn in WebGL (useLayerStage): the sky, the planet, the ground, the buds and Sid are planes at their
    // depths; the stars, the cloud (the dots of the illustration's cloud, moved over him), the dots of his line, the
    // threads and what flies from him to the cloud are particles (useStardust), from nekkhammaScene.json (made by
    // scripts/convert-nekkhamma.mjs). The touch targets are DOM elements kept over Sid and over his things.
    import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { createParallax } from '../../composables/useParallax.js';
    import { createLayerStage } from '../../composables/useLayerStage.js';
    import { startStardust } from '../../composables/useStardust.js';
    import { createGalaxy } from '../../composables/useGalaxy.js';
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
    const ties = ref([]);
    const rulito = ref(null);
    let stageEl = null;
    let stage = null;
    let parallax = null;
    let dust = null;
    let entered = false;
    let gone = false;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ---- Layout: the illustration is a 2160 square (`art.size`), placed as a frame resting on the bottom of the screen
    // (on a phone upright, bigger than the screen and cut at the sides, so Sid is not too small)
    const SIZE = art.size;
    let F = { x: 0, y: 0, size: 1 };
    let W = 1, H = 1;
    const k = () => F.size / SIZE;
    const sx = (x) => F.x + x * k();
    const sy = (y) => F.y + y * k();
    const rectOf = ([left, top, w, h], dx = 0, dy = 0) => ({ left: sx(left + dx), top: sy(top + dy), w: w * k(), h: h * k() });
    const layout = (w, h) => {
        W = w; H = h;
        const size = w < h ? Math.min(0.7 * h, 2.1 * w) : Math.min(Math.max(w, 0.55 * h), 0.85 * h);
        F = { x: w / 2 - size / 2, y: h - size, size };
    };

    // The camera slides SLIDE px at the edge of a swipe; each layer moves as far as its depth (px)
    const SLIDE = 50;
    const SLIDE_Y = 30;
    const zFor = (amp) => amp / (SLIDE + amp);
    const DEPTH = { wind: 5, planet: 9, cloud: 15, ground: 26, sid: 26 };
    const WIND = { amp: 4, speed: 0.9 };            // the plants sway (in the shader); the buds on them sway along

    // ---- Sid: the whole one of the illustration (the first, on the left), moved to the middle; the cloud of the
    // illustration (on its right) is moved over him
    const DX = 1080 - 354;                          // from where his head is drawn to the middle (art px)
    const CLOUD = { dx: 1080 - 1797, dy: -200, spread: 2.5 };     // and spread out sideways
    const widen = (x) => 1080 + (x + CLOUD.dx - 1080) * CLOUD.spread;
    const [, SID_TOP, , SID_H] = art.boxes.sid;
    const FEET = SID_TOP + SID_H;
    const RULITO = [294, 843, 77, 198];             // where the card draws the rulito, over the whole Sid (art px)
    const color = (i) => art.colors[i];
    const rgb = (c) => [((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255];
    const WHITE = 0xe0f0f0;
    const CYAN = 0x10c0d0;
    const GLOW = 0x9fe8f0;

    // What ties him: threads of dots from him to what he holds on to on the ground (his possessions, as the card says:
    // "beyond your name, nationality, profession, religion and possessions"). Each one cut lets go of a part of him
    const budAt = (i) => ({ x: art.buds[i][0] + art.buds[i][2] / 2, y: art.buds[i][1] + art.buds[i][3] / 2, bud: i });
    const ANCHORS = [
        { x: 556, y: 1858 },        // a mushroom
        budAt(3),                   // a glowing bud (the stone beside it is too close to be touched apart on a phone)
        { x: 907, y: 2024 },        // a stone
        { x: 1129, y: 2012 },       // two mushrooms
        { x: 1300, y: 1826 },       // the cairn
        budAt(4),
        budAt(5),
    ];
    // Where each thread holds him (height 0 feet .. 1 head, and the side it leaves from); it climbs as he comes undone
    const threads = ANCHORS.map((a, i) => ({
        a, i, on: true, grow: 0, cutAt: -9, pulse: 0,
        h: 0.18 + 0.6 * ((i * 5) % ANCHORS.length) / ANCHORS.length, side: a.x < 1080 ? -1 : 1,
    }));
    const tied = () => threads.filter((th) => th.on).length;
    // How far he has come undone (0 whole .. 1 gone): as far as the threads cut
    let level = 0;
    let rate = 1;                       // faster when he lets go of everything at once, or is given back
    // The ragged edge, as the shader draws it: a point at height h (0 feet .. 1 head) is gone when h + its jitter is
    // under the cut. The jitter stands in for the shader's noise
    const cutOf = (l) => l * 1.25 - 0.12;
    const heightOf = (y) => (FEET - y) / SID_H;
    const body = art.body.map(([x, y, c]) => ({ x: x + DX, y, c: color(c), h: heightOf(y) + (Math.random() - 0.5) * 0.22 }));
    // The dots of his line stay a while where he was, then rise into the cloud
    const line = art.outline.map(([x, y]) => ({ x: x + DX, y, h: heightOf(y) + (Math.random() - 0.5) * 0.16, size: 7 + Math.random() * 5, at: 0, off: false }));

    // The cloud: the illustration's dots, over him and much wider, each with two twins on his other side (one as far,
    // one nearer the middle, both a little displaced) so it keeps its density, thinning out towards its sides and its
    // bottom (the drawing's cloud is cut straight by the edge of the card); shown in order from over his head outwards
    // as he lets go
    const HALF = 900;
    const fade = (v) => 1 - Math.min(1, Math.max(0, v));
    const thin = (x, y) => Math.random() < fade((Math.abs(x - 1080) / HALF + (Math.random() - 0.5) * 0.25 - 0.5) / 0.45) * fade((y - 1250) / 400);
    const jitter = () => (Math.random() - 0.5) * 80;
    const cloud = art.dots.cloud.flatMap(([x, y, r, c]) => [[widen(x), y], [2160 - widen(x) + jitter(), y + jitter()], [2160 - (1080 + (widen(x) - 1080) * 0.45) + jitter(), y + jitter()]]
        .filter(([cx, cy]) => thin(cx, cy))
        .map(([cx, cy]) => ({ x: cx, y: cy + CLOUD.dy, r, c: rgb(color(c)), hex: color(c), on: false, at: -9 })));
    const ORDER = cloud.map((d, i) => [i, Math.hypot(d.x - 1080, (d.y - 760) * 0.7) + Math.random() * 260]).sort((a, b) => a[1] - b[1]).map(([i]) => i);
    let shown = 0;                      // how many of ORDER are shown

    // ---- The game
    let lastT = 0;
    let lastTouch = -Infinity;
    let lastBack = 0;
    let pressAt = null;                 // when the finger (or the key) went down on him
    let breathing = false;              // the hold has become a breath (inhale played)
    let charge = 0;                     // 0..1 the breath gathered
    let flash = 0;                      // a flare of Sid when he lets go or comes back
    let emptyAt = null;                 // when nothing of his body was left (his dots rise a moment later)
    let wins = 0;
    let win = null;                     // he is the cloud; it gives him back with the rulito
    let invite = 3;                     // when the next motes leave his feet while he is still whole
    let glyph = { left: 0, top: 0, w: 1, h: 1 };
    const HOLD = 0.45;                  // s pressed before a press becomes a breath
    const BREATH = 1.8;                 // s more to gather it whole
    const IDLE = 15;                    // s alone before he takes back a part (a thread grows back)
    const HINT = 4;                     // s alone before one of the threads glows: that is one to cut
    const BACK = 4;                     // s between one part taken back and the next
    const LINGER = 1.4;                 // s his last dots stay before they rise
    const GIVE = 1.8, RISE = 2.2, KEEP = 2.8, EAT = 3.4;    // the win: given back after, rulito born, kept, gone

    // ---- What flies between Sid and the cloud: slots of a dynamic particle group, in art px
    const FLYERS = 420;
    const fly = Array.from({ length: FLYERS }, () => ({ on: false }));
    let flyNext = 0;
    const send = (from, to, { at = lastT, dur = 1.6, size = 5, c0 = WHITE, c1 = null, arc = 0.2 } = {}) => {
        const f = fly[flyNext];
        flyNext = (flyNext + 1) % FLYERS;
        const mx = (from[0] + to[0]) / 2, my = (from[1] + to[1]) / 2;
        const d = Math.hypot(to[0] - from[0], to[1] - from[1]);
        Object.assign(f, {
            on: true, at, dur, size, x0: from[0], y0: from[1], x1: to[0], y1: to[1],
            cx: mx + (Math.random() - 0.5) * d * 0.5, cy: my - d * arc * Math.random(),
            c0: rgb(c0), c1: rgb(c1 ?? c0),
        });
    };
    // A point on the edge that is eating him now (or, with none there, any of what is gone)
    const edgePoint = () => {
        const cut = cutOf(level);
        const near = body.filter((p) => p.h < cut && p.h > cut - 0.12);
        const pool = near.length ? near : body.filter((p) => p.h < cut);
        return pool.length ? pool[Math.floor(Math.random() * pool.length)] : body[Math.floor(Math.random() * body.length)];
    };

    // The cloud follows how much of him is gone: each dot shown is something that rose from his edge, each one hidden
    // goes back down to it
    const follow = (t) => {
        const want = win && !win.given ? cloud.length : Math.round(cloud.length * Math.min(1, level / 0.9));
        while (shown < want) {
            const d = cloud[ORDER[shown]];
            const p = edgePoint();
            const dur = 1.1 + Math.random() * 1.1;
            d.on = true;
            d.at = t + dur * 0.85;
            if (shown % 2 === 0 && !reduced) send([p.x, p.y], [d.x, d.y], { dur, size: 2 * d.r * k(), c0: p.c, c1: d.hex });
            shown++;
        }
        while (shown > want) {
            shown--;
            const d = cloud[ORDER[shown]];
            const p = edgePoint();
            d.on = false;
            d.at = t;
            if (shown % 2 === 0 && !reduced) send([d.x, d.y], [p.x, p.y], { dur: 1 + Math.random() * 0.8, size: 2 * d.r * k(), c0: d.hex, c1: p.c, arc: 0.1 });
        }
    };

    // Where a thread is now: from where it holds him to what it is tied to, sagging a little and swaying (art px)
    const ends = (th, t) => {
        const hold = Math.max(th.h, Math.min(0.92, cutOf(level) + 0.08));
        const sx0 = 1080 + th.side * (30 + 50 * (1 - Math.abs(hold - 0.45))), sy0 = FEET - hold * SID_H;
        const d = Math.hypot(th.a.x - sx0, th.a.y - sy0);
        const cx = (sx0 + th.a.x) / 2 + Math.sin(t * 0.7 + th.i) * 14, cy = (sy0 + th.a.y) / 2 + d * 0.16 + Math.sin(t * 0.9 + th.i * 2) * 10;
        return { x0: sx0, y0: sy0, cx, cy, x1: th.a.x, y1: th.a.y, d };
    };
    const along = (e, u) => {
        const a = 1 - u;
        return [a * a * e.x0 + 2 * a * u * e.cx + u * u * e.x1, a * a * e.y0 + 2 * a * u * e.cy + u * u * e.y1];
    };
    const SPACE = 30;                   // art px between the dots of a thread

    // Cutting a thread: it bursts into motes that rise into the cloud, and he lets go of a part of himself
    const cut = (th) => {
        if (!th || !th.on || win) return;
        th.on = false;
        th.cutAt = lastT;
        rate = Math.max(rate, 1);
        flash = 1;
        const e = ends(th, lastT);
        const n = Math.round(e.d / SPACE * th.grow);
        for (let j = 0; j < n; j++) {
            const [x, y] = along(e, j / n);
            const c = cloud[ORDER[Math.floor(Math.random() * Math.max(1, Math.min(cloud.length, shown + 200)))]];
            if (!reduced) send([x, y], [c.x, c.y], { dur: 1.2 + Math.random() * 1.2, size: 9 * k(), c0: GLOW, c1: c.hex, at: lastT + j * 0.012 });
        }
        play('release');
    };
    // A touch on him cuts a thread: the one that glows, or the nearest still tied (with none left, his dots rise at once)
    const forward = () => {
        if (!tied()) { if (emptyAt !== null) emptyAt = -Infinity; return; }
        rate = 1;
        cut(threads.find((th) => th.on && th.pulse > 0.05) ?? threads.find((th) => th.on));
    };
    // Left alone: a thread grows back, and he takes back a part
    const back = () => {
        const th = [...threads].sort((a, b) => b.cutAt - a.cutAt).find((x) => !x.on);
        if (!th) return;
        th.on = true;
        th.grow = 0;
        rate = 1;
        emptyAt = null;
        play('bloom');
    };

    // Nothing of him is left: his last dots rise and he is the cloud, which flares; then it gives him back
    const dissolve = (t) => {
        line.forEach((p) => {
            if (p.off) return;
            p.off = true;
            const c = cloud[ORDER[Math.floor(Math.random() * cloud.length)]];
            send([p.x, p.y], [c.x, c.y], { dur: 1 + Math.random() * 0.9, size: p.size * k() * 2, c1: c.hex, at: t + Math.random() * 0.3 });
        });
        wins += 1;
        win = { age: 0, head: 0, tail: 0, full: false, fullAt: 0, back: false, pop: 0, given: false, home: false, homeAt: 0 };
        rulito.value?.reshape();
        flash = 1;
        play('converge');
        sceneMilestone('renounced', { times: wins, breath: rate > 1 });
    };

    // ---- Pressing Sid: a tap lets go of a part; held, it becomes a breath, and let go once gathered, of everything
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
        if (gathered) {
            // Every thread at once, one quickly after the other
            play('exhale');
            rate = 2.4;
            flash = 1;
            threads.filter((th) => th.on).forEach((th, j) => setTimeout(() => { if (!gone) cut(th); }, j * 140));
        } else forward();
    };
    // A touch on what a thread is tied to cuts that thread
    const cutAt = (i) => {
        lastTouch = lastT;
        if (win) { play('tap'); return; }
        cut(threads[i]);
    };
    const onTieKey = (event, i) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        cutAt(i);
    };
    const onKeyDown = (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        if (!event.repeat) press();
    };
    const onKeyUp = (event) => {
        if (event.key === 'Enter' || event.key === ' ') letGo();
    };

    const L = {};

    const build = (s) => {
        const wind = s.depth(zFor(DEPTH.wind));
        L.wind = wind.image('/assets/nekkhamma/wind.webp', { blur: 1 });
        const far = s.depth(zFor(DEPTH.planet));
        L.planet = far.group();
        L.planetBody = L.planet.image('/assets/nekkhamma/planet.webp');
        L.ring = L.planet.image('/assets/nekkhamma/ring.webp');
        const cosmos = s.depth(zFor(DEPTH.cloud));
        L.cosmos = cosmos;
        L.cloudGlow = cosmos.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: GLOW, stops: [[0, 0.22], [0.4, 0.1], [0.72, 0]], bloom: true });
        const ground = s.depth(zFor(DEPTH.ground));
        L.groundNode = ground;
        L.ground = ground.image('/assets/nekkhamma/ground.webp');
        L.plants = ground.image('/assets/nekkhamma/plants.webp', { wind: WIND });
        L.plants.uniforms.uWind.value.w = 0;
        // The glowing buds, each on its own: a light behind it that breathes, and the bud on its stem, swaying with it
        L.buds = art.buds.map((_, i) => ({
            halo: ground.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: 0x2fd6e6, stops: [[0, 0.45], [0.3, 0.18], [0.7, 0]], bloom: true }),
            bud: ground.image(`/assets/nekkhamma/bud-${i + 1}.webp`, { bloom: true }),
            speed: 0.9 + Math.random() * 0.8, phase: Math.random() * 6.28,
        }));
        L.mark = ground.image('/assets/nekkhamma/mark.webp');
        const sid = s.depth(zFor(DEPTH.sid));
        L.sidNode = sid;
        // The breath gathered: a light behind him
        L.aura = sid.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: GLOW, stops: [[0, 0.5], [0.35, 0.2], [0.7, 0]], bloom: true });
        L.sid = sid.image('/assets/nekkhamma/sid.webp', { dissolve: GLOW, bloom: true });
        L.rulito = sid.canvas(rulito.value.canvas, { bloom: true });
        ground.enter({ y: 60, delay: 100, duration: 1600 });
        sid.enter({ y: 40, delay: 400, duration: 1700 });
        far.enter({ y: -30, delay: 300, duration: 2000 });
        wind.enter({ y: -20, delay: 200, duration: 2200 });
    };

    const place = (w, h) => {
        layout(w, h);
        const B = art.boxes;
        L.wind.place(rectOf(B.wind));
        L.planetBody.place(rectOf(B.planet));
        L.ring.place(rectOf(B.ring));
        const planet = rectOf(B.planet);
        L.planet.pivot = { x: planet.left + planet.w / 2, y: planet.top + planet.h / 2 };
        L.cloudGlow.place(rectOf([1080 - HALF * 1.4, 0, HALF * 2.8, 1700], 0, CLOUD.dy));
        // The ground reaches both sides of the screen and below the frame (it moves with the pointer)
        const g = rectOf(B.ground);
        const left = Math.min(0, F.x) - SLIDE * 2, right = Math.max(W, F.x + F.size) + SLIDE * 2;
        L.ground.place({ left, top: g.top, w: right - left, h: Math.max(g.h, H - g.top) + SLIDE });
        L.plants.place(rectOf(B.plants));
        L.buds.forEach(({ halo, bud }, i) => {
            const b = rectOf(art.buds[i]);
            bud.place(b);
            const d = b.w * 2.6;
            halo.place({ left: b.left + b.w / 2 - d / 2, top: b.top + b.h / 2 - d / 2, w: d, h: d });
        });
        L.mark.place(rectOf(B.mark));
        L.sid.place(rectOf(B.sid, DX), { x: sx(1080), y: sy(FEET) });
        // The rulito over him, where the card draws it (its canvas is bigger than the glyph, for the glow)
        const r = rectOf(RULITO, DX);
        const rw = r.w, rh = rw * 86 / 32;
        glyph = { left: r.left + r.w / 2 - rw / 2, top: r.top + r.h - rh, w: rw, h: rh };
        L.rulito.place({ left: glyph.left - 0.4375 * glyph.w, top: glyph.top - 0.1628 * glyph.h, w: glyph.w * 1.875, h: glyph.h * 1.3256 },
            { x: glyph.left + glyph.w / 2, y: glyph.top + glyph.h });
    };

    // The box round Sid, for the finger
    const placeHit = () => {
        const el = hit.value;
        if (!el || !L.sidNode) return;
        const b = L.sidNode.boxOnScreen(rectOf(art.boxes.sid, DX));
        el.style.translate = `${b.left.toFixed(1)}px ${b.top.toFixed(1)}px`;
        el.style.width = `${Math.max(44, b.width).toFixed(1)}px`;
        el.style.height = `${b.height.toFixed(1)}px`;
        el.style.display = win ? 'none' : '';
    };

    // A circle round what each thread is tied to, for the finger (at least 44px), while its thread is there
    const placeTies = () => {
        ties.value.forEach((el, i) => {
            if (!el || !L.groundNode) return;
            const a = ANCHORS[i];
            const p = L.groundNode.toScreen(sx(a.x), sy(a.y));
            const d = Math.max(44, 150 * k());
            el.style.translate = `${(p.x - d / 2).toFixed(1)}px ${(p.y - d / 2).toFixed(1)}px`;
            el.style.width = el.style.height = `${d.toFixed(1)}px`;
            el.style.display = threads[i].on && threads[i].grow > 0.5 && !win ? '' : 'none';
        });
    };

    const enter = () => {
        if (entered || !props.active || !stage) return;
        entered = true;
        stage.ready().then(() => { if (!gone) { stage.start(); dust?.reveal(); } });
    };

    // ---- Particles
    // A little spiral galaxy, as Dana's, in the colours of the cloud, high in it; it comes as the cloud fills
    const galaxy = createGalaxy({
        at: () => (L.sid ? { x: sx(1300), y: sy(560 + CLOUD.dy), R: 270 * k() } : null),
        stars: [0xe0f0f0, 0x9fe8f0, 0x10c0d0, 0xf06070, 0xe0f0f0, 0x2fd6e6, 0xd9efed],
        arms: [0x10c0d0, 0xf06070],
        core: [0x9fe8f0, 0xe0f0f0],
        turn: 0.06,
    });
    const fromArt = (list, scale = 1) => list.map(([x, y, r, c]) => [sx(x), sy(y), Math.max(1.2, 2 * r * k() * scale), color(c)]);
    const ease = (p) => p * p * (3 - 2 * p);
    const cloudGroup = {
        count: cloud.length,
        update(t, data) {
            cloud.forEach((d, i) => {
                data.positions[i * 3] = sx(d.x);
                data.positions[i * 3 + 1] = sy(d.y);
                data.sizes[i] = Math.max(1.2, 2 * d.r * k());
                const p = Math.min(1, Math.max(0, (t - d.at) / (d.on ? 0.5 : 0.35)));
                data.alphas[i] = d.on ? p : 1 - p;
                data.tints.set(d.c, i * 3);
            });
        },
    };
    const lineGroup = {
        count: line.length,
        update(t, data) {
            const cut = cutOf(level);
            line.forEach((d, i) => {
                data.positions[i * 3] = sx(d.x);
                data.positions[i * 3 + 1] = sy(d.y) + L.sid.y;
                data.sizes[i] = d.size * k() * 2;
                // A dot of his line shows once the edge has passed it, until it rises or he takes that part back
                const there = d.h < cut && !d.off;
                if (there && !d.at) d.at = t;
                if (!there) d.at = 0;
                data.alphas[i] = there ? Math.min(1, (t - d.at) / 0.6) : 0;
                data.tints.set(rgb(WHITE), i * 3);
            });
        },
    };
    // The threads: dots along each one, flowing slowly towards him (he pulls at what he holds), the one to cut glowing
    const PER = 44;
    const THREAD = rgb(0xd2f4f6);
    const threadGroup = {
        count: PER * ANCHORS.length,
        update(t, data) {
            const flow = (t * 0.35) % 1;
            threads.forEach((th, i) => {
                const e = th.on ? ends(th, t) : null;
                const n = e ? Math.min(PER, Math.round(e.d / SPACE)) : 0;
                for (let j = 0; j < PER; j++) {
                    const at = i * PER + j;
                    const u = (j + 1 - flow) / Math.max(1, n);
                    if (!e || j >= n || u > th.grow) { data.alphas[at] = 0; data.sizes[at] = 0; continue; }
                    const [x, y] = along(e, u);
                    const wave = th.pulse * (0.5 + 0.5 * Math.sin(u * 14 - t * 7));
                    data.positions[at * 3] = sx(x);
                    data.positions[at * 3 + 1] = sy(y);
                    data.sizes[at] = Math.max(2.4, (8 + 7 * wave) * k() * 2);
                    data.alphas[at] = Math.min(1, (th.grow - u) * 8) * (0.7 + 0.3 * wave) * Math.min(1, u * 10);
                    data.tints.set(THREAD, at * 3);
                }
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
                const e = ease(p);
                const a = 1 - e;
                data.positions[i * 3] = sx(a * a * f.x0 + 2 * a * e * f.cx + e * e * f.x1);
                data.positions[i * 3 + 1] = sy(a * a * f.y0 + 2 * a * e * f.cy + e * e * f.y1);
                data.sizes[i] = Math.max(1.2, f.size);
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
        if (pressAt !== null && !win) {
            const held = t - pressAt;
            if (held > HOLD && !breathing) { breathing = true; play('inhale'); }
            charge = Math.min(1, Math.max(0, (held - HOLD) / BREATH));
            if (breathing && Math.random() < dt * 16 * charge) {
                const left = body.filter((q) => q.h > cutOf(level));
                const p = left[Math.floor(Math.random() * left.length)];
                if (p) send([p.x, p.y], [p.x + (Math.random() - 0.5) * 160, p.y - 120 - Math.random() * 220], { dur: 1.3, size: 6 * k(), c1: CYAN, arc: 0 });
            }
        } else charge = Math.max(0, charge - dt * 2.5);

        // How far he is undone eases towards how many threads are cut (and, once the cloud gives him back, back to whole)
        const goal = win ? (win.given ? 0 : 1) : 1 - tied() / ANCHORS.length;
        const d = goal - level;
        level += Math.sign(d) * Math.min(Math.abs(d), dt * rate * (0.1 + Math.abs(d) * 0.55));
        L.sid.uniforms.uDissolve.value.y = level;

        // Nothing of his body left: a moment later (or at once, with one more touch) his dots rise, and he is the cloud
        if (!win && !tied() && level > 0.999) {
            if (emptyAt === null) emptyAt = t;
            if (t - emptyAt > LINGER) dissolve(t);
        }

        // Left alone a while, a thread grows back and he takes back a part, then another
        if (!win && pressAt === null && tied() < ANCHORS.length && t - lastTouch > IDLE && t - lastBack > BACK) { lastBack = t; back(); }

        // The threads grow out of him (at the start, and when one grows back); left alone, one of them glows now and
        // then: that is one to cut
        const hinting = !win && t - lastTouch > HINT && ramp > 0.9;
        const hinted = hinting ? threads.find((th) => th.on && th.grow >= 1) : null;
        threads.forEach((th) => {
            if (th.on && ramp > 0.4) th.grow = Math.min(1, th.grow + dt / 1.6);
            const want = th === hinted ? 0.5 + 0.5 * Math.sin((t - lastTouch) * 3.2 - Math.PI / 2) : 0;
            th.pulse += (want - th.pulse) * Math.min(1, dt * 6);
        });

        // While he is whole and nobody has touched him, a few motes leave his feet now and then: he could let go
        if (!win && tied() === ANCHORS.length && level < 0.01 && t - lastTouch > 6 && t > invite && ramp > 0.9 && !reduced) {
            invite = t + 4 + Math.random() * 3;
            const feet = body.filter((p) => p.h < 0.12);
            for (let i = 0; i < 5; i++) {
                const p = feet[Math.floor(Math.random() * feet.length)];
                send([p.x, p.y], [p.x + (Math.random() - 0.5) * 120, p.y - 140 - Math.random() * 160], { dur: 2.2 + Math.random(), size: 6 * k(), c1: [CYAN, 0xf06070, WHITE][i % 3], arc: 0, at: t + i * 0.18 });
            }
        }

        // The win: he is the cloud, it flares; it comes down and gives him back; the rulito is born, kept and goes
        let named = 0;
        if (win && rulito.value) {
            win.age += dt;
            if (!win.given && win.age > GIVE) { win.given = true; rate = 1.6; }
            if (win.given && !win.home && level < 0.02) {
                win.home = true;
                win.homeAt = win.age;
                rate = 1;
                flash = 1;
                line.forEach((p) => { p.off = false; });
                play('bloom');
            }
            win.pop = Math.max(0, win.pop - dt * 2.2);
            win.head = win.home ? 1 - (1 - Math.min(1, (win.age - win.homeAt) / RISE)) ** 1.6 : 0;
            if (win.head >= 1 && !win.full) { win.full = true; win.fullAt = win.age; win.pop = 1; play('rulito'); }
            if (win.full && !win.back && win.age - win.fullAt > KEEP) win.back = true;
            if (win.back) win.tail = Math.min(1, win.tail + dt / EAT);
            const whole = Math.min(1, Math.max(0, (win.head - win.tail - 0.6) / 0.4));
            named = Math.max(win.pop, 0.8 * whole * whole * (3 - 2 * whole));
            const flare = win.full && win.head - win.tail > 0.9 ? Math.max(win.pop, Math.sin(t * 4) * 0.5 + 0.5) : 0;
            rulito.value.frame({ head: win.head, tail: win.tail, flare, t, fade: Math.min(1, (win.head - win.tail) * 14), width: glyph.w });
            L.rulito.refresh();
            L.rulito.scale = 1 + 0.2 * win.pop * win.pop;
            if (win.back && win.tail >= 1) {
                // His threads grow back slowly: he lives among his things again, lighter
                threads.forEach((th) => { th.on = true; th.grow = -Math.random() * 1.5; });
                win = null;
                emptyAt = null;
                lastTouch = t;
                rulito.value.frame({ width: glyph.w });
                L.rulito.refresh();
            }
        }
        follow(t);
        const full = shown / cloud.length;
        // The cloud flares while he is it
        const cosmic = win && !win.given ? Math.sin(Math.PI * Math.min(1, win.age / GIVE)) : 0;
        stageEl?.style.setProperty('--name-glow', named.toFixed(3));
        stage.bloom = Math.max(named, 0.5 * cosmic, 0.3 * charge);
        if (cosmic > 0) dust?.boost(2, cosmic * 0.6);

        // Sid breathes a little and shines while the breath gathers, when he lets go and when he comes back
        flash = Math.max(0, flash - dt * 1.4);
        L.sid.y = Math.sin(t * 1.1) * 2 * ramp;
        L.sid.uniforms.uBright.value = 1 + 0.35 * charge + 0.3 * flash;
        L.rulito.y = L.sid.y;
        const ad = SID_H * k() * (1.1 + 0.3 * charge);
        L.aura.place({ left: sx(1080) - ad / 2, top: sy(SID_TOP + SID_H / 2) - ad / 2, w: ad, h: ad });
        L.aura.opacity = Math.min(1, 0.9 * charge + 0.5 * flash) * (1 - level);

        // The sky: the wind drifts, the planet floats; the cloud's glow and its galaxy come with the cloud
        L.wind.x = Math.sin(t * 0.07) * 40 * ramp;
        L.planet.y = Math.sin(t * 0.4) * 8 * ramp;
        L.planet.rotate = Math.sin(t * 0.25) * 4 * ramp;
        const galaxies = Math.min(1, Math.max(0, (full - 0.45) / 0.4));
        dust?.fade(7, galaxies);
        dust?.fade(8, galaxies);
        L.cloudGlow.opacity = full * (0.55 + 0.2 * Math.sin(t * 0.5)) + 0.6 * cosmic;
        // Each bud breathes at its own pace and sways on its stem with the plants (the same wave as the shader's wind)
        const plants = rectOf(art.boxes.plants);
        L.buds.forEach(({ halo, bud, speed, phase }, i) => {
            const b = rectOf(art.buds[i]);
            const along = (b.left + b.w / 2 - plants.left) * 0.012;
            const lift = (plants.top + plants.h - b.top - b.h / 2) / plants.h;
            const sway = (Math.sin(t * WIND.speed + along) * 0.7 + Math.sin(t * WIND.speed * 2.3 + along * 1.9) * 0.3) * WIND.amp * lift * lift;
            const breath = Math.sin(t * speed + phase);
            const tiedHere = threads.some((th) => th.a.bud === i && th.on) ? 1 : 0;
            bud.x = sway;
            halo.x = sway;
            bud.scale = 1 + 0.07 * breath;
            bud.uniforms.uBright.value = 1 + 0.2 * breath + 0.5 * named;
            halo.scale = 1 + 0.18 * breath;
            halo.opacity = 0.45 + 0.3 * breath + 0.3 * named + 0.2 * tiedHere * (threads.find((th) => th.a.bud === i)?.pulse ?? 0);
        });
        L.cosmos.y = Math.sin(t * 0.3) * 6 * ramp - scroll * 10;
        L.sidNode.y = scroll * 26;
        L.groundNode.y = scroll * 26;

        const near = stage.drift(L.sidNode.z), mid = stage.drift(L.cosmos.z), far = stage.drift(zFor(4));
        dust?.shift(1, far.x, far.y);
        dust?.shift(2, mid.x, mid.y + L.cosmos.y);
        dust?.shift(3, near.x, near.y + L.groundNode.y);
        dust?.shift(4, near.x, near.y + L.sidNode.y);
        dust?.shift(5, (near.x + mid.x) / 2, (near.y + mid.y) / 2 + L.sidNode.y);
        dust?.shift(6, near.x, near.y + L.sidNode.y);
        dust?.shift(7, mid.x, mid.y + L.cosmos.y);
        dust?.shift(8, mid.x, mid.y + L.cosmos.y);
        stage.render(t);
        if (frames++ % 2 === 0) { placeHit(); placeTies(); }
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
                // 2: the cloud of the colours of everything, as he lets go; a finger stirs it
                { dynamic: cloudGroup, parallax: 0, drift: 3.5, jitter: 0.25, twinkle: 0.3, reach: 90, push: 22, bloom: true, order: after(L.cloudGlow) + 0.2 },
                // 3: the pink specks over the mushrooms
                { parallax: 0, drift: 2, twinkle: 0.85, reach: 0, order: after(L.mark), points: () => fromArt(art.dots.specks, 1.4) },
                // 4: the dots of his line, where he was
                { dynamic: lineGroup, parallax: 0, drift: 2, jitter: 0.3, twinkle: 0.15, reach: 0, bloom: true, order: after(L.sid) },
                // 5: what rises from him to the cloud
                { dynamic: flyers, look: 'soft', parallax: 0, drift: 2, twinkle: 0.2, reach: 0, bloom: true, order: after(L.rulito) },
                // 6: the threads that tie him to his things, in front of the ground and behind him
                { dynamic: threadGroup, parallax: 0, drift: 1, twinkle: 0.15, reach: 0, bloom: true, order: after(L.mark) },
                // 7, 8: a little spiral galaxy in the cloud (as Dana's), its glow and its stars
                { colors: [0xffffff], dynamic: galaxy.glow, parallax: 0, drift: 0, twinkle: 0, reach: 0, look: 'soft', bloom: true, order: after(L.cloudGlow) },
                { colors: [0xffffff], dynamic: galaxy.stars, parallax: 0, drift: 0, twinkle: 0, reach: 0, bloom: true, order: after(L.cloudGlow) + 0.1 },
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
        <!-- Sid: a touch lets go of a part of him, held and let go it lets go of everything -->
        <div ref="hit" class="sid" role="button" tabindex="0"
            :aria-label="$i18n.locale === 'en' ? 'Sid: touch him to let go, hold him to let go of everything' : 'Sid: tocalo para soltar, mantenelo para soltarlo todo'"
            @pointerdown.prevent="press" @keydown="onKeyDown" @keyup="onKeyUp" @blur="letGo"
            @contextmenu.prevent @dragstart.prevent @selectstart.prevent></div>
        <!-- What he is tied to: a touch cuts its thread -->
        <div v-for="(a, i) in ANCHORS" :key="i" :ref="(el) => { ties[i] = el; }" class="tie" role="button" tabindex="0"
            :aria-label="$i18n.locale === 'en' ? 'A thread that ties him: touch to cut it' : 'Un hilo que lo ata: tocalo para cortarlo'"
            @pointerdown.prevent="cutAt(i)" @keydown="onTieKey($event, i)"></div>
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

    /* Taps only, so the page still scrolls from them */
    .tie {
        position: absolute;
        left: 0;
        top: 0;
        width: 0;
        height: 0;
        border-radius: 50%;
        cursor: pointer;
        pointer-events: auto;
        -webkit-tap-highlight-color: transparent;
        touch-action: manipulation;
        outline: none;
    }

    .sid:focus-visible,
    .tie:focus-visible {
        outline: 2px solid rgba(159, 232, 240, 0.9);
        outline-offset: 4px;
    }
</style>
