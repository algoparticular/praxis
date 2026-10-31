// The layers of Comunicación as exported (originales/comunicacion/Comunicacion-N.png, 3240px), scaled to the 2160 square of
// the other scenes -> public/assets/comunicacion/*.webp, each cropped to its own box, and src/composables/comunicacionScene.json,
// all in px of the 2160 square:
//   boxes    the box of every picture:
//              back    the canopy behind the trunks: the great mass of leaves (6) and the paler ones round the frame (5)
//              trunks  the trunks and branches (7) with the light strokes of their bark (8)
//              front   the ring of leaves at the tree tops, round the opening (9), drawn over the trunks
//              being0, being1, being2  the three beings floating in the opening, left, middle (the big one) and right:
//                      each its blue head (3, 15, 12) under its lines and tentacles (4, 16, 13)
//              eyes2   the two dot eyes of the right one (taken out of 13, so it can blink; the head's blue shows under them)
//   sky      the sky is not a picture (there is no layer for it: the card's colour behind everything): its teal, measured
//            on the card in the opening, as [radius from the middle, 0xRRGGBB] stops (it barely changes)
//   beings   for each being: its name, the box of its head (pivot of its breath, place of its light), the colour of its
//            aura and the stipple of the aura (2, 14, 11, the pink halo round each head) as dots [x, y, radius], only
//            where the head does not hide them
//   pollen   the yellow dots of the card as dots [x, y, radius]: `far`, the field behind the canopy (10), only those that
//            show through it; `near`, the ones over the trunks and the leaves (1), only those the ring of leaves does not hide
//   crowns   the tree tops round the opening (the inner edge of the ring of leaves, 9), one in each of CROWNS sectors
//            round the middle, as [x, y, width]: where the front picture's crowns sway on their own (`sway` in the stage)
// The Algo Particular mark on the trunk at the top right (in the bark's strokes, 8) stays: it is drawn on the tree.
// Not converted: the auras (drawn as particles) and the yellow dots (particles). The card has no rulito drawn.
// The originals are not kept in the repo once converted. Usage: node scripts/convert-comunicacion.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'originales', 'comunicacion');
const target = path.join(root, 'public', 'assets', 'comunicacion');
const file = (n) => path.join(source, `Comunicacion-${n}.png`);
const card = path.join(root, 'public', 'cards', '17.webp');
const S = 2160;
const PAD = 4;
const SOLID = 60;

// Every picture: its layers (drawn in this order) and how much of the 2160 space its file keeps. The canopy fills the
// whole card with fine leaves and holes of sky between them (an alpha that weighs a lot), so the three canopy pictures
// are kept at about half the space (the scene places each picture by its box, whatever the file's size) and the far one
// slightly out of focus (`blur`), as it is seen beyond the trunks
const pictures = {
    back: { layers: [6, 5], scale: 0.44, quality: 72, alpha: 50, blur: 0.8 },
    trunks: { layers: [7, 8], scale: 0.5, quality: 74, alpha: 50 },
    front: { layers: [9], scale: 0.52, quality: 74, alpha: 50 },
};
const BEINGS = [
    { name: 'being0', head: 3, lines: 4, aura: 2 },
    { name: 'being1', head: 15, lines: 16, aura: 14 },
    { name: 'being2', head: 12, lines: 13, aura: 11, eyes: true },
];

