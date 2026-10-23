/* Pediatric Tools: NICHQ Vanderbilt scoring (rules as data, plus a pure scoring function).
   Load after the form data:
     <script src="vanderbilt-forms.js?v=1"></script>
     <script src="vanderbilt-score.js?v=1"></script>
   Exposes only window.PedsVanderbilt = { RULES, score }. No page access, no storage.
   Bump ?v= on every page that loads it whenever this file changes.
   Chart note: .claude/chart/2026-10-22-vanderbilt-scoring.md (notes repo). */
(function () {
  "use strict";

  const V = window.PedsVanderbiltForms;
  if (!V) throw new Error("vanderbilt-score.js needs vanderbilt-forms.js loaded first");

  // medical-data. Source: NICHQ Vanderbilt Assessment Scales, Scoring Instructions, ©2002 AAP/NICHQ, owner's PDF page 10
  // A positive symptom is 2 or 3; impairment is any one performance item scored 4 or 5.
  // A screen is met when its positive count reaches `need` AND (if withImpairment) there is impairment.
  // Checked against the page 10 scoring instructions by the owner, 2026-10-23.
  const RULES = {
    parentInitial: {
      screens: [
        { id: "inattentive", label: "Predominantly Inattentive subtype", from: 1, to: 9, need: 6, withImpairment: true },
        { id: "hyperactive", label: "Predominantly Hyperactive/Impulsive subtype", from: 10, to: 18, need: 6, withImpairment: true },
        { id: "odd", label: "Oppositional-Defiant Disorder Screen", from: 19, to: 26, need: 4, withImpairment: true },
        { id: "conduct", label: "Conduct Disorder Screen", from: 27, to: 40, need: 3, withImpairment: true },
        { id: "anxdep", label: "Anxiety/Depression Screen", from: 41, to: 47, need: 3, withImpairment: true }
      ],
      combined: ["inattentive", "hyperactive"],
      total: { from: 1, to: 18 },
      perf: { from: 48, to: 55 },
      sideEffects: false
    },
    teacherInitial: {
      screens: [
        { id: "inattentive", label: "Predominantly Inattentive subtype", from: 1, to: 9, need: 6, withImpairment: true },
        { id: "hyperactive", label: "Predominantly Hyperactive/Impulsive subtype", from: 10, to: 18, need: 6, withImpairment: true },
        { id: "oddConduct", label: "Oppositional-Defiant/Conduct Disorder Screen", from: 19, to: 28, need: 3, withImpairment: true },
        { id: "anxdep", label: "Anxiety/Depression Screen", from: 29, to: 35, need: 3, withImpairment: true }
      ],
      combined: ["inattentive", "hyperactive"],
      total: { from: 1, to: 18 },
      perf: { from: 36, to: 43 },
      sideEffects: false
    },
    // Follow-ups: page 10 scores only the total symptom score (1-18) and the average performance
    // score (19-26). The two counts have need: null, so they never get a met/not-met label
    // (owner, 2026-10-22). Results still carry perf.impaired and perf.problems: they show which
    // areas are a problem, never a met/not-met label.
    parentFollowup: {
      screens: [
        { id: "inattentive", label: "Inattentive (items 1-9)", from: 1, to: 9, need: null, withImpairment: false },
        { id: "hyperactive", label: "Hyperactive/Impulsive (items 10-18)", from: 10, to: 18, need: null, withImpairment: false }
      ],
      combined: null,
      total: { from: 1, to: 18 },
      perf: { from: 19, to: 26 },
      sideEffects: true
    },
    teacherFollowup: {
      screens: [
        { id: "inattentive", label: "Inattentive (items 1-9)", from: 1, to: 9, need: null, withImpairment: false },
        { id: "hyperactive", label: "Hyperactive/Impulsive (items 10-18)", from: 10, to: 18, need: null, withImpairment: false }
      ],
      combined: null,
      total: { from: 1, to: 18 },
      perf: { from: 19, to: 26 },
      sideEffects: true
    }
  };

  const POSITIVE = [2, 3];
  const PROBLEM = [4, 5];

  function isInt(v, lo, hi) {
    return typeof v === "number" && Number.isInteger(v) && v >= lo && v <= hi;
  }
  function label(scale, v) {
    const s = scale.find(function (x) { return x.value === v; });
    return s ? s.label : null;
  }
  function inRange(n, r) { return n >= r.from && n <= r.to; }

  // Checks every input first. Returns the list of problems; an empty list means the input is usable.
  function validate(form, rules, response) {
    const bad = [];
    const r = response || {};
    const a = r.answers;
    if (!a || typeof a !== "object" || Array.isArray(a)) {
      bad.push({ field: "answers", value: a, why: "answers missing" });
    } else {
      Object.keys(a).forEach(function (k) {
        const v = a[k];
        if (!/^[1-9][0-9]*$/.test(k) || Number(k) > form.items.length) {
          bad.push({ field: "answers", n: k, value: v, why: "not an item on this form" });
          return;
        }
        if (v === null || v === undefined) return; // skipped
        const item = form.items[Number(k) - 1];
        const ok = item.type === "perf" ? isInt(v, 1, 5) : isInt(v, 0, 3);
        if (!ok) bad.push({ field: "answers", n: Number(k), value: v, why: item.type === "perf" ? "not 1-5" : "not 0-3" });
      });
    }
    const se = r.sideEffects;
    if (se !== undefined && se !== null) {
      if (!rules.sideEffects) bad.push({ field: "sideEffects", value: se, why: "not on this form" });
      else if (!Array.isArray(se) || se.length !== V.SIDE_EFFECTS.length) bad.push({ field: "sideEffects", value: se, why: "must be a list of " + V.SIDE_EFFECTS.length });
      else se.forEach(function (v, i) {
        if (v !== null && v !== undefined && !isInt(v, 0, 3)) bad.push({ field: "sideEffects", n: i + 1, value: v, why: "not 0-3" });
      });
    }
    const m = r.medication;
    if (m !== undefined && m !== null && !V.MEDICATION.some(function (x) { return x.id === m; })) {
      bad.push({ field: "medication", value: m, why: "unknown choice" });
    }
    return bad;
  }

  function score(formId, response) {
    const form = V.FORMS[formId];
    const rules = RULES[formId];
    if (!form || !rules) throw new Error("Unknown Vanderbilt form: " + formId);

    const invalid = validate(form, rules, response);
    if (invalid.length) return { ok: false, formId: formId, invalid: invalid };

    const answers = response.answers;
    const val = function (n) { const v = answers[n]; return v === undefined ? null : v; };

    // Performance first: every screen with withImpairment depends on it.
    const perfItems = form.items.filter(function (it) { return inRange(it.n, rules.perf); });
    let perfSum = 0, perfAnswered = 0;
    const problems = [];
    perfItems.forEach(function (it) {
      const v = val(it.n);
      if (v === null) return;
      perfSum += v; perfAnswered++;
      if (PROBLEM.indexOf(v) >= 0) problems.push({ n: it.n, text: it.text, value: v });
    });
    const perf = {
      from: rules.perf.from, to: rules.perf.to, of: perfItems.length,
      answered: perfAnswered, skipped: perfItems.length - perfAnswered,
      impaired: problems.length > 0, problems: problems,
      average: perfAnswered ? Math.round(perfSum / perfAnswered * 10) / 10 : null
    };
    const impairCould = perf.impaired || perf.skipped > 0;

    const screens = rules.screens.map(function (s) {
      let positive = 0, skipped = 0;
      for (let n = s.from; n <= s.to; n++) {
        const v = val(n);
        if (v === null) skipped++;
        else if (POSITIVE.indexOf(v) >= 0) positive++;
      }
      let met = null, couldBeMet = null;
      if (s.need !== null) {
        met = positive >= s.need && (!s.withImpairment || perf.impaired);
        couldBeMet = !met && positive + skipped >= s.need && (!s.withImpairment || impairCould);
      }
      return { id: s.id, label: s.label, from: s.from, to: s.to, of: s.to - s.from + 1,
        positive: positive, skipped: skipped, need: s.need, met: met, couldBeMet: couldBeMet };
    });

    let combined = null;
    if (rules.combined) {
      const parts = rules.combined.map(function (id) { return screens.find(function (s) { return s.id === id; }); });
      const met = parts.every(function (p) { return p.met; });
      combined = { met: met, couldBeMet: !met && parts.every(function (p) { return p.met || p.couldBeMet; }) };
    }

    let sum = 0, answered = 0;
    for (let n = rules.total.from; n <= rules.total.to; n++) {
      const v = val(n);
      if (v !== null) { sum += v; answered++; }
    }

    let sideEffects = null;
    if (rules.sideEffects) {
      const se = response.sideEffects || [];
      sideEffects = V.SIDE_EFFECTS.map(function (text, i) {
        const v = se[i] === undefined ? null : se[i];
        return { text: text, value: v, label: v === null ? null : label(V.SCALES.sideEffect, v) };
      });
    }

    const m = response.medication;
    const medication = (m === undefined || m === null) ? null
      : { id: m, label: V.MEDICATION.find(function (x) { return x.id === m; }).label };

    return { ok: true, formId: formId, kind: form.kind, screens: screens, combined: combined,
      total: { sum: sum, answered: answered, of: rules.total.to - rules.total.from + 1 },
      perf: perf, sideEffects: sideEffects, medication: medication };
  }

  function deepFreeze(o) {
    Object.values(o).forEach(function (v) { if (v && typeof v === "object") deepFreeze(v); });
    return Object.freeze(o);
  }

  window.PedsVanderbilt = Object.freeze({ RULES: deepFreeze(RULES), score: score });
})();
