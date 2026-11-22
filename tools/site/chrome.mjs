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
