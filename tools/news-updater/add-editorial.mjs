#!/usr/bin/env node
// Adds hand-checked Player News posts from tools/news-updater/editorial-posts.json.
// Use for official announcements the automatic collector can't post on its own (publisher blocks
// automated access, rules changes that need a person to summarise, or items older than its window).
// Each entry is one of:
//   { "kind": "url",    "game", "type", "url" }      facts are extracted by the normal collector code
//   { "kind": "ygo-fl", "url", "effective", "announced", "note"? }   Konami Forbidden & Limited list
//   { "kind": "manual", "item": { game, type, slug, title, summary, announced, effective?, format?, location?,
//                                 details?, source: { url, headline } } }   written and checked by a person
// Already-published sources are skipped, so the file can be re-run safely.
//   node tools/news-updater/add-editorial.mjs [--dry-run]
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readArticle, buildItem, validItem, articleHtml, loadFeed, loadState, updateArchive, updateSitemap, normalizeUrl, onOfficialHost, FEED_PATH, STATE_PATH, ROOT } from "./update-news.mjs";
import { ygoListChanges } from "./facts.mjs";
import { newsOrder } from "./order.mjs";
import { applyChrome } from "../site/apply-chrome.mjs";
import { GAMES, USER_AGENT } from "./sources.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DRY = process.argv.includes("--dry-run");
const TODAY = new Date().toISOString().slice(0, 10);
const STAMP = new Date().toISOString();
const BY = "Real Rune Cards (checked against the official source)";
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const fmt = d => { const [y, m, day] = d.split("-").map(Number); return `${day} ${MONTHS[m - 1]} ${y}`; };
const list = (names, max = 6) => names.length > max ? `${names.slice(0, max).join("; ")} and ${names.length - max} more` : names.join("; ");

function finish(item) {
  const g = GAMES[item.game];
  return {
    id: `${item.game}-${item.slug}`, game: item.game, type: item.type, status: "announced",
    title: item.title, summary: item.summary, url: `news/${item.game}/${item.slug}/index.html`,
    ...(item.format ? { format: item.format } : {}), ...(item.location ? { location: item.location } : {}),
    announced: item.announced, ...(item.effective ? { effective: item.effective } : {}),
    added_at: STAMP, updated: TODAY,
    source: { kind: "article", name: g.sourceName, url: normalizeUrl(item.source.url), headline: item.source.headline },
    media: { type: "image", src: `news-media/rrc-${item.game}.svg`, alt: `Real Rune Cards ${g.label} news graphic`, rights: "store-owned" },
    ...(item.details ? { details: item.details } : {}),
    reviewed: { by: BY, on: TODAY }
  };
}

async function build(entry) {
  if (entry.kind === "manual") return finish(entry.item);
  if (entry.kind === "url") {
    const a = await readArticle({ url: normalizeUrl(entry.url) });
    const built = buildItem(entry.game, entry.type, a);
    if (built.skip) throw new Error(`${entry.url}: ${built.skip}`);
    const { auto, ...item } = built.item;
    return { ...item, reviewed: { by: BY, on: TODAY } };
  }
  if (entry.kind === "ygo-fl") {
    const res = await fetch(entry.url, { headers: { "User-Agent": USER_AGENT } });
    if (!res.ok) throw new Error(`${entry.url}: HTTP ${res.status}`);
    const rows = ygoListChanges(await res.text());
    if (!rows.length) throw new Error(`${entry.url}: no changed cards found`);
    const by = new Map();
    for (const r of rows) { if (!by.has(r.status)) by.set(r.status, []); by.get(r.status).push(`${r.name}${/^new$/i.test(r.remarks) ? "" : ` (${r.remarks.toLowerCase()})`}`); }
    const order = ["Forbidden", "Limited", "Semi-Limited", "Semi-limited", "Unlimited"];
    const groups = [...by.entries()].sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
    return finish({
      game: "yugioh", type: "banlist", slug: `forbidden-limited-${entry.effective}`,
      title: `Yu-Gi-Oh!: ${rows.length} Forbidden & Limited List changes from ${fmt(entry.effective)}`,
      summary: `From ${fmt(entry.effective)} in the Advanced Format. ` + groups.map(([s, n]) => `${s}: ${list(n)}.`).join(" ") + (entry.note ? ` ${entry.note}` : ""),
      format: "Advanced Format", announced: entry.announced, effective: entry.effective,
      source: { url: entry.url, headline: `Forbidden & Limited Lists (effective ${fmt(entry.effective)})` },
      details: groups.map(([s, n]) => ({ heading: s, items: n }))
    });
  }
  throw new Error(`unknown kind ${entry.kind}`);
}

const entries = JSON.parse(await readFile(path.join(HERE, "editorial-posts.json"), "utf8"));
const { header, feed } = await loadFeed();
const state = await loadState();
const known = new Set(feed.items.map(i => normalizeUrl(i.source?.url)));
const ids = new Set(feed.items.map(i => i.id));
const added = [];
for (const e of entries) {
  const url = normalizeUrl(e.url || e.item?.source?.url);
  if (known.has(url)) { console.log(`skip (already published): ${url}`); continue; }
  const n = await build(e);
  if (ids.has(n.id)) throw new Error(`duplicate id ${n.id}`);
  if (!validItem(n) || !onOfficialHost(n.source.url, n.game)) throw new Error(`invalid item ${n.id}`);
  added.push(n); known.add(n.source.url); ids.add(n.id);
  state.seen[n.source.url] = { on: TODAY, result: "posted:editorial" };
  if (e.kind === "ygo-fl") state.yugioh_fl_list = n.source.url;
  console.log(`add [${n.game}/${n.type}] ${n.announced} ${n.title}\n    ${n.summary}`);
}
if (DRY || !added.length) { console.log(DRY ? "dry run: nothing written" : "nothing new"); process.exit(0); }
for (const n of added) {
  const file = path.join(ROOT, ...n.url.split("/"));
  try { await access(file); throw new Error(`page already exists: ${n.url}`); } catch (err) { if (err.code !== "ENOENT") throw err; }
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, applyChrome(articleHtml(n), n.url), "utf8");
}
feed.items = [...feed.items, ...added].sort(newsOrder);
feed.generated = TODAY;
await writeFile(FEED_PATH, `${header}window.RRC_NEWS_FEED = ${JSON.stringify(feed, null, 2)};\n`, "utf8");
await writeFile(STATE_PATH, JSON.stringify(state, null, 2) + "\n", "utf8");
await updateArchive(feed.items);
await updateSitemap(feed.items);
console.log(`added ${added.length} post(s)`);
