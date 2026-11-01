<script setup>
    // Confianza: trust, "I trust in myself and I let my wisdom guide my steps". A round labyrinth floats on the card's
    // aqua among scattered dots, with the chakana (the Andean cross) shining at its centre, the way home to oneself.
    // Three little beings wait at its three doors: Particular meditating at the top right, Aura (a jellyfish) on the left
    // and Vulpes at the bottom right; a little swimmer wanders among the dots.
    // Its verb is Arraigar ("the ultimate goal is to return to yourself, to return home"): holding the centre (finger,
    // mouse or key) sends a light out from it along the corridors, as water fills a maze: it runs between the walls, at
    // its own pace, and wherever it reaches it stays lit. The corridors are not drawn as such: the scene reads them from
    // the pictures once (what is neither wall nor line inside the labyrinth), measures how far every point of them is
    // from the centre going along them (a breadth-first walk) and draws the light on a small canvas from that. When the
    // light reaches a door the being there lights up in its chakra's colour and hops (`kindle`, climbing); at the last
    // door the rulito is born over the chakana (`rulito`, `converge`) and the three come home: each turns into a light of
    // its colour that runs back along the lit way to the centre. The light is the rulito's stroke (useRooting.js): let go
    // before, its tail runs out after its head and the corridors go dark from the centre outwards; when the rulito is
    // gone the three are back at their doors. Left alone a while, the centre calls (a ring and a glow: the hint).
    // What is alive: the light round the chakana breathes and its stippled edge trembles (particles), and now and then a
    // ring of light goes out from it through the labyrinth, as a call; the dots drift at two depths; Particular breathes
    // and rises a little on his breath, Aura floats and her tentacles sway (wind from the top), Vulpes breathes and every
    // `LOOK` s turns towards the centre; the swimmer swims in slow loops. A touch anywhere strums the chord (`star`), the
    // dots and the stipple flare, the centre shines and sends a ring; a touch on a being makes it hop.
    // The ground is not a picture: the card's aqua in code (read off the card by the converter); the dots and the stipple are particles, the light round the chakana a disc and a glow in code, and over the disc's edge its stippled band as particles, read from the card (`heart.cloud`, scripts/sun-cloud.mjs), so no circle shows.
    // The dots of the card go on past the frame, mirrored, so on a wide screen there is no edge at all (nothing else
    // reaches the frame's sides). Drawn in WebGL (useLayerStage) from confianzaScene.json and public/assets/confianza (made
    // by scripts/convert-confianza.mjs). Reduced motion keeps it still, everything shown.
    import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { createParallax } from '../../composables/useParallax.js';
    import { createLayerStage } from '../../composables/useLayerStage.js';
    import { startStardust } from '../../composables/useStardust.js';
    import { decodeCloud, sampleCloud } from '../../composables/stippleCloud.js';
    import { createSparks } from '../../composables/useSparks.js';
    import { createRooting } from '../../composables/useRooting.js';
    import { play } from '../../composables/useSound.js';
    import { sceneMilestone } from '../../analytics.js';
    import { CHAKRA_COLORS } from '../../data/chakraColors.js';
    import Rulito from '../Rulito.vue';
    import { chordFor } from '../../data/cardChords.js';
    import { chordColors } from '../../data/chordColors.js';
    import art from '../../composables/confianzaScene.json';

    const props = defineProps({
        card: { type: Object, default: () => ({}) },
        active: Boolean
    });

    const root = ref(null);
    const canvas = ref(null);
    const centreHit = ref(null);
    const rulito = ref(null);
    let stageEl = null;
    let stage = null;
    let parallax = null;
    let dust = null;
    let entered = false;
    let gone = false;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ---- Layout: the illustration is a 2160 square. What must be seen is the labyrinth with the three beings at its
    // doors (REGION, art px); it is fitted between the card's name and the bottom of the screen (room for the share
    // button), as big as the width allows, and centred on it
    const SIZE = art.size;
    const B = art.boxes;
    const REGION = [250, 250, 1790, 1790];               // left, top, right, bottom
    const RX = (REGION[0] + REGION[2]) / 2, RY = (REGION[1] + REGION[3]) / 2;
    let F = { x: 0, y: 0, size: 1 };
    let W = 1, H = 1;
    const k = () => F.size / SIZE;
    const sx = (x) => F.x + x * k();
    const sy = (y) => F.y + y * k();
    const rectOf = ([left, top, w, h]) => ({ left: sx(left), top: sy(top), w: w * k(), h: h * k() });
    let title = null;                                    // the card's name, on the scene: { left, top, right, bottom }
    const layout = (w, h) => {
        W = w; H = h;
        title = titleBox(h);
        const top = title.bottom + 14;
        const bottom = h - (w < h ? 92 : 56);
        const room = Math.max(120, bottom - top);
        const size = Math.min(room / (REGION[3] - REGION[1]), 0.94 * w / (REGION[2] - REGION[0])) * SIZE;
        F = { x: w / 2 - RX * size / SIZE, y: (top + bottom) / 2 - RY * size / SIZE, size };
    };

    const SLIDE = 40;
    const SLIDE_Y = 26;
    const zFor = (amp) => amp / (SLIDE + amp);
    const DEPTH = { far: 3, near: 8, maze: 14, beings: 20 };

    const GROUND = art.ground;
    const INK = art.ink;
    const HEART = art.heart;
    const HEART_CLOUD = decodeCloud(HEART.cloud);   // the light's stippled band, from the card
    const WARM = 0xffe6b0;
    const LOOK = 9;                                      // every LOOK s Vulpes turns towards the centre
    const RING = 7;                                      // a ring of light leaves the centre every RING s

    // ---- The beings: where each one's feet are (art px), how it moves
    const BEINGS = art.beings.map(({ name, box }) => ({ name, box, feet: [box[0] + box[2] / 2, box[1] + box[3]], hop: 1, phase: Math.random() * 6.28, reached: false, home: -1, back: 0, glow: 0 }));
    const L = {};
    let lastT = 0;
    let flare = 0;
    const rings = [];                                    // { age } of every ring of light on its way out
    let nextRing = 3;

    // ---- The game: the corridors, read from the pictures, and how far each point of them is from the centre along them
    const MAZE_N = 400;                                  // px across the small map of the labyrinth
    const maze = { w: MAZE_N, h: 1, dist: null, cells: null, top: 1, doors: [] };
    const flood = document.createElement('canvas');
    let floodImage = null;
    const loadImage = (src) => new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
    const readMaze = async () => {
        const [fill, lines] = await Promise.all([loadImage('/assets/confianza/mazeFill.webp'), loadImage('/assets/confianza/mazeLines.webp')]);
        const [bx, by, bw, bh] = B.mazeFill;
        const w = MAZE_N, h = Math.round(MAZE_N * bh / bw);
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const g = c.getContext('2d', { willReadFrequently: true });
        g.drawImage(fill, 0, 0, w, h);
        const a = g.getImageData(0, 0, w, h).data;
        g.clearRect(0, 0, w, h);
        g.drawImage(lines, 0, 0, w, h);
        const b = g.getImageData(0, 0, w, h).data;
        // A corridor is what is neither wall nor line, inside the labyrinth's rim
        const free = new Uint8Array(w * h);
        const R = w / 2 * 0.975;
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const i = y * w + x;
                free[i] = a[i * 4 + 3] < 60 && b[i * 4 + 3] < 60 && Math.hypot(x - w / 2, y - h / 2) < R ? 1 : 0;
            }
        }
        // Walk out from the light round the chakana
        const dist = new Int32Array(w * h).fill(-1);
        const queue = new Int32Array(w * h);
        let qh = 0, qt = 0;
        const cx = (HEART.x - bx) / bw * w, cy = (HEART.y - by) / bh * h, r0 = HEART.r / bw * w;
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const i = y * w + x;
                if (free[i] && Math.hypot(x - cx, y - cy) < r0) { dist[i] = 0; queue[qt++] = i; }
            }
        }
        while (qh < qt) {
            const i = queue[qh++], x = i % w, y = (i - x) / w;
            const next = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1];
            next.forEach((j) => { if (j >= 0 && free[j] && dist[j] < 0) { dist[j] = dist[i] + 1; queue[qt++] = j; } });
        }
        // The doors: the point of the corridors nearest to each being's feet; and the way from it home, downhill
        const doors = BEINGS.map((being) => {
            const fx = (being.feet[0] - bx) / bw * w, fy = (being.feet[1] - by) / bh * h;
            let best = -1, bestD = Infinity;
            for (let i = 0; i < w * h; i++) {
                if (dist[i] < 0) continue;
                const x = i % w, y = (i - x) / w;
                const d = (x - fx) ** 2 + (y - fy) ** 2;
                if (d < bestD) { bestD = d; best = i; }
            }
            const way = [];
            let i = best;
            while (i >= 0 && dist[i] > 0) {
                const x = i % w, y = (i - x) / w;
                way.push([bx + (x + 0.5) / w * bw, by + (y + 0.5) / h * bh]);
                const next = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1].filter((j) => j >= 0 && dist[j] >= 0 && dist[j] < dist[i]);
                i = next.length ? next[0] : -1;
            }
            way.push([HEART.x, HEART.y]);
            return { at: dist[best], way };
        });
        const top = Math.max(...doors.map((d) => d.at), 1);
        const cells = [];
        for (let i = 0; i < w * h; i++) if (dist[i] >= 0 && dist[i] <= top * 1.02) cells.push(i);
        Object.assign(maze, { w, h, dist, cells: Int32Array.from(cells), top, doors: doors.map((d) => ({ ...d, v: d.at / top })) });
        flood.width = w; flood.height = h;
        floodImage = flood.getContext('2d').createImageData(w, h);
    };
    // The light along the corridors, from the rulito's stroke: lit from tail to head (0 the centre, 1 the farthest door),
    // brightest at its front
    const LIGHT = [255, 222, 128];
    let drawnHead = -1, drawnTail = -1;
    const drawFlood = (head, tail, t) => {
        if (!floodImage || !L.flood) return;
        if (Math.abs(head - drawnHead) < 0.0005 && Math.abs(tail - drawnTail) < 0.0005 && !(head > tail && head < 1)) return;
        drawnHead = head; drawnTail = tail;
        const data = floodImage.data;
        data.fill(0);
        const { cells, dist, top } = maze;
        for (let n = 0; n < cells.length; n++) {
            const i = cells[n];
            const v = dist[i] / top;
            if (v > head || v < tail) continue;
            const front = Math.exp(-(head - v) * 22) * (head < 1 ? 1 : 0.3);
            const back = Math.min(1, (v - tail) / 0.04 + (tail <= 0 ? 1 : 0));
            const alpha = (0.66 + 0.34 * front + 0.08 * Math.sin(v * 60 - t * 4)) * back;
            data[i * 4] = LIGHT[0];
            data[i * 4 + 1] = LIGHT[1];
            data[i * 4 + 2] = LIGHT[2] + 110 * front;
            data[i * 4 + 3] = Math.max(0, Math.min(255, alpha * 255));
        }
        flood.getContext('2d').putImageData(floodImage, 0, 0);
        L.flood.refresh();
    };

    // The beings come home: the light of each runs back along the lit way to the centre
    const hexNum = (c) => parseInt(c.slice(1), 16);
    const COLOR_OF = { particular: hexNum(CHAKRA_COLORS[6].light), aura: hexNum(CHAKRA_COLORS[4].light), vulpes: hexNum(CHAKRA_COLORS[3].light) };
    const HOME = 2.2;                                    // s a being's light takes to come home
    const HINT = 7;
    const sparks = createSparks(320);
    let glyph = { left: 0, top: 0, w: 1, h: 1 };
    let lit = { head: 0, tail: 0, full: false, pop: 0, named: 0, flare: 0 };
    let pressAt = -1;
    let idleHint = 0;
    const rooting = createRooting({
        grow: 5.5, linger: 3.6, eat: 3.2, notes: [],
        onComplete: (times) => {
            play('rulito');
            play('converge');
            flare = 1;
            sendRing();
            dust?.boost(2, 1.4);
            BEINGS.forEach((b, i) => setTimeout(() => { if (!gone) { b.home = 0; } }, 300 + i * 350));
            sceneMilestone('home_reached', { times });
        },
        onReset: () => {
            rulito.value?.reshape();
            BEINGS.forEach((b) => { b.home = -1; b.back = 0; b.reached = false; b.hop = 0; });
        },
    });
    const wayPoint = (way, p) => {
        const f = Math.min(way.length - 1, p * (way.length - 1));
        const i = Math.floor(f), e = f - i;
        const a = way[i], b = way[Math.min(way.length - 1, i + 1)];
        return [a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e];
    };
    // The light of each being on its way home: a few soft motes in its colour
    const HOME_DOTS = 14;
    const homeGroup = {
        count: BEINGS.length * HOME_DOTS,
        update(t, data) {
            BEINGS.forEach((b, j) => {
                const going = b.home >= 0 && b.home < 1 && maze.doors[j];
                const [ax, ay] = going ? wayPoint(maze.doors[j].way, ease(b.home)) : [0, 0];
                const c = COLOR_OF[b.name];
                for (let n = 0; n < HOME_DOTS; n++) {
                    const i = j * HOME_DOTS + n;
                    const a = n * 2.4 + t * (1.5 + n * 0.1), r = (3 + (n % 5) * 5) * k() * 2.4;
                    data.positions[i * 3] = sx(ax) + Math.cos(a) * r;
                    data.positions[i * 3 + 1] = sy(ay) + Math.sin(a) * r;
                    data.sizes[i] = (n < 3 ? 14 : 6) * Math.max(0.7, k() * 2.6);
                    data.alphas[i] = going ? (n < 3 ? 0.9 : 0.6) : 0;
                    data.tints[i * 3] = ((c >> 16) & 255) / 255;
                    data.tints[i * 3 + 1] = ((c >> 8) & 255) / 255;
                    data.tints[i * 3 + 2] = (c & 255) / 255;
                }
            });
        },
    };
    const hold = () => {
        if (reduced || !maze.cells) return;
        rooting.hold();
        idleHint = 0;
    };
    const letGo = () => { rooting.release(); idleHint = 0; };
    const pressCentre = (event) => {
        event?.preventDefault?.();
        pressAt = lastT;
        hold();
        window.addEventListener('pointerup', liftCentre);
        window.addEventListener('pointercancel', liftCentre);
    };
    const liftCentre = (event) => {
        window.removeEventListener('pointerup', liftCentre);
        window.removeEventListener('pointercancel', liftCentre);
        letGo();
        if (lastT - pressAt < 0.35) strum(event);
        pressAt = -1;
    };
    // With the keyboard the key is the finger: held down the light goes out, let go it rests
    const onKeyDown = (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        if (event.repeat) return;
        strum(null);
        hold();
    };
    const onKeyUp = (event) => {
        if (event.key === 'Enter' || event.key === ' ') letGo();
    };

    const sendRing = () => {
        const free = L.rings.findIndex((_, i) => !rings.some((r) => r.i === i));
        if (free >= 0) rings.push({ i: free, age: 0 });
    };

    // A touch: the chord is strummed, the dots and the stipple flare, the centre shines and calls; a being touched hops
    const strum = (event) => {
        play('star');
        dust?.boost(0, 0.6);
        dust?.boost(1, 0.8);
        dust?.boost(2, 1);
        dust?.boost(3, 0.9);
        if (reduced || !stage) return;
        flare = 1;
        sendRing();
        if (!event || !L.beings) return;
        const area = canvas.value.getBoundingClientRect();
        const x = event.clientX - area.left, y = event.clientY - area.top;
        BEINGS.forEach((b, i) => {
            const box = L.beings[i].boxOnScreen(rectOf(b.box));
            const pad = Math.max(14, 28 - box.width / 4);
            if (x > box.left - pad && x < box.left + box.width + pad && y > box.top - pad && y < box.top + box.height + pad) b.hop = 0;
        });
    };

    const build = (s) => {
        // The far dots' plane (they are particles: the node is only their depth)
        L.farNode = s.depth(zFor(DEPTH.far));
        // The swimmer, among the near dots
        const near = s.depth(zFor(DEPTH.near));
        L.nearNode = near;
        L.squiggle = near.image('/assets/confianza/squiggle.webp');
        near.enter({ y: 20, delay: 600, duration: 2000 });
        // The labyrinth: the light at its centre (a glow, a disc, and its stipple among the layers as particles), the
        // corridors, the rings of light that go out from it, the walls and the chakana
        const maze = s.depth(zFor(DEPTH.maze));
        L.mazeNode = maze;
        L.heartGlow = maze.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: WARM, stops: [[0, 0.7], [0.3, 0.35], [0.62, 0]], bloom: true });
        L.heart = maze.disc({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: HEART.color });
        L.fill = maze.image('/assets/confianza/mazeFill.webp');
        // (the light along the corridors, between the walls)
        L.flood = maze.canvas(flood, { bloom: true });
        // (the rings run along the corridors, under the walls)
        L.rings = [0, 1].map(() => {
            const g = maze.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: 0xfff8e8, stops: [[0.5, 0], [0.62, 0.6], [0.68, 0.28], [0.7, 0]] });
            g.opacity = 0;
            return g;
        });
        L.walls = maze.image('/assets/confianza/mazeLines.webp');
        L.chakana = maze.image('/assets/confianza/chakana.webp');
        // The rulito over the chakana, when the three are home
        L.rulito = maze.canvas(rulito.value.canvas, { bloom: true });
        maze.enter({ y: 30, scale: 0.96, delay: 100, duration: 1900 });
        // The three beings at the doors, a little in front
        const beings = s.depth(zFor(DEPTH.beings));
        L.beingsNode = beings;
        L.beings = BEINGS.map((b) => {
            const g = beings.group();
            g.halo = g.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: COLOR_OF[b.name], stops: [[0, 0.7], [0.35, 0.3], [0.7, 0]], bloom: true });
            g.halo.opacity = 0;
            g.body = g.image(`/assets/confianza/${b.name}.webp`, b.name === 'aura' ? { wind: { amp: 5, speed: 1.1, root: 'top' } } : {});
            return g;
        });
        beings.enter({ y: 50, delay: 500, duration: 1800 });
    };

    const place = (w, h) => {
        layout(w, h);
        root.value.style.background = `#${GROUND.toString(16).padStart(6, '0')}`;
        const cx = sx(HEART.x), cy = sy(HEART.y);
        L.squiggle.place(rectOf(B.squiggle));
        // The disc only as big as where the light is still whole: the band's densest dots cover its edge
        const r = HEART.cloud.solid * k();
        L.heart.place({ left: cx - r, top: cy - r, w: 2 * r, h: 2 * r });
        const gd = HEART.r * k() * 4.5;
        L.heartGlow.place({ left: cx - gd / 2, top: cy - gd / 2, w: gd, h: gd });
        L.fill.place(rectOf(B.mazeFill));
        L.flood.place(rectOf(B.mazeFill));
        L.walls.place(rectOf(B.mazeLines));
        // A ring's light sits at 0.62 of the farthest corner: at full size it reaches the labyrinth's rim
        const rd = (B.mazeLines[2] / 2) / (0.62 * Math.SQRT1_2) * k();
        L.rings.forEach((g) => g.place({ left: cx - rd / 2, top: cy - rd / 2, w: rd, h: rd }));
        L.chakana.place(rectOf(B.chakana));
        const gh = 250 * k(), gw = gh * 32 / 86;
        glyph = { left: sx(HEART.x) - gw / 2, top: sy(B.chakana[1] - 30) - gh, w: gw, h: gh };
        L.rulito.place({ left: glyph.left - 0.4375 * glyph.w, top: glyph.top - 0.1628 * glyph.h, w: glyph.w * 1.875, h: glyph.h * 1.3256 },
            { x: glyph.left + glyph.w / 2, y: glyph.top + glyph.h });
        BEINGS.forEach((b, i) => {
            const g = L.beings[i];
            const feet = { x: sx(b.feet[0]), y: sy(b.feet[1]) };
            g.place({ left: 0, top: 0, w: 1, h: 1 }, feet);
            g.pivot = feet;
            g.body.place(rectOf(b.box), feet);
            const r = rectOf(b.box), gd = Math.max(r.w, r.h) * 2;
            g.halo.place({ left: r.left + r.w / 2 - gd / 2, top: r.top + r.h / 2 - gd / 2, w: gd, h: gd });
        });
        placeHit();
    };

    // Where the card's name is (the stage's h1, over the scene): the labyrinth keeps under it and no dot is drawn on it
    const titleBox = (h) => {
        const el = stageEl?.querySelector('h1');
        if (!el || !root.value) return { left: 0, right: 0, top: 0, bottom: 0.16 * h };
        const a = el.getBoundingClientRect(), o = root.value.getBoundingClientRect();
        // The text itself, not the full-width block
        const range = document.createRange();
        range.selectNodeContents(el);
        const t = range.getBoundingClientRect();
        const left = t.width ? t.left : a.left, right = t.width ? t.right : a.right;
        return { left: left - o.left, right: right - o.left, top: a.top - o.top, bottom: a.bottom - o.top };
    };

    // The dots of the card, mirrored tile by tile past the frame so they cover the whole screen
    const tiled = (list, colour, scale = 1) => {
        const out = [];
        const kk = k(), M = 30;
        const tx0 = Math.floor(-F.x / F.size) - 1, tx1 = Math.ceil((W - F.x) / F.size);
        const ty0 = Math.floor(-F.y / F.size) - 1, ty1 = Math.ceil((H - F.y) / F.size);
        for (let ty = ty0; ty <= ty1; ty++) {
            for (let tx = tx0; tx <= tx1; tx++) {
                list.forEach(([x, y, r]) => {
                    const ax = tx * SIZE + (tx % 2 ? SIZE - x : x), ay = ty * SIZE + (ty % 2 ? SIZE - y : y);
                    const px = F.x + ax * kk, py = F.y + ay * kk;
                    if (px < -M || px > W + M || py < -M || py > H + M) return;
                    if (title && px > title.left - 12 && px < title.right + 12 && py > title.top - 8 && py < title.bottom + 8) return;
                    out.push([px, py, Math.max(1.6, 2 * r * kk * scale), colour]);
                });
            }
        }
        return out;
    };

    const placeHit = () => {
        if (!L.mazeNode || !centreHit.value) return;
        const b = L.chakana.boxOnScreen(rectOf(B.chakana));
        const s = Math.max(56, b.width * 1.3);
        centreHit.value.style.translate = `${(b.left + b.width / 2 - s / 2).toFixed(1)}px ${(b.top + b.height / 2 - s / 2).toFixed(1)}px`;
        centreHit.value.style.width = centreHit.value.style.height = `${s.toFixed(1)}px`;
    };

    const enter = () => {
        if (entered || !props.active || !stage) return;
        entered = true;
        stage.ready().then(() => { if (!gone) { stage.start(); dust?.reveal(); } });
    };

    const ease = (p) => p * p * (3 - 2 * p);
    const turn = (t) => {
        const p = (Math.max(0, t - 4) % LOOK) / 2.6;
        return p < 1 ? Math.sin(p * Math.PI) ** 2 : 0;
    };

    let frames = 0;
    const frame = ({ x, y, scroll, t, ramp }) => {
        if (!stage || !L.mazeNode) return;
        const dt = Math.min(0.1, Math.max(0, t - lastT));
        lastT = t;
        stage.look(x * SLIDE, y * SLIDE_Y);
        const kk = k();

        // ---- The centre breathes; a touch makes it shine; now and then a ring of light goes out through the labyrinth
        flare = Math.max(0, flare - dt * 0.9);
        const breath = Math.sin(t * 0.7);
        L.heartGlow.opacity = 0.75 + 0.15 * breath * ramp + 0.25 * flare;
        L.heartGlow.scale = 1 + 0.06 * breath * ramp + 0.35 * flare;
        L.heart.scale = 1 + 0.015 * breath * ramp;
        dust?.grow(2, L.heart.scale - 1, sx(HEART.x), sy(HEART.y));
        L.chakana.scale = 1 + 0.02 * Math.sin(t * 0.7 + 0.6) * ramp + 0.08 * flare * flare;
        L.chakana.uniforms.uBright.value = 1 + 0.08 * (breath * 0.5 + 0.5) * ramp + 0.25 * flare;
        if (!reduced && t > nextRing) { nextRing = t + RING; sendRing(); }

        // ---- The game: the light along the corridors, from the rulito's stroke
        lit = rooting.step(dt, t);
        drawFlood(lit.head, lit.tail, t);
        BEINGS.forEach((b, i) => {
            const door = maze.doors[i];
            if (!door || b.reached || lit.head < door.v - 0.001) return;
            b.reached = true;
            b.hop = 0;
            b.glow = 1;
            const order = BEINGS.filter((each) => each.reached).length;
            play('kindle', { step: order / (BEINGS.length + 1) });
            const p = L.beings[i].toScreen(sx(b.feet[0]), sy(b.feet[1] - b.box[3] / 2));
            sparks.burst(p.x, p.y, { n: 14, colors: [COLOR_OF[b.name], 0xfff8e8], speed: 60, life: 1.4, size: 3.6, spread: 20 * kk });
        });
        // Let go and dark again past a door, the being there rests
        BEINGS.forEach((b, i) => { if (b.reached && b.home < 0 && maze.doors[i] && lit.head - lit.tail < 0.001) b.reached = false; });
        BEINGS.forEach((b, i) => {
            if (b.home < 0 || b.home >= 1) return;
            b.home = Math.min(1, b.home + dt / HOME);
            if (b.home >= 1) {
                flare = Math.max(flare, 0.8);
                dust?.boost(2, 0.8);
                sparks.burst(sx(HEART.x), sy(HEART.y), { n: 16, colors: [COLOR_OF[b.name], 0xfff8e8], speed: 70, life: 1.6, size: 4, spread: 20 * kk });
            } else if (Math.random() < dt * 20) {
                const [ax, ay] = wayPoint(maze.doors[i].way, ease(b.home));
                sparks.burst(sx(ax), sy(ay), { n: 1, colors: [COLOR_OF[b.name]], speed: 12, life: 0.9, size: 3, spread: 3 });
            }
        });
        if (rulito.value) {
            rulito.value.frame({ head: lit.head, tail: lit.tail, flare: lit.flare, t, fade: Math.min(1, (lit.head - lit.tail) * 14), width: glyph.w });
            L.rulito.refresh();
        }
        L.rulito.scale = 1 + 0.2 * lit.pop * lit.pop;
        stageEl?.style.setProperty('--name-glow', lit.named.toFixed(3));
        // The hint: left alone, the centre calls
        idleHint = rooting.held ? 0 : idleHint + dt;
        if (idleHint > HINT && !lit.full && !reduced && ramp >= 1) { idleHint = 0; flare = Math.max(flare, 0.6); sendRing(); }
        for (let i = rings.length - 1; i >= 0; i--) {
            const ring = rings[i];
            ring.age += dt / 4.2;
            const g = L.rings[ring.i];
            g.scale = 0.18 + 0.86 * ease(Math.min(1, ring.age));
            g.opacity = Math.sin(Math.min(1, ring.age) * Math.PI) * 0.75;
            if (ring.age >= 1) { g.opacity = 0; rings.splice(i, 1); }
        }
        L.rings.forEach((g) => { g.mesh.visible = g.opacity > 0.01; });
        stage.bloom = Math.max(0.35 * flare, lit.named, rooting.held ? 0.3 : 0);
        L.heartGlow.opacity += 0.4 * (rooting.held ? 1 : 0) + 0.4 * lit.named;

        // ---- The beings
        BEINGS.forEach((b, i) => {
            const g = L.beings[i];
            b.hop = Math.min(1, b.hop + dt / 0.7);
            // Lit when the light reaches its door; gone home as its light runs to the centre, and back when the rulito is gone
            b.glow = Math.max(b.reached ? 0.55 + 0.15 * Math.sin(t * 3 + b.phase) : 0, b.glow - dt * 1.5);
            g.halo.opacity = b.home >= 0 ? b.glow * (1 - Math.min(1, b.home * 4)) : b.glow;
            b.back = b.home >= 0 ? Math.max(0, 1 - b.home * 3) : Math.min(1, b.back + dt / 0.8);
            g.opacity = b.back;
            g.scale = 0.6 + 0.4 * b.back;
            g.body.uniforms.uBright.value = 1 + 0.25 * (b.reached ? 1 : 0);
            const hop = b.hop < 1 ? Math.sin(b.hop * Math.PI) : 0;
            const squash = b.hop < 1 ? Math.sin(b.hop * Math.PI * 2) * (1 - b.hop) : 0;
            const lift = -hop * Math.max(10, 40 * kk);
            const br = Math.sin(t * 1.1 + b.phase) * ramp;
            if (b.name === 'particular') {
                // He breathes and, on his breath, rises a little off the ground
                g.y = lift - (Math.sin(t * 0.55 + b.phase) * 0.5 + 0.5) * 5 * kk * ramp;
                g.body.sy = 1 + 0.018 * br + 0.1 * squash;
                g.body.sx = 1 - 0.008 * br - 0.06 * squash;
            } else if (b.name === 'aura') {
                // She floats, bobbing, her tentacles in the water
                g.y = lift + Math.sin(t * 0.9 + b.phase) * 14 * kk * ramp;
                g.rotate = Math.sin(t * 0.6 + b.phase) * 3 * ramp;
                g.body.sy = 1 + 0.03 * Math.sin(t * 1.8 + b.phase) * ramp + 0.1 * squash;
                g.body.sx = 1 - 0.015 * Math.sin(t * 1.8 + b.phase) * ramp - 0.06 * squash;
            } else {
                // Vulpes breathes and now and then turns towards the centre
                g.y = lift;
                g.rotate = (reduced ? 0 : -7 * turn(t + b.phase));
                g.body.sy = 1 + 0.015 * br + 0.1 * squash;
                g.body.sx = 1 - 0.006 * br - 0.06 * squash;
            }
        });

        // ---- The swimmer swims in slow loops
        L.squiggle.x = Math.sin(t * 0.21) * 40 * kk * ramp;
        L.squiggle.y = Math.sin(t * 0.33 + 1) * 26 * kk * ramp;
        L.squiggle.rotate = Math.sin(t * 0.5) * 14 * ramp;
        L.squiggle.sx = 1 + 0.08 * Math.sin(t * 2.4) * ramp;

        // ---- Scrolling away, the nearer layers go faster
        L.farNode.y = scroll * 6;
        L.nearNode.y = scroll * 14;
        L.mazeNode.y = scroll * 20;
        L.beingsNode.y = scroll * 28;

        // The particles that belong to a layer follow it
        const farDrift = stage.drift(L.farNode.z), nearDrift = stage.drift(L.nearNode.z), mazeDrift = stage.drift(L.mazeNode.z);
        dust?.shift(0, farDrift.x, farDrift.y + L.farNode.y);
        dust?.shift(1, nearDrift.x, nearDrift.y + L.nearNode.y);
        dust?.shift(2, mazeDrift.x, mazeDrift.y + L.mazeNode.y);
        dust?.shift(3, nearDrift.x, nearDrift.y + L.nearNode.y);
        dust?.shift(4, mazeDrift.x, mazeDrift.y + L.mazeNode.y);
        stage.render(t);
        if (frames++ % 3 === 0) placeHit();
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
        const chord = chordColors(chordFor(props.card.id ?? 18)).map((c) => parseInt(c.slice(1), 16));
        dust = startStardust(null, {
            stage,
            manual: true,
            groups: [
                // 0, 1: the card's dots, at two depths, over the whole screen
                { colors: [INK], look: 'hard', parallax: 0, drift: 2.5, twinkle: 0.12, reach: 70, push: 10, order: -1, points: () => tiled(art.far, INK, 0.95) },
                { colors: [INK], look: 'hard', parallax: 0, drift: 3.5, twinkle: 0.12, reach: 80, push: 14, order: after(L.squiggle), points: () => tiled(art.near, INK) },
                // 2: the stippled band of the light at the centre, alive (under the corridors, as in the card)
                { colors: [HEART.color], look: 'hard', parallax: 0, drift: 1.2, jitter: 0.5, twinkle: 0.3, reach: 0, order: after(L.heart),
                    points: () => sampleCloud(HEART_CLOUD, (u, v) => [sx(u), sy(v)], k()).map(([x, y, size]) => [x, y, size, HEART.color]) },
                // 3: a few motes in the colours of the chord (Am: third eye, root, solar plexus), rising slowly
                { colors: chord, look: 'soft', count: 26, size: [4, 9], flow: [0, -7], drift: 16, twinkle: 0.7, reach: 100, push: 26, edgeFade: 0.2, opacity: 0.5, parallax: 0, order: 1e6 },
                // 4: the beings' lights coming home, along the corridors (under the walls), and 5: the sparks, in front
                { colors: [0xffffff], look: 'soft', dynamic: homeGroup, parallax: 0, drift: 0, jitter: 0, twinkle: 0, reach: 0, bloom: true, order: after(L.flood) },
                { ...sparks.group(), order: 1e6 + 1 },
            ],
        });
        if (reduced) dust.reveal();
        parallax = createParallax(root.value, frame);
        readMaze().catch((e) => console.warn('The labyrinth could not be read', e));
        if (import.meta.env.DEV) root.value.__game = { rooting, maze, BEINGS, get lit() { return lit; } };
        enter();
    };

    onMounted(begin);
    watch(() => props.active, enter);
    onBeforeUnmount(() => {
        gone = true;
        stageEl?.style.removeProperty('--name-glow');
        window.removeEventListener('pointerup', liftCentre);
        window.removeEventListener('pointercancel', liftCentre);
        parallax?.destroy();
        dust?.destroy();
        stage?.destroy();
    });
</script>

<template>
    <div class="scene" ref="root" @click="strum">
        <canvas class="stageCanvas" ref="canvas"></canvas>
        <div ref="centreHit" class="hit" role="button" tabindex="0"
            :aria-label="$i18n.locale === 'en' ? 'The centre of the labyrinth: hold it to light the way home' : 'El centro del laberinto: mantenelo para iluminar el camino a casa'"
            @pointerdown="pressCentre" @click.stop @keydown="onKeyDown" @keyup="onKeyUp"></div>
        <!-- The rulito is drawn on its own canvas, which the stage shows as a texture over the chakana -->
        <Rulito ref="rulito" class="offstage" color="#e8798f" />
    </div>
</template>

<style scoped>
    .scene {
        position: absolute;
        inset: 0;
        overflow: hidden;
        background: #abdcd9;
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

    .offstage {
        position: absolute;
        left: -9999px;
        top: 0;
        width: 40px;
        visibility: hidden;
        pointer-events: none;
    }

    .hit:focus-visible {
        outline: 2px solid rgba(0, 112, 154, 0.85);
        outline-offset: 2px;
    }
</style>
