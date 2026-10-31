// The layers of Honestidad as exported (originales/honestidad/Honestidad-N.png, 2160px) -> public/assets/honestidad/*.webp,
// each cropped to its own box, and src/composables/honestidadScene.json, all in px of the 2160 square:
//   boxes      the box of every picture
//   water      the water is not a picture (no layer has it): its colour read from the finished card (public/cards/26.webp)
//              wherever no layer draws, row by row (averaged across), as [y, 0xRRGGBB] stops for a gradient drawn in code
//   sun        the light at the surface is not a picture either: the disc that fits its solid middle ([x, y, r], fitted
//              to the rows of it there are, since the card cuts its top), its colour, and every dot of its stippled edge
//              as [x, y, radius] (its ragged rim filled with dots too), so it can be alive
//   thread     the two strands of dots that come down from the sun to the jellyfish's third eye (20), [x, y, radius]
//              each, and `eye`, the big one on its forehead
//   aura       the blue stipple round the jellyfish (16), as dots [x, y, radius]
//   dust       the specks in the water (2), and `stipple`, the dark specks round the seaweed (the small ones of 1), as dots
//   glow       the yellow stipple round the two anemones (the small ones of 9), as dots [x, y, radius, side (0 left, 1 right)]
//   bubbles    the six bubbles (3 and 4) each cut out into one atlas (bubbles.webp), so each can float on its own:
//              [x, y, w, h where it is drawn, x, y where it is in the atlas]
//   seaweed    the dark seaweed (1) is the same plant mirrored on both sides of the card: only the left one is kept and
//              the scene mirrors it
// Pictures: seaweed (1, its big shapes), coralL / coralR (the teal corals, 5 with their lines 8 and 7), potL / potR (the
// blue pots, 6), anemoneL / anemoneR (the yellow anemones, the big shapes of 9 with their lines 11 and 10), coral (the
// pink coral with its lines and the little dark plants at its foot, 12, 13, 14), bell (the jellyfish's bell and face, 17
// and 18) and tentacles (19), apart so they can sway. Not converted: 2, 15, 16, 20 and the specks of 1 and 9 (particles,
// above). The card has no rulito and no Algo Particular mark. The originals are not kept in the repo once converted.
// Usage: node scripts/convert-honestidad.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'originales', 'honestidad');
const target = path.join(root, 'public', 'assets', 'honestidad');
const file = (n) => path.join(source, `Honestidad-${n}.png`);
const CARD = path.join(root, 'public', 'cards', '26.webp');
const S = 2160;
const MID = S / 2;
const PAD = 4;
const SOLID = 110;              // alpha from which a pixel is part of a shape (as in convert-viriya)
const BIG = 1000;               // a blob this big is drawing; smaller ones are specks, made particles

