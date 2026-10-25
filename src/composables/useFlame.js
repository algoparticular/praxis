// A flame made of particles, as a dynamic group for useStardust. Each particle is born at the base, rises with a sway,
// shrinks and fades, and changes colour with age along a palette. Optionally a ring of embers hangs around a centre,
// as if something were lit from inside.
//
// anchor() is read every frame and says where the flame is now (canvas pixels):
//   { x, y, radius, height, unit }  base centre, half width at the base, how far a tongue rises, size scale
//   { halo: { x, y, r } }           optional: the centre and radius of the ring of embers
// The returned `flare` can be raised to 1 to make the flame leap up and widen; it settles by itself.

const mix = (a, b, u) => a + (b - a) * u;

export function createFlame({ count = 160, halo = 0, palette, anchor, rise = 1.6, size = 4.5 }) {
    const total = count + halo;
    // Fixed seeds so the flame behaves the same on every visit
    const seed = Array.from({ length: total }, (_, i) => {
        const r = (n) => { const x = Math.sin(i * 127.1 + n * 311.7) * 43758.5453; return x - Math.floor(x); };
        return { a: r(1), b: r(2), c: r(3), d: r(4), e: r(5) };
    });
    const colours = palette.map((c) => [(c >> 16 & 255) / 255, (c >> 8 & 255) / 255, (c & 255) / 255]);
    const state = { flare: 0, lastT: 0 };

    const colourAt = (u, out, i) => {
        const f = Math.min(0.9999, Math.max(0, u)) * (colours.length - 1);
        const k = Math.floor(f);
        const m = f - k;
        for (let ch = 0; ch < 3; ch++) out[i * 3 + ch] = mix(colours[k][ch], colours[k + 1][ch], m);
    };

    const dynamic = {
        count: total,
        update(t, data) {
            const dt = Math.min(0.1, Math.max(0, t - state.lastT));
            state.lastT = t;
            state.flare = Math.max(0, state.flare - dt * 0.7);
            const f = state.flare;
            const at = anchor();
            if (!at) return;

            for (let i = 0; i < count; i++) {
                const s = seed[i];
                const period = (1.1 + s.a * 1.3) / rise;
                const age = (t / period + s.b) % 1;
                const lift = 0.55 + 0.45 * s.c;
                const spread = (s.d - 0.5) * 2 * at.radius * (1 - age * 0.7) * (1 + f * 0.5);
                const sway = Math.sin(t * (1.6 + s.e * 1.4) + s.a * 20) * at.radius * 0.45 * age;
                data.positions[i * 3] = at.x + spread + sway;
                data.positions[i * 3 + 1] = at.y - age * at.height * lift * (1 + f * 0.8);
                data.sizes[i] = size * at.unit * (0.5 + 0.9 * s.e) * (1 - age) ** 0.8 * (1 + f * 0.6);
                data.alphas[i] = Math.min(1, age * 7) * (1 - age) ** 1.1 * (0.75 + f * 0.25);
                colourAt(age, data.tints, i);
            }

            // Embers around a centre
            if (halo && at.halo) {
                for (let k = 0; k < halo; k++) {
                    const i = count + k;
                    const s = seed[i];
                    const angle = s.a * Math.PI * 2 + t * (0.15 + s.b * 0.35) * (s.c < 0.5 ? -1 : 1);
                    const reach = at.halo.r * (1.12 + s.d * 0.7 + f * 0.4) + Math.sin(t * 2.1 + s.e * 9) * at.halo.r * 0.06;
                    data.positions[i * 3] = at.halo.x + Math.cos(angle) * reach;
                    data.positions[i * 3 + 1] = at.halo.y + Math.sin(angle) * reach;
                    data.sizes[i] = size * at.unit * (0.45 + 0.7 * s.e) * (1 + f * 0.5);
                    data.alphas[i] = (0.3 + 0.5 * (0.5 + 0.5 * Math.sin(t * 3 + s.a * 30))) * (1 + f * 0.4);
                    colourAt(0.1 + s.c * 0.8, data.tints, i);
                }
            }
        },
    };

    return {
        group: () => ({ colors: [0xffffff], dynamic, parallax: 0, drift: 0, twinkle: 0, reach: 0, look: 'hard' }),
        flare: (amount = 1) => { state.flare = Math.max(state.flare, amount); },
    };
}
