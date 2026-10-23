/* Pediatric Tools: the Vanderbilt clinic report as data, and the plain-text note for Epic.
   Pure: no page access, no storage. Every number comes from PedsVanderbilt.score() (PDF page 10);
   this file only arranges and words it. The wording lives in vanderbilt-note-template.js.
   Load after vanderbilt-forms.js, vanderbilt-score.js, vanderbilt-codes.js and the template.
   Chart note: .claude/chart/2026-10-22-vanderbilt-report.md (notes repo). */
(function () {
  "use strict";

  const F = window.PedsVanderbiltForms, S = window.PedsVanderbilt, C = window.PedsVanderbiltCodes;
  const SLOTS = ["P1", "P2", "T1", "T2"];
  const SLOT_NAME = { P1: "Parent 1", P2: "Parent 2", T1: "Teacher 1", T2: "Teacher 2" };
  const POSITIVE = [2, 3];

  function fill(s, vars) {
    Object.keys(vars || {}).forEach(k => { s = s.split("{" + k + "}").join(vars[k]); });
    return s;
  }
  function scaleLabel(scale, v) { const o = scale.find(x => x.value === v); return o ? o.label : null; }

  // ---------- report model ----------
  function build(packet) {
    const raters = [];
    SLOTS.forEach(slot => {
      const r = packet.raters && packet.raters[slot];
      if (!r) return;
      const formId = C.formId(slot, packet.kind);
      const result = S.score(formId, { answers: r.answers, sideEffects: r.sideEffects, medication: r.medication });
      raters.push({ slot: slot, label: C.raterLabel(r), formId: formId, answers: r.answers, result: result, error: !result.ok });
    });
    const missing = (packet.sent || []).filter(s => !(packet.raters || {})[s]).sort((a, b) => SLOTS.indexOf(a) - SLOTS.indexOf(b));
    const verify = [...new Set(raters.map(r => S.RULES[r.formId].verify).filter(Boolean))]; // only real VERIFY tags
    return {
      visit: packet.visit, visitShown: C.formatVisitCode(packet.visit), kind: packet.kind,
      raters: raters, missing: missing.map(s => ({ slot: s, label: SLOT_NAME[s] })),
      itemTable: itemTable(packet.kind, raters), perfTable: perfTable(raters), verify: verify
    };
  }

  function cellsFor(raters, n) {
    return raters.map(r => {
      if (r.error) return { slot: r.slot, value: null, label: null, positive: null };
      const v = r.answers[n] === undefined ? null : r.answers[n];
      return { slot: r.slot, value: v, label: v === null ? null : scaleLabel(F.SCALES.symptom, v), positive: v === null ? null : POSITIVE.indexOf(v) >= 0 };
    });
  }
  function row(n, text, raters) {
    const cells = cellsFor(raters, n);
    const answered = cells.filter(c => c.positive !== null);
    // Positive for some raters and not others, among those who answered.
    const disagree = answered.some(c => c.positive) && answered.some(c => !c.positive);
    return { n: n, text: text, cells: cells, disagree: disagree };
  }
  function itemTable(kind, raters) {
    const parents = raters.filter(r => r.slot[0] === "P"), teachers = raters.filter(r => r.slot[0] === "T");
    const textForm = F.FORMS[C.formId(parents.length || !teachers.length ? "P1" : "T1", kind)];
    const core = [];
    for (let n = 1; n <= 18; n++) core.push(row(n, textForm.items[n - 1].text, raters));
    const out = { slots: raters.map(r => r.slot), core: core, parentRows: [], teacherRows: [] };
    if (kind === "initial") {
      const pf = F.FORMS.parentInitial, tf = F.FORMS.teacherInitial;
      if (parents.length) pf.items.filter(it => it.n > 18 && it.type === "symptom").forEach(it => out.parentRows.push(row(it.n, it.text, parents)));
      if (teachers.length) tf.items.filter(it => it.n > 18 && it.type === "symptom").forEach(it => out.teacherRows.push(row(it.n, it.text, teachers)));
    }
    return out;
  }
  function perfTable(raters) {
    return raters.filter(r => !r.error).map(r => ({
      slot: r.slot, label: r.label,
      items: F.FORMS[r.formId].items.filter(it => it.type === "perf").map(it => {
        const v = r.answers[it.n] === undefined ? null : r.answers[it.n];
        return { n: it.n, text: it.text, group: it.group || null, value: v, label: v === null ? null : scaleLabel(F.SCALES.perf, v), problem: v === 4 || v === 5 };
      })
    }));
  }

  // ---------- note text ----------
  function joinAreas(list) {
    if (list.some(a => a.indexOf(",") >= 0)) return list.join("; ");
    if (list.length < 2) return list.join("");
    return list.slice(0, -1).join(", ") + " and " + list[list.length - 1];
  }

  function raterLine(r, T, kind) {
    if (r.error) return fill(T.unreadable, { rater: r.label });
    const res = r.result, parts = [];
    const screens = res.screens.map(s => {
      const name = T.screenNames[s.id] || s.label;
      if (kind === "followup" || s.need === null) {
        return fill(T.screenCount, { name: name, positive: s.positive, of: s.of }) + (s.skipped ? fill(T.screenCountSkipped, { skipped: s.skipped }) : "");
      }
      let status = s.met ? T.statusMet : T.statusNotMet;
      if (s.couldBeMet) status = s.skipped ? fill(T.statusCould, { skipped: s.skipped }) : T.statusCouldPerf;
      return fill(T.screen, { name: name, positive: s.positive, of: s.of, status: status });
    });
    parts.push(screens.join(", "));
    const top = Math.max.apply(null, F.SCALES.symptom.map(x => x.value)); // 3 = "Very Often"
    parts.push(fill(T.total, { sum: res.total.sum, max: res.total.of * top }) +
      (res.total.answered < res.total.of ? fill(T.totalPartial, { answered: res.total.answered, of: res.total.of }) : ""));
    const p = res.perf;
    if (p.impaired) parts.push(fill(T.perfImpaired, { areas: joinAreas(p.problems.map(x => x.text.toLowerCase())) }));
    else if (p.answered === 0) parts.push(T.perfNotAnswered);
    else if (p.skipped === 1) parts.push(T.perfCould1);
    else if (p.skipped > 1) parts.push(fill(T.perfCould, { skipped: p.skipped }));
    else parts.push(T.perfNone);
    if (p.average !== null) parts.push(fill(T.perfAverage, { average: p.average.toFixed(1) }));

    let se = "";
    if (res.sideEffects) {
      const rated = res.sideEffects.filter(x => x.value !== null);
      const some = rated.filter(x => x.value > 0);
      if (!rated.length) se = T.sideEffectsNotAnswered;
      else if (!some.length) se = T.sideEffectsNone;
      else se = fill(T.sideEffects, { list: some.map(x => fill(T.sideEffectItem, { name: x.text.toLowerCase(), severity: x.label.toLowerCase() })).join(", ") });
    }
    const med = res.medication ? (T.med[res.medication.id] || "") : "";
    return fill(T.raterLine, { rater: r.label, details: parts.filter(Boolean).join(", "), sideEffects: se, medication: med });
  }

  function noteText(report, template) {
    const T = template || window.PedsVanderbiltNote;
    const lines = [fill(T.header, { form: report.kind === "initial" ? T.formInitial : T.formFollowup, visit: report.visitShown })];
    report.raters.forEach(r => lines.push(raterLine(r, T, report.kind)));
    report.missing.forEach(m => lines.push(fill(T.notReturned, { rater: m.label })));
    const text = toAscii(lines.join("\n")).split("\n").map(l => l.trim()).join("\n");
    if (!/^[\x20-\x7E\n]*$/.test(text)) throw new Error("The note template contains a character Epic can't take (a control character). Fix vanderbilt-note-template.js.");
    return text;
  }

  // Plain keyboard characters for Epic: known symbols mapped, any other non-ASCII removed.
  // Control characters (other than line breaks and tabs) are left in, so noteText() refuses them.
  function toAscii(s) {
    return String(s)
      .replace(/[ \t ]*[–—][ \t ]*/g, " - ") // spaces only: never swallow a line break
      .replace(/ /g, " ")
      .replace(/[‘’‛′]/g, "'")
      .replace(/[“”‟″]/g, "\"")
      .replace(/©/g, "(c)")
      .replace(/…/g, "...")
      .replace(/\t/g, " ")
      .replace(/\r/g, "")
      .replace(/[^\x00-\x7E]/g, "")
      .replace(/ {2,}/g, " ");
  }

  window.PedsVanderbiltReport = Object.freeze({ build: build, noteText: noteText, toAscii: toAscii });
})();
