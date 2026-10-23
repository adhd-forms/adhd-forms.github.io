# ADHD Rating Forms

https://adhd-forms.github.io/

NICHQ Vanderbilt ADHD rating forms for parents and teachers, filled in on a phone, and a clinic view (behind a clinician PIN) that merges every rater's results for a visit and copies a plain note for the chart. Part of [Pediatric Tools](https://christianrada-do.github.io/peds-tools/) by Dr. Christian Rada, DO.

- `index.html`: the form page for parents and teachers.
- `clinic.html`: the clinic view (PIN), with QR scanning, typed backup codes, the report, "Copy for Epic" and printable handouts.
- No server, no accounts, no analytics. Answers travel only inside links after `#` (never sent to a server), QR codes and typed codes, and stay in the browser's local storage on the parent's phone (cleared after 90 days or with one button).

Third-party code, saved unchanged in `vendor/`: qrcode-generator 2.0.4 (MIT) and jsQR 1.4.0 (Apache License 2.0). See `credits.html`.

The working notes for this site are kept privately.
