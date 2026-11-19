# Report 409 (Duplicate) Handling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Handle the reporting API's new `409 Conflict` response (duplicate active carNumber/line report) with a specific inline message on the report form, and remove the now-dead car-level dedup grouping on the homepage feed.

**Architecture:** Add a typed `DuplicateReportError` alongside the existing `RateLimitError` in `src/lib/api.ts`, thrown from `checkResponse` on HTTP 409. The report form's existing catch-block instanceof chain picks it up and shows a fixed inline message. Separately, simplify the homepage feed's `groupReports` to drop car-level grouping/count logic, since the backend now guarantees at most one active report per carNumber/line.

**Tech Stack:** SvelteKit 2 / Svelte 5 (runes), TypeScript, no test runner (`npm run check` = `svelte-kit sync && svelte-check` is the only automated verification available in this repo).

## Global Constraints

- 409 error copy is exactly: `This car has already been reported and is still active.` (frontend-owned, not parsed from the response body).
- `checkResponse` in `src/lib/api.ts` stays synchronous — do not await `res.json()` on the error path.
- No changes to 400 handling, `SubmitReportRequest`/`SmokingReportResponse` types, or any test files (none exist).
- No test runner exists (`package.json` has no `test` script) — verification is `npm run check` (type checking) plus manual smoke-testing via `npm run dev`.

---

### Task 1: Add `DuplicateReportError` and 409 handling to `api.ts`

**Files:**
- Modify: `src/lib/api.ts:6` (add class), `src/lib/api.ts:8-15` (`checkResponse`)

**Interfaces:**
- Produces: `export class DuplicateReportError extends Error {}`, exported from `src/lib/api.ts` alongside `RateLimitError`. `checkResponse` throws `new DuplicateReportError('This car has already been reported and is still active.')` when `res.status === 409`.

- [ ] **Step 1: Add the `DuplicateReportError` class**

In `src/lib/api.ts`, directly below the existing `RateLimitError` class (line 6):

```ts
export class RateLimitError extends Error {}
export class DuplicateReportError extends Error {}
```

- [ ] **Step 2: Add the 409 branch in `checkResponse`**

Replace the current `checkResponse` function (lines 8-15):

```ts
function checkResponse(res: Response, context: string): void {
	if (res.status === 429) {
		throw new RateLimitError('Too many requests. Please wait and try again.');
	}
	if (res.status === 409) {
		throw new DuplicateReportError('This car has already been reported and is still active.');
	}
	if (!res.ok) {
		throw new Error(`${context}: ${res.status} ${res.statusText}`);
	}
}
```

- [ ] **Step 3: Type-check**

Run: `npm run check`
Expected: No new errors. (This repo has no test runner — `svelte-check`/`tsc` is the available automated verification.)

- [ ] **Step 4: Commit**

```bash
git add src/lib/api.ts
git commit -m "feat: add DuplicateReportError for 409 responses"
```

---

### Task 2: Wire `DuplicateReportError` into the report form

**Files:**
- Modify: `src/routes/report/+page.svelte:3` (import), `src/routes/report/+page.svelte:94-96` (catch block)

**Interfaces:**
- Consumes: `DuplicateReportError` from `src/lib/api.ts` (Task 1).

- [ ] **Step 1: Import `DuplicateReportError`**

In `src/routes/report/+page.svelte`, update the existing import (line 3):

```ts
import { submitReport, RateLimitError, DuplicateReportError } from '$lib/api';
```

- [ ] **Step 2: Extend the catch block**

Replace the catch block in `handleSubmit` (lines 94-96):

```ts
} catch (e_) {
	error = e_ instanceof RateLimitError || e_ instanceof DuplicateReportError
		? e_.message
		: 'Unable to submit report. Please try again.';
	focusAfterUpdate(() => errorEl);
}
```

- [ ] **Step 3: Type-check**

Run: `npm run check`
Expected: No new errors.

- [ ] **Step 4: Manual smoke test**

Run: `npm run dev`, open `/report`.
1. Submit a report for a line/car/destination/next-station combo.
2. Immediately submit the exact same combo again.
3. Confirm the second submission shows "This car has already been reported and is still active." in the inline alert (same styling/position as other errors), and focus moves to that alert.

(If the live API isn't reachable or hasn't deployed the 409 behavior yet, this step can be deferred — note it as pending in the task update rather than skipped silently.)

