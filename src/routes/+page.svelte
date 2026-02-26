<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { fetchTop25Today, fetchStations } from '$lib/api';
	import type { SmokingReportResponse } from '$lib/types';
	import { Line } from '$lib/types';
	import { LINE_COLORS, LINE_TEXT_COLORS, LINE_DISPLAY_NAMES } from '$lib/constants';

	let reports: SmokingReportResponse[] = $state([]);
	let stationMap = $state<Record<string, string>>({});
	let loading = $state(true);
	let refreshing = $state(false);
	let error: string | null = $state(null);
	let lastUpdated: Date | null = $state(null);
	let interval: ReturnType<typeof setInterval>;

	type GroupedReports = Map<Line, Map<string, SmokingReportResponse[]>>;

	function groupReports(data: SmokingReportResponse[]): GroupedReports {
		const sorted = [...data].sort(
			(a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime()
		);
		const top25 = sorted.slice(0, 25);
		const grouped: GroupedReports = new Map();
		for (const report of top25) {
			if (!grouped.has(report.line)) {
				grouped.set(report.line, new Map());
			}
			const lineGroup = grouped.get(report.line)!;
			if (!lineGroup.has(report.destinationId)) {
				lineGroup.set(report.destinationId, []);
			}
			lineGroup.get(report.destinationId)!.push(report);
		}
		return grouped;
	}

	function stationName(id: string): string {
		return stationMap[id] ?? id;
	}

	function timeAgo(iso: string): string {
		const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
		if (diff < 60) return `${diff}s ago`;
		if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
		return `${Math.floor(diff / 3600)}h ago`;
	}

	function formatTime(date: Date): string {
		return date.toLocaleTimeString('en-US', { hour12: false });
	}

	async function load(isRefresh = false) {
		if (isRefresh) {
			refreshing = true;
		} else {
			loading = true;
			error = null;
		}
		try {
			reports = await fetchTop25Today();
			lastUpdated = new Date();
			error = null;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load reports';
		} finally {
			loading = false;
			refreshing = false;
		}
	}

	onMount(async () => {
		const [, stations] = await Promise.allSettled([load(), fetchStations()]);
		if (stations.status === 'fulfilled') {
			stationMap = Object.fromEntries(stations.value.map((s) => [s.id, s.name]));
		}
		interval = setInterval(() => load(true), 30_000);
	});

	onDestroy(() => {
		clearInterval(interval);
	});

	let grouped = $derived(groupReports(reports));
	let lineOrder = $derived([...grouped.keys()]);
</script>

<svelte:head>
	<title>CTA Smokers — Today's Reports</title>
</svelte:head>

<div class="flex items-center justify-between mb-4">
	<h1 class="text-2xl font-bold text-[#e5e5e5]">Today's Reports</h1>
	<div class="flex items-center gap-2 text-sm text-[#666]">
		{#if refreshing}
			<svg class="animate-spin h-4 w-4 text-[#555]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
				<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
			</svg>
		{/if}
		{#if lastUpdated}
			<span>Last updated {formatTime(lastUpdated)}</span>
		{/if}
	</div>
</div>

{#if loading}
	<div class="space-y-4">
		{#each [1, 2, 3] as _}
			<div class="animate-pulse bg-[#171717] rounded-xl border border-[#2a2a2a] p-4">
				<div class="h-6 bg-[#2a2a2a] rounded w-32 mb-3"></div>
				<div class="h-4 bg-[#222] rounded w-24 mb-2"></div>
				<div class="h-16 bg-[#222] rounded"></div>
			</div>
		{/each}
	</div>
{:else if error}
	<div class="bg-[#1a0808] border border-[#5a1010] text-[#f87171] rounded-xl p-4">
		<p class="font-semibold">Error loading reports</p>
		<p class="text-sm mt-1">{error}</p>
		<button
			onclick={() => load()}
			class="mt-3 text-sm underline hover:no-underline"
		>
			Try again
		</button>
	</div>
{:else if reports.length === 0}
	<div class="bg-[#171717] border border-[#2a2a2a] rounded-xl p-8 text-center text-[#666]">
		<p class="text-lg">No reports yet today.</p>
		<p class="text-sm mt-1">Be the first to <a href="/report" class="text-[#c60c30] underline">report a smoker</a>.</p>
	</div>
{:else}
	<div class="space-y-6">
		{#each lineOrder as line}
			{@const lineMap = grouped.get(line)!}
			{@const bg = LINE_COLORS[line]}
			{@const fg = LINE_TEXT_COLORS[line]}
			{@const total = [...lineMap.values()].reduce((s, a) => s + a.length, 0)}
			<div class="bg-[#171717] border border-[#2a2a2a] rounded-xl overflow-hidden">
				<div class="px-4 py-3 flex items-center gap-3" style="background-color: {bg}; color: {fg};">
					<span class="font-bold text-lg">{LINE_DISPLAY_NAMES[line]}</span>
					<span class="text-sm opacity-80">({total} report{total !== 1 ? 's' : ''})</span>
				</div>
				<div class="divide-y divide-[#2a2a2a]">
					{#each [...lineMap.entries()] as [destinationId, destReports]}
						<div class="px-4 py-3">
							<h3 class="text-sm font-semibold text-[#888] uppercase tracking-wide mb-2">
								→ {stationName(destinationId)}
							</h3>
							<div class="space-y-2">
								{#each destReports as report}
									<div class="flex flex-wrap gap-x-4 gap-y-1 items-center text-sm text-[#ccc] bg-[#1f1f1f] border border-[#2a2a2a] rounded-lg px-3 py-2">
										<span><span class="font-medium text-[#e5e5e5]">Next:</span> {stationName(report.nextStationId)}</span>
										<span><span class="font-medium text-[#e5e5e5]">Car:</span> {report.carNumber}</span>
										{#if report.runNumber}
											<span><span class="font-medium text-[#e5e5e5]">Run:</span> {report.runNumber}</span>
										{/if}
										<span class="ml-auto text-xs text-[#555]">{timeAgo(report.reportedAt)}</span>
									</div>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/each}
	</div>
{/if}
