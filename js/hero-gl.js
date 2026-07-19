/* ═══════════════════════════════════════════════════════════
   SAHAB — hero-gl.js (phase 4 · the one WebGL flourish)
   A hand-rolled WebGL2 shader over the hero poster/video:
   cover-fit sampling (pixel-locked to CSS object-fit: cover),
   a small mouse lens, film grain and a whisper of vignette.
   · Zero dependencies, no globals. The static poster stays
     underneath — every failure path leaves the site untouched.
   · Strict gate: desktop + fine pointer, no reduced-motion,
     no data-saver, WebGL2 available, poster decoded.
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── Gate — if ANY condition fails this file does nothing ── */
  var hero = document.querySelector('.hero');
  var media = hero && hero.querySelector('.hero__media');
  var img = media && media.querySelector('img'); // the LCP poster
  if (!hero || !media || !img) return;

  var mqDesk = window.matchMedia('(min-width: 1024px) and (pointer: fine)');
  var mqMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection || null;
  function dataSaver() { return !!(conn && conn.saveData); }
  function gateOK() { return mqDesk.matches && !mqMotion.matches && !dataSaver(); }
  if (!gateOK()) return;

  /* ── Tunables — keep every value in "did it move?" territory ── */
  var DPR_CAP = 1.5;       // devicePixelRatio ceiling
  var MOUSE_LERP = 0.07;   // pointer smoothing per frame
  var FORCE_LERP = 0.06;   // lens envelope easing per frame
  var REST_MS = 140;       // idle time before the envelope decays
  var FADE_MS = 800;       // canvas fade-in after the first real frame
  var RESIZE_MS = 120;     // debounce for buffer reallocation

  /* ── GLSL ES 3.00 — fullscreen triangle ──────────────────── */
  var VERT = [
    '#version 300 es',
    'layout(location = 0) in vec2 a_pos; out vec2 v_uv;',
    'void main() { v_uv = a_pos * 0.5 + 0.5; gl_Position = vec4(a_pos, 0.0, 1.0); }'
  ].join('\n');

  var FRAG = [
    '#version 300 es',
    'precision highp float;',
    'uniform sampler2D u_tex;   // poster or live video frame',
    'uniform vec2 u_res;        // drawingbuffer size, px',
    'uniform vec2 u_texRes;     // texture size, px',
    'uniform vec2 u_mouse;      // smoothed pointer, UV (y-up)',
    'uniform float u_time;      // seconds',
    'uniform float u_strength;  // 0..1 lens envelope',
    'in vec2 v_uv; out vec4 outColor;',
    'const float LENS_R = 0.30;    // lens radius, UV',
    'const float LENS_MAX = 0.035; // peak displacement, UV',
    'const float IDLE_AMP = 0.004; // idle breathing, UV',
    'const float GRAIN = 0.04;     // film grain opacity',
    'const float VIG = 0.08;       // max edge darkening',
    /* Exact CSS object-fit: cover in UV space */
    'vec2 coverUV(vec2 uv) {',
    '  float ca = u_res.x / u_res.y, ta = u_texRes.x / u_texRes.y;',
    '  vec2 scale = ca > ta ? vec2(1.0, ta / ca) : vec2(ca / ta, 1.0);',
    '  return (uv - 0.5) * scale + 0.5; }',
    'float hash(vec2 p) {',
    '  p = fract(p * vec2(443.897, 441.423));',
    '  p += dot(p, p + 19.19);',
    '  return fract(p.x * p.y); }',
    'void main() {',
    '  float aspect = u_res.x / u_res.y;',
    /* circular lens: distance measured in aspect-corrected space */
    '  vec2 d = v_uv - u_mouse; d.x *= aspect;',
    '  float dist = length(d);',
    '  float lens = 1.0 - smoothstep(0.0, LENS_R, dist);',
    '  vec2 dir = dist > 0.0001 ? d / dist : vec2(0.0);',
    /* gentle magnification toward the pointer, plus a barely-there
       idle swell so the frame never feels dead */
    '  float mag = LENS_MAX * u_strength * lens + IDLE_AMP * lens * sin(u_time * 0.9 + dist * 8.0);',
    '  vec2 disp = dir * mag; disp.x /= aspect;',
    '  vec3 col = texture(u_tex, coverUV(v_uv + disp)).rgb;',
    /* animated film grain, one cell per device pixel */
    '  float g = hash(gl_FragCoord.xy + vec2(fract(u_time * 13.73) * 91.7, fract(u_time * 7.31) * 57.3));',
    '  col += (g - 0.5) * GRAIN;',
    /* whisper-light vignette */
    '  float vd = length((v_uv - 0.5) * vec2(aspect, 1.0));',
    '  col *= 1.0 - VIG * smoothstep(0.6, 1.05, vd);',
    '  outColor = vec4(col, 1.0); }'
  ].join('\n');

  /* ── Module state ────────────────────────────────────────── */
  var dead = false, inited = false, revealed = false;
  var canvas = null, gl = null, prog = null, vao = null, tex = null;
  var U = {};                          // uniform locations
  var texW = 1, texH = 1;
  var rafId = 0, roT = 0, io = null, ro = null;
  var video = null, usingVideo = false, videoFaded = false;
  var heroOnScreen = false;
  var tX = 0.5, tY = 0.5;              // pointer target, UV (y-up)
  var sX = 0.5, sY = 0.5;              // smoothed pointer
  var force = 0, forceTarget = 0, lastMove = 0;

  /* ── Boot ────────────────────────────────────────────────── */
  function compile(type, src) {
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      gl.deleteShader(sh);
      throw new Error('shader'); // silent — init's guard catches it
    }
    return sh;
  }

  function init() {
    if (inited || dead || !gateOK()) return; // re-check: conditions may have flipped while the poster loaded
    inited = true;
    try {
      canvas = document.createElement('canvas');
      canvas.setAttribute('aria-hidden', 'true');
      gl = canvas.getContext('webgl2', { alpha: true, antialias: false, powerPreference: 'low-power' });
      if (!gl) return; // no WebGL2 → static site, nothing to undo

      var vs = compile(gl.VERTEX_SHADER, VERT);
      var fs = compile(gl.FRAGMENT_SHADER, FRAG);
      prog = gl.createProgram();
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('link');
      ['u_tex', 'u_res', 'u_texRes', 'u_mouse', 'u_time', 'u_strength'].forEach(function (n) {
        U[n] = gl.getUniformLocation(prog, n);
      });

      /* fullscreen triangle: (-1,-1) (3,-1) (-1,3) */
      vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      var buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

      /* texture: poster now, live video frames later if available */
      tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      uploadPoster();

      wireDom();
      resize();
      syncLoop();
    } catch (err) {
      teardown(); // any failure → the static site, exactly as before
    }
  }

  /* ── DOM wiring — all canvas styling is inline (CSS untouched) ── */
  function wireDom() {
    var s = canvas.style;
    s.position = 'absolute';
    s.inset = '0';
    s.width = '100%';
    s.height = '100%';
    s.pointerEvents = 'none';
    /* .hero is an isolated stacking context where .hero__media sits at
       z-index -2 and the veil at -1: z-index 2 inside .hero__media is
       above poster + video yet forever below .hero__veil and .hero__content */
    s.zIndex = '2';
    s.opacity = '0';
    s.transition = 'opacity ' + FADE_MS + 'ms ease';
    media.appendChild(canvas);
    media.classList.add('is-gl-active');

    canvas.addEventListener('webglcontextlost', onContextLost);
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    document.addEventListener('visibilitychange', onVisChange);
    mqListen(mqDesk, true);
    mqListen(mqMotion, true);
    if (conn && conn.addEventListener) conn.addEventListener('change', onGateChange);

    /* render only while the hero is on screen */
    io = new IntersectionObserver(function (entries) {
      heroOnScreen = entries[0].isIntersecting;
      syncLoop();
    });
    io.observe(hero);

    /* debounced buffer realloc on media-box resize */
    ro = new ResizeObserver(function () {
      window.clearTimeout(roT);
      roT = window.setTimeout(function () { if (!dead) resize(); }, RESIZE_MS);
    });
    ro.observe(media);

    wireVideo();
  }

  /* ── Texture sources: video wins, poster is the base ─────── */
  function uploadPoster() {
    texW = img.naturalWidth || 1;
    texH = img.naturalHeight || 1;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
  }

  function wireVideo() {
    video = document.getElementById('hero-video');
    if (!video) return; // main.js gate removed it → the poster rules
    video.addEventListener('playing', onVideoPlaying);
    video.addEventListener('error', onVideoError, true); // capture: <source> errors don't bubble
    onVideoPlaying(); // it may already be playing
  }

  function onVideoPlaying() {
    if (dead || usingVideo || !video || video.readyState < 2) return;
    usingVideo = true;
    videoFaded = true;
    video.style.opacity = '0'; // the canvas draws it now; node stays for QA + fallback
    texW = video.videoWidth || texW;
    texH = video.videoHeight || texH;
  }

  function onVideoError() {
    if (!usingVideo) return;
    usingVideo = false;
    videoFaded = false;
    uploadPoster(); // static texture from here on; the DOM stays untouched
  }

  /* ── Sizing ──────────────────────────────────────────────── */
  function resize() {
    if (!canvas || !media.clientWidth || !media.clientHeight) return;
    var dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
    var w = Math.max(1, Math.round(media.clientWidth * dpr));
    var h = Math.max(1, Math.round(media.clientHeight * dpr));
    if (w !== canvas.width || h !== canvas.height) { canvas.width = w; canvas.height = h; }
  }

  /* ── Pointer ─────────────────────────────────────────────── */
  function onMouseMove(e) {
    if (!canvas) return;
    var r = canvas.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return;
    tX = (e.clientX - r.left) / r.width;
    tY = 1 - (e.clientY - r.top) / r.height; // GL y-up
    forceTarget = 1;
    lastMove = performance.now();
  }

  /* ── Render loop ─────────────────────────────────────────── */
  function frame(now) {
    rafId = 0;
    if (dead) return;
    try {
      if (usingVideo && video && video.readyState >= 2) {
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
      }

      if (performance.now() - lastMove > REST_MS) forceTarget = 0;
      sX += (tX - sX) * MOUSE_LERP;
      sY += (tY - sY) * MOUSE_LERP;
      force += (forceTarget - force) * FORCE_LERP;

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(prog);
      gl.bindVertexArray(vao);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.uniform1i(U.u_tex, 0);
      gl.uniform2f(U.u_res, canvas.width, canvas.height);
      gl.uniform2f(U.u_texRes, texW, texH);
      gl.uniform2f(U.u_mouse, sX, sY);
      gl.uniform1f(U.u_time, now * 0.001);
      gl.uniform1f(U.u_strength, force);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      if (!revealed) {
        revealed = true;
        canvas.style.opacity = '1'; // fade in only after a frame truly rendered
      }
      syncLoop();
    } catch (err) {
      teardown();
    }
  }

  function loopWanted() {
    return !dead && heroOnScreen && document.visibilityState === 'visible';
  }
  function syncLoop() {
    if (loopWanted() && !rafId) rafId = requestAnimationFrame(frame);
    else if (!loopWanted() && rafId) { cancelAnimationFrame(rafId); rafId = 0; }
  }

  /* ── Live conditions & context events ────────────────────── */
  function onVisChange() { syncLoop(); }
  function onGateChange() { if (!gateOK()) teardown(); }
  function onContextLost(e) { e.preventDefault(); teardown(); }
  function mqListen(mq, add) {
    if (add) {
      if (mq.addEventListener) mq.addEventListener('change', onGateChange);
      else if (mq.addListener) mq.addListener(onGateChange); // legacy Safari
    } else {
      if (mq.removeEventListener) mq.removeEventListener('change', onGateChange);
      else if (mq.removeListener) mq.removeListener(onGateChange);
    }
  }

  /* ── Teardown — leave the site exactly as without this file ── */
  function teardown() {
    if (dead) return;
    dead = true;
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    window.clearTimeout(roT);
    if (io) { try { io.disconnect(); } catch (e) {} }
    if (ro) { try { ro.disconnect(); } catch (e) {} }
    window.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('visibilitychange', onVisChange);
    mqListen(mqDesk, false);
    mqListen(mqMotion, false);
    if (conn && conn.removeEventListener) conn.removeEventListener('change', onGateChange);
    if (video) {
      video.removeEventListener('playing', onVideoPlaying);
      video.removeEventListener('error', onVideoError, true);
      if (videoFaded) video.style.opacity = ''; // CSS .is-ready takes over again
    }
    media.classList.remove('is-gl-active');
    if (canvas) {
      canvas.removeEventListener('webglcontextlost', onContextLost);
      try { canvas.remove(); } catch (e) {}
    }
    if (gl) {
      try {
        var lose = gl.getExtension('WEBGL_lose_context');
        if (lose) lose.loseContext();
      } catch (e) {}
      gl = null;
    }
  }

  /* ── Start: the poster is the base texture AND the LCP — never
        start before it has successfully loaded/decoded ── */
  if (img.complete && img.naturalWidth > 0) {
    init();
  } else {
    img.addEventListener('load', init, { once: true });
    if (img.decode) {
      try { img.decode().then(init, function () { /* broken poster → static site */ }); }
      catch (e) { /* the load listener above still covers this path */ }
    }
    /* no error listener needed: without the poster we simply never run */
  }
})();
