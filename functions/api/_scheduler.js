export const onRequest = async ({ env }) => {
    // Placeholder response for manual triggers
    return new Response('Scheduler running');
};

export const scheduled = async (event, env, ctx) => {
    const API_KEY = env.FMP_API_KEY;

    // Generate all 40 combinations programmatically
    const types = ['stocks', 'etfs'];
    const regions = ['north-america', 'europe', 'asia', 'global'];
    const sectors = ['technology', 'healthcare', 'financials', 'energy', 'consumer'];

    const combinations = [];
    for (const type of types) {
        for (const region of regions) {
            for (const sector of sectors) {
                combinations.push({ type, region, sector });
            }
        }
    }

    const sectorMap = {
        technology: 'Technology',
        healthcare: 'Healthcare',
        financials: 'Financial Services',
        energy: 'Energy',
        consumer: 'Consumer Cyclical'
    };

    // Exchange codes for region filtering
    const regionExchanges = {
        'north-america': ['NASDAQ', 'NYSE', 'AMEX'],
        'europe': ['LSE', 'AMS', 'ETR', 'PAR'],
        'asia': ['JPX', 'HKSE', 'SSE', 'KRX'],
        'global': [] // No filter for global
    };

    for (const combo of combinations) {
        const key = `${combo.type}_${combo.region}_${combo.sector}`;

        try {
            let url, data;

            if (combo.type === 'etfs') {
                // ETFs - get full list and filter by sector keywords
                url = `https://financialmodelingprep.com/api/v3/etf/list?apikey=${API_KEY}`;
                const response = await fetch(url);
                data = await response.json();

                // Filter ETFs by sector keywords in name
                const sectorKeywords = {
                    technology: ['tech', 'technology', 'software', 'internet', 'cyber', 'digital'],
                    healthcare: ['health', 'medical', 'biotech', 'pharma'],
                    financials: ['financial', 'bank', 'finance'],
                    energy: ['energy', 'oil', 'gas', 'solar', 'renewable'],
                    consumer: ['consumer', 'retail', 'e-commerce']
                };

                data = data.filter(etf => {
                    const name = (etf.name || '').toLowerCase();
                    return sectorKeywords[combo.sector].some(keyword => name.includes(keyword));
                });

            } else {
                // Stocks - use screener with sector filter
                url = `https://financialmodelingprep.com/api/v3/stock-screener?apikey=${API_KEY}&limit=200`;

                if (combo.sector) {
                    url += `&sector=${encodeURIComponent(sectorMap[combo.sector])}`;
                }

                const response = await fetch(url);
                data = await response.json();

                // Filter by region/exchange if not global
                if (combo.region !== 'global' && regionExchanges[combo.region]) {
                    data = data.filter(stock =>
                        regionExchanges[combo.region].includes(stock.exchangeShortName)
                    );
                }
            }

            // Sort by market cap and get top 5
            data.sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0));
            const top5 = data.slice(0, 5).map(item => ({
                symbol: item.symbol || item.ticker,
                name: item.companyName || item.name,
                reason: `Prominent ${combo.type === 'etfs' ? 'ETF' : 'company'} in the ${combo.sector} sector with strong market presence.`
            }));

            // Store in KV with 24-hour expiration
            await env.RECOMMENDATIONS_KV.put(
                key,
                JSON.stringify({ recommendations: top5 }),
                { expirationTtl: 86400 }
            );

            console.log(`SUCCESS: Updated ${key}: ${top5.length} recommendations`);

        } catch (error) {
            console.error(`ERROR: Failed to update ${key}:`, error);

            // Store empty array on error so frontend doesn't break
            await env.RECOMMENDATIONS_KV.put(
                key,
                JSON.stringify({ recommendations: [] }),
                { expirationTtl: 86400 }
            );
        }
    }

    console.log(`Completed update for ${combinations.length} combinations`);
};