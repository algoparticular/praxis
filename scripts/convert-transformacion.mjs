// The layers of Transformación as exported (originales/transformacion/Transformación-N.png, 3240px) -> scaled to the 2160
// square of the other scenes, public/assets/transformacion/*.webp, each cropped to its own box, and
// src/composables/transformacionScene.json, all in px of the 2160 square:
//   boxes    the box of every picture
//   sky      the sky is in no layer: it is read from the finished card (public/cards/32.webp), row by row (the middle
//            colour of each band, so the stars and the drawing do not count), as [y, 0xRRGGBB] stops for a gradient
//            drawn in code
//   sun      the little sun the palm holds on its stalk (22) is not a picture: the disc of its solid middle ([x, y, r] and
//            its colour), and every dot of the stipple round it (30, its upper part) as [x, y, radius]
//   pond     the pond (5) and the golden light in its middle (7) are not pictures either: ellipses drawn in code
//            ({ x, y, rx, ry, color }); its ring and its pattern are the picture 'pond' (6, 11 and the ring of 10)
//   stars    every star of the sky (1) as [x, y, radius, colour]
//   dust     the golden dust rising from the pond along the trunk (12, and the lower part of 30) as [x, y, radius]
//   aura     the teal stipple round the seed (23), as dots [x, y, radius], as dense as it is
//   glyphs   the yellow signs floating round the tree (29) and the two streaks of the sky (the big blobs of 1), each cut
//            out into one atlas (sky.webp) so they can float on their own: [x, y, w, h where it is drawn, x, y in the
//            atlas, kind (0 a sign, 1 a streak)]
//   eyes     where the little one's eyes are (cut out of its line work, 14, into their own picture so he can blink)
//   rulito   where the card's rulito is (28, the spiral on the seed)
// Pictures: hills (2, 3: the pink mountains and their line), ground (4, 8, 9, 10: the blue ground, its stones,
// mushrooms and line work, without the pond's ring), plain (the blue ground alone with its horizon traced again, at half
// size: what goes on past the frame on wide screens, mirrored, without the stones, so they have no twins), pond, tree
// (21, 27: the trunk and its line work, with the palm and the stalk of the sun), seed (24, 25, 26), small (13, 14: the
// little one with his rod, without his eyes) and smallEyes, elder (15, 16, 17: the big one, eyes closed) and cup (18,
// 19, 20: his bowl and the arm round it).
// Not converted: 28 (the rulito: the game draws it in code, only its box is kept); from 29 the little cross mark
// (":+:", the Algo Particular logo standing alone in the sky as a signature); 22, 5 and 7 (discs and ellipses drawn in
// code); 1, 12, 23 and 30 (dots: particles). The originals are not kept in the repo once converted.
// Usage: node scripts/convert-transformacion.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'originales', 'transformacion');
const target = path.join(root, 'public', 'assets', 'transformacion');
const exported = (n) => path.join(source, `Transformación-${n}.png`);
// Some layers were exported without their layer opacity, so they came out far darker than on the card: the seed's shading (25).
// It is put back here (measured against the finished card), and the faded copy is used wherever the layer is.
const FADED = { 25: 0.34 };
const faded = {};
for (const [n, k] of Object.entries(FADED)) {
    const { data, info } = await sharp(exported(n)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    for (let i = 3; i < data.length; i += 4) data[i] = Math.round(data[i] * k);
    faded[n] = await sharp(data, { raw: info }).png().toBuffer();
}
const file = (n) => faded[n] ?? exported(n);
const O = 3240;                 // the originals
const S = 2160;                 // the scene's square
const K = S / O;
const PAD = 4;
const SOLID = 110;              // alpha from which a pixel is part of a shape
const LINE = 0x404068;          // the navy of the line work

const load = async (n) => (await sharp(file(n)).ensureAlpha().raw().toBuffer({ resolveWithObject: true })).data;
const webp = (img) => img.webp({ quality: 88, alphaQuality: 90, effort: 6 });
const hex = (r, g, b) => (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
const rawImage = (data, w = O, h = O) => sharp(data, { raw: { width: w, height: h, channels: 4 } });
// Layers (numbers or raw buffers of the original size) one over the other, as a raw buffer of the original size
const flatten = async (layers) => {
    const inputs = await Promise.all(layers.map(async (l) => ({ input: typeof l === 'number' ? file(l) : await rawImage(l).png().toBuffer() })));
    return sharp({ create: { width: O, height: O, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(inputs).raw().toBuffer();
};
// A raw buffer of the original size down to the scene's square
const scaled = async (data) => (await rawImage(data).resize(S, S, { kernel: 'lanczos3' }).raw().toBuffer());

const boxOf = (data, W, H) => {
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            if (data[(y * W + x) * 4 + 3] < 4) continue;
            if (x < x0) x0 = x;
            if (x > x1) x1 = x;
            if (y < y0) y0 = y;
            if (y > y1) y1 = y;
        }
    }
    x0 = Math.max(0, x0 - PAD); y0 = Math.max(0, y0 - PAD);
    x1 = Math.min(W - 1, x1 + PAD); y1 = Math.min(H - 1, y1 + PAD);
    return [x0, y0, x1 - x0 + 1, y1 - y0 + 1];
};

// Every blob of solid pixels: its pixels, area, centre and box (px of the originals)
const blobsOf = (data, keep = () => true) => {
    const seen = new Uint8Array(O * O);
    const blobs = [];
    const stack = [];
    const solid = (i) => data[i * 4 + 3] >= SOLID && keep(i);
    for (let start = 0; start < O * O; start++) {
        if (seen[start] || !solid(start)) continue;
        const pixels = [];
        let sx = 0, sy = 0, x0 = O, y0 = O, x1 = 0, y1 = 0;
        stack.push(start);
        seen[start] = 1;
        while (stack.length) {
            const i = stack.pop();
            const x = i % O, y = (i - x) / O;
            pixels.push(i);
            sx += x; sy += y;
            if (x < x0) x0 = x;
            if (x > x1) x1 = x;
            if (y < y0) y0 = y;
            if (y > y1) y1 = y;
            for (const j of [x > 0 ? i - 1 : -1, x < O - 1 ? i + 1 : -1, y > 0 ? i - O : -1, y < O - 1 ? i + O : -1]) {
                if (j < 0 || seen[j] || !solid(j)) continue;
                seen[j] = 1;
                stack.push(j);
            }
        }
        blobs.push({ pixels, area: pixels.length, x: sx / pixels.length, y: sy / pixels.length, box: [x0, y0, x1, y1] });
    }
    return blobs.sort((a, b) => b.area - a.area);
};

// Pieces of a layer: what is nearer than `join` px belongs together
const piecesOf = (blobs, join) => {
    const near = (a, b) => a[0] - join <= b[2] && b[0] - join <= a[2] && a[1] - join <= b[3] && b[1] - join <= a[3];
    const group = blobs.map((_, i) => i);
    const find = (i) => (group[i] === i ? i : (group[i] = find(group[i])));
    for (let i = 0; i < blobs.length; i++) for (let j = i + 1; j < blobs.length; j++) if (near(blobs[i].box, blobs[j].box)) group[find(i)] = find(j);
    const out = new Map();
    blobs.forEach((b, i) => { const g = find(i); if (!out.has(g)) out.set(g, []); out.get(g).push(b); });
    return [...out.values()];
};

// Only the pixels of these blobs (with the soft edge round them, `grow` px) of a layer
const only = (data, blobs, grow = 4) => {
    const keep = new Uint8Array(O * O);
    blobs.forEach((b) => b.pixels.forEach((i) => {
        const x = i % O, y = (i - x) / O;
        for (let dy = -grow; dy <= grow; dy++) for (let dx = -grow; dx <= grow; dx++) {
            const xx = x + dx, yy = y + dy;
            if (xx >= 0 && yy >= 0 && xx < O && yy < O) keep[yy * O + xx] = 1;
        }
    }));
    const out = Buffer.from(data);
    for (let i = 0; i < O * O; i++) if (!keep[i]) out[i * 4 + 3] = 0;
    return out;
};
const without = (data, part) => {
    const out = Buffer.from(data);
    for (let i = 0; i < O * O; i++) if (part[i * 4 + 3] > 0) out[i * 4 + 3] = 0;
    return out;
};

// A dot [x, y, radius] in px of the scene for a blob of the originals
const dotOf = (b) => [Math.round(b.x * K), Math.round(b.y * K), +Math.max(0.7, Math.sqrt(b.area / Math.PI) * K).toFixed(1)];
const meanColour = (data, b) => {
    let r = 0, g = 0, bl = 0;
    b.pixels.forEach((i) => { r += data[i * 4]; g += data[i * 4 + 1]; bl += data[i * 4 + 2]; });
    return hex(r / b.area, g / b.area, bl / b.area);
};
const ellipseOf = (data) => {
    const [main] = blobsOf(data);
    const [x0, y0, x1, y1] = main.box;
    return { x: Math.round(main.x * K), y: Math.round(main.y * K), rx: Math.round((x1 - x0 + 1) / 2 * K), ry: Math.round((y1 - y0 + 1) / 2 * K), color: meanColour(data, main) };
};

await mkdir(target, { recursive: true });
const scene = { size: S, boxes: {}, sky: [], sun: null, pond: null, spot: null, stars: [], dust: [], aura: [], glyphs: [], atlas: [0, 0], eyes: null, rulito: null };

// Writes a picture (a raw buffer of the original size) scaled and cropped to its box; `half` writes it at half size
const write = async (name, data, { half = false } = {}) => {
    const small = await scaled(data);
    const box = boxOf(small, S, S);
    let img = rawImage(small, S, S).extract({ left: box[0], top: box[1], width: box[2], height: box[3] });
    if (half) img = rawImage(await img.raw().toBuffer(), box[2], box[3]).resize(Math.round(box[2] / 2), Math.round(box[3] / 2));
    await webp(img).toFile(path.join(target, `${name}.webp`));
    scene.boxes[name] = box;
};

// The line work of the ground (10): the pond's ring is the biggest blob in it, and goes with the pond
const ground10 = await load(10);
const ringBlobs = blobsOf(ground10).filter((b) => b.box[0] >= 1100 && b.box[2] <= 2140 && b.box[1] >= 2800);
const ring = only(ground10, ringBlobs, 6);
await write('hills', await flatten([2, 3]));
await write('ground', await flatten([4, 8, 9, without(ground10, ring)]));
await write('pond', await flatten([6, 11, ring]));

// The plain: the ground's fill with its top edge traced again as the horizon line (smoothed, as far below the edge as
// the drawn line is), for past the frame; at its two ends (EDGE px) the drawn line itself, so it meets the ground in
// the frame without a step
{
    const fill = await load(4);
    const EDGE = 110, BAND = 45;
    const top = [];
    for (let x = 0; x < O; x++) {
        let y = 0;
        while (y < O && fill[(y * O + x) * 4 + 3] < 128) y++;
        top.push(y);
    }
    // Where the drawn line runs at the ends: the middle of its dark pixels near the fill's edge
    const drawn = (x) => {
        let s = 0, n = 0;
        for (let y = top[x] - BAND; y < top[x] + BAND; y++) if (ground10[(y * O + x) * 4 + 3] > SOLID) { s += y; n++; }
        return n ? s / n : null;
    };
    const ends = [];
    for (let x = 0; x < O; x += 4) if (x < EDGE || x >= O - EDGE) { const d = drawn(x); if (d !== null) ends.push(d - top[x]); }
    const offset = ends.length ? ends.reduce((a, b) => a + b, 0) / ends.length : 6;
    const points = [];
    const R = 30;
    for (let x = EDGE - 20; x <= O - EDGE + 20; x += 10) {
        let s = 0, n = 0;
        for (let xx = Math.max(0, x - R); xx <= Math.min(O - 1, x + R); xx++) { s += top[xx]; n++; }
        points.push(`${x},${(s / n + offset).toFixed(1)}`);
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${O}" height="${O}"><polyline points="${points.join(' ')}" fill="none" stroke="#${LINE.toString(16)}" stroke-width="24" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    const line = await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer();
    const ends10 = Buffer.from(ground10);
    for (let y = 0; y < O; y++) {
        for (let x = 0; x < O; x++) {
            const i = (y * O + x) * 4;
            if ((x >= EDGE && x < O - EDGE) || Math.abs(y - top[x]) > BAND) ends10[i + 3] = 0;
        }
    }
    await write('plain', await flatten([4, ends10, line]), { half: true });
}

await write('tree', await flatten([21, 27]));
await write('seed', await flatten([24, 25, 26]));

// The little one: his eyes (the small blobs of his line work that sit on his face) on their own, so he can blink
{
    const face = await load(13);
    const lines = await load(14);
    const onFace = (b) => face[(Math.round(b.y) * O + Math.round(b.x)) * 4 + 3] > 200;
    const eyes = blobsOf(lines).filter((b) => b.area < 1500 && onFace(b));
    const eyesOnly = only(lines, eyes, 3);
    await write('small', await flatten([13, without(lines, eyesOnly)]));
    await write('smallEyes', eyesOnly);
    scene.eyes = eyes.map(dotOf);
}
await write('elder', await flatten([15, 16, 17]));
await write('cup', await flatten([18, 19, 20]));

// The sky: from the card, the middle colour of each band of rows above the mountains
{
    const { data, info } = await sharp(path.join(root, 'public', 'cards', '32.webp')).resize(S, S).raw().toBuffer({ resolveWithObject: true });
    const C = info.channels;
    const top = Math.round(2066 * K);
    const STEP = 48;
    for (let y = 0; y < top; y += STEP) {
        const all = [];
        for (let yy = y; yy < Math.min(top, y + STEP); yy += 4) for (let x = 0; x < S; x += 6) { const i = (yy * S + x) * C; all.push([data[i], data[i + 1], data[i + 2]]); }
        all.sort((a, b) => a[0] + a[1] + a[2] - b[0] - b[1] - b[2]);
        const mid = all.slice(Math.floor(all.length * 0.3), Math.ceil(all.length * 0.7));
        const m = [0, 1, 2].map((c) => mid.reduce((s, p) => s + p[c], 0) / mid.length);
        scene.sky.push([y + STEP / 2, hex(...m)]);
    }
}

// The sun: the disc of its solid middle (22) and the stipple round it (30 above the seed); the rest of 30 and 12 is the
// golden dust rising from the pond
{
    const disc = await load(22);
    const [main] = blobsOf(disc);
    scene.sun = { x: Math.round(main.x * K), y: Math.round(main.y * K), r: Math.round(Math.sqrt(main.area / Math.PI) * K), color: meanColour(disc, main), dots: [] };
    const halo = await load(30);
    for (const b of blobsOf(halo).filter((b) => b.area >= 2)) (b.y < 1200 ? scene.sun.dots : scene.dust).push(dotOf(b));
    const rising = await load(12);
    for (const b of blobsOf(rising).filter((b) => b.area >= 2)) scene.dust.push(dotOf(b));
}

scene.pond = ellipseOf(await load(5));
scene.spot = ellipseOf(await load(7));

// The aura round the seed: a dot wherever the stipple is, as dense as it is
{
    const small = await scaled(await load(23));
    const STEP = 5;
    for (let y = 0; y < S; y += STEP) {
        for (let x = 0; x < S; x += STEP) {
            const a = small[(y * S + x) * 4 + 3] / 255;
            if (a < 0.05 || Math.random() > a * 0.9) continue;
            scene.aura.push([x + Math.round((Math.random() - 0.5) * STEP), y + Math.round((Math.random() - 0.5) * STEP), +(1.6 + Math.random() * 1.4).toFixed(1)]);
        }
    }
}

// The stars (the small blobs of 1) and the two streaks (its big ones); the signs of 29 but the logo
const LOGO = [1602, 2291];
let logo = null;
{
    const sky = await load(1);
    const blobs = blobsOf(sky);
    const long = (b) => Math.max(b.box[2] - b.box[0], b.box[3] - b.box[1]) > 80;
    const streaks = blobs.filter((b) => b.area >= 600 && long(b));
    scene.stars = blobs.filter((b) => b.area >= 2 && !streaks.includes(b)).map((b) => [...dotOf(b), meanColour(sky, b)]);
    const signs = await load(29);
    const pieces = piecesOf(blobsOf(signs).filter((b) => b.area >= 20), 90);
    const centre = (p) => { let x = 0, y = 0, n = 0; p.forEach((b) => { x += b.x * b.area; y += b.y * b.area; n += b.area; }); return [x / n, y / n]; };
    const logoAt = pieces.reduce((best, p) => { const [x, y] = centre(p); const d = Math.hypot(x - LOGO[0], y - LOGO[1]); return d < best.d ? { p, d } : best; }, { p: null, d: Infinity });
    logo = logoAt.p;
    const cuts = [];
    const cut = async (data, piece, kind) => {
        const small = await scaled(only(data, piece, 5));
        const [x, y, w, h] = boxOf(small, S, S);
        const pixels = await rawImage(small, S, S).extract({ left: x, top: y, width: w, height: h }).raw().toBuffer();
        cuts.push({ x, y, w, h, pixels, kind });
    };
    for (const p of pieces) if (p !== logo) await cut(signs, p, 0);
    for (const b of streaks) await cut(sky, [b], 1);
    const ATLAS_W = 512, GAP = 6;
    cuts.sort((a, b) => b.h - a.h);
    let cx = GAP, cy = GAP, row = 0;
    for (const c of cuts) {
        if (cx + c.w + GAP > ATLAS_W) { cx = GAP; cy += row + GAP; row = 0; }
        c.ax = cx; c.ay = cy;
        cx += c.w + GAP;
        row = Math.max(row, c.h);
    }
    const ATLAS_H = cy + row + GAP;
    await webp(sharp({ create: { width: ATLAS_W, height: ATLAS_H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
        .composite(cuts.map((c) => ({ input: c.pixels, raw: { width: c.w, height: c.h, channels: 4 }, left: c.ax, top: c.ay }))))
        .toFile(path.join(target, 'sky.webp'));
    scene.atlas = [ATLAS_W, ATLAS_H];
    scene.glyphs = cuts.sort((a, b) => a.y - b.y).map((c) => [c.x, c.y, c.w, c.h, c.ax, c.ay, c.kind]);
}

{
    const spiral = await scaled(await load(28));
    scene.rulito = boxOf(spiral, S, S);
}

await writeFile(path.join(root, 'src', 'composables', 'transformacionScene.json'), JSON.stringify(scene));
console.log(Object.keys(scene.boxes).length, 'pictures', JSON.stringify(scene.boxes), ';', scene.sky.length, 'sky stops',
    scene.sky.map(([, c]) => c.toString(16)).join(' '), '; sun', scene.sun.x, scene.sun.y, scene.sun.r, scene.sun.color.toString(16), 'with',
    scene.sun.dots.length, 'dots; pond', JSON.stringify(scene.pond), 'spot', JSON.stringify(scene.spot), ';', scene.stars.length, 'stars;',
    scene.dust.length, 'dust;', scene.aura.length, 'aura;', scene.glyphs.length, 'glyphs (', scene.glyphs.filter((g) => g[6]).length,
    'streaks) in a', scene.atlas.join('x'), 'atlas; logo dropped at', logo && logo[0].box, '; eyes', JSON.stringify(scene.eyes), '; rulito', scene.rulito);
