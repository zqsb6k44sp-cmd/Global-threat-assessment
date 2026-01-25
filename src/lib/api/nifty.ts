/**
 * Nifty API - Fetch Nifty 50 and Nifty Next 50 stock data from Yahoo Finance
 */

import { NIFTY_50, NIFTY_NEXT_50 } from '$lib/config/nifty';
import type { NiftyStock } from '$lib/types';
import { logger } from '$lib/config/api';
import { fetchYahooQuotes } from './yahoo-finance';

/**
 * Generate logo URL for Indian stock
 * Using clearbit logo API (free, no auth required)
 */
function getLogoUrl(symbol: string): string {
	// Remove .NS suffix for the logo lookup
	const cleanSymbol = symbol.replace('.NS', '');
	// Try to map symbol to common domain names for better logo resolution
	const domainMap: Record<string, string> = {
		RELIANCE: 'ril.com',
		TCS: 'tcs.com',
		HDFCBANK: 'hdfcbank.com',
		INFY: 'infosys.com',
		ICICIBANK: 'icicibank.com',
		HINDUNILVR: 'hul.co.in',
		ITC: 'itcportal.com',
		SBIN: 'sbi.co.in',
		BHARTIARTL: 'airtel.in',
		WIPRO: 'wipro.com'
	};

	const domain = domainMap[cleanSymbol];
	if (domain) {
		// Use Clearbit Logo API for known domains
		return `https://logo.clearbit.com/${domain}`;
	}

	// Fallback to a generic placeholder with first letter
	const firstLetter = cleanSymbol.charAt(0);
	return `https://ui-avatars.com/api/?name=${firstLetter}&size=60&background=random`;
}

/**
 * Create an empty Nifty stock item
 */
function createEmptyNiftyStock(symbol: string, name: string): NiftyStock {
	return {
		symbol,
		name,
		price: NaN,
		changePercent: NaN,
		logoUrl: getLogoUrl(symbol)
	};
}

/**
 * Fetch Nifty 50 stocks data from Yahoo Finance
 */
export async function fetchNifty50(): Promise<NiftyStock[]> {
	try {
		logger.log('Nifty API', 'Fetching Nifty 50 from Yahoo Finance');

		const symbols = NIFTY_50.map((s) => s.symbol);
		const quotesMap = await fetchYahooQuotes(symbols);

		return NIFTY_50.map((stock) => {
			const quote = quotesMap.get(stock.symbol);

			return {
				symbol: stock.symbol,
				name: stock.name,
				price: quote?.regularMarketPrice ?? NaN,
				changePercent: quote?.regularMarketChangePercent ?? NaN,
				logoUrl: getLogoUrl(stock.symbol)
			};
		});
	} catch (error) {
		logger.error('Nifty API', 'Error fetching Nifty 50:', error);
		return NIFTY_50.map((stock) => createEmptyNiftyStock(stock.symbol, stock.name));
	}
}

/**
 * Fetch Nifty Next 50 stocks data from Yahoo Finance
 */
export async function fetchNiftyNext50(): Promise<NiftyStock[]> {
	try {
		logger.log('Nifty API', 'Fetching Nifty Next 50 from Yahoo Finance');

		const symbols = NIFTY_NEXT_50.map((s) => s.symbol);
		const quotesMap = await fetchYahooQuotes(symbols);

		return NIFTY_NEXT_50.map((stock) => {
			const quote = quotesMap.get(stock.symbol);

			return {
				symbol: stock.symbol,
				name: stock.name,
				price: quote?.regularMarketPrice ?? NaN,
				changePercent: quote?.regularMarketChangePercent ?? NaN,
				logoUrl: getLogoUrl(stock.symbol)
			};
		});
	} catch (error) {
		logger.error('Nifty API', 'Error fetching Nifty Next 50:', error);
		return NIFTY_NEXT_50.map((stock) => createEmptyNiftyStock(stock.symbol, stock.name));
	}
}
