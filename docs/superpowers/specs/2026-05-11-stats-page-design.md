# Stats Page Design

**Date:** 2026-05-11
**Route:** `/stats`
**Nav label:** Stats

## Overview

A new page showing aggregate smoking report data across all CTA lines. Users can explore counts by time period, see a ranked leaderboard of all 8 lines, and drill into a bar chart for a selected line.

## Architecture

### Files

- `src/routes/stats/+page.ts` — `export const ssr = false`
- `src/routes/stats/+page.svelte` — page orchestration, fetching, URL param management
- `src/lib/components/PeriodTabs.svelte` — pill tabs, prev/next arrows, period label
- `src/lib/components/PeriodPicker.svelte` — popover picker (month grid, year list, week list, day calendar)
- `src/lib/components/Leaderboard.svelte` — ranked list of all 8 lines
- `src/lib/components/TrendChart.svelte` — bar chart for selected line's sub-period breakdown

### Existing files modified

- `src/lib/api.ts` — add `fetchAggregate(line, period, value?)`
- `src/lib/types.ts` — add `SmokingReportAggregateResponse`, `AggregatePeriod` enum
- `src/routes/+layout.svelte` — add "Stats" nav link pointing to `/stats`

### State management

All selections live in URL search params so pages are shareable and browser navigation works:

| Param | Example | Notes |
|-------|---------|-------|
| `period` | `month` | One of: `all-time`, `year`, `month`, `week`, `day` |
| `date` | `2026-05` | Omitted for `all-time`; format varies by period (see below) |

Date param formats:
- `year` → `2026`
- `month` → `2026-05`
- `week` → `2026-W19`
- `day` → `2026-05-11`

Default on first load: `period=month`, `date=<current month>`.

## Time Period Selector

Five pill tabs: **All Time | Year | Month | Week | Day**. Active tab highlighted `#c60c30`. Switching tabs resets `date` to the current period.

For all tabs except All Time, a row below the tabs shows `‹ [period label] ›`:
- Arrows step one period and update `date`; forward arrow disabled at current period
- Clicking the period label opens `PeriodPicker` as a popover

### PeriodPicker variants

| Tab | Picker |
|-----|--------|
| Year | Scrollable list of years descending from current |
| Month | 4×3 month grid; navigate years with arrows; future months dimmed |
| Week | List of ISO weeks for selected year; navigate years with arrows |
| Day | Calendar grid; future dates dimmed |

## Leaderboard

Fires 8 parallel `fetchAggregate` calls (one per line) when period/date changes.

- Lines with 0 reports or that failed to load are excluded from the list
- If no lines have reports (all zero or all failed), shows "No reports for this period." empty state
- Partial load failures show a banner ("Some lines could not be loaded") without affecting visible lines
- Sort: `reportCount` descending
- Row layout: rank | colored line pill | horizontal bar | count
- Bar width: `(count / maxCount) * 100%` using line color
- Clicking a row selects it (highlighted) and triggers trend fetch
- Clicking again deselects and hides the trend chart
- Loading: 8 animated skeleton rows (`animate-pulse`)

## Trend Chart

Appears below the leaderboard when a line is selected. Hand-rolled `div` bar chart using the selected line's color. No chart library.

Sub-period granularity by active tab:

| Tab | Chart shows | API calls |
|-----|-------------|-----------|
| All Time | One bar per year (2026 → current) | N yearly aggregate calls |
| Year | One bar per month | 12 monthly calls |
| Month | One bar per day | 28–31 daily calls |
| Week | One bar per day | 7 daily calls |
| Day | No chart — leaderboard row expands with prominent count label | 0 |

Bar heights scaled relative to max value. Labels shown below each bar (e.g., "May 1", "Jan", "2024"). Loading: skeleton bars. Selecting a different line replaces the chart. Changing period clears selection.

## API

### New function in `api.ts`

```ts
fetchAggregate(line: Line, period: 'all-time' | 'year' | 'month' | 'week' | 'day', value?: string): Promise<SmokingReportAggregateResponse>
```

Maps to:
- `all-time` → `GET /api/cta/reports/smoking/aggregates/{line}/all-time`
- `year` → `GET /api/cta/reports/smoking/aggregates/{line}/year/{value}`
- `month` → `GET /api/cta/reports/smoking/aggregates/{line}/month/{value}`
- `week` → `GET /api/cta/reports/smoking/aggregates/{line}/week/{value}`
- `day` → `GET /api/cta/reports/smoking/aggregates/{line}/day/{value}`

### New types in `types.ts`

```ts
export interface SmokingReportAggregateResponse {
  reportCount: number;
}
```

## Error Handling

- **Partial leaderboard failure**: show succeeded lines + small inline notice
- **Full leaderboard failure**: full error card with retry button (matches existing style)
- **Trend fetch failure**: error shown inside chart panel with retry
- **Rate limit**: surface `RateLimitError` message same as rest of app
- **Loading**: `animate-pulse` skeletons matching existing home page pattern
