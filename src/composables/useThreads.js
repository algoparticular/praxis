// Threads of light (Ver): spirals of dots that join one point to another, as Pañña's (ScenePanna.vue) and Esperanza's
// (SceneEsperanza.vue). A thread starts as a point at the light it leaves, swells into a double helix and closes into a
// point at the one it reaches; its dots take the colours of the two ends as they flow from one to the other, and a soft
// glow runs under it so it reads as a line of light.
// createThreads({ slots }) gives a set of `slots` threads drawn into one dynamic particle group of useStardust:
//   tick(dt, speed)         moves the flow on (`speed` 1 is FLOW lengths a second; more while something rushes)
//   draw(slot, data, t, from, to, [ca, cb], options)   writes one thread into its slot ({ unit, amp or widest, strength,
//                           grow, dir }; `widest` caps the helix's width, 28 px by default, a tenth of its length at most)
//   hide(slot, data)        hides a slot
//   begin()                 forgets the threads drawn in the last frame (call before drawing a frame's threads)
//   glow                    a dynamic group ({ count, update }) for the soft glow under the threads drawn this frame
//   count                   how many particles the threads take (the group's count is this plus any extra points)
//   surge                   0..1, set by the scene: the dots swell while something has just happened
//   hole                    optional, set by the scene each frame: { x, y, r, opening } (group coordinates, opening 0..1)
//                           or null. Where a thread crosses that circle its two strands part and go round it like the
//                           outline of an eye, and the glow under it dims there (Pañña's rulito over Sid's head)
const TURN = 100;          // px of a thread per turn of the helix
const DOTS = 72;           // dots in each strand of a thread (the shorter ones use fewer)
const DUST = 20;
const PER = DOTS * 2 + DUST;                   // the particles of one thread
const FLOW = 0.05;         // lengths of a thread per second
const GLOW_DOTS = 30;

export const smooth = (a, b, x) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
const wrap = (v) => v - Math.floor(v);
export const rgbOf = (hex) => [(hex >> 16 & 255) / 255, (hex >> 8 & 255) / 255, (hex & 255) / 255];

