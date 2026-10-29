// Procedural sound for the whole app. Nothing is downloaded: every sound is synthesised with Web Audio.
// It is meant to feel calm and open: a soft pad whose voices swell slowly, singing-bowl chimes on a
// pentatonic scale, the odd drop of water, all in a wide reverb. The app sounds in G major; inside a card
// everything moves to that card's chord (src/data/cardChords.js). Every function takes the context
// (a real or an offline one) so it can be rendered and checked without speakers.

import { BASE_CHORD } from '../data/cardChords.js';
import { INHALE, EXHALE } from '../composables/breathCurve.js';

const rand = (min, max) => min + Math.random() * (max - min);

// How loud the ambience gets, so the effects always stand above it
const AMBIENT_LEVEL = 0.12;

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
    maj7: { tones: [0, 4, 7, 11], scale: [0, 2, 4, 7, 11] }, // major seventh: opens, calmly
    m7: { tones: [0, 3, 7, 10], scale: [0, 3, 5, 7, 10] },   // minor seventh: inwards, with an open door
};

// A minor chord (with or without its seventh) turns inwards; any chord with four notes has a seventh
const isMinor = (kind) => kind === 'm' || kind === 'm7';
const hasSeventh = (harmony) => harmony.intervals.length === 4;

// 'D', 'Bm', 'G7', 'F#m', 'Cmaj7', 'Am7'... The pad's bass falls between A2 and G#3, and the voice of the chimes and the touch
// sounds (its root) between E4 and D#5; every other note is counted from those two. G major, the app's own
// chord, gives a pad of G3 D4 G4 B4 D5 G5 and chimes of G4 A4 B4 D5 E5 G5.
export const chord = (name = BASE_CHORD) => {
    const [, letter = 'G', accidental = '', kind = ''] = /^([A-G])([#b]?)(maj7|m7|m|7)?$/.exec(name) ?? [];
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
            tones.length === 4 ? [bass + 12 + tones[3], 0.12] : [bass + 24, 0.08],
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
    // Around 2.8 kHz the ear (and a phone's speaker) is at its most sensitive: the high bowls of the stars, of a cell
    // letting go and of the rulito sounded harsh there, so that band is softened for everything
    const tone = ctx.createBiquadFilter();
    tone.type = 'peaking';
    tone.frequency.value = 2800;
    tone.Q.value = 0.7;
    tone.gain.value = -5;
    // Only a gentle limiter for the odd pile-up. The browser's default compressor (ratio 12, 3 ms attack) grabs every
    // touch sound and bends its wave as it does: on an iPhone's speaker that was heard as distortion
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -12;
    compressor.knee.value = 6;
    compressor.ratio.value = 3;
    compressor.attack.value = 0.02;
    compressor.release.value = 0.3;
    const room = ctx.createConvolver();
    const wet = ctx.createGain();
    room.buffer = reverbImpulse(ctx);
    wet.gain.value = 0.4;

    input.connect(tone);
    tone.connect(compressor);
    tone.connect(room);
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
    bell(ctx, out, time + 0.42, hz(root + harmony.intervals[1]), isMinor(harmony.kind) ? 3.2 : 2.6, 0.06);
    bell(ctx, out, time + 0.46, hz(root - 12), 4, 0.05);
    if (hasSeventh(harmony)) bell(ctx, out, time + 0.7, hz(root + harmony.intervals[3]), 2.6, 0.03);
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
    const minor = isMinor(harmony.kind);
    const seventh = hasSeventh(harmony);
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

    bell(ctx, out, time + 0.06, target, isMinor(harmony.kind) ? 1.8 : 1.3, 0.05);
    if (hasSeventh(harmony)) bell(ctx, out, time + 0.07, target * 1.004, 1.2, 0.022);
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

// Joining two lights (Pañña): the note of each light, one after the other, so a thread is a small interval and a network
// joined one thread at a time is a melody. `lights` are the heights (0..1, low to high) of the two lights it joins; they pick
// notes of the card's chord across two octaves, the highest being the sun and the lowest the field of mushrooms
export const link = (ctx, out, time, harmony, lights = { from: 0.5, to: 0.5, level: 1 }) => {
    const h = harmony ?? PLAIN;
    const notes = h.tones(h.voice - 12, 26);
    const note = (height) => notes[Math.round(height * (notes.length - 1))];
    const minor = isMinor(h.kind);
    const k = lights.level ?? 1;          // a thread that is not part of the pattern sounds softer
    bell(ctx, out, time, hz(note(lights.from)), minor ? 2.2 : 1.7, 0.03 * k);
    bell(ctx, out, time + 0.13, hz(note(lights.to)), minor ? 3 : 2.4, 0.04 * k);
    if (hasSeventh(h)) bell(ctx, out, time + 0.14, hz(note(lights.to)) * 1.004, 2, 0.016 * k);
    swish(ctx, out, time, { from: 2500, to: 5500, duration: 0.5, level: 0.005 * k, q: 0.6 });
};

// Sincronicidad (Resonar). The beat to follow, while someone is playing: the glow reaching a bubble sounds its note very
// softly. `step` is the bubble's place in the sequence (0..1, the smallest egg to the pair): its note climbs the chord
export const pulse = (ctx, out, time, harmony, { step = 0 } = {}) => {
    const h = harmony ?? PLAIN;
    const notes = h.tones(h.voice, 12);
    bell(ctx, out, time, hz(notes[Math.round(step * (notes.length - 1))]), 0.9, 0.012);
};

// A bubble touched on its beat resonates: its note, clear, with the octave below answering and a breath of air
export const resonate = (ctx, out, time, harmony, { step = 0 } = {}) => {
    const h = harmony ?? PLAIN;
    const notes = h.tones(h.voice, 12);
    const note = hz(notes[Math.round(step * (notes.length - 1))]);
    bell(ctx, out, time, note, isMinor(h.kind) ? 2.6 : 2.2, 0.045);
    bell(ctx, out, time + 0.04, note / 2, 2.6, 0.022);
    if (hasSeventh(h)) bell(ctx, out, time + 0.05, note * 1.004, 1.6, 0.014);
    swish(ctx, out, time, { from: 1800, to: 4200, duration: 0.6, level: 0.006, q: 0.6 });
};

// Out of time: only a small muted drop, nothing in the chord
export const miss = (ctx, out, time) => drop(ctx, out, time, 0.03);

// Creatividad (Resonar, a music box): a lit coral or weed passing the comb plays its note like the tine of a music box,
// a bright pluck with a tick of metal that dies fast and a sine that rings on. `step` (0..1) is how high the piece hangs
// on the crown (it picks a note of the card's chord across two octaves); a weed (`low`) plays an octave and a half lower,
// rounder and longer, the bass of the tune. `level` is how loud (a touch sounds a little louder than a pass)
export const tine = (ctx, out, time, harmony, { step = 0.5, low = false, level = 1 } = {}) => {
    const h = harmony ?? PLAIN;
    const notes = low ? h.tones(h.voice - 24, 14) : h.tones(h.voice - 8, 22);
    const f = hz(notes[Math.round(Math.min(1, Math.max(0, step)) * (notes.length - 1))]);
    const k = Math.min(1, Math.max(0, level));
    bell(ctx, out, time, f, low ? 2.8 : 1.9, (low ? 0.05 : 0.036) * k);
    if (!low) {
        // The metal: a high, inharmonic partial that is gone in a moment
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = f * 5.43;
        gain.gain.setValueAtTime(0.0001, time);
        gain.gain.exponentialRampToValueAtTime(0.006 * k, time + 0.004);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.12);
        osc.connect(gain);
        gain.connect(out);
        osc.start(time);
        osc.stop(time + 0.15);
    }
    if (hasSeventh(h)) bell(ctx, out, time + 0.01, f * 1.004, low ? 2 : 1.3, (low ? 0.016 : 0.012) * k);
};

// Giving a light of the little flame (Dana): a breath of air rising and the note of the one who gives, gliding up into it;
// when it gets there `link` answers (the giver's note, then the receiver's). `from` is the giver's height (0..1)
export const give = (ctx, out, time, harmony, lights = { from: 0.5 }) => {
    const h = harmony ?? PLAIN;
    const notes = h.tones(h.voice - 12, 26);
    const target = hz(notes[Math.round(lights.from * (notes.length - 1))]);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(target * 0.75, time);
    osc.frequency.exponentialRampToValueAtTime(target, time + 0.18);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.045, time + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.6);
    osc.connect(gain);
    gain.connect(out);
    osc.start(time);
    osc.stop(time + 0.65);
    swish(ctx, out, time, { from: 700, to: 3200, duration: 0.7, level: 0.012, q: 0.7 });
};

// Every light is joined and the threads carry their light to the third eye: the chord's notes climb from the lowest to the
// highest like a harp that gathers and swells, with a breath of air rising under them
export const converge = (ctx, out, time, harmony) => {
    const h = harmony ?? PLAIN;
    const notes = h.tones(h.voice - 12, 26);
    notes.forEach((midi, i) => bell(ctx, out, time + i * (1.5 / notes.length), hz(midi), 2.2, 0.012 + 0.022 * (i / notes.length)));
    swish(ctx, out, time, { from: 800, to: 6000, duration: 1.7, level: 0.01, q: 0.5 });
};

// The eight threads were not the pattern: the chord's notes fall softly from the highest to the lowest as the threads go out
export const unravel = (ctx, out, time, harmony) => {
    const h = harmony ?? PLAIN;
    const notes = h.tones(h.voice - 12, 26).reverse();
    notes.forEach((midi, i) => bell(ctx, out, time + i * (1.2 / notes.length), hz(midi), 1.8, 0.02 * (1 - 0.6 * i / notes.length)));
    swish(ctx, out, time, { from: 5000, to: 900, duration: 1.4, level: 0.007, q: 0.5 });
};

// Charging the fire (Encender): one more note of the card's chord each time the charge is enough for one more light, climbing
// with it, and a small crackle. `step` is how far it has climbed (0..1): the notes go up two octaves of the chord
export const kindle = (ctx, out, time, harmony, { step = 0 } = {}) => {
    const h = harmony ?? PLAIN;
    const notes = h.tones(h.voice - 12, 26);
    const midi = notes[Math.round(Math.min(1, Math.max(0, step)) * (notes.length - 1))];
    bell(ctx, out, time, hz(midi), 1.6, 0.03);
    if (hasSeventh(h)) bell(ctx, out, time + 0.01, hz(midi) * 1.005, 1.2, 0.012);
    swish(ctx, out, time, { from: 2200, to: 4200, duration: 0.25, level: 0.006, q: 2 });
};

// Going with the current (Fluir): a soft round note of the card's chord that slides into place like water, a little
// moving water under it. Played again and again while the current is accompanied; `step` (0..1) is how high on the
// chord it lands (it rises and falls with the current's pace) and `level` how loud
export const flow = (ctx, out, time, harmony, { step = 0.5, level = 1 } = {}) => {
    const h = harmony ?? PLAIN;
    const notes = h.tones(h.voice - 12, 26);
    const target = hz(notes[Math.round(Math.min(1, Math.max(0, step)) * (notes.length - 1))]);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(target * 0.94, time);
    osc.frequency.exponentialRampToValueAtTime(target, time + 0.16);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.03 * level, time + 0.07);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.9);
    osc.connect(gain);
    gain.connect(out);
    osc.start(time);
    osc.stop(time + 1);
    bell(ctx, out, time + 0.05, target, isMinor(h.kind) ? 1.8 : 1.4, 0.014 * level);
    swish(ctx, out, time, { from: 600, to: 1300, duration: 0.7, level: 0.004 * level, q: 0.9 });
};

