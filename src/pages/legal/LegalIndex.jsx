import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function LegalIndex() {
  const { t } = useTranslation()
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <h1 style={{ fontSize: 24, marginBottom: '1rem' }}>{t('legalIndex.title')}</h1>
      <p style={{ fontSize: 14, color: '#4b5563', marginBottom: '1.5rem' }}>
        {t('legalIndex.subtitle')}
      </p>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 14 }}>
        <li style={{ marginBottom: 8 }}>
          <Link to="/privacy">{t('legalIndex.privacy')}</Link>
        </li>
        <li style={{ marginBottom: 8 }}>
          <Link to="/terms">{t('legalIndex.terms')}</Link>
        </li>
        <li style={{ marginBottom: 8 }}>
          <Link to="/cookies">{t('legalIndex.cookies')}</Link>
        </li>
        <li style={{ marginBottom: 8 }}>
          <Link to="/dpa">{t('legalIndex.dpa')}</Link>
        </li>
      </ul>
    </main>
  )
}
