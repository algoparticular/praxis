// Sparks on a 2D canvas laid over a scene: burst(x, y) throws a handful of glowing specks that fly out, slow down,
// drift up a little and fade, with a soft flash where they start. Positions are viewport coordinates.
// The loop only runs while something is alive.

const CAPACITY = 160;

export function createGlowSparks(canvas) {
    const ctx = canvas.getContext('2d');
    const sparks = [];
    const flashes = [];
    let frame = 0;
    let last = 0;
    let width = 0, height = 0, dpr = 1;

    const resize = () => {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = canvas.clientWidth;
        height = canvas.clientHeight;
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    const tick = (now) => {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, width, height);
        ctx.globalCompositeOperation = 'lighter';

        const drag = Math.exp(-dt * 1.6);
        for (let i = flashes.length - 1; i >= 0; i--) {
            const f = flashes[i];
            f.age += dt;
            const k = f.age / f.span;
            if (k >= 1) { flashes.splice(i, 1); continue; }
            const r = f.radius * (0.6 + 0.9 * k);
            const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, r);
            g.addColorStop(0, f.color);
            g.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.globalAlpha = (1 - k) ** 2 * 0.7;
            ctx.fillStyle = g;
            ctx.fillRect(f.x - r, f.y - r, r * 2, r * 2);
        }
        for (let i = sparks.length - 1; i >= 0; i--) {
            const s = sparks[i];
            s.age += dt;
            if (s.age >= s.span) { sparks.splice(i, 1); continue; }
            s.vx *= drag;
            s.vy = s.vy * drag - 14 * dt;
            s.x += s.vx * dt;
            s.y += s.vy * dt;
            const k = s.age / s.span;
            const size = s.size * (1 - 0.6 * k);
            ctx.globalAlpha = Math.min(1, (1 - k) * 1.8);
            ctx.fillStyle = s.color;
            ctx.shadowColor = s.color;
            ctx.shadowBlur = size * 3;
            ctx.beginPath();
            ctx.arc(s.x, s.y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;

        if (sparks.length || flashes.length) frame = requestAnimationFrame(tick);
        else { frame = 0; ctx.clearRect(0, 0, width, height); }
    };

    return {
        // colors: CSS colours to pick from; radius: size of the flash, and roughly where the sparks start
        burst(x, y, { colors = ['#ffe9b0'], n = 22, speed = 150, radius = 40, size = 2.6, life = 1.8 } = {}) {
            const box = canvas.getBoundingClientRect();
            const px = x - box.left, py = y - box.top;
            flashes.push({ x: px, y: py, radius: radius * 1.6, color: colors[0], age: 0, span: 0.9 });
            for (let k = 0; k < n; k++) {
                const angle = Math.random() * Math.PI * 2;
                const v = speed * (0.3 + Math.random() * 0.8);
                const start = radius * 0.5 * Math.random();
                if (sparks.length >= CAPACITY) sparks.shift();
                sparks.push({
                    x: px + Math.cos(angle) * start, y: py + Math.sin(angle) * start,
                    vx: Math.cos(angle) * v, vy: Math.sin(angle) * v,
                    age: 0, span: life * (0.6 + Math.random() * 0.6),
                    size: size * (0.6 + Math.random() * 0.9),
                    color: colors[Math.floor(Math.random() * colors.length)],
                });
            }
            if (!frame) { last = performance.now(); frame = requestAnimationFrame(tick); }
        },
        destroy() {
            cancelAnimationFrame(frame);
            observer.disconnect();
        },
    };
}
