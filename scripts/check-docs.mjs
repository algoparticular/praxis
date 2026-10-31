// Keeps the card table in docs/cartas.md in step with the data it comes from: cards.json (name, category, verb),
// cardChords.js (chord) and sceneNames.js (scene). The table between the two markers in the doc is generated;
// the reasons table above it is written by hand, so only its chord column is checked.
// Usage: npm run check:docs (fails when out of date), npm run docs (rewrites the table)
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { VERBS } from '../src/data/verbs.js';
import { chordFor } from '../src/data/cardChords.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const at = (...parts) => path.join(root, ...parts);
const write = process.argv.includes('--write');

const cards = JSON.parse(readFileSync(at('src', 'data', 'cards.json'), 'utf8'));
const scenesSource = readFileSync(at('src', 'data', 'sceneNames.js'), 'utf8');
const withScene = new Set([...scenesSource.match(/const names = \{([^}]*)\}/)[1].matchAll(/(\d+):/g)].map((m) => Number(m[1])));
// Cards whose verb can be played in the scene today. Update it when another card gets a game.
const PLAYABLE = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 14, 17, 20, 22, 24, 25, 26, 27, 29, 31, 32]);

const NOTE = { C: 'Do', D: 'Re', E: 'Mi', F: 'Fa', G: 'Sol', A: 'La', B: 'Si' };
const chordName = (sym) => {
    const [, letter, accidental, kind] = /^([A-G])([#b]?)(maj7|m7|m|7)?$/.exec(sym);
    const root = NOTE[letter] + accidental;
    return { m: `${root} menor`, 7: `${root}7`, maj7: `${root}maj7`, m7: `${root}m7` }[kind] ?? `${root} mayor`;
};

const rows = cards.map((card) => {
    const verb = card.verb ? VERBS[card.verb].es : 'sin verbo';
    const app = !withScene.has(card.id) ? 'Ilustración plana' : PLAYABLE.has(card.id) ? 'Escena propia, verbo jugable' : 'Escena propia, sin juego todavía';
    return `| ${card.id} | ${card.name_es.trim()} | ${card.category} | ${verb} | ${chordName(chordFor(card.id))} | ${app} |`;
});
const table = ['| # | Carta | Categoría | Verbo | Acorde | En la app |', '|---|---|---|---|---|---|', ...rows].join('\n');

const docPath = at('docs', 'cartas.md');
const doc = readFileSync(docPath, 'utf8');
const START = '<!-- tabla:inicio -->';
const END = '<!-- tabla:fin -->';
const a = doc.indexOf(START);
const b = doc.indexOf(END);
if (a < 0 || b < a) {
    console.error(`docs/cartas.md needs the markers ${START} and ${END} around the card table.`);
    process.exit(1);
}
const next = `${doc.slice(0, a + START.length)}\n${table}\n${doc.slice(b)}`;

const errors = [];
// The hand-written reasons table: its chord column must be the card's chord
for (const line of doc.split('\n')) {
    const m = /^\| (\d+) \| [^|]+\| ([^|]+?) \|/.exec(line);
    if (!m || line.includes('| Categoría |')) continue;
    const id = Number(m[1]);
    if (!cards.some((c) => c.id === id)) continue;
    const written = m[2].replace(' (base)', '');
    const expected = chordName(chordFor(id));
    if (written !== expected && !line.includes('| Verbo |')) {
        // rows of the generated table have the category in the third column, so they never match a chord name
        if (!/^(Paramis|Regular|Special)$/.test(written)) errors.push(`docs/cartas.md: card ${id} says ${written} but cardChords.js has ${expected}`);
    }
}

if (write) {
    writeFileSync(docPath, next);
    console.log('docs/cartas.md: card table rewritten.');
} else if (next !== doc) {
    errors.push('docs/cartas.md: the card table is out of date. Run npm run docs.');
}

if (errors.length) {
    console.error(errors.join('\n'));
    process.exit(1);
}
if (!write) console.log('docs/cartas.md matches the card data.');
