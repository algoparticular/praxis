<script setup>
    // Perdón: "I forgive myself and others". In a quiet sage sky full of little stars, a great planet of teal and cream
    // marble turns slowly inside its outline, with a ring of dark red dust round it; above, a balloon rises with a Sama in
    // it, carrying another Sama that hangs from its string, and a third little Sama floats by in its cup; below, Particular
    // sits in a leaf boat with a kitten, drifting.
    // Its verb is Soltar ("I inhale love. I exhale forgiveness."): six knots of the ring's dark red dust, denser and
    // churning, are grudges and blame held on to. A touch on one lets it go (`release`): it bursts into light motes and
    // the stretch of the ring that was its own clears from it outwards, from dark red to a warm cream. Holding Particular
    // is breathing in love (`inhale`: a light grows behind him and motes of light are drawn in to him); let go once it is
    // gathered he breathes out forgiveness (`exhale`): a wave of light goes out from him and lets go of every knot it
    // reaches. With the ring clear the planet shines, the balloon leaps, F minor gathers (`converge`) and the rulito the
    // card draws over Particular is born (`rulito`); when it goes the ring darkens slowly and the knots gather again.
    // Left alone 7 s, a knot throbs and the ghost hand touches it (the hint); left alone 15 s, a knot let go gathers again. The scene is alive: the marble of the planet turns and
    // shimmers, a soft light breathes behind it, its ring of dust flows round it in slow waves (every dot a particle, the
    // part behind the planet drawn under it and the part in front over it); the stars twinkle; the balloon bobs and leans,
    // the Sama hanging from it swings a little later; the cup rocks; the leaf rocks and bobs, Particular breathes, blinks
    // and now and then looks up at the balloon, the kitten breathes and its tail sways; the little ringed planet and the
    // dark strokes of the sky float. A touch strums the card's chord (`star`), the dust and the stars flare and whatever is
    // touched answers (the balloon gives a little leap, Particular blinks and the leaf dips, the cup spins, the planet's
    // marble hurries for a moment).
    // Nothing of the background is a picture: the sky is the card's colour (worked out by the converter), the planet's
    // disc and its outline are drawn in code, the stars and the ring are particles. On a wide screen the stars go on past
    // the frame (shifted copies of the card's stars, never a mirrored twin side by side); on a phone upright the frame is as
    // wide as the ring and the leaf allow, and the spare height is shared out between the sky above and below the planet.
    // It is drawn in WebGL (useLayerStage), from perdonScene.json and public/assets/perdon (made by
    // scripts/convert-perdon.mjs). The card's rulito over Particular is not a picture: it is drawn by the game (Rulito.vue).
    import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { createParallax } from '../../composables/useParallax.js';
    import { createLayerStage } from '../../composables/useLayerStage.js';
    import { startStardust } from '../../composables/useStardust.js';
    import { createSparks } from '../../composables/useSparks.js';
    import { play } from '../../composables/useSound.js';
    import { createGhostHand, gesture, HINT_AFTER } from '../../composables/useGhostHand.js';
    import { sceneMilestone } from '../../analytics.js';
    import Rulito from '../Rulito.vue';
    import art from '../../composables/perdonScene.json';

    const props = defineProps({
        card: { type: Object, default: () => ({}) },
        active: Boolean
    });

    const root = ref(null);
    const canvas = ref(null);
    const partHit = ref(null);
    const rulito = ref(null);
    let stageEl = null;
    let stage = null;
    let parallax = null;
    let dust = null;
    let entered = false;
    let gone = false;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ---- Layout: the illustration is a 2160x2700 portrait. Its drawing goes from the top of the balloon to the bottom
    // of the leaf (TOP..BOTTOM), and it is kept under the card's name. On a phone upright it is as wide as the ring and
    // the leaf allow (SPAN, centred on FOCUS) and the height left over is shared out: what is above the planet goes up,
    // what is below it goes down (`spread`). On a wide screen the drawing fills the height and the stars go on past it
    const [SW] = art.size;
    const B = art.boxes;
    const TOP = 170, BOTTOM = 2350;
    const SPAN = 1900, FOCUS = 1110;
    let F = { x: 0, y: 0, size: 1 };
    let spread = 0;
    const k = () => F.size / SW;
    const sx = (x) => F.x + x * k();
    const sy = (y) => F.y + y * k();
    const rectOf = ([left, top, w, h], dy = 0) => ({ left: sx(left), top: sy(top) + dy, w: w * k(), h: h * k() });
    const layout = (w, h) => {
        const phone = w < h;
        const top = titleBottom(h) + 10, bottom = h - 16;
        const room = Math.max(1, bottom - top);
        let size = room / (BOTTOM - TOP) * SW;
        if (phone) size = Math.min(size, w * SW / SPAN);
        else size = Math.min(size, w * 0.95);
        const kk = size / SW;
        const x = phone ? w / 2 - FOCUS * kk : w / 2 - 1060 * kk;
        const spare = Math.max(0, room - (BOTTOM - TOP) * kk);
        spread = phone ? Math.min(spare * 0.3, 0.35 * SW * kk) : 0;
        F = { x, y: top + spare / 2 - TOP * kk, size };
    };

    // Where the card's name ends (the stage's h1, over the scene), so the balloon keeps under it
    const titleBottom = (h) => {
        const title = stageEl?.querySelector('h1');
        if (!title || !root.value) return 0.15 * h;
        return title.getBoundingClientRect().bottom - root.value.getBoundingClientRect().top;
    };

    const SLIDE = 50;
    const SLIDE_Y = 30;
    const zFor = (amp) => amp / (SLIDE + amp);
    const DEPTH = { far: 4, near: 8, doodles: 11, back: 15, planet: 17, front: 19, cup: 20, balloon: 23, leaf: 30 };

    const P = art.planet;
    const E = art.ring.ellipse;
    const DUST = P.line.color;
    const CREAM = 0xf7f8f1;
    const hexCss = (c) => `#${c.toString(16).padStart(6, '0')}`;
    const centreOf = ([x, y, w, h]) => [x + w / 2, y + h / 2];

    // ---- The doodles of the sky (the little ringed planet and the dark strokes), from one atlas; those above the planet
    // go up with the balloon on a phone, those below it go down with the leaf
    const [AW, AH] = art.atlas;
    const doodles = art.doodles.map(({ name, at: [x, y, w, h, ax, ay] }, i) => ({
        name, box: [x, y, w, h], crop: [ax / AW, ay / AH, w / AW, h / AH], upper: y < P.y, phase: i * 1.7 + 0.4,
    }));

    // ---- The ring of dust: every dot on the ellipse it lies on, as an angle and how far out it is, so it can flow round
    const tilt = E.tilt * Math.PI / 180;
    const ct = Math.cos(tilt), st = Math.sin(tilt);
    const onRing = (flat) => Array.from({ length: flat.length / 3 }, (_, i) => {
        const [x, y, r] = [flat[i * 3], flat[i * 3 + 1], flat[i * 3 + 2] / 2];
        const u = (x - E.x) * ct + (y - E.y) * st, v = -(x - E.x) * st + (y - E.y) * ct;
        return { a: Math.atan2(v / E.b, u / E.a), out: Math.hypot(u / E.a, v / E.b), r, phase: Math.random() * 0.8, x, y, lit: 0 };
    });
    // Every dot of the ring orbits the planet, as a real ring: the inner ones faster than the outer (Kepler), so the
    // dust shears and is never the same twice. The half nearer us (sin a > 0) is drawn over the planet, the far half
    // under it, so a dot goes behind the planet and comes out the other side. The card drew both halves apart (the
    // dots in front of the planet in a layer of their own): here they are one ring, split by where each dot is now.
    const ring = { all: [...onRing(art.ring.back), ...onRing(art.ring.front)] };
    const ORBIT = (2 * Math.PI) / 52;       // radians a second at the middle of the ring (a turn in 52 s)
    const spin = (out) => ORBIT * out ** -1.5;
    let orbitT = 0;                         // the ring's own clock (still with reduced motion)
    const dotAngle = (d) => d.a + spin(d.out) * orbitT + FLOW * rampNow * Math.sin(flowT * 0.45 - 2 * d.a + d.phase);
    const near = (a) => Math.sin(a) > 0;
    // The far half sits deeper than the near one (it slides less with the camera): a dot's depth goes from one to the
    // other as it goes round, so it never jumps where it passes from under the planet to over it
    const ringDrift = { back: [0, 0], front: [0, 0] };
    const driftAt = (a) => {
        const f = (Math.sin(a) + 1) / 2;
        return [ringDrift.back[0] + (ringDrift.front[0] - ringDrift.back[0]) * f, ringDrift.back[1] + (ringDrift.front[1] - ringDrift.back[1]) * f];
    };
    // A point of the stage is drawn a little smaller than its size, with a soft edge: so the dots look as big as drawn
    const DOT = 1.28;
    const FLOW = 0.03;                      // how far the waves carry a dot along the ring (radians)
    let flowT = 0;
    let rampNow = 0;
    // front: the group drawn over the planet (the near half) or under it (the far half); each shows only its half
    const ringGroup = (dots, front) => ({
        count: dots.length,
        update(t, data) {
            const kk = k();
            for (let i = 0; i < dots.length; i++) {
                const d = dots[i];
                const a = dotAngle(d);
                const u = Math.cos(a) * d.out * E.a, v = Math.sin(a) * d.out * E.b;
                const [ox, oy] = driftAt(a);
                data.positions[i * 3] = F.x + (E.x + u * ct - v * st) * kk + ox;
                data.positions[i * 3 + 1] = F.y + (E.y + u * st + v * ct) * kk + oy;
                data.sizes[i] = Math.max(1.2, 2 * d.r * kk * DOT) * (1 + 0.25 * d.lit);
                data.alphas[i] = near(a) === front ? 1 : 0;
                for (let c = 0; c < 3; c++) data.tints[i * 3 + c] = DUST_RGB[c] + (LIGHT_RGB[c] - DUST_RGB[c]) * d.lit;
            }
        },
    });

    // ---- The game: six knots in the ring, grudges held on to. Each is a clump of darker dots churning round a point of
    // the ring (an angle on its ellipse); every dot of the ring belongs to its nearest knot and clears when it is let go
    const rgb = (c) => [((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255];
    const LIGHT = 0xf3d9ac;                 // the ring cleared: a warm cream
    const LOVE = 0xffb4a6;                  // what he breathes in
    const DUST_RGB = rgb(DUST), LIGHT_RGB = rgb(LIGHT), KNOT_RGB = rgb(DUST).map((v) => v * 0.5);
    const KNOT_AT = [-0.95, -0.4, 0.1, 0.65, 1.3, 1.95];     // angles on the ring's ellipse (0: its right end, π/2: its front)
    const KNOT_DOTS = 64;
    const CLEAR = 1.3;                      // radians a second the light runs along the ring from a knot let go
    const angleGap = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
    const knots = KNOT_AT.map((a, i) => ({
        i, a, a0: a, state: 'here', at: 0, form: 1, hint: 0,
        dots: Array.from({ length: KNOT_DOTS }, () => {
            const g = (Math.random() + Math.random() + Math.random()) / 3 - 0.5;
            return { oa: g * 0.22, oo: g * 0.16 + (Math.random() - 0.5) * 0.04, w: 0.6 + Math.random() * 0.9, ph: Math.random() * 6.28, r: 3 + Math.random() * 3.8 };
        }),
    }));
    // A point of the ring, on the stage at rest (the front half's plane)
    const ringPoint = (a, out = 1) => {
        const u = Math.cos(a) * out * E.a, v = Math.sin(a) * out * E.b;
        return { x: F.x + (E.x + u * ct - v * st) * k(), y: F.y + (E.y + u * st + v * ct) * k() };
    };
    // The knots ride the ring at its middle's pace; like the dust, the near half is drawn over the planet, the far half under
    const knotGroup = (front) => ({
        count: knots.length * KNOT_DOTS,
        update(t, data) {
            const kk = k();
            knots.forEach((kn, j) => {
                const going = kn.state === 'going' || kn.state === 'gone' ? Math.min(1, (lastT - kn.at) / 0.9) : 0;
                const spread = 1 + 3 * going + 2.5 * (1 - kn.form);
                const show = (1 - going) * kn.form;
                // A knot tightens and gives, slowly, as something held on to; the hint makes it throb
                const throb = (1 + 0.14 * Math.sin(t * 1.3 + j * 1.9) * (reduced ? 0 : 1)) * (1 + 0.45 * kn.hint * (0.5 + 0.5 * Math.sin(t * 10)));
                kn.dots.forEach((d, n) => {
                    const i = j * KNOT_DOTS + n;
                    const turn = t * d.w * (reduced ? 0 : 1) + d.ph;
                    const a = kn.a + d.oa * Math.cos(turn) * spread * throb;
                    const p = ringPoint(a, 1 + d.oo * Math.sin(turn) * spread * throb);
                    const [ox, oy] = driftAt(a);
                    data.positions[i * 3] = p.x + ox;
                    data.positions[i * 3 + 1] = p.y - 40 * kk * going + oy;
                    data.sizes[i] = Math.max(1.4, 2 * d.r * kk * DOT) * (1 + 0.3 * kn.hint);
                    data.alphas[i] = near(a) === front ? show : 0;
                    for (let c = 0; c < 3; c++) data.tints[i * 3 + c] = KNOT_RGB[c] + (LIGHT_RGB[c] - KNOT_RGB[c]) * going;
                });
            });
        },
    });
    // The air he breathes in: motes drawn in to him from all round while he gathers a breath
    const AIR = 60;
    const air = Array.from({ length: AIR }, () => ({ a: Math.random() * 6.28, life: Math.random(), speed: 0.7 + Math.random() * 0.6, r: 2 + Math.random() * 2.5 }));
    let charge = 0;
    let airT = 0;
    const airGroup = {
        count: AIR,
        update(t, data) {
            const at = particularAt();
            const reach = Math.max(120, 520 * k());
            const dt = Math.min(0.1, Math.max(0, t - airT));
            airT = t;
            air.forEach((m, i) => {
                m.life += dt * m.speed * 0.8;
                if (m.life >= 1) { m.life = 0; m.a = Math.random() * 6.28; }
                const r = reach * (1 - m.life) ** 1.4;
                data.positions[i * 3] = at.x + Math.cos(m.a) * r;
                data.positions[i * 3 + 1] = at.y + Math.sin(m.a) * r * 0.8;
                data.sizes[i] = m.r * (0.6 + 0.8 * m.life) * Math.max(1, k() * 2.5);
                data.alphas[i] = charge * Math.sin(Math.PI * m.life);
            });
        },
    };

    // ---- The stars: the card's, and past the frame shifted copies of them (every other one mirrored and moved down by
    // a different part of the height, so no star has a twin beside it)
    const starsFor = (near) => (w, h) => {
        const kk = k(), [AWd, AHd] = art.size;
        const list = [];
        const tw = AWd * kk, th = AHd * kk;
        const nx = Math.ceil((F.x + 60) / tw), mx = Math.ceil((w - F.x - tw + 60) / tw);
        const ny = Math.ceil((F.y + 60) / th), my = Math.ceil((h - F.y - th + 60) / th);
        for (let tx = -nx; tx <= mx; tx++) {
            for (let ty = -ny; ty <= my; ty++) {
                const mirror = tx % 2 !== 0;
                const down = (tx * 0.41 + ty * 0.29) * AHd;
                art.dots.forEach(([x, y, r, c]) => {
                    if ((r >= 4) !== near) return;
                    const ax = mirror ? AWd - x : x;
                    const ay = tx || ty ? ((y + down) % AHd + AHd) % AHd : y;
                    const px = F.x + (tx * AWd + ax) * kk, py = F.y + (ty * AHd + ay) * kk;
                    if (px < -60 || px > w + 60 || py < -60 || py > h + 60) return;
                    list.push([px, py, Math.max(1.2, 2 * r * kk * DOT), art.colors[c]]);
                });
            }
        }
        return list;
    };

    // ---- The game's state
    const IDLE_BACK = 15, BACK = 4;         // left alone 15 s, a knot let go gathers again, then one every 4 s
    let alone = 0;                          // s since the last touch
    let backAt = 0;
    let hand = null;                        // the ghost hand: left alone 7 s, it touches a knot that throbs
    let hands = 0;                          // how many times it has shown, so every third one is the held breath
    const BREATH_AT = 0.35, BREATH = 1.6;   // s held on Particular before it is a breath, and s more to gather it whole
    const WAVE_SPEED = 0.9;                 // the wave of forgiveness, in screen heights a second
    const DELAY = 0.8, GROW = 2.2, LINGER = 3, EAT = 3.4;     // the rulito: born, kept, gone
    const sparks = createSparks(360);
    let win = null;
    let wins = 0;
    let breathUsed = false;
    let breath = null;                      // { pointerId, at, breathing }
    let wave = null;                        // { r, max, x, y } the wave going out from him
    let skipClick = false;
    let glyph = { left: 0, top: 0, w: 1, h: 1 };
    let screenH = 1;
    const left = () => knots.filter((kn) => kn.state === 'here' || kn.state === 'back');
    const knotOnScreen = (kn) => {
        const p = ringPoint(kn.a);
        const [ox, oy] = driftAt(kn.a);
        return { x: p.x + ox, y: p.y + oy };
    };
    // Behind the planet a knot cannot be touched: it has to come round again (what is not forgiven comes back)
    const hidden = (kn) => {
        if (near(kn.a)) return false;
        const p = ringPoint(kn.a);
        return Math.hypot(p.x - sx(P.x), p.y - sy(P.y)) < P.r * k() * 1.02;
    };
    const reachable = () => left().filter((kn) => !hidden(kn));
    const particularAt = () => {
        if (!L.particular) return { x: 0, y: 0 };
        const b = B.particular;
        return L.particular.toScreen(sx(b[0] + b[2] / 2), sy(b[1] + b[3] * 0.45) + spread);
    };
    const fromEvent = (event) => {
        const area = canvas.value.getBoundingClientRect();
        return { x: event.clientX - area.left, y: event.clientY - area.top };
    };
    const knotAt = (p) => {
        if (reduced || win || !stage || !L.frontNode) return null;
        let best = null, bestD = Infinity;
        reachable().forEach((kn) => {
            const c = knotOnScreen(kn);
            const d = Math.hypot(c.x - p.x, c.y - p.y);
            if (d < Math.max(40, 150 * k()) && d < bestD) { best = kn; bestD = d; }
        });
        return best;
    };
    // Let a knot go: it bursts into light and its stretch of the ring clears from it outwards
    const letGo = (kn, quiet = false) => {
        if (kn.state !== 'here' && kn.state !== 'back') return;
        kn.state = 'going';
        kn.at = lastT;
        kn.hint = 0;
        alone = 0;
        const c = knotOnScreen(kn);
        sparks.burst(c.x, c.y, { n: 22, colors: [LIGHT, CREAM, LOVE], speed: 80, life: 2, size: 4.2, spread: 60 * k() });
        if (!quiet) play('release');
        if (!win && !left().length) setTimeout(() => { if (!gone) forgive(); }, DELAY * 1000);
    };
    // The ring clear: the planet shines, the balloon leaps and the rulito is born over Particular
    const forgive = () => {
        if (win || left().length) return;
        wins += 1;
        win = { age: 0, head: 0, tail: 0, full: false, fullAt: 0, back: false, pop: 0 };
        rulito.value?.reshape();
        play('converge');
        kick.balloon = 1;
        kick.marble = 1;
        dust?.boost(2, 1.2);
        dust?.boost(3, 1.2);
        sceneMilestone('forgiven', { times: wins, breath: breathUsed });
        breathUsed = false;
    };
    // After: the ring darkens slowly and the knots gather again, one after the other
    const gatherAgain = () => {
        knots.forEach((kn, j) => setTimeout(() => { if (!gone) { kn.state = 'back'; kn.form = 0; } }, 1800 + j * 700));
    };

    // Pressing Particular: a tap is a touch like any other (he blinks, the leaf dips); held past BREATH_AT he breathes in
    // love (`inhale`), and let go once it is gathered he breathes out forgiveness (`exhale`): a wave goes out from him
    const touchParticular = (event) => {
        alone = 0;
        if (reduced || win || breath) return;
        breath = { pointerId: event?.pointerId, at: lastT, breathing: false };
        window.addEventListener('pointerup', breatheOut);
        window.addEventListener('pointercancel', breatheOut);
    };
    const breatheOut = (event) => {
        if (!breath || (event && event.pointerId !== breath.pointerId)) return;
        window.removeEventListener('pointerup', breatheOut);
        window.removeEventListener('pointercancel', breatheOut);
        const { breathing } = breath;
        breath = null;
        alone = 0;
        if (breathing) skipClick = true;
        if (charge >= 1 && !win && left().length) {
            play('exhale');
            breathUsed = true;
            const at = particularAt();
            wave = { r: 0, x: at.x, y: at.y, max: Math.hypot(Math.max(at.x, canvas.value.clientWidth - at.x), Math.max(at.y, screenH - at.y)) + 60 };
            sceneMilestone('breath_released', { knots: left().length });
        }
    };
    const pressKnot = (event) => {
        alone = 0;
        const kn = knotAt(fromEvent(event));
        if (!kn) return;
        event.preventDefault();
        skipClick = true;
        letGo(kn);
    };
    // Enter on Particular lets go of the knot nearest to him
    const keyParticular = (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        alone = 0;
        const rest = reachable();
        if (reduced || win || !rest.length) { play('star'); kick.leaf = 1; blinkNow = lastT; return; }
        const at = particularAt();
        rest.sort((a, b) => Math.hypot(knotOnScreen(a).x - at.x, knotOnScreen(a).y - at.y) - Math.hypot(knotOnScreen(b).x - at.x, knotOnScreen(b).y - at.y));
        letGo(rest[0]);
    };

    // Every frame: the knots, the ring's light, the breath, its wave, the hint and the rulito
    const game = (t, dt) => {
        knots.forEach((kn) => {
            kn.hint = Math.max(0, kn.hint - dt * 0.8);
            if (kn.state === 'going' && t - kn.at > 0.9) kn.state = 'gone';
            if (kn.state === 'back') { kn.form = Math.min(1, kn.form + dt / 1.6); if (kn.form >= 1) kn.state = 'here'; }
        });
        // The ring clears from each knot let go, outwards along it; darkens again slowly when it gathers. The dust flows
        // through the knots' stretches as it orbits (the inner faster), so each dot belongs to the knot nearest it now
        ring.all.forEach((d) => {
            const a = dotAngle(d);
            let best = 0, gap = Infinity;
            knots.forEach((kn, j) => { const g = angleGap(a, kn.a); if (g < gap) { gap = g; best = j; } });
            const kn = knots[best];
            const clear = (kn.state === 'going' || kn.state === 'gone') && gap <= (t - kn.at) * CLEAR ? 1 : 0;
            d.lit += (clear - d.lit) * Math.min(1, dt * (clear ? 3 : 0.5));
        });
        // The breath
        if (breath && !win) {
            const holding = t - breath.at;
            if (holding > BREATH_AT && !breath.breathing) { breath.breathing = true; play('inhale'); }
            charge = Math.min(1, Math.max(0, (holding - BREATH_AT) / BREATH));
        } else charge = Math.max(0, charge - dt * 2.5);
        // The wave of forgiveness: a ring of light going out from him, letting go of every knot it reaches
        if (wave) {
            wave.r += WAVE_SPEED * screenH * dt;
            for (let n = 0; n < 16; n++) {
                const a = Math.random() * 6.28;
                sparks.burst(wave.x + Math.cos(a) * wave.r, wave.y + Math.sin(a) * wave.r, { n: 1, colors: [LOVE, CREAM, LIGHT], speed: 14, life: 0.7, size: 3.4, spread: 3 });
            }
            left().forEach((kn) => {
                const c = knotOnScreen(kn);
                if (Math.hypot(c.x - wave.x, c.y - wave.y) <= wave.r) letGo(kn, true);
            });
            if (wave.r > wave.max) wave = null;
        }
        // The hint, without words: left alone 7 s, a knot on the screen throbs and the ghost hand touches it, following
        // it; every third time the hand holds Particular instead, because nothing else shows that holding him is a
        // breath. With reduced motion there is no hand (and no game).
        const W = canvas.value?.clientWidth ?? 0;
        const seen = knots.filter((kn) => {
            if (kn.state !== 'here' || hidden(kn)) return false;
            const c = knotOnScreen(kn);
            return c.x > 20 && c.x < W - 20 && c.y > 20 && c.y < screenH - 20;
        });
        if (hand?.due(HINT_AFTER, !win && !breath && !wave && seen.length > 0)) {
            hands += 1;
            if (hands % 3 === 0) hand.play(gesture.hold(partHit.value, 2.4));
            else {
                const kn = seen[Math.floor(Math.random() * seen.length)];
                kn.hint = 1;
                const c = knotOnScreen(kn);
                sparks.burst(c.x, c.y, { n: 6, colors: [LIGHT, LOVE], speed: 30, life: 1, size: 3, spread: 30 * k() });
                hand.play(gesture.tap(() => { const q = knotOnScreen(kn); return [q.x, q.y]; }));
            }
        }
        // Left alone a while, what was let go gathers again: a knot comes back, then another (rule 4 of Soltar)
        alone += dt;
        if (!win && !breath && !wave && alone > IDLE_BACK && t - backAt > BACK) {
            const away = knots.filter((kn) => kn.state === 'gone');
            if (away.length) {
                backAt = t;
                const kn = away[Math.floor(Math.random() * away.length)];
                kn.state = 'back';
                kn.form = 0;
            }
        }
        // The rulito over Particular, as the card draws it
        let named = 0;
        if (win && rulito.value) {
            win.age += dt;
            win.pop = Math.max(0, win.pop - dt * 2.2);
            win.head = 1 - (1 - Math.min(1, Math.max(0, (win.age - DELAY) / GROW))) ** 1.6;
            if (win.head >= 1 && !win.full) { win.full = true; win.fullAt = win.age; win.pop = 1; play('rulito'); kick.balloon = 1; }
            if (win.full && !win.back && win.age - win.fullAt > LINGER) win.back = true;
            if (win.back) win.tail = Math.min(1, win.tail + dt / EAT);
            const whole = Math.min(1, Math.max(0, (win.head - win.tail - 0.6) / 0.4));
            named = Math.max(win.pop, 0.8 * whole * whole * (3 - 2 * whole));
            const shine = win.full && win.head - win.tail > 0.9 ? Math.max(win.pop, Math.sin(t * 4) * 0.5 + 0.5) : 0;
            rulito.value.frame({ head: win.head, tail: win.tail, flare: shine, t, fade: Math.min(1, (win.head - win.tail) * 14), width: glyph.w });
            L.rulito.refresh();
            L.rulito.scale = 1 + 0.2 * win.pop * win.pop;
            if (win.back && win.tail >= 1) {
                win = null;
                rulito.value.frame({ width: glyph.w });
                L.rulito.refresh();
                gatherAgain();
            }
        }
        stageEl?.style.setProperty('--name-glow', named.toFixed(3));
        return named;
    };

    // ---- A touch: the chord, a flare, and whatever is touched answers
    const kick = { balloon: 0, leaf: 0, cup: 0, marble: 0, tiny: 0 };
    let blinkAt = 2.5;
    let blinkNow = -1;
    let lastT = 0;
    let turned = 0;
    const L = {};
    const TOUCH = {
        balloon: [1350, 420], cup: [812, 642], leaf: [560, 2120], marble: [P.x, P.y], tiny: centreOf(art.doodles[0].at.slice(0, 4)),
    };
    const strum = (event) => {
        if (skipClick) { skipClick = false; return; }
        if (!stage || !L.leaf) return;
        play('star');
        dust?.boost(0, 0.7);
        dust?.boost(1, 0.9);
        dust?.boost(2, 0.8);
        dust?.boost(3, 0.8);
        if (reduced) return;
        const area = canvas.value.getBoundingClientRect();
        const at = { x: event.clientX - area.left, y: event.clientY - area.top };
        const nodes = { balloon: L.balloon, cup: L.cup, leaf: L.leafGroup, marble: L.marble, tiny: L.tiny };
        let best = null, near = Infinity;
        Object.entries(TOUCH).forEach(([name, [x, y]]) => {
            const node = nodes[name];
            const dy = name === 'leaf' ? spread : name === 'marble' ? 0 : -spread;
            const p = node.toScreen(sx(x), sy(y) + dy);
            const reach = name === 'marble' ? P.r * k() * 1.1 : Math.max(48, 260 * k());
            const d = Math.hypot(p.x - at.x, p.y - at.y);
            if (d < reach && d < near) { near = d; best = name; }
        });
        if (best) kick[best] = 1;
        if (best === 'leaf') blinkNow = lastT;
    };

    const build = (s) => {
        // Far stars, then the doodles, then the ring behind the planet, the planet, the ring in front of it
        L.far = s.depth(zFor(DEPTH.far));
        L.near = s.depth(zFor(DEPTH.near));
        const sky = s.depth(zFor(DEPTH.doodles));
        L.doodles = doodles.map((d) => {
            const node = sky.image('/assets/perdon/doodles.webp', { crop: d.crop });
            if (d.name === 'tiny') L.tiny = node;
            return node;
        });
        sky.enter({ y: -20, delay: 300, duration: 2000 });
        const planet = s.depth(zFor(DEPTH.planet));
        L.planetNode = planet;
        L.halo = planet.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: CREAM, stops: [[0, 0.5], [0.42, 0.2], [0.72, 0]] });
        L.disc = planet.disc({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: P.color });
        L.marble = planet.image('/assets/perdon/marble.webp', { shimmer: 0.25 });
        // The outline: a ring drawn once on a canvas
        const ringCanvas = document.createElement('canvas');
        ringCanvas.width = ringCanvas.height = 1024;
        const g = ringCanvas.getContext('2d');
        const outer = P.line.r + P.line.width;
        g.strokeStyle = hexCss(P.line.color);
        g.lineWidth = P.line.width / (2 * outer) * 1024;
        g.beginPath();
        g.arc(512, 512, P.line.r / outer * 512, 0, Math.PI * 2);
        g.stroke();
        L.line = planet.canvas(ringCanvas);
        L.line.refresh();
        planet.enter({ y: 30, scale: 0.94, delay: 100, duration: 2000 });
        L.backNode = s.depth(zFor(DEPTH.back));
        L.frontNode = s.depth(zFor(DEPTH.front));
        // The little Sama in its cup, the balloon (the Sama hanging from it behind it)
        const cup = s.depth(zFor(DEPTH.cup));
        L.cupNode = cup;
        L.cup = cup.image('/assets/perdon/cup.webp');
        cup.enter({ y: -30, delay: 500, duration: 2000 });
        const balloon = s.depth(zFor(DEPTH.balloon));
        L.balloonNode = balloon;
        L.balloon = balloon.group();
        L.hanger = L.balloon.image('/assets/perdon/hanger.webp');
        L.body = L.balloon.image('/assets/perdon/balloon.webp');
        balloon.enter({ y: 60, delay: 350, duration: 2400 });
        // The leaf: Particular (his eyes on their own) and the kitten sit in it, under its rim
        const leaf = s.depth(zFor(DEPTH.leaf));
        L.leafNode = leaf;
        L.leafGroup = leaf.group();
        L.particular = L.leafGroup.group();
        L.love = L.particular.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: LOVE, stops: [[0, 0.7], [0.35, 0.3], [0.7, 0]], bloom: true });
        L.love.opacity = 0;
        L.sid = L.particular.image('/assets/perdon/particular.webp');
        L.eyes = L.particular.image('/assets/perdon/eyes.webp');
        L.rulito = L.particular.canvas(rulito.value.canvas, { bloom: true });
        L.kitten = L.leafGroup.image('/assets/perdon/kitten.webp', { sway: true });
        L.leaf = L.leafGroup.image('/assets/perdon/leaf.webp');
        leaf.enter({ y: 70, delay: 200, duration: 2000 });
    };

    const place = (w, h) => {
        layout(w, h);
        const stops = art.sky.map(([y, c]) => `${hexCss(c)} ${(sy(y) / h * 100).toFixed(1)}%`);
        root.value.style.background = `linear-gradient(to bottom, ${hexCss(art.sky[0][1])}, ${stops.join(', ')}, ${hexCss(art.sky[art.sky.length - 1][1])})`;

        const up = -spread, down = spread;
        doodles.forEach((d, i) => L.doodles[i].place(rectOf(d.box, d.upper ? up : down)));

        const pr = P.r * k();
        L.disc.place({ left: sx(P.x) - pr, top: sy(P.y) - pr, w: 2 * pr, h: 2 * pr });
        const hr = pr * 2.5;
        L.halo.place({ left: sx(P.x) - hr / 2, top: sy(P.y) - hr / 2, w: hr, h: hr });
        L.marble.place(rectOf(B.marble), { x: sx(P.x), y: sy(P.y) });
        const lr = (P.line.r + P.line.width) * k();
        L.line.place({ left: sx(P.x) - lr, top: sy(P.y) - lr, w: 2 * lr, h: 2 * lr });

        const cup = rectOf(B.cup, up);
        L.cup.place(cup, { x: cup.left + cup.w / 2, y: cup.top + cup.h * 0.8 });
        const [kx, ky] = art.knot;
        const knot = { x: sx(kx), y: sy(ky) + up };
        L.balloon.pivot = knot;
        L.body.place(rectOf(B.balloon, up), knot);
        L.hanger.place(rectOf(B.hanger, up), knot);

        const leaf = rectOf(B.leaf, down);
        L.leafGroup.pivot = { x: leaf.left + leaf.w * 0.45, y: leaf.top + leaf.h * 0.8 };
        L.leaf.place(leaf);
        const body = rectOf(B.particular, down);
        L.particular.pivot = { x: body.left + body.w / 2, y: body.top + body.h };
        L.sid.place(body, L.particular.pivot);
        const eyes = rectOf(B.eyes, down);
        L.eyes.place(eyes);
        const kit = rectOf(B.kitten, down);
        L.kitten.place(kit, { x: kit.left + kit.w / 2, y: kit.top + kit.h });
        const ld = body.h * 2.6;
        L.love.place({ left: body.left + body.w / 2 - ld / 2, top: body.top + body.h * 0.45 - ld / 2, w: ld, h: ld });
        // The rulito where the card draws it, over his head (its canvas is bigger than the glyph, for the glow)
        const r = rectOf(art.rulito.box, down);
        const gw = r.h * 32 / 86;
        glyph = { left: r.left + r.w / 2 - gw / 2, top: r.top, w: gw, h: r.h };
        L.rulito.place({ left: glyph.left - 0.4375 * glyph.w, top: glyph.top - 0.1628 * glyph.h, w: glyph.w * 1.875, h: glyph.h * 1.3256 },
            { x: glyph.left + glyph.w / 2, y: glyph.top + glyph.h });
        screenH = h;
    };

    // The touch target over Particular (at least 64 px)
    const placeHit = () => {
        const el = partHit.value;
        if (!el || !L.particular) return;
        const b = L.particular.boxOnScreen(rectOf(B.particular, spread));
        const bw = Math.max(64, b.width * 1.3), bh = Math.max(64, b.height * 1.1);
        el.style.translate = `${(b.left + b.width / 2 - bw / 2).toFixed(1)}px ${(b.top + b.height / 2 - bh / 2).toFixed(1)}px`;
        el.style.width = `${bw.toFixed(1)}px`;
        el.style.height = `${bh.toFixed(1)}px`;
    };

    const enter = () => {
        if (entered || !props.active || !stage) return;
        entered = true;
        stage.ready().then(() => { if (!gone) { stage.start(); dust?.reveal(); } });
    };

    let frames = 0;
    const frame = ({ x, y, scroll, t, ramp }) => {
        if (!stage || !L.leaf) return;
        const dt = Math.min(0.1, Math.max(0, t - lastT));
        lastT = t;
        if (!reduced) orbitT += dt * ramp;
        knots.forEach((kn) => { kn.a = kn.a0 + ORBIT * orbitT; });
        const named = game(t, dt);
        rampNow = ramp;
        stage.look(x * SLIDE, y * SLIDE_Y);
        Object.keys(kick).forEach((name) => { kick[name] = Math.max(0, kick[name] - dt * 0.7); });
        const kk = k();

        // ---- The planet: its marble turns slowly (faster for a moment when touched), a light breathes behind it
        flowT += dt * (1 + 2.5 * kick.marble);
        if (!reduced) turned += dt * (1.1 + 30 * kick.marble);
        L.marble.rotate = -turned;
        const breath = Math.sin(t * 0.5);
        L.halo.opacity = (0.55 + 0.25 * breath * ramp) + 0.3 * kick.marble;
        L.halo.scale = 1 + 0.05 * breath * ramp;
        L.planetNode.y = scroll * 18;

        // ---- The doodles float; the little ringed planet rocks
        doodles.forEach((d, i) => {
            const node = L.doodles[i];
            node.y = Math.sin(t * 0.4 + d.phase) * 10 * kk * 3 * ramp;
            node.x = Math.sin(t * 0.23 + d.phase * 2) * 6 * kk * 3 * ramp;
            node.rotate = Math.sin(t * 0.3 + d.phase) * (d.name === 'tiny' ? 9 : 5) * ramp + (d.name === 'tiny' ? 360 * (1 - (1 - kick.tiny) ** 2) : 0);
        });

        // ---- The balloon bobs and leans about its knot; the Sama hanging from it swings a little later
        const lift = Math.sin(t * 0.55) * 14 * kk * ramp - 60 * kk * Math.sin(kick.balloon * Math.PI);
        L.balloon.y = lift;
        L.balloon.rotate = Math.sin(t * 0.42) * 2.4 * ramp + Math.sin(kick.balloon * 9) * 3 * kick.balloon;
        L.body.rotate = Math.sin(t * 0.42 + 0.6) * 1.2 * ramp;
        L.body.sx = 1 + 0.012 * Math.sin(t * 0.9) * ramp;
        L.body.sy = 1 - 0.01 * Math.sin(t * 0.9) * ramp;
        L.hanger.rotate = -Math.sin(t * 0.42 - 0.9) * 5 * ramp - Math.sin(kick.balloon * 7) * 7 * kick.balloon;
        L.balloonNode.y = scroll * 24;

        // ---- The cup rocks and bobs (and spins round once when touched)
        L.cup.rotate = Math.sin(t * 0.7 + 1) * 6 * ramp + 360 * (1 - (1 - kick.cup) ** 2);
        L.cup.y = Math.sin(t * 0.5 + 2) * 10 * kk * ramp;
        L.cupNode.y = scroll * 20;

        // ---- The leaf rocks and bobs; Particular breathes, blinks and now and then looks up at the balloon; the kitten
        // breathes and its tail sways
        L.leafGroup.rotate = Math.sin(t * 0.5) * 1.6 * ramp + Math.sin(kick.leaf * 8) * 2.5 * kick.leaf;
        L.leafGroup.y = Math.sin(t * 0.37) * 12 * kk * ramp + 26 * kk * Math.sin(kick.leaf * Math.PI);
        L.particular.sy = 1 + 0.018 * Math.sin(t * 1.05) * ramp + 0.04 * charge;
        L.particular.sx = 1 - 0.006 * Math.sin(t * 1.05) * ramp + 0.02 * charge;
        L.love.opacity = Math.max(charge, 0.8 * named);
        L.love.scale = 0.8 + 0.4 * charge + 0.2 * named;
        L.sid.uniforms.uBright.value = 1 + 0.15 * charge;
        if (!reduced && t > blinkAt) { blinkNow = t; blinkAt = t + 3 + Math.random() * 4; }
        const b = blinkNow >= 0 ? (t - blinkNow) / 0.16 : 2;
        L.eyes.sy = b < 1 ? 0.15 + 0.85 * Math.abs(1 - 2 * b) : 1;
        const look = reduced ? 0 : Math.max(0, Math.sin(t * 2 * Math.PI / 14) ** 9);       // a look up, every 14 s
        L.eyes.x = look * 7 * kk;
        L.eyes.y = -look * 5 * kk;
        L.particular.rotate = look * 2 * ramp;
        L.kitten.sy = 1 + 0.02 * Math.sin(t * 1.6 + 1) * ramp;
        L.kitten.sways = [[0.12, 0.72, 0.2, Math.sin(t * 0.9) * 10 * ramp, 1]];
        L.leafNode.y = scroll * 30;

        // The particles follow their layers
        const drift = (node, extra = 0) => { const d = stage.drift(node.z); return [d.x, d.y + extra]; };
        dust?.shift(0, ...drift(L.far, scroll * 6));
        dust?.shift(1, ...drift(L.near, scroll * 10));
        // (the ring and the knots, groups 2 to 5, add their own: each dot's depth depends on where it is on the ring)
        ringDrift.back = drift(L.backNode, scroll * 18);
        ringDrift.front = drift(L.frontNode, scroll * 18);
        L.halo.opacity += 0.4 * named;
        stage.bloom = Math.max(named, win ? 0.4 : 0, 0.4 * charge);
        stage.render(t);
        if (frames++ % 2 === 0) placeHit();
    };

    const begin = async () => {
        let made;
        try {
            made = await createLayerStage(canvas.value);
        } catch (e) {
            console.warn('The WebGL stage is not available', e);
            return;
        }
        if (gone) { made.destroy(); return; }
        stage = made;
        stageEl = root.value.closest('.stage');
        build(stage);
        hand = createGhostHand(stage);
        stage.onResize((w, h) => place(w, h));
        const after = (node) => node.mesh.renderOrder + 0.5;
        dust = startStardust(null, {
            stage,
            manual: true,
            groups: [
                // 0, 1: the stars, far and small, and nearer and bigger
                { colors: art.colors, look: 'hard', parallax: 0, drift: 1.5, jitter: 0, twinkle: 0.35, reach: 0, order: 0.5, points: starsFor(false) },
                { colors: art.colors, look: 'hard', parallax: 0, drift: 2.5, jitter: 0, twinkle: 0.25, reach: 0, order: 0.6, points: starsFor(true) },
                // 2, 3: the ring of dust, behind the planet and in front of it, flowing round it
                { colors: [DUST], look: 'hard', dynamic: ringGroup(ring.all, false), parallax: 0, drift: 1.2, jitter: 0.35, twinkle: 0, reach: 0, order: after(L.halo) },
                { colors: [DUST], look: 'hard', dynamic: ringGroup(ring.all, true), parallax: 0, drift: 1.2, jitter: 0.35, twinkle: 0, reach: 0, order: after(L.line) },
                // 4, 5: the knots, over the ring, the near ones over the planet and the far ones under it
                { colors: [DUST], look: 'hard', dynamic: knotGroup(true), parallax: 0, drift: 1.4, jitter: 0.3, twinkle: 0, reach: 0, order: after(L.line) + 0.1 },
                { colors: [DUST], look: 'hard', dynamic: knotGroup(false), parallax: 0, drift: 1.4, jitter: 0.3, twinkle: 0, reach: 0, order: after(L.halo) + 0.1 },
                // 6: the air he breathes in, and 7: the motes of what is let go, in front of everything
                { colors: [LOVE, CREAM], look: 'soft', dynamic: airGroup, parallax: 0, drift: 0, jitter: 0, twinkle: 0.2, reach: 0, bloom: true, order: 1e6 - 1 },
                { ...sparks.group(), order: 1e6 },
            ],
        });
        if (reduced) dust.reveal();
        parallax = createParallax(root.value, frame);
        root.value.addEventListener('pointerdown', pressKnot);
        if (import.meta.env.DEV) root.value.__game = { get knots() { return knots; }, get win() { return win; }, knotOnScreen, particularAt };
        enter();
    };

    onMounted(begin);
    watch(() => props.active, enter);
    onBeforeUnmount(() => {
        gone = true;
        stageEl?.style.removeProperty('--name-glow');
        root.value?.removeEventListener('pointerdown', pressKnot);
        window.removeEventListener('pointerup', breatheOut);
        window.removeEventListener('pointercancel', breatheOut);
        parallax?.destroy();
        dust?.destroy();
        hand?.destroy();
        stage?.destroy();
    });
