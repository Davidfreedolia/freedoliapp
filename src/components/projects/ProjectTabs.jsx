import React, { useState } from 'react'
import Card from '../ui/Card'
import Button from '../ui/Button'
import useT from '../../hooks/useT'
import ProjectQuotesSection from './sections/ProjectQuotesSection'
import ProjectSamplesSection from './sections/ProjectSamplesSection'
import ProjectPOSection from './sections/ProjectPOSection'
import ProjectShipmentSection from './sections/ProjectShipmentSection'
import ProjectLedgerSection from './sections/ProjectLedgerSection'
import ProjectEconomicsSection from './sections/ProjectEconomicsSection'

const TABS = ['quotes', 'samples', 'po', 'shipment', 'ledger', 'economics']

export default function ProjectTabs({ projectId, darkMode }) {
  const t = useT()
  const [tab, setTab] = useState('quotes')

  const renderContent = () => {
    switch (tab) {
      case 'quotes':
        return <ProjectQuotesSection projectId={projectId} darkMode={darkMode} />
      case 'samples':
        return <ProjectSamplesSection projectId={projectId} darkMode={darkMode} />
      case 'po':
        return <ProjectPOSection projectId={projectId} />
      case 'shipment':
        return <ProjectShipmentSection projectId={projectId} />
      case 'ledger':
        return <ProjectLedgerSection projectId={projectId} />
      case 'economics':
        return <ProjectEconomicsSection projectId={projectId} />
      default:
        return null
    }
  }

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
        {renderContent()}
      </Card>
    </div>
  )
}

