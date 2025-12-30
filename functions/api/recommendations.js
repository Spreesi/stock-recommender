export const onRequestGet = async ({ request, env }) => {
    const url = new URL(request.url);
    const type = url.searchParams.get('type') || 'stocks'; // 'stocks' or 'etfs'
    const region = url.searchParams.get('region') || 'global';
    const sector = url.searchParams.get('sector') || 'all';

    const key = `${type}_${region}_${sector}`;
    const cachedData = await env.RECOMMENDATIONS_KV.get(key);

    if (cachedData) {
        return new Response(cachedData, {
            headers: { 'Content-Type': 'application/json' },
        });
    }

    // Fallback if no data
    return new Response(JSON.stringify({ recommendations: [], message: 'Data not available yet. Try again later.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
    });
};