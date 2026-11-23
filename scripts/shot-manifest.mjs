// The pictures the browser shows when the app is offered to be installed (Chrome on Android, and on a computer):
// public/screenshots/, listed as `screenshots` in public/manifest.webmanifest. Three on a phone (the landing, Dana's
// card, Sid's world) and one wide (Upekkha's card), in Spanish. Needs a build served (npm run build && npm run preview)
// and Chromium (Playwright). Run: node scripts/shot-manifest.mjs [url]
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import sharp from 'sharp';

const base = process.argv[2] ?? 'http://localhost:4173';
const SHOTS = [
    { name: 'landing', path: '/', width: 390, height: 844, wait: 4000 },
    { name: 'dana', path: '/card/2', width: 390, height: 844, wait: 6000 },
    { name: 'sid', path: '/sid', width: 390, height: 844, wait: 9000 },
    { name: 'upekkha', path: '/card/9', width: 1280, height: 800, wait: 6000 },
];

await mkdir('public/screenshots', { recursive: true });
const browser = await chromium.launch();
for (const { name, path, width, height, wait } of SHOTS) {
    const phone = width < 800;
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2, isMobile: phone, hasTouch: phone });
    await page.addInitScript(() => { try { localStorage.setItem('lang', 'es'); } catch { /* blocked */ } });
    await page.goto(base + path, { waitUntil: 'networkidle' });
    await page.waitForTimeout(wait);
    const shot = await page.screenshot();
    // a phone's at twice its size (780x1688), the wide one as it is seen (1280x800)
    await sharp(shot).resize(phone ? width * 2 : width).webp({ quality: 80 }).toFile(`public/screenshots/${name}.webp`);
    await page.close();
}
await browser.close();
