/**
 * Panel configuration
 */

export interface PanelConfig {
	name: string;
	priority: 1 | 2 | 3;
}

export type PanelId =
	| 'map'
	| 'bloomberg'
	| 'politics'
	| 'tech'
	| 'finance'
	| 'gov'
	| 'monitors'
	| 'crypto'
	| 'polymarket'
	| 'whales'
	| 'mainchar'
	| 'printer'
	| 'contracts'
	| 'ai'
	| 'layoffs'
	| 'venezuela'
	| 'greenland'
	| 'iran'
	| 'intel'
	| 'correlation'
	| 'narrative'
	| 'nse50'
	| 'indianmarkets'
	| 'fishing'
	| 'globalfishing'
	| 'marinetraffic'
	| 'conflicttracker'
	| 'defense';

export const PANELS: Record<PanelId, PanelConfig> = {
	map: { name: 'Global Map', priority: 1 },
	bloomberg: { name: 'Bloomberg Live Feed', priority: 1 },
	politics: { name: 'World / Geopolitical', priority: 1 },
	tech: { name: 'Technology / AI', priority: 1 },
	finance: { name: 'Financial', priority: 1 },
	gov: { name: 'Government / Policy', priority: 2 },
	monitors: { name: 'My Monitors', priority: 1 },
	crypto: { name: 'Crypto', priority: 2 },
	polymarket: { name: 'Polymarket', priority: 2 },
	whales: { name: 'Whale Watch', priority: 3 },
	mainchar: { name: 'Main Character', priority: 2 },
	printer: { name: 'Money Printer', priority: 2 },
	contracts: { name: 'Gov Contracts', priority: 3 },
	ai: { name: 'AI Arms Race', priority: 3 },
	layoffs: { name: 'Layoffs Tracker', priority: 3 },
	venezuela: { name: 'Venezuela Situation', priority: 2 },
	greenland: { name: 'Greenland Situation', priority: 2 },
	iran: { name: 'Iran Situation', priority: 2 },
	intel: { name: 'Intel Feed', priority: 2 },
	correlation: { name: 'Correlation Engine', priority: 1 },
	narrative: { name: 'Narrative Tracker', priority: 1 },
	nse50: { name: 'US Heat Map', priority: 2 },
	indianmarkets: { name: 'Indian Markets', priority: 2 },
	fishing: { name: 'Deep Sea Fishing Traffic', priority: 2 },
	globalfishing: { name: 'Global Fishing Watch', priority: 2 },
	marinetraffic: { name: 'Marine Traffic', priority: 3 },
	conflicttracker: { name: 'War Watch', priority: 2 },
	defense: { name: 'Defense Stocks', priority: 2 }
};

export const NON_DRAGGABLE_PANELS: PanelId[] = ['map'];

export const MAP_ZOOM_MIN = 1;
export const MAP_ZOOM_MAX = 4;
export const MAP_ZOOM_STEP = 0.5;
