// The inside of a cell is a watery place: everything in it bobs about a little, and what floats bumps into what it meets.
// Positions are fractions of the scene's square frame. `bodies` are the things that sit in the water (a body is a few
// circles); they wander a short way from where they were drawn, on a spring, and get shoved when the swimmer hits them.
// The swimmer (the larva) drifts slowly along a heading that changes by itself, bounces off every body and off the wall
// of the cell, and the bodies it hits give a little with the blow.
//   bounds   { x, y, r }       the cell's inside
//   swimmer  { x, y, r }       where it starts and how big its body is
//   bodies   [{ id, circles: [[x, y, r], ...], mass, sway }]   sway: how far it wanders (frame fractions)
// step(dt, t) moves everything on; read swimmer.x/y (absolute) and offset(id) = { x, y } from where the body was drawn.

const TAU = Math.PI * 2;

export function createCellWater({ bounds, swimmer, bodies, speed = 0.011, restitution = 0.55 }) {
    const me = { x: swimmer.x, y: swimmer.y, vx: 0, vy: 0, r: swimmer.r, heading: Math.random() * TAU, hit: 0 };
    me.vx = Math.cos(me.heading) * speed;
    me.vy = Math.sin(me.heading) * speed;

    const list = bodies.map((b, i) => ({
        id: b.id, circles: b.circles, mass: b.mass ?? 3, sway: b.sway ?? 0.006,
        x: 0, y: 0, vx: 0, vy: 0, phase: i * 1.7 + Math.random() * 6, rate: 0.17 + (i % 5) * 0.045,
    }));
    const byId = Object.fromEntries(list.map((b) => [b.id, b]));

    const step = (dt, t) => {
        dt = Math.min(dt, 0.05);
        if (dt <= 0) return;

        // The bodies: a spring back to where they were drawn, a slow current pushing them about, and some water drag
        list.forEach((b) => {
            const fx = Math.sin(t * b.rate + b.phase) + 0.5 * Math.sin(t * b.rate * 2.3 + b.phase * 1.3);
            const fy = Math.cos(t * b.rate * 0.9 + b.phase * 0.7) + 0.5 * Math.cos(t * b.rate * 2.1 + b.phase);
            const k = 2.4;
            b.vx += (-k * b.x + k * b.sway * fx * 0.9 - 2.2 * b.vx) * dt;
            b.vy += (-k * b.y + k * b.sway * fy * 0.9 - 2.2 * b.vy) * dt;
            b.x += b.vx * dt;
            b.y += b.vy * dt;
        });

        // The swimmer: its heading drifts, and its velocity eases towards it so a bounce settles into a new course
        me.heading += (Math.sin(t * 0.23) * 0.5 + Math.sin(t * 0.61 + 1) * 0.3) * dt;
        const want = speed * (0.85 + 0.3 * Math.sin(t * 0.17));
        const ease = Math.min(1, 0.7 * dt);
        me.vx += (Math.cos(me.heading) * want - me.vx) * ease;
        me.vy += (Math.sin(me.heading) * want - me.vy) * ease;
        me.x += me.vx * dt;
        me.y += me.vy * dt;
        me.hit = Math.max(0, me.hit - dt);

        // Bumping into bodies: push out of them, bounce, and hand them part of the blow
        list.forEach((b) => {
            b.circles.forEach(([cx, cy, cr]) => {
                const dx = me.x - (cx + b.x);
                const dy = me.y - (cy + b.y);
                const min = me.r + cr;
                const d2 = dx * dx + dy * dy;
                if (d2 >= min * min) return;
                const d = Math.sqrt(d2) || 1e-6;
                const nx = dx / d;
                const ny = dy / d;
                const pen = min - d;
                me.x += nx * pen * 0.85;
                me.y += ny * pen * 0.85;
                b.x -= nx * pen * 0.15 * (1 / b.mass);
                b.y -= ny * pen * 0.15 * (1 / b.mass);
                const vn = (me.vx - b.vx) * nx + (me.vy - b.vy) * ny;
                if (vn < 0) {
                    const j = (-(1 + restitution) * vn) / (1 + 1 / b.mass);
                    me.vx += j * nx;
                    me.vy += j * ny;
                    b.vx -= (j * nx) / b.mass;
                    b.vy -= (j * ny) / b.mass;
                    me.heading = Math.atan2(me.vy, me.vx);
                    me.hit = 0.6;
                }
            });
        });

        // The wall of the cell
        const wx = me.x - bounds.x;
        const wy = me.y - bounds.y;
        const wd = Math.hypot(wx, wy);
        const reach = bounds.r - me.r;
        if (wd > reach) {
            const nx = wx / wd;
            const ny = wy / wd;
            me.x = bounds.x + nx * reach;
            me.y = bounds.y + ny * reach;
            const vn = me.vx * nx + me.vy * ny;
            if (vn > 0) {
                me.vx -= (1 + restitution) * vn * nx;
                me.vy -= (1 + restitution) * vn * ny;
                me.heading = Math.atan2(me.vy, me.vx);
                me.hit = 0.6;
            }
        }
    };

    return { swimmer: me, offset: (id) => byId[id] ?? { x: 0, y: 0 }, step };
}
