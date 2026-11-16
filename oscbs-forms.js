/* OS-CBS (Open Source – Challenging Behavior Scale, version 220309) as data (no scoring, no page code).
   Loaded by the OS-CBS pages before their own script:
     <script src="oscbs-forms.js?v=1"></script>
   Exposes only window.PedsOscbsForms (frozen). Bump ?v= on every page that loads it whenever
   this file changes, and update sw.js PRECACHE.

   Item text is copied word for word from the print form (owner, 2026-11-16, like SCARED and Vanderbilt),
   parenthetical examples included; wrapped lines are joined with one space. The title is the owner's
   ("Open Source – Challenging Behavior Scale (OS-CBS)"); the print form's heading reads "Open Source –
   Challenging behavior (OS-CB)". One item list serves both respondents: the form is informant-report,
   for a child or teen aged 2 to 17 (owner). tests/oscbs-pdf-text.py compares every item with the PDF.
   Chart note: .claude/chart/2026-11-16-oscbs.md (notes repo). */
(function () {
  "use strict";

  const TITLE = "Open Source – Challenging Behavior Scale (OS-CBS)";
  const VERSION = "220309";

  // medical-data. Source: OS-CBS print form version 220309 (Open_Source-Challenging_Behavior_Scale_220309_print_version.pdf,
  // notes repo reference/os-cbs/), column headings, as dictated by the owner, 2026-11-16.
  const SCALE = [
    { value: 1, label: "Not at all a problem" },
    { value: 2, label: "Mild Problem" },
    { value: 3, label: "Moderate Problem" },
    { value: 4, label: "Severe Problem" },
    { value: 5, label: "Very Severe Problem" }
  ];

  // medical-data. Source: OS-CBS print form version 220309 (notes repo reference/os-cbs/), items 1-18 and the
  // instructions, as dictated by the owner, 2026-11-16. "past month" is underlined on the print form.
  const FORM = {
    title: TITLE,
    version: VERSION,
    instructions: {
      before: "Please indicate, over the ",
      underlined: "past month",
      after: ", how much of a problem the following behaviors are for the person you are rating."
    },
    items: [
      { n: 1, text: "Intentionally breaks things around the house" },
      { n: 2, text: "Treats objects roughly with no regard for damage" },
      { n: 3, text: "Kicks, throws, slams, or rips things when upset" },
      { n: 4, text: "Throws objects at other people" },
      { n: 5, text: "Rough with others without being directly aggressive and without causing harm" },
      { n: 6, text: "Aggressive toward other people without causing injury (Examples: shoving, bullying, insulting, threatening, other types of verbal or physical aggression)" },
      { n: 7, text: "Aggression toward other people that causes significant injury" },
      { n: 8, text: "Wanders if not closely supervised - with a risk of being lost or injured" },
      { n: 9, text: "Actively tries to escape from home, school, or other premises" },
      { n: 10, text: "Leaves a safe area without regard for danger" },
      { n: 11, text: "Has temper tantrums or periods of major upset" },
      { n: 12, text: "Refuses to follow instructions" },
      { n: 13, text: "Does the opposite of what they are told to do" },
      { n: 14, text: "Takes things that are not theirs" },
      { n: 15, text: "Hurts self without causing significant injury (Examples: Picks skin, bites self without breaking skin, bites nails, or scratches)" },
      { n: 16, text: "Hits head, face, neck, or other parts of the body (not due to motor difficulties)" },
      { n: 17, text: "Cuts, stabs, bites, burns, or hurts themselves causing injury" },
      { n: 18, text: "Engages in inappropriate sexual behavior" }
    ]
  };

  // Who fills it in (owner: "parent/caregiver, teacher"). The order is part of the codes: never reorder.
  const RESPONDENTS = [
    { id: "parent", label: "Parent/caregiver" },
    { id: "teacher", label: "Teacher" }
  ];

  // Owner's wording, word for word (2026-11-16).
  const CITATION = "OS-CBS version 220309. Frazier TW, Khaliq I, Scullin K, Uljarevic M, Shih A, Karpur A. Development and Psychometric Evaluation of the Open-Source Challenging Behavior Scale (OS-CBS). J Autism Dev Disord. 2023;53(12):4655-4670. doi:10.1007/s10803-022-05750-5. Freely available, open-source measure.";
  const DISCLAIMER = "Not intended to make or inform a psychiatric diagnosis or to be the sole basis for intervention planning.";

  function deepFreeze(o) {
    Object.values(o).forEach(function (v) { if (v && typeof v === "object") deepFreeze(v); });
    return Object.freeze(o);
  }

  window.PedsOscbsForms = deepFreeze({
    SCALE: SCALE,
    FORM: FORM,
    RESPONDENTS: RESPONDENTS,
    CITATION: CITATION,
    DISCLAIMER: DISCLAIMER
  });
})();
