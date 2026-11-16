/* OS-CBS results on the clinic page (clinic.html), behind the clinician PIN.
   The clinic script sends every OS-CBS link, QR or typed code here (PedsOscbsCodes.isOscbs).
   One visit at a time: a parent/caregiver and a teacher result side by side, total and five subscales
   (raw sum, range, workbook item mean), the safety-flag list, an item table and a plain note for Epic.
   No cutoffs, bands or interpretive text (owner, 2026-11-16). Nothing is stored: results live in this tab only.
   Chart note: .claude/chart/2026-11-16-oscbs.md (notes repo). */
(function () {
  "use strict";

  const C = window.PedsOscbsCodes, R = window.PedsOscbsReport, S = window.PedsOscbs, F = window.PedsOscbsForms;
  const $ = id => document.getElementById(id);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  const NAMES = window.PedsOscbsNote.formNames;
  // Column headings may wrap after the slash ("Parent/ caregiver"), so the item column keeps its width on phones.
  const HEAD = id => NAMES[id].replace("/", "/\u200B"); // zero-width space: a line-break chance

  let state = null; // { visit, parent: { day, answers } | null, teacher: { day, answers } | null }
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
    $("o-report").hidden = !state;
    $("oscbs-attr").hidden = !state;
    if (!state) return;
    const rep = R.build(state);
    $("o-visit").textContent = rep.visitShown;
    $("o-note").textContent = R.noteText(rep);
    $("o-missing").hidden = !rep.missing.length;
    $("o-missing").textContent = "Missing: " + rep.missing.map(f => NAMES[f]).join(", ") + " (not returned).";

    // Side by side: one row per scale, one column per respondent. Sum and workbook mean only; no labels.
    const forms = C.TABLE.forms.map(id => rep.forms.find(f => f.form === id));
    const tb = el("table"), head = el("tr");
    head.append(el("th", null, "Scale"), el("th", null, "Range"));
    C.TABLE.forms.forEach(id => head.append(el("th", null, HEAD(id))));
    tb.append(head);
    const date = el("tr");
    date.append(el("td", null, "Completed (device date)"), el("td", "v", ""));
    forms.forEach(f => date.append(el("td", "v", f ? (f.date || "unknown") : "–")));
    tb.append(date);
    const defs = [S.RULES.total].concat(S.RULES.subscales);
    defs.forEach((def, i) => {
      const tr = el("tr"), name = el("td");
      name.append(el("strong", null, def.label), el("br"), el("span", "legend", "items " + def.items[0] + "-" + def.items[def.items.length - 1]));
      tr.append(name, el("td", "v", def.items.length + "-" + def.items.length * 5));
      forms.forEach(f => {
        if (!f) return tr.append(el("td", "v", "–"));
        if (!f.result) return tr.append(el("td", "v", "could not be read"));
        const x = i === 0 ? f.result.total : f.result.subscales[i - 1];
        const td = el("td", "v");
        td.append(el("span", null, String(x.sum)), el("br"), el("span", "legend", "mean " + x.mean.toFixed(2)));
        tr.append(td);
      });
      tb.append(tr);
    });
    const box = el("div", "table-box");
    box.append(tb);
    const scales = $("o-scales");
    scales.textContent = "";
    scales.append(box, el("p", "legend", "Sum of answers 1-5. Mean: item mean on 0-4, as in the official OS-CBS scoring workbook (each answer minus 1, then averaged), so scales of different length can be compared. No validated cutoffs."));

    // Safety flags (owner, 2026-11-16): neutral label, one list per respondent.
    const fl = $("o-flags");
    fl.textContent = "";
    const fbox = el("div", "flagbox");
    fbox.append(el("h3", null, S.FLAGS.label));
    const ul = el("ul");
    forms.forEach((f, i) => {
      const who = NAMES[C.TABLE.forms[i]];
      if (!f || !f.result) return;
      if (!f.result.flags.length) { ul.append(el("li", null, who + ": none")); return; }
      f.result.flags.forEach(x => {
        const it = F.FORM.items[x.n - 1];
        ul.append(el("li", null, who + ": item " + x.n + ", " + it.text + " (" + R.answerLabel(x.value) + ", " + x.value + ")"));
      });
    });
    fbox.append(ul);
    fl.append(fbox);

    const it = el("table"), ih = el("tr");
    ih.append(el("th", null, "#"), el("th", null, "Item"));
    C.TABLE.forms.forEach(id => ih.append(el("th", null, HEAD(id))));
    it.append(ih);
    R.itemRows(rep).forEach(row => {
      const tr = el("tr");
      tr.append(el("td", "n", String(row.n)), el("td", null, row.text));
      row.values.forEach(v => {
        const td = el("td", "v" + (v.flagged ? " flag" : ""), v.value === null ? "–" : String(v.value) + (v.flagged ? " (flag)" : ""));
        if (v.label) td.title = v.label;
        tr.append(td);
      });
      it.append(tr);
    });
    const ibox = el("div", "table-box");
    ibox.append(it);
    $("o-items").textContent = "";
    $("o-items").append(ibox);
  }

  $("o-copy").addEventListener("click", () => {
    const text = $("o-note").textContent, b = $("o-copy");
    const ok = () => { b.textContent = "Copied"; setTimeout(() => { b.textContent = "Copy for Epic"; }, 1500); };
    const select = () => { const r = document.createRange(); r.selectNodeContents($("o-note")); getSelection().removeAllRanges(); getSelection().addRange(r); };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(ok, select);
    else select();
  });

  // ---------- printable handouts: one page per family, a new visit code, parent/caregiver and teacher QR codes ----------
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
    "Parent or caregiver: scan the Parent/caregiver code with your phone camera and answer the questions about your child.",
    "If the clinic asked for a teacher's answers too, give the teacher this page (or a photo of the Teacher code).",
    "When each form is done, show its QR code at the visit, or tap Send and paste it into a MyChart message."
  ];
  const STRIP_TEXT = {
    parent: "For a parent or caregiver of a child or teen aged 2 to 17.",
    teacher: "For the child's teacher. Scan with your phone camera and answer the questions about this student."
  };
  function buildHandouts(count) {
    const box = $("handouts"), used = new Set();
    box.textContent = "";
    while (used.size < count) used.add(C.newVisitCode());
    used.forEach(visit => {
      const shown = C.formatVisitCode(visit), page = el("section", "handout with-strips");
      page.dataset.visit = visit;
      page.append(el("h2", null, F.FORM.title), el("p", "h-code", shown));
      const ol = el("ol");
      STEPS.forEach(s => ol.append(el("li", null, s)));
      const row = el("div", "h-strips");
      C.TABLE.forms.forEach(form => {
        const strip = el("div", "h-strip"), qr = el("div", "h-qr");
        strip.dataset.form = form;
        qr.append(qrSvg(C.inviteLink({ visit: visit, form: form }), "QR code for the " + NAMES[form].toLowerCase() + " form, visit " + shown));
        strip.append(el("p", "h-strip-title", NAMES[form]), qr, el("p", "h-strip-text", STRIP_TEXT[form]));
        row.append(strip);
      });
      page.append(ol, row,
        el("p", "h-note", "No names or birthdays are asked. Do not include names or other identifying details. Answers stay on the phone until they are sent."),
        el("p", "h-stub", "For the chart: visit code " + shown + " (staff, please write this in the chart)."));
      box.append(page);
    });
  }
  $("oh-print").addEventListener("click", () => {
    const n = Math.max(1, Math.min(50, Math.round(Number($("oh-count").value)) || 1));
    $("oh-count").value = n;
    buildHandouts(n);
    document.body.classList.add("print-handouts");
    window.print();
  });

  $("o-disclaimer").textContent = F.DISCLAIMER;
  $("o-citation").textContent = F.CITATION;
  $("oscbs-attr").textContent = F.CITATION; // already starts with "OS-CBS version 220309."

  window.PedsOscbsClinic = Object.freeze({
    take: take,
    active: () => !!state,
    visit: () => state && state.visit,
    clear: () => { state = null; render(); },
    connect: hooks => { onReport = hooks.onReport; }
  });
})();
