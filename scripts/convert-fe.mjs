// The layers of Fe as exported (originales/fe/Fe-N.png, 3240px) -> public/assets/fe/*.webp and src/composables/feScene.json,
// everything scaled to the 2160 square of the other scenes (px of that square):
//   boxes      the box of every picture:
//              far     the far bank: its grass, rocks and ferns, the two big mushrooms (caps, stems and their solid
//                      coral) and the tuft by the right one, everything above the middle of the river
//              trunk   the teal trunk on the left edge, with its lines (the scene mirrors it above the frame)
//              river   the river alone, its glints painted over in its teal, and spread 40 px under both banks, so
//                      nothing opens up when the banks slide over it with the parallax
//              near    the near bank: its grass, rocks, the yellow strokes of the shore and the bush on the left edge
//              lotus, log, sprouts  the lotus with its bud, the log (with its little mushrooms and the rocks beside it)
//                      and the two little glowing mushrooms: their own pictures, so they can sway and be lit
//              sid, eyes  Sid sitting (his eyes cut out, painted over in white, so he can blink)
//   blob       the card's sky is in no layer as it is seen: it is the flat yellow of the card (read from it, where
//              nothing is drawn) with the blue shapes of 15 and 16 over it in Colour mode (the hue of their navy, the
//              lightness of what is under them: so they are a light blue over the yellow, a grey blue over the grass,
//              the water and the mushrooms). The sky is drawn in code: the yellow, and the blue shapes as outlines
//              ([x, y, ...] each, closed); over everything else the Colour mode is worked out here, in each picture
//   waves      the little waves on the river (their line and their cyan light), each cut out into one atlas
//              (waves.webp), [x, y, w, h where it is, x, y in the atlas], so they can drift
//   clouds     the white clouds (1), each cut out into one atlas (clouds.webp), the same way
//   capDots    the loose coral dots of the stipple round the two caps (8), as [x, y, radius, 0xRRGGBB] (grey blue
//              where the blue shapes are over them); the solid caps are in `far`
//   sproutGlow, budGlow  the coral glow of the two little mushrooms (8) and the green glow of the lotus bud (10), as dots
//   aura, heart  the yellow stipple round Sid (17) and on his chest (20), as dots [x, y, radius]
//   eyesAt     the centre of each eye
// Not converted: 15 and 16 (the blue shapes) are drawn in code and worked out into the pictures; 17 and 20 and the
// stipple of 8 and 10 only as particles. There is no rulito layer and no Algo Particular mark (7 is a piece of the
// hatching of the right stem). The originals are not kept in the repo once converted. Usage: node scripts/convert-fe.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'originales', 'fe');
const target = path.join(root, 'public', 'assets', 'fe');
const file = (n) => path.join(source, `Fe-${n}.png`);
const S = 2160;
const N = S * S;
const PAD = 4;
const SOLID = 110;
const DOT = 140;                 // a coral or green blob smaller than this (px) is a dot of stipple, not a solid part

