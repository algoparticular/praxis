// The layers of Sacca as exported (2160px PNGs; they came in originales/sila/Sila-N.png, a folder named by mistake, and
// are in the git history from commit 934bd33) -> public/assets/sacca/*.webp, each cropped to its own box, and
// src/composables/saccaScene.json: the box of every picture; every cloud on its own (its colour, where it is drawn and
// where it sits in clouds.webp, an atlas of all of them, so the scene can spread them over any screen and light each one);
// every dot of the stipple round the moon as [x, y, radius, colour], so the scene draws them as real particles; and the
// shape of Sid's body (the inside of his outline, as a polygon), which the scene fills and makes glow in code (the
// illustration's fill and glow, layer 10, are not used). All in px of the 2160 square. The originals are not kept in the repo once converted.
// Usage: node scripts/convert-sacca.mjs
// The moon's dots and colours it writes are no longer used: the scene draws the moon's band from `moon.cloud`, made by
// scripts/sun-cloud.mjs (`node scripts/sun-cloud.mjs sacca`), which must be run after this.
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'originales', 'sila');
const target = path.join(root, 'public', 'assets', 'sacca');
const file = (n) => path.join(source, `Sila-${n}.png`);

// Pictures made of one or more layers, drawn in this order. 18 (the rulito over the lookout) is not converted: the
// scene draws it in code, as every rulito; only its place is kept. 19 is the lookout's arm, drawn over the cup
const pictures = {
    mountains: [1], mark: [2], hull: [8], line: [9], sid: [11, 12, 13, 14, 15], mast: [16], lookout: [17, 19],
};
// Pictures with a stipple round them: the solid shape is a picture, its loose dots are particles
const stippled = { moon: 7 };
// The clouds, one layer per colour
const CLOUDS = [3, 4, 5, 6];
const PAD = 4;
const SOLID = 110;              // alpha from which a pixel is part of a shape (as in convert-nekkhamma)

const load = async (n) => sharp(file(n)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const webp = (img) => img.webp({ quality: 90, alphaQuality: 100, effort: 5 });

// The box of what is not transparent in raw RGBA, with a little room
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

// Every blob of solid pixels: the indices of its pixels, its area, centre and mean colour
const blobsOf = (data, W, H) => {
    const seen = new Uint8Array(W * H);
    const blobs = [];
    const stack = [];
    for (let start = 0; start < W * H; start++) {
        if (seen[start] || data[start * 4 + 3] < SOLID) continue;
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
                if (j < 0 || seen[j] || data[j * 4 + 3] < SOLID) continue;
                seen[j] = 1;
                stack.push(j);
            }
        }
        const n = pixels.length;
        blobs.push({ pixels, area: n, x: sx / n, y: sy / n, rgb: [r / n, g / n, b / n] });
    }
    return blobs.sort((a, b) => b.area - a.area);
};

// A mask of a blob grown by `grow` px, so the soft edge round it (alpha under SOLID) stays with it
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
const scene = { size: 2160, boxes: {}, colors: [], dots: {}, clouds: [], atlas: [0, 0] };
const colorIndex = (r, g, b) => {
    const q = [r, g, b].map((c) => Math.min(255, Math.round(c / 16) * 16));
    const hex = (q[0] << 16) | (q[1] << 8) | q[2];
    let i = scene.colors.indexOf(hex);
    if (i < 0) { i = scene.colors.length; scene.colors.push(hex); }
    return i;
};

