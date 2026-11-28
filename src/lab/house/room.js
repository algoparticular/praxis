// The inside of Gratitud's house, for the hide and seek (HideSeek.vue): one big room seen as Sid's world is seen, a
// floor in perspective going back to a wall, the camera high and following him across. Everything is drawn in code,
// in the colours of the house in the card (its coral roof, its peach walls, its purple, its sand and its teal) with the
// world's ink line, until the illustrator draws an inside.
//
// Coordinates as in the world: x across (0 in the middle of the room), d into the distance (0 near the front), up in
// px over the floor. A camera `cam` ({ x0, cam, groundAt(d), scaleAt(d) }) puts a point on the screen.

export const INK = '#102A34';
const C = {
    cream: '#FBF4E4', coral: '#F5797A', coralDark: '#D85A5E', peach: '#FBC390', peachDark: '#EFAE78', teal: '#029EA2',
    tealDark: '#0C666E', purple: '#9C72C8', purpleDark: '#7E58AE', sand: '#E2BE92', sandDark: '#C19D75', aqua: '#9EE0DA',
    sky: '#73CBCF', sea: '#2AA8A6', sun: '#F5797A', wood: '#C99A68', woodDark: '#A47A4E',
};

// The room: its walls at x0 and x1, its back wall at d1, its floor from d0 (the front, open to us, as a doll's house)
export const ROOM = { x0: -1300, x1: 1300, d0: -380, d1: 1500, wall: 1150, wainscot: 360 };
// Where they can walk (a little in from the walls)
export const BOUNDS = { x0: -1210, x1: 1210, d0: -300, d1: 1420 };
// The door they come in by, in the left wall (from d to d + w, up to h), and where they stand once in
export const DOOR = { d: 820, w: 330, h: 760 };
export const ENTRY = { from: { x: -1330, d: DOOR.d + DOOR.w / 2 }, to: { x: -1020, d: DOOR.d + DOOR.w / 2 - 60 } };

// The hiding places: where each stands (its middle on the floor, how wide, how deep, how high), where Sid stands to
// go into it or to look in it (spot), and its name. Each also stands in the way (an ellipse round it)
export const SPOTS = [
    { id: 'wardrobe', es: 'el ropero', en: 'the wardrobe', x: -820, d: 1380, w: 470, dd: 190, h: 1000, spot: { x: -820, d: 1180 } },
    { id: 'curtain', es: 'la cortina', en: 'the curtain', x: 930, d: 1470, w: 280, dd: 40, h: 1060, spot: { x: 930, d: 1330 }, flat: true },
    { id: 'bed', es: 'la cama', en: 'the bed', x: 880, d: 920, w: 560, dd: 660, h: 300, spot: { x: 880, d: 500 } },
    { id: 'sofa', es: 'el sillón', en: 'the sofa', x: -430, d: 640, w: 700, dd: 260, h: 430, spot: { x: -430, d: 400 } },
    { id: 'table', es: 'la mesa', en: 'the table', x: 200, d: 330, w: 520, dd: 340, h: 330, spot: { x: 200, d: 60 } },
    { id: 'chest', es: 'el baúl', en: 'the chest', x: 900, d: 120, w: 420, dd: 240, h: 330, spot: { x: 900, d: -150 } },
    { id: 'screen', es: 'el biombo', en: 'the screen', x: -960, d: 180, w: 440, dd: 90, h: 760, spot: { x: -960, d: -60 } },
];
// What only stands there (a plant in its pot, a lamp): in the way, not a hiding place
const DECOR = [
    { id: 'plant', x: -170, d: 1390, w: 200, dd: 160, h: 250 },
    { id: 'lamp', x: 330, d: 1380, w: 140, dd: 140, h: 780 },
];

// What stands in the way, for the puppets: an ellipse round each thing
export function obstacles() {
    return [...SPOTS, ...DECOR].map((o) => ({ x: o.x, d: o.d, r: o.w / 2 + 40, rd: o.dd / 2 + 40 }));
}

// The live state of each hiding place: open (looking in it, 0..1), a tremble (the one hiding moves a little), seen
// (looked in and empty), lit (just touched)
export function createSpots() {
    return SPOTS.map((s) => ({ ...s, open: 0, openTo: 0, shake: 0, seen: false, lit: 0, box: null }));
}

