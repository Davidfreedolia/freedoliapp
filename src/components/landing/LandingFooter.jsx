// Footer unificat de la família Freedolia — idèntic a totes les webs
// (Freedolia, Flux, freeSEOlia, Freedoliapp, Freehubia). Autònom: estils
// propis, sense dependre de Tailwind ni de cap llibreria d'icones.
import React from 'react'

const PRODUCTS = [
  { name: 'Flux', url: 'https://fluxsaas.com' },
  { name: 'Freedoliapp', url: 'https://freedoliapp.com' },
  { name: 'freeSEOlia', url: 'https://freeseolia.com' },
  { name: 'Freehubia', url: 'https://freehubia.com' },
  { name: 'Freekalia', url: 'https://freekalia.com' },
]

const ECOSYSTEM = [
  { name: 'Freedolia', url: 'https://freedolia.com' },
  { name: 'Flux', url: 'https://fluxsaas.com' },
  { name: 'freeSEOlia', url: 'https://freeseolia.com' },
  { name: 'Freedoliapp', url: 'https://freedoliapp.com' },
  { name: 'Freehubia', url: 'https://freehubia.com' },
  { name: 'Freekalia', url: 'https://freekalia.com' },
  { name: 'David Says Hi', url: 'https://davidsayshi.com' },
]

const SERVICES = [
  'Automatització a mida',
  'Xatbot personalitzat',
  'Consultoria IA',
  'Landing page i web',
]

const SOCIALS = [
  { label: 'LinkedIn', url: 'https://linkedin.com/company/freedolia', path: 'M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z' },
  { label: 'X', url: 'https://x.com/freedolia', path: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z' },
  { label: 'Facebook', url: 'https://www.facebook.com/profile.php?id=61590402830385', path: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z' },
  { label: 'Blog', url: 'https://freedolia.com/blog', path: 'M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z' },
]

const FOOTER_CSS = `
.fdl-footer{background:#f3f5f4;border-top:1px solid #e3e8e6;color:#4b5957;}
.fdl-footer *{box-sizing:border-box;}
.fdl-footer a{color:inherit;text-decoration:none;}
.fdl-footer .fdl-in{max-width:1100px;margin:0 auto;padding:56px 24px;}
.fdl-footer .fdl-grid{display:grid;grid-template-columns:1.5fr 1fr 1fr 1fr;gap:40px;}
.fdl-footer .fdl-brand{font-size:18px;font-weight:700;color:#16302f;margin:0;letter-spacing:-.02em;}
.fdl-footer .fdl-muted{font-size:14px;color:#5d6b69;margin:8px 0 0;max-width:240px;line-height:1.5;}
.fdl-footer .fdl-soc{display:flex;flex-wrap:wrap;gap:10px;margin-top:18px;}
.fdl-footer .fdl-soc a{display:inline-flex;width:34px;height:34px;align-items:center;justify-content:center;border:1px solid #d9e0de;border-radius:999px;color:#5d6b69;transition:color .15s,border-color .15s;}
.fdl-footer .fdl-soc a:hover{color:#1F5F63;border-color:#1F5F63;}
.fdl-footer .fdl-head{font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:#7c8a88;margin:0 0 12px;}
.fdl-footer .fdl-list{list-style:none;margin:0;padding:0;}
.fdl-footer .fdl-list li{margin-top:8px;}
.fdl-footer .fdl-list a{font-size:14px;color:#4b5957;transition:color .15s;}
.fdl-footer .fdl-list a:hover{color:#1F5F63;}
.fdl-footer .fdl-bot{display:flex;flex-wrap:wrap;gap:12px;justify-content:space-between;align-items:center;margin-top:44px;padding-top:24px;border-top:1px solid #e3e8e6;font-size:13px;color:#7c8a88;}
.fdl-footer .fdl-legal{display:flex;gap:18px;}
.fdl-footer .fdl-legal a:hover{color:#1F5F63;}
@media (max-width:760px){.fdl-footer .fdl-grid{grid-template-columns:1fr 1fr;gap:32px;}}
`

export default function LandingFooter() {
  const year = new Date().getFullYear()
  return (
    <footer className="fdl-footer">
      <style>{FOOTER_CSS}</style>
      <div className="fdl-in">
        <div className="fdl-grid">
          <div>
            <p className="fdl-brand">Freedolia</p>
            <p className="fdl-muted">Esplugues de Llobregat · Treballem en remot per a tot el món</p>
            <div className="fdl-soc">
              {SOCIALS.map((s) => (
                <a key={s.label} href={s.url} target="_blank" rel="noreferrer" aria-label={s.label}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d={s.path} />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          <div>
            <p className="fdl-head">Productes</p>
            <ul className="fdl-list">
              {PRODUCTS.map((p) => (
                <li key={p.name}><a href={p.url} target="_blank" rel="noreferrer">{p.name}</a></li>
              ))}
            </ul>
          </div>

          <div>
            <p className="fdl-head">Serveis</p>
            <ul className="fdl-list">
              {SERVICES.map((s) => (
                <li key={s}><a href="https://freedolia.com/#serveis" target="_blank" rel="noreferrer">{s}</a></li>
              ))}
            </ul>
          </div>

          <div>
            <p className="fdl-head">Ecosistema</p>
            <ul className="fdl-list">
              {ECOSYSTEM.map((e) => (
                <li key={e.name}><a href={e.url} target="_blank" rel="noreferrer">{e.name}</a></li>
              ))}
            </ul>
          </div>
        </div>

        <div className="fdl-bot">
          <span>© {year} Freedolia</span>
          <span className="fdl-legal">
            <a href="https://freedolia.com/ca/legal/avis" target="_blank" rel="noreferrer">Avís legal</a>
            <a href="https://freedolia.com/ca/legal/privacitat" target="_blank" rel="noreferrer">Privacitat</a>
            <a href="https://freedolia.com/ca/legal/cookies" target="_blank" rel="noreferrer">Cookies</a>
          </span>
        </div>
      </div>
    </footer>
  )
}
