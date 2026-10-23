/* ADHD Rating Forms: one QR scanner for the clinic page and the parent's packet screen.
   BarcodeDetector when the browser has it, otherwise jsQR (vendor/jsQR-1.4.0.js, loaded on first
   use if the page didn't load it). The camera always stops on Stop, a new scan, leaving the page or
   hiding the tab. Exposes window.PedsVanderbiltScanner.create({ video, canvas, panel, onText, onError }).
   Chart notes: 2026-10-22-vanderbilt-scanner.md (clinic), 2026-10-23-vanderbilt-parent-scan.md. */
(function () {
  "use strict";

  let jsqrLoading = null;
  function loadJsQR() {
    if (window.jsQR) return Promise.resolve();
    if (!jsqrLoading) {
      jsqrLoading = new Promise(function (resolve, reject) {
        const s = document.createElement("script");
        s.src = "vendor/jsQR-1.4.0.js";
        s.onload = resolve; s.onerror = reject;
        document.head.append(s);
      });
    }
    return jsqrLoading;
  }

  function create(o) {
    // `run` counts scan sessions: stop() bumps it, so a camera request or a frame loop from an
    // older session sees it is stale and stops its own tracks instead of running on.
    let stream = null, timer = null, detector = null, run = 0;

    function stop() {
      run++;
      clearTimeout(timer); timer = null;
      if (stream) stream.getTracks().forEach(function (t) { t.stop(); });
      stream = null;
      o.video.srcObject = null;
      if (o.panel) o.panel.hidden = true;
    }
    // Reads one frame; returns the QR text or null.
    async function readFrame(video) {
      if (detector) {
        const found = await detector.detect(video);
        return found.length ? found[0].rawValue : null;
      }
      const w = Math.min(640, video.videoWidth), h = Math.round(video.videoHeight * w / (video.videoWidth || 1));
      if (!w || !h || !window.jsQR) return null;
      const c = o.canvas; c.width = w; c.height = h;
      const g = c.getContext("2d", { willReadFrequently: true });
      g.drawImage(video, 0, 0, w, h);
      const img = g.getImageData(0, 0, w, h);
      const code = window.jsQR(img.data, w, h, { inversionAttempts: "dontInvert" });
      return code ? code.data : null;
    }
    async function tick(mine) {
      if (!stream || mine !== run) return;
      try {
        const text = await readFrame(o.video);
        if (mine !== run) return;
        if (text) { stop(); return o.onText(text); }
      } catch (e) { /* try the next frame */ }
      if (mine === run) timer = setTimeout(function () { tick(mine); }, 250);
    }
    async function start() {
      stop();
      const mine = run;
      detector = null;
      try {
        if (window.BarcodeDetector && (await window.BarcodeDetector.getSupportedFormats()).indexOf("qr_code") >= 0) detector = new window.BarcodeDetector({ formats: ["qr_code"] });
      } catch (e) { detector = null; }
      if (!detector) { try { await loadJsQR(); } catch (e) { /* frames return null; the user can still type */ } }
      if (mine !== run) return;
      let s;
      try {
        s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      } catch (e) {
        if (mine === run) o.onError();
        return;
      }
      // Stop, or another start, happened while the camera was being requested: end this stream.
      if (mine !== run) { s.getTracks().forEach(function (t) { t.stop(); }); return; }
      stream = s;
      if (o.panel) o.panel.hidden = false;
      o.video.srcObject = stream;
      // Don't wait for play(): on some browsers its promise can stay pending (a hidden or background
      // tab), which would stall scanning. Frames are simply tried every 250 ms until one reads.
      const p = o.video.play();
      if (p && p.catch) p.catch(function () { /* muted video may autoplay later; keep trying frames */ });
      tick(mine);
    }
    addEventListener("pagehide", stop);
    document.addEventListener("visibilitychange", function () { if (document.hidden) stop(); });
    return { start: start, stop: stop, readFrame: readFrame, useDetector: function (d) { detector = d; } };
  }

  // A short burst of confetti after a scan adds a result (owner, 2026-10-23). Skipped when the
  // system asks for reduced motion. A full-screen canvas that ignores clicks, removed when done.
  function confetti() {
    if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const c = document.createElement("canvas");
    c.className = "confetti";
    c.setAttribute("aria-hidden", "true");
    c.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999";
    document.body.append(c);
    const dpr = window.devicePixelRatio || 1, W = innerWidth, H = innerHeight;
    c.width = W * dpr; c.height = H * dpr;
    const g = c.getContext("2d"); g.scale(dpr, dpr);
    const colors = ["#E5484D", "#FAF9F6", "#F5B53D", "#3FA36B", "#4C8BF5"];
    const bits = Array.from({ length: 90 }, function () {
      return { x: W / 2 + (Math.random() - 0.5) * W * 0.3, y: H * 0.35, vx: (Math.random() - 0.5) * 9, vy: -4 - Math.random() * 7,
        r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3, w: 6 + Math.random() * 6, h: 4 + Math.random() * 4,
        col: colors[Math.floor(Math.random() * colors.length)] };
    });
    const start = performance.now();
    setTimeout(function () { c.remove(); }, 2500); // backup: animation frames pause in a hidden tab
    (function frame(now) {
      const t = now - start;
      g.clearRect(0, 0, W, H);
      bits.forEach(function (b) {
        b.vy += 0.25; b.vx *= 0.99; b.x += b.vx; b.y += b.vy; b.r += b.vr;
        g.save(); g.translate(b.x, b.y); g.rotate(b.r); g.globalAlpha = Math.max(0, 1 - t / 1600);
        g.fillStyle = b.col; g.fillRect(-b.w / 2, -b.h / 2, b.w, b.h); g.restore();
      });
      if (t < 1600) requestAnimationFrame(frame); else c.remove();
    })(start);
  }

  window.PedsVanderbiltScanner = Object.freeze({ create: create, loadJsQR: loadJsQR, confetti: confetti });
})();