// Each layer scaled to 2160, as PNG, once
const scaled = new Map();
const layer = async (n) => {
    if (!scaled.has(n)) scaled.set(n, await sharp(file(n)).resize(S, S, { kernel: 'lanczos3' }).png().toBuffer());
    return scaled.get(n);
};
const rawOf = async (png) => (await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true })).data;
const pngOf = (data) => sharp(data, { raw: { width: S, height: S, channels: 4 } }).png().toBuffer();
const flatten = async (inputs) => sharp({ create: { width: S, height: S, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(await Promise.all(inputs.map(async (n) => ({ input: typeof n === 'number' ? await layer(n) : n })))).png().toBuffer();
const hex = (r, g, b) => (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);

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

// Every blob of solid pixels: its pixels, area, centre and box
const blobsOf = (data) => {
    const seen = new Uint8Array(S * S);
    const blobs = [];
    const stack = [];
    const solid = (i) => data[i * 4 + 3] >= SOLID;
    for (let start = 0; start < S * S; start++) {
        if (seen[start] || !solid(start)) continue;
        const pixels = [];
        let sx = 0, sy = 0, x0 = S, y0 = S, x1 = 0, y1 = 0;
        stack.push(start);
        seen[start] = 1;
        while (stack.length) {
            const i = stack.pop();
            const x = i % S, y = (i - x) / S;
            pixels.push(i);
            sx += x; sy += y;
            x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
            for (const j of [x > 0 ? i - 1 : -1, x < S - 1 ? i + 1 : -1, y > 0 ? i - S : -1, y < S - 1 ? i + S : -1]) {
                if (j < 0 || seen[j] || !solid(j)) continue;
                seen[j] = 1;
                stack.push(j);
            }
        }
        blobs.push({ pixels, area: pixels.length, x: sx / pixels.length, y: sy / pixels.length, box: [x0, y0, x1, y1] });
    }
    return blobs;
};

// A blob's pixels and their soft edge (`grow` px round them)
const around = (blob, grow) => {
    const mask = new Uint8Array(S * S);
    blob.pixels.forEach((i) => {
        for (let dy = -grow; dy <= grow; dy++) for (let dx = -grow; dx <= grow; dx++) { const j = i + dy * S + dx; if (j >= 0 && j < S * S) mask[j] = 1; }
    });
    return mask;
};

const save = async (name, png, { scale = 1, quality = 90, alpha = 100, blur = 0 } = {}) => {
    const box = boxOf(await rawOf(png));
    let img = sharp(png).extract({ left: box[0], top: box[1], width: box[2], height: box[3] });
    if (scale !== 1) img = sharp(await img.png().toBuffer()).resize(Math.round(box[2] * scale), Math.round(box[3] * scale), { kernel: 'lanczos3' });
    if (blur) img = sharp(await img.png().toBuffer()).blur(blur);
    await img.webp({ quality, alphaQuality: alpha, effort: 6 }).toFile(path.join(target, `${name}.webp`));
    return box;
};

await mkdir(target, { recursive: true });
const scene = { size: S, boxes: {}, sky: [], beings: [], pollen: { far: [], near: [] }, crowns: [] };

for (const [name, { layers, ...how }] of Object.entries(pictures)) scene.boxes[name] = await save(name, await flatten(layers), how);

// The beings: the head under its lines (the right one's eyes apart), and the stipple of the aura where it shows
for (const being of BEINGS) {
    const head = await rawOf(await layer(being.head));
    const headBox = boxOf(head);
    const lines = await rawOf(await layer(being.lines));
    if (being.eyes) {
        // The two dot eyes: small round blobs of the lines inside the head, side by side
        const [hx, hy, hw, hh] = headBox;
        const inside = (b) => b.x > hx + hw * 0.2 && b.x < hx + hw * 0.85 && b.y > hy + hh * 0.5 && b.y < hy + hh;
        const eyes = blobsOf(lines).filter((b) => inside(b) && b.area < 400 && b.area > 15)
            .filter((b) => { const w = b.box[2] - b.box[0] + 1, h = b.box[3] - b.box[1] + 1; return w / h > 0.6 && w / h < 1.6 && b.area / (w * h) > 0.6; });
        if (eyes.length !== 2) throw new Error(`Expected two eyes, found ${eyes.length}`);
        const only = Buffer.alloc(S * S * 4);
        for (const eye of eyes) {
            const mask = around(eye, 2);
            for (let i = 0; i < S * S; i++) {
                if (!mask[i]) continue;
                lines.copy(only, i * 4, i * 4, i * 4 + 4);
                lines[i * 4 + 3] = 0;
            }
        }
        scene.boxes[`eyes${being.name.slice(-1)}`] = await save(`eyes${being.name.slice(-1)}`, await pngOf(only));
    }
    const whole = await flatten([being.head, await pngOf(lines)]);
    scene.boxes[being.name] = await save(being.name, whole);
    const body = await rawOf(whole);
    const aura = await rawOf(await layer(being.aura));
    let r = 0, g = 0, b = 0, n = 0;
    const dots = [];
    const STEP = 3;
    for (let y = 0; y < S; y += STEP) {
        for (let x = 0; x < S; x += STEP) {
            const i = (y * S + x) * 4;
            const a = aura[i + 3] / 255;
            if (a < 0.05) continue;
            r += aura[i]; g += aura[i + 1]; b += aura[i + 2]; n++;
            if (body[i + 3] > 200 || Math.random() > a) continue;
            dots.push([x + Math.round((Math.random() - 0.5) * STEP), y + Math.round((Math.random() - 0.5) * STEP), +(1.7 + Math.random() * 1.5).toFixed(1)]);
        }
    }
    scene.beings.push({ name: being.name, head: headBox, aura: hex(r / n, g / n, b / n), dots });
}

// The crowns: in each sector round the middle, the leaves of the ring nearest the opening (a band DEEP px thick from
// where they begin), their middle
{
    const CROWNS = 20, DEEP = 300;
    const data = await rawOf(await layer(9));
    const sector = (x, y) => Math.floor(((Math.atan2(y - S / 2, x - S / 2) / (2 * Math.PI)) + 1) % 1 * CROWNS);
    const near = new Array(CROWNS).fill(S);
    for (let y = 0; y < S; y += 2) for (let x = 0; x < S; x += 2) {
        if (data[(y * S + x) * 4 + 3] < 128) continue;
        const s = sector(x, y), d = Math.hypot(x - S / 2, y - S / 2);
        if (d < near[s]) near[s] = d;
    }
    const sum = Array.from({ length: CROWNS }, () => [0, 0, 0]);
    for (let y = 0; y < S; y += 2) for (let x = 0; x < S; x += 2) {
        if (data[(y * S + x) * 4 + 3] < 128) continue;
        const s = sector(x, y), d = Math.hypot(x - S / 2, y - S / 2);
        if (d > near[s] + DEEP) continue;
        sum[s][0] += x; sum[s][1] += y; sum[s][2]++;
    }
    scene.crowns = sum.filter(([, , n]) => n > 100).map(([x, y, n]) => [Math.round(x / n), Math.round(y / n), DEEP + 60]);
}

// The pollen: every yellow dot, as a dot, where it can be seen
{
    const dotsOf = async (n, cover) => {
        const data = await rawOf(await layer(n));
        const over = await rawOf(await flatten(cover));
        return blobsOf(data).filter((b) => b.area >= 2 && over[(Math.round(b.y) * S + Math.round(b.x)) * 4 + 3] < 235)
            .map((b) => [Math.round(b.x), Math.round(b.y), +Math.max(1.2, Math.sqrt(b.area / Math.PI) + 0.4).toFixed(1)]);
    };
    scene.pollen.far = await dotsOf(10, [6, 5, 7, 9]);
    scene.pollen.near = await dotsOf(1, [9]);
}

// The sky: the card's teal in the opening, averaged in rings round the middle of the frame
{
    const { data, info } = await sharp(card).resize(S, S).raw().toBuffer({ resolveWithObject: true });
    const ch = info.channels;
    const RING = 120;
    for (let ring = 0; ring < 6; ring++) {
        let r = 0, g = 0, b = 0, n = 0;
        for (let y = 0; y < S; y += 3) {
            for (let x = 0; x < S; x += 3) {
                const d = Math.hypot(x - S / 2, y - S / 2);
                if (d < ring * RING || d >= (ring + 1) * RING) continue;
                const i = (y * S + x) * ch;
                // Only the sky: blue clearly over red, not the beings' lighter blue nor their navy lines
                if (!(data[i + 2] > data[i] + 60 && data[i + 2] > 110 && data[i + 2] < 175 && data[i + 1] < 130)) continue;
                r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
            }
        }
        if (n > 50) scene.sky.push([(ring + 0.5) * RING, hex(r / n, g / n, b / n)]);
    }
}

await writeFile(path.join(root, 'src', 'composables', 'comunicacionScene.json'), JSON.stringify(scene));
console.log(Object.entries(scene.boxes).map(([k, v]) => `${k} ${v.join(',')}`).join('; '));
console.log('sky', scene.sky.map(([d, c]) => `${d}:#${c.toString(16).padStart(6, '0')}`).join(' '));
console.log('beings', scene.beings.map((b) => `${b.name} head ${b.head} aura #${b.aura.toString(16)} ${b.dots.length} dots`).join('; '));
console.log('pollen far', scene.pollen.far.length, 'near', scene.pollen.near.length, 'crowns', JSON.stringify(scene.crowns));
