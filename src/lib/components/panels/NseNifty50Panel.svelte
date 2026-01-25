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
		widget: new (config: Record<string, unknown>) => void;
	}

	interface WindowWithTradingView extends Window {
		TradingView?: TradingViewWidget;
	}

	onMount(() => {
		// Load TradingView script dynamically
		const script = document.createElement('script');
		script.src = 'https://s3.tradingview.com/tv.js';
		script.async = true;
		script.onload = () => {
			initWidget();
		};
		script.onerror = () => {
			widgetError = 'Failed to load TradingView widget';
		};
		document.head.appendChild(script);

		return () => {
			// Cleanup: remove script on component unmount
			if (script.parentNode) {
				script.parentNode.removeChild(script);
			}
		};
	});

	function initWidget() {
		const win = window as WindowWithTradingView;
		if (typeof win.TradingView !== 'undefined' && widgetContainer) {
			try {
				new win.TradingView.widget({
					autosize: true,
					symbol: 'NSE:NIFTY',
					interval: 'D',
					timezone: 'Asia/Kolkata',
					theme: 'dark',
					style: '1',
					locale: 'en',
					toolbar_bg: '#0a0f0d',
					enable_publishing: false,
					hide_top_toolbar: false,
					hide_legend: false,
					save_image: false,
					container_id: 'tradingview_nifty50'
				});
				widgetLoaded = true;
			} catch (e) {
				widgetError = 'Failed to initialize TradingView widget';
				console.error('TradingView widget error:', e);
			}
		}
	}
</script>

<Panel id="nse50" title="NSE India Nifty 50 Tracker" {loading} error={error || widgetError}>
	<div class="tradingview-widget-container" bind:this={widgetContainer}>
		<div class="tradingview-widget" id="tradingview_nifty50"></div>
		{#if !widgetLoaded && !widgetError}
			<div class="loading-state">Loading chart...</div>
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

	.tradingview-widget {
		width: 100%;
		height: 100%;
		min-height: 400px;
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
		.tradingview-widget {
			min-height: 350px;
		}
	}
</style>
