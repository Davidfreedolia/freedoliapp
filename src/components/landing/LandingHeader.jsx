import React from 'react'
import { Link } from 'react-router-dom'
import Button from '../ui/Button'
import useT from '../../hooks/useT'

export default function LandingHeader() {
  const t = useT()

  return (
    <header className="landing-header">
      <Link to="/" className="landing-header__logo" aria-label="Freedoliapp home">
        Freedoliapp
      </Link>
      <nav className="landing-header__nav">
        <Link to="/login">
          <Button variant="ghost" size="sm">
            {t('header.cta.signin')}
          </Button>
        </Link>
        <Link to="/login">
          <Button variant="primary" size="sm">
            {t('header.cta.start')}
          </Button>
        </Link>
      </nav>
    </header>
  )
}
