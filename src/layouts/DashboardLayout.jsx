import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

const NAV = [
  { to:'/dashboard', label:'Dashboard', icon:<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg> },
  { to:'/transactions', label:'Transactions', icon:<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="12" y2="16"/></svg> },
  { to:'/budgets', label:'Budgets', icon:<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/></svg> },
  { to:'/analytics', label:'Analytics', icon:<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
  { to:'/categories', label:'Categories', icon:<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><circle cx="7" cy="7" r="1.5" fill="currentColor" stroke="none"/></svg> },
]

function Sidebar({ mobile, onClose }) {
  const { user, logout } = useAuth()
  const { info } = useToast()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    info('Logged out successfully')
    navigate('/login')
    onClose?.()
  }

  const initials = user?.name ? user.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase() : '??'

  return (
    <div style={{
      width:220, height:'100vh', background:'var(--surface)', borderRight:'1px solid var(--border)',
      display:'flex', flexDirection:'column', padding:'0', position:'sticky', top:0,
      ...(mobile ? { position:'fixed', top:0, left:0, zIndex:201, width:240, boxShadow:'20px 0 60px rgba(0,0,0,.5)' } : {})
    }}>
      {/* Logo */}
      <div style={{ padding:'22px 18px 18px', borderBottom:'1px solid var(--border)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{
            width:34, height:34, borderRadius:10, flexShrink:0,
            background:'linear-gradient(135deg,#7c6cfc,#5b4de8)',
            display:'flex', alignItems:'center', justifyContent:'center'
          }}>
            <svg width="16" height="16" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
              <line x1="12" y1="1" x2="12" y2="23"/>
              <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize:14, fontWeight:800, color:'var(--text)', letterSpacing:'-.02em' }}>SmartFinance</div>
            <div style={{ fontSize:11, color:'var(--text3)', fontWeight:500 }}>Manager</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding:'12px 10px', flex:1 }}>
        {NAV.map(item => (
          <NavLink key={item.to} to={item.to} onClick={onClose}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            style={{ marginBottom:2 }}>
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div style={{ padding:'12px 10px', borderTop:'1px solid var(--border)' }}>
        <div style={{
          display:'flex', alignItems:'center', gap:10, padding:'10px 12px',
          borderRadius:12, background:'var(--surface2)', border:'1px solid var(--border)'
        }}>
          <div style={{
            width:32, height:32, borderRadius:9, background:'linear-gradient(135deg,#7c6cfc,#5b4de8)',
            display:'flex', alignItems:'center', justifyContent:'center', color:'white',
            fontSize:12, fontWeight:700, flexShrink:0
          }}>{initials}</div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{user?.name || 'User'}</div>
            <div style={{ fontSize:11, color:'var(--text3)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{user?.email || ''}</div>
          </div>
          <button className="btn btn-ghost btn-sm" style={{ padding:'5px 8px', border:'none' }} onClick={handleLogout} title="Logout">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

function Topbar({ onMenuClick }) {
  return (
    <div style={{
      height:58, background:'var(--surface)', borderBottom:'1px solid var(--border)',
      display:'flex', alignItems:'center', padding:'0 20px', gap:12,
      position:'sticky', top:0, zIndex:50
    }}>
      <button className="btn btn-ghost" style={{ padding:'7px', border:'none', background:'transparent' }} onClick={onMenuClick}>
        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>
      <div style={{ flex:1 }} />
      <div style={{ fontSize:12, color:'var(--text3)', fontFamily:'JetBrains Mono, monospace' }}>
        {new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}
      </div>
    </div>
  )
}

export default function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  return (
    <div style={{ display:'flex', minHeight:'100vh' }}>
      {/* Desktop sidebar */}
      <div className="hidden md:block" style={{ flexShrink:0 }}>
        <Sidebar />
      </div>
      {/* Mobile sidebar */}
      {mobileOpen && (
        <div style={{ position:'fixed', inset:0, zIndex:200 }}>
          <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,.5)' }} onClick={()=>setMobileOpen(false)} />
          <Sidebar mobile onClose={()=>setMobileOpen(false)} />
        </div>
      )}
      {/* Main */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0, overflow:'hidden' }}>
        <div className="md:hidden"><Topbar onMenuClick={()=>setMobileOpen(true)} /></div>
        <main style={{ flex:1, overflowY:'auto', overflowX:'hidden' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
