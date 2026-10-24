/* Pediatric Tools: the wording of the Vanderbilt note that is copied into Epic.
   Edit freely, but:
   - keep every {placeholder} (the numbers come from the scoring, never from this file);
   - use plain keyboard characters only. Anything else is stripped before copying, so Epic
     (Hyperspace and Haiku) always gets plain text.
   After editing, run: node tests/vanderbilt-report.test.js (notes repo). Bump ?v= where it is loaded.
   Chart note: .claude/chart/2026-10-22-vanderbilt-report.md (notes repo). */
(function () {
  "use strict";
  window.PedsVanderbiltNote = {
    header: "Vanderbilt {form} (visit code {visit})",
    formInitial: "Initial",
    formFollowup: "Follow-up",

    // One line per rater. {details} = the screens, the total, the performance part and the average,
    // joined with ", " (a part that doesn't apply is left out).
    raterLine: "{rater}: {details}.{sideEffects}{medication}",
    unreadable: "{rater}: result could not be read.",
    // The rater's optional comment, on the line after theirs (owner, 2026-10-24). {partial} is empty, or
    // commentPartial when characters the note can't show were left out.
    comment: "{rater} comments: \"{comment}\"{partial}",
    commentPartial: " (some characters left out; see the clinic view)",
    commentUnreadable: "{rater} comments: (written in characters the note can't show; see the clinic view)",
    notReturned: "{rater}: not returned.",

    screenNames: {
      inattentive: "Inattentive", hyperactive: "Hyperactive", odd: "ODD", conduct: "Conduct",
      oddConduct: "ODD/Conduct", anxdep: "Anxiety/depression"
    },
    screen: "{name} {positive}/{of} ({status})",          // first-visit forms
    statusMet: "met",
    statusNotMet: "not met",
    statusCould: "could be met, {skipped} skipped",
    statusCouldPerf: "could be met, performance items skipped",
    screenCount: "{name} {positive}/{of}",                // follow-ups: counts only, no met label
    screenCountSkipped: " ({skipped} skipped)",

    total: "total symptom score {sum}/{max}",
    totalPartial: " ({answered} of {of} answered)",

    perfImpaired: "impairment in {areas}",
    perfNone: "no performance impairment",
    perfCould1: "no impairment marked, 1 performance item skipped",
    perfCould: "no impairment marked, {skipped} performance items skipped",
    perfNotAnswered: "performance not answered",
    perfAverage: "average performance score {average}",

    sideEffects: " Side effects: {list}.",
    sideEffectsNone: " Side effects: none reported.",
    sideEffectsNotAnswered: " Side effects: not answered.",
    sideEffectItem: "{name} ({severity})",

    med: { on: " Rated on medication.", off: " Rated off medication.", unsure: " Medication status not sure." }
  };
})();
