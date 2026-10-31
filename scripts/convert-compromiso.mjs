// The layers of Compromiso as exported (originales/compromiso/Ilustración_sin_título-N.png, 3240x4050, a 4:5 portrait)
// -> public/assets/compromiso/*.webp, each cropped to its own box, and src/composables/compromisoScene.json, all in px of
// the 2160x2700 space the layers are scaled to (so sizes match the other scenes):
//   boxes      the box of every picture
//   ground     the pale mint round the sky and the mushroom: not a layer (the exported background is empty), it is the
//              colour of the finished card's corner (public/cards/16.webp)
//   dome       the night sky is not a picture: the navy dome (8) is a circle fitted to its edge ([x, y, r]), with its colour,
//              and the colour and width of its outline (the arc of 10), so the scene draws it whole, also past the frame
//   cap        neither is the mushroom's cap: the coral fill (2) is an ellipse fitted to its edges (centre, half axes, tilt
//              in degrees), with its colour; its outline (in 10) is drawn in code round it
//   stars      every dot of the starry sky (9) as [x, y, radius, 0 teal | 1 yellow], for particles
//   farStars   stars for the part of the dome past the frame (made here, as dense and as mixed as the drawn ones)
//   glints     the three yellow strokes by the boat (in 9): a small picture, glints.webp
//   water      the four marbled pieces of the water (1), one picture each (water0..3: top left, top right, bottom left,
//              bottom right), and which side of the frame each touches, to be mirrored past it
//   beings     where each being stands (its feet: it breathes and hops from there)
//   rulito     where the card draws the rulito (the yellow loop in the sky, in 9): not converted, the game draws it in code
// Pictures: stem (3 and 4: the path, with its shading), runes (5, the signs on the path), gills (6, the coral gills and
// the signs on the cap), lines (10 without the arcs of the dome and of the cap: the gills' dark lines and the path's
// edges), hull (11), boatLine (13, the boat's line and its curls), big and small (12 and 14: each being's body and hair;
// the pole goes with the big one), plant (14: the little plant in the boat), eyes and eyesSmall (14).
// Not converted: 7 (empty), 8 (the dome, in code), 2 (the cap, in code), the arcs of the dome and the cap in 10 (code),
// the stars of 9 (particles), the rulito (in 9, drawn in code by the game) and the little cross with dots on the big
// being's forehead (14) and among the signs of the cap (6): the Algo Particular mark, a signature, dropped from the scenes.
// The originals are not kept in the repo once converted. Usage: node scripts/convert-compromiso.mjs [folder of originals]
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = process.argv[2] ? path.resolve(process.argv[2]) : path.join(root, 'originales', 'compromiso');
const target = path.join(root, 'public', 'assets', 'compromiso');
const file = (n) => path.join(source, `Ilustración_sin_título-${n}.png`);
const W = 2160, H = 2700;
const PAD = 4;
const SOLID = 110;
const LINE = 12;                            // the width of the outlines (px of the 2160 space)

const webp = (img, quality = 88, alphaQuality = 100) => img.webp({ quality, alphaQuality, effort: 6 });
const scaled = async (n) => sharp(await sharp(file(n)).resize(W, H, { kernel: 'lanczos3' }).png().toBuffer());
const load = async (n) => (await (await scaled(n)).ensureAlpha().raw().toBuffer({ resolveWithObject: true })).data;
const blank = () => Buffer.alloc(W * H * 4);
const hex = (r, g, b) => (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
// A seeded random, so the far stars are the same every time it runs
let seed = 16;
const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

const boxOf = (data, keep = () => true) => {
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            const i = y * W + x;
            if (data[i * 4 + 3] < 4 || !keep(i)) continue;
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

// Every blob of solid pixels: its pixels, area, centre and box
const blobsOf = (data) => {
    const seen = new Uint8Array(W * H);
    const blobs = [];
    const stack = [];
    const solid = (i) => data[i * 4 + 3] >= SOLID;
    for (let start = 0; start < W * H; start++) {
        if (seen[start] || !solid(start)) continue;
        const pixels = [];
        let sx = 0, sy = 0, x0 = W, y0 = H, x1 = 0, y1 = 0;
        stack.push(start);
        seen[start] = 1;
        while (stack.length) {
            const i = stack.pop();
            const x = i % W, y = (i - x) / W;
            pixels.push(i);
            sx += x; sy += y;
            x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
            for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1]) {
                if (j < 0 || seen[j] || !solid(j)) continue;
                seen[j] = 1;
                stack.push(j);
            }
        }
        blobs.push({ pixels, area: pixels.length, x: sx / pixels.length, y: sy / pixels.length, box: [x0, y0, x1, y1] });
    }
    return blobs.sort((a, b) => b.area - a.area);
};