// --- Drawing ---
const P = (cam, x, d, up = 0) => { const s = cam.scaleAt(d); return { x: cam.x0 + (x - cam.cam) * s, y: cam.groundAt(d) - up * s }; };
function poly(c, pts, fill, line = 9, stroke = INK) {
    c.beginPath();
    pts.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)));
    c.closePath();
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (line) { c.strokeStyle = stroke; c.lineWidth = line; c.lineJoin = 'round'; c.stroke(); }
}
// A box standing on the floor (x0..x1, d0..d1, from up h0 to h): the side that faces the camera, its top and its front
function box(c, cam, b, fills, line) {
    const { x0, x1, d0, d1, h, h0 = 0 } = b;
    const lw = line * cam.scaleAt((d0 + d1) / 2);
    if (x0 > cam.cam) poly(c, [P(cam, x0, d0, h0), P(cam, x0, d1, h0), P(cam, x0, d1, h), P(cam, x0, d0, h)], fills.side, lw);
    if (x1 < cam.cam) poly(c, [P(cam, x1, d0, h0), P(cam, x1, d1, h0), P(cam, x1, d1, h), P(cam, x1, d0, h)], fills.side, lw);
    poly(c, [P(cam, x0, d0, h), P(cam, x1, d0, h), P(cam, x1, d1, h), P(cam, x0, d1, h)], fills.top, lw);
    poly(c, [P(cam, x0, d0, h0), P(cam, x1, d0, h0), P(cam, x1, d0, h), P(cam, x0, d0, h)], fills.front, lw);
}
const line = (c, a, b, w) => { c.strokeStyle = INK; c.lineWidth = w; c.lineCap = 'round'; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); };
const dot = (c, p, r, fill = INK) => { c.fillStyle = fill; c.beginPath(); c.arc(p.x, p.y, r, 0, Math.PI * 2); c.fill(); };

