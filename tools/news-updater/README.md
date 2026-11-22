# Player News updater

Runs on GitHub Actions (`.github/workflows/player-news.yml`) every 6 hours, on demand
(Actions tab → "Player News updater" → Run workflow), and whenever this folder changes.

What it does:

1. Reads official publisher sources listed in `sources.mjs` (Magic, Disney Lorcana, Riftbound,
   Yu-Gi-Oh! including the Forbidden & Limited list, and Pokémon).
2. Keeps only ban list, rules update and event announcements published in the last 30 days.
3. Writes an original, fact-only summary (publisher, headline, dates, formats, venue when the
   official page gives it as structured data). No publisher text or images are copied; each post
   uses a Real Rune Cards graphic from `/news-media/` and links to the official source.
4. Skips anything it can't summarise faithfully (no date, unclear category, not an official host).
5. De-duplicates by canonical source URL, item id and title (`news/news-state.json` remembers what was seen).
6. Rebuilds the static "Article archive" list on `news/index.html` and `sitemap.xml` / `robots.txt`.
7. Commits the changes to `main`; GitHub Pages republishes the site.

Respectful access: obeys robots.txt, waits between requests, caps fetches per run, and never works
around bot challenges. Pokémon.com currently challenges automated clients, so it is reported as
`access-restricted` in each run summary and no Pokémon items are posted automatically.

Local test (no files written): `node tools/news-updater/update-news.mjs --dry-run`

No secrets, tokens or API keys are needed or stored.
