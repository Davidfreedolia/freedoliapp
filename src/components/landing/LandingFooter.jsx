import React from 'react'
import useT from '../../hooks/useT'

export default function LandingFooter() {
  const t = useT()

  return (
    <footer className="landing-footer">
      <div className="landing-footer__grid">
        <div className="landing-footer__col">
          <div className="landing-footer__colTitle">{t('landing.footer.product')}</div>
          <ul className="landing-footer__list">
            <li><a href="/login">{t('landing.footer.features')}</a></li>
            <li><a href="/login">{t('landing.footer.pricing')}</a></li>
          </ul>
        </div>
        <div className="landing-footer__col">
          <div className="landing-footer__colTitle">{t('landing.footer.company')}</div>
          <ul className="landing-footer__list">
            <li><a href="/login">{t('landing.footer.about')}</a></li>
          </ul>
        </div>
        <div className="landing-footer__col">
          <div className="landing-footer__colTitle">{t('landing.footer.support')}</div>
          <ul className="landing-footer__list">
            <li><a href="/login">{t('landing.footer.help')}</a></li>
          </ul>
        </div>
        <div className="landing-footer__col">
          <div className="landing-footer__colTitle">{t('landing.footer.legal')}</div>
          <ul className="landing-footer__list">
            <li><a href="/login">{t('landing.footer.privacy')}</a></li>
            <li><a href="/login">{t('landing.footer.terms')}</a></li>
          </ul>
        </div>
      </div>
    </footer>
  )
}
