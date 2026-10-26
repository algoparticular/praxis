// Size budgets for the build in dist/: how much JavaScript a visit must download and how heavy the pictures are.
// The numbers are today's sizes plus some room; when something legitimately grows, raise its line here on purpose,
// in the same pull request, so a jump in weight is always a decision and never an accident.
// Usage: npm run build && npm run check:budget
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
if (!existsSync(dist)) {
    console.error('There is no dist/: run npm run build first');
    process.exit(1);
}

const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => (entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]));
const files = walk(dist).map((file) => ({ file, rel: path.relative(dist, file).split(path.sep).join('/') }));
const kb = (bytes) => bytes / 1024;
const gzipKb = (file) => kb(gzipSync(readFileSync(file)).length);
const sizeKb = (file) => kb(statSync(file).size);

const rows = [];
const check = (label, value, limit) => rows.push({ label, value, limit });

// JavaScript, gzipped (what travels): the app's entry, three.js, and every other chunk
const scripts = files.filter(({ rel }) => rel.endsWith('.js'));
for (const { file, rel } of scripts) {
    const name = path.basename(rel);
    if (/^three\.module/.test(name)) check(`JS ${name} (three.js)`, gzipKb(file), 215);
    else if (/^index-/.test(name)) check(`JS ${name} (the app)`, gzipKb(file), 205);
    else check(`JS ${name}`, gzipKb(file), 40);
}

// Pictures, as stored. Groups have a total and a limit per file.
const group = (label, test, { each, total }) => {
    const members = files.filter(({ rel }) => test(rel));
    if (!members.length) return;
    members.forEach(({ file, rel }) => check(`${label}: ${rel}`, sizeKb(file), each));
    check(`${label}: total (${members.length} files)`, members.reduce((sum, { file }) => sum + sizeKb(file), 0), total);
};
group('Pañña layers', (rel) => rel.startsWith('assets/panna/'), { each: 100, total: 600 });
group('Kshanti layers', (rel) => rel.startsWith('assets/kshanti/'), { each: 400, total: 1300 });
group('Creatividad layers', (rel) => rel.startsWith('assets/creatividad/'), { each: 100, total: 400 });
group('Evolución layers', (rel) => rel.startsWith('assets/evolucion/'), { each: 300, total: 450 });
group('Deck thumbnails', (rel) => /^cards\/thumb\/\d+\.webp$/.test(rel), { each: 70, total: 650 });
group('Card illustrations', (rel) => /^cards\/\d+\.webp$/.test(rel), { each: 900, total: 9500 });
group('Share pictures', (rel) => /^og\/\d+\.jpg$/.test(rel), { each: 200, total: 2300 });
group('Other pictures', (rel) => /^assets\/(?!panna\/|kshanti\/|creatividad\/|evolucion\/)[\w-]+\/.*\.(webp|jpg|png)$/.test(rel), { each: 900, total: 7300 });

const over = rows.filter((row) => row.value > row.limit);
// Only what is close to its line (or over it) is worth printing; the rest is fine
const near = rows.filter((row) => row.value > row.limit * 0.85).sort((a, b) => b.value / b.limit - a.value / a.limit);
console.log('Closest to their budgets:');
near.slice(0, 8).forEach((row) => console.log(`  ${row.value > row.limit ? 'OVER' : 'ok  '}  ${row.label}  ${row.value.toFixed(0)} KB of ${row.limit} KB`));

if (over.length) {
    console.error(`\n${over.length} over budget:\n` + over.map((row) => `  - ${row.label}: ${row.value.toFixed(0)} KB, the limit is ${row.limit} KB`).join('\n'));
    process.exit(1);
}
console.log(`\nAll ${rows.length} budgets hold`);
