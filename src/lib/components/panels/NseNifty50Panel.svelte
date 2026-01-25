<script lang="ts">
	import { onMount } from 'svelte';
	import { Panel } from '$lib/components/common';

	interface Props {
		loading?: boolean;
		error?: string | null;
	}

	let { loading = false, error = null }: Props = $props();
	let widgetContainer: HTMLDivElement;
	let widgetLoaded = $state(false);
	let widgetError = $state<string | null>(null);

	// Type declaration for TradingView
	interface TradingViewWidget {
		MediumSizeWidget: new (config: Record<string, unknown>) => void;
	}

	interface WindowWithTradingView extends Window {
		TradingView?: TradingViewWidget;
	}

	onMount(() => {
		// Load TradingView script dynamically
		const script = document.createElement('script');
		script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-stock-heatmap.js';
		script.async = true;
		script.type = 'text/javascript';
		script.innerHTML = JSON.stringify({
			dataSource: 'AllIN',
			exchanges: [],
			grouping: 'sector',
			blockSize: 'market_cap_basic',
			blockColor: 'change',
			locale: 'en',
			symbolUrl: '',
			colorTheme: 'dark',
			hasTopBar: false,
			isDataSetEnabled: false,
			isZoomEnabled: true,
			hasSymbolTooltip: true,
			width: '100%',
			height: '100%'
		});

		if (widgetContainer) {
			widgetContainer.appendChild(script);
		}

		script.onload = () => {
			widgetLoaded = true;
		};

		script.onerror = () => {
			widgetError = 'Failed to load TradingView heatmap widget';
		};

		return () => {
			// Cleanup: remove script on component unmount
			if (script.parentNode) {
				script.parentNode.removeChild(script);
			}
		};
	});
</script>

<Panel id="nse50" title="India Market Heatmap" {loading} error={error || widgetError}>
	<div class="tradingview-widget-container" bind:this={widgetContainer}>
		<div class="tradingview-widget-container__widget"></div>
		{#if !widgetLoaded && !widgetError}
			<div class="loading-state">Loading heatmap...</div>
		{/if}
	</div>
</Panel>

<style>
	.tradingview-widget-container {
		position: relative;
		width: 100%;
		height: 100%;
		background: #0a0f0d;
		border-radius: 4px;
		overflow: hidden;
	}

	.tradingview-widget-container__widget {
		width: 100%;
		height: 100%;
		min-height: 500px;
	}

	.loading-state {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		color: var(--text-secondary);
		font-size: 0.875rem;
	}

	@media (max-width: 768px) {
		.tradingview-widget-container__widget {
			min-height: 400px;
		}
	}
</style>