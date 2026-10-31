// Living night sky for the oracle block: stars that twinkle and, every now and then, a shooting star.
// The stars are drawn flat, like the illustration they replace: one lemon yellow, solid shapes, no glows or gradients.
// The twinkle moves in steps, frame by frame like hand-made animation, instead of fading smoothly.
// The shooting stars are like Dana's: a soft cream head and a tail in the stars' yellow, one stroke that narrows and fades,
// falling on a diagonal. Most are far (small, quick, silent); now and then one passes near (bigger, brighter,
// a longer tail) and only that one sounds (`onShoot`).
// Plain 2D canvas; it pauses when the block is off screen and stays still with prefers-reduced-motion.
// Constellations (`figure`): the sky's own stars travel to the points of a shape, one after the other along its line,
// and threads of dots join them; let go, they go back to their places. The landing's oracle block draws the icon of a
// way into the oracle with them.

const YELLOW = '#E6E973';  // the yellow of the original stars
const CREAM = '#F7F8F1';

// Sizes a star goes through, one step at a time
const STEPS = [1, 1, 0.7, 0.4, 0.7, 1, 1.25];

const rand = (min, max) => min + Math.random() * (max - min);
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// Constellations: how long a star takes to travel (s), how the departures spread along the line (s, from the first to
// the last), how far apart the dots of a thread are (px) and how long the threads take to appear or go (s)
const GATHER = { travel: 1.1, spread: 0.9, dotGap: 7, threads: 0.6 };
// How long a constellation takes to be whole, from the first star leaving to the last thread drawn (s)
export const CONSTELLATION_TIME = GATHER.spread + GATHER.travel + 0.25;

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
    // The constellation being drawn: { strokes: [{ stars: [index...], closed }], color, alpha, goal }
    let figure = null;
    const leaving = [];            // figures letting go: their threads fade while the stars go home

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
                k: 0, goal: 0, wait: 0, tx: 0, ty: 0,   // in a constellation: how far along to its point (0..1)
            };
        });
        figure = null;
        leaving.length = 0;
    };
    const starAt = (star) => {
        const e = ease(star.k);
        return [star.x + (star.tx - star.x) * e, star.y + (star.ty - star.y) * e];
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

    // A thread of dots between two stars, drawn as far as `reach` (0..1) from the first
    const thread = (ax, ay, bx, by, reach) => {
        const length = Math.hypot(bx - ax, by - ay) * reach;
        const count = Math.floor(length / GATHER.dotGap);
        const ux = (bx - ax) / Math.max(1, Math.hypot(bx - ax, by - ay)), uy = (by - ay) / Math.max(1, Math.hypot(bx - ax, by - ay));
        for (let d = 1; d <= count; d++) {
            ctx.beginPath();
            ctx.arc(ax + ux * d * GATHER.dotGap, ay + uy * d * GATHER.dotGap, 1.1, 0, Math.PI * 2);
            ctx.fill();
        }
    };
    const drawFigure = (fig) => {
        if (fig.alpha <= 0.01) return;
        ctx.fillStyle = fig.color;
        ctx.globalAlpha = fig.alpha * 0.85;
        for (const { stars: line, closed } of fig.strokes) {
            const n = line.length;
            for (let i = 0; i < (closed ? n : n - 1); i++) {
                const a = stars[line[i]], b = stars[line[(i + 1) % n]];
                // A thread grows once both its stars are nearly there
                const reach = Math.min(1, Math.max(0, (Math.min(a.k, b.k) - 0.8) / 0.2));
                if (reach > 0) thread(...starAt(a), ...starAt(b), reach);
            }
        }
        ctx.globalAlpha = 1;
    };

    const draw = (time) => {
        ctx.clearRect(0, 0, width, height);

        leaving.forEach(drawFigure);
        if (figure) drawFigure(figure);

        for (const star of stars) {
            // Frame-by-frame twinkle: the size jumps from one step to the next; a star in a constellation holds still
            // and a little brighter, in the cream
            const step = STEPS[Math.floor(time * star.rate + star.phase) % STEPS.length];
            const held = ease(star.k);
            const radius = star.radius * (step + (1 - step) * held) + held * Math.max(0, 2.2 - star.radius);
            const [x, y] = star.k > 0 ? starAt(star) : [star.x, star.y];
            ctx.fillStyle = held > 0.6 ? CREAM : star.color;

            if (star.sparkle) {
                sparklePath(ctx, x, y, radius, star.rotation, star.wobble);
            } else {
                ctx.beginPath();
                ctx.ellipse(x, y, radius, radius * star.squash, star.tilt, 0, Math.PI * 2);
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
        // Constellations: each star waits its turn, then travels; the threads come and go with their figure
        for (const star of stars) {
            if (star.k === star.goal) continue;
            if (star.wait > 0) { star.wait -= dt; continue; }
            const stepK = dt / GATHER.travel;
            star.k = star.goal > star.k ? Math.min(star.goal, star.k + stepK) : Math.max(star.goal, star.k - stepK);
        }
        if (figure) figure.alpha = Math.min(1, figure.alpha + dt / GATHER.threads);
        for (let i = leaving.length - 1; i >= 0; i--) {
            leaving[i].alpha -= dt / (GATHER.threads * 0.6);
            if (leaving[i].alpha <= 0) leaving.splice(i, 1);
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

    // Draws a shape with the sky's stars: `strokes` is a list of { points: [[x, y], ...], closed } in px of the
    // container; null lets the one being drawn go. The nearest free star goes to each point.
    const constellation = (strokes, { color = YELLOW } = {}) => {
        if (figure) {
            figure.strokes.forEach(({ stars: line }) => line.forEach((i, order) => {
                const star = stars[i];
                star.goal = 0;
                star.wait = (order / line.length) * GATHER.spread * 0.4;
            }));
            leaving.push(figure);
            figure = null;
        }
        if (strokes?.length && stars.length) {
            const taken = new Set();
            const total = strokes.reduce((sum, s) => sum + s.points.length, 0);
            let order = 0;
            figure = {
                color,
                alpha: 0,
                strokes: strokes.map(({ points, closed }) => ({
                    closed,
                    stars: points.map(([px, py]) => {
                        let best = -1, bestD = Infinity;
                        stars.forEach((s, i) => {
                            if (taken.has(i) || s.k > 0) return;
                            const d = (s.x - px) ** 2 + (s.y - py) ** 2;
                            if (d < bestD) { bestD = d; best = i; }
                        });
                        if (best < 0) return null;
                        taken.add(best);
                        const star = stars[best];
                        star.tx = px; star.ty = py; star.goal = 1;
                        star.wait = (order++ / total) * GATHER.spread;
                        return best;
                    }).filter((i) => i !== null),
                })),
            };
        }
        if (reducedMotion) {
            // Still: the shape is simply there, or not
            stars.forEach((s) => { s.k = s.goal; s.wait = 0; });
            if (figure) figure.alpha = 1;
            leaving.length = 0;
            draw(0);
        }
    };

    return {
        shoot,
        constellation,
        destroy() {
            stop();
            observer.disconnect();
            resizeObserver.disconnect();
            document.removeEventListener('visibilitychange', onVisibility);
        },
    };
}
