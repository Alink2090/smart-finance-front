import { useNavigate } from 'react-router-dom'

/**
 * InsightCard — affiche un insight ou une alerte financière.
 *
 * Props:
 *   insight: { id, type, icon, title, message, action? }
 *   type: 'error' | 'warning' | 'info' | 'success'
 *   compact: boolean — mode compact pour la liste du Dashboard
 */

const STYLES = {
  error:   { bg: 'rgba(245,71,106,.08)',  border: 'rgba(245,71,106,.2)',  color: 'var(--red)',    iconBg: 'rgba(245,71,106,.15)'  },
  warning: { bg: 'rgba(245,158,11,.07)',  border: 'rgba(245,158,11,.2)',  color: 'var(--amber)',  iconBg: 'rgba(245,158,11,.15)'  },
  info:    { bg: 'rgba(56,189,248,.07)',  border: 'rgba(56,189,248,.2)',  color: 'var(--blue)',   iconBg: 'rgba(56,189,248,.12)'  },
  success: { bg: 'rgba(34,211,160,.07)', border: 'rgba(34,211,160,.2)', color: 'var(--green)',  iconBg: 'rgba(34,211,160,.12)'  },
}

export function InsightCard({ insight, compact = false }) {
  const navigate = useNavigate()
  const s = STYLES[insight.type] ?? STYLES.info

  if (compact) {
    return (
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        padding: '10px 14px',
        background: s.bg,
        border: `1px solid ${s.border}`,
        borderRadius: 10,
        borderLeft: `3px solid ${s.color}`,
      }}>
        <span style={{
          flexShrink: 0, width: 22, height: 22, borderRadius: 6,
          background: s.iconBg, display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 11, color: s.color, fontWeight: 700,
        }}>{insight.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{insight.title}</div>
          <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>{insight.message}</div>
        </div>
        {insight.action && (
          <button
            onClick={() => navigate(insight.action.page)}
            style={{
              flexShrink: 0, fontSize: 11, fontWeight: 600, color: s.color,
              background: 'transparent', border: `1px solid ${s.border}`,
              borderRadius: 6, padding: '3px 8px', cursor: 'pointer',
              fontFamily: 'inherit', whiteSpace: 'nowrap',
            }}>
            {insight.action.label} →
          </button>
        )}
      </div>
    )
  }

  return (
    <div style={{
      padding: '14px 18px',
      background: s.bg,
      border: `1px solid ${s.border}`,
      borderRadius: 12,
      borderLeft: `3px solid ${s.color}`,
      display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <span style={{
        flexShrink: 0, width: 36, height: 36, borderRadius: 10,
        background: s.iconBg, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: 16, color: s.color, fontWeight: 700,
      }}>{insight.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>{insight.title}</div>
        <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.55 }}>{insight.message}</div>
      </div>
      {insight.action && (
        <button
          onClick={() => navigate(insight.action.page)}
          style={{
            flexShrink: 0, fontSize: 12, fontWeight: 600, color: s.color,
            background: 'transparent', border: `1px solid ${s.border}`,
            borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
            fontFamily: 'inherit', whiteSpace: 'nowrap', transition: 'all .15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = s.iconBg}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          {insight.action.label} →
        </button>
      )}
    </div>
  )
}

/**
 * InsightList — affiche une liste d'insights (usage Dashboard)
 */
export function InsightList({ insights, max = 3, onViewAll }) {
  if (!insights?.length) return null

  const visible = insights.slice(0, max)
  const hidden  = insights.length - max

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {visible.map(ins => (
        <InsightCard key={ins.id} insight={ins} compact />
      ))}
      {hidden > 0 && onViewAll && (
        <button
          onClick={onViewAll}
          style={{
            fontSize: 12, color: 'var(--text3)', background: 'transparent',
            border: 'none', cursor: 'pointer', padding: '4px 0', textAlign: 'left',
            fontFamily: 'inherit',
          }}>
          + {hidden} insight{hidden > 1 ? 's' : ''} supplémentaire{hidden > 1 ? 's' : ''} →
        </button>
      )}
    </div>
  )
}

/**
 * PredictionBlock — bloc prédiction fin de mois (usage Analytics)
 */
export function PredictionBlock({ prediction, loading }) {
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[1, 2].map(i => (
          <div key={i} className="skeleton" style={{ height: 52, borderRadius: 10 }} />
        ))}
      </div>
    )
  }
  if (!prediction) return (
    <div style={{ fontSize: 13, color: 'var(--text3)', padding: '12px 0' }}>
      Pas assez de données pour la prédiction.
    </div>
  )

  const s = STYLES[prediction.type] ?? STYLES.info
  const today = new Date()
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const elapsed = Math.round((today.getDate() / daysInMonth) * 100)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{
        padding: '14px 18px', background: s.bg, border: `1px solid ${s.border}`,
        borderRadius: 12, borderLeft: `3px solid ${s.color}`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: s.color }}>→ Projection fin de mois</span>
          <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'JetBrains Mono,monospace' }}>
            {elapsed}% du mois écoulé
          </span>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.55 }}>{prediction.message}</div>
        {/* Barre de progression du mois */}
        <div style={{ marginTop: 10 }}>
          <div className="progress" style={{ height: 5 }}>
            <div className="progress-fill" style={{
              width: `${elapsed}%`, height: '100%',
              background: `linear-gradient(90deg, ${s.color}, ${s.color}99)`,
            }} />
          </div>
        </div>
      </div>
    </div>
  )
}
