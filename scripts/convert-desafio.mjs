// The layers of Desafío as exported (originales/desafio/Laberinto_1-N.png, 2160px) -> public/assets/desafio/*.webp, each
// cropped to its own box, and src/composables/desafioScene.json, all in px of the 2160 square:
//   boxes      the box of every picture (the maze's two ends lie outside the square, at negative x or past 2160)
//   ground     the card's flat mint, which is the sky and the ground at once: no layer has it, so it is read from the
//              finished card (public/cards/21.webp) where no layer is drawn, and the scene paints it in code
//   stars      the dark dots of the sky (1) as [x, y, radius]: particles
//   light      the light at the heart of the maze (14): its solid middle is a picture (lightCore, eroded from the top
//              and the sides so it sits inside the stipple) and everything round it (its loose dots, and its ragged rim
//              filled with dots) is particles; [x, y] its centre
//   spores     the pink stipple round the mushrooms' caps (22, the loose dots) as [x, y, radius]: particles
//   caps       where each mushroom cap is in mushrooms.webp, [u, v, w] (fractions of the picture), so the caps can sway
//   fox        Vulpes: the point his neck bends about and his eye (19, its own picture, so he can blink)
// Pictures:
//   maze       the whole labyrinth (2 to 13): floor, walls, ridges, highlights and line work, as one picture, with the
//              Algo Particular mark painted on its left wall (15: it is drawn on the wall, so it stays)
//   mazeLeft, mazeRight  the maze goes on past the card on both sides (wide screens): its edge column carried on in
//              perspective until the ellipse closes, its rings converging and the outer wall keeping its height, with
//              the wall's outline where it turns away; made here, at half size (they are only bands of flat colour)
//   comet      the little stroke in the sky (the biggest blob of 1)
//   fox        Vulpes (16 fill, 17 his shading at the 21% it has on the card, 18 head and body, 20 tail), eye (19)
//   stones     the two stones (21) with their outline and tufts (the strokes of 23 round them)
//   mushrooms  the two caps (the solid blobs of 22) with their stems and outline (the strokes of 23 round them)
//   ticks      the rest of 23: the little marks on the ground
// Every layer is used. There is no rulito in this illustration. The originals are not kept in the repo once converted. Usage: node scripts/convert-desafio.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'originales', 'desafio');
const target = path.join(root, 'public', 'assets', 'desafio');
const file = (n) => path.join(source, `Laberinto_1-${n}.png`);
const S = 2160;
const PAD = 4;
const SOLID = 110;
const SHADE = 0.21;             // the opacity of Vulpes' shading (17) on the card

