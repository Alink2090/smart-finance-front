/**
 * Settings.jsx — Page Paramètres
 * Gère : activation offline, PIN setup/change/désactivation, info sync
 */
import { useState, useEffect, useCallback } from 'react'
import { useIsMobile } from '../hooks/useIsMobile'
import { useOffline }  from '../context/OfflineContext'
import {
  isOfflineEnabled, setOfflineEnabled,
  hasPin, setPin, clearPin, verifyPin, isBiometricAvailable,
} from '../indexeddb/settingsDB'
import { getPendingCount, clearQueue } from '../sync/syncQueue'
import { clearStore } from '../indexeddb/db'

const PIN_LENGTH = 6

// ── Sous-composant saisie PIN ─────────────────────────────────────────────────
function PinInput({ label, value, onChange, error }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label className="input-label">{label}</label>
      <input
        className="input"
        type="password"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={PIN_LENGTH}
        placeholder="● ● ● ● ● ●"
        value={value}
        onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, PIN_LENGTH))}
        style={{ letterSpacing: '0.4em', fontSize: 20, textAlign: 'center' }}
      />
      {error && <div style={{ fontSize: 12, color: '#f5476a', marginTop: 6 }}>{error}</div>}
    </div>
  )
}

// ── Section card ──────────────────────────────────────────────────────────────
function Section({ title, icon, children }) {
  return (
    <div className="card" style={{ padding: 20, marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{title}</span>
      </div>
      {children}
    </div>
  )
}

// ── Toggle row ────────────────────────────────────────────────────────────────
function ToggleRow({ label, sub, checked, onChange, disabled }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: disabled ? 'var(--text3)' : 'var(--text)' }}>{label}</div>
        {sub && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{sub}</div>}
      </div>
      <button
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        style={{
          width: 48, height: 28, borderRadius: 14, border: 'none',
          background: checked ? '#7c6cfc' : 'var(--surface3)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          position: 'relative', transition: 'background .2s', flexShrink: 0,
          opacity: disabled ? .5 : 1,
        }}
      >
        <div style={{
          position: 'absolute', top: 4, width: 20, height: 20,
          borderRadius: '50%', background: 'white',
          left: checked ? 24 : 4, transition: 'left .2s',
          boxShadow: '0 1px 4px rgba(0,0,0,.25)',
        }} />
      </button>
    </div>
  )
}

