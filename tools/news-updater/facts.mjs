// Deterministic fact extraction from official announcement pages.
// Every fact returned here is read directly from the publisher's page text or
// structured data. Nothing is inferred; if a fact is not stated, it is left out,
// and callers skip the item when the key facts are missing.

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const MON = "(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\\.?";
const WEEKDAY = "(?:(?:mon|tues?|wed(?:nes)?|thu(?:rs)?|fri|sat(?:ur)?|sun)(?:day)?\\.?,?\\s+)?";
const monthIndex = m => MONTHS.findIndex(x => x.startsWith(m.toLowerCase().replace(".", "").slice(0, 3)));
const iso = (y, m, d) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

export function decodeText(s) {
  return String(s || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&nbsp;/g, " ").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&rsquo;|&lsquo;/g, "'").replace(/&ndash;|&mdash;/g, "–")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
    .replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim();
}

// Ordered text blocks (headings, paragraphs, list items) from the main content.
export function blocks(html) {
  const body = String(html)
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<(nav|footer|header)\b[\s\S]*?<\/\1>/gi, " ");
  const out = [];
  for (const m of body.matchAll(/<(h[1-6]|p|li|td|th)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    const text = decodeText(m[2]);
    if (text) out.push({ tag: m[1].toLowerCase(), text });
  }
  return out;
}

// First explicitly stated effective/start date in the text, e.g. "effective November 23, 2026",
// "in effect as of Tuesday, Nov 3, 2026", "takes effect on 23 November 2026".
export function statedEffectiveDate(text) {
  const lead = "(?:effective|in effect (?:as of|from|on)|takes? effect(?: on| from)?|goes into effect(?: on)?)\\s*(?:on\\s+)?[:(]?\\s*";
  const t = String(text).toLowerCase();
  const a = t.match(new RegExp(`${lead}${WEEKDAY}${MON}\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4})`));
  if (a) return iso(a[3], monthIndex(a[1]), a[2]);
  const b = t.match(new RegExp(`${lead}${WEEKDAY}(\\d{1,2})(?:st|nd|rd|th)?\\s+${MON},?\\s+(\\d{4})`));
  if (b) return iso(b[3], monthIndex(b[2]), b[1]);
  return "";
}

