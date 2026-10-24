// Airtable -> src/data/cards.json + public/cards/
// Usage: AIRTABLE_TOKEN=... npm run sync:cards
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE_ID = 'appgHXHkRRjGjbYgM';
const TABLE = 'Oracle cards';
const VIEW = 'List';

const token = process.env.AIRTABLE_TOKEN;
if (!token) {
    console.error('Missing AIRTABLE_TOKEN');
    process.exit(1);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const imagesDir = path.join(root, 'public', 'cards');
const dataFile = path.join(root, 'src', 'data', 'cards.json');

async function fetchRecords() {
    const records = [];
    let offset;
    do {
        const url = new URL(`https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(TABLE)}`);
        url.searchParams.set('view', VIEW);
        if (offset) url.searchParams.set('offset', offset);

        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error(`Airtable ${res.status}: ${await res.text()}`);

        const page = await res.json();
        records.push(...page.records);
        offset = page.offset;
    } while (offset);
    return records;
}

// Airtable attachment URLs expire, so images are downloaded and served locally.
async function downloadImage(id, attachment) {
    const res = await fetch(attachment.url);
    if (!res.ok) throw new Error(`Image ${id}: ${res.status}`);

    const ext = path.extname(new URL(attachment.url).pathname)
        || '.' + (attachment.type?.split('/')[1] ?? 'jpg');
    const file = `${id}${ext}`;
    await writeFile(path.join(imagesDir, file), Buffer.from(await res.arrayBuffer()));
    return { url: `/cards/${file}`, width: attachment.width, height: attachment.height };
}

await mkdir(imagesDir, { recursive: true });

const records = await fetchRecords();
const cards = [];
for (const { fields } of records) {
    const card = { ...fields };
    if (fields.image?.[0]) card.image = [await downloadImage(fields.id, fields.image[0])];
    cards.push(card);
    console.log(`card ${fields.id}`);
}

await writeFile(dataFile, JSON.stringify(cards, null, 2) + '\n');
console.log(`${cards.length} cards written to src/data/cards.json`);
