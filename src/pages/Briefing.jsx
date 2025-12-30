import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft,
  Save,
  Download,
  Image as ImageIcon,
  X,
  Plus,
  Trash2,
  GripVertical,
  FileText,
  Package,
  Truck,
  CheckCircle,
  AlertTriangle,
  Upload,
  Eye
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { 
  getProject,
  getCompanySettings,
  supabase
} from '../lib/supabase'
import Header from '../components/Header'
import { generateBriefingPdf } from '../lib/generateBriefingPdf'

export default function Briefing() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const { darkMode } = useApp()
  
  const [project, setProject] = useState(null)
  const [companySettings, setCompanySettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  
  const fileInputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)

  // Dades del briefing
  const [briefing, setBriefing] = useState({
    // Info bàsica
    po_ref: '',
    date: new Date().toISOString().split('T')[0],
    quote_ref: '',
    
    // Producte
    product_name: '',
    model_number: '',
    main_material: '',
    clips_material: '',
    hook_type: '',
    color: '',
    product_dimensions: '',
    net_weight_per_set: '',
    
    // Embalatge individual
    individual_packaging: '',
    packaging_size: '',
    units_per_set: '',
    
    // Caixes
    sets_per_carton: '',
    total_sets: '',
    total_cartons: '',
    carton_dimensions: '',
    
    // Qualitat
    quality_standards: 'Must match approved Trade Assurance samples.\nClean finishes, no defects.\nInferior quality will not be accepted.\n\nHan de coincidir amb les mostres aprovades sota Trade Assurance.\nAcabats nets, sense defectes.\nNo s\'acceptarà cap qualitat inferior.',
    
    // Etiquetatge
    labeling_requirements: 'Amazon FNSKU on each unit.\nMade in China on outer cartons.\nHeavy Duty marking for cartons >15 kg.\nNo staples or excessive plastic.\n\nCodi FNSKU d\'Amazon a cada unitat.\nIndicació "Made in China" a les caixes exteriors.\nMarcatge "Heavy Duty" per a caixes de més de 15 kg.\nNo es permeten grapes ni excés de plàstic.',
    
    // Logística
    delivery_address: '',
    shipping_mark: '',
    important_notes: 'Supplier must inform tracking number prior to delivery.\nEl proveïdor ha d\'informar el número de seguiment abans de l\'entrega.',
    
    // Especificacions de qualitat (text llarg)
    quality_specs_en: `In the event of defective units, the cost of the defective products will be deducted from the amount of the next order, including the unit product cost plus the corresponding shipping cost per unit to Spain.

If no subsequent purchase is placed, all defective units will be credited, including the shipping cost per unit to Spain. This condition will be valid for up to 30 days after receipt of the goods at Amazon's warehouses.

All finishes must be perfectly executed and strictly match the approved reference pictures and videos.
Products of inferior quality or not matching the approved samples will not be accepted.`,
    
    quality_specs_ca: `En cas d'unitats defectuoses, el cost dels productes defectuosos es descomptarà de l'import de la següent comanda, incloent el cost unitari del producte més el cost d'enviament corresponent per unitat fins a Espanya.

En cas que no es realitzi una comanda posterior, totes les unitats defectuoses seran abonades, incloent el cost d'enviament per unitat fins a Espanya. Aquesta condició serà vàlida fins a 30 dies després de la recepció de la mercaderia als magatzems d'Amazon.`,

    // Imatges (array de { id, file, preview, title })
    images: []
  })

  useEffect(() => {
    loadData()
  }, [projectId])

  const loadData = async () => {
    setLoading(true)
    try {
      const [projectData, settings] = await Promise.all([
        getProject(projectId),
        getCompanySettings()
      ])
      
      setProject(projectData)
      setCompanySettings(settings)
      
      // Pre-omplir amb dades del projecte
      if (projectData) {
        setBriefing(prev => ({
          ...prev,
          po_ref: projectData.sku || '',
          product_name: projectData.name || '',
          model_number: `FREEDOLIA – ${projectData.sku || ''}`,
        }))
      }
      
      // Carregar briefing existent si n'hi ha
      const { data: existingBriefing } = await supabase
        .from('briefings')
        .select('*')
        .eq('project_id', projectId)
        .single()
      
      if (existingBriefing) {
        setBriefing(prev => ({
          ...prev,
          ...existingBriefing,
          images: existingBriefing.images ? JSON.parse(existingBriefing.images) : []
        }))
      }
      
    } catch (err) {
      console.error('Error carregant dades:', err)
    }
    setLoading(false)
  }

  // Gestió d'imatges
  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
    addImages(files)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => {
    setDragOver(false)
  }

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/'))
    addImages(files)
  }

  const addImages = (files) => {
    const newImages = files.map(file => ({
      id: Date.now() + Math.random(),
      file,
      preview: URL.createObjectURL(file),
      title: ''
    }))
    
    setBriefing(prev => ({
      ...prev,
      images: [...prev.images, ...newImages]
    }))
  }

  const removeImage = (id) => {
    setBriefing(prev => ({
      ...prev,
      images: prev.images.filter(img => img.id !== id)
    }))
  }

  const updateImageTitle = (id, title) => {
    setBriefing(prev => ({
      ...prev,
      images: prev.images.map(img => 
        img.id === id ? { ...img, title } : img
      )
    }))
  }

  // Guardar briefing
  const handleSave = async () => {
    setSaving(true)
    try {
      // Convertir imatges a base64 per guardar
      const imagesForSave = await Promise.all(
        briefing.images.map(async (img) => {
          if (img.file) {
            const base64 = await fileToBase64(img.file)
            return { id: img.id, base64, title: img.title }
          }
          return { id: img.id, base64: img.base64, title: img.title }
        })
      )

      const briefingData = {
        project_id: projectId,
        ...briefing,
        images: JSON.stringify(imagesForSave),
        updated_at: new Date().toISOString()
      }

      // Upsert (insert o update)
      const { error } = await supabase
        .from('briefings')
        .upsert(briefingData, { onConflict: 'project_id' })

      if (error) throw error
      
      alert('Briefing guardat correctament!')
    } catch (err) {
      console.error('Error guardant:', err)
      alert('Error guardant el briefing: ' + err.message)
    }
    setSaving(false)
  }

  // Generar PDF
  const handleGeneratePdf = async () => {
    setGenerating(true)
    try {
      await generateBriefingPdf(briefing, project, companySettings)
    } catch (err) {
      console.error('Error generant PDF:', err)
      alert('Error generant el PDF: ' + err.message)
    }
    setGenerating(false)
  }

  // Helper: File to Base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result)
      reader.onerror = error => reject(error)
    })
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <Header title="Briefing" />
        <div style={styles.loading}>Carregant...</div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <Header title="Briefing del Producte" />

      <div style={styles.content}>
        {/* Toolbar */}
        <div style={styles.toolbar}>
          <button onClick={() => navigate(-1)} style={styles.backButton}>
            <ArrowLeft size={18} />
            Tornar
          </button>
          
          <div style={styles.toolbarRight}>
            <button onClick={handleSave} disabled={saving} style={styles.saveButton}>
              {saving ? 'Guardant...' : <><Save size={18} /> Guardar</>}
            </button>
            <button onClick={handleGeneratePdf} disabled={generating} style={styles.pdfButton}>
              {generating ? 'Generant...' : <><Download size={18} /> Descarregar PDF</>}
            </button>
          </div>
        </div>

        {/* Header del briefing */}
        <div style={{
          ...styles.section,
          backgroundColor: darkMode ? '#15151f' : '#ffffff'
        }}>
          <div style={styles.sectionHeader}>
            <h2 style={{ ...styles.sectionTitle, color: darkMode ? '#ffffff' : '#111827' }}>
              FREEDOLIA — TECHNICAL SHEET FOR THE PRODUCT
            </h2>
            <span style={styles.skuBadge}>{project?.sku || 'FRDL-XXXXXX'}</span>
          </div>

          <div style={styles.formGrid3}>
            <div style={styles.formGroup}>
              <label style={styles.label}>P.O. Ref</label>
              <input
                type="text"
                value={briefing.po_ref}
                onChange={e => setBriefing({...briefing, po_ref: e.target.value})}
                style={{...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827'}}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Date / Data</label>
              <input
                type="date"
                value={briefing.date}
                onChange={e => setBriefing({...briefing, date: e.target.value})}
                style={{...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827'}}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Quote Ref</label>
              <input
                type="text"
                value={briefing.quote_ref}
                onChange={e => setBriefing({...briefing, quote_ref: e.target.value})}
                style={{...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827'}}
              />
            </div>
          </div>
        </div>

        {/* Descripció del producte */}
        <div style={{
          ...styles.section,
          backgroundColor: darkMode ? '#15151f' : '#ffffff'
        }}>
          <h3 style={{...styles.sectionSubtitle, color: darkMode ? '#ffffff' : '#111827'}}>
            <Package size={18} /> PRODUCT DESCRIPTION / DESCRIPCIÓ DEL PRODUCTE
          </h3>

          <div style={styles.formGrid2}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Name Product / Nom del producte</label>
              <input
                type="text"
                value={briefing.product_name}
                onChange={e => setBriefing({...briefing, product_name: e.target.value})}
                placeholder="Ex: Velvet Hangers Set (20 Velvet Hangers + 20 Black Clips)"
                style={{...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827'}}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Model Number / Model</label>
              <input
                type="text"
                value={briefing.model_number}
                onChange={e => setBriefing({...briefing, model_number: e.target.value})}
                placeholder="Ex: FREEDOLIA – VH20+CL20"
                style={{...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827'}}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Main material / Material principal</label>
              <input
                type="text"
                value={briefing.main_material}
                onChange={e => setBriefing({...briefing, main_material: e.target.value})}
                placeholder="Ex: Velvet-coated plastic hangers"
                style={{...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827'}}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Clips Material / Material dels clips</label>
              <input
                type="text"
                value={briefing.clips_material}
                onChange={e => setBriefing({...briefing, clips_material: e.target.value})}
                placeholder="Ex: Velvet-coated plastic"
                style={{...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827'}}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Hook Type / Tipus de ganxo</label>
              <input
                type="text"
                value={briefing.hook_type}
                onChange={e => setBriefing({...briefing, hook_type: e.target.value})}
                placeholder="Ex: Silver metal hook"
                style={{...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827'}}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Color</label>
              <input
                type="text"
                value={briefing.color}
                onChange={e => setBriefing({...briefing, color: e.target.value})}
                placeholder="Ex: Black / Negre"
                style={{...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827'}}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Product Dimensions / Dimensions</label>
              <textarea
                value={briefing.product_dimensions}
                onChange={e => setBriefing({...briefing, product_dimensions: e.target.value})}
                placeholder="Hanger size: 45 x 0.5 x 24 cm&#10;Clip size: 5.4 x 2 x 2.5 cm"
                rows={2}
                style={{...styles.input, ...styles.textarea, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827'}}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Net Weight per Set / Pes net</label>
              <input
                type="text"
                value={briefing.net_weight_per_set}
                onChange={e => setBriefing({...briefing, net_weight_per_set: e.target.value})}
                placeholder="Ex: Approx. 1.7 kg"
                style={{...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827'}}
              />
            </div>
          </div>
        </div>

        {/* Packaging */}
        <div style={{
          ...styles.section,
          backgroundColor: darkMode ? '#15151f' : '#ffffff'
        }}>
          <h3 style={{...styles.sectionSubtitle, color: darkMode ? '#ffffff' : '#111827'}}>
            <Package size={18} /> PACKAGING SIZE / MIDA DE L'EMBALATGE
          </h3>

          <div style={styles.formGrid2}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Individual Packaging / Embalatge individual</label>
              <textarea
                value={briefing.individual_packaging}
                onChange={e => setBriefing({...briefing, individual_packaging: e.target.value})}
                placeholder="Ex: Customized brown cardboard box"
                rows={2}
                style={{...styles.input, ...styles.textarea, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827'}}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Packaging Size / Mida de l'embalatge</label>
              <input
                type="text"
                value={briefing.packaging_size}
                onChange={e => setBriefing({...briefing, packaging_size: e.target.value})}
                placeholder="Ex: 43 x 34 x 7.5 cm"
                style={{...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827'}}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Units per Set / Unitats per conjunt</label>
              <textarea
                value={briefing.units_per_set}
                onChange={e => setBriefing({...briefing, units_per_set: e.target.value})}
                placeholder="Ex: 20 hangers + 20 clips + A6 printed cards"
                rows={2}
                style={{...styles.input, ...styles.textarea, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827'}}
              />
            </div>
          </div>

          {/* Carton Info */}
          <h4 style={{...styles.subsectionTitle, color: darkMode ? '#9ca3af' : '#6b7280'}}>Carton Info / Informació de caixes</h4>
          <div style={styles.formGrid4}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Total Sets</label>
              <input
                type="text"
                value={briefing.total_sets}
                onChange={e => setBriefing({...briefing, total_sets: e.target.value})}
                placeholder="Ex: 200 sets"
                style={{...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827'}}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Total Cartons</label>
              <input
                type="text"
                value={briefing.total_cartons}
                onChange={e => setBriefing({...briefing, total_cartons: e.target.value})}
                placeholder="Ex: 40 cartons"
                style={{...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827'}}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Sets per Carton</label>
              <input
                type="text"
                value={briefing.sets_per_carton}
                onChange={e => setBriefing({...briefing, sets_per_carton: e.target.value})}
                placeholder="Ex: 5 sets per carton"
                style={{...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827'}}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Carton Dimensions</label>
              <input
                type="text"
                value={briefing.carton_dimensions}
                onChange={e => setBriefing({...briefing, carton_dimensions: e.target.value})}
                placeholder="Ex: 50 x 40 x 30 cm"
                style={{...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827'}}
              />
            </div>
          </div>
        </div>

        {/* Quality & Labeling */}
        <div style={{
          ...styles.section,
          backgroundColor: darkMode ? '#15151f' : '#ffffff'
        }}>
          <h3 style={{...styles.sectionSubtitle, color: darkMode ? '#ffffff' : '#111827'}}>
            <CheckCircle size={18} /> QUALITY REQUIREMENTS / REQUISITS DE QUALITAT
          </h3>

          <div style={styles.formGrid2}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Quality Standards / Estàndards de qualitat</label>
              <textarea
                value={briefing.quality_standards}
                onChange={e => setBriefing({...briefing, quality_standards: e.target.value})}
                rows={5}
                style={{...styles.input, ...styles.textarea, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827'}}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Labeling Requirements / Requisits d'etiquetatge</label>
              <textarea
                value={briefing.labeling_requirements}
                onChange={e => setBriefing({...briefing, labeling_requirements: e.target.value})}
                rows={5}
                style={{...styles.input, ...styles.textarea, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827'}}
              />
            </div>
          </div>
        </div>

        {/* Logistics */}
        <div style={{
          ...styles.section,
          backgroundColor: darkMode ? '#15151f' : '#ffffff'
        }}>
          <h3 style={{...styles.sectionSubtitle, color: darkMode ? '#ffffff' : '#111827'}}>
            <Truck size={18} /> LOGISTICS & DELIVERY / LOGÍSTICA I ENTREGA
          </h3>

          <div style={styles.formGrid2}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Delivery Address / Adreça d'entrega</label>
              <input
                type="text"
                value={briefing.delivery_address}
                onChange={e => setBriefing({...briefing, delivery_address: e.target.value})}
                placeholder="Ex: Wingspeed Logistics – Dongguan, China"
                style={{...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827'}}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Shipping Mark / Marcatge</label>
              <input
                type="text"
                value={briefing.shipping_mark}
                onChange={e => setBriefing({...briefing, shipping_mark: e.target.value})}
                placeholder="Ex: FREEDOLIA – Attn: Vivi Wu"
                style={{...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827'}}
              />
            </div>
            <div style={{...styles.formGroup, gridColumn: 'span 2'}}>
              <label style={styles.label}>Important Notes / Notes importants</label>
              <textarea
                value={briefing.important_notes}
                onChange={e => setBriefing({...briefing, important_notes: e.target.value})}
                rows={2}
                style={{...styles.input, ...styles.textarea, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827'}}
              />
            </div>
          </div>
        </div>

        {/* Quality Specs (long text) */}
        <div style={{
          ...styles.section,
          backgroundColor: darkMode ? '#15151f' : '#ffffff'
        }}>
          <h3 style={{...styles.sectionSubtitle, color: darkMode ? '#ffffff' : '#111827'}}>
            <AlertTriangle size={18} /> PRODUCT QUALITY SPECIFICATIONS / ESPECIFICACIONS DE QUALITAT
          </h3>

          <div style={styles.formGrid2}>
            <div style={styles.formGroup}>
              <label style={styles.label}>🇬🇧 English</label>
              <textarea
                value={briefing.quality_specs_en}
                onChange={e => setBriefing({...briefing, quality_specs_en: e.target.value})}
                rows={8}
                style={{...styles.input, ...styles.textarea, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827'}}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>🇨🇦 Català</label>
              <textarea
                value={briefing.quality_specs_ca}
                onChange={e => setBriefing({...briefing, quality_specs_ca: e.target.value})}
                rows={8}
                style={{...styles.input, ...styles.textarea, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827'}}
              />
            </div>
          </div>
        </div>

        {/* Imatges */}
        <div style={{
          ...styles.section,
          backgroundColor: darkMode ? '#15151f' : '#ffffff'
        }}>
          <h3 style={{...styles.sectionSubtitle, color: darkMode ? '#ffffff' : '#111827'}}>
            <ImageIcon size={18} /> PRODUCT IMAGES / IMATGES DEL PRODUCTE
          </h3>

          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            style={{
              ...styles.dropZone,
              borderColor: dragOver ? '#4f46e5' : (darkMode ? '#374151' : '#d1d5db'),
              backgroundColor: dragOver ? (darkMode ? '#1f1f2e' : '#eef2ff') : 'transparent'
            }}
          >
            <Upload size={32} color={dragOver ? '#4f46e5' : '#9ca3af'} />
            <p style={{ margin: '8px 0 0', color: darkMode ? '#9ca3af' : '#6b7280' }}>
              Arrossega imatges aquí o clica per seleccionar
            </p>
            <span style={{ fontSize: '12px', color: '#9ca3af' }}>PNG, JPG fins a 5MB</span>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
          </div>

          {/* Llista d'imatges */}
          {briefing.images.length > 0 && (
            <div style={styles.imagesGrid}>
              {briefing.images.map((img, index) => (
                <div key={img.id} style={{
                  ...styles.imageCard,
                  backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb'
                }}>
                  <div style={styles.imagePreview}>
                    <img 
                      src={img.preview || img.base64} 
                      alt={img.title || `Image ${index + 1}`}
                      style={styles.imageThumb}
                    />
                    <button
                      onClick={() => removeImage(img.id)}
                      style={styles.removeImageButton}
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={img.title}
                    onChange={e => updateImageTitle(img.id, e.target.value)}
                    placeholder="Títol de la imatge (opcional)"
                    style={{
                      ...styles.imageTitleInput,
                      backgroundColor: darkMode ? '#15151f' : '#ffffff',
                      color: darkMode ? '#ffffff' : '#111827'
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: { flex: 1, display: 'flex', flexDirection: 'column' },
  content: { padding: '32px', overflowY: 'auto', maxWidth: '1200px', margin: '0 auto', width: '100%' },
  loading: { padding: '64px', textAlign: 'center', color: '#6b7280' },
  toolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  toolbarRight: { display: 'flex', gap: '12px' },
  backButton: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', backgroundColor: 'transparent', color: '#6b7280', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' },
  saveButton: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', backgroundColor: '#4f46e5', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' },
  pdfButton: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', backgroundColor: '#22c55e', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' },
  section: { padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color)', marginBottom: '20px' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  sectionTitle: { margin: 0, fontSize: '16px', fontWeight: '600' },
  sectionSubtitle: { margin: '0 0 16px', fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' },
  subsectionTitle: { margin: '20px 0 12px', fontSize: '13px', fontWeight: '500' },
  skuBadge: { padding: '6px 12px', backgroundColor: '#4f46e515', color: '#4f46e5', borderRadius: '6px', fontSize: '13px', fontWeight: '600' },
  formGrid2: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' },
  formGrid3: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' },
  formGrid4: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '12px', fontWeight: '500', color: '#6b7280' },
  input: { padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '14px', outline: 'none' },
  textarea: { resize: 'vertical', minHeight: '60px', fontFamily: 'inherit' },
  dropZone: { padding: '40px', border: '2px dashed', borderRadius: '12px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s ease' },
  imagesGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginTop: '20px' },
  imageCard: { borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)' },
  imagePreview: { position: 'relative', aspectRatio: '4/3' },
  imageThumb: { width: '100%', height: '100%', objectFit: 'cover' },
  removeImageButton: { position: 'absolute', top: '8px', right: '8px', width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'rgba(239, 68, 68, 0.9)', color: '#ffffff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  imageTitleInput: { width: '100%', padding: '10px 12px', border: 'none', borderTop: '1px solid var(--border-color)', fontSize: '13px', outline: 'none' }
}
