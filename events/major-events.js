/* ===== REAL RUNE CARDS: UPCOMING MAJOR EVENTS =====
 Renders window.RRC_MAJOR_EVENTS (events/major-events-data.js) into <section data-major-events>.
 Tabs: Riftbound (default), Disney Lorcana, Magic. All text is inserted as plain text.
 Upcoming vs past is worked out from today's date in London, so events move to the archive on time. */
(function () {
  var ORDER = ["riftbound", "lorcana", "magic"];
  var GAMES = { riftbound: "Riftbound", lorcana: "Disney Lorcana", magic: "Magic" };
  var M = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var FLAGS = { "date-changed": "Dates changed", cancelled: "Cancelled or postponed", "no-longer-listed": "No longer listed", "needs-review": "Being checked" };

  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function todayLondon() {
    try { return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }
    catch (e) { return new Date().toISOString().slice(0, 10); }
  }
  function parts(s) { var p = s.split("-"); return { y: +p[0], m: +p[1] - 1, d: +p[2] }; }
  function when(e) {
    if (!e.start) return "Date TBC";
    var a = parts(e.start), b = parts(e.end || e.start);
    if (!e.end || e.start === e.end) return a.d + " " + M[a.m] + " " + a.y;
    if (a.m === b.m && a.y === b.y) return a.d + "–" + b.d + " " + M[a.m] + " " + a.y;
    if (a.y === b.y) return a.d + " " + M[a.m] + " – " + b.d + " " + M[b.m] + " " + a.y;
    return a.d + " " + M[a.m] + " " + a.y + " – " + b.d + " " + M[b.m] + " " + b.y;
  }
  function where(e) { return [e.venue, e.city].filter(Boolean).join(", ") || "Location not yet announced"; }
  function link(e, cls) {
    var a = el("a", cls, e.linkLabel || "Official page");
    a.href = e.link; a.target = "_blank"; a.rel = "noopener";
    a.appendChild(el("span", "sr-only", " (opens in a new tab)"));
    return a;
  }
  function flag(e) { return FLAGS[e.status] ? el("span", "mj-flag", FLAGS[e.status]) : null; }

  function init() {
    var root = document.querySelector("[data-major-events]");
    var D = window.RRC_MAJOR_EVENTS;
    if (!root || !D || !Array.isArray(D.events)) return;
    var today = todayLondon();
    var events = D.events.map(function (e) {
      var s = e.status;
      if ((s === "confirmed" || s === "date-changed") && e.end && e.end < today) s = "past";
      return Object.assign({}, e, { status: s });
    });

    var tabs = root.querySelector("[data-major-tabs]"), panel = root.querySelector("[data-major-panel]");
    tabs.hidden = false;
    var hash = (location.hash || "").replace("#major-", "");
    var current = ORDER.indexOf(hash) >= 0 ? hash : ORDER[0];

    function render(g) {
      var all = events.filter(function (e) { return e.game === g; });
      var live = function (e) { return e.status === "confirmed" || e.status === "date-changed"; };
      var up = all.filter(live).sort(function (a, b) { return a.start.localeCompare(b.start); });
      var tbc = all.filter(function (e) { return e.status === "tbc"; });
      var flagged = all.filter(function (e) { return e.status === "cancelled" || e.status === "no-longer-listed" || e.status === "needs-review"; });
      var past = all.filter(function (e) { return e.status === "past"; }).sort(function (a, b) { return b.start.localeCompare(a.start); });
      panel.innerHTML = "";
      panel.setAttribute("aria-labelledby", "major-tab-" + g);

      panel.appendChild(el("h3", null, "Next three " + GAMES[g] + " events"));
      var next = up.filter(function (e) { return e.tier !== "Qualifier"; }).slice(0, 3);
      if (next.length) {
        var ul = el("ul", "mj-next3");
        next.forEach(function (e) {
          var li = el("li", "mj-card");
          li.appendChild(el("span", "mj-tier", e.tier)); var f = flag(e); if (f) li.appendChild(f);
          li.appendChild(el("div", "mj-when", when(e)));
          li.appendChild(el("div", "mj-name", e.name));
          li.appendChild(el("div", "mj-where", where(e)));
          li.appendChild(link(e, "mj-go"));
          ul.appendChild(li);
        });
        panel.appendChild(ul);
      } else {
        panel.appendChild(el("p", "mj-where", "No dated major events announced yet."));
      }

      var rows = up.concat(tbc, flagged);
      if (rows.length) {
        panel.appendChild(el("h3", null, "All announced " + GAMES[g] + " events"));
        var t = el("table"), thead = el("thead"), hr = el("tr");
        ["Dates", "Event", "Type", "Where", "Link"].forEach(function (h) { var th = el("th", null, h); th.scope = "col"; hr.appendChild(th); });
        thead.appendChild(hr); t.appendChild(thead);
        var tb = el("tbody");
        rows.forEach(function (e) {
          var tr = el("tr", e.tier === "Qualifier" ? "mj-qual" : "");
          tr.appendChild(el("td", null, e.status === "tbc" ? "TBC" : when(e)));
          var n = el("td", null, e.name); var f = flag(e); if (f) n.appendChild(f);
          if (e.tbc) n.appendChild(el("div", "mj-where", e.tbc));
          tr.appendChild(n);
          tr.appendChild(el("td", null, e.tier));
          tr.appendChild(el("td", null, e.status === "tbc" ? "TBC" : where(e)));
          var l = el("td"); l.appendChild(link(e)); tr.appendChild(l);
          tb.appendChild(tr);
        });
        t.appendChild(tb); panel.appendChild(t);
      }

      if (past.length) {
        var det = el("details");
        det.appendChild(el("summary", null, "Past " + GAMES[g] + " events (" + past.length + ")"));
        var pl = el("ul");
        past.forEach(function (e) { var li = el("li", null, when(e) + " · " + e.name + (e.city ? " · " + e.city : "") + " · "); li.appendChild(link(e)); pl.appendChild(li); });
        det.appendChild(pl); panel.appendChild(det);
      }
    }

    function select(g, focus) {
      current = g;
      tabs.querySelectorAll("[role=tab]").forEach(function (b) {
        var on = b.getAttribute("data-game") === g;
        b.setAttribute("aria-selected", on ? "true" : "false");
        b.tabIndex = on ? 0 : -1;
        if (on && focus) b.focus();
      });
      render(g);
    }
    tabs.addEventListener("click", function (ev) { var b = ev.target.closest("[role=tab]"); if (b) select(b.getAttribute("data-game")); });
    tabs.addEventListener("keydown", function (ev) {
      var i = ORDER.indexOf(current);
      if (ev.key === "ArrowRight") { select(ORDER[(i + 1) % ORDER.length], true); ev.preventDefault(); }
      if (ev.key === "ArrowLeft") { select(ORDER[(i + ORDER.length - 1) % ORDER.length], true); ev.preventDefault(); }
    });
    select(current);

    var meta = root.querySelector("[data-major-meta]");
    if (meta && D.updated) {
      var d = parts(D.updated);
      meta.textContent = "Dates and venues as published by each game's organiser. Last updated " + d.d + " " + M[d.m] + " " + d.y + ". Always check the official link before you travel.";
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
