// The layers of Celebración as exported (originales/celebracion/Celebracion-N.png, 3240px, scaled here to the 2160 square
// of the other scenes) -> public/assets/celebracion/*.webp, each cropped to its own box, and
// src/composables/celebracionScene.json, all in px of the 2160 square:
//   boxes    the box of every picture
//   sky      the sky is not a picture (no layer draws it: it is the card's colour behind everything); its colour
//   ground   nor is the flat blue of the ground (in 2, under the trees): its colour and the top edge of it, [x, y] every
//            STEP px across, so the scene fills it in code under the marks and can carry it on past the frame
//   stars    the stars (1), every dot as [x, y, radius]
//   glows    the stippled yellow light of the little glowing mushrooms (the loose dots of 2) as [x, y, radius]
//   lamps    the five lamp flowers of the fern: their yellow middle as a disc [x, y, r] (5's solid blobs), drawn in code,
//            and their stippled halo as dots [x, y, radius] (the rest of 5)
//   branch   where the left tree's branch leaves the frame on the left: [y of its middle, the angle it rises at]
//   eyes     the open eyes of the Sama standing on the left, cut out of his lines so he can blink
//   fire     where the flame stands on the logs ([x, y], the middle of its base)
// Pictures: the two trees (the pink of 2 and the lines of 3 round it), the marks of the ground (2 without its flat blue,
// its pink and its stipple, with the lines of 3 that are not the trees': the horizon, the rocks, the tufts, the little
// mushrooms; the stacked stones by the right tree on their own), the fern (4), the stems of the lamps with their rings (6), the logs (11, 12), the flame (14) and its yellow
// heart (15) apart so they flicker each on its own, and every being round the fire on its own (for the game of Fluir:
// a spark of the fire goes round them): the three Samas (21 + 23, 40-47, 16-18 with his staff), the two foxes, the two
// cats, the pink trio and the one on its own, the little hairy ones, the mushrooms, the jar and the cup.
// Not converted: 13 (the dark outline of the flame, hidden under its pink in the card) and the cyan squiggle among the
// stars of 1 (a stroke, not a star) and the Algo Particular mark in the ground at the bottom right (in 3: a signature,
// not part of the scene). The card has no rulito; when the verb is played it is drawn in code. The originals are not kept in the repo once converted.
// Usage: node scripts/convert-celebracion.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'originales', 'celebracion');
const target = path.join(root, 'public', 'assets', 'celebracion');
const file = (n) => path.join(source, `Celebracion-${n}.png`);
const S = 2160;
const N = S * S;
const PAD = 4;
const SOLID = 110;
const STEP = 8;
const LOGO = [1950, 2000, 105, 95];       // the Algo Particular mark drawn in the ground (a signature): not converted
const CAIRN = [1948, 930, 135, 164];     // the box of the stacked stones (above the rock they stand on)

// The beings and things round the fire, each a picture of one or more layers (drawn in this order). 41 holds the fills
// of the jar and of the bowl in the seated Sama's hand: it is split by where they are ('jarFill', 'bowlFill')
const pictures = {
    logs: [11, 12], flame: [14], heart: [15],
    catBack: [34, 35], seated: [40, 'bowlFill', 42, 43, 44, 45, 46, 47], jar: ['jarFill', 48],
    trio: [26, 27, 28, 29], cup: [30, 31], pink: [32, 33], spark: [9, 10],
    samaRight: [16, 17, 18], foxRight: [19, 20],
    catFront: [7, 8], mushrooms: [36, 37], hairy: [38, 39], foxLeft: [22, 24, 25], samaLeft: [21, 23],
    fern: [4], stems: [6],
};

const cache = new Map();
const load = async (n) => {
    if (!cache.has(n)) cache.set(n, (await sharp(file(n)).resize(S, S).ensureAlpha().raw().toBuffer()));
    return cache.get(n);
};
const blank = () => Buffer.alloc(N * 4);
const webp = (img, big) => img.webp({ quality: big ? 84 : 88, alphaQuality: big ? 70 : 85, effort: 6 });
// The big pictures of the land are shipped at three quarters of the 2160 square (the scene draws them in their full box):
// soft line work and flat colour, they lose nothing a screen shows, and they are most of the weight
const BIG = new Set(['fern', 'marks', 'stems', 'treeLeft', 'treeRight']);
const SHRINK = 0.75;
const hex = (r, g, b) => (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);

