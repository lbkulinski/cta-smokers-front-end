<script lang="ts">
	import { Line } from '$lib/types';
	import type { AggregatePeriod } from '$lib/types';
	import { fetchAggregate, fetchDailyCounts, RateLimitError } from '$lib/api';
	import { LINE_COLORS, LINE_DISPLAY_NAMES, LINE_TEXT_COLORS } from '$lib/constants';
	import { getTrendSubPeriods, formatTrendLabel, getChicagoParts } from '$lib/date-utils';

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

		try {
			if (period === 'month') {
				const { days } = await fetchDailyCounts(line, date);
				if (id !== loadId) return;
				const countByDate = new Map(days.map(d => [d.date, d.reportCount]));
				const [year, month] = date.split('-').map(Number);
				const daysInMonth = new Date(year, month, 0).getDate();
				const { year: cy, month: cm, day: cd } = getChicagoParts();
				const todayStr = `${cy}-${String(cm).padStart(2, '0')}-${String(cd).padStart(2, '0')}`;
				const result: Bar[] = [];
				for (let d = 1; d <= daysInMonth; d++) {
					const dayStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
					if (dayStr > todayStr) break;
					result.push({ label: String(d), count: countByDate.get(dayStr) ?? 0 });
				}
				bars = result;
				return;
			}

			const subPeriods = getTrendSubPeriods(period, date);
			if (subPeriods.length === 0) {
				if (id === loadId) { bars = []; loading = false; }
				return;
			}

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
				? e.message
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
	let textColor = $derived(LINE_TEXT_COLORS[line]);
	let lineName = $derived(LINE_DISPLAY_NAMES[line].replace(' Line', ''));
	function shouldShowLabel(i: number): boolean {
		if (bars.length <= 12) return true;
		return i === 0 || (i + 1) % 5 === 0 || i === bars.length - 1;
	}
</script>

<div class="bg-[#171717] border border-[#2a2a2a] rounded-xl overflow-hidden mt-4">
	<div class="px-4 py-3 border-b border-[#2a2a2a] flex items-center gap-2">
		<span
			class="text-xs font-bold px-2 py-0.5 rounded-full"
			style="background-color: {color}; color: {textColor};"
		>
			{lineName}
		</span>
		<span class="text-[#888] text-xs uppercase tracking-wider font-semibold">Trend</span>
	</div>

	{#if loading}
		<div role="status" aria-label="Loading trend chart" class="px-4 pt-4 pb-6">
			<div class="flex items-start gap-2">
				<div class="shrink-0" style="width: 20px; height: 96px;"></div>
				<div class="flex-1 flex items-end gap-1" style="height: 96px;">
					{#each [70,40,85,55,90,45,75,60,80,50,65,35] as h}
						<div
							class="flex-1 animate-pulse bg-[#2a2a2a] rounded-t"
							style="height: {h * 0.96}px;"
						></div>
					{/each}
				</div>
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
			<div class="flex items-start gap-2" aria-hidden="true">
				<div class="flex flex-col justify-between text-right shrink-0" style="width: 20px; height: 96px;">
					<span class="text-[#555] text-[9px]">{maxCount}</span>
					<span class="text-[#555] text-[9px]">0</span>
				</div>
				<div class="flex-1 flex items-end gap-1" style="height: 96px;">
					{#each bars as bar}
						{@const h = Math.max((bar.count / maxCount) * 96, bar.count > 0 ? 2 : 0)}
						<div
							class="flex-1 min-w-0 rounded-t transition-[height] duration-300"
							style="height: {h}px; background-color: {color}; opacity: 0.85;"
							title={String(bar.count)}
						></div>
					{/each}
				</div>
			</div>
			<div class="flex gap-1 mt-1.5 pl-7" aria-hidden="true">
				{#each bars as bar, i}
					<div class="flex-1 min-w-0 text-center overflow-hidden">
						{#if shouldShowLabel(i)}
							<span class="text-[#555] text-[9px] truncate block">{bar.label}</span>
						{/if}
					</div>
				{/each}
			</div>
			<table class="sr-only">
				<caption>{lineName} trend</caption>
				<tbody>
					{#each bars as bar}
						<tr>
							<th scope="row">{bar.label}</th>
							<td>{bar.count} report{bar.count !== 1 ? 's' : ''}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
