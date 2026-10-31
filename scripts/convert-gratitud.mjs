// The layers of Gratitud as exported (originales/gratitud/Isla_1-N.png, 2411px, scaled here to the 2160 square) ->
// public/assets/gratitud/*.webp, each cropped to its own box, and src/composables/gratitudScene.json, all in px of the
// 2160 square:
//   boxes      the box of every picture
//   sea        the colour of the sky and the sea: in no layer (the card's flat background), read from the card's corners
//              and drawn in code
//   sun        the sun is not a picture: two discs (the peach light, 1, and the pink middle, 2), each the biggest circle
//              inside its solid middle ([x, y, r]) with its colour, and every dot of its stippled edge as [x, y, radius]
//              (the ragged rim filled with dots too), so it can be alive
//   beacon     the yellow light over the palm (27), a disc and its stipple the same way; `light` is the small ring on a
//              stem (cut out of the palm's lines, 28) that it shines round
//   sand       the stipple of the beach (the small dots of 20 on and round the sand), as dots
//   sparkle    the loose dots round the pale plant by the house (25), as dots
//   clouds     the cream squiggles (3), each cut out into one atlas (clouds.webp) so they can drift
//   waves      the little waves (blue, 9, under their black line, 10), each cut out into one atlas (waves.webp) so each
//              can bob on its own and the sea can go on past the frame
//   eyes, pale Sid's two eyes ([x, y, r]) and the colour of his body, to close them in code (a blink)
//   pictures   hills (4-8: the far islands), island (16-22: the ground, sand, shadows, stones, grass, dock), house (23,
//              24), plant (25 without its dots, 26), palm (28 without the light), light (the ring of 28), sid (29, 30),
//              boat (11-15)
// The shadows (18) and the boat's shading (12) were exported without their layer opacity: it is put back (SHADE, measured
// against the card). Not converted: 1, 2 and 27 (drawn in code with their dots as particles), the dots of 20 and 25
// (particles). There is no rulito layer and no signature in this card.
// The originals are not kept in the repo once converted. Usage: node scripts/convert-gratitud.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'originales', 'gratitud');
const target = path.join(root, 'public', 'assets', 'gratitud');
const file = (n) => path.join(source, `Isla_1-${n}.png`);
const S = 2160;
const SHADE = 0.375;        // the opacity the shadows (18) and the boat's shading (12) had in the card
const PAD = 4;
const SOLID = 110;

const webp = (img) => img.webp({ quality: 88, alphaQuality: 100, effort: 5 });
const hex = (r, g, b) => (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);

// Every layer once, scaled to the 2160 square (raw RGBA), with the lost opacity of the shading put back
const layers = {};
for (let n = 1; n <= 30; n++) {
    const data = await sharp(file(n)).resize(S, S, { kernel: 'lanczos3' }).ensureAlpha().raw().toBuffer();
    if (n === 18 || n === 12) for (let i = 3; i < data.length; i += 4) data[i] = Math.round(data[i] * SHADE);
    layers[n] = data;
}
const rawOf = (n) => layers[n];
// Normal "over" compositing of raw RGBA layers (straight alpha), in order
const over = (list) => {
    const out = new Float32Array(S * S * 4);
    for (const data of list) {
        for (let i = 0; i < S * S; i++) {
            const a = data[i * 4 + 3] / 255;
            if (!a) continue;
            const b = out[i * 4 + 3];
            const o = a + b * (1 - a);
            for (let c = 0; c < 3; c++) out[i * 4 + c] = (data[i * 4 + c] * a + out[i * 4 + c] * b * (1 - a)) / o;
            out[i * 4 + 3] = o;
        }
    }
    const buf = Buffer.alloc(S * S * 4);
    for (let i = 0; i < S * S; i++) {
        for (let c = 0; c < 3; c++) buf[i * 4 + c] = Math.round(out[i * 4 + c]);
        buf[i * 4 + 3] = Math.round(out[i * 4 + 3] * 255);
    }
    return buf;
};
const without = (data, drop) => {
    const out = Buffer.from(data);
    for (let i = 0; i < S * S; i++) if (drop(i)) out[i * 4 + 3] = 0;
    return out;
};
const only = (data, keep) => without(data, (i) => !keep(i));

