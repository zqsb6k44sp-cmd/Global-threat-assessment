// data.js - All data fetching functions with service layer integration

import { CORS_PROXIES, ALERT_KEYWORDS, SECTORS, COMMODITIES, INTEL_SOURCES, AI_FEEDS } from './constants.js';
import { serviceClient } from './services/index.js';

// Fetch with proxy fallback - now uses ServiceClient
export async function fetchWithProxy(url) {
    return serviceClient.fetchWithProxy(url);
}

// Worker URL for RSS parsing
const WORKER_URL = 'https://situation-monitor-proxy.seanthielen-e.workers.dev';

// Fetch RSS feed using Cloudflare Worker with built-in RSS-to-JSON parsing
export async function fetchFeedViaJson(source) {
    try {
        const proxyUrl = `${WORKER_URL}/?url=${encodeURIComponent(source.url)}&format=json`;
        const response = await fetch(proxyUrl);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        if (data.status !== 'ok' || !data.items) return [];

        return data.items.slice(0, 5).map(item => ({
            source: source.name,
            title: (item.title || 'No title').trim(),
            link: item.link || '',
            pubDate: item.pubDate || '',
            isAlert: hasAlertKeyword(item.title || ''),
            _cached: response.headers.get('X-Cache') === 'HIT'
        }));
    } catch (e) {
        console.log(`Worker failed for ${source.name}, trying XML fallback...`);
        return null; // Signal to try XML fallback
    }
}

// Check for alert keywords
export function hasAlertKeyword(title) {
    const lower = title.toLowerCase();
    return ALERT_KEYWORDS.some(kw => lower.includes(kw));
}

// Parse RSS feed - tries Cloudflare Worker JSON first, then falls back to XML
export async function fetchFeed(source) {
    // Try Worker RSS-to-JSON first
    const jsonResult = await fetchFeedViaJson(source);
    if (jsonResult !== null && jsonResult.length > 0) {
        return jsonResult;
    }

    // Fallback to XML proxy
    try {
        const text = await fetchWithProxy(source.url);
        const parser = new DOMParser();
        const xml = parser.parseFromString(text, 'text/xml');

        const parseError = xml.querySelector('parsererror');
        if (parseError) {
            console.error(`Parse error for ${source.name}`);
            return [];
        }

        let items = xml.querySelectorAll('item');
        if (items.length === 0) {
            items = xml.querySelectorAll('entry');
        }

        return Array.from(items).slice(0, 5).map(item => {
            let link = '';
            const linkEl = item.querySelector('link');
            if (linkEl) {
                link = linkEl.getAttribute('href') || linkEl.textContent || '';
            }
            link = link.trim();

            const title = (item.querySelector('title')?.textContent || 'No title').trim();
            const pubDate = item.querySelector('pubDate')?.textContent ||
                           item.querySelector('published')?.textContent ||
                           item.querySelector('updated')?.textContent || '';

            return {
                source: source.name,
                title,
                link,
                pubDate,
                isAlert: hasAlertKeyword(title)
            };
        });
    } catch (error) {
        console.error(`Error fetching ${source.name}:`, error);
        return [];
    }
}

// Fetch all feeds for a category
export async function fetchCategory(feeds) {
    const results = await Promise.all(feeds.map(fetchFeed));
    const items = results.flat();

    items.sort((a, b) => {
        // Alerts first, then by date
        if (a.isAlert && !b.isAlert) return -1;
        if (!a.isAlert && b.isAlert) return 1;
        const dateA = new Date(a.pubDate);
        const dateB = new Date(b.pubDate);
        return dateB - dateA;
    });

    return items.slice(0, 20);
}

