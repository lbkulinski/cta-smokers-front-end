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
				const res = period === 'all-time'
					? await fetchAggregate(line, period)
					: await fetchAggregate(line, period, date);
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
			const first = settled.find((r): r is PromiseRejectedResult => r.status === 'rejected');
			if (!first) return;
			fullError = first.reason instanceof RateLimitError
				? first.reason.message
				: 'Failed to load leaderboard. Please try again.';
			loading = false;
			return;
		}

		if (failCount > 0) partialError = true;

		const succeededLines = new Set(succeeded.map(r => r.line));
		for (const line of LINE_ORDER) {
			if (!succeededLines.has(line)) succeeded.push({ line, count: 0 });
		}

		results = succeeded.filter(r => r.count > 0).sort((a, b) => b.count - a.count);
		loading = false;
	}

	$effect(() => {
		void load();
	});

	let maxCount = $derived(Math.max(...results.map(r => r.count), 1));
</script>

{#if loading}
	<div role="status" aria-label="Loading leaderboard" class="bg-[#171717] border border-[#2a2a2a] rounded-xl overflow-hidden">
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

		{#if results.length === 0}
			<div class="px-4 py-6 text-[#888] text-sm">No reports for this period.</div>
		{:else}
		{#each results as { line, count }, i}
			{@const color = LINE_COLORS[line]}
			{@const textColor = LINE_TEXT_COLORS[line]}
			{@const barWidth = (count / maxCount) * 100}
			{@const isSelected = selectedLine === line}
			<div class="border-b border-[#2a2a2a] last:border-0">
				<button
					onclick={() => onselect(isSelected ? null : line)}
					aria-pressed={isSelected}
					class="group w-full flex items-center gap-3 px-4 py-3 transition-colors text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-[-2px] {isSelected ? 'bg-[#1f1f1f]' : 'hover:bg-[#1a1a1a]'}"
				>
					<span class="text-[#555] text-xs w-4 flex-shrink-0 text-right">{i + 1}</span>
					<span
						class="text-xs font-bold w-14 text-center py-0.5 rounded-full flex-shrink-0"
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
					{#if period !== 'day'}
						<svg
							class="flex-shrink-0 w-3.5 h-3.5 transition-colors {isSelected ? 'text-[#aaa]' : 'text-[#444] group-hover:text-[#666]'}"
							viewBox="0 0 24 24"
							fill="currentColor"
							aria-hidden="true"
						>
							<rect x="2" y="13" width="5" height="8" rx="1" />
							<rect x="9.5" y="8" width="5" height="13" rx="1" />
							<rect x="17" y="3" width="5" height="18" rx="1" />
						</svg>
					{/if}
				</button>


			</div>
		{/each}
		{/if}
	</div>
{/if}
