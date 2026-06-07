/**
 * Dashboard.jsx — VERSION ALLÉGÉE
 *
 * AVANT : useFinanceCalcs() + generateInsights() calculaient tout côté front
 * APRÈS : 3 appels API, le back retourne les métriques déjà calculées
 *
 * Supprimé :  import { useFinanceCalcs, generateInsights } from '../hooks/useFinanceData'
 *             import { useInsights } from '../hooks/useInsights'
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { analyticsAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { InsightCard } from '../components/ui'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

// Formateur FCFA — uniquement pour l'affichage
const fmt    = n => `${new Intl.NumberFormat('fr-FR').format(Number(n) || 0)} FCFA`
const fmtPct = n => `${(n ?? 0).toFixed(1)}%`
const fmtAxis = v => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `${(v / 1_000).toFixed(0)}k`
  return String(v)
}

function Sk({ w = '100%', h = 16, r = 6 }) {
  return <div className="skeleton" style={{ width: w, height: h, borderRadius: r }} />
}

function StatCard({ label, value, sub, color, icon, loading }) {
  return (
    <div className="card" style={{ padding: 22, flex: '1 1 180px', minWidth: 170, borderLeft: `2px solid ${color}`, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 16, right: 16, fontSize: 22, opacity: .12 }}>{icon}</div>
      {loading ? (
        <><Sk w={48} h={48} r={12} /><div style={{ height: 8 }} /><Sk w="60%" /><div style={{ height: 6 }} /><Sk w="40%" h={24} /></>
      ) : (
        <>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>{label}</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', letterSpacing: '-.03em', lineHeight: 1 }}>{value}</div>
          {sub && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6 }}>{sub}</div>}
        </>
      )}
    </div>
  )
}

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 10, padding: '10px 14px', fontSize: 13 }}>
      <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>{label}</div>
      {payload.map((p, i) => <div key={i} style={{ color: p.color, fontWeight: 500 }}>{p.name}: {fmt(p.value)}</div>)}
    </div>
  )
}

export default function Dashboard() {
  const { user }   = useAuth()
  const navigate   = useNavigate()

  // ── State : 1 objet par appel API ──────────────────────────────────────────
  const [dashboard, setDashboard] = useState(null)   // metrics du back
  const [monthly,   setMonthly]   = useState([])      // données chart + metrics
  const [catExp,    setCatExp]    = useState([])      // données chart
  const [insights,  setInsights]  = useState([])      // insights prêts à afficher
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)

  useEffect(() => {
    if (!user?.id) return
    let active = true
    setLoading(true)

    Promise.all([
      analyticsAPI.dashboard(user.id),
      analyticsAPI.monthlyExpenses(user.id, 6),
      analyticsAPI.categoryExpenses(user.id),
      analyticsAPI.insights(user.id),
    ])
    .then(([dash, mon, cat, ins]) => {
      if (!active) return
      // Le back retourne déjà tout calculé — on stocke directement
      setDashboard(dash?.data ?? dash)
      setMonthly(mon?.data ?? [])
      setCatExp(cat?.data ?? [])
      // Le back retourne insights triés par priorité
      setInsights((ins?.insights ?? []).slice(0, 3))
    })
    .catch(e => { if (active) setError(e.message) })
    .finally(() => { if (active) setLoading(false) })

    return () => { active = false }
  }, [user?.id])

  // Données pour le pie chart — aucun calcul
  const pieData = catExp.map((c, i) => ({
    name:  c.category?.name ?? c.name ?? `Cat ${i + 1}`,
    value: c.amount ?? c.total ?? 0,
    color: c.category?.color ?? c.color ?? `hsl(${i * 47},65%,55%)`,
  }))

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  return (
    <div className="fade-up" style={{ padding: 24 }}>

      {/* Header */}
      <div className="page-header">
        <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 4 }}>{today}</div>
        <div className="page-title">Bonjour, {user?.name?.split(' ')[0] ?? ''} 👋</div>
        <div className="page-subtitle">Voici votre aperçu financier</div>
      </div>

      {error && (
        <div className="error-box" style={{ marginBottom: 20 }}>
          {error}
          <button className="btn btn-ghost btn-sm" style={{ marginLeft: 8 }} onClick={() => window.location.reload()}>Réessayer</button>
        </div>
      )}

      {/* Stat cards — valeurs servies directement par le back */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 20, flexWrap: 'wrap' }}>
        <StatCard label="Revenus"        value={loading ? '—' : fmt(dashboard?.total_income)}          color="#22d3a0" icon="↑" loading={loading} sub="Cette période" />
        <StatCard label="Dépenses"       value={loading ? '—' : fmt(dashboard?.total_expenses)}        color="#f5476a" icon="↓" loading={loading} sub="Cette période" />
        <StatCard label="Solde net"      value={loading ? '—' : fmt(dashboard?.balance)}               color="#7c6cfc" icon="⬡" loading={loading} sub="Revenus − Dépenses" />
        <StatCard label="Budget utilisé" value={loading ? '—' : fmtPct(dashboard?.budget_usage_percent)} color="#f59e0b" icon="◎" loading={loading} sub="Du budget mensuel" />
      </div>

      {/* Insights — tableau prêt à l'emploi depuis le back */}
      {!loading && insights.length > 0 && (
        <div className="card" style={{ padding: 20, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Insights & Alertes</div>
              <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>Analyse automatique de vos finances</div>
            </div>
            <button onClick={() => navigate('/insights')} style={{
              fontSize: 12, fontWeight: 600, color: 'var(--accent2)',
              background: 'rgba(124,108,252,.08)', border: '1px solid rgba(124,108,252,.15)',
              borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontFamily: 'inherit',
            }}>
              Voir tout →
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {insights.map(ins => <InsightCard key={ins.id} insight={ins} compact />)}
          </div>
        </div>
      )}

      {/* Charts */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>

        {/* Bar chart mensuel */}
        <div className="card" style={{ flex: '2 1 380px', padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Vue mensuelle</div>
              <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>Revenus vs Dépenses</div>
            </div>
            <button onClick={() => navigate('/analytics')} style={{
              fontSize: 11, fontWeight: 600, color: 'var(--text3)',
              background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: 7, padding: '5px 11px', cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s',
            }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--border2)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text3)'; e.currentTarget.style.borderColor = 'var(--border)' }}>
              Analyse complète →
            </button>
          </div>
          {loading ? <Sk h={220} /> : monthly.length === 0 ? (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: 14 }}>Pas encore de données</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthly} barSize={14} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: 'var(--text3)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text3)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={fmtAxis} />
                <Tooltip content={<ChartTooltip />} />
                <Legend iconType="circle" iconSize={7} formatter={v => <span style={{ fontSize: 12, color: 'var(--text2)' }}>{v}</span>} />
                <Bar dataKey="income"   fill="#7c6cfc" name="Revenus"  radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" fill="#f5476a" name="Dépenses" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie */}
        <div className="card" style={{ flex: '1 1 260px', padding: 24 }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Par catégorie</div>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>Répartition des dépenses</div>
          </div>
          {loading ? <Sk h={160} /> : pieData.length === 0 ? (
            <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: 14 }}>Pas de données</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2} dataKey="value">
                    {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip formatter={v => [fmt(v), 'Montant']} contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 8, fontSize: 13 }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                {pieData.slice(0, 5).map((d, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: d.color, display: 'inline-block', flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: 'var(--text2)' }}>{d.name}</span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', fontFamily: 'JetBrains Mono,monospace' }}>{fmt(d.value)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Métriques rapides — servies par le back */}
      {!loading && dashboard && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <div className="card" style={{ flex: '1 1 180px', padding: '16px 20px', borderLeft: '2px solid #7c6cfc' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>Taux d'épargne</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: (dashboard.savings_rate ?? 0) >= 20 ? '#22d3a0' : '#f59e0b', fontFamily: 'JetBrains Mono,monospace', marginBottom: 4 }}>
              {fmtPct(dashboard.savings_rate)}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>{(dashboard.savings_rate ?? 0) >= 20 ? '✓ Objectif atteint' : 'Objectif : 20%'}</div>
          </div>
          <div className="card" style={{ flex: '1 1 180px', padding: '16px 20px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>Ratio dép./rev.</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', fontFamily: 'JetBrains Mono,monospace', marginBottom: 4 }}>
              {fmtPct(dashboard.expense_ratio)}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>Idéal &lt; 80%</div>
          </div>
        </div>
      )}

      {/* Line chart */}
      <div className="card" style={{ padding: 24, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Tendance financière</div>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>Évolution revenus vs dépenses</div>
          </div>
        </div>
        {loading ? <Sk h={180} /> : monthly.length === 0 ? (
          <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: 14 }}>Pas encore de données</div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: 'var(--text3)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text3)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={fmtAxis} />
              <Tooltip content={<ChartTooltip />} />
              <Legend iconType="circle" iconSize={7} formatter={v => <span style={{ fontSize: 12, color: 'var(--text2)' }}>{v}</span>} />
              <Line type="monotone" dataKey="income"   stroke="#7c6cfc" strokeWidth={2.5} dot={{ r: 4, fill: '#7c6cfc', strokeWidth: 0 }} name="Revenus"  activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="expenses" stroke="#f5476a" strokeWidth={2.5} dot={{ r: 4, fill: '#f5476a', strokeWidth: 0 }} name="Dépenses" activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Raccourcis */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {[
          { label: 'Analytics', to: '/analytics', icon: '∿', color: '#7c6cfc', sub: 'Tendances & projections' },
          { label: 'Insights',  to: '/insights',  icon: '💡', color: '#38bdf8', sub: 'Alertes & conseils'     },
          { label: 'Rapports',  to: '/reports',   icon: '📄', color: '#22d3a0', sub: 'Export CSV / PDF'       },
          { label: 'Budgets',   to: '/budgets',   icon: '◎',  color: '#f59e0b', sub: 'Périodes & limites'     },
        ].map((item, i) => (
          <button key={i} onClick={() => navigate(item.to)} style={{
            flex: '1 1 140px', padding: '14px 16px', borderRadius: 12,
            background: 'var(--surface2)', border: '1px solid var(--border)',
            cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', transition: 'all .18s',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = item.color + '44'; e.currentTarget.style.background = item.color + '0a' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface2)' }}>
            <div style={{ fontSize: 20, marginBottom: 8 }}>{item.icon}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>{item.label}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>{item.sub}</div>
          </button>
        ))}
      </div>
    </div>
  )
}