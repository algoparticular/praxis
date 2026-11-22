// The picture shown when Sid's world (/sid) is shared: public/share/sid.jpg, 1200x630, a moment of the world itself:
// Sid sitting in lotus in Ciclos, the world's own palette (its yellow sky and red sun, its green ground, the pink fans
// taking their colour round him), alone, seen a little closer than in the app (drawn at twice the size and cut round
// him). The order of the worlds is drawn with Math.random, so it is replaced here by a seeded one
// (SEED) that starts him in Ciclos; if the world's code changes and he starts elsewhere, try other seeds. Needs the
// dev server running (npm run dev) and Chromium (Playwright). Run: node scripts/shot-sid-share.mjs [url]
import { chromium } from 'playwright';
import sharp from 'sharp';

const base = process.argv[2] ?? 'http://localhost:5173';
const SEED = 14;
const CROP = { left: 400, top: 60, width: 1600, height: 840 };   // of the 2400x1260 screenshot: Sid alone, in the middle, a little low

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 2 });
await page.addInitScript((s) => {
    let x = s * 7919 + 13;
    Math.random = () => { x = (x * 16807) % 2147483647; return (x - 1) / 2147483646; };
}, SEED);
await page.goto(base + '/');
// A world already known: no first-visit lesson, no hints, one fragment of the story found
await page.evaluate(() => localStorage.setItem('lab.sid.world', JSON.stringify({ v: 1, visits: 5, seeds: [], planted: [],
    learned: { notebook: true, seed: true, sit: true, place: true, sat: true, planted: true, minutes: true },
    marks: [], fragments: [0], thoughts: {}, storySeen: [0], herbSeen: [] })));
await page.goto(base + '/sid');
await page.addStyleTag({ content: 'header, .lotus, .story-icon, .teaching, .thought, .status-strip, footer { visibility: hidden !important; }' });
await page.waitForTimeout(2500);
await page.mouse.move(600, 600);
await page.keyboard.down('ArrowLeft');         // a few steps away from the tree, so he is alone in the picture
await page.waitForTimeout(Number(process.env.WALK ?? 4500));
await page.keyboard.up('ArrowLeft');
await page.waitForTimeout(1200);
await page.keyboard.press('Space');            // he sits in lotus and the world takes its colours round him
await page.waitForTimeout(16000);
const shot = await page.screenshot();
await browser.close();
await sharp(shot).extract(CROP).resize(1200, 630).jpeg({ quality: 84, mozjpeg: true }).toFile('public/share/sid.jpg');
console.log('public/share/sid.jpg');
