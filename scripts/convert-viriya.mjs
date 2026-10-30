// The layers of Viriya as exported (originales/viriya/Viriya-N.png, 2160px) -> public/assets/viriya/*.webp, each cropped to
// its own box, and src/composables/viriyaScene.json, all in px of the 2160 square:
//   boxes      the box of every picture
//   sky        the sky is not a picture: the colour of the navy (1) with the band of the sunset (2) over it, row by row
//              (averaged across), as [y, 0xRRGGBB] stops for a gradient drawn in code
//   sun        the sun is not a picture either: the disc that fits inside its solid middle ([x, y, r]) and its colour, and
//              every dot of its stippled edge as [x, y, radius] (its ragged rim filled with dots too), so it can be alive
//   aura       the stipple round Particular (17), as dots [x, y, radius]
//   winds      the white strokes of the wind (8), each cut out into one atlas (winds.webp) so they can drift
//   cacti      the three pink cacti (10 and 11, gathered by nearness), each its own picture: the things to light
//   plants     the three dark plants (12, 13, 14) and where each one's yellow flower is ([x, y, r])
//   spiral, rulito  where the staff's spiral and the card's rulito are drawn
// The originals are not kept in the repo once converted. Usage: node scripts/convert-viriya.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'originales', 'viriya');
const target = path.join(root, 'public', 'assets', 'viriya');
const file = (n) => path.join(source, `Viriya-${n}.png`);
const S = 2160;

// Pictures made of one or more layers, drawn in this order. 30 (the rulito over Particular) is not converted: the scene
// draws it in code, as every rulito; only its place and colour are kept
const pictures = {
    hills: [4, 9, 15], path: [5], sparkle: [16], cliff: [6, 7], walker: [18, 19, 20, 21, 22, 23, 24, 25, 26, 27], staff: [28, 29],
    plant0: [12], plant1: [13], plant2: [14],
};
const PAD = 4;
const SOLID = 110;

