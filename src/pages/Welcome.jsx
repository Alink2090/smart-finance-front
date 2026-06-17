import { useEffect, useState } from 'react'
import { useAuth }  from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import logo from '../assets/logo_1.png'

export default function Welcome({ onDone }) {
  const { user }   = useAuth()
  const { isDark } = useTheme()
  const [visible,   setVisible]   = useState(false)   // animation entrée
  const [exiting,   setExiting]   = useState(false)   // animation sortie
  const firstName = user?.name?.split(' ')[0] ?? 'vous'

  const steps = [
    { icon: '💰', label: 'Transactions' },
    { icon: '📊', label: 'Analytics' },
    { icon: '🎯', label: 'Budgets' },
    { icon: '📶', label: 'Hors ligne' },
  ]

  useEffect(() => {
    // Déclenche l'entrée dès le prochain frame (évite le flash noir)
    const t0 = requestAnimationFrame(() => setVisible(true))
    // Amorce la sortie après 2.6s
    const t2 = setTimeout(() => setExiting(true), 2600)
    // Appelle onDone après la transition de sortie (400ms)
    const t3 = setTimeout(() => onDone(), 3050)
    return () => {
      cancelAnimationFrame(t0)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [onDone])

  const handleTap = () => {
    if (exiting) return
    setExiting(true)
    setTimeout(onDone, 380)
  }

  // Couleurs hardcodées pour éviter les problèmes de var() dans radial-gradient sur Safari
  const bgColor    = isDark ? '#0a0a0f' : '#f0f1f5'
  const pill_bg    = isDark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.05)'
  const pill_bdr   = isDark ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.08)'
  const pill_color = isDark ? '#a0a0c0' : '#555570'
  const text_color = isDark ? '#f0f0ff' : '#12121a'
  const sub_color  = isDark ? '#8888aa' : '#555570'
  const hint_color = isDark ? '#55556a' : '#aaaacc'
  const bar_bg     = isDark ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.08)'

  return (
    <div
      onClick={handleTap}
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        // Fond solide hardcodé — pas de var() dans gradient sur Safari iOS
        backgroundColor: bgColor,
        backgroundImage: `radial-gradient(ellipse at 30% 20%, rgba(124,108,252,${isDark ? '.16' : '.09'}) 0%, transparent 65%)`,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '32px 24px',
        // Entrée : fade + légère montée
        opacity:   visible && !exiting ? 1 : 0,
        transform: exiting ? 'scale(1.03)' : visible ? 'scale(1)' : 'scale(.97)',
        transition: exiting
          ? 'opacity .35s ease, transform .35s ease'
          : 'opacity .35s ease, transform .35s cubic-bezier(.34,1.3,.64,1)',
        cursor: 'pointer',
        userSelect: 'none',
        // Évite le flash blanc/noir sur overscroll iOS
        WebkitOverflowScrolling: 'touch',
      }}
    >

      {/* ── Logo ─────────────────────────────────────────────────────── */}
      <div style={{
        marginBottom: 28,
        transform: visible && !exiting ? 'translateY(0)' : 'translateY(14px)',
        opacity:    visible && !exiting ? 1 : 0,
        transition: 'all .5s cubic-bezier(.34,1.56,.64,1) .05s',
      }}>
        <div style={{
          width: 88, height: 88, borderRadius: 26,
          background: 'linear-gradient(135deg, #7c6cfc, #5b4de8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 16px 48px rgba(124,108,252,.45)',
          margin: '0 auto 14px',
        }}>
          <img src={logo} alt="" style={{ width: 56, height: 56, objectFit: 'contain' }} />
        </div>
        <div style={{
          fontSize: 12, fontWeight: 700, color: hint_color,
          textAlign: 'center', letterSpacing: '.1em', textTransform: 'uppercase',
        }}>SmartFinance</div>
      </div>

      {/* ── Texte ─────────────────────────────────────────────────────── */}
      <div style={{
        textAlign: 'center', marginBottom: 32,
        transform: visible && !exiting ? 'translateY(0)' : 'translateY(18px)',
        opacity:    visible && !exiting ? 1 : 0,
        transition: 'all .5s cubic-bezier(.34,1.56,.64,1) .12s',
      }}>
        <h1 style={{
          fontSize: 32, fontWeight: 800, color: text_color,
          letterSpacing: '-.04em', lineHeight: 1.15,
          margin: '0 0 12px',
        }}>
          Bonjour, {firstName} 👋
        </h1>
        <p style={{ fontSize: 15, color: sub_color, margin: 0, lineHeight: 1.65 }}>
          Vos finances sont prêtes.
          <br />Tout est synchronisé.
        </p>
      </div>

      {/* ── Pills features ────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center',
        maxWidth: 320, marginBottom: 40,
        transform: visible && !exiting ? 'translateY(0)' : 'translateY(20px)',
        opacity:    visible && !exiting ? 1 : 0,
        transition: 'all .5s cubic-bezier(.34,1.56,.64,1) .22s',
      }}>
        {steps.map((s, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 100,
            background: pill_bg,
            border: `1px solid ${pill_bdr}`,
            fontSize: 13, fontWeight: 600, color: pill_color,
          }}>
            <span style={{ fontSize: 15 }}>{s.icon}</span>
            {s.label}
          </div>
        ))}
      </div>

      {/* ── Barre de progression ──────────────────────────────────────── */}
      <div style={{
        transform: visible && !exiting ? 'translateY(0)' : 'translateY(12px)',
        opacity:    visible && !exiting ? 1 : 0,
        transition: 'all .4s ease .32s',
        textAlign: 'center',
      }}>
        <div style={{
          width: 130, height: 3, borderRadius: 2,
          background: bar_bg, overflow: 'hidden',
          margin: '0 auto 10px',
        }}>
          <div style={{
            height: '100%', borderRadius: 2,
            background: 'linear-gradient(90deg, #7c6cfc, #a78bfa)',
            width: visible && !exiting ? '100%' : '0%',
            transition: 'width 2.3s linear .4s',
          }} />
        </div>
        <div style={{ fontSize: 11, color: hint_color, letterSpacing: '.02em' }}>
          Appuyez pour continuer
        </div>
      </div>
    </div>
  )
}
