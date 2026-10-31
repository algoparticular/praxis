// The layers of Armonía as exported (originales/armonia/Destinados_1-N.png, 3240px) -> public/assets/armonia/*.webp, each
// scaled to the 2160 square of the other scenes and cropped to its own box, and src/composables/armoniaScene.json, all in
// px of the 2160 square:
//   boxes      the box of every picture
//   water      the water behind everything is not a picture: no layer has it (the illustrator's background was not
//              exported), so it is read from the finished card (public/cards/12.webp) where no layer covers it, row by
//              row (averaged across), as [y, 0xRRGGBB] stops for a gradient drawn in code; above the top band it is the
//              teal of the currents (1)
//   currents   the teal currents of the water (fills 1 and their outlines 2), each piece its own picture (current0 is the
//              band along the top), with the sides of the square it touches ([left, right]), so the scene can mirror it
//              past the frame
//   jellies    the two jellyfish, each in three pictures so they can live (and be played) on their own: the tentacles
//              (42, 47), the bell (fill 43/48, its shading 44/49 and its outline 45/50) and the closed eyes (46, 51); with
//              the point where the tentacles hang from the bell (`rim`, [x, y]) and the bell's box (`bell`)
//   auras      the yellow stipple round each bell (41), as dots [x, y, radius], one list per jellyfish
//   anemones   the two clusters of anemones (pots 19/35, their lines 20/36, the crowns 22/38 and their outlines 23/39),
//              each one picture, with where each of its three crowns leaves its pot ([x, y, w]: the point it sways about
//              and its width) and the yellow stipple of their glow as dots: behind them (18, 34) and over the pots (21,
//              24, 37, 40; the dots that would fall on a crown or an outline are dropped, as the layer order hid them)
//   motes      the yellow specks floating in the water (52), as dots [x, y, radius]
// The plants are pictures of their own so each can sway: the seaweeds (4-6, 28-30), the teal corals (12-14, 25-27,
// 31-33) and the pink tube corals (7-9, 15-17); the sand (10, 11) and the little mark on it (3) are pictures too.
// The shading of the bells (44, 49) was a dark layer laid over the cream at about a fifth in the card (a blend mode the
// export lost): it is kept at SHADE of its alpha. Every layer is used; none of them is the card's rulito (it has none).
// The originals are not kept in the repo once converted. Usage: node scripts/convert-armonia.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'originales', 'armonia');
const target = path.join(root, 'public', 'assets', 'armonia');
const file = (n) => path.join(source, `Destinados_1-${n}.png`);
const S = 2160;
const SHADE = 0.2;

// Pictures made of one or more layers, drawn in this order (as the layers were)
const pictures = {
    mark: [3], weedR: [4, 5, 6], tubeL: [7, 8, 9], sand: [10, 11],
    coralR: [12, 13, 14], tubeR: [15, 16, 17], anemR: [19, 20, 22, 23],
    coralL: [25, 26, 27], weedL: [28, 29, 30], coralL2: [31, 32, 33], anemL: [35, 36, 38, 39],
    tentL: [42], bellL: [43, 44, 45], eyesL: [46],
    tentR: [47], bellR: [48, 49, 50], eyesR: [51],
};
const PAD = 4;
const SOLID = 110;

