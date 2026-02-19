import { supabase } from './supabase'

const BUCKET = 'project-files'

/** Carpetes canòniques de cada projecte (prefixos sota projects/{id}/) */
export const PROJECT_STORAGE_FOLDERS = [
  'research/',
  'viability/',
  'suppliers/',
  'samples/',
  'production/',
  'listing/',
  'live/',
  'docs/'
]

export const storageService = {
  async listFolder(prefix) {
    const { data, error } = await supabase
      .storage
      .from(BUCKET)
      .list(prefix, { limit: 100, sortBy: { column: 'name', order: 'asc' } })

    if (error) throw error
    return data
  },

  async uploadFile(path, file) {
    const { error } = await supabase
      .storage
      .from(BUCKET)
      .upload(path, file, { upsert: true })

    if (error) throw error
  },

  async getSignedUrl(path) {
    const { data, error } = await supabase
      .storage
      .from(BUCKET)
      .createSignedUrl(path, 300)

    if (error) throw error
    return data.signedUrl
  },

  async deleteFile(path) {
    const { error } = await supabase
      .storage
      .from(BUCKET)
      .remove([path])

    if (error) throw error
  },

  async createFolder(path) {
    // Create a .folder marker file to represent a folder in Supabase Storage
    const { error } = await supabase
      .storage
      .from(BUCKET)
      .upload(path + '.folder', new Blob([''], { type: 'text/plain' }), { upsert: true })

    if (error) throw error
  },

  /**
   * Assegura que totes les carpetes del projecte existeixen (crea el marcador si cal).
   * Cridar al obrir Project Detail o al muntar l'Explorer.
   */
  async ensureProjectStorageFolders(projectId) {
    if (!projectId) return
    const base = `projects/${projectId}/`
    for (const folder of PROJECT_STORAGE_FOLDERS) {
      try {
        await this.createFolder(base + folder)
      } catch (_) {
        // Ignora errors per carpeta (permisos, etc.); la següent es pot crear
      }
    }
  }
}
