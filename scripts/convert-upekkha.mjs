// The layers of Upekkha as exported (originales/upekka/Upekka-N.png, 2160px) -> public/assets/upekkha/*.webp, each
// cropped to its own box, and src/composables/upekkhaScene.json, all in px of the 2160 square:
//   boxes      the box of every picture
//   regions    the flat colours behind the drawing are not in the export, and are not pictures: they are read from the
//              card (public/cards/9.webp) where no layer covers it: the four colours (sky: the mint and the deep teal
//              of the future; ground: the orange of the past and its teal), the outline of the ground (past.loops,
//              filled even-odd), the edge between the two colours of each half (edge: [sky, ground], each
//              { y0, step, x: [...] }, the card's S) and the bubbles of one colour in the other near it (bubbles:
//              [x, y, rx, ry, angle, plane, colour] ellipses), which the scene brings to life
//   dots       the specks of the sky (1), as [x, y, radius], and the colour they are on the card
//   aura       the stipple round Sid (33, 34), as dots [x, y, radius]
//   glow       the yellow stipple round the mushrooms (19), as dots
//   flowers    the yellow heads of the little flowers (6), [x, y, r], for a light on each
//   head, rulito  where Sid's head and the card's rulito (41) are, and the rulito's colour
// The originals are not kept in the repo once converted. Usage: node scripts/convert-upekkha.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'originales', 'upekka');
const target = path.join(root, 'public', 'assets', 'upekkha');
const file = (n) => path.join(source, `Upekka-${n}.png`);
const S = 2160;

// Pictures made of one or more layers, drawn in this order. 41 (the rulito over Sid) is not converted: the scene draws
// it in code, as every rulito; only its place and colour are kept
const pictures = {
    doodles: [1], water: [3], fern: [9],
    land: [2, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 16, 17, 18, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32],
    sid: [35, 36, 37, 38, 39, 40],
};
const PAD = 4;
const SOLID = 110;

