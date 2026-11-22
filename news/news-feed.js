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
      "id": "pokemon-play-pokemon-store-prizes-december-2026",
      "game": "pokemon",
      "type": "event",
      "status": "announced",
      "title": "Pokémon: new League Cup and League Challenge prizes from 1 December 2026",
      "summary": "From Tuesday 1 December 2026, Pokémon TCG League Cup top finishers in each age division get a Mega Evolution—Delta Reign playmat, and Pokémon VGC and Pokémon GO top finishers get an acrylic standee of the Sky High Pokémon. At select Play! Pokémon Stores, players in Friendly Tournaments, League Challenges and League Cups can also get Play! Pokémon-stamped Cinderace, Lunatone and Mega Signal promo cards.",
      "url": "news/pokemon/play-pokemon-store-prizes-december-2026/index.html",
      "announced": "2026-11-16",
      "effective": "2026-12-01",
      "added_at": "2026-11-22T16:35:54.723Z",
      "updated": "2026-11-22",
      "source": {
        "kind": "article",
        "name": "Pokémon (The Pokémon Company International)",
        "url": "https://www.pokemon.com/us/news/new-prizes-are-coming-to-play-pokemon-stores-in-december-2026/",
        "headline": "New Prizes Are Coming to Play! Pokémon Stores in December 2026"
      },
      "media": {
        "type": "image",
        "src": "news-media/rrc-pokemon.svg",
        "alt": "Real Rune Cards Pokémon TCG news graphic",
        "rights": "store-owned"
      },
      "details": [
        {
          "heading": "League Cup prizes",
          "items": [
            "Pokémon TCG: Mega Evolution—Delta Reign playmat, one per top finisher in each age division",
            "Pokémon VGC: acrylic standee of the Sky High Pokémon for the top finishers in each age division",
            "Pokémon GO: the same standee for the overall top finisher"
          ]
        },
        {
          "heading": "Stamped promo cards (select Play! Pokémon Stores)",
          "items": [
            "Friendly Tournaments: Cinderace",
            "League Challenges: Lunatone",
            "League Cups: Mega Signal"
          ]
        }
      ],
      "reviewed": {
        "by": "Real Rune Cards (checked against the official source)",
        "on": "2026-11-22"
      }
    },
    {
      "id": "magic-everything-new-for-competitive-play-in-2027",
      "game": "magic",
      "type": "event",
      "status": "announced",
      "title": "Magic: Pioneer returns to Regional Championships, and 14 Spotlight Series events in 2027",
      "summary": "The third round of the 2026–27 Regional Championship season (10 April to 23 May 2027) will be Pioneer. From 2027 each Regional Championship season has four rounds instead of three, and there are 14 Magic Spotlight Series events (up from 12), each with a CommandFest alongside. From 2028 a fourth, all-Limited Pro Tour replaces the Limited Championship.",
      "url": "news/magic/everything-new-for-competitive-play-in-2027/index.html",
      "announced": "2026-11-14",
      "added_at": "2026-11-22T16:35:54.723Z",
      "updated": "2026-11-22",
      "source": {
        "kind": "article",
        "name": "Magic: The Gathering (Wizards of the Coast)",
        "url": "https://magic.wizards.com/en/news/announcements/everything-new-for-competitive-play-in-2027/",
        "headline": "Everything New for Competitive Play in 2027"
      },
      "media": {
        "type": "image",
        "src": "news-media/rrc-magic.svg",
        "alt": "Real Rune Cards Magic news graphic",
        "rights": "store-owned"
      },
      "details": [
        {
          "heading": "Regional Championship qualifier rounds",
          "items": [
            "2026–27 round 3: Pioneer, 10 April to 23 May 2027",
            "2027–28 round 1: Modern, 10 April to 27 June 2027",
            "2027–28 round 2: Pioneer, 3 July to 26 September 2027"
          ]
        },
        {
          "heading": "Magic Spotlight Series 2027",
          "items": [
            "Star Trek (Limited): Minneapolis, US, 9–10 January · Lille, France, 9–10 January",
            "Nauctis (Limited): Zagreb, Croatia, 13–14 March · Toronto, Canada, 20–21 March",
            "Marvel Darkhold Destiny (Modern): Seattle, US, 24–25 April · Beijing, China, 22–23 May",
            "Kamigawa Titanbreach (Limited): Hartford, US, 12–13 June · Shizuoka, Japan, 24–25 July · Montreal, Canada, 24–25 July",
            "Set TBC (Team Limited): Washington, DC, 14–15 August · Utrecht, Netherlands, 4–5 September · Sydney, Australia, 4–5 September",
            "Zhalfir (Pioneer): Valencia, Spain, 16–17 October · Dallas-Fort Worth, US, 23–24 October"
          ]
        },
        {
          "heading": "Prizes",
          "items": [
            "$50,000 prize pool at each Spotlight event (Team Limited events: $60,000)",
            "Top 8 players earn Pro Tour invitations (Team Limited: top 4 teams)"
          ]
        }
      ],
      "reviewed": {
        "by": "Real Rune Cards (checked against the official source)",
        "on": "2026-11-22"
      }
    },
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
      "id": "magic-star-trek-update-bulletin",
      "game": "magic",
      "type": "rules",
      "status": "announced",
      "title": "Magic: Werewolf Pack Leader Oracle change and new rules with Star Trek",
      "summary": "With Magic: The Gathering | Star Trek, released 13 November 2026, Werewolf Pack Leader's last ability now makes it a Werewolf until end of turn, instead of making it stop being a Human. New rules 700.17, 701.72 and 702.196 cover face a dilemma, assimilate and beam me up, and new rule 508.4e supports Kira Nerys, Firebrand letting creatures enter tapped and attacking.",
      "url": "news/magic/star-trek-update-bulletin/index.html",
      "announced": "2026-11-06",
      "effective": "2026-11-13",
      "added_at": "2026-11-22T16:35:54.723Z",
      "updated": "2026-11-22",
      "source": {
        "kind": "article",
        "name": "Magic: The Gathering (Wizards of the Coast)",
        "url": "https://magic.wizards.com/en/news/announcements/star-trek-update-bulletin/",
        "headline": "Magic: The Gathering | Star Trek Update Bulletin"
      },
      "media": {
        "type": "image",
        "src": "news-media/rrc-magic.svg",
        "alt": "Real Rune Cards Magic news graphic",
        "rights": "store-owned"
      },
      "details": [
        {
          "heading": "Oracle change",
          "items": [
            "Werewolf Pack Leader: its {3}{G} ability now ends with \"and is a Werewolf\" instead of \"and isn't a Human\""
          ]
        },
        {
          "heading": "Comprehensive Rules",
          "items": [
            "700.17: face a dilemma",
            "701.72: assimilate",
            "702.196: beam me up",
            "508.4e (new): creatures entering tapped and attacking through a replacement effect, for Kira Nerys, Firebrand",
            "208.3 (updated): power and toughness of noncreature objects that aren't on the battlefield"
          ]
        }
      ],
      "reviewed": {
        "by": "Real Rune Cards (checked against the official source)",
        "on": "2026-11-22"
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
    },
    {
      "id": "yugioh-forbidden-limited-2026-10-19",
      "game": "yugioh",
      "type": "banlist",
      "status": "announced",
      "title": "Yu-Gi-Oh!: 43 Forbidden & Limited List changes from 19 October 2026",
      "summary": "From 19 October 2026 in the Advanced Format. Forbidden: Amorphage Goliath; Amorphage Sloth; Elfnote Tinia (was limited); Magicians' Souls; Pharaonic Advent; Spell Canceller and 28 more. Limited: Droll & Lock Bird (was semi-limited); Griffoh; Perfectron Hydradrive Dragon; Superdreadnought Rail Cannon Gustav Max; Branded in High Spirits (was semi-limited); Branded Opening and 2 more. Semi-Limited: Sky Striker Mobilize - Engage!. The change to Perfectron Hydradrive Dragon applies from the release of Magnificent Maestros on 11 November 2026.",
      "url": "news/yugioh/forbidden-limited-2026-10-19/index.html",
      "format": "Advanced Format",
      "announced": "2026-10-19",
      "effective": "2026-10-19",
      "added_at": "2026-11-22T16:35:54.723Z",
      "updated": "2026-11-22",
      "source": {
        "kind": "article",
        "name": "Yu-Gi-Oh! TCG (Konami)",
        "url": "https://www.yugioh-card.com/en/limited/list_2026-10-19/",
        "headline": "Forbidden & Limited Lists (effective 19 October 2026)"
      },
      "media": {
        "type": "image",
        "src": "news-media/rrc-yugioh.svg",
        "alt": "Real Rune Cards Yu-Gi-Oh! news graphic",
        "rights": "store-owned"
      },
      "details": [
        {
          "heading": "Forbidden",
          "items": [
            "Amorphage Goliath",
            "Amorphage Sloth",
            "Elfnote Tinia (was limited)",
            "Magicians' Souls",
            "Pharaonic Advent",
            "Spell Canceller",
            "Aerial Eater",
            "Albion the Branded Dragon",
            "Azamina Ilia Silvia",
            "Red-eyes Dark Dragoon",
            "Charmer Quartet in Bloom",
            "Cross-sheep",
            "Saryuja Skull Dread",
            "Zenna's Deceiving Doll Maidens",
            "Ame No Habakiri No Mitsurugi (was limited)",
            "Beelze of the Diabolic Dragons",
            "Crystal Wing Synchro Dragon",
            "Cupsy★yummy Way (was limited)",
            "F.a. Dawn Dragster",
            "Naturia Beast",
            "Trishula, Dragon of the Ice Barrier",
            "Xx-saber Gottoms",
            "D/d/d Wave High King Caesar",
            "Number 41: Bagooska the Terribly Tired Tapir",
            "Number 60: Dugares the Timeless",
            "Varudras, the Final Bringer of the End Times",
            "Called by the Grave (was limited)",
            "Crossout Designator (was limited)",
            "Secret Village of the Spellcasters",
            "Triple Tactics Talent (was limited)",
            "Anti-spell Fragrance (was limited)",
            "Gozen Match (was limited)",
            "Rivalry of Warlords (was limited)",
            "There Can Be Only One (was limited)"
          ]
        },
        {
          "heading": "Limited",
          "items": [
            "Droll & Lock Bird (was semi-limited)",
            "Griffoh",
            "Perfectron Hydradrive Dragon",
            "Superdreadnought Rail Cannon Gustav Max",
            "Branded in High Spirits (was semi-limited)",
            "Branded Opening",
            "Toon Bookmark",
            "Toon Table of Contents"
          ]
        },
        {
          "heading": "Semi-Limited",
          "items": [
            "Sky Striker Mobilize - Engage!"
          ]
        }
      ],
      "reviewed": {
        "by": "Real Rune Cards (checked against the official source)",
        "on": "2026-11-22"
      }
    },
    {
      "id": "magic-banned-and-restricted-october-12-2026",
      "game": "magic",
      "type": "banlist",
      "status": "announced",
      "title": "Magic: three commanders banned in Competitive Brawl, no other format changes",
      "summary": "From 12 October 2026, in Competitive Brawl: Yuriko, the Tiger's Shadow; Spider-Man 2099; and Light-Paws, Emperor's Voice are banned as commanders, nine cards are now banned only as a commander, and Nashi, Illusion Gadgeteer is rebalanced. No other format changed. The next announcement is due on 30 November 2026.",
      "url": "news/magic/banned-and-restricted-october-12-2026/index.html",
      "format": "Competitive Brawl",
      "announced": "2026-10-12",
      "effective": "2026-10-12",
      "added_at": "2026-11-22T16:35:54.723Z",
      "updated": "2026-11-22",
      "source": {
        "kind": "article",
        "name": "Magic: The Gathering (Wizards of the Coast)",
        "url": "https://magic.wizards.com/en/news/announcements/banned-and-restricted-october-12-2026/",
        "headline": "Banned and Restricted Announcement – October 12, 2026"
      },
      "media": {
        "type": "image",
        "src": "news-media/rrc-magic.svg",
        "alt": "Real Rune Cards Magic news graphic",
        "rights": "store-owned"
      },
      "details": [
        {
          "heading": "Banned as a commander",
          "items": [
            "Yuriko, the Tiger's Shadow",
            "Spider-Man 2099",
            "Light-Paws, Emperor's Voice"
          ]
        },
        {
          "heading": "Now banned only as a commander",
          "items": [
            "Ajani, Nacatl Pariah",
            "Nadu, Winged Wisdom",
            "Oko, Thief of Crowns",
            "Old Stickfingers",
            "Ragavan, Nimble Pilferer",
            "Rusko, Clockmaker",
            "Tamiyo, Inquisitive Student",
            "Wrenn and Six",
            "Tajic, Legion's Valor"
          ]
        },
        {
          "heading": "Rebalanced",
          "items": [
            "Nashi, Illusion Gadgeteer"
          ]
        },
        {
          "heading": "No changes",
          "items": [
            "Standard, Pioneer, Modern, Legacy, Vintage, Pauper, Alchemy, Historic, Timeless and Brawl"
          ]
        }
      ],
      "reviewed": {
        "by": "Real Rune Cards (checked against the official source)",
        "on": "2026-11-22"
      }
    }
  ]
};
