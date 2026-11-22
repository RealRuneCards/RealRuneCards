/* ===== REAL RUNE CARDS NEWS RENDERER =====
 Used by the homepage and news/index.html. Reads window.RRC_NEWS_FEED from news-feed.js.
 Markup it looks for:
  <div data-news-filter> with <button data-game="all|magic|lorcana|riftbound|pokemon" aria-pressed>
  <p data-news-count role="status">
  <ul data-news-list data-base="" data-limit="3">   (data-base = path from this page to the site root)
  <div data-news-empty>
 All feed text is inserted as plain text, never as HTML.
*/
(function () {
  var GAMES = { magic: "Magic", lorcana: "Disney Lorcana", riftbound: "Riftbound", pokemon: "Pokémon TCG", yugioh: "Yu-Gi-Oh!" };
  var TYPES = { rules: "Rules update", banlist: "Ban list", release: "Release date", event: "Special event", teaser: "Teaser" };
  var STATUS = { teased: "Teased", confirmed: "Confirmed", announced: "Announced", effective: "Now in effect", released: "Released" };
  var EFFECTIVE_LABEL = { rules: "Takes effect", banlist: "Takes effect", release: "Release date", event: "Event date", teaser: "Expected" };

  /* Official sites per game. CHECK EACH BEFORE GOING LIVE. */
  var OFFICIAL_SITES = {
    magic: ["magic.wizards.com", "wizards.com"],
    lorcana: ["disneylorcana.com", "ravensburgerplay.com"],
    riftbound: ["playriftbound.com", "riftbound.leagueoflegends.com", "riotgames.com"],
    pokemon: ["pokemon.com"],
    yugioh: ["yugioh-card.com"]
  };
  /* Verified official social accounts (lowercase, no @). Empty until checked. */
  var OFFICIAL_ACCOUNTS = {
    magic: { instagram: [], facebook: [], x: [], tiktok: [], youtube: [] },
    lorcana: { instagram: [], facebook: [], x: [], tiktok: [], youtube: [] },
    riftbound: { instagram: [], facebook: [], x: [], tiktok: [], youtube: [] },
    pokemon: { instagram: [], facebook: [], x: [], tiktok: [], youtube: [] },
    yugioh: { instagram: [], facebook: [], x: [], tiktok: [], youtube: [] }
  };
  var PLATFORM_HOSTS = { instagram: ["instagram.com"], facebook: ["facebook.com"], x: ["x.com", "twitter.com"], tiktok: ["tiktok.com"], youtube: ["youtube.com", "youtu.be"] };
  var PLATFORM_NAMES = { instagram: "Instagram", facebook: "Facebook", x: "X", tiktok: "TikTok", youtube: "YouTube" };

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function fmt(d) { return new Date(d + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }); }
  function today() { var n = new Date(); return n.getFullYear() + "-" + String(n.getMonth() + 1).padStart(2, "0") + "-" + String(n.getDate()).padStart(2, "0"); }
  function liveStatus(n) {
    if ((n.type === "rules" || n.type === "banlist") && n.effective && n.effective <= today()) return "effective";
    if (n.type === "release" && n.status === "announced" && n.effective && n.effective <= today()) return "released";
    return n.status;
  }
  function hostOk(url, hosts) {
    try {
      var u = new URL(url), h = u.hostname.toLowerCase().replace(/^www\./, "");
      return u.protocol === "https:" && hosts.some(function (d) { return h === d || h.slice(-(d.length + 1)) === "." + d; });
    } catch (e) { return false; }
  }
  function accountOk(game, platform, account) {
    var l = (OFFICIAL_ACCOUNTS[game] || {})[platform] || [];
    return !!account && l.indexOf(String(account).toLowerCase().replace(/^@/, "")) !== -1;
  }
  function sourceOk(n) {
    var s = n.source || {};
    if (s.kind === "article") return !!s.name && hostOk(s.url, OFFICIAL_SITES[n.game]);
    if (s.kind === "social") return !!PLATFORM_HOSTS[s.platform] && hostOk(s.url, PLATFORM_HOSTS[s.platform]) && accountOk(n.game, s.platform, s.account);
    return false;
  }
  function mediaOk(n) {
    var m = n.media;
    if (!m) return true;
    if (m.type === "image") {
      if (!/^news-media\/[\w-]+\.(webp|jpe?g|png|svg)$/i.test(m.src || "") || !(m.alt || "").trim()) return false;
      return m.rights === "store-owned" || (m.rights === "permission" && !!m.credit && !!m.permissionRef);
    }
    if (m.type === "youtube") return /^[\w-]{11}$/.test(m.id || "") && !!m.title && accountOk(n.game, "youtube", m.channel);
    return false;
  }
  function valid(n) {
    return !!(n && n.id && n.title && n.summary && GAMES[n.game] && TYPES[n.type] && STATUS[n.status] &&
      /^news\/[a-z0-9-]+\/[a-z0-9-]+\/index\.html$/.test(n.url || "") &&
      (n.type !== "banlist" || n.format) && n.reviewed && n.reviewed.on &&
      sourceOk(n) && mediaOk(n));
  }

  /* Newest official announcement first; same-day ties: publisher timestamp, then the most recently added.
     Keep in sync with tools/news-updater/order.mjs. */
  function newsOrder(a, b) {
    var k = function (n) { return [n.announced || n.updated || "", n.announced_at || "", n.added_at || ""]; };
    var x = k(a), y = k(b);
    for (var i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i] < y[i] ? 1 : -1;
    return String(a.id || "").localeCompare(String(b.id || ""));
  }

  function addRow(dl, label, value, isDate) {
    if (!value) return;
    var dd = el("dd");
    if (isDate) { var t = el("time", null, fmt(value)); t.dateTime = value; dd.appendChild(t); } else dd.textContent = value;
    dl.appendChild(el("dt", null, label)); dl.appendChild(dd);
  }
  function addMedia(card, n, base) {
    var m = n.media; if (!m) return;
    var box = el("div", "news-media");
    if (m.type === "image") {
      var fig = el("figure"), img = el("img");
      img.src = base + m.src; img.alt = m.alt; img.loading = "lazy"; img.width = 640; img.height = 360;
      img.addEventListener("error", function () { box.remove(); });
      fig.appendChild(img);
      if (m.rights === "permission") fig.appendChild(el("figcaption", null, "Image: " + m.credit + ", used with permission"));
      box.appendChild(fig);
    } else {
      var wrap = el("div", "news-video"), b = el("button", null, "Play video: " + m.title);
      b.type = "button";
      b.appendChild(el("span", null, "Loads from YouTube when you press play"));
      b.addEventListener("click", function () {
        var f = el("iframe");
        f.src = "https://www.youtube-nocookie.com/embed/" + m.id + "?autoplay=1&rel=0";
        f.title = m.title; f.allow = "autoplay; encrypted-media; picture-in-picture";
        f.allowFullscreen = true; f.referrerPolicy = "strict-origin-when-cross-origin";
        wrap.replaceChild(f, b); f.focus();
      });
      wrap.appendChild(b); box.appendChild(wrap);
    }
    card.appendChild(box);
  }

  function card(n, base) {
    var li = el("li"), art = el("article", "news-card"), st = liveStatus(n), s = n.source;
    art.appendChild(el("div", "news-bar"));
    addMedia(art, n, base);
    var body = el("div", "news-card-body");

    var tags = el("ul", "news-tags"); tags.setAttribute("aria-label", "Labels");
    tags.appendChild(el("li", null, GAMES[n.game]));
    tags.appendChild(el("li", null, TYPES[n.type]));
    var badge = el("li", "status", STATUS[st]); badge.setAttribute("data-status", st); tags.appendChild(badge);
    body.appendChild(tags);

    var h = el("h3", "news-title"), a = el("a", null, n.title); a.href = base + n.url; h.appendChild(a);
    body.appendChild(h);
    body.appendChild(el("p", "news-summary", n.summary));

    var dl = el("dl", "news-dates");
    addRow(dl, "Format", n.format);
    addRow(dl, "Announced", n.announced, true);
    addRow(dl, EFFECTIVE_LABEL[n.type], n.effective, true);
    addRow(dl, "Where", n.location);
    if (dl.children.length) body.appendChild(dl);

    var more = el("p", "news-read"), ra = el("a", null, "Read the full update");
    ra.href = base + n.url; ra.appendChild(el("span", "sr-only", ": " + n.title));
    more.appendChild(ra); body.appendChild(more);

    var src = el("p", "news-source"), sa = el("a");
    sa.href = s.url; sa.target = "_blank"; sa.rel = "noopener noreferrer";
    if (s.kind === "social") {
      sa.appendChild(el("span", "kind", "Official post on " + PLATFORM_NAMES[s.platform]));
      sa.appendChild(document.createTextNode("View @" + String(s.account).replace(/^@/, "")));
    } else {
      sa.appendChild(el("span", "kind", "Official source"));
      sa.appendChild(document.createTextNode(s.name));
    }
    sa.appendChild(el("span", "sr-only", " (opens in a new tab)"));
    src.appendChild(sa); body.appendChild(src);

    art.appendChild(body); li.appendChild(art);
    return li;
  }

  function init() {
    var list = document.querySelector("[data-news-list]");
    if (!list) return;
    var empty = document.querySelector("[data-news-empty]"),
        count = document.querySelector("[data-news-count]"),
        filter = document.querySelector("[data-news-filter]"),
        base = list.getAttribute("data-base") || "",
        limit = parseInt(list.getAttribute("data-limit"), 10) || 0,
        feed = window.RRC_NEWS_FEED || {},
        items = (feed.schema_version === "2" && Array.isArray(feed.items) ? feed.items : [])
          .filter(valid)
          .sort(newsOrder),
        current = "all";

    function render() {
      var shown = items.filter(function (n) { return current === "all" || n.game === current; });
      var visible = limit ? shown.slice(0, limit) : shown;
      list.innerHTML = "";
      visible.forEach(function (n) { list.appendChild(card(n, base)); });
      list.hidden = !visible.length;
      if (empty) empty.hidden = !!visible.length;
      if (count) {
        var label = current === "all" ? "all games" : GAMES[current];
        count.textContent = shown.length + (shown.length === 1 ? " update" : " updates") + " for " + label +
          (limit && shown.length > limit ? ", showing the latest " + limit : "") + ".";
      }
    }

    if (filter) {
      filter.hidden = false;
      filter.addEventListener("click", function (e) {
        var b = e.target.closest("button"); if (!b) return;
        current = b.getAttribute("data-game");
        filter.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
        render();
      });
    }
    render();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