- [ ] **Step 5: Commit**

```bash
git add src/routes/report/+page.svelte
git commit -m "feat: show specific message for duplicate report (409)"
```

---

### Task 3: Simplify homepage feed grouping (drop car-level dedup)

**Files:**
- Modify: `src/routes/+page.svelte:11-17` (`CarGroup` type), `src/routes/+page.svelte:57-83` (`groupReports`), `src/routes/+page.svelte:298-347` (template)

**Interfaces:**
- Produces: `groupReports(data: SmokingReportResponse[]): Map<Line, Map<string, SmokingReportResponse[]>>` (line → destinationId → reports, replacing the old `Map<Line, Map<string, CarGroup[]>>`).

- [ ] **Step 1: Remove the `CarGroup` type**

In `src/routes/+page.svelte`, delete lines 11-17:

```ts
type CarGroup = {
	carNumber: string;
	runNumber?: string;
	nextStationId: string;
	count: number;
	latestAt: string;
};
```

- [ ] **Step 2: Simplify `groupReports`**

Replace the function (lines 57-83):

```ts
function groupReports(data: SmokingReportResponse[]): Map<Line, Map<string, SmokingReportResponse[]>> {
	const grouped = new Map<Line, Map<string, SmokingReportResponse[]>>();
	for (const report of data) {
		if (!grouped.has(report.line)) grouped.set(report.line, new Map());
		const lineGroup = grouped.get(report.line)!;
		if (!lineGroup.has(report.destinationId)) lineGroup.set(report.destinationId, []);
		lineGroup.get(report.destinationId)!.push(report);
	}
	return grouped;
}
```

- [ ] **Step 3: Update the template's totals and car list**

In the `{#each lineOrder as line}` block (around line 299-347), replace the `total` calculation and the inner `{#each carGroups as group}` loop.

Replace:

```svelte
{@const total = [...lineMap.values()].flatMap((v) => v).reduce((s, g) => s + g.count, 0)}
```

with:

```svelte
{@const total = [...lineMap.values()].flatMap((v) => v).length}
```

Replace the destination loop body (the `{#each [...lineMap.entries()] as [destinationId, carGroups]}` block, lines 310-344):

```svelte
{#each [...lineMap.entries()] as [destinationId, destReports]}
	<div class="px-4 py-3">
		<h3 class="text-xs font-semibold text-[#888] uppercase tracking-wider mb-2.5">
			<span aria-hidden="true">→</span>
			<span class="sr-only">Toward</span>
			{getStationName(destinationId)}
		</h3>
		<div class="space-y-2">
			{#each destReports as report}
				<article class="flex items-center gap-3 text-sm bg-[#1f1f1f] border border-[#2a2a2a] rounded-lg px-3 py-2.5">
					<div class="flex-1 min-w-0">
						<div class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
							<span class="font-semibold text-[#e5e5e5]">Car {report.carNumber}</span>
							{#if report.runNumber}
								<span class="text-[#888] text-xs">Run {report.runNumber}</span>
							{/if}
						</div>
						<div class="text-[#888] text-xs mt-0.5">Next: {getStationName(report.nextStationId)}</div>
					</div>
					<div class="flex-shrink-0 flex flex-col items-end gap-1">
						<time datetime={report.reportedAt} class="text-xs text-[#888]">{timeAgo(report.reportedAt)}</time>
					</div>
				</article>
			{/each}
		</div>
	</div>
{/each}
```

This drops the "N×" count badge block entirely (it can never fire now) and reads directly off `report.*` instead of `group.*`.

- [ ] **Step 4: Type-check**

Run: `npm run check`
Expected: No new errors. No remaining references to `CarGroup`, `carGroups`, or `group.count`.

- [ ] **Step 5: Manual smoke test**

Run: `npm run dev`, open `/`.
1. Confirm the feed still shows line color headers and "Toward <station>" subheadings, grouped correctly.
2. Confirm each active report renders as its own row (car number, run number if present, next station, relative time), with no count badge.
3. Confirm the line header's `(N reports)` total still matches the number of visible report rows for that line.

- [ ] **Step 6: Commit**

```bash
git add src/routes/+page.svelte
git commit -m "refactor: drop dead car-level grouping from homepage feed"
```
