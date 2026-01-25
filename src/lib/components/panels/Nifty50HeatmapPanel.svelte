<script lang="ts">
	import { Panel, StockHeatmapCell } from '$lib/components/common';
	import { nifty50 } from '$lib/stores';
	import { formatTimeSince } from '$lib/utils';

	const items = $derived($nifty50.items);
	const loading = $derived($nifty50.loading);
	const error = $derived($nifty50.error);
	const lastUpdated = $derived($nifty50.lastUpdated);

	// Sort stocks by absolute change percentage (most volatile first)
	const sortedItems = $derived(
		[...items].sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
	);

	const lastUpdateText = $derived(formatTimeSince(lastUpdated));
</script>

<Panel id="nifty50" title="Nifty 50 Heatmap" {loading} {error} status={lastUpdateText}>
	{#if items.length === 0 && !loading && !error}
		<div class="empty-state">No Nifty 50 data available</div>
	{:else}
		<div class="heatmap-grid">
			{#each sortedItems as stock (stock.symbol)}
				<StockHeatmapCell {stock} />
			{/each}
		</div>
	{/if}
</Panel>

<style>
	.heatmap-grid {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		gap: 0.25rem;
	}

	.empty-state {
		text-align: center;
		color: var(--text-secondary);
		font-size: 0.7rem;
		padding: 1rem;
	}

	@media (max-width: 768px) {
		.heatmap-grid {
			grid-template-columns: repeat(4, 1fr);
		}
	}

	@media (max-width: 480px) {
		.heatmap-grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}
</style>
