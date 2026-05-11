# Stats Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a `/stats` page showing aggregate smoking report data with a time-period selector, a leaderboard of all 8 CTA lines, and a drill-down bar chart per line.

**Architecture:** Client-side only (`ssr = false`). Period and date selection live in URL search params so links are shareable. `+page.svelte` owns data fetching and passes data down to four components: `PeriodTabs`, `PeriodPicker`, `Leaderboard`, and `TrendChart`. A shared `date-utils.ts` holds all date math. No chart library — bar charts use styled `div` elements.

**Tech Stack:** SvelteKit 2, Svelte 5 (runes: `$state`, `$derived`, `$props`, `$effect`), TypeScript, Tailwind CSS 4.

---

## File Map

**Create:**
- `src/lib/date-utils.ts` — all date helpers (ISO week math, period stepping, label formatting, sub-period generation)
- `src/lib/components/PeriodTabs.svelte` — pill tabs + prev/next nav row
- `src/lib/components/PeriodPicker.svelte` — popover picker (month grid / year list / week list / day calendar)
- `src/lib/components/Leaderboard.svelte` — ranked list of all 8 lines with horizontal bars
- `src/lib/components/TrendChart.svelte` — bar chart for a selected line's sub-period breakdown
- `src/routes/stats/+page.ts` — `export const ssr = false`
- `src/routes/stats/+page.svelte` — page orchestration + URL param management

**Modify:**
- `src/lib/types.ts` — add `AggregatePeriod` and `SmokingReportAggregateResponse`
- `src/lib/api.ts` — add `fetchAggregate`
- `src/routes/+layout.svelte` — add "Stats" nav link

---

## Task 1: Types, date utilities, and API function

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/api.ts`
- Create: `src/lib/date-utils.ts`

- [ ] **Step 1: Add types to `src/lib/types.ts`**

Append to the end of the file:

```typescript
export type AggregatePeriod = 'all-time' | 'year' | 'month' | 'week' | 'day';

export interface SmokingReportAggregateResponse {
	reportCount: number;
}
```

- [ ] **Step 2: Add `fetchAggregate` to `src/lib/api.ts`**

Replace the existing `import type` line at the top of the file with these two lines (the second adds `Line` as a value import since it's a string enum used in URLs):

```typescript
import { Line } from './types';
import type { SmokingReportsResponse, SmokingReportResponse, SubmitReportRequest, SmokingReportAggregateResponse, AggregatePeriod } from './types';
```

Then append this function after the existing exports:

```typescript
export async function fetchAggregate(
	line: Line,
	period: AggregatePeriod,
	value?: string
): Promise<SmokingReportAggregateResponse> {
	const base = `${SMOKERS_BASE_URL}/api/cta/reports/smoking/aggregates/${line}`;
	const url = period === 'all-time' ? `${base}/all-time` : `${base}/${period}/${value}`;
	const res = await fetch(url);
	checkResponse(res, 'Failed to fetch aggregate');
	return res.json();
}
```

- [ ] **Step 3: Create `src/lib/date-utils.ts`**

```typescript
import type { AggregatePeriod } from './types';

export function getISOWeekString(date: Date): string {
	const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
	const dayNum = d.getUTCDay() || 7;
	d.setUTCDate(d.getUTCDate() + 4 - dayNum);
	const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
	const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
	return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export function isoWeeksInYear(year: number): number {
	const jan1 = new Date(year, 0, 1).getDay();
	const dec31 = new Date(year, 11, 31).getDay();
	return (jan1 === 4 || dec31 === 4) ? 53 : 52;
}

export function getCurrentDate(period: Exclude<AggregatePeriod, 'all-time'>): string {
	const now = new Date();
	if (period === 'month') return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
	if (period === 'year') return String(now.getFullYear());
	if (period === 'week') return getISOWeekString(now);
	return now.toISOString().slice(0, 10);
}

export function stepPeriod(period: AggregatePeriod, date: string, delta: number): string {
	if (period === 'year') return String(parseInt(date) + delta);
	if (period === 'month') {
		const [year, month] = date.split('-').map(Number);
		const d = new Date(year, month - 1 + delta, 1);
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
	}
	if (period === 'week') {
		const [yearStr, weekStr] = date.split('-W');
		let year = parseInt(yearStr);
		let week = parseInt(weekStr) + delta;
		if (week < 1) { year--; week = isoWeeksInYear(year); }
		else if (week > isoWeeksInYear(year)) { year++; week = 1; }
		return `${year}-W${String(week).padStart(2, '0')}`;
	}
	if (period === 'day') {
		const d = new Date(date + 'T00:00:00');
		d.setDate(d.getDate() + delta);
		return d.toISOString().slice(0, 10);
	}
	return date;
}

export function isAtCurrentPeriod(period: AggregatePeriod, date: string): boolean {
	if (period === 'all-time') return true;
	return date === getCurrentDate(period);
}

export function formatPeriodLabel(period: AggregatePeriod, date: string): string {
	if (period === 'all-time') return 'All Time';
	if (period === 'year') return date;
	if (period === 'month') {
		const [year, month] = date.split('-').map(Number);
		return new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
	}
	if (period === 'week') return date;
	if (period === 'day') {
		const [year, month, day] = date.split('-').map(Number);
		return new Date(year, month - 1, day).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
	}
	return date;
}

export function getTrendSubPeriods(
	period: AggregatePeriod,
	date: string
): { subPeriod: AggregatePeriod; value: string }[] {
	const now = new Date();

	if (period === 'all-time') {
		const currentYear = now.getFullYear();
		const result: { subPeriod: AggregatePeriod; value: string }[] = [];
		for (let y = 2026; y <= currentYear; y++) {
			result.push({ subPeriod: 'year', value: String(y) });
		}
		return result;
	}

	if (period === 'year') {
		const year = parseInt(date);
		const maxMonth = year < now.getFullYear() ? 12 : now.getMonth() + 1;
		const result: { subPeriod: AggregatePeriod; value: string }[] = [];
		for (let m = 1; m <= maxMonth; m++) {
			result.push({ subPeriod: 'month', value: `${year}-${String(m).padStart(2, '0')}` });
		}
		return result;
	}

	if (period === 'month') {
		const [year, month] = date.split('-').map(Number);
		const daysInMonth = new Date(year, month, 0).getDate();
		const result: { subPeriod: AggregatePeriod; value: string }[] = [];
		for (let d = 1; d <= daysInMonth; d++) {
			const dayStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
			if (dayStr <= now.toISOString().slice(0, 10)) {
				result.push({ subPeriod: 'day', value: dayStr });
			}
		}
		return result;
	}

	if (period === 'week') {
		const [yearStr, weekStr] = date.split('-W');
		const year = parseInt(yearStr);
		const week = parseInt(weekStr);
		const jan4 = new Date(Date.UTC(year, 0, 4));
		const monday = new Date(jan4);
		monday.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() || 7) - 1) + (week - 1) * 7);
		const today = now.toISOString().slice(0, 10);
		const result: { subPeriod: AggregatePeriod; value: string }[] = [];
		for (let d = 0; d < 7; d++) {
			const day = new Date(monday);
			day.setUTCDate(monday.getUTCDate() + d);
			const dayStr = day.toISOString().slice(0, 10);
			if (dayStr <= today) result.push({ subPeriod: 'day', value: dayStr });
		}
		return result;
	}

	return [];
}

