<script setup>
    // Aceptación: "I accept and honour who I am". Two equal beings sit cross-legged on either bank of a river that runs
    // from the horizon down to the viewer, each under its own sky: on the left the cream of the past, with a pink sun,
    // on the right a yellow one, with a pink planet like a pot with three spouts. Between the two skies a wavy edge
    // with drops of one colour in the other; in the river, an island with two little cairns of stones.
    // Its verb is Fluir, with the engine shared by the cards of the verb (useFlow.js): a light is born at the horizon,
    // where the river begins and the two skies meet, and winds down the river from bank to bank to the island. A
    // finger sliding down the water with it draws it on, at its own pace (never faster: a finger far ahead has lost
    // it, and alone it does not move); beads of light run on ahead of it, the way it goes. The two little cairns on
    // the island are restless (they wobble, as if fighting to stay up): they are the knots. As the light comes to one
    // accompanied, its stones stop fighting and settle, still (they let go: "do not fight what you cannot control"),
    // and the light climbs it, crosses over to the other, which settles too, and goes down it. With both lit, the two
    // beings stretch up together and the rulito the card draws over each is born, the name lights up; then the light
    // fades from the river and, slowly, the cairns grow restless again. Besides, the scene lives: the
    // two beings breathe together, as one, blink now and then and glance at each other across the water; the
    // mushrooms and plants on each bank sway; the light of the water ripples down the river; the planet turns a
    // little as it floats and the small ringed planet and the two strokes of the sky drift; a tap on a being makes it
    // stretch up and blink and strums the card's chord, and a tap anywhere else strums it too and makes the specks of
    // the sky flare. On a tall screen what is in the sky is spread over all of it, under the card's name, and a soft
    // breath of the card's teal lies behind the name, which is as pale as the skies.
    // The skies are not pictures: the stage draws them as two liquids that never mix (field() in useLayerStage, as
    // Upekkha's), the edge being the card's wavy line read by the converter, with a long wave travelling down it and
    // the drops of the card as bubbles of one colour in the other that now and then float back to the edge, fall into
    // their own colour and bud off it again. The sun is all a stipple of live particles over a soft light, sampled from
    // the card (`sun.cloud`, scripts/sun-cloud.mjs, as Pañña's sun), with no disc under it so no circle's edge shows;
    // and so are the stipple of the planet's shading and the specks of the sky. The banks go on past the frame on wide
    // screens, flat in their colours (drawn in code) with the horizon's line.
    // It is drawn in WebGL (useLayerStage), from aceptacionScene.json and public/assets/aceptacion (made by
    // scripts/convert-aceptacion.mjs). The touch targets are DOM elements over the two beings.
    import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { createParallax } from '../../composables/useParallax.js';
    import { createLayerStage, FIELD_RANGE, FIELD_BUBBLES } from '../../composables/useLayerStage.js';
    import { startStardust } from '../../composables/useStardust.js';
    import { decodeCloud, sampleCloud, joinLight } from '../../composables/stippleCloud.js';
    import { play } from '../../composables/useSound.js';
    import { createFlow, routeThrough } from '../../composables/useFlow.js';
    import { sceneMilestone } from '../../analytics.js';
    import Rulito from '../Rulito.vue';
    import art from '../../composables/aceptacionScene.json';

    const props = defineProps({
        card: { type: Object, default: () => ({}) },
        active: Boolean
    });

    const root = ref(null);
    const canvas = ref(null);
    const hits = [];
    const headHit = ref(null);              // where the light's head is: Enter held on it goes with it
    const rulitos = [ref(null), ref(null)];
    let stageEl = null;                     // the card's stage, where the name is lit from (--name-glow)
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
        F = { x, y: h - size + (phone ? 0 : DROP * size), size };
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
    const SUN_CLOUD = decodeCloud(SUN.cloud);
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

    // ---- Fluir: the light's way, in art px. From the horizon, where the river begins between the two skies, it winds
    // from bank to bank (as far out as the river is wide there) down to the island, comes round it on the right, climbs
    // the right cairn, crosses over its top to the left one and goes down it. Waypoints joined by a Catmull-Rom curve,
    // sampled every STEP px (routeThrough); the cairns are its two knots
    const STEP = 8;
    const CAIRN_X = [1028, 1118];           // the middle of each little cairn (left, right), its foot and its top
    const CAIRN_FOOT = 1925, CAIRN_TOP = 1802;
    const WAY = [
        [1076, 1494], [1092, 1530], [1030, 1580], [1150, 1640], [978, 1702], [1168, 1764], [1206, 1840], [1166, 1910],
        [CAIRN_X[1], CAIRN_FOOT], [CAIRN_X[1] + 2, 1862], [CAIRN_X[1], CAIRN_TOP],         // up the right cairn (a knot)
        [1092, 1774], [1052, 1774], [CAIRN_X[0], CAIRN_TOP],                              // across, over the tops
        [CAIRN_X[0] - 2, 1862], [CAIRN_X[0], CAIRN_FOOT],                                // down the left one (a knot)
    ];
    const KNOTS = [[8, 10, 1], [13, 15, 0]];  // [first, last waypoint, which cairn] of each knot
    const ROUTE = (() => {
        const r = routeThrough(WAY, STEP);
        return { ...r, stops: KNOTS.map(([a, b, cairn]) => ({ enter: r.index(a), exit: r.index(b), cairn })) };
    })();
    const RX = (i) => ROUTE.xs[i], RY = (i) => ROUTE.ys[i];
    // How near the viewer a point of the river is (0 at the horizon, 1 at the foot of the card): the light is wider there
    const near = (y) => Math.min(1, Math.max(0, (y - 1490) / 670));
    const onCairn = (i) => ROUTE.stops.some((s) => i >= s.enter && i <= s.exit);
    // The two cairns: restless (unrest 1: they wobble, fighting to stay up) until the light comes to them accompanied;
    // then they settle (unrest down to 0, with a last little sway) and, once the light has gone through, they glow
    const CAIRNS = [0, 1].map(() => ({ unrest: 1, settling: false, lit: 0, glow: 0 }));
    const cur = { alpha: 1, light: 0 };     // how much the light's way shows, and how lit it is at the end
    let keyHold = false;
    const pointer = { u: 0, v: 0, at: -99, down: false, touch: false };
    let slid = false;                       // this press went with the light (so its click does not strum)
    let win = null;
    let wins = 0;
    const flow = createFlow({
        x: RX, y: RY, n: ROUTE.n,
        stops: ROUTE.stops,
        pace: 22,                           // a calm river: about 12 s from the horizon to the island, with a finger
        ahead: 40, behind: 10, lead: 5, press: 16, fill: 1.1,
        reach: 150, touchReach: 230,
        isOpen: (s) => CAIRNS[s.cairn].settling,
        release: (s) => { const c = CAIRNS[s.cairn]; if (c.settling) return; c.settling = true; play('release'); },
        ready: (s) => CAIRNS[s.cairn].unrest < 0.2,
        onPass: (s) => { CAIRNS[s.cairn].lit = 1; play('bloom'); },
        onEnd: () => finish(),
        onNote: (step, level) => play('flow', { step, level }),
        onFirst: () => sceneMilestone('current_accompanied'),
    });

    // ---- The banks past the frame, drawn in code: the bank's colour under the horizon's line, with the little marks
    // the card draws on the grass (dashes and ticks of the line's colour, and longer strokes a shade off the bank's),
    // smaller towards the horizon. Painted again when the screen changes size, always the same (a seeded random)
    const banks = [document.createElement('canvas'), document.createElement('canvas')];
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

    // ---- The light on the river, on a canvas over the water and the cairns (art box LIGHT_BOX): its way from the
    // horizon to its head as a soft glowing ribbon, wider where the river is nearer, with lights running down it; the
    // beads of light ahead of it, the way it goes; and its head, a bright core that beats while nobody is with it
    const LIGHT_BOX = [860, 1440, 440, 520];
    const lightCanvas = document.createElement('canvas');
    let runPhase = 0;
    const widthAt = (i) => (onCairn(i) ? 20 : 8 + 52 * near(RY(i)));
    const stroke = (ctx, a, b, k2) => {
        a = Math.max(0, Math.floor(a));
        b = Math.min(ROUTE.n - 1, Math.floor(b));
        for (let i = a; i < b; i += 4) {
            const j = Math.min(b, i + 5);
            ctx.beginPath();
            ctx.moveTo(RX(i), RY(i));
            for (let m = i + 1; m <= j; m++) ctx.lineTo(RX(m), RY(m));
            ctx.lineWidth = widthAt(Math.floor((i + j) / 2)) * k2;
            ctx.stroke();
        }
    };
    const drawLight = (t) => {
        const res = k() * Math.min(window.devicePixelRatio || 1, 1.5);
        const pw = Math.max(2, Math.round(LIGHT_BOX[2] * res)), ph = Math.max(2, Math.round(LIGHT_BOX[3] * res));
        if (lightCanvas.width !== pw || lightCanvas.height !== ph) { lightCanvas.width = pw; lightCanvas.height = ph; }
        const ctx = lightCanvas.getContext('2d');
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, pw, ph);
        ctx.setTransform(res, 0, 0, res, -LIGHT_BOX[0] * res, -LIGHT_BOX[1] * res);
        ctx.lineCap = ctx.lineJoin = 'round';
        const head = flow.head, lit = Math.max(flow.acc, cur.light);
        if (cur.alpha > 0.01 && head > 0.5) {
            ctx.strokeStyle = '#fff2a6';
            ctx.globalAlpha = cur.alpha * (0.22 + 0.18 * lit);
            stroke(ctx, 0, head, 2.2);
            ctx.strokeStyle = '#fffbe6';
            ctx.globalAlpha = cur.alpha * (0.45 + 0.3 * lit);
            stroke(ctx, 0, head, 0.7);
            // lights running down it, faster than its head
            ctx.strokeStyle = '#ffffff';
            ctx.globalAlpha = cur.alpha * (0.35 + 0.35 * lit);
            const GAP = 22;
            for (let p = runPhase % GAP; p < head; p += GAP) stroke(ctx, Math.max(0, p - 5), Math.min(head, p), 0.3);
        }
        if (cur.alpha > 0.01 && !win) {
            const call = flow.touched ? Math.min(1, Math.max(0, (flow.idle - 3) / 2)) : 1;
            const stop = flow.next();
            const limit = Math.min(ROUTE.n - 1, stop && head < stop.enter ? stop.enter : ROUTE.n - 1, head + 44);
            const show = cur.alpha * (0.45 + 0.3 * flow.acc + 0.25 * call) * (1 - 0.6 * flow.rush);
            const run = (t * (10 + 14 * flow.acc)) % 11;
            ctx.fillStyle = '#fffdf0';
            for (let p = head + 4 + run; p < limit; p += 11) {
                const i = Math.floor(p), fade = 1 - (p - head) / 44;
                ctx.globalAlpha = show * fade;
                ctx.beginPath();
                ctx.arc(RX(i), RY(i), (4 + 9 * near(RY(i))) * (0.6 + 0.5 * fade), 0, Math.PI * 2);
                ctx.fill();
            }
            const i = Math.min(ROUTE.n - 1, Math.floor(head));
            const beat = call * (0.5 + 0.5 * Math.sin(t * 3.2)) + flow.rush * (0.5 + 0.5 * Math.sin(t * 11));
            const r = (26 + 40 * near(RY(i))) * (1 + 0.5 * flow.acc + 0.35 * beat);
            const g = ctx.createRadialGradient(RX(i), RY(i), 0, RX(i), RY(i), r);
            g.addColorStop(0, 'rgba(255,255,255,1)');
            g.addColorStop(0.2, 'rgba(255,251,226,0.95)');
            g.addColorStop(0.5, 'rgba(255,240,160,0.45)');
            g.addColorStop(1, 'rgba(255,240,160,0)');
            ctx.globalAlpha = cur.alpha * (0.75 + 0.25 * Math.max(flow.acc, beat));
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(RX(i), RY(i), r, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        L.light?.refresh();
    };

    // ---- Both lit: the two beings stretch up together, the rulito over each is born, the name lights up; then the
    // light fades from the river and, slowly, the cairns grow restless again
    const DELAY = 0.5, GROW = 2.2, LINGER = 3.5, EAT = 3.4;
    const finish = () => {
        if (win) return;
        wins += 1;
        win = { age: 0, head: 0, tail: 0, full: false, fullAt: 0, back: false, pop: 0 };
        rulitos.forEach((r) => r.value?.reshape());
        play('converge');
        sceneMilestone('current_flowed', { times: wins });
    };
    const glyphs = [{ left: 0, top: 0, w: 1, h: 1 }, { left: 0, top: 0, w: 1, h: 1 }];
    const stepWin = (dt, t) => {
        let named = 0;
        if (win) {
            win.age += dt;
            win.pop = Math.max(0, win.pop - dt * 2.2);
            win.head = 1 - (1 - Math.min(1, Math.max(0, (win.age - DELAY) / GROW))) ** 1.6;
            if (win.head >= 1 && !win.full) {
                win.full = true; win.fullAt = win.age; win.pop = 1;
                play('rulito');
                BEINGS.forEach((b) => { b.hop = 1; b.shut = 1; });
            }
            if (win.full && !win.back && win.age - win.fullAt > LINGER) win.back = true;
            if (win.back) win.tail = Math.min(1, win.tail + dt / EAT);
            const whole = Math.min(1, Math.max(0, (win.head - win.tail - 0.6) / 0.4));
            named = Math.max(win.pop, 0.8 * ease(whole));
            const flare = win.full && win.head - win.tail > 0.9 ? Math.max(win.pop, Math.sin(t * 4) * 0.5 + 0.5) : 0;
            rulitos.forEach((r, i) => {
                r.value?.frame({ head: win.head, tail: win.tail, flare, t, fade: Math.min(1, (win.head - win.tail) * 14), width: glyphs[i].w });
                L.rulitos[i].refresh();
                L.rulitos[i].scale = 1 + 0.2 * win.pop * win.pop;
            });
            if (win.back) cur.alpha = Math.max(0, 1 - win.tail * 1.4);
            if (win.back && win.tail >= 1) {
                win = null;
                flow.reset();
                CAIRNS.forEach((c) => { c.settling = false; c.lit = 0; });
                rulitos.forEach((r, i) => { r.value?.frame({ width: glyphs[i].w }); L.rulitos[i].refresh(); });
            }
        }
        if (!win) cur.alpha = Math.min(1, cur.alpha + dt / 1.5);
        cur.light += ((win && !win.back ? 1 : 0) - cur.light) * Math.min(1, dt * 1.5);
        stageEl?.style.setProperty('--name-glow', named.toFixed(3));
        stage.bloom = named;
    };
    // The cairns: wobbling while restless, settling with a last little sway, glowing once the light went through
    const stepCairns = (dt, t, ramp) => {
        CAIRNS.forEach((c, i) => {
            c.unrest = c.settling ? Math.max(0, c.unrest - dt * 1.6) : Math.min(1, c.unrest + dt / 6);
            c.glow += ((c.lit || (win && !win.back) ? 1 : 0) - c.glow) * Math.min(1, dt * 2);
            const node = L.stacks[i];
            const shake = reduced ? 0 : c.unrest * (Math.sin(t * 1.7 + i * 2.1) * 3.2 + Math.sin(t * 4.3 + i) * 1.1);
            const sway = reduced || !c.settling ? 0 : Math.sin(t * 6) * 1.6 * c.unrest;
            node.rotate = (shake + sway) * ramp;
            node.x = (reduced ? 0 : c.unrest * Math.sin(t * 2.6 + i * 1.3) * 2.2 * k()) * ramp;
            node.sy = 1 + 0.01 * Math.sin(t * 0.8 + i) * ramp;
            node.uniforms.uBright.value = 1 + 0.25 * c.glow;
            L.stackGlows[i].opacity = c.glow * (0.8 + 0.2 * Math.sin(t * 2 + i));
        });
    };

    // ---- The finger, in art px of the land (which slides with the camera and the scroll): where the land's corners are
    // on screen now gives its offset and scale
    let landAt = { x: 0, y: 0, s: 1 };
    const measureLand = () => {
        const a = L.landNode.toScreen(sx(0), sy(0)), b = L.landNode.toScreen(sx(SIZE), sy(0));
        landAt = { x: a.x, y: a.y, s: (b.x - a.x) / SIZE || 1 };
    };
    const toArt = (event) => {
        const box = root.value.getBoundingClientRect();
        return [(event.clientX - box.left - landAt.x) / landAt.s, (event.clientY - box.top - landAt.y) / landAt.s];
    };
    const track = (event) => {
        if (!root.value) return;
        [pointer.u, pointer.v] = toArt(event);
        pointer.touch = event.pointerType === 'touch';
        pointer.down = pointer.touch ? event.type !== 'pointerup' && event.type !== 'pointercancel' : event.buttons > 0;
        pointer.at = lastT;
        if (event.type === 'pointerdown') slid = false;
    };
    // On a phone, a finger put down on the light or on the way ahead of it must not move the page; anywhere else it scrolls
    const onTouchStart = (event) => {
        const touch = event.touches[0];
        if (!touch || !event.cancelable || win || !root.value) return;
        const [u, v] = toArt(touch);
        if (flow.nearHead(u, v)) event.preventDefault();
    };
    const holdHead = (event) => { event.currentTarget.setPointerCapture?.(event.pointerId); track(event); };
    const onHeadKey = (down) => (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        keyHold = down;
    };
    const placeHead = () => {
        const el = headHit.value;
        if (!el) return;
        const i = Math.min(ROUTE.n - 1, Math.floor(flow.head));
        const size = Math.max(56, 2 * 120 * landAt.s);
        el.style.translate = `${(landAt.x + RX(i) * landAt.s - size / 2).toFixed(1)}px ${(landAt.y + RY(i) * landAt.s - size / 2).toFixed(1)}px`;
        el.style.width = el.style.height = `${size.toFixed(1)}px`;
        el.style.display = win ? 'none' : '';
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
        // The sun: a soft light round it (code) and, among the layers, the sun itself as particles
        const sun = s.depth(zFor(DEPTH.sun));
        L.sunNode = sun;
        L.sunGlow = sun.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: SUN.color, stops: [[0, 0.32], [0.3, 0.12], [0.65, 0]] });
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
        L.river = land.image('/assets/aceptacion/river.webp', { water: 1 });
        L.groundL = land.image('/assets/aceptacion/groundL.webp');
        L.groundR = land.image('/assets/aceptacion/groundR.webp');
        L.island = land.image('/assets/aceptacion/island.webp', { water: 0.35 });
        // the two cairns, each half of the picture, with a soft light behind each that comes on when the light has passed
        L.stackGlows = [0, 1].map(() => land.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: 0xfff1a8, stops: [[0, 0.55], [0.35, 0.22], [0.7, 0]] }));
        L.stacks = [0, 1].map((i) => land.image('/assets/aceptacion/cairns.webp', { crop: [i * 0.5, 0, 0.5, 1] }));
        L.light = land.canvas(lightCanvas, { bloom: true });
        L.plants = ['L', 'R'].map((side, i) => land.image(`/assets/aceptacion/plants${side}.webp`, { wind: { amp: 3.2, speed: 0.7 + 0.15 * i, root: 'bottom' } }));
        L.beings = BEINGS.map((b) => {
            const group = land.group();
            const being = { group, body: group.image('/assets/aceptacion/being.webp'), eyes: group.image('/assets/aceptacion/eyes.webp') };
            if (b.side === 'R') being.body.sx = being.eyes.sx = -1;
            return being;
        });
        L.rulitos = rulitos.map((r) => land.canvas(r.value.canvas, { bloom: true }));
        land.enter({ y: 40, delay: 100, duration: 1800 });
    };

    let area = { left: 0, top: 0, w: 1, h: 1 };
    const place = (w, h) => {
        layout(w, h);
        area = { left: -MARGIN, top: -MARGIN, w: w + 2 * MARGIN, h: h + 2 * MARGIN };
        writeField(area);
        L.sky.place(area);
        L.sky.refresh();
        L.sky.uniforms.uScale.value = k();
        placeVeil(h);

        const sr = SUN.r * k(), sun = sunAt();
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
        const [cx, cy, cw, ch] = B.cairns;
        [0, 1].forEach((i) => {
            const r = rectOf([cx + i * cw / 2, cy, cw / 2, ch]);
            L.stacks[i].place(r, { x: r.left + r.w / 2, y: r.top + r.h });
            const g = 2.4 * r.h;
            L.stackGlows[i].place({ left: r.left + r.w / 2 - g / 2, top: r.top + r.h * 0.5 - g / 2, w: g, h: g });
        });
        L.light.place(rectOf(LIGHT_BOX));
        // The rulito over each being, where the card draws it (its canvas is bigger than the glyph, for the glow)
        art.rulitos.forEach((box, i) => {
            const g = rectOf(box);
            glyphs[i] = g;
            L.rulitos[i].place({ left: g.left - 0.4375 * g.w, top: g.top - 0.1628 * g.h, w: g.w * 1.875, h: g.h * 1.3256 }, { x: g.left + g.w / 2, y: g.top + g.h });
            rulitos[i].value?.frame({ width: g.w });
            L.rulitos[i].refresh();
        });
        drawLight(lastT);
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
        if (slid) { slid = false; return; }
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
        const sunNow = sunAt();
        dust?.grow(0, 0.015 * breath * ramp, sunNow.x, sunNow.y);
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
        L.landNode.y = scroll * 24;
        // ---- Fluir: the light, the cairns and, at the end, the rulitos
        measureLand();
        if (!win) flow.step(dt, t, pointer, { key: keyHold });
        if (pointer.down && flow.acc > 0.3) slid = true;
        runPhase += dt * 22 * (1.4 + 1.2 * Math.max(flow.acc, cur.light));
        stepCairns(dt, t, ramp);
        stepWin(dt, t);
        if (frames % 2 === 0) drawLight(t);
        placeHead();

        // The particles that belong to a layer follow it
        const sunDrift = stage.drift(L.sunNode.z), planetDrift = stage.drift(L.planetNode.z), farDrift = stage.drift(L.bitsNode.z);
        const sunIn = joinLight(dust, 0, L.sunNode, null);      // the sun's stipple comes with its glow
        dust?.shift(0, sunDrift.x, sunDrift.y + L.sunNode.y + sunIn.y);
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
        stageEl = root.value.closest('.stage');
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
                // 0: the sun, all of it a stipple (as Pañña's), alive
                { colors: [SUN.color], parallax: 0, drift: 1.8, jitter: 0.6, twinkle: 0.15, reach: 0, look: 'hard', order: after(L.sunGlow) + 0.2, points: () => {
                    const c = sunAt();
                    return sampleCloud(SUN_CLOUD, (u, v) => [c.x + (u - SUN.x) * k(), c.y + (v - SUN.y) * k()], k(), 1.6).map(([x, y, size]) => [x, y, size, SUN.color]);
                } },
                // 1: the stipple of the planet's shading
                { colors: [art.planet.color], parallax: 0, drift: 0.8, jitter: 0.3, twinkle: 0.2, reach: 0, look: 'hard', order: after(L.planet), points: () => around(art.planet.dots, centreOf(B.planet), planetAt, art.planet.color) },
                // 2: the specks of the sky, pushed by a finger
                { colors: [SUN.color], parallax: 0, drift: 3, jitter: 0.2, twinkle: 0.5, reach: 70, push: 14, look: 'hard', order: after(L.bits[L.bits.length - 1]), points: () => fromSky(art.dots, SUN.color, 1.1) },
            ],
        });
        if (reduced) dust.reveal();
        ['pointerdown', 'pointermove', 'pointerup', 'pointercancel'].forEach((type) => root.value.addEventListener(type, track, { passive: true }));
        root.value.addEventListener('touchstart', onTouchStart, { passive: false });
        parallax = createParallax(root.value, frame);
        enter();
    };

    onMounted(begin);
    watch(() => props.active, enter);
    onBeforeUnmount(() => {
        gone = true;
        ['pointerdown', 'pointermove', 'pointerup', 'pointercancel'].forEach((type) => root.value?.removeEventListener(type, track));
        root.value?.removeEventListener('touchstart', onTouchStart);
        stageEl?.style.removeProperty('--name-glow');
        parallax?.destroy();
        dust?.destroy();
        stage?.destroy();
    });
