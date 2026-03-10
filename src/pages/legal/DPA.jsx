import React from 'react'
import dpaMd from '../../../docs/LEGAL/DPA.md?raw'

export default function DPA() {
  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <h1 style={{ fontSize: 24, marginBottom: '1.5rem' }}>Data Processing Agreement</h1>
      <pre
        style={{
          whiteSpace: 'pre-wrap',
          fontFamily: 'inherit',
          lineHeight: 1.5,
          fontSize: 14,
        }}
      >
        {dpaMd}
      </pre>
    </main>
  )
}

