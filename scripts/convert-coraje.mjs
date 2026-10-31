// The layers of Coraje as exported (originales/coraje/Frenar_1-N.png, 2160px) -> public/assets/coraje/*.webp, each cropped
// to its own box, and src/composables/corajeScene.json, all in px of the 2160 square:
//   boxes      the box of every picture
//   sky        the night behind everything did not come in the export: it is read from the card (public/cards/19.webp)
//              where no layer covers it, as one colour (0xRRGGBB) for a sky drawn in code
//   stars      the stars (1) as [x, y, radius, 0xRRGGBB], for particles; the little spiral galaxy among them (its one big
//              blob) is a picture of its own (galaxy) so it can turn
//   moon       the moon's body (3) is not a picture: the disc that fits inside it ([x, y, r]) and its colour; what of its
//              fill is outside that disc (its rim and the lip of its open mouth, top left) goes with its outline and its
//              three crater strokes (6, 4) into one picture (moon)
//   stipple    the shadow of the moon (5), every dot as [x, y, radius] (the clumps filled with dots), for particles
//   aura       the stippled light round Kätus (17), as dots [x, y, radius], as dense as it is, and its colour (auraColor)
//   mushrooms, spores  the stippled pink glow of the three little mushrooms (15): where each clump of it is ([x, y, r]) and
//              its dots [x, y, radius], and its colour (pink); the caps' pink is that glow, so the scene draws it in code
//   eye        the box of Kätus's eye (22), its own picture so he can blink
//   tail       the box of his tail (23), its own picture so it can stir
//   rulito     the box of the card's rulito over Kätus (21): not converted, the scene's game will draw it in code
// Not converted: 2 (the little cross of Algo Particular, the signature) and 21 (the rulito). The pictures are the cliff's
// rock (7, 8), the light of its crystals (9, which a sheen crosses), its grass and stones (10 to 14), its line work (16),
// Kätus (18 to 20), his eye (22) and his tail (23).
// The originals are not kept in the repo once converted. Usage: node scripts/convert-coraje.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'originales', 'coraje');
const target = path.join(root, 'public', 'assets', 'coraje');
const file = (n) => path.join(source, `Frenar_1-${n}.png`);
const S = 2160;

