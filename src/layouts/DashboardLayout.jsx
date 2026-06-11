import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useIsMobile } from '../hooks/useIsMobile'
import { useTheme } from '../context/ThemeContext'
import MobileLayout from './MobileLayout'
import logo from '../assets/logo_1.png'

const NAV = [
  { to:'/dashboard',    label:'Dashboard',    icon:<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg> },
  { to:'/transactions', label:'Transactions', icon:<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="12" y2="16"/></svg> },
  { to:'/budgets',      label:'Budgets',      icon:<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/></svg> },
  { to:'/analytics',   label:'Analytics',   icon:<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
  { to:'/insights',    label:'Insights',    icon:<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> },
  { to:'/reports',     label:'Reports',     icon:<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> },
  { to:'/categories',  label:'Categories',  icon:<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><circle cx="7" cy="7" r="1.5" fill="currentColor" stroke="none"/></svg> },
]

function Sidebar({ mobile, onClose }) {
  const { user, logout } = useAuth()
  const { info } = useToast()
  const navigate = useNavigate()
  const { toggle, isDark } = useTheme()

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
      <div style={{ padding:'22px 18px 18px', borderBottom:'1px solid var(--border)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <img src={logo} alt="logo" style={{ width:40, height:40, borderRadius:12, objectFit:'contain' }} />
          <div>
            <div style={{ fontSize:14, fontWeight:800, color:'var(--text)', letterSpacing:'-.02em' }}>SmartFinance</div>
            <div style={{ fontSize:11, color:'var(--text3)', fontWeight:500 }}>Manager</div>
          </div>
        </div>
      </div>
      <nav style={{ padding:'12px 10px', flex:1, overflowY:'auto' }}>
        {NAV.map(item => (
          <NavLink key={item.to} to={item.to} onClick={onClose}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            style={{ marginBottom:2 }}>
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>
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
          <button onClick={toggle} title={isDark?'Mode jour':'Mode nuit'} style={{ padding:'5px 8px', background:'none', border:'none', cursor:'pointer', fontSize:14, borderRadius:7 }}>
            {isDark ? '☀️' : '🌙'}
          </button>
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

function DesktopLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  return (
    <div style={{ display:'flex', minHeight:'100vh' }}>
      <div style={{ flexShrink:0 }}>
        <Sidebar />
      </div>
      <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0, overflow:'hidden' }}>
        <main style={{ flex:1, overflowY:'auto', overflowX:'hidden' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default function DashboardLayout() {
  const isMobile = useIsMobile(768)
  return isMobile ? <MobileLayout /> : <DesktopLayout />
}
