// The mark of the silence card (" ... ", 10) as numbers, so the scene draws it in code instead of showing the picture:
// public/cards/10.webp is the cream with only the little Algo Particular mark in the middle, a cross and four dots, a shade
// darker than the paper. Writes src/composables/silencioScene.json, in px of the 2160 square:
//   paper, ink  the colour of the paper and of the mark (0xRRGGBB)
//   box         [left, top, width, height] of the whole mark, and centre [x, y] its middle
//   strokes     the two strokes of the cross, each a line of samples [x, y, width] along its middle (drawn with round ends)
//   dots        the four dots, each [x, y, rx, ry, angle (deg)]: the ellipse with the same area and moments
// Usage: node scripts/convert-silencio.mjs
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'public', 'cards', '10.webp');
const target = path.join(root, 'src', 'composables', 'silencioScene.json');

const { data, info } = await sharp(source).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const S = info.width;
const C = info.channels;
const at = (x, y) => (y * S + x) * C;
const hex = ([r, g, b]) => (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
const median = (list) => { const s = [...list].sort((a, b) => a - b); return s[Math.floor(s.length / 2)] ?? 0; };
const round = (v) => Math.round(v * 10) / 10;

// The paper: the median colour of the card's border
const border = [[], [], []];
for (let i = 0; i < S; i += 4) {
    [[i, 8], [i, S - 9], [8, i], [S - 9, i]].forEach(([x, y]) => { for (let c = 0; c < 3; c++) border[c].push(data[at(x, y) + c]); });
}
const paper = border.map(median);

// How much darker than the paper each pixel is; the mark is what is more than half as dark as its darkest
const dark = new Float32Array(S * S);
let darkest = 0;
for (let i = 0; i < S * S; i++) {
    const d = (paper[0] - data[i * C]) + (paper[1] - data[i * C + 1]) + (paper[2] - data[i * C + 2]);
    dark[i] = d;
    if (d > darkest) darkest = d;
}
const mask = new Uint8Array(S * S);
for (let i = 0; i < S * S; i++) mask[i] = dark[i] > darkest * 0.5 ? 1 : 0;

// The ink: the median colour of the mark's solid middle
const solid = [[], [], []];
for (let i = 0; i < S * S; i++) if (dark[i] > darkest * 0.8) for (let c = 0; c < 3; c++) solid[c].push(data[i * C + c]);
const ink = solid.map(median);

// Connected pieces of the mark (4-neighbours): the biggest is the cross, the next four the dots
const label = new Int32Array(S * S).fill(-1);
const pieces = [];
for (let start = 0; start < S * S; start++) {
    if (!mask[start] || label[start] >= 0) continue;
    const id = pieces.length;
    const stack = [start];
    const pixels = [];
    label[start] = id;
    while (stack.length) {
        const p = stack.pop();
        pixels.push(p);
        const x = p % S, y = (p - x) / S;
        [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]].forEach(([nx, ny]) => {
            if (nx < 0 || ny < 0 || nx >= S || ny >= S) return;
            const n = ny * S + nx;
            if (mask[n] && label[n] < 0) { label[n] = id; stack.push(n); }
        });
    }
    pieces.push(pixels);
}
pieces.sort((a, b) => b.length - a.length);
const [cross, ...rest] = pieces;
const dotPieces = rest.filter((p) => p.length > 60).slice(0, 4);
if (!cross || dotPieces.length !== 4) throw new Error(`Expected a cross and four dots, found ${pieces.length} pieces`);

// ---- The dots: the ellipse with the same area, centre and second moments
const dots = dotPieces.map((pixels) => {
    let mx = 0, my = 0;
    pixels.forEach((p) => { mx += p % S; my += Math.floor(p / S); });
    mx /= pixels.length; my /= pixels.length;
    let xx = 0, yy = 0, xy = 0;
    pixels.forEach((p) => { const dx = p % S - mx, dy = Math.floor(p / S) - my; xx += dx * dx; yy += dy * dy; xy += dx * dy; });
    xx /= pixels.length; yy /= pixels.length; xy /= pixels.length;
    const common = (xx + yy) / 2, diff = Math.sqrt(((xx - yy) / 2) ** 2 + xy * xy);
    const angle = 0.5 * Math.atan2(2 * xy, xx - yy) * 180 / Math.PI;
    return [round(mx + 0.5), round(my + 0.5), round(2 * Math.sqrt(common + diff)), round(2 * Math.sqrt(Math.max(0, common - diff))), round(angle)];
}).sort((a, b) => (a[1] > 1080) - (b[1] > 1080) || a[0] - b[0]);

