import { useTranslation } from 'react-i18next'

/**
 * D8.3.1 — Helper per accedir a t() des d'un sol lloc.
 * Ús:
 *   const t = useT()
 *   t('common.save')
 */
export function useT(ns) {
  const { t } = useTranslation(ns)
  return t
}

export default useT

