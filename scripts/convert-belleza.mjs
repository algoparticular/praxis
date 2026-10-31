// The layers of Belleza as exported (originales/belleza/Destinados_3-N.png, 3240px) -> public/assets/belleza/*.webp, each
// scaled to the 2160 square of the other scenes and cropped to its own box, and src/composables/bellezaScene.json, all
// in px of the 2160 square:
//   boxes      the box of every picture
//   sky        the sky and the meadow are not pictures: the flat teal of the sky (5) and the green of the ground (3), as
//              colours for a gradient drawn in code, and horizon, the first row that is all ground; the line where they
//              meet is under the blue band of the far woods (1 and 2, horizon.webp), which is a picture
//   (pictures) the pink trees (fills 8, bark 9 and outlines 10, with the leaves of 6 at their tips) sorted into three
//              planes by where each one stands: treesFar (the little ones on the horizon), treesMid and treesNear (the
//              big ones at the sides), so each plane has its depth; the drawing of the ground (4, 7, 11, 12, the caps
//              of 13 and 14) in a band at the depth of each plane (groundFar, groundMid, groundNear)
//   canopy     the leaves of the canopy, the wavy strokes in the sky (the green 6 and the blue strokes of 10 that do not
//              belong to a tree), each cut out into one atlas (canopy.webp) so each can stir on its own: [x, y, w, h
//              where it is drawn, x, y where it is in the atlas]
//   bush, mushrooms, cairn  cut out of the ground as their own pictures, so they can sway and glow; caps is where each
//              mushroom's yellow cap is (13, solid: [x of its middle, y of its bottom, width]), for the sway
//   legs, left, right  the two beings in their embrace: their crossed legs (20, 25), the one behind (18, 19, 21 and its
//              eyes 30) and the one in front with the other's arm round it (22, 23, 24, 26, 27, 28, 29, 31), so each
//              can breathe on its own
//   motes      the loose yellow dots over the forest (15), as dots [x, y, radius]
//   aura       the yellow stipple round the two (16), as dots [x, y, radius], as dense as it is
//   spores     the yellow stipple round the mushrooms (13 but its caps), the same way
// Not converted: 17 came empty, and there is no rulito in this card (32 is the Algo Particular mark, a signature: it is cut out of the ground and dropped).
// The originals are not kept in the repo once converted. Usage: node scripts/convert-belleza.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'originales', 'belleza');
const target = path.join(root, 'public', 'assets', 'belleza');
const file = (n) => path.join(source, `Destinados_3-${n}.png`);
const ORIGINAL = 3240;
const S = 2160;
const PAD = 4;
const SOLID = 110;

// The two beings, and the pictures cut out of the ground (by where each blob of it is: [x0, y0, x1, y1] of the 2160 square)
const BEINGS = { legs: [20, 25], left: [18, 19, 21, 30], right: [22, 23, 24, 26, 27, 28, 29, 31] };
const GROUND = [4, 7, 11, 12, 13, 14, 32];
const MUSHROOM_GLOW = 13;
const REGIONS = { bush: [80, 1600, 500, 1890], mushrooms: [1700, 1630, 2050, 1800], cairn: [1910, 1380, 2030, 1510], mark: [1950, 1540, 2040, 1620] };
// Where a tree stands (the bottom of its trunk) says its plane: far above FAR, near below NEAR, mid between
const FAR = 960, NEAR = 1380;
const PLANES = ['Far', 'Mid', 'Near'];
const planeOf = (y) => (y < FAR ? 0 : y < NEAR ? 1 : 2);

