import React from 'react'
import termsMd from '../../../docs/LEGAL/TERMS_OF_SERVICE.md?raw'

export default function Terms() {
  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <h1 style={{ fontSize: 24, marginBottom: '1.5rem' }}>Terms of Service</h1>
      <pre
        style={{
          whiteSpace: 'pre-wrap',
          fontFamily: 'inherit',
          lineHeight: 1.5,
          fontSize: 14,
        }}
      >
        {termsMd}
      </pre>
    </main>
  )
}

