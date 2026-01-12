/**
 * Tests for Nifty stores
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';

// Mock $app/environment
vi.mock('$app/environment', () => ({
	browser: true
}));

describe('Nifty Stores', () => {
	beforeEach(async () => {
		vi.resetModules();
	});

	describe('nifty50 store', () => {
		it('should start with empty state', async () => {
			const { nifty50 } = await import('./nifty');

			const state = get(nifty50);
			expect(state.items).toEqual([]);
			expect(state.loading).toBe(false);
			expect(state.error).toBeNull();
			expect(state.lastUpdated).toBeNull();
		});

		it('should set loading state', async () => {
			const { nifty50 } = await import('./nifty');

			nifty50.setLoading(true);

			const state = get(nifty50);
			expect(state.loading).toBe(true);
			expect(state.error).toBeNull();
		});

		it('should set error state', async () => {
			const { nifty50 } = await import('./nifty');

			nifty50.setError('Test error');

			const state = get(nifty50);
			expect(state.loading).toBe(false);
			expect(state.error).toBe('Test error');
		});

		it('should set items', async () => {
			const { nifty50 } = await import('./nifty');

			const items = [
				{
					symbol: 'RELIANCE.NS',
					name: 'Reliance Industries',
					price: 2500,
					changePercent: 1.5,
					logoUrl: 'https://example.com/logo.png'
				},
				{
					symbol: 'TCS.NS',
					name: 'Tata Consultancy Services',
					price: 3500,
					changePercent: -0.5,
					logoUrl: 'https://example.com/logo2.png'
				}
			];

			nifty50.setItems(items);

			const state = get(nifty50);
			expect(state.items).toEqual(items);
			expect(state.loading).toBe(false);
			expect(state.error).toBeNull();
			expect(state.lastUpdated).not.toBeNull();
		});

		it('should clear all data', async () => {
			const { nifty50 } = await import('./nifty');

			// Set some data first
			nifty50.setItems([
				{
					symbol: 'RELIANCE.NS',
					name: 'Reliance Industries',
					price: 2500,
					changePercent: 1.5,
					logoUrl: 'https://example.com/logo.png'
				}
			]);

			// Clear it
			nifty50.clear();

			const state = get(nifty50);
			expect(state.items).toEqual([]);
			expect(state.loading).toBe(false);
			expect(state.error).toBeNull();
			expect(state.lastUpdated).toBeNull();
		});
	});

	describe('niftyNext50 store', () => {
		it('should start with empty state', async () => {
			const { niftyNext50 } = await import('./nifty');

			const state = get(niftyNext50);
			expect(state.items).toEqual([]);
			expect(state.loading).toBe(false);
			expect(state.error).toBeNull();
			expect(state.lastUpdated).toBeNull();
		});

		it('should set items', async () => {
			const { niftyNext50 } = await import('./nifty');

			const items = [
				{
					symbol: 'ADANIGREEN.NS',
					name: 'Adani Green Energy',
					price: 1500,
					changePercent: 2.0,
					logoUrl: 'https://example.com/logo.png'
				}
			];

			niftyNext50.setItems(items);

			const state = get(niftyNext50);
			expect(state.items).toEqual(items);
			expect(state.loading).toBe(false);
			expect(state.error).toBeNull();
			expect(state.lastUpdated).not.toBeNull();
		});
	});

	describe('derived stores', () => {
		it('should derive loading state for nifty50', async () => {
			const { nifty50, isNifty50Loading } = await import('./nifty');

			nifty50.setLoading(true);

			const loading = get(isNifty50Loading);
			expect(loading).toBe(true);
		});

		it('should derive loading state for niftyNext50', async () => {
			const { niftyNext50, isNiftyNext50Loading } = await import('./nifty');

			niftyNext50.setLoading(true);

			const loading = get(isNiftyNext50Loading);
			expect(loading).toBe(true);
		});
	});
});