export const createThreads = ({ slots }) => {
    let flowPhase = 0;
    const drawn = [];

    // Where a thread crosses the hole, `parting(f)` is how far (0..1) it is open at f, `around(f, side)` how far a
    // strand going round on that side (+1 or -1) is pushed off the thread's line there, and `calm(f)` how still its helix
    // is: wholly still inside the opening and waking slowly over a longer stretch on both sides, so the two strands draw
    // one clean eye (if the helix came back as soon as the opening ended, its first turn made a neck and a second bulb,
    // a vase); null when it does not cross it
    const opener = (x0, y0, dx, dy, length, nx, ny) => {
        const hole = api.hole;
        if (!hole || !(hole.opening > 0.001)) return null;
        const along = ((hole.x - x0) * dx + (hole.y - y0) * dy) / length;
        const off = (hole.x - x0) * nx + (hole.y - y0) * ny;            // the circle's centre, sideways from the line
        if (Math.abs(off) > hole.r || along < -hole.r || along > length + hole.r) return null;
        const span = 1.9 * hole.r;
        const parting = (f) => {
            const u = (f * length - along) / span;
            return Math.abs(u) >= 1 ? 0 : hole.opening * (0.5 + 0.5 * Math.cos(Math.PI * u));
        };
        const calm = (f) => {
            const u = Math.abs(f * length - along) / span;
            return hole.opening * (1 - smooth(0.6, 1.8, u));
        };
        return { parting, calm, around: (f, side) => (off + side * hole.r) * parting(f) };
    };

    const api = {
        count: slots * PER,
        surge: 0,
        hole: null,
        tick(dt, speed = 1) { flowPhase += dt * FLOW * speed; },
        begin() { drawn.length = 0; },
        hide(slot, data) { data.alphas.fill(0, slot * PER, (slot + 1) * PER); },

        // One thread from one point to another (group coordinates): a double helix of dots flowing from the first point to
        // the second, as wide as `amp` at the middle and a point at both ends; `grow` (0..1) is how far it has reached,
        // `dir` -1 makes it flow the other way
        draw(slot, data, t, from, to, [ca, cb], { unit = 1, amp = null, widest = 28, strength = 1, grow = 1, dir = 1 } = {}) {
            const [x0, y0] = from;
            const x1 = x0 + (to[0] - x0) * grow, y1 = y0 + (to[1] - y0) * grow;
            const dx = x1 - x0, dy = y1 - y0;
            const length = Math.max(1, Math.hypot(dx, dy));
            const width = amp ?? Math.min(widest * unit, length * 0.1);
            const strands = Math.min(DOTS, Math.max(8, Math.round(length / 6)));
            const dust = Math.min(DUST, Math.max(3, Math.round(length / 24)));
            const nx = dy / length, ny = -dx / length;          // sideways
            const turns = length / TURN;
            const surge = api.surge;
            const open = opener(x0, y0, dx, dy, length, nx, ny);
            let i = slot * PER;
            const place = (f, side, size, alpha) => {
                data.positions[i * 3] = x0 + dx * f + nx * side;
                data.positions[i * 3 + 1] = y0 + dy * f + ny * side;
                data.sizes[i] = size;
                data.alphas[i] = alpha;
                for (let c = 0; c < 3; c++) data.tints[i * 3 + c] = ca[c] + (cb[c] - ca[c]) * f;
            };
            for (let strand = 0; strand < 2; strand++) {
                for (let d = 0; d < DOTS; d++, i++) {
                    if (d >= strands) { data.alphas[i] = 0; continue; }
                    const f = wrap(d / strands + dir * flowPhase);
                    const lens = Math.sin(Math.PI * f) ** 0.7;                // 0 at both ends: a point
                    const wave = Math.PI * 2 * turns * f + strand * Math.PI - t * 0.4;
                    const near = 0.5 + 0.5 * Math.cos(wave);                  // 1 when the dot passes in front
                    const pulse = Math.max(0, Math.sin(f * 15 - t * 2.1)) ** 3;
                    // Round the hole the helix calms into two clean arcs, strand 0 on one side and strand 1 on the other
                    const side = open ? Math.sin(wave) * width * lens * (1 - open.calm(f)) + open.around(f, strand ? -1 : 1)
                        : Math.sin(wave) * width * lens;
                    place(f, side, (3.8 + 3 * near + 2.4 * pulse + 2.2 * surge) * unit * (0.4 + 0.6 * lens),
                        smooth(0, 0.08, f) * smooth(0, 0.08, 1 - f) * strength * (0.7 + 0.3 * near));
                }
            }
            // Dust: tinier and quicker, loosely following the helix
            for (let d = 0; d < DUST; d++, i++) {
                if (d >= dust) { data.alphas[i] = 0; continue; }
                const seed = d * 12.9898;
                const r = (n) => { const v = Math.sin(seed + n * 78.233) * 43758.5453; return v - Math.floor(v); };
                const f = wrap(r(1) + dir * flowPhase * (1.6 + r(2) * 1.6));
                const lens = Math.sin(Math.PI * f) ** 0.7;
                const wave = Math.PI * 2 * turns * f + r(3) * 6.28;
                const spread = (r(4) - 0.5) * 2 * width * 1.5 * lens + Math.sin(wave + t) * 4 * lens;
                place(f, open ? spread * (1 - 0.7 * open.calm(f)) + open.around(f, r(4) < 0.5 ? -1 : 1) : spread, (1.4 + r(5) * 1.5) * unit,
                    smooth(0, 0.08, f) * smooth(0, 0.08, 1 - f) * strength * (0.35 + 0.5 * r(6)) * (0.6 + 0.4 * Math.sin(t * 2 + d)));
            }
            drawn.push({ slot, from: [x0, y0], to: [x1, y1], colours: [ca, cb], strength, length, unit });
        },

        // A soft glow under every thread drawn this frame: big faint motes along its middle, brighter where it is wide
        glow: {
            count: slots * GLOW_DOTS,
            update(t, data) {
                data.alphas.fill(0);
                drawn.forEach(({ slot, from, to, colours: [ca, cb], strength, length, unit }) => {
                    const dx = to[0] - from[0], dy = to[1] - from[1], len = Math.max(1, Math.hypot(dx, dy));
                    const open = opener(from[0], from[1], dx, dy, len, dy / len, -dx / len);
                    for (let k = 0; k < GLOW_DOTS; k++) {
                        const f = (k + 0.5) / GLOW_DOTS;
                        const i = slot * GLOW_DOTS + k;
                        const lens = Math.sin(Math.PI * f) ** 0.7;
                        data.positions[i * 3] = from[0] + (to[0] - from[0]) * f;
                        data.positions[i * 3 + 1] = from[1] + (to[1] - from[1]) * f;
                        data.sizes[i] = (24 + 8 * Math.sin(t * 1.3 + k * 0.5 + slot)) * unit * (0.25 + 0.75 * lens);
                        data.alphas[i] = 0.16 * strength * smooth(0, 0.12, f) * smooth(0, 0.12, 1 - f) * Math.min(1, length / GLOW_DOTS / 10)
                            * (open ? 1 - 0.9 * open.parting(f) : 1);
                        for (let c = 0; c < 3; c++) data.tints[i * 3 + c] = ca[c] + (cb[c] - ca[c]) * f;
                    }
                });
            },
        },
    };
    return api;
};
