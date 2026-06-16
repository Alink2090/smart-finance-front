import { useState, useEffect, useRef, useCallback } from 'react'

export function useNetwork() {
  const [online,       setOnline]       = useState(navigator.onLine)
  const [justCameBack, setJustCameBack] = useState(false)
  const prev           = useRef(navigator.onLine)
  const cameBackTimer  = useRef(null)

  const applyState = useCallback((next) => {
    if (next === prev.current) return   // rien de changé
    if (!prev.current && next) {        // offline → online
      setJustCameBack(true)
      clearTimeout(cameBackTimer.current)
      cameBackTimer.current = setTimeout(() => setJustCameBack(false), 8000)
    }
    prev.current = next
    setOnline(next)
  }, [])

  useEffect(() => {
    const on  = () => applyState(true)
    const off = () => applyState(false)
    window.addEventListener('online',  on)
    window.addEventListener('offline', off)
    // sync immédiat
    applyState(navigator.onLine)
    return () => {
      window.removeEventListener('online',  on)
      window.removeEventListener('offline', off)
      clearTimeout(cameBackTimer.current)
    }
  }, [applyState])

  return { online, justCameBack }
}
