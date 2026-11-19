<script lang="ts">
	import { onMount } from 'svelte';
	import { RIDE_SAFE } from '$lib/constants';

	let { variant }: { variant: 'banner' | 'success' } = $props();

	let mounted = $state(false);
	let dismissed = $state(false);

	// Banner renders only after mount so people who dismissed it never see a flash
	// (the home page is prerendered).
	let visible = $derived(variant === 'success' || (mounted && !dismissed));

	onMount(() => {
		if (variant === 'banner') {
			try {
				dismissed = localStorage.getItem(RIDE_SAFE.dismissKey) === '1';
			} catch {
				// Storage unavailable: show the banner.
			}
		}
		mounted = true;
	});

	function dismiss() {
		dismissed = true;
		try {
			localStorage.setItem(RIDE_SAFE.dismissKey, '1');
		} catch {
			// Storage unavailable: hidden for this view only.
		}
	}

	const focus =
		'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#c60c30] focus-visible:outline-offset-2 rounded-sm';
	const linkClass = `inline-flex items-center min-h-[32px] sm:min-h-[28px] text-[#c60c30] underline underline-offset-2 ${focus}`;
	const mailto = (subject: string) =>
		`mailto:${RIDE_SAFE.feedbackEmail}?subject=${encodeURIComponent(subject)}`;
</script>

{#if visible}
	<div
		class="relative bg-[#171717] border border-[#2a2a2a] border-l-4 border-l-[#c60c30] rounded-xl px-3 py-2.5 sm:px-4 sm:py-3 text-[13px] sm:text-sm leading-snug text-[#bbb] {variant === 'banner' ? 'pr-12 mb-3 sm:mb-4' : 'mb-4'}"
	>
		{#if variant === 'banner'}
			<button
				onclick={dismiss}
				aria-label="Dismiss"
				class="absolute top-0 right-0 w-11 h-11 flex items-center justify-center text-[#888] hover:text-white text-xl leading-none rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#c60c30] focus-visible:outline-offset-[-2px]"
			><span aria-hidden="true">×</span></button>
			<p class="font-semibold text-[#e5e5e5] text-sm sm:text-base">NITA has a new rider safety app: Ride Safe.</p>
			<p class="mt-1">Report smoking and other safety concerns by app or text. Your report goes to the right transit team.</p>
		{:else}
			<p class="font-semibold text-[#e5e5e5] text-sm sm:text-base">Transit staff haven't been notified. To alert them, report with NITA Ride Safe.</p>
		{/if}

		<div class="mt-0.5 flex flex-wrap gap-x-5">
			<a href={RIDE_SAFE.url} target="_blank" rel="noopener noreferrer" class={linkClass}>Get the app ↗</a>
			<a href={RIDE_SAFE.textHref} class="whitespace-nowrap {linkClass}">Text {RIDE_SAFE.textNumber}</a>
		</div>

		<div class="mt-1.5 pt-2 border-t border-[#2a2a2a] text-[#999] sm:flex sm:items-center sm:gap-3">
			<p class="text-[13px] sm:text-sm">Would you like this site to stay up?</p>
			<div class="flex flex-wrap gap-x-5">
				<a href={mailto(RIDE_SAFE.keepSubject)} class={linkClass}>Keep it</a>
				<a href={mailto(RIDE_SAFE.shutDownSubject)} class={linkClass}>Fine to shut down</a>
			</div>
		</div>
	</div>
{/if}
