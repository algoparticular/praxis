<script setup>
    // Ciclos: "I appreciate who I was, I honour who I am, and I project who I want to be". A teal starry night pours
    // over the yellow day like a liquid that never mixes with it, and the round body in the sky is both: the white moon
    // where the night is over it and a red sun, its corona stippled, where the day is (as in the card, the disc split by
    // the edge between them). White clouds drift, and over rolling hills of green and sand, with white rocks, pink fans
    // and tufts of grass, Sid sits meditating on a rock with his red aura round him.
    // Its verb is Soltar (closing a cycle: "you can only move forward if you are able to let go of the old"). The plants
    // of the hills, the pink fans and the tufts of grass, hold the old cycle as their dry leaves: a touch on one lets them
    // go (`release`): it shivers, its leaves fly off with the wind and it is left low and bare. With every plant let go
    // the day flows a little further over the round body in the sky (a dent pressed into the edge, the field's uDent), so
    // the moon gives way to the sun. Holding Sid is a breath, as in Vipassana, Nekkhamma and Upekkha (`inhale`; let go
    // once gathered, `exhale`, and every plant left lets go at once). With them all bare the sun is whole: F7 resolves to
    // B flat (`resolve`), the corona flares, the name lights up and the rulito is born over his head (`rulito`); when it
    // goes the night pours back over the sun and the plants grow their leaves again: a new cycle. Left alone 7 s, a plant
    // shines and the ghost hand touches it (the hint); left alone 15 s, a bare plant grows its leaves back, then another.
    // A short touch on Sid flares his aura (`star`); on the moon it rocks a little and the corona flares. The card's drops
    // (day caught in the night, night in the day) live in the sky, swaying as a liquid.
    // The sky is not a picture: day and night are two liquids drawn by the stage (field()), from the night's shape, drops
    // and colour that the converter read from the card (it is in no layer); its stars are particles that live only in
    // the night. Nor is the sun: a disc drawn in code (under the moon) with a warm light round it and, over its edge, its
    // stippled corona as live particles read from the card (`sun.cloud`, scripts/sun-cloud.mjs, as Metta's lights): the
    // disc is only as big as where the sun is still whole, so no circle shows; the moon's stippled shade and Sid's aura are
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
    import { decodeCloud, sampleCloud } from '../../composables/stippleCloud.js';
    import { createSparks } from '../../composables/useSparks.js';
    import { play } from '../../composables/useSound.js';
    import { createGhostHand, gesture, HINT_AFTER } from '../../composables/useGhostHand.js';
    import { sceneMilestone } from '../../analytics.js';
    import Rulito from '../Rulito.vue';
    import art from '../../composables/ciclosScene.json';

    const props = defineProps({
        card: { type: Object, default: () => ({}) },
        active: Boolean
    });

    const root = ref(null);
    const canvas = ref(null);
    const sidHit = ref(null);
    const moonHit = ref(null);
    const rulito = ref(null);
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
    const SUN_CLOUD = decodeCloud(SUN.cloud);   // its stippled corona, read from the card (scripts/sun-cloud.mjs)
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
    // The drops of the card, alive: each sways and trembles where the card has it, as a liquid (only the sky's life:
    // the game is the plants, which a phone always shows; most drops are past its edges or too small for a finger)
    const drops = NIGHT.bubbles.slice(0, FIELD_BUBBLES).map(([x, y, rx, ry, angle, toward], j) => ({
        x, y, rx, ry, angle, toward, phase: j * 1.9 + Math.random(),
    }));
    const ease = (v) => v * v * (3 - 2 * v);
    const moveDrops = (t, ramp) => drops.map((d, j) => {
        const jelly = 0.08 * Math.sin(t * (2.1 + 0.3 * j) + d.phase) * ramp;
        const x = d.x + Math.sin(t * 0.35 + d.phase) * 10 * ramp, y = d.y + Math.sin(t * 0.27 + d.phase * 1.7) * 8 * ramp;
        return [sx(x), sy(y), d.rx * (1 + jelly) * k(), d.ry * (1 - jelly) * k(), d.angle + 0.12 * Math.sin(t * 0.4 + d.phase) * ramp, d.toward, 0.3, 1];
    });
    const WAVE = { amp: 10, length: 900, speed: 0.25 };

    // ---- The game: the plants of the hills let go of their dry leaves, the day flows over the moon and the sun is whole
    const GLYPH = { x: 1703, top: 728, h: 145 };   // the rulito over his head (art px: the middle, its top, its height)
    const RULITO_COLOR = '#fc747c';
    const FULL = 150;                       // px the edge gives way round the disc with every plant let go (more than FIELD_RANGE: all of it)
    const MOST = 8;                         // plants that count at most (the biggest on the screen)
    const BREATH_AT = 0.35, BREATH = 1.6;   // s held on Sid before it is a breath, and s more to gather it whole
    const DELAY = 0.7, GROW = 2.2, LINGER = 3, EAT = 3.4;     // the rulito: born, kept, gone
    const IDLE_BACK = 15, BACK = 4;         // left alone 15 s, a plant that let go grows its leaves again, then one every 4 s
    const SHED = 1.3, REGROW = 2.4;         // s a plant takes to let go of its leaves, and to grow them again
    const LEAVES = { fan: [0xeeaa88, 0xdda088, 0xf4c2a4], grass: [0x776633, 0x8a7a40, 0x335544] };
    const BARE = { sy: 0.38, sx: 0.7, opacity: 0.5 };   // a plant that has let go: low, thin and faded (it grows back)
    const sparks = createSparks(360);
    let dent = 0;                           // how far the day has flowed over the disc, 0..1 (eases to its goal)
    let alone = 0;                          // s since the last touch
    let backAt = 0;
    let released = 0;
    let win = null;
    let wins = 0;
    let breathUsed = false;
    let breath = null;                      // { pointerId, at, breathing }
    let charge = 0;                         // 0..1 the breath gathered
    let hand = null;                        // the ghost hand: left alone 7 s, it touches a plant that shines
    let hands = 0;                          // how many times it has shown, so every third one is the held breath
    let glyph = { left: 0, top: 0, w: 1, h: 1 };
    let screenW = 1, screenH = 1;
    // Each plant's game: `gone` how far it has let go (0 leafy .. 1 bare), `hint` its shine, `shake` its shiver as it
    // lets go; `copies` are its pictures (it and its mirrors beyond the frame), filled in by build()
    plants.forEach((pl) => Object.assign(pl, { state: 'here', gone: 0, hint: 0, shake: 0, need: true, copies: [] }));
    const needed = () => plants.filter((pl) => pl.need);
    const left = () => plants.filter((pl) => pl.state === 'here');
    const dentGoal = () => {
        if (win) return 1;
        const need = needed();
        return need.length ? need.filter((pl) => pl.state !== 'here' && pl.state !== 'back').length / need.length : 0;
    };
    // Where a plant is on the screen now (its plane slides with the camera), from its own picture
    const boxOf = (pl) => pl.copies.find((c) => !c.side)?.img.boxOnScreen(rectOf(pl.box));
    const centreOf = (pl) => {
        const b = boxOf(pl);
        return b ? { x: b.left + b.width / 2, y: b.top + b.height * 0.55, w: b.width, h: b.height } : null;
    };
    const plantAt = (p) => {
        if (reduced || win || !stage) return null;
        let best = null, bestD = Infinity;
        left().forEach((pl) => {
            const b = boxOf(pl);
            if (!b) return;
            const padX = Math.max(0, (48 - b.width) / 2), padY = Math.max(0, (48 - b.height) / 2);
            if (p.x < b.left - padX || p.x > b.left + b.width + padX || p.y < b.top - padY || p.y > b.top + b.height + padY) return;
            const d = Math.hypot(b.left + b.width / 2 - p.x, b.top + b.height / 2 - p.y);
            if (d < bestD) { best = pl; bestD = d; }
        });
        return best;
    };
    const fromEvent = (event) => {
        const area = root.value.getBoundingClientRect();
        return { x: event.clientX - area.left, y: event.clientY - area.top };
    };
    // A plant lets go: it shivers and its dry leaves fly off with the wind, and it is left low and bare
    const letGo = (pl, quiet = false) => {
        if (pl.state !== 'here') return;
        pl.state = 'going';
        pl.hint = 0;
        pl.shake = 1;
        if (pl.need) released += 1;
        const c = centreOf(pl);
        if (c) {
            sparks.burst(c.x, c.y - c.h * 0.15, {
                n: pl.kind === 'fan' ? 26 : 18, colors: LEAVES[pl.kind], speed: 45, life: 2.6, size: pl.kind === 'fan' ? 5 : 4,
                spread: c.w * 0.35, push: [80, -34],
            });
        }
        if (!quiet) play('release');
        if (!win && released >= needed().length) setTimeout(() => { if (!gone) closeCycle(); }, DELAY * 1000);
    };
    // Every plant let go: the sun is whole, F7 resolves and the rulito is born over Sid
    const closeCycle = () => {
        if (win) return;
        wins += 1;
        plants.forEach((pl) => letGo(pl, true));
        win = { age: 0, head: 0, tail: 0, full: false, fullAt: 0, back: false, pop: 0 };
        rulito.value?.reshape();
        play('resolve');
        flare = 1;
        glowSid = 1;
        dust?.boost(0, 1.6);
        dust?.boost(2, 1.4);
        sceneMilestone('cycle_closed', { times: wins, breath: breathUsed });
        breathUsed = false;
    };
    // A new cycle: the night pours back over the sun and the plants grow their leaves again, one after the other
    const newCycle = () => {
        released = 0;
        plants.forEach((pl, j) => setTimeout(() => { if (!gone && pl.state !== 'here') pl.state = 'back'; }, 1200 + j * 160));
    };
    // The plants that count are those on the screen, under the card's name (on a phone some are past its edges; they
    // go with the rest), the biggest MOST of them
    const markNeeded = () => {
        const top = titleBottom(screenH);
        const seen = plants.filter((pl) => {
            const r = rectOf(pl.box), x = r.left + r.w / 2, y = r.top + r.h / 2;
            return x > 16 && x < screenW - 16 && y > top && y < screenH - 16;
        }).sort((a, b) => b.box[2] * b.box[3] - a.box[2] * a.box[3]).slice(0, MOST);
        plants.forEach((pl) => { pl.need = seen.includes(pl); });
        if (!needed().length) plants.forEach((pl) => { pl.need = true; });
    };

    // Pressing Sid: a tap flares his aura and strums the chord; held past BREATH_AT he gathers a breath (`inhale`), and
    // let go once it is gathered he breathes out (`exhale`) and every plant left lets go at once
    const touchSid = (event) => {
        if (event?.clientX !== undefined && plantAt(fromEvent(event))) return;
        alone = 0;
        if (reduced || win) { flareSid(); return; }
        if (breath) return;
        breath = { pointerId: event?.pointerId, at: lastT, breathing: false };
        window.addEventListener('pointerup', breatheOut);
        window.addEventListener('pointercancel', breatheOut);
    };
    const flareSid = () => {
        play('star');
        glowSid = 1;
        dust?.boost(2, 1);
    };
    const breatheOut = (event) => {
        if (!breath || (event && event.pointerId !== breath.pointerId)) return;
        window.removeEventListener('pointerup', breatheOut);
        window.removeEventListener('pointercancel', breatheOut);
        const { breathing } = breath;
        breath = null;
        alone = 0;
        const rest = left();
        if (charge >= 1 && !win && rest.length) {
            play('exhale');
            breathUsed = true;
            glowSid = 1;
            dust?.boost(2, 1.2);
            rest.forEach((pl, j) => setTimeout(() => { if (!gone) letGo(pl, true); }, 150 + j * 140));
            sceneMilestone('breath_released', { plants: rest.length });
        } else if (!breathing) flareSid();
        else dust?.boost(2, 0.4 + 0.6 * charge);
    };
    // A touch anywhere on the scene: a plant under it lets go
    const press = (event) => {
        alone = 0;
        const pl = plantAt(fromEvent(event));
        if (!pl) return;
        event.preventDefault();
        letGo(pl);
    };
    // Enter on Sid lets go of the plant nearest to him that counts
    const keySid = () => {
        alone = 0;
        const rest = left().filter((pl) => pl.need);
        if (reduced || win || !rest.length) { flareSid(); return; }
        const s0 = { x: sx(GLYPH.x), y: sy(GLYPH.top) };
        const at = (pl) => { const r = rectOf(pl.box); return Math.hypot(r.left + r.w / 2 - s0.x, r.top + r.h / 2 - s0.y); };
        rest.sort((a, b) => at(a) - at(b));
        letGo(rest[0]);
    };

    // Every frame: the plants, the dent, the breath, the hint and the rulito
    const game = (t, dt, ramp) => {
        alone += dt;
        plants.forEach((pl) => {
            pl.hint = Math.max(0, pl.hint - dt * 0.7);
            pl.shake = Math.max(0, pl.shake - dt * 1.4);
            if (pl.state === 'going') { pl.gone = Math.min(1, pl.gone + dt / SHED); if (pl.gone >= 1) pl.state = 'away'; }
            if (pl.state === 'back') { pl.gone = Math.max(0, pl.gone - dt / REGROW); if (pl.gone <= 0) pl.state = 'here'; }
            // Let go, it is left low, thin and faded; it shivers as it lets go, and the hint makes it sway and shine
            const e = ease(pl.gone);
            const shiver = Math.sin(t * 38 + pl.box[0]) * 5 * pl.shake * pl.shake;
            const swing = Math.sin(t * 5.5 + pl.box[1]) * 4 * pl.hint;
            pl.copies.forEach(({ img, side, wind }) => {
                img.sy = 1 - (1 - BARE.sy) * e;
                img.sx = (side ? -1 : 1) * (1 - (1 - BARE.sx) * e);
                img.opacity = 1 - (1 - BARE.opacity) * e;
                img.rotate = (side ? -1 : 1) * (shiver + swing) * ramp;
                img.uniforms.uBright.value = 1 + 0.35 * pl.hint;
                img.uniforms.uWind.value.x = wind * (1 + 2.5 * pl.hint + 3 * pl.shake) * (1 - 0.6 * e);
            });
        });
        dent += (dentGoal() - dent) * Math.min(1, dt * (win || dentGoal() > dent ? 1.3 : 0.45));
        const sr = MOON.r * k() * 1.05;
        L.sky.uniforms.uDent.value.set(sx(SUN.x), sy(SUN.y), sr, FULL * ease(Math.min(1, dent)));

        // The breath
        if (breath && !win) {
            const holding = t - breath.at;
            if (holding > BREATH_AT && !breath.breathing) { breath.breathing = true; play('inhale'); }
            charge = Math.min(1, Math.max(0, (holding - BREATH_AT) / BREATH));
            if (charge > 0 && Math.random() < dt * 12 * charge) {
                const body = L.sid.boxOnScreen(rectOf(B.sid));
                const a = Math.random() * 6.28, r = body.height * (0.9 + Math.random() * 0.5);
                const cx = body.left + body.width / 2, cy = body.top + body.height * 0.4;
                sparks.burst(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.8, { n: 1, colors: [AURA, 0xfff6dc], speed: 12, life: 1, size: 3, spread: 4 });
            }
        } else charge = Math.max(0, charge - dt * 2.5);

        // The hint, without words: left alone 7 s, a plant that counts shines and sways, and the ghost hand touches it;
        // every third time the hand holds Sid instead, because nothing else shows that holding him is a breath
        const rest = left().filter((pl) => pl.need && centreOf(pl));
        if (hand?.due(HINT_AFTER, !win && !breath && rest.length > 0)) {
            hands += 1;
            if (hands % 3 === 0) hand.play(gesture.hold(sidHit.value, 2.4));
            else {
                const pl = rest[Math.floor(Math.random() * rest.length)];
                pl.hint = 1;
                hand.play(gesture.tap(() => { const c = centreOf(pl); return c ? [c.x, c.y] : [0, 0]; }));
            }
        }
        // Left alone a while, what was let go comes back: a plant grows its leaves again, then another (rule 4 of Soltar)
        if (!win && !breath && released > 0 && alone > IDLE_BACK && t - backAt > BACK) {
            const away = plants.filter((pl) => pl.need && pl.state === 'away');
            if (away.length) {
                backAt = t;
                away[Math.floor(Math.random() * away.length)].state = 'back';
                released -= 1;
            }
        }

        // The rulito: born over his head, kept a while, then its tail catches its head and a new cycle begins
        let named = 0;
        if (win && rulito.value) {
            win.age += dt;
            win.pop = Math.max(0, win.pop - dt * 2.2);
            win.head = 1 - (1 - Math.min(1, Math.max(0, (win.age - DELAY) / GROW))) ** 1.6;
            if (win.head >= 1 && !win.full) { win.full = true; win.fullAt = win.age; win.pop = 1; play('rulito'); flare = 1; }
            if (win.full && !win.back && win.age - win.fullAt > LINGER) win.back = true;
            if (win.back) win.tail = Math.min(1, win.tail + dt / EAT);
            const whole = Math.min(1, Math.max(0, (win.head - win.tail - 0.6) / 0.4));
            named = Math.max(win.pop, 0.8 * whole * whole * (3 - 2 * whole));
            const shine = win.full && win.head - win.tail > 0.9 ? Math.max(win.pop, Math.sin(t * 4) * 0.5 + 0.5) : 0;
            rulito.value.frame({ head: win.head, tail: win.tail, flare: shine, t, fade: Math.min(1, (win.head - win.tail) * 14), width: glyph.w });
            L.rulito.refresh();
            L.rulito.scale = 1 + 0.2 * win.pop * win.pop;
            if (win.back && win.tail >= 1) {
                win = null;
                rulito.value.frame({ width: glyph.w });
                L.rulito.refresh();
                newCycle();
            }
        }
        stageEl?.style.setProperty('--name-glow', named.toFixed(3));
        return { named, charge };
    };

    const touchMoon = (event) => {
        if (event?.clientX !== undefined && plantAt(fromEvent(event))) return;
        alone = 0;
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
                    pl.copies.push({ img, side, wind: wind.amp });
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
                L.rulito = L.sid.canvas(rulito.value.canvas, { bloom: true });
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
        const sd = SUN.cloud.solid * k();       // the disc only as big as where the sun is still whole: the corona covers its edge
        L.sun.place({ left: sx(SUN.x) - sd, top: sy(SUN.y) - sd, w: 2 * sd, h: 2 * sd });
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
        // The rulito over his head (its canvas is bigger than the glyph, for the glow)
        const gh = GLYPH.h * k(), gw = gh * 32 / 86;
        glyph = { left: sx(GLYPH.x) - gw / 2, top: sy(GLYPH.top), w: gw, h: gh };
        L.rulito.place({ left: glyph.left - 0.4375 * glyph.w, top: glyph.top - 0.1628 * glyph.h, w: glyph.w * 1.875, h: glyph.h * 1.3256 },
            { x: glyph.left + glyph.w / 2, y: glyph.top + glyph.h });
        screenW = w;
        screenH = h;
        markNeeded();
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
        const { named, charge: held } = game(t, dt, ramp);

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
        L.body.sy = 1 + 0.014 * inhale * ramp + 0.03 * held;
        L.body.uniforms.uBright.value = 1 + 0.12 * glowSid + 0.15 * held;
        L.aura.opacity = 0.55 + 0.15 * inhale * ramp + 0.45 * Math.max(glowSid, held);
        L.aura.scale = 1 + 0.05 * inhale * ramp + 0.2 * glowSid + 0.35 * held;
        L.sidNode.y = scroll * DEPTH.land[1];
        dust?.fade(2, 0.8 + 0.2 * inhale * ramp + 0.3 * held);
        stage.bloom = Math.max(0.5 * glowSid, 0.4 * flare, named, win ? 0.5 : 0, 0.4 * held);

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
        hand = createGhostHand(stage, { color: 0x143246, shade: 0xf7f8f1 });   // navy: the cream hand does not read on the day's yellow
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
                { colors: [SUN.color], parallax: 0, drift: 1.8, jitter: 0.5, twinkle: 0.3, reach: 0, order: after(L.sun), mask: { field: L.sky, side: -1 }, points: () => sampleCloud(SUN_CLOUD, (u, v) => [sx(u), sy(v)], k()).map(([x, y, size]) => [x, y, size, SUN.color]) },
                // 1: the moon's stippled shade, only over the night
                { colors: [SHADE], parallax: 0, drift: 0.4, jitter: 0.15, twinkle: 0.05, reach: 0, order: after(L.moon), mask: { field: L.sky, side: 1 }, points: () => fromArt(MOON.dots, SHADE, 1.5) },
                // 2: Sid's aura, under him
                { colors: [AURA], parallax: 0, drift: 1.4, jitter: 0.4, twinkle: 0.4, reach: 0, bloom: true, order: L.body.mesh.renderOrder - 0.5, points: () => fromArt(art.sid.aura, AURA, 1.1) },
                // 3: the stars, only in the night, just over it (mirrored with it beyond the frame)
                { colors: [NIGHT.star], parallax: 0, drift: 1.2, jitter: 0, twinkle: 0.6, reach: 90, push: 10, order: after(L.sky), points: starPoints },
                // 4: the motes of what is let go, in front of everything
                { ...sparks.group(), order: 1e6 },
            ],
        });
        if (reduced) dust.reveal();
        parallax = createParallax(root.value, frame);
        root.value.addEventListener('pointerdown', press);
        if (import.meta.env.DEV) root.value.__game = { get plants() { return plants; }, get released() { return released; }, get win() { return win; }, get dent() { return dent; }, centres: () => needed().map(centreOf) };
        enter();
    };

    onMounted(begin);
    watch(() => props.active, enter);
    onBeforeUnmount(() => {
        gone = true;
        stageEl?.style.removeProperty('--name-glow');
        root.value?.removeEventListener('pointerdown', press);
        window.removeEventListener('pointerup', breatheOut);
        window.removeEventListener('pointercancel', breatheOut);
        parallax?.destroy();
        dust?.destroy();
        hand?.destroy();
        stage?.destroy();
    });
