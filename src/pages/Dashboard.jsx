import { useEffect, useState } from 'react'
import { analyticsAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

const fmt = n => new Intl.NumberFormat('en-US', { style:'currency', currency:'USD', minimumFractionDigits:0 }).format(n ?? 0)
const fmtPct = n => `${(n ?? 0).toFixed(1)}%`

function Sk({ w='100%', h=16, r=6 }) {
  return <div className="skeleton" style={{ width:w, height:h, borderRadius:r }} />
}

function StatCard({ label, value, sub, color, icon, loading }) {
  return (
    <div className="card" style={{
      padding:22, flex:'1 1 180px', minWidth:170,
      borderLeft:`2px solid ${color}`, position:'relative', overflow:'hidden'
    }}>
      <div style={{ position:'absolute', top:16, right:16, fontSize:22, opacity:.15 }}>{icon}</div>
      {loading ? <>
        <Sk w={48} h={48} r={12} /><div style={{height:8}}/><Sk w="60%" /><div style={{height:6}}/><Sk w="40%" h={24} />
      </> : <>
        <div style={{ fontSize:12, fontWeight:600, color:'var(--text2)', textTransform:'uppercase', letterSpacing:'.04em', marginBottom:8 }}>{label}</div>
        <div style={{ fontSize:28, fontWeight:800, color:'var(--text)', letterSpacing:'-.03em', lineHeight:1 }}>{value}</div>
        {sub && <div style={{ fontSize:12, color:'var(--text3)', marginTop:6 }}>{sub}</div>}
      </>}
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:'var(--surface2)', border:'1px solid var(--border2)', borderRadius:10, padding:'10px 14px', fontSize:13 }}>
      <div style={{ fontWeight:700, color:'var(--text)', marginBottom:6 }}>{label}</div>
      {payload.map((p, i) => <div key={i} style={{ color:p.color, fontWeight:500 }}>{p.name}: {fmt(p.value)}</div>)}
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [monthly, setMonthly] = useState([])
  const [catExp, setCatExp] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    setLoading(true)

    Promise.all([
      analyticsAPI.dashboard(user.id),
      analyticsAPI.monthlyExpenses(user.id),
      analyticsAPI.categoryExpenses(user.id),
    ])
    .then(([d, m, c]) => {
      if (!active) return

      setStats(d?.data ?? d)

      const mArr = Array.isArray(m) ? m : (m?.data ?? [])
      setMonthly(mArr)

      const cArr = Array.isArray(c) ? c : (c?.data ?? [])
      setCatExp(cArr)
    })
    .catch(e => {
      if (active) setError(e.message)
    })
    .finally(() => {
      if (active) setLoading(false)
    })

    return () => { active = false }

  }, [])

  const totalExpPie = catExp.reduce((s, c) => s + (c.amount ?? c.total ?? 0), 0)

  return (
    <div className="fade-up" style={{ padding:24 }}>
      {/* Header */}
      <div className="page-header">
        <div style={{ fontSize:13, color:'var(--text3)', marginBottom:4 }}>
          {new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' })}
        </div>
        <div className="page-title">
          Hey, {user?.name?.split(' ')[0] ?? 'there'} 👋
        </div>
        <div className="page-subtitle">Here's your financial overview</div>
      </div>

      {error && <div className="error-box" style={{ marginBottom:20 }}>{error}</div>}

      {/* Stat cards */}
      <div style={{ display:'flex', gap:14, marginBottom:20, flexWrap:'wrap' }}>
        <StatCard label="Total Income" value={loading ? '—' : fmt(stats?.total_income)} color="var(--green)" icon="↑" loading={loading} sub="This period" />
        <StatCard label="Total Expenses" value={loading ? '—' : fmt(stats?.total_expenses)} color="var(--red)" icon="↓" loading={loading} sub="This period" />
        <StatCard label="Net Balance" value={loading ? '—' : fmt(stats?.balance)} color="var(--accent2)" icon="⬡" loading={loading} sub="Income - Expenses" />
        <StatCard label="Budget Used" value={loading ? '—' : fmtPct(stats?.budget_usage_percent)} color="var(--amber)" icon="◎" loading={loading} sub="Of monthly budget" />
      </div>

      {/* Charts row */}
      <div style={{ display:'flex', gap:16, marginBottom:16, flexWrap:'wrap' }}>
        {/* Monthly bar chart */}
        <div className="card" style={{ flex:'2 1 380px', padding:24 }}>
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:15, fontWeight:700, color:'var(--text)' }}>Monthly Overview</div>
            <div style={{ fontSize:13, color:'var(--text2)', marginTop:2 }}>Income vs Expenses</div>
          </div>
          {loading ? <Sk h={220} /> : monthly.length === 0 ? (
            <div style={{ height:220, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text3)', fontSize:14 }}>No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthly} barSize={14} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill:'var(--text3)', fontSize:12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill:'var(--text3)', fontSize:11 }} axisLine={false} tickLine={false} tickFormatter={v=>`$${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={7} formatter={v=><span style={{fontSize:12,color:'var(--text2)'}}>{v}</span>} />
                <Bar dataKey="income" fill="#7c6cfc" name="Income" radius={[4,4,0,0]} />
                <Bar dataKey="expenses" fill="#f5476a" name="Expenses" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Category pie */}
        <div className="card" style={{ flex:'1 1 260px', padding:24 }}>
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:15, fontWeight:700, color:'var(--text)' }}>By Category</div>
            <div style={{ fontSize:13, color:'var(--text2)', marginTop:2 }}>Spending breakdown</div>
          </div>
          {loading ? <Sk h={160} /> : catExp.length === 0 ? (
            <div style={{ height:160, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text3)', fontSize:14 }}>No data</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={catExp.map(c=>({ name:c.category?.name??c.category??c.name, value:c.amount??c.total??0 }))}
                    cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2} dataKey="value">
                    {catExp.map((c, i) => <Cell key={i} fill={c.category?.color ?? c.color ?? `hsl(${i*47},65%,55%)`} />)}
                  </Pie>
                  <Tooltip formatter={v=>[fmt(v),'Amount']} contentStyle={{ background:'var(--surface2)',border:'1px solid var(--border2)',borderRadius:8,fontSize:13 }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display:'flex', flexDirection:'column', gap:6, marginTop:8 }}>
                {catExp.slice(0,5).map((c, i) => {
                  const name = c.category?.name ?? c.category ?? c.name ?? '—'
                  const color = c.category?.color ?? c.color ?? `hsl(${i*47},65%,55%)`
                  const amt = c.amount ?? c.total ?? 0
                  return (
                    <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                        <span style={{ width:7, height:7, borderRadius:'50%', background:color, display:'inline-block', flexShrink:0 }} />
                        <span style={{ fontSize:12, color:'var(--text2)' }}>{name}</span>
                      </div>
                      <span style={{ fontSize:12, fontWeight:700, color:'var(--text)', fontFamily:'JetBrains Mono,monospace' }}>{fmt(amt)}</span>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Line trend */}
      <div className="card" style={{ padding:24 }}>
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:15, fontWeight:700, color:'var(--text)' }}>Financial Trend</div>
          <div style={{ fontSize:13, color:'var(--text2)', marginTop:2 }}>Income vs Expenses over time</div>
        </div>
        {loading ? <Sk h={180} /> : monthly.length === 0 ? (
          <div style={{ height:180, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text3)', fontSize:14 }}>No data yet</div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill:'var(--text3)', fontSize:12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill:'var(--text3)', fontSize:11 }} axisLine={false} tickLine={false} tickFormatter={v=>`$${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={7} formatter={v=><span style={{fontSize:12,color:'var(--text2)'}}>{v}</span>} />
              <Line type="monotone" dataKey="income" stroke="#7c6cfc" strokeWidth={2.5} dot={{ r:4, fill:'#7c6cfc', strokeWidth:0 }} name="Income" activeDot={{ r:6 }} />
              <Line type="monotone" dataKey="expenses" stroke="#f5476a" strokeWidth={2.5} dot={{ r:4, fill:'#f5476a', strokeWidth:0 }} name="Expenses" activeDot={{ r:6 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
