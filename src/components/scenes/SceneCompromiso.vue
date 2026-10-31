<script setup>
    // Compromiso: commitment, "I am committed to what I seek and my vision". A great mushroom: its stem is a path that
    // comes up from the viewer to the horizon of its coral cap, and over the cap a dome of night sky, full of stars, where
    // a boat floats with two beings in it, the big one with its long hair and a little one peeping over the side, a
    // little plant and a pole. Round the dome and under the cap, pale mint and a marbled water.
    // Its verb is Arraigar ("your path is lit by the mere fact of committing to your search"): holding the big being
    // (finger, mouse or key) lights the path, from the viewer's feet up the stem to the horizon of the cap, at its own
    // steady pace; the signs on it light up as the light passes them, a note of the chord at each third of the way
    // (`kindle`), the big one glows and looks down the path and the boat steadies. The light is the rulito's stroke
    // (useRooting.js): when it reaches the horizon the rulito the card draws in the sky is born (`rulito`, A major, and
    // `converge`), the horizon flares and the name lights up; let go before, the light's tail climbs after its head and
    // fades at the horizon (holding again picks it up). Left alone a while, the foot of the path glimmers and the big
    // one's light breathes (the hint). A touch anywhere else strums the card's chord and the stars and the motes flare;
    // a quick touch on the beings makes the big one hop and blink and the little one peep.
    // Nothing of the sky is a picture: the dome (a circle with its outline, cut where the cap hides it) and the cap (an
    // ellipse with its outline) are drawn in code from the card's colours, worked out by the converter; the stars are
    // particles (the drawn ones, and more for the dome past the frame), and so are the motes that rise from the horizon
    // into the night; a warm light breathes behind the horizon. It is drawn in WebGL (useLayerStage): the water, the
    // dome, the boat and the mushroom are planes at their depths. The water shimmers and is mirrored past the frame on a
    // wide screen, where the dome and the cap simply go on (they are code); the boat bobs and rocks, the beings breathe
    // and blink, their hair and the plant sway, the glints by the boat twinkle and the signs on the path glow in turn.
    // From compromisoScene.json and public/assets/compromiso (made by scripts/convert-compromiso.mjs). The touch target
    // over the beings is a DOM element.
    import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { createParallax } from '../../composables/useParallax.js';
    import { createLayerStage } from '../../composables/useLayerStage.js';
    import { startStardust } from '../../composables/useStardust.js';
    import { createSparks } from '../../composables/useSparks.js';
    import { createRooting } from '../../composables/useRooting.js';
    import { play } from '../../composables/useSound.js';
    import { sceneMilestone } from '../../analytics.js';
    import Rulito from '../Rulito.vue';
    import art from '../../composables/compromisoScene.json';

    const props = defineProps({
        card: { type: Object, default: () => ({}) },
        active: Boolean
    });

    const root = ref(null);
    const canvas = ref(null);
    const beingsHit = ref(null);
    const rulito = ref(null);
    let stageEl = null;
    let stage = null;
    let parallax = null;
    let dust = null;
    let entered = false;
    let gone = false;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const A = (path) => `/assets/compromiso/${path}.webp`;

    // ---- Layout: the illustration is a 2160x2700 portrait. On a phone upright it is as tall as the screen (cut at the
    // sides, centred on the boat) and comes down under the card's name if it has to; on a wide screen the sky from its
    // top down to below the cap fills the height and the rest goes on past the frame: the dome and the cap are code,
    // and the water is mirrored
    const SIZE = art.size, HEIGHT = art.height;
    const B = art.boxes;
    let F = { x: 0, y: 0, size: 1 };
    const k = () => F.size / SIZE;
    const sx = (x) => F.x + x * k();
    const sy = (y) => F.y + y * k();
    const rectOf = ([left, top, w, h]) => ({ left: sx(left), top: sy(top), w: w * k(), h: h * k() });
    const FOCUS = 1072;                     // the middle of the boat (art px)
    const BOAT_SPAN = 1150;                 // art px across that must be seen on a phone (the boat with its curls)
    const TOP = 370;                        // the tips of the big being's hair: kept under the card's name
    const VIEW = 2050;                      // art px from the top that a wide screen shows (the cap and the path's top)
    const layout = (w, h) => {
        const phone = w < h;
        let scale = phone ? h / HEIGHT : h / VIEW;
        if (phone) scale = Math.min(scale, w / BOAT_SPAN);
        const size = SIZE * scale;
        let x = w / 2 - size / 2;
        if (phone && size > w) x = Math.min(0, Math.max(w - size, w / 2 - FOCUS * scale));
        const y = phone ? Math.max(0, titleBottom(h) + 12 - TOP * scale) : 0;
        F = { x, y, size };
    };

    const SLIDE = 44;
    const SLIDE_Y = 26;
    const zFor = (amp) => amp / (SLIDE + amp);
    const DEPTH = { water: 4, dome: 8, boat: 16, mushroom: 24 };
    const DOME = art.dome, CAP = art.cap;
    const TEAL = 0x007c7e, YELLOW = 0xffe22e;
    const WARM = 0xfdc391;                  // the card's colorAlt
    const hexCss = (c) => `#${c.toString(16).padStart(6, '0')}`;

    // ---- The dome and the cap, drawn in code on canvases the stage shows as planes. The dome is cut at the middle of
    // the cap, which hides the rest of it
    const domeCanvas = document.createElement('canvas');
    const capCanvas = document.createElement('canvas');
    const MAX_TEX = 2048;
    let domeRect = { left: 0, top: 0, w: 1, h: 1 }, capRect = { left: 0, top: 0, w: 1, h: 1 };
    const paint = (target, rect, draw) => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const scale = Math.min(dpr, MAX_TEX / Math.max(rect.w, rect.h, 1));
        target.width = Math.max(2, Math.round(rect.w * scale));
        target.height = Math.max(2, Math.round(rect.h * scale));
        const ctx = target.getContext('2d');
        ctx.clearRect(0, 0, target.width, target.height);
        ctx.save();
        ctx.scale(scale, scale);
        ctx.translate(-rect.left, -rect.top);
        draw(ctx);
        ctx.restore();
    };
    const paintDome = () => {
        const line = DOME.width * k();
        const r = DOME.r * k();
        domeRect = { left: sx(DOME.x) - r - line, top: sy(DOME.y) - r - line, w: 2 * (r + line), h: sy(CAP.y) - (sy(DOME.y) - r - line) };
        paint(domeCanvas, domeRect, (ctx) => {
            ctx.beginPath();
            ctx.arc(sx(DOME.x), sy(DOME.y), r + line / 2, 0, Math.PI * 2);
            ctx.fillStyle = hexCss(DOME.line);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(sx(DOME.x), sy(DOME.y), r - line / 2, 0, Math.PI * 2);
            ctx.fillStyle = hexCss(DOME.color);
            ctx.fill();
        });
    };
    const paintCap = () => {
        const line = DOME.width * k();
        const a = CAP.a * k() + line, b = CAP.b * k() + line;
        // The canvas holds the cap unturned; the plane is turned by its tilt
        capRect = { left: sx(CAP.x) - a, top: sy(CAP.y) - b, w: 2 * a, h: 2 * b };
        paint(capCanvas, capRect, (ctx) => {
            ctx.beginPath();
            ctx.ellipse(sx(CAP.x), sy(CAP.y), a, b, 0, 0, Math.PI * 2);
            ctx.fillStyle = hexCss(DOME.line);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(sx(CAP.x), sy(CAP.y), a - line, b - line, 0, 0, Math.PI * 2);
            ctx.fillStyle = hexCss(CAP.color);
            ctx.fill();
        });
    };

    // ---- The game: the lit stretch of the path, from the rulito's stroke (tail .. head), foot to horizon
    const PATH = [2700, 1262];              // art y of the path's foot (the bottom of the card) and of its end, at the horizon
    const PATH_X = [1100, 1052];            // its middle there
    const PATH_HALF = [980, 150];           // half its width there
    const HINT = 7;
    const sparks = createSparks(260);
    let screenH = 1;
    let glyph = { left: 0, top: 0, w: 1, h: 1 };
    let pressAt = -1;                       // when the beings were pressed (a quick touch is a greeting)
    let idleHint = 0, hint = 0;
    let lit = { head: 0, tail: 0, full: false, pop: 0, named: 0, flare: 0 };
    const rooting = createRooting({
        grow: 4.6, linger: 3.2, eat: 3,
        onNote: (step) => play('kindle', { step }),
        onComplete: (times) => {
            play('rulito');
            play('converge');
            dust?.boost(2, 1.4);
            dust?.boost(1, 1);
            rulitoGlow = 1;
            sceneMilestone('path_committed', { times });
        },
        onReset: () => rulito.value?.reshape(),
    });
    let rulitoGlow = 0;
    // Where along the path (0 the foot, 1 the horizon) is which art y: slower as it goes away, as in perspective
    const pathY = (p) => PATH[0] + (PATH[1] - PATH[0]) * (1 - (1 - p) ** 1.35);
    const pathAt = (p) => {
        const e = (PATH[0] - pathY(p)) / (PATH[0] - PATH[1]);
        return { x: PATH_X[0] + (PATH_X[1] - PATH_X[0]) * e, y: pathY(p), half: PATH_HALF[0] + (PATH_HALF[1] - PATH_HALF[0]) * e };
    };
    const hold = () => {
        if (reduced) return;
        rooting.hold();
        idleHint = 0;
    };
    const letGo = () => {
        rooting.release();
        idleHint = 0;
    };
    const pressBeings = (event) => {
        event?.preventDefault?.();
        pressAt = lastT;
        play('tap');
        hold();
        window.addEventListener('pointerup', liftBeings);
        window.addEventListener('pointercancel', liftBeings);
    };
    const liftBeings = () => {
        window.removeEventListener('pointerup', liftBeings);
        window.removeEventListener('pointercancel', liftBeings);
        letGo();
        if (lastT - pressAt < 0.35) greet();
        pressAt = -1;
    };

    // ---- The beings: they breathe, blink now and then (each at its own pace) and react to a touch
    const blinkAt = { big: 2.5, small: 4.2 };
    let hop = 0;                            // 0..1, the big being's hop (a touch), decaying
    let peep = 0;                           // the little one peeping up
    let rock = 0;                           // the boat rocked by a touch
    let steady = 0;                         // the boat steadied while the path is held, eased
    let lastT = 0;
    const L = {};
    const blinkOf = (t, name) => {
        if (t > blinkAt[name] + 0.16) blinkAt[name] = t + 2.6 + Math.random() * 4.5;
        const p = (t - blinkAt[name]) / 0.16;
        return p >= 0 && p <= 1 ? Math.sin(p * Math.PI) : 0;
    };

    const build = (s) => {
        // The marbled water, far behind, with its mirror on each side past the frame
        const water = s.depth(zFor(DEPTH.water));
        L.waterNode = water;
        const copy = (name, flipX, flipY) => {
            const node = water.image(A(name), { shimmer: 0.5, water: 0.35 });
            node.sx = flipX ? -1 : 1;
            node.sy = flipY ? -1 : 1;
            return node;
        };
        // Each piece, its mirror past the side of the frame it touches and, for the ones at the top, past the top too
        // (a phone may show a little over the frame) and past both
        L.water = art.water.map((piece) => ({
            ...piece, top: B[piece.name][1] <= 2,
            node: copy(piece.name), mirror: copy(piece.name, true), above: copy(piece.name, false, true), corner: copy(piece.name, true, true),
        }));
        water.enter({ y: 30, delay: 0, duration: 1800 });
        // The dome of the night (code), with the warm light behind the horizon
        const dome = s.depth(zFor(DEPTH.dome));
        L.domeNode = dome;
        L.dome = dome.canvas(domeCanvas);
        L.horizon = dome.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: WARM, stops: [[0, 0.42], [0.3, 0.18], [0.7, 0]] });
        dome.enter({ y: 40, delay: 100, duration: 2000 });
        // The boat: the hull, the beings, the plant, the line with its curls, the glints
        const boat = s.depth(zFor(DEPTH.boat));
        L.boatNode = boat;
        L.boat = boat.group();
        L.aura = L.boat.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: 0xe9edd8, stops: [[0, 0.12], [0.35, 0.05], [0.7, 0]], bloom: true });
        L.hull = L.boat.image(A('hull'));
        L.plant = L.boat.image(A('plant'), { wind: { amp: 3, speed: 0.9, root: 'bottom' } });
        L.small = L.boat.group();
        L.smallBody = L.small.image(A('small'), { wind: { amp: 3, speed: 1.1, root: 'bottom' } });
        L.smallEyes = L.small.image(A('eyesSmall'));
        L.big = L.boat.group();
        L.bigBody = L.big.image(A('big'), { wind: { amp: 5, speed: 0.7, root: 'bottom' } });
        L.bigEyes = L.big.image(A('eyes'));
        L.boatLine = L.boat.image(A('boatLine'));
        L.glints = L.boat.image(A('glints'));
        boat.enter({ y: 70, delay: 450, duration: 2000 });
        // The mushroom: its cap (code), the gills, the path, its signs and the line work
        const mushroom = s.depth(zFor(DEPTH.mushroom));
        L.mushroomNode = mushroom;
        L.cap = mushroom.canvas(capCanvas);
        L.gills = mushroom.image(A('gills'));
        L.stem = mushroom.image(A('stem'));
        L.runes = mushroom.image(A('runes'));
        // The path lit (the stem and its signs again, warm and bright, cut to the lit stretch), and the light at its front
        L.stemLit = mushroom.image(A('stem'));
        L.stemLit.uniforms.uTint.value.setRGB(1, 0.86, 0.6);
        L.stemLit.uniforms.uTintAmount.value = 0.35;
        L.stemLit.uniforms.uBright.value = 1.18;
        L.runesLit = mushroom.image(A('runes'), { bloom: true });
        L.runesLit.uniforms.uTint.value.setRGB(1, 0.93, 0.45);
        L.runesLit.uniforms.uTintAmount.value = 0.85;
        L.runesLit.uniforms.uBright.value = 1.3;
        L.front = mushroom.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: 0xffe2a0, stops: [[0, 0.75], [0.35, 0.3], [0.7, 0]], bloom: true });
        L.lines = mushroom.image(A('lines'));
        // The rulito the card draws in the sky, in its yellow
        L.rulito = dome.canvas(rulito.value.canvas, { bloom: true });
        mushroom.enter({ y: 60, delay: 200, duration: 1800 });
    };

    const place = (w, h) => {
        layout(w, h);
        paintDome();
        paintCap();
        L.dome.place(domeRect);
        L.dome.refresh();
        L.cap.place(capRect);
        L.cap.refresh();
        L.cap.rotate = CAP.tilt;
        const hw = 1500 * k(), hh = 700 * k();
        L.horizon.place({ left: sx(CAP.x) - hw / 2, top: sy(CAP.y - 230) - hh / 2, w: hw, h: hh });

        // The water, and past the frame its mirror (about the side it touches)
        const edge = { [-1]: F.x, 1: F.x + F.size };
        L.water.forEach(({ name, side, top, node, mirror, above, corner }) => {
            const r = rectOf(B[name]);
            node.place(r);
            const left = side ? 2 * edge[side] - r.left - r.w : r.left, up = 2 * F.y - r.top - r.h;
            mirror.place({ ...r, left });
            above.place({ ...r, top: up });
            corner.place({ ...r, left, top: up });
            mirror.opacity = side ? 1 : 0;
            above.opacity = top ? 1 : 0;
            corner.opacity = side && top ? 1 : 0;
        });

        const boat = rectOf(B.hull);
        L.boat.pivot = { x: boat.left + boat.w / 2, y: boat.top + boat.h * 0.6 };
        L.hull.place(boat);
        L.plant.place(rectOf(B.plant));
        const feet = (name) => ({ x: sx(art.beings[name].feet[0]), y: sy(art.beings[name].feet[1]) });
        L.small.pivot = feet('small');
        L.smallBody.place(rectOf(B.small));
        L.smallEyes.place(rectOf(B.eyesSmall));
        L.big.pivot = feet('big');
        L.bigBody.place(rectOf(B.big));
        L.bigEyes.place(rectOf(B.eyes));
        L.boatLine.place(rectOf(B.boatLine));
        L.glints.place(rectOf(B.glints));
        const ad = 1100 * k();
        L.aura.place({ left: sx(1110) - ad / 2, top: sy(880) - ad / 2, w: ad, h: ad });

        L.gills.place(rectOf(B.gills));
        L.stem.place(rectOf(B.stem));
        L.runes.place(rectOf(B.runes));
        L.stemLit.place(rectOf(B.stem));
        L.runesLit.place(rectOf(B.runes));
        L.lines.place(rectOf(B.lines));
        // The rulito where the card draws it, in the sky (on a phone that cuts it off, as far right as it is seen)
        const [rx, ry] = art.rulito;
        const gh = Math.max(56, 250 * k()), gw = gh * 32 / 86;
        const gx = Math.min(sx(rx + 40), w - gw * 2.6);
        glyph = { left: gx - gw / 2, top: Math.max(titleBottom(h) + 18, sy(ry - 60)), w: gw, h: gh };
        L.rulito.place({ left: glyph.left - 0.4375 * glyph.w, top: glyph.top - 0.1628 * glyph.h, w: glyph.w * 1.875, h: glyph.h * 1.3256 },
            { x: glyph.left + glyph.w / 2, y: glyph.top + glyph.h });
        screenH = h;
    };

    // Where the card's name ends (the stage's h1, over the scene), so the boat keeps under it on a phone
    const titleBottom = (h) => {
        const title = stageEl?.querySelector('h1');
        if (!title || !root.value) return 0.16 * h;
        return title.getBoundingClientRect().bottom - root.value.getBoundingClientRect().top;
    };

    // The touch target: the two beings in the boat
    const placeHits = () => {
        if (!L.boat || !beingsHit.value) return;
        const b = L.boat.boxOnScreen(rectOf([820, 560, 420, 500]));
        const bw = Math.max(64, b.width), bh = Math.max(64, b.height);
        beingsHit.value.style.translate = `${(b.left + b.width / 2 - bw / 2).toFixed(1)}px ${(b.top + b.height / 2 - bh / 2).toFixed(1)}px`;
        beingsHit.value.style.width = `${bw.toFixed(1)}px`;
        beingsHit.value.style.height = `${bh.toFixed(1)}px`;
    };

    // A touch anywhere strums the card's chord and the stars and the motes flare; on the beings, they react
    const strum = () => {
        if (pressAt >= 0) return;
        play('star');
        dust?.boost(0, 0.8);
        dust?.boost(1, 0.8);
        dust?.boost(2, 1);
        rock = 1;
    };
    const greet = () => {
        hop = 1;
        peep = 1;
        blinkAt.big = lastT;
        dust?.boost(2, 0.6);
    };
    // With the keyboard the key is the finger: held down the path is lit, let go it rests
    const onKeyDown = (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        if (event.repeat) return;
        play('tap');
        greet();
        hold();
    };
    const onKeyUp = (event) => {
        if (event.key === 'Enter' || event.key === ' ') letGo();
    };

    const enter = () => {
        if (entered || !props.active || !stage) return;
        entered = true;
        stage.ready().then(() => { if (!gone) { stage.start(); dust?.reveal(); } });
    };

    let frames = 0;
    const frame = ({ x, y, scroll, t, ramp }) => {
        if (!stage || !L.boat) return;
        const dt = Math.min(0.1, Math.max(0, t - lastT));
        lastT = t;
        const m = reduced ? 0 : ramp;
        stage.look(x * SLIDE, y * SLIDE_Y);

        // ---- The game: the path lit from the rulito's stroke
        lit = rooting.step(dt, t);
        const held = rooting.held;
        rulitoGlow = Math.max(0, rulitoGlow - dt * 0.6);
        const top = (p) => L.stemLit.toScreen(sx(pathAt(p).x), sy(pathAt(p).y)).y;
        const on = lit.head - lit.tail > 0.001;
        const soft = Math.max(12, 70 * k());
        const clip = on ? { left: -4000, top: top(lit.head), w: 12000, h: Math.max(0, (lit.tail <= 0.001 ? screenH + 400 : top(lit.tail)) - top(lit.head)), soft } : { left: 0, top: 0, w: 0, h: 0 };
        L.stemLit.clip = clip;
        L.runesLit.clip = clip;
        L.stemLit.opacity = on ? 1 : 0;
        L.runesLit.opacity = on ? 0.9 + 0.1 * Math.sin(t * 3) : 0;
        const fp = pathAt(lit.head);
        const fw = fp.half * 2.4 * k(), fh = fw * 0.5;
        L.front.place({ left: sx(fp.x) - fw / 2, top: sy(fp.y) - fh / 2, w: fw, h: fh });
        L.front.opacity = on && !lit.full ? (held ? 0.9 : 0.5) + 0.1 * Math.sin(t * 6) : 0;
        if (held && on && !lit.full && !reduced && Math.random() < dt * 14) {
            const at = L.stemLit.toScreen(sx(fp.x + (Math.random() - 0.5) * fp.half * 1.4), sy(fp.y));
            sparks.burst(at.x, at.y, { n: 1, colors: [0xffe2a0, YELLOW, WARM], speed: 30, life: 1.3, size: 3.6, spread: 4 });
        }
        if (rulito.value) {
            rulito.value.frame({ head: lit.head, tail: lit.tail, flare: lit.flare, t, fade: Math.min(1, (lit.head - lit.tail) * 14), width: glyph.w });
            L.rulito.refresh();
        }
        L.rulito.rotate = 18 + Math.sin(t * 1.6) * 3 * m;
        L.rulito.scale = 1 + 0.2 * lit.pop * lit.pop;
        stageEl?.style.setProperty('--name-glow', lit.named.toFixed(3));
        stage.bloom = Math.max(lit.named, held ? 0.35 : 0);
        // The hint: left alone, the foot of the path glimmers and the big one's light breathes
        idleHint = held ? 0 : idleHint + dt;
        if (idleHint > HINT && !lit.full && !reduced && ramp >= 1) {
            idleHint = 0;
            hint = 1;
            const at = L.stemLit.toScreen(sx(pathAt(0.06).x), Math.min(screenH - 30, sy(pathAt(0.06).y)));
            sparks.burst(at.x, at.y, { n: 10, colors: [0xffe2a0, YELLOW], speed: 40, life: 1.4, size: 3.5, spread: 60 * k() });
        }
        hint = Math.max(0, hint - dt * 0.8);

        // ---- The warm light behind the horizon breathes (and flares as the light reaches it)
        const breath = Math.sin(t * 0.5);
        const reached = lit.full ? Math.min(1, (lit.head - lit.tail) * 1.4) : 0.4 * lit.head;
        L.horizon.opacity = 0.75 + 0.25 * breath * m + 0.6 * reached + 0.4 * rulitoGlow;
        L.horizon.scale = 1 + 0.05 * breath * m + 0.25 * reached;
        L.domeNode.y = scroll * 8;
        L.waterNode.y = scroll * 4;

        // ---- The boat floats: it bobs and rocks (more for a while after a touch)
        hop = Math.max(0, hop - dt * 1.6);
        peep = Math.max(0, peep - dt * 0.7);
        rock = Math.max(0, rock - dt * 0.5);
        steady += ((held ? 1 : 0) - steady) * Math.min(1, dt * 2);
        L.boat.y = (Math.sin(t * 0.7) * 10 * k() * (1 - 0.6 * steady) - Math.sin(rock * Math.PI) * 6 * k()) * m;
        L.boat.rotate = (Math.sin(t * 0.45 + 0.6) * 1.1 * (1 - 0.7 * steady) + Math.sin(t * 3.2) * 1.6 * rock) * m;
        L.aura.opacity = 0.7 + 0.3 * Math.sin(t * 0.8) * m + 0.5 * hop + 1.6 * steady + 1.2 * hint + 1.5 * rulitoGlow;
        L.aura.scale = 1 + 0.1 * steady + 0.1 * hint;
        // The beings breathe from their feet; the big one hops when touched, the little one peeps up
        const hopUp = Math.sin(Math.min(1, (1 - hop) * 1.25) * Math.PI) * (hop > 0 ? 1 : 0);
        L.big.y = -hopUp * 26 * k();
        L.big.sy = 1 + (0.014 * Math.sin(t * 1.05)) * m + 0.04 * hopUp;
        L.big.sx = 1 - (0.006 * Math.sin(t * 1.05)) * m - 0.02 * hopUp;
        L.small.y = -Math.sin(Math.min(1, peep * 1.2) * Math.PI) * 16 * k();
        L.small.sy = 1 + 0.02 * Math.sin(t * 1.4 + 1) * m;
        L.small.sx = 1 - 0.008 * Math.sin(t * 1.4 + 1) * m;
        // They blink, and the big one's eyes look down the path now and then
        L.bigEyes.sy = 1 - 0.9 * (reduced ? 0 : blinkOf(t, 'big'));
        L.smallEyes.sy = 1 - 0.9 * (reduced ? 0 : blinkOf(t, 'small'));
        const look = Math.sin(t * 0.23) > 0.75 || held ? 1 : 0;
        L.lookX = (L.lookX ?? 0) + ((look ? -5 : 0) * k() - (L.lookX ?? 0)) * Math.min(1, dt * 4);
        L.lookY = (L.lookY ?? 0) + ((look ? 4 : 0) * k() - (L.lookY ?? 0)) * Math.min(1, dt * 4);
        L.bigEyes.x = L.lookX * m;
        L.bigEyes.y = L.lookY * m;
        L.glints.uniforms.uBright.value = 1.15 + 0.15 * Math.sin(t * 2.3) * m;
        L.boatNode.y = scroll * 16;

        // ---- The mushroom: the signs on the path glow in turn, slowly
        L.runes.uniforms.uBright.value = 1 + 0.18 * (0.5 + 0.5 * Math.sin(t * 0.8)) * m;
        L.bigBody.uniforms.uBright.value = 1 + 0.12 * steady + 0.2 * rulitoGlow;
        L.mushroomNode.y = scroll * 24;

        // The particles that belong to a layer follow it
        const domeDrift = stage.drift(L.domeNode.z), boatDrift = stage.drift(L.boatNode.z);
        dust?.shift(0, domeDrift.x, domeDrift.y + L.domeNode.y);
        dust?.shift(1, domeDrift.x, domeDrift.y + L.domeNode.y);
        dust?.shift(2, boatDrift.x, boatDrift.y + L.boatNode.y);
        stage.render(t);
        if (frames++ % 2 === 0) placeHits();
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
        stage.onResize((w, h) => place(w, h));
        const after = (node) => node.mesh.renderOrder + 0.5;
        const stars = (yellow) => [...art.stars, ...art.farStars].filter((s) => s[3] === yellow)
            .map(([x, y, r]) => [sx(x), sy(y), Math.max(1.2, 2 * r * k()), yellow ? YELLOW : TEAL]);
        dust = startStardust(null, {
            stage,
            manual: true,
            groups: [
                // 0, 1: the stars of the dome, teal and yellow (these twinkle more)
                { colors: [TEAL], look: 'hard', parallax: 0, drift: 0.6, jitter: 0, twinkle: 0.35, reach: 0, order: after(L.dome), points: () => stars(0) },
                { colors: [YELLOW], look: 'hard', parallax: 0, drift: 0.8, jitter: 0.2, twinkle: 0.7, reach: 0, bloom: true, order: after(L.dome) + 0.1, points: () => stars(1) },
                // 2: motes of warm light rising from the horizon into the night, stirred by a finger
                {
                    count: 46, colors: [WARM, 0xffe9c8, CAP.color, 0xe9edd8], look: 'soft', size: [2, 6], parallax: 0, drift: 8, twinkle: 0.6,
                    flow: [3, -14], reach: 90, push: 30, edgeFade: 0.2, opacity: 0.8, bloom: true, order: after(L.horizon),
                    spawn: (w, h) => [Math.random() * w, Math.random() * Math.min(h, sy(CAP.y))],
                },
                // 3: the sparks of the light on the path, in front of everything
                { ...sparks.group(), order: 1e6 },
            ],
        });
        if (reduced) dust.reveal();
        parallax = createParallax(root.value, frame);
        if (import.meta.env.DEV) root.value.__game = { rooting, get lit() { return lit; } };
        enter();
    };

    onMounted(begin);
    watch(() => props.active, enter);
    onBeforeUnmount(() => {
        gone = true;
        stageEl?.style.removeProperty('--name-glow');
        window.removeEventListener('pointerup', liftBeings);
        window.removeEventListener('pointercancel', liftBeings);
        parallax?.destroy();
        dust?.destroy();
        stage?.destroy();
    });
