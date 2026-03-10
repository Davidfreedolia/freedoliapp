import React from 'react'
import { Link } from 'react-router-dom'

export default function LegalIndex() {
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <h1 style={{ fontSize: 24, marginBottom: '1rem' }}>Legal</h1>
      <p style={{ fontSize: 14, color: '#4b5563', marginBottom: '1.5rem' }}>
        Here you can find the main legal documents that govern the use of FREEDOLIAPP.
      </p>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 14 }}>
        <li style={{ marginBottom: 8 }}>
          <Link to="/privacy">Privacy Policy</Link>
        </li>
        <li style={{ marginBottom: 8 }}>
          <Link to="/terms">Terms of Service</Link>
        </li>
        <li style={{ marginBottom: 8 }}>
          <Link to="/cookies">Cookie Policy</Link>
        </li>
        <li style={{ marginBottom: 8 }}>
          <Link to="/dpa">Data Processing Agreement</Link>
        </li>
      </ul>
    </main>
  )
}