// The fire is let go (Encender), or leaps (Sincronicidad, with the four bubbles lit): a rush of air rising from low, like a flame catching, over a low bowl on the root.
// `level` (0..1) is how charged it was
export const ignite = (ctx, out, time, harmony, level = 1) => {
    const h = harmony ?? PLAIN;
    const k = 0.4 + 0.6 * Math.min(1, Math.max(0, level));
    swish(ctx, out, time, { from: 300, to: 2600, duration: 0.9, level: 0.03 * k, q: 0.7 });
    bell(ctx, out, time + 0.02, hz(h.voice - 12), 2.6, 0.04 * k);
};

// A seventh that resolves (when a card with a dominant seventh completes its game: Encender in Evolución, the tune of
// Creatividad): the card's chord rings once more as the tension it is, and then moves to the chord a fifth below, which a
// dominant seventh asks for (B7 goes to E major: the corona comes down to the plexus, Kätus's own note; C7 goes to F major,
// the heart). Each voice moves to the nearest note of the new chord; the new root sounds below.
export const resolve = (ctx, out, time, harmony) => {
    const h = harmony ?? PLAIN;
    const from = h.tones(h.voice, 11);
    from.forEach((midi, i) => bell(ctx, out, time + i * 0.03, hz(midi), 1.5, 0.022));
    const home = h.voice - 7;                       // the root a fifth below (B4 to E4)
    const major = [0, 4, 7].map((s) => (home + s) % 12);
    const near = (midi) => {
        for (let d = 0; d <= 6; d++) {
            if (major.includes((midi - d + 120) % 12)) return midi - d;
            if (major.includes((midi + d) % 12)) return midi + d;
        }
        return midi;
    };
    const at = time + 0.75;
    [...new Set(from.map(near))].forEach((midi, i) => bell(ctx, out, at + i * 0.025, hz(midi), 4, 0.03));
    bell(ctx, out, at, hz(home - 12), 5, 0.045);
    bell(ctx, out, at + 0.04, hz(home + 12), 3.4, 0.016);
    swish(ctx, out, time + 0.5, { from: 1500, to: 5000, duration: 1.4, level: 0.008, q: 0.6 });
};

