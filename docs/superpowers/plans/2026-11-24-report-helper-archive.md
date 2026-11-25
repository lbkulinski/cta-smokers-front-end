# Report Helper and Archive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace CTA Smokers' reporting backend with a helper that drafts a text to NITA Ride Safe, plus a static archive of the submitted counts.

**Architecture:** The home page builds a message in the browser and hands it to the phone through an `sms:` link. The stats page keeps its components but reads `static/data/daily.csv`, bundled at build time. Message and counting logic live in pure modules that Node can test directly.

**Tech Stack:** SvelteKit (adapter-static), Svelte 5 runes, Tailwind CSS v4, TypeScript, `node --test` (Node 22.18 or later; no new dependencies).

**Spec:** `docs/superpowers/specs/2026-11-24-report-helper-archive-design.md`

## Global Constraints

- Ride Safe text number: `312-313-9015` (text only; never say "call"). App link: `https://nita.illinois.gov/safety/app`.
- No reports are stored, logged or counted. No new analytics. No requests to `api.ctasmokers.com`.
- The site says it is not run by NITA or the CTA, and never says or implies a report was sent.
- Required fields: line, destination, next station, car number (4 digits). Run number optional (3 digits).
- Data range starts `2026-02-28` and ends at the last date in the data, never today. Totals and end date are computed, never typed in.
- Existing visual style and footer stay. Version `3.0.0`.
- Do not commit `cta-smokers-report-counts.zip`. Do not merge or push.

## Review Focus

1. Stats URL with a bad or out-of-range value (`?period=foo`, `?period=month&date=garbage`, an old bookmark for a date after the data ends): falls back to a valid view, no crash. Pinned in Task 2.
2. Clipboard blocked or unavailable: the page says copying failed and the message stays selectable; it never says "Copied". Task 3.
3. Rider changes the line after picking stations: destination and next station reset, so the message never mixes lines. Task 3.
4. Station names with `/`, `&`, `'` or spaces: the draft arrives intact. Pinned in Task 1.
5. A later export with CRLF line endings or a trailing newline: parses the same; a malformed row fails the build instead of undercounting. Pinned in Task 2.

---

### Task 1: Message builder

**Files:**
- Create: `src/lib/message.ts`, `unit/message.test.ts` (outside `src/`, so `svelte-check` needs no Node types)
- Modify: `package.json` (add `"test": "node --test unit/*.test.ts"`)

**Interfaces:**
- Produces:
  - `interface ReportDraft { lineName: string; destinationName: string; nextStationName: string; carNumber: string; runNumber: string }`
  - `buildMessage(draft: ReportDraft): string` (`''` when `lineName` is empty; omits empty parts)
  - `buildSmsHref(message: string): string`

- [ ] **Step 1:** Run `npm ci`, then `npm run check` and `npm run build`. Record the baseline; both are expected to pass.
- [ ] **Step 2:** Write the failing tests.

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildMessage, buildSmsHref } from '../src/lib/message.ts';

const full = { lineName: 'Red Line', destinationName: '95th/Dan Ryan', nextStationName: 'Fullerton', carNumber: '5432', runNumber: '' };

