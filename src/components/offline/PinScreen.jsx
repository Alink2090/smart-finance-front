/**
 * PinScreen.jsx — Écran de saisie PIN hors ligne
 * Remplace l'app entière quand locked=true.
 * 6 cases visuelles + clavier numérique tactile.
 */
import { useState, useEffect, useRef } from 'react'
import logo from '../../assets/logo_1.png'

const PIN_LENGTH = 6

export default function PinScreen({ onSubmit, error, verifying, userName }) {
  const [digits, setDigits] = useState([])
  const [shake,  setShake]  = useState(false)

  // Shake quand erreur
  useEffect(() => {
    if (error) { setShake(true); setDigits([]); setTimeout(() => setShake(false), 500) }
  }, [error])

  // Auto-submit quand 6 chiffres atteints
  useEffect(() => {
    if (digits.length === PIN_LENGTH) {
      onSubmit(digits.join(''))
    }
  }, [digits, onSubmit])

  const press = (d) => {
    if (digits.length >= PIN_LENGTH || verifying) return
    setDigits(prev => [...prev, d])
  }
  const del   = () => setDigits(prev => prev.slice(0, -1))
  const clear = () => setDigits([])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px 24px calc(24px + env(safe-area-inset-bottom, 0px))',
      userSelect: 'none',
    }}>
      {/* Logo + titre */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <img src={logo} alt="SmartFinance" style={{ width: 56, height: 56, borderRadius: 16, marginBottom: 16 }} />
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-.03em' }}>SmartFinance</div>
        {userName && <div style={{ fontSize: 14, color: 'var(--text2)', marginTop: 4 }}>Bonjour, {userName.split(' ')[0]}</div>}
        <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 8 }}>
          Entrez votre PIN pour accéder à vos données
        </div>
      </div>

      {/* Indicateurs de points */}
      <div style={{
        display: 'flex', gap: 14, marginBottom: 12,
        animation: shake ? 'pinShake .4s ease' : 'none',
      }}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <div key={i} style={{
            width: 14, height: 14, borderRadius: '50%',
            border: `2px solid ${i < digits.length ? 'var(--accent)' : 'var(--border2)'}`,
            background: i < digits.length ? 'var(--accent)' : 'transparent',
            transition: 'all .15s cubic-bezier(.34,1.56,.64,1)',
            transform: i < digits.length ? 'scale(1.1)' : 'scale(1)',
          }} />
        ))}
      </div>

      {/* Message d'erreur */}
      <div style={{ height: 20, marginBottom: 24, fontSize: 13, color: '#f5476a', fontWeight: 600 }}>
        {error || (verifying ? 'Vérification…' : '')}
      </div>

      {/* Clavier numérique */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 12, width: '100%', maxWidth: 280,
      }}>
        {[1,2,3,4,5,6,7,8,9].map(d => (
          <PinKey key={d} label={String(d)} onPress={() => press(String(d))} disabled={verifying} />
        ))}
        <PinKey label="✕" onPress={clear} disabled={verifying} ghost />
        <PinKey label="0" onPress={() => press('0')} disabled={verifying} />
        <PinKey label="⌫" onPress={del}   disabled={verifying} ghost />
      </div>

      <style>{`
        @keyframes pinShake {
          0%,100% { transform: translateX(0) }
          20%     { transform: translateX(-8px) }
          40%     { transform: translateX(8px) }
          60%     { transform: translateX(-6px) }
          80%     { transform: translateX(6px) }
        }
      `}</style>
    </div>
  )
}

function PinKey({ label, onPress, disabled, ghost }) {
  const [pressed, setPressed] = useState(false)
  return (
    <button
      onPointerDown={() => { if (!disabled) { setPressed(true); onPress() } }}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      disabled={disabled}
      style={{
        height: 68, borderRadius: 16,
        border: ghost ? '1px solid var(--border)' : '1px solid var(--border2)',
        background: pressed
          ? 'rgba(124,108,252,.2)'
          : ghost ? 'transparent' : 'var(--surface2)',
        color: ghost ? 'var(--text3)' : 'var(--text)',
        fontSize: 22, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'inherit', transition: 'all .1s',
        transform: pressed ? 'scale(.93)' : 'scale(1)',
        opacity: disabled ? .5 : 1,
        WebkitTapHighlightColor: 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {label}
    </button>
  )
}
