// Procedural sound for the whole app. Nothing is downloaded: every sound is synthesised with Web Audio.
// It is meant to feel calm and open: a soft pad whose voices swell slowly, singing-bowl chimes on a
// pentatonic scale, the odd drop of water, all in a wide reverb. The app sounds in G major; inside a card
// everything moves to that card's chord (src/data/cardChords.js). Every function takes the context
// (a real or an offline one) so it can be rendered and checked without speakers.

import { BASE_CHORD } from '../data/cardChords.js';
import { INHALE, EXHALE } from '../composables/breathCurve.js';

const rand = (min, max) => min + Math.random() * (max - min);

// How loud the ambience gets, so the effects always stand above it
const AMBIENT_LEVEL = 0.15;

/* ---------- Chords ---------- */

const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);
const any = (list) => list[Math.floor(Math.random() * list.length)];

const LETTERS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

// What each kind of chord is made of (semitones over its root) and the pentatonic its chimes use, so that
// whatever order they come in they never clash with the pad
const KINDS = {
    '': { tones: [0, 4, 7], scale: [0, 2, 4, 7, 9] },        // major: opens, expands
    m: { tones: [0, 3, 7], scale: [0, 3, 5, 7, 10] },        // minor: turns inwards
    7: { tones: [0, 4, 7, 10], scale: [0, 2, 4, 7, 10] },    // seventh: transforms
};

// 'D', 'Bm', 'G7', 'F#m'... The pad's bass falls between A2 and G#3, and the voice of the chimes and the touch
// sounds (its root) between E4 and D#5; every other note is counted from those two. G major, the app's own
// chord, gives a pad of G3 D4 G4 B4 D5 G5 and chimes of G4 A4 B4 D5 E5 G5.
export const chord = (name = BASE_CHORD) => {
    const [, letter = 'G', accidental = '', kind = ''] = /^([A-G])([#b]?)(m|7)?$/.exec(name) ?? [];
    const root = (LETTERS[letter] + (accidental === '#' ? 1 : accidental === 'b' ? -1 : 0) + 12) % 12;
    const bass = 45 + ((root - 9 + 12) % 12);
    const voice = 64 + ((root - 4 + 12) % 12);
    const { tones, scale } = KINDS[kind];
    const third = tones[1];
    return {
        name,
        kind,
        bass,
        voice,
        intervals: tones,
        // The tones from a register upwards, across a span of semitones
        tones: (from, span) => {
            const out = [];
            for (let midi = from; midi <= from + span; midi++) {
                if (tones.includes((midi - bass + 120) % 12)) out.push(midi);
            }
            return out;
        },
        pad: [
            [bass, 0.28], [bass + 7, 0.4], [bass + 12, 0.34], [bass + 12 + third, 0.26], [bass + 19, 0.18],
            kind === '7' ? [bass + 22, 0.12] : [bass + 24, 0.08],
        ],
        chimes: [...scale, 12].map((step) => hz(voice + step)),
    };
};

// The app's own chord, outside the cards
const PLAIN = chord(BASE_CHORD);

// White noise: flat across the spectrum, for swishes, ticks and the airy layer
const whiteBuffer = (ctx, seconds = 1) => {
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
};

// A made-up room: noise that fades out over a few seconds, a little dark at the end
const reverbImpulse = (ctx, seconds = 3.6) => {
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
        const data = buffer.getChannelData(channel);
        let smooth = 0;
        for (let i = 0; i < length; i++) {
            smooth += 0.3 * ((Math.random() * 2 - 1) - smooth);
            data[i] = smooth * Math.pow(1 - i / length, 2.8);
        }
    }
    return buffer;
};

export const createMaster = (ctx) => {
    const input = ctx.createGain();
    input.gain.value = 0.9;
    const compressor = ctx.createDynamicsCompressor();
    const room = ctx.createConvolver();
    const wet = ctx.createGain();
    room.buffer = reverbImpulse(ctx);
    wet.gain.value = 0.4;

    input.connect(compressor);
    input.connect(room);
    room.connect(wet);
    wet.connect(compressor);
    compressor.connect(ctx.destination);
    return input;
};

// A singing bowl: a sine with two quiet partners, a soft attack and a long decay
const bell = (ctx, out, time, frequency, duration, level) => {
    [[1, 1, duration], [2, 0.14, duration * 0.55], [3.01, 0.05, duration * 0.3]].forEach(([ratio, share, length]) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = frequency * ratio;
        gain.gain.setValueAtTime(0.0001, time);
        gain.gain.exponentialRampToValueAtTime(level * share, time + 0.035);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + length);
        osc.connect(gain);
        gain.connect(out);
        osc.start(time);
        osc.stop(time + length + 0.05);
    });
};

