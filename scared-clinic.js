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
    const rows = [{ label: "Total", indicates: S.RULES.total.indicates, cutoff: S.RULES.total.cutoff, max: rep.totalMax, pick: res => res.total }]
      .concat(S.RULES.subscales.map((s, i) => ({ label: s.label, indicates: s.indicates, cutoff: s.cutoff, max: s.items.length * 2, pick: res => res.subscales[i] })));
    const tb = el("table");
    tb.append(head);
    rows.forEach(r => {
      const tr = el("tr"), name = el("td");
      name.append(el("strong", null, r.label), el("br"), el("span", "legend", r.indicates));
      tr.append(name, el("td", "v", r.cutoff + " or more"));
      forms.forEach(f => {
        if (!f) return tr.append(el("td", "v", "–"));
        if (!f.result) return tr.append(el("td", "v", "could not be read"));
        const x = r.pick(f.result), at = x.sum >= r.cutoff;
        tr.append(el("td", "v" + (at ? " pos" : ""), x.sum + "/" + r.max + (at ? " at or above" : "")));
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

  $("scared-attr").textContent = "SCARED: " + F.ATTRIBUTION;

  window.PedsScaredClinic = Object.freeze({
    take: take,
    active: () => !!state,
    visit: () => state && state.visit,
    clear: () => { state = null; render(); },
    connect: hooks => { onReport = hooks.onReport; }
  });
})();
