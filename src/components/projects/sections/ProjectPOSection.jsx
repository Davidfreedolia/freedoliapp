import React from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../../ui/Card'
import Button from '../../ui/Button'
import { ShoppingCart } from 'lucide-react'
import useT from '../../../hooks/useT'

export default function ProjectPOSection({ projectId }) {
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
        <ShoppingCart size={18} />
        {t('projects.tabs.po')}
      </Button>
    </Card>
  )
}

