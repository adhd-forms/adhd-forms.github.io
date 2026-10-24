/* ADHD Rating Forms: Vanderbilt visit codes, links, typed backup codes and packet merging.
   No server: answers travel only inside links (after "#", never sent to a server), QR codes
   and typed codes. Load after the form data:
     <script src="vanderbilt-forms.js?v=2"></script>
     <script src="vanderbilt-codes.js?v=2"></script>
   Exposes only window.PedsVanderbiltCodes. Bump ?v= on every page that loads it when it changes.

   Links, QR codes and long typed codes: bytes = [header][body][CRC-16]. Header = version (high 4 bits:
   1 to 3) + type (low 4 bits: 1 rater result, 2 packet, 3 invite). Body = one mixed-radix number,
   first field in the lowest digits. v2 (2026-10-23) = v1 with seven teacher roles.
   v3 (2026-10-24) = v2 plus one comment per rater, after its answers (short typed codes never carry it).
   Short typed backup codes (2026-10-23): see SHORT below (no visit code inside, two Damm checks).
   Never change the V1, V2 or SHORT tables: old links and codes must keep decoding.
   Chart notes: .claude/chart/2026-10-22-vanderbilt-encoding.md, 2026-10-23-vanderbilt-short-codes.md. */
(function () {
  "use strict";

  if (!window.PedsVanderbiltForms) throw new Error("vanderbilt-codes.js needs vanderbilt-forms.js loaded first");

  // Page that opens links (the tool's own site since 2026-10-23; every link and printed QR carries it).
  const BASE = "https://adhd-forms.github.io/";

  const VERSION = 3; // links, QR codes and long typed codes are written as v3; v1 and v2 still decode
  const TYPES = { result: 1, packet: 2, invite: 3 };
  const LINK_LETTER = { result: "r", packet: "p", invite: "i" };

  // ---------- v1 tables (frozen forever) ----------
  const V1 = {
    kinds: ["initial", "followup"],
    slots: ["P1", "P2", "T1", "T2"],
    // Item layout per form: "s" = symptom (0-3), "p" = performance (1-5), in item order.
    layout: {
      parentInitial: "s".repeat(47) + "p".repeat(8),
      teacherInitial: "s".repeat(35) + "p".repeat(8),
      parentFollowup: "s".repeat(18) + "p".repeat(8),
      teacherFollowup: "s".repeat(18) + "p".repeat(8)
    },
    sideEffects: 12,
    teacherRoles: ["homeroom", "math", "ela", "science", "sped", "other"],
    timeKnown: ["lt3m", "3to6m", "gt6m"],
    medication: ["on", "off", "unsure"]
  };
  // ---------- v2 link tables (frozen forever; owner, 2026-10-23) ----------
  // Same layout as v1, but the teacher role has radix 8: the v1 six keep their numbers, then social studies.
  const V2 = { teacherRoles: V1.teacherRoles.concat(["socstudies"]) };
  const rolesFor = function (version) { return version === 1 ? V1.teacherRoles : V2.teacherRoles; };
  const SLOT_NAME = { P1: "Parent 1", P2: "Parent 2", T1: "Teacher 1", T2: "Teacher 2" };

  function formId(slot, kind) {
    return (slot[0] === "P" ? "parent" : "teacher") + (kind === "initial" ? "Initial" : "Followup");
  }
  function fail(msg) { throw new Error(msg); }
  const DAMAGED = "This code has a typo or is damaged. Check it and try again.";

  // ---------- visit codes ----------
  const VISIT_ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ"; // 30 symbols: no 0 O 1 I L (and no U)

  function newVisitCode() {
    let out = "";
    const buf = new Uint8Array(1);
    while (out.length < 8) {
      crypto.getRandomValues(buf);
      if (buf[0] < 240) out += VISIT_ALPHABET[buf[0] % 30]; // 240 = 8 × 30, so every symbol is equally likely
    }
    return out;
  }
  function parseVisitCode(text) {
    const s = String(text || "").toUpperCase().replace(/[\s-]/g, "");
    if (s.length !== 8 || [...s].some(function (c) { return VISIT_ALPHABET.indexOf(c) < 0; })) {
      fail("A visit code is 8 letters and numbers, like 7KQ4-M9XD.");
    }
    return s;
  }
  function formatVisitCode(code) { const s = parseVisitCode(code); return s.slice(0, 4) + "-" + s.slice(4); }

  // ---------- mixed-radix packing ----------
  function Writer() { this.fields = []; }
  Writer.prototype.put = function (value, radix, what) {
    if (!Number.isInteger(value) || value < 0 || value >= radix) fail("Can't encode " + what + ": " + value);
    this.fields.push([value, radix]);
  };
  Writer.prototype.toBigInt = function () {
    let acc = 0n;
    for (let i = this.fields.length - 1; i >= 0; i--) acc = acc * BigInt(this.fields[i][1]) + BigInt(this.fields[i][0]);
    return acc;
  };
  function Reader(n) { this.n = n; }
  Reader.prototype.get = function (radix) {
    const r = BigInt(radix);
    const v = Number(this.n % r);
    this.n = this.n / r;
    return v;
  };

  function bigToBytes(n) {
    const out = [];
    while (n > 0n) { out.unshift(Number(n & 255n)); n >>= 8n; }
    return out;
  }
  function bytesToBig(bytes) {
    let n = 0n;
    for (const b of bytes) n = (n << 8n) | BigInt(b);
    return n;
  }

  function crc16(bytes) {
    let crc = 0xFFFF;
    for (const b of bytes) {
      crc ^= b << 8;
      for (let i = 0; i < 8; i++) crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xFFFF : (crc << 1) & 0xFFFF;
    }
    return crc;
  }

  // ---------- fields ----------
  function idIndex(list, id, what) {
    if (id === null || id === undefined) return 0;
    const i = list.indexOf(id);
    if (i < 0) fail("Can't encode " + what + ": " + id);
    return i + 1;
  }
  function idAt(list, i) { if (i > list.length) fail(DAMAGED); return i === 0 ? null : list[i - 1]; }

  function putVisit(w, visit) {
    const s = parseVisitCode(visit);
    for (const c of s) w.put(VISIT_ALPHABET.indexOf(c), 30, "visit code");
  }
  function getVisit(r) {
    let s = "";
    for (let i = 0; i < 8; i++) s += VISIT_ALPHABET[r.get(30)];
    return s;
  }

  // An answer must be a whole number in its scale; it is stored as 1 + its position (0 = skipped).
  // Anything else throws, so a bad value can never be packed as "skipped" or as another answer.
  function answerDigit(v, lo, hi, what) {
    if (typeof v !== "number" || !Number.isInteger(v) || v < lo || v > hi) fail("Can't encode " + what + ": " + v);
    return v - lo + 1;
  }

  // v3 comment (owner, 2026-10-24): at most 200 characters, a character being a UTF-16 code unit
  // (String.length). Control characters and bidi controls are refused, so a comment can't reorder the
  // clinic's lines. Stored as its UTF-8 length (radix 601: 200 units × at most 3 bytes), then each byte.
  const COMMENT_MAX = 200;
  const COMMENT_FORBIDDEN = /[\u0000-\u001F\u007F-\u009F‪-‮⁦-⁩]/;
  function putComment(w, comment) {
    const s = comment === undefined || comment === null ? "" : comment;
    if (typeof s !== "string" || s.length > COMMENT_MAX || COMMENT_FORBIDDEN.test(s)) fail("Can't encode comment");
    const bytes = new TextEncoder().encode(s);
    w.put(bytes.length, COMMENT_MAX * 3 + 1, "comment length");
    bytes.forEach(function (b) { w.put(b, 256, "comment"); });
  }
  function getComment(r) {
    const len = r.get(COMMENT_MAX * 3 + 1), bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = r.get(256);
    let s;
    try { s = new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch (e) { fail(DAMAGED); }
    if (s.length > COMMENT_MAX || COMMENT_FORBIDDEN.test(s)) fail(DAMAGED);
    return s;
  }

  // Rater fields and answers (no visit code, kind or slot: those come from the wrapper).
  function putRater(w, slot, kind, res) {
    const teacher = slot[0] === "T", roles = rolesFor(VERSION);
    if (!teacher && (res.teacherRole || res.timeKnown)) fail("Can't encode teacher details for a parent");
    w.put(idIndex(roles, res.teacherRole, "teacher role"), roles.length + 1, "teacher role");
    w.put(idIndex(V1.timeKnown, res.timeKnown, "time known"), 4, "time known");
    w.put(idIndex(V1.medication, res.medication, "medication"), 4, "medication");
    const layout = V1.layout[formId(slot, kind)];
    const answers = res.answers || {};
    Object.keys(answers).forEach(function (k) {
      if (!/^[1-9][0-9]*$/.test(k) || Number(k) > layout.length) fail("Can't encode answer for item " + k);
    });
    for (let n = 1; n <= layout.length; n++) {
      const v = answers[n] === undefined ? null : answers[n];
      if (layout[n - 1] === "s") w.put(v === null ? 0 : answerDigit(v, 0, 3, "item " + n), 5, "item " + n);
      else w.put(v === null ? 0 : answerDigit(v, 1, 5, "item " + n), 6, "item " + n); // 1-5 stored as 1-5, 0 = skipped
    }
    const se = res.sideEffects;
    if (kind === "initial") {
      if (se !== null && se !== undefined) fail("Can't encode side effects on an initial form");
    } else {
      if (se !== null && se !== undefined && (!Array.isArray(se) || se.length !== V1.sideEffects)) fail("Can't encode side effects: need a list of 12");
      for (let i = 0; i < V1.sideEffects; i++) {
        const v = se && se[i] !== undefined ? se[i] : null;
        w.put(v === null ? 0 : answerDigit(v, 0, 3, "side effect " + (i + 1)), 5, "side effect " + (i + 1));
      }
    }
    putComment(w, res.comment); // v3
  }
  function getRater(r, visit, kind, slot, version) {
    const res = { visit: visit, kind: kind, slot: slot }, roles = rolesFor(version);
    res.teacherRole = idAt(roles, r.get(roles.length + 1));
    res.timeKnown = idAt(V1.timeKnown, r.get(4));
    res.medication = idAt(V1.medication, r.get(4));
    if (slot[0] === "P" && (res.teacherRole || res.timeKnown)) fail(DAMAGED);
    const layout = V1.layout[formId(slot, kind)];
    res.answers = {};
    for (let n = 1; n <= layout.length; n++) {
      if (layout[n - 1] === "s") { const v = r.get(5); res.answers[n] = v === 0 ? null : v - 1; }
      else { const v = r.get(6); res.answers[n] = v === 0 ? null : v; }
    }
    if (kind === "initial") res.sideEffects = null;
    else {
      res.sideEffects = [];
      for (let i = 0; i < V1.sideEffects; i++) { const v = r.get(5); res.sideEffects.push(v === 0 ? null : v - 1); }
    }
    if (version >= 3) res.comment = getComment(r);
    return res;
  }

  // Invites carry no rater, so v3 changed nothing in them: they stay v2, byte-identical, and an older
  // saved copy of the page still opens a new handout.
  function wrap(type, w) {
    const body = bigToBytes(w.toBigInt());
    const head = [((type === "invite" ? 2 : VERSION) << 4) | TYPES[type]].concat(body);
    const c = crc16(head);
    return head.concat([c >> 8, c & 255]);
  }

  function encodeResult(res) {
    const w = new Writer();
    putVisit(w, res.visit);
    w.put(V1.kinds.indexOf(res.kind), 2, "kind");
    w.put(V1.slots.indexOf(res.slot), 4, "slot");
    putRater(w, res.slot, res.kind, res);
    return wrap("result", w);
  }
  function encodePacket(p) {
    const w = new Writer();
    putVisit(w, p.visit);
    w.put(V1.kinds.indexOf(p.kind), 2, "kind");
    const raters = p.raters || {};
    let sent = 0, present = 0;
    V1.slots.forEach(function (s, i) {
      if ((p.sent || []).indexOf(s) >= 0) sent |= 1 << i;
      if (raters[s]) present |= 1 << i;
    });
    Object.keys(raters).forEach(function (s) { if (V1.slots.indexOf(s) < 0) fail("Can't encode slot " + s); });
    (p.sent || []).forEach(function (s) { if (V1.slots.indexOf(s) < 0) fail("Can't encode slot " + s); });
    w.put(sent, 16, "sent");
    w.put(present, 16, "present");
    V1.slots.forEach(function (s) { if (raters[s]) putRater(w, s, p.kind, raters[s]); });
    return wrap("packet", w);
  }
  function encodeInvite(inv) {
    const w = new Writer();
    putVisit(w, inv.visit);
    w.put(V1.kinds.indexOf(inv.kind), 2, "kind");
    w.put(V1.slots.indexOf(inv.slot), 4, "slot");
    // Added 2026-10-23, last so that 0 (no) leaves every earlier invite byte-identical:
    // 1 = this parent's teachers were given paper strips (the packet then expects T1 and T2).
    w.put(inv.paper ? 1 : 0, 2, "paper");
    return wrap("invite", w);
  }

  function decodeLink(version, type, body) {
    const r = new Reader(bytesToBig(body));
    const visit = getVisit(r);
    const kind = V1.kinds[r.get(2)];
    let value;
    if (type === "result") {
      value = getRater(r, visit, kind, V1.slots[r.get(4)], version);
    } else if (type === "invite") {
      value = { visit: visit, kind: kind, slot: V1.slots[r.get(4)] };
      if (r.get(2) === 1) value.paper = true;
    } else {
      const sentBits = r.get(16), presentBits = r.get(16);
      value = { visit: visit, kind: kind, sent: [], raters: {} };
      V1.slots.forEach(function (s, i) {
        if (sentBits & (1 << i)) value.sent.push(s);
      });
      if (sentBits > 15 || presentBits > 15) fail(DAMAGED);
      V1.slots.forEach(function (s, i) {
        if (presentBits & (1 << i)) value.raters[s] = getRater(r, visit, kind, s, version);
      });
    }
    if (r.n !== 0n) fail(DAMAGED); // leftover digits: not a real payload
    return value;
  }
  const DECODERS = {
    1: function (type, body) { return decodeLink(1, type, body); },
    2: function (type, body) { return decodeLink(2, type, body); },
    3: function (type, body) { return decodeLink(3, type, body); }
  };

  function decodeBytes(bytes) {
    if (bytes.length < 4) fail(DAMAGED);
    const c = crc16(bytes.slice(0, -2));
    if (bytes[bytes.length - 2] !== c >> 8 || bytes[bytes.length - 1] !== (c & 255)) fail(DAMAGED);
    const version = bytes[0] >> 4;
    const type = Object.keys(TYPES).find(function (k) { return TYPES[k] === (bytes[0] & 15); });
    if (!DECODERS[version]) fail(version > VERSION ? "This code is from a newer version of the app. Reload the page and try again." : DAMAGED);
    if (!type) fail(DAMAGED);
    return { type: type, version: version, value: DECODERS[version](type, bytes.slice(1, -2)) };
  }

  // ---------- text forms ----------
  const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  const B32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"; // Crockford: no I L O U

  function bitsToText(bytes, per, alphabet) {
    let out = "", acc = 0, n = 0;
    for (const b of bytes) {
      acc = (acc << 8) | b; n += 8;
      while (n >= per) { n -= per; out += alphabet[(acc >> n) & ((1 << per) - 1)]; }
      acc &= (1 << n) - 1;
    }
    if (n > 0) out += alphabet[(acc << (per - n)) & ((1 << per) - 1)];
    return out;
  }
  function textToBits(values, per) {
    const bytes = [];
    let acc = 0, n = 0;
    for (const v of values) {
      acc = (acc << per) | v; n += per;
      if (n >= 8) { n -= 8; bytes.push((acc >> n) & 255); acc &= (1 << n) - 1; }
    }
    if (n >= per || acc !== 0) fail(DAMAGED); // a stray character or non-zero padding bits
    return bytes;
  }

  function toLink(bytes) {
    const type = Object.keys(TYPES).find(function (k) { return TYPES[k] === (bytes[0] & 15); });
    return BASE + "#" + LINK_LETTER[type] + bitsToText(bytes, 6, B64);
  }
  // Long typed form: the whole link payload in base 32 (CRC-16 checked). Used for old v1 codes and for
  // results that aren't complete (forms saved before every question became required).
  // 22, 24 and 29 characters belong to short codes only (owner, 2026-10-23: no old codes exist), so a long
  // code that would land on one of those lengths gets one leading zero byte in its body (same number,
  // one character longer or more). A short code with typos can then never be read as a long one.
  function toTypedLong(bytes) {
    let b = bytes;
    if (SHORT.lengths.indexOf(Math.ceil(b.length * 8 / 5)) >= 0) {
      const head = [b[0], 0].concat(b.slice(1, -2)), c = crc16(head);
      b = head.concat([c >> 8, c & 255]);
    }
    return bitsToText(b, 5, B32).match(/.{1,4}/g).join("-");
  }
  // The backup code for a result: the short code when the result is complete, otherwise the long one.
  // (Bytes are still accepted and give the long form.)
  function toTyped(x) {
    if (Array.isArray(x)) return toTypedLong(x);
    return isComplete(x) ? toTypedShort(x) : toTypedLong(encodeResult(x));
  }

  // visit: needed only for short typed codes (they carry a visit tag, not the visit code).
  function decode(text, visit) {
    const s = String(text || "").trim();
    if (!s) fail("Paste a link or type a code first.");
    let bytes, letter = null;
    if (s.indexOf("#") >= 0) {
      const frag = s.slice(s.indexOf("#") + 1);
      letter = frag[0];
      const vals = [...frag.slice(1)].map(function (c) {
        const i = B64.indexOf(c);
        if (i < 0) fail(DAMAGED);
        return i;
      });
      bytes = textToBits(vals, 6);
    } else {
      const vals = [...s.toUpperCase().replace(/[\s-]/g, "")].map(function (c) {
        const ch = c === "O" ? "0" : (c === "I" || c === "L") ? "1" : c;
        const i = B32.indexOf(ch);
        if (i < 0) fail("Unknown character \"" + c + "\". Codes use only numbers and letters (no U).");
        return i;
      });
      // 22, 24 or 29 characters: a short code, nothing else. Any other length: a long code (the whole
      // link payload in base 32, CRC-16 checked), as made for unfinished older drafts.
      if (SHORT.lengths.indexOf(vals.length) >= 0) return { type: "result", version: 2, short: true, value: decodeShort(vals, visit) };
      return decodeBytes(textToBits(vals, 5));
    }
    const out = decodeBytes(bytes);
    if (letter !== null && LINK_LETTER[out.type] !== letter) fail(DAMAGED);
    return out;
  }

  // ---------- short typed codes (format v2; owner's spec, 2026-10-23; frozen forever) ----------
  // One mixed-radix number, first field in the lowest digits: version (radix 4, value 1), combined rater
  // field (radix 88), medication (radix 3, required), visit tag (radix 1024), then every item (symptoms 0-3,
  // performance 1-5 stored as 0-4, side effects 0-3; all required). Written in Crockford base 32, most
  // significant first, padded to a fixed length per form, then two check characters: c1 = Damm (multiplier 2)
  // over the data, c2 = Damm (multiplier 4) over the data and c1. Both are totally anti-symmetric
  // quasigroups x∘y = a·x ⊕ y over GF(32) (polynomial x^5 + x^2 + 1), so every single typo, every swap of
  // neighbours and every pair of typos is caught. The visit code itself isn't inside: only a 10-bit tag
  // (the same two check characters computed over the visit code), so the clinic enters the visit code once.
  const SHORT = {
    version: 1,
    dataLength: { parentInitial: 27, teacherInitial: 22, parentFollowup: 20, teacherFollowup: 20 },
    lengths: [22, 24, 29]
  };
  function gfMul(x, k) {
    let r = 0;
    for (let i = 0; i < 5; i++) { if (k & (1 << i)) r ^= x; x = ((x << 1) ^ ((x & 16) ? 0x25 : 0)) & 31; }
    return r;
  }
  function dammFold(digits, a) { return digits.reduce(function (c, d) { return gfMul(c, a) ^ d; }, 0); }
  function checkPair(digits) {
    const c1 = gfMul(dammFold(digits, 2), 2);
    const c2 = gfMul(dammFold(digits.concat([c1]), 4), 4);
    return [c1, c2];
  }
  function checksOk(all) {
    return dammFold(all.slice(0, -1), 2) === 0 && dammFold(all, 4) === 0;
  }
  function visitTag(visit) {
    const pair = checkPair([...parseVisitCode(visit)].map(function (c) { return B32.indexOf(c); }));
    return pair[0] * 32 + pair[1];
  }
  // Rater field: parents 0-3 (kind × 2 + slot), teachers 4-87 (4 + ((kind × 2 + slot) × 7 + role) × 3 + time).
  function combinedOf(res) {
    const kind = V1.kinds.indexOf(res.kind), slot = V1.slots.indexOf(res.slot);
    if (kind < 0 || slot < 0) fail("Can't encode this form");
    if (slot < 2) {
      if (res.teacherRole || res.timeKnown) fail("Can't encode teacher details for a parent");
      return kind * 2 + slot;
    }
    const role = V2.teacherRoles.indexOf(res.teacherRole), time = V1.timeKnown.indexOf(res.timeKnown);
    if (role < 0 || time < 0) fail("incomplete: teacher role and time known are required");
    return 4 + ((kind * 2 + slot - 2) * 7 + role) * 3 + time;
  }
  function fromCombined(c) {
    if (c < 4) return { kind: V1.kinds[c >> 1], slot: V1.slots[c & 1], teacherRole: null, timeKnown: null };
    const x = c - 4, time = x % 3, rest = (x - time) / 3, role = rest % 7, ks = (rest - role) / 7;
    return { kind: V1.kinds[ks >> 1], slot: V1.slots[2 + (ks & 1)], teacherRole: V2.teacherRoles[role], timeKnown: V1.timeKnown[time] };
  }
  // True when every answer the short code needs is there (all items, medication, teacher details).
  function isComplete(res) {
    try { shortDigits(res); return true; } catch (e) { return false; }
  }
  function shortDigits(res) {
    const w = new Writer();
    w.put(SHORT.version, 4, "version");
    w.put(combinedOf(res), 88, "rater");
    const med = V1.medication.indexOf(res.medication);
    if (med < 0) fail("incomplete: medication is required");
    w.put(med, 3, "medication");
    w.put(visitTag(res.visit), 1024, "visit tag");
    const fid = formId(res.slot, res.kind), layout = V1.layout[fid], answers = res.answers || {};
    for (let n = 1; n <= layout.length; n++) {
      const v = answers[n];
      if (v === null || v === undefined) fail("incomplete: item " + n + " is not answered");
      if (layout[n - 1] === "s") w.put(answerDigit(v, 0, 3, "item " + n) - 1, 4, "item " + n);
      else w.put(answerDigit(v, 1, 5, "item " + n) - 1, 5, "item " + n);
    }
    if (res.kind === "followup") {
      const se = res.sideEffects;
      if (!Array.isArray(se) || se.length !== V1.sideEffects) fail("incomplete: side effects are required");
      se.forEach(function (v, i) {
        if (v === null || v === undefined) fail("incomplete: side effect " + (i + 1) + " is not answered");
        w.put(answerDigit(v, 0, 3, "side effect " + (i + 1)) - 1, 4, "side effect " + (i + 1));
      });
    } else if (res.sideEffects !== null && res.sideEffects !== undefined) fail("Can't encode side effects on an initial form");
    let n = w.toBigInt();
    const len = SHORT.dataLength[fid], digits = [];
    for (let i = 0; i < len; i++) { digits.unshift(Number(n & 31n)); n >>= 5n; }
    if (n !== 0n) fail("Can't encode: too long for this form");
    return digits;
  }
  function toTypedShort(res) {
    const digits = shortDigits(res);
    return digits.concat(checkPair(digits)).map(function (d) { return B32[d]; }).join("").match(/.{1,4}/g).join("-");
  }

  // Reads a short code. Order (plan review): length, check characters, version, form matches length,
  // answers and leftovers, then the visit code and its tag. So a garbled code gets the typo message first.
  function decodeShort(vals, visit) {
    if (SHORT.lengths.indexOf(vals.length) < 0 || !checksOk(vals)) fail(DAMAGED);
    let n = 0n;
    vals.slice(0, -2).forEach(function (d) { n = (n << 5n) | BigInt(d); });
    const r = new Reader(n);
    if (r.get(4) !== SHORT.version) fail(DAMAGED);
    const c = r.get(88), who = fromCombined(c);
    const fid = formId(who.slot, who.kind);
    if (SHORT.dataLength[fid] + 2 !== vals.length) fail("This code is the wrong length for its form. Check it and try again.");
    const res = { visit: null, kind: who.kind, slot: who.slot, teacherRole: who.teacherRole, timeKnown: who.timeKnown,
      medication: V1.medication[r.get(3)], answers: {}, sideEffects: null };
    const tag = r.get(1024);
    const layout = V1.layout[fid];
    for (let i = 1; i <= layout.length; i++) res.answers[i] = layout[i - 1] === "s" ? r.get(4) : r.get(5) + 1;
    if (who.kind === "followup") { res.sideEffects = []; for (let i = 0; i < V1.sideEffects; i++) res.sideEffects.push(r.get(4)); }
    if (r.n !== 0n) fail(DAMAGED);
    if (!visit) fail("Enter the visit code first.");
    const v = parseVisitCode(visit);
    if (visitTag(v) !== tag) fail("This code is for a different visit than " + formatVisitCode(v) + ". Check the visit code and the backup code.");
    res.visit = v;
    return res;
  }

  // ---------- labels and merging ----------
  function raterLabel(res) {
    const parts = [SLOT_NAME[res.slot]];
    const role = window.PedsVanderbiltForms.TEACHER_ROLES.find(function (r) { return r.id === res.teacherRole; });
    const time = window.PedsVanderbiltForms.TIME_KNOWN.find(function (t) { return t.id === res.timeKnown; });
    if (role) parts.push(role.label);
    if (time) parts.push("known " + time.label);
    return parts.join(", ");
  }

  function clone(x) { return JSON.parse(JSON.stringify(x)); }
  // Same rater, same answers: compared through the encoder, so key order doesn't matter. The comment
  // is left out: a typed code never carries one, and a v2 link has none.
  function withoutComment(x) { const y = clone(x); delete y.comment; return y; }
  function same(a, b) { return encodeResult(withoutComment(a)).join() === encodeResult(withoutComment(b)).join(); }

  // Adds a decoded result or packet to a packet. Returns a new packet; never changes its inputs.
  function merge(packet, item) {
    const p = clone(packet);
    p.sent = p.sent || [];
    p.raters = p.raters || {};
    if (item.visit !== p.visit) {
      return { ok: false, packet: clone(packet), message: "Visit codes don't match: " + formatVisitCode(p.visit) + " vs " + formatVisitCode(item.visit) + ". Nothing was added." };
    }
    if (item.kind !== p.kind) {
      return { ok: false, packet: clone(packet), message: "This result is a " + (item.kind === "initial" ? "first-visit" : "follow-up") + " form, but the visit is " + (p.kind === "initial" ? "a first visit" : "a follow-up") + ". Nothing was added." };
    }
    const incoming = item.raters ? V1.slots.filter(function (s) { return item.raters[s]; }).map(function (s) { return item.raters[s]; }) : [item];
    const messages = [];
    incoming.forEach(function (res) {
      const have = p.raters[res.slot];
      if (!have) {
        p.raters[res.slot] = clone(res);
        if (p.sent.indexOf(res.slot) < 0) p.sent.push(res.slot);
        messages.push(raterLabel(res) + " results added.");
      } else if (same(have, res)) {
        const had = have.comment || "", got = res.comment || "";
        if (!had && got) {
          have.comment = got;
          messages.push(raterLabel(have) + ": comment added.");
        } else if (had && got && had !== got) {
          messages.push(raterLabel(have) + " appears twice with different comments; kept the first one.");
        } else {
          messages.push(raterLabel(have) + " was already added.");
        }
      } else {
        messages.push(raterLabel(have) + " appears twice with different answers; kept the first one.");
      }
    });
    (item.sent || []).forEach(function (s) { if (p.sent.indexOf(s) < 0) p.sent.push(s); });
    p.sent.sort(function (a, b) { return V1.slots.indexOf(a) - V1.slots.indexOf(b); });
    return { ok: true, packet: p, message: messages.join(" ") };
  }

  function deepFreeze(o) {
    Object.values(o).forEach(function (v) { if (v && typeof v === "object") deepFreeze(v); });
    return Object.freeze(o);
  }

  window.PedsVanderbiltCodes = Object.freeze({
    BASE: BASE, VERSION: VERSION, V1: deepFreeze(V1), VISIT_ALPHABET: VISIT_ALPHABET,
    newVisitCode: newVisitCode, parseVisitCode: parseVisitCode, formatVisitCode: formatVisitCode,
    encodeResult: encodeResult, encodePacket: encodePacket, encodeInvite: encodeInvite,
    toLink: toLink, toTyped: toTyped, toTypedLong: toTypedLong, toTypedShort: toTypedShort, isComplete: isComplete,
    visitTag: visitTag, gfMul: gfMul, SHORT: deepFreeze(SHORT), V2: deepFreeze(V2), decode: decode, crc16: crc16,
    formId: formId, raterLabel: raterLabel, merge: merge
  });
})();
