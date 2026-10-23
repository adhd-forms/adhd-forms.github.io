/* Pediatric Tools: Vanderbilt visit codes, links, typed backup codes and packet merging.
   No server: answers travel only inside links (after "#", never sent to a server), QR codes
   and typed codes. Load after the form data:
     <script src="vanderbilt-forms.js?v=1"></script>
     <script src="vanderbilt-codes.js?v=1"></script>
   Exposes only window.PedsVanderbiltCodes. Bump ?v= on every page that loads it when it changes.

   Format v1: bytes = [header][body][CRC-16]. Header = version (high 4 bits) + type (low 4 bits:
   1 rater result, 2 packet, 3 invite). Body = one mixed-radix number, first field in the lowest
   digits, so each field can be read in order. CRC-16/CCITT-FALSE over header + body catches
   damaged links and typos in typed codes (it is the typed code's check: any one wrong character
   or two swapped neighbours are always caught). Never change a v1 table below: old links must
   keep decoding. A new layout gets a new version number and its own entry in DECODERS.
   Chart note: .claude/chart/2026-10-22-vanderbilt-encoding.md (notes repo). */
(function () {
  "use strict";

  if (!window.PedsVanderbiltForms) throw new Error("vanderbilt-codes.js needs vanderbilt-forms.js loaded first");

  // Page that opens links (the tool's own site since 2026-10-23; every link and printed QR carries it).
  const BASE = "https://adhd-forms.github.io/";

  const VERSION = 1;
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

  // Rater fields and answers (no visit code, kind or slot: those come from the wrapper).
  function putRater(w, slot, kind, res) {
    const teacher = slot[0] === "T";
    if (!teacher && (res.teacherRole || res.timeKnown)) fail("Can't encode teacher details for a parent");
    w.put(idIndex(V1.teacherRoles, res.teacherRole, "teacher role"), 7, "teacher role");
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
  }
  function getRater(r, visit, kind, slot) {
    const res = { visit: visit, kind: kind, slot: slot };
    res.teacherRole = idAt(V1.teacherRoles, r.get(7));
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
    return res;
  }

  function wrap(type, w) {
    const body = bigToBytes(w.toBigInt());
    const head = [(VERSION << 4) | TYPES[type]].concat(body);
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
    return wrap("invite", w);
  }

  function decodeV1(type, body) {
    const r = new Reader(bytesToBig(body));
    const visit = getVisit(r);
    const kind = V1.kinds[r.get(2)];
    let value;
    if (type === "result") {
      value = getRater(r, visit, kind, V1.slots[r.get(4)]);
    } else if (type === "invite") {
      value = { visit: visit, kind: kind, slot: V1.slots[r.get(4)] };
    } else {
      const sentBits = r.get(16), presentBits = r.get(16);
      value = { visit: visit, kind: kind, sent: [], raters: {} };
      V1.slots.forEach(function (s, i) {
        if (sentBits & (1 << i)) value.sent.push(s);
      });
      if (sentBits > 15 || presentBits > 15) fail(DAMAGED);
      V1.slots.forEach(function (s, i) {
        if (presentBits & (1 << i)) value.raters[s] = getRater(r, visit, kind, s);
      });
    }
    if (r.n !== 0n) fail(DAMAGED); // leftover digits: not a real v1 payload
    return value;
  }
  const DECODERS = { 1: decodeV1 };

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
  function toTyped(bytes) {
    return bitsToText(bytes, 5, B32).match(/.{1,4}/g).join("-");
  }

  function decode(text) {
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
      bytes = textToBits(vals, 5);
    }
    const out = decodeBytes(bytes);
    if (letter !== null && LINK_LETTER[out.type] !== letter) fail(DAMAGED);
    return out;
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
  // Same rater, same answers: compared through the encoder, so key order doesn't matter.
  function same(a, b) { return encodeResult(a).join() === encodeResult(b).join(); }

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
        messages.push(raterLabel(have) + " was already added.");
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
    toLink: toLink, toTyped: toTyped, decode: decode, crc16: crc16,
    formId: formId, raterLabel: raterLabel, merge: merge
  });
})();
