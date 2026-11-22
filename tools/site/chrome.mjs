// Shared site chrome for every public page: skip link, navigation, and the "Message us to book" block.
// Used by tools/site/apply-chrome.mjs (existing pages) and tools/news-updater (new articles).
// `base` is the path from the page to the site root ("", "../" or "../../../").

export const LINKS = {
  discord: "https://discord.gg/Q7mbwSXSdW",
  facebook: "https://www.facebook.com/share/g/1YcmRjop4f/",
  shop: "https://realrunecards.square.site",
  directions: "https://www.google.com/maps/search/?api=1&query=Real%20Rune%20Cards%2C%2074%20Coronation%20Street%2C%20Blackpool%20FY1%204PD"
};
export const ADDRESS = { street: "74 Coronation Street", town: "Blackpool", postcode: "FY1 4PD" };
// Cardmarket seller account (Cal's notes: Cardmarket shop, user CallinV)
export const CARDMARKET = "https://www.cardmarket.com/en/Magic/Users/CallinV";
export const VINTED = "https://www.vinted.co.uk/member/151357207-cccollects/";

// Opening hours: ONLY confirmed hours go here, one entry per line, e.g. ["Monday", "12pm to 11pm"].
// While this is empty the site says hours aren't confirmed yet and asks people to message first.
// The 12pm-11pm, 7-days pattern in the shop notes is a target, not current hours, so it is not listed.
export const HOURS = [];
// Holiday and one-off exceptions, shown with the hours. Remove each line once it has passed.
export const HOURS_EXCEPTIONS = [
  "Christmas and New Year week (24 to 31 December): not confirmed yet, so check with us before you come."
];

// "Visit the shop" block: address, hours, holiday exceptions and directions together.
// Placed on any page that contains the SITE-CHROME:VISIT markers (homepage and Contact).
export function visit(base) {
  const hours = HOURS.length
    ? `<dl class="rrc-hours">${HOURS.map(([d, t]) => `<dt>${d}</dt><dd>${t}</dd>`).join("")}</dl>`
    : `<p class="rrc-hours-note"><b>Opening hours:</b> we're still confirming our regular hours. Please message us on Discord or Facebook before you visit, so we can make sure we're open.</p>`;
  const exceptions = HOURS_EXCEPTIONS.length
    ? `<ul class="rrc-exceptions">${HOURS_EXCEPTIONS.map(x => `<li>${x}</li>`).join("")}</ul>` : "";
  return `<section class="rrc-visitbox" id="visit" aria-labelledby="rrc-visit-h">` +
    `<h2 id="rrc-visit-h">Visit the shop</h2>` +
    `<address>Real Rune Cards<br>${ADDRESS.street}<br>${ADDRESS.town} ${ADDRESS.postcode}</address>` +
    hours + exceptions +
    `<p class="rrc-visit-btns">` +
    `<a class="rrc-cbtn" href="${LINKS.directions}" target="_blank" rel="noopener" data-track="Directions click" data-track-item="Visit box">Get directions<span class="sr-only"> (Google Maps, opens in a new tab)</span></a>` +
    `<a class="rrc-cbtn rrc-cbtn-alt" href="${LINKS.discord}" target="_blank" rel="noopener" data-track="Visit check click" data-track-item="Discord">Check we're open on Discord<span class="sr-only"> (opens in a new tab)</span></a>` +
    `<a class="rrc-cbtn rrc-cbtn-alt" href="${LINKS.facebook}" target="_blank" rel="noopener" data-track="Visit check click" data-track-item="Facebook">Check we're open on Facebook<span class="sr-only"> (opens in a new tab)</span></a>` +
    `</p></section>`;
}

const NAV = [
  { key: "events", href: "events.html", text: "Events" },
  { key: "learn", href: "start-playing.html", text: "Learn to Play" },
  { key: "skilltree", href: "skill-tree.html", text: "The Skill Tree" },
  { key: "news", href: "news/", text: "News" },
  { key: "shop", href: LINKS.shop, text: "Shop", external: true },
  { key: "contact", href: "contact.html", text: "Contact" }
];

export function skipLink() {
  return `<a class="rrc-skip" href="#main">Skip to main content</a>`;
}

export function nav(base, current) {
  const items = NAV.map(n => {
    const href = n.external ? n.href : base + n.href;
    const cur = n.key === current ? ` aria-current="page"` : "";
    const ext = n.external ? ` target="_blank" rel="noopener" data-track="Shop click" data-track-item="Menu"` : "";
    const sr = n.external ? `<span class="sr-only"> (online shop, opens in a new tab)</span>` : "";
    return `<li><a href="${href}"${cur}${ext}>${n.text}${sr}</a></li>`;
  }).join("");
  return `<nav class="rrc-nav" aria-label="Main menu"><div class="rrc-nav-in">` +
    `<a class="rrc-brand" href="${base || "./"}"${current === "home" ? ` aria-current="page"` : ""}><img src="${base}realrunecards-logo-64.png" alt="" width="32" height="32">Real Rune Cards</a>` +
    `<ul>${items}</ul></div></nav>`;
}

export function community(base) {
  return `<section class="rrc-community" aria-labelledby="rrc-community-h"><div class="rrc-community-in">` +
    `<h2 id="rrc-community-h">Message us to book</h2>` +
    `<p>Send us the event and how many places you'd like.</p>` +
    `<p class="rrc-community-btns">` +
    `<a class="rrc-cbtn" href="${LINKS.discord}" target="_blank" rel="noopener" data-track="Booking message click" data-track-item="Discord">Message us on Discord<span class="sr-only"> (opens in a new tab)</span></a>` +
    `<a class="rrc-cbtn" href="${LINKS.facebook}" target="_blank" rel="noopener" data-track="Booking message click" data-track-item="Facebook">Message us on Facebook<span class="sr-only"> (opens in a new tab)</span></a>` +
    `</p>` +
    `<p class="rrc-visit">Real Rune Cards, ${ADDRESS.street}, ${ADDRESS.town} ${ADDRESS.postcode} · ` +
    `<a href="${LINKS.directions}" target="_blank" rel="noopener" data-track="Directions click" data-track-item="Footer">Get directions<span class="sr-only"> (Google Maps, opens in a new tab)</span></a></p>` +
    `</div></section>`;
}

export function stylesheet(base) { return `<link rel="stylesheet" href="${base}site-chrome.css">`; }
