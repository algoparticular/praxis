// The layers of Perdón as exported (originales/perdon/Ilustración_sin_título-N.png, 3240x4050, a 4:5 portrait) ->
// public/assets/perdon/*.webp, each cropped to its own box, and src/composables/perdonScene.json, all in px of the
// 2160x2700 space the layers are scaled to (so sizes match the other scenes):
//   boxes      the box of every picture
//   sky        the card's flat background is in no layer: read from the finished card (public/cards/28.webp, which shows
//              the whole height of the portrait), row by row, as [y, 0xRRGGBB] stops for a gradient drawn in code
//   planet     the big planet is not a picture: its teal disc (6) is a disc drawn in code ([x, y, r] and its colour) and
//              its outline (8) a ring drawn in code (`line`: the stroke's middle radius and width); only its marbling (7) is
//              a picture (marble.webp), which the scene turns slowly inside them
//   ring       the ring of dust round the planet is not a picture: every dot of its part behind the planet (5) and of its
//              part in front (9), as one flat list each of x, y, diameter (where dots melt into one another the shape is
//              filled with dots), and
//              the ellipse they lie on ([x, y] of its centre, its tilt in degrees and its half axes), so they can flow round it
//   dots       the stars of the sky (2, 3: yellow, salmon and dark red) as [x, y, radius, colour index into `colors`]
//   doodles    the little ringed planet (its fill in 2, its line in 3) and the dark strokes of the sky (3: the "z" marks and
//              the dash), each cut out into one atlas (doodles.webp): [x, y, w, h where it is drawn, x, y in the atlas]
//   leaf, particular, eyes, kitten   the leaf boat (10) cut apart: Particular (his eyes on their own, and the hole they
//              leave filled with his cream, so he can blink and look), the kitten and the leaf; each character goes down
//              to a little under the leaf's rim, which is drawn over them (`rim`: the line its top follows, y = a + b x)
//   balloon, hanger, cup   the balloon with the Sama inside it, the Sama hanging from its string (from the knot down: it
//              swings about `knot`), and the little Sama in its cup (11)
//   rulito     the box and colour of the card's rulito over Particular (in 10): not shipped, the game draws it in code
// Not converted: 1 (the Algo Particular logo standing alone in the sky), 4 (empty), 6 and 8 (drawn in code, above).
// The originals are not kept in the repo once converted. Usage: node scripts/convert-perdon.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'originales', 'perdon');
const target = path.join(root, 'public', 'assets', 'perdon');
const file = (n) => path.join(source, `Ilustración_sin_título-${n}.png`);
const W = 2160, H = 2700;
const PAD = 4;
const SOLID = 110;

const load = async (n) => sharp(file(n)).resize(W, H, { kernel: 'lanczos3' }).ensureAlpha().raw().toBuffer();
const webp = (img, quality = 88) => img.webp({ quality, alphaQuality: 100, effort: 6 });
const hex = (r, g, b) => (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
const rnd = (n, d = 1) => +n.toFixed(d);

const boxOf = (data, keep = () => true) => {
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let i = 0; i < W * H; i++) {
        if (data[i * 4 + 3] < 4 || !keep(i)) continue;
        const x = i % W, y = (i - x) / W;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
    }
    x0 = Math.max(0, x0 - PAD); y0 = Math.max(0, y0 - PAD);
    x1 = Math.min(W - 1, x1 + PAD); y1 = Math.min(H - 1, y1 + PAD);
    return [x0, y0, x1 - x0 + 1, y1 - y0 + 1];
};

// Every blob of pixels at least `min` opaque (that `keep` lets in): its pixels, area, centre, box, mean colour
const blobsOf = (data, min = SOLID, keep = () => true) => {
    const seen = new Uint8Array(W * H);
    const blobs = [];
    const stack = [];
    const solid = (i) => data[i * 4 + 3] >= min && keep(i);
    for (let start = 0; start < W * H; start++) {
        if (seen[start] || !solid(start)) continue;
        const pixels = [];
        let sx = 0, sy = 0, r = 0, g = 0, b = 0, x0 = W, y0 = H, x1 = 0, y1 = 0;
        stack.push(start);
        seen[start] = 1;
        while (stack.length) {
            const i = stack.pop();
            const x = i % W, y = (i - x) / W;
            pixels.push(i);
            sx += x; sy += y;
            r += data[i * 4]; g += data[i * 4 + 1]; b += data[i * 4 + 2];
            x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
            for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1]) {
                if (j < 0 || seen[j] || !solid(j)) continue;
                seen[j] = 1;
                stack.push(j);
            }
        }
        const n = pixels.length;
        blobs.push({ pixels, area: n, x: sx / n, y: sy / n, box: [x0, y0, x1 - x0 + 1, y1 - y0 + 1], color: [r / n, g / n, b / n] });
    }
    return blobs.sort((a, b) => b.area - a.area);
};

