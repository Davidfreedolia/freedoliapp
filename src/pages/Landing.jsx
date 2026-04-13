import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import '../styles/landing.css'

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
          {[1,2,3,4,5,6].map(i => <div key={i} className="ld-mockup__nav-item ld-mockup__nav-item--dim" />)}
        </div>
        <div className="ld-mockup__main">
          <div className="ld-mockup__topbar">
            <span className="ld-mockup__topbar-title">Dashboard</span>
            <div className="ld-mockup__topbar-right">
              <div className="ld-mockup__nav-item ld-mockup__nav-item--dim" style={{width:24,height:24,borderRadius:6}} />
              <div className="ld-mockup__avatar" />
            </div>
          </div>
          <div className="ld-mockup__kpis">
            {[
              {label:'Revenue',value:'€18,420'},
              {label:'Orders',value:'142'},
              {label:'Margin',value:'34%'},
              {label:'In transit',value:'3'},
            ].map(kpi => (
              <div key={kpi.label} className="ld-mockup__kpi">
                <div className="ld-mockup__kpi-label">{kpi.label}</div>
                <div className="ld-mockup__kpi-value">{kpi.value}</div>
              </div>
            ))}
          </div>
          <div className="ld-mockup__chart">
            <div className="ld-mockup__chart-bars">
              {bars.map((h, i) => (
                <div key={i} className="ld-mockup__bar" style={{height:`${h}%`, background: colors[i]}} />
              ))}
            </div>
          </div>
          <div className="ld-mockup__rows">
            {[
              {label:'Supplier A — PO #1042',status:'In transit',amt:'€4,200'},
              {label:'Supplier B — PO #1039',status:'Delivered',amt:'€2,100'},
            ].map(row => (
              <div key={row.label} className="ld-mockup__row">
                <div className="ld-mockup__row-info">
                  <div className="ld-mockup__row-label">{row.label}</div>
                  <div className="ld-mockup__row-status">{row.status}</div>
                </div>
                <span className="ld-mockup__row-amt">{row.amt}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Main Component ─── */
export default function Landing() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [scrolled, setScrolled] = useState(false)
  const [yearly, setYearly] = useState(false)
  const [openFaq, setOpenFaq] = useState(null)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  /* ─── Data (translated) ─── */
  const PLANS = [
    {
      code: 'starter',
      name: t('landing.plans.starter.name'),
      monthly: 29, yearly: 24,
      desc: t('landing.plans.starter.desc'),
      features: [
        t('landing.plans.starter.f1'), t('landing.plans.starter.f2'),
        t('landing.plans.starter.f3'), t('landing.plans.starter.f4'),
        t('landing.plans.starter.f5'), t('landing.plans.starter.f6'),
        t('landing.plans.starter.f7'),
      ],
      cta: t('landing.plans.starter.cta'), highlight: false,
    },
    {
      code: 'growth',
      name: t('landing.plans.growth.name'),
      monthly: 79, yearly: 66,
      desc: t('landing.plans.growth.desc'),
      features: [
        t('landing.plans.growth.f1'), t('landing.plans.growth.f2'),
        t('landing.plans.growth.f3'), t('landing.plans.growth.f4'),
        t('landing.plans.growth.f5'), t('landing.plans.growth.f6'),
        t('landing.plans.growth.f7'),
      ],
      cta: t('landing.plans.growth.cta'), highlight: true,
      badge: t('landing.plans.growth.badge'),
    },
    {
      code: 'scale',
      name: t('landing.plans.scale.name'),
      monthly: 199, yearly: 166,
      desc: t('landing.plans.scale.desc'),
      features: [
        t('landing.plans.scale.f1'), t('landing.plans.scale.f2'),
        t('landing.plans.scale.f3'), t('landing.plans.scale.f4'),
        t('landing.plans.scale.f5'), t('landing.plans.scale.f6'),
        t('landing.plans.scale.f7'),
      ],
      cta: t('landing.plans.scale.cta'), highlight: false,
    },
  ]

  const FEATURES = [
    { icon: '📦', key: 'suppliers' },
    { icon: '📋', key: 'orders' },
    { icon: '📊', key: 'inventory' },
    { icon: '💰', key: 'profit' },
    { icon: '🔗', key: 'spapi' },
    { icon: '🤖', key: 'decisions' },
  ].map(f => ({
    ...f,
    title: t(`landing.features_grid.${f.key}.title`),
    desc: t(`landing.features_grid.${f.key}.desc`),
  }))

  const STEPS = [1,2,3,4,5].map(i => ({
    title: t(`landing.steps.s${i}.title`),
    desc:  t(`landing.steps.s${i}.desc`),
  }))

  const TESTIMONIALS = [1,2,3].map(i => ({
    quote: t(`landing.testimonials.t${i}.quote`),
    name:  t(`landing.testimonials.t${i}.name`),
    role:  t(`landing.testimonials.t${i}.role`),
    initial: t(`landing.testimonials.t${i}.initial`),
  }))

  const FAQS = [1,2,3,4,5].map(i => ({
    q: t(`landing.faq.q${i}.q`),
    a: t(`landing.faq.q${i}.a`),
  }))

  const PROBLEM_ITEMS = [1,2,3,4,5].map(i => t(`landing.problem_items.i${i}`))
  const SOLUTION_CHECKS = [1,2,3,4,5].map(i => t(`landing.solution_checks.i${i}`))
  const TRUST_ITEMS = ['Amazon ES','Amazon DE','Amazon FR','Amazon IT','Amazon UK']

  return (
    <div className="ld-page">

      {/* ── Nav ── */}
      <nav className={`ld-nav${scrolled ? ' ld-nav--scrolled' : ''}`}>
        <Link to="/" className="ld-nav__logo">
          <img src="/brand/freedoliapp/logo/logo_white.png" alt="Freedoliapp"
            onError={e => { e.target.src='/brand/freedoliapp/logo/logo_master.png' }} />
        </Link>
        <div className="ld-nav__links">
          <a href="#features" className="ld-nav__link">{t('landing.nav.features')}</a>
          <a href="#how" className="ld-nav__link">{t('landing.nav.how')}</a>
          <a href="#pricing" className="ld-nav__link">{t('landing.nav.pricing')}</a>
        </div>
        <div className="ld-nav__actions">
          <button className="ld-btn ld-btn--ghost" onClick={() => navigate('/login')}>{t('landing.nav.login')}</button>
          <button className="ld-btn ld-btn--primary" onClick={() => navigate('/trial')}>{t('landing.nav.cta')}</button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="ld-hero">
        <div className="ld-hero__content">
          <div className="ld-hero__eyebrow">
            <span className="ld-hero__eyebrow-dot" />
            {t('landing.hero.eyebrow')}
          </div>
          <h1 className="ld-hero__title" dangerouslySetInnerHTML={{ __html: t('landing.hero.title_html') }} />
          <p className="ld-hero__sub">{t('landing.hero.subtitle')}</p>
          <div className="ld-hero__ctas">
            <button className="ld-btn ld-btn--primary-dark" onClick={() => navigate('/trial')}>
              {t('landing.hero.cta_primary')}
            </button>
            <a href="#how" className="ld-btn ld-btn--outline-dark">
              {t('landing.hero.cta_secondary')}
            </a>
          </div>
          <div className="ld-hero__stats">
            <div>
              <div className="ld-hero__stat-value">7</div>
              <div className="ld-hero__stat-label">{t('landing.hero.stat_phases')}</div>
            </div>
            <div>
              <div className="ld-hero__stat-value">14</div>
              <div className="ld-hero__stat-label">{t('landing.hero.stat_trial')}</div>
            </div>
            <div>
              <div className="ld-hero__stat-value">€0</div>
              <div className="ld-hero__stat-label">{t('landing.hero.stat_setup')}</div>
            </div>
          </div>
        </div>
        <div className="ld-hero__visual">
          <DashboardMockup />
        </div>
      </section>

      {/* ── Trust bar ── */}
      <div className="ld-trust">
        <span className="ld-trust__label">{t('landing.trust.label')}</span>
        {TRUST_ITEMS.map(m => (
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
              <span className="ld-section-label">{t('landing.problem.label')}</span>
              <h2 className="ld-section-title">{t('landing.problem.title')}</h2>
              <p className="ld-section-sub">{t('landing.problem.description')}</p>
              <ul className="ld-problem__list">
                {PROBLEM_ITEMS.map(item => (
                  <li key={item} className="ld-problem__item">
                    <span className="ld-problem__item-x">✕</span>{item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="ld-problem__solution">
              <div className="ld-problem__solution-title">{t('landing.solution.title')}</div>
              <ul className="ld-problem__solution-checks">
                {SOLUTION_CHECKS.map(item => (
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
            <span className="ld-section-label">{t('landing.features_section.label')}</span>
            <h2 className="ld-section-title">{t('landing.features_section.title')}</h2>
            <p className="ld-section-sub">{t('landing.features_section.subtitle')}</p>
          </div>
          <div className="ld-features__grid">
            {FEATURES.map(f => (
              <div key={f.key} className="ld-feature-card">
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
            <span className="ld-section-label">{t('landing.how.label')}</span>
            <h2 className="ld-section-title">{t('landing.how.title')}</h2>
          </div>
          <div className="ld-how__steps">
            {STEPS.map((s, i) => (
              <div key={i} className="ld-how__step">
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
            <span className="ld-section-label">{t('landing.pricing.label')}</span>
            <h2 className="ld-section-title">{t('landing.pricing.title')}</h2>
            <p className="ld-section-sub">{t('landing.pricing.subtitle')}</p>
          </div>
          <div className="ld-pricing__toggle">
            <span className={`ld-pricing__toggle-label${!yearly ? ' ld-pricing__toggle-label--active' : ''}`}>{t('landing.pricing.monthly')}</span>
            <button
              className={`ld-pricing__toggle-switch${yearly ? ' ld-pricing__toggle-switch--on' : ''}`}
              onClick={() => setYearly(y => !y)}
              aria-label="Toggle yearly billing"
            >
              <span className="ld-pricing__toggle-knob" />
            </button>
            <span className={`ld-pricing__toggle-label${yearly ? ' ld-pricing__toggle-label--active' : ''}`}>{t('landing.pricing.yearly')}</span>
            {yearly && <span className="ld-pricing__save">{t('landing.pricing.save')}</span>}
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
                <div className="ld-pricing-card__period">
                  {t('landing.pricing.per_month')}{yearly ? `, ${t('landing.pricing.billed_yearly')}` : ''}
                </div>
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
            <span className="ld-section-label">{t('landing.testimonials.label')}</span>
            <h2 className="ld-section-title">{t('landing.testimonials.title')}</h2>
          </div>
          <div className="ld-testimonials__grid">
            {TESTIMONIALS.map(t2 => (
              <div key={t2.name} className="ld-testimonial-card">
                <div className="ld-testimonial-card__stars">★★★★★</div>
                <div className="ld-testimonial-card__quote">"{t2.quote}"</div>
                <div className="ld-testimonial-card__author">
                  <div className="ld-testimonial-card__avatar">{t2.initial}</div>
                  <div>
                    <div className="ld-testimonial-card__name">{t2.name}</div>
                    <div className="ld-testimonial-card__role">{t2.role}</div>
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
            <span className="ld-section-label">{t('landing.faq.label')}</span>
            <h2 className="ld-section-title">{t('landing.faq.title')}</h2>
          </div>
          <div className="ld-faq__list">
            {FAQS.map((faq, i) => (
              <div key={i} className={`ld-faq__item${openFaq === i ? ' ld-faq__item--open' : ''}`}>
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
        <span className="ld-section-label">{t('landing.cta.label')}</span>
        <h2 className="ld-section-title">{t('landing.final_cta.title')}</h2>
        <p className="ld-section-sub">{t('landing.final_cta.description')}</p>
        <div className="ld-cta-section__btns">
          <button className="ld-btn ld-btn--primary-dark" onClick={() => navigate('/trial')}>{t('landing.final_cta.cta_primary')}</button>
          <button className="ld-btn ld-btn--outline-dark" onClick={() => navigate('/login')}>{t('landing.nav.login')}</button>
        </div>
        <p className="ld-cta-section__note">{t('landing.cta.note')}</p>
      </section>

      {/* ── Footer ── */}
      <footer className="ld-footer">
        <div className="ld-footer__top">
          <div>
            <img src="/brand/freedoliapp/logo/logo_white.png" alt="Freedoliapp" style={{height: '28px', marginBottom: '10px'}} />
            <p className="ld-footer__brand-desc">{t('landing.footer.brand_desc')}</p>
          </div>
          <div>
            <div className="ld-footer__col-title">{t('landing.footer.product')}</div>
            <ul className="ld-footer__links">
              <li><a href="#features" className="ld-footer__link">{t('landing.footer.features')}</a></li>
              <li><a href="#pricing" className="ld-footer__link">{t('landing.footer.pricing')}</a></li>
              <li><a href="#how" className="ld-footer__link">{t('landing.nav.how')}</a></li>
            </ul>
          </div>
          <div>
            <div className="ld-footer__col-title">{t('landing.footer.account')}</div>
            <ul className="ld-footer__links">
              <li><Link to="/trial" className="ld-footer__link">{t('landing.footer.free_trial')}</Link></li>
              <li><Link to="/login" className="ld-footer__link">{t('landing.nav.login')}</Link></li>
            </ul>
          </div>
          <div>
            <div className="ld-footer__col-title">{t('landing.footer.legal')}</div>
            <ul className="ld-footer__links">
              <li><Link to="/privacy" className="ld-footer__link">{t('landing.footer.privacy')}</Link></li>
              <li><Link to="/terms" className="ld-footer__link">{t('landing.footer.terms')}</Link></li>
              <li><Link to="/cookies" className="ld-footer__link">{t('landing.footer.cookies')}</Link></li>
            </ul>
          </div>
        </div>
        <div className="ld-footer__bottom">
          <span>© {new Date().getFullYear()} Freedolia SL</span>
          <span>{t('landing.footer.rights')}</span>
        </div>
      </footer>
    </div>
  )
}
