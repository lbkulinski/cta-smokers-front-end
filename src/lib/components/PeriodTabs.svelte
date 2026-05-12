<script lang="ts">
	import type { AggregatePeriod } from '$lib/types';
	import { stepPeriod, isAtCurrentPeriod, isAtMinPeriod, formatPeriodLabel, getCurrentDate } from '$lib/date-utils';

	let { period, date, onchange, onopenpicker, pickerTriggerEl = $bindable<HTMLButtonElement | null>(null) }: {
		period: AggregatePeriod;
		date: string;
		onchange: (period: AggregatePeriod, date: string) => void;
		onopenpicker: () => void;
		pickerTriggerEl?: HTMLButtonElement | null;
	} = $props();

	const TABS: { value: AggregatePeriod; label: string }[] = [
		{ value: 'all-time', label: 'All Time' },
		{ value: 'year', label: 'Year' },
		{ value: 'month', label: 'Month' },
		{ value: 'week', label: 'Week' },
		{ value: 'day', label: 'Day' },
	];

	let atCurrent = $derived(isAtCurrentPeriod(period, date));
	let atMin = $derived(isAtMinPeriod(period, date));
	let label = $derived(formatPeriodLabel(period, date));

	function selectTab(newPeriod: AggregatePeriod): void {
		if (newPeriod === period) return;
		const newDate = newPeriod === 'all-time' ? '' : getCurrentDate(newPeriod);
		onchange(newPeriod, newDate);
	}

	function step(delta: number): void {
		onchange(period, stepPeriod(period, date, delta));
	}
</script>

<div class="flex gap-2 flex-wrap mb-3" role="group" aria-label="Time period">
	{#each TABS as tab}
		<button
			aria-pressed={period === tab.value}
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
			disabled={atMin}
			aria-label="Previous {period[0].toUpperCase() + period.slice(1)}"
			class="bg-[#1f1f1f] border border-[#2a2a2a] text-[#aaa] hover:text-white rounded-lg px-3 py-1.5 text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
		>
			‹
		</button>
		<button
			bind:this={pickerTriggerEl}
			onclick={onopenpicker}
			aria-haspopup="dialog"
			class="text-[#e5e5e5] text-sm font-semibold underline underline-offset-4 decoration-[#444] hover:decoration-[#888] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2 rounded"
		>
			{label} <span aria-hidden="true">▾</span>
		</button>
		<button
			onclick={() => step(1)}
			disabled={atCurrent}
			aria-label="Next {period[0].toUpperCase() + period.slice(1)}"
			class="bg-[#1f1f1f] border border-[#2a2a2a] text-[#aaa] hover:text-white rounded-lg px-3 py-1.5 text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
		>
			›
		</button>
	</div>
{/if}
