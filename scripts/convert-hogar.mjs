// The layers of Hogar as exported (originales/hogar/Cell_-_Fungi-N.png, 3240px), scaled to the 2160 square of the other
// scenes -> public/assets/hogar/*.webp, each cropped to its own box, and src/composables/hogarScene.json, all in px of
// the 2160 square:
//   boxes      the box of every picture
//   cell       the inside of the cell is not a picture: the biggest disc that fits inside its body (9) ([x, y, r]) and
//              its colour; the body outside that disc (the stalks' fills, its spiky rim) goes into the crown, which turns
//   nucleus    a disc in code too (15): [x, y, r] and its colour; `stipple` its lighter dots (16) as [x, y, radius]
//   puntos     the three little circles of the organelles (from 10) are discs: [x, y, r] each, and their colour
//   pieces     the other organelles (10), each its own picture, so each bobs in the water on its own (golgi, bucle,
//              garabato, rulo, vesiculas, mitocondria); `specks` the loose dots of 10 as [x, y, radius] and their colour
//   larva      the larva (11 to 14) is one picture; `larvaBody` the middle of its body (11), where it floats from
//   antennae   the eight blue-tipped antennae among the mushrooms (5), each its own picture so it can sway from its
//              foot, with `foot` [x, y] (its end nearest the cell; what the body covers is cut off) and `tip` [x, y, r] (the blue disc of 4, in code)
//   caps       the mushrooms' caps that can be touched (the bigger blobs of 7) as [x, y, r]: their touch targets, the
//              roots of Arraigar end under them and each lights there
//   dust       the dense orange stipple round the planet (2) as a density map (cols x rows cells of `cell` px from x, y;
//              each byte the covered fraction / max), drawn back as particles
//   sparse     the loose orange dots farther out (3) and `sky` the purple dots of the sky (1), as [x, y, radius]
// Not converted: 18 (the illustrator's mark, in the corner of the square; the scene's layout never shows that corner).
// The card has no rulito: the game draws it in code over the larva. The flat grey of the sky is the card's colour,
// behind the stage. The originals are not kept in the repo once converted.
// Usage: node scripts/convert-hogar.mjs [folder of the originals, default originales/hogar]
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.resolve(process.argv[2] ?? path.join(root, 'originales', 'hogar'));
const target = path.join(root, 'public', 'assets', 'hogar');
const file = (n) => path.join(source, `Cell_-_Fungi-${n}.png`);
const S = 2160;
const PAD = 4;
const SOLID = 110;

