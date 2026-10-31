// Encender (Kätus): rub a source until it catches fire, then pull it back like a sling and let go: a flame flies, and
// what it touches catches fire. The engine of the four cards of the verb: Evolución, Viriya, Coraje and Desafío.
// createKindle(options) gives the state and the gestures; the scene says where the source is, what the flame bounces off
// and what it lights (in `collide`), and draws the flame and the source's fire from `mode`, `charge` and `flame`.
// Options:
//   size()        px of the scene's frame: every distance and speed is measured in it
//   source()      where the fire is now ({ x, y }, px of the canvas)
//   canvas()      the canvas element (to turn pointer events into its px)
//   sparks        a createSparks pool
//   collide(flame, dt)  after each step of the flight: bounce it (`bounce()`), light what it passes
//   rub, steady, cool   frame widths of rubbing for it to catch, rubbing faster than `steady` a second does not count,
//                       heat lost per second while nobody rubs
//   fuel          bounces a flame lasts; gravity and drag (frame widths a second², per second)
//   speed         [base, more for a full pull] frame widths a second
//   onIgnite(), onLaunch(k), onOut(), onKindle(step)   to sound and show them
//   busy()        true while the scene does not let it play (a rulito)
//   maxPull, aimMin    the full pull (frame widths) and the least of it that launches anything
//   aimFrom       'anchor': the sling's band starts where the source was when it was taken; 'source': where it is now
//                 (Evolución: the being follows the finger a little while it is pulled back)
//   aimReach      [base, more for a full pull] frame widths the dots of where it will go reach
//   rubSparks     'either': rubbing throws sparks from the finger or the source; 'finger': only from the finger
//   flightCharge  how much of the source's fire (`charge`) is left while the flame flies (1: the source is the flame)
//   still         no sparks while rubbing, at a launch or when it goes out (reduced motion, where the scene plays)
//   body          the flame is the source itself, moved by the scene (Evolución's being, in its water):
//                 { launch(dx, dy, pull) } sets it off; while it flies the flame only follows `source()` and calls
//                 `collide`, which bounces it and says when it goes out (`goOut()`): no gravity, drag, homing, embers
//                 or limits of its own here
export const FIRE = [0xffb069, 0xff9a5c, 0xffd29a, 0xfff3d6, 0xf2b036];