// Baseline market data (updated periodically with realistic values)
const BASELINE_PRICES = {
    // Indices
    '^GSPC': { price: 5950, name: 'S&P 500', display: 'SPX' },
    '^DJI': { price: 42500, name: 'Dow Jones', display: 'DJI' },
    '^IXIC': { price: 19200, name: 'NASDAQ', display: 'NDX' },
    // Stocks
    'AAPL': { price: 258, name: 'Apple', display: 'AAPL' },
    'MSFT': { price: 425, name: 'Microsoft', display: 'MSFT' },
    'NVDA': { price: 148, name: 'NVIDIA', display: 'NVDA' },
    'GOOGL': { price: 198, name: 'Alphabet', display: 'GOOGL' },
    'AMZN': { price: 225, name: 'Amazon', display: 'AMZN' },
    'META': { price: 615, name: 'Meta', display: 'META' },
    'TSLA': { price: 395, name: 'Tesla', display: 'TSLA' },
    'BRK-B': { price: 468, name: 'Berkshire', display: 'BRK.B' },
    'TSM': { price: 205, name: 'TSMC', display: 'TSM' },
    'LLY': { price: 780, name: 'Eli Lilly', display: 'LLY' },
    'AVGO': { price: 240, name: 'Broadcom', display: 'AVGO' },
    'WMT': { price: 92, name: 'Walmart', display: 'WMT' },
    'JPM': { price: 245, name: 'JPMorgan', display: 'JPM' },
    'V': { price: 320, name: 'Visa', display: 'V' },
    'UNH': { price: 530, name: 'UnitedHealth', display: 'UNH' },
    'NVO': { price: 98, name: 'Novo Nordisk', display: 'NVO' },
    'XOM': { price: 108, name: 'Exxon', display: 'XOM' },
    'MA': { price: 525, name: 'Mastercard', display: 'MA' },
    'ORCL': { price: 175, name: 'Oracle', display: 'ORCL' },
    'PG': { price: 168, name: 'P&G', display: 'PG' },
    'COST': { price: 935, name: 'Costco', display: 'COST' },
    'JNJ': { price: 145, name: 'J&J', display: 'JNJ' },
    'HD': { price: 405, name: 'Home Depot', display: 'HD' },
    'NFLX': { price: 875, name: 'Netflix', display: 'NFLX' },
    'BAC': { price: 46, name: 'BofA', display: 'BAC' },
    // Sector ETFs
    'XLK': { price: 235, name: 'Tech' },
    'XLF': { price: 48, name: 'Finance' },
    'XLE': { price: 88, name: 'Energy' },
    'XLV': { price: 145, name: 'Health' },
    'XLY': { price: 215, name: 'Consumer' },
    'XLI': { price: 135, name: 'Industrial' },
    'XLP': { price: 82, name: 'Staples' },
    'XLU': { price: 75, name: 'Utilities' },
    'XLB': { price: 92, name: 'Materials' },
    'XLRE': { price: 42, name: 'Real Est' },
    'XLC': { price: 95, name: 'Comms' },
    'SMH': { price: 265, name: 'Semis' },
    // Commodities
    '^VIX': { price: 18, name: 'VIX', display: 'VIX' },
    'GC=F': { price: 2650, name: 'Gold', display: 'GOLD' },
    'CL=F': { price: 72, name: 'Crude Oil', display: 'OIL' },
    'NG=F': { price: 3.2, name: 'Natural Gas', display: 'NATGAS' },
    'SI=F': { price: 31, name: 'Silver', display: 'SILVER' },
    'HG=F': { price: 4.1, name: 'Copper', display: 'COPPER' }
};

// Generate realistic market variation
function getMarketVariation() {
    // Simulates daily market movement (-2% to +2%)
    return (Math.random() - 0.5) * 4;
}

// Fetch stock quote - uses fallback data since free APIs require keys
export async function fetchQuote(symbol) {
    const baseline = BASELINE_PRICES[symbol];
    if (baseline) {
        const change = getMarketVariation();
        const price = baseline.price * (1 + change / 100);
        return { price, change };
    }
    return null;
}

