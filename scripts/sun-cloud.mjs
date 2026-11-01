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
// `shift` moves the cloud from the card's px to the scene's, where its frame is not the card's.
// `index` picks one of several lights in the same entry (Gratitud's two suns, an array).
// The skipped dots are circles [x, y, r] or boxes [x, y, w, h]; a cell mostly under them does not count in a profile.
// A light the scene used to have as a picture gets its entry (centre, radius, colour) from `entry`.
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
    // 1 Sila: the great moon (until now a picture with a tight rim) over the blue night; its centre and the radius of its
    // solid middle fitted to that picture. The clouds the card draws over it, its stars and the rulito are left out, and
    // the figures keep below the arcs
    sila: {
        card: 1,
        json: 'src/composables/silaScene.json',
        key: 'moon',
        entry: () => ({ x: 929, y: 1163, r: 806, color: 0xfff5c9 }),
        color: 0xfff5c9,
        behind: (scene, y, card) => card.median(2045, 2155, Math.min(y, 1600)),
        skip: (scene) => [
            ...scene.dots.stars.map(([x, y, r]) => [x, y, r + 3]),
            ...scene.clouds.map(([, x, y, w, h]) => [x - 6, y - 6, w + 12, h + 12]),
            (([x, y, w, h]) => [x + w / 2, y + h / 2, Math.max(w, h) / 2 + 10])(scene.rulito),
        ],
        ring: { centre: () => [929, 1163], from: () => 650, arcs: [[-180, 10], [160, 180]] },
    },
    // 11 Aceptación: the pink sun of the past, whole on the card, over the cream sky; small, so all of it dots (as
    // Honestidad's); the pink specks and bits of the sky round it are left out
    aceptacion: {
        card: 11,
        json: 'src/composables/aceptacionScene.json',
        key: 'sun',
        box: [150, 265, 520, 520],
        color: (scene) => scene.sun.color,
        behind: (scene) => scene.sky.cream,
        skip: (scene) => [...scene.dots.map(([x, y, r]) => [x, y, r + 3]), ...scene.bits.map(([x, y, w, h]) => [x - 6, y - 6, w + 12, h + 12])],
    },
    // 4 Viriya: the sun going down behind the hills, over the dusk sky; the arcs keep above the hills
    viriya: {
        card: 4,
        json: 'src/composables/viriyaScene.json',
        key: 'sun',
        color: (scene) => scene.sun.color,
        behind: (scene, y) => nearest(scene.sky, y),
        ring: { centre: (scene) => [scene.sun.x, scene.sun.y], from: (scene) => scene.sun.r - 60, arcs: [[-155, -35]] },
    },
    // 24 Gratitud: two suns, one inside the other, as Metta's lights: the peach one over the sea's teal and the pink
    // one over the peach. Nothing is drawn over them. The scene's frame is the card's 63 px lower (its originals were
    // cut otherwise), so the clouds are moved down onto the scene's suns
    gratitud: {
        card: 24,
        json: 'src/composables/gratitudScene.json',
        key: 'sun',
        index: 0,
        shift: [0, 63],
        color: (scene) => scene.sun[0].color,
        behind: (scene, y, card) => card.median(20, 300, y, 1860, 2140),
        ring: { centre: () => [1089, 471], from: () => 140, to: () => 400, arcs: [[-180, 180]] },
    },
    'gratitud-pink': {
        card: 24,
        json: 'src/composables/gratitudScene.json',
        key: 'sun',
        index: 1,
        shift: [0, 63],
        color: (scene) => scene.sun[1].color,
        behind: (scene) => scene.sun[0].color,
        ring: { centre: () => [1089, 471], from: () => 60, to: () => 220, arcs: [[-180, 180]] },
    },
    // 6 Sacca: the great moon over the dusk sky (the sky read off the card on both sides, where the moon is not), the
    // clouds drawn over it and the rulito left out; the arcs keep above the boat and clear of Sid
    sacca: {
        card: 6,
        json: 'src/composables/saccaScene.json',
        key: 'moon',
        entry: () => ({ x: 1082, y: 1073, r: 506, color: 0xfefbd6 }),
        color: 0xfefbd6,
        behind: (scene, y, card) => card.median(0, 420, y, 1740, 2160),
        skip: (scene) => [
            ...scene.clouds.map(([, x, y, w, h]) => [x - 6, y - 6, w + 12, h + 12]),
            (([x, y, w, h]) => [x + w / 2, y + h / 2, Math.max(w, h) / 2 + 10])(scene.rulito),
        ],
        ring: { centre: () => [1082, 1073], from: () => 420, arcs: [[-180, 5]] },
    },
    // 32 Transformación: the little sun in the palm's crown, inside its navy ring (drawn over it); its yellow stipple
    // round the ring all dots, over the pink sky, its white stars left out
    transformacion: {
        card: 32,
        json: 'src/composables/transformacionScene.json',
        key: 'sun',
        box: [600, 160, 320, 320],
        color: (scene) => scene.sun.color,
        behind: (scene, y) => nearest(scene.sky, y),
        skip: (scene) => scene.stars.map(([x, y, r]) => [x, y, r + 3]),
    },
    // 27 Paciencia: the white sun over the teal sky; small, so all dots. The scene places it on its own (not in the card's
    // frame), measuring it from `centre` and `r`, the solid middle, written with the cloud
    paciencia: {
        card: 27,
        json: 'src/composables/pacienciaScene.json',
        key: 'sun',
        entry: () => ({ x: 1459, y: 392, r: 188, color: 0xf3f4f5 }),
        box: [1150, 80, 620, 620],
        color: 0xf3f4f5,
        behind: (scene, y, card) => card.median(1800, 2140, y),
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
const ringed = ({ x, y, cols, rows, bytes }, scene, spec, hidden) => {
    const [cx, cy] = spec.centre(scene);
    const from = spec.from(scene), to = spec.to ? spec.to(scene) : Infinity;
    const arcs = spec.arcs.map(([a, b]) => [a * Math.PI / 180, b * Math.PI / 180]);
    const ring = [];
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const dx = x + (col + 0.5) * CELL - cx, dy = y + (row + 0.5) * CELL - cy;
            const dist = Math.hypot(dx, dy), angle = Math.atan2(dy, dx);
            if (hidden.has(row * cols + col) || dist < from || dist > to || !arcs.some(([a, b]) => angle >= a && angle <= b)) continue;
            (ring[Math.round(dist / CELL)] ??= []).push(bytes[row * cols + col]);
        }
    }
    const mean = (d) => (ring[d] ? ring[d].reduce((a, b) => a + b, 0) / ring[d].length : 0);
    let whole = Math.ceil(from / CELL);
    while (whole < ring.length && mean(whole) > 0.9 * 255) whole++;
    // The sky's own texture reads as a little light everywhere: the faintest ring past the band is that floor, taken off
    let floor = Infinity;
    ring.forEach((values, d) => { if (d > whole) floor = Math.min(floor, mean(d)); });
    if (!Number.isFinite(floor)) floor = 0;
    ring.forEach((values, d) => { ring[d] = values.map((v) => Math.max(0, Math.round((v - floor) * 255 / (255 - floor)))); });
    // The band ends where three rings in a row are dark (a stray star far out does not stretch it)
    let reach = whole, dark = 0;
    for (let d = whole; d < ring.length && dark < 3; d++) {
        if (mean(d) > 3) { reach = d; dark = 0; } else dark++;
    }
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
    return { x: cx - (reach + 0.5) * CELL, y: cy - (reach + 0.5) * CELL, cols: side, rows: side, bytes: out, solid: (inner + 1) * CELL, floor: Math.round(floor) };
};

