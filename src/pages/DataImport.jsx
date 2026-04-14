import { useTranslation } from 'react-i18next'
import { Database } from 'lucide-react'
import { useApp } from '../context/AppContext'
import DataImportWizard from '../components/import/DataImportWizard'

export default function DataImport() {
  const { t } = useTranslation()
  const { darkMode } = useApp()

  return (
    <div style={{ padding: '20px 24px' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{
          margin: 0, fontSize: 22, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Database size={20} color="var(--brand-1,#1F5F63)" />
          {t('dataImport.page.title', 'Importar dades')}
        </h1>
        <p style={{ margin: '4px 0 0', color: 'var(--muted-1,#6b7280)', fontSize: 13 }}>
          {t('dataImport.page.subtitle', 'Migra dades des d\'altres eines (Helium 10, Sellerboard, Amazon Seller Central, Excel…) sense tornar a introduir-les manualment.')}
        </p>
      </div>
      <DataImportWizard darkMode={darkMode} />
    </div>
  )
}
