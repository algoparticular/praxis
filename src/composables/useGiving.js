// Dar y recibir (give and receive): the engine shared by the cards of the verb (Dana, where it was born, Metta and
// Gratitud). There is a source of light and those who can receive it. The gesture is
// a touch: each touch sends a light from the source to that one (it flies in an arc, and lights him up when it
// arrives). There is no order and nothing is lost: touching one who has his light already only makes him glow. When
// everyone has been given one, they all send a light back to the source at once, without being asked, and the rulito
// is born; a while later it goes, the lights fade slowly, and it can be played again.
// The scene says where things are (in px of the canvas, now: they move with the parallax), what it sounds like and how
// it looks; this keeps the state and the lights in the air, and draws the lights as one dynamic particle group (motes).
//   source()          where the light leaves from (and comes back to): { x, y }
//   target(i)         where the light lands on receiver i: { x, y }
//   can(i)            optional: whether the source can give now (Metta: Sid has to love himself first); if not, on.wait(i)
//   on.give(i)        a light leaves for i              on.again(i)   i already has his (or one is on its way)
//   on.receive(i, n)  it arrives; n have their light   on.back()     everyone sends theirs back
//   on.balance(wins)  they are back: the rulito is born on.full()     the rulito is whole
//   on.fade()         the rulito starts to go and the lights fade      on.puff(x, y, colors)  a trail of sparks
//   on.hint(i)        left alone HINT s, i (who has no light yet) glimmers
//   on.returned(i)    i's light is back at the source
// Options: `lift()` how high an arc goes over the higher of its ends (px, plus 0.3 of its length); `linger` s the whole
// rulito stays; `lag` s a second rulito is born after the first (Dana's two friends): the rulito is whole when that
// one is too, and win.grown(lag) says how far it has grown.
const GROW = 2.6, EAT = 3.4, DELAY = 0.5;
const HINT = 7;