const boxOf = (data, keep = () => true) => {
    let x0 = S, y0 = S, x1 = -1, y1 = -1;
    for (let y = 0; y < S; y++) {
        for (let x = 0; x < S; x++) {
            const i = y * S + x;
            if (data[i * 4 + 3] < 4 || !keep(i)) continue;
            if (x < x0) x0 = x;
            if (x > x1) x1 = x;
            if (y < y0) y0 = y;
            if (y > y1) y1 = y;
        }
    }
    x0 = Math.max(0, x0 - PAD); y0 = Math.max(0, y0 - PAD);
    x1 = Math.min(S - 1, x1 + PAD); y1 = Math.min(S - 1, y1 + PAD);
    return [x0, y0, x1 - x0 + 1, y1 - y0 + 1];
};

// Every blob of pixels at least `solid` opaque (that `keep` lets in): its pixels, area and centre
const blobsOf = (data, keep = () => true, solid = SOLID) => {
    const seen = new Uint8Array(S * S);
    const blobs = [];
    const stack = [];
    const ok = (i) => data[i * 4 + 3] >= solid && keep(i);
    for (let start = 0; start < S * S; start++) {
        if (seen[start] || !ok(start)) continue;
        const pixels = [];
        let sx = 0, sy = 0;
        stack.push(start);
        seen[start] = 1;
        while (stack.length) {
            const i = stack.pop();
            const x = i % S, y = (i - x) / S;
            pixels.push(i);
            sx += x; sy += y;
            for (const j of [x > 0 ? i - 1 : -1, x < S - 1 ? i + 1 : -1, y > 0 ? i - S : -1, y < S - 1 ? i + S : -1]) {
                if (j < 0 || seen[j] || !ok(j)) continue;
                seen[j] = 1;
                stack.push(j);
            }
        }
        blobs.push({ pixels, area: pixels.length, x: sx / pixels.length, y: sy / pixels.length });
    }
    return blobs.sort((a, b) => b.area - a.area);
};
const dotOf = (b) => [Math.round(b.x), Math.round(b.y), +Math.sqrt(b.area / Math.PI).toFixed(1)];

// Pieces of a layer: what is nearer than `join` px belongs together
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
    return [...out.values()].map((piece) => {
        let x0 = S, y0 = S, x1 = 0, y1 = 0;
        piece.forEach((b, k) => { const [a0, b0, a1, b1] = boxes[blobs.indexOf(b)]; x0 = Math.min(x0, a0); y0 = Math.min(y0, b0); x1 = Math.max(x1, a1); y1 = Math.max(y1, b1); void k; });
        return { blobs: piece, box: [x0, y0, x1, y1] };
    });
};

const save = async (name, data, box = boxOf(data)) => {
    await webp(sharp(data, { raw: { width: S, height: S, channels: 4 } }).extract({ left: box[0], top: box[1], width: box[2], height: box[3] }))
        .toFile(path.join(target, `${name}.webp`));
    scene.boxes[name] = box;
};

await mkdir(target, { recursive: true });
const scene = { size: S, boxes: {}, sea: 0, sun: [], beacon: null, sand: [], sparkle: [], clouds: [], cloudAtlas: [0, 0], waves: [], waveAtlas: [0, 0] };

// The sea and the sky: the card's own background (the corners and the middle of its left edge)
{
    const { data, info } = await sharp(path.join(root, 'public', 'cards', '24.webp')).raw().toBuffer({ resolveWithObject: true });
    const at = [[8, 8], [info.width - 8, 8], [8, info.height - 8], [info.width - 8, info.height - 8], [8, info.height >> 1]];
    const sum = [0, 0, 0];
    at.forEach(([x, y]) => { for (let c = 0; c < 3; c++) sum[c] += data[(y * info.width + x) * info.channels + c]; });
    scene.sea = hex(...sum.map((v) => v / at.length));
}