// The room itself: the sky and the island outside (it is a doll's house: its front is open), its floor, its walls,
// the window, the door
export function drawRoom(c, cam, view, t) {
    const R = ROOM, s1 = cam.scaleAt(R.d1);
    // outside: the card's turquoise sky and the teal of the island
    const horizon = cam.groundAt(cam.far);
    c.fillStyle = C.sky; c.fillRect(0, 0, view.W, view.H);
    c.fillStyle = C.sea; c.fillRect(0, horizon, view.W, view.H);
    // the floor: sand, with its boards going back
    const fl = [P(cam, R.x0, R.d0), P(cam, R.x1, R.d0), P(cam, R.x1, R.d1), P(cam, R.x0, R.d1)];
    // (the house's base under the open front, in the dark teal of its steps)
    const baseH = 120;
    poly(c, [P(cam, R.x0, R.d0), P(cam, R.x1, R.d0), P(cam, R.x1, R.d0, -baseH), P(cam, R.x0, R.d0, -baseH)], C.tealDark, 10 * cam.scaleAt(R.d0));
    poly(c, fl, C.sand, 0);
    c.save();
    c.beginPath(); fl.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y))); c.closePath(); c.clip();
    for (let x = R.x0 + 190; x < R.x1; x += 190) line(c, P(cam, x, R.d0), P(cam, x, R.d1), 3.2 * cam.scaleAt(R.d0));
    // (the boards' ends, staggered)
    for (let d = R.d0 + 260, n = 0; d < R.d1; d += 260, n++) {
        for (let x = R.x0 + (n % 2 ? 95 : 190); x < R.x1; x += 380) line(c, P(cam, x, d), P(cam, x + 190, d), 2.6 * cam.scaleAt(d));
    }
    c.restore();
    // a round rug in the middle: teal with a coral ring, lying flat
    {
        const m = P(cam, -120, 980), s = cam.scaleAt(980), flat = cam.perDepth * 1.0;
        c.save(); c.translate(m.x, m.y); c.scale(1, flat);
        c.fillStyle = C.teal; c.strokeStyle = INK; c.lineWidth = 8 * s / flat;
        c.beginPath(); c.ellipse(0, 0, 520 * s, 330 * s, 0, 0, Math.PI * 2); c.fill(); c.stroke();
        c.strokeStyle = C.coral; c.lineWidth = 26 * s / flat;
        c.beginPath(); c.ellipse(0, 0, 410 * s, 250 * s, 0, 0, Math.PI * 2); c.stroke();
        c.fillStyle = C.aqua; c.beginPath(); c.ellipse(0, 0, 170 * s, 100 * s, 0, 0, Math.PI * 2); c.fill();
        c.restore();
    }
    // the side walls (peach, darker), with the purple below; the door in the left one
    for (const x of [R.x0, R.x1]) {
        poly(c, [P(cam, x, R.d0), P(cam, x, R.d1), P(cam, x, R.d1, R.wall), P(cam, x, R.d0, R.wall)], C.peachDark, 10 * s1);
        poly(c, [P(cam, x, R.d0), P(cam, x, R.d1), P(cam, x, R.d1, R.wainscot), P(cam, x, R.d0, R.wainscot)], C.purpleDark, 8 * s1);
    }
    {
        const x = R.x0, d0 = DOOR.d, d1 = DOOR.d + DOOR.w;
        poly(c, [P(cam, x, d0), P(cam, x, d1), P(cam, x, d1, DOOR.h), P(cam, x, d0, DOOR.h)], C.coral, 10 * cam.scaleAt(d0));
        poly(c, [P(cam, x, d0 + 40), P(cam, x, d1 - 40), P(cam, x, d1 - 40, DOOR.h - 50), P(cam, x, d0 + 40, DOOR.h - 50)], C.coralDark, 5 * cam.scaleAt(d0));
        dot(c, P(cam, x, d1 - 70, DOOR.h * 0.45), 12 * cam.scaleAt(d1), C.cream);
    }
    // the back wall: peach, purple below with a cream rail
    poly(c, [P(cam, R.x0, R.d1), P(cam, R.x1, R.d1), P(cam, R.x1, R.d1, R.wall), P(cam, R.x0, R.d1, R.wall)], C.peach, 10 * s1);
    poly(c, [P(cam, R.x0, R.d1), P(cam, R.x1, R.d1), P(cam, R.x1, R.d1, R.wainscot), P(cam, R.x0, R.d1, R.wainscot)], C.purple, 8 * s1);
    line(c, P(cam, R.x0, R.d1, R.wainscot), P(cam, R.x1, R.d1, R.wainscot), 14 * s1);
    // its boards, as on the outside of the house in the card
    for (let x = R.x0 + 160; x < R.x1; x += 160) line(c, P(cam, x, R.d1, 30), P(cam, x, R.d1, R.wainscot - 30), 3 * s1);
    // the window: the sea and the sky of the card, a coral sun going slowly
    {
        const w0 = 120, w1 = 700, u0 = 470, u1 = 930;
        const pts = [P(cam, w0, R.d1, u0), P(cam, w1, R.d1, u0), P(cam, w1, R.d1, u1), P(cam, w0, R.d1, u1)];
        poly(c, pts, C.sky, 0);
        c.save(); c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y))); c.closePath(); c.clip();
        const sun = P(cam, w0 + 330 + 40 * Math.sin(t * 0.05), R.d1, u0 + 230);
        dot(c, sun, 60 * s1, C.sun);
        const sea = P(cam, w0, R.d1, u0 + 130);
        c.fillStyle = C.sea; c.fillRect(pts[0].x, sea.y, pts[1].x - pts[0].x, pts[0].y - sea.y);
        for (let n = 0; n < 4; n++) {
            const wx = w0 + 60 + n * 140 + 30 * Math.sin(t * 0.6 + n), wv = P(cam, wx, R.d1, u0 + 60 + (n % 2) * 40);
            c.strokeStyle = C.aqua; c.lineWidth = 6 * s1; c.beginPath(); c.arc(wv.x, wv.y, 18 * s1, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
        }
        c.restore();
        poly(c, pts, null, 14 * s1);
        line(c, P(cam, (w0 + w1) / 2, R.d1, u0), P(cam, (w0 + w1) / 2, R.d1, u1), 10 * s1);
        line(c, P(cam, w0 - 30, R.d1, u0), P(cam, w1 + 30, R.d1, u0), 16 * s1);
    }
    // a little picture on the wall: three dots of the brand over the wardrobe's side
    {
        const f = [P(cam, -460, R.d1, 620), P(cam, -230, R.d1, 620), P(cam, -230, R.d1, 820), P(cam, -460, R.d1, 820)];
        poly(c, f, C.cream, 9 * s1);
        dot(c, P(cam, -390, R.d1, 690), 18 * s1, C.coral); dot(c, P(cam, -300, R.d1, 690), 18 * s1, C.teal); dot(c, P(cam, -345, R.d1, 760), 18 * s1, C.purple);
    }
    // the top of the walls: the coral of its roof, as a beam
    poly(c, [P(cam, R.x0, R.d1, R.wall), P(cam, R.x1, R.d1, R.wall), P(cam, R.x1, R.d1, R.wall + 70), P(cam, R.x0, R.d1, R.wall + 70)], C.coral, 10 * s1);
    for (const x of [R.x0, R.x1]) poly(c, [P(cam, x, R.d0, R.wall), P(cam, x, R.d1, R.wall), P(cam, x, R.d1, R.wall + 70), P(cam, x, R.d0, R.wall + 70)], C.coralDark, 10 * s1);
}