</script>

<template>
    <div class="scene" ref="root" @click="strum">
        <canvas class="stageCanvas" ref="canvas"></canvas>
        <div ref="partHit" class="hit" role="button" tabindex="0"
            :aria-label="$i18n.locale === 'en' ? 'Particular in his leaf: hold him to breathe in love and let go to breathe out forgiveness' : 'Particular en su hoja: mantenelo para inhalar amor y soltalo para exhalar perdón'"
            @pointerdown.prevent="touchParticular" @keydown="keyParticular"></div>
        <!-- The rulito is drawn on its own canvas, which the stage shows as a texture over Particular -->
        <Rulito ref="rulito" class="offstage" :color="art.rulito ? `#${art.rulito.color.toString(16).padStart(6, '0')}` : '#f8e5ab'" />
    </div>
</template>

<style scoped>
    .scene {
        position: absolute;
        inset: 0;
        overflow: hidden;
        background: #c0c0a4;
    }

    .stageCanvas {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        display: block;
        pointer-events: none;
    }

    .hit {
        position: absolute;
        left: 0;
        top: 0;
        width: 0;
        height: 0;
        border-radius: 50%;
        cursor: pointer;
        pointer-events: auto;
        touch-action: none;                    /* held, a finger drifts a little: the phone must not take it for a scroll */
        -webkit-tap-highlight-color: transparent;
        outline: none;
    }

    .hit:focus-visible {
        outline: 2px solid rgba(20, 50, 70, 0.7);
        outline-offset: 2px;
    }

    .offstage {
        position: absolute;
        left: -9999px;
        top: 0;
        width: 40px;
        visibility: hidden;
        pointer-events: none;
    }
</style>
