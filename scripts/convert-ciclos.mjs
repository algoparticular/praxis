// The layers of Ciclos as exported (originales/ciclos/No_Hay_Luz_2-N.png, 3240px) -> public/assets/ciclos/*.webp and
// src/composables/ciclosScene.json, everything scaled to the 2160 square of the other scenes (px of that square):
//   land0..land3  the hills in four planes, far to near (seeded by hand below, `HILLS`): every hill of the drawing is a
//              region between the dark lines, each rock goes with the hill whose crest cuts it, and a line goes with the
//              nearest plane in front of it (a front hill owns its own outline). What a plane hides of the one behind is
//              filled with the colour round it, so nothing opens up when the planes slide apart with the parallax
//   planes     the box of each plane, and whether it reaches the sides of the frame (then the scene mirrors it beyond)
//   plants     the pink fans (18, 19) and the tufts of grass (14, 15), each cut out into one atlas (plants.webp), with
//              the plane it grows on, so each one can sway in the wind on its own
//   clouds     the white clouds of the sky layer (7), each cut out into one atlas (clouds.webp), so they can drift (not
//              the two the frame cuts in half: their straight edge would show as they drift)
//   moon       the moon (2, 3, 5) is a picture; its stippled shade (4) is not: every dot as [x, y, radius]
//   sun        the red sun behind it (in 7) is not a picture either: the disc inside its solid middle ([x, y, r]) and
//              every dot of its stippled edge (its ragged rim filled with dots too), so the eclipse's corona can be alive
//   sid        Sid meditating on his rock (21, 22); his stippled red aura (20) as dots [x, y, radius]
//   sky        the flat yellow of the sky (7, without its clouds and its sun), row by row, as [y, 0xRRGGBB] stops
//   night      the teal night over the day, which is in no layer: read from the finished card (public/cards/15.webp)
//              where nothing is drawn over it: its colour, where it is (rows: runs of night [x0, x1, ...] every other row,
//              in half px), its drops (bubbles: [x, y, rx, ry, angle, +1 a teal drop in the day, -1 a yellow one in the
//              night]) and the stars of 1 that fall well inside it ([x, y, radius]); the scene draws day and night as
//              two liquids that never mix (field() in useLayerStage)
// Not converted: 1 (the stars) only as particles, inside the night; 6 is the little cross of the Algo Particular logo (a
// signature, never part of a scene); 7 is taken apart (its sky drawn in code, its sun in code and particles, its clouds into the atlas). There is no rulito
// layer. The originals are not kept in the repo once converted. Usage: node scripts/convert-ciclos.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'originales', 'ciclos');
const target = path.join(root, 'public', 'assets', 'ciclos');
const file = (n) => path.join(source, `No_Hay_Luz_2-${n}.png`);
const S = 2160;
const N = S * S;
const SOLID = 110;
const PAD = 4;

const LAND = [8, 9, 10, 11, 12, 13, 16, 17];
// A point inside each hill and its plane (0 far .. 3 near); every other region between the lines (the rocks) follows
const HILLS = [
    [1196, 1342, 0],
    [602, 1435, 1], [1744, 1466, 1],
    [247, 1605, 2], [123, 1775, 2], [617, 1898, 2], [1728, 1821, 2],
    [864, 2052, 3], [1790, 2052, 3],
];
const PLANES = 4;
const OWN = 18;             // how far (px) a plane in front reaches into the dark lines round it: its own outline
const HIDDEN = 70;          // how far (px) under the planes in front each plane is filled in
const SMALL = 250;          // a region between the lines smaller than this (px) is a speck, not a rock: it goes with the lines

