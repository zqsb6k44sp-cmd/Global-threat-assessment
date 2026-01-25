<script lang="ts">
	import { Panel } from '$lib/components/common';

	interface Props {
		loading?: boolean;
		error?: string | null;
	}

	let { loading = false, error = null }: Props = $props();
</script>

<Panel id="conflicttracker" title="War Watch" {loading} {error}>
	<div class="conflict-tracker-container">
		<iframe
			src="https://warwatch.ch"
			title="War Watch"
			class="conflict-tracker-iframe"
			sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
			loading="lazy"
		></iframe>
	</div>
</Panel>

<style>
	.conflict-tracker-container {
		position: relative;
		width: 100%;
		aspect-ratio: 2 / 1;
		background: #0a0f0d;
		border-radius: 4px;
		overflow: hidden;
	}

	.conflict-tracker-iframe {
		width: 100%;
		height: 100%;
		border: none;
		display: block;
	}

	@media (max-width: 768px) {
		.conflict-tracker-container {
			aspect-ratio: 1 / 1;
		}
	}
</style>
