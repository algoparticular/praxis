// The inside of Gratitud's house, for the hide and seek (HideSeek.vue): a Japanese room, as its roof outside (the eaves
// turned up) asks: tatami on the floor, wooden posts and a beam on its plaster walls, shoji on one side, a round window,
// a hanging scroll, a paper lantern and a bonsai; its hiding places a closet with sliding doors (oshiire), a bamboo
// blind (sudare), a futon on the floor, a pile of floor cushions (zabuton), a bamboo basket, a low table under its quilt
// (kotatsu), a dark chest (nagamochi) and a folding screen (byōbu); the stone step inside the door (genkan) has sand
// from the garden on it. Seen as Sid's world is seen, a floor in perspective going back to a wall. Everything is drawn
// in code, in the colours of the house in the card (its coral roof, its peach walls, its purple and its teal) with the
// world's ink, and drawn as by hand: every line
// wavers a little (the same way each frame), the walls and the floor are stippled, things cast a soft shadow and their
// sides are hatched, as she draws. A sketch to draw over: the illustrator will draw the inside by hand.
//
// Coordinates as in the world: x across (0 in the middle of the room), d into the distance (0 near the front), up in
// px over the floor. A camera `cam` ({ x0, cam, groundAt(d), scaleAt(d), perDepth }) puts a point on the screen.

export const INK = '#102A34';
const C = {
    cream: '#FBF4E4', coral: '#F5797A', coralDark: '#D85A5E', peach: '#FBC390', peachDark: '#EFAE78', teal: '#029EA2',
    tealDark: '#0C666E', purple: '#9C72C8', purpleDark: '#7E58AE', sand: '#E8C79C', sandDark: '#C19D75', aqua: '#9EE0DA',
    sky: '#73CBCF', sea: '#2AA8A6', sun: '#F5797A', wood: '#C99A68', woodDark: '#A47A4E', wicker: '#E2B877', wickerDark: '#B8894A',
    tatami: '#D8CE90', heri: '#3F5E4C', post: '#7A5232', paper: '#FBF6E8', bamboo: '#D9B26A', lacquer: '#4A2E1C', gold: '#EACB7A',
    stone: '#A9A595', ochre: '#E8B84A',
};

// The room comes in two shapes, so it fills the screen it is played on: long, going back from us, on a phone held
// upright (`tall`), and wide on a computer or a phone on its side (`wide`); the same eight hiding places, put where
// each shape has room. `setLayout` chooses one (HideSeek.vue does it only between turns, so nothing moves while
// someone is hidden). Each: the room (its walls at x0 and x1, its back wall at d1, its floor from d0, the front, open
// to us as a doll's house), where they can walk (a little in from the walls), the door in the left wall (from d to
// d + w, up to h), the round rug (soft: nobody leaves a footprint on it), the window and the picture, the hiding places
// (each: its middle on the floor, how wide, how deep, how high; where Sid stands to go into it or to look in it,
// `spot`), and what only stands there (a plant in its pot, a lamp: in the way, not a hiding place)
const NAMES = {
    wardrobe: ['el armario', 'the closet'], curtain: ['la persiana de bambú', 'the bamboo blind'], bed: ['el futón', 'the futon'],
    sofa: ['los almohadones', 'the cushions'], basket: ['el canasto', 'the basket'], table: ['la mesa baja', 'the low table'],
    chest: ['el baúl', 'the chest'], screen: ['el biombo', 'the screen'],
};
// [id, x, d, w, dd, h, spot x, spot d]
const LAYOUTS = {
    tall: {
        room: { x0: -1150, x1: 1150, d0: -300, d1: 2500 }, bounds: { x0: -1070, x1: 1070, d0: -230, d1: 2410 },
        door: { d: 1150 }, rug: { x: 0, d: 1050, rx: 420, rd: 360 }, window: [-260, 300], picture: { x: 'x1', d: 420 },
        sand: [[-150, 190, 220, 130], [60, 1800, 170, 140], [-320, 2100, 180, 110]],
        spots: [['wardrobe', -680, 2380, 440, 190, 1000, -680, 2180], ['curtain', 760, 2470, 260, 40, 1060, 760, 2320],
            ['bed', 720, 1650, 500, 640, 160, 720, 1220], ['sofa', -640, 1720, 320, 300, 420, -640, 1460],
            ['basket', 760, 900, 260, 220, 380, 760, 690], ['table', -120, 620, 440, 380, 300, -120, 310],
            ['chest', 720, 280, 360, 240, 330, 720, 60], ['screen', -720, 180, 380, 90, 760, -720, -50]],
        decor: [['plant', 1010, 2360, 150, 140, 250], ['lamp', 420, 2360, 160, 160, 520]],
    },
    wide: {
        room: { x0: -1750, x1: 1750, d0: -300, d1: 1700 }, bounds: { x0: -1670, x1: 1670, d0: -230, d1: 1610 },
        door: { d: 650 }, rug: { x: 200, d: 650, rx: 430, rd: 330 }, window: [-250, 250], picture: { x: 'x1', d: 380 },
        sand: [[-650, 540, 220, 140], [480, 1300, 200, 130], [950, -90, 200, 110]],
        spots: [['wardrobe', -1150, 1580, 440, 190, 1000, -1150, 1380], ['curtain', 760, 1670, 260, 40, 1060, 760, 1520],
            ['bed', 1250, 1000, 500, 640, 160, 1250, 570], ['sofa', -550, 1150, 320, 300, 420, -550, 890],
            ['basket', 820, 560, 260, 220, 380, 820, 350], ['table', -1100, 330, 440, 380, 300, -1100, 20],
            ['chest', 1350, 130, 360, 240, 330, 1350, -110], ['screen', -250, 150, 380, 90, 760, -250, -90]],
        decor: [['plant', 1560, 1560, 150, 140, 250], ['lamp', 450, 1560, 160, 160, 520]],
    },
};
export const ROOM = { wall: 1150, wainscot: 360 };
export const BOUNDS = {};
export const DOOR = { w: 330, h: 760 };
export const ENTRY = { from: {}, to: {} };
export const RUG = {};
export const SPOTS = [];
const DECOR = [];
const WALL = {};
export const onRug = (x, d) => ((x - RUG.x) / RUG.rx) ** 2 + ((d - RUG.d) / RUG.rd) ** 2 < 1;
// The island's sand: a mat of it inside the door (they come in from the garden with it on their feet) and a few
// patches blown in, where stepping dirties the feet again (HideSeek.vue: a dirty foot leaves a print, fainter each
// step, and is clean again after a few)
export const SAND = [];
export const onSand = (x, d) => SAND.some((p) => ((x - p.x) / p.rx) ** 2 + ((d - p.d) / p.rd) ** 2 < 1);
let SAND_DOTS = [];
export let layout = null;
// (the stipple of the floor and the walls, made again for each shape)
const rand = (() => { let n = 7; return () => { n = (n * 16807) % 2147483647; return n / 2147483647; }; })();
let FLOOR_DOTS = [], WALL_DOTS = [];
export function setLayout(name) {
    if (name === layout) return false;
    layout = name;
    const L = LAYOUTS[name];
    Object.assign(ROOM, L.room); Object.assign(BOUNDS, L.bounds); Object.assign(DOOR, L.door); Object.assign(RUG, L.rug);
    Object.assign(WALL, { window: L.window, picture: L.picture });
    Object.assign(ENTRY.from, { x: ROOM.x0 - 60, d: DOOR.d + DOOR.w / 2 }); Object.assign(ENTRY.to, { x: ROOM.x0 + 210, d: DOOR.d + DOOR.w / 2 - 40 });
    SPOTS.length = 0;
    for (const [id, x, d, w, dd, h, sx, sd] of L.spots) SPOTS.push({ id, es: NAMES[id][0], en: NAMES[id][1], x, d, w, dd, h, spot: { x: sx, d: sd } });
    SAND.length = 0;
    SAND.push({ x: ROOM.x0 + 150, d: DOOR.d + DOOR.w / 2, rx: 130, rd: 190, mat: true });
    for (const [x, d, rx, rd] of L.sand) SAND.push({ x, d, rx, rd });
    // (each patch a stipple of grains, thicker in its middle, its edge ragged)
    SAND_DOTS = SAND.flatMap((p) => Array.from({ length: Math.round(p.rx * p.rd / 420) }, () => {
        const a = rand() * Math.PI * 2, r = Math.pow(rand(), 0.7) * (0.85 + 0.25 * Math.sin(a * 3 + p.x));
        return { x: p.x + Math.cos(a) * r * p.rx, d: p.d + Math.sin(a) * r * p.rd, r: 6 + rand() * 7, k: rand() };
    }));
    DECOR.length = 0;
    for (const [id, x, d, w, dd, h] of L.decor) DECOR.push({ id, x, d, w, dd, h });
    const area = (ROOM.x1 - ROOM.x0) * (ROOM.d1 - ROOM.d0) / 5.7e6;
    FLOOR_DOTS = Array.from({ length: Math.round(520 * area) }, () => ({ x: ROOM.x0 + rand() * (ROOM.x1 - ROOM.x0), d: ROOM.d0 + rand() * (ROOM.d1 - ROOM.d0), r: 2 + rand() * 3 }));
    // (denser low on the walls, as her shading)
    WALL_DOTS = Array.from({ length: 360 }, () => ({ u: rand(), up: ROOM.wainscot + Math.pow(rand(), 1.8) * (ROOM.wall - ROOM.wainscot), r: 2 + rand() * 2.5 }));
    return true;
}
setLayout('tall');

