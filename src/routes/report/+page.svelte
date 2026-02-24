<script lang="ts">
	import { submitReport } from '$lib/api';
	import { Line } from '$lib/types';
	import type { SubmitReportRequest } from '$lib/types';
	import { LINE_DISPLAY_NAMES } from '$lib/constants';

	const lines = Object.values(Line);

	let line = $state<Line | ''>('');
	let destination = $state('');
	let nextStop = $state('');
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
		if (!destination.trim()) {
			validationError = 'Destination is required.';
			return false;
		}
		if (!nextStop.trim()) {
			validationError = 'Next stop is required.';
			return false;
		}
		if (!carNumber.trim()) {
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
			destination: destination.trim(),
			nextStop: nextStop.trim(),
			carNumber: carNumber.trim(),
			...(runNumber.trim() ? { runNumber: runNumber.trim() } : {})
		};

		try {
			const res = await submitReport(req);
			successId = res.reportId;
			line = '';
			destination = '';
			nextStop = '';
			carNumber = '';
			runNumber = '';
		} catch (e_) {
			error = e_ instanceof Error ? e_.message : 'Failed to submit report.';
		} finally {
			submitting = false;
		}
	}
</script>

<svelte:head>
	<title>CTA Smokers — Report a Smoker</title>
</svelte:head>

<div class="max-w-lg mx-auto">
	<h1 class="text-2xl font-bold text-gray-900 mb-6">Report a Smoker</h1>

	{#if successId}
		<div class="bg-green-50 border border-green-200 text-green-800 rounded-xl p-5 mb-6">
			<p class="font-semibold text-lg">Report submitted!</p>
			<p class="text-sm mt-1">Report ID: <code class="font-mono bg-green-100 px-1 rounded">{successId}</code></p>
			<button
				onclick={() => { successId = null; }}
				class="mt-3 text-sm text-green-700 underline hover:no-underline"
			>
				Submit another report
			</button>
		</div>
	{/if}

	<form onsubmit={handleSubmit} class="bg-white rounded-xl shadow p-6 space-y-5" novalidate>
		{#if validationError}
			<p class="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{validationError}</p>
		{/if}
		{#if error}
			<p class="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
		{/if}

		<div>
			<label for="line" class="block text-sm font-medium text-gray-700 mb-1">Train Line <span class="text-red-500">*</span></label>
			<select
				id="line"
				bind:value={line}
				required
				class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c60c30] focus:border-transparent"
			>
				<option value="">Select a line…</option>
				{#each lines as l}
					<option value={l}>{LINE_DISPLAY_NAMES[l]}</option>
				{/each}
			</select>
		</div>

		<div>
			<label for="destination" class="block text-sm font-medium text-gray-700 mb-1">Destination <span class="text-red-500">*</span></label>
			<input
				id="destination"
				type="text"
				bind:value={destination}
				placeholder="e.g. O'Hare"
				required
				class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c60c30] focus:border-transparent"
			/>
		</div>

		<div>
			<label for="nextStop" class="block text-sm font-medium text-gray-700 mb-1">Next Stop <span class="text-red-500">*</span></label>
			<input
				id="nextStop"
				type="text"
				bind:value={nextStop}
				placeholder="e.g. Jackson"
				required
				class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c60c30] focus:border-transparent"
			/>
		</div>

		<div>
			<label for="carNumber" class="block text-sm font-medium text-gray-700 mb-1">Car Number <span class="text-red-500">*</span></label>
			<input
				id="carNumber"
				type="text"
				bind:value={carNumber}
				placeholder="e.g. 5432"
				required
				class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c60c30] focus:border-transparent"
			/>
		</div>

		<div>
			<label for="runNumber" class="block text-sm font-medium text-gray-700 mb-1">Run Number <span class="text-gray-400 font-normal">(optional)</span></label>
			<input
				id="runNumber"
				type="text"
				bind:value={runNumber}
				placeholder="e.g. 101"
				class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c60c30] focus:border-transparent"
			/>
		</div>

		<button
			type="submit"
			disabled={submitting}
			class="w-full bg-[#c60c30] text-white font-semibold py-2.5 rounded-lg hover:bg-[#a00828] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
		>
			{submitting ? 'Submitting…' : 'Submit Report'}
		</button>
	</form>
</div>
