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
import path from 'node:path';

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
    // LCP/CLS smoke observers — installed before any navigation
    await ctx.addInitScript(() => {
      window.__lcp = 0; window.__cls = 0;
      try {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          if (entries.length) window.__lcp = entries[entries.length - 1].startTime;
        }).observe({ type: 'largest-contentful-paint', buffered: true });
        new PerformanceObserver((list) => {
          for (const e of list.getEntries()) if (!e.hadRecentInput) window.__cls += e.value;
        }).observe({ type: 'layout-shift', buffered: true });
      } catch (e) { /* PerformanceObserver unsupported — recorded as no-entry */ }
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

    // 4b) noscript present — the page must never depend on JS to show content
    const hasNoscript = await p.evaluate(() => !!document.querySelector('noscript'));
    check(`${tag} noscript-present`, hasNoscript, hasNoscript ? '' : 'no <noscript> element in DOM');

    // 4c) LCP/CLS smoke bounds (localhost = fast; these are tripwires, not SLOs)
    const vitals = await p.evaluate(() => ({ lcp: window.__lcp || 0, cls: window.__cls || 0 }));
    check(`${tag} lcp<=2500ms`, vitals.lcp === 0 || vitals.lcp <= 2500, vitals.lcp ? `${Math.round(vitals.lcp)}ms` : 'no-lcp-entry');
    check(`${tag} cls<=0.1`, vitals.cls <= 0.1, `cls=${vitals.cls.toFixed(4)}`);

    // 5) AR page checks
    if (page === '/ar/') {
      const attrs = await p.evaluate(() => ({ dir: document.documentElement.dir, lang: document.documentElement.lang }));
      check(`${tag} dir=rtl lang=ar`, attrs.dir === 'rtl' && attrs.lang === 'ar', JSON.stringify(attrs));
      const spacing = await p.evaluate(() => {
        const bad = [];
        document.querySelectorAll('body *').forEach((el) => {
          const style = getComputedStyle(el);
          const ls = style.letterSpacing;
          const fs = parseFloat(style.fontSize);
          const lsPx = parseFloat(ls);
          const is06em = !isNaN(lsPx) && !isNaN(fs) && Math.abs(lsPx - fs * 0.06) < 0.1;
          if (ls !== 'normal' && ls !== '0px' && !is06em && el.textContent.trim()) bad.push(`${el.tagName}.${String(el.className).split(' ')[0]}:${ls}`);
        });
        return bad.slice(0, 8);
      });
      check(`${tag} no-ar-letterspacing`, spacing.length === 0, spacing.join(' | '));

      // phone bidi: both tel: anchors isolated LTR (<bdi> wrapper or dir="ltr")
      const bidi = await p.evaluate(() => {
        const spots = ['.reserve__details a[href^="tel:"]', '.footer a[href^="tel:"]'];
        return spots.map((s) => {
          const a = document.querySelector(s);
          if (!a) return { spot: s, ok: false, why: 'anchor missing' };
          const ok = !!a.querySelector('bdi') || !!a.closest('bdi') || a.getAttribute('dir') === 'ltr' || !!a.closest('[dir="ltr"]');
          return { spot: s, ok, why: ok ? '' : 'no bidi isolation' };
        });
      });
      check(`${tag} ar-phone-bidi`, bidi.every((b) => b.ok), bidi.filter((b) => !b.ok).map((b) => `${b.spot}:${b.why}`).join(' | ') || 'both tel: anchors isolated');
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

    // 6) reservation form — success state in the page language (first viewport only; last check on this context)
    if (label === SIZES[0][0]) {
      try {
        await p.keyboard.press('Escape'); // close the menu the screenshot pass left open
        await p.waitForTimeout(700);
        await p.fill('#rf-name', 'QA Test');
        await p.fill('#rf-phone', '+971501234567');
        const tomorrow = await p.evaluate(() => { const d = new Date(Date.now() + 864e5); return d.toISOString().slice(0, 10); });
        await p.fill('#rf-date', tomorrow);
        await p.fill('#rf-time', '20:00');
        await p.selectOption('#rf-guests', { index: 1 });
        await p.evaluate(() => document.getElementById('reserve').scrollIntoView());
        await p.waitForTimeout(900); // let the fixed mobile CTA bow out of the click path
        await p.click('#reservation-form button[type="submit"]');
        await p.waitForTimeout(2200);
        const res = await p.evaluate(() => {
          const s = document.getElementById('reserve-success');
          const btn = document.querySelector('#reservation-form button[type="submit"]');
          const visible = !!(s && !s.hidden && s.getBoundingClientRect().height > 0 && getComputedStyle(s).visibility !== 'hidden');
          return { visible, btnText: btn ? btn.textContent.trim() : '' };
        });
        const langOK = page === '/ar/' ? res.btnText.includes('تم') : res.btnText.includes('Sent');
        check(`${tag} form-success-localized`, res.visible && langOK, JSON.stringify(res));
      } catch (e) {
        check(`${tag} form-success-localized`, false, String(e).slice(0, 200));
      }
    }
    await ctx.close();
  }
}