// A mask grown by d px (a square), so a cut keeps the soft edge round what it cuts
const grow = (mask, d) => {
    const out = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) {
        if (!mask[i]) continue;
        const x = i % W, y = (i - x) / W;
        for (let yy = Math.max(0, y - d); yy <= Math.min(H - 1, y + d); yy++) out.fill(1, yy * W + Math.max(0, x - d), yy * W + Math.min(W - 1, x + d) + 1);
    }
    return out;
};
const only = (data, keep) => {
    const out = Buffer.from(data);
    for (let i = 0; i < W * H; i++) if (!keep(i)) out[i * 4 + 3] = 0, out[i * 4] = out[i * 4 + 1] = out[i * 4 + 2] = 0;
    return out;
};

const scene = { size: [W, H], boxes: {}, sky: [], colors: [], dots: [], ring: { back: [], front: [] }, doodles: [], atlas: [0, 0] };
// shrink: a big soft picture can be shipped smaller than it is drawn (the stage scales it to its box)
const save = async (name, data, quality, shrink = 1) => {
    const box = boxOf(data);
    let img = sharp(data, { raw: { width: W, height: H, channels: 4 } }).extract({ left: box[0], top: box[1], width: box[2], height: box[3] });
    if (shrink < 1) img = sharp(await img.png().toBuffer()).resize(Math.round(box[2] * shrink));
    await webp(img, quality).toFile(path.join(target, `${name}.webp`));
    scene.boxes[name] = box;
    return box;
};

await mkdir(target, { recursive: true });

// ---- The background, from the card (the whole height of the portrait, centred in the square, the sides added)
{
    const { data, info } = await sharp(path.join(root, 'public', 'cards', '28.webp')).raw().toBuffer({ resolveWithObject: true });
    const C = info.width, ch = info.channels;
    const s = C / 4050, left = (C - 3240 * s) / 2;
    const base = [0xc0, 0xc0, 0xa4];
    const STEP = 150;
    for (let y = 0; y < H; y += STEP) {
        let r = 0, g = 0, b = 0, n = 0;
        for (let yy = y; yy < y + STEP; yy += 3) {
            const cy = Math.min(C - 1, Math.round(yy / H * 4050 * s));
            for (let cx = Math.round(left * 0.3); cx < C - left * 0.3; cx += 3) {
                const i = (cy * C + cx) * ch;
                const d = Math.abs(data[i] - base[0]) + Math.abs(data[i + 1] - base[1]) + Math.abs(data[i + 2] - base[2]);
                if (d > 24) continue;                            // a star, a stroke: not the background
                r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
            }
        }
        scene.sky.push([y + STEP / 2, hex(r / n, g / n, b / n)]);
    }
}

// ---- The planet: its disc and its outline are drawn in code; its marbling is a picture
{
    const disc = await load(6);
    const [main] = blobsOf(disc);
    const r = Math.sqrt(main.area / Math.PI);
    scene.planet = { x: rnd(main.x), y: rnd(main.y), r: rnd(r), color: hex(...main.color) };
    // The outline: along many rays from the centre, where its stroke begins and ends
    const line = await load(8);
    let inner = 0, outer = 0, n = 0;
    for (let a = 0; a < 360; a += 2) {
        const dx = Math.cos(a * Math.PI / 180), dy = Math.sin(a * Math.PI / 180);
        let first = -1, last = -1;
        for (let d = r - 60; d < r + 60; d += 0.5) {
            const x = Math.round(main.x + dx * d), y = Math.round(main.y + dy * d);
            if (line[(y * W + x) * 4 + 3] >= 128) { if (first < 0) first = d; last = d; }
        }
        if (first < 0) continue;
        inner += first; outer += last; n++;
    }
    inner /= n; outer /= n;
    const [lb] = blobsOf(line);
    scene.planet.line = { r: rnd((inner + outer) / 2), width: rnd(outer - inner + 1), color: hex(...lb.color) };
    await save('marble', await load(7), 84, 0.75);
}

