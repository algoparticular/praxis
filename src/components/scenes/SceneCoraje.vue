<script setup>
    // Coraje: "I recognise my bravery and my inner strength guides my steps". At night Kätus, a little being of fire,
    // sits at the very edge of a grassy cliff of blue crystals, wrapped in his own light, facing a great pale moon with an
    // open mouth, half in the shadow of its stipple; behind him on the grass, a cairn of blue stones and three little pink
    // mushrooms glowing; round them a quiet sky of warm stars and one little spiral galaxy.
    // Its verb is Encender (useKindle.js, the engine of Evolución and Viriya): rubbing Kätus gathers his courage (sparks,
    // a note of the chord climbing with each sixth of the heat; stopping cools it) until his light catches; then he is a
    // sling: pull back and let go, and a flame of his leaps towards the moon, falling a little and bouncing off the edges
    // of the screen. The moon's shadow is six bands of its stipple: every band the flame crosses fills with light (its
    // ink goes and a warm light glows in its place). With the whole moon lit, E7 resolves to A (`resolve`), Kätus stands
    // tall in his light and the rulito the card draws over him is born; then the shadow comes back slowly ("stay standing
    // in your light"). See docs/verbos-y-dinamicas.md.
    // It is also alive: Kätus breathes and his light flickers as a flame does, he blinks now and
    // then and every LOOK s he leans out a little to look up at the moon; his tail stirs on the grass; the mushrooms'
    // light breathes; a sheen crosses the crystals of the cliff now and then; the stars twinkle and a silent shooting star
    // crosses the sky now and then; the galaxy turns slowly; the stipple of the moon trembles and a finger stirs it. A
    // touch anywhere strums the card's chord (`star`) and the stars flare.
    // The sky is not a picture: the card's navy (read by the converter where no layer covers the card), a little deeper
    // towards the top of the screen. Nor is the moon's body: a disc in code, with its rim, the lip of its mouth, its
    // outline and its craters as one picture over it, and its stipple, the stars, Kätus's light and the mushrooms' glow
    // are particles (the mushrooms' caps are pink only with their glow, a light in code). It is drawn in WebGL
    // (useLayerStage): the stars, the moon and the cliff (rock, crystals, grass and stones, line work, Kätus) are planes at
    // their depths. The cliff goes off the right of the card, so the frame rests on the bottom right corner of the screen
    // and the rest is sky: nothing is mirrored. From corajeScene.json and public/assets/coraje (made by
    // scripts/convert-coraje.mjs). The touch target of Kätus is a DOM element over him.
    import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { createParallax } from '../../composables/useParallax.js';
    import { createLayerStage } from '../../composables/useLayerStage.js';
    import { startStardust } from '../../composables/useStardust.js';
    import { createSparks } from '../../composables/useSparks.js';
    import { createKindle, FIRE } from '../../composables/useKindle.js';
    import { play } from '../../composables/useSound.js';
    import { sceneMilestone } from '../../analytics.js';
    import Rulito from '../Rulito.vue';
    import art from '../../composables/corajeScene.json';

    const props = defineProps({
        card: { type: Object, default: () => ({}) },
        active: Boolean
    });

    const root = ref(null);
    const canvas = ref(null);
    const katusHit = ref(null);
    const rulito = ref(null);
    let stageEl = null;
    let stage = null;
    let parallax = null;
    let dust = null;
    let entered = false;
    let gone = false;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ASSETS = '/assets/coraje/';

    // ---- Layout: the illustration is a 2160 square resting on the bottom right corner of the screen (the cliff goes off
    // the card on the right and at the bottom, so a little of it goes under those edges). On a phone upright it is as big
    // as the moon and the cliff allow across; on a wide screen as big as keeps the moon under the card's name
    const SIZE = art.size;
    const B = art.boxes;
    const MOON = art.moon;
    let F = { x: 0, y: 0, size: 1 };
    const k = () => F.size / SIZE;
    const sx = (x) => F.x + x * k();
    const sy = (y) => F.y + y * k();
    const rectOf = ([left, top, w, h]) => ({ left: sx(left), top: sy(top), w: w * k(), h: h * k() });
    const SPAN = 1960;                      // art px across that must be seen on a phone (the moon to the right edge)
    const OVER = 0.025;                     // how much of the frame goes past the right edge (parallax never shows its end)
    const DROP = 0.07;                      // and under the bottom of a wide screen
    const MOON_TOP = B.moon[1];             // the top of the lip of the moon's mouth
    const frameFor = (w, h, size, phone) => ({ x: w - size * (1 - OVER), y: h - size + (phone ? 0.02 : DROP) * size, size });
    // On a wide screen, the biggest frame (up to MAX_H of the height) whose moon keeps clear of the card's name (and of the
    // top of the screen): the moon is a circle with its lip on top, kept GAP px from the name's box
    const MAX_H = 1.3, GAP = 18;
    const LIP = [MOON.x - 395, B.moon[1], 290, 170];      // the lip of its mouth, over the circle (art px)
    const clearOf = (f, title) => {
        const kk = f.size / SIZE;
        const cx = f.x + MOON.x * kk, cy = f.y + MOON.y * kk, r = (MOON.r + 14) * kk;
        if (f.y + MOON_TOP * kk < 8) return false;
        const nx = Math.max(title.left - GAP, Math.min(cx, title.right + GAP)), ny = Math.min(cy, title.bottom + GAP);
        const lip = { left: f.x + LIP[0] * kk, right: f.x + (LIP[0] + LIP[2]) * kk, top: f.y + LIP[1] * kk };
        const lipClear = lip.top > title.bottom + GAP || lip.right < title.left - GAP || lip.left > title.right + GAP;
        return Math.hypot(cx - nx, cy - ny) > r && lipClear;
    };
    const layout = (w, h, title) => {
        const phone = w < h;
        if (phone) {
            F = frameFor(w, h, Math.min(0.8 * h, w * SIZE / SPAN / (1 - OVER)), true);
            return;
        }
        let size = Math.min(MAX_H * h, 0.95 * w);
        while (size > 0.5 * h && !clearOf(frameFor(w, h, size, false), title)) size *= 0.98;
        F = frameFor(w, h, size, false);
    };

    // ---- Depth: px each plane slides at the edge of a swipe
    const SLIDE = 40;
    const SLIDE_Y = 24;
    const zFor = (amp) => amp / (SLIDE + amp);
    const DEPTH = { stars: 3, moon: 8, land: 22 };

    const SKY = art.sky;
    const PALE = 0xcee8e5;                  // the card's colorAlt, the moon's light
    const AURA = art.auraColor, PINK = art.pink;
    const INK = 0x1d1b16;                   // the ink of the moon's stipple
    const ease = (p) => p * p * (3 - 2 * p);
    const mix = (a, b, u) => [16, 8, 0].map((s) => Math.round(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * u));

    // ---- Kätus: his feet (the pivot he breathes and leans about), his tail's root
    const FEET = { x: B.katus[0] + B.katus[2] * 0.52, y: B.katus[1] + B.katus[3] - 6 };
    const TAIL_ROOT = { x: B.tail[0] + 8, y: B.tail[1] + B.tail[3] * 0.62 };
    const LOOK = 11, GAZE = 3.4;            // every LOOK s he leans to look up at the moon, for GAZE s
    let blinkAt = 2.5;
    let leapAt = -10;                       // a touch on him: his light leaps up
    const LEAP = 1.6;

    let time = 0;
    const L = {};


    // ---- Encender: the moon's shadow, lit band by band
    // The stipple of the shadow is split into ZONES bands by its angle round the moon's centre (as many dots in each):
    // each band is two groups of particles, its ink and its light, so it can fill with light on its own
    const ZONES = 6;
    const zones = (() => {
        const dots = art.stipple.map((d) => ({ d, a: Math.atan2(d[1] - MOON.y, d[0] - MOON.x) })).sort((p, q) => p.a - q.a);
        return Array.from({ length: ZONES }, (_, z) => {
            const list = dots.slice(Math.floor(z * dots.length / ZONES), Math.floor((z + 1) * dots.length / ZONES)).map((p) => p.d);
            const cx = list.reduce((s, d) => s + d[0], 0) / list.length, cy = list.reduce((s, d) => s + d[1], 0) / list.length;
            const r = Math.sqrt(list.reduce((s, d) => s + (d[0] - cx) ** 2 + (d[1] - cy) ** 2, 0) / list.length) * 1.5;
            return { dots: list, x: cx, y: cy, r, on: false, lit: 0, flash: 0, pitch: 1 - z / (ZONES - 1) };
        });
    })();
    const inkGroup = (z) => (z === 0 ? 2 : 5 + z);          // group 2 is the first band's ink; the others follow the old groups
    const lightGroup = (z) => 5 + ZONES + z;
    const LIGHT = 0xffe6a6;                 // the warm light that takes the place of the shadow
    const HEAD = [1129, 1112];              // art px: where Kätus's light is, the source of the flame
    const DELAY = 1.3, GROW = 2.2, LINGER = 2.6, EAT = 3.4;
    let win = null;
    let wins = 0;
    let glyph = { left: 0, top: 0, w: 1, h: 1 };
    let W = 1, H = 1;
    let hint = 0;
    let standing = 0;                       // 0..1: Kätus standing tall in his light while the moon is whole
    const sparks = createSparks(420);

    const zoneAt = (z) => L.moon.toScreen(sx(zones[z].x), sy(zones[z].y));
    const headAt = () => L.katus.toScreen(sx(HEAD[0]), sy(HEAD[1]));
    const kindler = createKindle({
        size: () => F.size,
        source: headAt,
        canvas: () => canvas.value,
        sparks,
        busy: () => !!win || reduced,
        speed: [1, 1.8],
        collide: (f) => {
            if (kindler.edges(W, H)) play('tap');
            zones.forEach((zone, z) => {
                if (zone.on) return;
                const p = zoneAt(z);
                if (Math.hypot(p.x - f.x, p.y - f.y) < Math.max(30, zone.r * k())) catchFire(z);
            });
        },
        onKindle: (step) => play('kindle', { step }),
        onIgnite: () => { play('ignite', 1); play('star'); leapAt = time; dust?.boost(3, 1.2); },
        onLaunch: (pull) => { play('ignite', pull); leapAt = time; },
    });

    // A band of the shadow fills with light
    const catchFire = (z) => {
        const zone = zones[z];
        zone.on = true;
        zone.flash = 1;
        const n = zones.filter((q) => q.on).length;
        const p = zoneAt(z);
        sparks.burst(p.x, p.y, { n: 30, colors: [LIGHT, 0xfff6dc, 0xffd29a, 0xffffff], speed: 120, life: 2.2, size: 5, spread: 10 });
        dust?.boost(lightGroup(z), 1.4);
        play('link', { from: (n - 1) / ZONES, to: zone.pitch, level: 0.9 });
        if (n === ZONES) setTimeout(() => { if (!gone) full(); }, 500);
    };
    // The whole moon is lit: E7 resolves to A, Kätus stands tall in his light and the rulito is born over him
    const full = () => {
        if (win) return;
        wins += 1;
        win = { age: 0, head: 0, tail: 0, full: false, fullAt: 0, back: false, pop: 0 };
        kindler.reset();
        rulito.value?.reshape();
        play('resolve');
        dust?.boost(3, 1.6);
        dust?.boost(1, 1.2);
        sceneMilestone('moon_lit', { times: wins });
    };
    const winTick = (t, dt) => {
        let named = 0;
        if (win && rulito.value) {
            win.age += dt;
            win.pop = Math.max(0, win.pop - dt * 2.2);
            win.head = 1 - (1 - Math.min(1, Math.max(0, (win.age - DELAY) / GROW))) ** 1.6;
            if (win.head >= 1 && !win.full) { win.full = true; win.fullAt = win.age; win.pop = 1; leapAt = t; play('rulito'); }
            if (win.full && !win.back && win.age - win.fullAt > LINGER) { win.back = true; zones.forEach((zone) => { zone.on = false; }); }
            if (win.back) win.tail = Math.min(1, win.tail + dt / EAT);
            const whole = Math.min(1, Math.max(0, (win.head - win.tail - 0.6) / 0.4));
            named = Math.max(win.pop, 0.8 * ease(whole));
            const flare = win.full && win.head - win.tail > 0.9 ? Math.max(win.pop, Math.sin(t * 4) * 0.5 + 0.5) : 0;
            rulito.value.frame({ head: win.head, tail: win.tail, flare, t, fade: Math.min(1, (win.head - win.tail) * 14), width: glyph.w });
            L.rulito.refresh();
            L.rulito.scale = 1 + 0.2 * win.pop * win.pop;
            if (win.back && win.tail >= 1) {
                win = null;
                rulito.value.frame({ width: glyph.w });
                L.rulito.refresh();
            }
        }
        stageEl?.style.setProperty('--name-glow', named.toFixed(3));
        stage.bloom = Math.max(named, 0.35 * kindler.charge, kindler.mode === 'flying' ? 0.4 : 0);
        return named;
    };

    // Pressing Kätus: cold, rub him; on fire, take the sling. With the keyboard: Enter rubs, and on fire throws the flame at
    // the nearest band still in shadow
    const press = (event) => {
        if (reduced) { kindle(); return; }
        kindler.press(event);
        if (kindler.mode === 'cold' && !win) leapAt = Math.max(leapAt, time - LEAP * 0.5);
    };
    const nearestShadow = () => {
        const s = headAt();
        const todo = zones.map((_, z) => z).filter((z) => !zones[z].on);
        if (!todo.length) return null;
        return todo.map(zoneAt).reduce((best, p) => (Math.hypot(p.x - s.x, p.y - s.y) < Math.hypot(best.x - s.x, best.y - s.y) ? p : best));
    };

    // The sling, the sparks and the flame in flight
    const flameTick = (t, dt) => {
        kindler.update(t, dt);
        const charge = kindler.charge;
        if (!reduced && charge > 0.15 && Math.random() < dt * (4 + 14 * charge)) {
            const s = headAt();
            sparks.burst(s.x, s.y, { n: 1, colors: FIRE, speed: 20 + 40 * charge, life: 1.1, size: 2.5 + 2.5 * charge, spread: 10 });
        }
        // The hint, without words: still a while, sparks crackle on Kätus (rub him), or on fire his light beats (sling it)
        if (!kindler.rubbing && !kindler.aiming && !win && kindler.mode !== 'flying' && kindler.idle > 7) {
            kindler.idle = 0;
            hint = 1;
            const s = headAt();
            sparks.burst(s.x, s.y, { n: 8, colors: FIRE, speed: 50, life: 0.9, size: 3.5, spread: 8 });
        }
        hint = Math.max(0, hint - dt * 1.4);
        const flying = kindler.mode === 'flying';
        L.flame.x = L.flameCore.x = kindler.flame.x;
        L.flame.y = L.flameCore.y = kindler.flame.y;
        L.flame.opacity = flying ? 0.95 : 0;
        L.flameCore.opacity = flying ? 1 : 0;
        L.flame.scale = 1 + 0.15 * Math.sin(t * 17);
        L.flame.mesh.visible = L.flameCore.mesh.visible = flying;
        L.torch.opacity = Math.min(1, 1.1 * charge * (0.85 + 0.15 * Math.sin(t * 7)) + hint * 0.5);
        L.torch.scale = 0.6 + 0.6 * charge + 0.3 * hint;
    };

    const build = (s) => {
        // The galaxy among the stars
        const far = s.depth(zFor(DEPTH.stars));
        L.far = far;
        L.galaxy = far.image(ASSETS + 'galaxy.webp');
        far.enter({ y: 10, delay: 0, duration: 1600 });
        // The moon: its light, its body (a disc), its stipple (particles, drawn between) and its rim and lines
        const moon = s.depth(zFor(DEPTH.moon));
        L.moonNode = moon;
        L.halo = moon.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: PALE, stops: [[0.3, 0.1], [0.42, 0.04], [0.62, 0]] });
        L.disc = moon.disc({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: MOON.color });
        L.moon = moon.image(ASSETS + 'moon.webp');
        moon.enter({ y: 24, delay: 150, duration: 1800 });
        // The cliff: the rock, the light of its crystals, the grass and the stones, the mushrooms' glow (their caps), the
        // line work, and Kätus with his light
        const land = s.depth(zFor(DEPTH.land));
        L.land = land;
        L.rock = land.image(ASSETS + 'rock.webp');
        L.crystals = land.image(ASSETS + 'crystals.webp', { sheen: 0.8 });
        L.grass = land.image(ASSETS + 'grass.webp');
        L.caps = art.mushrooms.map(() => land.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: PINK, stops: [[0, 1], [0.3, 0.9], [0.48, 0.35], [0.7, 0]] }));
        L.lines = land.image(ASSETS + 'lines.webp');
        L.katus = land.group();
        L.warmth = L.katus.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: AURA, stops: [[0, 0.75], [0.34, 0.5], [0.66, 0]] });
        L.tail = L.katus.image(ASSETS + 'tail.webp');
        L.body = L.katus.image(ASSETS + 'katus.webp');
        L.eye = L.katus.image(ASSETS + 'eye.webp');
        L.torch = L.katus.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: [1, 0.74, 0.35], stops: [[0, 0.75], [0.3, 0.32], [0.62, 0]], bloom: true });
        L.torch.opacity = 0;
        L.rulito = L.katus.canvas(rulito.value.canvas, { bloom: true });
        land.enter({ y: 50, delay: 300, duration: 1900 });
        // The flame in flight, at the focal plane (it does not move with the camera)
        const air = s.depth(0);
        L.flame = air.glow({ rect: { left: -1, top: -1, w: 2, h: 2 }, color: [1, 0.7, 0.32], stops: [[0, 0.9], [0.25, 0.5], [0.62, 0]], bloom: true });
        L.flameCore = air.glow({ rect: { left: -1, top: -1, w: 2, h: 2 }, color: 0xfff6dc, stops: [[0, 1], [0.3, 0.6], [0.6, 0]], bloom: true });
        L.flame.opacity = L.flameCore.opacity = 0;
    };

    // The sky, from the card: its navy, a little deeper towards the top of the screen
    const paintSky = () => {
        const rgb = (c) => `rgb(${c.join(', ')})`;
        const sky = mix(SKY, SKY, 0);
        root.value.style.background = `linear-gradient(to bottom, ${rgb(mix(SKY, 0x0b1a2c, 0.38))} 0%, ${rgb(sky)} 55%, ${rgb(sky)} 100%)`;
    };

    const place = (w, h) => {
        W = w; H = h;
        layout(w, h, titleRect(h));
        paintSky();
        const g = rectOf(B.galaxy);
        L.galaxy.place(g, { x: g.left + g.w / 2, y: g.top + g.h / 2 });
        const r = MOON.r * k(), cx = sx(MOON.x), cy = sy(MOON.y);
        L.disc.place({ left: cx - r, top: cy - r, w: 2 * r, h: 2 * r });
        const hr = r * 2.2;
        L.halo.place({ left: cx - hr, top: cy - hr, w: 2 * hr, h: 2 * hr }, { x: cx, y: cy });
        L.moon.place(rectOf(B.moon));
        L.rock.place(rectOf(B.rock));
        L.crystals.place(rectOf(B.crystals));
        L.grass.place(rectOf(B.grass));
        art.mushrooms.forEach(([x, y, mr], i) => {
            const d = mr * 2.3 * k();
            L.caps[i].place({ left: sx(x) - d / 2, top: sy(y) - d / 2, w: d, h: d }, { x: sx(x), y: sy(y) });
        });
        L.lines.place(rectOf(B.lines));
        L.katus.pivot = { x: sx(FEET.x), y: sy(FEET.y) };
        const ww = B.katus[2] * 2.1 * k(), wh = B.katus[3] * 1.45 * k();
        L.warmth.place({ left: sx(FEET.x) - ww / 2, top: sy(B.katus[1] + B.katus[3] * 0.5) - wh / 2, w: ww, h: wh }, { x: sx(FEET.x), y: sy(FEET.y) });
        L.tail.place(rectOf(B.tail), { x: sx(TAIL_ROOT.x), y: sy(TAIL_ROOT.y) });
        L.body.place(rectOf(B.katus), { x: sx(FEET.x), y: sy(FEET.y) });
        const e = rectOf(B.eye);
        L.eye.place(e, { x: e.left + e.w / 2, y: e.top + e.h / 2 });
        const td = 300 * k();
        L.torch.place({ left: sx(HEAD[0]) - td / 2, top: sy(HEAD[1]) - td / 2, w: td, h: td });
        // The rulito where the card draws it, over Kätus (its canvas is bigger than the glyph, for the glow)
        const rr = rectOf(art.rulito);
        const rw = rr.h * 32 / 86;
        glyph = { left: rr.left + rr.w / 2 - rw / 2, top: rr.top, w: rw, h: rr.h };
        rulito.value.frame({ width: glyph.w });
        L.rulito.place({ left: glyph.left - 0.4375 * glyph.w, top: glyph.top - 0.1628 * glyph.h, w: glyph.w * 1.875, h: glyph.h * 1.3256 },
            { x: glyph.left + glyph.w / 2, y: glyph.top + glyph.h });
        L.rulito.refresh();
        const fd = Math.max(46, 150 * k());
        L.flame.place({ left: -fd / 2, top: -fd / 2, w: fd, h: fd });
        L.flameCore.place({ left: -fd / 5, top: -fd / 5, w: fd / 2.5, h: fd / 2.5 });
    };

    // Where the card's name is (the stage's h1, over the scene), so the moon keeps under it
    const titleRect = (h) => {
        const title = stageEl?.querySelector('h1');
        if (!title || !root.value) return { left: 0, right: 0, bottom: 0.16 * h };
        const r = title.getBoundingClientRect(), area = root.value.getBoundingClientRect();
        return { left: r.left - area.left, right: r.right - area.left, bottom: r.bottom - area.top };
    };

    // The touch target: Kätus
    const placeHit = () => {
        if (!L.katus || !katusHit.value) return;
        const b = L.katus.boxOnScreen(rectOf([B.katus[0] - 30, B.katus[1] - 20, B.katus[2] + 60, B.katus[3] + 30]));
        const bw = Math.max(96, b.width * 1.6), bh = Math.max(112, b.height * 1.3);
        katusHit.value.style.translate = `${(b.left + b.width / 2 - bw / 2).toFixed(1)}px ${(b.top + b.height / 2 - bh / 2).toFixed(1)}px`;
        katusHit.value.style.width = `${bw.toFixed(1)}px`;
        katusHit.value.style.height = `${bh.toFixed(1)}px`;
    };

    // A touch anywhere: the chord strummed, the stars flare
    const strum = () => {
        play('star');
        if (reduced) return;
        dust?.boost(1, 0.9);
        dust?.boost(0, 0.5);
    };
    // A touch on Kätus: his light leaps up
    const kindle = () => {
        play('star');
        if (reduced) return;
        if (time - leapAt > LEAP * 0.6) leapAt = time;
        dust?.boost(3, 1);
    };
    const onKey = (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        if (reduced) { kindle(); return; }
        kindler.key(nearestShadow);
    };

    // Shooting stars, silent: now and then one crosses the sky over the moon and is gone, with a tail of dots
    const TAIL = 22;
    const shooter = { at: 6, x: 0, y: 0, dx: 0, dy: 0, T: 1 };
    const shooting = {
        count: TAIL,
        update(t, data) {
            if (!stage) return;
            const w = stage.width, h = stage.height, f = shooter;
            if (t > f.at + f.T) {
                const side = Math.random() < 0.5 ? -1 : 1, speed = (0.32 + Math.random() * 0.25) * Math.max(w, h);
                f.at = t + 6 + Math.random() * 10;
                f.T = 0.7 + Math.random() * 0.5;
                f.x = w * (0.15 + Math.random() * 0.7);
                f.y = Math.max(titleRect(h).bottom, h * 0.05) + Math.random() * h * 0.22;
                f.dx = side * speed;
                f.dy = speed * (0.3 + Math.random() * 0.3);
            }
            const u = (t - f.at) / f.T;
            for (let j = 0; j < TAIL; j++) {
                if (u < 0 || u > 1) { data.alphas[j] = 0; continue; }
                const life = Math.max(0, u - j * 0.006);
                data.positions[j * 3] = f.x + f.dx * life * f.T;
                data.positions[j * 3 + 1] = f.y + f.dy * life * f.T;
                data.sizes[j] = j ? Math.max(2, 6.5 - j * 0.22) : 10;
                data.alphas[j] = Math.min(1, Math.sin(u * Math.PI) * 1.4) * (1 - j / TAIL) ** 0.7;
                const c = j < 3 ? 0xfff6e6 : 0xf6d48a;
                data.tints[j * 3] = (c >> 16 & 255) / 255;
                data.tints[j * 3 + 1] = (c >> 8 & 255) / 255;
                data.tints[j * 3 + 2] = (c & 255) / 255;
            }
        },
    };

    // The card's stars over the whole screen: in the frame where the card has them, and round it the same field again,
    // mirrored, wherever the screen goes on past the frame (off the frame only)
    const starPoints = (w, h) => {
        const out = [];
        const S = F.size;
        for (let i = -Math.ceil(F.x / S) - 1; i <= 1; i++) {
            for (let j = -Math.ceil(F.y / S) - 1; j <= 0; j++) {
                for (const [x, y, r, c] of art.stars) {
                    const ax = i % 2 ? SIZE - x : x, ay = j % 2 ? SIZE - y : y;
                    const px = F.x + i * S + ax * k(), py = F.y + j * S + ay * k();
                    if ((i || j) && px > F.x && py > F.y) continue;
                    if (px < -20 || px > w + 20 || py < -20 || py > h + 20) continue;
                    out.push([px, py, Math.max(1.8, 2 * r * k() * 1.1), c]);
                }
            }
        }
        return out;
    };

    const enter = () => {
        if (entered || !props.active || !stage) return;
        entered = true;
        stage.ready().then(() => { if (!gone) { stage.start(); dust?.reveal(); } });
    };

    let frames = 0;
    const frame = ({ x, y, scroll, t, ramp }) => {
        if (!stage || !L.katus) return;
        const dt = Math.min(0.1, Math.max(0, t - time));
        time = t;
        stage.look(x * SLIDE, y * SLIDE_Y);

        // ---- The sky: the galaxy turns, the moon's light breathes
        L.galaxy.rotate = -t * 4 * ramp;
        L.halo.opacity = 0.85 + 0.15 * Math.sin(t * 0.4) * ramp;
        L.far.y = scroll * 6;
        L.moonNode.y = scroll * 12;
        L.land.y = scroll * 30;

        // ---- The mushrooms' light breathes, each at its own pace
        L.caps.forEach((cap, i) => {
            const b = Math.sin(t * (0.9 + 0.23 * i) + i * 2) * 0.5 + 0.5;
            cap.opacity = 0.8 + 0.2 * b * ramp;
            cap.scale = 1 + 0.08 * b * ramp;
        });

        // ---- Kätus: he breathes, his light flickers as a flame, he blinks, and now and then looks up at the moon
        // ---- The game: the flame, the moon's shadow filling with light band by band, the rulito
        const named = reduced ? 0 : winTick(t, dt);
        if (!reduced) flameTick(t, dt);
        let litCount = 0;
        zones.forEach((zone, z) => {
            zone.lit += ((zone.on ? 1 : 0) - zone.lit) * Math.min(1, dt * (zone.on ? 3 : 0.35));
            zone.flash = Math.max(0, zone.flash - dt * 1.1);
            litCount += zone.lit;
            dust?.fade(inkGroup(z), 1 - 0.92 * zone.lit);
            dust?.fade(lightGroup(z), Math.min(1, 0.75 * zone.lit + 0.5 * zone.flash));
        });
        const moonLit = litCount / ZONES;

        const leap = reduced ? 0 : Math.max(0, 1 - (t - leapAt) / LEAP);
        // Standing in his light: while the moon is whole he is taller and brighter
        const tall = win && !win.back ? 1 : 0;
        standing += (tall - standing) * Math.min(1, dt * 1.5);
        const up = Math.max(leap > 0 ? Math.sin((1 - leap) * Math.PI) : 0, 0.6 * standing);
        const p = (Math.max(0, t - 4) % LOOK) / GAZE;
        const gaze = p < 1 ? ease(Math.min(1, p * 3)) * ease(Math.min(1, (1 - p) * 3)) : 0;
        const breath = Math.sin(t * 1.1);
        L.body.sy = 1 + (0.018 * breath + 0.06 * up) * ramp;
        L.body.sx = 1 - (0.008 * breath + 0.02 * up) * ramp;
        L.katus.rotate = -3.5 * gaze * ramp;
        L.katus.x = -4 * k() * gaze * ramp;
        // The eye goes with the head (the top of him, as he stretches) and blinks
        if (t > blinkAt + 0.16) blinkAt = t + 2.5 + Math.random() * 4.5;
        const blink = t > blinkAt && t < blinkAt + 0.16 ? Math.sin((t - blinkAt) / 0.16 * Math.PI) : 0;
        L.eye.sy = 1 - 0.85 * blink * ramp;
        L.eye.y = -(L.body.sy - 1) * (FEET.y - (B.eye[1] + B.eye[3] / 2)) * k();
        L.eye.x = -1.5 * k() * gaze * ramp;
        const flicker = (Math.sin(t * 7.3) * 0.5 + Math.sin(t * 11.1 + 1) * 0.3 + Math.sin(t * 3.1) * 0.2);
        L.warmth.opacity = 0.8 + 0.12 * flicker * ramp + 0.4 * up;
        L.warmth.scale = 1 + (0.03 * flicker + 0.18 * up) * ramp;
        L.warmth.sy = 1 + 0.12 * up;
        L.body.uniforms.uBright.value = 1 + 0.08 * up + 0.12 * kindler.charge + 0.15 * named;
        dust?.fade(3, Math.min(1, 0.85 + 0.1 * flicker + 0.3 * up + 0.3 * kindler.charge));
        L.halo.opacity = Math.min(1, L.halo.opacity + 0.6 * moonLit);
        L.halo.scale = 1 + 0.1 * moonLit;
        // His tail stirs on the grass
        L.tail.rotate = (2.2 * Math.sin(t * 0.7) + 1.2 * Math.sin(t * 1.9 + 1)) * ramp;

        // The particles that belong to a layer follow it
        const far = stage.drift(L.far.z), moon = stage.drift(L.moonNode.z), land = stage.drift(L.land.z);
        dust?.shift(0, far.x * 0.6, far.y * 0.6 + L.far.y);
        dust?.shift(1, far.x, far.y + L.far.y);
        zones.forEach((_, z) => {
            dust?.shift(inkGroup(z), moon.x, moon.y + L.moonNode.y);
            dust?.shift(lightGroup(z), moon.x, moon.y + L.moonNode.y);
        });
        // Kätus's light goes with him as he leans
        const kx = land.x + L.katus.x, ky = land.y + L.land.y;
        dust?.turn(3, L.katus.rotate, sx(FEET.x), sy(FEET.y));
        dust?.shift(3, kx, ky);
        dust?.shift(4, land.x, land.y + L.land.y);
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
        stage.onResize((w, h) => place(w, h));
        const before = (node) => node.mesh.renderOrder - 0.5;
        const after = (node) => node.mesh.renderOrder + 0.5;
        const fromArt = (list, color, scale = 1) => list.map(([x, y, r]) => [sx(x), sy(y), Math.max(1.2, 2 * r * k() * scale), color]);
        const inkOf = (z) => ({ colors: [INK], look: 'hard', parallax: 0, drift: 0.8, jitter: 0.35, twinkle: 0, reach: 80, push: 12, order: before(L.moon),
            points: () => fromArt(zones[z].dots, INK, 1.75) });
        dust = startStardust(null, {
            stage,
            manual: true,
            groups: [
                // 0: far tiny stars, faint, hardly moving with the pointer
                { count: 260, colors: [0xfaf0dc, 0xf6d9a8, 0xd8ecea], size: [1, 2.4], drift: 1.5, twinkle: 0.8, reach: 0, parallax: 0, opacity: 0.6, order: 0.1 },
                // 1: the card's stars, warm, twinkling; a finger stirs them
                { colors: [0xfec88a], look: 'hard', parallax: 0, drift: 2, twinkle: 0.5, reach: 110, push: 22, order: 0.12, points: starPoints },
                // 2: the moon's stipple (its first band; the others are 6 to 10), trembling a little; a finger stirs it
                inkOf(0),
                // 3: Kätus's light, alive as a flame
                { colors: [AURA], parallax: 0, drift: 2.2, jitter: 0.7, twinkle: 0.5, reach: 50, push: 8, order: after(L.warmth), points: () => fromArt(art.aura, AURA, 2) },
                // 4: the mushrooms' glow
                { colors: [PINK], parallax: 0, drift: 1.2, jitter: 0.4, twinkle: 0.45, reach: 50, push: 6, order: before(L.lines), points: () => fromArt(art.spores, PINK, 1.8) },
                // 5: a shooting star now and then
                { colors: [0xffffff], dynamic: shooting, parallax: 0, drift: 0, twinkle: 0, reach: 0, look: 'soft', order: 0.13 },
                // 6-10: the other bands of the moon's stipple; 11-16: the light that takes the place of each band
                ...zones.slice(1).map((_, z) => inkOf(z + 1)),
                ...zones.map((zone) => ({ colors: [LIGHT], look: 'soft', parallax: 0, drift: 1.2, jitter: 0.5, twinkle: 0.5, reach: 80, push: 12, bloom: true,
                    order: before(L.moon) + 0.01, points: () => fromArt(zone.dots, LIGHT, 2.6) })),
                // 17: the sling; 18: sparks
                { colors: [0xffffff], dynamic: kindler.aimGroup, parallax: 0, drift: 0, twinkle: 0, reach: 0, look: 'hard', order: 1e6 - 1 },
                { ...sparks.group(), order: 1e6 },
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
        kindler.destroy();
        stageEl?.style.removeProperty('--name-glow');
    });
</script>

<template>
    <div class="scene" ref="root" @click="strum">
        <canvas class="stageCanvas" ref="canvas"></canvas>
        <!-- The rulito is drawn on its own canvas, which the stage shows over Kätus -->
        <Rulito ref="rulito" class="offstage" color="#fec88a" />
        <div ref="katusHit" class="hit" role="button" tabindex="0"
            :aria-label="$i18n.locale === 'en' ? 'Kätus: rub him until his light catches, then pull back and let go to light the moon' : 'Kätus: frotalo hasta que su luz se encienda, después tirá hacia atrás y soltá para encender la luna'"
            @pointerdown.prevent="press" @click.stop @keydown="onKey"></div>
    </div>
</template>

<style scoped>
    .scene {
        position: absolute;
        inset: 0;
        overflow: hidden;
        background: #22486d;
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
        touch-action: none;                    /* rubbing and pulling drag the finger: not a scroll */
        -webkit-touch-callout: none;
        user-select: none;
        -webkit-user-select: none;
        -webkit-tap-highlight-color: transparent;
        outline: none;
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
