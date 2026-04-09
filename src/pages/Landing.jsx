import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import '../styles/landing.css'

/* ─── Data ─── */
const PLANS = [
  {
    code: 'starter', name: 'Starter',
    monthly: 29, yearly: 24,
    desc: 'For solo sellers managing their first products.',
    features: [
      '1 user', 'Up to 10 active projects', 'Suppliers & purchase orders',
      'Inventory tracking', 'Profit calculator',
      'Google Drive integration', 'Email support',
    ],
    cta: 'Start free trial', highlight: false,
  },
  {
    code: 'growth', name: 'Growth',
    monthly: 79, yearly: 66,
    desc: 'For growing brands and small teams.',
    features: [
      'Up to 3 users', 'Unlimited projects', 'Everything in Starter',
      'Amazon SP-API integration', 'Financial ledger & exports',
      'Alerts & automations', 'Priority email support',
    ],
    cta: 'Start free trial', highlight: true, badge: 'Most popular',
  },
  {
    code: 'scale', name: 'Scale',
    monthly: 199, yearly: 166,
    desc: 'For multi-brand operations and agencies.',
    features: [
      'Unlimited users', 'Unlimited projects', 'Everything in Growth',
      'Multi-marketplace support', 'AI-powered decisions',
      'Quarterly export packs', 'Dedicated support',
    ],
    cta: 'Contact us', highlight: false,
  },
]

const FEATURES = [
  { icon: '📦', title: 'Suppliers & Sourcing', desc: 'Centralise supplier data, terms, quotes and samples. Know exactly who you buy from and on what conditions.' },
  { icon: '📋', title: 'Purchase Orders', desc: 'Create and track POs from quote to delivery. Auto-generate PDFs, manage payments and follow logistics.' },
  { icon: '📊', title: 'Inventory Control', desc: 'Live view of units in FBA, in transit, at forwarder and in production. Never run out of stock again.' },
  { icon: '💰', title: 'Profit & Margins', desc: 'True profitability per product. Combine COGS, Amazon fees, freight and ads to see your real margin.' },
  { icon: '🔗', title: 'Amazon SP-API', desc: 'Connect your Seller Central account and automatically import settlement data across all marketplaces.' },
  { icon: '🤖', title: 'Smart Decisions', desc: 'Surface stock, margin and cash alerts automatically. Know what to reorder, when and in what quantity.' },
]

const STEPS = [
  { title: 'Add your suppliers', desc: 'Import or create your supplier database with contacts, terms, and Alibaba/1688 references.' },
  { title: 'Create purchase orders', desc: 'Generate professional POs with one click. Track production progress and payment milestones.' },
  { title: 'Track shipments', desc: 'Follow your stock from factory to FBA warehouse. Get alerts when things are delayed.' },
  { title: 'Monitor inventory', desc: 'See exactly how many units you have in each location and when to reorder.' },
  { title: 'Understand your profit', desc: 'Connect all data sources for a complete P&L view per product, marketplace and period.' },
]

const TESTIMONIALS = [
  { quote: 'Before Freedoliapp I had 4 spreadsheets and 3 WhatsApp groups to manage a single PO. Now everything is in one place and I actually trust the numbers.', name: 'Marta S.', role: 'Amazon FBA seller · ES', initial: 'M' },
  { quote: 'The PO PDF generation alone saved us hours every week. But what really changed things was having supplier terms, samples and shipments all linked together.', name: 'Jordi P.', role: 'Operations manager · Multi-brand', initial: 'J' },
  { quote: 'I can finally see my real margin per product after Amazon fees, freight and customs. The profit view is something I could never build properly in Excel.', name: 'Laura M.', role: 'Brand owner · Amazon EU', initial: 'L' },
]

