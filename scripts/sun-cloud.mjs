// A stippled sun (or moon, or light) as a density map, read from the finished card, so a scene can draw it whole as
// particles, the way Pañña's sun is drawn (no solid disc under it: nothing shows the edge of a circle).
// The card's pixels in a box round the light are scored by how close they are to its colour (0 the sky behind, 1 the
// light), the pixels of the card's other dots in that box left out of
// the average (the thread, say), and averaged over cells of CELL px:
// { x, y, cell, cols, rows, color: [r, g, b], data } (data: one byte per cell, row by row, base64), the format of
// pannaClouds.json, turned back into dots by src/composables/stippleCloud.js.
// A light the card cuts at its top edge (`centre` given) is completed above it: each cell there takes the light, at its
// distance from the centre, of one of the cells on the light's two sides at that distance (within SIDE of the horizontal,
// picked at random, so it is as ragged as they are), and so it is round.
// Each card is a line of CARDS: where its light is, its colour, what is behind it, and which scene JSON it goes into
// (written as `cloud` in the light's own entry).
// Usage: node scripts/sun-cloud.mjs [name]   (no name: every card listed)
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CELL = 10;
const SIDE = 40 * Math.PI / 180;

const CARDS = {
    // 26 Honestidad: the light at the surface (the card cuts it at the top), over the teal water; the two strands of
    // its thread start under it and stay a group of their own
    honestidad: {
        card: 26,
        json: 'src/composables/honestidadScene.json',
        key: 'sun',
        box: [700, 0, 760, 400],
        color: 0xffe47c,
        behind: (scene, y) => {
            const stops = scene.water;
            let best = stops[0];
            stops.forEach((s) => { if (Math.abs(s[0] - y) < Math.abs(best[0] - y)) best = s; });
            return best[1];
        },
        skip: (scene) => [...scene.thread, scene.eye].map(([x, y, r]) => [x, y, r + 4]),
        centre: (scene) => [scene.sun.x, scene.sun.y],
    },
};

const rgb = (hex) => [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];

// The light above the card's top edge, from the radial profile of its sides
const complete = ({ x, y, cols, rows, bytes }, [cx, cy]) => {
    const ring = [];                                    // the cells' values by distance, in cells
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const dx = x + (col + 0.5) * CELL - cx, dy = y + (row + 0.5) * CELL - cy;
            if (Math.abs(Math.atan2(dy, Math.abs(dx))) > SIDE) continue;
            const d = Math.round(Math.hypot(dx, dy) / CELL);
            (ring[d] ??= []).push(bytes[row * cols + col]);
        }
    }
    let seed = 7;
    const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const at = (d) => {
        const values = ring[Math.round(d)];
        return values ? values[Math.floor(random() * values.length)] : 0;
    };
    let reach = 0;
    ring.forEach((values, d) => { if (values.reduce((a, b) => a + b, 0) / values.length > 3) reach = d; });
    const extra = Math.max(0, Math.ceil((reach * CELL - cy) / CELL));
    const out = new Uint8Array(cols * (rows + extra));
    out.set(bytes, extra * cols);
    for (let row = 0; row < extra; row++) {
        for (let col = 0; col < cols; col++) {
            const dx = x + (col + 0.5) * CELL - cx, dy = (row - extra + 0.5) * CELL - cy;
            out[row * cols + col] = at(Math.hypot(dx, dy) / CELL);
        }
    }
    return { x, y: y - extra * CELL, cols, rows: rows + extra, bytes: out };
};

const make = async (name) => {
    const spec = CARDS[name];
    const file = path.join(root, spec.json);
    const scene = JSON.parse(await readFile(file, 'utf8'));
    const { data, info } = await sharp(path.join(root, 'public', 'cards', `${spec.card}.webp`)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const [bx, by, bw, bh] = spec.box;
    const light = rgb(spec.color);
    const skip = spec.skip ? spec.skip(scene) : [];
    const cols = Math.ceil(bw / CELL), rows = Math.ceil(bh / CELL);
    const bytes = new Uint8Array(cols * rows);
    const hidden = [];
    for (let row = 0; row < rows; row++) {
        const back = rgb(spec.behind(scene, by + (row + 0.5) * CELL));
        const axis = light.map((c, i) => c - back[i]);
        const len2 = axis.reduce((s, a) => s + a * a, 0);
        for (let col = 0; col < cols; col++) {
            let sum = 0, n = 0;
            for (let y = by + row * CELL; y < Math.min(by + (row + 1) * CELL, info.height); y++) {
                for (let x = bx + col * CELL; x < Math.min(bx + (col + 1) * CELL, info.width); x++) {
                    // A pixel of another dot does not count either way (inside the solid middle the cell keeps its light)
                    if (skip.some(([sx, sy, r]) => (x - sx) ** 2 + (y - sy) ** 2 < r * r)) continue;
                    n++;
                    const i = (y * info.width + x) * 3;
                    // How far along the way from the sky to the light this pixel is
                    const along = axis.reduce((s, a, c) => s + a * (data[i + c] - back[c]), 0) / len2;
                    sum += Math.min(1, Math.max(0, along));
                }
            }
            bytes[row * cols + col] = n ? Math.round(255 * sum / n) : 0;
            if (n < CELL * CELL * 0.3) hidden.push(row * cols + col);
        }
    }
    // A cell mostly under another dot takes the light of the cells round it
    hidden.forEach((i) => {
        const col = i % cols, row = (i - col) / cols;
        let sum = 0, n = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const c = col + dx, r = row + dy, j = r * cols + c;
            if ((dx || dy) && c >= 0 && c < cols && r >= 0 && r < rows && !hidden.includes(j)) { sum += bytes[j]; n++; }
        }
        bytes[i] = n ? Math.round(sum / n) : 0;
    });
    let grid = { x: bx, y: by, cols, rows, bytes };
    if (spec.centre && by === 0) grid = complete(grid, spec.centre(scene));
    scene[spec.key].cloud = { x: grid.x, y: grid.y, cell: CELL, cols: grid.cols, rows: grid.rows, color: light, data: Buffer.from(grid.bytes).toString('base64') };
    await writeFile(file, JSON.stringify(scene));
    const solid = grid.bytes.filter((b) => b > 200).length, any = grid.bytes.filter((b) => b > 8).length;
    console.log(name, `${grid.cols}x${grid.rows} cells, ${any} with light, ${solid} solid`);
};

const wanted = process.argv[2] ? [process.argv[2]] : Object.keys(CARDS);
for (const name of wanted) await make(name);