// A drop of water: a sine that glides upwards, panned somewhere in the stereo field
const drop = (ctx, out, time, level = 0.05) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    // Older Safari has no stereo panner: the drop just plays in the centre
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain();
    const from = rand(520, 840);
    const length = rand(0.09, 0.15);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(from, time);
    osc.frequency.exponentialRampToValueAtTime(from * rand(1.4, 1.8), time + length);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(level, time + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + length + 0.08);
    if (pan.pan) pan.pan.value = rand(-0.7, 0.7);
    osc.connect(gain);
    gain.connect(pan);
    pan.connect(out);
    osc.start(time);
    osc.stop(time + length + 0.15);
};

// A burst of filtered noise, used for swishes and the ticks of a shuffle
const swish = (ctx, out, time, { from, to, duration, level, q = 1.2 }) => {
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    source.buffer = whiteBuffer(ctx, 1);
    filter.type = 'bandpass';
    filter.Q.value = q;
    filter.frequency.setValueAtTime(from, time);
    filter.frequency.exponentialRampToValueAtTime(to, time + duration);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(level, time + duration * 0.4);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(out);
    source.start(time);
    source.stop(time + duration + 0.05);
};

/* ---------- Effects: each one is (ctx, out, time, harmony): harmony is the card's chord, or null outside the cards ---------- */

// Picking a card: three bowl notes climbing the scale. With the chosen card's chord they climb its root, fifth
// and octave, and its third (and seventh) answer quietly on top: the card already sounds before it is turned over.
export const pick = (ctx, out, time, harmony) => {
    if (!harmony) {
        bell(ctx, out, time, hz(PLAIN.voice), 3.4, 0.13);
        bell(ctx, out, time + 0.16, hz(PLAIN.voice + 7), 3.2, 0.11);
        bell(ctx, out, time + 0.34, hz(PLAIN.voice + 12), 3.4, 0.07);
        return;
    }
    const root = harmony.voice;
    bell(ctx, out, time, hz(root), 3.4, 0.13);
    bell(ctx, out, time + 0.16, hz(root + 7), 3.2, 0.11);
    bell(ctx, out, time + 0.34, hz(root + 12), 3.4, 0.07);
    harmony.intervals.slice(1).filter((step) => step !== 7).forEach((step, i) => {
        bell(ctx, out, time + 0.6 + i * 0.18, hz(root + 12 + step), 3, 0.035);
    });
};

// Turning the card over: a breath of air and one high note. With the card's chord that note is its third, the
// one that makes it major or minor, so the card shows its colour as it turns; a low bowl on its root carries it
// (and a seventh adds its seventh, slightly late).
export const flip = (ctx, out, time, harmony) => {
    swish(ctx, out, time, { from: 400, to: 1800, duration: 0.65, level: 0.1, q: 0.6 });
    if (!harmony) {
        bell(ctx, out, time + 0.42, hz(PLAIN.voice + PLAIN.intervals[1]), 2.6, 0.06);
        return;
    }
    const root = harmony.voice;
    bell(ctx, out, time + 0.42, hz(root + harmony.intervals[1]), harmony.kind === 'm' ? 3.2 : 2.6, 0.06);
    bell(ctx, out, time + 0.46, hz(root - 12), 4, 0.05);
    if (harmony.kind === '7') bell(ctx, out, time + 0.7, hz(root + 10), 2.6, 0.03);
};

// Stars come in bursts (a scene touched again and again, a sky full of shooting stars), and the same bright run
// over and over tires the ear. So each star counts how many came just before it: the more there were, the
// quieter and shorter it is, and one that arrives almost on top of the last is not played at all.
let lastStar = -Infinity;
let starCrowd = 0;
const starWeight = (time) => {
    const since = time - lastStar;
    if (since < 0) starCrowd = 0;           // another context (an offline render) with its own clock
    else if (since < 0.12) return 0;
    starCrowd = starCrowd * Math.exp(-since / 2.5) + 1;
    lastStar = time;
    return 1 / (1 + 0.45 * (starCrowd - 1));
};