// The rulito, the reward of every verb: the card's chord one octave up. As in Gurdjieff's law of octaves, a process
// that is completed starts again on the do above: the chord's notes climb from its root to the root an octave
// higher, and there the whole chord rings at once, an octave over the one the card has been sounding in, with a bowl
// on the root it started from underneath so the leap is heard. Minor climbs slower; a seventh shimmers.
export const rulito = (ctx, out, time, harmony) => {
    const h = harmony ?? PLAIN;
    const minor = isMinor(h.kind);
    const seventh = hasSeventh(h);
    const climb = h.tones(h.voice, 12);
    const gap = minor ? 0.13 : 0.1;
    climb.forEach((midi, i) => bell(ctx, out, time + i * gap, hz(midi), 1.6, 0.018 + 0.006 * (i / climb.length)));
    const at = time + climb.length * gap;
    h.tones(h.voice + 12, 11).forEach((midi, i) => {
        bell(ctx, out, at + i * 0.018, hz(midi), minor ? 4.2 : 3.6, 0.026);
        if (seventh) bell(ctx, out, at + i * 0.018 + 0.01, hz(midi) * 1.004, 3, 0.012);
    });
    bell(ctx, out, at, hz(h.voice - 12), 4.5, 0.03);
    swish(ctx, out, time, { from: 2500, to: 8000, duration: climb.length * gap + 0.6, level: 0.009, q: 0.6 });
};

