import { useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useTheme } from '../context/ThemeContext'
import logo from '../assets/logo_1.png'
import OfflineBanner  from '../components/offline/OfflineBanner'
import SyncIndicator  from '../components/offline/SyncIndicator'

// ── Icons ────────────────────────────────────────────────────────────────────
const icons = {
  dashboard: (
    <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <rect x="3" y="3" width="7" height="7" rx="1.5"/>
      <rect x="14" y="3" width="7" height="7" rx="1.5"/>
      <rect x="3" y="14" width="7" height="7" rx="1.5"/>
      <rect x="14" y="14" width="7" height="7" rx="1.5"/>
    </svg>
  ),
  transactions: (
    <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
      <rect x="9" y="3" width="6" height="4" rx="1"/>
      <line x1="9" y1="12" x2="15" y2="12"/>
      <line x1="9" y1="16" x2="12" y2="16"/>
    </svg>
  ),
  budgets: (
    <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
      <path d="M12 6v6l4 2"/>
    </svg>
  ),
  analytics: (
    <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  ),
  categories: (
    <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
      <circle cx="7" cy="7" r="1.5" fill="currentColor" stroke="none"/>
    </svg>
  ),
  more: (
    <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none"/>
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/>
      <circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none"/>
    </svg>
  ),
}

const BOTTOM_NAV = [
  { to: '/dashboard',    label: 'Accueil',      icon: icons.dashboard },
  { to: '/transactions', label: 'Transactions', icon: icons.transactions },
  { to: '/budgets',      label: 'Budgets',      icon: icons.budgets },
  { to: '/categories',  label: 'Catégories',   icon: icons.categories },
  { to: '/more',         label: 'Plus',         icon: icons.more, isDrawer: true },
]

const MORE_ITEMS = [
  { to: '/analytics',   label: 'Analytics',  emoji: '📊', sub: 'Tendances & projections' },
  { to: '/insights',   label: 'Insights',   emoji: '💡', sub: 'Alertes & conseils' },
  { to: '/reports',    label: 'Rapports',   emoji: '📄', sub: 'Export CSV / PDF' },
  { to: '/categories', label: 'Catégories', emoji: '🏷️', sub: 'Gérer les catégories' },
  { to: '/settings',   label: 'Paramètres',  emoji: '⚙️', sub: 'PIN, sync & offline' },
]

// ── Header ───────────────────────────────────────────────────────────────────
function MobileHeader({ onMenuOpen }) {
  const { user } = useAuth()
  const { theme, toggle, isDark } = useTheme()
  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '??'

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: isDark ? 'rgba(10,10,15,0.94)' : 'rgba(240,241,245,0.94)',
      backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
      borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center',
      padding: '0 16px',
      // Safe area top — encoche iPhone
      paddingTop: 'env(safe-area-inset-top, 0px)',
      height: 'calc(56px + env(safe-area-inset-top, 0px))',
      gap: 10,
    }}>
      <img src={logo} alt="SmartFinance"
        style={{ width: 28, height: 28, borderRadius: 8, objectFit: 'contain', flexShrink: 0 }} />
      <span style={{
        fontSize: 16, fontWeight: 800, color: 'var(--text)',
        letterSpacing: '-.03em', flex: 1,
      }}>SmartFinance</span>

      {/* Toggle thème */}
      <button
        onClick={toggle}
        aria-label="Changer le thème"
        style={{
          width: 36, height: 36, borderRadius: 10,
          border: '1px solid var(--border)',
          background: 'var(--surface2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', fontSize: 16, flexShrink: 0,
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {isDark ? '☀️' : '🌙'}
      </button>

      {/* Avatar / menu profil */}
      <button
        onClick={onMenuOpen}
        aria-label="Menu profil"
        style={{
          width: 36, height: 36, borderRadius: 10,
          border: '1px solid var(--border)',
          background: 'linear-gradient(135deg,#7c6cfc,#5b4de8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: 'white', fontSize: 12, fontWeight: 700,
          flexShrink: 0, WebkitTapHighlightColor: 'transparent',
        }}
      >
        {initials}
      </button>
    </header>
  )
}

// ── Bottom Nav ────────────────────────────────────────────────────────────────
function BottomNav({ onMoreOpen }) {
  const location = useLocation()
  const { isDark } = useTheme()

  const isMoreActive = MORE_ITEMS.some(i => location.pathname === i.to)

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: isDark ? 'rgba(10,10,15,0.96)' : 'rgba(240,241,245,0.96)',
      backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
      borderTop: '1px solid var(--border)',
      display: 'flex', alignItems: 'stretch',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      height: 'calc(60px + env(safe-area-inset-bottom, 0px))',
      zIndex: 100,
    }}>
      {BOTTOM_NAV.map(item => {
        // Calcul isActive propre pour chaque onglet
        let isActive = false
        if (item.isDrawer) {
          isActive = isMoreActive
        } else if (item.to === '/dashboard') {
          isActive = location.pathname === '/dashboard' || location.pathname === '/'
        } else {
          isActive = location.pathname === item.to
        }

        // Le bouton "Plus" ouvre le drawer — pas NavLink
        if (item.isDrawer) {
          return (
            <button
              key={item.to}
              onClick={onMoreOpen}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 3, background: 'none', border: 'none', cursor: 'pointer',
                color: isActive ? 'var(--accent)' : 'var(--text3)',
                padding: '6px 4px', transition: 'color .15s',
                WebkitTapHighlightColor: 'transparent', fontFamily: 'inherit',
              }}
            >
              <span style={{ position: 'relative' }}>
                {item.icon}
                {isActive && (
                  <span style={{
                    position: 'absolute', bottom: -5, left: '50%',
                    transform: 'translateX(-50%)',
                    width: 4, height: 4, borderRadius: '50%',
                    background: 'var(--accent)',
                  }} />
                )}
              </span>
              <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 500 }}>{item.label}</span>
            </button>
          )
        }

        return (
          <NavLink
            key={item.to}
            to={item.to}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 3, textDecoration: 'none',
              color: isActive ? 'var(--accent)' : 'var(--text3)',
              padding: '6px 4px', transition: 'color .15s',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <span style={{ position: 'relative' }}>
              {item.icon}
              {isActive && (
                <span style={{
                  position: 'absolute', bottom: -5, left: '50%',
                  transform: 'translateX(-50%)',
                  width: 4, height: 4, borderRadius: '50%',
                  background: 'var(--accent)',
                }} />
              )}
            </span>
            <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 500 }}>{item.label}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}

