<script lang="ts">
	import { Panel } from '$lib/components/common';

	interface Props {
		loading?: boolean;
		error?: string | null;
	}

	let { loading = false, error = null }: Props = $props();
</script>

<Panel id="nse50" title="NSE India Nifty 50 Tracker" {loading} {error}>
	<div class="nse-nifty50-container">
		<iframe
			src="https://www.nseindia.com/index-tracker/NIFTY%2050"
			title="NSE India Nifty 50 Tracker"
			class="nse-nifty50-iframe"
			sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
			loading="lazy"
		></iframe>
	</div>
</Panel>

<style>
	.nse-nifty50-container {
		position: relative;
		width: 100%;
		aspect-ratio: 2 / 1;
		background: #0a0f0d;
		border-radius: 4px;
		overflow: hidden;
	}

	.nse-nifty50-iframe {
		width: 100%;
		height: 100%;
		border: none;
		display: block;
	}

	@media (max-width: 768px) {
		.nse-nifty50-container {
			aspect-ratio: 1 / 1;
		}
	}
</style>