// ---- The ring of dust: a dot for each loose dot, and where dots melt into one another the shape filled with dots
const ringDots = (data) => {
    const dots = [];
    const FILL = 6.5;
    for (const b of blobsOf(data, 60)) {
        if (b.area < 4) continue;
        const [, , bw, bh] = b.box;
        if (b.area < 220 && b.area / (bw * bh) > 0.55) { dots.push([Math.round(b.x), Math.round(b.y), rnd(Math.sqrt(b.area / Math.PI) + 0.4)]); continue; }
        const mine = new Set(b.pixels);
        const [x0, y0] = b.box;
        for (let y = y0; y < y0 + bh; y += FILL) {
            for (let x = x0 + ((Math.round(y / FILL) % 2) * FILL) / 2; x < x0 + bw; x += FILL) {
                const px = Math.round(x + (Math.random() - 0.5) * FILL * 0.7), py = Math.round(y + (Math.random() - 0.5) * FILL * 0.7);
                if (!mine.has(py * W + px)) continue;
                dots.push([px, py, rnd(3.6 + Math.random() * 2.6)]);
            }
        }
    }
    return dots;
};
scene.ring.back = ringDots(await load(5));
scene.ring.front = ringDots(await load(9));
// The ellipse they lie on, fitted to all of them (a conic A x² + B xy + C y² + D x + E y = 1, by least squares, about the
// planet's centre): its centre, its tilt in degrees and its half axes
{
    const all = [...scene.ring.back, ...scene.ring.front];
    const { x: px, y: py } = scene.planet;
    const S = 1000;
    const M = Array.from({ length: 5 }, () => new Array(6).fill(0));
    all.forEach(([x, y]) => {
        const u = (x - px) / S, v = (y - py) / S;
        const row = [u * u, u * v, v * v, u, v];
        for (let i = 0; i < 5; i++) { for (let j = 0; j < 5; j++) M[i][j] += row[i] * row[j]; M[i][5] += row[i]; }
    });
    for (let i = 0; i < 5; i++) {
        let best = i;
        for (let r = i + 1; r < 5; r++) if (Math.abs(M[r][i]) > Math.abs(M[best][i])) best = r;
        [M[i], M[best]] = [M[best], M[i]];
        for (let r = 0; r < 5; r++) {
            if (r === i) continue;
            const f = M[r][i] / M[i][i];
            for (let c = i; c < 6; c++) M[r][c] -= f * M[i][c];
        }
    }
    const [A, B, C, D, E] = M.map((row, i) => row[5] / row[i]);
    // Its centre, where the gradient is zero, and the conic about it
    const det = 4 * A * C - B * B;
    const u0 = (B * E - 2 * C * D) / det, v0 = (B * D - 2 * A * E) / det;
    const F = 1 - (A * u0 * u0 + B * u0 * v0 + C * v0 * v0 + D * u0 + E * v0);
    const angle = 0.5 * Math.atan2(B, A - C);
    const c = Math.cos(angle), s = Math.sin(angle);
    const a1 = A * c * c + B * c * s + C * s * s, a2 = A * s * s - B * c * s + C * c * c;
    const ax = Math.sqrt(F / a1) * S, bx = Math.sqrt(F / a2) * S;
    scene.ring.ellipse = { x: rnd(px + u0 * S), y: rnd(py + v0 * S), tilt: rnd(angle * 180 / Math.PI, 2), a: rnd(Math.max(ax, bx)), b: rnd(Math.min(ax, bx)) };
    if (bx > ax) scene.ring.ellipse.tilt = rnd(scene.ring.ellipse.tilt + 90, 2);
}

