import { useTranslation } from 'react-i18next'
import { X, ExternalLink, CheckCircle2 } from 'lucide-react'

/**
 * ExportGuide — modal explaining how to export data from a specific source.
 *
 * Props:
 *   sourceId: string (e.g. 'sellerboard')
 *   isOpen: boolean
 *   onClose: () => void
 *   darkMode: boolean
 */
const STEPS_BY_SOURCE = {
  sellerboard: [
    { key: 'step1', defaultLabel: 'Obre Sellerboard i ves al Dashboard.' },
    { key: 'step2', defaultLabel: 'Selecciona el període (recomanem els últims 3-6 mesos).' },
    { key: 'step3', defaultLabel: 'Clica "Export" (icona de descàrrega) i tria CSV o Excel.' },
    { key: 'step4', defaultLabel: 'Torna aquí i puja el fitxer.' },
  ],
  helium10: [
    { key: 'step1', defaultLabel: 'Ves a Profits → Products dins Helium 10.' },
    { key: 'step2', defaultLabel: 'Selecciona el rang de dates i clica "Export CSV".' },
    { key: 'step3', defaultLabel: 'Puja el fitxer aquí.' },
  ],
  junglescout: [
    { key: 'step1', defaultLabel: 'Dins Jungle Scout, obre Product Database o Sales Analytics.' },
    { key: 'step2', defaultLabel: 'Aplica els filtres que vulguis i clica "Export".' },
    { key: 'step3', defaultLabel: 'Puja el CSV resultant aquí.' },
  ],
  inventorylab: [
    { key: 'step1', defaultLabel: 'A InventoryLab, ves al Stratify Dashboard.' },
    { key: 'step2', defaultLabel: 'Genera l\'informe de P&L o inventari i clica "Export".' },
    { key: 'step3', defaultLabel: 'Puja el fitxer aquí.' },
  ],
  sostocked: [
    { key: 'step1', defaultLabel: 'A SoStocked, obre Inventory → Product List.' },
    { key: 'step2', defaultLabel: 'Clica "Export to CSV" a la barra superior.' },
    { key: 'step3', defaultLabel: 'Puja el fitxer aquí.' },
  ],
  keepa: [
    { key: 'step1', defaultLabel: 'A Keepa, obre la pàgina del producte.' },
    { key: 'step2', defaultLabel: 'Clica la icona d\'exportació (CSV) a la gràfica de preus.' },
    { key: 'step3', defaultLabel: 'Puja el fitxer aquí.' },
  ],
  amazon: [
    { key: 'step1', defaultLabel: 'A Seller Central, ves a Reports → Business Reports (o Fulfillment).' },
    { key: 'step2', defaultLabel: 'Selecciona el període i descarrega com a CSV.' },
    { key: 'step3', defaultLabel: 'Puja el fitxer aquí.' },
  ],
  holded: [
    { key: 'step1', defaultLabel: 'A Holded, ves a la secció que vulguis exportar (Facturas, Gastos, Productos).' },
    { key: 'step2', defaultLabel: 'Clica el botó d\'exportació (icona de descàrrega) i tria CSV o Excel.' },
    { key: 'step3', defaultLabel: 'Puja el fitxer aquí.' },
  ],
  quickbooks: [
    { key: 'step1', defaultLabel: 'A QuickBooks, executa el report que vulguis (Transaction List, P&L).' },
    { key: 'step2', defaultLabel: 'Selecciona "Export → Excel" o CSV.' },
    { key: 'step3', defaultLabel: 'Puja el fitxer aquí.' },
  ],
  xero: [
    { key: 'step1', defaultLabel: 'A Xero, obre Business → Invoices.' },
    { key: 'step2', defaultLabel: 'Clica "Export" i selecciona CSV.' },
    { key: 'step3', defaultLabel: 'Puja el fitxer aquí.' },
  ],
  asana: [
    { key: 'step1', defaultLabel: 'Obre el projecte que vulguis exportar a Asana.' },
    { key: 'step2', defaultLabel: 'Clica "···" al header del projecte → Export → CSV.' },
    { key: 'step3', defaultLabel: 'Puja el fitxer aquí.' },
  ],
  monday: [
    { key: 'step1', defaultLabel: 'Obre el board que vulguis exportar a Monday.com.' },
    { key: 'step2', defaultLabel: 'Menú del board → Export to Excel o CSV.' },
    { key: 'step3', defaultLabel: 'Puja el fitxer aquí.' },
  ],
  trello: [
    { key: 'step1', defaultLabel: 'Obre el board a Trello i ves a "Show Menu" → More → Print and Export.' },
    { key: 'step2', defaultLabel: 'Clica "Export as JSON" i desa el fitxer.' },
    { key: 'step3', defaultLabel: 'Puja el JSON aquí (el parser el llegirà automàticament).' },
  ],
  notion: [
    { key: 'step1', defaultLabel: 'A Notion, obre la base de dades que vulguis exportar.' },
    { key: 'step2', defaultLabel: '··· a la part superior dreta → Export → CSV.' },
    { key: 'step3', defaultLabel: 'Puja el fitxer aquí.' },
  ],
  airtable: [
    { key: 'step1', defaultLabel: 'A Airtable, obre la taula que vulguis exportar.' },
    { key: 'step2', defaultLabel: 'Clica "···" al nom de la vista → Download CSV.' },
    { key: 'step3', defaultLabel: 'Puja el fitxer aquí.' },
  ],
  generic: [
    { key: 'step1', defaultLabel: 'Obre el fitxer amb Excel, Google Sheets o qualsevol full de càlcul.' },
    { key: 'step2', defaultLabel: 'Assegura\'t que la primera fila conté els noms de les columnes.' },
    { key: 'step3', defaultLabel: 'Desa com a CSV o XLSX i puja el fitxer aquí.' },
  ],
}

