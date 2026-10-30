// Sila's four big tufts of grass, cut out of the line work so the scene can let them sway in the wind on their own (the
// line work keeps the rocks, the ground and the mushrooms still, aligned with their fills). Run once after
// scripts/convert-sila.mjs (it works on its output, public/assets/sila/lines.webp, since the originals are not in the
// repo): it writes public/assets/sila/grass.webp (the tufts where they are, cropped to their box) and lines.webp without
// them, and adds to src/composables/silaScene.json `grass` (its box) and `tufts` (each one's box, art px of the 2160
// square, with its root at the bottom). It refuses to run twice. Usage: node scripts/split-sila-grass.mjs
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'public', 'assets', 'sila');
const json = path.join(root, 'src', 'composables', 'silaScene.json');
if (existsSync(path.join(dir, 'grass.webp'))) {
    console.log('grass.webp is already there: the tufts were cut out before');
    process.exit(0);
}

// [x0, y0, x1, y1] in art px: the blades only; for the tufts on the horizon the box ends just above the ground's line
const TUFTS = [
    [145, 1618, 307, 1728],     // the big one on the left, on the horizon
    [1172, 1658, 1327, 1723],   // on the horizon, past the big mushroom
    [542, 1878, 727, 2013],     // in the grass in front, in the middle
    [1887, 1811, 2027, 1915],   // in the grass in front, on the right
];

const scene = JSON.parse(await readFile(json, 'utf8'));
const [lx, ly] = scene.boxes.lines;
const { data, info } = await sharp(path.join(dir, 'lines.webp')).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height;
const lines = Buffer.from(data);
const grass = Buffer.alloc(data.length);
for (const [x0, y0, x1, y1] of TUFTS) {
    for (let y = Math.max(0, y0 - ly); y < Math.min(H, y1 - ly); y++) {
        for (let x = Math.max(0, x0 - lx); x < Math.min(W, x1 - lx); x++) {
            const i = (y * W + x) * 4;
            data.copy(grass, i, i, i + 4);
            lines[i + 3] = 0;
        }
    }
}
const gx0 = Math.min(...TUFTS.map((t) => t[0])), gy0 = Math.min(...TUFTS.map((t) => t[1]));
const gx1 = Math.max(...TUFTS.map((t) => t[2])), gy1 = Math.max(...TUFTS.map((t) => t[3]));
const webp = (img) => img.webp({ quality: 90, alphaQuality: 100, effort: 5 });
await webp(sharp(grass, { raw: { width: W, height: H, channels: 4 } })
    .extract({ left: gx0 - lx, top: gy0 - ly, width: gx1 - gx0, height: gy1 - gy0 })).toFile(path.join(dir, 'grass.webp'));
await webp(sharp(lines, { raw: { width: W, height: H, channels: 4 } })).toFile(path.join(dir, 'lines.webp'));
scene.boxes.grass = [gx0, gy0, gx1 - gx0, gy1 - gy0];
scene.tufts = TUFTS.map(([x0, y0, x1, y1]) => [x0, y0, x1 - x0, y1 - y0]);
await writeFile(json, JSON.stringify(scene));
console.log(TUFTS.length, 'tufts cut out into grass.webp', scene.boxes.grass);
