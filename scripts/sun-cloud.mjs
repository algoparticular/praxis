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
// A light too big to be all dots (`ring` given: Metta's two) keeps its disc of colour in code and only its stippled
// band becomes dots: the band's profile, by distance from the centre, is read from the cells of the arcs where nothing is
// drawn over it (`arcs`, angles in degrees, -90 straight up), and drawn all round from it (each cell one of that
// distance's, at random, as above); the cells inside `solid` (where the profile is still whole, less a few cells) are
// left empty, and `solid` is written with the cloud, so the scene draws its disc that big and the densest dots of the
// band cover its edge.
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
        behind: (scene, y) => nearest(scene.water, y),
        skip: (scene) => [...scene.thread, scene.eye].map(([x, y, r]) => [x, y, r + 4]),
        centre: (scene) => [scene.sun.x, scene.sun.y],
    },
    // 8 Metta: the great yellow light over the navy sky, and the turquoise one inside it over the yellow; the arcs keep
    // clear of the beings, Sid's head and the rulito, and the card's stars and squiggles are left out
    metta: {
        card: 8,
        json: 'src/composables/mettaScene.json',
        key: 'halo',
        color: (scene) => scene.halo.color,
        behind: (scene, y) => nearest(scene.sky, y),
        skip: mettaSkip,
        ring: { centre: (scene) => [scene.halo.x, scene.halo.y], from: (scene) => scene.aura.r + 100, arcs: [[-150, -110], [-70, -30]] },
    },
    'metta-aura': {
        card: 8,
        json: 'src/composables/mettaScene.json',
        key: 'aura',
        color: (scene) => scene.aura.color,
        behind: (scene) => scene.halo.color,
        skip: mettaSkip,
        ring: { centre: (scene) => [scene.aura.x, scene.aura.y], from: (scene) => scene.aura.r - 120, to: (scene) => scene.aura.r + 160, arcs: [[-160, -110], [-70, -20]] },
    },
};

function nearest(stops, y) {
    let best = stops[0];
    stops.forEach((s) => { if (Math.abs(s[0] - y) < Math.abs(best[0] - y)) best = s; });
    return best[1];
}

function mettaSkip(scene) {
    const [rx, ry, rw, rh] = scene.rulito;
    return [
        ...scene.stars.map(([x, y, r]) => [x, y, r + 3]),
        ...scene.inner.map(([x, y, r]) => [x, y, r + 3]),
        ...scene.bits.filter(([name]) => name.startsWith('squiggle')).map(([, x, y, w, h]) => [x + w / 2, y + h / 2, Math.max(w, h) / 2 + 6]),
        [rx + rw / 2, ry + rh / 2, Math.max(rw, rh) / 2 + 10],
    ];
}

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

// A ring all round from the profile of its clear arcs
const ringed = ({ x, y, cols, rows, bytes }, scene, spec) => {
    const [cx, cy] = spec.centre(scene);
    const from = spec.from(scene), to = spec.to ? spec.to(scene) : Infinity;
    const arcs = spec.arcs.map(([a, b]) => [a * Math.PI / 180, b * Math.PI / 180]);
    const ring = [];
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const dx = x + (col + 0.5) * CELL - cx, dy = y + (row + 0.5) * CELL - cy;
            const dist = Math.hypot(dx, dy), angle = Math.atan2(dy, dx);
            if (dist < from || dist > to || !arcs.some(([a, b]) => angle >= a && angle <= b)) continue;
            (ring[Math.round(dist / CELL)] ??= []).push(bytes[row * cols + col]);
        }
    }
    const mean = (d) => (ring[d] ? ring[d].reduce((a, b) => a + b, 0) / ring[d].length : 0);
    let whole = Math.ceil(from / CELL);
    while (whole < ring.length && mean(whole) > 0.9 * 255) whole++;
    let reach = whole;
    ring.forEach((values, d) => { if (mean(d) > 3) reach = d; });
    const inner = whole - 3;
    let seed = 11;
    const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const side = 2 * reach + 1;
    const out = new Uint8Array(side * side);
    for (let row = 0; row < side; row++) {
        for (let col = 0; col < side; col++) {
            const d = Math.round(Math.hypot(col - reach, row - reach));
            const values = ring[d];
            if (d < inner || !values) continue;
            out[row * side + col] = values[Math.floor(random() * values.length)];
        }
    }
    return { x: cx - (reach + 0.5) * CELL, y: cy - (reach + 0.5) * CELL, cols: side, rows: side, bytes: out, solid: (inner + 1) * CELL };
};

const make = async (name) => {
    const spec = CARDS[name];
    const file = path.join(root, spec.json);
    const scene = JSON.parse(await readFile(file, 'utf8'));
    const { data, info } = await sharp(path.join(root, 'public', 'cards', `${spec.card}.webp`)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const centre = spec.ring?.centre(scene);
    const reachOut = spec.ring?.to ? spec.ring.to(scene) : 900;
    const [bx, by, bw, bh] = spec.box ?? [Math.max(0, Math.round(centre[0] - reachOut)), Math.max(0, Math.round(centre[1] - reachOut)), Math.round(2 * reachOut), Math.round(2 * reachOut)];
    const light = rgb(typeof spec.color === 'function' ? spec.color(scene) : spec.color);
    // The pixels of the card's other dots, once
    const skipped = new Uint8Array(info.width * info.height);
    (spec.skip ? spec.skip(scene) : []).forEach(([sx, sy, r]) => {
        for (let y = Math.max(0, Math.floor(sy - r)); y <= Math.min(info.height - 1, Math.ceil(sy + r)); y++) {
            for (let x = Math.max(0, Math.floor(sx - r)); x <= Math.min(info.width - 1, Math.ceil(sx + r)); x++) {
                if ((x - sx) ** 2 + (y - sy) ** 2 < r * r) skipped[y * info.width + x] = 1;
            }
        }
    });
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
                    if (skipped[y * info.width + x]) continue;
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
    if (spec.ring) grid = ringed(grid, scene, spec.ring);
    else if (spec.centre && by === 0) grid = complete(grid, spec.centre(scene));
    scene[spec.key].cloud = { x: grid.x, y: grid.y, cell: CELL, cols: grid.cols, rows: grid.rows, color: light, data: Buffer.from(grid.bytes).toString('base64'), ...(grid.solid ? { solid: grid.solid } : {}) };
    await writeFile(file, JSON.stringify(scene));
    const solid = grid.bytes.filter((b) => b > 200).length, any = grid.bytes.filter((b) => b > 8).length;
    console.log(name, `${grid.cols}x${grid.rows} cells, ${any} with light, ${solid} solid`, grid.solid ? `disc ${grid.solid} (was ${scene[spec.key].r})` : '');
};

const wanted = process.argv[2] ? [process.argv[2]] : Object.keys(CARDS);
for (const name of wanted) await make(name);
