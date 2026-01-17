/**
 * Fishing vessel tracking types
 */

export interface FishingVessel {
	mmsi: string; // Maritime Mobile Service Identity
	name: string;
	lat: number;
	lon: number;
	course: number; // Heading in degrees
	speed: number; // Speed in knots
	flag: string; // Country flag/registration
	fishingType?: 'trawling' | 'longlining' | 'purse_seining' | 'gillnetting' | 'other';
	vesselClass?: string;
	length?: number;
	timestamp: number;
	catchData?: {
		species?: string[];
		estimatedCatch?: number;
		zone?: string;
	};
}

export interface FishingZone {
	id: string;
	name: string;
	coordinates: [number, number][]; // [lon, lat] pairs for polygon
	regulated: boolean;
	authority?: string;
}
