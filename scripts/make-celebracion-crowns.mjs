// Crowns for the two pink trees of Celebración. The card cuts them at its top edge, and on a phone held upright the
// stage has a lot of sky over the card: the trunks used to go on up to the top of the screen as their first rows
// stretched, straight columns. Now each tree ends in a crown, borrowed from Belleza, whose pink trees are drawn the same
// way (a trunk that forks into branches cut flat, each with a shelf of leaves on it): each trunk gets the crown of one of
// Belleza's two big trees (the left tree the left one, the right tree the right one, so they are not twins), scaled so its
// trunk is as wide as Celebración's where the card cuts it, and recoloured to Celebración's pink, line and bark marks; each
// thin branch the card cuts goes on a little the way it goes and ends flat with a shelf of leaves, as Belleza's do.
// (The left tree's branch that leaves the card on the left still goes on as before: it is off the screen on a phone.)
//
// Reads Belleza's exported layers (originales/belleza/Destinados_3-N.png, 3240px: leaves 6, fills 8, bark 9, lines 10;
// in the git history from commit 0579ee8) and Celebración's trees (public/assets/celebracion/treeLeft.webp,
// treeRight.webp); writes public/assets/celebracion/crownLeft.webp, crownRight.webp, tipLeft.webp and tipRight.webp
// (at three quarters of their box, as the trees) and their boxes into src/composables/celebracionScene.json (in px of the
// 2160 square; their tops are above the card, negative). Run it after scripts/convert-celebracion.mjs, which writes that
// JSON anew. Usage: node scripts/make-celebracion-crowns.mjs
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const belleza = (n) => path.join(root, 'originales', 'belleza', `Destinados_3-${n}.png`);
const target = path.join(root, 'public', 'assets', 'celebracion');
const sceneFile = path.join(root, 'src', 'composables', 'celebracionScene.json');
const B = 3240;                 // Belleza's layers
const STORE = 0.75;             // the land's pictures are shipped at three quarters of their box
const OVERLAP = 6;              // art px a crown or a tip reaches down behind its tree, so no seam shows
const FADE = 24;                // art px over which a crown's foot fades into its trunk's top row

// ---- Celebración's colours (its trees) and Belleza's, for the recolouring
const FROM = { fill: [243, 179, 162], line: [56, 80, 157], bark: [207, 135, 154], leaf: [139, 204, 167] };
const TO = { fill: [239, 156, 166], line: [72, 67, 108], bark: [252, 210, 228], leaf: [139, 204, 167] };

// ---- Which of Belleza's trees, and what of it: a point on its trunk, the row where its crown is cut (its trunk is one
// piece there), and what else to leave out (the branches of the trees behind it, which touch it)
const CROWNS = {
    left: { seed: [525, 880], cut: 900, allow: (x, y) => x < 1150 && (y <= 700 || x < 720) && (y <= 820 || x > 300) },
    right: { seed: [2700, 700], cut: 800, allow: (x, y) => x >= 1960 && (y <= 560 || x < 2935) },
};
// Where Belleza's canopy leaves go over the card (art px): the highest at CANOPY_TOP, the rest under it, their spread
// in height squeezed so they stay in the roof
const CANOPY_TOP = -420, CANOPY_SQUEEZE = 0.75;
// A shelf of leaves for the tips of the branches: the one at this point of Belleza's leaves (6)
const SHELF = [2945, 225];

