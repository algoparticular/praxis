// Plants, stones and mushrooms of the cards' scenes for the puppet lab's world (/lab/sid), cut out of the layers already
// in public/assets (no originals needed): the fans and the tufts of grass of Ciclos (its own plants, in the world's own
// palette), the mushrooms and crystals of Upekkha's line drawing, the stones of Desafío, the stack of stones and the
// little mushrooms of Belleza, and the mushrooms of Celebración. Each piece is made, as her tree's pieces are
// (scripts/convert-lab-arbol.mjs), into src/lab/suelo/NAME.webp (its line, as transparency, so the lab can tint it) and
// NAME-fill.webp (what is inside its line, white over transparent, so the lab can paint it in code), and
// src/lab/suelo/suelo.json: the size of every piece's picture and how many units of the world each of its pixels is
// (unit), so that they stand beside Sid at a size that suits them.
// The line of a coloured piece is its dark colour (darker than `dark`, softly); what is inside it, all of what is drawn
// (the line goes over it). A piece of pure line (Upekkha's drawing) has its inside found as her tree's is: the white that cannot be
// reached from the edges of its box without crossing its line. A piece with no inside (a tuft of grass) is all line.
// Only the marks that belong to the piece are kept: the bigger bits of line in its box (a mark smaller than `keep` of
// the biggest is a stray from the drawing beside it).
// Usage: node scripts/convert-lab-suelo.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assets = path.join(root, 'public', 'assets');
const target = path.join(root, 'src', 'lab', 'suelo');
const ciclos = JSON.parse(await (await import('node:fs/promises')).readFile(path.join(root, 'src', 'composables', 'ciclosScene.json'), 'utf8'));
const atlas = (i) => { const [, , w, h, ax, ay] = ciclos.plants[i]; return [ax, ay, w, h]; };

const GAP = 3;          // px the line is thickened by before finding what is inside (so small gaps do not let the outside in)

// name: { from (a layer in public/assets), crop [x, y, w, h] (px of that layer), unit (world units a pixel), inside:
// 'colour' (the line is its dark colour, the rest is inside), 'closed' (pure line, inside found), 'none' (all line) }
const PIECES = {
    // Ciclos's fans (dark line, peach inside) and its tufts of grass (one colour, no line round them)
    fan0: { from: 'ciclos/plants', crop: atlas(4), unit: 0.95, inside: 'colour', dark: 90 },
    fan1: { from: 'ciclos/plants', crop: atlas(9), unit: 0.95, inside: 'colour', dark: 90 },
    fan2: { from: 'ciclos/plants', crop: atlas(13), unit: 0.95, inside: 'colour', dark: 90 },
    fan3: { from: 'ciclos/plants', crop: atlas(15), unit: 0.95, inside: 'colour', dark: 90 },
    grass0: { from: 'ciclos/plants', crop: atlas(5), unit: 0.8, inside: 'none' },
    grass1: { from: 'ciclos/plants', crop: atlas(6), unit: 0.8, inside: 'none' },
    grass2: { from: 'ciclos/plants', crop: atlas(7), unit: 0.8, inside: 'none' },
    grass3: { from: 'ciclos/plants', crop: atlas(8), unit: 0.8, inside: 'none' },
    grass4: { from: 'ciclos/plants', crop: atlas(12), unit: 0.8, inside: 'none' },
    grass5: { from: 'ciclos/plants', crop: atlas(14), unit: 0.8, inside: 'none' },
    grass6: { from: 'ciclos/plants', crop: atlas(11), unit: 0.8, inside: 'none' },
    // Upekkha's line drawing: the grove of big mushrooms with its crystals, crystals and small mushrooms
    grove: { from: 'upekkha/rocks', crop: [135, 0, 815, 362], unit: 1, inside: 'closed', keep: 0.002 },
    crystals: { from: 'upekkha/rocks', crop: [172, 452, 172, 136], unit: 1.1, inside: 'closed', keep: 0.05 },
    crystalsSmall: { from: 'upekkha/rocks', crop: [412, 572, 146, 70], unit: 1.25, inside: 'closed', keep: 0.05 },
    crystal: { from: 'upekkha/rocks', crop: [698, 552, 94, 76], unit: 1.35, inside: 'closed', keep: 0.2 },
    shrooms: { from: 'upekkha/rocks', crop: [864, 528, 94, 94], unit: 1.35, inside: 'closed', keep: 0.2 },
    shroom: { from: 'upekkha/rocks', crop: [543, 428, 74, 78], unit: 1.35, inside: 'closed', keep: 0.2 },
    // Desafío's two stones, Belleza's stack of stones and its row of little mushrooms, Celebración's mushrooms
    stones: { from: 'desafio/stones', unit: 1.15, inside: 'colour', dark: 130 },
    stack: { from: 'belleza/cairn', unit: 1, inside: 'colour', dark: 122 },
    mushroomRow: { from: 'belleza/mushrooms', crop: [0, 42, 512, 141], unit: 0.9, inside: 'colour', dark: 122 },
    mushrooms: { from: 'celebracion/mushrooms', unit: 1.5, inside: 'colour', dark: 110 },
};

await mkdir(target, { recursive: true });
const out = { pieces: {} };

