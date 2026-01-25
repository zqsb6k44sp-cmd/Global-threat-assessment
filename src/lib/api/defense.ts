/**
 * Defense Stocks API - Fetch top defense stocks from Yahoo Finance
 */

import { logger, fetchWithProxy } from '$lib/config/api';

export interface DefenseStock {
	symbol: string;
	name: string;
	description: string;
	price: number;
	change: number;
	changePercent: number;
	logoUrl: string;
}

interface YahooQuoteResponse {
	quoteResponse: {
		result: Array<{
			symbol: string;
			regularMarketPrice?: number;
			regularMarketChange?: number;
			regularMarketChangePercent?: number;
		}>;
		error: null | { code: string; description: string };
	};
}

/**
 * Fetch quotes from Yahoo Finance
 */
async function fetchYahooQuotes(
	symbols: string[]
): Promise<Map<string, YahooQuoteResponse['quoteResponse']['result'][0]>> {
	const quotesMap = new Map();

	try {
		const symbolsParam = symbols.join(',');
		const yahooUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbolsParam}`;

		logger.log('Defense API', `Fetching quotes for ${symbols.length} symbols from Yahoo Finance`);

		const response = await fetchWithProxy(yahooUrl);

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		const data: YahooQuoteResponse = await response.json();

		if (data.quoteResponse?.result) {
			data.quoteResponse.result.forEach((quote) => {
				quotesMap.set(quote.symbol, quote);
			});
		}

		return quotesMap;
	} catch (error) {
		logger.error('Defense API', 'Error fetching Yahoo Finance quotes:', error);
		return quotesMap;
	}
}

/**
 * Generate logo URL for defense stock using multiple strategies
 */
function getDefenseLogoUrl(symbol: string): string {
	// Try Yahoo Finance logo API first
	const yahooLogoUrl = `https://storage.googleapis.com/iex/api/logos/${symbol}.png`;

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
	// Use Clearbit as primary, with Yahoo Finance as fallback in the img tag
	if (domain) {
		return `https://logo.clearbit.com/${domain}`;
	}

	// Final fallback to Yahoo Finance logo or generic avatar
	return yahooLogoUrl;
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
