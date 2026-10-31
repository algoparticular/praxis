// The layers of Confianza as exported (originales/confianza/Laberinto_2-N.png, 2160px) -> public/assets/confianza/*.webp,
// each cropped to its own box, and src/composables/confianzaScene.json, all in px of the 2160 square:
//   boxes      the box of every picture
//   ground     the flat colour behind everything (the card's aqua, read off the finished card): not a picture, the
//              scene paints it in code
//   ink        the colour of the dots
//   far, near  the dots scattered over the card (layers 1 and 2), as [x, y, radius]: particles, at two depths
//   heart      the light round the chakana at the centre of the labyrinth (3): not a picture either, the disc that fits
//              inside its solid middle ([x, y, r]) and its colour, and every dot of its stippled edge as [x, y, radius]
//   beings     the three little beings at the labyrinth's doors, each its own picture (their fills (8) and shading (9)
//              split by which one's line work (10, 11, 12) they belong to): Particular at the top, meditating, Aura on
//              the left and Vulpes at the bottom right; with the door of the labyrinth each one stands at
// Pictures: mazeFill (4, the pink corridors with their light edge) and mazeLines (5, the walls) apart, so the way
// through the corridors can be lit between them; chakana (6, 7); particular, aura, vulpes; squiggle (the little swimmer
// drawn among the dots of 1). Not converted: 13 (the Algo Particular signature, dropped from the scenes). The card has
// no rulito layer. The originals are not kept in the repo once converted. Usage: node scripts/convert-confianza.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'originales', 'confianza');
const target = path.join(root, 'public', 'assets', 'confianza');
const file = (n) => path.join(source, `Laberinto_2-${n}.png`);
const S = 2160;
const PAD = 4;
const SOLID = 110;

const load = async (n) => sharp(file(n)).resize(S, S).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const webp = (img, quality) => img.webp({ quality, alphaQuality: 100, effort: 6 });
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

// A raw RGBA buffer of the whole square, from layers (each optionally masked: only the pixels `keep` lets in)
const compose = async (parts) => {
    const out = Buffer.alloc(S * S * 4);
    for (const { n, keep = () => true } of parts) {
        const { data } = await load(n);
        for (let i = 0; i < S * S; i++) {
            const a = data[i * 4 + 3];
            if (!a || !keep(i)) continue;
            // "over", straight alpha
            const o = i * 4, fa = a / 255, ba = out[o + 3] / 255, ra = fa + ba * (1 - fa);
            for (let c = 0; c < 3; c++) out[o + c] = Math.round((data[o + c] * fa + out[o + c] * ba * (1 - fa)) / ra);
            out[o + 3] = Math.round(ra * 255);
        }
    }
    return out;
};
// The few flat colours a picture is painted in: the most common ones among its solid pixels (binned), each its average,
// skipping any too close to one already taken
const paletteOf = (data, k) => {
    const bins = new Map();
    for (let i = 0; i < S * S; i++) {
        const o = i * 4;
        if (data[o + 3] < 250) continue;
        const key = (data[o] >> 3) << 10 | (data[o + 1] >> 3) << 5 | data[o + 2] >> 3;
        const bin = bins.get(key) ?? [0, 0, 0, 0];
        bin[0] += data[o]; bin[1] += data[o + 1]; bin[2] += data[o + 2]; bin[3]++;
        bins.set(key, bin);
    }
    const out = [];
    for (const [r, g, b, n] of [...bins.values()].sort((a, c) => c[3] - a[3])) {
        const c = [r / n, g / n, b / n].map(Math.round);
        if (out.some((p) => Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2]) < 40)) continue;
        out.push(c);
        if (out.length === k) break;
    }
    return out;
};
// A picture painted in a few flat colours (the labyrinth): every pixel snapped to the nearest of them and its alpha to
// 16 steps, then saved lossless, which is several times smaller than lossy for such a big, busy picture and keeps it crisp
const snap = (data, k) => {
    const palette = paletteOf(data, k);
    for (let i = 0; i < S * S; i++) {
        const o = i * 4;
        if (!data[o + 3]) continue;
        let best = palette[0], bd = Infinity;
        for (const p of palette) {
            const d = (p[0] - data[o]) ** 2 + (p[1] - data[o + 1]) ** 2 + (p[2] - data[o + 2]) ** 2;
            if (d < bd) { bd = d; best = p; }
        }
        data.set(best, o);
        data[o + 3] = Math.round(data[o + 3] / 17) * 17;
    }
    return data;
};
const save = async (name, data, { quality = 88, flat = 0 } = {}) => {
    const box = boxOf(data);
    const img = sharp(flat ? snap(data, flat) : data, { raw: { width: S, height: S, channels: 4 } }).extract({ left: box[0], top: box[1], width: box[2], height: box[3] });
    await (flat ? img.webp({ lossless: true, effort: 6 }) : webp(img, quality)).toFile(path.join(target, `${name}.webp`));
    scene.boxes[name] = box;
    return box;
};

await mkdir(target, { recursive: true });
const scene = { size: S, boxes: {}, ground: 0, ink: 0, far: [], near: [], heart: null, beings: [] };

// The ground: the finished card's colour, away from the drawing (its four corners)
{
    const { data, info } = await sharp(path.join(root, 'public', 'cards', '18.webp')).raw().toBuffer({ resolveWithObject: true });
    const W = info.width, C = info.channels;
    let r = 0, g = 0, b = 0, n = 0;
    for (const [cx, cy] of [[0.03, 0.03], [0.97, 0.03], [0.03, 0.6], [0.97, 0.97]]) {
        for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++) {
            const i = ((Math.round(cy * W) + dy) * W + Math.round(cx * W) + dx) * C;
            r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
        }
    }
    scene.ground = hex(r / n, g / n, b / n);
}

