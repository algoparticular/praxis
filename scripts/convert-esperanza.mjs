// The layers of Esperanza as exported (originales/esperanza/No_Hay_Luz_1-N.png, 3240px) -> public/assets/esperanza/*.webp,
// scaled to the 2160 square of the other scenes and each cropped to its own box, and src/composables/esperanzaScene.json,
// all in px of the 2160 square:
//   boxes      the box of every picture: the moon (its white with its line work: 2, 3, 5), the land (the two sands, their
//              shadows, the white stones and every line: 6, 7, 8, 9, 12), the two pink ginkgos (16+17 on the left, 14+15
//              by the stones) and the little being on the ridge (19, 20, 21), padded so its head has room to lean; and
//              the land beyond the frame (sides.webp, at half the size): the sands and their lines without the stones
//              (6, 7, 8 and 12 without the outlines of 9), with the outline of the dunes drawn again whole where the
//              stones broke it, so a wide screen never shows the same stone twice
//   sky        the sky is in no layer: its colour is read from the finished card (public/cards/30.webp), where nothing
//              is drawn, and the scene paints it in code
//   moon       the disc that fits the moon ([x, y, r]), for its light, and every dot of its stipple (4) as [x, y, radius]
//   stars      every star (1) as [x, y, radius]
//   aura       the pink stipple round the being (18), as dots [x, y, radius], as dense as it is
//   tufts      the grass and the little mushrooms (10, 11, 13), each cut out into one atlas (tufts.webp) so each one sways
//              on its own: [x, y, w, h where it is drawn, x, y where it is in the atlas]. The lines of the land (12) are
//              drawn over them in the card, so they are cut out of them (the stones' outlines show through)
//   rulito     the box of the little yellow squiggle in the sky (in 1, among the stars): not converted, as every rulito
// Not converted: 22 (the Algo Particular logo standing alone in the sky, a signature) and the rulito (only its box).
// The originals are not kept in the repo once converted. Usage: node scripts/convert-esperanza.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'originales', 'esperanza');
const target = path.join(root, 'public', 'assets', 'esperanza');
const file = (n) => path.join(source, `No_Hay_Luz_1-${n}.png`);
const O = 3240;                 // the originals
const S = 2160;                 // the space of the scenes
const K = S / O;

// Pictures made of one or more layers, drawn in this order (pad: px of the 2160 space round its box)
const pictures = {
    moon: { layers: [2, 3, 5] },
    land: { layers: [6, 7, 8, 9, 12], bleed: true },
    ginkgo0: { layers: [16, 17] },
    ginkgo1: { layers: [14, 15] },
    being: { layers: [19, 20, 21], pad: 40 },
};
const PAD = 4;
const SOLID = 110;

