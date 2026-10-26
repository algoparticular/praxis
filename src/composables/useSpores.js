// Fungal spores for the Paciencia scene, drawn on a 2D canvas over the field of mushrooms.
//
// They are released from the real caps of the mushrooms (mushroomCaps.json holds where each cap is, as fractions of
// the mushrooms picture, so the emitters follow the picture whatever its size or parallax). A few at a time trickle
// out from under the caps, now and then a cap lets go of a whole puff, and brushing a cap with the pointer shakes one
// loose. Once in the air a spore is almost weightless: a slow buoyant rise, a drifting breeze that changes over time,
// a constant tremble (Brownian motion) and drag. The pointer is a gust: spores near it are pushed away, swirled and
// carried along with its movement, then settle back into the drift. They stay low (they fade out before reaching
// the sky) and never live long.
//
// Besides the spores that leave the caps there is a dust: a standing population of tiny motes hanging in the clear air above
// the mushrooms, in the manner of the dust around the hero's spiral. They twinkle, drift along slow currents that differ
// from one height to the next, wrap round the edges, and when the pointer blows they are sent flying and then drift back.

import caps from './mushroomCaps.json';

const smooth = (edge0, edge1, x) => {
    const k = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
    return k * k * (3 - 2 * k);
};
const rand = (min, max) => min + Math.random() * (max - min);
const TAU = Math.PI * 2;