const FAQS = [
  { q: 'Is there a free trial?', a: 'Yes — all plans include a 14-day free trial. No credit card required.' },
  { q: 'Can I switch plans at any time?', a: 'Yes, upgrades and downgrades take effect immediately. You will be charged or credited on a prorated basis.' },
  { q: 'Does it work with multiple Amazon marketplaces?', a: 'Yes. Connect ES, DE, FR, IT, UK, US and more to a single workspace. Data is unified across all marketplaces.' },
  { q: 'What do I need to connect Amazon SP-API?', a: 'A Seller Central account with API access. Setup takes about 5 minutes through the guided wizard. Available on Growth and Scale plans.' },
  { q: 'Is my data secure?', a: 'Data is stored on Supabase (EU region, ISO 27001 infrastructure). All connections are encrypted and row-level security is enforced per organisation.' },
]

/* ─── Mockup ─── */
function DashboardMockup() {
  const bars = [55, 70, 45, 80, 65, 90, 75]
  const colors = ['#6ECBC3','#F26C6C','#F4E27A','#3FBF9A','#6ECBC3','#F26C6C','#3FBF9A']
  return (
    <div className="ld-mockup">
      <div className="ld-mockup__chrome">
        <div className="ld-mockup__dot ld-mockup__dot--r" />
        <div className="ld-mockup__dot ld-mockup__dot--y" />
        <div className="ld-mockup__dot ld-mockup__dot--g" />
        <div className="ld-mockup__url">freedoliapp.com/app/dashboard</div>
      </div>
      <div className="ld-mockup__body">
        <div className="ld-mockup__sidebar">
          <div className="ld-mockup__sidebar-logo">F</div>
          <div className="ld-mockup__nav-item ld-mockup__nav-item--active" />
          <div className="ld-mockup__nav-item ld-mockup__nav-item--dim" />
          <div className="ld-mockup__nav-item ld-mockup__nav-item--dim" />
          <div className="ld-mockup__nav-item ld-mockup__nav-item--dim" />
          <div className="ld-mockup__nav-item ld-mockup__nav-item--dim" />
          <div className="ld-mockup__nav-item ld-mockup__nav-item--dim" />
        </div>
        <div className="ld-mockup__main">
          <div className="ld-mockup__topbar">
            <span className="ld-mockup__topbar-title">Dashboard</span>
            <div className="ld-mockup__topbar-right">
              <div className="ld-mockup__nav-item ld-mockup__nav-item--dim" style={{width:24,height:24,borderRadius:6}} />
              <div className="ld-mockup__avatar" />
            </div>
          </div>
          <div className="ld-mockup__content">
            <div className="ld-mockup__kpis">
              <div className="ld-mockup__kpi">
                <div className="ld-mockup__kpi-label">Revenue</div>
                <div className="ld-mockup__kpi-val">€47.3k</div>
                <div className="ld-mockup__kpi-trend">↑ 18%</div>
              </div>
              <div className="ld-mockup__kpi">
                <div className="ld-mockup__kpi-label">Active POs</div>
                <div className="ld-mockup__kpi-val">12</div>
                <div className="ld-mockup__kpi-trend">3 in transit</div>
              </div>
              <div className="ld-mockup__kpi">
                <div className="ld-mockup__kpi-label">FBA Units</div>
                <div className="ld-mockup__kpi-val">2,840</div>
                <div className="ld-mockup__kpi-trend ld-mockup__kpi-trend--warn">⚠ 2 low</div>
              </div>
              <div className="ld-mockup__kpi">
                <div className="ld-mockup__kpi-label">Margin</div>
                <div className="ld-mockup__kpi-val">34%</div>
                <div className="ld-mockup__kpi-trend">↑ 2pts</div>
              </div>
            </div>
            <div className="ld-mockup__lower">
              <div className="ld-mockup__panel">
                <div className="ld-mockup__panel-title">Revenue — last 7 days</div>
                <div className="ld-mockup__bars">
                  {bars.map((h, i) => (
                    <div key={i} className="ld-mockup__bar" style={{height:`${h}%`, background: colors[i]}} />
                  ))}
                </div>
              </div>
              <div className="ld-mockup__panel">
                <div className="ld-mockup__panel-title">Purchase Orders</div>
                <div className="ld-mockup__table">
                  <div className="ld-mockup__row">
                    <span className="ld-mockup__row-name">Guangzhou Textile Co.</span>
                    <span className="ld-mockup__badge ld-mockup__badge--transit">In transit</span>
                    <span className="ld-mockup__row-amt">€4,200</span>
                  </div>
                  <div className="ld-mockup__row">
                    <span className="ld-mockup__row-name">Yiwu Best Supply</span>
                    <span className="ld-mockup__badge ld-mockup__badge--prod">Production</span>
                    <span className="ld-mockup__row-amt">€6,800</span>
                  </div>
                  <div className="ld-mockup__row">
                    <span className="ld-mockup__row-name">ShenZhen ProPack</span>
                    <span className="ld-mockup__badge ld-mockup__badge--draft">Draft</span>
                    <span className="ld-mockup__row-amt">€2,100</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Main Component ─── */
export default function Landing() {
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [yearly, setYearly] = useState(false)
  const [openFaq, setOpenFaq] = useState(null)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <div className="ld-page">

      {/* ── Nav ── */}
      <nav className={`ld-nav${scrolled ? ' ld-nav--scrolled' : ''}`}>
        <Link to="/" className="ld-nav__logo">
          <img src="/brand/freedoliapp/logo/logo_master.png" alt="Freedoliapp"
            onError={e => { e.target.style.display='none' }} />
          <span className="ld-nav__logo-text">freedoliapp</span>
        </Link>
        <div className="ld-nav__links">
          <a href="#features" className="ld-nav__link">Features</a>
          <a href="#how" className="ld-nav__link">How it works</a>
          <a href="#pricing" className="ld-nav__link">Pricing</a>
        </div>
        <div className="ld-nav__actions">
          <button className="ld-btn ld-btn--ghost" onClick={() => navigate('/login')}>Log in</button>
          <button className="ld-btn ld-btn--primary" onClick={() => navigate('/trial')}>Start free trial</button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="ld-hero">
        <div className="ld-hero__content">
          <div className="ld-hero__eyebrow">
            <span className="ld-hero__eyebrow-dot" />
            Built for Amazon FBA operators
          </div>
          <h1 className="ld-hero__title">
            Run your Amazon business from <em>one place</em>
          </h1>
          <p className="ld-hero__sub">
            Freedoliapp connects suppliers, purchase orders, inventory and profit
            into a single workspace — so you always know what's happening and what to do next.
          </p>
          <div className="ld-hero__ctas">
            <button className="ld-btn ld-btn--primary-dark" onClick={() => navigate('/trial')}>
              Start free trial
            </button>
            <a href="#how" className="ld-btn ld-btn--outline-dark">
              See how it works
            </a>
          </div>
          <div className="ld-hero__stats">
            <div>
              <div className="ld-hero__stat-value">7</div>
              <div className="ld-hero__stat-label">Product phases</div>
            </div>
            <div>
              <div className="ld-hero__stat-value">14</div>
              <div className="ld-hero__stat-label">Day free trial</div>
            </div>
            <div>
              <div className="ld-hero__stat-value">€0</div>
              <div className="ld-hero__stat-label">Setup cost</div>
            </div>
          </div>
        </div>
        <div className="ld-hero__visual">
          <DashboardMockup />
        </div>
      </section>

      {/* ── Trust bar ── */}
      <div className="ld-trust">
        <span className="ld-trust__label">Trusted by sellers across</span>
        {['Amazon ES','Amazon DE','Amazon FR','Amazon IT','Amazon UK'].map(m => (
          <span key={m} className="ld-trust__item">
            <span className="ld-trust__item-dot" />{m}
          </span>
        ))}
      </div>

      {/* ── Problem ── */}
      <section className="ld-section">
        <div className="ld-problem">
          <div className="ld-problem__grid">
            <div>
              <span className="ld-section-label">The problem</span>
              <h2 className="ld-section-title">Managing Amazon ops shouldn't need 10 different tools</h2>
              <p className="ld-section-sub">Most teams spread everything across spreadsheets, WhatsApp threads and email chains. The data is scattered and nobody fully trusts the numbers.</p>
              <ul className="ld-problem__list">
                {[
                  'Excel files for inventory and purchase orders',
                  'WhatsApp threads for supplier communication',
                  'Shipping documents buried in email attachments',
                  'Separate tools for profit tracking and analytics',
                  'No single source of truth for the whole operation',
                ].map(item => (
                  <li key={item} className="ld-problem__item">
                    <span className="ld-problem__item-x">✕</span>{item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="ld-problem__solution">
              <div className="ld-problem__solution-title">One workspace for your entire operation</div>
              <ul className="ld-problem__solution-checks">
                {[
                  'Suppliers, POs and inventory all linked together',
                  'Real profit per product after all costs',
                  'Alerts when stock is low or margins drop',
                  'Auto-generated PO PDFs with your company data',
                  'Amazon SP-API to import sales automatically',
                ].map(item => (
                  <li key={item} className="ld-problem__check">
                    <span className="ld-problem__check-icon">✓</span>{item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="ld-section ld-section--alt" id="features">
        <div className="ld-features">
          <div className="ld-section-header">
            <span className="ld-section-label">Features</span>
            <h2 className="ld-section-title">Everything your Amazon business needs</h2>
            <p className="ld-section-sub">A single workspace for sourcing, orders, inventory and profitability.</p>
          </div>
          <div className="ld-features__grid">
            {FEATURES.map(f => (
              <div key={f.title} className="ld-feature-card">
                <div className="ld-feature-card__icon">{f.icon}</div>
                <div className="ld-feature-card__title">{f.title}</div>
                <div className="ld-feature-card__desc">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="ld-section" id="how">
        <div className="ld-how">
          <div className="ld-section-header">
            <span className="ld-section-label">How it works</span>
            <h2 className="ld-section-title">From idea to Amazon in 5 steps</h2>
          </div>
          <div className="ld-how__steps">
            {STEPS.map((s, i) => (
              <div key={s.title} className="ld-how__step">
                <div className="ld-how__step-left">
                  <div className="ld-how__step-num">{i + 1}</div>
                  <div className="ld-how__step-line" />
                </div>
                <div className="ld-how__step-content">
                  <div className="ld-how__step-title">{s.title}</div>
                  <div className="ld-how__step-desc">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="ld-section ld-section--alt" id="pricing">
        <div className="ld-pricing">
          <div className="ld-section-header">
            <span className="ld-section-label">Pricing</span>
            <h2 className="ld-section-title">Simple, transparent pricing</h2>
            <p className="ld-section-sub">Start free for 14 days. No credit card required.</p>
          </div>
          <div className="ld-pricing__toggle">
            <span className={`ld-pricing__toggle-label${!yearly ? ' ld-pricing__toggle-label--active' : ''}`}>Monthly</span>
            <button
              className={`ld-pricing__toggle-switch${yearly ? ' ld-pricing__toggle-switch--on' : ''}`}
              onClick={() => setYearly(y => !y)}
              aria-label="Toggle yearly billing"
            >
              <span className="ld-pricing__toggle-knob" />
            </button>
            <span className={`ld-pricing__toggle-label${yearly ? ' ld-pricing__toggle-label--active' : ''}`}>Yearly</span>
            {yearly && <span className="ld-pricing__save">Save 17%</span>}
          </div>
          <div className="ld-pricing__grid">
            {PLANS.map(plan => (
              <div key={plan.code} className={`ld-pricing-card${plan.highlight ? ' ld-pricing-card--highlight' : ''}`}>
                {plan.badge && <div className="ld-pricing-card__badge">{plan.badge}</div>}
                <div className="ld-pricing-card__name">{plan.name}</div>
                <div className="ld-pricing-card__price">
                  <span className="ld-pricing-card__currency">€</span>
                  <span className="ld-pricing-card__amount">{yearly ? plan.yearly : plan.monthly}</span>
                </div>
                <div className="ld-pricing-card__period">per month{yearly ? ', billed yearly' : ''}</div>
                <div className="ld-pricing-card__desc">{plan.desc}</div>
                <div className="ld-pricing-card__divider" />
                <ul className="ld-pricing-card__features">
                  {plan.features.map(f => (
                    <li key={f} className="ld-pricing-card__feature">
                      <span className="ld-pricing-card__check">✓</span>{f}
                    </li>
                  ))}
                </ul>
                <button className="ld-pricing-card__cta" onClick={() => navigate(plan.code === 'scale' ? '/login' : '/trial')}>
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="ld-section">
        <div className="ld-testimonials">
          <div className="ld-section-header">
            <span className="ld-section-label">What sellers say</span>
            <h2 className="ld-section-title">Trusted by Amazon operators</h2>
          </div>
          <div className="ld-testimonials__grid">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="ld-testimonial-card">
                <div className="ld-testimonial-card__stars">★★★★★</div>
                <div className="ld-testimonial-card__quote">"{t.quote}"</div>
                <div className="ld-testimonial-card__author">
                  <div className="ld-testimonial-card__avatar">{t.initial}</div>
                  <div>
                    <div className="ld-testimonial-card__name">{t.name}</div>
                    <div className="ld-testimonial-card__role">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="ld-section ld-section--alt">
        <div className="ld-faq">
          <div className="ld-section-header">
            <span className="ld-section-label">FAQ</span>
            <h2 className="ld-section-title">Common questions</h2>
          </div>
          <div className="ld-faq__list">
            {FAQS.map((faq, i) => (
              <div key={faq.q} className={`ld-faq__item${openFaq === i ? ' ld-faq__item--open' : ''}`}>
                <button className="ld-faq__question" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  {faq.q}
                  <span className="ld-faq__chevron">▾</span>
                </button>
                <div className="ld-faq__answer">{faq.a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="ld-cta-section">
        <span className="ld-section-label">Get started</span>
        <h2 className="ld-section-title">Ready to run your Amazon operations from one place?</h2>
        <p className="ld-section-sub">Start a free 14-day trial and see how Freedoliapp fits your current workflows. No credit card required.</p>
        <div className="ld-cta-section__btns">
          <button className="ld-btn ld-btn--primary-dark" onClick={() => navigate('/trial')}>Start free trial</button>
          <button className="ld-btn ld-btn--outline-dark" onClick={() => navigate('/login')}>Log in</button>
        </div>
        <p className="ld-cta-section__note">14-day free trial · No credit card required · Cancel anytime</p>
      </section>

      {/* ── Footer ── */}
      <footer className="ld-footer">
        <div className="ld-footer__top">
          <div>
            <div className="ld-footer__brand-name">freedoliapp</div>
            <p className="ld-footer__brand-desc">The operating system for Amazon FBA operators. Suppliers, POs, inventory and profit in one place.</p>
          </div>
          <div>
            <div className="ld-footer__col-title">Product</div>
            <ul className="ld-footer__links">
              <li><a href="#features" className="ld-footer__link">Features</a></li>
              <li><a href="#pricing" className="ld-footer__link">Pricing</a></li>
              <li><a href="#how" className="ld-footer__link">How it works</a></li>
            </ul>
          </div>
          <div>
            <div className="ld-footer__col-title">Account</div>
            <ul className="ld-footer__links">
              <li><Link to="/trial" className="ld-footer__link">Free trial</Link></li>
              <li><Link to="/login" className="ld-footer__link">Log in</Link></li>
            </ul>
          </div>
          <div>
            <div className="ld-footer__col-title">Legal</div>
            <ul className="ld-footer__links">
              <li><Link to="/privacy" className="ld-footer__link">Privacy</Link></li>
              <li><Link to="/terms" className="ld-footer__link">Terms</Link></li>
              <li><Link to="/cookies" className="ld-footer__link">Cookies</Link></li>
            </ul>
          </div>
          <div>
            <div className="ld-footer__col-title">Company</div>
            <ul className="ld-footer__links">
              <li><span className="ld-footer__link">Freedolia</span></li>
              <li><span className="ld-footer__link">Barcelona, Spain</span></li>
            </ul>
          </div>
        </div>
        <div className="ld-footer__bottom">
          <span className="ld-footer__copy">© 2025 Freedoliapp · David Castellà Gil · NIF 52626358N</span>
          <span className="ld-footer__copy">Built for Amazon operators across Europe</span>
        </div>
      </footer>

    </div>
  )
}
