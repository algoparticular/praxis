// The picture shown when Sid's world (/sid) is shared: public/share/sid.jpg, 1200x630, a moment of the world itself
// (Sid sitting in lotus at the start of a visit, the world taking its colours round him), with the app's buttons
// hidden. Needs the dev server running (npm run dev) and Chromium (Playwright). The zone he starts in is drawn at
// random on every visit, so run it again for another; it keeps the last one. Run: node scripts/shot-sid-share.mjs [url]
import { chromium } from 'playwright';
import sharp from 'sharp';

const base = process.argv[2] ?? 'http://localhost:5173';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.goto(base + '/');
// A world already known: no first-visit lesson, no hints, one fragment of the story found
await page.evaluate(() => localStorage.setItem('lab.sid.world', JSON.stringify({ v: 1, visits: 5, seeds: [], planted: [],
    learned: { notebook: true, seed: true, sit: true, place: true, sat: true, planted: true, minutes: true },
    marks: [], fragments: [0], thoughts: {}, storySeen: [0], herbSeen: [] })));
await page.goto(base + '/sid');
await page.addStyleTag({ content: 'header, .lotus, .story-icon, .teaching, .status-strip, footer { visibility: hidden !important; }' });
await page.waitForTimeout(2500);
await page.keyboard.press('Space');           // he sits in lotus and the world takes its colours round him
await page.waitForTimeout(10000);
const shot = await page.screenshot();
await browser.close();
await sharp(shot).jpeg({ quality: 84, mozjpeg: true }).toFile('public/share/sid.jpg');
console.log('public/share/sid.jpg');
