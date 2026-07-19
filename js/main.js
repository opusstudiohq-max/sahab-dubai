/* ═══════════════════════════════════════════════════════════
   SAHAB — main.js (v2 · motion system rewrite)
   «Above the clouds» — Lenis + GSAP + ScrollTrigger + SplitText.
   · One IIFE, no globals, no console noise.
   · Each library is detected independently; each module runs in
     isolation — a 404'd script never breaks the others. Menu,
     anchors and the form work with ZERO animation libraries.
   · Without JS nothing is hidden: CSS gates initial states behind
     `html.js`; JS sets its own initial states inside module setup.
   · prefers-reduced-motion → fully static, fully functional page.
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── 0 · Environment & capability detection ─────────────────────── */
  var doc = document.documentElement;
  doc.classList.add('js'); // FIRST — ungates the CSS initial states

  var isAR = doc.lang === 'ar';
  var isRTL = (doc.dir || 'ltr') === 'rtl';
  var motionMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  var reduced = motionMQ.matches;

  var hasGSAP = typeof window.gsap !== 'undefined';
  var hasST = hasGSAP && typeof window.ScrollTrigger !== 'undefined';
  var motionOK = hasGSAP && !reduced; // GSAP-driven effects allowed at all
  /* SplitText and Lenis are NOT initial scripts — they are lazy-loaded
     by module 18 after boot. Their consumers re-check `window.*` live at
     call time, so late arrival upgrades the page and failure is a no-op. */

  if (hasGSAP && hasST) gsap.registerPlugin(ScrollTrigger);

  // Shared cross-module state (closure-only — no window pollution)
  var state = { lenis: null, menuOpen: false, closeMenu: null };
  // Replaced by the hero module when motion is available; the preloader calls it.
  var heroPlay = function () {};

  /* ── tiny helpers ────────────────────────────────────────────────── */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function safe(fn) { // optional-module isolation: one failure never breaks the rest
    try { fn(); } catch (err) { /* page stays functional */ }
  }
  function onFontsReady(cb) {
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(cb, cb);
    else cb();
  }
  function markSeen() {
    try { window.sessionStorage.setItem('sahab-seen', '1'); } catch (e) { /* private mode */ }
  }

  /* ── 1 · Lenis — the one clock ──────────────────────────────────────
     Only with GSAP + motion allowed; touch stays native (Lenis default).
     Lenis is lazy-loaded (module 18): this runs at boot as a no-op and
     again once the library lands — every consumer reads `state.lenis`
     live, so smooth scroll simply switches on whenever it arrives. */
  function initLenis() {
    if (typeof window.Lenis === 'undefined' || !hasGSAP || reduced) return;
    if (state.lenis) return; // already wired
    var lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    state.lenis = lenis;
    if (hasST) lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0); // one clock, no catch-up jumps
  }
  safe(initLenis);

  /* ── 2 · Mobile menu — works with zero animation libraries ──────── */
  safe(function initMobileMenu() {
    var burger = document.getElementById('nav-burger');
    var mmenu = document.getElementById('mmenu');
    if (!burger || !mmenu) return;

    var openLabel = burger.getAttribute('aria-label') || (isAR ? 'فتح القائمة' : 'Open menu');
    var closeLabel = isAR ? 'إغلاق القائمة' : 'Close menu';
    var focusables = $$('a[href], button', mmenu);

    function lockScroll(lock) {
      if (state.lenis) { lock ? state.lenis.stop() : state.lenis.start(); }
      document.body.style.overflow = lock ? 'hidden' : '';
    }
    function open() {
      state.menuOpen = true;
      mmenu.classList.add('is-open');
      mmenu.setAttribute('aria-hidden', 'false');
      burger.setAttribute('aria-expanded', 'true');
      burger.setAttribute('aria-label', closeLabel);
      lockScroll(true);
      var nav = document.getElementById('nav');
      if (nav) nav.classList.remove('is-hidden'); // nav never hides behind its own menu
      if (focusables[0]) focusables[0].focus();
    }
    function close(restoreFocus) {
      if (!state.menuOpen) return;
      state.menuOpen = false;
      mmenu.classList.remove('is-open');
      mmenu.setAttribute('aria-hidden', 'true');
      burger.setAttribute('aria-expanded', 'false');
      burger.setAttribute('aria-label', openLabel);
      lockScroll(false);
      if (restoreFocus) burger.focus();
    }
    state.closeMenu = close;

    burger.addEventListener('click', function () { state.menuOpen ? close(true) : open(); });

    document.addEventListener('keydown', function (e) {
      if (!state.menuOpen) return;
      if (e.key === 'Escape') { close(true); return; }
      if (e.key !== 'Tab' || !focusables.length) return;
      // simple focus trap: Tab / Shift+Tab cycle inside the menu
      var first = focusables[0];
      var last = focusables[focusables.length - 1];
      var active = document.activeElement;
      var inside = mmenu.contains(active);
      if (e.shiftKey && (!inside || active === first)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (!inside || active === last)) { e.preventDefault(); first.focus(); }
    });

    // resized to desktop while open → close silently (CSS hides the menu there)
    var desktopMQ = window.matchMedia('(min-width: 901px)');
    if (desktopMQ.addEventListener) {
      desktopMQ.addEventListener('change', function (e) { if (e.matches) close(false); });
    }
  });

  /* ── 3 · Anchor scrolling — [data-scroll] with Lenis/native fallback */
  safe(function initAnchors() {
    $$('[data-scroll]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var href = a.getAttribute('href') || '';
        if (href.charAt(0) !== '#' || href.length < 2) return; // e.g. the language link
        e.preventDefault();
        if (state.closeMenu) state.closeMenu(false); // menu links: close first, then glide
        if (href === '#top') { goTo(0); return; }
        var target = document.querySelector(href);
        if (target) goTo(target);
      });
    });
    function goTo(target) {
      if (state.lenis) {
        state.lenis.scrollTo(target, { offset: target === 0 ? 0 : -70, duration: 1.25 });
      } else if (target === 0) {
        window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
      } else {
        target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
      }
    }
  });

  /* ── 4 · Nav — scrolled state + hide on scroll down ─────────────── */
  safe(function initNav() {
    var nav = document.getElementById('nav');
    if (!nav) return;
    var lastY = window.scrollY || 0;

    function update(y) {
      nav.classList.toggle('is-scrolled', y > 40);
      if (state.menuOpen) { nav.classList.remove('is-hidden'); lastY = y; return; }
      if (y > 400 && y > lastY + 4) nav.classList.add('is-hidden'); // hiding kicks in past 400px
      else if (y < lastY - 4 || y <= 400) nav.classList.remove('is-hidden'); // always show near top
      lastY = y;
    }

    if (state.lenis) {
      state.lenis.on('scroll', function (e) { update(e.scroll); });
    } else {
      var ticking = false;
      window.addEventListener('scroll', function () {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(function () {
          update(window.scrollY || 0);
          ticking = false;
        });
      }, { passive: true });
    }
    // keyboard focus moving into the nav always reveals it
    nav.addEventListener('focusin', function () { nav.classList.remove('is-hidden'); });
  });

  /* ── 5 · Nav status — live Dubai time + tonight's service ─────────
     Open Tue–Sun 18:30–00:00 · Monday closed. Both pages carry the
     element; guarded anyway, both string sets ready. */
  safe(function initNavStatus() {
    var el = document.getElementById('nav-status');
    if (!el || typeof Intl === 'undefined' || !Intl.DateTimeFormat) return;
    var fmt;
    try {
      fmt = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Dubai', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
      });
    } catch (e) { return; }

    function render() {
      var p = {};
      fmt.formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
      var hhmm = p.hour + ':' + p.minute;
      var mins = parseInt(p.hour, 10) * 60 + parseInt(p.minute, 10);
      var openDay = p.weekday !== 'Mon';
      var open = openDay && mins >= 18 * 60 + 30; // 18:30 → 23:59
      var status = open
        ? (isAR ? 'مفتوح حتى 00:00' : 'Open until 00:00')
        : openDay
          ? (isAR ? 'يفتح 18:30' : 'Opens 18:30')
          : (isAR ? 'يفتح الثلاثاء 18:30' : 'Opens Tue 18:30');
      el.textContent = (isAR ? 'دبي ' : 'Dubai ') + hhmm + ' · ' + status;
    }
    render();
    window.setInterval(render, 30000);
  });

  /* ── 6 · Mobile CTA orchestration ───────────────────────────────────
     The fixed bar hides while hero CTAs or #reserve are ≥25% in view —
     one copper action per screen, never two. */
  safe(function initMobileCta() {
    var cta = $('.mobile-cta');
    if (!cta || !('IntersectionObserver' in window)) return;
    var watched = [$('.hero__ctas'), document.getElementById('reserve')].filter(Boolean);
    if (!watched.length) return;

    var visible = [];
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { visible[watched.indexOf(en.target)] = en.intersectionRatio >= 0.25; });
      cta.classList.toggle('is-hidden', visible.some(Boolean));
    }, { rootMargin: '-64px 0px 0px 0px', threshold: [0, 0.25] }); // hides a touch before collision

    watched.forEach(function (t) { visible.push(false); io.observe(t); });
  });

  /* ── 7 · Reservation form — local, no backend, works everywhere ─── */
  safe(function initForm() {
    var form = document.getElementById('reservation-form');
    if (!form) return;
    var success = document.getElementById('reserve-success');
    var dateInput = document.getElementById('rf-date');
    var btn = form.querySelector('button[type="submit"]');
    var label = btn ? btn.querySelector('span') : null;
    var idleText = label ? label.textContent : '';
    var pendingText = isAR ? 'جارٍ الإرسال…' : 'Sending…';
    var doneText = isAR ? 'تم استلام طلبك' : 'Request Sent';

    if (dateInput) {
      // today in LOCAL time — toISOString() would be UTC and off by a day
      var d = new Date();
      var pad = function (n) { return String(n).padStart(2, '0'); };
      dateInput.min = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      if (btn) btn.disabled = true;
      if (label) label.textContent = pendingText;
      window.setTimeout(function () {
        if (success) {
          success.hidden = false; // aria-live announces it
          if (motionOK) gsap.from(success, { y: 12, opacity: 0, duration: 0.7, ease: 'power3.out' });
        }
        if (label) label.textContent = doneText;
        window.setTimeout(function () {
          form.reset();
          if (btn) btn.disabled = false;
          if (label) label.textContent = idleText;
        }, 4000);
      }, 900);
    });
  });

  /* ── 8 · Hero video gate ────────────────────────────────────────────
     Attach ONLY when every condition holds; otherwise remove the node
     (QA requires it absent below 768px). The poster under it stays. */
  safe(function initHeroVideo() {
    var video = document.getElementById('hero-video');
    if (!video) return;
    var conn = navigator.connection || {};
    var slowType = ['slow-2g', '2g', '3g'].indexOf(conn.effectiveType) !== -1;
    var allowed = window.matchMedia('(min-width: 768px)').matches && !reduced && !conn.saveData && !slowType;
    if (!allowed) { video.remove(); return; }

    // prefer the video element's own data attrs; tolerate a legacy child source
    var legacy = video.querySelector('source[data-src]');
    var legacySrc = legacy ? legacy.getAttribute('data-src') : null;
    var wide = window.innerWidth >= 1200;
    var src = wide
      ? (video.getAttribute('data-src') || legacySrc)
      : (video.getAttribute('data-src-mobile') || video.getAttribute('data-src') || legacySrc);
    if (!src) { video.remove(); return; }

    var source = legacy || document.createElement('source');
    source.setAttribute('src', src);
    if (!source.parentNode) {
      source.setAttribute('type', 'video/mp4');
      video.appendChild(source);
    }
    video.addEventListener('playing', function () { video.classList.add('is-ready'); });
    video.addEventListener('error', function () { video.remove(); }, true); // catches <source> errors
    video.load();
    var playPromise = video.play();
    if (playPromise && playPromise.catch) playPromise.catch(function () { /* poster stays */ });
  });

  /* ── 9 · Voices rotator — one quote on stage ────────────────────────
     CSS crossfades on .is-active; without JS all quotes stack (fine).
     Both EN and /ar/ ship a .voices__stage — the rotator runs on both. */
  safe(function initVoices() {
    var stage = $('.voices__stage');
    if (!stage) return;
    var quotes = $$('blockquote', stage);
    if (!quotes.length) return;
    quotes[0].classList.add('is-active');
    if (reduced || quotes.length < 2) return; // static first quote

    var i = 0;
    var timer = null;
    function show(n) {
      quotes[i].classList.remove('is-active');
      i = n % quotes.length;
      quotes[i].classList.add('is-active');
    }
    function start() { if (!timer) timer = window.setInterval(function () { show(i + 1); }, 5500); }
    function stop() { window.clearInterval(timer); timer = null; }

    stage.addEventListener('mouseenter', stop);
    stage.addEventListener('mouseleave', start);
    stage.addEventListener('focusin', stop);
    stage.addEventListener('focusout', start);
    document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });
    start();
  });

  /* ── 10 · Hero intro — masked lines, then a fade-rise cascade ──────
     The timeline is kicked by the preloader (or fired immediately when
     the preloader is skipped). The masked initial states are applied
     only AFTER first contentful paint: the hero title is the page's
     LCP element (Chromium ignores full-viewport images as candidates),
     and it must paint once — beneath the opaque preloader, so nothing
     flashes — before the mask hides it, otherwise LCP lands at the
     end of the intro (~4s on a cold load). */
  safe(function initHeroIntro() {
    if (!motionOK) return; // everything stays visible
    var lines = $$('.hero__title .line-inner');
    var fades = $$('.reveal-io');
    var media = $('.hero__media');
    var content = $('.hero__content');
    if (!lines.length && !fades.length) return;

    var initialSet = false;
    function setInitial() { // masked start states — idempotent
      if (initialSet) return;
      initialSet = true;
      if (lines.length) gsap.set(lines, { yPercent: 110 }); // masked by .line overflow
      if (fades.length) gsap.set(fades, { y: 26, opacity: 0 });
      if (media) gsap.set(media, { scale: 1.12 });
    }

    heroPlay = function () {
      setInitial(); // the reveal always starts from the masked state
      var tl = gsap.timeline();
      if (media) tl.to(media, { scale: 1, duration: 2.2, ease: 'power2.out' }, 0);
      if (lines.length) tl.to(lines, { yPercent: 0, duration: 1.1, ease: 'power4.out', stagger: 0.12 }, 0.1);
      if (fades.length) tl.to(fades, { y: 0, opacity: 1, duration: 0.9, ease: 'power3.out', stagger: 0.09 }, 0.55);
    };

    // Hide once FCP has happened (buffered catches a paint that already
    // occurred); hard fallback at 400ms, well before the preloader can
    // lift (min display 700ms). Unsupported observer → hide right away.
    if (window.PerformanceObserver && PerformanceObserver.supportedEntryTypes &&
        PerformanceObserver.supportedEntryTypes.indexOf('paint') !== -1) {
      var po = new PerformanceObserver(function () { po.disconnect(); setInitial(); });
      try { po.observe({ type: 'paint', buffered: true }); } catch (e) { setInitial(); }
      window.setTimeout(setInitial, 400);
    } else {
      setInitial();
    }

    // gentle scrubbed drift on the hero (all widths; ScrollTrigger only)
    if (hasST) {
      if (media) {
        gsap.to(media, { yPercent: 14, ease: 'none',
          scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
      }
      if (content) {
        gsap.to(content, { yPercent: -14, opacity: 0.15, ease: 'none',
          scrollTrigger: { trigger: '.hero', start: 'top top', end: '70% top', scrub: true } });
      }
    }
  });

  /* ── 11 · Preloader — a REAL gate, not a timer ──────────────────────
     Progress = fonts.ready + hero poster decode + window load.
     Counter tweens toward real progress; min display ~0.7s, hard cap
     1.8s. Repeat visits (sessionStorage) skip with no animation;
     reduced-motion removes it instantly. */
  safe(function initPreloader() {
    var pre = document.getElementById('preloader');
    if (!pre) { heroPlay(); return; }

    var seen = false;
    try { seen = window.sessionStorage.getItem('sahab-seen') === '1'; } catch (e) { /* ignore */ }

    if (reduced || seen) {
      pre.remove(); // instantly — no animation on either path
      if (reduced) doc.classList.add('no-motion'); // CSS belt-and-braces for the same intent
      markSeen();
      heroPlay();
      return;
    }

    if (state.lenis) state.lenis.stop(); // hold the page while the gate is up

    var count = document.getElementById('preloader-count');
    var line = pre.querySelector('.preloader__line');
    var counter = { v: 0 };
    var doneSignals = 0;
    var finished = false;
    var startedAt = Date.now();

    function render(v) {
      if (count) count.textContent = String(Math.round(v)).padStart(2, '0');
      if (line) line.style.transform = 'scaleX(' + v / 100 + ')';
    }
    function tweenTo(target, dur, onDone) {
      if (hasGSAP) {
        gsap.to(counter, { v: target, duration: dur, ease: 'power2.out', overwrite: true,
          onUpdate: function () { render(counter.v); }, onComplete: onDone || null });
      } else {
        counter.v = target;
        render(target);
        if (onDone) onDone();
      }
    }
    function signal() {
      if (finished) return;
      doneSignals = Math.min(3, doneSignals + 1);
      tweenTo(doneSignals / 3 * 100, 0.5);
      if (doneSignals === 3) {
        var wait = Math.max(0, 700 - (Date.now() - startedAt)); // min display ~0.7s
        window.setTimeout(finish, wait);
      }
    }
    function finish() {
      if (finished) return;
      finished = true;
      tweenTo(100, 0.3, function () {
        markSeen();
        pre.classList.add('is-done'); // CSS fades + hides it
        window.setTimeout(function () { pre.remove(); }, 700); // outro transition is .6s
        if (state.lenis) state.lenis.start();
        if (hasST) ScrollTrigger.refresh();
        heroPlay();
      });
    }

    // the three real signals
    onFontsReady(signal);
    var poster = $('.hero__media img');
    if (poster && poster.decode) {
      try { poster.decode().then(signal, signal); } catch (e) { signal(); }
    } else {
      signal();
    }
    if (document.readyState === 'complete') signal();
    else window.addEventListener('load', signal, { once: true });

    window.setTimeout(function () { // hard cap 1.8s — never trap the page
      while (doneSignals < 3 && !finished) signal();
    }, 1800);
  });

  /* ── 12 · SplitText headings — masked line/word reveals ─────────────
     Latin: lines + words. Arabic: LINES ONLY — word-splitting can
     orphan diacritics and chars would break joining entirely (chars
     are never used). Splits after fonts so measures are final. The
     split owns these headings: their data-reveal is stripped up front
     so the generic module never double-animates them.
     SplitText is lazy-loaded (module 18): this no-ops at boot and runs
     for real once the library lands; if it never does, headings simply
     stay visible via the generic reveals. */
  function initSplitHeadings() {
    if (!motionOK || typeof window.SplitText === 'undefined' || !hasST) return;
    if (initSplitHeadings.done) return; // one split per heading, ever
    var headings = $$('[data-split]');
    if (!headings.length) headings = $$('.h2');
    if (!headings.length) return;
    initSplitHeadings.done = true;
    gsap.registerPlugin(SplitText);
    headings.forEach(function (h) { h.removeAttribute('data-reveal'); });

    onFontsReady(function () {
      safe(function () {
        headings.forEach(function (h) {
          var split = new SplitText(h, { type: isAR ? 'lines' : 'lines,words', mask: 'lines', autoSplit: true });
          var units = isAR ? split.lines : split.words;
          if (!units || !units.length) return;
          gsap.set(units, { yPercent: 100 });
          ScrollTrigger.create({
            trigger: h,
            start: 'top 86%',
            once: true,
            onEnter: function () {
              gsap.to(units, { yPercent: 0, duration: 0.9, ease: 'power3.out', stagger: 0.04 });
            }
          });
        });
        ScrollTrigger.refresh();
      });
    });
  }
  safe(initSplitHeadings);

  /* ── 13 · Reveals — every remaining [data-reveal] ─────────────────── */
  safe(function initReveals() {
    if (!motionOK || !hasST) return; // visible by default — skip entirely
    var els = $$('[data-reveal]');
    if (!els.length) return;
    gsap.set(els, { opacity: 0, y: 28 });
    ScrollTrigger.batch(els, {
      start: 'top 88%',
      once: true,
      onEnter: function (batch) {
        gsap.to(batch, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.09, overwrite: true });
      }
    });
  });

  /* ── 14 · Pointer-only extras: magnetic buttons + custom cursor ──── */
  function magneticSetup() {
    $$('.magnetic').forEach(function (el) {
      var inner = el.querySelector('span');
      var xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' });
      var yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' });
      var ixTo = inner ? gsap.quickTo(inner, 'x', { duration: 0.5, ease: 'power3.out' }) : null;
      var iyTo = inner ? gsap.quickTo(inner, 'y', { duration: 0.5, ease: 'power3.out' }) : null;
      var clampOuter = gsap.utils.clamp(-6, 6); // ≤6px pull on the button
      var clampInner = gsap.utils.clamp(-4, 4); // ≤4px drift on the label
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2);
        var dy = e.clientY - (r.top + r.height / 2);
        xTo(clampOuter(dx * 0.18));
        yTo(clampOuter(dy * 0.18));
        if (ixTo) { ixTo(clampInner(dx * 0.1)); iyTo(clampInner(dy * 0.1)); }
      });
      el.addEventListener('mouseleave', function () { // spring home
        xTo(0); yTo(0);
        if (ixTo) { ixTo(0); iyTo(0); }
      });
    });
  }

  function cursorSetup() {
    var dot = $('.cursor-dot');
    var ring = $('.cursor-ring');
    if (!dot || !ring) return;
    doc.classList.add('has-cursor'); // CSS: show the pair, retire the native cursor

    var dotX = gsap.quickTo(dot, 'x', { duration: 0.08, ease: 'power2.out' }); // ~instant
    var dotY = gsap.quickTo(dot, 'y', { duration: 0.08, ease: 'power2.out' });
    var ringX = gsap.quickTo(ring, 'x', { duration: 0.35, ease: 'power3.out' }); // lerp trail
    var ringY = gsap.quickTo(ring, 'y', { duration: 0.35, ease: 'power3.out' });

    window.addEventListener('mousemove', function (e) {
      dotX(e.clientX); dotY(e.clientY);
      ringX(e.clientX); ringY(e.clientY);
    }, { passive: true });

    // ring blooms (CSS .is-hover) and the dot shrinks over interactive things
    var HOVER_SEL = 'a, button, [data-cursor], input, select, textarea, label';
    var hovered = null;
    document.addEventListener('mouseover', function (e) {
      if (hovered) return;
      var t = e.target.closest ? e.target.closest(HOVER_SEL) : null;
      if (t) {
        hovered = t;
        ring.classList.add('is-hover');
        gsap.to(dot, { scale: 0.5, duration: 0.3, overwrite: 'auto' });
      }
    });
    document.addEventListener('mouseout', function (e) {
      if (!hovered) return;
      if (e.relatedTarget && hovered.contains(e.relatedTarget)) return; // still inside the target
      hovered = null;
      ring.classList.remove('is-hover');
      gsap.to(dot, { scale: 1, duration: 0.3, overwrite: 'auto' });
    });

    // hide both when the pointer leaves the window
    document.addEventListener('mouseleave', function () {
      gsap.to([dot, ring], { opacity: 0, duration: 0.25, overwrite: 'auto' });
    });
    document.addEventListener('mouseenter', function () {
      gsap.to([dot, ring], { opacity: 1, duration: 0.25, overwrite: 'auto' });
    });
  }

  /* ── 15 · Responsive branches — desktop effects vs mobile-native ──
     Width (≥901px) gates pin + parallax so touch tablets still get the
     horizontal chapter; pointer:fine gates magnetic + cursor. */
  safe(function initResponsiveFX() {
    if (!motionOK) return;
    var mm = gsap.matchMedia();

    if (hasST) {
      mm.add('(min-width: 901px)', function () {
        /* Signature dishes — pinned horizontal chapter.
           RTL: the max-content track aligns RIGHT and overflows LEFT,
           so the same visual journey is a POSITIVE x travel. */
        var pin = document.getElementById('dishes-pin');
        var track = document.getElementById('dishes-track');
        if (pin && track) {
          var hint = pin.querySelector('.dishes__hint');
          var dirF = isRTL ? 1 : -1;
          var dist = function () {
            return Math.max(0, track.scrollWidth - window.innerWidth + Math.min(window.innerWidth * 0.06, 80));
          };
          var hintOff = false;
          gsap.to(track, {
            x: function () { return dirF * dist(); }, // endPadding tail room baked into dist()
            ease: 'none',
            scrollTrigger: {
              trigger: pin,
              start: 'top top',
              end: function () { return '+=' + Math.max(dist(), 1); },
              pin: true,
              scrub: 1,
              anticipatePin: 1,
              invalidateOnRefresh: true,
              onUpdate: function (self) { // the hint bows out once the ride starts
                if (!hint) return;
                var off = self.progress > 0.05;
                if (off !== hintOff) {
                  hintOff = off;
                  gsap.to(hint, { opacity: off ? 0 : 1, duration: 0.4, overwrite: 'auto' });
                }
              }
            }
          });
        }
        // mobile (≤900px): nothing added — the native snap carousel rules

        /* Space gallery — data-speed parallax drift */
        $$('[data-speed]').forEach(function (img) {
          var speed = parseFloat(img.getAttribute('data-speed')) || 1;
          var fig = img.closest('.space__fig') || img;
          gsap.to(img, { yPercent: (speed - 1) * 18, ease: 'none',
            scrollTrigger: { trigger: fig, start: 'top bottom', end: 'bottom top', scrub: true } });
        });
      });
    }

    mm.add('(min-width: 901px) and (pointer: fine)', function () {
      magneticSetup();
      cursorSetup();
    });
  });

  /* ── 16 · Refresh hygiene — triggers re-measure when reality shifts */
  safe(function initRefreshHygiene() {
    if (!hasST) return;
    var refresh = function () { ScrollTrigger.refresh(); };
    window.addEventListener('load', refresh);
    onFontsReady(refresh);
    var t;
    window.addEventListener('orientationchange', function () {
      window.clearTimeout(t);
      t = window.setTimeout(refresh, 250);
    });
  });

  /* ── 17 · Live reduced-motion flip — settle into the static page ─── */
  if (motionMQ.addEventListener) {
    motionMQ.addEventListener('change', function (e) {
      if (e.matches) window.location.reload(); // cleanest path to the static branch
    });
  }

  /* ── 18 · Lazy enhancements — everything off the critical path ──────
     Initial scripts are gsap + ScrollTrigger + this file only (≤160KB
     budget). Lenis, SplitText and the WebGL hero load right after boot
     (idle, 1.5s cap): every consumer reads live state — `state.lenis`
     at click time, `window.*` at call time — so a late arrival simply
     switches the upgrade on, and a failed load changes nothing. */
  safe(function initLazy() {
    function loadScript(src) {
      return new Promise(function (resolve, reject) {
        var s = document.createElement('script');
        s.src = src;
        s.async = true;
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      });
    }
    function start() {
      var base = window.location.pathname.indexOf('/ar/') !== -1 ? '../' : './';

      // 1 · smooth scroll — the one clock wires up whenever Lenis lands
      loadScript(base + 'vendor/lenis.min.js').then(function () {
        safe(initLenis);
        if (state.lenis && hasST) ScrollTrigger.refresh();
      }).catch(function () { /* native scrolling stays */ });

      // 2 · heading splits — the fonts.ready gate lives inside the module
      loadScript(base + 'vendor/SplitText.min.js').then(function () {
        safe(initSplitHeadings);
      }).catch(function () { /* headings stay visible, unsplit */ });

      // 3 · WebGL hero — desktop + fine pointer only (saves ~15KB on
      //    mobile/save-data); the file re-checks every gate itself.
      var conn = navigator.connection || {};
      var glWanted = window.matchMedia('(min-width: 1024px) and (pointer: fine)').matches && !reduced && !conn.saveData;
      if (glWanted) loadScript(base + 'js/hero-gl.js').catch(function () { /* static poster stays */ });
    }
    if ('requestIdleCallback' in window) window.requestIdleCallback(start, { timeout: 1500 });
    else if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
  });
})();
