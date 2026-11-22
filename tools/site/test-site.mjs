#!/usr/bin/env node
// Static checks for every public page. Run: node tools/site/test-site.mjs
import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { publicPages, applyChrome } from "./apply-chrome.mjs";
import { LINKS } from "./chrome.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const pages = await publicPages();
const titles = new Map(), descs = new Map();
let failures = 0;
const fail = (p, msg) => { failures++; console.log(`FAIL ${p}: ${msg}`); };

for (const rel of pages) {
  const html = await readFile(path.join(ROOT, ...rel.split("/")), "utf8");
  const base = "../".repeat(rel.split("/").length - 1);
  const navM = html.match(/<nav class="rrc-nav"[\s\S]*?<\/nav>/g) || [];
  if (navM.length !== 1) fail(rel, `expected 1 main menu, found ${navM.length}`);
  else for (const href of [base + "events.html", base + "start-playing.html", base + "skill-tree.html", base + "news/", LINKS.shop, base + "contact.html"])
    if (!navM[0].includes(`href="${href}"`)) fail(rel, `menu missing ${href}`);
  if (/class="site-nav"/.test(html)) fail(rel, "old per-page menu still present");
  if (!/class="rrc-skip" href="#main"/.test(html)) fail(rel, "no skip link");
  if ((html.match(/id="main"/g) || []).length !== 1) fail(rel, "skip-link target #main missing or duplicated");
  const book = (html.match(/<section class="rrc-community"[\s\S]*?<\/section>/) || [""])[0];
  for (const need of [LINKS.discord, LINKS.facebook, "Message us to book", "how many places", "74 Coronation Street", LINKS.directions.replace(/&/g, "&amp;").slice(0, 40)])
    if (!book.includes(need) && !book.includes(need.replace(/&amp;/g, "&"))) fail(rel, `booking block missing "${need.slice(0, 40)}"`);
  if (applyChrome(html, rel) !== html) fail(rel, "chrome out of date (run node tools/site/apply-chrome.mjs)");
  if (!/<link rel="canonical" href="https:\/\/realrunecards\.com\/[^"]*">/.test(html)) fail(rel, "no canonical link");
  const t = (html.match(/<title>([^<]+)<\/title>/) || [])[1], d = (html.match(/<meta name="description" content="([^"]+)"/) || [])[1];
  if (!t) fail(rel, "no <title>"); else { if (titles.has(t)) fail(rel, `title duplicates ${titles.get(t)}`); titles.set(t, rel); }
  if (!d) fail(rel, "no meta description"); else { if (descs.has(d)) fail(rel, `description duplicates ${descs.get(d)}`); descs.set(d, rel); }
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) { try { JSON.parse(m[1]); } catch { fail(rel, "invalid JSON-LD"); } }
  // Local links and assets must exist
  for (const m of html.matchAll(/(?:href|src)="([^"#:?]+)(?:[?#][^"]*)?"/g)) {
    const target = m[1]; if (/^(\/\/|data:)/.test(target)) continue;
    let p = path.join(ROOT, path.dirname(rel), target);
    if (target.endsWith("/")) p = path.join(p, "index.html");
    try { await access(p); } catch { fail(rel, `broken local link ${target}`); }
  }
}
await access(path.join(ROOT, "site-chrome.css")).catch(() => fail("site-chrome.css", "missing"));
console.log(`${pages.length} pages checked, ${failures} problem(s)`);
assert.equal(failures, 0);
