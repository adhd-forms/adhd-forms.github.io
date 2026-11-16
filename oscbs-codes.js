/* OS-CBS: visit codes, links and typed backup codes for one completed form.
   No server: answers travel only inside links (after "#", never sent to a server), QR codes and
   typed codes. Load after the form data:
     <script src="oscbs-forms.js?v=1"></script>
     <script src="oscbs-codes.js?v=1"></script>
   Exposes only window.PedsOscbsCodes. Bump ?v= on every page that loads it when it changes.
   Like scared-codes.js it holds its own copies of the visit-code functions and the check characters;
   tests/oscbs-codes.test.js proves they agree with vanderbilt-codes.js.

   Links and QR codes: BASE + "#" + letter (b result, o invite) + base64url of [header][body][CRC-16].
   Header = 9 in the high 4 bits (Vanderbilt uses 1 to 3, SCARED 8), type in the low 4 (1 result, 3 invite).
   Body = one mixed-radix number, first field in the lowest digits: visit code (8 digits, radix 30),
   respondent (radix 2), then for a result the completion day (radix 16384) and items 1 to 18 (answer - 1, radix 5).

   Completion day (owner, 2026-11-16: "Capture ... the date completed"): the device's local date at Submit,
   as whole days since 2025-01-01, counted in UTC so a daylight-saving change can't shift it. Day 0 is
   2025-01-01, day 16383 is 2069-11-09; a device date outside that makes no code. Vanderbilt and SCARED
   carry no date.

   Typed backup codes: one mixed-radix number, first field in the lowest digits: version (radix 4, value 1),
   respondent (radix 2), visit tag (radix 1024), day (radix 16384), items 1 to 18 (radix 5). Written as 14
   Crockford base-32 characters, most significant first, then two check characters, as in vanderbilt-codes.js.
   16 characters is reserved for these codes: isOscbs() sends every 16-character code here (Vanderbilt short
   codes are 22, 24 or 29, SCARED 18; a Vanderbilt long code of 16 is then refused as a typo).

   Never change the TABLE: printed codes and results must keep decoding. Printed codes also carry BASE, so
   moving the page needs a forwarding page that keeps the "#" part.
   Chart note: .claude/chart/2026-11-16-oscbs.md (notes repo). */
