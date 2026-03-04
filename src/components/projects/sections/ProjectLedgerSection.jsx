import React from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../../ui/Card'
import Button from '../../ui/Button'
import { DollarSign } from 'lucide-react'
import useT from '../../../hooks/useT'

export default function ProjectLedgerSection({ projectId }) {
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
        onClick={() => navigate(`/app/finances?project=${projectId}`)}
      >
        <DollarSign size={18} />
        {t('finances.ledger')}
      </Button>
    </Card>
  )
}

