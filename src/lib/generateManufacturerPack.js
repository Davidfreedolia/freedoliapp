import JSZip from 'jszip'
import { generatePOPdf } from './generatePOPdf'
import { generateFnskuLabelsPdf } from './generateFnskuLabelsPdf'
import { generatePackingListPdf } from './generatePackingListPdf'
import { generateCartonLabelsPdf } from './generateCartonLabelsPdf'

/**
 * Genera un pack complet per al fabricant amb múltiples PDFs i els combina en un ZIP
 * @param {Object} options - Opcions de generació
 * @param {Object} options.poData - Dades de la Purchase Order
 * @param {Object} options.supplier - Dades del proveïdor
 * @param {Object} options.project - Dades del projecte
 * @param {Object} options.companySettings - Configuració de l'empresa
 * @param {Object} options.amazonReadiness - Dades de po_amazon_readiness
 * @param {Object} options.identifiers - Identificadors del producte (FNSKU, etc.)
 * @param {Object} options.selection - Selecció de documents a incloure
 * @param {boolean} options.selection.includePO - Incloure PO PDF
 * @param {boolean} options.selection.includeFnskuLabels - Incloure etiquetes FNSKU
 * @param {boolean} options.selection.includePackingList - Incloure Packing List
 * @param {boolean} options.selection.includeCartonLabels - Incloure etiquetes de caixa
 * @param {Object} options.fnskuLabelsConfig - Configuració per etiquetes FNSKU
 * @returns {Promise<Blob>} ZIP blob amb tots els PDFs
 */
export const generateManufacturerPack = async (options) => {
  const {
    poData,
    supplier,
    project,
    companySettings,
    amazonReadiness,
    identifiers,
    selection = {
      includePO: true,
      includeFnskuLabels: true,
      includePackingList: true,
      includeCartonLabels: true
    },
    fnskuLabelsConfig = {
      quantity: 1,
      template: 'A4_30UP',
      includeSku: true,
      includeName: true
    },
    version = null // Si es passa, usa aquesta versió; si no, calcula la següent
  } = options

  const zip = new JSZip()
  const poNumber = poData.po_number || `PO_${poData.id}`
  
  // Calcular versió del pack
  const packVersion = version !== null ? version : ((amazonReadiness?.manufacturer_pack_version || 0) + 1)
  const versionSuffix = packVersion > 1 ? `_v${packVersion}` : ''

  // Generar PO PDF
  if (selection.includePO) {
    try {
      const poPdf = await generatePOPdf(poData, supplier, companySettings)
      const poPdfBlob = poPdf.output('blob')
      zip.file(`PO_${poNumber}${versionSuffix}.pdf`, poPdfBlob)
    } catch (error) {
      console.error('Error generant PO PDF:', error)
      throw new Error('Error generant PO PDF: ' + (error.message || 'Error desconegut'))
    }
  }

  // Generar FNSKU Labels PDF
  if (selection.includeFnskuLabels && identifiers?.fnsku) {
    try {
      const labelsPdf = await generateFnskuLabelsPdf({
        fnsku: identifiers.fnsku,
        sku: project?.sku || project?.project_code || '',
        productName: project?.name || '',
        quantity: fnskuLabelsConfig.quantity,
        template: fnskuLabelsConfig.template,
        includeSku: fnskuLabelsConfig.includeSku,
        includeName: fnskuLabelsConfig.includeName,
        offsetXmm: fnskuLabelsConfig.offsetXmm || 0,
        offsetYmm: fnskuLabelsConfig.offsetYmm || 0,
        testPrint: fnskuLabelsConfig.testPrint || false
      })
      const labelsPdfBlob = labelsPdf.output('blob')
      zip.file(`FNSKU_Labels_${poNumber}${versionSuffix}.pdf`, labelsPdfBlob)
    } catch (error) {
      console.error('Error generant FNSKU labels PDF:', error)
      throw new Error('Error generant FNSKU labels PDF: ' + (error.message || 'Error desconegut'))
    }
  }

  // Generar Packing List PDF
  if (selection.includePackingList) {
    try {
      const packingListPdf = await generatePackingListPdf(
        poData,
        supplier,
        project,
        companySettings,
        amazonReadiness
      )
      const packingListBlob = packingListPdf.output('blob')
      zip.file(`PackingList_${poNumber}${versionSuffix}.pdf`, packingListBlob)
    } catch (error) {
      console.error('Error generant Packing List PDF:', error)
      throw new Error('Error generant Packing List PDF: ' + (error.message || 'Error desconegut'))
    }
  }

  // Generar Carton Labels PDF
  if (selection.includeCartonLabels && amazonReadiness?.cartons_count) {
    try {
      const cartonLabelsPdf = await generateCartonLabelsPdf(
        poData,
        project,
        amazonReadiness,
        1 // labels per page (1 o 2)
      )
      const cartonLabelsBlob = cartonLabelsPdf.output('blob')
      zip.file(`CartonLabels_${poNumber}${versionSuffix}.pdf`, cartonLabelsBlob)
    } catch (error) {
      console.error('Error generant Carton Labels PDF:', error)
      throw new Error('Error generant Carton Labels PDF: ' + (error.message || 'Error desconegut'))
    }
  }

  // Generar ZIP
  const zipBlob = await zip.generateAsync({ type: 'blob' })
  
  // Retornar també la versió generada per poder-la guardar a BD
  return {
    zipBlob,
    version: packVersion
  }
}

