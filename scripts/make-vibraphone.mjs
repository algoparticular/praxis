// The bowls of the app (every chime and bell note but the water's) ring on a vibraphone played with soft mallets:
// Versilian Community Sample Library (VCSL, CC0, public domain: no credit needed), github.com/sgossner/VCSL,
// Idiophones/Struck Idiophones/Vibraphone/Soft Mallets. Downloads six of its notes, one every fifth, and writes
// public/assets/sound/vibraphone/<midi>.mp3: mono, from the first sound, 6 s with the last 1.5 s faded, at the same
// loudness, MP3 64 kbps (every browser decodes it; the eleven notes at 96 kbps weighed 781 KB and were not heard to be
// better). Each file is named by the note it really sounds: the library names them an octave lower (Vibes_soft_D4
// sounds D5, 587 Hz; measured on every file). src/audio/synth.js plays the nearest one, retuned (`bell`).
// Needs ffmpeg. Usage: node scripts/make-vibraphone.mjs
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public', 'assets', 'sound', 'vibraphone');
const SOURCE = 'https://raw.githubusercontent.com/sgossner/VCSL/master/Idiophones/Struck%20Idiophones/Vibraphone/Soft%20Mallets/';
const LETTERS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const NOTES = ['F2', 'C3', 'G3', 'D4', 'A4', 'E5'];
// The library's name, plus the octave it is named under
const midiOf = (note) => 12 * (Number(note.slice(1)) + 1) + LETTERS[note[0]] + 12;

await mkdir(outDir, { recursive: true });
const tmp = path.join(os.tmpdir(), 'vibraphone');
await mkdir(tmp, { recursive: true });
for (const note of NOTES) {
    const name = `Vibes_soft_${note}_v2_rr1_Main.wav`;
    const response = await fetch(SOURCE + name);
    if (!response.ok) throw new Error(`${name}: ${response.status}`);
    const wav = path.join(tmp, name);
    await writeFile(wav, Buffer.from(await response.arrayBuffer()));
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', wav,
        '-af', 'silenceremove=start_periods=1:start_threshold=-50dB,atrim=0:6,afade=t=out:st=4.5:d=1.5,loudnorm=I=-20:TP=-1.5:LRA=20,aresample=44100',
        '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '64k', path.join(outDir, `${midiOf(note)}.mp3`)]);
}
await rm(tmp, { recursive: true, force: true });
console.log(`${NOTES.length} notes written to public/assets/sound/vibraphone/ (${NOTES.map(midiOf).join(', ')})`);
