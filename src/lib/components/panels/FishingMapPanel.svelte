<script lang="ts">
	import { onMount } from 'svelte';
	import { Panel } from '$lib/components/common';
	import { fetchFishingVessels } from '$lib/services/fishing';
	import type { FishingVessel } from '$lib/types/fishing';

	interface Props {
		loading?: boolean;
		error?: string | null;
	}

	let { loading = false, error = null }: Props = $props();

	let mapContainer: HTMLDivElement;
	// D3 objects
	/* eslint-disable @typescript-eslint/no-explicit-any */
	let d3Module: typeof import('d3') | null = null;
	let svg: any = null;
	let mapGroup: any = null;
	let projection: any = null;
	let path: any = null;
	let zoom: any = null;
	/* eslint-enable @typescript-eslint/no-explicit-any */

	const WIDTH = 800;
	const HEIGHT = 400;

	// Fishing vessels state
	let fishingVessels = $state<FishingVessel[]>([]);
	let loadingVessels = $state(false);

	// Tooltip state
	let tooltipContent = $state<{
		title: string;
		color: string;
		lines: string[];
	} | null>(null);
	let tooltipPosition = $state({ left: 0, top: 0 });
	let tooltipVisible = $state(false);

	// Tooltip functions
	function showTooltip(
		event: MouseEvent,
		title: string,
		color: string,
		lines: string[] = []
	): void {
		if (!mapContainer) return;
		const rect = mapContainer.getBoundingClientRect();
		tooltipContent = { title, color, lines };
		tooltipPosition = {
			left: event.clientX - rect.left + 15,
			top: event.clientY - rect.top - 10
		};
		tooltipVisible = true;
	}

	function moveTooltip(event: MouseEvent): void {
		if (!mapContainer) return;
		const rect = mapContainer.getBoundingClientRect();
		tooltipPosition = {
			left: event.clientX - rect.left + 15,
			top: event.clientY - rect.top - 10
		};
	}

	function hideTooltip(): void {
		tooltipVisible = false;
		tooltipContent = null;
	}

	// Load fishing vessels
	async function loadFishingVessels(): Promise<void> {
		if (loadingVessels) return;
		loadingVessels = true;
		try {
			fishingVessels = await fetchFishingVessels();
			drawFishingVessels();
		} catch (err) {
			console.error('Failed to load fishing vessels:', err);
		} finally {
			loadingVessels = false;
		}
	}

	// Initialize map
	async function initMap(): Promise<void> {
		const d3 = await import('d3');
		d3Module = d3;
		const topojson = await import('topojson-client');

		const svgEl = mapContainer.querySelector('svg');
		if (!svgEl) return;

		svg = d3.select(svgEl);
		svg.attr('viewBox', `0 0 ${WIDTH} ${HEIGHT}`);

		mapGroup = svg.append('g').attr('id', 'fishingMapGroup');

		// Setup zoom
		zoom = d3
			.zoom<SVGSVGElement, unknown>()
			.scaleExtent([1, 6])
			.filter((event) => {
				if (event.type === 'wheel') return false;
				if (event.type.startsWith('touch')) return true;
				if (event.type === 'mousedown' || event.type === 'mousemove') return true;
				if (event.type === 'dblclick') return false;
				return true;
			})
			.on('zoom', (event) => {
				mapGroup.attr('transform', event.transform.toString());
			});

		svg.call(zoom);

		// Setup projection
		projection = d3
			.geoEquirectangular()
			.scale(130)
			.center([0, 20])
			.translate([WIDTH / 2, HEIGHT / 2 - 30]);

		path = d3.geoPath().projection(projection);

		// Load world data
		try {
			const response = await fetch(
				'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'
			);
			const world = await response.json();
			const countries = topojson.feature(
				world,
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				world.objects.countries as any
			) as unknown as GeoJSON.FeatureCollection;

			// Draw countries (ocean-themed colors)
			mapGroup
				.selectAll('path.country')
				.data(countries.features)
				.enter()
				.append('path')
				.attr('class', 'country')
				.attr('d', path as unknown as string)
				.attr('fill', '#0a1f1f')
				.attr('stroke', '#1a3f3f')
				.attr('stroke-width', 0.5);

			// Draw graticule
			const graticule = d3.geoGraticule().step([30, 30]);
			mapGroup
				.append('path')
				.datum(graticule)
				.attr('d', path as unknown as string)
				.attr('fill', 'none')
				.attr('stroke', '#1a3f3f')
				.attr('stroke-width', 0.3)
				.attr('stroke-dasharray', '2,2');

			// Load fishing vessels
			await loadFishingVessels();
		} catch (err) {
			console.error('Failed to load map data:', err);
		}
	}

	// Draw fishing vessels
	function drawFishingVessels(): void {
		if (!mapGroup || !projection) return;

		// Remove existing vessel markers
		mapGroup.selectAll('.fishing-vessel').remove();

		fishingVessels.forEach((vessel) => {
			const [x, y] = projection([vessel.lon, vessel.lat]) || [0, 0];
			if (x && y) {
				// Vessel marker (fish-shaped icon represented as ellipse with tail)
				const color = getVesselColor(vessel.fishingType);

				// Main vessel body
				mapGroup
					.append('circle')
					.attr('class', 'fishing-vessel')
					.attr('cx', x)
					.attr('cy', y)
					.attr('r', 4)
					.attr('fill', color)
					.attr('stroke', '#ff8c00')
					.attr('stroke-width', 1)
					.attr('opacity', 0.9);

				// Label
				mapGroup
					.append('text')
					.attr('class', 'fishing-vessel')
					.attr('x', x + 6)
					.attr('y', y + 3)
					.attr('fill', color)
					.attr('font-size', '7px')
					.attr('font-family', 'monospace')
					.text(vessel.name.substring(0, 12));

				// Hit area for tooltip
				mapGroup
					.append('circle')
					.attr('class', 'fishing-vessel')
					.attr('cx', x)
					.attr('cy', y)
					.attr('r', 10)
					.attr('fill', 'transparent')
					.attr('cursor', 'pointer')
					.on('mouseenter', (event: MouseEvent) => {
						const lines = [
							`Flag: ${vessel.flag}`,
							`Type: ${vessel.fishingType || 'Unknown'}`,
							`Speed: ${vessel.speed} knots`,
							`Course: ${vessel.course}°`,
							vessel.catchData?.species ? `Species: ${vessel.catchData.species.join(', ')}` : '',
							vessel.catchData?.zone ? `Zone: ${vessel.catchData.zone}` : ''
						].filter(Boolean);
						showTooltip(event, `🐟 ${vessel.name}`, color, lines);
					})
					.on('mousemove', moveTooltip)
					.on('mouseleave', hideTooltip);
			}
		});
	}

	// Get vessel color based on fishing type
	function getVesselColor(fishingType?: string): string {
		switch (fishingType) {
			case 'trawling':
				return '#FFB347'; // Orange
			case 'longlining':
				return '#FFEA00'; // Yellow
			case 'purse_seining':
				return '#FF6B35'; // Coral
			case 'gillnetting':
				return '#FFA500'; // Dark orange
			default:
				return '#FFD700'; // Gold
		}
	}

	// Zoom controls
	function zoomIn(): void {
		if (!svg || !zoom) return;
		svg.transition().duration(300).call(zoom.scaleBy, 1.5);
	}

	function zoomOut(): void {
		if (!svg || !zoom) return;
		svg
			.transition()
			.duration(300)
			.call(zoom.scaleBy, 1 / 1.5);
	}

	function resetZoom(): void {
		if (!svg || !zoom || !d3Module) return;
		svg.transition().duration(300).call(zoom.transform, d3Module.zoomIdentity);
	}

	onMount(() => {
		initMap();
	});
