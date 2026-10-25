// Density maps of a stipple (a coarse grid of how much of each cell was covered in the original picture), turned back into
// particles at whatever size they are drawn. The shape of a glow comes from the artwork; the dots are new.

const DENSITY = 4.8;        // how many dots' worth of area per area where the stipple is solid
const DOT = 5.5;            // diameter of a dot of the original, in its own picture's pixel units

export const decodeClouds = (clouds) => Object.fromEntries(Object.entries(clouds).map(([name, cloud]) => [
    name, { ...cloud, bytes: Uint8Array.from(atob(cloud.data), (c) => c.charCodeAt(0)) },
]));

export const hexOf = ([r, g, b]) => (r << 16) | (g << 8) | b;

// map(u, v) turns a spot of the original picture into canvas pixels; k is canvas pixels per picture pixel
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
