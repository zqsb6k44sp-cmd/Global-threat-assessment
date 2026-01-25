/**
 * Defense Stocks API - Fetch top defense stocks from Yahoo Finance
 */

import { logger } from '$lib/config/api';
import { fetchYahooQuotes } from './yahoo-finance';

export interface DefenseStock {
	symbol: string;
	name: string;
	description: string;
	price: number;
	change: number;
	changePercent: number;
	logoUrl: string;
}

/**
 * Generate logo URL for defense stock using multiple strategies
 */
function getDefenseLogoUrl(symbol: string): string {
	// Fallback domain map for Clearbit
	const domainMap: Record<string, string> = {
		LMT: 'lockheedmartin.com',
		RTX: 'rtx.com',
		NOC: 'northropgrumman.com',
		BA: 'boeing.com',
		GD: 'gd.com',
		LHX: 'l3harris.com',
		HII: 'huntingtoningalls.com',
		TXT: 'textron.com',
		LDOS: 'leidos.com',
		KTOS: 'kratosdefense.com'
	};

	const domain = domainMap[symbol];
	if (domain) {
		// Use Clearbit as primary logo source
		return `https://logo.clearbit.com/${domain}`;
	}

	// Fallback to IEX logo API
	return `https://storage.googleapis.com/iex/api/logos/${symbol}.png`;
}

/**
 * Defense stock configurations
 */
const DEFENSE_STOCKS = [
	{
		symbol: 'LMT',
		name: 'Lockheed Martin',
		description: 'Aerospace & defense - F-35, missiles, space systems'
	},
	{
		symbol: 'RTX',
		name: 'RTX Corporation',
		description: 'Aerospace & defense - Missiles, aircraft engines, cybersecurity'
	},
	{
		symbol: 'NOC',
		name: 'Northrop Grumman',
		description: 'Aerospace & defense - B-2 bomber, Global Hawk, cyber solutions'
	},
	{ symbol: 'BA', name: 'Boeing', description: 'Aerospace - Commercial & military aircraft' },
	{
		symbol: 'GD',
		name: 'General Dynamics',
		description: 'Defense - Combat vehicles, submarines, business jets'
	},
	{
		symbol: 'LHX',
		name: 'L3Harris Technologies',
		description: 'Defense technology - Communications, electronic systems'
	},
	{
		symbol: 'HII',
		name: 'Huntington Ingalls',
		description: 'Shipbuilding - Aircraft carriers, submarines'
	},
	{
		symbol: 'TXT',
		name: 'Textron',
		description: 'Aviation & defense - Bell helicopters, Cessna aircraft'
	},
	{
		symbol: 'LDOS',
		name: 'Leidos Holdings',
		description: 'Defense services - IT, engineering, scientific solutions'
	},
	{
		symbol: 'KTOS',
		name: 'Kratos Defense',
		description: 'Defense technology - Drones, satellite communications'
	}
];

/**
 * Create an empty defense stock item
 */
function createEmptyDefenseStock(symbol: string, name: string, description: string): DefenseStock {
	return {
		symbol,
		name,
		description,
		price: NaN,
		change: NaN,
		changePercent: NaN,
		logoUrl: getDefenseLogoUrl(symbol)
	};
}

/**
 * Fetch defense stocks data from Yahoo Finance
 */
export async function fetchDefenseStocks(): Promise<DefenseStock[]> {
	const createEmptyStocks = () =>
		DEFENSE_STOCKS.map((stock) =>
			createEmptyDefenseStock(stock.symbol, stock.name, stock.description)
		);

	try {
		logger.log('Defense API', 'Fetching defense stocks from Yahoo Finance');

		const symbols = DEFENSE_STOCKS.map((s) => s.symbol);
		const quotesMap = await fetchYahooQuotes(symbols);

		return DEFENSE_STOCKS.map((stock) => {
			const quote = quotesMap.get(stock.symbol);

			return {
				symbol: stock.symbol,
				name: stock.name,
				description: stock.description,
				price: quote?.regularMarketPrice ?? NaN,
				change: quote?.regularMarketChange ?? NaN,
				changePercent: quote?.regularMarketChangePercent ?? NaN,
				logoUrl: getDefenseLogoUrl(stock.symbol)
			};
		});
	} catch (error) {
		logger.error('Defense API', 'Error fetching defense stocks:', error);
		return createEmptyStocks();
	}
}
