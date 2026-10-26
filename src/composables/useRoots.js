// The roots of Paciencia (its verb is Arraigar, take root): a glowing network that spreads under the field of
// mushrooms from the pine cone, drawn on a 2D canvas that lies over the mushrooms picture (same box, so it moves with it).
// Every visit grows a different network. It is a set of paths made once: from the foot of the cone a few main roots
// spread to both sides, they branch, and a thin root reaches up to each mushroom cap that is near enough (mushroomCaps.json
// says where the caps are, as fractions of the picture). Each point knows when the root gets to it (`t`, 0 at the cone
// to 1 at the farthest tip), so one number, `grow`, says how far the roots have spread. `pulse` is a wave of light
// that runs along them (it lights each cap as it gets there); `level` (0..3) is how many times it has completed, which
// makes the network brighter and thicker. Light is the pine cone's own gold.

import caps from './mushroomCaps.json';

const ASPECT = 2400 / 225;                   // the mushrooms picture is 2400 x 225
const ORIGIN = [0.4767 * ASPECT, 0.72];      // the foot of the pine cone, in units of the picture's height
const TOP = 0.3, BOTTOM = 0.78;              // the roots stay in the band that is on screen, among the stems
const STEP = 0.05;
const GOLD = '255, 226, 120';

const rand = (min, max) => min + Math.random() * (max - min);

