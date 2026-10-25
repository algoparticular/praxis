// public/cards/N.webp -> public/cards/thumb/N.webp (the deck gallery loads these instead of the full illustrations)
// Usage: npm run thumbs
import { mkdir, readdir } from 'node:fs/promises';
import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const THUMB_WIDTH = 400;      // the 3D ring draws a card face 360px wide, and the grid shows them smaller still

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const imagesDir = path.join(root, 'public', 'cards');
const thumbsDir = path.join(imagesDir, 'thumb');

await mkdir(thumbsDir, { recursive: true });
const files = (await readdir(imagesDir)).filter((file) => /^\d+\.webp$/.test(file));
for (const file of files) {
    await sharp(path.join(imagesDir, file)).resize({ width: THUMB_WIDTH }).webp({ quality: 72 }).toFile(path.join(thumbsDir, file));
}
console.log(`${files.length} thumbnails written to public/cards/thumb/`);
