<script lang="ts">
	import { isRefreshing, lastRefresh, refresh, REFRESH_INTERVALS } from '$lib/stores';
	import { onMount, onDestroy } from 'svelte';

	interface Props {
		onSettingsClick?: () => void;
	}

	let { onSettingsClick }: Props = $props();

	let currentTime = $state(Date.now());
	let interval: ReturnType<typeof setInterval> | null = null;

	// Update current time every second for countdown
	onMount(() => {
		interval = setInterval(() => {
			currentTime = Date.now();
		}, 1000);
	});

	onDestroy(() => {
		if (interval) clearInterval(interval);
	});

	const lastRefreshText = $derived(
		$lastRefresh
			? `Updated: ${new Date($lastRefresh).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
			: 'Never refreshed'
	);

	// Calculate countdown to next refresh
	const nextRefreshIn = $derived(() => {
		if (!$lastRefresh) return null;
		const autoRefreshInterval = $refresh.autoRefreshInterval || REFRESH_INTERVALS.REALTIME;
		const nextRefreshTime = $lastRefresh + autoRefreshInterval;
		const timeUntilRefresh = nextRefreshTime - currentTime;

		if (timeUntilRefresh <= 0) return null;

		const seconds = Math.ceil(timeUntilRefresh / 1000);
		if (seconds < 60) {
			return `${seconds}s`;
		} else {
			const mins = Math.floor(seconds / 60);
			const secs = seconds % 60;
			return `${mins}:${secs.toString().padStart(2, '0')}`;
		}
	});

	// Format interval time
	const intervalText = $derived(() => {
		const interval = $refresh.autoRefreshInterval || REFRESH_INTERVALS.REALTIME;
		if (interval < 60000) {
			return `${interval / 1000}s`;
		} else {
			const mins = interval / 60000;
			return `${mins}min`;
		}
	});
</script>

<header class="header">
	<div class="header-left">
		<h1 class="logo">SMERSH ARKHAM - Global geopolitical situation monitor</h1>
	</div>

	<div class="header-center">
		<div class="refresh-status">
			{#if $isRefreshing}
				<span class="status-badge refreshing">
					<span class="pulse-dot"></span>
					Refreshing...
				</span>
			{:else}
				<span class="status-text">{lastRefreshText}</span>
				{#if nextRefreshIn()}
					<span class="interval-text">• Next in {nextRefreshIn()}</span>
				{/if}
				<span class="realtime-badge">⚡ Real-time: {intervalText()}</span>
			{/if}
		</div>
	</div>

	<div class="header-right">
		<button class="header-btn settings-btn" onclick={onSettingsClick} title="Settings">
			<span class="btn-icon">⚙</span>
			<span class="btn-label">Settings</span>
		</button>
	</div>
</header>

<style>
	.header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem 1rem;
		background: var(--surface);
		border-bottom: 1px solid var(--border);
		position: sticky;
		top: 0;
		z-index: 100;
		gap: 1rem;
	}

	.header-left {
		display: flex;
		align-items: baseline;
		flex-shrink: 0;
	}

	.logo {
		font-size: 0.9rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		color: var(--text-primary);
		margin: 0;
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
	}

	.header-center {
		display: flex;
		align-items: center;
		flex: 1;
		justify-content: center;
		min-width: 0;
	}

	.refresh-status {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
		justify-content: center;
	}

	.status-text {
		font-size: 0.6rem;
		color: var(--text-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.interval-text {
		font-size: 0.6rem;
		color: var(--text-muted);
		white-space: nowrap;
	}

	.status-badge {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.2rem 0.5rem;
		background: rgba(59, 130, 246, 0.1);
		border: 1px solid rgba(59, 130, 246, 0.3);
		border-radius: 12px;
		font-size: 0.6rem;
		font-weight: 600;
		color: #3b82f6;
	}

	.status-badge.refreshing {
		animation: pulse 2s ease-in-out infinite;
	}

	.pulse-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #3b82f6;
		animation: pulse-dot 1.5s ease-in-out infinite;
	}

	.realtime-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.2rem;
		padding: 0.15rem 0.4rem;
		background: rgba(16, 185, 129, 0.1);
		border: 1px solid rgba(16, 185, 129, 0.3);
		border-radius: 10px;
		font-size: 0.55rem;
		font-weight: 600;
		color: #10b981;
		white-space: nowrap;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.7;
		}
	}

	@keyframes pulse-dot {
		0%,
		100% {
			transform: scale(1);
			opacity: 1;
		}
		50% {
			transform: scale(1.2);
			opacity: 0.6;
		}
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-shrink: 0;
	}

	.header-btn {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		min-height: 2.75rem;
		padding: 0.4rem 0.75rem;
		background: transparent;
		border: 1px solid var(--border);
		border-radius: 4px;
		color: var(--text-secondary);
		cursor: pointer;
		transition: all 0.15s ease;
		font-size: 0.65rem;
	}

	.header-btn:hover {
		background: var(--border);
		color: var(--text-primary);
	}

	.btn-icon {
		font-size: 0.8rem;
	}

	.btn-label {
		display: none;
	}

	@media (min-width: 768px) {
		.btn-label {
			display: inline;
		}
	}

	@media (max-width: 640px) {
		.interval-text {
			display: none;
		}
		.realtime-badge {
			font-size: 0.5rem;
			padding: 0.1rem 0.3rem;
		}
	}
</style>
