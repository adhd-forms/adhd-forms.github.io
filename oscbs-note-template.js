/* The wording of the OS-CBS note that is copied into Epic.
   Edit freely, but:
   - keep every {placeholder} (the numbers, ranges, flags and labels come from oscbs-score.js and
     oscbs-forms.js, never from this file);
   - use plain keyboard characters only. Anything else is stripped before copying, so Epic always
     gets plain text;
   - no interpretive words: the OS-CBS has no validated cutoffs (owner, 2026-11-16).
   After editing, run: node tests/oscbs-report.test.js (notes repo). Bump ?v= where it is loaded.
   Chart note: .claude/chart/2026-11-16-oscbs.md (notes repo). */
(function () {
  "use strict";
  window.PedsOscbsNote = {
    header: "OS-CBS version 220309 (visit code {visit})",
    formNames: { parent: "Parent/caregiver", teacher: "Teacher" },

    // One line per respondent. {subscales} = each subscale as below, joined with "; ".
    formLine: "{form} report, completed {date} (device date): total {sum} (range {min}-{max}; item mean {mean} on 0-4). {subscales}.",
    subscale: "{label} {sum} (range {min}-{max}; mean {mean})",
    flags: "{form} - {label}: {list}.",
    flagItem: "item {n} ({answer})",
    noFlags: "{form} - {label}: none.",
    notReturned: "{form} report: not returned.",
    unreadable: "{form} report: could not be read.",

    // Closing line: how the numbers are made (from the print form and the scoring workbook).
    method: "Sums of item answers 1-5. Item mean as in the official scoring workbook (answers recoded 0-4, then averaged). No validated cutoffs."
  };
})();
