/* Pediatric Tools: shared page shell. Loaded without defer in each page's <head>:
     <script src="shared.js?v=3"></script>
   and started at the end of <body> with:
     <script>window.PedsShared && PedsShared.init();</script>
   Bump ?v= on every page whenever this file changes (same rule as pets.js).
   Only PedsShared is exposed, so page scripts keep their own helpers (like $). */
(function () {
  "use strict";

  // Follows the phone's light/dark setting (owner, 2026-10-24); a saved choice from the switch wins.
  // Runs right away in <head>, before the page draws, so it doesn't flash.
  let t = null;
  try { t = localStorage.getItem("peds-tools-theme"); } catch (e) {}
  const phoneDark = window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.dataset.theme = (t === "light" || t === "dark") ? t : (phoneDark ? "dark" : "light");

  // Text size (owner, 2026-11-01), saved on this device, steps 0-4. Body text grows 100-150 % (--tb);
  // small text (under 14px) grows faster, 100-162 % (--ts), so it keeps up without passing the body text.
  // Pages write sizes as calc(Npx * var(--tb, 1)), or var(--ts, 1) under 14px; padding and row heights stay.
  // Small text uses Atkinson Hyperlegible Next (self-hosted, SIL OFL), at weight 500 or more.
  const TEXT_KEY = "peds-tools-text-size", TEXT_STEPS = 4;
  let textStep = 0;
  try { textStep = Math.min(TEXT_STEPS, Math.max(0, parseInt(localStorage.getItem(TEXT_KEY), 10) || 0)); } catch (e) {}
  const scaleOf = n => 1 + n / TEXT_STEPS * 0.5;
  function applyTextSize(n) {
    const s = document.documentElement.style, k = scaleOf(n) - 1;
    s.setProperty("--tb", String(1 + k));
    s.setProperty("--ts", String(1 + 1.25 * k));
  }
  applyTextSize(textStep);
  const fontUrl = new URL("fonts/atkinson-hyperlegible-next-latin.woff2", document.currentScript.src).href;
  const css = document.createElement("style");
  css.textContent = `
@font-face { font-family: "Atkinson Hyperlegible Next"; font-style: normal; font-weight: 200 800; font-display: swap;
  src: url("${fontUrl}") format("woff2"); }
:root { --small-font: "Atkinson Hyperlegible Next", system-ui, sans-serif; }
.top-tools { position: absolute; top: 12px; right: 16px; display: flex; gap: 8px; }
.top-tools .theme-toggle { position: static; }
.cog { width: 40px; height: 40px; padding: 0; display: grid; place-items: center; color: var(--band-text); background: transparent;
  border: 1px solid var(--band-muted); border-radius: var(--radius); cursor: pointer; }
.cog svg { width: 20px; height: 20px; }
.settings-panel { position: absolute; top: 60px; right: 16px; z-index: 30; width: min(300px, calc(100% - 32px)); padding: 14px 16px 10px;
  background: var(--panel); color: var(--body); border: 1px solid var(--edge, var(--band-muted)); border-radius: var(--radius);
  box-shadow: 0 8px 24px rgba(0, 0, 0, .3); text-align: left; }
.settings-panel label { display: block; margin: 0; color: var(--heading); font-weight: 600; font-size: calc(16px * var(--tb, 1)); }
.settings-panel input { display: block; width: 100%; height: 44px; margin: 0; accent-color: var(--brand); cursor: pointer; }
.ts-ends { display: flex; justify-content: space-between; align-items: baseline; color: var(--heading); font-family: var(--small-font); font-weight: 500; }
.ts-ends .a1 { font-size: 13px; } .ts-ends .a2 { font-size: 22px; } .ts-ends output { font-size: calc(13px * var(--ts, 1)); }
.home { position: absolute; top: 10px; left: 8px; display: inline-flex; align-items: center; gap: 2px; min-height: 44px; padding: 8px 12px 8px 6px;
  font: inherit; font-size: calc(16px * var(--tb, 1)); font-weight: 500; line-height: 1.2; color: var(--band-text); background: transparent;
  border: 0; border-radius: var(--radius); text-decoration: none; cursor: pointer; }
.home svg { width: 1.15em; height: 1.15em; flex: none; }
.home:hover { text-decoration: underline; text-underline-offset: 3px; }
.cog:focus-visible, .home:focus-visible, .settings-panel input:focus-visible { outline: 2px solid var(--band-text); outline-offset: 2px; }
.settings-panel input:focus-visible { outline-color: var(--focus, var(--heading)); }
@media print { :root { --tb: 1 !important; --ts: 1 !important; } .top-tools, .settings-panel, .home { display: none !important; } }`;
  document.head.append(css);

  // PIN gates. Only SHA-256 hashes are stored here, so the PINs themselves aren't readable in
  // the page source. These are convenience gates, not security (the site is public).
  // To change a PIN, replace its hash: SHA-256 of salt + PIN (clinician salt "cleanout-hub:",
  // family salt "twin-log:"), then bump shared.js?v= on every page.
  const PIN_HASH = "e4dfbbc00eabfea05b32abab544a223787749f77442a0180ec384fe65847bdde";
  const TWIN_HASH = "6de4fcecb8b268f0e67176ddae81f37ff8b371012c1a24bd9304d1271cbb3438";
  // Easter egg: a second code (hashed with the clinician salt) opens the pet picker (pets.js) on any gate's form.
  const PET_HASH = "6747081bf1c609a055b764f2db8acb47ca1a270da2771465845c66cc8d9e24e2";
  const GATES = {
    clinician: { salt: "cleanout-hub:", hash: PIN_HASH, key: "peds-tools-clinician" },
    twin: { salt: "twin-log:", hash: TWIN_HASH, key: "peds-tools-twin" },
  };

  async function hash(text) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
  }
  const isUnlocked = key => { try { return localStorage.getItem(key) === "1"; } catch (e) { return false; } };
  const gateOf = el => (el.dataset.gate || "clinician");

  // Forms: every form[data-gate], plus #pin-form (clinician). Gated elements: [data-pin-gated]
  // ("" or "clinician", or "twin") show only when that gate is unlocked. Lock buttons: #lock-btn or
  // [data-lock="clinician"|"twin"]. A page without a gate's form leaves that gate's elements alone.
  // The GitHub link in the footer (.gh-link) follows only the clinician gate, on every page.
  function pinGate() {
    const showGh = on => document.querySelectorAll(".gh-link").forEach(e => { e.hidden = !on; });
    showGh(isUnlocked(GATES.clinician.key));
    const forms = new Set(document.querySelectorAll("form[data-gate]"));
    const legacy = document.getElementById("pin-form");
    if (legacy) forms.add(legacy);
    const wired = new Set();
    forms.forEach(form => {
      const name = gateOf(form), gate = GATES[name];
      if (!gate || wired.has(name)) return;
      wired.add(name);
      const gateForms = [...forms].filter(f => gateOf(f) === name);
      const elems = () => [...document.querySelectorAll("[data-pin-gated]")]
        .filter(e => (e.dataset.pinGated || "clinician") === name);
      const show = on => {
        elems().forEach(e => { e.hidden = !on; });
        gateForms.forEach(f => { f.hidden = on; });
        if (name === "clinician") showGh(on);
      };
      // Stays unlocked on this device until that gate's Lock button is tapped.
      show(isUnlocked(gate.key));
      gateForms.forEach(f => f.addEventListener("submit", async e => {
        e.preventDefault();
        const input = f.querySelector("input[type=password]"), msg = f.querySelector(".pin-msg");
        const entry = input.value.trim();
        if (await hash("cleanout-hub:" + entry) === PET_HASH) {
          msg.textContent = "Meow! Pick a pet. It follows your mouse or finger.";
          input.value = "";
          if (window.PedsPets) window.PedsPets.showPicker(f.querySelector(".pin-row"));
          return;
        }
        if (await hash(gate.salt + entry) === gate.hash) {
          try { localStorage.setItem(gate.key, "1"); } catch (e2) {}
          msg.textContent = ""; input.value = ""; show(true);
        } else {
          msg.textContent = "That PIN is not correct."; input.select();
        }
      }));
      const locks = [...document.querySelectorAll(`[data-lock="${name}"]`)];
      if (name === "clinician") { const l = document.getElementById("lock-btn"); if (l) locks.push(l); }
      locks.forEach(l => l.addEventListener("click", () => { try { localStorage.removeItem(gate.key); } catch (e) {} show(false); }));
    });
  }

  // Light/dark switch (shared setting across the site).
  function themeSwitch() {
    const btn = document.getElementById("theme-toggle");
    if (!btn) return;
    const isDark = () => document.documentElement.dataset.theme === "dark";
    const label = () => {
      btn.textContent = isDark() ? "☀ Light" : "☾ Dark";
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute("content", isDark() ? "#0D0D0C" : "#232323");
    };
    btn.addEventListener("click", () => {
      const next = isDark() ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem("peds-tools-theme", next); } catch (e) {}
      label();
    });
    label();
  }

  // Settings: a small cogwheel left of the light/dark switch opens a panel with the text-size slider.
  // Pages that redraw by size listen for the "peds-text-size" event.
  const COG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>';
  function settings() {
    const toggle = document.getElementById("theme-toggle");
    if (!toggle) return;
    const tools = document.createElement("div");
    tools.className = "top-tools";
    toggle.before(tools);
    const cog = document.createElement("button");
    cog.type = "button"; cog.className = "cog"; cog.innerHTML = COG;
    cog.setAttribute("aria-label", "Settings");
    cog.setAttribute("aria-expanded", "false");
    cog.setAttribute("aria-controls", "settings-panel");
    tools.append(cog, toggle);
    const panel = document.createElement("div");
    panel.id = "settings-panel"; panel.className = "settings-panel"; panel.hidden = true;
    panel.innerHTML = '<label for="text-size">Text size</label>' +
      '<input type="range" id="text-size" min="0" max="' + TEXT_STEPS + '" step="1">' +
      '<div class="ts-ends"><span class="a1" aria-hidden="true">A</span><output for="text-size" id="text-size-out"></output><span class="a2" aria-hidden="true">A</span></div>';
    tools.after(panel);
    const range = panel.querySelector("input"), out = panel.querySelector("output");
    const pct = n => Math.round(scaleOf(n) * 100) + "%";
    range.value = textStep;
    out.textContent = pct(textStep);
    range.setAttribute("aria-valuetext", pct(textStep));
    range.addEventListener("input", () => {
      textStep = Number(range.value);
      applyTextSize(textStep);
      out.textContent = pct(textStep);
      range.setAttribute("aria-valuetext", pct(textStep));
      try { localStorage.setItem(TEXT_KEY, String(textStep)); } catch (e) {}
      window.dispatchEvent(new Event("peds-text-size"));
    });
    const open = on => { panel.hidden = !on; cog.setAttribute("aria-expanded", String(on)); };
    cog.addEventListener("click", () => { open(panel.hidden); if (!panel.hidden) range.focus(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape" && !panel.hidden) { open(false); cog.focus(); } });
    document.addEventListener("click", e => { if (!panel.hidden && !panel.contains(e.target) && !cog.contains(e.target)) open(false); });
  }

  let started = false;
  function init() {
    if (started) return;
    started = true;
    pinGate();
    themeSwitch();
    settings();
  }
  // Offline copy for the home-screen app (/sw.js covers the whole site). Errors are ignored: the site works without it.
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
  }

  window.PedsShared = { init };
  // Fallback if a page forgets the init call at the end of <body>.
  document.addEventListener("DOMContentLoaded", init);
})();