const webp = (img) => img.webp({ quality: 88, alphaQuality: 90, effort: 6 });
const hex = (r, g, b) => (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
const L = [];
for (let n = 1; n <= 20; n++) L[n] = await sharp(file(n)).ensureAlpha().resize(S, S, { kernel: 'lanczos3' }).raw().toBuffer();
const card = await sharp(path.join(root, 'public', 'cards', '23.webp')).resize(S, S).removeAlpha().raw().toBuffer();

// ---- Helpers
const boxOf = (data, keep = () => true) => {
    let x0 = S, y0 = S, x1 = -1, y1 = -1;
    for (let i = 0; i < N; i++) {
        if (data[i * 4 + 3] < 4 || !keep(i)) continue;
        const x = i % S, y = (i - x) / S;
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    x0 = Math.max(0, x0 - PAD); y0 = Math.max(0, y0 - PAD);
    x1 = Math.min(S - 1, x1 + PAD); y1 = Math.min(S - 1, y1 + PAD);
    return [x0, y0, x1 - x0 + 1, y1 - y0 + 1];
};
// Every blob of solid pixels of a layer (that `keep` lets in): its pixels, area and centre
const blobsOf = (data, keep = () => true, solidAt = SOLID) => {
    const seen = new Uint8Array(N);
    const blobs = [];
    const stack = [];
    const solid = (i) => data[i * 4 + 3] >= solidAt && keep(i);
    for (let start = 0; start < N; start++) {
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
const boxOfPixels = (pixels) => {
    let x0 = S, y0 = S, x1 = 0, y1 = 0;
    pixels.forEach((i) => { const x = i % S, y = (i - x) / S; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); });
    return [x0, y0, x1, y1];
};
// A binary mask grown by r px (a square)
const grow = (mask, r) => {
    const a = new Uint8Array(N), b = new Uint8Array(N);
    for (let y = 0; y < S; y++) {
        let last = -1e9;
        for (let x = 0; x < S; x++) { if (mask[y * S + x]) last = x; if (x - last <= r) a[y * S + x] = 1; }
        last = 1e9;
        for (let x = S - 1; x >= 0; x--) { if (mask[y * S + x]) last = x; if (last - x <= r) a[y * S + x] = 1; }
    }
    for (let x = 0; x < S; x++) {
        let last = -1e9;
        for (let y = 0; y < S; y++) { if (a[y * S + x]) last = y; if (y - last <= r) b[y * S + x] = 1; }
        last = 1e9;
        for (let y = S - 1; y >= 0; y--) { if (a[y * S + x]) last = y; if (last - y <= r) b[y * S + x] = 1; }
    }
    return b;
};
const inRect = (i, [x0, y0, w, h]) => { const x = i % S, y = (i - x) / S; return x >= x0 && x < x0 + w && y >= y0 && y < y0 + h; };

// ---- The Colour blend of the blue shapes (Photoshop's Color: the hue and saturation of the navy, the luminosity of
// what is under it)
const NAVY = [L[15][0], L[15][1], L[15][2]];
const lum = (c) => 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2];
const colour = (base) => {
    const d = lum(base) - lum(NAVY);
    let c = NAVY.map((v) => v + d);
    const l = lum(c), lo = Math.min(...c), hi = Math.max(...c);
    if (lo < 0) c = c.map((v) => l + (v - l) * l / (l - lo));
    if (hi > 255) c = c.map((v) => l + (v - l) * (255 - l) / (hi - l));
    return c;
};
const blob = new Float32Array(N);
for (let i = 0; i < N; i++) blob[i] = Math.max(L[15][i * 4 + 3], L[16][i * 4 + 3]) / 255;
const tinted = (rgb, i) => {
    const b = blob[i];
    if (b <= 0) return rgb;
    const c = colour(rgb);
    return rgb.map((v, k) => v + (c[k] - v) * b);
};

// ---- Which pixels of which layer go where
// The trunk: the teal of 3 and the lines of 9 at the left edge, above the river
const TRUNK = [0, 0, 165, 1102];
const LOG = [1395, 1712, 755, 305];
const SPROUTS = [515, 1888, 210, 120];
// The middle of the river, column by column: what is above it is the far bank, what is below, the near one
const water = new Uint8Array(N);
for (let i = 0; i < N; i++) if (L[3][i * 4 + 3] > 128 && !inRect(i, TRUNK)) water[i] = 1;
const mid = new Float32Array(S);
for (let x = 0; x < S; x++) {
    let sum = 0, n = 0;
    for (let y = 0; y < S; y++) if (water[y * S + x]) { sum += y; n++; }
    mid[x] = n ? sum / n : -1;
}
for (let x = 0; x < S; x++) {
    if (mid[x] >= 0) continue;
    let a = x, b = x;
    while (a > 0 && mid[a] < 0) a--;
    while (b < S - 1 && mid[b] < 0) b++;
    mid[x] = mid[a] >= 0 && mid[b] >= 0 ? (mid[a] + mid[b]) / 2 : Math.max(mid[a], mid[b]);
}
// The dots of stipple of 8 (coral) and 10 (the green of the bud): small blobs
const isDot = (n) => {
    const out = new Uint8Array(N);
    const green = (i) => n !== 10 || (L[10][i * 4 + 1] > L[10][i * 4] + 30 && L[10][i * 4 + 1] > 150);
    // Loose: below SOLID too, so the soft edge of a dot goes with it
    for (const b of blobsOf(L[n], green, 30)) if (b.area < DOT) b.pixels.forEach((i) => { out[i] = 1; });
    return out;
};
const dots8 = isDot(8), dots10 = isDot(10);
// The glow of the two little mushrooms is dense: there everything of 8 but their solid caps is glow
{
    const caps = new Uint8Array(N);
    blobsOf(L[8], (i) => inRect(i, SPROUTS), 235).filter((b) => b.area > 400).forEach((b) => b.pixels.forEach((i) => { caps[i] = 1; }));
    const kept = grow(caps, 1);
    for (let i = 0; i < N; i++) if (inRect(i, SPROUTS) && L[8][i * 4 + 3] > 0) dots8[i] = kept[i] ? 0 : 1;
}
// The little waves on the river: the small marks of 9 and 12 inside the river, with the cyan light of 3 under them
const riverArea = grow(water, 3);
const waveCuts = [];
for (const n of [9, 12]) {
    for (const b of blobsOf(L[n], () => true, 60)) {
        if (b.area > 6000 || !b.pixels.every((i) => riverArea[i])) continue;
        const [x0, y0, x1, y1] = boxOfPixels(b.pixels);
        waveCuts.push([x0, y0, x1, y1]);
    }
}
const cyan = (i) => L[3][i * 4 + 3] > 20 && L[3][i * 4 + 1] > 190 && L[3][i * 4] < 120;
// Each wave's box, grown to take the soft edge of its line and the cyan light under it
const waveBoxes = waveCuts.map(([x0, y0, x1, y1]) => [x0 - 10, y0 - 10, x1 + 10, y1 + 22]);
const inWave = (i) => {
    const x = i % S, y = (i - x) / S;
    for (let k = 0; k < waveBoxes.length; k++) {
        const [x0, y0, x1, y1] = waveBoxes[k];
        if (x >= x0 && x <= x1 && y >= y0 && y <= y1) return k;
    }
    return -1;
};
// Sid's eyes: the two small round blobs of 19 near his face
const eyeBlobs = blobsOf(L[19]).filter((b) => b.area < 2500 && b.y > 1300 && b.y < 1550 && b.x > 980 && b.x < 1220);
const eye = new Uint8Array(N);
eyeBlobs.forEach((b) => b.pixels.forEach((i) => { eye[i] = 1; }));
const eyeArea = grow(eye, 4);

const owner = (n, i) => {
    switch (n) {
        case 1: case 15: case 16: case 17: case 20: return null;
        case 18: return 'sid';
        case 19: return eyeArea[i] ? 'eyes' : 'sid';
        case 10: return dots10[i] ? null : 'lotus';
        case 11: return 'lotus';
        case 13: case 14: return 'log';
        default: break;
    }
    if (n === 8 && dots8[i]) return null;
    if ((n === 4 || n === 8) && inRect(i, LOG)) return 'log';
    if ((n === 8 || n === 12) && inRect(i, SPROUTS)) return 'sprouts';
    if ((n === 9 || n === 12) && inWave(i) >= 0 && riverArea[i]) return 'waves';
    if (n === 3) {
        if (inRect(i, TRUNK)) return 'trunk';
        if (inWave(i) >= 0 && cyan(i)) return 'waves';
        return 'river';
    }
    if (n === 9 && inRect(i, TRUNK)) return 'trunk';
    const x = i % S, y = (i - x) / S;
    return y < mid[x] ? 'far' : 'near';
};

// Compose every picture from its pixels, layer by layer (straight alpha), in the original order
const names = ['far', 'trunk', 'river', 'near', 'lotus', 'log', 'sprouts', 'sid', 'eyes', 'waves'];
const pics = Object.fromEntries(names.map((name) => [name, new Float32Array(N * 4)]));
const TEAL = (() => { const c = [0, 0, 0]; let n = 0; for (let i = 0; i < N; i += 7) if (water[i] && !cyan(i) && L[3][i * 4 + 3] === 255) { c[0] += L[3][i * 4]; c[1] += L[3][i * 4 + 1]; c[2] += L[3][i * 4 + 2]; n++; } return c.map((v) => v / n); })();
for (let n = 1; n <= 20; n++) {
    const d = L[n];
    for (let i = 0; i < N; i++) {
        const a = d[i * 4 + 3] / 255;
        if (a <= 0) continue;
        const who = owner(n, i);
        if (!who) continue;
        const p = pics[who];
        let c = [d[i * 4], d[i * 4 + 1], d[i * 4 + 2]];
        // The river's glints are painted over in its teal (they drift with the waves)
        if (who === 'river' && cyan(i)) c = TEAL;
        const pa = p[i * 4 + 3];
        const oa = a + pa * (1 - a);
        for (let k = 0; k < 3; k++) p[i * 4 + k] = (c[k] * a + p[i * 4 + k] * pa * (1 - a)) / oa;
        p[i * 4 + 3] = oa;
    }
}
// The eyes, cut out of Sid, are painted over in his white
for (let i = 0; i < N; i++) if (eyeArea[i] && L[18][i * 4 + 3] > 0) {
    const p = pics.sid;
    const a = L[18][i * 4 + 3] / 255;
    if (p[i * 4 + 3] < a) { p[i * 4] = 255; p[i * 4 + 1] = 255; p[i * 4 + 2] = 255; p[i * 4 + 3] = a; }
}
// The river, spread under both banks in its teal
{
    const p = pics.river;
    const has = new Uint8Array(N);
    for (let i = 0; i < N; i++) if (p[i * 4 + 3] > 0.5) has[i] = 1;
    const spread = grow(has, 40);
    for (let i = 0; i < N; i++) {
        if (!spread[i]) continue;
        const a = p[i * 4 + 3];
        for (let k = 0; k < 3; k++) p[i * 4 + k] = p[i * 4 + k] * a + TEAL[k] * (1 - a);
        p[i * 4 + 3] = 1;
    }
}

// ---- Out: each picture cropped to its box, the blue shapes worked out over it
await mkdir(target, { recursive: true });
const scene = { size: S, boxes: {} };
const toBuffer = (p, name) => {
    const out = Buffer.alloc(N * 4);
    const tint = !['sid', 'eyes'].includes(name);
    for (let i = 0; i < N; i++) {
        const a = p[i * 4 + 3];
        if (a <= 0) continue;
        let c = [p[i * 4], p[i * 4 + 1], p[i * 4 + 2]];
        if (tint) c = tinted(c, i);
        out[i * 4] = Math.round(c[0]); out[i * 4 + 1] = Math.round(c[1]); out[i * 4 + 2] = Math.round(c[2]);
        out[i * 4 + 3] = Math.round(a * 255);
    }
    return out;
};
const save = async (name, data, box, scale = 1) => {
    let img = sharp(data, { raw: { width: S, height: S, channels: 4 } }).extract({ left: box[0], top: box[1], width: box[2], height: box[3] });
    if (scale !== 1) img = sharp(await img.png().toBuffer()).resize(Math.round(box[2] * scale), Math.round(box[3] * scale));
    await webp(img).toFile(path.join(target, `${name}.webp`));
};
const buffers = {};
for (const name of names) {
    buffers[name] = toBuffer(pics[name], name);
    if (name === 'waves') continue;
    const box = boxOf(buffers[name]);
    scene.boxes[name] = box;
    await save(name, buffers[name], box);
}

// Pieces of a picture or a layer cut out into one atlas, packed in rows: [x, y, w, h where it is, x, y in the atlas]
const atlas = async (name, data, pieces) => {
    const ATLAS_W = 1024, GAP = 8;
    const cuts = pieces.map(([x0, y0, x1, y1]) => {
        x0 = Math.max(0, x0); y0 = Math.max(0, y0); x1 = Math.min(S - 1, x1); y1 = Math.min(S - 1, y1);
        const w = x1 - x0 + 1, h = y1 - y0 + 1;
        const pixels = Buffer.alloc(w * h * 4);
        for (let y = 0; y < h; y++) data.copy(pixels, y * w * 4, ((y0 + y) * S + x0) * 4, ((y0 + y) * S + x0 + w) * 4);
        return { x: x0, y: y0, w, h, pixels };
    });
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
        .toFile(path.join(target, `${name}.webp`));
    return { size: [ATLAS_W, ATLAS_H], pieces: cuts.sort((a, b) => a.x - b.x).map((c) => [c.x, c.y, c.w, c.h, c.ax, c.ay]) };
};
{
    const w = await atlas('waves', buffers.waves, waveBoxes);
    scene.waveAtlas = w.size;
    scene.waves = w.pieces;
}
{
    const pieces = blobsOf(L[1]).filter((b) => b.area > 200).map((b) => { const [x0, y0, x1, y1] = boxOfPixels(b.pixels); return [x0 - 5, y0 - 5, x1 + 5, y1 + 5]; });
    const c = await atlas('clouds', L[1], pieces);
    scene.cloudAtlas = c.size;
    scene.clouds = c.pieces;
}

// ---- The sky: the card's yellow where nothing is drawn, the light blue where the shapes are over it, and the shapes'
// outlines (traced on a grid of STEP px, smoothed)
{
    const drawn = new Uint8Array(N);
    for (let n = 1; n <= 20; n++) if (n !== 15 && n !== 16) for (let i = 0; i < N; i++) if (L[n][i * 4 + 3] > 0) drawn[i] = 1;
    const mean = (keep) => {
        const c = [0, 0, 0]; let n = 0;
        for (let i = 0; i < N; i += 3) if (!drawn[i] && keep(i)) { c[0] += card[i * 3]; c[1] += card[i * 3 + 1]; c[2] += card[i * 3 + 2]; n++; }
        return hex(...c.map((v) => v / n));
    };
    const yellow = mean((i) => blob[i] === 0);
    const blue = mean((i) => blob[i] === 1);
    const STEP = 3;
    const G = Math.ceil(S / STEP) + 2;
    const grid = new Uint8Array(G * G);
    for (let gy = 1; gy < G - 1; gy++) for (let gx = 1; gx < G - 1; gx++) {
        const x = Math.min(S - 1, (gx - 1) * STEP + 1), y = Math.min(S - 1, (gy - 1) * STEP + 1);
        grid[gy * G + gx] = blob[y * S + x] >= 0.5 ? 1 : 0;
    }
    // Moore-neighbour tracing of the outline of every shape
    const dirs = [[-1, 0], [-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1]];
    const label = new Int32Array(G * G).fill(-1);
    const shapes = [];
    for (let s = 0; s < G * G; s++) {
        if (!grid[s] || label[s] >= 0) continue;
        // Flood the shape, so its pixels are not started from again
        const id = shapes.length;
        const stack = [s];
        label[s] = id;
        while (stack.length) {
            const i = stack.pop();
            for (const j of [i - 1, i + 1, i - G, i + G]) if (grid[j] && label[j] < 0) { label[j] = id; stack.push(j); }
        }
        const contour = [];
        let cur = s, back = s - 1;
        const back0 = back;
        for (let guard = 0; guard < G * G; guard++) {
            contour.push(cur);
            const cx = cur % G, cy = (cur - cx) / G;
            const bx = back % G - cx, by = (back - (back % G)) / G - cy;
            const k = dirs.findIndex(([dx, dy]) => dx === bx && dy === by);
            let moved = false;
            for (let t = 1; t <= 8; t++) {
                const j = (k + t) % 8;
                const n = (cy + dirs[j][1]) * G + cx + dirs[j][0];
                if (grid[n]) {
                    const p = (k + t + 7) % 8;
                    back = (cy + dirs[p][1]) * G + cx + dirs[p][0];
                    cur = n;
                    moved = true;
                    break;
                }
            }
            if (!moved || (cur === s && back === back0)) break;
        }
        // Simplified (Ramer-Douglas-Peucker), in px of the square
        // (where a shape meets the frame its outline is pushed a little past it, so its mirrored copies overlap it)
        const out = (v) => (v <= STEP ? -8 : v >= S - STEP ? S + 8 : v);
        const pts = contour.map((i) => { const gx = i % G, gy = (i - gx) / G; return [out((gx - 1) * STEP + STEP / 2), out((gy - 1) * STEP + STEP / 2)]; });
        const rdp = (a, eps) => {
            if (a.length < 3) return a;
            const [x0, y0] = a[0], [x1, y1] = a[a.length - 1];
            const len = Math.hypot(x1 - x0, y1 - y0) || 1;
            let best = 0, at = 0;
            for (let i = 1; i < a.length - 1; i++) {
                const d = Math.abs((x1 - x0) * (y0 - a[i][1]) - (x0 - a[i][0]) * (y1 - y0)) / len;
                if (d > best) { best = d; at = i; }
            }
            if (best <= eps) return [a[0], a[a.length - 1]];
            return [...rdp(a.slice(0, at + 1), eps).slice(0, -1), ...rdp(a.slice(at), eps)];
        };
        const half = Math.floor(pts.length / 2);
        const simple = [...rdp(pts.slice(0, half + 1), 1.6).slice(0, -1), ...rdp([...pts.slice(half), pts[0]], 1.6).slice(0, -1)];
        if (simple.length > 4) shapes.push(simple.flatMap(([x, y]) => [Math.round(x), Math.round(y)]));
        else shapes.push([]);
    }
    scene.sky = { yellow, blue, shapes: shapes.filter((s) => s.length) };
}

// ---- Particles
// Loose dots: one particle per blob, its radius from its area, its colour as seen (the blue shapes worked out)
const dotsOf = (mask, layer, keep = () => true) => {
    const out = [];
    for (const b of blobsOf(layer, (i) => mask[i] && keep(i), 30)) {
        if (b.area < 3) continue;
        const i = Math.round(b.y) * S + Math.round(b.x);
        const c = tinted([layer[i * 4], layer[i * 4 + 1], layer[i * 4 + 2]], i);
        out.push([Math.round(b.x), Math.round(b.y), +Math.max(1, Math.sqrt(b.area / Math.PI)).toFixed(1), hex(...c.map((v) => Math.max(0, Math.min(255, v))))]);
    }
    return out;
};
scene.capDots = dotsOf(dots8, L[8], (i) => !inRect(i, SPROUTS) && !inRect(i, LOG));
// Dense stipple: a dot wherever it is, as dense as it is (as Viriya's aura)
const sample = (layer, keep = () => true, step = 5, size = [1.8, 1.6]) => {
    const out = [];
    for (let y = 0; y < S; y += step) for (let x = 0; x < S; x += step) {
        const i = y * S + x;
        const a = layer[i * 4 + 3] / 255;
        if (a < 0.05 || !keep(i) || Math.random() > a * 0.9) continue;
        out.push([x + Math.round((Math.random() - 0.5) * step), y + Math.round((Math.random() - 0.5) * step), +(size[0] + Math.random() * size[1]).toFixed(1)]);
    }
    return out;
};
scene.sproutGlow = sample(L[8], (i) => dots8[i] && inRect(i, SPROUTS), 4);
scene.budGlow = sample(L[10], (i) => dots10[i], 4);
scene.aura = sample(L[17], () => true, 7, [2.4, 1.8]);
scene.heart = sample(L[20], () => true, 5, [2, 1.8]);
scene.eyesAt = eyeBlobs.map((b) => [Math.round(b.x), Math.round(b.y)]).sort((a, b) => a[0] - b[0]);
scene.colors = { sprout: 0xff7a7c, bud: 0x8aeeb0, aura: 0xffdd77, heart: 0xffde7a };

await writeFile(path.join(root, 'src', 'composables', 'feScene.json'), JSON.stringify(scene));
console.log(JSON.stringify(scene.boxes), '\nsky', scene.sky.yellow.toString(16), scene.sky.blue.toString(16), scene.sky.shapes.map((s) => s.length / 2),
    '\nwaves', scene.waves.length, 'clouds', scene.clouds.length, 'capDots', scene.capDots.length, 'sproutGlow', scene.sproutGlow.length,
    'budGlow', scene.budGlow.length, 'aura', scene.aura.length, 'heart', scene.heart.length, 'eyes', JSON.stringify(scene.eyesAt));
