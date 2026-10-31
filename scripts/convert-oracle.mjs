// The layers of the oracle block of the landing as exported (originales/oracle/Oracle_2-N.png, 3240px; they are in the
// git history and are not kept in the repo once converted) -> public/assets/oracle/*.webp, each cropped to its own box,
// and src/composables/oracleScene.json, all in px of a 2160 square (the originals scaled by 2/3):
//   boxes   the box of every picture
//   sand    the grains rising from the bowl (12) as dots [x, y, radius]: the scene draws them as live particles
//   flame   the candle's stippled flame (14) as dots [x, y, radius], and its middle and size: particles and a glow in code
//   still   (still.webp) the whole drawing flattened and small, only for a visitor without WebGL
// Not converted: 1 (the stars: the oracle block already has its own live sky, useStarField.js), 9 (empty), 12 and 14
// (particles). Usage: node scripts/convert-oracle.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'originales', 'oracle');
const target = path.join(root, 'public', 'assets', 'oracle');
const file = (n) => path.join(source, `Oracle_2-${n}.png`);
const S = 2160;

// Pictures made of one or more layers, drawn in this order
const pictures = {
    rug: [2], sid: [6, 7], pot: [3, 5], tree: [4], cards: [8], bowl: [10, 11], candle: [13],
};
const PAD = 4;

const webp = (img) => img.webp({ quality: 88, alphaQuality: 100, effort: 5 });
// Layers flattened at 2160
const flatten = async (layers) => sharp(await sharp({ create: { width: 3240, height: 3240, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(layers.map((n) => ({ input: file(n) }))).png().toBuffer()).resize(S, S).png().toBuffer();
const rawOf = async (png) => (await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true })).data;

const boxOf = (data) => {
    let x0 = S, y0 = S, x1 = -1, y1 = -1;
    for (let y = 0; y < S; y++) {
        for (let x = 0; x < S; x++) {
            if (data[(y * S + x) * 4 + 3] < 4) continue;
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

// Every dot of a stippled layer: [x, y, radius], at 2160
const dotsOf = (data) => {
    const seen = new Uint8Array(S * S);
    const dots = [];
    for (let start = 0; start < S * S; start++) {
        if (seen[start] || data[start * 4 + 3] < 90) continue;
        const stack = [start];
        seen[start] = 1;
        let n = 0, sx = 0, sy = 0;
        while (stack.length) {
            const i = stack.pop();
            const x = i % S, y = (i - x) / S;
            n++; sx += x; sy += y;
            for (const j of [x > 0 ? i - 1 : -1, x < S - 1 ? i + 1 : -1, i - S, i + S]) {
                if (j < 0 || j >= S * S || seen[j] || data[j * 4 + 3] < 90) continue;
                seen[j] = 1;
                stack.push(j);
            }
        }
        dots.push([Math.round(sx / n), Math.round(sy / n), +Math.max(1, Math.sqrt(n / Math.PI)).toFixed(1)]);
    }
    return dots;
};

await mkdir(target, { recursive: true });
const scene = { size: S, boxes: {}, sand: [], flame: null };

for (const [name, layers] of Object.entries(pictures)) {
    const flat = await flatten(layers);
    const box = boxOf(await rawOf(flat));
    await webp(sharp(flat).extract({ left: box[0], top: box[1], width: box[2], height: box[3] })).toFile(path.join(target, `${name}.webp`));
    scene.boxes[name] = box;
}

scene.sand = dotsOf(await rawOf(await flatten([12])));
{
    // The flame is stippled so densely its dots touch: a dot wherever it is, as dense as it is
    const data = await rawOf(await flatten([14]));
    const dots = [];
    const STEP = 3;
    for (let y = 0; y < S; y += STEP) {
        for (let x = 0; x < S; x += STEP) {
            const a = data[(y * S + x) * 4 + 3] / 255;
            if (a < 0.05 || Math.random() > a * 0.8) continue;
            dots.push([x + Math.round((Math.random() - 0.5) * STEP), y + Math.round((Math.random() - 0.5) * STEP), +(1.2 + Math.random() * 1.2).toFixed(1)]);
        }
    }
    const xs = dots.map((d) => d[0]), ys = dots.map((d) => d[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    scene.flame = { x: Math.round((x0 + x1) / 2), y: Math.round((y0 + y1) / 2), w: x1 - x0, h: y1 - y0, dots };
}

// For a visitor without WebGL: everything but the sky, flattened, at the size the block shows it
{
    const flat = await flatten([2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14]);
    const box = boxOf(await rawOf(flat));
    await webp(sharp(flat).extract({ left: box[0], top: box[1], width: box[2], height: box[3] }).resize(900)).toFile(path.join(target, 'still.webp'));
    scene.boxes.still = box;
}

await writeFile(path.join(root, 'src', 'composables', 'oracleScene.json'), JSON.stringify(scene));
console.log(scene.boxes, scene.sand.length, 'grains;', scene.flame.dots.length, 'flame dots at', scene.flame.x, scene.flame.y);
