// The layers of Aceptación as exported (originales/aceptacion/Aceptación-N.png, 3240px) -> public/assets/aceptacion/*.webp,
// each cropped to its own box, and src/composables/aceptacionScene.json, all in px of a 2160 square (the originals are
// scaled down to it first, so sizes match the other scenes):
//   boxes      the box of every picture (the beings: being.webp and eyes.webp are the left one; the right one is it mirrored)
//   sky        the two skies are not pictures: the cream of the past on the left (not in the export: read from the card,
//              public/cards/11.webp) and the yellow of the right (1); edge is where they meet, row by row ({ y0, step,
//              x: [...] }, the card's wavy line), and bubbles are the drops of one in the other ([x, y, rx, ry, angle,
//              ±1]: +1 a yellow drop in the cream, -1 a cream hole in the yellow), which the scene draws as two liquids
//              that never mix (field() in useLayerStage), as Upekkha's
//   sun        the pink sun (5) is not a picture: the disc inside its solid middle ([x, y, r]), its colour, and every dot
//              of its stippled edge as [x, y, radius] (its ragged rim filled with dots too)
//   planet     the stipple of the pink planet's shading (the small dots of 7), as [x, y, radius], and its colour; its
//              fill (6, recoloured to the peach it is on the card) and its outline (the big strokes of 7) are the
//              planet picture
//   dots       the specks of the sky (10, 11), as [x, y, radius, 0xRRGGBB]
//   bits       what in 11 is not a speck (the little ringed planet and two strokes), cut out into one atlas (bits.webp):
//              [x, y, w, h where it is drawn, x, y where it is in the atlas]
//   eyes       the box of each being's eyes, [left, right] (they blink)
//   rulitos    the boxes of the two rulitos over the beings (16, 17), which are not converted: the game draws them in code
//   ground     the colours of the two banks (4 left, 3 right) and of the horizon's line (14), and where each bank's top
//              meets the frame's edge (tops), for the land past the frame
// The pictures: the river (2, its ripples and marks from 8 and 12, and the little cross 18), each bank (4, 3, with
// what is drawn on them from 8, 13 and 14), the island in the river (its fills from 8 and lines from 12) and the two
// cairns on it (15 and their fills from 8: where the game's light goes), each being (its fill from 9 and its lines from
// 13, without its eyes, which are their own picture), the mushrooms and plants on each bank (from 8 and 13, so they
// sway) and the planet (6 and 7). What goes where is decided per stroke (blob), by the box it fits in.
// Not converted: 1 (the yellow sky, drawn in code), 5 (the sun, a disc and particles), the specks of 10 and 11
// (particles), 16 and 17 (the rulitos), and two stray specks of line high in the sky (13). The originals are not kept in the repo once converted.
// Usage: node scripts/convert-aceptacion.mjs
import { mkdir, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'originales', 'aceptacion');
const target = path.join(root, 'public', 'assets', 'aceptacion');
const file = (n) => path.join(source, `Aceptación-${n}.png`);
const S = 2160;
const PAD = 4;
const SOLID = 110;

const cache = new Map();
const load = async (n) => {
    if (!cache.has(n)) cache.set(n, (await sharp(file(n)).ensureAlpha().resize(S, S).raw().toBuffer({ resolveWithObject: true })).data);
    return cache.get(n);
};
const webp = (img) => img.webp({ quality: 88, alphaQuality: 100, effort: 5 });
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

// Every blob of pixels that `solid` lets in: its pixels, area, centre, box and colour
const blobsOf = (data, solid = (i) => data[i * 4 + 3] >= SOLID) => {
    const seen = new Uint8Array(S * S);
    const blobs = [];
    const stack = [];
    for (let start = 0; start < S * S; start++) {
        if (seen[start] || !solid(start)) continue;
        const pixels = [];
        let sx = 0, sy = 0, r = 0, g = 0, b = 0, x0 = S, y0 = S, x1 = 0, y1 = 0;
        stack.push(start);
        seen[start] = 1;
        while (stack.length) {
            const i = stack.pop();
            const x = i % S, y = (i - x) / S;
            pixels.push(i);
            sx += x; sy += y;
            r += data[i * 4]; g += data[i * 4 + 1]; b += data[i * 4 + 2];
            x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
            for (const j of [x > 0 ? i - 1 : -1, x < S - 1 ? i + 1 : -1, y > 0 ? i - S : -1, y < S - 1 ? i + S : -1]) {
                if (j < 0 || seen[j] || !solid(j)) continue;
                seen[j] = 1;
                stack.push(j);
            }
        }
        const n = pixels.length;
        blobs.push({ pixels, area: n, x: sx / n, y: sy / n, box: [x0, y0, x1, y1], color: hex(r / n, g / n, b / n) });
    }
    return blobs.sort((a, b) => b.area - a.area);
};