const load = async (n) => (await sharp(file(n)).ensureAlpha().raw().toBuffer({ resolveWithObject: true })).data;
const webp = (img) => img.webp({ quality: 88, alphaQuality: 100, effort: 5 });
const hex = (r, g, b) => (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
const radius = (area) => +Math.sqrt(area / Math.PI).toFixed(1);

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

// Every blob of solid pixels: its pixels, area and centre
const blobsOf = (data) => {
    const seen = new Uint8Array(S * S);
    const blobs = [];
    const stack = [];
    const solid = (i) => data[i * 4 + 3] >= SOLID;
    for (let start = 0; start < S * S; start++) {
        if (seen[start] || !solid(start)) continue;
        const pixels = [];
        let sx = 0, sy = 0;
        stack.push(start);
        seen[start] = 1;
        while (stack.length) {
            const i = stack.pop();
            const x = i % S, y = (i - x) / S;
            pixels.push(i);
            sx += x; sy += y;
            for (const j of [x > 0 ? i - 1 : -1, x < S - 1 ? i + 1 : -1, y > 0 ? i - S : -1, y < S - 1 ? i + S : -1]) {
                if (j < 0 || seen[j] || !solid(j)) continue;
                seen[j] = 1;
                stack.push(j);
            }
        }
        blobs.push({ pixels, area: pixels.length, x: sx / pixels.length, y: sy / pixels.length });
    }
    return blobs.sort((a, b) => b.area - a.area);
};

// Only the pixels near these blobs (with the soft edge round them), the rest made transparent
const keepNear = (data, blobs, reach = 3) => {
    const keep = new Uint8Array(S * S);
    blobs.forEach((b) => b.pixels.forEach((i) => {
        for (let dy = -reach; dy <= reach; dy++) for (let dx = -reach; dx <= reach; dx++) { const j = i + dy * S + dx; if (j >= 0 && j < S * S) keep[j] = 1; }
    }));
    const out = Buffer.from(data);
    for (let i = 0; i < S * S; i++) if (!keep[i]) out[i * 4 + 3] = 0;
    return out;
};
// Only one side of the card
const side = (data, left) => {
    const out = Buffer.from(data);
    for (let i = 0; i < S * S; i++) if (((i % S) < MID) !== left) out[i * 4 + 3] = 0;
    return out;
};
const raw = (data) => sharp(data, { raw: { width: S, height: S, channels: 4 } });
const flatten = async (inputs) => (await sharp({ create: { width: S, height: S, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(inputs.map((input) => (typeof input === 'number' ? { input: file(input) } : { input, raw: { width: S, height: S, channels: 4 } })))
    .raw().toBuffer());
const specks = (blobs) => blobs.filter((b) => b.area < BIG && b.area >= 3);

await mkdir(target, { recursive: true });
const scene = { size: S, boxes: {}, water: [], sun: null, thread: [], eye: null, aura: [], dust: [], stipple: [], glow: [], bubbles: [], atlas: [0, 0] };
const save = async (name, data) => {
    const box = boxOf(data);
    await webp(raw(data).extract({ left: box[0], top: box[1], width: box[2], height: box[3] })).toFile(path.join(target, `${name}.webp`));
    scene.boxes[name] = box;
};

// The seaweed: the left one only (the right one is the same, mirrored); its specks are particles
{
    const data = await load(1);
    const blobs = blobsOf(data);
    await save('seaweed', side(keepNear(data, blobs.filter((b) => b.area >= BIG)), true));
    scene.stipple = specks(blobs).map((b) => [Math.round(b.x), Math.round(b.y), radius(b.area)]);
}

// The teal corals, the pots, the pink coral, the jellyfish
{
    const corals = await flatten([5, 7, 8]);
    await save('coralL', side(corals, true));
    await save('coralR', side(corals, false));
    const pots = await load(6);
    await save('potL', side(pots, true));
    await save('potR', side(pots, false));
    await save('coral', await flatten([12, 13, 14]));
    await save('bell', await flatten([17, 18]));
    await save('tentacles', await load(19));
}

// The anemones: their big shapes are pictures (with their lines), their yellow stipple particles
{
    const data = await load(9);
    const blobs = blobsOf(data);
    const shapes = keepNear(data, blobs.filter((b) => b.area >= BIG));
    await save('anemoneL', side(await flatten([shapes, 11]), true));
    await save('anemoneR', side(await flatten([shapes, 10]), false));
    scene.glow = specks(blobs).map((b) => [Math.round(b.x), Math.round(b.y), radius(b.area), b.x < MID ? 0 : 1]);
}

// The water, from the card: wherever no layer draws, averaged across each band of STEP rows
{
    const covered = new Uint8Array(S * S);
    for (let n = 1; n <= 20; n++) {
        const data = await load(n);
        for (let i = 0; i < S * S; i++) {
            if (data[i * 4 + 3] < 8) continue;
            const x = i % S, y = (i - x) / S;
            for (let dy = -6; dy <= 6; dy += 3) for (let dx = -6; dx <= 6; dx += 3) {
                const xx = x + dx, yy = y + dy;
                if (xx >= 0 && yy >= 0 && xx < S && yy < S) covered[yy * S + xx] = 1;
            }
        }
    }
    const card = (await sharp(CARD).removeAlpha().raw().toBuffer());
    const STEP = 48;
    for (let y = 0; y < S; y += STEP) {
        let r = 0, g = 0, b = 0, n = 0;
        for (let yy = y; yy < y + STEP; yy += 2) for (let x = 0; x < S; x += 4) {
            const i = yy * S + x;
            if (covered[i]) continue;
            r += card[i * 3]; g += card[i * 3 + 1]; b += card[i * 3 + 2]; n++;
        }
        if (n > 40) scene.water.push([y + STEP / 2, hex(r / n, g / n, b / n)]);
    }
}

// The sun: the disc of its solid middle (fitted to the half chords of its rows: the card cuts it at the top), and dots
// for everything round it
{
    const data = await load(15);
    const [main, ...rest] = blobsOf(data);
    const inMain = new Uint8Array(S * S);
    main.pixels.forEach((i) => { inMain[i] = 1; });
    const cx = main.x;
    // (c/2)² + y² = r² - cy² + 2·cy·y: a line in y, fitted over the rows of the solid middle
    const rows = [];
    for (let y = 0; y < S; y += 2) {
        let n = 0;
        for (let x = 0; x < S; x++) n += inMain[y * S + x];
        if (n > 60) rows.push([y, (n / 2) ** 2 + y * y]);
    }
    const m = rows.length, sy = rows.reduce((s, [y]) => s + y, 0), sv = rows.reduce((s, [, v]) => s + v, 0);
    const syy = rows.reduce((s, [y]) => s + y * y, 0), syv = rows.reduce((s, [y, v]) => s + y * v, 0);
    const slope = (m * syv - sy * sv) / (m * syy - sy * sy), cut = (sv - slope * sy) / m;
    const cy = slope / 2;
    const R = Math.sqrt(cut + cy * cy) * 0.78;        // the disc is the solid middle; the ragged rim round it is dots
    const dots = specks(rest).map((b) => [Math.round(b.x), Math.round(b.y), radius(b.area)]);
    const FILL = 7;
    for (let y = 0; y < S; y += FILL) {
        for (let x = ((y / FILL) % 2) * FILL / 2; x < S; x += FILL) {
            const px = Math.round(x + (Math.random() - 0.5) * FILL * 0.6), py = Math.round(y + (Math.random() - 0.5) * FILL * 0.6);
            if (px < 0 || py < 0 || px >= S || py >= S || !inMain[py * S + px]) continue;
            if (Math.hypot(px - cx, py - cy) < R - 6) continue;
            dots.push([px, py, +(3.5 + Math.random() * 2.5).toFixed(1)]);
        }
    }
    scene.sun = { x: Math.round(cx), y: Math.round(cy), r: Math.round(R), color: 0xffe47c, dots };
}

// The thread of light down to the third eye, the jellyfish's aura and the specks of the water
{
    const blobs = blobsOf(await load(20));
    const [eye, ...dots] = blobs;
    scene.eye = [Math.round(eye.x), Math.round(eye.y), radius(eye.area)];
    scene.thread = dots.filter((b) => b.area >= 3).map((b) => [Math.round(b.x), Math.round(b.y), radius(b.area)]).sort((a, b) => a[1] - b[1]);
    scene.dust = specks(blobsOf(await load(2))).map((b) => [Math.round(b.x), Math.round(b.y), radius(b.area)]);
    const aura = await load(16);
    const STEP = 6;
    for (let y = 0; y < S; y += STEP) {
        for (let x = 0; x < S; x += STEP) {
            const a = aura[(y * S + x) * 4 + 3] / 255;
            if (a < 0.05 || Math.random() > a * 0.85) continue;
            scene.aura.push([x + Math.round((Math.random() - 0.5) * STEP), y + Math.round((Math.random() - 0.5) * STEP), +(2 + Math.random() * 1.8).toFixed(1)]);
        }
    }
}

// The bubbles: fill (3) and line (4) together, each cut out into one atlas, packed in a row
{
    const data = await flatten([3, 4]);
    const blobs = blobsOf(data).filter((b) => b.area >= BIG);
    const GAP = 8;
    const cuts = blobs.map((b) => {
        let x0 = S, y0 = S, x1 = 0, y1 = 0;
        b.pixels.forEach((i) => { const x = i % S, y = (i - x) / S; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); });
        x0 -= 4; y0 -= 4; x1 += 4; y1 += 4;
        const w = x1 - x0 + 1, h = y1 - y0 + 1;
        const pixels = Buffer.alloc(w * h * 4);
        for (let y = 0; y < h; y++) data.copy(pixels, y * w * 4, ((y0 + y) * S + x0) * 4, ((y0 + y) * S + x0 + w) * 4);
        return { x: x0, y: y0, w, h, pixels };
    });
    let cx = GAP;
    cuts.forEach((c) => { c.ax = cx; c.ay = GAP; cx += c.w + GAP; });
    const AW = cx, AH = Math.max(...cuts.map((c) => c.h)) + 2 * GAP;
    await webp(sharp({ create: { width: AW, height: AH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
        .composite(cuts.map((c) => ({ input: c.pixels, raw: { width: c.w, height: c.h, channels: 4 }, left: c.ax, top: c.ay }))))
        .toFile(path.join(target, 'bubbles.webp'));
    scene.atlas = [AW, AH];
    scene.bubbles = cuts.sort((a, b) => a.x - b.x).map((c) => [c.x, c.y, c.w, c.h, c.ax, c.ay]);
}

await writeFile(path.join(root, 'src', 'composables', 'honestidadScene.json'), JSON.stringify(scene));
console.log(Object.keys(scene.boxes).length, 'pictures:', JSON.stringify(scene.boxes), '\nwater', scene.water.map(([y, c]) => `${y}:${c.toString(16)}`).join(' '),
    '\nsun', scene.sun.x, scene.sun.y, 'r', scene.sun.r, 'with', scene.sun.dots.length, 'dots; thread', scene.thread.length, 'eye', scene.eye,
    '; aura', scene.aura.length, '; dust', scene.dust.length, '; stipple', scene.stipple.length, '; glow', scene.glow.length,
    ';', scene.bubbles.length, 'bubbles in a', scene.atlas.join('x'), 'atlas');
