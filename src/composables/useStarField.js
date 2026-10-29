// Living night sky for the oracle block: stars that twinkle and, every now and then, a shooting star.
// The stars are drawn flat, like the illustration they replace: one lemon yellow, solid shapes, no glows or gradients.
// The twinkle moves in steps, frame by frame like hand-made animation, instead of fading smoothly.
// The shooting stars are like Dana's: a soft cream head and a tail in the stars' yellow, one stroke that narrows and fades,
// falling on a diagonal. Most are far (small, quick, silent); now and then one passes near (bigger, brighter,
// a longer tail) and only that one sounds (`onShoot`).
// Plain 2D canvas; it pauses when the block is off screen and stays still with prefers-reduced-motion.

const YELLOW = '#E6E973';  // the yellow of the original stars
const CREAM = '#F7F8F1';

// Sizes a star goes through, one step at a time
const STEPS = [1, 1, 0.7, 0.4, 0.7, 1, 1.25];

const rand = (min, max) => min + Math.random() * (max - min);

// The shooting stars' head: a soft round mote, drawn once and stamped (the falloff of useStardust's 'soft')
const DOT_COLORS = [CREAM];               // the head, in the cream of the stars of this sky
const DOT = 32;
let dots = null;
const dotSprites = () => {
    if (dots) return dots;
    dots = DOT_COLORS.map((color) => {
        const c = document.createElement('canvas');
        c.width = c.height = DOT;
        const g = c.getContext('2d');
        const grad = g.createRadialGradient(DOT / 2, DOT / 2, 0, DOT / 2, DOT / 2, DOT / 2);
        for (let k = 0; k <= 8; k++) {
            const a = Math.pow(1 - k / 8, 2);
            grad.addColorStop(k / 8, `rgba(${parseInt(color.slice(1, 3), 16)},${parseInt(color.slice(3, 5), 16)},${parseInt(color.slice(5, 7), 16)},${a.toFixed(3)})`);
        }
        g.fillStyle = grad;
        g.fillRect(0, 0, DOT, DOT);
        return c;
    });
    return dots;
};
// A far one and a near one: how long the tail is (of its life), size of the head and width of the tail (px), how fast
// (of the sky's larger side, per second) and how long it lasts (s)
const KINDS = {
    far: { lag: 0.15, head: 11, body: 7, speed: [0.35, 0.65], duration: [0.7, 1.2] },
    near: { lag: 0.18, head: 28, body: 15, speed: [0.55, 0.85], duration: [1, 1.4] },
};
const NEAR_ODDS = 0.2;      // about one in five passes near

// A flat four-point star, a little wobbly so it looks drawn by hand
const sparklePath = (ctx, x, y, radius, rotation, wobble) => {
    const inner = radius * 0.3;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
        const outer = i % 2 === 0;
        const length = (outer ? radius : inner) * (1 + wobble[i] * 0.12);
        const angle = rotation + (i * Math.PI) / 4;
        const px = x + Math.cos(angle) * length;
        const py = y + Math.sin(angle) * length;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
};

