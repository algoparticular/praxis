// public/assets/hero/character.webp -> src/composables/characterMask.js
// Where Vipassana's character is solid (for pressing him), as 87 x 103 bits of his picture. It used to be read from the
// picture in the browser with getImageData, but Safari's protection against fingerprinting hands a canvas back blank or
// with noise, and then he could not be pressed at all. Usage: node scripts/make-character-mask.mjs
import { writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const W = 87, H = 103, SOLID = 60;   // a pixel is solid when its alpha is over 60 (of 255), as the scene always judged it
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { data } = await sharp(path.join(root, 'public', 'assets', 'hero', 'character.webp'))
    .ensureAlpha().resize(W, H, { fit: 'fill' }).raw().toBuffer({ resolveWithObject: true });

const bytes = new Uint8Array(Math.ceil((W * H) / 8));
let solid = 0;
for (let i = 0; i < W * H; i++) {
    if (data[i * 4 + 3] > SOLID) { bytes[i >> 3] |= 1 << (7 - (i & 7)); solid++; }
}
const bits = Buffer.from(bytes).toString('base64');

await writeFile(path.join(root, 'src', 'composables', 'characterMask.js'), `// Where Vipassana's character is solid, as ${W} x ${H} bits of his picture, for pressing him (see scripts/make-character-mask.mjs,
// which writes this file: do not edit it by hand). Read from the picture at runtime it came back blank or with noise in Safari.
export const MASK_W = ${W};
export const MASK_H = ${H};
const bytes = Uint8Array.from(atob('${bits}'), (c) => c.charCodeAt(0));
export const solidAt = (x, y) => x >= 0 && y >= 0 && x < MASK_W && y < MASK_H && ((bytes[(y * MASK_W + x) >> 3] >> (7 - ((y * MASK_W + x) & 7))) & 1) === 1;
`);
console.log(`mask written: ${solid} of ${W * H} cells are solid`);
