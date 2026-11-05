/* SCARED scoring (rules as data, plus a pure scoring function).
   Load after the form data:
     <script src="scared-forms.js?v=1"></script>
     <script src="scared-score.js?v=1"></script>
   Exposes only window.PedsScared = { RULES, score }. No page access, no storage.
   Bump ?v= on every page that loads it whenever this file changes.
   Chart note: .claude/chart/2026-11-05-scared-forms-scoring.md (notes repo). */
(function () {
  "use strict";

  const F = window.PedsScaredForms;
  if (!F) throw new Error("scared-score.js needs scared-forms.js loaded first");

  const ITEM_COUNT = 41;
  const VERIFY = "VERIFY: owner to check against the scoring aide, printed page 45";

  // medical-data. Source: SCARED Rating Scale Scoring Aide, owner's PDF, printed page 45
  // The aide prints "≥ 25" for the total but only "A score of 7" and "Cutoff = 7" for the
  // subscales; reading each subscale as at or above its cutoff is the owner's decision, 2026-11-05.
  // The aide says "Use with Parent and Child Versions", so both forms share these rules.
  const RULES = {
    subscales: [
      { id: "panic", label: "Panic/Somatic", items: [1, 6, 9, 12, 15, 18, 19, 22, 24, 27, 30, 34, 38], cutoff: 7, indicates: "may indicate Panic Disorder or Significant Somatic Symptoms", verify: VERIFY },
      { id: "gad", label: "Generalized Anxiety", items: [5, 7, 14, 21, 23, 28, 33, 35, 37], cutoff: 9, indicates: "may indicate Generalized Anxiety Disorder", verify: VERIFY },
      { id: "separation", label: "Separation", items: [4, 8, 13, 16, 20, 25, 29, 31], cutoff: 5, indicates: "may indicate Separation Anxiety Disorder", verify: VERIFY },
      { id: "social", label: "Social", items: [3, 10, 26, 32, 39, 40, 41], cutoff: 8, indicates: "may indicate Social Anxiety Disorder", verify: VERIFY },
      { id: "school", label: "School Avoidance", items: [2, 11, 17, 36], cutoff: 3, indicates: "may indicate Significant School Avoidance", verify: VERIFY }
    ],
    total: {
      cutoff: 25,
      indicates: "may indicate the presence of an Anxiety Disorder",
      moreSpecificAbove: 30,
      moreSpecificNote: "Scores higher than 30 are more specific.",
      verify: VERIFY
    }
  };

  const hasOwn = function (o, k) { return Object.prototype.hasOwnProperty.call(o, k); };

  // Every answer is required: a partial sum could read falsely as under a cutoff. A 0 is an answer, not a blank.
  function validate(response) {
    const bad = [];
    const a = response && response.answers;
    if (!a || typeof a !== "object" || Array.isArray(a)) {
      bad.push({ field: "answers", value: a, why: "answers missing" });
      return bad;
    }
    Object.keys(a).forEach(function (k) {
      if (!/^[1-9][0-9]*$/.test(k) || Number(k) > ITEM_COUNT) {
        bad.push({ field: "answers", n: k, value: a[k], why: "not an item on this form" });
      }
    });
    for (let n = 1; n <= ITEM_COUNT; n++) {
      if (!hasOwn(a, n) || a[n] === undefined || a[n] === null) {
        bad.push({ field: "answers", n: n, value: null, why: "not answered" });
      } else if (a[n] !== 0 && a[n] !== 1 && a[n] !== 2) {
        bad.push({ field: "answers", n: n, value: a[n], why: "not 0, 1 or 2" });
      }
    }
    return bad;
  }

  function score(formId, response) {
    if (typeof formId !== "string" || !hasOwn(F.FORMS, formId)) throw new Error("Unknown SCARED form: " + formId);

    const invalid = validate(response);
    if (invalid.length) return { ok: false, formId: formId, invalid: invalid };

    const answers = response.answers;
    const sumOf = function (items) { return items.reduce(function (s, n) { return s + answers[n]; }, 0); };
    let sum = 0;
    for (let n = 1; n <= ITEM_COUNT; n++) sum += answers[n];

    return {
      ok: true,
      formId: formId,
      total: {
        sum: sum,
        cutoff: RULES.total.cutoff,
        atOrAbove: sum >= RULES.total.cutoff,
        moreSpecific: sum > RULES.total.moreSpecificAbove
      },
      subscales: RULES.subscales.map(function (s) {
        const subSum = sumOf(s.items);
        return {
          id: s.id,
          label: s.label,
          sum: subSum,
          max: s.items.length * 2,
          cutoff: s.cutoff,
          atOrAbove: subSum >= s.cutoff,
          indicates: s.indicates
        };
      })
    };
  }

  function deepFreeze(o) {
    Object.values(o).forEach(function (v) { if (v && typeof v === "object") deepFreeze(v); });
    return Object.freeze(o);
  }

  window.PedsScared = Object.freeze({ RULES: deepFreeze(RULES), score: score });
})();
