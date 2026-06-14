/**
 * Welcome.jsx — Écran de bienvenue post-connexion
 * Affiché une seule fois après un login réussi.
 * Disparaît automatiquement après 2.5s ou au tap.
 */
import { useEffect, useState } from 'react'
import { useAuth }  from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import logo from '../assets/logo_1.png'

export default function Welcome({ onDone }) {
  const { user }  = useAuth()
  const { isDark } = useTheme()
  const [phase, setPhase] = useState('enter') // 'enter' | 'show' | 'exit'
  const firstName = user?.name?.split(' ')[0] ?? 'vous'

  const steps = [
    { icon: '💰', label: 'Transactions' },
    { icon: '📊', label: 'Analytics' },
    { icon: '🎯', label: 'Budgets' },
    { icon: '📶', label: 'Hors ligne' },
  ]

  useEffect(() => {
    // Phase 1 : entrée (300ms)
    const t1 = setTimeout(() => setPhase('show'), 300)
    // Phase 2 : sortie après 2.5s
    const t2 = setTimeout(() => setPhase('exit'), 2800)
    // Phase 3 : done
    const t3 = setTimeout(() => onDone(), 3300)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [onDone])

  const handleTap = () => {
    if (phase === 'exit') return
    setPhase('exit')
    setTimeout(onDone, 400)
  }

  return (
    <div
      onClick={handleTap}
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: isDark
          ? 'radial-gradient(ellipse at 30% 20%, rgba(124,108,252,.18) 0%, var(--bg) 60%)'
          : 'radial-gradient(ellipse at 30% 20%, rgba(124,108,252,.1) 0%, var(--bg) 60%)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '32px 24px',
        opacity:    phase === 'show' ? 1 : 0,
        transform:  phase === 'enter' ? 'scale(.96)' : phase === 'exit' ? 'scale(1.02)' : 'scale(1)',
        transition: 'opacity .4s ease, transform .4s ease',
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      {/* Logo animé */}
      <div style={{
        marginBottom: 28,
        transform: phase === 'show' ? 'translateY(0)' : 'translateY(16px)',
        opacity:    phase === 'show' ? 1 : 0,
        transition: 'all .5s cubic-bezier(.34,1.56,.64,1) .1s',
      }}>
        <div style={{
          width: 80, height: 80, borderRadius: 24,
          background: 'linear-gradient(135deg, #7c6cfc, #5b4de8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 12px 40px rgba(124,108,252,.4)',
          margin: '0 auto 16px',
        }}>
          <img src={logo} alt="" style={{ width: 52, height: 52, objectFit: 'contain' }} />
        </div>
        <div style={{
          fontSize: 13, fontWeight: 600, color: 'var(--text3)',
          textAlign: 'center', letterSpacing: '.06em', textTransform: 'uppercase',
        }}>SmartFinance</div>
      </div>

      {/* Message de bienvenue */}
      <div style={{
        textAlign: 'center', marginBottom: 36,
        transform: phase === 'show' ? 'translateY(0)' : 'translateY(20px)',
        opacity:    phase === 'show' ? 1 : 0,
        transition: 'all .5s cubic-bezier(.34,1.56,.64,1) .2s',
      }}>
        <h1 style={{
          fontSize: 30, fontWeight: 800, color: 'var(--text)',
          letterSpacing: '-.04em', lineHeight: 1.15, margin: '0 0 10px',
        }}>
          Bonjour,<br />
          <span style={{ background: 'linear-gradient(135deg,#a78bfa,#7c6cfc)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
            {firstName} 👋
          </span>
        </h1>
        <p style={{ fontSize: 15, color: 'var(--text2)', margin: 0, lineHeight: 1.6 }}>
          Vos finances sont prêtes.<br />Tout est synchronisé.
        </p>
      </div>

      {/* Features pills */}
      <div style={{
        display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center',
        maxWidth: 300, marginBottom: 40,
        transform: phase === 'show' ? 'translateY(0)' : 'translateY(24px)',
        opacity:    phase === 'show' ? 1 : 0,
        transition: 'all .5s cubic-bezier(.34,1.56,.64,1) .35s',
      }}>
        {steps.map((s, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 100,
            background: 'var(--surface2)', border: '1px solid var(--border)',
            fontSize: 13, fontWeight: 600, color: 'var(--text2)',
          }}>
            <span>{s.icon}</span> {s.label}
          </div>
        ))}
      </div>

      {/* Barre de progression */}
      <div style={{
        width: 120, height: 4, borderRadius: 2,
        background: 'var(--surface3)', overflow: 'hidden',
        transform: phase === 'show' ? 'translateY(0)' : 'translateY(16px)',
        opacity:    phase === 'show' ? 1 : 0,
        transition: 'all .4s ease .45s',
      }}>
        <div style={{
          height: '100%', borderRadius: 2,
          background: 'linear-gradient(90deg, #7c6cfc, #a78bfa)',
          width: phase === 'show' ? '100%' : '0%',
          transition: 'width 2.4s linear .5s',
        }} />
      </div>
      <div style={{
        fontSize: 11, color: 'var(--text3)', marginTop: 10,
        opacity: phase === 'show' ? 1 : 0,
        transition: 'opacity .4s ease .5s',
      }}>
        Appuyez pour continuer
      </div>
    </div>
  )
}