// What stands in the way, for the puppets: an ellipse round each thing
export function obstacles() {
    return [...SPOTS, ...DECOR].map((o) => ({ x: o.x, d: o.d, r: o.w / 2 + 40, rd: o.dd / 2 + 40 }));
}

// The live state of each hiding place: open (looking in it, 0..1), a tremble (the one hiding moves a little), seen
// (looked in and empty), lit (just touched), sloppy (hidden in a hurry: a foot shows)
export function createSpots() {
    return SPOTS.map((s) => ({ ...s, open: 0, openTo: 0, shake: 0, seen: false, lit: 0, sloppy: null, box: null }));
}

// --- Drawing by hand ---
// Every line wavers a little, the same way each frame: each shape drawn takes the next number of a sequence that starts
// again every frame (beginFrame), so as the drawing does not change, neither does its wavering
let seq = 0;
export function beginFrame() { seq = 0; }
const wob = (n, i) => Math.sin(n * 12.9898 + i * 78.233) * 0.6 + Math.sin(n * 4.1 + i * 2.7) * 0.4;
// a closed (or open) hand-drawn path through pts: each edge in short steps, each step pushed a little off the line
function handPath(c, pts, closed, amount) {
    const n = ++seq;
    c.beginPath();
    const count = closed ? pts.length : pts.length - 1;
    c.moveTo(pts[0].x, pts[0].y);
    let k = 0;
    for (let e = 0; e < count; e++) {
        const a = pts[e], b = pts[(e + 1) % pts.length], len = Math.hypot(b.x - a.x, b.y - a.y), steps = Math.max(1, Math.round(len / 34));
        const nx = -(b.y - a.y) / (len || 1), ny = (b.x - a.x) / (len || 1);
        for (let j = 1; j <= steps; j++) {
            const t = j / steps, off = j === steps ? 0 : wob(n, k++) * amount;
            c.lineTo(a.x + (b.x - a.x) * t + nx * off, a.y + (b.y - a.y) * t + ny * off);
        }
    }
    if (closed) c.closePath();
}
const P = (cam, x, d, up = 0) => { const s = cam.scaleAt(d); return { x: cam.x0 + (x - cam.cam) * s, y: cam.groundAt(d) - up * s }; };
function poly(c, pts, fill, line = 9, stroke = INK) {
    handPath(c, pts, true, Math.min(2.6, 0.9 + line * 0.18));
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (line) { c.strokeStyle = stroke; c.lineWidth = line; c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke(); }
}
const line = (c, a, b, w) => { handPath(c, [a, b], false, Math.min(2, 0.6 + w * 0.15)); c.strokeStyle = INK; c.lineWidth = w; c.lineCap = 'round'; c.stroke(); };
const dot = (c, p, r, fill = INK) => { c.fillStyle = fill; c.beginPath(); c.arc(p.x, p.y, r, 0, Math.PI * 2); c.fill(); };
// her hatching: a few short strokes along a face, from one of its edges in (a, b the edge; inward, the way in)
function hatch(c, a, b, inward, n, w) {
    c.strokeStyle = INK; c.lineCap = 'round';
    for (let i = 1; i <= n; i++) {
        const t = i / (n + 1), p = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }, long = (0.6 + 0.4 * Math.abs(wob(i, n))) * 1;
        c.lineWidth = w * (1.1 - 0.3 * t);
        c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x + inward.x * long, p.y + inward.y * long); c.stroke();
    }
}
// A box standing on the floor (x0..x1, d0..d1, from up h0 to h): the side that faces the camera (hatched), its top
// and its front
function box(c, cam, b, fills, lw) {
    const { x0, x1, d0, d1, h, h0 = 0 } = b;
    const s = cam.scaleAt((d0 + d1) / 2), w = lw * s;
    const sideFace = (x, way) => {
        const q = [P(cam, x, d0, h0), P(cam, x, d1, h0), P(cam, x, d1, h), P(cam, x, d0, h)];
        poly(c, q, fills.side, w);
        if (b.hatch !== false && h - h0 > 120) hatch(c, q[3], q[0], { x: way * 22 * s, y: 6 * s }, 4, w * 0.45);
    };
    if (x0 > cam.cam) sideFace(x0, 1);
    if (x1 < cam.cam) sideFace(x1, -1);
    poly(c, [P(cam, x0, d0, h), P(cam, x1, d0, h), P(cam, x1, d1, h), P(cam, x0, d1, h)], fills.top, w);
    poly(c, [P(cam, x0, d0, h0), P(cam, x1, d0, h0), P(cam, x1, d0, h), P(cam, x0, d0, h)], fills.front, w);
}
// A shape lying flat on the floor, an ellipse round (x, d) (rx across, rd in depth), as points
const floorEllipse = (cam, x, d, rx, rd, n = 40) => Array.from({ length: n }, (_, i) => { const a = i / n * Math.PI * 2; return P(cam, x + Math.cos(a) * rx, d + Math.sin(a) * rd); });
function shadow(c, cam, x, d, rx, rd, a = 0.13) {
    const pts = floorEllipse(cam, x, d, rx, rd, 28);
    c.fillStyle = `rgba(16,42,52,${a})`; c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y))); c.closePath(); c.fill();
}