// A stippled disc (the sun's two, the beacon): the biggest circle inside its solid middle, and dots for all round it
const stippled = (data) => {
    const [main, ...rest] = blobsOf(data);
    const inMain = new Uint8Array(S * S);
    main.pixels.forEach((i) => { inMain[i] = 1; });
    const cx = main.x, cy = main.y;
    let r = 4;
    for (; r < 600; r += 2) {
        let inside = 0, all = 0;
        for (let a = 0; a < 360; a += 3) {
            const x = Math.round(cx + Math.cos(a * Math.PI / 180) * r), y = Math.round(cy + Math.sin(a * Math.PI / 180) * r);
            all++;
            if (inMain[y * S + x]) inside++;
        }
        if (inside / all < 0.97) break;
    }
    const R = Math.max(2, r - 6);
    // The colour of the solid middle
    const sum = [0, 0, 0];
    main.pixels.forEach((i) => { for (let c = 0; c < 3; c++) sum[c] += data[i * 4 + c]; });
    const color = hex(...sum.map((v) => v / main.area));
    const dots = rest.filter((b) => b.area >= 2).map(dotOf);
    // The ragged rim of the solid middle, outside the disc, filled with dots
    const FILL = 8;
    const reach = R + 300;
    for (let y = Math.floor(cy - reach); y < cy + reach; y += FILL) {
        for (let x = Math.floor(cx - reach) + ((y / FILL) % 2) * FILL / 2; x < cx + reach; x += FILL) {
            const px = Math.round(x + (Math.random() - 0.5) * FILL * 0.6), py = Math.round(y + (Math.random() - 0.5) * FILL * 0.6);
            if (px < 0 || py < 0 || px >= S || py >= S || !inMain[py * S + px]) continue;
            if (Math.hypot(px - cx, py - cy) < R - 4) continue;
            dots.push([px, py, +(4 + Math.random() * 2).toFixed(1)]);
        }
    }
    return { x: Math.round(cx), y: Math.round(cy), r: R, color, dots };
};
scene.sun = [stippled(rawOf(1)), stippled(rawOf(2))];
scene.beacon = stippled(rawOf(27));

// An atlas of the pieces of a picture, packed in rows: [x, y, w, h where it is drawn, x, y where it is in the atlas]
const atlas = async (name, data, join, minArea) => {
    const ATLAS_W = 1024, GAP = 8;
    const cuts = [];
    for (const { box } of piecesOf(blobsOf(data, () => true, 24).filter((b) => b.area >= minArea), join)) {
        let [x0, y0, x1, y1] = box;
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
        .toFile(path.join(target, `${name}.webp`));
    return { size: [ATLAS_W, ATLAS_H], cuts: cuts.sort((a, b) => a.y - b.y || a.x - b.x).map((c) => [c.x, c.y, c.w, c.h, c.ax, c.ay]) };
};

// The clouds
{
    const { size, cuts } = await atlas('clouds', rawOf(3), 30, 20);
    scene.cloudAtlas = size;
    scene.clouds = cuts;
}

// The island's ground (its fill and the sand), to know what lies under it
const islandBox = boxOf(over([layers[16], layers[17]]));
const inIsland = (x, y) => x >= islandBox[0] && x < islandBox[0] + islandBox[2] && y >= islandBox[1] && y < islandBox[1] + islandBox[3];

// The waves: blue strokes and their black lines, together; what is under the island (a long line round its shore) goes
// with the island
const waves = over([layers[9], layers[10]]);
const shore = new Uint8Array(S * S);
{
    for (const { blobs, box } of piecesOf(blobsOf(waves, () => true, 24), 12)) {
        const [x0, y0, x1, y1] = box;
        if (x1 - x0 > 300 && inIsland((x0 + x1) / 2, (y0 + y1) / 2)) blobs.forEach((b) => b.pixels.forEach((i) => { shore[i] = 1; }));
    }
    // with the soft edge round it
    const grown = new Uint8Array(S * S);
    for (let i = 0; i < S * S; i++) {
        if (!shore[i]) continue;
        for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const j = i + dy * S + dx; if (j >= 0 && j < S * S) grown[j] = 1; }
    }
    shore.set(grown);
    const { size, cuts } = await atlas('waves', without(waves, (i) => shore[i]), 12, 20);
    scene.waveAtlas = size;
    scene.waves = cuts;
}

