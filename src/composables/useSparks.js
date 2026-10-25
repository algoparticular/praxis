// A pool of sparks for a useStardust canvas: burst(x, y, ...) throws a handful that fly out, slow down, drift up a
// little like embers and fade. group() is the dynamic particle group to hand to useStardust, in front of the scene.

export function createSparks(capacity = 480) {
    const life = new Float32Array(capacity);
    const span = new Float32Array(capacity).fill(1);
    const size = new Float32Array(capacity);
    const x = new Float32Array(capacity);
    const y = new Float32Array(capacity);
    const vx = new Float32Array(capacity);
    const vy = new Float32Array(capacity);
    const rgb = new Float32Array(capacity * 3);
    let head = 0;
    let lastT = 0;

    const burst = (px, py, { n = 24, colors = [0xffe47d], speed = 110, life: lifetime = 2.4, size: dot = 5, spread = 6 } = {}) => {
        for (let k = 0; k < n; k++) {
            const i = head;
            head = (head + 1) % capacity;
            const angle = Math.random() * Math.PI * 2;
            const v = speed * (0.35 + Math.random() * 0.75);
            const c = colors[Math.floor(Math.random() * colors.length)];
            x[i] = px + Math.cos(angle) * spread * Math.random();
            y[i] = py + Math.sin(angle) * spread * Math.random();
            vx[i] = Math.cos(angle) * v;
            vy[i] = Math.sin(angle) * v - 18;
            span[i] = life[i] = lifetime * (0.6 + Math.random() * 0.6);
            size[i] = dot * (0.7 + Math.random() * 0.8);
            rgb.set([(c >> 16 & 255) / 255, (c >> 8 & 255) / 255, (c & 255) / 255], i * 3);
        }
    };

    const dynamic = {
        count: capacity,
        update(t, data) {
            const dt = Math.min(0.1, Math.max(0, t - lastT));
            lastT = t;
            const drag = Math.exp(-dt * 1.1);
            for (let i = 0; i < capacity; i++) {
                if (life[i] <= 0) { data.alphas[i] = 0; continue; }
                life[i] -= dt;
                vx[i] *= drag;
                vy[i] *= drag;
                x[i] += vx[i] * dt;
                y[i] += vy[i] * dt;
                const age = Math.max(0, life[i]) / span[i];
                data.positions[i * 3] = x[i];
                data.positions[i * 3 + 1] = y[i];
                data.sizes[i] = size[i] * (0.5 + 0.5 * age);
                data.alphas[i] = Math.min(1, age * 2.2);
                data.tints.set(rgb.subarray(i * 3, i * 3 + 3), i * 3);
            }
        },
    };

    const group = () => ({ colors: [0xffffff], dynamic, parallax: 0, drift: 0, twinkle: 0, reach: 0, look: 'hard' });
    return { burst, group };
}