// The room itself: the sky and the island outside (it is a doll's house: its front is open), its tatami, its walls
// with their posts, the shoji, the round window, the scroll, the sliding door and the stone step, the round straw mat,
// and the shadows of what stands on it
const WOOD_LINE = 7;
// a wooden post standing against a wall: on the side walls along d (x fixed), on the back wall along x
function post(c, cam, x, d, alongX, h) {
    const w = 46, s = cam.scaleAt(d);
    const q = alongX ? [P(cam, x - w / 2, d, 0), P(cam, x + w / 2, d, 0), P(cam, x + w / 2, d, h), P(cam, x - w / 2, d, h)]
        : [P(cam, x, d - w / 2, 0), P(cam, x, d + w / 2, 0), P(cam, x, d + w / 2, h), P(cam, x, d - w / 2, h)];
    poly(c, q, C.post, WOOD_LINE * s);
}
// shoji: paper in a lattice of thin wood, on a side wall (x fixed) from d0 to d1, from up u0 to u1
function shoji(c, cam, x, d0, d1, u0, u1) {
    const s = cam.scaleAt((d0 + d1) / 2);
    poly(c, [P(cam, x, d0, u0), P(cam, x, d1, u0), P(cam, x, d1, u1), P(cam, x, d0, u1)], C.paper, 8 * s);
    c.strokeStyle = C.post; c.lineWidth = 4 * s; c.lineCap = 'round';
    for (let i = 1; i < 3; i++) { const d = d0 + (d1 - d0) * i / 3, a = P(cam, x, d, u0), b = P(cam, x, d, u1); c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); }
    for (let i = 1; i < 5; i++) { const u = u0 + (u1 - u0) * i / 5, a = P(cam, x, d0, u), b = P(cam, x, d1, u); c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); }
}
export function drawRoom(c, cam, view, t) {
    const R = ROOM, s1 = cam.scaleAt(R.d1), BEAM = 820;
    c.fillStyle = C.sky; c.fillRect(0, 0, view.W, view.H);
    c.fillStyle = C.sea; c.fillRect(0, cam.groundAt(R.d0) - 40, view.W, view.H);
    // (the house's base under the open front, in the dark teal of its steps)
    poly(c, [P(cam, R.x0 - 40, R.d0), P(cam, R.x1 + 40, R.d0), P(cam, R.x1 + 40, R.d0, -120), P(cam, R.x0 - 40, R.d0, -120)], C.tealDark, 10 * cam.scaleAt(R.d0));
    // the floor: tatami, row after row going back, each mat twice as wide as it is deep, the rows offset by half a mat;
    // their straw in fine lines, their cloth edges (heri) dark green
    const fl = [P(cam, R.x0, R.d0), P(cam, R.x1, R.d0), P(cam, R.x1, R.d1), P(cam, R.x0, R.d1)];
    poly(c, fl, C.tatami, 0);
    c.save();
    c.beginPath(); fl.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y))); c.closePath(); c.clip();
    {
        const m = P(cam, (WALL.window[0] + WALL.window[1]) / 2, R.d1 - 300), r = 900 * cam.scaleAt(R.d1 - 300);
        const g = c.createRadialGradient(m.x, m.y, 0, m.x, m.y, r);
        g.addColorStop(0, 'rgba(255,246,214,0.5)'); g.addColorStop(1, 'rgba(255,246,214,0)');
        c.fillStyle = g; c.fillRect(m.x - r, m.y - r, r * 2, r * 2);
    }
    const ROW = 360;
    c.strokeStyle = 'rgba(120,112,52,0.28)'; c.lineCap = 'round';
    for (let d = R.d0; d < R.d1; d += ROW / 9) {
        const s = cam.scaleAt(d), a = P(cam, R.x0, d), b = P(cam, R.x1, d);
        c.lineWidth = 2 * s; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();
    }
    for (let d = R.d0, row = 0; d < R.d1; d += ROW, row++) {
        const s = cam.scaleAt(d);
        line(c, P(cam, R.x0, d), P(cam, R.x1, d), 3 * s);
        c.strokeStyle = C.heri; c.lineWidth = 14 * s;
        const a = P(cam, R.x0, d + 14), b = P(cam, R.x1, d + 14); c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();
        for (let x = R.x0 + (row % 2 ? 360 : 0) + 720; x < R.x1; x += 720) line(c, P(cam, x, d), P(cam, x, Math.min(R.d1, d + ROW)), 3 * cam.scaleAt(d + ROW / 2));
    }
    c.fillStyle = 'rgba(16,42,52,0.12)';
    for (const p of FLOOR_DOTS) { const q = P(cam, p.x, p.d), s = cam.scaleAt(p.d); c.beginPath(); c.arc(q.x, q.y, p.r * s, 0, Math.PI * 2); c.fill(); }
    c.restore();
    // the stone step inside the door, and the sand blown in: each patch a pale drift, its edge ragged, with its grains
    // over it (lighter than a footprint, never mistaken for one)
    for (const p of SAND) {
        const pts = Array.from({ length: 28 }, (_, i) => { const a = i / 28 * Math.PI * 2, r = 0.92 + 0.12 * Math.sin(a * 5 + p.x) + 0.06 * Math.sin(a * 11 + p.d); return P(cam, p.x + Math.cos(a) * p.rx * r, p.d + Math.sin(a) * p.rd * r); });
        if (p.mat) { poly(c, [P(cam, p.x - p.rx, p.d - p.rd), P(cam, p.x + p.rx, p.d - p.rd), P(cam, p.x + p.rx, p.d + p.rd), P(cam, p.x - p.rx, p.d + p.rd)], C.stone, 7 * cam.scaleAt(p.d)); continue; }
        c.fillStyle = 'rgba(250,234,196,0.85)'; c.beginPath(); pts.forEach((q, i) => (i ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y))); c.closePath(); c.fill();
    }
    for (const g of SAND_DOTS) {
        const q = P(cam, g.x, g.d), s = cam.scaleAt(g.d);
        c.fillStyle = g.k < 0.3 ? 'rgba(214,176,118,0.8)' : 'rgba(255,250,236,0.95)';
        c.beginPath(); c.arc(q.x, q.y, g.r * s, 0, Math.PI * 2); c.fill();
    }
    // the round straw mat (enza), its straw in a spiral
    {
        const s = cam.scaleAt(RUG.d);
        poly(c, floorEllipse(cam, RUG.x, RUG.d, RUG.rx, RUG.rd), C.bamboo, 8 * s);
        c.strokeStyle = 'rgba(122,82,50,0.55)'; c.lineWidth = 3 * s;
        c.beginPath();
        for (let i = 0; i <= 260; i++) { const a = i / 260 * Math.PI * 2 * 7, r = i / 260, q = P(cam, RUG.x + Math.cos(a) * RUG.rx * r * 0.95, RUG.d + Math.sin(a) * RUG.rd * r * 0.95); i ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y); }
        c.stroke();
    }
    // the side walls: plaster (peach, darker) over a wooden skirting, its posts and the beam across them; shoji along the
    // right one, the sliding door in the left one, and the scroll hanging on the right one
    for (const x of [R.x0, R.x1]) {
        const wall = [P(cam, x, R.d0), P(cam, x, R.d1), P(cam, x, R.d1, R.wall), P(cam, x, R.d0, R.wall)];
        poly(c, wall, C.peachDark, 10 * s1);
        c.save(); c.beginPath(); wall.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y))); c.closePath(); c.clip();
        c.fillStyle = 'rgba(16,42,52,0.14)';
        for (const p of WALL_DOTS) { const d = R.d0 + p.u * (R.d1 - R.d0), q = P(cam, x, d, p.up); c.beginPath(); c.arc(q.x, q.y, p.r * cam.scaleAt(d), 0, Math.PI * 2); c.fill(); }
        c.restore();
        poly(c, [P(cam, x, R.d0), P(cam, x, R.d1), P(cam, x, R.d1, 60), P(cam, x, R.d0, 60)], C.post, 6 * s1);
        if (x === R.x1) {
            const pd = WALL.picture.d;
            for (let d = R.d0 + 200; d + 520 < R.d1; d += 640) if (Math.abs(d + 260 - (pd + 130)) > 420) shoji(c, cam, x, d, d + 520, 80, BEAM - 30);
        }
        for (let d = R.d0 + 160; d < R.d1; d += 640) post(c, cam, x, d, false, R.wall);
        poly(c, [P(cam, x, R.d0, BEAM), P(cam, x, R.d1, BEAM), P(cam, x, R.d1, BEAM + 60), P(cam, x, R.d0, BEAM + 60)], C.post, 6 * s1);
    }
    {
        // the sliding door (fusuma): paper in the house's purple, its round pull
        const x = R.x0, d0 = DOOR.d, d1 = DOOR.d + DOOR.w, s = cam.scaleAt(d0);
        poly(c, [P(cam, x, d0, 0), P(cam, x, d1, 0), P(cam, x, d1, DOOR.h), P(cam, x, d0, DOOR.h)], C.purple, 9 * s);
        line(c, P(cam, x, (d0 + d1) / 2, 0), P(cam, x, (d0 + d1) / 2, DOOR.h), 5 * s);
        for (const [dd, k] of [[d0 + 60, 0], [d1 - 60, 1]]) { const q = P(cam, x, dd, DOOR.h * 0.45); c.strokeStyle = INK; c.lineWidth = 5 * s; c.beginPath(); c.arc(q.x, q.y, 14 * s, 0, Math.PI * 2); c.stroke(); void k; }
        // (a wave painted across it)
        c.strokeStyle = C.aqua; c.lineWidth = 6 * s;
        for (let i = 0; i < 3; i++) { const q = P(cam, x, d0 + 70 + i * 95, 220); c.beginPath(); c.arc(q.x, q.y, 28 * s, Math.PI * 1.05, Math.PI * 1.95); c.stroke(); }
    }
    {
        // the hanging scroll (kakejiku): a brush circle (ensō) in coral and the brand's three dots
        const x = R[WALL.picture.x], d = WALL.picture.d + 60, s = cam.scaleAt(d + 70);
        line(c, P(cam, x, d + 20, BEAM + 120), P(cam, x, d + 130, BEAM + 120), 4 * s);
        poly(c, [P(cam, x, d - 10, BEAM + 40), P(cam, x, d + 160, BEAM + 40), P(cam, x, d + 160, 260), P(cam, x, d - 10, 260)], C.woodDark, 7 * s);
        poly(c, [P(cam, x, d + 15, BEAM - 10), P(cam, x, d + 135, BEAM - 10), P(cam, x, d + 135, 320), P(cam, x, d + 15, 320)], C.paper, 4 * s);
        c.strokeStyle = C.coral; c.lineWidth = 12 * s; c.lineCap = 'round'; c.beginPath();
        for (let i = 0; i <= 30; i++) { const a = -1.2 + i / 30 * 5.6, q = P(cam, x, d + 75 + Math.cos(a) * 45, 620 + Math.sin(a) * 90); i ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y); }
        c.stroke();
        dot(c, P(cam, x, d + 55, 430), 9 * s, C.teal); dot(c, P(cam, x, d + 95, 430), 9 * s, C.purple); dot(c, P(cam, x, d + 75, 395), 9 * s, C.coral);
        line(c, P(cam, x, d - 10, 260), P(cam, x, d + 160, 260), 10 * s);
    }
    // the back wall: plaster, stippled, its skirting, its posts and its beam
    {
        const wall = [P(cam, R.x0, R.d1), P(cam, R.x1, R.d1), P(cam, R.x1, R.d1, R.wall), P(cam, R.x0, R.d1, R.wall)];
        poly(c, wall, C.peach, 10 * s1);
        c.fillStyle = 'rgba(16,42,52,0.14)';
        for (const p of WALL_DOTS) { const q = P(cam, R.x0 + p.u * (R.x1 - R.x0), R.d1, p.up); c.beginPath(); c.arc(q.x, q.y, p.r * s1, 0, Math.PI * 2); c.fill(); }
    }
    poly(c, [P(cam, R.x0, R.d1), P(cam, R.x1, R.d1), P(cam, R.x1, R.d1, 60), P(cam, R.x0, R.d1, 60)], C.post, 6 * s1);
    for (let x = R.x0 + 280; x < R.x1 - 100; x += 560) if (x < WALL.window[0] - 260 || x > WALL.window[1] + 260) post(c, cam, x, R.d1, true, R.wall);
    poly(c, [P(cam, R.x0, R.d1, BEAM), P(cam, R.x1, R.d1, BEAM), P(cam, R.x1, R.d1, BEAM + 60), P(cam, R.x0, R.d1, BEAM + 60)], C.post, 6 * s1);
    // the round window (marumado): the sea and the sky of the card, a coral sun going slowly, a few bamboo bars
    {
        const cx = (WALL.window[0] + WALL.window[1]) / 2, cu = 560, r = (WALL.window[1] - WALL.window[0]) * 0.44;
        const ring = Array.from({ length: 40 }, (_, i) => { const a = i / 40 * Math.PI * 2; return P(cam, cx + Math.cos(a) * r, R.d1, cu + Math.sin(a) * r); });
        poly(c, ring, C.sky, 0);
        c.save(); c.beginPath(); ring.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y))); c.closePath(); c.clip();
        dot(c, P(cam, cx + 40 * Math.sin(t * 0.05), R.d1, cu + 70), 55 * s1, C.sun);
        const sea = P(cam, cx, R.d1, cu - 40), lo = P(cam, cx, R.d1, cu - r);
        c.fillStyle = C.sea; c.fillRect(ring[20].x, sea.y, ring[0].x - ring[20].x, lo.y - sea.y + 2);
        for (let n = 0; n < 3; n++) {
            const wv = P(cam, cx - 120 + n * 120 + 30 * Math.sin(t * 0.6 + n), R.d1, cu - 90 - (n % 2) * 30);
            c.strokeStyle = C.aqua; c.lineWidth = 6 * s1; c.beginPath(); c.arc(wv.x, wv.y, 16 * s1, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
        }
        c.strokeStyle = C.post; c.lineWidth = 6 * s1;
        for (const k of [-0.35, 0.35]) { const a = P(cam, cx + k * r, R.d1, cu - r), b = P(cam, cx + k * r, R.d1, cu + r); c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); }
        c.restore();
        poly(c, ring, null, 22 * s1, C.post);
        poly(c, ring, null, 5 * s1);
    }
    // the top of the walls: the coral of its roof, as a beam
    poly(c, [P(cam, R.x0, R.d1, R.wall), P(cam, R.x1, R.d1, R.wall), P(cam, R.x1, R.d1, R.wall + 70), P(cam, R.x0, R.d1, R.wall + 70)], C.coral, 10 * s1);
    for (const x of [R.x0, R.x1]) poly(c, [P(cam, x, R.d0, R.wall), P(cam, x, R.d1, R.wall), P(cam, x, R.d1, R.wall + 70), P(cam, x, R.d0, R.wall + 70)], C.coralDark, 10 * s1);
    // what stands on the floor casts a soft shadow
    for (const o of [...SPOTS, ...DECOR]) if (o.id !== 'curtain') shadow(c, cam, o.x + 20, o.d - 10, o.w / 2 + 30, o.dd / 2 + 40);
}

