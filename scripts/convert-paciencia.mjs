// The layers of Paciencia as exported (3240px PNGs; they are in the git history: the boat in
// originales/paciencia/Paciencia-N.png from commit 53d2632, the ground in originales/paciencia/paciencia-piso from
// commit 8008718) -> public/assets/paciencia/boat.webp, an atlas of every piece of the boat and its crew,
// cone.webp (the pine cone, layers 1 and 2 of the boat), plants.webp and mushrooms.webp (the strip of the ground: its
// grass, and the coral with its mushrooms), and src/composables/pacienciaScene.json: where every piece of the boat
// sits (px of the 3240 square) and where it is in the atlas, so the scene can move each little being on its own; and,
// in fractions of the strip, where the caps of its mushrooms and the little balls of its coral are (they lean and
// breathe, and the spores come out of the caps) and the room in the middle where the pine cone sits. Each being's
// outline is cut in two at the top of its head: its antennae on their own, so they can sway in the wind while the
// body stays put. The originals are not kept in the repo once converted.
// Usage: node scripts/convert-paciencia.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'originales', 'paciencia');
const target = path.join(root, 'public', 'assets', 'paciencia');
const file = (n) => (typeof n === 'string' ? path.join(source, n) : path.join(source, `Paciencia-${n}.png`));
const ground = (n) => `paciencia-piso/Paciencia-${n}.png`;

const SCALE = 0.5;              // the atlas is at half the size of the export: the boat is about 1320px wide in it
const PAD = 6;                  // room round each piece in the atlas, so the mipmaps do not bleed into the next one
const OVERLAP = 8;              // px of the export the antennae reach below their cut, so the two halves never show a seam
const ATLAS_W = 2048;

// The pieces, in the order they are drawn (back to front), each from one or more layers. The beings: L the one at the
// left with its eyes open, C the one in the middle that rows, S the little one beside him, T the one up on the spiral,
// R the sleepy one at the right end. `antennae` cuts the outline at the top of that being's body.
const PIECES = [
    { name: 'lBody', layers: [3] }, { name: 'lLine', layers: [4], antennae: 3 }, { name: 'lEyes', layers: [5] }, { name: 'lHands', layers: [6] },
    { name: 'fill', layers: [7] }, { name: 'line', layers: [8] },
    { name: 'cBody', layers: [9] }, { name: 'cLine', layers: [10], antennae: 9 }, { name: 'cEyes', layers: [11] },
    { name: 'arms', layers: [12] }, { name: 'oarFill', layers: [13] }, { name: 'oarLine', layers: [14] }, { name: 'oarSpot', layers: [15, 16] },
    { name: 'sBody', layers: [17] }, { name: 'sLine', layers: [18], antennae: 17 }, { name: 'sEyes', layers: [19] },
    { name: 'tBody', layers: [20] }, { name: 'tLine', layers: [21], antennae: 20 }, { name: 'tEyes', layers: [22] },
    { name: 'rBody', layers: [23] }, { name: 'rLine', layers: [24], antennae: 23 }, { name: 'rEyes', layers: [25] },
];
const CONE = [1, 2];

const load = async (n) => sharp(file(n)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const webp = (img) => img.webp({ quality: 90, alphaQuality: 100, effort: 5 });

// The box [x0, y0, x1, y1) of what is not transparent in raw RGBA, within rows y0..y1
const boxOf = (data, W, H, from = 0, to = H) => {
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let y = from; y < to; y++) {
        for (let x = 0; x < W; x++) {
            if (data[(y * W + x) * 4 + 3] < 2) continue;
            if (x < x0) x0 = x;
            if (x > x1) x1 = x;
            if (y < y0) y0 = y;
            if (y > y1) y1 = y;
        }
    }
    return x1 < 0 ? null : [x0, y0, x1 + 1, y1 + 1];
};
// Grown to even px (so it halves exactly) and kept inside the square
const even = ([x0, y0, x1, y1], W, H) => [Math.max(0, x0 & ~1), Math.max(0, y0 & ~1), Math.min(W, (x1 + 1) & ~1), Math.min(H, (y1 + 1) & ~1)];