export function formatTrendLabel(
	parentPeriod: AggregatePeriod,
	subPeriod: AggregatePeriod,
	value: string
): string {
	if (subPeriod === 'year') return value;
	if (subPeriod === 'month') {
		const [year, month] = value.split('-').map(Number);
		return new Date(year, month - 1).toLocaleDateString('en-US', { month: 'short' });
	}
	if (subPeriod === 'day') {
		const [year, month, day] = value.split('-').map(Number);
		const d = new Date(year, month - 1, day);
		if (parentPeriod === 'week') return d.toLocaleDateString('en-US', { weekday: 'short' });
		return String(day);
	}
	return value;
}
```

- [ ] **Step 4: Run type check**

```bash
npm run check
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/types.ts src/lib/api.ts src/lib/date-utils.ts
git commit -m "feat: add AggregatePeriod types, fetchAggregate API, and date utilities"
```

---

## Task 2: Nav link and route scaffold

**Files:**
- Modify: `src/routes/+layout.svelte`
- Create: `src/routes/stats/+page.ts`
- Create: `src/routes/stats/+page.svelte`

- [ ] **Step 1: Add "Stats" nav link to `src/routes/+layout.svelte`**

In both the desktop nav (`hidden sm:flex`) and mobile nav (`flex sm:hidden`) divs, add a Stats link alongside the existing links:

```html
<a href="/stats" class="hover:text-white transition-colors focus-visible:text-white focus-visible:underline">Stats</a>
```

Place it between "Report a Smoker" and "Contact" in both nav sections.

- [ ] **Step 2: Create `src/routes/stats/+page.ts`**

```typescript
export const ssr = false;
```

- [ ] **Step 3: Create `src/routes/stats/+page.svelte`**

```svelte
<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import type { AggregatePeriod } from '$lib/types';
	import { getCurrentDate } from '$lib/date-utils';

	let period = $derived((page.url.searchParams.get('period') ?? 'month') as AggregatePeriod);
	let date = $derived(
		page.url.searchParams.get('date') ??
		(period !== 'all-time' ? getCurrentDate(period) : '')
	);

	function updateParams(newPeriod: AggregatePeriod, newDate: string): void {
		const params = new URLSearchParams();
		params.set('period', newPeriod);
		if (newPeriod !== 'all-time' && newDate) params.set('date', newDate);
		goto(`/stats?${params}`, { replaceState: true, keepFocus: true, noScroll: true });
	}
</script>

<svelte:head>
	<title>Stats — CTA Smokers</title>
	<meta name="description" content="Aggregate smoking report data across all CTA train lines." />
	<link rel="canonical" href="https://ctasmokers.com/stats" />
	<meta property="og:title" content="Stats — CTA Smokers" />
	<meta property="og:description" content="Aggregate smoking report data across all CTA train lines." />
	<meta property="og:url" content="https://ctasmokers.com/stats" />
	<meta property="og:type" content="website" />
</svelte:head>

<h1 class="text-2xl font-bold text-[#e5e5e5] mb-6">Statistics</h1>
<p class="text-[#888] text-sm">Period: {period} {date}</p>
```

- [ ] **Step 4: Run type check and verify in browser**

```bash
npm run check
npm run dev
```

Navigate to `http://localhost:5173/stats` — expect to see "Statistics" heading and "Period: month 2026-05" (or current month). Click "Stats" in the nav — confirm it works on both desktop and mobile nav widths.

- [ ] **Step 5: Commit**

```bash
git add src/routes/+layout.svelte src/routes/stats/+page.ts src/routes/stats/+page.svelte
git commit -m "feat: add Stats nav link and /stats route scaffold"
```

---

## Task 3: PeriodTabs component

**Files:**
- Create: `src/lib/components/PeriodTabs.svelte`
- Modify: `src/routes/stats/+page.svelte`

- [ ] **Step 1: Create `src/lib/components/PeriodTabs.svelte`**

