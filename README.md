# CTA Smokers — Front End

A web app for reporting and tracking smoking incidents on Chicago Transit Authority (CTA) trains. Built with SvelteKit as a static SPA.

## Features

- **Live feed** — top 25 smoking reports for today, grouped by line and destination, with 30-second auto-refresh
- **Submit reports** — report a smoking incident with line, destination, next stop, car number, and optional run number
- **All 8 CTA lines** — Red, Blue, Brown, Green, Orange, Purple, Pink, and Yellow

## Tech Stack

- [SvelteKit](https://kit.svelte.dev/) (static SPA via `@sveltejs/adapter-static`)
- [Svelte 5](https://svelte.dev/) with runes (`$state`, `$derived`, `$props`)
- [Tailwind CSS v4](https://tailwindcss.com/) via `@tailwindcss/vite`
- TypeScript

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Install dependencies

```sh
npm install
```

### Configure environment (optional)

Copy `.env.example` to `.env.local` and override the API base URL if running the backend locally:

```sh
cp .env.example .env.local
```

| Variable | Default | Description |
|---|---|---|
| `VITE_SMOKERS_API_BASE_URL` | `https://api.ctasmokers.com` | CTA Smokers API |

### Develop

```sh
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build

```sh
npm run build
```

Outputs a static site to `build/`. Serve with any static file host or preview locally:

```sh
npm run preview
```

### Type-check

```sh
npm run check
```

## Project Structure

```
src/
├── app.css                    Global styles (Tailwind import)
├── routes/
│   ├── +layout.ts             SPA config (ssr=false, prerender=false)
│   ├── +layout.svelte         Navigation bar + shared layout
│   ├── +page.svelte           Home page — today's top 25 reports
│   └── report/
│       └── +page.svelte       Report submission form
└── lib/
    ├── types.ts               Line enum, Station, report request/response types
    ├── constants.ts           LINE_COLORS, LINE_TEXT_COLORS, LINE_DISPLAY_NAMES
    ├── api.ts                 API client functions
    └── cta-stops.json         CTA station data
```

## API

The app consumes the CTA Smokers API (`https://api.ctasmokers.com`):

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/cta/reports/smoking/{date}` | Fetch reports for a date (paginated) |
| `GET` | `/api/cta/reports/smoking/{date}/{reportId}` | Fetch a single report |
| `POST` | `/api/cta/reports/smoking` | Submit a new report |
