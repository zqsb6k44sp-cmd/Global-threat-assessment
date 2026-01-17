/**
 * Shipping and maritime traffic types
 */

export interface ShippingRoute {
	id: string;
	name: string;
	coordinates: [number, number][]; // [lon, lat] pairs
	type: 'container' | 'tanker' | 'bulk' | 'general';
	color?: string;
}

export interface ShippingVessel {
	mmsi: string; // Maritime Mobile Service Identity
	name: string;
	lat: number;
	lon: number;
	course: number; // Heading in degrees
	speed: number; // Speed in knots
	type: string;
	destination?: string;
	eta?: string;
	flag?: string;
	length?: number;
	width?: number;
}

export interface VesselPosition {
	mmsi: string;
	lat: number;
	lon: number;
	timestamp: number;
}
