import { ResponsiveContainer } from 'recharts'

const formatXOF = (n, digits = 0) =>
    new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    }).format(Number(n) || 0) + ' FCFA'

const fmt = n => formatXOF(n, 0)

// ── Skeleton ──────────────────────────────────────────────────────────────────
export function Sk({ w='100%', h=16, r=8, style={} }) {
  return <div className="skeleton" style={{ width:w, height:h, borderRadius:r, ...style }}/>
}

// ── StatCard ──────────────────────────────────────────────────────────────────
export function StatCard({ label, value, sub, color, icon, loading, trend, trendLabel, onClick }) {
  const trendUp   = trend > 0
  const trendColor= trend === null || trend === undefined ? 'var(--text3)'
    : trendUp ? '#22d3a0' : '#f5476a'

  return (
    <div
      className="card"
      onClick={onClick}
      style={{
        padding:22, flex:'1 1 170px', minWidth:160, position:'relative', overflow:'hidden',
        borderLeft:`2px solid ${color}`,
        cursor: onClick ? 'pointer' : 'default',
        transition:'transform .18s, box-shadow .18s',
      }}
      onMouseEnter={e => { if(onClick){ e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 8px 24px rgba(0,0,0,.15)' } }}
      onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='' }}
    >
      <div style={{ position:'absolute', top:14, right:14, fontSize:20, opacity:.1 }}>{icon}</div>
      {loading ? (
        <><Sk w={48} h={48} r={12}/><div style={{height:8}}/><Sk w="60%"/><div style={{height:6}}/><Sk w="40%" h={24}/></>
      ) : (
        <>
          <div style={{ fontSize:11, fontWeight:600, color:'var(--text2)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:8 }}>{label}</div>
          <div style={{ fontSize:26, fontWeight:800, color:'var(--text)', letterSpacing:'-.03em', lineHeight:1 }}>{value}</div>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:8 }}>
            {sub && <div style={{ fontSize:12, color:'var(--text3)' }}>{sub}</div>}
            {trend !== null && trend !== undefined && (
              <span style={{ fontSize:11, fontWeight:700, color:trendColor }}>
                {trendUp ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}%
                {trendLabel && <span style={{ color:'var(--text3)', fontWeight:400 }}> {trendLabel}</span>}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ── ChartCard ─────────────────────────────────────────────────────────────────
export function ChartCard({ title, subtitle, children, loading, height=240, action, style={} }) {
  return (
    <div className="card" style={{ padding:24, ...style }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <div style={{ fontSize:15, fontWeight:700, color:'var(--text)' }}>{title}</div>
          {subtitle && <div style={{ fontSize:13, color:'var(--text2)', marginTop:3 }}>{subtitle}</div>}
        </div>
        {action}
      </div>
      {loading
        ? <Sk h={height} r={10}/>
        : children}
    </div>
  )
}

// ── InsightCard ───────────────────────────────────────────────────────────────
const PRIORITY_LABEL = { high:'Critique', medium:'Important', low:'Info' }

export function InsightCard({ insight, showAction=true }) {
  return (
    <div style={{
      display:'flex', alignItems:'flex-start', gap:14,
      padding:'14px 16px',
      background: insight.bg,
      border:`1px solid ${insight.color}28`,
      borderLeft:`3px solid ${insight.color}`,
      borderRadius:12,
      transition:'transform .15s',
    }}
    onMouseEnter={e=>e.currentTarget.style.transform='translateX(3px)'}
    onMouseLeave={e=>e.currentTarget.style.transform=''}
    >
      <span style={{
        flexShrink:0, width:36, height:36, borderRadius:10,
        background:`${insight.color}20`,
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:18,
      }}>{insight.icon}</span>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
          <span style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>{insight.title}</span>
          <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:100, background:`${insight.color}20`, color:insight.color }}>
            {PRIORITY_LABEL[insight.priority]}
          </span>
        </div>
        <div style={{ fontSize:13, color:'var(--text2)', lineHeight:1.5 }}>{insight.message}</div>
        {showAction && insight.action && (
          <div style={{ fontSize:12, color:insight.color, marginTop:6, fontWeight:600 }}>
            → {insight.action}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Badge ─────────────────────────────────────────────────────────────────────
export function Badge({ label, color, bg }) {
  return (
    <span style={{ fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:100, background:bg, color, display:'inline-flex', alignItems:'center' }}>
      {label}
    </span>
  )
}

// ── KPIBadge ──────────────────────────────────────────────────────────────────
export function KPIBadge({ value, label, color }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2, padding:'8px 16px', background:'var(--surface2)', borderRadius:10, border:'1px solid var(--border)' }}>
      <span style={{ fontSize:18, fontWeight:800, color, fontFamily:'JetBrains Mono,monospace' }}>{value}</span>
      <span style={{ fontSize:11, color:'var(--text3)', fontWeight:500, whiteSpace:'nowrap' }}>{label}</span>
    </div>
  )
}

// ── EmptyState ────────────────────────────────────────────────────────────────
export function EmptyState({ icon='📭', title='Aucune donnée', message='', action }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'48px 20px', textAlign:'center' }}>
      <div style={{ fontSize:40, marginBottom:14 }}>{icon}</div>
      <div style={{ fontSize:15, fontWeight:700, color:'var(--text2)', marginBottom:6 }}>{title}</div>
      {message && <div style={{ fontSize:13, color:'var(--text3)', marginBottom:20 }}>{message}</div>}
      {action}
    </div>
  )
}

// ── SectionHeader ─────────────────────────────────────────────────────────────
export function SectionHeader({ title, subtitle, right }) {
  return (
    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20 }}>
      <div>
        <div style={{ fontSize:15, fontWeight:700, color:'var(--text)' }}>{title}</div>
        {subtitle && <div style={{ fontSize:13, color:'var(--text2)', marginTop:3 }}>{subtitle}</div>}
      </div>
      {right}
    </div>
  )
}

// ── PeriodFilter ──────────────────────────────────────────────────────────────
export function PeriodFilter({ value, onChange, options }) {
  return (
    <div style={{ display:'flex', background:'var(--surface2)', borderRadius:9, border:'1px solid var(--border)', overflow:'hidden' }}>
      {options.map(o => (
        <button key={o.value} onClick={()=>onChange(o.value)} style={{
          padding:'7px 14px', border:'none', cursor:'pointer', fontFamily:'inherit',
          fontSize:12, fontWeight:600, transition:'all .15s',
          background: value===o.value ? 'rgba(124,108,252,.2)' : 'transparent',
          color: value===o.value ? 'var(--accent2)' : 'var(--text3)',
        }}>{o.label}</button>
      ))}
    </div>
  )
}

// ── Tooltip personnalisé Recharts ─────────────────────────────────────────────
export function ChartTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:'var(--surface2)', border:'1px solid var(--border2)', borderRadius:10, padding:'10px 14px', fontSize:13, boxShadow:'0 8px 24px rgba(0,0,0,.2)' }}>
      <div style={{ fontWeight:700, color:'var(--text)', marginBottom:6 }}>{label}</div>
      {payload.map((p,i) => (
        <div key={i} style={{ color:p.color??p.fill, fontWeight:500, marginBottom:2 }}>
          {p.name}: {formatter ? formatter(p.value, p.name) : fmt(p.value)}
        </div>
      ))}
    </div>
  )
}

// ── ProgressRow ───────────────────────────────────────────────────────────────
export function ProgressRow({ label, value, max, color, format }) {
  const pct = max > 0 ? Math.min((value/max)*100, 100) : 0
  const display = format ? format(value) : fmt(value)
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ width:8, height:8, borderRadius:'50%', background:color, display:'inline-block', flexShrink:0 }}/>
          <span style={{ fontSize:13, color:'var(--text2)', fontWeight:500 }}>{label}</span>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <span style={{ fontSize:13, fontWeight:700, color:'var(--text)', fontFamily:'JetBrains Mono,monospace' }}>{display}</span>
          <span style={{ fontSize:11, color:'var(--text3)', minWidth:34, textAlign:'right' }}>{pct.toFixed(0)}%</span>
        </div>
      </div>
      <div className="progress" style={{ height:5 }}>
        <div className="progress-fill" style={{ width:`${pct}%`, height:'100%', background:color }}/>
      </div>
    </div>
  )
}
