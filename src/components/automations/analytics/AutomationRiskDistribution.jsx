import React from 'react'
import Card from '../../ui/Card'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts'

const COLORS = {
  low: '#2ECC71',
  medium: '#FFD93D',
  high: '#FF9F43',
  critical: '#FF6B6B',
}

export default function AutomationRiskDistribution({ risk }) {
  const list = Array.isArray(risk) ? risk : []
  const bands = ['low', 'medium', 'high', 'critical']
  const data = bands.map((band) => {
    const found = list.find((r) => r.band === band)
    return { band, count: found?.count ?? 0 }
  })

  return (
    <Card className="ui-card--elevated" style={{ padding: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1, #111827)', marginBottom: 8 }}>
        Risk distribution
      </div>
      <div style={{ width: '100%', height: 220 }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 10, right: 16, bottom: 0, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="band" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell // eslint-disable-line react/no-array-index-key
                  key={`cell-${index}`}
                  fill={COLORS[entry.band] || '#e5e7eb'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