const load = async (n) => (await sharp(file(n)).ensureAlpha().raw().toBuffer({ resolveWithObject: true })).data;
const webp = (img, quality = 90) => img.webp({ quality, alphaQuality: 100, effort: 5 });
const raw = (data, w = S, h = S) => ({ raw: { width: w, height: h, channels: 4 } });
const flatten = async (inputs) => (await sharp({ create: { width: S, height: S, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(inputs.map((n) => (typeof n === 'number' ? { input: file(n) } : { input: n, ...raw(n) }))).raw().toBuffer());
const hex = (r, g, b) => (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);

const boxOf = (data, W = S, H = S) => {
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            if (data[(y * W + x) * 4 + 3] < 4) continue;
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

// Every blob of solid pixels: its pixels, area, centre and box
const blobsOf = (data) => {
    const seen = new Uint8Array(S * S);
    const blobs = [];
    const stack = [];
    for (let start = 0; start < S * S; start++) {
        if (seen[start] || data[start * 4 + 3] < SOLID) continue;
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
                if (j < 0 || seen[j] || data[j * 4 + 3] < SOLID) continue;
                seen[j] = 1;
                stack.push(j);
            }
        }
        blobs.push({ pixels, area: pixels.length, x: sx / pixels.length, y: sy / pixels.length, box: [x0, y0, x1, y1] });
    }
    return blobs.sort((a, b) => b.area - a.area);
};

// Only the pixels of these blobs (with the soft edge round them) of a layer
const only = (data, blobs, edge = 3) => {
    const mine = new Uint8Array(S * S);
    blobs.forEach((b) => b.pixels.forEach((i) => { mine[i] = 1; }));
    const out = Buffer.alloc(S * S * 4);
    for (let i = 0; i < S * S; i++) {
        if (!data[i * 4 + 3]) continue;
        const x = i % S, y = (i - x) / S;
        let near = false;
        for (let dy = -edge; dy <= edge && !near; dy++) {
            for (let dx = -edge; dx <= edge; dx++) {
                const xx = x + dx, yy = y + dy;
                if (xx >= 0 && yy >= 0 && xx < S && yy < S && mine[yy * S + xx]) { near = true; break; }
            }
        }
        if (near) data.copy(out, i * 4, i * 4, i * 4 + 4);
    }
    return out;
};
const touches = (box, [x0, y0, x1, y1], m) => box[0] - m <= x1 && x0 - m <= box[2] && box[1] - m <= y1 && y0 - m <= box[3];

await mkdir(target, { recursive: true });
const scene = { size: S, boxes: {}, ground: 0, stars: [], light: null, spores: [], caps: [], fox: {} };

const save = async (name, data, quality = 90) => {
    const box = boxOf(data);
    await webp(sharp(data, raw(data)).extract({ left: box[0], top: box[1], width: box[2], height: box[3] }), quality).toFile(path.join(target, `${name}.webp`));
    scene.boxes[name] = box;
    return box;
};

// The ground (and sky): the card where no layer is drawn
{
    const card = await sharp(path.join(root, 'public', 'cards', '21.webp')).resize(S, S).removeAlpha().raw().toBuffer();
    const all = await flatten([...Array(23)].map((_, i) => i + 1));
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < S * S; i += 5) {
        if (all[i * 4 + 3] > 0) continue;
        r += card[i * 3]; g += card[i * 3 + 1]; b += card[i * 3 + 2]; n++;
    }
    scene.ground = hex(r / n, g / n, b / n);
}

// The maze, and its two ends past the card
const MAZE = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 15];
const maze = await flatten(MAZE);
await save('maze', maze, 88);
{
    const teal = (i) => maze[i * 4 + 3] > 128 && maze[i * 4] < 60 && maze[i * 4 + 2] > 100;
    // Along a column: where the maze starts (its far rim), the front rim of the outer wall (the line over the longest
    // run with no line: the wall's face) and where it ends (the wall's foot)
    const column = (x) => {
        let top = -1, bottom = -1;
        const lines = [];
        let run = null;
        for (let y = 0; y < S; y++) {
            const i = y * S + x;
            if (maze[i * 4 + 3] > 128) { if (top < 0) top = y; bottom = y; }
            if (teal(i)) { if (!run) { run = [y, y]; lines.push(run); } else run[1] = y; } else run = null;
        }
        let front = top, gap = 0;
        for (let k = 0; k + 1 < lines.length; k++) if (lines[k + 1][0] - lines[k][1] > gap) { gap = lines[k + 1][0] - lines[k][1]; front = lines[k][1]; }
        return { top, front, bottom };
    };
    const HALF = 2;                 // the ends are saved at half size
    for (const side of ['Left', 'Right']) {
        const edge = side === 'Left' ? 0 : S - 1;
        const inward = side === 'Left' ? 1 : -1;
        const a = column(edge), b = column(edge + inward * 100);
        // The far rim and the front rim are an ellipse seen from the front: their middle carries on as a line and their
        // half-gap closes as an ellipse does, matching at the card's edge how fast it was closing there
        const m0 = (a.top + a.front) / 2, h0 = (a.front - a.top) / 2;
        const mSlope = (m0 - (b.top + b.front) / 2) / 100;
        const s = Math.max(1e-4, ((b.front - b.top) / 2 - h0) / 100 / h0);       // how fast it closes, per px
        const D = Math.round(0.42 / s);                                         // where it closes
        const p = s * D * D / (1 - 2 * s * D);
        const R = D + p, k0 = Math.sqrt(1 - (p / R) ** 2);
        const half = (d) => h0 * Math.sqrt(Math.max(0, 1 - ((d + p) / R) ** 2)) / k0;
        const wall = a.bottom - a.front;
        const LINE = 12;                // the outline where the wall turns away
        const W = D + 8, x0 = side === 'Left' ? -W : S;
        let y0 = S, y1 = 0;
        for (let d = 0; d < W; d++) { const m = m0 + mSlope * d; y0 = Math.min(y0, m - half(d)); y1 = Math.max(y1, m + half(d) + wall); }
        y0 = Math.floor(Math.max(0, y0 - 8)); y1 = Math.ceil(Math.min(S - 1, y1 + 8));
        const H = y1 - y0 + 1;
        const out = Buffer.alloc(W * H * 4);
        const sample = (y) => {
            const yy = Math.max(0, Math.min(S - 1.001, y)), f = yy - Math.floor(yy);
            const i = (Math.floor(yy) * S + edge) * 4, j = i + S * 4;
            return [0, 1, 2, 3].map((c) => maze[i + c] * (1 - f) + maze[j + c] * f);
        };
        const ink = column(edge);
        const inkAt = (() => { const i = (ink.front * S + edge) * 4; return [maze[i], maze[i + 1], maze[i + 2]]; })();
        for (let d = 0; d < W; d++) {
            const ox = side === 'Left' ? W - 1 - d : d;
            const m = m0 + mSlope * d, h = half(d);
            const top = m - h, front = m + h;
            for (let y = y0; y <= y1; y++) {
                let c = [0, 0, 0, 0];
                if (d < D && y >= top - 2 && y <= front) c = sample(a.top + (y - top) / Math.max(1e-3, front - top) * (a.front - a.top));
                else if (d < D && y > front && y <= front + wall + 4) c = sample(a.front + (y - front));
                // The outline where the wall turns away: a stroke down its side, rounded at the top
                const tip = D - d;
                if (tip >= -LINE / 2 && tip <= LINE && y >= top - LINE && y <= front + wall + 2) c = [...inkAt, 255];
                const o = ((y - y0) * W + ox) * 4;
                for (let ch = 0; ch < 4; ch++) out[o + ch] = Math.round(c[ch]);
            }
        }
        const name = `maze${side}`;
        await webp(sharp(out, raw(out, W, H)).resize(Math.round(W / HALF), Math.round(H / HALF)), 88).toFile(path.join(target, `${name}.webp`));
        scene.boxes[name] = [x0, y0, W, H];
        console.log(name, 'closes', D, 'px past the card');
    }
}

