import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { FileSpreadsheet, Upload, RefreshCw, Play, ExternalLink, Link2 } from 'lucide-react'
import Header from '../components/Header'
import Button from '../components/Button'
import { supabase, getCurrentUserId } from '../lib/supabase'
import { useApp } from '../context/AppContext'
import { useWorkspace } from '../contexts/WorkspaceContext'
import { showToast } from '../components/Toast'

const SPAPI_STATE_KEY = 'spapi_oauth_state'
const SPAPI_REDIRECT_URI_KEY = 'spapi_oauth_redirect_uri'

const BUCKET = 'amazon-imports'

function sha256Hex(buffer) {
  return crypto.subtle.digest('SHA-256', buffer).then(hash =>
    Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
  )
}

export default function AmazonImports() {
  const { t } = useTranslation()
  const { darkMode } = useApp()
  const { activeOrgId } = useWorkspace() || {}
  const [jobs, setJobs] = useState([])
  const [spapiConnections, setSpapiConnections] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [processingId, setProcessingId] = useState(null)
  const [marketplace, setMarketplace] = useState('EU')
  const [reportType, setReportType] = useState('settlement')
  const [dragOver, setDragOver] = useState(false)

  const hasPending = jobs.some(j =>
    j.status === 'uploaded' || j.status === 'parsing' || j.status === 'parsed' || j.status === 'posting'
  )

  const loadJobs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('amazon_import_jobs')
        .select('id, org_id, file_name, marketplace, report_type, status, total_rows, parsed_rows, error, created_at')
        .order('created_at', { ascending: false })
        .limit(20)
      if (error) throw error
      setJobs(data || [])
    } catch (err) {
      console.error('Error loading amazon import jobs:', err)
      showToast(err?.message || t('amazonImports.toasts.loadError'), 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadSpapiConnections = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_spapi_connection_safe')
      if (error) throw error
      setSpapiConnections(data || [])
    } catch (err) {
      console.error('Error loading SP-API connections:', err)
    }
  }, [])

  useEffect(() => {
    loadJobs()
    loadSpapiConnections()
  }, [loadJobs, loadSpapiConnections])

  // OAuth login step: Amazon redirected here with amazon_callback_uri, amazon_state, selling_partner_id
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const amazonCallbackUri = params.get('amazon_callback_uri')
    const amazonState = params.get('amazon_state')
    const sellingPartnerId = params.get('selling_partner_id')
    if (amazonCallbackUri && amazonState) {
      const state = sessionStorage.getItem(SPAPI_STATE_KEY)
      const redirectUri = sessionStorage.getItem(SPAPI_REDIRECT_URI_KEY)
      if (state && redirectUri) {
        const redirectUrl = `${amazonCallbackUri}?${new URLSearchParams({
          redirect_uri: redirectUri,
          amazon_state: amazonState,
          state
        })}`
        sessionStorage.removeItem(SPAPI_STATE_KEY)
        sessionStorage.removeItem(SPAPI_REDIRECT_URI_KEY)
        window.location.href = redirectUrl
        return
      }
    }
    // Success/error from final callback
    const spapi = params.get('spapi')
    const message = params.get('message')
    if (spapi === 'success') {
      showToast(t('amazonImports.toasts.spapiConnected'), 'success')
      loadSpapiConnections()
      window.history.replaceState({}, '', window.location.pathname)
    } else if (spapi === 'error' && message) {
      showToast(t('amazonImports.toasts.spapiError', { message: decodeURIComponent(message) }), 'error')
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [loadSpapiConnections])

  useEffect(() => {
    if (!hasPending && !processingId) return
    const id = setInterval(loadJobs, 3000)
    return () => clearInterval(id)
  }, [hasPending, processingId, loadJobs])

  const handleFile = async (file) => {
    if (!file || !file.name.toLowerCase().endsWith('.csv')) {
      showToast(t('amazonImports.toasts.onlyCsv'), 'error')
      return
    }
    setUploading(true)
    try {
      const buffer = await file.arrayBuffer()
      const sha256 = await sha256Hex(buffer)
      const { data: row, error: rpcErr } = await supabase.rpc('create_amazon_import_job', {
        p_file_name: file.name,
        p_file_sha256: sha256,
        p_marketplace: marketplace.trim() || 'EU',
        p_report_type: reportType.trim() || 'settlement'
      })
      if (rpcErr) throw rpcErr
      const out = Array.isArray(row) ? row[0] : row
      if (!out?.job_id || !out?.org_id) {
        showToast(t('amazonImports.toasts.jobCreateFailed'), 'error')
        return
      }
      const path = `org/${out.org_id}/amazon/imports/${out.job_id}.csv`
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
        upsert: true,
        contentType: file.type || 'text/csv'
      })
      if (upErr) throw upErr
      showToast(t('amazonImports.toasts.uploaded'), 'success')
      await loadJobs()
    } catch (err) {
      console.error('Upload error:', err)
      showToast(err?.message || t('amazonImports.toasts.uploadError'), 'error')
    } finally {
      setUploading(false)
    }
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer?.files?.[0]
    if (file) handleFile(file)
  }

  const onDragOver = (e) => {
    e.preventDefault()
    setDragOver(true)
  }
  const onDragLeave = () => setDragOver(false)

  const handleProcess = async (job) => {
    if (!job?.id || !job?.org_id) return
    const path = `org/${job.org_id}/amazon/imports/${job.id}.csv`
    setProcessingId(job.id)
    try {
      const { data, error } = await supabase.functions.invoke('amazon-csv-parse', {
        body: { job_id: job.id, storage_path: path }
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      showToast(t('amazonImports.toasts.processing'), 'success')
      await loadJobs()
    } catch (err) {
      console.error('Process error:', err)
      showToast(err?.message || t('amazonImports.toasts.processError'), 'error')
      await loadJobs()
    } finally {
      setProcessingId(null)
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

  const dropZoneStyle = {
    border: `2px dashed ${dragOver ? 'var(--color-primary)' : 'var(--border-color)'}`,
    borderRadius: 12,
    padding: '32px 24px',
    textAlign: 'center',
    backgroundColor: dragOver ? (darkMode ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.05)') : 'transparent',
    cursor: uploading ? 'wait' : 'pointer'
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

  const statusColor = (s) => {
    if (s === 'done') return '#22c55e'
    if (s === 'failed') return '#ef4444'
    if (['parsing', 'parsed', 'posting'].includes(s)) return '#f59e0b'
    return '#6b7280'
  }

  const handleConnectAmazon = async () => {
    if (!activeOrgId) {
      showToast(t('amazonImports.toasts.selectOrg'), 'error')
      return
    }
    setConnecting(true)
    try {
      const userId = await getCurrentUserId()
      if (!userId) {
        showToast(t('amazonImports.toasts.invalidSession'), 'error')
        return
      }
      const { data, error } = await supabase.functions.invoke('spapi-oauth-init', {
        body: { org_id: activeOrgId, user_id: userId, region: 'EU', marketplace_ids: [] }
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      const consentUrl = data?.consent_url
      const state = data?.state
      const redirectUri = data?.redirect_uri
      if (!consentUrl || !state) {
        showToast(t('amazonImports.toasts.oauthFailed'), 'error')
        return
      }
      sessionStorage.setItem(SPAPI_STATE_KEY, state)
      if (redirectUri) sessionStorage.setItem(SPAPI_REDIRECT_URI_KEY, redirectUri)
      window.location.href = consentUrl
    } catch (err) {
      console.error('SP-API init error:', err)
      showToast(err?.message || t('amazonImports.toasts.connectError'), 'error')
    } finally {
      setConnecting(false)
    }
  }

  return (
    <div style={containerStyle}>
      <Header
        title={t('amazonImports.title')}
        description={t('amazonImports.description')}
        icon={FileSpreadsheet}
      />

      {/* SP-API connections */}
      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600, color: darkMode ? '#e5e7eb' : '#374151' }}>
          Amazon SP-API
        </h3>
        {spapiConnections.length > 0 ? (
          <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--success-1)' }}>{t('amazonImports.connected')}</p>
        ) : null}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <Button
            variant="primary"
            size="sm"
            disabled={connecting || !activeOrgId}
            onClick={handleConnectAmazon}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Link2 size={14} />
            {connecting ? t('amazonImports.redirecting') : t('amazonImports.connectAmazon')}
          </Button>
        </div>
        {spapiConnections.length > 0 && (
          <div style={{ marginTop: 12, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={thStyle}>{t('amazonImports.headers.region')}</th>
                  <th style={thStyle}>{t('amazonImports.headers.sellerId')}</th>
                  <th style={thStyle}>{t('amazonImports.headers.status')}</th>
                  <th style={thStyle}>{t('amazonImports.headers.lastSync')}</th>
                </tr>
              </thead>
              <tbody>
                {spapiConnections.map((c) => (
                  <tr key={c.id}>
                    <td style={tdStyle}>{c.region}</td>
                    <td style={tdStyle}>{c.seller_id}</td>
                    <td style={tdStyle}>{c.status}</td>
                    <td style={tdStyle}>{c.last_sync_at ? new Date(c.last_sync_at).toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Drop zone + options */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
          <div>
            <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>{t('amazonImports.headers.marketplace')}</label>
            <input
              type="text"
              value={marketplace}
              onChange={e => setMarketplace(e.target.value)}
              placeholder="EU"
              style={{
                padding: '8px 10px',
                borderRadius: 8,
                border: '1px solid var(--border-color)',
                minWidth: 120
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>{t('amazonImports.reportType')}</label>
            <input
              type="text"
              value={reportType}
              onChange={e => setReportType(e.target.value)}
              placeholder="settlement"
              style={{
                padding: '8px 10px',
                borderRadius: 8,
                border: '1px solid var(--border-color)',
                minWidth: 140
              }}
            />
          </div>
        </div>
        <div
          style={dropZoneStyle}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => document.getElementById('amazon-csv-input')?.click()}
        >
          <input
            id="amazon-csv-input"
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
          />
          <Upload size={32} style={{ marginBottom: 8, opacity: 0.7 }} />
          <p style={{ margin: 0, fontSize: 14, color: '#6b7280' }}>
            {uploading ? t('amazonImports.uploading') : t('amazonImports.dropHint')}
          </p>
        </div>
      </div>

      {/* Jobs table */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: darkMode ? '#e5e7eb' : '#374151' }}>
            {t('amazonImports.recentJobs')}
          </h3>
          <Button variant="secondary" size="sm" onClick={loadJobs} disabled={loading}>
            <RefreshCw size={14} />
            {t('amazonImports.refresh')}
          </Button>
        </div>
        {loading ? (
          <div style={{ padding: '24px', fontSize: 13, color: '#6b7280' }}>{t('common.loading')}</div>
        ) : jobs.length === 0 ? (
          <div style={{ padding: '24px', fontSize: 13, color: '#6b7280' }}>
            {t('amazonImports.emptyJobs')}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={thStyle}>{t('amazonImports.headers.file')}</th>
                  <th style={thStyle}>{t('amazonImports.headers.marketplace')}</th>
                  <th style={thStyle}>{t('amazonImports.headers.status')}</th>
                  <th style={thStyle}>{t('amazonImports.headers.totalParsed')}</th>
                  <th style={thStyle}>{t('amazonImports.headers.date')}</th>
                  <th style={thStyle}>{t('amazonImports.headers.error')}</th>
                  <th style={thStyle}>{t('amazonImports.headers.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map(job => (
                  <tr key={job.id}>
                    <td style={tdStyle}>{job.file_name || '—'}</td>
                    <td style={tdStyle}>{job.marketplace || '—'}</td>
                    <td style={{ ...tdStyle, color: statusColor(job.status) }}>{job.status}</td>
                    <td style={tdStyle}>
                      {job.total_rows != null ? `${job.total_rows}` : '—'}
                      {job.parsed_rows != null ? ` / ${job.parsed_rows}` : ''}
                    </td>
                    <td style={tdStyle}>
                      {job.created_at ? new Date(job.created_at).toLocaleString() : '—'}
                    </td>
                    <td style={{ ...tdStyle, color: job.error ? '#ef4444' : '#6b7280', maxWidth: 200 }}>
                      {job.error ? String(job.error).slice(0, 60) + (job.error.length > 60 ? '…' : '') : '—'}
                    </td>
                    <td style={tdStyle}>
                      {(job.status === 'uploaded' || job.status === 'failed') && (
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={processingId === job.id}
                          onClick={() => handleProcess(job)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                        >
                          <Play size={14} />
                          {processingId === job.id ? t('amazonImports.processingInProgress') : t('amazonImports.process')}
                        </Button>
                      )}
                      <a
                        href="/app/diagnostics"
                        style={{ marginLeft: 8, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      >
                        <ExternalLink size={12} />
                        {t('amazonImports.viewOps')}
                      </a>
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