</script>

<template>
    <div class="scene" ref="root" @click="strum">
        <canvas class="stageCanvas" ref="canvas"></canvas>
        <!-- The two rulitos are drawn on their own canvases, which the stage shows as textures over the beings -->
        <Rulito :ref="rulitos[0]" class="offstage" color="#b880a4" />
        <Rulito :ref="rulitos[1]" class="offstage" color="#b880a4" />
        <!-- The light's head: a finger slides from here down the river with it, or Enter held on it goes with it -->
        <div ref="headHit" class="hit head" role="button" tabindex="0"
            :aria-label="$i18n.locale === 'en' ? 'The light on the river: slide your finger down with it (or hold Enter)' : 'La luz del río: deslizá el dedo junto a ella río abajo (o mantené Enter)'"
            @pointerdown.prevent="holdHead" @click.stop @keydown="onHeadKey(true)($event)" @keyup="onHeadKey(false)($event)" @blur="keyHold = false"></div>
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

    /* The light's head: the finger slides from here with it, so the page must not scroll from here */
    .hit.head {
        border-radius: 50%;
        touch-action: none;
        cursor: grab;
    }

    .offstage {
        position: absolute;
        left: -9999px;
        top: 0;
        width: 40px;
        visibility: hidden;
    }

    .hit:focus-visible {
        outline: 2px solid rgba(20, 50, 70, 0.6);
        outline-offset: 2px;
    }
</style>
