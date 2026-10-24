/* Pediatric Tools: the Vanderbilt clinic page (vanderbilt-clinic.html), behind the clinician PIN.
   Add results by link or typed code (merged by visit code), see the report, copy a plain note for
   Epic. Nothing is stored: the packet lives in this tab and in the address after "#".
   The report and note wording come from vanderbilt-report.js and vanderbilt-note-template.js.
   Chart note: .claude/chart/2026-10-22-vanderbilt-clinic-page.md (notes repo). */
(function () {
  "use strict";

  const C = window.PedsVanderbiltCodes, Rep = window.PedsVanderbiltReport, F = window.PedsVanderbiltForms;
  const $ = id => document.getElementById(id);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };

  let packet = null;

  function setAddress() {
    history.replaceState(null, "", packet ? "#" + C.toLink(C.encodePacket(packet)).split("#")[1] : location.pathname);
  }

  // Adds a decoded result or packet. The first one starts the packet.
  function add(d) {
    if (d.type === "invite") return "That is a link for filling in a form, not a result.";
    if (!packet) {
      const v = d.value;
      packet = d.type === "packet" ? JSON.parse(JSON.stringify(v)) : C.merge({ visit: v.visit, kind: v.kind, sent: [], raters: {} }, v).packet;
      if (d.type === "result") packet.sent = []; // a single result: nobody else is known to be expected
      setAddress(); render();
      return d.type === "packet" ? "Packet opened: " + Object.keys(packet.raters).length + " result(s)." : C.raterLabel(v) + " results added.";
    }
    const m = C.merge(packet, d.value);
    if (m.ok) { packet = m.packet; setAddress(); render(); }
    return m.message;
  }

  $("add-go").addEventListener("click", () => {
    let d;
    // Typed backup codes carry only a visit tag: check them against the packet's visit, or the one entered.
    let visit = packet ? packet.visit : null;
    // A link carries its own visit code, so the field only matters for typed codes.
    if (!visit && $("visit-in").value.trim() && $("add-in").value.indexOf("#") < 0) {
      try { visit = C.parseVisitCode($("visit-in").value); } catch (e) { $("add-msg").textContent = e.message; return; }
    }
    try { d = C.decode($("add-in").value, visit); } catch (e) { $("add-msg").textContent = e.message; return; }
    // Never replace a visit code the user typed: a code for another visit is refused, not adopted.
    if (!packet && visit && d.value && d.value.visit && d.value.visit !== visit) {
      $("add-msg").textContent = "Visit codes don't match: " + C.formatVisitCode(visit) + " vs " + C.formatVisitCode(d.value.visit) + ". Nothing was added.";
      return;
    }
    // A short typed code never carries a comment (owner, 2026-10-24).
    $("add-msg").textContent = add(d) + (d.short ? " Typed codes don't carry comments; if they wrote one, ask for the link or QR." : "");
    $("add-in").value = "";
    $("add-label").firstChild.textContent = "Add another result";
  });
  $("add-in").addEventListener("keydown", e => { if (e.key === "Enter") $("add-go").click(); });

  // ---------- report ----------
  function screenItem(s, kind) {
    const li = el("li");
    li.append(el("span", null, s.label + ": " + s.positive + "/" + s.of + " "));
    if (kind === "followup" || s.need === null) {
      if (s.skipped) li.append(el("span", null, "(" + s.skipped + " skipped)"));
      return li;
    }
    if (s.met) li.append(el("span", "met", "met"));
    else if (s.couldBeMet) li.append(el("span", "could", s.skipped ? "could be met (" + s.skipped + " skipped)" : "could be met (performance items skipped)"));
    else li.append(el("span", null, "not met"));
    return li;
  }
  function raterBlock(r, kind) {
    const box = el("div", "rater");
    box.append(el("h3", null, r.label));
    if (r.error) { box.append(el("p", "msg", "Could not be read.")); return box; }
    const res = r.result, ul = el("ul");
    res.screens.forEach(s => ul.append(screenItem(s, kind)));
    const t = res.total;
    ul.append(el("li", null, "Total symptom score: " + t.sum + "/" + t.of * 3 + (t.answered < t.of ? " (" + t.answered + " of " + t.of + " answered)" : "")));
    const p = res.perf;
    let perf = p.impaired ? "Impairment: yes, in " + p.problems.map(x => x.text.toLowerCase()).join("; ")
      : p.answered === 0 ? "Performance: not answered"
      : p.skipped ? "Impairment: none marked, " + p.skipped + " skipped" : "Impairment: no";
    if (p.average !== null) perf += " · average " + p.average.toFixed(1);
    ul.append(el("li", null, perf));
    if (res.sideEffects) {
      const some = res.sideEffects.filter(x => x.value > 0);
      const any = res.sideEffects.some(x => x.value !== null);
      ul.append(el("li", null, "Side effects: " + (some.length ? some.map(x => x.text + " (" + x.label.toLowerCase() + ")").join("; ") : any ? "none reported" : "not answered")));
    }
    if (res.medication) ul.append(el("li", null, "Rated when the child " + res.medication.label + "."));
    if (r.comment && r.comment.trim()) ul.append(el("li", "comment", "Comments: " + r.comment)); // as written, text only
    box.append(ul);
    return box;
  }

  function table(title, rows, slots, scale) {
    const wrap = el("div");
    wrap.append(el("h3", null, title));
    const box = el("div", "table-box"), tb = el("table"), head = el("tr");
    head.append(el("th", null, "#"), el("th", null, "Item"));
    slots.forEach(s => head.append(el("th", null, s)));
    tb.append(head);
    rows.forEach(r => {
      const tr = el("tr", r.disagree ? "disagree" : null);
      tr.append(el("td", "n", String(r.n)), el("td", null, r.text));
      r.cells.forEach(c => {
        const td = el("td", "v" + (c.positive ? " pos" : "") + (c.problem ? " prob" : ""), c.value === null ? "–" : String(c.value));
        td.title = c.label || "skipped";
        tr.append(td);
      });
      tb.append(tr);
    });
    box.append(tb); wrap.append(box);
    return wrap;
  }

  // The visit code field follows the packet: filled and locked once there is one, empty otherwise.
  function syncVisit() {
    const v = $("visit-in");
    if (packet) { v.value = C.formatVisitCode(packet.visit); v.readOnly = true; }
    else { v.readOnly = false; }
  }
  function render() {
    syncVisit();
    $("empty").hidden = !!packet;
    $("report").hidden = !packet;
    if (!packet) return;
    const rep = Rep.build(packet);
    $("r-visit").textContent = rep.visitShown;
    $("r-kind").textContent = rep.kind === "initial" ? "Initial" : "Follow-up";
    $("r-note").textContent = Rep.noteText(rep);
    // Shown only if a VERIFY tag comes back: the owner checked the form text and scoring, 2026-10-23.
    const formVerify = rep.raters.some(r => F.FORMS[r.formId].verify);
    $("r-verify").hidden = !(formVerify || rep.verify.length);
    const raters = $("r-raters");
    raters.textContent = "";
    rep.raters.forEach(r => raters.append(raterBlock(r, rep.kind)));
    $("r-missing").hidden = !rep.missing.length;
    $("r-missing").textContent = "Missing: " + rep.missing.map(m => m.label).join(", ") + " (sent, not returned).";

    const tables = $("r-tables"), it = rep.itemTable;
    tables.textContent = "";
    if (it.slots.length) tables.append(table("Core symptoms (items 1-18)", it.core, it.slots));
    const pSlots = it.slots.filter(s => s[0] === "P"), tSlots = it.slots.filter(s => s[0] === "T");
    if (it.parentRows.length) tables.append(table("Parent form, items 19-47", it.parentRows, pSlots));
    if (it.teacherRows.length) tables.append(table("Teacher form, items 19-35", it.teacherRows, tSlots));
    rep.perfTable.forEach(t => {
      const rows = t.items.map(i => ({ n: i.n, text: (i.group ? i.group + ": " : "") + i.text, disagree: false,
        cells: [{ value: i.value, label: i.label, problem: i.problem }] }));
      tables.append(table("Performance: " + t.label, rows, [t.slot]));
    });
  }

  $("copy-epic").addEventListener("click", () => {
    const text = $("r-note").textContent, b = $("copy-epic");
    const ok = () => { b.textContent = "Copied"; setTimeout(() => { b.textContent = "Copy for Epic"; }, 1500); };
    const select = () => { const r = document.createRange(); r.selectNodeContents($("r-note")); getSelection().removeAllRanges(); getSelection().addRange(r); };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(ok, select);
    else select();
  });

  // ---------- QR scanner (vanderbilt-scan.js) ----------
  function found(text) {
    let d;
    try { d = C.decode(text); } catch (e) { $("add-msg").textContent = e.message; return; }
    const msg = add(d);
    $("add-msg").textContent = msg;
    $("add-label").firstChild.textContent = "Add another result";
    if (/results added|Packet opened/.test(msg)) window.PedsVanderbiltScanner.confetti();
  }
  const scanner = window.PedsVanderbiltScanner.create({
    video: $("scan-video"), canvas: $("scan-canvas"), panel: $("scanner"), onText: found,
    onError: () => { $("add-msg").textContent = "Camera not available. Paste the link or type the code instead."; }
  });
  const stopScan = scanner.stop;
  $("scan-go").addEventListener("click", scanner.start);
  $("scan-stop").addEventListener("click", stopScan);

  $("clear").addEventListener("click", () => {
    stopScan();
    if (packet && !confirm("Clear these results from this page?")) return;
    packet = null; setAddress(); $("visit-in").value = ""; render();
    $("add-msg").textContent = "Cleared.";
    $("add-label").firstChild.textContent = "Add a result";
  });

  // ---------- printable handouts: one page per family, each with a new visit code ----------
  function qrSvg(text, label) {
    const q = window.qrcode(0, "M");
    q.addData(text); q.make();
    const n = q.getModuleCount(), size = n + 8, NS = "http://www.w3.org/2000/svg";
    let d = "";
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (q.isDark(y, x)) d += "M" + (x + 4) + " " + (y + 4) + "h1v1h-1z";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 " + size + " " + size);
    svg.setAttribute("role", "img"); svg.setAttribute("aria-label", label);
    const bg = document.createElementNS(NS, "rect");
    bg.setAttribute("width", size); bg.setAttribute("height", size); bg.setAttribute("fill", "#FFFFFF");
    const path = document.createElementNS(NS, "path");
    path.setAttribute("d", d); path.setAttribute("fill", "#000000");
    svg.append(bg, path);
    return svg;
  }
  const HANDOUT_STEPS = [
    "Scan the code with your phone camera and answer the questions.",
    "On your phone, tap Send to teacher for each teacher.",
    "When the forms are done, tap Send to your doctor and paste it into a MyChart message, or bring your phone to the visit."
  ];
  // With teacher strips (owner, 2026-10-23): step 2 becomes "give each teacher a strip".
  const HANDOUT_STEPS_PAPER = [
    HANDOUT_STEPS[0],
    "Give each teacher one of the strips below (or tap Send to teacher on your phone).",
    HANDOUT_STEPS[2]
  ];
  const STRIP_TEXT = "Scan with your phone camera and answer the questions about this student (about 10 minutes, no names needed). When you finish, tap Send results to parent, or print the result page and give it to the parent.";
  function buildHandouts(kind, count, strips) {
    const box = $("handouts"), used = new Set();
    box.textContent = "";
    while (used.size < count) used.add(C.newVisitCode());
    used.forEach(visit => {
      const shown = C.formatVisitCode(visit), page = el("section", "handout");
      page.dataset.visit = visit;
      page.append(el("h2", null, "ADHD rating forms for your child's visit"),
        el("p", "h-kind", kind === "initial" ? "First visit" : "Follow-up"),
        el("p", "h-code", shown));
      const qr = el("div", "h-qr");
      qr.append(qrSvg(C.toLink(C.encodeInvite({ visit: visit, kind: kind, slot: "P1", paper: strips })), "QR code to start the form for visit " + shown));
      const ol = el("ol");
      (strips ? HANDOUT_STEPS_PAPER : HANDOUT_STEPS).forEach(s => ol.append(el("li", null, s)));
      page.append(qr, ol,
        el("p", "h-note", "No names or birthdays are asked. Answers stay on your phone until you send them."),
        el("p", "h-stub", "For the chart: visit code " + shown + " (staff, please write this in the chart)."));
      if (strips) {
        const row = el("div", "h-strips");
        ["T1", "T2"].forEach((slot, i) => {
          const strip = el("div", "h-strip");
          strip.dataset.slot = slot;
          const sq = el("div", "h-qr-small");
          sq.append(qrSvg(C.toLink(C.encodeInvite({ visit: visit, kind: kind, slot: slot })), "QR code for teacher " + (i + 1) + ", visit " + shown));
          strip.append(el("p", "h-strip-title", "For a teacher (Teacher " + (i + 1) + ")"), sq,
            el("p", "h-strip-code", shown), el("p", "h-strip-text", STRIP_TEXT));
          row.append(strip);
        });
        page.classList.add("with-strips");
        page.append(row);
      }
      box.append(page);
    });
  }
  $("h-print").addEventListener("click", () => {
    const n = Math.max(1, Math.min(50, Math.round(Number($("h-count").value)) || 1));
    $("h-count").value = n;
    buildHandouts($("h-kind").value === "followup" ? "followup" : "initial", n, $("h-strips").checked);
    document.body.classList.add("print-handouts");
    window.print();
  });
  addEventListener("afterprint", () => {
    document.body.classList.remove("print-handouts");
    $("handouts").textContent = ""; // the codes are never kept
  });

  function fromHash() {
    packet = null;
    $("add-msg").textContent = "";
    if (location.hash.length > 1) {
      try { $("add-msg").textContent = add(C.decode(location.hash)); }
      catch (e) { $("add-msg").textContent = e.message; history.replaceState(null, "", location.pathname); }
    }
    render();
  }
  addEventListener("hashchange", fromHash);
  fromHash();
  // For checks in the console only: run one frame through the same reader the scanner uses.
  window.PedsVanderbiltScan = { readFrame: scanner.readFrame, found: found, useDetector: scanner.useDetector };
  if (window.PedsShared) window.PedsShared.init();
})();
