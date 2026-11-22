// Player News ordering: newest official announcement first.
// Keep in sync with newsOrder() in news/news.js (test-order.mjs checks both give the same order).
//  1. announced (official publication date, YYYY-MM-DD), falling back to updated when missing
//  2. announced_at (exact publisher timestamp, when the source gives one)
//  3. added_at (when the collector added the item), so a later same-day post goes on top
//  4. id, for a stable order when everything else is equal
export function newsOrder(a, b) {
  const k = n => [n.announced || n.updated || "", n.announced_at || "", n.added_at || ""];
  const x = k(a), y = k(b);
  for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i] < y[i] ? 1 : -1;
  return String(a.id || "").localeCompare(String(b.id || ""));
}
