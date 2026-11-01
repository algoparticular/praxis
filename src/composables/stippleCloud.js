// A stipple turned back into particles: a density map of the original's dots ({ x, y, cell, cols, rows, color, data },
// data one byte per cell, base64; pannaClouds.json, or a light's `cloud` made by scripts/sun-cloud.mjs) sampled into
// dots at whatever size the scene draws it. Pañña's sun was the first drawn this way, whole, with no solid disc under
// it, so nothing shows the edge of a circle.

const DENSITY = 4.8;        // how many dots' worth of area per area where the stipple is solid
const DOT = 5.5;            // diameter of a dot of the original, in its 2160px units

export const decodeCloud = (cloud) => ({ ...cloud, bytes: Uint8Array.from(atob(cloud.data), (c) => c.charCodeAt(0)) });

// map(u, v) turns a spot of the 2160 square into canvas pixels; k is canvas pixels per unit; boost thickens it.
// Returns [x, y, size] for each dot
export const sampleCloud = (grid, map, k, boost = 1) => {
    const out = [];
    const base = Math.max(1.5, DOT * k);
    for (let row = 0; row < grid.rows; row++) {
        for (let col = 0; col < grid.cols; col++) {
            const v = grid.bytes[row * grid.cols + col] / 255;
            if (v < 0.03) continue;
            const dot = base * (1 + 1.3 * v ** 4);                              // the solid core gets bigger dots
            const wanted = (grid.cell * k) ** 2 * DENSITY * boost * v ** 1.3 / (Math.PI / 4 * dot * dot);
            let n = Math.floor(wanted);
            if (Math.random() < wanted - n) n++;
            for (let i = 0; i < n; i++) {
                const [x, y] = map(grid.x + (col + Math.random()) * grid.cell, grid.y + (row + Math.random()) * grid.cell);
                out.push([x, y, dot * (0.8 + Math.random() * 0.4)]);
            }
        }
    }
    return out;
};

// A light drawn as a disc with its stippled band as particles is one thing, never a circle on its own: the band appears
// with the node's entrance and the disc comes just behind its dots, so they always cover its edge. Call it every frame,
// and add the returned y to the band's shift (and its scale to the band's grow, if the entrance scales) so it rises with
// the disc. index may be a list of groups; opacity is the light's own
export const joinLight = (dust, index, node, disc, opacity = 1) => {
    const e = node.entering();
    // The disc's own entrance already fades it by e.alpha: with this it is (e.alpha * faded) ** 1.5 in all, a little behind
    // its dots (so they always cover its edge) but close enough that the two appear as one
    if (disc) disc.opacity = dust ? opacity * Math.sqrt(e.alpha) * dust.faded ** 1.5 : 0;
    if (dust) [].concat(index).forEach((i) => dust.fade(i, e.alpha * opacity));
    return e;
};