// ---- Pixels
const loadRaw = async (file) => {
    const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    return { data, w: info.width, h: info.height };
};
// Grow a mask by r px (a square): any set pixel within r of it
const dilate = (mask, w, h, r) => {
    const sum = new Int32Array((w + 1) * (h + 1));
    for (let y = 0; y < h; y++) {
        let row = 0;
        for (let x = 0; x < w; x++) {
            row += mask[y * w + x];
            sum[(y + 1) * (w + 1) + x + 1] = sum[y * (w + 1) + x + 1] + row;
        }
    }
    const out = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
        const y0 = Math.max(0, y - r), y1 = Math.min(h, y + r + 1);
        for (let x = 0; x < w; x++) {
            const x0 = Math.max(0, x - r), x1 = Math.min(w, x + r + 1);
            const s = sum[y1 * (w + 1) + x1] - sum[y0 * (w + 1) + x1] - sum[y1 * (w + 1) + x0] + sum[y0 * (w + 1) + x0];
            if (s > 0) out[y * w + x] = 1;
        }
    }
    return out;
};
// The pixels joined to the starting ones through `inside`
const flood = (inside, w, h, starts) => {
    const seen = new Uint8Array(w * h);
    const queue = new Int32Array(w * h);
    let head = 0, tail = 0;
    starts.forEach((i) => { if (inside(i) && !seen[i]) { seen[i] = 1; queue[tail++] = i; } });
    while (head < tail) {
        const i = queue[head++], x = i % w;
        for (const j of [i - w, i + w, x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1]) {
            if (j < 0 || j >= w * h || seen[j] || !inside(j)) continue;
            seen[j] = 1;
            queue[tail++] = j;
        }
    }
    return seen;
};
// Recolour Belleza's pink, lines and bark to Celebración's (each pixel by how near it is to each of Belleza's colours)
const recolour = (data) => {
    const keys = Object.keys(FROM);
    for (let i = 0; i < data.length; i += 4) {
        if (!data[i + 3]) continue;
        let total = 0;
        const mix = [0, 0, 0];
        keys.forEach((k) => {
            const [r, g, b] = FROM[k];
            const d2 = (data[i] - r) ** 2 + (data[i + 1] - g) ** 2 + (data[i + 2] - b) ** 2;
            const wgt = Math.exp(-d2 / (2 * 16 ** 2)) + 1e-9;   // narrow: Belleza's pink becomes exactly Celebración's
            total += wgt;
            for (let c = 0; c < 3; c++) mix[c] += wgt * (TO[k][c] + (data[i + c] - FROM[k][c]) * (k === 'fill' ? 0 : 0.5));
        });
        for (let c = 0; c < 3; c++) data[i + c] = Math.max(0, Math.min(255, Math.round(mix[c] / total)));
    }
};
// "over", straight alpha, of one layer's pixel into a buffer
const over = (out, o, src, s) => {
    const fa = src[s + 3] / 255;
    if (!fa) return;
    const ba = out[o + 3] / 255, ra = fa + ba * (1 - fa);
    for (let c = 0; c < 3; c++) out[o + c] = Math.round((src[s + c] * fa + out[o + c] * ba * (1 - fa)) / ra);
    out[o + 3] = Math.round(ra * 255);
};
const runsOf = (alpha, w, y, at = 128) => {
    const runs = [];
    let start = -1;
    for (let x = 0; x <= w; x++) {
        const on = x < w && alpha(y * w + x) >= at;
        if (on && start < 0) start = x;
        if (!on && start >= 0) { runs.push([start, x - 1]); start = -1; }
    }
    return runs;
};

// ---- Belleza's layers
const [leaves, fills, bark, lines] = await Promise.all([6, 8, 9, 10].map((n) => loadRaw(belleza(n))));
const N = B * B;
const isFill = (i) => fills.data[i * 4 + 3] > 128 || bark.data[i * 4 + 3] > 128;
const isLeaf = (i) => leaves.data[i * 4 + 3] > 20;

