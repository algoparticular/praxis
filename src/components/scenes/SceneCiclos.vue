<script setup>
    // Ciclos: "I appreciate who I was, I honour who I am, and I project who I want to be". A teal starry night pours
    // over the yellow day like a liquid that never mixes with it, and the round body in the sky is both: the white moon
    // where the night is over it and a red sun, its corona stippled, where the day is (as in the card, the disc split by
    // the edge between them). White clouds drift, and over rolling hills of green and sand, with white rocks, pink fans
    // and tufts of grass, Sid sits meditating on a rock with his red aura round him.
    // Its verb will be Soltar (closing a cycle: letting go of the old so the new can begin); there is no game yet. Sid,
    // the moon and the sun are apart (each its own picture or drawn in code), so the game can move them. For now a touch
    // is only answered: on Sid his aura flares and the chord is strummed (`star`); on the moon it rocks a little and the
    // corona flares.
    // The sky is not a picture: day and night are two liquids drawn by the stage (field()), from the night's shape, drops
    // and colour that the converter read from the card (it is in no layer); its stars are particles that live only in
    // the night. Nor is the sun: a disc drawn in code (the biggest circle inside its solid middle, under the moon) with a
    // warm light round it and its stippled corona as live particles; the moon's stippled shade and Sid's aura are
    // particles too. Moon and sun follow the edge as it flows: the moon's picture and its shade are masked by the night
    // side of the same field the sky is drawn with, the corona and the sun's lights by its day side (maskBy(), a
    // group's `mask`), so where the day flows across the moon it gives way to the sun, and back.
    // It is drawn in WebGL (useLayerStage): the sky, the clouds (one atlas, at three depths), the sun, the moon, the
    // hills in four planes (made by the converter from the regions between the drawing's lines, each plane filled in
    // where the one in front hides it, so nothing opens up as they slide apart) and Sid; every fan and tuft is its own
    // plane, swaying in the wind (shader). Beyond the frame the land goes on, each plane mirrored on both sides. The moon
    // slowly rides back and forth over the sun and rocks, the corona trembles, Sid breathes and his aura with him. From
    // ciclosScene.json and public/assets/ciclos (made by scripts/convert-ciclos.mjs). The touch targets are DOM elements
    // over Sid and the moon.
    import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { createParallax } from '../../composables/useParallax.js';
    import { createLayerStage, FIELD_RANGE, FIELD_BUBBLES } from '../../composables/useLayerStage.js';
    import { startStardust } from '../../composables/useStardust.js';
    import { play } from '../../composables/useSound.js';
    import art from '../../composables/ciclosScene.json';

    const props = defineProps({
        card: { type: Object, default: () => ({}) },
        active: Boolean
    });

    const root = ref(null);
    const canvas = ref(null);
    const sidHit = ref(null);
    const moonHit = ref(null);
    let stageEl = null;
    let stage = null;
    let parallax = null;
    let dust = null;
    let entered = false;
    let gone = false;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ---- Layout: the illustration is a 2160 square resting on the bottom of the screen. On a phone upright it is as big
    // as the moon and Sid allow across, centred between them; on a wide screen the land goes on past the frame
    const SIZE = art.size;
    const B = art.boxes;
    let F = { x: 0, y: 0, size: 1 };
    const k = () => F.size / SIZE;
    const sx = (x) => F.x + x * k();
    const sy = (y) => F.y + y * k();
    const rectOf = ([left, top, w, h]) => ({ left: sx(left), top: sy(top), w: w * k(), h: h * k() });
    const SPAN = 1450, FOCUS = 1170;        // art px across that must be seen on a phone (the moon to Sid), and their middle
    const DROP = 0.1;                       // how much of the frame goes under the bottom of a wide screen
    const layout = (w, h) => {
        const phone = w < h;
        const size = phone ? Math.min(0.78 * h, w * SIZE / SPAN) : Math.min(Math.max(0.62 * w, 0.55 * h), 0.9 * h);
        let x = w / 2 - size / 2;
        if (phone && size > w) x = Math.min(0, Math.max(w - size, w / 2 - FOCUS * size / SIZE));
        // A little of the bottom always goes under the edge, so the nearest hills never show their end when they move
        F = { x, y: h - size + (phone ? 0.03 : DROP) * size, size };
    };

    const SLIDE = 50;
    const SLIDE_Y = 30;
    const zFor = (amp) => amp / (SLIDE + amp);
    const DEPTH = { sky: 2, clouds: [3, 4, 5], sun: 6, moon: 8, land: [12, 17, 23, 31] };

    const SUN = art.sun;
    const MOON = art.moon;
    const AURA = 0xfc747c;
    const SHADE = 0x342c0c;
    const RIDE = 12;                        // art px the moon rides to each side over the sun (it never shows its disc)

    // ---- The clouds: cut out of the illustration (one atlas), drifting slowly and wrapping round the sky
    const [CW, CH] = art.cloudAtlas;
    const CLOUD_Y = [Math.min(...art.clouds.map(([, y, , h]) => y + h / 2)), 1100];
    const clouds = art.clouds.map(([x, y, w, h, ax, ay], i) => ({
        i, art: { x: x + w / 2, y: Math.min(CLOUD_Y[1], y + h / 2), w, h }, crop: [ax / CW, ay / CH, w / CW, h / CH],
        rest: { left: 0, top: 0, w: 1, h: 1 }, x0: 0, phase: Math.random() * 6.28, speed: 4 + (i % 3) * 2.5, depth: i % 3,
    }));
    let span = { left: 0, width: 1 };

    // ---- The plants: every fan and tuft its own plane, on the plane of land it grows on (mirrored with it beyond)
    const [PW, PH] = art.plantAtlas;
    const plants = art.plants.map(([x, y, w, h, ax, ay, kind, plane]) => ({ box: [x, y, w, h], crop: [ax / PW, ay / PH, w / PW, h / PH], kind, plane }));

    // ---- A touch is answered, nothing more (the game comes with the verb)
    let glowSid = 0;                        // Sid's aura flaring, 0..1
    let rock = 0, rockV = 0;                // the moon rocking (deg) and its speed
    let flare = 0;                          // the corona flaring
    let lastT = 0;
    const L = {};

    // ---- Day and night, two liquids that never mix: the teal night over the yellow day is in no layer (the converter
    // read it from the card). The stage draws the colours (field() in useLayerStage) and the scene writes, small and when
    // the screen changes size, how far each px is from the edge between them: the night's mask is looked up for every px
    // of the field and turned into distances (an exact distance transform, each way). Beyond the frame the frame's edge
    // goes on straight out: the day on the left, the night on the right (it fills the card's right edge), and over the
    // top only the night of the top right corner, so the card's name stays on the day. Its drops are bubbles that sway and tremble; the stars only live in it
    const NIGHT = art.night;
    const DAY = art.sky[0][1];
    const skyField = document.createElement('canvas');
    const MARGIN = 120;                     // px drawn past each edge of the screen, for the camera's slide
    const FIELD = 0.5;                      // the field's px per screen px: it is smooth, small is enough
    const NIGHT_ROWS = NIGHT.rows.length * 2;
    // Over the card the night takes the day little by little, with a wave: the edge of its top row moves left as it goes up
    // (UP_SLOPE art px across for each px up, and a wave), so the yellow narrows and is gone instead of going on straight up
    // (faster the higher, as a curve), and a wave along it. Only on a wide screen (wideScreen, set by place()): on a phone the
    // little sky over the card stays as it was
    const UP_SLOPE = 1.1, UP_WAVE = [150, 95];
    let wideScreen = false;
    const nightAt = (xa, ya) => {
        if (ya < 0 && wideScreen) {
            const up = -ya;
            xa += up * UP_SLOPE * (1 + up / 700) + UP_WAVE[0] * Math.sin(up / UP_WAVE[1] + 0.6) * Math.min(1, up / 90);
            ya = 0;
        }
        xa = Math.min(SIZE - 1, Math.max(0, xa));
        const runs = NIGHT.rows[Math.max(0, Math.min(NIGHT.rows.length - 1, Math.floor(Math.min(ya, NIGHT_ROWS - 1) / 2)))];
        const hx = xa / 2;
        let on = false;
        for (let r = 0; r < runs.length; r++) { if (runs[r] > hx) break; on = !on; }
        return on;
    };
    // Squared distances to the nearest 0 of f, in place (Felzenszwalb and Huttenlocher), along a line of n
    const INF = 1e12;
    const line = (f, n, d, v, z) => {
        let k0 = 0;
        v[0] = 0; z[0] = -INF; z[1] = INF;
        for (let q = 1; q < n; q++) {
            let s0 = ((f[q] + q * q) - (f[v[k0]] + v[k0] * v[k0])) / (2 * q - 2 * v[k0]);
            while (s0 <= z[k0]) { k0--; s0 = ((f[q] + q * q) - (f[v[k0]] + v[k0] * v[k0])) / (2 * q - 2 * v[k0]); }
            k0++; v[k0] = q; z[k0] = s0; z[k0 + 1] = INF;
        }
        k0 = 0;
        for (let q = 0; q < n; q++) { while (z[k0 + 1] < q) k0++; d[q] = (q - v[k0]) ** 2 + f[v[k0]]; }
    };
    const distances = (grid, w, h) => {
        const n = Math.max(w, h);
        const f = new Float64Array(n), d = new Float64Array(n), v = new Int32Array(n), z = new Float64Array(n + 1);
        for (let x = 0; x < w; x++) {
            for (let y = 0; y < h; y++) f[y] = grid[y * w + x];
            line(f, h, d, v, z);
            for (let y = 0; y < h; y++) grid[y * w + x] = d[y];
        }
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) f[x] = grid[y * w + x];
            line(f, w, d, v, z);
            for (let x = 0; x < w; x++) grid[y * w + x] = d[x];
        }
    };
    const writeField = (area) => {
        const width = Math.ceil(area.w * FIELD), height = Math.ceil(area.h * FIELD);
        const inNight = new Uint8Array(width * height);
        const toNight = new Float64Array(width * height), toDay = new Float64Array(width * height);
        for (let fy = 0; fy < height; fy++) {
            const ya = (area.top + (fy + 0.5) / FIELD - F.y) / k();
            for (let fx = 0; fx < width; fx++) {
                const xa = (area.left + (fx + 0.5) / FIELD - F.x) / k();
                const i = fy * width + fx;
                inNight[i] = nightAt(xa, ya) ? 1 : 0;
                toNight[i] = inNight[i] ? 0 : INF;
                toDay[i] = inNight[i] ? INF : 0;
            }
        }
        distances(toNight, width, height);
        distances(toDay, width, height);
        skyField.width = width;
        skyField.height = height;
        const ctx = skyField.getContext('2d');
        const image = ctx.createImageData(width, height);
        const norm = 1 / FIELD / (2 * FIELD_RANGE);
        for (let i = 0; i < width * height; i++) {
            // (half a px each way, so the edge falls between the two)
            const d = inNight[i] ? Math.sqrt(toDay[i]) - 0.5 : 0.5 - Math.sqrt(toNight[i]);
            image.data[i * 4] = Math.round(Math.min(1, Math.max(0, 0.5 + d * norm)) * 255);
            image.data[i * 4 + 1] = 255;
            image.data[i * 4 + 3] = 255;
        }
        ctx.putImageData(image, 0, 0);
    };
    // The drops of the card, alive: each sways and trembles where the card has it, as a liquid
    const drops = NIGHT.bubbles.slice(0, FIELD_BUBBLES).map(([x, y, rx, ry, angle, toward], j) => ({ x, y, rx, ry, angle, toward, phase: j * 1.9 + Math.random() }));
    const moveDrops = (t, ramp) => drops.map((d, j) => {
        const jelly = 0.08 * Math.sin(t * (2.1 + 0.3 * j) + d.phase) * ramp;
        const x = d.x + Math.sin(t * 0.35 + d.phase) * 10 * ramp, y = d.y + Math.sin(t * 0.27 + d.phase * 1.7) * 8 * ramp;
        return [sx(x), sy(y), d.rx * (1 + jelly) * k(), d.ry * (1 - jelly) * k(), d.angle + 0.12 * Math.sin(t * 0.4 + d.phase) * ramp, d.toward, 0.3, 1];
    });
    const WAVE = { amp: 10, length: 900, speed: 0.25 };

    const touchSid = () => {
        play('star');
        glowSid = 1;
        dust?.boost(2, 1);
    };
    const touchMoon = () => {
        play('star');
        rockV += 26;
        flare = 1;
        dust?.boost(0, 1);
        dust?.boost(1, 0.6);
    };
    const onKey = (fn) => (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        fn();
    };

    const build = (s) => {
        // Day and night, behind everything
        const sky = s.depth(zFor(DEPTH.sky));
        L.skyNode = sky;
        L.sky = sky.field({ source: skyField, colors: [DAY, NIGHT.color], flow: 0.7 });
        // The clouds, at three depths
        L.clouds = [];
        DEPTH.clouds.forEach((depth, d) => {
            const node = s.depth(zFor(depth));
            clouds.filter((c) => c.depth === d).forEach((c) => { L.clouds[c.i] = node.image('/assets/ciclos/clouds.webp', { crop: c.crop }); });
            node.enter({ y: -20, delay: 200 + 150 * d, duration: 2000 });
        });
        // The sun: a warm light over the sky round it, its disc (code) and, among the layers, its corona as particles
        const sun = s.depth(zFor(DEPTH.sun));
        L.sunNode = sun;
        L.warm = sun.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: 0xffa070, stops: [[0, 0.28], [0.3, 0.1], [0.7, 0]] });
        L.sunGlow = sun.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: SUN.color, stops: [[0, 0.7], [0.36, 0.3], [0.62, 0]], bloom: true });
        L.sun = sun.disc({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: SUN.color });
        // Its lights only over the day (over the night the moon is what is seen; the disc is under it, and bigger)
        L.warm.maskBy(L.sky, -1);
        L.sunGlow.maskBy(L.sky, -1);
        sun.enter({ y: 50, delay: 100, duration: 2400 });
        // The moon in front of it (its shade, particles, follows it)
        const moon = s.depth(zFor(DEPTH.moon));
        L.moonNode = moon;
        // The moon only over the night: where the day flows across it, the sun is seen instead, as in the card
        L.moon = moon.image('/assets/ciclos/moon.webp').maskBy(L.sky, 1);
        moon.enter({ y: 60, delay: 250, duration: 2400 });
        // The land, far to near; each plane with its plants, mirrored beyond the frame when it reaches its sides; Sid on
        // the second, on his rock
        L.planes = art.planes.map((P, p) => {
            const node = s.depth(zFor(DEPTH.land[p]));
            const sides = P.sides ? [-1, 0, 1] : [0];
            const land = sides.map((side) => {
                const img = node.image(`/assets/ciclos/${P.name}.webp`);
                if (side) img.sx = -1;
                return { img, side };
            });
            const grown = [];
            plants.forEach((pl) => {
                if (pl.plane !== p) return;
                sides.forEach((side) => {
                    const wind = pl.kind === 'fan' ? { amp: 2.5, speed: 0.7, root: 'bottom' } : { amp: 4, speed: 1.1, root: 'bottom' };
                    const img = node.image('/assets/ciclos/plants.webp', { crop: pl.crop, wind });
                    if (side) img.sx = -1;
                    grown.push({ img, side, pl });
                });
            });
            node.enter({ y: 30 + 15 * p, delay: 80 * p, duration: 1700 });
            const out = { node, land, grown };
            if (p === 1) {
                // Sid, a group of his own at the same depth: his aura's light behind him, the dots of the aura, him
                const sid = s.depth(zFor(DEPTH.land[1]));
                L.sidNode = sid;
                L.sid = sid.group();
                L.aura = L.sid.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: AURA, stops: [[0, 0.5], [0.4, 0.2], [0.75, 0]], bloom: true });
                L.body = L.sid.image('/assets/ciclos/sid.webp');
                sid.enter({ y: 50, delay: 400, duration: 1900 });
            }
            return out;
        });
    };

    // The sky, from the converter's stops, placed with the frame (flat: the card's yellow)
    const paintSky = (h) => {
        const stops = art.sky.map(([y, c]) => `#${c.toString(16).padStart(6, '0')} ${Math.max(-50, Math.min(150, sy(y) / h * 100)).toFixed(1)}%`);
        root.value.style.background = stops.length > 1 ? `linear-gradient(to bottom, ${stops.join(', ')})` : stops[0];
    };

    // Where the card's name ends (the stage's h1, over the scene), so the clouds keep under it
    const titleBottom = (h) => {
        const title = stageEl?.querySelector('h1');
        if (!title || !root.value) return 0.16 * h;
        return title.getBoundingClientRect().bottom - root.value.getBoundingClientRect().top;
    };

    const place = (w, h) => {
        layout(w, h);
        paintSky(h);
        const area = { left: -MARGIN, top: -MARGIN, w: w + 2 * MARGIN, h: h + 2 * MARGIN };
        wideScreen = w >= h;
        writeField(area);
        L.sky.place(area);
        L.sky.refresh();
        L.sky.uniforms.uScale.value = k();

        // The clouds, spread over the sky between the card's name and the hills, over the whole width
        const wide = Math.max(w, F.size);
        const below = titleBottom(h) + 12;
        let widest = 0;
        clouds.forEach((c) => {
            const cw = c.art.w * k(), ch = c.art.h * k();
            const x = w / 2 + (c.art.x - SIZE / 2) / SIZE * wide;
            const top = below + ch / 2, bottom = Math.max(top, sy(CLOUD_Y[1]));
            const y = top + (c.art.y - CLOUD_Y[0]) / (CLOUD_Y[1] - CLOUD_Y[0]) * (bottom - top);
            c.x0 = x;
            c.rest = { left: x - cw / 2, top: y - ch / 2, w: cw, h: ch };
            widest = Math.max(widest, cw);
            L.clouds[c.i].place(c.rest);
        });
        span = { left: -SLIDE * 2 - widest / 2, width: w + SLIDE * 4 + widest };

        const sr = SUN.r * k();
        L.sun.place({ left: sx(SUN.x) - sr, top: sy(SUN.y) - sr, w: 2 * sr, h: 2 * sr });
        const sg = sr * 3.6, wg = sr * 6;
        L.sunGlow.place({ left: sx(SUN.x) - sg / 2, top: sy(SUN.y) - sg / 2, w: sg, h: sg });
        L.warm.place({ left: sx(SUN.x) - wg / 2, top: sy(SUN.y) - wg / 2, w: wg, h: wg });
        L.moon.place(rectOf(B.moon), { x: sx(MOON.x), y: sy(MOON.y) });

        // Each plane, and its mirror on each side (about the frame's edges)
        art.planes.forEach((P, p) => {
            const [x, y, bw, bh] = P.box;
            const at = (side, bx, bw2) => (side === 0 ? bx : side < 0 ? -(bx + bw2) : 2 * SIZE - (bx + bw2));
            L.planes[p].land.forEach(({ img, side }) => img.place(rectOf([at(side, x, bw), y, bw, bh])));
            L.planes[p].grown.forEach(({ img, side, pl }) => {
                const [px, py, pw, ph] = pl.box;
                const r = rectOf([at(side, px, pw), py, pw, ph]);
                img.place(r, { x: r.left + r.w / 2, y: r.top + r.h });
            });
        });

        const body = rectOf(B.sid);
        L.body.place(body, { x: body.left + body.w / 2, y: body.top + body.h });
        L.sid.pivot = { x: body.left + body.w / 2, y: body.top + body.h };
        const ad = body.h * 1.7;
        L.aura.place({ left: body.left + body.w / 2 - ad / 2, top: body.top + body.h * 0.45 - ad / 2, w: ad, h: ad });
    };

    // The touch targets: Sid (at least 64px) and the moon
    const put = (el, b, least = 64) => {
        if (!el) return;
        const bw = Math.max(least, b.width), bh = Math.max(least, b.height);
        el.style.translate = `${(b.left + b.width / 2 - bw / 2).toFixed(1)}px ${(b.top + b.height / 2 - bh / 2).toFixed(1)}px`;
        el.style.width = `${bw.toFixed(1)}px`;
        el.style.height = `${bh.toFixed(1)}px`;
    };
    const placeHits = () => {
        if (!L.sid) return;
        put(sidHit.value, L.sid.boxOnScreen(rectOf(B.sid)));
        put(moonHit.value, L.moon.boxOnScreen(rectOf(B.moon)));
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

        // ---- Day and night: the edge flows, the drops sway
        L.sky.uniforms.uWave.value.set(WAVE.amp * k() * ramp, WAVE.length * k(), t * WAVE.speed, F.y);
        L.sky.bubbles = moveDrops(t, ramp);

        // ---- The clouds drift from left to right and wrap round, rising and falling a little
        clouds.forEach((c) => {
            const node = L.clouds[c.i];
            const moved = c.x0 + c.speed * t;
            const wrapped = span.left + ((((moved - span.left) % span.width) + span.width) % span.width);
            node.x = wrapped - c.x0;
            node.y = Math.sin(t * 0.3 + c.phase) * 5 * ramp;
            node.sx = 1 + 0.025 * Math.sin(t * 0.5 + c.phase) * ramp;
        });

        // ---- The eclipse: the moon rides slowly back and forth over the sun and rocks (a spring when touched); the
        // sun's light breathes and the corona trembles
        rockV += (-rock * 9 - rockV * 2.2) * dt;
        rock += rockV * dt;
        flare = Math.max(0, flare - dt * 0.8);
        const ride = Math.sin(t * 0.11) * RIDE * k() * ramp;
        L.moonNode.x = ride;
        L.moonNode.y = scroll * 14 + Math.sin(t * 0.37) * 3 * ramp;
        L.moon.rotate = Math.sin(t * 0.23) * 1.2 * ramp + rock;
        const breath = Math.sin(t * 0.6);
        L.sunGlow.opacity = 0.7 + 0.12 * breath + 0.3 * flare;
        L.sunGlow.scale = 1 + 0.04 * breath + 0.12 * flare;
        L.warm.opacity = 0.6 + 0.1 * Math.sin(t * 0.4) + 0.3 * flare;
        L.sunNode.y = scroll * 10;

        // ---- The land
        L.planes.forEach(({ node }, p) => { node.y = scroll * DEPTH.land[p]; });

        // ---- Sid breathes, from his seat; his aura with him, flaring when touched
        glowSid = Math.max(0, glowSid - dt * 0.7);
        const inhale = Math.sin(t * 0.9);
        L.body.sy = 1 + 0.014 * inhale * ramp;
        L.body.sx = 1 - 0.005 * inhale * ramp;
        L.body.uniforms.uBright.value = 1 + 0.12 * glowSid;
        L.aura.opacity = 0.55 + 0.15 * inhale * ramp + 0.45 * glowSid;
        L.aura.scale = 1 + 0.05 * inhale * ramp + 0.2 * glowSid;
        L.sidNode.y = scroll * DEPTH.land[1];
        dust?.fade(2, 0.8 + 0.2 * inhale * ramp);
        stage.bloom = Math.max(0.5 * glowSid, 0.4 * flare);

        // The particles that belong to a layer follow it
        const sunDrift = stage.drift(L.sunNode.z), moonDrift = stage.drift(L.moonNode.z), sidDrift = stage.drift(L.sidNode.z);
        dust?.shift(0, sunDrift.x, sunDrift.y + L.sunNode.y);
        dust?.turn(1, L.moon.rotate, sx(MOON.x), sy(MOON.y));
        dust?.shift(1, moonDrift.x + L.moonNode.x, moonDrift.y + L.moonNode.y);
        dust?.shift(2, sidDrift.x, sidDrift.y + L.sidNode.y);
        const skyDrift = stage.drift(L.skyNode.z);
        dust?.shift(3, skyDrift.x, skyDrift.y);
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
        // Every star, and its reflections about the frame's edges that fall on the screen and well inside the night
        const deep = (ax, ay) => [[0, 0], [24, 0], [-24, 0], [0, 24], [0, -24]].every(([dx, dy]) => nightAt(ax + dx, ay + dy));
        const starPoints = (w, h) => {
            const out = [];
            NIGHT.stars.forEach(([x, y, r]) => {
                [[x, y], [2 * SIZE - x, y], [x, -y], [2 * SIZE - x, -y]].forEach(([ax, ay], j) => {
                    const px = sx(ax), py = sy(ay);
                    if (px < -40 || px > w + 40 || py < -40 || py > h + 40 || (j && !deep(ax, ay))) return;
                    out.push([px, py, Math.max(2.2, 2 * r * k() * 1.6), NIGHT.star]);
                });
            });
            return out;
        };
        const fromArt = (list, colour, scale = 1) => list.map(([x, y, r]) => [sx(x), sy(y), Math.max(1.5, 2 * r * k() * scale), colour]);
        dust = startStardust(null, {
            stage,
            manual: true,
            groups: [
                // 0: the sun's stippled corona, alive, only over the day
                { colors: [SUN.color], parallax: 0, drift: 1.8, jitter: 0.5, twinkle: 0.3, reach: 0, order: after(L.sun), mask: { field: L.sky, side: -1 }, points: () => fromArt(SUN.dots, SUN.color, 1.4) },
                // 1: the moon's stippled shade, only over the night
                { colors: [SHADE], parallax: 0, drift: 0.4, jitter: 0.15, twinkle: 0.05, reach: 0, order: after(L.moon), mask: { field: L.sky, side: 1 }, points: () => fromArt(MOON.dots, SHADE, 1.5) },
                // 2: Sid's aura, under him
                { colors: [AURA], parallax: 0, drift: 1.4, jitter: 0.4, twinkle: 0.4, reach: 0, bloom: true, order: L.body.mesh.renderOrder - 0.5, points: () => fromArt(art.sid.aura, AURA, 1.1) },
                // 3: the stars, only in the night, just over it (mirrored with it beyond the frame)
                { colors: [NIGHT.star], parallax: 0, drift: 1.2, jitter: 0, twinkle: 0.6, reach: 90, push: 10, order: after(L.sky), points: starPoints },
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
    <div class="scene" ref="root">
        <canvas class="stageCanvas" ref="canvas"></canvas>
        <div ref="moonHit" class="hit" role="button" tabindex="0"
            :aria-label="$i18n.locale === 'en' ? 'The moon in front of the sun' : 'La luna delante del sol'"
            @pointerdown.prevent="touchMoon" @keydown="onKey(touchMoon)($event)"></div>
        <div ref="sidHit" class="hit" role="button" tabindex="0"
            :aria-label="$i18n.locale === 'en' ? 'Sid meditating on his rock' : 'Sid meditando sobre su roca'"
            @pointerdown.prevent="touchSid" @keydown="onKey(touchSid)($event)"></div>
    </div>
</template>

<style scoped>
    .scene {
        position: absolute;
        inset: 0;
        overflow: hidden;
        background: #fed989;
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
        outline: 2px solid rgba(20, 50, 70, 0.7);
        outline-offset: 2px;
    }
</style>