// An ellipse that fits a blob (from its moments): [x, y, rx, ry, angle]
const ellipseOf = (blob) => {
    let xx = 0, yy = 0, xy = 0;
    blob.pixels.forEach((i) => { const x = i % S - blob.x, y = (i - (i % S)) / S - blob.y; xx += x * x; yy += y * y; xy += x * y; });
    xx /= blob.area; yy /= blob.area; xy /= blob.area;
    const common = Math.sqrt(((xx - yy) / 2) ** 2 + xy * xy);
    const l1 = (xx + yy) / 2 + common, l2 = (xx + yy) / 2 - common;
    return [Math.round(blob.x), Math.round(blob.y), Math.round(2 * Math.sqrt(l1)), Math.round(2 * Math.sqrt(Math.max(1, l2))), +(0.5 * Math.atan2(2 * xy, xx - yy)).toFixed(3)];
};

// A picture being assembled: layers' pixels laid over one another (premultiplied over), only those it is given
const canvasOf = () => new Float32Array(S * S * 4);
const lay = (into, data, pixels) => {
    const each = (i) => {
        const a = data[i * 4 + 3] / 255;
        if (!a) return;
        const k = 1 - a;
        into[i * 4] = data[i * 4] * a + into[i * 4] * k;
        into[i * 4 + 1] = data[i * 4 + 1] * a + into[i * 4 + 1] * k;
        into[i * 4 + 2] = data[i * 4 + 2] * a + into[i * 4 + 2] * k;
        into[i * 4 + 3] = a + into[i * 4 + 3] * k;
    };
    if (pixels) pixels.forEach(each);
    else for (let i = 0; i < S * S; i++) each(i);
};
const save = async (name, into) => {
    const out = Buffer.alloc(S * S * 4);
    for (let i = 0; i < S * S; i++) {
        const a = into[i * 4 + 3];
        if (a <= 0) continue;
        out[i * 4] = Math.round(into[i * 4] / a);
        out[i * 4 + 1] = Math.round(into[i * 4 + 1] / a);
        out[i * 4 + 2] = Math.round(into[i * 4 + 2] / a);
        out[i * 4 + 3] = Math.round(a * 255);
    }
    const box = boxOf(out);
    await webp(sharp(out, { raw: { width: S, height: S, channels: 4 } }).extract({ left: box[0], top: box[1], width: box[2], height: box[3] }))
        .toFile(path.join(target, `${name}.webp`));
    scene.boxes[name] = box;
};

await mkdir(target, { recursive: true });
const scene = { size: S, boxes: {}, sky: null, sun: null, planet: null, dots: [], bits: [], atlas: [0, 0], eyes: [], rulitos: [], ground: null };

