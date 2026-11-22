#!/usr/bin/env node
// Real Rune Cards Player News collector.
// Reads official publisher sources, keeps ban-list / rules / event announcements,
// writes original fact-only summaries with source links into news/news-feed.js
// and one article page per item. No API keys, no third-party packages.
//
// Usage: node tools/news-updater/update-news.mjs [--dry-run] [--max-age=30] [--now=YYYY-MM-DD]

import { readFile, writeFile, mkdir, access, appendFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { USER_AGENT, MAX_AGE_DAYS, MAX_FETCHES_PER_SOURCE, GAMES, SOURCES, EXCLUDE, CATEGORY_RULES, FORMATS } from "./sources.mjs";
import { blocks, banChanges, statedEffectiveDate, ygoListChanges, eventFacts } from "./facts.mjs";
import { newsOrder } from "./order.mjs";
const RUN_STAMP = new Date().toISOString();

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const FEED_PATH = path.join(ROOT, "news", "news-feed.js");
const STATE_PATH = path.join(ROOT, "news", "news-state.json");
const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const DRY = !!args["dry-run"];
const MAX_AGE = Number(args["max-age"] || MAX_AGE_DAYS);
const TODAY = args.now || new Date().toISOString().slice(0, 10);
const AUTO_BY = "Real Rune Cards automatic news collector (facts taken from the official source; no publisher text copied)";
const MAX_AUTO_ITEMS = 60;
const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

class AccessRestricted extends Error {}

/* ---------------- HTTP: polite, robots-aware, never bypasses challenges ---------------- */
const lastHit = new Map();
const robotsCache = new Map();
async function politeDelay(host) {
  const wait = (lastHit.get(host) || 0) + 1200 - Date.now();
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastHit.set(host, Date.now());
}
async function rawGet(url) {
  const u = new URL(url);
  await politeDelay(u.host);
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT, "Accept": "text/html,application/xhtml+xml,application/xml,application/json;q=0.9,*/*;q=0.8" }, redirect: "follow", signal: AbortSignal.timeout(25000) });
  const body = await res.text();
  if (res.headers.get("cf-mitigated") || /_Incapsula_Resource|cf-chl-|Just a moment\.\.\./.test(body.slice(0, 4000))) {
    throw new AccessRestricted(`${u.host} serves a bot challenge to automated clients (HTTP ${res.status})`);
  }
  if (res.status === 403 || res.status === 429) throw new AccessRestricted(`${u.host} refused automated access (HTTP ${res.status})`);
  return { status: res.status, body, finalUrl: res.url };
}
async function robotsAllows(url) {
  const u = new URL(url);
  if (!robotsCache.has(u.host)) {
    let rules = [];
    try {
      const r = await rawGet(`${u.protocol}//${u.host}/robots.txt`);
      if (r.status === 200) rules = parseRobots(r.body);
    } catch (e) { if (e instanceof AccessRestricted) throw e; }
    robotsCache.set(u.host, rules);
  }
  const p = u.pathname + u.search;
  let verdict = { len: -1, allow: true };
  for (const rule of robotsCache.get(u.host)) {
    if (rule.path && p.startsWith(rule.path) && rule.path.length > verdict.len) verdict = { len: rule.path.length, allow: rule.allow };
  }
  return verdict.allow;
}
function parseRobots(txt) {
  const groups = []; let cur = null, lastWasAgent = false;
  for (const line of txt.split(/\r?\n/)) {
    const m = line.replace(/#.*/, "").trim().match(/^([A-Za-z-]+)\s*:\s*(.*)$/); if (!m) continue;
    const key = m[1].toLowerCase(), val = m[2].trim();
    if (key === "user-agent") { if (!lastWasAgent) { cur = { agents: [], rules: [] }; groups.push(cur); } cur.agents.push(val.toLowerCase()); lastWasAgent = true; continue; }
    lastWasAgent = false;
    if (!cur) continue;
    if (key === "disallow") cur.rules.push({ path: val, allow: false });
    if (key === "allow") cur.rules.push({ path: val, allow: true });
  }
  const mine = groups.filter(g => g.agents.some(a => a.startsWith("realrunecardsnewsbot")));
  return (mine.length ? mine : groups.filter(g => g.agents.includes("*"))).flatMap(g => g.rules);
}
async function get(url) {
  if (!(await robotsAllows(url))) throw new AccessRestricted(`robots.txt disallows ${url}`);
  let last;
  for (let i = 0; i < 2; i++) {
    try {
      const r = await rawGet(url);
      if (r.status >= 500) { last = new Error(`HTTP ${r.status} for ${url}`); continue; }
      if (r.status !== 200) throw new Error(`HTTP ${r.status} for ${url}`);
      return r;
    } catch (e) { if (e instanceof AccessRestricted) throw e; last = e; }
  }
  throw last;
}

/* ---------------- Parsing helpers ---------------- */
function decode(s) {
  return String(s || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&nbsp;/g, " ").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
    .replace(/\s+/g, " ").trim();
}
function meta(html, name) {
  const re1 = new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]*content=["']([^"']*)["']`, "i");
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${name}["']`, "i");
  const m = html.match(re1) || html.match(re2);
  return m ? decode(m[1]) : "";
}
function jsonLd(html) {
  const out = [];
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(m[1].trim());
      const stack = Array.isArray(data) ? [...data] : [data];
      while (stack.length) { const o = stack.pop(); if (!o || typeof o !== "object") continue; out.push(o); if (Array.isArray(o["@graph"])) stack.push(...o["@graph"]); }
    } catch { /* ignore malformed blocks */ }
  }
  return out;
}
function typeIs(o, t) { const ty = o["@type"]; return Array.isArray(ty) ? ty.includes(t) : ty === t; }
function isoDate(s) { const m = String(s || "").match(/(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[1]}-${m[2]}-${m[3]}` : ""; }
function canonicalOf(html, fallback) {
  const m = html.match(/<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i);
  let resolved = "";
  try { if (m) resolved = normalizeUrl(new URL(decode(m[1]), fallback).toString()); } catch { /* fall back below */ }
  return resolved || normalizeUrl(fallback);
}
function normalizeUrl(u) {
  try { const x = new URL(u); x.hash = ""; x.search = ""; x.hostname = x.hostname.toLowerCase(); if (!x.pathname.endsWith("/") && !/\.\w+$/.test(x.pathname)) x.pathname += "/"; return x.toString(); } catch { return ""; }
}
function onOfficialHost(url, game) {
  try { const h = new URL(url).hostname.replace(/^www\./, ""); return new URL(url).protocol === "https:" && GAMES[game].hosts.some(d => h === d || h.endsWith("." + d)); } catch { return false; }
}
function slugify(s) { return String(s).toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60).replace(/-$/, "") || "update"; }
function daysBetween(a, b) { return Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400000); }
function fmtLong(d) { const [y, m, day] = d.split("-").map(Number); return `${day} ${MONTHS[m - 1][0].toUpperCase()}${MONTHS[m - 1].slice(1)} ${y}`; }
function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

// "Effective November 23, 2026" / "effective 23 November 2026" -> ISO date. Facts only, no inference.
function effectiveDate(text) {
  const t = String(text).toLowerCase();
  const mdY = t.match(new RegExp(`effective(?:\\s+on)?\\s*[:(]?\\s*(${MONTHS.join("|")})\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4})`));
  const dMY = t.match(new RegExp(`effective(?:\\s+on)?\\s*[:(]?\\s*(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTHS.join("|")})\\s+(\\d{4})`));
  if (mdY) return `${mdY[3]}-${String(MONTHS.indexOf(mdY[1]) + 1).padStart(2, "0")}-${mdY[2].padStart(2, "0")}`;
  if (dMY) return `${dMY[3]}-${String(MONTHS.indexOf(dMY[2]) + 1).padStart(2, "0")}-${dMY[1].padStart(2, "0")}`;
  return "";
}
function classify(text) {
  if (EXCLUDE.test(text)) return null;
  for (const r of CATEGORY_RULES) if (r.test.test(text)) return r.type;
  return null;
}
function formatsIn(game, text) {
  const found = [];
  for (const f of FORMATS[game] || []) {
    if (new RegExp(`\\b${f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text) && !found.some(x => x.toLowerCase().includes(f.toLowerCase()))) found.push(f);
  }
  return found.join(", ");
}

