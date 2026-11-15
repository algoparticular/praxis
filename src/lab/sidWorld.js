// The world round Sid in the puppet lab (/lab/sid): the little ticks of grass, a stipple and the streaks of the ground
// drawn in code with a pen of ink, and her drawn pieces (originales/arbol, made into src/lab/arbol by
// scripts/convert-lab-arbol.mjs: each piece's line, and what is inside it, painted in code): ferns (the big one with
// the sprout that grows out of its middle and curls up into a bead, as she drew them), pebbles and a stack of them,
// each on the ground, spread over the world, and her tree ahead of him on his way (TREE); and plants, stones and
// mushrooms cut out of the cards' scenes the same way (src/lab/suelo, by scripts/convert-lab-suelo.mjs): Ciclos's fans
// and tufts of grass, Upekkha's mushrooms and crystals, Desafío's stones, Metta's little glowing plants, Celebración's
// mushrooms. It is endless, across and into the distance: it is made a patch at a time from where it is (the same
// place is always the same), and only what is on the screen is drawn. Everything starts in ink and takes its colour
// (one of the seven of the chakras) as he walks by it, and all round him when he sits in lotus (a wave goes out of
// him); what has taken its colour keeps it. The palette, the clouds and the day are Ciclos's (CICLOS below): the ink of its
// line, its white Sid, its yellow sky, its hills that go from dry to green, and its white clouds (its own atlas,
// public/assets/ciclos/clouds.webp, with the boxes in ciclosScene.json). Day and night come and go as in the card: the
// yellow day with its red sun and its stippled corona, the teal night with its stars and its moon (moon.webp and its
// stipple), each rising from under the horizon, crossing the sky and setting under it again; the ground is the card's
// hills: green with yellow streaks by day, yellow with mustard-brown ones by night. The starry night itself is the
// cards' own sky (useStarField.js), behind the yellow, which clears as night comes. While he meditates the world's time all but stops.
import ciclos from '../composables/ciclosScene.json';
import { decodeCloud, sampleCloud } from '../composables/stippleCloud.js';
import arbol from './arbol/arbol.json';
import suelo from './suelo/suelo.json';

// Her pieces, and the plants, stones and mushrooms cut out of the cards' scenes (src/lab/suelo, made by
// scripts/convert-lab-suelo.mjs): the line and what is inside it, as pictures (tinted in code)
const URLS = import.meta.glob(['./arbol/*.webp', './suelo/*.webp'], { eager: true, query: '?url', import: 'default' });
const PICTURES = {};
if (typeof Image !== 'undefined') {
    for (const [file, url] of Object.entries(URLS)) {
        const name = file.split('/').pop().replace('.webp', '');
        PICTURES[name] = Object.assign(new Image(), { src: url });
    }
}
const ready = (img) => img?.complete && img.naturalWidth > 0;
// Sizes and places are in units of 0.4 of her drawing, whatever size the pictures were made at (arbol.scale)
const UNIT = 0.4 / arbol.scale;
// every piece, hers and the scenes' (each of these with its own unit: how many units of the world a pixel of it is)
const PIECES = { ...arbol.pieces, ...suelo.pieces };
const boxOf = (name) => PIECES[name].box.map((v) => v * (PIECES[name].unit ?? UNIT));
// A picture in one colour (its transparency kept), made once per colour
const TINTS = new Map();
function tint(name, colour) {
    const key = `${name}|${colour}`, img = PICTURES[name];
    if (TINTS.has(key)) return TINTS.get(key);
    if (!ready(img)) return null;
    if (TINTS.size > 600) TINTS.clear();      // (the colours blend between zones: old ones are not kept for ever)
    const c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = colour; g.fillRect(0, 0, c.width, c.height);
    TINTS.set(key, c);
    return c;
}
// Her tree: where it stands in his world (x, depth), how big, and where its foot is in her drawing (scaled): the foot of
// the little mushrooms in the middle, between its roots, which sit on the ground (its roots spread over it, towards us)
// (scale: 2.5 times as tall as Sid, from the foot of its mushrooms to the top of its crown, 1332 px of the drawing
// against his 708; its line, about 11 px in the drawing, is then about 14, as his own outline)
export const TREE = { x: 2000, d: 420, behind: 25, scale: 1.33, foot: { x: 640, y: 1358 } };
// The pieces spread over the world, how often each comes, what colour it takes, and whether it sways. The sprout is not
// one of them: it is part of the big fern (it grows out of its middle), so a big fern carries it where she drew it
// (WITH), with a colour of its own and swaying a little more than the fronds: most carry one, some two (the second
// curling and leaning the other way, a little shorter, so their beads stand apart) and a few none. foot: where its stem meets the fern, across its picture (px)
const WITH = { fern: { name: 'sprout', sway: 0.5, foot: 146 } };
// Her pieces go everywhere, taking the colours of the zone they are in; each zone adds its card's own (`own` in ZONES,
// names: one of them, at random), and Ciclos its tufts of grass (GRASS)
const SCATTER = [
    { name: 'fern', weight: 3, sway: 0.5, colour: 'green' }, { name: 'fernSmall', weight: 3, sway: 0.6, colour: 'green' },
    { name: 'fernLow', weight: 3, sway: 0.5, colour: 'green' },
    { name: 'pebble', weight: 2 }, { name: 'pebbles', weight: 2 }, { name: 'pebbleGrass', weight: 2 },
    { name: 'pebbleFlat', weight: 2 }, { name: 'cairn', weight: 1 },
];
const GRASS = ['grass0', 'grass1', 'grass2', 'grass3', 'grass4', 'grass5', 'grass6'];

// The big stones stand in his way (he walks round them; the small ones he steps over), and the tall plants are drawn
// faint when they are just in front of him (the low ones, and the grass, hide his feet as he walks through them)
// How each character round a place moves once it is alive, as in its card's scene: Metta's beings rock, nod, doze, sway
// arm in arm, hum, the fox sniffs and the kitten hops; round Celebración's fire they all dance to one beat (swaying,
// bouncing, jumping, clapping)
const WAYS = {
    metta0: 'rock', metta1: 'nod', metta2: 'doze', metta3: 'pair', metta4: 'pair', metta5: 'hum', mettaFox: 'sniff', mettaKitten: 'hop',
    fire_samaLeft: 'sway', fire_samaRight: 'sway', fire_seated: 'clap', fire_foxLeft: 'jump', fire_foxRight: 'bounce',
    fire_catBack: 'jump', fire_catFront: 'bounce', fire_trio: 'bounce', fire_hairy: 'jump', fire_pink: 'bounce', vulpes: 'sniff',
};
// the characters whose eyes are their own pieces (the rest have them in their picture)
const EYES = {
    metta0: 'eyes_metta0', metta1: 'eyes_metta1', metta2: 'eyes_metta2', metta3: 'eyes_metta3', metta4: 'eyes_metta4', metta5: 'eyes_metta5',
    fire_samaLeft: 'eyes_fire_samaLeft',
};
// what lets go of glowing spores by night (they rise from its caps and fade)
const SPORES = new Set(['shrooms', 'shroom', 'grove', 'mushrooms', 'caps', 'bloom0', 'bloom1', 'bloom2', 'bloom3', 'bloom4']);
const BLOCKS = new Set(['pebbleGrass', 'pebbleFlat', 'cairn', 'grove', 'stones', 'stack']);
const TALL = new Set(['fern', 'fernSmall', 'cairn', 'grove']);
// her tree's trunk on the floor: it stands a little behind its foot (its roots come forward), as wide as it looks
// Her tree stands in his way where it is drawn: its trunk (just behind its foot, as wide as it is drawn just over its
// roots, its middle a little left of the foot) and its roots, which spread wide and come forward over the floor (an
// ellipse: as wide as they are drawn, from the trunk to their tips). The tree stands far back, so there is room to
// walk in front of its roots, and behind it a little
const TRUNK = { behind: 25, r: 122, dx: -19 };
const ROOTS = { dx: 30, dd: -150, r: 400, rd: 175 };

const STRETCH = 520;            // the width of the stretch of world made at a time (px of his world)
const PATCH = 780;              // and how deep (the world is endless both ways: across and into the distance)
const LINE = 7;                 // the pen: thinner than his own outline, so he stays the one you look at