export function createRoots(canvas) {
    const ctx = canvas.getContext('2d');
    let paths = [];
    let nodes = [];                          // the caps the roots reach: where, how big, and when the root gets there

    // One root: a wandering line that keeps to the band, and now and then sends out a branch
    const spread = (x, y, angle, length, depth, from) => {
        const pts = [{ x, y, d: from }];
        let d = from;
        for (let i = 0, n = Math.floor(length / STEP); i < n; i++) {
            const side = Math.cos(angle) >= 0 ? 0 : Math.PI;                     // which way it goes along the field
            const dir = side ? -1 : 1;
            angle += rand(-0.45, 0.45) + (side - angle) * 0.012;                   // it wanders, and drifts back towards the sides
            x += Math.cos(angle) * STEP;
            y += Math.sin(angle) * STEP;
            if (y < TOP) { y = TOP; angle = side + 0.3 * dir; }                  // at the edge of the band it turns back in
            if (y > BOTTOM) { y = BOTTOM; angle = side - 0.3 * dir; }
            d += STEP;
            pts.push({ x, y, d });
            if (depth < 3 && i > 5 && Math.random() < 0.045) {
                spread(x, y, angle + (Math.random() < 0.5 ? -1 : 1) * rand(0.5, 1.1), (length - i * STEP) * rand(0.45, 0.75), depth + 1, d);
            }
        }
        paths.push({ pts, depth });
    };

    const build = () => {
        paths = [];
        nodes = [];
        for (let k = 0; k < 6; k++) {
            const side = k % 2 ? 1 : -1;
            const angle = side > 0 ? rand(-0.7, 0.6) : Math.PI + rand(-0.6, 0.7);
            spread(ORIGIN[0] + side * rand(0, 0.15), ORIGIN[1] + rand(-0.04, 0.04), angle, rand(2.2, 4.6), 0, 0);
        }
        // A thin root up to every cap that is near enough to a root
        const trunk = paths.map((p) => p.pts).flat();
        caps.forEach(([cx, cy, cw]) => {
            const x = cx * ASPECT, y = cy;
            if (x < 0.06 * ASPECT || x > 0.94 * ASPECT) return;
            let best = null, nearest = 0.95;
            trunk.forEach((q) => {
                const dist = Math.hypot(q.x - x, q.y - y);
                if (dist < nearest) { nearest = dist; best = q; }
            });
            if (!best) return;
            const pts = [{ x: best.x, y: best.y, d: best.d }];
            const n = Math.max(2, Math.round(nearest / STEP));
            const sway = rand(-0.12, 0.12);
            for (let i = 1; i <= n; i++) {
                const f = i / n;
                pts.push({ x: best.x + (x - best.x) * f + Math.sin(f * Math.PI) * sway, y: best.y + (y - best.y) * f, d: best.d + nearest * f });
            }
            paths.push({ pts, depth: 3 });
            nodes.push({ x, y, r: cw * ASPECT, d: best.d + nearest });
        });
        const longest = Math.max(...paths.map((p) => p.pts[p.pts.length - 1].d));
        paths.forEach((p) => p.pts.forEach((q) => { q.t = q.d / longest; }));
        nodes.forEach((n) => { n.t = n.d / longest; });
    };
    build();

    // grow: how far the roots have spread (0..1); pulse: where the wave of light is (0..1, or below 0 when there is none);
    // level: 0..3; t: seconds, for the breathing
    const frame = ({ grow = 0, pulse = -1, level = 0, t = 0 }) => {
        const width = canvas.clientWidth;
        if (!width) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const cw = Math.round(width * dpr), ch = Math.round(width / ASPECT * dpr);
        if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
        const unit = ch;                                              // canvas pixels per unit of height
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, cw, ch);
        if (grow <= 0) return;
        ctx.setTransform(unit, 0, 0, unit, 0, 0);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const alive = (0.4 + 0.1 * level) * (0.86 + 0.14 * Math.sin(t * 1.6));
        const thick = 1 + 0.14 * level;

        // The light of each cap the roots have reached: a flash when the wave gets to it, and a glow that stays
        ctx.globalCompositeOperation = 'lighter';
        nodes.forEach((n) => {
            if (grow < n.t) return;
            const flash = pulse >= n.t ? Math.exp(-(pulse - n.t) * 3.5) : 0;
            const intensity = Math.min(1, flash * 0.9 + 0.1 * level + 0.06);
            const radius = n.r * 1.1 + 0.14;
            const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, radius);
            g.addColorStop(0, `rgba(${GOLD}, ${intensity * 0.55})`);
            g.addColorStop(1, `rgba(${GOLD}, 0)`);
            ctx.fillStyle = g;
            ctx.fillRect(n.x - radius, n.y - radius, radius * 2, radius * 2);
        });
        const base = ctx.createRadialGradient(ORIGIN[0], ORIGIN[1], 0, ORIGIN[0], ORIGIN[1], 0.6);
        base.addColorStop(0, `rgba(${GOLD}, ${0.22 * Math.min(1, grow * 2) * alive})`);
        base.addColorStop(1, `rgba(${GOLD}, 0)`);
        ctx.fillStyle = base;
        ctx.fillRect(ORIGIN[0] - 0.6, ORIGIN[1] - 0.6, 1.2, 1.2);

        paths.forEach((p) => {
            // The part of this root the network has got to: up to the first point it has not
            const line = [];
            let tip = null;
            for (let i = 0; i < p.pts.length; i++) {
                const q = p.pts[i];
                if (q.t <= grow) { line.push(q); continue; }
                const a = p.pts[i - 1];
                if (a) {
                    const f = (grow - a.t) / (q.t - a.t);
                    tip = { x: a.x + (q.x - a.x) * f, y: a.y + (q.y - a.y) * f };
                    line.push(tip);
                }
                break;
            }
            if (line.length < 2) return;
            const width = 0.0115 * (1 - 0.22 * p.depth) * thick;
            ctx.beginPath();
            line.forEach((q, i) => ctx[i ? 'lineTo' : 'moveTo'](q.x, q.y));
            ctx.strokeStyle = `rgba(${GOLD}, ${alive * 0.1})`;           // a soft halo
            ctx.lineWidth = width * 3;
            ctx.stroke();
            ctx.strokeStyle = `rgba(${GOLD}, ${alive * (1 - 0.1 * p.depth)})`;
            ctx.lineWidth = width;
            ctx.stroke();
            if (tip) {                                                    // the tip that is still growing shines
                ctx.fillStyle = `rgba(255, 244, 190, ${0.9 * alive})`;
                ctx.beginPath();
                ctx.arc(tip.x, tip.y, width * 1.3, 0, Math.PI * 2);
                ctx.fill();
            }
            // The wave of light
            if (pulse >= 0) {
                ctx.fillStyle = 'rgba(255, 246, 200, 0.95)';
                for (const q of line) {
                    const d = Math.abs(q.t - pulse);
                    if (d > 0.07) continue;
                    ctx.beginPath();
                    ctx.arc(q.x, q.y, width * (0.7 + 1.3 * (1 - d / 0.07)), 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        });
        ctx.globalCompositeOperation = 'source-over';
    };

    return { frame, reshape: build };
}
