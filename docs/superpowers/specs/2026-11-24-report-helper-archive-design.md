# Report helper and archive

Date: 2026-11-24
Status: approved

## Intent

CTA Smokers stops collecting smoking reports. NITA's Ride Safe (app, or text 312-313-9015) is now the official way to report. The site stays up to:

1. help a rider send a useful report to Ride Safe quickly, and
2. keep the counts riders submitted here available to the public.

## Goals

- A rider can go from opening the site to a ready-to-send text in a few taps.
- Every visitor sees that reporting here has ended and where to report instead.
- The existing statistics keep working with no API or database behind them.

## Non-goals

- No reports are stored, logged or counted by this site.
- No new analytics.
- No changes to the `cta-smokers-api` repo. Shutting it down is a separate task.

## Anti-goals

- Looking official. A visitor must not think the site is run by NITA or the CTA.
- Letting a visitor believe a report was sent when they have only opened a draft.

## Approaches

| Approach | Trade-off |
|---|---|
| Signpost and archive | Almost no upkeep, but only a link for riders who want to report |
| Report helper on top of signpost and archive | Keeps the quick form; text prefill needs testing on real phones |
| Rider guide | Useful once, little reason to return |
| Year in review | Least upkeep, read once |

**Picked:** report helper on top of signpost and archive, because it keeps what was useful about the site while removing the backend.

## Pages

### `/` (helper)

Updated 2026-11-24 after review of the built page: the Ride Safe app is the main way to report, so its link sits in its own card above the form, and the text helper follows under "Or report by text". This replaces the placement shown in the sketch.

```
Report smoking to NITA Ride Safe
CTA Smokers no longer collects reports. This site is not run by NITA or the CTA.
Emergency? Call 911.

[ Train line ▾ ]
[ Destination ▾ ]
[ Next station ▾ ]
[ Car number    ]
[ Run number (optional) ]

Your message:
  Smoking on a CTA Red Line train, car 5432, toward 95th/Dan Ryan,
  next stop Fullerton.

[ Open text to 312-313-9015 ]   [ Copy message ]
Nothing is sent until you press send in your messaging app.
Or get the Ride Safe app ↗

778 reports were submitted here in 2026. See the archive →
```

- Reuses the current form fields, station lists, car number hints and validation. Same required fields as today.
- The message updates as the rider fills in the form. A run number, if given, is appended as `Run 101.`
- The button opens `sms:+13123139015?body=<encoded message>`. The page never shows a "submitted" state.
- "Copy message" covers desktops and phones where prefill fails. The number is shown as visible text.
- The home page is prerendered.

### `/stats` (archive)

- Same tabs, leaderboard and trend chart, reading a static data file.
- Defaults to All Time. Date navigation runs from 2026-02-28 to the last date in the data, not to today.
- A short note: dates covered, total reports, and that counts reflect who used this site, not how much smoking happened. Rider-submitted and unverified.
- One download: a zip of the CSV files and their README.

### `/report`

Redirects to `/` so old links and bookmarks work.

## Data

- Source: the export in `cta-smokers-report-counts.zip`. The CSVs and README are published under `static/data/`. The zip is not committed.
- `daily.csv` is the single source for the stats page; week, month, year and all-time totals are derived from it. Checked on 2026-11-24: the derived weekly, monthly and all-time totals match the export.
- Totals and the end date are computed from the data, never typed into the page, so a later export is a drop-in replacement.

## Removed

- Live feed, 30-second refresh, report submission and the API client.
- `VITE_SMOKERS_API_BASE_URL` and `.env.example`.
- The Ride Safe notice component, including the "keep it or shut it down" prompt.

## Also updated

Navigation ("Report a Smoker" and "Home" become one "Report" link, "Stats" becomes "Archive"), page titles and descriptions, `sitemap.xml`, README, CHANGELOG, and version 3.0.0. Check that `og-image.png` does not promise reporting here. Footer and visual style stay as they are.

## Rollout

Merging to `main` deploys automatically, so the order matters:

1. Merge and deploy the new front end.
2. Logan stops the API from accepting reports.
3. Logan takes a final export. The one from 2026-11-24 23:58 UTC misses anything sent after it.
4. Replace the files in `static/data/` and deploy again.
5. Logan shuts down the API and database.

## Verification

- `npm run check` and `npm run build` pass.
- Stats totals match the export for all-time, a month, a week and a day.
- The site makes no requests to `api.ctasmokers.com`.
- Logan tests the text button on an iPhone and an Android phone before the merge. Prefill behavior differs between phones and cannot be confirmed from a desktop.

## Left to the builder

File layout, the data file format, component structure and exact wording beyond what is shown above.
