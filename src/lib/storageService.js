import { supabase } from './supabase'

const BUCKET = 'project-files'

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
  }
}