const REACH = 150;          // radius of the pointer's gust, in CSS pixels
// How the pointer treats the cloud. Passing over: a little drag along its path and the faintest push aside.
// Pressed: a real blow, outwards and swirling, that carries them along as it moves.
const HOVER_DRAG = 0.75;
const HOVER_PUSH = 45;
const BLOW = 250;
const SWIRL = 90;
const BLOW_DRAG = 1.1;
const BLAST = [60, 220];     // the first breath at the click: base and gain towards the centre
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
    const TARGET = small ? 220 : 340;     // spores leaving the caps (many are hidden among the coral)
    const MOTES = small ? 340 : 620;      // dust in the clear air: this is what makes the cloud     // the cloud never thins out below this: it is part of the composition
    const MAX = small ? 520 : 760;        // and the pointer can stir up a lot more on top of it
    const spores = [];
    const totalWidth = caps.reduce((sum, cap) => sum + cap[2], 0);

    let width = 0, height = 0, dpr = 1;
    let frame = 0, visible = true, last = 0, clock = 0;
    let nextTrickle = 0, nextPuff = 1.2;
    let surge = 0, surgeFor = 1;        // 1 right after surge() and down to 0 over surgeFor seconds: the cloud swells, then settles
    const pointer = { x: -9999, y: -9999, vx: 0, vy: 0, active: false, pressed: false, lastX: 0, lastY: 0, lastT: 0 };

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

    // ---- Dust ----
    const motes = [];
    const seedMotes = () => {
        motes.length = 0;
        if (!width) return;
        const top = height * 0.36;
        const groundTop = Math.min(...emitters.map((cap) => cap.y), height * 0.9);
        for (let n = 0; n < MOTES; n++) {
            const depth = rand(0.35, 1);                       // far motes are smaller, fainter and slower
            motes.push({
                bx: rand(0, width),
                // denser near the ground, thinning upwards
                by: groundTop + 4 - Math.random() ** 1.5 * (groundTop - top),
                depth,
                r: rand(0.7, 1.9) * (0.55 + 0.6 * depth),
                a: rand(0.45, 1) * (0.5 + 0.5 * depth),
                phase: rand(0, TAU), twinkle: rand(0.9, 2.8), bob: rand(0.15, 0.5), amp: rand(3, 11),
                dx: 0, dy: 0, dvx: 0, dvy: 0,
                x: 0, y: 0,
                tint: TINTS[Math.floor(Math.random() * TINTS.length)],
            });
            const m = motes[motes.length - 1];
            m.x = m.bx;
            m.y = m.by;
        }
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
        locateEmitters();
        seedMotes();
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
        if (spores.length >= MAX * (1 + 2.2 * surge)) spores.shift();
        const cap = typeof i === 'number' ? emitters[i] : i;
        const angle = -Math.PI / 2 + rand(-spread, spread);
        const speed = kick * rand(0.4, 1.2);
        const mass = rand(0.25, 1);
        spores.push({
            x: cap.x + rand(-0.42, 0.42) * cap.w,
            y: cap.y + rand(-2, 3),
            vx: Math.cos(angle) * speed + bias[0],
            vy: Math.sin(angle) * speed + bias[1],
            r: rand(0.8, 2.2) * (0.7 + 0.5 * mass),
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

    };
    const onLeave = () => { pointer.active = false; pointer.pressed = false; pointer.vx = pointer.vy = 0; pointer.x = pointer.y = -9999; };
    const onRelease = () => { pointer.pressed = false; };
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

        // A breath at the point of the click: the spores around it are sent flying outwards, the closer the harder
        pointer.pressed = true;
        for (const s of spores) {
            const dx = s.x - pointer.x, dy = s.y - pointer.y;
            const distance = Math.hypot(dx, dy) || 1;
            if (distance > 260) continue;
            const f = (1 - distance / 260) ** 1.4;
            const light = 1.25 - s.mass * 0.6;
            s.vx += dx / distance * (BLAST[0] + BLAST[1] * f) * light;
            s.vy += dy / distance * (BLAST[0] + BLAST[1] * f) * light - 30 * f;
        }
        for (const m of motes) {
            const dx = m.x - pointer.x, dy = m.y - pointer.y;
            const distance = Math.hypot(dx, dy) || 1;
            if (distance > 260) continue;
            const f = (1 - distance / 260) ** 1.4;
            m.dvx += dx / distance * (BLAST[0] + 15 + (BLAST[1] + 30) * f) * (0.6 + 0.5 * m.depth);
            m.dvy += dy / distance * (BLAST[0] + 15 + (BLAST[1] + 30) * f) * (0.6 + 0.5 * m.depth) - 30 * f;
        }
    };

    const step = (dt, t) => {
        // Release. First the baseline: whenever the cloud is below its usual size, a few more come out of the caps
        surge = Math.max(0, surge - dt / surgeFor);
        const target = TARGET * (1 + 4 * surge);
        for (let n = 0; n < 8 + 40 * surge && spores.length < target; n++) release(spot(), 5 + 12 * surge);
        if (t > nextTrickle) {
            release(spot(), 5);
            nextTrickle = t + rand(0.02, 0.06) * (1 - 0.6 * surge);
        }
        if (t > nextPuff) {
            puff(pickCap(), Math.round(rand(10, 22) * (1 + 1.5 * surge)), rand(16, 34) * (1 + 0.5 * surge), [0, 0]);
            nextPuff = t + rand(1.2, 3.2) * (1 - 0.6 * surge);
        }

        // Spores are gone before they climb to the sky; when the cloud swells it climbs much higher, into the boat's air
        const ceiling = height * (0.62 + 0.24 * surge);
        const vanish = height * (0.44 - 0.16 * surge);
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

            // The pointer: passing over only drags them a hair; pressed, it blows
            if (gust) {
                const dx = s.x - pointer.x, dy = s.y - pointer.y;
                const distance = Math.hypot(dx, dy) || 1;
                if (distance < REACH) {
                    const f = (1 - distance / REACH) ** 2;
                    const light = 1.25 - s.mass * 0.6;           // the lightest are the most carried away
                    if (pointer.pressed) {
                        s.vx += (dx / distance * BLOW + (-dy / distance) * SWIRL + pointer.vx * BLOW_DRAG) * f * light * dt;
                        s.vy += (dy / distance * BLOW + (dx / distance) * SWIRL + pointer.vy * BLOW_DRAG) * f * light * dt;
                    } else {
                        s.vx += (pointer.vx * HOVER_DRAG + dx / distance * HOVER_PUSH) * f * light * dt;
                        s.vy += (pointer.vy * HOVER_DRAG + dy / distance * HOVER_PUSH) * f * light * dt;
                    }
                }
            }

            s.x += s.vx * dt;
            s.y += s.vy * dt;
            if (s.x < -30 || s.x > width + 30 || s.y > height + 30) spores.splice(i, 1);
        }

        // The dust: it rides slow currents, bobs, and is thrown about by the pointer, then drifts back to where it hangs
        for (const m of motes) {
            const flow = (Math.sin(m.by * 0.012 + t * 0.13) * 14 + 5) * m.depth;
            m.bx += flow * dt;
            if (m.bx > width + 12) m.bx = -12; else if (m.bx < -12) m.bx = width + 12;

            m.dvx += -m.dx * 0.5 * dt;
            m.dvy += -m.dy * 0.5 * dt;
            const damp = Math.exp(-1.3 * dt);
            m.dvx *= damp;
            m.dvy *= damp;
            m.x = m.bx + m.dx;
            m.y = m.by + Math.sin(t * m.bob + m.phase) * m.amp + m.dy;

            if (gust) {
                const dx = m.x - pointer.x, dy = m.y - pointer.y;
                const distance = Math.hypot(dx, dy) || 1;
                if (distance < REACH) {
                    const f = (1 - distance / REACH) ** 2;
                    if (pointer.pressed) {
                        m.dvx += (dx / distance * BLOW + (-dy / distance) * SWIRL + pointer.vx * BLOW_DRAG) * f * dt;
                        m.dvy += (dy / distance * BLOW + (dx / distance) * SWIRL + pointer.vy * BLOW_DRAG) * f * dt;
                    } else {
                        m.dvx += (pointer.vx * HOVER_DRAG + dx / distance * HOVER_PUSH) * f * dt;
                        m.dvy += (pointer.vy * HOVER_DRAG + dy / distance * HOVER_PUSH) * f * dt;
                    }
                }
            }
            m.dx += m.dvx * dt;
            m.dy += m.dvy * dt;
        }

        // The pointer's own speed fades if it stops moving
        pointer.vx *= Math.exp(-3 * dt);
        pointer.vy *= Math.exp(-3 * dt);
        return { ceiling, vanish, bold: surge };
    };

    const draw = (t, { ceiling, vanish, bold = 0 }) => {
        ctx.clearRect(0, 0, width, height);
        ctxFront?.clearRect(0, 0, width, height);

        // Dust first: far behind everything else. It twinkles, and thins out towards the top of its band.
        const bandTop = height * 0.36;
        for (const m of motes) {
            const sparkle = 0.5 + 0.5 * Math.sin(t * m.twinkle + m.phase * 3);
            const alpha = m.a * (0.25 + 0.75 * sparkle ** 1.4) * smooth(bandTop, bandTop + height * 0.18, m.y);
            if (alpha < 0.02) continue;
            if (m.r > 1.15) {
                const reach = m.r * 3.2;
                ctx.globalAlpha = alpha * 0.4;
                ctx.drawImage(glow, m.x - reach, m.y - reach, reach * 2, reach * 2);
            }
            ctx.globalAlpha = alpha;
            ctx.fillStyle = `rgb(${m.tint})`;
            ctx.beginPath();
            ctx.arc(m.x, m.y, m.r, 0, TAU);
            ctx.fill();
        }

        for (const s of spores) {
            const born = smooth(0, 0.7, s.age);
            const dying = 1 - smooth(s.life * 0.65, s.life, s.age);
            const altitude = smooth(vanish, ceiling, s.y);        // 0 up in the sky, 1 near the ground
            const alpha = Math.min(1, born * dying * altitude * (0.8 + 0.2 * Math.sin(t * s.twinkle + s.phase)) * (1 + 0.5 * bold));
            if (alpha < 0.02) continue;

            const g = s.gold && ctxFront ? ctxFront : ctx;
            const r = s.gold ? s.r : s.r * (1 + 0.9 * bold);          // swollen, they are bigger and show more
            // A soft halo of the same blue (as if slightly out of focus), then the solid core
            if (r > 1.1 || s.gold) {          // the tiniest ones are too small for a halo to show
                const reach = r * 3.4;
                g.globalAlpha = alpha * 0.55;
                g.drawImage(s.gold ? goldGlow : glow, s.x - reach, s.y - reach, reach * 2, reach * 2);
            }

            g.globalAlpha = alpha;
            g.fillStyle = `rgb(${s.tint})`;
            g.beginPath();
            g.arc(s.x, s.y, r, 0, TAU);
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
        window.addEventListener('pointerup', onRelease, { passive: true });
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
        // The spores multiply: a wave goes up from every cap on screen, and for `seconds` the cloud is several times
        // denser, bigger and higher, and puffs more often, then it settles back to its usual size as they drift away
        swell(seconds = 14) {
            if (!animate) return;
            locateEmitters();
            visibleCaps().forEach((i) => puff(i, Math.round(rand(16, 26)), rand(50, 90), [0, 0]));
            surge = 1;
            surgeFor = seconds;
        },
        destroy() {
            cancelAnimationFrame(frame);
            resizeObserver.disconnect();
            visibility.disconnect();
            window.removeEventListener('pointermove', onPointer);
            window.removeEventListener('pointerdown', onPress);
            window.removeEventListener('pointerup', onRelease);
            document.removeEventListener('pointerleave', onLeave);
            window.removeEventListener('pointercancel', onLeave);
        },
    };
}
