/**
 * Bloomberg feed store - Financial news aggregation
 */

import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import type { BloombergFeedItem } from '$lib/types';

export interface BloombergState {
	items: BloombergFeedItem[];
	loading: boolean;
	error: string | null;
	lastUpdated: number | null;
}

const BLOOMBERG_AUTO_REFRESH_INTERVAL = 30 * 1000; // 30 seconds

// Create initial state
function createInitialState(): BloombergState {
	return {
		items: [],
		loading: false,
		error: null,
		lastUpdated: null
	};
}

// Create Bloomberg store
function createBloombergStore() {
	const { subscribe, set, update } = writable<BloombergState>(createInitialState());

	let autoRefreshTimer: ReturnType<typeof setInterval> | null = null;

	return {
		subscribe,

		/**
		 * Set loading state
		 */
		setLoading(loading: boolean) {
			update((state) => ({
				...state,
				loading,
				error: loading ? null : state.error
			}));
		},

		/**
		 * Set error state
		 */
		setError(error: string | null) {
			update((state) => ({
				...state,
				loading: false,
				error
			}));
		},

		/**
		 * Set items
		 */
		setItems(items: BloombergFeedItem[]) {
			update((state) => ({
				...state,
				items,
				loading: false,
				error: null,
				lastUpdated: Date.now()
			}));
		},

		/**
		 * Clear all data
		 */
		clear() {
			set(createInitialState());
		},

		/**
		 * Setup auto-refresh with callback
		 */
		setupAutoRefresh(callback: () => void | Promise<void>) {
			if (autoRefreshTimer) {
				clearInterval(autoRefreshTimer);
			}

			if (browser) {
				autoRefreshTimer = setInterval(() => {
					void callback();
				}, BLOOMBERG_AUTO_REFRESH_INTERVAL);
			}
		},

		/**
		 * Stop auto-refresh
		 */
		stopAutoRefresh() {
			if (autoRefreshTimer) {
				clearInterval(autoRefreshTimer);
				autoRefreshTimer = null;
			}
		}
	};
}

// Export Bloomberg store
export const bloomberg = createBloombergStore();
