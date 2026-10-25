// After `vite build`, writes dist/card/<id>/index.html for every card with that card's own
// og:/twitter: tags and dist/og/<id>.jpg (1200x630). Crawlers (WhatsApp, Facebook, X...) don't run
// JavaScript, so the tags have to be in the HTML. Netlify serves these files before the SPA redirect.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import cards from '../src/data/cards.json' with { type: 'json' };

const SITE = 'https://algoparticular.com';
const WIDTH = 1200;
const HEIGHT = 630;

const escape = (text) => String(text).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

// Card illustration, square, centred over its own colour
async function makeImage(card, publicDir, file) {
    const art = await sharp(path.join(publicDir, card.image[0].url)).resize(HEIGHT, HEIGHT).toBuffer();
    await sharp({ create: { width: WIDTH, height: HEIGHT, channels: 3, background: card.color ?? '#000000' } })
        .composite([{ input: art, left: (WIDTH - HEIGHT) / 2, top: 0 }])
        .jpeg({ quality: 82 })
        .toFile(file);
}

const setTag = (html, attr, name, content) => {
    const tag = `<meta ${attr}="${name}" content="${escape(content)}">`;
    const existing = new RegExp(`<meta ${attr}="${name}"[^>]*>`);
    return existing.test(html) ? html.replace(existing, tag) : html.replace('</head>', `    ${tag}\n  </head>`);
};

export default function cardMeta() {
    let outDir;
    let publicDir;

    return {
        name: 'card-meta',
        apply: 'build',
        configResolved(config) {
            outDir = path.resolve(config.root, config.build.outDir);
            publicDir = config.publicDir;
        },
        async closeBundle() {
            const template = await readFile(path.join(outDir, 'index.html'), 'utf8');
            await mkdir(path.join(outDir, 'og'), { recursive: true });

            for (const card of cards) {
                if (!card.image?.[0]) continue;

                await makeImage(card, publicDir, path.join(outDir, 'og', `${card.id}.jpg`));

                const title = `${card.name_es} · Algo Particular`;
                const url = `${SITE}/card/${card.id}`;
                let html = template.replace(/<title>.*?<\/title>/, `<title>${escape(title)}</title>`);
                html = setTag(html, 'property', 'og:title', title);
                html = setTag(html, 'property', 'og:description', card.affirmation_es);
                html = setTag(html, 'property', 'og:image', `${SITE}/og/${card.id}.jpg`);
                html = setTag(html, 'property', 'og:image:width', WIDTH);
                html = setTag(html, 'property', 'og:image:height', HEIGHT);
                html = setTag(html, 'property', 'og:url', url);
                html = setTag(html, 'name', 'twitter:image', `${SITE}/og/${card.id}.jpg`);
                html = setTag(html, 'name', 'twitter:image:alt', card.name_es);

                const dir = path.join(outDir, 'card', String(card.id));
                await mkdir(dir, { recursive: true });
                await writeFile(path.join(dir, 'index.html'), html);
            }
        },
    };
}
