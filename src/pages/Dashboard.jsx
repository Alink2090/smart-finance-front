import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { offlineAnalyticsAPI } from '../services/offlineApi'
import { useAuth } from '../context/AuthContext'
import { useIsMobile } from '../hooks/useIsMobile'
import { InsightCard } from '../components/ui'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

const fmt    = n => `${new Intl.NumberFormat('fr-FR').format(Number(n) || 0)} FCFA`
const fmtPct = n => `${(n ?? 0).toFixed(1)}%`
const fmtAxis = v => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `${(v / 1_000).toFixed(0)}k`
  return String(v)
}
const fmtShort = n => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}k`
  return `${n}`
}

function Sk({ w = '100%', h = 16, r = 6 }) {
  return <div className="skeleton" style={{ width: w, height: h, borderRadius: r }} />
}

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:'var(--surface2)', border:'1px solid var(--border2)', borderRadius:10, padding:'10px 14px', fontSize:13 }}>
      <div style={{ fontWeight:700, color:'var(--text)', marginBottom:6 }}>{label}</div>
      {payload.map((p, i) => <div key={i} style={{ color:p.color, fontWeight:500 }}>{p.name}: {fmt(p.value)}</div>)}
    </div>
  )
}

// ── Mobile Dashboard ──────────────────────────────────────────────────────────
function MobileDashboard({ dashboard, monthly, catExp, insights, loading, error, pieData }) {
  const navigate = useNavigate()
  const { user } = useAuth()

  const today = new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' })

  return (
    <div className="fade-up" style={{ padding: 16, paddingBottom: 4 }}>

      {/* Hero balance card */}
      <div style={{
        borderRadius: 20,
        background: 'linear-gradient(135deg, rgba(124,108,252,.18) 0%, rgba(91,77,232,.1) 50%, rgba(34,211,160,.06) 100%)',
        border: '1px solid rgba(124,108,252,.2)',
        padding: '24px 20px',
        marginBottom: 16,
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position:'absolute', top:-40, right:-40, width:160, height:160, borderRadius:'50%', background:'radial-gradient(circle, rgba(124,108,252,.12), transparent 70%)' }} />
        <div style={{ fontSize:12, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:6 }}>
          {today}
        </div>
        <div style={{ fontSize:15, color:'var(--text2)', marginBottom:4 }}>
          Bonjour, {user?.name?.split(' ')[0] ?? ''} 👋
        </div>
        <div style={{ fontSize: 34, fontWeight: 800, color: 'var(--text)', letterSpacing: '-.04em', lineHeight: 1.1, marginBottom: 8 }}>
          {loading ? <Sk w={180} h={34} r={8} /> : fmtShort(dashboard?.balance ?? 0)}
          {!loading && <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text3)', marginLeft: 6 }}>FCFA</span>}
        </div>
        <div style={{ fontSize: 13, color: (dashboard?.balance ?? 0) >= 0 ? '#22d3a0' : '#f5476a', fontWeight: 600 }}>
          {loading ? <Sk w={100} h={13} r={4} /> : `Solde net · ${fmtPct(dashboard?.savings_rate)} épargne`}
        </div>
      </div>

      {error && (
        <div className="error-box" style={{ marginBottom: 14, fontSize: 13 }}>
          {error}
          <button className="btn btn-ghost btn-sm" style={{ marginLeft: 8 }} onClick={() => window.location.reload()}>Réessayer</button>
        </div>
      )}

      {/* 2×2 stat grid */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
        {[
          { label:'Revenus',        value: dashboard?.total_income,          color:'#22d3a0', icon:'↑', sign: '+' },
          { label:'Dépenses',       value: dashboard?.total_expenses,        color:'#f5476a', icon:'↓', sign: '-' },
          { label:'Budget utilisé', value: null, pct: dashboard?.budget_usage_percent, color:'#f59e0b', icon:'◎' },
          { label:'Taux épargne',   value: null, pct: dashboard?.savings_rate,         color:'#7c6cfc', icon:'⬡' },
        ].map((s, i) => (
          <div key={i} className="card" style={{
            padding: '14px 14px', borderLeft: `2px solid ${s.color}`,
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position:'absolute', top:10, right:10, fontSize:18, opacity:.1 }}>{s.icon}</div>
            <div style={{ fontSize:10, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:6 }}>{s.label}</div>
            {loading
              ? <Sk w="70%" h={22} r={5} />
              : <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', letterSpacing:'-.03em', lineHeight:1 }}>
                  {s.value != null
                    ? <>{s.sign}<span style={{ fontSize:14 }}> </span>{fmtShort(s.value)}<span style={{ fontSize:11, color:'var(--text3)', fontWeight:500, marginLeft:2 }}>FCFA</span></>
                    : <span style={{ color: s.color }}>{fmtPct(s.pct)}</span>
                  }
                </div>
            }
          </div>
        ))}
      </div>

      {/* Bar chart mensuel */}
      <div className="card" style={{ padding:16, marginBottom:12 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:'var(--text)' }}>Vue mensuelle</div>
            <div style={{ fontSize:12, color:'var(--text2)' }}>Revenus vs Dépenses</div>
          </div>
          <button onClick={() => navigate('/analytics')} style={{ fontSize:11, fontWeight:600, color:'var(--accent2)', background:'rgba(124,108,252,.08)', border:'1px solid rgba(124,108,252,.15)', borderRadius:7, padding:'5px 10px', cursor:'pointer', fontFamily:'inherit' }}>
            Voir →
          </button>
        </div>
        {loading ? <Sk h={160} r={8} /> : monthly.length === 0
          ? <div style={{ height:160, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text3)', fontSize:13 }}>Pas encore de données</div>
          : <ResponsiveContainer width="100%" height={160}>
              <BarChart data={monthly} barSize={10} barGap={3}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill:'var(--text3)', fontSize:10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill:'var(--text3)', fontSize:10 }} axisLine={false} tickLine={false} tickFormatter={fmtAxis} width={36} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="income"   fill="#7c6cfc" name="Revenus"  radius={[3,3,0,0]} />
                <Bar dataKey="expenses" fill="#f5476a" name="Dépenses" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
        }
      </div>

      {/* Dépenses par catégorie — donut compact */}
      {!loading && pieData.length > 0 && (
        <div className="card" style={{ padding:16, marginBottom:12 }}>
          <div style={{ fontSize:14, fontWeight:700, color:'var(--text)', marginBottom:12 }}>Par catégorie</div>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <ResponsiveContainer width={110} height={110}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={32} outerRadius={52} paddingAngle={2} dataKey="value">
                  {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip formatter={v => [fmt(v),'Montant']} contentStyle={{ background:'var(--surface2)', border:'1px solid var(--border2)', borderRadius:8, fontSize:12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex:1, display:'flex', flexDirection:'column', gap:7 }}>
              {pieData.slice(0,4).map((d,i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ width:6, height:6, borderRadius:'50%', background:d.color, display:'inline-block', flexShrink:0 }} />
                    <span style={{ fontSize:11, color:'var(--text2)' }}>{d.name}</span>
                  </div>
                  <span style={{ fontSize:11, fontWeight:700, color:'var(--text)', fontFamily:'JetBrains Mono,monospace' }}>{fmtShort(d.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Insights compacts */}
      {!loading && insights.length > 0 && (
        <div className="card" style={{ padding:16, marginBottom:12 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <div style={{ fontSize:14, fontWeight:700, color:'var(--text)' }}>Insights</div>
            <button onClick={() => navigate('/insights')} style={{ fontSize:11, fontWeight:600, color:'var(--accent2)', background:'rgba(124,108,252,.08)', border:'1px solid rgba(124,108,252,.15)', borderRadius:7, padding:'5px 10px', cursor:'pointer', fontFamily:'inherit' }}>
              Tout voir →
            </button>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {insights.map(ins => <InsightCard key={ins.id} insight={ins} compact />)}
          </div>
        </div>
      )}

      {/* Raccourcis */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom: 8 }}>
        {[
          { label:'Analytics', to:'/analytics', icon:'∿', color:'#7c6cfc', sub:'Tendances' },
          { label:'Rapports',  to:'/reports',   icon:'📄', color:'#22d3a0', sub:'Export CSV/PDF' },
          { label:'Budgets',   to:'/budgets',   icon:'◎',  color:'#f59e0b', sub:'Limites & épargne' },
          { label:'Insights',  to:'/insights',  icon:'💡', color:'#38bdf8', sub:'Alertes & conseils' },
        ].map((item,i) => (
          <button key={i} onClick={() => navigate(item.to)} style={{
            padding:'14px', borderRadius:14,
            background:'var(--surface2)', border:'1px solid var(--border)',
            cursor:'pointer', fontFamily:'inherit', textAlign:'left', transition:'background .15s',
          }}
            onTouchStart={e => e.currentTarget.style.background = 'var(--surface3)'}
            onTouchEnd={e => e.currentTarget.style.background = 'var(--surface2)'}
          >
            <div style={{ fontSize:22, marginBottom:6 }}>{item.icon}</div>
            <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', marginBottom:2 }}>{item.label}</div>
            <div style={{ fontSize:11, color:'var(--text3)' }}>{item.sub}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Desktop Dashboard ─────────────────────────────────────────────────────────
function DesktopDashboard({ dashboard, monthly, catExp, insights, loading, error, pieData }) {
  const navigate = useNavigate()
  const { user } = useAuth()

  const today = new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' })

  return (
    <div className="fade-up" style={{ padding: 24 }}>
      <div className="page-header">
        <div style={{ fontSize:13, color:'var(--text3)', marginBottom:4 }}>{today}</div>
        <div className="page-title">Bonjour, {user?.name?.split(' ')[0] ?? ''} 👋</div>
        <div className="page-subtitle">Voici votre aperçu financier</div>
      </div>

      {error && (
        <div className="error-box" style={{ marginBottom:20 }}>
          {error}
          <button className="btn btn-ghost btn-sm" style={{ marginLeft:8 }} onClick={() => window.location.reload()}>Réessayer</button>
        </div>
      )}

      <div style={{ display:'flex', gap:14, marginBottom:20, flexWrap:'wrap' }}>
        {[
          { label:'Revenus',        value: loading ? '—' : fmt(dashboard?.total_income),            color:'#22d3a0', icon:'↑', sub:'Cette période' },
          { label:'Dépenses',       value: loading ? '—' : fmt(dashboard?.total_expenses),          color:'#f5476a', icon:'↓', sub:'Cette période' },
          { label:'Solde net',      value: loading ? '—' : fmt(dashboard?.balance),                 color:'#7c6cfc', icon:'⬡', sub:'Revenus − Dépenses' },
          { label:'Budget utilisé', value: loading ? '—' : fmtPct(dashboard?.budget_usage_percent), color:'#f59e0b', icon:'◎', sub:'Du budget mensuel' },
        ].map((s,i) => (
          <div key={i} className="card" style={{ padding:22, flex:'1 1 180px', minWidth:170, borderLeft:`2px solid ${s.color}`, position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:16, right:16, fontSize:22, opacity:.12 }}>{s.icon}</div>
            {loading
              ? <><Sk w={48} h={48} r={12}/><div style={{height:8}}/><Sk w="60%"/><div style={{height:6}}/><Sk w="40%" h={24}/></>
              : <>
                  <div style={{ fontSize:12, fontWeight:600, color:'var(--text2)', textTransform:'uppercase', letterSpacing:'.04em', marginBottom:8 }}>{s.label}</div>
                  <div style={{ fontSize:26, fontWeight:800, color:'var(--text)', letterSpacing:'-.03em', lineHeight:1 }}>{s.value}</div>
                  <div style={{ fontSize:12, color:'var(--text3)', marginTop:6 }}>{s.sub}</div>
                </>
            }
          </div>
        ))}
      </div>

      {!loading && insights.length > 0 && (
        <div className="card" style={{ padding:20, marginBottom:20 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
            <div>
              <div style={{ fontSize:15, fontWeight:700, color:'var(--text)' }}>Insights & Alertes</div>
              <div style={{ fontSize:13, color:'var(--text2)', marginTop:2 }}>Analyse automatique de vos finances</div>
            </div>
            <button onClick={() => navigate('/insights')} style={{ fontSize:12, fontWeight:600, color:'var(--accent2)', background:'rgba(124,108,252,.08)', border:'1px solid rgba(124,108,252,.15)', borderRadius:8, padding:'6px 12px', cursor:'pointer', fontFamily:'inherit' }}>
              Voir tout →
            </button>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {insights.map(ins => <InsightCard key={ins.id} insight={ins} compact />)}
          </div>
        </div>
      )}

      <div style={{ display:'flex', gap:16, marginBottom:16, flexWrap:'wrap' }}>
        <div className="card" style={{ flex:'2 1 380px', padding:24 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
            <div>
              <div style={{ fontSize:15, fontWeight:700, color:'var(--text)' }}>Vue mensuelle</div>
              <div style={{ fontSize:13, color:'var(--text2)', marginTop:2 }}>Revenus vs Dépenses</div>
            </div>
            <button onClick={() => navigate('/analytics')} style={{ fontSize:11, fontWeight:600, color:'var(--text3)', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:7, padding:'5px 11px', cursor:'pointer', fontFamily:'inherit' }}>
              Analyse complète →
            </button>
          </div>
          {loading ? <Sk h={220} /> : monthly.length === 0
            ? <div style={{ height:220, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text3)', fontSize:14 }}>Pas encore de données</div>
            : <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthly} barSize={14} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill:'var(--text3)', fontSize:12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill:'var(--text3)', fontSize:11 }} axisLine={false} tickLine={false} tickFormatter={fmtAxis} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend iconType="circle" iconSize={7} formatter={v => <span style={{ fontSize:12, color:'var(--text2)' }}>{v}</span>} />
                  <Bar dataKey="income"   fill="#7c6cfc" name="Revenus"  radius={[4,4,0,0]} />
                  <Bar dataKey="expenses" fill="#f5476a" name="Dépenses" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
          }
        </div>
        <div className="card" style={{ flex:'1 1 260px', padding:24 }}>
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:15, fontWeight:700, color:'var(--text)' }}>Par catégorie</div>
            <div style={{ fontSize:13, color:'var(--text2)', marginTop:2 }}>Répartition des dépenses</div>
          </div>
          {loading ? <Sk h={160} /> : pieData.length === 0
            ? <div style={{ height:160, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text3)', fontSize:14 }}>Pas de données</div>
            : <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2} dataKey="value">
                      {pieData.map((d,i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip formatter={v => [fmt(v),'Montant']} contentStyle={{ background:'var(--surface2)', border:'1px solid var(--border2)', borderRadius:8, fontSize:13 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display:'flex', flexDirection:'column', gap:6, marginTop:8 }}>
                  {pieData.slice(0,5).map((d,i) => (
                    <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                        <span style={{ width:7, height:7, borderRadius:'50%', background:d.color, display:'inline-block', flexShrink:0 }} />
                        <span style={{ fontSize:12, color:'var(--text2)' }}>{d.name}</span>
                      </div>
                      <span style={{ fontSize:12, fontWeight:700, color:'var(--text)', fontFamily:'JetBrains Mono,monospace' }}>{fmt(d.value)}</span>
                    </div>
                  ))}
                </div>
              </>
          }
        </div>
      </div>

      {!loading && dashboard && (
        <div style={{ display:'flex', gap:12, marginBottom:16, flexWrap:'wrap' }}>
          <div className="card" style={{ flex:'1 1 180px', padding:'16px 20px', borderLeft:'2px solid #7c6cfc' }}>
            <div style={{ fontSize:11, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.04em', marginBottom:6 }}>Taux d'épargne</div>
            <div style={{ fontSize:22, fontWeight:800, color:(dashboard.savings_rate??0)>=20?'#22d3a0':'#f59e0b', fontFamily:'JetBrains Mono,monospace', marginBottom:4 }}>{fmtPct(dashboard.savings_rate)}</div>
            <div style={{ fontSize:12, color:'var(--text3)' }}>{(dashboard.savings_rate??0)>=20?'✓ Objectif atteint':'Objectif : 20%'}</div>
          </div>
          <div className="card" style={{ flex:'1 1 180px', padding:'16px 20px' }}>
            <div style={{ fontSize:11, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.04em', marginBottom:6 }}>Ratio dép./rev.</div>
            <div style={{ fontSize:22, fontWeight:800, color:'var(--text)', fontFamily:'JetBrains Mono,monospace', marginBottom:4 }}>{fmtPct(dashboard.expense_ratio)}</div>
            <div style={{ fontSize:12, color:'var(--text3)' }}>Idéal &lt; 80%</div>
          </div>
        </div>
      )}

      <div className="card" style={{ padding:24, marginBottom:16 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:'var(--text)' }}>Tendance financière</div>
            <div style={{ fontSize:13, color:'var(--text2)', marginTop:2 }}>Évolution revenus vs dépenses</div>
          </div>
        </div>
        {loading ? <Sk h={180} /> : monthly.length === 0
          ? <div style={{ height:180, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text3)', fontSize:14 }}>Pas encore de données</div>
          : <ResponsiveContainer width="100%" height={180}>
              <LineChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill:'var(--text3)', fontSize:12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill:'var(--text3)', fontSize:11 }} axisLine={false} tickLine={false} tickFormatter={fmtAxis} />
                <Tooltip content={<ChartTooltip />} />
                <Legend iconType="circle" iconSize={7} formatter={v => <span style={{ fontSize:12, color:'var(--text2)' }}>{v}</span>} />
                <Line type="monotone" dataKey="income"   stroke="#7c6cfc" strokeWidth={2.5} dot={{ r:4, fill:'#7c6cfc', strokeWidth:0 }} name="Revenus"  activeDot={{ r:6 }} />
                <Line type="monotone" dataKey="expenses" stroke="#f5476a" strokeWidth={2.5} dot={{ r:4, fill:'#f5476a', strokeWidth:0 }} name="Dépenses" activeDot={{ r:6 }} />
              </LineChart>
            </ResponsiveContainer>
        }
      </div>

      <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
        {[
          { label:'Analytics', to:'/analytics', icon:'∿', color:'#7c6cfc', sub:'Tendances & projections' },
          { label:'Insights',  to:'/insights',  icon:'💡', color:'#38bdf8', sub:'Alertes & conseils'     },
          { label:'Rapports',  to:'/reports',   icon:'📄', color:'#22d3a0', sub:'Export CSV / PDF'       },
          { label:'Budgets',   to:'/budgets',   icon:'◎',  color:'#f59e0b', sub:'Périodes & limites'     },
        ].map((item,i) => (
          <button key={i} onClick={() => navigate(item.to)} style={{
            flex:'1 1 140px', padding:'14px 16px', borderRadius:12,
            background:'var(--surface2)', border:'1px solid var(--border)',
            cursor:'pointer', fontFamily:'inherit', textAlign:'left', transition:'all .18s',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor=item.color+'44'; e.currentTarget.style.background=item.color+'0a' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.background='var(--surface2)' }}
          >
            <div style={{ fontSize:20, marginBottom:8 }}>{item.icon}</div>
            <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', marginBottom:3 }}>{item.label}</div>
            <div style={{ fontSize:11, color:'var(--text3)' }}>{item.sub}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────────────────────
export default function Dashboard() {
  const { user }  = useAuth()
  const isMobile  = useIsMobile()

  const [dashboard, setDashboard] = useState(null)
  const [monthly,   setMonthly]   = useState([])
  const [catExp,    setCatExp]    = useState([])
  const [insights,  setInsights]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)

  useEffect(() => {
    if (!user?.id) return
    let active = true
    setLoading(true)
    Promise.all([
      offlineAnalyticsAPI.dashboard(user.id),
      offlineAnalyticsAPI.monthlyExpenses(user.id, 6),
      offlineAnalyticsAPI.categoryExpenses(user.id),
      offlineAnalyticsAPI.insights(user.id),
    ])
    .then(([dash, mon, cat, ins]) => {
      if (!active) return
      // dashboard: objet direct { total_income, balance, ... }
      setDashboard(dash ?? null)
      // monthly: { data: [...], metrics: {...} } ou tableau direct
      setMonthly(Array.isArray(mon) ? mon : (mon?.data ?? []))
      // categoryExpenses: { data: [...] } ou tableau direct
      setCatExp(Array.isArray(cat) ? cat : (cat?.data ?? []))
      // insights: { insights: [...] }
      setInsights((ins?.insights ?? []).slice(0, 3))
    })
    .catch(e => { if (active) setError(e.message) })
    .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [user?.id])

  const pieData = catExp.map((c, i) => ({
    name:  c.category?.name ?? c.name ?? `Cat ${i+1}`,
    value: c.amount ?? c.total ?? 0,
    color: c.category?.color ?? c.color ?? `hsl(${i*47},65%,55%)`,
  }))

  const props = { dashboard, monthly, catExp, insights, loading, error: error, pieData }
  return isMobile ? <MobileDashboard {...props} /> : <DesktopDashboard {...props} />
}
