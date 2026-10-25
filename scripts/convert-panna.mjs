// art/panna/*.png (the layers as exported, 2160px, not published) -> public/assets/panna/*.webp with names that say what they are.
// Usage: node scripts/convert-panna.mjs
import { mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'art', 'panna');
const target = path.join(root, 'public', 'assets', 'panna');

// 29 (the golden thread) is not converted: the scene draws it as real particles
const names = {
    1: 'vignette', 2: 'leaf-r2', 3: 'leaf-r1', 4: 'leaf-r4', 5: 'leaf-r3', 6: 'leaf-l1', 7: 'leaf-l2', 8: 'leaf-l3', 9: 'leaf-l4',
    10: 'mush-glow', 11: 'mush-caps', 12: 'mush-shade', 13: 'mush-stems', 14: 'mush-outline',
    15: 'branch-r', 16: 'blue-r', 17: 'hooks-r', 18: 'branch-l', 19: 'blue-l', 20: 'hooks-l',
    21: 'fly-halo', 22: 'fly-core', 23: 'fly-stem', 24: 'corners', 25: 'sun', 26: 'mark', 27: 'aura', 28: 'character',
};

await mkdir(target, { recursive: true });
let total = 0;
for (const [n, name] of Object.entries(names)) {
    const file = path.join(target, `${name}.webp`);
    await sharp(path.join(source, `${n}.png`)).webp({ quality: 90, alphaQuality: 100, effort: 5 }).toFile(file);
    total += (await stat(file)).size;
}
console.log(`${Object.keys(names).length} layers, ${Math.round(total / 1024)} KB`);
