/**
 * Bloomberg API - Fetch financial news from Bloomberg-style sources
 */

import { FEEDS } from '$lib/config/feeds';
import type { BloombergFeedItem } from '$lib/types';
import { fetchWithProxy, API_DELAYS, logger } from '$lib/config/api';

/**
 * Simple hash function to generate unique IDs from URLs
 */
function hashCode(str: string): string {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash; // Convert to 32bit integer
	}
	return Math.abs(hash).toString(36);
}

/**
 * Delay helper
 */
function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * RSS Feed Item interface
 */
interface RSSFeedItem {
	title?: string;
	link?: string;
	guid?: string;
	pubDate?: string;
	isoDate?: string;
	published?: string;
	contentSnippet?: string;
	description?: string;
}

/**
 * Parse an RSS feed using the proxy
 */
async function parseFeed(feedUrl: string, sourceName: string): Promise<BloombergFeedItem[]> {
	try {
		const response = await fetchWithProxy(feedUrl);
		if (!response.ok) {
			logger.warn('Bloomberg API', `Failed to fetch from ${sourceName}: ${response.status}`);
			return [];
		}

		const data = await response.json();

		if (!data?.items || !Array.isArray(data.items)) {
			logger.warn('Bloomberg API', `No items in feed from ${sourceName}`);
			return [];
		}

		return data.items.slice(0, 5).map((item: RSSFeedItem) => {
			const id = hashCode(item.link || item.guid || item.title + sourceName);
			const pubDate = item.pubDate || item.isoDate || item.published || new Date().toISOString();
			const timestamp = new Date(pubDate).getTime();

			return {
				id,
				title: item.title || 'Untitled',
				link: item.link || item.guid || '#',
				pubDate,
				timestamp,
				description: item.contentSnippet || item.description || '',
				source: sourceName
			};
		});
	} catch (error) {
		logger.error('Bloomberg API', `Error parsing feed from ${sourceName}:`, error);
		return [];
	}
}

/**
 * Fetch Bloomberg-style financial news from multiple sources
 */
export async function fetchBloombergFeed(): Promise<BloombergFeedItem[]> {
	try {
		logger.log('Bloomberg API', 'Fetching Bloomberg-style financial news feeds');

		const bloombergFeeds = FEEDS.bloomberg;
		const allItems: BloombergFeedItem[] = [];

		// Fetch feeds with delays to avoid rate limiting
		for (let i = 0; i < bloombergFeeds.length; i++) {
			const feed = bloombergFeeds[i];
			const items = await parseFeed(feed.url, feed.name);
			allItems.push(...items);

			// Add delay between feeds to avoid overwhelming the proxy
			if (i < bloombergFeeds.length - 1) {
				await delay(API_DELAYS.BETWEEN_FEEDS);
			}
		}

		// Sort by timestamp (most recent first) and take top 15
		const sortedItems = allItems.sort((a, b) => b.timestamp - a.timestamp).slice(0, 15);

		logger.log('Bloomberg API', `Fetched ${sortedItems.length} Bloomberg feed items`);
		return sortedItems;
	} catch (error) {
		logger.error('Bloomberg API', 'Error fetching Bloomberg feed:', error);
		throw error;
	}
}