export const createKindle = ({
    size, source, canvas, sparks, collide = () => {}, busy = () => false,
    rub = 1.6, steady = 1.6, cool = 0.25, fuel = 4, gravity = 0.55, drag = 0.35, speed = [0.9, 1.7], maxPull = 0.32, aimMin = 0.12,
    aimFrom = 'anchor', aimReach = [0.25, 0.5], rubSparks = 'either', flightCharge = 0.25, still = false, body = null,
    onIgnite = () => {}, onLaunch = () => {}, onOut = () => {}, onKindle = () => {}, fire = FIRE,
}) => {
    const k = {
        mode: 'cold',            // cold: rub it; lit: on fire, sling it; flying: a flame is out
        heat: 0, charge: 0, kindled: 0,
        rubbing: false, aiming: false,
        finger: null, anchor: null,
        idle: 0, embers: 0,
        flame: { x: 0, y: 0, vx: 0, vy: 0, fuel: 0, age: 0, home: null },
    };
    let prevFinger = null, prevAt = 0;

    const onCanvas = (event) => {
        const area = canvas().getBoundingClientRect();
        return { x: event.clientX - area.left, y: event.clientY - area.top };
    };
    k.pull = () => {
        if (!k.finger || !k.anchor) return { x: 0, y: 0, k: 0 };
        let x = k.finger.x - k.anchor.x, y = k.finger.y - k.anchor.y;
        const d = Math.hypot(x, y), max = size() * maxPull;
        if (d > max) { x *= max / d; y *= max / d; }
        return { x, y, k: Math.min(1, d / max) };
    };

    // Pressing on the source: cold, it starts to rub; on fire, it takes the sling
    k.press = (event) => {
        k.idle = 0;
        k.finger = prevFinger = onCanvas(event);
        prevAt = performance.now();
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', letGo);
        window.addEventListener('pointercancel', letGo);
        if (busy()) return false;
        if (k.mode === 'cold') k.rubbing = true;
        else if (k.mode === 'lit') { k.aiming = true; k.anchor = source(); }
        return true;
    };
    const move = (event) => {
        k.finger = onCanvas(event);
        const now = performance.now();
        if (k.rubbing && prevFinger) {
            const d = Math.hypot(k.finger.x - prevFinger.x, k.finger.y - prevFinger.y);
            const counted = Math.min(d, steady * size() * Math.max(0.008, (now - prevAt) / 1000));
            k.heat = Math.min(1, k.heat + counted / (size() * rub));
            if (!still && d > 3 && Math.random() < 0.25 + k.heat) {
                const from = rubSparks === 'finger' || Math.random() < 0.5 ? k.finger : source();
                sparks.burst(from.x, from.y, { n: 1 + Math.round(k.heat * 2), colors: fire, speed: 30 + 60 * k.heat, life: 0.8, size: 2.5 + 2 * k.heat, spread: 4 });
            }
            k.idle = 0;
        }
        prevFinger = k.finger;
        prevAt = now;
    };
    const letGo = () => {
        stop();
        k.rubbing = false;
        if (k.aiming) {
            k.aiming = false;
            const p = k.pull();
            if (p.k >= aimMin) { const d = Math.hypot(p.x, p.y); k.launch(-p.x / d, -p.y / d, p.k); }
            k.anchor = null;
        }
        k.finger = prevFinger = null;
    };
    const stop = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', letGo);
        window.removeEventListener('pointercancel', letGo);
    };

    // With the keyboard: each press warms it a fifth; on fire, `aimAt` says where to throw it: a point it homes in on, or a
    // function giving that point as it moves (it homes in until the function gives null)
    k.key = (aimAt) => {
        k.idle = 0;
        if (busy()) return;
        const s = source();
        if (k.mode === 'cold') {
            k.heat = Math.min(1, k.heat + 0.2);
            sparks.burst(s.x, s.y, { n: 6, colors: fire, speed: 60, life: 0.8, size: 3.5, spread: 6 });
            if (k.heat > 0.99) k.ignite();
        } else if (k.mode === 'lit') {
            const home = aimAt?.();
            const to = typeof home === 'function' ? home() : home;
            if (!to) return;
            const d = Math.hypot(to.x - s.x, to.y - s.y) || 1;
            k.launch((to.x - s.x) / d, (to.y - s.y) / d, 0.6, home);
        }
    };

    k.ignite = () => {
        k.mode = 'lit';
        k.heat = 1;
        const s = source();
        sparks.burst(s.x, s.y, { n: 40, colors: fire, speed: 140, life: 1.8, size: 5, spread: 8 });
        onIgnite();
    };
    // `home`, from the keyboard: a point the flame seeks until `collide` clears it (or a function, see `key`)
    k.launch = (dx, dy, pull, home = null) => {
        const s = source();
        if (body) {
            Object.assign(k.flame, { x: s.x, y: s.y, fuel, age: 0, home: null });
            body.launch(dx, dy, pull);
        } else {
            const v = size() * (speed[0] + speed[1] * pull);
            Object.assign(k.flame, { x: s.x, y: s.y, vx: dx * v, vy: dy * v, fuel, age: 0, home });
        }
        k.mode = 'flying';
        if (!still) sparks.burst(s.x, s.y, { n: Math.round(14 + 20 * pull), colors: fire, speed: 120, life: 1.4, size: 4.5, spread: 6 });
        onLaunch(pull);
    };
    k.goOut = () => {
        k.mode = 'cold';
        k.heat = 0;
        k.kindled = 0;
        if (!still) sparks.burst(k.flame.x, k.flame.y, { n: 12, colors: [0xcfc4d6, 0xe8e0ea, 0xffd29a], speed: 40, life: 1.6, size: 3.5, spread: 8 });
        onOut();
    };
    // A knock: the flame loses a bounce, with a few sparks
    k.bounce = () => {
        k.flame.fuel -= 1;
        sparks.burst(k.flame.x, k.flame.y, { n: 12, colors: fire, speed: 80, life: 1, size: 4, spread: 4 });
    };
    // Bouncing off the edges of the screen
    k.edges = (W, H) => {
        const f = k.flame;
        let hit = false;
        if (f.x < 0) { f.x = 0; f.vx = Math.abs(f.vx) * 0.8; hit = true; }
        if (f.x > W) { f.x = W; f.vx = -Math.abs(f.vx) * 0.8; hit = true; }
        if (f.y < 0) { f.y = 0; f.vy = Math.abs(f.vy) * 0.8; hit = true; }
        if (f.y > H) { f.y = H; f.vy = -Math.abs(f.vy) * 0.75; hit = true; }
        if (hit) k.bounce();
        return hit;
    };
    // Back to cold, as after a rulito
    k.reset = () => { k.mode = 'cold'; k.heat = 0; k.kindled = 0; };

    // Every frame: the heat, the flight and the source's fire (charge, eased)
    k.update = (t, dt) => {
        k.idle += dt;
        if (k.mode === 'cold' && !busy()) {
            if (!k.rubbing) k.heat = Math.max(0, k.heat - dt * cool);
            const sixth = Math.floor(k.heat * 6);
            if (sixth > k.kindled) { k.kindled = sixth; onKindle(k.heat); }
            if (sixth < k.kindled - 1) k.kindled = sixth;
            if (k.heat >= 1) k.ignite();
        }
        if (k.mode === 'flying' && body) {
            const f = k.flame;
            f.age += dt;
            Object.assign(f, source());
            collide(f, dt);
        } else if (k.mode === 'flying') {
            const f = k.flame;
            f.age += dt;
            const live = typeof f.home === 'function';
            const to = live ? f.home() : f.home;
            if (live && !to) f.home = null;
            if (to) {
                const d = Math.hypot(to.x - f.x, to.y - f.y) || 1;
                const v = size() * 1.4;
                f.vx += ((to.x - f.x) / d * v - f.vx) * Math.min(1, dt * 4);
                f.vy += ((to.y - f.y) / d * v - f.vy) * Math.min(1, dt * 4);
                if (!live && d < 12) f.home = null;
            } else {
                f.vy += size() * gravity * dt;
                const slow = Math.exp(-drag * dt);
                f.vx *= slow;
                f.vy *= slow;
            }
            f.x += f.vx * dt;
            f.y += f.vy * dt;
            collide(f, dt);
            k.embers += dt;
            if (k.embers > 0.022) {
                k.embers = 0;
                sparks.burst(f.x, f.y, { n: 3, colors: fire, speed: 30, life: 0.7, size: 4, spread: 5 });
            }
            if (k.mode === 'flying' && (f.fuel <= 0 || f.age > 6 || (!f.home && Math.hypot(f.vx, f.vy) < size() * 0.12))) k.goOut();
        }
        const want = k.mode === 'cold' ? k.heat * 0.6 : k.mode === 'lit' ? 1 : flightCharge;
        k.charge += (want - k.charge) * Math.min(1, dt * (want > k.charge ? 6 : 3));
    };

    // The sling, as particles: a band from the source to the finger and, the other way, where the flame will go (from
    // where it was taken, or from where the source is now: `aimFrom`)
    const AIM_N = 44;
    k.aimGroup = {
        count: AIM_N,
        update(t, data) {
            data.alphas.fill(0);
            if (!k.aiming || !k.finger || !k.anchor) return;
            const p = k.pull();
            const { finger } = k;
            const anchor = aimFrom === 'source' ? source() : k.anchor;
            for (let i = 0; i < 14; i++) {
                const u = i / 13;
                data.positions[i * 3] = anchor.x + (finger.x - anchor.x) * u;
                data.positions[i * 3 + 1] = anchor.y + (finger.y - anchor.y) * u;
                data.sizes[i] = 3 + 2 * p.k;
                data.alphas[i] = 0.5 + 0.4 * p.k;
                data.tints.set([1, 0.75 + 0.2 * u, 0.45 + 0.3 * u], i * 3);
            }
            if (p.k < aimMin) return;
            const d = Math.hypot(p.x, p.y) || 1;
            for (let i = 14; i < AIM_N; i++) {
                const u = (i - 13) / (AIM_N - 14);
                const go = u * size() * (aimReach[0] + aimReach[1] * p.k) + ((t * 60) % 8);
                data.positions[i * 3] = anchor.x - p.x / d * go;
                data.positions[i * 3 + 1] = anchor.y - p.y / d * go;
                data.sizes[i] = 3.2 * (1 - u * 0.6);
                data.alphas[i] = (1 - u) * 0.8;
                data.tints.set([1, 0.82, 0.55], i * 3);
            }
        },
    };

    k.destroy = stop;
    return k;
};
