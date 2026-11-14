/* ===== REAL RUNE CARDS SHARED NEWS FEED =====
 One file feeds the homepage section and news/index.html.
 It is a .js file (not .json) so the pages also work when opened straight from disk.
 A future generator only needs to rewrite this file after a person has reviewed each post.

 Item fields:
  id, game (magic | lorcana | riftbound | pokemon), type (rules | banlist | release | event | teaser),
  status (teased | confirmed | announced | effective | released),
  title, summary (original plain-English wording, never copied from the publisher),
  url (on-site article: news/<game>/<slug>/index.html),
  format, region, announced, effective, updated (YYYY-MM-DD),
  source { kind: "article" | "social", name, url (exact official page), platform?, account? },
  media? { type: "image", src: "news-media/...", alt, rights: "store-owned" | "permission", credit?, permissionRef? }
         | { type: "youtube", id, channel, title }
  reviewed { by, on }  (required: unreviewed items are not shown)
*/
window.RRC_NEWS_FEED = {
  "schema_version": "2",
  "generated": "2026-11-14",
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
      "reviewed": { "by": "Real Rune Cards (facts checked against the official source; approved for publication by Cal)", "on": "2026-11-14" }
    }
  ]
};