/* ---------------- Source readers -> candidate list ---------------- */
async function readSitemap(src) {
  const { body } = await get(src.url);
  const out = [];
  for (const m of body.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const loc = (m[1].match(/<loc>([^<]+)<\/loc>/) || [])[1];
    const lastmod = isoDate((m[1].match(/<lastmod>([^<]+)<\/lastmod>/) || [])[1]);
    if (loc && src.include.test(loc.trim())) out.push({ url: normalizeUrl(loc.trim()), hint: lastmod });
  }
  return out;
}
async function readWpApi(src) {
  const { body } = await get(src.url);
  return JSON.parse(body).map(p => ({ url: normalizeUrl(p.link), hint: isoDate(p.date_gmt), title: decode(p.title?.rendered), description: decode(p.excerpt?.rendered), published: isoDate(p.date_gmt), publishedAt: p.date_gmt || "" }));
}
async function readHtmlList(src) {
  const { body } = await get(src.url);
  const base = new URL(src.url);
  const seen = new Set(), out = [];
  for (const m of body.matchAll(/<a[^>]+href=["']([^"'#]+)["']/gi)) {
    let abs; try { abs = normalizeUrl(new URL(m[1], base).toString()); } catch { continue; }
    if (src.include.test(abs) && abs !== normalizeUrl(src.url) && !seen.has(abs)) { seen.add(abs); out.push({ url: abs, hint: "" }); }
  }
  return out;
}