// ---- The drawing, stroke by stroke: each blob goes to the picture whose box it fits in (the first that fits), the
// rest to the river (what lies on the water) or to the bank on its side
const REGIONS = [
    ['cairns', [960, 1770, 1200, 1950]],
    ['island', [780, 1770, 1380, 2160]],
    ['beingL', [470, 1060, 862, 1812]],
    ['beingR', [1288, 1060, 1690, 1812]],
    ['plantsL', [0, 1280, 580, 1910]],
    ['plantsR', [1618, 1280, 2156, 1910]],
];
const inside = ([x0, y0, x1, y1], [l, t, r, b]) => x0 >= l && y0 >= t && x1 <= r && y1 <= b;
const parts = Object.fromEntries(['river', 'groundL', 'groundR', 'island', 'cairns', 'beingL', 'beingR', 'eyesL', 'eyesR', 'plantsL', 'plantsR'].map((n) => [n, canvasOf()]));
const river = await load(2);
lay(parts.river, river);
lay(parts.groundL, await load(4));
lay(parts.groundR, await load(3));
const counts = {};
const NAMES = Object.keys(parts);
const side = (x) => (x < S / 2 ? 'L' : 'R');
// Each being is its fill (9) and what of the lines lies on it or hugs its outline (within HUG px); its crossed legs,
// open loops on the grass, stay with the bank, and so do the horizon and the bank's grass that touch them
const HUG = 16;
const fill = await load(9);
const beingMask = new Uint8Array(S * S);
{
    const across = new Uint8Array(S * S);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
        let on = 0;
        for (let d = -HUG; d <= HUG && !on; d += 2) { const xx = x + d; if (xx >= 0 && xx < S && fill[(y * S + xx) * 4 + 3] > 40) on = 1; }
        across[y * S + x] = on;
    }
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
        let on = 0;
        for (let d = -HUG; d <= HUG && !on; d += 2) { const yy = y + d; if (yy >= 0 && yy < S && across[yy * S + x]) on = 1; }
        beingMask[y * S + x] = on;
    }
}
for (const n of [9, 8, 12, 14, 15, 18, 13]) {
    const data = await load(n);
    const label = new Int8Array(S * S).fill(-1);
    for (const blob of blobsOf(data, (i) => data[i * 4 + 3] >= 64)) {
        // Two specks of line high in the sky (13) are dropped
        if (n === 13 && blob.box[3] < 1000) { blob.pixels.forEach((i) => { label[i] = -2; }); continue; }
        let name = n === 14 ? null : REGIONS.find(([, r]) => inside(blob.box, r))?.[0];
        if (!name && (n === 8 || n === 12 || n === 18) && river[(Math.round(blob.y) * S + Math.round(blob.x)) * 4 + 3] > 0) name = 'river';
        if (!name) name = `ground${side(blob.x)}`;
        // The eyes: the two small round dots high on each being's head
        const [x0, y0, x1, y1] = blob.box;
        const eyes = n === 13 && name.startsWith('being') && blob.area < 1500 && blob.y < 1420 && (x1 - x0) < 1.6 * (y1 - y0) && (y1 - y0) < 1.6 * (x1 - x0);
        if (eyes) name = name.replace('being', 'eyes');
        counts[`${n}>${name}`] = (counts[`${n}>${name}`] ?? 0) + 1;
        blob.pixels.forEach((i) => {
            let own = name;
            if (n === 9) own = `being${side(i % S)}`;
            else if (!eyes && (n === 13 || n === 8)) {
                if (beingMask[i] && (name.startsWith('being') || name.startsWith('ground'))) own = `being${side(i % S)}`;
                else if (name.startsWith('being')) own = `ground${side(i % S)}`;
            }
            label[i] = NAMES.indexOf(own);
        });
    }
    // The soft edges (and faint specks) go with the solid stroke they touch
    let queue = [];
    for (let i = 0; i < S * S; i++) if (label[i] >= 0) queue.push(i);
    while (queue.length) {
        const next = [];
        for (const i of queue) {
            const x = i % S;
            for (const j of [x > 0 ? i - 1 : -1, x < S - 1 ? i + 1 : -1, i - S, i + S]) {
                if (j < 0 || j >= S * S || label[j] !== -1 || !data[j * 4 + 3]) continue;
                label[j] = label[i];
                next.push(j);
            }
        }
        queue = next;
    }
    const lists = NAMES.map(() => []);
    for (let i = 0; i < S * S; i++) {
        // (a faint speck touching nothing, up in the sky, is dropped)
        if (!data[i * 4 + 3] || label[i] === -2 || (label[i] < 0 && i < 1400 * S)) continue;
        lists[label[i] >= 0 ? label[i] : NAMES.indexOf(`ground${side(i % S)}`)].push(i);
    }
    lists.forEach((list, k) => { if (list.length) lay(parts[NAMES[k]], data, list); });
}
// The two beings are the same drawing mirrored: only the left one is shipped (being, eyes), the scene turns it over for
// the right one; the right one's boxes are kept, for where it stands
for (const [name, into] of Object.entries(parts)) {
    await save(name, into);
    if (name === 'beingL' || name === 'eyesL') await rename(path.join(target, `${name}.webp`), path.join(target, `${name.slice(0, -1)}.webp`));
    if (name === 'beingR' || name === 'eyesR') await unlink(path.join(target, `${name}.webp`));
}
scene.eyes = [scene.boxes.eyesL, scene.boxes.eyesR];

