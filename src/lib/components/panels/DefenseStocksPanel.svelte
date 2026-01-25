<script lang="ts">
	import { Panel } from '$lib/components/common';
	import { defense } from '$lib/stores';
	import { formatCurrency, formatPercentChange, getChangeClass } from '$lib/utils';

	const items = $derived($defense.items);
	const loading = $derived($defense.loading);
	const error = $derived($defense.error);
	const count = $derived(items.length);
</script>

<Panel id="defense" title="Defense Stocks" {count} {loading} {error}>
	{#if items.length === 0 && !loading && !error}
		<div class="empty-state">No defense stocks data available</div>
	{:else}
		<div class="defense-list">
			{#each items as stock (stock.symbol)}
				{@const changeClass = getChangeClass(stock.changePercent)}
				<div class="defense-item">
					<div class="defense-logo">
						<img
							src={stock.logoUrl}
							alt={stock.name}
							loading="lazy"
							onerror="this.onerror=null; this.src='https://ui-avatars.com/api/?name={stock.symbol.charAt(
								0
							)}&size=60&background=random&color=fff';"
						/>
					</div>
					<div class="defense-content">
						<div class="defense-header">
							<div class="defense-info">
								<div class="defense-name">{stock.name}</div>
								<div class="defense-symbol">{stock.symbol}</div>
							</div>
							<div class="defense-data">
								<div class="defense-price">{formatCurrency(stock.price)}</div>
								<div class="defense-change {changeClass}">
									{formatPercentChange(stock.changePercent)}
								</div>
							</div>
						</div>
						<div class="defense-description">{stock.description}</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</Panel>

<style>
	.defense-list {
		display: flex;
		flex-direction: column;
		max-height: 500px;
		overflow-y: auto;
	}

	.defense-item {
		display: flex;
		gap: 0.75rem;
		padding: 0.75rem 0;
		border-bottom: 1px solid var(--border);
	}

	.defense-item:last-child {
		border-bottom: none;
	}

	.defense-logo {
		width: 48px;
		height: 48px;
		border-radius: 8px;
		overflow: hidden;
		background: rgba(255, 255, 255, 0.05);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.defense-logo img {
		width: 100%;
		height: 100%;
		object-fit: contain;
		padding: 4px;
	}

	.defense-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		min-width: 0;
	}

	.defense-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 0.5rem;
	}

	.defense-info {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		flex: 1;
		min-width: 0;
	}

	.defense-name {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.defense-symbol {
		font-size: 0.6rem;
		color: var(--text-muted);
		font-family: monospace;
	}

	.defense-data {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.1rem;
	}

	.defense-price {
		font-size: 0.7rem;
		font-weight: 600;
		color: var(--text-primary);
		font-variant-numeric: tabular-nums;
	}

	.defense-change {
		font-size: 0.6rem;
		font-weight: 500;
		font-variant-numeric: tabular-nums;
	}

	.defense-change.up {
		color: var(--success);
	}

	.defense-change.down {
		color: var(--danger);
	}

	.defense-description {
		font-size: 0.65rem;
		color: var(--text-secondary);
		line-height: 1.3;
	}

	.empty-state {
		text-align: center;
		color: var(--text-secondary);
		font-size: 0.7rem;
		padding: 1rem;
	}

	/* Custom scrollbar for defense list */
	.defense-list::-webkit-scrollbar {
		width: 6px;
	}

	.defense-list::-webkit-scrollbar-track {
		background: var(--border);
		border-radius: 3px;
	}

	.defense-list::-webkit-scrollbar-thumb {
		background: var(--text-muted);
		border-radius: 3px;
	}

	.defense-list::-webkit-scrollbar-thumb:hover {
		background: var(--text-secondary);
	}

	@media (max-width: 768px) {
		.defense-logo {
			width: 40px;
			height: 40px;
		}

		.defense-name {
			font-size: 0.7rem;
		}

		.defense-description {
			font-size: 0.6rem;
		}
	}
</style>