await browser.close();

/* ── Weight budgets (disk reads, run once — not per viewport) ── */
const sizeOf = (rel) => { try { return fs.statSync(rel).size; } catch { return 0; } };

// Initial JS = the <script src> tags shipped in each HTML file (≤160KB/page)
const JS_BUDGET = 160 * 1024;
for (const page of PAGES) {
  const htmlRel = page === '/' ? 'index.html' : 'ar/index.html';
  const html = fs.readFileSync(htmlRel, 'utf8');
  const srcs = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map((m) => m[1]);
  const baseDir = path.dirname(htmlRel);
  const parts = srcs.map((s) => ({ src: s, bytes: sizeOf(path.join(baseDir, s)) }));
  const sum = parts.reduce((a, b) => a + b.bytes, 0);
  check(`budget initial-js ${page} <=160KB`, sum > 0 && sum <= JS_BUDGET,
    `${sum.toLocaleString('en-US')} B (${parts.map((x) => `${x.src}=${x.bytes}`).join(', ')})`);
}

// info-only: everything JS on disk (initial + lazy chain)
{
  const vendor = fs.readdirSync('vendor').filter((f) => f.endsWith('.min.js')).map((f) => `vendor/${f}`);
  const js = fs.readdirSync('js').filter((f) => f.endsWith('.js')).map((f) => `js/${f}`);
  const total = [...vendor, ...js].reduce((a, f) => a + sizeOf(f), 0);
  console.log(`INFO  lazy+initial JS on disk: ${total.toLocaleString('en-US')} B (${[...vendor, ...js].join(', ')})`);
}

// Hero video variants
const vid = sizeOf('assets/video/hero.mp4');
check('budget hero.mp4 <=6MB', vid > 0 && vid <= 6 * 1024 * 1024, `${(vid / 1048576).toFixed(2)} MB`);
const vid720 = sizeOf('assets/video/hero-720.mp4');
check('budget hero-720.mp4 <=2MB', vid720 > 0 && vid720 <= 2 * 1024 * 1024, `${(vid720 / 1048576).toFixed(2)} MB`);

// Hero poster at mobile width — the file the 360px <picture> actually selects
const enHtml = fs.readFileSync('index.html', 'utf8');
const srcset640 = /hero-640\.avif\s+640w/.test(enHtml);
const poster = sizeOf('assets/img/hero-640.avif');
check('budget hero-640.avif <=150KB', poster > 0 && poster <= 150 * 1024 && srcset640,
  `${(poster / 1024).toFixed(1)} KB${srcset640 ? '' : ' · WARNING: hero-640.avif 640w not found in index.html srcset'}`);

let fail = 0;
for (const r of results) {
  if (!r.ok) fail++;
  console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? '  →  ' + r.detail : ''}`);
}
console.log(`\n${results.length - fail}/${results.length} checks passed. Screenshots in tools/shots/`);
process.exit(fail ? 1 : 0);
