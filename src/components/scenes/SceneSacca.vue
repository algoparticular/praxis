<script setup>
    // Sacca: truth, "I commit to my truth and open the door to my purpose". A boat sails a sky at dusk in front of a
    // great moon, over the dunes: Sid rests in it, glowing, and the lookout keeps watch from the cup at the top of the mast.
    // Its verb is Resonar as an echo (listen first, then answer): the lookout sings a short phrase with the four notes of
    // the card's chord, Sol7, and each note lights the clouds of its colour; the person repeats it by touching clouds of
    // those colours in the same order. Each colour is the note of its chakra: the light blue clouds are Sol (the
    // throat), the salmon ones Re (the sacral), the blue-green ones Fa (the heart: Sid's heart, the chord's seventh, and
    // he glows with it) and the palest ones, the lightest, Si (the crown). A wrong colour sounds muted, the lights go out
    // and the lookout sings it again, slower. Repeated whole, the four colours become one ("deep down the truth is only
    // one"): every cloud turns the cream of the moon, its light flies to the lookout and the rulito is born over him,
    // where the card draws it. A touch on the lookout asks him to sing again; left alone, he sings it again by himself.
    // How to play is shown without words: each note he sings flies from him to the clouds of its colour and lights them
    // as it arrives (he is the one singing, the clouds are what answers); four beads in the air under the boat light up, one
    // per note repeated; and on the person's turn, left alone a while, the clouds of the colour that comes next breathe (a
    // hint).
    // Before the first touch he sings with lights only, in silence, as every scene. Between songs he keeps watch, looking
    // to one side and the other, and just before singing he turns to the front and draws himself up; Sid breathes in the
    // boat, and fine sand blows off the dunes.
    // It is drawn in WebGL (useLayerStage): the clouds (each one cut out of the illustration, in one atlas, spread over the
    // whole sky and drifting past at the depth of their colour), the moon, the boat and the dunes are planes; Sid's body
    // and its glow are drawn in code (his shape, traced from his outline, filled on a canvas; a soft light and a stipple of
    // particles round it); the stipple of the moon and what flies are particles (useStardust), from saccaScene.json (made
    // by scripts/convert-sacca.mjs). The touch targets are DOM elements kept over the clouds, the lookout and Sid.
    import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { createParallax } from '../../composables/useParallax.js';
    import { createLayerStage } from '../../composables/useLayerStage.js';
    import { startStardust } from '../../composables/useStardust.js';
    import { createSparks } from '../../composables/useSparks.js';
    import { play } from '../../composables/useSound.js';
    import { sceneMilestone } from '../../analytics.js';
    import Rulito from '../Rulito.vue';
    import art from '../../composables/saccaScene.json';

    const props = defineProps({
        card: { type: Object, default: () => ({}) },
        active: Boolean
    });

    const root = ref(null);
    const canvas = ref(null);
    const rulito = ref(null);
    const cloudHits = ref([]);
    const keyHits = ref([]);
    const lookoutHit = ref(null);
    const sidHit = ref(null);
    let stageEl = null;
    let stage = null;
    let parallax = null;
    let dust = null;
    let entered = false;
    let gone = false;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ---- Layout: the illustration is a 2160 square, a frame resting on the bottom of the screen; on a phone upright as
    // big as the boat allows (its scrolls fit the width). The clouds are not held by the frame: they fill the whole sky
    const SIZE = art.size;
    let F = { x: 0, y: 0, size: 1 };
    let W = 1;
    const k = () => F.size / SIZE;
    const sx = (x) => F.x + x * k();
    const sy = (y) => F.y + y * k();
    const rectOf = ([left, top, w, h], dx = 0, dy = 0) => ({ left: sx(left + dx), top: sy(top + dy), w: w * k(), h: h * k() });
    const BOAT_SPAN = 1800;                 // art px the boat needs across, its scrolls included
    const layout = (w, h) => {
        W = w;
        const size = w < h ? Math.min(0.62 * h, w * SIZE / BOAT_SPAN) : Math.min(Math.max(w, 0.55 * h), 0.85 * h);
        F = { x: w / 2 - size / 2, y: h - size, size };
    };

    // The camera slides SLIDE px at the edge of a swipe; each layer moves as far as its depth (px)
    const SLIDE = 50;
    const SLIDE_Y = 30;
    const zFor = (amp) => amp / (SLIDE + amp);
    const DEPTH = { clouds: [10, 8, 6, 4], moon: 13, boat: 22, dunes: 30 };

    // ---- The four colours of the clouds (the layers 3 to 6 of the illustration) and the note of each: its place in
    // the chord climbing from the root (Sol, Si, Re, Fa), as `sing` and `resonate` count it
    const COLOURS = [
        { hex: 0xf7aea5, glow: 0xffb0a0, note: 2, speed: 9, es: 'Nubes salmón', en: 'Salmon clouds' },          // Re, sacral
        { hex: 0xfde2db, glow: 0xfff0e6, note: 1, speed: 7, es: 'Nubes rosa pálido', en: 'Pale pink clouds' },  // Si, crown
        { hex: 0xbfe5f0, glow: 0xc8f2ff, note: 0, speed: 5, es: 'Nubes celestes', en: 'Light blue clouds' },    // Sol, throat
        { hex: 0x2d7e91, glow: 0x5fc3d6, note: 3, speed: 3.5, es: 'Nubes verde azulado', en: 'Blue-green clouds' }, // Fa, heart
    ];
    const HEART = 3;                        // the colour of Fa: Sid's heart glows with it
    const step = (c) => COLOURS[c].note / 4;
    const CREAM = 0xfffbd6;                 // the moon: all the colours become this one
    // The moon is not a picture: a disc drawn in code (measured on the card: its solid middle) and its ragged rim as live
    // particles, made here, thinning outwards as the card stipples it
    const MOON = { x: 1082, y: 1073, r: 506, color: 0xfefbd6 };
    const MOON_RIM = (() => {
        const dots = [];
        for (let d = 0; d < 2600; d++) {
            const a = Math.random() * Math.PI * 2;
            const out = 62 * Math.random() ** 2.2;
            dots.push([MOON.x + Math.cos(a) * (MOON.r - 8 + out), MOON.y + Math.sin(a) * (MOON.r - 8 + out), 4 + Math.random() * 4.5 * (1 - out / 80), MOON.color]);
        }
        return dots;
    })();
    const rgb = (c) => [((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255];

    // Every cloud: its colour, where it is drawn (art px) and its part of the atlas; where it rests on screen is worked
    // out in place(), as it drifts it wraps round the sky
    const [AW, AH] = art.atlas;
    const clouds = art.clouds.map(([c, x, y, w, h, ax, ay], i) => ({
        c, i, art: { x: x + w / 2, y: y + h / 2, w, h }, crop: [ax / AW, ay / AH, w / AW, h / AH],
        rest: { left: 0, top: 0, w: 1, h: 1 }, x0: 0, phase: Math.random() * 6.28, ring: 0, hidden: false,
    }));
    const CLOUD_Y = [120, 1840];            // the band of art y the clouds are spread from, top to bottom of the sky
    let span = { left: 0, width: 1 };

    // ---- Sid's body, drawn in code: the inside of his outline, a polygon traced from the illustration (art px)
    const SID = art.sid;
    const SID_BOX = (() => {
        const xs = SID.map((p) => p[0]), ys = SID.map((p) => p[1]);
        const x0 = Math.min(...xs), y0 = Math.min(...ys);
        return [x0, y0, Math.max(...xs) - x0, Math.max(...ys) - y0];
    })();
    const SID_FILL = '#fef3b3';
    const inside = (x, y) => {
        let yes = false;
        for (let i = 0, j = SID.length - 1; i < SID.length; j = i++) {
            const [xi, yi] = SID[i], [xj, yj] = SID[j];
            if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) yes = !yes;
        }
        return yes;
    };
    // His glow: a stipple round his shape, denser near him and thinning outwards, longer towards his legs (as the card
    // draws it), every dot made here
    const SID_DOTS = (() => {
        const dots = [];
        const [, top, , tall] = SID_BOX;
        const n = SID.length;
        for (let d = 0; d < 520; d++) {
            const j = Math.floor(Math.random() * n);
            const [x, y] = SID[j];
            const [ax, ay] = SID[(j + n - 2) % n], [bx, by] = SID[(j + 2) % n];
            let nx = by - ay, ny = -(bx - ax);
            const len = Math.hypot(nx, ny) || 1;
            nx /= len; ny /= len;
            if (inside(x + nx * 6, y + ny * 6)) { nx = -nx; ny = -ny; }
            const lower = Math.min(1, Math.max(0, (y - top) / tall));
            const out = 4 + -Math.log(1 - Math.random() * 0.98) * (16 + 30 * lower * lower);
            dots.push([x + nx * out + (Math.random() - 0.5) * 8, y + ny * out + (Math.random() - 0.5) * 8,
                1.6 + Math.random() * 2.6, [0xfef3b3, 0xfffbd6, 0xf9e48e][d % 3]]);
        }
        return dots;
    })();
    // He breathes from where he lies: his body and his lines scale about the bottom of his shape
    const sidPivot = () => { const r = rectOf(SID_BOX); return { x: r.left + r.w / 2, y: r.top + r.h }; };
    const sidCanvas = document.createElement('canvas');
    const drawSid = () => {
        const dpr = stage?.dpr ?? 1;
        const r = rectOf(SID_BOX);
        const pad = 2;
        sidCanvas.width = Math.max(2, Math.ceil((r.w + 2 * pad) * dpr));
        sidCanvas.height = Math.max(2, Math.ceil((r.h + 2 * pad) * dpr));
        const ctx = sidCanvas.getContext('2d');
        ctx.clearRect(0, 0, sidCanvas.width, sidCanvas.height);
        const s = k() * dpr;
        ctx.beginPath();
        SID.forEach(([x, y], i) => {
            const px = (x - SID_BOX[0]) * s + pad * dpr, py = (y - SID_BOX[1]) * s + pad * dpr;
            if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
        });
        ctx.closePath();
        ctx.fillStyle = SID_FILL;
        ctx.fill();
        L.sidFill.place({ left: r.left - pad, top: r.top - pad, w: r.w + 2 * pad, h: r.h + 2 * pad }, sidPivot());
        L.sidFill.refresh();
    };

    // ---- The game: the lookout sings a phrase of the four colours; it is repeated by touching them in that order
    const GAP = 0.85;                       // s between the sung notes
    const SLOWER = 1.25, GAP_MAX = 1.5;     // each time it has to be sung again after a mistake
    const HINT = 3.5;                       // s alone on the person's turn before the clouds of the next colour breathe
    const AGAIN = 7;                        // s alone before he sings it again
    const FIRST = 3.2;                      // s after the scene starts, the first time he sings
    const FLIGHT = 0.55;                    // s a sung note takes to fly from him to the clouds of its colour
    const PREP = 0.8;                       // s he gets ready before he sings (he turns to the front and draws himself up)
    const shuffled = (last) => {
        let p;
        do {
            p = [0, 1, 2, 3];
            for (let i = p.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
        } while (last && p.join() === last.join());
        return p;
    };
    let phrase = shuffled();
    let mode = 'sing';                      // 'sing': his turn (or about to be); 'answer': the person's; 'win'
    let singAt = FIRST;                     // when he sings next (scene time), or null
    let singing = null;                     // { at, played }: the phrase being sung
    let gap = GAP;
    let got = 0;                            // notes repeated right so far
    let sung = 0;                           // times this phrase was sung before it was repeated
    let heard = false;                      // someone touched the scene: from then on he sings aloud
    let answerSince = 0;
    let lastT = 0;
    let lastTouch = -Infinity;
    let lastHint = -1;                      // the colour last breathing, kept while its breath fades out
    const shine = COLOURS.map(() => 0);     // a colour being sung (or answered), 1 on the note, fading
    const arrive = COLOURS.map(() => null); // when the note sung of a colour reaches its clouds (scene time)
    let next = 0;                           // how much the clouds of the colour that comes next breathe (the hint)
    let beads = 0;                          // how much the four beads over the lookout show
    const on = COLOURS.map(() => false);    // a colour already repeated right
    const lit = COLOURS.map(() => 0);       // how lit each colour looks (eases towards `on`)
    let voice = 0;                          // the lookout singing a note
    let gaze = 0;                           // where the lookout looks while he keeps watch (-1 left .. 1 right)
    // Keeping watch: a few seconds to each side, with a look to the front in between
    const WATCH = [0, -1, -1, 0, 1, 1, 0, 0.4, -0.6];
    const watchAt = (t) => WATCH[Math.floor(Math.max(0, t) / 1.6) % WATCH.length];
    let voiceColour = COLOURS[0].glow;
    let heart = 0;                          // Sid's heart, on Fa
    let one = 0;                            // the colours becoming one (the cream of the moon)
    let wins = 0;
    let win = null;
    let glyph = { left: 0, top: 0, w: 1, h: 1 };
    const DELAY = 1.1, GROW = 2.2, KEEP = 2.8, EAT = 3.4;    // the rulito: born after the light gathers, kept, gone

    // ---- What flies (the notes in the air, the light going to the lookout): slots of a dynamic group, in screen px
    const FLYERS = 260;
    const fly = Array.from({ length: FLYERS }, () => ({ on: false }));
    let flyNext = 0;
    const send = (from, to, { at = lastT, dur = 1.2, size = 6, c0 = CREAM, c1 = null, arc = 0.3 } = {}) => {
        if (reduced) return;
        const f = fly[flyNext];
        flyNext = (flyNext + 1) % FLYERS;
        const d = Math.hypot(to.x - from.x, to.y - from.y);
        Object.assign(f, {
            on: true, at, dur, size, x0: from.x, y0: from.y, x1: to.x, y1: to.y,
            cx: (from.x + to.x) / 2 + (Math.random() - 0.5) * d * 0.4, cy: (from.y + to.y) / 2 - d * arc * (0.5 + Math.random() * 0.5),
            c0: rgb(c0), c1: rgb(c1 ?? c0),
        });
    };
    const ease = (p) => p * p * (3 - 2 * p);
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
                data.positions[i * 3] = a * a * f.x0 + 2 * a * e * f.cx + e * e * f.x1;
                data.positions[i * 3 + 1] = a * a * f.y0 + 2 * a * e * f.cy + e * e * f.y1;
                data.sizes[i] = f.size;
                data.alphas[i] = Math.min(1, p * 8) * Math.min(1, (1 - p) * 4);
                for (let c = 0; c < 3; c++) data.tints[i * 3 + c] = f.c0[c] + (f.c1[c] - f.c0[c]) * e;
            }
        },
    };
    const sparks = createSparks(260);

    // ---- Four beads in the air under the boat, between its hull and the dunes, one per note of the phrase: lit in its
    // colour as it is repeated right
    const BEADS_AT = [1147, 1812];           // art px: under the middle of the hull, above the dunes
    const beadAt = (j) => {
        const gap = Math.max(22, 95 * k());
        const p = L.boat.toScreen(sx(BEADS_AT[0]), sy(BEADS_AT[1]));
        // they hang with the boat but do not rock with it: a small arc, the outer ones a little higher
        return { x: p.x + (j - 1.5) * gap, y: p.y - Math.abs(j - 1.5) * gap * 0.12 };
    };
    // Each is a navy ring (so it reads on any sky) round a dot: cream while waiting, the note's colour once repeated
    const NAVY = rgb(0x143246);
    const beadGroup = {
        count: 8,
        update(t, data) {
            const size = 0.8 + 0.2 * Math.min(1, F.size / 600);
            for (let j = 0; j < 4; j++) {
                const ring = j, dot = j + 4;
                if (beads < 0.01 || !L.boat) {
                    data.alphas[ring] = data.alphas[dot] = 0;
                    data.sizes[ring] = data.sizes[dot] = 0;
                    continue;
                }
                const p = beadAt(j);
                const done = j < got;
                const fill = done ? rgb(COLOURS[phrase[j]].hex) : rgb(CREAM);
                [ring, dot].forEach((i) => { data.positions[i * 3] = p.x; data.positions[i * 3 + 1] = p.y; });
                data.sizes[ring] = (done ? 15 : 12) * size;
                data.sizes[dot] = (done ? 12 : 7) * size;
                data.alphas[ring] = beads * (done ? 0.9 : 0.6);
                data.alphas[dot] = beads;
                for (let c = 0; c < 3; c++) { data.tints[ring * 3 + c] = NAVY[c]; data.tints[dot * 3 + c] = fill[c]; }
            }
        },
    };
    // ---- Sand blown off the dunes: fine grains that rise from the crests and drift to the left with the clouds, in gusts
    const SAND = 46;
    const sand = Array.from({ length: SAND }, () => ({ at: -Infinity, life: 1 }));
    const SAND_COLOURS = [0xfffbe8, 0xfff0dc, 0xfde6cf].map(rgb);
    let dunesOff = { x: 0, y: 0 };
    const sandGroup = {
        count: SAND,
        update(t, data) {
            const top = rectOf(art.boxes.mountains).top;
            const gust = 0.5 + 0.5 * Math.sin(t * 0.23) * Math.sin(t * 0.11 + 2);
            for (let i = 0; i < SAND; i++) {
                const g = sand[i];
                let p = (t - g.at) / g.life;
                if (p >= 1 || p < 0) {
                    // a new grain now and then, more often in a gust
                    if (reduced || !L.dunesNode || Math.random() > 0.02 + 0.08 * gust) { data.alphas[i] = 0; data.sizes[i] = 0; continue; }
                    Object.assign(g, {
                        at: t, life: 2.2 + Math.random() * 2.4, x: Math.random() * (W + 80), y: top + (0.06 + Math.random() * 0.35) * (F.size * 0.14),
                        vx: -(18 + Math.random() * 30) * (0.7 + 0.6 * gust), vy: -(3 + Math.random() * 7), size: 1.8 + Math.random() * 2,
                        c: SAND_COLOURS[i % SAND_COLOURS.length], wob: Math.random() * 6.28,
                    });
                    p = 0;
                }
                const age = p * g.life;
                data.positions[i * 3] = g.x + g.vx * age + dunesOff.x;
                data.positions[i * 3 + 1] = g.y + g.vy * age + Math.sin(age * 3 + g.wob) * 2 + dunesOff.y;
                data.sizes[i] = g.size;
                data.alphas[i] = 0.9 * Math.min(1, p * 5) * Math.min(1, (1 - p) * 2.5);
                for (let c = 0; c < 3; c++) data.tints[i * 3 + c] = g.c[c];
            }
        },
    };

    const L = {};

    // Where things are on screen now
    const cloudCentre = (cl) => {
        const b = L.clouds[cl.i].boxOnScreen(cl.rest);
        return { x: b.left + b.width / 2, y: b.top + b.height / 2, w: b.width };
    };
    const lookoutTop = () => {
        const r = rectOf(art.boxes.lookout);
        return L.boat.toScreen(r.left + r.w / 2, r.top + r.h * 0.3);
    };
    const rulitoAt = () => L.boat.toScreen(glyph.left + glyph.w / 2, glyph.top + glyph.h * 0.5);

    // ---- Singing: one note after another; each lights its clouds and the lookout sings it
    const singNow = () => {
        singAt = null;
        mode = 'sing';
        got = 0;
        on.fill(false);
        arrive.fill(null);
        sung += 1;
        singing = { at: lastT, played: 0 };
    };
    const singNote = (c) => {
        voice = 1;
        voiceColour = COLOURS[c].glow;
        if (c === HEART) { heart = 1; dust?.boost(1, 0.5); }
        if (heard) play('sing', { step: step(c), length: gap * 0.8 });
        // The note flies from him to every cloud of its colour in sight, and lights them as it arrives
        if (reduced) { shine[c] = 1; return; }
        arrive[c] = lastT + FLIGHT + 0.1;
        const from = lookoutTop();
        clouds.forEach((cl) => {
            if (cl.c !== c || cl.hidden) return;
            const p = cloudCentre(cl);
            if (p.x < 0 || p.x > W) return;
            // a head and a short tail, so it reads as a light that travels
            for (let j = 0; j < 3; j++) send(from, p, { dur: FLIGHT, size: 12 - 3 * j, c0: CREAM, c1: COLOURS[c].glow, at: lastT + j * 0.05, arc: 0.12 });
        });
    };

    // A finger on the box of a cloud may also be on the box of another (they are at least 44px and drift past each other):
    // of the clouds whose box it is on, the one whose middle is nearest for its size (a box's corners are empty sky);
    // on none, the one whose middle is nearest
    const pick = (event, i) => {
        const box = root.value.getBoundingClientRect();
        const px = event.clientX - box.left, py = event.clientY - box.top;
        let best = null, bestD = Infinity;
        clouds.forEach((cl) => {
            if (cl.hidden) return;
            const b = L.clouds[cl.i].boxOnScreen(cl.rest);
            const inBox = px >= b.left && px <= b.left + b.width && py >= b.top && py <= b.top + b.height;
            const dx = px - b.left - b.width / 2, dy = py - b.top - b.height / 2;
            const d = inBox ? -10 + Math.hypot(dx / b.width, dy / b.height) : Math.hypot(dx, dy);
            if (d < bestD) { bestD = d; best = cl; }
        });
        touchCloud(best ? best.i : i);
    };

    // ---- Touching a cloud: its colour is the note
    const touchCloud = (i) => {
        const cl = clouds[i];
        const c = cl.c;
        lastTouch = lastT;
        cl.ring = 1;
        if (reduced || mode === 'win') { play('tap'); return; }
        if (mode === 'sing') {
            // His turn: listen. Before he has sung at all, a touch asks him to sing (aloud from now on)
            if (!heard && sung === 0) { heard = true; play('resonate', { step: step(c) }); shine[c] = 0.7; singAt = Math.min(singAt ?? Infinity, lastT + 0.9); }
            return;
        }
        heard = true;
        const p = cloudCentre(cl);
        if (c === phrase[got]) {
            play('resonate', { step: step(c) });
            shine[c] = 1;
            on[c] = true;
            got += 1;
            if (c === HEART) { heart = 1; dust?.boost(1, 0.5); }
            if (!reduced) sparks.burst(p.x, p.y, { n: 14, colors: [COLOURS[c].hex, COLOURS[c].glow, CREAM], speed: 90, size: 4.4, spread: p.w * 0.25, life: 1.6 });
            // Its light goes back to the lookout
            const to = lookoutTop();
            for (let j = 0; j < 4; j++) send(p, to, { dur: 0.9 + Math.random() * 0.4, size: 7, c0: COLOURS[c].glow, c1: CREAM, at: lastT + j * 0.05 });
            if (got === phrase.length) {
                mode = 'win';
                setTimeout(() => { if (!gone) complete(); }, 450);
            }
            return;
        }
        // Not that one: a muted drop, the lights go out, and he sings it again, slower
        play('miss');
        if (!reduced) sparks.burst(p.x, p.y, { n: 5, colors: [COLOURS[c].hex], speed: 50, size: 3.6, spread: p.w * 0.2, life: 1 });
        on.fill(false);
        got = 0;
        gap = Math.min(GAP_MAX, gap * SLOWER);
        mode = 'sing';
        singAt = lastT + 1.3;
    };
    // The lookout: a touch asks him to sing it again
    const touchLookout = () => {
        lastTouch = lastT;
        voice = Math.max(voice, 0.6);
        if (reduced || mode === 'win' || singing) { play('tap'); return; }
        heard = true;
        singAt = lastT + 0.25;
        mode = 'sing';
    };
    const touchSid = () => {
        lastTouch = lastT;
        heart = Math.max(heart, 0.7);
        dust?.boost(1, 0.4);
        play('tap');
    };
    const onKey = (event, action) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        action();
    };
    // With the keyboard, each colour is one button: the biggest cloud of that colour in sight
    const keyCloud = (c) => {
        let best = null;
        clouds.forEach((cl) => { if (cl.c === c && !cl.hidden && (!best || cl.art.w > best.art.w)) best = cl; });
        return best ?? clouds.find((cl) => cl.c === c);
    };

    // Repeated whole: the colours become one, their light gathers over the lookout and the rulito is born there. The card's
    // G7 resolves to C major as the light gathers (a dominant seventh asks for the chord a fifth below: the root, Sporá; the
    // truth that is followed takes root), and then the rulito climbs in G7 an octave up
    const complete = () => {
        wins += 1;
        win = { age: 0, head: 0, tail: 0, full: false, fullAt: 0, back: false, pop: 0 };
        rulito.value?.reshape();
        play('resolve');
        sceneMilestone('echo_sung', { times: wins, tries: sung });
        const to = rulitoAt();
        clouds.forEach((cl) => {
            if (cl.hidden) return;
            const p = cloudCentre(cl);
            if (p.x < -40 || p.x > W + 40) return;
            send(p, to, { dur: 1 + Math.random() * 0.7, size: 8, c0: COLOURS[cl.c].glow, c1: CREAM, at: lastT + 0.3 + Math.random() * 0.5, arc: 0.2 });
        });
    };

    const build = (s) => {
        // The clouds, the far colours first, each with a light behind it for when it sings
        L.clouds = [];
        L.cloudGlows = [];
        [3, 2, 1, 0].forEach((c) => {
            const node = s.depth(zFor(DEPTH.clouds[c]));
            L[`sky${c}`] = node;
            clouds.filter((cl) => cl.c === c).forEach((cl) => {
                const glow = node.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: COLOURS[c].glow, stops: [[0, 0.7], [0.35, 0.32], [0.7, 0]], bloom: true });
                glow.opacity = 0;
                L.cloudGlows[cl.i] = glow;
                L.clouds[cl.i] = node.image('/assets/sacca/clouds.webp', { crop: cl.crop });
            });
            node.enter({ y: -20 - 10 * c, delay: 150 + 120 * (3 - c), duration: 2000 });
        });
        const moon = s.depth(zFor(DEPTH.moon));
        L.moonNode = moon;
        // (not in the bloom: so big and so light, it would wash out the lookout and the rulito in front of it)
        L.moonGlow = moon.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: CREAM, stops: [[0, 0.5], [0.32, 0.22], [0.62, 0]] });
        L.moon = moon.disc({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: MOON.color });
        moon.enter({ y: 30, delay: 200, duration: 2200 });
        // The boat and what it carries rock together
        const boat = s.depth(zFor(DEPTH.boat));
        L.boatNode = boat;
        L.boat = boat.group();
        L.hull = L.boat.image('/assets/sacca/hull.webp');
        L.line = L.boat.image('/assets/sacca/line.webp');
        L.sidGlow = L.boat.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: 0xfff1a8, stops: [[0, 0.55], [0.35, 0.24], [0.7, 0]], bloom: true });
        L.sidFill = L.boat.canvas(sidCanvas);
        L.sid = L.boat.image('/assets/sacca/sid.webp');
        L.voice = L.boat.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: 0xffffff, stops: [[0, 0.6], [0.3, 0.28], [0.66, 0]], bloom: true });
        L.voice.opacity = 0;
        L.mast = L.boat.image('/assets/sacca/mast.webp');
        L.lookout = L.boat.image('/assets/sacca/lookout.webp');
        L.rulito = L.boat.canvas(rulito.value.canvas, { bloom: true });
        boat.enter({ y: 70, delay: 350, duration: 1900 });
        // The dunes reach both sides of the screen: the picture with a mirrored copy on each side
        const dunes = s.depth(zFor(DEPTH.dunes));
        L.dunesNode = dunes;
        L.dunes = [-1, 0, 1].map((side) => {
            const node = dunes.image('/assets/sacca/mountains.webp');
            if (side) node.sx = -1;
            return { node, side };
        });
        L.mark = dunes.image('/assets/sacca/mark.webp');
        dunes.enter({ y: 50, delay: 100, duration: 1600 });
    };

    const place = (w, h) => {
        layout(w, h);
        const B = art.boxes;
        const phone = w < h;
        // The sky behind, from the card: periwinkle above, lavender and the peach of the dunes as it goes down
        const at = (y) => `${Math.max(0, Math.min(100, sy(y) / h * 100)).toFixed(1)}%`;
        root.value.style.background = `linear-gradient(to bottom, #8fa2e0 0%, #99abe5 ${at(300)}, #a7b4e6 ${at(1200)}, #e1d3e1 ${at(1500)}, #fce4da ${at(1800)}, #fce4da 100%)`;

        // The clouds spread over the whole sky, a little bigger on a phone (they are touched)
        const scale = k() * (phone ? 1.3 : 1);
        const wide = Math.max(w, F.size);
        const top = 0.04 * h, bottom = sy(CLOUD_Y[1]);
        let widest = 0;
        clouds.forEach((cl) => {
            const cw = cl.art.w * scale, ch = cl.art.h * scale;
            const x = w / 2 + (cl.art.x - 1080) / SIZE * wide;
            const y = top + (cl.art.y - CLOUD_Y[0]) / (CLOUD_Y[1] - CLOUD_Y[0]) * (bottom - top);
            cl.x0 = x;
            cl.rest = { left: x - cw / 2, top: y - ch / 2, w: cw, h: ch };
            widest = Math.max(widest, cw);
            L.clouds[cl.i].place(cl.rest);
            L.cloudGlows[cl.i].place({ left: x - cw * 0.8, top: y - ch * 1.25, w: cw * 1.6, h: ch * 2.5 });
        });
        span = { left: -SLIDE * 2 - widest / 2, width: w + SLIDE * 4 + widest };

        const moon = rectOf(B.moon);
        const mr = MOON.r * k();
        L.moon.place({ left: sx(MOON.x) - mr, top: sy(MOON.y) - mr, w: 2 * mr, h: 2 * mr });
        const md = moon.w * 1.5;
        L.moonGlow.place({ left: moon.left + moon.w / 2 - md / 2, top: moon.top + moon.h / 2 - md / 2, w: md, h: md });

        L.hull.place(rectOf(B.hull));
        L.line.place(rectOf(B.line));
        const line = rectOf(B.line);
        L.boat.pivot = { x: line.left + line.w / 2, y: line.top + line.h * 0.75 };
        drawSid();
        const body = rectOf(SID_BOX);
        const gd = Math.max(body.w, body.h) * 2;
        L.sidGlow.place({ left: body.left + body.w / 2 - gd / 2, top: body.top + body.h * 0.55 - gd / 2, w: gd, h: gd });
        L.sid.place(rectOf(B.sid), sidPivot());
        L.mast.place(rectOf(B.mast));
        const look = rectOf(B.lookout);
        // He sings from the cup: he stretches up from its rim
        L.lookout.place(look, { x: look.left + look.w / 2, y: look.top + look.h });
        const vd = look.w * 2.6;
        L.voice.place({ left: look.left + look.w / 2 - vd / 2, top: look.top + look.h * 0.45 - vd / 2, w: vd, h: vd });
        // The rulito where the card draws it (its canvas is bigger than the glyph, for the glow)
        const r = rectOf(art.rulito);
        const rh = r.h, rw = rh * 32 / 86;
        glyph = { left: r.left + r.w / 2 - rw / 2, top: r.top, w: rw, h: rh };
        L.rulito.place({ left: glyph.left - 0.4375 * glyph.w, top: glyph.top - 0.1628 * glyph.h, w: glyph.w * 1.875, h: glyph.h * 1.3256 },
            { x: glyph.left + glyph.w / 2, y: glyph.top + glyph.h });

        const dunes = rectOf(B.mountains);
        L.dunes.forEach(({ node, side }) => node.place({ ...dunes, left: dunes.left + side * dunes.w }));
        L.mark.place(rectOf(B.mark));
    };

    // The touch targets: a box round each cloud (at least 44px; not the ones behind the moon), the lookout and Sid
    const placeHits = () => {
        if (!L.moon) return;
        const moon = L.moonNode.boxOnScreen(rectOf(art.boxes.moon));
        const mx = moon.left + moon.width / 2, my = moon.top + moon.height / 2, mr = moon.width * 0.42;
        const put = (el, b, min = 44) => {
            const bw = Math.max(min, b.width), bh = Math.max(min, b.height);
            el.style.translate = `${(b.left + b.width / 2 - bw / 2).toFixed(1)}px ${(b.top + b.height / 2 - bh / 2).toFixed(1)}px`;
            el.style.width = `${bw.toFixed(1)}px`;
            el.style.height = `${bh.toFixed(1)}px`;
        };
        clouds.forEach((cl, i) => {
            const el = cloudHits.value[i];
            if (!el) return;
            const b = L.clouds[i].boxOnScreen(cl.rest);
            const cx = b.left + b.width / 2, cy = b.top + b.height / 2;
            cl.hidden = Math.hypot(cx - mx, cy - my) < mr || cx < -b.width / 2 || cx > W + b.width / 2;
            el.style.display = cl.hidden ? 'none' : '';
            if (!cl.hidden) put(el, b);
        });
        keyHits.value.forEach((el, c) => {
            const cl = el && keyCloud(c);
            if (cl) put(el, L.clouds[cl.i].boxOnScreen(cl.rest));
        });
        if (lookoutHit.value) put(lookoutHit.value, L.boat.boxOnScreen(rectOf(art.boxes.lookout)), 48);
        if (sidHit.value) put(sidHit.value, L.boat.boxOnScreen(rectOf(SID_BOX)));
    };

    const enter = () => {
        if (entered || !props.active || !stage) return;
        entered = true;
        stage.ready().then(() => { if (!gone) { stage.start(); dust?.reveal(); } });
    };

    let frames = 0;
    const frame = ({ x, y, scroll, t, ramp }) => {
        if (!stage || !L.boat) return;
        const dt = Math.min(0.1, Math.max(0, t - lastT));
        lastT = t;
        stage.look(x * SLIDE, y * SLIDE_Y);

        // ---- His turn: sing the phrase, one note after another
        if (singAt !== null && t >= singAt && ramp > 0.9 && !win) singNow();
        if (singing) {
            while (singing.played < phrase.length && t >= singing.at + singing.played * gap) singNote(phrase[singing.played++]);
            if (singing.played >= phrase.length && t >= singing.at + (phrase.length - 0.4) * gap + 0.3 + FLIGHT) {
                singing = null;
                mode = 'answer';
                answerSince = t;
            }
        }
        // Left alone, he sings it again (half repeated, it starts again)
        if (mode === 'answer' && t - Math.max(lastTouch, answerSince) > AGAIN) { singAt = t + PREP; mode = 'sing'; }

        // ---- The win: the colours become one, the rulito is born over him, kept, gone; then another phrase
        let named = 0;
        if (win && rulito.value) {
            win.age += dt;
            win.pop = Math.max(0, win.pop - dt * 2.2);
            win.head = 1 - (1 - Math.min(1, Math.max(0, (win.age - DELAY) / GROW))) ** 1.6;
            if (win.head >= 1 && !win.full) { win.full = true; win.fullAt = win.age; win.pop = 1; play('rulito'); heart = 1; dust?.boost(1, 0.8); }
            if (win.full && !win.back && win.age - win.fullAt > KEEP) { win.back = true; on.fill(false); }
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
                phrase = shuffled(phrase);
                gap = GAP;
                sung = 0;
                mode = 'sing';
                singAt = t + 1.6;
            }
        }
        const oneGoal = win && !win.back ? 1 : 0;
        one += (oneGoal - one) * Math.min(1, dt * (oneGoal ? 1.6 : 0.8));
        stageEl?.style.setProperty('--name-glow', named.toFixed(3));
        stage.bloom = Math.max(named, 0.25 * one);

        // ---- The clouds drift past, each colour at its own pace, and light up when sung or answered
        // On the person's turn, left alone HINT s, the clouds of the colour that comes next breathe; the beads show from the
        // first phrase on
        const still = mode === 'answer' ? t - Math.max(lastTouch, answerSince) : 0;
        const hintC = !reduced && mode === 'answer' && !singing && still > HINT ? phrase[got] : -1;
        next += ((hintC >= 0 ? 1 : 0) - next) * Math.min(1, dt * 3);
        const breathe = next * (0.5 + 0.5 * Math.sin((still - HINT) * 3.4 - Math.PI / 2));
        beads += ((sung > 0 && !win && !reduced ? 1 : 0) - beads) * Math.min(1, dt * 2);
        let hinted = hintC;
        if (hintC < 0 && next > 0.01) hinted = lastHint;
        lastHint = hinted;
        COLOURS.forEach((_, c) => {
            if (arrive[c] !== null && t >= arrive[c]) { shine[c] = 1; arrive[c] = null; }
            shine[c] = Math.max(0, shine[c] - dt / (gap * 0.95));
            lit[c] += ((on[c] ? 1 : 0) - lit[c]) * Math.min(1, dt * (on[c] ? 6 : 1.2));
        });
        clouds.forEach((cl) => {
            const node = L.clouds[cl.i];
            const glow = L.cloudGlows[cl.i];
            const sh = ease(shine[cl.c]);
            const l = lit[cl.c];
            const b = cl.c === hinted ? breathe : 0;
            cl.ring = Math.max(0, cl.ring - dt * 2.6);
            const moved = cl.x0 - COLOURS[cl.c].speed * t;
            const wrapped = span.left + ((((moved - span.left) % span.width) + span.width) % span.width);
            node.x = wrapped - cl.x0;
            node.y = Math.sin(t * 0.35 + cl.phase) * 4 * ramp - 7 * sh;
            node.scale = 1 + 0.09 * sh + 0.04 * l + 0.1 * cl.ring * cl.ring + 0.05 * b;
            node.uniforms.uBright.value = 1 + 0.3 * sh + 0.15 * l + 0.25 * cl.ring + 0.15 * one + 0.15 * b;
            node.uniforms.uTint.value.setHex(CREAM);
            node.uniforms.uTintAmount.value = 0.85 * one;
            glow.x = node.x;
            glow.y = node.y;
            glow.scale = node.scale * (1 + 0.08 * sh);
            glow.opacity = Math.min(1, 0.85 * sh + 0.45 * l + 0.5 * cl.ring + 0.35 * one + 0.4 * b);
            glow.mesh.visible = glow.opacity > 0.01;
        });

        // ---- The moon breathes; it shines more as the colours become one
        L.moonGlow.opacity = 0.45 + 0.1 * Math.sin(t * 0.5) + 0.25 * one;
        L.moonNode.y = Math.sin(t * 0.2) * 3 * ramp + scroll * 12;

        // ---- The boat rocks; the lookout stretches up on each note he sings; Sid glows, more with his heart (Fa)
        voice = Math.max(0, voice - dt * 2.4);
        heart = Math.max(0, heart - dt * 0.9);
        L.boat.y = Math.sin(t * 0.6) * 5 * ramp;
        L.boat.rotate = Math.sin(t * 0.45) * 1.4 * ramp;
        L.boatNode.y = scroll * 22;
        const v = ease(voice);
        // Between songs he keeps watch, looking to one side and the other from the cup; just before singing he turns to
        // the front and draws himself up (it tells that a song is coming)
        const prep = !reduced && singAt !== null && !win ? Math.min(1, Math.max(0, 1 - (singAt - t) / PREP)) : 0;
        const busy = Math.max(prep, singing ? 1 : 0, v);
        gaze += ((reduced ? 0 : watchAt(t)) * (1 - busy) - gaze) * Math.min(1, dt * 2.5);
        L.lookout.rotate = 7 * gaze;
        L.lookout.sy = 1 + 0.08 * v + 0.05 * ease(prep) + 0.01 * Math.sin(t * 1.1) * ramp;
        L.lookout.sx = 1 - 0.03 * v - 0.015 * ease(prep);
        L.lookout.uniforms.uBright.value = 1 + 0.15 * v + 0.2 * named;
        L.voice.mesh.material.uniforms.uColor.value.setHex(voiceColour);
        L.voice.opacity = Math.min(1, 0.85 * v + 0.6 * named);
        L.voice.mesh.visible = L.voice.opacity > 0.01;
        const breath = Math.sin(t * 0.9);
        const chest = breath * ramp * (reduced ? 0 : 1);
        L.sid.sy = L.sidFill.sy = 1 + 0.018 * chest;
        L.sid.sx = L.sidFill.sx = 1 - 0.006 * chest;
        L.sidFill.uniforms.uBright.value = 1 + 0.04 * breath + 0.1 * heart;
        L.sidGlow.opacity = 0.5 + 0.12 * breath + 0.45 * heart;
        L.sidGlow.scale = 1 + 0.04 * breath + 0.12 * heart;
        L.dunesNode.y = scroll * 30;
        const dunesDrift = stage.drift(L.dunesNode.z);
        dunesOff = { x: dunesDrift.x, y: dunesDrift.y + L.dunesNode.y };

        // The particles that belong to a layer follow it
        const moonDrift = stage.drift(L.moonNode.z), boatDrift = stage.drift(L.boatNode.z);
        dust?.shift(0, moonDrift.x, moonDrift.y + L.moonNode.y);
        dust?.turn(1, L.boat.rotate, L.boat.pivot.x, L.boat.pivot.y);
        dust?.shift(1, boatDrift.x + L.boat.x, boatDrift.y + L.boat.y + L.boatNode.y);
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
        // [x, y, radius, colour] in art px to the screen; the moon's colours are an index into art.colors, Sid's are colours
        const fromArt = (list, colour = (c) => art.colors[c]) => list.map(([x, y, r, c]) => [sx(x), sy(y), Math.max(1.2, 2 * r * k()), colour(c)]);
        dust = startStardust(null, {
            stage,
            manual: true,
            groups: [
                // 0: the stipple round the moon and its ragged rim, alive
                { colors: [CREAM], parallax: 0, drift: 1.8, jitter: 0.45, twinkle: 0.35, reach: 0, order: after(L.moon),
                    points: () => fromArt(art.dots.moon).concat(fromArt(MOON_RIM, (c) => c)) },
                // 1: Sid's glow, a stipple round him, made in code
                { colors: [0xfef3b3], parallax: 0, drift: 2.2, jitter: 0.35, twinkle: 0.45, reach: 0, bloom: true, order: after(L.sidGlow), points: () => fromArt(SID_DOTS, (c) => c) },
                // 2: the notes in the air and the light that goes to the lookout
                { dynamic: flyers, look: 'soft', parallax: 0, drift: 1.5, twinkle: 0.2, reach: 0, bloom: true, order: after(L.mark) + 1 },
                // 3: sparks
                { ...sparks.group(), order: after(L.mark) + 2 },
                // 4: the four beads over the lookout
                { dynamic: beadGroup, look: 'hard', parallax: 0, drift: 0, jitter: 0, twinkle: 0, reach: 0, order: after(L.hull) },
                // 5: sand blown off the dunes, in front of them
                { dynamic: sandGroup, look: 'hard', parallax: 0, drift: 0, jitter: 0, twinkle: 0, reach: 0, order: after(L.mark) },
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
        stageEl?.style.removeProperty('--name-glow');
    });
</script>

<template>
    <div class="scene" ref="root">
        <canvas class="stageCanvas" ref="canvas"></canvas>
        <!-- The rulito is drawn on its own canvas, which the stage shows as a texture over the lookout -->
        <Rulito ref="rulito" class="offstage" color="#f4b893" />
        <!-- Every cloud, for the finger: its colour is its note -->
        <div v-for="(cl, i) in clouds" :key="i" :ref="(el) => { cloudHits[i] = el; }" class="cloud" aria-hidden="true"
            @pointerdown.prevent="pick($event, i)"></div>
        <!-- For the keyboard, one button per colour -->
        <div v-for="(colour, c) in COLOURS" :key="'key' + c" :ref="(el) => { keyHits[c] = el; }" class="key" role="button" tabindex="0"
            :aria-label="$i18n.locale === 'en' ? `${colour.en}: repeat the lookout's song` : `${colour.es}: repetí el canto del vigía`"
            @keydown="onKey($event, () => touchCloud(keyCloud(c).i))"></div>
        <div ref="sidHit" class="hit" role="button" tabindex="0" :aria-label="$i18n.locale === 'en' ? 'Sid, resting' : 'Sid, descansando'"
            @pointerdown.prevent="touchSid" @keydown="onKey($event, touchSid)"></div>
        <div ref="lookoutHit" class="hit" role="button" tabindex="0"
            :aria-label="$i18n.locale === 'en' ? 'The lookout: touch him to hear his song again' : 'El vigía: tocalo para volver a escuchar su canto'"
            @pointerdown.prevent="touchLookout" @keydown="onKey($event, touchLookout)"></div>
    </div>
</template>

<style scoped>
    .scene {
        position: absolute;
        inset: 0;
        overflow: hidden;
        background: #99abe5;
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

    /* Taps only, so the page still scrolls from them */
    .cloud,
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

    /* The keyboard's buttons sit over a cloud of their colour; the pointer goes to the clouds themselves */
    .key {
        position: absolute;
        left: 0;
        top: 0;
        width: 0;
        height: 0;
        border-radius: 45%;
        pointer-events: none;
        outline: none;
    }

    .key:focus-visible,
    .hit:focus-visible {
        outline: 2px solid rgba(255, 251, 214, 0.95);
        outline-offset: 4px;
    }
</style>
