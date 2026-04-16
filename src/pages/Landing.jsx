/**
 * Landing.jsx v2 — Bootstrap 5 + full i18n ES/EN/CA
 *
 * Section order (canonical per canvas F0AT5K5Q4HY):
 *  1. Navbar
 *  2. Hero with parallax           ← CANVI 1
 *  3. Logos strip                  ← CANVI 2
 *  4. Features 6-card grid         ← CANVI 3
 *  5. Visual section A (img left)  ← CANVI 4
 *  6. Visual section B (img right) ← CANVI 4
 *  7. How it works (5 steps)
 *  8. Testimonials carousel        ← CANVI 5
 *  9. Pricing (3 plans)
 * 10. FAQ accordion
 * 11. Final CTA
 * 12. Footer
 *
 * Rules: all layout/responsiveness via Bootstrap classes; zero strings
 * hardcoded (every visible text via t('key')); 3 locales es/en/ca.
 */
import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BarChart2, Layout, Brain, Download, DollarSign, HelpCircle, Globe } from 'lucide-react'
import 'bootstrap/dist/css/bootstrap.min.css'
import '../styles/landing.css'
import { TestimonialsCarousel } from '../components/landing/TestimonialsCarousel'

/* ─── Static data ─────────────────────────────────────────────────────────── */

const LOGO_TOOLS = [
  { id: 'sellerboard',  name: 'Sellerboard',  domain: 'sellerboard.com' },
  { id: 'helium10',     name: 'Helium 10',    domain: 'helium10.com' },
  { id: 'junglescout',  name: 'Jungle Scout', domain: 'junglescout.com' },
  { id: 'keepa',        name: 'Keepa',        domain: 'keepa.com' },
  { id: 'holded',       name: 'Holded',       domain: 'holded.com' },
  { id: 'amazon',       name: 'Amazon',       domain: 'amazon.com' },
]

const FEATURES = [
  { Icon: BarChart2,   titleKey: 'feature1.title', textKey: 'feature1.text' },
  { Icon: Layout,      titleKey: 'feature2.title', textKey: 'feature2.text' },
  { Icon: Brain,       titleKey: 'feature3.title', textKey: 'feature3.text' },
  { Icon: Download,    titleKey: 'feature4.title', textKey: 'feature4.text' },
  { Icon: DollarSign,  titleKey: 'feature5.title', textKey: 'feature5.text' },
  { Icon: HelpCircle,  titleKey: 'feature6.title', textKey: 'feature6.text' },
]

/* ─── Sub-components ──────────────────────────────────────────────────────── */

