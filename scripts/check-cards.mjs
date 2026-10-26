// Checks the card data (src/data/cards.json, the source of truth for the cards: see docs/editar-cartas.md) against what the app needs:
// every card complete, its pictures on disk, its scene (if any) pointing at a real card and, after a build, its
// share page and share picture in dist/. Usage: npm run check:cards
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const at = (...parts) => path.join(root, ...parts);

const cards = JSON.parse(readFileSync(at('src', 'data', 'cards.json'), 'utf8'));
const errors = [];
const fail = (card, message) => errors.push(`card ${card?.id ?? '?'}${card?.name_es ? ` (${String(card.name_es).trim()})` : ''}: ${message}`);

const HEX = /^#[0-9a-f]{6}$/i;
const CATEGORIES = ['Paramis', 'Regular', 'Special'];
const filled = (value) => typeof value === 'string' && value.trim() !== '';

const seen = new Set();
for (const card of cards) {
    if (!Number.isInteger(card.id)) fail(card, 'the id is not a whole number');
    if (seen.has(card.id)) fail(card, 'the id is repeated');
    seen.add(card.id);

    for (const key of ['name_es', 'name_en', 'description_es', 'description_en']) {
        if (!filled(card[key])) fail(card, `${key} is empty`);
    }
    // Special cards only carry their description; every other card is a full reading
    if (card.category !== 'Special') {
        for (const key of ['affirmation_es', 'affirmation_en', 'invitation_es', 'invitation_en']) {
            if (!filled(card[key])) fail(card, `${key} is empty`);
        }
    }
    if (!CATEGORIES.includes(card.category)) fail(card, `unknown category "${card.category}"`);
    if (card.Status !== 'ready') fail(card, `its status is "${card.Status}", not "ready"`);
    for (const key of ['color', 'colorAlt']) {
        if (!HEX.test(card[key] ?? '')) fail(card, `${key} is not a #rrggbb colour ("${card[key]}")`);
    }

    // The pictures: the full illustration, and the thumbnail the deck loads
    const image = card.image?.[0];
    if (!image) { fail(card, 'it has no image'); continue; }
    if (image.url !== `/cards/${card.id}.webp`) fail(card, `its image is "${image.url}", expected /cards/${card.id}.webp`);
    if (!existsSync(at('public', 'cards', `${card.id}.webp`))) fail(card, `public/cards/${card.id}.webp is missing`);
    if (!existsSync(at('public', 'cards', 'thumb', `${card.id}.webp`))) fail(card, `public/cards/thumb/${card.id}.webp is missing (npm run thumbs)`);
}

// The scenes: every id listed in cardScenes.js must be a card
const scenes = readFileSync(at('src', 'data', 'cardScenes.js'), 'utf8');
for (const [, id] of scenes.matchAll(/^\s*(\d+):\s*lazy\(/gm)) {
    if (!seen.has(Number(id))) errors.push(`src/data/cardScenes.js lists a scene for card ${id}, which does not exist`);
}

// After a build: the share page and the share picture of every card
if (existsSync(at('dist', 'index.html'))) {
    for (const card of cards.filter((c) => c.image?.[0])) {
        const page = at('dist', 'card', String(card.id), 'index.html');
        if (!existsSync(page)) { fail(card, `dist/card/${card.id}/index.html was not generated`); continue; }
        const html = readFileSync(page, 'utf8');
        if (!html.includes(`https://algoparticular.com/og/${card.id}.jpg`)) fail(card, 'its share page does not point at its own picture');
        if (!html.includes(`https://algoparticular.com/card/${card.id}`)) fail(card, 'its share page does not carry its own url');
        if (!existsSync(at('dist', 'og', `${card.id}.jpg`))) fail(card, `dist/og/${card.id}.jpg was not generated`);
    }
} else {
    console.log('(no dist/ yet: the share pages are checked after a build)');
}

if (errors.length) {
    console.error(`\n${errors.length} problem${errors.length === 1 ? '' : 's'} with the cards:\n` + errors.map((e) => `  - ${e}`).join('\n'));
    process.exit(1);
}
console.log(`${cards.length} cards ok`);
