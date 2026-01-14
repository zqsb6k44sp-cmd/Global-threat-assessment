<script lang="ts">
	import { Panel } from '$lib/components/common';
	import { bloomberg } from '$lib/stores';
	import { formatTimeSince } from '$lib/utils';

	const items = $derived($bloomberg.items);
	const loading = $derived($bloomberg.loading);
	const error = $derived($bloomberg.error);
	const lastUpdated = $derived($bloomberg.lastUpdated);

	const lastUpdateText = $derived(formatTimeSince(lastUpdated));

	// Format relative time for news items
	function formatRelativeTime(timestamp: number): string {
		const now = Date.now();
		const diff = now - timestamp;
		const seconds = Math.floor(diff / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);
		const days = Math.floor(hours / 24);

		if (days > 0) return `${days}d ago`;
		if (hours > 0) return `${hours}h ago`;
		if (minutes > 0) return `${minutes}m ago`;
		return 'Just now';
	}
</script>

<Panel
	id="bloomberg"
	title="Bloomberg Live Feed"
	count={items.length}
	{loading}
	{error}
	status={lastUpdateText}
>
	{#if items.length === 0 && !loading && !error}
		<div class="empty-state">No Bloomberg feed data available</div>
	{:else}
		<div class="feed-list">
			{#each items as item (item.id)}
				<a href={item.link} target="_blank" rel="noopener noreferrer" class="feed-item">
					<div class="feed-header">
						<span class="feed-source">{item.source}</span>
						<span class="feed-time">{formatRelativeTime(item.timestamp)}</span>
					</div>
					<h4 class="feed-title">{item.title}</h4>
					{#if item.description}
						<p class="feed-description">{item.description}</p>
					{/if}
				</a>
			{/each}
		</div>
	{/if}
</Panel>

<style>
	.empty-state {
		text-align: center;
		color: var(--text-secondary);
		font-size: 0.7rem;
		padding: 1rem;
	}

	.feed-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.feed-item {
		display: block;
		padding: 0.75rem;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid var(--border);
		border-radius: 4px;
		text-decoration: none;
		color: inherit;
		transition: all 0.2s ease;
	}

	.feed-item:hover {
		background: rgba(255, 255, 255, 0.06);
		border-color: var(--accent);
		transform: translateX(2px);
	}

	.feed-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.4rem;
		gap: 0.5rem;
	}

	.feed-source {
		font-size: 0.6rem;
		font-weight: 600;
		text-transform: uppercase;
		color: var(--accent);
		letter-spacing: 0.05em;
	}

	.feed-time {
		font-size: 0.55rem;
		color: var(--text-secondary);
		white-space: nowrap;
	}

	.feed-title {
		font-size: 0.75rem;
		font-weight: 600;
		line-height: 1.4;
		margin: 0 0 0.4rem 0;
		color: var(--text-primary);
	}

	.feed-description {
		font-size: 0.65rem;
		line-height: 1.5;
		color: var(--text-secondary);
		margin: 0;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	@media (max-width: 768px) {
		.feed-item {
			padding: 0.6rem;
		}

		.feed-title {
			font-size: 0.7rem;
		}

		.feed-description {
			font-size: 0.6rem;
			-webkit-line-clamp: 1;
		}
	}
</style>
