# ADHD Rating Forms

https://adhd-forms.github.io/

NICHQ Vanderbilt ADHD rating forms for parents and teachers, filled in on a phone, and a clinic view (behind a clinician PIN) that merges every rater's results for a visit and copies a plain note for the chart.
- `index.html`: the form page for parents and teachers.
- `clinic.html`: the clinic view (PIN), with QR scanning, typed backup codes, the report, "Copy for Epic" and printable handouts.
- No server, no accounts, no analytics. Answers travel only inside links after `#` (never sent to a server), QR codes and typed codes, and stay in the browser's local storage on the parent's phone (cleared after 90 days or with one button).

## Backup codes

Every finished form also shows a typed **backup code**, for when a link or QR code can't be used (for example on a clinic computer without a camera).

- Letters and numbers only (Crockford base 32: no I, L, O or U; capitals or small letters both work), in blocks of 4 with dashes.
- Length: parent first-visit form 29 characters, teacher first-visit form 24, follow-up forms 22.
- The code doesn't contain the visit code, only a short tag made from it. On the clinic page, enter the **visit code** first (from the chart or the handout), then the backup codes. A code from another visit is flagged.
- The last two characters are checks: any single wrong character, two swapped neighbours, or any two wrong characters are caught, and a random mistyped code gets through only about 1 time in 1,000. Links and QR codes carry a stronger check and the full visit code.
- Every question must be answered before a form can be finished. Forms saved before that rule (October 2026) show a longer backup code that the clinic page still reads.

Third-party code, saved unchanged in `vendor/`: qrcode-generator 2.0.4 (MIT) and jsQR 1.4.0 (Apache License 2.0). See `credits.html`.

The working notes for this site are kept privately.