// The footprints of the one hiding (HideSeek.vue), as she would draw them: a stipple of grains of sand in the shape of
// his little sole and heel, the right foot and the left mirrored; as a print fades (`alpha`, 0..1: how much sand his
// foot still had, and how long ago) its grains go one by one, not all of it at once
const SOLE = (() => {
    const out = [];
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2 + 0.3, r = i % 2 ? 0.55 : 0.95; out.push([16 + Math.cos(a) * 20 * r, Math.sin(a) * 13 * r]); }
    for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2, r = i % 2 ? 0.4 : 0.9; out.push([-26 + Math.cos(a) * 11 * r, Math.sin(a) * 10 * r]); }
    out.push([16, 0], [-26, 0]);
    // (each grain its own size and the moment it goes)
    return out.map(([u, v], i) => ({ u, v, r: 7 + 3 * Math.abs(Math.sin(i * 2.3)), at: (Math.sin(i * 7.7) * 0.5 + 0.5) * 0.9 }));
})();
export function drawPrints(c, cam, prints) {
    for (const p of prints) {
        if (p.alpha <= 0.01) continue;
        const ca = Math.cos(p.a), sa = Math.sin(p.a), s = cam.scaleAt(p.d), K = 1.9;
        for (const g of SOLE) {
            if (g.at > p.alpha) continue;
            const v = g.v * p.side, q = P(cam, p.x + (ca * g.u - sa * v) * K, p.d + (sa * g.u + ca * v) * K);
            c.fillStyle = `rgba(120,80,40,${Math.min(0.9, 0.4 + p.alpha * 0.5)})`;
            c.beginPath(); c.arc(q.x, q.y, g.r * s, 0, Math.PI * 2); c.fill();
        }
    }
}

