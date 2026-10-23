/* Pediatric Tools: words the Vanderbilt pages show, apart from the form text itself.
   To add Spanish later: copy this file to vanderbilt-strings-es.js, change `en` to `es`, translate
   every value (keep the keys and the {placeholders}), and load it after this one. Missing keys fall
   back to English. The form text (questions, scales) lives in vanderbilt-forms.js. */
(function () {
  "use strict";
  window.PedsVanderbiltStrings = window.PedsVanderbiltStrings || {};
  window.PedsVanderbiltStrings.en = {
    kindInitial: "First visit",
    kindFollowup: "Follow-up",
    slotP1: "Parent 1", slotP2: "Parent 2", slotT1: "Teacher 1", slotT2: "Teacher 2",

    startTitle: "Start your form",
    startIntro: "Use the visit code on the handout from your child's clinic. Your answers stay on this phone until you send them; nothing is saved on a website.",
    startCode: "Visit code",
    startCodeHint: "8 letters and numbers, like 7KQ4-M9XD",
    startKind: "Form",
    startWho: "I am",
    startGo: "Start",
    startTeacherNote: "Teachers: please use the link the parent sent you.",
    resultLinkNote: "This is a results link. Open it on the parent's phone or at the clinic.",

    setupWho: "You are filling out: {who} · {kind} · visit {visit}",
    setupRole: "Which teacher are you?",
    setupTime: "How long have you known this student?",
    setupNeedTeacher: "Please choose both before starting.",
    setupMedQuestion: "{lead} …?",
    setupNeedMed: "Please answer the medication question.",
    setupStart: "Start",
    backToPacket: "Back to your child's forms",

    progress: "Question {n} of {total}",
    sectionSymptoms: "Symptoms",
    sectionPerformance: "Performance",
    sectionSideEffects: "Side effects",
    back: "Back",
    skip: "Answer later",

    reviewTitle: "Check your answers",
    reviewAllDone: "All {total} questions answered.",
    reviewSkipped: "{n} still to answer. Tap one to answer it.",
    reviewSkippedRow: "Not answered",
    reviewSetupRow: "Medication question (and, for teachers, your role and how long you have known the student)",
    reviewNeedAll: "Answer every question to finish ({n} left).",
    reviewSubmit: "Submit",
    reviewError: "Something went wrong. Please go back and check your answers.",

    doneTitle: "Thank you",
    doneIntro: "Your answers are ready to send. Keep this page until they reach the parent or the clinic.",
    doneQrLabel: "QR code of the results link",
    packetQrLabel: "QR code of all the forms for this visit",
    doneCode: "Backup code",
    doneCodeHint: "If the link doesn't work, this code can be typed in at the clinic.",
    doneVisit: "Visit {visit}",
    doneCopy: "Copy link",
    doneCopied: "Copied",

    // returning results (teachers, or a parent on their own phone)
    doneSendParent: "Send results to parent",
    donePrint: "Print or save PDF",
    printLine: "Give this page to the parent or send them the QR code, so they can bring it to their physician.",
    printTitle: "ADHD Rating Form ({who}) {date}",
    whoTeacher: "Teacher",
    whoParent: "Parent",

    // the parent's packet
    packetTitle: "Your child's forms",
    packetIntro: "Everything for visit {visit} in one place. Send the forms to teachers, then send the finished set to your child's doctor.",
    rowDone: "{who}: done",
    rowWaiting: "{who}: sent, waiting",
    rowNotSent: "{who}: not sent",
    send: "Send",
    resend: "Resend",
    fillHere: "Fill in on this phone",
    sendLink: "Send link",
    sendDoctor: "Send to your doctor",
    showDoctor: "Show to doctor",
    addByCode: "Add a result by code",
    addByCodeHint: "Paste a link or type a backup code from a teacher or the other parent.",
    addGo: "Add",
    scanTeacher: "Scan a teacher's code",
    scanHint: "Point the camera at the QR code on the teacher's sheet or phone.",
    scanStop: "Stop",
    cameraNA: "Camera not available. Paste the link or type the code instead.",
    inviteNotResult: "That is a link for filling in a form, not finished answers. Send it to the person who should fill it in.",
    doctorSteps: "Copied. Now: 1. Open MyChart. 2. Start a message to your child's doctor. 3. Paste.",
    copyFallback: "Copy the text below and paste it.",
    startPacketHere: "This is my phone: start my packet here",
    clinicianLink: "Clinician? Open the report",
    shareTitle: "Scan with a phone camera, or copy the link",
    hidePanel: "Close",

    // prewritten messages
    msgTeacher: "Hello, could you fill in this short ADHD rating form about my child? It takes about 10 minutes on a phone and needs no names. {link}",
    msgParent2: "Could you fill in the ADHD rating form for our child's visit? It works on a phone. {link}",
    msgToParent: "Here are my answers to the ADHD rating form for visit {visit}: {link}",
    msgDoctor: "Here are the ADHD rating forms for my child's visit (visit code {visit}). Please open this link: {link}",

    clear: "Clear from this device",
    clearConfirm: "Remove every saved form, answer and packet from this phone?",
    cleared: "Cleared from this device.",

    footerQuestions: "Questions: NICHQ Vanderbilt Assessment Scales."
  };
})();