for (const [name, piece] of Object.entries(PIECES)) {
    let img = sharp(path.join(assets, `${piece.from}.webp`)).ensureAlpha();
    if (piece.crop) img = img.extract({ left: piece.crop[0], top: piece.crop[1], width: piece.crop[2], height: piece.crop[3] });
    const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
    const W = info.width, H = info.height, N = W * H;
    const line = new Float32Array(N), inside = new Float32Array(N);
    for (let i = 0; i < N; i++) {
        const a = data[i * 4 + 3] / 255;
        if (piece.inside === 'colour') {
            const lum = 0.3 * data[i * 4] + 0.59 * data[i * 4 + 1] + 0.11 * data[i * 4 + 2];
            const dark = Math.max(0, Math.min(1, (piece.dark + 15 - lum) / 30));
            line[i] = a * dark; inside[i] = a;   // (the inside is all of it: the line is drawn over it, so no gap shows)
        } else line[i] = a;
    }
    // only the bits of line that belong to the piece (the stray marks of the drawing beside it go)
    if (piece.keep) {
        const label = new Int32Array(N).fill(-1), sizes = [];
        for (let s = 0; s < N; s++) {
            if (line[s] < 0.3 || label[s] >= 0) continue;
            const id = sizes.length, stack = [s]; label[s] = id; let n = 0;
            while (stack.length) {
                const i = stack.pop(), x = i % W, y = (i / W) | 0; n++;
                for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
                    const X = x + dx, Y = y + dy, j = Y * W + X;
                    if (X >= 0 && Y >= 0 && X < W && Y < H && line[j] >= 0.3 && label[j] < 0) { label[j] = id; stack.push(j); }
                }
            }
            sizes.push(n);
        }
        const biggest = Math.max(...sizes);
        for (let i = 0; i < N; i++) {
            if (line[i] > 0 && (label[i] < 0 || sizes[label[i]] < biggest * piece.keep)) {
                // (a soft edge pixel next to a kept bit stays)
                let near = false;
                for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) {
                    const j = i + dy * W + dx;
                    if (j >= 0 && j < N && label[j] >= 0 && sizes[label[j]] >= biggest * piece.keep) { near = true; break; }
                }
                if (!near) line[i] = 0;
            }
        }
    }
    if (piece.inside === 'closed') {
        const wall = new Uint8Array(N);
        for (let i = 0; i < N; i++) if (line[i] > 0.35) {
            const x = i % W, y = (i / W) | 0;
            for (let dy = -GAP; dy <= GAP; dy++) for (let dx = -GAP; dx <= GAP; dx++) {
                const X = x + dx, Y = y + dy;
                if (X >= 0 && Y >= 0 && X < W && Y < H && dx * dx + dy * dy <= GAP * GAP) wall[Y * W + X] = 1;
            }
        }
        const outside = new Uint8Array(N), stack = [];
        const seed = (x, y) => { const i = y * W + x; if (!wall[i] && !outside[i]) { outside[i] = 1; stack.push(i); } };
        for (let x = 0; x < W; x++) { seed(x, 0); seed(x, H - 1); }
        for (let y = 0; y < H; y++) { seed(0, y); seed(W - 1, y); }
        while (stack.length) {
            const i = stack.pop(), x = i % W, y = (i / W) | 0;
            for (const [X, Y] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
                if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
                const j = Y * W + X;
                if (!wall[j] && !outside[j]) { outside[j] = 1; stack.push(j); }
            }
        }
        // inside is what the outside does not reach, drawn back from the thickened line to the line itself (so it does not
        // show round the outside of the line)
        for (let i = 0; i < N; i++) {
            if (outside[i]) continue;
            const x = i % W, y = (i / W) | 0;
            let near = false;
            for (let dy = -GAP; dy <= GAP && !near; dy++) for (let dx = -GAP; dx <= GAP; dx++) {
                const X = x + dx, Y = y + dy;
                if (X >= 0 && Y >= 0 && X < W && Y < H && outside[Y * W + X] && dx * dx + dy * dy <= GAP * GAP) { near = true; break; }
            }
            inside[i] = near ? 0 : 1;
        }
    }
    // trimmed to what is drawn, with a little room round it
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let i = 0; i < N; i++) if (line[i] > 0.05 || inside[i] > 0.05) {
        const x = i % W, y = (i / W) | 0;
        x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
    x0 = Math.max(0, x0 - 2); y0 = Math.max(0, y0 - 2); x1 = Math.min(W - 1, x1 + 2); y1 = Math.min(H - 1, y1 + 2);
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
    const save = async (values, file, white) => {
        const px = Buffer.alloc(bw * bh * 4);
        for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
            const k = (y * bw + x) * 4, v = values[(y + y0) * W + x + x0];
            px[k] = px[k + 1] = px[k + 2] = white ? 255 : 0; px[k + 3] = Math.round(Math.max(0, Math.min(1, v)) * 255);
        }
        await sharp(px, { raw: { width: bw, height: bh, channels: 4 } }).webp({ quality: 90, alphaQuality: 90 }).toFile(path.join(target, file));
    };
    await save(line, `${name}.webp`, false);
    const hasInside = piece.inside !== 'none';
    if (hasInside) await save(inside, `${name}-fill.webp`, true);
    out.pieces[name] = { box: [0, 0, bw, bh], unit: piece.unit, fill: hasInside };
    console.log(name, bw, bh);
}
await writeFile(path.join(target, 'suelo.json'), JSON.stringify(out) + '\n');
