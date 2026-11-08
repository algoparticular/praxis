// The tree and its plants for the puppet lab's world (/lab/sid): originales/arbol/Ilustración_sin_título-N.png (3240 x
// 4050, black line on an opaque white ground, each piece on its own layer) -> src/lab/arbol/NAME.webp (the line: the
// ink as transparency, so the lab can tint it) and NAME-fill.webp (what is inside the line, white over transparent, so
// the lab can paint it in code: a cream at first, a colour of Ciclos once it is coloured), and src/lab/arbol/arbol.json:
// the box of every piece in the 3240 x 4050 drawing (scaled by SCALE), so the lab can set the tree down as she drew it,
// and spread the small plants and stones over the world.
// What is inside: the white that cannot be reached from outside the piece without crossing its line (the line a little
// thickened first, so small gaps in it do not let the outside in), except for the trunk, whose top is open (it goes
// into the crown: the top of its box counts as line) and the crown, round and with gaps under it, filled row by row
// between its outermost lines. Bits of white too small to be a shape (between the strokes of a fern) stay empty.
// The originals are not kept in the repo once converted (they are in its history, commit 520b737: git checkout 520b737
// -- originales/arbol).
// Usage: node scripts/convert-lab-arbol.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'originales', 'arbol');
const target = path.join(root, 'src', 'lab', 'arbol');
const SCALE = 0.4;            // the drawing at 1296 x 1620 (the tree is about 1560 px tall, a little over two Sids)
const GAP = 2;                // px (scaled) the line is thickened by before finding what is inside
const SMALLEST = 40;          // px (scaled) of white inside, below which it is not a shape (a gap between strokes)

// Each layer, what it is and how its inside is found
const PIECES = [
    { n: 5, name: 'crown', inside: 'rows' },
    { n: 6, name: 'trunk', inside: 'open-top' },
    { n: 7, name: 'bark', inside: 'none' },
    { n: 2, name: 'sprout', inside: 'closed' },
    { n: 3, name: 'fern', inside: 'none' },
    { n: 4, name: 'fernSmall', inside: 'none' },
    { n: 8, name: 'fernLow', inside: 'none' },
    { n: 9, name: 'pebble', inside: 'closed' },
    { n: 10, name: 'pebbles', inside: 'closed' },
    { n: 11, name: 'pebbleGrass', inside: 'closed' },
    { n: 12, name: 'pebbleFlat', inside: 'closed' },
    { n: 13, name: 'cairn', inside: 'closed' },
];

await mkdir(target, { recursive: true });
const art = { size: [Math.round(3240 * SCALE), Math.round(4050 * SCALE)], scale: SCALE, pieces: {} };

