// A little spiral galaxy of particles: a warm core and two arms of stars that turn slowly, the inner ones faster than
// the outer ones, tilted as if seen a little from the side. Its stars are flat dots; a soft glow lies under its core and
// along its arms. It is two `dynamic` groups for useStardust (Dana's sky, and the cloud Nekkhamma becomes):
//   const galaxy = createGalaxy({ at: (w, h) => ({ x, y, R }) });
//   groups: [{ ...soft, dynamic: galaxy.glow }, { ...hard, dynamic: galaxy.stars }]
// `at` says where its middle is and its radius, in px of the canvas, every frame. `stars` and `glow` are its colours
// (the arms' stars, then the glows along the arms and of the core), and `turn` how fast it turns.

const ARM_STARS = 620, ARM_GLOW = 90, TILT = -0.4, FLAT = 0.5;

const fill = (data, i, x, y, size, alpha, color) => {
    data.positions[i * 3] = x;
    data.positions[i * 3 + 1] = y;
    data.sizes[i] = size;
    data.alphas[i] = alpha;
    data.tints[i * 3] = (color >> 16 & 255) / 255;
    data.tints[i * 3 + 1] = (color >> 8 & 255) / 255;
    data.tints[i * 3 + 2] = (color & 255) / 255;
};

const galaxyStar = (i, glow) => {
    const a = Math.sin(i * 12.9898 + (glow ? 7 : 0)) * 0.5 + 0.5, b = Math.sin(i * 78.233 + 1) * 0.5 + 0.5;
    const c = Math.sin(i * 39.425 + 3) * 0.5 + 0.5;
    // A fifth of the stars are the bulge round the core, a fifth the faint disc between the arms, the rest the arms
    const core = !glow && i % 5 === 0, disc = !glow && i % 5 === 1;
    const r = core ? 0.25 * a * a : 0.06 + 0.94 * a ** 0.75;
    const arm = i % 2 ? Math.PI : 0;
    const angle = core || disc ? b * Math.PI * 2 : arm + Math.log(r / 0.06 + 1) * 3.1 + (b - 0.5) * (1.5 - 0.8 * r);
    return { r: r + (c - 0.5) * 0.06, angle, c };
};
const STARS_OF = Array.from({ length: ARM_STARS }, (_, i) => galaxyStar(i, false));
const GLOW_OF = Array.from({ length: ARM_GLOW }, (_, i) => galaxyStar(i, true));

export function createGalaxy({
    at,
    stars = [0xfff3b8, 0xf6e27c, 0xffb454, 0xee6a82, 0xf0605d, 0xfaf3d4, 0xd8f4f2],
    arms = [0xee6a82, 0xf6e27c],
    core = [0xffb454, 0xfff3b8],
    turn = 0.05,
} = {}) {
    let place = { x: 0, y: 0, R: 1 };
    const orbit = (g, t) => {
        const angle = g.angle + t * turn / (0.3 + g.r);
        const x = Math.cos(angle) * g.r, y = Math.sin(angle) * g.r * FLAT;
        return [place.x + (x * Math.cos(TILT) - y * Math.sin(TILT)) * place.R, place.y + (x * Math.sin(TILT) + y * Math.cos(TILT)) * place.R, place.R];
    };
    const glow = {
        count: ARM_GLOW + 6,
        update(t, data) {
            place = at();
            if (!place) return;
            for (let i = 0; i < data.count; i++) {
                if (i >= ARM_GLOW) {
                    // The core: a few big warm glows on top of each other
                    fill(data, i, place.x, place.y, place.R * (0.25 + 0.15 * (i - ARM_GLOW)), 0.22, core[i % core.length]);
                    continue;
                }
                const g = GLOW_OF[i];
                const [x, y, radius] = orbit(g, t);
                fill(data, i, x, y, radius * (0.35 + 0.3 * g.c), 0.07 + 0.08 * (1 - Math.min(1, g.r)), i % 3 ? arms[0] : arms[1 % arms.length]);
            }
        },
    };
    const starGroup = {
        count: ARM_STARS,
        update(t, data) {
            place = at();
            if (!place) return;
            for (let i = 0; i < data.count; i++) {
                const g = STARS_OF[i];
                const [x, y] = orbit(g, t);
                const near = 1 - Math.min(1, g.r);
                fill(data, i, x, y, 1 + 2.2 * g.c * (0.5 + near),
                    (0.35 + 0.65 * near) * (0.7 + 0.3 * Math.sin(t * (1 + g.c * 2) + i)),
                    g.r < 0.15 ? stars[i % 2] : stars[i % stars.length]);
            }
        },
    };
    return { glow, stars: starGroup };
}
