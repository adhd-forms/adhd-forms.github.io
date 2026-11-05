/* The wording of the SCARED note that is copied into Epic.
   Edit freely, but:
   - keep every {placeholder} (the numbers and the "may indicate" words come from scared-score.js,
     never from this file);
   - use plain keyboard characters only. Anything else is stripped before copying, so Epic always
     gets plain text.
   After editing, run: node tests/scared-report.test.js (notes repo). Bump ?v= where it is loaded.
   Chart note: .claude/chart/2026-11-05-scared-clinic.md (notes repo). */
(function () {
  "use strict";
  window.PedsScaredNote = {
    header: "SCARED (visit code {visit})",
    formNames: { parent: "Parent", child: "Child" },

    // One line per form. {subscales} = each subscale as below, joined with ", ".
    formLine: "{form} report: total {sum}/{max} ({status}). {subscales}.",
    subscale: "{label} {sum}/{max} ({status})",
    // "positive" and "negative" are the owner's words (2026-11-05).
    statusAtOrAbove: "positive, at or above {cutoff}",
    statusBelow: "negative, below {cutoff}",
    moreSpecific: ", higher than {above}",
    notReturned: "{form} report: not returned.",
    unreadable: "{form} report: could not be read.",

    // Closing line, from the scoring aide's wording.
    meaning: "Total at or above {cutoff} {indicates}. {moreSpecificNote}"
  };
})();
