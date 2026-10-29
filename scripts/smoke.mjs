// Smoke test: serves the build (vite preview) and opens the site in a real browser. It fails on a JavaScript error, a
// console error, a missing file of the site, or a page that did not draw what it should. Other people's servers (fonts,
// icons, Airtable) are not our business here and are ignored.
//
// WebGL drawn in software is slow (seconds per page), so it is used only where it matters:
//   - without WebGL (quick): every page and every card. This is also the fallback a visitor without WebGL gets, so it
//     must work on its own: the scenes, the deck and the landing have to degrade without errors.
//   - with WebGL (slower): the pages that draw particles, the cards with their own scene (on a desktop screen, and a few
//     on a phone-sized one), the deck and the landing, which must really draw their canvases.
// Usage: npm run build && npm run check:smoke   (needs a browser: npx playwright install chromium)
//        SMOKE_ONLY=/card/3 npm run check:smoke   visits only the pages whose path contains that text
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cards = JSON.parse(readFileSync(path.join(root, 'src', 'data', 'cards.json'), 'utf8'));
const sceneCards = [...readFileSync(path.join(root, 'src', 'data', 'cardScenes.js'), 'utf8').matchAll(/^\s*(\d+):\s*(?:lazy|stage)\(/gm)].map(([, id]) => Number(id));
// The cards that are tried on a phone-sized screen too: the ones with the most layout in them
const PHONE_CARDS = [2, 3, 20, 27, 29];

const PORT = Number(process.env.SMOKE_PORT ?? 4173);
const ORIGIN = `http://localhost:${PORT}`;
const DESKTOP = { width: 1280, height: 800 };
const PHONE = { width: 390, height: 844 };
const CPUS = availableParallelism();

// What each page must have drawn once it is up
const pages = [
    { path: '/', name: 'landing', expect: '#hero', draws: true },
    { path: '/deck', name: 'deck', expect: '.deckPage', draws: true },
    { path: '/collaborate', name: 'collaborate', expect: 'main, .content' },
    { path: '/oracle', name: 'oracle', expect: '.content' },
    { path: '/oracleTheNine', name: 'oracle the nine', expect: '.content' },
    { path: '/intro', name: 'intro', expect: '.content' },
    { path: '/share/3', name: 'share', expect: '#share' },
    { path: '/there-is-no-such-page', name: 'not found', expect: '.content' },
];
const cardPages = cards.map((card) => ({ path: `/card/${card.id}`, name: `card ${card.id}`, expect: '.cardWrapper .stage', card: card.id, draws: sceneCards.includes(card.id) }));

// vite itself, not through npx: npx leaves a second process behind that keeps this one from ever exiting
const vite = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js');
const server = spawn(process.execPath, [vite, 'preview', '--port', String(PORT), '--strictPort'], { cwd: root, stdio: 'ignore' });
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

// `webgl` says whether this visit has WebGL: pages that draw must then draw their canvases
const visit = async (context, label, page, webgl) => {
    const started = Date.now();
    const tab = await context.newPage();
    const found = [];
    tab.on('pageerror', (error) => found.push(`JavaScript error: ${error.message.split('\n')[0]}`));
    tab.on('console', (message) => {
        if (message.type() !== 'error') return;
        const where = message.location()?.url ?? '';
        // A failed request is reported on its own below, and only for our own files
        if (/Failed to load resource/.test(message.text()) || (where && !where.startsWith(ORIGIN))) return;
        // three.js says it cannot make a context before the page falls back to its flat version: expected without WebGL
        if (!webgl && /^THREE\.WebGLRenderer/.test(message.text())) return;
        found.push(`console error: ${message.text().split('\n')[0].slice(0, 200)}`);
    });
    tab.on('response', (response) => {
        const url = response.url();
        if (!url.startsWith(ORIGIN)) return;
        if (response.status() >= 400) found.push(`${response.status()} for ${url.replace(ORIGIN, '')}`);
        // The site answers any path it does not have with its main page (the single-page-app rule), status 200 included:
        // a picture, script or style that comes back as HTML is a file that is missing
        else if (response.request().resourceType() !== 'document' && (response.headers()['content-type'] ?? '').includes('text/html')) {
            found.push(`missing file (answered with the page instead): ${url.replace(ORIGIN, '')}`);
        }
    });
    try {
        await tab.goto(ORIGIN + page.path, { waitUntil: 'load', timeout: 30000 });
        await tab.waitForSelector(page.expect, { state: 'attached', timeout: 15000 });
        // With WebGL, a page that draws particles must show its canvas (the scene loads in a separate chunk)
        if (webgl && page.draws) {
            const canvas = page.card != null ? '.scene canvas' : 'canvas';
            await tab.waitForSelector(canvas, { state: 'attached', timeout: 15000 }).catch(() => found.push('it drew no canvas'));
            await tab.waitForTimeout(1200);
        } else {
            await tab.waitForTimeout(500);
        }
        if (page.card != null && !(await tab.locator('.cardWrapper .stage').count())) found.push('the card page drew no stage');
    } catch (error) {
        found.push(`did not load: ${error.message.split('\n')[0]}`);
    }
    await tab.close();
    console.log(`  ${found.length ? 'FAIL' : 'ok  '} ${label} ${page.name} (${((Date.now() - started) / 1000).toFixed(1)}s)`);
    if (found.length) problems.push(`${label} ${page.name} (${page.path}):\n      ${[...new Set(found)].join('\n      ')}`);
};

// A few pages at a time
const runAll = async (jobs, limit) => {
    const queue = [...jobs];
    await Promise.all(Array.from({ length: Math.max(1, limit) }, async () => {
        while (queue.length) await queue.shift()();
    }));
};

const only = process.env.SMOKE_ONLY;
const wanted = (job) => !only || job.page.path.includes(only);

let visits = 0;
const round = async (title, jobs, limit) => {
    const chosen = jobs.filter(wanted);
    if (!chosen.length) return;
    console.log(`${title}: ${chosen.length} visits, ${limit} at a time`);
    visits += chosen.length;
    await runAll(chosen.map((job) => job.run), limit);
};

try {
    await waitForServer();

    // 1. Without WebGL: all of it, quick
    const plain = await chromium.launch({ args: ['--disable-gpu', '--disable-3d-apis'] });
    const quick = await plain.newContext({ viewport: DESKTOP });
    await round('Without WebGL', [...pages, ...cardPages].map((page) => ({ page, run: () => visit(quick, 'no-webgl', page, false) })), CPUS * 2);
    await plain.close();

    // 2. With WebGL (drawn in software): only what draws particles, and few at a time
    const gl = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
    const desktop = await gl.newContext({ viewport: DESKTOP });
    const phone = await gl.newContext({ viewport: PHONE, hasTouch: true, isMobile: true });
    const drawing = [...pages, ...cardPages].filter((page) => page.draws);
    await round('With WebGL', [
        ...drawing.map((page) => ({ page, run: () => visit(desktop, 'desktop', page, true) })),
        ...drawing.filter((page) => page.path === '/deck' || PHONE_CARDS.includes(page.card)).map((page) => ({ page, run: () => visit(phone, 'phone', page, true) })),
    ], Math.max(1, Math.floor(CPUS / 2)));
    await gl.close();
    console.log(`${visits} page visits`);
} finally {
    stop();
}

if (problems.length) {
    console.error(`\n${problems.length} page${problems.length === 1 ? '' : 's'} with problems:\n` + problems.map((p) => `  - ${p}`).join('\n'));
    process.exit(1);
}
console.log('Smoke test passed');
process.exit(0);