const make = async (name) => {
    const spec = CARDS[name];
    const file = path.join(root, spec.json);
    const scene = JSON.parse(await readFile(file, 'utf8'));
    if (spec.entry) scene[spec.key] = { ...spec.entry(scene), ...(scene[spec.key] ?? {}) };
    const entryOf = () => (spec.index === undefined ? scene[spec.key] : scene[spec.key][spec.index]);
    const { data, info } = await sharp(path.join(root, 'public', 'cards', `${spec.card}.webp`)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const centre = spec.ring?.centre(scene);
    const reachOut = spec.ring?.to ? spec.ring.to(scene) : 900;
    const [bx, by, bw, bh] = spec.box ?? [Math.max(0, Math.round(centre[0] - reachOut)), Math.max(0, Math.round(centre[1] - reachOut)), Math.round(2 * reachOut), Math.round(2 * reachOut)];
    // The card's own colour in a strip of a row (the median, so its dots do not count), for a sky that is not flat
    const card = {
        median(x0, x1, y, ...more) {
            const row = Math.max(0, Math.min(info.height - 1, Math.round(y)));
            const pixels = [];
            const strips = [[x0, x1], ...(more.length ? [[more[0], more[1]]] : [])];
            strips.forEach(([a, b]) => { for (let x = a; x < b; x++) { const i = (row * info.width + x) * 3; pixels.push([data[i], data[i + 1], data[i + 2]]); } });
            const mid = (c) => pixels.map((p) => p[c]).sort((a, b) => a - b)[pixels.length >> 1];
            return (mid(0) << 16) | (mid(1) << 8) | mid(2);
        },
    };
    const light = rgb(typeof spec.color === 'function' ? spec.color(scene) : spec.color);
    // The pixels of the card's other dots, once
    const skipped = new Uint8Array(info.width * info.height);
    (spec.skip ? spec.skip(scene) : []).forEach(([sx, sy, r, h]) => {
        if (h !== undefined) {                          // [x, y, w, h]: a box (a cloud drawn over the light)
            for (let y = Math.max(0, sy); y < Math.min(info.height, sy + h); y++) skipped.fill(1, y * info.width + Math.max(0, sx), y * info.width + Math.min(info.width, sx + r));
            return;
        }
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
        const back = rgb(spec.behind(scene, by + (row + 0.5) * CELL, card));
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
    // In a box, the sky's own texture reads as a little light everywhere: the box's border cells (where the light has
    // ended) give that floor, taken off every cell
    if (!spec.ring) {
        const border = [];
        for (let col = 0; col < cols; col++) border.push(bytes[col], bytes[(rows - 1) * cols + col]);
        for (let row = 0; row < rows; row++) border.push(bytes[row * cols], bytes[row * cols + cols - 1]);
        const floor = border.sort((a, b) => a - b)[Math.floor(border.length * 0.75)];
        if (floor > 0) {
            for (let i = 0; i < bytes.length; i++) bytes[i] = Math.max(0, Math.round((bytes[i] - floor) * 255 / (255 - floor)));
            console.log(name, 'floor', floor);
        }
    }
    let grid = { x: bx, y: by, cols, rows, bytes };
    if (spec.ring) grid = ringed(grid, scene, spec.ring, new Set(hidden));
    else if (spec.centre && by === 0) grid = complete(grid, spec.centre(scene));
    // A scene whose frame is not quite the card's (Gratitud's) moves the cloud onto its own light
    const [mx, my] = spec.shift ?? [0, 0];
    entryOf().cloud = { x: grid.x + mx, y: grid.y + my, cell: CELL, cols: grid.cols, rows: grid.rows, color: light, data: Buffer.from(grid.bytes).toString('base64'), ...(grid.solid ? { solid: grid.solid } : {}) };
    await writeFile(file, JSON.stringify(scene));
    const solid = grid.bytes.filter((b) => b > 200).length, any = grid.bytes.filter((b) => b > 8).length;
    if (grid.floor) console.log(name, 'floor', grid.floor);
    console.log(name, `${grid.cols}x${grid.rows} cells, ${any} with light, ${solid} solid`, grid.solid ? `disc ${grid.solid} (was ${entryOf().r})` : '');
};

const wanted = process.argv[2] ? [process.argv[2]] : Object.keys(CARDS);
for (const name of wanted) await make(name);
