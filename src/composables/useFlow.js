// Fluir: the engine shared by the cards of the verb (docs/verbos-y-dinamicas.md). Something runs along a route at its
// own pace; the person does not make it nor push it: they go with it. Only the logic lives here (where the head of the
// current is, whether it is accompanied, its knots); each scene draws it its own way.
//  - The route: samples (x, y) in the scene's own units (Khanti's 2160 square), every few of them, from `start` to `end`.
//  - Going with it is sliding: a finger (or the mouse, moving) on the route near the head, or a little ahead of it,
//    draws the current on to where it is, at the current's own pace, which is never even (two slow waves, `slow`).
//    A finger kept still lets it slip just past it (`lead`) and stop there: to go on, the finger goes on. Alone it
//    does not move. A finger far ahead of it (`ahead`) has lost it: it is rushing, and the current waits where it is.
//    Nothing is lost: it never goes back.
//  - The stops (`stops`: { enter, exit }, sorted along the route) are knots. Arriving accompanied, the knot lets go by
//    itself (`release(stop)`) a little before the head gets there (`press` samples): the scene shows what is let go.
//    The head waits at the stop's entrance until the scene says it is ready (`ready(stop)`), then goes through it on its
//    own in `fill` seconds (`onEnter`, `onPass`). Once past the last stop and at the end of the route, `onEnd`.
//  - While it moves accompanied it sounds: `onNote(pace, level)` every half a second or so, quicker when it is quicker.
// Keyboard: Enter held on the head (`step(..., { key: true })`) goes with it as a finger would.
export const createFlow = ({
    x, y, n,
    start = 0,
    end = n - 1,
    stops = [],
    pace = 52,                  // samples a second at its fastest
    slow = [0.35, 1],           // its pace goes between these (of `pace`)
    ahead = 56,                 // how far ahead of the head (samples) a finger still has it
    behind = 14,                // and behind it
    lead = 7,                   // how far past a still finger it slips before it stops
    reach = 170,                // how near the route (scene units) the mouse has to be
    touchReach = 240,           // and a finger, which covers what it follows and cannot be as exact
    press = 22,                 // how far before a knot (samples) it lets go when the current comes accompanied
    fill = 0.8,                 // seconds it takes to go through a stop
    isOpen = (stop) => stop.open,
    release = (stop) => { stop.open = true; },
    ready = () => true,
    onEnter = () => {},
    onPass = () => {},
    onEnd = () => {},
    onNote = () => {},
    onFirst = () => {},
} = {}) => {
    const knots = stops.map((s) => ({ ...s, open: false, passed: false }));
    const f = {
        head: start,
        acc: 0,                 // accompanied, smoothed 0..1
        moving: 0,              // how fast it is going, smoothed, of its full pace
        rush: 0,                // the finger is far ahead of it, smoothed 0..1
        idle: 99,               // seconds since it was last accompanied (99: never yet)
        waiting: null,          // the stop it is waiting at, if any
        done: false,
        touched: false,
        stops: knots,
    };
    let noteAt = 0;
    const paceAt = (t) => slow[0] + (slow[1] - slow[0]) * (0.5 + 0.5 * (0.6 * Math.sin(t * 0.83) + 0.4 * Math.sin(t * 2.1 + 1.3)));
    const at = (i) => Math.min(end, Math.max(start, Math.floor(i)));
    f.point = (i = f.head) => { const k = at(i); return { x: x(k), y: y(k) }; };
    f.paceAt = paceAt;
    // Where along the route, near the head, a point (u, v) is: the nearest sample and how far it is from it (squared)
    const project = (u, v) => {
        const lo = at(f.head - behind), hi = at(f.head + ahead * 2.5);
        let best = -1, d2 = Infinity;
        for (let i = lo; i <= hi; i++) {
            const dx = u - x(i), dy = v - y(i), d = dx * dx + dy * dy;
            if (d < d2) { d2 = d; best = i; }
        }
        return { i: best, d2 };
    };
    // Whether a finger put down at (u, v) is on the current (to keep the page from scrolling under it)
    f.nearHead = (u, v, touch = true) => {
        const r = touch ? touchReach : reach;
        const p = project(u, v);
        return p.d2 < r * r && p.i <= f.head + ahead;
    };
    const next = () => knots.find((s) => !s.passed);
    f.next = next;
    // pointer: { u, v, at, down, touch } in the scene's units; key: Enter held on the head
    f.step = (dt, t, pointer, { key = false } = {}) => {
        if (f.done) return;
        const from = f.head;
        let contact = false, rushing = false, target = f.head;
        if (key) { contact = true; target = f.head + ahead * 0.5; }
        else if (pointer && (pointer.down || t - pointer.at < 0.6)) {
            const r = pointer.touch ? touchReach : reach;
            const p = project(pointer.u, pointer.v);
            if (p.d2 < r * r) {
                if (p.i <= f.head + ahead) { contact = true; target = p.i + lead; } else rushing = true;
            }
        }
        f.acc += ((contact ? 1 : 0) - f.acc) * Math.min(1, dt * (contact ? 5 : 1.5));
        f.rush += ((rushing ? 1 : 0) - f.rush) * Math.min(1, dt * 4);
        f.idle = contact ? 0 : f.idle + dt;
        if (contact && !f.touched) { f.touched = true; onFirst(); }
        const stop = next();
        f.waiting = null;
        if (stop && f.head >= stop.enter) {
            // At a knot: once it is open and ready, through it on its own, whatever the finger does
            if (contact && !isOpen(stop)) release(stop);
            if (stop.entered || (isOpen(stop) && ready(stop))) {
                if (!stop.entered) { stop.entered = true; onEnter(stop); }
                f.head = Math.min(stop.exit, f.head + (stop.exit - stop.enter) / fill * dt);
                if (f.head >= stop.exit) { stop.passed = true; onPass(stop); }
            } else f.waiting = stop;
        } else {
            const limit = stop ? stop.enter : end;
            const p = paceAt(t);
            if (contact && target > f.head) f.head = Math.min(limit, target, f.head + pace * p * dt);
            // the knot ahead lets go as the current comes to it accompanied
            if (stop && contact && !isOpen(stop) && stop.enter - f.head < press) release(stop);
            if (f.head > from + 1e-3 && contact && t - noteAt > 0.5 - 0.15 * p) { noteAt = t; onNote(p, f.acc); }
            if (!stop && f.head >= end) { f.done = true; onEnd(); }
        }
        f.moving += (Math.min(1, dt > 0 ? (f.head - from) / dt / pace : 0) - f.moving) * Math.min(1, dt * 6);
    };
    // Born again at the start, every knot tied again
    f.reset = () => {
        f.head = start; f.acc = 0; f.moving = 0; f.rush = 0; f.waiting = null; f.done = false;
        knots.forEach((s) => { s.open = false; s.passed = false; s.entered = false; });
    };
    return f;
};
