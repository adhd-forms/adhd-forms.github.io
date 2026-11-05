/* SCARED clinic report: the report model and the Epic note for one visit (a parent and a child result).
   Pure functions, no page access, no storage. Every number and every "may indicate" phrase comes from
   scared-score.js (score() and RULES); the note wording comes from scared-note-template.js.
   No combined parent and child score, on purpose (owner, 2026-11-05).
   Load after scared-forms.js, scared-score.js, scared-codes.js and scared-note-template.js.
   Chart note: .claude/chart/2026-11-05-scared-clinic.md (notes repo). */
(function () {
  "use strict";

  const F = window.PedsScaredForms, S = window.PedsScared, C = window.PedsScaredCodes, NOTE = window.PedsScaredNote;
  const FORMS = ["parent", "child"];
  const TOTAL_MAX = C.TABLE.items * 2; // 41 items, answers 0 to 2

  // Adds one decoded link or typed code to the visit's results. The first result sets the visit;
  // a second result for the same form keeps the first.
  function add(state, d) {
    if (d.type === "invite") return { ok: false, state: state, message: "That is a link for filling in a form, not a result." };
    const v = d.value, label = NOTE.formNames[v.form];
    if (state && state.visit !== v.visit) {
      return { ok: false, state: state, message: "Visit codes don't match: " + C.formatVisitCode(state.visit) + " vs " + C.formatVisitCode(v.visit) + ". Nothing was added." };
    }
    const next = state ? Object.assign({}, state) : { visit: v.visit, parent: null, child: null };
    if (next[v.form]) return { ok: false, state: state, message: label + " results already added; kept the first one." };
    next[v.form] = { answers: Object.assign({}, v.answers) };
    return { ok: true, state: next, message: label + " results added." };
  }

  function build(state) {
    const forms = [], missing = [];
    FORMS.forEach(form => {
      const r = state[form];
      if (!r) { missing.push(form); return; }
      const res = S.score(form, { answers: r.answers });
      forms.push({ form: form, label: NOTE.formNames[form], answers: r.answers, result: res.ok ? res : null });
    });
    return { visit: state.visit, visitShown: C.formatVisitCode(state.visit), totalMax: TOTAL_MAX, forms: forms, missing: missing };
  }

  function fill(text, vars) {
    return text.replace(/\{(\w+)\}/g, (m, k) => {
      if (!Object.prototype.hasOwnProperty.call(vars, k)) throw new Error("SCARED note: no value for {" + k + "}");
      return String(vars[k]);
    });
  }
  // At or above the cutoff is decided by score() alone (owner, 2026-11-05).
  function status(atOrAbove, cutoff) { return fill(atOrAbove ? NOTE.statusAtOrAbove : NOTE.statusBelow, { cutoff: cutoff }); }

  function noteText(report) {
    const lines = [fill(NOTE.header, { visit: report.visitShown })];
    FORMS.forEach(form => {
      const name = NOTE.formNames[form], f = report.forms.find(x => x.form === form);
      if (!f) { lines.push(fill(NOTE.notReturned, { form: name })); return; }
      if (!f.result) { lines.push(fill(NOTE.unreadable, { form: name })); return; }
      const t = f.result.total;
      let st = status(t.atOrAbove, t.cutoff);
      if (t.moreSpecific) st += fill(NOTE.moreSpecific, { above: S.RULES.total.moreSpecificAbove });
      const subs = f.result.subscales.map(s => fill(NOTE.subscale, { label: s.label, sum: s.sum, max: s.max, status: status(s.atOrAbove, s.cutoff) }));
      lines.push(fill(NOTE.formLine, { form: name, sum: t.sum, max: report.totalMax, status: st, subscales: subs.join(", ") }));
    });
    const T = S.RULES.total;
    lines.push(fill(NOTE.meaning, { cutoff: T.cutoff, indicates: T.indicates, moreSpecificNote: T.moreSpecificNote }));
    // Plain keyboard characters only, so Epic gets plain text.
    return lines.join("\n").replace(/[^\x0A\x20-\x7E]/g, "");
  }

  // Item-by-item rows: child form wording, one value per form (null when that form isn't in).
  function itemRows(report) {
    return F.FORMS.child.items.map(it => ({
      n: it.n, text: it.text,
      values: FORMS.map(form => { const f = report.forms.find(x => x.form === form); return f ? f.answers[it.n] : null; })
    }));
  }

  window.PedsScaredReport = Object.freeze({ add: add, build: build, noteText: noteText, itemRows: itemRows });
})();