// A small random number generator that always gives the same numbers for the same seed
function random(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
// Ciclos's colours (read off the card): its ink, its white, its sky, its dry and green hills, and what things take as they
// are coloured: its teal night, its green, its coral sun, its yellow, the tan of its dry hills and the pink of its fans
export const CICLOS = {
    ink: '#32300B', white: '#FEFEFD', sky: '#FED889', night: '#039CA8', star: '#FCDC8C', sun: '#FB767B',
    groundDay: '#62A27C', groundNight: '#FFE090', detailDay: '#FFE090', detailNight: '#B08A3C',
    colours: [
        { light: '#1BAFAF', ink: '#0B7B7B' }, { light: '#64A57A', ink: '#3E7A55' }, { light: '#FF7878', ink: '#C84A4A' },
        { light: '#FFD36E', ink: '#B08A1E' }, { light: '#C8B070', ink: '#857033' }, { light: '#F2A48C', ink: '#B4664F' },
    ],
};

// The zones of the world, one card each, across it (ZONE wide, in this order to his right; endless both ways, so going
// on they come round again): Ciclos round her tree, Metta, Upekkha, Desafío and Celebración (to the left of Ciclos).
// Each has its card's colours: its ink (also Sid's line) and its white (Sid's body), its sky by day and by night (the
// night is the cards' starry sky over it), its ground and the streaks and marks on it by day and by night, its sun,
// the colours things take, and its own pieces (cut out of its scene's layers, shown in its own colours once coloured).
// Celebración is a night clearing: there it is always night (dark). Between two zones everything blends over BLEND.
// (The colours were read off each card.)
const ZONES = [
    { card: 'ciclos', id: 15, ...CICLOS, roles: { plants: [1, 0, 1, 3], beads: [2, 5, 3, 0], stones: [4, 3, 5, 0] }, own: [{ names: ['fan0', 'fan1', 'fan2', 'fan3'], weight: 3, sway: 0.35 }], grass: true },
    {
        // (a night card: by day the sky is its great yellow light and the ground the turquoise of its other light; by
        // night both are dark, as in the card: its navy sky over its blue hill)
        roles: { plants: [1, 3, 1, 0], beads: [0, 2, 5], stones: [5, 3, 2] },
        card: 'metta', id: 8, ink: '#18243C', white: '#FCFCFC', sky: '#FCE49C', night: '#303C6C', sun: '#00B4CC',
        groundDay: '#47BCCB', groundNight: '#305490', detailDay: '#A6E6EC', detailNight: '#1E3A70',
        colours: [
            { light: '#F09CB4', ink: '#B05A78' }, { light: '#00B4CC', ink: '#007C8C' }, { light: '#FCE49C', ink: '#A88A3A' },
            { light: '#3C84C0', ink: '#245490' }, { light: '#305490', ink: '#18243C' }, { light: '#FCFCFC', ink: '#8C9CB4' },
        ],
        own: [{ names: ['bloom0', 'bloom1', 'bloom2', 'bloom3', 'bloom4'], weight: 5, sway: 0.4 }],
    },
    {
        roles: { plants: [1, 4, 5, 0], beads: [3, 2, 4], stones: [4, 5, 0] },
        card: 'upekkha', id: 9, ink: '#60549C', white: '#FCFCFC', sky: '#B4E4D8', night: '#2490A8', sun: '#FC9C78',
        groundDay: '#FC9C78', groundNight: '#60A8C0', detailDay: '#FFC9AE', detailNight: '#60549C',
        colours: [
            { light: '#78CCD8', ink: '#3E8C98' }, { light: '#2490A8', ink: '#14607A' }, { light: '#FC9C78', ink: '#B85E40' },
            { light: '#F6E27A', ink: '#A8901E' }, { light: '#A89CE0', ink: '#60549C' }, { light: '#B4E4D8', ink: '#5E9C8C' },
        ],
        own: [{ name: 'grove', weight: 0.8 }, { names: ['crystals', 'crystalsSmall', 'crystal'], weight: 2.5 },
            { names: ['shrooms', 'shroom'], weight: 2.5 }],
    },
    {
        roles: { plants: [5, 2, 3, 1], beads: [0, 4, 1], stones: [4, 0, 1] },
        card: 'desafio', id: 21, ink: '#18789C', white: '#F2F7E8', sky: '#A8D8D8', night: '#4C6CA8', sun: '#FFF1C8',
        groundDay: '#E2EFDA', groundNight: '#8C8CC8', detailDay: '#FCC0C0', detailNight: '#5C78B0',
        colours: [
            { light: '#FCC0C0', ink: '#C47A80' }, { light: '#A8A8D8', ink: '#6C6CA8' }, { light: '#A8D8D8', ink: '#4E8E8E' },
            { light: '#90C0F0', ink: '#4A7CB0' }, { light: '#F2D48A', ink: '#A88A3A' }, { light: '#18789C', ink: '#0E5470' },
        ],
        own: [{ name: 'stones', weight: 2 }, { name: 'caps', weight: 2.5 }],
    },
    {
        roles: { plants: [5, 0, 1], beads: [2, 1, 0], stones: [5, 3, 0] },
        card: 'celebracion', id: 14, ink: '#48486C', white: '#D8F0FC', sky: '#2460A8', night: '#2460A8', sun: '#FCE484', dark: 1,
        groundDay: '#6CB4E4', groundNight: '#6CB4E4', detailDay: '#D8F0FC', detailNight: '#D8F0FC',
        colours: [
            { light: '#F09CA8', ink: '#B05A68' }, { light: '#E478A8', ink: '#A0406C' }, { light: '#FCE484', ink: '#A8901E' },
            { light: '#D8F0FC', ink: '#7CA8C8' }, { light: '#6CB4E4', ink: '#2E78A8' }, { light: '#9C9CD0', ink: '#48486C' },
        ],
        own: [{ name: 'mushrooms', weight: 3 }, { name: 'caps', weight: 1 }],
    },
].map((z) => ({
    ...z, dark: z.dark ?? 0,
    rgb: Object.fromEntries(['ink', 'white', 'sky', 'night', 'sun', 'groundDay', 'groundNight', 'detailDay', 'detailNight'].map((k) => [k, hex(z[k])])),
    palette: z.colours.map((c) => ({ light: hex(c.light), ink: hex(c.ink) })),
}));
// The zones are a grid, across and in depth: each row of it has the five cards in the same order, moved on by SHIFT from
// the row in front, so the zone behind one is never the same as the one beside it, and every card is once in each row
// and once in each column; five rows and five columns on, the grid comes round again (so going on and on, either way,
// he comes back to her tree). Its rows are ZONE_D deep; the row of her tree has its middle at her tree (d 420)
const ZONE = 8000, ZONE_START = -2000, BLEND = 1000;    // (about 19 s walking across one; Ciclos from -2000, round her tree)
const ZONE_D = 6000, D_START = 420 - ZONE_D / 2, SHIFT = 2;
const CYCLE_W = ZONE * ZONES.length;   // (the zones come round again after this, across)
const mod = (a, n) => ((a % n) + n) % n;
const zoneOfCell = (i, j) => ZONES[mod(i + SHIFT * j, ZONES.length)];
// The special place of each zone, in its middle (and again wherever the zones come round): Ciclos's is her tree; then
// Metta's nest of mushrooms with its beings round it, Upekkha's pond and Celebración's fire with everyone round it
// (Desafío has none yet: only Vulpes is there). Its pieces (parts) and the characters round it (crowd, each its own
// thing on the ground, breathing, hopping when he comes, leaning to him) stand where the card has them: across, as far
// from its anchor (the foot of its main piece, card px) as in the card, and back, as far as they are up in the card
// (depthK times: the card's ground is seen nearly flat). Sitting in
// lotus at one (sit: how far to its sides, in front of it and behind it) the rulito is born over him and the
// affirmation of its card (id) is written in the sky; the place answers too (`glow`). block: what of it stands in his
// way (a circle, or an ellipse rd deep, dd behind its foot); clear: the ground kept free round it of the world's plants
const PLACES = [
    { card: 'ciclos', kind: 'tree', id: 15, dd: 0 },
    { card: 'metta', kind: 'nest', id: 8, dd: 0, reach: 1100, anchor: [1082, 1729], depthK: 1.1,
        parts: ['nest'], crowd: ['metta0', 'metta1', 'metta2', 'metta3', 'metta4', 'metta5', 'mettaFox', 'mettaKitten'],
        block: { r: 330 }, sit: { w: 520, front: 620, back: 40 }, clear: { w: 1150, front: 420, back: 620 } },
    { card: 'upekkha', kind: 'pond', id: 9, dd: 140, reach: 900,
        block: { dd: 170, r: 760, rd: 200 }, sit: { w: 700, front: 520, back: 0 }, clear: { w: 960, front: 220, back: 560 } },
    { card: 'celebracion', kind: 'fire', id: 14, dd: 0, reach: 950, anchor: [1067, 1925], depthK: 1.1,
        parts: ['flame', 'logs'], crowd: ['fire_samaLeft', 'fire_samaRight', 'fire_seated', 'fire_foxLeft', 'fire_foxRight',
            'fire_catBack', 'fire_catFront', 'fire_trio', 'fire_hairy', 'fire_pink'],
        block: { r: 220 }, sit: { w: 560, front: 520, back: 160 }, clear: { w: 950, front: 420, back: 760 } },
    { card: 'desafio', kind: 'none', id: 21, dd: 0, reach: 450, anchor: [1202, 2083], depthK: 1.1,
        parts: [], crowd: ['vulpes'], clear: { w: 480, front: 240, back: 240 } },
];
// The places between x0 and x1 and between the depths d0 and d1, wherever their zone is in the grid: { P, x, d } (each
// in the middle of its cell, dd behind it)
function placesNear(x0, x1, d0, d1) {
    const out = [], n = ZONES.length;
    for (let j = Math.floor((d0 - D_START) / ZONE_D) - 1; j <= Math.floor((d1 - D_START) / ZONE_D) + 1; j++) {
        const middle = D_START + ZONE_D * (j + 0.5);
        for (const P of PLACES) {
            const d = middle + P.dd;
            if (d < d0 || d > d1) continue;
            const k = ZONES.findIndex((z) => z.card === P.card), x = ZONE_START + ZONE * (mod(k - SHIFT * j, n) + 0.5);
            for (let c = Math.ceil((x0 - x) / CYCLE_W), xx = x + c * CYCLE_W; xx <= x1; c++, xx = x + c * CYCLE_W) out.push({ P, x: xx, d });
        }
    }
    return out;
}
const smooth = (t) => { const u = Math.max(0, Math.min(1, t)); return u * u * (3 - 2 * u); };
// The zones at a place (x, depth): [{ z, w }], how much of each (one in the middle of a zone; two or four near its edges,
// blended over BLEND)
function zonesAt(x, d = 420) {
    const along = (u, size) => {
        const i = Math.floor(u), f = u - i, e = BLEND / 2 / size;
        if (f > 1 - e) { const t = smooth((f - (1 - e)) / (2 * e)); return [[i, 1 - t], [i + 1, t]]; }
        if (f < e) { const t = smooth((f + e) / (2 * e)); return [[i - 1, 1 - t], [i, t]]; }
        return [[i, 1]];
    };
    const out = [];
    for (const [i, wi] of along((x - ZONE_START) / ZONE, ZONE)) {
        for (const [j, wj] of along((d - D_START) / ZONE_D, ZONE_D)) {
            const z = zoneOfCell(i, j), w = wi * wj, same = out.find((o) => o.z === z);
            if (w <= 0) continue;
            if (same) same.w += w; else out.push({ z, w });
        }
    }
    return out;
}
const mainZone = (zs) => zs.reduce((a, b) => (b.w > a.w ? b : a)).z;
const pickZone = (zs, r) => { let v = r; for (const o of zs) { v -= o.w; if (v <= 0) return o.z; } return zs[zs.length - 1].z; };
const mixAll = (zs, get) => { const out = [0, 0, 0]; for (const { z, w } of zs) get(z).forEach((v, i) => { out[i] += v * w; }); return out; };
// A colour as a string, a little rounded (so the tinted pictures made for it are not made again for every small step)
const css = (rgb) => `rgb(${rgb.map((v) => Math.round(v / 4) * 4).join(',')})`;
const PALETTE = ZONES[0].palette;
const PART_COLOUR = { cap: 2, stem: null };   // the mushrooms of the tree: their caps Ciclos's coral, their stems cream
// What colours of its zone's palette a thing takes, by what it is (each zone says which of its colours, `roles`): the
// plants (her ferns, the grass), the beads (of the sprouts, the stipple) and the stones; a thing keeps a number (`pick`,
// 0..1) that chooses among them, so between two zones it takes the matching colour of each
const ROLES = { plant: 'plants', bead: 'beads', stone: 'stones' };
const mixRgb = (a, b, t) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',')})`;

export function createWorld({ clouds = null, moon = null }) {
    // The colours on the screen now: those of the zone where the camera is (blended between two), set as the sky is
    // drawn, first thing every frame
    const blend = (zs) => {
        const m = (k) => mixAll(zs, (z) => z.rgb[k]);
        return { ink: m('ink'), white: m('white'), sky: m('sky'), night: m('night'), sun: m('sun'), groundDay: m('groundDay'),
            groundNight: m('groundNight'), detailDay: m('detailDay'), detailNight: m('detailNight'), dark: zs.reduce((t, { z, w }) => t + z.dark * w, 0) };
    };
    let screen = blend(zonesAt(1000)), lastCam = 1000, lastD = 420;
    // One of the colours a thing takes, as the zone where it stands has it (blended between two)
    const colourOf = (zs, role = 'plant', pick = 0) => {
        const of = (z) => { const list = z.roles[ROLES[role]]; return z.palette[list[Math.min(list.length - 1, Math.floor(pick * list.length))]]; };
        return { light: mixAll(zs, (z) => of(z).light), ink: mixAll(zs, (z) => of(z).ink) };
    };
    let clock = 0.2;                        // the cycle: 0 sunrise, 0.25 noon, 0.5 sunset, 0.75 midnight
    const CYCLE = 90;                       // s for a whole day and night
    const stretches = new Map();
    const colour = new Map();               // how much colour each thing has taken (0..1), kept when it goes off screen
    const life = new Map();                 // what moves on each thing (a bend, a hop, a blink)
    let ripple = null;                      // the wave of colour out of him while he sits
    let time = 0;

    // ---- making a stretch ----
    function make(index, row) {
        const r = random(index * 7919 + row * 15485863 + 104729), items = [];
        const pick = (list) => list[Math.floor(r() * list.length)];
        const at = () => ({ x: index * STRETCH + r() * STRETCH, d: (row + r()) * PATCH - 180 });
        const jitter = (p, a = 0.8) => [p[0] + (r() - 0.5) * a, p[1] + (r() - 0.5) * a];
        const sproutsFor = (rr) => {
            const v = rr(), n = v < 0.15 ? 0 : v < 0.75 ? 1 : 2, list = [];
            for (let i = 0; i < n; i++) {
                list.push(i === 0
                    ? { role: 'bead', pick: rr(), flip: 1, size: 0.95 + rr() * 0.1, tilt: -rr() * 0.06 - (n > 1 ? 0.08 : 0), phase: 0 }
                    : { role: 'bead', pick: rr(), flip: -1, size: 0.72 + rr() * 0.14, tilt: 0.22 + rr() * 0.12, phase: 1 + rr() * 2 });
            }
            return list;
        };
        const add = (item) => items.push({ id: `${index},${row}:${items.length}`, ...item });

        const tick = (x, d, big = 1) => {
            const s = (0.8 + r() * 0.6) * big, kind = r();
            let strokes;
            if (kind < 0.45) strokes = [[[-2, 0], [-7, -16]], [[2, 0], [6, -18]]];                    // v
            else if (kind < 0.65) strokes = [[[-4, 0], [-9, -13]], [[0, 0], [1, -19]], [[4, 0], [10, -14]]];   // a tuft
            else if (kind < 0.8) strokes = [[[-8, -2], [0, -14]], [[0, -14], [8, -2]]];               // ^
            else if (kind < 0.9) strokes = [[[-9, 0], [9, -1]]];                                      // -
            else strokes = [[[-11, 0], [-4, -4], [3, 0], [10, -4]]];                                  // ~
            add({ kind: 'tick', x, d, role: 'plant', pick: r(), strokes: strokes.map((st) => st.map((p) => jitter([p[0] * s, p[1] * s]))) });
        };

        // her tree and the zones' special places, where they stand (their stretch keeps clear round them)
        const near = placesNear(index * STRETCH - 1200, (index + 1) * STRETCH + 1200, row * PATCH - 180 - 1200, (row + 1) * PATCH - 180 + 1200);
        for (const { P, x, d } of near) {
            if (x < index * STRETCH || x >= (index + 1) * STRETCH || row !== Math.floor((d + 180) / PATCH)) continue;
            if (P.kind === 'tree') add({ kind: 'tree', x, d, reach: 700, place: P });
            else add({ kind: 'place', x, d, reach: P.reach, place: P, scale: 1 });
        }
        // the characters round the places, each where it stands (in the stretch and the row its own place falls in)
        for (const { P, x, d } of near) {
            for (const name of P.crowd ?? []) {
                const at = PIECES[name].at, [, , w, h] = PIECES[name].box, u = PIECES[name].unit;
                const bx = x + (at[0] + w / 2 - P.anchor[0]) * u, bd = d - (at[1] + h - P.anchor[1]) * u * P.depthK;
                if (bx < index * STRETCH || bx >= (index + 1) * STRETCH || row !== Math.floor((bd + 180) / PATCH)) continue;
                add({ kind: 'being', name, x: bx, d: bd, place: P, home: `${x},${d}`, phase: r() * 10, reach: w * u });
            }
        }
        // nothing of the world stands on or just in front of them (as the camera moves it would cross them): her tree's
        // roots come forward
        const clear = (p) => near.every(({ P, x, d }) => P.kind === 'tree'
            ? Math.abs(p.x - x) > 640 || p.d > d + 140 || p.d < d - 420
            : Math.abs(p.x - x) > P.clear.w || p.d > d + P.clear.back || p.d < d - P.clear.front);

        for (let n = 0, m = 34; n < m; n++) { const p = at(); if (clear(p)) tick(p.x, p.d); }
        // her pieces and the zone's own, spread: ferns (the big ones with their sprout), pebbles, now and then a stack of
        // them, and what its card has (between two zones, each piece is of one or the other, more of the nearer)
        for (let n = 0, m = Math.round((4 + r() * 3) * 0.8); n < m; n++) {
            const p = at();
            if (!clear(p)) continue;
            const z = zonesAt(p.x, p.d), home = pickZone(z, r()), list = [...SCATTER, ...home.own];
            let w = r() * list.reduce((t, k) => t + k.weight, 0), kind = list[0];
            for (const k of list) { w -= k.weight; if (w <= 0) { kind = k; break; } }
            const name = kind.names ? pick(kind.names) : kind.name;
            // (no stone in his way round her tree: he can always walk behind its trunk)
            if (BLOCKS.has(name) && near.some(({ P, x, d }) => P.kind === 'tree' && Math.abs(p.x - x) < 700 && p.d > d)) continue;
            add({ kind: 'piece', name, x: p.x, d: p.d, scale: 0.6 + r() * 0.3, flip: r() < 0.5 ? -1 : 1, sway: kind.sway ?? 0,
                role: kind.colour === 'green' ? 'plant' : 'stone', pick: r(),
                zone: z, sprouts: WITH[name] ? sproutsFor(r) : undefined });
        }
        // Ciclos's tufts of grass, a few in every stretch of it, swaying
        for (let n = 0, m = 2 + Math.floor(r() * 3); n < m; n++) {
            const p = at(), z = zonesAt(p.x, p.d);
            if (!clear(p) || !pickZone(z, r()).grass) continue;
            add({ kind: 'piece', name: pick(GRASS), x: p.x, d: p.d, scale: 0.45 + r() * 0.35, flip: r() < 0.5 ? -1 : 1, sway: 0.7, role: 'plant', pick: r() });
        }
        // by day, little lights that move as butterflies (in the zone's colours) and bees do, low over the ground
        for (let n = 0, m = 1 + (r() < 0.35 ? 1 : 0); n < m; n++) {
            const p = at();
            add({ kind: r() < 0.6 ? 'butterfly' : 'bee', x: p.x, d: p.d, phase: r() * 100, role: 'bead', pick: r(), reach: 200 });
        }
        // fireflies, by night: a few in every stretch, low over the ground
        for (let n = 0, m = 2 + Math.floor(r() * 3); n < m; n++) {
            const p = at();
            add({ kind: 'firefly', x: p.x, d: p.d, high: 40 + r() * 120, phase: r() * 100, reach: 60 });
        }
        // streaks on the hills, as the card's: short brush strokes lying along the ground (pills with round ends, a little
        // curved, now and then two in a row) and a few small ovals, in the ground's other colour
        for (let n = 0, m = Math.round(12 + r() * 6); n < m; n++) {
            const p = at(), long = 22 + r() * 60, wide = 5 + r() * 6, bend = (r() - 0.5) * wide * 1.6, tilt = (r() - 0.5) * 6;
            if (!clear(p)) continue;
            const strokes = [{ long, wide, bend, tilt, dx: 0 }];
            if (r() < 0.3) strokes.push({ long: long * (0.3 + r() * 0.3), wide: wide * 0.9, bend: bend * 0.5, tilt, dx: long * 0.5 + 10 + r() * 12 });
            add({ kind: 'streak', x: p.x, d: p.d, strokes, oval: r() < 0.12 ? { rx: 14 + r() * 16, ry: 5 + r() * 4 } : null });
        }
        // a stipple on the ground, thinning out from its middle
        for (let n = 0, m = Math.round(1 + r() * 2); n < m; n++) {
            const p = at(), R = 70 + r() * 110, dots = [];
            if (!clear(p)) continue;
            for (let k = 0; k < 70; k++) {
                const a = r() * Math.PI * 2, t = Math.pow(r(), 0.7);
                dots.push([Math.cos(a) * R * t, Math.sin(a) * R * t * 0.3, 1.6 + r() * 2.4 * (1 - t)]);
            }
            add({ kind: 'stipple', x: p.x, d: p.d, dots, role: 'bead', pick: r() });
        }
        return items;
    }
    const stretch = (i, j) => { const key = `${i},${j}`; if (!stretches.has(key)) stretches.set(key, { i, items: make(i, j) }); return stretches.get(key).items; };
    // the patches over a stretch of floor: across, from x0 to x1, and in depth, from d0 to d1
    function* patches(x0, x1, d0, d1) {
        for (let i = Math.floor(x0 / STRETCH); i <= Math.floor(x1 / STRETCH); i++) {
            for (let j = Math.floor((d0 + 180) / PATCH); j <= Math.floor((d1 + 180) / PATCH); j++) yield* stretch(i, j);
        }
    }

    // The clouds of Ciclos, drifting slowly far away (they move little with the camera), where the card has them
    const sky = ciclos.clouds.map(([x, y, w, h, ax, ay], i) => ({ x: x / ciclos.size, y: y / 1300, w, h, ax, ay, speed: 5 + (i % 5) * 2.5 }));

    // ---- what moves ----
    const lifeOf = (item) => {
        if (!life.has(item.id)) life.set(item.id, { bend: 0 });
        return life.get(item.id);
    };
    const wind = (x) => 0.07 * Math.sin(time * 0.9 + x * 0.004) + 0.035 * Math.sin(time * 2.3 + x * 0.013);

    function update(dt, sid) {
        // (sid.pace: how fast the world's time goes; while he meditates it all but stops: the wind, the clouds, the sun,
        // the day; only the colour keeps spreading out of him)
        const pace = sid.pace ?? 1;
        time += dt * pace;
        clock = (clock + dt * pace / CYCLE) % 1;
        if (sid.sitting) {
            if (!ripple) ripple = { x: sid.x, d: sid.d, r: 0 };
            ripple.r = Math.min(1400, ripple.r + dt * 260);
        } else ripple = null;
        // the place he meditates at answers him (its glow grows while he sits there, and fades when he gets up)
        const at = sid.sitting ? placeAt(sid.x, sid.d) : null;
        for (const { i, items } of stretches.values()) {
            if (Math.abs(i * STRETCH - sid.x) > 3000) {
                // (far from him, the characters and the places go back to ink, still, ready for the next time he comes)
                for (const item of items) {
                    if (item.kind !== 'being' && item.kind !== 'place') continue;
                    const c0 = colour.get(item.id) ?? 0;
                    if (c0 > 0) colour.set(item.id, Math.max(0, c0 - dt * 0.4));
                }
                continue;
            }
            for (const item of items) {
                if (item.kind !== 'place' && item.kind !== 'being') continue;
                const l = lifeOf(item), home = item.kind === 'place' ? `${item.x},${item.d}` : item.home;
                const want = at && `${at.x},${at.d}` === home && at.P === item.place ? 1 : 0;
                l.glow = (l.glow ?? 0) + (want - (l.glow ?? 0)) * Math.min(1, dt * (want ? 0.5 : 0.8));
                if (item.kind !== 'being') continue;
                // it hops once when he comes near (and again only after he has gone a little way off), and leans to him
                const dist = Math.hypot(item.x - sid.x, (item.d - sid.d) * 1.6);
                if (dist < 300 && !l.near && !sid.sitting) { l.near = true; l.hop = 1; }
                if (dist > 520) l.near = false;
                l.hop = Math.max(0, (l.hop ?? 0) - dt * 2.4);
                const toward = dist < 700 ? Math.sign(sid.x - item.x) : 0;
                l.lean = (l.lean ?? 0) + (toward - (l.lean ?? 0)) * Math.min(1, dt * 2);
            }
            for (const item of items) {
                const dx = item.x - sid.x, dd = (item.d - sid.d) * 1.6, dist = Math.hypot(dx, dd);
                // colour: as he walks by, and inside the wave while he sits
                let c = colour.get(item.id) ?? 0;
                const near = item.kind === 'tree' ? 950 : item.kind === 'place' ? item.reach + 350 : item.kind === 'being' ? 800 : 170;
                if (dist < near) c = Math.min(1, c + dt * 0.9 * (1 - dist / near) * 2);
                // (the characters and the places go back to ink, still, once he has gone a good way off)
                else if ((item.kind === 'being' || item.kind === 'place') && dist > 1800) c = Math.max(0, c - dt * 0.4);
                if (ripple && Math.hypot(item.x - ripple.x, (item.d - ripple.d) * 1.6) < ripple.r) c = Math.min(1, c + dt * 1.4);
                if (c > 0 || colour.has(item.id)) colour.set(item.id, c);
                if (item.kind === 'tick' || (item.kind === 'piece' && item.sway)) {
                    // pushed aside as he walks through
                    const l = lifeOf(item), push = Math.abs(dd) < 50 && Math.abs(dx) < 70 ? Math.sign(dx || 1) * 0.8 * (1 - Math.abs(dx) / 70) : 0;
                    l.bend += (push - l.bend) * Math.min(1, dt * (push ? 10 : 3));
                }
            }
        }
    }

    // ---- drawing ----
    // The pen: a line through points, wide in its middle and finer at its ends, with round ends
    function pen(c, pts, width, color) {
        c.strokeStyle = color; c.lineCap = 'round'; c.lineJoin = 'round';
        const n = pts.length - 1;
        for (let i = 0; i < n; i++) {
            const t = (i + 0.5) / n;
            c.lineWidth = width * (0.55 + 0.45 * Math.sin(Math.PI * t));
            c.beginPath(); c.moveTo(pts[i][0], pts[i][1]); c.lineTo(pts[i + 1][0], pts[i + 1][1]); c.stroke();
        }
    }
    // A short mark: wide where it starts, to a point where it ends (as a pen lifting off the paper)
    function mark(c, a, b, width, color) {
        const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l * width / 2, ny = dx / l * width / 2;
        c.fillStyle = color;
        c.beginPath();
        c.moveTo(a[0] + nx, a[1] + ny);
        c.quadraticCurveTo(a[0] + dx * 0.6 + nx * 0.6, a[1] + dy * 0.6 + ny * 0.6, b[0], b[1]);
        c.quadraticCurveTo(a[0] + dx * 0.6 - nx * 0.6, a[1] + dy * 0.6 - ny * 0.6, a[0] - nx, a[1] - ny);
        c.arc(a[0], a[1], width / 2, Math.atan2(-ny, -nx), Math.atan2(ny, nx));
        c.fill();
    }

    // One of her pieces at (left, top) and scale k: what is inside its line in cream, taking the colour P as it is
    // coloured (col), and its line in ink (a plant with nothing inside takes the colour in its line instead)
    // (layer: 'fill' or 'line' draws only that part, so the tree can put its crown's colour behind its trunk)
    function piece(c, name, left, top, k, P, col, tintLine = false, layer = 'both') {
        const box = boxOf(name), w = box[2] * k, h = box[3] * k, white = css(screen.white), inkCss = css(screen.ink);
        // a piece of a card's scene: cream and ink at first, and as it is coloured, itself in its card's colours
        const own = PIECES[name].colour && PICTURES[`${name}-colour`];
        if (own) {
            const base = PIECES[name].fill && tint(`${name}-fill`, white), ink = tint(name, inkCss);
            if (base) c.drawImage(base, left, top, w, h);
            if (ink && col < 0.99) { c.globalAlpha *= 1 - col; c.drawImage(ink, left, top, w, h); c.globalAlpha /= 1 - col; }
            if (col > 0.01 && ready(own)) { c.globalAlpha *= col; c.drawImage(own, left, top, w, h); c.globalAlpha /= col; }
            return;
        }
        if (PIECES[name].fill && layer !== 'line') {
            const base = tint(`${name}-fill`, white), coloured = col > 0.01 && tint(`${name}-fill`, css(P.light));
            if (base) c.drawImage(base, left, top, w, h);
            if (coloured) { c.globalAlpha *= col; c.drawImage(coloured, left, top, w, h); c.globalAlpha /= col; }
            // its parts with a colour of their own (the mushrooms at the foot of the trunk), or none (cream)
            for (const part of PIECES[name].parts ?? []) {
                const Q = PALETTE[PART_COLOUR[part]], file = `${name}-${part}-fill`;
                const cream = tint(file, white), mine = Q && col > 0.01 && tint(file, css(Q.light));
                if (cream) c.drawImage(cream, left, top, w, h);
                if (mine) { c.globalAlpha *= col; c.drawImage(mine, left, top, w, h); c.globalAlpha /= col; }
            }
        }
        if (layer === 'fill') return;
        const ink = tint(name, inkCss), coloured = tintLine && col > 0.01 && tint(name, css(P.ink));
        if (ink) c.drawImage(ink, left, top, w, h);
        if (coloured) { c.globalAlpha *= col * 0.85; c.drawImage(coloured, left, top, w, h); c.globalAlpha /= col * 0.85; }
    }

    function drawItem(c, item) {
        // (the colours it takes are those of the zone where it stands, worked out once)
        item.zone ??= zonesAt(item.x, item.d);
        item.P ??= colourOf(item.zone, item.role, item.pick);
        const col = colour.get(item.id) ?? 0, P = item.P, line = mixRgb(screen.ink, P.ink, col * 0.8);
        // the marks of the ground (its grass, its stipple) are in its detail colour: yellow by day, mustard by night
        const mark_ = item.kind === 'tick' || item.kind === 'stipple' ? mixRgb(detailRgb(), P.ink, col * 0.8) : line;
        const l = life.get(item.id);
        switch (item.kind) {
        case 'tick': {
            const lean = wind(item.x) * 0.6 + (l?.bend ?? 0) * 0.9;
            c.save(); c.rotate(lean);
            for (const st of item.strokes) {
                if (st.length === 2) mark(c, st[0], st[1], LINE * 0.8, mark_);
                else pen(c, st, LINE * 0.7, mark_);
            }
            c.restore();
            break;
        }
        case 'piece': {
            // one of her pieces, standing on its foot (the bottom of its box), swaying if it is a plant
            const box = boxOf(item.name), k = item.scale;
            const lean = item.sway ? wind(item.x) * item.sway + (l?.bend ?? 0) * 0.5 : 0;
            c.save(); c.rotate(lean); c.scale(item.flip, 1);
            // what grows out of it (the big fern's sprouts), behind its fronds, from where she drew it, bending a little more
            // (each round the foot of its stem, the second the other way and a little out of step)
            const extra = WITH[item.name];
            for (const sp of (extra && item.sprouts) || []) {
                const own = boxOf(extra.name), foot = extra.foot * UNIT;
                const fx = (own[0] - box[0] + foot) * k - box[2] * k / 2, fy = (own[1] + own[3] - box[1]) * k - box[3] * k;
                c.save(); c.translate(fx, fy);
                c.rotate(lean * extra.sway + sp.tilt + (sp.phase ? wind(item.x + sp.phase * 400) * 0.3 : 0));
                c.scale(sp.flip * sp.size, sp.size);
                sp.P ??= colourOf(item.zone, sp.role, sp.pick);
                piece(c, extra.name, -foot * k, -own[3] * k, k, sp.P, col, !PIECES[extra.name].fill);
                c.restore();
            }
            piece(c, item.name, -box[2] * k / 2, -box[3] * k, k, P, col, !PIECES[item.name].fill);
            // by night the mushrooms and the glowing plants let go of spores, which rise from them and fade
            const dark = night();
            if (dark > 0.05 && SPORES.has(item.name)) {
                const seed = (item.x * 0.013) % 10;
                for (let n = 0; n < 4; n++) {
                    const t = (time * 0.11 + n / 4 + seed) % 1, a = dark * Math.sin(Math.PI * t) * 0.85;
                    const sx = (Math.sin(t * 5 + n * 2.1 + seed) * 0.25 + (n / 3 - 0.5) * 0.4) * box[2] * k, sy = -box[3] * k * 0.75 - t * 170;
                    c.fillStyle = `rgba(255,248,220,${a})`; c.beginPath(); c.arc(sx, sy, 2.6 + 1.4 * (1 - t), 0, Math.PI * 2); c.fill();
                }
            }
            c.restore();
            break;
        }
        case 'tree': {
            // her tree, round its foot: the trunk with its roots, its bark, and its crown swaying a little with the wind
            // about the top of the trunk (its plants and stones are spread over the world, each on the ground). The crown's
            // colour goes behind the trunk, its line over it
            const k = TREE.scale, part = (name, colour, opts = {}) => {
                const box = boxOf(name), left = (box[0] - TREE.foot.x) * k, top = (box[1] - TREE.foot.y) * k;
                if (opts.sway) {
                    const px = left + box[2] * k / 2, py = top + box[3] * k;
                    c.save(); c.translate(px, py); c.rotate(opts.sway); c.translate(-px, -py);
                    piece(c, name, left, top, k, PALETTE[colour], col, opts.tintLine, opts.layer);
                    c.restore();
                } else piece(c, name, left, top, k, PALETTE[colour], col, opts.tintLine, opts.layer);
            };
            const sway = wind(item.x) * 0.04;
            part('crown', 1, { sway, layer: 'fill' });
            part('trunk', 4); part('bark', 4);
            part('crown', 1, { sway, layer: 'line' });
            break;
        }
        case 'place': {
            // a zone's special place, in front of the world's plants round it, answering him as he meditates there (g)
            const P = item.place, g = l?.glow ?? 0, B = (name) => boxOf(name);
            const at = (name, x, y, k = 1) => piece(c, name, x, y, k, P_, col, false);
            const P_ = item.P;
            const halo = (x, y, radius, rgb, a) => {
                if (a <= 0.01) return;
                const gr = c.createRadialGradient(x, y, 0, x, y, radius);
                gr.addColorStop(0, `rgba(${rgb.join(',')},${a})`); gr.addColorStop(1, `rgba(${rgb.join(',')},0)`);
                c.fillStyle = gr; c.beginPath(); c.arc(x, y, radius, 0, Math.PI * 2); c.fill();
            };
            // (a piece of the place, where the card has it round its anchor)
            const part = (name) => { const a = PIECES[name].at, u = PIECES[name].unit; return [(a[0] - P.anchor[0]) * u, (a[1] - P.anchor[1]) * u]; };
            if (P.kind === 'nest') {
                // Metta's nest of mushrooms, breathing a little, in the warm light of the great one as he meditates by it
                const [, , w, h] = B('nest'), [x, y] = part('nest'), breath = 1 + 0.01 * col * Math.sin(time * 1.1);
                halo(x + w / 2, y + h * 0.4, w * (0.7 + 0.5 * g), [252, 228, 156], 0.12 + 0.45 * g);
                halo(x + w / 2, y + h * 0.3, w * (0.35 + 0.3 * g), [0, 180, 204], 0.08 + 0.35 * g);
                c.save(); c.scale(1, breath); at('nest', x, y); c.restore();
            } else if (P.kind === 'pond') {
                // lying on the ground (seen from his height, squashed), with rings going out over it as he meditates by it
                const [, , w, h] = B('pond'), flat = 0.5;
                c.save(); c.scale(1, flat);
                at('pond', -w / 2, -h);
                c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 6;
                for (let n = 0; n < 3; n++) {
                    const ph = (time * 0.25 + n / 3) % 1, a = (0.15 + 0.6 * g) * (1 - ph);
                    if (a < 0.02) continue;
                    c.globalAlpha *= a; c.beginPath(); c.ellipse(0, -h * 0.5, w * 0.08 + w * 0.3 * ph, h * 0.08 + h * 0.3 * ph, 0, 0, Math.PI * 2); c.stroke(); c.globalAlpha /= a;
                }
                c.restore();
            } else if (P.kind === 'fire') {
                // the logs and the flame over them (with the yellow one inside it), flickering about its foot, growing as he
                // meditates by it, with its warm light
                const [, , fw, fh] = B('flame'), [fx, fy] = part('flame'), [lx, ly] = part('logs');
                // (in ink it barely flickers; alive, it dances and throws embers that rise and fade)
                const live = 0.2 + 0.8 * col, grow = 1 + 0.2 * g;
                const sy = (1 + (0.07 * Math.sin(time * 7.1) + 0.04 * Math.sin(time * 12.7)) * live) * grow, sx = (1 - 0.05 * Math.sin(time * 8.3) * live) * grow;
                const footX = fx + fw / 2, footY = fy + fh;
                halo(footX, footY - fh * 0.35 * grow, fh * 0.75 * grow, [255, 190, 150], (0.25 + 0.35 * g) * live);
                c.save(); c.translate(footX, footY); c.scale(sx, sy); at('flame', -fw / 2, -fh); c.restore();
                at('logs', lx, ly);
                if (col > 0.05) {
                    for (let n = 0; n < 14; n++) {
                        const tt = (time * 0.45 + n / 14) % 1, a = col * Math.sin(Math.PI * tt) * 0.9;
                        const ex = footX + Math.sin(n * 7.3 + tt * 5) * fw * 0.35 * (0.4 + tt), ey = footY - fh * 0.5 - tt * fh * 1.1;
                        c.fillStyle = n % 3 ? `rgba(255,226,133,${a})` : `rgba(255,140,170,${a})`;
                        c.beginPath(); c.arc(ex, ey, 4 * (1 - tt) + 1.5, 0, Math.PI * 2); c.fill();
                    }
                }
            }
            break;
        }
        case 'butterfly': case 'bee': {
            // by day only, little lights as the fireflies are by night, that move as insects do: one (in the zone's colours)
            // wanders slowly in curves and flutters, rising in small jumps with each beat of its wings, a short trail
            // fading behind it; two or three golden ones buzz about a point in quick tight loops, now and then darting off
            const day = light();
            if (day < 0.05) break;
            const ph = item.phase;
            const dot = (x, y, r, rgb, a) => {
                const gr = c.createRadialGradient(x, y, 0, x, y, r * 5);
                gr.addColorStop(0, `rgba(${rgb.join(',')},${0.6 * a})`); gr.addColorStop(1, `rgba(${rgb.join(',')},0)`);
                c.fillStyle = gr; c.beginPath(); c.arc(x, y, r * 5, 0, Math.PI * 2); c.fill();
                c.fillStyle = `rgba(${rgb.join(',')},${a})`; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
                c.fillStyle = `rgba(255,255,250,${0.85 * a})`; c.beginPath(); c.arc(x, y, r * 0.45, 0, Math.PI * 2); c.fill();
            };
            if (item.kind === 'butterfly') {
                const at = (t) => [
                    Math.sin(t * 0.38 + ph) * 170 + Math.sin(t * 1.05 + ph * 2) * 45,
                    -95 - Math.sin(t * 0.55 + ph * 3) * 45 - Math.abs(Math.sin(t * 8.5 + ph)) * 14,
                ];
                const rgb = item.P.light.map((v) => Math.round(v * 0.45 + 255 * 0.55));
                for (let k = 4; k >= 1; k--) { const [x, y] = at(time - k * 0.09); dot(x, y, 6, rgb, day * 0.35 * (1 - k / 5)); }
                const [x, y] = at(time);
                dot(x, y, 10, rgb, day);
            } else {
                const cx = Math.sin(time * 0.3 + ph) * 120, cy = -60 - Math.sin(time * 0.45 + ph * 2) * 25;
                const dart = Math.max(0, Math.sin(time * 0.6 + ph)) ** 12 * 140;
                for (let n = 0; n < 3; n++) {
                    const t = time * (5 + n * 1.3) + ph + n * 2.1, r = 22 + n * 7;
                    const x = cx + Math.cos(t) * r + Math.sin(t * 2.7) * 6 + dart * (n - 1);
                    const y = cy + Math.sin(t * 1.3) * r * 0.55 + Math.sin(time * 23 + n) * 2.5;
                    dot(x, y, 6, [255, 226, 120], day);
                }
            }
            break;
        }
        case 'firefly': {
            // a warm light drifting and blinking low over the ground, only by night
            const dark = night();
            if (dark < 0.05) break;
            const ph = item.phase, blink = Math.max(0, Math.sin(time * 1.7 + ph)) ** 2;
            const x = Math.sin(time * 0.5 + ph) * 40 + Math.sin(time * 1.3 + ph * 2) * 12, y = -item.high - Math.sin(time * 0.8 + ph * 3) * 26;
            const a = dark * (0.25 + 0.75 * blink);
            const gr = c.createRadialGradient(x, y, 0, x, y, 22);
            gr.addColorStop(0, `rgba(255,236,150,${0.55 * a})`); gr.addColorStop(1, 'rgba(255,236,150,0)');
            c.fillStyle = gr; c.beginPath(); c.arc(x, y, 22, 0, Math.PI * 2); c.fill();
            c.fillStyle = `rgba(255,250,214,${a})`; c.beginPath(); c.arc(x, y, 3.2, 0, Math.PI * 2); c.fill();
            break;
        }
        case 'being': {
            // one of the characters round a place, with its own way (WAYS): still while it is in ink; once he comes and it
            // takes its colour the scene comes alive (`col`): it breathes, moves in its way (in Celebración they all dance
            // to one beat), blinks and glances at him, hops when he comes, and glows while he meditates there
            const [, , w, h] = boxOf(item.name), g = l?.glow ?? 0, hop = l?.hop ?? 0, a = col, t = time, ph = item.phase;
            const way = WAYS[item.name] ?? 'still', beat = t * Math.PI * 2 * 0.85;
            let rot = ((l?.lean ?? 0) * 0.06 + wind(item.x) * 0.1) * a, lift = Math.sin(Math.PI * hop) * 30 * a, sy = 1 + 0.018 * a * Math.sin(t * 1.5 + ph);
            if (way === 'rock') rot += 0.05 * a * Math.sin(t * 1.1 + ph);
            else if (way === 'nod') rot += 0.05 * a * Math.max(0, Math.sin(t * 1.4 + ph)) ** 3;
            else if (way === 'doze') rot += 0.07 * a * (0.5 + 0.5 * Math.sin(t * 0.35 + ph)) - 0.035 * a;
            else if (way === 'pair') rot += 0.05 * a * Math.sin(t * 0.9);
            else if (way === 'hum') sy += 0.02 * a * Math.sin(t * 3.2 + ph);
            else if (way === 'sniff') rot -= 0.05 * a * Math.max(0, Math.sin(t * 2.6 + ph)) ** 6;
            else if (way === 'hop') lift += 34 * a * Math.max(0, Math.sin(t * 1.9 + ph)) ** 10;
            else if (way === 'sway') rot += 0.08 * a * Math.sin(beat / 2 + ph);
            else if (way === 'bounce') { lift += 16 * a * Math.abs(Math.sin(beat / 2 + ph)); sy -= 0.03 * a * Math.max(0, Math.cos(beat + ph)); }
            else if (way === 'jump') lift += 40 * a * Math.max(0, Math.sin(beat / 2 + ph)) ** 6;
            else if (way === 'clap') { sy -= 0.05 * a * Math.abs(Math.sin(beat)); rot += 0.04 * a * Math.sin(beat / 2); }
            if (g > 0.01) {
                const gr = c.createRadialGradient(0, -h * 0.5, 0, 0, -h * 0.5, h * 0.7);
                gr.addColorStop(0, `rgba(255,240,200,${0.35 * g})`); gr.addColorStop(1, 'rgba(255,240,200,0)');
                c.fillStyle = gr; c.beginPath(); c.arc(0, -h * 0.5, h * 0.7, 0, Math.PI * 2); c.fill();
            }
            c.save(); c.translate(0, -lift); c.rotate(rot); c.scale(1 / Math.sqrt(sy), sy);
            piece(c, item.name, -w / 2, -h, 1, item.P, col, false);
            // its eyes, where the card has them: they blink now and then and, alive, look a little towards him
            const eyes = EYES[item.name];
            if (eyes) {
                const at = PIECES[item.name].at, ea = PIECES[eyes].at, u = PIECES[item.name].unit, [, , ew, eh] = boxOf(eyes);
                const ex = -w / 2 + (ea[0] - at[0]) * u + Math.sign(l?.lean ?? 0) * 4 * a, ey = -h + (ea[1] - at[1]) * u;
                const shut = ((t + ph * 3) % 4.7) < 0.14 && a > 0.5 ? 0.15 : 1;
                c.save(); c.translate(ex + ew / 2, ey + eh / 2); c.scale(1, shut);
                piece(c, eyes, -ew / 2, -eh / 2, 1, item.P, col, true);
                c.restore();
            }
            c.restore();
            break;
        }
        case 'stipple': {
            c.fillStyle = mark_;
            for (const [x, y, rr] of item.dots) { c.beginPath(); c.arc(x, y, rr, 0, Math.PI * 2); c.fill(); }
            break;
        }
        }
    }

    // What is on the screen, back to front, filtered (to draw what is behind him and what is in front of him apart);
    // view: { x0, cam, groundAt(d), scaleAt(d), width }. What stands just in front of him (`him`: { x, d }) is drawn
    // faint, so it never hides him
    // The tree is a trunk with roots, not a flat card: it counts as standing TREE.behind further back than its foot, so
    // sitting at its roots, under its crown, he is in front of its trunk and its roots
    const order = (item) => item.kind === 'tree' ? item.d + TREE.behind : item.d;
    // Where he is sitting, if it is at a place: under the crown of her tree (in front of its roots, too), or in front of
    // a zone's place: { P, x }
    function placeAt(x, d) {
        for (const near of placesNear(x - 1500, x + 1500, d - 1500, d + 1500)) {
            const { P } = near;
            if (P.kind === 'tree') {
                const crown = boxOf('crown'), middle = near.x + (crown[0] + crown[2] / 2 - TREE.foot.x) * TREE.scale;
                if (Math.abs(x - middle) < crown[2] * TREE.scale * 0.42 && d > near.d - 520 && d < near.d + 200) return near;
            } else if (P.sit && Math.abs(x - near.x) < P.sit.w && d > near.d - P.sit.front && d < near.d + P.sit.back) return near;
        }
        return null;
    }
    // (view.near, view.far: the depths at the bottom of the screen and at the horizon)
    function draw(c, view, keep, him = null) {
        const half = view.width / 2 / view.scaleAt(view.far) + 400;
        const shown = [];
        for (const item of patches(view.cam - half, view.cam + half, view.near - 400, view.far + 200)) {
            if (item.kind !== 'streak' && order(item) <= view.far + (item.kind === 'tree' ? 200 : 0) && item.d > view.near - 400 && keep(order(item))) shown.push(item);
        }
        shown.sort((a, b) => order(b) - order(a));
        for (const item of shown) {
            const s = view.scaleAt(item.d), x = view.x0 + (item.x - view.cam) * s;
            const reach = (item.reach ?? 300) * s;
            if (x < -reach || x > view.width + reach) continue;
            c.save(); c.translate(x, view.groundAt(item.d)); c.scale(s, s);
            const tall = item.kind === 'piece' && TALL.has(item.name);
            if (him && tall && item.d < him.d && him.d - item.d < 220 && Math.abs(item.x - him.x) < 150) c.globalAlpha = 0.22;
            // (what comes over the horizon fades in, so nothing pops up there)
            c.globalAlpha *= Math.max(0, Math.min(1, (view.far - item.d) / 260));
            drawItem(c, item);
            c.restore();
        }
    }

    // How much light there is: 1 all day, 0 all night, a soft dusk and dawn between
    // (where it is always night, Celebración's clearing, there is no day)
    const light = () => { const v = 0.5 + 2.8 * Math.sin(clock * Math.PI * 2); return Math.max(0, Math.min(1, v)) * (1 - screen.dark); };   // (a short dusk)
    const lerp = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
    const detailRgb = () => lerp(screen.detailNight, screen.detailDay, light());

    // The sky: Ciclos's yellow by day, clearing as night comes so the cards' starry night behind it shows (the page draws
    // it, useStarField.js); the sun by day and the moon by night, each rising from under the horizon, crossing the sky
    // and setting under it (the ground, drawn after, hides them); and its clouds, solid white as in the card
    function drawSky(c, view, top, bottom) {
        lastCam = view.cam;
        lastD = view.d ?? lastD;
        screen = blend(zonesAt(view.cam, lastD));
        const L = light(), H = bottom - top;
        c.clearRect(0, top, view.width, H + 2);
        c.globalAlpha = L; c.fillStyle = css(screen.sky); c.fillRect(0, top, view.width, H + 2); c.globalAlpha = 1;
        const scale = H / 1300 * 0.55;
        const along = (t, r) => ({ x: view.width * (0.06 + 0.88 * t), y: bottom + r - (bottom + r - (top + H * 0.4)) * Math.sin(Math.PI * t) });   // (high, but under the buttons)
        const sunT = clock < 0.5 ? clock / 0.5 : null, moonT = clock >= 0.5 ? (clock - 0.5) / 0.5 : null;
        const drawMoon = (t, alpha) => {
            if (!moon?.complete || !moon.naturalWidth || alpha <= 0.01) return;
            const m = ciclos.moon, [bx, by, bw, bh] = ciclos.boxes.moon, p = along(t, m.r * scale * 1.1);
            c.globalAlpha = alpha;
            c.drawImage(moon, p.x + (bx - m.x) * scale, p.y + (by - m.y) * scale, bw * scale, bh * scale);
            c.fillStyle = css(screen.ink); c.globalAlpha = 0.55 * alpha;
            for (const [x, y, r] of m.dots) { c.beginPath(); c.arc(p.x + (x - m.x) * scale, p.y + (y - m.y) * scale, r * scale, 0, Math.PI * 2); c.fill(); }
            c.globalAlpha = 1;
        };
        // (where it is always night, Celebración's clearing, the moon takes the sun's way across the sky too)
        if (sunT != null) {
            if (screen.dark < 0.99) { c.globalAlpha = 1 - screen.dark; drawSun(c, along(sunT, ciclos.sun.r * scale * 1.6), scale); c.globalAlpha = 1; }
            drawMoon(sunT, screen.dark);
        }
        if (moonT != null) drawMoon(moonT, 1);
        if (!clouds?.complete || !clouds.naturalWidth) return;
        const cs = H / 1300, span = Math.max(view.width * 1.6, 2160 * cs * 1.25);
        for (const m of sky) {                                                // solid, as the card's, day and night
            const x = ((((m.x * span + time * m.speed - view.cam * 0.15) % span) + span) % span) - m.w * cs;
            c.drawImage(clouds, m.ax, m.ay, m.w, m.h, x, top + m.y * H * 0.92, m.w * cs, m.h * cs);
        }
    }
    // The card's living sun, as SceneCiclos draws it: a warm light round it and its own light, breathing, the disc only as
    // big as where the sun is still whole, and over its edge its stippled corona read from the card (scripts/sun-cloud.mjs)
    // as dots that drift, tremble and twinkle, so the disc and its stipple are one and no circle shows
    let corona = null;
    function drawSun(c, p, scale) {
        const sun = ciclos.sun;
        corona ??= sampleCloud(decodeCloud(sun.cloud), (u, v) => [u - sun.x, v - sun.y], 1).map(([x, y, size]) => [x, y, size, Math.random() * 100]);
        const breath = Math.sin(time * 0.6), solid = sun.cloud.solid * scale, rgb = screen.sun.map(Math.round);
        const glow = (radius, colour, stops) => {
            const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
            for (const [at, a] of stops) g.addColorStop(at, `rgba(${colour.join(',')},${a})`);
            c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y, radius, 0, Math.PI * 2); c.fill();
        };
        glow(solid * 3.4 * (1 + 0.03 * Math.sin(time * 0.4)), [255, 160, 112], [[0, 0.28], [0.3, 0.1], [0.7, 0]]);
        glow(solid * 2.3 * (1 + 0.04 * breath), rgb, [[0, 0.7 + 0.12 * breath], [0.36, 0.3], [0.62, 0]]);
        c.fillStyle = css(screen.sun);
        c.beginPath(); c.arc(p.x, p.y, solid, 0, Math.PI * 2); c.fill();
        for (const [x, y, size, ph] of corona) {
            const dx = Math.sin(time * 0.7 + ph) * 4 + Math.sin(time * 5.3 + ph * 3.1) * 0.9;   // drifting, trembling
            const dy = Math.cos(time * 0.55 + ph * 1.3) * 4 + Math.cos(time * 4.7 + ph * 2.3) * 0.9;
            const r = size / 2 * (1 + 0.3 * Math.sin(time * 2.1 + ph));                         // twinkling
            c.beginPath(); c.arc(p.x + (x + dx) * scale, p.y + (y + dy) * scale, r * scale, 0, Math.PI * 2); c.fill();
        }
    }

    // How dark it is (0 day .. 1 night), for the page's starry night
    const night = () => 1 - light();
    // The ground: the card's hills, green by day and yellow by night
    const ground = () => `rgb(${lerp(screen.groundNight, screen.groundDay, light()).map(Math.round).join(',')})`;
    // Its streaks (yellow by day, mustard by night): small brush strokes lying flat on the ground under everything
    function drawGround(c, view) {
        const half = view.width / 2 / view.scaleAt(view.far) + 400;
        c.fillStyle = c.strokeStyle = `rgb(${detailRgb().map(Math.round).join(',')})`;
        for (const item of patches(view.cam - half, view.cam + half, view.near - 100, view.far)) {
            if (item.kind !== 'streak' || item.d > view.far || item.d < view.near - 100) continue;
            const s = view.scaleAt(item.d), x = view.x0 + (item.x - view.cam) * s;
            c.save(); c.translate(x, view.groundAt(item.d)); c.scale(s, s);
            c.globalAlpha = Math.max(0, Math.min(1, (view.far - item.d) / 260));
            if (item.oval) { c.beginPath(); c.ellipse(0, 0, item.oval.rx, item.oval.ry, 0, 0, Math.PI * 2); c.fill(); }
            else for (const k of item.strokes) {
                c.lineWidth = k.wide; c.lineCap = 'round';
                c.beginPath(); c.moveTo(k.dx - k.long / 2, 0); c.quadraticCurveTo(k.dx, k.bend, k.dx + k.long / 2, k.tilt); c.stroke();
            }
            c.restore();
        }
    }

    // The card of the place he is at (x, depth), if any: its id in src/data/cards.json
    const placeCard = (x, d) => placeAt(x, d)?.P.id ?? null;

    // What stands in his way near x (within `range`): circles on the floor { x, d, r }
    function obstacles(x, d, range) {
        const out = [];
        {
            for (const item of patches(x - range - 400, x + range + 400, d - range - 600, d + range + 600)) {
                if (item.kind === 'tree') out.push({ x: item.x + TRUNK.dx, d: item.d + TRUNK.behind, r: TRUNK.r }, { x: item.x + ROOTS.dx, d: item.d + ROOTS.dd, r: ROOTS.r, rd: ROOTS.rd, low: true });
                else if (item.kind === 'place' && item.place.block) {
                    const b = item.place.block;
                    out.push({ x: item.x, d: item.d + (b.dd ?? 0), r: b.r, ...(b.rd ? { rd: b.rd } : {}) });
                } else if (item.kind === 'piece' && BLOCKS.has(item.name)) out.push({ x: item.x, d: item.d, r: boxOf(item.name)[2] * item.scale * 0.36 });
            }
        }
        return out.filter((o) => Math.abs(o.x - x) < range + o.r && Math.abs(o.d - d) < range + (o.rd ?? o.r) + 200);
    }

    // (setClock: to look at a given hour from the console, 0 sunrise .. 0.75 midnight)
    // The colours of the zone on the screen, for the page: Sid's line and body, and the colour under the starry night
    const ink = () => css(screen.ink), white = () => css(screen.white), nightColour = () => css(screen.night);
    // The card of the zone on the screen (its id), for the music
    const zoneCard = () => mainZone(zonesAt(lastCam, lastD)).id;
    return { update, draw, drawSky, drawGround, ground, night, ink, white, nightColour, placeCard, zoneCard, obstacles, setClock: (v) => { clock = ((v % 1) + 1) % 1; } };
}
