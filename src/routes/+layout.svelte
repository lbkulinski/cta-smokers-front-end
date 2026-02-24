<script lang="ts">
	import '../app.css';

	let { children } = $props();
</script>

<div class="min-h-screen bg-gray-50 flex flex-col">
	<nav class="bg-[#c60c30] text-white shadow-md">
		<div class="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
			<a href="/" class="text-xl font-bold tracking-tight hover:opacity-90">CTA Smokers</a>
			<div class="flex gap-6 text-sm font-medium">
				<a href="/" class="hover:underline hover:opacity-90">Home</a>
				<a href="/report" class="hover:underline hover:opacity-90">Report a Smoker</a>
			</div>
		</div>
	</nav>

	<main class="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
		{@render children()}
	</main>
</div>
