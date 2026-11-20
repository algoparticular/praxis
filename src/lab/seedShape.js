// The seed of Sid's world, until the illustrator draws it: a seed's shape (a drop leaning a little, round at the
// bottom, its seam down one side) with a particle of light inside it, its germ (everything started from a particle).
// In a box of 40 x 52 (its middle at 20, its foot at 50). Drawn by sidWorld.js on the ground and by LabSid.vue as it flies.
export const SEED_BOX = [40, 52];
export const SEED_OUTLINE = 'M23 2 C30 10 37 20 36 32 C35 43 28 50 20 50 C11 50 4 43 4 32 C4 19 14 9 23 2 Z';
export const SEED_SEAM = 'M22.5 5 C19 15 17 25 18.5 37';
export const SEED_GERM = [25, 33, 4.6];      // (x, y, radius)

// The seed as an SVG, for what flies over the world (fill: its body; germ: its particle of light; line: its ink)
export function seedSvg({ fill = '#F7F8F1', germ = '#FFF4D6', line = '#143246' } = {}) {
    const [w, h] = SEED_BOX, [gx, gy, gr] = SEED_GERM;
    return `<svg viewBox="-3 -3 ${w + 6} ${h + 6}" xmlns="http://www.w3.org/2000/svg">`
        + `<path d="${SEED_OUTLINE}" fill="${fill}" stroke="${line}" stroke-width="3" stroke-linejoin="round"/>`
        + `<path d="${SEED_SEAM}" fill="none" stroke="${line}" stroke-width="2.2" stroke-linecap="round" opacity="0.8"/>`
        + `<circle cx="${gx}" cy="${gy}" r="${gr}" fill="${germ}"/></svg>`;
}
