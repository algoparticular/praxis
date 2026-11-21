// The constellation of each world of Sid's (LabSid.vue): sitting by night now and then, the camera looks up to the sky
// and its stars come together into the figure of the zone's card, drawn from what the card draws, with threads of dots
// in the colour of its rulito (useStarField's `constellation`). Each figure is a list of strokes in a box from -1 to 1
// both ways (y down), each { points: [[x, y], ...], closed }; a stroke of one point is a lone star (an eye, a light).
// About twenty points each: the sky of a phone has some fifty stars to make it with.

const ring = (cx, cy, rx, ry, n, from = 0) => Array.from({ length: n }, (_, i) => {
    const a = from + (i / n) * Math.PI * 2;
    return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry];
});

// (an arc of a circle, from one angle to another, n points)
const arc = (cx, cy, r, from, to, n) => Array.from({ length: n }, (_, i) => {
    const a = from + (to - from) * (i / (n - 1));
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
});

export const CONSTELLATIONS = {
    // Ciclos: the day and the night of its cycle, side by side: a sun with its rays (lone stars) and a crescent moon
    15: [
        { points: ring(-0.42, 0, 0.27, 0.27, 7, -Math.PI / 2), closed: true },
        // (its rays: a lone star each, round it)
        ...ring(-0.42, 0, 0.48, 0.48, 8, -Math.PI / 2).map((p) => ({ points: [p], closed: false })),
        { points: [...arc(0.6, 0, 0.42, Math.PI * 0.62, Math.PI * 1.38, 6), ...arc(0.8, 0, 0.36, Math.PI * 1.3, Math.PI * 0.7, 4)], closed: true },
    ],
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
    // Transformación: the seed, its root going down and its sprout going up with two leaves
    32: [
        { points: [[0, -0.18], [-0.24, -0.06], [-0.26, 0.16], [0, 0.3], [0.26, 0.16], [0.24, -0.06]], closed: true },
        { points: [[0, 0.3], [-0.1, 0.56], [0.08, 0.74], [-0.04, 0.94]], closed: false },
        { points: [[0, -0.18], [0.04, -0.5], [0, -0.92]], closed: false },
        { points: [[0.04, -0.5], [-0.34, -0.66], [-0.5, -0.52]], closed: false },
        { points: [[0.02, -0.72], [0.36, -0.86], [0.52, -0.7]], closed: false },
    ],
    // Celebración: the fire, its tongues of flame over two crossed logs
    14: [
        { points: [[0, -0.92], [-0.18, -0.5], [-0.42, -0.62], [-0.52, -0.16], [-0.42, 0.26], [0, 0.44], [0.42, 0.26],
            [0.52, -0.16], [0.4, -0.56], [0.2, -0.34]], closed: true },
        { points: [[-0.8, 0.86], [0.7, 0.52]], closed: false },
        { points: [[0.8, 0.86], [-0.7, 0.52]], closed: false },
    ],
};
