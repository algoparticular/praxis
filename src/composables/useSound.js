// Sound and haptics for the whole app, behind one switch that is off until the person turns it on.
// Built to work in iOS browsers:
//  - audio only starts inside a user gesture (click / touchend), which is when iOS lets a context run;
//  - the audio session is set to "playback" so the ringer switch does not mute it (with a silent <audio>
//    track as the fallback on iOS versions without navigator.audioSession);
//  - if iOS suspends or interrupts the context (a call, the app in the background) the next touch resumes it.
// Vibration is not available in iOS browsers, so there it is simply skipped.
import { ref } from 'vue';
import * as synth from '../audio/synth.js';
import { track } from '../analytics.js';

const STORAGE_KEY = 'sound';

export const soundOn = ref(false);

let ctx = null;
let master = null;
let ambient = null;
let silentTrack = null;
// The chord of the card on screen (null outside the cards): the touch sounds play in it and the ambience follows it
let cardChord = null;

const readPreference = () => {
    try { return localStorage.getItem(STORAGE_KEY) === 'on'; } catch { return false; }
};
const writePreference = (on) => {
    try { localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off'); } catch { /* storage can be blocked */ }
};

// Half a second of silence as a WAV, built in memory. Playing it as <audio> moves old iOS from the
// "ambient" session (muted by the ringer switch) to "playback".
const makeSilentTrack = () => {
    const sampleRate = 8000;
    const samples = 4000;
    const buffer = new ArrayBuffer(44 + samples);
    const view = new DataView(buffer);
    const text = (offset, value) => [...value].forEach((char, i) => view.setUint8(offset + i, char.charCodeAt(0)));
    text(0, 'RIFF');
    view.setUint32(4, 36 + samples, true);
    text(8, 'WAVE');
    text(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate, true);
    view.setUint16(32, 1, true);
    view.setUint16(34, 8, true);
    text(36, 'data');
    view.setUint32(40, samples, true);
    new Uint8Array(buffer, 44).fill(128);

    const audio = new Audio(URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' })));
    audio.loop = true;
    audio.preload = 'auto';
    audio.setAttribute('playsinline', '');
    return audio;
};

const prepareSession = () => {
    try {
        if ('audioSession' in navigator) {
            navigator.audioSession.type = 'playback';
        } else {
            silentTrack = silentTrack || makeSilentTrack();
            silentTrack.play().catch(() => {});
        }
    } catch { /* not every browser has it */ }
};

const ensureContext = () => {
    if (ctx) return ctx;
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return null;
    ctx = new Context();
    master = synth.createMaster(ctx);
    return ctx;
};

const resume = () => {
    if (!ctx || ctx.state === 'running') return Promise.resolve();
    return Promise.resolve(ctx.resume()).catch(() => {});
};

// Has to be called straight from a gesture handler, before any await, so iOS counts it as the gesture
const enable = () => {
    if (!ensureContext()) return Promise.resolve(false);
    prepareSession();
    const resumed = resume();
    soundOn.value = true;
    writePreference(true);
    return resumed.then(() => {
        if (!ambient && soundOn.value) {
            ambient = synth.createAmbient(ctx, master, cardChord?.name);
            ambient.start();
        }
        return true;
    });
};

const disable = () => {
    ambient?.stop();
    ambient = null;
    silentTrack?.pause();
    soundOn.value = false;
    writePreference(false);
};

export const toggleSound = () => {
    if (soundOn.value) {
        disable();
        track('sound_toggled', { on: false });
        return Promise.resolve(false);
    }
    return enable().then((on) => { if (on) track('sound_toggled', { on: true }); return on; });
};

export const play = (name) => {
    if (!soundOn.value || !ctx || ctx.state !== 'running' || typeof synth[name] !== 'function') return;
    synth[name](ctx, master, ctx.currentTime + 0.02, cardChord);
};

// Called when a card comes on screen with its chord (src/data/cardChords.js), and with nothing when it leaves
export const setCardChord = (name = null) => {
    if ((cardChord?.name ?? null) === name) return;
    cardChord = name ? synth.chord(name) : null;
    if (ambient && ctx) ambient.setChord(name ?? undefined);
};

export const vibrate = (pattern) => {
    if (soundOn.value && typeof navigator.vibrate === 'function') navigator.vibrate(pattern);
};

// Called once from the app. A choice saved in a previous visit cannot start audio by itself, so it
// waits for the first touch; the same listeners wake the context up after an iOS interruption.
export const initSound = () => {
    soundOn.value = readPreference();

    const onGesture = () => {
        if (!soundOn.value) return;
        if (!ctx || !ambient) { enable(); return; }
        if (ctx.state !== 'running') { prepareSession(); resume(); }
    };
    ['touchend', 'click', 'keydown'].forEach((type) => window.addEventListener(type, onGesture, { passive: true }));

    // Nothing plays while the page is hidden
    document.addEventListener('visibilitychange', () => {
        if (!ctx) return;
        if (document.hidden) ctx.suspend?.();
        else if (soundOn.value) resume();
    });
};