// Grows a set of pixels by r px (with what is round them: the soft edge of a blob)
const grow = (mask, r) => {
    const out = new Uint8Array(W * H);
    const tmp = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (!mask[y * W + x]) continue;
        for (let dx = -r; dx <= r; dx++) { const xx = x + dx; if (xx >= 0 && xx < W) tmp[y * W + xx] = 1; }
    }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (!tmp[y * W + x]) continue;
        for (let dy = -r; dy <= r; dy++) { const yy = y + dy; if (yy >= 0 && yy < H) out[yy * W + x] = 1; }
    }
    return out;
};
// Only the pixels of a layer that `keep` (a mask) lets in
const only = (data, keep) => {
    const out = Buffer.from(data);
    for (let i = 0; i < W * H; i++) if (!keep[i]) out[i * 4 + 3] = 0, out[i * 4] = out[i * 4 + 1] = out[i * 4 + 2] = 0;
    return out;
};
const maskOf = (blobs, soft = 2) => {
    const m = new Uint8Array(W * H);
    blobs.forEach((b) => b.pixels.forEach((i) => { m[i] = 1; }));
    return grow(m, soft);
};
const inRect = ([x0, y0, x1, y1]) => (b) => b.box[0] >= x0 && b.box[1] >= y0 && b.box[2] <= x1 && b.box[3] <= y1;
// Layers flattened over each other (raw buffers, in order)
const over = (...layers) => {
    const out = blank();
    for (const d of layers) {
        for (let i = 0; i < W * H; i++) {
            const a = d[i * 4 + 3] / 255;
            if (!a) continue;
            const b = out[i * 4 + 3] / 255;
            const oa = a + b * (1 - a);
            for (let c = 0; c < 3; c++) out[i * 4 + c] = Math.round((d[i * 4 + c] * a + out[i * 4 + c] * b * (1 - a)) / oa);
            out[i * 4 + 3] = Math.round(oa * 255);
        }
    }
    return out;
};
// Saves a picture cropped to its box. Under what is see-through it puts the picture's own colour (with `flat`, a
// picture of one colour, everywhere): the edges of the line work then cost next to nothing. `scale` makes a big soft
// picture smaller (it is drawn in the same box); `alpha` below 100 lets the big line work keep its edges a little less
// exactly (a third of the weight, and it is not seen once the picture is drawn at the size of a screen)
const save = async (name, data, { quality = 88, alpha = 100, flat = false, scale = 1 } = {}) => {
    const box = boxOf(data);
    const fill = average(data, () => true, 128);
    let img = sharp(data, { raw: { width: W, height: H, channels: 4 } }).extract({ left: box[0], top: box[1], width: box[2], height: box[3] });
    if (scale < 1) img = sharp(await img.png().toBuffer()).resize(Math.round(box[2] * scale), Math.round(box[3] * scale), { kernel: 'lanczos3' });
    const { data: px, info } = await img.raw().toBuffer({ resolveWithObject: true });
    for (let i = 0; i < info.width * info.height; i++) {
        if (!flat && px[i * 4 + 3] > 0) continue;
        px[i * 4] = fill >> 16; px[i * 4 + 1] = (fill >> 8) & 255; px[i * 4 + 2] = fill & 255;
    }
    img = sharp(px, { raw: info });
    await webp(img, quality, alpha).toFile(path.join(target, `${name}.webp`));
    scene.boxes[name] = box;
    return box;
};
const average = (data, keep = () => true, solid = 250) => {
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < W * H; i += 3) {
        if (data[i * 4 + 3] < solid || !keep(i)) continue;
        r += data[i * 4]; g += data[i * 4 + 1]; b += data[i * 4 + 2]; n++;
    }
    return hex(r / n, g / n, b / n);
};
// Least squares for y = a + b x + c x²
const quadratic = (points) => {
    const S = [0, 0, 0, 0, 0], T = [0, 0, 0];
    for (const [x, y] of points) { const u = x / 1000; let p = 1; for (let k = 0; k < 5; k++) { S[k] += p; if (k < 3) T[k] += y * p; p *= u; } }
    const M = [[S[0], S[1], S[2]], [S[1], S[2], S[3]], [S[2], S[3], S[4]]];
    const [a, b, c] = solve(M, T);
    return [a, b / 1000, c / 1e6];
};
const det = (m) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
const solve = (M, T) => { const D = det(M); return [0, 1, 2].map((c) => det(M.map((row, r) => row.map((v, j) => (j === c ? T[r] : v)))) / D); };

