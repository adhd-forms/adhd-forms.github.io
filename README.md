# ADHD Rating Forms

https://adhd-forms.github.io/

This is a project that integrates the NICHQ Vanderbilt ADHD rating forms for parents and teachers into a digital format and allows the forms to be filled in on a phone, and a clinic view (behind a clinician PIN) that merges and calculates each rater's results for a visit and allows for the results to be copied easily into an EMR chart.
- `index.html`: is the form page for parents and teachers.
- `clinic.html`: is the clinic view (hidden behind a PIN).
- This process does not require a server, accounts, or analytics. The answers travel only inside links after `#` (never sent to a server). Any QR code or typed codes will stay in the browser's local storage on the parent's phone (cleared after 29 days or by pressing a button on the page).

## Backup codes

The completed form will show a typed **backup code**, for when a link or QR code can't be used (for example on a clinic computer without a camera).

- Letters and numbers only (Crockford base 32: no I, L, O or U; capitals or small letters both work), in blocks of 4 with dashes.
- Length: parent first-visit form 29 characters, teacher first-visit form is 24 characters, and a follow-up form is 22 characters. If no comment is written.
- The code doesn't contain the visit code, only a short tag made from it. On the clinic page, enter the **visit code** first (from the chart or the handout), then the backup codes. If it is a code from another visit, it will be flagged.
- The last two characters are checks: if there is a wrong character, two swapped neighbor characters, or any two wrong characters, it will be caught. Also, a random mistyped code should get through only about 1 time in 1,000. URL links and QR codes carry a stronger check and the full visit code.
- Every question must be answered before a form can be finished. 

Third-party code, saved unchanged in `vendor/`: qrcode-generator 2.0.4 (MIT) and jsQR 1.4.0 (Apache License 2.0). See `credits.html`.
