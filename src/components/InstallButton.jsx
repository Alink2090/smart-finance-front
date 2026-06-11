import { useEffect, useState } from 'react'

export default function InstallButton() {
  const [promptEvent, setPromptEvent] = useState(null)
  const [dismissed, setDismissed]     = useState(false)

  useEffect(() => {
    const stored = sessionStorage.getItem('pwa-install-dismissed')
    if (stored) { setDismissed(true); return }

    const handler = e => {
      e.preventDefault()
      setPromptEvent(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const install = async () => {
    if (!promptEvent) return
    promptEvent.prompt()
    const { outcome } = await promptEvent.userChoice
    setPromptEvent(null)
    if (outcome === 'dismissed') {
      sessionStorage.setItem('pwa-install-dismissed', '1')
      setDismissed(true)
    }
  }

  const dismiss = () => {
    sessionStorage.setItem('pwa-install-dismissed', '1')
    setDismissed(true)
    setPromptEvent(null)
  }

  if (!promptEvent || dismissed) return null

  return (
    <div style={{ position: 'fixed', bottom: 'calc(var(--mobile-bottom-nav-h, 72px) + env(safe-area-inset-bottom, 0px) + 12px)', left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 89, pointerEvents: 'none' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'var(--surface)', border: '1px solid var(--border2)',
        borderRadius: 16, padding: '10px 14px',
        boxShadow: '0 8px 32px rgba(0,0,0,.4)',
        animation: 'fadeUp .4s ease forwards',
        pointerEvents: 'all',
        maxWidth: 'calc(100vw - 32px)',
      }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#7c6cfc,#5b4de8)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 18 }}>📱</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Installer SmartFinance</div>
          <div style={{ fontSize: 11, color: 'var(--text3)' }}>Accès rapide depuis votre écran</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={dismiss} style={{ width: 28, height: 28, border: 'none', background: 'var(--surface3)', borderRadius: 8, cursor: 'pointer', color: 'var(--text3)', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          <button onClick={install} style={{ padding: '6px 14px', border: 'none', background: 'linear-gradient(135deg,#7c6cfc,#5b4de8)', color: 'white', borderRadius: 9, cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'Plus Jakarta Sans,sans-serif', whiteSpace: 'nowrap' }}>
            Installer
          </button>
        </div>
      </div>
    </div>
  )
}