// Each thing in the room, back to front, with whatever stands among them (the puppets) put in at its depth:
// `between(d0, d1)` draws what stands between two depths
export function drawThings(c, cam, spots, t, between) {
    const all = [...spots.map((s) => ({ s, d: s.d })), ...DECOR.map((o) => ({ o, d: o.d }))].sort((a, b) => b.d - a.d);
    let last = Infinity;
    for (const it of all) {
        between(it.d, last);
        last = it.d;
        if (it.s) drawSpot(c, cam, it.s, t);
        else drawDecor(c, cam, it.o, t);
    }
    between(-Infinity, last);
}

function drawDecor(c, cam, o, t) {
    const s = cam.scaleAt(o.d);
    if (o.id === 'plant') {
        // a pot of the house's coral, a palm of the island's in it, swaying a little
        box(c, cam, { x0: o.x - 80, x1: o.x + 80, d0: o.d - 60, d1: o.d + 60, h: 170 }, { front: C.coral, top: '#5A4A36', side: C.coralDark }, 9);
        const base = P(cam, o.x, o.d - 60, 170);
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

function drawSpot(c, cam, sp, t) {
    const s = cam.scaleAt(sp.d), shake = sp.shake > 0 ? Math.sin(t * 46) * 7 * Math.min(1, sp.shake * 2) : 0;
    const o = sp.open, x0 = sp.x - sp.w / 2 + shake, x1 = sp.x + sp.w / 2 + shake, d0 = sp.d - sp.dd / 2, d1 = sp.d + sp.dd / 2;
    c.save();
    // (just touched, or calling: a warm glow round it)
    if (sp.lit > 0.01) {
        const m = P(cam, sp.x, d0, sp.h * 0.5), r = Math.max(sp.w, sp.h) * 0.75 * s;
        const g = c.createRadialGradient(m.x, m.y, 0, m.x, m.y, r);
        g.addColorStop(0, `rgba(255,240,200,${0.55 * sp.lit})`); g.addColorStop(1, 'rgba(255,240,200,0)');
        c.fillStyle = g; c.beginPath(); c.arc(m.x, m.y, r, 0, Math.PI * 2); c.fill();
    }
    if (sp.id === 'wardrobe') {
        box(c, cam, { x0, x1, d0, d1, h: sp.h }, { front: C.purple, top: C.purpleDark, side: C.purpleDark }, 10);
        // its inside, dark, as its doors open; and its two coral doors swinging out
        const mid = (x0 + x1) / 2, inset = 30;
        poly(c, [P(cam, x0 + inset, d0, 60), P(cam, x1 - inset, d0, 60), P(cam, x1 - inset, d0, sp.h - 60), P(cam, x0 + inset, d0, sp.h - 60)], '#3A2458', 0);
        if (o > 0.05) {   // (hangers in it)
            line(c, P(cam, x0 + inset + 20, d0 + 40, sp.h - 150), P(cam, x1 - inset - 20, d0 + 40, sp.h - 150), 6 * s);
            for (let n = 0; n < 4; n++) poly(c, [P(cam, x0 + 90 + n * 90, d0 + 40, sp.h - 150), P(cam, x0 + 50 + n * 90, d0 + 40, sp.h - 220), P(cam, x0 + 130 + n * 90, d0 + 40, sp.h - 220)], null, 4 * s);
        }
        const door = (hinge, other, way) => {
            const a = o * 1.9, wd = Math.abs(other - hinge);
            const ex = hinge + Math.cos(a) * wd * way, ed = d0 - Math.sin(a) * wd;
            poly(c, [P(cam, hinge, d0, 60), P(cam, ex, ed, 60), P(cam, ex, ed, sp.h - 60), P(cam, hinge, d0, sp.h - 60)], C.coral, 9 * s);
            dot(c, P(cam, hinge + (ex - hinge) * 0.82, d0 + (ed - d0) * 0.82, sp.h * 0.5), 12 * s, C.cream);
        };
        door(x0 + inset, mid, 1); door(x1 - inset, mid, -1);
        // its little legs and its crown
        poly(c, [P(cam, x0 - 20, d0, sp.h), P(cam, x1 + 20, d0, sp.h), P(cam, x1 + 20, d0, sp.h + 50), P(cam, x0 - 20, d0, sp.h + 50)], C.coralDark, 9 * s);
    } else if (sp.id === 'curtain') {
        // a long coral curtain beside the window, from its rod to the floor, in folds; looked behind, drawn aside
        const rodY = sp.h, w = sp.w * (1 - 0.7 * o), left = x0;
        line(c, P(cam, x0 - 60, sp.d, rodY + 20), P(cam, x1 + 60, sp.d, rodY + 20), 12 * s);
        const folds = 5, pts = [];
        for (let n = 0; n <= folds * 2; n++) pts.push(P(cam, left + w * n / (folds * 2) + (n % 2 ? 14 : 0), sp.d - (n % 2 ? 30 : 0), 0));
        const top = [P(cam, left + w, sp.d, rodY), P(cam, left, sp.d, rodY)];
        c.beginPath(); c.moveTo(top[1].x, top[1].y);
        for (const p of pts) c.lineTo(p.x, p.y + Math.sin(t * 1.3 + p.x * 0.05) * 2 * s);
        c.lineTo(top[0].x, top[0].y); c.closePath();
        c.fillStyle = C.coral; c.fill(); c.strokeStyle = INK; c.lineWidth = 9 * s; c.lineJoin = 'round'; c.stroke();
        for (let n = 1; n < folds; n++) line(c, P(cam, left + w * n / folds, sp.d, rodY - 40), P(cam, left + w * n / folds + 6, sp.d - 20, 40), 4 * s);
        poly(c, [P(cam, left, sp.d, rodY * 0.52), P(cam, left + w, sp.d, rodY * 0.5), P(cam, left + w, sp.d, rodY * 0.47), P(cam, left, sp.d, rodY * 0.49)], C.cream, 5 * s);
    } else if (sp.id === 'bed') {
        // the bed: its headboard against the back, its mattress, a teal blanket hanging to the floor, a cream pillow;
        // looked under, the blanket's front lifts
        box(c, cam, { x0, x1, d0: d1 - 50, d1, h: 600 }, { front: C.wood, top: C.woodDark, side: C.woodDark }, 10);
        box(c, cam, { x0, x1, d0, d1: d1 - 50, h: sp.h }, { front: C.tealDark, top: C.teal, side: C.tealDark }, 10);
        box(c, cam, { x0: x0 + 60, x1: x1 - 60, d0: d1 - 230, d1: d1 - 70, h: sp.h + 70, h0: sp.h }, { front: C.cream, top: C.cream, side: '#EDE3CC' }, 8);
        // (the blanket's hem in front: lifted as one looks under)
        const lift = o * (sp.h - 40);
        poly(c, [P(cam, x0, d0, lift), P(cam, x1, d0, lift), P(cam, x1, d0, sp.h), P(cam, x0, d0, sp.h)], C.teal, 10 * s);
        for (let n = 1; n < 6; n++) dot(c, P(cam, x0 + sp.w * n / 6, d0, (sp.h + lift) / 2), 9 * s, C.aqua);
        if (o > 0.05) poly(c, [P(cam, x0 + 20, d0, 0), P(cam, x1 - 20, d0, 0), P(cam, x1 - 20, d0, lift), P(cam, x0 + 20, d0, lift)], '#0A3E44', 0);
    } else if (sp.id === 'sofa') {
        // a coral sofa with its arms; looked behind, it scoots forward and tips a little
        const k = o, dz = -80 * k;
        c.save();
        const pivot = P(cam, sp.x, d0 + dz, 0); c.translate(pivot.x, pivot.y); c.rotate(-0.04 * k); c.translate(-pivot.x, -pivot.y);
        box(c, cam, { x0, x1, d0: d1 - 90 + dz, d1: d1 + dz, h: sp.h }, { front: C.coral, top: C.coralDark, side: C.coralDark }, 10);
        box(c, cam, { x0, x1, d0: d0 + dz, d1: d1 - 90 + dz, h: 220 }, { front: C.coralDark, top: C.coral, side: C.coralDark }, 10);
        box(c, cam, { x0, x1: x0 + 90, d0: d0 + dz, d1: d1 + dz, h: 310 }, { front: C.coral, top: C.coralDark, side: C.coralDark }, 10);
        box(c, cam, { x0: x1 - 90, x1, d0: d0 + dz, d1: d1 + dz, h: 310 }, { front: C.coral, top: C.coralDark, side: C.coralDark }, 10);
        // a cushion of the island's teal
        box(c, cam, { x0: x0 + 120, x1: x0 + 300, d0: d1 - 140 + dz, d1: d1 - 100 + dz, h: 380, h0: 220 }, { front: C.aqua, top: C.aqua, side: C.teal }, 8);
        c.restore();
    } else if (sp.id === 'table') {
        // a table under a cream cloth with coral dots down to the floor; looked under, the cloth's front lifts
        const lift = o * (sp.h - 30);
        box(c, cam, { x0, x1, d0, d1, h: sp.h }, { front: C.cream, top: C.cream, side: '#EDE3CC' }, 10);
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
        dot(c, { x: pot.x, y: pot.y - 118 * s }, 12 * s);
        const cup = P(cam, sp.x + 140, sp.d - 40, sp.h);
        poly(c, [{ x: cup.x - 30 * s, y: cup.y - 50 * s }, { x: cup.x + 30 * s, y: cup.y - 50 * s }, { x: cup.x + 22 * s, y: cup.y }, { x: cup.x - 22 * s, y: cup.y }], C.peach, 6 * s);
    } else if (sp.id === 'chest') {
        // a wooden chest with dark bands; looked in, its lid swings up
        box(c, cam, { x0, x1, d0, d1, h: sp.h - 60 }, { front: C.wood, top: '#3A2A1A', side: C.woodDark }, 10);
        for (const u of [0.22, 0.78]) line(c, P(cam, x0 + sp.w * u, d0, 0), P(cam, x0 + sp.w * u, d0, sp.h - 60), 22 * s);
        dot(c, P(cam, sp.x, d0, sp.h - 110), 16 * s, C.cream);
        // the lid: over the box, or swung up about its back edge
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
            poly(c, [inset(quad[0], quad[2], 0.12), inset(quad[1], quad[3], 0.12), inset(quad[2], quad[0], 0.12), inset(quad[3], quad[1], 0.12)], C.peach, 5 * s);
            line(c, P(cam, px, pd, 0), P(cam, px, pd, 30), 10 * s);
            px = nx; pd = nd;
        }
        line(c, P(cam, px, pd, 0), P(cam, px, pd, 30), 10 * s);
    }
    c.restore();
    // where it is on the screen, for a touch on it (its box from its front's foot up to its top)
    const a = P(cam, x0, d0, 0), b = P(cam, x1, d0, 0), top = P(cam, sp.x, sp.d, sp.h);
    sp.box = { x0: Math.min(a.x, b.x) - 10, x1: Math.max(a.x, b.x) + 10, y0: Math.min(top.y, P(cam, sp.x, d1, sp.h).y) - 10, y1: Math.max(a.y, b.y) + 20 };
    // looked in and found empty: a ring of faint dots on the floor where one stands to look
    if (sp.seen) {
        const m = P(cam, sp.spot.x, sp.spot.d), r = 60 * cam.scaleAt(sp.spot.d);
        c.fillStyle = 'rgba(16,42,52,0.35)';
        for (let i = 0; i < 10; i++) { const q = i / 10 * Math.PI * 2; c.beginPath(); c.arc(m.x + Math.cos(q) * r, m.y + Math.sin(q) * r * 0.32, 6 * cam.scaleAt(sp.spot.d), 0, Math.PI * 2); c.fill(); }
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
