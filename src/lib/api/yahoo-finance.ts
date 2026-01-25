/**
 * Yahoo Finance API - Shared utility for fetching stock quotes
 */

import { logger, fetchWithProxy } from '$lib/config/api';

export interface YahooQuote {
	symbol: string;
	regularMarketPrice?: number;
	regularMarketChange?: number;
	regularMarketChangePercent?: number;
	regularMarketOpen?: number;
	regularMarketDayHigh?: number;
	regularMarketDayLow?: number;
	regularMarketPreviousClose?: number;
}

interface YahooQuoteResponse {
	quoteResponse: {
		result: YahooQuote[];
		error: null | { code: string; description: string };
	};
}

/**
 * Fetch multiple quotes from Yahoo Finance in a single request
 * @param symbols - Array of stock symbols (e.g., ['AAPL', 'MSFT', 'RELIANCE.NS'])
 * @returns Map of symbol to quote data
 */
export async function fetchYahooQuotes(symbols: string[]): Promise<Map<string, YahooQuote>> {
	const quotesMap = new Map<string, YahooQuote>();

	if (symbols.length === 0) {
		return quotesMap;
	}

	try {
		const symbolsParam = symbols.join(',');
		const yahooUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbolsParam}`;

		logger.log('Yahoo Finance API', `Fetching quotes for ${symbols.length} symbols`);

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

		logger.log('Yahoo Finance API', `Successfully fetched ${quotesMap.size} quotes`);

		return quotesMap;
	} catch (error) {
		logger.error('Yahoo Finance API', 'Error fetching quotes:', error);
		return quotesMap;
	}
}

/**
 * Fetch a single quote from Yahoo Finance
 * @param symbol - Stock symbol (e.g., 'AAPL', 'RELIANCE.NS')
 * @returns Quote data or null if not found
 */
export async function fetchYahooQuote(symbol: string): Promise<YahooQuote | null> {
	const quotesMap = await fetchYahooQuotes([symbol]);
	return quotesMap.get(symbol) ?? null;
}
