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

	let dayNavPrevDisabled = $derived(pickerYear <= 2026 && pickerMonth <= 1);

	let popoverEl = $state<HTMLDivElement | null>(null);

	$effect(() => {
		if (popoverEl) popoverEl.focus();
	});
</script>

<svelte:window onkeydown={(e) => { if (e.key === 'Escape') { e.preventDefault(); onclose(); } }} />

<!-- Backdrop -->
<div class="fixed inset-0 z-10" onclick={onclose} role="presentation"></div>

<!-- Popover -->
<div
	bind:this={popoverEl}
	tabindex="-1"
	role="dialog"
	aria-modal="true"
	aria-label="Select {period}"
	class="absolute top-full left-0 mt-2 z-20 bg-[#1a1a1a] border border-[#333] rounded-xl shadow-2xl overflow-hidden min-w-[220px] focus:outline-none"
>

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
			<button onclick={() => navDayMonth(-1)} disabled={dayNavPrevDisabled} class="text-[#aaa] hover:text-white disabled:opacity-30 p-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2 rounded">‹</button>
			<span class="text-[#e5e5e5] text-sm font-semibold">{MONTH_NAMES[pickerMonth - 1]} {pickerYear}</span>
			<button onclick={() => navDayMonth(1)} disabled={dayNavNextDisabled} class="text-[#aaa] hover:text-white disabled:opacity-30 p-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2 rounded">›</button>
		</div>
		<div class="grid grid-cols-7 px-3 pt-2 pb-1">
			{#each ['Mo','Tu','We','Th','Fr','Sa','Su'] as h}
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
