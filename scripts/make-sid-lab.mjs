// Sid in pieces, for the puppet lab (/lab/sid, only in development): cut out of the whole Sid of Nekkhamma
// (public/assets/nekkhamma/sid.webp, standing, walking) into
//   body.webp   his body alone (outline, flat fill, the hatching on his side), without his eyes, his arm or his legs
//   leg0.webp, leg1.webp  each leg as it is drawn, for the "drawn pieces" mode (they turn stiff at the hip)
//   arm.webp    the arm drawn over his belly, the same
//   sid.json    the size, his colours and line width, where his eyes, hips, shoulders and feet are (px of the source)
// in src/lab/sid/. A test only: the eyes and the arm are painted over with his fill, the legs are what lies farther
// than a line's width from the fill. When the illustrator delivers Sid in pieces (docs/sid-en-piezas.md) this script
// is replaced by one that reads her layers.
// Usage: node scripts/make-sid-lab.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'public', 'assets', 'nekkhamma', 'sid.webp');
const target = path.join(root, 'src', 'lab', 'sid');

const LINE = 22;        // px from the fill that still belong to the body's outline
const DEEP = 22;        // dark marks deeper than this from the outside are inside the body (eyes, arm, hatching)
// The arm drawn over his belly (a box of the source, where deep dark marks are the arm and not the hatching)
const ARM = (x, y) => x > 95 && x < 177 && y > 300 && (y < 458 || (y < 478 && x < 172));

const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height, N = W * H;
const opaque = new Uint8Array(N), dark = new Uint8Array(N), fill = new Uint8Array(N);
for (let i = 0; i < N; i++) {
    const l = (data[i * 4] + data[i * 4 + 1] + data[i * 4 + 2]) / 3;
    opaque[i] = data[i * 4 + 3] > 100;
    dark[i] = opaque[i] && l < 110;
    fill[i] = opaque[i] && l >= 110;
}

// Chamfer distance to the nearest pixel of a mask
function distance(seed) {
    const d = new Float32Array(N).fill(1e9);
    for (let i = 0; i < N; i++) if (seed[i]) d[i] = 0;
    const pass = (y, x, i, dx, dy, k) => { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < W && Y < H) d[i] = Math.min(d[i], d[Y * W + X] + k); };
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; pass(y, x, i, -1, 0, 1); pass(y, x, i, 0, -1, 1); pass(y, x, i, -1, -1, 1.414); pass(y, x, i, 1, -1, 1.414); }
    for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) { const i = y * W + x; pass(y, x, i, 1, 0, 1); pass(y, x, i, 0, 1, 1); pass(y, x, i, 1, 1, 1.414); pass(y, x, i, -1, 1, 1.414); }
    return d;
}

// Connected parts of a mask: a label per pixel and, per part, its size, centre and box
function parts(mask) {
    const label = new Int32Array(N).fill(-1), list = [];
    for (let s = 0; s < N; s++) {
        if (!mask[s] || label[s] >= 0) continue;
        const id = list.length, stack = [s], p = { n: 0, cx: 0, cy: 0, x0: W, x1: 0, y0: H, y1: 0 };
        label[s] = id;
        while (stack.length) {
            const q = stack.pop(), x = q % W, y = (q / W) | 0;
            p.n++; p.cx += x; p.cy += y;
            p.x0 = Math.min(p.x0, x); p.x1 = Math.max(p.x1, x); p.y0 = Math.min(p.y0, y); p.y1 = Math.max(p.y1, y);
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
                const X = x + dx, Y = y + dy;
                if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
                const r = Y * W + X;
                if (mask[r] && label[r] < 0) { label[r] = id; stack.push(r); }
            }
        }
        p.cx /= p.n; p.cy /= p.n;
        list.push(p);
    }
    return { label, list };
}

const outside = new Uint8Array(N);
for (let i = 0; i < N; i++) outside[i] = !opaque[i];
const fromOutside = distance(outside), fromFill = distance(fill);

const average = (mask) => {
    const sum = [0, 0, 0]; let n = 0;
    for (let i = 0; i < N; i++) if (mask[i]) { for (let k = 0; k < 3; k++) sum[k] += data[i * 4 + k]; n++; }
    return sum.map((v) => Math.round(v / n));
};
const FILL = average(fill), INK = average(dark);

