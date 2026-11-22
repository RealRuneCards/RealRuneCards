#!/usr/bin/env node
// Writes the shared chrome (tools/site/chrome.mjs) into every public HTML page.
// Idempotent: content between SITE-CHROME markers is regenerated; first run replaces the old per-page menu.
//   node tools/site/apply-chrome.mjs [--check]   (--check: exit 1 if any page is out of date, change nothing)
import { readFile, writeFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { skipLink, nav, community, stylesheet } from "./chrome.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CHECK = process.argv.includes("--check");
const SKIP = new Set(["events/index.html"]); // redirect page

export async function publicPages(dir = ROOT, rel = "") {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.name.startsWith(".") || e.name === "tools" || e.name === "node_modules") continue;
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...await publicPages(path.join(dir, e.name), r));
    else if (e.name.endsWith(".html") && !SKIP.has(r)) out.push(r);
  }
  return out.sort();
}
export function currentKey(rel) {
  if (rel === "index.html") return "home";
  if (rel === "events.html" || rel.startsWith("calendar/")) return "events";
  if (rel === "start-playing.html") return "learn";
  if (rel === "skill-tree.html") return "skilltree";
  if (rel.startsWith("news/")) return "news";
  if (rel === "contact.html") return "contact";
  return "";
}
const baseOf = rel => "../".repeat(rel.split("/").length - 1);
const block = (name, html) => `<!-- SITE-CHROME:${name} -->${html}<!-- /SITE-CHROME:${name} -->`;
const markerRe = name => new RegExp(`<!-- SITE-CHROME:${name} -->[\\s\\S]*?<!-- /SITE-CHROME:${name} -->`);

export function applyChrome(html, rel) {
  const base = baseOf(rel), cur = currentKey(rel);
  // 1. Stylesheet in <head>
  const css = block("CSS", stylesheet(base));
  html = markerRe("CSS").test(html) ? html.replace(markerRe("CSS"), css) : html.replace(/<\/head>/i, `${css}\n</head>`);
  // 2. Skip link + menu at the top of <body>, replacing any older per-page menu
  const top = block("TOP", skipLink() + nav(base, cur));
  if (markerRe("TOP").test(html)) html = html.replace(markerRe("TOP"), top);
  else {
    html = html.replace(/<nav class="site-nav"[\s\S]*?<\/nav>\s*/i, "");
    html = html.replace(/(<body\b[^>]*>)/i, `$1\n${top}`);
  }
  // 3. Skip-link target
  if (!/id="main"/.test(html)) {
    if (/<main\b/i.test(html)) html = html.replace(/<main\b([^>]*)>/i, (m, a) => /\bid=/.test(a) ? m : `<main id="main" tabindex="-1"${a}>`);
    else html = html.replace(/<h1\b([^>]*)>/i, (m, a) => /\bid=/.test(a) ? `<span id="main" tabindex="-1"></span>${m}` : `<h1 id="main" tabindex="-1"${a}>`);
  }
  // 4. "Message us to book" block before the legal footer
  const book = block("BOOK", community(base));
  if (markerRe("BOOK").test(html)) html = html.replace(markerRe("BOOK"), book);
  else if (/<style>@media print\{\.legal-foot/.test(html)) html = html.replace(/<style>@media print\{\.legal-foot/, `${book}\n<style>@media print{.legal-foot`);
  else if (/<footer\b/i.test(html)) html = html.replace(/<footer\b/i, `${book}\n<footer`);
  else html = html.replace(/<\/body>/i, `${book}\n</body>`);
  return html;
}

async function main() {
  const stale = [];
  for (const rel of await publicPages()) {
    const file = path.join(ROOT, ...rel.split("/"));
    const before = await readFile(file, "utf8");
    const after = applyChrome(before, rel);
    if (after !== before) { stale.push(rel); if (!CHECK) await writeFile(file, after, "utf8"); }
  }
  console.log(CHECK ? `${stale.length} page(s) out of date${stale.length ? ": " + stale.join(", ") : ""}` : `Updated ${stale.length} page(s)${stale.length ? ": " + stale.join(", ") : ""}`);
  if (CHECK && stale.length) process.exitCode = 1;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