// One of Belleza's crowns, cut out, recoloured: its pixels, size, and where its trunk is on its bottom row
const crownOf = ({ seed, cut, allow }) => {
    const ok = (i) => { const x = i % B, y = (i - x) / B; return y < cut && allow(x, y); };
    const trunk = flood((i) => ok(i) && isFill(i), B, B, [seed[1] * B + seed[0]]);
    const near = dilate(trunk, B, B, 48);
    // the shelves of leaves that touch it, whole, and the lines round them
    const touching = [];
    for (let i = 0; i < N; i++) if (near[i] && isLeaf(i) && ok(i)) touching.push(i);
    const shelf = flood((i) => isLeaf(i) && ok(i), B, B, touching);
    const nearShelf = dilate(shelf, B, B, 16);
    const fillNear = dilate(trunk, B, B, 3);
    const out = Buffer.alloc(N * 4);
    for (let i = 0; i < N; i++) {
        const y = (i - (i % B)) / B;
        if (y >= cut) continue;
        const o = i * 4;
        if (shelf[i]) over(out, o, leaves.data, o);
        if (fillNear[i] && ok(i)) { over(out, o, fills.data, o); over(out, o, bark.data, o); }
        if ((near[i] && ok(i)) || nearShelf[i]) over(out, o, lines.data, o);
    }
    recolour(out);
    // its box, and its trunk on the bottom row (lines included)
    let x0 = B, y0 = B, x1 = -1, y1 = -1;
    for (let i = 0; i < N; i++) {
        if (out[i * 4 + 3] < 4) continue;
        const x = i % B, y = (i - x) / B;
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    // its trunk on the bottom row: the pink only (Belleza draws a thick line on one side, Celebración a thin one)
    const stump = runsOf((i) => (trunk[i] ? 255 : 0), B, cut - 1).sort((a, b) => (b[1] - b[0]) - (a[1] - a[0]))[0];
    return { out, x0, y0, x1, y1: cut - 1, stump };
};

// A shelf of leaves, with its line, cut out and recoloured
const shelfOf = ([sx, sy]) => {
    const shelf = flood(isLeaf, B, B, [sy * B + sx]);
    const nearShelf = dilate(shelf, B, B, 30);
    const out = Buffer.alloc(N * 4);
    let x0 = B, y0 = B, x1 = -1, y1 = -1;
    for (let i = 0; i < N; i++) {
        if (!nearShelf[i]) continue;
        const o = i * 4;
        if (shelf[i]) over(out, o, leaves.data, o);
        // only the line under the leaves (its shadow), not the branch below them
        if (!fills.data[o + 3] && !bark.data[o + 3]) over(out, o, lines.data, o);
        if (out[o + 3] < 4) continue;
        const x = i % B, y = (i - x) / B;
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    recolour(out);
    return { out, x0, y0, x1, y1 };
};

const crop = (buf, w, [x0, y0, x1, y1]) => sharp(buf, { raw: { width: w, height: buf.length / 4 / w, channels: 4 } })
    .extract({ left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 });
const webp = (img) => img.webp({ quality: 86, alphaQuality: 80, effort: 6 });

// ---- Celebración
const scene = JSON.parse(await readFile(sceneFile, 'utf8'));
const shelf = shelfOf(SHELF);
const shelfPng = await crop(shelf.out, B, [shelf.x0, shelf.y0, shelf.x1, shelf.y1]).png().toBuffer();
const shelfW = shelf.x1 - shelf.x0 + 1, shelfH = shelf.y1 - shelf.y0 + 1;

for (const side of ['left', 'right']) {
    const name = side === 'left' ? 'treeLeft' : 'treeRight';
    const [bx, by] = scene.boxes[name];
    const tree = await loadRaw(path.join(target, `${name}.webp`));
    const alpha = (i) => tree.data[i * 4 + 3];
    // Where the card cuts it, in art px: its trunk (the widest) and its thin branch (the other one at the top)
    const top = runsOf(alpha, tree.w, 0).map(([a, b]) => [a / STORE, (b + 1) / STORE]);
    const [trunk, branch] = top.sort((a, b) => (b[1] - b[0]) - (a[1] - a[0]));

    // The crown, on the trunk: scaled so its pink is as wide as the trunk's where the card cuts it, and its foot fading
    // into the trunk's own top row carried up a little, so the two ways of drawing the line meet without a step
    const pinkAt = (x) => { const o = x * 4; return tree.data[o + 3] > 200 && tree.data[o] > 200 && tree.data[o + 1] > 120; };
    let p0 = Math.round(trunk[1] * STORE), p1 = Math.round(trunk[0] * STORE);
    for (let x = Math.floor(trunk[0] * STORE); x < Math.ceil(trunk[1] * STORE); x++) if (pinkAt(x)) { p0 = Math.min(p0, x); p1 = Math.max(p1, x); }
    const pinkRow = [p0 / STORE, (p1 + 1) / STORE];                    // the trunk's pink from side to side (art px)
    const c = crownOf(CROWNS[side]);
    const k = (pinkRow[1] - pinkRow[0]) / (c.stump[1] - c.stump[0] + 1);   // Belleza px -> art px
    const box = [
        Math.round(bx + pinkRow[0] - (c.stump[0] - c.x0) * k), Math.round(by - (c.y1 + 1 - c.y0) * k + OVERLAP),
        Math.round((c.x1 + 1 - c.x0) * k), Math.round((c.y1 + 1 - c.y0) * k),
    ];
    const cw = Math.round(box[2] * STORE), ch = Math.round(box[3] * STORE);
    const crown = await crop(c.out, B, [c.x0, c.y0, c.x1, c.y1]).resize(cw, ch, { kernel: 'lanczos3' }).raw().toBuffer();
    const FOOT = Math.round(FADE * STORE), foot = ch - Math.round(OVERLAP * STORE);   // the row of the card's edge
    const t0 = trunk[0] * STORE, t1 = trunk[1] * STORE;                 // the trunk at the edge, in the tree's px
    const toCrown = (tx) => Math.round((bx + tx / STORE - box[0]) * STORE);
    // In each row of the foot, the crown's trunk from side to side (the run of it round the trunk's middle)
    const mid = toCrown((t0 + t1) / 2);
    const sides = (y) => {
        const on = (x) => crown[(y * cw + x) * 4 + 3] > 100;
        let a = mid, b = mid;
        if (!on(mid)) return [toCrown(t0), toCrown(t1)];
        while (a > 0 && on(a - 1)) a--;
        while (b < cw - 1 && on(b + 1)) b++;
        return [a, b];
    };
    const under = Buffer.alloc(cw * ch * 4);
    const footTop = Math.max(0, foot - FOOT);
    for (let y = footTop; y < ch; y++) {
        const src = Math.max(0, y - foot);                              // the trunk's own rows under the edge
        // from the trunk's edges at the card's edge to the crown's trunk at the top of the foot
        const t = Math.max(0, Math.min(1, (foot - y) / FOOT)), [ca, cb] = sides(Math.max(footTop, Math.min(y, foot)));
        const e0 = toCrown(t0) + (ca - toCrown(t0)) * t, e1 = toCrown(t1) + (cb - toCrown(t1)) * t;
        for (let x = Math.floor(e0); x <= Math.ceil(e1); x++) {
            if (x < 0 || x >= cw) continue;
            const tx = Math.round(t0 + (x - e0) / Math.max(1, e1 - e0) * (t1 - t0));
            if (tx < 0 || tx >= tree.w) continue;
            over(under, (y * cw + x) * 4, tree.data, (src * tree.w + tx) * 4);
        }
    }
    // the crown: whole above its foot, fading into the trunk down to the edge (only over the trunk: what is beside it,
    // a shelf or a branch, stays whole)
    const [fa, fb] = [Math.min(toCrown(t0), sides(footTop)[0]) - 4, Math.max(toCrown(t1), sides(footTop)[1]) + 4];
    for (let y = footTop; y < ch; y++) {
        const keep = Math.max(0, Math.min(1, (foot - y) / FOOT));
        for (let x = Math.max(0, fa); x <= Math.min(cw - 1, fb); x++) crown[(y * cw + x) * 4 + 3] = Math.round(crown[(y * cw + x) * 4 + 3] * keep);
    }
    for (let i = 0; i < cw * ch; i++) over(under, i * 4, crown, i * 4);
    await webp(sharp(under, { raw: { width: cw, height: ch, channels: 4 } }))
        .toFile(path.join(target, `crown${side === 'left' ? 'Left' : 'Right'}.webp`));
    scene.boxes[`crown${side === 'left' ? 'Left' : 'Right'}`] = box;

    // The tip, on the thin branch: it goes on the way it goes (its top rows, moved along its slope) and ends flat, with a
    // shelf of leaves on it
    const deep = Math.round(60 * STORE);
    const at = (y) => runsOf(alpha, tree.w, y).map(([a, b]) => (a + b) / 2)
        .reduce((best, m) => (Math.abs(m - (branch[0] + branch[1]) / 2 * STORE) < Math.abs(best - (branch[0] + branch[1]) / 2 * STORE) ? m : best), Infinity);
    const slope = (at(0) - at(deep)) / deep;                           // px across for every px up
    const width = (branch[1] - branch[0]) * STORE;
    const rise = Math.round(width * 1.7);                               // how far it goes on (storage px)
    const sw = Math.round(width * 2.8), sh = Math.round(shelfH * sw / shelfW);
    const reach = Math.ceil(Math.abs(slope) * rise);
    const W = Math.ceil(Math.max(sw, width + reach + sw / 2) + 8), H = rise + Math.round(sh * 0.55) + Math.round(OVERLAP * STORE);
    const tip = Buffer.alloc(W * H * 4);
    const left0 = Math.floor(branch[0] * STORE) - 2, right0 = Math.ceil(branch[1] * STORE) + 2;
    // where the branch's top row lands in the tip: at its bottom, from this x
    const ox = slope > 0 ? 4 : W - 4 - (right0 - left0) - reach;
    const baseY = H - Math.round(OVERLAP * STORE);
    for (let y = 0; y < H; y++) {
        const up = baseY - y;                                           // px above the card's edge
        const src = up > 0 ? 0 : Math.min(tree.h - 1, -up);             // under the edge: the tree itself (the overlap)
        const shift = Math.round(Math.max(0, up) * slope);
        if (up > rise) continue;
        for (let x = left0; x <= right0; x++) {
            const s = (src * tree.w + x) * 4, tx = ox + (x - left0) + shift + (slope > 0 ? 0 : reach);
            if (tx < 0 || tx >= W) continue;
            over(tip, (y * W + tx) * 4, tree.data, s);
        }
    }
    // the shelf, centred on the end of the branch
    const endX = ox + (right0 - left0) / 2 + Math.round(rise * slope) + (slope > 0 ? 0 : reach);
    const shelfImg = await sharp(shelfPng).resize(sw, sh, { kernel: 'lanczos3' }).raw().toBuffer();
    const sx0 = Math.round(endX - sw / 2), sy0 = baseY - rise - Math.round(sh * 0.55);
    for (let y = 0; y < sh; y++) {
        for (let x = 0; x < sw; x++) {
            const tx = sx0 + x, ty = sy0 + y;
            if (tx < 0 || tx >= W || ty < 0 || ty >= H) continue;
            over(tip, (ty * W + tx) * 4, shelfImg, (y * sw + x) * 4);
        }
    }
    const tipBox = [
        Math.round(bx + (left0 - ox - (slope > 0 ? 0 : reach)) / STORE), Math.round(by - H / STORE + OVERLAP),
        Math.round(W / STORE), Math.round(H / STORE),
    ];
    await webp(sharp(tip, { raw: { width: W, height: H, channels: 4 } }))
        .toFile(path.join(target, `tip${side === 'left' ? 'Left' : 'Right'}.webp`));
    scene.boxes[`tip${side === 'left' ? 'Left' : 'Right'}`] = tipBox;
    console.log(side, 'crown', box, 'scale', k.toFixed(2), 'tip', tipBox, 'slope', slope.toFixed(2));
}

// The roof of leaves over them: Belleza's free leaves of the canopy (its atlas, public/assets/belleza/canopy.webp, and
// where they are, bellezaScene.json), their lines recoloured to Celebración's, laid over the card (art px, above its
// top): the scene draws them on a canopy of its own on a phone, where the trunks go up into it
const bel = JSON.parse(await readFile(path.join(root, 'src', 'composables', 'bellezaScene.json'), 'utf8'));
const atlas = await loadRaw(path.join(root, 'public', 'assets', 'belleza', 'canopy.webp'));
recolour(atlas.data);
await webp(sharp(atlas.data, { raw: { width: atlas.w, height: atlas.h, channels: 4 } })).toFile(path.join(target, 'canopy.webp'));
const top = Math.min(...bel.canopy.map(([, y]) => y));
scene.canopy = bel.canopy.map(([x, y, w, h, ax, ay]) => [x, Math.round(CANOPY_TOP + (y - top) * CANOPY_SQUEEZE), w, h, ax, ay]);
scene.canopyAtlas = [atlas.w, atlas.h];
console.log('canopy', scene.canopy.length, 'leaves');

await writeFile(sceneFile, JSON.stringify(scene));
