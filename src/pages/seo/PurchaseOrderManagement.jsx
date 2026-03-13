import LandingHeader from '../../components/landing/LandingHeader'
import LandingFooter from '../../components/landing/LandingFooter'
import PageGutter from '../../components/ui/PageGutter'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'

export default function PurchaseOrderManagement() {
  return (
    <div className="landing-shell">
      <LandingHeader />
      <main>
        <PageGutter>
          {/* 1 — Hero */}
          <section className="landing-section">
            <div className="landing-section__inner">
              <div className="landing-section__text">
                <h1 className="landing-section__title">Purchase order management for Amazon teams.</h1>
                <p className="landing-section__body">
                  Growing brands outgrow email threads and spreadsheets for POs. A reliable purchase
                  order system keeps quantities, dates and suppliers aligned with your real demand.
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
                  How purchase orders are handled today.
                </h2>
                <p className="landing-section__body">
                  Many operations teams manage POs across Excel templates, PDF attachments and chat
                  messages. Every change requires manual updates and confirmations.
                </p>
              </div>
              <div className="landing-section__visual">
                <Card className="landing-moduleCard">
                  <h3>Spreadsheet‑driven POs</h3>
                  <p>
                    Versioned PO files, email approvals and one‑off status updates make it hard to
                    know what has actually been ordered and what is still pending.
                  </p>
                </Card>
              </div>
            </div>
          </section>

          {/* 3 — Why current tools fail */}
          <section className="landing-section">
            <div className="landing-section__inner">
              <h2 className="landing-section__title">Why email + sheets fail for POs.</h2>
              <ul className="landing-problemList">
                <li>No single source of truth for quantities and dates.</li>
                <li>Hard to connect POs to inventory coverage and Amazon demand.</li>
                <li>Approvals and changes are scattered across threads and comments.</li>
                <li>Little visibility into which POs are blocked or at risk.</li>
              </ul>
            </div>
          </section>

          {/* 4 — What a proper system should look like */}
          <section className="landing-section landing-section--alt">
            <div className="landing-section__inner">
              <h2 className="landing-section__title">
                What a resilient purchase order system should provide.
              </h2>
              <p className="landing-section__body">
                A proper PO system gives each order a clear lifecycle: drafted, approved, in
                production, in transit and received. It ties every PO back to SKUs, suppliers and
                expected arrival dates.
              </p>
            </div>
          </section>

          {/* 5 — How Freedoliapp approaches the problem */}
          <section className="landing-section">
            <div className="landing-section__inner">
              <h2 className="landing-section__title">
                How Freedoliapp approaches purchase order management.
              </h2>
              <p className="landing-section__body">
                Freedoliapp treats POs as the backbone of your operations. It focuses on quantities,
                lead times and supplier reliability so you can plan inventory and cash with more
                confidence.
              </p>
            </div>
          </section>

          {/* 6 — CTA */}
          <section className="landing-section landing-section--finalCta">
            <div className="landing-section__inner landing-section__inner--finalCta">
              <div>
                <h2 className="landing-section__title">
                  Join the purchase order management early access.
                </h2>
                <p className="landing-section__body">
                  Help shape how Freedoliapp structures POs for Amazon operations, from request to
                  received units.
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