await mkdir(target, { recursive: true });
const scene = { size: W, height: H, boxes: {}, ground: 0, dome: null, cap: null, stars: [], farStars: [], water: [], beings: {}, rulito: null };

// The ground: the mint of the finished card's corner
{
    const { data, info } = await sharp(path.join(root, 'public', 'cards', '16.webp')).raw().toBuffer({ resolveWithObject: true });
    const i = (20 * info.width + 20) * info.channels;
    scene.ground = hex(data[i], data[i + 1], data[i + 2]);
}

// The dome: the circle that fits the edge of the navy (its top, column by column)
const sky = await load(8);
{
    const points = [];
    for (let x = 0; x < W; x += 3) for (let y = 0; y < 1300; y++) if (sky[(y * W + x) * 4 + 3] > 128) { if (y > 2) points.push([x, y]); break; }
    let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0, sxz = 0, syz = 0, sz = 0;
    for (const [x, y] of points) { const z = x * x + y * y; sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y; sxz += x * z; syz += y * z; sz += z; }
    const [A, B, C] = solve([[sxx, sxy, sx], [sxy, syy, sy], [sx, sy, points.length]], [sxz, syz, sz]);
    const cx = A / 2, cy = B / 2;
    scene.dome = { x: Math.round(cx), y: Math.round(cy), r: Math.round(Math.sqrt(C + cx * cx + cy * cy)), color: average(sky), line: 0, width: LINE };
}

// The cap: an ellipse through the top and bottom of the coral, away from the stem (which hides its bottom)
const capLayer = await load(2);
{
    const rows = [];
    for (let x = 0; x < W; x += 4) {
        let t = -1, b = -1;
        for (let y = 1100; y < 1900; y++) if (capLayer[(y * W + x) * 4 + 3] > 128) { if (t < 0) t = y; b = y; }
        if (t >= 0 && (x < 660 || x > 1660)) rows.push([x, t, b]);
    }
    // The middle line, straight (it is tilted a little)
    let sx = 0, sy = 0, sxx = 0, sxy = 0;
    rows.forEach(([x, t, b]) => { const y = (t + b) / 2; sx += x; sy += y; sxx += x * x; sxy += x * y; });
    const m1 = (rows.length * sxy - sx * sy) / (rows.length * sxx - sx * sx), m0 = (sy - m1 * sx) / rows.length;
    const [h0, h1, h2] = quadratic(rows.map(([x, t, b]) => [x, ((b - t) / 2) ** 2]));
    const cx = -h1 / (2 * h2);
    const b2 = h0 + h1 * cx + h2 * cx * cx;
    scene.cap = {
        x: Math.round(cx), y: Math.round(m0 + m1 * cx), a: Math.round(Math.sqrt(-b2 / h2)), b: Math.round(Math.sqrt(b2)),
        tilt: +(Math.atan(m1) * 180 / Math.PI).toFixed(2), color: average(capLayer),
    };
}