const webp = (img, quality = 80) => img.webp({ quality, alphaQuality: quality >= 90 ? 90 : 50, effort: 6 });
// Layers (numbers) or raw buffers of the 3240 square, composited in order and scaled to the 2160 square
const scaled = async (layers) => {
    const flat = await sharp({ create: { width: ORIGINAL, height: ORIGINAL, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
        .composite(layers.map((n) => ({ input: file(n) }))).png().toBuffer();
    return sharp(flat).resize(S, S, { kernel: 'lanczos3' }).ensureAlpha().raw().toBuffer();
};
const hex = (r, g, b) => (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);

const boxOf = (data, keep = () => true) => {
    let x0 = S, y0 = S, x1 = -1, y1 = -1;
    for (let y = 0; y < S; y++) {
        for (let x = 0; x < S; x++) {
            const i = y * S + x;
            if (data[i * 4 + 3] < 4 || !keep(i)) continue;
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

// Every blob of pixels at least `solid` opaque (that `keep` lets in): its pixels, area, centre and box
const blobsOf = (data, solid = SOLID, keep = () => true) => {
    const seen = new Uint8Array(S * S);
    const blobs = [];
    const stack = [];
    const ok = (i) => data[i * 4 + 3] >= solid && keep(i);
    for (let start = 0; start < S * S; start++) {
        if (seen[start] || !ok(start)) continue;
        const pixels = [];
        let sx = 0, sy = 0, x0 = S, y0 = S, x1 = 0, y1 = 0;
        stack.push(start);
        seen[start] = 1;
        while (stack.length) {
            const i = stack.pop();
            const x = i % S, y = (i - x) / S;
            pixels.push(i);
            sx += x; sy += y;
            if (x < x0) x0 = x;
            if (x > x1) x1 = x;
            if (y < y0) y0 = y;
            if (y > y1) y1 = y;
            for (const j of [x > 0 ? i - 1 : -1, x < S - 1 ? i + 1 : -1, y > 0 ? i - S : -1, y < S - 1 ? i + S : -1]) {
                if (j < 0 || seen[j] || !ok(j)) continue;
                seen[j] = 1;
                stack.push(j);
            }
        }
        blobs.push({ pixels, area: pixels.length, x: sx / pixels.length, y: sy / pixels.length, box: [x0, y0, x1, y1] });
    }
    return blobs.sort((a, b) => b.area - a.area);
};

// A mask grown by r px (a square), in two passes
const dilate = (mask, r) => {
    const pass = (from, step, stride) => {
        const out = new Uint8Array(S * S);
        const sum = new Int32Array(S + 1);
        for (let line = 0; line < S; line++) {
            const at = (k) => line * stride + k * step;
            for (let k = 0; k < S; k++) sum[k + 1] = sum[k] + from[at(k)];
            for (let k = 0; k < S; k++) if (sum[Math.min(S, k + r + 1)] - sum[Math.max(0, k - r)] > 0) out[at(k)] = 1;
        }
        return out;
    };
    return pass(pass(mask, 1, S), S, 1);
};

// Writes the pixels of `data` that `keep` lets in as a picture cropped to their box
const cut = async (name, data, keep = () => true, quality) => {
    const only = Buffer.from(data);
    for (let i = 0; i < S * S; i++) if (!keep(i)) only[i * 4 + 3] = 0;
    const box = boxOf(only);
    await webp(sharp(only, { raw: { width: S, height: S, channels: 4 } }).extract({ left: box[0], top: box[1], width: box[2], height: box[3] }), quality)
        .toFile(path.join(target, `${name}.webp`));
    scene.boxes[name] = box;
    return box;
};

// Dots wherever a stipple is, as dense as it is
const stipple = (data, step, size) => {
    const dots = [];
    for (let y = 0; y < S; y += step) {
        for (let x = 0; x < S; x += step) {
            const a = data[(y * S + x) * 4 + 3] / 255;
            if (a < 0.05 || Math.random() > a * 0.9) continue;
            dots.push([x + Math.round((Math.random() - 0.5) * step), y + Math.round((Math.random() - 0.5) * step), +(size[0] + Math.random() * (size[1] - size[0])).toFixed(1)]);
        }
    }
    return dots;
};

await mkdir(target, { recursive: true });
const scene = { size: S, boxes: {}, sky: null, horizon: 0, canopy: [], atlas: [0, 0], caps: [], motes: [], aura: [], spores: [] };

// ---- The sky and the meadow: their colours (each layer is one flat colour; averaged over its solid pixels)
{
    const mean = (data) => {
        let r = 0, g = 0, b = 0, n = 0;
        for (let i = 0; i < S * S * 4; i += 4 * 7) { if (data[i + 3] < 250) continue; r += data[i]; g += data[i + 1]; b += data[i + 2]; n++; }
        return hex(r / n, g / n, b / n);
    };
    scene.sky = { sky: mean(await scaled([5])), ground: 0 };
    // Where the ground begins (the first row that is all of it), under the band of the far woods
    const ground = await scaled([3]);
    for (let y = 0; y < S; y++) {
        let all = true;
        for (let x = 0; x < S; x += 16) if (ground[(y * S + x) * 4 + 3] < 250) { all = false; break; }
        if (all) { scene.horizon = y; break; }
    }
    scene.sky.ground = mean(ground);
}

// ---- The far woods on the horizon
await cut('horizon', await scaled([1, 2]));

// ---- The trees, in three planes; the leaves of the canopy that belong to no tree, on their own
const leafLayers = await scaled([6, 10]);
{
    const fills = await scaled([8]);
    const trees = blobsOf(fills, 60).filter((b) => b.area > 400);
    // Each pixel of a fill belongs to the plane of its tree; the lines round it too (grown a little), the nearest first
    const plane = new Int8Array(S * S).fill(-1);
    const masks = [0, 1, 2].map(() => new Uint8Array(S * S));
    trees.forEach((b) => {
        const p = planeOf(b.box[3]);
        b.pixels.forEach((i) => { masks[p][i] = 1; });
    });
    const grown = masks.map((m) => dilate(m, 10));
    for (let p = 0; p < 3; p++) for (let i = 0; i < S * S; i++) if (grown[p][i]) plane[i] = p;
    // The lines (6 and 10) off every tree: a stroke that touches a tree stays with it (a leaf at the tip of a branch),
    // the bits low on the horizon go with the far trees, and the rest are the leaves of the canopy
    const leaf = new Uint8Array(S * S);
    blobsOf(leafLayers, 8, (i) => plane[i] < 0).forEach((b) => {
        const votes = [0, 0, 0];
        b.pixels.forEach((i) => {
            for (const j of [i - 2, i + 2, i - 2 * S, i + 2 * S]) if (j >= 0 && j < S * S && plane[j] >= 0) votes[plane[j]]++;
        });
        const most = Math.max(...votes);
        const p = most > 0 ? votes.indexOf(most) : b.y > scene.horizon - 120 ? 0 : -1;
        b.pixels.forEach((i) => { if (p < 0) leaf[i] = 1; else plane[i] = p; });
    });
    const trunks = await scaled([8, 9, 10, 6]);
    for (let p = 0; p < 3; p++) {
        await cut(`trees${PLANES[p]}`, trunks, (i) => plane[i] === p && !leaf[i]);
    }
    scene.leaf = leaf;
}

// ---- The leaves of the canopy: every one cut out into one atlas, packed in rows
{
    const leaf = scene.leaf;
    delete scene.leaf;
    const ATLAS_W = 1024, GAP = 6;
    const cuts = [];
    const pieces = blobsOf(leafLayers, 8, (i) => leaf[i]).filter((b) => b.area >= 30);
    for (const b of pieces) {
        let [x0, y0, x1, y1] = b.box;
        x0 = Math.max(0, x0 - 3); y0 = Math.max(0, y0 - 3); x1 = Math.min(S - 1, x1 + 3); y1 = Math.min(S - 1, y1 + 3);
        const w = x1 - x0 + 1, h = y1 - y0 + 1;
        const mine = new Set(b.pixels);
        const pixels = Buffer.alloc(w * h * 4);
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const i = (y0 + y) * S + x0 + x;
                // with its soft edge: the faint pixels round it that are not a leaf of their own
                let near = mine.has(i);
                if (!near && leafLayers[i * 4 + 3] < 8) continue;
                if (!near) for (let d = 1; d <= 2 && !near; d++) near = mine.has(i - d) || mine.has(i + d) || mine.has(i - d * S) || mine.has(i + d * S);
                if (near) leafLayers.copy(pixels, (y * w + x) * 4, i * 4, i * 4 + 4);
            }
        }
        cuts.push({ x: x0, y: y0, w, h, pixels });
    }
    cuts.sort((a, b) => b.h - a.h);
    let cx = GAP, cy = GAP, row = 0;
    for (const c of cuts) {
        if (cx + c.w + GAP > ATLAS_W) { cx = GAP; cy += row + GAP; row = 0; }
        c.ax = cx; c.ay = cy;
        cx += c.w + GAP;
        row = Math.max(row, c.h);
    }
    const ATLAS_H = cy + row + GAP;
    await webp(sharp({ create: { width: ATLAS_W, height: ATLAS_H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
        .composite(cuts.map((c) => ({ input: c.pixels, raw: { width: c.w, height: c.h, channels: 4 }, left: c.ax, top: c.ay }))))
        .toFile(path.join(target, 'canopy.webp'));
    scene.atlas = [ATLAS_W, ATLAS_H];
    scene.canopy = cuts.sort((a, b) => a.x - b.x).map((c) => [c.x, c.y, c.w, c.h, c.ax, c.ay]);
}

// ---- The ground: the bush, the mushrooms and the cairn on their own; the rest in three bands, one for each plane. The
// mushrooms' caps are the solid blobs of 13 (the rest of it is their glow, which is particles), between 12 and the lines
const shine = await scaled([MUSHROOM_GLOW]);
const capOf = new Int32Array(S * S).fill(-1);
{
    const [x0, y0, x1, y1] = REGIONS.mushrooms;
    // A cap is solid all through; the glow round it is dots (an opening: shrunk by 3 px, which loses the dots, and grown back)
    const solid = new Uint8Array(S * S);
    for (let i = 0; i < S * S; i++) solid[i] = shine[i * 4 + 3] < 200 ? 1 : 0;
    const core = dilate(solid, 3);
    for (let i = 0; i < S * S; i++) core[i] = core[i] ? 0 : 1;
    const mask = dilate(core, 4);
    const caps = blobsOf(shine, 1, (i) => mask[i] && core[i]).filter((b) => b.area > 40 && b.x >= x0 && b.x <= x1 && b.y >= y0 && b.y <= y1).sort((a, b) => a.x - b.x);
    for (let i = 0; i < S * S; i++) if (mask[i] && shine[i * 4 + 3] > 0) capOf[i] = 1;
    scene.caps = caps.map(({ box: [x0, , x1, y1] }) => [Math.round((x0 + x1) / 2), y1, x1 - x0 + 1]);
}
{
    const under = await scaled(GROUND.slice(0, GROUND.indexOf(MUSHROOM_GLOW)));
    const over = await scaled(GROUND.slice(GROUND.indexOf(MUSHROOM_GLOW) + 1));
    // under, the caps, over (straight alpha)
    const ground = Buffer.from(under);
    const lay = (top, keep = () => true) => {
        for (let i = 0; i < S * S; i++) {
            const a = keep(i) ? top[i * 4 + 3] / 255 : 0;
            if (!a) continue;
            const b = ground[i * 4 + 3] / 255;
            const out = a + b * (1 - a);
            for (let c = 0; c < 3; c++) ground[i * 4 + c] = Math.round((top[i * 4 + c] * a + ground[i * 4 + c] * b * (1 - a)) / out);
            ground[i * 4 + 3] = Math.round(out * 255);
        }
    };
    lay(shine, (i) => capOf[i] >= 0);
    lay(over);
    const region = new Int8Array(S * S).fill(-1);
    const names = Object.keys(REGIONS);
    const band = new Int8Array(S * S).fill(-1);
    blobsOf(ground, 8).forEach((b) => {
        const r = names.findIndex((n) => { const [x0, y0, x1, y1] = REGIONS[n]; return b.x >= x0 && b.x <= x1 && b.y >= y0 && b.y <= y1; });
        if (r >= 0) b.pixels.forEach((i) => { region[i] = r; });
        else { const p = planeOf(b.box[3]); b.pixels.forEach((i) => { band[i] = p; }); }
    });
    // The faint pixels round a blob go with it
    const near = (arr, i) => arr[i] >= 0 ? arr[i] : [i - 1, i + 1, i - S, i + S, i - 2, i + 2, i - 2 * S, i + 2 * S].map((j) => (j >= 0 && j < S * S ? arr[j] : -1)).find((v) => v >= 0) ?? -1;
    // The mark is the Algo Particular logo, a signature: the scenes do not show it
    for (const [r, name] of names.entries()) if (name !== 'mark') await cut(name, ground, (i) => near(region, i) === r);
    for (let p = 0; p < 3; p++) await cut(`ground${PLANES[p]}`, ground, (i) => near(region, i) < 0 && near(band, i) === p);
}

// ---- The two beings
for (const [name, layers] of Object.entries(BEINGS)) await cut(name, await scaled(layers), () => true, 90);

// ---- The particles: the loose dots over the forest, the stipple round the two and round the mushrooms
{
    const motes = await scaled([15]);
    scene.motes = blobsOf(motes, 40).filter((b) => b.area >= 2).map((b) => [Math.round(b.x), Math.round(b.y), +Math.max(1.2, Math.sqrt(b.area / Math.PI)).toFixed(1)]);
    scene.aura = stipple(await scaled([16]), 8, [2, 3.4]);
    scene.spores = stipple(shine.map((v, j) => ((j & 3) === 3 && capOf[j >> 2] >= 0 ? 0 : v)), 4, [1.4, 2.6]);
}

await writeFile(path.join(root, 'src', 'composables', 'bellezaScene.json'), JSON.stringify(scene));
console.log(Object.keys(scene.boxes).length, 'pictures;', 'sky', scene.sky.sky.toString(16), 'ground', scene.sky.ground.toString(16), 'from', scene.horizon, ';', scene.canopy.length, 'leaves in a', scene.atlas.join('x'), 'atlas;', scene.caps.length, 'caps', JSON.stringify(scene.caps),
    '; motes', scene.motes.length, 'aura', scene.aura.length, 'spores', scene.spores.length);
console.log(JSON.stringify(scene.boxes));
