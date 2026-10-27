// One slow breath shared by everything that breathes together in Vipassana: the character, the field of cells, the
// light and the sound (src/audio/synth.js). Seconds in, 0..1 out (a hair below zero at the end of the exhale, as if
// the breath pushed a little outwards).

export const INHALE = 1.8;
export const EXHALE = 2.6;
export const BREATH = INHALE + EXHALE;

// How far Sid rises while the mandala is formed, as a share of his own height. The orbits stay where they are, centred
// on the middle of his picture; his body is not (the mass of it, measured on the picture, is at 0.67 of its height),
// so he goes up by the difference and his body ends in the middle of the orbits.
export const RISE = 0.17;
// and how far he goes to the left, as a share of his own width: the mass of his body is 0.539 of the way across his
// picture, not 0.5
export const SIDE = 0.07;

const ease = (k) => k * k * (3 - 2 * k);

// t is the time since the breath began; outside of it the envelope is 0
export const breathEnvelope = (t) => {
    if (t < 0 || t >= BREATH) return 0;
    if (t < INHALE) return ease(t / INHALE);
    const k = (t - INHALE) / EXHALE;
    return 1 - ease(k) - 0.12 * Math.sin(Math.PI * k);
};