export function createStarField(canvas, container, { shootingEvery = [3, 7], shooting: withShooting = true, onShoot } = {}) {
    const ctx = canvas.getContext('2d');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let width = 0, height = 0, dpr = 1;
    let stars = [];
    const shooting = [];
    let nextShot = 0;
    let raf = 0;
    let last = 0;
    let onScreen = true;

    const makeStars = () => {
        const count = Math.min(300, Math.round((width * height) / 4200));
        stars = Array.from({ length: count }, () => {
            const kind = Math.random();
            // Mostly plain dots of different sizes, a few drawn four-point stars
            const sparkle = kind < 0.09;
            return {
                x: Math.random() * width,
                y: Math.random() * height,
                radius: sparkle ? rand(4.5, 7) : (kind < 0.35 ? rand(1.8, 2.8) : rand(0.8, 1.6)),
                color: Math.random() < 0.12 ? CREAM : YELLOW,
                sparkle,
                squash: rand(0.85, 1),              // slightly uneven dots
                tilt: rand(0, Math.PI),
                rotation: rand(-0.3, 0.3),
                wobble: Array.from({ length: 8 }, () => rand(-1, 1)),
                rate: rand(0.25, 1.1),              // steps per second
                phase: rand(0, STEPS.length),
            };
        });
    };

    const resize = () => {
        const rect = container.getBoundingClientRect();
        width = Math.max(1, Math.round(rect.width));
        height = Math.max(1, Math.round(rect.height));
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        makeStars();
        if (!raf) draw(0);
    };

    // A shooting star crosses the upper part of the sky on a downward diagonal; only a near one sounds
    const shoot = (near = Math.random() < NEAR_ODDS) => {
        if (near) onShoot?.();
        const kind = KINDS[near ? 'near' : 'far'];
        const side = Math.random() < 0.5 ? -1 : 1;
        const speed = rand(...kind.speed) * Math.max(width, height);
        shooting.push({
            kind,
            x0: width * rand(0.15, 0.85),
            y0: height * rand(0.04, near ? 0.3 : 0.4),
            vx: side * speed,
            vy: speed * rand(0.35, 0.65),
            life: 0,
            duration: rand(...kind.duration),
        });
    };

    const draw = (time) => {
        ctx.clearRect(0, 0, width, height);

        for (const star of stars) {
            // Frame-by-frame twinkle: the size jumps from one step to the next
            const step = STEPS[Math.floor(time * star.rate + star.phase) % STEPS.length];
            const radius = star.radius * step;
            ctx.fillStyle = star.color;

            if (star.sparkle) {
                sparklePath(ctx, star.x, star.y, radius, star.rotation, star.wobble);
            } else {
                ctx.beginPath();
                ctx.ellipse(star.x, star.y, radius, radius * star.squash, star.tilt, 0, Math.PI * 2);
            }
            ctx.fill();
        }

        // The tail is one stroke from the head back to where it was a moment before, narrowing to a point and fading,
        // with a soft glow (a blurred shadow). The head is a soft cream mote
        const [headDot] = shooting.length ? dotSprites() : [];
        for (const meteor of shooting) {
            const { kind } = meteor;
            const u = meteor.life / meteor.duration;
            const shine = Math.min(1, Math.sin(u * Math.PI) * 1.4);
            const hx = meteor.x0 + meteor.vx * meteor.life, hy = meteor.y0 + meteor.vy * meteor.life;
            const back = Math.max(0, u - kind.lag) * meteor.duration;
            const tx = meteor.x0 + meteor.vx * back, ty = meteor.y0 + meteor.vy * back;
            const len = Math.hypot(hx - tx, hy - ty);
            if (len > 1) {
                const nx = -(hy - ty) / len, ny = (hx - tx) / len;
                const fade = ctx.createLinearGradient(hx, hy, tx, ty);
                fade.addColorStop(0, YELLOW);
                fade.addColorStop(1, 'rgba(230,233,115,0)');
                ctx.fillStyle = fade;
                const half = kind.body * 0.36;
                ctx.globalAlpha = shine;
                ctx.shadowColor = YELLOW;
                ctx.shadowBlur = kind.body * 1.4;
                ctx.beginPath();
                ctx.moveTo(hx + nx * half, hy + ny * half);
                ctx.lineTo(tx, ty);
                ctx.lineTo(hx - nx * half, hy - ny * half);
                ctx.closePath();
                ctx.fill();
                ctx.shadowBlur = 0;
            }
            ctx.globalAlpha = shine;
            ctx.drawImage(headDot, hx - kind.head / 2, hy - kind.head / 2, kind.head, kind.head);
        }
        ctx.globalAlpha = 1;
    };

    const frame = (now) => {
        raf = requestAnimationFrame(frame);
        const time = now / 1000;
        const dt = Math.min(time - last, 0.05);
        last = time;

        for (let i = shooting.length - 1; i >= 0; i--) {
            const meteor = shooting[i];
            meteor.life += dt;
            if (meteor.life >= meteor.duration) shooting.splice(i, 1);
        }
        if (withShooting && time >= nextShot) {
            shoot();
            nextShot = time + rand(shootingEvery[0], shootingEvery[1]);
        }

        draw(time);
    };

    const start = () => {
        if (raf || reducedMotion || !onScreen || document.hidden) return;
        last = performance.now() / 1000;
        // The first one does not make you wait the whole interval
        nextShot = last + rand(1.5, 3.5);
        raf = requestAnimationFrame(frame);
    };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };

    const observer = new IntersectionObserver(([entry]) => {
        onScreen = entry.isIntersecting;
        onScreen ? start() : stop();
    });
    const resizeObserver = new ResizeObserver(resize);
    const onVisibility = () => (document.hidden ? stop() : start());

    resize();
    canvas.style.opacity = '1';
    resizeObserver.observe(container);
    if (!reducedMotion) {
        observer.observe(container);
        document.addEventListener('visibilitychange', onVisibility);
        start();
    }

    return {
        shoot,
        destroy() {
            stop();
            observer.disconnect();
            resizeObserver.disconnect();
            document.removeEventListener('visibilitychange', onVisibility);
        },
    };
}