// Several layers drawn over each other, as one raw RGBA buffer
const flatten = async (layers) => {
    const [first, ...rest] = await Promise.all(layers.map(load));
    const { width: W, height: H } = first.info;
    if (!rest.length) return { data: first.data, W, H };
    const out = await sharp(first.data, { raw: { width: W, height: H, channels: 4 } })
        .composite(rest.map((each) => ({ input: each.data, raw: { width: W, height: H, channels: 4 } })))
        .raw().toBuffer();
    return { data: out, W, H };
};

// One region of a flattened picture, at the atlas's scale
const cut = async ({ data, W, H }, [x0, y0, x1, y1]) => sharp(data, { raw: { width: W, height: H, channels: 4 } })
    .extract({ left: x0, top: y0, width: x1 - x0, height: y1 - y0 })
    .resize(Math.round((x1 - x0) * SCALE), Math.round((y1 - y0) * SCALE), { kernel: 'lanczos3' })
    .png().toBuffer();

await mkdir(target, { recursive: true });

// Every piece, its antennae apart
const parts = [];
const bodies = {};
for (const piece of PIECES) {
    const picture = await flatten(piece.layers);
    const { data, W, H } = picture;
    const whole = boxOf(data, W, H);
    if (piece.antennae) {
        // The cut is a little below the top of the body, inside the hair of the head, where the antennae grow from
        const body = bodies[piece.antennae];
        const at = (body[1] + Math.round(0.05 * (body[3] - body[1]))) & ~1;
        const line = even(boxOf(data, W, H, at, H), W, H);
        const antennae = even(boxOf(data, W, H, 0, at + OVERLAP), W, H);
        parts.push({ name: piece.name, box: line, png: await cut(picture, line) });
        parts.push({ name: piece.name.replace('Line', 'Antennae'), box: antennae, png: await cut(picture, antennae) });
    } else {
        const box = even(whole, W, H);
        if (piece.layers.length === 1) bodies[piece.layers[0]] = whole;
        parts.push({ name: piece.name, box, png: await cut(picture, box) });
    }
}

