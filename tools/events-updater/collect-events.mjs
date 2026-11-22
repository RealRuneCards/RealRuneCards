#!/usr/bin/env node
// Upcoming Major Events collector for Real Rune Cards (runs in .github/workflows/major-events.yml).
// Reads official publisher pages only, extracts dated events, and records changes between runs.
//   node tools/events-updater/collect-events.mjs [--now=YYYY-MM-DD] [--offline=<dir of saved pages>]
// Writes events/major-events-data.js (loaded by events.html) and events/major-events-state.json
// (change history). Files are only rewritten when the event list itself changes.

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(HERE, "..", "..", "events");
const STATE_FILE = path.join(OUT_DIR, "major-events-state.json");
const DATA_FILE = path.join(OUT_DIR, "major-events-data.js");
const UA = "RealRuneCardsNewsBot/1.0 (+https://realrunecards.com/news/)";
const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const TODAY = args.now || new Date().toISOString().slice(0, 10);

/* ---------- dates ---------- */
const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const MON = "(jan(?:uary)?|feb(?:ruary|uary|urary)?|febuary|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\\.?";
const mIdx = m => { const s = m.toLowerCase().replace(/[^a-z]/g, ""); return s.startsWith("febu") ? 1 : MONTHS.findIndex(x => x.startsWith(s.slice(0, 3))); };
const iso = (y, m, d) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
// "February 26–28, 2027" | "October 31–November 1, 2026" | "Feburary 19–21, 2027" | "May 14-16, 2027" | "July 12, 2026"
export function parseRange(text) {
  const t = String(text).replace(/&ndash;|&#8211;/g, "–");
  const cross = t.match(new RegExp(`${MON}\\s+(\\d{1,2})\\s*[–-]\\s*${MON}\\s+(\\d{1,2}),?\\s+(\\d{4})`, "i"));
  if (cross) { const y = +cross[5], m1 = mIdx(cross[1]), m2 = mIdx(cross[3]); return { start: iso(m1 > m2 ? y - 1 : y, m1, +cross[2]), end: iso(y, m2, +cross[4]), raw: cross[0] }; }
  const same = t.match(new RegExp(`${MON}\\s+(\\d{1,2})(?:\\s*[–-]\\s*(\\d{1,2}))?,?\\s+(\\d{4})`, "i"));
  if (same) { const m = mIdx(same[1]); return { start: iso(same[4], m, +same[2]), end: iso(same[4], m, +(same[3] || same[2])), raw: same[0] }; }
  return null;
}

/* ---------- html helpers ---------- */
export function decode(s) {
  return String(s || "").replace(/<[^>]+>/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
    .replace(/&nbsp;/g, " ").replace(/&ndash;/g, "–").replace(/&mdash;/g, "—").replace(/&rsquo;|&#039;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&")
    .replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim();
}
const tagTexts = (html, tag) => [...String(html).matchAll(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi"))].map(m => m[1]);
const pageText = html => decode(String(html).replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " "));

/* ---------- fetching (polite, robots-aware, no challenge bypass) ---------- */
const robots = new Map(); let last = 0;
async function fetchText(url) {
  if (args.offline) {
    const f = path.join(args.offline, url.replace(/^https?:\/\//, "").replace(/[^a-z0-9]+/gi, "_").slice(0, 120) + ".html");
    return readFile(f, "utf8");
  }
  const u = new URL(url);
  if (!robots.has(u.host)) {
    let dis = [];
    try { const r = await fetch(`${u.origin}/robots.txt`, { headers: { "User-Agent": UA } }); if (r.ok) { let star = false; for (const l of (await r.text()).split(/\r?\n/)) { const m = l.match(/^\s*(user-agent|disallow)\s*:\s*(.*)$/i); if (!m) continue; if (m[1].toLowerCase() === "user-agent") star = m[2].trim() === "*"; else if (star && m[2].trim()) dis.push(m[2].trim()); } } } catch { /* treat as allowed */ }
    robots.set(u.host, dis);
  }
  if (robots.get(u.host).some(p => u.pathname.startsWith(p))) throw new Error(`robots.txt disallows ${url}`);
  const wait = last + 1500 - Date.now(); if (wait > 0) await new Promise(r => setTimeout(r, wait)); last = Date.now();
  const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(30000) });
  const body = await res.text();
  if (res.headers.get("cf-mitigated") || /_Incapsula_Resource|cf-chl-/.test(body.slice(0, 4000))) throw new Error(`${u.host} serves a bot challenge; not bypassed`);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return body;
}

/* ---------- source adapters: each returns [{ name, tier, start, end, city, venue, country, link, linkLabel, source }] ---------- */
const RB = "https://playriftbound.com/en-us/news/organizedplay/";
const ADAPTERS = [
  {
    id: "riftbound-tables", game: "riftbound",
    urls: [RB + "riftbound-2027-premier-play/", RB + "riftbound-premier-play-early-2027-events/"],
    parse(html, url) {
      // Riot schedule tables: header row names the columns (Set/Dates/Event/City/Venue/Hashtag).
      const out = []; let cols = null;
      for (const tr of tagTexts(html, "tr")) {
        const cells = [...tr.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(c => decode(c[1]));
        if (cells.some(c => /^dates$/i.test(c))) { cols = cells.map(c => c.toLowerCase()); continue; }
        if (!cols) continue;
        const row = Object.fromEntries(cols.map((c, i) => [c, cells[i] || ""]));
        const d = parseRange(row.dates); if (!d) continue;
        const tag = row.hashtag || "";
        const tier = /^#RBC|^#RC[A-Z]/i.test(tag) || /continental/i.test(row.event || "") ? "Continental" : "Regional";
        const cityRaw = row.city || "";
        const name = row.event || `Riftbound ${tier} ${cityRaw.split(",")[0]}`;
        out.push({ name, tier, start: d.start, end: d.end, city: cityRaw, venue: row.venue || "", link: url, linkLabel: "Official schedule", source: url, evidence: d.raw });
      }
      return out;
    }
  },
  {
    id: "lorcana-challenge", game: "lorcana",
    urls: ["https://disneylorcana.com/en/play/lorcana-challenge/"],
    parse(html, url) {
      const out = [];
      // Challenge list items: "<City, Region> <Month D–D, YYYY> [Tickets]"
      for (const li of tagTexts(html, "li")) {
        const text = decode(li); const d = parseRange(text); if (!d) continue;
        const city = text.slice(0, text.indexOf(d.raw)).trim().replace(/,\s*$/, "");
        if (!city || city.length > 60) continue;
        const ticket = (li.match(/href=["']([^"']+)["'][^>]*>\s*Tickets/i) || [])[1] || "";
        out.push({ name: `Disney Lorcana Challenge ${city.split(",")[0]}`, tier: "Challenge", start: d.start, end: d.end, city: tidyCity(city), venue: "",
          link: ticket || url, linkLabel: ticket ? "Tickets (linked from official page)" : "Official Challenge page", source: url, evidence: d.raw });
      }
      // Qualifier paragraphs: "<Month D–D, YYYY>: <City> – <Venue/Event>"
      for (const p of tagTexts(html, "p")) {
        const text = decode(p); const d = parseRange(text); if (!d || !text.startsWith(d.raw)) continue;
        const rest = text.slice(d.raw.length).replace(/^\s*:\s*/, "");
        const [city, ...venue] = rest.split(/\s+[–-]\s+/);
        const reg = (p.match(/href=["']([^"']+)["']/i) || [])[1] || "";
        out.push({ name: `Challenge Championship Qualifier ${city.split(",")[0]}`, tier: "Qualifier", start: d.start, end: d.end, city: tidyCity(city), venue: venue.join(" – "),
          link: reg || url, linkLabel: reg ? "Registration (linked from official page)" : "Official Challenge page", source: url, evidence: d.raw });
      }
      return dedupeSame(out);
    }
  },
  {
    id: "magic-schedule", game: "magic",
    urls: ["https://magic.gg/schedule", "https://magic.gg/events"],
    parse(html, url) {
      const out = [];
      const premier = /(magiccon|pro tour|world championship|spotlight|commandfest|limited championship)/i;
      // "<Name> - <Month D–D, YYYY>[ - <City, Country>]" link texts, or list items "<Name> <dates> <City>"
      for (const m of String(html).matchAll(/<(a|li)\b([^>]*)>([\s\S]*?)<\/\1>/gi)) {
        const text = decode(m[3]); const d = parseRange(text); if (!d || !premier.test(text)) continue;
        const before = text.slice(0, text.indexOf(d.raw)).replace(/\s*-\s*$/, "").trim();
        const after = text.slice(text.indexOf(d.raw) + d.raw.length).replace(/^\s*-\s*/, "").trim();
        if (!before || before.length > 80) continue;
        const href = (m[2].match(/href=["']([^"']+)["']/i) || [])[1] || "";
        const link = href ? new URL(href, url).toString() : url;
        const tier = (before.match(premier) || [""])[0].replace(/\b\w/g, c => c.toUpperCase());
        out.push({ name: before, tier: tier === "Magiccon" ? "MagicCon" : tier === "Commandfest" ? "CommandFest" : tier, start: d.start, end: d.end,
          city: after && after.length < 60 ? after : (before.match(/(?:CommandFest|Spotlight:[^-]+?)\s+([A-Z][\w ãéü-]+)$/) || [])[1] || "",
          venue: "", link, linkLabel: href ? "Official event link" : "Official schedule", source: url, evidence: d.raw });
      }
      return dedupeSame(out);
    }
  }
];

// Events announced only in prose. Each entry is re-verified every run: its evidence text must still appear
// on the source page, otherwise it is flagged as changed and held for review instead of being shown as confirmed.
const CURATED = [
  { game: "magic", name: "MagicCon: Detroit with Pro Tour Nauctis", tier: "MagicCon + Pro Tour", start: "2027-02-26", end: "2027-02-28", city: "Detroit, Michigan, USA", venue: "Huntington Place",
    link: "https://magic.gg/news/magiccon-detroit-2027-dive-into-the-gathering", linkLabel: "Official announcement (badges via mtgfestivals.com)", source: "https://magic.gg/news/magiccon-detroit-2027-dive-into-the-gathering", evidence: "Huntington Place, Detroit, Michigan" },
  { game: "magic", name: "MagicCon: Tokyo with the second Pro Tour of 2027", tier: "MagicCon + Pro Tour", start: "2027-05-14", end: "2027-05-16", city: "Tokyo, Japan", venue: "",
    link: "https://magic.wizards.com/en/news/announcements/magiccon-heads-to-japan-europe-and-the-us-in-2027", linkLabel: "Official announcement", source: "https://magic.wizards.com/en/news/announcements/magiccon-heads-to-japan-europe-and-the-us-in-2027", evidence: "MagicCon: Tokyo : May 14–16, 2027" },
  { game: "magic", name: "Magic Limited Championship", tier: "Championship", start: "2027-06-18", end: "2027-06-20", city: "Minneapolis, Minnesota, USA", venue: "",
    link: "https://magic.wizards.com/en/news/announcements/magiccon-heads-to-japan-europe-and-the-us-in-2027", linkLabel: "Official announcement", source: "https://magic.wizards.com/en/news/announcements/magiccon-heads-to-japan-europe-and-the-us-in-2027", evidence: "June 18–20, 2027, in Minneapolis, Minnesota" },
  { game: "magic", name: "MagicCon: Las Vegas with the third Pro Tour of 2027", tier: "MagicCon + Pro Tour", start: "2027-08-27", end: "2027-08-29", city: "Las Vegas, USA", venue: "",
    link: "https://magic.wizards.com/en/news/announcements/magiccon-heads-to-japan-europe-and-the-us-in-2027", linkLabel: "Official announcement", source: "https://magic.wizards.com/en/news/announcements/magiccon-heads-to-japan-europe-and-the-us-in-2027", evidence: "MagicCon: Las Vegas : August 27–29, 2027" },
  { game: "magic", name: "MagicCon: Amsterdam with Magic World Championship 33", tier: "MagicCon + World Championship", start: "2027-12-03", end: "2027-12-05", city: "Amsterdam, Netherlands", venue: "",
    link: "https://magic.wizards.com/en/news/announcements/magiccon-heads-to-japan-europe-and-the-us-in-2027", linkLabel: "Official announcement", source: "https://magic.wizards.com/en/news/announcements/magiccon-heads-to-japan-europe-and-the-us-in-2027", evidence: "MagicCon: Amsterdam : December 3–5, 2027" },
  { game: "magic", name: "Magic World Championship 32", tier: "World Championship", start: "2026-11-13", end: "2026-11-15", city: "", venue: "",
    link: "https://magic.gg/news/the-pro-tour-and-magic-spotlight-series-in-2026", linkLabel: "Official announcement", source: "https://magic.gg/news/the-pro-tour-and-magic-spotlight-series-in-2026", evidence: "Magic World Championship 32: November 13–15, 2026" },
  { game: "riftbound", name: "Riftbound European Regional Championship", tier: "Regional Championship", start: "2026-11-06", end: "2026-11-08", city: "Stuttgart, Germany", venue: "",
    link: RB + "2026-regional-championship-info/", linkLabel: "Official event info", source: RB + "2026-regional-championship-info/", evidence: "Stuttgart, Germany from November 6-8, 2026" },
  { game: "riftbound", name: "Riftbound North American Regional Championship at Convergence Fest", tier: "Regional Championship", start: "2026-12-11", end: "2026-12-13", city: "Las Vegas, NV, USA", venue: "Convergence Fest",
    link: RB + "2026-regional-championship-info/", linkLabel: "Official event info", source: RB + "2026-regional-championship-info/", evidence: "Convergence Fest in Las Vegas, NV, USA. It will run December 11-13" },
  { game: "riftbound", name: "Riftbound World Showcase", tier: "World Championship", start: "2027-01-22", end: "2027-01-23", city: "Shanghai, China", venue: "",
    link: RB + "riftbound-world-showcase/", linkLabel: "Official event info", source: RB + "riftbound-world-showcase/", evidence: "January 22-23, 2027, in Shanghai, China" },
  { game: "riftbound", name: "Riftbound Chinese Regional Championship", tier: "Regional Championship", start: "", end: "", city: "", venue: "", tbc: "Announced; date and city not yet published on the checked page",
    link: RB + "2026-regional-championship-info/", linkLabel: "Official event info", source: RB + "2026-regional-championship-info/", evidence: "first Chinese Regional Championship" },
  { game: "riftbound", name: "Further 2027 Riftbound Regionals", tier: "Regional", start: "", end: "", city: "", venue: "", tbc: "Riot says a few more 2027 Regionals are still being locked in",
    link: RB + "riftbound-2027-premier-play/", linkLabel: "Official schedule", source: RB + "riftbound-2027-premier-play/", evidence: "a few 2027 Regionals that we're still locking in" }
];
// Also checked for evidence, but not shown: helps prove the curated list matches the source text.

function tidyCity(c) { return c.replace(/\b(fl|wi|nv|or|on|tn|wa|mi|mo|ca)\b/g, s => s.toUpperCase()).replace(/\s+/g, " ").trim(); }
function dedupeSame(list) { const seen = new Set(); return list.filter(e => { const k = `${e.name}|${e.start}`.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; }); }
// Stable identity across runs: game + event family + city + year, so a moved date is detected as a change,
// and a MagicCon and the Pro Tour held at it are treated as one event.
function family(tier) { const t = tier.toLowerCase(); return /magiccon|pro tour|world championship/.test(t) ? "flagship" : t.replace(/[^a-z]/g, ""); }
export function keyOf(e) {
  const place = (e.city || e.name).toLowerCase().split(",")[0].replace(/[^a-z]/g, "");
  return e.start ? `${e.game}|${family(e.tier)}|${place}|${e.start.slice(0, 4)}` : `${e.game}|tbc|${e.name.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
}

/* ---------- change tracking ---------- */
// Compares this run with the previous one. Returns the merged list with status flags:
//   confirmed | date-changed | cancelled | no-longer-listed | needs-review
// failedSources: pages that could not be read this run; their previous events are kept unchanged.
export function reconcile(current, previous, pageTexts, today, failedSources = new Set()) {
  const prevByKey = new Map((previous || []).map(e => [e.key, e]));
  const out = [];
  for (const e of current) {
    const p = prevByKey.get(e.key);
    const text = pageTexts[e.source] || "";
    let status = "confirmed", note = "";
    if (/\b(cancel(?:l)?ed|postponed)\b/i.test(nearby(text, e.evidence))) { status = "cancelled"; note = "The official page now describes this event as cancelled or postponed."; }
    else if (p && p.start && e.start && (p.start !== e.start || p.end !== e.end)) { status = "date-changed"; note = `Dates changed from ${p.start}–${p.end} on the official page.`; }
    out.push({ ...e, status, note, firstSeen: p?.firstSeen || today });
    prevByKey.delete(e.key);
  }
  for (const p of prevByKey.values()) {
    if (p.end && p.end < today) { out.push({ ...p, status: "past" }); continue; }
    if (failedSources.has(p.source)) { out.push(p); continue; }
    out.push({ ...p, status: "no-longer-listed", note: "No longer found on the official page. Kept for review, not shown as confirmed." });
  }
  return out;
}
function nearby(text, evidence) { const i = evidence ? text.indexOf(evidence) : -1; return i < 0 ? "" : text.slice(Math.max(0, i - 160), i + evidence.length + 160); }

/* ---------- main ---------- */
async function main() {
  const report = []; const pageTexts = {}; const found = [];
  for (const a of ADAPTERS) {
    for (const url of a.urls) {
      try { const html = await fetchText(url); pageTexts[url] = pageText(html); const list = a.parse(html, url).map(e => ({ ...e, game: a.game })); found.push(...list); report.push({ source: url, ok: true, events: list.length }); }
      catch (err) { report.push({ source: url, ok: false, error: err.message }); }
    }
  }
  for (const c of CURATED) {
    if (!(c.source in pageTexts)) {
      try { pageTexts[c.source] = pageText(await fetchText(c.source)); } catch (err) { pageTexts[c.source] = ""; report.push({ source: c.source, ok: false, error: err.message }); }
    }
    const ok = pageTexts[c.source].includes(c.evidence);
    found.push({ ...c, curated: true, ...(ok ? {} : { status: "needs-review", note: "Evidence text no longer found on the official page." }) });
    report.push({ source: c.source, ok, curated: c.name });
  }
  // Merge duplicates (same game + city + tier); prefer entries with a venue / ticket link.
  const merged = new Map();
  for (const e of found) {
    const k = keyOf(e); const cur = merged.get(k);
    if (!cur || (!cur.venue && e.venue) || (e.linkLabel || "").startsWith("Tickets")) merged.set(k, { ...cur, ...e, key: k, venue: e.venue || cur?.venue || "", city: e.city || cur?.city || "" });
  }
  let previous = [];
  try { previous = JSON.parse(await readFile(STATE_FILE, "utf8")).events; } catch { /* first run */ }
  const failed = new Set(report.filter(r => !r.ok && !r.curated).map(r => r.source));
  if (failed.size === ADAPTERS.reduce((n, a) => n + a.urls.length, 0)) {
    console.error("Every official schedule page failed to load; keeping the published events unchanged.");
    for (const r of report.filter(r => !r.ok)) console.error(`  ! ${r.error} (${r.source})`);
    process.exitCode = 1; return;
  }
  const events = reconcile([...merged.values()], previous, pageTexts, TODAY, failed)
    .map(e => (e.status === "needs-review" || e.status === "no-longer-listed" || e.status === "cancelled") ? e : { ...e, status: e.tbc ? "tbc" : e.end && e.end < TODAY ? "past" : e.status })
    .sort((a, b) => (a.start || "9999").localeCompare(b.start || "9999") || a.name.localeCompare(b.name));
  const changed = JSON.stringify(events) !== JSON.stringify(previous);
  if (changed) {
    const sources = [...new Set(report.filter(r => r.ok).map(r => r.source))];
    await writeFile(STATE_FILE, JSON.stringify({ updated: TODAY, events }, null, 2) + "\n");
    await writeFile(DATA_FILE, "/* Generated by tools/events-updater/collect-events.mjs from official publisher pages. Do not edit by hand. */\n" +
      `window.RRC_MAJOR_EVENTS = ${JSON.stringify({ updated: TODAY, sources, events: events.map(({ evidence, key, curated, ...pub }) => pub) }, null, 2)};\n`);
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    const { appendFile } = await import("node:fs/promises");
    await appendFile(process.env.GITHUB_STEP_SUMMARY, `Upcoming Major Events ${TODAY}: ${changed ? "event list changed" : "no changes"}.\n\n` +
      report.map(r => `- ${r.ok ? "ok" : "PROBLEM"}: ${r.curated ? `curated "${r.curated}"` : r.source}${r.error ? ` (${r.error})` : ""}`).join("\n") + "\n");
  }
  const by = g => events.filter(e => e.game === g);
  console.log(`Upcoming Major Events run ${TODAY}: ${changed ? "event list changed, files written" : "no changes"}`);
  for (const g of ["magic", "lorcana", "riftbound"]) {
    const list = by(g); const count = s => list.filter(e => e.status === s).length;
    console.log(`  ${g}: upcoming ${list.filter(e => ["confirmed", "date-changed"].includes(e.status)).length}, tbc ${count("tbc")}, past ${count("past")}, flagged ${list.filter(e => ["needs-review", "no-longer-listed", "cancelled"].includes(e.status)).length}`);
  }
  for (const r of report.filter(r => !r.ok)) console.log(`  ! ${r.curated ? `curated "${r.curated}" evidence missing` : r.error} (${r.source})`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(e => { console.error(e); process.exitCode = 1; });
