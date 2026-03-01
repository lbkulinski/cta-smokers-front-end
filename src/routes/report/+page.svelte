<script lang="ts">
	import { submitReport } from '$lib/api';
	import { Line } from '$lib/types';
	import type { SubmitReportRequest } from '$lib/types';
	import { LINE_DISPLAY_NAMES } from '$lib/constants';
	import { getDestinations, getStations } from '$lib/stations';

	const lines = Object.values(Line);

	let line = $state<Line | ''>('');
	let destinations = $derived(line ? getDestinations(line as Line) : []);
	let allStations = $derived(line ? getStations(line as Line) : []);

	let destinationId = $state('');
	let nextStationId = $state('');
	let carNumber = $state('');
	let runNumber = $state('');

	let submitting = $state(false);
	let successId: string | null = $state(null);
	let error: string | null = $state(null);
	let validationError: string | null = $state(null);

	function validate(): boolean {
		if (!line) {
			validationError = 'Please select a train line.';
			return false;
		}
		if (!destinationId) {
			validationError = 'Destination is required.';
			return false;
		}
		if (!nextStationId) {
			validationError = 'Next station is required.';
			return false;
		}
		if (!carNumber) {
			validationError = 'Car number is required.';
			return false;
		}
		validationError = null;
		return true;
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (!validate()) return;

		submitting = true;
		error = null;
		successId = null;

		const req: SubmitReportRequest = {
			line: line as Line,
			destinationId,
			nextStationId,
			carNumber,
			...(runNumber ? { runNumber } : {})
		};

		try {
			const res = await submitReport(req);
			successId = res.reportId;
			line = '';
			destinationId = '';
			nextStationId = '';
			carNumber = '';
			runNumber = '';
		} catch (e_) {
			if (e_ instanceof TypeError && e_.message === 'Failed to fetch') {
				error = 'Too many requests. Please wait before submitting again.';
			} else {
				error = e_ instanceof Error ? e_.message : 'Failed to submit report.';
			}
		} finally {
			submitting = false;
		}
	}
</script>

<svelte:head>
	<title>CTA Smokers — Report a Smoker</title>
	<meta name="description" content="Report a smoker on a CTA train. Submit a smoking report for any Chicago Transit Authority rail line." />
	<link rel="canonical" href="https://ctasmokers.com/report" />
	<meta property="og:title" content="CTA Smokers — Report a Smoker" />
	<meta property="og:description" content="Report a smoker on a CTA train. Submit a smoking report for any Chicago Transit Authority rail line." />
	<meta property="og:url" content="https://ctasmokers.com/report" />
	<meta property="og:type" content="website" />
	<meta property="og:image" content="https://ctasmokers.com/og-image.png" />
</svelte:head>

<div class="max-w-lg mx-auto">
	<h1 class="text-2xl font-bold text-[#e5e5e5] mb-6">Report a Smoker</h1>

	{#if successId}
		<div class="bg-[#0a1a0a] border border-[#1a4a1a] text-[#6ee77a] rounded-xl p-5 mb-6">
			<p class="font-semibold text-lg">Report submitted!</p>
			<p class="text-sm mt-1 text-[#5acc66]">Report ID: <code class="font-mono bg-[#0d220d] px-1 rounded">{successId}</code></p>
			<p class="text-sm mt-3 text-[#5acc66]">Want to take it further? <a href="https://www.transitchicago.com/contact/" target="_blank" rel="noopener noreferrer" class="underline hover:no-underline">Report to CTA directly →</a></p>
			<a
				href="/"
				class="mt-2 inline-block text-sm text-[#5acc66] underline hover:no-underline"
			>
				View today's reports
			</a>
		</div>
	{/if}

	<form onsubmit={handleSubmit} class="bg-[#171717] border border-[#2a2a2a] rounded-xl p-4 sm:p-6 space-y-4 sm:space-y-5" novalidate>
		{#if validationError}
			<p class="text-sm text-[#f87171] bg-[#1a0808] border border-[#5a1010] rounded-lg px-3 py-2">{validationError}</p>
		{/if}
		{#if error}
			<p class="text-sm text-[#f87171] bg-[#1a0808] border border-[#5a1010] rounded-lg px-3 py-2">{error}</p>
		{/if}

		<div>
			<label for="line" class="block text-sm font-medium text-[#aaa] mb-1">Train Line <span class="text-[#c60c30]">*</span></label>
			<select
				id="line"
				bind:value={line}
				onchange={() => { destinationId = ''; nextStationId = ''; }}
				required
				class="w-full bg-[#1f1f1f] border border-[#333] text-[#e5e5e5] rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#c60c30] focus:border-transparent"
			>
				<option value="">Select a line…</option>
				{#each lines as l}
					<option value={l}>{LINE_DISPLAY_NAMES[l]}</option>
				{/each}
			</select>
		</div>

		<div>
			<label for="destinationId" class="block text-sm font-medium text-[#aaa] mb-1">Destination <span class="text-[#c60c30]">*</span></label>
			<select
				id="destinationId"
				bind:value={destinationId}
				required
				disabled={!line}
				class="w-full bg-[#1f1f1f] border border-[#333] text-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c60c30] focus:border-transparent disabled:opacity-40"
			>
				<option value="">{!line ? 'Select a line first…' : 'Select a destination…'}</option>
				{#each destinations as station}
					<option value={station.id}>{station.name}</option>
				{/each}
			</select>
		</div>

		<div>
			<label for="nextStationId" class="block text-sm font-medium text-[#aaa] mb-1">Next Station <span class="text-[#c60c30]">*</span></label>
			<select
				id="nextStationId"
				bind:value={nextStationId}
				required
				disabled={!line}
				class="w-full bg-[#1f1f1f] border border-[#333] text-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c60c30] focus:border-transparent disabled:opacity-40"
			>
				<option value="">{!line ? 'Select a line first…' : 'Select next station…'}</option>
				{#each allStations as station}
					<option value={station.id}>{station.name}</option>
				{/each}
			</select>
		</div>

		<div>
			<label for="carNumber" class="block text-sm font-medium text-[#aaa] mb-1">Car Number <span class="text-[#c60c30]">*</span></label>
			<input
				id="carNumber"
				type="text"
				inputmode="numeric"
				pattern="[0-9]*"
				bind:value={carNumber}
				oninput={() => { carNumber = carNumber.replace(/\D/g, ''); }}
				placeholder="e.g. 5432"
				required
				class="w-full bg-[#1f1f1f] border border-[#333] text-[#e5e5e5] placeholder-[#555] rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#c60c30] focus:border-transparent"
			/>
		</div>

		<div>
			<label for="runNumber" class="block text-sm font-medium text-[#aaa] mb-1">Run Number <span class="text-[#555] font-normal">(optional)</span></label>
			<input
				id="runNumber"
				type="text"
				inputmode="numeric"
				pattern="[0-9]*"
				bind:value={runNumber}
				oninput={() => { runNumber = runNumber.replace(/\D/g, ''); }}
				placeholder="e.g. 101"
				class="w-full bg-[#1f1f1f] border border-[#333] text-[#e5e5e5] placeholder-[#555] rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#c60c30] focus:border-transparent"
			/>
		</div>

		<button
			type="submit"
			disabled={submitting}
			class="w-full bg-[#c60c30] text-white font-semibold py-3 text-base rounded-lg hover:bg-[#a00828] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
		>
			{submitting ? 'Submitting…' : 'Submit Report'}
		</button>
	</form>
</div>
