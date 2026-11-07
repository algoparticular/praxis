// Ciclos's hills, all the same way round: in the drawing the green hills have their colour on top and the yellow
// below, the tan ones the yellow on top and the tan below. The scene wants every hill as the tan ones (dry, the tan
// below a yellow top; the tan turns green as the day pours, the land's `turn` in SceneCiclos), so in every region
// between the dark lines that holds green this swaps its colours: the green becomes the yellow and the yellow the tan
// (only where the green is nearer than the tan, when a region holds both).
// It is one affine map of the colours (green -> yellow, yellow -> tan, the line's dark and the rocks' white kept), so
// the soft edges between them stay soft; the px of a line go with what is nearest to them. Run after
// scripts/convert-ciclos.mjs (it writes land0..land3 again in place; run twice it changes nothing: no green is left).
// Usage: node scripts/swap-ciclos-hills.mjs
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'public', 'assets', 'ciclos');
const GREEN = [99, 166, 121], YELLOW = [254, 217, 136], TAN = [196, 168, 114], DARK = [49, 46, 9], WHITE = [255, 255, 255];

// The affine map sending each colour of `from` to the same one of `to` (four points: solved as a 4x4 system per channel)
const solve = (A, b) => {
    const n = A.length, m = A.map((row, i) => [...row, b[i]]);
    for (let c = 0; c < n; c++) {
        let p = c;
        for (let r = c + 1; r < n; r++) if (Math.abs(m[r][c]) > Math.abs(m[p][c])) p = r;
        [m[c], m[p]] = [m[p], m[c]];
        for (let r = 0; r < n; r++) {
            if (r === c) continue;
            const f = m[r][c] / m[c][c];
            for (let k = c; k <= n; k++) m[r][k] -= f * m[c][k];
        }
    }
    return m.map((row, i) => row[n] / row[i]);
};
const from = [GREEN, YELLOW, DARK, WHITE], to = [YELLOW, TAN, DARK, WHITE];
const A = from.map(([r, g, b]) => [r, g, b, 1]);
const map = [0, 1, 2].map((ch) => solve(A, to.map((c) => c[ch])));
const swap = (r, g, b) => map.map(([x, y, z, w]) => Math.max(0, Math.min(255, Math.round(x * r + y * g + z * b + w))));
const near = (data, i, c, d) => Math.abs(data[i] - c[0]) + Math.abs(data[i + 1] - c[1]) + Math.abs(data[i + 2] - c[2]) < d;

for (let p = 0; p < 4; p++) {
    const file = path.join(dir, `land${p}.webp`);
    const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const { width: w, height: h } = info, n = w * h;
    // The regions between the lines: opaque px that are not (mostly) the line's dark. Two hills can meet with no line
    // between them (under the crests, where the converter filled what the plane in front hides), so a px is not given
    // to its region but to the hill colour nearest to it inside it: the green and the tan grow out together over the
    // fill (a breadth-first walk from both), and what the green reaches first is of a green hill
    const fill = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
        const o = i * 4, lum = 0.3 * data[o] + 0.59 * data[o + 1] + 0.11 * data[o + 2];
        fill[i] = data[o + 3] > 200 && lum > 110 ? 1 : 0;
    }
    const owner = new Int8Array(n).fill(-1);        // 1 a green hill's, 0 a tan one's
    const queue = new Int32Array(n);
    let head = 0, tail = 0;
    for (let i = 0; i < n; i++) {
        if (!fill[i]) continue;
        if (near(data, i * 4, GREEN, 40)) { owner[i] = 1; queue[tail++] = i; }
        else if (near(data, i * 4, TAN, 30)) { owner[i] = 0; queue[tail++] = i; }
    }
    const walk = (open) => {
        while (head < tail) {
            const i = queue[head++], x = i % w;
            for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) {
                if (j < 0 || j >= n || owner[j] >= 0 || !open(j)) continue;
                owner[j] = owner[i];
                queue[tail++] = j;
            }
        }
    };
    walk((j) => fill[j]);
    // and every other px (the lines and their soft edges) goes with the nearest one
    head = 0; tail = 0;
    for (let i = 0; i < n; i++) if (owner[i] >= 0) queue[tail++] = i;
    walk((j) => data[j * 4 + 3] > 0);
    let swapped = 0;
    for (let i = 0; i < n; i++) {
        if (owner[i] !== 1) continue;
        const o = i * 4;
        [data[o], data[o + 1], data[o + 2]] = swap(data[o], data[o + 1], data[o + 2]);
        swapped++;
    }
    console.log(`land${p}: ${swapped} px swapped`);
    await sharp(data, { raw: { width: w, height: h, channels: 4 } }).webp({ quality: 88, alphaQuality: 90, effort: 6 }).toFile(file + '.tmp');
    const { rename } = await import('node:fs/promises');
    await rename(file + '.tmp', file);
}
