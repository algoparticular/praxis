// The picture shown when Sid's world (/sid) is shared: public/share/sid.jpg, 1200x630, a moment of the world itself:
// Sid alone in the middle, sitting in lotus in Ciclos, the world's own palette (its yellow sky, its green ground, the pink
// fans taking their colour round him), as its red sun comes up on the left, with the camera looking up as when a
// constellation forms (the horizon comes down and the sky fills much of the screen), though it is day, and closer than
// in the app (drawn at twice the size and cut round him). A narrow window, so the sun, which rises near its left edge,
// is near him. Reached through `window.__sid` (LabSid.vue). Needs the dev server running (npm run dev) and Chromium
// (Playwright). Run: node scripts/shot-sid-share.mjs [url]; to try other framings: CLOCK, CL, CT, CW, WALK, VW, OUT.
import { chromium } from 'playwright';
import sharp from 'sharp';

const base = process.argv[2] ?? 'http://localhost:5173';
const SEED = Number(process.env.SEED ?? 14);  // the first seed tried (14 starts him in Ciclos)
const CW = Number(process.env.CW ?? 1120);
const CROP = { left: Number(process.env.CL ?? 85), top: Number(process.env.CT ?? 380), width: CW, height: Math.round(CW * 630 / 1200) };  // of the 1400x1260 screenshot: Sid in the middle, the sun rising on the left

const browser = await chromium.launch();
// The order of the worlds is drawn with Math.random: replaced by a seeded one, and the seeds tried until he starts in
// Ciclos (card 15)
let page;
for (let seed = SEED; ; seed++) {
    page = await browser.newPage({ viewport: { width: Number(process.env.VW ?? 700), height: 630 }, deviceScaleFactor: 2 });
    await page.addInitScript((s) => {
        let x = s * 7919 + 13;
        Math.random = () => { x = (x * 16807) % 2147483647; return (x - 1) / 2147483646; };
    }, seed);
    await page.goto(base + '/');
    // A world already known: no first-visit lesson, no hints, one fragment of the story found
    await page.evaluate(() => localStorage.setItem('lab.sid.world', JSON.stringify({ v: 1, visits: 5, seeds: [], planted: [],
        learned: { notebook: true, seed: true, sit: true, place: true, sat: true, planted: true, minutes: true },
        marks: [], fragments: [0], thoughts: {}, storySeen: [0], herbSeen: [] })));
    await page.goto(base + '/sid');
    await page.waitForTimeout(1500);
    if (await page.evaluate(() => globalThis.__sid.world.zoneCard()) === 15) { console.log('seed', seed); break; }
    await page.close();
    if (seed > SEED + 80) throw new Error('no seed starts him in Ciclos');
}
await page.addStyleTag({ content: 'header, .lotus, .story-icon, .teaching, .thought, .status-strip, footer { visibility: hidden !important; }' });
await page.waitForTimeout(1000);
await page.mouse.move(600, 600);
await page.keyboard.down('ArrowLeft');         // a few steps away from the tree, so he is alone in the picture
await page.waitForTimeout(Number(process.env.WALK ?? 2200));
await page.keyboard.up('ArrowLeft');
// sunrise: the sun just coming up low on the left (the world's clock, 0 sunrise .. 0.25 noon; reached through the page's
// component, which the dev server leaves open; sitting all but stops the world's time)
await page.evaluate((c) => {
    const sid = globalThis.__sid;
    sid.world.setClock(c);
    // the camera looking up, as when a constellation forms (the horizon comes down and the sky fills much of the
    // screen), though it is day: held there, as the world would bring it down again by day
    Object.defineProperty(sid.state, 'look', { get: () => 1, set: () => {}, configurable: true });
}, Number(process.env.CLOCK ?? 0.012));
await page.waitForTimeout(800);
await page.keyboard.press('Space');            // he sits in lotus and the world takes its colours round him
await page.waitForTimeout(12000);
const shot = await page.screenshot();
await browser.close();
await sharp(shot).extract(CROP).resize(1200, 630).jpeg({ quality: 84, mozjpeg: true }).toFile(process.env.OUT ?? 'public/share/sid.jpg');
console.log(process.env.OUT ?? 'public/share/sid.jpg');
