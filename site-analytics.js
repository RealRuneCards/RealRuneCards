/* Real Rune Cards: shared Umami click tracking for every page.
   Load it straight after the Umami script tag:
     <script defer src="https://cloud.umami.is/script.js" data-website-id="4f5087fd-3226-4798-8948-4bc9dc9b6160"></script>
     <script defer src="site-analytics.js"></script>   (use ../ or ../../../ in subfolders)
   Privacy: events carry only an event name, a short label and the page path.
   No email addresses, names, form contents or full outbound URLs are ever sent.
   Square: an outbound click is NOT a purchase. Sales are only counted in Square itself. */
(function () {
  // Queue events until Umami has loaded (pages may already define this)
  if (!window.ctcTrack) {
    window.ctcQueue = window.ctcQueue || [];
    window.ctcTrack = function (name, props) {
      try {
        if (window.umami && window.umami.track) window.umami.track(name, props);
        else window.ctcQueue.push([name, props]);
      } catch (e) {}
    };
  }
  function flush() {
    try { while (window.ctcQueue && window.ctcQueue.length) { var ev = window.ctcQueue.shift(); window.umami.track(ev[0], ev[1]); } } catch (e) {}
  }
  var tries = 0;
  (function waitForUmami() {
    if (window.umami && window.umami.track) return flush();
    if (++tries < 40) setTimeout(waitForUmami, 250);
  })();

  function page() { return location.pathname || '/'; }

  // Which kind of link is this? Returns [event name, label] or null.
  function classify(a) {
    var raw = a.getAttribute('href') || '';
    if (!raw || raw.charAt(0) === '#' || /^(mailto|tel|javascript):/i.test(raw)) return null;
    var url;
    try { url = new URL(raw, location.href); } catch (e) { return null; }
    var host = url.hostname.replace(/^www\./, '').toLowerCase();
    var path = url.pathname.toLowerCase();
    var internal = host === location.hostname.replace(/^www\./, '').toLowerCase() || host === 'realrunecards.com';

    if (/(^|\.)square\.site$|(^|\.)squareup\.com$|(^|\.)square\.link$/.test(host)) return ['Square outbound click', 'Square shop'];
    if (/(^|\.)discord\.(gg|com)$/.test(host)) return ['Discord click', 'Discord'];
    if (/(^|\.)facebook\.com$|(^|\.)fb\.me$/.test(host)) return ['Facebook click', 'Facebook group'];
    if (internal) {
      if (/\/events\.html$|\/calendar\//.test(path)) return ['Events calendar click', path.replace(/^.*\//, '') || 'events'];
      if (/\/same-side\.html$/.test(path) && !/same-side\.html$/.test(page())) return ['Course CTA click', 'Same Side course'];
      return null; // ordinary page-to-page navigation is already a pageview
    }
    return ['Outbound click', host];
  }

  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a') : null;
    if (!a) return;
    if (a.hasAttribute('data-track')) {
      var props = { page: page() };
      if (a.getAttribute('data-track-item')) props.item = a.getAttribute('data-track-item');
      window.ctcTrack(a.getAttribute('data-track'), props);
      return;
    }
    var c = classify(a);
    if (c) window.ctcTrack(c[0], { item: c[1], page: page() });
  }, true);
})();
