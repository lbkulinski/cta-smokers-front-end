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
	let pickerTriggerEl = $state<HTMLButtonElement | null>(null);

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
	<PeriodTabs {period} {date} onchange={updateParams} onopenpicker={() => (pickerOpen = !pickerOpen)} bind:pickerTriggerEl />
	{#if pickerOpen && period !== 'all-time'}
		<PeriodPicker
			period={period}
			{date}
			onselect={onPickerSelect}
			onclose={() => { pickerOpen = false; pickerTriggerEl?.focus(); }}
		/>
	{/if}
</div>

<Leaderboard {period} {date} {selectedLine} onselect={(line) => (selectedLine = line)} />

{#if selectedLine !== null && period !== 'day'}
	<TrendChart line={selectedLine} {period} {date} />
{/if}
