// public/cards/N.webp (2160 px) -> public/cards/thumb/N.webp (the deck gallery loads these instead of the full illustrations)
// and public/cards/1440/N.webp (what phones and most screens load: see pictureUrl in src/data/cards.js)
// Usage: npm run thumbs
import { mkdir, readdir } from 'node:fs/promises';
import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const THUMB_WIDTH = 400;      // the 3D ring draws a card face 360px wide, and the grid shows them smaller still
export const MEDIUM_WIDTH = 1440;    // a phone shows the illustration at about 1170 real pixels: half the weight of the 2160 one

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const imagesDir = path.join(root, 'public', 'cards');
const thumbsDir = path.join(imagesDir, 'thumb');
const mediumDir = path.join(imagesDir, String(MEDIUM_WIDTH));

await mkdir(thumbsDir, { recursive: true });
await mkdir(mediumDir, { recursive: true });
const files = (await readdir(imagesDir)).filter((file) => /^\d+\.webp$/.test(file));
for (const file of files) {
    await sharp(path.join(imagesDir, file)).resize({ width: THUMB_WIDTH }).webp({ quality: 72 }).toFile(path.join(thumbsDir, file));
    await sharp(path.join(imagesDir, file)).resize({ width: MEDIUM_WIDTH }).webp({ quality: 80, effort: 6 }).toFile(path.join(mediumDir, file));
}
console.log(`${files.length} thumbnails written to public/cards/thumb/ and ${files.length} illustrations to public/cards/${MEDIUM_WIDTH}/`);