const load = async (n) => sharp(file(n)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const webp = (img) => img.webp({ quality: 90, alphaQuality: 100, effort: 5 });
const flatten = (layers) => sharp({ create: { width: S, height: S, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(layers.map((n) => ({ input: typeof n === 'number' ? file(n) : n }))).png().toBuffer();
const rawOf = async (png) => (await sharp(png).raw().toBuffer({ resolveWithObject: true })).data;
const hex = (r, g, b) => (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);

const boxOf = (data, W, H, keep = () => true) => {
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

// Every blob of solid pixels (that `keep` lets in): its pixels, area and centre
const blobsOf = (data, W, H, keep = () => true) => {
    const seen = new Uint8Array(W * H);
    const blobs = [];
    const stack = [];
    const solid = (i) => data[i * 4 + 3] >= SOLID && keep(i);
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

// A stipple as dots: one wherever the layer is, as dense as it is
const stipple = (data, step, size) => {
    const dots = [];
    for (let y = 0; y < S; y += step) {
        for (let x = 0; x < S; x += step) {
            const a = data[(y * S + x) * 4 + 3] / 255;
            if (a < 0.05 || Math.random() > a * 0.9) continue;
            dots.push([x + Math.round((Math.random() - 0.5) * step), y + Math.round((Math.random() - 0.5) * step), +(size[0] + Math.random() * size[1]).toFixed(1)]);
        }
    }
    return dots;
};

await mkdir(target, { recursive: true });
const scene = { size: S, boxes: {}, regions: {}, dots: { color: 0, list: [] }, aura: [], glow: [], flowers: [] };

// Plain pictures (the doodles of the sky are only its three strokes: its specks are particles)
const specks = (await load(1)).data;
const strokes = blobsOf(specks, S, S).filter((b) => b.area > 400);
for (const [name, layers] of Object.entries(pictures)) {
    let flat = await flatten(layers);
    if (name === 'doodles') {
        const keep = new Uint8Array(S * S);
        strokes.forEach((b) => b.pixels.forEach((i) => {
            for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const j = i + dy * S + dx; if (j >= 0 && j < S * S) keep[j] = 1; }
        }));
        const only = Buffer.from(await rawOf(flat));
        for (let i = 0; i < S * S; i++) if (!keep[i]) only[i * 4 + 3] = 0;
        flat = await sharp(only, { raw: { width: S, height: S, channels: 4 } }).png().toBuffer();
    }
    const box = boxOf(await rawOf(flat), S, S);
    await webp(sharp(flat).extract({ left: box[0], top: box[1], width: box[2], height: box[3] })).toFile(path.join(target, `${name}.webp`));
    scene.boxes[name] = box;
}

// ---- The flat colours behind the drawing, read from the card where no layer covers it
{
    const card = await sharp(path.join(root, 'public', 'cards', '9.webp')).resize(S, S).removeAlpha().raw().toBuffer();
    const covered = new Uint8Array(S * S);
    for (let n = 1; n <= 41; n++) {
        const { data } = await load(n);
        for (let i = 0; i < S * S; i++) if (data[i * 4 + 3] > 0) covered[i] = 1;
    }
    // A little round everything drawn too (the soft edge of Sid's aura still tints the card)
    for (let pass = 0; pass < 3; pass++) {
        const was = Uint8Array.from(covered);
        for (let i = S; i < S * S - S; i++) if (!was[i] && (was[i - 1] || was[i + 1] || was[i - S] || was[i + S])) covered[i] = 1;
    }
    // The four colours (the most common ones of the card where it is bare)
    const COLORS = { mint: [176, 218, 208], future: [28, 140, 155], past: [246, 146, 114], ground: [98, 166, 180] };
    const names = Object.keys(COLORS);
    const G = 4;                                        // the outlines are traced on a grid this many px wide
    const N = S / G;
    const votes = names.map(() => new Float32Array(N * N));
    const sums = names.map(() => [0, 0, 0, 0]);
    for (let y = 0; y < S; y++) {
        for (let x = 0; x < S; x++) {
            const i = y * S + x;
            if (covered[i]) continue;
            const r = card[i * 3], g = card[i * 3 + 1], b = card[i * 3 + 2];
            let best = 0, bestD = Infinity;
            names.forEach((name, c) => { const [cr, cg, cb] = COLORS[name]; const d = (r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2; if (d < bestD) { bestD = d; best = c; } });
            votes[best][Math.floor(y / G) * N + Math.floor(x / G)] += 1;
            const s = sums[best]; s[0] += r; s[1] += g; s[2] += b; s[3] += 1;
        }
    }
    // Each cell takes the colour most of its bare pixels have; cells all covered take their nearest neighbour's
    const label = new Int8Array(N * N).fill(-1);
    const queue = [];
    for (let i = 0; i < N * N; i++) {
        let best = -1, most = 0;
        votes.forEach((v, c) => { if (v[i] > most) { most = v[i]; best = c; } });
        if (most < 4) best = -1;
        if (best >= 0) { label[i] = best; queue.push(i); }
    }
    for (let q = 0; q < queue.length; q++) {
        const i = queue[q], x = i % N, y = (i - x) / N;
        for (const j of [x > 0 ? i - 1 : -1, x < N - 1 ? i + 1 : -1, y > 0 ? i - N : -1, y < N - 1 ? i + N : -1]) {
            if (j < 0 || label[j] >= 0) continue;
            label[j] = label[i];
            queue.push(j);
        }
    }
    // Under the horizon there is no sky (between Sid's legs the card is all drawing)
    for (let y = Math.ceil(1380 / G); y < N; y++) {
        for (let x = 0; x < N; x++) {
            const c = label[y * N + x];
            if (c === names.indexOf('mint') || c === names.indexOf('future')) label[y * N + x] = names.indexOf(x < N / 2 ? 'past' : 'ground');
        }
    }
    // A majority filter takes out the specks of the texture
    for (let pass = 0; pass < 2; pass++) {
        const copy = Int8Array.from(label);
        for (let y = 0; y < N; y++) {
            for (let x = 0; x < N; x++) {
                const count = [0, 0, 0, 0];
                for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
                    const xx = Math.min(N - 1, Math.max(0, x + dx)), yy = Math.min(N - 1, Math.max(0, y + dy));
                    count[copy[yy * N + xx]] += 1;
                }
                label[y * N + x] = count.indexOf(Math.max(...count));
            }
        }
    }

    // Islands smaller than ISLAND cells (light stones read as sky, a speck of texture) take the colour round them
    const ISLAND = 60;
    {
        const seen = new Uint8Array(N * N);
        for (let start = 0; start < N * N; start++) {
            if (seen[start]) continue;
            const c = label[start];
            const cells = [start];
            const around = [0, 0, 0, 0];
            seen[start] = 1;
            for (let q = 0; q < cells.length; q++) {
                const i = cells[q], x = i % N, y = (i - x) / N;
                for (const j of [x > 0 ? i - 1 : -1, x < N - 1 ? i + 1 : -1, y > 0 ? i - N : -1, y < N - 1 ? i + N : -1]) {
                    if (j < 0) continue;
                    if (label[j] !== c) { around[label[j]] += 1; continue; }
                    if (seen[j]) continue;
                    seen[j] = 1;
                    cells.push(j);
                }
            }
            if (cells.length < ISLAND && Math.max(...around) > 0) {
                const to = around.indexOf(Math.max(...around));
                cells.forEach((i) => { label[i] = to; });
            }
        }
    }

    // The outline of a set of cells (marching squares, joined into loops and simplified), in art px
    const outline = (inside) => {
        const at = (x, y) => (x >= 0 && y >= 0 && x < N && y < N && inside(label[y * N + x]) ? 1 : 0);
        // Edges between an inside cell and an outside one, as directed segments with the inside on their left
        const next = new Map();
        const key = (x, y) => y * (N + 1) + x;
        const add = (x0, y0, x1, y1) => next.set(key(x0, y0), [x1, y1]);
        for (let y = -1; y < N; y++) {
            for (let x = -1; x < N; x++) {
                const a = at(x, y);
                if (a !== at(x + 1, y)) (a ? add(x + 1, y + 1, x + 1, y) : add(x + 1, y, x + 1, y + 1));
                if (a !== at(x, y + 1)) (a ? add(x, y + 1, x + 1, y + 1) : add(x + 1, y + 1, x, y + 1));
            }
        }
        const loops = [];
        const seen = new Set();
        for (const [k] of next) {
            if (seen.has(k)) continue;
            const loop = [];
            let cur = k;
            while (!seen.has(cur) && next.has(cur)) {
                seen.add(cur);
                const x = cur % (N + 1), y = (cur - x) / (N + 1);
                loop.push([x, y]);
                const [nx, ny] = next.get(cur);
                cur = key(nx, ny);
            }
            if (loop.length < 6) continue;
            // Corners rounded off (the midpoints of the steps), then simplified
            const soft = loop.map(([x, y], i) => { const [x2, y2] = loop[(i + 1) % loop.length]; return [(x + x2) / 2, (y + y2) / 2]; });
            const simple = simplify(soft, 0.6);
            if (simple.length >= 3) loops.push(simple.flatMap(([x, y]) => [Math.round(x * G), Math.round(y * G)]));
        }
        return loops;
    };
    const simplify = (points, tolerance) => {
        if (points.length < 4) return points;
        const keep = new Uint8Array(points.length);
        keep[0] = keep[points.length - 1] = 1;
        const stack = [[0, points.length - 1]];
        while (stack.length) {
            const [a, b] = stack.pop();
            const [ax, ay] = points[a], [bx, by] = points[b];
            const len = Math.hypot(bx - ax, by - ay) || 1;
            let far = -1, farD = tolerance;
            for (let i = a + 1; i < b; i++) {
                const d = Math.abs((bx - ax) * (ay - points[i][1]) - (ax - points[i][0]) * (by - ay)) / len;
                if (d > farD) { farD = d; far = i; }
            }
            if (far > 0) { keep[far] = 1; stack.push([a, far], [far, b]); }
        }
        return points.filter((_, i) => keep[i]);
    };
    const colorOf = (c) => { const [r, g, b, n] = sums[c]; return hex(r / n, g / n, b / n); };
    const id = (name) => names.indexOf(name);
    const isGround = (c) => c === id('past') || c === id('ground');
    // The sky: all mint (drawn as a plain fill), the future over it; the ground: all of it in the orange of the past,
    // the teal over its right side
    scene.regions = {
        sky: { color: colorOf(id('mint')) },
        future: { color: colorOf(id('future')) },
        past: { color: colorOf(id('past')), loops: outline(isGround) },
        ground: { color: colorOf(id('ground')) },
    };
    const lastSky = (x) => { let y = 0; while (y < N - 1 && !isGround(label[y * N + x])) y++; return y * G; };
    scene.regions.horizon = [lastSky(0), lastSky(N - 1)];

    // The edge between the two colours of each half, and the bubbles of one colour in the other, read again pixel by
    // pixel (the cells above are too coarse for them): every bare pixel takes its nearest colour, a small majority
    // filter takes out the texture's specks. The edge is where the main body of the second colour (the future, the
    // teal of the ground) starts on each row, where the drawing does not hide it, joined across what it hides and
    // smoothed: { y0, step, x: [...] } in art px. The bubbles are every other blob of either colour, as ellipses
    // [x, y, rx, ry, angle, plane (0 the sky, 1 the ground), colour (0 the first, 1 the second)]
    const cls = new Int8Array(S * S).fill(-1);
    for (let i = 0; i < S * S; i++) {
        if (covered[i]) continue;
        const r = card[i * 3], g = card[i * 3 + 1], b = card[i * 3 + 2];
        let best = 0, bestD = Infinity;
        names.forEach((name, c) => { const [cr, cg, cb] = COLORS[name]; const d = (r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2; if (d < bestD) { bestD = d; best = c; } });
        cls[i] = best;
    }
    {
        const copy = Int8Array.from(cls);
        for (let y = 2; y < S - 2; y++) {
            for (let x = 2; x < S - 2; x++) {
                const i = y * S + x;
                if (copy[i] < 0) continue;
                const count = [0, 0, 0, 0];
                for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const c = copy[i + dy * S + dx]; if (c >= 0) count[c]++; }
                cls[i] = count.indexOf(Math.max(...count));
            }
        }
    }
    const blobsOfClass = (c) => {
        const seen = new Uint8Array(S * S);
        const out = [];
        for (let start = 0; start < S * S; start++) {
            if (seen[start] || cls[start] !== c) continue;
            const pixels = [start];
            seen[start] = 1;
            for (let q = 0; q < pixels.length; q++) {
                const i = pixels[q], x = i % S;
                for (const j of [x > 0 ? i - 1 : -1, x < S - 1 ? i + 1 : -1, i - S, i + S]) {
                    if (j < 0 || j >= S * S || seen[j] || cls[j] !== c) continue;
                    seen[j] = 1;
                    pixels.push(j);
                }
            }
            out.push(pixels);
        }
        return out.sort((a, b) => b.length - a.length);
    };
    const STEP = 8;
    const edgeOf = (first, second, y0, y1, end = null) => {
        const main = new Uint8Array(S * S);
        blobsOfClass(second)[0].forEach((i) => { main[i] = 1; });
        const rows = [];
        for (let y = y0; y <= y1; y += STEP) {
            const xs = [];
            for (let yy = y; yy < Math.min(S, y + STEP); yy++) {
                for (let x = 1; x < S; x++) {
                    const i = yy * S + x;
                    if (!main[i]) continue;
                    // Only where the first colour is bare right beside it: elsewhere the drawing hides the edge
                    if (cls[i - 1] === first || cls[i - 2] === first) xs.push(x);
                    break;
                }
            }
            rows.push(xs.length > STEP / 2 ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
        }
        // Hidden down to its end (the sky's, behind Sid), it goes to where the next one starts
        if (end !== null && rows[rows.length - 1] === null) rows[rows.length - 1] = end;
        // Joined across what is hidden, held at the ends, then smoothed
        const known = rows.map((x, i) => (x === null ? -1 : i)).filter((i) => i >= 0);
        const x = rows.map((v, i) => {
            if (v !== null) return v;
            const a = [...known].reverse().find((k) => k < i), b = known.find((k) => k > i);
            if (a === undefined) return rows[b];
            if (b === undefined) return rows[a];
            return rows[a] + ((rows[b] - rows[a]) * (i - a)) / (b - a);
        });
        const R = 4;
        const smooth = x.map((_, i) => {
            let sum = 0, w = 0;
            for (let k = -R; k <= R; k++) { const j = Math.min(x.length - 1, Math.max(0, i + k)); const g = Math.exp(-(k * k) / (R * R / 2)); sum += x[j] * g; w += g; }
            return Math.round(sum / w);
        });
        return { y0, step: STEP, x: smooth };
    };
    const horizon = Math.max(...scene.regions.horizon);
    const groundEdge = edgeOf(id('past'), id('ground'), Math.min(...scene.regions.horizon) - 40, S);
    scene.regions.edge = [edgeOf(id('mint'), id('future'), 0, horizon, groundEdge.x[0]), groundEdge];
    // The bubbles: blobs that are not the main body of their colour, big enough and near the edge (farther away they
    // are bits of colour shut in by the drawing), as ellipses from their moments
    const edgeAt = (plane, y) => { const e = scene.regions.edge[plane]; return e.x[Math.min(e.x.length - 1, Math.max(0, Math.round((y - e.y0) / e.step)))]; };
    scene.regions.bubbles = [];
    [[id('mint'), 0, 0], [id('future'), 0, 1], [id('past'), 1, 0], [id('ground'), 1, 1]].forEach(([c, plane, colour]) => {
        blobsOfClass(c).slice(1).forEach((pixels) => {
            if (pixels.length < 300) return;
            let sx = 0, sy = 0;
            pixels.forEach((i) => { sx += i % S; sy += Math.floor(i / S); });
            const mx = sx / pixels.length, my = sy / pixels.length;
            if (Math.abs(mx - edgeAt(plane, my)) > 260) return;
            let xx = 0, yy = 0, xy = 0;
            pixels.forEach((i) => { const dx = (i % S) - mx, dy = Math.floor(i / S) - my; xx += dx * dx; yy += dy * dy; xy += dx * dy; });
            xx /= pixels.length; yy /= pixels.length; xy /= pixels.length;
            const tr = (xx + yy) / 2, det = Math.sqrt(Math.max(0, ((xx - yy) / 2) ** 2 + xy * xy));
            const angle = 0.5 * Math.atan2(2 * xy, xx - yy);
            scene.regions.bubbles.push([Math.round(mx), Math.round(my), Math.round(2 * Math.sqrt(tr + det)), Math.round(2 * Math.sqrt(Math.max(1, tr - det))), +angle.toFixed(2), plane, colour]);
        });
    });
}

// ---- The specks of the sky: dots, in the colour they are on the card
{
    const card = await sharp(path.join(root, 'public', 'cards', '9.webp')).resize(S, S).removeAlpha().raw().toBuffer();
    let r = 0, g = 0, b = 0, n = 0;
    for (const blob of blobsOf(specks, S, S, (i) => specks[i * 4 + 3] > 0)) {
        if (blob.area > 400) continue;
        scene.dots.list.push([Math.round(blob.x), Math.round(blob.y), +Math.max(1.5, Math.sqrt(blob.area / Math.PI)).toFixed(1)]);
        const i = Math.round(blob.y) * S + Math.round(blob.x);
        r += card[i * 3]; g += card[i * 3 + 1]; b += card[i * 3 + 2]; n++;
    }
    scene.dots.color = hex(r / n, g / n, b / n);
}

// ---- The stipples: the aura round Sid and the light round the mushrooms
scene.aura = [...stipple((await load(33)).data, 6, [1.6, 1.4]), ...stipple((await load(34)).data, 6, [1.6, 1.4])];
{
    const { data } = await load(19);
    scene.glow = stipple(data, 6, [1.8, 1.6]);
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < S * S; i++) if (data[i * 4 + 3] > 200) { r += data[i * 4]; g += data[i * 4 + 1]; b += data[i * 4 + 2]; n++; }
    scene.glowColor = hex(r / n, g / n, b / n);
}

// ---- The little flowers' yellow heads
{
    const { data } = await load(6);
    scene.flowers = blobsOf(data, S, S).filter((b) => b.area > 60).map((b) => [Math.round(b.x), Math.round(b.y), Math.round(Math.sqrt(b.area / Math.PI))]);
}

// ---- Sid's head (the top of his body's fill) and the rulito
{
    const { data } = await load(35);
    const [x, y, w] = boxOf(data, S, S);
    scene.head = [Math.round(x + w / 2), y + Math.round(w * 0.45)];
    const r = await load(41);
    scene.rulito = boxOf(r.data, S, S);
    let cr = 0, cg = 0, cb = 0, n = 0;
    for (let i = 0; i < S * S; i++) if (r.data[i * 4 + 3] > 200) { cr += r.data[i * 4]; cg += r.data[i * 4 + 1]; cb += r.data[i * 4 + 2]; n++; }
    scene.rulitoColor = `#${hex(cr / n, cg / n, cb / n).toString(16).padStart(6, '0')}`;
}

await writeFile(path.join(root, 'src', 'composables', 'upekkhaScene.json'), JSON.stringify(scene));
const R = scene.regions;
console.log(Object.keys(scene.boxes).length, 'pictures; regions: ground', R.past.loops.length, 'loops; edges', R.edge.map((e) => e.x.length).join(' '), 'rows;',
    R.bubbles.length, 'bubbles; horizon', R.horizon, '; colours', ['sky', 'future', 'past', 'ground'].map((k) => R[k].color.toString(16)).join(' '),
    `; ${scene.dots.list.length} specks (${scene.dots.color.toString(16)}); aura ${scene.aura.length}; glow ${scene.glow.length} (${scene.glowColor.toString(16)}); flowers`,
    JSON.stringify(scene.flowers), 'head', scene.head, 'rulito', scene.rulito, scene.rulitoColor);
