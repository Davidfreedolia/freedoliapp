import { useEffect, useState } from 'react'

export const useLayoutPreference = (storageKey, defaultValue = 'grid') => {
  const [layout, setLayout] = useState(defaultValue)

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey)
      if (stored) {
        setLayout(stored)
      }
    } catch (err) {
      console.warn('[LayoutPreference] No s\'ha pogut llegir localStorage', err)
    }
  }, [storageKey])

  const updateLayout = (nextLayout) => {
    setLayout(nextLayout)
    try {
      window.localStorage.setItem(storageKey, nextLayout)
    } catch (err) {
      console.warn('[LayoutPreference] No s\'ha pogut guardar localStorage', err)
    }
  }

  return [layout, updateLayout]
}