test('full draft', () => {
	assert.equal(buildMessage(full), 'Smoking on a CTA Red Line train, car 5432, toward 95th/Dan Ryan, next stop Fullerton.');
});
test('run number is appended', () => {
	assert.ok(buildMessage({ ...full, runNumber: '101' }).endsWith('next stop Fullerton. Run 101.'));
});
test('Loop takes an article', () => {
	assert.match(buildMessage({ ...full, destinationName: 'Loop' }), /toward the Loop,/);
});
test('empty parts are omitted', () => {
	assert.equal(buildMessage({ lineName: 'Red Line', destinationName: '', nextStationName: '', carNumber: '', runNumber: '' }), 'Smoking on a CTA Red Line train.');
	assert.equal(buildMessage({ ...full, lineName: '' }), '');
});
test('sms href round-trips awkward names', () => {
	const message = "toward O'Hare, next stop Clark/Lake & 95th.";
	const href = buildSmsHref(message);
	assert.ok(href.startsWith('sms:+13123139015?body='));
	assert.ok(!href.includes(' ') && !href.includes('&'));
	assert.equal(decodeURIComponent(href.split('?body=')[1]), message);
});
```

- [ ] **Step 3:** Run `npm test`. Expected: FAIL, module not found.
- [ ] **Step 4:** Implement both functions. `message.ts` has no value imports, so Node can load it.
- [ ] **Step 5:** Run `npm test`. Expected: 5 pass.
- [ ] **Step 6:** Commit `feat: build Ride Safe text message`.

### Task 2: Static archive

**Files:**
- Create: `static/data/{README.txt,daily.csv,weekly.csv,monthly.csv,yearly.csv,all_time.csv}`, `src/lib/counts.ts`, `src/lib/data.ts`, `unit/counts.test.ts`
- Modify: `src/lib/date-utils.ts`, `src/lib/components/{Leaderboard,TrendChart,PeriodPicker}.svelte`, `src/routes/stats/+page.svelte`

**Interfaces:**
- Produces, in `counts.ts` (type-only imports from `./types`; value imports use a `.ts` extension):
  - `interface DailyRow { line: Line; date: string; count: number }`
  - `parseDailyCsv(csv: string): DailyRow[]` (throws on a wrong header or malformed row)
  - `countFor(rows: DailyRow[], line: Line, period: CountPeriod, value?: string): number`
  - `totalReports(rows: DailyRow[]): number`
  - `lastDate(rows: DailyRow[]): string`
  - `parseStatsParams(period: string | null, date: string | null, last: string): { period: CountPeriod; date: string }`
- Produces, in `data.ts`: `ROWS: DailyRow[]` (from `../../static/data/daily.csv?raw`), `DATA_LAST_DATE: string`, `TOTAL_REPORTS: number`

- [ ] **Step 1:** Extract the zip into a new empty directory in the scratchpad and copy its six files to `static/data/`.
- [ ] **Step 2:** Write the failing tests.

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseDailyCsv, countFor, totalReports, lastDate, parseStatsParams } from '../src/lib/counts.ts';

const read = (name: string) => readFileSync(new URL(`../static/data/${name}`, import.meta.url), 'utf8');
const rows = parseDailyCsv(read('daily.csv'));
const table = (name: string) => read(name).trim().split(/\r?\n/).slice(1).map((l) => l.split(','));

test('derived totals match every aggregate in the export', () => {
	for (const [line, week, n] of table('weekly.csv')) assert.equal(countFor(rows, line as any, 'week', week), Number(n));
	for (const [line, month, n] of table('monthly.csv')) assert.equal(countFor(rows, line as any, 'month', month), Number(n));
	for (const [line, year, n] of table('yearly.csv')) assert.equal(countFor(rows, line as any, 'year', year), Number(n));
	for (const [line, n] of table('all_time.csv')) assert.equal(countFor(rows, line as any, 'all-time'), Number(n));
	assert.equal(totalReports(rows), table('all_time.csv').reduce((s, [, n]) => s + Number(n), 0));
});
test('single day, and zero when there is no row', () => {
	assert.equal(countFor(rows, 'BLUE' as any, 'day', '2026-03-02'), 5);
	assert.equal(countFor(rows, 'YELLOW' as any, 'day', '2026-03-02'), 0);
});
test('CRLF parses the same; malformed input throws', () => {
	const lf = 'line,date,report_count\nRED,2026-03-01,2\n';
	assert.deepEqual(parseDailyCsv(lf.replaceAll('\n', '\r\n')), parseDailyCsv(lf));
	assert.equal(lastDate(parseDailyCsv(lf)), '2026-03-01');
	assert.throws(() => parseDailyCsv('line,date,report_count\nRED,2026-03-01,x\n'));
	assert.throws(() => parseDailyCsv('line,date,report_count\nTEAL,2026-03-01,1\n'));
	assert.throws(() => parseDailyCsv('a,b,c\n'));
});
test('stats params fall back to a valid view', () => {
	const last = '2026-11-24';
	const p = (a: string | null, b: string | null) => parseStatsParams(a, b, last);
	assert.deepEqual(p(null, null), { period: 'all-time', date: '' });
	assert.deepEqual(p('foo', 'x'), { period: 'all-time', date: '' });
	assert.deepEqual(p('month', null), { period: 'month', date: '2026-11' });
	assert.deepEqual(p('month', 'garbage'), { period: 'month', date: '2026-11' });
	assert.deepEqual(p('month', '2026-13'), { period: 'month', date: '2026-11' });
	assert.deepEqual(p('day', '2027-01-05'), { period: 'day', date: '2026-11-24' });
	assert.deepEqual(p('day', '2026-01-01'), { period: 'day', date: '2026-11-24' });
	assert.deepEqual(p('week', '2026-W09'), { period: 'week', date: '2026-W09' });
	assert.deepEqual(p('year', '2026'), { period: 'year', date: '2026' });
});
```

- [ ] **Step 3:** Run `npm test`. Expected: `counts.test.ts` fails, module not found.
- [ ] **Step 4:** Implement `counts.ts` and `data.ts`. Weeks use `getISOWeekString` from `./date-utils.ts`. A date is out of range when before `2026-02-28` or after `last`, compared at the period's granularity.
- [ ] **Step 5:** Run `npm test`. Expected: all pass.
- [ ] **Step 6:** Point the page at the data:
  - `date-utils.ts`: replace `getChicagoParts` with `getEndParts()`, the year, month and day of `DATA_LAST_DATE`, and use it everywhere "today" or "current" was used (also in `TrendChart` and `PeriodPicker`). Because `counts.ts` imports `date-utils.ts`, do not import `data.ts` into `date-utils.ts`; instead export `setDataEnd(date: string): void` there and call it from `data.ts`. Every component that reads `getEndParts` must import `data.ts`, directly or through the stats page.
  - `Leaderboard` and `TrendChart`: use `countFor(ROWS, …)` synchronously with `$derived`. Delete the loading skeletons, error states, retry buttons and `loadId`.
  - Stats page: take `period` and `date` from `parseStatsParams`. Title `Archive — CTA Smokers`, heading `Archive`, description `Smoking reports riders submitted to CTA Smokers in 2026.`
  - Add a note with `{TOTAL_REPORTS}` and the dates `February 28, 2026` to the formatted `DATA_LAST_DATE`, and the copy `Counts show who used this site, not how much smoking happened. Reports were submitted by riders and are not verified.`
  - Add download links to the six files in `static/data/`.
