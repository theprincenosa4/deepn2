export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
    const { query, category, country } = req.body;
    if (!query) return res.status(400).json({ error: 'Query required' });
  
    const prompt = `You are DeepN, a global product search engine. Search: "${query}"${category && category !== 'All' ? ` category: ${category}` : ''}. Country: ${country.name} (${country.currency}). Available retailers: ${country.retailers}.
  
  Respond ONLY with valid JSON — no markdown, no explanation:
  {"summary":"2-sentence expert buying guide","products":[{"name":"Full product name + model","retailer":"retailer from available list","price":"${country.currency} 299","oldPrice":"${country.currency} 349","rating":4.7,"reviews":12500,"badge":"best","badgeLabel":"Best Pick","icon":"emoji","pros":"One sentence reason to buy","url":"https://valid-retailer-search-url.com/search?q=product"}]}
  
  Rules: 4-5 products, different retailers, realistic ${country.currency} prices, one badge must be "best", include one budget option.`;
  
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }]
        })
      });
  
      const data = await response.json();
      const text = data.content?.find(b => b.type === 'text')?.text || '{}';
      const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
      res.status(200).json(parsed);
    } catch (err) {
      res.status(500).json({ error: 'Search failed', details: err.message });
    }
  }