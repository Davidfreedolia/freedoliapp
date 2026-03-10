import React from 'react'
import privacyMd from '../../../../docs/LEGAL/PRIVACY_POLICY.md?raw'

export default function Privacy() {
  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <h1 style={{ fontSize: 24, marginBottom: '1.5rem' }}>Privacy Policy</h1>
      <pre
        style={{
          whiteSpace: 'pre-wrap',
          fontFamily: 'inherit',
          lineHeight: 1.5,
          fontSize: 14,
        }}
      >
        {privacyMd}
      </pre>
    </main>
  )
}

