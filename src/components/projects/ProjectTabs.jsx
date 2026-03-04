import React, { useState } from 'react'
import Card from '../ui/Card'
import Button from '../ui/Button'
import useT from '../../hooks/useT'

const TABS = ['quotes', 'samples', 'po', 'shipment', 'ledger']

/**
 * F8.3.4 — Pestanyes de detall de projecte (Quotes / Samples / PO / Shipment / Ledger).
 * De moment mostren placeholders; es poden wiring components existents més endavant.
 */
export default function ProjectTabs() {
  const t = useT()
  const [tab, setTab] = useState('quotes')

  return (
    <div className="project-tabs">
      <div className="project-tabs__nav">
        {TABS.map((key) => {
          const active = tab === key
          return (
            <Button
              key={key}
              type="button"
              variant={active ? 'secondary' : 'ghost'}
              size="sm"
              className={active ? 'project-tabs__navButton project-tabs__navButton--active' : 'project-tabs__navButton'}
              onClick={() => setTab(key)}
            >
              {t(`projects.tabs.${key}`)}
            </Button>
          )
        })}
      </div>
      <Card className="project-tabs__card">
        <p className="project-tabs__placeholder">
          {t('projects.tabs.comingSoon')}
        </p>
      </Card>
    </div>
  )
}

