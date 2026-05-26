// Cards del hub de contingut de Freedolia, amb l'estètica de Freedoliapp.
// Llegeix del content-feed (site=freedoliapp, kind=card). Si no n'hi ha, no es pinta.
import { useEffect, useState } from 'react'

const HUB_FEED = 'https://lgswwlzbnjkmowduiypw.supabase.co/functions/v1/content-feed'

export function HubCards() {
  const [cards, setCards] = useState([])

  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch(`${HUB_FEED}?site=freedoliapp&kind=card&locale=es`)
        if (!r.ok) return
        const j = await r.json()
        const items = Array.isArray(j?.items) ? j.items : []
        setCards(items.map(it => ({
          id: it.id,
          title: it.title,
          excerpt: it.excerpt ?? null,
          image_url: it.image_url ?? null,
          category: it.category ?? null,
          cta_label: it.cta_label ?? null,
          cta_url: it.cta_url ?? null,
        })))
      } catch { /* noop */ }
    }
    void load()
  }, [])

  if (cards.length === 0) return null

  const cardStyle = {
    background: '#FFFFFF',
    border: '1px solid #E5E7EB',
    borderRadius: 12,
    overflow: 'hidden',
    textDecoration: 'none',
    color: 'inherit',
    display: 'block',
    height: '100%',
    transition: 'transform 0.15s, box-shadow 0.15s',
  }

  return (
    <section className="py-5" style={{ background: '#FFFAF3' }}>
      <div className="container">
        <div className="text-center mb-5">
          <h2 className="ld-section-title">Destacados</h2>
        </div>
        <div className="row g-4">
          {cards.map((c) => {
            const inner = (
              <>
                {c.image_url && (
                  <div aria-hidden style={{
                    background: `url(${c.image_url}) center/cover`,
                    aspectRatio: '16/9',
                  }} />
                )}
                <div style={{ padding: 20 }}>
                  {c.category && (
                    <span style={{
                      fontSize: 11, fontWeight: 700, color: '#E27A1A',
                      letterSpacing: '0.1em', textTransform: 'uppercase',
                    }}>{c.category}</span>
                  )}
                  <h3 style={{
                    margin: '8px 0', fontSize: 18, fontWeight: 700, color: '#1a1a1a', lineHeight: 1.3,
                  }}>{c.title}</h3>
                  {c.excerpt && (
                    <p style={{ margin: 0, color: '#555', fontSize: 14, lineHeight: 1.5 }}>
                      {c.excerpt}
                    </p>
                  )}
                  {c.cta_label && c.cta_url && (
                    <span style={{
                      marginTop: 12, display: 'inline-block',
                      fontWeight: 600, color: '#E27A1A',
                    }}>{c.cta_label} →</span>
                  )}
                </div>
              </>
            )
            return (
              <div key={c.id} className="col-12 col-sm-6 col-lg-4">
                {c.cta_url
                  ? <a href={c.cta_url} style={cardStyle}>{inner}</a>
                  : <article style={cardStyle}>{inner}</article>}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
