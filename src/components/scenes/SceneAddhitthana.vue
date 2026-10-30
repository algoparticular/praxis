<script setup>
    // Addhitthana: determination, "I am determined in nurturing habits that add to my happiness and plenitude". Particular
    // rows a boat through a storm at night, his aura lit, under a moon that the dark is eating; clouds all round.
    // Its verb is Arraigar (to hold until something grows). The wind carries the boat off the middle; the little light
    // beside it is the middle, the one thing the wind does not move (the purpose: "your evolution and purpose"). Holding
    // Particular (finger, click or key), he rows: the boat goes back under the light and steadies, the storm cannot rock
    // it, and while it stays there, steady, the rulito is drawn over his head. Whole, it sounds the card's chord an octave
    // up, the name lights up, the little light rises to the moon and the storm stops: the rain and the wind go, the
    // clouds open a little and the full moon is left (`calm`, 0 the storm .. 1 the storm over). Let go, the tail of the
    // rulito catches up with its head, as in Paciencia (no hold is wasted; held again it comes back); once whole it stays
    // a while, then goes, the light comes down to the boat and the storm comes back slowly. Left alone, the light calls
    // him now and then (the hint, with no words).
    // It is drawn in WebGL (useLayerStage): the moon, every cloud (a picture each, so the wind moves each one), the boat
    // and what it carries are planes; the storm is drawn in code (`rain` in useLayerStage: the wavy lines of the wind
    // on the sky, rain behind the boat and rain in front of everything, and the lightning); the stipple round the moon,
    // the aura and the little light are particles (useStardust), from addhitthanaScene.json (made by
    // scripts/convert-addhitthana.mjs). The clouds that touch a side or the top of the card are mirrored past it, for wide screens and the sky over it on a phone.
    import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { createParallax } from '../../composables/useParallax.js';
    import { createLayerStage } from '../../composables/useLayerStage.js';
    import { startStardust } from '../../composables/useStardust.js';
    import { play } from '../../composables/useSound.js';
    import { sceneMilestone } from '../../analytics.js';
    import Rulito from '../Rulito.vue';
    import art from '../../composables/addhitthanaScene.json';

    const props = defineProps({
        card: { type: Object, default: () => ({}) },
        active: Boolean
    });

    const root = ref(null);
    const canvas = ref(null);
    const sidHit = ref(null);
    const rulito = ref(null);
    let stageEl = null;
    let stage = null;
    let parallax = null;
    let dust = null;
    let entered = false;
    let gone = false;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const A = (name) => `/assets/addhitthana/${name}.webp`;

    // ---- Layout: the illustration is a 2160 square, a frame resting on the bottom of the screen; on a phone upright as
    // big as the boat allows (it fits the width), and the sky over it (the moon and the high clouds) lifted towards the
    // top of the screen, so the storm fills it
    const SIZE = art.size;
    const SPAN = 1880;                      // art px the boat needs across: its scrolls, and room for the wind to move it
    let F = { x: 0, y: 0, size: 1 };
    let lift = 0;
    const k = () => F.size / SIZE;
    const sx = (x) => F.x + x * k();
    const sy = (y) => F.y + y * k();
    const rectOf = ([left, top, w, h]) => ({ left: sx(left), top: sy(top), w: w * k(), h: h * k() });
    const layout = (w, h) => {
        const phone = w < h;
        const size = phone ? Math.min(0.8 * h, w * SIZE / SPAN) : Math.min(Math.max(w, 0.55 * h), 0.85 * h);
        F = { x: w / 2 - size / 2, y: h - size, size };
        lift = phone ? Math.max(0, F.y * 0.55) : 0;
    };

    // The camera slides SLIDE px at the edge of a swipe; each layer moves as far as its depth (px)
    const SLIDE = 50;
    const SLIDE_Y = 30;
    const zFor = (amp) => amp / (SLIDE + amp);
    const DEPTH = { lines: 4, moon: 7, sky: 11, mid: 17, rain: 20, boat: 24, front: 34, rainFront: 40 };

    const NAVY = '#002a42';                 // the dark clouds, the card's colour
    const SKY = '#09415f';                  // the sky between them

    // ---- The clouds, in the order the card stacks them, in three planes: the high ones round the moon, the ones in the
    // middle (behind the boat) and the ones in front, low. The wind pushes each one; the far ones less
    const PLANE = { 7: 'sky', 8: 'sky', 14: 'mid', 17: 'mid', 5: 'mid', 6: 'mid', 12: 'front', 16: 'front', 4: 'front', 21: 'front', 22: 'front' };
    const clouds = art.clouds.map((n) => {
        const name = `c${n}`;
        const [x, y, w, h] = art.boxes[name];
        return { name, plane: PLANE[n] ?? 'sky', box: art.boxes[name], cx: x + w / 2, cy: y + h / 2, sides: art.sides[name] ?? '',
            phase: Math.random() * 6.28, sway: 0.6 + Math.random() * 0.8, nodes: [] };
    });
    const PUSH = { sky: 0.5, mid: 0.8, front: 1.2 };

    // ---- The storm. The wind blows to the left and comes in gusts; `calm` puts the storm out
    let calm = 0;
    let wind = 0.6;
    let fall = 0, flowX = 0, flowY = 0;
    let flash = 0, flashAt = 6 + Math.random() * 6;
    const hash = (n) => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); };
    const noise1 = (x) => {
        const i = Math.floor(x), f = x - i;
        const u = f * f * (3 - 2 * f);
        return hash(i) * (1 - u) + hash(i + 1) * u;
    };
    // 0.2 .. 1.4: a slow swell with gusts on top
    const windAt = (t) => 0.35 + 0.45 * noise1(t * 0.12) + 0.6 * Math.max(0, noise1(t * 0.45 + 31) - 0.45) / 0.55;

    // ---- The boat: the wind carries it off the middle and back (a spring), it rocks and bobs
    const boat = { x: 0, v: 0 };
    let reach = 1;                          // px the boat may go off the middle each way (place())
    let row = 0;                            // 0..1, he rows (eased)
    const ease = (p) => p * p * (3 - 2 * p);

    const L = {};
    // Mirrored about the side (or the top) of the card it touches, a few px into it so no seam shows between the two
    const mirrorOf = ([x, y, w, h], side) => (side === 't' ? [x, -y - h + 6, w, h] : [side === 'l' ? -x - w + 6 : 2 * SIZE - x - w - 6, y, w, h]);

    const build = (s) => {
        // The wind's lines on the sky, behind everything
        L.lines = s.depth(zFor(DEPTH.lines)).rain({ lines: 0x06344f });
        L.lines.uniforms.uRain.value = 0;
        // The moon, its outline and the dark that eats it
        const moon = s.depth(zFor(DEPTH.moon));
        L.moonNode = moon;
        L.moonGlow = moon.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: 0xbff4f2, stops: [[0, 0.4], [0.32, 0.16], [0.62, 0]] });
        L.moon = moon.image(A('moon'));
        L.moonline = moon.image(A('moonline'));
        moon.enter({ y: 30, delay: 200, duration: 2200 });
        // The clouds, each plane its own depth; the ones that touch a side of the card with a mirrored copy past it
        const planes = {};
        const plane = (name) => {
            if (!planes[name]) planes[name] = s.depth(zFor(DEPTH[name]));
            return planes[name];
        };
        // The high ones and the middle ones before the rain behind the boat
        const cloudNodes = (cl) => {
            const node = plane(cl.plane);
            cl.nodes = [{ node: node.image(A(cl.name)), side: '' }];
            [...cl.sides].forEach((side) => {
                const copy = node.image(A(cl.name));
                if (side === 't') copy.sy = -1; else copy.sx = -1;
                cl.nodes.push({ node: copy, side });
            });
        };
        clouds.filter((cl) => cl.plane !== 'front').forEach(cloudNodes);
        L.sky = plane('sky');
        L.mid = plane('mid');
        L.sky.enter({ y: -30, delay: 150, duration: 2000 });
        L.mid.enter({ y: -20, delay: 250, duration: 1900 });
        L.rain = s.depth(zFor(DEPTH.rain)).rain({ color: 0x9cc3da });
        // The boat and what it carries rock together; the little light lives beside it on its own
        const boatNode = s.depth(zFor(DEPTH.boat));
        L.boatNode = boatNode;
        L.boat = boatNode.group();
        L.fern = L.boat.image(A('fern'), { wind: { amp: 8, speed: 1.7, root: 'bottom' } });
        // (not in the bloom: it would wash out his face when the stage blooms)
        L.auraGlow = L.boat.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: 0xffe14d, stops: [[0, 0.45], [0.35, 0.2], [0.7, 0]] });
        L.aura = L.boat.image(A('aura'));
        L.sid = L.boat.image(A('sid'));
        L.hull = L.boat.image(A('hull'));
        L.oar = L.boat.image(A('oar'));
        L.rulito = L.boat.canvas(rulito.value.canvas, { bloom: true });
        L.light = boatNode.group();
        L.lightGlow = L.light.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: 0xffe14d, stops: [[0, 0.5], [0.3, 0.2], [0.7, 0]], bloom: true });
        L.lightCore = L.light.image(A('light'), { bloom: true });
        boatNode.enter({ y: 60, delay: 350, duration: 1900 });
        // The low clouds in front, and the card's mark
        clouds.filter((cl) => cl.plane === 'front').forEach(cloudNodes);
        L.front = plane('front');
        L.mark = L.front.image(A('mark'));
        L.front.enter({ y: 50, delay: 100, duration: 1600 });
        // Rain in front of everything, sparser and bigger
        L.rainFront = s.depth(zFor(DEPTH.rainFront)).rain({ color: 0xb4d3e6 });
    };

    // The size of the storm's strokes: as the card's on a big screen, never too thin on a phone
    const strokes = () => Math.min(1.3, Math.max(0.55, F.size / 1000));

    const place = (w, h) => {
        layout(w, h);
        const B = art.boxes;
        // The sky behind, from the card: the dark of the clouds at the top and bottom, the stormy blue between them
        const at = (y, up = 0) => `${Math.max(0, Math.min(100, (sy(y) - up) / h * 100)).toFixed(1)}%`;
        root.value.style.background = `linear-gradient(to bottom, ${NAVY} 0%, ${NAVY} ${at(260, lift)}, ${SKY} ${at(560, lift)}, ${SKY} ${at(1900)}, ${NAVY} ${at(2060)}, ${NAVY} 100%)`;

        const all = { left: -120, top: -120, w: w + 240, h: h + 240 };
        const st = strokes();
        L.lines.place(all);
        L.lines.uniforms.uScale.value = Math.max(0.7, F.size / 900);
        L.rain.place(all);
        L.rain.uniforms.uStreak.value.set(9 * st, 55 * st, 200 * st, 1.1);
        L.rainFront.place(all);
        L.rainFront.uniforms.uStreak.value.set(26 * st, 120 * st, 560 * st, 1.7);

        const moon = rectOf(B.moon);
        L.moon.place(moon);
        L.moonline.place(rectOf(B.moonline));
        const md = moon.w * 1.9;
        L.moonGlow.place({ left: moon.left + moon.w / 2 - md / 2, top: moon.top + moon.h / 2 - md / 2, w: md, h: md });

        clouds.forEach((cl) => cl.nodes.forEach(({ node, side }) => node.place(rectOf(side ? mirrorOf(cl.box, side) : cl.box))));
        L.mark.place(rectOf(B.mark));

        const hull = rectOf(B.hull);
        // How far the wind may carry the boat: never past the edges of the screen (its scrolls included, and room for it
        // to rock), so it can always be reached and rescued; on a narrow screen at least a little
        reach = Math.max(0.03 * w, Math.min(hull.left, w - hull.left - hull.w) - 0.03 * hull.w);
        L.boat.pivot = { x: hull.left + hull.w * 0.5, y: hull.top + hull.h * 0.8 };
        L.fern.place(rectOf(B.fern));
        const aura = rectOf(B.aura);
        L.aura.place(aura);
        const ad = Math.max(aura.w, aura.h) * 1.5;
        L.auraGlow.place({ left: aura.left + aura.w / 2 - ad / 2, top: aura.top + aura.h * 0.45 - ad / 2, w: ad, h: ad });
        L.sid.place(rectOf(B.sid));
        L.hull.place(hull);
        // The oar turns about where his hand holds it
        const oar = rectOf(B.oar);
        L.oar.place(oar, { x: oar.left + oar.w * 0.68, y: oar.top + oar.h * 0.2 });
        const light = rectOf(B.light);
        L.lightCore.place(light);
        const ld = light.w * 3.2;
        L.lightGlow.place({ left: light.left + light.w / 2 - ld / 2, top: light.top + light.h / 2 - ld / 2, w: ld, h: ld });
        L.light.pivot = { x: light.left + light.w / 2, y: light.top + light.h / 2 };
        // The rulito where the card draws it, over his head (its canvas is bigger than the glyph, for the glow)
        const r = rectOf(art.rulito);
        const rh = r.h, rw = rh * 32 / 86;
        glyph = { left: r.left + r.w / 2 - rw / 2, top: r.top, w: rw, h: rh };
        L.rulito.place({ left: glyph.left - 0.4375 * glyph.w, top: glyph.top - 0.1628 * glyph.h, w: glyph.w * 1.875, h: glyph.h * 1.3256 },
            { x: glyph.left + glyph.w / 2, y: glyph.top + glyph.h });
    };

    // Particular, for the finger: held, he rows
    const placeHits = () => {
        if (!sidHit.value || !L.boat) return;
        const b = L.boat.boxOnScreen(rectOf(art.boxes.aura));
        sidHit.value.style.translate = `${b.left.toFixed(1)}px ${b.top.toFixed(1)}px`;
        sidHit.value.style.width = `${Math.max(48, b.width).toFixed(1)}px`;
        sidHit.value.style.height = `${Math.max(48, b.height).toFixed(1)}px`;
    };
    // ---- The game
    const HOLD = 4.2;                       // s of holding the boat steady under the light for the rulito to be whole
    const NEAR = 0.035;                     // how far from the light (a fraction of the card) the boat is under it
    const STILL = 0.08;                     // and how fast it may still move (the card's size per second)
    const LINGER = 9;                       // s the storm stays over with the rulito whole, before its tail goes
    const EAT = 3.4;                        // s for the tail to go all the way along it
    const RISE = 2.6;                       // s the little light takes to rise to the moon
    const HINT = 7;                         // s alone before the light calls him
    let held = false;
    let shine = 0;                          // his aura lit by a touch
    let steady = 0;                         // 0..1, the boat under the light and still, eased
    let grown = 0;                          // 0..1, how long it has been held steady, on its way to HOLD
    let head = 0;                           // how far along its stroke the front of the rulito is (0..1)
    let tail = 0;                           // and the back of it
    let idle = 0;                           // s since he was let go
    let full = false;
    let pop = 0;
    let wins = 0;
    let rise = 0;                           // 0..1, the little light on its way to the moon
    let hint = 0, hintAt = 0;
    let lastTouch = 0;
    let glyph = { left: 0, top: 0, w: 1, h: 1 };
    const hold = () => {
        if (held) return;
        held = true;
        lastTouch = lastT;
        shine = 1;
        dust?.boost(1, 0.6);
        play('tap');
        window.addEventListener('pointerup', release);
        window.addEventListener('pointercancel', release);
    };
    const release = () => {
        held = false;
        lastTouch = lastT;
        window.removeEventListener('pointerup', release);
        window.removeEventListener('pointercancel', release);
    };
    // With the keyboard the key is the finger: held down he rows, let go he rests
    const onKeyDown = (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        if (!event.repeat) hold();
    };
    const onKeyUp = (event) => {
        if (event.key === 'Enter' || event.key === ' ') release();
    };
    // Whole: the card's chord climbs an octave (E major, Kätus's: the will), the light goes up to the moon and the
    // storm stops
    const complete = () => {
        full = true;
        pop = 1;
        wins += 1;
        play('rulito');
        play('converge');
        dust?.boost(1, 1);
        dust?.boost(2, 1);
        sceneMilestone('storm_calmed', { times: wins });
    };

    const enter = () => {
        if (entered || !props.active || !stage) return;
        entered = true;
        stage.ready().then(() => { if (!gone) { stage.start(); dust?.reveal(); } });
    };

    let lastT = 0;
    let frames = 0;
    const frame = ({ x, y, scroll, t, ramp }) => {
        if (!stage || !L.boat) return;
        const dt = Math.min(0.1, Math.max(0, t - lastT));
        lastT = t;
        stage.look(x * SLIDE, y * SLIDE_Y);
        const storm = 1 - calm;
        const kk = k();

        // ---- The wind: it slants the rain, carries the wind's lines and pushes the clouds and the boat
        wind = reduced ? 0.6 : windAt(t);
        const gust = (wind - 0.6) * storm;
        const st = strokes();
        fall += dt * (650 + 380 * wind) * st;
        flowX += dt * (25 + 70 * wind * storm) * st;
        flowY += dt * 6 * st;
        const slant = (0.16 + 0.3 * wind) * storm + 0.05;
        // A lightning now and then while the storm lasts: two quick flickers
        if (t > flashAt) {
            if (storm > 0.5 && !reduced) flash = 1;
            flashAt = t + 8 + Math.random() * 14;
        }
        flash = Math.max(0, flash - dt * 2.2);
        const light = flash * (0.7 + 0.3 * Math.sin(t * 60));
        const rains = [[L.rain, 0.24, 1], [L.rainFront, 0.32, 0.45]];
        rains.forEach(([node, opacity, amount]) => {
            const u = node.uniforms;
            u.uFall.value = fall * (node === L.rainFront ? 1.5 : 1);
            u.uSlant.value = slant;
            u.uRain.value = amount * storm * ramp;
            node.opacity = opacity;
        });
        const lu = L.lines.uniforms;
        lu.uFlow.value.set(flowX, flowY);
        lu.uHatch.value = 0.32 * (0.35 + 0.65 * storm);
        lu.uFlash.value = 0.16 * light;

        // ---- The clouds: pushed by the gusts (the near ones more) and swaying; with the calm they open a little round
        // the moon and the low ones sink
        const moonBox = art.boxes.moon;
        const mcx = moonBox[0] + moonBox[2] / 2, mcy = moonBox[1] + moonBox[3] / 2;
        clouds.forEach((cl) => {
            const push = PUSH[cl.plane];
            let dx = (-gust * 40 * push + Math.sin(t * 0.3 * cl.sway + cl.phase) * 10 * push * storm) * kk * 2.2;
            let dy = Math.sin(t * 0.4 * cl.sway + cl.phase) * 4 * kk * 2;
            if (calm > 0) {
                if (cl.plane === 'front') dy += 120 * calm * kk;
                else {
                    const ox = cl.cx - mcx, oy = cl.cy - mcy, d = Math.hypot(ox, oy) || 1;
                    const open = 260 * calm * Math.max(0.3, 1 - d / 1800);
                    dx += ox / d * open * kk;
                    dy += oy / d * open * 0.5 * kk;
                }
            }
            // (a mirrored copy moves as its cloud does, so the two never part at the edge of the card)
            cl.nodes.forEach(({ node }) => {
                node.x = dx;
                node.y = dy;
                node.uniforms.uBright.value = 1 + 0.35 * light;
            });
        });
        L.sky.y = -lift + scroll * 10;
        L.mid.y = -lift * 0.4 + scroll * 16;
        L.front.y = scroll * 34;

        // ---- The moon: the dark that eats it goes with the calm (the full moon will be its own picture)
        L.moonNode.y = -lift + Math.sin(t * 0.2) * 3 * ramp + scroll * 8;
        L.moonline.opacity = 1 - 0.85 * calm;
        L.moonGlow.opacity = 0.35 + 0.08 * Math.sin(t * 0.5) + 0.45 * calm + 0.3 * light;
        L.moon.uniforms.uBright.value = 1 + 0.12 * calm + 0.2 * light + 0.1 * rise;
        dust?.fade(0, 1 - calm);

        // ---- The boat: the wind carries it off the middle and the spring brings it back; it rocks with the waves of
        // the wind and leans with its speed, and bobs. Held, he rows: the boat goes back under the light, firmly, and
        // the storm hardly rocks it
        const rowing = held && !reduced;
        const span = 0.09 * F.size;
        const drifting = (-gust * 1.6 + Math.sin(t * 0.21) * 0.45 + Math.sin(t * 0.13 + 2) * 0.25) * span * storm * ramp;
        // (eased into the reach: the stronger the gust, the closer to the edge, never past it)
        const goal = rowing ? 0 : 0.85 * reach * Math.tanh(drifting / (0.85 * reach));
        const [pull, damp] = rowing ? [4.5, 3.6] : [1.4, 1.1];
        boat.v += ((goal - boat.x) * pull - boat.v * damp) * dt;
        boat.x += boat.v * dt;
        if (Math.abs(boat.x) > reach) { boat.x = Math.sign(boat.x) * reach; boat.v = 0; }
        const firm = 1 - 0.75 * steady;
        const rock = (Math.sin(t * 0.9) * 2.4 + Math.sin(t * 1.63 + 1) * 1.1) * (0.25 + 0.75 * storm * Math.min(1.2, wind)) * firm;
        L.boat.x = boat.x;
        L.boat.y = (Math.sin(t * 1.1) * 7 + Math.sin(t * 0.47) * 4) * kk * 2.2 * (0.4 + 0.6 * storm) * firm * ramp;
        L.boat.rotate = (rock - boat.v / Math.max(1, F.size) * 40) * ramp;
        L.boatNode.y = scroll * 22;
        L.fern.uniforms.uWind.value.x = (6 + 26 * wind * storm) * kk * 2.2;
        // He rows while held: long strokes of the oar; at rest it only rocks
        row += ((rowing ? 1 : 0) - row) * Math.min(1, dt * 3);
        L.oar.rotate = (Math.sin(t * 0.8 + 0.6) * 2.2 * (1 - row) + Math.sin(t * 3.2) * 9 * row) * ramp;

        // ---- The game: under the light and still, held, the rulito is drawn; let go, its tail catches up with its head
        const near = Math.max(0, 1 - Math.abs(boat.x) / (NEAR * F.size)) * Math.max(0, 1 - Math.abs(boat.v) / (STILL * F.size));
        steady += ((rowing ? near : 0) - steady) * Math.min(1, dt * 4);
        pop = Math.max(0, pop - dt * 2.2);
        if (rowing) {
            idle = 0;
            if (steady > 0.5) {
                const before = grown;
                grown = Math.min(1, grown + dt / HOLD * steady);
                head = Math.max(head, 1 - (1 - grown) ** 1.6);
                // A note of the chord for each quarter of the way, climbing
                [0.25, 0.5, 0.75].forEach((q, i) => { if (before < q && grown >= q) play('kindle', { step: i / 3 }); });
            }
            tail = Math.max(0, tail - dt / 0.8);
        } else if (head > 0) {
            idle += dt;
            if (idle > (full ? LINGER : 0.3)) tail = Math.min(head, tail + dt / EAT);
        }
        if (head >= 1 && !full) complete();
        if (head > 0 && head - tail < 0.0005) {
            head = 0; tail = 0; grown = 0; full = false;
            rulito.value?.reshape();
            play('release');
        }
        const flare = full && head - tail > 0.9 ? Math.max(pop, Math.sin(t * 4) * 0.5 + 0.5) : 0;
        if (rulito.value) {
            rulito.value.frame({ head, tail, flare, t, fade: Math.min(1, (head - tail) * 14), width: glyph.w });
            L.rulito.refresh();
        }
        L.rulito.rotate = Math.sin(t * 1.8) * 3 * ramp;
        L.rulito.scale = 1 + 0.2 * pop * pop;
        const whole = Math.min(1, Math.max(0, (head - tail - 0.6) / 0.4));
        const named = Math.max(pop, 0.8 * whole * whole * (3 - 2 * whole));
        stageEl?.style.setProperty('--name-glow', named.toFixed(3));
        stage.bloom = named;
        // The storm: it softens while the rulito grows, stops once it is whole and comes back slowly when it goes
        const calmGoal = full ? Math.min(1, (head - tail) * 1.5) : 0.3 * (head - tail);
        calm += (calmGoal - calm) * Math.min(1, dt * (calmGoal > calm ? 0.7 : 0.18));
        rise = full && head - tail > 0.5 ? Math.min(1, rise + dt / RISE) : Math.max(0, rise - dt / 3);
        // The hint: left alone, the light calls him now and then (a pulse of it, and his aura answers)
        if (!held && !full && !reduced && t - lastTouch > HINT && t - hintAt > HINT && ramp >= 1) { hintAt = t; hint = 1; dust?.boost(2, 0.8); }
        hint = Math.max(0, hint - dt * 0.9);

        // His aura breathes, and shines when he is touched, while he rows and under the light
        shine = Math.max(0, shine - dt * 1.2);
        const breath = Math.sin(t * 0.9);
        const lit = Math.max(shine, 0.6 * row, steady, hint * 0.7);
        L.aura.scale = 1 + 0.015 * breath + 0.06 * lit;
        L.aura.uniforms.uBright.value = 1 + 0.06 * breath + 0.25 * lit;
        L.auraGlow.opacity = 0.45 + 0.1 * breath + 0.3 * lit + 0.2 * calm;
        L.auraGlow.scale = 1 + 0.12 * steady;
        L.sid.uniforms.uBright.value = 1 + 0.15 * light;
        L.hull.uniforms.uBright.value = 1 + 0.15 * light;
        // The little light is alive: it hovers in its place, the middle (the wind does not move it), flickering and
        // breathing; it shines more as the boat comes under it, calls him when he is alone, and once the rulito is whole
        // it rises to the moon and comes down again when the storm comes back
        const wx = noise1(t * 0.35 + 11) - 0.5 + 0.5 * (noise1(t * 1.1 + 5) - 0.5);
        const wy = noise1(t * 0.3 + 23) - 0.5 + 0.5 * (noise1(t * 1.3 + 9) - 0.5);
        const lb = rectOf(art.boxes.light), mb = rectOf(art.boxes.moon);
        const to = { x: mb.left + mb.w / 2 - (lb.left + lb.w / 2), y: mb.top + mb.h / 2 + L.moonNode.y - (lb.top + lb.h / 2) - L.boatNode.y };
        const up = ease(rise);
        const hover = 1 - 0.6 * steady;
        L.light.x = (wx * 70 * kk * hover) * (1 - up) + to.x * up;
        L.light.y = (wy * 60 * kk * hover + Math.sin(t * 1.4) * 6 * kk) * (1 - up) + to.y * up;
        const flicker = 0.75 + 0.25 * noise1(t * 7 + 3);
        const pulse = 0.5 + 0.5 * Math.sin(t * 2.1);
        L.light.scale = (0.92 + 0.12 * pulse + 0.25 * steady + 0.35 * hint) * (1 - 0.45 * up);
        L.light.opacity = 1 - 0.75 * up;
        dust?.fade(2, 1 - 0.75 * up);
        L.lightCore.uniforms.uBright.value = 0.9 + 0.3 * flicker + 0.3 * steady;
        L.lightGlow.opacity = Math.min(1, (0.45 + 0.35 * pulse) * flicker + 0.4 * steady + 0.5 * hint);
        L.lightGlow.scale = 1 + 0.15 * pulse + 0.5 * steady + 0.6 * hint;

        // The particles that belong to a layer follow it
        const moonDrift = stage.drift(L.moonNode.z), boatDrift = stage.drift(L.boatNode.z);
        dust?.shift(0, moonDrift.x, moonDrift.y + L.moonNode.y);
        dust?.turn(1, L.boat.rotate, L.boat.pivot.x, L.boat.pivot.y);
        dust?.shift(1, boatDrift.x + L.boat.x, boatDrift.y + L.boat.y + L.boatNode.y);
        dust?.shift(2, boatDrift.x + L.light.x, boatDrift.y + L.light.y + L.boatNode.y);
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
        // [x, y, radius, colour] in art px to the screen; the colours are an index into art.colors
        const fromArt = (list) => list.map(([x, y, r, c]) => [sx(x), sy(y), Math.max(1.2, 2 * r * k()), art.colors[c]]);
        dust = startStardust(null, {
            stage,
            manual: true,
            groups: [
                // 0: the dark stipple that eats the moon
                { colors: [0x003040], parallax: 0, drift: 1.4, jitter: 0.2, twinkle: 0.15, reach: 0, order: after(L.moonline), points: () => fromArt(art.dots.moonline) },
                // 1: the loose dots of his aura
                { colors: [0xffe030], parallax: 0, drift: 2, jitter: 0.35, twinkle: 0.4, reach: 0, order: after(L.aura), points: () => fromArt(art.dots.aura) },
                // 2: the loose dots of the little light
                { colors: [0xffe030], parallax: 0, drift: 2.4, jitter: 0.4, twinkle: 0.5, reach: 0, bloom: true, order: after(L.lightCore), points: () => fromArt(art.dots.light) },
            ],
        });
        if (reduced) dust.reveal();
        parallax = createParallax(root.value, frame);
        enter();
    };

    onMounted(begin);
    watch(() => props.active, enter);
    onBeforeUnmount(() => {
        gone = true;
        parallax?.destroy();
        dust?.destroy();
        stage?.destroy();
        stageEl?.style.removeProperty('--name-glow');
        window.removeEventListener('pointerup', release);
        window.removeEventListener('pointercancel', release);
    });