// ---- The cross: where its vertical stroke stands (the columns most filled) and its horizontal one lies (the rows)
const xs = cross.map((p) => p % S), ys = cross.map((p) => Math.floor(p / S));
const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
const inCross = new Uint8Array(S * S);
cross.forEach((p) => { inCross[p] = 1; });
const cols = [], rows = [];
for (let x = x0; x <= x1; x++) { let n = 0; for (let y = y0; y <= y1; y++) n += inCross[y * S + x]; cols.push(n); }
for (let y = y0; y <= y1; y++) { let n = 0; for (let x = x0; x <= x1; x++) n += inCross[y * S + x]; rows.push(n); }
const band = (counts, from) => {
    const top = Math.max(...counts);
    const idx = counts.map((n, i) => (n > top * 0.5 ? i : -1)).filter((i) => i >= 0);
    return [from + Math.min(...idx), from + Math.max(...idx)];
};
const [vx0, vx1] = band(cols, x0);
const [hy0, hy1] = band(rows, y0);
const PAD = 6;

// A stroke followed along its length: at each step across, the middle and the width of the ink on that line, outside
// where the other stroke crosses it; then the ends are pulled in by half a width (they are drawn with round caps)
const follow = (along, across, inside, skip) => {
    const samples = [];
    for (let a = along[0]; a <= along[1]; a++) {
        if (a >= skip[0] - PAD && a <= skip[1] + PAD) continue;
        const hits = [];
        for (let c = across[0] - 3 * PAD; c <= across[1] + 3 * PAD; c++) if (inside(a, c)) hits.push(c);
        if (hits.length < 3) continue;
        samples.push([a, (Math.min(...hits) + Math.max(...hits) + 1) / 2, Math.max(...hits) - Math.min(...hits) + 1]);
    }
    const w = median(samples.map((s) => s[2]));
    const first = samples[0][0], last = samples[samples.length - 1][0];
    const kept = samples.filter(([a]) => a - first >= w / 2 && last - a >= w / 2);
    // A sample every 8 px, each the average of its neighbourhood (the brush is steady; the pixels are not)
    const STEP = 8;
    const out = [];
    for (let i = 0; i < kept.length; i += STEP) {
        const near = kept.filter(([a]) => Math.abs(a - kept[i][0]) <= STEP);
        out.push([kept[i][0], near.reduce((s, n) => s + n[1], 0) / near.length, near.reduce((s, n) => s + n[2], 0) / near.length]);
    }
    const end = kept[kept.length - 1];
    if (out[out.length - 1][0] !== end[0]) out.push(end);
    return out;
};
const vertical = follow([y0, y1], [vx0, vx1], (y, x) => inCross[y * S + x], [hy0, hy1]).map(([y, x, w]) => [round(x), round(y), round(w)]);
const horizontal = follow([x0, x1], [hy0, hy1], (x, y) => inCross[y * S + x], [vx0, vx1]).map(([x, y, w]) => [round(x), round(y), round(w)]);

// The whole mark
const all = [...cross, ...dotPieces.flat()];
const ax = all.map((p) => p % S), ay = all.map((p) => Math.floor(p / S));
const box = [Math.min(...ax), Math.min(...ay), Math.max(...ax) - Math.min(...ax) + 1, Math.max(...ay) - Math.min(...ay) + 1];

const scene = {
    size: S,
    paper: hex(paper),
    ink: hex(ink),
    box,
    centre: [round(box[0] + box[2] / 2), round(box[1] + box[3] / 2)],
    strokes: [vertical, horizontal],
    dots,
};
await writeFile(target, `${JSON.stringify(scene)}\n`);
console.log(`paper #${scene.paper.toString(16)}, ink #${scene.ink.toString(16)}, box ${box.join(' ')}, strokes ${vertical.length} + ${horizontal.length} samples, dots ${dots.map((d) => d.slice(0, 3).join('/')).join(' ')}`);
