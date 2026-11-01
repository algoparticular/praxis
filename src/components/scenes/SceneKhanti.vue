<script setup>
    // Khanti (patience): a network of glass flasks joined by pink tubes, a little creature living in each one, over a field
    // of blue dots. The layers come from the artwork (public/assets/khanti, each cropped to its box: khantiLayers.json
    // gives left, top, width, height in % of the 2160px square, the area and the main colour of each). The network, the
    // creatures in the flasks, the glass over them and the line of lavender thread float as one group, and each creature
    // has its own small life (breathing, floating, wiggling...).
    //  - The lavender thread is a single long brush stroke (khantiLine.json: a line traced from the artwork, with the
    //    thickness the brush had at each point) that winds between the pink tubes without crossing a bubble, going over
    //    one tube and under the next: it is drawn twice, once under the pink and once over it, and the copy over it only
    //    shows where the line crosses in front (a mask). Nothing of it stays still: several short strokes, each tapering
    //    at both ends, travel along the route at their own pace, one after another. It is only decoration.
    //  - Its verb is Fluir (accompany the current), with the engine shared by the cards of the verb (useFlow.js): the
    //    pink of the network starts still, as if stagnant (paler, with hardly any light of the water in it). A current of
    //    live pink is born in the central sign, where its head (a bright core) beats until someone comes, and goes along
    //    one route through the tubes (khantiFlow.json: x, y and half the width of the tube every few px, traced from the
    //    artwork, and where it enters and leaves each flask) passing through the nine flasks. A few beads of light run on
    //    ahead of it along the tube: the way it goes. Going with it is sliding a finger along the tube with it (or the
    //    mouse, or Enter held on it): it draws on to where the finger is, at its own pace, which is never even, widening,
    //    shining and sounding (`flow`); a still finger lets it slip just past and stop; alone it does not move, and a
    //    finger far ahead has lost it (it flickers and waits). Nothing is lost: it never goes back.
    //  - Each of the nine flasks has a cork (khantiFlasks.json: each flask's pink is its own picture) and is a knot: as
    //    the current comes to it accompanied, the cork pops by itself (it can also be pressed before): the old pink
    //    evaporates (the level sinks, the creature goes up and away with the vapour) and the tubes around it empty a
    //    stretch. When it is nearly empty the current comes in and fills it with live pink (empty of drawing, full of
    //    pink), and goes on. Left alone at a corked flask, the cork calls softly.
    //  - When the current has gone through the nine, the whole network is live, the rulito is born over the central
    //    sign and the card's name lights up; then everything goes still and corked again, and the creatures come back.
    //  - The blue dots of the sky and the lavender specks are particles; touching a creature makes it flash and throw
    //    sparks of its colour.
    // It is drawn in WebGL (useLayerStage): the network is a group of planes at one depth, the camera slides with the
    // pointer or the tilt; a band of light sweeps over the glass now and then, the pink inside the flasks has the light
    // of the liquid rippling in it and sinks in the shader. The thread is drawn on two canvases (under and over) shown
    // as textures. The touch targets are DOM elements in a square kept over the network.
    import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { createParallax } from '../../composables/useParallax.js';
    import { createLayerStage } from '../../composables/useLayerStage.js';
    import { startStardust } from '../../composables/useStardust.js';
    import { createSparks } from '../../composables/useSparks.js';
    import { createFlow } from '../../composables/useFlow.js';
    import { createGhostHand, gesture, HINT_AFTER } from '../../composables/useGhostHand.js';
    import { play } from '../../composables/useSound.js';
    import { sceneMilestone } from '../../analytics.js';
    import Rulito from '../Rulito.vue';
    import layers from '../../composables/khantiLayers.json';
    import flaskData from '../../composables/khantiFlasks.json';
    import LINE from '../../composables/khantiLine.json';
    import FLOW from '../../composables/khantiFlow.json';

    const props = defineProps({
        card: { type: Object, default: () => ({}) },
        active: Boolean
    });

    const root = ref(null);
    const canvas = ref(null);
    const overlay = ref(null);              // the square of the network, over the stage: the touch targets live in it
    const headHit = ref(null);              // where the current's head is: a finger put there goes with it
    const rulito = ref(null);
    let stageEl = null;                     // the card's stage, where the name is lit from (--name-glow)
    const catchers = {};                    // the creatures' touch targets, by layer number
    const setCatcher = (n) => (el) => { catchers[n] = el; };
    const N_ = {};                          // the layers (stage nodes), by layer number or flask id
    let stage = null;
    let hand = null;                        // the ghost hand, showing the gesture
    let net = null;                         // the network's group
    let parallax = null;
    let sky = null;
    let front = null;
    let entered = false;
    let gone = false;
    let last = null;
    let tick = 0;
    let F = { x: 0, y: 0, size: 1 };        // the square frame on screen at rest (px)

    // The camera slides SLIDE px at the edge of a swipe; the network moves 14px across and 7 up and down, as before
    const SLIDE = 50;
    const SLIDE_Y = 25;
    const NET_Z = 14 / (SLIDE + 14);

    const pct = (v) => `${v}%`;

    // The big drawings, from back to front, and the creatures and little things between them (the numbers are the
    // artwork's layers: 3 pink bodies, 33 the central sign, 34 glass reflections, 35 outlines, 36-44 the corks)
    const big = { body: 3, shine: 34, lines: 35 };
    const SIGN = 33;
    const CORKS = [36, 37, 38, 39, 40, 41, 42, 43, 44];
    const things = Object.keys(layers).map(Number).filter((n) => n !== 2 && !Object.values(big).includes(n)).sort((a, b) => a - b)
        .map((n) => ({ n, area: layers[n][4], color: layers[n][5] }));
    const under = things.filter((t) => t.n < big.shine);        // inside the flasks, under the glass
    const over = things.filter((t) => t.n > big.lines);         // on top of the outlines
    const hitBox = (n, min = 5, grow = 1) => {
        const [left, top, w, h] = layers[n];
        const size = Math.max(min, w, h) + grow;
        return { left: pct((left + w / 2 - size / 2).toFixed(3)), top: pct((top + h / 2 - size / 2).toFixed(3)), width: pct(size.toFixed(3)), height: pct(size.toFixed(3)) };
    };

    // The flasks with a cork: how empty each is (level 0 full .. 1 empty), how far its cork
    // has popped, and which creature lives in it. corked: a knot that stops the current; live: the current has filled it
    // (fresh: how live it looks, 0..1); drain: how far the tubes round an uncorked flask have emptied
    const FLASKS = flaskData.map((f) => ({ ...f, level: 0, pop: 0, life: 1, glow: 0, awake: false, corked: true, live: false, fresh: 0, drain: 0 }));
    const flaskOfCreature = {};
    const flaskOfCork = {};
    FLASKS.forEach((f) => { f.creatures.forEach((n) => { flaskOfCreature[n] = f; }); flaskOfCork[f.cork] = f; });
    // Each cork pops away from its flask, along the line from the flask's middle through the cork
    FLASKS.forEach((f) => {
        const [left, top, w, h] = layers[f.cork];
        const dx = left + w / 2 - f.cx, dy = top + h / 2 - f.cy, n = Math.hypot(dx, dy) || 1;
        f.away = { x: dx / n, y: dy / n };
        // near the left or right edge of the picture (the edge of a phone's screen) it pops up or down instead
        if (left + w / 2 > 88 || left + w / 2 < 12) f.away = { x: 0, y: f.away.y >= 0 ? 1 : -1 };
        f.corkAt = { x: left + w / 2, y: top + h / 2, size: Math.max(w, h) };
    });
    // A cork's hit covers the cork and the place it pops to, so it can be pressed again to fill the flask
    const corkHits = FLASKS.map((f) => {
        const size = Math.max(5.2, f.corkAt.size + 1.5) + 3.4;
        const x = f.corkAt.x + f.away.x * 1.7, y = f.corkAt.y + f.away.y * 1.7;
        return { flask: f, hit: { left: pct((x - size / 2).toFixed(3)), top: pct((y - size / 2).toFixed(3)), width: pct(size.toFixed(3)), height: pct(size.toFixed(3)) } };
    });
    const signHit = hitBox(SIGN, 8, 1);
    const touchable = things.filter((t) => t.area > 3500 && t.n !== SIGN && !CORKS.includes(t.n)).map((t) => ({ ...t, hit: hitBox(t.n) }));

    // Each creature's own small life, from its feet or its middle: [kind, origin, speed, amount]
    const LIFE = {
        29: ['breathe', '50% 100%', 0.8, 1],     // the one meditating
        30: ['float', '50% 20%', 0.6, 1],         // the jellyfish
        31: ['tilt', '50% 100%', 0.7, 1], 32: ['tilt', '50% 100%', 0.55, 1],
        28: ['wiggle', '50% 60%', 1.5, 1],        // the little larva
        33: ['pulse', '50% 50%', 0.7, 1],         // the central sign
        25: ['flicker', '50% 100%', 3.1, 1],      // the fire
        27: ['wave', '50% 60%', 0.9, 1],          // the water
        23: ['drift', '50% 50%', 0.35, 1],        // the cloud
        22: ['sway', '50% 100%', 0.6, 1], 26: ['sway', '50% 100%', 0.5, 1],
        11: ['spin', '50% 50%', 0.25, 1], 17: ['spin', '50% 50%', -0.2, 1],
    };
    const smooth = (v) => v * v * (3 - 2 * v);

    // ---- The thread: samples of x, y and half the thickness of the stroke, every few pixels of the 2160px square
    const N = LINE.pts.length / 3;
    const X = (i) => LINE.pts[3 * i];
    const Y = (i) => LINE.pts[3 * i + 1];
    const W = (i) => LINE.pts[3 * i + 2];
    // A ribbon along samples a..b: the line pushed out by its thickness (times widthAt) on both sides. Both ends are
    // rounded off with a half circle, so a stroke never ends in a flat cut
    const ribbon = (a, b, widthAt) => {
        const left = [], right = [];
        const at = (i) => [X(i), Y(i)];
        const f = (v) => v.toFixed(1);
        let first = null, last = null;
        for (let i = a; i <= b; i++) {
            const i0 = Math.max(0, i - 1), i1 = Math.min(N - 1, i + 1);
            const [x, y] = at(i), [xa, ya] = at(i0), [xb, yb] = at(i1);
            let tx = xb - xa, ty = yb - ya;
            const n = Math.hypot(tx, ty) || 1;
            tx /= n; ty /= n;
            const w = W(i) * widthAt(i);
            left.push(`${f(x - ty * w)} ${f(y + tx * w)}`);
            right.push(`${f(x + ty * w)} ${f(y - tx * w)}`);
            if (i === a) first = { x, y, tx, ty, w };
            last = { x, y, tx, ty, w };
        }
        const cap = (c, sign) => Array.from({ length: 5 }, (_, k) => {
            const th = Math.PI * (k + 1) / 6;
            return `${f(c.x - c.ty * c.w * Math.cos(th) + sign * c.tx * c.w * Math.sin(th))} ${f(c.y + c.tx * c.w * Math.cos(th) + sign * c.ty * c.w * Math.sin(th))}`;
        });
        return `M${left.join('L')}L${cap(last, 1).join('L')}L${right.reverse().join('L')}L${cap(first, -1).reverse().join('L')}Z`;
    };
    const FRONT_D = LINE.front.map(([a, b]) => `M${Array.from({ length: b - a + 1 }, (_, k) => `${X(a + k)} ${Y(a + k)}`).join('L')}`);
    const FRONT_PATHS = FRONT_D.map((d) => new Path2D(d));
    // The strokes: the route passes behind the pink at certain places (HIDE: the middle of each such stretch). A stroke
    // lives between two neighbouring ones: it comes out of the first (its tail still hidden there) growing along the
    // route, reaches the second and goes into it (its head hidden there), tail following, so it never begins or ends in
    // the open air. Then it rests, and takes the next stretch of the route. Each has its own pace.
    const HIDE = LINE.behind.map(([a, b]) => Math.round((a + b) / 2));
    // 14 strokes; every third one is long (it goes through two stretches of the route, between three hiding places)
    const STROKES = Array.from({ length: 14 }, (_, i) => {
        const hops = i % 3 === 0 ? 2 : 1;
        return {
            hops, at: Math.floor(i * (HIDE.length - 2) / 14), p: (i * 0.37) % 1.2, dur: (4.4 + (i % 4) * 1.1) * (hops === 2 ? 1.5 : 1), rest: 0.03 + (i % 3) * 0.05,
            tail: 0, head: 0,
        };
    });
    const ease = (v) => v * v * (3 - 2 * v);
    const clamp01 = (v) => Math.min(1, Math.max(0, v));
    const placeStroke = (k) => {
        const a = HIDE[k.at], b = HIDE[Math.min(k.at + k.hops, HIDE.length - 1)];
        k.head = a + (b - a) * ease(clamp01(k.p / 0.55));
        k.tail = a + (b - a) * ease(clamp01((k.p - 0.45) / 0.55));
    };
    STROKES.forEach(placeStroke);

    // The finger (or the mouse): where it is on the network's square (in the 2160 units), when it last moved, and
    // whether it is pressing
    const pointer = { u: 0, v: 0, at: -99, down: false, touch: false };
    let nowT = 0;
    const track = (event) => {
        const box = overlay.value?.getBoundingClientRect();
        if (!box || !box.width) return;
        pointer.u = (event.clientX - box.left) / box.width * 2160;
        pointer.v = (event.clientY - box.top) / box.height * 2160;
        pointer.touch = event.pointerType === 'touch';
        pointer.down = pointer.touch || event.buttons > 0;
        pointer.at = nowT;
    };
    const release = (event) => { track(event); pointer.down = false; };
    // The strokes of the thread travel along the route at their own pace (they are decoration: the finger is for the current)
    const moveStrokes = (dt) => {
        STROKES.forEach((k) => {
            k.p += dt / k.dur;
            if (k.p >= 1 + k.rest) { k.p = 0; k.at += k.hops; if (k.at + k.hops > HIDE.length - 1) k.at = 0; }
            placeStroke(k);
        });
    };
    // The stretch [from, to] (fractions of the stroke) of a stroke, narrowest at its two ends
    const strokeD = (k, from, to) => {
        const tail = Math.floor(k.tail), len = k.head - k.tail;
        if (len < 3) return '';
        const taper = (i) => 0.3 + 0.34 * Math.pow(Math.sin(Math.PI * clamp01((i - tail) / len)), 0.7);
        return ribbon(tail + Math.floor(from * len), tail + Math.floor(to * len), taper);
    };
    // Nested ribbons, so each stroke fades in and out along its length instead of ending abruptly
    const FADES = [[0, 1], [0.12, 0.88], [0.24, 0.76], [0.36, 0.64], [0.48, 0.52]];
    const strokesD = () => FADES.map(([from, to]) => STROKES.map((k) => strokeD(k, from, to)).join(''));

    // ---- The thread on two canvases (the square of the artwork): all of it under the pink, and over it only where it
    // crosses in front. Drawn at the frame's size (the stroke is soft: no need for the screen's full density).
    const threadUnder = document.createElement('canvas');
    const threadOver = document.createElement('canvas');
    const FADE_ALPHA = [0.7, 0.4, 0.4, 0.45, 0.5];
    const drawThread = () => {
        const px = Math.max(2, Math.round(F.size * Math.min(window.devicePixelRatio || 1, 1.5)));
        [threadUnder, threadOver].forEach((c) => { if (c.width !== px) { c.width = px; c.height = px; } });
        const k = px / 2160;
        const paths = strokesD().map((d) => (d ? new Path2D(d) : null));
        [threadUnder, threadOver].forEach((c, which) => {
            const ctx = c.getContext('2d');
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.globalCompositeOperation = 'source-over';
            ctx.clearRect(0, 0, px, px);
            ctx.setTransform(k, 0, 0, k, 0, 0);
            ctx.fillStyle = '#aeabd9';
            paths.forEach((path, i) => { if (path) { ctx.globalAlpha = FADE_ALPHA[i]; ctx.fill(path); } });
            ctx.globalAlpha = 1;
            if (which === 1) {
                // only where the line crosses in front of a tube or a flask
                ctx.globalCompositeOperation = 'destination-in';
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 80;
                ctx.lineCap = ctx.lineJoin = 'round';
                FRONT_PATHS.forEach((path) => ctx.stroke(path));
                ctx.globalCompositeOperation = 'source-over';
            }
        });
        N_.threadUnder?.refresh();
        N_.threadOver?.refresh();
    };

    // A box of the artwork ([left, top, w, h] in %), in px of the screen at rest
    const inFrame = ([left, top, w, h]) => ({ left: F.x + left / 100 * F.size, top: F.y + top / 100 * F.size, w: w / 100 * F.size, h: h / 100 * F.size });
    // Where a layer turns and scales about, from a CSS transform-origin ('50% 100%')
    const originOf = (box, origin) => {
        const [ox, oy] = origin.split(' ').map((v) => parseFloat(v) / 100);
        return { x: box.left + ox * box.w, y: box.top + oy * box.h };
    };
    const flashes = {};                     // when a creature was touched (it flashes)
    let signFlash = -9;

    const live = (t, ramp) => {
        things.forEach(({ n }) => {
            const node = N_[n];
            if (!node) return;
            const [kind = 'bob', , speed = 0.5 + (n % 5) * 0.12, amount = 1] = LIFE[n] ?? [];
            const p = t * speed + n * 1.3;
            let tx = 0, ty = 0, rot = 0, sx = 1, sy = 1;
            switch (kind) {
                case 'breathe': sy = 1 + Math.sin(p * 1.6) * 0.012; ty = Math.sin(p * 0.8) * 0.18; break;
                case 'float': ty = Math.sin(p * 1.1) * 0.45; rot = Math.sin(p * 0.7) * 3; sy = 1 + Math.sin(p * 1.1 + 1) * 0.02; break;
                case 'tilt': rot = Math.sin(p * 1.3) * 2.6; break;
                case 'wiggle': rot = Math.sin(p * 2.2) * 7; tx = Math.sin(p * 0.9) * 0.15; break;
                case 'pulse': sx = sy = 1 + Math.sin(p * 1.8) * 0.018; break;
                case 'flicker': sy = 1 + Math.sin(p * 3) * 0.035 + Math.sin(p * 5.3) * 0.02; sx = 1 - Math.sin(p * 3) * 0.015; rot = Math.sin(p * 2.1) * 2; break;
                case 'wave': rot = Math.sin(p * 1.5) * 4; ty = Math.sin(p * 1.5 + 1) * 0.12; break;
                case 'drift': tx = Math.sin(p) * 0.5; ty = Math.sin(p * 0.6) * 0.15; break;
                case 'sway': rot = Math.sin(p * 1.4) * 3.5; break;
                case 'spin': rot = (p * 40) % 360; break;
                default: ty = Math.sin(p * 1.4) * 0.22; tx = Math.cos(p * 0.9) * 0.12; rot = Math.sin(p * 1.1) * 3;
            }
            const k = ramp * amount;
            tx *= k; ty *= k; rot *= k; sx = 1 + (sx - 1) * k; sy = 1 + (sy - 1) * k;
            let bright = 1, saturate = 1, opacity = 1;
            // A creature whose flask is evaporating fades up and away; a popped cork jumps off its flask
            const home = flaskOfCreature[n];
            if (home) {
                const goneBy = 1 - smooth(home.life);
                ty -= goneBy * 1.6; sx *= 1 - goneBy * 0.14; sy *= 1 - goneBy * 0.14;
                opacity = 1 - goneBy;
                // lit by a stroke going by
                if (home.glow > 0.01) { bright += home.glow * 0.2; saturate += home.glow * 0.15; sx *= 1 + home.glow * 0.03; sy *= 1 + home.glow * 0.03; }
                // an empty flask's creature is not there to be touched, and must not catch the touch meant for the cork
                const catcher = catchers[n];
                if (catcher) catcher.style.pointerEvents = home.life < 0.6 ? 'none' : '';
            }
            const flask = flaskOfCork[n];
            if (flask) {
                tx += flask.away.x * flask.pop * 3.4; ty += flask.away.y * flask.pop * 3.4; rot += (flask.away.x >= 0 ? 1 : -1) * flask.pop * 34;
                // the cork of the flask the current is waiting at calls softly
                if (flow.waiting?.flask === flask) { const b = 0.5 + 0.5 * Math.sin(t * 4); bright += 0.35 * b; sx *= 1 + 0.08 * b; sy *= 1 + 0.08 * b; }
            }
            // Touched: a flash of brightness over 0.7s
            if (flashes[n] !== undefined) {
                const f = (t - flashes[n]) / 0.7;
                if (f >= 1) delete flashes[n];
                else { const b = Math.sin(Math.PI * Math.min(1, f * 2)) * (f < 0.5 ? 1 : 1 - (f - 0.5) * 2); bright += 0.5 * Math.max(0, b); saturate += 0.3 * Math.max(0, b); }
            }
            if (n === SIGN) {
                const f = (t - signFlash) / 0.9;
                if (f >= 0 && f < 1) { const b = Math.sin(Math.PI * f); bright += 0.6 * b; sx *= 1 + 0.16 * b; sy *= 1 + 0.16 * b; }
            }
            node.x = tx / 100 * F.size;
            node.y = ty / 100 * F.size;
            node.rotate = rot;
            node.sx = sx;
            node.sy = sy;
            node.opacity = opacity;
            node.uniforms.uBright.value = bright;
            node.uniforms.uSaturate.value = saturate;
        });
    };

    // The flasks: a corked one is full of still pink; uncorked, its pink evaporates (vapour rises from its surface) and
    // its creature goes up and away; filled by the current, it is full of live pink and empty of drawing
    const sparks = createSparks(640);
    const EMPTY_S = 1.1, FILL_S = 0.8;      // how long a flask takes to empty and to fill (the current waits for it)
    const stepFlasks = (dt) => {
        FLASKS.forEach((f) => {
            const target = f.corked || f.live ? 0 : 1;
            f.level = target > f.level ? Math.min(target, f.level + dt / EMPTY_S) : Math.max(target, f.level - dt / FILL_S);
            f.pop += ((f.corked ? 0 : 1) - f.pop) * Math.min(1, dt * 7);
            // The creature fades away early while the pink sinks, and only comes back when everything is corked again
            f.life = f.corked ? Math.min(1, f.life + dt / 1.4) : Math.max(0, f.life - dt / 1.1);
            f.fresh += ((f.live || win ? 1 : 0) - f.fresh) * Math.min(1, dt * (f.live ? 1.6 : 0.8));
            f.drain += ((f.corked ? 0 : 1) - f.drain) * Math.min(1, dt * 0.9);
            const node = N_[f.id];
            if (!node) return;
            node.uniforms.uSink.value.y = f.level;
            node.opacity = f.level >= 0.999 ? 0 : 1;
            node.uniforms.uSaturate.value = STILL.saturate + (1 - STILL.saturate) * f.fresh;
            node.uniforms.uBright.value = STILL.bright + (1 - STILL.bright) * f.fresh;
            node.uniforms.uWater.value = STILL.water + (1 - STILL.water) * f.fresh;
            // Vapour from the surface while it is emptying
            if (target > f.level && f.level < 0.98) {
                const box = node.boxOnScreen(inFrame(f.box));
                const n = Math.round(dt * 120 * (0.5 + f.level)) + (Math.random() < dt * 120 % 1 ? 1 : 0);
                for (let i = 0; i < n; i++) {
                    sparks.burst(box.left + box.width * (0.22 + Math.random() * 0.56), box.top + box.height * (0.05 + f.level * 0.9), {
                        n: 1, colors: [0xffffff, 0xffe3e8, 0xfbc4cf], speed: 16, life: 2.6, size: 4.6, spread: 4,
                    });
                }
            }
        });
    };
    const corkOnCanvas = (f) => {
        const node = N_[f.cork];
        if (!node) return [0, 0];
        const box = node.boxOnScreen(inFrame(layers[f.cork]));
        return [box.left + box.width / 2, box.top + box.height / 2];
    };
    const centreOn = (event) => {
        const box = event.currentTarget.getBoundingClientRect();
        const area = canvas.value.getBoundingClientRect();
        return [box.left + box.width / 2 - area.left, box.top + box.height / 2 - area.top];
    };
    // A cork: it pops and the flask lets its old pink go. Once popped it stays so until everything is corked again
    // It is let go by itself as the current comes to it accompanied, or pressed before
    const uncork = (f, event) => {
        if (!f.corked || win) return;
        f.corked = false;
        sceneMilestone('cork_popped');
        const [x, y] = event ? centreOn(event) : corkOnCanvas(f);
        sparks.burst(x, y, { n: 14, colors: [0xffc470, 0xffe3a8, 0xffffff], speed: 90, size: 4.4, spread: 5 });
        play('release');            // the cork pops and the flask evaporates
    };
    // The central sign, where the current is born: it flashes
    const touchSign = (event) => {
        const [x, y] = centreOn(event);
        sparks.burst(x, y, { n: 30, colors: [0xffffff, 0xcfeff0, 0xffd1dc], speed: 130, size: 5, spread: 10 });
        signFlash = last ?? 0;
        play('breath');
    };

    // ---- The current (Fluir). The route: x, y and half the tube's width every FLOW.step px of the 2160 square; the
    // stops are the central sign and the nine flasks in the order it goes through them (enter..exit: inside the flask)
    const FN = FLOW.pts.length / 3;
    const FX = (i) => FLOW.pts[3 * i];
    const FY = (i) => FLOW.pts[3 * i + 1];
    const FW = (i) => FLOW.pts[3 * i + 2];
    const STOPS = FLOW.stops.map((s) => ({ ...s, flask: FLASKS.find((f) => f.id === s.id) ?? null }));
    const inside = new Uint8Array(FN);      // samples inside a flask or the sign, where the current is not drawn
    STOPS.forEach((s) => { for (let i = s.enter; i <= s.exit; i++) inside[i] = 1; });
    const START = STOPS[0].exit;            // the current comes out of the central sign here
    const TOUCH_REACH = 240;                // how near the route a finger has to be to have the current (2160 units)
    const DRAIN = 16;                       // samples of tube that empty on each side of an uncorked flask
    const STILL = { saturate: 0.62, bright: 0.97, water: 0.25 };      // how the still pink looks
    // How the current looks (its engine, useFlow, says where it is): how much of it shows, and how lit it is at the end
    const cur = { alpha: 1, light: 0 };
    let keyHold = false;                    // Enter or space held on the current's head
    // The engine of Fluir: the finger slides with it; each corked flask is a knot that lets go as the current comes
    // accompanied (the cork pops by itself), and the current goes in once the old pink is nearly gone
    const flow = createFlow({
        x: FX, y: FY, n: FN, start: START, end: FN - 1,
        stops: STOPS.filter((s) => s.flask),
        touchReach: TOUCH_REACH,
        fill: FILL_S,
        isOpen: (s) => !s.flask.corked,
        release: (s) => uncork(s.flask),
        ready: (s) => s.flask.level > 0.75,
        onEnter: (s) => { s.flask.live = true; play('bloom'); },
        onEnd: () => finish(),
        onNote: (step, level) => play('flow', { step, level }),
        onFirst: () => sceneMilestone('current_accompanied'),
    });
    const stepFlow = (dt, t) => {
        if (win) return;
        flow.step(dt, t, pointer, { key: keyHold });
    };
    // A point of the route (2160 units of the square) on the stage canvas now, as the network floats
    const routeOnCanvas = (u, v) => {
        const p = net.toScreen(F.x + u / 2160 * F.size, F.y + v / 2160 * F.size);
        return [p.x, p.y];
    };
    // The hint, without words: left alone HINT_AFTER s (not while it is accompanied, nor while the rulito lives), the
    // ghost hand slides along the stretch of tube ahead of the head, at the current's pace. The call of the head (its
    // beat, from flow.idle) starts again too while the rulito lives, so after a win both wait from the start
    const HINT_LEN = 64;                    // samples of route the hand slides along (as far as the beads ahead go)
    const hintFlow = () => {
        if (win) flow.idle = 0;
        const wanted = !win && !flow.done && !keyHold && !pointer.down && flow.idle > 0.5 && cur.alpha > 0.9;
        if (!hand?.due(HINT_AFTER, wanted)) return;
        const path = flow.hintPath(HINT_LEN, routeOnCanvas);
        if (path) hand.play(gesture.slide(path, path.dur));
    };

    // Everything is live: the rulito is born over the central sign; then the current fades, and everything is corked again
    let win = null;
    let wins = 0;
    const DELAY = 0.6, GROW = 2.2, LINGER = 3, EAT = 3.4;
    let glyph = { left: 0, top: 0, w: 1, h: 1 };
    let netFresh = 0;                       // how live the pink of the whole network looks
    const finish = () => {
        if (win) return;
        wins += 1;
        win = { age: 0, head: 0, tail: 0, full: false, fullAt: 0, back: false, pop: 0 };
        rulito.value?.reshape();
        signFlash = last ?? 0;
        play('converge');
        sceneMilestone('current_flowed', { times: wins });
    };
    const corkAll = () => {
        FLASKS.forEach((f) => { f.corked = true; f.live = false; });
    };
    const stepWin = (dt, t) => {
        let named = 0;
        if (win && rulito.value) {
            win.age += dt;
            win.pop = Math.max(0, win.pop - dt * 2.2);
            win.head = 1 - (1 - Math.min(1, Math.max(0, (win.age - DELAY) / GROW))) ** 1.6;
            if (win.head >= 1 && !win.full) { win.full = true; win.fullAt = win.age; win.pop = 1; play('rulito'); }
            if (win.full && !win.back && win.age - win.fullAt > LINGER) { win.back = true; corkAll(); }
            if (win.back) win.tail = Math.min(1, win.tail + dt / EAT);
            const whole = Math.min(1, Math.max(0, (win.head - win.tail - 0.6) / 0.4));
            named = Math.max(win.pop, 0.8 * whole * whole * (3 - 2 * whole));
            const flare = win.full && win.head - win.tail > 0.9 ? Math.max(win.pop, Math.sin(t * 4) * 0.5 + 0.5) : 0;
            rulito.value.frame({ head: win.head, tail: win.tail, flare, t, fade: Math.min(1, (win.head - win.tail) * 14), width: glyph.w });
            N_.rulito.refresh();
            N_.rulito.scale = 1 + 0.2 * win.pop * win.pop;
            // the current fades as the rulito goes, and is born again in the sign
            if (win.back) cur.alpha = Math.max(0, 1 - win.tail * 1.4);
            if (win.back && win.tail >= 1) {
                win = null;
                flow.reset();
                rulito.value.frame({ width: glyph.w });
                N_.rulito.refresh();
            }
        }
        if (!win) cur.alpha = Math.min(1, cur.alpha + dt / 1.5);
        netFresh += ((win && !win.back ? 1 : 0) - netFresh) * Math.min(1, dt * (win && !win.back ? 1.2 : 0.6));
        cur.light += ((win && !win.back ? 1 : 0) - cur.light) * Math.min(1, dt * 1.5);
        N_.body.uniforms.uSaturate.value = STILL.saturate + (1 - STILL.saturate) * netFresh;
        N_.body.uniforms.uBright.value = STILL.bright + (1 - STILL.bright) * netFresh;
        N_.body.uniforms.uWater.value = 0.6 * (STILL.water + (1 - STILL.water) * netFresh);
        stageEl?.style.setProperty('--name-glow', named.toFixed(3));
        stage.bloom = named;
    };

    // The current on a canvas (the square of the artwork), between the still pink and the flasks: the tubes emptied
    // round the uncorked flasks it has not reached yet, the live pink from the sign to its head, lights travelling
    // along it and a glow on its head
    const flowCanvas = document.createElement('canvas');
    const aheadCanvas = document.createElement('canvas');
    const LIVE = '#ff94aa';
    let lightPhase = 0;
    // Strokes along samples a..b, broken where the route is inside a flask, each piece as wide as the tube there (times k)
    const along = (ctx, a, b, k) => {
        a = Math.max(0, Math.floor(a));
        b = Math.min(FN - 1, Math.floor(b));
        for (let i = a; i < b; i += 6) {
            const j = Math.min(b, i + 7);
            if (inside[i] && inside[j]) continue;
            ctx.beginPath();
            let open = false;
            for (let n = i; n <= j; n++) {
                if (inside[n]) { open = false; continue; }
                if (open) ctx.lineTo(FX(n), FY(n)); else { ctx.moveTo(FX(n), FY(n)); open = true; }
            }
            ctx.lineWidth = 2 * FW(Math.floor((i + j) / 2)) * k;
            ctx.stroke();
        }
    };
    const drawFlow = () => {
        const px = Math.max(2, Math.round(F.size * Math.min(window.devicePixelRatio || 1, 1.5)));
        if (flowCanvas.width !== px) { flowCanvas.width = px; flowCanvas.height = px; }
        let ctx = flowCanvas.getContext('2d');
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, px, px);
        ctx.setTransform(px / 2160, 0, 0, px / 2160, 0, 0);
        ctx.lineCap = ctx.lineJoin = 'round';
        // Empty glass by the uncorked flasks, where the current has not come yet
        ctx.strokeStyle = '#cdeae6';
        STOPS.forEach((s) => {
            const f = s.flask;
            if (!f || f.drain < 0.01) return;
            const reach = DRAIN * f.drain;
            ctx.globalAlpha = Math.min(1, f.drain * 1.5);
            if (flow.head < s.enter) along(ctx, Math.max(flow.head, s.enter - reach), s.enter, 1.18);
            along(ctx, Math.max(flow.head, s.exit), s.exit + reach, 1.18);
        });
        const head = flow.head;
        const lit = Math.max(flow.acc, cur.light);
        if (cur.alpha > 0.01 && head > START + 0.5) {
            const k = 0.78 + 0.27 * lit;
            ctx.globalAlpha = cur.alpha * (0.72 + 0.28 * lit);
            ctx.strokeStyle = LIVE;
            along(ctx, START, head, k);
            // Lights travelling from the sign to the head, faster than it
            ctx.strokeStyle = '#ffe1e7';
            ctx.globalAlpha = cur.alpha * (0.4 + 0.35 * lit);
            const GAP = 34;
            for (let p = START + (lightPhase % GAP); p < head; p += GAP) along(ctx, Math.max(START, p - 9), Math.min(head, p), k * 0.42);
        }
        ctx.globalAlpha = 1;
        N_.flow?.refresh();
        // The head and the way it goes, on their own canvas over the drawing, so the glass and the outlines never hide them
        if (aheadCanvas.width !== px) { aheadCanvas.width = px; aheadCanvas.height = px; }
        ctx = aheadCanvas.getContext('2d');
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, px, px);
        ctx.setTransform(px / 2160, 0, 0, px / 2160, 0, 0);
        if (cur.alpha > 0.01 && !win) {
            // The way it will go: a few beads of light running on ahead of the head along the tube, brighter while it
            // waits for someone (and before anyone has come), so it is clear what moves and where
            const call = flow.touched ? Math.min(1, Math.max(0, (flow.idle - 3) / 2)) : 1;
            const show = cur.alpha * (0.45 + 0.3 * flow.acc + 0.25 * call) * (1 - 0.6 * flow.rush);
            const stop = flow.next();
            const limit = Math.min(FN - 1, stop ? stop.enter : FN - 1, head + 64);
            const run = (nowT * (14 + 20 * flow.acc)) % 16;
            for (let p = head + 6 + run; p < limit; p += 16) {
                const i = Math.floor(p);
                if (inside[i]) continue;
                const fade = 1 - (p - head) / 64;
                ctx.globalAlpha = show * fade;
                ctx.fillStyle = '#fff3f6';
                ctx.beginPath();
                ctx.arc(FX(i), FY(i), FW(i) * (0.35 + 0.3 * fade), 0, Math.PI * 2);
                ctx.fill();
            }
            // Its head: a bright core in a soft light, more when it is accompanied; it calls (beats) while it waits,
            // and flickers when the finger has gone ahead of it
            const i = Math.min(FN - 1, Math.floor(head));
            const beat = call * (0.5 + 0.5 * Math.sin(nowT * 3.2)) + flow.rush * (0.5 + 0.5 * Math.sin(nowT * 11));
            const r = 78 + 50 * flow.acc + 30 * beat;
            const g = ctx.createRadialGradient(FX(i), FY(i), 0, FX(i), FY(i), r);
            g.addColorStop(0, 'rgba(255,255,255,1)');
            g.addColorStop(0.18, 'rgba(255,236,241,0.95)');
            g.addColorStop(0.45, 'rgba(255,160,184,0.5)');
            g.addColorStop(1, 'rgba(255,160,184,0)');
            ctx.globalAlpha = cur.alpha * (0.7 + 0.3 * Math.max(flow.acc, beat));
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(FX(i), FY(i), r, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        N_.ahead?.refresh();
    };
    // Where its head is, as a touch target in the square of the network (in %)
    const placeHead = () => {
        const el = headHit.value;
        if (!el) return;
        const i = Math.min(FN - 1, Math.floor(flow.head));
        const size = TOUCH_REACH * 2 / 21.6;
        el.style.left = pct((FX(i) / 21.6 - size / 2).toFixed(2));
        el.style.top = pct((FY(i) / 21.6 - size / 2).toFixed(2));
        el.style.width = el.style.height = pct(size.toFixed(2));
        el.style.display = win ? 'none' : '';
    };
    // On a phone, a finger put down near the current's head must not move the page, whatever it lands on (the head, or
    // a creature or a cork beside it, which let the page scroll): otherwise the browser takes the drag for a scroll and
    // cancels it. Anywhere else the page scrolls as usual
    const onTouchStart = (event) => {
        const touch = event.touches[0];
        const box = overlay.value?.getBoundingClientRect();
        if (!touch || !event.cancelable || win || !box?.width) return;
        const u = (touch.clientX - box.left) / box.width * 2160;
        const v = (touch.clientY - box.top) / box.height * 2160;
        if (flow.nearHead(u, v)) event.preventDefault();
    };
    const holdHead = (event) => {
        event.currentTarget.setPointerCapture?.(event.pointerId);
        track(event);
    };
    const onHeadKey = (down) => (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        keyHold = down;
    };
    const letGo = () => { keyHold = false; };

    // A stroke passing by a flask lights the creature in it for a moment, with a few lavender sparks as it comes on
    const wakeCreatures = (dt) => {
        FLASKS.forEach((f) => {
            let near = false;
            if (f.life > 0.9) {
                for (const k of STROKES) {
                    if (k.head - k.tail < 3) continue;
                    const c = Math.floor((k.tail + k.head) / 2);
                    const dx = X(c) - f.cx * 21.6, dy = Y(c) - f.cy * 21.6, reach = f.r * 21.6 + 38;
                    if (dx * dx + dy * dy < reach * reach) { near = true; break; }
                }
            }
            if (near && !f.awake) {
                const n = f.creatures[0];
                const node = N_[n];
                if (node) {
                    const box = node.boxOnScreen(inFrame(layers[n]));
                    sparks.burst(box.left + box.width / 2, box.top + box.height / 2, { n: 8, colors: [0xcfcdf2, 0xb9b6ea, 0xffffff], speed: 55, life: 1.8, size: 4, spread: 12 });
                }
            }
            f.awake = near;
            f.glow += ((near ? 1 : 0) - f.glow) * Math.min(1, dt * (near ? 5 : 1.3));
        });
    };

    // Touching a creature: it flashes and throws sparks of its own colour (nothing happens if its flask is empty)
    const touch = (thing, event) => {
        const home = flaskOfCreature[thing.n];
        if (home && home.life < 0.5) return;
        const [x, y] = centreOn(event);
        const c = thing.color;
        const own = [c, ((c >> 16 & 255) * 0.5 + 127) << 16 | ((c >> 8 & 255) * 0.5 + 127) << 8 | ((c & 255) * 0.5 + 127), 0xffffff];
        sparks.burst(x, y, { n: 26, colors: own, speed: 120, size: 5, spread: 8 });
        flashes[thing.n] = last ?? 0;
        play(thing.area > 15000 ? 'star' : 'tap');
    };
    const onKey = (action) => (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        action(event);
    };

    // A square frame, bottom-aligned; on a tall screen lifted towards the middle so the sky is not empty above it
    const layout = (W, H) => {
        const size = Math.min(Math.max(W, 0.62 * H), 0.85 * H, 1.15 * W);
        const bottom = W <= H ? (H - size) * 0.4 : 0;
        F = { x: W / 2 - size / 2, y: H - size - bottom, size };
    };

    const build = (s) => {
        net = s.depth(NET_Z).group();
        N_.threadUnder = net.canvas(threadUnder);
        N_.body = net.image('/assets/khanti/k3.webp', { water: 0.6 });
        N_.flow = net.canvas(flowCanvas, { water: 0.5, bloom: true });
        FLASKS.forEach((f) => { N_[f.id] = net.image(`/assets/khanti/${f.id}.webp`, { sink: true, water: 1 }); });
        under.forEach((t) => { N_[t.n] = net.image(`/assets/khanti/k${t.n}.webp`); });
        N_.shine = net.image('/assets/khanti/k34.webp', { sheen: 1 });
        N_.lines = net.image('/assets/khanti/k35.webp');
        N_.threadOver = net.canvas(threadOver);
        over.forEach((t) => { N_[t.n] = net.image(`/assets/khanti/k${t.n}.webp`); });
        N_.ahead = net.canvas(aheadCanvas, { bloom: true });
        N_.rulito = net.canvas(rulito.value.canvas, { bloom: true });
        net.enter({ y: 70, scale: 0.88, duration: 2000 });
    };

    const place = (W, H) => {
        layout(W, H);
        net.pivot = { x: F.x + F.size / 2, y: F.y + F.size / 2 };
        const square = { left: F.x, top: F.y, w: F.size, h: F.size };
        N_.threadUnder.place(square);
        N_.threadOver.place(square);
        N_.flow.place(square);
        N_.ahead.place(square);
        // The rulito over the central sign, at the top of its bubble (its canvas is bigger than the glyph, for the glow)
        glyph = inFrame([48.3, 28.6, 3.4, 9.14]);
        N_.rulito.place({ left: glyph.left - 0.4375 * glyph.w, top: glyph.top - 0.1628 * glyph.h, w: glyph.w * 1.875, h: glyph.h * 1.3256 },
            { x: glyph.left + glyph.w / 2, y: glyph.top + glyph.h });
        rulito.value?.frame({ width: glyph.w });
        N_.rulito.refresh();
        N_.body.place(inFrame(layers[big.body]));
        N_.shine.place(inFrame(layers[big.shine]));
        N_.lines.place(inFrame(layers[big.lines]));
        FLASKS.forEach((f) => N_[f.id].place(inFrame(f.box)));
        things.forEach(({ n }) => {
            const box = inFrame(layers[n]);
            N_[n].place(box, originOf(box, (LIFE[n] ?? [])[1] ?? '50% 50%'));
        });
        drawThread();
        drawFlow();
    };

    // The square of touch targets follows the network on screen
    const placeOverlay = () => {
        const el = overlay.value;
        if (!el) return;
        const c = net.toScreen(F.x + F.size / 2, F.y + F.size / 2);
        const e = net.toScreen(F.x + F.size, F.y + F.size / 2);
        const size = 2 * Math.hypot(e.x - c.x, e.y - c.y);
        el.style.width = el.style.height = `${size.toFixed(1)}px`;
        el.style.translate = `${(c.x - size / 2).toFixed(1)}px ${(c.y - size / 2).toFixed(1)}px`;
        el.style.rotate = `${net.rotate.toFixed(3)}deg`;
    };

    const enter = () => {
        if (entered || !props.active || !stage) return;
        entered = true;
        stage.ready().then(() => { if (!gone) stage.start(); });
    };

    const frame = ({ x, y, scroll, t, ramp }) => {
        if (!stage) return;
        stage.look(x * SLIDE, y * SLIDE_Y);
        // The network floats, its creatures floating in it, and the thread with it
        net.y = Math.sin(t * 0.5) * 7 * ramp - scroll * 40;
        net.rotate = Math.sin(t * 0.27) * 0.35 * ramp;
        const dt = last === null ? 0 : Math.min(0.1, t - last);
        last = t;
        nowT = t;
        moveStrokes(dt);
        stepFlow(dt, t);
        hintFlow();
        live(t, ramp);
        stepFlasks(dt);
        wakeCreatures(dt);
        stepWin(dt, t);
        // The current's lights run faster than it, and faster when it is accompanied
        lightPhase += dt * 26 * (1.6 + 1.4 * Math.max(flow.acc, cur.light));
        // The strokes of the thread and the current (every other frame is enough)
        if (tick++ % 2 === 0) { drawThread(); drawFlow(); }
        stage.render(t);
        placeOverlay();
        placeHead();
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
        sky = startStardust(null, {
            stage,
            groups: [
                { count: 300, colors: [0x007096, 0x007096, 0x1b86a8, 0x006f96], size: [2, 7], drift: 5, twinkle: 0.3, reach: 130, push: 32, parallax: 12, order: -20 },
                { count: 26, colors: [0xaaa8d2, 0xb9b7e0], size: [2, 5], drift: 16, twinkle: 0.6, reach: 130, push: 32, parallax: 20, order: -19 },
            ],
        });
        build(stage);
        stage.onResize((W, H) => place(W, H));
        front = startStardust(null, { stage, groups: [{ ...sparks.group(), order: 1e6 }] });
        hand = createGhostHand(stage);
        root.value.addEventListener('pointermove', track, { passive: true });
        root.value.addEventListener('pointerdown', track, { passive: true });
        root.value.addEventListener('pointerup', release, { passive: true });
        root.value.addEventListener('pointercancel', release, { passive: true });
        root.value.addEventListener('touchstart', onTouchStart, { passive: false });
        parallax = createParallax(root.value, frame);
        enter();
    };

    onMounted(begin);
    watch(() => props.active, enter);
    onBeforeUnmount(() => {
        gone = true;
        root.value?.removeEventListener('pointermove', track);
        root.value?.removeEventListener('pointerdown', track);
        root.value?.removeEventListener('pointerup', release);
        root.value?.removeEventListener('pointercancel', release);
        root.value?.removeEventListener('touchstart', onTouchStart);
        stageEl?.style.removeProperty('--name-glow');
        parallax?.destroy();
        sky?.destroy();
        front?.destroy();
        hand?.destroy();
        stage?.destroy();
    });
</script>

<template>
    <div class="scene" ref="root">
        <canvas class="stageCanvas" ref="canvas"></canvas>
        <!-- The rulito is drawn on its own canvas, which the stage shows as a texture over the central sign -->
        <Rulito ref="rulito" class="offstage" color="#f37b85" />
        <!-- What can be touched, in a square kept over the network: the current's head, the creatures, the corks and the
             central sign (the corks and the creatures over the head, so they can still be pressed while it goes by) -->
        <div class="network" ref="overlay">
            <div ref="headHit" class="hit head" role="button" tabindex="0"
                :aria-label="$i18n.locale === 'en' ? 'The current: slide your finger along with it (or hold Enter)' : 'La corriente: deslizá el dedo junto a ella para acompañarla (o mantené Enter)'"
                @pointerdown.prevent="holdHead" @keydown="onHeadKey(true)($event)" @keyup="onHeadKey(false)($event)" @blur="letGo"></div>
            <div v-for="t in touchable" :key="'hit' + t.n" :ref="setCatcher(t.n)" class="hit" role="button" tabindex="0" :style="t.hit"
                :aria-label="$i18n.locale === 'en' ? 'Creature' : 'Criatura'"
                @pointerdown.prevent="touch(t, $event)" @keydown="onKey((e) => touch(t, e))($event)"></div>
            <div v-for="c in corkHits" :key="'cork' + c.flask.id" class="hit" role="button" tabindex="0" :style="c.hit"
                :aria-label="$i18n.locale === 'en' ? 'Cork' : 'Tapón'"
                @pointerdown.prevent="uncork(c.flask, $event)" @keydown="onKey((e) => uncork(c.flask, e))($event)"></div>
            <div class="hit" role="button" tabindex="0" :style="signHit"
                :aria-label="$i18n.locale === 'en' ? 'Central sign' : 'Signo central'"
                @pointerdown.prevent="touchSign" @keydown="onKey(touchSign)($event)"></div>
        </div>
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

    .network {
        position: absolute;
        left: 0;
        top: 0;
        width: 0;
        height: 0;
        pointer-events: none;
    }

    .hit {
        position: absolute;
        border-radius: 50%;
        cursor: pointer;
        pointer-events: auto;
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;
        outline: none;
    }

    /* The current's head: the finger slides from here with it, so the page must not scroll from here */
    .hit.head {
        touch-action: none;
        cursor: grab;
    }

    .offstage {
        position: absolute;
        left: -9999px;
        top: 0;
        width: 40px;
        visibility: hidden;
    }

    .hit:focus-visible {
        outline: 2px solid rgba(255, 255, 255, 0.85);
        outline-offset: 2px;
    }
</style>
