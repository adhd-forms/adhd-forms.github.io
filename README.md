# ADHD Rating Forms

https://adhd-forms.github.io/

This is a project that integrates the NICHQ Vanderbilt ADHD rating forms for parents and teachers into a digital format and allows the forms to be filled in on a phone, and a clinic view (behind a clinician PIN) that merges and calculates each rater's results for a visit and allows for the results to be copied easily into an EMR chart.
- `index.html`: is the form page for parents and teachers.
- `clinic.html`: is the clinic view (hidden behind a PIN).
- This process does not require a server, accounts, or analytics. The answers travel only inside links after `#` (never sent to a server). Any QR code or typed codes will stay in the browser's local storage on the parent's phone (cleared after 29 days or by pressing a button on the page).
- Parent feedback (ADHD QI Project): three anonymous questions about the website (used the paper form before? easier? faster?) will be asked in a Microsoft Form, opened directly from a printed QR code, with responses in an Excel sheet. The form isn't set up yet, and the site's `feedback.html` page shows "Not open yet" and sends nothing. The rating forms themselves send nothing.
- `qi.html`: the QI project's first-cycle plan and a technical description of the site.

## Backup codes

The completed form will show a typed **backup code**, for when a link or QR code can't be used (for example on a clinic computer without a camera).

- Letters and numbers only (Crockford base 32: no I, L, O or U; capitals or small letters both work), in blocks of 4 with dashes.
- Length: parent first-visit form 29 characters, teacher first-visit form is 24 characters, and a follow-up form is 22 characters. If no comment is written.
- The code doesn't contain the visit code, only a short tag made from it. On the clinic page, enter the **visit code** first (from the chart or the handout), then the backup codes. If it is a code from another visit, it will be flagged.
- The last two characters are checks: if there is a wrong character, two swapped neighbor characters, or any two wrong characters, it will be caught. Also, a random mistyped code should get through only about 1 time in 1,000. URL links and QR codes carry a stronger check and the full visit code.
- Every question must be answered before a form can be finished. 

## SCARED anxiety forms

The Screen for Child Anxiety Related Disorders (SCARED), parent and child versions, on the same site.

- `scared.html`: the form page for a parent or a child, opened from the printed handout's QR codes (one page per family, a new visit code, one code for each form). Every question is required; once a form is submitted its answers can't be reopened, only its QR code, link and backup code remain. Families never see scores.
- `clinic.html`: reads SCARED links, QR codes and backup codes too, and shows the parent and child results side by side: total and five subscales, no combined score, and a note to copy into Epic.
- Links: `scared.html#a…` opens a form, `scared.html#s…` carries a finished one. Backup codes are 18 characters (`XXXX-XXXX-XXXX-XXXX-XX`), with the visit code entered once at the clinic.
- Files: `scared-forms.js` (questions), `scared-score.js` (scoring), `scared-codes.js` (links and backup codes), `scared-page.js`, `scared-report.js`, `scared-note-template.js` (the note's wording) and `scared-clinic.js`.

Third-party code, saved unchanged in `vendor/`: qrcode-generator 2.0.4 (MIT) and jsQR 1.4.0 (Apache License 2.0). See `credits.html`.