// The marks inside the body: the eyes (two round parts of about the same size, side by side in the head) and the arm
const inner = new Uint8Array(N);
for (let i = 0; i < N; i++) inner[i] = dark[i] && fromOutside[i] > DEEP;
const marks = parts(inner);
const eyes = marks.list.filter((p) => p.n > 150 && p.n < 600 && p.cy < H * 0.4 && (p.x1 - p.x0) < 30 && (p.y1 - p.y0) < 30)
    .sort((a, b) => a.cx - b.cx);
if (eyes.length !== 2) throw new Error(`expected two eyes, found ${eyes.length}`);
const erase = new Uint8Array(N), arm = new Uint8Array(N);
for (let i = 0; i < N; i++) {
    const id = marks.label[i];
    if (id < 0) continue;
    const p = marks.list[id], x = i % W, y = (i / W) | 0;
    const eye = eyes.includes(p) || (p.n > 30 && p.n < 80 && p.cy < H * 0.4);   // and the little shine beside one
    if (eye || (p.n > 1000 && ARM(x, y))) erase[i] = 1;
    if (!eye && p.n > 1000 && ARM(x, y)) arm[i] = 1;
}
const nearErase = distance(erase), nearArm = distance(arm);

// The legs start below his body: under the lowest row of his fill (above it, all is body, its outline as thick as it is)
let bottom = 0;
for (let i = 0; i < N; i++) if (fill[i]) bottom = Math.max(bottom, (i / W) | 0);
const body = Buffer.from(data), legs = Buffer.alloc(N * 4), armPicture = Buffer.alloc(N * 4);
for (let i = 0; i < N; i++) {
    if (fromFill[i] > LINE + 8 && ((i / W) | 0) > bottom - 6) {   // below him and farther than a line from the fill: the legs
        data.copy(legs, i * 4, i * 4, i * 4 + 4);
        body[i * 4 + 3] = 0;
        continue;
    }
    // His fill flat (as she paints it), and over what is erased (with its soft edge)
    if ((fill[i] || nearErase[i] <= 5) && fromOutside[i] > DEEP - 1) {
        body[i * 4] = FILL[0]; body[i * 4 + 1] = FILL[1]; body[i * 4 + 2] = FILL[2]; body[i * 4 + 3] = 255;
    }
    if (nearArm[i] <= 1.5 && dark[i]) data.copy(armPicture, i * 4, i * 4, i * 4 + 4);
}

// His outline whole again: a ring of his ink all round the inside of his edge, as thick as his thinnest line, so what
// was cut out where the arm and the legs touched it leaves no notch (where she drew it thicker, it stays so)
const RING = 15;
// First the stubs where the legs joined his outline go (the legs drawn in code start under his body): at his bottom,
// what is narrower than a line sticking out of him is taken away (an opening: in and out again by STUB px)
const STUB = 14;
{
    const out = new Uint8Array(N);
    for (let i = 0; i < N; i++) out[i] = body[i * 4 + 3] <= 100;
    const core = new Uint8Array(N), fromOut = distance(out);
    for (let i = 0; i < N; i++) core[i] = fromOut[i] > STUB;
    const fromCore = distance(core);
    for (let i = 0; i < N; i++) if (((i / W) | 0) > bottom - 40 && fromCore[i] > STUB + 1.5) body[i * 4 + 3] = 0;
}
// and what is left hanging under the curve of his bottom (the last rows, where a stub met it, a few px wide)
{
    let last = 0;
    for (let y = 0; y < H; y++) {
        let run = 0;
        for (let x = 0; x < W; x++) if (body[(y * W + x) * 4 + 3] > 100) run++;
        if (run >= 40) last = y;
    }
    for (let i = (last + 2) * W; i < N; i++) body[i * 4 + 3] = 0;
}
const outsideBody = new Uint8Array(N);
for (let i = 0; i < N; i++) outsideBody[i] = body[i * 4 + 3] <= 100;
const fromEdge = distance(outsideBody);
for (let i = 0; i < N; i++) {
    if (!outsideBody[i] && fromEdge[i] <= RING) { body[i * 4] = INK[0]; body[i * 4 + 1] = INK[1]; body[i * 4 + 2] = INK[2]; }
    // and its soft outer edge in the same ink (no pale fringe)
    else if (outsideBody[i] && body[i * 4 + 3] > 0) { body[i * 4] = INK[0]; body[i * 4 + 1] = INK[1]; body[i * 4 + 2] = INK[2]; }
}

