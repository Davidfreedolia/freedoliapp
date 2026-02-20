import { supabase } from './supabase'

const CANDIDATES = ['projects', 'files', 'public']

export async function resolveProjectsBucket() {
  if (!supabase?.storage || typeof supabase.storage.getBucket !== 'function') {
    return 'projects'
  }

  for (const name of CANDIDATES) {
    const { error } = await supabase.storage.getBucket(name)
    if (!error) return name
  }

  return 'projects'
}
