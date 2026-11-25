# CTA Smokers — Front End

CTA Smokers used to collect reports of smoking on Chicago Transit Authority (CTA) trains. It no longer does. The site now helps riders text NITA Ride Safe and keeps an archive of the counts submitted here. It is not run by NITA or the CTA.

## Features

- **Report helper** — fill in line, destination, next station and car number, then open a drafted text to Ride Safe (312-313-9015) or copy it. Nothing is stored or sent by the site
- **Archive** — report counts by line for all time, year, month, week and day, with CSV downloads

## Tech Stack

- [SvelteKit](https://kit.svelte.dev/) (static site via `@sveltejs/adapter-static`)
- [Svelte 5](https://svelte.dev/) with runes
- [Tailwind CSS v4](https://tailwindcss.com/) via `@tailwindcss/vite`
- TypeScript

There is no backend.

## Getting Started

Needs Node.js 22.18 or later and npm.

```sh
npm install
npm run dev       # http://localhost:5173
npm test          # unit tests (node --test)
npm run check     # type-check
npm run build     # static site in build/
npm run preview
```

## Data

`static/data/` holds the export of report counts. The archive is built from `daily.csv`; the other files are offered as downloads and the tests check that they agree with it.

To use a later export, replace all the files in `static/data/` with the new ones, then run `npm test` and `npm run build`. Totals and the last date update from the data.

## Project Structure

```
src/
├── routes/
│   ├── +page.svelte        Report helper
│   └── stats/              Archive
└── lib/
    ├── message.ts          Builds the Ride Safe text and sms: link
    ├── counts.ts           Parses and totals the daily counts
    ├── data.ts             Loads static/data/daily.csv at build time
    ├── stations.ts         Station lists from cta-stops.json
    └── components/         Leaderboard, trend chart, period controls
unit/                       Tests
```
