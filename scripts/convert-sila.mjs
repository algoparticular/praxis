// The layers of Sila as exported (2160px PNGs; they came in originales/sila/Sacca-N.png, named by mistake, and are in the
// git history) -> public/assets/sila/*.webp, each cropped to its own box, and src/composables/silaScene.json: the box of
// every picture; every cloud on its own (its colour, where it is drawn and where it sits in clouds.webp, an atlas of all
// of them, so the scene can spread them over the sky and let them drift); every dot of the stipple round the moon and of
// the stars as [x, y, radius, colour], so the scene draws them as real particles; and the orange glow of the mushrooms
// (layers 8 and 10) as dots too, each with the mushroom it belongs to ([x, y, radius, mushroom]): the scene makes them
// live particles that the wind moves, and lights each mushroom on its own. All in px of the 2160 square. The originals
// are not kept in the repo once converted. Usage: node scripts/convert-sila.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'originales', 'sila');
const target = path.join(root, 'public', 'assets', 'sila');
const file = (n) => path.join(source, `Sacca-${n}.png`);

// Pictures made of one or more layers, drawn in this order. The orange glow of the mushrooms (8) is drawn between the
// rocks and the line work, as in the card: 'lines' takes from 8 only the cap of the big mushroom (the rest of 8 is the
// glow, which is particles). 24 (the rulito over Particular) is not converted: the scene draws
// it in code, as every rulito; only its place is kept
const pictures = {
    ground: [2], rocks: [6, 7], lines: ['cap', 9], sparkle: [25], box: [16],
    sid: [11, 12, 13, 14, 15], particular: [17, 18, 19, 20, 21, 22], lectern: [23],
};
const stippled = { moon: 1 };
const CLOUDS = [4, 5];
const STARS = 3;
const GLOW = [8, 10];
const PAD = 4;
const SOLID = 110;              // alpha from which a pixel is part of a shape (as in convert-sacca)
const orange = (data, i) => data[i * 4 + 2] < 185 && data[i * 4] > 230;

const load = async (n) => sharp(file(n)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const webp = (img) => img.webp({ quality: 90, alphaQuality: 100, effort: 5 });

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

// Every blob of solid pixels: its pixels, area, centre and mean colour
const blobsOf = (data, W, H, keep = () => true) => {
    const seen = new Uint8Array(W * H);
    const blobs = [];
    const stack = [];
    const solid = (i) => data[i * 4 + 3] >= SOLID && keep(i);
    for (let start = 0; start < W * H; start++) {
        if (seen[start] || !solid(start)) continue;
        const pixels = [];
        let sx = 0, sy = 0, r = 0, g = 0, b = 0;
        stack.push(start);
        seen[start] = 1;
        while (stack.length) {
            const i = stack.pop();
            const x = i % W, y = (i - x) / W;
            pixels.push(i);
            sx += x; sy += y;
            r += data[i * 4]; g += data[i * 4 + 1]; b += data[i * 4 + 2];
            for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1]) {
                if (j < 0 || seen[j] || !solid(j)) continue;
                seen[j] = 1;
                stack.push(j);
            }
        }
        const n = pixels.length;
        blobs.push({ pixels, area: n, x: sx / n, y: sy / n, rgb: [r / n, g / n, b / n] });
    }
    return blobs.sort((a, b) => b.area - a.area);
};

const grown = (pixels, W, H, grow) => {
    let mask = new Uint8Array(W * H);
    pixels.forEach((i) => { mask[i] = 1; });
    for (let pass = 0; pass < grow; pass++) {
        const next = mask.slice();
        for (let i = 0; i < W * H; i++) {
            if (!mask[i]) continue;
            const x = i % W;
            if (x > 0) next[i - 1] = 1;
            if (x < W - 1) next[i + 1] = 1;
            if (i >= W) next[i - W] = 1;
            if (i < W * H - W) next[i + W] = 1;
        }
        mask = next;
    }
    return mask;
};

await mkdir(target, { recursive: true });
const scene = { size: 2160, boxes: {}, colors: [], dots: {}, clouds: [], atlas: [0, 0], glow: [], mushrooms: [] };
const colorIndex = (r, g, b) => {
    const q = [r, g, b].map((c) => Math.min(255, Math.round(c / 16) * 16));
    const hex = (q[0] << 16) | (q[1] << 8) | q[2];
    let i = scene.colors.indexOf(hex);
    if (i < 0) { i = scene.colors.length; scene.colors.push(hex); }
    return i;
};

