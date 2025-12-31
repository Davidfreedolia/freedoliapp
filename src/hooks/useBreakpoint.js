import { useState, useEffect } from 'react'

// Breakpoints operativos
export const BREAKPOINTS = {
  mobile: 768,   // < 768px: Mobile (lectura + accions ràpides)
  tablet: 1024,  // 768-1024px: Tablet (revisió i validació)
  desktop: 1024  // >= 1024px: Desktop (treball complet)
}

export function useBreakpoint() {
  const [breakpoint, setBreakpoint] = useState(() => {
    // Verificar que window existe (SSR safety)
    if (typeof window === 'undefined') return 'desktop'
    const width = window.innerWidth
    if (width < BREAKPOINTS.mobile) return 'mobile'
    if (width < BREAKPOINTS.tablet) return 'tablet'
    return 'desktop'
  })

  useEffect(() => {
    // Verificar que window existe
    if (typeof window === 'undefined') return

    const handleResize = () => {
      const width = window.innerWidth
      if (width < BREAKPOINTS.mobile) {
        setBreakpoint('mobile')
      } else if (width < BREAKPOINTS.tablet) {
        setBreakpoint('tablet')
      } else {
        setBreakpoint('desktop')
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return {
    breakpoint,
    isMobile: breakpoint === 'mobile',
    isTablet: breakpoint === 'tablet',
    isDesktop: breakpoint === 'desktop'
  }
}

