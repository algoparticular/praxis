// The world round Sid in the puppet lab (/lab/sid): the little ticks of grass, a stipple and the streaks of the ground
// drawn in code with a pen of ink, and her drawn pieces (originales/arbol, made into src/lab/arbol by
// scripts/convert-lab-arbol.mjs: each piece's line, and what is inside it, painted in code): ferns, a sprout that curls
// up into a bead, pebbles and a stack of them, each on the ground, spread over the world, and her tree ahead of him on
// his way (TREE). It is endless: it is made a stretch at a time from where it is (the same
// place is always the same), and only what is on the screen is drawn. Everything starts in ink and takes its colour
// (one of the seven of the chakras) as he walks by it, and all round him when he sits in lotus (a wave goes out of
// him); what has taken its colour keeps it. The palette, the clouds and the day are Ciclos's (CICLOS below): the ink of its
// line, its white Sid, its yellow sky, its hills that go from dry to green, and its white clouds (its own atlas,
// public/assets/ciclos/clouds.webp, with the boxes in ciclosScene.json). Day and night come and go as in the card: the
// yellow day with its red sun and its stippled corona, the teal night with its stars and its moon (moon.webp and its
// stipple), each rising from under the horizon, crossing the sky and setting under it again; the ground is the card's
// hills: green with yellow streaks by day, yellow with mustard-brown ones by night. The starry night itself is the
// cards' own sky (useStarField.js), behind the yellow, which clears as night comes. While he meditates the cycle runs faster.
import ciclos from '../composables/ciclosScene.json';
import { decodeCloud, sampleCloud } from '../composables/stippleCloud.js';
import arbol from './arbol/arbol.json';

