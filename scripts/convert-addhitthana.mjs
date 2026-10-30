// The layers of Addhitthana as exported (2160px PNGs in originales/aditana/Addhitthana-N.png; they are in the git history from commit 5181012 and are not kept in the repo once converted) -> public/assets/addhitthana/*.webp,
// each cropped to its own box, and src/composables/addhitthanaScene.json: the box of every picture (and whether it touches
// a side or the top of the square, so the scene can mirror it past the frame where the screen shows more than it), and every dot of the stipples (round
// the moon, Particular's aura and the little light by the boat) as [x, y, radius, colour], so the scene draws them as real
// particles. All in px of the 2160 square. The storm (the rain and the wavy lines of the wind in the sky) is not a
// layer: the scene draws it in code. Layer 24 came empty and 39 (the rulito over Particular) is not converted: the scene
// draws it in code, as every rulito; only its place is kept.
// Usage: node scripts/convert-addhitthana.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'originales', 'aditana');
const target = path.join(root, 'public', 'assets', 'addhitthana');
const file = (n) => path.join(source, `Addhitthana-${n}.png`);

// Every cloud is a picture of its own (the wind moves each one), named by its layer; in the order the card stacks them
const CLOUDS = [9, 3, 18, 19, 13, 10, 11, 15, 20, 23, 7, 8, 14, 17, 5, 6, 12, 16, 4, 21, 22];
// Pictures made of one or more layers, drawn in this order; [n, shade] is a layer with a shadow of black over it, at
// that opacity, cut to it (29 over Particular's body and 34 over the hull: the card darkens them by 17 and 26%)
const pictures = {
    moon: [1], fern: [25, 26], sid: [[28, { layer: 29, alpha: 0.17 }], 30, 31, 32], hull: [[33, { layer: 34, alpha: 0.26 }], 35],
    oar: [36, 37], mark: [40],
};
// Pictures with a stipple round them: the solid shape is a picture, its loose dots are particles. The moon's (2) is its
// outline and the dark dots that eat it; the aura (27) and the little light (38) are yellow
const stippled = { moonline: 2, aura: 27, light: 38 };
const PAD = 4;
const SOLID = 110;              // alpha from which a pixel is part of a shape (as in convert-sacca)
const SIZE = 2160;

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
const scene = { size: SIZE, boxes: {}, sides: {}, clouds: CLOUDS, colors: [], dots: {} };
const colorIndex = (r, g, b) => {
    const q = [r, g, b].map((c) => Math.min(255, Math.round(c / 16) * 16));
    const hex = (q[0] << 16) | (q[1] << 8) | q[2];
    let i = scene.colors.indexOf(hex);
    if (i < 0) { i = scene.colors.length; scene.colors.push(hex); }
    return i;
};

// A layer with a shadow over it: the shadow's black, at its opacity, only where the layer is (atop)
const shaded = async (n, { layer, alpha }) => {
    const { data, info } = await load(layer);
    for (let i = 3; i < data.length; i += 4) data[i] = Math.round(data[i] * alpha);
    const shade = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
    return sharp(file(n)).composite([{ input: shade, blend: 'atop' }]).png().toBuffer();
};

// A picture (a few layers drawn one over the other), cropped to its box; the sides of the square it touches
const save = async (name, layers) => {
    const inputs = await Promise.all(layers.map((l) => (Array.isArray(l) ? shaded(...l) : file(l))));
    const flat = await sharp({ create: { width: SIZE, height: SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
        .composite(inputs.map((input) => ({ input }))).png().toBuffer();
    const { data } = await sharp(flat).raw().toBuffer({ resolveWithObject: true });
    const box = boxOf(data, SIZE, SIZE);
    await webp(sharp(flat).extract({ left: box[0], top: box[1], width: box[2], height: box[3] })).toFile(path.join(target, `${name}.webp`));
    scene.boxes[name] = box;
    const sides = (box[0] === 0 ? 'l' : '') + (box[0] + box[2] >= SIZE ? 'r' : '') + (box[1] === 0 ? 't' : '');
    if (sides) scene.sides[name] = sides;
};

for (const n of CLOUDS) await save(`c${n}`, [n]);
for (const [name, layers] of Object.entries(pictures)) await save(name, layers);

// The stipples: the biggest blob (with its soft edge) is the picture, and so are the clumps where the dots run into
// each other (as a dot they would be one big round blot); every other blob is a dot
const CLUMP = 60;               // px of area from which a blob is a clump
for (const [name, n] of Object.entries(stippled)) {
    const { data, info } = await load(n);
    const W = info.width, H = info.height;
    const [main, ...others] = blobsOf(data, W, H);
    const rest = others.filter((b) => b.area < CLUMP);
    const keep = grown([main, ...others.filter((b) => b.area >= CLUMP)].flatMap((b) => b.pixels), W, H, 3);
    const solid = Buffer.from(data);
    for (let i = 0; i < W * H; i++) if (!keep[i]) solid[i * 4 + 3] = 0;
    const box = boxOf(solid, W, H);
    await webp(sharp(solid, { raw: { width: W, height: H, channels: 4 } }).extract({ left: box[0], top: box[1], width: box[2], height: box[3] }))
        .toFile(path.join(target, `${name}.webp`));
    scene.boxes[name] = box;
    scene.dots[name] = rest.filter((b) => b.area >= 3)
        .map((b) => [Math.round(b.x), Math.round(b.y), +Math.sqrt(b.area / Math.PI).toFixed(1), colorIndex(...b.rgb)]);
}

// Where the card draws the rulito, over Particular
{
    const { data, info } = await load(39);
    scene.rulito = boxOf(data, info.width, info.height);
}

await writeFile(path.join(root, 'src', 'composables', 'addhitthanaScene.json'), JSON.stringify(scene));
console.log(Object.keys(scene.boxes).length, 'pictures;', Object.entries(scene.dots).map(([k, v]) => `${k} ${v.length} dots`).join(', '),
    ';', scene.colors.length, 'colours; mirrored:', JSON.stringify(scene.sides));
