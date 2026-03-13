import LandingHeader from '../../components/landing/LandingHeader'
import LandingFooter from '../../components/landing/LandingFooter'
import PageGutter from '../../components/ui/PageGutter'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'

export default function AmazonFbaDashboard() {
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
                  Amazon FBA dashboard for real operations.
                </h1>
                <p className="landing-section__body">
                  Most Amazon sellers run their numbers across multiple spreadsheets and tools. An
                  operations dashboard should bring suppliers, purchase orders, inventory and profit
                  together in one place.
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
                  How Amazon FBA teams track their operations today.
                </h2>
                <p className="landing-section__body">
                  Many teams rely on disconnected spreadsheets, ad‑hoc dashboards and email
                  updates. Each marketplace, supplier and launch gets its own file or tab.
                </p>
              </div>
              <div className="landing-section__visual">
                <Card className="landing-moduleCard">
                  <h3>Typical setup</h3>
                  <p>
                    One sheet for inventory, another for POs, a BI dashboard for sales, and Slack
                    messages for issues &mdash; all maintained manually.
                  </p>
                </Card>
              </div>
            </div>
          </section>

          {/* 3 — Why current tools fail */}
          <section className="landing-section">
            <div className="landing-section__inner">
              <h2 className="landing-section__title">Why spreadsheets and generic BI fail.</h2>
              <ul className="landing-problemList">
                <li>Hard to keep supplier, PO and inventory data in sync.</li>
                <li>No single place that shows risk, stock and cash together.</li>
                <li>Dashboards are static &mdash; they don&apos;t drive concrete actions.</li>
                <li>Every new product launch adds more manual work.</li>
              </ul>
            </div>
          </section>

          {/* 4 — What a proper system should look like */}
          <section className="landing-section landing-section--alt">
            <div className="landing-section__inner">
              <h2 className="landing-section__title">
                What an Amazon FBA operations dashboard should provide.
              </h2>
              <p className="landing-section__body">
                A proper system connects purchase orders, inventory movements and sales into a
                single operational view. It highlights the units, SKUs and suppliers that require
                attention instead of just plotting past data.
              </p>
            </div>
          </section>

          {/* 5 — How Freedoliapp approaches the problem */}
          <section className="landing-section">
            <div className="landing-section__inner">
              <h2 className="landing-section__title">How Freedoliapp approaches the FBA dashboard.</h2>
              <p className="landing-section__body">
                Freedoliapp is designed as an operations control layer. It focuses on supplier
                performance, purchase order status, stock coverage and profitability so you know
                what to order, when and from whom.
              </p>
            </div>
          </section>

          {/* 6 — CTA */}
          <section className="landing-section landing-section--finalCta">
            <div className="landing-section__inner landing-section__inner--finalCta">
              <div>
                <h2 className="landing-section__title">Join the Amazon FBA dashboard early access.</h2>
                <p className="landing-section__body">
                  Be among the first operators to use Freedoliapp as your central view of suppliers,
                  purchase orders, inventory and profit.
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

