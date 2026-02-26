<script lang="ts">
	import '../app.css';

	let { children } = $props();
</script>

<div class="min-h-screen bg-[#0d0d0d] flex flex-col">
	<nav class="bg-[#111111] border-b border-[#c60c30] shadow-lg">
		<div class="max-w-4xl mx-auto px-4 py-3">
			<div class="flex items-center justify-between">
				<a href="/" class="text-xl font-bold tracking-tight text-[#c60c30] hover:text-[#e8102e] transition-colors">CTA Smokers</a>
				<div class="hidden sm:flex gap-6 text-sm font-medium text-[#aaaaaa]">
					<a href="/" class="hover:text-white transition-colors">Home</a>
					<a href="/report" class="hover:text-white transition-colors">Report a Smoker</a>
					<a href="mailto:admin@ctasmokers.com" class="hover:text-white transition-colors">Contact</a>
					<a href="https://buymeacoffee.com/cta4j" target="_blank" rel="noopener noreferrer" class="hover:text-white transition-colors">Buy Me a Coffee</a>
				</div>
			</div>
			<div class="flex sm:hidden gap-4 mt-2 text-xs font-medium text-[#aaaaaa] flex-wrap">
				<a href="/" class="hover:text-white transition-colors">Home</a>
				<a href="/report" class="hover:text-white transition-colors">Report a Smoker</a>
				<a href="mailto:admin@ctasmokers.com" class="hover:text-white transition-colors">Contact</a>
				<a href="https://buymeacoffee.com/cta4j" target="_blank" rel="noopener noreferrer" class="hover:text-white transition-colors">Buy Me a Coffee</a>
			</div>
		</div>
	</nav>

	<main class="flex-1 max-w-4xl mx-auto w-full px-3 sm:px-4 py-4 sm:py-6">
		{@render children()}
	</main>
</div>
