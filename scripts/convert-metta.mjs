// The layers of Metta as exported (originales/metta/Metta-N.png, 2160px) -> public/assets/metta/*.webp, each cropped to
// its own box, and src/composables/mettaScene.json, all in px of the 2160 square:
//   boxes      the box of every picture: the six beings round the nest (being0..5, left to right, each its fills, line and
//              arm), the fox, the squirrel, Sid (his upper body and arms), the nest of mushrooms with his round body in it,
//              the line along the top of the hill, the ground (stones, little mushrooms, tufts) and the six glowing flowers,
//              each its own picture so it can sway and light up
//   bits       small pieces cut out into one atlas (bits.webp): the eyes of every being and of Sid (so they can blink and
//              look about) and the three little squiggles of the sky, [name, x, y, w, h where drawn, x, y in the atlas]
//   sky        the night is not a picture: the navy of the card (it is in no layer, so it is read from public/cards/8.webp),
//              row by row, as [y, 0xRRGGBB] stops for a gradient drawn in code
//   hill       the ground is not a picture either: the top of the hill (6, a flat colour) as one y every HILL px across,
//              its colour, and where the line along its top (7) meets the sides ([y, width] at the left and the right), so
//              the scene can draw it, and go on with it past the frame on wide screens
//   halo, aura the great yellow light behind everything (2) and the turquoise one round Sid (4, with its stipple, 3): each a
//              disc in code ([x, y, r] and its colour) with every dot of its stippled edge as [x, y, radius] (its ragged
//              rim filled with dots too), so they can be alive
//   stars      the yellow stars of the sky (1) and the white ones inside the turquoise light (5), [x, y, radius]
//   glows      the light round each glowing flower (8): [x, y, r] and its stipple as dots
//   spores     the little yellow dots over the small mushrooms of the ground (8), [x, y, radius]
//   rulito     where the card draws it (71), for the game, which draws it in code
// Not converted: 10 (the Algo Particular mark, alone on the ground to the right: a signature) and 71 (the rulito over Sid:
// every rulito is drawn in code; only its box is kept). The originals are not kept in the repo once converted.
// Usage: node scripts/convert-metta.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'originales', 'metta');
const target = path.join(root, 'public', 'assets', 'metta');
const file = (n) => path.join(source, `Metta-${n}.png`);
const S = 2160;

// Pictures made of one or more layers, drawn in this order (the eyes are left out: they go in the atlas)
const pictures = {
    line: [7],
    being0: [11, 12, 13, 14], being1: [16, 17, 18, 19, 20, 21], being2: [23, 24, 25, 26, 27],
    being3: [29, 30, 31, 32, 33, 34], being4: [36, 37, 38, 39, 40, 41], being5: [43, 44, 45, 46],
    fox: [48, 49, 50, 51, 52, 53], squirrel: [54, 55, 56, 57, 58],
    sid: [59, 60, 61, 62, 63], nest: [65, 66, 67, 68, 69, 70],
};
const EYES = { being0: 15, being1: 22, being2: 28, being3: 35, being4: 42, being5: 47, sid: 64 };
const PAD = 4;
const SOLID = 110;
const HILL = 8;