// Fetch an article and pull out facts: headline, description (classification only), dates, event details.
async function readArticle(c) {
  const { body, finalUrl } = await get(c.url);
  const ld = jsonLd(body);
  const art = ld.find(o => typeIs(o, "NewsArticle") || typeIs(o, "Article") || typeIs(o, "BlogPosting")) || {};
  const ev = ld.find(o => typeIs(o, "Event") || typeIs(o, "SportsEvent"));
  const headline = decode(art.headline) || meta(body, "og:title") || decode((body.match(/<title>([^<]*)<\/title>/i) || [])[1]);
  const timeTag = (body.match(/<time[^>]+datetime=["']([^"']+)["']/i) || [])[1] || "";
  const stamp = c.publishedAt || art.datePublished || meta(body, "article:published_time") || timeTag;
  const published = c.published || isoDate(art.datePublished) || isoDate(meta(body, "article:published_time")) || isoDate(timeTag);
  const publishedAt = isoStamp(stamp);
  const event = ev ? {
    start: isoDate(ev.startDate), end: isoDate(ev.endDate),
    venue: decode(ev.location?.name),
    city: decode(ev.location?.address?.addressLocality),
    country: decode(typeof ev.location?.address?.addressCountry === "object" ? ev.location.address.addressCountry.name : ev.location?.address?.addressCountry)
  } : null;
  return { ...c, url: canonicalOf(body, finalUrl), title: c.title || headline, description: c.description || meta(body, "og:description") || meta(body, "description"), published, publishedAt, event, html: body, ld };
}
// Full publisher timestamp (UTC ISO) when the source gives a time, else "". Used only to order same-day posts.
function isoStamp(s) {
  const m = String(s || "").match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)(Z|[+-]\d{2}:?\d{2})?$/);
  if (!m) return "";
  const d = new Date(m[1] + (m[2] || "Z"));
  return isNaN(d) ? "" : d.toISOString();
}

/* ---------------- Original summary writer (leads with verified facts; null = skip) ---------------- */
const ACTION_LABEL = { banned: "Now banned", unbanned: "No longer banned", restricted: "Now restricted", unrestricted: "No longer restricted", suspended: "Now suspended" };
function nameList(names, max = 6) {
  const shown = names.slice(0, max).join("; ");
  return names.length > max ? `${shown} and ${names.length - max} more` : shown;
}
function groupChanges(changes) {
  const groups = new Map();
  for (const c of changes) { const k = `${c.action}|${c.scope}`; if (!groups.has(k)) groups.set(k, { action: c.action, scope: c.scope, names: [] }); groups.get(k).names.push(c.name); }
  return [...groups.values()].sort((a, b) => b.names.length - a.names.length);
}
function baseItem(game, type, slug, a, headline) {
  const g = GAMES[game];
  return {
    id: `${game}-${slug}`, game, type, status: "announced",
    url: `news/${game}/${slug}/index.html`,
    announced: a.published, ...(a.publishedAt ? { announced_at: a.publishedAt } : {}), added_at: RUN_STAMP, updated: TODAY,
    source: { kind: "article", name: g.sourceName, url: a.url, headline },
    media: { type: "image", src: `news-media/rrc-${game}.svg`, alt: `Real Rune Cards ${g.label} news graphic`, rights: "store-owned" },
    auto: true, reviewed: { by: AUTO_BY, on: TODAY }
  };
}
function cleanHeadline(t) {
  return t.replace(/\s*[|–-]\s*(Magic: The Gathering|Disney Lorcana|Riftbound|Yu-Gi-Oh!.*|Pokémon.*)$/i, "").replace(/[®™]/g, "").trim().slice(0, 140);
}