// Packed in shelves, the tallest first
const sizes = parts.map((p) => [Math.round((p.box[2] - p.box[0]) * SCALE), Math.round((p.box[3] - p.box[1]) * SCALE)]);
const order = parts.map((_, i) => i).sort((a, b) => sizes[b][1] - sizes[a][1]);
let x = 0, y = 0, shelf = 0;
const at = [];
for (const i of order) {
    const [w, h] = sizes[i];
    if (x + w + 2 * PAD > ATLAS_W) { x = 0; y += shelf; shelf = 0; }
    at[i] = [x + PAD, y + PAD];
    x += w + 2 * PAD;
    shelf = Math.max(shelf, h + 2 * PAD);
}
const atlasH = y + shelf;
const atlas = sharp({ create: { width: ATLAS_W, height: atlasH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(parts.map((p, i) => ({ input: p.png, left: at[i][0], top: at[i][1] })));
await webp(sharp(await atlas.png().toBuffer())).toFile(path.join(target, 'boat.webp'));

// The boat's box: everything but the cone, as the boat picture of the Collaborate page was cut
const all = parts.reduce((b, p) => [Math.min(b[0], p.box[0]), Math.min(b[1], p.box[1]), Math.max(b[2], p.box[2]), Math.max(b[3], p.box[3])], [Infinity, Infinity, 0, 0]);
const r4 = (v) => Math.round(v * 1e5) / 1e5;
const scene = {
    box: [all[0], all[1], all[2] - all[0], all[3] - all[1]],
    pieces: Object.fromEntries(parts.map((p, i) => [p.name, {
        rect: [p.box[0], p.box[1], p.box[2] - p.box[0], p.box[3] - p.box[1]],
        crop: [r4(at[i][0] / ATLAS_W), r4(at[i][1] / atlasH), r4(sizes[i][0] / ATLAS_W), r4(sizes[i][1] / atlasH)],
    }])),
};

// The pine cone, in a box as the old one had it (its drawing 87% of the width, a little room for the glow), so it
// sits where the cone of the mushrooms picture is and covers it
const cone = await flatten(CONE);
const [c0, c1, c2, c3] = boxOf(cone.data, cone.W, cone.H);
const cw = Math.round((c2 - c0) / 0.87), ch = Math.round(cw * 128 / 100);
const coneDrawing = await sharp(cone.data, { raw: { width: cone.W, height: cone.H, channels: 4 } })
    .extract({ left: c0, top: c1, width: c2 - c0, height: c3 - c1 }).png().toBuffer();
await webp(sharp({ create: { width: cw, height: ch, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: coneDrawing, left: Math.round(cw * 0.05), top: Math.round(ch * 0.07) }]))
    .toFile(path.join(target, 'cone.webp'));

// ---- The ground ----
// A strip at the foot of the square: its grass behind (1), and the coral, the little balls (3 blue, 4 yellow), the
// shines, the caps (6, their shade 7) and all the line work (8) as one picture. The pine cone sits on the cut stem in
// the gap in the middle (its drawing's foot there, as wide as it was against the old mushrooms)
const GROUND = { grass: [1], mushrooms: [2, 3, 4, 5, 6, 7, 8] };
const GROUND_SCALE = 0.6;
const CONE_IN_GAP = { x: 1465, foot: 3015, w: 225 };     // px of the square: the middle and the foot of the cone's drawing
const strips = {};
for (const [name, layers] of Object.entries(GROUND)) strips[name] = await flatten(layers.map(ground));
const top = boxOf(strips.mushrooms.data, strips.mushrooms.W, strips.mushrooms.H)[1] & ~1;
const S = strips.mushrooms.W, SH = strips.mushrooms.H - top;
for (const [name, picture] of Object.entries(strips)) {
    const png = await sharp(picture.data, { raw: { width: picture.W, height: picture.H, channels: 4 } })
        .extract({ left: 0, top, width: S, height: SH })
        .resize(Math.round(S * GROUND_SCALE), Math.round(SH * GROUND_SCALE), { kernel: 'lanczos3' }).png().toBuffer();
    await webp(sharp(png)).toFile(path.join(target, `${name}.webp`));
}
// The shapes of one layer: [u, v, w] each, the middle of its foot and its width in fractions of the strip
const shapes = async (n, least) => {
    const { data, info } = await load(ground(n));
    const W = info.width, H = info.height, seen = new Uint8Array(W * H), out = [];
    for (let i = 0; i < W * H; i++) {
        if (seen[i] || data[i * 4 + 3] < 128) continue;
        const stack = [i];
        seen[i] = 1;
        let x0 = W, y0 = H, x1 = 0, y1 = 0, area = 0;
        while (stack.length) {
            const j = stack.pop(), x = j % W, y = (j - x) / W;
            area++;
            x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
            for (const k of [j - 1, j + 1, j - W, j + W]) {
                if (k < 0 || k >= W * H || seen[k] || data[k * 4 + 3] < 128 || Math.abs((k % W) - x) > 1) continue;
                seen[k] = 1;
                stack.push(k);
            }
        }
        if (area >= least) out.push([r4((x0 + x1) / 2 / S), r4((y1 - top) / SH), r4((x1 - x0) / S)]);
    }
    return out.sort((a, b) => a[0] - b[0]);
};
const coneH = CONE_IN_GAP.w * (c3 - c1) / (c2 - c0);
const coneBox = { w: CONE_IN_GAP.w / 0.87 };
coneBox.h = coneBox.w * 128 / 100;
coneBox.x = CONE_IN_GAP.x - CONE_IN_GAP.w / 2 - 0.05 * coneBox.w;
coneBox.y = CONE_IN_GAP.foot - coneH - 0.07 * coneBox.h;
scene.ground = {
    size: [S, SH],
    caps: await shapes(6, 4000),
    balls: [...await shapes(3, 1500), ...await shapes(4, 1500)].sort((a, b) => a[0] - b[0]),
    cone: { x: r4(coneBox.x / S), y: r4((coneBox.y - top) / SH), w: r4(coneBox.w / S), h: r4(coneBox.h / SH) },
};
await writeFile(path.join(root, 'src', 'composables', 'pacienciaScene.json'), JSON.stringify(scene));

console.log(`boat.webp ${ATLAS_W}x${atlasH}, ${parts.length} pieces; cone.webp ${cw}x${ch}; ground ${S}x${SH}: ${scene.ground.caps.length} caps, ${scene.ground.balls.length} balls`);