</script>

<template>
    <div class="scene" ref="root">
        <canvas class="stageCanvas" ref="canvas"></canvas>
        <div ref="moonHit" class="hit" role="button" tabindex="0"
            :aria-label="$i18n.locale === 'en' ? 'The moon in front of the sun' : 'La luna delante del sol'"
            @pointerdown.prevent="touchMoon" @keydown="onKey(touchMoon)($event)"></div>
        <div ref="sidHit" class="hit sid" role="button" tabindex="0"
            :aria-label="$i18n.locale === 'en' ? 'Sid meditating on his rock: hold him to breathe and let go' : 'Sid meditando sobre su roca: mantenelo para respirar y soltar'"
            @pointerdown.prevent="touchSid" @keydown="onKey(keySid)($event)"></div>
        <!-- The rulito is drawn on its own canvas, which the stage shows as a texture over Sid -->
        <Rulito ref="rulito" class="offstage" :color="RULITO_COLOR" />
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

    .hit.sid {
        touch-action: none;                    /* held, a finger drifts a little: the phone must not take it for a scroll */
    }

    .offstage {
        position: absolute;
        left: -9999px;
        top: 0;
        width: 40px;
        visibility: hidden;
        pointer-events: none;
    }

    .hit:focus-visible {
        outline: 2px solid rgba(20, 50, 70, 0.7);
        outline-offset: 2px;
    }
</style>
