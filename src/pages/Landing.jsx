import { Link } from 'react-router-dom'
import { BarChart3, GitBranch, Wallet } from 'lucide-react'
import LandingHeader from '../components/landing/LandingHeader'
import LandingFooter from '../components/landing/LandingFooter'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import useT from '../hooks/useT'

export default function Landing() {
  const t = useT()

  return (
    <div className="landing-shell">
      <LandingHeader />

      <section className="landing-hero">
        <h1 className="landing-hero__headline">{t('landing.hero.title')}</h1>
        <p className="landing-hero__subtitle">{t('landing.hero.subtitle')}</p>
        <div className="landing-hero__ctaRow">
          <Link to="/trial">
            <Button variant="primary" size="lg">
              {t('landing.hero.ctaPrimary')}
            </Button>
          </Link>
          <Link to="/login">
            <Button variant="secondary" size="lg">
              {t('landing.hero.ctaSecondary')}
            </Button>
          </Link>
        </div>
      </section>

      <section className="landing-features">
        <Card className="landing-feature-card">
          <div className="landing-feature-card__icon">
            <BarChart3 size={28} aria-hidden />
          </div>
          <h3 className="landing-feature-card__title">{t('landing.features.analytics.title')}</h3>
          <p className="landing-feature-card__desc">{t('landing.features.analytics.desc')}</p>
        </Card>
        <Card className="landing-feature-card">
          <div className="landing-feature-card__icon">
            <GitBranch size={28} aria-hidden />
          </div>
          <h3 className="landing-feature-card__title">{t('landing.features.pipeline.title')}</h3>
          <p className="landing-feature-card__desc">{t('landing.features.pipeline.desc')}</p>
        </Card>
        <Card className="landing-feature-card">
          <div className="landing-feature-card__icon">
            <Wallet size={28} aria-hidden />
          </div>
          <h3 className="landing-feature-card__title">{t('landing.features.finance.title')}</h3>
          <p className="landing-feature-card__desc">{t('landing.features.finance.desc')}</p>
        </Card>
      </section>

      <LandingFooter />
    </div>
  )
}
