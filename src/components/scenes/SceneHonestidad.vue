<script setup>
    // Honestidad: honesty, "I am honest with myself and the truth guides my steps". Deep in a teal sea a jellyfish
    // meditates with its eyes closed, a blue aura round its bell, and from the light at the surface two strands of golden
    // dots come down, twisting round each other, to the point of light on its forehead: the truth heard inside. Bubbles
    // hang in the water; on the floor, between two dark seaweeds, two teal corals, two yellow anemones in blue pots and a
    // pink coral in the middle.
    // Its verb is Resonar as an echo ("listen to your truth, quieting outside voices and patterns"): the truth comes down
    // the thread, a short phrase of the card's chord, Gm7, each note a light that runs down from the surface and sounds as
    // it reaches the third eye, with a rhythm of its own. But the six bubbles are voices from outside: each now and then
    // wobbles, glows and sings a stray note out of the phrase's time, and while any of them is awake the phrase is half
    // drowned (dim lights, a faint bell). A touch on a bubble quiets it: it dims and sinks a little, and stops singing.
    // With the six quiet the phrase comes down clean, and four beads over the jellyfish's head show its rhythm (spaced as
    // its notes are, each lit as its note arrives). Then the person repeats it by touching the jellyfish in that rhythm:
    // an echo of when, not of what (there is one being). Each touch in time (against the one before, `IN_TIME`) sounds the
    // next note of the phrase and fills the next bead; a touch out of time (or none in time) is a muted drop and the phrase
    // comes down again, slower. Repeated whole, the thread shines whole, the eye opens (`open`; Gm7 is a minor seventh,
    // stable: it does not resolve) and the rulito is born over its head. Then the voices come back, one by one, and another
    // phrase comes down. Left alone a long time (`WAKE`), a quiet bubble wakes again by itself.
    // Without words: on its own it sings with lights only, in silence (as every scene), the phrase drowned by the bubbles'
    // flashes; touching the jellyfish while voices are awake makes them all crowd in at once; left alone, an awake bubble
    // swells and breathes (quiet me), and on the person's turn the eye and its glow breathe (touch here), and after `AGAIN`
    // s the phrase comes down again.
    // It is alive: the jellyfish swims in place, its bell squeezing now and then and its tentacles trailing and swaying
    // (wind, from the top), rising a little with each stroke and sinking back; its aura breathes with it. The bubbles bob
    // and wobble, the seaweeds, corals and anemones sway in the current, the specks of the water rise slowly and move out
    // of a finger's way. A touch on the water strums the chord (`star`, silent on the person's turn) and the stipple
    // flares.
    // The water is not a picture: its colour read from the card by the converter, with the light of the water (caustics)
    // drifting across it; nor is the light at the surface: a glow in code and, over it, the whole light as a dense
    // stipple of live particles, sampled from the card (its `cloud`, scripts/sun-cloud.mjs) as Pañña's sun is, with no
    // solid disc under it, so the edge of a circle never shows. The thread, the aura, the specks of the water and the stipple round the seaweeds and anemones are
    // particles too. Drawn in WebGL (useLayerStage): the bubbles (one atlas), the jellyfish and the floor are planes at
    // their depths; on a wide screen the floor goes on past the frame with more seaweed and coral, smaller and farther
    // back. From honestidadScene.json and public/assets/honestidad (made by scripts/convert-honestidad.mjs).
    import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { createParallax } from '../../composables/useParallax.js';
    import { createLayerStage } from '../../composables/useLayerStage.js';
    import { startStardust } from '../../composables/useStardust.js';
    import { decodeCloud, sampleCloud } from '../../composables/stippleCloud.js';
    import { createSparks } from '../../composables/useSparks.js';
    import { play } from '../../composables/useSound.js';
    import { sceneMilestone } from '../../analytics.js';
    import Rulito from '../Rulito.vue';
    import art from '../../composables/honestidadScene.json';

    const props = defineProps({
        card: { type: Object, default: () => ({}) },
        active: Boolean
    });

    const root = ref(null);
    const canvas = ref(null);
    const jellyHit = ref(null);
    const rulito = ref(null);
    const bubbleHits = ref([]);
    let stageEl = null;
    let stage = null;
    let parallax = null;
    let dust = null;
    let entered = false;
    let gone = false;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ---- Layout: the illustration is a 2160 square resting on the bottom of the screen (a little of it under the
    // edge, so the floor never shows a gap as the camera moves). On a phone upright it is as big as the corals allow
    // across; on a wide screen the light at the surface keeps under the card's name (both are yellow), and the floor goes
    // on past the frame on both sides
    const SIZE = art.size;
    const B = art.boxes;
    const SUN = art.sun;
    const SUN_CLOUD = decodeCloud(SUN.cloud);
    const EYE = art.eye;
    let F = { x: 0, y: 0, size: 1 };
    const k = () => F.size / SIZE;
    const sx = (x) => F.x + x * k();
    const sy = (y) => F.y + y * k();
    const rectOf = ([left, top, w, h]) => ({ left: sx(left), top: sy(top), w: w * k(), h: h * k() });
    const SPAN = 1500;                      // art px across that must be seen on a phone (most of the two teal corals)
    const DROP = 0.02;                      // how much of the frame goes under the bottom of the screen
    const SUN_TOP = SUN.r + 70;             // how far above the sun's centre its stipple and glow reach (art px)
    const layout = (w, h) => {
        const phone = w < h;
        let size;
        if (phone) size = Math.min(0.72 * h, w * SIZE / SPAN);
        else {
            // As big as fits between the name (with the whole sun under it) and the bottom
            const room = h - titleBottom(h) - 10;
            size = Math.min(Math.max(0.62 * w, 0.55 * h), 0.9 * h, room / (1 - DROP + (SUN_TOP - SUN.y) / SIZE));
        }
        F = { x: w / 2 - size / 2, y: h - size * (1 - DROP), size };
    };

    // Where the card's name ends (the stage's h1, over the scene)
    const titleBottom = (h) => {
        const title = stageEl?.querySelector('h1');
        if (!title || !root.value) return 0.19 * h;
        return title.getBoundingClientRect().bottom - root.value.getBoundingClientRect().top;
    };

    const SLIDE = 50;
    const SLIDE_Y = 14;
    const zFor = (amp) => amp / (SLIDE + amp);
    const DEPTH = { water: 1, sun: 4, bubbles: [7, 11, 15], jelly: 13, beyond: 18, seaweed: 22, corals: 26, anemones: 30, coral: 33 };

    const SUN_YELLOW = SUN.color;
    const THREAD = 0xffe47c;
    const AURA = 0x00b4d7;
    const DUST = 0x0a9a8a;
    const INK = 0x132c3d;
    const WATER = art.water[Math.floor(art.water.length / 2)][1];
    const ease = (p) => p * p * (3 - 2 * p);

    // ---- The bubbles: cut out of the illustration (one atlas), each at its own depth, bobbing and wobbling
    const [AW, AH] = art.atlas;
    const bubbles = art.bubbles.map(([x, y, w, h, ax, ay], i) => ({
        i, box: [x, y, w, h], crop: [ax / AW, ay / AH, w / AW, h / AH], depth: i % 3, phase: i * 1.7 + 0.4, wobble: 0,
        rest: { left: 0, top: 0, w: 1, h: 1 },
        // the game: a voice from outside, awake (singing now and then) or quiet
        quiet: false, q: 0, quietAt: 0, wakeAt: null, voice: 0, nextSing: 1.5 + i * 0.9 + Math.random() * 2, step: 0.5,
    }));

    // ---- The floor beyond the frame on a wide screen: more seaweed and teal coral, smaller and farther back, so it
    // does not read as the frame mirrored. [picture, mirrored, scale, overlap with the previous one (fraction of its width)]
    const BEYOND = [['coralR', false, 0.8, 0.3], ['seaweed', true, 0.8, 0.45], ['coralL', true, 0.66, 0.2], ['seaweed', false, 0.68, 0.45],
        ['coralR', true, 0.74, 0.2], ['seaweed', true, 0.76, 0.45]];

    // ---- The jellyfish swims in place: a stroke every STROKE s (its bell squeezes, it rises a little and sinks back)
    const STROKE = 5.2;
    const THREAD_EVERY = 7;                 // while voices are awake, the phrase comes down (drowned) this often (s)
    let strokeAt = 0.8;                     // when the last stroke began
    let eyeFlash = 0;
    let lastT = 0;
    let now = 0;
    const L = {};

    const stroke = (t) => {
        const p = Math.max(0, t - strokeAt) / STROKE;
        if (p >= 1) return 0;
        // Quick to squeeze, slow to open again
        return p < 0.16 ? Math.sin(p / 0.16 * Math.PI / 2) : 1 - ease((p - 0.16) / 0.84);
    };
    const rise = (t) => {
        const p = Math.max(0, t - strokeAt) / STROKE;
        return p >= 1 ? 0 : Math.sin(Math.min(1, p * 1.3) * Math.PI) ** 2;
    };

    // ---- The game. The phrase: four notes with a rhythm (`beats`, in beats from the first) and a melody (`steps`, 0..1
    // across the chord as `sing` and `resonate` count it: in Gm7 0 Sol, 0.25 Si♭, 0.5 Re, 0.75 Fa, 1 the Sol above)
    const RHYTHMS = [[0, 1, 2, 2.5], [0, 1, 1.5, 2.5], [0, 0.5, 1, 2], [0, 1.5, 2, 3], [0, 0.5, 1.5, 2]];
    const MELODIES = [[1, 0.75, 0.5, 0], [0.5, 0.75, 1, 0.5], [0, 0.25, 0.5, 0.75], [0.75, 0.5, 0.25, 0.5], [1, 0.5, 0.75, 0.25]];
    const BEAT = 0.5;                       // s per beat of the phrase
    const SLOWER = 1.25, BEAT_MAX = 0.8;    // each time it has to come down again after a mistake
    const IN_TIME = 0.45, IN_TIME_MIN = 0.14;   // a touch is in time when its gap to the one before is this close (share of the gap, s)
    const RUN_NOTE = 1.5;                   // s a note takes to come down the thread
    const HINT = 3.5;                       // s alone on the person's turn before the eye breathes
    const AGAIN = 7;                        // s alone on the person's turn before the phrase comes down again
    const NOISE_HINT = 7;                   // s alone while voices are awake before one of them swells and breathes
    const WAKE = 35;                        // s alone before a quiet bubble wakes again
    const WAKE_STEP = 1.8;                  // after the rulito, the voices come back one after another
    const DELAY = 1.1, GROW = 2.2, KEEP = 2.8, EAT = 3.4;    // the rulito: born, kept, gone
    let phrase = null;
    const newPhrase = (last) => {
        let p;
        do {
            p = { beats: RHYTHMS[Math.floor(Math.random() * RHYTHMS.length)], steps: MELODIES[Math.floor(Math.random() * MELODIES.length)] };
        } while (last && p.beats === last.beats);
        return p;
    };
    phrase = { beats: RHYTHMS[0], steps: MELODIES[0] };
    let mode = 'noise';                     // 'noise': voices awake; 'sing': the clean phrase (about to) come down; 'answer'; 'win'
    let beat = BEAT;
    let heard = false;                      // someone touched the scene: from then on it sounds
    let singing = null;                     // { clean, arrivals: [scene time per note], next }: a phrase coming down
    let singAt = null;                      // when the clean phrase comes down next
    let drownAt = 2.5;                      // when the drowned phrase comes down next (while voices are awake)
    let got = 0;                            // notes repeated in time so far
    let prevTouch = 0;                      // when the last note of the echo was touched (clock(): real time, not frames)
    const clock = () => performance.now() / 1000;
    let answerSince = 0;
    let sung = 0;                           // times the clean phrase came down before it was repeated
    let wins = 0;
    let win = null;
    let lastTouch = -Infinity;
    let squeeze = 0;                        // the bell squeezing on a touch in time
    let lost = 0;                           // the jellyfish dimmed for a moment after a touch out of time
    let beckon = 0;                         // the eye breathing on the person's turn (the hint)
    let crowd = 0;                          // how much the voices cover the thread now
    let whole = 0;                          // the thread shining whole (the win)
    let beads = 0;                          // how much the beads show
    const beadShine = [0, 0, 0, 0];
    let glyph = { left: 0, top: 0, w: 1, h: 1 };
    const lights = [];                      // lights running down the thread: { at, run, level }
    const sparks = createSparks(220);
    const awake = () => bubbles.filter((b) => !b.quiet);
    const rand = (a, b) => a + Math.random() * (b - a);
    const gapOf = (j) => (phrase.beats[j] - phrase.beats[j - 1]) * beat;
    const tolOf = (j) => Math.max(IN_TIME_MIN, IN_TIME * gapOf(j));

    const eyeAt = () => L.jelly.toScreen(sx(EYE[0]), sy(EYE[1]));
    const bubbleAt = (b) => { const r = L.bubbles[b.i].boxOnScreen(b.rest); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width }; };

    // A phrase comes down the thread: one light per note, each arriving at the eye on its beat
    const descend = (clean) => {
        const at = now + RUN_NOTE;
        singing = { clean, arrivals: phrase.beats.map((b) => at + b * beat), next: 0 };
        singing.arrivals.forEach((a) => lights.push({ at: a - RUN_NOTE, run: RUN_NOTE, level: clean ? 1 : 0.45 }));
        if (clean) { sung += 1; got = 0; }
    };
    const arrive = (j) => {
        const clean = singing.clean;
        const step = phrase.steps[j];
        if (clean) {
            if (heard) play('resonate', { step });
            eyeFlash = 1;
            beadShine[j] = 1;
            const e = eyeAt();
            sparks.burst(e.x, e.y, { n: 8, colors: [THREAD, 0xfff3b0], speed: 50, size: 3.6, spread: 4, life: 1.1 });
        } else {
            // Half drowned: a faint bell, and as often as not a voice sings over it
            if (heard) play('pulse', { step });
            eyeFlash = Math.max(eyeFlash, 0.4);
            const voices = awake();
            if (voices.length && Math.random() < 0.7) {
                const b = voices[Math.floor(Math.random() * voices.length)];
                b.nextSing = Math.min(b.nextSing, now + rand(0.05, 0.2));
            }
        }
    };

    // A voice from outside sings a stray note, out of the phrase's time
    const voiceOf = (b, level = 1) => {
        b.voice = Math.max(b.voice, level);
        b.wobble = Math.max(b.wobble, 0.6 * level);
        b.step = [0, 0.25, 0.5, 0.75, 1][Math.floor(Math.random() * 5)];
        b.nextSing = now + rand(3, 7);
        if (heard) play('sing', { step: b.step, length: rand(0.25, 0.5) });
        const p = bubbleAt(b);
        sparks.burst(p.x, p.y, { n: 5, colors: [0xc8f2ff, 0xe6fbff], speed: 40, size: 3, spread: p.w * 0.3, life: 0.9 });
    };
    const wake = (b) => {
        b.quiet = false;
        b.wakeAt = null;
        voiceOf(b);
        // A voice back: the phrase is drowned again (half repeated, it starts again)
        if (mode === 'sing' || mode === 'answer') {
            mode = 'noise';
            got = 0;
            singAt = null;
            if (singing) singing.clean = false;
            drownAt = now + 3;
        }
    };

    // ---- Touching a bubble: it is quieted
    const touchBubble = (i) => {
        const b = bubbles[i];
        lastTouch = now;
        b.wobble = Math.max(b.wobble, 0.5);
        if (reduced || mode === 'win') { play('tap'); return; }
        heard = true;
        if (b.quiet) return;
        b.quiet = true;
        b.quietAt = now;
        b.voice = 0;
        play('quiet', { step: b.step });
        const p = bubbleAt(b);
        sparks.burst(p.x, p.y, { n: 10, colors: [0x7fd6d0, 0xc8f2ff], speed: 30, size: 3, spread: p.w * 0.35, life: 1.4 });
        // The six quiet: the phrase comes down clean
        if (!awake().length) {
            mode = 'sing';
            singing = null;
            singAt = now + 1.4;
        }
    };

    // ---- Touching the jellyfish: the echo, on the person's turn
    const miss = () => {
        play('miss');
        lost = 1;
        got = 0;
        beat = Math.min(BEAT_MAX, beat * SLOWER);
        mode = 'sing';
        singAt = now + 1.3;
    };
    const touchJelly = () => {
        lastTouch = now;
        if (reduced) { play('star'); return; }
        heard = true;
        if (mode === 'win') { play('tap'); return; }
        if (mode === 'noise') {
            // The voices crowd in: the truth cannot be heard over them
            if (now - strokeAt > STROKE * 0.45) strokeAt = now;
            awake().forEach((b) => { b.nextSing = now + rand(0, 0.25); b.voice = Math.max(b.voice, 0.3); });
            return;
        }
        if (mode === 'sing') {
            // Listening; between the quiet and the phrase, a touch asks for it now
            if (!singing && singAt !== null) singAt = Math.min(singAt, now + 0.3);
            squeeze = Math.max(squeeze, 0.3);
            return;
        }
        // The answer: the first touch starts it, every other one has to keep the phrase's time
        const at = clock();
        if (got > 0 && Math.abs(at - prevTouch - gapOf(got)) > tolOf(got)) { miss(); return; }
        play('resonate', { step: phrase.steps[got] });
        prevTouch = at;
        got += 1;
        squeeze = 1;
        eyeFlash = 1;
        dust?.boost(1, 0.5);
        const e = eyeAt();
        sparks.burst(e.x, e.y, { n: 12, colors: [THREAD, 0xfff3b0, AURA], speed: 70, size: 4, spread: 6, life: 1.3 });
        if (got === phrase.beats.length) {
            mode = 'win';
            setTimeout(() => { if (!gone) complete(); }, 400);
        }
    };
    // Repeated whole: the thread shines whole, the eye opens, the rulito is born over its head (Gm7 is a minor seventh,
    // calm: it does not ask to resolve)
    const complete = () => {
        wins += 1;
        win = { age: 0, head: 0, tail: 0, full: false, fullAt: 0, back: false, pop: 0 };
        rulito.value?.reshape();
        play('open');
        sceneMilestone('echo_sung', { times: wins, tries: sung });
        eyeFlash = 1;
        dust?.boost(1, 1);
        dust?.boost(2, 1);
        lights.push({ at: now, run: RUN_NOTE * 0.8, level: 1 });
    };

    // A touch on the water: the chord (silent while the phrase is listened to or answered), the stipple flares and the
    // bubbles near the finger wobble
    const strum = (event) => {
        lastTouch = now;
        if (!reduced) heard = true;
        if (reduced || mode === 'noise' || mode === 'win') play('star');
        dust?.boost(0, 0.7);
        dust?.boost(3, 0.6);
        dust?.boost(4, 0.8);
        if (!L.bubbles || !canvas.value) return;
        const area = canvas.value.getBoundingClientRect();
        const fx = event.clientX - area.left, fy = event.clientY - area.top;
        bubbles.forEach((b) => {
            const c = bubbleAt(b);
            const d = Math.hypot(c.x - fx, c.y - fy);
            if (d < Math.max(90, c.w * 3)) b.wobble = Math.max(b.wobble, 1 - d / Math.max(90, c.w * 3) * 0.5);
        });
    };
    // Enter or space is a touch (held down, it does not repeat: the echo is in the touches)
    const onKey = (event, action) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        if (!event.repeat) action();
    };

    // The thread of light, as a group of its own: each dot where the card draws it, carried from the sun at the top to
    // the jellyfish at the bottom, swaying a little, with the lights of the phrase running down it (dimmer while the
    // voices cover it) and, at the win, shining whole
    const THREAD_N = art.thread.length + 1;
    const sunY = art.thread[0][1], eyeY = EYE[1];
    const threadGroup = {
        count: THREAD_N,
        update(t, data) {
            // Where the sun and the eye are now against where they rest (the camera, the strokes)
            const top = L.sunNode.toScreen(sx(SUN.x), sy(SUN.y)), eye = L.jelly.toScreen(sx(EYE[0]), sy(EYE[1]));
            const sunOff = { x: top.x - sx(SUN.x), y: top.y - sy(SUN.y) }, jellyOff = { x: eye.x - sx(EYE[0]), y: eye.y - sy(EYE[1]) };
            const runs = lights.map((l) => [(t - l.at) / l.run, l.level]).filter(([p]) => p > -0.2 && p < 1.2);
            const veil = 1 - 0.3 * crowd;
            for (let i = 0; i < THREAD_N; i++) {
                const [ax, ay, r] = i < THREAD_N - 1 ? art.thread[i] : EYE;
                const u = Math.min(1, Math.max(0, (ay - sunY) / (eyeY - sunY)));
                const sway = reduced ? 0 : Math.sin(t * 0.9 + ay * 0.012) * 6 * k() * Math.sin(u * Math.PI);
                data.positions[i * 3] = sx(ax) + sway + sunOff.x + (jellyOff.x - sunOff.x) * u;
                data.positions[i * 3 + 1] = sy(ay) + sunOff.y + (jellyOff.y - sunOff.y) * u;
                let light = 0;
                runs.forEach(([p, level]) => { light = Math.max(light, level * Math.exp(-(((u - p) / 0.08) ** 2))); });
                light = Math.max(light, 0.55 * whole * (0.8 + 0.2 * Math.sin(t * 3 - u * 6)));
                const eye = i === THREAD_N - 1;
                data.sizes[i] = Math.max(1.8, 2.3 * r * k()) * (1 + 0.7 * light + (eye ? 0.5 * eyeFlash + 0.8 * whole : 0));
                data.alphas[i] = Math.min(1, (0.82 + 0.1 * Math.sin(t * 2 + i)) * veil + 0.45 * light);
                data.tints.set([1, 0.89 + 0.1 * light, 0.49 + 0.45 * light], i * 3);
            }
        },
    };

    // ---- Four beads over the jellyfish's head, one per note of the phrase, spaced as its notes are in time (the rhythm
    // to repeat, seen): each lights as its note reaches the eye, and fills as it is repeated in time
    const BEADS_AT = [1081, 590];           // art px: the middle of the row, over the bell
    const BEADS_SPAN = 420;                 // art px across, from the first note to the last (at least 150 px on screen)
    const beadAt = (j) => {
        const p = L.jelly.toScreen(sx(BEADS_AT[0]), sy(BEADS_AT[1]));
        const span = Math.max(150, BEADS_SPAN * k());
        const last = phrase.beats[phrase.beats.length - 1];
        return { x: p.x + (phrase.beats[j] / last - 0.5) * span, y: p.y };
    };
    const rgb = (c) => [((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255];
    const NAVY = rgb(0x143246), GOLD = rgb(THREAD), PALE = rgb(0xfff8dc);
    const beadGroup = {
        count: 8,
        update(t, data) {
            const size = 0.8 + 0.2 * Math.min(1, F.size / 600);
            for (let j = 0; j < 4; j++) {
                const ring = j, dot = j + 4;
                if (beads < 0.01 || !L.jelly) {
                    data.alphas[ring] = data.alphas[dot] = 0;
                    data.sizes[ring] = data.sizes[dot] = 0;
                    continue;
                }
                const p = beadAt(j);
                const done = j < got && mode !== 'sing';
                const sh = beadShine[j];
                [ring, dot].forEach((i) => { data.positions[i * 3] = p.x; data.positions[i * 3 + 1] = p.y; });
                data.sizes[ring] = (done ? 15 : 12 + 3 * sh) * size;
                data.sizes[dot] = (done ? 12 : 7 + 5 * sh) * size;
                data.alphas[ring] = beads * (done ? 0.9 : 0.55);
                data.alphas[dot] = beads * (done ? 1 : 0.75 + 0.25 * sh);
                const fill = done ? GOLD : PALE.map((c, n) => c + (GOLD[n] - c) * sh);
                for (let c = 0; c < 3; c++) { data.tints[ring * 3 + c] = NAVY[c]; data.tints[dot * 3 + c] = fill[c]; }
            }
        },
    };

    const build = (s) => {
        // The water: its colour from the card, with the light of the water drifting across it
        const water = s.depth(zFor(DEPTH.water));
        const paint = document.createElement('canvas');
        paint.width = paint.height = 4;
        const g = paint.getContext('2d');
        g.fillStyle = `#${WATER.toString(16).padStart(6, '0')}`;
        g.fillRect(0, 0, 4, 4);
        L.water = water.canvas(paint, { water: 0.9 });
        // The light at the surface: a soft light (code) and, among the layers, the light itself as particles
        const sun = s.depth(zFor(DEPTH.sun));
        L.sunNode = sun;
        L.shaft = sun.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: 0xfff0a8, stops: [[0, 0.16], [0.4, 0.06], [0.7, 0]] });
        L.sunGlow = sun.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: 0xffe47c, stops: [[0, 0.5], [0.3, 0.2], [0.62, 0]], bloom: true });
        sun.enter({ y: -40, delay: 150, duration: 2400 });
        // The bubbles, at three depths
        L.bubbles = [];
        L.bubbleGlows = [];
        DEPTH.bubbles.forEach((depth, d) => {
            const node = s.depth(zFor(depth));
            bubbles.filter((b) => b.depth === d).forEach((b) => {
                // a light behind each, for when it sings
                const glow = node.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: 0xc8f2ff, stops: [[0, 0.6], [0.35, 0.25], [0.7, 0]], bloom: true });
                glow.opacity = 0;
                L.bubbleGlows[b.i] = glow;
                L.bubbles[b.i] = node.image('/assets/honestidad/bubbles.webp', { crop: b.crop });
            });
            node.enter({ y: 30, delay: 500 + 200 * d, duration: 2200 });
        });
        // The jellyfish: its glow, its eye's light, its tentacles under its bell
        const jelly = s.depth(zFor(DEPTH.jelly));
        L.jellyNode = jelly;
        L.jelly = jelly.group();
        L.halo = L.jelly.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: AURA, stops: [[0, 0.28], [0.35, 0.12], [0.7, 0]], bloom: true });
        L.tentacles = L.jelly.image('/assets/honestidad/tentacles.webp', { wind: { amp: 16, speed: 0.7, root: 'top' } });
        L.bell = L.jelly.image('/assets/honestidad/bell.webp');
        L.eye = L.jelly.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: 0xfff3b0, stops: [[0, 0.8], [0.3, 0.3], [0.62, 0]], bloom: true });
        L.rulito = L.jelly.canvas(rulito.value.canvas, { bloom: true });
        jelly.enter({ y: 50, scale: 0.92, delay: 350, duration: 2400 });
        // The floor: beyond the frame (wide screens), the seaweed, the teal corals, the anemones in their pots, the pink coral
        const beyond = s.depth(zFor(DEPTH.beyond));
        L.beyond = [-1, 1].flatMap((side) => BEYOND.map(([name, mirror, scale]) => {
            const node = beyond.image(`/assets/honestidad/${name}.webp`, { wind: { amp: name === 'seaweed' ? 7 : 3, speed: 0.45, root: 'bottom' }, blur: 0.8 });
            node.uniforms.uBright.value = 0.72;
            node.uniforms.uSaturate.value = 0.8;
            return { node, name, mirror: side < 0 ? mirror : !mirror, scale, side };
        }));
        beyond.enter({ y: 50, delay: 100, duration: 1800 });
        const seaweed = s.depth(zFor(DEPTH.seaweed));
        L.seaweedNode = seaweed;
        L.seaweed = [-1, 1].map((side) => {
            const node = seaweed.image('/assets/honestidad/seaweed.webp', { wind: { amp: 9, speed: 0.5, root: 'bottom' } });
            if (side > 0) node.sx = -1;
            return node;
        });
        seaweed.enter({ y: 60, delay: 150, duration: 1800 });
        const corals = s.depth(zFor(DEPTH.corals));
        L.coralsNode = corals;
        L.coralL = corals.image('/assets/honestidad/coralL.webp', { wind: { amp: 4, speed: 0.6, root: 'bottom' } });
        L.coralR = corals.image('/assets/honestidad/coralR.webp', { wind: { amp: 4, speed: 0.6, root: 'bottom' } });
        corals.enter({ y: 60, delay: 220, duration: 1800 });
        const anemones = s.depth(zFor(DEPTH.anemones));
        L.anemonesNode = anemones;
        L.anemoneGlow = ['L', 'R'].map(() => anemones.glow({ rect: { left: 0, top: 0, w: 1, h: 1 }, color: 0xffe47d, stops: [[0, 0.3], [0.35, 0.12], [0.7, 0]] }));
        L.anemones = ['L', 'R'].map((s2) => anemones.image(`/assets/honestidad/anemone${s2}.webp`, { wind: { amp: 3, speed: 0.9, root: 'bottom' } }));
        L.pots = ['L', 'R'].map((s2) => anemones.image(`/assets/honestidad/pot${s2}.webp`));
        anemones.enter({ y: 60, delay: 300, duration: 1800 });
        const coral = s.depth(zFor(DEPTH.coral));
        L.coralNode = coral;
        L.coral = coral.image('/assets/honestidad/coral.webp');
        coral.enter({ y: 70, delay: 380, duration: 1800 });
    };

    const place = (w, h) => {
        layout(w, h);
        root.value.style.background = `#${WATER.toString(16).padStart(6, '0')}`;
        // The water: a square (so the light on it keeps its shape), past every edge the camera can show
        const side = Math.max(w, h) * 1.3;
        L.water.place({ left: w / 2 - side / 2, top: h / 2 - side / 2, w: side, h: side });

        const sr = SUN.r * k();
        const sg = sr * 4.4;
        L.sunGlow.place({ left: sx(SUN.x) - sg / 2, top: sy(SUN.y) - sg / 2, w: sg, h: sg });
        const sh = sr * 9;
        L.shaft.place({ left: sx(SUN.x) - sh / 2, top: sy(SUN.y) - sh * 0.3, w: sh, h: sh * 1.3 });

        // The bubbles where the card draws them; on a narrow screen the ones past its sides come in (they are touched)
        bubbles.forEach((b) => {
            const r = rectOf(b.box);
            const m = 14 + SLIDE * 0.4;
            const cx = Math.min(w - m - r.w / 2, Math.max(m + r.w / 2, r.left + r.w / 2));
            r.left = cx - r.w / 2;
            b.rest = r;
            L.bubbles[b.i].place(r);
            const gd = r.w * 2.6;
            L.bubbleGlows[b.i].place({ left: cx - gd / 2, top: r.top + r.h / 2 - gd / 2, w: gd, h: gd });
        });

        const bell = rectOf(B.bell);
        L.bell.place(bell, { x: bell.left + bell.w / 2, y: bell.top + bell.h * 0.15 });
        const tent = rectOf(B.tentacles);
        L.tentacles.place(tent, { x: tent.left + tent.w / 2, y: tent.top });
        const hd = 900 * k();
        L.halo.place({ left: sx(1080) - hd / 2, top: sy(980) - hd / 2, w: hd, h: hd });
        const ed = 120 * k();
        L.eye.place({ left: sx(EYE[0]) - ed / 2, top: sy(EYE[1]) - ed / 2, w: ed, h: ed });
        L.jelly.pivot = { x: sx(1080), y: sy(1000) };
        // The rulito over its head, beside the thread so the two do not mix (its canvas is bigger than the glyph, for the glow)
        const rh = Math.max(72, 300 * k()), rw = rh * 32 / 86;
        glyph = { left: sx(1081) + Math.max(14, 50 * k()), top: sy(650) - rh, w: rw, h: rh };
        L.rulito.place({ left: glyph.left - 0.4375 * glyph.w, top: glyph.top - 0.1628 * glyph.h, w: glyph.w * 1.875, h: glyph.h * 1.3256 },
            { x: glyph.left + glyph.w / 2, y: glyph.top + glyph.h });

        const weed = rectOf(B.seaweed);
        L.seaweed[0].place(weed);
        L.seaweed[1].place({ ...weed, left: sx(SIZE - B.seaweed[0] - B.seaweed[2]) });
        L.coralL.place(rectOf(B.coralL));
        L.coralR.place(rectOf(B.coralR));
        ['L', 'R'].forEach((s2, i) => {
            const a = rectOf(B[`anemone${s2}`]);
            L.anemones[i].place(a, { x: a.left + a.w / 2, y: a.top + a.h });
            L.pots[i].place(rectOf(B[`pot${s2}`]));
            const gd = 520 * k();
            L.anemoneGlow[i].place({ left: a.left + a.w / 2 - gd / 2, top: a.top + a.h * 0.35 - gd / 2, w: gd, h: gd });
        });
        const c = rectOf(B.coral);
        L.coral.place(c, { x: c.left + c.w / 2, y: c.top + c.h });

        // Beyond the frame: outwards from the seaweed at each side, as far as the screen (and the camera) goes
        const bottom = sy(SIZE);
        [-1, 1].forEach((sd) => {
            let edge = sd < 0 ? weed.left + weed.w * 0.25 : sx(SIZE) - weed.w * 0.25;
            L.beyond.filter((b) => b.side === sd).forEach((b, j) => {
                const [, , bw, bh] = B[b.name];
                const ww = bw * k() * b.scale, hh = bh * k() * b.scale;
                const left = sd < 0 ? edge - ww : edge;
                const seen = sd < 0 ? edge > -SLIDE : edge < w + SLIDE;
                b.node.mesh.visible = seen;
                b.node.sx = b.mirror ? -1 : 1;
                b.node.place({ left, top: bottom - hh, w: ww, h: hh });
                edge += sd * ww * (1 - BEYOND[j][3]);
            });
        });
    };

    // The touch targets: the jellyfish's bell and the top of its tentacles, and a box round each bubble (at least 48px)
    const put = (el, b, min) => {
        const bw = Math.max(min, b.width), bh = Math.max(min, b.height);
        el.style.translate = `${(b.left + b.width / 2 - bw / 2).toFixed(1)}px ${(b.top + b.height / 2 - bh / 2).toFixed(1)}px`;
        el.style.width = `${bw.toFixed(1)}px`;
        el.style.height = `${bh.toFixed(1)}px`;
    };
    const placeHits = () => {
        if (!L.jelly || !jellyHit.value) return;
        put(jellyHit.value, L.jelly.boxOnScreen(rectOf([860, 640, 440, 760])), 64);
        bubbles.forEach((b) => { const el = bubbleHits.value[b.i]; if (el) put(el, L.bubbles[b.i].boxOnScreen(b.rest), 48); });
    };

    const enter = () => {
        if (entered || !props.active || !stage) return;
        entered = true;
        stage.ready().then(() => { if (!gone) { stage.start(); dust?.reveal(); } });
    };

    // ---- The game, each frame: the voices, the phrases coming down, the person's turn
    let lastWake = -Infinity;
    const game = (t) => {
        // Voices coming back after the rulito, or (one at a time) after a long while alone
        bubbles.forEach((b) => { if (b.quiet && b.wakeAt !== null && t >= b.wakeAt) wake(b); });
        if (mode !== 'win' && !(mode === 'answer' && got > 0) && t - Math.max(lastWake, lastTouch) > WAKE) {
            const lonely = bubbles.filter((b) => b.quiet && b.wakeAt === null && t - b.quietAt > WAKE).sort((a, b) => a.quietAt - b.quietAt);
            if (lonely.length) { lastWake = t; wake(lonely[0]); }
        }
        // The awake ones sing now and then, each on its own (out of the phrase's time)
        if (mode !== 'win') awake().forEach((b) => { if (t >= b.nextSing) voiceOf(b); });
        // While voices are awake, the phrase comes down drowned now and then; with them quiet, it comes down clean
        if (mode === 'noise' && !singing && t >= drownAt) { descend(false); drownAt = t + THREAD_EVERY; }
        if (mode === 'sing' && !singing && singAt !== null && t >= singAt) { singAt = null; descend(true); }
        if (singing) {
            const n = phrase.beats.length;
            while (singing.next < n && t >= singing.arrivals[singing.next]) arrive(singing.next++);
            if (singing.next >= n && t >= singing.arrivals[n - 1] + 0.05) {
                const clean = singing.clean;
                singing = null;
                if (clean && mode === 'sing') { mode = 'answer'; answerSince = t; got = 0; }
            }
        }
        // The person's turn: too long for the next note is out of time too; left alone, the phrase comes down again
        if (mode === 'answer' && got > 0 && got < phrase.beats.length && clock() - prevTouch > gapOf(got) + tolOf(got)) miss();
        if (mode === 'answer' && got === 0 && t - Math.max(lastTouch, answerSince) > AGAIN) { mode = 'sing'; singAt = t + 0.4; }
    };

    let frames = 0;
    const frame =({ x, y, scroll, t, ramp }) => {
        if (!stage || !L.jelly) return;
        const dt = Math.min(0.1, Math.max(0, t - lastT));
        lastT = t;
        now = t;
        stage.look(x * SLIDE, y * SLIDE_Y);

        // ---- The light at the surface breathes
        const breath = Math.sin(t * 0.5);
        L.sunGlow.opacity = 0.75 + 0.15 * breath;
        dust?.grow(0, 0.015 * breath * ramp, sx(SUN.x), sy(SUN.y));
        L.sunGlow.scale = 1 + 0.05 * breath * ramp;
        L.shaft.opacity = 0.8 + 0.2 * Math.sin(t * 0.31);
        L.sunNode.y = scroll * 8;

        // ---- The game (not with reduced motion)
        const playing = !reduced && ramp > 0.9;
        if (playing) game(t);
        for (let i = lights.length - 1; i >= 0; i--) if (t - lights[i].at > lights[i].run * 1.25) lights.splice(i, 1);

        // ---- The win: the thread shines whole, the eye opens, the rulito is born over its head, kept, gone; then the
        // voices come back one by one
        let named = 0;
        if (win && rulito.value) {
            win.age += dt;
            win.pop = Math.max(0, win.pop - dt * 2.2);
            win.head = 1 - (1 - Math.min(1, Math.max(0, (win.age - DELAY) / GROW))) ** 1.6;
            if (win.head >= 1 && !win.full) { win.full = true; win.fullAt = win.age; win.pop = 1; play('rulito'); eyeFlash = 1; dust?.boost(1, 0.8); }
            if (win.full && !win.back && win.age - win.fullAt > KEEP) win.back = true;
            if (win.back) win.tail = Math.min(1, win.tail + dt / EAT);
            const kept = Math.min(1, Math.max(0, (win.head - win.tail - 0.6) / 0.4));
            named = Math.max(win.pop, 0.8 * kept * kept * (3 - 2 * kept));
            const flare = win.full && win.head - win.tail > 0.9 ? Math.max(win.pop, Math.sin(t * 4) * 0.5 + 0.5) : 0;
            rulito.value.frame({ head: win.head, tail: win.tail, flare, t, fade: Math.min(1, (win.head - win.tail) * 14), width: glyph.w });
            L.rulito.refresh();
            L.rulito.scale = 1 + 0.2 * win.pop * win.pop;
            if (win.back && win.tail >= 1) {
                win = null;
                rulito.value.frame({ width: glyph.w });
                L.rulito.refresh();
                phrase = newPhrase(phrase);
                beat = BEAT;
                sung = 0;
                got = 0;
                mode = 'noise';
                drownAt = t + 4;
                bubbles.forEach((b, j) => { b.wakeAt = t + 0.6 + j * WAKE_STEP; });
            }
        }
        stageEl?.style.setProperty('--name-glow', named.toFixed(3));
        const wholeGoal = win && !win.back ? 1 : 0;
        whole += (wholeGoal - whole) * Math.min(1, dt * (wholeGoal ? 2 : 0.8));
        stage.bloom = Math.max(0.7 * named, 0.25 * whole);
        beads += ((!reduced && !win && (mode === 'answer' || (mode === 'sing' && (sung > 0 || singing))) ? 1 : 0) - beads) * Math.min(1, dt * 2.5);
        beadShine.forEach((v, j) => { beadShine[j] = Math.max(0, v - dt * 1.6); });

        // ---- The jellyfish: a stroke now and then, a squeeze on each note repeated; the eye glows as a note arrives,
        // breathes on the person's turn (the hint) and opens at the win
        if (!reduced && t - strokeAt > STROKE + 0.6 + Math.sin(strokeAt) * 0.8) strokeAt = t;
        const c = reduced ? 0 : Math.max(stroke(t), 0.5 * squeeze);
        const up = reduced ? 0 : rise(t);
        squeeze = Math.max(0, squeeze - dt * 3.5);
        lost = Math.max(0, lost - dt * 1.2);
        const idle = t - Math.max(lastTouch, answerSince);
        const beckonGoal = playing && mode === 'answer' && got === 0 && idle > HINT ? 1 : 0;
        beckon += (beckonGoal - beckon) * Math.min(1, dt * 2.5);
        const call = beckon * (0.5 + 0.5 * Math.sin((idle - HINT) * 3.4 - Math.PI / 2));
        L.bell.sx = 1 - 0.06 * c;
        L.bell.sy = 1 + 0.035 * c;
        L.tentacles.sx = 1 - 0.05 * c + 0.03 * up;
        L.tentacles.sy = 1 + 0.05 * up - 0.02 * c;
        L.jelly.y = (-26 * up + Math.sin(t * 0.37) * 6) * k() * ramp;
        L.jelly.rotate = Math.sin(t * 0.23) * 1.5 * ramp;
        eyeFlash = Math.max(0, eyeFlash - dt * 0.9);
        L.eye.opacity = Math.min(1, 0.35 + 0.65 * eyeFlash + 0.15 * c + 0.5 * call + 0.6 * whole);
        L.eye.scale = 1 + 0.8 * eyeFlash + 0.6 * call + 1.2 * whole;
        L.halo.opacity = Math.min(1, 0.7 + 0.3 * c + 0.3 * eyeFlash + 0.3 * call) * (1 - 0.4 * lost);
        L.halo.scale = 1 + 0.06 * call + 0.1 * whole;
        L.bell.uniforms.uBright.value = 1 + 0.08 * eyeFlash + 0.06 * call + 0.04 * whole - 0.15 * lost;
        L.jellyNode.y = scroll * 14;
        const heart = L.jelly.toScreen(sx(1080), sy(900));
        dust?.grow(1, 0.05 * c + 0.03 * eyeFlash, heart.x, heart.y);

        // ---- The bubbles bob and wobble; an awake one glows and swells as it sings, a quiet one is dim, sunk a little and
        // nearly still. Left alone while voices are awake, the first awake one breathes (the hint: quiet me)
        const hinted = playing && mode === 'noise' && t - lastTouch > NOISE_HINT && t > NOISE_HINT ? awake()[0] : null;
        let loud = 0;
        bubbles.forEach((b) => {
            const node = L.bubbles[b.i];
            const glow = L.bubbleGlows[b.i];
            b.wobble = Math.max(0, b.wobble - dt * 0.7);
            b.voice = Math.max(0, b.voice - dt * 1.4);
            b.q += ((b.quiet ? 1 : 0) - b.q) * Math.min(1, dt * (b.quiet ? 2.5 : 1.5));
            const calm = 1 - 0.75 * b.q;
            const breathe = b === hinted ? 0.5 + 0.5 * Math.sin((t - lastTouch - NOISE_HINT) * 3.4 - Math.PI / 2) : 0;
            const v = ease(b.voice);
            loud = Math.max(loud, v);
            const wob = Math.sin(t * 1.3 + b.phase) * 0.025 * ramp * calm + Math.sin(t * 9 + b.phase) * 0.12 * b.wobble;
            node.y = (Math.sin(t * 0.42 + b.phase) * 10 * ramp * calm - 14 * b.wobble + 36 * b.q) * k();
            node.x = Math.sin(t * 0.27 + b.phase * 2) * 6 * k() * ramp * calm;
            node.scale = 1 + 0.14 * v + 0.08 * breathe - 0.1 * b.q;
            node.sx = 1 + wob;
            node.sy = 1 - wob;
            node.uniforms.uBright.value = 1 + 0.35 * v + 0.15 * breathe - 0.3 * b.q;
            node.uniforms.uSaturate.value = 1 - 0.45 * b.q;
            node.opacity = 1 - 0.35 * b.q;
            glow.x = node.x;
            glow.y = node.y;
            glow.scale = node.scale;
            glow.opacity = Math.min(1, 0.9 * v + 0.5 * breathe + (reduced ? 0 : 0.12 * (1 - b.q)));
            glow.mesh.visible = glow.opacity > 0.01;
        });
        crowd += (loud - crowd) * Math.min(1, dt * 4);

        // ---- The floor sways in the current (shader); the pink coral breathes
        L.coral.sy = 1 + 0.008 * Math.sin(t * 0.8) * ramp;
        L.coral.sx = 1 - 0.004 * Math.sin(t * 0.8) * ramp;
        L.anemoneGlow.forEach((gl, i) => { gl.opacity = 0.75 + 0.25 * Math.sin(t * 0.9 + i * 2); });
        [L.seaweedNode, L.coralsNode, L.anemonesNode, L.coralNode].forEach((node) => { node.y = scroll * 30; });

        // The particles that belong to a layer follow it
        const drift = (node) => { const d = stage.drift(node.z); return { x: d.x, y: d.y + node.y }; };
        const sd = drift(L.sunNode);
        const jd = drift(L.jellyNode);
        dust?.shift(0, sd.x, sd.y);
        dust?.shift(1, jd.x, jd.y + L.jelly.y);
        const wd = drift(L.seaweedNode);
        dust?.shift(3, wd.x, wd.y);
        const ad = drift(L.anemonesNode);
        dust?.shift(4, ad.x, ad.y);
        const md = stage.drift(zFor(9));
        dust?.shift(5, md.x, md.y);
        stage.render(t);
        if (frames++ % 2 === 0) placeHits();
    };

    // The specks of the water, from the card, repeated (mirrored every other time) over the whole screen
    const waterSpecks = (w, h) => {
        const out = [];
        const step = F.size;
        for (let j = Math.floor(-F.y / step) - 1; F.y + j * step < h + 40; j++) {
            for (let i = Math.floor(-F.x / step) - 1; F.x + i * step < w + 40; i++) {
                const flip = (i + j) % 2 !== 0;
                art.dust.forEach(([ax, ay, r]) => {
                    const x = F.x + i * step + (flip ? SIZE - ax : ax) * k(), y = F.y + j * step + ay * k();
                    if (x < -60 || x > w + 60 || y < -60 || y > h + 60) return;
                    out.push([x, y, Math.max(1.4, 2 * r * k() * 1.1), DUST]);
                });
            }
        }
        return out;
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
        dust = startStardust(null, {
            stage,
            manual: true,
            groups: [
                // 0: the light at the surface, all of it a stipple (as Pañña's sun), alive
                { colors: [SUN_YELLOW], parallax: 0, drift: 2.2, jitter: 0.9, twinkle: 0.12, reach: 0, bloom: true, order: after(L.sunGlow) + 0.2,
                    points: () => sampleCloud(SUN_CLOUD, (u, v) => [sx(u), sy(v)], k()).map(([x, y, size]) => [x, y, size, SUN_YELLOW]) },
                // 1: the jellyfish's aura, breathing with it
                { colors: [AURA], parallax: 0, drift: 1.8, jitter: 0.4, twinkle: 0.4, reach: 0, bloom: true, order: after(L.halo), points: () => fromArt(art.aura, AURA, 1.15) },
                // 2: the thread of light from the surface to its third eye
                { colors: [THREAD], dynamic: threadGroup, parallax: 0, drift: 0, twinkle: 0, reach: 0, look: 'hard', bloom: true, order: after(L.bell) + 0.2 },
                // 3: the dark specks round the seaweeds
                { colors: [INK], parallax: 0, drift: 3, twinkle: 0.15, reach: 70, push: 14, order: after(L.seaweed[1]), points: () => fromArt(art.stipple, INK) },
                // 4: the yellow stipple round the anemones
                { colors: [0xffe47d], parallax: 0, drift: 3, jitter: 0.4, twinkle: 0.45, reach: 70, push: 16, order: after(L.anemoneGlow[1]), points: () => fromArt(art.glow, 0xffe47d) },
                // 5: the specks of the water, rising slowly, moving out of a finger's way
                { colors: [DUST], parallax: 0, drift: 8, twinkle: 0.5, reach: 110, push: 30, flow: [0, -5], order: after(L.sunGlow), points: waterSpecks },
                // 6: the four beads over the jellyfish's head (the phrase's rhythm)
                { dynamic: beadGroup, look: 'hard', parallax: 0, drift: 0, jitter: 0, twinkle: 0, reach: 0, order: after(L.rulito) + 0.2 },
                // 7: sparks
                { ...sparks.group(), order: after(L.coral) + 1 },
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
    });
</script>

<template>
    <div class="scene" ref="root" @click="strum">
        <canvas class="stageCanvas" ref="canvas"></canvas>
        <!-- The rulito is drawn on its own canvas, which the stage shows as a texture over the jellyfish -->
        <Rulito ref="rulito" class="offstage" color="#ffe47d" />
        <!-- The six bubbles, voices from outside: a touch quiets one -->
        <div v-for="b in bubbles" :key="b.i" :ref="(el) => { bubbleHits[b.i] = el; }" class="hit" role="button" tabindex="0"
            :aria-label="$i18n.locale === 'en' ? 'A voice from outside: touch it to quiet it' : 'Una voz de afuera: tocala para acallarla'"
            @pointerdown.stop.prevent="touchBubble(b.i)" @click.stop @keydown="onKey($event, () => touchBubble(b.i))"></div>
        <div ref="jellyHit" class="hit" role="button" tabindex="0"
            :aria-label="$i18n.locale === 'en' ? 'The jellyfish: with the voices quiet, repeat the rhythm of the light by touching it' : 'La medusa: con las voces acalladas, repetí el ritmo de la luz tocándola'"
            @pointerdown.stop.prevent="touchJelly" @click.stop @keydown="onKey($event, touchJelly)"></div>
    </div>
</template>

<style scoped>
    .scene {
        position: absolute;
        inset: 0;
        overflow: hidden;
        background: #026862;
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

    /* Taps only, so the page still scrolls from them */
    .hit {
        touch-action: manipulation;
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
