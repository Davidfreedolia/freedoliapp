export default async function handler(req, res) {
  const asinInput = (req.query?.asin || '').toString().trim()
  const marketInput = (req.query?.market || 'es').toString().trim().toLowerCase()
  const asin = /^B0[A-Z0-9]{8}$/i.test(asinInput) ? asinInput.toUpperCase() : ''
  if (!asin) {
    return res.status(400).json({ error: 'invalid_asin' })
  }

  const market = /^([a-z]{2}|co\.[a-z]{2})$/i.test(marketInput) ? marketInput : 'es'
  const product_url = `https://www.amazon.${market}/dp/${asin}`
  const thumb_url = `https://m.media-amazon.com/images/P/${asin}.01._SX300_SY300_.jpg`

  const fallback = {
    asin,
    title: `ASIN ${asin}`,
    short_description: '',
    thumb_url,
    product_url,
    source: 'fallback'
  }

  let extractedTitle = ''
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    const htmlRes = await fetch(product_url, {
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36',
        'accept-language': 'ca-ES,ca;q=0.9,es;q=0.8,en;q=0.7'
      },
      signal: controller.signal
    })
    clearTimeout(timeout)
    if (htmlRes.ok) {
      const html = await htmlRes.text()
      const titleMatch = html.match(/id=["']productTitle["'][^>]*>([\s\S]*?)<\//i)
        || html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
      extractedTitle = titleMatch?.[1]?.replace(/\s+/g, ' ').trim() || ''
    }
  } catch (_) {}

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return res.status(200).json({
      ...fallback,
      title: extractedTitle || fallback.title
    })
  }

  try {
    const aiRes = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        input: [
          { role: 'system', content: 'You output ONLY valid JSON.' },
          {
            role: 'user',
            content: [
              'Given raw title and url, return JSON with keys: title, short_description.',
              'Language: Catalan. Title max 120 chars. short_description max 180 chars. No markdown.',
              `RAW_TITLE: ${extractedTitle || ''}`,
              `URL: ${product_url}`
            ].join('\n')
          }
        ],
        temperature: 0.2
      })
    })
    if (!aiRes.ok) {
      return res.status(200).json({
        ...fallback,
        title: extractedTitle || fallback.title
      })
    }
    const aiJson = await aiRes.json()
    const outputText = aiJson?.output_text || ''
    let parsed = {}
    try {
      parsed = JSON.parse(outputText)
    } catch (_) {
      parsed = {}
    }
    const title = (parsed.title || extractedTitle || fallback.title).toString().trim()
    const short_description = (parsed.short_description || '').toString().trim()
    return res.status(200).json({
      asin,
      product_url,
      thumb_url,
      title,
      short_description,
      source: 'ai'
    })
  } catch (_) {
    return res.status(200).json({
      ...fallback,
      title: extractedTitle || fallback.title
    })
  }
}