// ---- The sky: its stars as particles, the little ringed planet and the dark strokes as pictures (one atlas)
const PALETTE = [0xecd189, 0xdb6b5c, 0x8c4646];
scene.colors = PALETTE;
const nearest = ([r, g, b]) => {
    let best = 0, dist = Infinity;
    PALETTE.forEach((p, k) => { const d = (r - (p >> 16)) ** 2 + (g - ((p >> 8) & 255)) ** 2 + (b - (p & 255)) ** 2; if (d < dist) { dist = d; best = k; } });
    return best;
};
const TINY = [1785, 465, 92, 150];          // where the little ringed planet is (its fill in 2, its line in 3)
const inTiny = (x, y) => x >= TINY[0] && x < TINY[0] + TINY[2] && y >= TINY[1] && y < TINY[1] + TINY[3];
const l2 = await load(2), l3 = await load(3);
const cuts = [];
{
    const tiny = Buffer.alloc(W * H * 4);
    for (const data of [l2, l3]) {
        for (let i = 0; i < W * H; i++) {
            const x = i % W, y = (i - x) / W;
            if (!inTiny(x, y) || !data[i * 4 + 3]) continue;
            // over: src + dst * (1 - src alpha)
            const a = data[i * 4 + 3] / 255;
            for (let c = 0; c < 3; c++) tiny[i * 4 + c] = Math.round(data[i * 4 + c] * a + tiny[i * 4 + c] * (tiny[i * 4 + 3] / 255) * (1 - a)) / Math.max(1e-3, a + (tiny[i * 4 + 3] / 255) * (1 - a));
            tiny[i * 4 + 3] = Math.round(255 * (a + (tiny[i * 4 + 3] / 255) * (1 - a)));
        }
    }
    cuts.push({ name: 'tiny', data: tiny, box: boxOf(tiny) });
}
for (const data of [l2, l3]) {
    for (const b of blobsOf(data, 50)) {
        if (inTiny(b.x, b.y)) continue;
        const [, , bw, bh] = b.box;
        // A stroke: dark, big and not round (the "z" marks and the dash); anything else is a star, even a lumpy one
        const odd = b.area > 300 && nearest(b.color) === 2 && (b.area / (bw * bh) < 0.6 || Math.max(bw, bh) / Math.min(bw, bh) > 1.5);
        if (odd) {
            const keep = grow(Object.assign(new Uint8Array(W * H), Object.fromEntries(b.pixels.map((i) => [i, 1]))), 2);
            const cut = only(data, (i) => keep[i]);
            cuts.push({ name: 'stroke', data: cut, box: boxOf(cut) });
            continue;
        }
        // A star: its size from how much of it there is (its soft edge counts by its alpha)
        let sum = 0;
        const [x0, y0] = b.box;
        for (let y = Math.max(0, y0 - 2); y < Math.min(H, y0 + bh + 2); y++) for (let x = Math.max(0, x0 - 2); x < Math.min(W, x0 + bw + 2); x++) sum += data[(y * W + x) * 4 + 3] / 255;
        scene.dots.push([Math.round(b.x), Math.round(b.y), rnd(Math.max(0.7, Math.sqrt(sum / Math.PI)), 1), nearest(b.color)]);
    }
}
// The atlas of the doodles, packed in a row
{
    const GAP = 6;
    let x = GAP, h = 0;
    for (const c of cuts) { c.ax = x; c.ay = GAP; x += c.box[2] + GAP; h = Math.max(h, c.box[3]); }
    const AW = x, AH = h + 2 * GAP;
    const parts = await Promise.all(cuts.map(async (c) => ({
        input: await sharp(c.data, { raw: { width: W, height: H, channels: 4 } }).extract({ left: c.box[0], top: c.box[1], width: c.box[2], height: c.box[3] }).png().toBuffer(),
        left: c.ax, top: c.ay,
    })));
    await webp(sharp({ create: { width: AW, height: AH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(parts), 90)
        .toFile(path.join(target, 'doodles.webp'));
    scene.atlas = [AW, AH];
    scene.doodles = cuts.map((c) => ({ name: c.name, at: [...c.box, c.ax, c.ay] }));
}

// ---- The leaf boat, cut apart: Particular (and his eyes), the kitten, the leaf; the rulito is only measured
{
    const data = await load(10);
    const px = (i) => [data[i * 4], data[i * 4 + 1], data[i * 4 + 2], data[i * 4 + 3]];
    const dark = (i) => { const [r, g, b, a] = px(i); return a > 128 && r < 175 && g < 110 && b < 110; };
    const green = (i) => { const [r, g, b, a] = px(i); return a > 200 && g > 150 && g > r + 4 && g > b + 10; };
    // The top of the leaf's rim, column by column where nobody sits on it, as a line
    const fit = [];
    for (let x = 420; x < 720; x++) {
        let yg = -1;
        for (let y = 1990; y < 2350; y++) if (green(y * W + x)) { yg = y; break; }
        if (yg < 0) continue;
        let top = yg;
        while (top > 1990 && (dark((top - 1) * W + x) || px((top - 1) * W + x)[3] > 200)) top--;
        const run = yg - top;
        if (run >= 8 && run <= 26) fit.push([x, top]);
    }
    const n = fit.length, mx = fit.reduce((s, [x]) => s + x, 0) / n, my = fit.reduce((s, [, y]) => s + y, 0) / n;
    const slope = fit.reduce((s, [x, y]) => s + (x - mx) * (y - my), 0) / fit.reduce((s, [x]) => s + (x - mx) ** 2, 0);
    const rim = (x) => my + slope * (x - mx);
    scene.rim = [rnd(my - slope * mx, 2), rnd(slope, 4)];
    const DOWN = 8;                                                         // how far under the rim the characters go
    const PART = [440, 1994, 581], KIT = [581, 2055, 692];                  // x from, y from, x to
    const inPart = (x, y) => x >= PART[0] && x < PART[2] && y >= PART[1] && y < rim(x) + DOWN;
    const inKit = (x, y) => x >= KIT[0] && x < KIT[2] && y >= KIT[1] && y < rim(x) + DOWN;
    const RUL = [455, 1835, 575, 1993];
    const inRul = (x, y) => x >= RUL[0] && x < RUL[2] && y >= RUL[1] && y < RUL[3];
    const xy = (i) => { const x = i % W; return [x, (i - x) / W]; };

    // The rulito: only where it is and its colour
    {
        const rul = only(data, (i) => inRul(...xy(i)));
        scene.rulito = { box: boxOf(rul) };
        const [b] = blobsOf(rul);
        scene.rulito.color = hex(...b.color);
    }
    // Particular, with his eyes taken out (and their place filled with his cream)
    {
        const part = only(data, (i) => inPart(...xy(i)));
        const outline = blobsOf(part, 128, dark);
        const eyes = outline.filter((b) => b.area >= 30 && b.area < 900 && b.y < 2090 && b.box[0] > PART[0] + 4);
        const eyeMask = grow(Object.assign(new Uint8Array(W * H), Object.fromEntries(eyes.flatMap((b) => b.pixels.map((i) => [i, 1])))), 3);
        const around = grow(eyeMask, 4);
        let r = 0, g = 0, b = 0, k = 0;
        for (let i = 0; i < W * H; i++) if (around[i] && !eyeMask[i] && part[i * 4 + 3] > 250 && !dark(i)) { r += part[i * 4]; g += part[i * 4 + 1]; b += part[i * 4 + 2]; k++; }
        const eyeData = only(part, (i) => eyeMask[i]);
        for (let i = 0; i < W * H; i++) if (eyeMask[i]) { part[i * 4] = r / k; part[i * 4 + 1] = g / k; part[i * 4 + 2] = b / k; part[i * 4 + 3] = 255; }
        await save('particular', part, 90);
        await save('eyes', eyeData, 90);
        scene.eyes = eyes.map((e) => [rnd(e.x), rnd(e.y), rnd(Math.sqrt(e.area / Math.PI))]);
    }
    await save('kitten', only(data, (i) => inKit(...xy(i))), 90);
    await save('leaf', only(data, (i) => { const [x, y] = xy(i); return !inRul(x, y) && !((inPart(x, y) || inKit(x, y)) && y < rim(x)); }), 86);
}

// ---- The balloon (with the Sama inside), the Sama hanging from its string, the little Sama in its cup
{
    const data = await load(11);
    const xy = (i) => { const x = i % W; return [x, (i - x) / W]; };
    const KNOT = 560;                       // the knot's bottom: what hangs from it is cut from a little above
    const CUP_TO = 900;                     // the cup is the piece on the left
    await save('cup', only(data, (i) => xy(i)[0] < CUP_TO), 90);
    await save('balloon', only(data, (i) => { const [x, y] = xy(i); return x >= CUP_TO && y < KNOT + 4; }), 86);
    const hanger = only(data, (i) => { const [x, y] = xy(i); return x >= CUP_TO && y >= KNOT - 8; });
    await save('hanger', hanger, 90);
    // Where the string leaves the knot: the middle of the dark pixels on the row just under it
    let sx = 0, k = 0;
    for (let x = CUP_TO; x < W; x++) if (hanger[((KNOT + 6) * W + x) * 4 + 3] > 128) { sx += x; k++; }
    scene.knot = [rnd(sx / k), KNOT];
}

const ringCount = [scene.ring.back.length, scene.ring.front.length];
// The ring's dots, thousands of them, as one flat list each (x, y, diameter, all whole px), to keep the file small
scene.ring.back = scene.ring.back.flatMap(([x, y, r]) => [x, y, Math.round(2 * r)]);
scene.ring.front = scene.ring.front.flatMap(([x, y, r]) => [x, y, Math.round(2 * r)]);
await writeFile(path.join(root, 'src', 'composables', 'perdonScene.json'), JSON.stringify(scene));
console.log(Object.keys(scene.boxes).length, 'pictures', JSON.stringify(scene.boxes), '\nsky', scene.sky.map(([y, c]) => `${y}:${c.toString(16)}`).join(' '),
    '\nplanet', JSON.stringify(scene.planet), '\nring', ringCount.join(' + '), 'dots', JSON.stringify(scene.ring.ellipse),
    '\nstars', scene.dots.length, 'doodles', scene.doodles.length, scene.atlas.join('x'), '\nrim', scene.rim, 'eyes', JSON.stringify(scene.eyes), 'rulito', JSON.stringify(scene.rulito), 'knot', scene.knot);
