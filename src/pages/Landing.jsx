import { useNavigate } from 'react-router-dom'
import { BarChart3, GitBranch, Wallet } from 'lucide-react'
import LandingHeader from '../components/landing/LandingHeader'
import LandingFooter from '../components/landing/LandingFooter'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Stepper from '../components/ui/Stepper'
import useT from '../hooks/useT'

function LandingScreenshot({ src, alt }) {
  return (
    <div className="landing-screenshotFrame">
      <img
        src={src}
        alt={alt}
        className="landing-screenshotFrame__img"
        loading="lazy"
      />
    </div>
  )
}

export default function Landing() {
  const t = useT()
  const navigate = useNavigate()

  const howItWorksSteps = [
    { id: 'connect-suppliers', label: t('landing.how_it_works.steps.connect_suppliers.title') },
    { id: 'create-pos', label: t('landing.how_it_works.steps.create_pos.title') },
    { id: 'track-inventory', label: t('landing.how_it_works.steps.track_inventory.title') },
    { id: 'understand-profit', label: t('landing.how_it_works.steps.understand_profit.title') },
    { id: 'make-decisions', label: t('landing.how_it_works.steps.make_decisions.title') },
  ]

  return (
    <div className="landing-shell">
      <LandingHeader />

      {/* 2 — Hero */}
      <section className="landing-hero">
        <h1 className="landing-hero__headline">{t('landing.hero.title')}</h1>
        <p className="landing-hero__subtitle">{t('landing.hero.subtitle')}</p>
        <div className="landing-hero__ctaRow">
          <Button variant="primary" size="lg" onClick={() => navigate('/trial')}>
            {t('landing.hero.cta_primary')}
          </Button>
          <Button variant="secondary" size="lg" onClick={() => navigate('/login')}>
            {t('landing.hero.cta_secondary')}
          </Button>
        </div>
        <div className="landing-hero__screenshot">
          <LandingScreenshot
            src="/images/landing/landing-hero-dashboard.png"
            alt={t('landing.screenshots.hero_alt')}
          />
        </div>
      </section>

      {/* 3 — Trust / credibility */}
      <section className="landing-section landing-section--trust">
        <div className="landing-section__inner">
          <header className="landing-section__header">
            <Badge tone="neutral">{t('landing.trust.eyebrow')}</Badge>
            <h2 className="landing-section__title">{t('landing.trust.title')}</h2>
          </header>
          <div className="landing-trustGrid">
            <Card className="landing-trustCard">
              <h3>{t('landing.trust.points.fba_workflows')}</h3>
              <p>{t('landing.trust.points.fba_workflows_desc')}</p>
            </Card>
            <Card className="landing-trustCard">
              <h3>{t('landing.trust.points.supplier_management')}</h3>
              <p>{t('landing.trust.points.supplier_management_desc')}</p>
            </Card>
            <Card className="landing-trustCard">
              <h3>{t('landing.trust.points.inventory_visibility')}</h3>
              <p>{t('landing.trust.points.inventory_visibility_desc')}</p>
            </Card>
            <Card className="landing-trustCard">
              <h3>{t('landing.trust.points.profit_tracking')}</h3>
              <p>{t('landing.trust.points.profit_tracking_desc')}</p>
            </Card>
          </div>
        </div>
      </section>

      {/* 4 — Problem */}
      <section className="landing-section landing-section--problem">
        <div className="landing-section__inner">
          <div className="landing-section__text">
            <h2 className="landing-section__title">{t('landing.problem.title')}</h2>
            <p className="landing-section__body">{t('landing.problem.description')}</p>
            <ul className="landing-problemList">
              <li>{t('landing.problem.items.excel')}</li>
              <li>{t('landing.problem.items.whatsapp')}</li>
              <li>{t('landing.problem.items.shipping_docs')}</li>
              <li>{t('landing.problem.items.email_threads')}</li>
              <li>{t('landing.problem.items.inventory_spreadsheets')}</li>
            </ul>
          </div>
        </div>
      </section>

      {/* 5 — Solution / operating system concept */}
      <section className="landing-section landing-section--solution">
        <div className="landing-section__inner landing-section__inner--twoCol">
          <div className="landing-section__text">
            <h2 className="landing-section__title">{t('landing.solution.title')}</h2>
            <p className="landing-section__body">{t('landing.solution.description')}</p>
          </div>
          <div className="landing-section__visual">
            <div className="landing-solutionFeatures">
              <div className="landing-solutionFeature">
                <BarChart3 size={20} aria-hidden />
                <span>{t('landing.solution.points.visibility')}</span>
              </div>
              <div className="landing-solutionFeature">
                <GitBranch size={20} aria-hidden />
                <span>{t('landing.solution.points.workflows')}</span>
              </div>
              <div className="landing-solutionFeature">
                <Wallet size={20} aria-hidden />
                <span>{t('landing.solution.points.profit')}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6 — Product modules */}
      <section className="landing-section landing-section--modules">
        <div className="landing-section__inner">
          <header className="landing-section__header landing-section__header--center">
            <h2 className="landing-section__title">{t('landing.modules.title')}</h2>
            <p className="landing-section__body">{t('landing.modules.description')}</p>
          </header>
          <div className="landing-modulesGrid">
            <Card className="landing-moduleCard">
              <h3>{t('landing.modules.suppliers.title')}</h3>
              <p>{t('landing.modules.suppliers.desc')}</p>
            </Card>
            <Card className="landing-moduleCard">
              <h3>{t('landing.modules.purchase_orders.title')}</h3>
              <p>{t('landing.modules.purchase_orders.desc')}</p>
            </Card>
            <Card className="landing-moduleCard">
              <h3>{t('landing.modules.inventory.title')}</h3>
              <p>{t('landing.modules.inventory.desc')}</p>
            </Card>
            <Card className="landing-moduleCard">
              <h3>{t('landing.modules.profit.title')}</h3>
              <p>{t('landing.modules.profit.desc')}</p>
            </Card>
            <Card className="landing-moduleCard">
              <h3>{t('landing.modules.decisions.title')}</h3>
              <p>{t('landing.modules.decisions.desc')}</p>
            </Card>
          </div>
        </div>
      </section>

      {/* 7 — How it works */}
      <section className="landing-section landing-section--how">
        <div className="landing-section__inner">
          <header className="landing-section__header landing-section__header--center">
            <h2 className="landing-section__title">{t('landing.how_it_works.title')}</h2>
          </header>
          <Stepper steps={howItWorksSteps} />
        </div>
      </section>

      {/* 8 — Screenshot-supported product sections */}
      {/* Suppliers */}
      <section className="landing-section landing-section--alt">
        <div className="landing-section__inner landing-section__inner--twoCol">
          <div className="landing-section__text">
            <h2 className="landing-section__title">{t('landing.screenshots.suppliers.title')}</h2>
            <p className="landing-section__body">
              {t('landing.screenshots.suppliers.description')}
            </p>
          </div>
          <div className="landing-section__visual">
            <LandingScreenshot
              src="/images/landing/landing-suppliers.png"
              alt={t('landing.screenshots.suppliers.alt')}
            />
          </div>
        </div>
      </section>

      {/* Orders workflow */}
      <section className="landing-section">
        <div className="landing-section__inner landing-section__inner--twoCol landing-section__inner--reverse">
          <div className="landing-section__text">
            <h2 className="landing-section__title">
              {t('landing.screenshots.orders_workflow.title')}
            </h2>
            <p className="landing-section__body">
              {t('landing.screenshots.orders_workflow.description')}
            </p>
          </div>
          <div className="landing-section__visual">
            <LandingScreenshot
              src="/images/landing/landing-orders-workflow.png"
              alt={t('landing.screenshots.orders_workflow.alt')}
            />
          </div>
        </div>
      </section>

      {/* Decisions / intelligence */}
      <section className="landing-section landing-section--alt">
        <div className="landing-section__inner landing-section__inner--twoCol">
          <div className="landing-section__text">
            <h2 className="landing-section__title">
              {t('landing.screenshots.decisions.title')}
            </h2>
            <p className="landing-section__body">
              {t('landing.screenshots.decisions.description')}
            </p>
          </div>
          <div className="landing-section__visual">
            <LandingScreenshot
              src="/images/landing/landing-decisions-dashboard.png"
              alt={t('landing.screenshots.decisions.alt')}
            />
          </div>
        </div>
      </section>

      {/* 9 — Freedoli assistant section */}
      <section className="landing-section landing-section--assistant">
        <div className="landing-section__inner landing-section__inner--assistant">
          <div className="landing-assistantBubble">
            <div className="landing-assistantBubble__avatar" aria-hidden />
            <div className="landing-assistantBubble__text">
              <p className="landing-assistantBubble__title">
                {t('landing.assistant.title')}
              </p>
              <p className="landing-assistantBubble__body">
                {t('landing.assistant.description')}
              </p>
            </div>
          </div>
          <div className="landing-assistantActions">
            <Button variant="secondary" size="md">
              {t('landing.assistant.actions.show_product')}
            </Button>
            <Button variant="ghost" size="md">
              {t('landing.assistant.actions.how_it_works')}
            </Button>
            <Button variant="primary" size="md" onClick={() => navigate('/trial')}>
              {t('landing.assistant.actions.start_trial')}
            </Button>
          </div>
        </div>
      </section>

      {/* 10 — Resources / SEO entry */}
      <section className="landing-section landing-section--resources">
        <div className="landing-section__inner">
          <header className="landing-section__header landing-section__header--center">
            <h2 className="landing-section__title">{t('landing.resources.title')}</h2>
            <p className="landing-section__body">{t('landing.resources.description')}</p>
          </header>
          <div className="landing-resourcesGrid">
            <Card className="landing-resourceCard">
              <h3>{t('landing.resources.guides.title')}</h3>
              <p>{t('landing.resources.guides.desc')}</p>
            </Card>
            <Card className="landing-resourceCard">
              <h3>{t('landing.resources.templates.title')}</h3>
              <p>{t('landing.resources.templates.desc')}</p>
            </Card>
            <Card className="landing-resourceCard">
              <h3>{t('landing.resources.tools.title')}</h3>
              <p>{t('landing.resources.tools.desc')}</p>
            </Card>
          </div>
        </div>
      </section>

      {/* 11 — Final CTA */}
      <section className="landing-section landing-section--finalCta">
        <div className="landing-section__inner landing-section__inner--finalCta">
          <div>
            <h2 className="landing-section__title">
              {t('landing.final_cta.title')}
            </h2>
            <p className="landing-section__body">
              {t('landing.final_cta.description')}
            </p>
          </div>
          <Button variant="primary" size="lg" onClick={() => navigate('/trial')}>
            {t('landing.final_cta.cta_primary')}
          </Button>
        </div>
      </section>

      {/* 12 — Footer */}
      <LandingFooter />
    </div>
  )
}
