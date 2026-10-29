// originales/nekkhamma/Nekkhamma-N.png (the layers as exported, 2160px) -> public/assets/nekkhamma/*.webp, each cropped to
// its own box, and src/composables/nekkhammaScene.json: the box of every picture; for the layers that are fields of dots
// (the stars, the pink specks, the cosmic cloud) every dot as [x, y, radius, colour], so the scene draws them as real
// particles; and points of the whole Sid (`body`: [x, y, colour] every few px inside him; `outline`: points along his
// line), which become the particles he lets go of as he dissolves. All in px of the 2160 square. The illustration's
// other three Sids (13 to 22: each more undone, as dots) are not used: the scene undoes the whole one itself. The originals are not kept in the repo once
// converted (they stay in its git history). Usage: node scripts/convert-nekkhamma.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'originales', 'nekkhamma');
const target = path.join(root, 'public', 'assets', 'nekkhamma');

// 11 (the rulito over Sid's head) is not converted: the scene draws it in code, as every rulito; nor are 27 and 28,
// the cloud's two little galaxies: the scene has a galaxy of particles instead (useGalaxy, as Dana's)
const pictures = {
    1: 'ground', 2: 'mark', 5: 'plants', 7: 'planet', 8: 'ring', 10: 'wind',
    12: 'sid',
};
const dots = {
    3: 'specks', 6: 'stars', 9: 'stars',
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

// The glowing buds (4) each on its own, so each one can breathe and sway: a square round the middle of its light, found
// near where it is drawn (art px)
const BUDS = [[106, 1943], [524, 2021], [678, 1911], [778, 1924], [1466, 1935], [1625, 1641], [1715, 2037]];
const BUD = 92;
scene.buds = [];
{
    const { data, info } = await load(4);
    for (const [i, [bx, by]] of BUDS.entries()) {
        let sx = 0, sy = 0, sw = 0;
        for (let y = by - 80; y < by + 80; y++) {
            for (let x = bx - 80; x < bx + 80; x++) {
                const a = data[(y * info.width + x) * 4 + 3];
                sx += x * a; sy += y * a; sw += a;
            }
        }
        const cx = Math.round(sx / sw), cy = Math.round(sy / sw);
        const box = [cx - BUD / 2, cy - BUD / 2, BUD, BUD];
        // Two buds are close together: a soft round mask keeps the light of the other one out
        const mask = Buffer.from(`<svg width="${BUD}" height="${BUD}"><defs><radialGradient id="m"><stop offset="0.72" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><circle cx="${BUD / 2}" cy="${BUD / 2}" r="${BUD / 2}" fill="url(#m)"/></svg>`);
        await sharp(await sharp(path.join(source, 'Nekkhamma-4.png'))
            .extract({ left: box[0], top: box[1], width: box[2], height: box[3] }).png().toBuffer())
            .composite([{ input: mask, blend: 'dest-in' }])
            .webp({ quality: 90, alphaQuality: 100, effort: 5 })
            .toFile(path.join(target, `bud-${i + 1}.webp`));
        scene.buds.push(box);
    }
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

// Sid: a point every BODY px where he is solid (with its colour), and points along his dark line at least LINE px apart
const BODY = 11, LINE = 24;
{
    const { data, info } = await load(12);
    const W = info.width;
    const at = (x, y) => (y * W + x) * 4;
    scene.body = [];
    scene.outline = [];
    const [bx, by, bw, bh] = scene.boxes.sid;
    for (let y = by; y < by + bh; y += BODY) {
        for (let x = bx + ((y / BODY) % 2) * BODY / 2; x < bx + bw; x += BODY) {
            const i = at(Math.round(x), y);
            if (data[i + 3] < 200) continue;
            scene.body.push([Math.round(x), y, colorIndex(data[i], data[i + 1], data[i + 2])]);
        }
    }
    for (let y = by; y < by + bh; y += 3) {
        for (let x = bx; x < bx + bw; x += 3) {
            const i = at(x, y);
            if (data[i + 3] < 200 || data[i] + data[i + 1] + data[i + 2] > 240) continue;
            if (scene.outline.some(([ox, oy]) => (ox - x) ** 2 + (oy - y) ** 2 < LINE * LINE)) continue;
            scene.outline.push([x, y]);
        }
    }
}

await writeFile(path.join(root, 'src', 'composables', 'nekkhammaScene.json'), JSON.stringify(scene));
console.log(Object.keys(pictures).length, 'pictures;', Object.entries(scene.dots).map(([k, v]) => `${k} ${v.length}`).join(', '), '; body', scene.body.length, 'outline', scene.outline.length, ';', scene.colors.length, 'colours');
