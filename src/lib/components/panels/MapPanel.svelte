<script lang="ts">
	import { onMount } from 'svelte';
	import { Panel } from '$lib/components/common';
	import {
		HOTSPOTS,
		CONFLICT_ZONES,
		CHOKEPOINTS,
		CABLE_LANDINGS,
		NUCLEAR_SITES,
		MILITARY_BASES,
		OCEANS,
		SANCTIONED_COUNTRY_IDS,
		THREAT_COLORS,
		WEATHER_CODES,
		SHIPPING_ROUTES
	} from '$lib/config/map';
	import { CACHE_TTLS } from '$lib/config/api';
	import type { CustomMonitor } from '$lib/types';
	import { fetchShippingVessels } from '$lib/services/shipping';
	import type { ShippingVessel } from '$lib/types/shipping';
	import type { Hotspot, Chokepoint, CableLanding, NuclearSite, MilitaryBase } from '$lib/config/map';

	interface Props {
		monitors?: CustomMonitor[];
		loading?: boolean;
		error?: string | null;
	}

	let { monitors = [], loading = false, error = null }: Props = $props();

	// Selection types
	type SelectedItem = {
		type: 'hotspot' | 'chokepoint' | 'cable' | 'nuclear' | 'military' | 'monitor';
		data: Hotspot | Chokepoint | CableLanding | NuclearSite | MilitaryBase | CustomMonitor;
		lat: number;
		lon: number;
		name: string;
		color: string;
	};

	let mapContainer: HTMLDivElement;
	// D3 objects - initialized in initMap, null before initialization
	// Using 'any' for D3 objects as they're dynamically imported and have complex generic types
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

	// Layer visibility state
	let layers = $state({
		conflictZones: true,
		chokepoints: true,
		cables: true,
		nuclear: true,
		military: true,
		shipping: false,
		monitors: true,
		hotspots: true,
		connections: true
	});

	// Selection state
	let selectedItems = $state<SelectedItem[]>([]);
	let detailPanelOpen = $state(false);

	// Shipping traffic state
	let showShipping = $state(false);
	let shippingVessels = $state<ShippingVessel[]>([]);
	let loadingShipping = $state(false);

	// Tooltip state
	let tooltipContent = $state<{
		title: string;
		color: string;
		lines: string[];
	} | null>(null);
	let tooltipPosition = $state({ left: 0, top: 0 });
	let tooltipVisible = $state(false);

	// Metrics state
	let metrics = $derived({
		totalHotspots: HOTSPOTS.length,
		criticalThreats: HOTSPOTS.filter(h => h.level === 'critical').length,
		highThreats: HOTSPOTS.filter(h => h.level === 'high').length,
		conflictZones: CONFLICT_ZONES.length,
		chokepoints: CHOKEPOINTS.length,
		selectedCount: selectedItems.length
	});

	// Data cache for tooltips with TTL support
	interface CacheEntry<T> {
		data: T;
		timestamp: number;
	}
	const dataCache: Record<string, CacheEntry<unknown>> = {};

	function getCachedData<T>(key: string): T | null {
		const entry = dataCache[key] as CacheEntry<T> | undefined;
		if (!entry) return null;
		// Check if cache entry has expired
		if (Date.now() - entry.timestamp > CACHE_TTLS.weather) {
			delete dataCache[key];
			return null;
		}
		return entry.data;
	}

	function setCachedData<T>(key: string, data: T): void {
		dataCache[key] = { data, timestamp: Date.now() };
	}

	// Get local time at longitude
	function getLocalTime(lon: number): string {
		const now = new Date();
		const utcHours = now.getUTCHours();
		const utcMinutes = now.getUTCMinutes();
		const offsetHours = Math.round(lon / 15);
		let localHours = (utcHours + offsetHours + 24) % 24;
		const ampm = localHours >= 12 ? 'PM' : 'AM';
		localHours = localHours % 12 || 12;
		return `${localHours}:${utcMinutes.toString().padStart(2, '0')} ${ampm}`;
	}

	// Weather result type
	interface WeatherResult {
		temp: number | null;
		wind: number | null;
		condition: string;
	}

	// Fetch weather from Open-Meteo with TTL-based caching
	async function getWeather(lat: number, lon: number): Promise<WeatherResult | null> {
		const key = `weather_${lat}_${lon}`;
		const cached = getCachedData<WeatherResult>(key);
		if (cached) return cached;

		try {
			const res = await fetch(
				`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m`
			);
			const data = await res.json();
			const temp = data.current?.temperature_2m;
			const tempF = temp ? Math.round((temp * 9) / 5 + 32) : null;
			const wind = data.current?.wind_speed_10m;
			const code = data.current?.weather_code;
			const result: WeatherResult = {
				temp: tempF,
				wind: wind ? Math.round(wind) : null,
				condition: WEATHER_CODES[code] || '—'
			};
			setCachedData(key, result);
			return result;
		} catch {
			return null;
		}
	}

	// Enable zoom/pan behavior on the map
	function enableZoom(): void {
		if (!svg || !zoom) return;
		svg.call(zoom);
	}

	// Calculate day/night terminator points
	function calculateTerminator(): [number, number][] {
		const now = new Date();
		const dayOfYear = Math.floor(
			(now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000
		);
		const declination = -23.45 * Math.cos(((360 / 365) * (dayOfYear + 10) * Math.PI) / 180);
		const hourAngle = (now.getUTCHours() + now.getUTCMinutes() / 60) * 15 - 180;

		const terminatorPoints: [number, number][] = [];
		for (let lat = -90; lat <= 90; lat += 2) {
			const tanDec = Math.tan((declination * Math.PI) / 180);
			const tanLat = Math.tan((lat * Math.PI) / 180);
			let lon = -hourAngle + (Math.acos(-tanDec * tanLat) * 180) / Math.PI;
			if (isNaN(lon)) lon = lat * declination > 0 ? -hourAngle + 180 : -hourAngle;
			terminatorPoints.push([lon, lat]);
		}
		for (let lat = 90; lat >= -90; lat -= 2) {
			const tanDec = Math.tan((declination * Math.PI) / 180);
			const tanLat = Math.tan((lat * Math.PI) / 180);
			let lon = -hourAngle - (Math.acos(-tanDec * tanLat) * 180) / Math.PI;
			if (isNaN(lon)) lon = lat * declination > 0 ? -hourAngle - 180 : -hourAngle;
			terminatorPoints.push([lon, lat]);
		}
		return terminatorPoints;
	}

	// Show tooltip using state (safe rendering)
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

	// Move tooltip
	function moveTooltip(event: MouseEvent): void {
		if (!mapContainer) return;
		const rect = mapContainer.getBoundingClientRect();
		tooltipPosition = {
			left: event.clientX - rect.left + 15,
			top: event.clientY - rect.top - 10
		};
	}

	// Hide tooltip
	function hideTooltip(): void {
		tooltipVisible = false;
		tooltipContent = null;
	}

	// Selection handlers
	function toggleSelection(item: SelectedItem, event?: MouseEvent): void {
		if (event?.ctrlKey || event?.metaKey) {
			// Multi-select
			const index = selectedItems.findIndex(
				i => i.name === item.name && i.type === item.type
			);
			if (index >= 0) {
				selectedItems = selectedItems.filter((_, i) => i !== index);
			} else {
				selectedItems = [...selectedItems, item];
			}
		} else {
			// Single select
			selectedItems = [item];
		}
		detailPanelOpen = selectedItems.length > 0;
		drawConnections();
	}

	function clearSelection(): void {
		selectedItems = [];
		detailPanelOpen = false;
		drawConnections();
	}

	// Draw connection lines between selected items
	function drawConnections(): void {
		if (!mapGroup || !projection) return;

		// Remove existing connections
		mapGroup.selectAll('.connection-line').remove();
		mapGroup.selectAll('.connection-particle').remove();

		if (!layers.connections || selectedItems.length < 2) return;

		// Draw lines between all selected items
		for (let i = 0; i < selectedItems.length - 1; i++) {
			for (let j = i + 1; j < selectedItems.length; j++) {
				const item1 = selectedItems[i];
				const item2 = selectedItems[j];
				const [x1, y1] = projection([item1.lon, item1.lat]) || [0, 0];
				const [x2, y2] = projection([item2.lon, item2.lat]) || [0, 0];

				if (x1 && y1 && x2 && y2) {
					// Draw connecting line with glow effect
					mapGroup
						.append('line')
						.attr('class', 'connection-line')
						.attr('x1', x1)
						.attr('y1', y1)
						.attr('x2', x2)
						.attr('y2', y2)
						.attr('stroke', '#00ffff')
						.attr('stroke-width', 2)
						.attr('stroke-dasharray', '5,5')
						.attr('opacity', 0.7)
						.style('filter', 'drop-shadow(0 0 4px #00ffff)');

					// Add animated particles along the line
					const distance = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
					const particleCount = Math.floor(distance / 50);
					for (let p = 0; p < particleCount; p++) {
						const t = p / particleCount;
						const x = x1 + (x2 - x1) * t;
						const y = y1 + (y2 - y1) * t;
						mapGroup
							.append('circle')
							.attr('class', 'connection-particle')
							.attr('cx', x)
							.attr('cy', y)
							.attr('r', 2)
							.attr('fill', '#00ffff')
							.attr('opacity', 0.8)
							.style('filter', 'drop-shadow(0 0 2px #00ffff)');
					}
				}
			}
		}
	}

	// Toggle layer visibility
	function toggleLayer(layer: keyof typeof layers): void {
		layers[layer] = !layers[layer];
		if (layer === 'shipping') {
			showShipping = layers.shipping;
			toggleShipping();
		} else {
			redrawMap();
		}
	}

	// Redraw map with current layer settings
	function redrawMap(): void {
		if (!mapGroup) return;
		
		// Update visibility of layer groups
		mapGroup.selectAll('.conflict-zone').style('display', layers.conflictZones ? 'block' : 'none');
		mapGroup.selectAll('.chokepoint-marker').style('display', layers.chokepoints ? 'block' : 'none');
		mapGroup.selectAll('.cable-marker').style('display', layers.cables ? 'block' : 'none');
		mapGroup.selectAll('.nuclear-marker').style('display', layers.nuclear ? 'block' : 'none');
		mapGroup.selectAll('.military-marker').style('display', layers.military ? 'block' : 'none');
		mapGroup.selectAll('.hotspot-marker').style('display', layers.hotspots ? 'block' : 'none');
		mapGroup.selectAll('.monitor-marker').style('display', layers.monitors ? 'block' : 'none');
		
		drawConnections();
	}

	// Build enhanced tooltip with weather
	async function showEnhancedTooltip(
		event: MouseEvent,
		_name: string,
		lat: number,
		lon: number,
		desc: string,
		color: string
	): Promise<void> {
		const localTime = getLocalTime(lon);
		const lines = [`🕐 Local: ${localTime}`];
		showTooltip(event, desc, color, lines);

		// Fetch weather asynchronously
		const weather = await getWeather(lat, lon);
		if (weather && tooltipVisible) {
			tooltipContent = {
				title: desc,
				color,
				lines: [
					`🕐 Local: ${localTime}`,
					`${weather.condition} ${weather.temp}°F, ${weather.wind}mph`
				]
			};
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

		mapGroup = svg.append('g').attr('id', 'mapGroup');

		// Setup zoom - disable scroll wheel, allow touch pinch and buttons
		zoom = d3
			.zoom<SVGSVGElement, unknown>()
			.scaleExtent([1, 6])
			.filter((event) => {
				// Block scroll wheel zoom (wheel events)
				if (event.type === 'wheel') return false;
				// Allow touch events (pinch zoom on mobile)
				if (event.type.startsWith('touch')) return true;
				// Allow mouse drag for panning
				if (event.type === 'mousedown' || event.type === 'mousemove') return true;
				// Block double-click zoom
				if (event.type === 'dblclick') return false;
				// Allow other events (programmatic zoom from buttons)
				return true;
			})
			.on('zoom', (event) => {
				mapGroup.attr('transform', event.transform.toString());
			});

		enableZoom();

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

			// Draw countries
			mapGroup
				.selectAll('path.country')
				.data(countries.features)
				.enter()
				.append('path')
				.attr('class', 'country')
				.attr('d', path as unknown as string)
				.attr('fill', (d: GeoJSON.Feature) =>
					SANCTIONED_COUNTRY_IDS.includes(+(d.id || 0)) ? '#2a1a1a' : '#0f3028'
				)
				.attr('stroke', (d: GeoJSON.Feature) =>
					SANCTIONED_COUNTRY_IDS.includes(+(d.id || 0)) ? '#4a2020' : '#1a5040'
				)
				.attr('stroke-width', 0.5);

			// Draw graticule
			const graticule = d3.geoGraticule().step([30, 30]);
			mapGroup
				.append('path')
				.datum(graticule)
				.attr('d', path as unknown as string)
				.attr('fill', 'none')
				.attr('stroke', '#1a3830')
				.attr('stroke-width', 0.3)
				.attr('stroke-dasharray', '2,2');

			// Draw ocean labels
			OCEANS.forEach((o) => {
				const [x, y] = projection([o.lon, o.lat]) || [0, 0];
				if (x && y) {
					mapGroup
						.append('text')
						.attr('x', x)
						.attr('y', y)
						.attr('fill', '#1a4a40')
						.attr('font-size', '10px')
						.attr('font-family', 'monospace')
						.attr('text-anchor', 'middle')
						.attr('opacity', 0.6)
						.text(o.name);
				}
			});

			// Draw day/night terminator
			const terminatorPoints = calculateTerminator();
			mapGroup
				.append('path')
				.datum({ type: 'Polygon', coordinates: [terminatorPoints] } as GeoJSON.Polygon)
				.attr('d', path as unknown as string)
				.attr('fill', 'rgba(0,0,0,0.3)')
				.attr('stroke', 'none');

			// Draw conflict zones
			CONFLICT_ZONES.forEach((zone) => {
				mapGroup
					.append('path')
					.attr('class', 'conflict-zone')
					.datum({ type: 'Polygon', coordinates: [zone.coords] } as GeoJSON.Polygon)
					.attr('d', path as unknown as string)
					.attr('fill', zone.color)
					.attr('fill-opacity', 0.15)
					.attr('stroke', zone.color)
					.attr('stroke-width', 0.5)
					.attr('stroke-opacity', 0.4)
					.style('display', layers.conflictZones ? 'block' : 'none');
			});

			// Draw chokepoints
			CHOKEPOINTS.forEach((cp) => {
				const [x, y] = projection([cp.lon, cp.lat]) || [0, 0];
				if (x && y) {
					const group = mapGroup.append('g').attr('class', 'chokepoint-marker');
					
					group
						.append('rect')
						.attr('x', x - 4)
						.attr('y', y - 4)
						.attr('width', 8)
						.attr('height', 8)
						.attr('fill', '#00aaff')
						.attr('opacity', 0.8)
						.attr('transform', `rotate(45,${x},${y})`);
					group
						.append('text')
						.attr('x', x + 8)
						.attr('y', y + 3)
						.attr('fill', '#00aaff')
						.attr('font-size', '7px')
						.attr('font-family', 'monospace')
						.text(cp.name);
					group
						.append('circle')
						.attr('cx', x)
						.attr('cy', y)
						.attr('r', 10)
						.attr('fill', 'transparent')
						.attr('class', 'hotspot-hit')
						.style('cursor', 'pointer')
						.on('mouseenter', (event: MouseEvent) => showTooltip(event, `⬥ ${cp.desc}`, '#00aaff'))
						.on('mousemove', moveTooltip)
						.on('mouseleave', hideTooltip)
						.on('click', (event: MouseEvent) => {
							toggleSelection({
								type: 'chokepoint',
								data: cp,
								lat: cp.lat,
								lon: cp.lon,
								name: cp.name,
								color: '#00aaff'
							}, event);
						});
					
					group.style('display', layers.chokepoints ? 'block' : 'none');
				}
			});

			// Draw cable landings
			CABLE_LANDINGS.forEach((cl) => {
				const [x, y] = projection([cl.lon, cl.lat]) || [0, 0];
				if (x && y) {
					const group = mapGroup.append('g').attr('class', 'cable-marker');
					
					group
						.append('circle')
						.attr('cx', x)
						.attr('cy', y)
						.attr('r', 3)
						.attr('fill', 'none')
						.attr('stroke', '#aa44ff')
						.attr('stroke-width', 1.5);
					group
						.append('circle')
						.attr('cx', x)
						.attr('cy', y)
						.attr('r', 10)
						.attr('fill', 'transparent')
						.attr('class', 'hotspot-hit')
						.style('cursor', 'pointer')
						.on('mouseenter', (event: MouseEvent) => showTooltip(event, `◎ ${cl.desc}`, '#aa44ff'))
						.on('mousemove', moveTooltip)
						.on('mouseleave', hideTooltip)
						.on('click', (event: MouseEvent) => {
							toggleSelection({
								type: 'cable',
								data: cl,
								lat: cl.lat,
								lon: cl.lon,
								name: cl.name,
								color: '#aa44ff'
							}, event);
						});
					
					group.style('display', layers.cables ? 'block' : 'none');
				}
			});

			// Draw nuclear sites
			NUCLEAR_SITES.forEach((ns) => {
				const [x, y] = projection([ns.lon, ns.lat]) || [0, 0];
				if (x && y) {
					const group = mapGroup.append('g').attr('class', 'nuclear-marker');
					
					group
						.append('circle')
						.attr('cx', x)
						.attr('cy', y)
						.attr('r', 2)
						.attr('fill', '#ffff00');
					group
						.append('circle')
						.attr('cx', x)
						.attr('cy', y)
						.attr('r', 5)
						.attr('fill', 'none')
						.attr('stroke', '#ffff00')
						.attr('stroke-width', 1)
						.attr('stroke-dasharray', '3,3');
					group
						.append('circle')
						.attr('cx', x)
						.attr('cy', y)
						.attr('r', 10)
						.attr('fill', 'transparent')
						.attr('class', 'hotspot-hit')
						.style('cursor', 'pointer')
						.on('mouseenter', (event: MouseEvent) => showTooltip(event, `☢ ${ns.desc}`, '#ffff00'))
						.on('mousemove', moveTooltip)
						.on('mouseleave', hideTooltip)
						.on('click', (event: MouseEvent) => {
							toggleSelection({
								type: 'nuclear',
								data: ns,
								lat: ns.lat,
								lon: ns.lon,
								name: ns.name,
								color: '#ffff00'
							}, event);
						});
					
					group.style('display', layers.nuclear ? 'block' : 'none');
				}
			});

			// Draw military bases
			MILITARY_BASES.forEach((mb) => {
				const [x, y] = projection([mb.lon, mb.lat]) || [0, 0];
				if (x && y) {
					const group = mapGroup.append('g').attr('class', 'military-marker');
					
					const starPath = `M${x},${y - 5} L${x + 1.5},${y - 1.5} L${x + 5},${y - 1.5} L${x + 2.5},${y + 1} L${x + 3.5},${y + 5} L${x},${y + 2.5} L${x - 3.5},${y + 5} L${x - 2.5},${y + 1} L${x - 5},${y - 1.5} L${x - 1.5},${y - 1.5} Z`;
					group.append('path').attr('d', starPath).attr('fill', '#ff00ff').attr('opacity', 0.8);
					group
						.append('circle')
						.attr('cx', x)
						.attr('cy', y)
						.attr('r', 10)
						.attr('fill', 'transparent')
						.attr('class', 'hotspot-hit')
						.style('cursor', 'pointer')
						.on('mouseenter', (event: MouseEvent) => showTooltip(event, `★ ${mb.desc}`, '#ff00ff'))
						.on('mousemove', moveTooltip)
						.on('mouseleave', hideTooltip)
						.on('click', (event: MouseEvent) => {
							toggleSelection({
								type: 'military',
								data: mb,
								lat: mb.lat,
								lon: mb.lon,
								name: mb.name,
								color: '#ff00ff'
							}, event);
						});
					
					group.style('display', layers.military ? 'block' : 'none');
				}
			});

			// Draw hotspots
			HOTSPOTS.forEach((h) => {
				const [x, y] = projection([h.lon, h.lat]) || [0, 0];
				if (x && y) {
					const color = THREAT_COLORS[h.level];
					const group = mapGroup.append('g').attr('class', 'hotspot-marker');
					
					// Pulsing circle
					group
						.append('circle')
						.attr('cx', x)
						.attr('cy', y)
						.attr('r', 6)
						.attr('fill', color)
						.attr('fill-opacity', 0.3)
						.attr('class', 'pulse');
					// Inner dot
					group.append('circle').attr('cx', x).attr('cy', y).attr('r', 3).attr('fill', color);
					// Label
					group
						.append('text')
						.attr('x', x + 8)
						.attr('y', y + 3)
						.attr('fill', color)
						.attr('font-size', '8px')
						.attr('font-family', 'monospace')
						.text(h.name);
					// Hit area
					group
						.append('circle')
						.attr('cx', x)
						.attr('cy', y)
						.attr('r', 12)
						.attr('fill', 'transparent')
						.attr('class', 'hotspot-hit')
						.style('cursor', 'pointer')
						.on('mouseenter', (event: MouseEvent) =>
							showEnhancedTooltip(event, h.name, h.lat, h.lon, h.desc, color)
						)
						.on('mousemove', moveTooltip)
						.on('mouseleave', hideTooltip)
						.on('click', (event: MouseEvent) => {
							toggleSelection({
								type: 'hotspot',
								data: h,
								lat: h.lat,
								lon: h.lon,
								name: h.name,
								color
							}, event);
						});
					
					group.style('display', layers.hotspots ? 'block' : 'none');
				}
			});

			// Draw custom monitors with locations
			drawMonitors();
		} catch (err) {
			console.error('Failed to load map data:', err);
		}
	}

	// Draw custom monitor locations
	function drawMonitors(): void {
		if (!mapGroup || !projection) return;

		// Remove existing monitor markers
		mapGroup.selectAll('.monitor-marker').remove();

		monitors
			.filter((m) => m.enabled && m.location)
			.forEach((m) => {
				if (!m.location) return;
				const [x, y] = projection([m.location.lon, m.location.lat]) || [0, 0];
				if (x && y) {
					const color = m.color || '#00ffff';
					const group = mapGroup.append('g').attr('class', 'monitor-marker');
					
					group
						.append('circle')
						.attr('cx', x)
						.attr('cy', y)
						.attr('r', 5)
						.attr('fill', color)
						.attr('fill-opacity', 0.6)
						.attr('stroke', color)
						.attr('stroke-width', 2);
					group
						.append('text')
						.attr('x', x + 8)
						.attr('y', y + 3)
						.attr('fill', color)
						.attr('font-size', '8px')
						.attr('font-family', 'monospace')
						.text(m.name);
					group
						.append('circle')
						.attr('cx', x)
						.attr('cy', y)
						.attr('r', 10)
						.attr('fill', 'transparent')
						.style('cursor', 'pointer')
						.on('mouseenter', (event: MouseEvent) =>
							showTooltip(event, `📡 ${m.name}`, color, [
								m.location?.name || '',
								m.keywords.join(', ')
							])
						)
						.on('mousemove', moveTooltip)
						.on('mouseleave', hideTooltip)
						.on('click', (event: MouseEvent) => {
							if (!m.location) return;
							toggleSelection({
								type: 'monitor',
								data: m,
								lat: m.location.lat,
								lon: m.location.lon,
								name: m.name,
								color
							}, event);
						});
					
					group.style('display', layers.monitors ? 'block' : 'none');
				}
			});
	}

	// Load shipping data
	async function loadShippingData(): Promise<void> {
		if (loadingShipping) return;
		loadingShipping = true;
		try {
			shippingVessels = await fetchShippingVessels();
			if (showShipping && mapGroup && projection) {
				drawShippingTraffic();
			}
		} catch (err) {
			console.error('Failed to load shipping data:', err);
		} finally {
			loadingShipping = false;
		}
	}

	// Draw shipping routes and vessels
	function drawShippingTraffic(): void {
		if (!mapGroup || !projection || !d3Module) return;

		// Remove existing shipping elements
		mapGroup.selectAll('.shipping-route').remove();
		mapGroup.selectAll('.shipping-vessel').remove();

		if (!showShipping) return;

		// Draw shipping routes with dotted lines
		SHIPPING_ROUTES.forEach((route) => {
			const lineGenerator = d3Module
				.line<[number, number]>()
				.x((d) => projection(d)?.[0] || 0)
				.y((d) => projection(d)?.[1] || 0);

			mapGroup
				.append('path')
				.attr('class', 'shipping-route')
				.attr('d', lineGenerator(route.coordinates))
				.attr('fill', 'none')
				.attr('stroke', '#87CEEB')
				.attr('stroke-width', 1.5)
				.attr('stroke-dasharray', '5,5')
				.attr('opacity', 0.6)
				.on('mouseenter', (event: MouseEvent) =>
					showTooltip(event, `🚢 ${route.name}`, '#87CEEB', [`Type: ${route.type}`])
				)
				.on('mousemove', moveTooltip)
				.on('mouseleave', hideTooltip);
		});

		// Draw vessel markers
		shippingVessels.forEach((vessel) => {
			const [x, y] = projection([vessel.lon, vessel.lat]) || [0, 0];
			if (x && y) {
				// Vessel marker (small ship icon represented as triangle)
				const size = 6;
				const angle = vessel.course || 0;
				const shipPath = `M${x},${y - size} L${x + size / 2},${y + size} L${x - size / 2},${y + size} Z`;

				mapGroup
					.append('path')
					.attr('class', 'shipping-vessel')
					.attr('d', shipPath)
					.attr('fill', '#87CEEB')
					.attr('stroke', '#4682B4')
					.attr('stroke-width', 0.5)
					.attr('transform', `rotate(${angle}, ${x}, ${y})`)
					.attr('opacity', 0.9);

				// Hit area for tooltip
				mapGroup
					.append('circle')
					.attr('class', 'shipping-vessel')
					.attr('cx', x)
					.attr('cy', y)
					.attr('r', 8)
					.attr('fill', 'transparent')
					.attr('cursor', 'pointer')
					.on('mouseenter', (event: MouseEvent) => {
						const lines = [
							`Type: ${vessel.type}`,
							`Speed: ${vessel.speed} knots`,
							`Course: ${vessel.course}°`,
							vessel.destination ? `Destination: ${vessel.destination}` : '',
							vessel.flag ? `Flag: ${vessel.flag}` : ''
						].filter(Boolean);
						showTooltip(event, `⚓ ${vessel.name}`, '#87CEEB', lines);
					})
					.on('mousemove', moveTooltip)
					.on('mouseleave', hideTooltip);
			}
		});
	}

	// Toggle shipping traffic display
	async function toggleShipping(): Promise<void> {
		showShipping = !showShipping;
		if (showShipping && shippingVessels.length === 0) {
			await loadShippingData();
		} else {
			drawShippingTraffic();
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

	// Reactively update monitors when they change
	$effect(() => {
		// Track monitors changes
		const _monitorsRef = monitors;
		if (_monitorsRef && mapGroup && projection) {
			drawMonitors();
		}
	});

	// Reactively update shipping when state changes
	$effect(() => {
		// Track shipping state and vessels - reference them to trigger reactivity
		const _showShipping = showShipping;
		const _vessels = shippingVessels;
		// Use the references to ensure reactivity tracking
		void _vessels;
		if (_showShipping !== undefined && mapGroup && projection) {
			// drawShippingTraffic already handles conditional display
			drawShippingTraffic();
		}
	});

	onMount(() => {
		initMap();
	});
</script>

<Panel id="map" title="Global Situation" {loading} {error}>
	<div class="map-container" bind:this={mapContainer}>
		<!-- Scanline effect overlay -->
		<div class="scanline-overlay"></div>
		
		<!-- Grid pattern overlay -->
		<div class="grid-overlay"></div>
		
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
		
		<!-- Layer Control Panel -->
		<div class="layer-control-panel">
			<div class="panel-header">
				<span class="panel-icon">▦</span>
				<span class="panel-title">LAYERS</span>
			</div>
			<div class="panel-content">
				<button 
					class="layer-toggle {layers.hotspots ? 'active' : ''}"
					onclick={() => toggleLayer('hotspots')}
				>
					<span class="toggle-dot" style="background: #ff4444;"></span>
					Hotspots
				</button>
				<button 
					class="layer-toggle {layers.conflictZones ? 'active' : ''}"
					onclick={() => toggleLayer('conflictZones')}
				>
					<span class="toggle-dot" style="background: #ff6644;"></span>
					Conflicts
				</button>
				<button 
					class="layer-toggle {layers.chokepoints ? 'active' : ''}"
					onclick={() => toggleLayer('chokepoints')}
				>
					<span class="toggle-dot" style="background: #00aaff;"></span>
					Chokepoints
				</button>
				<button 
					class="layer-toggle {layers.cables ? 'active' : ''}"
					onclick={() => toggleLayer('cables')}
				>
					<span class="toggle-dot" style="background: #aa44ff;"></span>
					Cables
				</button>
				<button 
					class="layer-toggle {layers.nuclear ? 'active' : ''}"
					onclick={() => toggleLayer('nuclear')}
				>
					<span class="toggle-dot" style="background: #ffff00;"></span>
					Nuclear
				</button>
				<button 
					class="layer-toggle {layers.military ? 'active' : ''}"
					onclick={() => toggleLayer('military')}
				>
					<span class="toggle-dot" style="background: #ff00ff;"></span>
					Military
				</button>
				<button 
					class="layer-toggle {layers.shipping ? 'active' : ''}"
					onclick={() => toggleLayer('shipping')}
				>
					<span class="toggle-dot" style="background: #87ceeb;"></span>
					Shipping
				</button>
				<button 
					class="layer-toggle {layers.monitors ? 'active' : ''}"
					onclick={() => toggleLayer('monitors')}
				>
					<span class="toggle-dot" style="background: #00ffff;"></span>
					Monitors
				</button>
				<button 
					class="layer-toggle {layers.connections ? 'active' : ''}"
					onclick={() => toggleLayer('connections')}
				>
					<span class="toggle-dot" style="background: #00ffff;"></span>
					Connections
				</button>
			</div>
		</div>
		
		<!-- Metrics Panel -->
		<div class="metrics-panel">
			<div class="panel-header">
				<span class="panel-icon">◉</span>
				<span class="panel-title">METRICS</span>
			</div>
			<div class="panel-content">
				<div class="metric-row">
					<span class="metric-label">HOTSPOTS</span>
					<span class="metric-value">{metrics.totalHotspots}</span>
				</div>
				<div class="metric-row critical">
					<span class="metric-label">CRITICAL</span>
					<span class="metric-value">{metrics.criticalThreats}</span>
				</div>
				<div class="metric-row high">
					<span class="metric-label">HIGH</span>
					<span class="metric-value">{metrics.highThreats}</span>
				</div>
				<div class="metric-row">
					<span class="metric-label">CONFLICTS</span>
					<span class="metric-value">{metrics.conflictZones}</span>
				</div>
				<div class="metric-row">
					<span class="metric-label">CHOKEPOINTS</span>
					<span class="metric-value">{metrics.chokepoints}</span>
				</div>
				{#if metrics.selectedCount > 0}
					<div class="metric-row selected">
						<span class="metric-label">SELECTED</span>
						<span class="metric-value">{metrics.selectedCount}</span>
					</div>
				{/if}
			</div>
		</div>
		
		<!-- Detail Sidebar -->
		{#if detailPanelOpen && selectedItems.length > 0}
			<div class="detail-sidebar">
				<div class="sidebar-header">
					<span class="sidebar-title">SELECTION DETAILS</span>
					<button class="close-btn" onclick={clearSelection}>×</button>
				</div>
				<div class="sidebar-content">
					{#each selectedItems as item}
						<div class="detail-item" style="border-left: 3px solid {item.color};">
							<div class="detail-name" style="color: {item.color};">{item.name}</div>
							<div class="detail-type">{item.type.toUpperCase()}</div>
							{#if 'desc' in item.data}
								<div class="detail-desc">{item.data.desc}</div>
							{/if}
							<div class="detail-coords">
								{item.lat.toFixed(2)}°, {item.lon.toFixed(2)}°
							</div>
							{#if item.type === 'hotspot' && 'level' in item.data}
								<div class="detail-level" style="color: {item.color};">
									THREAT: {item.data.level.toUpperCase()}
								</div>
							{/if}
							{#if item.type === 'monitor' && 'keywords' in item.data}
								<div class="detail-keywords">
									Keywords: {item.data.keywords.join(', ')}
								</div>
							{/if}
						</div>
					{/each}
					<div class="sidebar-hint">
						Ctrl/Cmd+Click to multi-select
					</div>
				</div>
			</div>
		{/if}
		
		<div class="zoom-controls">
			<button class="zoom-btn" onclick={zoomIn} title="Zoom in">+</button>
			<button class="zoom-btn" onclick={zoomOut} title="Zoom out">−</button>
			<button class="zoom-btn" onclick={resetZoom} title="Reset">⟲</button>
		</div>
		
		<!-- Corner brackets for techno aesthetic -->
		<div class="corner-bracket top-left"></div>
		<div class="corner-bracket top-right"></div>
		<div class="corner-bracket bottom-left"></div>
		<div class="corner-bracket bottom-right"></div>
	</div>
</Panel>

<style>
	.map-container {
		position: relative;
		width: 100%;
		aspect-ratio: 2 / 1;
		background: #0a0f0d;
		border-radius: 4px;
		overflow: hidden;
	}

	.map-svg {
		width: 100%;
		height: 100%;
	}

	/* Scanline effect */
	.scanline-overlay {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: repeating-linear-gradient(
			0deg,
			rgba(0, 255, 255, 0.03) 0px,
			rgba(0, 255, 255, 0.03) 1px,
			transparent 1px,
			transparent 2px
		);
		pointer-events: none;
		animation: scanline 8s linear infinite;
		z-index: 5;
	}

	@keyframes scanline {
		0% {
			transform: translateY(0);
		}
		100% {
			transform: translateY(100%);
		}
	}

	/* Grid overlay */
	.grid-overlay {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-image: 
			linear-gradient(rgba(0, 255, 255, 0.05) 1px, transparent 1px),
			linear-gradient(90deg, rgba(0, 255, 255, 0.05) 1px, transparent 1px);
		background-size: 50px 50px;
		pointer-events: none;
		opacity: 0.3;
		z-index: 1;
	}

	/* Corner brackets */
	.corner-bracket {
		position: absolute;
		width: 20px;
		height: 20px;
		border: 2px solid rgba(0, 255, 255, 0.4);
		pointer-events: none;
		z-index: 10;
	}

	.corner-bracket.top-left {
		top: 0;
		left: 0;
		border-right: none;
		border-bottom: none;
	}

	.corner-bracket.top-right {
		top: 0;
		right: 0;
		border-left: none;
		border-bottom: none;
	}

	.corner-bracket.bottom-left {
		bottom: 0;
		left: 0;
		border-right: none;
		border-top: none;
	}

	.corner-bracket.bottom-right {
		bottom: 0;
		right: 0;
		border-left: none;
		border-top: none;
	}

	/* Layer Control Panel */
	.layer-control-panel {
		position: absolute;
		top: 0.5rem;
		left: 0.5rem;
		background: rgba(10, 15, 13, 0.95);
		border: 1px solid rgba(0, 255, 255, 0.3);
		border-radius: 4px;
		backdrop-filter: blur(4px);
		z-index: 10;
		box-shadow: 0 0 20px rgba(0, 255, 255, 0.1);
	}

	.panel-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.4rem 0.6rem;
		background: rgba(0, 255, 255, 0.1);
		border-bottom: 1px solid rgba(0, 255, 255, 0.2);
	}

	.panel-icon {
		color: #00ffff;
		font-size: 0.8rem;
	}

	.panel-title {
		color: #00ffff;
		font-size: 0.65rem;
		font-weight: 600;
		letter-spacing: 1px;
		font-family: monospace;
	}

	.panel-content {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		padding: 0.4rem;
		max-height: 300px;
		overflow-y: auto;
	}

	.layer-toggle {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.4rem 0.5rem;
		background: rgba(20, 25, 23, 0.8);
		border: 1px solid rgba(100, 100, 100, 0.3);
		border-radius: 3px;
		color: #888;
		font-size: 0.7rem;
		font-family: monospace;
		cursor: pointer;
		transition: all 0.2s;
		text-align: left;
	}

	.layer-toggle:hover {
		background: rgba(30, 35, 33, 0.9);
		border-color: rgba(0, 255, 255, 0.4);
		color: #aaa;
	}

	.layer-toggle.active {
		background: rgba(0, 255, 255, 0.15);
		border-color: rgba(0, 255, 255, 0.5);
		color: #00ffff;
		box-shadow: 0 0 10px rgba(0, 255, 255, 0.2);
	}

	.toggle-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	/* Metrics Panel */
	.metrics-panel {
		position: absolute;
		top: 0.5rem;
		right: 0.5rem;
		background: rgba(10, 15, 13, 0.95);
		border: 1px solid rgba(0, 255, 255, 0.3);
		border-radius: 4px;
		backdrop-filter: blur(4px);
		z-index: 10;
		box-shadow: 0 0 20px rgba(0, 255, 255, 0.1);
		min-width: 150px;
	}

	.metric-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.3rem 0.6rem;
		border-bottom: 1px solid rgba(100, 100, 100, 0.2);
		font-family: monospace;
	}

	.metric-row:last-child {
		border-bottom: none;
	}

	.metric-label {
		font-size: 0.65rem;
		color: #888;
		letter-spacing: 0.5px;
	}

	.metric-value {
		font-size: 0.75rem;
		color: #00ffff;
		font-weight: 600;
	}

	.metric-row.critical .metric-value {
		color: #ff0000;
	}

	.metric-row.high .metric-value {
		color: #ff4444;
	}

	.metric-row.selected {
		background: rgba(0, 255, 255, 0.1);
	}

	.metric-row.selected .metric-value {
		animation: pulse-glow 2s ease-in-out infinite;
	}

	@keyframes pulse-glow {
		0%, 100% {
			text-shadow: 0 0 5px rgba(0, 255, 255, 0.5);
		}
		50% {
			text-shadow: 0 0 10px rgba(0, 255, 255, 0.8);
		}
	}

	/* Detail Sidebar */
	.detail-sidebar {
		position: absolute;
		right: 0;
		top: 0;
		bottom: 0;
		width: 280px;
		background: rgba(10, 15, 13, 0.98);
		border-left: 2px solid rgba(0, 255, 255, 0.4);
		z-index: 20;
		animation: slide-in 0.3s ease-out;
		display: flex;
		flex-direction: column;
		box-shadow: -5px 0 20px rgba(0, 0, 0, 0.5);
	}

	@keyframes slide-in {
		from {
			transform: translateX(100%);
		}
		to {
			transform: translateX(0);
		}
	}

	.sidebar-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.6rem 0.8rem;
		background: rgba(0, 255, 255, 0.15);
		border-bottom: 1px solid rgba(0, 255, 255, 0.3);
	}

	.sidebar-title {
		color: #00ffff;
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 1px;
		font-family: monospace;
	}

	.close-btn {
		background: none;
		border: 1px solid rgba(0, 255, 255, 0.3);
		color: #00ffff;
		font-size: 1.2rem;
		width: 24px;
		height: 24px;
		border-radius: 3px;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
		line-height: 1;
		padding: 0;
	}

	.close-btn:hover {
		background: rgba(0, 255, 255, 0.2);
		border-color: #00ffff;
	}

	.sidebar-content {
		flex: 1;
		overflow-y: auto;
		padding: 0.8rem;
		display: flex;
		flex-direction: column;
		gap: 0.8rem;
	}

	.detail-item {
		background: rgba(20, 25, 23, 0.8);
		border-radius: 4px;
		padding: 0.8rem;
		border-left-width: 3px;
	}

	.detail-name {
		font-size: 0.85rem;
		font-weight: 600;
		margin-bottom: 0.3rem;
		font-family: monospace;
	}

	.detail-type {
		font-size: 0.65rem;
		color: #888;
		letter-spacing: 1px;
		margin-bottom: 0.5rem;
		font-family: monospace;
	}

	.detail-desc {
		font-size: 0.7rem;
		color: #aaa;
		line-height: 1.4;
		margin-bottom: 0.5rem;
	}

	.detail-coords {
		font-size: 0.65rem;
		color: #666;
		font-family: monospace;
	}

	.detail-level {
		font-size: 0.7rem;
		font-weight: 600;
		margin-top: 0.5rem;
		letter-spacing: 0.5px;
		font-family: monospace;
	}

	.detail-keywords {
		font-size: 0.65rem;
		color: #888;
		margin-top: 0.5rem;
		font-style: italic;
	}

	.sidebar-hint {
		font-size: 0.65rem;
		color: #666;
		text-align: center;
		padding: 0.5rem;
		font-style: italic;
		border-top: 1px solid rgba(100, 100, 100, 0.2);
		margin-top: auto;
	}

	.map-tooltip {
		position: absolute;
		background: rgba(10, 10, 10, 0.95);
		border: 1px solid rgba(0, 255, 255, 0.4);
		border-radius: 4px;
		padding: 0.5rem;
		font-size: 0.65rem;
		color: #ddd;
		max-width: 250px;
		pointer-events: none;
		z-index: 100;
		box-shadow: 0 0 15px rgba(0, 255, 255, 0.2);
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
		z-index: 10;
	}

	.zoom-btn {
		width: 2.75rem;
		height: 2.75rem;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(10, 15, 13, 0.95);
		border: 1px solid rgba(0, 255, 255, 0.3);
		border-radius: 4px;
		color: #00ffff;
		font-size: 1rem;
		cursor: pointer;
		transition: all 0.2s;
		font-family: monospace;
	}

	.zoom-btn:hover {
		background: rgba(0, 255, 255, 0.2);
		border-color: #00ffff;
		box-shadow: 0 0 15px rgba(0, 255, 255, 0.3);
	}

	/* Pulse animation for hotspots */
	:global(.pulse) {
		animation: pulse 2s ease-in-out infinite;
	}

	@keyframes pulse {
		0%,
		100% {
			r: 6;
			opacity: 0.3;
		}
		50% {
			r: 10;
			opacity: 0.1;
		}
	}

	:global(.hotspot-hit) {
		cursor: pointer;
	}

	/* Connection lines glow effect */
	:global(.connection-line) {
		animation: connection-pulse 3s ease-in-out infinite;
	}

	@keyframes connection-pulse {
		0%, 100% {
			opacity: 0.5;
		}
		50% {
			opacity: 0.9;
		}
	}

	:global(.connection-particle) {
		animation: particle-flow 2s linear infinite;
	}

	@keyframes particle-flow {
		0%, 100% {
			opacity: 0.3;
		}
		50% {
			opacity: 1;
		}
	}

	/* Hide zoom controls on mobile where touch zoom is available */
	@media (max-width: 768px) {
		.zoom-controls {
			display: flex;
		}
		
		.layer-control-panel,
		.metrics-panel {
			font-size: 0.9em;
		}
		
		.detail-sidebar {
			width: 240px;
		}
	}
	
	/* Scrollbar styling for panels */
	.panel-content::-webkit-scrollbar,
	.sidebar-content::-webkit-scrollbar {
		width: 6px;
	}

	.panel-content::-webkit-scrollbar-track,
	.sidebar-content::-webkit-scrollbar-track {
		background: rgba(0, 0, 0, 0.2);
	}

	.panel-content::-webkit-scrollbar-thumb,
	.sidebar-content::-webkit-scrollbar-thumb {
		background: rgba(0, 255, 255, 0.3);
		border-radius: 3px;
	}

	.panel-content::-webkit-scrollbar-thumb:hover,
	.sidebar-content::-webkit-scrollbar-thumb:hover {
		background: rgba(0, 255, 255, 0.5);
	}
</style>
