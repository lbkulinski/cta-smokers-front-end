# Report 409 (Duplicate) Handling Design

**Date:** 2026-08-06
**Routes:** `/report`, `/`

## Overview

The reporting API (`POST /api/cta/reports/smoking`) now rejects a submission with `409 Conflict` when an active (non-expired) report already exists for the same `carNumber`/`line` combo, per the updated OpenAPI spec (v4.0.0). Error responses use `application/problem+json` (RFC 7807 `ProblemDetail`: `type`, `title`, `status`, `detail`, `instance`, `properties`).

This design adds frontend handling for that 409, and simplifies the homepage feed's car-level grouping, which becomes dead logic now that the backend guarantees at most one active report per car/line at a time.

Scope is limited to 409. The spec also formalizes 400 (validation) responses as `ProblemDetail`, but that's unchanged today (falls through to the generic error message) — out of scope here since client-side form validation already prevents most bad requests, and this wasn't part of the original ask.

## Architecture

### `src/lib/api.ts`

- Add `export class DuplicateReportError extends Error {}`, alongside the existing `RateLimitError`.
- In `checkResponse`, add a 409 branch before the generic `!res.ok` fallback:

  ```ts
  if (res.status === 409) {
    throw new DuplicateReportError('This car has already been reported and is still active.');
  }
  ```

- `checkResponse` stays synchronous. The response body (`ProblemDetail.detail`/`title`) is not parsed — the frontend owns its own copy rather than surfacing server text, so wording doesn't drift if the backend changes its message.

### `src/routes/report/+page.svelte`

- Import `DuplicateReportError` from `$lib/api`.
- Extend the `handleSubmit` catch block's instanceof check:

  ```ts
  error = e_ instanceof RateLimitError || e_ instanceof DuplicateReportError
    ? e_.message
    : 'Unable to submit report. Please try again.';
  ```

- No other changes — same inline `role="alert"` element, styling, and focus behavior as the existing error path.

### `src/routes/+page.svelte`

The homepage feed currently groups active reports by line → destination → carNumber, collapsing repeats into one card with an "N×" count badge (`groupReports`, `CarGroup` type). Since the backend now guarantees at most one active report per carNumber/line, that count can never exceed 1 — the car-level grouping and its dedup-merge logic are dead weight and get removed:

- Simplify `groupReports` to return `Map<Line, Map<string, SmokingReportResponse[]>>` (line → destinationId → reports), grouping only by line and destination. Drop the `CarGroup` type and the `existing.count++` merge branch.
- Template iterates reports directly under each destination heading, reading `report.carNumber`, `report.runNumber`, `report.nextStationId`, `report.reportedAt` in place of `group.*`.
- Remove the count badge block (`{#if group.count > 1}...{/if}`).
- The line-header total (`({total} reports)`) becomes the flattened `.length` of that line's destination arrays, instead of summing `.count`.
- Line/destination grouping (line color headers, "Toward X" subheadings) is unchanged — reports still render most-recent-first within each destination, per the existing sort in `mergeReports`.

## Error handling

| Status | Frontend behavior |
|---|---|
| 429 | Unchanged — `RateLimitError`, shown inline on the form. |
| 409 | New — `DuplicateReportError`, "This car has already been reported and is still active.", shown inline on the form in the same spot as other errors. |
| Other non-2xx (400, 404, 500, etc.) | Unchanged — generic `Error`, form shows "Unable to submit report. Please try again." |

## Testing

No test runner exists in this repo (no vitest/jest/playwright, no `test` script in `package.json`), so no automated tests are added. Manual verification: submit a report, then immediately resubmit the same carNumber/line and confirm the 409 message appears; confirm the homepage feed still groups by line/destination correctly with individual report rows and no stray count badges.
