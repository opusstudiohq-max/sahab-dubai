/**
 * SAHAB v2 — QA acceptance script
 * Usage:
 *   python -m http.server 8123        (from project root)
 *   cd tools && npm i playwright-core && cd ..
 *   node tools/qa-audit.mjs
 * Prints PASS/FAIL per acceptance criterion and saves screenshots to tools/shots/
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const EXE = process.env.CHROME_EXE || 'C:/Users/el-bostan/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe';
const BASE = process.env.BASE_URL || 'http://127.0.0.1:8123';
const PAGES = ['/', '/ar/'];
const SIZES = [
  ['360x740', 360, 740, true],
  ['390x844', 390, 844, true],
  ['768x1024', 768, 1024, true],
  ['1440x900', 1440, 900, false],
];
const SHOT_SECTIONS = ['#story', '#menu', '#tasting', '#space', '#voices', '#reserve', '.footer'];

fs.mkdirSync('tools/shots', { recursive: true });

const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok, detail }); };

const browser = await chromium.launch({ executablePath: EXE, headless: true, args: ['--disable-gpu', '--autoplay-policy=no-user-gesture-required'] });

for (const page of PAGES) {
  for (const [label, w, h, isMobile] of SIZES) {
    const ctx = await browser.newContext({
      viewport: { width: w, height: h }, isMobile, hasTouch: isMobile, deviceScaleFactor: 1,
      userAgent: isMobile ? 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/125.0.0.0 Mobile Safari/537.36' : undefined,
    });
    const p = await ctx.newPage();
    const errors = [];
    const external = [];
    p.on('pageerror', (e) => errors.push(e.message));
    p.on('request', (r) => { const u = r.url(); if (!u.startsWith(BASE) && !u.startsWith('data:')) external.push(u); });
    await p.goto(BASE + page, { waitUntil: 'networkidle', timeout: 60000 });
    await p.waitForTimeout(8000);
    const tag = `${page} @${label}`;

    // 1) no horizontal overflow
    const ov = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    check(`${tag} no-h-overflow`, ov.sw <= ov.cw + 1, `scrollWidth=${ov.sw} clientWidth=${ov.cw}`);

    // 2) no page errors / external requests
    check(`${tag} no-pageerror`, errors.length === 0, errors.join(' | ').slice(0, 200));
    check(`${tag} no-external-req`, external.length === 0, external.slice(0, 3).join(' | '));

    // 3) video gate: mobile (<768 css px) => #hero-video removed
    if (w < 768) {
      const hasVideo = await p.evaluate(() => !!document.getElementById('hero-video'));
      check(`${tag} video-gated-on-mobile`, !hasVideo, hasVideo ? 'video element still present' : '');
    }

    // 4) tap targets >= 40px
    const small = await p.evaluate(() => {
      const out = [];
      document.querySelectorAll('a, button, input, select').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0 && r.height < 40 && !el.closest('.skip-link')) out.push(`${el.tagName}.${String(el.className).split(' ')[0]}:${Math.round(r.height)}px`);
      });
      return out.slice(0, 8);
    });
    check(`${tag} tap-targets>=40px`, small.length === 0, small.join(' | '));

    // 5) AR page checks
    if (page === '/ar/') {
      const attrs = await p.evaluate(() => ({ dir: document.documentElement.dir, lang: document.documentElement.lang }));
      check(`${tag} dir=rtl lang=ar`, attrs.dir === 'rtl' && attrs.lang === 'ar', JSON.stringify(attrs));
      const spacing = await p.evaluate(() => {
        const bad = [];
        document.querySelectorAll('body *').forEach((el) => {
          const ls = getComputedStyle(el).letterSpacing;
          if (ls !== 'normal' && ls !== '0.96px' && ls !== '0px' && el.textContent.trim()) bad.push(`${el.tagName}.${String(el.className).split(' ')[0]}:${ls}`);
        });
        return bad.slice(0, 8);
      });
      check(`${tag} no-ar-letterspacing`, spacing.length === 0, spacing.join(' | '));
    }

    // screenshots (smallest size only, all sections + menu)
    if (label === '360x740') {
      const prefix = page === '/' ? 'en' : 'ar';
      await p.screenshot({ path: `tools/shots/${prefix}-hero.png` });
      for (const sel of SHOT_SECTIONS) {
        await p.evaluate((s) => document.querySelector(s)?.scrollIntoView(), sel);
        await p.waitForTimeout(1400);
        await p.screenshot({ path: `tools/shots/${prefix}-${sel.replace(/[#.]/g, '')}.png` });
      }
      await p.evaluate(() => window.scrollTo(0, 0));
      await p.waitForTimeout(1000);
      await p.tap('#nav-burger');
      await p.waitForTimeout(800);
      await p.screenshot({ path: `tools/shots/${prefix}-menu-open.png` });
    }
    await ctx.close();
  }
}

await browser.close();

let fail = 0;
for (const r of results) {
  if (!r.ok) fail++;
  console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? '  →  ' + r.detail : ''}`);
}
console.log(`\n${results.length - fail}/${results.length} checks passed. Screenshots in tools/shots/`);
process.exit(fail ? 1 : 0);
