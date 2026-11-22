// The picture shown when Sid's world (/sid) is shared: public/share/sid.jpg, 1200x630, a moment of the world itself:
// Sid alone, sitting in lotus in Ciclos, the world's own palette (its yellow sky, its green ground, the pink fans taking
// their colour round him), as its red sun is coming up, seen closer than in the app (drawn at twice the size and cut
// round him). Environment variables, to try other framings: CLOCK, CL, CT, WALK, OUT. The order of the worlds is drawn with Math.random, so it is replaced here by a seeded one
// (SEED) that starts him in Ciclos; if the world's code changes and he starts elsewhere, try other seeds. Needs the
// dev server running (npm run dev) and Chromium (Playwright). Run: node scripts/shot-sid-share.mjs [url]
import { chromium } from 'playwright';
import sharp from 'sharp';

const base = process.argv[2] ?? 'http://localhost:5173';
const SEED = 14;
const CROP = { left: Number(process.env.CL ?? 120), top: Number(process.env.CT ?? 175), width: 1300, height: 683 };  // of the 2000x1260 screenshot: the sun rising on the left, Sid on the right third

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1000, height: 630 }, deviceScaleFactor: 2 });
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
// sunrise: the sun just coming up low on the left (the world's clock, 0 sunrise .. 0.25 noon; reached through the page's
// component, which the dev server leaves open; sitting all but stops the world's time)
await page.evaluate((c) => globalThis.document.querySelector('.lab').__vueParentComponent.setupState.world.setClock(c), Number(process.env.CLOCK ?? 0.012));
await page.waitForTimeout(800);
await page.keyboard.press('Space');            // he sits in lotus and the world takes its colours round him
await page.waitForTimeout(12000);
const shot = await page.screenshot();
await browser.close();
await sharp(shot).extract(CROP).resize(1200, 630).jpeg({ quality: 84, mozjpeg: true }).toFile(process.env.OUT ?? 'public/share/sid.jpg');
console.log(process.env.OUT ?? 'public/share/sid.jpg');