- [ ] **Step 7:** Run `npm test && npm run check && npm run build`. Expected: all pass.
- [ ] **Step 8:** Run `npm run preview` and open `/stats`. Confirm All Time shows Red 356 and Blue 207; March shows Red 57; the next arrow is disabled at November 2026; picking a line draws the trend; `?period=month&date=garbage` shows November.
- [ ] **Step 9:** Commit `feat: serve stats from a static archive`.

### Task 3: Helper page and removal of reporting

**Files:**
- Modify: `src/routes/+page.svelte` (replace), `src/routes/+layout.svelte` (nav only), `src/lib/constants.ts`, `src/lib/types.ts`, `static/_redirects`, `static/sitemap.xml`, `README.md`, `CHANGELOG.md`, `package.json`, `package-lock.json`
- Delete: `src/routes/report/`, `src/lib/api.ts`, `src/lib/components/RideSafeNotice.svelte`, `.env.example`

**Interfaces:**
- Consumes: `buildMessage`, `buildSmsHref` (Task 1); `TOTAL_REPORTS` (Task 2); `getDestinations`, `getStations` from `$lib/stations`
- Produces: `RIDE_SAFE = { url: 'https://nita.illinois.gov/safety/app', textNumber: '312-313-9015' } as const`

- [ ] **Step 1:** Rebuild `/` from the current report form (`src/routes/report/+page.svelte`): same fields, hints, validation messages, focus handling and styles. Keep `+page.ts` as it is (prerendered with SSR). Exact copy:
  - Heading `Report smoking to NITA Ride Safe`
  - `CTA Smokers no longer collects reports. This site is not run by NITA or the CTA.`
  - `Emergency? Call 911.` (`tel:911`)
  - Preview label `Your message`; buttons `Open text to 312-313-9015` and `Copy message`
  - `Nothing is sent until you press send in your messaging app.`
  - `Or get the Ride Safe app ↗`
  - `{TOTAL_REPORTS} reports were submitted here in 2026. See the archive →` linking to `/stats`
- [ ] **Step 2:** Behaviour: both buttons run the same validation first. Open sets `window.location.href = buildSmsHref(message)`. Copy awaits `navigator.clipboard.writeText` inside `try`; success shows `Copied. Paste it into a text to 312-313-9015.` and failure shows `Couldn't copy. Select the message above and copy it.`, both in a `role="status"` region that clears when a field changes. Changing the line clears destination and next station. The form keeps its values after either button.
- [ ] **Step 3:** Page metadata: title `CTA Smokers — Report smoking to Ride Safe`, description `Draft a text to NITA Ride Safe about smoking on a CTA train, and see the CTA Smokers archive.`, canonical `https://ctasmokers.com/`; keep the existing Open Graph image tags from the report page.
- [ ] **Step 4:** Delete the files listed above. Remove the report and count types from `types.ts` (keep `Line`, `Station`, `CountPeriod`). Nav becomes `Report` (`/`), `Archive` (`/stats`), `Contact`, in both the desktop and mobile nav lists. Add `/report / 301` to `_redirects`. Sitemap lists `/` (monthly) and `/stats` (yearly).
- [ ] **Step 5:** Rewrite the README for the new site (features, `npm test`, data files and how to replace them with a later export; no API or env section). Add a `## [3.0.0] - 2026-11-24` CHANGELOG entry that absorbs the Unreleased section without claiming the removed notice. Run `npm version 3.0.0 --no-git-tag-version`.
- [ ] **Step 6:** Open `static/og-image.png`. If it promises reporting or tracking here, tell Logan; do not redraw it unasked.
- [ ] **Step 7:** Run `npm test && npm run check && npm run build`, then `grep -rn "api.ctasmokers\|VITE_SMOKERS" build src README.md`. Expected: the first all pass; the grep finds nothing.
- [ ] **Step 8:** Run `npx wrangler dev` and check in a browser: empty submit shows `Please select a train line.`; a filled form shows the exact message; changing line resets the stations; Copy succeeds, and with `navigator.clipboard.writeText` forced to reject shows the failure text; `/report` redirects to `/`; `/stats` loads directly; layout works at 375px wide.
- [ ] **Step 9:** Commit `feat!: replace reporting with a Ride Safe helper`.

## After the plan (Logan)

1. Test the text button on an iPhone and an Android phone before merging.
2. Follow the rollout order in the spec: deploy, stop the API accepting reports, export, replace `static/data/`, deploy, shut down the API.