// Each thing in the room, back to front, with whatever stands among them (the puppets) put in at its depth:
// `between(d0, d1)` draws what stands between two depths
export function drawThings(c, cam, spots, t, between, hider = null) {
    const all = [...spots.map((s) => ({ s, d: s.d })), ...DECOR.map((o) => ({ o, d: o.d }))].sort((a, b) => b.d - a.d);
    let last = Infinity;
    for (const it of all) {
        between(it.d, last);
        last = it.d;
        if (it.s) drawSpot(c, cam, it.s, t, hider);
        else drawDecor(c, cam, it.o, t);
    }
    between(-Infinity, last);
}

function drawDecor(c, cam, o, t) {
    const s = cam.scaleAt(o.d);
    if (o.id === 'plant') {
        // a bonsai on a low stand: a shallow coral pot, a twisting trunk and its foliage in pads, swaying a little
        box(c, cam, { x0: o.x - 70, x1: o.x + 70, d0: o.d - 55, d1: o.d + 55, h: 110 }, { front: C.lacquer, top: C.post, side: C.lacquer }, 8);
        box(c, cam, { x0: o.x - 60, x1: o.x + 60, d0: o.d - 40, d1: o.d + 40, h: 160, h0: 110, hatch: false }, { front: C.coral, top: '#5A4A36', side: C.coralDark }, 7);
        const base = P(cam, o.x, o.d, 160);
        c.save(); c.translate(base.x, base.y); c.rotate(0.03 * Math.sin(t * 0.8));
        c.strokeStyle = INK; c.lineCap = 'round'; c.lineWidth = 14 * s;
        c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(40 * s, -60 * s, -50 * s, -110 * s, 10 * s, -190 * s); c.stroke();
        for (const [dx, dy, r] of [[-70, -150, 60], [60, -200, 70], [0, -260, 55]]) {
            c.fillStyle = dy < -220 ? C.teal : C.sea; c.lineWidth = 7 * s;
            c.beginPath(); c.ellipse(dx * s, dy * s, r * s, r * 0.55 * s, 0, 0, Math.PI * 2); c.fill(); c.stroke();
        }
        c.restore();
    } else if (o.id === 'lamp') {
        // a paper lantern standing on the floor (andon): its frame of dark wood, its paper lit, a warm glow round it
        const mid = P(cam, o.x, o.d, 300);
        const glow = c.createRadialGradient(mid.x, mid.y, 0, mid.x, mid.y, 460 * s);
        glow.addColorStop(0, 'rgba(255,236,180,0.6)'); glow.addColorStop(1, 'rgba(255,236,180,0)');
        c.fillStyle = glow; c.beginPath(); c.arc(mid.x, mid.y, 460 * s, 0, Math.PI * 2); c.fill();
        const w = o.w / 2;
        box(c, cam, { x0: o.x - w, x1: o.x + w, d0: o.d - w, d1: o.d + w, h: o.h, h0: 70, hatch: false }, { front: '#FFF0C2', top: C.post, side: '#F6DE9E' }, 7);
        for (const u of [-w / 3, w / 3]) line(c, P(cam, o.x + u, o.d - w, 80), P(cam, o.x + u, o.d - w, o.h - 10), 3 * s);
        for (const up of [200, 330]) line(c, P(cam, o.x - w, o.d - w, up), P(cam, o.x + w, o.d - w, up), 3 * s);
        for (const u of [-w, w]) line(c, P(cam, o.x + u, o.d - w, 0), P(cam, o.x + u, o.d - w, 80), 8 * s);
    }
}