// The dots: every blob of 1 and 2 as a particle (the two layers repeat most of their dots exactly: each
// dot is kept once, and the bigger half are the near ones); the one long stroke among them is the swimmer, a picture
{
    let ink = [0, 0, 0, 0];
    const all = [];
    for (const n of [1, 2]) {
        const { data } = await load(n);
        for (const b of blobsOf(data)) {
            const [x0, y0, x1, y1] = b.box;
            const long = Math.max(x1 - x0, y1 - y0) + 1;
            if (b.area > 200 && long * long > 2.2 * b.area) {
                await save('squiggle', await compose([{ n, keep: (i) => { const x = i % S, y = (i - x) / S; return x >= x0 - 6 && x <= x1 + 6 && y >= y0 - 6 && y <= y1 + 6; } }]));
                continue;
            }
            if (b.area < 2) continue;
            const dot = [Math.round(b.x), Math.round(b.y), +Math.sqrt(b.area / Math.PI).toFixed(1)];
            const twin = all.find((d) => Math.hypot(d[0] - dot[0], d[1] - dot[1]) < 3);
            if (twin) { if (dot[2] > twin[2]) twin.splice(0, 3, ...dot); continue; }
            all.push(dot);
            b.pixels.forEach((i) => { ink[0] += data[i * 4]; ink[1] += data[i * 4 + 1]; ink[2] += data[i * 4 + 2]; ink[3]++; });
        }
    }
    scene.ink = hex(ink[0] / ink[3], ink[1] / ink[3], ink[2] / ink[3]);
    all.sort((a, b) => b[2] - a[2]);
    scene.near = all.slice(0, Math.ceil(all.length / 2));
    scene.far = all.slice(Math.ceil(all.length / 2));
}

// The labyrinth: its corridors and its walls apart; the chakana at its centre
await save('mazeFill', await compose([{ n: 4 }]), { flat: 3 });
await save('mazeLines', await compose([{ n: 5 }]), { flat: 1 });
await save('chakana', await compose([{ n: 6 }, { n: 7 }]));

// The light at the centre: the disc inside its solid middle, and dots for everything round it
{
    const { data } = await load(3);
    const [main, ...rest] = blobsOf(data);
    const inMain = new Uint8Array(S * S);
    main.pixels.forEach((i) => { inMain[i] = 1; });
    let r0 = 0, g0 = 0, b0 = 0;
    main.pixels.forEach((i) => { r0 += data[i * 4]; g0 += data[i * 4 + 1]; b0 += data[i * 4 + 2]; });
    const color = hex(r0 / main.area, g0 / main.area, b0 / main.area);
    const cx = main.x, cy = main.y;
    let r = 10;
    for (; r < 300; r += 2) {
        let inside = 0, all = 0;
        for (let a = 0; a < 360; a += 3) {
            const x = Math.round(cx + Math.cos(a * Math.PI / 180) * r), y = Math.round(cy + Math.sin(a * Math.PI / 180) * r);
            all++;
            if (inMain[y * S + x]) inside++;
        }
        if (inside / all < 0.97) break;
    }
    const R = r - 4;
    const dots = rest.filter((b) => b.area >= 2).map((b) => [Math.round(b.x), Math.round(b.y), +Math.sqrt(b.area / Math.PI).toFixed(1)]);
    // The ragged rim of the solid middle, outside the disc, filled with dots
    const FILL = 5;
    for (let y = Math.floor(cy - 300); y < cy + 300; y += FILL) {
        for (let x = Math.floor(cx - 300) + ((y / FILL) % 2) * FILL / 2; x < cx + 300; x += FILL) {
            const px = Math.round(x + (Math.random() - 0.5) * FILL * 0.6), py = Math.round(y + (Math.random() - 0.5) * FILL * 0.6);
            if (!inMain[py * S + px] || Math.hypot(px - cx, py - cy) < R - 3) continue;
            dots.push([px, py, +(2.6 + Math.random() * 1.2).toFixed(1)]);
        }
    }
    scene.heart = { x: Math.round(cx), y: Math.round(cy), r: R, color, dots };
}

// The three beings: their fills and shading split by whose line work is nearest
{
    const lines = { particular: 10, aura: 11, vulpes: 12 };
    const boxes = {};
    for (const [name, n] of Object.entries(lines)) boxes[name] = boxOf((await load(n)).data);
    const near = (name) => (i) => {
        const x = i % S, y = (i - x) / S, [bx, by, bw, bh] = boxes[name];
        return x >= bx - 24 && x < bx + bw + 24 && y >= by - 24 && y < by + bh + 24;
    };
    for (const [name, n] of Object.entries(lines)) {
        const box = await save(name, await compose([{ n: 8, keep: near(name) }, { n: 9, keep: near(name) }, { n }]));
        scene.beings.push({ name, box });
    }
}

await writeFile(path.join(root, 'src', 'composables', 'confianzaScene.json'), JSON.stringify(scene));
console.log(Object.keys(scene.boxes).join(', '), '; ground', scene.ground.toString(16), 'ink', scene.ink.toString(16), ';', scene.far.length, 'far and', scene.near.length,
    'near dots; heart', scene.heart.x, scene.heart.y, 'r', scene.heart.r, scene.heart.color.toString(16), 'with', scene.heart.dots.length, 'dots');
