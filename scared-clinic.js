/* SCARED results on the clinic page (clinic.html), behind the clinician PIN.
   The clinic script sends every SCARED link, QR or typed code here (PedsScaredCodes.isScared).
   One visit at a time: a parent and a child result side by side, total and five subscales, no combined
   score, and a plain note for Epic. Nothing is stored: the results live in this tab only.
   Chart note: .claude/chart/2026-11-05-scared-clinic.md (notes repo). */
(function () {
  "use strict";

  const C = window.PedsScaredCodes, R = window.PedsScaredReport, S = window.PedsScared, F = window.PedsScaredForms;
  const $ = id => document.getElementById(id);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };

  let state = null; // { visit, parent: { answers } | null, child: { answers } | null }
  let onReport = () => {};

  // text: a link or typed code; typedVisit: the visit code field, used for typed codes before any result is in.
  function take(text, typedVisit) {
    let visit = state ? state.visit : null;
    if (!visit && String(typedVisit || "").trim() && text.indexOf("#") < 0) {
      try { visit = C.parseVisitCode(typedVisit); } catch (e) { return e.message; }
    }
    let d;
    try { d = C.decode(text, visit); } catch (e) { return e.message; }
    // Never replace a visit code the user typed: a code for another visit is refused, not adopted.
    if (!state && visit && d.value.visit !== visit) {
      return "Visit codes don't match: " + C.formatVisitCode(visit) + " vs " + C.formatVisitCode(d.value.visit) + ". Nothing was added.";
    }
    const m = R.add(state, d);
    if (m.ok) { state = m.state; render(); onReport(); }
    return m.message;
  }

  function render() {
    $("s-report").hidden = !state;
    $("scared-attr").hidden = !state;
    if (!state) return;
    const rep = R.build(state);
    $("s-visit").textContent = rep.visitShown;
    $("s-note").textContent = R.noteText(rep);
    $("s-missing").hidden = !rep.missing.length;
    $("s-missing").textContent = "Missing: " + rep.missing.map(f => f === "parent" ? "Parent" : "Child").join(", ") + " (not returned).";

    // Side by side: one row per scale, one column per form. No combined score.
    const forms = ["parent", "child"].map(id => rep.forms.find(f => f.form === id));
    const head = el("tr");
    head.append(el("th", null, "Scale"), el("th", null, "Cutoff"), el("th", null, "Parent"), el("th", null, "Child"));
    const rows = [{ label: "Total", indicates: S.RULES.total.indicates, cutoff: S.RULES.total.cutoff, pick: res => Object.assign({ max: rep.totalMax }, res.total) }]
      .concat(S.RULES.subscales.map((s, i) => ({ label: s.label, indicates: s.indicates, cutoff: s.cutoff, pick: res => res.subscales[i] })));
    const tb = el("table");
    tb.append(head);
    rows.forEach(r => {
      const tr = el("tr"), name = el("td");
      name.append(el("strong", null, r.label), el("br"), el("span", "legend", r.indicates));
      tr.append(name, el("td", "v", r.cutoff + " or more"));
      forms.forEach(f => {
        if (!f) return tr.append(el("td", "v", "–"));
        if (!f.result) return tr.append(el("td", "v", "could not be read"));
        // max and atOrAbove come from score() (the total's max from the report).
        const x = r.pick(f.result), at = x.atOrAbove;
        tr.append(el("td", "v" + (at ? " pos" : ""), x.sum + "/" + x.max + (at ? " at or above" : "")));
      });
      tb.append(tr);
    });
    const box = el("div", "table-box");
    box.append(tb);
    const scales = $("s-scales");
    scales.textContent = "";
    scales.append(box, el("p", "legend", S.RULES.total.moreSpecificNote));

    const it = el("table"), ih = el("tr");
    ih.append(el("th", null, "#"), el("th", null, "Item (child form wording)"), el("th", null, "Parent"), el("th", null, "Child"));
    it.append(ih);
    R.itemRows(rep).forEach(row => {
      const tr = el("tr");
      tr.append(el("td", "n", String(row.n)), el("td", null, row.text));
      row.values.forEach(v => tr.append(el("td", "v" + (v === 2 ? " pos" : ""), v === null ? "–" : String(v))));
      it.append(tr);
    });
    const ibox = el("div", "table-box");
    ibox.append(it);
    $("s-items").textContent = "";
    $("s-items").append(ibox);
  }

  $("s-copy").addEventListener("click", () => {
    const text = $("s-note").textContent, b = $("s-copy");
    const ok = () => { b.textContent = "Copied"; setTimeout(() => { b.textContent = "Copy for Epic"; }, 1500); };
    const select = () => { const r = document.createRange(); r.selectNodeContents($("s-note")); getSelection().removeAllRanges(); getSelection().addRange(r); };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(ok, select);
    else select();
  });

  // ---------- printable handouts (case 5): one page per family, a new visit code, parent and child QR codes ----------
  // The page is cleared after printing by the clinic script's afterprint handler, so no code is kept.
  function qrSvg(text, label) {
    const q = window.qrcode(0, "M");
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
    return svg;
  }
  // Claude's wording, for the owner's review.
  const STEPS = [
    "Scan the Parent code with your phone camera and answer the questions.",
    "Have your child scan the Child code (on your phone or theirs) and answer the questions.",
    "When each form is done, show its QR code at the visit, or tap Send and paste it into a MyChart message."
  ];
  function buildHandouts(count) {
    const box = $("handouts"), used = new Set();
    box.textContent = "";
    while (used.size < count) used.add(C.newVisitCode());
    used.forEach(visit => {
      const shown = C.formatVisitCode(visit), page = el("section", "handout with-strips");
      page.dataset.visit = visit;
      page.append(el("h2", null, F.FORMS.parent.title), el("p", "h-code", shown));
      const ol = el("ol");
      STEPS.forEach(s => ol.append(el("li", null, s)));
      const row = el("div", "h-strips");
      ["parent", "child"].forEach(form => {
        const strip = el("div", "h-strip"), qr = el("div", "h-qr");
        strip.dataset.form = form;
        const name = form === "parent" ? "Parent" : "Child";
        qr.append(qrSvg(C.inviteLink({ visit: visit, form: form }), "QR code for the " + name.toLowerCase() + " form, visit " + shown));
        strip.append(el("p", "h-strip-title", name), qr, el("p", "h-strip-text", F.FORMS[form].fillBy));
        row.append(strip);
      });
      page.append(ol, row,
        el("p", "h-note", F.FORMS.child.note),
        el("p", "h-note", "No names or birthdays are asked. Do not include names or other identifying details. Answers stay on the phone until they are sent."),
        el("p", "h-stub", "For the chart: visit code " + shown + " (staff, please write this in the chart)."));
      box.append(page);
    });
  }
  $("sh-print").addEventListener("click", () => {
    const n = Math.max(1, Math.min(50, Math.round(Number($("sh-count").value)) || 1));
    $("sh-count").value = n;
    buildHandouts(n);
    document.body.classList.add("print-handouts");
    window.print();
  });

  $("scared-attr").textContent = "SCARED: " + F.ATTRIBUTION;

  window.PedsScaredClinic = Object.freeze({
    take: take,
    active: () => !!state,
    visit: () => state && state.visit,
    clear: () => { state = null; render(); },
    connect: hooks => { onReport = hooks.onReport; }
  });
})();
