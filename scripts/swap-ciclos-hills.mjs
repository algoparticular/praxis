// Ciclos's hills, dry and by day. In the drawing the green hills have their colour on top and the yellow below, the
// tan ones the yellow on top and the tan below. When a cycle begins every hill is dry and the same way round, as the
// tan ones; by day they are as in the drawing with the tan turned green. So from each landN.webp of the converter this
// writes landN-day.webp (the drawing, its tan green) and landN.webp again, dry: in every region
// between the dark lines that holds green this swaps its colours: the green becomes the yellow and the yellow the tan
// (only where the green is nearer than the tan, when a region holds both).
// Each px moves by what it holds of each colour (green -> yellow, yellow -> tan, the line's dark and the rocks' white
// kept), so the soft edges between them stay soft; the px of a line go with what is nearest to them. Run after
// scripts/convert-ciclos.mjs, once (it writes land0..land3 again in place: run on dry hills, with no green, it stops).
// The scene goes from one to the other along a front as the day pours (the land's `turn` in SceneCiclos).
// Usage: node scripts/swap-ciclos-hills.mjs
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'public', 'assets', 'ciclos');
const GREEN = [99, 166, 121], YELLOW = [254, 217, 136], TAN = [196, 168, 114], DARK = [49, 46, 9], WHITE = [255, 255, 255];

// How much of each colour of the hills a px holds: a px of one of them, a soft mix of two (between two areas), or of
// one and the line's dark or a rock's white (the soft edge of a line), as the point on the segment between them nearest
// to its colour; the mixes with the dark or the white only next to the colour itself (`pure`, within 2 px), since the
// little mushrooms are of the same browns as a tan blurred into a line and must keep theirs. A px then moves by what it
// holds of each (no stretching of the colours: a speck of noise stays a speck)
const FIXED = [DARK, WHITE];
const weights = (src, r, g, b, pure) => {
    let best = null, bestD = 12;
    const points = [...src.map((c, i) => [c, i]), ...FIXED.map((c) => [c, -1])];
    for (let a = 0; a < points.length; a++) {
        for (let z = a; z < points.length; z++) {
            const [A, ia] = points[a], [B, ib] = points[z];
            if (ia < 0 && ib < 0) continue;
            if ((ia < 0 || ib < 0) && !pure) continue;
            const d = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], q = [r - A[0], g - A[1], b - A[2]];
            const len = d[0] * d[0] + d[1] * d[1] + d[2] * d[2];
            const t = len ? Math.max(0, Math.min(1, (q[0] * d[0] + q[1] * d[1] + q[2] * d[2]) / len)) : 0;
            const dist = Math.hypot(q[0] - t * d[0], q[1] - t * d[1], q[2] - t * d[2]);
            const room = ia >= 0 && ib >= 0 ? 2 : 1;      // a mix of two hill colours is never a mushroom: more room
            if (dist / room < bestD) { bestD = dist / room; best = [ia, 1 - t, ib, t]; }
        }
    }
    return best;
};
const shift = (src, dst) => (r, g, b, pure) => {
    const w = weights(src, r, g, b, pure);
    if (!w) return [r, g, b];
    const out = [r, g, b];
    for (const [i, k] of [[w[0], w[1]], [w[2], w[3]]]) {
        if (i < 0) continue;
        for (let ch = 0; ch < 3; ch++) out[ch] += k * (dst[i][ch] - src[i][ch]);
    }
    return out.map((v) => Math.max(0, Math.min(255, Math.round(v))));
};
const swap = shift([GREEN, YELLOW], [YELLOW, TAN]);
// By day the tan is green (the yellow, the line's dark and the white kept)
const ripen = shift([TAN], [GREEN]);
// The px within 2 of one of these colours
const pureNear = (data, w, h, colours) => {
    const n = w * h, out = new Uint8Array(n);
    for (let i = 0; i < n; i++) if (colours.some((c) => near(data, i * 4, c, 30))) out[i] = 1;
    for (let pass = 0; pass < 2; pass++) {
        const was = out.slice();
        for (let i = 0; i < n; i++) {
            if (was[i]) continue;
            const x = i % w;
            if ((x > 0 && was[i - 1]) || (x < w - 1 && was[i + 1]) || (i >= w && was[i - w]) || (i + w < n && was[i + w])) out[i] = 1;
        }
    }
    return out;
};
const encode = (data, w, h) => sharp(data, { raw: { width: w, height: h, channels: 4 } }).webp({ quality: 84, alphaQuality: 90, effort: 6, smartSubsample: true });
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
    // By day: the drawing, its tan (of the tan hills) green
    if (p > 0 && !owner.includes(1)) throw new Error(`land${p} has no green hill: it is dry already (run the converter first)`);
    const day = Buffer.from(data);
    const tanNear = pureNear(data, w, h, [TAN]);
    for (let i = 0; i < n; i++) {
        if (owner[i] !== 0) continue;
        const o = i * 4;
        [day[o], day[o + 1], day[o + 2]] = ripen(day[o], day[o + 1], day[o + 2], tanNear[i]);
    }
    await encode(day, w, h).toFile(path.join(dir, `land${p}-day.webp`));
    let swapped = 0;
    const hillNear = pureNear(data, w, h, [GREEN, YELLOW]);
    for (let i = 0; i < n; i++) {
        if (owner[i] !== 1) continue;
        const o = i * 4;
        [data[o], data[o + 1], data[o + 2]] = swap(data[o], data[o + 1], data[o + 2], hillNear[i]);
        swapped++;
    }
    console.log(`land${p}: ${swapped} px swapped`);
    await encode(data, w, h).toFile(file + '.tmp');
    const { rename } = await import('node:fs/promises');
    await rename(file + '.tmp', file);
}
