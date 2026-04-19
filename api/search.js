export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { query, category, country } = req.body || {};
  if (!query) return res.status(400).json({ error: 'Query required' });

  const countryName = country?.name || 'United States';
  const countryCurrency = country?.currency || 'USD';
  const countryRetailers = country?.retailers || 'Amazon, Walmart, Best Buy, Target';

  const prompt = `You are a product search engine. The user searched for: "${query}".
Country: ${countryName}. Currency: ${countryCurrency}. Retailers available: ${countryRetailers}.

Reply ONLY with this exact JSON format, no markdown, no extra text:
{
  "summary": "Two sentence buying guide for ${query}",
  "products": [
    {
      "name": "Product full name and model",
      "retailer": "Amazon",
      "price": "${countryCurrency} 499",
      "oldPrice": "${countryCurrency} 599",
      "rating": 4.7,
      "reviews": 15000,
      "badge": "best",
      "badgeLabel": "Best Pick",
      "icon": "🎮",
      "pros": "One sentence on why to buy this",
      "url": "https://www.amazon.com/s?k=${query.replace(/ /g, '+')}"
    }
  ]
}
Include 4 products total across different retailers. Make prices realistic in ${countryCurrency}. One must have badge "best", one must be a budget option with badge "hot".`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    const text = data.content?.[0]?.text || '{}';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ error: 'No JSON in response', raw: text });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return res.status(200).json(parsed);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}