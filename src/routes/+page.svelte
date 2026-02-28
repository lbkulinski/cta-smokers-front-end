<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import { fetchReportsForDate } from '$lib/api';
	import type { SmokingReportResponse } from '$lib/types';
	import { Line } from '$lib/types';
	import { LINE_COLORS, LINE_TEXT_COLORS, LINE_DISPLAY_NAMES } from '$lib/constants';
	import { getStationName } from '$lib/stations';

	type CarGroup = {
		carNumber: string;
		runNumber?: string;
		nextStationId: string;
		count: number;
		latestAt: string;
	};

	const LINE_ORDER = [Line.RED, Line.BLUE, Line.BROWN, Line.GREEN, Line.ORANGE, Line.PURPLE, Line.PINK, Line.YELLOW];

	let reports: SmokingReportResponse[] = $state([]);
	let loading = $state(true);
	let refreshing = $state(false);
	let loadingMore = $state(false);
	let error: string | null = $state(null);
	let lastUpdated: Date | null = $state(null);
	let todayCursor = $state<string | undefined>(undefined);
	let yesterdayCursor = $state<string | undefined>(undefined);
	let hasMore = $derived(!!todayCursor || !!yesterdayCursor);
	let selectedLine = $state<Line | null>(null);
	let interval: ReturnType<typeof setInterval>;

	function toggleLine(line: Line) {
		selectedLine = selectedLine === line ? null : line;
	}

	function chicagoDateString(d: Date): string {
		return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(d);
	}

	function dates() {
		const now = new Date();
		const today = chicagoDateString(now);
		const yesterdayDate = new Date(now.getTime() - 86_400_000);
		const yesterday = chicagoDateString(yesterdayDate);
		return { now, today, yesterday };
	}

	function mergeReports(existing: SmokingReportResponse[], incoming: SmokingReportResponse[], now: Date): SmokingReportResponse[] {
		const seen = new Set(existing.map((r) => r.reportId));
		const merged = [...existing, ...incoming.filter((r) => !seen.has(r.reportId))];
		return merged
			.filter((r) => new Date(r.expiresAt) > now)
			.sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime());
	}

	function groupReports(data: SmokingReportResponse[]): Map<Line, Map<string, CarGroup[]>> {
		const grouped = new Map<Line, Map<string, CarGroup[]>>();
		for (const report of data) {
			if (!grouped.has(report.line)) grouped.set(report.line, new Map());
			const lineGroup = grouped.get(report.line)!;
			if (!lineGroup.has(report.destinationId)) lineGroup.set(report.destinationId, []);
			const carGroups = lineGroup.get(report.destinationId)!;
			const existing = carGroups.find((g) => g.carNumber === report.carNumber);
			if (existing) {
				existing.count++;
				if (new Date(report.reportedAt) > new Date(existing.latestAt)) {
					existing.latestAt = report.reportedAt;
					existing.nextStationId = report.nextStationId;
					if (report.runNumber) existing.runNumber = report.runNumber;
				}
			} else {
				carGroups.push({
					carNumber: report.carNumber,
					runNumber: report.runNumber,
					nextStationId: report.nextStationId,
					count: 1,
					latestAt: report.reportedAt
				});
			}
		}
		return grouped;
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

	async function fetchFirstPages() {
		const { now, today, yesterday } = dates();
		const chicagoParts = new Intl.DateTimeFormat('en-US', {
			timeZone: 'America/Chicago',
			hour: 'numeric',
			minute: 'numeric',
			hour12: false
		}).formatToParts(now);
		const chicagoHour = parseInt(chicagoParts.find((p) => p.type === 'hour')?.value ?? '0');
		const chicagoMinute = parseInt(chicagoParts.find((p) => p.type === 'minute')?.value ?? '0');
		const needsYesterday = chicagoHour === 0 && chicagoMinute < 30;
		const [todayResult, yesterdayResult] = await Promise.allSettled([
			fetchReportsForDate(today),
			needsYesterday ? fetchReportsForDate(yesterday) : Promise.resolve(null)
		]);
		return { now, today, yesterday, needsYesterday, todayResult, yesterdayResult };
	}

	async function load() {
		loading = true;
		error = null;
		try {
			const { now, todayResult, yesterdayResult } = await fetchFirstPages();
			todayCursor = todayResult.status === 'fulfilled' ? (todayResult.value?.nextCursor ?? undefined) : undefined;
			yesterdayCursor = yesterdayResult.status === 'fulfilled' ? (yesterdayResult.value?.nextCursor ?? undefined) : undefined;
			const incoming = [
				...(todayResult.status === 'fulfilled' ? todayResult.value?.reports ?? [] : []),
				...(yesterdayResult.status === 'fulfilled' ? yesterdayResult.value?.reports ?? [] : [])
			];
			reports = mergeReports([], incoming, now);
			lastUpdated = now;
			error = null;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load reports';
		} finally {
			loading = false;
		}
	}

	async function refresh() {
		refreshing = true;
		try {
			const { now, today, yesterday, needsYesterday, todayResult, yesterdayResult } = await fetchFirstPages();
			if (!todayCursor && todayResult.status === 'fulfilled') {
				todayCursor = todayResult.value?.nextCursor ?? undefined;
			}
			if (!yesterdayCursor && yesterdayResult.status === 'fulfilled') {
				yesterdayCursor = yesterdayResult.value?.nextCursor ?? undefined;
			}
			const incoming = [
				...(todayResult.status === 'fulfilled' ? todayResult.value?.reports ?? [] : []),
				...(yesterdayResult.status === 'fulfilled' ? yesterdayResult.value?.reports ?? [] : [])
			];
			// Dates where page 1 has no cursor are the complete dataset for that date.
			// Remove any client-side reports for those dates that the API no longer returns.
			const returnedIds = new Set(incoming.map((r) => r.reportId));
			const completeDates = new Set<string>();
			if (todayResult.status === 'fulfilled' && !todayResult.value?.nextCursor) {
				completeDates.add(today);
			}
			if (needsYesterday && yesterdayResult.status === 'fulfilled' && !yesterdayResult.value?.nextCursor) {
				completeDates.add(yesterday);
			}
			const base = reports.filter((r) => !completeDates.has(r.date) || returnedIds.has(r.reportId));
			reports = mergeReports(base, incoming, now);
			lastUpdated = now;
		} finally {
			refreshing = false;
		}
	}

	async function loadMore() {
		loadingMore = true;
		try {
			const { now, today, yesterday } = dates();
			const [todayResult, yesterdayResult] = await Promise.allSettled([
				todayCursor ? fetchReportsForDate(today, todayCursor) : Promise.resolve(null),
				yesterdayCursor ? fetchReportsForDate(yesterday, yesterdayCursor) : Promise.resolve(null)
			]);
			if (todayResult.status === 'fulfilled' && todayResult.value) {
				todayCursor = todayResult.value.nextCursor ?? undefined;
			}
			if (yesterdayResult.status === 'fulfilled' && yesterdayResult.value) {
				yesterdayCursor = yesterdayResult.value.nextCursor ?? undefined;
			}
			const incoming = [
				...(todayResult.status === 'fulfilled' && todayResult.value ? todayResult.value.reports : []),
				...(yesterdayResult.status === 'fulfilled' && yesterdayResult.value ? yesterdayResult.value.reports : [])
			];
			reports = mergeReports(reports, incoming, now);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load more reports';
		} finally {
			loadingMore = false;
		}
	}

	afterNavigate(() => load());

	let debounceTimer: ReturnType<typeof setTimeout> | null = null;
	function onVisible() {
		if (debounceTimer) return;
		debounceTimer = setTimeout(() => { debounceTimer = null; }, 2000);
		refresh();
	}

	onMount(() => {
		interval = setInterval(() => refresh(), 30_000);
		document.addEventListener('visibilitychange', onVisible);
		window.addEventListener('focus', onVisible);
	});

	onDestroy(() => {
		clearInterval(interval);
		if (debounceTimer) clearTimeout(debounceTimer);
		document.removeEventListener('visibilitychange', onVisible);
		window.removeEventListener('focus', onVisible);
	});

	let availableLines = $derived(LINE_ORDER.filter((l) => reports.some((r) => r.line === l)));
	let filteredReports = $derived(selectedLine === null ? reports : reports.filter((r) => r.line === selectedLine));
	let grouped = $derived(groupReports(filteredReports));
	let lineOrder = $derived([...grouped.keys()]);
</script>

<svelte:head>
	<title>CTA Smokers — Active Reports</title>
	<meta name="description" content="See active smoking reports on CTA trains in real time. Help keep Chicago Transit Authority rail lines smoke-free." />
	<link rel="canonical" href="https://ctasmokers.com/" />
	<meta property="og:title" content="CTA Smokers — Active Reports" />
	<meta property="og:description" content="See active smoking reports on CTA trains in real time. Help keep Chicago Transit Authority rail lines smoke-free." />
	<meta property="og:url" content="https://ctasmokers.com/" />
	<meta property="og:type" content="website" />
	<meta property="og:image" content="https://ctasmokers.com/og-image.png" />
</svelte:head>

<div class="flex items-center justify-between mb-4">
	<h1 class="text-2xl font-bold text-[#e5e5e5]">Active Reports</h1>
	<div class="flex items-center gap-2 text-sm text-[#666]">
		{#if refreshing}
			<svg class="animate-spin h-4 w-4 text-[#555]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
				<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
			</svg>
		{/if}
		{#if lastUpdated}
			<span>Updated {formatTime(lastUpdated)}</span>
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
		<button onclick={() => load()} class="mt-3 text-sm underline hover:no-underline">Try again</button>
	</div>
{:else if reports.length === 0}
	<div class="bg-[#171717] border border-[#2a2a2a] rounded-xl p-8 text-center text-[#666]">
		<p class="text-lg">No active reports right now.</p>
		<p class="text-sm mt-1"><a href="/report" class="text-[#c60c30] underline">Report a smoker</a> if you see one.</p>
	</div>
{:else}
	{#if availableLines.length > 1}
		<div class="flex gap-2 overflow-x-auto pb-3 mb-4" style="scrollbar-width: none; -webkit-overflow-scrolling: touch;">
			{#each availableLines as line}
				<button
					onclick={() => toggleLine(line)}
					class="flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-semibold transition-opacity"
					style="background-color: {LINE_COLORS[line]}; color: {LINE_TEXT_COLORS[line]}; opacity: {selectedLine === null || selectedLine === line ? 1 : 0.35};"
				>
					{LINE_DISPLAY_NAMES[line]}
				</button>
			{/each}
		</div>
	{/if}

	{#if lineOrder.length === 0}
		<div class="bg-[#171717] border border-[#2a2a2a] rounded-xl p-8 text-center text-[#666]">
			<p>No {LINE_DISPLAY_NAMES[selectedLine!]} reports right now.</p>
			<button onclick={() => (selectedLine = null)} class="mt-2 text-sm text-[#c60c30] underline">Show all lines</button>
		</div>
	{:else}
		<div class="space-y-6">
			{#each lineOrder as line}
				{@const lineMap = grouped.get(line)!}
				{@const bg = LINE_COLORS[line]}
				{@const fg = LINE_TEXT_COLORS[line]}
				{@const total = [...lineMap.values()].flatMap((v) => v).reduce((s, g) => s + g.count, 0)}
				<div class="bg-[#171717] border border-[#2a2a2a] rounded-xl overflow-hidden">
					<div class="px-4 py-3 flex items-center gap-3" style="background-color: {bg}; color: {fg};">
						<span class="font-bold text-lg">{LINE_DISPLAY_NAMES[line]}</span>
						<span class="text-sm opacity-80">({total} report{total !== 1 ? 's' : ''})</span>
					</div>
					<div class="divide-y divide-[#2a2a2a]">
						{#each [...lineMap.entries()] as [destinationId, carGroups]}
							<div class="px-4 py-3">
								<h3 class="text-xs font-semibold text-[#666] uppercase tracking-wider mb-2.5">
									→ {getStationName(destinationId)}
								</h3>
								<div class="space-y-2">
									{#each carGroups as group}
										<div class="flex items-center gap-3 text-sm bg-[#1f1f1f] border border-[#2a2a2a] rounded-lg px-3 py-2.5">
											<div class="flex-1 min-w-0">
												<div class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
													<span class="font-semibold text-[#e5e5e5]">Car {group.carNumber}</span>
													{#if group.runNumber}
														<span class="text-[#666] text-xs">Run {group.runNumber}</span>
													{/if}
												</div>
												<div class="text-[#777] text-xs mt-0.5">Next: {getStationName(group.nextStationId)}</div>
											</div>
											<div class="flex-shrink-0 flex flex-col items-end gap-1">
												{#if group.count > 1}
													<span class="bg-[#c60c30] text-white text-xs font-bold px-2 py-0.5 rounded-full leading-none">
														{group.count}×
													</span>
												{/if}
												<span class="text-xs text-[#555]">{timeAgo(group.latestAt)}</span>
											</div>
										</div>
									{/each}
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/each}

			{#if hasMore}
				<button
					onclick={loadMore}
					disabled={loadingMore}
					class="w-full py-3 rounded-xl border border-[#2a2a2a] text-sm text-[#888] hover:text-[#e5e5e5] hover:border-[#444] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
				>
					{loadingMore ? 'Loading…' : 'Load more'}
				</button>
			{/if}
		</div>
	{/if}
{/if}
