// The layers of Sincronicidad as exported (originales/sincronicidad/Sincronicidad-N.png, 3240px) -> scaled to the 2160
// square of the other scenes -> public/assets/sincronicidad/*.webp, each cropped to its own box, and
// src/composables/sincronicidadScene.json, all in px of the 2160 square:
//   boxes      the box of every picture: the ground with its stones and the hearth (6-10), the flame (3-5), and the four
//              bubbles of the sequence, each its skin (the teal rims and the pink) apart from the larvae in it, so they
//              can breathe inside: egg1 (34, 35) with its larva (37, 38), egg2 (29, 30) with its larva (32, 33), the
//              meeting (21-23) with its two larvae (25-26, 27-28) and the pair (11-13) with its two (15-17, 18-20)
//   hearts     the soft salmon light inside each bubble (36, 31, 24, 14) is not a picture: the ellipse of its solid middle
//              ([x, y, rx, ry, angle in degrees]) drawn as a disc in code, and its stippled rim as dots, flat
//              [x, y, radius x 10, ...] (as dense as the stipple was), so the inside of every bubble is alive
//   stars      the dots of the sky (1, pink, and 2, yellow), flat [x, y, radius x 10, 0 pink | 1 yellow, ...]; the one long stroke
//              among them (a shooting star) is not a dot and is left out: the scene draws its shooting stars in code
//   edge       the top of the ground at the left and right edges of the square, so the land can go on past the frame
// The sky has no layer (it is the card's flat colour): the scene draws it in code. Every layer is used.
// The originals are not kept in the repo once converted. Usage: node scripts/convert-sincronicidad.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'originales', 'sincronicidad');
const target = path.join(root, 'public', 'assets', 'sincronicidad');
const file = (n) => path.join(source, `Sincronicidad-${n}.png`);
const S = 2160;

// Pictures made of one or more layers, drawn in this order
const pictures = {
    ground: [6, 7, 8, 9, 10], flame: [3, 4, 5],
    egg1: [34, 35], egg1Larva: [37, 38],
    egg2: [29, 30], egg2Larva: [32, 33],
    meeting: [21, 22, 23], meetingA: [25, 26], meetingB: [27, 28],
    pair: [11, 12, 13], pairA: [15, 16, 17], pairB: [18, 19, 20],
};
// The soft salmon light inside each bubble, in the order of the sequence
const hearts = { egg1: 36, egg2: 31, meeting: 24, pair: 14 };
const PAD = 4;
const SOLID = 110;

// Every layer scaled to the 2160 square once
const scaled = new Map();
const layer = async (n) => {
    if (!scaled.has(n)) scaled.set(n, await sharp(file(n)).resize(S, S).png().toBuffer());
    return scaled.get(n);
};
const rawOf = async (png) => (await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true })).data;
const webp = (img) => img.webp({ quality: 88, alphaQuality: 100, effort: 5 });
const flatten = async (layers) => sharp({ create: { width: S, height: S, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(await Promise.all(layers.map(async (n) => ({ input: await layer(n) })))).png().toBuffer();

const boxOf = (data, W, H) => {
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            if (data[(y * W + x) * 4 + 3] < 4) continue;
            if (x < x0) x0 = x;
            if (x > x1) x1 = x;
            if (y < y0) y0 = y;
            if (y > y1) y1 = y;
        }
    }
    x0 = Math.max(0, x0 - PAD); y0 = Math.max(0, y0 - PAD);
    x1 = Math.min(W - 1, x1 + PAD); y1 = Math.min(H - 1, y1 + PAD);
    return [x0, y0, x1 - x0 + 1, y1 - y0 + 1];
};

// Every blob of solid pixels: its area, centre and box
const blobsOf = (data, W, H) => {
    const seen = new Uint8Array(W * H);
    const blobs = [];
    const stack = [];
    const solid = (i) => data[i * 4 + 3] >= SOLID;
    for (let start = 0; start < W * H; start++) {
        if (seen[start] || !solid(start)) continue;
        let area = 0, sx = 0, sy = 0, x0 = W, y0 = H, x1 = 0, y1 = 0;
        stack.push(start);
        seen[start] = 1;
        while (stack.length) {
            const i = stack.pop();
            const x = i % W, y = (i - x) / W;
            area++; sx += x; sy += y;
            x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
            for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1]) {
                if (j < 0 || seen[j] || !solid(j)) continue;
                seen[j] = 1;
                stack.push(j);
            }
        }
        blobs.push({ area, x: sx / area, y: sy / area, w: x1 - x0 + 1, h: y1 - y0 + 1 });
    }
    return blobs;
};

