// Fungal spores for the Paciencia scene, drawn on a 2D canvas over the field of mushrooms.
//
// They are released from the real caps of the mushrooms (mushroomCaps.json holds where each cap is, as fractions of
// the mushrooms picture, so the emitters follow the picture whatever its size or parallax). A few at a time trickle
// out from under the caps, now and then a cap lets go of a whole puff, and brushing a cap with the pointer shakes one
// loose. Once in the air a spore is almost weightless: a slow buoyant rise, a drifting breeze that changes over time,
// a constant tremble (Brownian motion) and drag. The pointer is a gust: spores near it are pushed away, swirled and
// carried along with its movement, then settle back into the drift. They stay low (they fade out before reaching
// the sky) and never live long.

import caps from './mushroomCaps.json';

const smooth = (edge0, edge1, x) => {
    const k = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
    return k * k * (3 - 2 * k);
};
const rand = (min, max) => min + Math.random() * (max - min);
const TAU = Math.PI * 2;

const REACH = 150;          // radius of the pointer's gust, in CSS pixels
const TINTS = ['20, 82, 93', '27, 110, 122', '12, 120, 150'];   // the deep teal blues of the illustration's dots

// A soft round halo, drawn once and stamped for every spore
const makeGlow = (rgb = '20, 100, 118', core = 0.55) => {
    const size = 48;
    const sprite = document.createElement('canvas');
    sprite.width = sprite.height = size;
    const ctx = sprite.getContext('2d');
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, `rgba(${rgb}, ${core})`);
    gradient.addColorStop(0.3, `rgba(${rgb}, ${core * 0.3})`);
    gradient.addColorStop(1, `rgba(${rgb}, 0)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    return sprite;
};

export function createSpores(canvas, { source, animate = true, front = null } = {}) {
    const ctx = canvas.getContext('2d');
    const ctxFront = front?.getContext('2d') ?? null;    // optional second canvas, in front of the mushrooms, for the pine cone's sparks
    const glow = makeGlow();
    const goldGlow = makeGlow('255, 226, 110', 0.8);    // for the sparks of the pine cone
    const small = window.innerWidth < 600;
    const TARGET = small ? 400 : 680;     // the cloud never thins out below this: it is part of the composition
    const MAX = small ? 640 : 1050;        // and the pointer can stir up a lot more on top of it
    const spores = [];
    const cooldown = new Array(caps.length).fill(0);
    const totalWidth = caps.reduce((sum, cap) => sum + cap[2], 0);

    let width = 0, height = 0, dpr = 1;
    let frame = 0, visible = true, last = 0, clock = 0;
    let nextTrickle = 0, nextPuff = 1.2;
    const pointer = { x: -9999, y: -9999, vx: 0, vy: 0, active: false, lastX: 0, lastY: 0, lastT: 0 };

    // Where the caps are on screen, refreshed now and then (the picture moves with the parallax)
    const emitters = caps.map(() => ({ x: 0, y: 0, w: 0 }));
    let emittersAt = -1;
    const locateEmitters = () => {
        const box = source.getBoundingClientRect();
        const origin = canvas.getBoundingClientRect();
        caps.forEach(([cx, cy, cw], i) => {
            emitters[i].x = box.left - origin.left + cx * box.width;
            emitters[i].y = box.top - origin.top + cy * box.height;
            emitters[i].w = cw * box.width;
        });
        emittersAt = clock;
    };

    const resize = () => {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = canvas.clientWidth;
        height = canvas.clientHeight;
        if (!width) return;
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        if (front) {
            front.width = canvas.width;
            front.height = canvas.height;
            ctxFront.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
    };

    // Caps that are on screen (the strip is wider than the screen, so some are out of sight)
    const visibleCaps = () => {
        const list = [];
        emitters.forEach((cap, i) => { if (cap.x > -30 && cap.x < width + 30) list.push(i); });
        return list.length ? list : emitters.map((_, i) => i);
    };

    // A cap to let go of a puff: one that can be seen, the wider ones more often
    const pickCap = () => {
        const list = visibleCaps();
        let at = Math.random() * list.reduce((sum, i) => sum + emitters[i].w + 4, 0);
        for (const i of list) {
            at -= emitters[i].w + 4;
            if (at <= 0) return i;
        }
        return list[list.length - 1];
    };

    // A place along the whole width of the ground for the everyday trickle, so the cloud covers the picture
    // from edge to edge. It borrows its height from the nearest cap.
    const spot = () => {
        const x = Math.random() * width;
        const list = visibleCaps();
        const nearest = list.reduce((best, i) => (Math.abs(emitters[i].x - x) < Math.abs(emitters[best].x - x) ? i : best), list[0]);
        return { x, y: emitters[nearest].y + rand(-6, 14), w: 30 };
    };

    // One spore, leaving cap `i`. `kick` is the speed of its first push, `spread` the half-angle of the cone it leaves in.
    const release = (i, kick = 6, spread = 0.9, bias = [0, 0]) => {
        if (spores.length >= MAX) spores.shift();
        const cap = typeof i === 'number' ? emitters[i] : i;
        const angle = -Math.PI / 2 + rand(-spread, spread);
        const speed = kick * rand(0.4, 1.2);
        const mass = rand(0.25, 1);
        spores.push({
            x: cap.x + rand(-0.42, 0.42) * cap.w,
            y: cap.y + rand(-2, 3),
            vx: Math.cos(angle) * speed + bias[0],
            vy: Math.sin(angle) * speed + bias[1],
            r: rand(0.6, 1.8) * (0.7 + 0.5 * mass),
            mass,
            age: 0,
            life: rand(9, 20),
            phase: rand(0, TAU),
            twinkle: rand(1.2, 3.2),
            tint: TINTS[Math.floor(Math.random() * TINTS.length)],
        });
    };

    const puff = (i, count, kick, bias) => {
        for (let n = 0; n < count; n++) release(i, kick, 0.75, bias);
    };

    // The air: slow swells that differ from place to place, and from moment to moment
    const breeze = (x, y, t, out) => {
        out[0] = Math.sin(y * 0.011 + t * 0.32) * 7 + Math.sin(x * 0.004 - t * 0.21) * 5;
        out[1] = Math.cos(x * 0.009 + t * 0.27) * 3;
    };
    const air = [0, 0];

    const onPointer = (event) => {
        const box = canvas.getBoundingClientRect();
        const x = event.clientX - box.left, y = event.clientY - box.top;
        const now = performance.now();
        if (pointer.active && now > pointer.lastT) {
            const dt = (now - pointer.lastT) / 1000;
            // Smoothed velocity in pixels per second, so a flick and a drift feel different
            pointer.vx += ((x - pointer.lastX) / dt - pointer.vx) * 0.35;
            pointer.vy += ((y - pointer.lastY) / dt - pointer.vy) * 0.35;
        }
        pointer.x = pointer.lastX = x;
        pointer.y = pointer.lastY = y;
        pointer.lastT = now;
        pointer.active = true;

        // Brushing a cap shakes a puff loose
        if (emittersAt < 0 || clock - emittersAt > 0.2) locateEmitters();
        const speed = Math.hypot(pointer.vx, pointer.vy);

        // Moving through the low air stirs more spores up around the pointer, carried the way it moves
        const groundTop = Math.min(...emitters.map((cap) => cap.y));
        if (speed > 60 && y > groundTop - 170 && y < height + 20) {
            const stir = Math.min(2, 1 + Math.floor(speed / 420));
            for (let n = 0; n < stir && spores.length < MAX; n++) {
                const near = emitters.reduce((best, cap, i) => (Math.abs(cap.x - x) < Math.abs(emitters[best].x - x) ? i : best), 0);
                release(near, 6, 1.1, [pointer.vx * 0.05, pointer.vy * 0.03 - 4]);
                const s = spores[spores.length - 1];
                s.x = x + rand(-34, 34);
                s.y = y + rand(-24, 24);
            }
        }
        if (speed > 90) {
            emitters.forEach((cap, i) => {
                if (clock < cooldown[i]) return;
                if (Math.hypot(cap.x - x, cap.y - y) < Math.max(46, cap.w * 0.7)) {
                    cooldown[i] = clock + 0.7;
                    puff(i, Math.round(rand(4, 8)), rand(12, 22), [pointer.vx * 0.06, pointer.vy * 0.03 - 3]);
                }
            });
        }
    };
    const onLeave = () => { pointer.active = false; pointer.vx = pointer.vy = 0; pointer.x = pointer.y = -9999; };
    const onPress = (event) => {
        onPointer(event);
        // A tap on the ground sends up a cloud from the nearest cap
        locateEmitters();
        let best = 0, nearest = Infinity;
        emitters.forEach((cap, i) => {
            const distance = Math.hypot(cap.x - pointer.x, cap.y - pointer.y);
            if (distance < nearest) { nearest = distance; best = i; }
        });
        if (nearest < 140) puff(best, Math.round(rand(18, 30)), rand(26, 46), [0, 0]);
    };

    const step = (dt, t) => {
        // Release. First the baseline: whenever the cloud is below its usual size, a few more come out of the caps
        for (let n = 0; n < 8 && spores.length < TARGET; n++) release(spot(), 5);
        if (t > nextTrickle) {
            release(spot(), 5);
            nextTrickle = t + rand(0.02, 0.06);
        }
        if (t > nextPuff) {
            puff(pickCap(), Math.round(rand(10, 22)), rand(16, 34), [0, 0]);
            nextPuff = t + rand(1.2, 3.2);
        }

        const ceiling = height * 0.62;         // spores are gone before they climb to the sky
        const vanish = height * 0.44;
        const gust = pointer.active;
        for (let i = spores.length - 1; i >= 0; i--) {
            const s = spores[i];
            s.age += dt;
            if (s.age > s.life) { spores.splice(i, 1); continue; }

            // Air: a slow buoyant rise (the light ones), a drifting breeze and drag
            breeze(s.x, s.y, t, air);
            const lift = (0.7 - s.mass) * 34;                    // light spores climb into the clear air, the heaviest sink a little
            const tx = air[0] * (0.6 + s.mass * 0.4);
            const ty = air[1] - lift;
            const drag = 1 - Math.exp(-(0.9 + s.mass * 1.4) * dt);
            s.vx += (tx - s.vx) * drag;
            s.vy += (ty - s.vy) * drag;

            // A constant tremble
            const tremble = 20 * Math.sqrt(dt);
            s.vx += (Math.random() - 0.5) * tremble;
            s.vy += (Math.random() - 0.5) * tremble;

            // The pointer is a gust: it pushes away, swirls and carries
            if (gust) {
                const dx = s.x - pointer.x, dy = s.y - pointer.y;
                const distance = Math.hypot(dx, dy) || 1;
                if (distance < REACH) {
                    const f = (1 - distance / REACH) ** 2;
                    const light = 1.25 - s.mass * 0.6;           // the lightest are the most carried away
                    s.vx += (dx / distance * 300 + (-dy / distance) * 150 + pointer.vx * 1.5) * f * light * dt;
                    s.vy += (dy / distance * 300 + (dx / distance) * 150 + pointer.vy * 1.5) * f * light * dt;
                }
            }

            s.x += s.vx * dt;
            s.y += s.vy * dt;
            if (s.x < -30 || s.x > width + 30 || s.y > height + 30) spores.splice(i, 1);
        }

        // The pointer's own speed fades if it stops moving
        pointer.vx *= Math.exp(-3 * dt);
        pointer.vy *= Math.exp(-3 * dt);
        return { ceiling, vanish };
    };

    const draw = (t, { ceiling, vanish }) => {
        ctx.clearRect(0, 0, width, height);
        ctxFront?.clearRect(0, 0, width, height);
        for (const s of spores) {
            const born = smooth(0, 0.7, s.age);
            const dying = 1 - smooth(s.life * 0.65, s.life, s.age);
            const altitude = smooth(vanish, ceiling, s.y);        // 0 up in the sky, 1 near the ground
            const alpha = born * dying * altitude * (0.8 + 0.2 * Math.sin(t * s.twinkle + s.phase));
            if (alpha < 0.02) continue;

            const g = s.gold && ctxFront ? ctxFront : ctx;
            // A soft halo of the same blue (as if slightly out of focus), then the solid core
            if (s.r > 1.1 || s.gold) {          // the tiniest ones are too small for a halo to show
                const reach = s.r * 3.4;
                g.globalAlpha = alpha * 0.55;
                g.drawImage(s.gold ? goldGlow : glow, s.x - reach, s.y - reach, reach * 2, reach * 2);
            }

            g.globalAlpha = alpha;
            g.fillStyle = `rgb(${s.tint})`;
            g.beginPath();
            g.arc(s.x, s.y, s.r, 0, TAU);
            g.fill();
        }
        ctx.globalAlpha = 1;
        if (ctxFront) ctxFront.globalAlpha = 1;
    };

    const tick = (now) => {
        frame = requestAnimationFrame(tick);
        const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
        last = now;
        if (!visible) return;
        clock += dt;
        if (clock - emittersAt > 0.25) locateEmitters();
        draw(clock, step(dt, clock));
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    const visibility = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
    visibility.observe(canvas);
    resize();
    locateEmitters();

    if (animate) {
        // Start with the air already seeded, so the first look is not an empty field
        for (let n = 0; n < TARGET; n++) {
            release(spot(), 5);
            const s = spores[spores.length - 1];
            s.age = rand(0, s.life * 0.5);
            s.y -= rand(0, height * 0.3);
        }
        window.addEventListener('pointermove', onPointer, { passive: true });
        window.addEventListener('pointerdown', onPress, { passive: true });
        document.addEventListener('pointerleave', onLeave);
        window.addEventListener('pointercancel', onLeave);
        frame = requestAnimationFrame(tick);
    } else {
        // Reduced motion: a still handful of spores, no movement
        for (let n = 0; n < 36; n++) {
            release(spot(), 0);
            const s = spores[spores.length - 1];
            s.age = s.life * 0.3;
            s.y -= rand(0, height * 0.1);
        }
        draw(0, { ceiling: height * 0.62, vanish: height * 0.44 });
    }

    return {
        // Sparks of light thrown out of a point (viewport coordinates): the pine cone shining
        burst(clientX, clientY, count = 26) {
            const box = canvas.getBoundingClientRect();
            const x = clientX - box.left, y = clientY - box.top;
            for (let n = 0; n < count; n++) {
                if (spores.length >= MAX) spores.shift();
                const angle = rand(0, TAU);
                const speed = rand(22, 70);
                spores.push({
                    x: x + Math.cos(angle) * rand(0, 14), y: y + Math.sin(angle) * rand(0, 18),
                    vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 18,
                    r: rand(1.1, 2.4), mass: 0.3, age: 0, life: rand(1.4, 2.6),
                    phase: rand(0, TAU), twinkle: rand(3, 6), tint: '255, 232, 120', gold: true,
                });
            }
        },
        destroy() {
            cancelAnimationFrame(frame);
            resizeObserver.disconnect();
            visibility.disconnect();
            window.removeEventListener('pointermove', onPointer);
            window.removeEventListener('pointerdown', onPress);
            document.removeEventListener('pointerleave', onLeave);
            window.removeEventListener('pointercancel', onLeave);
        },
    };
}
