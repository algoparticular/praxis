// The dotted spiral of the hero character, drawn on a 2D canvas laid over his picture.
// The points were taken from the original illustration (heroSpiral.json, in the picture's own pixel space,
// ordered from the character's head outwards), so the canvas and the picture share one coordinate system.
// The dots flow out of his head along the curve and swell in a travelling pulse,
// a dust of tiny particles drifts around them, and the pointer pushes both aside and lights them up.

import dots from './heroSpiral.json';

const WIDTH = 868;
const HEIGHT = 1027;
const LAST = dots.length - 1;
const FLOW = 1.1;       // dots per second along the spiral
const EDGE_IN = 3;      // dots over which the spiral fades in at the head
const EDGE_OUT = 6;     // and out at the far tip
const REACH = 190;      // radius, in picture pixels, within which the pointer disturbs the dots
const PUSH = 46;        // how far the dots give way at the pointer's very centre
const DUST = 80;        // tiny particles drifting along the spiral

// Fixed seeds so the dust is the same on every visit and in every render
const dust = Array.from({ length: DUST }, (_, i) => {
    const r = (n) => { const x = Math.sin(i * 127.1 + n * 311.7) * 43758.5453; return x - Math.floor(x); };
    return { f: r(1) * 1000, speed: 1.4 + r(2) * 2.2, lateral: (r(3) - 0.5) * 34, wobble: 0.6 + r(4) * 1.4, phase: r(5) * 6.28, size: 0.9 + r(6) * 1.5, alpha: 0.35 + r(7) * 0.5 };
});

const smooth = (edge0, edge1, x) => {
    const k = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
    return k * k * (3 - 2 * k);
};

// Catmull-Rom through four consecutive dots, so the curve is smooth where the loops turn
const point = (f, out) => {
    const i = Math.min(LAST - 1, Math.floor(f));
    const u = f - i;
    const a = dots[Math.max(0, i - 1)], b = dots[i], c = dots[i + 1], d = dots[Math.min(LAST, i + 2)];
    const u2 = u * u, u3 = u2 * u;
    for (let k = 0; k < 3; k++) {
        out[k] = 0.5 * ((2 * b[k]) + (-a[k] + c[k]) * u + (2 * a[k] - 5 * b[k] + 4 * c[k] - d[k]) * u2 + (-a[k] + 3 * b[k] - 3 * c[k] + d[k]) * u3);
    }
    return out;
};

const makeGlow = () => {
    const size = 64;
    const sprite = document.createElement('canvas');
    sprite.width = sprite.height = size;
    const ctx = sprite.getContext('2d');
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255, 170, 210, 0.75)');
    gradient.addColorStop(0.35, 'rgba(255, 150, 200, 0.3)');
    gradient.addColorStop(1, 'rgba(255, 150, 200, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    return sprite;
};

