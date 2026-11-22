// Official sources for the Player News collector.
// Only first-party publisher sites are listed. Publisher text is used to classify
// items and to read facts (headline, dates, formats); it is never copied into posts.

export const USER_AGENT = "RealRuneCardsNewsBot/1.0 (+https://realrunecards.com/news/)";

// How far back an item may be published and still be posted.
export const MAX_AGE_DAYS = 30;
// Upper bound on article pages fetched per source per run (politeness).
export const MAX_FETCHES_PER_SOURCE = 20;

export const GAMES = {
  magic: {
    label: "Magic",
    full: "Magic: The Gathering",
    publisher: "Wizards of the Coast",
    sourceName: "Magic: The Gathering (Wizards of the Coast)",
    hosts: ["magic.wizards.com"]
  },
  lorcana: {
    label: "Disney Lorcana",
    full: "Disney Lorcana",
    publisher: "Ravensburger",
    sourceName: "Disney Lorcana (Ravensburger)",
    hosts: ["disneylorcana.com"]
  },
  riftbound: {
    label: "Riftbound",
    full: "Riftbound",
    publisher: "Riot Games",
    sourceName: "Riftbound (Riot Games)",
    hosts: ["playriftbound.com", "riftbound.leagueoflegends.com"]
  },
  yugioh: {
    label: "Yu-Gi-Oh!",
    full: "Yu-Gi-Oh! TCG",
    publisher: "Konami",
    sourceName: "Yu-Gi-Oh! TCG (Konami)",
    hosts: ["yugioh-card.com"]
  },
  pokemon: {
    label: "Pokémon TCG",
    full: "Pokémon TCG",
    publisher: "The Pokémon Company International",
    sourceName: "Pokémon (The Pokémon Company International)",
    hosts: ["pokemon.com"]
  }
};

// kind: sitemap  -> read <loc>/<lastmod> from an official sitemap, keep paths matching `include`
// kind: wp-api   -> official WordPress REST API (posts with date, link, title, excerpt)
// kind: html-list-> official news index page, links matching `include`
// kind: ygo-fl   -> Konami Forbidden & Limited page; the list link carries its effective date
// kind: probe    -> official site known to sit behind a bot challenge; checked, never bypassed
export const SOURCES = [
  {
    id: "magic-news",
    game: "magic",
    kind: "sitemap",
    url: "https://magic.wizards.com/en/sitemap.xml",
    include: /^https:\/\/magic\.wizards\.com\/en\/news\/(announcements|feature|mtg-arena|events?)\/[^/]+\/?$/
  },
  {
    id: "riftbound-news",
    game: "riftbound",
    kind: "sitemap",
    url: "https://playriftbound.com/en-us/sitemap_loc.xml",
    include: /^https:\/\/playriftbound\.com\/en-us\/news\/[^/]+\/[^/]+\/?$/
  },
  {
    id: "lorcana-news",
    game: "lorcana",
    kind: "wp-api",
    url: "https://disneylorcana.com/en/wp-json/wp/v2/posts?per_page=30&_fields=id,date_gmt,link,title,excerpt"
  },
  {
    id: "yugioh-news",
    game: "yugioh",
    kind: "html-list",
    url: "https://www.yugioh-card.com/en/news/",
    include: /^https:\/\/www\.yugioh-card\.com\/en\/news\/[^/]+\/?$/
  },
  {
    id: "yugioh-forbidden-limited",
    game: "yugioh",
    kind: "ygo-fl",
    url: "https://www.yugioh-card.com/en/limited/"
  },
  {
    id: "pokemon-news",
    game: "pokemon",
    kind: "probe",
    url: "https://www.pokemon.com/us/pokemon-news"
  }
];

// Classification is deliberately conservative: an item is posted only when its
// headline/URL clearly says what it is. Anything else is recorded as skipped.
export const EXCLUDE = /(secret[- ]lair|card[- ]image[- ]gallery|design[- ]files|making[- ]magic|magic[- ]story|planeswalker'?s?[- ]guide|collecting|rules[- ]blog|dev[- ]blog|preview|spoiler|sneak[- ]peek|digital[- ]game|livestream|in[- ]memory|recap|results|top[- ]?\d+\b|decklists?|winners|standings|vods?\b)/i;

export const CATEGORY_RULES = [
  {
    type: "banlist",
    test: /(\bban(s|ned|[- ]list)?\b|banned[- ]and[- ]restricted|\bunban|restricted[- ]list|forbidden|limited[- ]list|suspended|suspension)/i
  },
  {
    type: "rules",
    test: /(comprehensive[- ]rules|rules[- ]update|update[- ]bulletin|tournament[- ]rules|tournament[- ]policy|infraction[- ]procedure|\berrata\b|oracle[- ]changes|core[- ]rules|play[- ]policy|rules?[- ]changes?)/i
  },
  {
    type: "event",
    test: /(championships?|world[- ]?champ|\bworlds\b|pro[- ]tour|regional[- ]qualifier|regionals?\b|nationals?\b|invitational|magicon|spotlight|\bycs\b|\bwcq\b|continental|qualifier|festival|convention|tournament[- ]series|organized[- ]play[- ](update|schedule|announcement))/i
  }
];

// Formats we can name from the headline/description without guessing.
export const FORMATS = {
  magic: ["Competitive Brawl", "Standard", "Pioneer", "Modern", "Legacy", "Vintage", "Pauper", "Commander", "Alchemy", "Historic", "Timeless", "Brawl", "Explorer"],
  lorcana: ["Core Constructed", "Infinity Constructed", "Core", "Infinity"],
  riftbound: ["Standard", "2v2 Constructed", "2v2"],
  yugioh: ["Advanced Format", "Traditional Format", "Genesys", "Speed Duel"],
  pokemon: ["Standard", "Expanded"]
};
