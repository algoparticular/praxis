// The constellation of each world of Sid's (LabSid.vue): sitting by night now and then, the camera looks up to the sky
// and its stars come together into the figure of the zone's card, drawn from what the card draws, with threads of dots
// in the colour of its rulito (useStarField's `constellation`). Each figure is a list of strokes in a box from -1 to 1
// both ways (y down), each { points: [[x, y], ...], closed }; a stroke of one point is a lone star (an eye, a light).
// About twenty points each: the sky of a phone has some fifty stars to make it with.

const ring = (cx, cy, rx, ry, n, from = 0) => Array.from({ length: n }, (_, i) => {
    const a = from + (i / n) * Math.PI * 2;
    return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry];
});

export const CONSTELLATIONS = {
    // Ciclos: the round body of its sky, the moon and the sun in one, split by the wave where night and day meet
    15: [
        { points: ring(0, 0, 0.86, 0.86, 12, -Math.PI / 2), closed: true },
        { points: [[-0.84, 0.18], [-0.45, -0.18], [-0.08, 0.02], [0.3, 0.24], [0.62, 0.02], [0.84, -0.2]], closed: false },
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
    // Paciencia: the pine cone, and the roots that grow from it
    27: [
        { points: [[0, -0.9], [-0.3, -0.7], [-0.4, -0.34], [-0.28, 0.02], [0, 0.14], [0.28, 0.02], [0.4, -0.34], [0.3, -0.7]], closed: true },
        { points: [[0, 0.14], [-0.1, 0.42], [-0.38, 0.62], [-0.66, 0.9]], closed: false },
        { points: [[0, 0.14], [0.06, 0.5], [0.02, 0.9]], closed: false },
        { points: [[-0.1, 0.42], [0.28, 0.6], [0.6, 0.84]], closed: false },
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
