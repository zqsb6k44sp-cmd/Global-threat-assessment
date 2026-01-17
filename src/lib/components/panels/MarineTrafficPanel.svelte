<script lang="ts">
	import { Panel } from '$lib/components/common';

	interface Props {
		loading?: boolean;
		error?: string | null;
	}

	let { loading = false, error = null }: Props = $props();
</script>

<Panel id="marinetraffic" title="Marine Traffic" {loading} {error}>
	<div class="marine-traffic-container">
		<iframe
			src="https://www.marinetraffic.com/en/ais/home/centerx:24.4/centery:30.7/zoom:3"
			title="Marine Traffic Interactive Map"
			class="marine-traffic-iframe"
			sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
			loading="lazy"
		></iframe>
	</div>
</Panel>

<style>
	.marine-traffic-container {
		position: relative;
		width: 100%;
		aspect-ratio: 2 / 1;
		background: #0a0f0d;
		border-radius: 4px;
		overflow: hidden;
	}

	.marine-traffic-iframe {
		width: 100%;
		height: 100%;
		border: none;
		display: block;
	}

	@media (max-width: 768px) {
		.marine-traffic-container {
			aspect-ratio: 1 / 1;
		}
	}
</style>
