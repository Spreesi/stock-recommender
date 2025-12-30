export const onRequest = async ({ env }) => {
    // Placeholder response for manual triggers
    return new Response('Scheduler running');
};

export const scheduled = async (event, env, ctx) => {
    const API_KEY = env.FMP_API_KEY;
    const combinations = [
        // Define key combinations to pre-compute (expand as needed)
        { type: 'stocks', region: 'north-america', sector: 'technology' },
        { type: 'stocks', region: 'north-america', sector: 'healthcare' },
        // Add more for europe, asia, etc., and etfs
    ];

    for (const combo of combinations) {
        let url = `https://financialmodelingprep.com/api/v3/stock-screener?apikey=${API_KEY}&limit=50`;
        if (combo.sector && combo.sector !== 'all') {
            const sectorMap = { technology: 'Technology', healthcare: 'Healthcare', financials: 'Financial Services', energy: 'Energy', consumer: 'Consumer Cyclical' };
            url += `&sector=${encodeURIComponent(sectorMap[combo.sector] || combo.sector)}`;
        }
        // Add region/exchange mapping as needed

        try {
            const response = await fetch(url);
            const data = await response.json();
            data.sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0));
            const top5 = data.slice(0, 5).map(item => ({
                symbol: item.symbol,
                name: item.companyName,
                reason: `Strong market presence in the ${combo.sector} sector.`
            }));

            const key = `${combo.type}_${combo.region}_${combo.sector}`;
            await env.RECOMMENDATIONS_KV.put(key, JSON.stringify({ recommendations: top5 }), { expirationTtl: 86400 }); // 24-hour TTL
        } catch (error) {
            console.error(`Error updating ${key}:`, error);
        }
    }
};