// Plain pictures (a few layers drawn one over the other), cropped to their box
for (const [name, layers] of Object.entries(pictures)) {
    const { info } = await load(layers[0]);
    const flat = await sharp({ create: { width: info.width, height: info.height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
        .composite(layers.map((n) => ({ input: file(n) }))).png().toBuffer();
    const { data } = await sharp(flat).raw().toBuffer({ resolveWithObject: true });
    const box = boxOf(data, info.width, info.height);
    await webp(sharp(flat).extract({ left: box[0], top: box[1], width: box[2], height: box[3] })).toFile(path.join(target, `${name}.webp`));
    scene.boxes[name] = box;
}

// The moon: the biggest blob is its disc, which the scene draws in code (with its ragged rim as particles), so only its
// box is kept; every other blob is a dot
for (const [name, n] of Object.entries(stippled)) {
    const { data, info } = await load(n);
    const W = info.width, H = info.height;
    const [main, ...rest] = blobsOf(data, W, H);
    const keep = grown(main.pixels, W, H, 3);
    const solid = Buffer.from(data);
    for (let i = 0; i < W * H; i++) if (!keep[i]) solid[i * 4 + 3] = 0;
    scene.boxes[name] = boxOf(solid, W, H);
    scene.dots[name] = rest.filter((b) => b.area >= 3)
        .map((b) => [Math.round(b.x), Math.round(b.y), +Math.sqrt(b.area / Math.PI).toFixed(1), colorIndex(...b.rgb)]);
}

// The clouds: each one cut out (with its soft edge) and packed in rows into one atlas
const ATLAS_W = 1024, GAP = 8;
const cuts = [];
for (const [layer, n] of CLOUDS.entries()) {
    const { data, info } = await load(n);
    const W = info.width, H = info.height;
    for (const blob of blobsOf(data, W, H)) {
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
// Shelf packing, tallest first
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
// [colour (0..3, the layers 3 to 6), x, y, w, h where it is drawn, x, y where it is in the atlas], left to right
scene.clouds = cuts.sort((a, b) => a.layer - b.layer || a.x - b.x).map((c) => [c.layer, c.x, c.y, c.w, c.h, c.ax, c.ay]);

// Sid's body: what his outline (12, with his arm, 15) closes, found by filling the outside from the edges; its edge is
// traced into a polygon, a point every STEP px
{
    const lines = await sharp({ create: { width: 2160, height: 2160, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
        .composite([12, 15].map((n) => ({ input: file(n) }))).raw().toBuffer();
    const W = 2160, H = 2160;
    const [bx, by, bw, bh] = boxOf(lines, W, H);
    const inBox = (x, y) => x >= bx && x < bx + bw && y >= by && y < by + bh;
    const line = (i) => lines[i * 4 + 3] >= 60;
    const outside = new Uint8Array(W * H);
    const stack = [];
    for (let x = bx; x < bx + bw; x++) stack.push(by * W + x, (by + bh - 1) * W + x);
    for (let y = by; y < by + bh; y++) stack.push(y * W + bx, y * W + bx + bw - 1);
    while (stack.length) {
        const i = stack.pop();
        if (outside[i] || line(i)) continue;
        outside[i] = 1;
        const x = i % W, y = (i - x) / W;
        for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) if (inBox(nx, ny)) stack.push(ny * W + nx);
    }
    // The body: inside the box, neither outside nor line; the biggest piece of it (the arm closes a small one)
    const body = new Uint8Array(W * H);
    for (let y = by; y < by + bh; y++) for (let x = bx; x < bx + bw; x++) { const i = y * W + x; if (!outside[i] && !line(i)) body[i] = 1; }
    const pieces = [];
    const seen = new Uint8Array(W * H);
    for (let y = by; y < by + bh; y++) {
        for (let x = bx; x < bx + bw; x++) {
            const s = y * W + x;
            if (!body[s] || seen[s]) continue;
            const piece = [];
            stack.push(s);
            seen[s] = 1;
            while (stack.length) {
                const i = stack.pop();
                piece.push(i);
                const px = i % W, py = (i - px) / W;
                for (const [nx, ny] of [[px - 1, py], [px + 1, py], [px, py - 1], [px, py + 1]]) {
                    const j = ny * W + nx;
                    if (inBox(nx, ny) && body[j] && !seen[j]) { seen[j] = 1; stack.push(j); }
                }
            }
            pieces.push(piece);
        }
    }
    pieces.sort((a, b) => b.length - a.length);
    // Grown 3 px, under the line, so the fill meets it with no gap
    const fill = grown(pieces[0], W, H, 3);
    // Moore neighbour tracing of its edge, from its topmost pixel
    const at = (x, y) => x >= 0 && y >= 0 && x < W && y < H && fill[y * W + x];
    let start = pieces[0].reduce((a, b) => (b < a ? b : a));
    while (start - W >= 0 && fill[start - W]) start -= W;
    const DIRS = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
    let x = start % W, y = (start - x) / W, d = 6;
    const edge = [];
    do {
        edge.push([x, y]);
        let k = 0;
        for (; k < 8; k++) {
            const dir = (d + 6 + k) % 8;
            if (at(x + DIRS[dir][0], y + DIRS[dir][1])) { x += DIRS[dir][0]; y += DIRS[dir][1]; d = dir; break; }
        }
        if (k === 8 || edge.length > 40000) break;
    } while (x !== start % W || y !== (start - start % W) / W);
    const STEP = 6;
    scene.sid = edge.filter((_, i) => i % STEP === 0);
    console.log('Sid: body', pieces[0].length, 'px, edge', edge.length, 'px ->', scene.sid.length, 'points');
}

// Where the card draws the rulito, over the lookout
{
    const { data, info } = await load(18);
    scene.rulito = boxOf(data, info.width, info.height);
}

await writeFile(path.join(root, 'src', 'composables', 'saccaScene.json'), JSON.stringify(scene));
console.log(Object.keys(scene.boxes).length, 'pictures;', scene.clouds.length, 'clouds in a', `${ATLAS_W}x${ATLAS_H}`, 'atlas;',
    Object.entries(scene.dots).map(([k, v]) => `${k} ${v.length} dots`).join(', '), ';', scene.colors.length, 'colours');
