/* Pediatric Tools: NICHQ Vanderbilt Assessment Scales as data (no scoring, no page code).
   Loaded by the Vanderbilt pages before their own script:
     <script src="vanderbilt-forms.js?v=1"></script>
   Exposes only window.PedsVanderbiltForms (frozen). Bump ?v= on every page that loads it
   whenever this file changes, and update sw.js PRECACHE once a page links it.

   Item text is copied word for word from the printed forms (owner's choice, 2026-10-22, like
   Milestones and Validation). The only fixes are PDF text-extraction artifacts (split words,
   double spaces, line-break hyphens). Fields that would identify the child or rater (names,
   dates, phone, class, grade, "return to"), the comment and "explain below" boxes and the
   "For Office Use Only" boxes are left out on purpose. Scoring rules are a separate file.
   Chart note: .claude/chart/2026-10-22-vanderbilt-forms.md (notes repo). */
(function () {
  "use strict";

  const BLANK_NOTE = "The printed blank for weeks or months is replaced by the TIME_KNOWN choice.";

  // medical-data. Source: NICHQ Vanderbilt Assessment Scales, ©2002 AAP/NICHQ (rev 1102/0303), owner's PDF, pages 2-9
  const FORMS = {
    parentInitial: {
      role: "parent",
      kind: "initial",
      title: "NICHQ Vanderbilt Assessment Scale—PARENT Informant",
      directions: "Each rating should be considered in the context of what is appropriate for the age of your child. When completing this form, please think about your child’s behaviors in the past 6 months.",
      verify: "VERIFY: owner to check transcription against the paper form",
      items: [
        { n: 1, type: "symptom", text: "Does not pay attention to details or makes careless mistakes with, for example, homework" },
        { n: 2, type: "symptom", text: "Has difficulty keeping attention to what needs to be done" },
        { n: 3, type: "symptom", text: "Does not seem to listen when spoken to directly" },
        { n: 4, type: "symptom", text: "Does not follow through when given directions and fails to finish activities (not due to refusal or failure to understand)" },
        { n: 5, type: "symptom", text: "Has difficulty organizing tasks and activities" },
        { n: 6, type: "symptom", text: "Avoids, dislikes, or does not want to start tasks that require ongoing mental effort" },
        { n: 7, type: "symptom", text: "Loses things necessary for tasks or activities (toys, assignments, pencils, or books)" },
        { n: 8, type: "symptom", text: "Is easily distracted by noises or other stimuli" },
        { n: 9, type: "symptom", text: "Is forgetful in daily activities" },
        { n: 10, type: "symptom", text: "Fidgets with hands or feet or squirms in seat" },
        { n: 11, type: "symptom", text: "Leaves seat when remaining seated is expected" },
        { n: 12, type: "symptom", text: "Runs about or climbs too much when remaining seated is expected" },
        { n: 13, type: "symptom", text: "Has difficulty playing or beginning quiet play activities" },
        { n: 14, type: "symptom", text: "Is “on the go” or often acts as if “driven by a motor”" },
        { n: 15, type: "symptom", text: "Talks too much" },
        { n: 16, type: "symptom", text: "Blurts out answers before questions have been completed" },
        { n: 17, type: "symptom", text: "Has difficulty waiting his or her turn" },
        { n: 18, type: "symptom", text: "Interrupts or intrudes in on others’ conversations and/or activities" },
        { n: 19, type: "symptom", text: "Argues with adults" },
        { n: 20, type: "symptom", text: "Loses temper" },
        { n: 21, type: "symptom", text: "Actively defies or refuses to go along with adults’ requests or rules" },
        { n: 22, type: "symptom", text: "Deliberately annoys people" },
        { n: 23, type: "symptom", text: "Blames others for his or her mistakes or misbehaviors" },
        { n: 24, type: "symptom", text: "Is touchy or easily annoyed by others" },
        { n: 25, type: "symptom", text: "Is angry or resentful" },
        { n: 26, type: "symptom", text: "Is spiteful and wants to get even" },
        { n: 27, type: "symptom", text: "Bullies, threatens, or intimidates others" },
        { n: 28, type: "symptom", text: "Starts physical fights" },
        // As extracted, with no space after "ie,"; the teacher form prints "(eg, “cons” others)". The paper decides.
        { n: 29, type: "symptom", text: "Lies to get out of trouble or to avoid obligations (ie,“cons” others)" },
        { n: 30, type: "symptom", text: "Is truant from school (skips school) without permission" },
        { n: 31, type: "symptom", text: "Is physically cruel to people" },
        { n: 32, type: "symptom", text: "Has stolen things that have value" },
        { n: 33, type: "symptom", text: "Deliberately destroys others’ property" },
        { n: 34, type: "symptom", text: "Has used a weapon that can cause serious harm (bat, knife, brick, gun)" },
        { n: 35, type: "symptom", text: "Is physically cruel to animals" },
        { n: 36, type: "symptom", text: "Has deliberately set fires to cause damage" },
        { n: 37, type: "symptom", text: "Has broken into someone else’s home, business, or car" },
        { n: 38, type: "symptom", text: "Has stayed out at night without permission" },
        { n: 39, type: "symptom", text: "Has run away from home overnight" },
        { n: 40, type: "symptom", text: "Has forced someone into sexual activity" },
        { n: 41, type: "symptom", text: "Is fearful, anxious, or worried" },
        { n: 42, type: "symptom", text: "Is afraid to try new things for fear of making mistakes" },
        { n: 43, type: "symptom", text: "Feels worthless or inferior" },
        { n: 44, type: "symptom", text: "Blames self for problems, feels guilty" },
        { n: 45, type: "symptom", text: "Feels lonely, unwanted, or unloved; complains that “no one loves him or her”" },
        { n: 46, type: "symptom", text: "Is sad, unhappy, or depressed" },
        { n: 47, type: "symptom", text: "Is self-conscious or easily embarrassed" },
        { n: 48, type: "perf", text: "Overall school performance" },
        { n: 49, type: "perf", text: "Reading" },
        { n: 50, type: "perf", text: "Writing" },
        { n: 51, type: "perf", text: "Mathematics" },
        { n: 52, type: "perf", text: "Relationship with parents" },
        { n: 53, type: "perf", text: "Relationship with siblings" },
        { n: 54, type: "perf", text: "Relationship with peers" },
        { n: 55, type: "perf", text: "Participation in organized activities (eg, teams)" }
      ]
    },

    teacherInitial: {
      role: "teacher",
      kind: "initial",
      title: "NICHQ Vanderbilt Assessment Scale—TEACHER Informant",
      directions: "Each rating should be considered in the context of what is appropriate for the age of the child you are rating and should reflect that child’s behavior since the beginning of the school year. Please indicate the number of weeks or months you have been able to evaluate the behaviors: ___________.",
      directionsNote: BLANK_NOTE,
      verify: "VERIFY: owner to check transcription against the paper form",
      items: [
        { n: 1, type: "symptom", text: "Fails to give attention to details or makes careless mistakes in schoolwork" },
        { n: 2, type: "symptom", text: "Has difficulty sustaining attention to tasks or activities" },
        { n: 3, type: "symptom", text: "Does not seem to listen when spoken to directly" },
        { n: 4, type: "symptom", text: "Does not follow through on instructions and fails to finish schoolwork (not due to oppositional behavior or failure to understand)" },
        { n: 5, type: "symptom", text: "Has difficulty organizing tasks and activities" },
        { n: 6, type: "symptom", text: "Avoids, dislikes, or is reluctant to engage in tasks that require sustained mental effort" },
        { n: 7, type: "symptom", text: "Loses things necessary for tasks or activities (school assignments, pencils, or books)" },
        { n: 8, type: "symptom", text: "Is easily distracted by extraneous stimuli" },
        { n: 9, type: "symptom", text: "Is forgetful in daily activities" },
        { n: 10, type: "symptom", text: "Fidgets with hands or feet or squirms in seat" },
        { n: 11, type: "symptom", text: "Leaves seat in classroom or in other situations in which remaining seated is expected" },
        { n: 12, type: "symptom", text: "Runs about or climbs excessively in situations in which remaining seated is expected" },
        { n: 13, type: "symptom", text: "Has difficulty playing or engaging in leisure activities quietly" },
        { n: 14, type: "symptom", text: "Is “on the go” or often acts as if “driven by a motor”" },
        { n: 15, type: "symptom", text: "Talks excessively" },
        { n: 16, type: "symptom", text: "Blurts out answers before questions have been completed" },
        { n: 17, type: "symptom", text: "Has difficulty waiting in line" },
        { n: 18, type: "symptom", text: "Interrupts or intrudes on others (eg, butts into conversations/games)" },
        { n: 19, type: "symptom", text: "Loses temper" },
        { n: 20, type: "symptom", text: "Actively defies or refuses to comply with adult’s requests or rules" },
        { n: 21, type: "symptom", text: "Is angry or resentful" },
        { n: 22, type: "symptom", text: "Is spiteful and vindictive" },
        { n: 23, type: "symptom", text: "Bullies, threatens, or intimidates others" },
        { n: 24, type: "symptom", text: "Initiates physical fights" },
        { n: 25, type: "symptom", text: "Lies to obtain goods for favors or to avoid obligations (eg, “cons” others)" },
        { n: 26, type: "symptom", text: "Is physically cruel to people" },
        { n: 27, type: "symptom", text: "Has stolen items of nontrivial value" },
        { n: 28, type: "symptom", text: "Deliberately destroys others’ property" },
        { n: 29, type: "symptom", text: "Is fearful, anxious, or worried" },
        { n: 30, type: "symptom", text: "Is self-conscious or easily embarrassed" },
        { n: 31, type: "symptom", text: "Is afraid to try new things for fear of making mistakes" },
        { n: 32, type: "symptom", text: "Feels worthless or inferior" },
        { n: 33, type: "symptom", text: "Blames self for problems; feels guilty" },
        { n: 34, type: "symptom", text: "Feels lonely, unwanted, or unloved; complains that “no one loves him or her”" },
        { n: 35, type: "symptom", text: "Is sad, unhappy, or depressed" },
        { n: 36, type: "perf", group: "Academic Performance", text: "Reading" },
        { n: 37, type: "perf", group: "Academic Performance", text: "Mathematics" },
        { n: 38, type: "perf", group: "Academic Performance", text: "Written expression" },
        { n: 39, type: "perf", group: "Classroom Behavioral Performance", text: "Relationship with peers" },
        { n: 40, type: "perf", group: "Classroom Behavioral Performance", text: "Following directions" },
        { n: 41, type: "perf", group: "Classroom Behavioral Performance", text: "Disrupting class" },
        { n: 42, type: "perf", group: "Classroom Behavioral Performance", text: "Assignment completion" },
        { n: 43, type: "perf", group: "Classroom Behavioral Performance", text: "Organizational skills" }
      ]
    },

    parentFollowup: {
      role: "parent",
      kind: "followup",
      title: "NICHQ Vanderbilt Assessment Follow-up—PARENT Informant",
      directions: "Each rating should be considered in the context of what is appropriate for the age of your child. Please think about your child’s behaviors since the last assessment scale was filled out when rating his/her behaviors.",
      verify: "VERIFY: owner to check transcription against the paper form",
      sideEffects: {
        question: "Has your child experienced any of the following side effects or problems in the past week?",
        scaleQuestion: "Are these side effects currently a problem?"
      },
      items: [
        { n: 1, type: "symptom", text: "Does not pay attention to details or makes careless mistakes with, for example, homework" },
        { n: 2, type: "symptom", text: "Has difficulty keeping attention to what needs to be done" },
        { n: 3, type: "symptom", text: "Does not seem to listen when spoken to directly" },
        { n: 4, type: "symptom", text: "Does not follow through when given directions and fails to finish activities (not due to refusal or failure to understand)" },
        { n: 5, type: "symptom", text: "Has difficulty organizing tasks and activities" },
        { n: 6, type: "symptom", text: "Avoids, dislikes, or does not want to start tasks that require ongoing mental effort" },
        { n: 7, type: "symptom", text: "Loses things necessary for tasks or activities (toys, assignments, pencils, or books)" },
        { n: 8, type: "symptom", text: "Is easily distracted by noises or other stimuli" },
        { n: 9, type: "symptom", text: "Is forgetful in daily activities" },
        { n: 10, type: "symptom", text: "Fidgets with hands or feet or squirms in seat" },
        { n: 11, type: "symptom", text: "Leaves seat when remaining seated is expected" },
        { n: 12, type: "symptom", text: "Runs about or climbs too much when remaining seated is expected" },
        { n: 13, type: "symptom", text: "Has difficulty playing or beginning quiet play activities" },
        { n: 14, type: "symptom", text: "Is “on the go” or often acts as if “driven by a motor”" },
        { n: 15, type: "symptom", text: "Talks too much" },
        { n: 16, type: "symptom", text: "Blurts out answers before questions have been completed" },
        { n: 17, type: "symptom", text: "Has difficulty waiting his or her turn" },
        { n: 18, type: "symptom", text: "Interrupts or intrudes in on others’ conversations and/or activities" },
        { n: 19, type: "perf", text: "Overall school performance" },
        { n: 20, type: "perf", text: "Reading" },
        { n: 21, type: "perf", text: "Writing" },
        { n: 22, type: "perf", text: "Mathematics" },
        { n: 23, type: "perf", text: "Relationship with parents" },
        { n: 24, type: "perf", text: "Relationship with siblings" },
        { n: 25, type: "perf", text: "Relationship with peers" },
        { n: 26, type: "perf", text: "Participation in organized activities (eg, teams)" }
      ]
    },

    teacherFollowup: {
      role: "teacher",
      kind: "followup",
      title: "NICHQ Vanderbilt Assessment Follow-up—TEACHER Informant",
      directions: "Each rating should be considered in the context of what is appropriate for the age of the child you are rating and should reflect that child’s behavior since the last assessment scale was filled out. Please indicate the number of weeks or months you have been able to evaluate the behaviors: ___________.",
      directionsNote: BLANK_NOTE,
      verify: "VERIFY: owner to check transcription against the paper form",
      sideEffects: {
        question: "Has the child experienced any of the following side effects or problems in the past week?",
        scaleQuestion: "Are these side effects currently a problem?"
      },
      // Items 1-18 are printed with the same wording as the parent follow-up (not the teacher initial).
      items: [
        { n: 1, type: "symptom", text: "Does not pay attention to details or makes careless mistakes with, for example, homework" },
        { n: 2, type: "symptom", text: "Has difficulty keeping attention to what needs to be done" },
        { n: 3, type: "symptom", text: "Does not seem to listen when spoken to directly" },
        { n: 4, type: "symptom", text: "Does not follow through when given directions and fails to finish activities (not due to refusal or failure to understand)" },
        { n: 5, type: "symptom", text: "Has difficulty organizing tasks and activities" },
        { n: 6, type: "symptom", text: "Avoids, dislikes, or does not want to start tasks that require ongoing mental effort" },
        { n: 7, type: "symptom", text: "Loses things necessary for tasks or activities (toys, assignments, pencils, or books)" },
        { n: 8, type: "symptom", text: "Is easily distracted by noises or other stimuli" },
        { n: 9, type: "symptom", text: "Is forgetful in daily activities" },
        { n: 10, type: "symptom", text: "Fidgets with hands or feet or squirms in seat" },
        { n: 11, type: "symptom", text: "Leaves seat when remaining seated is expected" },
        { n: 12, type: "symptom", text: "Runs about or climbs too much when remaining seated is expected" },
        { n: 13, type: "symptom", text: "Has difficulty playing or beginning quiet play activities" },
        { n: 14, type: "symptom", text: "Is “on the go” or often acts as if “driven by a motor”" },
        { n: 15, type: "symptom", text: "Talks too much" },
        { n: 16, type: "symptom", text: "Blurts out answers before questions have been completed" },
        { n: 17, type: "symptom", text: "Has difficulty waiting his or her turn" },
        { n: 18, type: "symptom", text: "Interrupts or intrudes in on others’ conversations and/or activities" },
        { n: 19, type: "perf", text: "Reading" },
        { n: 20, type: "perf", text: "Mathematics" },
        { n: 21, type: "perf", text: "Written expression" },
        { n: 22, type: "perf", text: "Relationship with peers" },
        { n: 23, type: "perf", text: "Following direction" },
        { n: 24, type: "perf", text: "Disrupting class" },
        { n: 25, type: "perf", text: "Assignment completion" },
        { n: 26, type: "perf", text: "Organizational skills" }
      ]
    }
  };

  // medical-data. Source: NICHQ Vanderbilt Assessment Scales, ©2002 AAP/NICHQ (rev 1102/0303), owner's PDF, pages 2-9
  // Symptom 0-3 and performance 1-5 are the printed values. The side-effect columns print no
  // numbers: 0-3 for None..Severe is our own coding.
  const SCALES = {
    symptom: [
      { value: 0, label: "Never" },
      { value: 1, label: "Occasionally" },
      { value: 2, label: "Often" },
      { value: 3, label: "Very Often" }
    ],
    perf: [
      { value: 1, label: "Excellent" },
      { value: 2, label: "Above Average" },
      { value: 3, label: "Average" },
      { value: 4, label: "Somewhat of a Problem" },
      { value: 5, label: "Problematic" }
    ],
    sideEffect: [
      { value: 0, label: "None" },
      { value: 1, label: "Mild" },
      { value: 2, label: "Moderate" },
      { value: 3, label: "Severe" }
    ]
  };

  // medical-data. Source: NICHQ Vanderbilt Assessment Follow-up forms, ©2002 AAP/NICHQ (rev 0303), owner's PDF, pages 7 and 9
  // Printed without the "—explain below" suffixes (no free text, owner, 2026-10-22).
  const SIDE_EFFECTS = [
    "Headache",
    "Stomachache",
    "Change of appetite",
    "Trouble sleeping",
    "Irritability in the late morning, late afternoon, or evening",
    "Socially withdrawn—decreased interaction with others",
    "Extreme sadness or unusual crying",
    "Dull, tired, listless behavior",
    "Tremors/feeling shaky",
    "Repetitive movements, tics, jerking, twitching, eye blinking",
    "Picking at skin or fingers, nail biting, lip or cheek chewing",
    "Sees or hears things that aren’t there"
  ];

  // Printed on all four forms as: "Is this evaluation based on a time when the child
  // [ ] was on medication [ ] was not on medication [ ] not sure?"
  const MEDICATION_QUESTION = "Is this evaluation based on a time when the child";

  // medical-data. Source: NICHQ Vanderbilt Assessment Scales, ©2002 AAP/NICHQ, owner's PDF, pages 2, 4, 6 and 8
  const MEDICATION = [
    { id: "on", label: "was on medication" },
    { id: "off", label: "was not on medication" },
    { id: "unsure", label: "not sure" }
  ];

  // Printed footers, word for word. The disclaimer differs by rater.
  const ATTRIBUTION = {
    copyright: "Copyright ©2002 American Academy of Pediatrics and National Initiative for Children’s Healthcare Quality",
    adaptedFrom: "Adapted from the Vanderbilt Rating Scales developed by Mark L. Wolraich, MD.",
    sideEffectsFrom: "Adapted from the Pittsburgh side effects scale, developed by William E. Pelham, Jr, PhD.",
    disclaimer: {
      parent: "The information contained in this publication should not be used as a substitute for the medical care and advice of your pediatrician. There may be variations in treatment that your pediatrician may recommend based on individual facts and circumstances.",
      teacher: "The recommendations in this publication do not indicate an exclusive course of treatment or serve as a standard of medical care. Variations, taking into account individual circumstances, may be appropriate."
    }
  };

  // Rater identity, from the owner's spec (no names): teachers pick a role and how long they have known the student.
  const TEACHER_ROLES = [
    { id: "homeroom", label: "Homeroom" },
    { id: "math", label: "Math" },
    { id: "ela", label: "ELA/Reading" },
    { id: "science", label: "Science" },
    { id: "socstudies", label: "Social studies" }, // added 2026-10-23 (owner); codes use V2.teacherRoles, not this order
    { id: "sped", label: "Special education" },
    { id: "other", label: "Other" }
  ];

  const TIME_KNOWN = [
    { id: "lt3m", label: "under 3 months" },
    { id: "3to6m", label: "3 to 6 months" },
    { id: "gt6m", label: "over 6 months" }
  ];

  function deepFreeze(o) {
    Object.values(o).forEach(function (v) { if (v && typeof v === "object") deepFreeze(v); });
    return Object.freeze(o);
  }

  window.PedsVanderbiltForms = deepFreeze({
    FORMS: FORMS,
    SCALES: SCALES,
    SIDE_EFFECTS: SIDE_EFFECTS,
    MEDICATION_QUESTION: MEDICATION_QUESTION,
    MEDICATION: MEDICATION,
    ATTRIBUTION: ATTRIBUTION,
    TEACHER_ROLES: TEACHER_ROLES,
    TIME_KNOWN: TIME_KNOWN
  });
})();