const load = async (n) => sharp(file(n)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const webp = (img, quality = 88) => img.webp({ quality, alphaQuality: 100, effort: 6 });
const flatten = (layers) => sharp({ create: { width: O, height: O, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(layers.map((n) => ({ input: typeof n === 'number' ? file(n) : n }))).png().toBuffer();
const scaled = async (png) => sharp(await sharp(png).resize(S, S, { kernel: 'lanczos3' }).png().toBuffer());
const rawOf = async (img) => (await img.clone().raw().toBuffer({ resolveWithObject: true })).data;
const hex = (r, g, b) => (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
const r1 = (v) => +v.toFixed(1);

const boxOf = (data, W, H, pad = PAD) => {
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
    x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad);
    x1 = Math.min(W - 1, x1 + pad); y1 = Math.min(H - 1, y1 + pad);
    return [x0, y0, x1 - x0 + 1, y1 - y0 + 1];
};

// Every blob of solid pixels: its pixels, area, centre and box
const blobsOf = (data, W, H, solidAt = SOLID) => {
    const seen = new Uint8Array(W * H);
    const blobs = [];
    const stack = [];
    const solid = (i) => data[i * 4 + 3] >= solidAt;
    for (let start = 0; start < W * H; start++) {
        if (seen[start] || !solid(start)) continue;
        const pixels = [];
        let sx = 0, sy = 0, x0 = W, y0 = H, x1 = 0, y1 = 0;
        stack.push(start);
        seen[start] = 1;
        while (stack.length) {
            const i = stack.pop();
            const x = i % W, y = (i - x) / W;
            pixels.push(i);
            sx += x; sy += y;
            x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
            for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1]) {
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

// A stipple as dots: every small blob is a dot; a big one (dots run together) is filled with dots as dense as it is
const dotsOf = (data, W, H, { min = 2, big = 90, step = 7, size = [1.6, 2.6] } = {}) => {
    const dots = [];
    for (const b of blobsOf(data, W, H, 90)) {
        if (b.area < min) continue;
        if (b.area <= big) { dots.push([r1(b.x * K), r1(b.y * K), r1(Math.sqrt(b.area / Math.PI) * K)]); continue; }
        const inBlob = new Set(b.pixels);
        const [x0, y0, x1, y1] = b.box;
        for (let y = y0; y <= y1; y += step) {
            for (let x = x0 + ((y / step) % 2) * step / 2; x <= x1; x += step) {
                const px = Math.round(x + (Math.random() - 0.5) * step * 0.6), py = Math.round(y + (Math.random() - 0.5) * step * 0.6);
                if (!inBlob.has(py * W + px)) continue;
                dots.push([r1(px * K), r1(py * K), r1(size[0] + Math.random() * (size[1] - size[0]))]);
            }
        }
    }
    return dots;
};

await mkdir(target, { recursive: true });
const scene = { size: S, sky: 0, boxes: {}, moon: null, stars: [], aura: [], tufts: [], atlas: [0, 0], rulito: null };

// The originals leave a hair empty at the sides: every row of the land is carried out to both edges, so the land
// meets its mirrored copies without a line of sky between them
const bleed = async (png) => {
    const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
    const W = info.width;
    for (let y = 0; y < info.height; y++) {
        const row = y * W;
        let a = 0, b = W - 1;
        while (a < 8 && data[(row + a) * 4 + 3] < 250) a++;
        while (b > W - 9 && data[(row + b) * 4 + 3] < 250) b--;
        if (a < 8) for (let x = 0; x < a; x++) data.copy(data, (row + x) * 4, (row + a) * 4, (row + a) * 4 + 4);
        if (b > W - 9) for (let x = b + 1; x < W; x++) data.copy(data, (row + x) * 4, (row + b) * 4, (row + b) * 4 + 4);
    }
    return sharp(data, { raw: { width: W, height: info.height, channels: 4 } }).png().toBuffer();
};

// Plain pictures
for (const [name, { layers, pad = PAD, bleed: edges = false }] of Object.entries(pictures)) {
    const flat = await flatten(layers);
    const img = await scaled(edges ? await bleed(flat) : flat);
    const box = boxOf(await rawOf(img), S, S, pad);
    await webp(img.extract({ left: box[0], top: box[1], width: box[2], height: box[3] })).toFile(path.join(target, `${name}.webp`));
    scene.boxes[name] = box;
}

// The land beyond the frame (sides.webp, at half the size: it is only seen at the sides of a wide screen, mirrored): the
// sands without the stones, so no stone is seen twice. The lines round the stones go with them, and the outline of the
// dunes against the sky, which the stones broke, is drawn again whole along the top of the sand
{
    const [rocks, lines, sand] = await Promise.all([load(9), load(12), load(6)]).then((all) => all.map((l) => l.data));
    const R = 30;
    const solid = (d, x, y) => d[(y * O + x) * 4 + 3] >= 128;
    for (let y = 1; y < O - 1; y++) {
        for (let x = 1; x < O - 1; x++) {
            if (!solid(rocks, x, y)) continue;
            const i = y * O + x;
            lines[i * 4 + 3] = 0;
            if (solid(rocks, x - 1, y) && solid(rocks, x + 1, y) && solid(rocks, x, y - 1) && solid(rocks, x, y + 1)) continue;
            for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
                const xx = x + dx, yy = y + dy;
                if (dx * dx + dy * dy <= R * R && xx >= 0 && yy >= 0 && xx < O && yy < O) lines[(yy * O + xx) * 4 + 3] = 0;
            }
        }
    }
    // The outline: a round brush along the top of the sand where the stones broke it, as thick as the card's (it sits 9 px
    // over the sand, 25 thick)
    const BRUSH = 12.5, LIFT = 3.5;
    for (let x = 0; x < O; x++) {
        let top = -1;
        for (let y = 0; y < O; y++) if (sand[(y * O + x) * 4 + 3] > 128) { top = y; break; }
        if (top < 0) continue;
        // Only where the card's own outline is missing (it is kept as it is drawn everywhere else)
        let inked = false;
        for (let y = top - 12; y <= top + 6 && !inked; y++) inked = lines[(y * O + x) * 4 + 3] > 128;
        if (inked) continue;
        for (let dy = -13; dy <= 13; dy++) for (let dx = -13; dx <= 13; dx++) {
            if (dx * dx + dy * dy > BRUSH * BRUSH) continue;
            const xx = x + dx, yy = Math.round(top + LIFT + dy);
            if (xx < 0 || xx >= O || yy < 0 || yy >= O) continue;
            lines.set([0x32, 0x2e, 0x08, 255], (yy * O + xx) * 4);
        }
    }
    const flat = await bleed(await flatten([6, 7, 8, await sharp(lines, { raw: { width: O, height: O, channels: 4 } }).png().toBuffer()]));
    const box = scene.boxes.land;
    const half = await sharp(await sharp(flat).resize(S / 2, S / 2, { kernel: 'lanczos3' }).png().toBuffer())
        .extract({ left: 0, top: Math.floor(box[1] / 2), width: S / 2, height: Math.ceil(box[3] / 2) });
    await webp(half, 85).toFile(path.join(target, 'sides.webp'));
    scene.boxes.sides = [0, Math.floor(box[1] / 2) * 2, S, Math.ceil(box[3] / 2) * 2];
}

// The sky: the colour of the finished card where no layer draws anything (the median, so stars do not count)
{
    const card = await sharp(path.join(root, 'public', 'cards', '30.webp')).resize(S, S).removeAlpha().raw().toBuffer();
    const all = await rawOf(await scaled(await flatten(Array.from({ length: 22 }, (_, i) => i + 1))));
    const rs = [], gs = [], bs = [];
    for (let i = 0; i < S * S; i += 7) {
        if (all[i * 4 + 3] > 0) continue;
        rs.push(card[i * 3]); gs.push(card[i * 3 + 1]); bs.push(card[i * 3 + 2]);
    }
    const median = (list) => list.sort((a, b) => a - b)[list.length >> 1];
    scene.sky = hex(median(rs), median(gs), median(bs));
}

// The moon: the disc that fits its white (2), and its stipple (4) as dots
{
    const { data } = await load(2);
    const [, y0, , h] = boxOf(data, O, O, 0);
    // The knobs on its rim stick out of the disc: the radius is that of the round part, measured across its middle row
    const cy = Math.round(y0 + h / 2);
    let left = 0, right = O;
    for (let x = 0; x < O; x++) if (data[(cy * O + x) * 4 + 3] > 128) { left = x; break; }
    for (let x = O - 1; x >= 0; x--) if (data[(cy * O + x) * 4 + 3] > 128) { right = x; break; }
    const stipple = await load(4);
    scene.moon = { x: r1((left + right) / 2 * K), y: r1(cy * K), r: r1((right - left) / 2 * K), dots: dotsOf(stipple.data, O, O, { step: 8, size: [1.4, 2.4] }) };
}

// The stars (1): every dot; the squiggle among them is the rulito, the longest blob
{
    const { data } = await load(1);
    const blobs = blobsOf(data, O, O, 60);
    const long = blobs.reduce((best, b) => (Math.max(b.box[2] - b.box[0], b.box[3] - b.box[1]) > Math.max(best.box[2] - best.box[0], best.box[3] - best.box[1]) ? b : best));
    const [x0, y0, x1, y1] = long.box;
    scene.rulito = [x0, y0, x1 - x0 + 1, y1 - y0 + 1].map((v) => Math.round(v * K));
    scene.stars = blobs.filter((b) => b !== long && b.area >= 3).map((b) => [r1(b.x * K), r1(b.y * K), r1(Math.sqrt(b.area / Math.PI) * K)]);
}

// The aura round the being (18): a dot wherever the stipple is
{
    const { data } = await load(18);
    scene.aura = dotsOf(data, O, O, { min: 2, big: 60, step: 9, size: [1.4, 2.4] });
}

// The grass and the mushrooms: every tuft cut out (with its soft edge, and without the lines of the land over it) into
// one atlas, packed in rows
{
    const tufts = await rawOf(await scaled(await flatten([10, 11, 13])));
    const lines = await rawOf(await scaled(await flatten([12])));
    for (let i = 0; i < S * S; i++) tufts[i * 4 + 3] = Math.round(tufts[i * 4 + 3] * (1 - lines[i * 4 + 3] / 255));
    const ATLAS_W = 512, GAP = 6, EDGE = 4;
    const cuts = [];
    for (const piece of piecesOf(blobsOf(tufts, S, S, 40).filter((b) => b.area >= 4), 14)) {
        let x0 = S, y0 = S, x1 = 0, y1 = 0;
        piece.forEach((b) => { x0 = Math.min(x0, b.box[0]); y0 = Math.min(y0, b.box[1]); x1 = Math.max(x1, b.box[2]); y1 = Math.max(y1, b.box[3]); });
        if ((x1 - x0) * (y1 - y0) < 60) continue;
        x0 = Math.max(0, x0 - EDGE); y0 = Math.max(0, y0 - EDGE); x1 = Math.min(S - 1, x1 + EDGE); y1 = Math.min(S - 1, y1 + EDGE);
        const w = x1 - x0 + 1, h = y1 - y0 + 1;
        const pixels = Buffer.alloc(w * h * 4);
        for (let y = 0; y < h; y++) tufts.copy(pixels, y * w * 4, ((y0 + y) * S + x0) * 4, ((y0 + y) * S + x0 + w) * 4);
        cuts.push({ x: x0, y: y0, w, h, pixels });
    }
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
        .composite(cuts.map((c) => ({ input: c.pixels, raw: { width: c.w, height: c.h, channels: 4 }, left: c.ax, top: c.ay }))), 90)
        .toFile(path.join(target, 'tufts.webp'));
    scene.atlas = [ATLAS_W, ATLAS_H];
    scene.tufts = cuts.sort((a, b) => a.x - b.x).map((c) => [c.x, c.y, c.w, c.h, c.ax, c.ay]);
}

await writeFile(path.join(root, 'src', 'composables', 'esperanzaScene.json'), JSON.stringify(scene));
console.log(Object.keys(scene.boxes).length, 'pictures', JSON.stringify(scene.boxes), 'sky', scene.sky.toString(16), 'moon', scene.moon.x, scene.moon.y, 'r', scene.moon.r,
    'with', scene.moon.dots.length, 'dots;', scene.stars.length, 'stars;', scene.aura.length, 'aura dots;', scene.tufts.length, 'tufts in a', scene.atlas.join('x'),
    'atlas; rulito', scene.rulito);
