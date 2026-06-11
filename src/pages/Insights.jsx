/**
 * Insights.jsx — VERSION ALLÉGÉE
 *
 * AVANT : generateInsights() + useInsights() calculaient tout côté React
 * APRÈS : GET /analytics/insights/ retourne la liste prête à afficher
 *
 * Supprimé : import { generateInsights } from '../hooks/useFinanceData'
 *            import { useInsights }      from '../hooks/useInsights'
 */

import { useState, useEffect, useCallback } from 'react'
import { useBreakpoint } from '../hooks/useBreakpoint'
import MobilePageShell from '../components/MobilePageShell'
import { useAuth } from '../context/AuthContext'
import { analyticsAPI } from '../services/api'

const fmt = n => `${new Intl.NumberFormat('fr-FR').format(Number(n) || 0)} FCFA`

const GROUPS = [
  { key: 'all',           label: 'Tout',         icon: '⊞' },
  { key: 'alerts',        label: 'Alertes',       icon: '⚠' },
  { key: 'opportunities', label: 'Opportunités',  icon: '💡' },
  { key: 'trends',        label: 'Tendances',     icon: '📈' },
]

const GROUP_META = {
  alerts:        { title: 'Alertes',       subtitle: 'Actions urgentes',               color: '#f5476a' },
  opportunities: { title: 'Opportunités',  subtitle: "Pistes d'optimisation",          color: '#38bdf8' },
  trends:        { title: 'Tendances',     subtitle: 'Évolution de vos habitudes',     color: '#22d3a0' },
}

const PRIORITY_LABEL = { high: 'Critique', medium: 'Important', low: 'Info' }

function InsightItem({ insight, onDismiss }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 14,
      padding: '14px 16px',
      background: insight.bg,
      border: `1px solid ${insight.color}28`,
      borderLeft: `3px solid ${insight.color}`,
      borderRadius: 12, position: 'relative',
      transition: 'transform .15s',
    }}
      onMouseEnter={e => e.currentTarget.style.transform = 'translateX(3px)'}
      onMouseLeave={e => e.currentTarget.style.transform = ''}
    >
      <span style={{
        flexShrink: 0, width: 36, height: 36, borderRadius: 10,
        background: `${insight.color}20`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
      }}>{insight.icon}</span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{insight.title}</span>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 100,
            background: `${insight.color}20`, color: insight.color,
          }}>
            {PRIORITY_LABEL[insight.priority]}
          </span>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.55 }}>{insight.message}</div>
        {insight.action && (
          <div style={{ fontSize: 12, color: insight.color, marginTop: 6, fontWeight: 600 }}>
            → {insight.action}
          </div>
        )}
      </div>

      <button onClick={() => onDismiss(insight.id)} title="Ignorer" style={{
        position: 'absolute', top: 10, right: 10,
        background: 'transparent', border: 'none', cursor: 'pointer',
        color: 'var(--text3)', fontSize: 14, padding: '2px 6px', borderRadius: 6, transition: 'color .15s',
      }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--text3)'}
      >✕</button>
    </div>
  )
}