// The sky: its little stroke is a picture, every dot a particle
{
    const data = await load(1);
    const blobs = blobsOf(data);
    const [comet, ...dots] = blobs;
    await save('comet', only(data, [comet]));
    scene.stars = dots.filter((b) => b.area >= 3).map((b) => [Math.round(b.x), Math.round(b.y), +Math.sqrt(b.area / Math.PI).toFixed(1)]);
}

// The light at the heart of the maze: its solid middle, eroded from above and the sides (its foot is cut straight by
// the wall in front and stays so), and dots for everything round it
{
    const data = await load(14);
    const [main, ...rest] = blobsOf(data);
    const inMain = new Uint8Array(S * S);
    main.pixels.forEach((i) => { inMain[i] = 1; });
    const ERODE = 9;
    const core = Buffer.alloc(S * S * 4);
    const inCore = new Uint8Array(S * S);
    for (const i of main.pixels) {
        const x = i % S, y = (i - x) / S;
        let keep = true;
        for (let dy = -ERODE; dy <= 2 && keep; dy++) {
            for (let dx = -ERODE; dx <= ERODE; dx++) {
                if (dx * dx + dy * dy > ERODE * ERODE) continue;
                if (!inMain[(y + dy) * S + x + dx]) { keep = false; break; }
            }
        }
        if (!keep) continue;
        inCore[i] = 1;
        data.copy(core, i * 4, i * 4, i * 4 + 4);
        core[i * 4 + 3] = 255;
    }
    // A soft edge of a pixel round the core
    const soft = Buffer.from(core);
    for (let i = S; i < S * S - S; i++) {
        if (inCore[i]) continue;
        const n = inCore[i - 1] + inCore[i + 1] + inCore[i - S] + inCore[i + S];
        if (!n) continue;
        const j = [i - 1, i + 1, i - S, i + S].find((q) => inCore[q]);
        core.copy(soft, i * 4, j * 4, j * 4 + 3);
        soft[i * 4 + 3] = 60 * n;
    }
    await save('lightCore', soft);
    const dots = rest.filter((b) => b.area >= 3).map((b) => [Math.round(b.x), Math.round(b.y), +Math.sqrt(b.area / Math.PI).toFixed(1)]);
    const FILL = 7;
    const [bx0, by0, bx1, by1] = main.box;
    for (let y = by0; y <= by1; y += FILL) {
        for (let x = bx0 + ((y / FILL) % 2) * FILL / 2; x <= bx1; x += FILL) {
            const px = Math.round(x + (Math.random() - 0.5) * FILL * 0.6), py = Math.round(y + (Math.random() - 0.5) * FILL * 0.6);
            const i = py * S + px;
            if (!inMain[i] || inCore[i]) continue;
            dots.push([px, py, +(3.4 + Math.random() * 1.6).toFixed(1)]);
        }
    }
    scene.light = { x: Math.round(main.x), y: Math.round(main.y), box: main.box, color: hex(data[main.pixels[0] * 4], data[main.pixels[0] * 4 + 1], data[main.pixels[0] * 4 + 2]), dots };
}

