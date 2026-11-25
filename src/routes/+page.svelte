<script lang="ts">
	import { tick } from 'svelte';
	import { Line } from '$lib/types';
	import { LINE_DISPLAY_NAMES, RIDE_SAFE } from '$lib/constants';
	import { getDestinations, getStations } from '$lib/stations';
	import { buildMessage, buildSmsHref } from '$lib/message';
	import { TOTAL_REPORTS } from '$lib/data';

	const lines = Object.values(Line);

	let line = $state<Line | ''>('');
	let destinations = $derived(line ? getDestinations(line as Line) : []);
	let allStations = $derived(line ? getStations(line as Line) : []);

	let destinationId = $state('');
	let nextStationId = $state('');
	let carNumber = $state('');
	let runNumber = $state('');

	let message = $derived(
		buildMessage({
			lineName: line ? LINE_DISPLAY_NAMES[line] : '',
			destinationName: destinations.find((s) => s.id === destinationId)?.name ?? '',
			nextStationName: allStations.find((s) => s.id === nextStationId)?.name ?? '',
			carNumber,
			runNumber
		})
	);

	let copyStatus = $state('');
	let validationError: string | null = $state(null);

	let validationErrorEl: HTMLElement | null = $state(null);

	async function focusAfterUpdate(getEl: () => HTMLElement | null) {
		await tick();
		getEl()?.focus();
	}

	function validate(): boolean {
		if (!line) {
			validationError = 'Please select a train line.';
			focusAfterUpdate(() => validationErrorEl);
			return false;
		}
		if (!destinationId) {
			validationError = 'Destination is required.';
			focusAfterUpdate(() => validationErrorEl);
			return false;
		}
		if (!nextStationId) {
			validationError = 'Next station is required.';
			focusAfterUpdate(() => validationErrorEl);
			return false;
		}
		if (!carNumber) {
			validationError = 'Car number is required.';
			focusAfterUpdate(() => validationErrorEl);
			return false;
		}
		if (carNumber.length !== 4) {
			validationError = 'Car number must be exactly 4 digits.';
			focusAfterUpdate(() => validationErrorEl);
			return false;
		}
		if (runNumber && runNumber.length !== 3) {
			validationError = 'Run number must be exactly 3 digits.';
			focusAfterUpdate(() => validationErrorEl);
			return false;
		}
		validationError = null;
		return true;
	}

	function openText(e: Event) {
		e.preventDefault();
		if (!validate()) return;
		window.location.href = buildSmsHref(message);
	}

	async function copyMessage() {
		copyStatus = '';
		if (!validate()) return;
		try {
			await navigator.clipboard.writeText(message);
			copyStatus = `Copied. Paste it into a text to ${RIDE_SAFE.textNumber}.`;
		} catch {
			copyStatus = "Couldn't copy. Select the message above and copy it.";
		}
	}
</script>

<svelte:head>
	<title>CTA Smokers — Report smoking to Ride Safe</title>
	<meta name="description" content="Draft a text to NITA Ride Safe about smoking on a CTA train, and see the CTA Smokers archive." />
	<link rel="canonical" href="https://ctasmokers.com/" />
	<meta property="og:title" content="CTA Smokers — Report smoking to Ride Safe" />
	<meta property="og:description" content="Draft a text to NITA Ride Safe about smoking on a CTA train, and see the CTA Smokers archive." />
	<meta property="og:url" content="https://ctasmokers.com/" />
	<meta property="og:type" content="website" />
	<meta property="og:image" content="https://ctasmokers.com/og-image.png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:image" content="https://ctasmokers.com/og-image.png" />
</svelte:head>

