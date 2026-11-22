// Offline regression tests for the Upcoming Major Events draft collector.
import assert from "node:assert/strict";
import { parseRange, reconcile, keyOf } from "./collect-events.mjs";

let n = 0; const t = (name, fn) => { fn(); n++; console.log("ok -", name); };

t("same-month range", () => assert.deepEqual([parseRange("February 26–28, 2027").start, parseRange("February 26–28, 2027").end], ["2027-02-26", "2027-02-28"]));
t("cross-month range", () => { const r = parseRange("October 31–November 1, 2026"); assert.equal(r.start, "2026-10-31"); assert.equal(r.end, "2026-11-01"); });
t("publisher typo 'Feburary'", () => assert.equal(parseRange("Milwaukee, WI Feburary 19–21, 2027").start, "2027-02-19"));
t("hyphen and single day", () => { assert.equal(parseRange("May 14-16, 2027").end, "2027-05-16"); assert.equal(parseRange("July 12, 2026").end, "2026-07-12"); });
t("entity dash", () => assert.equal(parseRange("May 14&ndash;16, 2027").end, "2027-05-16"));

const base = { game: "riftbound", tier: "Regional", name: "Riftbound Regional Madrid", city: "Madrid, Spain", start: "2027-02-05", end: "2027-02-07", source: "S", evidence: "February 5-7, 2027" };
const key = keyOf(base);
const prev = [{ ...base, key, firstSeen: "2026-10-01" }];

t("unchanged event stays confirmed and keeps firstSeen", () => {
  const [e] = reconcile([{ ...base, key }], prev, { S: "February 5-7, 2027 Madrid" }, "2026-11-22");
  assert.equal(e.status, "confirmed"); assert.equal(e.firstSeen, "2026-10-01");
});
t("moved date is flagged, not silently replaced", () => {
  const moved = { ...base, start: "2027-02-12", end: "2027-02-14", evidence: "February 12-14, 2027" };
  const [e] = reconcile([{ ...moved, key: keyOf(moved) }], prev, { S: "February 12-14, 2027 Madrid" }, "2026-11-22");
  assert.equal(keyOf(moved), key); assert.equal(e.status, "date-changed"); assert.match(e.note, /2027-02-05/);
});
t("cancellation wording near the event is flagged", () => {
  const [e] = reconcile([{ ...base, key }], prev, { S: "Update: the February 5-7, 2027 Madrid Regional has been cancelled." }, "2026-11-22");
  assert.equal(e.status, "cancelled");
});
t("upcoming event missing from source is kept but flagged", () => {
  const out = reconcile([], prev, {}, "2026-11-22");
  assert.equal(out[0].status, "no-longer-listed");
});
t("events from a page that failed to load are kept unchanged", () => {
  const out = reconcile([], prev, {}, "2026-11-22", new Set(["S"]));
  assert.equal(out[0].status, undefined); assert.equal(out[0].start, "2027-02-05");
});
t("finished event missing from source goes to the archive", () => {
  const out = reconcile([], prev, {}, "2027-03-01");
  assert.equal(out[0].status, "past");
});
t("MagicCon and its Pro Tour merge; different events in one city don't", () => {
  const a = keyOf({ game: "magic", tier: "Pro Tour", name: "Pro Tour Nauctis", city: "Detroit, USA", start: "2027-02-26" });
  const b = keyOf({ game: "magic", tier: "MagicCon + Pro Tour", name: "MagicCon: Detroit", city: "Detroit, Michigan, USA", start: "2027-02-26" });
  const c = keyOf({ game: "magic", tier: "CommandFest", name: "CommandFest Beijing", city: "Beijing", start: "2026-05-30" });
  const d = keyOf({ game: "magic", tier: "Spotlight", name: "Magic Spotlight", city: "Beijing, China", start: "2026-10-31" });
  assert.equal(a, b); assert.notEqual(c, d);
});
console.log(`${n} tests passed`);
