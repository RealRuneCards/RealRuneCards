// Regression test: Player News shows the newest official announcement first everywhere.
// Run: node tools/news-updater/test-order.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { newsOrder } from "./order.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
// The browser renderer's own comparator, taken straight from news/news.js.
const newsJs = readFileSync(path.join(ROOT, "news", "news.js"), "utf8");
const siteOrder = new Function(`${newsJs.slice(newsJs.indexOf("var GAMES"), newsJs.indexOf("function addRow"))}; return newsOrder;`)();

const ids = list => list.map(n => n.id);
let count = 0;
function check(name, input, expected) {
  for (const [label, cmp] of [["updater", newsOrder], ["site", siteOrder]]) {
    // Every rotation of the input must give the same order (no dependence on insertion order).
    for (let r = 0; r < input.length; r++) {
      const rotated = [...input.slice(r), ...input.slice(0, r)];
      assert.deepEqual(ids([...rotated].sort(cmp)), expected, `${name} (${label}, rotation ${r})`);
      assert.deepEqual(ids([...rotated].reverse().sort(cmp)), expected, `${name} (${label}, reversed rotation ${r})`);
    }
  }
  count++; console.log("ok -", name);
}

check("newer announcement goes on top of older ones (out-of-order insertion)", [
  { id: "a", announced: "2026-11-03" }, { id: "c", announced: "2026-11-20" }, { id: "b", announced: "2026-11-13" }
], ["c", "b", "a"]);

check("effective date does not affect order", [
  { id: "old-announce-late-effect", announced: "2026-11-01", effective: "2027-01-01" },
  { id: "new-announce-early-effect", announced: "2026-11-15", effective: "2026-11-16" }
], ["new-announce-early-effect", "old-announce-late-effect"]);

check("same day: later publisher timestamp first", [
  { id: "morning", announced: "2026-11-22", announced_at: "2026-11-22T09:00:00.000Z" },
  { id: "evening", announced: "2026-11-22", announced_at: "2026-11-22T18:30:00.000Z" }
], ["evening", "morning"]);

check("same day, no timestamps: most recently added first", [
  { id: "first-added", announced: "2026-11-22", added_at: "2026-11-22T06:17:00.000Z" },
  { id: "second-added", announced: "2026-11-22", added_at: "2026-11-22T12:17:00.000Z" }
], ["second-added", "first-added"]);

check("same day: an item with a timestamp beats an older hand-written item without one", [
  { id: "manual", announced: "2026-11-22" },
  { id: "auto", announced: "2026-11-22", announced_at: "2026-11-22T10:00:00.000Z", added_at: "2026-11-22T12:00:00.000Z" }
], ["auto", "manual"]);

check("complete tie is deterministic by id", [
  { id: "zeta", announced: "2026-11-22" }, { id: "alpha", announced: "2026-11-22" }
], ["alpha", "zeta"]);

check("missing announced falls back to updated", [
  { id: "no-date", updated: "2026-11-21" }, { id: "dated", announced: "2026-11-10" }, { id: "newest", announced: "2026-11-22" }
], ["newest", "no-date", "dated"]);

// Homepage shows the latest 3 per filter: filtering after sorting must keep newest-first order.
const feed = [
  { id: "m1", game: "magic", announced: "2026-10-01" }, { id: "l1", game: "lorcana", announced: "2026-11-03" },
  { id: "m2", game: "magic", announced: "2026-11-20" }, { id: "r1", game: "riftbound", announced: "2026-11-13" },
  { id: "m3", game: "magic", announced: "2026-11-21" }, { id: "m4", game: "magic", announced: "2026-11-05" }
].sort(siteOrder);
assert.deepEqual(ids(feed.slice(0, 3)), ["m3", "m2", "r1"]);
assert.deepEqual(ids(feed.filter(n => n.game === "magic").slice(0, 3)), ["m3", "m2", "m4"]);
count++; console.log("ok - homepage limit of 3 and game filters keep newest first");

// The published feed file itself must already be in newest-first order.
const window = {}; new Function("window", readFileSync(path.join(ROOT, "news", "news-feed.js"), "utf8"))(window);
const items = window.RRC_NEWS_FEED.items;
assert.deepEqual(ids(items), ids([...items].sort(newsOrder)), "news-feed.js is not in newest-first order");
count++; console.log("ok - news-feed.js is stored newest first");

console.log(`${count} ordering tests passed`);