const load = async (n) => sharp(file(n)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const webp = (img) => img.webp({ quality: 88, alphaQuality: 100, effort: 6 });
const flatten = (layers) => sharp({ create: { width: S, height: S, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(layers.map((n) => (typeof n === 'number' ? { input: file(n) } : { input: n, raw: { width: S, height: S, channels: 4 } }))).png().toBuffer();
const rawOf = async (png) => (await sharp(png).raw().toBuffer({ resolveWithObject: true })).data;
const hex = (r, g, b) => (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
const rand = (a, b) => a + Math.random() * (b - a);

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

// Every blob of solid pixels: its pixels, area, centre and box
const blobsOf = (data, keep = () => true) => {
    const seen = new Uint8Array(S * S);
    const blobs = [];
    const stack = [];
    const solid = (i) => data[i * 4 + 3] >= SOLID && keep(i);
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
    return blobs.sort((a, b) => b.area - a.area);
};

// Pieces: what is nearer than `join` px belongs together
const piecesOf = (blobs, join) => {
    const near = (a, b) => a[0] - join <= b[2] && b[0] - join <= a[2] && a[1] - join <= b[3] && b[1] - join <= a[3];
    const group = blobs.map((_, i) => i);
    const find = (i) => (group[i] === i ? i : (group[i] = find(group[i])));
    for (let i = 0; i < blobs.length; i++) for (let j = i + 1; j < blobs.length; j++) if (near(blobs[i].box, blobs[j].box)) group[find(i)] = find(j);
    const out = new Map();
    blobs.forEach((b, i) => { const g = find(i); if (!out.has(g)) out.set(g, []); out.get(g).push(b); });
    return [...out.values()].map((blobs) => {
        const area = blobs.reduce((s, b) => s + b.area, 0);
        const box = blobs.reduce((r, b) => [Math.min(r[0], b.box[0]), Math.min(r[1], b.box[1]), Math.max(r[2], b.box[2]), Math.max(r[3], b.box[3])], [S, S, 0, 0]);
        return { blobs, area, box, x: blobs.reduce((s, b) => s + b.x * b.area, 0) / area, y: blobs.reduce((s, b) => s + b.y * b.area, 0) / area };
    });
};

// A mask grown by `r` px round the pixels given (so a cut keeps the soft edge round them)
const grow = (pixels, r) => {
    const keep = new Uint8Array(S * S);
    for (const i of pixels) {
        const x = i % S, y = (i - x) / S;
        for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
            const xx = x + dx, yy = y + dy;
            if (xx >= 0 && yy >= 0 && xx < S && yy < S) keep[yy * S + xx] = 1;
        }
    }
    return keep;
};

const save = async (name, data) => {
    const box = boxOf(data);
    await webp(sharp(data, { raw: { width: S, height: S, channels: 4 } }).extract({ left: box[0], top: box[1], width: box[2], height: box[3] }))
        .toFile(path.join(target, `${name}.webp`));
    scene.boxes[name] = box;
};

// A light with a stippled edge: the biggest disc inside its solid middle, and dots for everything round it (the loose
// dots as they are, and its ragged rim filled with dots, as Viriya's sun)
const stippledDisc = (data, color, { fill = 9, size = [5, 7.5] } = {}) => {
    const [main, ...rest] = blobsOf(data);
    const inMain = new Uint8Array(S * S);
    main.pixels.forEach((i) => { inMain[i] = 1; });
    // Its centre: the middle of its box across, and down as far as it is wide (the hill may hide its bottom)
    const cx = (main.box[0] + main.box[2]) / 2;
    const cy = main.box[1] + (main.box[2] - main.box[0]) / 2;
    let r = 10;
    for (; r < 1000; r += 4) {
        let inside = 0, all = 0;
        for (let a = 0; a < 360; a += 3) {
            const x = Math.round(cx + Math.cos(a * Math.PI / 180) * r), y = Math.round(cy + Math.sin(a * Math.PI / 180) * r);
            if (x < 0 || y < 0 || x >= S || y >= S) continue;
            all++;
            if (inMain[y * S + x]) inside++;
        }
        if (inside / all < 0.97) break;
    }
    const R = r - 8;
    const dots = rest.filter((b) => b.area >= 3).map((b) => [Math.round(b.x), Math.round(b.y), +Math.sqrt(b.area / Math.PI).toFixed(1)]);
    const reach = (main.box[2] - main.box[0]) / 2 + 20;
    for (let y = Math.floor(cy - reach); y < cy + reach; y += fill) {
        for (let x = Math.floor(cx - reach) + ((y / fill) % 2) * fill / 2; x < cx + reach; x += fill) {
            const px = Math.round(x + (Math.random() - 0.5) * fill * 0.6), py = Math.round(y + (Math.random() - 0.5) * fill * 0.6);
            if (px < 0 || py < 0 || px >= S || py >= S || !inMain[py * S + px]) continue;
            if (Math.hypot(px - cx, py - cy) < R - 6) continue;
            dots.push([px, py, +rand(size[0], size[1]).toFixed(1)]);
        }
    }
    return { x: Math.round(cx), y: Math.round(cy), r: R, color, dots };
};

const colourOf = (data, keep = () => true) => {
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < S * S; i++) {
        if (data[i * 4 + 3] < 250 || !keep(i)) continue;
        r += data[i * 4]; g += data[i * 4 + 1]; b += data[i * 4 + 2]; n++;
    }
    return hex(r / n, g / n, b / n);
};

await mkdir(target, { recursive: true });
const scene = { size: S, boxes: {}, bits: [], atlas: [0, 0], sky: [], hill: null, halo: null, aura: null, stars: [], inner: [], glows: [], spores: [], flowers: [] };

// Plain pictures
for (const [name, layers] of Object.entries(pictures)) await save(name, await rawOf(await flatten(layers)));

// The night: the card's navy, row by row, from the pixels of the card that are sky (not stars, not the lights)
{
    const { data, info } = await sharp(path.join(root, 'public', 'cards', '8.webp')).resize(S, S).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const ch = info.channels;
    const STEP = 40;
    let last = 0;
    // (below 1000 the figures and the lights leave too little sky to read: the scene keeps the last colour down to the hill)
    for (let y = 0; y < 1000; y += STEP) {
        let r = 0, g = 0, b = 0, n = 0;
        for (let yy = y; yy < y + STEP; yy += 2) for (let x = 0; x < S; x += 3) {
            const i = (yy * S + x) * ch;
            const R = data[i], G = data[i + 1], B = data[i + 2];
            // The navy: blue over red, and dark (the stars are yellow, the lights yellow and turquoise, the lines darker)
            if (B < R + 30 || G > 110 || R > 80 || R < 32 || B < 85) continue;
            r += R; g += G; b += B; n++;
        }
        if (n > 200) last = hex(r / n, g / n, b / n);
        if (last) scene.sky.push([y + STEP / 2, last]);
    }
    // Only the stops where the colour changes (and the last one)
    scene.sky = scene.sky.filter(([, c], i, all) => i === 0 || i === all.length - 1 || c !== all[i - 1][1]);
}

// The hill: the top of its flat colour (6) every HILL px, its colour, and where the line along its top (7) meets the sides
{
    const { data } = await load(6);
    const top = [];
    for (let x = 0; x < S; x += HILL) {
        let y = 0;
        while (y < S && data[(y * S + Math.min(S - 1, x)) * 4 + 3] < 128) y++;
        top.push(y);
    }
    top.push(top[top.length - 1]);
    const line = (await load(7)).data;
    const side = (x) => {
        let y0 = -1, y1 = -1;
        for (let y = 1300; y < S; y++) if (line[(y * S + x) * 4 + 3] >= 128) { if (y0 < 0) y0 = y; y1 = y; }
        return [Math.round((y0 + y1) / 2), y1 - y0 + 1];
    };
    scene.hill = { step: HILL, top, color: colourOf(data), line: colourOf(line), left: side(3), right: side(S - 4) };
}

// The lights: the great yellow one (2) and the turquoise one round Sid (3 and 4: its stipple and its disc)
scene.halo = stippledDisc((await load(2)).data, 0xffe699, { fill: 11, size: [6, 8.5] });
{
    const aura = await rawOf(await flatten([3, 4]));
    scene.aura = stippledDisc(aura, colourOf((await load(4)).data), { fill: 10, size: [5.5, 7.5] });
    scene.halo.color = colourOf((await load(2)).data);
}

// The stars (1) and the white dots in the turquoise light (5); the few bigger shapes among them are the little squiggles,
// cut out into the atlas
const cuts = [];
const cutOf = (name, data, keep) => {
    const box = boxOf(data, keep);
    const [x0, y0, w, h] = box;
    const pixels = Buffer.alloc(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = (y0 + y) * S + x0 + x;
        if (keep(i)) data.copy(pixels, (y * w + x) * 4, i * 4, i * 4 + 4);
    }
    cuts.push({ name, x: x0, y: y0, w, h, pixels });
};
for (const [list, n] of [['stars', 1], ['inner', 5]]) {
    const { data } = await load(n);
    for (const b of blobsOf(data)) {
        if (b.area > 300) {
            const near = grow(b.pixels, 3);
            cutOf(`squiggle${cuts.length}`, data, (i) => near[i]);
        } else if (b.area >= 2) scene[list].push([Math.round(b.x), Math.round(b.y), +Math.sqrt(b.area / Math.PI).toFixed(1)]);
    }
}
for (const [name, n] of Object.entries(EYES)) {
    const { data } = await load(n);
    cutOf(`eyes:${name}`, data, () => true);
}

// The ground (8, the stones, the little mushrooms and the lights of the flowers, and 9, the line work): the lights round
// the flowers are code and particles, the spores particles, each flower its own picture, the rest one picture
{
    const glowLayer = (await load(8)).data;
    const lines = (await load(9)).data;
    // The turquoise of the lights, and the blue it melts into at their edges
    const cyan = (i) => glowLayer[i * 4] < 80 && glowLayer[i * 4 + 1] > 120 && glowLayer[i * 4 + 2] > 170;
    const yellow = (i) => glowLayer[i * 4] > 200 && glowLayer[i * 4 + 1] > 180 && glowLayer[i * 4 + 2] < 190;
    const blobs = blobsOf(glowLayer);
    // A flower's light: a piece (almost) all turquoise (the stones have their turquoise among their navy)
    const pieces = piecesOf(blobs, 24);
    const isGlow = (p) => p.area > 400 && p.blobs.reduce((s, b) => s + b.pixels.filter(cyan).length, 0) / p.area > 0.85;
    const glowPieces = pieces.filter(isGlow).sort((a, b) => a.x - b.x);
    const out = new Uint8Array(S * S);           // what leaves layer 8 (lights, spores)
    for (const p of glowPieces) {
        const big = p.blobs[0];
        const r = Math.sqrt(big.area / Math.PI);
        // The stipple: a dot wherever it is, as dense as it is (from the alpha, soft edge included)
        const dots = [];
        const [x0, y0, x1, y1] = p.box;
        const STEP = 5;
        for (let y = y0 - 8; y <= y1 + 8; y += STEP) for (let x = x0 - 8; x <= x1 + 8; x += STEP) {
            const a = glowLayer[(y * S + x) * 4 + 3] / 255;
            if (a < 0.05 || Math.random() > a * 0.85) continue;
            dots.push([x + Math.round(rand(-2.5, 2.5)), y + Math.round(rand(-2.5, 2.5)), +rand(1.8, 3.2).toFixed(1)]);
        }
        scene.glows.push({ x: Math.round(big.x), y: Math.round(big.y), r: Math.round(Math.max(r, (x1 - x0) / 2)), dots });
        grow(p.blobs.flatMap((b) => b.pixels), 6).forEach((v, i) => { if (v) out[i] = 1; });
    }
    for (const b of blobs) {
        if (b.area < 60 && b.pixels.filter(yellow).length / b.area > 0.6) {
            scene.spores.push([Math.round(b.x), Math.round(b.y), +Math.max(2, Math.sqrt(b.area / Math.PI)).toFixed(1)]);
            grow(b.pixels, 3).forEach((v, i) => { if (v) out[i] = 1; });
        }
    }
    // The flowers: the pieces of the line work under each light
    const linePieces = piecesOf(blobsOf(lines).filter((b) => b.area >= 4), 6);
    const taken = new Uint8Array(S * S);
    for (const [k, g] of scene.glows.entries()) {
        const mine = linePieces.filter((p) => p.box[0] < g.x + g.r && p.box[2] > g.x - g.r && p.box[1] < g.y + g.r && p.box[3] > g.y - g.r * 0.5 && p.area > 300);
        const keep = grow(mine.flatMap((p) => p.blobs.flatMap((b) => b.pixels)), 3);
        const only = Buffer.from(lines);
        for (let i = 0; i < S * S; i++) { if (keep[i]) taken[i] = 1; else only[i * 4 + 3] = 0; }
        const name = `flower${k}`;
        await save(name, only);
        const [bx, by, bw, bh] = scene.boxes[name];
        scene.flowers.push({ name, light: k, foot: [bx + bw / 2, by + bh] });
    }
    // The rest of the ground: 8 without the lights and spores, under 9 without the flowers
    const ground = Buffer.from(glowLayer);
    for (let i = 0; i < S * S; i++) if (out[i]) ground[i * 4 + 3] = 0;
    const rest = Buffer.from(lines);
    for (let i = 0; i < S * S; i++) if (taken[i]) rest[i * 4 + 3] = 0;
    await save('ground', await rawOf(await flatten([ground, rest])));
}

// The atlas of the small pieces, packed in rows
{
    const ATLAS_W = 256, GAP = 6;
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
        .toFile(path.join(target, 'bits.webp'));
    scene.atlas = [ATLAS_W, ATLAS_H];
    scene.bits = cuts.sort((a, b) => a.name.localeCompare(b.name)).map((c) => [c.name, c.x, c.y, c.w, c.h, c.ax, c.ay]);
}

scene.rulito = boxOf((await load(71)).data);

await writeFile(path.join(root, 'src', 'composables', 'mettaScene.json'), JSON.stringify(scene));
console.log(Object.keys(scene.boxes).length, 'pictures;', scene.bits.length, 'bits in a', scene.atlas.join('x'), 'atlas;', scene.sky.length, 'sky stops',
    scene.sky.map(([y, c]) => `${y}:${c.toString(16)}`).join(' '), '; hill', scene.hill.color.toString(16), 'line', scene.hill.line.toString(16), scene.hill.left, scene.hill.right,
    '; halo', scene.halo.x, scene.halo.y, scene.halo.r, scene.halo.color.toString(16), scene.halo.dots.length, 'dots; aura', scene.aura.x, scene.aura.y, scene.aura.r,
    scene.aura.color.toString(16), scene.aura.dots.length, 'dots;', scene.stars.length, 'stars,', scene.inner.length, 'inner;', scene.glows.length, 'glows',
    scene.glows.map((g) => `${g.x},${g.y} r${g.r} ${g.dots.length}`).join(' '), ';', scene.spores.length, 'spores; rulito', scene.rulito);
