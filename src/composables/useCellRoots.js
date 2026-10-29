// The roots of Hogar (its verb is Arraigar, take root): from the foot of every mushroom of the crown a thin root of
// light grows inwards across the water of the cell to the nucleus, the spark at its heart. Drawn on a 2D canvas that the
// stage shows as a texture over the inside of the planet (`area`, a box in fractions of the scene's square frame).
// The ends of each root are given every frame (the crown turns and the nucleus floats, so the roots bend with them):
// the line between them wanders with its own curve, made once, and sways a little. Each root grows in its own stretch
// of the shared `grow` (0..1): `start(i)` to `arrival(i)`, the arrivals spread so the roots reach the nucleus one by
// one, in no order. `sizes` are the mushrooms' sizes (any unit): a bigger mushroom has a thicker root. `back[i]` (0..1, or below 0) is a bead of light running back up root i, from the nucleus to its
// mushroom; `pulse` (0..1, or below 0) a wave running out of the nucleus along all of them; `level` (0..3) how many
// times it has been completed, which makes them brighter. Light is the warm orange of the spark.

const LIGHT = '255, 196, 128';
const TIP = '255, 236, 200';
const STEPS = 18;

const rand = (min, max) => min + Math.random() * (max - min);

export function createCellRoots(canvas, { sizes, area }) {
    const count = sizes.length;
    const biggest = Math.max(...sizes);
    const ctx = canvas.getContext('2d');
    const roots = [];

    // The order the roots arrive in is shuffled, and the arrivals are spread from a fifth of the way to the end
    const order = [...Array(count).keys()].sort(() => Math.random() - 0.5);
    for (let i = 0; i < count; i++) {
        const arrival = 0.2 + 0.8 * Math.min(1, (order[i] + rand(0, 0.6)) / (count - 0.4));
        roots.push({
            arrival,
            start: Math.max(0, arrival - rand(0.24, 0.4)),
            bend: rand(-0.13, 0.13),                     // its curve: a bow, and a smaller wave on it
            wave: rand(-0.05, 0.05),
            phase: rand(0, Math.PI * 2),
            twig: rand(0.3, 0.6),                        // where a short twig leaves it, which side and how long
            side: Math.random() < 0.5 ? -1 : 1,
            reach: rand(0.08, 0.18),
            width: (0.45 + 0.55 * sizes[i] / biggest) * rand(0.85, 1.15),
        });
    }

    // The points of root i, in frame fractions, from its foot (s = 0) to the nucleus (s = 1)
    const path = (r, foot, core, t) => {
        const dx = core.x - foot.x, dy = core.y - foot.y;
        const len = Math.hypot(dx, dy) || 1e-6;
        const nx = -dy / len, ny = dx / len;
        // It ends on the nucleus's rim, not at its centre
        const end = Math.max(0, 1 - core.r * 0.85 / len);
        const pts = [];
        for (let k = 0; k <= STEPS; k++) {
            const s = k / STEPS * end;
            const off = len * (r.bend * Math.sin(Math.PI * s) + r.wave * Math.sin(2 * Math.PI * s + r.phase))
                + len * 0.012 * Math.sin(t * 0.8 + r.phase + s * 5) * Math.sin(Math.PI * s);
            pts.push({ x: foot.x + dx * s + nx * off, y: foot.y + dy * s + ny * off, s: s / end });
        }
        return pts;
    };

    // The part of a line up to `f` (0..1 along it), and the point where it stops
    const upTo = (pts, f) => {
        if (f >= 1) return { line: pts, tip: null };
        const at = f * (pts.length - 1);
        const i = Math.floor(at);
        const a = pts[i], b = pts[Math.min(i + 1, pts.length - 1)];
        const tip = { x: a.x + (b.x - a.x) * (at - i), y: a.y + (b.y - a.y) * (at - i) };
        return { line: [...pts.slice(0, i + 1), tip], tip };
    };
    const pointAt = (pts, f) => upTo(pts, Math.max(0.0001, Math.min(1, f))).line.at(-1);

    // grow 0..1; feet: [{ x, y }] the foot of each root; core: { x, y, r } the nucleus (frame fractions); size: the
    // canvas's width in CSS px (it is not laid out on the page); quiet: 0..1, how much the roots dim while time runs
    const frame = ({ grow = 0, feet, core, back = [], pulse = -1, level = 0, quiet = 0, t = 0, size }) => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const cw = Math.min(1100, Math.round(size * dpr));
        const ch = Math.round(cw * area.h / area.w);
        if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, cw, ch);
        if (grow <= 0) return;
        // From frame fractions to the canvas
        const k = cw / area.w;
        ctx.setTransform(k, 0, 0, k, -area.left * k, -area.top * k);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalCompositeOperation = 'lighter';
        const alive = (0.38 + 0.1 * level) * (0.88 + 0.12 * Math.sin(t * 1.5)) * (1 - 0.45 * quiet);
        const unit = core.r * 0.045;                                 // the width of a root, from the size of the nucleus

        roots.forEach((r, i) => {
            const f = Math.min(1, Math.max(0, (grow - r.start) / (r.arrival - r.start)));
            if (f <= 0) return;
            const pts = path(r, feet[i], core, t);
            const { line, tip } = upTo(pts, f);
            const w = unit * r.width;
            const stroke = (pl, alpha, width) => {
                ctx.beginPath();
                pl.forEach((q, j) => ctx[j ? 'lineTo' : 'moveTo'](q.x, q.y));
                ctx.strokeStyle = `rgba(${LIGHT}, ${alpha})`;
                ctx.lineWidth = width;
                ctx.stroke();
            };
            stroke(line, alive * 0.08, w * 6);
            stroke(line, alive * 0.8, w);
            // The twig, once the root has passed where it leaves
            const tf = Math.min(1, Math.max(0, (f - r.twig) / 0.25));
            if (tf > 0) {
                const from = pointAt(pts, r.twig);
                const ahead = pointAt(pts, r.twig + 0.06);
                const ax = ahead.x - from.x, ay = ahead.y - from.y, al = Math.hypot(ax, ay) || 1e-6;
                const len = r.reach * core.r * 3 * tf;
                const turn = r.side * 0.9;
                const tx = from.x + (ax / al * Math.cos(turn) - ay / al * Math.sin(turn)) * len;
                const ty = from.y + (ax / al * Math.sin(turn) + ay / al * Math.cos(turn)) * len;
                stroke([from, { x: (from.x + tx) / 2 + r.side * len * 0.15 * -ay / al, y: (from.y + ty) / 2 + r.side * len * 0.15 * ax / al }, { x: tx, y: ty }], alive * 0.6, w * 0.6);
            }
            if (tip) {                                               // the tip that is still growing shines
                ctx.fillStyle = `rgba(${TIP}, ${0.9 * alive})`;
                ctx.beginPath();
                ctx.arc(tip.x, tip.y, w * 1.6, 0, Math.PI * 2);
                ctx.fill();
            }
            // Light running along it: back up to its mushroom, or the wave out of the nucleus
            [back[i] ?? -1, pulse].forEach((b, n) => {
                if (b < 0 || b > 1 || f < 1) return;
                const p = pointAt(pts, 1 - b);
                const R = unit * 5;
                const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, R);
                g.addColorStop(0, `rgba(${TIP}, ${n ? 0.5 : 0.7})`);
                g.addColorStop(1, `rgba(${LIGHT}, 0)`);
                ctx.fillStyle = g;
                ctx.fillRect(p.x - R, p.y - R, R * 2, R * 2);
            });
        });
    };

    return { frame, arrival: (i) => roots[i].arrival, start: (i) => roots[i].start };
}