export default function Insights() {
  const { user } = useAuth()

  // Données servies par le back — aucun calcul ici
  const [allInsights,  setAllInsights]  = useState([])
  const [summary,      setSummary]      = useState(null)
  const [dashboard,    setDashboard]    = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [err,          setErr]          = useState(null)

  // UI state uniquement
  const [activeGroup,  setActiveGroup]  = useState('all')
  const [dismissed,    setDismissed]    = useState(new Set())

  const load = useCallback(async () => {
    if (!user?.id) return
    setLoading(true); setErr(null)
    try {
      const [ins, dash] = await Promise.all([
        analyticsAPI.insights(user.id),
        analyticsAPI.dashboard(user.id),
      ])

      // Le back retourne { insights: [...], summary: {...} }
      setAllInsights(ins?.insights ?? [])
      setSummary(ins?.summary ?? null)
      setDashboard(dash?.data ?? dash)

    } catch(e) { setErr(e.message) }
    finally { setLoading(false) }
  }, [user?.id])

  useEffect(() => { load() }, [load] )

  const dismiss   = id  => setDismissed(prev => new Set([...prev, id]))
  const restoreAll = () => setDismissed(new Set())

  // Filtrage local uniquement (par groupe + dismissed)
  const visible = allInsights.filter(i => !dismissed.has(i.id))
  const filtered = activeGroup === 'all' ? visible : visible.filter(i => i.group === activeGroup)

  // Compteurs depuis le back (summary) ou calculés localement
  const counts = {
    all:           visible.length,
    alerts:        summary?.alerts        ?? visible.filter(i => i.group === 'alerts').length,
    opportunities: summary?.opportunities ?? visible.filter(i => i.group === 'opportunities').length,
    trends:        summary?.trends        ?? visible.filter(i => i.group === 'trends').length,
  }

  const groupedBySection = GROUPS.slice(1).reduce((acc, g) => {
    const items = filtered.filter(i => i.group === g.key)
    if (items.length) acc[g.key] = items
    return acc
  }, {})

  const { isMobile } = useBreakpoint()

  return (
    <MobilePageShell title="Insights" subtitle="Alertes & conseils personnalisés">
    <div className="fade-up" style={{ padding: isMobile ? '12px 0 0' : 24 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="page-title">Insights</div>
          <div className="page-subtitle">Analyse intelligente — générée par le serveur</div>
        </div>
        <button className="btn btn-ghost" onClick={load} disabled={loading}>
          {loading ? <span className="spinner" /> : '↺'} Actualiser
        </button>
      </div>

      {err && <div className="error-box" style={{ marginBottom: 20 }}>{err}</div>}

      {/* Situation financière — données servies par le back */}
      {!loading && dashboard && (
        <div className="card" style={{ padding: 20, marginBottom: 20, borderLeft: '2px solid #7c6cfc' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 10 }}>
                Situation financière du mois
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[
                  { icon: (dashboard.balance ?? 0) >= 0 ? '✓' : '✕', label: (dashboard.balance ?? 0) >= 0 ? 'Solde positif' : 'Solde négatif', ok: (dashboard.balance ?? 0) >= 0 },
                  { icon: (dashboard.savings_rate ?? 0) >= 20 ? '✓' : '!', label: `Épargne ${(dashboard.savings_rate ?? 0).toFixed(0)}%`, ok: (dashboard.savings_rate ?? 0) >= 20 },
                  { icon: counts.alerts === 0 ? '✓' : '⚠', label: counts.alerts === 0 ? 'Aucune alerte' : `${counts.alerts} alerte${counts.alerts > 1 ? 's' : ''}`, ok: counts.alerts === 0 },
                ].map((s, i) => (
                  <span key={i} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px',
                    borderRadius: 100, fontSize: 12, fontWeight: 600,
                    background: s.ok ? 'rgba(34,211,160,.1)' : 'rgba(245,71,106,.1)',
                    color: s.ok ? '#22d3a0' : '#f5476a',
                    border: `1px solid ${s.ok ? 'rgba(34,211,160,.2)' : 'rgba(245,71,106,.2)'}`,
                  }}>
                    {s.icon} {s.label}
                  </span>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              {[
                { label: 'Revenus',  value: fmt(dashboard.total_income),   color: '#22d3a0' },
                { label: 'Dépenses', value: fmt(dashboard.total_expenses),  color: '#f5476a' },
                { label: 'Solde',    value: fmt(dashboard.balance),         color: (dashboard.balance ?? 0) >= 0 ? '#22d3a0' : '#f5476a' },
              ].map((s, i) => (
                <div key={i} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: s.color, fontFamily: 'JetBrains Mono,monospace' }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tabs groupes */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {GROUPS.map(g => (
          <button key={g.key} onClick={() => setActiveGroup(g.key)} style={{
            display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px',
            borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            fontSize: 13, fontWeight: 600, transition: 'all .15s',
            background: activeGroup === g.key ? 'rgba(124,108,252,.15)' : 'var(--surface2)',
            color: activeGroup === g.key ? 'var(--accent2)' : 'var(--text2)',
            outline: activeGroup === g.key ? '1px solid rgba(124,108,252,.2)' : 'none',
          }}>
            <span>{g.icon}</span>
            <span>{g.label}</span>
            {counts[g.key] > 0 && (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 100,
                background: activeGroup === g.key ? 'rgba(124,108,252,.3)' : 'var(--surface3)',
                color: activeGroup === g.key ? 'var(--accent2)' : 'var(--text3)',
              }}>{counts[g.key]}</span>
            )}
          </button>
        ))}
        {dismissed.size > 0 && (
          <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={restoreAll}>
            Restaurer ({dismissed.size})
          </button>
        )}
      </div>

      {/* Liste insights */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 76, borderRadius: 12 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text3)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>{visible.length === 0 ? '✨' : '🔍'}</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, color: 'var(--text2)' }}>
            {visible.length === 0 ? 'Tout va bien !' : 'Aucun insight dans cette catégorie'}
          </div>
          <div style={{ fontSize: 13 }}>
            {visible.length === 0
              ? 'Aucune alerte ni anomalie détectée. Continuez ainsi !'
              : 'Sélectionnez un autre groupe.'}
          </div>
        </div>
      ) : activeGroup === 'all' ? (
        // Vue groupée par section
        Object.entries(groupedBySection).map(([group, items]) => {
          const meta = GROUP_META[group] ?? { title: group, color: 'var(--accent2)' }
          return (
            <div key={group} style={{ marginBottom: 24 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12,
                padding: '10px 14px', borderRadius: 10,
                background: `${meta.color}08`,
                border: `1px solid ${meta.color}22`,
              }}>
                <div style={{ width: 3, height: 20, borderRadius: 2, background: meta.color, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: meta.color }}>{meta.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>{meta.subtitle}</div>
                </div>
                <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: meta.color, background: `${meta.color}20`, padding: '2px 8px', borderRadius: 100 }}>
                  {items.length}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {items.map(ins => <InsightItem key={ins.id} insight={ins} onDismiss={dismiss} />)}
              </div>
            </div>
          )
        })
      ) : (
        // Vue filtrée
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(ins => <InsightItem key={ins.id} insight={ins} onDismiss={dismiss} />)}
        </div>
      )}
    </div>
    </MobilePageShell>
  )
}