// The inside of Gratitud's house, for the hide and seek (HideSeek.vue): one long room going back from us (a phone is
// narrow and tall, so the room is too: all of it on the screen at once, no camera to move), seen as Sid's world is seen,
// a floor in perspective going back to a wall. Everything is drawn in code, in the colours of the house in the card (its
// coral roof, its peach walls, its purple, its sand and its teal) with the world's ink, and drawn as by hand: every line
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
    wardrobe: ['el ropero', 'the wardrobe'], curtain: ['la cortina', 'the curtain'], bed: ['la cama', 'the bed'], sofa: ['el sillón', 'the sofa'],
    basket: ['el canasto', 'the basket'], table: ['la mesa', 'the table'], chest: ['el baúl', 'the chest'], screen: ['el biombo', 'the screen'],
};
// [id, x, d, w, dd, h, spot x, spot d]
const LAYOUTS = {
    tall: {
        room: { x0: -1150, x1: 1150, d0: -300, d1: 2500 }, bounds: { x0: -1070, x1: 1070, d0: -230, d1: 2410 },
        door: { d: 1150 }, rug: { x: 0, d: 1050, rx: 420, rd: 360 }, window: [-260, 300], picture: { x: 'x1', d: 880 },
        sand: [[-150, 190, 220, 130], [60, 1800, 170, 140], [-320, 2100, 180, 110]],
        spots: [['wardrobe', -680, 2380, 440, 190, 1000, -680, 2180], ['curtain', 760, 2470, 260, 40, 1060, 760, 2320],
            ['bed', 720, 1650, 500, 640, 300, 720, 1220], ['sofa', -640, 1720, 560, 240, 430, -640, 1500],
            ['basket', 760, 900, 260, 220, 380, 760, 690], ['table', -120, 620, 440, 320, 330, -120, 370],
            ['chest', 720, 280, 360, 240, 330, 720, 60], ['screen', -720, 180, 380, 90, 760, -720, -50]],
        decor: [['plant', 1010, 2360, 150, 140, 250], ['lamp', 420, 2360, 140, 140, 780]],
    },
    wide: {
        room: { x0: -1750, x1: 1750, d0: -300, d1: 1700 }, bounds: { x0: -1670, x1: 1670, d0: -230, d1: 1610 },
        door: { d: 650 }, rug: { x: 200, d: 650, rx: 430, rd: 330 }, window: [-250, 250], picture: { x: 'x1', d: 380 },
        sand: [[-650, 540, 220, 140], [480, 1300, 200, 130], [950, -90, 200, 110]],
        spots: [['wardrobe', -1150, 1580, 440, 190, 1000, -1150, 1380], ['curtain', 760, 1670, 260, 40, 1060, 760, 1520],
            ['bed', 1250, 1000, 500, 640, 300, 1250, 570], ['sofa', -550, 1150, 560, 240, 430, -550, 930],
            ['basket', 820, 560, 260, 220, 380, 820, 350], ['table', -1100, 330, 440, 320, 330, -1100, 80],
            ['chest', 1350, 130, 360, 240, 330, 1350, -110], ['screen', -250, 150, 380, 90, 760, -250, -90]],
        decor: [['plant', 1560, 1560, 150, 140, 250], ['lamp', 450, 1560, 140, 140, 780]],
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

// The room itself: the sky and the island outside (it is a doll's house: its front is open), its floor, its walls,
// the window, the door, the rug, and the shadows of what stands on it
export function drawRoom(c, cam, view, t) {
    const R = ROOM, s1 = cam.scaleAt(R.d1);
    c.fillStyle = C.sky; c.fillRect(0, 0, view.W, view.H);
    c.fillStyle = C.sea; c.fillRect(0, cam.groundAt(R.d0) - 40, view.W, view.H);
    // (the house's base under the open front, in the dark teal of its steps)
    poly(c, [P(cam, R.x0 - 40, R.d0), P(cam, R.x1 + 40, R.d0), P(cam, R.x1 + 40, R.d0, -120), P(cam, R.x0 - 40, R.d0, -120)], C.tealDark, 10 * cam.scaleAt(R.d0));
    // the floor: sand, with its boards going back, stippled
    const fl = [P(cam, R.x0, R.d0), P(cam, R.x1, R.d0), P(cam, R.x1, R.d1), P(cam, R.x0, R.d1)];
    poly(c, fl, C.sand, 0);
    c.save();
    c.beginPath(); fl.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y))); c.closePath(); c.clip();
    // (the light from the window, warm on the boards at the back)
    {
        const m = P(cam, (WALL.window[0] + WALL.window[1]) / 2, R.d1 - 300), r = 900 * cam.scaleAt(R.d1 - 300);
        const g = c.createRadialGradient(m.x, m.y, 0, m.x, m.y, r);
        g.addColorStop(0, 'rgba(255,246,214,0.55)'); g.addColorStop(1, 'rgba(255,246,214,0)');
        c.fillStyle = g; c.fillRect(m.x - r, m.y - r, r * 2, r * 2);
    }
    for (let x = R.x0 + 190; x < R.x1; x += 190) line(c, P(cam, x, R.d0), P(cam, x, R.d1), 3.2 * cam.scaleAt(R.d0));
    for (let d = R.d0 + 280, n = 0; d < R.d1; d += 280, n++) {
        for (let x = R.x0 + (n % 2 ? 95 : 190); x < R.x1; x += 380) line(c, P(cam, x, d), P(cam, x + 190, d), 2.6 * cam.scaleAt(d));
    }
    c.fillStyle = 'rgba(16,42,52,0.22)';
    for (const p of FLOOR_DOTS) { const q = P(cam, p.x, p.d), s = cam.scaleAt(p.d); c.beginPath(); c.arc(q.x, q.y, p.r * s, 0, Math.PI * 2); c.fill(); }
    c.restore();
    // the sand blown in, and the door's mat with sand on it
    for (const p of SAND) if (p.mat) {
        const s = cam.scaleAt(p.d);
        poly(c, floorEllipse(cam, p.x, p.d, p.rx * 0.8, p.rd * 0.85, 24), '#B88A5A', 6 * s);
        for (let i = 1; i < 5; i++) line(c, P(cam, p.x - p.rx * 0.5, p.d - p.rd * 0.7 + p.rd * 0.35 * i), P(cam, p.x + p.rx * 0.5, p.d - p.rd * 0.7 + p.rd * 0.35 * i), 2.5 * s);
    }
    // (each patch a pale drift, its edge ragged, with its grains over it: lighter than a footprint, never mistaken for one)
    for (const p of SAND) if (!p.mat) {
        const pts = Array.from({ length: 28 }, (_, i) => { const a = i / 28 * Math.PI * 2, r = 0.92 + 0.12 * Math.sin(a * 5 + p.x) + 0.06 * Math.sin(a * 11 + p.d); return P(cam, p.x + Math.cos(a) * p.rx * r, p.d + Math.sin(a) * p.rd * r); });
        c.fillStyle = 'rgba(250,234,196,0.85)'; c.beginPath(); pts.forEach((q, i) => (i ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y))); c.closePath(); c.fill();
    }
    for (const g of SAND_DOTS) {
        const q = P(cam, g.x, g.d), s = cam.scaleAt(g.d);
        c.fillStyle = g.k < 0.3 ? 'rgba(214,176,118,0.8)' : 'rgba(255,250,236,0.95)';
        c.beginPath(); c.arc(q.x, q.y, g.r * s, 0, Math.PI * 2); c.fill();
    }
    // the round rug, lying flat: teal with a coral ring, its fringe
    {
        const s = cam.scaleAt(RUG.d);
        poly(c, floorEllipse(cam, RUG.x, RUG.d, RUG.rx, RUG.rd), C.teal, 8 * s);
        poly(c, floorEllipse(cam, RUG.x, RUG.d, RUG.rx * 0.78, RUG.rd * 0.78), null, 22 * s, C.coral);
        poly(c, floorEllipse(cam, RUG.x, RUG.d, RUG.rx * 0.33, RUG.rd * 0.33), C.aqua, 0);
        for (let i = 0; i < 36; i++) {
            const a = i / 36 * Math.PI * 2, p = P(cam, RUG.x + Math.cos(a) * RUG.rx, RUG.d + Math.sin(a) * RUG.rd), q = P(cam, RUG.x + Math.cos(a) * (RUG.rx + 30), RUG.d + Math.sin(a) * (RUG.rd + 30));
            line(c, p, q, 3 * s);
        }
    }
    // the side walls (peach, darker), with the purple below; the door in the left one, a picture on the right one
    for (const x of [R.x0, R.x1]) {
        const wall = [P(cam, x, R.d0), P(cam, x, R.d1), P(cam, x, R.d1, R.wall), P(cam, x, R.d0, R.wall)];
        poly(c, wall, C.peachDark, 10 * s1);
        c.save(); c.beginPath(); wall.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y))); c.closePath(); c.clip();
        c.fillStyle = 'rgba(16,42,52,0.16)';
        for (const p of WALL_DOTS) { const d = R.d0 + p.u * (R.d1 - R.d0), q = P(cam, x, d, p.up); c.beginPath(); c.arc(q.x, q.y, p.r * cam.scaleAt(d), 0, Math.PI * 2); c.fill(); }
        c.restore();
        poly(c, [P(cam, x, R.d0), P(cam, x, R.d1), P(cam, x, R.d1, R.wainscot), P(cam, x, R.d0, R.wainscot)], C.purpleDark, 8 * s1);
        line(c, P(cam, x, R.d0, R.wainscot), P(cam, x, R.d1, R.wainscot), 12 * s1);
    }
    {
        const x = R.x0, d0 = DOOR.d, d1 = DOOR.d + DOOR.w, s = cam.scaleAt(d0);
        poly(c, [P(cam, x, d0), P(cam, x, d1), P(cam, x, d1, DOOR.h), P(cam, x, d0, DOOR.h)], C.coral, 10 * s);
        poly(c, [P(cam, x, d0 + 50, 60), P(cam, x, d1 - 50, 60), P(cam, x, d1 - 50, DOOR.h - 60), P(cam, x, d0 + 50, DOOR.h - 60)], C.coralDark, 5 * s);
        dot(c, P(cam, x, d1 - 80, DOOR.h * 0.45), 13 * s, C.cream);
    }
    {
        const x = R[WALL.picture.x], d = WALL.picture.d, s = cam.scaleAt(d + 120);
        poly(c, [P(cam, x, d, 600), P(cam, x, d + 260, 600), P(cam, x, d + 260, 840), P(cam, x, d, 840)], C.cream, 9 * s);
        dot(c, P(cam, x, d + 70, 680), 20 * s, C.coral); dot(c, P(cam, x, d + 190, 680), 20 * s, C.teal); dot(c, P(cam, x, d + 130, 770), 20 * s, C.purple);
    }
    // the back wall: peach, stippled, purple below with a cream rail, its boards
    {
        const wall = [P(cam, R.x0, R.d1), P(cam, R.x1, R.d1), P(cam, R.x1, R.d1, R.wall), P(cam, R.x0, R.d1, R.wall)];
        poly(c, wall, C.peach, 10 * s1);
        c.fillStyle = 'rgba(16,42,52,0.14)';
        for (const p of WALL_DOTS) { const q = P(cam, R.x0 + p.u * (R.x1 - R.x0), R.d1, p.up); c.beginPath(); c.arc(q.x, q.y, p.r * s1, 0, Math.PI * 2); c.fill(); }
    }
    poly(c, [P(cam, R.x0, R.d1), P(cam, R.x1, R.d1), P(cam, R.x1, R.d1, R.wainscot), P(cam, R.x0, R.d1, R.wainscot)], C.purple, 8 * s1);
    line(c, P(cam, R.x0, R.d1, R.wainscot), P(cam, R.x1, R.d1, R.wainscot), 14 * s1);
    for (let x = R.x0 + 160; x < R.x1; x += 160) line(c, P(cam, x, R.d1, 30), P(cam, x, R.d1, R.wainscot - 30), 3 * s1);
    // the window: the sea and the sky of the card, a coral sun going slowly
    {
        const [w0, w1] = WALL.window, u0 = 470, u1 = 930;
        const pts = [P(cam, w0, R.d1, u0), P(cam, w1, R.d1, u0), P(cam, w1, R.d1, u1), P(cam, w0, R.d1, u1)];
        poly(c, pts, C.sky, 0);
        c.save(); c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y))); c.closePath(); c.clip();
        dot(c, P(cam, w0 + 300 + 40 * Math.sin(t * 0.05), R.d1, u0 + 230), 60 * s1, C.sun);
        const sea = P(cam, w0, R.d1, u0 + 130);
        c.fillStyle = C.sea; c.fillRect(pts[0].x, sea.y, pts[1].x - pts[0].x, pts[0].y - sea.y);
        for (let n = 0; n < 3; n++) {
            const wv = P(cam, w0 + 70 + n * 150 + 30 * Math.sin(t * 0.6 + n), R.d1, u0 + 60 + (n % 2) * 40);
            c.strokeStyle = C.aqua; c.lineWidth = 6 * s1; c.beginPath(); c.arc(wv.x, wv.y, 18 * s1, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
        }
        c.restore();
        poly(c, pts, null, 14 * s1);
        line(c, P(cam, (w0 + w1) / 2, R.d1, u0), P(cam, (w0 + w1) / 2, R.d1, u1), 10 * s1);
        line(c, P(cam, w0 - 30, R.d1, u0), P(cam, w1 + 30, R.d1, u0), 16 * s1);
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
        // a pot of the house's coral, a palm of the island's in it, swaying a little
        box(c, cam, { x0: o.x - 70, x1: o.x + 70, d0: o.d - 55, d1: o.d + 55, h: 170 }, { front: C.coral, top: '#5A4A36', side: C.coralDark }, 9);
        const base = P(cam, o.x, o.d - 55, 170);
        c.save(); c.translate(base.x, base.y); c.rotate(0.05 * Math.sin(t * 0.9)); c.strokeStyle = INK; c.lineCap = 'round';
        c.lineWidth = 9 * s; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(10 * s, -160 * s, -10 * s, -300 * s); c.stroke();
        for (let n = 0; n < 6; n++) {
            const a = -Math.PI / 2 + (n - 2.5) * 0.5;
            c.fillStyle = n % 2 ? C.teal : C.sea; c.lineWidth = 7 * s;
            c.beginPath(); c.moveTo(-10 * s, -300 * s);
            c.quadraticCurveTo(-10 * s + Math.cos(a - 0.3) * 160 * s, -300 * s + Math.sin(a - 0.3) * 160 * s, -10 * s + Math.cos(a) * 230 * s, -300 * s + Math.sin(a) * 200 * s + 50 * s);
            c.quadraticCurveTo(-10 * s + Math.cos(a + 0.3) * 120 * s, -300 * s + Math.sin(a + 0.3) * 120 * s, -10 * s, -300 * s);
            c.fill(); c.stroke();
        }
        c.restore();
    } else if (o.id === 'lamp') {
        // a standing lamp, its shade lit: a warm glow round it
        const foot = P(cam, o.x, o.d), top = P(cam, o.x, o.d, 620);
        const glow = c.createRadialGradient(top.x, top.y, 0, top.x, top.y, 420 * s);
        glow.addColorStop(0, 'rgba(255,236,180,0.55)'); glow.addColorStop(1, 'rgba(255,236,180,0)');
        c.fillStyle = glow; c.beginPath(); c.arc(top.x, top.y, 420 * s, 0, Math.PI * 2); c.fill();
        c.fillStyle = INK; c.beginPath(); c.ellipse(foot.x, foot.y, 70 * s, 18 * s, 0, 0, Math.PI * 2); c.fill();
        line(c, foot, top, 10 * s);
        poly(c, [P(cam, o.x - 70, o.d, 600), P(cam, o.x + 70, o.d, 600), P(cam, o.x + 110, o.d, 470), P(cam, o.x - 110, o.d, 470)], '#FFE7A8', 9 * s);
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
        box(c, cam, { x0, x1, d0, d1, h: sp.h }, { front: C.purple, top: C.purpleDark, side: C.purpleDark }, 10);
        const mid = (x0 + x1) / 2, inset = 30;
        poly(c, [P(cam, x0 + inset, d0, 60), P(cam, x1 - inset, d0, 60), P(cam, x1 - inset, d0, sp.h - 60), P(cam, x0 + inset, d0, sp.h - 60)], '#3A2458', 0);
        if (o > 0.05) {   // (hangers in it, and a coat)
            line(c, P(cam, x0 + inset + 20, d0 + 40, sp.h - 150), P(cam, x1 - inset - 20, d0 + 40, sp.h - 150), 6 * s);
            for (let n = 0; n < 3; n++) poly(c, [P(cam, x0 + 100 + n * 110, d0 + 40, sp.h - 150), P(cam, x0 + 60 + n * 110, d0 + 40, sp.h - 220), P(cam, x0 + 140 + n * 110, d0 + 40, sp.h - 220)], null, 4 * s);
            poly(c, [P(cam, x0 + 70, d0 + 40, sp.h - 220), P(cam, x0 + 150, d0 + 40, sp.h - 220), P(cam, x0 + 170, d0 + 40, sp.h - 560), P(cam, x0 + 50, d0 + 40, sp.h - 560)], C.aqua, 5 * s);
        }
        const door = (hinge, other, way) => {
            const a = o * 1.9, wd = Math.abs(other - hinge);
            const ex = hinge + Math.cos(a) * wd * way, ed = d0 - Math.sin(a) * wd;
            poly(c, [P(cam, hinge, d0, 60), P(cam, ex, ed, 60), P(cam, ex, ed, sp.h - 60), P(cam, hinge, d0, sp.h - 60)], C.coral, 9 * s);
            // (its panel and its knob)
            const at = (u, up) => P(cam, hinge + (ex - hinge) * u, d0 + (ed - d0) * u, up);
            poly(c, [at(0.2, 160), at(0.8, 160), at(0.8, sp.h - 180), at(0.2, sp.h - 180)], null, 4 * s);
            dot(c, at(0.88, sp.h * 0.5), 12 * s, C.cream);
        };
        door(x0 + inset, mid, 1); door(x1 - inset, mid, -1);
        poly(c, [P(cam, x0 - 20, d0, sp.h), P(cam, x1 + 20, d0, sp.h), P(cam, x1 + 20, d0, sp.h + 50), P(cam, x0 - 20, d0, sp.h + 50)], C.coralDark, 9 * s);
    } else if (sp.id === 'curtain') {
        // a long coral curtain beside the window, from its rod to the floor, in folds; looked behind, drawn aside
        const rodY = sp.h, w = sp.w * (1 - 0.7 * o), left = x0;
        line(c, P(cam, x0 - 60, sp.d, rodY + 20), P(cam, x1 + 60, sp.d, rodY + 20), 12 * s);
        dot(c, P(cam, x0 - 60, sp.d, rodY + 20), 14 * s); dot(c, P(cam, x1 + 60, sp.d, rodY + 20), 14 * s);
        const folds = 5, pts = [P(cam, left + w, sp.d, rodY), P(cam, left, sp.d, rodY)];
        for (let n = 0; n <= folds * 2; n++) pts.push(P(cam, left + w * n / (folds * 2), sp.d - (n % 2 ? 30 : 0), n % 2 ? 6 : 0));
        poly(c, pts, C.coral, 9 * s);
        for (let n = 1; n < folds; n++) line(c, P(cam, left + w * n / folds, sp.d, rodY - 40), P(cam, left + w * n / folds + 6, sp.d - 20, 60), 4 * s);
        poly(c, [P(cam, left, sp.d, rodY * 0.52), P(cam, left + w, sp.d, rodY * 0.5), P(cam, left + w, sp.d, rodY * 0.46), P(cam, left, sp.d, rodY * 0.48)], C.cream, 5 * s);
    } else if (sp.id === 'bed') {
        // the bed: its headboard against the back, its mattress, a teal blanket with dots hanging to the floor, a cream
        // pillow; looked under, the blanket's front lifts
        box(c, cam, { x0, x1, d0: d1 - 50, d1, h: 600 }, { front: C.wood, top: C.woodDark, side: C.woodDark }, 10);
        poly(c, [P(cam, x0 + 60, d1 - 50, 380), P(cam, x1 - 60, d1 - 50, 380), P(cam, x1 - 60, d1 - 50, 540), P(cam, x0 + 60, d1 - 50, 540)], null, 5 * s);
        box(c, cam, { x0, x1, d0, d1: d1 - 50, h: sp.h }, { front: C.tealDark, top: C.teal, side: C.tealDark }, 10);
        box(c, cam, { x0: x0 + 60, x1: x1 - 60, d0: d1 - 230, d1: d1 - 70, h: sp.h + 70, h0: sp.h, hatch: false }, { front: C.cream, top: C.cream, side: '#EDE3CC' }, 8);
        const lift = o * (sp.h - 40);
        if (o > 0.05) poly(c, [P(cam, x0 + 20, d0, 0), P(cam, x1 - 20, d0, 0), P(cam, x1 - 20, d0, lift), P(cam, x0 + 20, d0, lift)], '#0A3E44', 0);
        poly(c, [P(cam, x0, d0, lift), P(cam, x1, d0, lift), P(cam, x1, d0, sp.h), P(cam, x0, d0, sp.h)], C.teal, 10 * s);
        for (let n = 1; n < 6; n++) dot(c, P(cam, x0 + sp.w * n / 6, d0, (sp.h + lift) / 2), 9 * s, C.aqua);
    } else if (sp.id === 'sofa') {
        // a coral sofa with its arms; looked behind, it scoots forward and tips a little
        const k = o, dz = -80 * k;
        const pivot = P(cam, sp.x, d0 + dz, 0); c.translate(pivot.x, pivot.y); c.rotate(-0.04 * k); c.translate(-pivot.x, -pivot.y);
        box(c, cam, { x0, x1, d0: d1 - 90 + dz, d1: d1 + dz, h: sp.h }, { front: C.coral, top: C.coralDark, side: C.coralDark }, 10);
        box(c, cam, { x0, x1, d0: d0 + dz, d1: d1 - 90 + dz, h: 220 }, { front: C.coralDark, top: C.coral, side: C.coralDark }, 10);
        box(c, cam, { x0, x1: x0 + 90, d0: d0 + dz, d1: d1 + dz, h: 310 }, { front: C.coral, top: C.coralDark, side: C.coralDark }, 10);
        box(c, cam, { x0: x1 - 90, x1, d0: d0 + dz, d1: d1 + dz, h: 310 }, { front: C.coral, top: C.coralDark, side: C.coralDark }, 10);
        box(c, cam, { x0: x0 + 120, x1: x0 + 290, d0: d1 - 140 + dz, d1: d1 - 100 + dz, h: 380, h0: 220, hatch: false }, { front: C.aqua, top: C.aqua, side: C.teal }, 8);
        // (its seams)
        line(c, P(cam, sp.x, d0 + dz, 40), P(cam, sp.x, d0 + dz, 200), 4 * s);
    } else if (sp.id === 'basket') {
        // a big wicker basket for the washing, its lid on; looked in, the lid tips up and a sleeve hangs out
        const lift = o;
        box(c, cam, { x0, x1, d0, d1, h: sp.h - 40 }, { front: C.wicker, top: '#6E5030', side: C.wickerDark }, 10);
        // (the weave)
        for (let r = 1; r < 6; r++) line(c, P(cam, x0, d0, (sp.h - 40) * r / 6), P(cam, x1, d0, (sp.h - 40) * r / 6), 3 * s);
        for (let n = 1; n < 6; n++) for (let r = 0; r < 6; r++) {
            const u = x0 + sp.w * n / 6 + (r % 2 ? 12 : -12), up = (sp.h - 40) * (r + 0.5) / 6;
            line(c, P(cam, u, d0, up - 14), P(cam, u, d0, up + 14), 3 * s);
        }
        if (o > 0.05) poly(c, [P(cam, x0 + 60, d0, sp.h - 40), P(cam, x0 + 120, d0, sp.h - 40), P(cam, x0 + 110, d0 - 10, sp.h - 200), P(cam, x0 + 70, d0 - 10, sp.h - 190)], C.coral, 5 * s);
        const a = lift * 1.3, depth = d1 - d0, at = (u, e) => P(cam, u, d1 - Math.cos(a) * depth * e, sp.h - 40 + Math.sin(a) * depth * e + 30);
        poly(c, [P(cam, x0 - 10, d1, sp.h - 40), P(cam, x1 + 10, d1, sp.h - 40), at(x1 + 10, 1), at(x0 - 10, 1)], C.wickerDark, 9 * s);
        dot(c, at(sp.x, 0.5), 14 * s, C.coral);
    } else if (sp.id === 'table') {
        // a table under a cream cloth with coral dots down to the floor; looked under, the cloth's front lifts
        const lift = o * (sp.h - 30);
        box(c, cam, { x0, x1, d0, d1, h: sp.h, hatch: false }, { front: C.cream, top: C.cream, side: '#EDE3CC' }, 10);
        if (o > 0.05) {
            poly(c, [P(cam, x0 + 10, d0, 0), P(cam, x1 - 10, d0, 0), P(cam, x1 - 10, d0, lift), P(cam, x0 + 10, d0, lift)], '#5A4A36', 0);
            poly(c, [P(cam, x0, d0, lift), P(cam, x1, d0, lift), P(cam, x1, d0, sp.h), P(cam, x0, d0, sp.h)], C.cream, 9 * s);
        }
        for (let n = 0; n < 9; n++) {
            const u = (n % 3 + 0.5) / 3, v = (Math.floor(n / 3) + 0.5) / 3, up = lift + (sp.h - lift) * v;
            if (up < sp.h - 10) dot(c, P(cam, x0 + sp.w * u, d0, up), 13 * s, C.coral);
        }
        // a teapot and a cup on it
        const pot = P(cam, sp.x - 60, sp.d, sp.h);
        c.fillStyle = C.teal; c.strokeStyle = INK; c.lineWidth = 7 * s;
        c.beginPath(); c.ellipse(pot.x, pot.y - 55 * s, 70 * s, 55 * s, 0, 0, Math.PI * 2); c.fill(); c.stroke();
        c.beginPath(); c.moveTo(pot.x + 60 * s, pot.y - 70 * s); c.quadraticCurveTo(pot.x + 110 * s, pot.y - 90 * s, pot.x + 120 * s, pot.y - 120 * s); c.stroke();
        dot(c, { x: pot.x, y: pot.y - 118 * s }, 12 * s);
        const cup = P(cam, sp.x + 130, sp.d - 40, sp.h);
        poly(c, [{ x: cup.x - 30 * s, y: cup.y - 50 * s }, { x: cup.x + 30 * s, y: cup.y - 50 * s }, { x: cup.x + 22 * s, y: cup.y }, { x: cup.x - 22 * s, y: cup.y }], C.peach, 6 * s);
    } else if (sp.id === 'chest') {
        // a wooden chest with dark bands; looked in, its lid swings up
        box(c, cam, { x0, x1, d0, d1, h: sp.h - 60 }, { front: C.wood, top: '#3A2A1A', side: C.woodDark }, 10);
        for (const u of [0.22, 0.78]) line(c, P(cam, x0 + sp.w * u, d0, 0), P(cam, x0 + sp.w * u, d0, sp.h - 60), 22 * s);
        // (the wood's grain)
        for (let r = 1; r < 4; r++) line(c, P(cam, x0 + sp.w * 0.3, d0, (sp.h - 60) * r / 4), P(cam, x0 + sp.w * 0.7, d0, (sp.h - 60) * r / 4 + 8), 2.5 * s);
        dot(c, P(cam, sp.x, d0, sp.h - 110), 16 * s, C.cream);
        const a = o * 1.6, lh = 60, depth = d1 - d0;
        const back = (u) => P(cam, u, d1, sp.h - 60);
        const front = (u, up) => P(cam, u, d1 - Math.cos(a) * depth, sp.h - 60 + Math.sin(a) * depth + up);
        poly(c, [back(x0), back(x1), front(x1, lh), front(x0, lh)], C.woodDark, 9 * s);
        poly(c, [front(x0, 0), front(x1, 0), front(x1, lh), front(x0, lh)], C.wood, 9 * s);
    } else if (sp.id === 'screen') {
        // a folding screen of three panels, peach in purple frames, in a zigzag; looked behind, it folds aside
        const n = 3, pw = sp.w / n, fold = 1 - 0.65 * o;
        let px = x0, pd = sp.d;
        for (let i = 0; i < n; i++) {
            const nx = px + pw * fold, nd = sp.d + (i % 2 ? -1 : 1) * 70 * (1 - o * 0.5);
            const quad = [P(cam, px, pd, 30), P(cam, nx, nd, 30), P(cam, nx, nd, sp.h), P(cam, px, pd, sp.h)];
            poly(c, quad, C.purple, 10 * s);
            const inset = (p, q, u) => ({ x: p.x + (q.x - p.x) * u, y: p.y + (q.y - p.y) * u });
            const inner = [inset(quad[0], quad[2], 0.12), inset(quad[1], quad[3], 0.12), inset(quad[2], quad[0], 0.12), inset(quad[3], quad[1], 0.12)];
            poly(c, inner, C.peach, 5 * s);
            // (a little sun painted on each panel)
            dot(c, inset(inner[0], inner[2], 0.5), 22 * s, i % 2 ? C.teal : C.coral);
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