await mkdir(target, { recursive: true });
const scene = { size: S, boxes: {}, hearts: {}, stars: [], edge: [0, 0] };

// Plain pictures
for (const [name, layers] of Object.entries(pictures)) {
    const flat = await flatten(layers);
    const box = boxOf(await rawOf(flat), S, S);
    await webp(sharp(flat).extract({ left: box[0], top: box[1], width: box[2], height: box[3] })).toFile(path.join(target, `${name}.webp`));
    scene.boxes[name] = box;
}

// The light inside each bubble: the ellipse of its solid middle (from the moments of where the stipple, blurred, is
// nearly solid) and its stippled rim as dots, as dense as the stipple is there
for (const [name, n] of Object.entries(hearts)) {
    const png = await layer(n);
    const alpha = await rawOf(png);
    const soft = await sharp(png).ensureAlpha().extractChannel(3).blur(5).raw().toBuffer();
    let m = 0, mx = 0, my = 0;
    const core = [];
    for (let i = 0; i < S * S; i++) if (soft[i] > 235) { const x = i % S, y = (i - x) / S; core.push(x, y); m++; mx += x; my += y; }
    mx /= m; my /= m;
    let sxx = 0, syy = 0, sxy = 0;
    for (let k = 0; k < core.length; k += 2) { const dx = core[k] - mx, dy = core[k + 1] - my; sxx += dx * dx; syy += dy * dy; sxy += dx * dy; }
    sxx /= m; syy /= m; sxy /= m;
    const tr = (sxx + syy) / 2, det = Math.sqrt(((sxx - syy) / 2) ** 2 + sxy * sxy);
    const l1 = tr + det, l2 = tr - det;
    const angle = 0.5 * Math.atan2(2 * sxy, sxx - syy);
    // A uniform ellipse has variance (semi-axis / 2)^2 along each axis
    const rx = 2 * Math.sqrt(l1), ry = 2 * Math.sqrt(l2);
    const inside = (x, y, shrink) => {
        const dx = x - mx, dy = y - my;
        const u = dx * Math.cos(angle) + dy * Math.sin(angle), v = -dx * Math.sin(angle) + dy * Math.cos(angle);
        return (u / (rx * shrink)) ** 2 + (v / (ry * shrink)) ** 2 < 1;
    };
    // The colour: the average of its solid pixels
    let r = 0, g = 0, b = 0, c = 0;
    for (let i = 0; i < S * S; i++) if (alpha[i * 4 + 3] > 240) { r += alpha[i * 4]; g += alpha[i * 4 + 1]; b += alpha[i * 4 + 2]; c++; }
    const color = (Math.round(r / c) << 16) | (Math.round(g / c) << 8) | Math.round(b / c);
    const STEP = 5;
    const dots = [];
    let seed = n * 7919;
    const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let y = 0; y < S; y += STEP) {
        for (let x = 0; x < S; x += STEP) {
            const a = soft[y * S + x] / 255;
            if (a < 0.05 || inside(x, y, 0.94)) continue;
            if (random() > a * 0.85) continue;
            dots.push(x + Math.round((random() - 0.5) * STEP), y + Math.round((random() - 0.5) * STEP), Math.round(20 + random() * 14));
        }
    }
    scene.hearts[name] = { ellipse: [Math.round(mx), Math.round(my), Math.round(rx), Math.round(ry), +(angle * 180 / Math.PI).toFixed(1)], color, dots };
}

// The stars: one dot per blob; a long stroke (the shooting star) is left out
for (const [k, n] of [1, 2].entries()) {
    const data = await rawOf(await layer(n));
    for (const b of blobsOf(data, S, S)) {
        if (b.area < 2) continue;
        if (Math.max(b.w, b.h) / Math.min(b.w, b.h) > 2.5 && b.area > 30) continue;
        scene.stars.push(Math.round(b.x), Math.round(b.y), Math.round(10 * Math.max(0.8, Math.sqrt(b.area / Math.PI))), k);
    }
}

// The top of the ground at the left and right edges
{
    const data = await rawOf(await layer(6));
    const top = (x) => { for (let y = 0; y < S; y++) if (data[(y * S + x) * 4 + 3] > 128) return y; return S; };
    scene.edge = [top(1), top(S - 2)];
}

await writeFile(path.join(root, 'src', 'composables', 'sincronicidadScene.json'), JSON.stringify(scene));
console.log(Object.keys(scene.boxes).length, 'pictures;', scene.stars.length / 4, 'stars; hearts',
    Object.entries(scene.hearts).map(([name, h]) => `${name} ${JSON.stringify(h.ellipse)} #${h.color.toString(16)} ${h.dots.length / 3} dots`).join(', '), '; edge', scene.edge);
