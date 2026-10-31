/* ADHD QI Project (owner, 2026-10-31): an anonymous rating a parent gives after finishing a form.
   Sends only { usedPaper, easier, faster } to the owner's Google Sheet, never answers, scores, codes,
   visit codes or names. The form never waits on it: errors are ignored and the page moves on at once.
   Chart note: .claude/chart/2026-10-31-adhd-parent-rating.md (notes repo). */
(function () {
  "use strict";

  // The Google Apps Script web app URL (Deploy > Manage deployments > Web app). Nothing is sent
  // until this is a script.google.com address.
  const RATING_URL = "PASTE_WEB_APP_URL_HERE";

  const $ = id => document.getElementById(id);
  let onDone = null, used = null, easier = null, faster = null;

  // Until the real URL is pasted in, the page skips the rating screen (answers would go nowhere).
  const READY = /^https:\/\/script\.google\.com\//.test(RATING_URL);

  function send(body) {
    if (!READY) return;
    try {
      fetch(RATING_URL, {
        method: "POST", mode: "no-cors", credentials: "omit", referrerPolicy: "no-referrer", keepalive: true,
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(body)
      }).catch(() => {});
    } catch (e) { /* never let the rating stop the form */ }
  }

  // Once per start(): repeat taps after the first send do nothing.
  function finish(body) {
    if (!onDone) return;
    const next = onDone;
    onDone = null;
    $("s-rating").querySelectorAll("input, button").forEach(el => { el.disabled = true; });
    send(body);
    next();
  }

  function scale(box, pick) {
    box.querySelectorAll("input, label").forEach(e => e.remove());
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
    $("rate-more").hidden = used !== "Yes";
    $("rate-send").hidden = used !== "Yes";
    $("rate-send").disabled = !(easier && faster);
  }

  ["yes", "no"].forEach(k => {
    $("rate-paper-" + k).addEventListener("change", () => {
      used = k === "yes" ? "Yes" : "No";
      if (used === "No") return finish({ usedPaper: "No" });
      update();
    });
  });
  $("rate-send").addEventListener("click", () => {
    if (used === "Yes" && easier && faster) finish({ usedPaper: "Yes", easier: easier, faster: faster });
  });

  // done: called once, when the parent has answered; the page then shows its usual next screen.
  function start(done) {
    onDone = done;
    used = easier = faster = null;
    $("s-rating").querySelectorAll("input, button").forEach(el => { el.disabled = false; });
    $("rate-paper-yes").checked = $("rate-paper-no").checked = false;
    scale($("rate-easier-row"), v => { easier = v; });
    scale($("rate-faster-row"), v => { faster = v; });
    update();
  }

  window.PedsVanderbiltRating = { ready: READY, start: start };
})();
