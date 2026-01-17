<script lang="ts">
	import { Panel } from '$lib/components/common';

	interface Props {
		loading?: boolean;
		error?: string | null;
	}

	let { loading = false, error = null }: Props = $props();
</script>

<Panel id="globalfishing" title="Global Fishing Watch" {loading} {error}>
	<div class="fishing-watch-container">
		<iframe
			src="https://globalfishingwatch.org/map/"
			title="Global Fishing Watch Interactive Map"
			class="fishing-watch-iframe"
			sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
			loading="lazy"
		></iframe>
	</div>
</Panel>

<style>
	.fishing-watch-container {
		position: relative;
		width: 100%;
		aspect-ratio: 2 / 1;
		background: #0a0f0d;
		border-radius: 4px;
		overflow: hidden;
	}

	.fishing-watch-iframe {
		width: 100%;
		height: 100%;
		border: none;
		display: block;
	}

	@media (max-width: 768px) {
		.fishing-watch-container {
			aspect-ratio: 1 / 1;
		}
	}
</style>