export default function Settings() {
  const isMobile = useIsMobile()
  const { online, pendingCount, sync, syncing } = useOffline()

  // ── État local ────────────────────────────────────────────────────────────
  const [offlineEnabled, setOfflineEnabledState] = useState(false)
  const [pinExists,      setPinExists]            = useState(false)
  const [bioAvailable,   setBioAvailable]          = useState(false)
  const [pendingLocal,   setPendingLocal]          = useState(0)

  // Formulaires PIN
  const [mode,        setMode]        = useState(null)  // 'setup' | 'change' | 'disable'
  const [newPin,      setNewPin]      = useState('')
  const [confirmPin,  setConfirmPin]  = useState('')
  const [currentPin,  setCurrentPin]  = useState('')
  const [pinErr,      setPinErr]      = useState('')
  const [pinSuccess,  setPinSuccess]  = useState('')
  const [loading,     setLoading]     = useState(false)

  // ── Chargement initial ────────────────────────────────────────────────────
  const load = useCallback(async () => {
    const [oe, pe, bio, pc] = await Promise.all([
      isOfflineEnabled(), hasPin(), isBiometricAvailable(), getPendingCount(),
    ])
    setOfflineEnabledState(oe); setPinExists(pe)
    setBioAvailable(bio); setPendingLocal(pc)
  }, [])

  useEffect(() => { load() }, [load])

  // ── Toggle offline ────────────────────────────────────────────────────────
  const handleToggleOffline = async (val) => {
    await setOfflineEnabled(val)
    setOfflineEnabledState(val)
    if (!val) { await clearPin(); setPinExists(false) }
  }

  // ── PIN helpers ───────────────────────────────────────────────────────────
  const resetForm = () => { setNewPin(''); setConfirmPin(''); setCurrentPin(''); setPinErr(''); setMode(null) }

  const handleSetPin = async () => {
    if (newPin.length < PIN_LENGTH) { setPinErr(`Le PIN doit contenir ${PIN_LENGTH} chiffres`); return }
    if (newPin !== confirmPin)      { setPinErr('Les PINs ne correspondent pas'); return }
    setLoading(true)
    try {
      // Si changement : vérifier l'ancien PIN
      if (mode === 'change') {
        const ok = await verifyPin(null, currentPin) // userId récupéré depuis settingsDB directement
        if (!ok) { setPinErr('PIN actuel incorrect'); return }
      }
      const { useAuth } = await import('../context/AuthContext')
      // Récupère userId depuis localStorage en fallback
      const userId = JSON.parse(localStorage.getItem('sf_user') || '{}')?.id ?? 'user'
      await setPin(userId, newPin)
      setPinExists(true)
      setPinSuccess(mode === 'change' ? 'PIN modifié avec succès ✓' : 'PIN configuré avec succès ✓')
      setTimeout(() => { setPinSuccess(''); resetForm() }, 2000)
    } catch (e) { setPinErr(e.message) }
    finally { setLoading(false) }
  }

  const handleDisablePin = async () => {
    setLoading(true)
    try {
      const userId = JSON.parse(localStorage.getItem('sf_user') || '{}')?.id ?? 'user'
      const ok = await verifyPin(userId, currentPin)
      if (!ok) { setPinErr('PIN incorrect'); return }
      await clearPin()
      setPinExists(false)
      setPinSuccess('PIN désactivé ✓')
      setTimeout(() => { setPinSuccess(''); resetForm() }, 2000)
    } catch (e) { setPinErr(e.message) }
    finally { setLoading(false) }
  }

  // ── Reset données locales ─────────────────────────────────────────────────
  const [resetConfirm, setResetConfirm] = useState(false)
  const handleReset = async () => {
    if (!resetConfirm) { setResetConfirm(true); return }
    await Promise.all([
      clearStore('transactions'), clearStore('budgets'),
      clearStore('categories'),   clearStore('user'),
      clearQueue(),
    ])
    setResetConfirm(false); setPendingLocal(0)
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="fade-up" style={{ padding: isMobile ? 16 : 24, maxWidth: 680 }}>
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div className="page-title">Paramètres</div>
        <div className="page-subtitle">Accès hors ligne, PIN et synchronisation</div>
      </div>

      {/* ── Accès hors ligne ─────────────────────────────────────────────── */}
      <Section title="Accès hors ligne" icon="📶">
        <ToggleRow
          label="Activer l'accès hors ligne"
          sub="Permet d'utiliser l'app sans connexion et de protéger les données par PIN"
          checked={offlineEnabled}
          onChange={handleToggleOffline}
        />
        {!online && (
          <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 10, background: 'rgba(245,71,106,.08)', border: '1px solid rgba(245,71,106,.15)', fontSize: 12, color: '#f5476a' }}>
            ⚠️ Vous êtes actuellement hors ligne. Les données affichées proviennent du cache local.
          </div>
        )}
      </Section>

      {/* ── PIN ──────────────────────────────────────────────────────────── */}
      <Section title="Code PIN" icon="🔐">
        {!offlineEnabled ? (
          <div style={{ fontSize: 13, color: 'var(--text3)' }}>Activez l'accès hors ligne pour configurer un PIN.</div>
        ) : (
          <>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16, lineHeight: 1.6 }}>
              {pinExists
                ? '🔒 Un PIN est configuré. Il sera demandé au démarrage si vous êtes hors ligne.'
                : '🔓 Aucun PIN configuré. Sans PIN, les données sont accessibles sans vérification hors ligne.'}
            </div>

            {pinSuccess && (
              <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(34,211,160,.1)', border: '1px solid rgba(34,211,160,.2)', fontSize: 13, color: '#22d3a0', marginBottom: 14 }}>
                {pinSuccess}
              </div>
            )}

            {/* Formulaire actif */}
            {mode === 'setup' && (
              <div>
                <PinInput label={`Nouveau PIN (${PIN_LENGTH} chiffres)`} value={newPin} onChange={setNewPin} />
                <PinInput label="Confirmer le PIN" value={confirmPin} onChange={setConfirmPin} error={pinErr} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-ghost" style={{ flex: 1 }} onClick={resetForm}>Annuler</button>
                  <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSetPin} disabled={loading}>
                    {loading ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Enregistrement…</> : '🔐 Définir le PIN'}
                  </button>
                </div>
              </div>
            )}

            {mode === 'change' && (
              <div>
                <PinInput label="PIN actuel" value={currentPin} onChange={setCurrentPin} />
                <PinInput label="Nouveau PIN" value={newPin} onChange={setNewPin} />
                <PinInput label="Confirmer le nouveau PIN" value={confirmPin} onChange={setConfirmPin} error={pinErr} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-ghost" style={{ flex: 1 }} onClick={resetForm}>Annuler</button>
                  <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSetPin} disabled={loading}>
                    {loading ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> …</> : '🔄 Modifier le PIN'}
                  </button>
                </div>
              </div>
            )}

            {mode === 'disable' && (
              <div>
                <PinInput label="Entrez votre PIN actuel pour confirmer" value={currentPin} onChange={setCurrentPin} error={pinErr} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-ghost" style={{ flex: 1 }} onClick={resetForm}>Annuler</button>
                  <button className="btn btn-danger" style={{ flex: 2 }} onClick={handleDisablePin} disabled={loading}>
                    {loading ? '…' : '🗑 Désactiver le PIN'}
                  </button>
                </div>
              </div>
            )}

            {/* Actions disponibles */}
            {!mode && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {!pinExists && (
                  <button className="btn btn-primary" onClick={() => { setPinErr(''); setMode('setup') }}>
                    🔐 Configurer un PIN
                  </button>
                )}
                {pinExists && (
                  <>
                    <button className="btn btn-ghost" onClick={() => { setPinErr(''); setMode('change') }}>
                      🔄 Modifier le PIN
                    </button>
                    <button className="btn btn-danger" style={{ background: 'transparent' }} onClick={() => { setPinErr(''); setMode('disable') }}>
                      Désactiver
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Biométrie (V2) */}
            {bioAvailable && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <ToggleRow
                  label="Face ID / Empreinte (bientôt)"
                  sub="Déverrouillage biométrique — disponible dans une prochaine version"
                  checked={false}
                  onChange={() => {}}
                  disabled
                />
              </div>
            )}
          </>
        )}
      </Section>

      {/* ── Synchronisation ──────────────────────────────────────────────── */}
      <Section title="Synchronisation" icon="🔄">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Opérations en attente</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>Créations / modifications / suppressions offline</div>
            </div>
            <span style={{
              padding: '4px 12px', borderRadius: 100,
              background: pendingLocal > 0 ? 'rgba(245,158,11,.12)' : 'rgba(34,211,160,.1)',
              color: pendingLocal > 0 ? '#f59e0b' : '#22d3a0',
              fontSize: 13, fontWeight: 700,
            }}>{pendingLocal}</span>
          </div>

          {pendingLocal > 0 && online && (
            <button className="btn btn-primary" onClick={sync} disabled={syncing}>
              {syncing ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Synchronisation…</> : '⬆️ Synchroniser maintenant'}
            </button>
          )}
          {pendingLocal > 0 && !online && (
            <div style={{ fontSize: 12, color: 'var(--text3)', fontStyle: 'italic' }}>
              La synchronisation reprendra automatiquement à la reconnexion.
            </div>
          )}
        </div>
      </Section>

      {/* ── Données locales ───────────────────────────────────────────────── */}
      <Section title="Données locales" icon="🗄️">
        <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 14, lineHeight: 1.6 }}>
          Vide le cache IndexedDB local. Les données du serveur ne sont pas affectées et seront re-téléchargées à la prochaine connexion.
        </div>
        <button
          className={resetConfirm ? 'btn btn-danger' : 'btn btn-ghost'}
          onClick={handleReset}
        >
          {resetConfirm ? '⚠️ Confirmer la suppression du cache' : '🗑 Vider le cache local'}
        </button>
        {resetConfirm && (
          <button className="btn btn-ghost" style={{ marginLeft: 8 }} onClick={() => setResetConfirm(false)}>Annuler</button>
        )}
      </Section>
    </div>
  )
}