</script>

<Panel id="fishing" title="Deep Sea Fishing Traffic" {loading} {error}>
	<div class="map-container" bind:this={mapContainer}>
		<svg class="map-svg"></svg>
		{#if tooltipVisible && tooltipContent}
			<div
				class="map-tooltip"
				style="left: {tooltipPosition.left}px; top: {tooltipPosition.top}px;"
			>
				<strong style="color: {tooltipContent.color}">{tooltipContent.title}</strong>
				{#each tooltipContent.lines as line}
					<br /><span class="tooltip-line">{line}</span>
				{/each}
			</div>
		{/if}
		<div class="zoom-controls">
			<button class="zoom-btn" onclick={zoomIn} title="Zoom in">+</button>
			<button class="zoom-btn" onclick={zoomOut} title="Zoom out">−</button>
			<button class="zoom-btn" onclick={resetZoom} title="Reset">⟲</button>
		</div>
		<div class="fishing-info">
			<div class="info-item">
				<span class="info-dot trawling"></span> Trawling
			</div>
			<div class="info-item">
				<span class="info-dot longlining"></span> Longlining
			</div>
			<div class="info-item">
				<span class="info-dot seining"></span> Seining
			</div>
			<div class="info-item">
				<span class="info-dot gillnetting"></span> Gillnetting
			</div>
		</div>
		{#if loadingVessels}
			<div class="loading-indicator">Loading vessels...</div>
		{/if}
	</div>
</Panel>

<style>
	.map-container {
		position: relative;
		width: 100%;
		aspect-ratio: 2 / 1;
		background: #0a1515;
		border-radius: 4px;
		overflow: hidden;
	}

	.map-svg {
		width: 100%;
		height: 100%;
	}

	.map-tooltip {
		position: absolute;
		background: rgba(10, 10, 10, 0.95);
		border: 1px solid #333;
		border-radius: 4px;
		padding: 0.5rem;
		font-size: 0.65rem;
		color: #ddd;
		max-width: 250px;
		pointer-events: none;
		z-index: 100;
	}

	.tooltip-line {
		opacity: 0.7;
	}

	.zoom-controls {
		position: absolute;
		bottom: 0.5rem;
		right: 0.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.zoom-btn {
		width: 2.75rem;
		height: 2.75rem;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(20, 20, 20, 0.9);
		border: 1px solid #333;
		border-radius: 4px;
		color: #aaa;
		font-size: 1rem;
		cursor: pointer;
	}

	.zoom-btn:hover {
		background: rgba(40, 40, 40, 0.9);
		color: #fff;
	}

	.fishing-info {
		position: absolute;
		top: 0.5rem;
		right: 0.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		background: rgba(10, 10, 10, 0.8);
		padding: 0.3rem 0.5rem;
		border-radius: 4px;
		font-size: 0.55rem;
	}

	.info-item {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		color: #888;
	}

	.info-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
	}

	.info-dot.trawling {
		background: #ffb347;
	}

	.info-dot.longlining {
		background: #ffea00;
	}

	.info-dot.seining {
		background: #ff6b35;
	}

	.info-dot.gillnetting {
		background: #ffa500;
	}

	.loading-indicator {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		background: rgba(10, 10, 10, 0.9);
		padding: 1rem 2rem;
		border-radius: 4px;
		color: #aaa;
		font-size: 0.875rem;
	}

	@media (max-width: 768px) {
		.zoom-controls {
			display: flex;
		}
	}
</style>
