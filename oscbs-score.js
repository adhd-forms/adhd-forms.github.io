/* OS-CBS scoring (rules as data, plus a pure scoring function).
   Load after the form data:
     <script src="oscbs-forms.js?v=1"></script>
     <script src="oscbs-score.js?v=1"></script>
   Exposes only window.PedsOscbs = { RULES, FLAGS, score }. No page access, no storage.
   Bump ?v= on every page that loads it whenever this file changes.

   There are no validated clinical cutoffs: nothing here says high, low, positive or elevated (owner,
   2026-11-16). Raw sums and their ranges, the workbook's item mean and the safety-flag list only.
   Chart note: .claude/chart/2026-11-16-oscbs.md (notes repo). */
(function () {
  "use strict";

  const F = window.PedsOscbsForms;
  if (!F) throw new Error("oscbs-score.js needs oscbs-forms.js loaded first");

  const ITEM_COUNT = 18;
  const MIN = 1, MAX = 5;

  // medical-data. Source: OS-CBS print form version 220309, printed "Scoring" lines (Total Score: sum of all items;
  // Property Destruction 1-3, Aggression 4-7, Elopement 8-10, Conduct 11-14, Self-injury 15-18), as dictated by the
  // owner, 2026-11-16. Mean: official scoring workbook (Open_Source_Challenging_Behavior_Scale_scoring.xlsx, sheet
  // "CB scoring"): each answer recoded 1-5 to 0-4 (B-1), then AVERAGE of the recoded items. The owner asked for a
  // 1.0-5.0 mean but also "follow the xlsx" where it differs, so the mean is on 0-4. All 18 answers are required
  // (owner), so the workbook's missing-item allowances never apply.
  const RULES = {
    total: { id: "total", label: "Total", items: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18] },
    subscales: [
      { id: "property", label: "Property Destruction", items: [1, 2, 3] },
      { id: "aggression", label: "Aggression", items: [4, 5, 6, 7] },
      { id: "elopement", label: "Elopement", items: [8, 9, 10] },
      { id: "conduct", label: "Conduct", items: [11, 12, 13, 14] },
      { id: "selfInjury", label: "Self-Injury", items: [15, 16, 17, 18] }
    ],
    meanRecode: 1 // mean = average of (answer - 1), 0 to 4, as in the workbook
  };

  // medical-data. Source: the owner, 2026-11-16, word for word: "highlight any item rated 3 or higher among items 7,
  // 9, 10, 16, and 17, and item 18 rated 2 or higher". Thresholds compare the raw 1-5 answer as printed
  // (3 = Moderate Problem, 2 = Mild Problem), never the 0-4 recode. Change items or thresholds here only.
  const FLAGS = {
    label: "Items rated moderate or higher in high-risk domains (item 18: mild or higher)",
    items: { 7: 3, 9: 3, 10: 3, 16: 3, 17: 3, 18: 2 }
  };

  const hasOwn = function (o, k) { return Object.prototype.hasOwnProperty.call(o, k); };

  // Every answer is required, and must be exactly 1, 2, 3, 4 or 5.
  function validate(response) {
    const bad = [];
    const a = response && response.answers;
    if (!a || typeof a !== "object" || Array.isArray(a)) {
      bad.push({ field: "answers", value: a, why: "answers missing" });
      return bad;
    }
    Object.keys(a).forEach(function (k) {
      if (!/^[1-9][0-9]*$/.test(k) || Number(k) > ITEM_COUNT) bad.push({ field: "answers", n: k, value: a[k], why: "not an item on this form" });
    });
    for (let n = 1; n <= ITEM_COUNT; n++) {
      if (!hasOwn(a, n) || a[n] === undefined || a[n] === null) bad.push({ field: "answers", n: n, value: null, why: "not answered" });
      else if (!Number.isInteger(a[n]) || a[n] < MIN || a[n] > MAX) bad.push({ field: "answers", n: n, value: a[n], why: "not 1 to 5" });
    }
    return bad;
  }

  function scale(def, answers) {
    const sum = def.items.reduce(function (s, n) { return s + answers[n]; }, 0);
    const k = def.items.length;
    return {
      id: def.id, label: def.label, items: def.items.slice(), n: k,
      sum: sum, min: k * MIN, max: k * MAX,
      mean: (sum - k * RULES.meanRecode) / k // 0 to 4; round only for display
    };
  }

  function score(response) {
    const invalid = validate(response);
    if (invalid.length) return { ok: false, invalid: invalid };
    const a = response.answers;
    const flags = Object.keys(FLAGS.items).map(Number).sort(function (x, y) { return x - y; })
      .filter(function (n) { return a[n] >= FLAGS.items[n]; })
      .map(function (n) { return { n: n, value: a[n], threshold: FLAGS.items[n] }; });
    return {
      ok: true,
      total: scale(RULES.total, a),
      subscales: RULES.subscales.map(function (s) { return scale(s, a); }),
      flags: flags
    };
  }

  // Check the map covers every item exactly once, so a typo in RULES can't go unnoticed.
  const seen = [];
  RULES.subscales.forEach(function (s) { s.items.forEach(function (n) { seen.push(n); }); });
  if (seen.slice().sort(function (x, y) { return x - y; }).join() !== RULES.total.items.join() || F.FORM.items.length !== ITEM_COUNT) {
    throw new Error("oscbs-score.js: the subscales must cover items 1-18 once each");
  }

  function deepFreeze(o) {
    Object.values(o).forEach(function (v) { if (v && typeof v === "object") deepFreeze(v); });
    return Object.freeze(o);
  }

  window.PedsOscbs = Object.freeze({ RULES: deepFreeze(RULES), FLAGS: deepFreeze(FLAGS), score: score });
})();
