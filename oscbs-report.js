/* OS-CBS clinic report: the report model and the Epic note for one visit (a parent/caregiver and a teacher
   result). Pure functions, no page access, no storage. Every number and every flag comes from oscbs-score.js
   (score(), RULES, FLAGS); the note wording comes from oscbs-note-template.js. No combined score across
   respondents, and no interpretive text (no validated cutoffs; owner, 2026-11-16).
   Load after oscbs-forms.js, oscbs-score.js, oscbs-codes.js and oscbs-note-template.js.
   Chart note: .claude/chart/2026-11-16-oscbs.md (notes repo). */
(function () {
  "use strict";

  const F = window.PedsOscbsForms, S = window.PedsOscbs, C = window.PedsOscbsCodes, NOTE = window.PedsOscbsNote;
  const FORMS = C.TABLE.forms; // parent, teacher

  // Adds one decoded link or typed code to the visit's results. The first result sets the visit;
  // a second result for the same respondent keeps the first (as SCARED).
  function add(state, d) {
    if (d.type === "invite") return { ok: false, state: state, message: "That is a link for filling in a form, not a result." };
    const v = d.value, label = NOTE.formNames[v.form];
    if (state && state.visit !== v.visit) {
      return { ok: false, state: state, message: "Visit codes don't match: " + C.formatVisitCode(state.visit) + " vs " + C.formatVisitCode(v.visit) + ". Nothing was added." };
    }
    const next = state ? Object.assign({}, state) : { visit: v.visit, parent: null, teacher: null };
    if (next[v.form]) return { ok: false, state: state, message: label + " results already added; kept the first one." };
    next[v.form] = { day: v.day, answers: Object.assign({}, v.answers) };
    return { ok: true, state: next, message: label + " results added." };
  }

  const mean2 = x => x.toFixed(2);
  const answerLabel = v => { const s = F.SCALE.find(o => o.value === v); return s ? s.label : String(v); };

  function build(state) {
    const forms = [], missing = [];
    FORMS.forEach(form => {
      const r = state[form];
      if (!r) { missing.push(form); return; }
      const res = S.score({ answers: r.answers });
      let date = null;
      try { date = C.dayToISO(r.day); } catch (e) { /* shown as unknown */ }
      forms.push({ form: form, label: NOTE.formNames[form], date: date, answers: r.answers, result: res.ok ? res : null });
    });
    return { visit: state.visit, visitShown: C.formatVisitCode(state.visit), forms: forms, missing: missing };
  }

  function fill(text, vars) {
    return text.replace(/\{(\w+)\}/g, (m, k) => {
      if (!Object.prototype.hasOwnProperty.call(vars, k)) throw new Error("OS-CBS note: no value for {" + k + "}");
      return String(vars[k]);
    });
  }

  function noteText(report) {
    const lines = [fill(NOTE.header, { visit: report.visitShown })];
    FORMS.forEach(form => {
      const name = NOTE.formNames[form], f = report.forms.find(x => x.form === form);
      if (!f) { lines.push(fill(NOTE.notReturned, { form: name })); return; }
      if (!f.result) { lines.push(fill(NOTE.unreadable, { form: name })); return; }
      const t = f.result.total;
      const subs = f.result.subscales.map(s => fill(NOTE.subscale, { label: s.label, sum: s.sum, min: s.min, max: s.max, mean: mean2(s.mean) }));
      lines.push(fill(NOTE.formLine, { form: name, date: f.date || "unknown", sum: t.sum, min: t.min, max: t.max, mean: mean2(t.mean), subscales: subs.join("; ") }));
      const fl = f.result.flags;
      lines.push(fl.length
        ? fill(NOTE.flags, { form: name, label: S.FLAGS.label, list: fl.map(x => fill(NOTE.flagItem, { n: x.n, answer: answerLabel(x.value) })).join(", ") })
        : fill(NOTE.noFlags, { form: name, label: S.FLAGS.label }));
    });
    lines.push(NOTE.method);
    // Plain keyboard characters only, so Epic gets plain text.
    return lines.join("\n").replace(/[^\x0A\x20-\x7E]/g, "");
  }

  // Item-by-item rows: one value per respondent (null when that respondent isn't in). flagged comes
  // from score()'s flag list only, so the table and the note can never disagree.
  function itemRows(report) {
    return F.FORM.items.map(it => ({
      n: it.n, text: it.text, flagLevel: S.FLAGS.items[it.n] || null,
      values: FORMS.map(form => {
        const f = report.forms.find(x => x.form === form);
        if (!f) return { value: null, flagged: false };
        const v = f.answers[it.n];
        return { value: v, label: answerLabel(v), flagged: !!f.result && f.result.flags.some(x => x.n === it.n) };
      })
    }));
  }

  window.PedsOscbsReport = Object.freeze({ add: add, build: build, noteText: noteText, itemRows: itemRows, answerLabel: answerLabel });
})();