// Pictures made of one or more layers, drawn in this order
const pictures = {
    rock: [7, 8], crystals: [9], grass: [10, 11, 12, 13, 14], lines: [16], katus: [18, 19, 20], eye: [22], tail: [23],
};
const ALL = [1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
const PAD = 4;
const SOLID = 110;

const load = async (n) => sharp(file(n)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const webp = (img) => img.webp({ quality: 88, alphaQuality: 100, effort: 5 });
const flatten = (layers) => sharp({ create: { width: S, height: S, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(layers.map((n) => ({ input: typeof n === 'number' ? file(n) : n }))).png().toBuffer();
const rawOf = async (png) => (await sharp(png).raw().toBuffer({ resolveWithObject: true })).data;
const hex = (r, g, b) => (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
const round1 = (v) => +v.toFixed(1);
// The colour of a layer where it is solid
const colourOf = (data) => {
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < S * S; i += 3) {
        if (data[i * 4 + 3] < 200) continue;
        r += data[i * 4]; g += data[i * 4 + 1]; b += data[i * 4 + 2]; n++;
    }
    return hex(r / n, g / n, b / n);
};

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

// Every blob of solid pixels: its pixels, area and centre
const blobsOf = (data, W, H, solidAt = SOLID) => {
    const seen = new Uint8Array(W * H);
    const blobs = [];
    const stack = [];
    const solid = (i) => data[i * 4 + 3] >= solidAt;
    for (let start = 0; start < W * H; start++) {
        if (seen[start] || !solid(start)) continue;
        const pixels = [];
        let sx = 0, sy = 0;
        stack.push(start);
        seen[start] = 1;
        while (stack.length) {
            const i = stack.pop();
            const x = i % W, y = (i - x) / W;
            pixels.push(i);
            sx += x; sy += y;
            for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1]) {
                if (j < 0 || seen[j] || !solid(j)) continue;
                seen[j] = 1;
                stack.push(j);
            }
        }
        blobs.push({ pixels, area: pixels.length, x: sx / pixels.length, y: sy / pixels.length });
    }
    return blobs.sort((a, b) => b.area - a.area);
};

// A dot wherever a soft stippled layer is, as dense as it is
const stippleOf = (data, step, size, keep = () => true) => {
    const dots = [];
    for (let y = 0; y < S; y += step) {
        for (let x = 0; x < S; x += step) {
            const a = data[(y * S + x) * 4 + 3] / 255;
            if (a < 0.05 || Math.random() > a * 0.9 || !keep(x, y)) continue;
            dots.push([x + Math.round((Math.random() - 0.5) * step), y + Math.round((Math.random() - 0.5) * step), round1(size[0] + Math.random() * size[1])]);
        }
    }
    return dots;
};

await mkdir(target, { recursive: true });
const scene = { size: S, boxes: {}, sky: 0, stars: [], moon: null, stipple: [], aura: [], mushrooms: [] };

// Plain pictures
for (const [name, layers] of Object.entries(pictures)) {
    const flat = await flatten(layers);
    const box = boxOf(await rawOf(flat), S, S);
    await webp(sharp(flat).extract({ left: box[0], top: box[1], width: box[2], height: box[3] })).toFile(path.join(target, `${name}.webp`));
    scene.boxes[name] = box;
}

// The sky: the card's colour wherever no layer covers it (and a little away from any, past their soft edges)
{
    const cover = await rawOf(await flatten(ALL));
    const card = (await sharp(path.join(root, 'public', 'cards', '19.webp')).resize(S, S).ensureAlpha().raw().toBuffer());
    let r = 0, g = 0, b = 0, n = 0;
    const bare = (x, y) => {
        for (let dy = -12; dy <= 12; dy += 6) for (let dx = -12; dx <= 12; dx += 6) {
            const xx = x + dx, yy = y + dy;
            if (xx < 0 || yy < 0 || xx >= S || yy >= S) continue;
            if (cover[(yy * S + xx) * 4 + 3] > 2) return false;
        }
        return true;
    };
    // The signature (2) is on the card but in no picture: keep away from it
    const sign = (x, y) => x > 1270 && x < 1360 && y > 1840 && y < 1930;
    for (let y = 8; y < S - 8; y += 9) for (let x = 8; x < S - 8; x += 9) {
        if (sign(x, y) || !bare(x, y)) continue;
        const i = (y * S + x) * 4;
        r += card[i]; g += card[i + 1]; b += card[i + 2]; n++;
    }
    scene.sky = hex(r / n, g / n, b / n);
}

// The stars: every dot of 1 with its colour; the galaxy (its one big blob) is a picture
{
    const { data } = await load(1);
    const blobs = blobsOf(data, S, S, 60);
    const [galaxy, ...rest] = blobs;
    const mine = new Uint8Array(S * S);
    galaxy.pixels.forEach((i) => { mine[i] = 1; });
    // With its soft edge
    const only = Buffer.alloc(S * S * 4);
    for (let i = 0; i < S * S; i++) {
        if (!mine[i]) continue;
        for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const j = i + dy * S + dx; if (j >= 0 && j < S * S) data.copy(only, j * 4, j * 4, j * 4 + 4); }
    }
    const box = boxOf(only, S, S);
    await webp(sharp(only, { raw: { width: S, height: S, channels: 4 } }).extract({ left: box[0], top: box[1], width: box[2], height: box[3] }))
        .toFile(path.join(target, 'galaxy.webp'));
    scene.boxes.galaxy = box;
    scene.stars = rest.filter((b) => b.area >= 2).map((b) => {
        let r = 0, g = 0, bl = 0;
        b.pixels.forEach((i) => { r += data[i * 4]; g += data[i * 4 + 1]; bl += data[i * 4 + 2]; });
        const n = b.pixels.length;
        return [Math.round(b.x), Math.round(b.y), round1(Math.sqrt(b.area / Math.PI) + 0.6), hex(r / n, g / n, bl / n)];
    });
}

// The moon: the disc inside its body (left, right and bottom of it: its top has the lip of its mouth), and a picture of
// its outline, its craters and whatever of its fill is outside the disc
{
    const { data } = await load(3);
    let x0 = S, x1 = 0, y1 = 0;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
        if (data[(y * S + x) * 4 + 3] < SOLID) continue;
        x0 = Math.min(x0, x); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    }
    const r = (x1 - x0 + 1) / 2, cx = (x0 + x1) / 2, cy = y1 - r;
    const R = Math.round(r - 10);
    let cr = 0, cg = 0, cb = 0, n = 0;
    for (let y = Math.round(cy - 200); y < cy + 200; y += 5) for (let x = Math.round(cx - 200); x < cx + 200; x += 5) {
        const i = (y * S + x) * 4;
        if (data[i + 3] < 250) continue;
        cr += data[i]; cg += data[i + 1]; cb += data[i + 2]; n++;
    }
    scene.moon = { x: Math.round(cx), y: Math.round(cy), r: R, color: hex(cr / n, cg / n, cb / n) };
    // The fill outside the disc (with a few px of overlap, so no seam), under the lines
    const rim = Buffer.from(data);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (Math.hypot(x - cx, y - cy) < R - 4) rim[(y * S + x) * 4 + 3] = 0;
    const rimPng = await sharp(rim, { raw: { width: S, height: S, channels: 4 } }).png().toBuffer();
    const flat = await flatten([rimPng, 4, 6]);
    const box = boxOf(await rawOf(flat), S, S);
    await webp(sharp(flat).extract({ left: box[0], top: box[1], width: box[2], height: box[3] })).toFile(path.join(target, 'moon.webp'));
    scene.boxes.moon = box;
}

// The moon's shadow: one dot for each dot of the stipple; where dots touch (a clump), the clump filled with dots
{
    const { data } = await load(5);
    const blobs = blobsOf(data, S, S);
    const inBlob = new Uint8Array(S * S);
    const FILL = 9;
    for (const b of blobs) {
        if (b.area <= 140) {
            scene.stipple.push([Math.round(b.x), Math.round(b.y), round1(Math.sqrt(b.area / Math.PI))]);
            continue;
        }
        b.pixels.forEach((i) => { inBlob[i] = 1; });
    }
    for (let y = 0; y < S; y += FILL) {
        for (let x = ((y / FILL) % 2) * FILL / 2; x < S; x += FILL) {
            const px = Math.round(x + (Math.random() - 0.5) * FILL * 0.6), py = Math.round(y + (Math.random() - 0.5) * FILL * 0.6);
            if (px < 0 || py < 0 || px >= S || py >= S || !inBlob[py * S + px]) continue;
            scene.stipple.push([px, py, round1(4.5 + Math.random() * 2)]);
        }
    }
}

// The light round Kätus
{
    const { data } = await load(17);
    scene.aura = stippleOf(data, 4, [1.8, 1.6]);
    scene.auraColor = colourOf(data);
}

// The mushrooms' glow: its clumps, and its dots
{
    const { data } = await load(15);
    const blobs = blobsOf(data, S, S, 40).filter((b) => b.area > 400);
    scene.mushrooms = blobs.sort((a, b) => a.x - b.x).map((b) => {
        let x0 = S, x1 = 0, y0 = S, y1 = 0;
        b.pixels.forEach((i) => { const x = i % S, y = (i - x) / S; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); });
        return [Math.round(b.x), Math.round(b.y), Math.round(Math.max(x1 - x0, y1 - y0) / 2)];
    });
    scene.spores = stippleOf(data, 4, [1.5, 1.4]);
    scene.pink = colourOf(data);
}

{
    const { data } = await load(21);
    scene.rulito = boxOf(data, S, S);
}

await writeFile(path.join(root, 'src', 'composables', 'corajeScene.json'), JSON.stringify(scene));
console.log(Object.keys(scene.boxes).length, 'pictures; sky', scene.sky.toString(16), ';', scene.stars.length, 'stars; moon', JSON.stringify(scene.moon),
    ';', scene.stipple.length, 'stipple dots;', scene.aura.length, 'aura dots;', JSON.stringify(scene.mushrooms), scene.spores.length,
    'spore dots; aura', scene.auraColor.toString(16), 'pink', scene.pink.toString(16), 'rulito', scene.rulito);
