#!/usr/bin/env node
// Live health check for realrunecards.com. Run: node tools/site/check-live.mjs
// Fails (exit 1) with a plain list of problems, so the scheduled GitHub workflow shows a red X
// and GitHub emails the repo owner before visitors notice. Read-only: it only fetches public pages.
import { LINKS } from "./chrome.mjs";

const SITE = "https://realrunecards.com/";
const UA = "RealRuneCards-site-health-check (+https://realrunecards.com/)";
const problems = [];
const ok = [];
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function get(url) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow" });
      const type = res.headers.get("content-type") || "";
      const body = /text|xml|javascript|json/.test(type) || /\.(js|json|xml)$/.test(url) ? await res.text() : "";
      return { status: res.status, body };
    } catch (e) {
      if (attempt === 3) return { status: 0, body: "", error: e.message };
      await sleep(2000 * attempt);
    }
  }
}

// Key pages and what each must contain to count as working
const PAGES = [
  { path: "", must: ["Visit the shop", "See upcoming events", "Shop cards and accessories", "74 Coronation Street", "data-rrc-calendar", "news/news-feed.js"] },
  { path: "events.html", must: ["Message us to book", "Upcoming Major Events", "events/major-events-data.js"] },
  { path: "start-playing.html", must: ["Choose your game", "Message us to book", "cdn.sender.net/accounts_resources/universal.js", 'data-sender-form-id="epYN4y"'] },
  { path: "skill-tree.html", must: ["How to join", "Enquire for a school or youth group", "cdn.sender.net/accounts_resources/universal.js", 'data-sender-form-id="bmZK13"'] },
  { path: "same-side.html", must: ["cdn.sender.net/accounts_resources/universal.js", 'data-sender-form-id="aQWog0"'] },
  { path: "contact.html", must: ["Visit the shop", "Get directions", "RealRuneCards@outlook.com"] },
  { path: "news/", must: ["Player News"] },
  { path: "privacy.html", must: ["Privacy"] },
  { path: "sitemap.xml", must: ["<urlset"] },
];
// Every page must carry analytics and the shared menu
const EVERY = ["cloud.umami.is/script.js", "site-analytics.js", 'class="rrc-nav"'];

for (const p of PAGES) {
  const url = SITE + p.path;
  const r = await get(url);
  if (r.status !== 200) { problems.push(`${url} returned ${r.status || r.error}`); continue; }
  const missing = [...p.must, ...(p.path.endsWith(".xml") ? [] : EVERY)].filter(m => !r.body.includes(m));
  if (missing.length) problems.push(`${url} is missing: ${missing.join(", ")}`);
  else ok.push(url);
  await sleep(500);
}

// Supporting files the pages depend on
for (const f of ["site-analytics.js", "site-chrome.css", "news/news-feed.js", "events/major-events-data.js", "calendar/calendar-data.js"]) {
  const r = await get(SITE + f);
  if (r.status !== 200) problems.push(`${SITE + f} returned ${r.status || r.error}`); else ok.push(SITE + f);
}

// Automated updates must actually reach the live site: the live news feed should match the repo's.
try {
  const { readFile } = await import("node:fs/promises");
  const local = await readFile(new URL("../../news/news-feed.js", import.meta.url), "utf8");
  const live = await get(SITE + "news/news-feed.js");
  const norm = s => s.replace(/\r\n/g, "\n").trim();
  if (live.status === 200 && norm(live.body) !== norm(local))
    problems.push("Live news/news-feed.js differs from the repository: the latest automatic update has not reached the site (check the Pages build).");
} catch { /* running outside the repo: skip this comparison */ }

// External services the site relies on
for (const [name, url] of [["Sender form script", "https://cdn.sender.net/accounts_resources/universal.js"], ["Umami script", "https://cloud.umami.is/script.js"], ["Online shop (Square)", LINKS.shop]]) {
  const r = await get(url);
  if (r.status < 200 || r.status >= 400) problems.push(`${name} (${url}) returned ${r.status || r.error}`); else ok.push(name);
}

console.log(`${ok.length} checks passed.`);
if (problems.length) {
  console.log(`\n${problems.length} problem(s) found on the live site:`);
  for (const p of problems) console.log(`- ${p}`);
  process.exitCode = 1;
}
