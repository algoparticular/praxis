<script setup>
    // Metta: loving-kindness. In the middle of a starry night Sid sits in a nest of pink and yellow mushrooms on the top of a
    // hill, inside a turquoise light that is inside a great yellow one, and round him, close, the beings of the hill (six of
    // them, standing or sitting, two arm in arm), a fox and a squirrel, keep him company. Its verb will be Dar y recibir
    // (Dana's): for now there is no game, only life.
    // Nothing of the sky is a picture: the navy is a gradient worked out from the card (it is in no layer), the two lights
    // are discs drawn in code with their stippled edges as live particles, and so are the stars, the white stars inside the
    // turquoise light, the lights round the glowing flowers (a soft glow and their stipple) and the spores over the little
    // mushrooms, which rise and fade. The hill is drawn in code too (the flat colour of its top, row by row, from the
    // converter), and on a wide screen it goes on past the frame, sloping down, with the line along its top continued.
    // Pictures: the line along the top of the hill, the ground (stones, little mushrooms, tufts), the five glowing flowers
    // (each its own, swaying in the wind), the six beings, the fox, the squirrel, Sid, the nest with his round body in it,
    // and an atlas of small pieces (every being's eyes and Sid's, so they blink and look about, and the three squiggles of
    // the sky). What moves: everyone breathes, each at their own pace, blinks now and then and glances about (at Sid, often);
    // Sid breathes with his light; the fox's tail and the squirrel's sway; the flowers' lights breathe; the little squiggles
    // float. A touch strums the card's chord (`star`): the lights' stipple flares, and whoever was touched gives a little
    // hop and looks at Sid (touching Sid, his light swells). Reduced motion keeps it still.
    // It is drawn in WebGL (useLayerStage), every group of layers at its own depth. From mettaScene.json and
    // public/assets/metta (made by scripts/convert-metta.mjs). The rulito's place is kept in the JSON for the game.
    import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { floorFor } from '../../data/stageFloor.js';
    import { createParallax } from '../../composables/useParallax.js';
    import { createLayerStage } from '../../composables/useLayerStage.js';
    import { startStardust } from '../../composables/useStardust.js';
    import { play } from '../../composables/useSound.js';
    import art from '../../composables/mettaScene.json';

    const props = defineProps({
        card: { type: Object, default: () => ({}) },
        active: Boolean
    });

    const root = ref(null);
    const canvas = ref(null);
    const hit = ref(null);
    let stage = null;
    let parallax = null;
    let dust = null;
    let entered = false;
    let gone = false;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ---- Layout: the illustration is a 2160 square resting on the bottom of the screen. On a phone upright it is as big
    // as the beings round the nest allow across (the outer ones may be cut a little); on a wide screen the hill goes on
    // past the frame on both sides
    const SIZE = art.size;
    const B = art.boxes;
    let F = { x: 0, y: 0, size: 1 };
    let W = 1, H = 1;
    const k = () => F.size / SIZE;
    const sx = (x) => F.x + x * k();
    const sy = (y) => F.y + y * k();
    const rectOf = ([left, top, w, h]) => ({ left: sx(left), top: sy(top), w: w * k(), h: h * k() });
    const SPAN = 1720;                      // art px across that must be seen on a phone (centred)
    const DROP = 0.08;                      // how much of the frame goes under the bottom of a wide screen
    const layout = (w, h) => {
        W = w; H = h;
        const phone = w < h;
        const size = phone ? Math.min(0.75 * h, w * SIZE / SPAN) : Math.min(Math.max(0.62 * w, 0.55 * h), 0.92 * h);
        F = { x: w / 2 - size / 2, y: h - floorFor(w, h) - size + (phone ? 0 : DROP * size), size };
    };

    const SLIDE = 44;
    const SLIDE_Y = 26;
    const zFor = (amp) => amp / (SLIDE + amp);
    const DEPTH = { stars: 3, halo: 6, aura: 9, hill: 15, beings: 17, sid: 18, front: 20 };

    const HALO = art.halo, AURA = art.aura, HILL = art.hill;
    const STAR = 0xffe699, WHITE = 0xffffff, TURQUOISE = AURA.color;
    const centreOf = ([x, y, w, h]) => [x + w / 2, y + h / 2];

    // ---- The small pieces of the atlas: eyes and squiggles
    const [AW, AH] = art.atlas;
    const BITS = Object.fromEntries(art.bits.map(([name, x, y, w, h, ax, ay]) => [name, { box: [x, y, w, h], crop: [ax / AW, ay / AH, w / AW, h / AH] }]));
    const SQUIGGLES = Object.keys(BITS).filter((name) => name.startsWith('squiggle')).map((name) => {
        const [x, y] = centreOf(BITS[name].box);
        // The one over the hill is in the sky; the others are inside the turquoise light
        return { name, inner: Math.hypot(x - AURA.x, y - AURA.y) < AURA.r + 40, phase: Math.random() * 6.28 };
    });

    // ---- Who is on the hill, left to right as drawn: the beings, the fox, the squirrel and Sid. Each breathes from its
    // feet at its own pace, blinks and glances about; a touch makes it hop
    const CHARACTERS = [
        ...['being0', 'being1', 'being2', 'being3', 'being4', 'being5'].map((name) => ({ name, depth: 'beings', eyes: `eyes:${name}` })),
        { name: 'fox', depth: 'front', sway: [0.72, 0.85, 0.42], breath: 0.006 },
        { name: 'squirrel', depth: 'front', sway: [0.2, 0.55, 0.45], breath: 0.008 },
        { name: 'sid', depth: 'sid', eyes: 'eyes:sid', breath: 0.016 },
    ].map((c, i) => ({
        ...c, i, breath: c.breath ?? 0.011, pace: 0.7 + ((i * 0.37) % 0.5), phase: i * 1.7,
        blinkAt: 1.5 + Math.random() * 4, blink: 0, glance: 0, glanceTo: 0, glanceAt: 2 + Math.random() * 5, hop: 0,
    }));
    const SID = CHARACTERS.find((c) => c.name === 'sid');
    const L = {};
    let lastT = 0;
    let swell = 0;                          // Sid's light, swelling when he is touched

    const build = (s) => {
        // The far sky: the squiggle among the stars (the stars themselves are particles, drawn first)
        const sky = s.depth(zFor(DEPTH.stars));
        L.skyNode = sky;
        L.squiggles = {};
        SQUIGGLES.filter((q) => !q.inner).forEach((q) => { L.squiggles[q.name] = sky.image('/assets/metta/bits.webp', { crop: BITS[q.name].crop }); });
        sky.enter({ y: -20, delay: 100, duration: 2200 });
        // The great yellow light
        const halo = s.depth(zFor(DEPTH.halo));
        L.haloNode = halo;
        L.haloGlow = halo.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: 0xfff1c2, stops: [[0, 0.22], [0.45, 0.1], [0.7, 0]] });
        L.halo = halo.disc({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: HALO.color });
        halo.enter({ y: 50, scale: 0.94, delay: 150, duration: 2400 });
        // The turquoise light round Sid, with its white stars and squiggles
        const aura = s.depth(zFor(DEPTH.aura));
        L.auraNode = aura;
        L.auraGlow = aura.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: 0x7fe6ef, stops: [[0, 0.5], [0.4, 0.2], [0.7, 0]], bloom: true });
        L.aura = aura.disc({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: TURQUOISE });
        SQUIGGLES.filter((q) => q.inner).forEach((q) => { L.squiggles[q.name] = aura.image('/assets/metta/bits.webp', { crop: BITS[q.name].crop }); });
        aura.enter({ y: 40, scale: 0.9, delay: 350, duration: 2200 });
        // The hill: drawn in code, the line along its top, the ground, the lights of the flowers and the flowers
        const hill = s.depth(zFor(DEPTH.hill));
        L.hillNode = hill;
        L.hillCanvas = document.createElement('canvas');
        L.hill = hill.canvas(L.hillCanvas);
        L.line = hill.image('/assets/metta/line.webp');
        L.ground = hill.image('/assets/metta/ground.webp');
        L.lights = art.glows.map(() => hill.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: TURQUOISE, stops: [[0, 0.55], [0.3, 0.25], [0.62, 0]], bloom: true }));
        L.flowers = art.flowers.map((f) => hill.image(`/assets/metta/${f.name}.webp`, { wind: { amp: 3, speed: 0.7 + 0.1 * f.light, root: 'bottom' } }));
        hill.enter({ y: 40, delay: 50, duration: 1700 });
        // Everyone on it, in the card's order, each at the depth of their row
        const rows = { beings: s.depth(zFor(DEPTH.beings)), sid: s.depth(zFor(DEPTH.sid)), front: s.depth(zFor(DEPTH.front)) };
        L.rows = rows;
        CHARACTERS.forEach((c) => {
            const node = rows[c.depth];
            c.group = node.group();
            c.body = c.group.image(`/assets/metta/${c.name}.webp`, c.sway ? { sway: true } : {});
            if (c.eyes) c.eyeNode = c.group.image('/assets/metta/bits.webp', { crop: BITS[c.eyes].crop });
        });
        // The nest, in front of Sid
        L.nest = rows.sid.image('/assets/metta/nest.webp');
        rows.beings.enter({ y: 60, delay: 300, duration: 1900 });
        rows.sid.enter({ y: 70, delay: 450, duration: 2000 });
        rows.front.enter({ y: 50, delay: 550, duration: 1800 });
    };

    // ---- The hill in code: its top (as the converter read it) inside the frame, and past the frame it goes on sloping
    // down as it does at the edges, curving a little more, with the line along its top continued
    const hillTop = (ax) => {
        const top = HILL.top, step = HILL.step, n = top.length - 1;
        const edge = 12;                                           // how many steps the slope at a side is read over
        if (ax < 0) {
            const slope = Math.max(0, (top[0] - top[edge]) / (edge * step));
            const d = -ax;
            return { y: top[0] + slope * d + 0.00012 * d * d, line: HILL.left[0] - top[0] };
        }
        if (ax > SIZE) {
            const slope = Math.max(0, (top[n] - top[n - edge]) / (edge * step));
            const d = ax - SIZE;
            return { y: top[n] + slope * d + 0.00012 * d * d, line: HILL.right[0] - top[n] };
        }
        const u = ax / step, i = Math.min(n - 1, Math.floor(u)), f = u - i;
        return { y: top[i] + (top[i + 1] - top[i]) * f, line: 0 };
    };
    const css = (c) => `#${c.toString(16).padStart(6, '0')}`;
    const MARGIN = 80;
    const paintHill = () => {
        const q = Math.min(stage.dpr, 1.5);
        const left = -MARGIN, right = W + MARGIN;
        let topMost = H;
        for (let x = left; x <= right; x += 8) topMost = Math.min(topMost, sy(hillTop((x - F.x) / k()).y));
        const top = Math.floor(topMost - 20);
        const rect = { left, top, w: right - left, h: H + MARGIN - top };
        const c = L.hillCanvas;
        c.width = Math.max(1, Math.round(rect.w * q));
        c.height = Math.max(1, Math.round(rect.h * q));
        const g = c.getContext('2d');
        g.setTransform(q, 0, 0, q, -left * q, -top * q);
        g.clearRect(left, top, rect.w, rect.h);
        g.fillStyle = css(HILL.color);
        g.beginPath();
        g.moveTo(left, H + MARGIN);
        for (let x = left; x <= right + 4; x += 4) g.lineTo(x, sy(hillTop((x - F.x) / k()).y));
        g.lineTo(right + 4, H + MARGIN);
        g.closePath();
        g.fill();
        // The line along the top, only where the frame does not draw it (past its sides)
        g.strokeStyle = css(HILL.line);
        g.lineCap = 'round';
        g.lineJoin = 'round';
        for (const [from, to, w] of [[left, F.x + 2 * k(), HILL.left[1]], [F.x + F.size - 2 * k(), right, HILL.right[1]]]) {
            if (to <= from) continue;
            g.lineWidth = Math.max(1.5, w * k());
            g.beginPath();
            for (let x = from; x <= to; x += 3) {
                const h = hillTop((x - F.x) / k());
                const y = sy(h.y + (h.line || (x < F.x + F.size / 2 ? HILL.left[0] - HILL.top[0] : HILL.right[0] - HILL.top[HILL.top.length - 1])));
                if (x === from) g.moveTo(x, y); else g.lineTo(x, y);
            }
            g.stroke();
        }
        L.hill.place(rect);
        L.hill.refresh();
    };

    const place = (w, h) => {
        layout(w, h);
        // The night, from the card: the gradient down to the top of the hill, and its last colour below
        const stops = art.sky.map(([y, c]) => `${css(c)} ${Math.max(-50, Math.min(150, sy(y) / h * 100)).toFixed(1)}%`);
        root.value.style.background = `linear-gradient(to bottom, ${stops.join(', ')})`;

        const hr = HALO.r * k();
        L.halo.place({ left: sx(HALO.x) - hr, top: sy(HALO.y) - hr, w: 2 * hr, h: 2 * hr });
        const hg = hr * 2.9;
        L.haloGlow.place({ left: sx(HALO.x) - hg / 2, top: sy(HALO.y) - hg / 2, w: hg, h: hg });
        const ar = AURA.r * k();
        L.aura.place({ left: sx(AURA.x) - ar, top: sy(AURA.y) - ar, w: 2 * ar, h: 2 * ar });
        const ag = ar * 2.8;
        L.auraGlow.place({ left: sx(AURA.x) - ag / 2, top: sy(AURA.y) - ag / 2, w: ag, h: ag });
        SQUIGGLES.forEach((q) => L.squiggles[q.name].place(rectOf(BITS[q.name].box)));

        paintHill();
        L.line.place(rectOf(B.line));
        L.ground.place(rectOf(B.ground));
        art.glows.forEach((g, i) => {
            const d = g.r * 5 * k();
            L.lights[i].place({ left: sx(g.x) - d / 2, top: sy(g.y) - d / 2, w: d, h: d });
        });
        art.flowers.forEach((f, i) => {
            const r = rectOf(B[f.name]);
            L.flowers[i].place(r, { x: r.left + r.w / 2, y: r.top + r.h });
        });

        CHARACTERS.forEach((c) => {
            const r = rectOf(B[c.name]);
            c.rect = r;
            c.group.pivot = { x: r.left + r.w / 2, y: r.top + r.h };
            c.body.place(r, { x: r.left + r.w / 2, y: r.top + r.h });
            if (c.eyeNode) c.eyeNode.place(rectOf(BITS[c.eyes].box));
        });
        // Sid breathes from where he sits in the nest
        SID.group.pivot = { x: sx(1080), y: sy(1250) };
        L.nest.place(rectOf(B.nest));
        placeHit();
    };

    // ---- A touch: the chord strummed, the lights flare, and whoever was touched hops and looks at Sid
    const touch = (event) => {
        if (!stage || !SID.group) return;
        const area = canvas.value.getBoundingClientRect();
        const x = event.clientX - area.left, y = event.clientY - area.top;
        let touched = null, best = Infinity;
        CHARACTERS.forEach((c) => {
            const b = c.group.boxOnScreen(c.rect);
            const pad = 10;
            if (x < b.left - pad || x > b.left + b.width + pad || y < b.top - pad || y > b.top + b.height + pad) return;
            const d = Math.hypot(x - (b.left + b.width / 2), y - (b.top + b.height / 2));
            if (d < best) { best = d; touched = c; }
        });
        strum(touched);
    };
    const strum = (c) => {
        play('star');
        dust?.boost(1, 0.6);
        dust?.boost(2, 0.9);
        dust?.boost(3, 1);
        dust?.boost(4, 0.8);
        if (!c) return;
        c.hop = 1;
        c.blink = 0;
        if (c === SID) swell = 1;
        else { c.glanceTo = Math.sign(SID.rect.left + SID.rect.w / 2 - (c.rect.left + c.rect.w / 2)); c.glanceAt = lastT + 2.5; }
    };
    const onKey = (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        strum(SID);
    };

    // The touch target (for the keyboard, and so a touch on them counts as playing): everyone on the hill
    const placeHit = () => {
        if (!hit.value || !L.rows) return;
        const b = L.rows.beings.boxOnScreen(rectOf([90, 840, 1930, 1020]));
        hit.value.style.translate = `${b.left.toFixed(1)}px ${b.top.toFixed(1)}px`;
        hit.value.style.width = `${b.width.toFixed(1)}px`;
        hit.value.style.height = `${b.height.toFixed(1)}px`;
    };

    const enter = () => {
        if (entered || !props.active || !stage) return;
        entered = true;
        stage.ready().then(() => { if (!gone) { stage.start(); dust?.reveal(); } });
    };

    // The spores over the little mushrooms: each sends up motes that rise a little, sway and fade, one after another
    const SPORE_MOTES = 3;
    const sporeGroup = {
        count: art.spores.length * SPORE_MOTES,
        update(t, data) {
            art.spores.forEach(([x, y, r], s) => {
                for (let m = 0; m < SPORE_MOTES; m++) {
                    const i = s * SPORE_MOTES + m;
                    const p = ((t * 0.16 + s * 0.31 + m / SPORE_MOTES) % 1);
                    const rise = reduced ? 0 : p * 70;
                    data.positions[i * 3] = sx(x + Math.sin(t * 0.9 + s + m * 2) * 6 * p);
                    data.positions[i * 3 + 1] = sy(y - rise);
                    data.sizes[i] = Math.max(1.5, 2 * r * k() * (1 - 0.4 * p));
                    data.alphas[i] = reduced ? (m === 0 ? 1 : 0) : Math.sin(p * Math.PI) ** 0.7;
                }
            });
        },
    };

    const frame = ({ x, y, scroll, t, ramp }) => {
        if (!stage || !L.rows) return;
        const dt = Math.min(0.1, Math.max(0, t - lastT));
        lastT = t;
        stage.look(x * SLIDE, y * SLIDE_Y);
        const live = reduced ? 0 : ramp;

        // ---- The lights: the yellow one barely breathes; the turquoise one breathes with Sid, and swells when he is touched
        swell = Math.max(0, swell - dt * 0.8);
        const sidBreath = Math.sin(t * SID.pace + SID.phase);
        L.haloGlow.opacity = 0.7 + 0.2 * Math.sin(t * 0.35) * live;
        L.auraGlow.opacity = 0.55 + 0.25 * sidBreath * live + 0.45 * swell;
        L.auraGlow.scale = 1 + 0.04 * sidBreath * live + 0.12 * swell;
        stage.bloom = 0.35 * swell;
        SQUIGGLES.forEach((q) => {
            const node = L.squiggles[q.name];
            node.y = Math.sin(t * 0.6 + q.phase) * 6 * live;
            node.rotate = Math.sin(t * 0.45 + q.phase * 2) * 8 * live;
        });
        L.haloNode.y = scroll * 8;
        L.auraNode.y = scroll * 12;
        L.skyNode.y = scroll * 4;

        // ---- The flowers' lights breathe, each at its own pace
        art.glows.forEach((_, i) => {
            L.lights[i].opacity = 0.75 + 0.25 * Math.sin(t * (0.8 + 0.13 * i) + i * 2) * live;
            L.lights[i].scale = 1 + 0.06 * Math.sin(t * (0.8 + 0.13 * i) + i * 2) * live;
        });
        L.hillNode.y = scroll * 18;

        // ---- Everyone breathes from their feet, blinks, glances about (at Sid, often), and hops when touched
        CHARACTERS.forEach((c) => {
            const b = Math.sin(t * c.pace + c.phase);
            c.hop = Math.max(0, c.hop - dt * 1.8);
            const hop = Math.sin((1 - c.hop) * Math.PI) * (c.hop > 0 ? 1 : 0);
            c.group.sy = 1 + c.breath * b * live + 0.05 * hop;
            c.group.sx = 1 - c.breath * 0.35 * b * live - 0.02 * hop;
            c.group.y = -hop * 16 * k() * (c === SID ? 0.4 : 1);
            if (c.sway) {
                // The tail sways from its root
                c.body.sways[0] = [c.sway[0], c.sway[1], c.sway[2], Math.sin(t * 1.3 + c.phase) * 7 * live, 1];
            }
            if (!c.eyeNode || reduced) return;
            if (t > c.blinkAt) { c.blink = 1; c.blinkAt = t + 2.5 + Math.random() * 4.5; }
            c.blink = Math.max(0, c.blink - dt * 7);
            c.eyeNode.sy = 1 - 0.85 * Math.sin(c.blink * Math.PI);
            if (t > c.glanceAt) {
                // Half the time to Sid, otherwise anywhere, or back to the front
                const toSid = Math.sign(SID.rect.left + SID.rect.w / 2 - (c.rect.left + c.rect.w / 2));
                const r = Math.random();
                c.glanceTo = c === SID ? (r < 0.4 ? 0 : r < 0.7 ? -1 : 1) : r < 0.5 ? toSid : r < 0.75 ? 0 : -toSid;
                c.glanceAt = t + 2.5 + Math.random() * 5;
            }
            c.glance += (c.glanceTo - c.glance) * Math.min(1, dt * 5);
            c.eyeNode.x = c.glance * 7 * k() * live;
        });
        L.rows.beings.y = scroll * 20;
        L.rows.sid.y = scroll * 21;
        L.rows.front.y = scroll * 24;

        // The particles that belong to a layer follow it
        const at = (node) => { const d = stage.drift(node.z); return [d.x, d.y + node.y]; };
        dust?.shift(0, ...at(L.skyNode));
        dust?.shift(1, ...at(L.haloNode));
        dust?.shift(2, ...at(L.auraNode));
        dust?.shift(3, ...at(L.auraNode));
        dust?.shift(4, ...at(L.hillNode));
        dust?.shift(5, ...at(L.hillNode));
        stage.render(t);
        placeHit();
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
        build(stage);
        stage.onResize((w, h) => place(w, h));
        const after = (node) => node.mesh.renderOrder + 0.5;
        const fromArt = (list, colour, scale = 1) => list.map(([x, y, r]) => [sx(x), sy(y), Math.max(1.2, 2 * r * k() * scale), colour]);
        // The stars of the card, and as many again over the sky the frame does not cover
        const stars = () => {
            const own = fromArt(art.stars, STAR);
            const density = art.stars.length / (F.size * F.size * 0.7);
            const more = [];
            const want = Math.min(260, Math.round(density * Math.max(0, W * H - F.size * F.size)));
            for (let tries = 0; more.length < want && tries < want * 6; tries++) {
                const px = Math.random() * W, py = Math.random() * Math.min(H, sy(1600));
                if (px > F.x && px < F.x + F.size && py > F.y) continue;
                more.push([px, py, (2 + Math.random() ** 2 * 3) * Math.max(0.7, k() * 2.2), STAR]);
            }
            return [...own, ...more];
        };
        dust = startStardust(null, {
            stage,
            manual: true,
            groups: [
                // 0: the stars
                { colors: [STAR], parallax: 0, drift: 1, twinkle: 0.5, reach: 0, order: -20, points: stars },
                // 1: the stippled edge of the yellow light
                { colors: [HALO.color], parallax: 0, drift: 2, jitter: 0.5, twinkle: 0.3, reach: 0, order: after(L.halo), points: () => fromArt(HALO.dots, HALO.color) },
                // 2: the stippled edge of the turquoise light
                { colors: [TURQUOISE], parallax: 0, drift: 1.8, jitter: 0.45, twinkle: 0.3, reach: 0, order: after(L.aura), points: () => fromArt(AURA.dots, TURQUOISE) },
                // 3: the white stars inside it
                { colors: [WHITE], parallax: 0, drift: 1.5, twinkle: 0.6, reach: 70, push: 10, bloom: true, order: after(L.aura) + 0.1, points: () => fromArt(art.inner, WHITE) },
                // 4: the stipple of the flowers' lights
                { colors: [TURQUOISE], parallax: 0, drift: 1.4, jitter: 0.4, twinkle: 0.4, reach: 0, bloom: true, order: after(L.lights[L.lights.length - 1]),
                    points: () => art.glows.flatMap((g) => fromArt(g.dots, TURQUOISE)) },
                // 5: the spores over the little mushrooms
                { colors: [STAR], dynamic: sporeGroup, look: 'soft', parallax: 0, drift: 0, twinkle: 0.2, reach: 0, bloom: true, order: after(L.ground) },
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
    });
</script>

<template>
    <div class="scene" ref="root" @pointerdown="touch">
        <canvas class="stageCanvas" ref="canvas"></canvas>
        <div ref="hit" class="hit" role="button" tabindex="0"
            :aria-label="$i18n.locale === 'en' ? 'Sid and the beings of the hill, keeping him company' : 'Sid y los seres de la colina, acompañándolo'"
            @keydown="onKey"></div>
    </div>
</template>

<style scoped>
    .scene {
        position: absolute;
        inset: 0;
        overflow: hidden;
        background: #2d3a67;
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
        border-radius: 30%;
        cursor: pointer;
        pointer-events: auto;
        -webkit-tap-highlight-color: transparent;
        outline: none;
    }

    .hit:focus-visible {
        outline: 2px solid rgba(255, 255, 255, 0.85);
        outline-offset: 2px;
    }
</style>