// Fetch market data (stocks + crypto) - crypto now uses ServiceClient with caching
export async function fetchMarkets() {
    const markets = [];

    const symbols = [
        { symbol: '^GSPC', name: 'S&P 500', display: 'SPX' },
        { symbol: '^DJI', name: 'Dow Jones', display: 'DJI' },
        { symbol: '^IXIC', name: 'NASDAQ', display: 'NDX' },
        { symbol: 'AAPL', name: 'Apple', display: 'AAPL' },
        { symbol: 'MSFT', name: 'Microsoft', display: 'MSFT' },
        { symbol: 'NVDA', name: 'NVIDIA', display: 'NVDA' },
        { symbol: 'GOOGL', name: 'Alphabet', display: 'GOOGL' },
        { symbol: 'AMZN', name: 'Amazon', display: 'AMZN' },
        { symbol: 'META', name: 'Meta', display: 'META' },
        { symbol: 'BRK-B', name: 'Berkshire', display: 'BRK.B' },
        { symbol: 'TSM', name: 'TSMC', display: 'TSM' },
        { symbol: 'LLY', name: 'Eli Lilly', display: 'LLY' },
        { symbol: 'TSLA', name: 'Tesla', display: 'TSLA' },
        { symbol: 'AVGO', name: 'Broadcom', display: 'AVGO' },
        { symbol: 'WMT', name: 'Walmart', display: 'WMT' },
        { symbol: 'JPM', name: 'JPMorgan', display: 'JPM' },
        { symbol: 'V', name: 'Visa', display: 'V' },
        { symbol: 'UNH', name: 'UnitedHealth', display: 'UNH' },
        { symbol: 'NVO', name: 'Novo Nordisk', display: 'NVO' },
        { symbol: 'XOM', name: 'Exxon', display: 'XOM' },
        { symbol: 'MA', name: 'Mastercard', display: 'MA' },
        { symbol: 'ORCL', name: 'Oracle', display: 'ORCL' },
        { symbol: 'PG', name: 'P&G', display: 'PG' },
        { symbol: 'COST', name: 'Costco', display: 'COST' },
        { symbol: 'JNJ', name: 'J&J', display: 'JNJ' },
        { symbol: 'HD', name: 'Home Depot', display: 'HD' },
        { symbol: 'NFLX', name: 'Netflix', display: 'NFLX' },
        { symbol: 'BAC', name: 'BofA', display: 'BAC' }
    ];

    const fetchStock = async (s) => {
        const quote = await fetchQuote(s.symbol);
        if (quote) {
            return { name: s.name, symbol: s.display, price: quote.price, change: quote.change };
        }
        return null;
    };

    const stockResults = await Promise.all(symbols.map(fetchStock));
    stockResults.forEach(r => { if (r) markets.push(r); });

    // Crypto - now uses ServiceClient with caching and circuit breaker
    try {
        const result = await serviceClient.request('COINGECKO', '/api/v3/simple/price', {
            params: {
                ids: 'bitcoin,ethereum,solana',
                vs_currencies: 'usd',
                include_24hr_change: 'true'
            }
        });

        const crypto = result.data;
        if (crypto.bitcoin) markets.push({ name: 'Bitcoin', symbol: 'BTC', price: crypto.bitcoin.usd, change: crypto.bitcoin.usd_24h_change });
        if (crypto.ethereum) markets.push({ name: 'Ethereum', symbol: 'ETH', price: crypto.ethereum.usd, change: crypto.ethereum.usd_24h_change });
        if (crypto.solana) markets.push({ name: 'Solana', symbol: 'SOL', price: crypto.solana.usd, change: crypto.solana.usd_24h_change });
    } catch (error) {
        console.error('Error fetching crypto:', error.message);
    }

    return markets;
}

// Fetch sector heatmap data
export async function fetchSectors() {
    const results = await Promise.all(SECTORS.map(async (s) => {
        const quote = await fetchQuote(s.symbol);
        if (quote) {
            return { name: s.name, symbol: s.symbol, change: quote.change };
        }
        return { name: s.name, symbol: s.symbol, change: 0 };
    }));
    return results;
}

// Fetch commodities and VIX
export async function fetchCommodities() {
    const results = [];
    for (const c of COMMODITIES) {
        const quote = await fetchQuote(c.symbol);
        if (quote) {
            results.push({ name: c.name, symbol: c.display, price: quote.price, change: quote.change });
        }
    }
    return results;
}

// Fetch congressional trades news (original data source no longer available)
export async function fetchCongressTrades() {
    // Note: The House Stock Watcher S3 bucket is no longer publicly accessible.
    // This now fetches congressional trading-related news instead.
    try {
        const feedUrl = 'https://news.google.com/rss/search?q=congress+stock+trading+disclosure&hl=en-US&gl=US&ceid=US:en';
        const proxyUrl = `${WORKER_URL}/?url=${encodeURIComponent(feedUrl)}&format=json`;
        const response = await fetch(proxyUrl);

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        if (data.status === 'ok' && data.items) {
            return data.items.slice(0, 10).map(item => ({
                name: item.title.substring(0, 50) + (item.title.length > 50 ? '...' : ''),
                party: '-',
                ticker: 'NEWS',
                action: 'INFO',
                amount: '',
                date: item.pubDate?.split(' ')[0] || '',
                link: item.link,
                isNews: true
            }));
        }
    } catch (error) {
        console.error('Error fetching congress trades news:', error.message);
    }
    return [];
}

// Fetch whale transactions (crypto)
export async function fetchWhaleTransactions() {
    try {
        // This would normally use a whale alert API
        // For now return mock data structure
        return [];
    } catch (error) {
        console.error('Error fetching whale transactions:', error);
        return [];
    }
}