const NOT_A_CARD = /^(the|these|this|that|those|it|its|they|we|our|you|you'll|your|all|any|each|following|no|one|two|three|four|five|six|seven|eight|nine|ten|\d+|as|also|however|if|when|while|because|since|after|before|but|so|and|or)\b|\b(that|those|which|who|cards?|battlefields?|list|format|deck|decks|players?|team|update|announcement|changes?|commanders?)\b/i;
const LEADING_FILLER = /^(as such|additionally|also|however|in addition|finally|furthermore|meanwhile|separately|likewise)\s*,\s*/i;
function cleanName(s) {
  const n = s.replace(/^[\s"“'(]+|[\s"”').:]+$/g, "").replace(LEADING_FILLER, "").trim();
  if (n.length < 2 || n.length > 60 || !/^[A-Z0-9]/.test(n) || n.split(/\s+/).length > 9 || NOT_A_CARD.test(n)) return "";
  return n;
}
function formatsInText(text, formatNames) {
  const out = [];
  for (const f of formatNames) if (new RegExp(`\\b${f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text) && !out.some(x => x.toLowerCase().includes(f.toLowerCase()))) out.push(f);
  return out.join(" and ");
}
const ACTION = { banned: "banned", unbanned: "unbanned", "no longer banned": "unbanned", restricted: "restricted", unrestricted: "unrestricted", suspended: "suspended" };

// Ban/restriction changes stated on the page: [{ name, action, scope }].
export function banChanges(html, formatNames) {
  const bl = blocks(html);
  const found = [];
  // format: the format the change applies to (from a heading or the sentence); scope: display text, e.g. "in Competitive Brawl, as a commander"
  const add = (name, action, scope, format) => {
    const n = cleanName(name); if (!n) return;
    if (!found.some(f => f.name.toLowerCase() === n.toLowerCase() && f.action === action)) found.push({ name: n, action, scope: scope || "", format: format || "" });
  };
  const fmtRe = formatNames.length ? new RegExp(`\\b(${formatNames.map(f => f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`) : null; // case-sensitive: "as a commander" is not the Commander format
  let heading = "";
  for (let i = 0; i < bl.length; i++) {
    const { tag, text } = bl[i];
    // Format headings: real headings, or a short paragraph that is just a format name (Wizards' B&R layout).
    const exactFormat = fmtRe && text.length < 40 && text.match(fmtRe) && text.match(fmtRe)[1].length >= text.replace(/[:\s]+$/, "").length - 1;
    if (/^h[1-6]$/.test(tag) || exactFormat) { const f = fmtRe && text.match(fmtRe); heading = f && text.length < 60 ? f[1] : (text.length < 60 ? "" : heading); continue; }
    for (const sentence of text.split(/(?<=[.!])\s+/)) {
      // "<Card> is banned." / "<Card> is now only banned as a commander." / "<A> and <B> are unbanned in Modern."
      const m = sentence.match(/^(.{2,160}?)\s+(?:is|are|has been|have been)\s+(?:now\s+)?(only\s+)?(no longer banned|unbanned|banned|unrestricted|restricted|suspended)\b\s*(.*)$/i);
      if (m) {
        const plural = /\s(are|have been)\s/i.test(sentence.slice(0, m[1].length + 12));
        const tail = m[4].replace(/[.]+$/, "");
        const inFmt = (fmtRe && sentence.match(fmtRe)) ? sentence.match(fmtRe)[1] : heading;
        const qual = (tail.match(/^as an? [a-z]+/) || [""])[0];
        const scope = [inFmt ? `in ${inFmt}` : "", qual].filter(Boolean).join(", ");
        const action = ACTION[m[3].toLowerCase()] + (m[2] && ACTION[m[3].toLowerCase()] === "banned" ? "-only" : "");
        const names = plural ? m[1].split(/\s*;\s*|\s+and\s+/) : [m[1]];
        names.forEach(n => add(n, action, scope, inFmt));
        continue;
      }
      // "... chose to ban <Card> from the set ..." / "... banned <Card> in Core Constructed"
      for (const b of sentence.matchAll(/\b(?:to ban|has banned|have banned|we(?:'re| are)? banning|banning)\s+([A-Z][^.;:]{1,60}?)\s+(?:from|in|for)\b/g)) {
        const f = fmtRe && sentence.match(fmtRe);
        add(b[1], "banned", f ? `in ${f[1]}` : (heading ? `in ${heading}` : ""), f ? f[1] : heading);
      }
    }
    // "These eight cards are banned:" / "... are being added to the Standard ban list:" followed by list(s).
    let introAction = "";
    const intro = text.match(/\b(?:are|is|been)\s+(banned|unbanned|restricted|suspended)\b[^.]*:\s*$/i);
    if (intro) introAction = ACTION[intro[1].toLowerCase()];
    else if (/\badded to\b[^.]*\bban(ned)?[- ]list\b[^.]*:\s*$/i.test(text)) introAction = "banned";
    else if (/\bremoved from\b[^.]*\bban(ned)?[- ]list\b[^.]*:\s*$/i.test(text)) introAction = "unbanned";
    if (introAction && tag !== "li") {
      const fmts = formatsInText(text, formatNames);
      const scope = fmts ? `in ${fmts}` : (heading ? `in ${heading}` : "");
      // Collect list items, allowing short sub-headings (e.g. "Cards", "Battlefields") in between.
      for (let j = i + 1; j < bl.length; j++) {
        if (bl[j].tag === "li") { add(bl[j].text, introAction, scope, fmts || heading); continue; }
        if (/^h[1-6]$/.test(bl[j].tag) && bl[j].text.length < 40) continue;
        break;
      }
    }
  }
  return found.slice(0, 40);
}

// Konami Forbidden & Limited table rows that carry a remark (new or changed status).
export function ygoListChanges(html) {
  const rows = [];
  for (const tr of String(html).matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...tr[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(c => decodeText(c[1]));
    if (cells.length < 4 || /card name/i.test(cells[1] || "")) continue;
    const [, name, advanced, , remarks] = cells;
    if (name && advanced && remarks && /\S/.test(remarks)) rows.push({ name: titleCase(name), status: advanced, remarks });
  }
  return rows;
}
const SMALL = new Set(["a", "an", "and", "as", "at", "by", "for", "from", "in", "of", "on", "or", "the", "to", "with"]);
function titleCase(s) {
  if (s !== s.toUpperCase()) return s;
  return s.toLowerCase().split(" ").map((w, i) => (i > 0 && SMALL.has(w) ? w : w.replace(/^([^a-z]*)([a-z])/, (_, p, c) => p + c.toUpperCase()))).join(" ");
}

// Structured event facts from schema.org Event data on the official page.
export function eventFacts(ld, hostOk) {
  const ev = ld.find(o => [].concat(o["@type"] || []).some(t => /Event$/.test(t)));
  if (!ev) return null;
  const loc = [].concat(ev.location || [])[0] || {};
  const addr = typeof loc.address === "object" ? loc.address : {};
  const country = typeof addr.addressCountry === "object" ? addr.addressCountry.name : addr.addressCountry;
  const offer = [].concat(ev.offers || [])[0];
  const registration = offer && offer.url && hostOk(offer.url) ? offer.url : "";
  const facts = {
    name: decodeText(ev.name), start: String(ev.startDate || "").slice(0, 10), end: String(ev.endDate || "").slice(0, 10),
    venue: decodeText(loc.name), city: decodeText(addr.addressLocality), country: decodeText(country), registration
  };
  return facts.name && /^\d{4}-\d{2}-\d{2}$/.test(facts.start) && (facts.city || facts.venue) ? facts : null;
}
