// Smoke test: serves the build (vite preview) and opens every page in a real browser: the pages of the site, and each of
// the cards on a desktop and a phone-sized screen. It fails on a JavaScript error, a console error, a missing file of
// the site (a 404 on its own origin), or a page that did not draw what it should. Other people's servers (fonts, icons,
// Airtable) are not our business here and are ignored.
// Usage: npm run build && npm run check:smoke   (needs a browser: npx playwright install chromium)
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cards = JSON.parse(readFileSync(path.join(root, 'src', 'data', 'cards.json'), 'utf8'));
const sceneCards = [...readFileSync(path.join(root, 'src', 'data', 'cardScenes.js'), 'utf8').matchAll(/^\s*(\d+):\s*lazy\(/gm)].map(([, id]) => Number(id));

const PORT = Number(process.env.SMOKE_PORT ?? 4173);
const ORIGIN = `http://localhost:${PORT}`;
const DESKTOP = { width: 1280, height: 800 };
const PHONE = { width: 390, height: 844 };

// What each page must have drawn once it is up
const pages = [
    { path: '/', name: 'landing', expect: '#hero' },
    { path: '/deck', name: 'deck', expect: '.deckPage', wait: 2500 },
    { path: '/about', name: 'about', expect: 'main, .content' },
    { path: '/collaborate', name: 'collaborate', expect: 'main, .content' },
    { path: '/oracle', name: 'oracle', expect: '.content' },
    { path: '/oracleTheNine', name: 'oracle the nine', expect: '.content' },
    { path: '/intro', name: 'intro', expect: '.content' },
    { path: '/share/3', name: 'share', expect: '#share' },
    { path: '/there-is-no-such-page', name: 'not found', expect: '.content' },
];
const cardPages = cards.map((card) => ({ path: `/card/${card.id}`, name: `card ${card.id}`, expect: '.cardWrapper .stage', wait: 3000, card: card.id }));

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
const stop = () => server.kill();
process.on('exit', stop);

const waitForServer = async () => {
    for (let i = 0; i < 60; i++) {
        try { if ((await fetch(ORIGIN)).ok) return; } catch { /* not up yet */ }
        await new Promise((resolve) => setTimeout(resolve, 500));
    }
    throw new Error('vite preview did not start (is dist/ built?)');
};

const problems = [];
const browser = await (async () => {
    await waitForServer();
    return chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
})();

const visit = async (context, label, page) => {
    const tab = await context.newPage();
    const found = [];
    tab.on('pageerror', (error) => found.push(`JavaScript error: ${error.message.split('\n')[0]}`));
    tab.on('console', (message) => {
        if (message.type() !== 'error') return;
        const where = message.location()?.url ?? '';
        // A failed request is reported on its own below, and only for our own files
        if (/Failed to load resource/.test(message.text()) || (where && !where.startsWith(ORIGIN))) return;
        found.push(`console error: ${message.text().split('\n')[0].slice(0, 200)}`);
    });
    tab.on('response', (response) => {
        if (response.url().startsWith(ORIGIN) && response.status() >= 400) found.push(`${response.status()} for ${response.url().replace(ORIGIN, '')}`);
    });
    try {
        await tab.goto(ORIGIN + page.path, { waitUntil: 'load', timeout: 30000 });
        await tab.waitForSelector(page.expect, { state: 'attached', timeout: 15000 });
        await tab.waitForTimeout(page.wait ?? 1200);
        if (page.card != null) {
            // A card page shows its name (a full reading) and, for the cards with a scene, a scene with its canvas
            const title = await tab.locator('h1.title, .cardWrapper .stage').first().count();
            if (!title) found.push('the card page drew no stage');
            if (sceneCards.includes(page.card) && !(await tab.locator('.scene canvas').count())) found.push('its scene drew no particles (no canvas)');
        }
    } catch (error) {
        found.push(`did not load: ${error.message.split('\n')[0]}`);
    }
    await tab.close();
    if (found.length) problems.push(`${label} ${page.name} (${page.path}):\n      ${[...new Set(found)].join('\n      ')}`);
};

// A few pages at a time, so the whole round takes about a minute
const runAll = async (jobs, limit = 4) => {
    const queue = [...jobs];
    await Promise.all(Array.from({ length: limit }, async () => {
        while (queue.length) await queue.shift()();
    }));
};

try {
    const desktop = await browser.newContext({ viewport: DESKTOP });
    const phone = await browser.newContext({ viewport: PHONE, hasTouch: true, isMobile: true });
    const jobs = [
        ...pages.map((page) => () => visit(desktop, 'desktop', page)),
        ...cardPages.map((page) => () => visit(desktop, 'desktop', page)),
        // On a phone: the deck and the cards that have their own scene
        ...pages.filter((page) => page.path === '/deck').map((page) => () => visit(phone, 'phone', page)),
        ...cardPages.filter((page) => sceneCards.includes(page.card)).map((page) => () => visit(phone, 'phone', page)),
    ];
    await runAll(jobs);
    console.log(`${jobs.length} page visits`);
} finally {
    await browser.close();
    stop();
}

if (problems.length) {
    console.error(`\n${problems.length} page${problems.length === 1 ? '' : 's'} with problems:\n` + problems.map((p) => `  - ${p}`).join('\n'));
    process.exit(1);
}
console.log('Smoke test passed');
