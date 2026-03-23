import React from 'react'
import { Compass } from 'lucide-react'
import Card from '../ui/Card'
import Button from '../Button'

/**
 * R0.3 — Reusable next-step guidance card.
 * Title, short description, primary CTA, optional secondary CTA and icon.
 */
export default function NextStepCard({
  title,
  description,
  ctaLabel,
  ctaOnClick,
  secondaryCtaLabel,
  secondaryCtaOnClick,
  icon: Icon = Compass
}) {
  return (
    <Card className="next-step-card" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        {Icon && (
          <span style={{ color: 'var(--primary-1)', flexShrink: 0, marginTop: 2 }}>
            <Icon size={20} aria-hidden />
          </span>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          {title && (
            <h3 style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>
              {title}
            </h3>
          )}
          {description && (
            <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--muted-1)', lineHeight: 1.45 }}>
              {description}
            </p>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {ctaLabel && (
              <Button variant="primary" size="sm" onClick={ctaOnClick}>
                {ctaLabel}
              </Button>
            )}
            {secondaryCtaLabel && secondaryCtaOnClick && (
              <Button variant="secondary" size="sm" onClick={secondaryCtaOnClick}>
                {secondaryCtaLabel}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}
