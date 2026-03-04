<script lang="ts">
	import { onMount } from 'svelte';
	import '../app.css';

	let { children } = $props();

	onMount(() => {
		document.body.style.visibility = 'visible';
	});
</script>

<div class="min-h-dvh bg-[#0d0d0d] flex flex-col">
	<nav class="bg-[#111111] border-b border-[#c60c30] shadow-lg" aria-label="Main navigation">
		<div class="max-w-4xl mx-auto px-4 py-3">
			<div class="flex items-center justify-between">
				<a href="/" class="text-xl font-bold tracking-tight text-[#c60c30] hover:text-[#e8102e] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2 rounded-sm">CTA Smokers</a>
				<div class="hidden sm:flex gap-6 text-sm font-medium text-[#aaaaaa]">
					<a href="/" class="hover:text-white transition-colors focus-visible:text-white focus-visible:underline">Home</a>
					<a href="/report" class="hover:text-white transition-colors focus-visible:text-white focus-visible:underline">Report a Smoker</a>
					<a href="mailto:admin@ctasmokers.com" class="hover:text-white transition-colors focus-visible:text-white focus-visible:underline">Contact</a>
				</div>
			</div>
			<div class="flex sm:hidden gap-4 mt-2 text-xs font-medium text-[#aaaaaa] flex-wrap">
				<a href="/" class="hover:text-white transition-colors focus-visible:text-white focus-visible:underline">Home</a>
				<a href="/report" class="hover:text-white transition-colors focus-visible:text-white focus-visible:underline">Report a Smoker</a>
				<a href="mailto:admin@ctasmokers.com" class="hover:text-white transition-colors focus-visible:text-white focus-visible:underline">Contact</a>
			</div>
		</div>
	</nav>

	<main class="flex-1 max-w-4xl mx-auto w-full px-3 sm:px-4 py-4 sm:py-6">
		{@render children()}
	</main>

	<footer class="bg-[#111111] border-t border-[#222222] mt-auto">
		<div class="max-w-4xl mx-auto px-4 py-3 flex gap-6 text-xs font-medium text-[#888888]">
			<a href="https://cta4j.com" target="_blank" rel="noopener noreferrer" class="hover:text-[#cccccc] transition-colors focus-visible:text-[#cccccc] focus-visible:underline">cta4j.com</a>
			<a href="https://github.com/lbkulinski/cta-smokers-api" target="_blank" rel="noopener noreferrer" class="hover:text-[#cccccc] transition-colors focus-visible:text-[#cccccc] focus-visible:underline">API</a>
			<a href="https://buymeacoffee.com/cta4j" target="_blank" rel="noopener noreferrer" class="hover:text-[#cccccc] transition-colors focus-visible:text-[#cccccc] focus-visible:underline">Buy Me a Coffee</a>
		</div>
	</footer>
</div>
