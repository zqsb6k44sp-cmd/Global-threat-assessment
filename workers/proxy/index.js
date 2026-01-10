// Cloudflare Worker - CORS Proxy with RSS parsing and caching
// Deploy: wrangler deploy

const ALLOWED_ORIGINS = [
    'api.rss2json.com',
    'api.gdeltproject.org',
    'api.coingecko.com',
    'fred.stlouisfed.org',
    'earthquake.usgs.gov',
    // News RSS feeds
    'feeds.bbci.co.uk',
    'feeds.npr.org',
    'rss.nytimes.com',
    'rss.cnn.com',
    'www.theguardian.com',
    'news.google.com',
    // Tech feeds
    'news.ycombinator.com',
    'hnrss.org',
    'feeds.arstechnica.com',
    'www.theverge.com',
    'www.technologyreview.com',
    'feeds.feedburner.com',
    'arxiv.org',
    'rss.arxiv.org',
    // Finance feeds
    'www.cnbc.com',
    'feeds.marketwatch.com',
    'finance.yahoo.com',
    'www.ft.com',
    // Government feeds
    'www.whitehouse.gov',
    'www.federalreserve.gov',
    'www.sec.gov',
    'www.defense.gov',
    'www.cisa.gov',
    // Intel/Defense feeds
    'www.csis.org',
    'www.brookings.edu',
    'www.cfr.org',
    'www.defenseone.com',
    'warontherocks.com',
    'breakingdefense.com',
    'www.thedrive.com',
    'thediplomat.com',
    'www.al-monitor.com',
    'www.bellingcat.com',
    'krebsonsecurity.com',
    // AI news feeds
    'openai.com',
    'venturebeat.com',
    'blog.google',
    'news.mit.edu',
    'huggingface.co',
    'deepmind.google'
];

// Cache TTLs by content type/host (in seconds)
function getCacheTtl(contentType, host) {
    // RSS/XML feeds: 5 minutes
    if (contentType.includes('xml') || contentType.includes('rss')) return 300;
    // GDELT JSON: 3 minutes (real-time news)
    if (host.includes('gdelt')) return 180;
    // CoinGecko: 1 minute (crypto volatility)
    if (host.includes('coingecko')) return 60;
    // USGS: 5 minutes (earthquake data)
    if (host.includes('usgs')) return 300;
    // FRED: 1 hour (weekly economic data)
    if (host.includes('fred')) return 3600;
    // Default: 2 minutes
    return 120;
}

// Parse RSS/Atom XML to JSON
function parseRssToJson(xml, feedUrl) {
    const result = {
        status: 'ok',
        feed: {
            url: feedUrl,
            title: '',
            link: '',
            description: ''
        },
        items: []
    };

    // Extract feed metadata
    result.feed.title = extractTag(xml, 'title') || '';
    result.feed.link = extractTag(xml, 'link') || feedUrl;
    result.feed.description = extractTag(xml, 'description') || extractTag(xml, 'subtitle') || '';

    // Check if it's Atom format
    const isAtom = xml.includes('<feed') && xml.includes('xmlns="http://www.w3.org/2005/Atom"');

    if (isAtom) {
        // Parse Atom format
        const entries = xml.match(/<entry[\s\S]*?<\/entry>/gi) || [];
        for (const entry of entries.slice(0, 20)) {
            const item = {
                title: extractTag(entry, 'title') || '',
                pubDate: extractTag(entry, 'published') || extractTag(entry, 'updated') || '',
                link: extractAtomLink(entry) || '',
                description: extractTag(entry, 'summary') || extractTag(entry, 'content') || '',
                content: extractTag(entry, 'content') || ''
            };
            if (item.title || item.link) {
                result.items.push(item);
            }
        }
    } else {
        // Parse RSS format
        const items = xml.match(/<item[\s\S]*?<\/item>/gi) || [];
        for (const item of items.slice(0, 20)) {
            const parsed = {
                title: extractTag(item, 'title') || '',
                pubDate: extractTag(item, 'pubDate') || extractTag(item, 'dc:date') || '',
                link: extractTag(item, 'link') || extractTag(item, 'guid') || '',
                description: extractTag(item, 'description') || '',
                content: extractTag(item, 'content:encoded') || extractTag(item, 'content') || ''
            };
            if (parsed.title || parsed.link) {
                result.items.push(parsed);
            }
        }
    }

    return result;
}

// Extract content from XML tag
function extractTag(xml, tagName) {
    // Handle namespaced tags (e.g., content:encoded)
    const escapedTag = tagName.replace(':', '\\:');

    // Try CDATA first
    const cdataRegex = new RegExp(`<${escapedTag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${escapedTag}>`, 'i');
    const cdataMatch = xml.match(cdataRegex);
    if (cdataMatch) {
        return decodeHtmlEntities(cdataMatch[1].trim());
    }

    // Try regular content
    const regex = new RegExp(`<${escapedTag}[^>]*>([\\s\\S]*?)<\\/${escapedTag}>`, 'i');
    const match = xml.match(regex);
    if (match) {
        return decodeHtmlEntities(match[1].trim());
    }

    return null;
}

