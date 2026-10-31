// Arraigar, the engine shared by Compromiso, Confianza and Fe (Paciencia, Hogar and Addhitthana keep their own, older
// ones): hold something and something grows; held long enough the rulito is whole. It is the rulito's own stroke that
// keeps the count: `head` is how far its front has gone (0..1) and `tail` how far its back has; while held the head
// goes on (and the tail, if it had started to catch up, goes back), let go a moment the tail catches up with the head
// (so nothing is lost at once, and holding again picks it up), and once the two meet everything starts again. What
// grows in each scene is drawn from `head` and `tail` too (the lit stretch of Compromiso's path, the light running out
// along Confianza's corridors, Fe's heart), so the rulito and the scene never disagree.
// step(dt) moves it on and returns { head, tail, full, pop, named, flare }: `named` is how much the card's name glows
// (--name-glow), `flare` the rulito's shine once whole. The scene calls hold() and release() (finger, mouse or key).

export function createRooting({ grow = 4, eat = 3.4, linger = 3, slack = 0.3, notes = [1 / 3, 2 / 3], onNote, onComplete, onReset } = {}) {
    let held = false;
    let head = 0, tail = 0, grown = 0;
    let full = false;
    let pop = 0;
    let idle = 0;
    let wins = 0;

    const hold = () => { held = true; };
    const release = () => { held = false; };

    const step = (dt, t = 0) => {
        pop = Math.max(0, pop - dt * 2.2);
        if (held) {
            // Held, it grows (and, whole, it stays whole as long as it is held)
            idle = 0;
            if (!full) {
                const before = grown;
                grown = Math.min(1, grown + dt / grow);
                head = Math.max(head, 1 - (1 - grown) ** 1.6);
                notes.forEach((q, i) => { if (before < q && grown >= q) onNote?.((i + 1) / (notes.length + 1)); });
            }
            tail = Math.max(0, tail - dt / 0.8);
        } else if (head > 0) {
            idle += dt;
            if (idle > (full ? linger : slack)) tail = Math.min(head, tail + dt / eat);
        }
        if (head >= 1 && !full) {
            full = true;
            pop = 1;
            wins += 1;
            onComplete?.(wins);
        }
        if (head > 0 && head - tail < 0.0005) {
            head = tail = grown = 0;
            full = false;
            onReset?.();
        }
        const whole = Math.min(1, Math.max(0, (head - tail - 0.6) / 0.4));
        const named = Math.max(pop, 0.8 * whole * whole * (3 - 2 * whole));
        const flare = full && head - tail > 0.9 ? Math.max(pop, Math.sin(t * 4) * 0.5 + 0.5) : 0;
        return { head, tail, full, pop, named, flare };
    };

    return {
        hold, release, step,
        get held() { return held; },
        get full() { return full; },
        get wins() { return wins; },
    };
}
