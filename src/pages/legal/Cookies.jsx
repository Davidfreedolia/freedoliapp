import React from 'react'
import cookiesMd from '../../../docs/LEGAL/COOKIE_POLICY.md?raw'

export default function Cookies() {
  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <h1 style={{ fontSize: 24, marginBottom: '1.5rem' }}>Cookie Policy</h1>
      <pre
        style={{
          whiteSpace: 'pre-wrap',
          fontFamily: 'inherit',
          lineHeight: 1.5,
          fontSize: 14,
        }}
      >
        {cookiesMd}
      </pre>
    </main>
  )
}

