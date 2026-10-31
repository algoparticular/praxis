<script setup>
    // Aceptación: "I accept and honour who I am". Two equal beings sit cross-legged on either bank of a river that runs
    // from the horizon down to the viewer, each under its own sky: on the left the cream of the past, with a pink sun,
    // on the right a yellow one, with a pink planet like a pot with three spouts. Between the two skies a wavy edge
    // with drops of one colour in the other; in the river, an island with two little cairns of stones.
    // There is no game yet: its verb will be Fluir (a light coming down the river between the two to the cairns), so
    // the river, the island, the cairns and each being are their own pictures. Until then the scene only lives: the
    // two beings breathe together, as one, blink now and then and glance at each other across the water; the
    // mushrooms and plants on each bank sway; the light of the water ripples down the river; the planet turns a
    // little as it floats and the small ringed planet and the two strokes of the sky drift; a tap on a being makes it
    // stretch up and blink and strums the card's chord, and a tap anywhere else strums it too and makes the specks of
    // the sky flare. On a tall screen what is in the sky is spread over all of it, under the card's name, and a soft
    // breath of the card's teal lies behind the name, which is as pale as the skies.
    // The skies are not pictures: the stage draws them as two liquids that never mix (field() in useLayerStage, as
    // Upekkha's), the edge being the card's wavy line read by the converter, with a long wave travelling down it and
    // the drops of the card as bubbles of one colour in the other that now and then float back to the edge, fall into
    // their own colour and bud off it again. The sun is a disc drawn in code with its stippled edge as live particles,
    // and so are the stipple of the planet's shading and the specks of the sky. The banks go on past the frame on wide
    // screens, flat in their colours (drawn in code) with the horizon's line.
    // It is drawn in WebGL (useLayerStage), from aceptacionScene.json and public/assets/aceptacion (made by
    // scripts/convert-aceptacion.mjs). The touch targets are DOM elements over the two beings.
    import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { floorFor, paintFloor } from '../../data/stageFloor.js';
    import { createParallax } from '../../composables/useParallax.js';
    import { createLayerStage, FIELD_RANGE, FIELD_BUBBLES } from '../../composables/useLayerStage.js';
    import { startStardust } from '../../composables/useStardust.js';
    import { play } from '../../composables/useSound.js';
    import art from '../../composables/aceptacionScene.json';

    const props = defineProps({
        card: { type: Object, default: () => ({}) },
        active: Boolean
    });

    const root = ref(null);
    const canvas = ref(null);
    const hits = [];
    let stage = null;
    let parallax = null;
    let dust = null;
    let entered = false;
    let gone = false;
    let lastT = 0;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ---- Layout: the illustration is a 2160 square resting on the bottom of the screen. On a phone upright it is as
    // big as the two beings and their plants allow across, centred on the river; on a wide screen a little of its
    // foot goes under the edge, and the banks go on past it on both sides
    const SIZE = art.size;
    const B = art.boxes;
    let F = { x: 0, y: 0, size: 1 };
    const k = () => F.size / SIZE;
    const sx = (x) => F.x + x * k();
    const sy = (y) => F.y + y * k();
    const rectOf = ([left, top, w, h]) => ({ left: sx(left), top: sy(top), w: w * k(), h: h * k() });
    const SPAN = 1640, FOCUS = 1080;        // art px across that must be seen on a phone, and their middle
    const DROP = 0.02;                     // how much of the frame goes under the bottom of a wide screen
    let screenW = 1;
    let skyTop = 0;
    const layout = (w, h) => {
        screenW = w;
        const phone = w < h;
        const size = phone ? Math.min(0.72 * h, w * SIZE / SPAN) : Math.min(Math.max(0.6 * w, 0.55 * h), 0.95 * h);
        let x = w / 2 - size / 2;
        if (phone && size > w) x = Math.min(0, Math.max(w - size, w / 2 - FOCUS * size / SIZE));
        F = { x, y: h - floorFor(w, h) - size + (phone ? 0 : DROP * size), size };
        // On a tall screen the frame leaves a tall sky over it: what is in the sky (the sun, the planets, the specks)
        // is spread over all of it, from under the card's name down to the land, instead of keeping to the frame
        const tb = titleBox(h);
        const under = tb.top + tb.h + 24;
        skyTop = F.y > under + 40 ? under : F.y;
    };
    // Where something of the sky is drawn (screen px): its height spread from skyTop to the land, and the sun and the
    // planet kept whole inside the screen
    const SKY_FOOT = 1450;
    const skyY = (y) => skyTop + (y / SKY_FOOT) * (sy(SKY_FOOT) - skyTop);
    const bodyX = (x, r) => Math.min(screenW - r - 10, Math.max(r + 10, sx(x)));
    const sunAt = () => ({ x: bodyX(SUN.x, SUN.r * k()), y: skyY(SUN.y) });
    const planetAt = () => { const [x, y] = centreOf(B.planet); return { x: bodyX(x, B.planet[2] * k() / 2), y: skyY(y) }; };

    const SLIDE = 46;
    const SLIDE_Y = 26;
    const zFor = (amp) => amp / (SLIDE + amp);
    const DEPTH = { sky: 3, sun: 7, bits: 9, planet: 11, land: 22 };

    const SUN = art.sun;
    const SKY = art.sky;
    const GROUND = art.ground;
    const TEAL = /^#[0-9a-f]{6}$/i.test(props.card.color ?? '') ? parseInt(props.card.color.slice(1), 16) : 0x40baad;
    const ease = (p) => p * p * (3 - 2 * p);
    const centreOf = ([x, y, w, h]) => [x + w / 2, y + h / 2];
    const L = {};

    // ---- The two skies, as two liquids that never mix: the stage draws the colours (field() in useLayerStage) and
    // the scene writes, small and when the screen changes size, how far each px is from the edge between them (the
    // card's wavy line, softened a little, read on the slope so it is a true distance). Above the frame the edge goes
    // on the way it comes in, bending upright; under the horizon the land hides it
    const skyField = document.createElement('canvas');
    const MARGIN = 120;                     // px drawn past each edge, for the camera's slide
    const FIELD = 0.5;                      // the field's px per screen px: it is smooth, small is enough
    const RISE = 320;
    const FLAT = 0.3;
    const edges = (() => {
        const x = SKY.edge.x, sigma = 4, out = [];
        for (let i = 0; i < x.length; i++) {
            let sum = 0, w = 0;
            for (let j = -3 * sigma; j <= 3 * sigma; j++) { const g = Math.exp(-(j * j) / (2 * sigma * sigma)); sum += x[Math.min(x.length - 1, Math.max(0, i + j))] * g; w += g; }
            out.push(x[i] + (sum / w - x[i]) * (0.4 + FLAT));
        }
        return out;
    })();
    const edgeAt = (y) => {
        const { y0, step } = SKY.edge;
        if (y < y0) {
            const slope = (edges[3] - edges[0]) / (3 * step);
            return edges[0] - slope * RISE * (1 - Math.exp((y - y0) / RISE));
        }
        const f = Math.min(edges.length - 1, (y - y0) / step);
        const i = Math.min(edges.length - 2, Math.floor(f));
        return edges[i] + (edges[i + 1] - edges[i]) * (f - i);
    };
    // A long wave travelling down the edge (art px), and where the edge is now with it
    const WAVE = { amp: 34, length: 1100, speed: 0.2 };
    let phase = 0;
    const waveAt = (y) => WAVE.amp * Math.sin(6.2832 * y / WAVE.length - phase);
    const edgeNow = (y) => edgeAt(y) - waveAt(y);
    const writeField = (area) => {
        const width = Math.ceil(area.w * FIELD), height = Math.ceil(area.h * FIELD);
        skyField.width = width;
        skyField.height = height;
        const ctx = skyField.getContext('2d');
        const image = ctx.createImageData(width, height);
        const scale = k();
        for (let fy = 0; fy < height; fy++) {
            const ya = (area.top + (fy + 0.5) / FIELD - F.y) / scale;
            const e = edgeAt(ya);
            const slope = (edgeAt(ya + 6) - edgeAt(ya - 6)) / 12;
            const norm = scale / Math.sqrt(1 + slope * slope) / (2 * FIELD_RANGE);
            for (let fx = 0; fx < width; fx++) {
                const xa = (area.left + (fx + 0.5) / FIELD - F.x) / scale;
                const i = fy * width + fx;
                image.data[i * 4] = Math.round(Math.min(1, Math.max(0, 0.5 + (xa - e) * norm)) * 255);
                image.data[i * 4 + 1] = 255;
                image.data[i * 4 + 3] = 255;
            }
        }
        ctx.putImageData(image, 0, 0);
    };

    // ---- The drops of the card, alive: each rests where the card has it, swaying and trembling as a liquid; now and
    // then one floats back to the edge, falls into its own colour and, a while later, buds off it again and goes home
    const between = (a, b) => a + Math.random() * (b - a);
    const drops = SKY.bubbles.filter(([, y]) => y < 1450).slice(0, FIELD_BUBBLES).map(([x, y, rx, ry, angle, toward]) => ({
        x, y, rx, ry, angle, toward, phase: Math.random() * 6.28, timer: between(8, 30), state: 'home', p: 0,
    }));
    const GO = 4.5, AWAY = [2, 5], COME = 6;
    const moveDrops = (dt, t) => drops.map((d, j) => {
        d.timer -= dt;
        if (d.state === 'home' && d.timer <= 0) { d.state = 'in'; }
        else if (d.state === 'in') { d.p = Math.min(1, d.p + dt / GO); if (d.p >= 1) { d.state = 'away'; d.timer = between(...AWAY); } }
        else if (d.state === 'away' && d.timer <= 0) { d.state = 'out'; }
        else if (d.state === 'out') { d.p = Math.max(0, d.p - dt / COME); if (d.p <= 0) { d.state = 'home'; d.timer = between(18, 40); } }
        const sway = Math.sin(t * 0.4 + d.phase) * 10, bob = Math.sin(t * 0.31 + d.phase * 1.7) * 14;
        const y = d.y + bob;
        // Home it keeps its distance from the edge as the wave goes by; going in, it sinks a little into its colour
        const home = d.x + sway - waveAt(y);
        const into = edgeNow(y) + d.toward * Math.max(d.rx, d.ry) * 0.9;
        const x = home + (into - home) * ease(d.p);
        const jelly = 0.07 * Math.sin(t * (2.4 + 0.3 * j) + d.phase);
        const shrink = 1 - 0.25 * ease(d.p);
        return [sx(x), sy(y), d.rx * (1 + jelly) * shrink * k(), d.ry * (1 - jelly) * shrink * k(), d.angle + 0.15 * Math.sin(t * 0.5 + d.phase), d.toward, 0.3, 1];
    });

    // ---- The bits of the sky (the small ringed planet and two strokes), cut out of one atlas
    const [AW, AH] = art.atlas;
    const bits = art.bits.map(([x, y, w, h, ax, ay], i) => ({ i, rect: [x, y, w, h], crop: [ax / AW, ay / AH, w / AW, h / AH], phase: i * 2.1 }));

    // ---- The two beings: they breathe together, blink, and now and then look at each other across the river
    // The two are the same drawing mirrored: the right one is the left one's picture turned over (sx -1), in a box of
    // its size against the right one's outer edge
    const mirrored = ([x, y, w, h], [lx, , lw, lh]) => [x + w - lw, y, lw, lh];
    const BEINGS = [0, 1].map((i) => ({
        side: i ? 'R' : 'L',
        body: i ? mirrored(B.beingR, B.beingL) : B.beingL,
        eyes: i ? mirrored(B.eyesR, B.eyesL) : B.eyesL,
        hop: 0, blink: between(2, 5), shut: 0, glance: between(5, 9), look: 0, lookTo: 0,
    }));
    const BREATH = 0.55;                    // their breath (rad/s): slow, and the same for both

    // ---- The banks past the frame, drawn in code: the bank's colour under the horizon's line, with the little marks
    // the card draws on the grass (dashes and ticks of the line's colour, and longer strokes a shade off the bank's),
    // smaller towards the horizon. Painted again when the screen changes size, always the same (a seeded random)
    const banks = [document.createElement('canvas'), document.createElement('canvas')];
    const floorCanvas = document.createElement('canvas');
    const hexOf = (c) => `#${c.toString(16).padStart(6, '0')}`;
    const shade = (c, to, amount) => {
        const a = [c >> 16, (c >> 8) & 255, c & 255], b = [to >> 16, (to >> 8) & 255, to & 255];
        return `rgb(${a.map((v, j) => Math.round(v + (b[j] - v) * amount)).join(', ')})`;
    };
    const paintBank = (i, rect) => {
        const RES = Math.min(2, window.devicePixelRatio || 1);
        const bank = banks[i];
        bank.width = Math.ceil(rect.w * RES);
        bank.height = Math.ceil(rect.h * RES);
        const ctx = bank.getContext('2d');
        ctx.scale(RES, RES);
        const colour = i ? GROUND.right : GROUND.left;
        ctx.fillStyle = hexOf(colour);
        ctx.fillRect(0, 0, rect.w, rect.h);
        let seed = 11 + i * 97;
        const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
        const scale = k();
        const thick = Math.max(1.5, 7 * scale);
        ctx.lineCap = 'round';
        const deep = (y) => 0.35 + 0.65 * Math.min(1, y / Math.max(1, 500 * scale));
        // The longer strokes, a shade off the bank
        ctx.strokeStyle = shade(colour, i ? 0x6fd3c4 : 0x2e9c90, 0.55);
        const strokes = Math.round(rect.w * rect.h / 9000);
        for (let n = 0; n < strokes; n++) {
            const x = rand() * rect.w, y = thick + 14 * scale + rand() * rect.h, d = deep(y);
            ctx.lineWidth = Math.max(1, 6 * scale * d);
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.quadraticCurveTo(x + 60 * scale * d, y - 6 * scale * d, x + (90 + rand() * 120) * scale * d, y + 4 * scale * d);
            ctx.stroke();
        }
        // The dashes and ticks of the line's colour
        ctx.strokeStyle = hexOf(GROUND.line);
        const marks = Math.round(rect.w * rect.h / 5000);
        for (let n = 0; n < marks; n++) {
            const x = rand() * rect.w, y = thick + 10 * scale + rand() * rect.h, d = deep(y), s = (14 + rand() * 18) * scale * d;
            ctx.lineWidth = Math.max(1, 5 * scale * d);
            ctx.beginPath();
            if (rand() < 0.5) { ctx.moveTo(x, y); ctx.lineTo(x + s * 1.6, y + s * (rand() - 0.5) * 0.4); }
            else { ctx.moveTo(x - s * 0.6, y - s); ctx.lineTo(x, y); ctx.lineTo(x + s * 0.8, y - s * 1.2); }
            ctx.stroke();
        }
        // The horizon's line
        ctx.fillStyle = hexOf(GROUND.line);
        ctx.fillRect(0, 0, rect.w, thick);
    };

    // Where the card's name ends and how wide it is (the stage's h1, over the scene): the skies are pale, as the
    // name is, so a soft breath of the card's teal lies behind it to keep it readable
    const titleBox = (h) => {
        const title = root.value?.closest('.stage')?.querySelector('h1');
        if (!title || !root.value) return { left: 0, top: 0.06 * h, w: 0, h: 0.1 * h };
        const t = title.getBoundingClientRect(), r = root.value.getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(title);
        const text = range.getBoundingClientRect();
        return { left: text.left - r.left, top: t.top - r.top, w: text.width, h: t.height };
    };

    let screenH = 1;
    const placeVeil = (h = screenH) => {
        screenH = h;
        const tb = titleBox(h);
        const vw = tb.w * 1.5 + 120, vh = tb.h * 2.6 + 40;
        L.veil.place({ left: tb.left + tb.w / 2 - vw / 2, top: tb.top + tb.h / 2 - vh / 2, w: vw, h: vh });
    };

    const build = (s) => {
        // The skies
        const sky = s.depth(zFor(DEPTH.sky));
        L.skyNode = sky;
        L.sky = sky.field({ source: skyField, colors: [SKY.cream, SKY.yellow], flow: 0.8 });
        L.veil = s.depth(0).glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: TEAL, stops: [[0, 0.3], [0.4, 0.16], [0.72, 0]] });
        // The sun: a soft light round it, its disc (code) and its stippled edge (particles)
        const sun = s.depth(zFor(DEPTH.sun));
        L.sunNode = sun;
        L.sunGlow = sun.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: SUN.color, stops: [[0, 0.32], [0.3, 0.12], [0.65, 0]] });
        L.sun = sun.disc({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: SUN.color });
        sun.enter({ y: 50, delay: 150, duration: 2400 });
        // The little bits of the sky
        const far = s.depth(zFor(DEPTH.bits));
        L.bitsNode = far;
        L.bits = bits.map((b) => far.image('/assets/aceptacion/bits.webp', { crop: b.crop }));
        far.enter({ y: -20, delay: 300, duration: 2000 });
        // The planet
        const planet = s.depth(zFor(DEPTH.planet));
        L.planetNode = planet;
        L.planet = planet.image('/assets/aceptacion/planet.webp');
        planet.enter({ y: 40, delay: 250, duration: 2400 });
        // The land: the banks past the frame (code), the river, the banks, the island and its cairns, the plants and
        // the beings, all at one depth so the beings' legs (drawn on the banks) never slide from under them
        const land = s.depth(zFor(DEPTH.land));
        L.landNode = land;
        L.beyond = banks.map((bank) => land.canvas(bank));
        L.floor = land.canvas(floorCanvas);
        L.river = land.image('/assets/aceptacion/river.webp', { water: 1 });
        L.groundL = land.image('/assets/aceptacion/groundL.webp');
        L.groundR = land.image('/assets/aceptacion/groundR.webp');
        L.island = land.image('/assets/aceptacion/island.webp', { water: 0.35 });
        L.cairns = land.image('/assets/aceptacion/cairns.webp');
        L.plants = ['L', 'R'].map((side, i) => land.image(`/assets/aceptacion/plants${side}.webp`, { wind: { amp: 3.2, speed: 0.7 + 0.15 * i, root: 'bottom' } }));
        L.beings = BEINGS.map((b) => {
            const group = land.group();
            const being = { group, body: group.image('/assets/aceptacion/being.webp'), eyes: group.image('/assets/aceptacion/eyes.webp') };
            if (b.side === 'R') being.body.sx = being.eyes.sx = -1;
            return being;
        });
        land.enter({ y: 40, delay: 100, duration: 1800 });
    };

    let area = { left: 0, top: 0, w: 1, h: 1 };
    // The ground along the card's bottom edge, for the band under the frame on a phone ([x in art px, colour], read off the card's bottom rows)
    const FLOOR_COLOURS = [[0, '#8acfbc'], [336, '#2c3447'], [408, '#07befb'], [1752, '#2b3548'], [1824, '#36848e']];
    const place = (w, h) => {
        layout(w, h);
        // Under the frame on a phone, the river and its banks going on down (stageFloor.js), drawn on the land: the skies
        // are drawn over the whole stage, so a background would not show
        const floor = floorFor(w, h);
        L.floor.mesh.visible = floor > 0;
        if (floor > 0) {
            const top = F.y + F.size - 30, left = -60, fw = w + 120, fh = h - top + 60;
            paintFloor(floorCanvas, left, fw, fh, F, FLOOR_COLOURS);
            L.floor.place({ left, top, w: fw, h: fh });
            L.floor.refresh();
        }
        area = { left: -MARGIN, top: -MARGIN, w: w + 2 * MARGIN, h: h + 2 * MARGIN };
        writeField(area);
        L.sky.place(area);
        L.sky.refresh();
        L.sky.uniforms.uScale.value = k();
        placeVeil(h);

        const sr = SUN.r * k(), sun = sunAt();
        L.sun.place({ left: sun.x - sr, top: sun.y - sr, w: 2 * sr, h: 2 * sr });
        const sg = sr * 4;
        L.sunGlow.place({ left: sun.x - sg / 2, top: sun.y - sg / 2, w: sg, h: sg });
        bits.forEach((b, i) => {
            const [x, y] = centreOf(b.rect), bw = b.rect[2] * k(), bh = b.rect[3] * k();
            const r = { left: sx(x) - bw / 2, top: skyY(y) - bh / 2, w: bw, h: bh };
            L.bits[i].place(r, { x: r.left + r.w / 2, y: r.top + r.h / 2 });
        });
        const planet = planetAt(), pw = B.planet[2] * k(), ph = B.planet[3] * k();
        L.planet.place({ left: planet.x - pw / 2, top: planet.y - ph / 2, w: pw, h: ph }, planet);

        // Past the frame the banks go on (drawn in code)
        const reach = SLIDE * 3 + MARGIN;
        [[-reach, sx(0) + 1], [sx(SIZE) - 1, w + reach]].forEach(([from, to], i) => {
            const horizon = sy(GROUND.tops[i]) - Math.max(1.5, 7 * k()) / 2;
            const rect = { left: from, top: horizon, w: Math.max(2, to - from), h: Math.max(2, h + reach - horizon) };
            const shown = rect.w > reach + 4;
            L.beyond[i].mesh.visible = shown;
            if (shown) paintBank(i, rect);
            L.beyond[i].place(rect);
            L.beyond[i].refresh();
        });
        L.river.place(rectOf(B.river));
        L.groundL.place(rectOf(B.groundL));
        L.groundR.place(rectOf(B.groundR));
        L.island.place(rectOf(B.island));
        const cr = rectOf(B.cairns);
        L.cairns.place(cr, { x: cr.left + cr.w / 2, y: cr.top + cr.h });
        L.plants.forEach((p, i) => p.place(rectOf(B[`plants${i ? 'R' : 'L'}`])));
        BEINGS.forEach((b, i) => {
            const body = rectOf(b.body), eyes = rectOf(b.eyes);
            const foot = { x: body.left + body.w / 2, y: body.top + body.h };
            L.beings[i].group.pivot = foot;
            L.beings[i].body.place(body, foot);
            L.beings[i].eyes.place(eyes, { x: eyes.left + eyes.w / 2, y: eyes.top + eyes.h / 2 });
        });
    };

    // ---- Touch: a being hops and the chord is strummed; anywhere else the chord is strummed and the specks flare
    const hop = (i) => {
        if (reduced) { play('star'); return; }
        BEINGS[i].hop = 1;
        BEINGS[i].shut = 1;
        play('star');
        dust?.boost(2, 0.6);
    };
    const onKey = (i, event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        hop(i);
    };
    const strum = () => {
        play('star');
        dust?.boost(0, 0.7);
        dust?.boost(1, 0.7);
        dust?.boost(2, 1);
    };
    const placeHits = () => {
        BEINGS.forEach((b, i) => {
            const el = hits[i];
            if (!el || !L.beings) return;
            const box = L.beings[i].group.boxOnScreen(rectOf(b.body));
            const bw = Math.max(64, box.width), bh = Math.max(64, box.height);
            el.style.translate = `${(box.left + box.width / 2 - bw / 2).toFixed(1)}px ${(box.top + box.height / 2 - bh / 2).toFixed(1)}px`;
            el.style.width = `${bw.toFixed(1)}px`;
            el.style.height = `${bh.toFixed(1)}px`;
        });
    };

    const enter = () => {
        if (entered || !props.active || !stage) return;
        entered = true;
        stage.ready().then(() => { if (!gone) { stage.start(); dust?.reveal(); } });
    };

    let frames = 0;
    const frame = ({ x, y, scroll, t, ramp }) => {
        if (!stage || !L.beings) return;
        const dt = Math.min(0.1, Math.max(0, t - lastT));
        lastT = t;
        stage.look(x * SLIDE, y * SLIDE_Y);

        // ---- The skies: the long wave down the edge, and the drops
        if (!reduced) phase = WAVE.speed * t;
        L.sky.uniforms.uWave.value.set(WAVE.amp * k(), WAVE.length * k(), phase, F.y);
        L.sky.bubbles = moveDrops(reduced ? 0 : dt, t);
        L.skyNode.y = scroll * 4;

        // ---- The sun breathes; the planet floats and turns a little; the bits drift
        const breath = Math.sin(t * 0.5);
        L.sun.scale = 1 + 0.015 * breath * ramp;
        L.sunGlow.opacity = 0.8 + 0.2 * breath;
        L.sunGlow.scale = 1 + 0.05 * breath;
        L.sunNode.y = scroll * 8;
        const turn = Math.sin(t * 0.23) * 4 * ramp;
        L.planet.rotate = turn;
        L.planet.y = Math.sin(t * 0.37) * 10 * k() * ramp;
        L.planetNode.y = scroll * 12;
        bits.forEach((b, i) => {
            L.bits[i].x = Math.sin(t * 0.13 + b.phase) * 14 * k() * ramp;
            L.bits[i].y = Math.sin(t * 0.29 + b.phase) * 8 * k() * ramp;
            L.bits[i].rotate = Math.sin(t * 0.21 + b.phase) * 6 * ramp;
        });
        L.bitsNode.y = scroll * 10;

        // ---- The beings: one breath for both; each blinks, glances at the other now and then, and hops when touched
        const together = Math.sin(t * BREATH);
        BEINGS.forEach((b, i) => {
            const node = L.beings[i];
            if (!reduced) {
                b.blink -= dt;
                if (b.blink <= 0) { b.shut = 1; b.blink = between(3, 7) * (Math.random() < 0.2 ? 0.1 : 1); }
                b.glance -= dt;
                if (b.glance <= 0) { b.lookTo = b.lookTo ? 0 : 1; b.glance = b.lookTo ? between(1.5, 3) : between(6, 12); }
            }
            b.shut = Math.max(0, b.shut - dt * 7);
            b.look += (b.lookTo - b.look) * Math.min(1, dt * 4);
            b.hop = Math.max(0, b.hop - dt * 1.6);
            const jump = Math.sin((1 - b.hop) * Math.PI) * (b.hop > 0 ? 1 : 0);
            const squash = b.hop > 0.85 ? (b.hop - 0.85) / 0.15 : 0;
            // (a stretch up rather than a jump: its crossed legs are drawn on the bank and stay there)
            node.group.y = -jump * 8 * k();
            node.group.sy = 1 + 0.014 * together * ramp + 0.08 * jump - 0.08 * squash;
            node.group.sx = 1 - 0.006 * together * ramp - 0.035 * jump + 0.06 * squash;
            node.eyes.sy = 1 - 0.9 * Math.sin(Math.min(1, b.shut) * Math.PI);
            // Each looks towards the other, across the river
            node.eyes.x = (i ? -1 : 1) * 9 * k() * ease(b.look);
        });
        L.cairns.sy = 1 + 0.01 * Math.sin(t * 0.8) * ramp;
        L.landNode.y = scroll * 24;

        // The particles that belong to a layer follow it
        const sunDrift = stage.drift(L.sunNode.z), planetDrift = stage.drift(L.planetNode.z), farDrift = stage.drift(L.bitsNode.z);
        dust?.shift(0, sunDrift.x, sunDrift.y + L.sunNode.y);
        const planet = planetAt();
        dust?.turn(1, turn, planet.x, planet.y);
        dust?.shift(1, planetDrift.x, planetDrift.y + L.planetNode.y + L.planet.y);
        dust?.shift(2, farDrift.x, farDrift.y + L.bitsNode.y);
        stage.render(t);
        if (frames++ % 2 === 0) placeHits();
        // The name's font may arrive after the first layout
        if (frames % 90 === 0) placeVeil();
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
        stage.onResize((w, h) => place(w, h));
        const after = (node) => node.mesh.renderOrder + 0.5;
        // Dots of the sky, spread as the sky is (skyY), and dots of the sun or the planet, kept round its centre
        const fromSky = (list, colour, scale = 1) => list.map(([x, y, r, c]) => [sx(x), skyY(y), Math.max(1.2, 2 * r * k() * scale), c ?? colour]);
        const around = (list, [ax, ay], at, colour) => {
            const c = at();
            return list.map(([x, y, r]) => [c.x + (x - ax) * k(), c.y + (y - ay) * k(), Math.max(1.2, 2 * r * k()), colour]);
        };
        dust = startStardust(null, {
            stage,
            manual: true,
            groups: [
                // 0: the stippled edge of the sun, alive
                { colors: [SUN.color], parallax: 0, drift: 1.8, jitter: 0.4, twinkle: 0.25, reach: 0, look: 'hard', order: after(L.sun), points: () => around(SUN.dots, [SUN.x, SUN.y], sunAt, SUN.color) },
                // 1: the stipple of the planet's shading
                { colors: [art.planet.color], parallax: 0, drift: 0.8, jitter: 0.3, twinkle: 0.2, reach: 0, look: 'hard', order: after(L.planet), points: () => around(art.planet.dots, centreOf(B.planet), planetAt, art.planet.color) },
                // 2: the specks of the sky, pushed by a finger
                { colors: [SUN.color], parallax: 0, drift: 3, jitter: 0.2, twinkle: 0.5, reach: 70, push: 14, look: 'hard', order: after(L.bits[L.bits.length - 1]), points: () => fromSky(art.dots, SUN.color, 1.1) },
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
    <div class="scene" ref="root" @click="strum">
        <canvas class="stageCanvas" ref="canvas"></canvas>
        <div v-for="i in [0, 1]" :key="i" :ref="(el) => { hits[i] = el; }" class="hit" role="button" tabindex="0"
            :aria-label="$i18n.locale === 'en' ? (i ? 'The being on the right bank' : 'The being on the left bank') : (i ? 'El ser de la orilla derecha' : 'El ser de la orilla izquierda')"
            @click.stop="hop(i)" @keydown="onKey(i, $event)"></div>
    </div>
</template>

<style scoped>
    .scene {
        position: absolute;
        inset: 0;
        overflow: hidden;
        background: #efedc7;
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
        border-radius: 40%;
        cursor: pointer;
        pointer-events: auto;
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;
        outline: none;
    }

    .hit:focus-visible {
        outline: 2px solid rgba(20, 50, 70, 0.6);
        outline-offset: 2px;
    }
</style>