// ---- The planet: its fill and its outline are a picture, the stipple of its shading particles
{
    const line = await load(7);
    const into = canvasOf();
    // The fill is exported pink, but on the card (a blend in the original file) it is a pale peach: it takes the
    // card's colour, read where the stipple leaves it bare
    const card = await sharp(path.join(root, 'public', 'cards', '11.webp')).resize(S, S).raw().toBuffer();
    let r = 0, g = 0, b = 0, n = 0;
    for (let y = 470; y < 600; y += 2) for (let x = 1590; x < 1640; x += 2) { const i = (y * S + x) * 3; r += card[i]; g += card[i + 1]; b += card[i + 2]; n++; }
    const fill = Buffer.from(await load(6));
    for (let i = 0; i < S * S; i++) { fill[i * 4] = r / n; fill[i * 4 + 1] = g / n; fill[i * 4 + 2] = b / n; }
    lay(into, fill);
    const dots = [];
    let colour = 0;
    for (const blob of blobsOf(line, (i) => line[i * 4 + 3] > 0)) {
        if (blob.area >= 250) { lay(into, line, blob.pixels); colour = blob.color; } else if (blob.area >= 3) dots.push([Math.round(blob.x), Math.round(blob.y), +Math.sqrt(blob.area / Math.PI).toFixed(1)]);
    }
    await save('planet', into);
    scene.planet = { color: colour, dots };
}

// ---- The sky: the cream (from the card, where nothing else is) and the yellow (1), the edge between them and the drops
{
    const card = (await sharp(path.join(root, 'public', 'cards', '11.webp')).resize(S, S).raw().toBuffer());
    const yellow = await load(1);
    const average = (data, channels, x0, y0, x1, y1) => {
        let r = 0, g = 0, b = 0, n = 0;
        for (let y = y0; y < y1; y += 3) for (let x = x0; x < x1; x += 3) { const i = (y * S + x) * channels; r += data[i]; g += data[i + 1]; b += data[i + 2]; n++; }
        return hex(r / n, g / n, b / n);
    };
    const cream = average(card, 3, 60, 820, 420, 1150);
    const solid = (i) => yellow[i * 4 + 3] >= SOLID;
    const [main, ...drops] = blobsOf(yellow, solid);
    const inMain = new Uint8Array(S * S);
    main.pixels.forEach((i) => { inMain[i] = 1; });
    // The edge: the first px of the main body of yellow, row by row, down to the horizon
    const step = 8, y0 = 0, xs = [];
    for (let y = y0; y < 1500; y += step) {
        let x = 0;
        while (x < S && !inMain[y * S + x]) x++;
        xs.push(x);
    }
    // The drops: the yellow ones loose in the cream, and the holes of cream in the yellow
    const holes = blobsOf(yellow, (i) => yellow[i * 4 + 3] < SOLID).slice(1);
    const bubbles = [
        ...drops.filter((b) => b.area > 60 && b.y < 1500).map((b) => [...ellipseOf(b), 1]),
        ...holes.filter((b) => b.area > 60 && b.y < 1500).map((b) => [...ellipseOf(b), -1]),
    ];
    scene.sky = { cream, yellow: main.color, edge: { y0: y0 + 0, step, x: xs }, bubbles };
}

// ---- The sun: the disc inside its solid middle, and dots for everything round it
{
    const data = await load(5);
    const [main, ...rest] = blobsOf(data);
    const inMain = new Uint8Array(S * S);
    main.pixels.forEach((i) => { inMain[i] = 1; });
    const cx = main.x, cy = main.y;
    let r = 10;
    for (; r < 500; r += 4) {
        let inner = 0, all = 0;
        for (let a = 0; a < 360; a += 3) {
            const x = Math.round(cx + Math.cos(a * Math.PI / 180) * r), y = Math.round(cy + Math.sin(a * Math.PI / 180) * r);
            all++;
            if (inMain[y * S + x]) inner++;
        }
        if (inner / all < 0.97) break;
    }
    const R = r - 8;
    const dots = rest.filter((b) => b.area >= 3).map((b) => [Math.round(b.x), Math.round(b.y), +Math.sqrt(b.area / Math.PI).toFixed(1)]);
    const FILL = 9;
    for (let y = Math.floor(cy - 400); y < cy + 400; y += FILL) {
        for (let x = Math.floor(cx - 400) + ((y / FILL) % 2) * FILL / 2; x < cx + 400; x += FILL) {
            const px = Math.round(x + (Math.random() - 0.5) * FILL * 0.6), py = Math.round(y + (Math.random() - 0.5) * FILL * 0.6);
            if (px < 0 || py < 0 || px >= S || py >= S || !inMain[py * S + px]) continue;
            if (Math.hypot(px - cx, py - cy) < R - 6) continue;
            dots.push([px, py, +(4 + Math.random() * 2).toFixed(1)]);
        }
    }
    scene.sun = { x: Math.round(cx), y: Math.round(cy), r: R, color: main.color, dots };
}