export default function ExportGuide({ sourceId = 'generic', sourceLabel = '', isOpen, onClose, darkMode = false }) {
  const { t } = useTranslation()
  if (!isOpen) return null

  const steps = STEPS_BY_SOURCE[sourceId] || STEPS_BY_SOURCE.generic
  const muted = darkMode ? '#9aa1b4' : '#6b7280'
  const ink = darkMode ? '#e6e9f2' : '#1f2937'
  const borderColor = darkMode ? '#2a2a3a' : 'rgba(31,95,99,0.14)'

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1100, padding: 20,
      }}
    >
      <div style={{
        width: '100%', maxWidth: 520, maxHeight: '85vh', overflowY: 'auto',
        backgroundColor: darkMode ? '#15151f' : '#ffffff',
        borderRadius: 16, padding: 20,
        boxShadow: '0 20px 60px rgba(0,0,0,0.35)', color: ink,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
            <ExternalLink size={16} style={{ verticalAlign: -3, marginRight: 6 }} color="var(--brand-1,#1F5F63)" />
            {t('dataImport.guide.title', { defaultValue: 'Com exportar de {{source}}', source: sourceLabel || sourceId })}
          </h3>
          <button onClick={onClose} aria-label="close" style={{
            background: 'transparent', border: 'none', cursor: 'pointer', color: muted, padding: 4,
          }}>
            <X size={18} />
          </button>
        </div>
        <ol style={{ margin: 0, padding: '0 0 0 6px', listStyle: 'none' }}>
          {steps.map((step, i) => (
            <li key={step.key} style={{
              display: 'flex', gap: 10, padding: '10px 0',
              borderTop: i === 0 ? 'none' : `1px solid ${borderColor}`,
            }}>
              <div style={{
                flexShrink: 0,
                width: 26, height: 26, borderRadius: '50%',
                backgroundColor: 'var(--brand-1,#1F5F63)',
                color: '#ffffff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700,
              }}>{i + 1}</div>
              <div style={{ fontSize: 13, lineHeight: 1.5 }}>
                {t(`dataImport.guide.${sourceId}.${step.key}`, step.defaultLabel)}
              </div>
            </li>
          ))}
        </ol>
        <div style={{
          marginTop: 12, padding: '8px 10px', borderRadius: 8,
          backgroundColor: 'rgba(110,203,195,0.14)', color: ink, fontSize: 12,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <CheckCircle2 size={14} color="#3FBF9A" />
          {t('dataImport.guide.hint', 'Un cop tinguis el fitxer, tanca aquest missatge i puja\'l.')}
        </div>
      </div>
    </div>
  )
}