// Her pieces: the line and what is inside it, as pictures (tinted in code)
const URLS = import.meta.glob('./arbol/*.webp', { eager: true, query: '?url', import: 'default' });
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
const boxOf = (name) => arbol.pieces[name].box.map((v) => v * UNIT);
// A picture in one colour (its transparency kept), made once per colour
const TINTS = new Map();
function tint(name, colour) {
    const key = `${name}|${colour}`, img = PICTURES[name];
    if (TINTS.has(key)) return TINTS.get(key);
    if (!ready(img)) return null;
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
export const TREE = { x: 2000, d: 230, behind: 160, scale: 1.33, foot: { x: 640, y: 1358 } };
// The pieces spread over the world, how often each comes, what colour it takes, and whether it sways
const SCATTER = [
    { name: 'fern', weight: 3, sway: 0.5, colour: 'green' }, { name: 'fernSmall', weight: 3, sway: 0.6, colour: 'green' },
    { name: 'fernLow', weight: 3, sway: 0.5, colour: 'green' }, { name: 'sprout', weight: 2, sway: 1, colour: 'warm' },
    { name: 'pebble', weight: 2 }, { name: 'pebbles', weight: 2 }, { name: 'pebbleGrass', weight: 2 },
    { name: 'pebbleFlat', weight: 2 }, { name: 'cairn', weight: 1 },
];

const STRETCH = 520;            // the width of the stretch of world made at a time (px of his world)
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
const PALETTE = CICLOS.colours.map((c) => ({ light: hex(c.light), ink: hex(c.ink) }));
const GREENS = [1, 0, 1, 3];    // the ground's plants: mostly its green and its teal (and its yellow)
const WARM = [2, 5, 3, 0];      // the beads of the sprouts
const mixRgb = (a, b, t) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',')})`;

export function createWorld({ depth, clouds = null, moon = null }) {
    const INK = hex(CICLOS.ink);
    let clock = 0.2;                        // the cycle: 0 sunrise, 0.25 noon, 0.5 sunset, 0.75 midnight
    const CYCLE = 90;                       // s for a whole day and night (a third of it while he meditates)
    const stretches = new Map();
    const colour = new Map();               // how much colour each thing has taken (0..1), kept when it goes off screen
    const life = new Map();                 // what moves on each thing (a bend, a hop, a blink)
    let ripple = null;                      // the wave of colour out of him while he sits
    let time = 0;

    // ---- making a stretch ----
    function make(index) {
        const r = random(index * 7919 + 104729), items = [];
        const pick = (list) => list[Math.floor(r() * list.length)];
        const at = () => ({ x: index * STRETCH + r() * STRETCH, d: -180 + r() * (depth + 180) });
        const jitter = (p, a = 0.8) => [p[0] + (r() - 0.5) * a, p[1] + (r() - 0.5) * a];
        const add = (item) => items.push({ id: `${index}:${items.length}`, ...item });

        const tick = (x, d, big = 1) => {
            const s = (0.8 + r() * 0.6) * big, kind = r();
            let strokes;
            if (kind < 0.45) strokes = [[[-2, 0], [-7, -16]], [[2, 0], [6, -18]]];                    // v
            else if (kind < 0.65) strokes = [[[-4, 0], [-9, -13]], [[0, 0], [1, -19]], [[4, 0], [10, -14]]];   // a tuft
            else if (kind < 0.8) strokes = [[[-8, -2], [0, -14]], [[0, -14], [8, -2]]];               // ^
            else if (kind < 0.9) strokes = [[[-9, 0], [9, -1]]];                                      // -
            else strokes = [[[-11, 0], [-4, -4], [3, 0], [10, -4]]];                                  // ~
            add({ kind: 'tick', x, d, color: pick(GREENS), strokes: strokes.map((st) => st.map((p) => jitter([p[0] * s, p[1] * s]))) });
        };

        // her tree, where it stands (its stretch keeps clear round it for its own plants)
        const treeHere = TREE.x >= index * STRETCH && TREE.x < (index + 1) * STRETCH;
        if (treeHere) add({ kind: 'tree', x: TREE.x, d: TREE.d, reach: 700 });
        // nothing of the world stands on or just in front of its roots (as the camera moves it would cross them)
        const clear = (p) => Math.abs(p.x - TREE.x) > 640 || p.d < TREE.d - 300 || p.d > TREE.d + 140;

        for (let n = 0; n < 34; n++) { const p = at(); if (clear(p)) tick(p.x, p.d); }
        // her pieces, spread: ferns, sprouts, pebbles, now and then a stack of them
        const weights = SCATTER.reduce((t, k) => t + k.weight, 0);
        for (let n = 0, m = 3 + Math.floor(r() * 3); n < m; n++) {
            const p = at();
            if (!clear(p)) continue;
            let w = r() * weights, kind = SCATTER[0];
            for (const k of SCATTER) { w -= k.weight; if (w <= 0) { kind = k; break; } }
            const colour = kind.colour === 'green' ? pick(GREENS) : kind.colour === 'warm' ? pick(WARM) : pick([4, 3, 5, 0]);
            add({ kind: 'piece', name: kind.name, x: p.x, d: p.d, scale: 0.6 + r() * 0.3, flip: r() < 0.5 ? -1 : 1, sway: kind.sway ?? 0, color: colour });
        }
        // streaks on the hills, as the card's: short brush strokes lying along the ground (pills with round ends, a little
        // curved, now and then two in a row) and a few small ovals, in the ground's other colour
        for (let n = 0, m = 12 + Math.floor(r() * 6); n < m; n++) {
            const p = at(), long = 22 + r() * 60, wide = 5 + r() * 6, bend = (r() - 0.5) * wide * 1.6, tilt = (r() - 0.5) * 6;
            if (!clear(p)) continue;
            const strokes = [{ long, wide, bend, tilt, dx: 0 }];
            if (r() < 0.3) strokes.push({ long: long * (0.3 + r() * 0.3), wide: wide * 0.9, bend: bend * 0.5, tilt, dx: long * 0.5 + 10 + r() * 12 });
            add({ kind: 'streak', x: p.x, d: p.d, strokes, oval: r() < 0.12 ? { rx: 14 + r() * 16, ry: 5 + r() * 4 } : null });
        }
        // a stipple on the ground, thinning out from its middle
        for (let n = 0, m = 1 + Math.floor(r() * 2); n < m; n++) {
            const p = at(), R = 70 + r() * 110, dots = [];
            if (!clear(p)) continue;
            for (let k = 0; k < 70; k++) {
                const a = r() * Math.PI * 2, t = Math.pow(r(), 0.7);
                dots.push([Math.cos(a) * R * t, Math.sin(a) * R * t * 0.3, 1.6 + r() * 2.4 * (1 - t)]);
            }
            add({ kind: 'stipple', x: p.x, d: p.d, dots, color: Math.floor(r() * PALETTE.length) });
        }
        return items;
    }
    const stretch = (i) => { if (!stretches.has(i)) stretches.set(i, make(i)); return stretches.get(i); };

    // The clouds of Ciclos, drifting slowly far away (they move little with the camera), where the card has them
    const sky = ciclos.clouds.map(([x, y, w, h, ax, ay], i) => ({ x: x / ciclos.size, y: y / 1300, w, h, ax, ay, speed: 5 + (i % 5) * 2.5 }));

    // ---- what moves ----
    const lifeOf = (item) => {
        if (!life.has(item.id)) life.set(item.id, { bend: 0 });
        return life.get(item.id);
    };
    const wind = (x) => 0.07 * Math.sin(time * 0.9 + x * 0.004) + 0.035 * Math.sin(time * 2.3 + x * 0.013);

    function update(dt, sid) {
        time += dt;
        clock = (clock + dt / CYCLE * (sid.sitting ? 3 : 1)) % 1;
        if (sid.sitting) {
            if (!ripple) ripple = { x: sid.x, d: sid.d, r: 0 };
            ripple.r = Math.min(1400, ripple.r + dt * 260);
        } else ripple = null;
        for (const [i, items] of stretches) {
            if (Math.abs(i * STRETCH - sid.x) > 3000) continue;
            for (const item of items) {
                const dx = item.x - sid.x, dd = (item.d - sid.d) * 1.6, dist = Math.hypot(dx, dd);
                // colour: as he walks by, and inside the wave while he sits
                let c = colour.get(item.id) ?? 0;
                const near = item.kind === 'tree' ? 950 : 170;
                if (dist < near) c = Math.min(1, c + dt * 0.9 * (1 - dist / near) * 2);
                if (ripple && Math.hypot(item.x - ripple.x, (item.d - ripple.d) * 1.6) < ripple.r) c = Math.min(1, c + dt * 1.4);
                if (c > 0) colour.set(item.id, c);
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
        const box = boxOf(name), w = box[2] * k, h = box[3] * k;
        if (arbol.pieces[name].fill && layer !== 'line') {
            const base = tint(`${name}-fill`, CICLOS.white), coloured = col > 0.01 && tint(`${name}-fill`, `rgb(${P.light.join(',')})`);
            if (base) c.drawImage(base, left, top, w, h);
            if (coloured) { c.globalAlpha *= col; c.drawImage(coloured, left, top, w, h); c.globalAlpha /= col; }
        }
        if (layer === 'fill') return;
        const ink = tint(name, CICLOS.ink), coloured = tintLine && col > 0.01 && tint(name, `rgb(${P.ink.join(',')})`);
        if (ink) c.drawImage(ink, left, top, w, h);
        if (coloured) { c.globalAlpha *= col * 0.85; c.drawImage(coloured, left, top, w, h); c.globalAlpha /= col * 0.85; }
    }

    function drawItem(c, item) {
        const col = colour.get(item.id) ?? 0, P = PALETTE[item.color ?? 1], line = mixRgb(INK, P.ink, col * 0.8);
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
            piece(c, item.name, -box[2] * k / 2, -box[3] * k, k, P, col, !arbol.pieces[item.name].fill);
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
    function draw(c, view, keep, him = null) {
        const far = view.scaleAt(depth), half = view.width / 2 / far + 400;
        const first = Math.floor((view.cam - half) / STRETCH), last = Math.floor((view.cam + half) / STRETCH);
        const shown = [];
        for (let i = first; i <= last; i++) for (const item of stretch(i)) if (item.kind !== 'streak' && keep(order(item))) shown.push(item);
        shown.sort((a, b) => order(b) - order(a));
        for (const item of shown) {
            const s = view.scaleAt(item.d), x = view.x0 + (item.x - view.cam) * s;
            const reach = (item.reach ?? 300) * s;
            if (x < -reach || x > view.width + reach) continue;
            c.save(); c.translate(x, view.groundAt(item.d)); c.scale(s, s);
            if (him && item.kind !== 'tree' && item.d < him.d && him.d - item.d < 220 && Math.abs(item.x - him.x) < 150) c.globalAlpha = 0.22;
            drawItem(c, item);
            c.restore();
        }
    }

    // How much light there is: 1 all day, 0 all night, a soft dusk and dawn between
    const light = () => { const v = 0.5 + 2.8 * Math.sin(clock * Math.PI * 2); return Math.max(0, Math.min(1, v)); };   // (a short dusk)
    const lerp = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
    const detailRgb = () => lerp(hex(CICLOS.detailNight), hex(CICLOS.detailDay), light());

    // The sky: Ciclos's yellow by day, clearing as night comes so the cards' starry night behind it shows (the page draws
    // it, useStarField.js); the sun by day and the moon by night, each rising from under the horizon, crossing the sky
    // and setting under it (the ground, drawn after, hides them); and its clouds, solid white as in the card
    function drawSky(c, view, top, bottom) {
        const L = light(), H = bottom - top;
        c.clearRect(0, top, view.width, H + 2);
        c.globalAlpha = L; c.fillStyle = CICLOS.sky; c.fillRect(0, top, view.width, H + 2); c.globalAlpha = 1;
        const scale = H / 1300 * 0.55;
        const along = (t, r) => ({ x: view.width * (0.06 + 0.88 * t), y: bottom + r - (bottom + r - (top + H * 0.4)) * Math.sin(Math.PI * t) });   // (high, but under the buttons)
        const sunT = clock < 0.5 ? clock / 0.5 : null, moonT = clock >= 0.5 ? (clock - 0.5) / 0.5 : null;
        if (sunT != null) drawSun(c, along(sunT, ciclos.sun.r * scale * 1.6), scale);
        if (moonT != null && moon?.complete && moon.naturalWidth) {
            const m = ciclos.moon, [bx, by, bw, bh] = ciclos.boxes.moon, p = along(moonT, m.r * scale * 1.1);
            c.drawImage(moon, p.x + (bx - m.x) * scale, p.y + (by - m.y) * scale, bw * scale, bh * scale);
            c.fillStyle = CICLOS.ink; c.globalAlpha = 0.55;
            for (const [x, y, r] of m.dots) { c.beginPath(); c.arc(p.x + (x - m.x) * scale, p.y + (y - m.y) * scale, r * scale, 0, Math.PI * 2); c.fill(); }
            c.globalAlpha = 1;
        }
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
        const breath = Math.sin(time * 0.6), solid = sun.cloud.solid * scale, rgb = hex(CICLOS.sun);
        const glow = (radius, colour, stops) => {
            const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
            for (const [at, a] of stops) g.addColorStop(at, `rgba(${colour.join(',')},${a})`);
            c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y, radius, 0, Math.PI * 2); c.fill();
        };
        glow(solid * 3.4 * (1 + 0.03 * Math.sin(time * 0.4)), [255, 160, 112], [[0, 0.28], [0.3, 0.1], [0.7, 0]]);
        glow(solid * 2.3 * (1 + 0.04 * breath), rgb, [[0, 0.7 + 0.12 * breath], [0.36, 0.3], [0.62, 0]]);
        c.fillStyle = CICLOS.sun;
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
    const ground = () => `rgb(${lerp(hex(CICLOS.groundNight), hex(CICLOS.groundDay), light()).map(Math.round).join(',')})`;
    // Its streaks (yellow by day, mustard by night): small brush strokes lying flat on the ground under everything
    function drawGround(c, view) {
        const far = view.scaleAt(depth), half = view.width / 2 / far + 400;
        const first = Math.floor((view.cam - half) / STRETCH), last = Math.floor((view.cam + half) / STRETCH);
        c.fillStyle = c.strokeStyle = `rgb(${detailRgb().map(Math.round).join(',')})`;
        for (let i = first; i <= last; i++) for (const item of stretch(i)) {
            if (item.kind !== 'streak') continue;
            const s = view.scaleAt(item.d), x = view.x0 + (item.x - view.cam) * s;
            c.save(); c.translate(x, view.groundAt(item.d)); c.scale(s, s);
            if (item.oval) { c.beginPath(); c.ellipse(0, 0, item.oval.rx, item.oval.ry, 0, 0, Math.PI * 2); c.fill(); }
            else for (const k of item.strokes) {
                c.lineWidth = k.wide; c.lineCap = 'round';
                c.beginPath(); c.moveTo(k.dx - k.long / 2, 0); c.quadraticCurveTo(k.dx, k.bend, k.dx + k.long / 2, k.tilt); c.stroke();
            }
            c.restore();
        }
    }

    // Whether a place (x, depth) is under the crown of her tree
    const underCrown = (x, d) => {
        const crown = boxOf('crown'), middle = TREE.x + (crown[0] + crown[2] / 2 - TREE.foot.x) * TREE.scale;
        return Math.abs(x - middle) < crown[2] * TREE.scale * 0.42 && Math.abs(d - TREE.d) < 260;
    };

    // (setClock: to look at a given hour from the console, 0 sunrise .. 0.75 midnight)
    return { update, draw, drawSky, drawGround, ground, night, underCrown, setClock: (v) => { clock = ((v % 1) + 1) % 1; } };
}