<div class="max-w-lg mx-auto">
	<h1 class="text-2xl font-bold text-[#e5e5e5] mb-2">Report smoking to NITA Ride Safe</h1>
	<p class="text-sm text-[#bbb] mb-1">CTA Smokers no longer collects reports. This site is not run by NITA or the CTA.</p>
	<p class="text-sm font-semibold text-[#e5e5e5] mb-4"><a href="tel:911" class="inline-flex items-center min-h-[32px] text-[#c60c30] underline underline-offset-2 rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2">Emergency? Call 911.</a></p>

	<form onsubmit={openText} oninput={() => (copyStatus = '')} onchange={() => (copyStatus = '')} class="bg-[#171717] border border-[#2a2a2a] rounded-xl p-4 sm:p-6 space-y-4 sm:space-y-5" novalidate>
		{#if validationError}
			<p
				bind:this={validationErrorEl}
				role="alert"
				tabindex="-1"
				class="text-sm text-[#f87171] bg-[#1a0808] border border-[#5a1010] rounded-lg px-3 py-2 focus:outline-none"
			>{validationError}</p>
		{/if}
		<div>
			<label for="line" class="block text-sm font-medium text-[#aaa] mb-1">Train Line <span class="text-[#c60c30]" aria-hidden="true">*</span><span class="sr-only">(required)</span></label>
			<select
				id="line"
				bind:value={line}
				onchange={() => { destinationId = ''; nextStationId = ''; }}
				required
				aria-required="true"
				class="w-full bg-[#1f1f1f] border border-[#333] text-[#e5e5e5] rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#c60c30] focus:border-transparent"
			>
				<option value="">Select a line…</option>
				{#each lines as l}
					<option value={l}>{LINE_DISPLAY_NAMES[l]}</option>
				{/each}
			</select>
		</div>

		<div>
			<label for="destinationId" class="block text-sm font-medium text-[#aaa] mb-1">Destination <span class="text-[#c60c30]" aria-hidden="true">*</span><span class="sr-only">(required)</span></label>
			<select
				id="destinationId"
				bind:value={destinationId}
				required
				aria-required="true"
				disabled={!line}
				class="w-full bg-[#1f1f1f] border border-[#333] text-[#e5e5e5] rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#c60c30] focus:border-transparent disabled:opacity-40"
			>
				<option value="">{!line ? 'Select a line first…' : 'Select a destination…'}</option>
				{#each destinations as station}
					<option value={station.id}>{station.name}</option>
				{/each}
			</select>
		</div>

		<div>
			<label for="nextStationId" class="block text-sm font-medium text-[#aaa] mb-1">Next Station <span class="text-[#c60c30]" aria-hidden="true">*</span><span class="sr-only">(required)</span></label>
			<select
				id="nextStationId"
				bind:value={nextStationId}
				required
				aria-required="true"
				disabled={!line}
				class="w-full bg-[#1f1f1f] border border-[#333] text-[#e5e5e5] rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#c60c30] focus:border-transparent disabled:opacity-40"
			>
				<option value="">{!line ? 'Select a line first…' : 'Select next station…'}</option>
				{#each allStations as station}
					<option value={station.id}>{station.name}</option>
				{/each}
			</select>
		</div>

		<div>
			<label for="carNumber" class="block text-sm font-medium text-[#aaa] mb-1">Car Number <span class="text-[#c60c30]" aria-hidden="true">*</span><span class="sr-only">(required)</span></label>
			<input
				id="carNumber"
				type="text"
				inputmode="numeric"
				pattern="[0-9]{4}"
				maxlength="4"
				bind:value={carNumber}
				oninput={() => { carNumber = carNumber.replace(/\D/g, ''); }}
				placeholder="e.g. 5432"
				required
				aria-required="true"
				aria-describedby="carNumberHint"
				class="w-full bg-[#1f1f1f] border border-[#333] text-[#e5e5e5] placeholder-[#555] rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#c60c30] focus:border-transparent"
			/>
			<p id="carNumberHint" class="text-xs text-[#888] mt-1">Displayed at both ends of the car's interior and on the exterior beside the sliding exit doors.</p>
		</div>

		<div>
			<label for="runNumber" class="block text-sm font-medium text-[#aaa] mb-1">Run Number <span class="text-[#888] font-normal">(optional)</span></label>
			<input
				id="runNumber"
				type="text"
				inputmode="numeric"
				pattern="[0-9]{3}"
				maxlength="3"
				bind:value={runNumber}
				oninput={() => { runNumber = runNumber.replace(/\D/g, ''); }}
				placeholder="e.g. 101"
				aria-describedby="runNumberHint"
				class="w-full bg-[#1f1f1f] border border-[#333] text-[#e5e5e5] placeholder-[#555] rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#c60c30] focus:border-transparent"
			/>
			<p id="runNumberHint" class="text-xs text-[#888] mt-1">Displayed in the operator's cab window at the front of the train.</p>
		</div>

		<div>
			<p class="text-sm font-medium text-[#aaa] mb-1">Your message</p>
			<p class="min-h-[3rem] select-all break-words bg-[#111111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-[#e5e5e5]">
				{#if message}{message}{:else}<span class="text-[#888]">Select a line to start.</span>{/if}
			</p>
		</div>

		<div class="space-y-2">
			<button
				type="submit"
				class="w-full bg-[#c60c30] text-white font-semibold py-3 text-base rounded-lg hover:bg-[#a00828] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
			>
				Open text to {RIDE_SAFE.textNumber}
			</button>
			<button
				type="button"
				onclick={copyMessage}
				class="w-full bg-[#1f1f1f] border border-[#333] text-[#e5e5e5] font-semibold py-3 text-base rounded-lg hover:bg-[#2a2a2a] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
			>
				Copy message
			</button>
			<p role="status" class="text-sm text-[#e5e5e5] empty:hidden">{copyStatus}</p>
			<p class="text-xs text-[#888]">Nothing is sent until you press send in your messaging app.</p>
		</div>
	</form>

	<p class="mt-4 text-sm"><a href={RIDE_SAFE.url} target="_blank" rel="noopener noreferrer" class="inline-flex items-center min-h-[32px] text-[#c60c30] underline underline-offset-2 rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2">Or get the Ride Safe app ↗</a></p>
	<p class="mt-4 pt-4 border-t border-[#2a2a2a] text-sm text-[#bbb]">
		{TOTAL_REPORTS} reports were submitted here in 2026. <a href="/stats" class="text-[#c60c30] underline underline-offset-2 rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2">See the archive →</a>
	</p>
</div>