// Every layer at the 2160 square, once
const cache = new Map();
const layer = async (n) => {
    if (!cache.has(n)) {
        const img = sharp(file(n)).ensureAlpha().resize(S, S, { kernel: 'lanczos3' });
        const { data } = await img.raw().toBuffer({ resolveWithObject: true });
        if (n === 44 || n === 49) for (let i = 3; i < data.length; i += 4) data[i] = Math.round(data[i] * SHADE);
        cache.set(n, data);
    }
    return cache.get(n);
};
const raw = { raw: { width: S, height: S, channels: 4 } };
const webp = (img) => img.webp({ quality: 84, alphaQuality: 85, effort: 6 });
const flatten = async (layers) => sharp({ create: { width: S, height: S, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(await Promise.all(layers.map(async (n) => ({ input: await layer(n), ...raw })))).raw().toBuffer();
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

// Every blob of solid pixels: its pixels, area and centre
const blobsOf = (data, keep = () => true, solidAt = SOLID) => {
    const seen = new Uint8Array(S * S);
    const blobs = [];
    const stack = [];
    const solid = (i) => data[i * 4 + 3] >= solidAt && keep(i);
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

// The tentacles are hundreds of thin lines, heavy at full size: they are kept smaller (the box stays in px of the square)
const SMALL = { tentL: 0.62, tentR: 0.62 };
const save = async (name, data, box) => {
    let img = sharp(data, raw).extract({ left: box[0], top: box[1], width: box[2], height: box[3] });
    if (SMALL[name]) img = sharp(await img.png().toBuffer()).resize(Math.round(box[2] * SMALL[name]), Math.round(box[3] * SMALL[name]), { kernel: 'lanczos3' });
    await webp(img).toFile(path.join(target, `${name}.webp`));
    scene.boxes[name] = box;
};

// A dot wherever a stipple is, as dense as it is (keep(x, y) can leave some out)
const stipple = (data, { step = 5, rate = 0.9, size = [1.6, 1.5], keep = () => true, region = () => true } = {}) => {
    const dots = [];
    for (let y = 0; y < S; y += step) {
        for (let x = 0; x < S; x += step) {
            if (!region(x, y)) continue;
            const a = data[(y * S + x) * 4 + 3] / 255;
            if (a < 0.05 || Math.random() > a * rate) continue;
            const px = Math.min(S - 1, Math.max(0, x + Math.round((Math.random() - 0.5) * step)));
            const py = Math.min(S - 1, Math.max(0, y + Math.round((Math.random() - 0.5) * step)));
            if (!keep(px, py)) continue;
            dots.push([px, py, +(size[0] + Math.random() * size[1]).toFixed(1)]);
        }
    }
    return dots;
};

await mkdir(target, { recursive: true });
const scene = { size: S, boxes: {}, water: [], currents: [], jellies: [], auras: [], anemones: [], motes: [] };

// Plain pictures
for (const [name, layers] of Object.entries(pictures)) {
    const flat = await flatten(layers);
    await save(name, flat, boxOf(flat));
}

// The currents: the teal fills with their outlines, each piece on its own (with the soft edge round its solid pixels)
{
    const flat = await flatten([1, 2]);
    const blobs = blobsOf(flat, () => true, 30).filter((b) => b.area > 2000);
    const mine = new Int16Array(S * S).fill(-1);
    blobs.forEach((b, k) => b.pixels.forEach((i) => { mine[i] = k; }));
    // Every pixel that is not solid goes with the nearest piece within a few px
    const owner = new Int16Array(S * S).fill(-1);
    for (let i = 0; i < S * S; i++) {
        if (flat[i * 4 + 3] < 1) continue;
        if (mine[i] >= 0) { owner[i] = mine[i]; continue; }
        const x = i % S, y = (i - x) / S;
        search: for (let r = 1; r <= 6; r++) {
            for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
                const xx = x + dx, yy = y + dy;
                if (xx < 0 || yy < 0 || xx >= S || yy >= S) continue;
                const k = mine[yy * S + xx];
                if (k >= 0) { owner[i] = k; break search; }
            }
        }
    }
    const order = blobs.map((b, k) => ({ b, k })).sort((p, q) => p.b.y - q.b.y);
    for (const [n, { k }] of order.entries()) {
        const only = Buffer.from(flat);
        for (let i = 0; i < S * S; i++) if (owner[i] !== k) only[i * 4 + 3] = 0, only[i * 4] = only[i * 4 + 1] = only[i * 4 + 2] = 0;
        const box = boxOf(only);
        await save(`current${n}`, only, box);
        scene.currents.push({ name: `current${n}`, sides: [box[0] <= PAD ? 1 : 0, box[0] + box[2] >= S - PAD ? 1 : 0] });
    }
}

// The water: the finished card where no layer covers it, averaged across each band of STEP rows
{
    const { data: card, info } = await sharp(path.join(root, 'public', 'cards', '12.webp')).resize(S, S).raw().toBuffer({ resolveWithObject: true });
    const all = await flatten(Array.from({ length: 52 }, (_, i) => i + 1));
    const teal = await layer(1);
    let tr = 0, tg = 0, tb = 0, tn = 0;
    for (let i = 0; i < S * S; i += 97) if (teal[i * 4 + 3] > 250) { tr += teal[i * 4]; tg += teal[i * 4 + 1]; tb += teal[i * 4 + 2]; tn++; }
    const STEP = 48;
    for (let y = 0; y < S; y += STEP) {
        let r = 0, g = 0, b = 0, n = 0;
        for (let yy = y; yy < y + STEP; yy += 3) {
            for (let x = 0; x < S; x += 6) {
                if (all[(yy * S + x) * 4 + 3] > 0) continue;
                const i = (yy * S + x) * info.channels;
                r += card[i]; g += card[i + 1]; b += card[i + 2]; n++;
            }
        }
        if (n < 40) { if (!scene.water.length) scene.water.push([y + STEP / 2, hex(tr / tn, tg / tn, tb / tn)]); continue; }
        scene.water.push([y + STEP / 2, hex(r / n, g / n, b / n)]);
    }
    // Only where the colour changes (the water is almost even)
    const close = (a, b) => [16, 8, 0].every((s) => Math.abs(((a >> s) & 255) - ((b >> s) & 255)) <= 1);
    scene.water = scene.water.filter(([, c], i, all) => i === 0 || i === all.length - 1 || !close(c, all[i - 1][1]));
}

// The jellyfish: where the tentacles hang from the bell, and their auras (the stipple of 41, split between them)
{
    const aura = await layer(41);
    for (const side of ['L', 'R']) {
        const bell = scene.boxes[`bell${side}`];
        const tent = scene.boxes[`tent${side}`];
        scene.jellies.push({ side, bell, rim: [Math.round(bell[0] + bell[2] / 2), Math.round(tent[1] + 12)] });
    }
    const middle = (scene.boxes.bellL[0] + scene.boxes.bellL[2] + scene.boxes.bellR[0]) / 2;
    scene.auras = [
        stipple(aura, { step: 9, rate: 0.8, size: [2, 1.8], region: (x) => x < middle }),
        stipple(aura, { step: 9, rate: 0.8, size: [2, 1.8], region: (x) => x >= middle }),
    ];
}

// The anemones: where each crown leaves its pot (the crowns' blobs gathered round three seeds per cluster), and their glow
{
    const SEEDS = { anemL: [[207, 1650], [193, 1930], [340, 1915]], anemR: [[1985, 1660], [1875, 1910], [2040, 1945]] };
    const GLOW = { anemL: { back: [34], front: [37, 40], crowns: [38, 39] }, anemR: { back: [18], front: [21, 24], crowns: [22, 23] } };
    for (const [name, seeds] of Object.entries(SEEDS)) {
        const crowns = await layer(GLOW[name].crowns[0]);
        // The crowns' solid pixels (one in nine), each a blob of its own: the crowns touch, so they are told apart by k-means
        const blobs = [];
        for (let y = 0; y < S; y += 3) for (let x = 0; x < S; x += 3) if (crowns[(y * S + x) * 4 + 3] >= SOLID) blobs.push({ x, y, area: 1, pixels: [y * S + x] });
        // k-means from the seeds
        let centres = seeds.map(([x, y]) => ({ x, y }));
        let parts = [];
        for (let round = 0; round < 8; round++) {
            parts = centres.map(() => []);
            blobs.forEach((b) => {
                const k = centres.reduce((best, c, j) => (Math.hypot(b.x - c.x, b.y - c.y) < Math.hypot(b.x - centres[best].x, b.y - centres[best].y) ? j : best), 0);
                parts[k].push(b);
            });
            centres = parts.map((list, j) => (list.length ? {
                x: list.reduce((s, b) => s + b.x * b.area, 0) / list.reduce((s, b) => s + b.area, 0),
                y: list.reduce((s, b) => s + b.y * b.area, 0) / list.reduce((s, b) => s + b.area, 0),
            } : centres[j]));
        }
        // Each crown sways about the bottom of its tentacles, the width of the crown
        const sways = parts.map((list) => {
            let x0 = S, x1 = 0, y1 = 0;
            list.forEach((b) => b.pixels.forEach((i) => { const x = i % S, y = (i - x) / S; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }));
            return [Math.round((x0 + x1) / 2), y1, x1 - x0];
        });
        const cover = await flatten(GLOW[name].crowns);
        const open = (x, y) => cover[(y * S + x) * 4 + 3] < 20;
        const back = await flatten(GLOW[name].back);
        const front = await flatten(GLOW[name].front);
        scene.anemones.push({
            name, crowns: sways,
            back: stipple(back, { step: 8, rate: 0.7, size: [2, 1.6] }),
            front: stipple(front, { step: 7, rate: 0.7, size: [2, 1.6], keep: open }),
        });
    }
}

// The specks in the water: every blob of 52 a dot
{
    const data = await layer(52);
    scene.motes = blobsOf(data, () => true, 40).filter((b) => b.area >= 2)
        .map((b) => [Math.round(b.x), Math.round(b.y), +Math.max(1.2, Math.sqrt(b.area / Math.PI)).toFixed(1)]);
}

await writeFile(path.join(root, 'src', 'composables', 'armoniaScene.json'), JSON.stringify(scene));
console.log(Object.keys(scene.boxes).length, 'pictures;', scene.water.length, 'water stops;', scene.currents.map((c) => `${c.name} ${scene.boxes[c.name]} ${c.sides}`).join('; '),
    '; auras', scene.auras.map((a) => a.length), '; anemones', scene.anemones.map((a) => `${a.name} ${JSON.stringify(a.crowns)} back ${a.back.length} front ${a.front.length}`).join('; '),
    '; motes', scene.motes.length, '; jellies', JSON.stringify(scene.jellies));