// ── More Drawer ───────────────────────────────────────────────────────────────
function MoreDrawer({ onClose }) {
  const { user, logout } = useAuth()
  const { toggle, isDark } = useTheme()
  const { info } = useToast()
  const navigate = useNavigate()
  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '??'

  const handleLogout = () => {
    logout(); info('Déconnecté'); navigate('/login'); onClose()
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 300 }}
      onClick={onClose}
    >
      {/* Backdrop */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'rgba(0,0,0,.55)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
      }} />

      {/* Sheet */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: 'var(--surface)',
          borderRadius: '22px 22px 0 0',
          paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
          animation: 'slideUp .28s cubic-bezier(.34,1.3,.64,1)',
          maxHeight: '85dvh', overflowY: 'auto',
        }}
      >
        {/* Handle */}
        <div style={{
          width: 36, height: 4, borderRadius: 2,
          background: 'var(--border2)', margin: '12px auto 18px',
        }} />

        {/* User card */}
        <div style={{
          margin: '0 16px 16px', padding: '14px 16px',
          background: 'var(--surface2)', borderRadius: 16,
          border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: 'linear-gradient(135deg,#7c6cfc,#5b4de8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: 16, fontWeight: 700,
          }}>{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
          </div>
        </div>

        {/* Nav items */}
        <div style={{ padding: '0 8px', marginBottom: 12 }}>
          {MORE_ITEMS.map(item => (
            <button
              key={item.to}
              onClick={() => { navigate(item.to); onClose() }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center',
                gap: 14, padding: '13px 12px', background: 'transparent',
                border: 'none', borderRadius: 14, cursor: 'pointer',
                textAlign: 'left', WebkitTapHighlightColor: 'transparent',
                fontFamily: 'inherit', transition: 'background .12s',
              }}
              onTouchStart={e => e.currentTarget.style.background = 'var(--surface2)'}
              onTouchEnd={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{
                width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                background: 'var(--surface2)', border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
              }}>{item.emoji}</span>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{item.label}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 1 }}>{item.sub}</div>
              </div>
              <svg style={{ marginLeft: 'auto', color: 'var(--text3)', flexShrink: 0 }} width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          ))}
        </div>

        {/* Theme toggle row */}
        <div style={{ margin: '0 16px 12px', height: 1, background: 'var(--border)' }} />
        <button
          onClick={toggle}
          style={{
            width: 'calc(100% - 32px)', margin: '0 16px',
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '13px 12px', background: 'var(--surface2)',
            border: '1px solid var(--border)', borderRadius: 14,
            cursor: 'pointer', fontFamily: 'inherit', marginBottom: 10,
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <span style={{
            width: 40, height: 40, borderRadius: 12, flexShrink: 0,
            background: isDark ? 'rgba(255,200,50,.1)' : 'rgba(100,100,255,.1)',
            border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
          }}>{isDark ? '☀️' : '🌙'}</span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
              {isDark ? 'Mode jour' : 'Mode nuit'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 1 }}>
              Actuellement : {isDark ? 'sombre' : 'clair'}
            </div>
          </div>
          {/* Toggle pill */}
          <div style={{
            marginLeft: 'auto', width: 44, height: 26, borderRadius: 13,
            background: isDark ? '#7c6cfc' : 'var(--surface3)',
            position: 'relative', transition: 'background .2s', flexShrink: 0,
          }}>
            <div style={{
              position: 'absolute', top: 3, width: 20, height: 20,
              borderRadius: '50%', background: 'white',
              left: isDark ? 21 : 3, transition: 'left .2s',
              boxShadow: '0 1px 4px rgba(0,0,0,.3)',
            }} />
          </div>
        </button>

        {/* Logout */}
        <div style={{ margin: '0 16px' }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 8, padding: '13px',
              background: 'rgba(245,71,106,.08)', border: '1px solid rgba(245,71,106,.15)',
              borderRadius: 14, color: '#f5476a', fontWeight: 700, fontSize: 14,
              cursor: 'pointer', fontFamily: 'inherit',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Layout principal ──────────────────────────────────────────────────────────
export default function MobileLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      minHeight: '100dvh',
      background: 'var(--bg)',
    }}>
      <MobileHeader onMenuOpen={() => setDrawerOpen(true)} />

      <main style={{
        flex: 1,
        overflowY: 'auto', overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
        // Espace pour la bottom nav + safe area bottom
        paddingBottom: 'calc(72px + env(safe-area-inset-bottom, 0px))',
      }}>
        <OfflineBanner />
        <Outlet />
      </main>

      <BottomNav onMoreOpen={() => setMoreOpen(true)} />

      {drawerOpen && <MoreDrawer onClose={() => setDrawerOpen(false)} />}
      {moreOpen   && <MoreDrawer onClose={() => setMoreOpen(false)} />}
    </div>
  )
}