const load = async (n) => sharp(file(n)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const webp = (img) => img.webp({ quality: 90, alphaQuality: 100, effort: 5 });
const flatten = (layers) => sharp({ create: { width: S, height: S, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(layers.map((n) => ({ input: typeof n === 'number' ? file(n) : n }))).png().toBuffer();
const rawOf = async (png) => (await sharp(png).raw().toBuffer({ resolveWithObject: true })).data;
const hex = (r, g, b) => (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);

const boxOf = (data, W, H, keep = () => true) => {
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            const i = y * W + x;
            if (data[i * 4 + 3] < 4 || !keep(i)) continue;
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

// Every blob of solid pixels (that `keep` lets in): its pixels, area and centre
const blobsOf = (data, W, H, keep = () => true) => {
    const seen = new Uint8Array(W * H);
    const blobs = [];
    const stack = [];
    const solid = (i) => data[i * 4 + 3] >= SOLID && keep(i);
    for (let start = 0; start < W * H; start++) {
        if (seen[start] || !solid(start)) continue;
        const pixels = [];
        let sx = 0, sy = 0;
        stack.push(start);
        seen[start] = 1;
        while (stack.length) {
            const i = stack.pop();
            const x = i % W, y = (i - x) / W;
            pixels.push(i);
            sx += x; sy += y;
            for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1]) {
                if (j < 0 || seen[j] || !solid(j)) continue;
                seen[j] = 1;
                stack.push(j);
            }
        }
        blobs.push({ pixels, area: pixels.length, x: sx / pixels.length, y: sy / pixels.length });
    }
    return blobs.sort((a, b) => b.area - a.area);
};

// Pieces of a layer: what is nearer than `join` px belongs together (each blob joins the piece of any blob near it)
const piecesOf = (blobs, join) => {
    const boxes = blobs.map((b) => {
        let x0 = S, y0 = S, x1 = 0, y1 = 0;
        b.pixels.forEach((i) => { const x = i % S, y = (i - x) / S; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); });
        return [x0, y0, x1, y1];
    });
    const near = (a, b) => a[0] - join <= b[2] && b[0] - join <= a[2] && a[1] - join <= b[3] && b[1] - join <= a[3];
    const group = blobs.map((_, i) => i);
    const find = (i) => (group[i] === i ? i : (group[i] = find(group[i])));
    for (let i = 0; i < blobs.length; i++) for (let j = i + 1; j < blobs.length; j++) if (near(boxes[i], boxes[j])) group[find(i)] = find(j);
    const out = new Map();
    blobs.forEach((b, i) => { const g = find(i); if (!out.has(g)) out.set(g, []); out.get(g).push(b); });
    return [...out.values()];
};

await mkdir(target, { recursive: true });
const scene = { size: S, boxes: {}, sky: [], sun: null, aura: [], winds: [], atlas: [0, 0], cacti: [], plants: [] };

// Plain pictures
for (const [name, layers] of Object.entries(pictures)) {
    const flat = await flatten(layers);
    const box = boxOf(await rawOf(flat), S, S);
    await webp(sharp(flat).extract({ left: box[0], top: box[1], width: box[2], height: box[3] })).toFile(path.join(target, `${name}.webp`));
    scene.boxes[name] = box;
}

// The sky: the navy with the sunset over it, averaged across each band of STEP rows
{
    const sky = await rawOf(await flatten([1, 2]));
    const STEP = 24;
    for (let y = 0; y < 1640; y += STEP) {
        let r = 0, g = 0, b = 0, n = 0;
        for (let yy = y; yy < y + STEP; yy += 4) for (let x = 0; x < S; x += 8) { const i = (yy * S + x) * 4; r += sky[i]; g += sky[i + 1]; b += sky[i + 2]; n++; }
        scene.sky.push([y + STEP / 2, hex(r / n, g / n, b / n)]);
    }
}

// The sun: the disc inside its solid middle, and dots for everything round it
{
    const { data } = await load(3);
    const [main, ...rest] = blobsOf(data, S, S);
    const inMain = new Uint8Array(S * S);
    main.pixels.forEach((i) => { inMain[i] = 1; });
    const cx = main.x, cy = main.y;
    // The biggest radius whose circle is (almost) all solid
    let r = 10;
    for (; r < 500; r += 4) {
        let inside = 0, all = 0;
        for (let a = 0; a < 360; a += 3) {
            const x = Math.round(cx + Math.cos(a * Math.PI / 180) * r), y = Math.round(cy + Math.sin(a * Math.PI / 180) * r);
            all++;
            if (inMain[y * S + x]) inside++;
        }
        if (inside / all < 0.97) break;
    }
    const R = r - 8;
    const dots = rest.filter((b) => b.area >= 3).map((b) => [Math.round(b.x), Math.round(b.y), +Math.sqrt(b.area / Math.PI).toFixed(1)]);
    // The ragged rim of the solid middle, outside the disc, filled with dots
    const FILL = 9;
    for (let y = Math.floor(cy - 600); y < cy + 600; y += FILL) {
        for (let x = Math.floor(cx - 600) + ((y / FILL) % 2) * FILL / 2; x < cx + 600; x += FILL) {
            const px = Math.round(x + (Math.random() - 0.5) * FILL * 0.6), py = Math.round(y + (Math.random() - 0.5) * FILL * 0.6);
            if (px < 0 || py < 0 || px >= S || py >= S || !inMain[py * S + px]) continue;
            if (Math.hypot(px - cx, py - cy) < R - 6) continue;
            dots.push([px, py, +(5 + Math.random() * 2.5).toFixed(1)]);
        }
    }
    scene.sun = { x: Math.round(cx), y: Math.round(cy), r: R, color: 0xffd51d, dots };
}

// The aura round Particular: a dot wherever the stipple is, as dense as it is
{
    const { data } = await load(17);
    const STEP = 5;
    for (let y = 0; y < S; y += STEP) {
        for (let x = 0; x < S; x += STEP) {
            const a = data[(y * S + x) * 4 + 3] / 255;
            if (a < 0.05 || Math.random() > a * 0.9) continue;
            scene.aura.push([x + Math.round((Math.random() - 0.5) * STEP), y + Math.round((Math.random() - 0.5) * STEP), +(1.8 + Math.random() * 1.6).toFixed(1)]);
        }
    }
}

// The wind: every stroke cut out (with its soft edge) into one atlas, packed in rows
{
    const { data } = await load(8);
    const ATLAS_W = 1024, GAP = 8;
    const cuts = [];
    for (const piece of piecesOf(blobsOf(data, S, S).filter((b) => b.area >= 20), 40)) {
        let x0 = S, y0 = S, x1 = 0, y1 = 0;
        piece.forEach((b) => b.pixels.forEach((i) => { const x = i % S, y = (i - x) / S; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }));
        x0 = Math.max(0, x0 - 6); y0 = Math.max(0, y0 - 6); x1 = Math.min(S - 1, x1 + 6); y1 = Math.min(S - 1, y1 + 6);
        const w = x1 - x0 + 1, h = y1 - y0 + 1;
        const pixels = Buffer.alloc(w * h * 4);
        for (let y = 0; y < h; y++) data.copy(pixels, y * w * 4, ((y0 + y) * S + x0) * 4, ((y0 + y) * S + x0 + w) * 4);
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
        .composite(cuts.map((c) => ({ input: c.pixels, raw: { width: c.w, height: c.h, channels: 4 }, left: c.ax, top: c.ay }))))
        .toFile(path.join(target, 'winds.webp'));
    scene.atlas = [ATLAS_W, ATLAS_H];
    // [x, y, w, h where it is drawn, x, y where it is in the atlas], left to right
    scene.winds = cuts.sort((a, b) => a.x - b.x).map((c) => [c.x, c.y, c.w, c.h, c.ax, c.ay]);
}

// The cacti: the pink fills (10) and their lines (11), gathered into the three cacti by nearness
{
    const flat = await flatten([10, 11]);
    const data = await rawOf(flat);
    const pieces = piecesOf(blobsOf(data, S, S).filter((b) => b.area >= 10), 8)
        .map((piece) => ({ piece, area: piece.reduce((s, b) => s + b.area, 0) }))
        .filter((p) => p.area > 3000)
        .sort((a, b) => a.piece[0].x - b.piece[0].x);
    for (const [k, { piece }] of pieces.entries()) {
        const mine = new Uint8Array(S * S);
        piece.forEach((b) => b.pixels.forEach((i) => { mine[i] = 1; }));
        // With the soft edge round the solid pixels
        const keep = new Uint8Array(S * S);
        for (let i = 0; i < S * S; i++) {
            if (!mine[i]) continue;
            for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const j = i + dy * S + dx; if (j >= 0 && j < S * S) keep[j] = 1; }
        }
        const only = Buffer.from(data);
        for (let i = 0; i < S * S; i++) if (!keep[i]) only[i * 4 + 3] = 0;
        const box = boxOf(only, S, S);
        await webp(sharp(only, { raw: { width: S, height: S, channels: 4 } }).extract({ left: box[0], top: box[1], width: box[2], height: box[3] }))
            .toFile(path.join(target, `cactus${k}.webp`));
        scene.boxes[`cactus${k}`] = box;
        scene.cacti.push(`cactus${k}`);
    }
}

// The plants: where each one's yellow flower is
for (const [k, n] of [12, 13, 14].entries()) {
    const { data } = await load(n);
    const yellow = (i) => data[i * 4] > 200 && data[i * 4 + 1] > 160 && data[i * 4 + 2] < 120;
    const [flower] = blobsOf(data, S, S, yellow);
    scene.plants.push({ name: `plant${k}`, flower: [Math.round(flower.x), Math.round(flower.y), Math.round(Math.sqrt(flower.area / Math.PI))] });
}

{
    const { data } = await load(29);
    scene.spiral = boxOf(data, S, S);
    const r = await load(30);
    scene.rulito = boxOf(r.data, S, S);
}

await writeFile(path.join(root, 'src', 'composables', 'viriyaScene.json'), JSON.stringify(scene));
console.log(Object.keys(scene.boxes).length, 'pictures;', scene.sky.length, 'sky stops; sun', scene.sun.x, scene.sun.y, 'r', scene.sun.r, 'with', scene.sun.dots.length,
    'dots; aura', scene.aura.length, 'dots;', scene.winds.length, 'winds in a', scene.atlas.join('x'), 'atlas;', scene.cacti.length, 'cacti;',
    JSON.stringify(scene.plants), 'spiral', scene.spiral, 'rulito', scene.rulito);