// a over b (straight alpha), in place in b
const over = (top, bottom) => {
    for (let i = 0; i < N; i++) {
        const a = top[i * 4 + 3] / 255;
        if (a === 0) continue;
        const b = bottom[i * 4 + 3] / 255;
        const out = a + b * (1 - a);
        for (let c = 0; c < 3; c++) bottom[i * 4 + c] = Math.round((top[i * 4 + c] * a + bottom[i * 4 + c] * b * (1 - a)) / out);
        bottom[i * 4 + 3] = Math.round(out * 255);
    }
    return bottom;
};
const only = (data, keep) => {
    const out = Buffer.from(data);
    for (let i = 0; i < N; i++) if (!keep(i)) out[i * 4 + 3] = 0;
    return out;
};

const boxOf = (data) => {
    let x0 = S, y0 = S, x1 = -1, y1 = -1;
    for (let i = 0; i < N; i++) {
        if (data[i * 4 + 3] < 4) continue;
        const x = i % S, y = (i - x) / S;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
    }
    x0 = Math.max(0, x0 - PAD); y0 = Math.max(0, y0 - PAD);
    x1 = Math.min(S - 1, x1 + PAD); y1 = Math.min(S - 1, y1 + PAD);
    return [x0, y0, x1 - x0 + 1, y1 - y0 + 1];
};

