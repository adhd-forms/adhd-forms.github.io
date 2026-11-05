/* The SCARED form page (scared.html), for parents and children.
   One question per screen, a review screen, then the result as a QR code, a typed code and a link.
   Answers are kept only in this browser (localStorage, cleared after 29 days or with one button)
   and in links after "#". Nothing is sent to a server. No results are shown here.
   Chart note: .claude/chart/2026-11-05-scared-family-page.md (notes repo). */
(function () {
  "use strict";

  const F = window.PedsScaredForms, C = window.PedsScaredCodes, S = window.PedsScared;
  const STORE = "peds-tools-scared-draft";
  const MAX_AGE = 29 * 24 * 60 * 60 * 1000; // 29 days since the last change
  const $ = id => document.getElementById(id);

  // English only (owner, 2026-11-05). The form text itself lives in scared-forms.js.
  const STR = {
    by: "For parents and children",
    home: "Home",
    startTitle: "Start your form",
    startIntro: "Use the visit code on the sheet from the clinic. Your answers stay on this phone until you send them; nothing is saved on a website.",
    startCode: "Visit code",
    startCodeHint: "8 letters and numbers, like 7KQ4-M9XD",
    startWho: "I am",
    formParent: "Parent",
    formChild: "Child",
    startNeedForm: "Choose Parent or Child.",
    start: "Start",
    visit: "Visit {visit}",
    directions: "Directions:", // printed on both forms
    progress: "Question {n} of {total}",
    back: "Back",
    summaryButton: "Review Questions",
    reviewTitle: "Summary and submit",
    reviewAllDone: "All {total} questions answered.",
    reviewLeft: "{n} still to answer. Tap one to answer it.",
    reviewNotAnswered: "Not answered",
    reviewNeedAll: "Answer every question to finish ({n} left).",
    reviewSubmit: "Submit",
    reviewError: "Something went wrong. Please go back and check your answers.",
    doneTitle: "Thank you",
    doneIntro: "Show this QR code at the clinic, or send it to them. Keep this page until your answers reach the clinic.",
    doneQrLabel: "QR code of the results link",
    qrTapHint: "Tap for full view",
    qrFullAria: "Show the QR code full screen",
    qrClose: "Close",
    doneCode: "Backup code",
    doneCodeHint: "If the QR code or link doesn't work, this code can be typed in at the clinic.",
    doneSend: "Send",
    doneCopy: "Copy link",
    doneCopied: "Copied",
    msgSend: "Here are my answers to the SCARED form for visit {visit}: {link}",
    resultLinkNote: "This is a results link. Bring it to the clinic.",
    clinicianLink: "Clinician? Open the report",
    clear: "Clear from this device",
    clearConfirm: "Remove every saved form and answer from this phone?",
    cleared: "Cleared from this device."
  };
  function t(key, vars) {
    let s = STR[key] || key;
    Object.keys(vars || {}).forEach(k => { s = s.split("{" + k + "}").join(vars[k]); });
    return s;
  }
  document.querySelectorAll("[data-t]").forEach(el => { el.textContent = t(el.dataset.t); });

  // ---------- state and storage (every access guarded: the page works without storage) ----------
  // One entry per visit and form, so two results on one phone stay apart. savedAt is local only.
  let st = null; // { visit, form, step, answers, submitted }; step is "setup", "review" or a question index
  let returnToReview = false;
  let advance = null; // pending auto-advance after an answer; Back and Review Questions cancel it
  const items = () => F.FORMS[st.form].items;
  const leftToAnswer = () => items().filter(it => st.answers[it.n] === null).length;

  function loadAll() {
    try {
      const all = JSON.parse(localStorage.getItem(STORE) || "{}");
      const now = Date.now();
      let changed = false;
      Object.keys(all).forEach(k => {
        if (!all[k] || typeof all[k].savedAt !== "number" || now - all[k].savedAt > MAX_AGE) { delete all[k]; changed = true; }
      });
      if (changed) localStorage.setItem(STORE, JSON.stringify(all));
      return all;
    } catch (e) { return {}; }
  }
  // A saved entry is used only if every part of it could have been written by this page.
  function usable(key, e) {
    if (!e || e.visit + ":" + e.form !== key || !Object.prototype.hasOwnProperty.call(F.FORMS, e.form)) return false;
    if (!(e.step === "setup" || e.step === "review" || (Number.isInteger(e.step) && e.step >= 0 && e.step < C.TABLE.items))) return false;
    const a = e.answers;
    if (!a || typeof a !== "object" || Array.isArray(a) || Object.keys(a).length !== C.TABLE.items) return false;
    for (let n = 1; n <= C.TABLE.items; n++) if (![null, 0, 1, 2].includes(a[n])) return false;
    return !e.submitted || S.score(e.form, { answers: a }).ok;
  }
  // Once submitted, an entry never changes. A second tab still on a question takes the submitted
  // entry instead of writing over it, shows Done and returns false, so the caller stops.
  function save() {
    try {
      const all = loadAll(), key = st.visit + ":" + st.form, there = all[key];
      if (there && there.submitted && usable(key, there)) {
        delete there.savedAt;
        st = there;
        clearTimeout(advance);
        render();
        return false;
      }
      all[key] = Object.assign({}, st, { savedAt: Date.now() });
      localStorage.setItem(STORE, JSON.stringify(all));
    } catch (e) { /* storage off: keep going */ }
    return true;
  }
  function go(step) {
    st.step = step;
    if (save()) render();
  }

  function begin(visit, form) {
    $("top-msg").textContent = "";
    returnToReview = false;
    const key = visit + ":" + form, saved = loadAll()[key];
    if (usable(key, saved)) { st = saved; delete st.savedAt; }
    else {
      st = { visit: visit, form: form, step: "setup", answers: {}, submitted: false };
      F.FORMS[form].items.forEach(it => { st.answers[it.n] = null; });
    }
    // Keep the visit in the address (after "#", never sent anywhere) so a reload resumes it.
    const frag = C.inviteLink({ visit: visit, form: form }).split("#")[1];
    if (location.hash.slice(1) !== frag) history.replaceState(null, "", "#" + frag);
    render();
  }

  // ---------- screens ----------
  function show(id) {
    ["s-start", "s-setup", "s-question", "s-review", "s-done"].forEach(s => { $(s).hidden = s !== id; });
    $("home-btn").hidden = !(id === "s-question" || id === "s-review");
    // Answers stay on the page only while their own screen shows.
    if (id !== "s-question") $("answers").textContent = "";
    if (id !== "s-review") $("review-list").textContent = "";
  }
  function render() {
    if (!st) return renderStart();
    if (st.submitted) return renderDone();
    if (st.step === "setup") return renderSetup();
    if (st.step === "review") return renderReview();
    renderQuestion(st.step);
  }
  $("home-btn").addEventListener("click", () => {
    clearTimeout(advance);
    returnToReview = false;
    go("setup");
  });

  // No form is preselected: a default could put a child's answers on the parent form.
  let pick = null;
  function renderStart() {
    show("s-start");
    const box = $("form-pick");
    box.querySelectorAll("input, label").forEach(e => e.remove());
    [{ id: "parent", label: t("formParent") }, { id: "child", label: t("formChild") }].forEach(o => {
      const input = document.createElement("input");
      input.type = "radio"; input.name = "form"; input.id = "form-" + o.id; input.checked = pick === o.id;
      input.addEventListener("change", () => { pick = o.id; });
      const label = document.createElement("label");
      label.htmlFor = input.id; label.textContent = o.label;
      box.append(input, label);
    });
  }
  $("start-go").addEventListener("click", () => {
    let visit;
    try { visit = C.parseVisitCode($("code-in").value); } catch (e) { $("start-msg").textContent = e.message; return; }
    if (!pick) { $("start-msg").textContent = t("startNeedForm"); return; }
    $("start-msg").textContent = "";
    begin(visit, pick);
  });

  function renderSetup() {
    show("s-setup");
    const form = F.FORMS[st.form];
    $("setup-visit").textContent = t("visit", { visit: C.formatVisitCode(st.visit) });
    $("setup-version").textContent = form.version;
    $("setup-fill").textContent = form.fillBy;
    $("setup-directions").textContent = form.directions;
    $("setup-note").textContent = form.note || "";
    $("setup-note").hidden = !form.note;
  }
  $("setup-go").addEventListener("click", () => { go(0); });

  function renderQuestion(i) {
    show("s-question");
    const it = items()[i];
    $("bar").style.width = Math.round(i / items().length * 100) + "%";
    $("progress").textContent = t("progress", { n: i + 1, total: items().length });
    $("section-line").textContent = F.FORMS[st.form].version;
    $("qtext").textContent = it.n + ". " + it.text;
    fitQuestion();
    const box = $("answers");
    box.textContent = "";
    F.SCALE.forEach(o => {
      const b = document.createElement("button");
      b.type = "button"; b.textContent = o.label;
      if (st.answers[it.n] === o.value) b.classList.add("picked");
      b.addEventListener("click", () => {
        st.answers[it.n] = o.value;
        if (!save()) return;
        box.querySelectorAll("button").forEach(x => x.classList.toggle("picked", x === b));
        const wait = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 150;
        clearTimeout(advance);
        advance = setTimeout(() => next(i), wait);
      });
      box.append(b);
    });
    $("qtext").focus();
  }
  // Keeps the answer buttons in one place: the question area has a fixed height, and a long question
  // gets a smaller font (down to 1 rem) until it fits. Both follow the text-size setting.
  function fitQuestion() {
    const head = $("qhead"), q = $("qtext");
    const set = size => { q.style.fontSize = "calc(" + size + "rem * var(--tb, 1))"; };
    let size = 1.45;
    set(size);
    while (head.scrollHeight > head.clientHeight + 1 && size > 1.0) { size = Math.round((size - 0.05) * 100) / 100; set(size); }
  }
  ["resize", "peds-text-size"].forEach(ev => addEventListener(ev, () => { if (!$("s-question").hidden) fitQuestion(); }));
  function next(i) {
    const toReview = returnToReview || i + 1 >= items().length;
    returnToReview = false;
    go(toReview ? "review" : i + 1);
  }
  $("q-summary").addEventListener("click", () => { clearTimeout(advance); returnToReview = false; go("review"); });
  $("q-back").addEventListener("click", () => {
    clearTimeout(advance);
    returnToReview = false;
    go(st.step === 0 ? "setup" : st.step - 1);
  });

  function renderReview() {
    show("s-review");
    const left = leftToAnswer(), head = $("review-head");
    head.textContent = left ? t("reviewLeft", { n: left }) : t("reviewAllDone", { total: items().length });
    head.classList.toggle("warn", left > 0);
    $("review-submit").disabled = left > 0;
    $("review-msg").textContent = left ? t("reviewNeedAll", { n: left }) : "";
    const ul = $("review-list");
    ul.textContent = "";
    items().forEach((it, i) => {
      const li = document.createElement("li"), b = document.createElement("button");
      b.type = "button";
      const v = st.answers[it.n];
      if (v === null) b.classList.add("skipped");
      const n = document.createElement("span"); n.className = "n"; n.textContent = it.n;
      const q = document.createElement("span"); q.textContent = it.text;
      const a = document.createElement("span"); a.className = "a";
      a.textContent = v === null ? t("reviewNotAnswered") : F.SCALE.find(o => o.value === v).label;
      b.append(n, q, a);
      b.addEventListener("click", () => { returnToReview = true; go(i); });
      li.append(b); ul.append(li);
    });
  }
  $("review-submit").addEventListener("click", () => {
    if (leftToAnswer()) return renderReview();
    // Never make a code for answers the scoring would reject. The result itself is not used here.
    if (!S.score(st.form, { answers: st.answers }).ok) { $("review-msg").textContent = t("reviewError"); return; }
    st.submitted = true;
    if (save()) render();
  });

  const resultLink = () => C.resultLink({ visit: st.visit, form: st.form, answers: st.answers });
  function renderDone() {
    show("s-done");
    const link = resultLink();
    $("done-visit").textContent = t("visit", { visit: C.formatVisitCode(st.visit) });
    drawQR($("qr-box"), link);
    $("qr-tap").setAttribute("aria-label", t("qrFullAria"));
    $("done-code").textContent = C.toTyped({ visit: st.visit, form: st.form, answers: st.answers });
    $("done-link").textContent = link;
  }
  function copyLink() {
    const text = $("done-link").textContent, btn = $("done-copy");
    const ok = () => { btn.textContent = t("doneCopied"); setTimeout(() => { btn.textContent = t("doneCopy"); }, 1500); };
    const select = () => { const r = document.createRange(); r.selectNodeContents($("done-link")); getSelection().removeAllRanges(); getSelection().addRange(r); };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(ok, select);
    else select();
  }
  $("done-copy").addEventListener("click", copyLink);
  $("done-send").addEventListener("click", () => {
    if (!navigator.share) return copyLink();
    navigator.share({ text: t("msgSend", { visit: C.formatVisitCode(st.visit), link: resultLink() }) }).catch(() => {});
  });

  // ---------- QR codes (vendor/qrcode-generator, error correction M, 4-module quiet zone) ----------
  // A PNG, not inline SVG: a phone's forced dark mode recolours SVG fills but leaves pictures alone.
  function drawQR(box, text) {
    box.textContent = "";
    const q = qrcode(0, "M");
    q.addData(text); q.make();
    const n = q.getModuleCount(), size = n + 8, k = Math.max(4, Math.ceil(640 / size));
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size * k;
    const g = canvas.getContext("2d");
    g.fillStyle = "#FFFFFF"; g.fillRect(0, 0, size * k, size * k);
    g.fillStyle = "#000000";
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (q.isDark(y, x)) g.fillRect((x + 4) * k, (y + 4) * k, k, k);
    const img = document.createElement("img");
    img.src = canvas.toDataURL("image/png"); img.alt = t("doneQrLabel");
    img.width = img.height = size * k;
    box.append(img);
  }
  // Full view: one history entry with the same address, so Back closes it without reloading.
  // The screen is kept on while it shows, where the phone allows it.
  let wakeLock = null;
  function openFull() {
    drawQR($("qr-full-box"), resultLink());
    $("qr-full").setAttribute("aria-label", t("doneQrLabel"));
    $("qr-full").hidden = false;
    history.pushState({ qrFull: 1 }, "", location.href);
    $("qr-close").focus();
    if (navigator.wakeLock) navigator.wakeLock.request("screen").then(l => { if ($("qr-full").hidden) l.release(); else wakeLock = l; }, () => {});
  }
  function closeFull() {
    if ($("qr-full").hidden) return;
    $("qr-full").hidden = true;
    $("qr-full-box").textContent = "";
    if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
    $("qr-tap").focus();
  }
  function leaveFull() { if (history.state && history.state.qrFull) history.back(); else closeFull(); }
  $("qr-tap").addEventListener("click", openFull);
  $("qr-close").addEventListener("click", leaveFull);
  addEventListener("keydown", e => { if (e.key === "Escape" && !$("qr-full").hidden) leaveFull(); });
  addEventListener("popstate", closeFull);

  $("clear-all").addEventListener("click", () => {
    if (!confirm(t("clearConfirm"))) return;
    try { localStorage.removeItem(STORE); } catch (e) { /* nothing stored */ }
    clearTimeout(advance);
    st = null; returnToReview = false; pick = null;
    history.replaceState(null, "", location.pathname);
    $("code-in").value = "";
    $("top-msg").textContent = t("cleared");
    render();
  });

  // ---------- entry from the address ----------
  // A results link stores nothing and shows no answers; anything else damaged gets decode's message.
  function fromHash() {
    $("top-msg").textContent = "";
    clearTimeout(advance);
    st = null;
    $("clinic-link").hidden = true;
    if (location.hash.length > 1) {
      try {
        const d = C.decode(location.hash);
        if (d.type === "invite") return begin(d.value.visit, d.value.form);
        // A clinician's device (PIN already entered here): open the clinic report straight away.
        let clinician = false;
        try { clinician = localStorage.getItem("peds-tools-clinician") === "1"; } catch (e) { /* storage off */ }
        if (clinician) { location.replace("clinic.html" + location.hash); return; }
        $("top-msg").textContent = t("resultLinkNote");
        $("clinic-link").href = "clinic.html" + location.hash;
        $("clinic-link").hidden = false;
      } catch (e) { $("top-msg").textContent = e.message; }
    }
    render();
  }

  $("attr").textContent = F.ATTRIBUTION;
  addEventListener("hashchange", fromHash);
  loadAll(); // run the 29-day clear
  fromHash();
  if (window.PedsShared) window.PedsShared.init();
})();
