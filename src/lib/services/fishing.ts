/**
 * Fishing vessel tracking service
 * Uses Global Fishing Watch API or AIS data filtered for fishing vessels
 */

import type { FishingVessel } from '$types/fishing';

/**
 * Mock fishing vessels for demonstration
 * In production, this would fetch from:
 * - Global Fishing Watch API (https://globalfishingwatch.org/our-apis/)
 * - AIS data filtered for fishing vessel types
 */
const MOCK_FISHING_VESSELS: FishingVessel[] = [
	{
		mmsi: '412123456',
		name: 'OCEAN HARVESTER',
		lat: 35.0,
		lon: 139.5,
		course: 180,
		speed: 4.2,
		flag: 'CN',
		fishingType: 'trawling',
		vesselClass: 'Trawler',
		length: 65,
		timestamp: Date.now(),
		catchData: {
			species: ['Tuna', 'Mackerel'],
			zone: 'East China Sea'
		}
	},
	{
		mmsi: '219123789',
		name: 'NORDIC FISHER',
		lat: 60.5,
		lon: 5.0,
		course: 90,
		speed: 3.8,
		flag: 'NO',
		fishingType: 'longlining',
		vesselClass: 'Longliner',
		length: 45,
		timestamp: Date.now(),
		catchData: {
			species: ['Cod', 'Haddock'],
			zone: 'Norwegian Sea'
		}
	},
	{
		mmsi: '725123111',
		name: 'ATLANTIC SEINER',
		lat: -35.0,
		lon: -50.0,
		course: 270,
		speed: 5.5,
		flag: 'AR',
		fishingType: 'purse_seining',
		vesselClass: 'Purse Seiner',
		length: 55,
		timestamp: Date.now(),
		catchData: {
			species: ['Sardines', 'Anchovies'],
			zone: 'South Atlantic'
		}
	},
	{
		mmsi: '503123222',
		name: 'SOUTHERN CATCH',
		lat: -42.0,
		lon: 147.0,
		course: 45,
		speed: 2.1,
		flag: 'AU',
		fishingType: 'gillnetting',
		vesselClass: 'Gillnetter',
		length: 38,
		timestamp: Date.now(),
		catchData: {
			species: ['Salmon', 'Flathead'],
			zone: 'Tasman Sea'
		}
	},
	{
		mmsi: '440123333',
		name: 'PACIFIC TRAWLER',
		lat: 42.0,
		lon: 141.0,
		course: 315,
		speed: 4.8,
		flag: 'KR',
		fishingType: 'trawling',
		vesselClass: 'Factory Trawler',
		length: 85,
		timestamp: Date.now(),
		catchData: {
			species: ['Pollock', 'Squid'],
			zone: 'North Pacific'
		}
	},
	{
		mmsi: '257123444',
		name: 'IBERIAN FISHER',
		lat: 38.0,
		lon: -9.5,
		course: 180,
		speed: 3.2,
		flag: 'PT',
		fishingType: 'longlining',
		vesselClass: 'Longliner',
		length: 42,
		timestamp: Date.now(),
		catchData: {
			species: ['Swordfish', 'Tuna'],
			zone: 'Atlantic Ocean'
		}
	},
	{
		mmsi: '352123555',
		name: 'CARIBBEAN SEINER',
		lat: 18.0,
		lon: -75.0,
		course: 90,
		speed: 4.5,
		flag: 'PA',
		fishingType: 'purse_seining',
		vesselClass: 'Purse Seiner',
		length: 48,
		timestamp: Date.now(),
		catchData: {
			species: ['Mahi-mahi', 'Skipjack'],
			zone: 'Caribbean Sea'
		}
	},
	{
		mmsi: '533123666',
		name: 'MALAY TRAWLER',
		lat: 3.0,
		lon: 101.5,
		course: 120,
		speed: 3.5,
		flag: 'MY',
		fishingType: 'trawling',
		vesselClass: 'Bottom Trawler',
		length: 35,
		timestamp: Date.now(),
		catchData: {
			species: ['Prawns', 'Grouper'],
			zone: 'Malacca Strait'
		}
	}
];

/**
 * Fetch fishing vessels
 * @param bounds - Optional geographic bounds to filter vessels
 * @returns Array of fishing vessels
 */
export async function fetchFishingVessels(bounds?: {
	minLat: number;
	maxLat: number;
	minLon: number;
	maxLon: number;
}): Promise<FishingVessel[]> {
	// In production, implement actual API call here
	// Example: const response = await fetch(`https://gateway.api.globalfishingwatch.org/v2/vessels?...`);

	// Simulate API delay
	await new Promise((resolve) => setTimeout(resolve, 400));

	// Filter by bounds if provided
	if (bounds) {
		return MOCK_FISHING_VESSELS.filter(
			(v) =>
				v.lat >= bounds.minLat &&
				v.lat <= bounds.maxLat &&
				v.lon >= bounds.minLon &&
				v.lon <= bounds.maxLon
		);
	}

	return MOCK_FISHING_VESSELS;
}

/**
 * Get fishing vessel details by MMSI
 */
export async function getFishingVesselDetails(mmsi: string): Promise<FishingVessel | null> {
	// In production: fetch from Global Fishing Watch API
	await new Promise((resolve) => setTimeout(resolve, 200));

	const vessel = MOCK_FISHING_VESSELS.find((v) => v.mmsi === mmsi);
	return vessel || null;
}