// The line work (10): without the arc of the dome and the outline of the cap, which are drawn in code. What is on the
// path's edge stays (the outline of the cap meets it there)
const stemFill = await load(3);
{
    const lines = await load(10);
    scene.dome.line = average(lines);
    const { dome, cap } = scene;
    const path3 = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) if (stemFill[i * 4 + 3] > 128) path3[i] = 1;
    const nearPath = grow(path3, 10);
    const tan = Math.tan(cap.tilt * Math.PI / 180);
    const keep = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            const i = y * W + x;
            if (!lines[i * 4 + 3]) continue;
            keep[i] = 1;
            if (nearPath[i]) continue;
            const capTop = (() => { const u = (x - cap.x) / cap.a; const h = cap.b * Math.sqrt(Math.max(0, 1 - u * u)); const m = cap.y + tan * (x - cap.x); return [m - h, m + h]; })();
            if (Math.abs(Math.hypot(x - dome.x, y - dome.y) - dome.r) < 18 && y < capTop[0] + 20) keep[i] = 0;
            if (Math.abs(y - capTop[0]) < 24 || Math.abs(y - capTop[1]) < 24) keep[i] = 0;
        }
    }
    // What is left of an arc, cut off from the rest: crumbs
    const kept = only(lines, keep);
    const crumbs = blobsOf(kept).filter((b) => b.area < 60);
    crumbs.forEach((b) => b.pixels.forEach((i) => { kept[i * 4 + 3] = 0; }));
    await save('lines', kept, { flat: true, alpha: 70 });
}

// The mushroom: the path (with its shading), its signs, the gills
await save('stem', over(stemFill, await load(4)));
await save('runes', await load(5), { flat: true });
{
    // Among the signs on the cap, the little cross with its four dots is the Algo Particular mark: dropped
    const gills = await load(6);
    const mark = blobsOf(gills).filter(inRect([578, 1254, 662, 1340]));
    mark.forEach((b) => b.pixels.forEach((i) => { gills[i * 4 + 3] = 0; }));
    const soft = maskOf(mark, 2);
    for (let i = 0; i < W * H; i++) if (soft[i]) gills[i * 4 + 3] = 0;
    await save('gills', gills, { flat: true, alpha: 70 });
}

// The water: its four marbled pieces, each with the side of the frame it touches
{
    const data = await load(1);
    const blobs = blobsOf(data).filter((b) => b.area > 30);
    const corners = [[0, 0], [1, 0], [0, 1], [1, 1]];
    const pieces = corners.map(() => []);
    blobs.forEach((b) => {
        const k = corners.findIndex(([cx, cy]) => (b.x > W / 2) === !!cx && (b.y > 1300) === !!cy);
        pieces[k].push(b);
    });
    for (const [k, piece] of pieces.entries()) {
        const box = await save(`water${k}`, only(data, maskOf(piece, 3)), { quality: 80, scale: 0.75 });
        scene.water.push({ name: `water${k}`, side: box[0] <= 2 ? -1 : box[0] + box[2] >= W - 2 ? 1 : 0 });
    }
}