// A shooting star: three quiet, high notes falling like sparks and a little shimmer.
// Inside a card (with its chord) it is richer and an octave lower, softer on the ear: the chord's own notes fall or
// rise like a strummed harp, a bowl rings its root low underneath, and each kind of chord has its colour: a major
// one sparkles, a minor one is slower and softer, a seventh shimmers (every note has a slightly detuned twin that
// beats against it).
export const star = (ctx, out, time, harmony) => {
    const weight = starWeight(time);
    if (!weight) return;
    const length = 0.6 + 0.4 * weight;
    if (!harmony) {
        // Third, root and fifth high up, falling: B6 G6 D6
        bell(ctx, out, time, hz(PLAIN.voice + 24 + PLAIN.intervals[1]), 2.4 * length, 0.022 * weight);
        bell(ctx, out, time + 0.1, hz(PLAIN.voice + 24), 2.6 * length, 0.027 * weight);
        bell(ctx, out, time + 0.2, hz(PLAIN.voice + 19), 2.8 * length, 0.03 * weight);
        swish(ctx, out, time, { from: 7000, to: 9500, duration: 0.7, level: 0.012 * weight, q: 0.6 });
        return;
    }
    const minor = harmony.kind === 'm';
    const seventh = harmony.kind === '7';
    // Chord notes from the fifth octave up (A5 D6 F#6 for D major), sometimes one more below so the run is
    // not always the same length; mostly falling, now and then rising
    let notes = harmony.tones(harmony.voice + 7, 11);
    if (Math.random() < 0.5) notes = [...harmony.tones(harmony.voice - 5, 11).slice(-1), ...notes];
    if (Math.random() < 0.7) notes.reverse();
    const gap = minor ? 0.14 : 0.1;
    notes.forEach((midi, i) => {
        const at = time + i * gap + rand(0, 0.02);
        const level = (0.03 + 0.01 * (i / notes.length)) * weight;
        bell(ctx, out, at, hz(midi), (minor ? 3.2 : 2.6) * length, level);
        if (seventh) bell(ctx, out, at + 0.01, hz(midi) * 1.004, 2.4 * length, level * 0.5);
    });
    bell(ctx, out, time + 0.05, hz(harmony.voice), (minor ? 4.5 : 3.6) * length, 0.035 * weight);
    if (minor) swish(ctx, out, time, { from: 3000, to: 4200, duration: 1.1, level: 0.008 * weight, q: 0.6 });
    else swish(ctx, out, time, { from: 5000, to: 7000, duration: 0.7, level: 0.01 * weight, q: 0.6 });
};

// The deck being riffled and dealt
export const shuffle = (ctx, out, time) => {
    for (let i = 0; i < 16; i++) {
        swish(ctx, out, time + i * 0.07, { from: rand(1400, 2400), to: rand(2600, 3600), duration: 0.05, level: rand(0.3, 0.55), q: 4 });
    }
    for (let i = 0; i < 18; i++) {
        swish(ctx, out, time + 1.2 + i * 0.045, { from: rand(900, 1500), to: rand(1800, 2600), duration: 0.045, level: rand(0.25, 0.45), q: 3.5 });
    }
};

// Inside a card, one tap after another walks the chord: each lands a step or two from the last, so touching a
// scene again and again plays a small melody in the card's chord
let lastTap = 0;

// Tapping a button or a link: one small drop. Inside a card the drop glides up into a note of the chord and a
// small bowl answers on that note, short and round (a minor chord rounds it a little more, a seventh adds its beat)
export const tap = (ctx, out, time, harmony) => {
    if (!harmony) {
        drop(ctx, out, time, 0.08);
        return;
    }
    const notes = harmony.tones(harmony.voice, 14);
    lastTap = Math.max(0, Math.min(notes.length - 1, lastTap + any([-2, -1, 1, 1, 2])));
    const target = hz(notes[lastTap]);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(target * 0.7, time);
    osc.frequency.exponentialRampToValueAtTime(target, time + 0.08);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.07, time + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.2);
    if (pan.pan) pan.pan.value = rand(-0.5, 0.5);
    osc.connect(gain);
    gain.connect(pan);
    pan.connect(out);
    osc.start(time);
    osc.stop(time + 0.25);

    bell(ctx, out, time + 0.06, target, harmony.kind === 'm' ? 1.8 : 1.3, 0.05);
    if (harmony.kind === '7') bell(ctx, out, time + 0.07, target * 1.004, 1.2, 0.022);
};