// The inner edge of his outline smooth where it was cut into (his bottom and the side where the arm was): ink or
// fill by the majority of a small neighbourhood, so it is one clean curve and not a ragged one
{
    const SMOOTH = 3, ink = new Uint8Array(N);
    for (let i = 0; i < N; i++) ink[i] = body[i * 4 + 3] > 100 && (body[i * 4] + body[i * 4 + 1] + body[i * 4 + 2]) / 3 < 110;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (outsideBody[i] || fromEdge[i] < RING - 1 || fromEdge[i] > 34) continue;
        if (!(y > bottom - 34 || x > W * 0.56)) continue;          // not where the hatching is
        let n = 0, k = 0;
        for (let dy = -SMOOTH; dy <= SMOOTH; dy++) for (let dx = -SMOOTH; dx <= SMOOTH; dx++) {
            const X = x + dx, Y = y + dy;
            if (X < 0 || Y < 0 || X >= W || Y >= H || outsideBody[Y * W + X]) continue;
            n++; k += ink[Y * W + X];
        }
        const c = k * 2 > n ? INK : FILL;
        body[i * 4] = c[0]; body[i * 4 + 1] = c[1]; body[i * 4 + 2] = c[2];
    }
}

// The two legs: the two biggest parts of what is left below the body
const legMask = new Uint8Array(N);
for (let i = 0; i < N; i++) legMask[i] = legs[i * 4 + 3] > 100;
const legParts = parts(legMask);
const two = [...legParts.list].sort((a, b) => b.n - a.n).slice(0, 2).sort((a, b) => a.cx - b.cx);
// Where a leg starts (the middle of its top row) and ends (its lowest point, the toe further along)
const ends = (p) => {
    const id = legParts.list.indexOf(p);
    let top = [], bottom = [0, 0];
    for (let y = p.y0; y <= p.y1; y++) for (let x = p.x0; x <= p.x1; x++) {
        if (legParts.label[y * W + x] !== id) continue;
        if (y < p.y0 + 4) top.push(x);
        if (y >= bottom[1]) bottom = [x, y];
    }
    return { hip: [Math.round(top.reduce((s, x) => s + x, 0) / top.length), p.y0], foot: bottom };
};

await mkdir(target, { recursive: true });
const save = async (name, raw, box) => {
    let picture = sharp(raw, { raw: { width: W, height: H, channels: 4 } });
    if (box) picture = sharp(await picture.png().toBuffer()).extract({ left: box[0], top: box[1], width: box[2], height: box[3] });
    await picture.webp({ quality: 92, alphaQuality: 100 }).toFile(path.join(target, `${name}.webp`));
};
const boxOf = (p, pad = 3) => {
    const x = Math.max(0, p.x0 - pad), y = Math.max(0, p.y0 - pad);
    return [x, y, Math.min(W, p.x1 + pad + 1) - x, Math.min(H, p.y1 + pad + 1) - y];
};

const scene = { size: [W, H], fill: FILL, ink: INK, line: LINE - 4, eyes: eyes.map((p) => [Math.round(p.cx), Math.round(p.cy), Math.round(Math.sqrt(p.n / Math.PI))]), legs: [], arm: null };
await save('body', body);
for (const [n, p] of two.entries()) {
    const only = Buffer.alloc(N * 4), id = legParts.list.indexOf(p);
    for (let i = 0; i < N; i++) if (legParts.label[i] === id || (legs[i * 4 + 3] && legs[i * 4 + 3] <= 100 && nearTo(i, id))) legs.copy(only, i * 4, i * 4, i * 4 + 4);
    const box = boxOf(p);
    await save(`leg${n}`, only, box);
    scene.legs.push({ box, ...ends(p) });
}
const armPart = parts(arm).list.sort((a, b) => b.n - a.n)[0];
const armBox = boxOf(armPart);
await save('arm', armPicture, armBox);
scene.arm = { box: armBox, shoulder: [Math.round((armPart.x0 + armPart.x1) / 2) - 10, armPart.y0], hand: [armPart.x1 - 6, armPart.y1] };

// The soft edge of a leg: a faint pixel next to one of that leg's
function nearTo(i, id) {
    const x = i % W, y = (i / W) | 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const X = x + dx, Y = y + dy;
        if (X >= 0 && Y >= 0 && X < W && Y < H && legParts.label[Y * W + X] === id) return true;
    }
    return false;
}

await writeFile(path.join(target, 'sid.json'), JSON.stringify(scene, null, 1) + '\n');
console.log(JSON.stringify(scene));
