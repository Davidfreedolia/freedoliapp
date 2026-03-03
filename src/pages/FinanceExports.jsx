import { useState, useEffect, useCallback } from 'react'
import { Calendar, Download, RefreshCw } from 'lucide-react'
import Header from '../components/Header'
import Button from '../components/Button'
import { supabase } from '../lib/supabase'
import { useApp } from '../context/AppContext'
import { showToast } from '../components/Toast'

const currentYear = new Date().getFullYear()
const currentQuarter = Math.floor((new Date().getMonth() / 3)) + 1

export default function FinanceExports() {
  const { darkMode } = useApp()
  const [year, setYear] = useState(currentYear)
  const [quarter, setQuarter] = useState(currentQuarter)
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [reloading, setReloading] = useState(false)

  const hasPending = jobs.some(j => j.status === 'queued' || j.status === 'running')

  const loadJobs = useCallback(async () => {
    setReloading(true)
    try {
      const { data, error } = await supabase.rpc('list_quarter_pack_jobs', { p_limit: 20 })
      if (error) throw error
      setJobs(data || [])
    } catch (err) {
      console.error('Error carregant jobs trimestrals:', err)
      showToast(err.message || 'Error carregant exportacions trimestrals', 'error')
    } finally {
      setLoading(false)
      setReloading(false)
    }
  }, [])

  useEffect(() => {
    loadJobs()
  }, [loadJobs])

  useEffect(() => {
    if (!hasPending) return
    const id = setInterval(() => {
      loadJobs()
    }, 5000)
    return () => clearInterval(id)
  }, [hasPending, loadJobs])

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const { data, error } = await supabase.rpc('request_quarter_pack', {
        p_year: year,
        p_quarter: quarter
      })
      if (error) throw error
      const row = Array.isArray(data) ? data[0] : data
      if (row?.job_id) {
        showToast('Quarterly pack en cua de generació', 'success')
        await loadJobs()
      } else {
        showToast('No s\'ha pogut crear el job d\'exportació', 'error')
      }
    } catch (err) {
      console.error('Error generant quarter pack:', err)
      showToast(err.message || 'Error generant l\'export trimestral', 'error')
    } finally {
      setGenerating(false)
    }
  }

  const handleDownload = async (job) => {
    if (!job?.id) return
    try {
      const { data, error } = await supabase.rpc('get_quarter_pack_signed_url', {
        p_job_id: job.id
      })
      if (error) throw error
      const row = Array.isArray(data) ? data[0] : data
      if (!row?.signed_url) {
        showToast('No s\'ha pogut obtenir el link de descàrrega', 'error')
        return
      }
      window.open(row.signed_url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      console.error('Error obtenint signed URL:', err)
      showToast(err.message || 'Error obtenint el link de descàrrega', 'error')
    }
  }

  const containerStyle = {
    padding: '32px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  }

  const cardStyle = {
    borderRadius: '16px',
    padding: '20px',
    boxShadow: 'var(--shadow-soft)',
    border: 'none',
    backgroundColor: darkMode ? 'var(--surface-bg)' : '#ffffff'
  }

  return (
    <div style={containerStyle}>
      <Header
        title="Quarterly exports"
        description="Genera i descarrega packs trimestrals (P&L, cashflow, ledger i reconciliation)."
        icon={Calendar}
      />

      {/* Controls */}
      <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>Year</label>
            <input
              type="number"
              value={year}
              onChange={e => setYear(parseInt(e.target.value || String(currentYear), 10))}
              style={{
                padding: '8px 10px',
                borderRadius: 8,
                border: '1px solid var(--border-color)',
                width: 100
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>Quarter</label>
            <select
              value={quarter}
              onChange={e => setQuarter(parseInt(e.target.value, 10))}
              style={{
                padding: '8px 10px',
                borderRadius: 8,
                border: '1px solid var(--border-color)',
                minWidth: 100
              }}
            >
              <option value={1}>Q1</option>
              <option value={2}>Q2</option>
              <option value={3}>Q3</option>
              <option value={4}>Q4</option>
            </select>
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Button
            variant="secondary"
            size="sm"
            onClick={loadJobs}
            disabled={reloading}
          >
            <RefreshCw size={14} />
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleGenerate}
            disabled={generating}
          >
            <Calendar size={16} />
            {generating ? 'Generating…' : 'Generate quarterly pack'}
          </Button>
        </div>
      </div>

      {/* Jobs table */}
      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600, color: darkMode ? '#e5e7eb' : '#374151' }}>
          Recent export jobs
        </h3>
        {loading ? (
          <div style={{ padding: '24px', fontSize: 13, color: '#6b7280' }}>
            Carregant jobs...
          </div>
        ) : jobs.length === 0 ? (
          <div style={{ padding: '24px', fontSize: 13, color: '#6b7280' }}>
            Encara no hi ha exportacions trimestrals creades.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={thStyle}>Year</th>
                  <th style={thStyle}>Quarter</th>
                  <th style={thStyle}>Period</th>
                  <th style={thStyle}>Base currency</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Created at</th>
                  <th style={thStyle}>Error</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map(job => (
                  <tr key={job.id}>
                    <td style={tdStyle}>{job.year}</td>
                    <td style={tdStyle}>Q{job.quarter}</td>
                    <td style={tdStyle}>{job.period_status}</td>
                    <td style={tdStyle}>{job.base_currency}</td>
                    <td style={tdStyle}>{job.status}</td>
                    <td style={tdStyle}>{job.created_at ? new Date(job.created_at).toLocaleString() : '—'}</td>
                    <td style={{ ...tdStyle, color: job.error ? '#ef4444' : '#6b7280' }}>
                      {job.error || '—'}
                    </td>
                    <td style={tdStyle}>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={job.status !== 'done'}
                        onClick={() => handleDownload(job)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                      >
                        <Download size={14} />
                        Download
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

const thStyle = {
  textAlign: 'left',
  padding: '8px 10px',
  borderBottom: '1px solid var(--border-color)',
  fontSize: 12,
  fontWeight: 600,
  color: '#6b7280',
  whiteSpace: 'nowrap'
}

const tdStyle = {
  padding: '8px 10px',
  borderBottom: '1px solid var(--border-color)',
  color: '#374151',
  whiteSpace: 'nowrap'
}