// The cap of the big mushroom: what in layer 8 is not its orange glow
const capOnly = async () => {
    const { data, info } = await load(8);
    const out = Buffer.from(data);
    for (let i = 0; i < info.width * info.height; i++) if (orange(data, i)) out[i * 4 + 3] = 0;
    return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
};
const cap = await capOnly();

for (const [name, layers] of Object.entries(pictures)) {
    const flat = await sharp({ create: { width: 2160, height: 2160, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
        .composite(layers.map((n) => ({ input: n === 'cap' ? cap : file(n) }))).png().toBuffer();
    const { data } = await sharp(flat).raw().toBuffer({ resolveWithObject: true });
    const box = boxOf(data, 2160, 2160);
    await webp(sharp(flat).extract({ left: box[0], top: box[1], width: box[2], height: box[3] })).toFile(path.join(target, `${name}.webp`));
    scene.boxes[name] = box;
}

// The moon: the biggest blob (with its soft edge) is the picture, every other blob a dot
for (const [name, n] of Object.entries(stippled)) {
    const { data, info } = await load(n);
    const W = info.width, H = info.height;
    const [main, ...rest] = blobsOf(data, W, H);
    const keep = grown(main.pixels, W, H, 3);
    const solid = Buffer.from(data);
    for (let i = 0; i < W * H; i++) if (!keep[i]) solid[i * 4 + 3] = 0;
    const box = boxOf(solid, W, H);
    await webp(sharp(solid, { raw: { width: W, height: H, channels: 4 } }).extract({ left: box[0], top: box[1], width: box[2], height: box[3] }))
        .toFile(path.join(target, `${name}.webp`));
    scene.boxes[name] = box;
    scene.dots[name] = rest.filter((b) => b.area >= 3)
        .map((b) => [Math.round(b.x), Math.round(b.y), +Math.sqrt(b.area / Math.PI).toFixed(1), colorIndex(...b.rgb)]);
}

// The stars: every dot
{
    const { data, info } = await load(STARS);
    scene.dots.stars = blobsOf(data, info.width, info.height).filter((b) => b.area >= 2)
        .map((b) => [Math.round(b.x), Math.round(b.y), +Math.sqrt(b.area / Math.PI).toFixed(1), colorIndex(...b.rgb)]);
}

// The orange glow of the mushrooms: the loose dots as they are, and the dense middle of each glow filled with dots
// (one every FILL px, a little jittered), so all of it can be particles. Then the dots are gathered into mushrooms:
// dots nearer than JOIN px to each other belong to the same one
{
    const FILL = 7, JOIN = 60;
    const dots = [];
    for (const n of GLOW) {
        const { data, info } = await load(n);
        const W = info.width, H = info.height;
        for (const b of blobsOf(data, W, H, (i) => orange(data, i))) {
            if (b.area < 3) continue;
            const r = Math.sqrt(b.area / Math.PI);
            if (r < 7) { dots.push([b.x, b.y, r]); continue; }
            const set = new Set(b.pixels);
            let x0 = W, y0 = H, x1 = 0, y1 = 0;
            b.pixels.forEach((i) => { const x = i % W, y = (i - x) / W; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); });
            for (let y = y0; y <= y1; y += FILL) {
                for (let x = x0 + ((y / FILL) % 2) * FILL / 2; x <= x1; x += FILL) {
                    const px = Math.round(x + (Math.random() - 0.5) * FILL * 0.6), py = Math.round(y + (Math.random() - 0.5) * FILL * 0.6);
                    if (set.has(py * W + px)) dots.push([px, py, 4.5 + Math.random() * 2.5]);
                }
            }
        }
    }
    // Single-link groups on a grid
    const cell = new Map();
    const key = (x, y) => `${Math.floor(x / JOIN)},${Math.floor(y / JOIN)}`;
    dots.forEach((d, i) => { const k = key(d[0], d[1]); if (!cell.has(k)) cell.set(k, []); cell.get(k).push(i); });
    const group = new Int32Array(dots.length).fill(-1);
    let groups = 0;
    dots.forEach((_, s) => {
        if (group[s] >= 0) return;
        const stack = [s];
        group[s] = groups;
        while (stack.length) {
            const i = stack.pop();
            const [x, y] = dots[i];
            const gx = Math.floor(x / JOIN), gy = Math.floor(y / JOIN);
            for (let ox = -1; ox <= 1; ox++) {
                for (let oy = -1; oy <= 1; oy++) {
                    for (const j of cell.get(`${gx + ox},${gy + oy}`) ?? []) {
                        if (group[j] >= 0 || Math.hypot(dots[j][0] - x, dots[j][1] - y) > JOIN) continue;
                        group[j] = groups;
                        stack.push(j);
                    }
                }
            }
        }
        groups += 1;
    });
    // Each mushroom: its middle and how far its glow reaches; tiny groups (a stray dot) join the nearest big one
    const sums = Array.from({ length: groups }, () => ({ n: 0, x: 0, y: 0 }));
    dots.forEach((d, i) => { const s = sums[group[i]]; s.n++; s.x += d[0]; s.y += d[1]; });
    const big = sums.map((s, g) => ({ g, n: s.n, x: s.x / s.n, y: s.y / s.n })).filter((s) => s.n >= 20).sort((a, b) => a.x - b.x);
    const index = new Map(big.map((s, i) => [s.g, i]));
    const of = (i) => {
        if (index.has(group[i])) return index.get(group[i]);
        let best = 0, bestD = Infinity;
        big.forEach((s, j) => { const dd = Math.hypot(s.x - dots[i][0], s.y - dots[i][1]); if (dd < bestD) { bestD = dd; best = j; } });
        return best;
    };
    scene.glow = dots.map((d, i) => [Math.round(d[0]), Math.round(d[1]), +d[2].toFixed(1), of(i)]);
    scene.mushrooms = big.map((s, j) => {
        const mine = scene.glow.filter((d) => d[3] === j);
        const reach = Math.max(...mine.map((d) => Math.hypot(d[0] - s.x, d[1] - s.y)));
        return [Math.round(s.x), Math.round(s.y), Math.round(reach)];
    });
}

// The clouds: each one cut out (with its soft edge) and packed in rows into one atlas
const ATLAS_W = 1024, GAP = 8;
const cuts = [];
for (const [layer, n] of CLOUDS.entries()) {
    const { data, info } = await load(n);
    const W = info.width, H = info.height;
    for (const blob of blobsOf(data, W, H)) {
        if (blob.area < 50) continue;
        const keep = grown(blob.pixels, W, H, 3);
        let x0 = W, y0 = H, x1 = -1, y1 = -1;
        for (let i = 0; i < W * H; i++) {
            if (!keep[i] || data[i * 4 + 3] < 4) continue;
            const x = i % W, y = (i - x) / W;
            if (x < x0) x0 = x;
            if (x > x1) x1 = x;
            if (y < y0) y0 = y;
            if (y > y1) y1 = y;
        }
        x0 = Math.max(0, x0 - 2); y0 = Math.max(0, y0 - 2); x1 = Math.min(W - 1, x1 + 2); y1 = Math.min(H - 1, y1 + 2);
        const w = x1 - x0 + 1, h = y1 - y0 + 1;
        const pixels = Buffer.alloc(w * h * 4);
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const i = (y0 + y) * W + x0 + x;
                if (!keep[i]) continue;
                data.copy(pixels, (y * w + x) * 4, i * 4, i * 4 + 4);
            }
        }
        cuts.push({ layer, x: x0, y: y0, w, h, pixels });
    }
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
    .toFile(path.join(target, 'clouds.webp'));
scene.atlas = [ATLAS_W, ATLAS_H];
// [colour (0 light blue, 1 lavender), x, y, w, h where it is drawn, x, y where it is in the atlas], left to right
scene.clouds = cuts.sort((a, b) => a.layer - b.layer || a.x - b.x).map((c) => [c.layer, c.x, c.y, c.w, c.h, c.ax, c.ay]);

// Where the card draws the rulito, over Particular
{
    const { data, info } = await load(24);
    scene.rulito = boxOf(data, info.width, info.height);
}

await writeFile(path.join(root, 'src', 'composables', 'silaScene.json'), JSON.stringify(scene));
console.log(Object.keys(scene.boxes).length, 'pictures;', scene.clouds.length, 'clouds in a', `${ATLAS_W}x${ATLAS_H}`, 'atlas;',
    Object.entries(scene.dots).map(([k, v]) => `${k} ${v.length} dots`).join(', '), `; glow ${scene.glow.length} dots in`,
    scene.mushrooms.length, 'mushrooms', JSON.stringify(scene.mushrooms), ';', scene.colors.length, 'colours');
