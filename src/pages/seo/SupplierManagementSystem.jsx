import LandingHeader from '../../components/landing/LandingHeader'
import LandingFooter from '../../components/landing/LandingFooter'
import PageGutter from '../../components/ui/PageGutter'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'

export default function SupplierManagementSystem() {
  return (
    <div className="landing-shell">
      <LandingHeader />
      <main>
        <PageGutter>
          {/* 1 — Hero */}
          <section className="landing-section">
            <div className="landing-section__inner">
              <div className="landing-section__text">
                <h1 className="landing-section__title">
                  Supplier management system for product businesses.
                </h1>
                <p className="landing-section__body">
                  As your Amazon business grows, suppliers, quotes and terms spread across email
                  threads and documents. A dedicated supplier system keeps everything in one place.
                </p>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => {
                    window.location.href = '/trial'
                  }}
                >
                  Join early access
                </Button>
              </div>
            </div>
          </section>

          {/* 2 — Problem section */}
          <section className="landing-section landing-section--alt">
            <div className="landing-section__inner landing-section__inner--twoCol">
              <div className="landing-section__text">
                <h2 className="landing-section__title">
                  How supplier information is tracked today.
                </h2>
                <p className="landing-section__body">
                  Many teams keep supplier details and quotes in a mix of spreadsheets, inbox
                  searches and chat messages. Every new negotiation adds more scattered context.
                </p>
              </div>
              <div className="landing-section__visual">
                <Card className="landing-moduleCard">
                  <h3>Fragmented supplier records</h3>
                  <p>
                    Pricing, MOQs and lead times often live in individual email chains or local
                    files, making it hard to compare suppliers or onboard new team members.
                  </p>
                </Card>
              </div>
            </div>
          </section>

          {/* 3 — Why current tools fail */}
          <section className="landing-section">
            <div className="landing-section__inner">
              <h2 className="landing-section__title">Why generic CRMs and sheets fall short.</h2>
              <ul className="landing-problemList">
                <li>No clear view of supplier performance across products and POs.</li>
                <li>Hard to see how terms and lead times impact inventory and cash.</li>
                <li>Context is lost when people leave or change roles.</li>
                <li>Decisions depend on whoever remembers the last negotiation.</li>
              </ul>
            </div>
          </section>

          {/* 4 — What a proper system should look like */}
          <section className="landing-section landing-section--alt">
            <div className="landing-section__inner">
              <h2 className="landing-section__title">
                What a supplier management system should provide.
              </h2>
              <p className="landing-section__body">
                A proper system gives each supplier a structured profile: products, quotes, terms,
                lead times and historical performance. It connects suppliers directly to purchase
                orders and inventory outcomes.
              </p>
            </div>
          </section>

          {/* 5 — How Freedoliapp approaches the problem */}
          <section className="landing-section">
            <div className="landing-section__inner">
              <h2 className="landing-section__title">
                How Freedoliapp approaches supplier management.
              </h2>
              <p className="landing-section__body">
                Freedoliapp treats suppliers as a core operational asset. It focuses on making it
                easy to compare options, understand reliability and see how supplier choices impact
                inventory and profitability.
              </p>
            </div>
          </section>

          {/* 6 — CTA */}
          <section className="landing-section landing-section--finalCta">
            <div className="landing-section__inner landing-section__inner--finalCta">
              <div>
                <h2 className="landing-section__title">
                  Join the supplier management system early access.
                </h2>
                <p className="landing-section__body">
                  Work with Freedoliapp to define how supplier records, quotes and performance
                  should live in a single operational workspace.
                </p>
              </div>
              <Button
                variant="primary"
                size="lg"
                onClick={() => {
                  window.location.href = '/trial'
                }}
              >
                Join early access
              </Button>
            </div>
          </section>
        </PageGutter>
      </main>
      <LandingFooter />
    </div>
  )
}