(function () {
  "use strict";

  const F = window.PedsOscbsForms;
  if (!F) throw new Error("oscbs-codes.js needs oscbs-forms.js loaded first");

  const BASE = "https://adhd-forms.github.io/oscbs.html";
  const TABLE = { format: 1, forms: ["parent", "teacher"], items: 18, answerMin: 1, answerRadix: 5, dayEpochUTC: Date.UTC(2025, 0, 1), dayRadix: 16384,
    typedVersion: 1, typedDataLength: 14, typedLength: 16 };

  if (F.FORM.items.length !== TABLE.items) throw new Error("oscbs-codes.js expects " + TABLE.items + " items");
  if (F.RESPONDENTS.map(function (r) { return r.id; }).join() !== TABLE.forms.join()) throw new Error("oscbs-codes.js expects respondents " + TABLE.forms.join());
  if (F.SCALE.map(function (s) { return s.value; }).join() !== "1,2,3,4,5") throw new Error("oscbs-codes.js expects answers 1 to 5");

  const HEADER_FORMAT = 9;
  const TYPES = { result: 1, invite: 3 };
  const LETTER = { result: "b", invite: "o" };
  const DAY_MS = 86400000;
  const hasOwn = function (o, k) { return Object.prototype.hasOwnProperty.call(o, k); };

  function fail(msg) { throw new Error(msg); }
  const DAMAGED = "This code has a typo or is damaged. Check it and try again.";

  // ---------- visit codes (same alphabet and rules as Vanderbilt and SCARED) ----------
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

  // ---------- completion day ----------
  // date: a Date (local calendar day is used). Returns 0 to 16383, or throws.
  function dayFromDate(date) {
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) fail("This device's date can't be read.");
    const day = Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - TABLE.dayEpochUTC) / DAY_MS);
    if (day < 0 || day >= TABLE.dayRadix) fail("This device's date is outside 2025-01-01 to 2069-11-09. Check the date setting and try again.");
    return day;
  }
  function dayToISO(day) {
    if (!Number.isInteger(day) || day < 0 || day >= TABLE.dayRadix) fail(DAMAGED);
    return new Date(TABLE.dayEpochUTC + day * DAY_MS).toISOString().slice(0, 10);
  }

  // ---------- mixed-radix numbers ----------
  function Writer() { this.fields = []; }
  Writer.prototype.put = function (value, radix) {
    if (!Number.isInteger(value) || value < 0 || value >= radix) fail(DAMAGED);
    this.fields.push([value, radix]);
  };
  Writer.prototype.toBigInt = function () {
    let n = 0n;
    for (let i = this.fields.length - 1; i >= 0; i--) n = n * BigInt(this.fields[i][1]) + BigInt(this.fields[i][0]);
    return n;
  };
  function Reader(n) { this.n = n; }
  Reader.prototype.get = function (radix) {
    const r = BigInt(radix), v = this.n % r;
    this.n = this.n / r;
    return Number(v);
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
  function formIndex(form) {
    const i = TABLE.forms.indexOf(form);
    if (i < 0) fail("Can't encode OS-CBS respondent: " + form);
    return i;
  }
  // Every item must be exactly 1 to 5, so a bad value can never be packed as another answer.
  function checkedAnswers(answers) {
    if (!answers || typeof answers !== "object" || Array.isArray(answers)) fail("incomplete: answers are missing");
    Object.keys(answers).forEach(function (k) {
      if (!/^[1-9][0-9]*$/.test(k) || Number(k) > TABLE.items) fail("Can't encode item " + k);
    });
    const out = [];
    for (let n = 1; n <= TABLE.items; n++) {
      const v = hasOwn(answers, n) ? answers[n] : undefined;
      if (v === null || v === undefined) fail("incomplete: item " + n + " is not answered");
      if (!Number.isInteger(v) || v < TABLE.answerMin || v >= TABLE.answerMin + TABLE.answerRadix) fail("Can't encode item " + n + ": not 1 to 5");
      out.push(v - TABLE.answerMin);
    }
    return out;
  }
  function checkedDay(day) {
    if (!Number.isInteger(day) || day < 0 || day >= TABLE.dayRadix) fail("Can't encode the completion day: " + day);
    return day;
  }
  function putVisit(w, visit) {
    for (const c of parseVisitCode(visit)) w.put(VISIT_ALPHABET.indexOf(c), 30);
  }
  function getVisit(r) {
    let s = "";
    for (let i = 0; i < 8; i++) s += VISIT_ALPHABET[r.get(30)];
    return s;
  }
  function readAnswers(r) {
    const answers = {};
    for (let n = 1; n <= TABLE.items; n++) answers[n] = r.get(TABLE.answerRadix) + TABLE.answerMin;
    return answers;
  }

  // ---------- links ----------
  const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

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
  function toLink(type, w) {
    const head = [(HEADER_FORMAT << 4) | TYPES[type]].concat(bigToBytes(w.toBigInt()));
    const c = crc16(head);
    return BASE + "#" + LETTER[type] + bitsToText(head.concat([c >> 8, c & 255]), 6, B64);
  }
  function inviteLink(inv) {
    const w = new Writer();
    putVisit(w, inv.visit);
    w.put(formIndex(inv.form), 2);
    return toLink("invite", w);
  }
  function resultLink(res) {
    const w = new Writer();
    putVisit(w, res.visit);
    w.put(formIndex(res.form), 2);
    w.put(checkedDay(res.day), TABLE.dayRadix);
    checkedAnswers(res.answers).forEach(function (v) { w.put(v, TABLE.answerRadix); });
    return toLink("result", w);
  }
  function decodeLink(frag) {
    const letter = frag[0];
    const vals = [...frag.slice(1)].map(function (c) {
      const i = B64.indexOf(c);
      if (i < 0) fail(DAMAGED);
      return i;
    });
    const bytes = textToBits(vals, 6);
    if (bytes.length < 3) fail(DAMAGED); // header and CRC; visit 22222222 for a parent invite has an empty body
    const c = crc16(bytes.slice(0, -2));
    if (bytes[bytes.length - 2] !== c >> 8 || bytes[bytes.length - 1] !== (c & 255)) fail(DAMAGED);
    if (bytes[0] >> 4 !== HEADER_FORMAT) fail(DAMAGED);
    const type = Object.keys(TYPES).find(function (k) { return TYPES[k] === (bytes[0] & 15); });
    if (!type || LETTER[type] !== letter) fail(DAMAGED);
    const r = new Reader(bytesToBig(bytes.slice(1, -2)));
    const value = { visit: getVisit(r), form: TABLE.forms[r.get(2)] };
    if (type === "result") { value.day = r.get(TABLE.dayRadix); value.answers = readAnswers(r); }
    if (r.n !== 0n) fail(DAMAGED);
    return { type: type, typed: false, value: value };
  }

  // ---------- typed backup codes ----------
  const B32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"; // Crockford: no I L O U

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
  function toTyped(res) {
    const w = new Writer();
    w.put(TABLE.typedVersion, 4);
    w.put(formIndex(res.form), 2);
    w.put(visitTag(res.visit), 1024);
    w.put(checkedDay(res.day), TABLE.dayRadix);
    checkedAnswers(res.answers).forEach(function (v) { w.put(v, TABLE.answerRadix); });
    let n = w.toBigInt();
    const digits = [];
    for (let i = 0; i < TABLE.typedDataLength; i++) { digits.unshift(Number(n & 31n)); n >>= 5n; }
    if (n !== 0n) fail("Can't encode: too long for a typed code");
    return digits.concat(checkPair(digits)).map(function (d) { return B32[d]; }).join("").match(/.{1,4}/g).join("-");
  }
  // Order, as in vanderbilt-codes.js and scared-codes.js: length, check characters, version, answers and
  // leftovers, then the visit code and its tag. So a garbled code gets the typo message first.
  function decodeTyped(text, visit) {
    const vals = [...text.toUpperCase().replace(/[\s-]/g, "")].map(function (c) {
      const ch = c === "O" ? "0" : (c === "I" || c === "L") ? "1" : c;
      const i = B32.indexOf(ch);
      if (i < 0) fail("Unknown character \"" + c + "\". Codes use only numbers and letters (no U).");
      return i;
    });
    if (vals.length !== TABLE.typedLength || !checksOk(vals)) fail(DAMAGED);
    let n = 0n;
    vals.slice(0, -2).forEach(function (d) { n = (n << 5n) | BigInt(d); });
    const r = new Reader(n);
    if (r.get(4) !== TABLE.typedVersion) fail(DAMAGED);
    const form = TABLE.forms[r.get(2)];
    const tag = r.get(1024);
    const day = r.get(TABLE.dayRadix);
    const answers = readAnswers(r);
    if (r.n !== 0n) fail(DAMAGED);
    if (!visit) fail("Enter the visit code first.");
    const v = parseVisitCode(visit);
    if (visitTag(v) !== tag) fail("This code is for a different visit than " + formatVisitCode(v) + ". Check the visit code and the backup code.");
    return { type: "result", typed: true, value: { visit: v, form: form, day: day, answers: answers } };
  }

  // ---------- reading ----------
  // visit: needed only for typed codes (they carry a visit tag, not the visit code).
  function decode(text, visit) {
    const s = String(text || "").trim();
    if (!s) fail("Paste a link or type a code first.");
    return s.indexOf("#") >= 0 ? decodeLink(s.slice(s.indexOf("#") + 1)) : decodeTyped(s, visit);
  }
  // Routing only, it doesn't validate: decode() does that.
  function isOscbs(text) {
    const s = String(text || "").trim();
    if (s.indexOf("#") >= 0) {
      const letter = s[s.indexOf("#") + 1];
      return letter === LETTER.result || letter === LETTER.invite;
    }
    return s.replace(/[\s-]/g, "").length === TABLE.typedLength;
  }

  function deepFreeze(o) {
    Object.values(o).forEach(function (v) { if (v && typeof v === "object") deepFreeze(v); });
    return Object.freeze(o);
  }

  window.PedsOscbsCodes = Object.freeze({
    BASE: BASE, TABLE: deepFreeze(TABLE), VISIT_ALPHABET: VISIT_ALPHABET,
    newVisitCode: newVisitCode, parseVisitCode: parseVisitCode, formatVisitCode: formatVisitCode,
    visitTag: visitTag, gfMul: gfMul, dayFromDate: dayFromDate, dayToISO: dayToISO,
    inviteLink: inviteLink, resultLink: resultLink, toTyped: toTyped,
    decode: decode, isOscbs: isOscbs
  });
})();