// Returns { item } or { skip: reason }.
function buildItem(game, type, a) {
  const g = GAMES[game];
  const headline = cleanHeadline(a.title);
  const slug = slugify(new URL(a.url).pathname.split("/").filter(Boolean).pop() || headline);
  const bodyText = blocks(a.html).map(b => b.text).join(" ");

  if (type === "banlist") {
    const changes = banChanges(a.html, FORMATS[game] || []);
    if (!changes.length) return { skip: "skipped:no-card-changes-found" };
    const effective = statedEffectiveDate(`${a.title}. ${bodyText}`);
    const groups = groupChanges(changes);
    const lead = groups.map(gr => `${ACTION_LABEL[gr.action]}${gr.scope ? ` ${gr.scope}` : ""}: ${nameList(gr.names)}.`).join(" ");
    const unscoped = changes.some(c => !c.scope);
    const summary = `${effective ? `From ${fmtLong(effective)}. ` : ""}${lead}${unscoped ? " The official post lists which format each card applies to." : ""}`;
    const top = groups[0];
    const title = groups.length === 1
      ? `${g.label}: ${top.names.length === 1 ? top.names[0] : `${top.names[0]} and ${top.names.length - 1} more`} ${ACTION_LABEL[top.action].replace(/^Now /, "").toLowerCase()}${top.scope ? ` ${top.scope}` : ""}${effective ? ` from ${fmtLong(effective)}` : ""}`
      : `${g.label} ban list: ${changes.length} changes${effective ? ` from ${fmtLong(effective)}` : ""}`;
    const scopes = [...new Set(changes.map(c => c.scope.replace(/^in /, "").replace(/^as an? commander$/i, "Commander")).filter(Boolean))];
    const format = unscoped ? "See the official list for each card's format" : (scopes.join("; ") || "See the official list");
    return { item: { ...baseItem(game, type, slug, a, headline), title: title.slice(0, 150), summary, format, ...(effective ? { effective } : {}),
      details: groups.map(gr => ({ heading: `${ACTION_LABEL[gr.action]}${gr.scope ? ` ${gr.scope}` : ""}`, items: gr.names })) } };
  }

  if (type === "event") {
    const ev = eventFacts(a.ld, u => onOfficialHost(u, game));
    if (!ev) return { skip: "skipped:no-structured-event-details" };
    const where = [ev.venue, ev.city, ev.country].filter(Boolean).join(", ");
    const when = ev.end && ev.end !== ev.start ? `${fmtLong(ev.start)} to ${fmtLong(ev.end)}` : fmtLong(ev.start);
    const summary = `${ev.name} takes place ${ev.end && ev.end !== ev.start ? "from " : "on "}${when} at ${where}.${ev.registration ? " Registration is open on the official site." : ""}`;
    return { item: { ...baseItem(game, type, slug, a, headline), title: `${g.label}: ${ev.name}, ${fmtLong(ev.start)}, ${ev.city || ev.venue}`.slice(0, 150), summary,
      effective: ev.start, location: where, ...(ev.registration ? { registration: ev.registration } : {}) } };
  }

  // Rules updates: the concrete change can't be extracted reliably without a person (or an optional
  // language-model step), so these are skipped rather than posted as filler.
  return { skip: "skipped:rules-change-not-extractable" };
}

// Mirrors the checks in news/news.js so nothing is written that the site would hide.
function validItem(n) {
  return !!(n.id && n.title && n.summary && GAMES[n.game] && ["rules", "banlist", "event"].includes(n.type) &&
    /^news\/[a-z0-9-]+\/[a-z0-9-]+\/index\.html$/.test(n.url) && /^\d{4}-\d{2}-\d{2}$/.test(n.announced) &&
    (n.type !== "banlist" || n.format) && onOfficialHost(n.source.url, n.game));
}

