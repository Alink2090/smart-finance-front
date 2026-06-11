import { useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useBreakpoint } from '../hooks/useBreakpoint'
import logo from '../assets/logo_1.png'

const NAV_ICONS = {
  dashboard: (
    <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
      <rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>
    </svg>
  ),
  transactions: (
    <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
      <rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="12" y2="16"/>
    </svg>
  ),
  budgets: (
    <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>
    </svg>
  ),
  analytics: (
    <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  ),
  insights: (
    <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
  reports: (
    <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  ),
  categories: (
    <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
      <circle cx="7" cy="7" r="1.5" fill="currentColor" stroke="none"/>
    </svg>
  ),
}

// Desktop sidebar nav items
const NAV = [
  { to: '/dashboard',    label: 'Dashboard',    icon: NAV_ICONS.dashboard },
  { to: '/transactions', label: 'Transactions', icon: NAV_ICONS.transactions },
  { to: '/budgets',      label: 'Budgets',      icon: NAV_ICONS.budgets },
  { to: '/analytics',   label: 'Analytics',    icon: NAV_ICONS.analytics },
  { to: '/insights',    label: 'Insights',     icon: NAV_ICONS.insights },
  { to: '/reports',     label: 'Rapports',     icon: NAV_ICONS.reports },
  { to: '/categories',  label: 'Catégories',   icon: NAV_ICONS.categories },
]

// Mobile bottom bar — 4 primary + "More"
const MOBILE_NAV_PRIMARY = [
  { to: '/dashboard',    label: 'Accueil',  icon: NAV_ICONS.dashboard },
  { to: '/transactions', label: 'Opérations', icon: NAV_ICONS.transactions },
  { to: '/budgets',      label: 'Budgets',  icon: NAV_ICONS.budgets },
  { to: '/analytics',   label: 'Analyse',  icon: NAV_ICONS.analytics },
]

// Extra items in the "More" sheet
const MOBILE_NAV_MORE = [
  { to: '/insights',   label: 'Insights',    icon: '💡', color: '#38bdf8', bg: 'rgba(56,189,248,.12)' },
  { to: '/reports',    label: 'Rapports',    icon: '📄', color: '#22d3a0', bg: 'rgba(34,211,160,.12)' },
  { to: '/categories', label: 'Catégories',  icon: '🏷️', color: '#f59e0b', bg: 'rgba(245,158,11,.12)'  },
]

/* ── Desktop Sidebar ───────────────────────────────────────────────────────── */
function Sidebar({ mobile, onClose }) {
  const { user, logout } = useAuth()
  const { info } = useToast()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    info('Déconnexion réussie')
    navigate('/login')
    onClose?.()
  }

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '??'

  return (
    <div style={{
      width: 220, height: '100vh', background: 'var(--surface)', borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', position: 'sticky', top: 0,
      ...(mobile ? { position: 'fixed', top: 0, left: 0, zIndex: 201, width: 260, boxShadow: '20px 0 60px rgba(0,0,0,.5)' } : {}),
    }}>
      {/* Logo */}
      <div style={{ padding: '22px 18px 18px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#7c6cfc,#5b4de8)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <img src={logo} alt="logo" style={{ width: 40, height: 40, borderRadius: 12, objectFit: 'contain' }} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', letterSpacing: '-.02em' }}>SmartFinance</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500 }}>Manager</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: '12px 10px', flex: 1, overflowY: 'auto' }}>
        {NAV.map(item => (
          <NavLink key={item.to} to={item.to} onClick={onClose}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            style={{ marginBottom: 2 }}>
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div style={{ padding: '12px 10px', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, background: 'var(--surface2)', border: '1px solid var(--border)' }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg,#7c6cfc,#5b4de8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name || 'Utilisateur'}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email || ''}</div>
          </div>
          <button className="btn btn-ghost btn-sm" style={{ padding: '5px 8px', border: 'none' }} onClick={handleLogout} title="Déconnexion">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Mobile Header ─────────────────────────────────────────────────────────── */
function MobileHeader({ onMenuClick }) {
  const { user } = useAuth()
  const location = useLocation()

  const PAGE_TITLES = {
    '/dashboard':    'Accueil',
    '/transactions': 'Opérations',
    '/budgets':      'Budgets',
    '/analytics':    'Analyse',
    '/insights':     'Insights',
    '/reports':      'Rapports',
    '/categories':   'Catégories',
  }

  const title = PAGE_TITLES[location.pathname] || 'SmartFinance'
  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '??'

  return (
    <div className="mobile-header">
      <div className="mobile-header-logo">
        <div className="mobile-header-logo-mark">
          <img src={logo} alt="logo" style={{ width: 32, height: 32, objectFit: 'contain', borderRadius: 10 }} />
        </div>
        <span className="mobile-header-title">{title}</span>
      </div>
      <button className="mobile-header-action" onClick={onMenuClick} aria-label="Menu utilisateur">
        <div style={{ width: 28, height: 28, borderRadius: 9, background: 'linear-gradient(135deg,#7c6cfc,#5b4de8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 11, fontWeight: 700 }}>
          {initials}
        </div>
      </button>
    </div>
  )
}

/* ── Mobile Bottom Navigation ──────────────────────────────────────────────── */
function MobileBottomNav({ onMoreClick, moreActive }) {
  const location = useLocation()
  const moreRoutes = MOBILE_NAV_MORE.map(i => i.to)
  const isMoreActive = moreRoutes.includes(location.pathname) || moreActive

  return (
    <nav className="mobile-bottom-nav" role="navigation" aria-label="Navigation principale">
      {MOBILE_NAV_PRIMARY.map(item => {
        const isActive = location.pathname === item.to
        return (
          <NavLink key={item.to} to={item.to}
            className={`mobile-nav-item${isActive ? ' active' : ''}`}
            aria-label={item.label}
            aria-current={isActive ? 'page' : undefined}>
            <div className="mobile-nav-icon-wrap">
              <div className="mobile-nav-pill" />
              {item.icon}
            </div>
            <span className="mobile-nav-label">{item.label}</span>
          </NavLink>
        )
      })}
      {/* More button */}
      <button
        className={`mobile-nav-item${isMoreActive ? ' active' : ''}`}
        onClick={onMoreClick}
        aria-label="Plus d'options"
        aria-expanded={moreActive}>
        <div className="mobile-nav-icon-wrap">
          <div className="mobile-nav-pill" />
          <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none"/>
            <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/>
            <circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none"/>
          </svg>
        </div>
        <span className="mobile-nav-label">Plus</span>
      </button>
    </nav>
  )
}

/* ── Mobile "More" Bottom Sheet ────────────────────────────────────────────── */
function MobileMoreSheet({ onClose }) {
  const { user, logout } = useAuth()
  const { info } = useToast()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    info('Déconnexion réussie')
    navigate('/login')
    onClose()
  }

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '??'

  return (
    <div className="mobile-more-sheet">
      <div className="mobile-more-backdrop" onClick={onClose} />
      <div className="mobile-more-panel">
        <div className="mobile-more-handle" />

        {/* User info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 4px 16px', borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg,#7c6cfc,#5b4de8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 16, fontWeight: 700, flexShrink: 0 }}>{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{user?.name || 'Utilisateur'}</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email || ''}</div>
          </div>
        </div>

        <div className="mobile-more-grid">
          {MOBILE_NAV_MORE.map(item => (
            <NavLink key={item.to} to={item.to} className="mobile-more-item" onClick={onClose}>
              <div className="mobile-more-item-icon" style={{ background: item.bg }}>
                <span>{item.icon}</span>
              </div>
              <span className="mobile-more-item-label">{item.label}</span>
            </NavLink>
          ))}

          {/* Logout cell */}
          <button className="mobile-more-item" onClick={handleLogout} style={{ background: 'rgba(245,71,106,.06)', borderColor: 'rgba(245,71,106,.12)' }}>
            <div className="mobile-more-item-icon" style={{ background: 'rgba(245,71,106,.12)' }}>
              <svg width="18" height="18" fill="none" stroke="#f5476a" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </div>
            <span className="mobile-more-item-label" style={{ color: 'var(--red)' }}>Déconnexion</span>
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Desktop Topbar (mobile drawer trigger) ────────────────────────────────── */
function Topbar({ onMenuClick }) {
  return (
    <div style={{ height: 58, background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 20px', gap: 12, position: 'sticky', top: 0, zIndex: 50 }}>
      <button className="btn btn-ghost" style={{ padding: '7px', border: 'none', background: 'transparent' }} onClick={onMenuClick}>
        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>
      <div style={{ flex: 1 }} />
      <div style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace' }}>
        {new Date().toLocaleDateString('fr-FR', { month: 'short', day: 'numeric', year: 'numeric' })}
      </div>
    </div>
  )
}

/* ── Root Layout ───────────────────────────────────────────────────────────── */
export default function DashboardLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const { isMobile } = useBreakpoint()

  // ── Mobile layout ──────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div className="mobile-shell">
        <MobileHeader onMenuClick={() => setMoreOpen(true)} />

        <main className="mobile-main" id="mobile-main-scroll">
          <Outlet />
        </main>

        <MobileBottomNav
          onMoreClick={() => setMoreOpen(v => !v)}
          moreActive={moreOpen}
        />

        {moreOpen && <MobileMoreSheet onClose={() => setMoreOpen(false)} />}
      </div>
    )
  }

  // ── Desktop layout ─────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Desktop sidebar — always visible */}
      <div style={{ flexShrink: 0 }}>
        <Sidebar />
      </div>

      {/* Mobile overlay drawer (tablet hamburger) */}
      {drawerOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.5)' }} onClick={() => setDrawerOpen(false)} />
          <Sidebar mobile onClose={() => setDrawerOpen(false)} />
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
