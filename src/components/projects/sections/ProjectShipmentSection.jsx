import React from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../../ui/Card'
import Button from '../../ui/Button'
import { Truck } from 'lucide-react'
import useT from '../../../hooks/useT'

export default function ProjectShipmentSection({ projectId }) {
  const navigate = useNavigate()
  const t = useT()

  return (
    <Card>
      <p className="project-tabs__placeholder">
        {t('finances.long')}
      </p>
      <Button
        variant="primary"
        size="sm"
        onClick={() => navigate(`/app/orders?project=${projectId}`)}
      >
        <Truck size={18} />
        {t('projects.tabs.shipment')}
      </Button>
    </Card>
  )
}

