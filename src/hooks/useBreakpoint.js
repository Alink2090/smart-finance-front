/**
 * useBreakpoint — hook utilitaire mobile-first
 * Retourne isMobile (< 768px) et isTablet (768–1023px)
 * Utilisé partout pour switcher entre Desktop Layout et Mobile Layout.
 */
import { useState, useEffect } from 'react'

export function useBreakpoint() {
  const [width, setWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  )

  useEffect(() => {
    const handler = () => setWidth(window.innerWidth)
    const mql = window.matchMedia('(max-width: 767px)')
    window.addEventListener('resize', handler, { passive: true })
    return () => window.removeEventListener('resize', handler)
  }, [])

  return {
    isMobile:  width < 768,
    isTablet:  width >= 768 && width < 1024,
    isDesktop: width >= 1024,
    width,
  }
}
