/* Real Rune Cards: shared events calendar for the Home and Events pages.
 *
 * Builds the calendar for the current month in Europe/London time, for any month, from the usual weekly
 * schedule below plus month-by-month changes in calendar-data.js (the file to edit). It picks the month on
 * load and keeps checking while the tab is open, so a tab left open overnight moves to the next month at
 * midnight London time on the 1st.
 *
 * Without JavaScript, the pages show the static summary inside [data-rrc-calendar], which links to the
 * static monthly pages in this folder (november-2026.html, december-2026.html).
 *
 * Confirmed by Cal:
 *   14 Nov 2026: Lorcana every Monday, Magic every Tuesday, Riftbound every Thursday,
 *                Craft Night every Friday evening, Board Game Night every other Sunday.
 *   15 Nov 2026: Board Game Night on 8 and 22 November, then every fortnight on Sundays (6 and 20 December, ...).
 * Not confirmed, so not claimed: event times, prices, and holiday changes. The site labels the schedule as
 * the usual pattern, subject to confirmation.
 */
(function (root) {
  "use strict";

  var WEEKLY = [
    { id: "lorcana", dow: 1, short: "Lorcana", name: "Disney Lorcana", when: "Mondays" },
    { id: "magic", dow: 2, short: "Magic", name: "Magic: The Gathering", when: "Tuesdays" },
    { id: "riftbound", dow: 4, short: "Riftbound", name: "Riftbound", when: "Thursdays" },
    { id: "crafts", dow: 5, short: "Craft Night", name: "Craft Night", when: "Friday evenings" }
  ];
  var BOARD_GAMES = { id: "boardgames", short: "Board Games", name: "Board Game Night", when: "every other Sunday" };
  // Board Game Night: every 14 days from Sunday 8 November 2026 (so 22 Nov, 6 Dec, 20 Dec, 3 Jan 2027, ...).
  var BOARD_GAMES_ANCHOR = Date.UTC(2026, 10, 8);
  var DAY_MS = 86400000;

  var MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var DISCORD = "https://discord.gg/Q7mbwSXSdW";
  var FACEBOOK = "https://www.facebook.com/share/g/1YcmRjop4f/";
  // Months with a static (no-JavaScript) page in this folder
  var STATIC_PAGES = { "2026-11": "november-2026.html", "2026-12": "december-2026.html" };

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function monthKey(y, m) { return y + "-" + pad(m + 1); }
  function daysIn(y, m) { return new Date(Date.UTC(y, m + 1, 0)).getUTCDate(); }
  function weekday(y, m, d) { return new Date(Date.UTC(y, m, d)).getUTCDay(); }
  function validDay(d, y, m) { return typeof d === "number" && d % 1 === 0 && d >= 1 && d <= daysIn(y, m); }

  /* Today's date in Europe/London as {y, m (0-based), d}. */
  function londonToday(now) {
    now = now || new Date();
    try {
      var parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/London", year: "numeric", month: "numeric", day: "numeric"
      }).formatToParts(now);
      var o = {};
      for (var i = 0; i < parts.length; i++) o[parts[i].type] = parseInt(parts[i].value, 10);
      if (o.year && o.month && o.day) return { y: o.year, m: o.month - 1, d: o.day };
    } catch (e) { /* fall through */ }
    // Very old browsers without time zone support: UTC. This matches London from late October to late March,
    // so month changes (always at midnight on the 1st) are right from November to March.
    return { y: now.getUTCFullYear(), m: now.getUTCMonth(), d: now.getUTCDate() };
  }

  /* Is Board Game Night on this date? Only Sundays on or after the anchor, 14 days apart. */
  function isBoardGameDay(y, m, d) {
    var t = Date.UTC(y, m, d);
    if (t < BOARD_GAMES_ANCHOR || weekday(y, m, d) !== 0) return false;
    return Math.round((t - BOARD_GAMES_ANCHOR) / DAY_MS) % 14 === 0;
  }

  /* Custom data for a month from calendar-data.js, cleaned so a typo cannot break the calendar. */
  function monthData(y, m, data) {
    var all = data || root.RRC_CALENDAR_DATA, raw;
    try { raw = all && all.months && all.months[monthKey(y, m)]; } catch (e) { raw = null; }
    var out = { note: "", tbc: [], cancel: [], add: [] };
    if (!raw || typeof raw !== "object") return out;
    if (typeof raw.note === "string") out.note = raw.note;
    (Array.isArray(raw.tbc) ? raw.tbc : []).forEach(function (d) { if (validDay(d, y, m)) out.tbc.push(d); });
    (Array.isArray(raw.cancel) ? raw.cancel : []).forEach(function (c) {
      if (c && validDay(c.day, y, m)) out.cancel.push({ day: c.day, event: typeof c.event === "string" ? c.event : "" });
    });
    (Array.isArray(raw.add) ? raw.add : []).forEach(function (a) {
      if (a && validDay(a.day, y, m) && typeof a.name === "string" && a.name) {
        out.add.push({ day: a.day, name: a.name, short: typeof a.short === "string" && a.short ? a.short : a.name });
      }
    });
    return out;
  }

  /* Everything needed to show one month. */
  function buildMonth(y, m, data) {
    var custom = monthData(y, m, data), days = [], boardGames = [];
    for (var d = 1; d <= daysIn(y, m); d++) {
      var dow = weekday(y, m, d), evs = [];
      WEEKLY.forEach(function (w) { if (w.dow === dow) evs.push({ id: w.id, short: w.short, name: w.name }); });
      if (isBoardGameDay(y, m, d)) { evs.push({ id: BOARD_GAMES.id, short: BOARD_GAMES.short, name: BOARD_GAMES.name }); boardGames.push(d); }
      evs = evs.filter(function (e) {
        return !custom.cancel.some(function (c) { return c.day === d && (!c.event || c.event === e.id); });
      });
      custom.add.forEach(function (a) { if (a.day === d) evs.push({ id: "special", short: a.short, name: a.name, special: true }); });
      var tbc = custom.tbc.indexOf(d) !== -1;
      evs.forEach(function (e) { e.tbc = tbc && !e.special; });
      days.push({ d: d, dow: dow, events: evs });
    }
    boardGames = boardGames.filter(function (bd) { return days[bd - 1].events.some(function (e) { return e.id === "boardgames"; }); });
    return { y: y, m: m, key: monthKey(y, m), name: MONTH_NAMES[m], days: days, boardGames: boardGames, note: custom.note,
      hasTbc: custom.tbc.length > 0, staticPage: STATIC_PAGES[monthKey(y, m)] || "" };
  }

  function evHtml(e) {
    return '<span class="ev ' + e.id + (e.tbc ? " tbc" : "") + '">' + esc(e.short) +
      (e.short !== e.name ? '<span class="rrc-sr">: ' + esc(e.name) + "</span>" : "") +
      (e.tbc ? '<span aria-hidden="true">*</span><span class="rrc-sr"> (to be confirmed)</span>' : "") + "</span>";
  }

  function render(el, month, today) {
    var isCurrent = today.y === month.y && today.m === month.m;
    var lead = (weekday(month.y, month.m, 1) + 6) % 7;
    var id = "rrc-cal-title-" + month.key;
    var h = [], cells = [], list = [], i;

    for (i = 0; i < lead; i++) cells.push('<td class="empty"></td>');
    month.days.forEach(function (day) {
      var past = isCurrent && day.d < today.d, cls = past ? ' class="past"' : "";
      cells.push("<td" + cls + '><span class="d">' + day.d + "</span>" + day.events.map(evHtml).join("") + "</td>");
      if (day.events.length) {
        list.push("<li" + cls + '><span class="when">' + DAY_NAMES[day.dow] + " " + day.d + " " + month.name + "</span>" +
          '<span class="what">' + day.events.map(evHtml).join("") + "</span></li>");
      }
    });
    while (cells.length % 7) cells.push('<td class="empty"></td>');

    h.push('<figure class="rrc-cal-poster" aria-labelledby="' + id + '">');
    h.push('<div class="rrc-cal-head"><p class="rrc-cal-title" id="' + id + '">' + month.name + "<span>" + month.y + "</span></p>" +
      '<p class="rrc-cal-brand">Real Rune Cards<small>74 Coronation Street · Blackpool</small></p></div>');
    // Grid for wider screens
    h.push('<table class="rrc-cal-grid"><caption>Usual weekly events, ' + month.name + " " + month.y + "</caption><thead><tr>");
    ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].forEach(function (s, k) {
      h.push('<th scope="col"><abbr title="' + DAY_NAMES[(k + 1) % 7] + '">' + s + "</abbr></th>");
    });
    h.push("</tr></thead><tbody>");
    for (i = 0; i < cells.length; i += 7) h.push("<tr>" + cells.slice(i, i + 7).join("") + "</tr>");
    h.push("</tbody></table>");
    // Day-by-day list for phones
    h.push('<ul class="rrc-cal-list" aria-label="Event days, ' + month.name + " " + month.y + '">' + list.join("") + "</ul>");
    // Key and notes
    h.push('<div class="rrc-cal-foot"><ul class="key" aria-label="Key">');
    WEEKLY.concat([BOARD_GAMES]).forEach(function (e) {
      h.push('<li><i class="' + e.id + '" aria-hidden="true"></i>' + e.name + " · " + e.when + "</li>");
    });
    h.push("</ul><div>");
    if (month.boardGames.length) {
      h.push("<p><b>Board Game Night</b> this month: Sunday " +
        month.boardGames.slice(0, -1).join(", ") + (month.boardGames.length > 1 ? " and " : "") +
        month.boardGames[month.boardGames.length - 1] + " " + month.name + ".</p>");
    }
    if (month.note) h.push("<p>" + (month.hasTbc ? '<span aria-hidden="true">* </span>' : "") + esc(month.note) + "</p>");
    else if (month.hasTbc) h.push('<p><span aria-hidden="true">* </span>Not confirmed yet.</p>');
    h.push("<p>This is our usual weekly schedule and dates can change, so check with us before you come.</p>");
    h.push('<p><b>Times and booking:</b> message us on <a href="' + DISCORD + '" target="_blank" rel="noopener">Discord</a> or <a href="' +
      FACEBOOK + '" target="_blank" rel="noopener">Facebook</a>. New players always welcome.</p>');
    h.push("</div></div></figure>");

    el.innerHTML = h.join("");
    el.setAttribute("data-month", month.key);
  }

  function start() {
    var els = document.querySelectorAll("[data-rrc-calendar]");
    if (!els.length) return;
    var shown = "";
    function update() {
      var today = londonToday(), key = monthKey(today.y, today.m) + "-" + pad(today.d);
      if (key === shown) return; // re-render only when the London date changes (past days fade daily)
      shown = key;
      var month = buildMonth(today.y, today.m);
      for (var i = 0; i < els.length; i++) render(els[i], month, today);
    }
    update();
    // Keep open tabs current: check often, and straight away when the tab or device wakes up.
    setInterval(update, 15000);
    document.addEventListener("visibilitychange", function () { if (!document.hidden) update(); });
    window.addEventListener("focus", update);
    window.addEventListener("pageshow", update);
  }

  root.RRCCalendar = { londonToday: londonToday, isBoardGameDay: isBoardGameDay, buildMonth: buildMonth, start: start };
  if (typeof module !== "undefined" && module.exports) module.exports = root.RRCCalendar;
  if (typeof document !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
    else start();
  }
})(typeof window !== "undefined" ? window : globalThis);
