// Procedural sound for the whole app. Nothing is downloaded: every sound is synthesised with Web Audio.
// The scene is the inside of a body seen by a tiny character, so the ambience is a watery hum with a
// very faint heartbeat and the odd bubble. Every function takes the context (a real or an offline one)
// so it can be rendered and checked without speakers.

const rand = (min, max) => min + Math.random() * (max - min);

// How loud the ambience gets, so the effects always stand above it
const AMBIENT_LEVEL = 0.4;

// Brown noise: white noise integrated, which sounds like a low rumble of water
const noiseBuffer = (ctx, seconds = 2) => {
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i++) {
        last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
        data[i] = last * 3.5;
    }
    return buffer;
};

// White noise: flat across the spectrum, for swishes and ticks
const whiteBuffer = (ctx, seconds = 1) => {
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
};

export const createMaster = (ctx) => {
    const gain = ctx.createGain();
    gain.gain.value = 0.9;
    const compressor = ctx.createDynamicsCompressor();
    gain.connect(compressor);
    compressor.connect(ctx.destination);
    return gain;
};

// A soft bell: a sine with a quiet inharmonic partner, quick attack and a long decay
const bell = (ctx, out, time, frequency, duration, level) => {
    [[1, 1], [2.76, 0.18]].forEach(([ratio, share]) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = frequency * ratio;
        gain.gain.setValueAtTime(0.0001, time);
        gain.gain.exponentialRampToValueAtTime(level * share, time + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + duration / ratio);
        osc.connect(gain);
        gain.connect(out);
        osc.start(time);
        osc.stop(time + duration + 0.05);
    });
};

// A bubble: a sine that glides upwards, panned somewhere in the stereo field
const bubble = (ctx, out, time, level = 0.07) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    // Older Safari has no stereo panner: the bubble just plays in the centre
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain();
    const from = rand(280, 620);
    const length = rand(0.08, 0.16);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(from, time);
    osc.frequency.exponentialRampToValueAtTime(from * rand(1.6, 2.2), time + length);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(level, time + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + length + 0.05);
    if (pan.pan) pan.pan.value = rand(-0.8, 0.8);
    osc.connect(gain);
    gain.connect(pan);
    pan.connect(out);
    osc.start(time);
    osc.stop(time + length + 0.1);
};

// One half of a heartbeat: a low sine that drops in pitch
const thump = (ctx, out, time, level) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(64, time);
    osc.frequency.exponentialRampToValueAtTime(38, time + 0.18);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(level, time + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.22);
    osc.connect(gain);
    gain.connect(out);
    osc.start(time);
    osc.stop(time + 0.3);
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
    gain.gain.exponentialRampToValueAtTime(level, time + duration * 0.35);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(out);
    source.start(time);
    source.stop(time + duration + 0.05);
};

/* ---------- Effects: each one is (ctx, out, time) ---------- */

// Picking a card: a water drop and a two-note bell
export const pick = (ctx, out, time) => {
    bubble(ctx, out, time, 0.12);
    bell(ctx, out, time + 0.05, 880, 1.8, 0.16);
    bell(ctx, out, time + 0.2, 1318.5, 1.6, 0.11);
};

// Turning the card over
export const flip = (ctx, out, time) => {
    swish(ctx, out, time, { from: 500, to: 2600, duration: 0.45, level: 0.17 });
    bell(ctx, out, time + 0.4, 1760, 1.2, 0.07);
};