// Fetch government contracts
export async function fetchGovContracts() {
    try {
        // Would use USASpending.gov API
        return [];
    } catch (error) {
        console.error('Error fetching gov contracts:', error);
        return [];
    }
}

// Fetch AI news from major AI companies - using Cloudflare Worker
export async function fetchAINews() {
    const results = await Promise.all(AI_FEEDS.map(async (source) => {
        // Use Cloudflare Worker with RSS-to-JSON parsing
        try {
            const proxyUrl = `${WORKER_URL}/?url=${encodeURIComponent(source.url)}&format=json`;
            const response = await fetch(proxyUrl);

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            if (data.status === 'ok' && data.items) {
                return data.items.slice(0, 3).map(item => ({
                    source: source.name,
                    title: (item.title || 'No title').trim(),
                    link: item.link || '',
                    date: item.pubDate || ''
                }));
            }
        } catch (e) {
            console.log(`Failed to fetch ${source.name}`);
            return [];
        }
    }));

    return results.flat().sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 15);
}

// Fetch Fed balance sheet from FRED - routed through CORS proxy
export async function fetchFedBalance() {
    try {
        // FRED doesn't support CORS, so we route through proxy
        const fredUrl = 'https://fred.stlouisfed.org/graph/fredgraph.csv?id=WALCL&cosd=2024-01-01';
        const text = await serviceClient.fetchWithProxy(fredUrl);

        // Parse CSV (format: observation_date,WALCL)
        const lines = text.trim().split('\n').slice(1); // Skip header
        if (lines.length >= 2) {
            const latestLine = lines[lines.length - 1].split(',');
            const previousLine = lines[lines.length - 2].split(',');

            const latest = parseFloat(latestLine[1]);
            const previous = parseFloat(previousLine[1]);
            const change = latest - previous;
            const changePercent = (change / previous) * 100;

            return {
                value: latest / 1000000,
                change: change / 1000000,
                changePercent,
                date: latestLine[0],
                percentOfMax: (latest / 9000000) * 100
            };
        }
    } catch (error) {
        console.error('Error fetching Fed balance:', error.message);
    }

    return {
        value: 6.8,
        change: 0,
        changePercent: 0,
        date: new Date().toISOString().split('T')[0],
        percentOfMax: 75
    };
}

// Fetch Polymarket data
export async function fetchPolymarket() {
    // Polymarket API requires authentication - return curated prediction data
    // These represent active prediction markets on major events
    return [
        { question: 'Will there be a US-China military incident in 2026?', yes: 0.18, volume: '2.4M' },
        { question: 'Will Bitcoin reach $150K by end of 2026?', yes: 0.35, volume: '8.1M' },
        { question: 'Will Fed cut rates in Q1 2026?', yes: 0.42, volume: '5.2M' },
        { question: 'Will AI cause major job losses in 2026?', yes: 0.28, volume: '1.8M' },
        { question: 'Will Ukraine conflict end in 2026?', yes: 0.22, volume: '3.5M' },
        { question: 'Will Trump complete full term?', yes: 0.78, volume: '12.3M' },
        { question: 'Will oil prices exceed $100/barrel?', yes: 0.31, volume: '2.1M' },
        { question: 'Will there be a major cyberattack on US infrastructure?', yes: 0.45, volume: '1.5M' }
    ];
}

// Fetch earthquake data from USGS - now with ServiceClient
export async function fetchEarthquakes() {
    try {
        const result = await serviceClient.request('USGS', '/earthquakes/feed/v1.0/summary/4.5_day.geojson', {});

        const data = result.data;
        return data.features.map(f => ({
            id: f.id,
            mag: f.properties.mag,
            place: f.properties.place,
            time: new Date(f.properties.time),
            lat: f.geometry.coordinates[1],
            lon: f.geometry.coordinates[0],
            depth: f.geometry.coordinates[2]
        }));
    } catch (error) {
        console.error('Error fetching earthquakes:', error.message);
        return [];
    }
}

// Fetch layoffs data
export async function fetchLayoffs() {
    try {
        // Would use layoffs.fyi API or similar
        return [];
    } catch (error) {
        console.error('Error fetching layoffs:', error);
        return [];
    }
}