function drawSpot(c, cam, sp, t, hider) {
    const s = cam.scaleAt(sp.d), shake = sp.shake > 0 ? Math.sin(t * 46) * 7 * Math.min(1, sp.shake * 2) : 0;
    const o = sp.open, x0 = sp.x - sp.w / 2 + shake, x1 = sp.x + sp.w / 2 + shake, d0 = sp.d - sp.dd / 2, d1 = sp.d + sp.dd / 2;
    c.save();
    // (just touched: a warm glow round it)
    if (sp.lit > 0.01) {
        const m = P(cam, sp.x, d0, sp.h * 0.5), r = Math.max(sp.w, sp.h) * 0.75 * s;
        const g = c.createRadialGradient(m.x, m.y, 0, m.x, m.y, r);
        g.addColorStop(0, `rgba(255,240,200,${0.55 * sp.lit})`); g.addColorStop(1, 'rgba(255,240,200,0)');
        c.fillStyle = g; c.beginPath(); c.arc(m.x, m.y, r, 0, Math.PI * 2); c.fill();
    }
    if (sp.id === 'wardrobe') {
        // a closet (oshiire): its dark wood frame, a shelf across its middle with futons folded on it, and two sliding
        // doors of paper with a wave painted on them; looked in, the left one slides over the right
        box(c, cam, { x0, x1, d0, d1, h: sp.h }, { front: C.post, top: C.lacquer, side: C.lacquer }, 10);
        const inset = 26, top = sp.h - 40, mid = (x0 + x1) / 2, half = (x1 - x0) / 2 - inset;
        poly(c, [P(cam, x0 + inset, d0, 40), P(cam, x1 - inset, d0, 40), P(cam, x1 - inset, d0, top), P(cam, x0 + inset, d0, top)], '#3A2418', 0);
        if (o > 0.05) {
            line(c, P(cam, x0 + inset, d0 + 20, sp.h * 0.55), P(cam, x1 - inset, d0 + 20, sp.h * 0.55), 10 * s);
            [C.coral, C.cream, C.teal].forEach((col, i) => poly(c, [P(cam, x0 + 50, d0 + 30, sp.h * 0.55 + i * 70), P(cam, mid - 10, d0 + 30, sp.h * 0.55 + i * 70), P(cam, mid - 10, d0 + 30, sp.h * 0.55 + i * 70 + 66), P(cam, x0 + 50, d0 + 30, sp.h * 0.55 + i * 70 + 66)], col, 5 * s));
        }
        const door = (from) => {
            const q = [P(cam, from, d0, 40), P(cam, from + half, d0, 40), P(cam, from + half, d0, top), P(cam, from, d0, top)];
            poly(c, q, C.paper, 8 * s);
            c.strokeStyle = C.teal; c.lineWidth = 7 * s;
            for (let i = 0; i < 3; i++) { const w = P(cam, from + half * (0.25 + i * 0.25), d0, top * 0.3); c.beginPath(); c.arc(w.x, w.y, 26 * s, Math.PI * 1.05, Math.PI * 1.95); c.stroke(); }
            const pull = P(cam, from + half * 0.88, d0, sp.h * 0.5);
            c.strokeStyle = INK; c.lineWidth = 5 * s; c.beginPath(); c.arc(pull.x, pull.y, 13 * s, 0, Math.PI * 2); c.stroke();
        };
        door(mid);
        door(x0 + inset + o * half);
    } else if (sp.id === 'curtain') {
        // a bamboo blind (sudare) hanging from the beam to the floor; looked behind, it rolls up
        const rodY = sp.h, bottom = rodY * 0.95 * o, left = x0, right = x1;
        line(c, P(cam, left - 40, sp.d, rodY + 20), P(cam, right + 40, sp.d, rodY + 20), 10 * s);
        poly(c, [P(cam, left, sp.d, bottom), P(cam, right, sp.d, bottom), P(cam, right, sp.d, rodY), P(cam, left, sp.d, rodY)], C.bamboo, 8 * s);
        c.strokeStyle = 'rgba(122,82,50,0.6)'; c.lineWidth = 2.5 * s;
        for (let u = bottom + 30; u < rodY; u += 34) { const a = P(cam, left, sp.d, u), b = P(cam, right, sp.d, u); c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); }
        for (const k of [0.25, 0.75]) line(c, P(cam, left + (right - left) * k, sp.d - 4, bottom), P(cam, left + (right - left) * k, sp.d - 4, rodY), 4 * s);
        // (its roll, growing as it goes up)
        const roll = 18 + 40 * o;
        poly(c, [P(cam, left - 10, sp.d - 6, bottom - roll * 0.2), P(cam, right + 10, sp.d - 6, bottom - roll * 0.2), P(cam, right + 10, sp.d - 6, bottom + roll), P(cam, left - 10, sp.d - 6, bottom + roll)], C.wickerDark, 6 * s);
    } else if (sp.id === 'bed') {
        // a futon on the floor: its mattress, a soba pillow, and its quilt in the house's coral with cream spots; looked
        // under, the quilt's front lifts
        box(c, cam, { x0, x1, d0, d1, h: 60, hatch: false }, { front: C.cream, top: C.cream, side: '#EDE3CC' }, 8);
        box(c, cam, { x0: sp.x - 110, x1: sp.x + 110, d0: d1 - 170, d1: d1 - 60, h: 130, h0: 60, hatch: false }, { front: C.teal, top: C.aqua, side: C.tealDark }, 7);
        const qh = sp.h, back = d1 - 190, lift = o * (qh - 30);
        if (o > 0.05) poly(c, [P(cam, x0 + 10, d0, 0), P(cam, x1 - 10, d0, 0), P(cam, x1 - 10, d0, lift), P(cam, x0 + 10, d0, lift)], '#5A2A2C', 0);
        poly(c, [P(cam, x0 - 10, d0, qh), P(cam, x1 + 10, d0, qh), P(cam, x1 + 10, back, qh * 0.8), P(cam, x0 - 10, back, qh * 0.8)], C.coral, 9 * s);
        poly(c, [P(cam, x0 - 10, d0, lift), P(cam, x1 + 10, d0, lift), P(cam, x1 + 10, d0, qh), P(cam, x0 - 10, d0, qh)], C.coralDark, 9 * s);
        for (let n = 0; n < 6; n++) dot(c, P(cam, x0 + sp.w * (n % 3 + 0.5) / 3, d0 + (back - d0) * (Math.floor(n / 3) + 0.5) / 2, qh * 0.9), 14 * s, C.cream);
    } else if (sp.id === 'sofa') {
        // a pile of floor cushions (zabuton) in the house's colours, each with its little tassels; looked behind, the
        // pile leans aside
        const cols = [C.purple, C.coral, C.teal, C.ochre, C.purpleDark], each = sp.h / cols.length;
        const pivot = P(cam, sp.x, d0, 0); c.translate(pivot.x, pivot.y); c.rotate(-0.12 * o); c.translate(-pivot.x, -pivot.y);
        cols.forEach((col, i) => {
            const dx = (i % 2 ? 14 : -12) + i * 3 * o * 10;
            box(c, cam, { x0: x0 + dx, x1: x1 + dx, d0, d1, h: each * (i + 1), h0: each * i + 4, hatch: false }, { front: col, top: col, side: col }, 8);
            dot(c, P(cam, x0 + dx + 18, d0 - 4, each * i + 10), 7 * s, C.ochre);
            dot(c, P(cam, x1 + dx - 18, d0 - 4, each * i + 10), 7 * s, C.ochre);
        });
    } else if (sp.id === 'basket') {
        // a big bamboo basket with its lid; looked in, the lid tips up and a sleeve hangs out
        box(c, cam, { x0, x1, d0, d1, h: sp.h - 40 }, { front: C.bamboo, top: '#6E5030', side: C.wickerDark }, 10);
        // (its weave, in diagonals)
        c.save();
        const fq = [P(cam, x0, d0, 0), P(cam, x1, d0, 0), P(cam, x1, d0, sp.h - 40), P(cam, x0, d0, sp.h - 40)];
        c.beginPath(); fq.forEach((q, i) => (i ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y))); c.closePath(); c.clip();
        c.strokeStyle = 'rgba(122,82,50,0.6)'; c.lineWidth = 3 * s;
        for (let k = -sp.h; k < sp.w + sp.h; k += 46) {
            for (const way of [1, -1]) { const a = P(cam, x0 + k, d0, 0), b = P(cam, x0 + k + way * sp.h, d0, sp.h); c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); }
        }
        c.restore();
        if (o > 0.05) poly(c, [P(cam, x0 + 60, d0, sp.h - 40), P(cam, x0 + 120, d0, sp.h - 40), P(cam, x0 + 110, d0 - 10, sp.h - 200), P(cam, x0 + 70, d0 - 10, sp.h - 190)], C.coral, 5 * s);
        const a = o * 1.3, depth = d1 - d0, at = (u, e) => P(cam, u, d1 - Math.cos(a) * depth * e, sp.h - 40 + Math.sin(a) * depth * e + 30);
        poly(c, [P(cam, x0 - 10, d1, sp.h - 40), P(cam, x1 + 10, d1, sp.h - 40), at(x1 + 10, 1), at(x0 - 10, 1)], C.wickerDark, 9 * s);
        dot(c, at(sp.x, 0.5), 14 * s, C.coral);
    } else if (sp.id === 'table') {
        // a low table over its quilt (kotatsu): the quilt in teal with a coral border down to the floor, the table top
        // over it, a bowl of tangerines and an iron teapot; looked under, the quilt's front lifts
        const top = sp.h - 40, lift = o * (top - 20);
        box(c, cam, { x0, x1, d0, d1, h: top, hatch: false }, { front: C.teal, top: C.teal, side: C.tealDark }, 9);
        if (o > 0.05) poly(c, [P(cam, x0 + 10, d0, 0), P(cam, x1 - 10, d0, 0), P(cam, x1 - 10, d0, lift), P(cam, x0 + 10, d0, lift)], '#06343A', 0);
        if (o > 0.05) poly(c, [P(cam, x0, d0, lift), P(cam, x1, d0, lift), P(cam, x1, d0, top), P(cam, x0, d0, top)], C.teal, 9 * s);
        poly(c, [P(cam, x0, d0, lift), P(cam, x1, d0, lift), P(cam, x1, d0, lift + 45), P(cam, x0, d0, lift + 45)], C.coral, 6 * s);
        box(c, cam, { x0: x0 - 30, x1: x1 + 30, d0: d0 - 30, d1: d1 + 30, h: sp.h, h0: top, hatch: false }, { front: C.post, top: C.wood, side: C.post }, 9);
        const bowl = P(cam, sp.x + 80, sp.d, sp.h);
        c.fillStyle = C.lacquer; c.beginPath(); c.ellipse(bowl.x, bowl.y - 18 * s, 70 * s, 26 * s, 0, 0, Math.PI); c.fill();
        for (const [dx, dy] of [[-30, -30], [20, -34], [-4, -58]]) { dot(c, { x: bowl.x + dx * s, y: bowl.y + dy * s }, 22 * s, '#F59A3C'); }
        const pot = P(cam, sp.x - 110, sp.d - 20, sp.h);
        c.fillStyle = '#2E3236'; c.strokeStyle = INK; c.lineWidth = 6 * s;
        c.beginPath(); c.ellipse(pot.x, pot.y - 45 * s, 58 * s, 45 * s, 0, 0, Math.PI * 2); c.fill(); c.stroke();
        c.beginPath(); c.arc(pot.x, pot.y - 95 * s, 40 * s, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
    } else if (sp.id === 'chest') {
        // a dark chest (nagamochi) with iron corners and ring handles; looked in, its lid swings up
        box(c, cam, { x0, x1, d0, d1, h: sp.h - 60 }, { front: C.lacquer, top: '#24160C', side: '#3A2414' }, 10);
        for (const [u, up] of [[x0 + 8, 8], [x1 - 48, 8], [x0 + 8, sp.h - 108], [x1 - 48, sp.h - 108]]) poly(c, [P(cam, u, d0, up), P(cam, u + 40, d0, up), P(cam, u + 40, d0, up + 40), P(cam, u, d0, up + 40)], '#2A2A2A', 3 * s);
        for (const u of [x0 + sp.w * 0.25, x0 + sp.w * 0.75]) { const q = P(cam, u, d0, (sp.h - 60) * 0.5); c.strokeStyle = C.gold; c.lineWidth = 6 * s; c.beginPath(); c.arc(q.x, q.y + 10 * s, 20 * s, 0, Math.PI * 2); c.stroke(); }
        const a = o * 1.6, lh = 60, depth = d1 - d0;
        const back = (u) => P(cam, u, d1, sp.h - 60);
        const front = (u, up) => P(cam, u, d1 - Math.cos(a) * depth, sp.h - 60 + Math.sin(a) * depth + up);
        poly(c, [back(x0), back(x1), front(x1, lh), front(x0, lh)], '#24160C', 9 * s);
        poly(c, [front(x0, 0), front(x1, 0), front(x1, lh), front(x0, lh)], C.lacquer, 9 * s);
    } else if (sp.id === 'screen') {
        // a folding screen (byōbu): gold panels in dark frames, waves and a coral sun painted across them; looked
        // behind, it folds aside
        const n = 3, pw = sp.w / n, fold = 1 - 0.65 * o;
        let px = x0, pd = sp.d;
        for (let i = 0; i < n; i++) {
            const nx = px + pw * fold, nd = sp.d + (i % 2 ? -1 : 1) * 70 * (1 - o * 0.5);
            const quad = [P(cam, px, pd, 30), P(cam, nx, nd, 30), P(cam, nx, nd, sp.h), P(cam, px, pd, sp.h)];
            poly(c, quad, C.lacquer, 10 * s);
            const inset = (p, q, u) => ({ x: p.x + (q.x - p.x) * u, y: p.y + (q.y - p.y) * u });
            const inner = [inset(quad[0], quad[2], 0.08), inset(quad[1], quad[3], 0.08), inset(quad[2], quad[0], 0.08), inset(quad[3], quad[1], 0.08)];
            poly(c, inner, C.gold, 4 * s);
            // (waves low on every panel; the sun on the middle one)
            c.strokeStyle = C.teal; c.lineWidth = 6 * s;
            for (let k = 0; k < 2; k++) { const w = inset(inset(inner[0], inner[1], 0.3 + k * 0.4), inset(inner[3], inner[2], 0.3 + k * 0.4), 0.78); c.beginPath(); c.arc(w.x, w.y, 24 * s, Math.PI * 1.05, Math.PI * 1.95); c.stroke(); }
            if (i === 1) dot(c, inset(inset(inner[0], inner[1], 0.5), inset(inner[3], inner[2], 0.5), 0.3), 34 * s, C.coral);
            line(c, P(cam, px, pd, 0), P(cam, px, pd, 30), 10 * s);
            px = nx; pd = nd;
        }
        line(c, P(cam, px, pd, 0), P(cam, px, pd, 30), 10 * s);
    }
    c.restore();
    // hidden in a hurry: a foot shows at its foot, in his colours
    if (sp.sloppy && hider && o < 0.3) {
        const f = P(cam, sp.x + sp.w * 0.18, d0 - 12, 0), fs = s;
        c.fillStyle = hider.white; c.strokeStyle = hider.ink; c.lineWidth = 9 * fs;
        c.beginPath(); c.ellipse(f.x, f.y - 12 * fs, 30 * fs, 16 * fs, 0, 0, Math.PI * 2); c.fill(); c.stroke();
    }
    // where it is on the screen, for a touch on it (its box from its front's foot up to its top)
    const a = P(cam, x0, d0, 0), b = P(cam, x1, d0, 0), top = P(cam, sp.x, sp.d, sp.h);
    sp.box = { x0: Math.min(a.x, b.x) - 14, x1: Math.max(a.x, b.x) + 14, y0: Math.min(top.y, P(cam, sp.x, d1, sp.h).y) - 14, y1: Math.max(a.y, b.y) + 24 };
    // looked in and found empty: a ring of faint dots on the floor where one stands to look
    if (sp.seen) {
        const pts = floorEllipse(cam, sp.spot.x, sp.spot.d, 70, 50, 12);
        c.fillStyle = 'rgba(16,42,52,0.35)';
        for (const p of pts) { c.beginPath(); c.arc(p.x, p.y, 6 * cam.scaleAt(sp.spot.d), 0, Math.PI * 2); c.fill(); }
    }
}

// The hiding place under a touch (the nearest to us, if two overlap)
export function spotAt(spots, p) {
    let best = null;
    for (const s of spots) {
        if (!s.box) continue;
        if (p.x > s.box.x0 && p.x < s.box.x1 && p.y > s.box.y0 && p.y < s.box.y1 && (!best || s.d < best.d)) best = s;
    }
    return best;
}
