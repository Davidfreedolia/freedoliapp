/**
 * Canonical phase decision actions: PASSA | NO PASSA | CANDAU (override).
 * Single reusable block for Research, Viability, etc. — UI + layout only.
 */

import { CheckCircle2, XCircle, Lock } from 'lucide-react'
import Button from '../Button'

export default function PhaseDecisionActions({
  canPass = false,
  canNoPass = true,
  onPass,
  onNoPass,
  onOverride,
  showOverride = false,
  showNoPass = true,
  disabledReason = null,
  overrideTitle = 'Forçar PASSA (override)',
  passLabel = 'PASSA',
  noPassLabel = 'NO PASSA',
  passTitle = '',
  noPassTitle = '',
  decision = null
}) {
  return (
    <div className="phase-decision-actions">
      <div className="phase-decision-actions__row">
        <Button
          variant="primary"
          size="sm"
          className="btn"
          onClick={onPass}
          disabled={!canPass}
          title={canPass ? (passTitle || passLabel) : (disabledReason || passTitle)}
          aria-label={passLabel}
        >
          <CheckCircle2 size={18} strokeWidth={2} />
          {passLabel}
        </Button>
        {showNoPass && (
          <Button
            variant="danger"
            size="sm"
            className="btn btn--danger"
            onClick={onNoPass}
            disabled={!canNoPass}
            title={canNoPass ? (noPassTitle || noPassLabel) : (noPassTitle || disabledReason || "Primer defineix l'ASIN")}
            aria-label={noPassLabel}
          >
            <XCircle size={18} strokeWidth={2} />
            {noPassLabel}
          </Button>
        )}
        {showOverride && (
          <Button
            variant="ghost"
            size="sm"
            className="btn btn--ghost-icon btn--icon"
            onClick={onOverride}
            title={overrideTitle}
            aria-label={overrideTitle}
          >
            <Lock size={18} strokeWidth={2} />
          </Button>
        )}
      </div>
    </div>
  )
}
