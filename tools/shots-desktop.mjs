/**
 * Desktop screenshot helper — captures key sections at 1440x900 (and 768x1024)
 * for visual design review. Complements qa-audit.mjs (which shoots 360px only).
 * Usage: python -m http.server 8123 (from project root), then node tools/shots-desktop.mjs
 */
import { chromium } from 'playwright-core';

const EXE = process.env.CHROME_EXE || 'C:/Users/el-bostan/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe';
const BASE = process.env.BASE_URL || 'http://127.0.0.1:8123';
const PAGES = ['/', '/ar/'];
const SECTIONS = ['#story', '#menu', '#tasting', '#space', '#voices', '#reserve', '.footer'];

const browser = await chromium.launch({ executablePath: EXE, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });

for (const page of PAGES) {
  const prefix = page === '/' ? 'en' : 'ar';
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  await p.goto(BASE + page, { waitUntil: 'networkidle', timeout: 60000 });
  await p.waitForTimeout(9000);
  await p.screenshot({ path: `tools/shots/${prefix}-desktop-hero.png` });
  for (const sel of SECTIONS) {
    await p.evaluate((s) => document.querySelector(s)?.scrollIntoView({ block: 'start' }), sel);
    await p.waitForTimeout(1600);
    await p.screenshot({ path: `tools/shots/${prefix}-desktop${sel.replace(/[#.]/g, '-')}.png` });
  }
  // absolute page bottom — verify nothing is trapped under fixed UI
  await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await p.waitForTimeout(1200);
  await p.screenshot({ path: `tools/shots/${prefix}-desktop-bottom.png` });
  const glActive = await p.evaluate(() => !!document.querySelector('.hero__media.is-gl-active, .hero__media canvas'));
  console.log(`${page} desktop: ${errors.length ? 'PAGEERRORS: ' + errors.join(' | ') : 'no errors'} · webgl-canvas=${glActive}`);
  await ctx.close();
}
await browser.close();