// A shooting star: two high, quiet pings and a little shimmer
export const star = (ctx, out, time) => {
    bell(ctx, out, time, 2093, 1.4, 0.05);
    bell(ctx, out, time + 0.11, 2637, 1.2, 0.04);
    swish(ctx, out, time, { from: 6000, to: 9000, duration: 0.6, level: 0.015, q: 0.7 });
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

// Tapping a button or a link
export const tap = (ctx, out, time) => bubble(ctx, out, time, 0.08);

/* ---------- Ambience ---------- */

export const createAmbient = (ctx, out) => {
    const fade = ctx.createGain();
    fade.gain.value = 0;
    fade.connect(out);

    const bus = ctx.createGain();
    bus.gain.value = 0.5;
    bus.connect(fade);

    // Pad: a few detuned voices through a low-pass that opens and closes slowly
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 520;
    filter.Q.value = 0.7;
    filter.connect(bus);

    const sources = [];
    const voices = [[73.42, 'sine', 0.5], [110, 'triangle', 0.26], [146.83, 'sine', 0.2], [185, 'sine', 0.1]];
    voices.forEach(([frequency, type, level]) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.value = frequency;
        osc.detune.value = rand(-8, 8);
        gain.gain.value = level * 0.45;
        osc.connect(gain);
        gain.connect(filter);
        sources.push(osc);
    });

    const sweep = ctx.createOscillator();
    const sweepDepth = ctx.createGain();
    sweep.frequency.value = 0.07;
    sweepDepth.gain.value = 260;
    sweep.connect(sweepDepth);
    sweepDepth.connect(filter.frequency);
    sources.push(sweep);

    // The pad breathes
    const breath = ctx.createOscillator();
    const breathDepth = ctx.createGain();
    breath.frequency.value = 0.11;
    breathDepth.gain.value = 0.15;
    breath.connect(breathDepth);
    breathDepth.connect(bus.gain);
    sources.push(breath);

    // Liquid hum
    const hum = ctx.createBufferSource();
    const humFilter = ctx.createBiquadFilter();
    const humGain = ctx.createGain();
    hum.buffer = noiseBuffer(ctx, 3);
    hum.loop = true;
    humFilter.type = 'bandpass';
    humFilter.frequency.value = 260;
    humFilter.Q.value = 0.8;
    humGain.gain.value = 0.55;
    hum.connect(humFilter);
    humFilter.connect(humGain);
    humGain.connect(bus);
    sources.push(hum);

    // Heartbeat and bubbles go through their own low-pass, quieter than everything else
    const events = ctx.createGain();
    events.gain.value = 0.6;
    events.connect(fade);
    const heartFilter = ctx.createBiquadFilter();
    heartFilter.type = 'lowpass';
    heartFilter.frequency.value = 140;
    heartFilter.connect(events);

    let nextBeat = 0;
    let nextBubble = 0;
    let timer = null;

    // Schedules heartbeats and bubbles up to a point in time (the context's own clock)
    const scheduleUntil = (until) => {
        while (nextBeat < until) {
            thump(ctx, heartFilter, nextBeat, 0.2);
            thump(ctx, heartFilter, nextBeat + 0.3, 0.12);
            nextBeat += rand(1.1, 1.25);
        }
        while (nextBubble < until) {
            bubble(ctx, events, nextBubble, rand(0.03, 0.06));
            nextBubble += rand(2.2, 6);
        }
    };

    return {
        scheduleUntil,
        start(time = ctx.currentTime, { live = true } = {}) {
            sources.forEach((source) => source.start(time));
            fade.gain.setValueAtTime(0, time);
            fade.gain.linearRampToValueAtTime(AMBIENT_LEVEL, time + 2.5);
            nextBeat = time + 0.8;
            nextBubble = time + 1.5;
            if (live) {
                scheduleUntil(time + 4);
                timer = setInterval(() => scheduleUntil(ctx.currentTime + 4), 1500);
            }
        },
        stop(seconds = 1.2) {
            clearInterval(timer);
            const now = ctx.currentTime;
            fade.gain.cancelScheduledValues(now);
            fade.gain.setValueAtTime(fade.gain.value, now);
            fade.gain.linearRampToValueAtTime(0, now + seconds);
            sources.forEach((source) => { try { source.stop(now + seconds + 0.1); } catch { /* already stopped */ } });
        },
    };
};