```svelte
<script lang="ts">
	import type { AggregatePeriod } from '$lib/types';
	import { stepPeriod, isAtCurrentPeriod, formatPeriodLabel, getCurrentDate } from '$lib/date-utils';

	let { period, date, onchange, onopenpicker }: {
		period: AggregatePeriod;
		date: string;
		onchange: (period: AggregatePeriod, date: string) => void;
		onopenpicker: () => void;
	} = $props();

	const TABS: { value: AggregatePeriod; label: string }[] = [
		{ value: 'all-time', label: 'All Time' },
		{ value: 'year', label: 'Year' },
		{ value: 'month', label: 'Month' },
		{ value: 'week', label: 'Week' },
		{ value: 'day', label: 'Day' },
	];

	function selectTab(newPeriod: AggregatePeriod): void {
		if (newPeriod === period) return;
		const newDate = newPeriod === 'all-time' ? '' : getCurrentDate(newPeriod);
		onchange(newPeriod, newDate);
	}

	function step(delta: number): void {
		onchange(period, stepPeriod(period, date, delta));
	}

	let atCurrent = $derived(isAtCurrentPeriod(period, date));
	let label = $derived(formatPeriodLabel(period, date));
</script>

<div>
	<div class="flex gap-2 flex-wrap mb-3" role="tablist" aria-label="Time period">
		{#each TABS as tab}
			<button
				role="tab"
				aria-selected={period === tab.value}
				onclick={() => selectTab(tab.value)}
				class="px-3 py-1.5 rounded-full text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white {period === tab.value ? 'bg-[#c60c30] text-white' : 'bg-[#1f1f1f] text-[#888] hover:text-[#e5e5e5] border border-[#2a2a2a]'}"
			>
				{tab.label}
			</button>
		{/each}
	</div>

	{#if period !== 'all-time'}
		<div class="flex items-center gap-3">
			<button
				onclick={() => step(-1)}
				aria-label="Previous {period}"
				class="bg-[#1f1f1f] border border-[#2a2a2a] text-[#aaa] hover:text-white rounded-lg px-3 py-1.5 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
			>
				‹
			</button>
			<button
				onclick={onopenpicker}
				class="text-[#e5e5e5] text-sm font-semibold underline underline-offset-4 decoration-[#444] hover:decoration-[#888] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2 rounded"
			>
				{label} ▾
			</button>
			<button
				onclick={() => step(1)}
				disabled={atCurrent}
				aria-label="Next {period}"
				class="bg-[#1f1f1f] border border-[#2a2a2a] text-[#aaa] hover:text-white rounded-lg px-3 py-1.5 text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
			>
				›
			</button>
		</div>
	{/if}
</div>
```

- [ ] **Step 2: Update `src/routes/stats/+page.svelte` to use PeriodTabs**

Replace the entire file contents:

```svelte
<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import type { AggregatePeriod } from '$lib/types';
	import { getCurrentDate } from '$lib/date-utils';
	import PeriodTabs from '$lib/components/PeriodTabs.svelte';

	let period = $derived((page.url.searchParams.get('period') ?? 'month') as AggregatePeriod);
	let date = $derived(
		page.url.searchParams.get('date') ??
		(period !== 'all-time' ? getCurrentDate(period) : '')
	);
	let pickerOpen = $state(false);

	function updateParams(newPeriod: AggregatePeriod, newDate: string): void {
		pickerOpen = false;
		const params = new URLSearchParams();
		params.set('period', newPeriod);
		if (newPeriod !== 'all-time' && newDate) params.set('date', newDate);
		goto(`/stats?${params}`, { replaceState: true, keepFocus: true, noScroll: true });
	}
</script>

<svelte:head>
	<title>Stats — CTA Smokers</title>
	<meta name="description" content="Aggregate smoking report data across all CTA train lines." />
	<link rel="canonical" href="https://ctasmokers.com/stats" />
	<meta property="og:title" content="Stats — CTA Smokers" />
	<meta property="og:description" content="Aggregate smoking report data across all CTA train lines." />
	<meta property="og:url" content="https://ctasmokers.com/stats" />
	<meta property="og:type" content="website" />
</svelte:head>

<h1 class="text-2xl font-bold text-[#e5e5e5] mb-4">Statistics</h1>

<div class="mb-6">
	<PeriodTabs {period} {date} onchange={updateParams} onopenpicker={() => (pickerOpen = !pickerOpen)} />
</div>

<p class="text-[#555] text-sm">Picker open: {pickerOpen} — leaderboard coming next</p>
```

- [ ] **Step 3: Run type check and verify in browser**

```bash
npm run check
npm run dev
```