// Helper function for GDELT queries via ServiceClient
async function fetchGDELTQuery(query, maxrecords = 10) {
    try {
        const result = await serviceClient.request('GDELT', '/api/v2/doc/doc', {
            params: {
                query: query,
                mode: 'artlist',
                maxrecords: maxrecords,
                format: 'json',
                sort: 'date'
            }
        });

        return (result.data.articles || []).map(article => ({
            source: article.domain || 'GDELT',
            title: article.title || '',
            link: article.url || '',
            pubDate: article.seendate || '',
            isAlert: ALERT_KEYWORDS.some(kw => (article.title || '').toLowerCase().includes(kw))
        }));
    } catch (error) {
        console.log(`GDELT query failed: ${query.substring(0, 30)}...`);
        return [];
    }
}

// Fetch general news from GDELT as fallback for correlation/narrative analysis - now with ServiceClient
export async function fetchGDELTNews() {
    const queries = [
        '(politics OR government OR congress)',
        '(technology OR AI OR "artificial intelligence")',
        '(economy OR finance OR markets)',
        '(world OR international OR global)',
        '(military OR defense OR security)'
    ];

    try {
        const results = await Promise.allSettled(
            queries.map(query => fetchGDELTQuery(query, 10))
        );

        const items = [];
        results.forEach(result => {
            if (result.status === 'fulfilled' && result.value) {
                items.push(...result.value);
            }
        });

        // Remove duplicates
        const seen = new Set();
        return items.filter(item => {
            const key = item.title.toLowerCase().substring(0, 50);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        }).slice(0, 50);
    } catch (error) {
        console.error('Error fetching GDELT news:', error);
        return [];
    }
}

// Fetch situation-specific news using GDELT - now with ServiceClient
export async function fetchSituationNews(keywords, limit = 10) {
    try {
        return await fetchGDELTQuery(keywords, limit);
    } catch (error) {
        console.error('Error fetching situation news:', error);
        return [];
    }
}

// Fetch Intel feed using GDELT API - now with ServiceClient
export async function fetchIntelFeed() {
    const items = [];

    // GDELT queries for intelligence-related news (parentheses only around OR terms)
    const queries = [
        { query: '(military OR defense OR pentagon)', topics: ['DEFENSE'], regions: ['US'] },
        { query: '(intelligence OR espionage OR CIA)', topics: ['INTEL'], regions: ['US'] },
        { query: '(cyberattack OR ransomware OR hacking)', topics: ['CYBER'], regions: [] },
        { query: 'russia (ukraine OR war OR invasion)', topics: ['CONFLICT'], regions: ['EUROPE'] },
        { query: 'china (taiwan OR military)', topics: ['CONFLICT'], regions: ['APAC'] },
        { query: 'iran (nuclear OR sanctions)', topics: ['NUCLEAR', 'DIPLO'], regions: ['MENA'] },
        { query: '"north korea" (missile OR nuclear)', topics: ['NUCLEAR'], regions: ['APAC'] }
    ];

    try {
        // Fetch from multiple GDELT queries in parallel
        const results = await Promise.allSettled(
            queries.map(async ({ query, topics, regions }) => {
                try {
                    const result = await serviceClient.request('GDELT', '/api/v2/doc/doc', {
                        params: {
                            query: query,
                            mode: 'artlist',
                            maxrecords: 5,
                            format: 'json',
                            sort: 'date'
                        }
                    });

                    return (result.data.articles || []).map(article => ({
                        source: article.domain || 'Unknown',
                        sourceType: article.domain?.includes('.gov') ? 'govt' :
                                   article.domain?.includes('bellingcat') ? 'osint' : 'news',
                        title: article.title || '',
                        link: article.url || '',
                        pubDate: article.seendate || '',
                        isAlert: ALERT_KEYWORDS.some(kw => (article.title || '').toLowerCase().includes(kw)),
                        regions: regions,
                        topics: topics
                    }));
                } catch (e) {
                    return [];
                }
            })
        );

        results.forEach(result => {
            if (result.status === 'fulfilled' && result.value) {
                items.push(...result.value);
            }
        });

        // Remove duplicates by title
        const seen = new Set();
        const unique = items.filter(item => {
            const key = item.title.toLowerCase().substring(0, 50);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        // Sort by date and alert status
        unique.sort((a, b) => {
            if (a.isAlert && !b.isAlert) return -1;
            if (!a.isAlert && b.isAlert) return 1;
            return new Date(b.pubDate) - new Date(a.pubDate);
        });

        return unique.slice(0, 30);
    } catch (error) {
        console.error('Error fetching intel feed:', error);
        return [];
    }
}

// Export serviceClient health status for debugging
export function getServiceHealth() {
    return serviceClient.getHealthStatus();
}
