/**
 * Shipping traffic service - fetches real-time shipping data
 * Uses AIS (Automatic Identification System) data or shipping APIs
 */

import type { ShippingVessel } from '$types/shipping';

/**
 * Mock shipping vessels for demonstration
 * In production, this would fetch from APIs like:
 * - MarineTraffic API (https://www.marinetraffic.com/en/ais-api-services)
 * - VesselFinder API (https://www.vesselfinder.com/api)
 * - AIS Stream (https://aisstream.io/)
 */
const MOCK_VESSELS: ShippingVessel[] = [
	{
		mmsi: '477123456',
		name: 'EVER GLOBAL',
		lat: 1.5,
		lon: 103.5,
		course: 285,
		speed: 18.5,
		type: 'Container Ship',
		destination: 'ROTTERDAM',
		eta: '2026-02-15T14:00:00Z',
		flag: 'HK',
		length: 400,
		width: 59
	},
	{
		mmsi: '636123789',
		name: 'SEAWAYS TITAN',
		lat: 26.0,
		lon: 56.0,
		course: 120,
		speed: 14.2,
		type: 'Oil Tanker',
		destination: 'SINGAPORE',
		eta: '2026-01-25T08:00:00Z',
		flag: 'LR',
		length: 333,
		width: 60
	},
	{
		mmsi: '538123999',
		name: 'PACIFIC DAWN',
		lat: 35.5,
		lon: 140.0,
		course: 90,
		speed: 20.1,
		type: 'Container Ship',
		destination: 'LOS ANGELES',
		eta: '2026-01-28T06:00:00Z',
		flag: 'MH',
		length: 366,
		width: 51
	},
	{
		mmsi: '229123111',
		name: 'MALTA CARRIER',
		lat: 30.5,
		lon: 32.0,
		course: 315,
		speed: 16.8,
		type: 'Container Ship',
		destination: 'HAMBURG',
		flag: 'MT',
		length: 294,
		width: 40
	},
	{
		mmsi: '357123222',
		name: 'CRUDE EXPLORER',
		lat: 20.0,
		lon: 60.0,
		course: 270,
		speed: 13.5,
		type: 'Crude Oil Tanker',
		destination: 'FUJAIRAH',
		flag: 'PA',
		length: 274,
		width: 48
	},
	{
		mmsi: '209123333',
		name: 'NORDICA BULK',
		lat: 55.0,
		lon: -10.0,
		course: 45,
		speed: 12.3,
		type: 'Bulk Carrier',
		destination: 'AMSTERDAM',
		flag: 'DE',
		length: 229,
		width: 32
	},
	{
		mmsi: '371123444',
		name: 'PANAMA GLORY',
		lat: 9.0,
		lon: -79.5,
		course: 180,
		speed: 10.5,
		type: 'Container Ship',
		destination: 'CALLAO',
		flag: 'PA',
		length: 262,
		width: 32
	}
];

/**
 * Fetch shipping vessels
 * @param bounds - Optional geographic bounds to filter vessels
 * @returns Array of shipping vessels
 */
export async function fetchShippingVessels(bounds?: {
	minLat: number;
	maxLat: number;
	minLon: number;
	maxLon: number;
}): Promise<ShippingVessel[]> {
	// In production, implement actual API call here
	// Example: const response = await fetch(`https://api.aisstream.io/v0/vessels?bounds=...`);

	// Simulate API delay
	await new Promise((resolve) => setTimeout(resolve, 300));

	// Filter by bounds if provided
	if (bounds) {
		return MOCK_VESSELS.filter(
			(v) =>
				v.lat >= bounds.minLat &&
				v.lat <= bounds.maxLat &&
				v.lon >= bounds.minLon &&
				v.lon <= bounds.maxLon
		);
	}

	return MOCK_VESSELS;
}

/**
 * Get vessel details by MMSI
 */
export async function getVesselDetails(mmsi: string): Promise<ShippingVessel | null> {
	// In production: fetch(`https://api.marinetraffic.com/vessel/${mmsi}`)
	await new Promise((resolve) => setTimeout(resolve, 200));

	const vessel = MOCK_VESSELS.find((v) => v.mmsi === mmsi);
	return vessel || null;
}
