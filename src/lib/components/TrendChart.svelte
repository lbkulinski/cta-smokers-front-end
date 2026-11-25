<script lang="ts">
	import { Line } from '$lib/types';
	import type { CountPeriod } from '$lib/types';
	import { countFor } from '$lib/counts';
	import { ROWS } from '$lib/data';
	import { LINE_COLORS, LINE_DISPLAY_NAMES, LINE_TEXT_COLORS } from '$lib/constants';
	import { getTrendSubPeriods, formatTrendLabel, formatPeriodLabel } from '$lib/date-utils';

	let { line, period, date }: {
		line: Line;
		period: CountPeriod;
		date: string;
	} = $props();

	let bars = $derived(
		getTrendSubPeriods(period, date).map(({ subPeriod, value }) => ({
			label: formatTrendLabel(period, subPeriod, value),
			count: countFor(ROWS, line, subPeriod, value)
		}))
	);

	let maxCount = $derived(Math.max(...bars.map(b => b.count), 1));
	let color = $derived(LINE_COLORS[line]);
	let textColor = $derived(LINE_TEXT_COLORS[line]);
	let lineName = $derived(LINE_DISPLAY_NAMES[line].replace(' Line', ''));
	function shouldShowLabel(i: number): boolean {
		if (bars.length <= 12) return true;
		if (i === 0 || (i + 1) % 5 === 0) return true;
		if (i === bars.length - 1) {
			const prevMultipleOf5 = Math.floor((i + 1) / 5) * 5 - 1;
			return (i - prevMultipleOf5) >= 3;
		}
		return false;
	}
</script>

<div class="relative bg-[#171717] border border-[#2a2a2a] rounded-xl overflow-hidden mt-4">
	<div class="px-4 py-3 border-b border-[#2a2a2a] flex items-center gap-2">
		<span
			class="text-xs font-bold px-2 py-0.5 rounded-full"
			style="background-color: {color}; color: {textColor};"
		>
			{lineName}
		</span>
		<span class="text-[#888] text-xs uppercase tracking-wider font-semibold">Trend</span>
	</div>

	{#if bars.length === 0}
		<div class="p-4 text-[#888] text-sm">No data available for this period.</div>

	{:else}
		<div class="px-4 pt-4 pb-2">
			<div class="flex items-start gap-2" aria-hidden="true">
				<div class="flex flex-col justify-between text-right shrink-0" style="width: 20px; height: 96px;">
					<span class="text-[#888] text-[9px]">{maxCount}</span>
					<span class="text-[#888] text-[9px]">0</span>
				</div>
				<div class="flex-1 flex items-end gap-1" style="height: 96px;">
					{#each bars as bar}
						{@const h = Math.max((bar.count / maxCount) * 96, bar.count > 0 ? 2 : 0)}
						<div
							class="flex-1 min-w-0 rounded-t transition-[height] duration-300"
							style="height: {h}px; background-color: {color}; opacity: 0.85;"
						></div>
					{/each}
				</div>
			</div>
			<div class="flex gap-1 mt-1.5 pl-7" aria-hidden="true">
				{#each bars as bar, i}
					<div class="flex-1 min-w-0 text-center">
						{#if shouldShowLabel(i)}
							<span class="text-[#888] text-[9px] whitespace-nowrap block">{bar.label}</span>
						{/if}
					</div>
				{/each}
			</div>
			<table class="sr-only">
				<caption>{lineName} trend — {formatPeriodLabel(period, date)}</caption>
				<thead>
					<tr>
						<th scope="col">Period</th>
						<th scope="col">Reports</th>
					</tr>
				</thead>
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
