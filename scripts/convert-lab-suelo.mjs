// Plants, stones and mushrooms of the cards' scenes for the puppet lab's world (/lab/sid), cut out of the layers already
// in public/assets (no originals needed): the fans and the tufts of grass of Ciclos (its own plants, in the world's own
// palette), the mushrooms and crystals of Upekkha's line drawing, the stones and pink mushrooms of Desafío, the little
// glowing plants of Metta, the mushrooms of Celebración, and the zones' special places and their characters (Metta's
// nest and beings, Upekkha's pond, Celebración's fire and everyone round it, Vulpes). Each piece is made, as her tree's pieces are
// (scripts/convert-lab-arbol.mjs), into src/lab/suelo/NAME.webp (its line, as transparency, so the lab can tint it) and
// NAME-fill.webp (what is inside its line, white over transparent, so the lab can paint it in code), and
// src/lab/suelo/suelo.json: the size of every piece's picture and how many units of the world each of its pixels is
// (unit), so that they stand beside Sid at a size that suits them. Each also gets NAME-colour.webp: the piece in its own
// colours, as its card has it (the lab shows it when the piece is coloured, in its card's zone of the world): the
// coloured layer itself, or, for a piece of pure line, its line over what is inside it painted in `paint` (the colour
// it has in its card).
// The line of a coloured piece is its dark colour (darker than `dark`, softly); what is inside it, all of what is drawn
// (the line goes over it). A piece of pure line (Upekkha's drawing) has its inside found as her tree's is: the white that cannot be
// reached from the edges of its box without crossing its line. A piece with no inside (a tuft of grass) is all line.
// Only the marks that belong to the piece are kept: the bigger bits of line in its box (a mark smaller than `keep` of
// the biggest is a stray from the drawing beside it).
// Usage: node scripts/convert-lab-suelo.mjs
import { mkdir, readFile, writeFile } from 'node:fs/promises';
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
    // Upekkha's line drawing: the grove of big mushrooms with its crystals, crystals and small mushrooms (in its card the
    // mushrooms are yellow and the crystals a pale lilac)
    grove: { from: 'upekkha/rocks', crop: [135, 0, 815, 362], unit: 1, inside: 'closed', keep: 0.002, paint: '#F6E27A' },
    crystals: { from: 'upekkha/rocks', crop: [172, 452, 172, 136], unit: 1.1, inside: 'closed', keep: 0.05, paint: '#E8E2FA' },
    crystalsSmall: { from: 'upekkha/rocks', crop: [412, 572, 146, 70], unit: 1.25, inside: 'closed', keep: 0.05, paint: '#E8E2FA' },
    crystal: { from: 'upekkha/rocks', crop: [698, 552, 94, 76], unit: 1.35, inside: 'closed', keep: 0.2, paint: '#E8E2FA' },
    shrooms: { from: 'upekkha/rocks', crop: [864, 528, 94, 94], unit: 1.35, inside: 'closed', keep: 0.2, paint: '#F6E27A' },
    shroom: { from: 'upekkha/rocks', crop: [543, 428, 74, 78], unit: 1.35, inside: 'closed', keep: 0.2, paint: '#F6E27A' },
    // Desafío's two stones and Celebración's mushrooms
    stones: { from: 'desafio/stones', unit: 1.15, inside: 'colour', dark: 130 },
    mushrooms: { from: 'celebracion/mushrooms', unit: 1.5, inside: 'colour', dark: 110 },
    // Upekkha's pond, the special place of its zone (its water and its line; the card cuts it at its left edge: it is made
    // whole with its mirror there). compose: layers of the card put together over `canvas` (card px)
    pond: { compose: [['upekkha/water', 0, 1492], ['upekkha/pond', 21, 1184]], canvas: [26, 1180, 1004, 890], mirror: true, unit: 0.8, inside: 'colour', dark: 130 },
    // Desafío's two pink mushrooms
    caps: { from: 'desafio/mushrooms', unit: 1.2, inside: 'colour', dark: 130 },
    // Metta's little glowing plants (dark, all line)
    ...Object.fromEntries([0, 1, 2, 3, 4].map((i) => [`bloom${i}`, { from: `metta/flower${i}`, unit: 1.3, inside: 'colour', dark: 120 }])),
    // The special places and the characters round them, each its own picture, where the card has it (`card`: [scene,
    // layer], its box read from the scene's json, so the lab can set them round the place as in the card; all of one place
    // at one unit). Metta: Sid's nest of mushrooms, its six beings, its fox and its kitten
    nest: { card: ['metta', 'nest'], unit: 1, inside: 'colour', dark: 90 },
    ...Object.fromEntries([0, 1, 2, 3, 4, 5].map((i) => [`metta${i}`, { card: ['metta', `being${i}`], unit: 1, inside: 'colour', dark: 70 }])),
    mettaFox: { card: ['metta', 'fox'], unit: 1, inside: 'colour', dark: 70 },
    mettaKitten: { card: ['metta', 'kitten'], unit: 1, inside: 'colour', dark: 70 },
    // Celebración: the fire (its logs, and its flame with the yellow one inside it, apart, so it can flicker) and everyone
    // round it: the two Samas, the one sitting, the foxes, the cats, the hairy ones
    logs: { card: ['celebracion', 'logs'], unit: 0.8, inside: 'colour', dark: 120 },
    flame: { compose: [['celebracion/flame', 854, 777], ['celebracion/heart', 910, 1276]], canvas: [854, 777, 450, 1069], unit: 0.8, inside: 'colour', dark: 40 },
    ...Object.fromEntries(['samaLeft', 'samaRight', 'seated', 'foxLeft', 'foxRight', 'catBack', 'catFront', 'trio', 'hairy', 'pink']
        .map((k) => [`fire_${k}`, { card: ['celebracion', k], unit: 0.8, inside: 'colour', dark: 110 }])),
    // their eyes, apart (so they can blink and look about): the eyes of Metta's beings, cut from its scene's atlas of
    // little pieces (bits.webp: where each is in the atlas and in the card, mettaScene.json), and the eyes of Celebración's
    // Sama on the left
    ...Object.fromEntries(['being0', 'being1', 'being2', 'being3', 'being4', 'being5'].map((b, i) => [`eyes_metta${i}`,
        { bits: ['metta', `eyes:${b}`], unit: 1, inside: 'none' }])),
    eyes_fire_samaLeft: { card: ['celebracion', 'eyesLeft'], unit: 0.8, inside: 'none' },
    // Desafío: Vulpes
    vulpes: { card: ['desafio', 'fox'], unit: 0.55, inside: 'colour', dark: 130 },
};