const scaled = (n) => sharp(file(n)).resize(S, S, { kernel: 'lanczos3' }).ensureAlpha().png().toBuffer();
const rawOf = async (png) => (await sharp(png).raw().toBuffer({ resolveWithObject: true })).data;
const load = async (n) => rawOf(await scaled(n));
const webp = (img) => img.webp({ quality: 88, alphaQuality: 90, effort: 6 });
const hex = (r, g, b) => (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
const flatten = async (inputs) => sharp({ create: { width: S, height: S, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(await Promise.all(inputs.map(async (n) => (typeof n === 'number'
        ? { input: await scaled(n) }
        : { input: n, raw: { width: S, height: S, channels: 4 } })))).png().toBuffer();
const r1 = (v) => +v.toFixed(1);

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

// Every blob of solid pixels: its pixels, area, centre, box and mean colour
const blobsOf = (data, solidFrom = SOLID) => {
    const seen = new Uint8Array(S * S);
    const blobs = [];
    const stack = [];
    const solid = (i) => data[i * 4 + 3] >= solidFrom;
    for (let start = 0; start < S * S; start++) {
        if (seen[start] || !solid(start)) continue;
        const pixels = [];
        let sx = 0, sy = 0, cr = 0, cg = 0, cb = 0, x0 = S, y0 = S, x1 = 0, y1 = 0;
        stack.push(start);
        seen[start] = 1;
        while (stack.length) {
            const i = stack.pop();
            const x = i % S, y = (i - x) / S;
            pixels.push(i);
            sx += x; sy += y;
            cr += data[i * 4]; cg += data[i * 4 + 1]; cb += data[i * 4 + 2];
            x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
            for (const j of [x > 0 ? i - 1 : -1, x < S - 1 ? i + 1 : -1, y > 0 ? i - S : -1, y < S - 1 ? i + S : -1]) {
                if (j < 0 || seen[j] || !solid(j)) continue;
                seen[j] = 1;
                stack.push(j);
            }
        }
        const n = pixels.length;
        blobs.push({ pixels, area: n, x: sx / n, y: sy / n, box: [x0, y0, x1, y1], color: [cr / n, cg / n, cb / n] });
    }
    return blobs.sort((a, b) => b.area - a.area);
};

// A field of dots as [x, y, radius]: a lone dot is itself; where dots overlap into a bigger blob, it is filled with dots
// of the usual size, so a clump stays a clump of dots
const dotsOf = (blobs, typical) => {
    const out = [];
    const big = Math.PI * typical * typical * 2.2;
    for (const b of blobs) {
        if (b.area < 3) continue;
        if (b.area <= big) { out.push([r1(b.x), r1(b.y), r1(Math.sqrt(b.area / Math.PI))]); continue; }
        const mine = new Set(b.pixels);
        const step = typical * 1.5;
        const [x0, y0, x1, y1] = b.box;
        for (let y = y0 + step / 2; y <= y1; y += step) {
            for (let x = x0 + step / 2 + ((Math.round(y / step) % 2) * step) / 2; x <= x1; x += step) {
                const px = Math.round(x + (Math.random() - 0.5) * step * 0.4), py = Math.round(y + (Math.random() - 0.5) * step * 0.4);
                if (!mine.has(py * S + px)) continue;
                out.push([px, py, r1(typical * (0.85 + Math.random() * 0.3))]);
            }
        }
    }
    return out;
};
const mean = (blobs) => {
    const area = blobs.reduce((s, b) => s + b.area, 0) || 1;
    return hex(...[0, 1, 2].map((k) => blobs.reduce((s, b) => s + b.color[k] * b.area, 0) / area));
};

// A picture of only some pixels of a layer (with the soft edge round them), cropped to its box
const cutOut = async (data, keepSet, name, grow = 3) => {
    const keep = new Uint8Array(S * S);
    for (const i of keepSet) {
        for (let dy = -grow; dy <= grow; dy++) for (let dx = -grow; dx <= grow; dx++) { const j = i + dy * S + dx; if (j >= 0 && j < S * S) keep[j] = 1; }
    }
    const only = Buffer.from(data);
    for (let i = 0; i < S * S; i++) if (!keep[i]) only[i * 4 + 3] = 0;
    const box = boxOf(only);
    await webp(sharp(only, { raw: { width: S, height: S, channels: 4 } }).extract({ left: box[0], top: box[1], width: box[2], height: box[3] }))
        .toFile(path.join(target, `${name}.webp`));
    scene.boxes[name] = box;
};
const picture = async (png, name) => {
    const box = boxOf(await rawOf(png));
    await webp(sharp(png).extract({ left: box[0], top: box[1], width: box[2], height: box[3] })).toFile(path.join(target, `${name}.webp`));
    scene.boxes[name] = box;
};

await mkdir(target, { recursive: true });
const scene = { size: S, boxes: {} };

// The inside of the cell (9): the biggest disc that fits in its body, its centre searched round the body's middle
const body = await load(9);
{
    const [main] = blobsOf(body);
    const inMain = new Uint8Array(S * S);
    main.pixels.forEach((i) => { inMain[i] = 1; });
    const fits = (cx, cy, r) => {
        for (let a = 0; a < 360; a += 2) {
            const x = Math.round(cx + Math.cos(a * Math.PI / 180) * r), y = Math.round(cy + Math.sin(a * Math.PI / 180) * r);
            if (!inMain[y * S + x]) return false;
        }
        return true;
    };
    let best = { x: main.x, y: main.y, r: 0 };
    for (let dy = -40; dy <= 40; dy += 4) {
        for (let dx = -40; dx <= 40; dx += 4) {
            const cx = main.x + dx, cy = main.y + dy;
            let r = best.r;
            if (!fits(cx, cy, r)) continue;
            while (fits(cx, cy, r + 1)) r++;
            if (r > best.r) best = { x: cx, y: cy, r };
        }
    }
    scene.cell = { x: r1(best.x), y: r1(best.y), r: best.r, color: hex(...main.color) };
}

// The crown: the gills, the caps, their red dots, the cell's body outside its disc (it goes a little under the disc
// drawn in code, so no seam shows as the crown turns) and the line work
{
    const ring = Buffer.from(body);
    const { x, y, r } = scene.cell;
    const inner = r - 8;
    for (let py = 0; py < S; py++) for (let px = 0; px < S; px++) if (Math.hypot(px - x, py - y) < inner) ring[(py * S + px) * 4 + 3] = 0;
    await picture(await flatten([6, 7, 8, ring, 17]), 'crown');
}

// The caps that can be touched: the bigger blobs of pink (7), never smaller than a finger can find
{
    const caps = blobsOf(await load(7)).filter((b) => b.area >= 760);
    scene.caps = caps.map((b) => [r1(b.x), r1(b.y), r1(Math.max(24, 1.05 * Math.sqrt(b.area / Math.PI)))]);
}

// The nucleus (15) and its stipple (16)
{
    const [n] = blobsOf(await load(15));
    scene.nucleus = { x: r1(n.x), y: r1(n.y), r: r1(Math.sqrt(n.area / Math.PI)), color: hex(...n.color) };
    const dots = blobsOf(await load(16), 60);
    scene.stipple = dotsOf(dots, 3.2);
    scene.stippleColor = mean(dots);
}

// The organelles (10): the loose dots are particles, the three little circles discs, every other piece a picture
{
    const data = await load(10);
    const blobs = blobsOf(data, 60);
    // Where each organelle is drawn (px of the 3240 original, as the illustrator placed them)
    const seeds = {
        golgi: [1745, 1996], bucle: [1214, 1553], mitocondria: [2068, 1613], vesiculas: [1330, 1840],
        garabato: [1987, 1368], rulo: [1540, 1813], puntos: [1633, 1213],
    };
    const owner = (b) => Object.entries(seeds)
        .map(([name, [sx, sy]]) => [name, Math.hypot(b.x - sx * 2 / 3, b.y - sy * 2 / 3)])
        .sort((a, b) => a[1] - b[1])[0][0];
    const groups = {};
    const big = blobs.filter((b) => b.area >= 90);
    big.forEach((b) => (groups[owner(b)] ??= []).push({ blobs: [b], area: b.area, x: b.x, y: b.y }));
    // A small blob within a few px of an organelle is part of it (the hairs of the vesicles); the rest are loose dots
    const nearBig = new Uint8Array(S * S);
    const NEAR = 5;
    big.forEach((b) => b.pixels.forEach((i) => {
        for (let dy = -NEAR; dy <= NEAR; dy++) for (let dx = -NEAR; dx <= NEAR; dx++) { const j = i + dy * S + dx; if (j >= 0 && j < S * S) nearBig[j] = 1; }
    }));
    const specks = [];
    blobs.filter((b) => b.area < 90).forEach((b) => {
        if (b.pixels.some((i) => nearBig[i])) groups[owner(b)].push({ blobs: [b], area: b.area, x: b.x, y: b.y });
        else specks.push(b);
    });
    scene.specks = dotsOf(specks, 3.5);
    scene.specksColor = mean(specks);
    scene.puntos = groups.puntos.map((p) => [r1(p.x), r1(p.y), r1(Math.sqrt(p.area / Math.PI) + 0.5)]);
    scene.puntosColor = mean(groups.puntos.flatMap((p) => p.blobs));
    scene.pieces = [];
    for (const [name, list] of Object.entries(groups)) {
        if (name === 'puntos') continue;
        await cutOut(data, list.flatMap((p) => p.blobs.flatMap((b) => b.pixels)), name);
        scene.pieces.push(name);
    }
}

// The larva (11 to 14), and the middle of its body
{
    await picture(await flatten([11, 12, 13, 14]), 'larva');
    const [b] = blobsOf(await load(11));
    scene.larvaBody = [r1(b.x), r1(b.y)];
}

// The antennae (5), each on its own, and the blue discs at their tips (4)
{
    const data = await load(5);
    const tips = blobsOf(await load(4)).slice(0, 8);
    const parts = tips.map(() => []);
    for (const b of blobsOf(data, 40)) {
        let best = 0, d = Infinity;
        tips.forEach((t, k) => {
            for (const i of b.pixels) { const x = i % S, y = (i - x) / S, e = Math.hypot(x - t.x, y - t.y); if (e < d) { d = e; best = k; } }
        });
        parts[best].push(...b.pixels);
    }
    const order = tips.map((t, k) => [k, Math.atan2(t.y - scene.cell.y, t.x - scene.cell.x)]).sort((a, b) => a[1] - b[1]).map(([k]) => k);
    scene.antennae = [];
    for (const [k, which] of order.entries()) {
        // What the cell's body covers is never seen (it is drawn over them): only what shows is kept
        const pixels = parts[which].filter((i) => body[i * 4 + 3] < 200);
        const tip = tips[which];
        let foot = null, d = Infinity;
        for (const i of pixels) {
            const x = i % S, y = (i - x) / S, e = Math.hypot(x - scene.cell.x, y - scene.cell.y);
            if (e < d) { d = e; foot = [x, y]; }
        }
        const name = `antenna${k}`;
        await cutOut(data, pixels, name);
        scene.antennae.push({ name, foot, tip: [r1(tip.x), r1(tip.y), r1(Math.sqrt(tip.area / Math.PI) + 0.6)] });
    }
    scene.tipColor = mean(tips);
}

// The orange stipple round the planet (2) as a density map: the fraction of each cell it covers
{
    const data = await load(2);
    const CELL = 10;
    const [x0, y0, w, h] = boxOf(data);
    const cols = Math.ceil(w / CELL), rows = Math.ceil(h / CELL);
    const cover = new Float32Array(cols * rows);
    for (let y = y0; y < y0 + h; y++) {
        for (let x = x0; x < x0 + w; x++) cover[Math.floor((y - y0) / CELL) * cols + Math.floor((x - x0) / CELL)] += data[(y * S + x) * 4 + 3] / 255 / (CELL * CELL);
    }
    const max = Math.max(...cover);
    const bytes = Buffer.from(Array.from(cover, (v) => Math.round(v / max * 255)));
    scene.dust = { x: x0, y: y0, cols, rows, cell: CELL, max: +max.toFixed(3), data: bytes.toString('base64') };
    const dots = blobsOf(data);
    scene.dustColor = mean(dots);
}

// The loose dots farther out (3) and the sky's (1)
{
    const sparse = blobsOf(await load(3), 60);
    scene.sparse = dotsOf(sparse, 4.5);
    scene.sparseColor = mean(sparse);
    const sky = blobsOf(await load(1), 60);
    scene.sky = dotsOf(sky, 9);
    scene.skyColor = mean(sky);
}

await writeFile(path.join(root, 'src', 'composables', 'hogarScene.json'), JSON.stringify(scene));
const hx = (v) => `#${v.toString(16).padStart(6, '0')}`;
console.log(Object.keys(scene.boxes).length, 'pictures; cell', JSON.stringify({ ...scene.cell, color: hx(scene.cell.color) }), 'nucleus',
    JSON.stringify({ ...scene.nucleus, color: hx(scene.nucleus.color) }), '; stipple', scene.stipple.length, hx(scene.stippleColor),
    '; specks', scene.specks.length, hx(scene.specksColor), '; puntos', JSON.stringify(scene.puntos), hx(scene.puntosColor),
    '; pieces', scene.pieces.join(' '), '; caps', scene.caps.length, '; antennae', scene.antennae.length, hx(scene.tipColor),
    '; dust', `${scene.dust.cols}x${scene.dust.rows}`, hx(scene.dustColor), '; sparse', scene.sparse.length, hx(scene.sparseColor),
    '; sky', scene.sky.length, hx(scene.skyColor));
