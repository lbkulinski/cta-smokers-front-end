<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import type { CountPeriod } from '$lib/types';
	import { Line } from '$lib/types';
	import { parseStatsParams } from '$lib/counts';
	import { DATA_LAST_DATE, TOTAL_REPORTS } from '$lib/data';
	import { APP_MIN_DATE, formatPeriodLabel } from '$lib/date-utils';
	import { RIDE_SAFE } from '$lib/constants';
	import PeriodTabs from '$lib/components/PeriodTabs.svelte';
	import PeriodPicker from '$lib/components/PeriodPicker.svelte';
	import Leaderboard from '$lib/components/Leaderboard.svelte';
	import TrendChart from '$lib/components/TrendChart.svelte';

	let view = $derived(
		parseStatsParams(page.url.searchParams.get('period'), page.url.searchParams.get('date'), DATA_LAST_DATE)
	);
	let period = $derived(view.period);
	let date = $derived(view.date);
	let pickerOpen = $state(false);
	let selectedLine = $state<Line | null>(null);
	let pickerTriggerEl = $state<HTMLButtonElement | null>(null);

	function updateParams(newPeriod: CountPeriod, newDate: string): void {
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
	<title>Archive — CTA Smokers</title>
	<meta name="description" content="Smoking reports riders submitted to CTA Smokers in 2026." />
	<link rel="canonical" href="https://ctasmokers.com/stats" />
	<meta property="og:title" content="Archive — CTA Smokers" />
	<meta property="og:description" content="Smoking reports riders submitted to CTA Smokers in 2026." />
	<meta property="og:url" content="https://ctasmokers.com/stats" />
	<meta property="og:type" content="website" />
</svelte:head>

<h1 class="text-2xl font-bold text-[#e5e5e5] mb-2">Archive</h1>
<p class="text-sm text-[#e5e5e5] mb-3">CTA Smokers no longer collects reports. This site is not run by NITA or the CTA. To report smoking, text NITA Ride Safe at {RIDE_SAFE.textNumber}. <a href="/" class="text-[#c60c30] underline underline-offset-2 rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2">Draft a message →</a></p>
<p class="text-sm text-[#bbb] mb-1">{TOTAL_REPORTS} reports, {formatPeriodLabel('day', APP_MIN_DATE)} to {formatPeriodLabel('day', DATA_LAST_DATE)}.</p>
<p class="text-sm text-[#888] mb-4">Counts show who used this site, not how much smoking happened. Reports were submitted by riders and are not verified.</p>

<div class="mb-6 relative">
	<PeriodTabs {period} {date} {pickerOpen} onchange={updateParams} onopenpicker={() => (pickerOpen = !pickerOpen)} bind:pickerTriggerEl />
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

<section class="mt-6" aria-labelledby="downloads-heading">
	<h2 id="downloads-heading" class="text-[#888] text-xs uppercase tracking-wider font-semibold mb-1">Download the data</h2>
	<a href="/data/cta-smokers-report-counts.zip" download class="inline-flex items-center min-h-[32px] text-sm text-[#c60c30] underline underline-offset-2 rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2">Download all counts (ZIP)</a>
	<p class="text-xs text-[#888]">CSV files by day, week, month, year and all time, with a README.</p>
</section>
