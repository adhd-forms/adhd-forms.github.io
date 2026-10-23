/* Pediatric Tools: shared page shell. Loaded without defer in each page's <head>:
     <script src="shared.js?v=3"></script>
   and started at the end of <body> with:
     <script>window.PedsShared && PedsShared.init();</script>
   Bump ?v= on every page whenever this file changes (same rule as pets.js).
   Only PedsShared is exposed, so page scripts keep their own helpers (like $). */
(function () {
  "use strict";

  // Dark mode by default; a saved choice from the switch wins. Runs right away in <head>,
  // before the page draws, so it doesn't flash.
  let t = null;
  try { t = localStorage.getItem("peds-tools-theme"); } catch (e) {}
  document.documentElement.dataset.theme = (t === "light" || t === "dark") ? t : "dark";

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

  let started = false;
  function init() {
    if (started) return;
    started = true;
    pinGate();
    themeSwitch();
  }
  // Offline copy for the home-screen app (/sw.js covers the whole site). Errors are ignored: the site works without it.
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
  }

  window.PedsShared = { init };
  // Fallback if a page forgets the init call at the end of <body>.
  document.addEventListener("DOMContentLoaded", init);
})();