export function createHeroSpiral(canvas, { animate = true } = {}) {
    const ctx = canvas.getContext('2d');
    const glow = makeGlow();
    const here = [0, 0, 0];
    const ahead = [0, 0, 0];
    let scale = 1;
    let visible = true;
    let frame = 0;
    let start = 0;
    // Pointer in picture pixels. The smoothed copy and its strength ease in and out so nothing snaps.
    const pointer = { x: 0, y: 0, tx: 0, ty: 0, strength: 0, target: 0 };

    const resize = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const width = canvas.clientWidth;
        if (!width) return;
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(width * dpr * HEIGHT / WIDTH);
        scale = canvas.width / WIDTH;
        if (!animate) draw(0);
    };

    // Pushes (x, y) away from the pointer; returns how close the pointer is, 0..1
    const disturb = (at, force) => {
        if (pointer.strength < 0.01) return 0;
        const dx = at[0] - pointer.x, dy = at[1] - pointer.y;
        const distance = Math.hypot(dx, dy) || 1;
        if (distance >= REACH) return 0;
        const closeness = (1 - distance / REACH) ** 2 * pointer.strength;
        at[0] += dx / distance * closeness * force;
        at[1] += dy / distance * closeness * force;
        return closeness;
    };

    const draw = (t) => {
        pointer.strength += (pointer.target - pointer.strength) * 0.08;
        pointer.x += (pointer.tx - pointer.x) * 0.2;
        pointer.y += (pointer.ty - pointer.y) * 0.2;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const shift = animate ? (t * FLOW) % LAST : 0;
        for (let k = 0; k < LAST; k++) {
            const f = (k + shift) % LAST;
            const envelope = smooth(0, EDGE_IN, f) * smooth(0, EDGE_OUT, LAST - f);
            if (envelope <= 0.01) continue;

            point(f, here);
            const spot = [here[0], here[1]];
            const near = disturb(spot, PUSH);
            const [x, y] = spot;

            // Slow pulse that travels from the head to the tip
            const swell = Math.min(1, (animate ? Math.pow(Math.max(0, Math.sin(f * 0.18 - t * 1.6)), 3) : 0) + near * 1.2);
            const twinkle = animate ? 0.88 + 0.12 * Math.sin(t * 3 + k * 1.7) : 1;
            const radius = here[2] * (1 + 0.4 * swell) * scale;
            const alpha = envelope * twinkle;

            const reach = radius * 3.4;
            ctx.globalAlpha = alpha * (0.45 + 0.4 * swell);
            ctx.drawImage(glow, x * scale - reach, y * scale - reach, reach * 2, reach * 2);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = swell > 0.3 ? '#FFC2DE' : '#FF9FCB';
            ctx.beginPath();
            ctx.arc(x * scale, y * scale, radius, 0, Math.PI * 2);
            ctx.fill();
        }

        // Dust: tinier and quicker than the dots, loosely following the same curve and fleeing the pointer harder
        if (animate) {
            ctx.fillStyle = '#FFD9EC';
            for (const mote of dust) {
                const f = (mote.f + t * mote.speed) % LAST;
                const envelope = smooth(0, EDGE_IN, f) * smooth(0, EDGE_OUT, LAST - f);
                if (envelope <= 0.01) continue;
                point(f, here);
                point(Math.min(LAST, f + 0.4), ahead);
                const dx = ahead[0] - here[0], dy = ahead[1] - here[1];
                const length = Math.hypot(dx, dy) || 1;
                const side = mote.lateral + Math.sin(t * mote.wobble + mote.phase) * 7;
                const spot = [here[0] - (dy / length) * side, here[1] + (dx / length) * side];
                const near = disturb(spot, PUSH * 1.8);
                ctx.globalAlpha = envelope * mote.alpha * (0.55 + 0.45 * Math.sin(t * 2.3 + mote.phase)) * (1 + near);
                ctx.beginPath();
                ctx.arc(spot[0] * scale, spot[1] * scale, mote.size * (1 + near) * scale, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.globalAlpha = 1;
    };

    const tick = (now) => {
        frame = requestAnimationFrame(tick);
        if (!visible) return;
        draw((now - start) / 1000);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    const visibility = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
    visibility.observe(canvas);
    resize();
    if (animate) {
        start = performance.now();
        frame = requestAnimationFrame(tick);
    }

    return {
        // Takes viewport coordinates (null when the pointer leaves) and maps them onto the picture
        setPointer(clientX, clientY) {
            if (clientX == null) { pointer.target = 0; return; }
            const box = canvas.getBoundingClientRect();
            if (!box.width) return;
            pointer.tx = (clientX - box.left) / box.width * WIDTH;
            pointer.ty = (clientY - box.top) / box.height * HEIGHT;
            if (pointer.target === 0) { pointer.x = pointer.tx; pointer.y = pointer.ty; }
            pointer.target = 1;
        },
        destroy() {
            cancelAnimationFrame(frame);
            resizeObserver.disconnect();
            visibility.disconnect();
        },
    };
}
