import { createContext, useContext, useState, useCallback, useRef } from 'react'

const ToastContext = createContext(null)
export const useToast = () => useContext(ToastContext)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const id = useRef(0)

  const show = useCallback((message, type = 'info') => {
    const tid = ++id.current
    setToasts(p => [...p, { id: tid, message, type }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== tid)), 3500)
  }, [])

  const success = useCallback(msg => show(msg, 'success'), [show])
  const error = useCallback(msg => show(msg, 'error'), [show])
  const info = useCallback(msg => show(msg, 'info'), [show])

  return (
    <ToastContext.Provider value={{ success, error, info }}>
      {children}
      <div style={{ position:'fixed', bottom:24, right:24, zIndex:999, display:'flex', flexDirection:'column', gap:8 }}>
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type} toast-in`}>
            <span style={{ fontSize:16 }}>
              {t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'}
            </span>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
