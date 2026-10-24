// Procedural sound for the whole app. Nothing is downloaded: every sound is synthesised with Web Audio.
// It is meant to feel calm and open: a soft D major pad whose voices swell slowly, singing-bowl chimes
// on a pentatonic scale, the odd drop of water, all in a wide reverb. Every function takes the context
// (a real or an offline one) so it can be rendered and checked without speakers.

const rand = (min, max) => min + Math.random() * (max - min);

// How loud the ambience gets, so the effects always stand above it
const AMBIENT_LEVEL = 0.15;

// D major pentatonic, D5 to D6: whatever order the chimes come in, they never clash
const CHIME_NOTES = [587.33, 659.25, 739.99, 880, 987.77, 1174.66];

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

/* ---------- Effects: each one is (ctx, out, time) ---------- */

// Picking a card: three bowl notes climbing the scale
export const pick = (ctx, out, time) => {
    bell(ctx, out, time, 587.33, 3.4, 0.13);
    bell(ctx, out, time + 0.16, 880, 3.2, 0.11);
    bell(ctx, out, time + 0.34, 1174.66, 3.4, 0.07);
};

// Turning the card over: a breath of air and one high note
export const flip = (ctx, out, time) => {
    swish(ctx, out, time, { from: 400, to: 1800, duration: 0.65, level: 0.1, q: 0.6 });
    bell(ctx, out, time + 0.42, 739.99, 2.6, 0.06);
};

// A shooting star: three quiet, high notes falling like sparks and a little shimmer
export const star = (ctx, out, time) => {
    bell(ctx, out, time, 2960, 2.4, 0.022);
    bell(ctx, out, time + 0.1, 2349.3, 2.6, 0.027);
    bell(ctx, out, time + 0.2, 1760, 2.8, 0.03);
    swish(ctx, out, time, { from: 7000, to: 9500, duration: 0.7, level: 0.012, q: 0.6 });
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

// Tapping a button or a link: one small drop
export const tap = (ctx, out, time) => drop(ctx, out, time, 0.08);

/* ---------- Ambience ---------- */

export const createAmbient = (ctx, out) => {
    const fade = ctx.createGain();
    fade.gain.value = 0;
    fade.connect(out);

    const bus = ctx.createGain();
    bus.gain.value = 0.5;
    bus.connect(fade);

    // Pad: an open D major chord. Every voice has a slightly detuned twin and swells on its own slow cycle.
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1700;
    filter.Q.value = 0.4;
    filter.connect(bus);

    const sources = [];
    const voices = [[146.83, 0.28], [220, 0.4], [293.66, 0.34], [369.99, 0.26], [440, 0.18], [587.33, 0.08]];
    voices.forEach(([frequency, level]) => {
        const voiceGain = ctx.createGain();
        voiceGain.gain.value = level * 0.55;
        voiceGain.connect(filter);

        [-5, 5].forEach((cents) => {
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = frequency;
            osc.detune.value = cents;
            osc.connect(voiceGain);
            sources.push(osc);
        });

        const swell = ctx.createOscillator();
        const depth = ctx.createGain();
        swell.frequency.value = rand(0.035, 0.085);
        depth.gain.value = level * 0.4;
        swell.connect(depth);
        depth.connect(voiceGain.gain);
        sources.push(swell);
    });

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
            const index = Math.floor(Math.random() * CHIME_NOTES.length);
            bell(ctx, events, nextChime, CHIME_NOTES[index], 6, rand(0.05, 0.075));
            // Now and then a second note answers, a step or two higher on the scale
            if (Math.random() < 0.4 && index + 1 < CHIME_NOTES.length) {
                bell(ctx, events, nextChime + rand(0.5, 0.9), CHIME_NOTES[Math.min(CHIME_NOTES.length - 1, index + 1 + Math.floor(Math.random() * 2))], 6, rand(0.035, 0.055));
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
            sources.forEach((source) => source.start(time));
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
            sources.forEach((source) => { try { source.stop(now + seconds + 0.1); } catch { /* already stopped */ } });
        },
    };
};