// Every blob of solid pixels (that `keep` lets in): its pixels, area, centre and box
const blobsOf = (data, keep = () => true, solidAt = SOLID) => {
    const seen = new Uint8Array(N);
    const blobs = [];
    const stack = [];
    const solid = (i) => data[i * 4 + 3] >= solidAt && keep(i);
    for (let start = 0; start < N; start++) {
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

// A mask grown by r px (a square)
const grow = (mask, r) => {
    const tmp = new Uint8Array(N), out = new Uint8Array(N);
    for (let y = 0; y < S; y++) {
        let last = -1e9;
        for (let x = 0; x < S; x++) { if (mask[y * S + x]) last = x; if (x - last <= r) tmp[y * S + x] = 1; }
        last = 1e9;
        for (let x = S - 1; x >= 0; x--) { if (mask[y * S + x]) last = x; if (last - x <= r) tmp[y * S + x] = 1; }
    }
    for (let x = 0; x < S; x++) {
        let last = -1e9;
        for (let y = 0; y < S; y++) { if (tmp[y * S + x]) last = y; if (y - last <= r) out[y * S + x] = 1; }
        last = 1e9;
        for (let y = S - 1; y >= 0; y--) { if (tmp[y * S + x]) last = y; if (last - y <= r) out[y * S + x] = 1; }
    }
    return out;
};

const save = async (name, data, scene) => {
    const box = boxOf(data);
    const big = BIG.has(name);
    let img = sharp(data, { raw: { width: S, height: S, channels: 4 } }).extract({ left: box[0], top: box[1], width: box[2], height: box[3] });
    if (big) img = sharp(await img.png().toBuffer()).resize(Math.round(box[2] * SHRINK), Math.round(box[3] * SHRINK));
    await webp(img, big).toFile(path.join(target, `${name}.webp`));
    scene.boxes[name] = box;
};

await mkdir(target, { recursive: true });
const scene = { size: S, boxes: {}, sky: 0x1e5da5, ground: { color: 0, edge: [] }, stars: [], glows: [], lamps: [], eyes: null, fire: null };

// ---- The land (2 and 3): the flat blue goes to code, the pink is the trees, the loose yellow dots are particles
const land = await load(2);
const lines = await load(3);
const px = (d, i) => [d[i * 4], d[i * 4 + 1], d[i * 4 + 2], d[i * 4 + 3]];
const pink = (i) => { const [r, g, b, a] = px(land, i); return a > 8 && r > 200 && b > 140 && r - g > 25; };
const yellow = (i) => { const [r, g, b, a] = px(land, i); return a > 8 && r > 200 && g > 170 && b < 170; };
const FILL = [0x69, 0xb8, 0xe2];
const flat = (i) => { const [r, g, b, a] = px(land, i); return a > 250 && Math.abs(r - FILL[0]) + Math.abs(g - FILL[1]) + Math.abs(b - FILL[2]) < 14; };
scene.ground.color = hex(...FILL);

// The yellow of 2: the solid parts (the caps of little mushrooms, a little light behind a tree) stay drawn, what is
// left is the stipple round them, which is dots: solid is what is still yellow 4 px in from every side
const isYellow = new Uint8Array(N);
for (let i = 0; i < N; i++) if (yellow(i) && land[i * 4 + 3] > 200) isYellow[i] = 1;
const notYellow = new Uint8Array(N);
for (let i = 0; i < N; i++) notYellow[i] = isYellow[i] ? 0 : 1;
const core = grow(notYellow, 4);
const caps = new Uint8Array(N);
for (let i = 0; i < N; i++) if (!core[i]) caps[i] = 1;
const capsNear = grow(caps, 6);
const stipple = (i) => yellow(i) && !capsNear[i];
for (let y = 0; y < S; y += 4) {
    for (let x = 0; x < S; x += 4) {
        const i = y * S + x;
        if (!stipple(i)) continue;
        const a = land[i * 4 + 3] / 255;
        if (Math.random() > a * 0.8) continue;
        scene.glows.push([x + Math.round((Math.random() - 0.5) * 4), y + Math.round((Math.random() - 0.5) * 4), +(1.6 + Math.random() * 1.4).toFixed(1)]);
    }
}

// The trees: the pink of 2, with the lines of 3 that are round it; one picture for each tree
const treeMask = new Uint8Array(N);
for (let i = 0; i < N; i++) if (pink(i)) treeMask[i] = 1;
const treeNear = grow(treeMask, 18);
for (const [name, left] of [['treeLeft', true], ['treeRight', false]]) {
    const side = (i) => ((i % S) < S / 2) === left;
    const fill = only(land, (i) => treeMask[i] && side(i));
    const lineWork = only(lines, (i) => treeNear[i] && side(i) && (i / S) < 1300);
    await save(name, over(lineWork, fill), scene);
}
// Where the left tree's branch leaves the frame, and the way it goes: [y of its middle at the edge, angle (deg, up to
// the left)], so the scene can carry it on past the frame
{
    const tree = only(land, (i) => treeMask[i] && (i % S) < S / 2);
    const middle = (x) => {
        let y0 = -1, y1 = -1;
        for (let y = 0; y < 600; y++) if (tree[(y * S + x) * 4 + 3] > 128) { if (y0 < 0) y0 = y; y1 = y; } else if (y0 >= 0) break;
        return y0 < 0 ? null : (y0 + y1) / 2;
    };
    const a = middle(2), b = middle(80);
    scene.branch = a === null || b === null ? null : [Math.round(a), +(Math.atan2(b - a, 78) * 180 / Math.PI).toFixed(1)];
}
// The marks of the ground: what is left of 2 (the strokes, the rocks, the caps) and of 3
{
    const marks = only(land, (i) => !treeMask[i] && !flat(i) && !stipple(i) && land[i * 4 + 3] > 8);
    const rest = only(lines, (i) => !(treeNear[i] && (i / S) < 1300));
    const all = over(rest, marks);
    // The stones stacked on the rock by the right tree are a picture of their own: the marks are mirrored past the
    // frame, and two stacks side by side would show the mirror
    const stack = (i) => { const x = i % S, y = (i - x) / S; return x >= CAIRN[0] && x < CAIRN[0] + CAIRN[2] && y >= CAIRN[1] && y < CAIRN[1] + CAIRN[3]; };
    await save('cairn', only(all, stack), scene);
    // (a few stray specks high in the sky of 3 are not marks of the ground)
    const logo = (i) => { const x = i % S, y = (i - x) / S; return x >= LOGO[0] && x < LOGO[0] + LOGO[2] && y >= LOGO[1] && y < LOGO[1] + LOGO[3]; };
    await save('marks', only(all, (i) => !stack(i) && !logo(i) && i / S > 880), scene);
}
// The top edge of the flat blue (the rocks on it are drawn over it); under the trees, carried across
{
    const ground = (i) => land[i * 4 + 3] > 128 && !pink(i) && !yellow(i);
    const edge = [];
    for (let x = 0; x < S; x += STEP) {
        let top = -1;
        for (let y = 900; y < S; y++) if (ground(y * S + x)) { top = y; break; }
        edge.push([x, top]);
    }
    // Under a tree, a rock or the stacked stones the top is not the ground's: there the edge is carried across from
    // either side (what covers it is drawn over it; and past the frame, mirrored, nothing is left standing up)
    const tops = edge.filter(([, y]) => y > 0).map(([, y]) => y).sort((a, b) => a - b);
    const horizon = tops[Math.floor(tops.length / 2)];
    for (const e of edge) if (e[1] < 0 || Math.abs(e[1] - horizon) > 24) e[1] = -1;
    for (let k = 0; k < edge.length; k++) {
        if (edge[k][1] >= 0) continue;
        let a = k - 1, b = k + 1;
        while (a >= 0 && edge[a][1] < 0) a--;
        while (b < edge.length && edge[b][1] < 0) b++;
        const ya = a >= 0 ? edge[a][1] : edge[b][1], yb = b < edge.length ? edge[b][1] : ya;
        edge[k][1] = Math.round(ya + (yb - ya) * (a >= 0 && b < edge.length ? (k - a) / (b - a) : 0));
    }
    edge.push([S, edge[edge.length - 1][1]]);
    scene.ground.edge = edge;
}

// ---- The stars (1): every dot; the one stroke among them is not a star
{
    const data = await load(1);
    for (const b of blobsOf(data, () => true, 60)) {
        const [x0, y0, x1, y1] = b.box;
        const long = Math.max(x1 - x0, y1 - y0) + 1;
        if (b.area > 40 && long * long > b.area * 4) continue;
        scene.stars.push([Math.round(b.x), Math.round(b.y), +Math.max(1.5, Math.sqrt(b.area / Math.PI)).toFixed(1)]);
    }
}

// ---- The lamps (5): the solid middles are discs, the rest of the layer (the stipple round them) dots of each
{
    const data = await load(5);
    const blobs = blobsOf(data, () => true, 200);
    const middles = blobs.filter((b) => b.area > 1200).slice(0, 5);
    // (the stipple that touches a middle is part of its blob: the disc is the one of its area, about its centre)
    // the biggest circle about its centre that is (almost) all solid, a little bigger to go under the ring of 6
    const inscribed = (b) => {
        const mine = new Set(b.pixels);
        let r = 6;
        for (; r < 200; r += 1) {
            let inside = 0;
            for (let a = 0; a < 360; a += 6) if (mine.has(Math.round(b.y + Math.sin(a * Math.PI / 180) * r) * S + Math.round(b.x + Math.cos(a * Math.PI / 180) * r))) inside++;
            if (inside / 60 < 0.95) break;
        }
        return r;
    };
    scene.lamps = middles.sort((a, b) => a.x - b.x).map((b) => ({ x: Math.round(b.x), y: Math.round(b.y), r: inscribed(b) + 4, dots: [] }));
    const near = (x, y) => scene.lamps.some((l) => Math.hypot(l.x - x, l.y - y) < l.r + 2);
    for (let y = 0; y < S; y += 3) {
        for (let x = 0; x < S; x += 3) {
            const i = y * S + x;
            const a = data[i * 4 + 3] / 255;
            if (a < 0.1 || near(x, y) || Math.random() > a * 0.75) continue;
            const lamp = scene.lamps.reduce((best, l, k) => (Math.hypot(l.x - x, l.y - y) < Math.hypot(scene.lamps[best].x - x, scene.lamps[best].y - y) ? k : best), 0);
            scene.lamps[lamp].dots.push([x + Math.round((Math.random() - 0.5) * 3), y + Math.round((Math.random() - 0.5) * 3), +(1.4 + Math.random() * 1.2).toFixed(1)]);
        }
    }
}

// ---- The beings and things round the fire
{
    const fills = await load(41);
    const split = (i) => (i % S) < 560;
    const parts = { jarFill: only(fills, split), bowlFill: only(fills, (i) => !split(i)) };
    // The open eyes of the Sama on the left, out of his lines (23): two round dots in his face
    const face = await load(23);
    const eyes = blobsOf(face, (i) => { const x = i % S, y = (i - x) / S; return x > 220 && x < 400 && y > 1320 && y < 1460; })
        .filter((b) => b.area > 80 && b.area < 2000);
    const eyeMask = new Uint8Array(N);
    eyes.forEach((b) => b.pixels.forEach((i) => { eyeMask[i] = 1; }));
    const eyeNear = grow(eyeMask, 3);
    parts.eyesLeft = only(face, (i) => eyeNear[i]);
    cache.set(23, only(face, (i) => !eyeNear[i]));
    await save('eyesLeft', parts.eyesLeft, scene);
    scene.eyes = eyes.length;

    for (const [name, layers] of Object.entries(pictures)) {
        const out = blank();
        for (const n of layers) over(typeof n === 'number' ? await load(n) : parts[n], out);
        await save(name, out, scene);
    }
    // Where the flame stands: the middle of its base
    const [x, y, w, h] = scene.boxes.flame;
    scene.fire = [Math.round(x + w / 2), y + h];
}

await writeFile(path.join(root, 'src', 'composables', 'celebracionScene.json'), JSON.stringify(scene));
console.log(Object.keys(scene.boxes).length, 'pictures;', scene.stars.length, 'stars;', scene.glows.length, 'glow dots;',
    scene.lamps.map((l) => `lamp ${l.x},${l.y} r${l.r} ${l.dots.length} dots`).join('; '), '; eyes', scene.eyes, '; fire', scene.fire,
    '; ground edge', scene.ground.edge.length, 'points; branch', scene.branch);