</script>

<template>
    <div class="scene" ref="root">
        <canvas class="stageCanvas" ref="canvas"></canvas>
        <!-- The rulito is drawn on its own canvas, which the stage shows as a texture over his head -->
        <Rulito ref="rulito" class="offstage" color="#cb5d95" />
        <div ref="sidHit" class="hit" role="button" tabindex="0"
            :aria-label="$i18n.locale === 'en' ? 'Particular: hold him to row the boat under the light' : 'Particular: mantenelo para remar el bote bajo la luz'"
            @pointerdown.prevent="hold" @keydown="onKeyDown" @keyup="onKeyUp" @blur="release"></div>
    </div>
</template>

<style scoped>
    .scene {
        position: absolute;
        inset: 0;
        overflow: hidden;
        background: #09415f;
    }

    .stageCanvas {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        display: block;
        pointer-events: none;
    }

    .offstage {
        position: absolute;
        left: -9999px;
        top: 0;
        width: 40px;
        visibility: hidden;
    }

    .hit {
        position: absolute;
        left: 0;
        top: 0;
        width: 0;
        height: 0;
        border-radius: 45%;
        cursor: pointer;
        pointer-events: auto;
        -webkit-tap-highlight-color: transparent;
        touch-action: none;                    /* a finger holding him drifts a little: it must not turn into a scroll */
        outline: none;
    }

    .hit:focus-visible {
        outline: 2px solid rgba(255, 225, 77, 0.95);
        outline-offset: 4px;
    }
</style>
