/* SCARED (Screen for Child Anxiety Related Disorders) parent and child forms as data (no scoring, no page code).
   Loaded by the SCARED pages before their own script:
     <script src="scared-forms.js?v=1"></script>
   Exposes only window.PedsScaredForms (frozen). Bump ?v= on every page that loads it whenever
   this file changes, and update sw.js PRECACHE once a page links it.

   Item text is copied word for word from the printed forms (owner's choice, 2026-11-05, like
   Vanderbilt, Milestones and Validation). Changes from the print, and only these: child item 11
   reads "I get stomachaches at school" (printed "My I get ...", corrected by the owner, 2026-11-05);
   line-break hyphens, double spaces and wrapped lines are undone; the "*" before the child form's
   note is dropped, since it points to nothing on the form. The owner approved these, 2026-11-05.
   The Name and Date lines and the page numbers are left out on purpose. Scoring rules are a separate file.
   Chart note: .claude/chart/2026-11-05-scared-forms-scoring.md (notes repo). */
(function () {
  "use strict";

  const TITLE = "Screen for Child Anxiety Related Disorders (SCARED)";

  // medical-data. Source: SCARED, Birmaher et al., 10/95, owner's PDF, printed pages 41-44
  // Checked word for word against the paper forms by the owner, 2026-11-05.
  const SCALE = [
    { value: 0, label: "Not True or Hardly Ever True" },
    { value: 1, label: "Somewhat True or Sometimes True" },
    { value: 2, label: "Very True or Often True" }
  ];

  // medical-data. Source: SCARED, Birmaher et al., 10/95, owner's PDF, printed pages 41-44
  // Checked word for word against the paper forms by the owner, 2026-11-05.
  const FORMS = {
    parent: {
      role: "parent",
      title: TITLE,
      version: "Parent Version",
      fillBy: "To be filled out by the PARENT",
      directions: "Below is a list of statements that describe how people feel. Read each statement carefully and decide if it is “Not True or Hardly Ever True” or “Somewhat True or Sometimes True” or “Very True or Often True” for your child. Then for each statement, fill in one circle that corresponds to the response that seems to describe your child for the last 3 months. Please respond to all statements as well as you can, even if some do not seem to concern your child.",
      items: [
        { n: 1, text: "When my child feels frightened, it is hard for him/her to breathe" },
        { n: 2, text: "My child gets headaches when he/she is at school" },
        { n: 3, text: "My child doesn’t like to be with people he/she doesn’t know well" },
        { n: 4, text: "My child gets scared if he/she sleeps away from home" },
        { n: 5, text: "My child worries about other people liking him/her" },
        { n: 6, text: "When my child gets frightened, he/she feels like passing out" },
        { n: 7, text: "My child is nervous" },
        { n: 8, text: "My child follows me wherever I go" },
        { n: 9, text: "People tell me that my child looks nervous" },
        { n: 10, text: "My child feels nervous with people he/she doesn’t know well" },
        { n: 11, text: "My child gets stomachaches at school" },
        { n: 12, text: "When my child gets frightened, he/she feels like he/she is going crazy" },
        { n: 13, text: "My child worries about sleeping alone" },
        { n: 14, text: "My child worries about being as good as other kids" },
        { n: 15, text: "When he/she gets frightened, he/she feels like things are not real" },
        { n: 16, text: "My child has nightmares about something bad happening to his/her parents" },
        { n: 17, text: "My child worries about going to school" },
        { n: 18, text: "When my child gets frightened, his/her heart beats fast" },
        { n: 19, text: "He/she gets shaky" },
        { n: 20, text: "My child has nightmares about something bad happening to him/her" },
        { n: 21, text: "My child worries about things working out for him/her" },
        { n: 22, text: "When my child gets frightened, he/she sweats a lot" },
        { n: 23, text: "My child is a worrier" },
        { n: 24, text: "My child gets really frightened for no reason at all" },
        { n: 25, text: "My child is afraid to be alone in the house" },
        { n: 26, text: "It is hard for my child to talk with people he/she doesn’t know well" },
        { n: 27, text: "When my child gets frightened, he/she feels like he/she is choking" },
        { n: 28, text: "People tell me that my child worries too much" },
        { n: 29, text: "My child doesn’t like to be away from his/her family" },
        { n: 30, text: "My child is afraid of having anxiety (or panic) attacks" },
        { n: 31, text: "My child worries that something bad might happen to his/her parents" },
        { n: 32, text: "My child feels shy with people he/she doesn’t know well" },
        { n: 33, text: "My child worries about what is going to happen in the future" },
        { n: 34, text: "When my child gets frightened, he/she feels like throwing up" },
        { n: 35, text: "My child worries about how well he/she does things" },
        { n: 36, text: "My child is scared to go to school" },
        { n: 37, text: "My child worries about things that have already happened" },
        { n: 38, text: "When my child gets frightened, he/she feels dizzy" },
        { n: 39, text: "My child feels nervous when he/she is with other children or adults and he/she has to do something while they watch him/her (for example: read aloud, speak, play a game, play a sport)" },
        { n: 40, text: "My child feels nervous when he/she is going to parties, dances, or any place where there will be people that he/she doesn’t know well" },
        { n: 41, text: "My child is shy" }
      ]
    },
    child: {
      role: "child",
      title: TITLE,
      version: "Child Version",
      fillBy: "To be filled out by the CHILD",
      directions: "Below is a list of sentences that describe how people feel. Read each phrase and decide if it is “Not True or Hardly Ever True” or “Somewhat True or Sometimes True” or “Very True or Often True” for you. Then for each sentence, fill in one circle that corresponds to the response that seems to describe you for the last 3 months.",
      note: "For children ages 8 to 11, it is recommended that the clinician explain all questions, or have the child answer the questionnaire sitting with an adult in case they have any questions.",
      items: [
        { n: 1, text: "When I feel frightened, it is hard for me to breathe" },
        { n: 2, text: "I get headaches when I am at school" },
        { n: 3, text: "I don’t like to be with people I don’t know well" },
        { n: 4, text: "I get scared if I sleep away from home" },
        { n: 5, text: "I worry about other people liking me" },
        { n: 6, text: "When I get frightened, I feel like passing out" },
        { n: 7, text: "I am nervous" },
        { n: 8, text: "I follow my mother or father wherever they go" },
        { n: 9, text: "People tell me that I look nervous" },
        { n: 10, text: "I feel nervous with people I don’t know well" },
        { n: 11, text: "I get stomachaches at school" },
        { n: 12, text: "When I get frightened, I feel like I am going crazy" },
        { n: 13, text: "I worry about sleeping alone" },
        { n: 14, text: "I worry about being as good as other kids" },
        { n: 15, text: "When I get frightened, I feel like things are not real" },
        { n: 16, text: "I have nightmares about something bad happening to my parents" },
        { n: 17, text: "I worry about going to school" },
        { n: 18, text: "When I get frightened, my heart beats fast" },
        { n: 19, text: "I get shaky" },
        { n: 20, text: "I have nightmares about something bad happening to me" },
        { n: 21, text: "I worry about things working out for me" },
        { n: 22, text: "When I get frightened, I sweat a lot" },
        { n: 23, text: "I am a worrier" },
        { n: 24, text: "I get really frightened for no reason at all" },
        { n: 25, text: "I am afraid to be alone in the house" },
        { n: 26, text: "It is hard for me to talk with people I don’t know well" },
        { n: 27, text: "When I get frightened, I feel like I am choking" },
        { n: 28, text: "People tell me that I worry too much" },
        { n: 29, text: "I don’t like to be away from my family" },
        { n: 30, text: "I am afraid of having anxiety (or panic) attacks" },
        { n: 31, text: "I worry that something bad might happen to my parents" },
        { n: 32, text: "I feel shy with people I don’t know well" },
        { n: 33, text: "I worry about what is going to happen in the future" },
        { n: 34, text: "When I get frightened, I feel like throwing up" },
        { n: 35, text: "I worry about how well I do things" },
        { n: 36, text: "I am scared to go to school" },
        { n: 37, text: "I worry about things that have already happened" },
        { n: 38, text: "When I get frightened, I feel dizzy" },
        { n: 39, text: "I feel nervous when I am with other children or adults and I have to do something while they watch me (for example: read aloud, speak, play a game, play a sport)" },
        { n: 40, text: "I feel nervous when I am going to parties, dances, or any place where there will be people that I don’t know well" },
        { n: 41, text: "I am shy" }
      ]
    }
  };

  const ATTRIBUTION = "Developed by Boris Birmaher, MD, Suneeta Khetarpal, MD, Marlane Cully, MEd, David Brent, MD, and Sandra McKenzie, PhD. Western Psychiatric Institute and Clinic, University of Pgh. (10/95). Email: birmaherb@msx.upmc.edu";

  function deepFreeze(o) {
    Object.values(o).forEach(function (v) { if (v && typeof v === "object") deepFreeze(v); });
    return Object.freeze(o);
  }

  window.PedsScaredForms = deepFreeze({
    SCALE: SCALE,
    FORMS: FORMS,
    ATTRIBUTION: ATTRIBUTION
  });
})();
