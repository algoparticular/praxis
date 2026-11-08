// The world round Sid in the puppet lab (/lab/sid), drawn in code with a pen of ink, from the marks of the sketches:
// the little ticks of grass, round stones (some with a face of two or three dots, little beings that look at him,
// blink and hop when he comes), stacks of pebbles, sprouts that curl up into a bead, ferns, a stipple on the ground
// and the marks of the wind in the sky. It is endless: it is made a stretch at a time from where it is (the same
// place is always the same), and only what is on the screen is drawn. Everything starts in ink and takes its colour
// (one of the seven of the chakras) as he walks by it, and all round him when he sits in lotus (a wave goes out of
// him); what has taken its colour keeps it. The palette, the clouds and the day are Ciclos's (CICLOS below): the ink of its
// line, its white Sid, its yellow sky, its hills that go from dry to green, and its white clouds (its own atlas,
// public/assets/ciclos/clouds.webp, with the boxes in ciclosScene.json). Day and night come and go as in the card: the
// yellow day with its red sun and its stippled corona, the teal night with its stars and its moon (moon.webp and its
// stipple), each crossing the sky; while he meditates the cycle runs faster and the ground turns from dry to green
// (`growth`, kept), as the hills of the card do.
import ciclos from '../composables/ciclosScene.json';

const STRETCH = 520;            // the width of the stretch of world made at a time (px of his world)
const LINE = 7;                 // the pen: thinner than his own outline, so he stays the one you look at