function articleHtml(n) {
  const g = GAMES[n.game];
  const typeLabel = { banlist: "Ban list", rules: "Rules update", event: "Special event" }[n.type];
  const effLabel = { banlist: "Takes effect", rules: "Takes effect", event: "Event date" }[n.type];
  const rows = [
    n.format ? `<dt>Format</dt><dd>${esc(n.format)}</dd>` : "",
    `<dt>Announced</dt><dd><time datetime="${n.announced}">${fmtLong(n.announced)}</time></dd>`,
    n.effective ? `<dt>${effLabel}</dt><dd><time datetime="${n.effective}">${fmtLong(n.effective)}</time></dd>` : "",
    n.location ? `<dt>Where</dt><dd>${esc(n.location)}</dd>` : ""
  ].filter(Boolean).join("\n          ");
  const canon = `https://realrunecards.com/${n.url.replace(/index\.html$/, "")}`;
  const ld = JSON.stringify({ "@context": "https://schema.org", "@type": "NewsArticle", headline: n.title, description: n.summary, url: canon, mainEntityOfPage: canon, image: `${SITE}/og-home.png`, datePublished: n.updated, dateModified: n.updated, author: { "@type": "Organization", name: "Real Rune Cards" }, publisher: { "@type": "Organization", name: "Real Rune Cards Ltd" }, isBasedOn: n.source.url }).replace(/</g, "\\u003c");
  return `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Real Rune Cards">
<meta property="og:title" content="${esc(n.title)} | Real Rune Cards">
<meta property="og:description" content="${esc(n.summary)}">
<meta property="og:url" content="${canon}">
<meta property="og:image" content="https://realrunecards.com/og-home.png">
<link rel="icon" href="../../../realrunecards-logo.png">
<title>${esc(n.title)} | Real Rune Cards News</title>
<meta name="description" content="${esc(n.summary)}">
<link rel="canonical" href="${canon}">
<script defer src="https://cloud.umami.is/script.js" data-website-id="4f5087fd-3226-4798-8948-4bc9dc9b6160"></script>
<script defer src="../../../site-analytics.js"></script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<script type="application/ld+json">${ld}</script>
<style>
.rrc{--bg:#0b0b0b;--panel:#161412;--panel-2:#211b15;--line:#3a2e22;--text:#f5efe8;--muted:#c4b6a4;--gold:#ff7a00;--gold-soft:rgba(255,122,0,.12);--radius:14px;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:var(--text);background:var(--bg);line-height:1.6;font-size:16px;padding:36px 16px 0;background-image:radial-gradient(1200px 400px at 50% -10%,var(--gold-soft),transparent 70%)}
.rrc *{box-sizing:border-box}
.rrc .news-crumb a{color:var(--gold);text-underline-offset:3px;font-weight:600}
.rrc .news-hero{display:block;width:100%;height:auto;border-radius:10px;margin:0 0 16px}
</style>
<style>
.site-nav{background:#14110d;border-bottom:3px solid #ff7a00;font-family:Arial,Helvetica,sans-serif}
.site-nav .in{max-width:980px;margin:0 auto;padding:10px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.site-nav .brand{display:flex;align-items:center;gap:8px;color:#fff;text-decoration:none;font-weight:bold;letter-spacing:.04em;text-transform:uppercase;font-size:.95rem}
.site-nav .brand img{width:30px;height:30px;object-fit:contain}
.site-nav ul{list-style:none;margin:0;padding:0;display:flex;gap:4px;flex-wrap:wrap}
.site-nav a.lnk{display:block;color:#f3e7d6;text-decoration:none;font-size:.9rem;padding:6px 10px;border-radius:999px}
.site-nav a.lnk:hover,.site-nav a.lnk[aria-current=page]{background:#ff7a00;color:#fff}
@media print{.site-nav{display:none !important}}
@media (max-width:520px){.site-nav .in{justify-content:center}.site-nav a.lnk{font-size:.85rem;padding:6px 8px}}
@media (max-width:420px){.site-nav ul{gap:0}.site-nav a.lnk{font-size:.78rem;padding:5px 6px}}
</style>
<link rel="stylesheet" href="../../news.css">
</head>
<body style="margin:0;background:#0b0b0b">
<nav class="site-nav" aria-label="Site menu"><div class="in">
  <a class="brand" href="../../../index.html"><img src="../../../realrunecards-logo.png" alt="" onerror="this.remove()">Real Rune Cards</a>
  <ul><li><a class="lnk" href="../../../index.html">Home</a></li><li><a class="lnk" href="../../../start-playing.html">Learn to Play</a></li><li><a class="lnk" href="../../../events.html">Events</a></li><li><a class="lnk" href="../../../same-side.html">Same Side</a></li><li><a class="lnk" href="../../../skill-tree.html">Skill Tree</a></li><li><a class="lnk" href="../../index.html" aria-current="true">News</a></li></ul>
</div></nav>
<div class="rrc">
  <nav class="news-crumb" aria-label="Breadcrumb"><a href="../../index.html">← All player news</a></nav>
  <main>
    <article class="news-article" aria-labelledby="article-title">
      <div class="news-bar"></div>
      <div class="news-card-body">
        <img class="news-hero" src="../../../${n.media.src}" alt="${esc(n.media.alt)}" width="640" height="360">
        <ul class="news-tags" aria-label="Labels"><li>${esc(g.label)}</li><li>${typeLabel}</li><li class="status" data-status="announced">Announced</li></ul>
        <h1 id="article-title">${esc(n.title)}</h1>
        <p><strong>${esc(n.summary)}</strong></p>
        <dl class="news-dates">
          ${rows}
        </dl>
        ${(n.details || []).length ? `<h2>What changed</h2>\n        ${n.details.map(d => `<h3>${esc(d.heading)}</h3>\n        <ul>${d.items.map(i => `<li>${esc(i)}</li>`).join("")}</ul>`).join("\n        ")}` : ""}
        ${n.registration ? `<p><a href="${esc(n.registration)}" target="_blank" rel="noopener noreferrer">Register on the official site<span class="sr-only"> (opens in a new tab)</span></a></p>` : ""}
        <p class="news-beginner"><strong>Not sure how this affects you?</strong> Bring your deck into the shop and we'll go through it with you. See <a href="../../../events.html">this month's events at Real Rune Cards in Blackpool</a>, or start with our <a href="../../../start-playing.html">learn-to-play guides</a>.</p>
        <p class="news-source"><a href="${esc(n.source.url)}" target="_blank" rel="noopener noreferrer"><span class="kind">Official source</span>${esc(g.publisher)}: ${esc(n.source.headline)}<span class="sr-only"> (opens in a new tab)</span></a></p>
        <p class="news-updated">Updated <time datetime="${n.updated}">${fmtLong(n.updated)}</time>.</p>
      </div>
    </article>
  </main>
</div>
<style>@media print{.legal-foot{display:none!important}}</style><p class="legal-foot" style="max-width:980px;margin:0 auto;padding:18px 16px 28px;font:12px/1.5 Arial,Helvetica,sans-serif;color:#9a8f82;text-align:center;background:#0b0b0b">Real Rune Cards Ltd · Registered in England and Wales, company number 16969346 · Registered office: 74 Coronation Street, Blackpool FY1 4PD · <a href="../../../privacy.html" style="color:#ff7a00">Privacy policy</a></p>
</body>
</html>
`;
}