// ---- The specks of the sky as particles (10, 11), and what in 11 is bigger than a speck cut out into an atlas
{
    const cuts = [];
    for (const n of [10, 11]) {
        const data = await load(n);
        for (const blob of blobsOf(data, (i) => data[i * 4 + 3] > 0)) {
            const [x0, y0, x1, y1] = blob.box;
            if (Math.max(x1 - x0, y1 - y0) < 22) {
                if (blob.area >= 2) scene.dots.push([Math.round(blob.x), Math.round(blob.y), +Math.sqrt(blob.area / Math.PI).toFixed(1), blob.color]);
                continue;
            }
            cuts.push({ data, blob });
        }
    }
    // The ringed planet is two blobs (its ball and its ring): what is near belongs together
    const pieces = [];
    cuts.forEach((c) => {
        const near = pieces.find((p) => c.blob.box[0] - 20 <= p.box[2] && p.box[0] - 20 <= c.blob.box[2] && c.blob.box[1] - 20 <= p.box[3] && p.box[1] - 20 <= c.blob.box[3]);
        if (near) { near.blobs.push(c); near.box = [Math.min(near.box[0], c.blob.box[0]), Math.min(near.box[1], c.blob.box[1]), Math.max(near.box[2], c.blob.box[2]), Math.max(near.box[3], c.blob.box[3])]; }
        else pieces.push({ blobs: [c], box: [...c.blob.box] });
    });
    const GAP = 6;
    let ax = GAP, rowH = 0;
    const placed = pieces.map((p) => {
        const x0 = p.box[0] - 3, y0 = p.box[1] - 3, w = p.box[2] - p.box[0] + 7, h = p.box[3] - p.box[1] + 7;
        const pixels = Buffer.alloc(w * h * 4);
        p.blobs.forEach(({ data, blob }) => blob.pixels.forEach((i) => {
            const x = i % S - x0, y = (i - (i % S)) / S - y0;
            data.copy(pixels, (y * w + x) * 4, i * 4, i * 4 + 4);
        }));
        const at = { x: x0, y: y0, w, h, ax, ay: GAP, pixels };
        ax += w + GAP;
        rowH = Math.max(rowH, h);
        return at;
    });
    const AW = ax, AH = rowH + 2 * GAP;
    await webp(sharp({ create: { width: AW, height: AH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
        .composite(placed.map((c) => ({ input: c.pixels, raw: { width: c.w, height: c.h, channels: 4 }, left: c.ax, top: c.ay }))))
        .toFile(path.join(target, 'bits.webp'));
    scene.atlas = [AW, AH];
    scene.bits = placed.map((c) => [c.x, c.y, c.w, c.h, c.ax, c.ay]);
}

// ---- The banks' colours and the horizon's line, for the land past the frame; the rulitos' places
{
    const colourOf = async (n) => (await blobsOf(await load(n)))[0].color;
    const line = await load(14);
    const lineBlobs = blobsOf(line, (i) => line[i * 4 + 3] > 0);
    // Where each bank's top meets the frame's edge (its line drawn over it)
    const topAt = async (n, x) => { const data = await load(n); let y = 0; while (y < S && data[(y * S + x) * 4 + 3] < SOLID) y++; return y; };
    scene.ground = { left: await colourOf(4), right: await colourOf(3), line: lineBlobs[0].color, horizon: Math.round(lineBlobs[0].y), tops: [await topAt(4, 2), await topAt(3, S - 3)] };
    for (const n of [16, 17]) scene.rulitos.push(boxOf(await load(n)));
}

await writeFile(path.join(root, 'src', 'composables', 'aceptacionScene.json'), JSON.stringify(scene));
console.log(counts);
console.log(Object.keys(scene.boxes).length, 'pictures', JSON.stringify(scene.boxes), '\nsky', scene.sky.cream.toString(16), scene.sky.yellow.toString(16), scene.sky.edge.x.length, 'rows,',
    scene.sky.bubbles.length, 'bubbles', JSON.stringify(scene.sky.bubbles), '\nsun', scene.sun.x, scene.sun.y, scene.sun.r, scene.sun.color.toString(16), scene.sun.dots.length, 'dots; planet',
    scene.planet.dots.length, 'dots', scene.planet.color.toString(16), '; sky', scene.dots.length, 'dots;', scene.bits.length, 'bits', scene.atlas, '\nground', JSON.stringify(scene.ground), 'rulitos', JSON.stringify(scene.rulitos));