/** Reusable image + text section. `reverse` flips image to the right on md+. */
function VisualSection({ imgSrc, titleKey, textKey, reverse = false }) {
  const { t } = useTranslation()
  return (
    <section className="py-5">
      <div className="container">
        <div className={`row align-items-center g-5${reverse ? ' flex-md-row-reverse' : ''}`}>
          <div className="col-12 col-md-6">
            <img
              src={imgSrc}
              alt={t(titleKey)}
              className="img-fluid rounded-4"
              style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.1)' }}
            />
          </div>
          <div className="col-12 col-md-6">
            <h2 className="display-6 fw-bold mb-4" style={{ color: '#1A1A2E' }}>
              {t(titleKey)}
            </h2>
            <p className="lead text-muted">{t(textKey)}</p>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─── Main component ──────────────────────────────────────────────────────── */

export default function Landing() {
  const navigate     = useNavigate()
  const { t, i18n } = useTranslation()
  const [scrolled,  setScrolled]  = useState(false)
  const [yearly,    setYearly]    = useState(false)
  const [openFaq,   setOpenFaq]   = useState(null)

  /* scroll watcher for navbar */
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  /* CANVI 1 — parallax scroll */
  useEffect(() => {
    const el = document.querySelector('.hero-parallax-bg')
    const onScroll = () => {
      if (el) el.style.transform = `translateY(${window.scrollY * 0.4}px)`
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  /* ── Pricing plans ── */
  const PLANS = [
    {
      code: 'starter', name: t('landing.plans.starter.name'),
      monthly: 29, yearly: 24, desc: t('landing.plans.starter.desc'),
      features: [1,2,3,4,5,6,7].map(n => t(`landing.plans.starter.f${n}`)),
      cta: t('landing.plans.starter.cta'), highlight: false,
    },
    {
      code: 'growth', name: t('landing.plans.growth.name'),
      monthly: 79, yearly: 66, desc: t('landing.plans.growth.desc'),
      features: [1,2,3,4,5,6,7].map(n => t(`landing.plans.growth.f${n}`)),
      cta: t('landing.plans.growth.cta'), highlight: true,
      badge: t('landing.plans.growth.badge'),
    },
    {
      code: 'scale', name: t('landing.plans.scale.name'),
      monthly: 199, yearly: 166, desc: t('landing.plans.scale.desc'),
      features: [1,2,3,4,5,6,7].map(n => t(`landing.plans.scale.f${n}`)),
      cta: t('landing.plans.scale.cta'), highlight: false,
    },
  ]

  /* ── FAQ ── */
  const FAQS = [1,2,3,4,5].map(i => ({
    q: t(`landing.faq.q${i}.q`),
    a: t(`landing.faq.q${i}.a`),
  }))

  return (
    <div className="ld-page">

      {/* ── 1. NAVBAR ─────────────────────────────────────────────────────── */}
      <nav className={`ld-nav${scrolled ? ' ld-nav--scrolled' : ''}`}>
        <div className="container-fluid d-flex align-items-center justify-content-between h-100">
          <Link to="/" className="ld-nav__logo">
            <img
              src="/brand/freedoliapp/logo/logo_white.png"
              alt="Freedoliapp"
              onError={e => { e.target.src = '/brand/freedoliapp/logo/logo_master.png' }}
            />
          </Link>

          <div className="d-none d-md-flex align-items-center gap-4">
            <a href="#features" className="ld-nav__link">{t('landing.nav.features')}</a>
            <a href="#how"      className="ld-nav__link">{t('landing.nav.how')}</a>
            <a href="#pricing"  className="ld-nav__link">{t('landing.nav.pricing')}</a>
          </div>

          <div className="d-flex align-items-center gap-2">
            {/* language selector — cycles ES → EN → CA */}
            <button
              className="ld-btn ld-btn--ghost d-flex align-items-center gap-1"
              style={{ padding: '6px 10px', fontSize: 13 }}
              onClick={() => {
                const cycle = { ca: 'es', es: 'en', en: 'ca' }
                i18n.changeLanguage(cycle[i18n.language] || 'es')
              }}
              title={t('language.select')}
            >
              <Globe size={14} />
              {(i18n.language || 'ca').slice(0,2).toUpperCase()}
            </button>
            <button className="ld-btn ld-btn--ghost"   onClick={() => navigate('/login')}>
              {t('landing.nav.login')}
            </button>
            <button className="ld-btn ld-btn--primary" onClick={() => navigate('/trial')}>
              {t('landing.nav.cta')}
            </button>
          </div>
        </div>
      </nav>

      {/* ── 2. HERO (CANVI 1 — parallax) ─────────────────────────────────── */}
      <section
        className="hero-section position-relative overflow-hidden"
        style={{ minHeight: '90vh' }}
      >
        {/* parallax background */}
        <div
          className="hero-parallax-bg position-absolute w-100 h-100"
          style={{
            inset: '-20%',
            background: 'linear-gradient(135deg, #1F5F63 0%, #0d3a3d 50%, #1a2a2e 100%)',
            zIndex: 0,
            willChange: 'transform',
          }}
        />

        {/* glow top-right */}
        <div
          className="position-absolute"
          style={{
            width: 500, height: 500, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(110,203,195,0.15) 0%, transparent 70%)',
            top: -100, right: -100, zIndex: 0, pointerEvents: 'none',
          }}
        />

        {/* glow bottom-left */}
        <div
          className="position-absolute"
          style={{
            width: 400, height: 400, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(242,108,108,0.1) 0%, transparent 70%)',
            bottom: -80, left: -80, zIndex: 0, pointerEvents: 'none',
          }}
        />

        {/* content */}
        <div className="container position-relative" style={{ zIndex: 1 }}>
          <div className="row align-items-center min-vh-100 py-5">

            {/* text left */}
            <div className="col-12 col-md-6 text-white">
              <h1 className="display-4 fw-bold mb-4">{t('hero.title')}</h1>
              <p className="lead mb-5 opacity-75">{t('hero.subtitle')}</p>
              <div className="d-flex flex-wrap gap-3">
                <a
                  href="/register"
                  className="btn btn-lg px-5 py-3 fw-semibold"
                  style={{ background: '#6ECBC3', color: '#fff', borderRadius: 12 }}
                >
                  {t('hero.cta_primary')}
                </a>
                <a
                  href="#how"
                  className="btn btn-lg btn-outline-light px-5 py-3 fw-semibold"
                  style={{ borderRadius: 12 }}
                >
                  {t('hero.cta_secondary')}
                </a>
              </div>
            </div>

            {/* mockup right */}
            <div className="col-12 col-md-6 d-flex justify-content-center mt-5 mt-md-0">
              <img
                src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80"
                alt="FreedoliApp dashboard"
                className="img-fluid rounded-4"
                style={{
                  maxWidth: 560,
                  boxShadow: '0 32px 80px rgba(0,0,0,0.4)',
                  transform: 'perspective(1000px) rotateY(-8deg) rotateX(3deg)',
                  transition: 'transform 0.4s ease',
                }}
                onMouseEnter={e => {
                  e.target.style.transform = 'perspective(1000px) rotateY(-2deg) rotateX(1deg)'
                }}
                onMouseLeave={e => {
                  e.target.style.transform = 'perspective(1000px) rotateY(-8deg) rotateX(3deg)'
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. LOGOS STRIP (CANVI 2) ─────────────────────────────────────── */}
      <section
        className="py-4"
        style={{ background: 'rgba(0,0,0,0.03)', borderTop: '1px solid #E5E7EB' }}
      >
        <div className="container">
          <p className="text-center text-muted small mb-3">{t('logos.label')}</p>
          <div className="d-flex flex-wrap justify-content-center align-items-center gap-4">
            {LOGO_TOOLS.map(tool => (
              <img
                key={tool.id}
                src={`https://logo.clearbit.com/${tool.domain}`}
                alt={tool.name}
                style={{ height: 28, opacity: 0.6, filter: 'grayscale(30%)' }}
                onError={e => {
                  e.target.src = `https://www.google.com/s2/favicons?domain=${tool.domain}&sz=64`
                }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. FEATURES 6-CARD GRID (CANVI 3) ───────────────────────────── */}
      <section className="py-5 bg-white" id="features">
        <div className="container">
          <div className="text-center mb-5">
            <span className="ld-section-label">{t('landing.features_section.label')}</span>
            <h2 className="ld-section-title mt-2">{t('landing.features_section.title')}</h2>
          </div>
          <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
            {FEATURES.map((f, i) => (
              <div key={i} className="col">
                <div
                  className="card h-100 border-0 shadow-sm p-4"
                  style={{ borderRadius: 12 }}
                >
                  <f.Icon size={32} color="#6ECBC3" className="mb-3" />
                  <h5 className="fw-bold mb-2">{t(f.titleKey)}</h5>
                  <p className="text-muted mb-0">{t(f.textKey)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5–6. VISUAL SECTIONS (CANVI 4) ──────────────────────────────── */}
      <VisualSection
        imgSrc="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80"
        titleKey="visual_a.title"
        textKey="visual_a.text"
      />
      <VisualSection
        imgSrc="https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800&q=80"
        titleKey="visual_b.title"
        textKey="visual_b.text"
        reverse
      />

      {/* ── 7. HOW IT WORKS (5 steps, Bootstrap) ────────────────────────── */}
      <section className="py-5" id="how" style={{ background: '#f8faf7' }}>
        <div className="container">
          <h2 className="text-center fw-bold mb-5 display-6">
            {t('how_it_works.title')}
          </h2>
          <div className="row row-cols-1 row-cols-md-5 g-3 text-center">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="col">
                <div className="py-3">
                  <div
                    className="fw-bold mb-2"
                    style={{ fontSize: 48, lineHeight: 1, color: '#6ECBC3' }}
                  >
                    {i}
                  </div>
                  <div className="fw-semibold mb-1" style={{ fontSize: 15 }}>
                    {t(`step${i}.title`)}
                  </div>
                  <div className="text-muted small">{t(`step${i}.text`)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 8. TESTIMONIALS CAROUSEL (CANVI 5) ──────────────────────────── */}
      <TestimonialsCarousel />

      {/* ── 9. PRICING ───────────────────────────────────────────────────── */}
      <section className="py-5" id="pricing" style={{ background: '#F6F8F3' }}>
        <div className="container">
          <div className="text-center mb-4">
            <span className="ld-section-label">{t('landing.pricing.label')}</span>
            <h2 className="ld-section-title mt-2">{t('landing.pricing.title')}</h2>
            <p className="ld-section-sub">{t('landing.pricing.subtitle')}</p>
          </div>

          {/* billing toggle */}
          <div className="d-flex justify-content-center align-items-center gap-3 mb-5">
            <span
              className="ld-pricing__toggle-label"
              style={{ fontWeight: !yearly ? 700 : 400 }}
            >
              {t('landing.pricing.monthly')}
            </span>
            <button
              className={`ld-pricing__toggle-switch${yearly ? ' ld-pricing__toggle-switch--on' : ''}`}
              onClick={() => setYearly(y => !y)}
              aria-label="Toggle yearly billing"
            >
              <span className="ld-pricing__toggle-knob" />
            </button>
            <span
              className="ld-pricing__toggle-label"
              style={{ fontWeight: yearly ? 700 : 400 }}
            >
              {t('landing.pricing.yearly')}
            </span>
            {yearly && (
              <span className="ld-pricing__save">{t('landing.pricing.save')}</span>
            )}
          </div>

          <div className="row row-cols-1 row-cols-md-3 g-4">
            {PLANS.map(plan => (
              <div key={plan.code} className="col">
                <div
                  className={`ld-pricing-card h-100${plan.highlight ? ' ld-pricing-card--highlight' : ''}`}
                >
                  {plan.badge && (
                    <div className="ld-pricing-card__badge">{plan.badge}</div>
                  )}
                  <div className="ld-pricing-card__name">{plan.name}</div>
                  <div className="ld-pricing-card__price">
                    <span className="ld-pricing-card__currency">€</span>
                    <span className="ld-pricing-card__amount">
                      {yearly ? plan.yearly : plan.monthly}
                    </span>
                  </div>
                  <div className="ld-pricing-card__period">
                    {t('landing.pricing.per_month')}
                    {yearly ? `, ${t('landing.pricing.billed_yearly')}` : ''}
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
                  <button
                    className="ld-pricing-card__cta"
                    onClick={() => navigate(plan.code === 'scale' ? '/login' : '/trial')}
                  >
                    {plan.cta}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 10. FAQ ──────────────────────────────────────────────────────── */}
      <section className="py-5">
        <div className="container">
          <div className="text-center mb-5">
            <span className="ld-section-label">{t('landing.faq.label')}</span>
            <h2 className="ld-section-title mt-2">{t('landing.faq.title')}</h2>
          </div>
          <div className="row justify-content-center">
            <div className="col-12 col-lg-8">
              <div className="ld-faq__list">
                {FAQS.map((faq, i) => (
                  <div
                    key={i}
                    className={`ld-faq__item${openFaq === i ? ' ld-faq__item--open' : ''}`}
                  >
                    <button
                      className="ld-faq__question"
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    >
                      {faq.q}
                      <span className="ld-faq__chevron">▾</span>
                    </button>
                    <div className="ld-faq__answer">{faq.a}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 11. FINAL CTA ────────────────────────────────────────────────── */}
      <section className="ld-cta-section">
        <span className="ld-section-label">{t('landing.cta.label')}</span>
        <h2 className="ld-section-title">{t('landing.final_cta.title')}</h2>
        <p className="ld-section-sub">{t('landing.final_cta.description')}</p>
        <div className="ld-cta-section__btns">
          <button className="ld-btn ld-btn--primary-dark" onClick={() => navigate('/trial')}>
            {t('landing.final_cta.cta_primary')}
          </button>
          <button className="ld-btn ld-btn--outline-dark" onClick={() => navigate('/login')}>
            {t('landing.nav.login')}
          </button>
        </div>
        <p className="ld-cta-section__note">{t('landing.cta.note')}</p>
      </section>

      {/* ── 12. FOOTER ───────────────────────────────────────────────────── */}
      <footer className="ld-footer">
        <div className="container">
          <div className="row g-4 ld-footer__top">
            <div className="col-12 col-md-4">
              <img
                src="/brand/freedoliapp/logo/logo_white.png"
                alt="Freedoliapp"
                style={{ height: 28, marginBottom: 10 }}
              />
              <p className="ld-footer__brand-desc">{t('landing.footer.brand_desc')}</p>
            </div>
            <div className="col-6 col-md-2">
              <div className="ld-footer__col-title">{t('landing.footer.product')}</div>
              <ul className="ld-footer__links">
                <li><a href="#features" className="ld-footer__link">{t('landing.footer.features')}</a></li>
                <li><a href="#pricing"  className="ld-footer__link">{t('landing.footer.pricing')}</a></li>
                <li><a href="#how"      className="ld-footer__link">{t('landing.nav.how')}</a></li>
              </ul>
            </div>
            <div className="col-6 col-md-2">
              <div className="ld-footer__col-title">{t('landing.footer.account')}</div>
              <ul className="ld-footer__links">
                <li><Link to="/trial" className="ld-footer__link">{t('landing.footer.free_trial')}</Link></li>
                <li><Link to="/login" className="ld-footer__link">{t('landing.nav.login')}</Link></li>
              </ul>
            </div>
            <div className="col-6 col-md-2">
              <div className="ld-footer__col-title">{t('landing.footer.legal')}</div>
              <ul className="ld-footer__links">
                <li><Link to="/privacy" className="ld-footer__link">{t('landing.footer.privacy')}</Link></li>
                <li><Link to="/terms"   className="ld-footer__link">{t('landing.footer.terms')}</Link></li>
                <li><Link to="/cookies" className="ld-footer__link">{t('landing.footer.cookies')}</Link></li>
              </ul>
            </div>
          </div>
          <div className="ld-footer__bottom">
            <span>© {new Date().getFullYear()} Freedolia SL</span>
            <span>{t('landing.footer.rights')}</span>
          </div>
        </div>
      </footer>

    </div>
  )
}