export function createGiving({ count, source, target, can = () => true, reduced = false, colors = [0xffffff], back = colors,
    lift = () => 20, linger = 2.4, lag = 0, on = {} }) {
    const state = Array.from({ length: count }, () => ({ lit: 0, goal: 0, coming: false, given: false, flash: 0 }));
    const lights = [];                       // { from(), to(), age, T, colors, arrive, x, y }
    let returning = false;
    let win = null;                          // { age, head, tail, full, fullAt, back, pop }
    let wins = 0;
    let idle = 0;
    let trail = 0;

    // A light flying in an arc between two points that may move while it flies: higher the further it goes
    const send = (from, to, { T, delay = 0, colors: tint = colors, arrive }) => {
        if (reduced) { arrive?.(); return; }
        lights.push({ from, to, age: -delay, T, colors: tint, arrive, x: 0, y: 0 });
    };
    const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

    const give = (i) => {
        idle = 0;
        const s = state[i];
        if (s.given || s.coming || win || returning) {
            s.flash = 1;
            on.again?.(i);
            return;
        }
        if (!can(i)) { s.flash = 0.6; on.wait?.(i); return; }
        s.coming = true;
        on.give?.(i);
        const d = distance(source(), target(i));
        send(source, () => target(i), { T: 0.5 + d * 0.0018, arrive: () => receive(i) });
    };

    const receive = (i) => {
        const s = state[i];
        s.coming = false;
        s.given = true;
        s.goal = 1;
        s.flash = 1;
        const n = state.filter((o) => o.given).length;
        on.receive?.(i, n);
        if (n === count) setTimeout(giveBack, reduced ? 200 : 600);
    };

    // Everyone has his light: they all send one back to the source at once, without being asked
    const giveBack = () => {
        if (returning || win) return;
        returning = true;
        on.back?.();
        state.forEach((s, i) => {
            s.flash = 1;
            send(() => target(i), source, { T: 1.1, delay: i * 0.04, colors: back, arrive: () => on.returned?.(i) });
        });
        setTimeout(balance, reduced ? 300 : 1300);
    };

    // They are back, multiplied: the rulito is born
    const balance = () => {
        returning = false;
        if (win) return;
        wins += 1;
        win = {
            age: 0, head: 0, tail: 0, full: false, fullAt: 0, back: false, pop: 0,
            grown(late = 0) { return 1 - (1 - Math.min(1, Math.max(0, (this.age - DELAY - late) / GROW))) ** 1.6; },
        };
        on.balance?.(wins);
    };

    const tickWin = (dt) => {
        if (!win) return;
        win.age += dt;
        win.pop = Math.max(0, win.pop - dt * 2.2);
        win.head = win.grown(0);
        if (win.head >= 1 && win.grown(lag) >= 1 && !win.full) {
            win.full = true;
            win.fullAt = win.age;
            win.pop = 1;
            on.full?.();
        }
        if (win.full && !win.back && win.age - win.fullAt > linger) {
            win.back = true;
            state.forEach((s) => { s.given = false; s.goal = 0; });
            on.fade?.();
        }
        if (win.back) win.tail = Math.min(1, win.tail + dt / EAT);
        if (win.back && win.tail >= 1) win = null;
    };

    const step = (dt) => {
        idle += dt;
        trail += dt;
        const puff = trail > 0.05;
        if (puff) trail = 0;
        for (let k = lights.length - 1; k >= 0; k--) {
            const l = lights[k];
            l.age += dt;
            if (l.age < 0) continue;
            const u = Math.min(1, l.age / l.T);
            const e = 1 - (1 - u) ** 2;               // it slows as it gets there
            const q = 1 - e;
            const a = l.from(), b = l.to();
            const c = { x: (a.x + b.x) / 2, y: Math.min(a.y, b.y) - (lift() + distance(a, b) * 0.3) };
            l.x = q * q * a.x + 2 * q * e * c.x + e * e * b.x;
            l.y = q * q * a.y + 2 * q * e * c.y + e * e * b.y;
            if (puff) on.puff?.(l.x, l.y, l.colors);
            if (u >= 1) {
                lights.splice(k, 1);
                l.arrive?.();
            }
        }
        if (!win && !returning && idle > HINT) {
            idle = 0;
            const waiting = state.map((s, i) => (s.given || s.coming ? -1 : i)).filter((i) => i >= 0);
            if (waiting.length) {
                const i = waiting[Math.floor(Math.random() * waiting.length)];
                state[i].flash = 0.6;
                on.hint?.(i);
            }
        }
        state.forEach((s) => {
            s.lit += (s.goal - s.lit) * Math.min(1, dt * (s.goal < s.lit ? 0.35 : 2.2));
            s.flash = Math.max(0, s.flash - dt * 1.4);
        });
        tickWin(dt);
    };

    // The lights in the air: a small bright ball of dots each (size: px of a dot)
    const MOTES = 12;
    const motes = (size) => ({
        count: (count + 2) * MOTES,
        update(t, data) {
            const u = size();
            for (let i = 0; i < data.count; i++) {
                const l = lights[Math.floor(i / MOTES)];
                if (!l || l.age < 0) { data.alphas[i] = 0; continue; }
                const j = i % MOTES, angle = j * 2.399 + t * 5, reach = u * 0.9 * (j / MOTES);
                fill(data, i, l.x + Math.cos(angle) * reach, l.y + Math.sin(angle) * reach, u * (j < 2 ? 1.8 : 1), j < 2 ? 0.95 : 0.8, l.colors[j % l.colors.length]);
            }
        },
    });

    return {
        state,
        give,
        step,
        motes,
        get win() { return win; },
        get busy() { return !!win || returning; },
        // Nothing is moving: no rulito, no lights in the air, every glow at rest (a still scene can stop drawing)
        get settled() { return !win && !returning && !lights.length && state.every((s) => Math.abs(s.goal - s.lit) < 0.01 && s.flash < 0.01); },
        touched() { idle = 0; },
    };
}

// Writes one particle of a dynamic useStardust group
export const fill = (data, i, x, y, size, alpha, color) => {
    data.positions[i * 3] = x;
    data.positions[i * 3 + 1] = y;
    data.sizes[i] = size;
    data.alphas[i] = alpha;
    data.tints[i * 3] = (color >> 16 & 255) / 255;
    data.tints[i * 3 + 1] = (color >> 8 & 255) / 255;
    data.tints[i * 3 + 2] = (color & 255) / 255;
};

// The rulito's canvas is bigger than the glyph (for its glow), as in Paciencia and Dana: the rect of the canvas round a
// glyph's rect
export const rulitoBox = (glyph) => ({ left: glyph.left - 0.4375 * glyph.w, top: glyph.top - 0.1628 * glyph.h, w: glyph.w * 1.875, h: glyph.h * 1.3256 });
