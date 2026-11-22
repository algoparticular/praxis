// The pictures shown when the site is shared (og:image, 1200x630): public/share/home.jpg, made here from the oracle
// block's own drawing (Sid on his rug, public/assets/oracle/still.webp) over the block's navy sky, with its stars drawn
// in code; and public/share/sid.jpg, a picture of Sid's world (made by scripts/shot-sid-share.mjs, which needs the dev
// server). Run: node scripts/make-share-images.mjs
import sharp from 'sharp';

const W = 1200, H = 630;
const NAVY = '#143246';

// A seeded random, so the stars are the same every time
let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

const stars = [];
for (let i = 0; i < 260; i++) {
    const x = rand() * W, y = rand() * H, r = 0.6 + rand() ** 3 * 2.4;
    const colour = rand() < 0.7 ? '#ffe699' : (rand() < 0.6 ? '#faf3d4' : '#f6e27c');
    stars.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}" fill="${colour}" opacity="${(0.45 + rand() * 0.55).toFixed(2)}"/>`);
}
const sky = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs><radialGradient id="g" cx="50%" cy="52%" r="45%"><stop offset="0" stop-color="#fff6d2" stop-opacity="0.22"/><stop offset="1" stop-color="#fff6d2" stop-opacity="0"/></radialGradient></defs>
  <rect width="${W}" height="${H}" fill="${NAVY}"/>${stars.join('')}<rect width="${W}" height="${H}" fill="url(#g)"/></svg>`;

const art = await sharp('public/assets/oracle/still.webp').trim().resize({ height: 560 }).toBuffer({ resolveWithObject: true });
await sharp(Buffer.from(sky))
    .composite([{ input: art.data, left: Math.round((W - art.info.width) / 2), top: Math.round((H - art.info.height) / 2) + 10 }])
    .jpeg({ quality: 84, mozjpeg: true })
    .toFile('public/share/home.jpg');
console.log('public/share/home.jpg', art.info.width, 'x', art.info.height);