</script>

<template>
    <div class="scene" ref="root" :style="{ background: `#${art.ground.toString(16).padStart(6, '0')}` }" @click="strum">
        <canvas class="stageCanvas" ref="canvas"></canvas>
        <div ref="beingsHit" class="hit" role="button" tabindex="0"
            :aria-label="$i18n.locale === 'en' ? 'The two beings in the boat: hold them to light the path' : 'Los dos seres en el bote: mantenelos para iluminar el camino'"
            @pointerdown="pressBeings" @click.stop @keydown="onKeyDown" @keyup="onKeyUp"></div>
        <!-- The rulito is drawn on its own canvas, which the stage shows as a texture in the sky -->
        <Rulito ref="rulito" class="offstage" color="#ffe22e" />
    </div>
</template>

<style scoped>
    .scene {
        position: absolute;
        inset: 0;
        overflow: hidden;
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
        border-radius: 40%;
        cursor: pointer;
        pointer-events: auto;
        touch-action: none;                    /* held, a finger drifts a little: the phone must not take it for a scroll */
        -webkit-tap-highlight-color: transparent;
        outline: none;
    }

    .offstage {
        position: absolute;
        left: -9999px;
        top: 0;
        width: 40px;
        visibility: hidden;
        pointer-events: none;
    }

    .hit:focus-visible {
        outline: 2px solid rgba(255, 255, 255, 0.85);
        outline-offset: 2px;
    }
</style>
