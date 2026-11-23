// After `vite build`, writes dist/card/<id>/index.html for every card with that card's own
// og:/twitter: tags and dist/og/<id>.jpg (1200x630). Crawlers (WhatsApp, Facebook, X...) don't run
// JavaScript, so the tags have to be in the HTML. Netlify serves these files before the SPA redirect.
// It also writes a page for each of the other addresses worth finding (PAGES: Sid's world, the deck, the oracle and
// The Nine) with its own words, and dist/sitemap.xml with every one of them (robots.txt, in public/, points to it).
// The landing's own words are in index.html. Each page says it is the one to index for its address (canonical).
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import cards from '../src/data/cards.json' with { type: 'json' };

const SITE = 'https://algoparticular.com';
const WIDTH = 1200;
const HEIGHT = 630;
const HOME_IMAGE = `${SITE}/share/home.jpg`;
const HOME_ALT = 'Sid medita en su alfombra bajo un cielo de estrellas, con el mazo del oráculo delante.';

// The addresses of the app that are not a card, in Spanish (the app's first language). Their words come from the
// app's own: the deck's about (copy_es.json), Mundo in the GDD (docs/mundo.md), the oracle's invitation.
const PAGES = [
    {
        path: '/sid',
        title: 'El mundo de Sid · Algo Particular',
        words: 'Sid camina un mundo dibujado en tinta que toma color a su paso. Encuentra semillas, planta un jardín que canta, medita y abre las cartas del oráculo. Sin puntaje, sin tiempo, sin perder.',
        image: `${SITE}/share/sid.jpg`,
        alt: 'Sid medita en loto en un prado verde, entre plantas y hongos, mientras sale un sol rojo.',
    },
    {
        path: '/deck',
        title: 'Las cartas · Algo Particular',
        words: 'Las 33 cartas del Oráculo de las Partículas, escritas por Belén Brito: cada una, un espejo de lo que tu Ser necesita aquí y ahora.',
    },
    {
        path: '/oracle',
        title: 'Consulta al Oráculo · Algo Particular',
        words: 'Siente y elige tu carta entre las 33 del Oráculo de las Partículas. Pon intención verdadera en eso que vibra en tu interior.',
    },
    {
        path: '/oracleTheNine',
        title: 'Las Nueve · Algo Particular',
        words: 'Nueve cartas del Oráculo de las Partículas, mezcladas con la frecuencia del momento presente. Siente y elige la tuya.',
    },
];

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

// The template (the built index.html, the landing's) with one page's title, words, picture and address
function pageHtml(template, { title, words, url, image = HOME_IMAGE, alt = HOME_ALT }) {
    let html = template.replace(/<title>.*?<\/title>/, `<title>${escape(title)}</title>`);
    html = html.replace(/<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${escape(url)}">`);
    html = setTag(html, 'name', 'description', words);
    html = setTag(html, 'property', 'og:title', title);
    html = setTag(html, 'property', 'og:description', words);
    html = setTag(html, 'property', 'og:url', url);
    html = setTag(html, 'property', 'og:image', image);
    html = setTag(html, 'property', 'og:image:width', WIDTH);
    html = setTag(html, 'property', 'og:image:height', HEIGHT);
    html = setTag(html, 'property', 'og:image:alt', alt);
    html = setTag(html, 'name', 'twitter:image', image);
    html = setTag(html, 'name', 'twitter:image:alt', alt);
    return html;
}

async function writePage(outDir, address, html) {
    const dir = path.join(outDir, ...address.split('/').filter(Boolean));
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, 'index.html'), html);
}

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

            const addresses = ['/'];

            for (const card of cards) {
                if (!card.image?.[0]) continue;

                await makeImage(card, publicDir, path.join(outDir, 'og', `${card.id}.jpg`));
                const address = `/card/${card.id}`;
                await writePage(outDir, address, pageHtml(template, {
                    title: `${card.name_es} · Algo Particular`,
                    words: card.affirmation_es,
                    url: SITE + address,
                    image: `${SITE}/og/${card.id}.jpg`,
                    alt: `Ilustración de la carta ${card.name_es}, del Oráculo de las Partículas.`,
                }));
                addresses.push(address);
            }

            for (const page of PAGES) {
                await writePage(outDir, page.path, pageHtml(template, { ...page, url: SITE + page.path }));
                addresses.push(page.path);
            }

            const sitemap = [
                '<?xml version="1.0" encoding="UTF-8"?>',
                '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
                ...addresses.map((address) => `  <url><loc>${SITE}${address}</loc></url>`),
                '</urlset>',
                '',
            ].join('\n');
            await writeFile(path.join(outDir, 'sitemap.xml'), sitemap);
        },
    };
}