// The third eye opens: a low bowl on the chord's root and fifth, and a high shimmer over them
export const open = (ctx, out, time, harmony) => {
    const h = harmony ?? PLAIN;
    bell(ctx, out, time, hz(h.voice - 24), 5, 0.06);
    bell(ctx, out, time + 0.02, hz(h.voice - 17), 4.4, 0.04);
    bell(ctx, out, time + 0.05, hz(h.voice + 12), 3.2, 0.03);
    swish(ctx, out, time, { from: 4000, to: 9000, duration: 1.2, level: 0.01, q: 0.6 });
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

/* ---------- Breathing: the air and the chord both follow the scene's own breath curve (breathCurve.js) ---------- */

const smooth = (k) => { const x = Math.max(0, Math.min(1, k)); return x * x * (3 - 2 * x); };
const sampled = (fn, n = 128) => Float32Array.from({ length: n }, (_, i) => fn(i / (n - 1)));

// The same shape as breathCurve.js: it rises through the whole inhale and falls through the whole exhale
const breathShape = (t) => {
    if (t <= 0 || t >= INHALE + EXHALE) return 0;
    if (t < INHALE) return smooth(t / INHALE);
    const k = (t - INHALE) / EXHALE;
    return Math.max(0, 1 - smooth(k) - 0.12 * Math.sin(Math.PI * k));
};

// The air of a breath: noise that is dark when it is quiet and opens up as it grows, with a hair of natural
// flutter. `shape` (0..1) is its loudness over the duration, `colour` its centre in Hz; both are sampled curves, so
// nothing jumps (an exponential ramp from silence is mute for most of its length and then bursts).
const airBreath = (ctx, out, time, { duration, shape, colour, level }) => {
    const source = ctx.createBufferSource();
    const body = ctx.createBiquadFilter();
    const top = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    const flutter = ctx.createGain();
    const lfo = ctx.createOscillator();
    const depth = ctx.createGain();
    source.buffer = whiteBuffer(ctx, 2);
    source.loop = true;
    body.type = 'bandpass';
    body.Q.value = 0.8;
    body.frequency.setValueCurveAtTime(sampled((k) => colour(k)), time, duration);
    top.type = 'lowpass';
    top.frequency.value = 3600;
    top.Q.value = 0.3;
    gain.gain.setValueAtTime(0, time);
    gain.gain.setValueCurveAtTime(sampled((k) => level * shape(k * duration)), time, duration);
    gain.gain.setValueAtTime(0, time + duration + 0.01);
    flutter.gain.value = 1;
    lfo.frequency.value = 0.55;
    depth.gain.value = 0.07;
    lfo.connect(depth);
    depth.connect(flutter.gain);
    source.connect(body);
    body.connect(top);
    top.connect(gain);
    gain.connect(flutter);
    flutter.connect(out);
    source.start(time);
    lfo.start(time);
    source.stop(time + duration + 0.05);
    lfo.stop(time + duration + 0.05);
};

// The chord underneath: its root, fifth and octave, each a pair of slightly detuned voices, softened, that swell
// and fade with the same shape as the air (so they never appear all of a sudden)
const chordBreath = (ctx, out, time, harmony, { duration, shape, level }) => {
    const h = harmony ?? PLAIN;
    const soft = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    soft.type = 'lowpass';
    soft.frequency.value = 1100;
    soft.Q.value = 0.4;
    gain.gain.setValueAtTime(0, time);
    gain.gain.setValueCurveAtTime(sampled((k) => level * Math.pow(shape(k * duration), 1.3)), time, duration);
    gain.gain.setValueAtTime(0, time + duration + 0.01);
    soft.connect(gain);
    gain.connect(out);
    [[h.bass + 12, 1], [h.bass + 19, 0.7], [h.bass + 24, 0.5]].forEach(([midi, share]) => {
        [-4, 4].forEach((cents) => {
            const osc = ctx.createOscillator();
            const voice = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = hz(midi);
            osc.detune.value = cents;
            voice.gain.value = share * 0.5;
            osc.connect(voice);
            voice.connect(soft);
            osc.start(time);
            osc.stop(time + duration + 0.05);
        });
    });
};

// the air opens as it fills and closes as it goes out
const inColour = (k) => 320 * Math.pow(1500 / 320, smooth(k));
const outColour = (k) => 1500 * Math.pow(340 / 1500, smooth(k));

// One slow breath, the length of breathCurve.js: in and out, joined
export const breath = (ctx, out, time, harmony) => {
    const duration = INHALE + EXHALE;
    const colour = (k) => { const t = k * duration; return t < INHALE ? inColour(t / INHALE) : outColour((t - INHALE) / EXHALE); };
    airBreath(ctx, out, time, { duration, shape: breathShape, colour, level: 0.17 });
    chordBreath(ctx, out, time, harmony, { duration, shape: breathShape, level: 0.016 });
};

// Holding Sid: the air comes in through the whole inhale and is then held, thinning out slowly
export const inhale = (ctx, out, time, harmony) => {
    const HOLD = 1.6;
    const duration = INHALE + HOLD;
    const shape = (t) => (t < INHALE ? smooth(t / INHALE) : (0.3 + 0.7 * (1 - smooth((t - INHALE) / 0.35))) * (1 - smooth((t - INHALE) / HOLD)));
    const colour = (k) => { const t = k * duration; return t < INHALE ? inColour(t / INHALE) : 1500 * Math.pow(0.8, (t - INHALE)); };
    airBreath(ctx, out, time, { duration, shape, colour, level: 0.17 });
    chordBreath(ctx, out, time, harmony, { duration, shape, level: 0.015 });
};

// Letting him go: the air goes out at once and fades through the whole exhale
export const exhale = (ctx, out, time, harmony) => {
    const duration = EXHALE;
    const shape = (t) => { const k = t / EXHALE; return smooth(k / 0.07) * (1 - smooth(k)); };
    airBreath(ctx, out, time, { duration, shape, colour: (k) => outColour(k), level: 0.2 });
    chordBreath(ctx, out, time, harmony, { duration, shape, level: 0.015 });
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

    // Every oscillator the pad has ever had (it is rebuilt at each chord change), so stopping really stops them all
    const everyVoice = [];
    const makePad = (harmony) => {
        const level = ctx.createGain();
        level.connect(filter);
        const voices = [];
        everyVoice.push(voices);
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
            // Fades from wherever it is (without reading the parameter, which some browsers answer with a stale value)
            fade.gain.cancelScheduledValues(now);
            fade.gain.setTargetAtTime(0, now, seconds / 4);
            [...sources, ...everyVoice.flat()].forEach((source) => { try { source.stop(now + seconds + 0.1); } catch { /* already stopped or never started */ } });
            // Whatever happens to the parameter or the clock (a context that was suspended halfway), after the fade
            // nothing of this ambience can reach the speakers: it is cut from the graph
            setTimeout(() => fade.disconnect(), (seconds + 0.3) * 1000);
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
