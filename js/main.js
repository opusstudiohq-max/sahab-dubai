/* ═══════════════════════════════════════════════════════════
   SAHAB — main.js
   Lenis smooth scroll + GSAP animation system
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var motionOK = !prefersReduced && window.gsap && window.Lenis;

  /* ── Essentials that must work with or without motion ── */

  var burger = document.getElementById("nav-burger");
  var mmenu = document.getElementById("mmenu");

  function closeMenu() {
    burger.classList.remove("is-open");
    mmenu.classList.remove("is-open");
    burger.setAttribute("aria-expanded", "false");
    mmenu.setAttribute("aria-hidden", "true");
    if (window.__lenis) window.__lenis.start();
  }

  burger.addEventListener("click", function () {
    var open = mmenu.classList.toggle("is-open");
    burger.classList.toggle("is-open", open);
    burger.setAttribute("aria-expanded", String(open));
    mmenu.setAttribute("aria-hidden", String(!open));
    if (window.__lenis) { open ? window.__lenis.stop() : window.__lenis.start(); }
  });

  // Reservation form
  var form = document.getElementById("reservation-form");
  var success = document.getElementById("reserve-success");
  var dateInput = document.getElementById("rf-date");
  if (dateInput) dateInput.min = new Date().toISOString().split("T")[0];
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }
    var btn = form.querySelector("button[type=submit]");
    btn.querySelector("span").textContent = "Request Sent";
    btn.disabled = true;
    btn.style.opacity = "0.55";
    btn.style.pointerEvents = "none";
    success.hidden = false;
    if (window.gsap && motionOK) {
      gsap.from(success, { y: 14, opacity: 0, duration: 0.7, ease: "power3.out" });
    }
    form.reset();
  });

  // Hide fixed mobile CTA once the reservation section is in view
  var mobileCta = document.querySelector(".mobile-cta");
  if (mobileCta && "IntersectionObserver" in window) {
    var reserveTarget = document.getElementById("reserve");
    if (reserveTarget) {
      var ctaObserver = new IntersectionObserver(function (entries) {
        mobileCta.classList.toggle("is-hidden", entries[0].isIntersecting);
      }, { threshold: 0.15 });
      ctaObserver.observe(reserveTarget);
    }
  }

  /* ── No-motion path: show everything, native anchors ──── */
  if (!motionOK) {
    document.documentElement.classList.add("no-motion");
    var staticVideo = document.getElementById("hero-video");
    if (staticVideo) staticVideo.remove();
    document.querySelectorAll("[data-scroll]").forEach(function (a) {
      a.addEventListener("click", function (e) {
        var id = a.getAttribute("href");
        if (id && id.charAt(0) === "#") {
          e.preventDefault();
          closeMenu();
          var t = document.querySelector(id === "#top" ? "main" : id);
          if (t) t.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth" });
        }
      });
    });
    return;
  }

  /* ── Motion path ─────────────────────────────────────── */
  gsap.registerPlugin(ScrollTrigger);

  // Hero video: fade in over the still image once it can play;
  // remove itself silently if the file is missing, data is saved, or viewport is narrow.
  var heroVideo = document.getElementById("hero-video");
  if (heroVideo) {
    var saveData = !!(navigator.connection && navigator.connection.saveData);
    if (window.innerWidth >= 768 && !saveData) {
      var source = heroVideo.querySelector("source");
      if (source && source.dataset.src) {
        source.src = source.dataset.src;
        heroVideo.load();
      }
      heroVideo.addEventListener("loadeddata", function () { heroVideo.classList.add("is-ready"); });
      heroVideo.addEventListener("error", function () { heroVideo.remove(); }, true);
      heroVideo.play().catch(function () { /* stays on the still image */ });
    } else {
      heroVideo.remove();
    }
  }

  // Lenis smooth scroll wired into GSAP's ticker
  var lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 1, smoothWheel: true });
  window.__lenis = lenis;
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
  gsap.ticker.lagSmoothing(0);

  // Anchor scrolling through Lenis
  document.querySelectorAll("[data-scroll]").forEach(function (a) {
    a.addEventListener("click", function (e) {
      var id = a.getAttribute("href");
      if (!id || id.charAt(0) !== "#") return;
      e.preventDefault();
      closeMenu();
      var target = id === "#top" ? 0 : document.querySelector(id);
      if (target === null) return;
      lenis.scrollTo(target, { offset: id === "#top" ? 0 : -70, duration: 1.5 });
    });
  });

  // Split hero title into words → chars (preserves <em>)
  function splitChars(el) {
    var nodes = Array.prototype.slice.call(el.childNodes);
    nodes.forEach(function (node) {
      if (node.nodeType === 3) {
        var frag = document.createDocumentFragment();
        node.textContent.split(/(\s+)/).forEach(function (piece) {
          if (!piece) return;
          if (/^\s+$/.test(piece)) { frag.appendChild(document.createTextNode(" ")); return; }
          var word = document.createElement("span");
          word.className = "word";
          piece.split("").forEach(function (ch) {
            var c = document.createElement("span");
            c.className = "ch";
            c.textContent = ch;
            word.appendChild(c);
          });
          frag.appendChild(word);
        });
        el.replaceChild(frag, node);
      } else if (node.nodeType === 1) {
        splitChars(node);
      }
    });
  }
  document.querySelectorAll(".hero__title .line-inner").forEach(splitChars);

  // Initial states (JS-only, so content is visible without JS)
  gsap.set(".hero__title .ch", { yPercent: 118 });
  gsap.set(".reveal-io", { y: 26, opacity: 0 });
  gsap.set(".hero__media", { scale: 1.28 });
  gsap.set("[data-reveal]", { y: 44, opacity: 0 });

  /* ── Preloader → hero intro ──────────────────────────── */
  lenis.stop();
  var count = document.getElementById("preloader-count");
  var counter = { v: 0 };

  var boot = gsap.timeline({
    onComplete: function () {
      document.getElementById("preloader").style.display = "none";
      lenis.start();
      ScrollTrigger.refresh();
    }
  });

  boot
    .to(counter, {
      v: 100, duration: 1.7, ease: "power2.inOut",
      onUpdate: function () { count.textContent = String(Math.round(counter.v)).padStart(2, "0"); }
    })
    .to(".preloader__line", { scaleX: 1, duration: 1.7, ease: "power2.inOut" }, 0)
    .to(".preloader__inner, .preloader__count", { opacity: 0, y: -24, duration: 0.55, ease: "power2.in" }, "+=0.25")
    .to("#preloader", { yPercent: -100, duration: 1, ease: "power4.inOut" })
    // Hero intro
    .to(".hero__media", { scale: 1.08, duration: 2.4, ease: "power2.out" }, "-=0.9")
    .to(".hero__title .ch", { yPercent: 0, duration: 1.15, ease: "power4.out", stagger: 0.016 }, "-=2.1")
    .to(".reveal-io", { y: 0, opacity: 1, duration: 1, ease: "power3.out", stagger: 0.11 }, "-=1.5");

  /* ── Hero scroll parallax ────────────────────────────── */
  gsap.to(".hero__media", {
    yPercent: 16, ease: "none",
    scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true }
  });
  gsap.to(".hero__content", {
    yPercent: -22, opacity: 0.1, ease: "none",
    scrollTrigger: { trigger: ".hero", start: "top top", end: "72% top", scrub: true }
  });

  /* ── Nav: shrink + hide on scroll down ───────────────── */
  var nav = document.getElementById("nav");
  var lastY = 0;
  lenis.on("scroll", function (e) {
    if (!mmenu.classList.contains("is-open")) {
      var y = e.scroll;
      nav.classList.toggle("nav--scrolled", y > 60);
      if (y > 480 && y > lastY + 4) nav.classList.add("nav--hidden");
      else if (y < lastY - 4) nav.classList.remove("nav--hidden");
      lastY = y;
    }
  });

  /* ── Section reveals ─────────────────────────────────── */
  ScrollTrigger.batch("[data-reveal]", {
    start: "top 88%",
    once: true,
    onEnter: function (els) {
      gsap.to(els, { y: 0, opacity: 1, duration: 1.1, ease: "power3.out", stagger: 0.09, overwrite: true });
    }
  });

  /* ── Signature dishes: horizontal scroll (desktop) ───── */
  var mm = gsap.matchMedia();
  mm.add("(min-width: 901px)", function () {
    var track = document.getElementById("dishes-track");
    var pin = document.getElementById("dishes-pin");
    var dist = function () { return Math.max(0, track.scrollWidth - window.innerWidth); };
    var tween = gsap.to(track, {
      x: function () { return -dist(); },
      ease: "none",
      scrollTrigger: {
        trigger: pin,
        start: "top top",
        end: function () { return "+=" + dist(); },
        pin: true,
        scrub: 1,
        anticipatePin: 1,
        invalidateOnRefresh: true
      }
    });
    return function () { if (tween.scrollTrigger) tween.scrollTrigger.kill(); tween.kill(); gsap.set(track, { clearProps: "x" }); };
  });

  /* ── Space gallery parallax ──────────────────────────── */
  gsap.utils.toArray(".space__frame img").forEach(function (img) {
    var speed = parseFloat(img.getAttribute("data-speed") || "1");
    gsap.fromTo(img, { yPercent: -7 * speed }, {
      yPercent: 7 * speed, ease: "none",
      scrollTrigger: { trigger: img.closest(".space__fig"), start: "top bottom", end: "bottom top", scrub: true }
    });
  });

  /* ── Footer watermark drift ──────────────────────────── */
  gsap.fromTo(".footer__watermark", { yPercent: 30 }, {
    yPercent: 0, ease: "none",
    scrollTrigger: { trigger: ".footer", start: "top bottom", end: "bottom bottom", scrub: true }
  });

  /* ── Pointer-fine extras: magnetic buttons + cursor ──── */
  if (window.matchMedia("(pointer: fine)").matches) {
    document.documentElement.classList.add("has-cursor");

    document.querySelectorAll(".magnetic").forEach(function (el) {
      var xTo = gsap.quickTo(el, "x", { duration: 0.5, ease: "power3.out" });
      var yTo = gsap.quickTo(el, "y", { duration: 0.5, ease: "power3.out" });
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * 0.32);
        yTo((e.clientY - r.top - r.height / 2) * 0.32);
      });
      el.addEventListener("mouseleave", function () { xTo(0); yTo(0); });
    });

    var dot = document.querySelector(".cursor-dot");
    var ring = document.querySelector(".cursor-ring");
    var dotX = gsap.quickTo(dot, "x", { duration: 0.12, ease: "power2.out" });
    var dotY = gsap.quickTo(dot, "y", { duration: 0.12, ease: "power2.out" });
    var ringX = gsap.quickTo(ring, "x", { duration: 0.45, ease: "power3.out" });
    var ringY = gsap.quickTo(ring, "y", { duration: 0.45, ease: "power3.out" });
    window.addEventListener("mousemove", function (e) {
      dotX(e.clientX); dotY(e.clientY); ringX(e.clientX); ringY(e.clientY);
    });
    document.addEventListener("mouseover", function (e) {
      if (e.target.closest("a, button, input, select, label, .dish, .space__fig")) ring.classList.add("is-hover");
    });
    document.addEventListener("mouseout", function (e) {
      if (e.target.closest("a, button, input, select, label, .dish, .space__fig")) ring.classList.remove("is-hover");
    });
  }

  // Refresh triggers once media has loaded
  window.addEventListener("load", function () { ScrollTrigger.refresh(); });
})();
