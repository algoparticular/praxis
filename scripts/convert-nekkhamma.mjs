// originales/nekkhamma/Nekkhamma-N.png (the layers as exported, 2160px) -> public/assets/nekkhamma/*.webp, each cropped to
// its own box, and src/composables/nekkhammaScene.json: the box of every picture and, for the layers that are
// fields of dots (the stars, the dots of Sid dissolving, the cosmic cloud), every dot as [x, y, radius, colour], so the
// scene draws them as real particles. All in px of the 2160 square. The originals are not kept in the repo once
// converted (they stay in its git history). Usage: node scripts/convert-nekkhamma.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'originales', 'nekkhamma');
const target = path.join(root, 'public', 'assets', 'nekkhamma');

// 11 (the rulito over Sid's head) is not converted: the scene draws it in code, as every rulito
const pictures = {
    1: 'ground', 2: 'mark', 4: 'buds', 5: 'plants', 7: 'planet', 8: 'ring', 10: 'wind',
    12: 'sid1', 13: 'sid2-fill', 14: 'sid2-line', 16: 'sid2-arm', 17: 'sid3-fill', 18: 'sid3-line', 20: 'sid3-arm',
    22: 'sid4-eyes', 27: 'galaxy-a', 28: 'galaxy-b',
};
const dots = {
    3: 'specks', 6: 'stars', 9: 'stars', 15: 'sid2-dots', 19: 'sid3-dots', 21: 'sid4-dots',
    23: 'cloud', 24: 'cloud', 25: 'cloud', 26: 'cloud',
};
const PAD = 4;

const load = (n) => sharp(path.join(source, `Nekkhamma-${n}.png`)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

await mkdir(target, { recursive: true });
const scene = { size: 2160, boxes: {}, colors: [], dots: {} };

for (const [n, name] of Object.entries(pictures)) {
    const { data, info } = await load(n);
    let x0 = info.width, y0 = info.height, x1 = -1, y1 = -1;
    for (let y = 0; y < info.height; y++) {
        for (let x = 0; x < info.width; x++) {
            if (data[(y * info.width + x) * 4 + 3] < 4) continue;
            if (x < x0) x0 = x;
            if (x > x1) x1 = x;
            if (y < y0) y0 = y;
            if (y > y1) y1 = y;
        }
    }
    x0 = Math.max(0, x0 - PAD); y0 = Math.max(0, y0 - PAD);
    x1 = Math.min(info.width - 1, x1 + PAD); y1 = Math.min(info.height - 1, y1 + PAD);
    const box = [x0, y0, x1 - x0 + 1, y1 - y0 + 1];
    await sharp(path.join(source, `Nekkhamma-${n}.png`))
        .extract({ left: box[0], top: box[1], width: box[2], height: box[3] })
        .webp({ quality: 90, alphaQuality: 100, effort: 5 })
        .toFile(path.join(target, `${name}.webp`));
    scene.boxes[name] = box;
}

// Every dot is a blob of solid pixels: its centre, the radius of a disc of the same area and its mean colour (snapped to
// a short palette shared by all the dots, so the file stays small)
const colorIndex = (r, g, b) => {
    const q = [r, g, b].map((c) => Math.round(c / 16) * 16).map((c) => Math.min(255, c));
    const hex = (q[0] << 16) | (q[1] << 8) | q[2];
    let i = scene.colors.indexOf(hex);
    if (i < 0) { i = scene.colors.length; scene.colors.push(hex); }
    return i;
};
for (const [n, name] of Object.entries(dots)) {
    const { data, info } = await load(n);
    const W = info.width, H = info.height;
    const seen = new Uint8Array(W * H);
    const list = (scene.dots[name] ??= []);
    const stack = [];
    for (let start = 0; start < W * H; start++) {
        if (seen[start] || data[start * 4 + 3] < 110) continue;
        let area = 0, sx = 0, sy = 0, r = 0, g = 0, b = 0;
        stack.push(start);
        seen[start] = 1;
        while (stack.length) {
            const i = stack.pop();
            const x = i % W, y = (i - x) / W;
            area++; sx += x; sy += y;
            r += data[i * 4]; g += data[i * 4 + 1]; b += data[i * 4 + 2];
            for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1]) {
                if (j < 0 || seen[j] || data[j * 4 + 3] < 110) continue;
                seen[j] = 1;
                stack.push(j);
            }
        }
        if (area < 3) continue;
        list.push([Math.round(sx / area), Math.round(sy / area), +Math.sqrt(area / Math.PI).toFixed(1), colorIndex(r / area, g / area, b / area)]);
    }
}

await writeFile(path.join(root, 'src', 'composables', 'nekkhammaScene.json'), JSON.stringify(scene));
console.log(Object.keys(pictures).length, 'pictures;', Object.entries(scene.dots).map(([k, v]) => `${k} ${v.length}`).join(', '), ';', scene.colors.length, 'colours');
