import { useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import logo from '../assets/logo_1.png'

// Bottom nav items — 5 max for thumb reach
const BOTTOM_NAV = [
  { to: '/dashboard',    label: 'Accueil',       icon: (active) => (
    <svg width="22" height="22" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
      <rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>
    </svg>
  )},
  { to: '/transactions', label: 'Transactions',  icon: (active) => (
    <svg width="22" height="22" fill={active ? 'none' : 'none'} stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
      <rect x="9" y="3" width="6" height="4" rx="1"/>
      <line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="12" y2="16"/>
    </svg>
  )},
  { to: '/budgets',      label: 'Budgets',       icon: (active) => (
    <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>
    </svg>
  )},
  { to: '/analytics',   label: 'Analytics',     icon: (active) => (
    <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  )},
  { to: '/more',         label: 'Plus',          icon: (active) => (
    <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <circle cx="12" cy="5" r="1.5" fill="currentColor" stroke="none"/>
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/>
      <circle cx="12" cy="19" r="1.5" fill="currentColor" stroke="none"/>
    </svg>
  )},
]

// Drawer "Plus" items
const MORE_NAV = [
  { to: '/insights',   label: 'Insights',   icon: '💡', sub: 'Alertes & conseils'     },
  { to: '/reports',    label: 'Rapports',   icon: '📄', sub: 'Export CSV / PDF'       },
  { to: '/categories', label: 'Catégories', icon: '🏷️', sub: 'Organiser vos dépenses' },
]

function MobileHeader({ onMenuOpen }) {
  const { user } = useAuth()
  const initials = user?.name ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '??'

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: 'rgba(17,17,24,0.92)',
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center',
      padding: '0 16px', height: 56,
      gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
        <img src={logo} alt="SmartFinance" style={{ width: 28, height: 28, borderRadius: 8, objectFit: 'contain' }} />
        <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', letterSpacing: '-.02em' }}>SmartFinance</span>
      </div>
      <button
        onClick={onMenuOpen}
        style={{
          width: 36, height: 36, borderRadius: 10, border: '1px solid var(--border)',
          background: 'var(--surface2)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', cursor: 'pointer',
        }}
        aria-label="Menu profil"
      >
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: 'linear-gradient(135deg,#7c6cfc,#5b4de8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontSize: 11, fontWeight: 700
        }}>{initials}</div>
      </button>
    </header>
  )
}

function BottomNav() {
  const location = useLocation()
  const isMoreActive = ['/insights', '/reports', '/categories'].some(p => location.pathname === p)

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: 'rgba(17,17,24,0.96)',
      backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
      borderTop: '1px solid var(--border)',
      display: 'flex', alignItems: 'stretch',
      height: 64, paddingBottom: 'env(safe-area-inset-bottom)',
      zIndex: 100,
    }}>
      {BOTTOM_NAV.map(item => {
        const isActive = item.to === '/more'
          ? isMoreActive
          : location.pathname === item.to || (item.to !== '/dashboard' && location.pathname.startsWith(item.to))
        return (
          <NavLink
            key={item.to}
            to={item.to}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, textDecoration: 'none', color: isActive ? 'var(--accent2)' : 'var(--text3)', transition: 'color .15s', padding: '6px 4px' }}
          >
            <div style={{ position: 'relative' }}>
              {item.icon(isActive)}
              {isActive && (
                <div style={{
                  position: 'absolute', bottom: -6, left: '50%', transform: 'translateX(-50%)',
                  width: 4, height: 4, borderRadius: '50%', background: 'var(--accent)',
                }} />
              )}
            </div>
            <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 500, letterSpacing: '.01em' }}>
              {item.label}
            </span>
          </NavLink>
        )
      })}
    </nav>
  )
}

function ProfileDrawer({ onClose }) {
  const { user, logout } = useAuth()
  const { info } = useToast()
  const navigate = useNavigate()
  const initials = user?.name ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '??'

  const handleLogout = () => {
    logout()
    info('Déconnexion réussie')
    navigate('/login')
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300 }} onClick={onClose}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(8px)' }} />
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: 'var(--surface)', borderRadius: '20px 20px 0 0',
          padding: '20px 20px 40px',
          animation: 'slideUp .3s cubic-bezier(.34,1.56,.64,1)',
        }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border2)', margin: '0 auto 24px' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28, padding: '16px', background: 'var(--surface2)', borderRadius: 14 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: 'linear-gradient(135deg,#7c6cfc,#5b4de8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: 18, fontWeight: 700
          }}>{initials}</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{user?.name || 'Utilisateur'}</div>
            <div style={{ fontSize: 13, color: 'var(--text2)' }}>{user?.email || ''}</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 20 }}>
          {MORE_NAV.map(item => (
            <button key={item.to} onClick={() => { navigate(item.to); onClose() }} style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
              background: 'transparent', border: 'none', borderRadius: 12,
              cursor: 'pointer', width: '100%', textAlign: 'left',
              transition: 'background .15s',
            }}
              onTouchStart={e => e.currentTarget.style.background = 'var(--surface2)'}
              onTouchEnd={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ fontSize: 24, width: 36, textAlign: 'center' }}>{item.icon}</span>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{item.label}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 1 }}>{item.sub}</div>
              </div>
              <svg style={{ marginLeft: 'auto', color: 'var(--text3)' }} width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          ))}
        </div>

        <div style={{ height: 1, background: 'var(--border)', marginBottom: 16 }} />
        <button onClick={handleLogout} className="btn btn-danger" style={{ width: '100%', justifyContent: 'center', padding: '14px' }}>
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Se déconnecter
        </button>
      </div>
    </div>
  )
}

export default function MobileLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', minHeight: '100dvh' }}>
      <MobileHeader onMenuOpen={() => setDrawerOpen(true)} />
      <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingBottom: 80 }}>
        <Outlet />
      </main>
      <BottomNav />
      {drawerOpen && <ProfileDrawer onClose={() => setDrawerOpen(false)} />}
    </div>
  )
}
