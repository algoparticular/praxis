<script setup>
    // Gratitud: "the door you open every time you give thanks". A small island in a calm turquoise sea, under a peach sun
    // with a pink heart: a house with a pink roof, a palm with a little light shining over its crown, a beach of stippled
    // sand, a dock with a pink boat moored at it, and Sid sitting in his chair in the shade of the palm, looking out to sea.
    // Far away a chain of striped islands lies on the horizon.
    // Its verb will be Dar y recibir (as Dana's): it is not played yet. Until then the scene is only alive: the sea's
    // little waves bob, sway and shine each on its own, the clouds drift across the sky, the sun breathes and its stipple
    // trembles, the palm and the pale plant sway in the breeze (the light over the palm goes with the palm's crown and
    // breathes), the boat rocks at the dock, the plant's sparkles twinkle and the sand can be stirred with a finger, and
    // Sid breathes, blinks and now and then turns to look at the light. A touch strums the card's chord (`star`) and the
    // light over the palm, the sun and the sparkles flare; a touch on Sid makes him hop in his chair (`tap`).
    // The sky and the sea are one flat colour, the card's (in no layer: read from the card by the converter), drawn as
    // the page's background; the sun (two discs, peach and pink) and the light over the palm are discs drawn in code with
    // their stippled edges as live particles, and so are the sand's stipple and the plant's sparkles. The clouds and the
    // waves are cut out into two atlases; past the frame (on a wide screen, and under it on a phone) the sea goes on with
    // the same waves shuffled, so it never shows a twin. The soft green shine beside each wave is in no layer either: it
    // is a glow in code.
    // It is drawn in WebGL (useLayerStage): the sun, the clouds, the far islands, the waves, the island and the boat are
    // planes at their depths. From gratitudScene.json and public/assets/gratitud (made by scripts/convert-gratitud.mjs).
    // For the game to come: the house, the palm, the light, the plant, Sid and the boat are each their own picture.
    import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { createParallax } from '../../composables/useParallax.js';
    import { createLayerStage } from '../../composables/useLayerStage.js';
    import { startStardust } from '../../composables/useStardust.js';
    import { play } from '../../composables/useSound.js';
    import art from '../../composables/gratitudScene.json';

    const props = defineProps({
        card: { type: Object, default: () => ({}) },
        active: Boolean
    });

    const root = ref(null);
    const canvas = ref(null);
    const sidHit = ref(null);
    let stageEl = null;
    let stage = null;
    let parallax = null;
    let dust = null;
    let entered = false;
    let gone = false;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const SEA = `#${art.sea.toString(16).padStart(6, '0')}`;

    // ---- Layout: the illustration is a 2160 square. What has to be seen runs from the top of the sun (TOP) to the last
    // wave (BOTTOM); it sits under the card's name, centred in the room left. On a phone upright it is as big as the
    // island and its boat allow across (SPAN), centred on them (FOCUS); on a wide screen the sea goes on past the frame
    const SIZE = art.size;
    const B = art.boxes;
    let F = { x: 0, y: 0, size: 1 };
    const k = () => F.size / SIZE;
    const sx = (x) => F.x + x * k();
    const sy = (y) => F.y + y * k();
    const rectOf = ([left, top, w, h]) => ({ left: sx(left), top: sy(top), w: w * k(), h: h * k() });
    const SPAN = 1640, FOCUS = 1170;
    const TOP = 300, BOTTOM = 1960;
    const layout = (w, h) => {
        const phone = w < h;
        const below = titleBottom(h) + 8;
        const room = Math.max(1, h - below);
        const size = phone ? Math.min(w * SIZE / SPAN, room * SIZE / (BOTTOM - TOP)) : Math.min(0.62 * w, 0.96 * room * SIZE / (BOTTOM - TOP));
        let x = w / 2 - size / 2;
        if (phone && size > w) x = Math.min(0, Math.max(w - size, w / 2 - FOCUS * size / SIZE));
        const kk = size / SIZE;
        const free = room - (BOTTOM - TOP) * kk;
        F = { x, y: below - TOP * kk + Math.max(0, free) * 0.45, size };
    };

    const SLIDE = 50;
    const SLIDE_Y = 30;
    const zFor = (amp) => amp / (SLIDE + amp);
    const DEPTH = { sun: 4, clouds: [6, 8, 10], hills: 11, waves: [15, 21, 28, 34], island: 24, boat: 25 };

    // ---- The clouds: cut out of the illustration (one atlas), drifting slowly across the sky and wrapping round
    const [CW, CH] = art.cloudAtlas;
    const clouds = art.clouds.map(([x, y, w, h, ax, ay], i) => ({
        i, art: { x: x + w / 2, y: y + h / 2, w, h }, crop: [ax / CW, ay / CH, w / CW, h / CH],
        rest: { left: 0, top: 0, w: 1, h: 1 }, x0: 0, phase: Math.random() * 6.28, speed: 7 + (i % 3) * 3, depth: i % 3,
    }));
    const CLOUD_TOP = Math.min(...art.clouds.map((c) => c[1] + c[3] / 2));
    const CLOUD_BOTTOM = Math.max(...art.clouds.map((c) => c[1] + c[3] / 2));
    let cloudSpan = { left: 0, width: 1 };

    // ---- The waves: the card's own (tile 0, 0) and, past the frame, the same waves shuffled in the tiles round it
    // (beside it and under it; never over the horizon), each a little moved so no two look the same
    const [WW, WH] = art.waveAtlas;
    const WAVE_TOP = Math.min(...art.waves.map((c) => c[1]));
    const WAVE_ROWS = 990;                  // the height of the sea's tile (art px): the waves span about that
    const TILES = [[0, 0], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
    const seeded = (n) => { const v = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return v - Math.floor(v); };
    const waves = [];
    TILES.forEach(([tx, ty], t) => {
        art.waves.forEach((_, j) => {
            // The card's own waves in place; elsewhere another wave of the set, moved and sometimes mirrored
            const pick = t === 0 ? j : (j + 3 * t + 1) % art.waves.length;
            const [x, y] = art.waves[j];
            const [, , w, h, ax, ay] = art.waves[pick];
            const n = waves.length;
            const jx = t === 0 ? 0 : (seeded(n) - 0.5) * 260, jy = t === 0 ? 0 : (seeded(n + 99) - 0.5) * 90;
            const cy = y + h / 2 + ty * WAVE_ROWS + jy;
            const near = Math.max(0, Math.min(1, (cy - WAVE_TOP) / (WAVE_ROWS * 1.6)));
            waves.push({
                n, tile: t, crop: [ax / WW, ay / WH, w / WW, h / WH],
                art: { x: x + w / 2 + tx * SIZE + jx, y: cy, w, h },
                grow: t === 0 ? 1 : 1 + 0.35 * ty,
                mirror: t !== 0 && seeded(n + 7) < 0.4,
                depth: Math.min(3, Math.floor(near * 4)),
                phase: seeded(n + 3) * 6.28, speed: 0.7 + seeded(n + 5) * 0.5,
            });
        });
    });

    const L = {};
    const touch = { sid: 0, flare: 0, look: 0 };
    let lastT = 0;

    // Sid blinks now and then (two quick closes sometimes), and every LOOK s turns a little to look up at the light
    let blinkAt = 2.5, blinkEnd = 0;
    const LOOK = 13;
    const lookout = (t) => {
        const p = (Math.max(0, t - 4) % LOOK) / 3.2;
        return p < 1 ? Math.sin(p * Math.PI) ** 2 : 0;
    };

    // Where the palm's crown is pushed by its wind (the same sway as its shader), so the light over it goes with it
    const PALM_WIND = { amp: 5, speed: 0.75 };
    const palmSway = (t) => {
        const u = L.palm?.uniforms;
        if (!u) return 0;
        const r = L.palm.rect;
        const at = (art.beacon.x - B.palm[0]) / B.palm[2];
        const lift = 1 - (B.light[1] + B.light[3] - B.palm[1]) / B.palm[3];
        const along = at * r.w * 0.012 + u.uWind.value.w;
        const s = PALM_WIND.speed;
        return (Math.sin(t * s + along) * 0.7 + Math.sin(t * s * 2.3 + along * 1.9) * 0.3) * PALM_WIND.amp * Math.max(0, lift) ** 2;
    };

    const build = (s) => {
        // The sun: a faint warm light, its peach disc and its pink heart (code); their stipple is particles
        const sun = s.depth(zFor(DEPTH.sun));
        L.sunNode = sun;
        L.halo = sun.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: 0xffd6a6, stops: [[0, 0.35], [0.35, 0.14], [0.7, 0]] });
        L.suns = art.sun.map((d) => sun.disc({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: d.color }));
        sun.enter({ y: 50, delay: 150, duration: 2600 });
        // The clouds, at three depths
        L.clouds = [];
        DEPTH.clouds.forEach((depth, d) => {
            const node = s.depth(zFor(depth));
            clouds.filter((c) => c.depth === d).forEach((c) => { L.clouds[c.i] = node.image('/assets/gratitud/clouds.webp', { crop: c.crop }); });
            node.enter({ y: -20, delay: 250 + 150 * d, duration: 2000 });
        });
        // The far islands on the horizon
        const hills = s.depth(zFor(DEPTH.hills));
        L.hillsNode = hills;
        L.hills = hills.image('/assets/gratitud/hills.webp');
        hills.enter({ y: 24, delay: 200, duration: 1800 });
        // The waves at four depths, the farther first; each with the soft green shine beside it
        L.waveNodes = DEPTH.waves.map((depth, d) => {
            const node = s.depth(zFor(depth));
            node.enter({ y: 20 + 10 * d, delay: 250 + 120 * d, duration: 1800 });
            return node;
        });
        waves.forEach((wv) => {
            const node = L.waveNodes[wv.depth];
            wv.shine = node.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: 0x5fd0b6, stops: [[0, 0.8], [0.3, 0.45], [0.62, 0]] });
            wv.node = node.image('/assets/gratitud/waves.webp', { crop: wv.crop });
        });
        // The boat (behind the island's dock), rocking on its own
        const boat = s.depth(zFor(DEPTH.boat));
        L.boatNode = boat;
        L.boat = boat.image('/assets/gratitud/boat.webp');
        boat.enter({ y: 40, delay: 450, duration: 1900 });
        // The island, and on it the house, the plant, the palm with its light and Sid
        const island = s.depth(zFor(DEPTH.island));
        L.islandNode = island;
        L.island = island.group();
        L.ground = L.island.image('/assets/gratitud/island.webp');
        L.house = L.island.image('/assets/gratitud/house.webp');
        L.plant = L.island.image('/assets/gratitud/plant.webp', { wind: { amp: 2.2, speed: 0.9, root: 'bottom' } });
        L.glowWide = L.island.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: 0xffe66a, stops: [[0, 0.4], [0.3, 0.16], [0.7, 0]], bloom: true });
        L.beacon = L.island.disc({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: art.beacon.color });
        L.palm = L.island.image('/assets/gratitud/palm.webp', { wind: { ...PALM_WIND, root: 'bottom' } });
        L.light = L.island.image('/assets/gratitud/light.webp');
        L.sid = L.island.group();
        L.sidBody = L.sid.image('/assets/gratitud/sid.webp');
        L.lids = art.eyes.map(() => L.sid.disc({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: art.pale }));
        island.enter({ y: 40, delay: 100, duration: 1800 });
    };

    const place = (w, h) => {
        layout(w, h);
        root.value.style.background = SEA;

        art.sun.forEach((d, i) => {
            const r = d.r * k();
            L.suns[i].place({ left: sx(d.x) - r, top: sy(d.y) - r, w: 2 * r, h: 2 * r });
        });
        const hg = art.sun[0].r * k() * 4.4;
        L.halo.place({ left: sx(art.sun[0].x) - hg / 2, top: sy(art.sun[0].y) - hg / 2, w: hg, h: hg });

        // The clouds spread over the sky between the card's name and the horizon, however wide the screen
        const wide = Math.max(w, F.size);
        const top = titleBottom(h) + 10;
        let widest = 0;
        clouds.forEach((c) => {
            const cw = c.art.w * k(), ch = c.art.h * k();
            const x = w / 2 + (c.art.x - 1080) / SIZE * wide;
            const lo = top + ch / 2, hi = Math.max(lo, sy(740));
            const y = lo + (c.art.y - CLOUD_TOP) / Math.max(1, CLOUD_BOTTOM - CLOUD_TOP) * (hi - lo);
            c.x0 = x;
            c.rest = { left: x - cw / 2, top: y - ch / 2, w: cw, h: ch };
            widest = Math.max(widest, cw);
            L.clouds[c.i].place(c.rest);
        });
        cloudSpan = { left: -SLIDE * 2 - widest / 2, width: w + SLIDE * 4 + widest };

        L.hills.place(rectOf(B.hills));

        waves.forEach((wv) => {
            const ww = wv.art.w * k() * wv.grow, wh = wv.art.h * k() * wv.grow;
            const cx = sx(wv.art.x), cy = sy(wv.art.y);
            wv.rest = { left: cx - ww / 2, top: cy - wh / 2, w: ww, h: wh };
            wv.node.place(wv.rest);
            wv.node.sx = wv.mirror ? -1 : 1;
            // The shine lies low and to the side the wave runs to
            const gw = ww * 1.25, gh = wh * 1.5;
            wv.shine.place({ left: cx - gw / 2 + ww * (wv.mirror ? -0.28 : 0.28), top: cy - gh / 2 + wh * 0.32, w: gw, h: gh });
            wv.shine.sy = 0.55;
            // Only what can be seen is drawn
            const seen = cx + ww > -SLIDE * 2 && cx - ww < w + SLIDE * 2 && cy + wh > -SLIDE && cy - wh < h + SLIDE;
            wv.node.mesh.visible = wv.shine.mesh.visible = seen;
            wv.seen = seen;
        });

        const boat = rectOf(B.boat);
        L.boat.place(boat, { x: boat.left + boat.w * 0.45, y: boat.top + boat.h * 0.8 });

        L.ground.place(rectOf(B.island));
        L.house.place(rectOf(B.house));
        const plant = rectOf(B.plant);
        L.plant.place(plant, { x: plant.left + plant.w / 2, y: plant.top + plant.h });
        const palm = rectOf(B.palm);
        L.palm.place(palm, { x: palm.left + palm.w * 0.45, y: palm.top + palm.h });
        L.light.place(rectOf(B.light));
        const b = art.beacon;
        const br = b.r * 1.25 * k();          // the solid middle, out to where its stipple thins
        L.beacon.place({ left: sx(b.x) - br, top: sy(b.y) - br, w: 2 * br, h: 2 * br });
        const gw = b.r * 9 * k();
        L.glowWide.place({ left: sx(b.x) - gw / 2, top: sy(b.y) - gw / 2, w: gw, h: gw });
        const sid = rectOf(B.sid);
        L.sidBody.place(sid, { x: sid.left + sid.w / 2, y: sid.top + sid.h });
        L.sid.pivot = { x: sid.left + sid.w / 2, y: sid.top + sid.h };
        art.eyes.forEach(([x, y, r], i) => {
            const er = Math.max(0.8, r * 1.9 * k());
            L.lids[i].place({ left: sx(x) - er, top: sy(y) - er, w: 2 * er, h: 2 * er });
        });
        placeHits();
    };

    // Where the card's name ends (the stage's h1, over the scene), so nothing is laid under it
    const titleBottom = (h) => {
        const title = stageEl?.querySelector('h1');
        if (!title || !root.value) return 0.14 * h;
        return title.getBoundingClientRect().bottom - root.value.getBoundingClientRect().top;
    };

    // The touch target: Sid (small, so at least a finger's size)
    const placeHits = () => {
        if (!L.sid || !sidHit.value) return;
        const b = L.sid.boxOnScreen(rectOf(B.sid));
        const bw = Math.max(56, b.width * 1.6), bh = Math.max(56, b.height * 1.3);
        sidHit.value.style.translate = `${(b.left + b.width / 2 - bw / 2).toFixed(1)}px ${(b.top + b.height / 2 - bh / 2).toFixed(1)}px`;
        sidHit.value.style.width = `${bw.toFixed(1)}px`;
        sidHit.value.style.height = `${bh.toFixed(1)}px`;
    };

    // A touch anywhere strums the card's chord and the lights flare; on Sid he hops in his chair
    const strum = () => {
        play('star');
        touch.flare = 1;
        dust?.boost(0, 0.7);
        dust?.boost(1, 0.7);
        dust?.boost(2, 1);
        dust?.boost(4, 1);
    };
    const onScene = () => { if (!reduced) strum(); };
    const onSid = (event) => {
        event?.stopPropagation();
        play('tap');
        if (reduced) return;
        touch.sid = 1;
        touch.flare = Math.max(touch.flare, 0.6);
        dust?.boost(2, 0.8);
    };
    const onKey = (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        onSid();
        strum();
    };

    const enter = () => {
        if (entered || !props.active || !stage) return;
        entered = true;
        stage.ready().then(() => { if (!gone) { stage.start(); dust?.reveal(); } });
    };

    let frames = 0;
    const frame = ({ x, y, scroll, t, ramp }) => {
        if (!stage || !L.sid) return;
        const dt = Math.min(0.1, Math.max(0, t - lastT));
        lastT = t;
        stage.look(x * SLIDE, y * SLIDE_Y);
        touch.flare = Math.max(0, touch.flare - dt * 1.1);
        touch.sid = Math.max(0, touch.sid - dt * 1.8);

        // ---- The sun breathes; its light swells a little with a touch
        const breath = Math.sin(t * 0.55);
        L.suns[0].scale = 1 + 0.015 * breath * ramp + 0.04 * touch.flare;
        L.suns[1].scale = 1 + 0.025 * Math.sin(t * 0.55 + 0.8) * ramp + 0.06 * touch.flare;
        L.halo.opacity = 0.6 + 0.2 * breath * ramp + 0.4 * touch.flare;
        L.halo.scale = 1 + 0.05 * breath * ramp;
        L.sunNode.y = scroll * 8;
        L.hillsNode.y = scroll * 14;

        // ---- The clouds drift from left to right and wrap round, rising and falling a little as they go
        clouds.forEach((c) => {
            const node = L.clouds[c.i];
            if (reduced) return;
            const moved = c.x0 + c.speed * t;
            const wrapped = cloudSpan.left + ((((moved - cloudSpan.left) % cloudSpan.width) + cloudSpan.width) % cloudSpan.width);
            node.x = wrapped - c.x0;
            node.y = Math.sin(t * 0.4 + c.phase) * 6 * ramp;
            node.sx = 1 + 0.05 * Math.sin(t * 0.6 + c.phase) * ramp;
        });

        // ---- The waves bob and sway, stretch a little as they roll, and their shine breathes
        if (!reduced) {
            waves.forEach((wv) => {
                if (!wv.seen) return;
                const p = t * wv.speed + wv.phase;
                const lift = Math.sin(p) * 3 * wv.grow * ramp;
                const roll = Math.sin(p * 0.45) * 7 * wv.grow * ramp;
                wv.node.x = wv.shine.x = roll;
                wv.node.y = lift;
                wv.shine.y = lift * 0.5;
                wv.node.sx = (wv.mirror ? -1 : 1) * (1 + 0.06 * Math.sin(p + 1.2) * ramp);
                wv.node.sy = 1 - 0.08 * Math.sin(p + 1.2) * ramp;
                wv.shine.opacity = 0.65 + 0.35 * Math.sin(p * 0.8 + 2);
            });
        }
        L.waveNodes.forEach((node, d) => { node.y = scroll * (14 + 6 * d); });

        // ---- The boat rocks at the dock
        L.boat.rotate = (Math.sin(t * 0.8) * 1.6 + Math.sin(t * 1.9) * 0.4) * ramp;
        L.boat.y = Math.sin(t * 0.8 + 0.9) * 2.5 * ramp;
        L.boatNode.y = scroll * 24;
        L.islandNode.y = scroll * 24;

        // ---- The light over the palm goes with its crown, breathes and flares with a touch
        const sway = palmSway(t);
        L.light.x = L.beacon.x = L.glowWide.x = sway;
        const glow = 0.5 + 0.5 * Math.sin(t * 1.1);
        L.beacon.scale = 1 + 0.06 * glow * ramp + 0.25 * touch.flare;
        L.glowWide.opacity = Math.min(1, 0.45 + 0.25 * glow * ramp + 0.6 * touch.flare);
        L.glowWide.scale = 1 + 0.1 * glow * ramp + 0.35 * touch.flare;

        // ---- Sid breathes, blinks, turns to look up at the light now and then, and hops when touched
        L.sidBody.sy = 1 + 0.02 * Math.sin(t * 1.2) * ramp;
        L.sidBody.sx = 1 - 0.008 * Math.sin(t * 1.2) * ramp;
        const hop = Math.sin(Math.min(1, 1 - touch.sid) * Math.PI) * (touch.sid > 0 ? 1 : 0);
        L.sid.y = -hop * 14 * k() * (F.size > 900 ? 1 : 1.4);
        L.sid.rotate = reduced ? 0 : 5 * lookout(t) + 3 * hop;
        if (!reduced && t > blinkAt) {
            blinkEnd = t + 0.13;
            blinkAt = t + (Math.random() < 0.25 ? 0.3 : 2.5 + Math.random() * 4);
        }
        const shut = !reduced && t < blinkEnd;
        L.lids.forEach((lid) => { lid.opacity = shut ? 1 : 0; lid.mesh.visible = shut; });

        // The particles that belong to a layer follow it
        const sunDrift = stage.drift(L.sunNode.z), islandDrift = stage.drift(L.islandNode.z);
        dust?.shift(0, sunDrift.x, sunDrift.y + L.sunNode.y);
        dust?.shift(1, sunDrift.x, sunDrift.y + L.sunNode.y);
        dust?.shift(2, islandDrift.x + sway, islandDrift.y + L.islandNode.y);
        dust?.shift(3, islandDrift.x, islandDrift.y + L.islandNode.y);
        dust?.shift(4, islandDrift.x, islandDrift.y + L.islandNode.y);
        stage.bloom = Math.max(0, 0.5 * touch.flare);
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
        const fromArt = (list, colour, scale = 1) => list.map(([x, y, r]) => [sx(x), sy(y), Math.max(1.2, 2 * r * k() * scale), colour]);
        const [outer, inner] = art.sun;
        dust = startStardust(null, {
            stage,
            manual: true,
            groups: [
                // 0, 1: the stippled edges of the sun's peach light and its pink heart, alive
                { colors: [outer.color], parallax: 0, drift: 2, jitter: 0.5, twinkle: 0.3, reach: 0, look: 'hard', order: after(L.suns[0]), points: () => fromArt(outer.dots, outer.color) },
                { colors: [inner.color], parallax: 0, drift: 1.6, jitter: 0.4, twinkle: 0.3, reach: 0, look: 'hard', order: after(L.suns[1]), points: () => fromArt(inner.dots, inner.color) },
                // 2: the stipple of the light over the palm
                { colors: [art.beacon.color], parallax: 0, drift: 1.4, jitter: 0.5, twinkle: 0.5, reach: 0, look: 'hard', bloom: true, order: after(L.beacon), points: () => fromArt(art.beacon.dots, art.beacon.color) },
                // 3: the sand's stipple, that a finger can stir
                { colors: [0x1a1611], parallax: 0, drift: 0.6, jitter: 0.15, twinkle: 0, reach: 46, push: 9, look: 'hard', order: after(L.ground), points: () => fromArt(art.sand, 0x1a1611) },
                // 4: the sparkles round the pale plant
                { colors: [0xb8eef0], parallax: 0, drift: 2.5, jitter: 0.3, twinkle: 0.85, reach: 40, push: 8, look: 'hard', order: after(L.plant), points: () => fromArt(art.sparkle, 0xb8eef0, 1.1) },
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
    <div class="scene" ref="root" @pointerdown="onScene">
        <canvas class="stageCanvas" ref="canvas"></canvas>
        <div ref="sidHit" class="hit" role="button" tabindex="0"
            :aria-label="$i18n.locale === 'en' ? 'Sid, sitting by the palm' : 'Sid, sentado junto a la palmera'"
            @pointerdown="onSid" @keydown="onKey"></div>
    </div>
</template>

<style scoped>
    .scene {
        position: absolute;
        inset: 0;
        overflow: hidden;
        background: #73cbcf;
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
        -webkit-tap-highlight-color: transparent;
        outline: none;
    }

    .hit:focus-visible {
        outline: 2px solid rgba(255, 255, 255, 0.85);
        outline-offset: 2px;
    }
</style>