/* ---------- Vipassana: a ring through the water, cells letting go and gathering again, one slow breath ---------- */

// Like the stars, these come in groups (a ring crosses a dozen cells), so each one counts how many came just before
// it and is quieter the more there were; one almost on top of the last is not played
const crowd = (gap, memory) => {
    let last = -Infinity;
    let count = 0;
    return (time) => {
        const since = time - last;
        if (since < 0) count = 0;           // another context (an offline render) with its own clock
        else if (since < gap) return 0;
        count = count * Math.exp(-since / memory) + 1;
        last = time;
        return 1 / (1 + 0.5 * (count - 1));
    };
};
const releaseWeight = crowd(0.1, 2);
const bloomWeight = crowd(0.14, 2.5);

// A press on the water: a round note that falls like a stone dropped in, a little moving water and a low bowl
// on the chord's root that stays (softer the lighter the press)
export const ripple = (ctx, out, time, harmony, level = 1) => {
    const h = harmony ?? PLAIN;
    const k = 0.35 + 0.65 * level;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(hz(h.voice), time);
    osc.frequency.exponentialRampToValueAtTime(hz(h.voice - 12), time + 0.5);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.09 * k, time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 1.4);
    osc.connect(gain);
    gain.connect(out);
    osc.start(time);
    osc.stop(time + 1.5);
    swish(ctx, out, time, { from: 1200, to: 300, duration: 1.3, level: 0.03 * k, q: 0.8 });
    bell(ctx, out, time + 0.03, hz(h.voice - 12), 3.6, 0.04 * k);
};

// A cell lets go of its shape: one high, glassy note of the chord (with a detuned twin) and a breath of air going up
export const release = (ctx, out, time, harmony) => {
    const weight = releaseWeight(time);
    if (!weight) return;
    const h = harmony ?? PLAIN;
    const midi = any(h.tones(h.voice + 12, 14));
    bell(ctx, out, time, hz(midi), 2.4, 0.032 * weight);
    bell(ctx, out, time + 0.012, hz(midi) * 1.004, 2, 0.015 * weight);
    swish(ctx, out, time, { from: 3500, to: 7000, duration: 1.2, level: 0.007 * weight, q: 0.6 });
};

// A cell gathers itself again: a low note of the chord that glides up into place and settles with a small bowl
export const bloom = (ctx, out, time, harmony) => {
    const weight = bloomWeight(time);
    if (!weight) return;
    const h = harmony ?? PLAIN;
    const target = hz(any(h.tones(h.voice - 12, 14)));
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(target * 0.6, time);
    osc.frequency.exponentialRampToValueAtTime(target, time + 0.5);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.045 * weight, time + 0.25);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 1.4);
    osc.connect(gain);
    gain.connect(out);
    osc.start(time);
    osc.stop(time + 1.5);
    bell(ctx, out, time + 0.45, target, 2.4, 0.02 * weight);
};

// One slow breath, the length of breathCurve.js: air that rises as it fills and falls as it goes out, and the chord's
// root and fifth swelling underneath, low, to peak with the inhale and fade with the exhale
export const breath = (ctx, out, time, harmony) => {
    const h = harmony ?? PLAIN;
    swish(ctx, out, time, { from: 350, to: 1500, duration: INHALE, level: 0.05, q: 0.5 });
    swish(ctx, out, time + INHALE, { from: 1500, to: 350, duration: EXHALE, level: 0.04, q: 0.5 });
    [h.bass + 12, h.bass + 19].forEach((midi, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = hz(midi);
        gain.gain.setValueAtTime(0.0001, time);
        gain.gain.exponentialRampToValueAtTime(0.035 - i * 0.012, time + INHALE);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + INHALE + EXHALE);
        osc.connect(gain);
        gain.connect(out);
        osc.start(time);
        osc.stop(time + INHALE + EXHALE + 0.1);
    });
};

/* ---------- Ambience ---------- */