for (const piece of PIECES) {
    const file = path.join(source, `Ilustración_sin_título-${piece.n}.png`);
    const { data, info } = await sharp(file).resize(Math.round(3240 * SCALE)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const W = info.width, H = info.height, N = W * H;
    // the ink: how dark each pixel is
    const ink = new Float32Array(N);
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let i = 0; i < N; i++) {
        const l = (data[i * 3] + data[i * 3 + 1] + data[i * 3 + 2]) / 3;
        ink[i] = Math.max(0, Math.min(1, (235 - l) / 200));
        if (ink[i] > 0.05) { const x = i % W, y = (i / W) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    }
    const PAD = 4;
    x0 = Math.max(0, x0 - PAD); y0 = Math.max(0, y0 - PAD); x1 = Math.min(W - 1, x1 + PAD); y1 = Math.min(H - 1, y1 + PAD);
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
    const at = (x, y) => (y + y0) * W + (x + x0);

    // what is inside
    const fill = new Uint8Array(bw * bh);
    const wall = new Uint8Array(bw * bh);
    for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) if (ink[at(x, y)] > 0.35) {
        for (let dy = -GAP; dy <= GAP; dy++) for (let dx = -GAP; dx <= GAP; dx++) {
            const X = x + dx, Y = y + dy;
            if (X >= 0 && Y >= 0 && X < bw && Y < bh && dx * dx + dy * dy <= GAP * GAP) wall[Y * bw + X] = 1;
        }
    }
    if (piece.inside === 'rows') {
        for (let y = 0; y < bh; y++) {
            let a = -1, b = -1;
            for (let x = 0; x < bw; x++) if (ink[at(x, y)] > 0.5) { if (a < 0) a = x; b = x; }   // (the line itself, not thickened)
            for (let x = a; a >= 0 && x <= b; x++) fill[y * bw + x] = 1;
        }
    } else if (piece.inside !== 'none') {
        // flood from the edges of the box (not its top, for the trunk) through what is not line: that is outside
        const out = new Uint8Array(bw * bh), stack = [];
        const seed = (x, y) => { const i = y * bw + x; if (!wall[i] && !out[i]) { out[i] = 1; stack.push(i); } };
        for (let x = 0; x < bw; x++) { if (piece.inside !== 'open-top') seed(x, 0); seed(x, bh - 1); }
        for (let y = 0; y < bh; y++) { seed(0, y); seed(bw - 1, y); }
        while (stack.length) {
            const i = stack.pop(), x = i % bw, y = (i / bw) | 0;
            for (const [X, Y] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
                if (X < 0 || Y < 0 || X >= bw || Y >= bh) continue;
                const j = Y * bw + X;
                if (!wall[j] && !out[j]) { out[j] = 1; stack.push(j); }
            }
        }
        for (let i = 0; i < bw * bh; i++) fill[i] = !out[i] ? 1 : 0;
        // shapes too small to be one go
        const seen = new Uint8Array(bw * bh);
        for (let s = 0; s < bw * bh; s++) {
            if (!fill[s] || wall[s] || seen[s]) continue;
            const part = [s]; seen[s] = 1;
            for (let k = 0; k < part.length; k++) {
                const i = part[k], x = i % bw, y = (i / bw) | 0;
                for (const [X, Y] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
                    if (X < 0 || Y < 0 || X >= bw || Y >= bh) continue;
                    const j = Y * bw + X;
                    if (fill[j] && !wall[j] && !seen[j]) { seen[j] = 1; part.push(j); }
                }
            }
            if (part.length < SMALLEST) for (const i of part) fill[i] = 0;
        }
        // the line itself is only filled where it borders a shape (so no fill shows past the line on the outside)
        for (let i = 0; i < bw * bh; i++) if (wall[i]) {
            const x = i % bw, y = (i / bw) | 0;
            let near = false;
            for (let dy = -GAP - 1; dy <= GAP + 1 && !near; dy++) for (let dx = -GAP - 1; dx <= GAP + 1 && !near; dx++) {
                const X = x + dx, Y = y + dy;
                if (X >= 0 && Y >= 0 && X < bw && Y < bh && fill[Y * bw + X] && !wall[Y * bw + X]) near = true;
            }
            fill[i] = near && ink[at(x, y)] > 0.2 ? 1 : 0;           // only the line's own pixels, never past it
        }
    }

    const line = Buffer.alloc(bw * bh * 4), inside = Buffer.alloc(bw * bh * 4);
    let filled = 0;
    for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
        const i = y * bw + x;
        line[i * 4 + 3] = Math.round(ink[at(x, y)] * 255);
        if (fill[i]) { inside[i * 4] = inside[i * 4 + 1] = inside[i * 4 + 2] = inside[i * 4 + 3] = 255; filled++; }
    }
    await sharp(line, { raw: { width: bw, height: bh, channels: 4 } }).webp({ quality: 90, alphaQuality: 90 }).toFile(path.join(target, `${piece.name}.webp`));
    if (filled) await sharp(inside, { raw: { width: bw, height: bh, channels: 4 } }).webp({ quality: 60, alphaQuality: 80 }).toFile(path.join(target, `${piece.name}-fill.webp`));
    art.pieces[piece.name] = { box: [x0, y0, bw, bh], fill: filled > 0 };
    console.log(piece.name, [x0, y0, bw, bh].join(' '), filled ? `${filled} px filled` : 'no fill');
}

await writeFile(path.join(target, 'arbol.json'), JSON.stringify(art, null, 1) + '\n');