/* ---------------- Feed + state I/O ---------------- */
async function loadFeed() {
  const js = await readFile(FEED_PATH, "utf8");
  const start = js.indexOf("window.RRC_NEWS_FEED");
  const header = js.slice(0, start);
  const json = js.slice(js.indexOf("=", start) + 1).trim().replace(/;\s*$/, "");
  return { header, feed: JSON.parse(json) };
}
async function loadState() {
  try { return JSON.parse(await readFile(STATE_PATH, "utf8")); } catch { return { version: 1, seen: {}, yugioh_fl_list: "" }; }
}
async function exists(p) { try { await access(p); return true; } catch { return false; } }
async function writeIfChanged(file, content) {
  let old = null; try { old = await readFile(file, "utf8"); } catch { /* new file */ }
  if (old === content) return false;
  await writeFile(file, content, "utf8"); return true;
}

/* ---------------- Crawlable archive + XML sitemap ---------------- */
const SITE = "https://realrunecards.com";
// Indexable static pages (privacy.html is noindex, so it is left out).
const STATIC_PAGES = ["", "start-playing.html", "events.html", "same-side.html", "skill-tree.html", "contact.html", "calendar/november-2026.html", "calendar/december-2026.html", "news/"];

function archiveHtml(items) {
  const lis = items.map(n => {
    const href = n.url.replace(/^news\//, "").replace(/index\.html$/, "");
    const when = n.announced ? ` · ${fmtLong(n.announced)}` : "";
    return `        <li><a href="${esc(href)}">${esc(n.title)}</a>${when} · <a href="${esc(n.source.url)}" rel="noopener">Official source: ${esc(n.source.name)}</a></li>`;
  });
  return `<!-- NEWS-ARCHIVE:START (generated by tools/news-updater; do not edit by hand) -->\n      <ul>\n${lis.join("\n")}\n      </ul>\n      <!-- NEWS-ARCHIVE:END -->`;
}
async function updateArchive(items) {
  const file = path.join(ROOT, "news", "index.html");
  const html = await readFile(file, "utf8");
  const re = /<!-- NEWS-ARCHIVE:START[\s\S]*?<!-- NEWS-ARCHIVE:END -->/;
  if (!re.test(html)) throw new Error("news/index.html is missing the NEWS-ARCHIVE markers");
  return writeIfChanged(file, html.replace(re, archiveHtml(items)));
}
async function updateSitemap(items) {
  const pages = [];
  for (const p of STATIC_PAGES) if (p === "" || p.endsWith("/") || await exists(path.join(ROOT, ...p.split("/")))) pages.push({ loc: `${SITE}/${p}` });
  for (const n of items) pages.push({ loc: `${SITE}/${n.url.replace(/index\.html$/, "")}`, lastmod: n.updated });
  const body = pages.map(p => `  <url><loc>${esc(p.loc)}</loc>${p.lastmod ? `<lastmod>${p.lastmod}</lastmod>` : ""}</url>`).join("\n");
  const a = await writeIfChanged(path.join(ROOT, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`);
  const b = await writeIfChanged(path.join(ROOT, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
  return a || b;
}

/* ---------------- Main ---------------- */
async function main() {
  const { header, feed } = await loadFeed();
  const state = await loadState();
  const knownUrls = new Set(feed.items.map(i => normalizeUrl(i.source?.url)));
  const knownIds = new Set(feed.items.map(i => i.id));
  const knownTitles = new Set(feed.items.map(i => i.title.toLowerCase()));
  const report = [];
  const added = [];

  for (const src of SOURCES) {
    const r = { source: src.id, game: src.game, status: "ok", candidates: 0, fetched: 0, posted: 0, skipped: 0, note: "" };
    report.push(r);
    try {
      if (src.kind === "probe") {
        await get(src.url);
        r.status = "reachable-not-parsed"; r.note = "Reachable, but no parser is configured for this source yet.";
        continue;
      }
      if (src.kind === "ygo-fl") {
        const { body } = await get(src.url);
        const m = body.match(/href=["']([^"']*\/en\/limited\/list_(\d{4}-\d{2}-\d{2})[^"']*)["']/i);
        if (!m) { r.status = "no-data"; r.note = "Forbidden & Limited list link not found on the page."; continue; }
        const listUrl = normalizeUrl(new URL(m[1].replace(/\/+$/, "/"), src.url).toString()), eff = m[2];
        r.candidates = 1;
        const prev = state.yugioh_fl_list;
        state.yugioh_fl_list = listUrl;
        if (prev === listUrl || knownUrls.has(listUrl)) { r.note = `Current list (effective ${eff}) already known.`; continue; }
        if (!prev && daysBetween(eff, TODAY) > MAX_AGE) { r.note = `Baseline recorded: current list took effect ${eff}, more than ${MAX_AGE} days ago.`; continue; }
        const g = GAMES.yugioh;
        const rows = ygoListChanges((await get(listUrl)).body);
        if (!rows.length) { r.note = `New list ${eff} found, but no changed cards could be read; skipped.`; r.skipped = 1; continue; }
        const byStatus = new Map();
        for (const row of rows) { if (!byStatus.has(row.status)) byStatus.set(row.status, []); byStatus.get(row.status).push(`${row.name}${/^new$/i.test(row.remarks) ? "" : ` (${row.remarks.toLowerCase()})`}`); }
        const order = ["Forbidden", "Limited", "Semi-Limited", "Semi-limited", "Unlimited"];
        const groups = [...byStatus.entries()].sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
        const n = {
          id: `yugioh-forbidden-limited-${eff}`, game: "yugioh", type: "banlist", status: "announced",
          title: `Yu-Gi-Oh!: ${rows.length} Forbidden & Limited List changes from ${fmtLong(eff)}`,
          summary: `From ${fmtLong(eff)} in the Advanced Format. ` + groups.map(([s, names]) => `${s}: ${nameList(names)}.`).join(" "),
          url: `news/yugioh/forbidden-limited-${eff}/index.html`, format: "Advanced Format",
          announced: TODAY, added_at: RUN_STAMP, effective: eff, updated: TODAY,
          source: { kind: "article", name: g.sourceName, url: listUrl, headline: `Forbidden & Limited List (effective ${fmtLong(eff)})` },
          media: { type: "image", src: "news-media/rrc-yugioh.svg", alt: "Real Rune Cards Yu-Gi-Oh! news graphic", rights: "store-owned" },
          details: groups.map(([s, names]) => ({ heading: s, items: names })),
          auto: true, reviewed: { by: AUTO_BY, on: TODAY }
        };
        added.push(n); knownUrls.add(listUrl); knownIds.add(n.id); r.posted = 1;
        continue;
      }

      const list = src.kind === "sitemap" ? await readSitemap(src) : src.kind === "wp-api" ? await readWpApi(src) : await readHtmlList(src);
      // Recent first; items without a date hint go last and are dated from the article itself.
      const fresh = list
        .filter(c => !c.hint || daysBetween(c.hint, TODAY) <= MAX_AGE)
        .filter(c => !state.seen[c.url] && !knownUrls.has(c.url))
        .sort((a, b) => (b.hint || "").localeCompare(a.hint || ""));
      r.candidates = fresh.length;
      for (const c of fresh) {
        // Cheap pre-filter on what we already know (URL slug + any title from the API).
        const pre = `${new URL(c.url).pathname.replace(/[-/]/g, " ")} ${c.title || ""} ${c.description || ""}`;
        if (!classify(pre) && !c.title) { state.seen[c.url] = { on: TODAY, result: "skipped:not-in-scope" }; r.skipped++; continue; }
        if (c.title && !classify(pre)) { state.seen[c.url] = { on: TODAY, result: "skipped:not-in-scope" }; r.skipped++; continue; }
        if (r.fetched >= MAX_FETCHES_PER_SOURCE) { r.note = "Fetch limit reached; remaining items wait for the next run."; break; }
        let a;
        try { a = await readArticle(c); r.fetched++; }
        catch (e) { if (e instanceof AccessRestricted) throw e; r.note += ` ${c.url}: ${e.message}.`; continue; }
        const type = classify(`${a.title} ${a.description} ${new URL(a.url).pathname.replace(/[-/]/g, " ")}`);
        let why = "";
        if (!onOfficialHost(a.url, src.game)) why = "skipped:not-official-host";
        else if (!type) why = "skipped:not-in-scope";
        else if (!a.published) why = "skipped:no-publish-date";
        else if (daysBetween(a.published, TODAY) > MAX_AGE) why = "skipped:too-old";
        else if (knownUrls.has(a.url)) why = "skipped:duplicate";
        state.seen[c.url] = { on: TODAY, result: why || "posted" };
        if (why) { r.skipped++; continue; }
        const built = buildItem(src.game, type, a);
        if (built.skip) { state.seen[c.url].result = built.skip; r.skipped++; continue; }
        const n = built.item;
        while (knownIds.has(n.id)) { n.id += "-2"; n.url = n.url.replace(/\/index\.html$/, "-2/index.html"); }
        if (knownTitles.has(n.title.toLowerCase()) || !validItem(n)) { state.seen[c.url].result = "skipped:duplicate-or-invalid"; r.skipped++; continue; }
        added.push(n); knownUrls.add(a.url); knownIds.add(n.id); knownTitles.add(n.title.toLowerCase()); r.posted++;
      }
    } catch (e) {
      r.status = e instanceof AccessRestricted ? "access-restricted" : "error";
      r.note = (r.note + " " + e.message).trim();
    }
  }

  // Keep the seen list bounded.
  const seenEntries = Object.entries(state.seen).sort((a, b) => b[1].on.localeCompare(a[1].on));
  state.seen = Object.fromEntries(seenEntries.slice(0, 3000));

  let changed = false;
  if (added.length) {
    const manual = feed.items.filter(i => !i.auto);
    const auto = [...added, ...feed.items.filter(i => i.auto)].sort(newsOrder).slice(0, MAX_AUTO_ITEMS);
    feed.items = [...manual, ...auto].sort(newsOrder);
    feed.generated = TODAY;
    changed = true;
  }

  const lines = [`Player News run ${TODAY}${DRY ? " (dry run)" : ""}: ${added.length} new item(s).`, "", "| Source | Game | Status | Candidates | Fetched | Posted | Skipped | Note |", "|---|---|---|---|---|---|---|---|"];
  for (const r of report) lines.push(`| ${r.source} | ${r.game} | ${r.status} | ${r.candidates} | ${r.fetched} | ${r.posted} | ${r.skipped} | ${r.note.replace(/\|/g, "/").slice(0, 300)} |`);
  if (added.length) { lines.push("", "New items:"); for (const n of added) lines.push(`- [${n.game}/${n.type}] ${n.title} <- ${n.source.url}`, `  ${n.summary}`); }
  const text = lines.join("\n");
  console.log(text);
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, text + "\n");

  if (DRY) return;
  for (const n of added) {
    const file = path.join(ROOT, ...n.url.split("/"));
    if (await exists(file)) continue; // never overwrite an existing page
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, articleHtml(n), "utf8");
  }
  if (changed) await writeFile(FEED_PATH, `${header}window.RRC_NEWS_FEED = ${JSON.stringify(feed, null, 2)};\n`, "utf8");
  await writeIfChanged(STATE_PATH, JSON.stringify(state, null, 2) + "\n");
  // Static, crawlable links to every post (newest first) and a sitemap that lists them.
  const listed = [...feed.items].sort(newsOrder);
  await updateArchive(listed);
  await updateSitemap(listed);
  // Exit non-zero only if every source failed, so a single publisher outage never blocks the rest.
  if (report.every(r => r.status === "error" || r.status === "access-restricted")) process.exitCode = 1;
}

main().catch(e => { console.error(e); process.exitCode = 1; });