// The stars: every dot as a particle; the three yellow strokes by the boat stay a picture and the yellow loop in the sky
// is the rulito
{
    const data = await load(9);
    const blobs = blobsOf(data).filter((b) => b.area >= 2);
    const yellow = (b) => { const i = b.pixels[0] * 4; return data[i] > 180 && data[i + 2] < 120; };
    const rulito = blobs.find((b) => b.area > 1500 && yellow(b));
    scene.rulito = [rulito.box[0] - PAD, rulito.box[1] - PAD, rulito.box[2] - rulito.box[0] + 1 + 2 * PAD, rulito.box[3] - rulito.box[1] + 1 + 2 * PAD];
    const glints = blobs.filter((b) => b !== rulito && b.area > 300 && yellow(b) && (b.box[2] - b.box[0]) > 1.6 * (b.box[3] - b.box[1]));
    await save('glints', only(data, maskOf(glints, 3)), { flat: true });
    for (const b of blobs) {
        if (b === rulito || glints.includes(b)) continue;
        scene.stars.push([Math.round(b.x), Math.round(b.y), +Math.sqrt(b.area / Math.PI).toFixed(1), yellow(b) ? 1 : 0]);
    }
    // As many again for the part of the dome outside the frame, as dense as inside
    const { dome } = scene;
    const inside = (x, y) => Math.hypot(x - dome.x, y - dome.y) < dome.r - 20 && y < scene.cap.y;
    let area = 0;
    for (let y = 0; y < H; y += 10) for (let x = 0; x < W; x += 10) if (inside(x, y)) area += 100;
    const density = scene.stars.length / area;
    const [x0, x1, y0] = [dome.x - dome.r, dome.x + dome.r, dome.y - dome.r];
    const n = Math.round(density * (x1 - x0) * (scene.cap.y - y0));
    for (let k = 0; k < n; k++) {
        const x = x0 + random() * (x1 - x0), y = y0 + random() * (scene.cap.y - y0);
        if (!inside(x, y) || (x >= 0 && x < W && y >= 0)) continue;
        const [, , r, c] = scene.stars[Math.floor(random() * scene.stars.length)];
        scene.farStars.push([Math.round(x), Math.round(y), r, c]);
    }
}

// The boat and the two beings in it: the hull, the line with its curls, each being (body and hair), the little plant,
// the eyes on their own (to blink). The little cross on the big being's forehead is the Algo Particular mark: dropped
{
    await save('hull', await load(11), { flat: true });
    await save('boatLine', await load(13), { flat: true });
    const bodies = await load(12);
    const hair = await load(14);
    const EYES = [1112, 942, 1182, 988], EYES_SMALL = [906, 1003, 946, 1024], MARK = [1104, 850, 1166, 910];
    const SMALL = [820, 820, 1000, 1045];
    const hairBlobs = blobsOf(hair);
    const plant = hairBlobs.filter((b) => b.x < 787);
    const eyes = hairBlobs.filter(inRect(EYES));
    const eyesSmall = hairBlobs.filter(inRect(EYES_SMALL));
    const mark = hairBlobs.filter(inRect(MARK));
    const small = hairBlobs.filter((b) => !eyesSmall.includes(b) && inRect(SMALL)(b));
    const big = hairBlobs.filter((b) => b.area > 6 && ![plant, eyes, eyesSmall, mark, small].some((list) => list.includes(b)));
    const bodyBlobs = blobsOf(bodies).filter((b) => b.area > 30);
    const bodySmall = bodyBlobs.filter((b) => b.x < 987), bodyBig = bodyBlobs.filter((b) => b.x >= 987);
    await save('plant', only(hair, maskOf(plant)), { flat: true });
    await save('small', over(only(bodies, maskOf(bodySmall)), only(hair, maskOf(small))));
    await save('big', over(only(bodies, maskOf(bodyBig)), only(hair, maskOf(big))));
    await save('eyes', only(hair, maskOf(eyes)), { flat: true });
    await save('eyesSmall', only(hair, maskOf(eyesSmall)), { flat: true });
    const feet = (blobs) => { const b = blobs[0].box; return [Math.round((b[0] + b[2]) / 2), b[3]]; };
    scene.beings = { big: { feet: feet(bodyBig) }, small: { feet: feet(bodySmall) } };
    console.log('mark', mark.length, 'blobs dropped; eyes', eyes.length, eyesSmall.length, '; plant', plant.length, 'small hair', small.length);
}

await writeFile(path.join(root, 'src', 'composables', 'compromisoScene.json'), JSON.stringify(scene));
console.log(Object.keys(scene.boxes).length, 'pictures; dome', JSON.stringify(scene.dome), 'cap', JSON.stringify(scene.cap), ';', scene.stars.length, 'stars,',
    scene.farStars.length, 'far ones; water', JSON.stringify(scene.water), 'rulito', scene.rulito, 'ground', scene.ground.toString(16));
