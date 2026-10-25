// A pool of sparks thrown from a spot (a touched mushroom, a flare): a `dynamic` group for useStardust plus burst().
// Positions are in canvas pixels. Each spark flies out, slows in the air, drifts up a little like an ember and fades.
//   const sparks = createSparks(400);
//   groups: [{ dynamic: sparks.group, colors: [0xffffff], look: 'hard', parallax: 0, drift: 0, twinkle: 0, reach: 0 }]
//   sparks.burst(x, y, { n: 24, colors: [0xffb069], speed: 110, life: 2.4, size: 5, spread: 6 })
export function createSparks(count) {
    const s = {
        life: new Float32Array(count), span: new Float32Array(count).fill(1), size: new Float32Array(count),
        x: new Float32Array(count), y: new Float32Array(count), vx: new Float32Array(count), vy: new Float32Array(count),
        rgb: new Float32Array(count * 3), head: 0, lastT: 0,
    };

    const burst = (x, y, { n = 24, colors = [0xffe47d], speed = 110, life = 2.4, size = 5, spread = 6, rise = 18 } = {}) => {
        for (let k = 0; k < n; k++) {
            const i = s.head;
            s.head = (s.head + 1) % count;
            const angle = Math.random() * Math.PI * 2;
            const v = speed * (0.35 + Math.random() * 0.75);
            const c = colors[Math.floor(Math.random() * colors.length)];
            s.x[i] = x + Math.cos(angle) * spread * Math.random();
            s.y[i] = y + Math.sin(angle) * spread * Math.random();
            s.vx[i] = Math.cos(angle) * v;
            s.vy[i] = Math.sin(angle) * v - rise;
            s.span[i] = s.life[i] = life * (0.6 + Math.random() * 0.6);
            s.size[i] = size * (0.7 + Math.random() * 0.8);
            s.rgb.set([(c >> 16 & 255) / 255, (c >> 8 & 255) / 255, (c & 255) / 255], i * 3);
        }
    };

    const group = {
        count,
        update(t, data) {
            const dt = Math.min(0.1, Math.max(0, t - s.lastT));
            s.lastT = t;
            const drag = Math.exp(-dt * 1.1);
            for (let i = 0; i < count; i++) {
                if (s.life[i] <= 0) { data.alphas[i] = 0; continue; }
                s.life[i] -= dt;
                s.vx[i] *= drag;
                s.vy[i] *= drag;
                s.x[i] += s.vx[i] * dt;
                s.y[i] += s.vy[i] * dt;
                const age = Math.max(0, s.life[i]) / s.span[i];
                data.positions[i * 3] = s.x[i];
                data.positions[i * 3 + 1] = s.y[i];
                data.sizes[i] = s.size[i] * (0.5 + 0.5 * age);
                data.alphas[i] = Math.min(1, age * 2.2);
                data.tints.set(s.rgb.subarray(i * 3, i * 3 + 3), i * 3);
            }
        },
    };

    return { burst, group };
}