await mkdir(target, { recursive: true });
const out = { pieces: {} };

for (const [name, piece] of Object.entries(PIECES)) {
    let img;
    // (a layer of a card, where the card has it: its box, from the scene's json)
    if (piece.card) {
        const [scene, layer] = piece.card, json = JSON.parse(await readFile(path.join(root, 'src', 'composables', `${scene}Scene.json`), 'utf8'));
        const boxes = typeof json.boxes === 'string' ? JSON.parse(json.boxes) : json.boxes;
        piece.from = `${scene}/${layer}`; piece.at = boxes[layer].slice(0, 2);
    }
    // (a little piece of a scene's atlas, `bits`: its crop in the atlas and its place in the card)
    if (piece.bits) {
        const [scene, bit] = piece.bits, json = JSON.parse(await readFile(path.join(root, 'src', 'composables', `${scene}Scene.json`), 'utf8'));
        const [, x, y, w, h, ax, ay] = json.bits.find((b) => b[0] === bit);
        piece.from = `${scene}/bits`; piece.crop = [ax, ay, w, h]; piece.at = [x - ax, y - ay];
    }
    if (piece.compose) {
        piece.at = piece.canvas.slice(0, 2);
        const [cx, cy, cw, ch] = piece.canvas, layers = [];
        for (const [from, x, y] of piece.compose) {
            const m = await sharp(path.join(assets, `${from}.webp`)).metadata();
            // (only what falls on the canvas)
            const left = Math.max(0, cx - x), top = Math.max(0, cy - y);
            const w = Math.min(m.width - left, cx + cw - x - left), h = Math.min(m.height - top, cy + ch - y - top);
            if (w <= 0 || h <= 0) continue;
            layers.push({ input: await sharp(path.join(assets, `${from}.webp`)).extract({ left, top, width: w, height: h }).png().toBuffer(), left: x + left - cx, top: y + top - cy });
        }
        img = sharp(await sharp({ create: { width: cw, height: ch, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(layers).png().toBuffer());
    } else img = sharp(path.join(assets, `${piece.from}.webp`)).ensureAlpha();
    if (piece.mirror) {
        const half = await img.png().toBuffer(), m = await sharp(half).metadata();
        img = sharp(await sharp({ create: { width: m.width * 2, height: m.height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
            .composite([{ input: await sharp(half).flop().toBuffer(), left: 0, top: 0 }, { input: half, left: m.width, top: 0 }]).png().toBuffer());
    }
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
    // in its own colours: the layer itself (only the marks that belong to it), or its line over its inside painted
    const own = Buffer.alloc(bw * bh * 4), paint = piece.paint && [1, 3, 5].map((k) => parseInt(piece.paint.slice(k, k + 2), 16));
    for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
        const i = (y + y0) * W + x + x0, k = (y * bw + x) * 4;
        if (paint) {
            const l = Math.min(1, line[i] / Math.max(0.001, data[i * 4 + 3] / 255 || 1)), a = Math.max(line[i], inside[i]);
            for (let c = 0; c < 3; c++) own[k + c] = Math.round(paint[c] + (data[i * 4 + c] - paint[c]) * (line[i] > 0 ? l : 0));
            own[k + 3] = Math.round(Math.min(1, a) * 255);
        } else {
            for (let c = 0; c < 3; c++) own[k + c] = data[i * 4 + c];
            own[k + 3] = Math.round(Math.min(1, piece.keep ? Math.max(line[i], inside[i]) : data[i * 4 + 3] / 255) * 255);
        }
    }
    await sharp(own, { raw: { width: bw, height: bh, channels: 4 } }).webp({ quality: 90, alphaQuality: 90 }).toFile(path.join(target, `${name}-colour.webp`));
    out.pieces[name] = { box: [0, 0, bw, bh], unit: piece.unit, fill: hasInside, colour: true };
    // (where it is in its card, card px, for the pieces of a place: its top left)
    if (piece.at && !piece.mirror) out.pieces[name].at = [piece.at[0] + (piece.crop?.[0] ?? 0) + x0, piece.at[1] + (piece.crop?.[1] ?? 0) + y0];
    console.log(name, bw, bh);
}
await writeFile(path.join(target, 'suelo.json'), JSON.stringify(out) + '\n');
