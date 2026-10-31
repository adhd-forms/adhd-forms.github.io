/* ADHD QI Project (owner, 2026-10-31): the parent feedback page (feedback.html), reached by the QR the
   clinic prints. Sends only { usedPaper, easier, faster } to the owner's Google Sheet: never form
   answers, scores, codes, visit codes or names. Errors are ignored; the thank-you shows either way.
   Chart note: .claude/chart/2026-10-31-adhd-parent-rating.md (notes repo). */
(function () {
  "use strict";

  // The Google Apps Script web app URL (Deploy > Manage deployments > Web app). Until this is a
  // script.google.com address the page says "Not open yet" and sends nothing.
  const RATING_URL = "PASTE_WEB_APP_URL_HERE";
  const READY = /^https:\/\/script\.google\.com\//.test(RATING_URL);

  // One answer per phone: after sending, this phone shows the thank-you for 29 days (the site's
  // usual clear). Only the time is kept, never the answers.
  const SENT_KEY = "adhd-forms-feedback-sent";
  const MAX_AGE = 29 * 24 * 60 * 60 * 1000;

  const $ = id => document.getElementById(id);
  let used = null, easier = null, faster = null, sent = false;

  function sentRecently() {
    try {
      const t = Number(localStorage.getItem(SENT_KEY));
      return t > 0 && Date.now() - t < MAX_AGE;
    } catch (e) { return false; }
  }

  function send(body) {
    try {
      fetch(RATING_URL, {
        method: "POST", mode: "no-cors", credentials: "omit", referrerPolicy: "no-referrer", keepalive: true,
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(body)
      }).catch(() => {});
    } catch (e) { /* the thank-you shows anyway */ }
  }

  function showOnly(id) {
    ["fb-form", "fb-thanks", "fb-closed"].forEach(s => { $(s).hidden = s !== id; });
  }

  // Once per page: repeat taps after the first send do nothing.
  function finish(body) {
    if (sent) return;
    sent = true;
    $("fb-form").querySelectorAll("input, button").forEach(el => { el.disabled = true; });
    send(body);
    try { localStorage.setItem(SENT_KEY, String(Date.now())); } catch (e) { /* storage off */ }
    showOnly("fb-thanks");
    $("fb-thanks").focus();
  }

  function scale(box, pick) {
    for (let v = 1; v <= 5; v++) {
      const id = box.id + "-" + v;
      const input = document.createElement("input");
      input.type = "radio"; input.name = box.id; input.id = id;
      // Screen readers hear the end label with 1, 3 and 5.
      if (v % 2) input.setAttribute("aria-describedby", box.id + "-end" + v);
      input.addEventListener("change", () => { pick(v); update(); });
      const label = document.createElement("label");
      label.htmlFor = id; label.textContent = String(v);
      box.append(input, label);
    }
  }

  function update() {
    $("fb-more").hidden = used !== "Yes";
    $("fb-send").disabled = !(easier && faster);
  }

  scale($("fb-easier"), v => { easier = v; });
  scale($("fb-faster"), v => { faster = v; });
  $("fb-paper-yes").addEventListener("change", () => { used = "Yes"; update(); });
  $("fb-paper-no").addEventListener("change", () => { used = "No"; finish({ usedPaper: "No" }); });
  $("fb-send").addEventListener("click", () => {
    if (used === "Yes" && easier && faster) finish({ usedPaper: "Yes", easier: easier, faster: faster });
  });

  if (!READY) showOnly("fb-closed");
  else if (sentRecently()) showOnly("fb-thanks");
  else showOnly("fb-form");

  if (window.PedsShared) window.PedsShared.init();
})();
