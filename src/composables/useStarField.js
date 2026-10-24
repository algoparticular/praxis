// Living night sky for the oracle block: stars that twinkle and, every now and then, a shooting star.
// Drawn flat, like the illustration it replaces: one lemon yellow, solid shapes, no glows or gradients.
// The twinkle moves in steps, frame by frame like hand-made animation, instead of fading smoothly.
// Plain 2D canvas; it pauses when the block is off screen and stays still with prefers-reduced-motion.

const YELLOW = '#E6E973';  // the yellow of the original stars
const CREAM = '#F7F8F1';

// Sizes a star goes through, one step at a time
const STEPS = [1, 1, 0.7, 0.4, 0.7, 1, 1.25];

const rand = (min, max) => min + Math.random() * (max - min);

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

export function createStarField(canvas, container, { shootingEvery = [4, 9] } = {}) {
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

    // A shooting star crosses the upper part of the sky on a slight downward diagonal
    const shoot = () => {
        const goingRight = Math.random() < 0.5;
        const angle = rand(0.35, 0.6) * (goingRight ? 1 : -1) + (goingRight ? 0 : Math.PI);
        const speed = rand(650, 950);
        shooting.push({
            x: rand(width * 0.1, width * 0.9),
            y: rand(height * 0.04, height * 0.45),
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            tail: rand(110, 180),
            life: 0,
            duration: rand(0.8, 1.2),
            wobble: Array.from({ length: 8 }, () => rand(-1, 1)),
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

        for (const meteor of shooting) {
            const progress = meteor.life / meteor.duration;
            // It grows in and shrinks out instead of fading
            const size = Math.min(1, progress * 6, (1 - progress) * 6);
            if (size <= 0) continue;

            const speed = Math.hypot(meteor.vx, meteor.vy);
            const ux = meteor.vx / speed, uy = meteor.vy / speed;
            const tx = meteor.x - ux * meteor.tail * size;
            const ty = meteor.y - uy * meteor.tail * size;
            const half = 3 * size;

            // Tail: a flat sliver that narrows to a point
            ctx.fillStyle = YELLOW;
            ctx.beginPath();
            ctx.moveTo(meteor.x - uy * half, meteor.y + ux * half);
            ctx.lineTo(tx, ty);
            ctx.lineTo(meteor.x + uy * half, meteor.y - ux * half);
            ctx.closePath();
            ctx.fill();

            // A few dashes of dust left along the way
            for (let i = 1; i <= 3; i++) {
                const along = meteor.tail * size * (0.35 + i * 0.22);
                ctx.beginPath();
                ctx.arc(
                    meteor.x - ux * along - uy * (i % 2 ? 7 : -7) * size,
                    meteor.y - uy * along + ux * (i % 2 ? 7 : -7) * size,
                    1.6 * size * (1 - i * 0.2), 0, Math.PI * 2
                );
                ctx.fill();
            }

            // Head: a drawn four-point star that turns in steps
            const turn = Math.floor(meteor.life * 8) * 0.35;
            sparklePath(ctx, meteor.x, meteor.y, 9 * size, turn, meteor.wobble);
            ctx.fillStyle = CREAM;
            ctx.fill();
        }
    };

    const frame = (now) => {
        raf = requestAnimationFrame(frame);
        const time = now / 1000;
        const dt = Math.min(time - last, 0.05);
        last = time;

        for (let i = shooting.length - 1; i >= 0; i--) {
            const meteor = shooting[i];
            meteor.life += dt;
            meteor.x += meteor.vx * dt;
            meteor.y += meteor.vy * dt;
            if (meteor.life >= meteor.duration) shooting.splice(i, 1);
        }
        if (time >= nextShot) {
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