// A small random number generator that always gives the same numbers for the same seed
function random(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
// Ciclos's colours (read off the card): its ink, its white, its sky, its dry and green hills, and what things take as they
// are coloured: its teal night, its green, its coral sun, its yellow, the tan of its dry hills and the pink of its fans
export const CICLOS = {
    ink: '#32300B', white: '#FEFEFD', sky: '#FED889', night: '#039CA8', star: '#FCDC8C', sun: '#FB767B',
    groundDry: '#F2DC9A', groundDay: '#A9CB8E', groundNight: '#3F6E63',
    colours: [
        { light: '#1BAFAF', ink: '#0B7B7B' }, { light: '#64A57A', ink: '#3E7A55' }, { light: '#FF7878', ink: '#C84A4A' },
        { light: '#FFD36E', ink: '#B08A1E' }, { light: '#C8B070', ink: '#857033' }, { light: '#F2A48C', ink: '#B4664F' },
    ],
};
const PALETTE = CICLOS.colours.map((c) => ({ light: hex(c.light), ink: hex(c.ink) }));
const GREENS = [1, 0, 1, 3];    // the ground's plants: mostly its green and its teal (and its yellow)
const WARM = [2, 5, 3, 0];      // the beads of the sprouts
const mixRgb = (a, b, t) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',')})`;

export function createWorld({ depth, clouds = null, moon = null }) {
    const INK = hex(CICLOS.ink), CREAM = hex(CICLOS.white);
    let growth = 0;                         // the ground turning green while he meditates (0..1), kept
    let clock = 0.2;                        // the cycle: 0 sunrise, 0.25 noon, 0.5 sunset, 0.75 midnight
    const CYCLE = 90;                       // s for a whole day and night (a third of it while he meditates)
    const stretches = new Map();
    const colour = new Map();               // how much colour each thing has taken (0..1), kept when it goes off screen
    const life = new Map();                 // what moves on each thing (a bend, a hop, a blink)
    let ripple = null;                      // the wave of colour out of him while he sits
    let time = 0;

    // ---- making a stretch ----
    function make(index) {
        const r = random(index * 7919 + 104729), items = [];
        const pick = (list) => list[Math.floor(r() * list.length)];
        const at = () => ({ x: index * STRETCH + r() * STRETCH, d: -180 + r() * (depth + 180) });
        const jitter = (p, a = 0.8) => [p[0] + (r() - 0.5) * a, p[1] + (r() - 0.5) * a];
        const add = (item) => items.push({ id: `${index}:${items.length}`, ...item });

        const tick = (x, d, big = 1) => {
            const s = (0.8 + r() * 0.6) * big, kind = r();
            let strokes;
            if (kind < 0.45) strokes = [[[-2, 0], [-7, -16]], [[2, 0], [6, -18]]];                    // v
            else if (kind < 0.65) strokes = [[[-4, 0], [-9, -13]], [[0, 0], [1, -19]], [[4, 0], [10, -14]]];   // a tuft
            else if (kind < 0.8) strokes = [[[-8, -2], [0, -14]], [[0, -14], [8, -2]]];               // ^
            else if (kind < 0.9) strokes = [[[-9, 0], [9, -1]]];                                      // -
            else strokes = [[[-11, 0], [-4, -4], [3, 0], [10, -4]]];                                  // ~
            add({ kind: 'tick', x, d, color: pick(GREENS), strokes: strokes.map((st) => st.map((p) => jitter([p[0] * s, p[1] * s]))) });
        };

        for (let n = 0; n < 34; n++) { const p = at(); tick(p.x, p.d); }
        // stones, a few with a face; ticks of grass round their feet
        const stones = 2 + Math.floor(r() * 2);
        for (let n = 0; n < stones; n++) {
            const p = at(), w = 70 + r() * 110, h = w * (0.55 + r() * 0.3), outline = [];
            const wob = [r(), r(), r()].map((v) => v * Math.PI * 2);
            for (let k = 0; k < 28; k++) {
                const a = (k / 28) * Math.PI * 2;
                const rr = 1 + 0.05 * Math.sin(a * 2 + wob[0]) + 0.035 * Math.sin(a * 3 + wob[1]) + 0.02 * Math.sin(a * 5 + wob[2]);
                outline.push([Math.cos(a) * w / 2 * rr, Math.min(h * 0.4, Math.sin(a) * h / 2 * rr) - h * 0.42]);   // whole ovals, resting on a flat bit
            }
            const face = r() < 0.45 ? (r() < 0.6 ? [[-0.12, -0.62], [0.08, -0.6]] : [[-0.1, -0.66], [0.1, -0.66], [0, -0.52]]) : null;
            add({ kind: 'stone', x: p.x, d: p.d, w, h, outline, face, color: Math.floor(r() * PALETTE.length), blinkAt: r() * 5 });
            for (let k = 0; k < 5; k++) tick(p.x + (r() - 0.5) * w * 1.3, p.d + (r() - 0.5) * 30, 0.9);
        }
        // a stack of pebbles
        if (r() < 0.4) {
            const p = at(), stack = [];
            let y = 0;
            for (let k = 0, n = 2 + Math.floor(r() * 3); k < n; k++) {
                const w = 44 - k * 6 + r() * 10, h = w * (0.55 + r() * 0.15);
                stack.push({ dx: (r() - 0.5) * 8, y, w, h });
                y -= h * 0.85;
            }
            add({ kind: 'cairn', x: p.x, d: p.d, stack, color: Math.floor(r() * PALETTE.length) });
        }
        // sprouts that curl up into a bead
        for (let n = 0; n < 3; n++) {
            const p = at();
            add({ kind: 'sprout', x: p.x, d: p.d, h: 50 + r() * 60, curl: r() < 0.5 ? -1 : 1, bead: 8 + r() * 6, color: pick(WARM), flex: 0.6 + r() * 0.6 });
        }
        // ferns: a spine and its leaflets, smaller towards the tip
        for (let n = 0, m = 1 + Math.floor(r() * 2); n < m; n++) {
            const p = at();
            add({ kind: 'fern', x: p.x, d: p.d, long: 140 + r() * 170, arch: (r() - 0.5) * 0.5, leaves: 7 + Math.floor(r() * 5), color: pick(GREENS), flex: 0.8 + r() * 0.5 });
        }
        // a stipple on the ground, thinning out from its middle
        for (let n = 0, m = 1 + Math.floor(r() * 2); n < m; n++) {
            const p = at(), R = 70 + r() * 110, dots = [];
            for (let k = 0; k < 70; k++) {
                const a = r() * Math.PI * 2, t = Math.pow(r(), 0.7);
                dots.push([Math.cos(a) * R * t, Math.sin(a) * R * t * 0.3, 1.6 + r() * 2.4 * (1 - t)]);
            }
            add({ kind: 'stipple', x: p.x, d: p.d, dots, color: Math.floor(r() * PALETTE.length) });
        }
        return items;
    }
    const stretch = (i) => { if (!stretches.has(i)) stretches.set(i, make(i)); return stretches.get(i); };

    // The clouds of Ciclos, drifting slowly far away (they move little with the camera), where the card has them
    const sky = ciclos.clouds.map(([x, y, w, h, ax, ay], i) => ({ x: x / ciclos.size, y: y / 1300, w, h, ax, ay, speed: 5 + (i % 5) * 2.5 }));

    // ---- what moves ----
    const lifeOf = (item) => {
        if (!life.has(item.id)) life.set(item.id, { bend: 0, hop: 0, near: false, look: 0, blink: 0, next: 2 + Math.random() * 4 });
        return life.get(item.id);
    };
    const wind = (x) => 0.07 * Math.sin(time * 0.9 + x * 0.004) + 0.035 * Math.sin(time * 2.3 + x * 0.013);

    function update(dt, sid) {
        time += dt;
        clock = (clock + dt / CYCLE * (sid.sitting ? 3 : 1)) % 1;
        if (sid.sitting) {
            if (!ripple) ripple = { x: sid.x, d: sid.d, r: 0 };
            ripple.r = Math.min(1400, ripple.r + dt * 260);
            growth = Math.min(1, growth + dt * 0.06);
        } else ripple = null;
        for (const [i, items] of stretches) {
            if (Math.abs(i * STRETCH - sid.x) > 3000) continue;
            for (const item of items) {
                const dx = item.x - sid.x, dd = (item.d - sid.d) * 1.6, dist = Math.hypot(dx, dd);
                // colour: as he walks by, and inside the wave while he sits
                let c = colour.get(item.id) ?? 0;
                if (dist < 170) c = Math.min(1, c + dt * 0.9 * (1 - dist / 170) * 2);
                if (ripple && Math.hypot(item.x - ripple.x, (item.d - ripple.d) * 1.6) < ripple.r) c = Math.min(1, c + dt * 1.4);
                if (c > 0) colour.set(item.id, c);
                if (item.kind === 'tick' || item.kind === 'fern' || item.kind === 'sprout') {
                    // pushed aside as he walks through
                    const l = lifeOf(item), push = Math.abs(dd) < 50 && Math.abs(dx) < 70 ? Math.sign(dx || 1) * 0.8 * (1 - Math.abs(dx) / 70) : 0;
                    l.bend += (push - l.bend) * Math.min(1, dt * (push ? 10 : 3));
                }
                if (item.kind === 'stone' && item.face) {
                    const l = lifeOf(item);
                    l.look += (Math.max(-1, Math.min(1, -dx / 250)) - l.look) * Math.min(1, dt * 4);
                    // a hop when he comes near (once each time)
                    if (dist < 230 && !l.near) { l.near = true; l.hop = 1; }
                    if (dist > 320) l.near = false;
                    l.hop = Math.max(0, l.hop - dt * 1.8);
                    l.next -= dt;
                    if (l.next <= 0) { l.blink = 0.14; l.next = 2 + Math.random() * 4; }
                    l.blink = Math.max(0, l.blink - dt);
                }
            }
        }
    }

    // ---- drawing ----
    // The pen: a line through points, wide in its middle and finer at its ends, with round ends
    function pen(c, pts, width, color) {
        c.strokeStyle = color; c.lineCap = 'round'; c.lineJoin = 'round';
        const n = pts.length - 1;
        for (let i = 0; i < n; i++) {
            const t = (i + 0.5) / n;
            c.lineWidth = width * (0.55 + 0.45 * Math.sin(Math.PI * t));
            c.beginPath(); c.moveTo(pts[i][0], pts[i][1]); c.lineTo(pts[i + 1][0], pts[i + 1][1]); c.stroke();
        }
    }
    // A short mark: wide where it starts, to a point where it ends (as a pen lifting off the paper)
    function mark(c, a, b, width, color) {
        const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l * width / 2, ny = dx / l * width / 2;
        c.fillStyle = color;
        c.beginPath();
        c.moveTo(a[0] + nx, a[1] + ny);
        c.quadraticCurveTo(a[0] + dx * 0.6 + nx * 0.6, a[1] + dy * 0.6 + ny * 0.6, b[0], b[1]);
        c.quadraticCurveTo(a[0] + dx * 0.6 - nx * 0.6, a[1] + dy * 0.6 - ny * 0.6, a[0] - nx, a[1] - ny);
        c.arc(a[0], a[1], width / 2, Math.atan2(-ny, -nx), Math.atan2(ny, nx));
        c.fill();
    }
    // A watercolour wash under what has taken its colour: soft, a little off its drawing, as a brush does
    function wash(c, x, y, rx, ry, rgb, amount) {
        if (amount <= 0.01) return;
        const g = c.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry));
        g.addColorStop(0, `rgba(${rgb.join(',')},${0.42 * amount})`);
        g.addColorStop(0.7, `rgba(${rgb.join(',')},${0.22 * amount})`);
        g.addColorStop(1, `rgba(${rgb.join(',')},0)`);
        c.save(); c.scale(1, ry / rx); c.fillStyle = g;
        c.beginPath(); c.arc(x, y * rx / ry, rx, 0, Math.PI * 2); c.fill(); c.restore();
    }

    function drawItem(c, item) {
        const col = colour.get(item.id) ?? 0, P = PALETTE[item.color], line = mixRgb(INK, P.ink, col * 0.8);
        const l = life.get(item.id);
        switch (item.kind) {
        case 'tick': {
            const lean = wind(item.x) * 0.6 + (l?.bend ?? 0) * 0.9;
            c.save(); c.rotate(lean);
            for (const st of item.strokes) {
                if (st.length === 2) mark(c, st[0], st[1], LINE * 0.8, line);
                else pen(c, st, LINE * 0.7, line);
            }
            c.restore();
            break;
        }
        case 'stone': {
            const hop = l ? Math.sin(l.hop * Math.PI) * 26 * l.hop : 0, squash = l ? 1 + Math.sin(l.hop * Math.PI * 2) * 0.06 * l.hop : 1;
            wash(c, item.w * 0.06, -item.h * 0.35, item.w * 0.62, item.h * 0.55, P.light, col);
            c.save(); c.translate(0, -hop); c.scale(1 / squash, squash);
            c.beginPath();
            item.outline.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
            c.closePath();
            c.fillStyle = mixRgb(CREAM, P.light, col * 0.75); c.fill();
            pen(c, [...item.outline, item.outline[0], item.outline[1]], LINE, line);
            if (item.face) {
                const look = (l?.look ?? 0) * item.w * 0.06, closed = l?.blink > 0;
                c.fillStyle = mixRgb(INK, P.ink, col * 0.5);
                for (const [fx, fy] of item.face) {
                    c.beginPath();
                    c.ellipse(fx * item.w + look, fy * item.h, 4.6, closed ? 1.2 : 4.6, 0, 0, Math.PI * 2);
                    c.fill();
                }
            }
            c.restore();
            break;
        }
        case 'cairn': {
            wash(c, 0, -30, 48, 40, P.light, col);
            for (const p of item.stack) {
                c.beginPath(); c.ellipse(p.dx, p.y - p.h / 2, p.w / 2, p.h / 2, 0, 0, Math.PI * 2);
                c.fillStyle = mixRgb(CREAM, P.light, col * 0.75); c.fill();
                const pts = [];
                for (let k = 0; k <= 18; k++) { const a = (k / 18) * Math.PI * 2; pts.push([p.dx + Math.cos(a) * p.w / 2, p.y - p.h / 2 + Math.sin(a) * p.h / 2]); }
                pen(c, pts, LINE * 0.85, line);
            }
            break;
        }
        case 'sprout': {
            const lean = wind(item.x) * item.flex + (l?.bend ?? 0) * 0.7, pts = [];
            for (let k = 0; k <= 10; k++) {
                const t = k / 10, a = lean * t * t;
                const x = item.curl * Math.sin(t * Math.PI * 0.9) * item.h * 0.22, y = -item.h * t;
                pts.push([x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)]);
            }
            const tip = pts[pts.length - 1], bead = [tip[0] + item.curl * item.bead * 0.8, tip[1] - item.bead * 0.6];
            wash(c, bead[0], bead[1], item.bead * 2.4, item.bead * 2.4, PALETTE[item.color].light, col);
            pen(c, pts, LINE * 0.9, line);
            c.beginPath(); c.arc(bead[0], bead[1], item.bead, 0, Math.PI * 2);
            c.fillStyle = mixRgb(CREAM, P.light, col); c.fill();
            c.lineWidth = LINE * 0.8; c.strokeStyle = line; c.stroke();
            break;
        }
        case 'fern': {
            const lean = wind(item.x) * item.flex + (l?.bend ?? 0) * 0.6, spine = [];
            for (let k = 0; k <= 12; k++) {
                const t = k / 12, a = (item.arch + lean) * t;
                spine.push([Math.sin(a) * item.long * t * 0.9, -Math.cos(a) * item.long * t]);
            }
            wash(c, spine[6][0], spine[6][1], item.long * 0.3, item.long * 0.45, P.light, col);
            pen(c, spine, LINE, line);
            for (let k = 1; k <= item.leaves; k++) {
                const t = k / (item.leaves + 1), i = Math.round(t * 12), p = spine[i], q = spine[Math.min(12, i + 1)];
                const dir = Math.atan2(q[1] - p[1], q[0] - p[0]), long = item.long * 0.32 * (1 - t * 0.75);
                for (const side of [-1, 1]) {
                    const a = dir + side * 0.95;
                    mark(c, p, [p[0] + Math.cos(a) * long, p[1] + Math.sin(a) * long], LINE * 0.75, line);
                }
            }
            break;
        }
        case 'stipple': {
            c.fillStyle = mixRgb(INK, P.ink, col * 0.85);
            for (const [x, y, rr] of item.dots) { c.beginPath(); c.arc(x, y, rr, 0, Math.PI * 2); c.fill(); }
            break;
        }
        }
    }

    // What is on the screen, back to front, filtered (to draw what is behind him and what is in front of him apart);
    // view: { x0, cam, groundAt(d), scaleAt(d), width }. What stands just in front of him (`him`: { x, d }) is drawn
    // faint, so it never hides him
    function draw(c, view, keep, him = null) {
        const far = view.scaleAt(depth), half = view.width / 2 / far + 400;
        const first = Math.floor((view.cam - half) / STRETCH), last = Math.floor((view.cam + half) / STRETCH);
        const shown = [];
        for (let i = first; i <= last; i++) for (const item of stretch(i)) if (keep(item.d)) shown.push(item);
        shown.sort((a, b) => b.d - a.d);
        for (const item of shown) {
            const s = view.scaleAt(item.d), x = view.x0 + (item.x - view.cam) * s;
            if (x < -300 * s || x > view.width + 300 * s) continue;
            c.save(); c.translate(x, view.groundAt(item.d)); c.scale(s, s);
            if (him && item.d < him.d && him.d - item.d < 220 && Math.abs(item.x - him.x) < 150) c.globalAlpha = 0.22;
            drawItem(c, item);
            c.restore();
        }
    }

    // How much light there is: 1 all day, 0 all night, a soft dusk and dawn between
    const light = () => { const v = 0.5 + 1.8 * Math.sin(clock * Math.PI * 2); return Math.max(0, Math.min(1, v)); };
    // The stars of the night: the card's, spread over the whole sky
    const stars = ciclos.night.stars.map(([x, y, r], i) => ({ x: ((x * 7.3 + i * 131) % ciclos.size) / ciclos.size, y: (y % 1300) / 1300, r }));

    // The sky: Ciclos's yellow by day and its teal by night, its stars, its sun and moon crossing it, and its clouds
    function drawSky(c, view, top, bottom) {
        const L = light(), H = bottom - top;
        c.fillStyle = mixRgb(hex(CICLOS.night), hex(CICLOS.sky), L); c.fillRect(0, top, view.width, H + 2);
        // stars, coming out as it gets dark, a little twinkling
        if (L < 0.95) {
            c.fillStyle = CICLOS.star;
            stars.forEach((s, i) => {
                c.globalAlpha = (1 - L) * (0.75 + 0.25 * Math.sin(time * 1.7 + i));
                const x = ((s.x * view.width * 1.3 - view.cam * 0.04) % view.width + view.width) % view.width;
                c.beginPath(); c.arc(x, top + s.y * H * 0.95, s.r * 0.9, 0, Math.PI * 2); c.fill();
            });
            c.globalAlpha = 1;
        }
        // the sun by day and the moon by night, each along an arc from one side of the sky to the other
        const scale = H / 1300 * 0.55, along = (t) => ({ x: view.width * (0.08 + 0.84 * t), y: top + H * (0.92 - 0.72 * Math.sin(Math.PI * t)) });
        const sunT = clock < 0.5 ? clock / 0.5 : null, moonT = clock >= 0.5 ? (clock - 0.5) / 0.5 : null;
        if (sunT != null) {
            const p = along(sunT), sun = ciclos.sun;
            c.fillStyle = CICLOS.sun;
            for (const [x, y, r] of sun.dots) { c.beginPath(); c.arc(p.x + (x - sun.x) * scale, p.y + (y - sun.y) * scale, r * scale * 1.1, 0, Math.PI * 2); c.fill(); }
            c.beginPath(); c.arc(p.x, p.y, sun.r * scale, 0, Math.PI * 2); c.fill();
        }
        if (moonT != null && moon?.complete && moon.naturalWidth) {
            const p = along(moonT), m = ciclos.moon, [bx, by, bw, bh] = ciclos.boxes.moon;
            c.drawImage(moon, p.x + (bx - m.x) * scale, p.y + (by - m.y) * scale, bw * scale, bh * scale);
            c.fillStyle = CICLOS.ink; c.globalAlpha = 0.55;
            for (const [x, y, r] of m.dots) { c.beginPath(); c.arc(p.x + (x - m.x) * scale, p.y + (y - m.y) * scale, r * scale, 0, Math.PI * 2); c.fill(); }
            c.globalAlpha = 1;
        }
        // the clouds, a little dimmer at night
        if (!clouds?.complete || !clouds.naturalWidth) return;
        const cs = H / 1300, span = Math.max(view.width * 1.6, 2160 * cs * 1.25);
        c.globalAlpha = 0.55 + 0.45 * L;
        for (const m of sky) {
            const x = ((((m.x * span + time * m.speed - view.cam * 0.15) % span) + span) % span) - m.w * cs;
            c.drawImage(clouds, m.ax, m.ay, m.w, m.h, x, top + m.y * H * 0.92, m.w * cs, m.h * cs);
        }
        c.globalAlpha = 1;
    }
    // The ground: from dry to green as he meditates, and darker at night
    const ground = () => {
        const g = hex(CICLOS.groundDry).map((v, i) => v + (hex(CICLOS.groundDay)[i] - v) * growth);
        const n = hex(CICLOS.groundNight), k = (1 - light()) * 0.55;
        return `rgb(${g.map((v, i) => Math.round(v + (n[i] - v) * k)).join(',')})`;
    };

    // (setClock: to look at a given hour from the console, 0 sunrise .. 0.75 midnight)
    return { update, draw, drawSky, ground, setClock: (v) => { clock = ((v % 1) + 1) % 1; } };
}
