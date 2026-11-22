/* ===== REAL RUNE CARDS SHARED NEWS FEED =====
 One file feeds the homepage section and news/index.html.
 It is a .js file (not .json) so the pages also work when opened straight from disk.
 Hand-written items (no "auto" flag) are never changed by the generator.
 Items with "auto": true are added by tools/news-updater (GitHub Actions, every 6 hours):
 fact-only original summaries of official ban list, rules and event announcements.

 Item fields:
  id, game (magic | lorcana | riftbound | pokemon), type (rules | banlist | release | event | teaser),
  status (teased | confirmed | announced | effective | released),
  title, summary (original plain-English wording, never copied from the publisher),
  url (on-site article: news/<game>/<slug>/index.html),
  format, region, location?, announced, effective, updated (YYYY-MM-DD), auto?,
  source { kind: "article" | "social", name, url (exact official page), platform?, account? },
  media? { type: "image", src: "news-media/...", alt, rights: "store-owned" | "permission", credit?, permissionRef? }
         | { type: "youtube", id, channel, title }
  reviewed { by, on }  (required: unreviewed items are not shown)
*/
window.RRC_NEWS_FEED = {
  "schema_version": "2",
  "generated": "2026-11-22",
  "items": [
    {
      "id": "riftbound-radiance-ban-list-2026-11",
      "game": "riftbound",
      "type": "banlist",
      "status": "announced",
      "title": "Riftbound: 8 cards and 2 battlefields banned from 23 November",
      "summary": "Riot has added eight cards and two battlefields to the Standard and 2v2 Constructed ban list. The bans start on Monday 23 November 2026, so check your deck before your next event.",
      "url": "news/riftbound/radiance-ban-list/index.html",
      "format": "Standard and 2v2 Constructed",
      "region": "Worldwide, except Korea and Traditional Chinese regions (later)",
      "announced": "2026-11-13",
      "effective": "2026-11-23",
      "updated": "2026-11-14",
      "source": {
        "kind": "article",
        "name": "Riftbound (Riot Games)",
        "url": "https://playriftbound.com/en-us/news/announcements/radiance-ban-list-updates-effective-november-23-2026/"
      },
      "reviewed": {
        "by": "Real Rune Cards (facts checked against the official source; approved for publication by Cal)",
        "on": "2026-11-14"
      }
    },
    {
      "id": "lorcana-update-to-core-constructed-format-and-format-coconut",
      "game": "lorcana",
      "type": "banlist",
      "status": "announced",
      "url": "news/lorcana/update-to-core-constructed-format-and-format-coconut/index.html",
      "announced": "2026-11-03",
      "updated": "2026-11-22",
      "source": {
        "kind": "article",
        "name": "Disney Lorcana (Ravensburger)",
        "url": "https://disneylorcana.com/en/news/2026/11/update-to-core-constructed-format-and-format-coconut/",
        "headline": "Update to Core Constructed Format and [Format Coconut]"
      },
      "media": {
        "type": "image",
        "src": "news-media/rrc-lorcana.svg",
        "alt": "Real Rune Cards Disney Lorcana news graphic",
        "rights": "store-owned"
      },
      "auto": true,
      "reviewed": {
        "by": "Real Rune Cards automatic news collector (facts taken from the official source; no publisher text copied)",
        "on": "2026-11-22"
      },
      "title": "Disney Lorcana: My Adventure Book and 1 more banned from 3 November 2026",
      "summary": "From 3 November 2026. Now banned: My Adventure Book; Bend to My Will. The official post lists which format each card applies to.",
      "format": "See the official list for each card's format",
      "effective": "2026-11-03",
      "details": [
        {
          "heading": "Now banned",
          "items": [
            "My Adventure Book",
            "Bend to My Will"
          ]
        }
      ]
    }
  ]
};
