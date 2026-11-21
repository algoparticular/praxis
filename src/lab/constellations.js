// The constellation of each world of Sid's (LabSid.vue): sitting by night now and then, the camera looks up to the sky
// and its stars come together into the figure of the zone's card, drawn from what the card draws, with threads of dots
// in the colour of its rulito (useStarField's `constellation`). Each figure is a list of strokes in a box from -1 to 1
// both ways (y down), each { points: [[x, y], ...], closed }; a stroke of one point is a lone star (an eye, a light).
// About twenty points each: the sky of a phone has some fifty stars to make it with.

const ring = (cx, cy, rx, ry, n, from = 0) => Array.from({ length: n }, (_, i) => {
    const a = from + (i / n) * Math.PI * 2;
    return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry];
});

// (a spiral from radius r0 to r1 over `turns` turns, n points evenly spread along it, so its stars are as far apart
// near the middle as further out)
const spiral = (r0, r1, turns, n) => {
    const end = turns * Math.PI * 2, at = (t) => r0 + (r1 - r0) * (t / end), fine = [];
    for (let k = 0, len = 0, last = null; k <= 600; k++) {
        const t = (k / 600) * end, p = [Math.cos(t - Math.PI / 2) * at(t), Math.sin(t - Math.PI / 2) * at(t)];
        if (last) len += Math.hypot(p[0] - last[0], p[1] - last[1]);
        fine.push({ p, len }); last = p;
    }
    const total = fine[fine.length - 1].len;
    return Array.from({ length: n }, (_, i) => fine.find((f) => f.len >= (total * i) / (n - 1)) ?? fine[fine.length - 1]).map((f) => f.p);
};

export const CONSTELLATIONS = {
    // Ciclos: a spiral opening from its middle, the cycle that comes round again and never to the same place
    15: [{ points: spiral(0.06, 0.92, 2.1, 19), closed: false }],
    // Metta: a heart
    8: [
        { points: [[0, -0.42], [-0.3, -0.82], [-0.72, -0.74], [-0.9, -0.3], [-0.66, 0.2], [-0.32, 0.56], [0, 0.88],
            [0.32, 0.56], [0.66, 0.2], [0.9, -0.3], [0.72, -0.74], [0.3, -0.82]], closed: true },
    ],
    // Upekkha: the yin and the yang, its S and its two eyes
    9: [
        { points: ring(0, 0, 0.86, 0.86, 12, -Math.PI / 2), closed: true },
        { points: [[0, -0.86], [-0.36, -0.62], [-0.38, -0.2], [0, 0], [0.38, 0.2], [0.36, 0.62], [0, 0.86]], closed: false },
        { points: [[0.02, -0.44]], closed: false },
        { points: [[-0.02, 0.44]], closed: false },
    ],
    // Paciencia: its pine cone, with its scales crossing and a little stem
    27: [
        { points: [[-0.2, -0.76], [-0.46, -0.55], [-0.55, -0.15], [-0.45, 0.3], [-0.22, 0.68], [0, 0.9], [0.22, 0.68],
            [0.45, 0.3], [0.55, -0.15], [0.46, -0.55], [0.2, -0.76]], closed: true },
        { points: [[0, -0.8], [0.08, -0.98]], closed: false },
        { points: [[-0.5, -0.32], [0.36, 0.46]], closed: false },
        { points: [[0.5, -0.32], [-0.36, 0.46]], closed: false },
        { points: [[-0.26, -0.66], [0.52, 0.02]], closed: false },
        { points: [[0.26, -0.66], [-0.52, 0.02]], closed: false },
    ],
    // Gratitud: the palm, with the little light over its crown
    24: [
        { points: [[0.12, 0.92], [0.18, 0.5], [0.12, 0.1], [-0.02, -0.3]], closed: false },
        { points: [[-0.02, -0.3], [-0.42, -0.42], [-0.78, -0.18]], closed: false },
        { points: [[-0.02, -0.3], [-0.3, -0.66], [-0.62, -0.7]], closed: false },
        { points: [[-0.02, -0.3], [0.36, -0.6], [0.7, -0.5]], closed: false },
        { points: [[-0.02, -0.3], [0.44, -0.3], [0.76, -0.02]], closed: false },
        { points: [[-0.04, -0.86]], closed: false },
    ],
    // Transformación: a sprout, its stem curving up and its two leaves open
    32: [
        { points: [[0.06, 0.94], [0.02, 0.56], [-0.06, 0.2], [0, -0.14]], closed: false },
        { points: [[-0.04, -0.1], [-0.36, -0.44], [-0.82, -0.48], [-0.52, -0.16]], closed: true },
        { points: [[0.04, -0.18], [0.3, -0.58], [0.76, -0.78], [0.58, -0.32]], closed: true },
    ],
    // Celebración: the fire, its tongues of flame over two crossed logs
    14: [
        { points: [[0, -0.92], [-0.18, -0.5], [-0.42, -0.62], [-0.52, -0.16], [-0.42, 0.26], [0, 0.44], [0.42, 0.26],
            [0.52, -0.16], [0.4, -0.56], [0.2, -0.34]], closed: true },
        { points: [[-0.8, 0.86], [0.7, 0.52]], closed: false },
        { points: [[0.8, 0.86], [-0.7, 0.52]], closed: false },
    ],
};