// Vulpes, and his eye on its own
{
    const shade = await load(17);
    for (let i = 3; i < shade.length; i += 4) shade[i] = Math.round(shade[i] * SHADE);
    await save('fox', await flatten([16, shade, 18, 20]));
    const eye = await load(19);
    const box = await save('eye', eye);
    scene.fox.eye = [box[0] + box[2] / 2, box[1] + box[3] / 2];
    scene.fox.neck = [1060, 1600];
}

// The stones, the mushrooms and the marks on the ground: the strokes of 23 are shared out by nearness
{
    const lines = await load(23);
    const strokes = blobsOf(lines).filter((b) => b.area >= 4);
    const stones = await load(21);
    const stonesBox = boxOf(stones);
    const sBox = [stonesBox[0], stonesBox[1], stonesBox[0] + stonesBox[2], stonesBox[1] + stonesBox[3]];
    const pink = await load(22);
    const pinkBlobs = blobsOf(pink);
    const caps = pinkBlobs.filter((b) => b.area > 1500);
    const capsBox = caps.reduce((m, b) => [Math.min(m[0], b.box[0]), Math.min(m[1], b.box[1]), Math.max(m[2], b.box[2]), Math.max(m[3], b.box[3])], [S, S, 0, 0]);
    const ofStones = strokes.filter((b) => touches(sBox, b.box, 50));
    const ofMushrooms = strokes.filter((b) => !ofStones.includes(b) && touches([capsBox[0], capsBox[1], capsBox[2], capsBox[3] + 90], b.box, 30));
    const rest = strokes.filter((b) => !ofStones.includes(b) && !ofMushrooms.includes(b));
    await save('stones', await flatten([stones, only(lines, ofStones)]));
    const mBox = await save('mushrooms', await flatten([only(pink, caps, 2), only(lines, ofMushrooms)]));
    scene.caps = caps.sort((a, b) => a.x - b.x).map((b) => [
        +((b.x - mBox[0]) / mBox[2]).toFixed(3), +((b.box[3] - mBox[1]) / mBox[3]).toFixed(3), +((b.box[2] - b.box[0] + 60) / mBox[2]).toFixed(3),
    ]);
    scene.spores = pinkBlobs.filter((b) => b.area <= 1500 && b.area >= 3).map((b) => [Math.round(b.x), Math.round(b.y), +Math.sqrt(b.area / Math.PI).toFixed(1)]);
    scene.sporeColor = hex(pink[caps[0].pixels[0] * 4], pink[caps[0].pixels[0] * 4 + 1], pink[caps[0].pixels[0] * 4 + 2]);
    await save('ticks', only(lines, rest));
}

await writeFile(path.join(root, 'src', 'composables', 'desafioScene.json'), JSON.stringify(scene));
console.log(Object.keys(scene.boxes).length, 'pictures;', scene.stars.length, 'stars;', scene.light.dots.length, 'dots of light;', scene.spores.length,
    'spores; ground', scene.ground.toString(16), JSON.stringify(scene.boxes), 'caps', JSON.stringify(scene.caps), 'eye', scene.fox.eye);