export const createAmbient = (ctx, out, name = BASE_CHORD) => {
    const fade = ctx.createGain();
    fade.gain.value = 0;
    fade.connect(out);

    const bus = ctx.createGain();
    bus.gain.value = 0.5;
    bus.connect(fade);

    // Pad: an open chord. Every voice has a slightly detuned twin and swells on its own slow cycle.
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1700;
    filter.Q.value = 0.4;
    filter.connect(bus);

    const makePad = (harmony) => {
        const level = ctx.createGain();
        level.connect(filter);
        const voices = [];
        harmony.pad.forEach(([midi, share]) => {
            const voiceGain = ctx.createGain();
            voiceGain.gain.value = share * 0.55;
            voiceGain.connect(level);

            [-5, 5].forEach((cents) => {
                const osc = ctx.createOscillator();
                osc.type = 'sine';
                osc.frequency.value = hz(midi);
                osc.detune.value = cents;
                osc.connect(voiceGain);
                voices.push(osc);
            });

            const swell = ctx.createOscillator();
            const depth = ctx.createGain();
            swell.frequency.value = rand(0.035, 0.085);
            depth.gain.value = share * 0.4;
            swell.connect(depth);
            depth.connect(voiceGain.gain);
            voices.push(swell);
        });
        return { level, voices };
    };

    let harmony = chord(name);
    let pad = makePad(harmony);
    let started = false;
    const sources = [];

    // A little air, like water moving far away
    const air = ctx.createBufferSource();
    const airFilter = ctx.createBiquadFilter();
    const airGain = ctx.createGain();
    air.buffer = whiteBuffer(ctx, 3);
    air.loop = true;
    airFilter.type = 'bandpass';
    airFilter.frequency.value = 4500;
    airFilter.Q.value = 0.4;
    airGain.gain.value = 0.012;
    air.connect(airFilter);
    airFilter.connect(airGain);
    airGain.connect(bus);
    sources.push(air);

    // Chimes and drops come on their own, not tied to the pad
    const events = ctx.createGain();
    events.gain.value = 0.7;
    events.connect(fade);

    let nextChime = 0;
    let nextDrop = 0;
    let timer = null;

    // Schedules chimes and drops up to a point in time (the context's own clock)
    const scheduleUntil = (until) => {
        while (nextChime < until) {
            const chimes = harmony.chimes;
            const index = Math.floor(Math.random() * chimes.length);
            bell(ctx, events, nextChime, chimes[index], 6, rand(0.05, 0.075));
            // Now and then a second note answers, a step or two higher on the scale
            if (Math.random() < 0.4 && index + 1 < chimes.length) {
                bell(ctx, events, nextChime + rand(0.5, 0.9), chimes[Math.min(chimes.length - 1, index + 1 + Math.floor(Math.random() * 2))], 6, rand(0.035, 0.055));
            }
            nextChime += rand(5, 10);
        }
        while (nextDrop < until) {
            drop(ctx, events, nextDrop, rand(0.015, 0.035));
            nextDrop += rand(3, 8);
        }
    };

    return {
        scheduleUntil,
        start(time = ctx.currentTime, { live = true } = {}) {
            started = true;
            [...sources, ...pad.voices].forEach((source) => source.start(time));
            fade.gain.setValueAtTime(0, time);
            fade.gain.linearRampToValueAtTime(AMBIENT_LEVEL, time + 3);
            nextChime = time + 2.5;
            nextDrop = time + 4;
            if (live) {
                scheduleUntil(time + 4);
                timer = setInterval(() => scheduleUntil(ctx.currentTime + 4), 1500);
            }
        },
        stop(seconds = 1.5) {
            clearInterval(timer);
            const now = ctx.currentTime;
            fade.gain.cancelScheduledValues(now);
            fade.gain.setValueAtTime(fade.gain.value, now);
            fade.gain.linearRampToValueAtTime(0, now + seconds);
            [...sources, ...pad.voices].forEach((source) => { try { source.stop(now + seconds + 0.1); } catch { /* already stopped */ } });
        },
        // Moves the pad and the chimes to another chord: the new pad swells in as the old one fades away
        setChord(next = BASE_CHORD, seconds = 5, time = ctx.currentTime) {
            if (next === harmony.name) return;
            harmony = chord(next);
            const old = pad;
            pad = makePad(harmony);
            if (!started) {
                old.level.disconnect();
                return;
            }
            pad.level.gain.setValueAtTime(0, time);
            pad.level.gain.linearRampToValueAtTime(1, time + seconds);
            pad.voices.forEach((source) => source.start(time));
            old.level.gain.cancelScheduledValues(time);
            old.level.gain.setValueAtTime(old.level.gain.value, time);
            old.level.gain.linearRampToValueAtTime(0, time + seconds);
            old.voices.forEach((source) => { try { source.stop(time + seconds + 0.1); } catch { /* already stopped */ } });
        },
    };
};
