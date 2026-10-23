/* Pediatric Tools: the Vanderbilt form page (index.html on adhd-forms.github.io), for parents and teachers.
   One question per screen, a review screen, then the result as a typed code and a link.
   Answers are kept only in this browser (localStorage, cleared after 90 days or with one button)
   and in links after "#". Nothing is sent to a server. No scores are shown here.
   Chart note: .claude/chart/2026-10-22-vanderbilt-form-pages.md (notes repo). */
(function () {
  "use strict";

  const F = window.PedsVanderbiltForms, C = window.PedsVanderbiltCodes, S = window.PedsVanderbilt;
  const STR = window.PedsVanderbiltStrings || {};
  const LANG = "en";
  const STORE = "peds-tools-vanderbilt-draft";
  const MAX_AGE = 90 * 24 * 60 * 60 * 1000; // 90 days (owner's spec)
  const $ = id => document.getElementById(id);

  function t(key, vars) {
    let s = (STR[LANG] && STR[LANG][key]) || (STR.en && STR.en[key]) || key;
    Object.keys(vars || {}).forEach(k => { s = s.split("{" + k + "}").join(vars[k]); });
    return s;
  }
  document.querySelectorAll("[data-t]").forEach(el => { el.textContent = t(el.dataset.t); });

  // ---------- storage (every access guarded: the page works without it) ----------
  // Two stores: drafts (one per visit and rater) and packets (one per visit, on the parent's phone).
  // savedAt is local only, for the 90-day clear; it never goes into a link.
  const PSTORE = "peds-tools-vanderbilt-packets";
  function loadStore(key) {
    try {
      const all = JSON.parse(localStorage.getItem(key) || "{}");
      const now = Date.now();
      let changed = false;
      Object.keys(all).forEach(k => {
        if (!all[k] || typeof all[k].savedAt !== "number" || now - all[k].savedAt > MAX_AGE) { delete all[k]; changed = true; }
      });
      if (changed) localStorage.setItem(key, JSON.stringify(all));
      return all;
    } catch (e) { return {}; }
  }
  const loadAll = () => loadStore(STORE);
  function getPacket(visit) {
    const p = loadStore(PSTORE)[visit];
    if (!p) return null;
    delete p.savedAt;
    return p;
  }
  function putPacket(p) {
    try {
      const all = loadStore(PSTORE);
      all[p.visit] = Object.assign({}, p, { savedAt: Date.now() });
      localStorage.setItem(PSTORE, JSON.stringify(all));
    } catch (e) { /* storage off */ }
  }
  function save() {
    if (!st) return;
    try {
      const all = loadAll();
      all[st.visit + ":" + st.slot] = Object.assign({}, st, { savedAt: Date.now() });
      localStorage.setItem(STORE, JSON.stringify(all));
    } catch (e) { /* storage off: keep going */ }
  }

  // ---------- state ----------
  let st = null;        // { visit, kind, slot, step, answers, sideEffects, medication, teacherRole, timeKnown, submitted }
  let returnToReview = false;
  let advance = null;   // pending auto-advance after an answer; Back and Skip cancel it
  const formOf = () => F.FORMS[C.formId(st.slot, st.kind)];
  function steps() {
    const list = formOf().items.map(it => ({ item: it }));
    if (st.kind === "followup") F.SIDE_EFFECTS.forEach((text, i) => list.push({ se: i, text: text }));
    return list;
  }
  function answerOf(s) { return s.item ? st.answers[s.item.n] : st.sideEffects[s.se]; }
  function setAnswer(s, v) { if (s.item) st.answers[s.item.n] = v; else st.sideEffects[s.se] = v; }

  function begin(visit, kind, slot) {
    $("top-msg").textContent = "";
    const saved = loadAll()[visit + ":" + slot];
    if (saved && saved.kind === kind) st = saved;
    else {
      st = { visit: visit, kind: kind, slot: slot, step: "setup", answers: {}, medication: null, teacherRole: null, timeKnown: null, submitted: false,
        sideEffects: kind === "followup" ? Array(F.SIDE_EFFECTS.length).fill(null) : null };
      formOf().items.forEach(it => { st.answers[it.n] = null; });
    }
    delete st.savedAt;
    // Keep the visit in the address (after "#", never sent anywhere) so a reload resumes it.
    const frag = C.toLink(C.encodeInvite({ visit: visit, kind: kind, slot: slot })).split("#")[1];
    if (location.hash.slice(1) !== frag) history.replaceState(null, "", "#" + frag);
    showFooter();
    render();
  }

  // ---------- screens ----------
  let packetVisit = null; // set while the packet screen is shown
  function show(id) {
    ["s-start", "s-setup", "s-question", "s-review", "s-done", "s-packet"].forEach(s => { $(s).hidden = s !== id; });
    $("share-panel").hidden = true;
    $("result-box").hidden = true;
  }
  function render() {
    if (packetVisit) return renderPacket();
    if (!st) return renderStart();
    if (st.submitted) {
      // A parent's finished form on the phone that holds the packet: show the packet.
      const p = st.slot[0] === "P" && getPacket(st.visit);
      if (p && p.raters[st.slot]) return openPacket(st.visit);
      return renderDone();
    }
    if (st.step === "setup") return renderSetup();
    if (st.step === "review") return renderReview();
    renderQuestion(st.step);
  }

  function pills(box, name, options, current, onPick) {
    box.querySelectorAll("input, label").forEach(e => e.remove());
    options.forEach((o, i) => {
      const id = name + "-" + i;
      const input = document.createElement("input");
      input.type = "radio"; input.name = name; input.id = id; input.checked = current === o.id;
      input.addEventListener("change", () => onPick(o.id));
      const label = document.createElement("label");
      label.htmlFor = id; label.textContent = o.label;
      box.append(input, label);
    });
  }

  let pick = { kind: "initial", slot: "P1" };
  function renderStart() {
    show("s-start");
    pills($("kind-pick"), "kind", [{ id: "initial", label: t("kindInitial") }, { id: "followup", label: t("kindFollowup") }], pick.kind, v => { pick.kind = v; });
    pills($("who-pick"), "who", [{ id: "P1", label: t("slotP1") }, { id: "P2", label: t("slotP2") }], pick.slot, v => { pick.slot = v; });
  }
  $("start-go").addEventListener("click", () => {
    let visit;
    try { visit = C.parseVisitCode($("code-in").value); } catch (e) { $("start-msg").textContent = e.message; return; }
    $("start-msg").textContent = "";
    begin(visit, pick.kind, pick.slot);
  });

  function renderSetup() {
    show("s-setup");
    const form = formOf(), teacher = st.slot[0] === "T";
    $("setup-who").textContent = t("setupWho", { who: t("slot" + st.slot), kind: t(st.kind === "initial" ? "kindInitial" : "kindFollowup"), visit: C.formatVisitCode(st.visit) });
    $("setup-title").textContent = form.title;
    // Teachers: the printed blank for weeks or months is answered by the choice below (directionsNote).
    $("setup-directions").textContent = form.directions.replace(/\s*_+\.$/, "");
    $("teacher-setup").hidden = !teacher;
    if (teacher) {
      pills($("role-pick"), "role", F.TEACHER_ROLES, st.teacherRole, v => { st.teacherRole = v; save(); });
      pills($("time-pick"), "time", F.TIME_KNOWN, st.timeKnown, v => { st.timeKnown = v; save(); });
    }
    $("med-legend").textContent = t("setupMedQuestion", { lead: F.MEDICATION_QUESTION }) + " (" + t("setupMedOptional") + ")";
    pills($("med-pick"), "med", F.MEDICATION, st.medication, v => { st.medication = v; save(); });
    // A parent on the phone that holds this visit's packet can go back to it (owner, 2026-10-22).
    $("setup-back").hidden = !(st.slot[0] === "P" && getPacket(st.visit));
  }
  $("setup-back").addEventListener("click", () => { const v = st.visit; st = null; openPacket(v); });
  $("setup-go").addEventListener("click", () => {
    if (st.slot[0] === "T" && (!st.teacherRole || !st.timeKnown)) { $("setup-msg").textContent = t("setupNeedTeacher"); return; }
    $("setup-msg").textContent = "";
    st.step = 0; save(); render();
  });

  function sectionFor(s) {
    if (s.se !== undefined) return t("sectionSideEffects") + ": " + formOf().sideEffects.question + " " + formOf().sideEffects.scaleQuestion;
    if (s.item.type === "perf") return s.item.group || t("sectionPerformance");
    return t("sectionSymptoms");
  }
  function scaleFor(s) {
    if (s.se !== undefined) return F.SCALES.sideEffect;
    return s.item.type === "perf" ? F.SCALES.perf : F.SCALES.symptom;
  }
  function renderQuestion(i) {
    show("s-question");
    const list = steps(), s = list[i];
    $("bar").style.width = Math.round(i / list.length * 100) + "%";
    $("progress").textContent = t("progress", { n: i + 1, total: list.length });
    $("section-line").textContent = sectionFor(s);
    $("qtext").textContent = s.item ? s.item.n + ". " + s.item.text : s.text;
    const box = $("answers");
    box.textContent = "";
    scaleFor(s).forEach(o => {
      const b = document.createElement("button");
      b.type = "button"; b.textContent = o.label;
      if (answerOf(s) === o.value) b.classList.add("picked");
      b.addEventListener("click", () => {
        setAnswer(s, o.value); save();
        box.querySelectorAll("button").forEach(x => x.classList.toggle("picked", x === b));
        const wait = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 150;
        clearTimeout(advance);
        advance = setTimeout(() => next(i), wait);
      });
      box.append(b);
    });
    $("qtext").focus();
  }
  function next(i) {
    if (returnToReview || i + 1 >= steps().length) { returnToReview = false; st.step = "review"; }
    else st.step = i + 1;
    save(); render();
  }
  $("q-skip").addEventListener("click", () => { clearTimeout(advance); const i = st.step; setAnswer(steps()[i], null); next(i); });
  $("q-back").addEventListener("click", () => {
    clearTimeout(advance);
    returnToReview = false;
    st.step = st.step === 0 ? "setup" : st.step - 1;
    save(); render();
  });

  function labelFor(s, v) { const o = scaleFor(s).find(x => x.value === v); return o ? o.label : t("reviewSkippedRow"); }
  function renderReview() {
    show("s-review");
    const list = steps(), skipped = list.filter(s => answerOf(s) === null).length;
    const head = $("review-head");
    head.textContent = skipped ? t("reviewSkipped", { n: skipped, total: list.length }) : t("reviewAllDone", { total: list.length });
    head.classList.toggle("warn", skipped > 0);
    const ul = $("review-list");
    ul.textContent = "";
    list.forEach((s, i) => {
      const li = document.createElement("li"), b = document.createElement("button");
      b.type = "button";
      if (answerOf(s) === null) b.classList.add("skipped");
      const n = document.createElement("span"); n.className = "n"; n.textContent = s.item ? s.item.n : "·";
      const q = document.createElement("span"); q.textContent = s.item ? s.item.text : s.text;
      const a = document.createElement("span"); a.className = "a"; a.textContent = labelFor(s, answerOf(s));
      b.append(n, q, a);
      b.addEventListener("click", () => { returnToReview = true; st.step = i; save(); render(); });
      li.append(b); ul.append(li);
    });
  }
  $("review-submit").addEventListener("click", () => {
    const skipped = steps().filter(s => answerOf(s) === null).length;
    if (skipped && !confirm(t("reviewConfirmSkipped", { n: skipped }))) return;
    // Never show a code for answers the scoring would reject.
    const sc = S.score(C.formId(st.slot, st.kind), { answers: st.answers, sideEffects: st.sideEffects, medication: st.medication });
    if (!sc.ok) { $("review-msg").textContent = t("reviewError"); return; }
    $("review-msg").textContent = "";
    st.submitted = true; save();
    // A parent on the phone that holds the packet: add the result to it. Parent 1 starts the packet;
    // a second parent on their own phone (no packet here) gets the done screen to send it back.
    if (st.slot[0] === "P" && (st.slot === "P1" || getPacket(st.visit))) {
      const p = getPacket(st.visit) || { visit: st.visit, kind: st.kind, sent: [], raters: {} };
      const m = C.merge(p, resultObject());
      if (m.ok) { putPacket(m.packet); return openPacket(st.visit, m.message); }
      $("top-msg").textContent = m.message;
    }
    render();
  });
  function resultObject() {
    return { visit: st.visit, kind: st.kind, slot: st.slot, teacherRole: st.teacherRole, timeKnown: st.timeKnown,
      medication: st.medication, answers: st.answers, sideEffects: st.sideEffects };
  }

  function resultBytes() { return C.encodeResult(resultObject()); }
  function renderDone() {
    show("s-done");
    const bytes = resultBytes();
    $("done-visit").textContent = t("doneVisit", { visit: C.formatVisitCode(st.visit) });
    $("done-code").textContent = C.toTyped(bytes);
    $("done-link").textContent = C.toLink(bytes);
  }
  $("done-copy").addEventListener("click", () => {
    const text = $("done-link").textContent;
    const ok = () => { $("done-copy").textContent = t("doneCopied"); setTimeout(() => { $("done-copy").textContent = t("doneCopy"); }, 1500); };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(ok, () => selectLink());
    else selectLink();
  });
  function selectLink(id) { const r = document.createRange(); r.selectNodeContents($(id || "done-link")); getSelection().removeAllRanges(); getSelection().addRange(r); }

  // Teacher (or a parent on their own phone): send the result back, or print it.
  $("done-send").addEventListener("click", () => {
    const link = C.toLink(resultBytes());
    shareText(t("msgToParent", { visit: C.formatVisitCode(st.visit), link: link }), link);
  });
  $("done-print").addEventListener("click", () => {
    const bytes = resultBytes();
    drawQR($("print-qr"), C.toLink(bytes), t("doneQrLabel"));
    $("print-code").textContent = C.toTyped(bytes);
    $("print-visit").textContent = t("doneVisit", { visit: C.formatVisitCode(st.visit) });
    document.body.classList.add("print-result");
    window.print();
  });
  addEventListener("afterprint", () => document.body.classList.remove("print-result"));

  // ---------- QR codes (vendor/qrcode-generator, error correction M, 4-module quiet zone) ----------
  function drawQR(box, text, label) {
    const q = qrcode(0, "M");
    q.addData(text); q.make();
    const n = q.getModuleCount(), size = n + 8, NS = "http://www.w3.org/2000/svg";
    let d = "";
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (q.isDark(y, x)) d += "M" + (x + 4) + " " + (y + 4) + "h1v1h-1z";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 " + size + " " + size);
    svg.setAttribute("role", "img"); svg.setAttribute("aria-label", label);
    const bg = document.createElementNS(NS, "rect");
    bg.setAttribute("width", size); bg.setAttribute("height", size); bg.setAttribute("fill", "#FFFFFF");
    const path = document.createElementNS(NS, "path");
    path.setAttribute("d", d); path.setAttribute("fill", "#000000");
    svg.append(bg, path);
    box.textContent = ""; box.append(svg);
  }

  // Share sheet when the phone has one; otherwise the panel with a QR of the link and Copy.
  function shareText(text, link) {
    if (navigator.share) { navigator.share({ text: text }).catch(() => {}); return; }
    showPanel(text, link);
  }
  function showPanel(text, link) {
    drawQR($("qr-box"), link, t("doneQrLabel"));
    $("share-text").textContent = text;
    $("share-panel").hidden = false;
    $("share-panel").scrollIntoView({ block: "nearest" });
  }
  $("share-copy").addEventListener("click", () => {
    const text = $("share-text").textContent;
    const ok = () => { $("share-copy").textContent = t("doneCopied"); setTimeout(() => { $("share-copy").textContent = t("doneCopy"); }, 1500); };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(ok, () => selectLink("share-text"));
    else selectLink("share-text");
  });
  $("share-close").addEventListener("click", () => { $("share-panel").hidden = true; });

  // ---------- the parent's packet ----------
  const SLOTS = ["P1", "P2", "T1", "T2"];
  function packetLink(p) { return C.toLink(C.encodePacket(p)); }
  function openPacket(visit, message) {
    packetVisit = visit;
    history.replaceState(null, "", "#visit-" + visit); // only the visit code; the answers stay in storage
    render();
    $("top-msg").textContent = message || "";
    $("add-msg").textContent = "";
  }
  function renderPacket() {
    const p = getPacket(packetVisit);
    if (!p) { packetVisit = null; return render(); }
    show("s-packet");
    st = null; showFooterFor(p.kind, "P1");
    $("packet-intro").textContent = t("packetIntro", { visit: C.formatVisitCode(p.visit) });
    const ul = $("packet-rows");
    ul.textContent = "";
    SLOTS.forEach(slot => {
      const li = document.createElement("li"), who = document.createElement("span");
      who.className = "who";
      const r = p.raters[slot], sent = p.sent.indexOf(slot) >= 0, name = t("slot" + slot);
      const btn = (key, fn, primary) => { const b = document.createElement("button"); b.type = "button"; b.className = "btn" + (primary ? "" : " secondary"); b.textContent = t(key); b.addEventListener("click", fn); return b; };
      li.append(who);
      if (r) { who.textContent = t("rowDone", { who: C.raterLabel(r) }); who.classList.add("done"); }
      else {
        who.textContent = t(sent ? "rowWaiting" : "rowNotSent", { who: name });
        const invite = () => sendInvite(p, slot);
        if (slot[0] === "P") li.append(btn("fillHere", () => fillHere(p, slot), true), btn(sent ? "resend" : "sendLink", invite));
        else li.append(btn(sent ? "resend" : "send", invite, !sent));
      }
      ul.append(li);
    });
  }
  function sendInvite(p, slot) {
    const link = C.toLink(C.encodeInvite({ visit: p.visit, kind: p.kind, slot: slot }));
    if (p.sent.indexOf(slot) < 0) { p.sent.push(slot); putPacket(p); }
    renderPacket();
    shareText(t(slot[0] === "T" ? "msgTeacher" : "msgParent2", { link: link }), link);
  }
  function fillHere(p, slot) {
    packetVisit = null;
    begin(p.visit, p.kind, slot);
  }
  $("packet-doctor").addEventListener("click", () => {
    const p = getPacket(packetVisit), link = packetLink(p);
    const text = t("msgDoctor", { visit: C.formatVisitCode(p.visit), link: link });
    const steps = $("doctor-steps");
    const done = () => { steps.textContent = t("doctorSteps"); steps.hidden = false; };
    const fallback = () => { steps.textContent = t("copyFallback"); steps.hidden = false; showPanel(text, link); };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, fallback);
    else fallback();
  });
  $("packet-show").addEventListener("click", () => {
    const link = packetLink(getPacket(packetVisit));
    drawQR($("qr-box"), link, t("packetQrLabel"));
    $("share-text").textContent = link;
    $("share-panel").hidden = false;
    $("share-panel").scrollIntoView({ block: "nearest" });
  });
  // The answer shows right under the Add button (the top of the page is off-screen on a phone).
  $("add-go").addEventListener("click", () => {
    const say = text => { $("add-msg").textContent = text; };
    let d;
    try { d = C.decode($("add-in").value); } catch (e) { return say(e.message); }
    if (d.type === "invite") return say(t("inviteNotResult"));
    const m = C.merge(getPacket(packetVisit), d.value);
    if (m.ok) { putPacket(m.packet); $("add-in").value = ""; renderPacket(); }
    say(m.message);
  });

  // A results link opened on a phone with no packet for that visit: the parent can start one here.
  let pendingItem = null;
  $("start-packet").addEventListener("click", () => {
    const it = pendingItem;
    const m = C.merge({ visit: it.visit, kind: it.kind, sent: [], raters: {} }, it);
    putPacket(m.packet);
    openPacket(it.visit, m.message);
  });

  $("clear-all").addEventListener("click", () => {
    if (!confirm(t("clearConfirm"))) return;
    try { localStorage.removeItem(STORE); localStorage.removeItem(PSTORE); } catch (e) { /* nothing stored */ }
    st = null; returnToReview = false; packetVisit = null; pendingItem = null;
    history.replaceState(null, "", location.pathname);
    $("top-msg").textContent = t("cleared");
    showFooter(); render();
  });

  // ---------- footer: printed attribution and the rater's disclaimer ----------
  function showFooterFor(kind, slot) {
    const A = F.ATTRIBUTION;
    $("attr").textContent = [A.copyright + ".", A.adaptedFrom, kind === "followup" ? A.sideEffectsFrom : ""].filter(Boolean).join(" ");
    $("disclaimer").textContent = slot && slot[0] === "T" ? A.disclaimer.teacher : A.disclaimer.parent;
  }
  function showFooter() { showFooterFor(st && st.kind, st && st.slot); }

  // ---------- entry from the address ----------
  function fromHash() {
    $("top-msg").textContent = "";
    const h = location.hash;
    st = null; packetVisit = null; pendingItem = null;
    const visitView = /^#visit-([0-9A-Z]{8})$/.exec(h);
    if (visitView) {
      if (getPacket(visitView[1])) return openPacket(visitView[1]);
      history.replaceState(null, "", location.pathname);
    } else if (h.length > 1) {
      try {
        const d = C.decode(h);
        if (d.type === "invite") return begin(d.value.visit, d.value.kind, d.value.slot);
        // A result or packet: add it to this phone's packet for that visit, if there is one.
        const p = getPacket(d.value.visit);
        if (p) {
          const m = C.merge(p, d.value);
          if (m.ok) putPacket(m.packet);
          return openPacket(p.visit, m.message);
        }
        // A clinician's device (PIN already entered here): open the clinic report straight away.
        let clinician = false;
        try { clinician = localStorage.getItem("peds-tools-clinician") === "1"; } catch (e) { /* storage off */ }
        if (clinician) { location.replace("clinic.html" + location.hash); return; }
        $("top-msg").textContent = t("resultLinkNote");
        $("clinic-link").href = "clinic.html" + location.hash;
        pendingItem = d.value;
        showFooter(); render();
        $("result-box").hidden = false;
        return;
      } catch (e) { $("top-msg").textContent = e.message; }
    }
    showFooter(); render();
  }
  addEventListener("hashchange", fromHash);
  loadAll(); // runs the 90-day clear
  fromHash();
  if (window.PedsShared) window.PedsShared.init();
})();