// Extract link from Atom entry (handles href attribute)
function extractAtomLink(entry) {
    // Look for link with rel="alternate" or no rel (default)
    const linkMatch = entry.match(/<link[^>]*href=["']([^"']+)["'][^>]*>/i);
    if (linkMatch) {
        return linkMatch[1];
    }
    return extractTag(entry, 'link');
}

// Decode common HTML entities
function decodeHtmlEntities(text) {
    if (!text) return text;
    return text
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
        .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));
}

// Check if content is RSS/Atom XML
function isRssFeed(contentType, body) {
    if (contentType.includes('xml') || contentType.includes('rss') || contentType.includes('atom')) {
        return true;
    }
    // Check body for RSS/Atom markers
    if (body && (body.includes('<rss') || body.includes('<feed') || body.includes('<channel'))) {
        return true;
    }
    return false;
}

// Add CORS headers to response
function addCorsHeaders(response, origin) {
    const headers = new Headers(response.headers);
    headers.set('Access-Control-Allow-Origin', origin || '*');
    headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Accept');
    headers.set('Access-Control-Max-Age', '86400');
    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
    });
}

// Validate target URL
function isAllowedOrigin(targetUrl) {
    try {
        const url = new URL(targetUrl);
        return ALLOWED_ORIGINS.some(allowed => url.hostname.includes(allowed));
    } catch {
        return false;
    }
}

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const origin = request.headers.get('Origin') || '*';

        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                headers: {
                    'Access-Control-Allow-Origin': origin,
                    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Accept',
                    'Access-Control-Max-Age': '86400'
                }
            });
        }

        // Only allow GET requests
        if (request.method !== 'GET') {
            return new Response('Method not allowed', { status: 405 });
        }

        // Get target URL and format preference from query params
        const targetUrl = url.searchParams.get('url');
        const wantJson = url.searchParams.get('format') === 'json';

        if (!targetUrl) {
            return new Response(JSON.stringify({
                error: 'Missing url parameter',
                usage: 'Add ?url=<encoded-url>&format=json to fetch and parse RSS feeds'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Validate allowed origins
        if (!isAllowedOrigin(targetUrl)) {
            return new Response(JSON.stringify({
                error: 'Domain not allowed',
                allowed: ALLOWED_ORIGINS
            }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Create cache key (include format param for JSON-parsed versions)
        const cacheKeyUrl = wantJson ? `${targetUrl}__json` : targetUrl;
        const cacheKey = new Request(cacheKeyUrl, request);
        const cache = caches.default;
        let cachedResponse = await cache.match(cacheKey);

        if (cachedResponse) {
            const response = addCorsHeaders(cachedResponse, origin);
            response.headers.set('X-Cache', 'HIT');
            response.headers.set('X-Cache-Time', cachedResponse.headers.get('X-Cache-Time') || 'unknown');
            return response;
        }

        // Fetch from origin
        try {
            const targetUrlObj = new URL(targetUrl);

            const response = await fetch(targetUrl, {
                headers: {
                    'User-Agent': 'SituationMonitor/1.0 (https://github.com/situation-monitor)',
                    'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml, */*'
                },
                cf: {
                    cacheTtl: getCacheTtl('', targetUrlObj.hostname),
                    cacheEverything: true
                }
            });

            if (!response.ok) {
                return addCorsHeaders(new Response(JSON.stringify({
                    error: `Upstream error: ${response.status} ${response.statusText}`,
                    url: targetUrl
                }), {
                    status: response.status,
                    headers: { 'Content-Type': 'application/json' }
                }), origin);
            }

            const contentType = response.headers.get('content-type') || '';
            const body = await response.text();
            const cacheTtl = getCacheTtl(contentType, targetUrlObj.hostname);

            let finalBody = body;
            let finalContentType = contentType;

            // Parse RSS to JSON if requested and content is RSS/Atom
            if (wantJson && isRssFeed(contentType, body)) {
                try {
                    const parsed = parseRssToJson(body, targetUrl);
                    finalBody = JSON.stringify(parsed);
                    finalContentType = 'application/json';
                } catch (parseError) {
                    // If parsing fails, return error
                    return addCorsHeaders(new Response(JSON.stringify({
                        status: 'error',
                        error: 'Failed to parse RSS feed',
                        message: parseError.message
                    }), {
                        status: 500,
                        headers: { 'Content-Type': 'application/json' }
                    }), origin);
                }
            }

            // Create response
            const finalResponse = new Response(finalBody, {
                status: 200,
                headers: {
                    'Content-Type': finalContentType,
                    'X-Cache': 'MISS',
                    'X-Cache-TTL': String(cacheTtl)
                }
            });

            // Store in cache
            if (cacheTtl > 0) {
                const cacheHeaders = new Headers(finalResponse.headers);
                cacheHeaders.set('Cache-Control', `public, max-age=${cacheTtl}`);
                cacheHeaders.set('X-Cache-Time', new Date().toISOString());

                ctx.waitUntil(
                    cache.put(cacheKey, new Response(finalBody, {
                        status: 200,
                        headers: cacheHeaders
                    }))
                );
            }

            return addCorsHeaders(finalResponse, origin);

        } catch (error) {
            return addCorsHeaders(new Response(JSON.stringify({
                error: 'Proxy error',
                message: error.message,
                url: targetUrl
            }), {
                status: 502,
                headers: { 'Content-Type': 'application/json' }
            }), origin);
        }
    }
};
