// One slow breath shared by everything that breathes together in Vipassana: the character, the field of cells, the
// light and the sound (src/audio/synth.js). Seconds in, 0..1 out (a hair below zero at the end of the exhale, as if
// the breath pushed a little outwards).

export const INHALE = 1.8;
export const EXHALE = 2.6;
export const BREATH = INHALE + EXHALE;

const ease = (k) => k * k * (3 - 2 * k);

// t is the time since the breath began; outside of it the envelope is 0
export const breathEnvelope = (t) => {
    if (t < 0 || t >= BREATH) return 0;
    if (t < INHALE) return ease(t / INHALE);
    const k = (t - INHALE) / EXHALE;
    return 1 - ease(k) - 0.12 * Math.sin(Math.PI * k);
};