Navigate to `/stats`. Verify:
- All five pill tabs render; active tab is red
- Clicking tabs switches and the URL updates (`?period=year`, etc.)
- For non-all-time tabs, prev/next arrows and period label appear
- "‹" / "›" arrows step the period and update the URL
- "›" is disabled when already at the current period
- Clicking the period label toggles `pickerOpen` (confirm with the debug text)

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/PeriodTabs.svelte src/routes/stats/+page.svelte
git commit -m "feat: add PeriodTabs component with tab switching and prev/next navigation"
```

---

## Task 4: PeriodPicker component

**Files:**
- Create: `src/lib/components/PeriodPicker.svelte`
- Modify: `src/routes/stats/+page.svelte`

- [ ] **Step 1: Create `src/lib/components/PeriodPicker.svelte`**

```svelte
<script lang="ts">
	import type { AggregatePeriod } from '$lib/types';
	import { isoWeeksInYear, getISOWeekString } from '$lib/date-utils';

	let { period, date, onselect, onclose }: {
		period: Exclude<AggregatePeriod, 'all-time'>;
		date: string;
		onselect: (value: string) => void;
		onclose: () => void;
	} = $props();

	const now = new Date();
	const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
	const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

	let pickerYear = $state(initPickerYear());
	let pickerMonth = $state(initPickerMonth());

	function initPickerYear(): number {
		if (period === 'week') return parseInt(date.split('-W')[0]);
		if (period === 'day') return parseInt(date.split('-')[0]);
		if (period === 'month') return parseInt(date.split('-')[0]);
		if (period === 'year') return parseInt(date);
		return now.getFullYear();
	}

	function initPickerMonth(): number {
		if (period === 'day') return parseInt(date.split('-')[1]);
		return now.getMonth() + 1;
	}

	// Month picker helpers
	function isMonthDisabled(month: number): boolean {
		return pickerYear > now.getFullYear() ||
			(pickerYear === now.getFullYear() && month > now.getMonth() + 1);
	}

	function isMonthSelected(month: number): boolean {
		const [y, m] = date.split('-').map(Number);
		return y === pickerYear && m === month;
	}

	// Year picker helpers
	function getYearList(): number[] {
		const years: number[] = [];
		for (let y = now.getFullYear(); y >= 2026; y--) years.push(y);
		return years;
	}

	// Week picker helpers
	function getWeekList(): string[] {
		const total = isoWeeksInYear(pickerYear);
		const currentWeek = getISOWeekString(now);
		const weeks: string[] = [];
		for (let w = 1; w <= total; w++) {
			const weekStr = `${pickerYear}-W${String(w).padStart(2, '0')}`;
			if (pickerYear < now.getFullYear() || weekStr <= currentWeek) weeks.push(weekStr);
		}
		return weeks;
	}

	// Day picker helpers
	type CalendarCell = { date: string; day: number } | { date: null; day: null };

	function getCalendarCells(): CalendarCell[] {
		const firstDay = new Date(pickerYear, pickerMonth - 1, 1);
		const daysInMonth = new Date(pickerYear, pickerMonth, 0).getDate();
		const startDow = (firstDay.getDay() + 6) % 7; // Mon=0
		const cells: CalendarCell[] = [];
		for (let i = 0; i < startDow; i++) cells.push({ date: null, day: null });
		for (let d = 1; d <= daysInMonth; d++) {
			cells.push({
				date: `${pickerYear}-${String(pickerMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
				day: d
			});
		}
		while (cells.length % 7 !== 0) cells.push({ date: null, day: null });
		return cells;
	}

	function isDayDisabled(dayDate: string): boolean {
		return dayDate > now.toISOString().slice(0, 10);
	}

	function navDayMonth(delta: number): void {
		pickerMonth += delta;
		if (pickerMonth < 1) { pickerMonth = 12; pickerYear--; }
		else if (pickerMonth > 12) { pickerMonth = 1; pickerYear++; }
	}

	let dayNavNextDisabled = $derived(
		pickerYear > now.getFullYear() ||
		(pickerYear === now.getFullYear() && pickerMonth >= now.getMonth() + 1)
	);
</script>

<!-- Backdrop -->
<div class="fixed inset-0 z-10" onclick={onclose} role="presentation"></div>

<!-- Popover -->
<div class="absolute top-full left-0 mt-2 z-20 bg-[#1a1a1a] border border-[#333] rounded-xl shadow-2xl overflow-hidden min-w-[220px]">

	{#if period === 'month'}
		<div class="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a]">
			<button onclick={() => pickerYear--} disabled={pickerYear <= 2026} class="text-[#aaa] hover:text-white disabled:opacity-30 p-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2 rounded">‹</button>
			<span class="text-[#e5e5e5] text-sm font-semibold">{pickerYear}</span>
			<button onclick={() => pickerYear++} disabled={pickerYear >= now.getFullYear()} class="text-[#aaa] hover:text-white disabled:opacity-30 p-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2 rounded">›</button>
		</div>
		<div class="grid grid-cols-4 gap-1 p-3">
			{#each MONTHS_SHORT as monthName, i}
				{@const idx = i + 1}
				{@const disabled = isMonthDisabled(idx)}
				{@const selected = isMonthSelected(idx)}
				<button
					onclick={() => { if (!disabled) onselect(`${pickerYear}-${String(idx).padStart(2, '0')}`); }}
					disabled={disabled}
					class="py-2 text-xs rounded-lg transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2 {selected ? 'bg-[#c60c30] text-white font-bold' : disabled ? 'text-[#444] cursor-not-allowed' : 'text-[#aaa] hover:bg-[#2a2a2a] hover:text-white'}"
				>
					{monthName}
				</button>
			{/each}
		</div>

	{:else if period === 'year'}
		<div class="max-h-60 overflow-y-auto py-1">
			{#each getYearList() as year}
				<button
					onclick={() => onselect(String(year))}
					class="w-full text-left px-4 py-2 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-[-2px] {String(year) === date ? 'bg-[#c60c30] text-white font-bold' : 'text-[#aaa] hover:bg-[#2a2a2a] hover:text-white'}"
				>
					{year}
				</button>
			{/each}
		</div>

	{:else if period === 'week'}
		<div class="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a]">
			<button onclick={() => pickerYear--} disabled={pickerYear <= 2026} class="text-[#aaa] hover:text-white disabled:opacity-30 p-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2 rounded">‹</button>
			<span class="text-[#e5e5e5] text-sm font-semibold">{pickerYear}</span>
			<button onclick={() => pickerYear++} disabled={pickerYear >= now.getFullYear()} class="text-[#aaa] hover:text-white disabled:opacity-30 p-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2 rounded">›</button>
		</div>
		<div class="max-h-60 overflow-y-auto py-1">
			{#each getWeekList() as week}
				<button
					onclick={() => onselect(week)}
					class="w-full text-left px-4 py-2 text-sm font-mono transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-[-2px] {week === date ? 'bg-[#c60c30] text-white font-bold' : 'text-[#aaa] hover:bg-[#2a2a2a] hover:text-white'}"
				>
					{week}
				</button>
			{/each}
		</div>

	{:else if period === 'day'}
		<div class="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a]">
			<button onclick={() => navDayMonth(-1)} class="text-[#aaa] hover:text-white p-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2 rounded">‹</button>
			<span class="text-[#e5e5e5] text-sm font-semibold">{MONTH_NAMES[pickerMonth - 1]} {pickerYear}</span>
			<button onclick={() => navDayMonth(1)} disabled={dayNavNextDisabled} class="text-[#aaa] hover:text-white disabled:opacity-30 p-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2 rounded">›</button>
		</div>
		<div class="grid grid-cols-7 px-3 pt-2 pb-1">
			{#each ['M','T','W','T','F','S','S'] as h}
				<div class="text-center text-[#555] text-xs">{h}</div>
			{/each}
		</div>
		<div class="grid grid-cols-7 gap-0.5 px-3 pb-3">
			{#each getCalendarCells() as cell}
				{#if cell.date === null}
					<div></div>
				{:else}
					{@const disabled = isDayDisabled(cell.date)}
					{@const selected = cell.date === date}
					<button
						onclick={() => { if (!disabled) onselect(cell.date!); }}
						disabled={disabled}
						class="aspect-square text-xs rounded transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2 {selected ? 'bg-[#c60c30] text-white font-bold' : disabled ? 'text-[#444] cursor-not-allowed' : 'text-[#aaa] hover:bg-[#2a2a2a] hover:text-white'}"
					>
						{cell.day}
					</button>
				{/if}
			{/each}
		</div>
	{/if}

</div>
```

- [ ] **Step 2: Update `src/routes/stats/+page.svelte` to wire PeriodPicker**

Replace the file contents:

```svelte
<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import type { AggregatePeriod } from '$lib/types';
	import { getCurrentDate } from '$lib/date-utils';
	import PeriodTabs from '$lib/components/PeriodTabs.svelte';
	import PeriodPicker from '$lib/components/PeriodPicker.svelte';

	let period = $derived((page.url.searchParams.get('period') ?? 'month') as AggregatePeriod);
	let date = $derived(
		page.url.searchParams.get('date') ??
		(period !== 'all-time' ? getCurrentDate(period) : '')
	);
	let pickerOpen = $state(false);

	function updateParams(newPeriod: AggregatePeriod, newDate: string): void {
		pickerOpen = false;
		const params = new URLSearchParams();
		params.set('period', newPeriod);
		if (newPeriod !== 'all-time' && newDate) params.set('date', newDate);
		goto(`/stats?${params}`, { replaceState: true, keepFocus: true, noScroll: true });
	}

	function onPickerSelect(value: string): void {
		pickerOpen = false;
		updateParams(period, value);
	}
</script>

<svelte:head>
	<title>Stats — CTA Smokers</title>
	<meta name="description" content="Aggregate smoking report data across all CTA train lines." />
	<link rel="canonical" href="https://ctasmokers.com/stats" />
	<meta property="og:title" content="Stats — CTA Smokers" />
	<meta property="og:description" content="Aggregate smoking report data across all CTA train lines." />
	<meta property="og:url" content="https://ctasmokers.com/stats" />
	<meta property="og:type" content="website" />
</svelte:head>

<h1 class="text-2xl font-bold text-[#e5e5e5] mb-4">Statistics</h1>

<div class="mb-6 relative">
	<PeriodTabs {period} {date} onchange={updateParams} onopenpicker={() => (pickerOpen = !pickerOpen)} />
	{#if pickerOpen && period !== 'all-time'}
		<PeriodPicker
			period={period}
			{date}
			onselect={onPickerSelect}
			onclose={() => (pickerOpen = false)}
		/>
	{/if}
</div>

<p class="text-[#555] text-sm">Leaderboard coming next</p>
```

- [ ] **Step 3: Run type check and verify in browser**

```bash
npm run check
npm run dev
```

Navigate to `/stats`. Verify for each tab:
- **Month**: clicking "May 2026 ▾" opens a 4×3 month grid; future months are dimmed; selecting a month updates URL and closes picker; year nav arrows step through years (back arrow disabled at 2026)
- **Year**: opens a list of years from current back to 2026; selecting updates URL
- **Week**: opens week list with year navigation; selecting updates URL
- **Day**: opens calendar grid; future dates are dimmed; month nav works; selecting updates URL
- Clicking outside the picker (backdrop) closes it

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/PeriodPicker.svelte src/routes/stats/+page.svelte
git commit -m "feat: add PeriodPicker component (month grid, year list, week list, day calendar)"
```

---

## Task 5: Leaderboard component

**Files:**
- Create: `src/lib/components/Leaderboard.svelte`
- Modify: `src/routes/stats/+page.svelte`

- [ ] **Step 1: Create `src/lib/components/Leaderboard.svelte`**

```svelte
<script lang="ts">
	import { Line } from '$lib/types';
	import type { AggregatePeriod } from '$lib/types';
	import { fetchAggregate, RateLimitError } from '$lib/api';
	import { LINE_COLORS, LINE_TEXT_COLORS, LINE_DISPLAY_NAMES } from '$lib/constants';

	const LINE_ORDER = [
		Line.RED, Line.BLUE, Line.BROWN, Line.GREEN,
		Line.ORANGE, Line.PURPLE, Line.PINK, Line.YELLOW
	];

	let { period, date, selectedLine, onselect }: {
		period: AggregatePeriod;
		date: string;
		selectedLine: Line | null;
		onselect: (line: Line | null) => void;
	} = $props();

	type LineResult = { line: Line; count: number };

	let results = $state<LineResult[]>([]);
	let loading = $state(true);
	let partialError = $state(false);
	let fullError = $state<string | null>(null);
	let loadId = 0;

	async function load(): Promise<void> {
		const id = ++loadId;
		loading = true;
		partialError = false;
		fullError = null;

		const settled = await Promise.allSettled(
			LINE_ORDER.map(async (line) => {
				const value = period === 'all-time' ? undefined : date;
				const res = await fetchAggregate(line, period, value);
				return { line, count: res.reportCount };
			})
		);

		if (id !== loadId) return;

		const succeeded: LineResult[] = [];
		let failCount = 0;

		for (const result of settled) {
			if (result.status === 'fulfilled') {
				succeeded.push(result.value);
			} else {
				failCount++;
			}
		}

		if (failCount === LINE_ORDER.length) {
			const first = settled.find(r => r.status === 'rejected') as PromiseRejectedResult;
			fullError = first.reason instanceof RateLimitError
				? 'Too many requests. Please wait before trying again.'
				: 'Failed to load leaderboard. Please try again.';
			loading = false;
			return;
		}

		if (failCount > 0) partialError = true;

		const succeededLines = new Set(succeeded.map(r => r.line));
		for (const line of LINE_ORDER) {
			if (!succeededLines.has(line)) succeeded.push({ line, count: 0 });
		}

		results = succeeded.sort((a, b) => b.count - a.count);
		loading = false;
	}

	$effect(() => {
		void load();
	});

	let maxCount = $derived(Math.max(...results.map(r => r.count), 1));
</script>

{#if loading}
	<div class="bg-[#171717] border border-[#2a2a2a] rounded-xl overflow-hidden" aria-busy="true" aria-label="Loading leaderboard">
		<div class="px-4 py-3 border-b border-[#2a2a2a]">
			<span class="text-[#888] text-xs uppercase tracking-wider font-semibold">Leaderboard</span>
		</div>
		{#each LINE_ORDER as _}
			<div class="flex items-center gap-3 px-4 py-3 border-b border-[#2a2a2a] last:border-0">
				<div class="animate-pulse bg-[#2a2a2a] h-3 w-4 rounded"></div>
				<div class="animate-pulse bg-[#2a2a2a] h-5 w-14 rounded-full"></div>
				<div class="flex-1 animate-pulse bg-[#2a2a2a] h-1.5 rounded-full"></div>
				<div class="animate-pulse bg-[#2a2a2a] h-3 w-6 rounded"></div>
			</div>
		{/each}
	</div>

{:else if fullError}
	<div role="alert" class="bg-[#1a0808] border border-[#5a1010] text-[#f87171] rounded-xl p-4">
		<p class="font-semibold">Error loading leaderboard</p>
		<p class="text-sm mt-1">{fullError}</p>
		<button
			onclick={() => load()}
			class="mt-3 text-sm underline hover:no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f87171] focus-visible:outline-offset-2 rounded"
		>
			Try again
		</button>
	</div>

{:else}
	<div class="bg-[#171717] border border-[#2a2a2a] rounded-xl overflow-hidden">
		<div class="px-4 py-3 border-b border-[#2a2a2a] flex items-center justify-between">
			<span class="text-[#888] text-xs uppercase tracking-wider font-semibold">Leaderboard</span>
			{#if partialError}
				<span class="text-xs text-[#f87171]">Some lines could not be loaded</span>
			{/if}
		</div>

		{#each results as { line, count }, i}
			{@const color = LINE_COLORS[line]}
			{@const textColor = LINE_TEXT_COLORS[line]}
			{@const barWidth = (count / maxCount) * 100}
			{@const isSelected = selectedLine === line}
			{@const dimmed = count === 0}
			<div class="border-b border-[#2a2a2a] last:border-0">
				<button
					onclick={() => onselect(isSelected ? null : line)}
					aria-pressed={isSelected}
					class="w-full flex items-center gap-3 px-4 py-3 transition-colors text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-[-2px] {isSelected ? 'bg-[#1f1f1f]' : 'hover:bg-[#1a1a1a]'} {dimmed ? 'opacity-40' : ''}"
				>
					<span class="text-[#555] text-xs w-4 flex-shrink-0 text-right">{i + 1}</span>
					<span
						class="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
						style="background-color: {color}; color: {textColor};"
					>
						{LINE_DISPLAY_NAMES[line].replace(' Line', '')}
					</span>
					<div class="flex-1 bg-[#2a2a2a] rounded-full h-1.5 overflow-hidden min-w-0">
						<div
							class="h-full rounded-full transition-[width] duration-300"
							style="width: {barWidth}%; background-color: {color};"
						></div>
					</div>
					<span class="text-[#e5e5e5] text-xs font-semibold w-8 text-right flex-shrink-0">{count}</span>
				</button>

				{#if period === 'day' && isSelected}
					<div class="px-4 pb-3 text-[#888] text-sm">
						<span class="text-[#e5e5e5] font-bold text-2xl">{count}</span>
						<span class="ml-1">report{count !== 1 ? 's' : ''} on this day</span>
					</div>
				{/if}
			</div>
		{/each}
	</div>
{/if}
```

- [ ] **Step 2: Update `src/routes/stats/+page.svelte` to use Leaderboard**

Replace the file contents:

```svelte
<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import type { AggregatePeriod } from '$lib/types';
	import { Line } from '$lib/types';
	import { getCurrentDate } from '$lib/date-utils';
	import PeriodTabs from '$lib/components/PeriodTabs.svelte';
	import PeriodPicker from '$lib/components/PeriodPicker.svelte';
	import Leaderboard from '$lib/components/Leaderboard.svelte';

	let period = $derived((page.url.searchParams.get('period') ?? 'month') as AggregatePeriod);
	let date = $derived(
		page.url.searchParams.get('date') ??
		(period !== 'all-time' ? getCurrentDate(period) : '')
	);
	let pickerOpen = $state(false);
	let selectedLine = $state<Line | null>(null);

	function updateParams(newPeriod: AggregatePeriod, newDate: string): void {
		pickerOpen = false;
		selectedLine = null;
		const params = new URLSearchParams();
		params.set('period', newPeriod);
		if (newPeriod !== 'all-time' && newDate) params.set('date', newDate);
		goto(`/stats?${params}`, { replaceState: true, keepFocus: true, noScroll: true });
	}

	function onPickerSelect(value: string): void {
		pickerOpen = false;
		updateParams(period, value);
	}
</script>

<svelte:head>
	<title>Stats — CTA Smokers</title>
	<meta name="description" content="Aggregate smoking report data across all CTA train lines." />
	<link rel="canonical" href="https://ctasmokers.com/stats" />
	<meta property="og:title" content="Stats — CTA Smokers" />
	<meta property="og:description" content="Aggregate smoking report data across all CTA train lines." />
	<meta property="og:url" content="https://ctasmokers.com/stats" />
	<meta property="og:type" content="website" />
</svelte:head>

<h1 class="text-2xl font-bold text-[#e5e5e5] mb-4">Statistics</h1>

<div class="mb-6 relative">
	<PeriodTabs {period} {date} onchange={updateParams} onopenpicker={() => (pickerOpen = !pickerOpen)} />
	{#if pickerOpen && period !== 'all-time'}
		<PeriodPicker
			period={period}
			{date}
			onselect={onPickerSelect}
			onclose={() => (pickerOpen = false)}
		/>
	{/if}
</div>

<Leaderboard {period} {date} {selectedLine} onselect={(line) => (selectedLine = line)} />

<p class="text-[#555] text-sm mt-4">Trend chart coming next — click a line above to select it</p>
```

- [ ] **Step 3: Run type check and verify in browser**

```bash
npm run check
npm run dev
```

Navigate to `/stats`. Verify:
- Leaderboard shows 8 lines ranked by count with colored pills and bars
- Loading skeleton appears while fetching
- Clicking a line row selects it (highlighted background, `aria-pressed=true`)
- Clicking the same row again deselects it
- Switching periods or dates clears the selection and reloads
- On Day tab: selecting a line shows the expanded count below the row
- Lines with 0 reports appear at the bottom, dimmed

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/Leaderboard.svelte src/routes/stats/+page.svelte
git commit -m "feat: add Leaderboard component with ranked lines, bars, and day-tab expanded state"
```

---

## Task 6: TrendChart component and final page assembly

**Files:**
- Create: `src/lib/components/TrendChart.svelte`
- Modify: `src/routes/stats/+page.svelte`

- [ ] **Step 1: Create `src/lib/components/TrendChart.svelte`**

```svelte
<script lang="ts">
	import { Line } from '$lib/types';
	import type { AggregatePeriod } from '$lib/types';
	import { fetchAggregate, RateLimitError } from '$lib/api';
	import { LINE_COLORS, LINE_DISPLAY_NAMES } from '$lib/constants';
	import { getTrendSubPeriods, formatTrendLabel } from '$lib/date-utils';

	let { line, period, date }: {
		line: Line;
		period: AggregatePeriod;
		date: string;
	} = $props();

	type Bar = { label: string; count: number };

	let bars = $state<Bar[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let loadId = 0;

	async function load(): Promise<void> {
		const id = ++loadId;
		loading = true;
		error = null;

		const subPeriods = getTrendSubPeriods(period, date);
		if (subPeriods.length === 0) {
			if (id === loadId) { bars = []; loading = false; }
			return;
		}

		try {
			const fetched = await Promise.all(
				subPeriods.map(({ subPeriod, value }) =>
					fetchAggregate(line, subPeriod, value).then(res => ({
						label: formatTrendLabel(period, subPeriod, value),
						count: res.reportCount
					}))
				)
			);
			if (id !== loadId) return;
			bars = fetched;
		} catch (e) {
			if (id !== loadId) return;
			error = e instanceof RateLimitError
				? 'Too many requests. Please wait before trying again.'
				: 'Failed to load trend data.';
		} finally {
			if (id === loadId) loading = false;
		}
	}

	$effect(() => {
		void load();
	});

	let maxCount = $derived(Math.max(...bars.map(b => b.count), 1));
	let color = $derived(LINE_COLORS[line]);
	let lineName = $derived(LINE_DISPLAY_NAMES[line].replace(' Line', ''));
	let showEveryNth = $derived(bars.length > 12 ? Math.ceil(bars.length / 6) : 1);
</script>

<div class="bg-[#171717] border border-[#2a2a2a] rounded-xl overflow-hidden mt-4">
	<div class="px-4 py-3 border-b border-[#2a2a2a] flex items-center gap-2">
		<span
			class="text-xs font-bold px-2 py-0.5 rounded-full"
			style="background-color: {color}; color: white;"
		>
			{lineName}
		</span>
		<span class="text-[#888] text-xs uppercase tracking-wider font-semibold">Trend</span>
	</div>

	{#if loading}
		<div class="px-4 pt-4 pb-6" aria-busy="true" aria-label="Loading trend chart">
			<div class="flex items-end gap-1" style="height: 96px;">
				{#each [70,40,85,55,90,45,75,60,80,50,65,35] as h}
					<div
						class="flex-1 animate-pulse bg-[#2a2a2a] rounded-t"
						style="height: {h}%;"
					></div>
				{/each}
			</div>
		</div>

	{:else if error}
		<div role="alert" class="p-4 text-[#f87171]">
			<p class="text-sm">{error}</p>
			<button
				onclick={() => load()}
				class="mt-2 text-sm underline hover:no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f87171] focus-visible:outline-offset-2 rounded"
			>
				Try again
			</button>
		</div>

	{:else if bars.length === 0}
		<div class="p-4 text-[#888] text-sm">No data available for this period.</div>

	{:else}
		<div class="px-4 pt-4 pb-2">
			<div class="flex items-end gap-1" style="height: 96px;">
				{#each bars as bar}
					{@const height = Math.max((bar.count / maxCount) * 100, bar.count > 0 ? 2 : 0)}
					<div class="flex-1 min-w-0" title="{bar.label}: {bar.count} report{bar.count !== 1 ? 's' : ''}">
						<div
							class="w-full rounded-t transition-[height] duration-300"
							style="height: {height}%; background-color: {color}; opacity: 0.85;"
						></div>
					</div>
				{/each}
			</div>
			<div class="flex gap-1 mt-1.5">
				{#each bars as bar, i}
					<div class="flex-1 min-w-0 text-center overflow-hidden">
						{#if i % showEveryNth === 0 || i === bars.length - 1}
							<span class="text-[#555] text-[9px] truncate block">{bar.label}</span>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>
```

- [ ] **Step 2: Update `src/routes/stats/+page.svelte` to final state**

Replace the file contents:

```svelte
<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import type { AggregatePeriod } from '$lib/types';
	import { Line } from '$lib/types';
	import { getCurrentDate } from '$lib/date-utils';
	import PeriodTabs from '$lib/components/PeriodTabs.svelte';
	import PeriodPicker from '$lib/components/PeriodPicker.svelte';
	import Leaderboard from '$lib/components/Leaderboard.svelte';
	import TrendChart from '$lib/components/TrendChart.svelte';

	let period = $derived((page.url.searchParams.get('period') ?? 'month') as AggregatePeriod);
	let date = $derived(
		page.url.searchParams.get('date') ??
		(period !== 'all-time' ? getCurrentDate(period) : '')
	);
	let pickerOpen = $state(false);
	let selectedLine = $state<Line | null>(null);

	function updateParams(newPeriod: AggregatePeriod, newDate: string): void {
		pickerOpen = false;
		selectedLine = null;
		const params = new URLSearchParams();
		params.set('period', newPeriod);
		if (newPeriod !== 'all-time' && newDate) params.set('date', newDate);
		goto(`/stats?${params}`, { replaceState: true, keepFocus: true, noScroll: true });
	}

	function onPickerSelect(value: string): void {
		pickerOpen = false;
		updateParams(period, value);
	}
</script>

<svelte:head>
	<title>Stats — CTA Smokers</title>
	<meta name="description" content="Aggregate smoking report data across all CTA train lines." />
	<link rel="canonical" href="https://ctasmokers.com/stats" />
	<meta property="og:title" content="Stats — CTA Smokers" />
	<meta property="og:description" content="Aggregate smoking report data across all CTA train lines." />
	<meta property="og:url" content="https://ctasmokers.com/stats" />
	<meta property="og:type" content="website" />
</svelte:head>

<h1 class="text-2xl font-bold text-[#e5e5e5] mb-4">Statistics</h1>

<div class="mb-6 relative">
	<PeriodTabs {period} {date} onchange={updateParams} onopenpicker={() => (pickerOpen = !pickerOpen)} />
	{#if pickerOpen && period !== 'all-time'}
		<PeriodPicker
			period={period}
			{date}
			onselect={onPickerSelect}
			onclose={() => (pickerOpen = false)}
		/>
	{/if}
</div>

<Leaderboard {period} {date} {selectedLine} onselect={(line) => (selectedLine = line)} />

{#if selectedLine !== null && period !== 'day'}
	<TrendChart line={selectedLine} {period} {date} />
{/if}
```

- [ ] **Step 3: Run type check**

```bash
npm run check
```

Expected: no errors.

- [ ] **Step 4: Verify full flow in browser**

```bash
npm run dev
```

Test the following scenarios:

1. **Month tab (default)**: loads leaderboard → click Red Line → trend chart appears below with daily bars for the current month
2. **Year tab**: switch to Year → leaderboard reloads → click a line → trend shows 12 monthly bars
3. **All Time tab**: leaderboard shows all-time counts → click a line → trend shows yearly bars (one bar for 2026)
4. **Week tab**: switch to Week → click a line → trend shows 7 daily bars (Mon–Sun)
5. **Day tab**: switch to Day → click a line → expanded count appears below the row; no trend chart renders
6. **Period navigation**: use prev/next arrows on Month tab — leaderboard and chart both update; selection clears
7. **Picker**: click "May 2026 ▾" → month grid opens → click a different month → picker closes, data reloads
8. **Error handling**: if network unavailable, full error card appears with "Try again"
9. **URL sharing**: copy `?period=month&date=2026-05` URL, open in new tab — loads with correct state
10. **Nav link**: "Stats" appears in both desktop and mobile nav, links correctly

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/TrendChart.svelte src/routes/stats/+page.svelte
git commit -m "feat: add TrendChart and complete Stats page wiring"
```