const scaled = async (n) => sharp(file(n)).resize(S, S, { kernel: 'lanczos3' }).png().toBuffer();
const cache = new Map();
const png = async (n) => { if (!cache.has(n)) cache.set(n, await scaled(n)); return cache.get(n); };
const raw = async (layers) => (await sharp({ create: { width: S, height: S, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(await Promise.all(layers.map(async (n) => ({ input: await png(n) })))).raw().toBuffer());
const webp = (data, box, quality = 88) => sharp(data, { raw: { width: S, height: S, channels: 4 } })
    .extract({ left: box[0], top: box[1], width: box[2], height: box[3] })
    .webp({ quality, alphaQuality: 90, effort: 6 });
const hex = (r, g, b) => (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);

const boxOf = (data, keep = () => true) => {
    let x0 = S, y0 = S, x1 = -1, y1 = -1;
    for (let i = 0; i < N; i++) {
        if (data[i * 4 + 3] < 4 || !keep(i)) continue;
        const x = i % S, y = (i - x) / S;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
    }
    x0 = Math.max(0, x0 - PAD); y0 = Math.max(0, y0 - PAD);
    x1 = Math.min(S - 1, x1 + PAD); y1 = Math.min(S - 1, y1 + PAD);
    return [x0, y0, x1 - x0 + 1, y1 - y0 + 1];
};

// Every blob of solid pixels (that `keep` lets in): its pixels, area, centre and box
const blobsOf = (data, keep = () => true) => {
    const seen = new Uint8Array(N);
    const blobs = [];
    const stack = [];
    const solid = (i) => data[i * 4 + 3] >= SOLID && keep(i);
    for (let start = 0; start < N; start++) {
        if (seen[start] || !solid(start)) continue;
        const pixels = [];
        let sx = 0, sy = 0, x0 = S, y0 = S, x1 = 0, y1 = 0;
        stack.push(start);
        seen[start] = 1;
        while (stack.length) {
            const i = stack.pop();
            const x = i % S, y = (i - x) / S;
            pixels.push(i);
            sx += x; sy += y;
            x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
            for (const j of [x > 0 ? i - 1 : -1, x < S - 1 ? i + 1 : -1, y > 0 ? i - S : -1, y < S - 1 ? i + S : -1]) {
                if (j < 0 || seen[j] || !solid(j)) continue;
                seen[j] = 1;
                stack.push(j);
            }
        }
        blobs.push({ pixels, area: pixels.length, x: sx / pixels.length, y: sy / pixels.length, box: [x0, y0, x1, y1] });
    }
    return blobs.sort((a, b) => b.area - a.area);
};

// Pieces: blobs nearer than `join` px belong together
const piecesOf = (blobs, join) => {
    const near = (a, b) => a[0] - join <= b[2] && b[0] - join <= a[2] && a[1] - join <= b[3] && b[1] - join <= a[3];
    const group = blobs.map((_, i) => i);
    const find = (i) => (group[i] === i ? i : (group[i] = find(group[i])));
    for (let i = 0; i < blobs.length; i++) for (let j = i + 1; j < blobs.length; j++) if (near(blobs[i].box, blobs[j].box)) group[find(i)] = find(j);
    const out = new Map();
    blobs.forEach((b, i) => { const g = find(i); if (!out.has(g)) out.set(g, []); out.get(g).push(b); });
    return [...out.values()].map((blobs) => {
        const box = blobs.reduce((b, { box: c }) => [Math.min(b[0], c[0]), Math.min(b[1], c[1]), Math.max(b[2], c[2]), Math.max(b[3], c[3])], [S, S, 0, 0]);
        return { blobs, box, area: blobs.reduce((s, b) => s + b.area, 0) };
    });
};

// A stipple as dots: every small blob is a dot of its size; a blob too big for one (dots run together) is filled with
// dots `step` px apart
const dotsOf = (data, keep, { biggest = 70, step = 5, r = [1.4, 2.2] } = {}) => {
    const dots = [];
    for (const b of blobsOf(data, keep)) {
        if (b.area < 2) continue;
        if (b.area <= biggest) { dots.push([Math.round(b.x), Math.round(b.y), +Math.sqrt(b.area / Math.PI).toFixed(1)]); continue; }
        const mine = new Set(b.pixels);
        const [x0, y0, x1, y1] = b.box;
        for (let y = y0; y <= y1; y += step) {
            for (let x = x0 + ((y / step) % 2) * step / 2; x <= x1; x += step) {
                const px = Math.round(x + (Math.random() - 0.5) * step * 0.5), py = Math.round(y + (Math.random() - 0.5) * step * 0.5);
                if (!mine.has(py * S + px)) continue;
                dots.push([px, py, +(r[0] + Math.random() * (r[1] - r[0])).toFixed(1)]);
            }
        }
    }
    return dots;
};

// The ellipse of a blob (from its moments): [x, y, rx, ry, angle (rad)]
const ellipseOf = (blob) => {
    let xx = 0, yy = 0, xy = 0;
    blob.pixels.forEach((i) => { const x = i % S - blob.x, y = (i - (i % S)) / S - blob.y; xx += x * x; yy += y * y; xy += x * y; });
    xx /= blob.area; yy /= blob.area; xy /= blob.area;
    const common = Math.sqrt(((xx - yy) / 2) ** 2 + xy * xy);
    const l1 = (xx + yy) / 2 + common, l2 = (xx + yy) / 2 - common;
    return [Math.round(blob.x), Math.round(blob.y), Math.round(2 * Math.sqrt(l1)), Math.round(2 * Math.sqrt(Math.max(1, l2))), +(0.5 * Math.atan2(2 * xy, xx - yy)).toFixed(3)];
};

// Cut-outs into one atlas, packed in rows: [x, y, w, h where it is drawn, x, y where it is in the atlas]
const atlas = async (name, cuts, width = 1024, GAP = 6) => {
    cuts.sort((a, b) => b.h - a.h);
    let cx = GAP, cy = GAP, row = 0;
    for (const c of cuts) {
        if (cx + c.w + GAP > width) { cx = GAP; cy += row + GAP; row = 0; }
        c.ax = cx; c.ay = cy;
        cx += c.w + GAP;
        row = Math.max(row, c.h);
    }
    const height = cy + row + GAP;
    await sharp({ create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
        .composite(cuts.map((c) => ({ input: c.pixels, raw: { width: c.w, height: c.h, channels: 4 }, left: c.ax, top: c.ay })))
        .webp({ quality: 88, alphaQuality: 90, effort: 6 })
        .toFile(path.join(target, `${name}.webp`));
    return [width, height];
};
// A piece of `data` cut out (only its own pixels, with `soft` px of their edge round them)
const cutOut = (data, piece, soft = 3) => {
    const mine = new Uint8Array(N);
    piece.blobs.forEach((b) => b.pixels.forEach((i) => { mine[i] = 1; }));
    const x0 = Math.max(0, piece.box[0] - soft - 2), y0 = Math.max(0, piece.box[1] - soft - 2);
    const x1 = Math.min(S - 1, piece.box[2] + soft + 2), y1 = Math.min(S - 1, piece.box[3] + soft + 2);
    const w = x1 - x0 + 1, h = y1 - y0 + 1;
    const pixels = Buffer.alloc(w * h * 4);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const i = (y0 + y) * S + x0 + x;
            let near = false;
            for (let dy = -soft; dy <= soft && !near; dy++) for (let dx = -soft; dx <= soft && !near; dx++) {
                const xx = x0 + x + dx, yy = y0 + y + dy;
                if (xx >= 0 && yy >= 0 && xx < S && yy < S && mine[yy * S + xx]) near = true;
            }
            if (near) data.copy(pixels, (y * w + x) * 4, i * 4, i * 4 + 4);
        }
    }
    return { x: x0, y: y0, w, h, pixels };
};

await mkdir(target, { recursive: true });
const scene = { size: S, boxes: {}, planes: [], sky: [], sun: null, moon: null, sid: null, clouds: [], cloudAtlas: [0, 0], plants: [], plantAtlas: [0, 0] };

// ---- The land in planes
const land = await raw(LAND);
const dark = (i) => land[i * 4] + land[i * 4 + 1] + land[i * 4 + 2] < 300;
const open = (i) => land[i * 4 + 3] > 100 && !dark(i);
const region = new Int32Array(N).fill(-1);
const regions = [];
{
    const stack = [];
    for (let s = 0; s < N; s++) {
        if (region[s] >= 0 || !open(s)) continue;
        const id = regions.length;
        let n = 0, bottom = 0, bx = 0;
        region[s] = id;
        stack.push(s);
        while (stack.length) {
            const i = stack.pop();
            const x = i % S, y = (i - x) / S;
            n++;
            if (y > bottom) { bottom = y; bx = x; }
            for (const j of [x > 0 ? i - 1 : -1, x < S - 1 ? i + 1 : -1, y > 0 ? i - S : -1, y < S - 1 ? i + S : -1]) {
                if (j < 0 || region[j] >= 0 || !open(j)) continue;
                region[j] = id;
                stack.push(j);
            }
        }
        regions.push({ n, bottom, bx, plane: -1 });
    }
}
for (const [x, y, p] of HILLS) {
    // (the nearest big region to the point, in case it fell on a line)
    let found = -1;
    for (let d = 0; d < 40 && found < 0; d++) {
        for (const [dx, dy] of [[d, 0], [-d, 0], [0, d], [0, -d]]) {
            const r = region[(y + dy) * S + x + dx];
            if (r >= 0 && regions[r].n > 3000) { found = r; break; }
        }
    }
    regions[found].plane = p;
}
// A rock (any other big region) goes with the hill under it: the first other big region straight down from its foot
const planeOf = (r, depth = 0) => {
    const R = regions[r];
    if (R.plane >= 0 || depth > 6) return R.plane;
    for (let y = R.bottom + 1; y < S; y++) {
        const o = region[y * S + R.bx];
        if (o >= 0 && o !== r && regions[o].n > 3000) return (R.plane = planeOf(o, depth + 1));
    }
    return (R.plane = PLANES - 1);
};
const plane = new Int8Array(N).fill(-1);
for (let i = 0; i < N; i++) {
    if (land[i * 4 + 3] < 4) continue;
    const r = region[i];
    if (r >= 0 && regions[r].n > SMALL) plane[i] = planeOf(r);
}
// The lines (and the specks between them): the planes in front first, each reaching OWN px into them
{
    const grow = (p, reach) => {
        let edge = [];
        for (let i = 0; i < N; i++) if (plane[i] === p) edge.push(i);
        for (let d = 0; d < reach && edge.length; d++) {
            const next = [];
            for (const i of edge) {
                const x = i % S;
                for (const j of [x > 0 ? i - 1 : -1, x < S - 1 ? i + 1 : -1, i - S, i + S]) {
                    if (j < 0 || j >= N || plane[j] !== -1 || land[j * 4 + 3] < 4) continue;
                    plane[j] = p;
                    next.push(j);
                }
            }
            edge = next;
        }
    };
    for (let p = PLANES - 1; p >= 0; p--) grow(p, OWN);
    for (let p = PLANES - 1; p >= 0; p--) grow(p, S);
}
// Each plane, with what the planes in front hide of it filled with the colour round it
for (let p = 0; p < PLANES; p++) {
    const out = Buffer.alloc(N * 4);
    for (let i = 0; i < N; i++) if (plane[i] === p) land.copy(out, i * 4, i * 4, i * 4 + 4);
    if (p < PLANES - 1) {
        const hidden = (i) => plane[i] > p;
        let edge = [];
        for (let i = 0; i < N; i++) {
            if (plane[i] !== p || !open(i)) continue;
            const x = i % S;
            if ((x > 0 && hidden(i - 1)) || (x < S - 1 && hidden(i + 1)) || (i >= S && hidden(i - S)) || (i < N - S && hidden(i + S))) edge.push(i);
        }
        const done = new Uint8Array(N);
        for (let d = 0; d < HIDDEN && edge.length; d++) {
            const next = [];
            for (const i of edge) {
                const x = i % S;
                for (const j of [x > 0 ? i - 1 : -1, x < S - 1 ? i + 1 : -1, i - S, i + S]) {
                    if (j < 0 || j >= N || done[j] || !hidden(j)) continue;
                    done[j] = 1;
                    out.copy(out, j * 4, i * 4, i * 4 + 3);
                    out[j * 4 + 3] = 255;
                    next.push(j);
                }
            }
            edge = next;
        }
    }
    const box = boxOf(out);
    await webp(out, box).toFile(path.join(target, `land${p}.webp`));
    scene.planes.push({ name: `land${p}`, box, sides: box[0] === 0 && box[0] + box[2] >= S });
}

// ---- The plants: each fan and each tuft cut out into one atlas, with the plane under its foot
{
    const cuts = [];
    const add = async (layers, kind, join, least) => {
        const data = await raw(layers);
        for (const piece of piecesOf(blobsOf(data).filter((b) => b.area >= 6), join)) {
            if (piece.area < least) continue;
            const c = cutOut(data, piece);
            const fx = Math.round((piece.box[0] + piece.box[2]) / 2), fy = Math.min(S - 1, piece.box[3] - 6);
            // The plane under its foot: the land just below it, or failing that round it
            let p = -1;
            for (let d = 0; d < 60 && p < 0; d++) {
                for (const [dx, dy] of [[0, d], [-d, 0], [d, 0], [0, -d]]) {
                    const x = Math.max(0, Math.min(S - 1, fx + dx)), y = Math.max(0, Math.min(S - 1, fy + dy));
                    if (plane[y * S + x] >= 0) { p = plane[y * S + x]; break; }
                }
            }
            cuts.push({ ...c, kind, plane: Math.max(0, p) });
        }
    };
    await add([18, 19], 'fan', 12, 400);
    await add([14], 'grass', 26, 150);
    await add([15], 'grass', 26, 150);
    scene.plantAtlas = await atlas('plants', cuts);
    scene.plants = cuts.sort((a, b) => a.plane - b.plane || a.y + a.h - b.y - b.h)
        .map((c) => [c.x, c.y, c.w, c.h, c.ax, c.ay, c.kind, c.plane]);
}

// ---- The sky layer taken apart: its flat yellow, its clouds, its sun
const sky = await raw([7]);
const SKY = [0xfc, 0xdc, 0x8c];
{
    // The sky's colour row by row, from the pixels that are sky (not cloud, not sun)
    const STEP = 60;
    const isSky = (i) => Math.abs(sky[i * 4] - SKY[0]) + Math.abs(sky[i * 4 + 1] - SKY[1]) + Math.abs(sky[i * 4 + 2] - SKY[2]) < 30;
    for (let y = 0; y < 1300; y += STEP) {
        let r = 0, g = 0, b = 0, n = 0;
        for (let yy = y; yy < y + STEP; yy += 3) for (let x = 0; x < S; x += 6) { const i = yy * S + x; if (!isSky(i)) continue; r += sky[i * 4]; g += sky[i * 4 + 1]; b += sky[i * 4 + 2]; n++; }
        if (n) scene.sky.push([y + STEP / 2, hex(r / n, g / n, b / n)]);
    }
}
{
    // The clouds: white over the yellow, so how white a pixel is (its blue, which the yellow lacks) is its alpha
    const whiteness = (i) => Math.max(0, Math.min(1, (sky[i * 4 + 2] - 150) / (245 - 150)));
    const red = (i) => sky[i * 4] > 200 && sky[i * 4 + 1] < 170 && sky[i * 4 + 2] < 175;
    const white = Buffer.alloc(N * 4);
    for (let i = 0; i < N; i++) {
        if (sky[i * 4 + 3] < 4 || red(i)) continue;
        const a = whiteness(i) * sky[i * 4 + 3] / 255;
        if (a <= 0) continue;
        white[i * 4] = 255; white[i * 4 + 1] = 255; white[i * 4 + 2] = 255; white[i * 4 + 3] = Math.round(a * 255);
    }
    // (not the ones the frame cuts: drifting, their straight edge would show)
    const cuts = piecesOf(blobsOf(white).filter((b) => b.area >= 30), 14)
        .filter((p) => p.area > 400 && p.box[0] > 2 && p.box[2] < S - 3).map((p) => cutOut(white, p, 2));
    scene.cloudAtlas = await atlas('clouds', cuts);
    scene.clouds = cuts.sort((a, b) => a.x - b.x).map((c) => [c.x, c.y, c.w, c.h, c.ax, c.ay]);

    // The sun: the disc inside its solid middle (hidden by the moon), and dots for everything round it
    const [main, ...rest] = blobsOf(sky, red);
    const inMain = new Uint8Array(N);
    main.pixels.forEach((i) => { inMain[i] = 1; });
    const cx = main.x, cy = main.y;
    let r = 10;
    for (; r < 700; r += 3) {
        let inside = 0, all = 0;
        for (let a = 0; a < 360; a += 3) {
            const x = Math.round(cx + Math.cos(a * Math.PI / 180) * r), y = Math.round(cy + Math.sin(a * Math.PI / 180) * r);
            all++;
            if (inMain[y * S + x]) inside++;
        }
        if (inside / all < 0.97) break;
    }
    const R = r - 6;
    const dots = rest.filter((b) => b.area >= 2 && b.area < 120).map((b) => [Math.round(b.x), Math.round(b.y), +Math.sqrt(b.area / Math.PI).toFixed(1)]);
    const FILL = 6;
    for (let y = Math.floor(cy - 700); y < cy + 700; y += FILL) {
        for (let x = Math.floor(cx - 700) + ((y / FILL) % 2) * FILL / 2; x < cx + 700; x += FILL) {
            const px = Math.round(x + (Math.random() - 0.5) * FILL * 0.6), py = Math.round(y + (Math.random() - 0.5) * FILL * 0.6);
            if (px < 0 || py < 0 || px >= S || py >= S || !inMain[py * S + px]) continue;
            if (Math.hypot(px - cx, py - cy) < R - 4) continue;
            dots.push([px, py, +(2.6 + Math.random() * 1.4).toFixed(1)]);
        }
    }
    let cr = 0, cg = 0, cb = 0;
    main.pixels.forEach((i) => { cr += sky[i * 4]; cg += sky[i * 4 + 1]; cb += sky[i * 4 + 2]; });
    const n = main.pixels.length;
    scene.sun = { x: Math.round(cx), y: Math.round(cy), r: R, color: hex(cr / n, cg / n, cb / n), dots };
}

// ---- The night: the teal shape over the day, which is in no layer, read from the card (public/cards/15.webp): its
// colour, where it is (a mask, row by row at half size, as runs of night), its drops (the teal ones in the day and the
// yellow ones in the night, as ellipses) and the stars (1) that fall inside it
{
    const card = await sharp(path.join(root, 'public', 'cards', '15.webp')).resize(S, S).removeAlpha().raw().toBuffer();
    const TEAL = [3, 156, 168];
    const near = (i, c, d) => Math.abs(card[i * 3] - c[0]) + Math.abs(card[i * 3 + 1] - c[1]) + Math.abs(card[i * 3 + 2] - c[2]) < d;
    // 1 night, 0 day, -1 unknown (what is drawn over them: the moon, the sun, the clouds, Sid, the land), which takes the
    // label of the nearest known px
    // (the card's logo, the little cross of 6, is unknown too: it is not a drop of day)
    const logo = await raw([6]);
    const [lx, ly, lw, lh] = boxOf(logo);
    const isLogo = (i) => { const x = i % S, y = (i - x) / S; return x > lx - 12 && x < lx + lw + 12 && y > ly - 12 && y < ly + lh + 12; };
    const label = new Int8Array(N);
    let edge = [];
    for (let i = 0; i < N; i++) {
        label[i] = isLogo(i) || land[i * 4 + 3] > 0 ? -1 : near(i, TEAL, 60) ? 1 : near(i, SKY, 40) ? 0 : -1;
        if (label[i] >= 0) edge.push(i);
    }
    while (edge.length) {
        const next = [];
        for (const i of edge) {
            const x = i % S;
            for (const j of [x > 0 ? i - 1 : -1, x < S - 1 ? i + 1 : -1, i - S, i + S]) {
                if (j < 0 || j >= N || label[j] !== -1) continue;
                label[j] = label[i];
                next.push(j);
            }
        }
        edge = next;
    }
    // Softened (where the clouds and the lines crossed its edge the guess leaves notches): blurred and cut again at half
    let soft = Float32Array.from(label, (v) => v);
    const R = 14;
    for (let pass = 0; pass < 3; pass++) {
        const tmp = new Float32Array(N);
        for (let y = 0; y < S; y++) {
            let sum = 0;
            for (let x = -R; x <= R; x++) sum += soft[y * S + Math.min(S - 1, Math.max(0, x))];
            for (let x = 0; x < S; x++) {
                tmp[y * S + x] = sum / (2 * R + 1);
                sum += soft[y * S + Math.min(S - 1, x + R + 1)] - soft[y * S + Math.max(0, x - R)];
            }
        }
        for (let x = 0; x < S; x++) {
            let sum = 0;
            for (let y = -R; y <= R; y++) sum += tmp[Math.min(S - 1, Math.max(0, y)) * S + x];
            for (let y = 0; y < S; y++) {
                soft[y * S + x] = sum / (2 * R + 1);
                sum += tmp[Math.min(S - 1, y + R + 1) * S + x] - tmp[Math.max(0, y - R) * S + x];
            }
        }
    }
    const TOP = 1300;            // under it all is land
    const inSky = (b) => b.box[3] < TOP - 20;
    // The drops, from the card as it is: the teal ones apart from the main body of night, and the holes of day in it
    // (the specks among them are the card's stars: night)
    const asIs = Buffer.alloc(N * 4);
    for (let i = 0; i < N; i++) asIs[i * 4 + 3] = label[i] === 1 ? 255 : 0;
    const [body, ...drops] = blobsOf(asIs);
    const inBody = new Uint8Array(N);
    body.pixels.forEach((i) => { inBody[i] = 1; });
    const notBody = Buffer.alloc(N * 4);
    for (let i = 0; i < N; i++) notBody[i * 4 + 3] = inBody[i] ? 0 : 255;
    const bubbles = [];
    for (const b of blobsOf(notBody).slice(1)) if (b.area >= 400 && inSky(b)) bubbles.push([...ellipseOf(b), -1]);
    for (const b of drops) if (b.area >= 400 && inSky(b)) bubbles.push([...ellipseOf(b), 1]);
    // The mask: the body of night softened, with every hole in it filled (the drops of day are drawn as bubbles)
    const night = Buffer.alloc(N * 4);
    for (let i = 0; i < N; i++) night[i * 4 + 3] = soft[i] >= 0.5 ? 255 : 0;
    soft = null;
    const [main] = blobsOf(night);
    const mask = new Uint8Array(N);
    main.pixels.forEach((i) => { mask[i] = 1; });
    const day = Buffer.alloc(N * 4);
    for (let i = 0; i < N; i++) day[i * 4 + 3] = mask[i] ? 0 : 255;
    for (const b of blobsOf(day).slice(1)) b.pixels.forEach((i) => { mask[i] = 1; });
    // The mask as runs of night, every other row and column: [[x0, x1, x0, x1, ...], ...] (half px)
    const rows = [];
    for (let y = 0; y < TOP; y += 2) {
        const runs = [];
        let on = false;
        for (let x = 0; x < S; x += 2) {
            const m = mask[y * S + x] === 1;
            if (m !== on) { runs.push(x / 2); on = m; }
        }
        if (on) runs.push(S / 2);
        rows.push(runs);
    }
    // The stars of 1, only the ones well inside the night (and not in a drop of day)
    const starsLayer = await raw([1]);
    const inside = (x, y, r) => {
        for (let a = 0; a < 6.28; a += 0.5) {
            const px = Math.round(x + Math.cos(a) * r), py = Math.round(y + Math.sin(a) * r);
            if (px < 0 || py < 0 || px >= S || py >= S || !mask[py * S + px]) return false;
        }
        return !bubbles.some(([bx, by, rx, ry, , s]) => s < 0 && Math.hypot(x - bx, y - by) < Math.max(rx, ry) + 14);
    };
    const stars = blobsOf(starsLayer).filter((b) => b.area >= 3 && inside(b.x, b.y, 16))
        .map((b) => [Math.round(b.x), Math.round(b.y), +Math.sqrt(b.area / Math.PI).toFixed(1)]);
    let sr = 0, sg = 0, sb = 0, sn = 0;
    for (let i = 0; i < N; i += 7) if (label[i] === 1 && near(i, TEAL, 30)) { sr += card[i * 3]; sg += card[i * 3 + 1]; sb += card[i * 3 + 2]; sn++; }
    scene.night = { color: hex(sr / sn, sg / sn, sb / sn), star: 0xfcdc8c, rows, bubbles, stars };
}

// ---- The moon: a picture, and its shade as dots
{
    const data = await raw([2, 3, 5]);
    const box = boxOf(data);
    await webp(data, box, 90).toFile(path.join(target, 'moon.webp'));
    scene.boxes.moon = box;
    const disc = await raw([2]);
    const [body] = blobsOf(disc);
    // The disc's middle and radius (from its area, the craters on its rim are small)
    scene.moon = { x: Math.round(body.x), y: Math.round(body.y), r: Math.round(Math.sqrt(body.area / Math.PI)) };
    const shade = await raw([4]);
    scene.moon.dots = dotsOf(shade, () => true, { biggest: 40, step: 4, r: [1.2, 1.9] });
}

// ---- Sid on his rock, and his aura as dots
{
    const data = await raw([21, 22]);
    const box = boxOf(data);
    await webp(data, box, 90).toFile(path.join(target, 'sid.webp'));
    scene.boxes.sid = box;
    const aura = await raw([20]);
    scene.sid = { aura: dotsOf(aura, () => true, { biggest: 40, step: 4, r: [1.2, 1.9] }) };
}

await writeFile(path.join(root, 'src', 'composables', 'ciclosScene.json'), JSON.stringify(scene));
console.log(scene.planes.map((p) => `${p.name} ${p.box} ${p.sides ? 'sides' : ''}`).join('; '));
console.log(scene.plants.length, 'plants in a', scene.plantAtlas.join('x'), 'atlas;', scene.clouds.length, 'clouds in a', scene.cloudAtlas.join('x'), 'atlas;',
    scene.sky.length, 'sky stops', scene.sky.map(([, c]) => c.toString(16)).join(' '), '; sun', scene.sun.x, scene.sun.y, 'r', scene.sun.r, scene.sun.color.toString(16), 'with', scene.sun.dots.length,
    'dots; night', scene.night.color.toString(16), scene.night.bubbles.length, 'drops', JSON.stringify(scene.night.bubbles), scene.night.stars.length, 'stars; moon', scene.moon.x, scene.moon.y, 'r', scene.moon.r, 'with', scene.moon.dots.length, 'dots; sid', scene.boxes.sid, 'aura', scene.sid.aura.length, 'dots');