// The sand's stipple: the small dots of the grass layer (20) on the sand or off the island, on its left
const dotty = new Uint8Array(S * S);
{
    const [sx0, , sw] = boxOf(layers[17]);
    const sandRight = sx0 + sw + 40;
    for (const b of blobsOf(layers[20], () => true, 60)) {
        if (b.area > 90 || b.x > sandRight) continue;
        const i = Math.round(b.y) * S + Math.round(b.x);
        if (layers[16][i * 4 + 3] > 0 && !(layers[17][i * 4 + 3] > 0)) continue;     // a mark on the grass, not sand
        scene.sand.push(dotOf(b));
        b.pixels.forEach((p) => { dotty[p] = 1; });
    }
}
// The plant's loose dots
const loose = new Uint8Array(S * S);
{
    const [, ...rest] = blobsOf(layers[25], () => true, 60);
    for (const b of rest) {
        if (b.area > 60) continue;
        scene.sparkle.push(dotOf(b));
        b.pixels.forEach((p) => { loose[p] = 1; });
    }
}
// Their soft edges go with them
const grow = (mask, n) => {
    const out = new Uint8Array(S * S);
    for (let i = 0; i < S * S; i++) {
        if (!mask[i]) continue;
        for (let dy = -n; dy <= n; dy++) for (let dx = -n; dx <= n; dx++) { const j = i + dy * S + dx; if (j >= 0 && j < S * S) out[j] = 1; }
    }
    return out;
};
const dottyEdge = grow(dotty, 2);
const looseEdge = grow(loose, 2);

// The light over the palm: the ring on its stem, above the leaves (cut out of the palm's lines)
const beacon = scene.beacon;
const LIGHT = [beacon.x - 30, beacon.y - 34, 60, 70];   // x, y, w, h
const inLight = (i) => {
    const x = i % S, y = (i - x) / S;
    return x >= LIGHT[0] && x < LIGHT[0] + LIGHT[2] && y >= LIGHT[1] && y < LIGHT[1] + LIGHT[3];
};

await save('hills', over([4, 5, 6, 7, 8].map(rawOf)));
await save('island', over([only(waves, (i) => shore[i]), layers[16], layers[17], layers[18], layers[19], without(layers[20], (i) => dottyEdge[i]), layers[21], layers[22]]));
await save('house', over([layers[23], layers[24]]));
await save('plant', over([without(layers[25], (i) => looseEdge[i]), layers[26]]));
await save('palm', without(layers[28], inLight));
await save('light', only(layers[28], inLight));
await save('sid', over([layers[29], layers[30]]));
await save('boat', over([layers[11], layers[12], layers[13], layers[14], layers[15]]));

// Sid's eyes: the small dots of his lines (30) inside his pale body (29), so he can blink
{
    const pale = (i) => layers[29][i * 4 + 3] > 0;
    scene.eyes = blobsOf(layers[30]).filter((b) => b.area < 200 && pale(Math.round(b.y) * S + Math.round(b.x))).map(dotOf).sort((a, b) => a[0] - b[0]);
    const sum = [0, 0, 0];
    let n = 0;
    for (let i = 0; i < S * S; i++) if (layers[29][i * 4 + 3] === 255) { for (let c = 0; c < 3; c++) sum[c] += layers[29][i * 4 + c]; n++; }
    scene.pale = hex(...sum.map((v) => v / n));
}

await writeFile(path.join(root, 'src', 'composables', 'gratitudScene.json'), JSON.stringify(scene));
console.log(Object.keys(scene.boxes).length, 'pictures', JSON.stringify(scene.boxes), '\nsea', scene.sea.toString(16),
    '\nsun', scene.sun.map((s) => [s.x, s.y, s.r, s.color.toString(16), s.dots.length]), '\nbeacon', beacon.x, beacon.y, beacon.r, beacon.color.toString(16), beacon.dots.length,
    '\neyes', JSON.stringify(scene.eyes), scene.pale.toString(16), '\nsand', scene.sand.length, 'sparkle', scene.sparkle.length, '\nclouds', scene.clouds.length, scene.cloudAtlas, 'waves', scene.waves.length, scene.waveAtlas);
