/* Real Rune Cards: calendar notes, cancellations and extra dates.
 *
 * THIS IS THE FILE TO EDIT for month-by-month changes. Home and Events build every month automatically
 * from the usual weekly schedule (see calendar.js). Only add a month here when something differs.
 * A month with no entry still shows its own name and the usual schedule.
 *
 * Nothing in these comments appears on the website. Only the "months" entries below are shown.
 *
 * How to write an entry. The key is "YYYY-MM" (for example "2027-01" for January 2027):
 *
 *   "2027-01": {
 *     note: "Shown under the calendar for that month.",
 *     tbc: [1],                              // days whose usual events are expected but not confirmed (marked *)
 *     cancel: [
 *       { day: 1 },                          // cancels everything that day
 *       { day: 8, event: "crafts" }          // cancels one event: lorcana, magic, riftbound, crafts or boardgames
 *     ],
 *     add: [
 *       { day: 16, name: "Lorcana Set Championship", short: "Set Champs" }   // short is the label in the grid (optional)
 *     ]
 *   },
 *
 * Rules: days are 1 to 31; keep the comma between months; words go inside "double quotes".
 * If a line has a mistake, that line is skipped and the usual schedule is still shown.
 * After editing, check the static monthly pages (calendar/november-2026.html, december-2026.html) still match if they cover that month.
 */
window.RRC_CALENDAR_DATA = {
  months: {
    "2026-12": {
      tbc: [24, 25, 28, 29, 31],
      note: "Christmas and New Year week (24 to 31 December) is expected to follow the usual pattern but is not confirmed yet, so check with us before you come."
    }
  }
};
