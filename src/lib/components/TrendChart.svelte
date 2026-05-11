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
		<div role="status" aria-label="Loading trend chart" class="px-4 pt-4 pb-6">
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
			<div class="flex items-end gap-1" style="height: 96px;" aria-hidden="true">
				{#each bars as bar}
					{@const height = Math.max((bar.count / maxCount) * 100, bar.count > 0 ? 2 : 0)}
					<div class="flex-1 min-w-0">
						<div
							class="w-full rounded-t transition-[height] duration-300"
							style="height: {height}%; background-color: {color}; opacity: 0.85;"
						></div>
					</div>
				{/each}
			</div>
			<div class="flex gap-1 mt-1.5" aria-hidden="true">
				{#each bars as bar, i}
					<div class="flex-1 min-w-0 text-center overflow-hidden">
						{#if i % showEveryNth === 0 || i === bars.length - 1}
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
